// src/utils/autoClose.js
// ── Auto-close sesi meja billiard yang durasinya sudah lewat ──────────
//
// Permintaan owner: sesi dengan durasi DITETAPKAN (mis. "1 Jam" / "2 Jam"),
// kalau sudah LEWAT 10 menit dari jam selesai → otomatis ditutup ("sesi
// selesai") & meja langsung bebas. Saat ditutup: semua item (sewa + F&B) yang
// belum lunas ditandai LUNAS cash, lalu sesi di-close + dibuatkan notifikasi.
//
// Sesi "Open" (tanpa durasi tetap) TIDAK pernah auto-close — tak punya jam
// selesai; tetap harus ditutup manual seperti biasa.
//
// Catatan waktu: perbandingan murni antar-instant (opened_at + durasi vs now),
// jadi aman dari isu timezone (UTC di produksi / WIB di dev) — tidak menyentuh
// logika "tanggal/hari".
//
// Dipanggil dari cron app.js per-warung lewat runWithTenant(wid, ...), jadi
// semua call db.js auto-scope ke warung tsb. Dipisah dari db.js supaya app.js
// tetap ramping & menghindari circular import.

import {
  readSesiOpen, readSesiItems, setSesiItemPaid, closeSesi, addNotifikasi,
} from "./db.js";

// Tenggang setelah jam selesai sebelum sesi ditutup otomatis (ms).
export const AUTO_CLOSE_GRACE_MS = 10 * 60 * 1000; // 10 menit

// Durasi sewa (jam) dari item "Sewa Meja". keterangan: "Sewa Meja 3 · 2 Jam".
// 0 = Open / tanpa durasi tetap. [pure — bisa diuji tanpa DB]
export function rentalHoursFromItems(items = []) {
  const sewa = (items || []).find((t) => t.kategori === "Sewa Meja");
  if (!sewa) return 0;
  const m = String(sewa.keterangan || "").match(/(\d+)\s*Jam/);
  return m ? parseInt(m[1], 10) : 0;
}

// Apakah sesi durasi-tetap sudah lewat (jam selesai + tenggang 10 menit)?
// [pure — bisa diuji tanpa DB]
export function isSesiExpired(openedAt, jam, nowMs = Date.now()) {
  const j = Number(jam) || 0;
  if (!openedAt || j <= 0) return false;             // Open / tanpa durasi → jangan
  const startMs = new Date(openedAt).getTime();
  if (Number.isNaN(startMs)) return false;
  return nowMs >= startMs + j * 3600000 + AUTO_CLOSE_GRACE_MS;
}

// Proses 1 warung (harus dipanggil di dalam runWithTenant). Tutup semua sesi
// durasi-tetap yang sudah lewat. Return jumlah sesi yang ditutup.
export async function autoCloseExpiredSesi(nowMs = Date.now()) {
  const sesiOpen = await readSesiOpen();
  let closed = 0;
  for (const s of sesiOpen) {
    const items = await readSesiItems(s.id);
    const jam = rentalHoursFromItems(items);
    if (!isSesiExpired(s.opened_at, jam, nowMs)) continue;

    // Tandai semua item belum-lunas → LUNAS cash (sewa + F&B).
    for (const t of items) {
      if (t.lunas === false) await setSesiItemPaid(t.id, "cash");
    }
    // Tutup sesi. Gagal (mis. baru saja ditutup manual) → skip notifikasi.
    const ok = await closeSesi(s.id);
    if (!ok) continue;
    closed++;

    const endMs    = new Date(s.opened_at).getTime() + jam * 3600000;
    const lewatMnt = Math.max(0, Math.round((nowMs - endMs) / 60000));
    await addNotifikasi({
      tipe: "sesi_auto_close",
      prioritas: "info",
      title: "Sesi meja ditutup otomatis",
      pesan: (s.nama_meja || "Meja") + " (" + jam + " Jam) lewat " + lewatMnt
        + " menit — auto-close. Semua item ditandai lunas (cash).",
      link: "/operasional/riwayat-sewa",
      meta: { sesi_id: s.id, meja_id: s.meja_id, jam, lewat_menit: lewatMnt },
      dedupKey: "sesi_auto_close:" + s.id,
      dedupWindowHours: 24,
    });
  }
  return closed;
}
