// src/routes/share.js
// ── Route publik: WA thumbnail via Open Graph + Cloudinary ────

import { Router }             from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl, buildBaseUrl, brandedQrCard, qrDataUrl } from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import { arenaName, arenaWa } from "../utils/brand.js";
import { memberCardPage }    from "../views/qrCard.js";
import QRCode                 from "qrcode";

const router = Router();

// ── Cloudinary URL dinamis per member ────────────────────────
// Background: billiard-bg_k0l8pg (template hijau gelap di Cloudinary)
// QR: di-fetch dari /qr-only/:kode Railway — berbeda tiap member
// Teks: overlay via Cloudinary transformation
// ── Upload QR ke Cloudinary saat member dibuat ───────────────
export async function uploadQrToCloudinary(kode, qrBuf) {
  const CLOUD  = "dlxazwdbu";
  const KEY    = process.env.CLOUDINARY_KEY    ?? "";
  const SECRET = process.env.CLOUDINARY_SECRET ?? "";
  if (!KEY || !SECRET) {
    console.log("[CDN] CLOUDINARY_KEY/SECRET belum di-set");
    return false;
  }
  try {
    const { createHash } = await import("crypto");
    const publicId  = "qr_" + kode.toLowerCase().replace(/-/g, "_");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const str       = "overwrite=true&public_id=" + publicId + "&timestamp=" + timestamp + SECRET;
    const signature = createHash("sha1").update(str).digest("hex");

    const form = new FormData();
    form.append("file",      new Blob([qrBuf], { type: "image/png" }), "qr.png");
    form.append("api_key",   KEY);
    form.append("timestamp", timestamp);
    form.append("public_id", publicId);
    form.append("overwrite", "true");
    form.append("signature", signature);

    const resp = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload",
      { method: "POST", body: form }
    );
    const data = await resp.json();
    if (data.public_id) {
      console.log("[CDN] QR uploaded:", data.public_id);
      return true;
    }
    console.error("[CDN] Upload gagal:", JSON.stringify(data).slice(0, 120));
    return false;
  } catch (err) {
    console.error("[CDN] Upload error:", err.message);
    return false;
  }
}

// ── Upload gambar umum (mis. LOGO warung) ke Cloudinary ──────────────
// BEDA dari uploadQrToCloudinary: mengembalikan URL (secure_url) string —
// supaya caller bisa menyimpannya (mis. ke warung.logo_url). Return null bila
// env Cloudinary belum di-set ATAU gagal (caller perlakukan sbg "skip/tanpa logo").
export async function uploadImageToCloudinary(buf, { publicId = "", mime = "image/png" } = {}) {
  const CLOUD  = "dlxazwdbu";
  const KEY    = process.env.CLOUDINARY_KEY    ?? "";
  const SECRET = process.env.CLOUDINARY_SECRET ?? "";
  if (!KEY || !SECRET) {
    console.log("[CDN] CLOUDINARY_KEY/SECRET belum di-set — upload logo dilewati");
    return null;
  }
  try {
    const { createHash, randomBytes } = await import("crypto");
    const pid       = publicId || ("warung_logo/logo_" + randomBytes(6).toString("hex"));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const str       = "overwrite=true&public_id=" + pid + "&timestamp=" + timestamp + SECRET;
    const signature = createHash("sha1").update(str).digest("hex");
    const ext       = mime === "image/jpeg" ? "jpg" : "png";

    const form = new FormData();
    form.append("file",      new Blob([buf], { type: mime }), "logo." + ext);
    form.append("api_key",   KEY);
    form.append("timestamp", timestamp);
    form.append("public_id", pid);
    form.append("overwrite", "true");
    form.append("signature", signature);

    const resp = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload",
      { method: "POST", body: form }
    );
    const data = await resp.json();
    if (data.secure_url) {
      console.log("[CDN] Logo uploaded:", data.public_id);
      return data.secure_url;
    }
    console.error("[CDN] Upload logo gagal:", JSON.stringify(data).slice(0, 120));
    return null;
  } catch (err) {
    console.error("[CDN] Upload logo error:", err.message);
    return null;
  }
}

// ── Cloudinary URL dengan overlay QR + teks ──────────────────
function makeCloudinaryUrl(kode, nama) {
  const CLOUD = "dlxazwdbu";
  const BG    = "billiard-bg-v2_bs9hyz";
  // QR disimpan di Cloudinary dengan public_id: qr_[kode]
  const QR_ID = "qr_" + kode.toLowerCase().replace(/-/g, "_");

  const enc = (t) => encodeURIComponent(String(t ?? "")).replace(/,/g, "%2C");

  const arena    = enc(arenaName());
  const namaDisp = enc(nama.length > 20 ? nama.slice(0, 18) + "..." : nama);
  const kodeDisp = enc(kode);
  const footer   = enc("Tunjukkan ke kasir setiap mau main");

  const tr = [
    "w_800,h_800,c_fill",
    // QR dari Cloudinary storage — overlay ke area putih
    "l_" + QR_ID + ",w_520,h_520,g_center,y_-40,fl_layer_apply",
    // Teks header
    "l_text:Arial_34_bold:" + arena + ",co_white,g_north,y_32",
    "l_text:Arial_14:" + enc("MEMBER CARD") + ",co_rgb:86efac,g_north,y_80",
    // Teks footer
    "l_text:Arial_32_bold:" + namaDisp + ",co_rgb:ffffff,g_south,y_78",
    "l_text:Arial_18:" + kodeDisp + ",co_rgb:22c55e,g_south,y_42",
    "l_text:Arial_13:" + footer + ",co_rgb:86efac,g_south,y_16",
  ].join("/");

  return "https://res.cloudinary.com/" + CLOUD + "/image/upload/" + tr + "/" + BG;
}


// ── Helper: QR PNG polos (untuk Cloudinary fetch + fallback) ──
async function makeQrPng(scanUrl) {
  return QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#0d2137", light: "#ffffff" },
  });
}

// ── GET /qr-only/:kode — QR PNG murni untuk Cloudinary fetch ─
// Cloudinary akan fetch URL ini untuk overlay ke background
router.get("/qr-only/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = await readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    const png     = await makeQrPng(scanUrl);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(png);
  } catch {
    res.status(500).end();
  }
});

// ── GET /member/:kode — halaman kartu v3 + OG meta untuk WA ─────
router.get("/member/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = await readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = buildBaseUrl(req);
  const scanUrl  = base + "/scan?id=" + kode;
  const ogImgUrl = base + "/og-image/" + kode;
  const title    = arenaName() + " — " + member.nama;
  const desc     = "Kartu member " + arenaName()
    + ". Tunjukkan QR ini ke kasir untuk check-in. Kode: " + kode;

  // Generate QR data URL untuk kartu.
  // 480px source biar gak ke-upscale di display 260px (≥2x untuk Retina).
  // Upscale blur = scanner susah lock onto finder patterns.
  const qrImg = await qrDataUrl(scanUrl, 480);

  // Build halaman kartu portrait (QR besar, mobile-friendly) + inject OG meta tags
  const cardHtml = memberCardPage({
    nama:      member.nama,
    kode,
    totalMain: member.totalMain ?? 0,
    qrDataUrl: qrImg,
    nomorWa:   arenaWa(),
  });

  // Inject OG + Twitter meta tags ke dalam <head> sebelum </head>
  const ogTags = ''
    + '<meta property="og:type"             content="website">'
    + '<meta property="og:url"              content="' + base + '/member/' + kode + '">'
    + '<meta property="og:title"            content="' + title + '">'
    + '<meta property="og:description"      content="' + desc + '">'
    + '<meta property="og:image"            content="' + ogImgUrl + '">'
    + '<meta property="og:image:secure_url" content="' + ogImgUrl + '">'
    + '<meta property="og:image:type"       content="image/png">'
    + '<meta property="og:image:width"      content="800">'
    + '<meta property="og:image:height"     content="800">'
    + '<meta property="og:image:alt"        content="QR ' + member.nama + '">'
    + '<meta property="og:site_name"        content="' + arenaName() + '">'
    + '<meta name="twitter:card"            content="summary_large_image">'
    + '<meta name="twitter:title"           content="' + title + '">'
    + '<meta name="twitter:description"     content="' + desc + '">'
    + '<meta name="twitter:image"           content="' + ogImgUrl + '">';

  const finalHtml = cardHtml.replace('</head>', ogTags + '</head>');

  res.status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "no-cache")
    .send(finalHtml);
});

// ── GET /og-image/:kode — PNG untuk WA thumbnail ─────────────
// Redirect ke Cloudinary yang render gambar dengan teks + QR dinamis
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = await readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.status(404).end();

  const cdnUrl = makeCloudinaryUrl(kode, member.nama);

  console.log("[OG] Redirect Cloudinary untuk " + kode);
  res.redirect(302, cdnUrl);
});

// ── GET /og-debug/:kode — debug ───────────────────────────────
router.get("/og-debug/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = await readDB();
  const member = findMember(db.members, kode);
  const base   = buildBaseUrl(req);
  const cdnUrl = member ? makeCloudinaryUrl(kode, member.nama, base) : "N/A";

  res.send(
    '<html><head><meta charset="UTF-8"><title>OG Debug</title></head>'
    + '<body style="background:#070d18;color:#e8edf5;font-family:sans-serif;padding:20px">'
    + '<h2 style="color:#22c55e;margin-bottom:12px">OG Debug — ' + kode + '</h2>'
    + '<p style="color:#8496b0;font-size:13px">Member: '
    + (member ? '<strong>' + member.nama + '</strong>' : '<span style="color:#ef4444">NOT FOUND</span>') + '</p>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 4px">URL share WA:</p>'
    + '<code style="color:#22c55e;font-size:11px;word-break:break-all">' + base + '/member/' + kode + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 4px">Cloudinary URL:</p>'
    + '<code style="color:#3b82f6;font-size:10px;word-break:break-all">' + cdnUrl + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:16px 0 6px">Preview (harus branded dengan nama member):</p>'
    + '<img src="/og-image/' + kode + '" style="max-width:400px;border-radius:8px;border:2px solid #1e2d45">'
    + '</body></html>'
  );
});

export default router;
