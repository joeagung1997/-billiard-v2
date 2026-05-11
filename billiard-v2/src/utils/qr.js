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

export const buildScanUrl = (req, kode) =>
  req.protocol + "://" + req.get("host") + "/scan?id=" + kode;

// ── Escape karakter SVG ───────────────────────────────────────
const escSvg = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// ── Branded QR Card ───────────────────────────────────────────
// Generate kartu SVG bertema billiard dengan QR embedded sebagai PNG base64.
// Tidak ada emoji di dalam SVG — diganti shape SVG murni agar kompatibel
// di semua browser dan environment render.
export const brandedQrCard = async ({ text, nama, kode }) => {
  // 1. Generate QR sebagai PNG base64
  const qrPng = await QRCode.toDataURL(text, {
    ...QR_OPTIONS,
    type:  "image/png",
    width: 280,
    margin: 1,
  });

  // 2. Hitung semua nilai sebelum masuk ke string SVG
  const W      = 400;
  const H      = 530;
  const W2     = W - 2;
  const H2     = H - 2;
  const WH     = W / 2;         // center X = 200
  const ARENA  = escSvg(CONFIG.NAMA_ARENA);
  const NAMA   = escSvg(nama.length > 22 ? nama.slice(0, 20) + "…" : nama);
  const KODE   = escSvg(kode);

  // 3. Bangun SVG dengan string concatenation — zero backtick
  const svg = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'

    + '<defs>'
    + '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="#0d1b2e"/>'
    + '<stop offset="100%" stop-color="#050d1a"/>'
    + '</linearGradient>'
    + '<linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0%" stop-color="#14532d"/>'
    + '<stop offset="100%" stop-color="#15803d"/>'
    + '</linearGradient>'
    + '<clipPath id="cc"><rect width="' + W + '" height="' + H + '" rx="24"/></clipPath>'
    + '</defs>'

    + '<g clip-path="url(#cc)">'

    // Background
    + '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>'

    // Dekorasi lingkaran
    + '<circle cx="' + W + '" cy="' + H + '" r="200" fill="#0a1f1a" opacity=".35"/>'
    + '<circle cx="' + W + '" cy="' + H + '" r="120" fill="#0d2a1e" opacity=".30"/>'
    + '<circle cx="0" cy="0" r="100" fill="#0a1a0f" opacity=".25"/>'

    // Header
    + '<rect x="0" y="0" width="' + W + '" height="116" fill="url(#hdr)"/>'

    // Ikon billiard — lingkaran + titik (pengganti emoji 🎱)
    + '<circle cx="44" cy="64" r="26" fill="#111" stroke="#22c55e" stroke-width="2"/>'
    + '<circle cx="36" cy="56" r="8" fill="#fff" opacity=".9"/>'
    + '<circle cx="44" cy="64" r="3" fill="#333" opacity=".5"/>'

    // Nama arena
    + '<text x="80" y="50"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="20" font-weight="700" fill="#ffffff">' + ARENA + '</text>'

    // Label MEMBER CARD
    + '<text x="80" y="72"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="11" fill="#86efac" letter-spacing="3" font-weight="600">MEMBER CARD</text>'

    // Aksen bawah header
    + '<rect x="0" y="113" width="' + W + '" height="3" fill="#22c55e" opacity=".5"/>'
    + '<rect x="0" y="113" width="80" height="3" fill="#22c55e" opacity=".9"/>'

    // QR area — shadow
    + '<rect x="58" y="142" width="284" height="284" rx="18" fill="#000" opacity=".4"/>'
    // QR area — white card
    + '<rect x="56" y="138" width="288" height="288" rx="18" fill="#ffffff"/>'
    // QR image embedded
    + '<image href="' + qrPng + '" x="60" y="142" width="280" height="280"/>'

    // Logo center overlay — lingkaran billiard kecil
    + '<rect x="178" y="258" width="44" height="44" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>'
    + '<circle cx="200" cy="280" r="16" fill="#0d1b2e" stroke="#22c55e" stroke-width="1.5"/>'
    + '<circle cx="194" cy="274" r="5" fill="#fff" opacity=".85"/>'

    // Divider
    + '<line x1="40" y1="446" x2="360" y2="446" stroke="#1e3a30" stroke-width="1"/>'

    // Label NAMA MEMBER
    + '<text x="' + WH + '" y="468"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="10" fill="#4a7060" text-anchor="middle"'
    + ' letter-spacing="2.5" font-weight="700">NAMA MEMBER</text>'

    // Nama member
    + '<text x="' + WH + '" y="492"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="20" font-weight="700" fill="#e8edf5"'
    + ' text-anchor="middle">' + NAMA + '</text>'

    // Kode member
    + '<text x="' + WH + '" y="513"'
    + ' font-family="Courier New,Courier,monospace"'
    + ' font-size="13" fill="#22c55e" text-anchor="middle"'
    + ' letter-spacing="2.5" font-weight="600">' + KODE + '</text>'

    // Footer
    + '<rect x="0" y="523" width="' + W + '" height="7" fill="#0a1422"/>'
    + '<text x="' + WH + '" y="528"'
    + ' font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    + ' font-size="10" fill="#2a4a40" text-anchor="middle"'
    + ' letter-spacing="1.5">Scan QR ini untuk check-in</text>'

    + '</g>'

    // Border kartu
    + '<rect x="1" y="1" width="' + W2 + '" height="' + H2 + '" rx="23"'
    + ' fill="none" stroke="#22c55e" stroke-width="1.5" opacity=".25"/>'

    + '</svg>';

  // 4. Encode ke base64 — aman di-embed sebagai img src
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return {
    svg,
    encoded:    "data:image/svg+xml;base64," + b64,
    dataBase64: b64,
  };
};
