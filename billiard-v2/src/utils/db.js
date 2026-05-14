// src/utils/db.js
// ── Database helper — baca/tulis db.json & log.json ──────────

import { existsSync, readFileSync, writeFileSync } from "fs";
import { CONFIG } from "../config.js";

// ── Member DB ─────────────────────────────────────────────────

export const readDB = () => {
  try {
    if (existsSync(CONFIG.DB_PATH)) {
      return JSON.parse(readFileSync(CONFIG.DB_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[DB] readDB error:", err.message);
  }
  return { members: [] };
};

export const writeDB = (data) => {
  try {
    writeFileSync(CONFIG.DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[DB] writeDB error:", err.message);
    return false;
  }
};

export const initDB = () => {
  if (!existsSync(CONFIG.DB_PATH)) {
    writeDB({ members: [] });
    console.log("[DB] db.json dibuat di:", CONFIG.DB_PATH);
  }
};

// ── Log ───────────────────────────────────────────────────────

export const readLog = () => {
  try {
    if (existsSync(CONFIG.LOG_PATH)) {
      return JSON.parse(readFileSync(CONFIG.LOG_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[DB] readLog error:", err.message);
  }
  return [];
};

export const appendLog = (kode, nama, aksi, detail = "") => {
  try {
    const log = readLog();
    log.unshift({ ts: new Date().toISOString(), kode, nama, aksi, detail });
    if (log.length > 500) log.splice(500);
    writeFileSync(CONFIG.LOG_PATH, JSON.stringify(log), "utf8");
  } catch (err) {
    console.error("[DB] appendLog error:", err.message);
  }
};

export const writeLog = (log) => {
  try {
    writeFileSync(CONFIG.LOG_PATH, JSON.stringify(log), "utf8");
    return true;
  } catch (err) {
    console.error("[DB] writeLog error:", err.message);
    return false;
  }
};

// ── Member helpers ────────────────────────────────────────────

// ── Finance helpers ───────────────────────────────────────────

export const readTransaksi = () => {
  try { return readDB().transaksi ?? []; }
  catch { return []; }
};

export const appendTransaksi = (item) => {
  const db = readDB();
  if (!db.transaksi) db.transaksi = [];
  db.transaksi.unshift(item);
  writeDB(db);
};

export const hapusTransaksi = (id) => {
  const db = readDB();
  if (!db.transaksi) return;
  db.transaksi = db.transaksi.filter((t) => t.id !== id);
  writeDB(db);
};

// ── Member helpers ────────────────────────────────────────────

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
