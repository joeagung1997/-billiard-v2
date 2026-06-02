// src/utils/migrate.js
// ── Buat tabel PostgreSQL jika belum ada (idempotent) ─────────

import { query } from "./postgres.js";

const DEFAULT_MENU_ITEMS = [
  { nama: "Kopi",              harga: 5000,  kategori: "minuman"        },
  { nama: "Kopi Susu",         harga: 7000,  kategori: "minuman"        },
  { nama: "Teh Manis",         harga: 5000,  kategori: "minuman"        },
  { nama: "Air Mineral",       harga: 3000,  kategori: "minuman"        },
  { nama: "Mie Instan",        harga: 8000,  kategori: "makanan"        },
  { nama: "Gorengan",          harga: 2000,  kategori: "makanan"        },
  { nama: "Rokok Bungkusan",   harga: 25000, kategori: "rokok_bungkusan" },
  { nama: "Rokok Eceran",      harga: 2000,  kategori: "rokok_eceran"   },
];

const DEFAULT_KATEGORI = [
  // Pemasukan
  { nama: "Sewa Meja",               jenis: "pemasukan"   },
  { nama: "Makanan / Minuman",       jenis: "pemasukan"   },
  { nama: "Turnamen",                jenis: "pemasukan"   },
  { nama: "Registrasi Member",       jenis: "pemasukan"   },
  { nama: "Lain-lain",               jenis: "pemasukan"   },
  // Tukar Uang (internal transfer, lihat utils/format.js)
  { nama: "Tukar Uang",              jenis: "pemasukan"   },
  // Pengeluaran
  { nama: "Operasional Rutin",       jenis: "pengeluaran" },
  { nama: "Stok Bahan-bahan",        jenis: "pengeluaran" },
  { nama: "Perlengkapan Habis Pakai",jenis: "pengeluaran" },
  { nama: "Khusus Billiard",         jenis: "pengeluaran" },
  { nama: "Aset & Perbaikan",        jenis: "pengeluaran" },
  { nama: "SDM",                     jenis: "pengeluaran" },
  { nama: "Lain-lain",               jenis: "pengeluaran" },
  { nama: "Tukar Uang",              jenis: "pengeluaran" },
];

// Meja default — samakan dgn dropdown hardcoded lama (Meja 1–8) + tarif lama
// (10rb siang / 12rb malam). Open = acuan, default samakan tarif siang.
const DEFAULT_MEJA = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  nama: "Meja " + n, tarif_siang: 10000, tarif_malam: 12000, tarif_open: 10000,
}));

// Kategori pengeluaran lama yang digantikan oleh struktur baru
const OLD_PENGELUARAN = [
  "Listrik / Air", "Gaji / Honor", "Stok / Perlengkapan",
  "Perawatan", "Operasional",
];

export const runMigrations = async () => {
  // ── Multi-tenant: tabel warung (tenant root) ────────────────
  // Satu baris per warung. slug dipakai utk routing path /w/:slug.
  // status_langganan: 'trial' | 'aktif' | 'nonaktif' (gate di middleware C7).
  // kode_prefix: prefix kode member per-warung (mis. 'JMB'); kode tetap unik
  // global supaya alur scan publik /scan?id=KODE bekerja tanpa slug.
  await query(`
    CREATE TABLE IF NOT EXISTS warung (
      id               SERIAL PRIMARY KEY,
      nama             TEXT NOT NULL,
      slug             TEXT UNIQUE NOT NULL,
      kode_prefix      TEXT NOT NULL DEFAULT 'JMB',
      logo_url         TEXT NOT NULL DEFAULT '',
      warna            TEXT NOT NULL DEFAULT '',
      nomor_wa         TEXT NOT NULL DEFAULT '',
      wa_notif_number  TEXT NOT NULL DEFAULT '',
      status_langganan TEXT NOT NULL DEFAULT 'trial',
      trial_mulai      TIMESTAMPTZ DEFAULT NOW(),
      trial_selesai    TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Seed Warpat Jombang sebagai warung_id = 1 (tenant pertama, sudah aktif).
  // id eksplisit = 1 supaya semua data lama (backfill DEFAULT 1) terhubung ke
  // warung ini. Nilai branding di-set sama dgn default lama di config.js.
  await query(`
    INSERT INTO warung (id, nama, slug, kode_prefix, nomor_wa, wa_notif_number, status_langganan)
    VALUES (1, 'Warpat Jombang', 'warpat', 'JMB', '6281519210552', '081519210552', 'aktif')
    ON CONFLICT (id) DO NOTHING
  `);
  // Majukan sequence id supaya warung berikutnya dapat id >= 2 (tidak bentrok
  // dgn id=1 yg kita set manual). GREATEST jaga2 kalau sudah ada warung lain.
  await query(`SELECT setval(pg_get_serial_sequence('warung','id'), GREATEST((SELECT MAX(id) FROM warung), 1))`);

  // Kontak PEMILIK warung (utk bisnis/penagihan) — BEDA dari nomor_wa yang
  // customer-facing di kartu member. Idempotent → aman utk warung 1 (Warpat).
  await query(`ALTER TABLE warung ADD COLUMN IF NOT EXISTS owner_wa    TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE warung ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL DEFAULT ''`);

  // Modul OPSIONAL yang aktif per-warung (comma-separated, mis. 'warkop,planning').
  // Modul INTI (keuangan/member/kategori/stok/supplier) SELALU aktif → tak disimpan.
  // NULL = warung lama belum di-set → di-backfill ke SEMUA modul opsional supaya
  // tidak ada fitur yang tiba-tiba hilang. '' (string kosong) = sengaja tanpa modul
  // opsional. Nilai untuk warung baru di-set eksplisit oleh createWarung().
  await query(`ALTER TABLE warung ADD COLUMN IF NOT EXISTS active_modules TEXT`);
  await query(`UPDATE warung SET active_modules = 'billiard,warkop,sdm,planning' WHERE active_modules IS NULL`);

  // ── Tabel members ───────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS members (
      kode                  TEXT PRIMARY KEY,
      nama                  TEXT NOT NULL,
      telepon               TEXT    DEFAULT '',
      total_main            INTEGER DEFAULT 0,
      tanggal_mulai         TIMESTAMPTZ,
      sudah_scan_hari_ini   BOOLEAN DEFAULT FALSE,
      status                TEXT    DEFAULT '-',
      total_gratis          INTEGER DEFAULT 0,
      tanggal_daftar        TIMESTAMPTZ DEFAULT NOW(),
      tanggal_scan_terakhir TIMESTAMPTZ
    )
  `);

  // ── Tabel transaksi keuangan ────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id          TEXT PRIMARY KEY,
      tanggal     TEXT        NOT NULL,
      jenis       TEXT        NOT NULL,
      kategori    TEXT        DEFAULT '',
      keterangan  TEXT        DEFAULT '',
      jumlah      BIGINT      NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Tabel log kunjungan ─────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS logs (
      id      BIGSERIAL PRIMARY KEY,
      ts      TIMESTAMPTZ DEFAULT NOW(),
      kode    TEXT DEFAULT '',
      nama    TEXT DEFAULT '',
      aksi    TEXT DEFAULT '',
      detail  TEXT DEFAULT ''
    )
  `);

  // ── Tabel kategori keuangan ─────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS kategori (
      id    SERIAL PRIMARY KEY,
      nama  TEXT NOT NULL,
      jenis TEXT NOT NULL,
      UNIQUE(nama, jenis)
    )
  `);

  // ── Tabel menu item kopi/snack ──────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id    SERIAL PRIMARY KEY,
      nama  TEXT NOT NULL UNIQUE,
      harga INTEGER NOT NULL DEFAULT 0
    )
  `);

  // ── Tabel meja billiard (master + tarif per meja) ───────────
  // Setup-only: sumber pilihan "Nomor Meja" + tarif auto-calc di Catat Transaksi.
  // status: 'aktif' (kosong/tersedia) | 'maintenance' | 'nonaktif'. Hanya 'aktif'
  // yg muncul sbg pilihan transaksi. UNIQUE komposit (warung_id, nama) dibuat di
  // bagian multi-tenant (idempotent), jadi nama TIDAK UNIQUE global di sini.
  await query(`
    CREATE TABLE IF NOT EXISTS meja (
      id          SERIAL PRIMARY KEY,
      nama        TEXT    NOT NULL,
      jenis       TEXT    NOT NULL DEFAULT '7ft',
      tarif_siang INTEGER NOT NULL DEFAULT 0,
      tarif_malam INTEGER NOT NULL DEFAULT 0,
      tarif_open  INTEGER NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'aktif',
      urutan      INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Jenis meja (7ft bola tanggung / 9ft bola besar) — utk DB lama yg sudah ada.
  await query(`ALTER TABLE meja ADD COLUMN IF NOT EXISTS jenis TEXT NOT NULL DEFAULT '7ft'`);

  // ── Tabel sesi/bill meja ────────────────────────────────────
  // Satu sesi = satu kumpulan transaksi (sewa + F&B) utk satu meja. Item-nya
  // tersimpan di tabel `transaksi` (via kolom sesi_id), bukan tabel terpisah —
  // jadi otomatis muncul di Riwayat & ikut aturan saldo (lunas) yg sudah ada.
  // status: 'open' (berjalan) | 'closed' (selesai, semua item lunas).
  await query(`
    CREATE TABLE IF NOT EXISTS sesi (
      id          SERIAL PRIMARY KEY,
      meja_id     INTEGER,
      nama_meja   TEXT        NOT NULL DEFAULT '',
      status      TEXT        NOT NULL DEFAULT 'open',
      dibuka_oleh TEXT        NOT NULL DEFAULT '',
      catatan     TEXT        NOT NULL DEFAULT '',
      opened_at   TIMESTAMPTZ DEFAULT NOW(),
      closed_at   TIMESTAMPTZ
    )
  `);

  // ── Kolom tambahan (idempotent) ─────────────────────────────
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS waktu TEXT DEFAULT 'siang'`);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS jam   TEXT DEFAULT ''`);
  await query(`ALTER TABLE members   ADD COLUMN IF NOT EXISTS bonus_earned_at TIMESTAMPTZ`);
  // Soft-void: transaksi tidak boleh di-edit, hanya bisa di-void + re-entry
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS voided_at   TIMESTAMPTZ`);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT ''`);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS bayar       TEXT DEFAULT ''`);
  // Bukti foto (QRIS transfer proof / nota pengeluaran) — path relatif ke public/
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS bukti_url   TEXT DEFAULT ''`);
  // Sesi/Bill: link transaksi ke sesi meja (nullable). NULL = transaksi biasa
  // (Catat Transaksi cepat) — data lama tak terpengaruh. Diisi hanya utk item sesi.
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS sesi_id INTEGER`);
  await query(`CREATE INDEX IF NOT EXISTS idx_transaksi_sesi ON transaksi (sesi_id)`);
  // Status lunas — customer kasbon / nota supplier blm dibayar. Default TRUE
  // supaya semua transaksi existing dianggap lunas (backward compat).
  // lunas_at = waktu transaksi dilunaskan (nullable, NULL kalau blm lunas).
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS lunas       BOOLEAN DEFAULT TRUE`);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS lunas_at    TIMESTAMPTZ`);
  // Transaksi manual: ditambah Owner utk membackfill data yg terlewat (backdate).
  // Default FALSE -> semua transaksi lama/POS dianggap non-manual (backward compat).
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS is_manual   BOOLEAN DEFAULT FALSE`);

  // Point lifetime — 1 point tiap check-in. Beda dgn total_main yg
  // reset tiap siklus. Backfill dari logs (SCAN + SCAN_RESET +
  // BONUS_EARNED — semuanya event scan), tapi cuma untuk member yg
  // total_point-nya masih 0 supaya re-run migrasi gak nimpa data baru.
  await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS total_point INTEGER DEFAULT 0`);
  await query(`
    UPDATE members m
    SET total_point = sub.cnt
    FROM (
      SELECT kode, COUNT(*) AS cnt
      FROM logs
      WHERE aksi IN ('SCAN', 'SCAN_RESET', 'BONUS_EARNED')
      GROUP BY kode
    ) sub
    WHERE m.kode = sub.kode AND m.total_point = 0
  `);

  // Urutan kategori — drag-and-drop di halaman Kelola Kategori
  await query(`ALTER TABLE kategori ADD COLUMN IF NOT EXISTS urutan INTEGER DEFAULT 0`);
  // Backfill urutan = id untuk row lama yang masih 0
  await query(`UPDATE kategori SET urutan = id WHERE urutan = 0`);

  // ── Restrukturisasi kategori pengeluaran (jalankan sekali) ──
  // Cek via sentinel: jika 'Operasional Rutin' belum ada, jalankan migrasi.
  const sentinelCheck = await query(
    `SELECT 1 FROM kategori WHERE nama = 'Operasional Rutin' AND jenis = 'pengeluaran' LIMIT 1`
  );
  if (sentinelCheck.rows.length === 0) {
    for (const nama of OLD_PENGELUARAN) {
      await query(`DELETE FROM kategori WHERE nama = $1 AND jenis = 'pengeluaran'`, [nama]);
    }
    const NEW_PENGELUARAN = [
      "Operasional Rutin", "Stok Bahan-bahan", "Perlengkapan Habis Pakai",
      "Khusus Billiard", "Aset & Perbaikan", "SDM", "Lain-lain",
    ];
    for (let i = 0; i < NEW_PENGELUARAN.length; i++) {
      await query(
        `INSERT INTO kategori (nama, jenis, urutan) VALUES ($1, 'pengeluaran', $2) ON CONFLICT (nama, jenis) DO NOTHING`,
        [NEW_PENGELUARAN[i], i + 1]
      );
    }
  }

  // ── Insert default kategori hanya jika tabel masih kosong ───
  const katCount = await query("SELECT COUNT(*) FROM kategori");
  if (parseInt(katCount.rows[0].count) === 0) {
    let idx = 0;
    for (const k of DEFAULT_KATEGORI) {
      idx += 1;
      await query(
        `INSERT INTO kategori (nama, jenis, urutan) VALUES ($1, $2, $3) ON CONFLICT (nama, jenis) DO NOTHING`,
        [k.nama, k.jenis, idx]
      );
    }
  }

  // ── Tambah kategori "Tukar Uang" untuk DB yg sudah existing ──
  // Idempotent via WHERE NOT EXISTS (BUKAN ON CONFLICT) — karena unique
  // (nama,jenis) di-swap jadi komposit (warung_id,nama,jenis) di bawah, target
  // ON CONFLICT lama tidak ada lagi pada re-run. Tidak menyebut warung_id di
  // sini supaya tetap jalan saat kolom belum dibuat (fresh DB); baris ini
  // ke-backfill ke warung 1 lewat DEFAULT saat kolom ditambahkan.
  await query(
    `INSERT INTO kategori (nama, jenis, urutan)
     SELECT $1, 'pemasukan', 999
     WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE nama = $1 AND jenis = 'pemasukan')`,
    ["Tukar Uang"]
  );
  await query(
    `INSERT INTO kategori (nama, jenis, urutan)
     SELECT $1, 'pengeluaran', 999
     WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE nama = $1 AND jenis = 'pengeluaran')`,
    ["Tukar Uang"]
  );

  // ── Tabel sub_kategori ───────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS sub_kategori (
      id          SERIAL  PRIMARY KEY,
      kategori_id INTEGER NOT NULL,
      nama        TEXT    NOT NULL,
      urutan      INTEGER DEFAULT 0,
      UNIQUE(kategori_id, nama)
    )
  `);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS sub_kategori TEXT DEFAULT ''`);

  // Insert default sub-kategori (jalankan sekali — sentinel: tabel kosong)
  const subCount = await query("SELECT COUNT(*) FROM sub_kategori");
  if (parseInt(subCount.rows[0].count) === 0) {
    const DEFAULT_SUB = {
      "Operasional Rutin":       ["Token Listrik", "Wifi / Internet", "Gaji 3 orang", "Makan 2 orang"],
      "Stok Bahan-bahan":        ["Minuman saset", "Gula", "Susu kaleng", "Bahan masak", "Rokok", "Air Galon isi ulang", "Bahan makanan"],
      "Perlengkapan Habis Pakai":["Sedotan", "Tisu", "Plastik sampah", "Sabun cuci piring", "Sabun lantai", "Pembersih kamar mandi", "Korek api"],
      "Khusus Billiard":         ["Kapur stik (Chalk)", "Cue tip / kepala stik", "Bola billiard pengganti", "Pembersih bola billiard"],
      "Aset & Perbaikan":        ["Service peralatan", "Beli alat baru", "Renovasi kecil"],
      "SDM":                     ["Konsumsi / makan crew", "Bonus & THR", "Transportasi / bensin"],
      "Lain-lain":               ["Marketing", "Kas darurat / dana tak terduga"],
    };
    for (const [parentNama, subList] of Object.entries(DEFAULT_SUB)) {
      const parent = await query(
        `SELECT id FROM kategori WHERE nama = $1 AND jenis = 'pengeluaran' LIMIT 1`, [parentNama]
      );
      if (parent.rows.length === 0) continue;
      const parentId = parent.rows[0].id;
      for (let i = 0; i < subList.length; i++) {
        await query(
          `INSERT INTO sub_kategori (kategori_id, nama, urutan) VALUES ($1, $2, $3) ON CONFLICT (kategori_id, nama) DO NOTHING`,
          [parentId, subList[i], i + 1]
        );
      }
    }
  }

  // ── Kolom tambahan menu_items (idempotent) ───────────────────────
  await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS kategori    TEXT    DEFAULT 'minuman'`);
  await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS best_seller BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS harga_hot   INTEGER`);

  // ── Tabel topping menu ────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS menu_toppings (
      id      SERIAL  PRIMARY KEY,
      item_id INTEGER NOT NULL,
      nama    TEXT    NOT NULL,
      harga   INTEGER NOT NULL DEFAULT 0
    )
  `);

  // ── Tabel bahan baku (untuk HPP otomatis per menu) ───────────────
  // satuan: gram/ml/pcs/butir/sendok/sachet/dll (free-text, dropdown di UI).
  // harga_per_satuan: harga 1 unit satuan dalam Rupiah (mis. Rp 100/gram).
  // qty_per_porsi: konversi "1 porsi = X satuan" (mis. 1 cup es = 0.2 kg).
  // porsi_label: label porsi (mis. "cup", "sdt"). Kosong = pakai satuan.
  // HPP per menu = SUM(qty × qty_per_porsi × harga_per_satuan).
  await query(`
    CREATE TABLE IF NOT EXISTS bahan_baku (
      id                SERIAL      PRIMARY KEY,
      nama              TEXT        NOT NULL UNIQUE,
      satuan            TEXT        NOT NULL DEFAULT 'pcs',
      harga_per_satuan  INTEGER     NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Kolom konversi porsi (idempotent — untuk deployment lama yg belum punya).
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS qty_per_porsi NUMERIC(12,4) NOT NULL DEFAULT 1.0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS porsi_label   TEXT          NOT NULL DEFAULT ''`);

  // Kolom info detail (tracking harga + bulk pricing + supplier + catatan).
  // tanggal_input: kapan bahan ditambahkan (auto-set saat insert).
  // tanggal_update_harga: kapan harga terakhir diubah (auto-update saat
  //   harga_per_satuan berubah, via logic di db.js updateBahan).
  // harga_dus + isi_per_dus: tier harga bulk (mis. 1 dus = 10 sachet @ Rp 13.000).
  // harga_renteng + isi_per_renteng: tier harga renteng (mis. rokok 1 renteng = 10 batang).
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS tanggal_input        TIMESTAMPTZ   DEFAULT NOW()`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS tanggal_update_harga TIMESTAMPTZ   DEFAULT NOW()`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS harga_dus            INTEGER       NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS isi_per_dus          NUMERIC(12,4) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS harga_renteng        INTEGER       NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS isi_per_renteng      NUMERIC(12,4) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS supplier             TEXT          NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS catatan              TEXT          NOT NULL DEFAULT ''`);

  // ── Tabel supplier (dedicated, decoupled dari bahan_baku.supplier text) ─
  // Kolom bahan_baku.supplier (text) ttp ada utk backward compat. Sekarang
  // bahan_baku.supplier_id FK ke tabel ini — nullable, ON DELETE SET NULL
  // supaya hapus supplier gak hapus bahan terkait, cuma unlink.
  await query(`
    CREATE TABLE IF NOT EXISTS supplier (
      id          SERIAL      PRIMARY KEY,
      nama        TEXT        NOT NULL UNIQUE,
      kontak      TEXT        NOT NULL DEFAULT '',
      alamat      TEXT        NOT NULL DEFAULT '',
      catatan     TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES supplier(id) ON DELETE SET NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bahan_supplier ON bahan_baku (supplier_id)`);

  // ── Kolom stok di bahan_baku ────────────────────────────────────
  // stok: jumlah bahan tersedia saat ini (dalam satuan utama bahan).
  // stok_min: threshold low-stock — alert ditampilin saat stok ≤ stok_min.
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS stok      NUMERIC(12,3) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS stok_min  NUMERIC(12,3) NOT NULL DEFAULT 0`);

  // ── Tabel stok_movement (audit trail penyesuaian stok) ──────────
  // jenis: 'in' (tambah, mis. beli/restok), 'out' (kurang, mis. dipakai/rusak),
  //   'adjust' (set absolute, mis. stock opname).
  // qty_change: delta perubahan (positif/negatif sesuai jenis).
  // qty_after: nilai stok setelah perubahan (snapshot utk audit).
  // catatan: alasan/keterangan (mis. "beli 5kg gula", "stock opname Mei").
  await query(`
    CREATE TABLE IF NOT EXISTS stok_movement (
      id          SERIAL        PRIMARY KEY,
      bahan_id    INTEGER       NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
      jenis       TEXT          NOT NULL DEFAULT 'adjust',
      qty_change  NUMERIC(12,3) NOT NULL DEFAULT 0,
      qty_after   NUMERIC(12,3) NOT NULL DEFAULT 0,
      catatan     TEXT          NOT NULL DEFAULT '',
      created_by  TEXT          NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ   DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_stok_movement_bahan ON stok_movement (bahan_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_stok_movement_when  ON stok_movement (created_at DESC)`);

  // ── Tabel history perubahan harga bahan ──────────────────────────
  // Audit trail: tiap kali harga_per_satuan diubah di updateBahan,
  // insert row dgn harga lama → harga baru. Berguna utk tracking
  // inflasi & trend kenaikan harga over time.
  await query(`
    CREATE TABLE IF NOT EXISTS bahan_harga_history (
      id          SERIAL      PRIMARY KEY,
      bahan_id    INTEGER     NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
      harga_lama  INTEGER     NOT NULL DEFAULT 0,
      harga_baru  INTEGER     NOT NULL DEFAULT 0,
      changed_at  TIMESTAMPTZ DEFAULT NOW(),
      changed_by  TEXT        DEFAULT ''
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bahan_history_bahan ON bahan_harga_history (bahan_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bahan_history_when  ON bahan_harga_history (changed_at DESC)`);

  // ── Tabel menu_resep (link menu_items ↔ bahan_baku, M:N + qty) ───
  // qty NUMERIC bisa decimal (mis. 2.5 gram, 0.25 sachet). ON DELETE CASCADE:
  // hapus menu_item atau bahan_baku akan otomatis hapus row resep yg
  // refer ke-nya — gak perlu manual cleanup.
  await query(`
    CREATE TABLE IF NOT EXISTS menu_resep (
      id            SERIAL        PRIMARY KEY,
      menu_item_id  INTEGER       NOT NULL REFERENCES menu_items(id)  ON DELETE CASCADE,
      bahan_id      INTEGER       NOT NULL REFERENCES bahan_baku(id)  ON DELETE CASCADE,
      qty           NUMERIC(12,3) NOT NULL DEFAULT 0,
      catatan       TEXT          DEFAULT ''
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_menu_resep_menu  ON menu_resep (menu_item_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_menu_resep_bahan ON menu_resep (bahan_id)`);

  // ── Tabel catatan fitur (note pengembangan aplikasi) ─────────────
  // Owner pakai utk catat ide/bug/improvement aplikasi. Punya status
  // (ide/planning/coding/done), priority (low/medium/high/urgent),
  // kategori (free text). done_at di-set saat status = 'done'.
  await query(`
    CREATE TABLE IF NOT EXISTS feature_notes (
      id          SERIAL      PRIMARY KEY,
      title       TEXT        NOT NULL,
      deskripsi   TEXT        NOT NULL DEFAULT '',
      priority    TEXT        NOT NULL DEFAULT 'medium',
      status      TEXT        NOT NULL DEFAULT 'ide',
      kategori    TEXT        NOT NULL DEFAULT '',
      created_by  TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      done_at     TIMESTAMPTZ
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_feature_notes_status   ON feature_notes (status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_feature_notes_priority ON feature_notes (priority)`);

  // ── Tabel notifikasi (in-app bell sidebar) ───────────────────────
  // tipe: 'stok_low', 'stok_out', 'target_harian', 'target_mingguan',
  //   'target_bulanan', 'daily_summary' (extensible).
  // meta: JSON arbitrary — utk stok: {bahan_id, stok, threshold}; utk target:
  //   {scope:'hari'|'minggu'|'bulan', pemasukan, target}; daily: {date, summary}.
  // dedup_key: optional unique-per-window key. addNotifikasi gunakan ini utk
  //   skip duplikat dalam window 24 jam (mis. "stok_low:bahan_id=12").
  // prioritas: 'info' | 'warning' | 'danger' — untuk styling badge.
  // read_at: NULL = unread, timestamp = read.
  await query(`
    CREATE TABLE IF NOT EXISTS notifikasi (
      id          SERIAL      PRIMARY KEY,
      tipe        TEXT        NOT NULL,
      title       TEXT        NOT NULL,
      pesan       TEXT        NOT NULL DEFAULT '',
      link        TEXT        NOT NULL DEFAULT '',
      meta        JSONB       NOT NULL DEFAULT '{}'::jsonb,
      prioritas   TEXT        NOT NULL DEFAULT 'info',
      dedup_key   TEXT        NOT NULL DEFAULT '',
      read_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_notif_unread   ON notifikasi (created_at DESC) WHERE read_at IS NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notif_created  ON notifikasi (created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notif_tipe     ON notifikasi (tipe)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notif_dedup    ON notifikasi (dedup_key, created_at DESC) WHERE dedup_key <> ''`);

  // ── Insert default menu items hanya jika tabel masih kosong ─
  const menuCount = await query("SELECT COUNT(*) FROM menu_items");
  if (parseInt(menuCount.rows[0].count) === 0) {
    for (const m of DEFAULT_MENU_ITEMS) {
      await query(
        `INSERT INTO menu_items (nama, harga, kategori) VALUES ($1, $2, $3) ON CONFLICT (nama) DO NOTHING`,
        [m.nama, m.harga, m.kategori]
      );
    }
  }

  // ── Tabel SDM (karyawan & penggajian) ────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS karyawan (
      id         SERIAL PRIMARY KEY,
      nama       TEXT    NOT NULL,
      jabatan    TEXT    DEFAULT '',
      gaji_pokok INTEGER NOT NULL DEFAULT 0,
      tgl_mulai  DATE,
      status     TEXT    DEFAULT 'aktif',
      telepon    TEXT    DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS sdm_transaksi (
      id          TEXT    PRIMARY KEY,
      karyawan_id INTEGER NOT NULL,
      tipe        TEXT    NOT NULL,
      jumlah      BIGINT  NOT NULL,
      bulan       TEXT    NOT NULL,
      keterangan  TEXT    DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_sdm_trx_karyawan ON sdm_transaksi (karyawan_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sdm_trx_bulan    ON sdm_transaksi (bulan)`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS shift           TEXT    DEFAULT 'siang'`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS uang_makan      INTEGER DEFAULT 0`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS hari_kerja      INTEGER DEFAULT 26`);
  await query(`ALTER TABLE sdm_transaksi ADD COLUMN IF NOT EXISTS metode TEXT DEFAULT 'cash'`);
  // Kolom kru tambahan (upgrade form Kelola Kru). Idempotent + default aman utk
  // kru lama: foto base64, status kepegawaian, tipe gaji, tgl gajian, metode bayar.
  // (Status aktif/nonaktif tetap pakai kolom `status` yang sudah ada.)
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS foto            TEXT    DEFAULT ''`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS status_karyawan TEXT    DEFAULT 'tetap'`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS tipe_gaji       TEXT    DEFAULT 'bulanan'`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS tanggal_gajian  TEXT    DEFAULT ''`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS metode_bayar    TEXT    DEFAULT 'tunai'`);
  await query(`ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS rekening        TEXT    DEFAULT ''`);
  // Jadwal kenaikan gaji terjadwal — banyak baris per karyawan. mulai_bulan='YYYY-MM'.
  // warung_id ditambah + di-index oleh loop TENANT_TABLES di bawah.
  await query(`
    CREATE TABLE IF NOT EXISTS karyawan_kenaikan_gaji (
      id          SERIAL PRIMARY KEY,
      karyawan_id INTEGER NOT NULL,
      mulai_bulan TEXT    NOT NULL,
      gaji        INTEGER NOT NULL DEFAULT 0,
      catatan     TEXT    DEFAULT '',
      warung_id   INTEGER NOT NULL DEFAULT 1,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_kenaikan_karyawan ON karyawan_kenaikan_gaji (karyawan_id)`);

  // ── Index untuk performa query ──────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_ts           ON logs      (ts DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_aksi         ON logs      (aksi)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal DESC)`);

  // ── Tabel akun admin login ────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id           SERIAL PRIMARY KEY,
      username     TEXT UNIQUE NOT NULL,
      pin          TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'karyawan',
      display_name TEXT NOT NULL DEFAULT '',
      shift        TEXT NOT NULL DEFAULT 'siang'
    )
  `);
  // Backfill kolom shift utk tabel admin_accounts existing
  await query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS shift TEXT NOT NULL DEFAULT 'siang'`);
  // Terakhir login (utk panel platform: tahu warung aktif dipakai/tidak). Nullable.
  await query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`);
  // Aktif/nonaktif akun (dipakai Kelola Admin superadmin). Default TRUE → semua
  // akun lama tetap bisa login; nonaktif hanya bila di-set superadmin.
  await query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`);
  // Seed akun awal dari config — hanya jika tabel masih kosong
  const akunCount = await query("SELECT COUNT(*) FROM admin_accounts");
  if (parseInt(akunCount.rows[0].count) === 0) {
    const seeds = [
      { username: "agung97",  pin: "2024", role: "owner",    display_name: "Owner"       },
      { username: "ardu11",   pin: "1111", role: "karyawan", display_name: "Ardu"        },
      { username: "zidank22", pin: "2222", role: "karyawan", display_name: "Zidan Kecil" },
      { username: "zidanb33", pin: "3333", role: "karyawan", display_name: "Zidan Besar" },
    ];
    for (const s of seeds) {
      await query(
        `INSERT INTO admin_accounts (username, pin, role, display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING`,
        [s.username, s.pin, s.role, s.display_name]
      );
    }
  }

  // ── Monitoring Karyawan ───────────────────────────────────────
  // Track who recorded each transaction
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS dicatat_oleh TEXT DEFAULT ''`);

  // Shift closing / setoran report
  await query(`
    CREATE TABLE IF NOT EXISTS setoran (
      id                TEXT PRIMARY KEY,
      tanggal           DATE NOT NULL,
      shift             TEXT NOT NULL DEFAULT 'siang',
      karyawan_nama     TEXT NOT NULL DEFAULT '',
      karyawan_username TEXT DEFAULT '',
      jam_buka          TEXT DEFAULT '',
      jam_tutup         TEXT DEFAULT '',
      modal_awal        BIGINT DEFAULT 0,
      pemasukan         BIGINT DEFAULT 0,
      pengeluaran       BIGINT DEFAULT 0,
      uang_setor        BIGINT DEFAULT 0,
      selisih           BIGINT DEFAULT 0,
      keterangan        TEXT DEFAULT '',
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_setoran_tanggal  ON setoran (tanggal DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_setoran_karyawan ON setoran (karyawan_username)`);

  // ── Biaya wajib (utk Analisis Target) ────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS fixed_costs (
      id          SERIAL PRIMARY KEY,
      nama        TEXT NOT NULL,
      frekuensi   TEXT NOT NULL DEFAULT 'bulanan',
      nominal     BIGINT NOT NULL DEFAULT 0,
      urutan      INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const fcCount = await query("SELECT COUNT(*) FROM fixed_costs");
  if (parseInt(fcCount.rows[0].count) === 0) {
    const seedFC = [
      { nama: "WiFi",                 frekuensi: "bulanan", nominal: 455000,  urutan: 1 },
      { nama: "Gaji 3 orang (total)", frekuensi: "bulanan", nominal: 2700000, urutan: 2 },
      { nama: "Token listrik",        frekuensi: "bulanan", nominal: 1000000, urutan: 3 },
      { nama: "Bensin",               frekuensi: "harian",  nominal: 10000,   urutan: 4 },
      { nama: "Air mineral",          frekuensi: "harian",  nominal: 10000,   urutan: 5 },
      { nama: "Makan karyawan",       frekuensi: "harian",  nominal: 26000,   urutan: 6 },
    ];
    for (const s of seedFC) {
      await query(
        `INSERT INTO fixed_costs (nama, frekuensi, nominal, urutan) VALUES ($1,$2,$3,$4)`,
        [s.nama, s.frekuensi, s.nominal, s.urutan]
      );
    }
    console.log("[DB] Seed default fixed_costs (6 item).");
  }

  // ── Planning / Roadmap Bisnis — wishlist item ───────────────
  await query(`
    CREATE TABLE IF NOT EXISTS planning_items (
      id           TEXT PRIMARY KEY,
      nama         TEXT NOT NULL,
      kategori     TEXT DEFAULT 'lain',
      estimasi     BIGINT DEFAULT 0,
      prioritas    TEXT DEFAULT 'nice',
      status       TEXT DEFAULT 'idea',
      target_date  TEXT DEFAULT '',
      vendor       TEXT DEFAULT '',
      catatan      TEXT DEFAULT '',
      roi_estimate BIGINT DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Kolom tabungan per item — Owner tracking "sudah terkumpul brp"
  await query(`ALTER TABLE planning_items ADD COLUMN IF NOT EXISTS saved_amount BIGINT DEFAULT 0`);
  // Lampiran foto/file — JSON array of URLs relatif ke public/
  await query(`ALTER TABLE planning_items ADD COLUMN IF NOT EXISTS attachments TEXT DEFAULT '[]'`);
  // Tipe item: investasi (default) / hutang / tabungan — gating conditional fields di UI
  await query(`ALTER TABLE planning_items ADD COLUMN IF NOT EXISTS tipe TEXT DEFAULT 'investasi'`);

  // Riwayat pembayaran bulanan per item — utk track cicilan/tanggungan
  await query(`
    CREATE TABLE IF NOT EXISTS planning_payments (
      id        TEXT PRIMARY KEY,
      item_id   TEXT NOT NULL,
      amount    BIGINT NOT NULL DEFAULT 0,
      bulan     TEXT NOT NULL,
      catatan   TEXT DEFAULT '',
      paid_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_planning_payments_item ON planning_payments (item_id)`);
  // Status paid/unpaid utk track rencana cicilan: default TRUE (rows lama dianggap paid)
  await query(`ALTER TABLE planning_payments ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT TRUE`);

  // ── Planning Goals — tabungan target (Anggaran) ─────────────
  await query(`
    CREATE TABLE IF NOT EXISTS planning_goals (
      id             TEXT PRIMARY KEY,
      nama           TEXT NOT NULL,
      target_amount  BIGINT NOT NULL DEFAULT 0,
      current_amount BIGINT NOT NULL DEFAULT 0,
      auto_percent   INTEGER DEFAULT 0,
      source         TEXT DEFAULT 'laba',
      status         TEXT DEFAULT 'active',
      linked_item_id TEXT,
      target_date    TEXT DEFAULT '',
      catatan        TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── App settings (KV sederhana) — mis. dana cadangan bulanan ──
  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Multi-tenant: kolom warung_id di semua tabel data (idempotent) ──
  // NOT NULL DEFAULT 1 berarti:
  //   • baris LAMA otomatis ke-backfill ke Warpat (warung 1) saat kolom dibuat;
  //   • INSERT lama yg belum mengirim warung_id TETAP jalan (default 1) sampai
  //     db.js di-update di tahap C2 — jadi aplikasi tidak rusak di antara tahap.
  // Default 1 dipertahankan sbg jaring pengaman + fallback Warpat; korektnya
  // per-tenant ditegakkan di lapisan aplikasi (guard fail-closed db.js, C2).
  // Nama tabel berasal dari whitelist statis di bawah (bukan input user) →
  // interpolasi string aman dari SQL injection.
  const TENANT_TABLES = [
    "members", "transaksi", "logs", "kategori", "menu_items", "meja", "sesi", "sub_kategori",
    "menu_toppings", "bahan_baku", "supplier", "stok_movement",
    "bahan_harga_history", "menu_resep", "feature_notes", "notifikasi",
    "karyawan", "karyawan_kenaikan_gaji", "sdm_transaksi", "admin_accounts", "setoran", "fixed_costs",
    "planning_items", "planning_payments", "planning_goals", "app_settings",
  ];
  for (const t of TENANT_TABLES) {
    await query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS warung_id INTEGER NOT NULL DEFAULT 1`);
    await query(`CREATE INDEX IF NOT EXISTS idx_${t}_warung ON ${t} (warung_id)`);
  }

  // ── Multi-tenant: unique/PK global → komposit per-warung (idempotent) ──
  // Unique lama (auto-name PG: <tabel>_<kolom>_key) di-DROP IF EXISTS lalu
  // diganti UNIQUE INDEX komposit (IF NOT EXISTS). Index unik tetap kompatibel
  // dgn ON CONFLICT (warung_id, ...) di db.js. members.kode sengaja TETAP PK
  // global (kode unik global, prefix per-warung) supaya /scan?id=KODE jalan
  // tanpa slug. Data lama (warung 1) sudah unik global → swap aman, tanpa
  // risiko duplikat.
  await query(`ALTER TABLE kategori       DROP CONSTRAINT IF EXISTS kategori_nama_jenis_key`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_kategori_warung_nama_jenis ON kategori (warung_id, nama, jenis)`);

  await query(`ALTER TABLE menu_items     DROP CONSTRAINT IF EXISTS menu_items_nama_key`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_warung_nama ON menu_items (warung_id, nama)`);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_meja_warung_nama ON meja (warung_id, nama)`);
  // Seed Meja 1–8 utk Warpat (warung 1) — preserve perilaku dropdown+tarif lama.
  // Dijalankan setelah kolom warung_id + unique index siap. Idempotent.
  {
    let _mu = 0;
    for (const mj of DEFAULT_MEJA) {
      _mu += 1;
      await query(
        `INSERT INTO meja (warung_id, nama, tarif_siang, tarif_malam, tarif_open, urutan)
         VALUES (1, $1, $2, $3, $4, $5) ON CONFLICT (warung_id, nama) DO NOTHING`,
        [mj.nama, mj.tarif_siang, mj.tarif_malam, mj.tarif_open, _mu]
      );
    }
  }

  // Sesi: maksimal 1 sesi 'open' per meja per warung (guard DB-level, idempotent).
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_sesi_meja_open ON sesi (warung_id, meja_id) WHERE status = 'open'`);

  await query(`ALTER TABLE bahan_baku     DROP CONSTRAINT IF EXISTS bahan_baku_nama_key`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_bahan_baku_warung_nama ON bahan_baku (warung_id, nama)`);

  await query(`ALTER TABLE supplier       DROP CONSTRAINT IF EXISTS supplier_nama_key`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_warung_nama ON supplier (warung_id, nama)`);

  await query(`ALTER TABLE admin_accounts DROP CONSTRAINT IF EXISTS admin_accounts_username_key`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_accounts_warung_username ON admin_accounts (warung_id, username)`);

  // app_settings: PK (key) → komposit (warung_id, key). DO block idempotent —
  // hanya swap kalau PK lama masih single-column (belum mengandung warung_id).
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'app_settings' AND constraint_type = 'PRIMARY KEY'
          AND constraint_name = 'app_settings_pkey'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.key_column_usage
        WHERE table_name = 'app_settings' AND constraint_name = 'app_settings_pkey'
          AND column_name = 'warung_id'
      ) THEN
        ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
        ALTER TABLE app_settings ADD PRIMARY KEY (warung_id, key);
      END IF;
    END $$;
  `);

  // ── Verifikasi backfill: tidak boleh ada baris warung_id NULL ──
  // NOT NULL DEFAULT 1 sudah menjamin ini, tapi kita assert eksplisit + log
  // ringkasan per tabel supaya migrasi gagal-keras (fail-loud) kalau ada anomali.
  let totalRows = 0;
  for (const t of TENANT_TABLES) {
    const r = await query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE warung_id IS NULL)::int AS nulls FROM ${t}`);
    const { total, nulls } = r.rows[0];
    if (nulls > 0) {
      throw new Error(`[MIGRATE] Tabel '${t}': ${nulls} baris warung_id NULL — backfill gagal, hentikan.`);
    }
    totalRows += total;
  }
  console.log(`[DB] Multi-tenant: kolom warung_id siap di ${TENANT_TABLES.length} tabel (${totalRows} baris, backfill warung_id=1 OK).`);

  // ── Log aktivitas platform (audit aksi superadmin) ─────────────────
  // Mencatat aksi sensitif: ubah status langganan, ubah modul, reset PIN,
  // buat warung. warung_id = sasaran (bukan untuk scoping tenant). Global.
  await query(`
    CREATE TABLE IF NOT EXISTS platform_log (
      id         BIGSERIAL PRIMARY KEY,
      ts         TIMESTAMPTZ DEFAULT NOW(),
      actor      TEXT NOT NULL DEFAULT '',
      action     TEXT NOT NULL DEFAULT '',
      warung_id  INTEGER,
      detail     TEXT NOT NULL DEFAULT ''
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_platform_log_ts ON platform_log (ts DESC)`);

  // ── Pengaturan GLOBAL platform (superadmin) — satu baris (id=1) ────────
  // BUKAN per-warung (app_settings yg per-tenant). Idempotent: tabel + 1 baris
  // default. default_trial_days dipakai form Buat Warung; base_url dipakai
  // membangun URL lengkap warung di Detail Warung (kanonik, hindari www/apex).
  await query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id                 INTEGER PRIMARY KEY DEFAULT 1,
      product_name       TEXT    NOT NULL DEFAULT 'Warpat SaaS',
      base_url           TEXT    NOT NULL DEFAULT '',
      support_wa         TEXT    NOT NULL DEFAULT '',
      support_email      TEXT    NOT NULL DEFAULT '',
      default_trial_days INTEGER NOT NULL DEFAULT 14,
      updated_at         TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT platform_settings_singleton CHECK (id = 1)
    )
  `);
  await query(`INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

  // ── Seed akun SUPERADMIN platform (role terpisah dari owner/karyawan) ──
  // Hanya bila env SUPERADMIN_PIN di-set (hindari PIN default ter-hardcode).
  // warung_id=1 = placeholder (login platform tak men-scope ke warung tertentu).
  // Idempotent via WHERE NOT EXISTS. Dijalankan di akhir (kolom warung_id sudah ada).
  if (process.env.SUPERADMIN_PIN) {
    await query(
      `INSERT INTO admin_accounts (username, pin, role, display_name, warung_id)
       SELECT 'superadmin', $1, 'superadmin', 'Super Admin', 1
       WHERE NOT EXISTS (SELECT 1 FROM admin_accounts WHERE username = 'superadmin' AND role = 'superadmin')`,
      [process.env.SUPERADMIN_PIN]
    );
    console.log("[DB] Akun superadmin platform siap (username: superadmin).");
  }

  console.log("[DB] Migrasi tabel PostgreSQL selesai.");
};

// ── Seed default minimal untuk WARUNG BARU (onboarding) ──────────────
// Dipanggil createWarung() setelah warung dibuat. Sengaja HANYA kategori
// (struktur pemasukan/pengeluaran — generik, dibutuhkan utk transaksi) +
// menu default (titik awal). TIDAK menyalin sub_kategori/fixed_costs Warpat
// karena angkanya spesifik Warpat (mis. "Gaji 3 orang", nominal listrik) —
// owner warung baru isi sendiri. Idempotent via ON CONFLICT DO NOTHING.
export const seedWarungDefaults = async (warungId) => {
  let idx = 0;
  for (const k of DEFAULT_KATEGORI) {
    idx += 1;
    await query(
      `INSERT INTO kategori (warung_id, nama, jenis, urutan) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [warungId, k.nama, k.jenis, idx]
    );
  }
  for (const m of DEFAULT_MENU_ITEMS) {
    await query(
      `INSERT INTO menu_items (warung_id, nama, harga, kategori) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [warungId, m.nama, m.harga, m.kategori]
    );
  }
  let mejaUrut = 0;
  for (const mj of DEFAULT_MEJA) {
    mejaUrut += 1;
    await query(
      `INSERT INTO meja (warung_id, nama, tarif_siang, tarif_malam, tarif_open, urutan)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [warungId, mj.nama, mj.tarif_siang, mj.tarif_malam, mj.tarif_open, mejaUrut]
    );
  }
};
