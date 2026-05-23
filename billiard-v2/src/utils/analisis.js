// src/utils/analisis.js
// ── Analisis target operasional ────────────────────────────────
// Hitung total biaya wajib (fixed + daily + meal), target pemasukan
// per hari/minggu/bulan, dan status (minus / sepi / target / ramai / ramai sekali).

// ── Fixed costs (default value, hard-coded). Bisa di-override via env. ──
export const FIXED_COSTS = {
  monthly: [
    { name: "WiFi",                amount: parseInt(process.env.COST_WIFI     ?? "455000",  10) },
    { name: "Gaji 3 orang (total)", amount: parseInt(process.env.COST_GAJI     ?? "2700000", 10) },
    { name: "Token listrik",       amount: parseInt(process.env.COST_LISTRIK  ?? "1000000", 10) },
  ],
  daily: [
    { name: "Bensin",       amount: parseInt(process.env.COST_BENSIN ?? "10000", 10) },
    { name: "Air mineral",  amount: parseInt(process.env.COST_AIR    ?? "10000", 10) },
  ],
  meal: {
    regular: parseInt(process.env.COST_MAKAN_REGULER ?? "25000", 10), // per hari (Min-Jum)
    weekend: parseInt(process.env.COST_MAKAN_WEEKEND ?? "35000", 10), // per hari (Sabtu malam)
  },
};

// ── Estimasi biaya makan per bulan ─────────────────────────────
// Dalam 1 bulan rata-rata 4 Sabtu, sisanya hari regular.
function estimateMealMonthly() {
  const sabtuCount = 4;
  const regularDays = 30 - sabtuCount;
  return regularDays * FIXED_COSTS.meal.regular + sabtuCount * FIXED_COSTS.meal.weekend;
}

// ── Total biaya wajib per bulan ────────────────────────────────
export function computeMonthlyCost() {
  const monthly = FIXED_COSTS.monthly.reduce((s, x) => s + x.amount, 0);
  const daily   = FIXED_COSTS.daily.reduce((s, x) => s + x.amount, 0) * 30;
  const meal    = estimateMealMonthly();
  return monthly + daily + meal;
}

// ── Target per scope ───────────────────────────────────────────
export function computeTargets() {
  const bulan   = computeMonthlyCost();
  const hari    = Math.round(bulan / 30);
  const minggu  = Math.round(bulan / 30 * 7);
  return { hari, minggu, bulan };
}

// ── Breakdown biaya untuk display ──────────────────────────────
export function buildCostBreakdown() {
  const monthly = FIXED_COSTS.monthly.reduce((s, x) => s + x.amount, 0);
  const dailyPerHari = FIXED_COSTS.daily.reduce((s, x) => s + x.amount, 0);
  const dailyMonth = dailyPerHari * 30;
  const meal = estimateMealMonthly();
  const total = monthly + dailyMonth + meal;

  return {
    monthly: FIXED_COSTS.monthly.map((x) => ({ ...x, share: x.amount / total })),
    daily:   FIXED_COSTS.daily.map((x)   => ({ ...x, perBulan: x.amount * 30, share: (x.amount * 30) / total })),
    meal: {
      regular: FIXED_COSTS.meal.regular,
      weekend: FIXED_COSTS.meal.weekend,
      perBulan: meal,
      share: meal / total,
    },
    totalMonthly: total,
    totalDaily:   Math.round(total / 30),
  };
}

// ── Status berdasarkan rasio pemasukan vs biaya ─────────────────
// 1. Minus           — rugi (pemasukan < biaya)
// 2. Sepi            — impas tipis (1.0× – 1.2×)
// 3. Target Tercapai — cukup biaya + margin kecil (1.2× – 1.7×)
// 4. Ramai           — margin bagus (1.7× – 2.5×)
// 5. Ramai Sekali    — margin sangat bagus (≥ 2.5×)
export function computeStatus(pemasukan, biaya) {
  if (biaya <= 0) return { key: "na", label: "—", color: "#9ca3af", emoji: "•", ratio: 0 };
  const ratio = pemasukan / biaya;
  if (ratio < 1)    return { key: "minus", label: "Minus",           color: "#ef4444", emoji: "📉", ratio };
  if (ratio < 1.2)  return { key: "sepi",  label: "Sepi",            color: "#9ca3af", emoji: "😴", ratio };
  if (ratio < 1.7)  return { key: "target",label: "Target Tercapai", color: "#22c55e", emoji: "✅", ratio };
  if (ratio < 2.5)  return { key: "ramai", label: "Ramai",           color: "#3b82f6", emoji: "🔥", ratio };
  return                  { key: "ramai_sekali", label: "Ramai Sekali", color: "#a855f7", emoji: "🚀", ratio };
}

// ── Rekomendasi tambah karyawan ─────────────────────────────────
// Berdasarkan rata-rata pemasukan terakhir vs cost setelah tambah karyawan.
export function evaluateAddKaryawan(rataPemasukanHarian, gajiTambahan = 900000) {
  const tambahanHarian = gajiTambahan / 30;
  const totalBiayaBaru = computeMonthlyCost() / 30 + tambahanHarian;
  const marginLama  = rataPemasukanHarian - (computeMonthlyCost() / 30);
  const marginBaru  = rataPemasukanHarian - totalBiayaBaru;
  const layak       = marginBaru > 0;
  const tipis       = marginBaru >= 0 && marginBaru < tambahanHarian * 0.5;

  let rekomendasi, color, emoji;
  if (!layak) {
    rekomendasi = "Belum layak — margin akan negatif Rp " + Math.abs(Math.round(marginBaru)).toLocaleString("id-ID");
    color = "#ef4444";
    emoji = "❌";
  } else if (tipis) {
    rekomendasi = "Margin tipis — perlu naikkan pemasukan dulu";
    color = "#f59e0b";
    emoji = "⚠️";
  } else {
    rekomendasi = "Layak — margin tetap positif Rp " + Math.round(marginBaru).toLocaleString("id-ID") + "/hari";
    color = "#22c55e";
    emoji = "✅";
  }

  return {
    gajiTambahan,
    tambahanHarian: Math.round(tambahanHarian),
    marginLama:     Math.round(marginLama),
    marginBaru:     Math.round(marginBaru),
    layak,
    rekomendasi,
    color,
    emoji,
  };
}
