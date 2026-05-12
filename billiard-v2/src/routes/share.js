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
// Pakai sharp text input (Pango) — tidak butuh librsvg/font-face
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;

  const W = 800, H = 800;
  const namaDisplay = nama.length > 20 ? nama.slice(0, 18) + "..." : nama;
  const arena = CONFIG.NAMA_ARENA;

  // 1. Generate QR PNG
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // 2. Helper buat teks PNG via sharp text (Pango) — pasti render di Railway
  const makeTxt = async (text, { size, color, bold, width, height, align }) => {
    try {
      const pango = bold
        ? "<b>" + text.replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</b>"
        : text.replace(/&/g,"&amp;").replace(/</g,"&lt;");
      return await sharp({
        text: {
          text:     '<span font_desc="DejaVu Sans ' + size + '">' + pango + '</span>',
          font:     "DejaVu Sans",
          fontfile: "/usr/share/fonts/truetype/dejavu/DejaVuSans" + (bold ? "-Bold" : "") + ".ttf",
          width:    width  || 700,
          height:   height || (size + 16),
          rgba:     true,
          align:    align || "left",
        }
      }).png().toBuffer();
    } catch {
      // Fallback: transparent pixel
      return await sharp({ create: { width: 1, height: 1, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } }).png().toBuffer();
    }
  };

  // 3. Buat semua layer teks
  const [txtArena, txtCard, txtNama, txtKode, txtFooter1, txtFooter2] = await Promise.all([
    makeTxt(arena,    { size: 28, bold: true,  color: "#ffffff", width: 600, height: 44, align: "left" }),
    makeTxt("MEMBER CARD", { size: 13, bold: false, color: "#86efac", width: 300, height: 24, align: "left" }),
    makeTxt(namaDisplay, { size: 28, bold: true, color: "#e8edf5", width: 700, height: 46, align: "center" }),
    makeTxt(kode,     { size: 18, bold: true,  color: "#22c55e", width: 400, height: 32, align: "center" }),
    makeTxt("Tunjukkan ke kasir setiap mau main billiard", { size: 13, bold: true, color: "#22c55e", width: 700, height: 24, align: "center" }),
    makeTxt("10x kunjungan = 1x GRATIS  \u00B7  " + arena, { size: 11, bold: false, color: "#4a7060", width: 700, height: 20, align: "center" }),
  ]);

  // 4. Composite semua layer ke canvas utama
  const result = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 13, g: 27, b: 46, alpha: 1 } }
  }).composite([
    // ── Background dekorasi ───────────────────────────────
    { input: await sharp({ create: { width: W, height: 120, channels: 4, background: { r: 20, g: 83, b: 45, alpha: 1 } } }).png().toBuffer(), top: 0, left: 0 },
    { input: await sharp({ create: { width: W, height: 4, channels: 4, background: { r: 34, g: 197, b: 94, alpha: 1 } } }).png().toBuffer(), top: 117, left: 0 },

    // ── Icon billiard (lingkaran shape) ───────────────────
    { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70"><circle cx="35" cy="35" r="32" fill="#0a1a0f" stroke="#22c55e" stroke-width="2.5"/><circle cx="35" cy="35" r="22" fill="#111"/><circle cx="27" cy="27" r="9" fill="#fff" opacity=".9"/><circle cx="35" cy="35" r="4" fill="#333" opacity=".6"/><rect x="8" y="31" width="54" height="8" fill="#22c55e" opacity=".4" rx="2"/></svg>'), top: 25, left: 18 },

    // ── Teks header ───────────────────────────────────────
    { input: txtArena, top: 30, left: 100, blend: "over" },
    { input: txtCard,  top: 82, left: 100, blend: "over" },

    // ── QR card ───────────────────────────────────────────
    { input: await sharp({ create: { width: 528, height: 528, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.3 } } }).png().toBuffer(), top: 135, left: 140 },
    { input: await sharp({ create: { width: 524, height: 524, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer(), top: 132, left: 138 },
    { input: await sharp(qrBuf).resize(504, 504).toBuffer(), top: 142, left: 148 },

    // ── Logo center QR ────────────────────────────────────
    { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="8" fill="#fff" stroke="#e5e7eb" stroke-width="1.5"/><circle cx="22" cy="22" r="14" fill="#0d1b2e" stroke="#22c55e" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#fff" opacity=".85"/></svg>'), top: 372, left: 378 },

    // ── Divider ───────────────────────────────────────────
    { input: await sharp({ create: { width: 680, height: 2, channels: 4, background: { r: 30, g: 58, b: 48, alpha: 1 } } }).png().toBuffer(), top: 668, left: 60 },

    // ── Teks member info ──────────────────────────────────
    { input: txtNama,  top: 682, left: 50, blend: "over" },
    { input: txtKode,  top: 722, left: 200, blend: "over" },

    // ── Footer ────────────────────────────────────────────
    { input: await sharp({ create: { width: W, height: 44, channels: 4, background: { r: 7, g: 18, b: 16, alpha: 1 } } }).png().toBuffer(), top: 756, left: 0 },
    { input: txtFooter1, top: 758, left: 50, blend: "over" },
    { input: txtFooter2, top: 778, left: 50, blend: "over" },
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
