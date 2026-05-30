// src/utils/brand.js
// ── Branding aktif (nama / WA / prefix kode) untuk view sinkron ───
//
// Baca brand warung aktif dari async-context tenant (di-load oleh gate
// langganan di subscription.js & resolver slug di routes/warung.js). Fallback
// ke CONFIG = nilai Warpat (warung 1) → output warung 1 byte-identik dgn sebelum
// multi-tenant. View memanggil arenaName()/arenaWa() menggantikan CONFIG.NAMA_ARENA
// / CONFIG.NOMOR_WA langsung, supaya otomatis ikut warung aktif.

import { CONFIG } from "../config.js";
import { currentBrand } from "./tenant.js";

export const arenaName    = () => currentBrand()?.nama       ?? CONFIG.NAMA_ARENA;
export const arenaWa      = () => currentBrand()?.nomorWa    ?? CONFIG.NOMOR_WA;
export const arenaPrefix  = () => currentBrand()?.kodePrefix ?? CONFIG.KODE_PREFIX;
export const arenaWaNotif = () => currentBrand()?.waNotif    ?? CONFIG.WA_NOTIF_NUMBER;
