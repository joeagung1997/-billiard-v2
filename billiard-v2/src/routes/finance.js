// src/routes/finance.js
// ── Routes: /keuangan (pemasukan & pengeluaran) ───────────────

import { Router } from "express";
import {
  readTransaksi, appendTransaksi, updateTransaksi,
  readKategori, addKategori, deleteKategori,
  readMenuItems, addMenuItem, updateMenuItem, deleteMenuItem,
} from "../utils/db.js";
import { CONFIG } from "../config.js";
import {
  financeDashboard,
  financeFormPage, financeEditPage, financeKategoriPage, financeMenuPage,
} from "../views/finance.js";

const router = Router();

// Set ftk kosong di semua route (tidak butuh PIN lagi)
router.use((req, res, next) => { res.locals.ftk = ""; next(); });

// ── GET /keuangan — dashboard ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [transaksi, kategoriList, menuItems] = await Promise.all([readTransaksi(), readKategori(), readMenuItems()]);
    const bulanFilter = req.query.bulan      ?? "";
    const jenisFilter = req.query.jenis      ?? "";
    const tglDari     = req.query.tgl_dari   ?? "";
    const tglSampai   = req.query.tgl_sampai ?? "";

    res.send(financeDashboard({ transaksi, token: "", bulanFilter, jenisFilter, tglDari, tglSampai, kategoriList, menuItems }));
  } catch (err) {
    console.error("[FINANCE] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /keuangan/tambah — form tambah transaksi ──────────────
router.get("/tambah", async (req, res) => {
  try {
    const kategori = await readKategori();
    res.send(financeFormPage("", kategori));
  } catch (err) {
    console.error("[FINANCE] tambah GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /keuangan/tambah — simpan transaksi ──────────────────
router.post("/tambah", async (req, res) => {
  const { jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);

  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan/tambah?err=1");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/keuangan/tambah?err=1");
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
    res.redirect("/keuangan");
  } catch (err) {
    console.error("[FINANCE] tambah POST error:", err.message);
    res.redirect("/keuangan/tambah?err=1");
  }
});

// ── GET /keuangan/edit — form edit transaksi ──────────────────
router.get("/edit", async (req, res) => {
  const id = (req.query.id ?? "").trim();
  if (!id) return res.redirect("/keuangan");

  try {
    const [semua, kategori] = await Promise.all([readTransaksi(), readKategori()]);
    const t = semua.find((x) => x.id === id);
    if (!t) return res.redirect("/keuangan");
    res.send(financeEditPage("", t, kategori));
  } catch (err) {
    console.error("[FINANCE] edit GET error:", err.message);
    res.redirect("/keuangan");
  }
});

// ── POST /keuangan/edit — simpan perubahan transaksi ──────────
router.post("/edit", async (req, res) => {
  const { id, jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);
  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;

  if (!id || !jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan");
  }

  try {
    await updateTransaksi({
      id,
      tanggal:    tanggal.slice(0, 10),
      jam:        (jam ?? "").slice(0, 5),
      jenis,
      waktu:      ["siang", "malam"].includes(req.body.waktu) ? req.body.waktu : "siang",
      kategori:   (kategori ?? "").trim(),
      keterangan: (keterangan ?? "").trim().slice(0, 200),
      jumlah:     jumlahNum,
    });
    res.redirect("/keuangan");
  } catch (err) {
    console.error("[FINANCE] edit POST error:", err.message);
    res.redirect("/keuangan");
  }
});

// ── GET /keuangan/kategori — kelola kategori ──────────────────
router.get("/kategori", async (req, res) => {
  try {
    const kategori = await readKategori();
    res.send(financeKategoriPage("", kategori, !!req.query.err));
  } catch (err) {
    console.error("[FINANCE] kategori error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /keuangan/kategori/tambah ───────────────────────────
router.post("/kategori/tambah", async (req, res) => {
  const nama  = (req.body.nama  ?? "").trim();
  const jenis = req.body.jenis  ?? "";

  if (!nama || !["pemasukan", "pengeluaran"].includes(jenis)) {
    return res.redirect("/keuangan/kategori?err=1");
  }

  try {
    await addKategori(nama, jenis);
    res.redirect("/keuangan/kategori");
  } catch (err) {
    console.error("[FINANCE] kategori tambah error:", err.message);
    res.redirect("/keuangan/kategori?err=1");
  }
});

// ── GET /keuangan/kategori/hapus — hapus kategori ────────────
router.get("/kategori/hapus", async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteKategori(id); } catch (err) {
      console.error("[FINANCE] kategori hapus error:", err.message);
    }
  }
  res.redirect("/keuangan/kategori");
});

// ── GET /keuangan/menu — kelola menu item kopi/snack ─────────
router.get("/menu", async (req, res) => {
  try {
    const items   = await readMenuItems();
    const editId  = parseInt(req.query.edit) || 0;
    const editItem = editId ? items.find((m) => m.id === editId) || null : null;
    res.send(financeMenuPage("", items, !!req.query.err, editItem));
  } catch (err) {
    console.error("[FINANCE] menu GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /keuangan/menu/tambah ────────────────────────────────
router.post("/menu/tambah", async (req, res) => {
  const nama       = (req.body.nama     ?? "").trim();
  const harga      = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
  const kategori   = (req.body.kategori ?? "minuman").trim();
  const bestSeller = [].concat(req.body.best_seller ?? "0").includes("1");
  if (!nama || harga <= 0) return res.redirect("/keuangan/menu?err=1");
  try {
    await addMenuItem(nama, harga, kategori, bestSeller);
    res.redirect("/keuangan/menu");
  } catch (err) {
    console.error("[FINANCE] menu tambah error:", err.message);
    res.redirect("/keuangan/menu?err=1");
  }
});

// ── POST /keuangan/menu/edit ──────────────────────────────────
router.post("/menu/edit", async (req, res) => {
  const id         = parseInt(req.body.id) || 0;
  const nama       = (req.body.nama     ?? "").trim();
  const harga      = parseInt((req.body.harga ?? "").replace(/\D/g, "")) || 0;
  const kategori   = (req.body.kategori ?? "minuman").trim();
  const bestSeller = [].concat(req.body.best_seller ?? "0").includes("1");
  if (!id || !nama || harga <= 0) return res.redirect("/keuangan/menu?err=1");
  try {
    await updateMenuItem(id, nama, harga, kategori, bestSeller);
    res.redirect("/keuangan/menu");
  } catch (err) {
    console.error("[FINANCE] menu edit error:", err.message);
    res.redirect("/keuangan/menu?err=1");
  }
});

// ── GET /keuangan/menu/hapus ──────────────────────────────────
router.get("/menu/hapus", async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteMenuItem(id); } catch (err) {
      console.error("[FINANCE] menu hapus error:", err.message);
    }
  }
  res.redirect("/keuangan/menu");
});

export default router;
