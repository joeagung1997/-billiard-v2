// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import jwt          from "jsonwebtoken";
import {
  readDB, readLog, readTransaksi,
  saveMember, deleteMember, resetScanHarian,
  createMember, findMember, findMemberIndex,
  resetQrMember, appendLog, checkBonusExpiry,
  readAdminAccounts, listWarungsWithStats, createWarung,
  listAllMemberKodes, getWarungBySlug, touchAdminLogin,
} from "../utils/db.js";
import { requireAdmin, readFrtCookie } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import { setRequestWarung, getWarungId, OPTIONAL_MODULES } from "../utils/tenant.js";
import { isWarungActive } from "../middleware/subscription.js";
import { resultPage } from "../views/member.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary, uploadImageToCloudinary } from "./share.js";
import { adminLoginPage, adminDashboard, memberPage, addMemberPage, addMemberSuccess, riwayatKunjunganPage, warungListPage, warungCreatePage } from "../views/admin.js";
import { segeraHadirPage } from "../views/segeraHadir.js";

const router = Router();

// ── GET /segera-hadir — placeholder utk fitur yg blm di-implement ────
// Owner only. Title via ?title= query param.
router.get("/segera-hadir", (req, res) => {
  const tk   = req.query.tk ?? "";
  const user = verifyToken(tk);
  if (!user) return res.redirect("/admin");
  const title = String(req.query.title ?? "Fitur Ini").slice(0, 80);
  res.send(segeraHadirPage({ title, token: tk, user }));
});

// ── GET /admin/logout — clear cookie _frt + redirect ke login ────
// Tanpa endpoint ini, klik "Keluar" hanya menghapus localStorage tapi cookie
// _frt masih valid → fallback di middleware/auth.js & GET /admin auto-login
// balik → owner gak bisa logout.
router.get("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", [
    `_frt=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    `_frt=; HttpOnly; Path=/operasional; Max-Age=0; SameSite=Lax`,
  ]);
  res.redirect("/admin");
});

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", async (req, res) => {
  const tk   = req.query.tk ?? "";
  const user = verifyToken(tk);

  if (!user) {
    // Fallback: owner/karyawan yg sudah punya cookie _frt valid (mis. baru
    // navigasi balik dari /operasional) gak perlu input PIN lagi — auto-issue
    // session token & redirect ke /admin?tk=... biar URL konsisten.
    const frt = readFrtCookie(req);
    if (frt?.role && frt?.username) {
      const newTk = createToken({
        username:    frt.username,
        role:        frt.role,
        displayName: frt.displayName || frt.username,
        warungId:    frt.warungId || 1,
      });
      return res.redirect(`/admin?tk=${newTk}`);
    }
    return res.send(adminLoginPage(!!req.query.err));
  }

  try {
    setRequestWarung(req, user.warungId);   // GET / bukan di belakang requireAdmin → set konteks manual
    if (!(await isWarungActive(user.warungId))) {
      return res.status(403).send(resultPage("error", {
        judul: "Langganan Tidak Aktif",
        pesan: "Masa aktif warung ini sudah berakhir. Hubungi admin untuk mengaktifkan kembali.",
      }));
    }
    await checkBonusExpiry();
    const db        = await readDB();
    const log       = await readLog();
    const transaksi = await readTransaksi();

    res.send(adminDashboard({ db, log, transaksi, token: tk, req, user }));
  } catch (err) {
    console.error("[ADMIN] dashboard error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── Login admin (shared) ──────────────────────────────────────
// Cocokkan akun di WARUNG AKTIF (konteks tenant via ALS) lalu terbitkan session
// token + cookie _frt berisi warung_id. Dipakai dua entry:
//   • POST /admin/login        → legacy, konteks default warung 1 (Warpat).
//   • POST /w/:slug/login       → konteks = warung dari slug (lihat routes/warung.js).
// okBase = path tujuan setelah sukses (default "/admin"; token yg menentukan
// warung, jadi URL pasca-login boleh legacy).
export async function doAdminLogin(req, res, { errRedirect = "/admin?err=1", okBase = "/admin" } = {}) {
  const username = (req.body.username ?? "").trim().toLowerCase();
  const pin      = (req.body.pin      ?? "").trim();
  const warungId = getWarungId(req);   // 1 utk /admin/login; warung slug utk /w/:slug/login

  let found = null;
  try {
    const accounts = await readAdminAccounts();   // ter-scope ke warung aktif (ALS)
    const row = accounts.find((u) => u.username.toLowerCase() === username && u.pin === pin);
    if (row) found = { username: row.username, role: row.role, displayName: row.display_name || row.username, shift: row.shift || "siang", warungId: row.warung_id || warungId };
  } catch (err) {
    console.error("[ADMIN] DB accounts lookup failed:", err.message);
  }

  // Fallback CONFIG.ADMIN_USERS HANYA utk Warpat (warung 1) — akun env legacy.
  if (!found && warungId === 1) {
    const fromConfig = CONFIG.ADMIN_USERS.find((u) => u.username.toLowerCase() === username && u.pin === pin);
    if (fromConfig) found = { username: fromConfig.username, role: fromConfig.role, displayName: fromConfig.username, shift: "siang", warungId: 1 };
  }

  if (!found) return res.redirect(errRedirect);

  // Catat waktu login (best-effort; tak blokir login bila gagal).
  touchAdminLogin(found.warungId, found.username);

  const token = createToken({ username: found.username, role: found.role, displayName: found.displayName, warungId: found.warungId });

  // Auto-set cookie _frt (Path=/) supaya /operasional/* & /admin/* tidak minta
  // PIN lagi. Clear dulu cookie legacy Path=/operasional biar tidak dobel.
  const frt = jwt.sign(
    { role: found.role, username: found.username, displayName: found.displayName, shift: found.shift, warungId: found.warungId, boot: CONFIG.SESSION_VERSION },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES }
  );
  res.setHeader("Set-Cookie", [
    `_frt=; HttpOnly; Path=/operasional; Max-Age=0; SameSite=Lax`,
    `_frt=${encodeURIComponent(frt)}; HttpOnly; Path=/; Max-Age=${24 * 3600}; SameSite=Lax`,
  ]);

  res.redirect(`${okBase}?tk=${token}`);
}

// ── POST /admin/login (legacy = warung 1) ─────────────────────
router.post("/login", (req, res) => doAdminLogin(req, res, { errRedirect: "/admin?err=1", okBase: "/admin" }));

// ── GET /admin/members — member management page ───────────────
router.get("/members", requireAdmin, async (req, res) => {
  try {
    await checkBonusExpiry();
    const db    = await readDB();
    const log   = await readLog();
    const token = res.locals.tk;
    const user  = {
      username:    res.locals.adminUser,
      role:        res.locals.adminRole,
      displayName: res.locals.adminDisplay,
    };
    res.send(memberPage({ db, log, token, req, user }));
  } catch (err) {
    console.error("[ADMIN] members error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── /admin/warung* DIPINDAH ke Area Admin Platform (/platform) ──────
// Daftar/Buat/Kelola Warung kini di router platform (routes/platform.js),
// dengan layout & login superadmin sendiri. Redirect bookmark lama → /platform.
router.get(["/warung", "/warung/baru"], (_req, res) => res.redirect("/platform"));

// ── GET /admin/riwayat-kunjungan — log scan member ────────────
router.get("/riwayat-kunjungan", requireAdmin, async (req, res) => {
  try {
    const log   = await readLog();
    const token = res.locals.tk;
    const user  = {
      username:    res.locals.adminUser,
      role:        res.locals.adminRole,
      displayName: res.locals.adminDisplay,
    };
    res.send(riwayatKunjunganPage({ log, token, req, user }));
  } catch (err) {
    console.error("[ADMIN] riwayat-kunjungan error:", err.message);
    res.status(500).send("Kesalahan server. Coba lagi.");
  }
});

// ── GET /admin/tambah ─────────────────────────────────────────
router.get("/tambah", requireAdmin, async (req, res) => {
  const { tk }        = res.locals;
  const { nama, tlp } = req.query;

  if (!nama) {
    return res.send(addMemberPage(tk, !!req.query.errtlp));
  }

  // Validasi telepon
  if (!validateTelepon(tlp ?? "")) {
    return res.redirect(`/admin/tambah?tk=${tk}&errtlp=1`);
  }

  try {
    const digits    = normalizeTelepon(tlp);
    const telepon   = formatTeleponDisplay(digits);
    const db        = await readDB();
    const kode      = generateKode(await listAllMemberKodes());
    const newMember = createMember(kode, nama, telepon);

    await saveMember(newMember);
    await appendLog(kode, nama, "DAFTAR_MEMBER", "Member baru terdaftar");

    const scanUrl = buildScanUrl(req, kode);

    // Upload QR ke Cloudinary untuk WA preview
    try {
      const qrBuf = await qrBuffer(scanUrl, 520);
      await uploadQrToCloudinary(kode, qrBuf);
    } catch (err) {
      console.error("[CDN] Upload QR gagal:", err.message);
    }

    // Generate branded card untuk halaman sukses
    let brandedCard = null;
    try {
      brandedCard = await brandedQrCard({ text: scanUrl, nama, kode });
    } catch (err) {
      try {
        const qrB64 = await qrDataUrl(scanUrl, 300);
        brandedCard = { encoded: qrB64 };
      } catch (_) {}
    }

    res.send(addMemberSuccess({ tk, kode, nama, telepon, scanUrl, brandedCard }));
  } catch (err) {
    console.error("[ADMIN] tambah error:", err.message);
    res.status(500).send("Gagal menambah member. Coba lagi.");
  }
});

// ── GET /admin/edit — save member (dari modal inline edit) ───
// Halaman form standalone sudah dihapus. Edit sekarang inline di
// modal detail member (/admin/members). Endpoint ini cuma menerima
// data save via query string lalu redirect kembali.
router.get("/edit", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  const kode   = (req.query.kode ?? "").toUpperCase();
  const { nama, tlp } = req.query;

  // Tanpa data nama -> redirect ke kelola member
  if (!nama?.trim() || !kode) {
    return res.redirect(`/admin/members?tk=${tk}`);
  }

  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx === -1) return res.redirect(`/admin/members?tk=${tk}`);

    const m = { ...db.members[idx] };

    // Snapshot sebelum diubah untuk audit log
    const oldNama = m.nama;
    const oldTlp  = m.telepon ?? "";

    m.nama = nama.trim();
    // Telepon: kosongkan kalau input kosong, simpan kalau valid
    const tlpInput = (tlp ?? "").trim();
    if (tlpInput === "") {
      m.telepon = "";
    } else if (validateTelepon(tlpInput)) {
      m.telepon = formatTeleponDisplay(normalizeTelepon(tlpInput));
    }

    await saveMember(m);

    const changes = [];
    if (oldNama !== m.nama)    changes.push(`nama: '${oldNama}' → '${m.nama}'`);
    if (oldTlp  !== m.telepon) changes.push(`telp: '${oldTlp || "-"}' → '${m.telepon || "-"}'`);
    if (changes.length) {
      await appendLog(m.kode, m.nama, "EDIT_MEMBER", changes.join(", "));
    }

    res.redirect(`/admin/members?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] edit error:", err.message);
    res.redirect(`/admin/members?tk=${tk}`);
  }
});

// ── GET /admin/hapus ──────────────────────────────────────────
router.get("/hapus", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  try {
    // Capture nama sebelum hapus untuk audit log
    const db = await readDB();
    const m  = findMember(db.members, kode);
    const namaSnapshot = m?.nama ?? "(unknown)";

    await deleteMember(kode);
    await appendLog(kode, namaSnapshot, "DELETE_MEMBER",
      `Total main: ${m?.totalMain ?? 0}, total gratis: ${m?.totalGratis ?? 0}`);

    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] hapus error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

// ── GET /admin/klaim ──────────────────────────────────────────
router.get("/klaim", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx !== -1) {
      const m = { ...db.members[idx] };
      if (m.status === "BONUS" || m.status === "GRATIS") {
        m.totalGratis   = (m.totalGratis ?? 0) + 1;
        m.totalMain     = 0;
        m.tanggalMulai  = new Date().toISOString();
        m.status        = "-";
        m.bonusEarnedAt = null;
        await saveMember(m);
        await appendLog(kode, m.nama, "BONUS_KLAIM", `Reward ke-${m.totalGratis} diklaim kasir`);
      }
    }
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] klaim error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

// ── GET /admin/sync-qr — upload semua QR member ke Cloudinary ─
router.get("/sync-qr", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    const db = await readDB();
    let ok = 0, fail = 0;

    for (const m of db.members) {
      try {
        const scanUrl = buildScanUrl(req, m.kode);
        const qrBuf   = await qrBuffer(scanUrl, 520);
        const success = await uploadQrToCloudinary(m.kode, qrBuf);
        if (success) ok++; else fail++;
      } catch (err) {
        console.error("[SYNC] Gagal", m.kode, err.message);
        fail++;
      }
    }

    res.send("Sync selesai: " + ok + " berhasil, " + fail + " gagal. "
      + "<a href='/admin?tk=" + tk + "'>Kembali</a>");
  } catch (err) {
    res.status(500).send("Gagal sync QR: " + err.message);
  }
});

// ── GET /admin/reset-qr — ganti kode/QR, data tetap ─────────
router.get("/reset-qr", requireAdmin, async (req, res) => {
  const { tk }  = res.locals;
  const oldKode = (req.query.kode ?? "").toUpperCase();
  try {
    const db = await readDB();
    const m  = findMember(db.members, oldKode);
    if (!m) return res.redirect(`/admin/members?tk=${tk}`);

    const newKode = generateKode(await listAllMemberKodes());
    await resetQrMember(oldKode, newKode);

    // Re-upload QR ke Cloudinary dengan kode baru
    const scanUrl = buildScanUrl(req, newKode);
    try {
      const qrBuf = await qrBuffer(scanUrl, 520);
      await uploadQrToCloudinary(newKode, qrBuf);
    } catch (err) {
      console.error("[RESET-QR] Upload QR gagal:", err.message);
    }

    await appendLog(newKode, m.nama, "RESET_QR", "Kode lama: " + oldKode);
    res.redirect(`/admin/members?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] reset-qr error:", err.message);
    res.redirect(`/admin/members?tk=${tk}`);
  }
});

// ── GET /admin/reset ──────────────────────────────────────────
router.get("/reset", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    await resetScanHarian(getWarungId(req));   // reset scan HANYA warung ini (bukan global)
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    console.error("[ADMIN] reset error:", err.message);
    res.redirect(`/admin?tk=${tk}`);
  }
});

// ── GET /admin/set-sesi — paksa total_main ke nilai tertentu (testing) ───────
router.get("/set-sesi", requireAdmin, async (req, res) => {
  const { tk }   = res.locals;
  const kode     = (req.query.kode ?? "").toUpperCase();
  const sesi     = parseInt(req.query.sesi ?? "");
  if (!kode || isNaN(sesi)) return res.status(400).send("?kode=XXX&sesi=N wajib diisi");
  try {
    const db  = await readDB();
    const idx = findMemberIndex(db.members, kode);
    if (idx === -1) return res.status(404).send("Member tidak ditemukan: " + kode);
    const m = { ...db.members[idx], totalMain: sesi };
    await saveMember(m);
    res.redirect(`/admin?tk=${tk}`);
  } catch (err) {
    res.status(500).send("Gagal: " + err.message);
  }
});

// ── GET /admin/seed-test — buat member testing (hapus setelah selesai) ────────
router.get("/seed-test", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  try {
    const kode = "JMB-TEST-99";
    const m = createMember(kode, "Testing Bonus", "");
    m.totalMain           = 9;
    m.tanggalScanTerakhir = new Date().toISOString();
    await saveMember(m);
    res.send(
      '<p style="font-family:sans-serif;padding:20px">Member <strong>' + kode +
      '</strong> (Testing Bonus, sesi 9/10) berhasil dibuat. ' +
      '<a href="/admin?tk=' + tk + '">Kembali ke dashboard</a></p>'
    );
  } catch (err) {
    res.status(500).send("Gagal: " + err.message);
  }
});

export default router;
