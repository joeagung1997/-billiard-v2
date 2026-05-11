// src/routes/share.js
// ── Route publik untuk share WA dengan OG preview ────────────

import { Router }            from "express";
import { readDB, findMember } from "../utils/db.js";
import { buildScanUrl }       from "../utils/qr.js";
import { CONFIG }             from "../config.js";
import QRCode                 from "qrcode";

const router = Router();

// ── Helper: generate PNG WA preview (1200x630) ───────────────
// Menggunakan qrcode + jimp murni JS — tidak butuh canvas/native
async function generateWaPreviewPng({ scanUrl, nama, kode }) {
  const Jimp = (await import("jimp")).default;

  const W = 1200;
  const H = 630;
  const QR_SIZE = 420;

  // 1. Generate QR sebagai PNG buffer
  const qrBuf = await QRCode.toBuffer(scanUrl, {
    errorCorrectionLevel: "M",
    type:   "png",
    width:  QR_SIZE,
    margin: 1,
    color:  { dark: "#000000", light: "#ffffff" },
  });

  // 2. Buat canvas kosong background gelap
  const img = new Jimp(W, H, 0x0d1b2eff); // background navy gelap

  // 3. Load QR dan composite ke kanan
  const qrImg = await Jimp.read(qrBuf);

  // White card di belakang QR
  const qrCard = new Jimp(QR_SIZE + 30, QR_SIZE + 30, 0xffffffff);
  img.composite(qrCard, W - QR_SIZE - 80, (H - QR_SIZE - 30) / 2);

  // QR di atas white card
  img.composite(qrImg, W - QR_SIZE - 65, (H - QR_SIZE) / 2);

  // 4. Garis aksen hijau di kiri
  const accentBar = new Jimp(8, H, 0x16a34aff);
  img.composite(accentBar, 0, 0);

  // 5. Load font bawaan Jimp untuk teks
  const fontLarge  = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  const fontSmall  = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  // 6. Tulis teks di sisi kiri
  // Nama arena
  img.print(fontMedium, 60, 60,  CONFIG.NAMA_ARENA);
  img.print(fontSmall,  60, 105, "MEMBER CARD");

  // Garis divider
  const div1 = new Jimp(580, 2, 0x1e3a30ff);
  img.composite(div1, 60, 160);

  // Label
  img.print(fontSmall, 60, 195, "NAMA MEMBER");

  // Nama member — potong jika panjang
  const namaDisplay = nama.length > 18 ? nama.slice(0, 16) + "..." : nama;
  img.print(fontLarge, 60, 235, namaDisplay);

  // Kode
  img.print(fontMedium, 60, 330, kode);

  // Garis divider 2
  const div2 = new Jimp(580, 2, 0x1e3a30ff);
  img.composite(div2, 60, 400);

  // Instruksi
  img.print(fontSmall, 60, 425, "Scan QR untuk check-in");

  // 7. Export sebagai PNG buffer
  return img.getBufferAsync(Jimp.MIME_PNG);
}

// ── GET /member/:kode — halaman share dengan OG tags ─────────
router.get("/member/:kode", (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.redirect("/scan?id=" + kode);

  const base     = req.protocol + "://" + req.get("host");
  const scanUrl  = base + "/scan?id=" + kode;
  const imageUrl = base + "/og-image/" + kode;
  const title    = CONFIG.NAMA_ARENA + " — " + member.nama;
  const desc     = "Scan QR ini untuk check-in di " + CONFIG.NAMA_ARENA + ". Kode: " + kode;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta property="og:type"         content="website">'
    + '<meta property="og:url"          content="' + scanUrl + '">'
    + '<meta property="og:title"        content="' + title + '">'
    + '<meta property="og:description"  content="' + desc + '">'
    + '<meta property="og:image"        content="' + imageUrl + '">'
    + '<meta property="og:image:width"  content="1200">'
    + '<meta property="og:image:height" content="630">'
    + '<meta property="og:image:type"   content="image/png">'
    + '<meta property="og:site_name"    content="' + CONFIG.NAMA_ARENA + '">'
    + '<meta name="twitter:card"        content="summary_large_image">'
    + '<meta name="twitter:title"       content="' + title + '">'
    + '<meta name="twitter:description" content="' + desc + '">'
    + '<meta name="twitter:image"       content="' + imageUrl + '">'
    + '<meta http-equiv="refresh" content="0;url=' + scanUrl + '">'
    + '<title>' + title + '</title>'
    + '</head><body>'
    + '<style>*{margin:0;padding:0}body{font-family:sans-serif;background:#070d18;color:#e8edf5;min-height:100vh;display:flex;align-items:center;justify-content:center}p{font-size:13px;color:#4a5e78;text-align:center}a{color:#22c55e}</style>'
    + '<div><p>Mengalihkan ke halaman check-in...</p>'
    + '<p style="margin-top:12px"><a href="' + scanUrl + '">Klik di sini jika tidak otomatis</a></p></div>'
    + '<script>window.location.replace("' + scanUrl + '");</script>'
    + '</body></html>'
  );
});

// ── GET /og-image/:kode — PNG 1200x630 untuk WA thumbnail ────
// WA, Telegram, FB crawl URL ini → dapat PNG → tampil sebagai thumbnail
router.get("/og-image/:kode", async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl = buildScanUrl(req, kode);
    const png     = await generateWaPreviewPng({
      scanUrl,
      nama: member.nama,
      kode,
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(png);

    console.log("[OG] PNG generated OK untuk " + kode);
  } catch (err) {
    console.error("[OG] generateWaPreviewPng gagal:", err.message);
    res.status(500).end();
  }
});

export default router;
