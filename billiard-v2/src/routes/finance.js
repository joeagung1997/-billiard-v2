// src/routes/finance.js
// ── Routes: /operasional (pemasukan & pengeluaran) ───────────────

import { Router } from "express";
import {
  readTransaksi, appendTransaksi, voidTransaksi,
  readKategori, addKategori, deleteKategori, updateKategoriUrutan,
  readMenuItems, readMenuToppings, addMenuItem, updateMenuItem, deleteMenuItem,
  addMenuTopping, deleteMenuTopping,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import {
  financeDashboard,
  financeKategoriPage, financeMenuPage,
} from "../views/finance.js";

const router = Router();

// Set ftk kosong di semua route (tidak butuh PIN lagi)
router.use((req, res, next) => { res.locals.ftk = ""; next(); });

// ── GET /operasional — dashboard ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [transaksi, kategoriList, menuItems, toppings] = await Promise.all([readTransaksi(), readKategori(), readMenuItems(), readMenuToppings()]);
    const bulanFilter = req.query.bulan      ?? "";
    const jenisFilter = req.query.jenis      ?? "";
    const tglDari     = req.query.tgl_dari   ?? "";
    const tglSampai   = req.query.tgl_sampai ?? "";

    res.send(financeDashboard({ transaksi, token: "", bulanFilter, jenisFilter, tglDari, tglSampai, kategoriList, menuItems, toppings }));
  } catch (err) {
    console.error("[FINANCE] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /operasional/tambah — redirect ke dashboard (modal wizard) ───
// Form tambah standalone sudah dihapus. Catat transaksi sekarang via
// modal wizard "Catat Transaksi" di halaman dashboard /operasional.
router.get("/tambah", (_req, res) => res.redirect("/operasional"));

// ── POST /operasional/tambah — simpan transaksi (dari modal wizard) ──
router.post("/tambah", async (req, res) => {
  const { jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);

  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/operasional");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/operasional");
  }

  try {
    await appendTransaksi({
      id:         Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:    tanggal.slice(0, 10),
      jam:        (jam ?? "").slice(0, 5),
      jenis,
      waktu:      ["siang", "malam"].includes(req.body.waktu) ? req.body.waktu : "siang",
      kategori:   (kategori ?? "").trim(),
      keterangan: (keterangan ?? "").trim().slice(0, 200),
      jumlah:     jumlahNum,
      createdAt:  new Date().toISOString(),
    });
    res.redirect("/operasional");
  } catch (err) {
    console.error("[FINANCE] tambah POST error:", err.message);
    res.redirect("/operasional");
  }
});

// ── POST /operasional/void — soft void transaksi (immutable) ────────
// Transaksi tidak boleh di-edit. Untuk koreksi: void yg salah +
// input transaksi baru yg benar. Audit trail tetap utuh.
router.post("/void", async (req, res) => {
  const id     = (req.body.id ?? "").trim();
  const reason = (req.body.reason ?? "").trim();

  if (!id || !reason) return res.redirect("/operasional");

  try {
    await voidTransaksi(id, reason);
    res.redirect("/operasional");
  } catch (err) {
    console.error("[FINANCE] void error:", err.message);
    res.redirect("/operasional");
  }
});

// ── GET /operasional/kategori — kelola kategori ──────────────────
router.get("/kategori", async (req, res) => {
  try {
    const kategori = await readKategori();
    res.send(financeKategoriPage("", kategori, !!req.query.err));
  } catch (err) {
    console.error("[FINANCE] kategori error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /operasional/kategori/tambah ───────────────────────────
router.post("/kategori/tambah", async (req, res) => {
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
router.get("/kategori/hapus", async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteKategori(id); } catch (err) {
      console.error("[FINANCE] kategori hapus error:", err.message);
    }
  }
  res.redirect("/operasional/kategori");
});

// ── POST /operasional/kategori/urutan — reorder via drag-and-drop ───
// Body: { ids: [3, 1, 2, ...] } — array id berurutan untuk SATU jenis.
// Client kirim 1x per drop. Backend assign urutan = 1..N untuk id tsb.
router.post("/kategori/urutan", async (req, res) => {
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

// ── GET /operasional/menu — kelola menu item kopi/snack ─────────
router.get("/menu", async (req, res) => {
  try {
    const [items, toppings] = await Promise.all([readMenuItems(), readMenuToppings()]);
    const editId  = parseInt(req.query.edit) || 0;
    const editItem = editId ? items.find((m) => m.id === editId) || null : null;
    res.send(financeMenuPage("", items, toppings, !!req.query.err, editItem));
  } catch (err) {
    console.error("[FINANCE] menu GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /operasional/menu/tambah ────────────────────────────────
router.post("/menu/tambah", async (req, res) => {
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
router.post("/menu/edit", async (req, res) => {
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
router.get("/menu/hapus", async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMenuItem(id); } catch (err) {
      console.error("[FINANCE] menu hapus error:", err.message);
    }
  }
  res.redirect("/operasional/menu");
});

// ── POST /operasional/menu/topping/tambah ────────────────────────
router.post("/menu/topping/tambah", async (req, res) => {
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
router.get("/menu/topping/hapus", async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMenuTopping(id); } catch (err) {
      console.error("[FINANCE] topping hapus error:", err.message);
    }
  }
  res.redirect("/operasional/menu");
});

export default router;
