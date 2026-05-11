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
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;

  const W = 800, H = 800;

  // 1. Generate QR PNG
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // 2. Buat frame warna solid pakai sharp — tidak butuh font sama sekali
  // Layout: header hijau 120px | QR 560px | footer 120px = 800px total

  // Header hijau gelap 800x120
  const header = await sharp({
    create: { width: W, height: 120, channels: 4,
      background: { r: 20, g: 83, b: 45, alpha: 1 } }
  }).png().toBuffer();

  // Aksen garis bawah header (hijau terang 4px)
  const accent = await sharp({
    create: { width: W, height: 4, channels: 4,
      background: { r: 34, g: 197, b: 94, alpha: 1 } }
  }).png().toBuffer();

  // QR area background putih 560x560
  const qrCard = await sharp({
    create: { width: 560, height: 560, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).composite([{
    input: await sharp(qrBuf).resize(536, 536).toBuffer(),
    top: 12, left: 12,
  }]).png().toBuffer();

  // Member info area 800x116 (navy gelap)
  const infoBar = await sharp({
    create: { width: W, height: 116, channels: 4,
      background: { r: 13, g: 27, b: 46, alpha: 1 } }
  }).png().toBuffer();

  // Divider tipis hijau 800x2
  const divider = await sharp({
    create: { width: W, height: 2, channels: 4,
      background: { r: 30, g: 58, b: 48, alpha: 1 } }
  }).png().toBuffer();

  // Footer 800x4 aksen bawah
  const footer = await sharp({
    create: { width: W, height: 4, channels: 4,
      background: { r: 34, g: 197, b: 94, alpha: 0.6 } }
  }).png().toBuffer();

  // 3. SVG HANYA untuk teks — dengan font DejaVu yang pasti ada di Railway
  // Tidak ada shape/background — hanya teks di atas transparent
  const namaDisplay = nama.length > 22 ? nama.slice(0, 20) + "..." : nama;
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const textSvg = Buffer.from([
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">',
    // Nama arena di header
    '<text x="110" y="64" font-family="DejaVu Sans,sans-serif"',
    ' font-size="32" font-weight="bold" fill="#ffffff">' + esc(CONFIG.NAMA_ARENA) + '</text>',
    '<text x="110" y="96" font-family="DejaVu Sans,sans-serif"',
    ' font-size="16" fill="#86efac" letter-spacing="4">MEMBER CARD</text>',
    // Nama member di info bar
    '<text x="400" y="718" font-family="DejaVu Sans,sans-serif" text-anchor="middle"',
    ' font-size="30" font-weight="bold" fill="#e8edf5">' + esc(namaDisplay) + '</text>',
    // Kode member
    '<text x="400" y="754" font-family="DejaVu Sans Mono,monospace" text-anchor="middle"',
    ' font-size="20" fill="#22c55e" letter-spacing="4">' + esc(kode) + '</text>',
    // Footer teks
    '<text x="400" y="786" font-family="DejaVu Sans,sans-serif" text-anchor="middle"',
    ' font-size="14" fill="#22c55e">Tunjukkan ke kasir setiap mau main</text>',
    '<text x="400" y="800" font-family="DejaVu Sans,sans-serif" text-anchor="middle"',
    ' font-size="11" fill="#4a7060">10x kunjungan = 1x GRATIS | ' + esc(CONFIG.NAMA_ARENA) + '</text>',
    '</svg>',
  ].join('\n'), "utf8");

  // 4. Composite semua layer
  const result = await sharp({
    create: { width: W, height: H, channels: 4,
      background: { r: 13, g: 27, b: 46, alpha: 1 } }
  }).composite([
    { input: header,  top: 0,   left: 0 },
    { input: accent,  top: 116, left: 0 },
    { input: qrCard,  top: 124, left: 120 },
    { input: divider, top: 688, left: 0 },
    { input: infoBar, top: 690, left: 0 },
    { input: footer,  top: 796, left: 0 },
    // Teks di atas semua layer
    { input: textSvg, top: 0,   left: 0 },
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
