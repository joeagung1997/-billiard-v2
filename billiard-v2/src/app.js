// src/app.js
// ── Entry point — setup server, routes, cron ─────────────────

import express        from "express";
import { join }       from "path";
import { fileURLToPath } from "url";
import cron           from "node-cron";
import swaggerUi      from "swagger-ui-express";

import { CONFIG }     from "./config.js";
import { initDB, resetScanHarian, cleanupOldNotifikasi, getActiveWarungIds } from "./utils/db.js";
import { createDailySummaryNotif } from "./utils/notifTrigger.js";
import { autoCloseExpiredSesi } from "./utils/autoClose.js";
import { tenantContext, runWithTenant } from "./utils/tenant.js";
import scanRouter     from "./routes/scan.js";
import adminRouter    from "./routes/admin.js";
import qrRouter       from "./routes/qr.js";
import shareRouter    from "./routes/share.js";
import financeRouter     from "./routes/finance.js";
import sdmRouter         from "./routes/sdm.js";
import monitoringRouter  from "./routes/monitoring.js";
import apiRouter      from "./routes/api.js";
import warungRouter   from "./routes/warung.js";
import platformRouter from "./routes/platform.js";
import { swaggerSpec } from "./utils/swagger.js";
import { resultPage } from "./views/member.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const app = express();

// ── Jaring pengaman proses (cegah 1 error meruntuhkan seluruh server) ──────
// Sejak Node 15, unhandledRejection DEFAULT-nya MEMATIKAN proses. Di Railway
// (1 instance long-running), satu promise reject tak tertangkap → proses mati →
// container restart → SEMUA request in-flight putus → browser dapat
// ERR_HTTP2_PROTOCOL_ERROR + "site can't be reached" sampai container hidup lagi.
// Log LOUD (stack muncul di log Railway untuk ditindak) + JANGAN exit: server
// tetap hidup, satu request bermasalah tak menjatuhkan semua user.
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason instanceof Error ? reason.stack : reason);
});
// uncaughtException: state bisa korup → log stack lalu exit (Railway restart
// bersih). Tujuan utama: stack-nya terekam supaya bug akarnya bisa diperbaiki.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err?.stack || err);
  process.exit(1);
});

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: "60mb" })); // 60mb buat upload base64 (planning attachments)
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use(express.static(join(__dirname, "../public"), {
  etag: true,
  lastModified: true,
  // extensions: biar URL pretty (/iklanmember) auto-resolve ke /iklanmember.html
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
      // Aset ber-versi (?v=) → cache permanen (immutable): di-fetch sekali, load
      // berikutnya instan TANPA revalidasi. Bump ?v= saat file berubah.
      // Tanpa ?v= → no-cache (selalu revalidate). Tujuan: hilangkan revalidasi
      // 190KB admin.css tiap page-load yang bikin sidebar "mentah sesaat" (FOUC)
      // di jaringan lambat. (res.req tersedia di setHeaders saat lewat Express.)
      const versioned = res.req && res.req.query && res.req.query.v;
      res.setHeader(
        "Cache-Control",
        versioned ? "public, max-age=31536000, immutable" : "no-cache",
      );
    }
  },
}));

// ── Multi-tenant: buka async-context tenant per request (sebelum semua route).
// Middleware auth nanti mengisi warung_id dari token via setRequestWarung;
// fungsi db.js default-nya membaca konteks ini (currentWarungId()).
app.use(tenantContext);


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
// Multi-tenant entry: /w/:slug → login per-warung (path-based, Opsi A).
// Setelah login, token menentukan warung; app dipakai via URL biasa di bawah.
app.use("/w/:slug", warungRouter);
app.use("/platform", platformRouter);   // Area Admin Platform (superadmin)
app.use("/", scanRouter);
app.use("/admin", adminRouter);
app.use("/admin", qrRouter);
app.use("/operasional", financeRouter);
app.use("/operasional", sdmRouter);
app.use("/operasional", monitoringRouter);
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

// ── Error handler (4 arg) — HARUS terakhir ────────────────────
// Tanpa ini, error yg di-propagate (next(err) / throw di middleware async)
// bisa meninggalkan respons MENGGANTUNG → edge Railway reset stream HTTP/2 →
// browser dapat ERR_HTTP2_PROTOCOL_ERROR. Di sini: log + balas 500 bersih
// (atau lepas ke default kalau header sudah terkirim, agar tak crash).
app.use((err, req, res, next) => {
  console.error("[ERR]", req.method, req.originalUrl, "→", err?.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).send(resultPage("error", {
    judul: "Kesalahan Server",
    pesan: "Terjadi gangguan sementara. Silakan muat ulang halaman.",
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

  // Daily summary notif: jam 06:00 WIB tiap hari.
  cron.schedule("0 6 * * *", async () => {
    try {
      // Per-warung: tiap warung aktif dapat ringkasan harian sendiri (data
      // ter-scope via runWithTenant → currentWarungId()).
      const ids = await getActiveWarungIds();
      for (const wid of ids) {
        await runWithTenant(wid, () => createDailySummaryNotif());
      }
      console.log(`[CRON] ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} — Daily summary notif dibuat (${ids.length} warung).`);
    } catch (err) {
      console.error("[CRON] Daily summary gagal:", err.message);
    }
  }, { timezone: "Asia/Jakarta" });

  // Auto-close sesi meja durasi-tetap yg lewat 10 menit: cek tiap menit.
  // Sesi "Open" (tanpa durasi) di-skip. Per-warung via runWithTenant → semua
  // call db.js auto-scope. Interval-based, jadi timezone tidak relevan.
  cron.schedule("* * * * *", async () => {
    try {
      const ids = await getActiveWarungIds();
      let total = 0;
      for (const wid of ids) {
        total += await runWithTenant(wid, () => autoCloseExpiredSesi());
      }
      if (total > 0) {
        console.log(`[CRON] ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} — Auto-close sesi meja: ${total} sesi ditutup.`);
      }
    } catch (err) {
      console.error("[CRON] Auto-close sesi gagal:", err.message);
    }
  });

  // Cleanup notif lama (> 30 hari): jam 03:00 WIB tiap hari.
  cron.schedule("0 3 * * *", async () => {
    try {
      const n = await cleanupOldNotifikasi(30);
      console.log(`[CRON] ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} — Cleanup notif: ${n} entry dihapus.`);
    } catch (err) {
      console.error("[CRON] Cleanup notif gagal:", err.message);
    }
  }, { timezone: "Asia/Jakarta" });

  initDB()
    .then(() => {
      const server = app.listen(CONFIG.PORT, () => {
        console.log(`\n${"=".repeat(44)}`);
        console.log(` ${CONFIG.NAMA_ARENA}`);
        console.log(`${"=".repeat(44)}`);
        console.log(` Port    : ${CONFIG.PORT}`);
        console.log(` DB      : PostgreSQL`);
        console.log(` Limit   : ${CONFIG.BATAS_MAIN}× / ${CONFIG.BATAS_HARI} hari`);
        console.log(` Deploy  : ${CONFIG.DEPLOY_ID.slice(0, 16)}${CONFIG.DEPLOY_ID.length > 16 ? "…" : ""}`);
        console.log(`${"=".repeat(44)}\n`);
      });

      // ── Keep-alive vs edge proxy (cegah ERR_HTTP2_PROTOCOL_ERROR) ──────
      // Edge Railway ("railway-hikari") & proxy sejenis menahan koneksi upstream
      // (keep-alive) JAUH lebih lama dari default Node (keepAliveTimeout = 5 detik).
      // Saat user diam >5 dtk membaca satu halaman lalu pindah menu, origin SUDAH
      // menutup socket keep-alive yang masih dianggap hidup oleh edge → edge memakai
      // socket mati → koneksi reset di tengah → browser dapat ERR_HTTP2_PROTOCOL_ERROR
      // (intermiten, khas "setelah idle", di semua role/menu — transport-level, bukan
      // bug halaman). Fix standar (sama spt anjuran AWS ALB/Heroku): origin menahan
      // keep-alive lebih lama dari jeda baca antar-klik, jadi edge yang menutup duluan.
      // Syarat Node: headersTimeout HARUS > keepAliveTimeout agar keep-alive dihormati.
      server.keepAliveTimeout = 65_000; // ms (default 5_000) — lewati jeda baca antar-menu
      server.headersTimeout   = 70_000; // ms — wajib > keepAliveTimeout
    })
    .catch((err) => {
      console.error("[FATAL] Gagal koneksi database:", err.message);
      process.exit(1);
    });
}

export default app;
