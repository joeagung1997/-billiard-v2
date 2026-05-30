// src/utils/tenant.js
// ── Multi-tenant: penentuan "warung aktif" dari sebuah request ─────
//
// Satu sumber terpusat untuk membaca warung_id dari request. Dipakai oleh
// route/middleware sebelum memanggil fungsi db.js. Sumber kebenaran dibangun
// bertahap:
//   - C3: warung_id dari klaim token (session ?tk= / cookie _frt / Bearer /
//         SDM) = OTORITATIF untuk otorisasi data.
//   - C4: slug dari path /w/:slug → di-cross-check harus cocok dgn token
//         (mencegah pakai cookie warung A di /w/<slug-B>/).
//
// Tahap sekarang (C0): selalu kembalikan Warpat (1) supaya perilaku aplikasi
// TIDAK berubah sampai auth & routing di-wire. Middleware C4 nanti akan meng-set
// `req.warungId`; helper ini membacanya kalau sudah ada, fallback ke 1.
export const DEFAULT_WARUNG_ID = 1;

/**
 * Ambil warung_id aktif untuk request ini.
 * @param {import('express').Request} [req]
 * @returns {number}
 */
export function getWarungId(req) {
  // C3 ✓: req.warungId di-set middleware auth (admin/finance/api) dari klaim token.
  // TODO(C4): cross-check dengan slug path /w/:slug (tolak kalau token ≠ slug).
  const id = req && req.warungId;
  return Number.isInteger(id) && id > 0 ? id : DEFAULT_WARUNG_ID;
}
