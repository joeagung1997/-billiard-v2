// src/utils/format.js
// ── Format tanggal, telepon, kode ────────────────────────────

import { CONFIG } from "../config.js";

const ID_TZ = "Asia/Jakarta";

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
    kode = `${CONFIG.KODE_PREFIX}-${period}-${r1}${r2}`;
    if (++attempts > 500) {
      const r3 = chars[Math.floor(Math.random() * chars.length)];
      kode = `${CONFIG.KODE_PREFIX}-${period}-${r1}${r2}${r3}`;
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
