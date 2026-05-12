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

// ── Cloudinary URL dengan overlay teks ───────────────────────
// Cloudinary render teks langsung via URL — tidak butuh font di server
function makeCloudinaryUrl(nama, kode) {
  const CLOUD = "dlxazwdbu";
  const BASE  = "billiard-bg_k0I8pg";   // public_id dari Cloudinary

  const enc = (t) => encodeURIComponent(String(t ?? ""))
    .replace(/,/g, "%2C").replace(/\//g, "%2F");

  const arena    = enc(CONFIG.NAMA_ARENA);
  const namaDisp = enc(nama.length > 20 ? nama.slice(0, 18) + "..." : nama);
  const kodeDisp = enc(kode);
  const footer   = enc("Tunjukkan ke kasir setiap mau main");

  // Posisi teks disesuaikan dengan layout baru:
  // Header 120px (y_30-y_90), Footer 120px dari bawah (y_30-y_90)
  const tr = [
    "w_800,h_800,c_fill",
    // Nama arena — di tengah header (y=60 dari atas)
    "l_text:DejaVu%20Sans_32_bold:" + arena + ",co_white,g_north,y_30",
    // Label MEMBER CARD kecil
    "l_text:DejaVu%20Sans_13:" + enc("MEMBER CARD") + ",co_rgb:86efac,g_north,y_78",
    // Nama member — di footer, tengah (y=50 dari bawah)
    "l_text:DejaVu%20Sans_30_bold:" + namaDisp + ",co_rgb:e8edf5,g_south,y_80",
    // Kode member
    "l_text:DejaVu%20Sans_18:" + kodeDisp + ",co_rgb:22c55e,g_south,y_44",
    // Footer instruksi
    "l_text:DejaVu%20Sans_12:" + footer + ",co_rgb:86efac,g_south,y_18",
  ].join("/");

  return "https://res.cloudinary.com/" + CLOUD + "/image/upload/" + tr + "/" + BASE;
}

// ── Helper: escape SVG ────────────────────────────────────────
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Helper: buat QR PNG dengan frame warna solid ─────────────
// Tidak ada teks, tidak ada font — hanya warna dan QR
// QR dengan warna navy + border hijau = branded tapi simple
async function makeBrandedPng(scanUrl, nama, kode) {
  const sharp = (await import("sharp")).default;

  // QR 540x540 warna navy
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 540, margin: 2,
    color: { dark: "#0d2137", light: "#ffffff" },
  });

  // Canvas 800x800 dengan ruang header/footer untuk teks Cloudinary:
  // 120px atas = area nama arena (hijau gelap)
  // 560px tengah = QR putih
  // 120px bawah = area nama member + kode (hijau gelap)
  const result = await sharp({
    create: { width: 800, height: 800, channels: 4,
      background: { r: 14, g: 53, b: 45, alpha: 1 } }
  }).composite([
    // Area QR putih
    { input: await sharp({ create: { width: 560, height: 560, channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } }
      }).png().toBuffer(), top: 120, left: 120 },
    // QR di dalam area putih
    { input: await sharp(qrBuf).toBuffer(), top: 130, left: 130 },
    // Garis aksen hijau bawah header
    { input: await sharp({ create: { width: 800, height: 4, channels: 4,
        background: { r: 34, g: 197, b: 94, alpha: 1 } }
      }).png().toBuffer(), top: 118, left: 0 },
    // Garis aksen hijau atas footer
    { input: await sharp({ create: { width: 800, height: 4, channels: 4,
        background: { r: 34, g: 197, b: 94, alpha: 1 } }
      }).png().toBuffer(), top: 678, left: 0 },
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
// Redirect ke Cloudinary yang handle overlay teks
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.status(404).end();

  // Cek apakah billiard-bg sudah diupload ke Cloudinary
  // Jika ya: redirect ke Cloudinary URL dengan overlay teks
  // Jika tidak: fallback ke QR PNG dari server
  const cdnUrl = makeCloudinaryUrl(member.nama, kode);

  // Cek Cloudinary dulu — jika base image ada, redirect ke sana
  // Jika tidak, serve QR PNG lokal sebagai fallback
  try {
    const https = (await import("https")).default;
    await new Promise((resolve, reject) => {
      https.get(cdnUrl, (r) => {
        if (r.statusCode === 200) resolve();
        else reject(new Error("CDN " + r.statusCode));
      }).on("error", reject);
    });
    // Cloudinary OK — redirect
    res.redirect(302, cdnUrl);
    console.log("[OG] Cloudinary redirect OK");
  } catch {
    // Fallback: serve QR PNG lokal
    const scanUrl = buildScanUrl(req, kode);
    const pngBuf  = await makeBrandedPng(scanUrl, member.nama, kode);
    res.setHeader("Content-Type", "image/png")
       .setHeader("Cache-Control", "public, max-age=3600")
       .end(pngBuf);
    console.log("[OG] Fallback QR lokal OK");
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
