// src/routes/sdm.js
// ── Routes: /operasional/sdm ──────────────────────────────────

import { Router }      from "express";
import { createHmac }  from "crypto";
import jwt             from "jsonwebtoken";
import { CONFIG }      from "../config.js";
import {
  readKaryawan, getKaryawanById, addKaryawan, updateKaryawan, nonaktifkanKaryawan,
  readSdmTransaksi, readSdmTransaksiByKaryawan, appendSdmTransaksi, deleteSdmTransaksi,
  appendTransaksi, readAdminAccounts, updateAdminAccount,
} from "../utils/db.js";
import { sdmDashboard, sdmDetailPage, sdmFormKaryawan, sdmPinPage, sdmAkunPage } from "../views/sdm.js";
import { notifyNewTransaksi } from "../utils/notifTrigger.js";
import { setRequestWarung } from "../utils/tenant.js";
import { subscriptionGate } from "../middleware/subscription.js";

// ── PIN auth ─────────────────────────────────────────────────
// Fail-loud kalau env var ga di-set (sebelumnya hardcoded '2222' & 'warpat-sdm-key-v1'
// terexpos di public repo → siapa pun bisa fake SDM token & bypass PIN).
function requireSdmEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `[SDM] Missing required env var: ${name}. Set di Railway/Vercel dashboard sebelum deploy.`
    );
  }
  return v;
}
const SDM_PIN    = requireSdmEnv("SDM_PIN");
const SDM_SECRET = requireSdmEnv("SDM_SECRET");
const SDM_COOKIE = "sdm_v";
const SDM_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

// DEPLOY_ID di-include ke HMAC input — tiap deploy baru, DEPLOY_ID berubah,
// signature lama gak match lagi → token SDM lama invalid → user re-login.
function makeToken() {
  const ts  = Date.now().toString(36);
  const sig = createHmac("sha256", SDM_SECRET).update(ts + "." + CONFIG.DEPLOY_ID).digest("hex").slice(0, 20);
  return ts + "." + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const ts       = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = createHmac("sha256", SDM_SECRET).update(ts + "." + CONFIG.DEPLOY_ID).digest("hex").slice(0, 20);
  if (sig !== expected) return false;
  const ms = parseInt(ts, 36);
  return !isNaN(ms) && Date.now() - ms < SDM_TTL_MS;
}

function requireSdmPin(req, res, next) {
  // Owner tidak perlu PIN SDM — sudah terautentikasi via _frt cookie
  if (getFinanceRole(req) === "owner") return next();
  if (verifyToken(getCookie(req, SDM_COOKIE))) return next();
  res.redirect("/operasional/sdm/pin?r=" + encodeURIComponent(req.originalUrl));
}

const router = Router();
const bulanSekarang = () => new Date().toISOString().slice(0, 7);

// ── Finance role guard — SDM hanya untuk owner ────────────────
// Cek cookie _frt sebelum masuk halaman SDM apapun.
const FIN_COOKIE = "_frt";
function getFinanceClaims(req) {
  const entry = (req.headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(FIN_COOKIE + "="));
  if (!entry) return null;
  try {
    const raw = decodeURIComponent(entry.slice(FIN_COOKIE.length + 1));
    const decoded = jwt.verify(raw, CONFIG.JWT_SECRET);
    if (decoded.boot !== CONFIG.DEPLOY_ID) return null;
    return decoded;
  } catch { return null; }
}
function getFinanceRole(req) {
  return getFinanceClaims(req)?.role || null;
}

router.use("/sdm", (req, res, next) => {
  const claims  = getFinanceClaims(req);
  const finRole = claims?.role || null;
  // Tidak login sama sekali → ke finance login
  if (!finRole) return res.redirect("/operasional/login?r=" + encodeURIComponent(req.originalUrl));
  // Karyawan tidak boleh akses SDM
  if (finRole !== "owner") return res.redirect("/operasional?msg=no_access");
  setRequestWarung(req, claims.warungId);   // isi async-context tenant dari _frt
  next();
});

// Gate langganan (warung sudah diketahui dari _frt di guard atas).
router.use("/sdm", subscriptionGate);

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
    const [karyawan, sdmTrx, adminAccounts] = await Promise.all([
      readKaryawan(),
      readSdmTransaksi(bulan),
      readAdminAccounts().catch(() => []),
    ]);
    res.send(sdmDashboard(karyawan, sdmTrx, bulan, adminAccounts, req.query.msg));
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
  const hariKerja = Math.min(31, Math.max(1, parseInt(req.body.hari_kerja) || 26));
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  const shift     = ["siang", "malam"].includes(req.body.shift) ? req.body.shift : "siang";
  const redirectTo = (req.body.redirect_to ?? "").trim();
  const backUrl    = redirectTo.startsWith("/operasional/sdm") ? redirectTo : "/operasional/sdm";
  if (!nama || gajiPokok <= 0) return res.redirect(backUrl + (backUrl.includes("?") ? "&" : "?") + "msg=err_tambah");
  try {
    await addKaryawan({ nama, jabatan, gajiPokok, uangMakan, hariKerja, tglMulai, telepon, shift });
    res.redirect(backUrl + (backUrl.includes("?") ? "&" : "?") + "msg=tambah_ok");
  } catch (err) {
    console.error("[SDM] tambah karyawan error:", err.message);
    res.redirect(backUrl + (backUrl.includes("?") ? "&" : "?") + "msg=err_tambah");
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
  const hariKerja = Math.min(31, Math.max(1, parseInt(req.body.hari_kerja) || 26));
  const tglMulai  = req.body.tgl_mulai || null;
  const telepon   = (req.body.telepon  ?? "").trim();
  const shift     = ["siang", "malam"].includes(req.body.shift) ? req.body.shift : "siang";
  if (!id || !nama || gajiPokok <= 0) return res.redirect(`/operasional/sdm/karyawan/${id}/edit?err=1`);
  try {
    await updateKaryawan(id, { nama, jabatan, gajiPokok, uangMakan, hariKerja, tglMulai, telepon, shift });
    res.redirect("/operasional/sdm?msg=edit_ok");
  } catch (err) {
    console.error("[SDM] update karyawan error:", err.message);
    res.redirect(`/operasional/sdm/karyawan/${id}/edit?err=1`);
  }
});

// ── GET /operasional/sdm/karyawan/:id/nonaktif ───────────────
router.get("/sdm/karyawan/:id/nonaktif", async (req, res) => {
  const id = parseInt(req.params.id) || 0;
  let ok = false;
  if (id) {
    try { await nonaktifkanKaryawan(id); ok = true; } catch (err) {
      console.error("[SDM] nonaktif error:", err.message);
    }
  }
  res.redirect("/operasional/sdm?msg=" + (ok ? "nonaktif_ok" : "err"));
});

// ── POST /operasional/sdm/transaksi ──────────────────────────
router.post("/sdm/transaksi", async (req, res) => {
  const karyawanId = parseInt(req.body.karyawan_id) || 0;
  const tipe       = req.body.tipe ?? "";
  const jumlah     = parseInt((req.body.jumlah ?? "").replace(/\D/g, "")) || 0;
  const bulan      = req.body.bulan || bulanSekarang();
  const metode     = ["cash", "transfer"].includes(req.body.metode) ? req.body.metode : "cash";
  const redirect   = req.body.redirect_to || "/operasional/sdm";

  // Auto-label keterangan: gaji selalu sertakan nama bulan
  const _BULAN_NM   = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
  const _bulanLabel = (b) => { const [y, m] = b.split("-"); return (_BULAN_NM[parseInt(m) - 1] || m) + " " + y; };
  const _ketRaw     = (req.body.keterangan ?? "").trim().slice(0, 180);
  const keterangan  = tipe === "gaji"
    ? ("Gaji " + _bulanLabel(bulan) + (_ketRaw ? " — " + _ketRaw : ""))
    : _ketRaw;

  const TIPE_VALID = ["gaji", "kasbon", "kembali_kasbon", "thr", "bonus", "makan_harian"];
  const withMsg = (m) => redirect + (redirect.includes("?") ? "&" : "?") + "msg=" + m;
  if (!karyawanId || !TIPE_VALID.includes(tipe) || jumlah <= 0) {
    return res.redirect(withMsg("err_trx"));
  }

  try {
    const k = await getKaryawanById(karyawanId);
    if (!k) return res.redirect(withMsg("err_trx"));

    const trxId = Date.now() + "-sdm-" + Math.random().toString(36).slice(2, 6);
    await appendSdmTransaksi({
      id: trxId, karyawanId, tipe, jumlah, bulan, keterangan, metode,
      createdAt: new Date().toISOString(),
    });

    const isIncome = tipe === "kembali_kasbon";
    const tipeLabel = {
      gaji: "Gaji", kasbon: "Kasbon", kembali_kasbon: "Kembali Kasbon",
      thr: "THR", bonus: "Bonus", makan_harian: "Makan Harian",
    };
    const ket = k.nama + (keterangan ? " — " + keterangan : "");
    const sdmTrx = {
      id:          trxId + "-k",
      tanggal:     new Date().toISOString().slice(0, 10),
      jam:         new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
      jenis:       isIncome ? "pemasukan" : "pengeluaran",
      waktu:       tipe === "makan_harian" ? "malam" : "siang",
      kategori:    "SDM",
      subKategori: tipeLabel[tipe] || tipe,
      keterangan:  ket,
      jumlah,
      createdAt:   new Date().toISOString(),
    };
    await appendTransaksi(sdmTrx);
    notifyNewTransaksi(sdmTrx).catch((e) =>
      console.error("[SDM] notifyNewTransaksi error:", e.message));

    // Msg spesifik per tipe (cocok dgn map di view sdmDashboard)
    const tipeMsg = {
      gaji: "trx_gaji", kasbon: "trx_kasbon", kembali_kasbon: "trx_kembali",
      thr: "trx_thr", bonus: "trx_bonus", makan_harian: "trx_makan",
    };
    res.redirect(withMsg(tipeMsg[tipe] || "trx_ok"));
  } catch (err) {
    console.error("[SDM] transaksi error:", err.message);
    res.redirect(withMsg("err_trx"));
  }
});

// ── GET /operasional/sdm/transaksi/hapus ─────────────────────
router.get("/sdm/transaksi/hapus", async (req, res) => {
  const id       = req.query.id ?? "";
  const redirect = req.query.redirect || "/operasional/sdm";
  const withMsg  = (m) => redirect + (redirect.includes("?") ? "&" : "?") + "msg=" + m;
  let ok = false;
  if (id) {
    try { await deleteSdmTransaksi(id); ok = true; } catch (err) {
      console.error("[SDM] hapus transaksi error:", err.message);
    }
  }
  res.redirect(withMsg(ok ? "trx_hapus_ok" : "err_hapus"));
});

// ── GET /operasional/sdm/akun — kelola username & PIN admin ──
// HARUS sebelum /sdm/:id agar tidak tertangkap sebagai :id
router.get("/sdm/akun", async (req, res) => {
  try {
    const accounts = await readAdminAccounts();
    res.send(sdmAkunPage(accounts, req.query.msg, req.query.err));
  } catch (err) {
    console.error("[SDM] akun error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// ── POST /operasional/sdm/akun/:id — simpan perubahan akun ───
router.post("/sdm/akun/:id", async (req, res) => {
  const id       = parseInt(req.params.id) || 0;
  const username = (req.body.username ?? "").trim().toLowerCase();
  const pin      = (req.body.pin      ?? "").trim();
  const shift    = ["siang", "malam"].includes(req.body.shift) ? req.body.shift : "siang";

  if (!id)                        return res.redirect("/operasional/sdm/akun?err=invalid");
  if (!username || username.length < 3)
                                  return res.redirect("/operasional/sdm/akun?err=username");
  if (!/^[a-z0-9_]+$/.test(username))
                                  return res.redirect("/operasional/sdm/akun?err=username_fmt");
  if (!pin || !/^\d{4,}$/.test(pin))
                                  return res.redirect("/operasional/sdm/akun?err=pin");
  try {
    await updateAdminAccount(id, username, pin, shift);
    res.redirect("/operasional/sdm/akun?msg=ok");
  } catch (err) {
    console.error("[SDM] update akun error:", err.message);
    const isUnique = err.message?.includes("unique") || err.code === "23505";
    res.redirect("/operasional/sdm/akun?err=" + (isUnique ? "username_taken" : "server"));
  }
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
    res.send(sdmDetailPage(k, trx, bulan, req.query.msg || ""));
  } catch (err) {
    console.error("[SDM] detail error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

export default router;
