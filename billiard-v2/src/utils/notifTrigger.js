// src/utils/notifTrigger.js
// ── Helper: trigger notifikasi dari side-effect bisnis ──────────
// Dipisah dari db.js + analisis.js untuk hindari circular import
// (db.js & analisis.js sudah saling import).

import { addNotifikasi, readTransaksi, readKaryawan, readBahan, getWarungById } from "./db.js";
import { loadAnalisisData } from "./analisis.js";
import { KAT_TUKAR_UANG, todayBusinessDayISO } from "./format.js";
import { sendWa } from "./waSender.js";
import { CONFIG } from "../config.js";
import { arenaName, arenaWaNotif } from "./brand.js";
import { currentWarungId, setRequestBrandFromRow } from "./tenant.js";

// Filter helper: hanya transaksi pemasukan beneran (bukan void/tukar uang/piutang).
const isRevenue = (t) =>
  t.jenis === "pemasukan" &&
  !t.voidedAt &&
  t.kategori !== KAT_TUKAR_UANG &&
  t.lunas !== false;

// Hitung Monday business-day dari tanggal (ISO YYYY-MM-DD).
function mondayOf(tanggal) {
  const d = new Date(tanggal + "T00:00:00Z");
  const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  return new Date(d.getTime() - dow * 86400000).toISOString().slice(0, 10);
}

const fmtRp = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

// ── Trigger: notif tiap transaksi baru ────────────────────────
// Panggil setelah appendTransaksi sukses. Pemasukan → tipe transaksi_in
// (hijau), Pengeluaran → tipe transaksi_out (merah). dedupKey unik per
// trx.id supaya retry insert gak duplicate. Window pendek (1 jam) cukup.
export async function notifyNewTransaksi(trx) {
  try {
    if (!trx || !trx.id) return;
    const jenis = trx.jenis === "pemasukan" ? "pemasukan" : "pengeluaran";
    const tipe  = jenis === "pemasukan" ? "transaksi_in" : "transaksi_out";
    const kategori = (trx.kategori || (jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran")).toString();
    const titleHead = jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran";
    const title = titleHead + " " + kategori + ": " + fmtRp(trx.jumlah || 0);
    const parts = [];
    if (trx.subKategori) parts.push(trx.subKategori);
    if (trx.keterangan)  parts.push(trx.keterangan);
    if (trx.bayar)       parts.push("via " + trx.bayar);
    if (trx.dicatatOleh) parts.push("oleh " + trx.dicatatOleh);
    const pesan = parts.join(" • ");
    const link  = trx.tanggal
      ? "/operasional/transaksi?tgl_dari=" + trx.tanggal + "&tgl_sampai=" + trx.tanggal
      : "/operasional/transaksi";

    await addNotifikasi({
      tipe,
      prioritas: "info",
      title,
      pesan,
      link,
      meta: {
        trxId:       trx.id,
        jenis,
        kategori,
        subKategori: trx.subKategori || "",
        jumlah:      trx.jumlah || 0,
        tanggal:     trx.tanggal || "",
        bayar:       trx.bayar || "",
        dicatatOleh: trx.dicatatOleh || "",
      },
      dedupKey: "trx:" + trx.id,
      dedupWindowHours: 1,
    });
  } catch (err) {
    console.error("[notif] notifyNewTransaksi error:", err.message);
  }
}

// ── Trigger: target tercapai (harian/mingguan/bulanan) ──────────
// Panggil setelah appendTransaksi (pemasukan). Re-compute totals + bandingkan
// dgn target. Idempotent via dedupKey: skip kalau notif scope+date sama
// sudah ada dlm 24 jam.
export async function checkAndNotifyTarget(tanggal) {
  if (!tanggal) return;
  try {
    const [transaksi, analData] = await Promise.all([
      readTransaksi(),
      loadAnalisisData(),
    ]);
    const targets = analData.targets || { hari: 0, minggu: 0, bulan: 0 };
    const monday  = mondayOf(tanggal);
    const mtd     = tanggal.slice(0, 7);

    const inHari   = transaksi.filter((t) => isRevenue(t) && t.tanggal === tanggal).reduce((s, t) => s + (t.jumlah || 0), 0);
    const inMinggu = transaksi.filter((t) => isRevenue(t) && t.tanggal >= monday && t.tanggal <= tanggal).reduce((s, t) => s + (t.jumlah || 0), 0);
    const inBulan  = transaksi.filter((t) => isRevenue(t) && (t.tanggal || "").startsWith(mtd)).reduce((s, t) => s + (t.jumlah || 0), 0);

    if (targets.hari > 0 && inHari >= targets.hari) {
      await addNotifikasi({
        tipe: "target_harian",
        prioritas: "info",
        title: "Target harian tercapai!",
        pesan: "Pemasukan hari ini " + fmtRp(inHari) + " (target " + fmtRp(targets.hari) + ").",
        link: "/operasional/analisis",
        meta: { scope: "hari", pemasukan: inHari, target: targets.hari, tanggal },
        dedupKey: "target_harian:" + tanggal,
      });
    }
    if (targets.minggu > 0 && inMinggu >= targets.minggu) {
      await addNotifikasi({
        tipe: "target_mingguan",
        prioritas: "info",
        title: "Target mingguan tercapai!",
        pesan: "Pemasukan minggu ini " + fmtRp(inMinggu) + " (target " + fmtRp(targets.minggu) + ").",
        link: "/operasional/analisis",
        meta: { scope: "minggu", pemasukan: inMinggu, target: targets.minggu, monday },
        dedupKey: "target_mingguan:" + monday,
      });
    }
    if (targets.bulan > 0 && inBulan >= targets.bulan) {
      await addNotifikasi({
        tipe: "target_bulanan",
        prioritas: "info",
        title: "Target bulanan tercapai!",
        pesan: "Pemasukan bulan ini " + fmtRp(inBulan) + " (target " + fmtRp(targets.bulan) + ").",
        link: "/operasional/analisis",
        meta: { scope: "bulan", pemasukan: inBulan, target: targets.bulan, bulan: mtd },
        dedupKey: "target_bulanan:" + mtd,
      });
    }
  } catch (err) {
    console.error("[notif] checkAndNotifyTarget error:", err.message);
  }
}

// ── Cron: daily summary jam 6 pagi WIB ─────────────────────────
// Ringkas aktivitas kemarin: total pemasukan, total pengeluaran, count
// transaksi, count bahan perlu restok (stok <= threshold atau habis).
// Plus: bandingkan dgn target harian + vs hari sebelumnya (insight).
// Output:
//   1. Insert in-app notif tipe daily_summary (dedup per tanggal).
//   2. Kirim WA via Fonnte ke arenaWaNotif() (kalau FONNTE_TOKEN ada).
export async function createDailySummaryNotif() {
  try {
    // Muat brand warung aktif → arenaName()/arenaWaNotif() per-warung (cron
    // memanggil ini di dalam runWithTenant(wid), jadi currentWarungId() benar).
    setRequestBrandFromRow(await getWarungById(currentWarungId()));
    const today     = todayBusinessDayISO();
    const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(new Date(yesterday + "T00:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);

    const [transaksi, bahanList, karyawanList, analData] = await Promise.all([
      readTransaksi(),
      readBahan(),
      readKaryawan(true),
      loadAnalisisData(),
    ]);

    const targets = (analData && analData.targets) || { hari: 0 };

    const txYday = transaksi.filter((t) => t.tanggal === yesterday  && !t.voidedAt);
    const txDbef = transaksi.filter((t) => t.tanggal === dayBefore && !t.voidedAt);

    const pemasukan     = txYday.filter((t) => isRevenue(t)).reduce((s, t) => s + (t.jumlah || 0), 0);
    const pengeluaran   = txYday.filter((t) => t.jenis === "pengeluaran" && !t.voidedAt).reduce((s, t) => s + (t.jumlah || 0), 0);
    const pemasukanDbef = txDbef.filter((t) => isRevenue(t)).reduce((s, t) => s + (t.jumlah || 0), 0);
    const trxCount      = txYday.length;

    // Stok perlu restok = stok <= stok_min (saat stok_min > 0) atau stok = 0.
    const restokCount = bahanList.filter((b) => {
      const s = Number(b.stok) || 0;
      const m = Number(b.stok_min) || 0;
      return s <= 0 || (m > 0 && s <= m);
    }).length;

    // ── Comparison metrics ─────────────────────────────────
    // vs hari sebelumnya: delta absolut + persen
    const diff = pemasukan - pemasukanDbef;
    const pctDiff = pemasukanDbef > 0
      ? (diff / pemasukanDbef) * 100
      : (pemasukan > 0 ? 100 : 0);
    const trendIcon = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";
    const trendText = pemasukanDbef === 0 && pemasukan === 0
      ? "tidak ada data pembanding"
      : (diff === 0
        ? "sama dgn kemarin lusa"
        : (diff > 0 ? "+" : "−") + fmtRp(Math.abs(diff))
          + " (" + (pctDiff > 0 ? "+" : "") + pctDiff.toFixed(1) + "%)");

    // vs target harian
    const targetPct  = targets.hari > 0 ? (pemasukan / targets.hari) * 100 : 0;
    const targetIcon = targetPct >= 100 ? "✅"
                     : targetPct >= 80  ? "⚠️"
                     : targetPct > 0    ? "❌" : "•";
    const targetText = targets.hari > 0
      ? fmtRp(targets.hari) + " (" + targetPct.toFixed(0) + "% " + targetIcon + ")"
      : "belum diatur";

    // Format tanggal Indonesia
    const dateLabel = new Date(yesterday + "T00:00:00Z")
      .toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // ── WhatsApp message (multi-line, markdown Fonnte) ─────
    const waLines = [
      "📊 *Ringkasan Penghasilan Harian*",
      "_" + dateLabel + "_",
      "",
      "💰 *Pemasukan:* " + fmtRp(pemasukan),
      "🎯 Target harian: " + targetText,
      trendIcon + " vs kemarin lusa: " + trendText,
      "",
      "💸 Pengeluaran: " + fmtRp(pengeluaran),
      "📝 " + trxCount + " transaksi tercatat",
    ];
    if (restokCount > 0) waLines.push("📦 *" + restokCount + " bahan perlu restok*");
    waLines.push("");
    waLines.push("_" + arenaName() + " — Owner Panel_");
    const waMessage = waLines.join("\n");

    // Kirim WA (fire-and-forget; gagal tidak block in-app notif)
    if (arenaWaNotif()) {
      sendWa(arenaWaNotif(), waMessage)
        .then((r) => {
          if (r.ok)       console.log("[notif] WA daily summary terkirim ke " + arenaWaNotif());
          else if (r.skipped) console.log("[notif] WA daily summary skip (FONNTE_TOKEN belum di-set)");
          else            console.error("[notif] WA send error:", r.error);
        })
        .catch((err) => console.error("[notif] WA send exception:", err.message));
    }

    // ── In-app notif (existing behavior, lebih ringkas) ───
    const inAppLines = [];
    inAppLines.push("Pemasukan " + fmtRp(pemasukan));
    if (targets.hari > 0) inAppLines.push(targetPct.toFixed(0) + "% target");
    inAppLines.push(trxCount + " transaksi");
    if (restokCount > 0) inAppLines.push(restokCount + " bahan perlu restok");

    await addNotifikasi({
      tipe: "daily_summary",
      prioritas: restokCount > 0 ? "warning" : "info",
      title: "Ringkasan harian " + yesterday,
      pesan: inAppLines.join(" • "),
      link: "/operasional/transaksi?tgl_dari=" + yesterday + "&tgl_sampai=" + yesterday,
      meta: {
        tanggal: yesterday, pemasukan, pengeluaran, trxCount, restokCount,
        targetHari: targets.hari,
        targetPct: Math.round(targetPct),
        pemasukanDbef, diff, pctDiff: Math.round(pctDiff * 10) / 10,
        karyawanAktif: karyawanList.length,
      },
      dedupKey: "daily_summary:" + yesterday,
    });
  } catch (err) {
    console.error("[notif] createDailySummaryNotif error:", err.message);
  }
}
