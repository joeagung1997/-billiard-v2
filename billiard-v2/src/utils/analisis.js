// src/utils/analisis.js
// ── Analisis target operasional ────────────────────────────────
// Hitung target pemasukan & status berdasarkan biaya wajib di DB
// (tabel fixed_costs). Owner bisa CRUD via /operasional/analisis.

import { readFixedCosts } from "./db.js";

// ── Convert per-item nominal → biaya per bulan ────────────────
// Asumsi: 30 hari/bulan, 4.286 minggu/bulan
function toMonthly(item) {
  switch (item.frekuensi) {
    case "harian":   return item.nominal * 30;
    case "mingguan": return Math.round(item.nominal * 30 / 7);
    case "bulanan":
    default:         return item.nominal;
  }
}

// ── Compute total + breakdown dari list items ──────────────────
export function computeFromItems(items) {
  const total = items.reduce((s, x) => s + toMonthly(x), 0);
  const itemsWithMonthly = items.map((x) => ({
    ...x,
    perBulan: toMonthly(x),
    share:    total > 0 ? toMonthly(x) / total : 0,
  }));
  return {
    items:        itemsWithMonthly,
    totalMonthly: total,
    totalDaily:   Math.round(total / 30),
  };
}

// ── Target per scope ───────────────────────────────────────────
export function computeTargetsFromTotal(monthly) {
  const hari   = Math.round(monthly / 30);
  const minggu = Math.round(monthly / 30 * 7);
  return { hari, minggu, bulan: monthly };
}

// ── Load semua dari DB → return { breakdown, targets } ─────────
export async function loadAnalisisData() {
  const items     = await readFixedCosts();
  const breakdown = computeFromItems(items);
  const targets   = computeTargetsFromTotal(breakdown.totalMonthly);
  return { breakdown, targets };
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
export function evaluateAddKaryawan(rataPemasukanHarian, totalMonthlyBiaya, gajiTambahan = 900000) {
  const tambahanHarian = gajiTambahan / 30;
  const totalBiayaBaru = totalMonthlyBiaya / 30 + tambahanHarian;
  const marginLama  = rataPemasukanHarian - (totalMonthlyBiaya / 30);
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
