// src/routes/share.js
// ── Route publik untuk share WA dengan OG preview ────────────
//
// Cara kerja:
// 1. Admin klik "Kirim WA" → URL yang dikirim: /member/:kode
// 2. WA crawler buka URL tersebut → baca meta og:image
// 3. og:image mengarah ke /og-image/:kode (PNG branded)
// 4. WA render preview dengan gambar kartu QR
// 5. Member klik link → redirect ke /scan?id=:kode

import { Router }       from "express";
import { readDB, findMember } from "../utils/db.js";
import { qrBuffer, buildScanUrl } from "../utils/qr.js";
import { CONFIG }       from "../config.js";

const router = Router();

// ── GET /member/:kode — halaman share dengan OG tags ─────────
// Halaman ini PUBLIK — tidak butuh login admin
// WA crawler akan baca og:image dari halaman ini
router.get("/member/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);

  // Kode tidak valid — redirect ke scan biasa
  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = req.protocol + "://" + req.get("host");
  const scanUrl  = base + "/scan?id=" + kode;
  const imageUrl = base + "/og-image/" + kode;
  const title    = CONFIG.NAMA_ARENA + " — " + member.nama;
  const desc     = "Scan QR ini untuk check-in di " + CONFIG.NAMA_ARENA
    + ". Kode member: " + kode;

  // HTML minimal — hanya OG tags + auto redirect ke scan
  // WA crawler tidak eksekusi JS, jadi pakai meta refresh
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'

    // ── Open Graph (WA, FB, Telegram) ──────────────────────
    + '<meta property="og:type"        content="website">'
    + '<meta property="og:url"         content="' + scanUrl + '">'
    + '<meta property="og:title"       content="' + title + '">'
    + '<meta property="og:description" content="' + desc + '">'
    + '<meta property="og:image"       content="' + imageUrl + '">'
    + '<meta property="og:image:width"  content="400">'
    + '<meta property="og:image:height" content="530">'
    + '<meta property="og:image:type"   content="image/png">'

    // ── Twitter / X Card ────────────────────────────────────
    + '<meta name="twitter:card"        content="summary_large_image">'
    + '<meta name="twitter:title"       content="' + title + '">'
    + '<meta name="twitter:description" content="' + desc + '">'
    + '<meta name="twitter:image"       content="' + imageUrl + '">'

    // ── Redirect ke scan setelah 0 detik ────────────────────
    // WA crawler tidak ikuti redirect, tapi browser biasa akan
    + '<meta http-equiv="refresh" content="0;url=' + scanUrl + '">'
    + '<title>' + title + '</title>'
    + '</head><body>'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:sans-serif;background:#070d18;color:#e8edf5;'
    + 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.wrap{text-align:center;max-width:320px}'
    + 'p{font-size:13px;color:#4a5e78;margin-top:8px}'
    + 'a{color:#22c55e;font-size:13px}</style>'
    + '<div class="wrap">'
    + '<p>Mengalihkan ke halaman check-in...</p>'
    + '<p style="margin-top:12px"><a href="' + scanUrl + '">Klik di sini jika tidak otomatis</a></p>'
    + '</div>'
    + '<script>window.location.replace("' + scanUrl + '");</script>'
    + '</body></html>'
  );
});

// ── GET /og-image/:kode — PNG untuk og:image ─────────────────
// WA/FB fetch URL ini untuk ambil gambar preview
// Harus return PNG (WA tidak support SVG sebagai og:image)
router.get("/og-image/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    // Generate QR PNG ukuran besar — ini yang jadi preview WA
    const scanUrl = req.protocol + "://" + req.get("host") + "/scan?id=" + kode;
    const buf     = await qrBuffer(scanUrl, 400);

    res.setHeader("Content-Type", "image/png");
    // Cache 1 jam — WA crawl ulang jika cache expired
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buf);
  } catch (err) {
    console.error("[OG] og-image gagal:", err.message);
    res.status(500).end();
  }
});

export default router;
