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
  { nama: "Sewa Meja",           jenis: "pemasukan"   },
  { nama: "Makanan / Minuman",   jenis: "pemasukan"   },
  { nama: "Turnamen",            jenis: "pemasukan"   },
  { nama: "Registrasi Member",   jenis: "pemasukan"   },
  { nama: "Lain-lain",           jenis: "pemasukan"   },
  // Pengeluaran
  { nama: "Listrik / Air",       jenis: "pengeluaran" },
  { nama: "Gaji / Honor",        jenis: "pengeluaran" },
  { nama: "Stok / Perlengkapan", jenis: "pengeluaran" },
  { nama: "Perawatan",           jenis: "pengeluaran" },
  { nama: "Operasional",         jenis: "pengeluaran" },
  { nama: "Lain-lain",           jenis: "pengeluaran" },
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

  // ── Insert default kategori (skip jika sudah ada) ──────────
  for (const k of DEFAULT_KATEGORI) {
    await query(
      `INSERT INTO kategori (nama, jenis) VALUES ($1, $2) ON CONFLICT (nama, jenis) DO NOTHING`,
      [k.nama, k.jenis]
    );
  }

  // ── Kolom kategori di menu_items (idempotent) ─────────────────
  await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS kategori TEXT DEFAULT 'minuman'`);

  // ── Insert default menu items (skip jika sudah ada) ──────────
  for (const m of DEFAULT_MENU_ITEMS) {
    await query(
      `INSERT INTO menu_items (nama, harga, kategori) VALUES ($1, $2, $3) ON CONFLICT (nama) DO NOTHING`,
      [m.nama, m.harga, m.kategori]
    );
  }

  // ── Index untuk performa query ──────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_ts           ON logs      (ts DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_aksi         ON logs      (aksi)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal DESC)`);

  console.log("[DB] Migrasi tabel PostgreSQL selesai.");
};
