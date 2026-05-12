// src/routes/share.js
// ── Route publik: WA thumbnail via Open Graph ─────────────────
//
// WA HANYA support og:image yang return image/png atau image/jpeg
// Solusi: buat SVG branded → convert ke PNG via sharp

import { Router }             from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl, buildBaseUrl } from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import QRCode                 from "qrcode";

const router = Router();

// ── Helper: escape SVG ────────────────────────────────────────
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Helper: buat branded PNG 800x800 ─────────────────────────
// Pakai sharp composite saja — NO teks, NO font, NO ImageMagick
// QR dengan warna custom + frame branded yang visually unik
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;

  const W = 800, H = 800;

  // 1. QR dengan warna dark navy (bukan hitam polos)
  //    Ini yang buat QR terlihat unik dan branded
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#0d1b2e", light: "#ffffff" },
  });

  // 2. QR kedua — lebih kecil dengan warna hijau untuk logo center
  const qrSmallBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 60, margin: 0,
    color: { dark: "#14532d", light: "#ffffff" },
  });

  // 3. Semua layer pakai sharp create + composite
  //    Layout: header 120px | QR area 560px | info 80px | footer 40px = 800px

  // Header hijau gelap
  const hdrBuf = await sharp({
    create: { width: W, height: 120, channels: 4,
      background: { r: 20, g: 83, b: 45, alpha: 1 } }
  }).png().toBuffer();

  // Aksen garis hijau terang bawah header
  const accentBuf = await sharp({
    create: { width: W, height: 5, channels: 4,
      background: { r: 34, g: 197, b: 94, alpha: 1 } }
  }).png().toBuffer();

  // Aksen kiri (lebih terang)
  const accentLeftBuf = await sharp({
    create: { width: 90, height: 5, channels: 4,
      background: { r: 134, g: 239, b: 172, alpha: 1 } }
  }).png().toBuffer();

  // Icon billiard — SVG shape (bukan teks/emoji)
  const ballSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">'
    + '<circle cx="40" cy="40" r="38" fill="#0a1a0f" stroke="#22c55e" stroke-width="3"/>'
    + '<circle cx="40" cy="40" r="27" fill="#111"/>'
    + '<circle cx="30" cy="30" r="11" fill="#fff" opacity=".92"/>'
    + '<circle cx="40" cy="40" r="5"  fill="#333" opacity=".7"/>'
    + '<rect x="8" y="36" width="64" height="9" fill="#22c55e" opacity=".45" rx="3"/>'
    + '</svg>'
  );

  // White card untuk QR
  const qrCardBuf = await sharp({
    create: { width: 544, height: 544, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).composite([
    { input: await sharp(qrBuf).resize(520, 520).toBuffer(), top: 12, left: 12 }
  ]).png().toBuffer();

  // Logo billiard center di QR (overlay kecil)
  const logoCenterSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">'
    + '<rect width="52" height="52" rx="8" fill="#fff" stroke="#e5e7eb" stroke-width="1.5"/>'
    + '<circle cx="26" cy="26" r="18" fill="#0d1b2e" stroke="#22c55e" stroke-width="2.5"/>'
    + '<circle cx="19" cy="19" r="6"  fill="#fff" opacity=".88"/>'
    + '<rect x="8" y="23" width="36" height="5" fill="#22c55e" opacity=".4" rx="2"/>'
    + '</svg>'
  );

  // Info bar navy
  const infoBuf = await sharp({
    create: { width: W, height: 84, channels: 4,
      background: { r: 10, g: 23, b: 40, alpha: 1 } }
  }).png().toBuffer();

  // Divider
  const divBuf = await sharp({
    create: { width: 680, height: 2, channels: 4,
      background: { r: 30, g: 58, b: 48, alpha: 1 } }
  }).png().toBuffer();

  // Footer
  const footerBuf = await sharp({
    create: { width: W, height: 42, channels: 4,
      background: { r: 7, g: 18, b: 16, alpha: 1 } }
  }).png().toBuffer();

  // Footer accent line
  const footAccentBuf = await sharp({
    create: { width: W, height: 3, channels: 4,
      background: { r: 34, g: 197, b: 94, alpha: 0.5 } }
  }).png().toBuffer();

  // Nama bar — strip navy untuk area nama (visual placeholder)
  const namaBarBuf = await sharp({
    create: { width: 500, height: 32, channels: 4,
      background: { r: 20, g: 35, b: 58, alpha: 1 } }
  }).png().toBuffer();

  // Kode bar — strip hijau gelap
  const kodeBarBuf = await sharp({
    create: { width: 280, height: 22, channels: 4,
      background: { r: 14, g: 53, b: 45, alpha: 1 } }
  }).png().toBuffer();

  // 4. Composite semua layer
  const result = await sharp({
    create: { width: W, height: H, channels: 4,
      background: { r: 13, g: 27, b: 46, alpha: 1 } }
  }).composite([
    { input: hdrBuf,       top: 0,   left: 0 },
    { input: accentBuf,    top: 117, left: 0 },
    { input: accentLeftBuf,top: 117, left: 0 },
    { input: ballSvg,      top: 20,  left: 18 },    // icon billiard
    { input: qrCardBuf,    top: 128, left: 128 },   // QR white card
    { input: logoCenterSvg,top: 374, left: 374 },   // logo center QR
    { input: divBuf,       top: 678, left: 60 },
    { input: infoBuf,      top: 680, left: 0 },
    { input: namaBarBuf,   top: 690, left: 150 },   // nama placeholder
    { input: kodeBarBuf,   top: 728, left: 260 },   // kode placeholder
    { input: footerBuf,    top: 758, left: 0 },
    { input: footAccentBuf,top: 797, left: 0 },
  ]).png().toBuffer();

  return result;
}


// ── GET /member/:kode — halaman OG untuk WA crawler ──────────
router.get("/member/:kode", (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = buildBaseUrl(req);
  const scanUrl  = base + "/scan?id=" + kode;
  const ogImgUrl = base + "/og-image/" + kode;
  const title    = CONFIG.NAMA_ARENA + " — " + member.nama;
  const desc     = "Kartu member " + CONFIG.NAMA_ARENA
    + ". Tunjukkan QR ini ke kasir untuk check-in. Kode: " + kode;

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
    '<!DOCTYPE html>'
    + '<html prefix="og: http://ogp.me/ns#" lang="id"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta property="og:type"             content="website">'
    + '<meta property="og:url"              content="' + scanUrl + '">'
    + '<meta property="og:title"            content="' + title + '">'
    + '<meta property="og:description"      content="' + desc + '">'
    + '<meta property="og:image"            content="' + ogImgUrl + '">'
    + '<meta property="og:image:secure_url" content="' + ogImgUrl + '">'
    + '<meta property="og:image:type"       content="image/png">'
    + '<meta property="og:image:width"      content="800">'
    + '<meta property="og:image:height"     content="800">'
    + '<meta property="og:image:alt"        content="QR ' + member.nama + '">'
    + '<meta property="og:site_name"        content="' + CONFIG.NAMA_ARENA + '">'
    + '<meta name="twitter:card"            content="summary_large_image">'
    + '<meta name="twitter:title"           content="' + title + '">'
    + '<meta name="twitter:description"     content="' + desc + '">'
    + '<meta name="twitter:image"           content="' + ogImgUrl + '">'
    + '<title>' + title + '</title>'
    + '</head><body style="margin:0;background:#070d18;display:flex;align-items:center;'
    + 'justify-content:center;min-height:100vh;font-family:sans-serif">'
    + '<div style="text-align:center;padding:20px">'
    + '<p style="color:#4a5e78;font-size:14px">Mengalihkan ke halaman check-in...</p>'
    + '<p style="margin-top:12px"><a href="' + scanUrl + '" style="color:#22c55e;font-size:13px">'
    + 'Klik di sini jika tidak otomatis</a></p></div>'
    + '<script>setTimeout(function(){window.location.href="' + scanUrl + '"},100);</script>'
    + '</body></html>'
  );
});

// ── GET /og-image/:kode — branded PNG untuk WA thumbnail ─────
// WAJIB return image/png — WA tidak mau SVG
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    console.log("[OG] Generate branded PNG untuk " + kode);

    const pngBuf = await makeBrandedPng(scanUrl, member.nama, kode);

    res
      .status(200)
      .setHeader("Content-Type", "image/png")
      .setHeader("Content-Length", pngBuf.length)
      .setHeader("Cache-Control", "public, max-age=3600")
      .setHeader("Access-Control-Allow-Origin", "*")
      .end(pngBuf);

    console.log("[OG] PNG branded OK:", pngBuf.length, "bytes");
  } catch (err) {
    console.error("[OG] sharp gagal:", err.message, "| fallback ke QR polos");
    // Fallback ke QR PNG polos kalau sharp belum tersedia
    try {
      const scanUrl = buildScanUrl(req, kode);
      const pngBuf  = await QRCode.toBuffer(scanUrl, {
        type: "png", width: 600, margin: 3,
        color: { dark: "#000000", light: "#ffffff" },
      });
      res.setHeader("Content-Type", "image/png")
         .setHeader("Cache-Control", "public, max-age=3600")
         .end(pngBuf);
      console.log("[OG] Fallback QR polos OK");
    } catch (err2) {
      res.status(500).end();
    }
  }
});

// ── GET /og-debug/:kode — debug ───────────────────────────────
router.get("/og-debug/:kode", (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  const base   = buildBaseUrl(req);
  res.send(
    '<html><head><meta charset="UTF-8"><title>OG Debug</title></head>'
    + '<body style="background:#070d18;color:#e8edf5;font-family:sans-serif;padding:20px">'
    + '<h2 style="color:#22c55e;margin-bottom:12px">OG Debug — ' + kode + '</h2>'
    + '<p style="color:#8496b0;font-size:13px;margin-bottom:6px">Member: '
    + (member ? '<strong>' + member.nama + '</strong>' : '<span style="color:#ef4444">NOT FOUND</span>') + '</p>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 4px">URL share WA:</p>'
    + '<code style="color:#22c55e;font-size:12px">' + base + '/member/' + kode + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:16px 0 6px">Preview gambar (harus branded PNG):</p>'
    + '<img src="/og-image/' + kode + '" style="max-width:400px;border-radius:8px;border:2px solid #1e2d45">'
    + '</body></html>'
  );
});

export default router;
