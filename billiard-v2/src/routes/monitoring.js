// src/routes/monitoring.js
// ── Routes: /operasional/monitoring ──────────────────────────────

import { Router } from "express";
import {
  readAdminAccounts,
  readTransaksiLog,
  readSetoranList,
  appendSetoran,
  readMemberActivity,
} from "../utils/db.js";
import {
  monitoringAktivitas,
  monitoringSetoran,
  monitoringSelisih,
  monitoringMember,
} from "../views/monitoring.js";
import { todayBusinessDayISO } from "../utils/format.js";
import { requireFinanceAuth, requireOwner } from "./finance.js";
import { subscriptionGate } from "../middleware/subscription.js";
import { requireModule } from "../middleware/module.js";

const router = Router();

// Apply auth to all monitoring routes
router.use(requireFinanceAuth);
router.use(requireOwner);
router.use(subscriptionGate);
// Monitoring (aktivitas kru / shift & setoran) bagian modul SDM.
router.use(requireModule("sdm"));

// GET /monitoring → redirect to aktivitas
router.get("/monitoring", (_req, res) => res.redirect("/operasional/monitoring/aktivitas"));

// ── Aktivitas Log ──────────────────────────────────────────────
router.get("/monitoring/aktivitas", async (req, res) => {
  try {
    const today     = todayBusinessDayISO();
    const tglDari   = (req.query.dari   ?? today).slice(0, 10);
    const tglSampai = (req.query.sampai ?? today).slice(0, 10);
    const username  = req.query.user  ?? "";
    const jenis     = req.query.jenis ?? "";

    const [logs, accounts] = await Promise.all([
      readTransaksiLog({
        tglDari,
        tglSampai,
        username: username || undefined,
        jenis:    jenis    || undefined,
      }),
      readAdminAccounts(),
    ]);
    const karyawanList = accounts.filter((a) => a.role === "karyawan");
    res.send(monitoringAktivitas({
      logs, tglDari, tglSampai, username, jenis,
      karyawanList,
      accountsAll: accounts,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
    }));
  } catch (err) {
    console.error("[MONITORING] aktivitas error:", err.message);
    res.status(500).send("Error memuat halaman monitoring aktivitas.");
  }
});

// ── Shift & Setoran ────────────────────────────────────────────
router.get("/monitoring/setoran", async (req, res) => {
  try {
    const now   = new Date();
    const bulan = req.query.bulan ?? (now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"));
    const username = req.query.user ?? "";

    const [setoranList, accounts] = await Promise.all([
      readSetoranList({ bulan, username: username || undefined }),
      readAdminAccounts(),
    ]);
    const karyawanList = accounts.filter((a) => a.role === "karyawan");
    res.send(monitoringSetoran({
      setoranList, bulan, username,
      karyawanList,
      role:           res.locals.financeRole,
      financeUser:    res.locals.financeUser,
      financeDisplay: res.locals.financeDisplay,
      msg:            req.query.msg ?? "",
    }));
  } catch (err) {
    console.error("[MONITORING] setoran error:", err.message);
    res.status(500).send("Error memuat halaman setoran.");
  }
});

router.post("/monitoring/setoran", async (req, res) => {
  try {
    const b = req.body;
    const tanggal          = (b.tanggal          ?? "").trim().slice(0, 10);
    const shift            = ["siang", "malam"].includes(b.shift) ? b.shift : "siang";
    const karyawanNama     = (b.karyawan_nama     ?? "").trim().slice(0, 60);
    const karyawanUsername = (b.karyawan_username ?? "").trim().slice(0, 40).toLowerCase();
    const jamBuka          = (b.jam_buka          ?? "").trim().slice(0, 5);
    const jamTutup         = (b.jam_tutup         ?? "").trim().slice(0, 5);
    const modalAwal        = parseInt(b.modal_awal    ?? "0", 10) || 0;
    const pemasukan        = parseInt(b.pemasukan     ?? "0", 10) || 0;
    const pengeluaran      = parseInt(b.pengeluaran   ?? "0", 10) || 0;
    const uangSetor        = parseInt(b.uang_setor    ?? "0", 10) || 0;
    const keterangan       = (b.keterangan        ?? "").trim().slice(0, 200);

    if (!tanggal || !karyawanNama) {
      return res.redirect("/operasional/monitoring/setoran?msg=err");
    }

    const selisih = (modalAwal + pemasukan - pengeluaran) - uangSetor;
    const id      = Date.now() + "-" + Math.random().toString(36).slice(2, 7);

    await appendSetoran({
      id, tanggal, shift,
      karyawanNama, karyawanUsername,
      jamBuka, jamTutup,
      modalAwal, pemasukan, pengeluaran,
      uangSetor, selisih, keterangan,
    });
    res.redirect("/operasional/monitoring/setoran?msg=ok");
  } catch (err) {
    console.error("[MONITORING] POST setoran error:", err.message);
    res.redirect("/operasional/monitoring/setoran?msg=err");
  }
});

// ── Aktivitas Member ───────────────────────────────────────────
router.get("/monitoring/member", async (req, res) => {
  try {
    const now       = new Date();
    const today     = now.toISOString().slice(0, 10);
    const tglDari   = (req.query.dari   ?? today).slice(0, 10);
    const tglSampai = (req.query.sampai ?? today).slice(0, 10);
    const aksi      = req.query.aksi ?? "";

    const logs = await readMemberActivity({
      tglDari,
      tglSampai,
      aksi: aksi || undefined,
    });
    res.send(monitoringMember({
      logs, tglDari, tglSampai, aksi,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
    }));
  } catch (err) {
    console.error("[MONITORING] member error:", err.message);
    res.status(500).send("Error memuat halaman aktivitas member.");
  }
});

// ── Selisih Kas ────────────────────────────────────────────────
router.get("/monitoring/selisih", async (req, res) => {
  try {
    const now   = new Date();
    const bulan = req.query.bulan ?? (now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"));
    const username = req.query.user ?? "";

    const [setoranList, accounts] = await Promise.all([
      readSetoranList({ bulan, username: username || undefined }),
      readAdminAccounts(),
    ]);
    const karyawanList = accounts.filter((a) => a.role === "karyawan");
    res.send(monitoringSelisih({
      setoranList, bulan, username,
      karyawanList,
      role:        res.locals.financeRole,
      displayName: res.locals.financeDisplay || "",
    }));
  } catch (err) {
    console.error("[MONITORING] selisih error:", err.message);
    res.status(500).send("Error memuat halaman selisih kas.");
  }
});

export default router;
