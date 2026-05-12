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
// Pakai sharp composite — teks via SVG dengan font path langsung
// sehingga tidak perlu font terinstall di sistem Railway
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;
  const fs    = (await import("fs")).default;

  const W = 800, H = 800;
  const namaDisplay = nama.length > 22 ? nama.slice(0, 20) + "..." : nama;

  // Font paths langsung — tidak perlu fc-config
  const FONT_BOLD    = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const FONT_MONO    = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";

  // Encode font ke base64 untuk embed di SVG @font-face
  const toB64Font = (path) => {
    try {
      return "data:font/truetype;base64," + fs.readFileSync(path).toString("base64");
    } catch { return null; }
  };

  const boldB64    = toB64Font(FONT_BOLD);
  const regularB64 = toB64Font(FONT_REGULAR);
  const monoB64    = toB64Font(FONT_MONO);

  // Generate QR PNG
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrB64 = "data:image/png;base64," + qrBuf.toString("base64");

  // SVG lengkap dengan @font-face embedded — teks pasti render
  const fontFace = [
    boldB64    ? "@font-face{font-family:'DJ';font-weight:700;src:url('" + boldB64 + "') format('truetype');}" : "",
    regularB64 ? "@font-face{font-family:'DJ';font-weight:400;src:url('" + regularB64 + "') format('truetype');}" : "",
    monoB64    ? "@font-face{font-family:'DJM';font-weight:700;src:url('" + monoB64 + "') format('truetype');}" : "",
  ].join('');

  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
    ' width="800" height="800" viewBox="0 0 800 800">',
    '<defs><style>' + fontFace + '</style></defs>',

    // Background
    '<rect width="800" height="800" fill="#0d1b2e"/>',
    '<circle cx="800" cy="800" r="350" fill="#0a1f1a" opacity=".35"/>',
    '<circle cx="0" cy="0" r="180" fill="#0a1a0f" opacity=".2"/>',

    // Header
    '<rect x="0" y="0" width="800" height="120" fill="#14532d"/>',
    '<rect x="0" y="117" width="800" height="4" fill="#22c55e" opacity=".8"/>',
    '<rect x="0" y="117" width="100" height="4" fill="#22c55e"/>',

    // Icon billiard (shape SVG — bukan emoji, pasti render)
    '<circle cx="52" cy="60" r="32" fill="#0a1a0f" stroke="#22c55e" stroke-width="2.5"/>',
    '<circle cx="52" cy="60" r="22" fill="#111111"/>',
    '<circle cx="43" cy="51" r="9"  fill="#ffffff" opacity=".92"/>',
    '<circle cx="52" cy="60" r="4"  fill="#333333" opacity=".6"/>',

    // Strip warna bola billiard
    '<rect x="20" y="55" width="64" height="10" fill="#22c55e" opacity=".5" rx="2"/>',

    // Nama arena
    '<text x="100" y="58"',
    ' font-family="DJ,DejaVu Sans,sans-serif" font-weight="700"',
    ' font-size="30" fill="#ffffff">' + esc(CONFIG.NAMA_ARENA) + '</text>',
    '<text x="100" y="88"',
    ' font-family="DJ,DejaVu Sans,sans-serif" font-weight="400"',
    ' font-size="15" fill="#86efac" letter-spacing="3">MEMBER CARD</text>',

    // QR area — white card
    '<rect x="142" y="130" width="516" height="516" rx="16" fill="#000000" opacity=".3"/>',
    '<rect x="138" y="126" width="524" height="524" rx="16" fill="#ffffff"/>',
    '<image href="' + qrB64 + '" x="148" y="136" width="504" height="504"/>',

    // Logo center billiard di tengah QR
    '<rect x="378" y="368" width="44" height="44" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>',
    '<circle cx="400" cy="390" r="16" fill="#0d1b2e" stroke="#22c55e" stroke-width="2"/>',
    '<circle cx="393" cy="383" r="5"  fill="#ffffff" opacity=".85"/>',

    // Divider
    '<line x1="60" y1="666" x2="740" y2="666" stroke="#1e3a30" stroke-width="1.5"/>',

    // Nama member
    '<text x="400" y="706"',
    ' font-family="DJ,DejaVu Sans,sans-serif" font-weight="700"',
    ' font-size="30" fill="#e8edf5" text-anchor="middle">' + esc(namaDisplay) + '</text>',

    // Kode member
    '<text x="400" y="742"',
    ' font-family="DJM,DejaVu Sans Mono,monospace" font-weight="700"',
    ' font-size="19" fill="#22c55e" text-anchor="middle" letter-spacing="4">' + esc(kode) + '</text>',

    // Footer background
    '<rect x="0" y="760" width="800" height="40" fill="#071210"/>',

    // Footer teks
    '<text x="400" y="779"',
    ' font-family="DJ,DejaVu Sans,sans-serif" font-weight="700"',
    ' font-size="14" fill="#22c55e" text-anchor="middle">Tunjukkan ke kasir setiap mau main billiard</text>',
    '<text x="400" y="796"',
    ' font-family="DJ,DejaVu Sans,sans-serif" font-weight="400"',
    ' font-size="12" fill="#4a7060" text-anchor="middle">10x kunjungan = 1x GRATIS  ·  ' + esc(CONFIG.NAMA_ARENA) + '</text>',

    '</svg>',
  ].join('\n');

  // Convert SVG → PNG via sharp dengan density tinggi
  const pngBuf = await sharp(Buffer.from(svg, "utf8"), { density: 150 })
    .resize(800, 800)
    .png()
    .toBuffer();

  return pngBuf;
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
