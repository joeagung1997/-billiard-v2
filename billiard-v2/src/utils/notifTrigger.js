// src/utils/notifTrigger.js
// ── Helper: trigger notifikasi dari side-effect bisnis ──────────
// Dipisah dari db.js + analisis.js untuk hindari circular import
// (db.js & analisis.js sudah saling import).

import { addNotifikasi, readTransaksi, readKaryawan, readBahan } from "./db.js";
import { loadAnalisisData } from "./analisis.js";
import { KAT_TUKAR_UANG, todayBusinessDayISO } from "./format.js";

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
// Insert 1 notif tipe daily_summary dgn dedup_key per tanggal.
export async function createDailySummaryNotif() {
  try {
    const today     = todayBusinessDayISO();
    const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);

    const [transaksi, bahanList, karyawanList] = await Promise.all([
      readTransaksi(),
      readBahan(),
      readKaryawan(true),
    ]);

    const txYday  = transaksi.filter((t) => t.tanggal === yesterday && !t.voidedAt);
    const pemasukan  = txYday.filter((t) => isRevenue(t)).reduce((s, t) => s + (t.jumlah || 0), 0);
    const pengeluaran = txYday.filter((t) => t.jenis === "pengeluaran" && !t.voidedAt).reduce((s, t) => s + (t.jumlah || 0), 0);
    const trxCount = txYday.length;

    // Stok perlu restok = stok <= stok_min (saat stok_min > 0) atau stok = 0.
    const restokCount = bahanList.filter((b) => {
      const s = Number(b.stok) || 0;
      const m = Number(b.stok_min) || 0;
      return s <= 0 || (m > 0 && s <= m);
    }).length;

    const lines = [];
    lines.push("Pemasukan: " + fmtRp(pemasukan));
    lines.push("Pengeluaran: " + fmtRp(pengeluaran));
    lines.push(trxCount + " transaksi tercatat.");
    if (restokCount > 0) lines.push(restokCount + " bahan perlu restok.");

    await addNotifikasi({
      tipe: "daily_summary",
      prioritas: restokCount > 0 ? "warning" : "info",
      title: "Ringkasan harian " + yesterday,
      pesan: lines.join(" • "),
      link: "/operasional/transaksi?tgl_dari=" + yesterday + "&tgl_sampai=" + yesterday,
      meta: {
        tanggal: yesterday,
        pemasukan, pengeluaran, trxCount, restokCount,
        karyawanAktif: karyawanList.length,
      },
      dedupKey: "daily_summary:" + yesterday,
    });
  } catch (err) {
    console.error("[notif] createDailySummaryNotif error:", err.message);
  }
}
