// src/routes/scan.js
// ── Routes: /scan dan /checkin ────────────────────────────────

import { Router } from "express";
import { readDB, saveMember, appendLog, findMember, findMemberIndex } from "../utils/db.js";
import { pinPage, resultPage } from "../views/member.js";
import { formatJam, selisihHari } from "../utils/format.js";
import { CONFIG } from "../config.js";

const router = Router();

// ── GET /scan?id=:kode — tampilkan form PIN kasir ─────────────
router.get("/scan", async (req, res) => {
  const kode = (req.query.id ?? "").trim().toUpperCase();

  if (!kode) {
    return res.send(resultPage("error", {
      judul: "QR Tidak Valid",
      pesan: "QR code ini tidak mengandung kode member. Hubungi kasir.",
    }));
  }

  try {
    const { members } = await readDB();
    const member = findMember(members, kode);

    if (!member) {
      return res.send(resultPage("error", {
        judul: "Member Tidak Ditemukan",
        pesan: `Kode "${kode}" tidak terdaftar. Hubungi kasir.`,
      }));
    }

    res.send(pinPage(kode, member.nama));
  } catch (err) {
    console.error("[SCAN] readDB error:", err.message);
    res.status(500).send(resultPage("error", {
      judul: "Kesalahan Server",
      pesan: "Gagal memuat data. Coba lagi.",
    }));
  }
});

// ── POST /checkin — verifikasi PIN lalu proses check-in ───────
router.post("/checkin", async (req, res) => {
  const kode = (req.body.id ?? "").trim().toUpperCase();
  const pin  = (req.body.pin ?? "").trim();

  try {
    // PIN salah
    if (pin !== CONFIG.KASIR_PIN) {
      const { members } = await readDB();
      const member = findMember(members, kode);
      return res.send(pinPage(kode, member?.nama ?? kode, "PIN salah. Coba lagi."));
    }

    const { members } = await readDB();
    const idx = findMemberIndex(members, kode);

    if (idx === -1) {
      return res.send(resultPage("error", {
        judul: "Member Tidak Ditemukan",
        pesan: "Kode tidak ditemukan.",
      }));
    }

    const m     = { ...members[idx] };
    const today = new Date();

    // Case: sudah scan hari ini
    if (m.sudahScanHariIni && m.tanggalScanTerakhir) {
      return res.send(resultPage("sudahScan", {
        nama:      m.nama,
        judul:     "Sudah Check-in Hari Ini",
        pesan:     "",
        totalMain: m.totalMain,
        kode,
        jamScan:   formatJam(m.tanggalScanTerakhir),
      }));
    }

    let expired = false;

    // Case: expired 30 hari
    if (m.tanggalMulai) {
      if (selisihHari(m.tanggalMulai, today) >= CONFIG.BATAS_HARI) {
        expired        = true;
        m.totalMain    = 0;
        m.tanggalMulai = today.toISOString();
      }
    } else {
      m.tanggalMulai = today.toISOString();
    }

    // +1 kunjungan
    m.totalMain          += 1;
    m.sudahScanHariIni    = true;
    m.tanggalScanTerakhir = today.toISOString();

    // Case: 10x → gratis + reset
    if (m.totalMain >= CONFIG.BATAS_MAIN) {
      m.totalGratis  = (m.totalGratis ?? 0) + 1;
      m.status       = "GRATIS";
      m.tanggalMulai = today.toISOString();
      const totalGratis = m.totalGratis;
      const tn          = m.totalMain;
      m.totalMain       = 0;

      await saveMember(m);
      await appendLog(kode, m.nama, "REWARD_GRATIS", `Reward ke-${totalGratis}`);

      return res.send(resultPage("gratis", {
        nama: m.nama, judul: "Selamat! Main Gratis!",
        pesan: `Kamu sudah main ${tn}x! Main berikutnya GRATIS.`,
        totalGratis, kode,
      }));
    }

    m.status = "-";
    await saveMember(m);
    await appendLog(kode, m.nama, expired ? "SCAN_RESET" : "SCAN", `Kunjungan ke-${m.totalMain}`);

    res.send(resultPage("sukses", {
      nama:      m.nama,
      judul:     "Check-in Berhasil!",
      pesan:     expired ? "Periode bonus direset. Kunjungan ke-1 periode baru!" : "",
      totalMain: m.totalMain,
      kode,
      expired,
    }));

  } catch (err) {
    console.error("[CHECKIN] error:", err.message);
    res.status(500).send(resultPage("error", {
      judul: "Kesalahan Server",
      pesan: "Gagal memproses check-in. Coba lagi.",
    }));
  }
});

export default router;
