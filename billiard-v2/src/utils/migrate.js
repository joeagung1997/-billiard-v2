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
  // Pengeluaran
  { nama: "Operasional Rutin",       jenis: "pengeluaran" },
  { nama: "Stok Bahan-bahan",        jenis: "pengeluaran" },
  { nama: "Perlengkapan Habis Pakai",jenis: "pengeluaran" },
  { nama: "Khusus Billiard",         jenis: "pengeluaran" },
  { nama: "Aset & Perbaikan",        jenis: "pengeluaran" },
  { nama: "SDM",                     jenis: "pengeluaran" },
  { nama: "Lain-lain",               jenis: "pengeluaran" },
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

  // ── Index untuk performa query ──────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_ts           ON logs      (ts DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_aksi         ON logs      (aksi)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal DESC)`);

  console.log("[DB] Migrasi tabel PostgreSQL selesai.");
};
