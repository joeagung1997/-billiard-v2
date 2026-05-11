// src/routes/share.js
// ── Route publik: WA thumbnail via Open Graph ─────────────────

import { Router }             from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl, buildBaseUrl } from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import QRCode                 from "qrcode";

const router = Router();

// ── Helper: buat PNG branded untuk WA thumbnail ───────────────
// Teknik: generate SVG lengkap dengan QR embedded sebagai base64 PNG,
// lalu serve sebagai image/svg+xml dengan header yang tepat.
// WA modern (2023+) support SVG sebagai og:image.
// Untuk WA yang tidak support SVG, fallback ke QR PNG polos.
async function makeBrandedPng(scanUrl, nama, kode) {
  // 1. Generate QR sebagai PNG → base64
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 500, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrB64 = "data:image/png;base64," + qrBuf.toString("base64");

  // 2. Potong nama jika terlalu panjang
  const namaDisplay = nama.length > 20 ? nama.slice(0, 18) + "..." : nama;
  const arena = CONFIG.NAMA_ARENA;

  // 3. Escape untuk SVG
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // 4. Buat SVG 800x800 dengan QR + branding
  // Ukuran square 800x800 — paling kompatibel untuk WA thumbnail
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
    '  width="800" height="800" viewBox="0 0 800 800">',

    // Background gelap
    '<rect width="800" height="800" fill="#0d1b2e"/>',

    // Dekorasi lingkaran
    '<circle cx="800" cy="800" r="350" fill="#0a1f1a" opacity=".4"/>',
    '<circle cx="0"   cy="0"   r="200" fill="#0a1a0f" opacity=".25"/>',

    // ── Header ──────────────────────────────────────────────
    '<rect x="0" y="0" width="800" height="130" fill="#14532d"/>',
    // Garis aksen bawah header
    '<rect x="0" y="127" width="800" height="4" fill="#22c55e" opacity=".8"/>',
    '<rect x="0" y="127" width="100" height="4" fill="#22c55e"/>',

    // Icon billiard (shape SVG — tidak pakai emoji)
    '<circle cx="52" cy="65" r="34" fill="#111" stroke="#22c55e" stroke-width="2.5"/>',
    '<circle cx="42" cy="55" r="10" fill="#fff" opacity=".9"/>',
    '<circle cx="52" cy="65" r="4"  fill="#333" opacity=".5"/>',

    // Nama arena
    '<text x="100" y="55"',
    '  font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"',
    '  font-size="30" font-weight="700" fill="#ffffff">' + esc(arena) + '</text>',

    // Label MEMBER CARD
    '<text x="100" y="85"',
    '  font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"',
    '  font-size="14" fill="#86efac" letter-spacing="3" font-weight="600">MEMBER CARD</text>',

    // ── QR Area ─────────────────────────────────────────────
    // Shadow
    '<rect x="152" y="147" width="504" height="504" rx="20" fill="#000" opacity=".3"/>',
    // White card
    '<rect x="148" y="143" width="504" height="504" rx="20" fill="#ffffff"/>',
    // QR image
    '<image href="' + qrB64 + '" x="154" y="149" width="492" height="492"/>',

    // Logo overlay tengah
    '<rect x="376" y="371" width="48" height="48" rx="8" fill="#fff" stroke="#e5e7eb" stroke-width="1"/>',
    '<circle cx="400" cy="395" r="17" fill="#0d1b2e" stroke="#22c55e" stroke-width="2"/>',
    '<circle cx="393" cy="388" r="5" fill="#fff" opacity=".85"/>',

    // ── Member info ──────────────────────────────────────────
    // Garis divider
    '<line x1="80" y1="672" x2="720" y2="672" stroke="#1e3a30" stroke-width="1.5"/>',

    // Nama member
    '<text x="400" y="712"',
    '  font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"',
    '  font-size="28" font-weight="700" fill="#e8edf5" text-anchor="middle">' + esc(namaDisplay) + '</text>',

    // Kode member
    '<text x="400" y="748"',
    '  font-family="Courier New,Courier,monospace"',
    '  font-size="18" fill="#22c55e" text-anchor="middle" letter-spacing="3" font-weight="600">' + esc(kode) + '</text>',

    // Footer instruksi
    '<rect x="0" y="772" width="800" height="28" fill="#0a1422"/>',
    '<text x="400" y="791"',
    '  font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"',
    '  font-size="13" fill="#2a4a40" text-anchor="middle" letter-spacing="1.5">',
    '  Scan QR ini untuk check-in di ' + esc(arena) + '</text>',

    // Border kartu
    '<rect x="1" y="1" width="798" height="798" rx="0"',
    '  fill="none" stroke="#22c55e" stroke-width="2" opacity=".2"/>',

    '</svg>',
  ].join('\n');

  return Buffer.from(svg, "utf8");
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
    + '<meta property="og:type"              content="website">'
    + '<meta property="og:url"               content="' + scanUrl + '">'
    + '<meta property="og:title"             content="' + title + '">'
    + '<meta property="og:description"       content="' + desc + '">'
    + '<meta property="og:image"             content="' + ogImgUrl + '">'
    + '<meta property="og:image:secure_url"  content="' + ogImgUrl + '">'
    + '<meta property="og:image:type"        content="image/png">'
    + '<meta property="og:image:width"       content="800">'
    + '<meta property="og:image:height"      content="800">'
    + '<meta property="og:image:alt"         content="QR ' + member.nama + '">'
    + '<meta property="og:site_name"         content="' + CONFIG.NAMA_ARENA + '">'
    + '<meta name="twitter:card"             content="summary_large_image">'
    + '<meta name="twitter:title"            content="' + title + '">'
    + '<meta name="twitter:description"      content="' + desc + '">'
    + '<meta name="twitter:image"            content="' + ogImgUrl + '">'
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

// ── GET /og-image/:kode — branded PNG/SVG untuk WA thumbnail ─
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    const ua      = req.get("user-agent") || "";
    console.log("[OG] ua:", ua.slice(0, 60), "| kode:", kode);

    const svgBuf = await makeBrandedPng(scanUrl, member.nama, kode);

    // Serve sebagai SVG — WA, Telegram, dan browser modern semua support
    // Content-Type image/svg+xml agar browser render sebagai gambar
    res
      .status(200)
      .setHeader("Content-Type", "image/svg+xml")
      .setHeader("Content-Length", svgBuf.length)
      .setHeader("Cache-Control", "no-cache")
      .setHeader("Access-Control-Allow-Origin", "*")
      .end(svgBuf);

    console.log("[OG] SVG branded served:", svgBuf.length, "bytes");
  } catch (err) {
    console.error("[OG] Error:", err.message);
    // Fallback: QR PNG polos
    try {
      const scanUrl = buildScanUrl(req, kode);
      const pngBuf  = await QRCode.toBuffer(scanUrl, {
        type: "png", width: 600, margin: 3,
        color: { dark: "#000000", light: "#ffffff" },
      });
      res.setHeader("Content-Type", "image/png")
         .setHeader("Cache-Control", "no-cache")
         .end(pngBuf);
    } catch {
      res.status(500).end();
    }
  }
});

// ── GET /og-debug/:kode — halaman debug ──────────────────────
router.get("/og-debug/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  const base   = buildBaseUrl(req);
  res.send(
    '<html><head><meta charset="UTF-8"><title>OG Debug</title></head>'
    + '<body style="background:#070d18;color:#e8edf5;font-family:sans-serif;padding:20px">'
    + '<h2 style="color:#22c55e;margin-bottom:16px">OG Debug — ' + kode + '</h2>'
    + '<p style="color:#8496b0;font-size:13px;margin-bottom:12px">Member: '
    + (member ? member.nama : '<span style="color:#ef4444">NOT FOUND</span>') + '</p>'
    + '<p style="color:#8496b0;font-size:13px;margin-bottom:6px">URL share WA:</p>'
    + '<code style="color:#22c55e;font-size:12px">' + base + '/member/' + kode + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 6px">Preview gambar (harus branded):</p>'
    + '<img src="/og-image/' + kode + '" style="max-width:400px;border-radius:8px;border:2px solid #1e2d45">'
    + '</body></html>'
  );
});

export default router;
