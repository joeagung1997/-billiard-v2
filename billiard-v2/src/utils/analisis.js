// src/utils/analisis.js
// ── Analisis target operasional ────────────────────────────────
// Hitung target pemasukan & status berdasarkan biaya wajib di DB
// (tabel fixed_costs). Owner bisa CRUD via /operasional/analisis.

import { readFixedCosts, readSetting } from "./db.js";

export const SETTING_DANA_CADANGAN = "dana_cadangan_bulanan";

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

// ── Load semua dari DB → return { breakdown, targets, ... } ────
// danaCadangan: alokasi cadangan/darurat per bulan (input terpisah, disimpan
// di app_settings). Target "ideal" = biaya wajib + cadangan; ditampilkan sbg
// pembanding TANPA mengubah baseline biaya wajib.
export async function loadAnalisisData() {
  const items     = await readFixedCosts();
  const breakdown = computeFromItems(items);
  const targets   = computeTargetsFromTotal(breakdown.totalMonthly);
  const danaCadangan = parseInt(await readSetting(SETTING_DANA_CADANGAN, "0"), 10) || 0;
  const monthlyIdeal = breakdown.totalMonthly + danaCadangan;
  const targetsIdeal = computeTargetsFromTotal(monthlyIdeal);
  return { breakdown, targets, danaCadangan, monthlyIdeal, targetsIdeal };
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
// hariPerBulan = pembagi utk mengubah biaya BULANAN → per-hari. WAJIB sama
// dengan basis pemasukan harian yang dipakai, biar tidak campur basis:
//   • basis "30 hari kalender" → rataPemasukan = total/30,    hariPerBulan = 30
//   • basis "hari aktif"       → rataPemasukan = total/aktif, hariPerBulan = hari
//     operasi/bln (estimasi dari frekuensi hari aktif). Sebelumnya selalu /30
//     walau pemasukan /aktif → margin & gaji terlalu optimis (bug campur basis).
export function evaluateAddKaryawan(rataPemasukanHarian, totalMonthlyBiaya, gajiTambahan = 900000, hariPerBulan = 30) {
  const div = hariPerBulan > 0 ? hariPerBulan : 30;
  const biayaHarian    = totalMonthlyBiaya / div;
  const tambahanHarian = gajiTambahan / div;
  const totalBiayaBaru = biayaHarian + tambahanHarian;
  const marginLama  = rataPemasukanHarian - biayaHarian;
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
    hariPerBulan:   div,
    biayaHarian:    Math.round(biayaHarian),
    tambahanHarian: Math.round(tambahanHarian),
    marginLama:     Math.round(marginLama),
    marginBaru:     Math.round(marginBaru),
    layak,
    rekomendasi,
    color,
    emoji,
  };
}
