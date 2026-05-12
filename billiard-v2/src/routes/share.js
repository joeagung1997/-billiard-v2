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
// Pure sharp + SVG shapes — zero text, zero font dependency
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;

  const W = 800, H = 800;

  // 1. QR dengan warna navy (branded, bukan hitam polos)
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#0d2137", light: "#ffffff" },
  });

  // 2. Semua elemen sebagai SVG shapes (BUKAN text) atau sharp buffers
  // SVG shapes pasti render — tidak butuh font

  // Header hijau dengan pola dekorasi
  const headerSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="120">'
    // Background
    + '<rect width="800" height="120" fill="#14532d"/>'
    // Pola garis diagonal dekorasi
    + '<line x1="600" y1="0" x2="800" y2="120" stroke="#ffffff" stroke-width="1" opacity=".06"/>'
    + '<line x1="650" y1="0" x2="800" y2="60"  stroke="#ffffff" stroke-width="1" opacity=".04"/>'
    + '<line x1="680" y1="0" x2="800" y2="40"  stroke="#ffffff" stroke-width="1" opacity=".03"/>'
    // Icon billiard
    + '<circle cx="52" cy="60" r="36" fill="#0a1a0f" stroke="#22c55e" stroke-width="2.5"/>'
    + '<circle cx="52" cy="60" r="25" fill="#111"/>'
    + '<circle cx="42" cy="50" r="10" fill="#fff" opacity=".92"/>'
    + '<circle cx="52" cy="60" r="5"  fill="#333" opacity=".7"/>'
    + '<rect x="18" y="55" width="68" height="9" fill="#22c55e" opacity=".4" rx="3"/>'
    // 3 titik dekorasi kanan
    + '<circle cx="720" cy="30" r="5" fill="#22c55e" opacity=".4"/>'
    + '<circle cx="740" cy="50" r="3" fill="#22c55e" opacity=".3"/>'
    + '<circle cx="760" cy="25" r="4" fill="#22c55e" opacity=".25"/>'
    // Bar nama arena — blok hijau tua (pengganti teks)
    + '<rect x="100" y="32" width="480" height="28" rx="4" fill="#0d3320" opacity=".6"/>'
    + '<rect x="100" y="32" width="380" height="28" rx="4" fill="#0f4030" opacity=".5"/>'
    // Dots menyerupai teks (hint nama)
    + '<rect x="108" y="40" width="8"  height="12" rx="2" fill="#86efac" opacity=".7"/>'
    + '<rect x="122" y="40" width="60" height="12" rx="2" fill="#86efac" opacity=".5"/>'
    + '<rect x="188" y="40" width="8"  height="12" rx="2" fill="#86efac" opacity=".7"/>'
    + '<rect x="202" y="40" width="50" height="12" rx="2" fill="#86efac" opacity=".5"/>'
    + '<rect x="258" y="40" width="8"  height="12" rx="2" fill="#86efac" opacity=".7"/>'
    // Bar sub label
    + '<rect x="100" y="72" width="160" height="14" rx="3" fill="#22c55e" opacity=".3"/>'
    + '<rect x="108" y="76" width="120" height="6"  rx="2" fill="#86efac" opacity=".4"/>'
    + '</svg>'
  );

  // Aksen garis bawah header
  const accentSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="5">'
    + '<rect width="800" height="5" fill="#22c55e" opacity=".7"/>'
    + '<rect width="100" height="5" fill="#86efac"/>'
    + '</svg>'
  );

  // White card untuk QR
  const qrCardBuf = await sharp({
    create: { width: 544, height: 544, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).composite([
    { input: await sharp(qrBuf).resize(520, 520).toBuffer(), top: 12, left: 12 }
  ]).png().toBuffer();

  // Logo billiard center
  const logoSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">'
    + '<rect width="52" height="52" rx="8" fill="#fff" stroke="#d1d5db" stroke-width="1.5"/>'
    + '<circle cx="26" cy="26" r="18" fill="#0d1b2e" stroke="#22c55e" stroke-width="2.5"/>'
    + '<circle cx="19" cy="19" r="6"  fill="#fff" opacity=".88"/>'
    + '<rect x="10" y="23" width="32" height="5" fill="#22c55e" opacity=".45" rx="2"/>'
    + '</svg>'
  );

  // Info area bawah QR — navy dengan stripe hijau dekoratif
  const infoSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="126">'
    + '<rect width="800" height="126" fill="#0a1728"/>'
    // Divider tipis
    + '<rect width="680" height="2" x="60" fill="#1e3a30"/>'
    // Blok visual nama (pengganti teks) — lebih rapi
    + '<rect x="100" y="20" width="600" height="36" rx="6" fill="#0f2035" opacity=".8"/>'
    + '<rect x="108" y="28" width="10" height="20" rx="3" fill="#e8edf5" opacity=".5"/>'
    + '<rect x="124" y="28" width="180" height="20" rx="3" fill="#e8edf5" opacity=".4"/>'
    + '<rect x="312" y="28" width="10" height="20" rx="3" fill="#e8edf5" opacity=".3"/>'
    + '<rect x="328" y="28" width="120" height="20" rx="3" fill="#e8edf5" opacity=".35"/>'
    // Blok kode member
    + '<rect x="220" y="68" width="360" height="26" rx="5" fill="#0d3320" opacity=".8"/>'
    + '<rect x="228" y="74" width="40" height="14" rx="3" fill="#22c55e" opacity=".5"/>'
    + '<rect x="276" y="74" width="8"  height="14" rx="2" fill="#22c55e" opacity=".4"/>'
    + '<rect x="292" y="74" width="60" height="14" rx="3" fill="#22c55e" opacity=".45"/>'
    + '<rect x="360" y="74" width="8"  height="14" rx="2" fill="#22c55e" opacity=".4"/>'
    + '<rect x="376" y="74" width="40" height="14" rx="3" fill="#22c55e" opacity=".5"/>'
    + '<rect x="424" y="74" width="8"  height="14" rx="2" fill="#22c55e" opacity=".3"/>'
    + '<rect x="440" y="74" width="30" height="14" rx="3" fill="#22c55e" opacity=".4"/>'
    + '</svg>'
  );

  // Footer
  const footerSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="42">'
    + '<rect width="800" height="42" fill="#071210"/>'
    // Visual bar footer
    + '<rect x="60"  y="14" width="280" height="8" rx="4" fill="#22c55e" opacity=".25"/>'
    + '<rect x="460" y="14" width="280" height="8" rx="4" fill="#22c55e" opacity=".2"/>'
    + '<rect x="340" y="12" width="120" height="12" rx="4" fill="#22c55e" opacity=".35"/>'
    // Aksen bawah
    + '<rect x="0" y="39" width="800" height="3" fill="#22c55e" opacity=".4"/>'
    + '</svg>'
  );

  // 3. Composite semua
  const result = await sharp({
    create: { width: W, height: H, channels: 4,
      background: { r: 13, g: 27, b: 46, alpha: 1 } }
  }).composite([
    { input: headerSvg,  top: 0,   left: 0 },
    { input: accentSvg,  top: 117, left: 0 },
    { input: qrCardBuf,  top: 128, left: 128 },
    { input: logoSvg,    top: 374, left: 374 },
    { input: infoSvg,    top: 672, left: 0 },
    { input: footerSvg,  top: 758, left: 0 },
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
