// src/views/member.js
// ── HTML views untuk halaman member (scan, PIN, hasil) ────────

import { CONFIG, getTip } from "../config.js";
import { formatTanggal } from "../utils/format.js";

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{border-radius:24px;padding:28px 22px;max-width:360px;width:100%;text-align:center}
  .arena-tag{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px}
  .member-name{font-size:22px;font-weight:700;margin-bottom:8px}
  .pesan{font-size:13px;line-height:1.65;margin-bottom:14px}
  .ball-row{display:flex;justify-content:center;flex-wrap:wrap;gap:5px;margin-bottom:8px}
  .ball{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
  .bar{height:7px;border-radius:4px;margin-bottom:5px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px}
  .bar-txt{font-size:11px;margin-bottom:12px}
  .tip-box{border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.6;text-align:left;margin-bottom:12px}
  .tip-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
  .kode-badge{font-size:10px;font-family:monospace;margin-top:12px;opacity:.4}
  .time-txt{font-size:10px;margin-top:6px;opacity:.3}
  input[type=password]{width:100%;padding:14px;border:1.5px solid;border-radius:12px;font-size:28px;text-align:center;letter-spacing:.5em;outline:none;font-family:monospace;margin-bottom:12px;background:transparent}
  button[type=submit]{width:100%;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.04em}
  button[type=submit]:active{opacity:.85;transform:scale(.98)}
`;

// ── Halaman PIN kasir ─────────────────────────────────────────

export const pinPage = (kode, nama, errorMsg = null) => `
<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${CONFIG.NAMA_ARENA}</title>
<style>${BASE_CSS}
  body{background:#0a0f1a}
  .card{background:#0f1829;border:1px solid #1e2d45}
  .arena-tag{color:#3b82f6}
  .member-name{color:#e2e8f0}
  .pesan{color:#64748b}
  .tip-box{background:#1e293b;color:#94a3b8;border:1px solid #1e3a5f}
  .tip-label{color:#3b82f6}
  input[type=password]{border-color:#1e3a5f;color:#e2e8f0;background:#0d1b2e}
  input[type=password]:focus{border-color:#3b82f6}
  button[type=submit]{background:#2563eb;color:#fff}
  .kode-badge{color:#3b82f6}
  ${errorMsg ? ".err{background:#1f0a0a;color:#f87171;border:1px solid #7f1d1d;border-radius:10px;padding:8px 12px;font-size:12px;margin-bottom:12px}" : ""}
</style>
</head><body><div class="card">
<div class="arena-tag">${CONFIG.NAMA_ARENA}</div>
<div style="font-size:36px;margin-bottom:10px">🔐</div>
<div style="font-size:17px;font-weight:700;color:#60a5fa;margin-bottom:4px">Konfirmasi Check-in</div>
<div class="member-name">${nama}</div>
<p class="pesan" style="margin-bottom:14px">Kasir: masukkan PIN untuk<br>konfirmasi kehadiran member.</p>
${errorMsg ? `<div class="err">${errorMsg}</div>` : ""}
<form action="/checkin" method="POST">
  <input type="hidden" name="id" value="${kode}">
  <input type="password" name="pin" placeholder="••••" maxlength="8" autofocus autocomplete="off">
  <button type="submit">Konfirmasi Check-in</button>
</form>
<div class="tip-box" style="margin-top:14px">
  <div class="tip-label">Info</div>
  Hanya kasir yang bisa konfirmasi check-in. Member cukup tunjukkan QR.
</div>
<div class="kode-badge">${kode}</div>
</div></body></html>`;

// ── Halaman hasil check-in ────────────────────────────────────

const THEME = {
  sukses:    { bg:"#E1F5EE", accent:"#1D9E75", dark:"#085041", icon:"✓",  bodyBg:"#0a1a0f" },
  gratis:    { bg:"#0d0d0d", accent:"#3B6D11", dark:"#173404", icon:"🏆", bodyBg:"#0d0d0d" },
  sudahScan: { bg:"#FAEEDA", accent:"#BA7517", dark:"#412402", icon:"⏰", bodyBg:"#1a1208" },
  error:     { bg:"#FCEBEB", accent:"#E24B4A", dark:"#501313", icon:"❌", bodyBg:"#1a0a0a" },
};

const buildDots = (totalMain, batasMain, accent, dark, bg) => {
  return Array.from({ length: batasMain }, (_, i) => {
    const n = i + 1;
    if (n === batasMain)   return `<div class="ball" style="background:#854d0e;color:#fef08a;font-size:9px">FREE</div>`;
    if (n < totalMain)     return `<div class="ball" style="background:${accent};color:#fff">${n}</div>`;
    if (n === totalMain)   return `<div class="ball" style="background:${dark};color:#fff;box-shadow:0 0 0 3px ${bg}">${n}</div>`;
    return `<div class="ball" style="background:#1a2e1e;color:#2d4a30">${n}</div>`;
  }).join("");
};

export const resultPage = (tipe, data) => {
  const { bg, accent, dark, icon, bodyBg } = THEME[tipe] ?? THEME.error;
  const {
    nama = "", judul = "", pesan = "",
    totalMain = 0, totalGratis = 0, kode = "",
    expired = false, jamScan = "",
  } = data;

  const tm     = totalMain;
  const sisa   = Math.max(0, CONFIG.BATAS_MAIN - tm);
  const persen = Math.min(Math.round(tm / CONFIG.BATAS_MAIN * 100), 100);
  const dots   = buildDots(tm, CONFIG.BATAS_MAIN, accent, dark, bg);
  const now    = formatTanggal(new Date());

  // ── Sukses ───────────────────────────────────────────────────
  if (tipe === "sukses") return `
<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${CONFIG.NAMA_ARENA}</title>
<style>${BASE_CSS}
  body{background:#0a1a0f}
  .card{background:#0d1b12;border:1px solid #1a3320}
  .arena-tag{color:#4ade80}
  .member-name{color:#fff}
  .pesan{color:#4ade80}
  .prog-box{background:#1a2e1e;border-radius:12px;padding:12px 14px;margin-bottom:12px}
  .prog-label{font-size:10px;font-weight:700;color:#4ade80;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
  .tip-box{background:#1a2e1e;color:#86efac;border:1px solid #1a3a20}
  .tip-label{color:#4ade80}
  .kode-badge{color:#4ade80}
  .time-txt{color:#4ade80}
</style>
</head><body><div class="card">
<div class="arena-tag">${CONFIG.NAMA_ARENA}</div>
<div style="font-size:38px;margin-bottom:8px">🎱</div>
<div style="font-size:18px;font-weight:700;color:#4ade80;margin-bottom:4px">Check-in Berhasil!</div>
<div class="member-name">${nama}</div>
<p class="pesan" style="margin-bottom:12px">
  ${expired ? "Periode baru dimulai — selamat main!" : `Kunjungan ke-<strong>${tm}</strong> bulan ini`}
</p>
${expired ? `<div style="background:#1a2e1e;color:#86efac;border:1px solid #1a3a20;border-radius:10px;padding:8px 12px;font-size:12px;margin-bottom:12px">Periode bonus bulan lalu sudah berakhir. Mulai lagi dari awal — semangat!</div>` : ""}
<div class="prog-box">
  <div class="prog-label">Progress bulan ini</div>
  <div class="ball-row">${dots}</div>
  <div class="bar"><div class="bar-fill" style="background:#16a34a;width:${persen}%"></div></div>
  <div class="bar-txt">${tm} dari ${CONFIG.BATAS_MAIN} sesi &nbsp;·&nbsp; <strong style="color:#4ade80">${sisa} lagi</strong> untuk main gratis</div>
</div>
<div class="tip-box">
  <div class="tip-label">Tip hari ini</div>
  ${getTip()}
</div>
<div class="kode-badge">${kode}</div>
<div class="time-txt">${now}</div>
</div></body></html>`;

  // ── Sudah scan ───────────────────────────────────────────────
  if (tipe === "sudahScan") {
    const bolaAmber = Array.from({ length: CONFIG.BATAS_MAIN }, (_, i) => {
      const n = i + 1;
      if (n === CONFIG.BATAS_MAIN) return `<div class="ball" style="background:#854d0e;color:#fef08a;font-size:9px">FREE</div>`;
      if (n <= tm) return `<div class="ball" style="background:#a16207;color:#fef08a">${n}</div>`;
      return `<div class="ball" style="background:#2a1e08;color:#4a3510">${n}</div>`;
    }).join("");

    return `
<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${CONFIG.NAMA_ARENA}</title>
<style>${BASE_CSS}
  body{background:#1a1208}
  .card{background:#1c1309;border:1px solid #2d2008}
  .arena-tag{color:#fbbf24}
  .member-name{color:#fff}
  .pesan{color:#a37a2a}
  .prog-box{background:#2a1e08;border-radius:12px;padding:12px 14px;margin-bottom:12px}
  .prog-label{font-size:10px;font-weight:700;color:#fbbf24;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
  .bar-txt{color:#fbbf24}
  .tip-box{background:#2a1e08;color:#fde68a;border:1px solid #3d2e0f}
  .tip-label{color:#fbbf24}
</style>
</head><body><div class="card">
<div class="arena-tag">${CONFIG.NAMA_ARENA}</div>
<div style="font-size:38px;margin-bottom:8px">⏰</div>
<div style="font-size:18px;font-weight:700;color:#fbbf24;margin-bottom:4px">Sudah Check-in Hari Ini</div>
<div class="member-name">${nama}</div>
<p class="pesan" style="margin-bottom:12px">
  Tercatat pukul <strong style="color:#fbbf24">${jamScan}</strong>.<br>
  Sampai jumpa besok — meja sudah menunggu!
</p>
<div class="prog-box">
  <div class="prog-label">Status bulan ini</div>
  <div class="ball-row">${bolaAmber}</div>
  <div class="bar-txt">${tm} dari ${CONFIG.BATAS_MAIN} sesi bulan ini</div>
</div>
<div class="tip-box">
  <div class="tip-label">Info</div>
  Scan berikutnya bisa dilakukan mulai besok. Istirahat dulu, besok mainkan lagi dengan fresh!
</div>
<div class="time-txt" style="color:#fbbf24">${now}</div>
</div></body></html>`;
  }

  // ── Gratis ───────────────────────────────────────────────────
  if (tipe === "gratis") return `
<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${CONFIG.NAMA_ARENA}</title>
<style>${BASE_CSS}
  body{background:#0d0d0d}
  .card{background:#111;border:1px solid #2a2000}
  .arena-tag{color:#fbbf24}
  .member-name{color:#fff}
  .tip-box{background:#1a1500;color:#fde68a;border:1px dashed #854d0e}
  .tip-label{color:#fbbf24}
  .kode-badge{color:#fbbf24}
</style>
</head><body><div class="card">
<div class="arena-tag">${CONFIG.NAMA_ARENA}</div>
<div style="font-size:48px;margin-bottom:8px">🏆</div>
<div style="font-size:13px;font-weight:700;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Selamat!</div>
<div style="font-size:26px;font-weight:700;color:#fff;margin-bottom:4px">${nama}</div>
<div style="background:#1a1500;border:1.5px solid #854d0e;border-radius:14px;padding:14px 16px;margin-bottom:14px">
  <div style="font-size:13px;color:#fde68a;line-height:1.7">
    Kamu sudah main <strong style="color:#fbbf24;font-size:16px">${CONFIG.BATAS_MAIN}x</strong> bulan ini!<br>
    Sesi berikutnya <span style="color:#fef08a;font-size:18px;font-weight:700">GRATIS</span> untukmu 🎉
  </div>
</div>
<div style="background:#16a34a;border-radius:10px;padding:9px 14px;font-size:12px;color:#fff;font-weight:600;margin-bottom:12px">
  Reward ke-${totalGratis} yang kamu dapat 🎯
</div>
<div class="tip-box">
  <div class="tip-label">Cara klaim</div>
  Tunjukkan halaman ini ke kasir sebelum mulai main. Berlaku untuk sesi berikutnya saja — jangan tutup layar ini dulu!
</div>
<div class="kode-badge">${kode}</div>
<div class="time-txt" style="color:#fbbf24">${now}</div>
</div></body></html>`;

  // ── Error ─────────────────────────────────────────────────────
  return `
<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${CONFIG.NAMA_ARENA}</title>
<style>${BASE_CSS}
  body{background:#1a0a0a}
  .card{background:#1f0f0f;border:1px solid #3d1515}
  .arena-tag{color:#f87171}
  .tip-box{background:#2a1212;color:#fca5a5;border:1px solid #7f1d1d}
  .tip-label{color:#f87171}
</style>
</head><body><div class="card">
<div class="arena-tag">${CONFIG.NAMA_ARENA}</div>
<div style="font-size:38px;margin-bottom:8px">❌</div>
<div style="font-size:18px;font-weight:700;color:#f87171;margin-bottom:10px">${judul}</div>
<p style="font-size:13px;color:#fca5a5;line-height:1.65;margin-bottom:14px">${pesan}</p>
<div class="tip-box">
  <div class="tip-label">Perlu bantuan?</div>
  Hubungi kasir atau pemilik arena untuk mendaftarkan QR kamu.
</div>
</div></body></html>`;
};
