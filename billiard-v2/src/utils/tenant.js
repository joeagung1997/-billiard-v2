// src/utils/tenant.js
// ── Multi-tenant: konteks "warung aktif" per-request (AsyncLocalStorage) ──
//
// Mekanisme "sulit lupa": daripada mengoper warungId manual ke ratusan call-site
// db.js (rawan terlewat → diam-diam jatuh ke warung 1), kita simpan warung aktif
// di async-context per request. Fungsi db.js default-nya membaca konteks ini
// (currentWarungId()), jadi SETIAP query otomatis ter-scope tanpa perlu diingat.
// Parameter `warungId` eksplisit tetap ada sebagai override (dipakai cron yang
// memproses banyak warung via runWithTenant).
//
// Alur:
//   1. tenantContext (middleware global di app.js) buka store {warungId:1} per
//      request — dipasang SEBELUM router.
//   2. middleware auth (requireAdmin / requireFinanceAuth / requireApiAuth /
//      cek _frt di sdm.js) panggil setRequestWarung(req, <dari token>) →
//      update store + req.warungId begitu warung diketahui dari token.
//   3. handler memanggil db.js tanpa argумen → default = currentWarungId().
//
// Request publik tanpa auth (scan/checkin) → store tetap 1 (Warpat). Resolusi
// warung dari kode + KASIR_PIN per-warung menyusul di onboarding.

import { AsyncLocalStorage } from "node:async_hooks";

export const DEFAULT_WARUNG_ID = 1;

const tenantStore = new AsyncLocalStorage();

const normId = (v) => (Number.isInteger(v) && v > 0 ? v : DEFAULT_WARUNG_ID);

// Express middleware: buka async-context tenant utk request ini. Store berupa
// objek MUTABLE supaya middleware auth (jalan setelah ini) bisa update warungId
// setelah token diverifikasi, dan handler hilir membaca nilai final.
export function tenantContext(req, _res, next) {
  tenantStore.run({ warungId: DEFAULT_WARUNG_ID }, () => next());
}

// Set warung aktif utk request (dipanggil middleware auth). Update store async
// + req.warungId (dua-duanya, supaya getWarungId(req) & currentWarungId() sinkron).
export function setRequestWarung(req, warungId) {
  const id = normId(warungId);
  if (req) req.warungId = id;
  const store = tenantStore.getStore();
  if (store) store.warungId = id;
  return id;
}

// Jalankan fn dalam konteks warung tertentu (utk cron yg memproses per-warung,
// di luar siklus request). Semua db.js call di dalam fn auto-scope ke warungId.
export function runWithTenant(warungId, fn) {
  return tenantStore.run({ warungId: normId(warungId) }, fn);
}

// Default warung utk fungsi db.js — dibaca dari async-context request aktif.
// Tanpa konteks (mis. cron tanpa runWithTenant) → fallback Warpat (1).
export function currentWarungId() {
  const store = tenantStore.getStore();
  return store ? normId(store.warungId) : DEFAULT_WARUNG_ID;
}

// Baca warung dari objek request (mis. di handler yg tidak di belakang auth
// middleware). Fallback 1.
export function getWarungId(req) {
  return normId(req && req.warungId);
}

// ── Brand per-request (opsional) ──────────────────────────────────
// Disimpan di store async oleh gate langganan / resolver slug (dari baris
// warung). Dibaca helper sinkron di utils/brand.js (arenaName dll). Warung 1
// (Warpat) tidak di-load → helper fallback ke CONFIG = nilai Warpat.
export function setRequestBrand(brand) {
  const store = tenantStore.getStore();
  if (store) store.brand = brand;
}

export function currentBrand() {
  const store = tenantStore.getStore();
  return store ? store.brand || null : null;
}

// Set brand dari baris tabel `warung` (kolom snake_case → camelCase).
export function setRequestBrandFromRow(w) {
  if (!w) return;
  setRequestBrand({
    nama:       w.nama,
    nomorWa:    w.nomor_wa,
    kodePrefix: w.kode_prefix,
    waNotif:    w.wa_notif_number,
  });
}
