// src/middleware/subscription.js
// ── Gate langganan multi-tenant (C7) ─────────────────────────────
//
// Tolak akses kalau status_langganan warung 'nonaktif' atau trial sudah lewat.
// Dicek setelah auth tahu warung (currentWarungId() / req.warungId terisi).
//
// Aturan aman:
//   • Warung 1 (Warpat) SELALU lolos — tidak pernah terkunci (fail-safe).
//   • Query status di-cache 60 dtk per warung → overhead per-request minim.
//   • Fail-OPEN kalau query gagal (blip DB jangan mengunci pengguna).
// Belum ada payment gateway — status diubah manual (admin/SQL).

import { getWarungById } from "../utils/db.js";
import { currentWarungId, DEFAULT_WARUNG_ID, setRequestBrandFromRow, setRequestModules, OPTIONAL_MODULES } from "../utils/tenant.js";
import { resultPage } from "../views/member.js";

// Parse kolom warung.active_modules → array. NULL (warung lama belum di-set,
// jarang krn sudah di-backfill) → semua opsional (aman, tak sembunyikan fitur).
function modulesOf(row) {
  if (!row || row.active_modules == null) return OPTIONAL_MODULES.slice();
  return String(row.active_modules).split(",").map((s) => s.trim()).filter(Boolean);
}

const TTL_MS = 60 * 1000;
const cache = new Map(); // warungId -> { ok, exp }

// True kalau baris warung masih boleh akses (aktif / trial belum lewat).
export function isActiveRow(w) {
  if (!w) return false;
  if (w.status_langganan === "nonaktif") return false;
  if (w.status_langganan === "trial") {
    if (!w.trial_selesai) return true;                          // trial tanpa batas
    return new Date(w.trial_selesai).getTime() >= Date.now();   // trial belum lewat
  }
  return true; // 'aktif' (atau status lain yg tidak memblokir)
}

// True kalau warung boleh akses. Warung 1 selalu true. Cache 60 dtk.
export async function isWarungActive(warungId) {
  if (warungId === DEFAULT_WARUNG_ID) {            // warung 1 (Warpat) → selalu penuh
    setRequestModules(OPTIONAL_MODULES.slice());   // semua modul aktif
    return true;                                    // brand fallback ke CONFIG
  }
  const now = Date.now();
  const c = cache.get(warungId);
  if (c && c.exp > now) { setRequestBrandFromRow(c.row); setRequestModules(modulesOf(c.row)); return c.ok; }
  let ok = true, row = null; // fail-open default
  try {
    row = await getWarungById(warungId);
    ok = isActiveRow(row);
  } catch (err) {
    console.error("[SUB] cek status warung gagal (fail-open):", err.message);
  }
  cache.set(warungId, { ok, row, exp: now + TTL_MS });
  setRequestBrandFromRow(row);   // muat brand warung ke konteks utk view
  setRequestModules(modulesOf(row)); // muat modul aktif utk sidebar & guard
  return ok;
}

// Buang cache 1 warung → perubahan status/modul langsung berlaku (tak tunggu TTL).
// Dipanggil setelah superadmin ubah langganan/modul (db.js).
export function invalidateWarung(warungId) {
  cache.delete(warungId);
}

// Express middleware (web): hentikan render kalau langganan tidak aktif.
export async function subscriptionGate(req, res, next) {
  if (await isWarungActive(currentWarungId())) return next();
  res.status(403).send(resultPage("error", {
    judul: "Langganan Tidak Aktif",
    pesan: "Masa aktif / trial warung ini sudah berakhir. Hubungi admin untuk mengaktifkan kembali.",
  }));
}
