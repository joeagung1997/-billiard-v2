// src/routes/sdm.js
// ── Routes: /operasional/sdm ──────────────────────────────────

import { Router } from "express";
import {
  readKaryawan, getKaryawanById, addKaryawan, updateKaryawan, nonaktifkanKaryawan,
  readSdmTransaksi, readSdmTransaksiByKaryawan, appendSdmTransaksi, deleteSdmTransaksi,
  appendTransaksi,
} from "../utils/db.js";
import { sdmDashboard, sdmDetailPage, sdmFormKaryawan } from "../views/sdm.js";

const router = Router();

const bulanSekarang = () => new Date().toISOString().slice(0, 7);

// ── GET /operasional/sdm ─────────────────────────────────────
router.get("/sdm", async (req, res) => {
  try {
    const bulan = req.query.bulan || bulanSekarang();
    const [karyawan, sdmTrx] = await Promise.all([readKaryawan(), readSdmTransaksi(bulan)]);
    res.send(sdmDashboard(karyawan, sdmTrx, bulan));
  } catch (err) {
    console.error("[SDM] dashboard error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── GET /operasional/sdm/karyawan/tambah ─────────────────────
router.get("/sdm/karyawan/tambah", (req, res) => {
  res.send(sdmFormKaryawan(null, !!req.query.err));
});

// ── POST /operasional/sdm/karyawan/tambah ────────────────────
router.post("/sdm/karyawan/tambah", async (req, res) => {
  const nama      = (req.body.nama     ?? "").trim();
  const jabatan   = (req.body.jabatan  ?? "").trim();
  const gajiPokok = parseInt((req.body.gaji_pokok ?? "").replace(/\D/g, "")) || 0;
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  if (!nama || gajiPokok <= 0) return res.redirect("/operasional/sdm/karyawan/tambah?err=1");
  try {
    await addKaryawan({ nama, jabatan, gajiPokok, tglMulai, telepon });
    res.redirect("/operasional/sdm");
  } catch (err) {
    console.error("[SDM] tambah karyawan error:", err.message);
    res.redirect("/operasional/sdm/karyawan/tambah?err=1");
  }
});

// ── GET /operasional/sdm/karyawan/:id/edit ───────────────────
router.get("/sdm/karyawan/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id) || 0;
  if (!id) return res.redirect("/operasional/sdm");
  try {
    const k = await getKaryawanById(id);
    if (!k) return res.redirect("/operasional/sdm");
    res.send(sdmFormKaryawan(k, !!req.query.err));
  } catch (err) {
    console.error("[SDM] edit form error:", err.message);
    res.redirect("/operasional/sdm");
  }
});

// ── POST /operasional/sdm/karyawan/:id/edit ──────────────────
router.post("/sdm/karyawan/:id/edit", async (req, res) => {
  const id        = parseInt(req.params.id) || 0;
  const nama      = (req.body.nama     ?? "").trim();
  const jabatan   = (req.body.jabatan  ?? "").trim();
  const gajiPokok = parseInt((req.body.gaji_pokok ?? "").replace(/\D/g, "")) || 0;
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  if (!id || !nama || gajiPokok <= 0) return res.redirect(`/operasional/sdm/karyawan/${id}/edit?err=1`);
  try {
    await updateKaryawan(id, { nama, jabatan, gajiPokok, tglMulai, telepon });
    res.redirect("/operasional/sdm");
  } catch (err) {
    console.error("[SDM] update karyawan error:", err.message);
    res.redirect(`/operasional/sdm/karyawan/${id}/edit?err=1`);
  }
});

// ── GET /operasional/sdm/karyawan/:id/nonaktif ───────────────
router.get("/sdm/karyawan/:id/nonaktif", async (req, res) => {
  const id = parseInt(req.params.id) || 0;
  if (id) {
    try { await nonaktifkanKaryawan(id); } catch (err) {
      console.error("[SDM] nonaktif error:", err.message);
    }
  }
  res.redirect("/operasional/sdm");
});

// ── POST /operasional/sdm/transaksi ──────────────────────────
router.post("/sdm/transaksi", async (req, res) => {
  const karyawanId = parseInt(req.body.karyawan_id) || 0;
  const tipe       = req.body.tipe ?? "";
  const jumlah     = parseInt((req.body.jumlah ?? "").replace(/\D/g, "")) || 0;
  const bulan      = req.body.bulan || bulanSekarang();
  const keterangan = (req.body.keterangan ?? "").trim().slice(0, 200);
  const redirect   = req.body.redirect_to || "/operasional/sdm";

  const TIPE_VALID = ["gaji", "kasbon", "kembali_kasbon", "thr", "bonus"];
  if (!karyawanId || !TIPE_VALID.includes(tipe) || jumlah <= 0) {
    return res.redirect(redirect);
  }

  try {
    const k = await getKaryawanById(karyawanId);
    if (!k) return res.redirect(redirect);

    const trxId = Date.now() + "-sdm-" + Math.random().toString(36).slice(2, 6);
    await appendSdmTransaksi({
      id: trxId, karyawanId, tipe, jumlah, bulan, keterangan,
      createdAt: new Date().toISOString(),
    });

    // Sync otomatis ke laporan keuangan
    const isIncome = tipe === "kembali_kasbon";
    const tipeLabel = { gaji: "Gaji", kasbon: "Kasbon", kembali_kasbon: "Kembali Kasbon", thr: "THR", bonus: "Bonus" };
    const ket = k.nama + (keterangan ? " — " + keterangan : "");
    await appendTransaksi({
      id:          trxId + "-k",
      tanggal:     new Date().toISOString().slice(0, 10),
      jam:         new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
      jenis:       isIncome ? "pemasukan" : "pengeluaran",
      waktu:       "siang",
      kategori:    "SDM",
      subKategori: tipeLabel[tipe] || tipe,
      keterangan:  ket,
      jumlah,
      createdAt:   new Date().toISOString(),
    });

    res.redirect(redirect);
  } catch (err) {
    console.error("[SDM] transaksi error:", err.message);
    res.redirect(redirect);
  }
});

// ── GET /operasional/sdm/transaksi/hapus ─────────────────────
router.get("/sdm/transaksi/hapus", async (req, res) => {
  const id       = req.query.id ?? "";
  const redirect = req.query.redirect || "/operasional/sdm";
  if (id) {
    try { await deleteSdmTransaksi(id); } catch (err) {
      console.error("[SDM] hapus transaksi error:", err.message);
    }
  }
  res.redirect(redirect);
});

// ── GET /operasional/sdm/:id — detail karyawan ───────────────
router.get("/sdm/:id", async (req, res) => {
  const id = parseInt(req.params.id) || 0;
  if (!id) return res.redirect("/operasional/sdm");
  try {
    const k    = await getKaryawanById(id);
    if (!k) return res.redirect("/operasional/sdm");
    const bulan = req.query.bulan || bulanSekarang();
    const trx   = await readSdmTransaksiByKaryawan(id);
    res.send(sdmDetailPage(k, trx, bulan));
  } catch (err) {
    console.error("[SDM] detail error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

export default router;
