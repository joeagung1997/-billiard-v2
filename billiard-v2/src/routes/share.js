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
// Pakai ImageMagick (tersedia di Railway) — render teks dengan font TTF
async function makeBrandedPng(scanUrl, nama, kode) {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFile, readFile, unlink } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const path = await import("path");
  const execFileAsync = promisify(execFile);
  const sharp = (await import("sharp")).default;

  const W = 800, H = 800;
  const namaDisplay = nama.length > 20 ? nama.slice(0, 18) + "..." : nama;
  const arena = CONFIG.NAMA_ARENA;

  const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const FONT_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";

  // Generate QR PNG → simpan ke tmp file
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 504, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const tmpId   = Date.now() + "_" + Math.random().toString(36).slice(2);
  const qrPath  = path.join(tmpdir(), "qr_" + tmpId + ".png");
  const outPath = path.join(tmpdir(), "og_" + tmpId + ".png");

  await writeFile(qrPath, qrBuf);

  try {
    // ImageMagick composite command
    const args = [
      // Canvas 800x800 background navy
      "-size", "800x800", "xc:#0d1b2e",

      // Dekorasi lingkaran kanan bawah
      "-fill", "#0a1f1a", "-stroke", "none",
      "-draw", "circle 800,800 800,480",

      // Header hijau
      "-fill", "#14532d",
      "-draw", "rectangle 0,0 800,120",

      // Aksen garis bawah header
      "-fill", "#22c55e",
      "-draw", "rectangle 0,117 800,121",
      "-draw", "rectangle 0,117 90,121",

      // Icon billiard — bola
      "-fill", "#0a1a0f", "-stroke", "#22c55e", "-strokewidth", "2",
      "-draw", "circle 52,60 52,87",
      "-fill", "#111111", "-stroke", "none",
      "-draw", "circle 52,60 52,81",
      "-fill", "#ffffff",
      "-draw", "circle 43,51 43,59",
      "-fill", "#333333",
      "-draw", "circle 52,60 52,64",
      // Strip bola
      "-fill", "#22c55e", "-alpha", "set",
      "-draw", "rectangle 22,55 82,62",

      // Nama arena
      "-font", FONT_BOLD, "-pointsize", "30",
      "-fill", "#ffffff",
      "-annotate", "+100+68", arena,

      // Label MEMBER CARD
      "-font", FONT_REG, "-pointsize", "14",
      "-fill", "#86efac",
      "-annotate", "+100+92", "MEMBER CARD",

      // QR white card background
      "-fill", "#ffffff", "-stroke", "#e5e7eb", "-strokewidth", "1",
      "-draw", "roundrectangle 138,126 662,650 14,14",

      // Composite QR image
      qrPath, "-geometry", "+148+136", "-composite",

      // Logo center QR
      "-fill", "#0d1b2e", "-stroke", "#22c55e", "-strokewidth", "2",
      "-draw", "circle 400,388 400,373",
      "-fill", "#ffffff", "-stroke", "none",
      "-draw", "circle 392,380 392,385",

      // Divider
      "-fill", "#1e3a30",
      "-draw", "rectangle 60,668 740,670",

      // Nama member
      "-font", FONT_BOLD, "-pointsize", "28",
      "-fill", "#e8edf5",
      "-gravity", "None",
      "-annotate", "+0+710", namaDisplay,

      // Kode member
      "-font", FONT_MONO, "-pointsize", "18",
      "-fill", "#22c55e",
      "-annotate", "+0+746", kode,

      // Footer background
      "-fill", "#071210",
      "-draw", "rectangle 0,758 800,800",

      // Footer teks
      "-font", FONT_BOLD, "-pointsize", "14",
      "-fill", "#22c55e",
      "-annotate", "+0+778", "Tunjukkan ke kasir setiap mau main billiard",

      "-font", FONT_REG, "-pointsize", "12",
      "-fill", "#4a7060",
      "-annotate", "+0+796", "10x kunjungan = 1x GRATIS  |  " + arena,

      outPath,
    ];

    // Untuk teks tengah (nama & kode), pakai gravity center
    // Kita split jadi 2 pass: background + QR dulu, lalu teks overlay
    const args1 = [
      "-size", "800x800", "xc:#0d1b2e",
      // Dekorasi
      "-fill", "#0a1f1a", "-stroke", "none",
      "-draw", "circle 800,800 800,480",
      // Header
      "-fill", "#14532d",
      "-draw", "rectangle 0,0 800,120",
      "-fill", "#22c55e",
      "-draw", "rectangle 0,117 800,121",
      "-draw", "rectangle 0,117 90,121",
      // Icon billiard
      "-fill", "#111111", "-stroke", "#22c55e", "-strokewidth", "2.5",
      "-draw", "circle 52,60 52,88",
      "-fill", "#0d0d0d", "-stroke", "none",
      "-draw", "circle 52,60 52,82",
      "-fill", "#ffffff",
      "-draw", "circle 43,51 43,60",
      "-fill", "#333",
      "-draw", "circle 52,60 52,64",
      // QR white card
      "-fill", "#ffffff", "-stroke", "none",
      "-draw", "roundrectangle 138,126 662,650 14,14",
      // QR
      qrPath, "-geometry", "+148+136", "-composite",
      // Logo center
      "-fill", "#0d1b2e", "-stroke", "#22c55e", "-strokewidth", "2",
      "-draw", "circle 400,388 400,374",
      "-fill", "#ffffff", "-stroke", "none",
      "-draw", "circle 392,381 392,386",
      // Divider
      "-fill", "#1e3a30",
      "-draw", "rectangle 60,668 740,670",
      // Footer background
      "-fill", "#071210",
      "-draw", "rectangle 0,758 800,800",
      // Teks header kiri
      "-font", FONT_BOLD, "-pointsize", "30", "-fill", "#ffffff",
      "-annotate", "+100+68", arena,
      "-font", FONT_REG, "-pointsize", "14", "-fill", "#86efac",
      "-annotate", "+100+92", "MEMBER CARD",
      // Teks footer
      "-font", FONT_BOLD, "-pointsize", "13", "-fill", "#22c55e",
      "-gravity", "South", "-annotate", "+0+26", "Tunjukkan ke kasir setiap mau main billiard",
      "-font", FONT_REG, "-pointsize", "11", "-fill", "#4a7060",
      "-gravity", "South", "-annotate", "+0+8", "10x kunjungan = 1x GRATIS  |  " + arena,
      // Teks center (nama & kode)
      "-font", FONT_BOLD, "-pointsize", "28", "-fill", "#e8edf5",
      "-gravity", "Center", "-annotate", "+0+130", namaDisplay,
      "-font", FONT_MONO, "-pointsize", "18", "-fill", "#22c55e",
      "-gravity", "Center", "-annotate", "+0+170", kode,
      outPath,
    ];

    await execFileAsync("convert", args1);
    const pngBuf = await readFile(outPath);
    return pngBuf;
  } finally {
    // Cleanup tmp files
    await unlink(qrPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
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
