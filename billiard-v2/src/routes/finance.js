// src/routes/finance.js
// ── Routes: /keuangan (pemasukan & pengeluaran) ───────────────

import { Router }                                from "express";
import { readTransaksi, appendTransaksi, hapusTransaksi } from "../utils/db.js";
import { requireFinance }                        from "../middleware/auth.js";
import { verifyToken, createToken }              from "../utils/session.js";
import { CONFIG }                                from "../config.js";
import { financeLoginPage, financeDashboard, financeFormPage } from "../views/finance.js";

const router = Router();

// ── GET /keuangan — login atau dashboard ──────────────────────
router.get("/", (req, res) => {
  const ftk = req.query.ftk ?? "";
  const pin = verifyToken(ftk);

  if (!pin || pin !== CONFIG.FINANCE_PIN) {
    return res.send(financeLoginPage(!!req.query.err));
  }

  const token      = ftk || createToken(pin);
  const transaksi  = readTransaksi();
  const bulanFilter = req.query.bulan ?? "";
  const jenisFilter = req.query.jenis ?? "";

  res.send(financeDashboard({ transaksi, token, bulanFilter, jenisFilter }));
});

// ── POST /keuangan/login ──────────────────────────────────────
router.post("/login", (req, res) => {
  const pin = (req.body.pin ?? "").trim();
  if (pin !== CONFIG.FINANCE_PIN) return res.redirect("/keuangan?err=1");
  const token = createToken(pin);
  res.redirect("/keuangan?ftk=" + token);
});

// ── GET /keuangan/tambah — form tambah transaksi ──────────────
router.get("/tambah", requireFinance, (req, res) => {
  res.send(financeFormPage(res.locals.ftk));
});

// ── POST /keuangan/tambah — simpan transaksi ──────────────────
router.post("/tambah", requireFinance, (req, res) => {
  const { jenis, tanggal, kategori, keterangan, jumlah } = req.body;

  // Validasi minimal
  const jumlahNum = parseInt(jumlah) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }

  const item = {
    id:          Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    tanggal:     tanggal.slice(0, 10),    // YYYY-MM-DD
    jenis,
    kategori:    (kategori ?? "").trim(),
    keterangan:  (keterangan ?? "").trim().slice(0, 200),
    jumlah:      jumlahNum,
    createdAt:   new Date().toISOString(),
  };

  appendTransaksi(item);

  res.redirect("/keuangan?ftk=" + res.locals.ftk);
});

// ── GET /keuangan/hapus — hapus transaksi ────────────────────
router.get("/hapus", requireFinance, (req, res) => {
  const id = (req.query.id ?? "").trim();
  if (id) hapusTransaksi(id);
  res.redirect("/keuangan?ftk=" + res.locals.ftk);
});

export default router;
