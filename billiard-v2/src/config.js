// src/config.js
// ── Semua konfigurasi dari environment variables ──────────────

import { existsSync } from "fs";
import { join } from "path";

export const CONFIG = Object.freeze({
  PORT:       parseInt(process.env.PORT)       || 3000,
  NAMA_ARENA: process.env.NAMA_ARENA           ?? "Warpat Jombang",
  BATAS_MAIN: parseInt(process.env.BATAS_MAIN) || 10,
  BATAS_HARI: parseInt(process.env.BATAS_HARI) || 30,
  ADMIN_PIN:    process.env.ADMIN_PIN            ?? "1234",
  KASIR_PIN:    process.env.KASIR_PIN            ?? "5678",
  FINANCE_PIN:  process.env.FINANCE_PIN          ?? "2024",
  KODE_PREFIX: process.env.KODE_PREFIX          ?? "JMB",
  JWT_SECRET:  process.env.JWT_SECRET           ?? "billiard-warpat-secret-2026",
  JWT_EXPIRES: process.env.JWT_EXPIRES          ?? "24h",

  // Path database — pakai Railway Volume jika ada
  DATA_DIR:   existsSync("/data") ? "/data" : process.cwd(),
  get DB_PATH()  { return join(this.DATA_DIR, "db.json");  },
  get LOG_PATH() { return join(this.DATA_DIR, "log.json"); },

  // Tips billiard harian
  TIPS: [
    "Sesi malam lebih sepi — meja lebih leluasa, fokus lebih tajam.",
    "Ajak teman datang bareng, bonus referral menanti!",
    "Posisi tubuh yang rileks = bidikan lebih akurat. Jangan tegang.",
    "Konsisten datang di jam yang sama bantu bangun ritme permainan.",
    "Tantang pemain lain untuk sparring — cara terbaik naik level.",
    "Pegang stik di bagian belakang untuk kontrol maksimal.",
    "Break dulu kalau sudah 2 jam — fokus kembali, permainan makin tajam.",
  ],
});

export const getTip = () => CONFIG.TIPS[new Date().getDay() % CONFIG.TIPS.length];
