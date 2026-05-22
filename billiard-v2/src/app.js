// src/app.js
// ── Entry point — setup server, routes, cron ─────────────────

import express        from "express";
import { join }       from "path";
import { fileURLToPath } from "url";
import cron           from "node-cron";
import swaggerUi      from "swagger-ui-express";

import { CONFIG }     from "./config.js";
import { initDB, resetScanHarian } from "./utils/db.js";
import scanRouter     from "./routes/scan.js";
import adminRouter    from "./routes/admin.js";
import qrRouter       from "./routes/qr.js";
import shareRouter    from "./routes/share.js";
import financeRouter  from "./routes/finance.js";
import sdmRouter      from "./routes/sdm.js";
import apiRouter      from "./routes/api.js";
import { swaggerSpec } from "./utils/swagger.js";
import { resultPage } from "./views/member.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use(express.static(join(__dirname, "../public"), {
  etag: true,
  lastModified: true,
  // extensions: biar URL pretty (/iklanmember) auto-resolve ke /iklanmember.html
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
      // no-cache: browser selalu revalidate, tapi pakai cache (304) jika file tidak berubah
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));


// ── REST API v1 + Swagger UI ──────────────────────────────────
app.use("/api/v1", apiRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Billiard API Docs",
  customCss: ".swagger-ui .topbar { background-color: #0c1526; } .swagger-ui .topbar-wrapper .link { display:none; }",
  swaggerOptions: { persistAuthorization: true },
}));
// Endpoint untuk download spec JSON (cocok untuk Postman/Insomnia)
app.get("/api/v1/openapi.json", (_req, res) => res.json(swaggerSpec));

// ── Routes ────────────────────────────────────────────────────
app.use("/", scanRouter);
app.use("/admin", adminRouter);
app.use("/admin", qrRouter);
app.use("/operasional", financeRouter);
app.use("/operasional", sdmRouter);
// Backward-compat: redirect URL lama /keuangan/* ke /operasional/*
app.use("/keuangan", (req, res) => res.redirect(308, "/operasional" + req.url));
app.use("/", shareRouter);

// ── Home ──────────────────────────────────────────────────────
// Landing page disajikan via public/index.html (static file).
// Express static middleware otomatis handle GET / -> public/index.html.

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
