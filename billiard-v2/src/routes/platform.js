// src/routes/platform.js
// ── AREA ADMIN PLATFORM (superadmin) — terpisah dari area owner warung ──
//
// Hanya akun role 'superadmin' yang boleh akses. Login sendiri di /platform/login
// (BUKAN per-warung /w/:slug). Menu: Dashboard, Daftar Warung, Buat Warung,
// Kelola Langganan, Pengaturan, Kelola Admin. TANPA menu operasional warung.
//
// KEAMANAN SESI: autentikasi MURNI dari cookie httpOnly `_frt` (JWT). TIDAK ada
// token di URL (?tk=) — token sesi rentan bocor lewat history/referer/screenshot.

import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  listWarungsWithStats, createWarung, getWarungBySlug, getWarungById,
  findSuperadmin, updateWarungLangganan, getWarungOwner, updateWarungModules,
  resetOwnerPin, logPlatformAction, readPlatformLog,
  getPlatformSettings, updatePlatformSettings,
  listSuperadmins, createSuperadmin, setSuperadminActive, resetSuperadminPin,
  getActiveSuperadmin,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import { readFrtCookie } from "../middleware/auth.js";
import { OPTIONAL_MODULES } from "../utils/tenant.js";
import { invalidateWarung } from "../middleware/subscription.js";
import { wibEndOfDayISO } from "../utils/format.js";
import { uploadImageToCloudinary } from "./share.js";
import {
  warungListPage, warungCreatePage, adminLoginPage,
  platformDashboardPage, warungDetailPage, langgananPage,
  pengaturanPlatformPage, kelolaAdminPage,
} from "../views/admin.js";
import { resultPage } from "../views/member.js";

const router = Router();
const BASE = "/platform";

// ── Cookie helper: httpOnly + SameSite=Lax + Secure (hanya saat HTTPS) ──
// Railway berada di balik proxy TLS → `req.protocol` tetap http; deteksi HTTPS
// lewat header X-Forwarded-Proto supaya Secure aktif di prod tanpa merusak
// dev lokal (HTTP). SameSite=Lax memblokir POST lintas-situs → proteksi CSRF.
const isHttps = (req) => (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
const frtCookie = (value, maxAgeSec, req) =>
  `_frt=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax` + (isHttps(req) ? "; Secure" : "");
const clearFrt = (req) =>
  `_frt=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax` + (isHttps(req) ? "; Secure" : "");

// ── Auth: hanya role 'superadmin' — dari COOKIE saja (tanpa ?tk=) ────
// Verifikasi akun masih ada & aktif di DB tiap request → nonaktif berlaku
// langsung (tak menunggu cookie 24 jam kedaluwarsa). Tak menyentuh konteks
// warung (lintas-tenant).
async function requirePlatformAuth(req, res, next) {
  const frt = readFrtCookie(req);
  if (!frt || frt.role !== "superadmin" || !frt.username) {
    return res.redirect("/platform/login");
  }
  let acc = null;
  try { acc = await getActiveSuperadmin(frt.username); }
  catch (err) { console.error("[PLATFORM] auth lookup error:", err.message); }
  if (!acc) {
    res.setHeader("Set-Cookie", [clearFrt(req)]); // akun dihapus/dinonaktifkan → tendang
    return res.redirect("/platform/login");
  }
  res.locals.adminUser    = acc.username;
  res.locals.adminRole    = "superadmin";
  res.locals.adminDisplay = acc.display_name || frt.displayName || "Super Admin";
  next();
}

const platformUser = (res) => ({
  username: res.locals.adminUser, role: res.locals.adminRole, displayName: res.locals.adminDisplay,
});

// Origin kanonik untuk membangun URL lengkap warung: pakai base_url dari
// Pengaturan Platform bila di-set (hindari kebingungan www/apex), fallback origin.
const originOf = (req, settings) =>
  (settings && settings.base_url && settings.base_url.trim()) || (req.protocol + "://" + req.get("host"));

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
  const frt    = jwt.sign({ ...claims, boot: CONFIG.SESSION_VERSION }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
  res.setHeader("Set-Cookie", [frtCookie(encodeURIComponent(frt), 24 * 3600, req)]);
  res.redirect("/platform"); // URL bersih — tanpa token
});

router.get("/logout", (req, res) => {
  res.setHeader("Set-Cookie", [clearFrt(req)]);
  res.redirect("/platform/login");
});

// ── Dashboard Platform ──────────────────────────────────────────────
router.get("/", requirePlatformAuth, async (req, res) => {
  try {
    const [warungs, log] = await Promise.all([listWarungsWithStats(), readPlatformLog(15)]);
    res.send(platformDashboardPage({ displayName: res.locals.adminDisplay, warungs, log }));
  } catch (err) {
    console.error("[PLATFORM] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Daftar Warung ───────────────────────────────────────────────────
router.get("/warung", requirePlatformAuth, async (req, res) => {
  try {
    const warungs = await listWarungsWithStats();
    res.send(warungListPage({ warungs, req, user: platformUser(res), platform: true, base: BASE }));
  } catch (err) {
    console.error("[PLATFORM] daftar warung error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Kelola Langganan (warung at-risk) ───────────────────────────────
router.get("/langganan", requirePlatformAuth, async (req, res) => {
  try {
    const warungs = await listWarungsWithStats();
    res.send(langgananPage({ displayName: res.locals.adminDisplay, warungs }));
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
    const [owner, settings] = await Promise.all([getWarungOwner(warung.id), getPlatformSettings()]);
    res.send(warungDetailPage({ displayName: res.locals.adminDisplay, warung, owner, hostBase: originOf(req, settings) }));
  } catch (err) {
    console.error("[PLATFORM] detail warung error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Ubah modul aktif warung ─────────────────────────────────────────
router.post("/warung/:id/modul", requirePlatformAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const mods = b.modul == null ? [] : (Array.isArray(b.modul) ? b.modul : [b.modul]);
  const clean = mods.filter((m) => OPTIONAL_MODULES.includes(m));
  const ok = await updateWarungModules(id, clean);
  if (ok) {
    invalidateWarung(id); // efek langsung ke sidebar/gate owner (tak tunggu cache 60s)
    await logPlatformAction({ actor: res.locals.adminUser, action: "ubah modul", warungId: id, detail: clean.join(",") || "(kosong)" });
  }
  res.redirect(BASE + "/warung/" + id);
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
    const [owner, settings] = await Promise.all([getWarungOwner(id), getPlatformSettings()]);
    res.send(warungDetailPage({ displayName: res.locals.adminDisplay, warung, owner, newPin, hostBase: originOf(req, settings) }));
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
router.get("/baru", requirePlatformAuth, async (req, res) => {
  let trialDays = 14;
  try { trialDays = (await getPlatformSettings()).default_trial_days; } catch {}
  res.send(warungCreatePage({ user: platformUser(res), values: { status: "trial", trialDays: String(trialDays) }, platform: true, base: BASE }));
});

// ── Proses Buat Warung + akun owner pertama ─────────────────────────
router.post("/baru", requirePlatformAuth, async (req, res) => {
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
  const fail = (msg) => res.status(400).send(warungCreatePage({ user: platformUser(res), values, error: msg, platform: true, base: BASE }));

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
    return res.redirect(BASE + "/warung?created=" + encodeURIComponent(w.slug));
  } catch (err) {
    if (err.code === "SLUG_TAKEN") return fail('Slug "/w/' + values.slug + '" sudah dipakai. Pilih slug lain.');
    console.error("[PLATFORM] createWarung error:", err.message);
    return fail("Gagal membuat warung: " + err.message);
  }
});

// ── Ubah status langganan + tanggal trial ───────────────────────────
router.post("/warung/:id/langganan", requirePlatformAuth, async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const status = req.body.status;
  let trialSelesai = null;
  if (status === "trial") {
    const d = String(req.body.trialDate || "").trim();
    // Tanggal dari form (WIB) → akhir-hari WIB; default 30 hari (WIB end-of-day).
    trialSelesai = wibEndOfDayISO(d)
      || wibEndOfDayISO(new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }));
  }
  try {
    const ok = await updateWarungLangganan(id, status, trialSelesai);
    if (ok) {
      invalidateWarung(id); // status berlaku langsung utk owner
      await logPlatformAction({ actor: res.locals.adminUser, action: "ubah status langganan", warungId: id, detail: status + (trialSelesai ? " s/d " + trialSelesai.slice(0, 10) : "") });
    }
  } catch (err) {
    console.error("[PLATFORM] langganan error:", err.message);
  }
  res.redirect(BASE + "/warung/" + id);
});

// ── Pengaturan Platform (global) ────────────────────────────────────
router.get("/pengaturan", requirePlatformAuth, async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.send(pengaturanPlatformPage({ displayName: res.locals.adminDisplay, settings, saved: req.query.ok === "1" }));
  } catch (err) {
    console.error("[PLATFORM] pengaturan error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

router.post("/pengaturan", requirePlatformAuth, async (req, res) => {
  const b = req.body || {};
  const settings = {
    productName:  (b.productName || "").trim().slice(0, 80),
    baseUrl:      (b.baseUrl || "").trim().replace(/\/+$/, ""),
    supportWa:    (b.supportWa || "").trim(),
    supportEmail: (b.supportEmail || "").trim(),
    defaultTrialDays: parseInt(b.defaultTrialDays, 10),
  };
  const reErr = (msg) => res.status(400).send(pengaturanPlatformPage({
    displayName: res.locals.adminDisplay,
    settings: {
      product_name: settings.productName, base_url: settings.baseUrl, support_wa: settings.supportWa,
      support_email: settings.supportEmail, default_trial_days: b.defaultTrialDays,
    },
    error: msg,
  }));
  if (!settings.productName) return reErr("Nama produk wajib diisi.");
  if (settings.baseUrl && !/^https?:\/\/[^\s]+$/i.test(settings.baseUrl)) return reErr("Base URL harus diawali http:// atau https://");
  if (settings.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.supportEmail)) return reErr("Email support tidak valid.");
  if (!(settings.defaultTrialDays >= 1 && settings.defaultTrialDays <= 365)) return reErr("Default trial harus 1–365 hari.");
  try {
    await updatePlatformSettings(settings);
    await logPlatformAction({ actor: res.locals.adminUser, action: "ubah pengaturan platform", warungId: null, detail: "trial=" + settings.defaultTrialDays });
    res.redirect(BASE + "/pengaturan?ok=1");
  } catch (err) {
    console.error("[PLATFORM] simpan pengaturan error:", err.message);
    return reErr("Gagal menyimpan pengaturan: " + err.message);
  }
});

// ── Kelola Admin (akun superadmin platform) ─────────────────────────
const NOTICE = {
  "admin-baru": "Akun superadmin baru berhasil dibuat.",
  "aktif":      "Akun diaktifkan.",
  "nonaktif":   "Akun dinonaktifkan.",
};
const ERRTXT = {
  "last":     "Tidak bisa menonaktifkan akun superadmin aktif terakhir.",
  "notfound": "Akun tidak ditemukan.",
};

router.get("/admin", requirePlatformAuth, async (req, res) => {
  try {
    const admins = await listSuperadmins();
    res.send(kelolaAdminPage({
      displayName: res.locals.adminDisplay, admins, currentUser: res.locals.adminUser,
      notice: NOTICE[req.query.ok] || "", error: ERRTXT[req.query.err] || "",
    }));
  } catch (err) {
    console.error("[PLATFORM] kelola admin error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

router.post("/admin/baru", requirePlatformAuth, async (req, res) => {
  const b = req.body || {};
  const username    = (b.username || "").trim().toLowerCase();
  const displayName = (b.displayName || "").trim();
  const pin  = (b.pin || "").trim();
  const pin2 = (b.pinConfirm || "").trim();
  const reErr = async (msg) => {
    const admins = await listSuperadmins();
    res.status(400).send(kelolaAdminPage({
      displayName: res.locals.adminDisplay, admins, currentUser: res.locals.adminUser,
      error: msg, formValues: { username, displayName },
    }));
  };
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return reErr("Username tidak valid — 3–20 huruf kecil/angka/underscore.");
  if (!/^\d{4,8}$/.test(pin))              return reErr("PIN harus 4–8 digit angka.");
  if (pin !== pin2)                        return reErr("PIN dan ulangi PIN tidak sama.");
  try {
    await createSuperadmin({ username, pin, displayName });
    await logPlatformAction({ actor: res.locals.adminUser, action: "tambah admin platform", warungId: null, detail: username });
    res.redirect(BASE + "/admin?ok=admin-baru");
  } catch (err) {
    if (err.code === "USERNAME_TAKEN") return reErr('Username "' + username + '" sudah dipakai. Pilih lain.');
    console.error("[PLATFORM] createSuperadmin error:", err.message);
    return reErr("Gagal membuat akun: " + err.message);
  }
});

router.post("/admin/:username/aktif", requirePlatformAuth, async (req, res) => {
  const username = String(req.params.username || "").toLowerCase();
  const active   = req.body.active === "1";
  const r = await setSuperadminActive(username, active);
  if (r.ok) {
    await logPlatformAction({ actor: res.locals.adminUser, action: (active ? "aktifkan" : "nonaktifkan") + " admin platform", warungId: null, detail: username });
    return res.redirect(BASE + "/admin?ok=" + (active ? "aktif" : "nonaktif"));
  }
  res.redirect(BASE + "/admin?err=" + (r.reason || "notfound"));
});

router.post("/admin/:username/reset-pin", requirePlatformAuth, async (req, res) => {
  const username = String(req.params.username || "").toLowerCase();
  try {
    const newPin = await resetSuperadminPin(username);
    if (newPin) await logPlatformAction({ actor: res.locals.adminUser, action: "reset PIN admin platform", warungId: null, detail: username });
    const admins = await listSuperadmins();
    res.send(kelolaAdminPage({
      displayName: res.locals.adminDisplay, admins, currentUser: res.locals.adminUser,
      newPin: newPin || null, error: newPin ? "" : "Akun tidak ditemukan.",
    }));
  } catch (err) {
    console.error("[PLATFORM] reset admin pin error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

export default router;
