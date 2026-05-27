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

// Kategori pengeluaran lama yang digantikan oleh struktur baru
const OLD_PENGELUARAN = [
  "Listrik / Air", "Gaji / Honor", "Stok / Perlengkapan",
  "Perawatan", "Operasional",
];

export const runMigrations = async () => {
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
  // Status lunas — customer kasbon / nota supplier blm dibayar. Default TRUE
  // supaya semua transaksi existing dianggap lunas (backward compat).
  // lunas_at = waktu transaksi dilunaskan (nullable, NULL kalau blm lunas).
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS lunas       BOOLEAN DEFAULT TRUE`);
  await query(`ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS lunas_at    TIMESTAMPTZ`);

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
  // Idempotent: ON CONFLICT DO NOTHING. Urutan = 999 → muncul di paling bawah
  // list kategori, tapi user bisa drag-and-drop di /operasional/kategori.
  await query(
    `INSERT INTO kategori (nama, jenis, urutan) VALUES ($1, 'pemasukan',   999) ON CONFLICT (nama, jenis) DO NOTHING`,
    ["Tukar Uang"]
  );
  await query(
    `INSERT INTO kategori (nama, jenis, urutan) VALUES ($1, 'pengeluaran', 999) ON CONFLICT (nama, jenis) DO NOTHING`,
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

  console.log("[DB] Migrasi tabel PostgreSQL selesai.");
};
