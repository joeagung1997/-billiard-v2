// src/utils/qr.js
// ── QR code generator pakai library qrcode ───────────────────

import QRCode from "qrcode";
import { CONFIG } from "../config.js";

const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
};

export const qrDataUrl = async (text, size = 400) =>
  QRCode.toDataURL(text, { ...QR_OPTIONS, type: "image/png", width: size });

export const qrBuffer = async (text, size = 400) =>
  QRCode.toBuffer(text, { ...QR_OPTIONS, type: "png", width: size });

export const buildScanUrl = (req, kode) =>
  `${req.protocol}://${req.get("host")}/scan?id=${kode}`;

// ── Helper: escape karakter SVG ───────────────────────────────
const escSvg = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// ── Branded QR Card sebagai SVG ───────────────────────────────
// Kartu QR bertema billiard gelap dengan:
// - Header nama arena + ikon billiard
// - QR code di tengah dengan logo overlay
// - Nama member & kode di bawah
// - Tidak butuh library tambahan — murni SVG + embedded PNG
export const brandedQrCard = async ({ text, nama, kode }) => {
  const qrPng = await QRCode.toDataURL(text, {
    ...QR_OPTIONS,
    type: "image/png",
    width: 280,
    margin: 1,
  });

  const W = 400;
  const H = 530;
  const ARENA = CONFIG.NAMA_ARENA;
  const namaDisplay = nama.length > 22 ? `${nama.slice(0, 20)}…` : nama;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0d1b2e"/>
      <stop offset="100%" stop-color="#050d1a"/>
    </linearGradient>
    <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14532d"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="24"/>
    </clipPath>
  </defs>

  <g clip-path="url(#cardClip)">
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

    <!-- Dekorasi lingkaran -->
    <circle cx="${W}"  cy="${H}"  r="200" fill="#0a1f1a" opacity=".35"/>
    <circle cx="${W}"  cy="${H}"  r="120" fill="#0d2a1e" opacity=".30"/>
    <circle cx="0"    cy="0"    r="100" fill="#0a1a0f" opacity=".25"/>

    <!-- Titik dekorasi -->
    <circle cx="340" cy="80"  r="3" fill="#22c55e" opacity=".3"/>
    <circle cx="360" cy="60"  r="2" fill="#22c55e" opacity=".2"/>
    <circle cx="320" cy="95"  r="2" fill="#22c55e" opacity=".2"/>
    <circle cx="50"  cy="450" r="3" fill="#22c55e" opacity=".2"/>
    <circle cx="30"  cy="470" r="2" fill="#22c55e" opacity=".15"/>

    <!-- ── Header ──────────────────────────── -->
    <rect x="0" y="0" width="${W}" height="116" fill="url(#hdrGrad)"/>
    <line x1="${W - 80}" y1="0" x2="${W}" y2="80"
          stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <line x1="${W - 40}" y1="0" x2="${W}" y2="40"
          stroke="rgba(255,255,255,.04)" stroke-width="1"/>

    <!-- Icon -->
    <text x="28" y="64" font-size="40" font-family="serif">🎱</text>

    <!-- Nama arena -->
    <text x="80" y="50"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="21" font-weight="700" fill="#ffffff"
      letter-spacing=".3">${escSvg(ARENA)}</text>

    <!-- Sub label -->
    <text x="80" y="72"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="11" fill="#86efac" letter-spacing="3"
      font-weight="600">MEMBER CARD</text>

    <!-- Aksen bawah header -->
    <rect x="0"  y="113" width="${W}" height="3" fill="#22c55e" opacity=".5"/>
    <rect x="0"  y="113" width="80"  height="3" fill="#22c55e" opacity=".9"/>

    <!-- ── QR Area ──────────────────────────── -->
    <!-- Shadow -->
    <rect x="58" y="142" width="284" height="284" rx="18"
          fill="#000" opacity=".4"/>
    <!-- White card -->
    <rect x="56" y="138" width="288" height="288" rx="18" fill="#ffffff"/>
    <!-- QR image -->
    <image href="${qrPng}" x="60" y="142" width="280" height="280"/>
    <!-- Logo overlay tengah -->
    <rect x="178" y="258" width="44" height="44" rx="8"
          fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
    <text x="200" y="286" font-size="22"
          text-anchor="middle" dominant-baseline="middle">🎱</text>

    <!-- ── Member Info ──────────────────────── -->
    <line x1="40" y1="446" x2="${W - 40}" y2="446"
          stroke="#1e3a30" stroke-width="1"/>

    <text x="${W / 2}" y="468"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="10" fill="#4a7060" text-anchor="middle"
      letter-spacing="2.5" font-weight="700">NAMA MEMBER</text>

    <text x="${W / 2}" y="492"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="20" font-weight="700" fill="#e8edf5"
      text-anchor="middle">${escSvg(namaDisplay)}</text>

    <text x="${W / 2}" y="513"
      font-family="'Courier New',Courier,monospace"
      font-size="13" fill="#22c55e" text-anchor="middle"
      letter-spacing="2.5" font-weight="600">${escSvg(kode)}</text>

    <!-- ── Footer ──────────────────────────── -->
    <rect x="0" y="523" width="${W}" height="${H - 523}" fill="#0a1422"/>
    <text x="${W / 2}" y="527"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="10" fill="#2a4a40" text-anchor="middle"
      letter-spacing="1.5">Scan QR ini untuk check-in</text>
  </g>

  <!-- Border kartu -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="23"
        fill="none" stroke="#22c55e" stroke-width="1.5" opacity=".25"/>
</svg>`;

  // Pakai base64 agar aman di-embed sebagai src di template literal server
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return {
    svg,
    encoded:    `data:image/svg+xml;base64,${b64}`,
    dataBase64: b64,
  };
};export const brandedQrCard = async ({ text, nama, kode }) => {
  const qrPng = await QRCode.toDataURL(text, {
    ...QR_OPTIONS,
    type: "image/png",
    width: 280,
    margin: 1,
  });

  const W = 400;
  const H = 530;
  const ARENA = CONFIG.NAMA_ARENA;
  const namaDisplay = nama.length > 22 ? `${nama.slice(0, 20)}…` : nama;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0d1b2e"/>
      <stop offset="100%" stop-color="#050d1a"/>
    </linearGradient>
    <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#14532d"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="24"/>
    </clipPath>
  </defs>

  <g clip-path="url(#cardClip)">
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

    <!-- Dekorasi lingkaran -->
    <circle cx="${W}"  cy="${H}"  r="200" fill="#0a1f1a" opacity=".35"/>
    <circle cx="${W}"  cy="${H}"  r="120" fill="#0d2a1e" opacity=".30"/>
    <circle cx="0"    cy="0"    r="100" fill="#0a1a0f" opacity=".25"/>

    <!-- Titik dekorasi -->
    <circle cx="340" cy="80"  r="3" fill="#22c55e" opacity=".3"/>
    <circle cx="360" cy="60"  r="2" fill="#22c55e" opacity=".2"/>
    <circle cx="320" cy="95"  r="2" fill="#22c55e" opacity=".2"/>
    <circle cx="50"  cy="450" r="3" fill="#22c55e" opacity=".2"/>
    <circle cx="30"  cy="470" r="2" fill="#22c55e" opacity=".15"/>

    <!-- ── Header ──────────────────────────── -->
    <rect x="0" y="0" width="${W}" height="116" fill="url(#hdrGrad)"/>
    <line x1="${W - 80}" y1="0" x2="${W}" y2="80"
          stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <line x1="${W - 40}" y1="0" x2="${W}" y2="40"
          stroke="rgba(255,255,255,.04)" stroke-width="1"/>

    <!-- Icon -->
    <text x="28" y="64" font-size="40" font-family="serif">🎱</text>

    <!-- Nama arena -->
    <text x="80" y="50"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="21" font-weight="700" fill="#ffffff"
      letter-spacing=".3">${escSvg(ARENA)}</text>

    <!-- Sub label -->
    <text x="80" y="72"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="11" fill="#86efac" letter-spacing="3"
      font-weight="600">MEMBER CARD</text>

    <!-- Aksen bawah header -->
    <rect x="0"  y="113" width="${W}" height="3" fill="#22c55e" opacity=".5"/>
    <rect x="0"  y="113" width="80"  height="3" fill="#22c55e" opacity=".9"/>

    <!-- ── QR Area ──────────────────────────── -->
    <!-- Shadow -->
    <rect x="58" y="142" width="284" height="284" rx="18"
          fill="#000" opacity=".4"/>
    <!-- White card -->
    <rect x="56" y="138" width="288" height="288" rx="18" fill="#ffffff"/>
    <!-- QR image -->
    <image href="${qrPng}" x="60" y="142" width="280" height="280"/>
    <!-- Logo overlay tengah -->
    <rect x="178" y="258" width="44" height="44" rx="8"
          fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
    <text x="200" y="286" font-size="22"
          text-anchor="middle" dominant-baseline="middle">🎱</text>

    <!-- ── Member Info ──────────────────────── -->
    <line x1="40" y1="446" x2="${W - 40}" y2="446"
          stroke="#1e3a30" stroke-width="1"/>

    <text x="${W / 2}" y="468"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="10" fill="#4a7060" text-anchor="middle"
      letter-spacing="2.5" font-weight="700">NAMA MEMBER</text>

    <text x="${W / 2}" y="492"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="20" font-weight="700" fill="#e8edf5"
      text-anchor="middle">${escSvg(namaDisplay)}</text>

    <text x="${W / 2}" y="513"
      font-family="'Courier New',Courier,monospace"
      font-size="13" fill="#22c55e" text-anchor="middle"
      letter-spacing="2.5" font-weight="600">${escSvg(kode)}</text>

    <!-- ── Footer ──────────────────────────── -->
    <rect x="0" y="523" width="${W}" height="${H - 523}" fill="#0a1422"/>
    <text x="${W / 2}" y="527"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      font-size="10" fill="#2a4a40" text-anchor="middle"
      letter-spacing="1.5">Scan QR ini untuk check-in</text>
  </g>

  <!-- Border kartu -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="23"
        fill="none" stroke="#22c55e" stroke-width="1.5" opacity=".25"/>
</svg>`;

  return {
    svg,
    encoded: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
};
