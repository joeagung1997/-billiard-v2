// src/utils/qr.js
// ── QR code generator ────────────────────────────────────────

import QRCode from "qrcode";
import { CONFIG } from "../config.js";
import { arenaName } from "./brand.js";

const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

export const qrDataUrl = async (text, size) =>
  QRCode.toDataURL(text, { ...QR_OPTIONS, type: "image/png", width: size ?? 400 });

export const qrBuffer = async (text, size) =>
  QRCode.toBuffer(text, { ...QR_OPTIONS, type: "png", width: size ?? 400 });

const getProto = (req) => {
  const host = req.get('host') || '';
  if (host.includes('railway.app')) return 'https';
  const fwd = req.get('x-forwarded-proto');
  if (fwd) return fwd.split(',')[0].trim();
  return req.protocol;
};
export const buildScanUrl = (req, kode) =>
  getProto(req) + '://' + req.get('host') + '/scan?id=' + kode;
export const buildBaseUrl = (req) =>
  getProto(req) + '://' + req.get('host');

// ── Escape karakter SVG ───────────────────────────────────────
const escSvg = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// ── Branded QR Card v3 — "Obsidian" ─────────────────────────
// Ultra-dark premium card. Top accent stripe, aurora bloom,
// clean QR (no overlay), pill progress, strong type hierarchy.
// Zero backtick, zero emoji in SVG.
export const brandedQrCard = async ({ text, nama, kode, totalMain = 0, sudahScanHariIni = false }) => {
  // 1. QR PNG — hitam pekat agar maksimal kontras di putih
  const qrPng = await QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    type:   "image/png",
    width:  300,
    margin: 1,
    color:  { dark: "#020810", light: "#ffffff" },
  });

  // 2. Layout constants
  const W    = 400;
  const H    = 620;
  const CX   = W / 2;                  // 200
  const DOTS = CONFIG.BATAS_MAIN;      // biasanya 10

  const ARENA = escSvg(arenaName());
  const NAMA  = escSvg(nama.length > 22 ? nama.slice(0, 20) + "…" : nama);
  const KODE  = escSvg(kode);

  // 3. Progress pills (rounded rect, tanpa angka — lebih clean)
  const PW = 26, PH = 13, PRX = 7;           // pill dimensions
  const PGAP = 8;                              // gap antar pill
  const totalPW = DOTS * PW + (DOTS - 1) * PGAP;
  const pillX0  = Math.round((W - totalPW) / 2); // x pill pertama
  const pillTopY = 534;                        // y top edge pills

  let pillsSvg = "";
  for (let i = 0; i < DOTS; i++) {
    const px     = pillX0 + i * (PW + PGAP);
    const n      = i + 1;
    const isFree = n === DOTS;
    const isDone = n <= totalMain;

    let fill, stroke;
    if      (isFree && isDone) { fill = "#78350f"; stroke = "#f59e0b"; }
    else if (isFree)           { fill = "#0c0800"; stroke = "#3a2000"; }
    else if (isDone)           { fill = "#052e16"; stroke = "#10b981"; }
    else                       { fill = "#040d0b"; stroke = "#0d2018"; }

    pillsSvg += '<rect x="' + px + '" y="' + pillTopY
      + '" width="' + PW + '" height="' + PH + '" rx="' + PRX + '"'
      + ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>';

    // Label FREE di pill terakhir (hanya jika belum done — biar terlihat)
    if (isFree && !isDone) {
      pillsSvg += '<text x="' + (px + PW / 2) + '" y="' + (pillTopY + PH / 2 + 3) + '"'
        + ' font-family="Arial,sans-serif" font-size="5" font-weight="800"'
        + ' fill="#b45309" text-anchor="middle">FREE</text>';
    }
  }

  // 4. Progress text
  const sisa     = Math.max(0, DOTS - 1 - totalMain);
  const persen   = Math.min(Math.round(totalMain / (DOTS - 1) * 100), 100);
  const progText = totalMain === 0
    ? "Belum ada check-in bulan ini"
    : totalMain >= DOTS - 1
      ? "Selamat—kamu dapat sesi GRATIS!"
      : String(totalMain) + " / " + String(DOTS - 1)
        + " sesi · " + String(sisa) + " lagi untuk gratis";

  // 5. Bar width (px) — untuk smooth progress bar
  const BAR_X = 32, BAR_W = W - 64, BAR_H = 4;
  const barFill = Math.round(BAR_W * persen / 100);

  // 6. SVG string
  const svg = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'

    // ── DEFS ──────────────────────────────────────────────────
    + '<defs>'

    // BG diagonal gradient — very dark navy to pure black
    + '<linearGradient id="bg" x1="0" y1="0" x2=".6" y2="1">'
    + '<stop offset="0%"   stop-color="#080d1e"/>'
    + '<stop offset="60%"  stop-color="#050912"/>'
    + '<stop offset="100%" stop-color="#020508"/>'
    + '</linearGradient>'

    // Aurora bloom — emerald radial, top-center
    + '<radialGradient id="aurora" cx="50%" cy="0%" r="65%" fx="50%" fy="0%">'
    + '<stop offset="0%"   stop-color="#059669" stop-opacity=".22"/>'
    + '<stop offset="60%"  stop-color="#047857" stop-opacity=".06"/>'
    + '<stop offset="100%" stop-color="#047857" stop-opacity="0"/>'
    + '</radialGradient>'

    // Top accent stripe gradient (cyan → emerald → cyan)
    + '<linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%"   stop-color="#06b6d4" stop-opacity=".6"/>'
    + '<stop offset="40%"  stop-color="#10b981" stop-opacity="1"/>'
    + '<stop offset="100%" stop-color="#06b6d4" stop-opacity=".4"/>'
    + '</linearGradient>'

    // Header pill gradient
    + '<linearGradient id="pillGrad" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%"   stop-color="#065f46"/>'
    + '<stop offset="100%" stop-color="#0e7490"/>'
    + '</linearGradient>'

    // Progress bar gradient
    + '<linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%"   stop-color="#10b981"/>'
    + '<stop offset="100%" stop-color="#06b6d4"/>'
    + '</linearGradient>'

    // Card outer border gradient
    + '<linearGradient id="bdGrad" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%"   stop-color="#10b981" stop-opacity=".55"/>'
    + '<stop offset="50%"  stop-color="#06b6d4" stop-opacity=".2"/>'
    + '<stop offset="100%" stop-color="#10b981" stop-opacity=".1"/>'
    + '</linearGradient>'

    // Clip card shape
    + '<clipPath id="cc"><rect width="' + W + '" height="' + H + '" rx="24"/></clipPath>'

    // Soft glow filter for QR border
    + '<filter id="qrGlow" x="-8%" y="-8%" width="116%" height="116%">'
    + '<feGaussianBlur stdDeviation="3" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>'

    + '</defs>'

    // ── BACKGROUND ────────────────────────────────────────────
    + '<g clip-path="url(#cc)">'

    + '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>'
    + '<rect width="' + W + '" height="' + H + '" fill="url(#aurora)"/>'

    // Subtle diagonal lines texture (low opacity)
    + '<line x1="0"   y1="160" x2="160" y2="0"   stroke="#ffffff" stroke-width=".4" opacity=".025"/>'
    + '<line x1="0"   y1="260" x2="260" y2="0"   stroke="#ffffff" stroke-width=".4" opacity=".018"/>'
    + '<line x1="0"   y1="360" x2="360" y2="0"   stroke="#ffffff" stroke-width=".4" opacity=".012"/>'
    + '<line x1="40"  y1="' + H + '" x2="' + W + '" y2="' + (H - 360) + '"'
    + ' stroke="#ffffff" stroke-width=".4" opacity=".018"/>'
    + '<line x1="140" y1="' + H + '" x2="' + W + '" y2="' + (H - 260) + '"'
    + ' stroke="#ffffff" stroke-width=".4" opacity=".012"/>'

    // ── TOP ACCENT STRIPE (3px) ────────────────────────────────
    + '<rect x="0" y="0" width="' + W + '" height="3" fill="url(#stripe)"/>'

    // ── HEADER (y: 18-82) ─────────────────────────────────────
    // Billiard ball icon — minimalist concentric rings
    + '<circle cx="40" cy="50" r="22" fill="#071a0f" stroke="#10b981" stroke-width="1.5" opacity=".9"/>'
    + '<circle cx="40" cy="50" r="14" fill="none" stroke="#10b981" stroke-width=".6" opacity=".35"/>'
    + '<circle cx="33" cy="43" r="6"  fill="#ffffff" opacity=".75"/>'
    + '<circle cx="40" cy="50" r="2.5" fill="#0a1a10" opacity=".6"/>'

    // Arena name — large, bold
    + '<text x="74" y="43"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="20" font-weight="800" fill="#f0fdf4" letter-spacing=".2">' + ARENA + '</text>'

    // MEMBER CARD pill
    + '<rect x="74" y="51" width="98" height="17" rx="8.5" fill="url(#pillGrad)" opacity=".9"/>'
    + '<text x="123" y="63.5"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="8.5" font-weight="700" fill="#a7f3d0" text-anchor="middle"'
    + ' letter-spacing="2.2">MEMBER CARD</text>'

    // Header divider
    + '<line x1="20" y1="82" x2="380" y2="82" stroke="#10b981" stroke-width=".5" opacity=".12"/>'

    // ── QR PANEL ─────────────────────────────────────────────
    // Drop shadow
    + '<rect x="44" y="102" width="312" height="312" rx="20" fill="#000" opacity=".35"/>'
    // White QR card
    + '<rect x="40" y="98" width="320" height="312" rx="20" fill="#ffffff"/>'
    // Subtle inner border
    + '<rect x="40" y="98" width="320" height="312" rx="20"'
    + ' fill="none" stroke="#10b981" stroke-width="1.2" opacity=".18" filter="url(#qrGlow)"/>'
    // Accent top edge pada QR card (thin colored bar at top of white card)
    + '<rect x="40" y="98" width="320" height="4" rx="2" fill="url(#stripe)" opacity=".5"/>'
    // QR image — centered dalam white card, no center overlay
    + '<image href="' + qrPng + '" x="50" y="106" width="300" height="300"/>'

    // ── INFO SECTION ──────────────────────────────────────────
    // Top info divider
    + '<line x1="20" y1="424" x2="380" y2="424" stroke="#ffffff" stroke-width=".5" opacity=".05"/>'

    // Nama member — besar, bold
    + '<text x="' + CX + '" y="455"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="24" font-weight="800" fill="#f8fafc" text-anchor="middle"'
    + ' letter-spacing=".2">' + NAMA + '</text>'

    // Kode pill — kecil & sharp
    + '<rect x="' + (CX - 70) + '" y="463" width="140" height="24" rx="12"'
    + ' fill="#041a10" stroke="#10b981" stroke-width="1.2" opacity=".9"/>'
    + '<text x="' + CX + '" y="479"'
    + ' font-family="\'Courier New\',Courier,monospace"'
    + ' font-size="11.5" font-weight="700" fill="#34d399" text-anchor="middle"'
    + ' letter-spacing="3.5">' + KODE + '</text>'

    // ── PROGRESS SECTION ─────────────────────────────────────
    // Section divider
    + '<line x1="20" y1="502" x2="380" y2="502" stroke="#ffffff" stroke-width=".5" opacity=".05"/>'

    // Label kiri + fraksi kanan
    + '<text x="' + BAR_X + '" y="520"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="9" font-weight="700" fill="#134e4a" letter-spacing="2">SESI BULAN INI</text>'
    + '<text x="' + (W - BAR_X) + '" y="520"'
    + ' font-family="\'Courier New\',Courier,monospace"'
    + ' font-size="9" font-weight="700" fill="#10b981" text-anchor="end">'
    + String(totalMain) + ' / ' + String(DOTS - 1) + '</text>'

    // Smooth progress bar
    + '<rect x="' + BAR_X + '" y="526" width="' + BAR_W + '" height="' + BAR_H + '" rx="2" fill="#071a12"/>'
    + (barFill > 0
      ? '<rect x="' + BAR_X + '" y="526" width="' + barFill + '" height="' + BAR_H + '" rx="2" fill="url(#barGrad)"/>'
      : '')

    // Pill progress indicators
    + pillsSvg

    // Progress info text
    + '<text x="' + CX + '" y="562"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="11" fill="' + (totalMain >= DOTS - 1 ? "#fbbf24" : "#1e5c4a") + '"'
    + ' text-anchor="middle" font-weight="' + (totalMain >= DOTS - 1 ? "700" : "400") + '">'
    + escSvg(progText) + '</text>'

    // Badge "sudah check-in hari ini"
    + (sudahScanHariIni
      ? '<rect x="' + (CX - 84) + '" y="572" width="168" height="19" rx="9.5"'
        + ' fill="#042f23" stroke="#10b981" stroke-width="1" opacity=".85"/>'
        + '<text x="' + CX + '" y="585"'
        + ' font-family="-apple-system,sans-serif" font-size="9" font-weight="600"'
        + ' fill="#34d399" text-anchor="middle" letter-spacing=".8">'
        + '✓ Sudah check-in hari ini</text>'
      : '')

    // ── FOOTER ────────────────────────────────────────────────
    + '<line x1="20" y1="600" x2="380" y2="600" stroke="#ffffff" stroke-width=".5" opacity=".04"/>'
    + '<text x="' + CX + '" y="613"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="9.5" fill="#0d3a28" text-anchor="middle" letter-spacing="1.2">'
    + 'Tunjukkan QR ini ke kasir untuk check-in</text>'

    + '</g>'

    // ── OUTER BORDER (gradient glow) ──────────────────────────
    + '<rect x="1" y="1" width="398" height="618" rx="23"'
    + ' fill="none" stroke="url(#bdGrad)" stroke-width="1.5"/>'

    + '</svg>';

  // 7. Encode base64
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return {
    svg,
    encoded:    "data:image/svg+xml;base64," + b64,
    dataBase64: b64,
  };
};

// ── OG Image untuk WA preview (1200x630 landscape) ───────────
// WA, FB, Telegram butuh gambar landscape 1200x630 (rasio ~1.91:1)
// Menampilkan: nama arena, nama member, kode, dan QR di kanan
export const ogImageSvg = async ({ text, nama, kode }) => {
  // QR kecil untuk embed
  const qrPng = await QRCode.toDataURL(text, {
    ...QR_OPTIONS,
    type:   "image/png",
    width:  320,
    margin: 1,
  });

  const W     = 1200;
  const H     = 630;
  const ARENA = escSvg(arenaName());
  const NAMA  = escSvg(nama.length > 28 ? nama.slice(0, 26) + "..." : nama);
  const KODE  = escSvg(kode);

  const svg = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'

    + '<defs>'
    + '<linearGradient id="ogBg" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="#0a1628"/>'
    + '<stop offset="100%" stop-color="#050d1a"/>'
    + '</linearGradient>'
    + '<linearGradient id="ogAccent" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%" stop-color="#14532d"/>'
    + '<stop offset="100%" stop-color="#166534"/>'
    + '</linearGradient>'
    + '<clipPath id="ogClip"><rect width="' + W + '" height="' + H + '"/></clipPath>'
    + '<clipPath id="qrClip"><rect x="780" y="80" width="360" height="470" rx="20"/></clipPath>'
    + '</defs>'

    + '<g clip-path="url(#ogClip)">'

    // Background
    + '<rect width="' + W + '" height="' + H + '" fill="url(#ogBg)"/>'

    // Dekorasi lingkaran kanan bawah
    + '<circle cx="1200" cy="630" r="400" fill="#0d2a1e" opacity=".4"/>'
    + '<circle cx="1200" cy="630" r="250" fill="#14532d" opacity=".2"/>'

    // Dekorasi kiri atas
    + '<circle cx="0" cy="0" r="300" fill="#0a1f1a" opacity=".3"/>'

    // Strip hijau kiri
    + '<rect x="0" y="0" width="8" height="' + H + '" fill="url(#ogAccent)"/>'

    // ── Sisi kiri — teks ──────────────────────────────────
    // Icon billiard (shape SVG)
    + '<circle cx="80" cy="90" r="40" fill="#111" stroke="#22c55e" stroke-width="3"/>'
    + '<circle cx="66" cy="76" r="12" fill="#fff" opacity=".9"/>'
    + '<circle cx="80" cy="90" r="5" fill="#333" opacity=".5"/>'

    // Nama arena
    + '<text x="140" y="78"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="32" font-weight="700" fill="#ffffff">' + ARENA + '</text>'

    // Label MEMBER CARD
    + '<text x="140" y="108"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="16" fill="#86efac" letter-spacing="4" font-weight="600">MEMBER CARD</text>'

    // Garis divider
    + '<rect x="60" y="160" width="620" height="2" fill="#1e3a30"/>'

    // Label NAMA
    + '<text x="60" y="230"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="18" fill="#4a7060" letter-spacing="3" font-weight="700">NAMA MEMBER</text>'

    // Nama member — besar
    + '<text x="60" y="305"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="64" font-weight="700" fill="#e8edf5">' + NAMA + '</text>'

    // Kode member
    + '<text x="60" y="370"'
    + ' font-family="Courier New,Courier,monospace"'
    + ' font-size="28" fill="#22c55e" letter-spacing="4" font-weight="600">' + KODE + '</text>'

    // Divider kedua
    + '<rect x="60" y="420" width="620" height="2" fill="#1e3a30"/>'

    // Instruksi
    + '<text x="60" y="470"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="22" fill="#4a7060">Scan QR untuk check-in di ' + ARENA + '</text>'

    // ── Sisi kanan — QR ──────────────────────────────────
    // Shadow QR
    + '<rect x="790" y="90" width="360" height="450" rx="20" fill="#000" opacity=".3"/>'
    // White card QR
    + '<rect x="780" y="80" width="360" height="450" rx="20" fill="#ffffff"/>'
    // QR image
    + '<image href="' + qrPng + '" x="790" y="90" width="340" height="340"'
    + ' clip-path="url(#qrClip)"/>'
    // Logo center QR
    + '<rect x="942" y="222" width="56" height="56" rx="10" fill="#fff" stroke="#e5e7eb" stroke-width="1"/>'
    + '<circle cx="970" cy="250" r="20" fill="#0d1b2e" stroke="#22c55e" stroke-width="2"/>'
    + '<circle cx="962" cy="242" r="6" fill="#fff" opacity=".85"/>'
    // Label di bawah QR
    + '<text x="960" y="466"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="16" fill="#64748b" text-anchor="middle" letter-spacing="1">Scan untuk check-in</text>'
    + '<text x="960" y="490"'
    + ' font-family="Courier New,Courier,monospace"'
    + ' font-size="18" fill="#22c55e" text-anchor="middle" letter-spacing="2" font-weight="600">' + KODE + '</text>'

    + '</g>'
    + '</svg>';

  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return { svg, b64 };
};
