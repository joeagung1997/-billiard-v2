// src/routes/finance.js
// ── Routes: /keuangan (pemasukan & pengeluaran) ───────────────

import { Router } from "express";
import {
  readTransaksi, appendTransaksi, updateTransaksi,
  readKategori, addKategori, deleteKategori,
} from "../utils/db.js";
import { requireFinance }           from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }                   from "../config.js";
import {
  financeLoginPage, financeDashboard,
  financeFormPage, financeEditPage, financeKategoriPage,
} from "../views/finance.js";

const router = Router();

// ── GET /keuangan — login atau dashboard ──────────────────────
router.get("/", async (req, res) => {
  const ftk = req.query.ftk ?? "";
  const pin = verifyToken(ftk);

  if (!pin || pin !== CONFIG.FINANCE_PIN) {
    return res.send(financeLoginPage(!!req.query.err));
  }

  try {
    const token       = ftk || createToken(pin);
    const transaksi   = await readTransaksi();
    const bulanFilter = req.query.bulan     ?? "";
    const jenisFilter = req.query.jenis     ?? "";
    const tglDari     = req.query.tgl_dari  ?? "";
    const tglSampai   = req.query.tgl_sampai ?? "";

    res.send(financeDashboard({ transaksi, token, bulanFilter, jenisFilter, tglDari, tglSampai }));
  } catch (err) {
    console.error("[FINANCE] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── POST /keuangan/login ──────────────────────────────────────
router.post("/login", (req, res) => {
  const pin = (req.body.pin ?? "").trim();
  if (pin !== CONFIG.FINANCE_PIN) return res.redirect("/keuangan?err=1");
  const token = createToken(pin);
  res.redirect("/keuangan?ftk=" + token);
});

// ── GET /keuangan/tambah — form tambah transaksi ──────────────
router.get("/tambah", requireFinance, async (req, res) => {
  try {
    const kategori = await readKategori();
    res.send(financeFormPage(res.locals.ftk, kategori));
  } catch (err) {
    console.error("[FINANCE] tambah GET error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /keuangan/tambah — simpan transaksi ──────────────────
router.post("/tambah", requireFinance, async (req, res) => {
  const { jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);

  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
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
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  } catch (err) {
    console.error("[FINANCE] tambah POST error:", err.message);
    res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }
});

// ── GET /keuangan/edit — form edit transaksi ──────────────────
router.get("/edit", requireFinance, async (req, res) => {
  const id = (req.query.id ?? "").trim();
  if (!id) return res.redirect("/keuangan?ftk=" + res.locals.ftk);

  try {
    const [semua, kategori] = await Promise.all([readTransaksi(), readKategori()]);
    const t = semua.find((x) => x.id === id);
    if (!t) return res.redirect("/keuangan?ftk=" + res.locals.ftk);
    res.send(financeEditPage(res.locals.ftk, t, kategori));
  } catch (err) {
    console.error("[FINANCE] edit GET error:", err.message);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  }
});

// ── POST /keuangan/edit — simpan perubahan transaksi ──────────
router.post("/edit", requireFinance, async (req, res) => {
  const { id, jenis, datetime, kategori, keterangan, jumlah } = req.body;
  const tanggal = (datetime ?? "").slice(0, 10);
  const jam     = (datetime ?? "").slice(11, 16);
  const jumlahNum = parseInt((jumlah ?? "").replace(/\./g, "")) || 0;

  if (!id || !jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan?ftk=" + res.locals.ftk);
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
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  } catch (err) {
    console.error("[FINANCE] edit POST error:", err.message);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  }
});

// ── GET /keuangan/kategori — kelola kategori ──────────────────
router.get("/kategori", requireFinance, async (req, res) => {
  try {
    const kategori = await readKategori();
    res.send(financeKategoriPage(res.locals.ftk, kategori, !!req.query.err));
  } catch (err) {
    console.error("[FINANCE] kategori error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /keuangan/kategori/tambah ───────────────────────────
router.post("/kategori/tambah", requireFinance, async (req, res) => {
  const nama  = (req.body.nama  ?? "").trim();
  const jenis = req.body.jenis  ?? "";

  if (!nama || !["pemasukan", "pengeluaran"].includes(jenis)) {
    return res.redirect("/keuangan/kategori?ftk=" + res.locals.ftk + "&err=1");
  }

  try {
    await addKategori(nama, jenis);
    res.redirect("/keuangan/kategori?ftk=" + res.locals.ftk);
  } catch (err) {
    console.error("[FINANCE] kategori tambah error:", err.message);
    res.redirect("/keuangan/kategori?ftk=" + res.locals.ftk + "&err=1");
  }
});

// ── GET /keuangan/kategori/hapus — hapus kategori ────────────
router.get("/kategori/hapus", requireFinance, async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  if (id) {
    try { await deleteKategori(id); } catch (err) {
      console.error("[FINANCE] kategori hapus error:", err.message);
    }
  }
  res.redirect("/keuangan/kategori?ftk=" + res.locals.ftk);
});

export default router;
