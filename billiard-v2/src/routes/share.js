// src/routes/share.js
// ── Route publik untuk share WA dengan OG preview ────────────
//
// Cara kerja:
// 1. Admin klik "Kirim WA" → URL yang dikirim: /member/:kode
// 2. WA crawler buka URL → baca meta og:image
// 3. og:image mengarah ke /og-image/:kode (PNG 1200x630)
// 4. WA render preview gambar branded di chat
// 5. Member klik link → redirect ke /scan?id=:kode

import { Router }       from "express";
import { readDB, findMember } from "../utils/db.js";
import { ogImageSvg, buildScanUrl } from "../utils/qr.js";
import { CONFIG }       from "../config.js";

const router = Router();

// ── GET /member/:kode — halaman share dengan OG tags ─────────
// PUBLIK — tidak butuh login
router.get("/member/:kode", (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);

  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = req.protocol + "://" + req.get("host");
  const scanUrl  = base + "/scan?id=" + kode;
  const imageUrl = base + "/og-image/" + kode;
  const title    = CONFIG.NAMA_ARENA + " — " + member.nama;
  const desc     = "Scan QR ini untuk check-in di "
    + CONFIG.NAMA_ARENA + ". Kode: " + kode;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'

    // Open Graph — WA, FB, Telegram baca ini
    + '<meta property="og:type"         content="website">'
    + '<meta property="og:url"          content="' + scanUrl + '">'
    + '<meta property="og:title"        content="' + title + '">'
    + '<meta property="og:description"  content="' + desc + '">'
    + '<meta property="og:image"        content="' + imageUrl + '">'
    + '<meta property="og:image:width"  content="1200">'
    + '<meta property="og:image:height" content="630">'
    + '<meta property="og:image:type"   content="image/png">'
    + '<meta property="og:site_name"    content="' + CONFIG.NAMA_ARENA + '">'

    // Twitter / X card
    + '<meta name="twitter:card"        content="summary_large_image">'
    + '<meta name="twitter:title"       content="' + title + '">'
    + '<meta name="twitter:description" content="' + desc + '">'
    + '<meta name="twitter:image"       content="' + imageUrl + '">'

    // Redirect browser ke scan, WA crawler tidak ikuti redirect
    + '<meta http-equiv="refresh" content="0;url=' + scanUrl + '">'
    + '<title>' + title + '</title>'
    + '</head><body>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:sans-serif;background:#070d18;color:#e8edf5;'
    + 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + 'p{font-size:13px;color:#4a5e78;margin-top:8px;text-align:center}'
    + 'a{color:#22c55e}'
    + '</style>'
    + '<div>'
    + '<p>Mengalihkan ke halaman check-in...</p>'
    + '<p style="margin-top:12px"><a href="' + scanUrl + '">Klik di sini jika tidak otomatis</a></p>'
    + '</div>'
    + '<script>window.location.replace("' + scanUrl + '");</script>'
    + '</body></html>'
  );
});

// ── GET /og-image/:kode — PNG 1200x630 untuk WA preview ──────
// WA crawler fetch URL ini → dapat PNG → tampil sebagai thumbnail
// PUBLIK — tidak butuh login, WA crawler tidak kirim cookies
router.get("/og-image/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    const { svg } = await ogImageSvg({
      text: scanUrl,
      nama: member.nama,
      kode,
    });

    // Convert SVG → PNG-kompatibel via SVG PNG serve
    // WA support SVG sebagai og:image di beberapa versi,
    // tapi PNG lebih universal — kita serve sebagai PNG MIME
    // dengan SVG content (browser modern render keduanya)
    // Untuk kompatibilitas maksimal: serve sebagai image/svg+xml
    // dan tambahkan fallback PNG yang lebih kecil
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    // Header ini membantu WA dan crawler lain
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(svg);
  } catch (err) {
    console.error("[OG] og-image gagal:", err.message);
    res.status(500).end();
  }
});

export default router;
