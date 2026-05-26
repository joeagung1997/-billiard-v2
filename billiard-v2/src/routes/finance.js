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
import {
  readTransaksi, appendTransaksi, voidTransaksi, markTransaksiLunas,
  readKategori, addKategori, deleteKategori, updateKategoriUrutan,
  readSubKategori, addSubKategori, deleteSubKategori,
  readMenuItems, readMenuToppings, addMenuItem, updateMenuItem, deleteMenuItem,
  addMenuTopping, deleteMenuTopping,
  readAdminAccounts, readKaryawan,
  readPlanningItems, addPlanningItem, updatePlanningItem, deletePlanningItem,
  readPlanningGoals, addPlanningGoal, updatePlanningGoal, addGoalDeposit, deletePlanningGoal,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import { applyBusinessDay, todayBusinessDayISO, KAT_TUKAR_UANG } from "../utils/format.js";
import { loadAnalisisData, computeStatus, evaluateAddKaryawan } from "../utils/analisis.js";
import { addFixedCost, updateFixedCost, deleteFixedCost } from "../utils/db.js";
import {
  financeDashboard,
  financeLoginPage,
  financeKategoriPage, financeMenuPage,
  financeAnalisisPage,
} from "../views/finance.js";
import { planningPage } from "../views/planning.js";

const router = Router();

// ── Cookie helpers (tanpa cookie-parser) ─────────────────────────
const COOKIE_NAME = "_frt"; // finance role token

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setRoleCookie(res, role, username = "", displayName = "", shift = "siang") {
  const token = jwt.sign({ role, username, displayName, shift }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
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
  const inHari   = transaksi.filter((t) => isRevPem(t) && t.tanggal === today).reduce((s, t) => s + (t.jumlah || 0), 0);
  const inMinggu = transaksi.filter((t) => isRevPem(t) && t.tanggal >= mondayStr && t.tanggal <= today).reduce((s, t) => s + (t.jumlah || 0), 0);
  const inBulan  = transaksi.filter((t) => isRevPem(t) && (t.tanggal || "").startsWith(today.slice(0, 7))).reduce((s, t) => s + (t.jumlah || 0), 0);

  // Rekomendasi tambah karyawan: rata-rata 30 hari terakhir
  const last30Start = new Date(new Date(today + "T00:00:00Z").getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const last30In    = transaksi.filter((t) => isRevPem(t) && t.tanggal >= last30Start && t.tanggal <= today).reduce((s, t) => s + (t.jumlah || 0), 0);
  const last30Avg   = Math.round(last30In / 30);

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

// ── Planning & Roadmap (owner only) ─────────────────────────────
router.get("/planning", requireOwner, async (req, res) => {
  try {
    const [items, goals] = await Promise.all([
      readPlanningItems(),
      readPlanningGoals(),
    ]);
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

router.post("/planning/add", requireOwner, async (req, res) => {
  try {
    const body = req.body ?? {};
    const nama = (body.nama || "").trim();
    if (!nama) return res.status(400).send("Nama item wajib diisi.");
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
      savedAmount:  body.saved_amount,
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
router.get("/menu", requireOwner, async (req, res) => {
  try {
    const [items, toppings] = await Promise.all([readMenuItems(), readMenuToppings()]);
    const editId  = parseInt(req.query.edit) || 0;
    const editItem = editId ? items.find((m) => m.id === editId) || null : null;
    res.send(financeMenuPage(res.locals.financeRole, items, toppings, !!req.query.err, editItem));
  } catch (err) {
    console.error("[FINANCE] menu GET error:", err.message);
    res.status(500).send("Kesalahan server.");
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

export { requireFinanceAuth, requireOwner };
export default router;
