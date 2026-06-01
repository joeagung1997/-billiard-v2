// src/routes/finance.js
// ── Routes: /operasional (pemasukan & pengeluaran) ───────────────

import { Router } from "express";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import jwt from "jsonwebtoken";

const __routeDir = dirname(fileURLToPath(import.meta.url));
// Upload dir: project-root/public/uploads/receipts/
const RECEIPT_DIR = join(__routeDir, "../../public/uploads/receipts");
// Upload dir: project-root/public/uploads/planning/ (lampiran item planning)
const PLANNING_DIR = join(__routeDir, "../../public/uploads/planning");
import {
  readTransaksi, appendTransaksi, voidTransaksi, markTransaksiLunas,
  readKategori, addKategori, deleteKategori, updateKategoriUrutan,
  readSubKategori, addSubKategori, deleteSubKategori,
  readMenuItems, readMenuToppings, addMenuItem, updateMenuItem, deleteMenuItem,
  addMenuTopping, deleteMenuTopping,
  readMejas, readMejaAktif, addMeja, updateMeja, setMejaStatus, deleteMeja, updateMejaTarifMassal,
  createSesi, readSesiOpen, readSesiById, readSesiItems, readMejaOpenSesiIds, readMejaOpenSesiInfo,
  hasOpenSesi, closeSesi, setSesiItemPaid, setSesiItemJumlah, updateSesiSewa, voidSesiItem,
  readBahan, addBahan, updateBahan, deleteBahan, readBahanHistory,
  readResepAll, setResep, computeHppMap,
  readFeatureNotes, addFeatureNote, updateFeatureNote, deleteFeatureNote, setFeatureNoteStatus,
  readAdminAccounts, readKaryawan,
  readPlanningItems, addPlanningItem, updatePlanningItem, deletePlanningItem,
  readPlanningPayments, addPlanningPayment, deletePlanningPayment, togglePlanningPayment,
  deleteUnpaidPlanningPayments, wipeAllPlanningPayments,
  readPlanningGoals, addPlanningGoal, updatePlanningGoal, addGoalDeposit, deletePlanningGoal,
  readSuppliers, addSupplier, updateSupplier, deleteSupplier,
  adjustStok, readStokMovements, readStokMovementsAll, setStokMin,
  readNotifikasi, countUnreadNotifikasi,
  markNotifikasiRead, markAllNotifikasiRead,
  deleteNotifikasi, deleteAllNotifikasi,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import { setRequestWarung } from "../utils/tenant.js";
import { subscriptionGate } from "../middleware/subscription.js";
import { requireModule } from "../middleware/module.js";
import { applyBusinessDay, todayBusinessDayISO, KAT_TUKAR_UANG } from "../utils/format.js";
import { checkAndNotifyTarget, createDailySummaryNotif, notifyNewTransaksi } from "../utils/notifTrigger.js";
import { loadAnalisisData, computeStatus, evaluateAddKaryawan, SETTING_DANA_CADANGAN } from "../utils/analisis.js";
import { addFixedCost, updateFixedCost, deleteFixedCost, writeSetting } from "../utils/db.js";
import {
  financeDashboard,
  financeLoginPage,
  financeKategoriPage, financeMenuPage, financeMejaPage, financeSesiPage,
  financeAnalisisPage,
} from "../views/finance.js";
import { planningPage } from "../views/planning.js";
import { catatanFiturPage } from "../views/catatan.js";
import { stokPage } from "../views/stok.js";
import { supplierPage } from "../views/supplier.js";
import { renderNotifSheetBody } from "../views/notif.js";

const router = Router();

// ── Cookie helpers (tanpa cookie-parser) ─────────────────────────
const COOKIE_NAME = "_frt"; // finance role token

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setRoleCookie(res, role, username = "", displayName = "", shift = "siang", warungId = 1) {
  const token = jwt.sign({ role, username, displayName, shift, warungId, boot: CONFIG.SESSION_VERSION }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
  const maxAge = 24 * 3600; // 24 jam
  // Path=/ supaya cookie juga dikirim ke /admin/* — fallback _frt di
  // middleware/auth.js bisa baca cookie ini saat owner pindah menu.
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
}

function clearRoleCookie(res) {
  // Clear 2 cookie sekaligus: Path=/ (baru) DAN Path=/operasional (legacy,
  // utk user yg msh punya cookie lama dari deploy sebelumnya).
  res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    `${COOKIE_NAME}=; HttpOnly; Path=/operasional; Max-Age=0; SameSite=Lax`,
  ]);
}

// ── Auth helpers ──────────────────────────────────────────────────
function getFinanceUser(req) {
  const raw = getCookie(req, COOKIE_NAME);
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, CONFIG.JWT_SECRET);
    // SESSION_VERSION mismatch = sesi versi lama → invalid. Deploy biasa TIDAK
    // mengubah ini (user tetap login); hanya bump SESSION_VERSION yg invalidasi.
    if (decoded.boot !== CONFIG.SESSION_VERSION) return null;
    return {
      role:        decoded.role        || null,
      username:    decoded.username    || "",
      displayName: decoded.displayName || "",
      shift:       decoded.shift       || "siang",
      warungId:    decoded.warungId    || 1,
    };
  } catch { return null; }
}

function getFinanceRole(req) {
  return getFinanceUser(req)?.role ?? null;
}

function requireFinanceAuth(req, res, next) {
  const user = getFinanceUser(req);
  if (!user?.role) {
    // Request fetch/XHR (mis. bell notif) → balikin 401, JANGAN redirect ke HTML.
    // Tanpa ini, fetch mengikuti redirect ke /admin lalu HTML-nya ke-inject ke UI
    // (bug: halaman login nyasar di dalam list notif). Klien handle 401/redirect
    // → arahkan 1x ke /admin dengan bersih. sec-fetch-dest=document = navigasi.
    if (req.get("sec-fetch-dest") === "empty" || req.xhr) {
      return res.status(401).json({ error: "unauthorized", login: "/admin" });
    }
    // Flow utama login via /admin (username+PIN) — kalau cookie _frt expired,
    // arahkan ke /admin (akan auto-set cookie kembali setelah login).
    return res.redirect("/admin");
  }
  res.locals.financeRole    = user.role;
  res.locals.financeUser    = user.username;
  res.locals.financeDisplay = user.displayName;
  res.locals.financeShift   = user.shift;
  setRequestWarung(req, user.warungId);   // isi async-context tenant dari klaim token
  res.locals.warungId       = req.warungId;
  next();
}

function requireOwner(req, res, next) {
  if (res.locals.financeRole !== "owner") {
    return res.redirect("/operasional?msg=no_access");
  }
  next();
}

// ── Login / Logout ────────────────────────────────────────────────
router.get("/login", (req, res) => {
  // Sudah login? Redirect ke dashboard
  const role = getFinanceRole(req);
  if (role) return res.redirect("/operasional");
  res.send(financeLoginPage(!!req.query.err));
});

router.post("/login", async (req, res) => {
  const pin      = (req.body.pin      ?? "").trim();
  const username = (req.body.username ?? "").trim().toLowerCase();
  const redir    = (req.query.r       ?? "").slice(0, 300);

  let role = null, displayName = "", shift = "siang", warungId = 1;

  if (username) {
    // Username diisi → wajib match akun di admin_accounts. Tidak fallback ke PIN-only.
    try {
      const accounts = await readAdminAccounts();
      const row = accounts.find((u) => u.username.toLowerCase() === username && u.pin === pin);
      if (row) {
        role = row.role;
        displayName = row.display_name || row.username;
        shift = row.shift || "siang";
        warungId = row.warung_id || 1;
      }
    } catch (err) { console.error("[FINANCE] accounts lookup:", err.message); }
  } else {
    // Username kosong → fallback PIN-only (backward compat URL lama).
    if (pin === CONFIG.OWNER_PIN)         { role = "owner";    displayName = "Owner"; }
    else if (pin === CONFIG.KARYAWAN_PIN) { role = "karyawan"; displayName = "Partner"; }
  }

  if (!role) {
    const back = "/operasional/login?err=1" + (redir ? "&r=" + encodeURIComponent(redir) : "");
    return res.redirect(back);
  }

  setRoleCookie(res, role, username, displayName, shift, warungId);
  res.redirect(redir || "/operasional");
});

router.get("/logout", (_req, res) => {
  clearRoleCookie(res);
  // Semua role kembali ke /admin — flow login utama via /admin (username+PIN),
  // baik owner maupun karyawan. /operasional/login tetap accessible kalau
  // user manual buka URL-nya, tapi default tujuan logout = /admin.
  res.redirect("/admin");
});

// ── Terapkan auth ke SEMUA route di bawah ini ─────────────────────
router.use(requireFinanceAuth);
router.use(subscriptionGate);

// ── Gate modul opsional (path-prefix → meng-cover semua sub-route) ──
// Menu = modul 'warkop'; Planning = modul 'planning'. Modul mati → 403.
// Dipasang sebelum definisi route /menu* & /planning* di bawah.
router.use("/menu",     requireModule("warkop"));
router.use("/planning", requireModule("planning"));

// ── GET /operasional — dashboard ─────────────────────────────────
// Helper: bangun data utk financeDashboard. Dipake oleh route '/' (Dashboard
// Keuangan) dan '/transaksi' (Riwayat Transaksi — same data, beda view).
async function buildDashboardData(req, res) {
  const role = res.locals.financeRole;
  const [transaksi, kategoriList, subKategoriList, menuItems, toppings, accounts, karyawanList, mejaAktif, occupiedIds] = await Promise.all([
    readTransaksi(), readKategori(), readSubKategori(), readMenuItems(), readMenuToppings(),
    readAdminAccounts(), readKaryawan(true), readMejaAktif(), readMejaOpenSesiIds(),
  ]);
  // Sembunyikan meja yang sedang dipakai (punya sesi terbuka) dari dropdown
  // Catat Transaksi cepat — biar tidak dobel dgn pencatatan via Sesi Meja.
  const mejaList = mejaAktif.filter((m) => !occupiedIds.includes(m.id));

  // Karyawan: hanya boleh lihat kemarin atau hari ini (1 hari saja, bukan range).
  // Pakai business day (cutoff jam 06:00 WIB) — bukan calendar day — supaya shift
  // tutup tengah malam tetap dianggap "hari ini" sampai pagi.
  const today      = todayBusinessDayISO();
  const todayD     = new Date(today + "T00:00:00Z");
  const yesterday  = new Date(todayD.getTime() - 86400000).toISOString().slice(0, 10);
  const allowedKy  = [yesterday, today];

  let tglDari, tglSampai, bulanFilter, jenisFilter;
  if (role === "karyawan") {
    const reqDay = (req.query.tgl_dari ?? req.query.day ?? "").slice(0, 10);
    const pickDay = allowedKy.includes(reqDay) ? reqDay : today;
    tglDari     = pickDay;
    tglSampai   = pickDay;
    bulanFilter = pickDay.slice(0, 7);
    jenisFilter = "";
  } else {
    bulanFilter = req.query.bulan      ?? "";
    jenisFilter = req.query.jenis      ?? "";
    tglDari     = req.query.tgl_dari   ?? "";
    tglSampai   = req.query.tgl_sampai ?? "";
  }

  // ── Analisis target operasional ────────────────────────────
  const { breakdown: costBreakdown, targets } = await loadAnalisisData();
  // Pemasukan utk 3 scope: hari ini (business day), minggu ini (Sen-Min), bulan ini
  const dow       = new Date(today + "T00:00:00Z").getUTCDay() === 0 ? 6 : new Date(today + "T00:00:00Z").getUTCDay() - 1;
  const mondayD   = new Date(new Date(today + "T00:00:00Z").getTime() - dow * 86400000);
  const mondayStr = mondayD.toISOString().slice(0, 10);
  // Kategori "Tukar Uang" (internal transfer cash↔QRIS) di-exclude dari semua
  // aggregasi pemasukan — bukan revenue beneran. Lihat utils/format.js.
  // Plus filter lunas: transaksi "belum bayar" (piutang) belum boleh dihitung
  // sebagai revenue cash-basis sampai customer benar-benar bayar.
  const isRevPem = (t) => t.jenis === "pemasukan" && !t.voidedAt && t.kategori !== KAT_TUKAR_UANG && t.lunas !== false;
  // Karyawan: scope "Hari ini" mengikuti filter day chip (Kemarin / Hari ini),
  // bukan today fixed. Tanpa ini, switch ke "Kemarin" bikin Pemasukan card
  // update tapi Status Target tetep tampilkan today → inkonsisten.
  const scopeDay      = role === "karyawan" ? tglDari : today;
  const hariLabel     = scopeDay === today ? "Hari ini"
                      : scopeDay === yesterday ? "Kemarin"
                      : new Date(scopeDay + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const inHari   = transaksi.filter((t) => isRevPem(t) && t.tanggal === scopeDay).reduce((s, t) => s + (t.jumlah || 0), 0);
  const inMinggu = transaksi.filter((t) => isRevPem(t) && t.tanggal >= mondayStr && t.tanggal <= today).reduce((s, t) => s + (t.jumlah || 0), 0);
  const inBulan  = transaksi.filter((t) => isRevPem(t) && (t.tanggal || "").startsWith(today.slice(0, 7))).reduce((s, t) => s + (t.jumlah || 0), 0);

  // Rekomendasi tambah karyawan: rata-rata 30 hari terakhir
  const last30Start = new Date(new Date(today + "T00:00:00Z").getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const last30In    = transaksi.filter((t) => isRevPem(t) && t.tanggal >= last30Start && t.tanggal <= today).reduce((s, t) => s + (t.jumlah || 0), 0);
  const last30Avg   = Math.round(last30In / 30);

  const analisis = {
    targets,
    costBreakdown,
    hariLabel,
    hari:   { pemasukan: inHari,   target: targets.hari,   status: computeStatus(inHari,   targets.hari) },
    minggu: { pemasukan: inMinggu, target: targets.minggu, status: computeStatus(inMinggu, targets.minggu) },
    bulan:  { pemasukan: inBulan,  target: targets.bulan,  status: computeStatus(inBulan,  targets.bulan) },
    simulasi: {
      rataPemasukan: last30Avg,
      ...evaluateAddKaryawan(last30Avg, costBreakdown.totalMonthly, 900000),
    },
  };

  // Shift: priority lookup (karyawan table → admin_accounts.shift → cookie → 'siang')
  const myDisplay  = (res.locals.financeDisplay || "").trim().toLowerCase();
  const myKaryawan = myDisplay
    ? karyawanList.find((k) => (k.nama || "").trim().toLowerCase() === myDisplay)
    : null;
  const me = accounts.find((a) => a.username.toLowerCase() === (res.locals.financeUser || "").toLowerCase());
  const effectiveShift = myKaryawan?.shift || me?.shift || res.locals.financeShift || "siang";

  return {
    transaksi, token: "", role,
    displayName: res.locals.financeDisplay || "",
    shift:       effectiveShift,
    bulanFilter, jenisFilter, tglDari, tglSampai,
    kategoriList, subKategoriList, menuItems, toppings,
    mejaList,
    accountsAll:  accounts,
    karyawanAll:  karyawanList,
    analisis,
    msg: req.query.msg || "",
  };
}

router.get("/", async (req, res) => {
  try {
    // Default landing: filter "Hari Ini" jika owner & belum spesifikan periode.
    // Karyawan dihandle terpisah di buildDashboardData (forced ke hari ini/kemarin).
    if (res.locals.financeRole !== "karyawan"
        && !req.query.bulan && !req.query.tgl_dari && !req.query.tgl_sampai && !req.query.jenis) {
      const today = todayBusinessDayISO();
      req.query.bulan      = today.slice(0, 7);
      req.query.tgl_dari   = today;
      req.query.tgl_sampai = today;
    }
    const data = await buildDashboardData(req, res);
    res.send(financeDashboard(data));
  } catch (err) {
    console.error("[FINANCE] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /operasional/transaksi — daftar transaksi (dashboard mode 'transaksiOnly') ──
// Same data fetch + view sbg dashboard, tapi summary blocks (kas, charts, target)
// di-hide via display:none. User cuma lihat tabel transaksi + filter chips.
router.get("/transaksi", async (req, res) => {
  try {
    const data = await buildDashboardData(req, res);
    res.send(financeDashboard({ ...data, transaksiOnly: true }));
  } catch (err) {
    console.error("[FINANCE] /transaksi error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /operasional/tambah — redirect ke dashboard (modal wizard) ───
router.get("/tambah", (_req, res) => res.redirect("/operasional"));

// ── POST /operasional/tambah — simpan transaksi (dari modal wizard) ──
// ── Simpan bukti foto dari base64 → disk ────────────────────────────
function saveBuktiFoto(b64) {
  if (!b64 || !b64.startsWith("data:image/")) return "";
  try {
    const m = b64.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!m) return "";
    const ext      = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
    const buf      = Buffer.from(m[2], "base64");
    if (buf.length > 5 * 1024 * 1024) return ""; // max 5MB setelah kompresi
    if (!existsSync(RECEIPT_DIR)) mkdirSync(RECEIPT_DIR, { recursive: true });
    const fname    = "rcpt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) + "." + ext;
    writeFileSync(join(RECEIPT_DIR, fname), buf);
    return "/uploads/receipts/" + fname;
  } catch (e) {
    console.error("[FINANCE] saveBuktiFoto error:", e.message);
    return "";
  }
}

router.post("/tambah", async (req, res) => {
  const { jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const subKategori = (req.body.sub_kategori ?? "").trim().slice(0, 100);
  const bayar       = ["cash", "qris"].includes(req.body.bayar) ? req.body.bayar : "";
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);

  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/operasional?msg=err");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/operasional?msg=err");
  }

  // Simpan bukti foto jika ada
  const buktiUrl = saveBuktiFoto((req.body.bukti_b64 ?? "").trim());

  // Apply business day cutoff: jam < CUTOFF (default 06:00) → catat ke shift
  // hari sebelumnya, biar transaksi dini hari tdk pisah dari closing shift.
  const tanggalBiz = applyBusinessDay(tanggal.slice(0, 10), (jam ?? "").slice(0, 5));

  // Kopi/Snack add-on (hanya untuk pemasukan Main Billiard) — simpan sbg
  // transaksi terpisah supaya Analisis Target & laporan per-kategori akurat.
  const kopiJumlahRaw = (req.body.kopi_jumlah ?? "").replace(/\./g, "");
  const kopiJumlahNum = parseInt(kopiJumlahRaw) || 0;
  const kopiKeterangan = (req.body.kopi_keterangan ?? "").trim().slice(0, 200);
  const hasKopiAddon = jenis === "pemasukan"
    && kopiJumlahNum > 0
    && kopiKeterangan
    && (kategori ?? "").trim() === "Sewa Meja";

  // Status lunas: form kirim "lunas=0" untuk belum bayar, otherwise default true.
  // Kopi add-on ikut status lunas dari transaksi parent (one-shot wizard).
  const lunas = req.body.lunas !== "0";

  try {
    const waktuSafe = ["siang", "malam"].includes(req.body.waktu) ? req.body.waktu : "siang";
    const jamSafe   = (jam ?? "").slice(0, 5);
    const userId    = res.locals.financeUser || "";

    const trxMain = {
      id:          Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:     tanggalBiz,
      jam:         jamSafe,
      jenis,
      waktu:       waktuSafe,
      kategori:    (kategori ?? "").trim(),
      subKategori,
      keterangan:  (keterangan ?? "").trim().slice(0, 200),
      jumlah:      jumlahNum,
      createdAt:   new Date().toISOString(),
      bayar,
      buktiUrl,
      dicatatOleh: userId,
      lunas,
    };
    await appendTransaksi(trxMain);

    // Transaksi ke-2: Kopi/Snack add-on (kalau ada). Share waktu/bayar/bukti/lunas.
    let trxKopi = null;
    if (hasKopiAddon) {
      trxKopi = {
        id:          Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        tanggal:     tanggalBiz,
        jam:         jamSafe,
        jenis:       "pemasukan",
        waktu:       waktuSafe,
        kategori:    "Kopi / Snack",
        subKategori: "",
        keterangan:  kopiKeterangan,
        jumlah:      kopiJumlahNum,
        createdAt:   new Date().toISOString(),
        bayar,
        buktiUrl,
        dicatatOleh: userId,
        lunas,
      };
      await appendTransaksi(trxKopi);
    }

    // ── Trigger notif (fire-and-forget, non-blocking response) ──
    // Notif tiap transaksi baru — masuk bell sidebar (filter "Transaksi").
    notifyNewTransaksi(trxMain).catch((err) =>
      console.error("[FINANCE] notifyNewTransaksi main error:", err.message));
    if (trxKopi) {
      notifyNewTransaksi(trxKopi).catch((err) =>
        console.error("[FINANCE] notifyNewTransaksi kopi error:", err.message));
    }
    // Notif target tercapai — hanya untuk pemasukan lunas.
    if (jenis === "pemasukan" && lunas) {
      checkAndNotifyTarget(tanggalBiz).catch((err) =>
        console.error("[FINANCE] target notif trigger error:", err.message)
      );
    }

    res.redirect("/operasional?msg=created");
  } catch (err) {
    console.error("[FINANCE] tambah POST error:", err.message);
    res.redirect("/operasional?msg=err");
  }
});

// ── POST /operasional/tukar-uang — shortcut tukar cash → QRIS ──────
// Customer kasih cash ke laci (kita catat sbg pengeluaran cash), lalu transfer
// QRIS senilai sama (kita catat sbg pemasukan qris). Kedua entry pakai kategori
// "Tukar Uang" supaya otomatis di-exclude dari revenue/stats (sudah ada handler).
router.post("/tukar-uang", async (req, res) => {
  const { datetime } = req.body;
  const jumlahNum = parseInt((req.body.jumlah ?? "").replace(/\./g, "")) || 0;
  const ketUser   = (req.body.keterangan ?? "").trim().slice(0, 150);
  const tanggal   = (datetime ?? "").slice(0, 10);
  const jam       = (datetime ?? "").slice(11, 16);

  if (!tanggal || jumlahNum <= 0) {
    return res.redirect("/operasional?msg=err");
  }

  const tanggalBiz = applyBusinessDay(tanggal, jam);
  const userId     = res.locals.financeUser || "";
  const ketBase    = "Tukar uang Cash → QRIS" + (ketUser ? " · " + ketUser : "");

  try {
    // Entry 1: pengeluaran cash (uang keluar dari laci)
    const trxOut = {
      id:          Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:     tanggalBiz,
      jam,
      jenis:       "pengeluaran",
      waktu:       "siang",
      kategori:    KAT_TUKAR_UANG,
      subKategori: "",
      keterangan:  ketBase,
      jumlah:      jumlahNum,
      createdAt:   new Date().toISOString(),
      bayar:       "cash",
      buktiUrl:    "",
      dicatatOleh: userId,
      lunas:       true,
    };
    await appendTransaksi(trxOut);

    // Entry 2: pemasukan qris (uang masuk via transfer). createdAt sedikit
    // lebih besar supaya urutan di tabel: pemasukan QRIS di atas pengeluaran
    // cash (tabel sort by createdAt desc dalam tanggal yg sama).
    const trxIn = {
      id:          Date.now() + 1 + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:     tanggalBiz,
      jam,
      jenis:       "pemasukan",
      waktu:       "siang",
      kategori:    KAT_TUKAR_UANG,
      subKategori: "",
      keterangan:  ketBase,
      jumlah:      jumlahNum,
      createdAt:   new Date(Date.now() + 1).toISOString(),
      bayar:       "qris",
      buktiUrl:    "",
      dicatatOleh: userId,
      lunas:       true,
    };
    await appendTransaksi(trxIn);

    res.redirect("/operasional?msg=tukar");
  } catch (err) {
    console.error("[FINANCE] tukar-uang error:", err.message);
    res.redirect("/operasional?msg=err");
  }
});

// ── POST /operasional/lunas — tandai transaksi sbg lunas (settle piutang/hutang)
router.post("/lunas", async (req, res) => {
  const id = (req.body.id ?? "").trim();
  if (!id) return res.redirect("/operasional?msg=err");

  try {
    await markTransaksiLunas(id);
    res.redirect("/operasional?msg=lunas");
  } catch (err) {
    console.error("[FINANCE] lunas error:", err.message);
    res.redirect("/operasional?msg=err");
  }
});

// ── POST /operasional/void — soft void transaksi (immutable) ────────
// Karyawan juga boleh void (koreksi langsung di shift).
router.post("/void", async (req, res) => {
  const id     = (req.body.id ?? "").trim();
  const reason = (req.body.reason ?? "").trim();

  if (!id || !reason) return res.redirect("/operasional?msg=err");

  try {
    await voidTransaksi(id, reason);
    res.redirect("/operasional?msg=voided");
  } catch (err) {
    console.error("[FINANCE] void error:", err.message);
    res.redirect("/operasional?msg=err");
  }
});

// ── GET /operasional/kategori — kelola kategori (owner only) ────
// ── GET /operasional/analisis — halaman detail analisis target (owner-only) ──
router.get("/analisis", requireOwner, async (req, res) => {
  try {
    const transaksi = await readTransaksi();
    const today     = todayBusinessDayISO();
    const todayD    = new Date(today + "T00:00:00Z");

    const { breakdown: costBreakdown, targets, danaCadangan, monthlyIdeal, targetsIdeal } = await loadAnalisisData();

    const dow       = todayD.getUTCDay() === 0 ? 6 : todayD.getUTCDay() - 1;
    const mondayD   = new Date(todayD.getTime() - dow * 86400000);
    const mondayStr = mondayD.toISOString().slice(0, 10);
    // Exclude kategori "Tukar Uang" + transaksi belum lunas (piutang) — bukan
    // revenue cash-basis sampai dibayar.
    const isRevPem = (t) => t.jenis === "pemasukan" && !t.voidedAt && t.kategori !== KAT_TUKAR_UANG && t.lunas !== false;
    const inHari   = transaksi.filter((t) => isRevPem(t) && t.tanggal === today).reduce((s, t) => s + (t.jumlah || 0), 0);
    const inMinggu = transaksi.filter((t) => isRevPem(t) && t.tanggal >= mondayStr && t.tanggal <= today).reduce((s, t) => s + (t.jumlah || 0), 0);
    const inBulan  = transaksi.filter((t) => isRevPem(t) && (t.tanggal || "").startsWith(today.slice(0, 7))).reduce((s, t) => s + (t.jumlah || 0), 0);

    // Trend 30 hari: { tanggal, pemasukan }
    const trend30 = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(todayD.getTime() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const pem = transaksi.filter((t) => isRevPem(t) && t.tanggal === iso).reduce((s, t) => s + (t.jumlah || 0), 0);
      trend30.push({ tanggal: iso, pemasukan: pem });
    }

    const last30In  = trend30.reduce((s, d) => s + d.pemasukan, 0);
    const last30Avg = Math.round(last30In / 30);

    // Item 2 — rata-rata hari aktif (hari yg ada pemasukan) vs 30 hari kalender
    const activeDays = trend30.filter((d) => d.pemasukan > 0).length;
    const rataAktif  = activeDays > 0 ? Math.round(last30In / activeDays) : 0;

    // Fitur 1 — Pola hari ramai vs sepi: rata-rata pemasukan per hari dalam
    // seminggu, basis SEMUA riwayat & hanya hari aktif (ada pemasukan) supaya
    // rata-rata tidak ketarik turun oleh hari tutup. Weekday dgn < 2 kejadian
    // ditandai "data belum cukup" (jangan tampilkan angka menyesatkan).
    const dailyTotals = new Map();
    for (const t of transaksi) {
      if (!isRevPem(t) || !t.tanggal) continue;
      dailyTotals.set(t.tanggal, (dailyTotals.get(t.tanggal) || 0) + (t.jumlah || 0));
    }
    const dowSum = [0, 0, 0, 0, 0, 0, 0];
    const dowCnt = [0, 0, 0, 0, 0, 0, 0];
    for (const [iso, total] of dailyTotals) {
      if (total <= 0) continue;
      const wd  = new Date(iso + "T00:00:00Z").getUTCDay(); // 0=Min..6=Sab
      const idx = wd === 0 ? 6 : wd - 1;                     // 0=Sen..6=Min
      dowSum[idx] += total;
      dowCnt[idx] += 1;
    }
    const namaHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const polaHari = namaHari.map((nama, idx) => {
      const count  = dowCnt[idx];
      const enough = count >= 2;
      const avg    = count > 0 ? Math.round(dowSum[idx] / count) : 0;
      return { hari: nama, count, avg, enough, aboveTarget: enough && avg >= targets.hari };
    });

    // Tanggal mulai pencatatan = transaksi non-void paling awal
    let recordStart = null;
    for (const t of transaksi) {
      if (t.voidedAt || !t.tanggal) continue;
      if (!recordStart || t.tanggal < recordStart) recordStart = t.tanggal;
    }
    const calendarDaysSinceStart = recordStart
      ? Math.floor((todayD.getTime() - new Date(recordStart + "T00:00:00Z").getTime()) / 86400000) + 1
      : 0;
    // Data masih muda (<14 hari kalender) → default simulasi pakai basis hari aktif
    const defaultBasis = (calendarDaysSinceStart > 0 && calendarDaysSinceStart < 14) ? "aktif" : "kalender";

    // Item 3 — proyeksi pemasukan sampai akhir bulan
    const y             = parseInt(today.slice(0, 4), 10);
    const m             = parseInt(today.slice(5, 7), 10);
    const daysInMonth   = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const daysElapsed   = parseInt(today.slice(8, 10), 10);
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
    const proyeksiBulan = daysElapsed > 0 ? Math.round(inBulan / daysElapsed * daysInMonth) : inBulan;
    const sisaTarget    = Math.max(0, targets.bulan - inBulan);

    // Estimasi HARI OPERASI / BULAN dari frekuensi hari aktif dalam window
    // pengamatan (= rasio hari-aktif diproyeksikan ke 30 hari). Dipakai sbg
    // pembagi biaya pada basis "hari aktif" supaya konsisten dgn pemasukan
    // yg juga dibagi hari aktif. Window = lama mencatat (cap 30); kalau warung
    // aktif tiap hari → ~30, kalau jarang buka → mengecil otomatis.
    const windowDays = Math.min(calendarDaysSinceStart > 0 ? calendarDaysSinceStart : 30, 30);
    const hariOperasiPerBulan = activeDays > 0
      ? Math.max(1, Math.min(30, Math.round((activeDays * 30) / windowDays)))
      : 30;

    // Item 1+2 — simulasi tambah karyawan utk kedua basis (pembagi WAJIB selaras
    // dgn basis pemasukan: kalender→30, aktif→hari operasi/bln).
    const simKalender = evaluateAddKaryawan(last30Avg, costBreakdown.totalMonthly, 900000, 30);
    const simAktif    = evaluateAddKaryawan(rataAktif,  costBreakdown.totalMonthly, 900000, hariOperasiPerBulan);

    const analisis = {
      targets,
      costBreakdown,
      danaCadangan,
      monthlyIdeal,
      targetsIdeal,
      recordStart,
      rataKalender: last30Avg,
      rataAktif,
      activeDays,
      calendarDaysSinceStart,
      defaultBasis,
      polaHari,
      hari:   { pemasukan: inHari,   target: targets.hari,   status: computeStatus(inHari,   targets.hari) },
      minggu: { pemasukan: inMinggu, target: targets.minggu, status: computeStatus(inMinggu, targets.minggu) },
      bulan:  {
        pemasukan: inBulan, target: targets.bulan, status: computeStatus(inBulan, targets.bulan),
        proyeksi: proyeksiBulan, daysElapsed, daysInMonth, daysRemaining, sisaTarget,
      },
      simulasi: {
        defaultBasis,
        hariOperasiPerBulan,
        targetHarian: Math.round(costBreakdown.totalMonthly / 30),
        kalender: { rataPemasukan: last30Avg, ...simKalender },
        aktif:    { rataPemasukan: rataAktif,  ...simAktif },
      },
    };

    res.send(financeAnalisisPage({
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
      analisis,
      trend30,
      msg:         req.query.msg ?? "",
    }));
  } catch (err) {
    console.error("[FINANCE] analisis error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── CRUD biaya wajib (owner-only) ─────────────────────────────
router.post("/analisis/biaya/tambah", requireOwner, async (req, res) => {
  try {
    const nama      = (req.body.nama ?? "").trim().slice(0, 80);
    const frekuensi = ["bulanan", "harian", "mingguan"].includes(req.body.frekuensi) ? req.body.frekuensi : "bulanan";
    const nominal   = parseInt((req.body.nominal ?? "").replace(/\D/g, ""), 10) || 0;
    if (!nama || nominal <= 0) return res.redirect("/operasional/analisis?msg=err");
    await addFixedCost({ nama, frekuensi, nominal });
    res.redirect("/operasional/analisis?msg=added");
  } catch (err) {
    console.error("[FINANCE] tambah biaya error:", err.message);
    res.redirect("/operasional/analisis?msg=err");
  }
});

router.post("/analisis/biaya/edit", requireOwner, async (req, res) => {
  try {
    const id        = parseInt(req.body.id, 10);
    const nama      = (req.body.nama ?? "").trim().slice(0, 80);
    const frekuensi = ["bulanan", "harian", "mingguan"].includes(req.body.frekuensi) ? req.body.frekuensi : "bulanan";
    const nominal   = parseInt((req.body.nominal ?? "").replace(/\D/g, ""), 10) || 0;
    if (!id || !nama || nominal <= 0) return res.redirect("/operasional/analisis?msg=err");
    await updateFixedCost(id, { nama, frekuensi, nominal });
    res.redirect("/operasional/analisis?msg=updated");
  } catch (err) {
    console.error("[FINANCE] edit biaya error:", err.message);
    res.redirect("/operasional/analisis?msg=err");
  }
});

router.get("/analisis/biaya/hapus", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.query.id, 10);
    if (id) await deleteFixedCost(id);
    res.redirect("/operasional/analisis?msg=deleted");
  } catch (err) {
    console.error("[FINANCE] hapus biaya error:", err.message);
    res.redirect("/operasional/analisis?msg=err");
  }
});

// ── Dana cadangan bulanan (owner-only) — input terpisah dari biaya wajib ──
router.post("/analisis/cadangan", requireOwner, async (req, res) => {
  try {
    const nominal = parseInt((req.body.nominal ?? "").replace(/\D/g, ""), 10) || 0;
    await writeSetting(SETTING_DANA_CADANGAN, nominal);
    res.redirect("/operasional/analisis?msg=cadangan");
  } catch (err) {
    console.error("[FINANCE] cadangan error:", err.message);
    res.redirect("/operasional/analisis?msg=err");
  }
});

// ── Planning attachments helper ─────────────────────────────────
// Terima array of { name, type, data } (base64) dari client.
// Simpan file ke disk, return array of relative URLs (utk disimpan di DB).
// Plus kept URLs (file existing yg tdk dihapus user).
function savePlanningAttachments(rawList, keptUrls = []) {
  const kept = Array.isArray(keptUrls)
    ? keptUrls.filter((u) => typeof u === "string" && u.startsWith("/uploads/planning/")).slice(0, 10)
    : [];
  const out = [...kept];
  if (!Array.isArray(rawList)) return out;
  for (const f of rawList) {
    if (out.length >= 10) break;
    if (!f || typeof f.data !== "string") continue;
    const m = f.data.match(/^data:(image\/(jpeg|jpg|png|webp)|application\/pdf);base64,(.+)$/i);
    if (!m) continue;
    const mime = m[1].toLowerCase();
    let ext;
    if (mime === "application/pdf") ext = "pdf";
    else { const sub = m[2].toLowerCase(); ext = sub === "jpeg" ? "jpg" : sub; }
    try {
      const buf = Buffer.from(m[3], "base64");
      if (buf.length > 5 * 1024 * 1024) continue; // max 5MB per file
      if (!existsSync(PLANNING_DIR)) mkdirSync(PLANNING_DIR, { recursive: true });
      const fname = "plan-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) + "." + ext;
      writeFileSync(join(PLANNING_DIR, fname), buf);
      out.push("/uploads/planning/" + fname);
    } catch (e) {
      console.error("[PLANNING] save attachment error:", e.message);
    }
  }
  return out;
}

// ── Planning & Roadmap (owner only) ─────────────────────────────
router.get("/planning", requireOwner, async (req, res) => {
  try {
    const [items, goals, allPayments] = await Promise.all([
      readPlanningItems(),
      readPlanningGoals(),
      readPlanningPayments(),
    ]);
    // Group payments by itemId & attach ke masing-masing item
    const paymentsByItem = {};
    allPayments.forEach((p) => {
      (paymentsByItem[p.itemId] = paymentsByItem[p.itemId] || []).push(p);
    });
    items.forEach((it) => { it.payments = paymentsByItem[it.id] || []; });
    res.send(planningPage({
      items,
      goals,
      token: "",
      role: "owner",
      displayName: res.locals.financeDisplay || "",
    }));
  } catch (err) {
    console.error("[PLANNING] list error:", err.message);
    res.status(500).send("Gagal memuat halaman planning.");
  }
});

// Parse attachments dari body. Bisa berupa:
// - body.attachments_new (JSON string of [{name,type,data}])
// - body.attachments_kept (JSON string of existing URLs untuk dipertahankan)
// - body.attachments (JSON string of urls — fallback untuk pemanggil internal)
function resolvePlanningAttachments(body) {
  let newList = [];
  let keptList = [];
  try { newList = JSON.parse(body.attachments_new || "[]"); } catch {}
  try { keptList = JSON.parse(body.attachments_kept || "[]"); } catch {}
  // Fallback: kalau cuma kirim attachments (array of URLs), perlakukan sbg kept
  if (!Array.isArray(newList)) newList = [];
  if (!Array.isArray(keptList)) keptList = [];
  if (keptList.length === 0 && body.attachments) {
    try {
      const v = JSON.parse(body.attachments);
      if (Array.isArray(v)) keptList = v.filter((u) => typeof u === "string");
    } catch {}
  }
  return savePlanningAttachments(newList, keptList);
}

router.post("/planning/add", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const nama = (body.nama || "").trim();
    if (!nama) return res.status(400).send("Nama item wajib diisi.");
    const attachments = resolvePlanningAttachments(body);
    await addPlanningItem({
      nama,
      kategori:     body.kategori,
      estimasi:     body.estimasi,
      prioritas:    body.prioritas,
      status:       body.status,
      targetDate:   body.target_date,
      vendor:       body.vendor,
      catatan:      body.catatan,
      roiEstimate:  body.roi_estimate,
      savedAmount:  body.saved_amount,
      attachments,
      tipe:         body.tipe,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] add error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/edit", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const id = (body.id || "").trim();
    if (!id) return res.status(400).send("ID item wajib.");
    const nama = (body.nama || "").trim();
    if (!nama) return res.status(400).send("Nama item wajib.");
    const attachments = resolvePlanningAttachments(body);
    await updatePlanningItem(id, {
      nama,
      kategori:     body.kategori,
      estimasi:     body.estimasi,
      prioritas:    body.prioritas,
      status:       body.status,
      targetDate:   body.target_date,
      vendor:       body.vendor,
      catatan:      body.catatan,
      roiEstimate:  body.roi_estimate,
      attachments,
      tipe:         body.tipe,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] edit error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/delete", requireOwner, async (req, res) => {
  try {
    const id = (req.body?.id || "").trim();
    if (!id) return res.status(400).send("ID item wajib.");
    await deletePlanningItem(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] delete error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Payments / cicilan bulanan ──────────────────────────────────
router.post("/planning/payment/add", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const itemId = (body.item_id || "").trim();
    const amount = parseInt(body.amount) || 0;
    const bulan = (body.bulan || "").slice(0, 7);
    if (!itemId || amount <= 0 || !bulan) {
      return res.status(400).json({ ok: false, error: "item_id, amount (>0), dan bulan (YYYY-MM) wajib." });
    }
    await addPlanningPayment({ itemId, amount, bulan, catatan: body.catatan });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] payment add error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/payment/delete", requireOwner, async (req, res) => {
  try {
    const id = (req.body?.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "ID payment wajib." });
    await deletePlanningPayment(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] payment delete error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Toggle status paid/unpaid utk row pembayaran (checkbox di Riwayat)
router.post("/planning/payment/toggle", requireOwner, async (req, res) => {
  try {
    const id = (req.body?.id || "").trim();
    const raw = req.body?.paid;
    const paid = (raw === true) || (raw === "true") || (raw === "1") || (raw === 1);
    if (!id) return res.status(400).json({ ok: false, error: "ID payment wajib." });
    await togglePlanningPayment(id, paid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] payment toggle error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Seed entry dari saved_amount lama (legacy data) — bikin 1 payment "Saldo Awal"
// dgn paid=true, total = saved_amount sekarang. Reset saved_amount dulu spy gak
// double (addPlanningPayment akan bump balik). Hanya jalan kalau item belum
// punya payment entries sama sekali.
router.post("/planning/payment/seed-saldo-awal", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const itemId = (body.item_id || "").trim();
    const bulan = (body.bulan || "").slice(0, 7);
    if (!itemId || !bulan) {
      return res.status(400).json({ ok: false, error: "item_id & bulan wajib." });
    }
    // Cek payments existing
    const existing = await readPlanningPayments(itemId);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: "Item sudah punya riwayat pembayaran." });
    }
    // Ambil saved_amount sekarang sbg jumlah seed
    const items = await readPlanningItems();
    const it = items.find((x) => x.id === itemId);
    if (!it) return res.status(404).json({ ok: false, error: "Item tidak ditemukan." });
    const seedAmount = parseInt(it.savedAmount) || 0;
    if (seedAmount <= 0) {
      return res.status(400).json({ ok: false, error: "Saldo awal 0, tidak ada yg di-seed." });
    }
    // Reset saved_amount dulu (biar addPlanningPayment bump balik ke nilai yg sama)
    await wipeAllPlanningPayments(itemId);
    // Lalu add 1 entry paid=true sbg saldo awal
    await addPlanningPayment({
      itemId,
      amount: seedAmount,
      bulan,
      paid: true,
      catatan: "Saldo awal (data sebelum tracking per-bulan diaktifkan)",
    });
    res.json({ ok: true, amount: seedAmount });
  } catch (err) {
    console.error("[PLANNING] seed saldo awal error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Bulk-create N entries scheduled (paid=false) berdasarkan rencana cicilan.
// Sebelum create, hapus existing unpaid entries utk item ini supaya gak dupe
// kalau user re-generate plan (mis. dari 3 bulan → 6 bulan).
// Entries yg sudah paid TIDAK diganggu — itu real payment history.
router.post("/planning/payment/schedule", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const itemId = (body.item_id || "").trim();
    const amount = parseInt(body.amount) || 0;
    const startBulan = (body.start_bulan || "").slice(0, 7);
    const count = parseInt(body.count) || 0;
    const remaining = parseInt(body.remaining) || 0;
    if (!itemId || amount <= 0 || !startBulan || count <= 0) {
      return res.status(400).json({ ok: false, error: "item_id, amount, start_bulan, count wajib." });
    }
    if (count > 60) {
      return res.status(400).json({ ok: false, error: "Max 60 bulan per rencana." });
    }
    const [yy, mm] = startBulan.split("-").map((s) => parseInt(s));
    if (!yy || !mm) return res.status(400).json({ ok: false, error: "Format bulan invalid." });
    // Cleanup: clean-slate behavior — hapus SEMUA entries (paid + unpaid)
    // dan reset saved_amount supaya rencana baru jadi single source of truth.
    await wipeAllPlanningPayments(itemId);
    let rem = remaining > 0 ? remaining : amount * count;
    let added = 0;
    for (let i = 0; i < count && rem > 0; i++) {
      const pay = Math.min(amount, rem);
      const d = new Date(yy, mm - 1 + i, 1);
      const bulan = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      await addPlanningPayment({ itemId, amount: pay, bulan, paid: false, catatan: "Rencana cicilan" });
      rem -= pay;
      added++;
    }
    res.json({ ok: true, added });
  } catch (err) {
    console.error("[PLANNING] payment schedule error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Goals (Anggaran / Tabungan) ─────────────────────────────────
router.post("/planning/goal/add", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const nama = (body.nama || "").trim();
    const target = parseInt(body.target_amount) || 0;
    if (!nama || target <= 0) return res.status(400).json({ ok: false, error: "Nama & target wajib (target > 0)." });
    await addPlanningGoal({
      nama,
      targetAmount:  target,
      currentAmount: parseInt(body.current_amount) || 0,
      autoPercent:   parseInt(body.auto_percent) || 0,
      source:        body.source,
      status:        body.status,
      linkedItemId:  body.linked_item_id,
      targetDate:    body.target_date,
      catatan:       body.catatan,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] goal add error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/goal/edit", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const id = (body.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "ID goal wajib." });
    const target = parseInt(body.target_amount) || 0;
    if (target <= 0) return res.status(400).json({ ok: false, error: "Target harus > 0." });
    await updatePlanningGoal(id, {
      nama:          body.nama,
      targetAmount:  target,
      autoPercent:   parseInt(body.auto_percent) || 0,
      source:        body.source,
      status:        body.status,
      linkedItemId:  body.linked_item_id,
      targetDate:    body.target_date,
      catatan:       body.catatan,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] goal edit error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/goal/deposit", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const id = (body.id || "").trim();
    const amount = parseInt(body.amount) || 0;
    if (!id || amount <= 0) return res.status(400).json({ ok: false, error: "ID goal & amount > 0 wajib." });
    await addGoalDeposit(id, amount);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] goal deposit error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/planning/goal/delete", requireOwner, async (req, res) => {
  try {
    const id = (req.body?.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "ID goal wajib." });
    await deletePlanningGoal(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[PLANNING] goal delete error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/kategori", requireOwner, async (req, res) => {
  try {
    const [kategori, subKategori] = await Promise.all([readKategori(), readSubKategori()]);
    res.send(financeKategoriPage(res.locals.financeRole, kategori, !!req.query.err, subKategori));
  } catch (err) {
    console.error("[FINANCE] kategori error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /operasional/kategori/tambah ───────────────────────────
router.post("/kategori/tambah", requireOwner, async (req, res) => {
  const nama  = (req.body.nama  ?? "").trim();
  const jenis = req.body.jenis  ?? "";

  if (!nama || !["pemasukan", "pengeluaran"].includes(jenis)) {
    return res.redirect("/operasional/kategori?err=1");
  }

  try {
    await addKategori(nama, jenis);
    res.redirect("/operasional/kategori");
  } catch (err) {
    console.error("[FINANCE] kategori tambah error:", err.message);
    res.redirect("/operasional/kategori?err=1");
  }
});

// ── GET /operasional/kategori/hapus — hapus kategori ────────────
router.get("/kategori/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteKategori(id); } catch (err) {
      console.error("[FINANCE] kategori hapus error:", err.message);
    }
  }
  res.redirect("/operasional/kategori");
});

// ── POST /operasional/kategori/sub/tambah ───────────────────────
router.post("/kategori/sub/tambah", requireOwner, async (req, res) => {
  const kategoriId = parseInt(req.body.kategori_id) || 0;
  const nama = (req.body.nama ?? "").trim();
  if (!kategoriId || !nama) return res.redirect("/operasional/kategori?err=1");
  try {
    await addSubKategori(kategoriId, nama);
    res.redirect("/operasional/kategori");
  } catch (err) {
    console.error("[FINANCE] sub kategori tambah error:", err.message);
    res.redirect("/operasional/kategori?err=1");
  }
});

// ── GET /operasional/kategori/sub/hapus ─────────────────────────
router.get("/kategori/sub/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteSubKategori(id); } catch (err) {
      console.error("[FINANCE] sub kategori hapus error:", err.message);
    }
  }
  res.redirect("/operasional/kategori");
});

// ── POST /operasional/kategori/urutan — reorder via drag-and-drop ───
router.post("/kategori/urutan", requireOwner, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!ids) return res.status(400).json({ ok: false, error: "ids harus array" });
  try {
    await updateKategoriUrutan(ids);
    res.json({ ok: true });
  } catch (err) {
    console.error("[FINANCE] kategori urutan error:", err.message);
    res.status(500).json({ ok: false, error: "gagal simpan urutan" });
  }
});

// ── GET /operasional/menu — kelola menu item (owner only) ────────
// Sekarang juga load bahan baku + resep + compute HPP map per menu utk
// display HPP & margin di tiap card. Query param:
//   ?edit=<id>      → buka edit mode utk menu item id
//   ?resep=<id>     → buka resep editor utk menu item id
//   ?tab=bahan      → tampilan tab Bahan Baku (default: tab Item Menu)
//   ?editbahan=<id> → buka edit mode utk bahan id (di tab bahan)
//   ?err=1          → flash error
router.get("/menu", requireOwner, async (req, res) => {
  try {
    const [items, toppings, bahanList, resepAll, hppMap, suppliers] = await Promise.all([
      readMenuItems(),
      readMenuToppings(),
      readBahan(),
      readResepAll(),
      computeHppMap(),
      readSuppliers(),
    ]);
    const editId       = parseInt(req.query.edit)      || 0;
    const editBahanId  = parseInt(req.query.editbahan) || 0;
    const resepMenuId  = parseInt(req.query.resep)     || 0;
    const editItem     = editId      ? items.find((m) => m.id === editId)        || null : null;
    const editBahan    = editBahanId ? bahanList.find((b) => b.id === editBahanId) || null : null;
    const resepMenu    = resepMenuId ? items.find((m) => m.id === resepMenuId)   || null : null;
    const activeTab    = req.query.tab === "bahan" ? "bahan" : "menu";
    res.send(financeMenuPage(res.locals.financeRole, items, toppings, !!req.query.err, editItem, {
      bahanList, resepAll, hppMap, editBahan, resepMenu, activeTab, suppliers,
    }));
  } catch (err) {
    console.error("[FINANCE] menu GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// Helper: parse qty_per_porsi (terima koma atau titik). Default 1 jika kosong.
function parseQtyPerPorsi(raw) {
  const v = parseFloat((raw ?? "").toString().replace(",", ".")) || 0;
  return v > 0 ? v : 1;
}
// Helper: parse number bahan (decimal, koma/titik OK, fallback 0).
function parseNum(raw) {
  return Math.max(0, parseFloat((raw ?? "").toString().replace(",", ".")) || 0);
}
// Helper: parse Rupiah input (strip non-digit, return integer).
function parseRupiah(raw) {
  return Math.max(0, parseInt((raw ?? "").toString().replace(/\D/g, "")) || 0);
}
// Helper: extract extras dari body utk bahan_baku.
function parseBahanExtras(body) {
  return {
    hargaDus:        parseRupiah(body.harga_dus),
    isiPerDus:       parseNum(body.isi_per_dus),
    hargaRenteng:    parseRupiah(body.harga_renteng),
    isiPerRenteng:   parseNum(body.isi_per_renteng),
    supplier:        (body.supplier ?? "").trim(),  // legacy: preserved via hidden input di edit form
    catatan:         (body.catatan  ?? "").trim(),
    supplierId:      parseInt(body.supplier_id) || 0,
  };
}

// ── POST /operasional/menu/bahan/tambah ─────────────────────────
router.post("/menu/bahan/tambah", requireOwner, async (req, res) => {
  const nama   = (req.body.nama   ?? "").trim();
  const satuan = (req.body.satuan ?? "pcs").trim();
  const harga  = parseRupiah(req.body.harga_per_satuan);
  const qtyPP  = parseQtyPerPorsi(req.body.qty_per_porsi);
  const label  = (req.body.porsi_label ?? "").trim();
  const extras = parseBahanExtras(req.body);
  if (!nama || harga <= 0) return res.redirect("/operasional/menu?tab=bahan&err=1");
  try {
    await addBahan(nama, satuan, harga, qtyPP, label, extras);
    res.redirect("/operasional/menu?tab=bahan");
  } catch (err) {
    console.error("[FINANCE] bahan tambah error:", err.message);
    res.redirect("/operasional/menu?tab=bahan&err=1");
  }
});

// ── POST /operasional/menu/bahan/edit ───────────────────────────
// changedBy diisi otomatis dari user yg login (utk audit history harga).
router.post("/menu/bahan/edit", requireOwner, async (req, res) => {
  const id     = parseInt(req.body.id) || 0;
  const nama   = (req.body.nama   ?? "").trim();
  const satuan = (req.body.satuan ?? "pcs").trim();
  const harga  = parseRupiah(req.body.harga_per_satuan);
  const qtyPP  = parseQtyPerPorsi(req.body.qty_per_porsi);
  const label  = (req.body.porsi_label ?? "").trim();
  const extras = parseBahanExtras(req.body);
  const who    = res.locals.financeDisplay || res.locals.financeUser || "owner";
  if (!id || !nama || harga <= 0) return res.redirect("/operasional/menu?tab=bahan&err=1");
  try {
    await updateBahan(id, nama, satuan, harga, qtyPP, label, extras, who);
    res.redirect("/operasional/menu?tab=bahan");
  } catch (err) {
    console.error("[FINANCE] bahan edit error:", err.message);
    res.redirect("/operasional/menu?tab=bahan&err=1");
  }
});

// ── GET /operasional/menu/bahan/history?id=X ────────────────────
// Return JSON history perubahan harga utk 1 bahan. Dipake oleh modal
// detail di view (fetch async).
router.get("/menu/bahan/history", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (!id) return res.json({ ok: false, rows: [] });
  try {
    const rows = await readBahanHistory(id);
    res.json({ ok: true, rows });
  } catch (err) {
    console.error("[FINANCE] bahan history error:", err.message);
    res.json({ ok: false, rows: [], error: err.message });
  }
});

// ── GET /operasional/menu/bahan/hapus ───────────────────────────
// ON DELETE CASCADE di FK menu_resep → row resep yg refer ke bahan ini
// otomatis kebawa hapus, jadi gak perlu manual cleanup.
router.get("/menu/bahan/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteBahan(id); } catch (err) {
      console.error("[FINANCE] bahan hapus error:", err.message);
    }
  }
  res.redirect("/operasional/menu?tab=bahan");
});

// ── POST /operasional/menu/resep/set ────────────────────────────
// Bulk replace resep untuk 1 menu. Body: menu_id, bahan_id[] (array),
// qty[] (array, paired index). Row dgn qty<=0 di-skip → klik Simpan tanpa
// isi = clear semua resep.
router.post("/menu/resep/set", requireOwner, async (req, res) => {
  const menuId   = parseInt(req.body.menu_id) || 0;
  if (!menuId) return res.redirect("/operasional/menu?err=1");
  const bahanIds = [].concat(req.body.bahan_id ?? []);
  const qtys     = [].concat(req.body.qty      ?? []);
  const items    = bahanIds.map((bid, i) => ({
    bahan_id: parseInt(bid) || 0,
    qty:      parseFloat((qtys[i] ?? "").toString().replace(",", ".")) || 0,
  }));
  try {
    await setResep(menuId, items);
    res.redirect("/operasional/menu");
  } catch (err) {
    console.error("[FINANCE] resep set error:", err.message);
    res.redirect("/operasional/menu?resep=" + menuId + "&err=1");
  }
});

// ── POST /operasional/menu/tambah ────────────────────────────────
router.post("/menu/tambah", requireOwner, async (req, res) => {
  const nama       = (req.body.nama     ?? "").trim();
  const harga      = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
  const hargaHot   = parseInt((req.body.harga_hot ?? "").replace(/\D/g, "")) || null;
  const kategori   = (req.body.kategori ?? "minuman").trim();
  const bestSeller = [].concat(req.body.best_seller ?? "0").includes("1");
  if (!nama || harga <= 0) return res.redirect("/operasional/menu?err=1");
  try {
    await addMenuItem(nama, harga, kategori, bestSeller, hargaHot || null);
    res.redirect("/operasional/menu");
  } catch (err) {
    console.error("[FINANCE] menu tambah error:", err.message);
    res.redirect("/operasional/menu?err=1");
  }
});

// ── POST /operasional/menu/edit ──────────────────────────────────
router.post("/menu/edit", requireOwner, async (req, res) => {
  const id         = parseInt(req.body.id) || 0;
  const nama       = (req.body.nama     ?? "").trim();
  const harga      = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
  const hargaHot   = parseInt((req.body.harga_hot ?? "").replace(/\D/g, "")) || null;
  const kategori   = (req.body.kategori ?? "minuman").trim();
  const bestSeller = [].concat(req.body.best_seller ?? "0").includes("1");
  if (!id || !nama || harga <= 0) return res.redirect("/operasional/menu?err=1");
  try {
    await updateMenuItem(id, nama, harga, kategori, bestSeller, hargaHot || null);
    res.redirect("/operasional/menu");
  } catch (err) {
    console.error("[FINANCE] menu edit error:", err.message);
    res.redirect("/operasional/menu?err=1");
  }
});

// ── GET /operasional/menu/hapus ──────────────────────────────────
router.get("/menu/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMenuItem(id); } catch (err) {
      console.error("[FINANCE] menu hapus error:", err.message);
    }
  }
  res.redirect("/operasional/menu");
});

// ── POST /operasional/menu/topping/tambah ────────────────────────
router.post("/menu/topping/tambah", requireOwner, async (req, res) => {
  const itemId = parseInt(req.body.item_id) || 0;
  const nama   = (req.body.nama  ?? "").trim();
  const harga  = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
  if (!itemId || !nama || harga <= 0) return res.redirect("/operasional/menu?err=1");
  try {
    await addMenuTopping(itemId, nama, harga);
    res.redirect("/operasional/menu");
  } catch (err) {
    console.error("[FINANCE] topping tambah error:", err.message);
    res.redirect("/operasional/menu?err=1");
  }
});

// ── GET /operasional/menu/topping/hapus ─────────────────────────
router.get("/menu/topping/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMenuTopping(id); } catch (err) {
      console.error("[FINANCE] topping hapus error:", err.message);
    }
  }
  res.redirect("/operasional/menu");
});

// ── Manajemen Meja (master meja + tarif) — owner only ────────────
// Setup-only: CRUD meja + tarif + status. Sumber pilihan Nomor Meja & tarif
// auto-calc di Catat Transaksi. Tidak menyentuh alur/skema transaksi.
router.get("/meja", requireOwner, async (req, res) => {
  try {
    const [mejaList, sesiInfo] = await Promise.all([readMejas(), readMejaOpenSesiInfo()]);
    const occupiedIds = sesiInfo.map((s) => s.meja_id);
    const openSesiByMeja = {};
    for (const s of sesiInfo) openSesiByMeja[s.meja_id] = { opened_at: s.opened_at, waktu: s.waktu };
    res.send(financeMejaPage(res.locals.financeRole, mejaList, !!req.query.err, req.query.msg || "", occupiedIds, openSesiByMeja));
  } catch (err) {
    console.error("[FINANCE] meja GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

router.post("/meja/tambah", requireOwner, async (req, res) => {
  const nama = (req.body.nama ?? "").trim().slice(0, 60);
  const ts = parseInt((req.body.tarif_siang ?? "").replace(/\D/g, "")) || 0;
  const tm = parseInt((req.body.tarif_malam ?? "").replace(/\D/g, "")) || 0;
  const to = ts; // Open ikut tarif Siang/Malam; kolom tarif_open disimpan = Siang utk kompatibilitas
  const jenis = ["7ft", "9ft"].includes(req.body.jenis) ? req.body.jenis : "7ft";
  if (!nama) return res.redirect("/operasional/meja?err=1");
  try {
    await addMeja(nama, ts, tm, to, jenis);
    res.redirect("/operasional/meja?msg=added");
  } catch (err) {
    console.error("[FINANCE] meja tambah error:", err.message);
    res.redirect("/operasional/meja?err=1");
  }
});

router.post("/meja/edit", requireOwner, async (req, res) => {
  const id = parseInt(req.body.id) || 0;
  const nama = (req.body.nama ?? "").trim().slice(0, 60);
  const ts = parseInt((req.body.tarif_siang ?? "").replace(/\D/g, "")) || 0;
  const tm = parseInt((req.body.tarif_malam ?? "").replace(/\D/g, "")) || 0;
  const to = ts; // Open ikut tarif Siang/Malam; kolom tarif_open disimpan = Siang utk kompatibilitas
  const jenis = ["7ft", "9ft"].includes(req.body.jenis) ? req.body.jenis : "7ft";
  if (!id || !nama) return res.redirect("/operasional/meja?err=1");
  try {
    await updateMeja(id, nama, ts, tm, to, jenis);
    res.redirect("/operasional/meja?msg=updated");
  } catch (err) {
    console.error("[FINANCE] meja edit error:", err.message);
    res.redirect("/operasional/meja?err=1");
  }
});

// Terapkan tarif Siang/Malam ke banyak meja sekaligus (opsi filter jenis 7ft/9ft).
router.post("/meja/tarif-massal", requireOwner, async (req, res) => {
  const ts = parseInt((req.body.tarif_siang ?? "").replace(/\D/g, "")) || 0;
  const tm = parseInt((req.body.tarif_malam ?? "").replace(/\D/g, "")) || 0;
  const jenis = ["7ft", "9ft"].includes(req.body.jenis) ? req.body.jenis : "all";
  if (ts <= 0 && tm <= 0) return res.redirect("/operasional/meja?err=1");
  try {
    await updateMejaTarifMassal(ts, tm, jenis);
    res.redirect("/operasional/meja?msg=massal");
  } catch (err) {
    console.error("[FINANCE] meja tarif massal error:", err.message);
    res.redirect("/operasional/meja?err=1");
  }
});

router.post("/meja/status", requireOwner, async (req, res) => {
  const id = parseInt(req.body.id) || 0;
  const status = (req.body.status ?? "").trim();
  if (id) {
    try { await setMejaStatus(id, status); } catch (err) {
      console.error("[FINANCE] meja status error:", err.message);
    }
  }
  res.redirect("/operasional/meja?msg=status");
});

router.get("/meja/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMeja(id); } catch (err) {
      console.error("[FINANCE] meja hapus error:", err.message);
    }
  }
  res.redirect("/operasional/meja?msg=deleted");
});

// ── Sesi / Bill Meja (owner & karyawan) ──────────────────────────
// Sesi = wadah transaksi 1 meja (sewa + F&B). Tiap item = baris transaksi
// ber-sesi_id + lunas (engine saldo lama otomatis: belum bayar = tak nambah).
const _genTrxId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 7);

router.get("/sesi", async (req, res) => {
  try {
    const [sesiOpen, mejaAktif, menuItems] = await Promise.all([
      readSesiOpen(), readMejaAktif(), readMenuItems(),
    ]);
    const sesiList = await Promise.all(sesiOpen.map(async (s) => {
      const items = await readSesiItems(s.id);
      const meja  = mejaAktif.find((m) => m.id === s.meja_id);
      return { ...s, items, tarif_open: meja?.tarif_open || 0, tarif_siang: meja?.tarif_siang || 0, tarif_malam: meja?.tarif_malam || 0 };
    }));
    const occupied = new Set(sesiOpen.map((s) => s.meja_id));
    const mejaTersedia = mejaAktif.filter((m) => !occupied.has(m.id));
    res.send(financeSesiPage({
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
      sesiList, mejaTersedia, menuItems,
      msg: req.query.msg || "",
    }));
  } catch (err) {
    console.error("[FINANCE] sesi GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── Tarif sesi berbasis jam (WIB) ─────────────────────────────────
// Siang = pukul 08:00–18:00 WIB (UTC+7), sisanya Malam. Sesi yang melewati
// batas dihitung split per detik. siang/malam = tarif per jam (rupiah).
function _siangSec(aMs, bMs) {
  const off = 25200; // +7 jam (WIB) dalam detik
  const s = Math.floor(aMs / 1000) + off, e = Math.floor(bMs / 1000) + off;
  let t = 0;
  for (let d = Math.floor(s / 86400) * 86400; d < e; d += 86400) {
    const lo = Math.max(s, d + 28800), hi = Math.min(e, d + 64800); // [08:00,18:00)
    if (hi > lo) t += hi - lo;
  }
  return t;
}
function tarifSplit(aMs, bMs, siang, malam) {
  if (bMs <= aMs) return 0;
  const tot = (bMs - aMs) / 1000, ss = _siangSec(aMs, bMs);
  return Math.round((ss / 3600) * siang + ((tot - ss) / 3600) * malam);
}
function wibSiang(ms) {
  const mod = Math.floor(((Math.floor(ms / 1000) + 25200) % 86400) / 60);
  return mod >= 480 && mod < 1080; // 08:00–18:00
}

router.post("/sesi/buka", async (req, res) => {
  const mejaId = parseInt(req.body.meja_id) || 0;
  if (!mejaId) return res.redirect("/operasional/sesi?msg=err");
  try {
    const meja = (await readMejas()).find((m) => m.id === mejaId);
    if (!meja || meja.status !== "aktif") return res.redirect("/operasional/sesi?msg=err");
    if (await hasOpenSesi(mejaId)) return res.redirect("/operasional/sesi?msg=sudah_ada");
    // Durasi: 'Open' -> harga 0 (diisi saat tutup). 'N Jam' -> harga = split tarif
    // ikut jam main (Siang 08–18 WIB, sisanya Malam), bisa diedit saat tutup.
    // waktu disimpan utk bucket laporan = jam saat sesi dibuka. lunas:false.
    const durasi = (req.body.durasi ?? "Open").trim().slice(0, 20);
    // Jam mulai: default sekarang. Bisa dimundurkan (sesi telat dicatat) — dibatasi
    // tidak di masa depan & maksimal 24 jam ke belakang. Tarif & timer ikut jam ini.
    const nowMs   = Date.now();
    const mulaiMs = parseInt(req.body.mulai) || 0;
    const startMs = (mulaiMs > 0 && mulaiMs <= nowMs && mulaiMs >= nowMs - 86400000) ? mulaiMs : nowMs;
    const waktu   = wibSiang(startMs) ? "siang" : "malam";
    const mJam    = durasi.match(/^(\d+) Jam$/);
    let sewaJumlah = 0, sewaKet = "Sewa " + meja.nama;
    if (mJam) {
      const jam  = parseInt(mJam[1]);
      sewaJumlah = tarifSplit(startMs, startMs + jam * 3600000, meja.tarif_siang || 0, meja.tarif_malam || 0);
      sewaKet    = "Sewa " + meja.nama + " · " + durasi;
    }
    const sesiId = await createSesi(
      mejaId, meja.nama, res.locals.financeDisplay || res.locals.financeUser || "",
      "", undefined, startMs === nowMs ? null : new Date(startMs)
    );
    await appendTransaksi({
      id: _genTrxId(), tanggal: todayBusinessDayISO(), jam: "",
      jenis: "pemasukan", waktu,
      kategori: "Sewa Meja", keterangan: sewaKet,
      jumlah: sewaJumlah, lunas: false, bayar: "",
      dicatatOleh: res.locals.financeUser || "", sesiId,
    });
    // F&B opsional yang diinput sekalian saat buka sesi -> 1 transaksi gabungan
    // (belum bayar), persis seperti /sesi/item/tambah. Sewa tetap transaksi terpisah.
    let rawItems = [];
    try { rawItems = JSON.parse(req.body.items || "[]"); } catch { rawItems = []; }
    if (Array.isArray(rawItems) && rawItems.length) {
      const parts = []; let total = 0;
      for (const it of rawItems) {
        const nm = String(it && it.nama || "").trim().slice(0, 80);
        const q  = Math.max(1, parseInt(it && it.qty) || 1);
        const h  = parseInt(it && it.harga) || 0;
        if (!nm || h <= 0) continue;
        total += h * q;
        parts.push((q > 1 ? q + "× " : "") + nm);
      }
      if (parts.length && total > 0) {
        await appendTransaksi({
          id: _genTrxId(), tanggal: todayBusinessDayISO(), jam: "",
          jenis: "pemasukan", waktu: res.locals.financeShift || "siang",
          kategori: "Kopi / Snack", keterangan: parts.join(", "),
          jumlah: total, lunas: false, bayar: "",
          dicatatOleh: res.locals.financeUser || "", sesiId,
        });
      }
    }
    res.redirect("/operasional/sesi?msg=dibuka");
  } catch (err) {
    console.error("[FINANCE] sesi buka error:", err.message);
    res.redirect("/operasional/sesi?msg=err");
  }
});

// Ubah durasi sewa saat sesi berjalan (mis. customer perpanjang 2->3 jam).
router.post("/sesi/sewa/durasi", async (req, res) => {
  const sesiId = parseInt(req.body.sesi_id) || 0;
  const durasi = (req.body.durasi ?? "Open").trim().slice(0, 20);
  try {
    const sesi = await readSesiById(sesiId);
    if (!sesi || sesi.status !== "open") return res.redirect("/operasional/sesi?msg=err");
    const meja = (await readMejas()).find((m) => m.id === sesi.meja_id);
    const mJam = durasi.match(/^(\d+) Jam$/);
    let jumlah = 0, ket = "Sewa " + (sesi.nama_meja || "Meja");
    if (mJam && meja) {
      const jam     = parseInt(mJam[1]);
      // Dihitung dari jam buka sesi -> split Siang/Malam ikut jam main.
      const startMs = new Date(sesi.opened_at).getTime() || Date.now();
      jumlah = tarifSplit(startMs, startMs + jam * 3600000, meja.tarif_siang || 0, meja.tarif_malam || 0);
      ket    = "Sewa " + (sesi.nama_meja || "Meja") + " · " + durasi;
    }
    await updateSesiSewa(sesiId, jumlah, ket);
    res.redirect("/operasional/sesi?msg=durasi");
  } catch (err) {
    console.error("[FINANCE] sesi sewa durasi error:", err.message);
    res.redirect("/operasional/sesi?msg=err");
  }
});

router.post("/sesi/item/tambah", async (req, res) => {
  const sesiId = parseInt(req.body.sesi_id) || 0;
  // Keranjang: beberapa item -> 1 transaksi gabungan (keterangan + total).
  let raw = [];
  try { raw = JSON.parse(req.body.items || "[]"); } catch { raw = []; }
  // Fallback legacy single-item (nama/qty/harga) — jaga-jaga.
  if (!Array.isArray(raw) || raw.length === 0) {
    const nm = (req.body.nama ?? "").trim();
    const h  = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
    if (nm && h > 0) raw = [{ nama: nm, qty: parseInt(req.body.qty) || 1, harga: h }];
  }
  try {
    const sesi = await readSesiById(sesiId);
    if (!sesi || sesi.status !== "open") return res.redirect("/operasional/sesi?msg=err");
    const parts = []; let total = 0;
    for (const it of raw) {
      const nm = String(it && it.nama || "").trim().slice(0, 80);
      const q  = Math.max(1, parseInt(it && it.qty) || 1);
      const h  = parseInt(it && it.harga) || 0;
      if (!nm || h <= 0) continue;
      total += h * q;
      parts.push((q > 1 ? q + "× " : "") + nm);
    }
    if (parts.length === 0 || total <= 0) return res.redirect("/operasional/sesi?msg=err");
    await appendTransaksi({
      id: _genTrxId(), tanggal: todayBusinessDayISO(), jam: "",
      jenis: "pemasukan", waktu: res.locals.financeShift || "siang",
      kategori: "Kopi / Snack", keterangan: parts.join(", "),
      jumlah: total, lunas: false, bayar: "",
      dicatatOleh: res.locals.financeUser || "", sesiId,
    });
    res.redirect("/operasional/sesi?msg=ditambah");
  } catch (err) {
    console.error("[FINANCE] sesi item tambah error:", err.message);
    res.redirect("/operasional/sesi?msg=err");
  }
});

router.post("/sesi/item/bayar", async (req, res) => {
  const id    = (req.body.id ?? "").trim();
  const bayar = ["cash", "qris"].includes(req.body.bayar) ? req.body.bayar : "cash";
  try { if (id) await setSesiItemPaid(id, bayar); } catch (err) {
    console.error("[FINANCE] sesi item bayar error:", err.message);
  }
  res.redirect("/operasional/sesi?msg=dibayar");
});

// Hapus (void) item F&B dari sesi — bisa item belum/sudah bayar (saldo
// terkoreksi otomatis). Item sewa tidak bisa dihapus lewat sini.
router.post("/sesi/item/hapus", async (req, res) => {
  const sesiId = parseInt(req.body.sesi_id) || 0;
  const id     = (req.body.id ?? "").trim();
  try { if (sesiId && id) await voidSesiItem(sesiId, id); } catch (err) {
    console.error("[FINANCE] sesi item hapus error:", err.message);
  }
  res.redirect("/operasional/sesi?msg=item_hapus");
});

router.post("/sesi/tutup", async (req, res) => {
  const sesiId    = parseInt(req.body.sesi_id) || 0;
  const sewaHarga = parseInt((req.body.sewa_harga ?? "").replace(/\D/g, "")) || 0;
  const sewaBayar = ["cash", "qris"].includes(req.body.sewa_bayar) ? req.body.sewa_bayar : "cash";
  try {
    const sesi = await readSesiById(sesiId);
    if (!sesi || sesi.status !== "open") return res.redirect("/operasional/sesi?msg=err");
    const items = await readSesiItems(sesiId);
    // Semua F&B wajib lunas dulu.
    if (items.some((t) => t.kategori !== "Sewa Meja" && t.lunas === false)) {
      return res.redirect("/operasional/sesi?msg=belum_lunas");
    }
    // Finalisasi item sewa: isi harga (manual utk Open) + tandai lunas.
    const sewa = items.find((t) => t.kategori === "Sewa Meja");
    if (sewa && sewa.lunas === false) {
      if (sewaHarga <= 0) return res.redirect("/operasional/sesi?msg=sewa_kosong");
      await setSesiItemJumlah(sewa.id, sewaHarga);
      await setSesiItemPaid(sewa.id, sewaBayar);
    }
    await closeSesi(sesiId);
    res.redirect("/operasional/sesi?msg=ditutup");
  } catch (err) {
    console.error("[FINANCE] sesi tutup error:", err.message);
    res.redirect("/operasional/sesi?msg=err");
  }
});

// ── /operasional/catatan-fitur — note pengembangan aplikasi (owner only) ───
// Halaman utk owner catat ide, bug, atau rencana feature aplikasi. Punya
// title, deskripsi, priority, status, kategori. Status auto-track done_at.
router.get("/catatan-fitur", requireOwner, async (req, res) => {
  try {
    const filters = {
      status:   (req.query.status   ?? "").trim(),
      priority: (req.query.priority ?? "").trim(),
      kategori: (req.query.kategori ?? "").trim().slice(0, 60),
    };
    const editId   = parseInt(req.query.edit) || 0;
    const notes    = await readFeatureNotes(filters);
    const editNote = editId ? notes.find((n) => n.id === editId) || null : null;
    res.send(catatanFiturPage({
      notes, filters,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
      editNote,
      hasErr: !!req.query.err,
      msg: req.query.msg || "",
    }));
  } catch (err) {
    console.error("[FINANCE] catatan-fitur GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

router.post("/catatan-fitur/tambah", requireOwner, async (req, res) => {
  const title = (req.body.title ?? "").trim();
  if (!title) return res.redirect("/operasional/catatan-fitur?err=1");
  try {
    await addFeatureNote({
      title,
      deskripsi: req.body.deskripsi ?? "",
      priority:  req.body.priority  ?? "medium",
      status:    req.body.status    ?? "ide",
      kategori:  req.body.kategori  ?? "",
      createdBy: res.locals.financeDisplay || res.locals.financeUser || "owner",
    });
    res.redirect("/operasional/catatan-fitur?msg=added");
  } catch (err) {
    console.error("[FINANCE] catatan-fitur tambah error:", err.message);
    res.redirect("/operasional/catatan-fitur?err=1");
  }
});

router.post("/catatan-fitur/edit", requireOwner, async (req, res) => {
  const id    = parseInt(req.body.id) || 0;
  const title = (req.body.title ?? "").trim();
  if (!id || !title) return res.redirect("/operasional/catatan-fitur?err=1");
  try {
    await updateFeatureNote(id, {
      title,
      deskripsi: req.body.deskripsi ?? "",
      priority:  req.body.priority  ?? "medium",
      status:    req.body.status    ?? "ide",
      kategori:  req.body.kategori  ?? "",
    });
    res.redirect("/operasional/catatan-fitur?msg=edited");
  } catch (err) {
    console.error("[FINANCE] catatan-fitur edit error:", err.message);
    res.redirect("/operasional/catatan-fitur?err=1");
  }
});

router.post("/catatan-fitur/status", requireOwner, async (req, res) => {
  const id = parseInt(req.body.id) || 0;
  const status = req.body.status ?? "ide";
  if (!id) return res.redirect("/operasional/catatan-fitur");
  try {
    await setFeatureNoteStatus(id, status);
    res.redirect("/operasional/catatan-fitur?msg=stat");
  } catch (err) {
    console.error("[FINANCE] catatan-fitur status error:", err.message);
    res.redirect("/operasional/catatan-fitur");
  }
});

router.get("/catatan-fitur/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteFeatureNote(id); } catch (err) {
      console.error("[FINANCE] catatan-fitur hapus error:", err.message);
    }
  }
  res.redirect("/operasional/catatan-fitur?msg=deleted");
});

// ── /operasional/stok — kelola stok & inventory (owner only) ──────
// List bahan baku dgn info stok, threshold low-stock, dan adjust stok.
// Query param ?action=restock|adjust|threshold + ?edit=<id> → open form mode.
router.get("/stok", requireOwner, async (req, res) => {
  try {
    const [bahanList, suppliers, recentMovements] = await Promise.all([
      readBahan(),
      readSuppliers(),
      readStokMovementsAll(15),
    ]);
    const editId   = parseInt(req.query.edit) || 0;
    const editBahan = editId ? bahanList.find((b) => b.id === editId) || null : null;
    const action   = ["restock", "adjust", "threshold"].includes(req.query.action) ? req.query.action : "";
    const filter   = ["low", "out", "warn"].includes(req.query.filter) ? req.query.filter : "";
    const searchQ  = (req.query.q ?? "").toString().slice(0, 100);
    res.send(stokPage({
      bahanList, suppliers, recentMovements,
      filter, searchQ,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
      editBahan, action,
      msg:    req.query.msg || "",
      hasErr: !!req.query.err,
    }));
  } catch (err) {
    console.error("[FINANCE] stok GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// POST /operasional/stok/restock — tambah stok masuk (jenis 'in') + catatan.
// Body: bahan_id, qty, catatan. Validasi: qty > 0.
router.post("/stok/restock", requireOwner, async (req, res) => {
  const bahanId = parseInt(req.body.bahan_id) || 0;
  const qty     = Math.max(0, Number(req.body.qty) || 0);
  const catatan = (req.body.catatan ?? "").toString().slice(0, 200);
  const who     = res.locals.financeDisplay || res.locals.financeUser || "owner";
  if (!bahanId || qty <= 0) return res.redirect("/operasional/stok?edit=" + bahanId + "&action=restock&err=1");
  try {
    await adjustStok(bahanId, "in", qty, { catatan, changedBy: who });
    res.redirect("/operasional/stok?msg=restocked");
  } catch (err) {
    console.error("[FINANCE] stok restock error:", err.message);
    res.redirect("/operasional/stok?edit=" + bahanId + "&action=restock&err=1");
  }
});

// POST /operasional/stok/adjust — koreksi/penyesuaian stok (jenis out / adjust).
// Body: bahan_id, jenis ('out' atau 'adjust'), qty, catatan.
// Validasi: untuk 'out' butuh qty > 0 (kurangi 0 = meaningless). Untuk 'adjust',
// qty bisa 0 (set ke 0 = habis). Hasil noop (delta=0) ditandai msg=nochange.
router.post("/stok/adjust", requireOwner, async (req, res) => {
  const bahanId = parseInt(req.body.bahan_id) || 0;
  const jenis   = ["out", "adjust"].includes(req.body.jenis) ? req.body.jenis : "adjust";
  const qty     = Math.max(0, Number(req.body.qty) || 0);
  const catatan = (req.body.catatan ?? "").toString().slice(0, 200);
  const who     = res.locals.financeDisplay || res.locals.financeUser || "owner";
  if (!bahanId) return res.redirect("/operasional/stok?err=1");
  // Mode 'out': qty harus > 0 (kurangi 0 itu noop & misleading)
  if (jenis === "out" && qty <= 0) {
    return res.redirect("/operasional/stok?edit=" + bahanId + "&action=adjust&err=1&reason=outzero");
  }
  try {
    const result = await adjustStok(bahanId, jenis, qty, {
      catatan, changedBy: who,
      newStok: jenis === "adjust" ? qty : null,
    });
    if (result && result.noop) {
      return res.redirect("/operasional/stok?msg=nochange");
    }
    res.redirect("/operasional/stok?msg=adjusted");
  } catch (err) {
    console.error("[FINANCE] stok adjust error:", err.message);
    res.redirect("/operasional/stok?edit=" + bahanId + "&action=adjust&err=1");
  }
});

// POST /operasional/stok/set-threshold — quick set threshold min per bahan.
// Body: bahan_id, stok_min. Validasi: stok_min >= 0.
router.post("/stok/set-threshold", requireOwner, async (req, res) => {
  const bahanId = parseInt(req.body.bahan_id) || 0;
  const stokMin = Math.max(0, Number(req.body.stok_min) || 0);
  if (!bahanId) return res.redirect("/operasional/stok?err=1");
  try {
    await setStokMin(bahanId, stokMin);
    res.redirect("/operasional/stok?msg=threshold");
  } catch (err) {
    console.error("[FINANCE] set-threshold error:", err.message);
    res.redirect("/operasional/stok?edit=" + bahanId + "&action=threshold&err=1");
  }
});

// POST /operasional/stok/bulk-restock — restock multiple bahan sekaligus.
// Body: bahan_ids[]=[1,2,3], qty_<id>=<num> per bahan, catatan (shared).
// Iterate tiap bahan_id, adjustStok jenis='in'. Skip qty<=0. Pakai 1 catatan
// shared utk semua entry biar audit trail-nya jelas (mis. "Belanja Mei 30").
router.post("/stok/bulk-restock", requireOwner, async (req, res) => {
  const ids     = [].concat(req.body.bahan_ids ?? []).map((x) => parseInt(x) || 0).filter((x) => x > 0);
  const catatan = (req.body.catatan ?? "").toString().slice(0, 200);
  const who     = res.locals.financeDisplay || res.locals.financeUser || "owner";
  if (ids.length === 0) return res.redirect("/operasional/stok?err=1");
  let ok = 0, skip = 0;
  for (const id of ids) {
    const qty = Math.max(0, Number(req.body["qty_" + id]) || 0);
    if (qty <= 0) { skip++; continue; }
    try {
      await adjustStok(id, "in", qty, { catatan, changedBy: who });
      ok++;
    } catch (err) {
      console.error("[FINANCE] bulk-restock item " + id + " error:", err.message);
      skip++;
    }
  }
  res.redirect("/operasional/stok?msg=bulkrestock&ok=" + ok + "&skip=" + skip);
});

// GET /operasional/stok/history?id=X — JSON history stok_movement utk 1 bahan.
router.get("/stok/history", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (!id) return res.json({ history: [] });
  try {
    const history = await readStokMovements(id, 50);
    res.json({ history });
  } catch (err) {
    console.error("[FINANCE] stok history error:", err.message);
    res.json({ history: [], error: err.message });
  }
});

// ── /operasional/supplier — kelola data supplier (owner only) ─────
router.get("/supplier", requireOwner, async (req, res) => {
  try {
    const suppliers = await readSuppliers();
    const editId    = parseInt(req.query.edit) || 0;
    const editSup   = editId ? suppliers.find((s) => s.id === editId) || null : null;
    const searchQ   = (req.query.q ?? "").toString().slice(0, 100);
    res.send(supplierPage({
      suppliers, searchQ,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
      editSup,
      msg:    req.query.msg || "",
      hasErr: !!req.query.err,
    }));
  } catch (err) {
    console.error("[FINANCE] supplier GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

router.post("/supplier/tambah", requireOwner, async (req, res) => {
  const nama = (req.body.nama ?? "").trim();
  if (!nama) return res.redirect("/operasional/supplier?err=1");
  try {
    await addSupplier({
      nama,
      kontak:  req.body.kontak  ?? "",
      alamat:  req.body.alamat  ?? "",
      catatan: req.body.catatan ?? "",
    });
    res.redirect("/operasional/supplier?msg=added");
  } catch (err) {
    console.error("[FINANCE] supplier tambah error:", err.message);
    res.redirect("/operasional/supplier?err=1");
  }
});

router.post("/supplier/edit", requireOwner, async (req, res) => {
  const id   = parseInt(req.body.id) || 0;
  const nama = (req.body.nama ?? "").trim();
  if (!id || !nama) return res.redirect("/operasional/supplier?err=1");
  try {
    await updateSupplier(id, {
      nama,
      kontak:  req.body.kontak  ?? "",
      alamat:  req.body.alamat  ?? "",
      catatan: req.body.catatan ?? "",
    });
    res.redirect("/operasional/supplier?msg=edited");
  } catch (err) {
    console.error("[FINANCE] supplier edit error:", err.message);
    res.redirect("/operasional/supplier?edit=" + id + "&err=1");
  }
});

router.get("/supplier/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteSupplier(id); } catch (err) {
      console.error("[FINANCE] supplier hapus error:", err.message);
    }
  }
  res.redirect("/operasional/supplier?msg=deleted");
});

// ── /operasional/notif — endpoint utk bell sidebar (owner only) ───
// GET unread-count → JSON { count } utk badge dot.
// GET sheet → HTML partial yg di-inject ke .notif-sheet-body via JS fetch.
// POST mark-read / mark-all-read / hapus / hapus-semua → JSON { ok }.
router.get("/notif/unread-count", requireOwner, async (_req, res) => {
  try {
    const count = await countUnreadNotifikasi();
    res.json({ count });
  } catch (err) {
    console.error("[FINANCE] notif unread-count error:", err.message);
    res.json({ count: 0, error: err.message });
  }
});

router.get("/notif/sheet", requireOwner, async (_req, res) => {
  try {
    const [notifs, unreadCount] = await Promise.all([
      readNotifikasi({ limit: 50 }),
      countUnreadNotifikasi(),
    ]);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(renderNotifSheetBody({ notifs, unreadCount }));
  } catch (err) {
    console.error("[FINANCE] notif sheet error:", err.message);
    res.status(500).send("<div class=\"ns-loading\">Gagal memuat notifikasi.</div>");
  }
});

router.post("/notif/mark-read", requireOwner, async (req, res) => {
  const id = parseInt(req.body.id) || 0;
  if (!id) return res.json({ ok: false, error: "missing id" });
  try {
    await markNotifikasiRead(id);
    const count = await countUnreadNotifikasi();
    res.json({ ok: true, unreadCount: count });
  } catch (err) {
    console.error("[FINANCE] notif mark-read error:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

router.post("/notif/mark-all-read", requireOwner, async (_req, res) => {
  try {
    await markAllNotifikasiRead();
    res.json({ ok: true, unreadCount: 0 });
  } catch (err) {
    console.error("[FINANCE] notif mark-all-read error:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

router.post("/notif/hapus", requireOwner, async (req, res) => {
  const id = parseInt(req.body.id) || 0;
  if (!id) return res.json({ ok: false, error: "missing id" });
  try {
    await deleteNotifikasi(id);
    const count = await countUnreadNotifikasi();
    res.json({ ok: true, unreadCount: count });
  } catch (err) {
    console.error("[FINANCE] notif hapus error:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

router.post("/notif/hapus-semua", requireOwner, async (_req, res) => {
  try {
    await deleteAllNotifikasi();
    res.json({ ok: true, unreadCount: 0 });
  } catch (err) {
    console.error("[FINANCE] notif hapus-semua error:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

// POST /operasional/notif/test-daily-summary — manual trigger daily summary
// notif (in-app + WA). Berguna utk testing tanpa nunggu cron jam 6 pagi.
// Owner only. Idempotent via dedupKey jadi gak akan duplicate kalau di-trigger
// 2x untuk tanggal yg sama.
router.post("/notif/test-daily-summary", requireOwner, async (_req, res) => {
  try {
    await createDailySummaryNotif();
    res.json({ ok: true, message: "Daily summary notif dipicu. Cek bell sidebar + WA (kalau FONNTE_TOKEN sudah di-set)." });
  } catch (err) {
    console.error("[FINANCE] test-daily-summary error:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

export { requireFinanceAuth, requireOwner };
export default router;
