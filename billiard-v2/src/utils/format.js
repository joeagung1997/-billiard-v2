// src/utils/format.js
// ── Format tanggal, telepon, kode ────────────────────────────

import { CONFIG } from "../config.js";
import { arenaPrefix } from "./brand.js";

const ID_TZ = "Asia/Jakarta";

// ── Kategori khusus "Tukar Uang" ─────────────────────────────
// Internal transfer cash ↔ QRIS (mis. customer tukar cash ke transfer rekening).
// Net Rp 0 ke revenue — bukan pemasukan/pengeluaran beneran. Otomatis EXCLUDED
// dari semua agregasi total Pemasukan/Pengeluaran/Saldo/Margin di dashboard,
// tapi tetap visible di tabel transaksi (sbg record untuk audit kas).
// Cara pakai: catat 2 paired transaksi — 1 pengeluaran Cash + 1 pemasukan QRIS
// (atau sebaliknya), keduanya dgn kategori "Tukar Uang".
export const KAT_TUKAR_UANG = "Tukar Uang";

// Filter helper: true kalau transaksi BUKAN tukar uang (kandidat aggregasi revenue).
export const isRevenueTrx = (t) => t && t.kategori !== KAT_TUKAR_UANG;

// ── Status lunas ─────────────────────────────────────────────
// Transaksi punya field `lunas` (boolean, default true). Saat user catat
// transaksi tapi belum dibayar (mis. customer kasbon / nota supplier blm
// dibayar), set ke false. Ditampilkan sbg "Belum Lunas" di tabel.
//
// Helper di bawah default ke true untuk backward compat dgn data lama
// (transaksi sebelum migrasi yg lunas-nya undefined dianggap lunas).
// Pakai untuk filter aggregasi total Pemasukan/Pengeluaran di dashboard.
export const isLunas = (t) => t && t.lunas !== false;

// ── Business day helper ──────────────────────────────────────
// Operasional buka 09:00 — biasanya tutup dini hari (00:00–02:00, kadang lebih).
// Transaksi yg dilakukan sebelum jam cutoff dianggap masih shift hari sebelumnya.
// Helper di bawah convert calendar date+time → business day (YYYY-MM-DD).

// Apply business day ke string tanggal+jam (mis. input dari datetime-local).
// Tanggal: "YYYY-MM-DD", jam: "HH:MM". Pure string ops — tdk pakai timezone server.
export const applyBusinessDay = (tanggal, jam, cutoffHour = CONFIG.BUSINESS_DAY_CUTOFF_HOUR) => {
  if (!tanggal) return tanggal;
  const hour = parseInt((jam || "").split(":")[0], 10) || 0;
  if (hour >= cutoffHour) return tanggal;
  // Decrement 1 hari via UTC parse (hindari DST/timezone drift)
  const d = new Date(tanggal + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Return business day saat ini (WIB) sebagai "YYYY-MM-DD"
export const todayBusinessDayISO = (cutoffHour = CONFIG.BUSINESS_DAY_CUTOFF_HOUR) => {
  // "sv-SE" locale = ISO format "YYYY-MM-DD HH:MM:SS"
  const wibStr = new Date().toLocaleString("sv-SE", { timeZone: ID_TZ });
  const tgl    = wibStr.slice(0, 10);
  const jam    = wibStr.slice(11, 16);
  return applyBusinessDay(tgl, jam, cutoffHour);
};

// Cek apakah datetime-local user ("YYYY-MM-DDTHH:MM", wall-clock WIB) ada di masa
// depan dibandingkan "sekarang" WIB. Bandingkan sbg wall-clock (kedua sisi di-parse
// sbg UTC) supaya hasilnya KONSISTEN lintas timezone server (mis. server UTC tidak
// salah anggap jam lokal user sbg masa depan). toleransi default 60 dtk utk skew jam.
export const isFutureWIB = (datetimeLocal, toleranceMs = 60000) => {
  if (!datetimeLocal) return false;
  const pickedMs = new Date(datetimeLocal.slice(0, 16) + ":00Z").getTime();
  if (isNaN(pickedMs)) return true; // datetime tidak valid → tolak
  const nowWib = new Date().toLocaleString("sv-SE", { timeZone: ID_TZ }).replace(" ", "T");
  const nowMs  = new Date(nowWib.slice(0, 19) + "Z").getTime();
  return pickedMs > nowMs + toleranceMs;
};

export const formatTanggal = (date) =>
  new Date(date).toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: ID_TZ,
  });

export const formatJam = (date) =>
  new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: ID_TZ,
  });

export const formatTanggalPendek = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });

export const formatTanggalBulan = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "short",
  });

// ── Tanggal trial di-PIN ke WIB (Asia/Jakarta) — konsisten lintas TZ server ──
// Hindari mismatch display/input: tampil & input & simpan sama-sama berbasis WIB.
// toDateInputWIB: value <input type=date> (YYYY-MM-DD, tanggal WIB).
export const toDateInputWIB = (ts) => {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); }
  catch { return ""; }
};
// formatTanggalWIB: tampil "D Mon YYYY" dalam WIB.
export const formatTanggalWIB = (ts) => {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }); }
  catch { return "—"; }
};
// wibEndOfDayISO: 'YYYY-MM-DD' (WIB) → ISO instan akhir-hari WIB (offset +07:00 eksplisit).
export const wibEndOfDayISO = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return null;
  return new Date(dateStr + "T23:59:59+07:00").toISOString();
};

export const formatTanggalJam = (date) =>
  new Date(date).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: ID_TZ,
  });

export const selisihHari = (tgl1, tgl2) => {
  const a = new Date(tgl1); a.setHours(0, 0, 0, 0);
  const b = new Date(tgl2); b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / 86_400_000);
};

// ── Nomor telepon ─────────────────────────────────────────────

export const normalizeTelepon = (raw = "") => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0"))  digits = digits.slice(1);
  if (digits.startsWith("62")) digits = digits.slice(2);
  return digits;
};

export const formatTeleponDisplay = (digits) => {
  if (!digits) return "";
  const parts = digits.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
  return `+62 ${parts}`;
};

export const validateTelepon = (raw = "") => {
  const digits = normalizeTelepon(raw);
  return digits.length >= 8 && digits.length <= 12;
};

// ── Kode member auto-generate ─────────────────────────────────

export const generateKode = (members = []) => {
  const now    = new Date();
  const bulan  = String(now.getMonth() + 1).padStart(2, "0");
  const tahun  = String(now.getFullYear()).slice(-2);
  const period = `${bulan}${tahun}`;
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existing = new Set(members.map((m) => m.kode));

  let kode, attempts = 0;
  do {
    const r1 = chars[Math.floor(Math.random() * chars.length)];
    const r2 = chars[Math.floor(Math.random() * chars.length)];
    kode = `${arenaPrefix()}-${period}-${r1}${r2}`;
    if (++attempts > 500) {
      const r3 = chars[Math.floor(Math.random() * chars.length)];
      kode = `${arenaPrefix()}-${period}-${r1}${r2}${r3}`;
      break;
    }
  } while (existing.has(kode));

  return kode;
};

// ── Bulan options untuk filter ─────────────────────────────────

export const getBulanOptions = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(now.getFullYear(), i, 1);
    const lbl = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const val = `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
    return { val, lbl, selected: i === now.getMonth() };
  });
};
