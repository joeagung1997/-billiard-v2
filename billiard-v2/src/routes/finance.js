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
import { applyBusinessDay, todayBusinessDayISO, KAT_TUKAR_UANG } from "../utils/format.js";
import { checkAndNotifyTarget, createDailySummaryNotif } from "../utils/notifTrigger.js";
import { loadAnalisisData, computeStatus, evaluateAddKaryawan } from "../utils/analisis.js";
import { addFixedCost, updateFixedCost, deleteFixedCost } from "../utils/db.js";
import {
  financeDashboard,
  financeLoginPage,
  financeKategoriPage, financeMenuPage,
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

function setRoleCookie(res, role, username = "", displayName = "", shift = "siang") {
  const token = jwt.sign({ role, username, displayName, shift, boot: CONFIG.DEPLOY_ID }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
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
    // DEPLOY_ID mismatch = token dari deploy sebelumnya → invalid (force re-login).
    if (decoded.boot !== CONFIG.DEPLOY_ID) return null;
    return {
      role:        decoded.role        || null,
      username:    decoded.username    || "",
      displayName: decoded.displayName || "",
      shift:       decoded.shift       || "siang",
    };
  } catch { return null; }
}

function getFinanceRole(req) {
  return getFinanceUser(req)?.role ?? null;
}

function requireFinanceAuth(req, res, next) {
  const user = getFinanceUser(req);
  if (!user?.role) {
    // Flow utama login via /admin (username+PIN) — kalau cookie _frt expired,
    // arahkan ke /admin (akan auto-set cookie kembali setelah login).
    return res.redirect("/admin");
  }
  res.locals.financeRole    = user.role;
  res.locals.financeUser    = user.username;
  res.locals.financeDisplay = user.displayName;
  res.locals.financeShift   = user.shift;
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

  let role = null, displayName = "", shift = "siang";

  if (username) {
    // Username diisi → wajib match akun di admin_accounts. Tidak fallback ke PIN-only.
    try {
      const accounts = await readAdminAccounts();
      const row = accounts.find((u) => u.username.toLowerCase() === username && u.pin === pin);
      if (row) {
        role = row.role;
        displayName = row.display_name || row.username;
        shift = row.shift || "siang";
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

  setRoleCookie(res, role, username, displayName, shift);
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

// ── GET /operasional — dashboard ─────────────────────────────────
// Helper: bangun data utk financeDashboard. Dipake oleh route '/' (Dashboard
// Keuangan) dan '/transaksi' (Riwayat Transaksi — same data, beda view).
async function buildDashboardData(req, res) {
  const role = res.locals.financeRole;
  const [transaksi, kategoriList, subKategoriList, menuItems, toppings, accounts, karyawanList] = await Promise.all([
    readTransaksi(), readKategori(), readSubKategori(), readMenuItems(), readMenuToppings(),
    readAdminAccounts(), readKaryawan(true),
  ]);

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

    await appendTransaksi({
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
    });

    // Transaksi ke-2: Kopi/Snack add-on (kalau ada). Share waktu/bayar/bukti/lunas.
    if (hasKopiAddon) {
      await appendTransaksi({
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
      });
    }

    // Trigger notif target tercapai (fire-and-forget, non-blocking response).
    // Hanya untuk pemasukan beneran (lunas, kategori revenue).
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

    const { breakdown: costBreakdown, targets } = await loadAnalisisData();

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

    const analisis = {
      targets,
      costBreakdown,
      hari:   { pemasukan: inHari,   target: targets.hari,   status: computeStatus(inHari,   targets.hari) },
      minggu: { pemasukan: inMinggu, target: targets.minggu, status: computeStatus(inMinggu, targets.minggu) },
      bulan:  { pemasukan: inBulan,  target: targets.bulan,  status: computeStatus(inBulan,  targets.bulan) },
      simulasi: {
        rataPemasukan: last30Avg,
        ...evaluateAddKaryawan(last30Avg, costBreakdown.totalMonthly, 900000),
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
