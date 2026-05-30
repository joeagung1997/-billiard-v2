// src/routes/platform.js
// ── AREA ADMIN PLATFORM (superadmin) — terpisah dari area owner warung ──
//
// Hanya akun role 'superadmin' yang boleh akses. Login sendiri di /platform/login
// (BUKAN per-warung /w/:slug). Menu ringkas: Daftar Warung, Buat Warung, Kelola
// Langganan. TANPA menu operasional warung. Pindahan dari /admin/warung* dulu.

import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  listWarungsWithStats, createWarung, getWarungBySlug, getWarungById,
  findSuperadmin, updateWarungLangganan, getWarungOwner, updateWarungModules,
  resetOwnerPin, logPlatformAction, readPlatformLog,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import { createToken, verifyToken } from "../utils/session.js";
import { readFrtCookie } from "../middleware/auth.js";
import { OPTIONAL_MODULES } from "../utils/tenant.js";
import { uploadImageToCloudinary } from "./share.js";
import {
  warungListPage, warungCreatePage, adminLoginPage,
  platformDashboardPage, warungDetailPage, langgananPage,
} from "../views/admin.js";
import { resultPage } from "../views/member.js";

const router = Router();
const BASE = "/platform";

// ── Auth: hanya role 'superadmin' ───────────────────────────────────
// Pola sama dgn requireAdmin (token ?tk= → fallback cookie _frt → redirect),
// tapi role WAJIB 'superadmin'. Tak menyentuh konteks warung (lintas-tenant).
function requirePlatformAuth(req, res, next) {
  const tk   = req.query.tk ?? req.body.tk ?? "";
  const user = verifyToken(tk);
  if (!user) {
    const frt = readFrtCookie(req);
    if (frt && frt.role === "superadmin" && frt.username) {
      const newTk = createToken({ username: frt.username, role: "superadmin", displayName: frt.displayName || "Super Admin", warungId: 1 });
      const u = new URL(req.originalUrl, "http://x");
      u.searchParams.set("tk", newTk);
      return res.redirect(u.pathname + u.search);
    }
    return res.redirect("/platform/login");
  }
  if (user.role !== "superadmin") {
    return res.status(403).send(resultPage("error", {
      judul: "Akses Ditolak",
      pesan: "Halaman ini khusus superadmin platform.",
    }));
  }
  res.locals.tk           = tk;
  res.locals.adminUser    = user.username;
  res.locals.adminRole    = user.role;
  res.locals.adminDisplay = user.displayName || "Super Admin";
  next();
}

const platformUser = (res) => ({
  username: res.locals.adminUser, role: res.locals.adminRole, displayName: res.locals.adminDisplay,
});

// ── Login ───────────────────────────────────────────────────────────
router.get("/login", (req, res) => res.send(adminLoginPage(!!req.query.err, "/platform/login")));

router.post("/login", async (req, res) => {
  const username = (req.body.username ?? "").trim().toLowerCase();
  const pin      = (req.body.pin ?? "").trim();
  let acc = null;
  try { acc = await findSuperadmin(username, pin); }
  catch (err) { console.error("[PLATFORM] login lookup error:", err.message); }
  if (!acc) return res.redirect("/platform/login?err=1");

  const claims = { username: acc.username, role: "superadmin", displayName: acc.display_name || "Super Admin", warungId: 1 };
  const token  = createToken(claims);
  const frt    = jwt.sign({ ...claims, boot: CONFIG.DEPLOY_ID }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
  res.setHeader("Set-Cookie", [`_frt=${encodeURIComponent(frt)}; HttpOnly; Path=/; Max-Age=${24 * 3600}; SameSite=Lax`]);
  res.redirect("/platform?tk=" + token);
});

router.get("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", [`_frt=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`]);
  res.redirect("/platform/login");
});

// ── Dashboard Platform ──────────────────────────────────────────────
router.get("/", requirePlatformAuth, async (req, res) => {
  try {
    const [warungs, log] = await Promise.all([listWarungsWithStats(), readPlatformLog(15)]);
    res.send(platformDashboardPage({ token: res.locals.tk, displayName: res.locals.adminDisplay, warungs, log }));
  } catch (err) {
    console.error("[PLATFORM] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Daftar Warung ───────────────────────────────────────────────────
router.get("/warung", requirePlatformAuth, async (req, res) => {
  try {
    const warungs = await listWarungsWithStats();
    res.send(warungListPage({ warungs, token: res.locals.tk, req, user: platformUser(res), platform: true, base: BASE }));
  } catch (err) {
    console.error("[PLATFORM] daftar warung error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Kelola Langganan (warung at-risk) ───────────────────────────────
router.get("/langganan", requirePlatformAuth, async (req, res) => {
  try {
    const warungs = await listWarungsWithStats();
    res.send(langgananPage({ token: res.locals.tk, displayName: res.locals.adminDisplay, warungs }));
  } catch (err) {
    console.error("[PLATFORM] langganan error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Detail & Kelola Warung (per warung) ─────────────────────────────
// HANYA info akun/langganan/modul — TANPA data operasional warung.
router.get("/warung/:id", requirePlatformAuth, async (req, res) => {
  try {
    const warung = await getWarungById(parseInt(req.params.id, 10));
    if (!warung) return res.status(404).send(resultPage("error", { judul: "Warung Tidak Ada", pesan: "Warung tidak ditemukan." }));
    const owner = await getWarungOwner(warung.id);
    res.send(warungDetailPage({ token: res.locals.tk, displayName: res.locals.adminDisplay, warung, owner }));
  } catch (err) {
    console.error("[PLATFORM] detail warung error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Ubah modul aktif warung ─────────────────────────────────────────
router.post("/warung/:id/modul", requirePlatformAuth, async (req, res) => {
  const token = res.locals.tk;
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const mods = b.modul == null ? [] : (Array.isArray(b.modul) ? b.modul : [b.modul]);
  const clean = mods.filter((m) => OPTIONAL_MODULES.includes(m));
  const ok = await updateWarungModules(id, clean);
  if (ok) await logPlatformAction({ actor: res.locals.adminUser, action: "ubah modul", warungId: id, detail: clean.join(",") || "(kosong)" });
  res.redirect(BASE + "/warung/" + id + "?tk=" + token);
});

// ── Reset PIN owner ─────────────────────────────────────────────────
// Generate PIN baru → render Detail dgn banner PIN (sekali). PIN lama tak dibaca.
router.post("/warung/:id/reset-pin", requirePlatformAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const warung = await getWarungById(id);
    if (!warung) return res.status(404).send(resultPage("error", { judul: "Warung Tidak Ada", pesan: "Warung tidak ditemukan." }));
    const newPin = await resetOwnerPin(id);
    if (newPin) await logPlatformAction({ actor: res.locals.adminUser, action: "reset PIN owner", warungId: id, detail: "user " + newPin.username });
    const owner = await getWarungOwner(id);
    res.send(warungDetailPage({ token: res.locals.tk, displayName: res.locals.adminDisplay, warung, owner, newPin }));
  } catch (err) {
    console.error("[PLATFORM] reset-pin error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Cek slug (real-time) ────────────────────────────────────────────
router.get("/cek-slug", requirePlatformAuth, async (req, res) => {
  const slug = String(req.query.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return res.json({ ok: false, available: false, reason: "format" });
  try {
    const w = await getWarungBySlug(slug);
    return res.json({ ok: true, available: !w, reason: w ? "taken" : "free" });
  } catch (err) {
    console.error("[PLATFORM] cek-slug error:", err.message);
    return res.status(500).json({ ok: false, available: false, reason: "error" });
  }
});

// ── Upload logo → Cloudinary ────────────────────────────────────────
router.post("/upload-logo", requirePlatformAuth, async (req, res) => {
  const data = (req.body && req.body.data) || "";
  const m = /^data:(image\/(png|jpe?g));base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!m) return res.status(400).json({ error: "Tipe file harus PNG atau JPG." });
  const mime = m[1] === "image/jpg" ? "image/jpeg" : m[1];
  const buf  = Buffer.from(m[3], "base64");
  if (buf.length > 2 * 1024 * 1024) return res.status(400).json({ error: "Ukuran logo maksimal 2 MB." });
  try {
    const url = await uploadImageToCloudinary(buf, { mime });
    if (!url) return res.json({ skipped: true, reason: "Cloudinary belum dikonfigurasi — warung tetap bisa dibuat tanpa logo." });
    return res.json({ url });
  } catch (err) {
    console.error("[PLATFORM] upload-logo error:", err.message);
    return res.status(500).json({ error: "Gagal mengunggah logo. Coba lagi atau lewati." });
  }
});

// ── Form Buat Warung ────────────────────────────────────────────────
router.get("/baru", requirePlatformAuth, (req, res) => {
  res.send(warungCreatePage({ token: res.locals.tk, user: platformUser(res), platform: true, base: BASE }));
});

// ── Proses Buat Warung + akun owner pertama ─────────────────────────
router.post("/baru", requirePlatformAuth, async (req, res) => {
  const token = res.locals.tk;
  const b = req.body || {};
  const values = {
    nama:          (b.nama || "").trim(),
    slug:          (b.slug || "").trim().toLowerCase(),
    kodePrefix:    (b.kodePrefix || "").trim().toUpperCase(),
    status:        b.status === "aktif" ? "aktif" : "trial",
    trialDays:     String(b.trialDays || "").trim(),
    warna:         (b.warna || "").trim(),
    nomorWa:       (b.nomorWa || "").trim(),
    logoUrl:       (b.logoUrl || "").trim(),
    ownerWa:       (b.ownerWa || "").trim(),
    ownerEmail:    (b.ownerEmail || "").trim(),
    ownerUsername: (b.ownerUsername || "").trim().toLowerCase(),
    ownerName:     (b.ownerName || "").trim(),
  };
  const pin  = (b.ownerPin || "").trim();
  const pin2 = (b.ownerPinConfirm || "").trim();
  const rawModul = b.modul == null ? [] : (Array.isArray(b.modul) ? b.modul : [b.modul]);
  const activeModules = rawModul.filter((mm) => OPTIONAL_MODULES.includes(mm));
  values.modul = activeModules;
  const fail = (msg) => res.status(400).send(warungCreatePage({ token, user: platformUser(res), values, error: msg, platform: true, base: BASE }));

  if (!values.nama)                                    return fail("Nama warung wajib diisi.");
  if (!/^[a-z0-9-]{2,40}$/.test(values.slug))          return fail("Slug tidak valid — huruf kecil, angka, & strip (2–40 karakter).");
  if (!/^[A-Z0-9]{2,6}$/.test(values.kodePrefix))      return fail("Prefix kode member tidak valid — 2–6 huruf/angka kapital.");
  if (!/^[a-z0-9_]{3,20}$/.test(values.ownerUsername)) return fail("Username owner tidak valid — 3–20 huruf kecil/angka/underscore.");
  if (!/^\d{4,8}$/.test(pin))                          return fail("PIN owner harus 4–8 digit angka.");
  if (pin !== pin2)                                    return fail("PIN dan ulangi PIN tidak sama.");
  if (values.status === "trial") {
    const d = parseInt(values.trialDays, 10);
    if (!(d >= 1 && d <= 365)) return fail("Durasi trial harus 1–365 hari.");
  }
  if (values.warna) {
    const hx = values.warna.replace(/^#/, "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(hx)) return fail("Warna brand tidak valid — pakai kode hex 6 digit (mis. #7c3aed) atau kosongkan.");
    values.warna = "#" + hx;
  }
  if (values.ownerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.ownerEmail)) return fail("Email pemilik tidak valid.");
  if (values.logoUrl && !/^https?:\/\//i.test(values.logoUrl)) values.logoUrl = "";

  try {
    const w = await createWarung({
      nama: values.nama, slug: values.slug, kodePrefix: values.kodePrefix,
      warna: values.warna, nomorWa: values.nomorWa, logoUrl: values.logoUrl,
      ownerWa: values.ownerWa, ownerEmail: values.ownerEmail, activeModules,
      status: values.status, trialDays: values.trialDays,
      ownerUsername: values.ownerUsername, ownerPin: pin, ownerName: values.ownerName,
    });
    await logPlatformAction({ actor: res.locals.adminUser, action: "buat warung", warungId: w.id, detail: values.slug });
    return res.redirect(BASE + "/warung?tk=" + token + "&created=" + encodeURIComponent(w.slug));
  } catch (err) {
    if (err.code === "SLUG_TAKEN") return fail('Slug "/w/' + values.slug + '" sudah dipakai. Pilih slug lain.');
    console.error("[PLATFORM] createWarung error:", err.message);
    return fail("Gagal membuat warung: " + err.message);
  }
});

// ── Ubah status langganan + tanggal trial ───────────────────────────
router.post("/warung/:id/langganan", requirePlatformAuth, async (req, res) => {
  const token  = res.locals.tk;
  const id     = parseInt(req.params.id, 10);
  const status = req.body.status;
  let trialSelesai = null;
  if (status === "trial") {
    const d = String(req.body.trialDate || "").trim();
    trialSelesai = /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? new Date(d + "T23:59:59").toISOString()                 // tanggal dari form
      : new Date(Date.now() + 30 * 86400000).toISOString();      // default 30 hari
  }
  try {
    const ok = await updateWarungLangganan(id, status, trialSelesai);
    if (ok) await logPlatformAction({ actor: res.locals.adminUser, action: "ubah status langganan", warungId: id, detail: status + (trialSelesai ? " s/d " + trialSelesai.slice(0, 10) : "") });
  } catch (err) {
    console.error("[PLATFORM] langganan error:", err.message);
  }
  res.redirect(BASE + "/warung/" + id + "?tk=" + token);
});

export default router;
