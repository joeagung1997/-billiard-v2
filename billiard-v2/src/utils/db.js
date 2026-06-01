// src/utils/db.js
// ── Database helper — PostgreSQL via pg Pool ──────────────────

import { randomInt } from "crypto";
import { query, pool } from "./postgres.js";
import { runMigrations, seedWarungDefaults } from "./migrate.js";
import { currentWarungId, DEFAULT_WARUNG_ID, OPTIONAL_MODULES } from "./tenant.js";
import { wibEndOfDayISO } from "./format.js";

// ── Multi-tenant: konvensi warung_id ───────────────────────────
// Setiap fungsi yg menyentuh tabel data menerima `warungId` dan menyertakannya
// di SETIAP query (WHERE utk SELECT/UPDATE/DELETE, kolom nilai utk INSERT) —
// termasuk operasi by-id supaya warung A tidak bisa baca/ubah baris warung B
// lewat ID langsung (anti-IDOR).
//
// Default param = currentWarungId(): dibaca dari async-context tenant per
// request (lihat utils/tenant.js). Call-site yg tidak mengoper warungId otomatis
// ter-scope ke warung request aktif — "sulit lupa". Override eksplisit dipakai
// cron per-warung (runWithTenant) atau lookup lintas-warung.
//
// Pengecualian sengaja TIDAK difilter (lintas-tenant by design): cron global
// resetScanHarian() (branch tanpa arg) & cleanupOldNotifikasi() (semua warung).

// ── Init ──────────────────────────────────────────────────────

export const initDB = async () => {
  await runMigrations();
};

// Daftar id warung yg masih aktif/trial — utk cron yg loop per-warung
// (mis. daily summary). Warung nonaktif di-skip.
export const getActiveWarungIds = async () => {
  const res = await query(
    "SELECT id FROM warung WHERE status_langganan IN ('aktif','trial') ORDER BY id"
  );
  return res.rows.map((r) => r.id);
};

// Ambil 1 warung berdasarkan slug (utk routing /w/:slug). Null kalau tak ada.
export const getWarungBySlug = async (slug) => {
  const res = await query("SELECT * FROM warung WHERE slug = $1", [(slug || "").toLowerCase()]);
  return res.rows[0] ?? null;
};

// Ambil 1 warung berdasarkan id (utk branding/konteks). Null kalau tak ada.
export const getWarungById = async (id) => {
  const res = await query("SELECT * FROM warung WHERE id = $1", [id]);
  return res.rows[0] ?? null;
};

// ── Super-admin (platform): daftar SEMUA warung + ringkasan ──────────
// SENGAJA lintas-tenant: tabel `warung` adalah ROOT tenant (bukan data yg
// di-scope warung_id), jadi tidak difilter currentWarungId(). Subquery COUNT
// per warung ringan utk skala puluhan warung. Hanya boleh dipanggil dari
// jalur yg sudah dipagari super-admin (owner platform / warung 1) di route.
// PRIVASI: sengaja TIDAK mengambil jumlah member/transaksi (data operasional
// milik warung). Hanya info level-akun: status, tanggal, modul, jumlah akun.
export const listWarungsWithStats = async () => {
  const res = await query(`
    SELECT
      w.id, w.nama, w.slug, w.kode_prefix, w.warna, w.nomor_wa, w.logo_url,
      w.active_modules, w.owner_wa, w.owner_email,
      w.status_langganan, w.trial_selesai, w.created_at,
      (SELECT COUNT(*) FROM admin_accounts a WHERE a.warung_id = w.id)::int AS akun_count
    FROM warung w
    ORDER BY w.id
  `);
  return res.rows;
};

// ── Super-admin: buat WARUNG BARU + akun owner pertama (onboarding) ──
// Transaksi: insert warung + akun owner sekali jalan (atomic). Slug dicek unik
// dulu (+ dijaga UNIQUE constraint). Setelah commit, seed kategori/menu default
// best-effort (gagal seed TIDAK membatalkan warung — warung tetap bisa dipakai,
// terbukti dari warung tanpa default pun jalan). Lempar error code SLUG_TAKEN
// kalau slug bentrok supaya route bisa tampilkan pesan rapi.
export const createWarung = async ({
  nama, slug, kodePrefix, warna = "", nomorWa = "",
  logoUrl = "", ownerWa = "", ownerEmail = "",
  activeModules = [],
  status = "trial", trialDays = 14,
  ownerUsername, ownerPin, ownerName = "",
}) => {
  const modulesStr = Array.isArray(activeModules) ? activeModules.join(",") : "";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query("SELECT 1 FROM warung WHERE slug = $1", [slug]);
    if (dup.rowCount) { const e = new Error("SLUG_TAKEN"); e.code = "SLUG_TAKEN"; throw e; }

    let trialSelesai = null;
    if (status === "trial") {
      const days = Number(trialDays) > 0 ? Number(trialDays) : 14;
      const wibDate = new Date(Date.now() + days * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      trialSelesai = wibEndOfDayISO(wibDate); // akhir-hari WIB (konsisten dgn tampilan)
    }

    const w = await client.query(
      `INSERT INTO warung (nama, slug, kode_prefix, warna, nomor_wa, logo_url, owner_wa, owner_email, active_modules, status_langganan, trial_selesai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [nama, slug, kodePrefix, warna, nomorWa, logoUrl, ownerWa, ownerEmail, modulesStr, status, trialSelesai]
    );
    const warungId = w.rows[0].id;

    await client.query(
      `INSERT INTO admin_accounts (username, pin, role, display_name, warung_id)
       VALUES ($1, $2, 'owner', $3, $4)`,
      [ownerUsername, ownerPin, ownerName || ownerUsername, warungId]
    );

    await client.query("COMMIT");

    // Seed default di luar transaksi inti (best-effort).
    try { await seedWarungDefaults(warungId); }
    catch (e) { console.warn("[WARUNG] seed default gagal (warung tetap dibuat):", e.message); }

    return { id: warungId, slug };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
};

// ── Platform: cari akun SUPERADMIN (login /platform) ─────────────────
// Lintas-warung by design (akun platform, bukan per-tenant). Cocokkan
// username+pin pada baris role='superadmin'. Null kalau tak cocok.
export const findSuperadmin = async (username, pin) => {
  const res = await query(
    `SELECT username, display_name, role, warung_id FROM admin_accounts
     WHERE role = 'superadmin' AND active = TRUE AND LOWER(username) = LOWER($1) AND pin = $2 LIMIT 1`,
    [username, pin]
  );
  return res.rows[0] ?? null;
};

// ── Platform: akun superadmin aktif by username (utk verifikasi sesi cookie) ──
// Dipakai requirePlatformAuth tiap request → nonaktif berlaku langsung
// (tak menunggu cookie expired). Return {username, display_name} atau null.
export const getActiveSuperadmin = async (username) => {
  const res = await query(
    `SELECT username, display_name FROM admin_accounts
     WHERE role = 'superadmin' AND active = TRUE AND LOWER(username) = LOWER($1) LIMIT 1`,
    [username]
  );
  return res.rows[0] ?? null;
};

// ── Platform: daftar semua akun superadmin (TANPA pin) ──────────────
export const listSuperadmins = async () => {
  const res = await query(
    `SELECT username, display_name, active, last_login FROM admin_accounts
     WHERE role = 'superadmin' ORDER BY (username = 'superadmin') DESC, username`
  );
  return res.rows;
};

// ── Platform: tambah akun superadmin baru (warung_id=1, tak terikat warung) ──
// Lempar Error code USERNAME_TAKEN bila username bentrok (unik per warung_id).
export const createSuperadmin = async ({ username, pin, displayName = "" }) => {
  const u = String(username || "").trim().toLowerCase();
  const exists = await query(
    `SELECT 1 FROM admin_accounts WHERE LOWER(username) = LOWER($1) AND warung_id = 1 LIMIT 1`,
    [u]
  );
  if (exists.rows.length) { const e = new Error("USERNAME_TAKEN"); e.code = "USERNAME_TAKEN"; throw e; }
  await query(
    `INSERT INTO admin_accounts (username, pin, role, display_name, warung_id, active)
     VALUES ($1, $2, 'superadmin', $3, 1, TRUE)`,
    [u, String(pin), displayName || u]
  );
  return { username: u };
};

// ── Platform: aktif/nonaktif akun superadmin ────────────────────────
// GUARD: tak boleh menonaktifkan superadmin AKTIF terakhir (cegah terkunci).
// Return {ok:true} | {ok:false, reason:'last'|'notfound'}.
export const setSuperadminActive = async (username, active) => {
  const u = String(username || "").trim().toLowerCase();
  const target = await query(
    `SELECT username, active FROM admin_accounts WHERE role='superadmin' AND LOWER(username)=LOWER($1) LIMIT 1`,
    [u]
  );
  if (!target.rows.length) return { ok: false, reason: "notfound" };
  if (!active) {
    const cnt = await query(`SELECT COUNT(*)::int AS n FROM admin_accounts WHERE role='superadmin' AND active=TRUE`);
    // Bila target masih aktif & ini satu-satunya yg aktif → tolak.
    if (target.rows[0].active && cnt.rows[0].n <= 1) return { ok: false, reason: "last" };
  }
  await query(
    `UPDATE admin_accounts SET active = $2 WHERE role='superadmin' AND LOWER(username)=LOWER($1)`,
    [u, !!active]
  );
  return { ok: true };
};

// ── Platform: reset PIN akun superadmin → PIN baru 6 digit (tampil sekali) ──
// PIN lama TAK pernah dibaca. Null kalau akun tak ada.
export const resetSuperadminPin = async (username) => {
  const u = String(username || "").trim().toLowerCase();
  const acc = await query(
    `SELECT username FROM admin_accounts WHERE role='superadmin' AND LOWER(username)=LOWER($1) LIMIT 1`,
    [u]
  );
  if (!acc.rows.length) return null;
  const pin = String(randomInt(100000, 1000000)); // 6 digit
  await query(`UPDATE admin_accounts SET pin = $2 WHERE role='superadmin' AND LOWER(username)=LOWER($1)`, [u, pin]);
  return { username: acc.rows[0].username, pin };
};

// ── Platform: pengaturan global (satu baris id=1) ───────────────────
export const getPlatformSettings = async () => {
  const res = await query(`SELECT product_name, base_url, support_wa, support_email, default_trial_days FROM platform_settings WHERE id = 1`);
  return res.rows[0] ?? { product_name: "Warpat SaaS", base_url: "", support_wa: "", support_email: "", default_trial_days: 14 };
};

export const updatePlatformSettings = async ({ productName = "", baseUrl = "", supportWa = "", supportEmail = "", defaultTrialDays = 14 }) => {
  await query(
    `UPDATE platform_settings
       SET product_name = $1, base_url = $2, support_wa = $3, support_email = $4, default_trial_days = $5, updated_at = NOW()
     WHERE id = 1`,
    [productName, baseUrl, supportWa, supportEmail, defaultTrialDays]
  );
  return true;
};

// ── Platform: ubah status langganan + akhir trial sebuah warung ──────
// Dipakai halaman Kelola Langganan (superadmin). Warung 1 dilindungi (skip).
export const updateWarungLangganan = async (id, status, trialSelesai = null) => {
  if (Number(id) === DEFAULT_WARUNG_ID) return false; // Warpat tak boleh dinonaktifkan
  const allowed = new Set(["aktif", "trial", "nonaktif"]);
  if (!allowed.has(status)) return false;
  await query(
    `UPDATE warung SET status_langganan = $2, trial_selesai = $3 WHERE id = $1`,
    [id, status, status === "trial" ? trialSelesai : null]
  );
  return true;
};

// ── Platform: akun owner sebuah warung (TANPA pin) ──────────────────
export const getWarungOwner = async (warungId) => {
  const res = await query(
    `SELECT username, display_name, role, last_login FROM admin_accounts
     WHERE warung_id = $1 AND role = 'owner' ORDER BY id LIMIT 1`,
    [warungId]
  );
  return res.rows[0] ?? null;
};

// Catat waktu login akun (utk panel platform: "terakhir login"). Best-effort.
export const touchAdminLogin = async (warungId, username) => {
  try {
    await query(
      `UPDATE admin_accounts SET last_login = NOW() WHERE warung_id = $1 AND LOWER(username) = LOWER($2)`,
      [warungId, username]
    );
  } catch (e) { console.warn("[DB] touchAdminLogin gagal:", e.message); }
};

// ── Platform: set modul aktif warung (whitelist opsional). Warung 1 → no-op. ──
export const updateWarungModules = async (id, mods = []) => {
  if (Number(id) === DEFAULT_WARUNG_ID) return false; // Warpat selalu penuh
  const clean = (Array.isArray(mods) ? mods : []).filter((m) => OPTIONAL_MODULES.includes(m));
  await query(`UPDATE warung SET active_modules = $2 WHERE id = $1`, [id, clean.join(",")]);
  return true;
};

// ── Platform: reset PIN akun owner → PIN baru 6 digit (return {username,pin}) ──
// PIN lama TAK pernah dibaca. Null kalau warung tak punya akun owner.
export const resetOwnerPin = async (warungId) => {
  const owner = await getWarungOwner(warungId);
  if (!owner) return null;
  const pin = String(randomInt(100000, 1000000)); // 6 digit
  await query(
    `UPDATE admin_accounts SET pin = $3 WHERE warung_id = $1 AND username = $2`,
    [warungId, owner.username, pin]
  );
  return { username: owner.username, pin };
};

// ── Platform: log audit aksi superadmin ─────────────────────────────
export const logPlatformAction = async ({ actor = "", action = "", warungId = null, detail = "" }) => {
  try {
    await query(
      `INSERT INTO platform_log (actor, action, warung_id, detail) VALUES ($1,$2,$3,$4)`,
      [actor, action, warungId, detail]
    );
  } catch (e) { console.warn("[PLATFORM] log gagal:", e.message); }
};

export const readPlatformLog = async (limit = 20) => {
  const res = await query(
    `SELECT pl.ts, pl.actor, pl.action, pl.warung_id, pl.detail, w.nama AS warung_nama
     FROM platform_log pl LEFT JOIN warung w ON w.id = pl.warung_id
     ORDER BY pl.ts DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
};

// ── Row mapper helpers ────────────────────────────────────────

// 60 hari = 2 bulan (threshold inaktif)
const DUA_BULAN_MS = 60 * 24 * 60 * 60 * 1000;

const rowToMember = (row) => {
  const lastScan = row.tanggal_scan_terakhir
    ? new Date(row.tanggal_scan_terakhir).getTime()
    : null;
  // Aktif = pernah scan DAN scan terakhir < 2 bulan lalu
  const aktif = lastScan !== null && (Date.now() - lastScan) < DUA_BULAN_MS;
  return {
    kode:                row.kode,
    nama:                row.nama,
    telepon:             row.telepon               ?? "",
    totalMain:           row.total_main            ?? 0,
    totalPoint:          row.total_point           ?? 0,
    tanggalMulai:        row.tanggal_mulai         ?? null,
    sudahScanHariIni:    row.sudah_scan_hari_ini   ?? false,
    status:              row.status                ?? "-",
    totalGratis:         row.total_gratis          ?? 0,
    tanggalDaftar:       row.tanggal_daftar        ?? null,
    tanggalScanTerakhir: row.tanggal_scan_terakhir ?? null,
    aktif,
    bonusEarnedAt: row.bonus_earned_at ?? null,
  };
};

const rowToTransaksi = (row) => ({
  id:           row.id,
  tanggal:      row.tanggal,
  jam:          row.jam          ?? "",
  jenis:        row.jenis,
  waktu:        row.waktu        ?? "siang",
  kategori:     row.kategori     ?? "",
  subKategori:  row.sub_kategori ?? "",
  keterangan:   row.keterangan   ?? "",
  jumlah:       Number(row.jumlah),
  createdAt:    row.created_at   ?? null,
  voidedAt:     row.voided_at    ?? null,
  voidReason:   row.void_reason  ?? "",
  bayar:        row.bayar        ?? "",
  buktiUrl:     row.bukti_url    ?? "",
  dicatatOleh:  row.dicatat_oleh ?? "",
  // Default TRUE — data lama (sebelum kolom lunas ditambah) dianggap lunas.
  lunas:        row.lunas        !== false,
  lunasAt:      row.lunas_at     ?? null,
  isManual:     row.is_manual    === true,
});

// ── readDB — ambil semua members + transaksi ──────────────────

export const readDB = async (warungId = currentWarungId()) => {
  const [membersRes, transaksiRes] = await Promise.all([
    query("SELECT * FROM members WHERE warung_id = $1 ORDER BY tanggal_daftar DESC", [warungId]),
    query("SELECT * FROM transaksi WHERE warung_id = $1 ORDER BY tanggal DESC, created_at DESC", [warungId]),
  ]);
  return {
    members:   membersRes.rows.map(rowToMember),
    transaksi: transaksiRes.rows.map(rowToTransaksi),
  };
};

// ── Member CRUD ───────────────────────────────────────────────

export const saveMember = async (m, warungId = currentWarungId()) => {
  await query(`
    INSERT INTO members
      (kode, nama, telepon, total_main, tanggal_mulai, sudah_scan_hari_ini,
       status, total_gratis, tanggal_daftar, tanggal_scan_terakhir, bonus_earned_at,
       total_point, warung_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (kode) DO UPDATE SET
      nama                  = EXCLUDED.nama,
      telepon               = EXCLUDED.telepon,
      total_main            = EXCLUDED.total_main,
      tanggal_mulai         = EXCLUDED.tanggal_mulai,
      sudah_scan_hari_ini   = EXCLUDED.sudah_scan_hari_ini,
      status                = EXCLUDED.status,
      total_gratis          = EXCLUDED.total_gratis,
      tanggal_scan_terakhir = EXCLUDED.tanggal_scan_terakhir,
      bonus_earned_at       = EXCLUDED.bonus_earned_at,
      total_point           = EXCLUDED.total_point
    WHERE members.warung_id = EXCLUDED.warung_id
  `, [
    m.kode, m.nama, m.telepon ?? "",
    m.totalMain ?? 0, m.tanggalMulai ?? null,
    m.sudahScanHariIni ?? false, m.status ?? "-",
    m.totalGratis ?? 0, m.tanggalDaftar ?? new Date().toISOString(),
    m.tanggalScanTerakhir ?? null, m.bonusEarnedAt ?? null,
    m.totalPoint ?? 0, warungId,
  ]);
};

// Daftar SEMUA kode member lintas-warung. Dipakai generateKode() agar kode
// dijamin unik GLOBAL (members.kode = PK global) → cegah 2 warung dapat kode
// sama yang bisa memicu konflik lintas-tenant. Ringan: hanya kolom kode.
export const listAllMemberKodes = async () => {
  const res = await query("SELECT kode FROM members");
  return res.rows; // [{ kode }, ...] — kompatibel dgn generateKode(members)
};

export const checkBonusExpiry = async (warungId = currentWarungId()) => {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const res = await query(
    `SELECT kode, nama FROM members WHERE warung_id = $2 AND bonus_earned_at IS NOT NULL AND bonus_earned_at < $1`,
    [cutoff, warungId]
  );
  for (const row of res.rows) {
    await query(
      `UPDATE members SET total_main = 0, bonus_earned_at = NULL, status = '-', tanggal_mulai = NOW() WHERE kode = $1 AND warung_id = $2`,
      [row.kode, warungId]
    );
    await appendLog(row.kode, row.nama, "BONUS_EXPIRED", "Bonus tidak diklaim dalam 2 minggu, progress direset", warungId);
  }
  if (res.rows.length > 0) console.log("[DB] Bonus expired:", res.rows.length, "member direset");
};

export const deleteMember = async (kode, warungId = currentWarungId()) => {
  await query("DELETE FROM members WHERE kode = $1 AND warung_id = $2", [kode.toUpperCase(), warungId]);
};

// ── Reset QR — kode baru, data tetap ─────────────────────────
export const resetQrMember = async (oldKode, newKode, warungId = currentWarungId()) => {
  // Copy semua data ke kode baru — termasuk total_point (lifetime) dan
  // bonus_earned_at supaya progress member gak hilang gara-gara kartu hilang.
  await query(`
    INSERT INTO members
      (kode, nama, telepon, total_main, tanggal_mulai,
       sudah_scan_hari_ini, status, total_gratis, tanggal_daftar, tanggal_scan_terakhir,
       bonus_earned_at, total_point, warung_id)
    SELECT $2, nama, telepon, total_main, tanggal_mulai,
       sudah_scan_hari_ini, status, total_gratis, tanggal_daftar, tanggal_scan_terakhir,
       bonus_earned_at, total_point, warung_id
    FROM members WHERE kode = $1 AND warung_id = $3
  `, [oldKode.toUpperCase(), newKode.toUpperCase(), warungId]);
  // Hapus kode lama
  await query("DELETE FROM members WHERE kode = $1 AND warung_id = $2", [oldKode.toUpperCase(), warungId]);
};

export const resetScanHarian = async (warungId = null) => {
  // warungId null = global (cron harian semua warung); angka = scoped 1 warung
  // (mis. tombol "Reset" manual di /admin yg cuma reset warung itu).
  if (warungId === null) {
    await query("UPDATE members SET sudah_scan_hari_ini = FALSE");
    console.log("[DB] Reset scan harian selesai (global).");
  } else {
    await query("UPDATE members SET sudah_scan_hari_ini = FALSE WHERE warung_id = $1", [warungId]);
    console.log(`[DB] Reset scan harian selesai (warung ${warungId}).`);
  }
};

// ── Member helpers (sync — bekerja pada array in-memory) ──────

export const findMember = (members, kode) =>
  members.find((m) => m.kode.toUpperCase() === kode.toUpperCase()) ?? null;

export const findMemberIndex = (members, kode) =>
  members.findIndex((m) => m.kode.toUpperCase() === kode.toUpperCase());

export const createMember = (kode, nama, telepon = "") => ({
  kode:                kode.toUpperCase(),
  nama:                nama.trim(),
  telepon,
  totalMain:           0,
  totalPoint:          0,
  tanggalMulai:        null,
  sudahScanHariIni:    false,
  status:              "-",
  totalGratis:         0,
  tanggalDaftar:       new Date().toISOString(),
  tanggalScanTerakhir: null,
});

// ── Log ───────────────────────────────────────────────────────

export const readLog = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT ts, kode, nama, aksi, detail FROM logs WHERE warung_id = $1 ORDER BY ts DESC LIMIT 500",
    [warungId]
  );
  return res.rows.map((r) => ({
    ts:     r.ts,
    kode:   r.kode,
    nama:   r.nama,
    aksi:   r.aksi,
    detail: r.detail,
  }));
};

export const appendLog = async (kode, nama, aksi, detail = "", warungId = currentWarungId()) => {
  await query(
    "INSERT INTO logs (ts, kode, nama, aksi, detail, warung_id) VALUES (NOW(),$1,$2,$3,$4,$5)",
    [kode, nama, aksi, detail, warungId]
  );
};

// ── Finance ───────────────────────────────────────────────────

export const readTransaksi = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT * FROM transaksi WHERE warung_id = $1 ORDER BY tanggal DESC, created_at DESC",
    [warungId]
  );
  return res.rows.map(rowToTransaksi);
};

export const appendTransaksi = async (item, warungId = currentWarungId()) => {
  // Default lunas = true kalau tidak di-specify. lunas_at = NOW() kalau lunas
  // saat dicatat, NULL kalau belum (akan diisi saat user klik "Tandai Lunas").
  const lunas = item.lunas !== false;
  await query(
    `INSERT INTO transaksi (id, tanggal, jam, jenis, waktu, kategori, sub_kategori, keterangan, jumlah, created_at, bayar, bukti_url, dicatat_oleh, lunas, lunas_at, warung_id, sesi_id, is_manual)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      item.id, item.tanggal, item.jam ?? "",
      item.jenis, item.waktu ?? "siang",
      item.kategori ?? "", item.subKategori ?? "",
      item.keterangan ?? "",
      item.jumlah, item.createdAt ?? new Date().toISOString(),
      item.bayar ?? "",
      item.buktiUrl ?? "",
      item.dicatatOleh ?? "",
      lunas,
      lunas ? (item.lunasAt ?? new Date().toISOString()) : null,
      warungId,
      item.sesiId ?? null,   // null = transaksi biasa (bukan item sesi)
      item.isManual === true, // true = ditambah manual oleh Owner (backfill)
    ]
  );
};

// Tandai transaksi sebagai lunas (set lunas=TRUE + lunas_at=NOW()).
// Idempotent — kalau sudah lunas, gak ada efek.
export const markTransaksiLunas = async (id, warungId = currentWarungId()) => {
  const res = await query(
    `UPDATE transaksi
       SET lunas = TRUE, lunas_at = NOW()
     WHERE id = $1 AND warung_id = $2 AND lunas = FALSE AND voided_at IS NULL`,
    [id, warungId]
  );
  return res.rowCount > 0;
};

export const deleteTransaksi = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM transaksi WHERE id = $1 AND warung_id = $2", [id, warungId]);
};

// Soft void: tandai transaksi sebagai dibatalkan dengan alasan.
// Transaksi tetap tersimpan untuk audit trail, tapi dikecualikan dari
// perhitungan stats (pemasukan/pengeluaran/saldo). Idempotent —
// voiding transaksi yang sudah voided tidak menimpa data lama.
export const voidTransaksi = async (id, reason, warungId = currentWarungId()) => {
  const res = await query(
    `UPDATE transaksi
       SET voided_at = NOW(), void_reason = $2
     WHERE id = $1 AND warung_id = $3 AND voided_at IS NULL`,
    [id, (reason ?? "").trim().slice(0, 200), warungId]
  );
  return res.rowCount > 0;
};

// ── Kategori ──────────────────────────────────────────────────

export const readKategori = async (warungId = currentWarungId()) => {
  const res = await query("SELECT * FROM kategori WHERE warung_id = $1 ORDER BY jenis, urutan, id", [warungId]);
  return res.rows;
};

export const addKategori = async (nama, jenis, warungId = currentWarungId()) => {
  await query(
    `INSERT INTO kategori (nama, jenis, urutan, warung_id)
     VALUES ($1, $2, COALESCE((SELECT MAX(urutan) FROM kategori WHERE jenis = $2 AND warung_id = $3), 0) + 1, $3)
     ON CONFLICT (warung_id, nama, jenis) DO NOTHING`,
    [nama.trim(), jenis, warungId]
  );
};

export const deleteKategori = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM kategori WHERE id = $1 AND warung_id = $2", [id, warungId]);
};

// Reorder kategori — terima array ids berurutan, set urutan 1..N.
// Hanya update id yang valid; id tak dikenal di-skip dgn aman.
export const updateKategoriUrutan = async (ids, warungId = currentWarungId()) => {
  if (!Array.isArray(ids) || ids.length === 0) return;
  for (let i = 0; i < ids.length; i += 1) {
    const idNum = parseInt(ids[i]);
    if (!idNum) continue;
    await query("UPDATE kategori SET urutan = $1 WHERE id = $2 AND warung_id = $3", [i + 1, idNum, warungId]);
  }
};

// ── Sub Kategori ──────────────────────────────────────────────

export const readSubKategori = async (warungId = currentWarungId()) => {
  const res = await query("SELECT * FROM sub_kategori WHERE warung_id = $1 ORDER BY kategori_id, urutan, id", [warungId]);
  return res.rows;
};

export const addSubKategori = async (kategoriId, nama, warungId = currentWarungId()) => {
  await query(
    `INSERT INTO sub_kategori (kategori_id, nama, urutan, warung_id)
     VALUES ($1, $2, COALESCE((SELECT MAX(urutan) FROM sub_kategori WHERE kategori_id = $1), 0) + 1, $3)
     ON CONFLICT (kategori_id, nama) DO NOTHING`,
    [kategoriId, nama.trim(), warungId]
  );
};

export const deleteSubKategori = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM sub_kategori WHERE id = $1 AND warung_id = $2", [id, warungId]);
};

// ── Menu Items (kopi/snack) ───────────────────────────────────

export const readMenuItems = async (warungId = currentWarungId()) => {
  const res = await query("SELECT id, nama, harga, harga_hot, kategori, best_seller FROM menu_items WHERE warung_id = $1 ORDER BY kategori, best_seller DESC, id ASC", [warungId]);
  return res.rows;
};

export const readMenuToppings = async (warungId = currentWarungId()) => {
  const res = await query("SELECT id, item_id, nama, harga FROM menu_toppings WHERE warung_id = $1 ORDER BY item_id, id", [warungId]);
  return res.rows;
};

export const addMenuItem = async (nama, harga, kategori, bestSeller = false, hargaHot = null, warungId = currentWarungId()) => {
  await query(
    "INSERT INTO menu_items (nama, harga, harga_hot, kategori, best_seller, warung_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (warung_id, nama) DO NOTHING",
    [nama.trim(), harga, hargaHot, kategori, bestSeller, warungId]
  );
};

export const updateMenuItem = async (id, nama, harga, kategori, bestSeller = false, hargaHot = null, warungId = currentWarungId()) => {
  await query(
    "UPDATE menu_items SET nama=$1, harga=$2, harga_hot=$3, kategori=$4, best_seller=$5 WHERE id=$6 AND warung_id=$7",
    [nama.trim(), harga, hargaHot, kategori, bestSeller, id, warungId]
  );
};

export const deleteMenuItem = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM menu_items WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// ── Meja billiard (master + tarif per meja) ───────────────────
// status: 'aktif' (kosong/tersedia) | 'maintenance' | 'nonaktif'.
// Hanya 'aktif' yg jadi pilihan di Catat Transaksi (readMejaAktif).
// Semua scoped per warung_id (currentWarungId() dari async-context tenant).

export const readMejas = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT id, nama, jenis, tarif_siang, tarif_malam, tarif_open, status, urutan FROM meja WHERE warung_id = $1 ORDER BY urutan ASC, id ASC",
    [warungId]
  );
  return res.rows;
};

// Hanya meja status 'aktif' — dipakai sbg pilihan di form Catat Transaksi.
// Maintenance / nonaktif otomatis tidak muncul.
export const readMejaAktif = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT id, nama, tarif_siang, tarif_malam, tarif_open FROM meja WHERE warung_id = $1 AND status = 'aktif' ORDER BY urutan ASC, id ASC",
    [warungId]
  );
  return res.rows;
};

export const addMeja = async (nama, tarifSiang, tarifMalam, tarifOpen, jenis = "7ft", warungId = currentWarungId()) => {
  await query(
    `INSERT INTO meja (nama, jenis, tarif_siang, tarif_malam, tarif_open, urutan, warung_id)
     VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(urutan) FROM meja WHERE warung_id=$6),0)+1, $6)
     ON CONFLICT (warung_id, nama) DO NOTHING`,
    [nama.trim(), jenis, tarifSiang, tarifMalam, tarifOpen, warungId]
  );
};

export const updateMeja = async (id, nama, tarifSiang, tarifMalam, tarifOpen, jenis = "7ft", warungId = currentWarungId()) => {
  await query(
    "UPDATE meja SET nama=$1, jenis=$2, tarif_siang=$3, tarif_malam=$4, tarif_open=$5 WHERE id=$6 AND warung_id=$7",
    [nama.trim(), jenis, tarifSiang, tarifMalam, tarifOpen, id, warungId]
  );
};

export const setMejaStatus = async (id, status, warungId = currentWarungId()) => {
  const s = ["aktif", "maintenance", "nonaktif"].includes(status) ? status : "aktif";
  await query("UPDATE meja SET status=$1 WHERE id=$2 AND warung_id=$3", [s, id, warungId]);
};

export const deleteMeja = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM meja WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// ── Sesi / Bill meja ──────────────────────────────────────────
// Sesi = wadah transaksi utk satu meja. Item-nya TIDAK disimpan terpisah —
// item = baris `transaksi` ber-sesi_id (lunas:false sampai dibayar). Jadi saldo
// otomatis ngikut aturan `lunas` yg sudah ada (item belum bayar tak nambah saldo).
// Semua scoped per warung_id.

export const createSesi = async (mejaId, namaMeja, dibukaOleh = "", catatan = "", warungId = currentWarungId(), openedAt = null) => {
  // uq_sesi_meja_open (partial unique) menjamin maks 1 sesi 'open' per meja →
  // INSERT akan gagal kalau meja sudah punya sesi terbuka (ditangani di route).
  // openedAt: null → NOW() (default). Diisi utk sesi yang telat dicatat (mundur).
  const res = await query(
    `INSERT INTO sesi (meja_id, nama_meja, status, dibuka_oleh, catatan, warung_id, opened_at)
     VALUES ($1, $2, 'open', $3, $4, $5, COALESCE($6::timestamptz, NOW())) RETURNING id`,
    [mejaId ?? null, (namaMeja ?? "").trim(), (dibukaOleh ?? "").trim(), (catatan ?? "").trim(), warungId, openedAt]
  );
  return res.rows[0]?.id ?? null;
};

export const readSesiOpen = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT id, meja_id, nama_meja, status, dibuka_oleh, catatan, opened_at, closed_at
       FROM sesi WHERE warung_id = $1 AND status = 'open' ORDER BY opened_at ASC`,
    [warungId]
  );
  return res.rows;
};

export const readSesiById = async (id, warungId = currentWarungId()) => {
  const res = await query(
    `SELECT id, meja_id, nama_meja, status, dibuka_oleh, catatan, opened_at, closed_at
       FROM sesi WHERE id = $1 AND warung_id = $2`,
    [id, warungId]
  );
  return res.rows[0] ?? null;
};

// Item sesi = transaksi ber-sesi_id (non-void), urut waktu input.
export const readSesiItems = async (sesiId, warungId = currentWarungId()) => {
  const res = await query(
    `SELECT * FROM transaksi WHERE sesi_id = $1 AND warung_id = $2 AND voided_at IS NULL ORDER BY created_at ASC`,
    [sesiId, warungId]
  );
  return res.rows.map(rowToTransaksi);
};

// Void (soft-delete) satu item F&B di sesi. Hanya item NON-sewa & milik sesi
// itu. Item ter-void otomatis hilang dari sesi (readSesiItems filter voided_at)
// & dari saldo (revenue engine abaikan voided), jadi pemasukan terkoreksi.
export const voidSesiItem = async (sesiId, itemId, warungId = currentWarungId()) => {
  const res = await query(
    `UPDATE transaksi SET voided_at = NOW(), void_reason = 'Dibatalkan dari sesi'
       WHERE id = $1 AND sesi_id = $2 AND warung_id = $3
         AND kategori <> 'Sewa Meja' AND voided_at IS NULL`,
    [itemId, sesiId, warungId]
  );
  return res.rowCount > 0;
};

// Meja yang sedang punya sesi 'open' → utk status "Dipakai" di Manajemen Meja.
export const readMejaOpenSesiIds = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT DISTINCT meja_id FROM sesi WHERE warung_id = $1 AND status = 'open' AND meja_id IS NOT NULL`,
    [warungId]
  );
  return res.rows.map((r) => r.meja_id);
};

// Info sesi terbuka per meja (utk live block Manajemen Meja): kapan dibuka +
// waktu (siang/malam) dari item sewa-nya. 1 baris per meja (sesi terbaru).
export const readMejaOpenSesiInfo = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT DISTINCT ON (s.meja_id) s.meja_id, s.opened_at,
            COALESCE(t.waktu, 'siang') AS waktu
       FROM sesi s
       LEFT JOIN transaksi t
         ON t.sesi_id = s.id AND t.warung_id = s.warung_id AND t.kategori = 'Sewa Meja'
      WHERE s.warung_id = $1 AND s.status = 'open' AND s.meja_id IS NOT NULL
      ORDER BY s.meja_id, s.opened_at DESC`,
    [warungId]
  );
  return res.rows;
};

// Terapkan tarif Siang/Malam ke banyak meja sekaligus (opsi filter jenis).
// tarif_open ikut Siang (Open mengikuti Siang/Malam). Kembalikan jumlah baris.
export const updateMejaTarifMassal = async (tarifSiang, tarifMalam, jenis = "all", warungId = currentWarungId()) => {
  const ts = Math.max(0, parseInt(tarifSiang) || 0);
  const tm = Math.max(0, parseInt(tarifMalam) || 0);
  const params = [ts, tm, warungId];
  let sql = "UPDATE meja SET tarif_siang=$1, tarif_malam=$2, tarif_open=$1 WHERE warung_id=$3";
  if (jenis === "7ft" || jenis === "9ft") { sql += " AND jenis=$4"; params.push(jenis); }
  const res = await query(sql, params);
  return res.rowCount;
};

export const hasOpenSesi = async (mejaId, warungId = currentWarungId()) => {
  const res = await query(
    `SELECT 1 FROM sesi WHERE warung_id = $1 AND meja_id = $2 AND status = 'open' LIMIT 1`,
    [warungId, mejaId]
  );
  return res.rowCount > 0;
};

export const closeSesi = async (id, warungId = currentWarungId()) => {
  const res = await query(
    `UPDATE sesi SET status = 'closed', closed_at = NOW()
      WHERE id = $1 AND warung_id = $2 AND status = 'open'`,
    [id, warungId]
  );
  return res.rowCount > 0;
};

// Tandai item sesi lunas + set metode bayar. Dibatasi ke item sesi (sesi_id NOT
// NULL) & belum void — tidak bisa mengenai transaksi biasa (aman by design).
export const setSesiItemPaid = async (id, bayar = "cash", warungId = currentWarungId()) => {
  const b = ["cash", "qris"].includes(bayar) ? bayar : "cash";
  const res = await query(
    `UPDATE transaksi SET lunas = TRUE, lunas_at = NOW(), bayar = $1
      WHERE id = $2 AND warung_id = $3 AND sesi_id IS NOT NULL AND voided_at IS NULL`,
    [b, id, warungId]
  );
  return res.rowCount > 0;
};

// Set nominal item sesi (utk harga sewa Open yg diisi manual saat tutup sesi).
export const setSesiItemJumlah = async (id, jumlah, warungId = currentWarungId()) => {
  await query(
    `UPDATE transaksi SET jumlah = $1
      WHERE id = $2 AND warung_id = $3 AND sesi_id IS NOT NULL AND voided_at IS NULL`,
    [Math.max(0, parseInt(jumlah) || 0), id, warungId]
  );
};

// Update item SEWA sebuah sesi (jumlah + keterangan) — utk "Ubah durasi" saat
// sesi masih jalan. Hanya item sewa yg belum dibayar (lunas=FALSE).
export const updateSesiSewa = async (sesiId, jumlah, keterangan, paid = undefined, metode = "cash", warungId = currentWarungId()) => {
  // Update jumlah/keterangan sewa TANPA guard lunas — perpanjang durasi tetap
  // bisa walau sewa sudah dibayar. Status bayar OPSIONAL:
  //  paid === undefined -> lunas/bayar dibiarkan apa adanya (mis. undo).
  //  paid === true       -> tandai lunas + metode (tambahan dibayar saat perpanjang).
  //  paid === false      -> set belum bayar (ditagih saat tutup).
  const sets = ["jumlah = $1", "keterangan = $2"];
  const params = [Math.max(0, parseInt(jumlah) || 0), String(keterangan || "").slice(0, 200)];
  if (paid === true) {
    const b = ["cash", "qris"].includes(metode) ? metode : "cash";
    params.push(b);
    sets.push("lunas = TRUE", "lunas_at = NOW()", `bayar = $${params.length}`);
  } else if (paid === false) {
    sets.push("lunas = FALSE", "lunas_at = NULL", "bayar = ''");
  }
  params.push(sesiId);   const sesiIdx   = params.length;
  params.push(warungId); const warungIdx = params.length;
  const res = await query(
    `UPDATE transaksi SET ${sets.join(", ")}
      WHERE sesi_id = $${sesiIdx} AND warung_id = $${warungIdx} AND kategori = 'Sewa Meja'
        AND voided_at IS NULL`,
    params
  );
  return res.rowCount > 0;
};

export const addMenuTopping = async (itemId, nama, harga, warungId = currentWarungId()) => {
  await query(
    "INSERT INTO menu_toppings (item_id, nama, harga, warung_id) VALUES ($1, $2, $3, $4)",
    [itemId, nama.trim(), harga, warungId]
  );
};

export const deleteMenuTopping = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM menu_toppings WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// ── Bahan Baku (HPP — komponen biaya per menu) ────────────────
// Schema lihat migrate.js. harga_per_satuan = Rupiah per unit satuan
// (mis. 1 gram = Rp 100). HPP menu = SUM(qty × harga_per_satuan) dari resep.

// Helper: normalize extras object — terima { hargaDus, isiPerDus, hargaRenteng,
// isiPerRenteng, supplier, catatan, supplierId, stok, stokMin } dgn default aman.
function normalizeBahanExtras(extras = {}) {
  const sid = parseInt(extras.supplierId || 0) || 0;
  return {
    hargaDus:        Math.max(0, parseInt(extras.hargaDus || 0) || 0),
    isiPerDus:       Math.max(0, Number(extras.isiPerDus || 0) || 0),
    hargaRenteng:    Math.max(0, parseInt(extras.hargaRenteng || 0) || 0),
    isiPerRenteng:   Math.max(0, Number(extras.isiPerRenteng || 0) || 0),
    supplier:        (extras.supplier || "").toString().trim().slice(0, 120),
    catatan:         (extras.catatan  || "").toString().trim().slice(0, 500),
    supplierId:      sid > 0 ? sid : null,
    stok:            Math.max(0, Number(extras.stok || 0) || 0),
    stokMin:         Math.max(0, Number(extras.stokMin || 0) || 0),
  };
}

export const readBahan = async (warungId = currentWarungId()) => {
  // last_mov: subquery ambil movement terbaru per bahan (untuk kolom "Terakhir
  // Diperbarui" di stok page). Pakai DISTINCT ON utk performa, urut by created_at DESC.
  const res = await query(
    `SELECT b.id, b.nama, b.satuan, b.harga_per_satuan,
            b.qty_per_porsi::float AS qty_per_porsi, b.porsi_label,
            b.tanggal_input, b.tanggal_update_harga,
            b.harga_dus, b.isi_per_dus::float AS isi_per_dus,
            b.harga_renteng, b.isi_per_renteng::float AS isi_per_renteng,
            b.supplier, b.catatan,
            b.supplier_id,
            b.stok::float     AS stok,
            b.stok_min::float AS stok_min,
            b.updated_at,
            s.nama AS supplier_nama,
            lm.created_at AS last_movement_at,
            lm.created_by AS last_movement_by,
            lm.jenis      AS last_movement_jenis
     FROM bahan_baku b
     LEFT JOIN supplier s ON s.id = b.supplier_id
     LEFT JOIN LATERAL (
       SELECT created_at, created_by, jenis
       FROM stok_movement
       WHERE bahan_id = b.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON TRUE
     WHERE b.warung_id = $1
     ORDER BY b.nama ASC`,
    [warungId]
  );
  return res.rows;
};

export const addBahan = async (nama, satuan, hargaPerSatuan, qtyPerPorsi = 1, porsiLabel = "", extras = {}, warungId = currentWarungId()) => {
  const qpp = Number(qtyPerPorsi) > 0 ? Number(qtyPerPorsi) : 1;
  const e = normalizeBahanExtras(extras);
  const res = await query(
    `INSERT INTO bahan_baku
       (nama, satuan, harga_per_satuan, qty_per_porsi, porsi_label,
        harga_dus, isi_per_dus, harga_renteng, isi_per_renteng, supplier, catatan,
        supplier_id, stok, stok_min, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (warung_id, nama) DO NOTHING
     RETURNING id`,
    [
      nama.trim(), satuan.trim() || "pcs", hargaPerSatuan | 0, qpp,
      (porsiLabel || "").trim().slice(0, 20),
      e.hargaDus, e.isiPerDus, e.hargaRenteng, e.isiPerRenteng, e.supplier, e.catatan,
      e.supplierId, e.stok, e.stokMin, warungId,
    ]
  );
  return res.rows[0]?.id ?? null;
};

// Update bahan. Kalau harga_per_satuan berubah → log ke bahan_harga_history
// + update tanggal_update_harga. Pakai transaction utk atomicity.
export const updateBahan = async (id, nama, satuan, hargaPerSatuan, qtyPerPorsi = 1, porsiLabel = "", extras = {}, changedBy = "", warungId = currentWarungId()) => {
  const qpp = Number(qtyPerPorsi) > 0 ? Number(qtyPerPorsi) : 1;
  const e   = normalizeBahanExtras(extras);
  const newHarga = hargaPerSatuan | 0;

  await query("BEGIN");
  try {
    // Cek harga lama dulu — kalau beda, log history & update timestamp.
    const cur = await query(`SELECT harga_per_satuan FROM bahan_baku WHERE id=$1 AND warung_id=$2 FOR UPDATE`, [id, warungId]);
    const oldHarga = cur.rows[0]?.harga_per_satuan ?? 0;
    const hargaChanged = oldHarga !== newHarga;

    await query(
      `UPDATE bahan_baku
         SET nama=$1, satuan=$2, harga_per_satuan=$3, qty_per_porsi=$4, porsi_label=$5,
             harga_dus=$6, isi_per_dus=$7, harga_renteng=$8, isi_per_renteng=$9,
             supplier=$10, catatan=$11,
             supplier_id=$12, stok_min=$13,
             tanggal_update_harga = CASE WHEN $14 THEN NOW() ELSE tanggal_update_harga END,
             updated_at=NOW()
       WHERE id=$15 AND warung_id=$16`,
      [
        nama.trim(), satuan.trim() || "pcs", newHarga, qpp,
        (porsiLabel || "").trim().slice(0, 20),
        e.hargaDus, e.isiPerDus, e.hargaRenteng, e.isiPerRenteng, e.supplier, e.catatan,
        e.supplierId, e.stokMin,
        hargaChanged, id, warungId,
      ]
    );

    if (hargaChanged) {
      await query(
        `INSERT INTO bahan_harga_history (bahan_id, harga_lama, harga_baru, changed_by, warung_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, oldHarga, newHarga, (changedBy || "").toString().trim().slice(0, 60), warungId]
      );
    }
    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
};

export const deleteBahan = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM bahan_baku WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// ── Supplier (master data pemasok bahan baku) ──────────────────
// readSuppliers: kembaliin list supplier + count bahan yg pakai supplier itu.
// Berguna utk display "X bahan" di card supplier dan utk warning saat hapus.
export const readSuppliers = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT s.id, s.nama, s.kontak, s.alamat, s.catatan,
            s.created_at, s.updated_at,
            COUNT(b.id)::int AS bahan_count
     FROM supplier s
     LEFT JOIN bahan_baku b ON b.supplier_id = s.id
     WHERE s.warung_id = $1
     GROUP BY s.id
     ORDER BY s.nama ASC`,
    [warungId]
  );
  return res.rows;
};

export const addSupplier = async ({ nama, kontak = "", alamat = "", catatan = "" }, warungId = currentWarungId()) => {
  const res = await query(
    `INSERT INTO supplier (nama, kontak, alamat, catatan, warung_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (warung_id, nama) DO NOTHING
     RETURNING id`,
    [
      (nama || "").trim().slice(0, 120),
      (kontak  || "").toString().trim().slice(0, 120),
      (alamat  || "").toString().trim().slice(0, 250),
      (catatan || "").toString().trim().slice(0, 500),
      warungId,
    ]
  );
  return res.rows[0]?.id ?? null;
};

export const updateSupplier = async (id, { nama, kontak = "", alamat = "", catatan = "" }, warungId = currentWarungId()) => {
  await query(
    `UPDATE supplier
       SET nama=$1, kontak=$2, alamat=$3, catatan=$4, updated_at=NOW()
     WHERE id=$5 AND warung_id=$6`,
    [
      (nama || "").trim().slice(0, 120),
      (kontak  || "").toString().trim().slice(0, 120),
      (alamat  || "").toString().trim().slice(0, 250),
      (catatan || "").toString().trim().slice(0, 500),
      id, warungId,
    ]
  );
};

export const deleteSupplier = async (id, warungId = currentWarungId()) => {
  // bahan_baku.supplier_id ON DELETE SET NULL — bahan terkait di-unlink, gak ke-hapus.
  await query("DELETE FROM supplier WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// ── Stok (penyesuaian + audit trail) ───────────────────────────
// adjustStok: ubah stok bahan + log ke stok_movement (audit trail).
//   jenis: 'in' (tambah), 'out' (kurang), 'adjust' (set absolute).
//   qtyChange: angka delta. Utk 'in'/'out' jadi delta positif/negatif.
//     Utk 'adjust' diabaikan — pakai newStok sebagai target absolute.
//   newStok: hanya dipakai utk jenis='adjust' (set absolute).
// Pakai transaction supaya update bahan + insert movement atomic.
export const adjustStok = async (bahanId, jenis, qtyChange, { catatan = "", changedBy = "", newStok = null } = {}, warungId = currentWarungId()) => {
  const jn = ["in", "out", "adjust"].includes(jenis) ? jenis : "adjust";
  await query("BEGIN");
  let stokLama, stokBaru, delta, stokMin, bahanNama, bahanSatuan;
  try {
    const cur = await query(
      `SELECT stok::float AS stok, stok_min::float AS stok_min, nama, satuan
       FROM bahan_baku WHERE id=$1 AND warung_id=$2 FOR UPDATE`,
      [bahanId, warungId]
    );
    if (!cur.rows[0]) throw new Error("Bahan tidak ditemukan");
    stokLama    = Number(cur.rows[0].stok) || 0;
    stokMin     = Number(cur.rows[0].stok_min) || 0;
    bahanNama   = cur.rows[0].nama;
    bahanSatuan = cur.rows[0].satuan || "pcs";

    if (jn === "adjust") {
      stokBaru = Math.max(0, Number(newStok) || 0);
      delta    = stokBaru - stokLama;
    } else {
      const qc = Math.max(0, Number(qtyChange) || 0);
      delta    = jn === "in" ? qc : -qc;
      stokBaru = Math.max(0, stokLama + delta);
    }

    // Skip noop: kalau delta === 0 (tidak ada perubahan stok), jangan UPDATE/INSERT
    // movement supaya gak noise di riwayat. Tetap COMMIT supaya FOR UPDATE lock release.
    if (delta === 0) {
      await query("COMMIT");
      return { stokLama, stokBaru, delta: 0, noop: true };
    }

    await query(`UPDATE bahan_baku SET stok=$1, updated_at=NOW() WHERE id=$2 AND warung_id=$3`, [stokBaru, bahanId, warungId]);
    await query(
      `INSERT INTO stok_movement (bahan_id, jenis, qty_change, qty_after, catatan, created_by, warung_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        bahanId, jn, delta, stokBaru,
        (catatan   || "").toString().trim().slice(0, 200),
        (changedBy || "").toString().trim().slice(0, 60),
        warungId,
      ]
    );
    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }

  // ── Notifikasi: trigger setelah COMMIT, gagal tidak boleh rollback stok ──
  // Hanya trigger kalo status memburuk (transition ke low/out). Restock yang
  // bikin stok kembali OK gak perlu notif. Dedup window 24 jam (default).
  try {
    const statusOf = (s, m) => (s <= 0 ? "out" : (m > 0 && s <= m ? "low" : "ok"));
    const stOld = statusOf(stokLama, stokMin);
    const stNew = statusOf(stokBaru, stokMin);
    if (stNew === "out" && stOld !== "out") {
      await addNotifikasi({
        tipe: "stok_out",
        prioritas: "danger",
        title: "Stok habis: " + bahanNama,
        pesan: "Stok " + bahanNama + " sudah 0 " + bahanSatuan + ". Perlu restok segera.",
        link: "/operasional/stok?filter=out",
        meta: { bahan_id: bahanId, stok: stokBaru, threshold: stokMin },
        dedupKey: "stok_out:" + bahanId,
      }, warungId);
    } else if (stNew === "low" && stOld === "ok") {
      await addNotifikasi({
        tipe: "stok_low",
        prioritas: "warning",
        title: "Stok tipis: " + bahanNama,
        pesan: "Sisa " + stokBaru + " " + bahanSatuan + " (threshold " + stokMin + "). Perlu restok.",
        link: "/operasional/stok?filter=low",
        meta: { bahan_id: bahanId, stok: stokBaru, threshold: stokMin },
        dedupKey: "stok_low:" + bahanId,
      }, warungId);
    }
  } catch (notifErr) {
    console.error("[adjustStok] notif trigger error:", notifErr.message);
  }

  return { stokLama, stokBaru, delta };
};

// Set threshold low-stock utk bahan. Bypass updateBahan biar gak trigger
// history harga / reset kolom lain. Cuma 1 field, idempotent.
export const setStokMin = async (id, stokMin, warungId = currentWarungId()) => {
  const sm = Math.max(0, Number(stokMin) || 0);
  await query(`UPDATE bahan_baku SET stok_min=$1, updated_at=NOW() WHERE id=$2 AND warung_id=$3`, [sm, id, warungId]);
};

// Read history movement utk 1 bahan, urut terbaru duluan. Limit 50 row.
export const readStokMovements = async (bahanId, limit = 50, warungId = currentWarungId()) => {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const res = await query(
    `SELECT id, jenis, qty_change::float AS qty_change, qty_after::float AS qty_after,
            catatan, created_by, created_at
     FROM stok_movement
     WHERE bahan_id=$1 AND warung_id=$3
     ORDER BY created_at DESC
     LIMIT $2`,
    [bahanId, lim, warungId]
  );
  return res.rows;
};

// Read movement terbaru LINTAS bahan — untuk panel riwayat di stok page.
// JOIN bahan_baku biar dapat nama + satuan utk display.
export const readStokMovementsAll = async (limit = 10, warungId = currentWarungId()) => {
  const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const res = await query(
    `SELECT m.id, m.bahan_id, m.jenis,
            m.qty_change::float AS qty_change,
            m.qty_after::float  AS qty_after,
            m.catatan, m.created_by, m.created_at,
            b.nama   AS bahan_nama,
            b.satuan AS bahan_satuan
     FROM stok_movement m
     LEFT JOIN bahan_baku b ON b.id = m.bahan_id
     WHERE m.warung_id = $2
     ORDER BY m.created_at DESC
     LIMIT $1`,
    [lim, warungId]
  );
  return res.rows;
};

// ── Notifikasi (in-app bell sidebar) ───────────────────────────
// Window dedup default 24 jam — skip insert kalau dedup_key sama sudah ada
// dalam window. Return id baru atau null kalau di-skip.
const VALID_NOTIF_TIPE = [
  "stok_low", "stok_out",
  "target_harian", "target_mingguan", "target_bulanan",
  "daily_summary",
  "transaksi_in", "transaksi_out",
];
const VALID_PRIORITAS = ["info", "warning", "danger"];

export const addNotifikasi = async ({
  tipe, title, pesan = "", link = "", meta = {}, prioritas = "info",
  dedupKey = "", dedupWindowHours = 24,
}, warungId = currentWarungId()) => {
  const tp = VALID_NOTIF_TIPE.includes(tipe) ? tipe : "info";
  const pr = VALID_PRIORITAS.includes(prioritas) ? prioritas : "info";
  // Dedup: kalau dedupKey kosong, skip cek (selalu insert).
  if (dedupKey) {
    const winH = Math.max(1, parseInt(dedupWindowHours) || 24);
    const existing = await query(
      `SELECT id FROM notifikasi
       WHERE dedup_key = $1 AND warung_id = $3
         AND created_at >= NOW() - INTERVAL '1 hour' * $2
       LIMIT 1`,
      [dedupKey, winH, warungId]
    );
    if (existing.rows.length > 0) return null;
  }
  const res = await query(
    `INSERT INTO notifikasi (tipe, title, pesan, link, meta, prioritas, dedup_key, warung_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8) RETURNING id`,
    [
      tp,
      (title || "").toString().trim().slice(0, 200),
      (pesan || "").toString().trim().slice(0, 500),
      (link  || "").toString().trim().slice(0, 250),
      JSON.stringify(meta || {}),
      pr,
      (dedupKey || "").toString().trim().slice(0, 120),
      warungId,
    ]
  );
  return res.rows[0]?.id ?? null;
};

// Read notifikasi terbaru. opts: { limit, tipe, unreadOnly }.
export const readNotifikasi = async ({ limit = 30, tipe = "", unreadOnly = false } = {}, warungId = currentWarungId()) => {
  const lim = Math.min(Math.max(parseInt(limit) || 30, 1), 200);
  const where = ["warung_id = $1"];
  const params = [warungId];
  if (tipe && VALID_NOTIF_TIPE.includes(tipe)) {
    where.push("tipe = $" + (params.length + 1));
    params.push(tipe);
  }
  if (unreadOnly) where.push("read_at IS NULL");
  const whereSql = "WHERE " + where.join(" AND ");
  params.push(lim);
  const res = await query(
    `SELECT id, tipe, title, pesan, link, meta, prioritas, read_at, created_at
     FROM notifikasi
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return res.rows;
};

export const countUnreadNotifikasi = async (warungId = currentWarungId()) => {
  const res = await query(`SELECT COUNT(*)::int AS c FROM notifikasi WHERE warung_id = $1 AND read_at IS NULL`, [warungId]);
  return res.rows[0]?.c || 0;
};

// Count per tipe — untuk filter dropdown badge ("Stok 3, Target 1...").
export const countNotifikasiByTipe = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT tipe, COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread
     FROM notifikasi WHERE warung_id = $1 GROUP BY tipe`,
    [warungId]
  );
  return res.rows;
};

export const markNotifikasiRead = async (id, warungId = currentWarungId()) => {
  await query(`UPDATE notifikasi SET read_at = NOW() WHERE id = $1 AND warung_id = $2 AND read_at IS NULL`, [id, warungId]);
};

export const markAllNotifikasiRead = async (warungId = currentWarungId()) => {
  await query(`UPDATE notifikasi SET read_at = NOW() WHERE warung_id = $1 AND read_at IS NULL`, [warungId]);
};

export const deleteNotifikasi = async (id, warungId = currentWarungId()) => {
  await query(`DELETE FROM notifikasi WHERE id = $1 AND warung_id = $2`, [id, warungId]);
};

export const deleteAllNotifikasi = async (warungId = currentWarungId()) => {
  await query(`DELETE FROM notifikasi WHERE warung_id = $1`, [warungId]);
};

// Cleanup notif lebih lama dari N hari. Default 30. Untuk cron daily.
export const cleanupOldNotifikasi = async (days = 30) => {
  const d = Math.max(1, parseInt(days) || 30);
  const res = await query(
    `DELETE FROM notifikasi WHERE created_at < NOW() - INTERVAL '1 day' * $1 RETURNING id`,
    [d]
  );
  return res.rows.length;
};

// ── Catatan Fitur (note pengembangan aplikasi) ─────────────────
// Helper: validate enum values (jaga2 dari input invalid).
const VALID_PRIORITY = ["low", "medium", "high", "urgent"];
const VALID_STATUS   = ["ide", "planning", "coding", "done"];
const cleanPrio = (p) => VALID_PRIORITY.includes(p) ? p : "medium";
const cleanStat = (s) => VALID_STATUS.includes(s) ? s : "ide";

export const readFeatureNotes = async (filters = {}, warungId = currentWarungId()) => {
  // Urutan: priority urgent > high > medium > low, lalu status non-done dulu, lalu updated_at terbaru.
  const where = ["warung_id=$1"];
  const params = [warungId];
  if (filters.status   && VALID_STATUS.includes(filters.status))     { where.push("status=$"   + (params.length + 1)); params.push(filters.status); }
  if (filters.priority && VALID_PRIORITY.includes(filters.priority)) { where.push("priority=$" + (params.length + 1)); params.push(filters.priority); }
  if (filters.kategori) { where.push("kategori ILIKE $" + (params.length + 1)); params.push("%" + filters.kategori + "%"); }
  const whereSql = where.length ? ("WHERE " + where.join(" AND ")) : "";
  const sql = `
    SELECT id, title, deskripsi, priority, status, kategori, created_by, created_at, updated_at, done_at,
           CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END AS _prio_rank,
           CASE WHEN status='done' THEN 1 ELSE 0 END AS _done_rank
    FROM feature_notes
    ${whereSql}
    ORDER BY _done_rank ASC, _prio_rank ASC, updated_at DESC
  `;
  const res = await query(sql, params);
  return res.rows;
};

export const addFeatureNote = async ({ title, deskripsi, priority, status, kategori, createdBy }, warungId = currentWarungId()) => {
  const res = await query(
    `INSERT INTO feature_notes (title, deskripsi, priority, status, kategori, created_by, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      (title || "").trim().slice(0, 200),
      (deskripsi || "").toString().slice(0, 4000),
      cleanPrio(priority),
      cleanStat(status),
      (kategori || "").trim().slice(0, 60),
      (createdBy || "").trim().slice(0, 60),
      warungId,
    ]
  );
  return res.rows[0]?.id ?? null;
};

export const updateFeatureNote = async (id, { title, deskripsi, priority, status, kategori }, warungId = currentWarungId()) => {
  const stat = cleanStat(status);
  await query(
    `UPDATE feature_notes
       SET title=$1, deskripsi=$2, priority=$3, status=$4, kategori=$5,
           updated_at=NOW(),
           done_at = CASE WHEN $4='done' AND done_at IS NULL THEN NOW()
                          WHEN $4<>'done' THEN NULL
                          ELSE done_at END
     WHERE id=$6 AND warung_id=$7`,
    [
      (title || "").trim().slice(0, 200),
      (deskripsi || "").toString().slice(0, 4000),
      cleanPrio(priority),
      stat,
      (kategori || "").trim().slice(0, 60),
      id, warungId,
    ]
  );
};

export const setFeatureNoteStatus = async (id, status, warungId = currentWarungId()) => {
  const stat = cleanStat(status);
  await query(
    `UPDATE feature_notes
       SET status=$1, updated_at=NOW(),
           done_at = CASE WHEN $1='done' AND done_at IS NULL THEN NOW()
                          WHEN $1<>'done' THEN NULL
                          ELSE done_at END
     WHERE id=$2 AND warung_id=$3`,
    [stat, id, warungId]
  );
};

export const deleteFeatureNote = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM feature_notes WHERE id=$1 AND warung_id=$2", [id, warungId]);
};

// Read history harga perubahan utk 1 bahan, urut terbaru duluan.
export const readBahanHistory = async (bahanId, warungId = currentWarungId()) => {
  const res = await query(
    `SELECT id, harga_lama, harga_baru, changed_at, changed_by
     FROM bahan_harga_history
     WHERE bahan_id=$1 AND warung_id=$2
     ORDER BY changed_at DESC
     LIMIT 50`,
    [bahanId, warungId]
  );
  return res.rows;
};

// ── Resep menu (M:N menu_items ↔ bahan_baku) ──────────────────

// Baca semua row resep + join data bahan (untuk hitung HPP & UI editor).
// qty = jumlah PORSI (integer). Subtotal = qty × qty_per_porsi × harga_per_satuan.
// Return: [{ menu_item_id, bahan_id, qty, catatan, nama, satuan, harga_per_satuan,
//            qty_per_porsi, porsi_label, harga_per_porsi, subtotal }]
export const readResepAll = async (warungId = currentWarungId()) => {
  const res = await query(`
    SELECT r.menu_item_id, r.bahan_id, r.qty::float AS qty, r.catatan,
           b.nama, b.satuan, b.harga_per_satuan,
           b.qty_per_porsi::float AS qty_per_porsi, b.porsi_label,
           (b.qty_per_porsi * b.harga_per_satuan)::int AS harga_per_porsi,
           (r.qty * b.qty_per_porsi * b.harga_per_satuan)::int AS subtotal
    FROM menu_resep r
    JOIN bahan_baku b ON b.id = r.bahan_id
    WHERE r.warung_id = $1
    ORDER BY r.menu_item_id, b.nama
  `, [warungId]);
  return res.rows;
};

// Replace semua resep utk 1 menu (atomic via transaction). items = [{ bahan_id, qty, catatan? }].
// Row dengan qty<=0 atau bahan_id invalid di-skip — jadi simpan resep "kosong"
// (hapus semua) tetap aman.
export const setResep = async (menuItemId, items = [], warungId = currentWarungId()) => {
  const valid = items.filter((x) => x && x.bahan_id && Number(x.qty) > 0);
  await query("BEGIN");
  try {
    await query("DELETE FROM menu_resep WHERE menu_item_id=$1 AND warung_id=$2", [menuItemId, warungId]);
    for (const it of valid) {
      await query(
        `INSERT INTO menu_resep (menu_item_id, bahan_id, qty, catatan, warung_id) VALUES ($1, $2, $3, $4, $5)`,
        [menuItemId, it.bahan_id | 0, Number(it.qty), (it.catatan || "").slice(0, 200), warungId]
      );
    }
    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
};

// Hitung HPP per menu item → Map<menu_item_id, hpp_int>. Dipakai di view
// untuk display HPP & margin di tiap card menu.
// qty = jumlah porsi → kalikan qty_per_porsi (konversi ke satuan dasar) × harga.
export const computeHppMap = async (warungId = currentWarungId()) => {
  const res = await query(`
    SELECT r.menu_item_id, SUM(r.qty * b.qty_per_porsi * b.harga_per_satuan)::int AS hpp
    FROM menu_resep r
    JOIN bahan_baku b ON b.id = r.bahan_id
    WHERE r.warung_id = $1
    GROUP BY r.menu_item_id
  `, [warungId]);
  const map = new Map();
  for (const row of res.rows) map.set(row.menu_item_id, row.hpp);
  return map;
};

// ── Karyawan ──────────────────────────────────────────────────

export const readKaryawan = async (includeNonaktif = false, warungId = currentWarungId()) => {
  const res = await query(
    includeNonaktif
      ? "SELECT * FROM karyawan WHERE warung_id = $1 ORDER BY created_at"
      : "SELECT * FROM karyawan WHERE warung_id = $1 AND status = 'aktif' ORDER BY created_at",
    [warungId]
  );
  return res.rows;
};

export const getKaryawanById = async (id, warungId = currentWarungId()) => {
  const res = await query("SELECT * FROM karyawan WHERE id = $1 AND warung_id = $2", [id, warungId]);
  return res.rows[0] ?? null;
};

export const addKaryawan = async ({ nama, jabatan, gajiPokok, uangMakan, hariKerja, tglMulai, telepon, shift }, warungId = currentWarungId()) => {
  const res = await query(
    `INSERT INTO karyawan (nama, jabatan, gaji_pokok, uang_makan, hari_kerja, tgl_mulai, telepon, shift, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [nama.trim(), jabatan.trim(), gajiPokok, uangMakan || 0, hariKerja || 26, tglMulai || null, telepon.trim(), shift || "siang", warungId]
  );
  return res.rows[0].id;
};

export const updateKaryawan = async (id, { nama, jabatan, gajiPokok, uangMakan, hariKerja, tglMulai, telepon, shift }, warungId = currentWarungId()) => {
  await query(
    `UPDATE karyawan SET nama=$1, jabatan=$2, gaji_pokok=$3, uang_makan=$4, hari_kerja=$5, tgl_mulai=$6, telepon=$7, shift=$8 WHERE id=$9 AND warung_id=$10`,
    [nama.trim(), jabatan.trim(), gajiPokok, uangMakan || 0, hariKerja || 26, tglMulai || null, telepon.trim(), shift || "siang", id, warungId]
  );
};

export const nonaktifkanKaryawan = async (id, warungId = currentWarungId()) => {
  await query(`UPDATE karyawan SET status = 'nonaktif' WHERE id = $1 AND warung_id = $2`, [id, warungId]);
};

// ── SDM Transaksi ─────────────────────────────────────────────

export const readSdmTransaksi = async (bulan, warungId = currentWarungId()) => {
  const res = await query(
    "SELECT * FROM sdm_transaksi WHERE bulan = $1 AND warung_id = $2 ORDER BY created_at DESC",
    [bulan, warungId]
  );
  return res.rows;
};

export const readSdmTransaksiByKaryawan = async (karyawanId, warungId = currentWarungId()) => {
  const res = await query(
    "SELECT * FROM sdm_transaksi WHERE karyawan_id = $1 AND warung_id = $2 ORDER BY bulan DESC, created_at DESC",
    [karyawanId, warungId]
  );
  return res.rows;
};

export const appendSdmTransaksi = async (item, warungId = currentWarungId()) => {
  await query(
    `INSERT INTO sdm_transaksi (id, karyawan_id, tipe, jumlah, bulan, keterangan, metode, created_at, warung_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [item.id, item.karyawanId, item.tipe, item.jumlah, item.bulan,
     item.keterangan ?? "", item.metode ?? "cash", item.createdAt ?? new Date().toISOString(), warungId]
  );
};

export const deleteSdmTransaksi = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM sdm_transaksi WHERE id = $1 AND warung_id = $2", [id, warungId]);
};

// ── Admin Accounts ────────────────────────────────────────────

export const readAdminAccounts = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT * FROM admin_accounts WHERE warung_id = $1 ORDER BY (role = 'owner') DESC, id",
    [warungId]
  );
  return res.rows;
};

export const updateAdminAccount = async (id, username, pin, shift = null, warungId = currentWarungId()) => {
  if (shift !== null) {
    await query(
      "UPDATE admin_accounts SET username=$1, pin=$2, shift=$3 WHERE id=$4 AND warung_id=$5",
      [username.toLowerCase(), pin, shift, parseInt(id), warungId]
    );
  } else {
    await query(
      "UPDATE admin_accounts SET username=$1, pin=$2 WHERE id=$3 AND warung_id=$4",
      [username.toLowerCase(), pin, parseInt(id), warungId]
    );
  }
};

// ── Monitoring: Setoran (shift closing report) ────────────────

export const readSetoranList = async ({ bulan, username } = {}, warungId = currentWarungId()) => {
  let sql = "SELECT * FROM setoran WHERE warung_id = $1";
  const params = [warungId];
  if (bulan)    { params.push(bulan + "%"); sql += ` AND tanggal::TEXT LIKE $${params.length}`; }
  if (username) { params.push(username);    sql += ` AND karyawan_username = $${params.length}`; }
  sql += " ORDER BY tanggal DESC, created_at DESC LIMIT 200";
  const res = await query(sql, params);
  return res.rows.map((r) => ({
    id:               r.id,
    tanggal:          r.tanggal instanceof Date ? r.tanggal.toISOString().slice(0, 10) : String(r.tanggal).slice(0, 10),
    shift:            r.shift            ?? "siang",
    karyawanNama:     r.karyawan_nama    ?? "",
    karyawanUsername: r.karyawan_username ?? "",
    jamBuka:          r.jam_buka         ?? "",
    jamTutup:         r.jam_tutup        ?? "",
    modalAwal:        Number(r.modal_awal    ?? 0),
    pemasukan:        Number(r.pemasukan     ?? 0),
    pengeluaran:      Number(r.pengeluaran   ?? 0),
    uangSetor:        Number(r.uang_setor    ?? 0),
    selisih:          Number(r.selisih       ?? 0),
    keterangan:       r.keterangan       ?? "",
    createdAt:        r.created_at       ?? null,
  }));
};

export const appendSetoran = async (s, warungId = currentWarungId()) => {
  await query(
    `INSERT INTO setoran (id, tanggal, shift, karyawan_nama, karyawan_username, jam_buka, jam_tutup, modal_awal, pemasukan, pengeluaran, uang_setor, selisih, keterangan, warung_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      s.id, s.tanggal, s.shift,
      s.karyawanNama, s.karyawanUsername,
      s.jamBuka    ?? "", s.jamTutup   ?? "",
      s.modalAwal  ?? 0,  s.pemasukan  ?? 0,  s.pengeluaran ?? 0,
      s.uangSetor  ?? 0,  s.selisih    ?? 0,
      s.keterangan ?? "",
      warungId,
    ]
  );
};

// ── Monitoring: Aktivitas Member (dari tabel logs) ────────────
export const readMemberActivity = async ({ tglDari, tglSampai, aksi, kode, limit = 500 } = {}, warungId = currentWarungId()) => {
  let sql = "SELECT ts, kode, nama, aksi, detail FROM logs WHERE warung_id = $1";
  const params = [warungId];
  if (tglDari)   { params.push(tglDari);   sql += ` AND (ts AT TIME ZONE 'Asia/Jakarta')::DATE >= $${params.length}::DATE`; }
  if (tglSampai) { params.push(tglSampai); sql += ` AND (ts AT TIME ZONE 'Asia/Jakarta')::DATE <= $${params.length}::DATE`; }
  if (aksi)      { params.push(aksi);      sql += ` AND aksi = $${params.length}`; }
  if (kode)      { params.push(kode);      sql += ` AND kode = $${params.length}`; }
  params.push(limit);
  sql += ` ORDER BY ts DESC LIMIT $${params.length}`;
  const res = await query(sql, params);
  return res.rows.map((r) => ({
    ts:     r.ts,
    kode:   r.kode   ?? "",
    nama:   r.nama   ?? "",
    aksi:   r.aksi   ?? "",
    detail: r.detail ?? "",
  }));
};

export const readTransaksiLog = async ({ tglDari, tglSampai, username, jenis, limit = 300 } = {}, warungId = currentWarungId()) => {
  let sql = "SELECT * FROM transaksi WHERE warung_id = $1 AND voided_at IS NULL";
  const params = [warungId];
  if (tglDari)   { params.push(tglDari);   sql += ` AND tanggal >= $${params.length}`; }
  if (tglSampai) { params.push(tglSampai); sql += ` AND tanggal <= $${params.length}`; }
  if (username)  { params.push(username);  sql += ` AND dicatat_oleh = $${params.length}`; }
  if (jenis)     { params.push(jenis);     sql += ` AND jenis = $${params.length}`; }
  params.push(limit);
  // Urut per hari pakai created_at (waktu nyata pencatatan), bukan jam (string jam-menit).
  // Kalau pakai jam, transaksi after-midnight (mis. 03:06) ke-sortir di BAWAH 23:49 padahal
  // tanggal bisnisnya sama — bikin seolah "hilang". Samakan dgn urutan Riwayat (createdAt desc).
  sql += ` ORDER BY tanggal DESC, created_at DESC NULLS LAST LIMIT $${params.length}`;
  const res = await query(sql, params);
  return res.rows.map((r) => ({
    id:          r.id,
    tanggal:     r.tanggal,
    jam:         r.jam         ?? "",
    jenis:       r.jenis,
    kategori:    r.kategori    ?? "",
    keterangan:  r.keterangan  ?? "",
    jumlah:      Number(r.jumlah),
    bayar:       r.bayar       ?? "",
    dicatatOleh: r.dicatat_oleh ?? "",
    createdAt:   r.created_at  ?? null,
  }));
};

// ── Biaya wajib (untuk Analisis Target) ──────────────────────
export const readFixedCosts = async (warungId = currentWarungId()) => {
  const res = await query(
    "SELECT id, nama, frekuensi, nominal, urutan FROM fixed_costs WHERE warung_id = $1 ORDER BY urutan ASC, id ASC",
    [warungId]
  );
  return res.rows.map((r) => ({
    id:        r.id,
    nama:      r.nama,
    frekuensi: r.frekuensi,
    nominal:   Number(r.nominal),
    urutan:    r.urutan ?? 0,
  }));
};

export const addFixedCost = async ({ nama, frekuensi, nominal }, warungId = currentWarungId()) => {
  const ur = await query("SELECT COALESCE(MAX(urutan), 0) + 1 AS u FROM fixed_costs WHERE warung_id = $1", [warungId]);
  const urutan = ur.rows[0].u || 1;
  await query(
    "INSERT INTO fixed_costs (nama, frekuensi, nominal, urutan, warung_id) VALUES ($1, $2, $3, $4, $5)",
    [nama, frekuensi, nominal, urutan, warungId]
  );
};

export const updateFixedCost = async (id, { nama, frekuensi, nominal }, warungId = currentWarungId()) => {
  await query(
    "UPDATE fixed_costs SET nama = $1, frekuensi = $2, nominal = $3 WHERE id = $4 AND warung_id = $5",
    [nama, frekuensi, nominal, parseInt(id), warungId]
  );
};

export const deleteFixedCost = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM fixed_costs WHERE id = $1 AND warung_id = $2", [parseInt(id), warungId]);
};

// ── App settings (KV sederhana) ───────────────────────────────
export const readSetting = async (key, fallback = null, warungId = currentWarungId()) => {
  const res = await query("SELECT value FROM app_settings WHERE key = $1 AND warung_id = $2", [key, warungId]);
  return res.rows.length ? res.rows[0].value : fallback;
};

export const writeSetting = async (key, value, warungId = currentWarungId()) => {
  await query(
    `INSERT INTO app_settings (key, value, updated_at, warung_id) VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (warung_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, String(value), warungId]
  );
};

// ── Planning / Roadmap Bisnis (wishlist items) ────────────────

const parseAttachments = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const VALID_TIPE = ["investasi", "hutang"];
const normalizeTipe = (t) => {
  const v = String(t || "").toLowerCase().trim();
  return VALID_TIPE.includes(v) ? v : "investasi";
};

const rowToPlanning = (row) => ({
  id:           row.id,
  nama:         row.nama,
  kategori:     row.kategori        ?? "lain",
  estimasi:     parseInt(row.estimasi) || 0,
  prioritas:    row.prioritas       ?? "nice",
  status:       row.status          ?? "idea",
  targetDate:   row.target_date     ?? "",
  vendor:       row.vendor          ?? "",
  catatan:      row.catatan         ?? "",
  roiEstimate:  parseInt(row.roi_estimate) || 0,
  savedAmount:  parseInt(row.saved_amount) || 0,
  attachments:  parseAttachments(row.attachments),
  tipe:         normalizeTipe(row.tipe),
  createdAt:    row.created_at,
  updatedAt:    row.updated_at,
});

const PLANNING_PRIORITAS_ORDER = "CASE prioritas WHEN 'urgent' THEN 1 WHEN 'penting' THEN 2 WHEN 'nice' THEN 3 ELSE 4 END";

export const readPlanningItems = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT * FROM planning_items WHERE warung_id = $1 ORDER BY ${PLANNING_PRIORITAS_ORDER}, created_at DESC`,
    [warungId]
  );
  return res.rows.map(rowToPlanning);
};

export const addPlanningItem = async (item, warungId = currentWarungId()) => {
  const id = item.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 7));
  await query(
    `INSERT INTO planning_items
     (id, nama, kategori, estimasi, prioritas, status, target_date, vendor, catatan, roi_estimate, saved_amount, attachments, tipe, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      (item.nama || "").trim().slice(0, 200),
      (item.kategori || "lain").slice(0, 30),
      parseInt(item.estimasi) || 0,
      (item.prioritas || "nice").slice(0, 20),
      (item.status || "idea").slice(0, 20),
      (item.targetDate || "").slice(0, 10),
      (item.vendor || "").trim().slice(0, 150),
      (item.catatan || "").trim().slice(0, 500),
      parseInt(item.roiEstimate) || 0,
      Math.max(0, parseInt(item.savedAmount) || 0),
      JSON.stringify(parseAttachments(item.attachments).slice(0, 10)),
      normalizeTipe(item.tipe),
      warungId,
    ]
  );
  return id;
};

// saved_amount tdk lagi update via form — sekarang derived dari sum(planning_payments
// where paid=true) via add/toggle/delete payment. Form cuma update field lain.
export const updatePlanningItem = async (id, item, warungId = currentWarungId()) => {
  await query(
    `UPDATE planning_items SET
       nama=$2, kategori=$3, estimasi=$4, prioritas=$5, status=$6,
       target_date=$7, vendor=$8, catatan=$9, roi_estimate=$10,
       attachments=$11, tipe=$12, updated_at=NOW()
     WHERE id=$1 AND warung_id=$13`,
    [
      id,
      (item.nama || "").trim().slice(0, 200),
      (item.kategori || "lain").slice(0, 30),
      parseInt(item.estimasi) || 0,
      (item.prioritas || "nice").slice(0, 20),
      (item.status || "idea").slice(0, 20),
      (item.targetDate || "").slice(0, 10),
      (item.vendor || "").trim().slice(0, 150),
      (item.catatan || "").trim().slice(0, 500),
      parseInt(item.roiEstimate) || 0,
      JSON.stringify(parseAttachments(item.attachments).slice(0, 10)),
      normalizeTipe(item.tipe),
      warungId,
    ]
  );
};

export const deletePlanningItem = async (id, warungId = currentWarungId()) => {
  // Cascade delete payments terlebih dulu
  await query("DELETE FROM planning_payments WHERE item_id = $1 AND warung_id = $2", [id, warungId]);
  await query("DELETE FROM planning_items WHERE id = $1 AND warung_id = $2", [id, warungId]);
};

// ── Planning Payments (cicilan/tanggungan history) ────────────

const rowToPayment = (row) => ({
  id:       row.id,
  itemId:   row.item_id,
  amount:   parseInt(row.amount) || 0,
  bulan:    row.bulan ?? "",
  catatan:  row.catatan ?? "",
  paid:     row.paid !== false,
  paidAt:   row.paid_at,
});

// Read all payments untuk satu item, atau semua kalau itemId null
export const readPlanningPayments = async (itemId = null, warungId = currentWarungId()) => {
  const res = itemId
    ? await query("SELECT * FROM planning_payments WHERE item_id = $1 AND warung_id = $2 ORDER BY bulan ASC, paid_at ASC", [itemId, warungId])
    : await query("SELECT * FROM planning_payments WHERE warung_id = $1 ORDER BY bulan ASC, paid_at ASC", [warungId]);
  return res.rows.map(rowToPayment);
};

export const addPlanningPayment = async (p, warungId = currentWarungId()) => {
  const id = p.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 7));
  const amt = Math.max(0, parseInt(p.amount) || 0);
  const itemId = (p.itemId || "").trim();
  if (!itemId || amt <= 0) throw new Error("itemId & amount > 0 wajib");
  const isPaid = p.paid !== false; // default true utk backward compat
  await query(
    `INSERT INTO planning_payments (id, item_id, amount, bulan, catatan, paid, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id, itemId, amt,
      (p.bulan || "").slice(0, 7),
      (p.catatan || "").trim().slice(0, 300),
      isPaid,
      warungId,
    ]
  );
  // Bump saved_amount hanya kalau status paid=true
  if (isPaid) {
    await query(
      `UPDATE planning_items SET saved_amount = saved_amount + $1, updated_at = NOW() WHERE id = $2 AND warung_id = $3`,
      [amt, itemId, warungId]
    );
  }
  return id;
};

// Toggle status paid/unpaid sebuah pembayaran; sesuaikan saved_amount parent item
export const togglePlanningPayment = async (id, newPaid, warungId = currentWarungId()) => {
  const r = await query("SELECT item_id, amount, paid FROM planning_payments WHERE id = $1 AND warung_id = $2", [id, warungId]);
  if (!r.rows.length) return;
  const { item_id, amount, paid } = r.rows[0];
  const wasPaid = paid !== false;
  const want = !!newPaid;
  if (wasPaid === want) return; // no-op kalau status sama
  await query("UPDATE planning_payments SET paid = $2, paid_at = CASE WHEN $2 THEN NOW() ELSE paid_at END WHERE id = $1 AND warung_id = $3", [id, want, warungId]);
  const amt = parseInt(amount) || 0;
  if (want && !wasPaid) {
    await query(
      `UPDATE planning_items SET saved_amount = saved_amount + $1, updated_at = NOW() WHERE id = $2 AND warung_id = $3`,
      [amt, item_id, warungId]
    );
  } else if (!want && wasPaid) {
    await query(
      `UPDATE planning_items SET saved_amount = GREATEST(0, saved_amount - $1), updated_at = NOW() WHERE id = $2 AND warung_id = $3`,
      [amt, item_id, warungId]
    );
  }
};

export const deletePlanningPayment = async (id, warungId = currentWarungId()) => {
  const r = await query("SELECT item_id, amount, paid FROM planning_payments WHERE id = $1 AND warung_id = $2", [id, warungId]);
  if (!r.rows.length) return;
  const { item_id, amount, paid } = r.rows[0];
  await query("DELETE FROM planning_payments WHERE id = $1 AND warung_id = $2", [id, warungId]);
  // Kurangi saved_amount cuma kalau row yg dihapus statusnya paid
  if (paid !== false) {
    await query(
      `UPDATE planning_items SET saved_amount = GREATEST(0, saved_amount - $1), updated_at = NOW() WHERE id = $2 AND warung_id = $3`,
      [parseInt(amount) || 0, item_id, warungId]
    );
  }
};

// Hapus semua entries unpaid (scheduled) utk satu item — dipakai saat
// regenerate rencana cicilan supaya gak duplicate. Entries paid tetap aman.
// Gak perlu adjust saved_amount karena rows unpaid memang gak nyumbang.
export const deleteUnpaidPlanningPayments = async (itemId, warungId = currentWarungId()) => {
  if (!itemId) return;
  await query("DELETE FROM planning_payments WHERE item_id = $1 AND warung_id = $2 AND paid = FALSE", [itemId, warungId]);
};

// Hapus SEMUA entries (paid + unpaid) utk satu item & reset saved_amount.
// Dipakai saat user regenerate plan dgn clean-slate behavior — semua history
// pembayaran hilang, mulai dari nol.
export const wipeAllPlanningPayments = async (itemId, warungId = currentWarungId()) => {
  if (!itemId) return;
  await query("DELETE FROM planning_payments WHERE item_id = $1 AND warung_id = $2", [itemId, warungId]);
  await query("UPDATE planning_items SET saved_amount = 0, updated_at = NOW() WHERE id = $1 AND warung_id = $2", [itemId, warungId]);
};

// ── Planning Goals (Anggaran / Tabungan) ──────────────────────

const rowToGoal = (row) => ({
  id:             row.id,
  nama:           row.nama,
  targetAmount:   parseInt(row.target_amount)  || 0,
  currentAmount:  parseInt(row.current_amount) || 0,
  autoPercent:    parseInt(row.auto_percent)   || 0,
  source:         row.source         ?? "laba",
  status:         row.status         ?? "active",
  linkedItemId:   row.linked_item_id ?? null,
  targetDate:     row.target_date    ?? "",
  catatan:        row.catatan        ?? "",
  createdAt:      row.created_at,
  updatedAt:      row.updated_at,
});

export const readPlanningGoals = async (warungId = currentWarungId()) => {
  const res = await query(
    `SELECT * FROM planning_goals
     WHERE warung_id = $1
     ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END,
              created_at DESC`,
    [warungId]
  );
  return res.rows.map(rowToGoal);
};

export const addPlanningGoal = async (g, warungId = currentWarungId()) => {
  const id = g.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 7));
  await query(
    `INSERT INTO planning_goals
     (id, nama, target_amount, current_amount, auto_percent, source, status, linked_item_id, target_date, catatan, warung_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      (g.nama || "").trim().slice(0, 200),
      parseInt(g.targetAmount)  || 0,
      parseInt(g.currentAmount) || 0,
      Math.max(0, Math.min(100, parseInt(g.autoPercent) || 0)),
      (g.source || "laba").slice(0, 20),
      (g.status || "active").slice(0, 20),
      (g.linkedItemId || "").trim() || null,
      (g.targetDate || "").slice(0, 10),
      (g.catatan || "").trim().slice(0, 500),
      warungId,
    ]
  );
  return id;
};

export const updatePlanningGoal = async (id, g, warungId = currentWarungId()) => {
  await query(
    `UPDATE planning_goals SET
       nama=$2, target_amount=$3, auto_percent=$4, source=$5, status=$6,
       linked_item_id=$7, target_date=$8, catatan=$9, updated_at=NOW()
     WHERE id=$1 AND warung_id=$10`,
    [
      id,
      (g.nama || "").trim().slice(0, 200),
      parseInt(g.targetAmount) || 0,
      Math.max(0, Math.min(100, parseInt(g.autoPercent) || 0)),
      (g.source || "laba").slice(0, 20),
      (g.status || "active").slice(0, 20),
      (g.linkedItemId || "").trim() || null,
      (g.targetDate || "").slice(0, 10),
      (g.catatan || "").trim().slice(0, 500),
      warungId,
    ]
  );
};

// Tambah deposit ke goal (current_amount += amount). Auto-mark completed
// kalau current >= target.
export const addGoalDeposit = async (id, amount, warungId = currentWarungId()) => {
  const amt = parseInt(amount) || 0;
  if (amt <= 0) return;
  await query(
    `UPDATE planning_goals
     SET current_amount = current_amount + $2,
         status = CASE WHEN current_amount + $2 >= target_amount THEN 'completed' ELSE status END,
         updated_at = NOW()
     WHERE id = $1 AND warung_id = $3`,
    [id, amt, warungId]
  );
};

export const deletePlanningGoal = async (id, warungId = currentWarungId()) => {
  await query("DELETE FROM planning_goals WHERE id = $1 AND warung_id = $2", [id, warungId]);
};
