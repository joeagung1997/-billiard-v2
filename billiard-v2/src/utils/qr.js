// src/utils/qr.js
// ── QR code generator ────────────────────────────────────────

import QRCode from "qrcode";
import { CONFIG } from "../config.js";

const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
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

// ── Branded QR Card (modern redesign) ────────────────────────
// Dark glassmorphism card — gradient mesh background, glow accent,
// pill badge, clean typography. Zero backtick, zero emoji.
export const brandedQrCard = async ({ text, nama, kode }) => {
  // 1. QR PNG — dark modules agar kontras dengan panel putih
  const qrPng = await QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    type:   "image/png",
    width:  280,
    margin: 1,
    color:  { dark: "#0a0f1a", light: "#ffffff" },
  });

  // 2. Konstanta layout
  const W   = 400;
  const H   = 580;
  const CX  = W / 2;          // 200 — center X
  const ARENA = escSvg(CONFIG.NAMA_ARENA);
  const NAMA  = escSvg(nama.length > 22 ? nama.slice(0, 20) + "…" : nama);
  const KODE  = escSvg(kode);

  // 3. SVG
  const svg = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'

    // ── defs ──────────────────────────────────────────────────
    + '<defs>'

    // Background gradient — deep navy ke hitam
    + '<linearGradient id="bgGrad" x1="0" y1="0" x2="0.5" y2="1">'
    + '<stop offset="0%"   stop-color="#080f1c"/>'
    + '<stop offset="100%" stop-color="#020609"/>'
    + '</linearGradient>'

    // Glow blob hijau — kiri atas
    + '<radialGradient id="blob1" cx="0%" cy="0%" r="70%">'
    + '<stop offset="0%"   stop-color="#16a34a" stop-opacity=".18"/>'
    + '<stop offset="100%" stop-color="#16a34a" stop-opacity="0"/>'
    + '</radialGradient>'

    // Glow blob biru — kanan bawah
    + '<radialGradient id="blob2" cx="100%" cy="100%" r="60%">'
    + '<stop offset="0%"   stop-color="#0ea5e9" stop-opacity=".10"/>'
    + '<stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>'
    + '</radialGradient>'

    // Gradient aksen header pill
    + '<linearGradient id="pillGrad" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%"   stop-color="#16a34a"/>'
    + '<stop offset="100%" stop-color="#0d9488"/>'
    + '</linearGradient>'

    // Gradient border kartu — glow hijau
    + '<linearGradient id="borderGrad" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%"   stop-color="#22c55e" stop-opacity=".5"/>'
    + '<stop offset="50%"  stop-color="#0ea5e9" stop-opacity=".25"/>'
    + '<stop offset="100%" stop-color="#22c55e" stop-opacity=".15"/>'
    + '</linearGradient>'

    // Glass panel QR
    + '<linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%"   stop-color="#ffffff" stop-opacity=".06"/>'
    + '<stop offset="100%" stop-color="#ffffff" stop-opacity=".02"/>'
    + '</linearGradient>'

    // Clip card
    + '<clipPath id="cardClip"><rect width="' + W + '" height="' + H + '" rx="28"/></clipPath>'

    // Filter glow QR border
    + '<filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feGaussianBlur stdDeviation="4" result="blur"/>'
    + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>'

    + '</defs>'

    // ── Background ────────────────────────────────────────────
    + '<g clip-path="url(#cardClip)">'
    + '<rect width="' + W + '" height="' + H + '" fill="url(#bgGrad)"/>'

    // Blob glow kiri atas
    + '<rect width="' + W + '" height="' + H + '" fill="url(#blob1)"/>'
    // Blob glow kanan bawah
    + '<rect width="' + W + '" height="' + H + '" fill="url(#blob2)"/>'

    // Pola titik halus (dot grid) — dekoratif
    + '<pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">'
    + '<circle cx="1" cy="1" r="0.8" fill="#ffffff" opacity=".04"/>'
    + '</pattern>'
    + '<rect width="' + W + '" height="' + H + '" fill="url(#dots)"/>'

    // ── Header ────────────────────────────────────────────────
    // Icon billiard — lingkaran solid gelap
    + '<circle cx="44" cy="52" r="24" fill="#0d1f12" stroke="#22c55e33" stroke-width="1.5"/>'
    // Highlight dalam bola
    + '<circle cx="37" cy="45" r="7" fill="#ffffff" opacity=".8"/>'
    + '<circle cx="44" cy="52" r="3" fill="#111" opacity=".5"/>'
    // Ring luar tipis
    + '<circle cx="44" cy="52" r="24" fill="none" stroke="#22c55e" stroke-width="1" opacity=".4"/>'

    // Nama arena
    + '<text x="80" y="44"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="21" font-weight="800" fill="#f1f5f9" letter-spacing=".3">' + ARENA + '</text>'

    // Pill badge "MEMBER CARD"
    + '<rect x="80" y="54" width="102" height="18" rx="9" fill="url(#pillGrad)" opacity=".85"/>'
    + '<text x="131" y="67"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle"'
    + ' letter-spacing="2">MEMBER CARD</text>'

    // Garis pemisah tipis
    + '<line x1="24" y1="92" x2="376" y2="92" stroke="#ffffff" stroke-width=".5" opacity=".06"/>'

    // ── Panel QR (glass card) ─────────────────────────────────
    // Shadow bawah
    + '<rect x="44" y="116" width="312" height="312" rx="22" fill="#000000" opacity=".45"/>'
    // Glass panel
    + '<rect x="40" y="112" width="320" height="312" rx="22" fill="url(#glassGrad)"/>'
    // Border glow
    + '<rect x="40" y="112" width="320" height="312" rx="22"'
    + ' fill="none" stroke="#22c55e" stroke-width="1" opacity=".2"'
    + ' filter="url(#glowGreen)"/>'
    // White inner QR background — lebih kecil dari panel
    + '<rect x="52" y="124" width="296" height="288" rx="16" fill="#ffffff"/>'
    // QR image
    + '<image href="' + qrPng + '" x="60" y="132" width="280" height="272"/>'

    // Logo center QR — "mata" billiard
    + '<rect x="182" y="254" width="36" height="36" rx="7" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>'
    + '<circle cx="200" cy="272" r="13" fill="#080f1c" stroke="#22c55e" stroke-width="1.5"/>'
    + '<circle cx="194" cy="266" r="4" fill="#ffffff" opacity=".85"/>'

    // ── Info section ──────────────────────────────────────────
    // Divider gradient
    + '<line x1="24" y1="446" x2="376" y2="446" stroke="#ffffff" stroke-width=".5" opacity=".06"/>'

    // Label NAMA — caps kecil
    + '<text x="' + CX + '" y="472"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="9" font-weight="700" fill="#4d7c6a" text-anchor="middle"'
    + ' letter-spacing="3">NAMA MEMBER</text>'

    // Nama member
    + '<text x="' + CX + '" y="500"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="22" font-weight="800" fill="#f1f5f9" text-anchor="middle"'
    + ' letter-spacing=".2">' + NAMA + '</text>'

    // Pill kode — background gelap
    + '<rect x="' + (CX - 76) + '" y="512" width="152" height="26" rx="13"'
    + ' fill="#0d2218" stroke="#22c55e" stroke-width="1" opacity="1"/>'
    + '<text x="' + CX + '" y="530"'
    + ' font-family="\'Courier New\',Courier,monospace"'
    + ' font-size="12" font-weight="700" fill="#4ade80" text-anchor="middle"'
    + ' letter-spacing="3">' + KODE + '</text>'

    // Instruksi bawah
    + '<text x="' + CX + '" y="562"'
    + ' font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"'
    + ' font-size="10" fill="#1e4033" text-anchor="middle"'
    + ' letter-spacing="1.5">Scan QR ini untuk check-in</text>'

    + '</g>'

    // ── Border kartu luar — gradient glow ─────────────────────
    + '<rect x="1" y="1" width="398" height="578" rx="27"'
    + ' fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>'

    + '</svg>';

  // 4. Encode base64
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
  const ARENA = escSvg(CONFIG.NAMA_ARENA);
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
