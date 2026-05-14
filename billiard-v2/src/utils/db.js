// src/utils/db.js
// ── Database helper — PostgreSQL via pg Pool ──────────────────

import { query } from "./postgres.js";
import { runMigrations } from "./migrate.js";

// ── Init ──────────────────────────────────────────────────────

export const initDB = async () => {
  await runMigrations();
};

// ── Row mapper helpers ────────────────────────────────────────

const rowToMember = (row) => ({
  kode:                row.kode,
  nama:                row.nama,
  telepon:             row.telepon               ?? "",
  totalMain:           row.total_main            ?? 0,
  tanggalMulai:        row.tanggal_mulai         ?? null,
  sudahScanHariIni:    row.sudah_scan_hari_ini   ?? false,
  status:              row.status                ?? "-",
  totalGratis:         row.total_gratis          ?? 0,
  tanggalDaftar:       row.tanggal_daftar        ?? null,
  tanggalScanTerakhir: row.tanggal_scan_terakhir ?? null,
});

const rowToTransaksi = (row) => ({
  id:         row.id,
  tanggal:    row.tanggal,
  jam:        row.jam         ?? "",
  jenis:      row.jenis,
  waktu:      row.waktu       ?? "siang",
  kategori:   row.kategori    ?? "",
  keterangan: row.keterangan  ?? "",
  jumlah:     Number(row.jumlah),
  createdAt:  row.created_at  ?? null,
});

// ── readDB — ambil semua members + transaksi ──────────────────

export const readDB = async () => {
  const [membersRes, transaksiRes] = await Promise.all([
    query("SELECT * FROM members ORDER BY tanggal_daftar DESC"),
    query("SELECT * FROM transaksi ORDER BY tanggal DESC, created_at DESC"),
  ]);
  return {
    members:   membersRes.rows.map(rowToMember),
    transaksi: transaksiRes.rows.map(rowToTransaksi),
  };
};

// ── Member CRUD ───────────────────────────────────────────────

export const saveMember = async (m) => {
  await query(`
    INSERT INTO members
      (kode, nama, telepon, total_main, tanggal_mulai, sudah_scan_hari_ini,
       status, total_gratis, tanggal_daftar, tanggal_scan_terakhir)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (kode) DO UPDATE SET
      nama                  = EXCLUDED.nama,
      telepon               = EXCLUDED.telepon,
      total_main            = EXCLUDED.total_main,
      tanggal_mulai         = EXCLUDED.tanggal_mulai,
      sudah_scan_hari_ini   = EXCLUDED.sudah_scan_hari_ini,
      status                = EXCLUDED.status,
      total_gratis          = EXCLUDED.total_gratis,
      tanggal_scan_terakhir = EXCLUDED.tanggal_scan_terakhir
  `, [
    m.kode, m.nama, m.telepon ?? "",
    m.totalMain ?? 0, m.tanggalMulai ?? null,
    m.sudahScanHariIni ?? false, m.status ?? "-",
    m.totalGratis ?? 0, m.tanggalDaftar ?? new Date().toISOString(),
    m.tanggalScanTerakhir ?? null,
  ]);
};

export const deleteMember = async (kode) => {
  await query("DELETE FROM members WHERE kode = $1", [kode.toUpperCase()]);
};

export const resetScanHarian = async () => {
  await query("UPDATE members SET sudah_scan_hari_ini = FALSE");
  console.log("[DB] Reset scan harian selesai.");
};

// ── Member helpers (sync — bekerja pada array in-memory) ──────

export const findMember = (members, kode) =>
  members.find((m) => m.kode.toUpperCase() === kode.toUpperCase()) ?? null;

export const findMemberIndex = (members, kode) =>
  members.findIndex((m) => m.kode.toUpperCase() === kode.toUpperCase());

export const createMember = (kode, nama, telepon = "") => ({
  kode:                kode.toUpperCase(),
  nama:                nama.trim(),
  telepon,
  totalMain:           0,
  tanggalMulai:        null,
  sudahScanHariIni:    false,
  status:              "-",
  totalGratis:         0,
  tanggalDaftar:       new Date().toISOString(),
  tanggalScanTerakhir: null,
});

// ── Log ───────────────────────────────────────────────────────

export const readLog = async () => {
  const res = await query(
    "SELECT ts, kode, nama, aksi, detail FROM logs ORDER BY ts DESC LIMIT 500"
  );
  return res.rows.map((r) => ({
    ts:     r.ts,
    kode:   r.kode,
    nama:   r.nama,
    aksi:   r.aksi,
    detail: r.detail,
  }));
};

export const appendLog = async (kode, nama, aksi, detail = "") => {
  await query(
    "INSERT INTO logs (ts, kode, nama, aksi, detail) VALUES (NOW(),$1,$2,$3,$4)",
    [kode, nama, aksi, detail]
  );
};

// ── Finance ───────────────────────────────────────────────────

export const readTransaksi = async () => {
  const res = await query(
    "SELECT * FROM transaksi ORDER BY tanggal DESC, created_at DESC"
  );
  return res.rows.map(rowToTransaksi);
};

export const appendTransaksi = async (item) => {
  await query(
    `INSERT INTO transaksi (id, tanggal, jam, jenis, waktu, kategori, keterangan, jumlah, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      item.id, item.tanggal, item.jam ?? "",
      item.jenis, item.waktu ?? "siang",
      item.kategori ?? "", item.keterangan ?? "",
      item.jumlah, item.createdAt ?? new Date().toISOString(),
    ]
  );
};

export const updateTransaksi = async (item) => {
  await query(
    `UPDATE transaksi SET tanggal=$1, jam=$2, jenis=$3, waktu=$4, kategori=$5, keterangan=$6, jumlah=$7
     WHERE id=$8`,
    [
      item.tanggal, item.jam ?? "",
      item.jenis, item.waktu ?? "siang",
      item.kategori ?? "", item.keterangan ?? "",
      item.jumlah, item.id,
    ]
  );
};

// ── Kategori ──────────────────────────────────────────────────

export const readKategori = async () => {
  const res = await query("SELECT * FROM kategori ORDER BY jenis, nama");
  return res.rows;
};

export const addKategori = async (nama, jenis) => {
  await query(
    `INSERT INTO kategori (nama, jenis) VALUES ($1, $2) ON CONFLICT (nama, jenis) DO NOTHING`,
    [nama.trim(), jenis]
  );
};

export const deleteKategori = async (id) => {
  await query("DELETE FROM kategori WHERE id = $1", [id]);
};
