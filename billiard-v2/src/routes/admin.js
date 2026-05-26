// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import jwt          from "jsonwebtoken";
import {
  readDB, readLog, readTransaksi,
  saveMember, deleteMember, resetScanHarian,
  createMember, findMember, findMemberIndex,
  resetQrMember, appendLog, checkBonusExpiry,
  readAdminAccounts,
} from "../utils/db.js";
import { requireAdmin, readFrtCookie } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary } from "./share.js";
import { adminLoginPage, adminDashboard, memberPage, addMemberPage, addMemberSuccess } from "../views/admin.js";
import { segeraHadirPage } from "../views/segeraHadir.js";

const router = Router();

// ── GET /segera-hadir — placeholder utk fitur yg blm di-implement ────
// Owner only. Title via ?title= query param.
router.get("/segera-hadir", (req, res) => {
  const tk   = req.query.tk ?? "";
  const user = verifyToken(tk);
  if (!user) return res.redirect("/admin");
  const title = String(req.query.title ?? "Fitur Ini").slice(0, 80);
  res.send(segeraHadirPage({ title, token: tk, user }));
});

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", async (req, res) => {
  const tk   = req.query.tk ?? "";
  const user = verifyToken(tk);

  if (!user) {
    // Fallback: owner/karyawan yg sudah punya cookie _frt valid (mis. baru
    // navigasi balik dari /operasional) gak perlu input PIN lagi — auto-issue
    // session token & redirect ke /admin?tk=... biar URL konsisten.
    const frt = readFrtCookie(req);
    if (frt?.role && frt?.username) {
      const newTk = createToken({
        username:    frt.username,
        role:        frt.role,
        displayName: frt.displayName || frt.username,
      });
      return res.redirect(`/admin?tk=${newTk}`);
    }
    return res.send(adminLoginPage(!!req.query.err));
  }

  try {
    await checkBonusExpiry();
    const db        = await readDB();
    const log       = await readLog();
    const transaksi = await readTransaksi();

    res.send(adminDashboard({ db, log, transaksi, token: tk, req, user }));
  } catch (err) {
    console.error("[ADMIN] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── POST /admin/login ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  const username = (req.body.username ?? "").trim().toLowerCase();
  const pin      = (req.body.pin      ?? "").trim();

  // Cari user dari DB admin_accounts (dengan fallback ke CONFIG)
  let found = null;
  try {
    const accounts = await readAdminAccounts();
    if (accounts.length > 0) {
      const row = accounts.find(
        (u) => u.username.toLowerCase() === username && u.pin === pin
      );
      if (row) found = { username: row.username, role: row.role, displayName: row.display_name || row.username, shift: row.shift || "siang" };
    }
  } catch (err) {
    console.error("[ADMIN] DB accounts lookup failed, fallback ke CONFIG:", err.message);
  }

  // Fallback: cek CONFIG.ADMIN_USERS jika DB gagal / kosong
  if (!found) {
    const fromConfig = CONFIG.ADMIN_USERS.find(
      (u) => u.username.toLowerCase() === username && u.pin === pin
    );
    if (fromConfig) found = { username: fromConfig.username, role: fromConfig.role, displayName: fromConfig.username, shift: "siang" };
  }

  if (!found) return res.redirect("/admin?err=1");

  const token = createToken({ username: found.username, role: found.role, displayName: found.displayName });

  // Auto-set cookie _frt utk semua role (owner & karyawan) — supaya akses
  // /operasional/* tdk perlu input PIN lagi setelah login di /admin.
  const frt = jwt.sign(
    { role: found.role, username: found.username, displayName: found.displayName, shift: found.shift },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES }
  );
  res.setHeader("Set-Cookie",
    `_frt=${encodeURIComponent(frt)}; HttpOnly; Path=/operasional; Max-Age=${24 * 3600}; SameSite=Lax`
  );

  res.redirect(`/admin?tk=${token}`);
});

// ── GET /admin/members — member management page ───────────────
router.get("/members", requireAdmin, async (req, res) => {
  try {
    await checkBonusExpiry();
    const db    = await readDB();
    const log   = await readLog();
    const token = res.locals.tk;
    const user  = {
      username:    res.locals.adminUser,
      role:        res.locals.adminRole,
      displayName: res.locals.adminDisplay,
    };
    res.send(memberPage({ db, log, token, req, user }));
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
    await appendLog(kode, nama, "DAFTAR_MEMBER", "Member baru terdaftar");

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

// ── GET /admin/edit — save member (dari modal inline edit) ───
// Halaman form standalone sudah dihapus. Edit sekarang inline di
// modal detail member (/admin/members). Endpoint ini cuma menerima
// data save via query string lalu redirect kembali.
router.get("/edit", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  const kode   = (req.query.kode ?? "").toUpperCase();
  const { nama, tlp } = req.query;

  // Tanpa data nama -> redirect ke kelola member
  if (!nama?.trim() || !kode) {
    return res.redirect(`/admin/members?tk=${tk}`);
  }

  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx === -1) return res.redirect(`/admin/members?tk=${tk}`);

    const m = { ...db.members[idx] };

    // Snapshot sebelum diubah untuk audit log
    const oldNama = m.nama;
    const oldTlp  = m.telepon ?? "";

    m.nama = nama.trim();
    // Telepon: kosongkan kalau input kosong, simpan kalau valid
    const tlpInput = (tlp ?? "").trim();
    if (tlpInput === "") {
      m.telepon = "";
    } else if (validateTelepon(tlpInput)) {
      m.telepon = formatTeleponDisplay(normalizeTelepon(tlpInput));
    }

    await saveMember(m);

    const changes = [];
    if (oldNama !== m.nama)    changes.push(`nama: '${oldNama}' → '${m.nama}'`);
    if (oldTlp  !== m.telepon) changes.push(`telp: '${oldTlp || "-"}' → '${m.telepon || "-"}'`);
    if (changes.length) {
      await appendLog(m.kode, m.nama, "EDIT_MEMBER", changes.join(", "));
    }

    res.redirect(`/admin/members?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] edit error:", err.message);
    res.redirect(`/admin/members?tk=${tk}`);
  }
});

// ── GET /admin/hapus ──────────────────────────────────────────
router.get("/hapus", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  try {
    // Capture nama sebelum hapus untuk audit log
    const db = await readDB();
    const m  = findMember(db.members, kode);
    const namaSnapshot = m?.nama ?? "(unknown)";

    await deleteMember(kode);
    await appendLog(kode, namaSnapshot, "DELETE_MEMBER",
      `Total main: ${m?.totalMain ?? 0}, total gratis: ${m?.totalGratis ?? 0}`);

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
    if (idx !== -1) {
      const m = { ...db.members[idx] };
      if (m.status === "BONUS" || m.status === "GRATIS") {
        m.totalGratis   = (m.totalGratis ?? 0) + 1;
        m.totalMain     = 0;
        m.tanggalMulai  = new Date().toISOString();
        m.status        = "-";
        m.bonusEarnedAt = null;
        await saveMember(m);
        await appendLog(kode, m.nama, "BONUS_KLAIM", `Reward ke-${m.totalGratis} diklaim kasir`);
      }
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

// ── GET /admin/set-sesi — paksa total_main ke nilai tertentu (testing) ───────
router.get("/set-sesi", requireAdmin, async (req, res) => {
  const { tk }   = res.locals;
  const kode     = (req.query.kode ?? "").toUpperCase();
  const sesi     = parseInt(req.query.sesi ?? "");
  if (!kode || isNaN(sesi)) return res.status(400).send("?kode=XXX&sesi=N wajib diisi");
  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx === -1) return res.status(404).send("Member tidak ditemukan: " + kode);
    const m = { ...db.members[idx], totalMain: sesi };
    await saveMember(m);
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    res.status(500).send("Gagal: " + err.message);
  }
});

// ── GET /admin/seed-test — buat member testing (hapus setelah selesai) ────────
router.get("/seed-test", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    const kode = "JMB-TEST-99";
    const m = createMember(kode, "Testing Bonus", "");
    m.totalMain           = 9;
    m.tanggalScanTerakhir = new Date().toISOString();
    await saveMember(m);
    res.send(
      '<p style="font-family:sans-serif;padding:20px">Member <strong>' + kode +
      '</strong> (Testing Bonus, sesi 9/10) berhasil dibuat. ' +
      '<a href="/admin?tk=' + tk + '">Kembali ke dashboard</a></p>'
    );
  } catch (err) {
    res.status(500).send("Gagal: " + err.message);
  }
});

export default router;
