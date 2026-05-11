// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import { readDB, writeDB, readLog, createMember, findMemberIndex } from "../utils/db.js";
import { requireAdmin } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl } from "../utils/qr.js";
import { adminLoginPage, adminDashboard, addMemberPage, addMemberSuccess, editMemberPage } from "../views/admin.js";

const router = Router();

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", (req, res) => {
  const tk  = req.query.tk ?? "";
  const pin = verifyToken(tk);

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    return res.send(adminLoginPage(!!req.query.err));
  }

  const token = tk || createToken(pin);
  const db    = readDB();
  const log   = readLog();

  res.send(adminDashboard({ db, log, token, req }));
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

  // Generate branded card — log error agar tidak silent fail
  let brandedCard = null;
  try {
    brandedCard = await brandedQrCard({ text: scanUrl, nama, kode });
    console.log("[QR] Branded card OK untuk " + kode);
  } catch (err) {
    console.error("[QR] brandedQrCard gagal untuk " + kode + ":", err.message);
    // Fallback: QR polos sebagai base64
    try {
      const qrB64 = await qrDataUrl(scanUrl, 300);
      brandedCard = { encoded: qrB64 };
      console.log("[QR] Fallback QR polos OK untuk " + kode);
    } catch (err2) {
      console.error("[QR] Fallback juga gagal:", err2.message);
    }
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

// ── GET /admin/reset ──────────────────────────────────────────
router.get("/reset", requireAdmin, (req, res) => {
  const { tk } = res.locals;
  const db     = readDB();
  db.members.forEach((m) => { m.sudahScanHariIni = false; });
  writeDB(db);
  res.redirect(`/admin?tk=${tk}`);
});

export default router;
