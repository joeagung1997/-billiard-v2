// src/routes/share.js
// ── Route publik: WA thumbnail via Open Graph ─────────────────
//
// CARA KERJA WA:
// 1. Copy URL /member/:kode → paste di WA
// 2. WA crawler GET /member/:kode → baca og:image URL
// 3. WA crawler GET /og-image/:kode → dapat PNG → tampil sebagai thumbnail
// 4. User klik → redirect ke /scan?id=:kode
//
// SYARAT WA THUMBNAIL:
// - og:image harus return Content-Type: image/png atau image/jpeg
// - Tidak boleh ada redirect di /og-image
// - URL harus bisa diakses publik (tanpa auth)
// - Ukuran minimal 200x200, ideal 800x800 atau 1200x630

import { Router }             from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl }       from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import QRCode                 from "qrcode";

const router = Router();

// ── GET /member/:kode — halaman OG untuk WA crawler ──────────
router.get("/member/:kode", (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);

  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = req.protocol + "://" + req.get("host");
  const scanUrl  = base + "/scan?id=" + kode;
  const ogImgUrl = base + "/og-image/" + kode;
  const title    = CONFIG.NAMA_ARENA + " — " + member.nama;
  const desc     = "Kartu member " + CONFIG.NAMA_ARENA
    + ". Tunjukkan QR ini ke kasir untuk check-in. Kode: " + kode;

  // Penting: response harus 200 OK, bukan redirect
  // WA crawler tidak ikuti redirect untuk halaman OG
  res.status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(
      '<!DOCTYPE html>'
      + '<html prefix="og: http://ogp.me/ns#" lang="id">'
      + '<head>'
      + '<meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'

      // ── Open Graph ─────────────────────────────────────────
      + '<meta property="og:type"         content="website">'
      + '<meta property="og:url"          content="' + scanUrl + '">'
      + '<meta property="og:title"        content="' + title + '">'
      + '<meta property="og:description"  content="' + desc + '">'
      + '<meta property="og:image"        content="' + ogImgUrl + '">'
      + '<meta property="og:image:secure_url" content="' + ogImgUrl + '">'
      + '<meta property="og:image:type"   content="image/png">'
      + '<meta property="og:image:width"  content="800">'
      + '<meta property="og:image:height" content="800">'
      + '<meta property="og:image:alt"    content="QR Code ' + member.nama + '">'
      + '<meta property="og:site_name"    content="' + CONFIG.NAMA_ARENA + '">'

      // ── Twitter/X ──────────────────────────────────────────
      + '<meta name="twitter:card"        content="summary_large_image">'
      + '<meta name="twitter:title"       content="' + title + '">'
      + '<meta name="twitter:description" content="' + desc + '">'
      + '<meta name="twitter:image"       content="' + ogImgUrl + '">'

      + '<title>' + title + '</title>'
      + '</head>'
      + '<body style="margin:0;background:#070d18;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif">'
      + '<div style="text-align:center;padding:20px">'
      + '<p style="color:#4a5e78;font-size:14px">Mengalihkan...</p>'
      + '<p style="margin-top:12px"><a href="' + scanUrl + '" style="color:#22c55e;font-size:13px">Klik di sini jika tidak otomatis</a></p>'
      + '</div>'
      + '<script>setTimeout(function(){window.location.href="' + scanUrl + '"},100);</script>'
      + '</body></html>'
    );
});

// ── GET /og-image/:kode — PNG untuk og:image ──────────────────
// HARUS: return image/png langsung, NO redirect, NO auth
// WA crawl URL ini dan hasilnya jadi thumbnail
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);

  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);

    // Generate QR PNG 800x800 — WA terima square
    // Gunakan warna hitam di putih agar QR bisa terbaca
    const pngBuf = await QRCode.toBuffer(scanUrl, {
      errorCorrectionLevel: "H",  // High — tahan noise
      type:   "png",
      width:  800,
      margin: 4,
      color:  { dark: "#0d1b2e", light: "#ffffff" },
    });

    // Header yang WA butuhkan
    res
      .status(200)
      .setHeader("Content-Type", "image/png")
      .setHeader("Content-Length", pngBuf.length)
      .setHeader("Cache-Control", "public, max-age=86400")
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("X-Content-Type-Options", "nosniff")
      .end(pngBuf);

    console.log("[OG] PNG 800x800 served untuk " + kode + " (" + pngBuf.length + " bytes)");
  } catch (err) {
    console.error("[OG] Error:", err.message);
    res.status(500).end();
  }
});

// ── GET /og-debug/:kode — debug endpoint ─────────────────────
// Buka di browser untuk cek apakah semua OK sebelum test di WA
router.get("/og-debug/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  const base   = req.protocol + "://" + req.get("host");

  const checks = [
    { label: "Member ditemukan", ok: !!member, val: member ? member.nama : "NOT FOUND" },
    { label: "/member/:kode URL", ok: true, val: base + "/member/" + kode },
    { label: "/og-image/:kode URL", ok: true, val: base + "/og-image/" + kode },
    { label: "Test image URL (buka di browser)", ok: true, val: base + "/og-image/" + kode },
  ];

  const rows = checks.map(c =>
    '<tr style="border-bottom:1px solid #1e2d45">'
    + '<td style="padding:10px;color:#8496b0">' + c.label + '</td>'
    + '<td style="padding:10px">'
    + '<span style="color:' + (c.ok ? '#22c55e' : '#ef4444') + '">'
    + (c.ok ? '✓ ' : '✗ ') + c.val + '</span></td></tr>'
  ).join('');

  res.send(
    '<html><head><meta charset="UTF-8"><title>OG Debug</title></head>'
    + '<body style="background:#070d18;color:#e8edf5;font-family:sans-serif;padding:20px">'
    + '<h2 style="color:#22c55e;margin-bottom:16px">OG Debug — ' + kode + '</h2>'
    + '<table style="border-collapse:collapse;width:100%;max-width:700px">' + rows + '</table>'
    + '<div style="margin-top:20px">'
    + '<p style="color:#8496b0;font-size:13px;margin-bottom:10px">Test gambar (harus muncul PNG):</p>'
    + '<img src="/og-image/' + kode + '" style="max-width:300px;border:2px solid #1e2d45;border-radius:8px">'
    + '</div>'
    + '<div style="margin-top:20px;padding:14px;background:#0d1829;border-radius:8px;max-width:700px">'
    + '<p style="color:#8496b0;font-size:13px;margin-bottom:8px">Cara test WA thumbnail:</p>'
    + '<p style="color:#4a5e78;font-size:12px">1. Pastikan gambar muncul di atas (PNG terload)</p>'
    + '<p style="color:#4a5e78;font-size:12px">2. Copy URL ini: <a href="/member/' + kode + '" style="color:#3b82f6">' + base + '/member/' + kode + '</a></p>'
    + '<p style="color:#4a5e78;font-size:12px">3. Paste di WA → thumbnail harus muncul dalam 2-3 detik</p>'
    + '<p style="color:#4a5e78;font-size:12px">4. Jika tidak muncul, cek di: <a href="https://developers.facebook.com/tools/debug/" target="_blank" style="color:#3b82f6">Facebook Debugger</a></p>'
    + '</div>'
    + '</body></html>'
  );
});

export default router;
