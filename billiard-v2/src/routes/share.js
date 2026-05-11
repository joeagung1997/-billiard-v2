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
  // 1. Generate QR PNG kecil
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 500, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrB64 = "data:image/png;base64," + qrBuf.toString("base64");

  const namaDisplay = nama.length > 20 ? nama.slice(0, 18) + "..." : nama;
  const arena = CONFIG.NAMA_ARENA;

  // 2. Buat SVG branded 800x800
  const svg = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' width="800" height="800" viewBox="0 0 800 800">'
    + '<rect width="800" height="800" fill="#0d1b2e"/>'
    + '<circle cx="800" cy="800" r="350" fill="#0a1f1a" opacity=".4"/>'
    + '<circle cx="0" cy="0" r="200" fill="#0a1a0f" opacity=".25"/>'
    // Header
    + '<rect x="0" y="0" width="800" height="130" fill="#14532d"/>'
    + '<rect x="0" y="127" width="800" height="4" fill="#22c55e" opacity=".8"/>'
    + '<rect x="0" y="127" width="100" height="4" fill="#22c55e"/>'
    // Icon billiard
    + '<circle cx="52" cy="65" r="34" fill="#111" stroke="#22c55e" stroke-width="2.5"/>'
    + '<circle cx="42" cy="55" r="10" fill="#fff" opacity=".9"/>'
    + '<circle cx="52" cy="65" r="4" fill="#333" opacity=".5"/>'
    // Nama arena
    + '<text x="100" y="60"'
    + ' font-family="Poppins,DejaVu Sans,Liberation Sans,sans-serif"'
    + ' font-size="30" font-weight="700" fill="#ffffff">' + esc(arena) + '</text>'
    + '<text x="100" y="90"'
    + ' font-family="Poppins,DejaVu Sans,Liberation Sans,sans-serif"'
    + ' font-size="14" fill="#86efac" letter-spacing="3" font-weight="600">MEMBER CARD</text>'
    // QR area
    + '<rect x="152" y="147" width="504" height="504" rx="20" fill="#000" opacity=".3"/>'
    + '<rect x="148" y="143" width="504" height="504" rx="20" fill="#ffffff"/>'
    + '<image href="' + qrB64 + '" x="154" y="149" width="492" height="492"/>'
    // Logo center
    + '<rect x="376" y="371" width="48" height="48" rx="8" fill="#fff" stroke="#e5e7eb" stroke-width="1"/>'
    + '<circle cx="400" cy="395" r="17" fill="#0d1b2e" stroke="#22c55e" stroke-width="2"/>'
    + '<circle cx="393" cy="388" r="5" fill="#fff" opacity=".85"/>'
    // Member info
    + '<line x1="80" y1="668" x2="720" y2="668" stroke="#1e3a30" stroke-width="1.5"/>'
    + '<text x="400" y="708"'
    + ' font-family="Poppins,DejaVu Sans,Liberation Sans,sans-serif"'
    + ' font-size="28" font-weight="700" fill="#e8edf5" text-anchor="middle">' + esc(namaDisplay) + '</text>'
    + '<text x="400" y="744"'
    + ' font-family="DejaVu Sans Mono,Liberation Mono,monospace"'
    + ' font-size="18" fill="#22c55e" text-anchor="middle" letter-spacing="3">' + esc(kode) + '</text>'
    // Footer
    // Footer dengan instruksi dan tagline
    + '<rect x="0" y="760" width="800" height="40" fill="#071210"/>'
    + '<text x="400" y="778"'
    + ' font-family="Poppins,DejaVu Sans,Liberation Sans,sans-serif"'
    + ' font-size="14" fill="#22c55e" text-anchor="middle" font-weight="600">'
    + 'Tunjukkan ke kasir setiap mau main billiard</text>'
    + '<text x="400" y="796"'
    + ' font-family="Poppins,DejaVu Sans,Liberation Sans,sans-serif"'
    + ' font-size="11" fill="#1e3a30" text-anchor="middle">'
    + '10x main = 1x GRATIS · ' + esc(CONFIG.NAMA_ARENA) + '</text>'
    + '</svg>';

  // 3. Convert SVG → PNG via sharp
  // sharp butuh font tersedia di system untuk render teks
  // Liberation Sans tersedia di Railway (Ubuntu/Debian base)
  const sharp = (await import("sharp")).default;
  const pngBuf = await sharp(Buffer.from(svg, "utf8"), {
    density: 96,  // DPI untuk render SVG
  })
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
