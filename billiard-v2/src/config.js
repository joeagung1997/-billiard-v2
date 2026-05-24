// src/config.js
// ── Semua konfigurasi dari environment variables ──────────────
//
// ⚠️  ENV VARS WAJIB di-set di production (Railway/Vercel dashboard):
//
//   JWT_SECRET            — random ≥32 char (mis. `openssl rand -hex 32`)
//   ADMIN_PIN             — PIN untuk REST API /api/v1/auth role 'admin'
//   KASIR_PIN             — PIN kasir
//   OWNER_ADMIN_PIN       — PIN untuk username admin owner
//   KARYAWAN1_ADMIN_PIN   — PIN untuk username karyawan 1
//   KARYAWAN2_ADMIN_PIN   — PIN untuk username karyawan 2
//   KARYAWAN3_ADMIN_PIN   — PIN untuk username karyawan 3
//   OWNER_PIN             — PIN /operasional untuk owner (atau set FINANCE_PIN)
//   KARYAWAN_PIN          — PIN /operasional untuk karyawan
//   FINANCE_PIN           — PIN /operasional (legacy alias OWNER_PIN; cukup salah satu)
//   SDM_PIN               — PIN modul SDM (dipakai di src/routes/sdm.js)
//   SDM_SECRET            — random key utk HMAC token SDM (src/routes/sdm.js)
//   DATABASE_URL          — PostgreSQL connection string
//
// Optional env vars (ada default aman):
//   PORT, NAMA_ARENA, BATAS_MAIN, BATAS_HARI, JWT_EXPIRES, KODE_PREFIX,
//   NOMOR_WA, BUSINESS_DAY_CUTOFF_HOUR

import { existsSync } from "fs";
import { join } from "path";

// Fail-loud: kalau env var sensitif ga di-set, throw error daripada pakai
// default yang vulnerable (kasus sebelumnya: PIN '2024' & JWT_SECRET predictable
// terexpos di public repo, bypass-able penuh oleh siapa pun yg baca code).
function requireSecret(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `[CONFIG] Missing required env var: ${name}\n` +
      `→ Set di Railway/Vercel dashboard sebelum deploy.\n` +
      `→ Lihat header src/config.js untuk daftar lengkap env vars yang wajib.`
    );
  }
  return v;
}

export const CONFIG = Object.freeze({
  PORT:       parseInt(process.env.PORT)       || 3000,
  NAMA_ARENA: process.env.NAMA_ARENA           ?? "Warpat Jombang",
  BATAS_MAIN: parseInt(process.env.BATAS_MAIN) || 10,
  BATAS_HARI: parseInt(process.env.BATAS_HARI) || 30,

  // REST API /api/v1/auth — role 'admin' butuh ADMIN_PIN, role 'finance' butuh FINANCE_PIN
  ADMIN_PIN: requireSecret("ADMIN_PIN"),
  KASIR_PIN: requireSecret("KASIR_PIN"),

  // Multi-user admin: tiap user punya username + PIN + role sendiri.
  // Username adalah identifier (bukan rahasia), tapi PIN WAJIB dari env.
  ADMIN_USERS: [
    { username: "agung97",  pin: requireSecret("OWNER_ADMIN_PIN"),     role: "owner"    },
    { username: "ardu11",   pin: requireSecret("KARYAWAN1_ADMIN_PIN"), role: "karyawan" },
    { username: "zidank22", pin: requireSecret("KARYAWAN2_ADMIN_PIN"), role: "karyawan" },
    { username: "zidanb33", pin: requireSecret("KARYAWAN3_ADMIN_PIN"), role: "karyawan" },
  ],

  // Role-based PIN untuk /operasional: owner (akses penuh) vs karyawan
  // (catat + lihat hari ini). FINANCE_PIN dipertahankan sbg legacy fallback
  // OWNER_PIN biar deploy lama yg cuma set FINANCE_PIN tetep jalan.
  OWNER_PIN:    process.env.OWNER_PIN || requireSecret("FINANCE_PIN"),
  KARYAWAN_PIN: requireSecret("KARYAWAN_PIN"),
  FINANCE_PIN:  process.env.FINANCE_PIN || requireSecret("OWNER_PIN"),

  // Business day cutoff: jam (00:00 - cutoff:00) dianggap masih shift hari
  // sebelumnya. Contoh: cutoff=6 → transaksi jam 01:30 tgl 24 Mei → catat ke
  // tgl 23 Mei (shift tgl 23 yg belum tutup). Owner buka 09:00-02:00, jadi
  // 6 = aman utk shift terlambat sampai pagi.
  BUSINESS_DAY_CUTOFF_HOUR: parseInt(process.env.BUSINESS_DAY_CUTOFF_HOUR ?? "6", 10),
  KODE_PREFIX: process.env.KODE_PREFIX ?? "JMB",

  JWT_SECRET:  requireSecret("JWT_SECRET"),
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? "24h",

  // Nomor WA Warpat Jombang — dipakai untuk tombol booking di kartu member.
  // Bukan rahasia (publish utk customer); default aman karena warpat tunggal.
  NOMOR_WA: process.env.NOMOR_WA ?? "6281519210552",

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
