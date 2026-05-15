// src/app.js
// ── Entry point — setup server, routes, cron ─────────────────

import express        from "express";
import { join }       from "path";
import { fileURLToPath } from "url";
import cron           from "node-cron";

import { CONFIG }     from "./config.js";
import { initDB, resetScanHarian } from "./utils/db.js";
import scanRouter     from "./routes/scan.js";
import adminRouter    from "./routes/admin.js";
import qrRouter       from "./routes/qr.js";
import shareRouter    from "./routes/share.js";
import financeRouter  from "./routes/finance.js";
import { resultPage } from "./views/member.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "../public"), {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
      // no-cache: browser selalu revalidate, tapi pakai cache (304) jika file tidak berubah
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));


// ── Routes ────────────────────────────────────────────────────
app.use("/", scanRouter);
app.use("/admin", adminRouter);
app.use("/admin", qrRouter);
app.use("/keuangan", financeRouter);
app.use("/", shareRouter);

// ── Home ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html><html lang="id"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${CONFIG.NAMA_ARENA}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;background:#070d18;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#0c1526;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:28px 24px;max-width:300px;width:100%;text-align:center}.ic{font-size:40px;margin-bottom:12px}h1{font-size:18px;font-weight:700;color:#e8edf5;margin-bottom:8px}p{font-size:13px;color:#4a5e78;margin-bottom:16px}.btn{display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;text-decoration:none}</style>
  </head><body><div class="card">
  <div class="ic">🎱</div>
  <h1>${CONFIG.NAMA_ARENA}</h1>
  <p>Sistem member berjalan normal.</p>
  <a href="/admin" class="btn">Dashboard Admin</a>
  </div></body></html>`);
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send(resultPage("error", {
    judul: "Halaman Tidak Ditemukan",
    pesan: "URL yang kamu akses tidak ada.",
  }));
});

// ── Local dev: cron + server ──────────────────────────────────
if (!process.env.VERCEL) {
  cron.schedule("0 19 * * *", async () => {
    try {
      await resetScanHarian();
      console.log(`[CRON] ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} — Reset harian selesai.`);
    } catch (err) {
      console.error("[CRON] Reset harian gagal:", err.message);
    }
  }, { timezone: "UTC" });

  initDB()
    .then(() => {
      app.listen(CONFIG.PORT, () => {
        console.log(`\n${"=".repeat(44)}`);
        console.log(` ${CONFIG.NAMA_ARENA}`);
        console.log(`${"=".repeat(44)}`);
        console.log(` Port    : ${CONFIG.PORT}`);
        console.log(` DB      : PostgreSQL`);
        console.log(` Limit   : ${CONFIG.BATAS_MAIN}× / ${CONFIG.BATAS_HARI} hari`);
        console.log(`${"=".repeat(44)}\n`);
      });
    })
    .catch((err) => {
      console.error("[FATAL] Gagal koneksi database:", err.message);
      process.exit(1);
    });
}

export default app;
