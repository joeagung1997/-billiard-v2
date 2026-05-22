// src/routes/sdm.js
// ── Routes: /operasional/sdm ──────────────────────────────────

import { Router }      from "express";
import { createHmac }  from "crypto";
import {
  readKaryawan, getKaryawanById, addKaryawan, updateKaryawan, nonaktifkanKaryawan,
  readSdmTransaksi, readSdmTransaksiByKaryawan, appendSdmTransaksi, deleteSdmTransaksi,
  appendTransaksi,
} from "../utils/db.js";
import { sdmDashboard, sdmDetailPage, sdmFormKaryawan, sdmPinPage } from "../views/sdm.js";

// ── PIN auth ─────────────────────────────────────────────────
const SDM_PIN    = process.env.SDM_PIN    || "2222";
const SDM_SECRET = process.env.SDM_SECRET || "warpat-sdm-key-v1";
const SDM_COOKIE = "sdm_v";
const SDM_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function makeToken() {
  const ts  = Date.now().toString(36);
  const sig = createHmac("sha256", SDM_SECRET).update(ts).digest("hex").slice(0, 20);
  return ts + "." + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const ts       = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = createHmac("sha256", SDM_SECRET).update(ts).digest("hex").slice(0, 20);
  if (sig !== expected) return false;
  const ms = parseInt(ts, 36);
  return !isNaN(ms) && Date.now() - ms < SDM_TTL_MS;
}

function requireSdmPin(req, res, next) {
  if (verifyToken(getCookie(req, SDM_COOKIE))) return next();
  res.redirect("/operasional/sdm/pin?r=" + encodeURIComponent(req.originalUrl));
}

const router = Router();
const bulanSekarang = () => new Date().toISOString().slice(0, 7);

// ── PIN routes (tidak perlu auth) ────────────────────────────

router.get("/sdm/pin", (req, res) => {
  res.send(sdmPinPage(!!req.query.err, req.query.r || "/operasional/sdm"));
});

router.post("/sdm/pin", (req, res) => {
  const pin      = (req.body.pin      ?? "").trim();
  const redirect = (req.body.redirect_to ?? "/operasional/sdm").trim();
  const safe     = redirect.startsWith("/operasional/sdm") ? redirect : "/operasional/sdm";
  if (pin !== SDM_PIN) {
    return res.redirect("/operasional/sdm/pin?err=1&r=" + encodeURIComponent(safe));
  }
  const token = makeToken();
  res.setHeader("Set-Cookie",
    `${SDM_COOKIE}=${encodeURIComponent(token)}; Path=/operasional/sdm; HttpOnly; Max-Age=${Math.floor(SDM_TTL_MS / 1000)}; SameSite=Strict`
  );
  res.redirect(safe);
});

router.get("/sdm/logout", (_req, res) => {
  res.setHeader("Set-Cookie",
    `${SDM_COOKIE}=; Path=/operasional/sdm; HttpOnly; Max-Age=0; SameSite=Strict`
  );
  res.redirect("/operasional/sdm/pin");
});

// ── Middleware PIN — semua route di bawah ini butuh PIN ───────
router.use(requireSdmPin);

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
  const uangMakan = parseInt((req.body.uang_makan  ?? "").replace(/\D/g, "")) || 0;
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  const shift     = ["siang", "malam"].includes(req.body.shift) ? req.body.shift : "siang";
  if (!nama || gajiPokok <= 0) return res.redirect("/operasional/sdm/karyawan/tambah?err=1");
  try {
    await addKaryawan({ nama, jabatan, gajiPokok, uangMakan, tglMulai, telepon, shift });
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
  const uangMakan = parseInt((req.body.uang_makan  ?? "").replace(/\D/g, "")) || 0;
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  const shift     = ["siang", "malam"].includes(req.body.shift) ? req.body.shift : "siang";
  if (!id || !nama || gajiPokok <= 0) return res.redirect(`/operasional/sdm/karyawan/${id}/edit?err=1`);
  try {
    await updateKaryawan(id, { nama, jabatan, gajiPokok, uangMakan, tglMulai, telepon, shift });
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
