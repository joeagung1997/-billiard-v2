// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import {
  readDB, readLog, readTransaksi,
  saveMember, deleteMember, resetScanHarian,
  createMember, findMember, findMemberIndex,
  resetQrMember, appendLog,
} from "../utils/db.js";
import { requireAdmin } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary } from "./share.js";
import { adminLoginPage, adminDashboard, memberPage, addMemberPage, addMemberSuccess, editMemberPage } from "../views/admin.js";

const router = Router();

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", async (req, res) => {
  const tk  = req.query.tk ?? "";
  const pin = verifyToken(tk);

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    return res.send(adminLoginPage(!!req.query.err));
  }

  try {
    const token     = tk || createToken(pin);
    const db        = await readDB();
    const log       = await readLog();
    const transaksi = await readTransaksi();

    res.send(adminDashboard({ db, log, transaksi, token, req }));
  } catch (err) {
    console.error("[ADMIN] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── POST /admin/login ─────────────────────────────────────────
router.post("/login", (req, res) => {
  const pin = (req.body.pin ?? "").trim();
  if (pin !== CONFIG.ADMIN_PIN) return res.redirect("/admin?err=1");
  const token = createToken(pin);
  res.redirect(`/admin?tk=${token}`);
});

// ── GET /admin/members — member management page ───────────────
router.get("/members", requireAdmin, async (req, res) => {
  try {
    const db    = await readDB();
    const token = res.locals.tk;
    res.send(memberPage({ db, token, req }));
  } catch (err) {
    console.error("[ADMIN] members error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /admin/tambah ─────────────────────────────────────────
router.get("/tambah", requireAdmin, async (req, res) => {
  const { tk }        = res.locals;
  const { nama, tlp } = req.query;

  if (!nama) {
    return res.send(addMemberPage(tk, !!req.query.errtlp));
  }

  // Validasi telepon
  if (!validateTelepon(tlp ?? "")) {
    return res.redirect(`/admin/tambah?tk=${tk}&errtlp=1`);
  }

  try {
    const digits    = normalizeTelepon(tlp);
    const telepon   = formatTeleponDisplay(digits);
    const db        = await readDB();
    const kode      = generateKode(db.members);
    const newMember = createMember(kode, nama, telepon);

    await saveMember(newMember);

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
  } catch (err) {
    console.error("[ADMIN] tambah error:", err.message);
    res.status(500).send("Gagal menambah member. Coba lagi.");
  }
});

// ── GET /admin/edit ───────────────────────────────────────────
router.get("/edit", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();

  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx === -1) return res.redirect(`/admin?tk=${tk}`);

    const m     = { ...db.members[idx] };
    const { nama, tlp } = req.query;

    if (nama?.trim()) {
      m.nama = nama.trim();
      if (validateTelepon(tlp ?? "")) {
        m.telepon = formatTeleponDisplay(normalizeTelepon(tlp));
      }
      await saveMember(m);
      return res.redirect(`/admin?tk=${tk}`);
    }

    res.send(editMemberPage(tk, m));
  } catch (err) {
    console.error("[ADMIN] edit error:", err.message);
    res.status(500).send("Gagal memuat data member.");
  }
});

// ── GET /admin/hapus ──────────────────────────────────────────
router.get("/hapus", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  try {
    await deleteMember(kode);
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] hapus error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

// ── GET /admin/klaim ──────────────────────────────────────────
router.get("/klaim", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx !== -1 && db.members[idx].status === "GRATIS") {
      const m = { ...db.members[idx], status: "-" };
      await saveMember(m);
    }
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] klaim error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

// ── GET /admin/sync-qr — upload semua QR member ke Cloudinary ─
router.get("/sync-qr", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    const db = await readDB();
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
  } catch (err) {
    res.status(500).send("Gagal sync QR: " + err.message);
  }
});

// ── GET /admin/reset-qr — ganti kode/QR, data tetap ─────────
router.get("/reset-qr", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const oldKode = (req.query.kode ?? "").toUpperCase();
  try {
    const db = await readDB();
    const m  = findMember(db.members, oldKode);
    if (!m) return res.redirect(`/admin/members?tk=${tk}`);

    const newKode = generateKode(db.members);
    await resetQrMember(oldKode, newKode);

    // Re-upload QR ke Cloudinary dengan kode baru
    const scanUrl = buildScanUrl(req, newKode);
    try {
      const qrBuf = await qrBuffer(scanUrl, 520);
      await uploadQrToCloudinary(newKode, qrBuf);
    } catch (err) {
      console.error("[RESET-QR] Upload QR gagal:", err.message);
    }

    await appendLog(newKode, m.nama, "RESET_QR", "Kode lama: " + oldKode);
    res.redirect(`/admin/members?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] reset-qr error:", err.message);
    res.redirect(`/admin/members?tk=${tk}`);
  }
});

// ── GET /admin/reset ──────────────────────────────────────────
router.get("/reset", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    await resetScanHarian();
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] reset error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

export default router;
