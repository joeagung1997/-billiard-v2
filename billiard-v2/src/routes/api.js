// src/routes/api.js
// ── REST API v1 — JSON endpoints ─────────────────────────────

import { Router } from "express";
import {
  readDB, readLog, readTransaksi, readKategori,
  saveMember, deleteMember, createMember, findMember, findMemberIndex,
  appendLog, appendTransaksi, voidTransaksi,
  addKategori, deleteKategori, checkBonusExpiry,
} from "../utils/db.js";
import { requireApiAuth, signToken } from "../middleware/apiAuth.js";
import { CONFIG }         from "../config.js";
import {
  generateKode, normalizeTelepon, formatTeleponDisplay,
  validateTelepon, selisihHari, formatJam, KAT_TUKAR_UANG,
} from "../utils/format.js";
import { buildScanUrl, qrBuffer } from "../utils/qr.js";
import { uploadQrToCloudinary }  from "./share.js";

const router = Router();

// ── Helper response ───────────────────────────────────────────
const ok  = (res, data, code = 200) => res.status(code).json({ success: true,  ...data });
const err = (res, message, code = 400) => res.status(code).json({ success: false, message });

// ── POST /api/v1/auth — login, dapat JWT ─────────────────────
router.post("/auth", (req, res) => {
  const { role, pin } = req.body ?? {};

  if (!role || !pin) return err(res, "Field 'role' dan 'pin' wajib diisi.");

  const validRole =
    (role === "admin"   && pin === CONFIG.ADMIN_PIN)   ? "admin"   :
    (role === "finance" && pin === CONFIG.FINANCE_PIN) ? "finance" : null;

  if (!validRole) return err(res, "PIN salah atau role tidak valid.", 401);

  const token = signToken({ role: validRole });
  return ok(res, { token, role: validRole, expiresIn: CONFIG.JWT_EXPIRES });
});

// ── GET /api/v1/members — daftar semua member ─────────────────
router.get("/members", requireApiAuth(["admin"]), async (req, res) => {
  try {
    await checkBonusExpiry();
    const { members } = await readDB();
    const { q = "", status = "", bulan = "" } = req.query;

    let data = members;

    if (q) {
      const qLow = q.toLowerCase();
      data = data.filter((m) =>
        `${m.nama}${m.kode}${m.telepon}`.toLowerCase().includes(qLow)
      );
    }

    if (status === "aktif")    data = data.filter((m) => m.aktif);
    if (status === "nonaktif") data = data.filter((m) => !m.aktif);
    if (status === "bonus")    data = data.filter((m) => m.status === "BONUS" || m.status === "GRATIS");

    if (bulan) {
      data = data.filter((m) =>
        m.tanggalDaftar &&
        new Date(m.tanggalDaftar).toISOString().slice(0, 7) === bulan
      );
    }

    return ok(res, { total: data.length, data });
  } catch (e) {
    console.error("[API] GET /members:", e.message);
    return err(res, "Gagal memuat data member.", 500);
  }
});

// ── POST /api/v1/members — tambah member ─────────────────────
router.post("/members", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const { nama, telepon = "" } = req.body ?? {};
    if (!nama?.trim()) return err(res, "Field 'nama' wajib diisi.");

    if (telepon && !validateTelepon(telepon)) {
      return err(res, "Format telepon tidak valid. Gunakan format 08xx atau +62xx.");
    }

    const { members } = await readDB();
    const kode      = generateKode(members);
    const teleponFmt = telepon ? formatTeleponDisplay(normalizeTelepon(telepon)) : "";
    const newMember = createMember(kode, nama.trim(), teleponFmt);

    await saveMember(newMember);
    await appendLog(kode, newMember.nama, "DAFTAR_MEMBER", "Member baru via API");

    // Upload QR ke Cloudinary (best-effort)
    try {
      const scanUrl = buildScanUrl(req, kode);
      const qrBuf   = await qrBuffer(scanUrl, 520);
      await uploadQrToCloudinary(kode, qrBuf);
    } catch (_) {}

    return ok(res, { data: newMember }, 201);
  } catch (e) {
    console.error("[API] POST /members:", e.message);
    return err(res, "Gagal membuat member.", 500);
  }
});

// ── GET /api/v1/members/:kode — detail member ─────────────────
router.get("/members/:kode", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const kode = req.params.kode.toUpperCase();
    const { members } = await readDB();
    const m = findMember(members, kode);
    if (!m) return err(res, `Member '${kode}' tidak ditemukan.`, 404);
    return ok(res, { data: m });
  } catch (e) {
    console.error("[API] GET /members/:kode:", e.message);
    return err(res, "Gagal memuat data.", 500);
  }
});

// ── PUT /api/v1/members/:kode — update member ─────────────────
router.put("/members/:kode", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const kode = req.params.kode.toUpperCase();
    const { nama, telepon } = req.body ?? {};

    if (!nama?.trim()) return err(res, "Field 'nama' wajib diisi.");
    if (telepon && !validateTelepon(telepon)) {
      return err(res, "Format telepon tidak valid.");
    }

    const { members } = await readDB();
    const idx = findMemberIndex(members, kode);
    if (idx === -1) return err(res, `Member '${kode}' tidak ditemukan.`, 404);

    const m = { ...members[idx] };
    m.nama    = nama.trim();
    if (telepon) m.telepon = formatTeleponDisplay(normalizeTelepon(telepon));

    await saveMember(m);
    return ok(res, { data: m });
  } catch (e) {
    console.error("[API] PUT /members/:kode:", e.message);
    return err(res, "Gagal update member.", 500);
  }
});

// ── DELETE /api/v1/members/:kode — hapus member ───────────────
router.delete("/members/:kode", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const kode = req.params.kode.toUpperCase();
    const { members } = await readDB();
    const m = findMember(members, kode);
    if (!m) return err(res, `Member '${kode}' tidak ditemukan.`, 404);

    await deleteMember(kode);
    await appendLog(kode, m.nama, "HAPUS", "Dihapus via API");
    return ok(res, { message: `Member '${kode}' berhasil dihapus.` });
  } catch (e) {
    console.error("[API] DELETE /members/:kode:", e.message);
    return err(res, "Gagal hapus member.", 500);
  }
});

// ── POST /api/v1/members/:kode/klaim — klaim bonus ───────────
router.post("/members/:kode/klaim", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const kode = req.params.kode.toUpperCase();
    const { members } = await readDB();
    const idx = findMemberIndex(members, kode);
    if (idx === -1) return err(res, `Member '${kode}' tidak ditemukan.`, 404);

    const m = { ...members[idx] };
    if (m.status !== "BONUS" && m.status !== "GRATIS") {
      return err(res, `Status member saat ini '${m.status}'. Hanya bisa klaim jika status BONUS atau GRATIS.`);
    }

    m.totalGratis  = (m.totalGratis ?? 0) + 1;
    m.totalMain    = 0;
    m.tanggalMulai = new Date().toISOString();
    m.status       = "-";
    m.bonusEarnedAt = null;

    await saveMember(m);
    await appendLog(kode, m.nama, "BONUS_KLAIM", `Reward ke-${m.totalGratis} diklaim via API`);

    return ok(res, {
      message:     `Bonus ke-${m.totalGratis} berhasil diklaim. Progress direset ke 0.`,
      totalGratis: m.totalGratis,
    });
  } catch (e) {
    console.error("[API] POST /members/:kode/klaim:", e.message);
    return err(res, "Gagal klaim bonus.", 500);
  }
});

// ── POST /api/v1/checkin — check-in member (tanpa JWT) ────────
router.post("/checkin", async (req, res) => {
  const { kode: kodeRaw, kasirPin, durasi: durasiBody } = req.body ?? {};
  const kode = (kodeRaw ?? "").trim().toUpperCase();
  // Durasi main (jam): kelipatan 2 (2/4/6/8). Point = durasi/2.
  const durasiRaw  = parseInt(durasiBody ?? "2", 10);
  const durasi     = [2, 4, 6, 8].includes(durasiRaw) ? durasiRaw : 2;
  const pointDapat = durasi / 2;

  if (!kode || !kasirPin) return err(res, "Field 'kode' dan 'kasirPin' wajib diisi.");
  if (kasirPin !== CONFIG.KASIR_PIN) return err(res, "PIN kasir salah.", 401);

  try {
    const { members } = await readDB();
    const idx = findMemberIndex(members, kode);
    if (idx === -1) return err(res, `Member '${kode}' tidak ditemukan.`, 404);

    const m     = { ...members[idx] };
    const today = new Date();

    // Sudah scan hari ini
    if (m.sudahScanHariIni && m.tanggalScanTerakhir) {
      return ok(res, {
        result:    "sudahScan",
        nama:      m.nama,
        totalMain: m.totalMain,
        status:    m.status,
        message:   `${m.nama} sudah check-in hari ini pukul ${formatJam(m.tanggalScanTerakhir)}.`,
      });
    }

    let expired = false;
    // Expired: gap ≥ BATAS_HARI sejak check-in terakhir (bukan dari
    // tanggalMulai). Member yg balik setelah vakum panjang → reset,
    // tanggal kembali jadi titik nol siklus baru.
    if (m.tanggalScanTerakhir) {
      if (selisihHari(m.tanggalScanTerakhir, today) >= CONFIG.BATAS_HARI) {
        expired        = true;
        m.totalMain    = 0;
        m.tanggalMulai = today.toISOString();
      }
    } else {
      m.tanggalMulai = today.toISOString();
    }

    m.totalMain          += 1;
    m.totalPoint          = (m.totalPoint ?? 0) + pointDapat;
    m.sudahScanHariIni    = true;
    m.tanggalScanTerakhir = today.toISOString();

    // Bonus earned
    if (m.totalMain >= CONFIG.BATAS_MAIN) {
      m.status        = "BONUS";
      m.bonusEarnedAt = today.toISOString();
      await saveMember(m);
      await appendLog(kode, m.nama, "BONUS_EARNED", `Bonus earned setelah ${m.totalMain} sesi · ${durasi} jam · +${pointDapat} point (via API)`);
      return ok(res, {
        result:      "gratis",
        nama:        m.nama,
        totalMain:   m.totalMain,
        totalPoint:  m.totalPoint,
        totalGratis: m.totalGratis ?? 0,
        durasi,
        pointDapat,
        status:      m.status,
        message:     `Selamat ${m.nama}! Bonus kamu siap diklaim ke kasir. 🎁`,
      });
    }

    m.status = "-";
    await saveMember(m);
    await appendLog(kode, m.nama, expired ? "SCAN_RESET" : "SCAN", `Kunjungan ke-${m.totalMain} · ${durasi} jam · +${pointDapat} point (via API)`);

    return ok(res, {
      result:    "sukses",
      nama:      m.nama,
      totalMain: m.totalMain,
      totalPoint: m.totalPoint,
      durasi,
      pointDapat,
      status:    m.status,
      expired,
      message:   expired
        ? `Check-in berhasil! Periode baru dimulai. Kunjungan ke-1 · main ${durasi} jam, dapet ${pointDapat} point.`
        : `Check-in berhasil! Kunjungan ke-${m.totalMain} dari ${CONFIG.BATAS_MAIN} · main ${durasi} jam, dapet ${pointDapat} point.`,
    });
  } catch (e) {
    console.error("[API] POST /checkin:", e.message);
    return err(res, "Gagal memproses check-in.", 500);
  }
});

// ── GET /api/v1/transaksi — daftar transaksi ──────────────────
router.get("/transaksi", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    const { jenis = "", bulan = "", limit = "100" } = req.query;
    let data = await readTransaksi();

    if (jenis) data = data.filter((t) => t.jenis === jenis);
    if (bulan) data = data.filter((t) => t.tanggal.startsWith(bulan));

    const maxRows = Math.min(parseInt(limit) || 100, 1000);
    data = data.slice(0, maxRows);

    // Exclude kategori "Tukar Uang" (internal transfer, bukan revenue).
    const totalPemasukan   = data.filter((t) => t.jenis === "pemasukan"   && t.kategori !== KAT_TUKAR_UANG).reduce((s, t) => s + t.jumlah, 0);
    const totalPengeluaran = data.filter((t) => t.jenis === "pengeluaran" && t.kategori !== KAT_TUKAR_UANG).reduce((s, t) => s + t.jumlah, 0);

    return ok(res, {
      total: data.length,
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
      data,
    });
  } catch (e) {
    console.error("[API] GET /transaksi:", e.message);
    return err(res, "Gagal memuat transaksi.", 500);
  }
});

// ── POST /api/v1/transaksi — tambah transaksi ─────────────────
router.post("/transaksi", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    const { jenis, tanggal, jam = "", waktu = "siang", kategori, keterangan = "", jumlah } = req.body ?? {};

    if (!jenis || !tanggal || !kategori || !jumlah) {
      return err(res, "Field 'jenis', 'tanggal', 'kategori', 'jumlah' wajib diisi.");
    }
    if (!["pemasukan", "pengeluaran"].includes(jenis)) {
      return err(res, "Field 'jenis' harus 'pemasukan' atau 'pengeluaran'.");
    }
    const jumlahNum = parseInt(jumlah);
    if (!jumlahNum || jumlahNum <= 0) return err(res, "Field 'jumlah' harus angka positif.");

    const item = {
      id:         Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tanggal:    tanggal.slice(0, 10),
      jam:        jam.slice(0, 5),
      jenis,
      waktu:      ["siang", "malam"].includes(waktu) ? waktu : "siang",
      kategori:   kategori.trim(),
      keterangan: keterangan.trim().slice(0, 200),
      jumlah:     jumlahNum,
      createdAt:  new Date().toISOString(),
    };

    await appendTransaksi(item);
    return ok(res, { data: item }, 201);
  } catch (e) {
    console.error("[API] POST /transaksi:", e.message);
    return err(res, "Gagal menyimpan transaksi.", 500);
  }
});

// Transaksi sekarang immutable — tidak ada PUT (edit) atau DELETE (hard delete).
// Untuk koreksi, void transaksi yg salah lalu POST transaksi baru yg benar.

// ── POST /api/v1/transaksi/:id/void — soft void transaksi ─────────
router.post("/transaksi/:id/void", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason ?? "").trim();

    if (!reason) return err(res, "Field 'reason' wajib diisi (alasan pembatalan).");

    const semua = await readTransaksi();
    const t = semua.find((x) => x.id === id);
    if (!t) return err(res, `Transaksi '${id}' tidak ditemukan.`, 404);
    if (t.voidedAt) return err(res, `Transaksi '${id}' sudah dibatalkan sebelumnya.`, 409);

    const ok2 = await voidTransaksi(id, reason);
    if (!ok2) return err(res, "Gagal void transaksi.", 500);
    return ok(res, { message: `Transaksi '${id}' berhasil dibatalkan.`, reason });
  } catch (e) {
    console.error("[API] POST /transaksi/:id/void:", e.message);
    return err(res, "Gagal void transaksi.", 500);
  }
});

// ── PUT/DELETE /transaksi/:id — DEPRECATED (transaksi immutable) ──
router.put("/transaksi/:id", requireApiAuth(["finance", "admin"]), (_req, res) =>
  err(res, "Transaksi tidak boleh di-edit. Gunakan POST /transaksi/:id/void lalu POST /transaksi untuk koreksi.", 405)
);
router.delete("/transaksi/:id", requireApiAuth(["finance", "admin"]), (_req, res) =>
  err(res, "Hard delete tidak diizinkan. Gunakan POST /transaksi/:id/void.", 405)
);

// ── GET /api/v1/kategori ─────────────────────────────────────
router.get("/kategori", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    let data = await readKategori();
    if (req.query.jenis) data = data.filter((k) => k.jenis === req.query.jenis);
    return ok(res, { data });
  } catch (e) {
    return err(res, "Gagal memuat kategori.", 500);
  }
});

// ── POST /api/v1/kategori ────────────────────────────────────
router.post("/kategori", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    const { nama, jenis } = req.body ?? {};
    if (!nama?.trim()) return err(res, "Field 'nama' wajib diisi.");
    if (!["pemasukan", "pengeluaran"].includes(jenis)) {
      return err(res, "Field 'jenis' harus 'pemasukan' atau 'pengeluaran'.");
    }
    await addKategori(nama.trim(), jenis);
    return ok(res, { message: "Kategori berhasil ditambah." }, 201);
  } catch (e) {
    return err(res, "Gagal menambah kategori.", 500);
  }
});

// ── DELETE /api/v1/kategori/:id ──────────────────────────────
router.delete("/kategori/:id", requireApiAuth(["finance", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return err(res, "ID kategori tidak valid.");
    await deleteKategori(id);
    return ok(res, { message: "Kategori berhasil dihapus." });
  } catch (e) {
    return err(res, "Gagal hapus kategori.", 500);
  }
});

// ── GET /api/v1/dashboard — statistik ────────────────────────
router.get("/dashboard", requireApiAuth(["admin"]), async (req, res) => {
  try {
    await checkBonusExpiry();
    const { members } = await readDB();
    const transaksi    = await readTransaksi();

    const curBulan = new Date().toISOString().slice(0, 7);

    const totalMember       = members.length;
    const memberAktif       = members.filter((m) => m.aktif).length;
    const memberBonus       = members.filter((m) => m.status === "BONUS" || m.status === "GRATIS").length;
    const scanHariIni       = members.filter((m) => m.sudahScanHariIni).length;
    const memberBaru        = members.filter((m) =>
      m.tanggalDaftar && new Date(m.tanggalDaftar).toISOString().startsWith(curBulan)
    ).length;
    // Exclude kategori "Tukar Uang" (internal transfer, bukan revenue).
    const totalPemasukan    = transaksi.filter((t) => t.jenis === "pemasukan"   && t.kategori !== KAT_TUKAR_UANG).reduce((s, t) => s + t.jumlah, 0);
    const totalPengeluaran  = transaksi.filter((t) => t.jenis === "pengeluaran" && t.kategori !== KAT_TUKAR_UANG).reduce((s, t) => s + t.jumlah, 0);

    return ok(res, {
      data: {
        totalMember, memberAktif, memberBonus,
        scanHariIni, memberBaru,
        totalPemasukan, totalPengeluaran,
        saldo: totalPemasukan - totalPengeluaran,
      },
    });
  } catch (e) {
    console.error("[API] GET /dashboard:", e.message);
    return err(res, "Gagal memuat dashboard.", 500);
  }
});

// ── GET /api/v1/logs — log kunjungan ─────────────────────────
router.get("/logs", requireApiAuth(["admin"]), async (req, res) => {
  try {
    const { limit = "50", kode = "", aksi = "" } = req.query;
    let data = await readLog();

    if (kode) data = data.filter((l) => l.kode.toUpperCase() === kode.toUpperCase());
    if (aksi) data = data.filter((l) => l.aksi === aksi.toUpperCase());

    const maxRows = Math.min(parseInt(limit) || 50, 500);
    data = data.slice(0, maxRows);

    return ok(res, { total: data.length, data });
  } catch (e) {
    console.error("[API] GET /logs:", e.message);
    return err(res, "Gagal memuat logs.", 500);
  }
});

export default router;
