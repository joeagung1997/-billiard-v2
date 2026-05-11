// src/utils/qr.js
// ── QR code generator pakai library qrcode ───────────────────

import QRCode from "qrcode";

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
