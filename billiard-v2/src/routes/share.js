// src/routes/share.js
// ── Route publik: WA thumbnail via Open Graph + Cloudinary ────

import { Router }             from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl, buildBaseUrl, brandedQrCard } from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import QRCode                 from "qrcode";

const router = Router();

// ── Cloudinary URL dinamis per member ────────────────────────
// Background: billiard-bg_k0l8pg (template hijau gelap di Cloudinary)
// QR: di-fetch dari /qr-only/:kode Railway — berbeda tiap member
// Teks: overlay via Cloudinary transformation
// ── Upload QR ke Cloudinary saat member dibuat ───────────────
export async function uploadQrToCloudinary(kode, qrBuf) {
  const CLOUD  = "dlxazwdbu";
  const KEY    = process.env.CLOUDINARY_KEY    ?? "";
  const SECRET = process.env.CLOUDINARY_SECRET ?? "";
  if (!KEY || !SECRET) {
    console.log("[CDN] CLOUDINARY_KEY/SECRET belum di-set");
    return false;
  }
  try {
    const { createHash } = await import("crypto");
    const publicId  = "qr_" + kode.toLowerCase().replace(/-/g, "_");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const str       = "overwrite=true&public_id=" + publicId + "&timestamp=" + timestamp + SECRET;
    const signature = createHash("sha1").update(str).digest("hex");

    const form = new FormData();
    form.append("file",      new Blob([qrBuf], { type: "image/png" }), "qr.png");
    form.append("api_key",   KEY);
    form.append("timestamp", timestamp);
    form.append("public_id", publicId);
    form.append("overwrite", "true");
    form.append("signature", signature);

    const resp = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload",
      { method: "POST", body: form }
    );
    const data = await resp.json();
    if (data.public_id) {
      console.log("[CDN] QR uploaded:", data.public_id);
      return true;
    }
    console.error("[CDN] Upload gagal:", JSON.stringify(data).slice(0, 120));
    return false;
  } catch (err) {
    console.error("[CDN] Upload error:", err.message);
    return false;
  }
}

// ── Cloudinary URL dengan overlay QR + teks ──────────────────
function makeCloudinaryUrl(kode, nama) {
  const CLOUD = "dlxazwdbu";
  const BG    = "billiard-bg-v2_bs9hyz";
  // QR disimpan di Cloudinary dengan public_id: qr_[kode]
  const QR_ID = "qr_" + kode.toLowerCase().replace(/-/g, "_");

  const enc = (t) => encodeURIComponent(String(t ?? "")).replace(/,/g, "%2C");

  const arena    = enc(CONFIG.NAMA_ARENA);
  const namaDisp = enc(nama.length > 20 ? nama.slice(0, 18) + "..." : nama);
  const kodeDisp = enc(kode);
  const footer   = enc("Tunjukkan ke kasir setiap mau main");

  const tr = [
    "w_800,h_800,c_fill",
    // QR dari Cloudinary storage — overlay ke area putih
    "l_" + QR_ID + ",w_520,h_520,g_center,y_-40,fl_layer_apply",
    // Teks header
    "l_text:Arial_34_bold:" + arena + ",co_white,g_north,y_32",
    "l_text:Arial_14:" + enc("MEMBER CARD") + ",co_rgb:86efac,g_north,y_80",
    // Teks footer
    "l_text:Arial_32_bold:" + namaDisp + ",co_rgb:ffffff,g_south,y_78",
    "l_text:Arial_18:" + kodeDisp + ",co_rgb:22c55e,g_south,y_42",
    "l_text:Arial_13:" + footer + ",co_rgb:86efac,g_south,y_16",
  ].join("/");

  return "https://res.cloudinary.com/" + CLOUD + "/image/upload/" + tr + "/" + BG;
}


// ── Helper: QR PNG polos (untuk Cloudinary fetch + fallback) ──
async function makeQrPng(scanUrl) {
  return QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "H",
    type: "png", width: 520, margin: 2,
    color: { dark: "#0d2137", light: "#ffffff" },
  });
}

// ── GET /qr-only/:kode — QR PNG murni untuk Cloudinary fetch ─
// Cloudinary akan fetch URL ini untuk overlay ke background
router.get("/qr-only/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    const png     = await makeQrPng(scanUrl);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(png);
  } catch {
    res.status(500).end();
  }
});

// ── GET /member/:kode — halaman OG untuk WA crawler + preview QR ─
router.get("/member/:kode", async (req, res) => {
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

  const card = await brandedQrCard({
    text: scanUrl,
    nama: member.nama,
    kode,
  });

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
    '<!DOCTYPE html>'
    + '<html prefix="og: http://ogp.me/ns#" lang="id"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta property="og:type"             content="website">'
    + '<meta property="og:url"              content="' + base + '/member/' + kode + '">'
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
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{background:#070d18;min-height:100vh;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;padding:24px 16px;'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
    + '.arena-tag{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;'
    + 'color:#22c55e;margin-bottom:6px}'
    + '.instruction{font-size:13px;color:#4a6a80;margin-bottom:20px;text-align:center;line-height:1.6}'
    + '.card-wrap img{width:100%;max-width:400px;height:auto;border-radius:20px;'
    + 'box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(34,197,94,.15)}'
    + '</style>'
    + '</head>'
    + '<body>'
    + '<div class="arena-tag">' + CONFIG.NAMA_ARENA + '</div>'
    + '<p class="instruction">Tunjukkan kartu ini ke kasir<br>untuk check-in billiard.</p>'
    + '<div class="card-wrap">'
    + '<img src="' + card.encoded + '" alt="Kartu Member ' + member.nama + '">'
    + '</div>'
    + '</body></html>'
  );
});

// ── GET /og-image/:kode — PNG untuk WA thumbnail ─────────────
// Redirect ke Cloudinary yang render gambar dengan teks + QR dinamis
router.get("/og-image/:kode", async (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  if (!member) return res.status(404).end();

  const cdnUrl = makeCloudinaryUrl(kode, member.nama);

  console.log("[OG] Redirect Cloudinary untuk " + kode);
  res.redirect(302, cdnUrl);
});

// ── GET /og-debug/:kode — debug ───────────────────────────────
router.get("/og-debug/:kode", (req, res) => {
  const kode   = req.params.kode.toUpperCase();
  const db     = readDB();
  const member = findMember(db.members, kode);
  const base   = buildBaseUrl(req);
  const cdnUrl = member ? makeCloudinaryUrl(kode, member.nama, base) : "N/A";

  res.send(
    '<html><head><meta charset="UTF-8"><title>OG Debug</title></head>'
    + '<body style="background:#070d18;color:#e8edf5;font-family:sans-serif;padding:20px">'
    + '<h2 style="color:#22c55e;margin-bottom:12px">OG Debug — ' + kode + '</h2>'
    + '<p style="color:#8496b0;font-size:13px">Member: '
    + (member ? '<strong>' + member.nama + '</strong>' : '<span style="color:#ef4444">NOT FOUND</span>') + '</p>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 4px">URL share WA:</p>'
    + '<code style="color:#22c55e;font-size:11px;word-break:break-all">' + base + '/member/' + kode + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:12px 0 4px">Cloudinary URL:</p>'
    + '<code style="color:#3b82f6;font-size:10px;word-break:break-all">' + cdnUrl + '</code>'
    + '<p style="color:#8496b0;font-size:13px;margin:16px 0 6px">Preview (harus branded dengan nama member):</p>'
    + '<img src="/og-image/' + kode + '" style="max-width:400px;border-radius:8px;border:2px solid #1e2d45">'
    + '</body></html>'
  );
});

export default router;
