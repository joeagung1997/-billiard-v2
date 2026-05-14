// src/routes/finance.js
// ── Routes: /keuangan (pemasukan & pengeluaran) ───────────────

import { Router }                                          from "express";
import { readTransaksi, appendTransaksi, updateTransaksi, hapusTransaksi } from "../utils/db.js";
import { requireFinance }                                  from "../middleware/auth.js";
import { verifyToken, createToken }                        from "../utils/session.js";
import { CONFIG }                                          from "../config.js";
import { financeLoginPage, financeDashboard, financeFormPage, financeEditPage } from "../views/finance.js";

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
    const bulanFilter = req.query.bulan ?? "";
    const jenisFilter = req.query.jenis ?? "";

    res.send(financeDashboard({ transaksi, token, bulanFilter, jenisFilter }));
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
router.get("/tambah", requireFinance, (req, res) => {
  res.send(financeFormPage(res.locals.ftk));
});

// ── POST /keuangan/tambah — simpan transaksi ──────────────────
router.post("/tambah", requireFinance, async (req, res) => {
  const { jenis, tanggal, kategori, keterangan, jumlah } = req.body;

  // Validasi minimal
  const jumlahNum = parseInt(jumlah) || 0;
  if (!jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }
  if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
    return res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }

  try {
    const item = {
      id:         Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:    tanggal.slice(0, 10),     // YYYY-MM-DD
      jenis,
      waktu:      ["siang","malam"].includes(req.body.waktu) ? req.body.waktu : "siang",
      kategori:   (kategori ?? "").trim(),
      keterangan: (keterangan ?? "").trim().slice(0, 200),
      jumlah:     jumlahNum,
      createdAt:  new Date().toISOString(),
    };

    await appendTransaksi(item);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  } catch (err) {
    console.error("[FINANCE] tambah error:", err.message);
    res.redirect("/keuangan/tambah?ftk=" + res.locals.ftk + "&err=1");
  }
});

// ── GET /keuangan/edit — form edit transaksi ──────────────────
router.get("/edit", requireFinance, async (req, res) => {
  const id = (req.query.id ?? "").trim();
  if (!id) return res.redirect("/keuangan?ftk=" + res.locals.ftk);

  try {
    const semua = await readTransaksi();
    const t     = semua.find((x) => x.id === id);
    if (!t) return res.redirect("/keuangan?ftk=" + res.locals.ftk);
    res.send(financeEditPage(res.locals.ftk, t));
  } catch (err) {
    console.error("[FINANCE] edit GET error:", err.message);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  }
});

// ── POST /keuangan/edit — simpan perubahan transaksi ──────────
router.post("/edit", requireFinance, async (req, res) => {
  const { id, jenis, tanggal, kategori, keterangan, jumlah } = req.body;
  const jumlahNum = parseInt(jumlah) || 0;

  if (!id || !jenis || !tanggal || !kategori || jumlahNum <= 0) {
    return res.redirect("/keuangan?ftk=" + res.locals.ftk);
  }

  try {
    await updateTransaksi({
      id,
      tanggal:    tanggal.slice(0, 10),
      jenis,
      waktu:      ["siang","malam"].includes(req.body.waktu) ? req.body.waktu : "siang",
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

// ── GET /keuangan/hapus — hapus transaksi ────────────────────
router.get("/hapus", requireFinance, async (req, res) => {
  const id = (req.query.id ?? "").trim();
  try {
    if (id) await hapusTransaksi(id);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  } catch (err) {
    console.error("[FINANCE] hapus error:", err.message);
    res.redirect("/keuangan?ftk=" + res.locals.ftk);
  }
});

export default router;
