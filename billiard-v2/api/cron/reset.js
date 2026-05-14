// api/cron/reset.js — Vercel Cron: reset scan harian jam 02.00 WIB
import { initDB, resetScanHarian } from '../../src/utils/db.js';

export default async function handler(req, res) {
  try {
    await initDB();
    await resetScanHarian();
    const waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    console.log(`[CRON] ${waktu} — Reset harian selesai.`);
    res.json({ ok: true, waktu });
  } catch (err) {
    console.error("[CRON] Reset harian gagal:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
