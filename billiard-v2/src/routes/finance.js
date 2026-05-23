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
  readTransaksi, appendTransaksi, voidTransaksi,
  readKategori, addKategori, deleteKategori, updateKategoriUrutan,
  readSubKategori, addSubKategori, deleteSubKategori,
  readMenuItems, readMenuToppings, addMenuItem, updateMenuItem, deleteMenuItem,
  addMenuTopping, deleteMenuTopping,
  readAdminAccounts,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import {
  financeDashboard,
  financeLoginPage,
  financeKategoriPage, financeMenuPage,
} from "../views/finance.js";

const router = Router();

// ── Cookie helpers (tanpa cookie-parser) ─────────────────────────
const COOKIE_NAME = "_frt"; // finance role token

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setRoleCookie(res, role, username = "", displayName = "") {
  const token = jwt.sign({ role, username, displayName }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });
  const maxAge = 24 * 3600; // 24 jam
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/operasional; Max-Age=${maxAge}; SameSite=Lax`
  );
}

function clearRoleCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/operasional; Max-Age=0; SameSite=Lax`
  );
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
    };
  } catch { return null; }
}

function getFinanceRole(req) {
  return getFinanceUser(req)?.role ?? null;
}

function requireFinanceAuth(req, res, next) {
  const user = getFinanceUser(req);
  if (!user?.role) {
    return res.redirect("/operasional/login?r=" + encodeURIComponent(req.originalUrl));
  }
  res.locals.financeRole    = user.role;
  res.locals.financeUser    = user.username;
  res.locals.financeDisplay = user.displayName;
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

  let role = null, displayName = "";

  if (username) {
    // Username diisi → wajib match akun di admin_accounts. Tidak fallback ke PIN-only.
    try {
      const accounts = await readAdminAccounts();
      const row = accounts.find((u) => u.username.toLowerCase() === username && u.pin === pin);
      if (row) { role = row.role; displayName = row.display_name || row.username; }
    } catch (err) { console.error("[FINANCE] accounts lookup:", err.message); }
  } else {
    // Username kosong → fallback PIN-only (backward compat URL lama).
    if (pin === CONFIG.OWNER_PIN)         { role = "owner";    displayName = "Owner"; }
    else if (pin === CONFIG.KARYAWAN_PIN) { role = "karyawan"; displayName = "Karyawan"; }
  }

  if (!role) {
    const back = "/operasional/login?err=1" + (redir ? "&r=" + encodeURIComponent(redir) : "");
    return res.redirect(back);
  }

  setRoleCookie(res, role, username, displayName);
  res.redirect(redir || "/operasional");
});

router.get("/logout", (req, res) => {
  const role = getFinanceRole(req); // baca sebelum cookie dihapus
  clearRoleCookie(res);
  // Owner kembali ke /admin (login admin sudah auto-set _frt),
  // karyawan kembali ke halaman login operasional.
  res.redirect(role === "owner" ? "/admin" : "/operasional/login");
});

// ── Terapkan auth ke SEMUA route di bawah ini ─────────────────────
router.use(requireFinanceAuth);

// ── GET /operasional — dashboard ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const role = res.locals.financeRole;
    const [transaksi, kategoriList, subKategoriList, menuItems, toppings] = await Promise.all([
      readTransaksi(), readKategori(), readSubKategori(), readMenuItems(), readMenuToppings(),
    ]);

    // Karyawan: dikunci ke hari ini saja
    const today      = new Date().toISOString().slice(0, 10);
    const todayBulan = today.slice(0, 7);

    const bulanFilter = role === "karyawan" ? todayBulan  : (req.query.bulan      ?? "");
    const jenisFilter = role === "karyawan" ? ""          : (req.query.jenis      ?? "");
    const tglDari     = role === "karyawan" ? today       : (req.query.tgl_dari   ?? "");
    const tglSampai   = role === "karyawan" ? today       : (req.query.tgl_sampai ?? "");

    res.send(financeDashboard({
      transaksi, token: "", role,
      bulanFilter, jenisFilter, tglDari, tglSampai,
      kategoriList, subKategoriList, menuItems, toppings,
      msg: req.query.msg || "",
    }));
  } catch (err) {
    console.error("[FINANCE] dashboard error:", err.message);
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

  try {
    await appendTransaksi({
      id:          Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:     tanggal.slice(0, 10),
      jam:         (jam ?? "").slice(0, 5),
      jenis,
      waktu:       ["siang", "malam"].includes(req.body.waktu) ? req.body.waktu : "siang",
      kategori:    (kategori ?? "").trim(),
      subKategori,
      keterangan:  (keterangan ?? "").trim().slice(0, 200),
      jumlah:      jumlahNum,
      createdAt:   new Date().toISOString(),
      bayar,
      buktiUrl,
      dicatatOleh: res.locals.financeUser || "",
    });
    res.redirect("/operasional?msg=created");
  } catch (err) {
    console.error("[FINANCE] tambah POST error:", err.message);
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
