// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import { readDB, writeDB, readLog, readTransaksi, createMember, findMemberIndex } from "../utils/db.js";
import { requireAdmin } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary } from "./share.js";
import { adminLoginPage, adminDashboard, addMemberPage, addMemberSuccess, editMemberPage } from "../views/admin.js";

const router = Router();

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", (req, res) => {
  const tk  = req.query.tk ?? "";
  const pin = verifyToken(tk);

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    return res.send(adminLoginPage(!!req.query.err));
  }

  const token     = tk || createToken(pin);
  const db        = readDB();
  const log       = readLog();
  const transaksi = readTransaksi();

  res.send(adminDashboard({ db, log, transaksi, token, req }));
});

// ── POST /admin/login ─────────────────────────────────────────
router.post("/login", (req, res) => {
  const pin = (req.body.pin ?? "").trim();
  if (pin !== CONFIG.ADMIN_PIN) return res.redirect("/admin?err=1");
  const token = createToken(pin);
  res.redirect(`/admin?tk=${token}`);
});

// ── GET /admin/tambah ─────────────────────────────────────────
router.get("/tambah", requireAdmin, async (req, res) => {
  const { tk }   = res.locals;
  const { nama, tlp } = req.query;

  if (!nama) {
    return res.send(addMemberPage(tk, !!req.query.errtlp));
  }

  // Validasi telepon
  if (!validateTelepon(tlp ?? "")) {
    return res.redirect(`/admin/tambah?tk=${tk}&errtlp=1`);
  }

  const digits     = normalizeTelepon(tlp);
  const telepon    = formatTeleponDisplay(digits);
  const db         = readDB();
  const kode       = generateKode(db.members);
  const newMember  = createMember(kode, nama, telepon);
  db.members.push(newMember);
  writeDB(db);

  const scanUrl = buildScanUrl(req, kode);

  // Upload QR ke Cloudinary untuk WA preview
  try {
    const qrBuf = await qrBuffer(scanUrl, 520);
    await uploadQrToCloudinary(kode, qrBuf);
  } catch (err) {
    console.error("[CDN] Upload QR gagal:", err.message);
  }

  // Generate branded card untuk halaman sukses
  let brandedCard = null;
  try {
    brandedCard = await brandedQrCard({ text: scanUrl, nama, kode });
  } catch (err) {
    try {
      const qrB64 = await qrDataUrl(scanUrl, 300);
      brandedCard = { encoded: qrB64 };
    } catch (_) {}
  }

  res.send(addMemberSuccess({ tk, kode, nama, telepon, scanUrl, brandedCard }));
});

// ── GET /admin/edit ───────────────────────────────────────────
router.get("/edit", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  const idx     = findMemberIndex(db.members, kode);
  if (idx === -1) return res.redirect(`/admin?tk=${tk}`);

  const m     = db.members[idx];
  const { nama, tlp } = req.query;

  if (nama?.trim()) {
    m.nama = nama.trim();
    if (validateTelepon(tlp ?? "")) {
      m.telepon = formatTeleponDisplay(normalizeTelepon(tlp));
    }
    db.members[idx] = m;
    writeDB(db);
    return res.redirect(`/admin?tk=${tk}`);
  }

  res.send(editMemberPage(tk, m));
});

// ── GET /admin/hapus ──────────────────────────────────────────
router.get("/hapus", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  db.members    = db.members.filter((m) => m.kode !== kode);
  writeDB(db);
  res.redirect(`/admin?tk=${tk}`);
});

// ── GET /admin/klaim ──────────────────────────────────────────
router.get("/klaim", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  const idx     = findMemberIndex(db.members, kode);
  if (idx !== -1 && db.members[idx].status === "GRATIS") {
    db.members[idx].status = "-";
    writeDB(db);
  }
  res.redirect(`/admin?tk=${tk}`);
});

// ── GET /admin/sync-qr — upload semua QR member ke Cloudinary ─
router.get("/sync-qr", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  const db = readDB();
  let ok = 0, fail = 0;

  for (const m of db.members) {
    try {
      const scanUrl = buildScanUrl(req, m.kode);
      const qrBuf   = await qrBuffer(scanUrl, 520);
      const success = await uploadQrToCloudinary(m.kode, qrBuf);
      if (success) ok++; else fail++;
    } catch (err) {
      console.error("[SYNC] Gagal", m.kode, err.message);
      fail++;
    }
  }

  res.send("Sync selesai: " + ok + " berhasil, " + fail + " gagal. "
    + "<a href='/admin?tk=" + tk + "'>Kembali</a>");
});

// ── GET /admin/reset ──────────────────────────────────────────
router.get("/reset", requireAdmin, (req, res) => {
  const { tk } = res.locals;
  const db     = readDB();
  db.members.forEach((m) => { m.sudahScanHariIni = false; });
  writeDB(db);
  res.redirect(`/admin?tk=${tk}`);
});

export default router;
