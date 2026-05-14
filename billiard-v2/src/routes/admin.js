// src/routes/admin.js
// ── Routes: /admin/* ──────────────────────────────────────────

import { Router }   from "express";
import { readDB, writeDB, readLog, writeLog, readTransaksi, createMember, findMemberIndex } from "../utils/db.js";
import { requireAdmin } from "../middleware/auth.js";
import { verifyToken, createToken } from "../utils/session.js";
import { CONFIG }   from "../config.js";
import {
  generateKode, formatTanggalPendek, formatTanggalBulan,
  getBulanOptions, normalizeTelepon, formatTeleponDisplay, validateTelepon,
} from "../utils/format.js";
import { brandedQrCard, qrDataUrl, buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary } from "./share.js";
import { adminLoginPage, adminDashboard, memberPage, addMemberPage, addMemberSuccess, editMemberPage } from "../views/admin.js";

const router = Router();

// ── GET /admin — login atau dashboard ────────────────────────
router.get("/", (req, res) => {
  const tk  = req.query.tk ?? "";
  const pin = verifyToken(tk);

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    return res.send(adminLoginPage(!!req.query.err));
  }

  const token     = tk || createToken(pin);
  const db        = readDB();
  const log       = readLog();
  const transaksi = readTransaksi();

  res.send(adminDashboard({ db, log, transaksi, token, req }));
});

// ── POST /admin/login ─────────────────────────────────────────
router.post("/login", (req, res) => {
  const pin = (req.body.pin ?? "").trim();
  if (pin !== CONFIG.ADMIN_PIN) return res.redirect("/admin?err=1");
  const token = createToken(pin);
  res.redirect(`/admin?tk=${token}`);
});

// ── GET /admin/members — member management page ───────────────
router.get("/members", requireAdmin, (req, res) => {
  const db    = readDB();
  const token = res.locals.tk;
  res.send(memberPage({ db, token, req }));
});

// ── GET /admin/tambah ─────────────────────────────────────────
router.get("/tambah", requireAdmin, async (req, res) => {
  const { tk }   = res.locals;
  const { nama, tlp } = req.query;

  if (!nama) {
    return res.send(addMemberPage(tk, !!req.query.errtlp));
  }

  // Validasi telepon
  if (!validateTelepon(tlp ?? "")) {
    return res.redirect(`/admin/tambah?tk=${tk}&errtlp=1`);
  }

  const digits     = normalizeTelepon(tlp);
  const telepon    = formatTeleponDisplay(digits);
  const db         = readDB();
  const kode       = generateKode(db.members);
  const newMember  = createMember(kode, nama, telepon);
  db.members.push(newMember);
  writeDB(db);

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
});

// ── GET /admin/edit ───────────────────────────────────────────
router.get("/edit", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  const idx     = findMemberIndex(db.members, kode);
  if (idx === -1) return res.redirect(`/admin?tk=${tk}`);

  const m     = db.members[idx];
  const { nama, tlp } = req.query;

  if (nama?.trim()) {
    m.nama = nama.trim();
    if (validateTelepon(tlp ?? "")) {
      m.telepon = formatTeleponDisplay(normalizeTelepon(tlp));
    }
    db.members[idx] = m;
    writeDB(db);
    return res.redirect(`/admin?tk=${tk}`);
  }

  res.send(editMemberPage(tk, m));
});

// ── GET /admin/hapus ──────────────────────────────────────────
router.get("/hapus", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  db.members    = db.members.filter((m) => m.kode !== kode);
  writeDB(db);
  res.redirect(`/admin?tk=${tk}`);
});

// ── GET /admin/klaim ──────────────────────────────────────────
router.get("/klaim", requireAdmin, (req, res) => {
  const { tk }  = res.locals;
  const kode    = (req.query.kode ?? "").toUpperCase();
  const db      = readDB();
  const idx     = findMemberIndex(db.members, kode);
  if (idx !== -1 && db.members[idx].status === "GRATIS") {
    db.members[idx].status = "-";
    writeDB(db);
  }
  res.redirect(`/admin?tk=${tk}`);
});

// ── GET /admin/sync-qr — upload semua QR member ke Cloudinary ─
router.get("/sync-qr", requireAdmin, async (req, res) => {
  const { tk } = res.locals;
  const db = readDB();
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
});

// ── GET /admin/reset ──────────────────────────────────────────
router.get("/reset", requireAdmin, (req, res) => {
  const { tk } = res.locals;
  const db     = readDB();
  db.members.forEach((m) => { m.sudahScanHariIni = false; });
  writeDB(db);
  res.redirect(`/admin?tk=${tk}`);
});

// ── GET /admin/backup — download db.json ──────────────────────
router.get("/backup", requireAdmin, (req, res) => {
  const db  = readDB();
  const log = readLog();
  const payload = JSON.stringify({ db, log, exportedAt: new Date().toISOString() }, null, 2);
  const filename = "backup-" + new Date().toISOString().slice(0, 10) + ".json";
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
  res.send(payload);
});

// ── GET /admin/restore — form upload backup ───────────────────
router.get("/restore", requireAdmin, (req, res) => {
  const { tk } = res.locals;
  res.send(
    '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Restore Backup — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,sans-serif;background:#050b15;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.card{background:#0d1829;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px 24px;max-width:400px;width:100%}'
    + 'h1{font-size:18px;font-weight:700;color:#e8edf5;margin-bottom:8px}'
    + 'p{font-size:13px;color:#4a5e78;margin-bottom:20px;line-height:1.5}'
    + '.back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#3b82f6;text-decoration:none;margin-bottom:20px}'
    + 'textarea{width:100%;height:180px;background:#0a1422;border:1.5px solid #1e3a5f;border-radius:12px;padding:12px;font-size:12px;color:#e8edf5;font-family:monospace;resize:vertical;outline:none;margin-bottom:12px}'
    + 'textarea:focus{border-color:#3b82f6}'
    + 'button{width:100%;background:#2563eb;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer}'
    + '.warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:10px 12px;font-size:12px;color:#f59e0b;margin-bottom:16px}'
    + '</style></head><body><div class="card">'
    + '<a href="/admin?tk=' + tk + '" class="back">← Dashboard</a>'
    + '<div style="font-size:32px;margin-bottom:10px">💾</div>'
    + '<h1>Restore Backup Data</h1>'
    + '<p>Paste isi file backup JSON di bawah ini, lalu klik Restore. Semua data saat ini akan diganti.</p>'
    + '<div class="warn">⚠ Aksi ini tidak bisa dibatalkan. Pastikan file backup valid.</div>'
    + '<form method="POST" action="/admin/restore?tk=' + tk + '" onsubmit="return doRestore(event)">'
    + '<textarea id="payload" name="__raw" placeholder=\'Paste isi file .json backup di sini...\' required></textarea>'
    + '<button type="submit">🔄 Restore Sekarang</button>'
    + '</form>'
    + '<script>'
    + 'function doRestore(e){'
    + '  e.preventDefault();'
    + '  var raw=document.getElementById("payload").value.trim();'
    + '  var parsed;'
    + '  try{parsed=JSON.parse(raw);}catch(err){alert("JSON tidak valid: "+err.message);return false;}'
    + '  if(!parsed.db||!Array.isArray(parsed.db.members)){alert("Format tidak valid. Pastikan file backup dari sistem ini.");return false;}'
    + '  if(!confirm("Yakin restore? Data saat ini akan diganti dengan "+parsed.db.members.length+" member dari backup.")){return false;}'
    + '  var form=e.target;'
    + '  var inp=document.createElement("input");inp.type="hidden";inp.name="__json";inp.value=raw;form.appendChild(inp);'
    + '  document.getElementById("payload").name="";'
    + '  form.submit();'
    + '}'
    + '</script>'
    + '</div></body></html>'
  );
});

// ── POST /admin/restore — proses restore backup ───────────────
router.post("/restore", requireAdmin, (req, res) => {
  const { tk } = res.locals;
  try {
    // Terima dari form (string JSON) atau API (JSON body langsung)
    let payload = req.body;
    if (req.body.__json) {
      payload = JSON.parse(req.body.__json);
    }
    const { db, log } = payload;
    if (!db || !Array.isArray(db.members)) {
      return res.status(400).send("Format backup tidak valid. Pastikan file dari sistem ini.");
    }
    writeDB(db);
    if (Array.isArray(log)) writeLog(log);
    console.log("[RESTORE] Data berhasil dipulihkan:", db.members.length, "member");
    res.redirect("/admin?tk=" + tk + "&restored=1");
  } catch (err) {
    console.error("[RESTORE] Error:", err.message);
    res.status(500).send("Gagal restore: " + err.message);
  }
});

export default router;
