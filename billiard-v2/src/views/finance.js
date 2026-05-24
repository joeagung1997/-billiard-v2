// src/views/finance.js
// ── HTML views untuk halaman keuangan ────────────────────────

import { CONFIG } from "../config.js";

// ── Format rupiah ─────────────────────────────────────────────
const rp = (n) => {
  const abs = Math.abs(Math.round(Number(n) || 0));
  const s   = String(abs);
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return "Rp " + parts.join(".");
};

export const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Safe JSON serializer untuk embed di <script> — escape `<` agar tidak
// memutus tag </script> kalau data user mengandung karakter HTML.
const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

function docHead(title) {
  return "<!DOCTYPE html><html lang=\"id\"><head>"
    + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>" + title + " — " + CONFIG.NAMA_ARENA + "</title>"
    + "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg\">"
    + "<link rel=\"stylesheet\" href=\"/finance.css?v=3\">";
}

export function docHeadV4(title) {
  return "<!DOCTYPE html><html lang=\"id\"><head>"
    + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>" + title + " — " + CONFIG.NAMA_ARENA + "</title>"
    + "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg\">"
    + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css\">"
    + "<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">"
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=22\">";
}

// Helper: inisial 2 huruf dari nama (mis. "Zidan Kecil" → "ZK")
export function initials(name) {
  if (!name) return "";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function buildFinanceSidebar(ftk, page = "keuangan", role = "owner", displayName = "", shift = "siang") {
  const isOwner = role === "owner";
  const isKeu  = page === "keuangan";
  const isKat  = page === "kategori";
  const isMenu = page === "menu";
  const isSdm  = page === "sdm";
  const isMon  = page === "monitoring";
  const isAna  = page === "analisis";
  const isMalam = shift === "malam";
  const subOpen = true; // selalu terbuka — tidak perlu klik untuk expand
  const opsItemCls = "nav-item open";

  const subItem = (href, label, active) =>
    "<a href=\"" + href + "\" class=\"submenu-item" + (active ? " active" : "") + "\">"
    + "<div class=\"sub-dot\"></div>" + label + "</a>";

  // Label & avatar — pakai displayName jika ada, fallback ke role label
  const fallbackName  = isOwner ? "Owner" : "Partner";
  const profileName   = (displayName || "").trim() || fallbackName;
  // Untuk karyawan, role label = "Shift Siang/Malam" (lebih informatif drpd 'Akses Terbatas')
  const profileRole   = isOwner ? "Akses Penuh" : ("Shift " + (isMalam ? "Malam 🌙" : "Siang ☀️"));
  const profileAvatar = initials(displayName) || (isOwner ? "OW" : "PR");
  const roleBadgeColor = isOwner ? "#2d6624" : "#1e40af";
  const roleBadgeBg    = isOwner ? "rgba(45,102,36,.12)" : "rgba(30,64,175,.12)";

  return "<aside class=\"sidebar\">"
    // ── Logo ───────────────────────────────────────
    + "<div class=\"logo-area\">"
    + "<div class=\"logo-row\">"
    + "<div class=\"logo-mark\"><i class=\"ti ti-circle-number-8\"></i><div class=\"logo-online\"></div></div>"
    + "<div class=\"logo-text\">"
    + "<div class=\"logo-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"logo-sub\">Operasional</div>"
    + "</div>"
    + "</div>"
    + "</div>"
    + "<div class=\"sidebar-divider\"></div>"

    // ── Nav scroll ─────────────────────────────────
    + "<div class=\"nav-scroll\">"

    // GROUP: UTAMA (Dashboard + Kelola Member — semua role bisa lihat)
    + "<div class=\"nav-group\">"
    + "<div class=\"nav-group-label\">Utama</div>"
    + (isOwner
      ? "<a href=\"#\" class=\"nav-item\" onclick=\"goAdmin()\">"
        + "<div class=\"nav-item-icon\"><i class=\"ti ti-layout-dashboard\"></i></div>"
        + "<span class=\"nav-item-text\">Dashboard</span>"
        + "</a>"
      : "")
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goMembers()\">"
    + "<div class=\"nav-item-icon\"><i class=\"ti ti-users\"></i></div>"
    + "<span class=\"nav-item-text\">Kelola Member</span>"
    + "</a>"
    + "</div>"

    // GROUP: OPERASIONAL
    + "<div class=\"nav-group\">"
    + "<div class=\"nav-group-label\">Operasional</div>"
    + "<div class=\"" + opsItemCls + "\">"
    + "<div class=\"nav-item-icon\"><i class=\"ti ti-briefcase\"></i></div>"
    + "<span class=\"nav-item-text\">Operasional</span>"
    + "</div>"
    + "<div class=\"submenu-wrap\">"
    + "<div class=\"submenu" + (subOpen ? " open" : "") + "\" id=\"sub-ops\">"
    + subItem("/operasional", "Dashboard Keuangan", isKeu)
    + (isOwner ? subItem("/operasional/analisis", "Analisis Target", isAna) : "")
    + (isOwner ? subItem("/operasional/kategori", "Kelola Kategori", isKat) : "")
    + (isOwner ? subItem("/operasional/menu",     "Kelola Menu",     isMenu) : "")
    + (isOwner ? subItem("/operasional/sdm",      "SDM & Penggajian", isSdm) : "")
    + (isOwner ? subItem("/operasional/monitoring/aktivitas", "Monitoring Karyawan", isMon) : "")
    + "</div>"
    + "</div>"
    + "</div>"

    + "</div>"

    // ── Quick Actions ──────────────────────────────
    + "<div class=\"sidebar-divider\"></div>"
    + "<div class=\"quick-actions\">"
    + "<div class=\"nav-group-label\" style=\"padding-bottom:8px\">Aksi Cepat</div>"
    + "<div class=\"qa-grid\">"
    + (isOwner ? "<a href=\"/scan\" class=\"qa-btn\"><i class=\"ti ti-qrcode\"></i>Scan Member</a>" : "")
    + "<a href=\"/operasional\" class=\"qa-btn\"><i class=\"ti ti-plus\"></i>Transaksi</a>"
    + "<button class=\"qa-btn danger\" onclick=\"financeLogout()\"><i class=\"ti ti-logout\"></i>Keluar</button>"
    + "</div>"
    + "</div>"

    // ── Profile ────────────────────────────────────
    + "<div class=\"sidebar-bottom\">"
    + "<div class=\"profile-card\">"
    + "<div class=\"profile-avatar\" style=\"background:" + roleBadgeBg + ";color:" + roleBadgeColor + "\">" + profileAvatar + "</div>"
    + "<div class=\"profile-info\">"
    + "<div class=\"profile-name\">" + profileName + "</div>"
    + "<div class=\"profile-role\">" + profileRole + "</div>"
    + "</div>"
    + "<div class=\"profile-actions\">"
    + "<button class=\"profile-btn danger\" title=\"Logout\" onclick=\"financeLogout()\"><i class=\"ti ti-logout\"></i></button>"
    + "</div>"
    + "</div>"
    + "</div>"

    + "</aside>"
    + "<script>"
    + "function toggleSubmenu(id,el){"
    + "var sub=document.getElementById('sub-'+id);"
    + "var open=sub.classList.contains('open');"
    + "sub.classList.toggle('open',!open);"
    + "el.classList.toggle('open',!open);}"
    + "function financeLogout(){"
    + "if(!confirm('Keluar dari sesi keuangan?'))return;"
    + "window.location.href='/operasional/logout';}"
    + "function adminLogout(){financeLogout();}"
    + "</script>";
}

// ── Pill profile utk topbar (mobile & desktop topbar) ────────────
export function buildFinanceTopbarProfile(role = "owner", displayName = "") {
  const isOwner = role === "owner";
  const fallback = isOwner ? "Owner" : "Partner";
  const name = (displayName || "").trim() || fallback;
  const ini  = initials(displayName) || (isOwner ? "OW" : "PR");
  const bg   = isOwner ? "rgba(45,102,36,.12)" : "rgba(30,64,175,.12)";
  const col  = isOwner ? "#2d6624" : "#1e40af";
  const roleLbl = isOwner ? "Owner" : "Partner";

  return "<div class=\"topbar-profile\" title=\"" + escHtml(name) + " · " + roleLbl + "\">"
    + "<div class=\"tb-avatar\" style=\"background:" + bg + ";color:" + col + "\">" + escHtml(ini) + "</div>"
    + "<div class=\"tb-prof-info\">"
    +   "<div class=\"tb-prof-name\">" + escHtml(name) + "</div>"
    +   "<div class=\"tb-prof-role\">" + roleLbl + "</div>"
    + "</div>"
    + "</div>";
}

// ── Bottom nav untuk halaman /operasional/* (mobile) ─────────────
export function buildFinanceBottomNav(role = "owner") {
  const isOwner = role === "owner";
  return "<nav class=\"bottom-nav\">"
    + (isOwner
      ? "<a href=\"#\" class=\"bn-item\" onclick=\"goAdmin();return false\">"
        + "<span class=\"bn-icon\"><i class=\"ti ti-layout-dashboard\"></i></span>Home"
        + "</a>"
      : "<a href=\"/operasional/logout\" class=\"bn-item\" onclick=\"event.preventDefault();financeLogout()\">"
        + "<span class=\"bn-icon\"><i class=\"ti ti-logout\"></i></span>Keluar"
        + "</a>")
    + "<a href=\"#\" class=\"bn-item\" onclick=\"goMembers();return false\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-users\"></i></span>Member"
    + "</a>"
    + "<button type=\"button\" class=\"bn-item active\" onclick=\"openBnSheet()\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-briefcase\"></i></span>Operasional"
    + "</button>"
    + (isOwner
      ? "<a href=\"/scan\" class=\"bn-item\">"
        + "<span class=\"bn-icon\"><i class=\"ti ti-qrcode\"></i></span>Scan"
        + "</a>"
      : "<a href=\"#\" class=\"bn-item\" onclick=\"openTrxModal();return false\">"
        + "<span class=\"bn-icon\"><i class=\"ti ti-plus\"></i></span>Catat"
        + "</a>")
    + "</nav>"

    // ── Bottom sheet sub-menu Operasional ──────────────────────
    + "<div class=\"bn-sheet-overlay\" id=\"bnSheetOv\" onclick=\"closeBnSheet()\"></div>"
    + "<div class=\"bn-sheet\" id=\"bnSheet\" role=\"dialog\" aria-label=\"Sub-menu Operasional\">"
    + "<div class=\"bn-sheet-handle\"></div>"
    + "<div class=\"bn-sheet-title\">Operasional"
    + "<span style=\"margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;"
    + "background:" + (isOwner ? "rgba(45,102,36,.12)" : "rgba(30,64,175,.12)") + ";"
    + "color:" + (isOwner ? "#2d6624" : "#1e40af") + "\">"
    + (isOwner ? "Owner" : "Partner") + "</span></div>"
    + "<a href=\"/operasional\" class=\"bn-sheet-item\">"
    + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-wallet\"></i></div>"
    + "<div><div class=\"bn-sheet-name\">Dashboard Keuangan</div>"
    + "<div class=\"bn-sheet-sub\">Pemasukan, pengeluaran &amp; saldo</div></div>"
    + "</a>"
    + (isOwner
      ? "<a href=\"/operasional/analisis\" class=\"bn-sheet-item\">"
        + "<div class=\"bn-sheet-icon\" style=\"background:rgba(168,85,247,.12);color:#a855f7\"><i class=\"ti ti-target\"></i></div>"
        + "<div><div class=\"bn-sheet-name\">Analisis Target</div>"
        + "<div class=\"bn-sheet-sub\">Target hari/minggu/bulan &amp; simulasi karyawan</div></div>"
        + "</a>"
      : "")
    + (isOwner
      ? "<a href=\"/operasional/kategori\" class=\"bn-sheet-item\">"
        + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-tag\"></i></div>"
        + "<div><div class=\"bn-sheet-name\">Kelola Kategori</div>"
        + "<div class=\"bn-sheet-sub\">Atur kategori pemasukan &amp; pengeluaran</div></div>"
        + "</a>"
        + "<a href=\"/operasional/menu\" class=\"bn-sheet-item\">"
        + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-coffee\"></i></div>"
        + "<div><div class=\"bn-sheet-name\">Kelola Menu</div>"
        + "<div class=\"bn-sheet-sub\">Kopi, snack, rokok &amp; topping</div></div>"
        + "</a>"
      : "")
    + (isOwner
      ? "<a href=\"/operasional/sdm\" class=\"bn-sheet-item\">"
        + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-users\"></i></div>"
        + "<div><div class=\"bn-sheet-name\">SDM &amp; Penggajian</div>"
        + "<div class=\"bn-sheet-sub\">Karyawan, gaji, kasbon &amp; THR</div></div>"
        + "</a>"
      : "")
    + (isOwner
      ? "<a href=\"/operasional/monitoring/aktivitas\" class=\"bn-sheet-item\">"
        + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-chart-bar\"></i></div>"
        + "<div><div class=\"bn-sheet-name\">Monitoring Karyawan</div>"
        + "<div class=\"bn-sheet-sub\">Aktivitas, setoran shift &amp; selisih kas</div></div>"
        + "</a>"
      : "")
    + "</div>"

    + "<script>"
    + "function openBnSheet(){"
    + "document.getElementById('bnSheet').classList.add('open');"
    + "document.getElementById('bnSheetOv').classList.add('open');}"
    + "function closeBnSheet(){"
    + "document.getElementById('bnSheet').classList.remove('open');"
    + "document.getElementById('bnSheetOv').classList.remove('open');}"
    // Fallback handlers — kalau page-level script tdk define, ini yg dipakai
    // (ex. /operasional/kategori, /menu, /monitoring/* tdk define goMembers)
    + "if(typeof goAdmin!=='function'){window.goAdmin=function(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';};}"
    + "if(typeof goMembers!=='function'){window.goMembers=function(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin/members';};}"
    + "if(typeof financeLogout!=='function'){window.financeLogout=function(){if(!confirm('Keluar dari sesi keuangan?'))return;window.location.href='/operasional/logout';};}"
    + "</script>";
}

const CSS = [
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  ":root {",
  "  --ff: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
  "  --bg: #070d18; --surface: #0c1526; --surface2: #111f35;",
  "  --border: rgba(255,255,255,.07); --border2: rgba(255,255,255,.12);",
  "  --txt: #e8edf5; --txt2: #8496b0; --txt3: #4a5e78;",
  "  --green: #22c55e; --green-bg: rgba(34,197,94,.1);",
  "  --red: #ef4444;   --red-bg:   rgba(239,68,68,.1);",
  "  --accent: #3b82f6; --gold: #f59e0b; --gold-bg: rgba(245,158,11,.1);",
  "  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-xl:18px;",
  "}",
  "[data-theme='light'] {",
  "  --bg:#f4f6fa; --surface:#fff; --surface2:#f0f4f8;",
  "  --border:rgba(0,0,0,.07); --border2:rgba(0,0,0,.12);",
  "  --txt:#0d1117; --txt2:#556070; --txt3:#94a3b8;",
  "}",
  "body { font-family:var(--ff); font-size:13px; color:var(--txt); background:var(--bg);",
  "  min-height:100vh; -webkit-font-smoothing:antialiased; }",
  "a { color:inherit; text-decoration:none; }",
  "button,input,select,textarea { font-family:var(--ff); }",

  // topbar
  ".topbar { position:sticky; top:0; z-index:50; background:var(--surface); border-bottom:1px solid var(--border);",
  "  padding:10px 16px; display:flex; align-items:center; justify-content:space-between; gap:8px; }",
  ".topbar-brand { display:flex; align-items:center; gap:10px; }",
  ".topbar-name { font-size:14px; font-weight:700; color:var(--txt); }",
  ".topbar-label { font-size:11px; color:var(--green); font-weight:600; }",
  ".topbar-right { display:flex; align-items:center; gap:8px; }",
  ".theme-btn { background:var(--surface2); border:1px solid var(--border2); border-radius:6px;",
  "  padding:5px 8px; font-size:12px; color:var(--txt2); cursor:pointer; }",
  ".back-link { display:inline-flex; align-items:center; gap:4px; font-size:12px; color:var(--accent); cursor:pointer; }",

  // page
  ".page { padding:16px; padding-bottom:60px; max-width:960px; margin:0 auto; }",
  ".sec-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;",
  "  color:var(--txt3); margin-bottom:8px; margin-top:20px; }",

  // stats grid
  ".stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }",
  "@media(max-width:500px) { .stats { grid-template-columns:1fr; } }",
  ".stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px 16px; }",
  ".stat-num { font-size:18px; font-weight:700; color:var(--txt); line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
  ".stat-lbl { font-size:11px; color:var(--txt2); margin-top:4px; }",
  ".stat-up   { color:var(--green) !important; }",
  ".stat-down { color:var(--red) !important; }",
  ".stat-saldo-pos { color:var(--green) !important; }",
  ".stat-saldo-neg { color:var(--red) !important; }",

  // action + filter
  ".action-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }",
  ".btn-primary { display:inline-flex; align-items:center; gap:4px; background:var(--accent); color:#fff;",
  "  border:none; border-radius:var(--r-md); padding:8px 16px; font-size:13px; font-weight:700;",
  "  text-decoration:none; cursor:pointer; }",
  ".btn-secondary { display:inline-flex; align-items:center; gap:4px; background:var(--surface2);",
  "  color:var(--txt2); border:1px solid var(--border2); border-radius:var(--r-md); padding:8px 12px;",
  "  font-size:13px; font-weight:600; text-decoration:none; cursor:pointer; }",
  ".filter-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }",
  ".sel { padding:7px 10px; background:var(--surface); border:1px solid var(--border2);",
  "  border-radius:var(--r-md); color:var(--txt); font-size:13px; outline:none; cursor:pointer; }",

  // table
  ".card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; }",
  ".table-wrap { overflow-x:auto; }",
  "table { width:100%; border-collapse:collapse; min-width:540px; }",
  "thead tr { border-bottom:1px solid var(--border); }",
  "th { padding:8px 16px; font-size:11px; font-weight:700; color:var(--txt3); text-transform:uppercase;",
  "  letter-spacing:.07em; text-align:left; background:var(--surface2); white-space:nowrap; }",
  "tbody tr { border-bottom:1px solid var(--border); transition:background .1s; }",
  "tbody tr:last-child { border-bottom:none; }",
  "tbody tr:hover { background:var(--surface2); }",
  "td { padding:10px 16px; vertical-align:middle; font-size:13px; }",
  ".badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:var(--r-sm);",
  "  font-size:11px; font-weight:700; white-space:nowrap; }",
  ".badge-green { background:var(--green-bg); color:var(--green); }",
  ".badge-red   { background:var(--red-bg);   color:var(--red); }",
  ".badge-gold  { background:var(--gold-bg);  color:var(--gold); }",
  ".tbl-btn { display:inline-block; padding:3px 8px; border-radius:var(--r-sm); font-size:11px;",
  "  font-weight:700; cursor:pointer; text-decoration:none; border:1px solid var(--border2);",
  "  color:var(--txt2); background:var(--surface2); white-space:nowrap; }",
  ".tbl-btn-red { color:var(--red); border-color:rgba(239,68,68,.25); background:var(--red-bg); }",

  // form
  ".form-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-xl);",
  "  padding:24px 20px; max-width:420px; width:100%; margin:0 auto; }",
  "label { display:block; font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;",
  "  color:var(--txt3); margin-bottom:5px; }",
  ".fw { margin-bottom:16px; }",
  "input[type=text],input[type=number],input[type=date],input[type=datetime-local],select.inp {",
  "  width:100%; padding:11px 12px; background:#0a1422; border:1.5px solid #1e3a5f;",
  "  border-radius:var(--r-md); font-size:14px; color:var(--txt); outline:none; }",
  "input:focus,select.inp:focus { border-color:var(--accent); }",
  "input::placeholder { color:var(--txt3); }",
  ".jenis-toggle { display:flex; gap:8px; }",
  ".jenis-btn { flex:1; padding:10px; border:1.5px solid var(--border2); border-radius:var(--r-md);",
  "  font-size:13px; font-weight:700; cursor:pointer; background:var(--surface2); color:var(--txt2);",
  "  text-align:center; transition:all .15s; }",
  ".jenis-btn.active-in  { border-color:var(--green); background:var(--green-bg); color:var(--green); }",
  ".jenis-btn.active-out { border-color:var(--red);   background:var(--red-bg);   color:var(--red); }",
  "input[type=hidden] {}",
  ".btn-submit { width:100%; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md);",
  "  padding:13px; font-size:15px; font-weight:700; cursor:pointer; margin-top:4px; }",
  ".btn-submit:active { opacity:.85; }",

  // empty
  ".empty-state { text-align:center; padding:32px; color:var(--txt3); font-size:13px; }",

  // toast
  ".toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);padding:11px 22px;border-radius:24px;font-size:13px;font-weight:600;z-index:9998;white-space:nowrap;pointer-events:none;opacity:0;transition:all .25s ease;display:flex;align-items:center;gap:8px;box-shadow:0 4px 18px rgba(0,0,0,.12)}",
  ".toast.show{opacity:1;transform:translateX(-50%) translateY(0)}",
  ".toast.ok{background:#dcfce7;color:#16a34a;border:1px solid rgba(34,197,94,.3)}",
  ".toast.err{background:#fee2e2;color:#dc2626;border:1px solid rgba(239,68,68,.3)}",
].join("\n");

// ── Login page ────────────────────────────────────────────────
export function financeLoginPage(showErr) {
  const errHtml = showErr
    ? "<div class=\"err-msg\"><span>⚠ PIN salah. Silakan coba lagi.</span></div>"
    : "";

  const loginCss = [
    "*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }",
    "body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
    "  background:#050b15; min-height:100vh;",
    "  display:flex; align-items:center; justify-content:center; padding:20px; overflow:hidden; }",
    ".bg-glow { position:fixed; inset:0; pointer-events:none; z-index:0; }",
    ".bg-glow::before { content:''; position:absolute; top:-15%; left:50%; transform:translateX(-50%);",
    "  width:640px; height:640px;",
    "  background:radial-gradient(circle,rgba(34,197,94,.1) 0%,transparent 68%); border-radius:50%; }",
    ".bg-glow::after { content:''; position:absolute; bottom:-10%; right:-10%;",
    "  width:420px; height:420px;",
    "  background:radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 70%); border-radius:50%; }",
    ".card { position:relative; z-index:1;",
    "  background:linear-gradient(150deg,#0e1b2e 0%,#090f1c 100%);",
    "  border:1px solid rgba(255,255,255,.07); border-radius:26px;",
    "  padding:36px 28px 28px; width:100%; max-width:340px; text-align:center;",
    "  box-shadow:0 40px 90px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.05);",
    "  animation:cardIn .45s cubic-bezier(.16,1,.3,1) both; }",
    "@keyframes cardIn { from{opacity:0;transform:translateY(28px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }",
    ".icon-box { width:68px; height:68px; margin:0 auto 18px;",
    "  background:linear-gradient(135deg,#0f3a20,#071c0e);",
    "  border:1px solid rgba(34,197,94,.22); border-radius:20px;",
    "  display:flex; align-items:center; justify-content:center; font-size:30px;",
    "  box-shadow:0 8px 28px rgba(34,197,94,.18); }",
    ".arena-lbl { font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#22c55e; margin-bottom:7px; }",
    "h1 { font-size:22px; font-weight:700; color:#e8edf5; margin-bottom:4px; }",
    ".sub { font-size:13px; color:#4a5e78; margin-bottom:26px; }",
    ".pin-dots { display:flex; justify-content:center; gap:11px; margin-bottom:24px; }",
    ".dot { width:13px; height:13px; border-radius:50%;",
    "  background:#162030; border:2px solid #253a58;",
    "  transition:all .15s cubic-bezier(.34,1.56,.64,1); }",
    ".dot.filled { background:#22c55e; border-color:#22c55e; transform:scale(1.18);",
    "  box-shadow:0 0 10px rgba(34,197,94,.55); }",
    ".err-msg { background:rgba(239,68,68,.1); color:#f87171;",
    "  border:1px solid rgba(239,68,68,.2); border-radius:10px;",
    "  padding:10px 12px; font-size:12px; font-weight:500; margin-bottom:18px;",
    "  animation:shake .45s cubic-bezier(.36,.07,.19,.97); }",
    "@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }",
    ".numpad { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }",
    ".np-btn { background:#0f1e30; border:1px solid #1c3352; border-radius:14px; color:#e8edf5;",
    "  font-size:20px; font-weight:600; padding:17px 10px; cursor:pointer;",
    "  transition:background .12s,transform .1s;",
    "  font-family:inherit; touch-action:manipulation; user-select:none; line-height:1; }",
    ".np-btn:hover { background:#162840; border-color:#2a4a74; }",
    ".np-btn:active { transform:scale(.9); opacity:.8; }",
    ".del-btn { color:#475569; font-size:16px; }",
    ".go-btn { background:linear-gradient(135deg,#16a34a,#15803d); border-color:#22c55e; color:#fff;",
    "  box-shadow:0 4px 18px rgba(34,197,94,.28); font-size:18px; }",
    ".go-btn:hover { background:linear-gradient(135deg,#22c55e,#16a34a); }",
    ".login-footer { margin-top:22px; font-size:11px; color:#253040; }",
    "#pinInput { display:none; }",
    ".uname-wrap { margin-bottom:18px; text-align:left; }",
    ".uname-lbl { display:block; font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#4a5e78; margin-bottom:7px; }",
    ".uname-inp { width:100%; padding:10px 13px; background:#0a1422; border:1.5px solid #1e3a5f; border-radius:11px; font-size:13px; color:#e8edf5; outline:none; font-family:inherit; transition:border-color .15s; }",
    ".uname-inp:focus { border-color:#22c55e; }",
    ".uname-inp::placeholder { color:#253a58; font-size:12px; }",
    ".pin-section-lbl { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#4a5e78; margin-bottom:14px; display:block; }",
  ].join("");

  const script = [
    "var _pin='',MAX=4,LS_KEY='warpat_last_uname';",
    "function press(n){if(_pin.length>=MAX)return;_pin+=n;upd();if(_pin.length===MAX)go();}",
    "function del(){_pin=_pin.slice(0,-1);upd();}",
    "function upd(){for(var i=0;i<MAX;i++){var d=document.getElementById('d'+i);if(d)d.classList.toggle('filled',i<_pin.length);}}",
    "function go(){",
    "  if(!_pin.length)return;",
    "  var un=document.getElementById('unameField');",
    "  var uv=un?un.value.trim():'';",
    "  try{if(uv)localStorage.setItem(LS_KEY,uv);}catch(_){}",
    "  document.getElementById('pi').value=_pin;",
    "  if(un)document.getElementById('piUname').value=uv;",
    "  document.getElementById('pf').submit();",
    "}",
    "document.addEventListener('keydown',function(e){",
    "  var un=document.getElementById('unameField');",
    "  if(document.activeElement===un){",
    "    if(e.key==='Enter'){e.preventDefault();if(!_pin.length){}else{go();}}",
    "    return;",
    "  }",
    "  if(e.key>='0'&&e.key<='9')press(e.key);",
    "  else if(e.key==='Backspace')del();",
    "  else if(e.key==='Enter')go();",
    "});",
    // Prefill username dari localStorage
    "window.addEventListener('load',function(){",
    "  try{var s=localStorage.getItem(LS_KEY);if(s){var u=document.getElementById('unameField');if(u)u.value=s;}}catch(_){}",
    "});",
  ].join("");

  const dots = [0,1,2,3].map(function(i){ return "<div class=\"dot\" id=\"d" + i + "\"></div>"; }).join("");

  return docHead("Keuangan Login")
    + "<style>" + loginCss + "</style>"
    + "</head><body>"
    + "<div class=\"bg-glow\"></div>"
    + "<div class=\"card\">"
    +   "<div class=\"icon-box\">💰</div>"
    +   "<div class=\"arena-lbl\">" + CONFIG.NAMA_ARENA + "</div>"
    +   "<h1>Laporan Keuangan</h1>"
    +   "<p class=\"sub\">Masukkan username &amp; PIN untuk akses</p>"
    +   errHtml
    +   "<div class=\"uname-wrap\">"
    +     "<label class=\"uname-lbl\" for=\"unameField\">Username</label>"
    +     "<input type=\"text\" id=\"unameField\" class=\"uname-inp\" placeholder=\"Username (opsional untuk PIN lama)\""
    +     " autocomplete=\"username\" autocorrect=\"off\" autocapitalize=\"none\" spellcheck=\"false\">"
    +   "</div>"
    +   "<span class=\"pin-section-lbl\">PIN</span>"
    +   "<div class=\"pin-dots\">" + dots + "</div>"
    +   "<div class=\"numpad\">"
    +     "<button class=\"np-btn\" onclick=\"press('1')\">1</button>"
    +     "<button class=\"np-btn\" onclick=\"press('2')\">2</button>"
    +     "<button class=\"np-btn\" onclick=\"press('3')\">3</button>"
    +     "<button class=\"np-btn\" onclick=\"press('4')\">4</button>"
    +     "<button class=\"np-btn\" onclick=\"press('5')\">5</button>"
    +     "<button class=\"np-btn\" onclick=\"press('6')\">6</button>"
    +     "<button class=\"np-btn\" onclick=\"press('7')\">7</button>"
    +     "<button class=\"np-btn\" onclick=\"press('8')\">8</button>"
    +     "<button class=\"np-btn\" onclick=\"press('9')\">9</button>"
    +     "<button class=\"np-btn del-btn\" onclick=\"del()\">⌫</button>"
    +     "<button class=\"np-btn\" onclick=\"press('0')\">0</button>"
    +     "<button class=\"np-btn go-btn\" onclick=\"go()\">→</button>"
    +   "</div>"
    +   "<form id=\"pf\" action=\"/operasional/login\" method=\"post\">"
    +     "<input type=\"hidden\" name=\"pin\" id=\"pi\">"
    +     "<input type=\"hidden\" name=\"username\" id=\"piUname\">"
    +   "</form>"
    +   "<div class=\"login-footer\">Gunakan keyboard atau tap angka di atas</div>"
    + "</div>"
    + "<script>" + script + "<\/script>"
    + "</body></html>";
}

// ── Dashboard ─────────────────────────────────────────────────
export function financeDashboard({ transaksi, token, role = "owner", displayName = "", shift = "siang", bulanFilter, jenisFilter, tglDari, tglSampai, kategoriList = [], subKategoriList = [], menuItems = [], toppings = [], accountsAll = [], karyawanAll = [], analisis = null, msg = "" }) {
  const defaultShift = shift === "malam" ? "malam" : "siang";
  const isOwner = role === "owner";
  const toastMsg  = msg === "created"   ? "Transaksi berhasil dicatat! Cek tabel di bawah untuk detail."
    : msg === "voided"    ? "Transaksi dibatalkan. Saldo sudah diperbarui."
    : msg === "err"       ? "Gagal menyimpan. Cek isian form lalu coba lagi."
    : msg === "no_access" ? "Akses ditolak — fitur ini hanya untuk Owner."
    : "";
  const toastType = (msg === "err" || msg === "no_access") ? "err" : "ok";
  const now = new Date();
  const curBulan = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const bFilter  = bulanFilter || curBulan;
  const jFilter  = jenisFilter || "";
  const tDari    = tglDari    || "";
  const tSampai  = tglSampai  || "";

  // username → display name (utk tampilkan pencatat di tabel transaksi)
  const userNameMap = Object.fromEntries(
    accountsAll.map((a) => [a.username, a.display_name || a.username])
  );
  // username → shift (lookup karyawanList by nama matching display_name)
  const userShiftMap = Object.fromEntries(
    accountsAll.map((a) => {
      const dn = (a.display_name || "").trim().toLowerCase();
      const k  = karyawanAll.find((x) => (x.nama || "").trim().toLowerCase() === dn);
      return [a.username, k?.shift || a.shift || "siang"];
    })
  );

  // ── Analisis Target HTML — versi RINGKAS untuk dashboard ──────
  // Detail penuh (breakdown + simulator) ada di /operasional/analisis
  const renderAnalisis = (an) => {
    if (!an) return "";
    const miniCard = (lbl, data) => {
      const { pemasukan, target, status } = data;
      const pct = Math.min(100, Math.round((pemasukan / Math.max(target, 1)) * 100));
      return "<div class=\"an-mini\" style=\"--accent-bar:" + status.color + "\">"
        + "<div class=\"an-mini-row\">"
        +   "<div class=\"an-mini-lbl\">" + lbl + "</div>"
        +   "<div class=\"an-status\" style=\"background:" + status.color + "\">"
        +     status.emoji + " " + status.label + "</div>"
        + "</div>"
        + "<div class=\"an-mini-amt\">" + rp(pemasukan) + " <span class=\"an-mini-target\">/ " + rp(target) + "</span></div>"
        + "<div class=\"an-mini-prog\"><div style=\"width:" + pct + "%;background:" + status.color + "\"></div></div>"
        + "</div>";
    };

    return "<div class=\"an-section\">"
      + "<div class=\"an-hdr\">"
      +   "<div class=\"an-title\"><div class=\"an-title-ic\"><i class=\"ti ti-target\"></i></div>"
      +     "Status Target Operasional</div>"
      +   (isOwner
        ? "<a href=\"/operasional/analisis\" class=\"an-detail-link\">"
          + "Detail Analisis <i class=\"ti ti-arrow-right\" style=\"font-size:13px\"></i></a>"
        : "<div class=\"an-target-badge\"><i class=\"ti ti-target\"></i> Target <strong>" + rp(an.targets.hari) + "</strong> / hari</div>")
      + "</div>"
      + "<div class=\"an-mini-grid\">"
      +   miniCard("Hari ini",   an.hari)
      +   miniCard("Minggu ini", an.minggu)
      +   miniCard("Bulan ini",  an.bulan)
      + "</div>"
      + "<div class=\"an-note\"><i class=\"ti ti-info-circle\"></i>"
      +   "<span><strong>Catatan:</strong> ini data biaya rutin yang terlihat — "
      +   "<strong>belum termasuk pengeluaran darurat</strong> (kerusakan stik, meja, bola, dll).</span></div>"
      + "</div>";
  };
  const analisisHtml = renderAnalisis(analisis);

  // Menu items untuk wizard Kopi/Snack — dikelompokkan by kategori
  // Build toppings map by item name (for wizard JS)
  const toppingsByName = {};
  menuItems.forEach((m) => {
    const mt = toppings.filter((t) => t.item_id === m.id);
    if (mt.length) toppingsByName[m.nama] = mt.map((t) => ({ nama: t.nama, harga: t.harga }));
  });

  const menuOptsHtml = MENU_KAT_OPTS.map((k) => {
    const kRows = menuItems.filter((m) => (m.kategori || "minuman") === k.value);
    if (!kRows.length) return "";
    return "<optgroup label=\"" + k.label + "\">"
      + kRows.map((m) =>
          "<option value=\"" + escHtml(m.nama) + "\" data-harga=\"" + m.harga + "\""
          + " data-harga-hot=\"" + (m.harga_hot || 0) + "\""
          + " data-kategori=\"" + escHtml(m.kategori || "minuman") + "\">"
          + escHtml(m.nama) + " — Rp " + Number(m.harga).toLocaleString("id-ID") + "</option>"
        ).join("")
      + "</optgroup>";
  }).join("");

  // Kategori optgroups untuk modal
  const modalGrpIn  = kategoriList.filter((k) => k.jenis === "pemasukan")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");
  const modalGrpOut = kategoriList.filter((k) => k.jenis === "pengeluaran")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");

  // Sub-kategori lookup keyed by kategori nama (untuk JS di client)
  const subByKatId2 = {};
  subKategoriList.forEach((s) => {
    if (!subByKatId2[s.kategori_id]) subByKatId2[s.kategori_id] = [];
    subByKatId2[s.kategori_id].push(s.nama);
  });
  const subKatByName = {};
  kategoriList.forEach((k) => {
    const subs = subByKatId2[k.id];
    if (subs && subs.length > 0) subKatByName[k.nama] = subs;
  });
  const subKatJson = JSON.stringify(subKatByName);

  // Filter & sort — bulan + jenis untuk stats; date range untuk tabel
  const filtered = transaksi.filter((t) => {
    return t.tanggal.slice(0, 7) === bFilter
      && (!jFilter || t.jenis === jFilter);
  });
  const sorted = [...filtered].sort((a, b) =>
    b.tanggal !== a.tanggal
      ? b.tanggal.localeCompare(a.tanggal)
      : (new Date(b.createdAt ?? 0).getTime()) - (new Date(a.createdAt ?? 0).getTime())
  );

  // Terapkan filter range tanggal ke tabel (stats bulanan tetap)
  const tSampaiEff = tSampai || tDari;
  const sortedTbl = tDari
    ? sorted.filter((t) => t.tanggal >= tDari && t.tanggal <= tSampaiEff)
    : sorted;

  // Voided transaksi DIKECUALIKAN dari semua perhitungan stats.
  // Tetap ditampilkan di tabel dengan styling khusus.
  const activeFiltered  = filtered.filter((t) => !t.voidedAt);
  const voidedCount     = filtered.length - activeFiltered.length;
  const activeSortedTbl = tDari
    ? activeFiltered.filter((t) => t.tanggal >= tDari && t.tanggal <= tSampaiEff)
    : activeFiltered;
  const chartTotalIn  = activeSortedTbl.filter((t) => t.jenis === "pemasukan").reduce((s, t) => s + t.jumlah, 0);
  const chartTotalOut = activeSortedTbl.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.jumlah, 0);
  const chartSaldo    = chartTotalIn - chartTotalOut;
  const chartMargin   = chartTotalIn > 0 ? ((chartSaldo / chartTotalIn) * 100).toFixed(1) : "0";

  // Breakdown metode pembayaran (pemasukan saja)
  const totalCash = activeSortedTbl.filter((t) => t.jenis === "pemasukan" && t.bayar === "cash").reduce((s, t) => s + t.jumlah, 0);
  const totalQris = activeSortedTbl.filter((t) => t.jenis === "pemasukan" && t.bayar === "qris").reduce((s, t) => s + t.jumlah, 0);

  // Summary (exclude voided)
  const pemasukan   = activeFiltered.filter((t) => t.jenis === "pemasukan");
  const pengeluaran = activeFiltered.filter((t) => t.jenis === "pengeluaran");
  const totalIn     = pemasukan.reduce((s, t) => s + t.jumlah, 0);
  const totalOut    = pengeluaran.reduce((s, t) => s + t.jumlah, 0);
  const saldo       = totalIn - totalOut;
  const margin      = totalIn > 0 ? ((saldo / totalIn) * 100).toFixed(1) : "0";

  // Perbandingan bulan lalu untuk badge "vs Apr 2026" (exclude voided)
  const prevDate    = new Date(bFilter + "-01");
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevBulan   = prevDate.getFullYear() + "-" + String(prevDate.getMonth() + 1).padStart(2, "0");
  const prevLabel   = prevDate.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  const prevIn      = transaksi.filter((t) => !t.voidedAt && t.tanggal.slice(0, 7) === prevBulan && t.jenis === "pemasukan")
                               .reduce((s, t) => s + t.jumlah, 0);
  const inDelta     = prevIn > 0 ? Math.round(((totalIn - prevIn) / prevIn) * 100) : 0;

  // Bulan options (12 bulan terakhir) untuk select tersembunyi
  const bulanOpts = Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const lbl = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return "<option value=\"" + val + "\"" + (val === bFilter ? " selected" : "") + ">" + lbl + "</option>";
  }).join("");

  const bulanLabel = new Date(bFilter + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const bulanLabelShort = new Date(bFilter + "-01").toLocaleDateString("id-ID", { month: "short", year: "numeric" });

  // Kategori options dari semua transaksi
  const kategoriSet = Array.from(new Set(transaksi.map((t) => t.kategori).filter(Boolean))).sort();
  const kategoriOpts = kategoriSet.map((k) =>
    "<option value=\"" + escHtml(k) + "\">" + escHtml(k) + "</option>"
  ).join("");

  // ── Periode aktif detection ───────────────────────────────────
  const todayStr   = now.toISOString().slice(0, 10);
  const dayOfWeek  = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const mondayDate = new Date(now); mondayDate.setDate(now.getDate() - dayOfWeek);
  const mondayStr  = mondayDate.toISOString().slice(0, 10);
  const isHariIni   = tDari === todayStr && tSampai === todayStr;
  const isSingleDay = !!tDari && tDari === tSampai;          // 1 hari saja (apapun)
  const isMingguIni = tDari === mondayStr && tSampai === todayStr;
  const isBulanIni  = !tDari && bFilter === curBulan;
  // Periode "hari" pakai distribusi slot (Pagi/Siang/Sore/Malam) — termasuk
  // saat user pilih kemarin/besok via day-picker karyawan.
  const periodeKey  = isSingleDay ? "hari" : isMingguIni ? "minggu" : isBulanIni ? "bulan" : "custom";
  const periodeLabel = isHariIni
    ? "Hari ini · " + now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : isMingguIni ? "Minggu ini"
    : tDari ? (tDari === tSampaiEff ? tDari : tDari + " – " + tSampaiEff)
    : bulanLabel;

  // ── Chart data berdasarkan periodeKey ────────────────────────
  let chartLabels, chartIn, chartOut, chartSubtitle;

  if (periodeKey === "hari") {
    const SLOTS = [
      { lbl: "Dini Hari", h0: 0,  h1: 6  },
      { lbl: "Pagi",      h0: 6,  h1: 12 },
      { lbl: "Siang",     h0: 12, h1: 16 },
      { lbl: "Sore",      h0: 16, h1: 19 },
      { lbl: "Malam",     h0: 19, h1: 24 },
    ];
    chartLabels = SLOTS.map((s) => s.lbl);
    chartIn  = SLOTS.map(() => 0);
    chartOut = SLOTS.map(() => 0);
    activeSortedTbl.forEach(function(t) {
      const h   = parseInt((t.jam || "00:00").split(":")[0]) || 0;
      const idx = SLOTS.findIndex((s) => h >= s.h0 && h < s.h1);
      const i   = idx < 0 ? 0 : idx;
      if (t.jenis === "pemasukan") chartIn[i]  += t.jumlah;
      else                         chartOut[i] += t.jumlah;
    });
    const _dayStr = tDari || todayStr;
    const _dayFmt = new Date(_dayStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    chartSubtitle = (_dayStr === todayStr ? "Hari ini · " : "") + _dayFmt;

  } else if (periodeKey === "minggu") {
    const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    chartLabels = DAYS;
    chartIn  = [0, 0, 0, 0, 0, 0, 0];
    chartOut = [0, 0, 0, 0, 0, 0, 0];
    const monMs = new Date(mondayStr + "T00:00:00").getTime();
    activeSortedTbl.forEach(function(t) {
      const diff = Math.floor((new Date(t.tanggal + "T00:00:00").getTime() - monMs) / 86400000);
      if (diff >= 0 && diff < 7) {
        if (t.jenis === "pemasukan") chartIn[diff]  += t.jumlah;
        else                         chartOut[diff] += t.jumlah;
      }
    });
    const sunDate = new Date(new Date(mondayStr + "T00:00:00").getTime() + 6 * 86400000);
    const monFmt  = new Date(mondayStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const sunFmt  = sunDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    chartSubtitle = "Minggu ini · " + monFmt + " — " + sunFmt;

  } else if (periodeKey === "custom" && tDari) {
    const fromMs   = new Date(tDari + "T00:00:00").getTime();
    const toMs     = new Date(tSampaiEff + "T00:00:00").getTime();
    const diffDays = Math.round((toMs - fromMs) / 86400000) + 1;
    if (diffDays <= 14) {
      chartLabels = [];
      chartIn  = [];
      chartOut = [];
      for (let i = 0; i < diffDays; i++) {
        const d    = new Date(fromMs + i * 86400000);
        const dStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        chartLabels.push(d.getDate() + "/" + (d.getMonth() + 1));
        chartIn.push(activeSortedTbl.filter((t) => t.tanggal === dStr && t.jenis === "pemasukan").reduce((s, t) => s + t.jumlah, 0));
        chartOut.push(activeSortedTbl.filter((t) => t.tanggal === dStr && t.jenis === "pengeluaran").reduce((s, t) => s + t.jumlah, 0));
      }
    } else {
      const numWeeks = Math.ceil(diffDays / 7);
      chartLabels = Array.from({ length: numWeeks }, (_, i) => "Minggu " + (i + 1));
      chartIn  = new Array(numWeeks).fill(0);
      chartOut = new Array(numWeeks).fill(0);
      activeSortedTbl.forEach(function(t) {
        const wi = Math.min(Math.floor((new Date(t.tanggal + "T00:00:00").getTime() - fromMs) / (7 * 86400000)), numWeeks - 1);
        if (wi >= 0) {
          if (t.jenis === "pemasukan") chartIn[wi]  += t.jumlah;
          else                         chartOut[wi] += t.jumlah;
        }
      });
    }
    const fromFmt = new Date(tDari + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const toFmt   = new Date(tSampaiEff + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    chartSubtitle = tDari === tSampaiEff ? fromFmt : fromFmt + " — " + toFmt;

  } else {
    chartLabels = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
    chartIn     = [0, 0, 0, 0];
    chartOut    = [0, 0, 0, 0];
    activeSortedTbl.forEach(function(t) {
      const day = parseInt((t.tanggal || "").split("-")[2] || "1", 10);
      const wi  = Math.min(Math.floor((day - 1) / 7), 3);
      if (t.jenis === "pemasukan") chartIn[wi]  += t.jumlah;
      else                         chartOut[wi] += t.jumlah;
    });
    chartSubtitle = bulanLabel + " · per minggu";
  }

  // ── Detail chart: per tanggal / hari / jam (owner only) ───────
  const daysInBulan = new Date(parseInt(bFilter.split("-")[0], 10), parseInt(bFilter.split("-")[1], 10), 0).getDate();
  const byDateLabels = Array.from({ length: daysInBulan }, (_, i) => String(i + 1));
  const byDateInp  = new Array(daysInBulan).fill(0);
  const byDateOut  = new Array(daysInBulan).fill(0);
  const byDayInp   = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 … Sun=6
  const byDayOut   = [0, 0, 0, 0, 0, 0, 0];
  const byHourInp  = new Array(24).fill(0);
  const byHourOut  = new Array(24).fill(0);
  activeFiltered.forEach(function(t) {
    const dayNum = parseInt((t.tanggal || "").split("-")[2], 10);
    if (dayNum >= 1 && dayNum <= daysInBulan) {
      if (t.jenis === "pemasukan") byDateInp[dayNum - 1] += t.jumlah;
      else                         byDateOut[dayNum - 1] += t.jumlah;
    }
    const d   = new Date(t.tanggal + "T00:00:00");
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    if (t.jenis === "pemasukan") byDayInp[dow] += t.jumlah;
    else                         byDayOut[dow] += t.jumlah;
    const h = parseInt((t.jam || "00:00").split(":")[0], 10) || 0;
    if (t.jenis === "pemasukan") byHourInp[h] += t.jumlah;
    else                         byHourOut[h] += t.jumlah;
  });

  // ── Category breakdown for donut chart ───────────────────────
  const catMap = {};
  activeSortedTbl.filter((t) => t.jenis === "pemasukan").forEach(function(t) {
    catMap[t.kategori || "Lainnya"] = (catMap[t.kategori || "Lainnya"] || 0) + t.jumlah;
  });
  const catEntries = Object.entries(catMap).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 4);
  const DONUT_COLORS = ["#22c55e", "#2660a4", "#f59e0b", "#8b5cf6"];
  const donutVals   = catEntries.length ? catEntries.map(function(e) { return e[1]; }) : [1];
  const donutLabels = catEntries.length ? catEntries.map(function(e) { return e[0]; }) : ["Tidak ada data"];
  const donutColors = catEntries.length ? catEntries.map(function(_, i) { return DONUT_COLORS[i] || "#d4ddd2"; }) : ["#e8ede6"];

  // ── Donut legend HTML ─────────────────────────────────────────
  const donutLegHtml = catEntries.length
    ? catEntries.map(function(e, i) {
        const pct = chartTotalIn > 0 ? Math.round((e[1] / chartTotalIn) * 100) : 0;
        return "<div class=\"dl-item\">"
          + "<div class=\"dl-left\"><div class=\"dl-dot\" style=\"background:" + (DONUT_COLORS[i] || "#d4ddd2") + "\"></div>"
          + "<div><div class=\"dl-name\">" + escHtml(e[0]) + "</div><div class=\"dl-pct\">" + pct + "%</div></div></div>"
          + "<div class=\"dl-amt\">" + rp(e[1]) + "</div>"
          + "</div>";
      }).join("")
    : "<div class=\"empty-donut-leg\"><i class=\"ti ti-chart-donut\"></i>Belum ada data</div>";

  // ── Transaction rows ────────────────────────────────────────
  const makeRow = function(t, idx) {
    const isIn    = t.jenis === "pemasukan";
    const isVoid  = !!t.voidedAt;
    const tglDisp = new Date(t.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
    const rowCls   = "fin-row " + (isVoid ? "trx-voided" : (isIn ? "fin-row-in" : "fin-row-out"));
    const reasonHt = isVoid
      ? "<div class=\"trx-void-reason\" title=\"Dibatalkan: " + escHtml(t.voidReason || "—") + "\">"
        + "<i class=\"ti ti-ban\"></i> Dibatalkan: " + escHtml(t.voidReason || "—") + "</div>"
      : "";
    const aksiHt = isVoid
      ? "<span class=\"trx-void-badge\">VOID</span>"
      : "<button type=\"button\" class=\"icon-btn danger\" title=\"Batalkan transaksi\""
        + " data-id=\"" + escHtml(t.id) + "\""
        + " data-desc=\"" + escHtml(t.keterangan || t.kategori || "(tanpa keterangan)") + "\""
        + " data-amount=\"" + (isIn ? "+" : "−") + escHtml(rp(t.jumlah)) + "\""
        + " onclick=\"openVoidModal(this)\">"
        + "<i class=\"ti ti-ban\"></i></button>";
    return "<div class=\"" + rowCls + "\" data-tanggal=\"" + escHtml(t.tanggal || "") + "\" data-idx=\"" + idx + "\" onclick=\"if(event.target.closest('.icon-btn,.fr-bukti-thumb,a,button'))return;openTrxDetail(" + idx + ")\">"
      + "<div class=\"fr-td muted mono\">" + tglDisp + "</div>"
      + "<div class=\"fr-td fr-desc\">"
      + "<div class=\"fr-desc-title\">"
      +   (t.keterangan
        ? escHtml(t.keterangan)
        : t.kategori
        ? "<span style=\"font-style:italic;color:var(--txt3);font-weight:500\">(" + escHtml(t.kategori) + ")</span>"
        : "—")
      + "</div>"
      + "<div class=\"fr-desc-meta\">#" + escHtml(String(t.id).slice(-6)) + (t.jam ? " · " + escHtml(t.jam) : "")
      + (t.bayar === "cash" ? " · <span class=\"fr-bayar-cash\">💵 Cash</span>" : t.bayar === "qris" ? " · <span class=\"fr-bayar-qris\">⚡ QRIS</span>" : "")
      + (t.buktiUrl ? " · <a href=\"" + escHtml(t.buktiUrl) + "\" target=\"_blank\" title=\"Lihat bukti foto\"><img src=\"" + escHtml(t.buktiUrl) + "\" class=\"fr-bukti-thumb\" loading=\"lazy\"></a>" : "")
      + (t.dicatatOleh
        ? (function() {
            const dispNm = userNameMap[t.dicatatOleh] || t.dicatatOleh;
            const usrShift = userShiftMap[t.dicatatOleh] || "siang";
            const shiftIc  = usrShift === "malam" ? "ti-moon" : "ti-sun";
            const shiftCls = usrShift === "malam" ? "fr-shift-malam" : "fr-shift-siang";
            return "<span class=\"fr-pencatat\" title=\"Dicatat oleh " + escHtml(dispNm) + " · Shift " + (usrShift === "malam" ? "Malam" : "Siang") + "\">"
              + "<i class=\"ti ti-user-edit\"></i>" + escHtml(dispNm)
              + "<span class=\"" + shiftCls + "\"><i class=\"ti " + shiftIc + "\"></i></span>"
              + "</span>";
          })()
        : "")
      + "</div>"
      + reasonHt
      + "</div>"
      + "<div class=\"fr-td\"><span class=\"cat-tag\">" + escHtml(t.kategori || "—") + "</span></div>"
      + "<div class=\"fr-td fr-amount-col\">"
      + "<div class=\"" + (isIn ? "amt-in" : "amt-out") + "\">" + (isIn ? "+" : "−") + rp(t.jumlah) + "</div>"
      + "<span class=\"t-badge " + (isIn ? "in" : "out") + "\"><i class=\"ti ti-arrow-" + (isIn ? "up" : "down") + "\" style=\"font-size:9px;margin-right:2px\"></i>" + (isIn ? "Masuk" : "Keluar") + "</span>"
      + "</div>"
      + "<div class=\"fr-td right fr-act\">" + aksiHt + "</div>"
      + "</div>";
  };

  const rows = sortedTbl.length > 0
    ? "<div id=\"trxRows\">" + sortedTbl.map(makeRow).join("") + "</div>"
    : "<div class=\"empty-state\" id=\"emptyState\"><i class=\"ti ti-receipt-off\"></i>Belum ada transaksi di periode ini</div>";

  const hasDateFilter = !!tDari;

  const chartLabelsJson = safeJson(chartLabels);
  const chartInJson     = safeJson(chartIn);
  const chartOutJson    = safeJson(chartOut);
  const donutValsJson   = safeJson(donutVals);
  const donutLabelsJson = safeJson(donutLabels);
  const donutColorsJson = safeJson(donutColors);
  const byDateLabelsJson = safeJson(byDateLabels);
  const byDateInpJson    = safeJson(byDateInp);
  const byDateOutJson    = safeJson(byDateOut);
  const byDayInpJson     = safeJson(byDayInp);
  const byDayOutJson     = safeJson(byDayOut);
  const byHourInpJson    = safeJson(byHourInp);
  const byHourOutJson    = safeJson(byHourOut);

  const dashExtraCss = [
    // ── Stat card upgrades ───────────────────────────────────────
    ".fin-stat-card.income{background:linear-gradient(145deg,#edfaf2 0%,#fff 65%);border-color:rgba(34,197,94,.2)}",
    ".fin-stat-card.expense{background:linear-gradient(145deg,#fdf3f3 0%,#fff 65%);border-color:rgba(239,68,68,.2)}",
    ".fin-stat-card.saldo{background:linear-gradient(145deg,#eef5ff 0%,#fff 65%);border-color:rgba(38,96,164,.2)}",
    ".fin-stat-card.trx{background:linear-gradient(145deg,#fdf8ec 0%,#fff 65%);border-color:rgba(196,127,26,.2)}",
    ".fin-stat-card::before{height:4px!important}",
    ".fin-stat-icon{width:40px!important;height:40px!important;border-radius:12px!important;font-size:18px!important}",
    ".fin-stat-card{border-radius:14px!important;padding:20px 22px!important}",
    ".fin-stat-val{font-size:22px!important}",
    // ── Period toggle active — accent color ──────────────────────
    ".fin-period-btn.active{background:var(--accent)!important;color:#fff!important;box-shadow:0 2px 6px rgba(38,96,164,.22)!important}",
    // ── Transaction row color accents ────────────────────────────
    ".fin-row-in{border-left:3px solid rgba(34,197,94,.45)}",
    ".fin-row-out{border-left:3px solid rgba(239,68,68,.4)}",
    ".fin-row-in:hover{background:#f0fdf4!important}",
    ".fin-row-out:hover{background:#fff5f5!important}",
    // ── Tabel 5-kolom (merge Jumlah+Tipe) ───────────────────────
    ".fin-tbl-head,.fin-row{grid-template-columns:110px 1fr 150px 195px 54px!important}",
    ".fr-amount-col{flex-direction:column;align-items:flex-start;gap:4px;justify-content:center}",
    ".fr-bayar-cash{display:inline-flex;align-items:center;gap:2px;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(34,197,94,.12);color:#16a34a;letter-spacing:.02em}",
    ".fr-bayar-qris{display:inline-flex;align-items:center;gap:2px;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(38,96,164,.12);color:var(--accent);letter-spacing:.02em}",
    "@media(max-width:768px){.fin-tbl-head,.fin-row{grid-template-columns:90px 1fr 150px!important}.fin-th:nth-child(3),.fr-td:nth-child(3){display:none!important}.fin-th:nth-child(n+5),.fr-td:nth-child(n+5){display:none!important}}",
    // ── Cards rounded ───────────────────────────────────────────
    ".fin-pgbar{position:fixed;top:0;left:0;z-index:9999;height:3px;background:var(--accent);width:0;pointer-events:none}",
    ".fin-pgbar.run{width:82%;transition:width 9s cubic-bezier(.12,0,.39,0)}",
    ".fin-pgbar.done{width:100%;opacity:0;transition:width .15s ease,opacity .4s ease .15s}",
    "@keyframes finSpin{to{transform:rotate(360deg)}}",
    ".fin-spin{display:inline-block;animation:finSpin .65s linear infinite}",
    ".fin-table-card{border-radius:14px!important}",
    ".fin-charts-row .card{border-radius:14px!important}",
    ".fin-filter-bar{box-shadow:0 1px 6px rgba(0,0,0,.05);border-radius:12px!important}",
    ".fin-kas-card{background:var(--surface);border:1.5px solid rgba(38,96,164,.18);border-radius:13px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap}",
    ".fin-kas-left{display:flex;align-items:center;gap:12px}",
    ".fin-kas-icon{width:38px;height:38px;background:rgba(38,96,164,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:19px;flex-shrink:0}",
    ".fin-kas-lbl{font-size:13px;font-weight:700;color:var(--txt)}",
    ".fin-kas-note{font-size:11px;color:var(--txt3);margin-top:2px}",
    ".fin-kas-right{display:flex;align-items:center;gap:6px}",
    ".fin-kas-pfx{font-size:14px;font-weight:700;color:var(--txt2)}",
    ".fin-kas-inp{width:170px;padding:8px 12px;border:1.5px solid var(--border2);border-radius:9px;font-size:16px;font-weight:700;font-family:var(--ff-mono);color:var(--txt);outline:none;background:var(--surface2);text-align:right}",
    ".fin-kas-inp:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(38,96,164,.12);background:var(--surface)}",
    ".fin-kas-inp::placeholder{font-weight:600;font-size:15px;color:var(--txt3);opacity:.55;letter-spacing:0}",
    ".fin-bayar-card{display:grid;grid-template-columns:1fr 1fr;border:1.5px solid var(--border);border-radius:13px;overflow:hidden;margin-bottom:14px;background:var(--surface)}",
    ".fin-bayar-item{padding:14px 18px}",
    ".fin-bayar-item+.fin-bayar-item{border-left:1px solid var(--border)}",
    ".fin-bayar-lbl{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:5px;margin-bottom:6px}",
    ".fin-bayar-val{font-size:20px;font-weight:700;font-family:var(--ff-mono)}",
    ".fin-bayar-val.cash{color:#16a34a}",
    ".fin-bayar-val.qris{color:var(--accent)}",
    ".fin-bayar-sub{font-size:11px;color:var(--txt3);margin-top:3px}",
    // ── Mobile FAB ──────────────────────────────────────────────
    ".fin-fab{display:none;position:fixed;bottom:80px;left:50%;right:auto;top:auto;transform:translateX(-50%);z-index:98;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;border-radius:16px;padding:13px 22px;font-size:14px;font-weight:700;font-family:var(--ff);box-shadow:0 4px 18px rgba(38,96,164,.38);cursor:pointer;transition:opacity .2s ease}",
    ".fin-fab:hover{opacity:.9}",
    ".fin-fab i{font-size:18px}",
    "@media(max-width:768px){.fin-fab{display:flex!important}.topbar-actions .btn-primary{display:none!important}}",
    // ── Search input polish ─────────────────────────────────────
    ".fin-search-wrap{border-radius:9px!important;background:#f8faf7}",
    ".fin-search-inp{background:transparent!important}",
    // ── Filter chips + pagination di tabel transaksi ────────────
    ".fin-tbl-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto;min-width:0}",
    ".fin-tbl-chip{padding:6px 12px;background:var(--surface2);border:1px solid var(--border2);border-radius:18px;font-size:11.5px;font-weight:600;color:var(--txt2);cursor:pointer;font-family:var(--ff);white-space:nowrap;transition:all .15s}",
    ".fin-tbl-chip:hover{background:var(--surface);color:var(--txt)}",
    ".fin-tbl-chip.active{background:linear-gradient(135deg,#3b82f6,#2563eb);border-color:#2563eb;color:#fff;box-shadow:0 2px 6px rgba(59,130,246,.25)}",
    ".fin-tbl-date{padding:5px 8px;background:var(--surface);border:1px solid var(--border2);border-radius:7px;font-size:11px;color:var(--txt);font-family:var(--ff);outline:none}",
    ".fin-tbl-date:focus{border-color:var(--accent)}",
    ".fin-pagination{display:flex;align-items:center;gap:4px;margin-left:auto}",
    ".fin-pg-btn{min-width:28px;height:28px;padding:0 8px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;font-size:11.5px;font-weight:600;color:var(--txt2);cursor:pointer;font-family:var(--ff);display:inline-flex;align-items:center;justify-content:center}",
    ".fin-pg-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}",
    ".fin-pg-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}",
    ".fin-pg-btn:disabled{opacity:.4;cursor:not-allowed}",
    ".fin-pg-info{font-size:11px;color:var(--txt3);padding:0 8px;font-family:var(--ff-mono)}",
    // Mobile: toolbar wrap, search & chips stack vertikal (search width 100% bukan flex:0)
    "@media(max-width:640px){"
    +   ".fin-tbl-toolbar{flex-wrap:wrap!important;padding:12px 14px!important}"
    +   ".fin-search-wrap{flex:1 1 100%!important;min-width:0!important;width:100%!important}"
    +   ".fin-search-inp{font-size:16px!important;padding:10px 12px 10px 36px!important}"
    +   ".fin-tbl-chips{width:100%;margin-left:0;margin-top:0;justify-content:flex-start}"
    +   ".fin-tbl-chip{padding:7px 14px;font-size:12px}"
    +   ".fin-tbl-footer{flex-direction:column!important;align-items:flex-start!important;gap:10px;padding:14px!important;padding-bottom:18px!important}"
    +   ".fin-tf-left{width:100%}"
    +   ".fin-pagination{margin:0!important;width:100%;justify-content:flex-start!important;flex-wrap:wrap;gap:5px}"
    +   ".fin-pg-btn{min-width:32px;height:32px}"
    +   ".fin-table-card{margin-bottom:180px!important}"
    +   ".fr-desc-meta,.trx-void-reason{display:none!important}"
    +   ".fin-row{padding:14px!important;cursor:pointer;position:relative;padding-right:28px!important}"
    +   ".fin-tbl-head{padding:12px 14px!important}"
    +   ".fin-row::after{content:'›';position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:18px;font-weight:300;opacity:.5;pointer-events:none}"
    +   ".fr-desc-title{font-weight:600!important;line-height:1.4!important;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;word-break:break-word}"
    +   // Force fit viewport — semua card di dashboard
    +   "body,html{overflow-x:hidden;max-width:100%}"
    +   ".page,.page>*,.fin-stat-card,.fin-kas-card,.fin-bayar-card,.fin-table-card,.fin-chart-card{box-sizing:border-box!important;max-width:100%!important;min-width:0!important}"
    +   ".dash-topbar{flex-wrap:wrap;gap:10px}"
    +   ".dash-topbar>*{min-width:0;max-width:100%}"
    +   ".page-title{font-size:18px!important;flex-wrap:wrap}"
    +   ".page-sub{font-size:11.5px}"
    +   ".topbar-actions{flex-wrap:wrap;gap:8px}"
    +   ".topbar-actions>*{flex:1 1 calc(50% - 4px);justify-content:center}"
    +   // Saldo kas card lebih compact
    +   ".fin-kas-card{padding:12px 14px!important;gap:10px!important}"
    +   ".fin-kas-lbl{font-size:13px}"
    +   ".fin-kas-sub{font-size:10.5px}"
    +   // Cash / QRIS row pertahankan 2 col tapi padding compact
    +   ".fin-bayar-card{grid-template-columns:1fr 1fr!important;gap:0!important}"
    +   ".fin-bayar-item{padding:14px 14px!important}"
    +   ".fin-bayar-lbl{font-size:10.5px}"
    +   ".fin-bayar-val{font-size:18px!important;word-break:break-all}"
    +   ".fin-bayar-sub{font-size:10px;line-height:1.4}"
    +   // Stat cards (Pemasukan/Pengeluaran/Saldo/Trx)
    +   ".fin-stat-card{padding:14px 16px!important;border-radius:12px!important}"
    +   ".fin-stat-val{font-size:20px!important;word-break:break-all;line-height:1.2}"
    +   ".fin-stat-lbl{font-size:10.5px}"
    +   ".fin-stat-foot{font-size:10.5px;flex-wrap:wrap;gap:3px}"
    +   ".fin-stat-icon{width:32px!important;height:32px!important;font-size:15px!important}"
    +   // Chart card
    +   ".fin-chart-hdr{padding:12px 14px 6px;gap:8px}"
    +   ".fin-chart-body{padding:4px 12px 14px;height:220px}"
    +   ".fin-chart-stats{grid-template-columns:repeat(3,1fr)}"
    +   ".fin-cs-item{padding:9px 8px}"
    +   ".fin-cs-val{font-size:12px;word-break:break-all}"
    +   ".fin-cs-lbl{font-size:9px}"
    + "}",
    // ── Chart cards redesign ─────────────────────────────────────
    ".fin-chart-card{background:var(--surface);border-radius:14px;border:1.5px solid var(--border);overflow:hidden}",
    ".fin-chart-hdr{display:flex;align-items:flex-start;justify-content:space-between;padding:16px 18px 8px;gap:12px;flex-wrap:wrap}",
    ".fin-chart-title{font-size:13px;font-weight:700;color:var(--txt);margin-bottom:3px}",
    ".fin-chart-sub{font-size:11px;color:var(--txt3);font-family:var(--ff-mono);margin-top:2px}",
    ".fin-chart-leg{display:flex;gap:14px;font-size:11px;color:var(--txt3);flex-shrink:0;padding-top:2px;flex-wrap:wrap}",
    ".fin-chart-leg span{display:flex;align-items:center;gap:5px;white-space:nowrap}",
    ".fin-chart-body{padding:4px 16px 16px;height:260px}",
    ".fin-chart-stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border)}",
    ".fin-cs-item{padding:11px 14px;text-align:center}",
    ".fin-cs-item+.fin-cs-item{border-left:1px solid var(--border)}",
    ".fin-cs-lbl{font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:4px}",
    ".fin-cs-val{font-size:13px;font-weight:700;font-family:var(--ff-mono)}",
    ".fin-cs-val.inc{color:#16a34a}",
    ".fin-cs-val.out{color:#dc2626}",
    ".fin-cs-val.mg{color:var(--accent)}",
    // ── Menu Item Picker (custom bottom-sheet) ─────────────────
    ".mip-wrap{position:relative;width:100%}",
    ".mip-sel{display:none}",
    ".mip-btn{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:1px solid var(--border2);border-radius:8px;background:var(--surface);font-family:var(--ff);font-size:13px;color:var(--txt3);cursor:pointer;text-align:left;min-height:38px;min-width:0;box-sizing:border-box;transition:border-color .15s}",
    ".mip-btn:hover{border-color:var(--accent)}",
    ".mip-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".mip-text-filled{color:var(--txt);font-weight:500}",
    ".mip-overlay{display:none;position:fixed;inset:0;z-index:1100;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);align-items:flex-end;justify-content:center;animation:mipFadeIn .2s ease}",
    "@keyframes mipFadeIn{from{opacity:0}to{opacity:1}}",
    ".mip-overlay.open{display:flex}",
    ".mip-sheet{width:100%;max-width:520px;background:var(--surface);border-radius:18px 18px 0 0;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;animation:mipSlideUp .25s cubic-bezier(.32,.72,.55,1)}",
    "@keyframes mipSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}",
    "@media(min-width:641px){.mip-overlay{align-items:center;padding:16px}.mip-sheet{border-radius:14px;max-height:75vh}}",
    ".mip-sheet-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid var(--border)}",
    ".mip-sheet-title{font-size:15px;font-weight:700;color:var(--txt)}",
    ".mip-close{background:none;border:none;color:var(--txt3);cursor:pointer;font-size:20px;padding:4px 6px;display:flex;align-items:center}",
    ".mip-search-wrap{position:relative;padding:12px 16px 8px;background:var(--surface)}",
    ".mip-search-wrap i{position:absolute;left:26px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:15px}",
    ".mip-search{width:100%;padding:11px 12px 11px 38px;border:1px solid var(--border2);border-radius:10px;font-size:14px;color:var(--txt);outline:none;background:var(--surface2);font-family:var(--ff)}",
    ".mip-search:focus{border-color:var(--accent);background:var(--surface)}",
    ".mip-list{flex:1;overflow-y:auto;padding:4px 12px 16px;-webkit-overflow-scrolling:touch}",
    ".mip-group-lbl{font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;padding:14px 8px 6px}",
    ".mip-item{display:block;width:100%;text-align:left;padding:12px 14px;background:transparent;border:none;border-radius:9px;font-family:var(--ff);font-size:13.5px;color:var(--txt);cursor:pointer;transition:background .12s;line-height:1.4}",
    ".mip-item:hover{background:var(--surface2)}",
    ".mip-item.active{background:rgba(59,130,246,.12);color:#3b82f6;font-weight:600}",
    // Detail transaksi modal
    ".trx-detail-sheet{max-width:480px;box-sizing:border-box;width:100%}",
    ".trx-dt-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 16px 12px;box-sizing:border-box;width:100%}",
    ".trx-dt-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--border);min-width:0}",
    ".trx-dt-row:last-child{border-bottom:none}",
    ".trx-dt-l{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em;flex-shrink:0;width:82px;padding-top:2px}",
    ".trx-dt-v{font-size:13.5px;color:var(--txt);text-align:right;flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-word;line-height:1.5}",
    ".trx-dt-v *{max-width:100%}",
    ".trx-dt-v img{height:auto}",
    ".trx-dt-footer{padding:14px 16px 18px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;box-sizing:border-box}",
    ".trx-dt-btn-void{flex:1 1 140px;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 12px;background:#fee2e2;color:#b91c1c;border:1px solid rgba(239,68,68,.3);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--ff)}",
    ".trx-dt-btn-void:hover{background:#fecaca}",
    ".trx-dt-btn-close{flex:1 1 100px;min-width:0;padding:11px 12px;background:var(--surface2);color:var(--txt);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--ff)}",
    ".trx-dt-btn-close:hover{background:var(--surface)}",
    // ── Toast notifikasi (compact, slide-in dari kanan atas) ────
    ".toast{position:fixed!important;top:20px!important;right:20px!important;left:auto!important;bottom:auto!important;width:auto!important;max-width:340px!important;min-width:0!important;height:auto!important;max-height:none!important;padding:12px 16px!important;border-radius:12px!important;font-size:13px!important;font-weight:600!important;z-index:9998!important;opacity:0;transform:translateX(120%);transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .2s ease;display:inline-flex!important;align-items:center;gap:9px;box-shadow:0 6px 20px rgba(15,23,42,.15);line-height:1.4;border:1px solid;border-left:4px solid currentColor;white-space:normal!important;pointer-events:none}",
    ".toast.show{opacity:1;transform:translateX(0);pointer-events:auto}",
    ".toast.ok{background:#f0fdf4!important;color:#15803d!important;border-color:#22c55e}",
    ".toast.err{background:#fef2f2!important;color:#b91c1c!important;border-color:#ef4444}",
    ".toast > i{font-size:20px;flex-shrink:0;line-height:1}",
    ".toast .toast-msg{color:var(--txt);font-weight:500}",
    "@media(max-width:540px){.toast{top:auto!important;bottom:84px!important;left:14px!important;right:14px!important;max-width:none!important;transform:translateY(120%)}.toast.show{transform:translateY(0)}}",
    // Highlight row transaksi yg baru di-input
    "@keyframes finRowFlash{0%{background:rgba(34,197,94,.25)!important;box-shadow:inset 4px 0 0 0 #22c55e}50%{background:rgba(34,197,94,.12)!important;box-shadow:inset 4px 0 0 0 #22c55e}100%{background:transparent!important;box-shadow:none}}",
    ".fin-row.flash-new{animation:finRowFlash 4s ease-out}",
    // ── Dropzone upload bukti foto ───────────────────────────────
    ".fin-dropzone{border:1.5px dashed var(--border2);border-radius:10px;padding:18px 14px;text-align:center;cursor:pointer;transition:all .15s;background:var(--surface2);color:var(--txt3);font-size:12px;user-select:none}",
    ".fin-dropzone:hover{border-color:var(--accent);background:rgba(38,96,164,.06);color:var(--txt2)}",
    ".fin-dropzone.has-file{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.04);cursor:default}",
    ".fin-dz-icon{font-size:26px;margin-bottom:5px;display:block;line-height:1}",
    ".fin-dz-lbl{font-size:12px;font-weight:600;margin-bottom:3px;color:inherit}",
    ".fin-dz-hint{font-size:10px;color:var(--txt3);margin-top:3px}",
    ".fin-dz-prev{display:flex;flex-direction:column;align-items:center;gap:6px}",
    ".fin-dz-prev-img{max-width:100%;max-height:160px;border-radius:8px;object-fit:contain;box-shadow:0 2px 10px rgba(0,0,0,.1)}",
    ".fin-dz-prev-name{font-size:10px;color:var(--txt3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".fin-rm-btn{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 12px;border:1px solid var(--border2);border-radius:6px;background:var(--surface2);color:var(--txt3);font-size:12px;cursor:pointer;font-family:var(--ff);transition:all .15s}",
    ".fin-rm-btn:hover{border-color:var(--red);color:var(--red);background:rgba(239,68,68,.06)}",
    // ── Thumbnail bukti di baris tabel ──────────────────────────
    ".fr-bukti-thumb{width:28px;height:28px;border-radius:5px;object-fit:cover;cursor:pointer;border:1px solid var(--border);transition:opacity .15s;vertical-align:middle;margin-left:4px}",
    ".fr-bukti-thumb:hover{opacity:.75;box-shadow:0 1px 6px rgba(0,0,0,.12)}",
    // ── Detail chart card redesign ───────────────────────────────
    ".fdc-top{padding:18px 20px 0}",
    ".fdc-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}",
    ".fdc-title{font-size:14px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:9px}",
    ".fdc-title-icon{width:30px;height:30px;border-radius:9px;background:rgba(34,197,94,.12);display:flex;align-items:center;justify-content:center;color:#22c55e;font-size:16px;flex-shrink:0}",
    ".fdc-period{font-size:11px;color:var(--txt3);font-family:var(--ff-mono);white-space:nowrap}",
    ".fdc-seg{display:flex;background:var(--surface2);border-radius:26px;padding:3px;margin:0 20px 12px}",
    ".fdc-seg-btn{flex:1;padding:7px 8px;border-radius:22px;border:none;background:transparent;color:var(--txt3);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--ff);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}",
    ".fdc-seg-btn.active{background:var(--surface);color:var(--txt);box-shadow:0 1px 8px rgba(0,0,0,.15);border:1px solid var(--border)}",
    ".fdc-seg-btn i{font-size:13px}",
    ".fdc-legend-row{display:flex;align-items:center;padding:0 20px 10px;border-bottom:1px solid var(--border)}",
    ".fdc-leg-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--txt3);margin-right:14px}",
    ".fdc-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}",
    ".fdc-sub-label{margin-left:auto;font-size:10px;color:var(--txt3);font-family:var(--ff-mono)}",
    // ── Karyawan day-picker bar ──────────────────────────────────
    ".kya-day-bar{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px 10px;background:rgba(30,64,175,.05);border:1px solid rgba(30,64,175,.15);border-radius:12px;flex-wrap:wrap}",
    ".kya-day-bar-lbl{font-size:11px;font-weight:700;color:#1e40af;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.06em;padding:0 6px}",
    ".kya-day-chip{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:9px;background:var(--surface);border:1px solid var(--border2);text-decoration:none;transition:all .14s;min-width:88px}",
    ".kya-day-chip:hover{border-color:#3b82f6;background:rgba(59,130,246,.05)}",
    ".kya-day-chip.active{background:linear-gradient(135deg,#3b82f6,#2563eb);border-color:#2563eb;box-shadow:0 2px 8px rgba(59,130,246,.3)}",
    ".kya-day-chip.active .kya-day-lbl,.kya-day-chip.active .kya-day-sub{color:#fff}",
    ".kya-day-lbl{font-size:12px;font-weight:700;color:var(--txt)}",
    ".kya-day-sub{font-size:10px;color:var(--txt3);margin-top:2px;font-family:var(--ff-mono)}",
    "@media(max-width:540px){.kya-day-bar-lbl{flex-basis:100%}.kya-day-chip{flex:1;min-width:0}}",
    // ── Pencatat di tabel transaksi ──────────────────────────────
    ".fr-pencatat{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--txt3);background:var(--surface2);padding:1px 4px 1px 7px;border-radius:8px;margin-left:4px}",
    ".fr-pencatat > i{font-size:11px}",
    ".fr-shift-siang,.fr-shift-malam{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;margin-left:2px}",
    ".fr-shift-siang{background:rgba(245,158,11,.18);color:#d97706}",
    ".fr-shift-malam{background:rgba(99,102,241,.18);color:#6366f1}",
    ".fr-shift-siang i,.fr-shift-malam i{font-size:10px}",
    // ── Analisis Target section ──────────────────────────────────
    ".an-section{margin-bottom:20px}",
    ".an-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px}",
    ".an-title{font-size:14px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:9px}",
    ".an-title-ic{width:30px;height:30px;border-radius:9px;background:rgba(168,85,247,.12);color:#a855f7;display:flex;align-items:center;justify-content:center;font-size:16px}",
    ".an-sub{font-size:11px;color:var(--txt3);font-family:var(--ff-mono)}",
    ".an-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}",
    "@media(max-width:768px){.an-grid{grid-template-columns:1fr}}",
    ".an-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden}",
    ".an-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent-bar,#22c55e)}",
    ".an-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}",
    ".an-scope{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txt3)}",
    ".an-status{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:700;color:#fff}",
    ".an-amount-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;flex-wrap:wrap}",
    ".an-amount{font-size:18px;font-weight:700;font-family:var(--ff-mono);color:var(--txt)}",
    ".an-target{font-size:11px;color:var(--txt3);font-family:var(--ff-mono)}",
    ".an-progress{height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-bottom:6px}",
    ".an-progress-fill{height:100%;border-radius:3px;transition:width .35s ease}",
    ".an-margin{font-size:11px;color:var(--txt2);display:flex;align-items:center;gap:5px}",
    ".an-margin.pos{color:#22c55e}",
    ".an-margin.neg{color:#ef4444}",
    // Breakdown collapsible
    ".an-breakdown{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 18px;margin-bottom:12px}",
    ".an-breakdown summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:6px;list-style:none;user-select:none}",
    ".an-breakdown summary::-webkit-details-marker{display:none}",
    ".an-breakdown summary::after{content:'\\25BE';margin-left:auto;color:var(--txt3);transition:transform .2s}",
    ".an-breakdown[open] summary::after{transform:rotate(180deg)}",
    ".an-bd-list{margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}",
    ".an-bd-item{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:11.5px}",
    ".an-bd-item span:first-child{color:var(--txt2)}",
    ".an-bd-item span:last-child{font-weight:600;color:var(--txt);font-family:var(--ff-mono)}",
    ".an-bd-total{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:var(--txt)}",
    ".an-bd-total span:last-child{font-family:var(--ff-mono)}",
    // Simulator
    ".an-sim{background:linear-gradient(135deg,rgba(59,130,246,.06),rgba(168,85,247,.04));border:1px solid rgba(59,130,246,.18);border-radius:14px;padding:14px 18px}",
    ".an-sim-hdr{font-size:12px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:6px;margin-bottom:10px}",
    ".an-sim-body{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px}",
    "@media(max-width:540px){.an-sim-body{grid-template-columns:1fr}}",
    ".an-sim-cell{padding:8px 12px;background:var(--surface);border-radius:9px;border:1px solid var(--border)}",
    ".an-sim-cell-lbl{font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}",
    ".an-sim-cell-val{font-size:13px;font-weight:700;font-family:var(--ff-mono);color:var(--txt)}",
    ".an-sim-rec{margin-top:10px;padding:10px 14px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:7px}",
    // Mini version (dashboard ringkas)
    ".an-detail-link{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.08);transition:background .15s}",
    ".an-detail-link:hover{background:rgba(59,130,246,.15)}",
    ".an-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}",
    "@media(max-width:768px){.an-mini-grid{grid-template-columns:1fr}}",
    ".an-mini{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;position:relative;overflow:hidden}",
    ".an-mini::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent-bar,#22c55e)}",
    ".an-mini-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px}",
    ".an-mini-lbl{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em}",
    ".an-mini-amt{font-size:14px;font-weight:700;font-family:var(--ff-mono);color:var(--txt);margin-bottom:6px}",
    ".an-mini-target{font-size:11px;color:var(--txt3);font-weight:500}",
    ".an-mini-prog{height:4px;background:var(--surface2);border-radius:2px;overflow:hidden}",
    ".an-mini-prog div{height:100%;border-radius:2px;transition:width .35s ease}",
    // Target badge utk karyawan di header status target
    ".an-target-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:linear-gradient(135deg,rgba(168,85,247,.12),rgba(99,102,241,.12));border:1px solid rgba(168,85,247,.3);border-radius:20px;font-size:12.5px;font-weight:600;color:var(--txt);white-space:nowrap}",
    ".an-target-badge i{color:#a855f7;font-size:14px}",
    ".an-target-badge strong{color:#a855f7;font-weight:800;font-family:var(--ff-mono);letter-spacing:.02em}",
    // Disclaimer / catatan
    ".an-note{display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:10px 14px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.18);border-radius:10px;font-size:11.5px;color:var(--txt2);line-height:1.5}",
    ".an-note i{color:#f59e0b;font-size:15px;flex-shrink:0;margin-top:1px}",
    ".an-note strong{color:var(--txt);font-weight:700}",
  ].join("");

  return docHeadV4("Keuangan")
    + "<style>" + dashExtraCss + "</style>"
    + "</head><body>"

    + "<div class=\"layout\">"
    + buildFinanceSidebar(token, "keuangan", role, displayName, defaultShift)
    + "<div class=\"main-wrap\">"

    // Mobile topbar
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-circle-number-8\"></i></div>"
    + "<div><div class=\"topbar-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"topbar-label\">Keuangan · " + bulanLabel + "</div></div>"
    + "</div>"
    + "<div class=\"topbar-right\">" + buildFinanceTopbarProfile(role, displayName) + "</div>"
    + "</header>"

    + "<div class=\"page\">"

    + "<button class=\"fin-fab\" onclick=\"openTrxModal()\"><i class=\"ti ti-plus\"></i> Catat Transaksi</button>"

    // ── Desktop topbar ──────────────────────────────────────────
    + "<div class=\"dash-topbar\">"
    + "<div><div class=\"page-title\">Dashboard Keuangan"
    + "<span style=\"margin-left:10px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;"
    + "background:" + (isOwner ? "rgba(45,102,36,.1)" : "rgba(30,64,175,.1)") + ";"
    + "color:" + (isOwner ? "#2d6624" : "#1e40af") + ";vertical-align:middle\">"
    + (isOwner ? "Owner" : "Partner") + "</span></div>"
    + "<div class=\"page-sub\">"
    + (isOwner ? "Laporan pemasukan, pengeluaran &amp; saldo" : "Tampilan hari ini — catat transaksi shift kamu")
    + "</div></div>"
    + "<div class=\"topbar-actions\">"
    + (isOwner ? "<a href=\"/operasional/kategori\" class=\"btn-outline\"><i class=\"ti ti-settings\" style=\"font-size:14px\"></i> Kategori</a>" : "")
    + "<button class=\"btn-primary\" onclick=\"openTrxModal()\"><i class=\"ti ti-plus\" style=\"font-size:14px\"></i> Catat Transaksi</button>"
    + "</div></div>"

    // ── Saldo Kas Awal (modal kembalian) ────────────────────────
    + "<div class=\"fin-kas-card\">"
    + "<div class=\"fin-kas-left\">"
    + "<div class=\"fin-kas-icon\"><i class=\"ti ti-wallet\"></i></div>"
    + "<div>"
    + "<div class=\"fin-kas-lbl\">Saldo Kas Awal Hari Ini</div>"
    + "<div class=\"fin-kas-note\"><i class=\"ti ti-info-circle\" style=\"font-size:11px\"></i> Modal kembalian — tidak dihitung sebagai pemasukan</div>"
    + "</div>"
    + "</div>"
    + "<div class=\"fin-kas-right\">"
    + "<span class=\"fin-kas-pfx\">Rp</span>"
    + "<input id=\"finSaldoKas\" type=\"text\" inputmode=\"numeric\" class=\"fin-kas-inp\" placeholder=\"0\" oninput=\"fmtSaldoKas(this);saveSaldoKas()\">"
    + "</div>"
    + "</div>"

    // ── Breakdown metode pembayaran ─────────────────────────────
    + "<div class=\"fin-bayar-card\">"
    + "<div class=\"fin-bayar-item\">"
    + "<div class=\"fin-bayar-lbl\"><i class=\"ti ti-cash\" style=\"font-size:14px\"></i> Cash</div>"
    + "<div class=\"fin-bayar-val cash\">" + rp(totalCash) + "</div>"
    + "<div class=\"fin-bayar-sub\">Pemasukan via Cash</div>"
    + "</div>"
    + "<div class=\"fin-bayar-item\">"
    + "<div class=\"fin-bayar-lbl\"><i class=\"ti ti-qrcode\" style=\"font-size:14px\"></i> QRIS</div>"
    + "<div class=\"fin-bayar-val qris\">" + rp(totalQris) + "</div>"
    + "<div class=\"fin-bayar-sub\">Pemasukan via QRIS</div>"
    + "</div>"
    + "</div>"

    // ── Stat grid (4 cards dengan colored top border) ───────────
    + "<div class=\"fin-stat-grid\">"

    + "<div class=\"fin-stat-card income\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Pemasukan</div>"
    + "<div class=\"fin-stat-icon income\"><i class=\"ti ti-trending-up\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + rp(totalIn) + "</div>"
    + "<div class=\"fin-stat-foot\" style=\"flex-direction:column;align-items:flex-start;gap:3px\">"
    + "<div>"
    + (inDelta !== 0
        ? "<span class=\"" + (inDelta >= 0 ? "fin-badge-up" : "fin-badge-down") + "\"><i class=\"ti ti-arrow-" + (inDelta >= 0 ? "up" : "down") + "\" style=\"font-size:10px\"></i> " + Math.abs(inDelta) + "%</span>&nbsp;vs " + prevLabel
        : "<span>vs " + prevLabel + "</span>")
    + "</div>"
    + "<div style=\"font-size:10px\">" + pemasukan.length + " transaksi · " + escHtml(periodeLabel) + "</div>"
    + "</div></div>"

    + "<div class=\"fin-stat-card expense\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Pengeluaran</div>"
    + "<div class=\"fin-stat-icon expense\"><i class=\"ti ti-trending-down\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + rp(totalOut) + "</div>"
    + "<div class=\"fin-stat-foot\" style=\"flex-direction:column;align-items:flex-start;gap:3px\">"
    + "<div>" + pengeluaran.length + " transaksi pengeluaran</div>"
    + "<div style=\"font-size:10px\">" + escHtml(periodeLabel) + "</div>"
    + "</div></div>"

    + "<div class=\"fin-stat-card saldo\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Saldo Bersih</div>"
    + "<div class=\"fin-stat-icon saldo\"><i class=\"ti ti-scale\"></i></div></div>"
    + "<div class=\"fin-stat-val\" style=\"" + (saldo < 0 ? "color:#a32d2d" : "") + "\">" + (saldo < 0 ? "−" : "") + rp(Math.abs(saldo)) + "</div>"
    + "<div class=\"fin-stat-foot\" style=\"flex-direction:column;align-items:flex-start;gap:3px\">"
    + "<div>" + (saldo >= 0 ? "<span style=\"color:#16a34a;font-weight:700\">Untung</span>" : "<span style=\"color:#a32d2d;font-weight:700\">Rugi</span>") + " · Margin " + margin + "%</div>"
    + "<div style=\"font-size:10px\">Pemasukan − Pengeluaran · " + escHtml(periodeLabel) + "</div>"
    + "</div></div>"

    + "<div class=\"fin-stat-card trx\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Transaksi</div>"
    + "<div class=\"fin-stat-icon trx\"><i class=\"ti ti-receipt\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + activeFiltered.length + "</div>"
    + "<div class=\"fin-stat-foot\">" + (voidedCount > 0 ? voidedCount + " dibatalkan" : "Total catatan aktif") + "</div></div>"

    + "</div>"

    // ── Filter bar (dekat chart) ────────────────────────────────
    + (isOwner
      // Owner: filter lengkap
      ? "<div class=\"fin-filter-bar\" style=\"margin-bottom:14px\">"
        + "<div class=\"fin-filter-lbl\">Periode</div>"
        + "<div class=\"fin-period-toggle\">"
        + "<button class=\"fin-period-btn" + (periodeKey === "hari"   ? " active" : "") + "\" onclick=\"setPeriode('hari')\">Hari Ini</button>"
        + "<button class=\"fin-period-btn" + (periodeKey === "minggu" ? " active" : "") + "\" onclick=\"setPeriode('minggu')\">Minggu Ini</button>"
        + "<button class=\"fin-period-btn" + (periodeKey === "bulan"  ? " active" : "") + "\" onclick=\"setPeriode('bulan')\">" + bulanLabelShort + "</button>"
        + "<select class=\"fin-period-btn fin-bulan-sel\" id=\"fBulan\" onchange=\"applyFilter()\">" + bulanOpts + "</select>"
        + "</div>"
        + "<div class=\"fin-filter-sep\"></div>"
        + "<select class=\"fin-filter-sel\" onchange=\"applyFilter()\" id=\"fJenis\">"
        + "<option value=\"\"" + (!jFilter ? " selected" : "") + ">Semua Tipe</option>"
        + "<option value=\"pemasukan\""  + (jFilter === "pemasukan"   ? " selected" : "") + ">Pemasukan</option>"
        + "<option value=\"pengeluaran\"" + (jFilter === "pengeluaran" ? " selected" : "") + ">Pengeluaran</option>"
        + "</select>"
        + "<select class=\"fin-filter-sel\" id=\"fKategori\" onchange=\"filterByCat()\">"
        + "<option value=\"\">Semua Kategori</option>"
        + kategoriOpts
        + "</select>"
        + "<div class=\"fin-daterange\">"
        + "<i class=\"ti ti-calendar\"></i>"
        + "<input type=\"date\" class=\"fin-date-inp\" id=\"fTglDari\"  value=\"" + tDari + "\" onchange=\"applyTglFilter()\">"
        + "<span class=\"fin-date-sep\">—</span>"
        + "<input type=\"date\" class=\"fin-date-inp\" id=\"fTglSampai\" value=\"" + tSampai + "\" onchange=\"applyTglFilter()\">"
        + "</div>"
        + (hasDateFilter ? "<button class=\"btn-outline\" onclick=\"clearTgl()\" style=\"padding:6px 10px;font-size:12px\">✕</button>" : "")
        + "</div>"
      // Karyawan: pilih hari (kemarin / hari ini)
      : (function() {
          const _today    = new Date();
          const _toIso    = (d) => d.toISOString().slice(0, 10);
          const _yesterIso = _toIso(new Date(_today.getTime() - 86400000));
          const _todayIso  = _toIso(_today);
          const _activeDay = tDari || _todayIso;
          const _dayChip = (iso, lbl, sub) => {
            const isActive = _activeDay === iso;
            return "<a href=\"/operasional?tgl_dari=" + iso + "&tgl_sampai=" + iso + "\""
              + " class=\"kya-day-chip" + (isActive ? " active" : "") + "\""
              + " title=\"" + sub + "\">"
              + "<span class=\"kya-day-lbl\">" + lbl + "</span>"
              + "<span class=\"kya-day-sub\">" + sub + "</span>"
              + "</a>";
          };
          const fmt = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          return "<div class=\"kya-day-bar\">"
            + "<div class=\"kya-day-bar-lbl\"><i class=\"ti ti-calendar\"></i> Tampilkan</div>"
            + _dayChip(_yesterIso, "Kemarin",  fmt(new Date(_today.getTime() - 86400000)))
            + _dayChip(_todayIso,  "Hari ini", fmt(_today))
            + "</div>";
        })())

    // ── Analisis Target Operasional ─────────────────────────────
    + analisisHtml

    // ── Charts ──────────────────────────────────────────────────
    + "<div class=\"fin-charts-row\">"

    // Bar chart card
    + "<div class=\"fin-chart-card\">"
    + "<div class=\"fin-chart-hdr\">"
    + "<div><div class=\"fin-chart-title\">Pemasukan &amp; Pengeluaran</div>"
    + "<div class=\"fin-chart-sub\">" + escHtml(chartSubtitle) + "</div></div>"
    + "<div class=\"fin-chart-leg\">"
    + "<span><span style=\"display:inline-block;width:10px;height:10px;border-radius:3px;background:#22c55e\"></span>&nbsp;Pemasukan</span>"
    + "<span><span style=\"display:inline-block;width:10px;height:10px;border-radius:3px;background:#ef4444\"></span>&nbsp;Pengeluaran</span>"
    + "</div></div>"
    + "<div class=\"fin-chart-body\"><canvas id=\"barChart\"></canvas></div>"
    + "<div class=\"fin-chart-stats\">"
    + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Pemasukan</div><div class=\"fin-cs-val inc\">" + rp(chartTotalIn) + "</div></div>"
    + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Pengeluaran</div><div class=\"fin-cs-val out\">" + rp(chartTotalOut) + "</div></div>"
    + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Margin</div><div class=\"fin-cs-val mg\">" + chartMargin + "%</div></div>"
    + "</div>"
    + "</div>"

    // Donut chart card
    + "<div class=\"fin-chart-card\">"
    + "<div class=\"fin-chart-hdr\">"
    + "<div><div class=\"fin-chart-title\">Komposisi Pemasukan</div>"
    + "<div class=\"fin-chart-sub\">" + escHtml(chartSubtitle) + "</div></div>"
    + "</div>"
    + "<div class=\"fin-donut-wrap\">"
    + "<canvas id=\"donutChart\"></canvas>"
    + "<div class=\"fin-donut-center\">"
    + "<div class=\"fin-dc-val\">" + rp(chartTotalIn) + "</div>"
    + "<div class=\"fin-dc-sub\">Pemasukan</div>"
    + "</div>"
    + "</div>"
    + "<div style=\"border-top:1px solid var(--border);margin:0 16px\"></div>"
    + "<div class=\"fin-donut-leg\" style=\"padding:12px 16px\">" + donutLegHtml + "</div>"
    + "</div>"

    + "</div>"

    // ── Detail chart: tanggal / hari / jam (owner only) ──────────
    + (isOwner
      ? "<div class=\"fin-chart-card\" style=\"margin-top:16px\">"

        // ── Title row ──────────────────────────────────────────
        + "<div class=\"fdc-top\">"
        + "<div class=\"fdc-title-row\">"
        + "<div class=\"fdc-title\"><div class=\"fdc-title-icon\"><i class=\"ti ti-chart-bar\"></i></div>Analisis Transaksi</div>"
        + "<span class=\"fdc-period\">" + escHtml(bulanLabel) + "</span>"
        + "</div>"
        + "</div>"

        // ── Segmented control ──────────────────────────────────
        + "<div class=\"fdc-seg\">"
        + "<button class=\"fdc-seg-btn active\" id=\"tabTanggal\" onclick=\"switchDetailChart('tanggal')\"><i class=\"ti ti-calendar-event\"></i>Per Tanggal</button>"
        + "<button class=\"fdc-seg-btn\" id=\"tabHari\" onclick=\"switchDetailChart('hari')\"><i class=\"ti ti-calendar-week\"></i>Per Hari</button>"
        + "<button class=\"fdc-seg-btn\" id=\"tabJam\" onclick=\"switchDetailChart('jam')\"><i class=\"ti ti-clock\"></i>Per Jam</button>"
        + "</div>"

        // ── Legend + subtitle label ────────────────────────────
        + "<div class=\"fdc-legend-row\">"
        + "<div class=\"fdc-leg-item\"><span class=\"fdc-dot\" style=\"background:#22c55e\"></span>Pemasukan</div>"
        + "<div class=\"fdc-leg-item\"><span class=\"fdc-dot\" style=\"background:#ef4444\"></span>Pengeluaran</div>"
        + "<span class=\"fdc-sub-label\" id=\"fdcSubLabel\">Per tanggal dalam bulan</span>"
        + "</div>"

        // ── Chart ──────────────────────────────────────────────
        + "<div class=\"fin-chart-body\" style=\"height:250px;padding-top:6px\"><canvas id=\"detailChart\"></canvas></div>"

        // ── Stats footer ───────────────────────────────────────
        + "<div class=\"fin-chart-stats\">"
        + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Pemasukan</div><div class=\"fin-cs-val inc\">" + rp(totalIn) + "</div></div>"
        + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Pengeluaran</div><div class=\"fin-cs-val out\">" + rp(totalOut) + "</div></div>"
        + "<div class=\"fin-cs-item\"><div class=\"fin-cs-lbl\">Saldo</div><div class=\"fin-cs-val mg\">" + (saldo >= 0 ? "+" : "−") + rp(Math.abs(saldo)) + "</div></div>"
        + "</div>"
        + "</div>"
      : "")

    // ── Transaction table ───────────────────────────────────────
    + "<div class=\"fin-table-card\">"
    + "<div class=\"fin-tbl-toolbar\">"
    + "<div class=\"fin-search-wrap\">"
    + "<i class=\"ti ti-search\"></i>"
    + "<input class=\"fin-search-inp\" type=\"text\" placeholder=\"Cari keterangan atau kategori...\" id=\"trxSearch\" oninput=\"renderTbl()\">"
    + "</div>"
    + "<div class=\"fin-tbl-chips\">"
    +   "<button type=\"button\" class=\"fin-tbl-chip active\" data-tbl-filter=\"today\" onclick=\"setTblFilter('today')\">Hari ini</button>"
    +   "<button type=\"button\" class=\"fin-tbl-chip\" data-tbl-filter=\"yesterday\" onclick=\"setTblFilter('yesterday')\">Kemarin</button>"
    +   (isOwner
      ? "<button type=\"button\" class=\"fin-tbl-chip\" data-tbl-filter=\"custom\" onclick=\"toggleTblCustom()\">Custom</button>"
        + "<div id=\"tblCustomRange\" style=\"display:none;align-items:center;gap:5px\">"
        +   "<input type=\"date\" class=\"fin-tbl-date\" id=\"tblDari\" onchange=\"setTblFilter('custom')\">"
        +   "<span style=\"color:var(--txt3);font-size:11px\">—</span>"
        +   "<input type=\"date\" class=\"fin-tbl-date\" id=\"tblSampai\" onchange=\"setTblFilter('custom')\">"
        + "</div>"
      : "")
    +   "<button type=\"button\" class=\"fin-tbl-chip\" data-tbl-filter=\"all\" onclick=\"setTblFilter('all')\">Semua</button>"
    + "</div>"
    + "</div>"
    + "<div class=\"fin-tbl-head\">"
    + "<div class=\"fin-th\">Tanggal</div>"
    + "<div class=\"fin-th\">Keterangan</div>"
    + "<div class=\"fin-th\">Kategori</div>"
    + "<div class=\"fin-th\">Jumlah &amp; Tipe</div>"
    + "<div class=\"fin-th right\">Aksi</div>"
    + "</div>"
    + rows
    + "<div class=\"fin-tbl-footer\">"
    + "<div class=\"fin-tf-left\">"
    + "<span id=\"tblCount\">" + sortedTbl.length + " transaksi"
    + (voidedCount > 0 ? " <span style=\"color:#a32d2d\">(" + voidedCount + " dibatalkan)</span>" : "")
    + "</span>"
    + "<span style=\"color:#e2e8e0\">|</span>"
    + "<span>Saldo: <span class=\"fin-tf-saldo\" id=\"tblSaldo\" style=\"color:" + (saldo >= 0 ? "#2d6624" : "#a32d2d") + "\">" + (saldo < 0 ? "−" : "+") + rp(Math.abs(saldo)) + "</span></span>"
    + "</div>"
    + "<div class=\"fin-pagination\" id=\"tblPagi\"></div>"
    + "</div>"
    + "</div>"

    + "</div>"
    + "</div>"
    + "</div>"

    + "<div class=\"fin-pgbar\" id=\"finPgBar\"></div>"
    + "<div class=\"toast\" id=\"toast\"></div>"

    // ── Modal Catat Transaksi (3-step wizard) ────────────────────
    + "<div class=\"overlay\" id=\"trxOverlay\" onclick=\"if(event.target===this)closeTrxModal()\">"
    + "<div class=\"over-modal fin-wiz-modal\">"
    + "<div class=\"fin-wiz-prog\"><div class=\"fin-wiz-prog-fill\" id=\"wizProg\" style=\"width:33%\"></div></div>"
    + "<div class=\"fin-wiz-inner\">"
    + "<div class=\"fin-wiz-hdr\">"
    + "<div style=\"display:flex;align-items:center;gap:10px\">"
    + "<div class=\"fin-wiz-icon\" id=\"wizIcon\"><i class=\"ti ti-receipt\"></i></div>"
    + "<div><div class=\"fin-wiz-title\">Catat Transaksi</div>"
    + "<div class=\"fin-wiz-step-lbl\" id=\"wizStepLbl\">Langkah 1 dari 3</div></div>"
    + "</div>"
    + "<button type=\"button\" class=\"fin-wiz-close\" onclick=\"closeTrxModal()\"><i class=\"ti ti-x\"></i></button>"
    + "</div>"
    // STEP 1
    + "<div id=\"wizStep1\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Tipe Transaksi</label>"
    + "<div class=\"fin-tog-2\">"
    + "<button type=\"button\" class=\"fin-tog-btn sel-income\" id=\"wiz-income\" onclick=\"wizSetTipe('income')\"><i class=\"ti ti-arrow-up-circle\"></i>Pemasukan</button>"
    + "<button type=\"button\" class=\"fin-tog-btn\" id=\"wiz-expense\" onclick=\"wizSetTipe('expense')\"><i class=\"ti ti-arrow-down-circle\"></i>Pengeluaran</button>"
    + "</div></div>"
    + "<div class=\"fmg\" id=\"wizActGroup\"><label class=\"fin-wiz-lbl\">Jenis Aktivitas</label>"
    + "<div class=\"fin-tog-3\">"
    + "<button type=\"button\" class=\"fin-tog-btn sel\" id=\"wiz-billiard\" onclick=\"wizSetAct('billiard')\"><i class=\"ti ti-circle-number-8\"></i>Main Billiard</button>"
    + "<button type=\"button\" class=\"fin-tog-btn\" id=\"wiz-kopi\" onclick=\"wizSetAct('kopi')\"><i class=\"ti ti-coffee\"></i>Kopi / Snack</button>"
    + "<button type=\"button\" class=\"fin-tog-btn\" id=\"wiz-other\" onclick=\"wizSetAct('other')\"><i class=\"ti ti-dots-circle-horizontal\"></i>Lainnya</button>"
    + "</div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Sesi Waktu</label>"
    + "<div class=\"fin-tog-2\">"
    + "<button type=\"button\" class=\"fin-tog-btn" + (defaultShift === "siang" ? " sel-siang" : "") + "\" id=\"wiz-siang\" onclick=\"wizSetWaktu('siang')\"><i class=\"ti ti-sun\"></i>Siang</button>"
    + "<button type=\"button\" class=\"fin-tog-btn" + (defaultShift === "malam" ? " sel-malam" : "") + "\" id=\"wiz-malam\" onclick=\"wizSetWaktu('malam')\"><i class=\"ti ti-moon\"></i>Malam</button>"
    + "</div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Tanggal &amp; Jam</label>"
    + "<div class=\"fin-inp-pfx\"><span class=\"fin-pfx-lbl\"><i class=\"ti ti-calendar\" style=\"font-size:14px\"></i></span>"
    + "<input class=\"fin-pfx-inp\" type=\"datetime-local\" id=\"wizDatetime\" onchange=\"wizUpdateDateDisplay()\" style=\"width:100%\"></div>"
    + "<div id=\"wizDateDisplay\" style=\"font-size:11px;color:var(--txt3);margin-top:4px;font-family:var(--ff-mono)\"></div>"
    + "</div>"
    + "</div>"
    // STEP 2
    + "<div id=\"wizStep2\" style=\"display:none\">"
    + "<div id=\"wizBilliard\" class=\"fin-dynamic\">"
    + "<div class=\"fin-info-chip\"><i class=\"ti ti-info-circle\"></i><span>Isi detail sesi main billiard.</span></div>"
    + "<div class=\"frow\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Nomor Meja</label>"
    + "<div class=\"mip-wrap\">"
    +   "<select class=\"fsel mip-sel\" id=\"wizMeja\" onchange=\"wizHideErr('wizMejaErr')\"><option value=\"\">Pilih meja...</option><option>Meja 1</option><option>Meja 2</option><option>Meja 3</option><option>Meja 4</option><option>Meja 5</option><option>Meja 6</option><option>Meja 7</option><option>Meja 8</option></select>"
    +   "<button type=\"button\" class=\"mip-btn\" onclick=\"openItemPicker(this,'Pilih Meja',true)\">"
    +     "<span class=\"mip-text\">Pilih meja...</span>"
    +     "<i class=\"ti ti-chevron-down\" style=\"font-size:14px;color:var(--txt3);flex-shrink:0\"></i>"
    +   "</button>"
    + "</div>"
    + "<div id=\"wizMejaErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Nomor meja wajib dipilih.</div>"
    + "</div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Durasi</label>"
    + "<div class=\"mip-wrap\">"
    +   "<select class=\"fsel mip-sel\" id=\"wizDurasi\" onchange=\"wizDurasiChange(this.value)\"><option value=\"\">Pilih durasi...</option><option>Open / Loss</option><option>1 Jam</option><option>2 Jam</option><option>3 Jam</option><option>4 Jam</option><option>5 Jam</option><option>6 Jam</option><option>7 Jam</option><option>8 Jam</option></select>"
    +   "<button type=\"button\" class=\"mip-btn\" onclick=\"openItemPicker(this,'Pilih Durasi',true)\">"
    +     "<span class=\"mip-text\">Pilih durasi...</span>"
    +     "<i class=\"ti ti-chevron-down\" style=\"font-size:14px;color:var(--txt3);flex-shrink:0\"></i>"
    +   "</button>"
    + "</div>"
    + "<div id=\"wizDurasiErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Durasi wajib dipilih.</div>"
    + "</div>"
    + "</div>"
    + "<div id=\"wizDetailMain\" class=\"fmg\" style=\"display:none\">"
    + "<label class=\"fin-wiz-lbl\">Detail Main <span style=\"color:#a32d2d;text-transform:none;letter-spacing:0\">*</span></label>"
    + "<input class=\"finp\" type=\"text\" id=\"wizDetailMainInp\" placeholder=\"contoh: 1 jam 30 menit, meja 2 — 3 orang...\">"
    + "<div id=\"wizDetailMainErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Detail main wajib diisi untuk durasi Open / Loss.</div>"
    + "</div>"
    // Addon checkbox: tambah minum/makan ke transaksi billiard ini
    + "<div class=\"fmg\">"
    + "<label class=\"wiz-addon-toggle\" id=\"wizKopiAddonLbl\">"
    +   "<input type=\"checkbox\" id=\"wizKopiAddonCb\" onchange=\"wizToggleKopiAddon(this)\">"
    +   "<span><i class=\"ti ti-coffee\"></i>Sekalian pesan minum/makan?</span>"
    + "</label>"
    + "</div>"
    + "</div>"
    + "<div id=\"wizKopi\" class=\"fin-dynamic\">"
    + "<div class=\"fin-info-chip\"><i class=\"ti ti-info-circle\"></i><span id=\"wizKopiInfoChip\">Pilih item dari menu dan atur jumlah. Total otomatis terhitung.</span></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Item Pesanan</label>"
    + "<div class=\"fin-menu-items\" id=\"wizMenuItems\">"
    + "<div class=\"fin-menu-row\">"
    + "<div class=\"mip-wrap\">"
    +   "<select class=\"fsel mip-sel\" onchange=\"wizItemChange(this)\"><option value=\"\">Pilih item...</option>" + menuOptsHtml + "</select>"
    +   "<button type=\"button\" class=\"mip-btn\" onclick=\"openItemPicker(this)\">"
    +     "<span class=\"mip-text\">Pilih item...</span>"
    +     "<i class=\"ti ti-chevron-down\" style=\"font-size:14px;color:var(--txt3);flex-shrink:0\"></i>"
    +   "</button>"
    + "</div>"
    + "<div class=\"fin-qty-stepper\">"
    +   "<button type=\"button\" class=\"fin-qty-btn\" onclick=\"wizQtyMinus(this)\" aria-label=\"Kurangi\">−</button>"
    +   "<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\" inputmode=\"numeric\" oninput=\"wizCalcTotal()\">"
    +   "<button type=\"button\" class=\"fin-qty-btn\" onclick=\"wizQtyPlus(this)\" aria-label=\"Tambah\">+</button>"
    + "</div>"
    + "<button type=\"button\" class=\"fin-btn-rm-row\" onclick=\"wizRmItem(this)\"><i class=\"ti ti-x\"></i></button>"
    + "<div class=\"wiz-extras\" style=\"grid-column:1/-1;display:none;flex-direction:column;gap:6px;padding:6px 0 2px\">"
    + "<div class=\"wiz-temp\" style=\"display:none;flex-direction:row;gap:6px;align-items:center\">"
    + "<span style=\"font-size:11px;color:var(--txt2)\">Suhu:</span>"
    + "<button type=\"button\" data-temp=\"ice\" onclick=\"wizSetTemp(this,'ice')\" style=\"padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid #3b82f6;background:rgba(59,130,246,.12);color:#3b82f6;font-family:inherit\">❄ Ice</button>"
    + "<button type=\"button\" data-temp=\"hot\" onclick=\"wizSetTemp(this,'hot')\" style=\"padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--txt2);font-family:inherit\">☕ Hot</button>"
    + "</div>"
    + "<div class=\"wiz-tops\" style=\"display:none;flex-direction:column;gap:4px\"></div>"
    + "</div>"
    + "</div></div>"
    + "<button type=\"button\" class=\"fin-btn-add-item\" onclick=\"wizAddItem()\"><i class=\"ti ti-plus\" style=\"font-size:14px\"></i> Tambah Item</button>"
    + "<div id=\"wizKopiErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:6px\">Pilih minimal 1 item pesanan.</div>"
    + "</div></div>"
    + "<div id=\"wizOther\" class=\"fin-dynamic\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Kategori</label>"
    + "<select class=\"fsel\" id=\"wizKatSel\" onchange=\"wizOnKatChange(this);wizHideErr('wizKatErr');\">"
    + "<option value=\"\" disabled selected hidden>— Pilih kategori —</option>"
    + "<optgroup label=\"Pemasukan\" id=\"wizGrpIn\">" + modalGrpIn + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"wizGrpOut\">" + modalGrpOut + "</optgroup>"
    + "</select>"
    + "<div id=\"wizKatErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Kategori wajib dipilih.</div>"
    + "</div>"
    + "<div class=\"fmg\" id=\"wizSubKatWrap\" style=\"display:none\">"
    + "<label class=\"fin-wiz-lbl\">Sub Kategori</label>"
    + "<select class=\"fsel\" id=\"wizSubKatSel\" onchange=\"wizHideErr('wizSubKatErr')\"><option value=\"\" disabled selected hidden>— Pilih sub kategori —</option></select>"
    + "<div id=\"wizSubKatErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Sub kategori wajib dipilih.</div>"
    + "</div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\" id=\"wizJumlahLbl\">Jumlah (Rp)</label>"
    + "<div class=\"fin-inp-pfx\"><span class=\"fin-pfx-lbl\">Rp</span>"
    + "<input class=\"fin-pfx-inp\" type=\"text\" inputmode=\"numeric\" id=\"wizJumlah\" placeholder=\"0\" oninput=\"wizFmtJ(this);wizRefreshAddonDisplay()\"></div>"
    + "<div id=\"wizJumlahErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Jumlah harus diisi dan lebih dari 0.</div>"
    + "<div id=\"wizAddonDisplay\" class=\"wiz-addon-display\" style=\"display:none\">"
    +   "<div class=\"wiz-addon-sub\" id=\"wizAddonSubText\"></div>"
    +   "<div class=\"wiz-addon-grand\" id=\"wizAddonGrandText\"></div>"
    + "</div>"
    + "</div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Keterangan <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span></label>"
    + "<input class=\"finp\" type=\"text\" id=\"wizKet\" placeholder=\"Catatan tambahan...\"></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Metode Pembayaran</label>"
    + "<div class=\"fin-tog-2\">"
    + "<button type=\"button\" class=\"fin-tog-btn sel\" id=\"wiz-cash\" onclick=\"wizSetBayar('cash')\"><i class=\"ti ti-cash\"></i>Cash</button>"
    + "<button type=\"button\" class=\"fin-tog-btn\" id=\"wiz-qris\" onclick=\"wizSetBayar('qris')\"><i class=\"ti ti-qrcode\"></i>QRIS</button>"
    + "</div></div>"
    // ── Upload bukti foto (QRIS / nota pengeluaran) ─────────────
    + "<div class=\"fmg\" id=\"wizUploadWrap\" style=\"display:none\">"
    + "<label class=\"fin-wiz-lbl\" id=\"wizUploadLbl\">Bukti Foto <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span></label>"
    + "<div class=\"fin-dropzone\" id=\"wizDropzone\" onclick=\"wizDropzoneClick()\">"
    + "<div id=\"dzContent\">"
    + "<i class=\"ti ti-cloud-upload fin-dz-icon\"></i>"
    + "<div class=\"fin-dz-lbl\" id=\"dzLbl\">Tap untuk upload foto</div>"
    + "<div class=\"fin-dz-hint\">JPG, PNG, WebP &middot; maks. 5MB &middot; otomatis dikompres</div>"
    + "</div>"
    + "<div id=\"dzPreview\" style=\"display:none\" class=\"fin-dz-prev\">"
    + "<img id=\"dzPreviewImg\" class=\"fin-dz-prev-img\" src=\"\" alt=\"preview\">"
    + "<div id=\"dzFileName\" class=\"fin-dz-prev-name\"></div>"
    + "</div>"
    + "</div>"
    + "<button type=\"button\" class=\"fin-rm-btn\" id=\"wizRmFileBtn\" onclick=\"wizRemoveFile()\" style=\"display:none\">"
    + "<i class=\"ti ti-x\" style=\"font-size:12px\"></i> Hapus foto"
    + "</button>"
    + "<input type=\"file\" accept=\"image/*\" id=\"wizBuktiInput\" style=\"display:none\" onchange=\"wizHandleFile(this)\">"
    + "</div>"
    + "</div>"
    // STEP 3
    + "<div id=\"wizStep3\" style=\"display:none\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Ringkasan Transaksi</label>"
    + "<div class=\"fin-summary-box\">"
    + "<div class=\"fin-sb-row\"><span>Tipe</span><span class=\"fin-sb-val\" id=\"sumTipe\">Pemasukan</span></div>"
    + "<div class=\"fin-sb-row\"><span>Aktivitas</span><span class=\"fin-sb-val\" id=\"sumAkt\">Main Billiard</span></div>"
    + "<div class=\"fin-sb-row\"><span>Sesi Waktu</span><span class=\"fin-sb-val\" id=\"sumWaktu\">Siang</span></div>"
    + "<div class=\"fin-sb-row\"><span>Kategori</span><span class=\"fin-sb-val\" id=\"sumKat\">—</span></div>"
    + "<div class=\"fin-sb-row\"><span>Keterangan</span><span class=\"fin-sb-val\" id=\"sumKet\">—</span></div>"
    + "<div class=\"fin-sb-row\"><span>Pembayaran</span><span class=\"fin-sb-val\" id=\"sumBayar\">Cash</span></div>"
    + "<div class=\"fin-sb-total\"><span>Total</span><span class=\"fin-sb-total-val\" id=\"sumTotal\">Rp 0</span></div>"
    + "</div></div>"
    + "<form id=\"wizForm\" action=\"/operasional/tambah\" method=\"post\" style=\"display:none\">"
    + "<input type=\"hidden\" name=\"jenis\" id=\"wizFJenis\" value=\"pemasukan\">"
    + "<input type=\"hidden\" name=\"waktu\" id=\"wizFWaktu\" value=\"siang\">"
    + "<input type=\"hidden\" name=\"datetime\" id=\"wizFDt\">"
    + "<input type=\"hidden\" name=\"kategori\" id=\"wizFKat\">"
    + "<input type=\"hidden\" name=\"sub_kategori\" id=\"wizFSubKat\">"
    + "<input type=\"hidden\" name=\"keterangan\" id=\"wizFKet\">"
    + "<input type=\"hidden\" name=\"jumlah\" id=\"wizFJ\">"
    + "<input type=\"hidden\" name=\"bayar\" id=\"wizFBayar\" value=\"cash\">"
    + "<input type=\"hidden\" name=\"bukti_b64\" id=\"wizFBukti\" value=\"\">"
    + "<input type=\"hidden\" name=\"kopi_keterangan\" id=\"wizFKopiKet\" value=\"\">"
    + "<input type=\"hidden\" name=\"kopi_jumlah\" id=\"wizFKopiJ\" value=\"\">"
    + "</form>"
    + "</div>"
    // FOOTER
    + "<div class=\"fin-wiz-footer\">"
    + "<div style=\"display:flex;align-items:center;gap:12px\">"
    + "<button type=\"button\" class=\"fin-btn-back\" id=\"wizBtnBack\" onclick=\"wizPrev()\" style=\"display:none\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali</button>"
    + "<div class=\"fin-step-dots\">"
    + "<div class=\"fin-sd active\" id=\"wizSd1\"></div>"
    + "<div class=\"fin-sd\" id=\"wizSd2\"></div>"
    + "<div class=\"fin-sd\" id=\"wizSd3\"></div>"
    + "</div></div>"
    + "<button type=\"button\" class=\"fin-btn-next\" id=\"wizBtnNext\" onclick=\"wizNext()\">Lanjut <i class=\"ti ti-arrow-right\" style=\"font-size:15px\"></i></button>"
    + "</div>"
    + "</div>"
    + "</div>"
    + "</div>"

    // ── Modal Void Transaksi ────────────────────────────────────
    + "<div class=\"overlay\" id=\"voidOverlay\" onclick=\"if(event.target===this)closeVoidModal()\">"
    + "<div class=\"over-modal\" style=\"width:420px\">"
    + "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:14px\">"
    + "<div style=\"width:36px;height:36px;border-radius:9px;background:#fcebeb;display:flex;align-items:center;justify-content:center;color:#a32d2d\"><i class=\"ti ti-ban\" style=\"font-size:18px\"></i></div>"
    + "<div><div style=\"font-size:16px;font-weight:600;color:#1a2318\">Batalkan Transaksi</div>"
    + "<div style=\"font-size:11px;color:#7a8c78;margin-top:1px\">Tidak bisa dibatalkan kembali</div></div>"
    + "</div>"
    + "<div style=\"background:#f9fbf8;border:1px solid #e2e8e0;border-radius:9px;padding:12px 14px;margin-bottom:14px\">"
    + "<div style=\"display:flex;justify-content:space-between;gap:12px;margin-bottom:6px\">"
    + "<span style=\"font-size:11px;color:#7a8c78;text-transform:uppercase;letter-spacing:.08em\">Keterangan</span>"
    + "<span id=\"voidDesc\" style=\"font-size:13px;color:#1a2318;font-weight:500;text-align:right\">—</span>"
    + "</div>"
    + "<div style=\"display:flex;justify-content:space-between;gap:12px\">"
    + "<span style=\"font-size:11px;color:#7a8c78;text-transform:uppercase;letter-spacing:.08em\">Jumlah</span>"
    + "<span id=\"voidAmount\" style=\"font-size:14px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace\">—</span>"
    + "</div>"
    + "</div>"
    + "<form id=\"voidForm\" action=\"/operasional/void\" method=\"post\" onsubmit=\"startLoad()\">"
    + "<input type=\"hidden\" name=\"id\" id=\"voidId\">"
    + "<label style=\"font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7a8c78;margin-bottom:8px;display:block\">"
    + "Alasan Pembatalan <span style=\"color:#a32d2d;text-transform:none;letter-spacing:0\">*</span></label>"
    + "<input class=\"finp\" type=\"text\" name=\"reason\" id=\"voidReason\" required maxlength=\"200\""
    + " placeholder=\"contoh: salah input nominal, kategori salah, ...\""
    + " style=\"width:100%;padding:10px 12px;border:1.5px solid #e2e8e0;border-radius:9px;font-size:13px;font-family:inherit;color:#1a2318;outline:none;background:#fff\">"
    + "<div style=\"display:flex;justify-content:flex-end;gap:8px;margin-top:16px\">"
    + "<button type=\"button\" class=\"fin-btn-back\" onclick=\"closeVoidModal()\">Tutup</button>"
    + "<button type=\"submit\" style=\"display:flex;align-items:center;gap:6px;padding:9px 16px;background:#a32d2d;border:none;border-radius:9px;font-size:13px;color:#fff;cursor:pointer;font-weight:600;font-family:inherit\">"
    + "<i class=\"ti ti-ban\" style=\"font-size:14px\"></i> Konfirmasi Batalkan</button>"
    + "</div>"
    + "</form>"
    + "</div>"
    + "</div>"

    // ── Modal Detail Transaksi (mobile-friendly, tap row utk buka) ───
    + "<div class=\"mip-overlay\" id=\"trxDetailOv\" onclick=\"if(event.target===this)closeTrxDetail()\">"
    +   "<div class=\"mip-sheet trx-detail-sheet\">"
    +     "<div class=\"mip-sheet-hdr\">"
    +       "<div class=\"mip-sheet-title\" id=\"trxDtTitle\">Detail Transaksi</div>"
    +       "<button type=\"button\" class=\"mip-close\" onclick=\"closeTrxDetail()\"><i class=\"ti ti-x\"></i></button>"
    +     "</div>"
    +     "<div class=\"trx-dt-body\" id=\"trxDtBody\"></div>"
    +     "<div class=\"trx-dt-footer\" id=\"trxDtFooter\"></div>"
    +   "</div>"
    + "</div>"

    // ── Bottom-sheet picker untuk menu item (mobile-friendly) ───
    + "<div class=\"mip-overlay\" id=\"mipOv\" onclick=\"if(event.target===this)closeItemPicker()\">"
    +   "<div class=\"mip-sheet\">"
    +     "<div class=\"mip-sheet-hdr\">"
    +       "<div class=\"mip-sheet-title\" id=\"mipSheetTitle\">Pilih Item</div>"
    +       "<button type=\"button\" class=\"mip-close\" onclick=\"closeItemPicker()\"><i class=\"ti ti-x\"></i></button>"
    +     "</div>"
    +     "<div class=\"mip-search-wrap\" id=\"mipSearchWrap\">"
    +       "<i class=\"ti ti-search\"></i>"
    +       "<input type=\"text\" id=\"mipSearch\" class=\"mip-search\" placeholder=\"Cari item...\" oninput=\"filterItemPicker()\" autocomplete=\"off\">"
    +     "</div>"
    +     "<div class=\"mip-list\" id=\"mipList\"></div>"
    +   "</div>"
    + "</div>"

    + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js\"><\/script>"
    + "<script>"
    + "const WIZ_MENU_OPTS=" + safeJson("<option value=''>Pilih item...</option>" + menuOptsHtml) + ";"
    + "const WIZ_TOPPINGS=" + safeJson(toppingsByName) + ";"
    + "const TRX_DATA=" + safeJson(sortedTbl) + ";"
    + "const USER_NAME_MAP=" + safeJson(userNameMap) + ";"
    + "const USER_SHIFT_MAP=" + safeJson(userShiftMap) + ";"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "function financeLogout(){if(!confirm('Keluar dari sesi keuangan?'))return;window.location.href='/operasional/logout';}"
    + "function buildUrl(){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var d=document.getElementById('fTglDari').value;"
    + "var s=document.getElementById('fTglSampai').value;"
    + "var url='/operasional?bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "if(d)url+='&tgl_dari='+d;"
    + "if(s)url+='&tgl_sampai='+s;"
    + "return url;}"
    + "function applyFilter(){startLoad();window.location.href=buildUrl();}"
    + "function applyTglFilter(){"
    + "var d=document.getElementById('fTglDari').value;"
    + "var s=document.getElementById('fTglSampai').value;"
    + "if(d&&s&&s<d)document.getElementById('fTglSampai').value=d;"
    + "startLoad();window.location.href=buildUrl();}"
    + "function clearTgl(){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var url='/operasional?bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "startLoad();window.location.href=url;}"
    + "function setPeriode(p){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var today=new Date();"
    // Business day cutoff: kalau jam < CUT, anggap masih shift kemarin
    + "if(today.getHours()<" + CONFIG.BUSINESS_DAY_CUTOFF_HOUR + "){today.setDate(today.getDate()-1);}"
    + "var ymd=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};"
    + "var url='/operasional?bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "if(p==='hari'){url+='&tgl_dari='+ymd(today)+'&tgl_sampai='+ymd(today);}"
    + "else if(p==='minggu'){var dow=today.getDay()===0?6:today.getDay()-1;var mon=new Date(today);mon.setDate(today.getDate()-dow);url+='&tgl_dari='+ymd(mon)+'&tgl_sampai='+ymd(today);}"
    + "startLoad();window.location.href=url;}"
    + "function filterByCat(){"
    + "var k=document.getElementById('fKategori').value.toLowerCase();"
    + "var rows=document.querySelectorAll('#trxRows .fin-row');"
    + "var shown=0;"
    + "rows.forEach(function(r){"
    + "var tag=r.querySelector('.cat-tag');"
    + "var match=!k||(tag&&tag.textContent.trim().toLowerCase()===k);"
    + "r.style.display=match?'':'none';"
    + "if(match)shown++;});"
    + "var empty=document.querySelector('.empty-state');"
    + "if(empty)empty.style.display=shown===0&&rows.length?'flex':(rows.length?'none':'flex');}"
    // ── Tabel transaksi: filter chip + search + pagination ─────
    + "var tblState={filter:'today',page:1,perPage:10};"
    + "function _today(){var d=new Date();if(d.getHours()<" + CONFIG.BUSINESS_DAY_CUTOFF_HOUR + "){d.setDate(d.getDate()-1);}"
    +   "return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}"
    + "function _yesterday(){var d=new Date();if(d.getHours()<" + CONFIG.BUSINESS_DAY_CUTOFF_HOUR + "){d.setDate(d.getDate()-1);}"
    +   "d.setDate(d.getDate()-1);"
    +   "return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}"
    + "function setTblFilter(f){tblState.filter=f;tblState.page=1;"
    +   "document.querySelectorAll('.fin-tbl-chip').forEach(function(b){"
    +     "b.classList.toggle('active',b.getAttribute('data-tbl-filter')===f);});"
    +   "var cust=document.getElementById('tblCustomRange');"
    +   "if(cust)cust.style.display=f==='custom'?'inline-flex':'none';"
    +   "renderTbl();}"
    + "function toggleTblCustom(){"
    +   "var cust=document.getElementById('tblCustomRange');if(!cust)return;"
    +   "var open=cust.style.display!=='none';"
    +   "if(open){setTblFilter('today');}else{"
    +     "var td=_today();var d=document.getElementById('tblDari');var s=document.getElementById('tblSampai');"
    +     "if(d&&!d.value)d.value=td;if(s&&!s.value)s.value=td;"
    +     "setTblFilter('custom');}}"
    + "function renderTbl(){"
    +   "var q=(document.getElementById('trxSearch')||{}).value;q=(q||'').toLowerCase();"
    +   "var f=tblState.filter;"
    +   "var dari='',sampai='';"
    +   "if(f==='today'){dari=sampai=_today();}"
    +   "else if(f==='yesterday'){dari=sampai=_yesterday();}"
    +   "else if(f==='custom'){"
    +     "dari=(document.getElementById('tblDari')||{}).value||'';"
    +     "sampai=(document.getElementById('tblSampai')||{}).value||'';}"
    +   "var rows=document.querySelectorAll('#trxRows .fin-row');"
    +   "var visible=[];"
    +   "rows.forEach(function(r){"
    +     "var tgl=r.getAttribute('data-tanggal')||'';"
    +     "var txt=r.textContent.toLowerCase();"
    +     "var matchSearch=!q||txt.indexOf(q)>=0;"
    +     "var matchDate=true;"
    +     "if(dari&&tgl<dari)matchDate=false;"
    +     "if(sampai&&tgl>sampai)matchDate=false;"
    +     "if(matchSearch&&matchDate)visible.push(r);"
    +     "r.style.display='none';});"
    +   "var total=visible.length;var pp=tblState.perPage;"
    +   "var maxPg=Math.max(1,Math.ceil(total/pp));"
    +   "if(tblState.page>maxPg)tblState.page=maxPg;"
    +   "var start=(tblState.page-1)*pp;var end=start+pp;"
    +   "for(var i=start;i<end&&i<total;i++)visible[i].style.display='';"
    +   "var cEl=document.getElementById('tblCount');"
    +   "if(cEl){var shown=Math.min(end,total)-start;"
    +     "cEl.innerHTML=(total===0?'Tidak ada':shown+' dari '+total)+' transaksi';}"
    +   "var emp=document.querySelector('.empty-state');"
    +   "if(emp&&rows.length>0)emp.style.display=total===0?'flex':'none';"
    +   "var pgEl=document.getElementById('tblPagi');if(!pgEl)return;"
    +   "if(total<=pp){pgEl.innerHTML='';return;}"
    +   "var html='<button class=\"fin-pg-btn\" type=\"button\" onclick=\"goTblPage(tblState.page-1)\"' + (tblState.page<=1?' disabled':'') + '>‹</button>';"
    +   "html+='<span class=\"fin-pg-info\">Hal '+tblState.page+' / '+maxPg+'</span>';"
    +   "html+='<button class=\"fin-pg-btn\" type=\"button\" onclick=\"goTblPage(tblState.page+1)\"' + (tblState.page>=maxPg?' disabled':'') + '>›</button>';"
    +   "pgEl.innerHTML=html;}"
    + "function goTblPage(n){tblState.page=Math.max(1,n);renderTbl();}"
    + "window.addEventListener('DOMContentLoaded',function(){renderTbl();});"
    + "function openTrxModal(){"
    + "document.getElementById('trxOverlay').classList.add('open');wizRemoveFile();wizGoTo(1);"
    + "var dtEl=document.getElementById('wizDatetime');"
    + "if(dtEl){if(wizS.tipe==='income'){dtEl.value=wizNowLocal();}else{dtEl.value='';}"
    + "wizUpdateDateDisplay();}}"
    + "function closeTrxModal(){document.getElementById('trxOverlay').classList.remove('open');}"
    + "function openVoidModal(btn){"
    + "document.getElementById('voidId').value=btn.dataset.id;"
    + "document.getElementById('voidDesc').textContent=btn.dataset.desc;"
    + "document.getElementById('voidAmount').textContent=btn.dataset.amount;"
    + "document.getElementById('voidReason').value='';"
    + "document.getElementById('voidOverlay').classList.add('open');"
    + "setTimeout(function(){document.getElementById('voidReason').focus();},150);}"
    + "function closeVoidModal(){document.getElementById('voidOverlay').classList.remove('open');}"
    + "var wizS={step:1,tipe:'income',act:'billiard',waktu:'" + defaultShift + "',bayar:'cash',kopiAddon:false};"
    + "function wizSetTipe(t){wizS.tipe=t;"
    + "document.getElementById('wiz-income').className='fin-tog-btn'+(t==='income'?' sel-income':'');"
    + "document.getElementById('wiz-expense').className='fin-tog-btn'+(t==='expense'?' sel-expense':'');"
    + "document.getElementById('wizActGroup').style.display=t==='income'?'':'none';"
    + "if(t==='expense'){wizS.act='other';}"
    // Saat balik ke income, reset act ke billiard kalau sebelumnya 'other'
    // (bug: tombol Main Billiard ter-highlight tapi act masih 'other' warisan)
    + "else if(wizS.act==='other'){wizSetAct('billiard');}"
    + "var dtEl=document.getElementById('wizDatetime');"
    + "if(dtEl){if(t==='income'){dtEl.value=wizNowLocal();}else{dtEl.value='';}"
    + "wizUpdateDateDisplay();}wizUpdateUpload();}"
    + "function wizSetAct(a){"
    + "if(wizS.act==='billiard'&&a!=='billiard'){wizS.kopiAddon=false;var cb=document.getElementById('wizKopiAddonCb');if(cb)cb.checked=false;var lbl=document.getElementById('wizKopiAddonLbl');if(lbl)lbl.classList.remove('on');}"
    + "wizS.act=a;"
    + "['billiard','kopi','other'].forEach(function(x){document.getElementById('wiz-'+x).className='fin-tog-btn'+(x===a?' sel':'');});}"
    + "function wizToggleKopiAddon(cb){"
    + "wizS.kopiAddon=!!cb.checked;"
    + "var lbl=document.getElementById('wizKopiAddonLbl');if(lbl)lbl.classList.toggle('on',wizS.kopiAddon);"
    + "var ks=document.getElementById('wizKopi');"
    + "var show=wizS.kopiAddon||(wizS.act==='kopi'&&wizS.tipe==='income');"
    + "if(ks)ks.className='fin-dynamic'+(show?' open':'');"
    + "var ad=document.getElementById('wizAddonDisplay');"
    + "if(ad)ad.style.display=wizS.kopiAddon?'':'none';"
    + "var chip=document.getElementById('wizKopiInfoChip');"
    + "if(chip)chip.textContent=wizS.kopiAddon&&wizS.act==='billiard'?'Tambahkan minuman/makanan ke transaksi sewa meja ini.':'Pilih item dari menu dan atur jumlah. Total otomatis terhitung.';"
    + "wizRefreshAddonDisplay();"
    + "wizHideErr('wizKopiErr');}"
    + "function wizRefreshAddonDisplay(){"
    + "if(!(wizS.act==='billiard'&&wizS.kopiAddon))return;"
    + "var kopiTotal=0;"
    + "document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){"
    + "var sel=r.querySelector('select');"
    + "if(!(sel&&sel.value&&sel.selectedIndex>0))return;"
    + "var qty=r.querySelector('.fin-qty-inp');"
    + "var opt=sel.options[sel.selectedIndex];"
    + "var kat=opt.dataset.kategori||'minuman';"
    + "var hargaHot=parseInt(opt.dataset.hargaHot||'0');"
    + "var temp=r.dataset.temp||'ice';"
    + "var harga=(kat==='minuman'&&hargaHot>0&&temp==='hot')?hargaHot:parseInt(opt.dataset.harga||'0');"
    + "var q=parseInt(qty?qty.value:'1')||1;"
    + "kopiTotal+=harga*q;"
    + "r.querySelectorAll('.wiz-tops label').forEach(function(lbl){"
    + "var cb=lbl.querySelector('input[type=checkbox]');"
    + "if(!cb||!cb.checked)return;"
    + "var topH=parseInt(cb.dataset.topHarga||'0');"
    + "var topQEl=lbl.querySelector('input[type=number]');"
    + "kopiTotal+=topH*(parseInt(topQEl?topQEl.value:'1')||1);});});"
    + "var billRaw=(document.getElementById('wizJumlah').value||'').replace(/\\./g,'');"
    + "var billNum=parseInt(billRaw)||0;"
    + "var sub=document.getElementById('wizAddonSubText');"
    + "var grand=document.getElementById('wizAddonGrandText');"
    + "if(sub)sub.textContent=kopiTotal>0?('+ Rp '+kopiTotal.toLocaleString('id-ID')+' minuman/makanan'):'(belum ada item dipilih)';"
    + "if(grand)grand.textContent=(billNum+kopiTotal)>0?('Total dibayar: Rp '+(billNum+kopiTotal).toLocaleString('id-ID')):'';"
    + "wizS.kopiAddonTotal=kopiTotal;}"
    + "function wizSetWaktu(w){wizS.waktu=w;"
    + "document.getElementById('wiz-siang').className='fin-tog-btn'+(w==='siang'?' sel-siang':'');"
    + "document.getElementById('wiz-malam').className='fin-tog-btn'+(w==='malam'?' sel-malam':'');"
    + "wizComputeBilliardPrice();}"
    // Auto-hitung harga Main Billiard: 1 jam = 10rb siang / 12rb malam.
    // Open / Loss → clear field (user input manual). Empty/non-billiard → skip.
    + "function wizComputeBilliardPrice(){"
    + "if(wizS.act!=='billiard'||wizS.tipe!=='income')return;"
    + "var dr=document.getElementById('wizDurasi');var jEl=document.getElementById('wizJumlah');"
    + "if(!dr||!jEl)return;"
    + "var v=dr.value;"
    + "if(v==='Open / Loss'){jEl.value='';wizHideErr('wizJumlahErr');wizRefreshAddonDisplay();return;}"
    + "var m=v&&v.match(/^(\\d+) Jam$/);"
    + "if(!m){wizRefreshAddonDisplay();return;}"
    + "var jam=parseInt(m[1]);var rate=wizS.waktu==='malam'?12000:10000;"
    + "jEl.value=String(jam*rate);wizFmtJ(jEl);wizHideErr('wizJumlahErr');wizRefreshAddonDisplay();}"
    + "function wizSetBayar(b){wizS.bayar=b;"
    + "document.getElementById('wiz-cash').className='fin-tog-btn'+(b==='cash'?' sel':'');"
    + "document.getElementById('wiz-qris').className='fin-tog-btn'+(b==='qris'?' sel':'');"
    + "wizUpdateUpload();}"
    + "var WIZ_EXTRAS_HTML="
    + safeJson(
        '<div class="wiz-extras" style="grid-column:1/-1;display:none;flex-direction:column;gap:6px;padding:6px 0 2px">'
        + '<div class="wiz-temp" style="display:none;flex-direction:row;gap:6px;align-items:center">'
        + '<span style="font-size:11px;color:var(--txt2)">Suhu:</span>'
        + '<button type="button" data-temp="ice" onclick="wizSetTemp(this,\'ice\')" style="padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid #3b82f6;background:rgba(59,130,246,.12);color:#3b82f6;font-family:inherit">❄ Ice</button>'
        + '<button type="button" data-temp="hot" onclick="wizSetTemp(this,\'hot\')" style="padding:3px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--txt2);font-family:inherit">☕ Hot</button>'
        + '</div>'
        + '<div class="wiz-tops" style="display:none;flex-direction:column;gap:4px"></div>'
        + '</div>'
      ) + ";"
    // ── Detail Transaksi Modal (tap row di mobile → buka detail full) ─
    + "function _rpFmt(n){var a=Math.abs(Math.round(Number(n)||0));var s=String(a);var p=[];for(var i=s.length;i>0;i-=3)p.unshift(s.slice(Math.max(0,i-3),i));return (Number(n)<0?'-':'')+'Rp '+p.join('.');}"
    + "function openTrxDetail(idx){"
    +   "var t=TRX_DATA[idx];if(!t)return;"
    +   "var isIn=t.jenis==='pemasukan';var isVoid=!!t.voidedAt;"
    +   "var tglFmt=new Date(t.tanggal+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});"
    +   "var pencatatNm=t.dicatatOleh?(USER_NAME_MAP[t.dicatatOleh]||t.dicatatOleh):'—';"
    +   "var pencatatShift=t.dicatatOleh?(USER_SHIFT_MAP[t.dicatatOleh]||'siang'):'';"
    +   "var shiftIc=pencatatShift==='malam'?'🌙 Malam':pencatatShift==='siang'?'☀️ Siang':'';"
    +   "var bayarLbl=t.bayar==='cash'?'💵 Cash':t.bayar==='qris'?'⚡ QRIS':'—';"
    +   "var rows=[];"
    +   "rows.push({l:'Tanggal',v:tglFmt+(t.jam?' · '+t.jam:'')});"
    +   "rows.push({l:'Tipe',v:'<span class=\"t-badge '+(isIn?'in':'out')+'\">'+(isIn?'↑ Masuk':'↓ Keluar')+'</span>'});"
    +   "rows.push({l:'Kategori',v:t.kategori||'—'});"
    +   "if(t.subKategori)rows.push({l:'Sub Kategori',v:t.subKategori});"
    +   "rows.push({l:'Keterangan',v:t.keterangan||'<em style=\"color:var(--txt3)\">(tanpa keterangan)</em>'});"
    +   "rows.push({l:'Jumlah',v:'<span style=\"font-size:18px;font-weight:700;font-family:var(--ff-mono);color:'+(isIn?'#22c55e':'#ef4444')+'\">'+(isIn?'+':'-')+_rpFmt(t.jumlah)+'</span>'});"
    +   "rows.push({l:'Metode',v:bayarLbl});"
    +   "if(pencatatNm!=='—')rows.push({l:'Dicatat oleh',v:pencatatNm+(shiftIc?' <span style=\"font-size:11px;color:var(--txt3);margin-left:4px\">'+shiftIc+'</span>':'')});"
    +   "rows.push({l:'ID',v:'<span style=\"font-family:var(--ff-mono);font-size:11px;color:var(--txt3)\">#'+String(t.id).slice(-8)+'</span>'});"
    +   "if(t.buktiUrl)rows.push({l:'Bukti Foto',v:'<a href=\"'+t.buktiUrl+'\" target=\"_blank\"><img src=\"'+t.buktiUrl+'\" style=\"max-width:160px;max-height:160px;border-radius:8px;border:1px solid var(--border);cursor:pointer\"></a>'});"
    +   "if(isVoid)rows.push({l:'Status',v:'<span class=\"trx-void-badge\">VOID</span> <span style=\"font-size:12px;color:var(--txt3);margin-left:6px\">'+(t.voidReason||'—')+'</span>'});"
    +   "var body=rows.map(function(r){return '<div class=\"trx-dt-row\"><div class=\"trx-dt-l\">'+r.l+'</div><div class=\"trx-dt-v\">'+r.v+'</div></div>';}).join('');"
    +   "document.getElementById('trxDtBody').innerHTML=body;"
    +   "var footer='';"
    +   "if(!isVoid){"
    +     "var desc=(t.keterangan||t.kategori||'(tanpa keterangan)').replace(/'/g,'&apos;').replace(/\"/g,'&quot;');"
    +     "var amount=(isIn?'+':'-')+_rpFmt(t.jumlah);"
    +     "footer='<button type=\"button\" class=\"trx-dt-btn-void\" onclick=\"closeTrxDetail();var b={dataset:{id:\\''+t.id+'\\',desc:\\''+desc+'\\',amount:\\''+amount+'\\'}};openVoidModal(b);\">"
    +       "<i class=\"ti ti-ban\"></i> Batalkan Transaksi</button>';"
    +   "}"
    +   "footer+='<button type=\"button\" class=\"trx-dt-btn-close\" onclick=\"closeTrxDetail()\">Tutup</button>';"
    +   "document.getElementById('trxDtFooter').innerHTML=footer;"
    +   "document.getElementById('trxDetailOv').classList.add('open');"
    + "}"
    + "function closeTrxDetail(){document.getElementById('trxDetailOv').classList.remove('open');}"
    // ── Menu Item Picker (custom bottom-sheet, replace native select) ─
    + "var _mipSel=null;"
    + "function openItemPicker(btn,title,hideSearch){"
    +   "var wrap=btn.parentElement;var sel=wrap.querySelector('select');if(!sel)return;"
    +   "_mipSel=sel;"
    +   "var list=document.getElementById('mipList');if(!list)return;"
    +   "list.innerHTML='';"
    +   "var currentVal=sel.value;"
    +   "var groups={};var groupOrder=[];"
    +   "for(var i=1;i<sel.options.length;i++){"
    +     "var o=sel.options[i];if(!o.value)continue;"
    +     "var kat=(o.dataset.kategori||'lainnya').toLowerCase();"
    +     "if(!groups[kat]){groups[kat]=[];groupOrder.push(kat);}"
    +     "groups[kat].push(o);"
    +   "}"
    // Skip group labels kalau cuma 1 group default 'lainnya' (flat list spt meja/durasi)
    +   "var skipLabels=groupOrder.length===1&&groupOrder[0]==='lainnya';"
    +   "var html='';"
    +   "var katLabel={minuman:'Minuman',snack:'Snack',rokok:'Rokok',lainnya:'Lainnya'};"
    +   "groupOrder.forEach(function(kat){"
    +     "if(!skipLabels)html+='<div class=\"mip-group-lbl\">'+(katLabel[kat]||kat)+'</div>';"
    +     "groups[kat].forEach(function(o){"
    +       "var sel2=o.value===currentVal?' active':'';"
    +       "html+='<button type=\"button\" class=\"mip-item'+sel2+'\" data-v=\"'+o.value.replace(/\"/g,'&quot;')+'\" data-l=\"'+o.text.replace(/\"/g,'&quot;')+'\" onclick=\"pickItem(this)\">'+o.text+'</button>';"
    +     "});"
    +   "});"
    +   "list.innerHTML=html;"
    // Set title & search visibility dinamic
    +   "var titleEl=document.getElementById('mipSheetTitle');if(titleEl)titleEl.textContent=title||'Pilih Item';"
    +   "var searchWrap=document.getElementById('mipSearchWrap');if(searchWrap)searchWrap.style.display=hideSearch?'none':'';"
    +   "document.getElementById('mipOv').classList.add('open');"
    // Auto-focus search hanya kalau search visible
    +   "if(!hideSearch)setTimeout(function(){var s=document.getElementById('mipSearch');if(s){s.value='';s.focus();}},150);"
    + "}"
    + "function pickItem(itBtn){"
    +   "if(!_mipSel)return;"
    +   "var v=itBtn.getAttribute('data-v');var l=itBtn.getAttribute('data-l');"
    +   "_mipSel.value=v;"
    +   "var wrap=_mipSel.parentElement;var disp=wrap.querySelector('.mip-text');"
    +   "if(disp)disp.textContent=l;"
    +   "if(disp&&v)disp.classList.add('mip-text-filled');"
    +   "_mipSel.dispatchEvent(new Event('change',{bubbles:true}));"
    +   "closeItemPicker();"
    + "}"
    + "function closeItemPicker(){document.getElementById('mipOv').classList.remove('open');_mipSel=null;}"
    + "function filterItemPicker(){"
    +   "var q=(document.getElementById('mipSearch').value||'').toLowerCase();"
    +   "var items=document.querySelectorAll('#mipList .mip-item');"
    +   "items.forEach(function(it){"
    +     "var match=!q||it.textContent.toLowerCase().indexOf(q)>=0;"
    +     "it.style.display=match?'':'none';"
    +   "});"
    +   "var labels=document.querySelectorAll('#mipList .mip-group-lbl');"
    +   "labels.forEach(function(lbl){"
    +     "var nxt=lbl.nextElementSibling;var hasVis=false;"
    +     "while(nxt&&!nxt.classList.contains('mip-group-lbl')){"
    +       "if(nxt.style.display!=='none'){hasVis=true;break;}"
    +       "nxt=nxt.nextElementSibling;"
    +     "}"
    +     "lbl.style.display=hasVis?'':'none';"
    +   "});"
    + "}"
    + "function wizAddItem(){"
    + "var c=document.getElementById('wizMenuItems'),r=document.createElement('div');r.className='fin-menu-row';"
    + "r.innerHTML='<div class=\"mip-wrap\"><select class=\"fsel mip-sel\" onchange=\"wizItemChange(this)\">'+WIZ_MENU_OPTS+'</select>'"
    + "+'<button type=\"button\" class=\"mip-btn\" onclick=\"openItemPicker(this)\">'"
    + "+'<span class=\"mip-text\">Pilih item...</span>'"
    + "+'<i class=\"ti ti-chevron-down\" style=\"font-size:14px;color:var(--txt3);flex-shrink:0\"></i>'"
    + "+'</button></div>'"
    + "+'<div class=\"fin-qty-stepper\">'"
    + "+'<button type=\"button\" class=\"fin-qty-btn\" onclick=\"wizQtyMinus(this)\" aria-label=\"Kurangi\">\\u2212</button>'"
    + "+'<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\" inputmode=\"numeric\" oninput=\"wizCalcTotal()\">'"
    + "+'<button type=\"button\" class=\"fin-qty-btn\" onclick=\"wizQtyPlus(this)\" aria-label=\"Tambah\">+</button>'"
    + "+'</div>'"
    + "+'<button type=\"button\" class=\"fin-btn-rm-row\" onclick=\"wizRmItem(this)\"><i class=\"ti ti-x\"></i></button>'"
    + "+WIZ_EXTRAS_HTML;"
    + "c.appendChild(r);}"
    + "function wizItemChange(sel){"
    + "var row=sel.closest('.fin-menu-row');"
    + "var opt=sel.selectedIndex>0?sel.options[sel.selectedIndex]:null;"
    + "var extras=row.querySelector('.wiz-extras');"
    + "var tempDiv=row.querySelector('.wiz-temp');"
    + "var topsDiv=row.querySelector('.wiz-tops');"
    + "if(!opt||!opt.value){if(extras)extras.style.display='none';wizCalcTotal();return;}"
    + "var hargaHot=parseInt(opt.dataset.hargaHot||'0');"
    + "var kat=opt.dataset.kategori||'minuman';"
    + "var nama=opt.value;"
    + "var showTemp=kat==='minuman'&&hargaHot>0;"
    + "var tops=WIZ_TOPPINGS[nama]||[];"
    + "var showTops=tops.length>0;"
    + "if(tempDiv){tempDiv.style.display=showTemp?'flex':'none';"
    + "if(showTemp&&!row.dataset.temp)row.dataset.temp='ice';}"
    + "if(topsDiv){topsDiv.style.display=showTops?'flex':'none';"
    + "if(showTops){topsDiv.innerHTML=tops.map(function(t){"
    + "return '<label style=\"display:flex;align-items:center;gap:6px;font-size:11px;color:var(--txt);cursor:pointer\">'"
    + "+'<input type=\"checkbox\" data-top-harga=\"'+t.harga+'\" onchange=\"wizCalcTotal()\" style=\"width:14px;height:14px;accent-color:#3a7d2c;cursor:pointer\">'"
    + "+'<span>'+t.nama+'</span>'"
    + "+'<span style=\"color:var(--txt2)\">+Rp '+Number(t.harga).toLocaleString('id-ID')+'</span>'"
    + "+'<input type=\"number\" value=\"1\" min=\"1\" max=\"10\" onchange=\"wizCalcTotal()\" style=\"width:44px;padding:2px 6px;border-radius:5px;border:1px solid var(--border2);font-size:11px;text-align:center;background:var(--surface2);color:var(--txt);font-family:inherit\">'"
    + "+'</label>';}).join('');}}"
    + "if(extras)extras.style.display=(showTemp||showTops)?'flex':'none';"
    + "wizCalcTotal();}"
    + "function wizSetTemp(btn,temp){"
    + "var row=btn.closest('.fin-menu-row');"
    + "row.dataset.temp=temp;"
    + "var tempDiv=row.querySelector('.wiz-temp');"
    + "if(tempDiv){tempDiv.querySelectorAll('button').forEach(function(b){"
    + "var isIce=b.dataset.temp==='ice';"
    + "var isHot=b.dataset.temp==='hot';"
    + "if(b.dataset.temp===temp){"
    + "b.style.borderColor=isIce?'#3b82f6':'#ef4444';"
    + "b.style.background=isIce?'rgba(59,130,246,.12)':'rgba(239,68,68,.1)';"
    + "b.style.color=isIce?'#3b82f6':'#ef4444';"
    + "}else{"
    + "b.style.borderColor='var(--border2)';b.style.background='transparent';b.style.color='var(--txt2)';}});}"
    + "wizCalcTotal();}"
    + "function wizRmItem(btn){var rows=document.querySelectorAll('#wizMenuItems .fin-menu-row');if(rows.length>1){btn.closest('.fin-menu-row').remove();wizCalcTotal();}}"
    + "function wizQtyMinus(btn){var inp=btn.parentElement.querySelector('.fin-qty-inp');var v=(parseInt(inp.value)||1)-1;inp.value=Math.max(1,v);wizCalcTotal();}"
    + "function wizQtyPlus(btn){var inp=btn.parentElement.querySelector('.fin-qty-inp');inp.value=(parseInt(inp.value)||0)+1;wizCalcTotal();}"
    + "function wizCalcTotal(){"
    // Billiard + addon: items berkontribusi ke kopi_jumlah terpisah, BUKAN ke wizJumlah
    + "if(wizS.act==='billiard'&&wizS.kopiAddon){wizRefreshAddonDisplay();return;}"
    + "var total=0;"
    + "document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){"
    + "var sel=r.querySelector('select');var qty=r.querySelector('.fin-qty-inp');"
    + "if(sel&&sel.value&&sel.selectedIndex>0){"
    + "var opt=sel.options[sel.selectedIndex];"
    + "var kat=opt.dataset.kategori||'minuman';"
    + "var hargaHot=parseInt(opt.dataset.hargaHot||'0');"
    + "var temp=r.dataset.temp||'ice';"
    + "var harga=(kat==='minuman'&&hargaHot>0&&temp==='hot')?hargaHot:parseInt(opt.dataset.harga||'0');"
    + "var q=parseInt(qty?qty.value:'1')||1;"
    + "total+=harga*q;"
    + "r.querySelectorAll('.wiz-tops label').forEach(function(lbl){"
    + "var cb=lbl.querySelector('input[type=checkbox]');"
    + "if(!cb||!cb.checked)return;"
    + "var topH=parseInt(cb.dataset.topHarga||'0');"
    + "var topQEl=lbl.querySelector('input[type=number]');"
    + "total+=topH*(parseInt(topQEl?topQEl.value:'1')||1);});}});"
    + "var jEl=document.getElementById('wizJumlah');"
    + "if(jEl){var s=total>0?String(total).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):'';"
    + "jEl.value=s;}"
    + "wizHideErr('wizJumlahErr');}"
    + "function wizHideErr(id){var el=document.getElementById(id);if(el)el.style.display='none';}"
    + "function wizFmtJ(el){var raw=el.value.replace(/\\D/g,'');var n=parseInt(raw)||0;var s=n>0?String(n):'';el.value=s?s.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):''}"
    + "function wizNowLocal(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}"
    + "function wizUpdateDateDisplay(){"
    + "var el=document.getElementById('wizDatetime');var disp=document.getElementById('wizDateDisplay');"
    + "if(!el||!disp||!el.value){if(disp)disp.textContent='';return;}"
    + "var parts=el.value.split('T');var dp=parts[0].split('-');"
    + "var Y=parseInt(dp[0]),M=parseInt(dp[1])-1,D=parseInt(dp[2]);var jam=parts[1]||'';"
    + "var HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];"
    + "var BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];"
    + "var d=new Date(Y,M,D);"
    + "var base=HARI[d.getDay()]+', '+D+' '+BULAN[M]+' '+Y+(jam?' \\u00B7 '+jam:'');"
    // Business day hint: kalau jam < CUTOFF, transaksi akan masuk shift kemarin
    + "var CUT=" + CONFIG.BUSINESS_DAY_CUTOFF_HOUR + ";"
    + "var hour=parseInt((jam||'00:00').split(':')[0])||0;"
    + "if(hour<CUT){"
    + "var bd=new Date(Y,M,D);bd.setDate(bd.getDate()-1);"
    + "var hint=' \\u2192 Tercatat ke shift '+HARI[bd.getDay()]+', '+bd.getDate()+' '+BULAN[bd.getMonth()];"
    + "disp.innerHTML=base+'<span style=\"color:#f59e0b;font-weight:600\">'+hint+'</span>';"
    + "}else{disp.textContent=base;}}"
    + "function wizGoTo(n){"
    + "wizS.step=n;"
    + "[1,2,3].forEach(function(i){document.getElementById('wizStep'+i).style.display=i===n?'':'none';});"
    + "if(n===2){"
    + "var isBill=wizS.act==='billiard'&&wizS.tipe==='income';"
    + "var isKopi=wizS.act==='kopi'&&wizS.tipe==='income';"
    + "var isOth=wizS.act==='other'||wizS.tipe==='expense';"
    + "var bs=document.getElementById('wizBilliard'),ks=document.getElementById('wizKopi'),os=document.getElementById('wizOther');"
    + "if(bs)bs.className='fin-dynamic'+(isBill?' open':'');"
    // Show wizKopi for standalone Kopi mode OR sebagai addon di Billiard
    + "if(ks)ks.className='fin-dynamic'+(isKopi||(isBill&&wizS.kopiAddon)?' open':'');"
    + "if(os)os.className='fin-dynamic'+(isOth?' open':'');"
    // Info chip text: dinamic — beda saat addon vs standalone kopi
    + "var chip=document.getElementById('wizKopiInfoChip');"
    + "if(chip)chip.textContent=isBill&&wizS.kopiAddon?'Tambahkan minuman/makanan ke transaksi sewa meja ini.':'Pilih item dari menu dan atur jumlah. Total otomatis terhitung.';"
    + "var ad=document.getElementById('wizAddonDisplay');"
    + "if(ad)ad.style.display=isBill&&wizS.kopiAddon?'':'none';"
    + "if(isBill&&wizS.kopiAddon)wizRefreshAddonDisplay();"
    + "var gi=document.getElementById('wizGrpIn'),go=document.getElementById('wizGrpOut');"
    + "if(gi)gi.style.display=wizS.tipe==='income'?'':'none';"
    + "if(go)go.style.display=wizS.tipe==='expense'?'':'none';wizUpdateUpload();}"
    + "if(n===3){"
    + "var actMap={billiard:'Main Billiard',kopi:'Kopi / Snack',other:'Lainnya'};"
    + "document.getElementById('sumTipe').textContent=wizS.tipe==='income'?'Pemasukan':'Pengeluaran';"
    + "var aktTxt=wizS.tipe==='expense'?'Pengeluaran':(actMap[wizS.act]||'—');"
    + "if(wizS.act==='billiard'&&wizS.kopiAddon)aktTxt+=' + Kopi/Snack';"
    + "document.getElementById('sumAkt').textContent=aktTxt;"
    + "document.getElementById('sumWaktu').textContent=wizS.waktu==='siang'?'Siang':'Malam';"
    + "var kat='';"
    + "if(wizS.tipe==='expense'||wizS.act==='other'){var ks2=document.getElementById('wizKatSel');if(ks2&&ks2.selectedIndex>=0)kat=ks2.options[ks2.selectedIndex].text;}"
    + "else if(wizS.act==='billiard'){kat='Sewa Meja';}else if(wizS.act==='kopi'){kat='Kopi / Snack';}"
    + "document.getElementById('sumKat').textContent=kat||'—';"
    + "var ket='';var kopiKet='';var kopiJNum=0;"
    // Helper: build items array (description + total) from #wizMenuItems
    + "function _wizBuildItems(){"
    + "var arr=[];var sum=0;"
    + "document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){"
    + "var sel=r.querySelector('select');var qty=r.querySelector('.fin-qty-inp');"
    + "if(!(sel&&sel.value))return;"
    + "var q=parseInt(qty?qty.value:'1')||1;"
    + "var opt2=sel.options[sel.selectedIndex];"
    + "var kat2=opt2?opt2.dataset.kategori||'minuman':'minuman';"
    + "var hH=opt2?parseInt(opt2.dataset.hargaHot||'0'):0;"
    + "var tmp=r.dataset.temp||'ice';"
    + "var harga2=(kat2==='minuman'&&hH>0&&tmp==='hot')?hH:parseInt(opt2?opt2.dataset.harga:'0')||0;"
    + "sum+=harga2*q;"
    + "var iStr=q>1?q+'\\xD7 '+sel.value:sel.value;"
    + "if(kat2==='minuman'&&hH>0)iStr+=' ('+tmp+')';"
    + "var ts=[];r.querySelectorAll('.wiz-tops label').forEach(function(lbl){"
    + "var cb=lbl.querySelector('input[type=checkbox]');"
    + "if(!cb||!cb.checked)return;"
    + "var tq=parseInt(lbl.querySelector('input[type=number]')?lbl.querySelector('input[type=number]').value:'1')||1;"
    + "var tn=lbl.querySelector('span')?lbl.querySelector('span').textContent:'';"
    + "var topH2=parseInt(cb.dataset.topHarga||'0');"
    + "sum+=topH2*tq;"
    + "ts.push(tq>1?tq+'\\xD7 '+tn:tn);});"
    + "if(ts.length)iStr+=' + '+ts.join(', ');"
    + "arr.push(iStr);});"
    + "return {ket:arr.join(', '),total:sum};}"
    + "if(wizS.act==='billiard'&&wizS.tipe==='income'){"
    + "var mj=document.getElementById('wizMeja');var dr=document.getElementById('wizDurasi');"
    + "var dtl=document.getElementById('wizDetailMainInp');"
    + "ket=(mj?mj.value:'')+(dr&&dr.value?' · '+dr.value:'');"
    + "if(dr&&dr.value==='Open / Loss'&&dtl&&dtl.value.trim())ket+=' ('+dtl.value.trim()+')';"
    + "if(wizS.kopiAddon){var ki=_wizBuildItems();kopiKet=ki.ket;kopiJNum=ki.total;}}"
    + "else if(wizS.act==='kopi'&&wizS.tipe==='income'){"
    + "var ki2=_wizBuildItems();ket=ki2.ket;}"
    + "var ketExtra=(document.getElementById('wizKet')?document.getElementById('wizKet').value:'').trim();"
    + "if(ket&&ketExtra&&ket!==ketExtra)ket=ket+' — '+ketExtra;else if(!ket)ket=ketExtra;"
    // Summary keterangan: combine billiard + kopi addon utk display
    + "var sumKetDisp=ket;"
    + "if(wizS.kopiAddon&&kopiKet)sumKetDisp=(ket?ket+' + ':'')+kopiKet;"
    + "document.getElementById('sumKet').textContent=sumKetDisp||'—';"
    + "var jRaw=(document.getElementById('wizJumlah')?document.getElementById('wizJumlah').value:'').replace(/\\./g,'');"
    + "var jNum=parseInt(jRaw)||0;"
    // Summary total: grand total saat addon aktif
    + "document.getElementById('sumTotal').textContent='Rp '+(jNum+kopiJNum).toLocaleString('id-ID');"
    + "document.getElementById('wizFJenis').value=wizS.tipe==='income'?'pemasukan':'pengeluaran';"
    + "document.getElementById('wizFWaktu').value=wizS.waktu;"
    + "var dtEl=document.getElementById('wizDatetime');document.getElementById('wizFDt').value=dtEl?dtEl.value:'';"
    + "document.getElementById('wizFKat').value=kat;"
    + "var subEl2=document.getElementById('wizSubKatSel');var subKatVal=(subEl2&&subEl2.value&&subEl2.value!=='')?subEl2.options[subEl2.selectedIndex].text:'';"
    + "document.getElementById('wizFSubKat').value=subKatVal;"
    + "document.getElementById('wizFKet').value=ket;"
    + "document.getElementById('wizFJ').value=jRaw;"
    + "document.getElementById('wizFKopiKet').value=kopiKet;"
    + "document.getElementById('wizFKopiJ').value=kopiJNum>0?String(kopiJNum):'';"
    + "document.getElementById('wizFBayar').value=wizS.bayar;"
    + "var sbEl=document.getElementById('sumBayar');if(sbEl)sbEl.textContent=wizS.bayar==='qris'?'QRIS':'Cash';"
    + "}"
    + "var pct={1:33,2:66,3:100};document.getElementById('wizProg').style.width=pct[n]+'%';"
    + "[1,2,3].forEach(function(i){document.getElementById('wizSd'+i).className='fin-sd'+(i===n?' active':i<n?' done':'');});"
    + "document.getElementById('wizStepLbl').textContent='Langkah '+n+' dari 3';"
    + "document.getElementById('wizBtnBack').style.display=n>1?'':'none';"
    + "var nb=document.getElementById('wizBtnNext');"
    + "if(n===3){nb.innerHTML='<i class=\"ti ti-check\" style=\"font-size:15px\"></i> Simpan Transaksi';"
    + "nb.onclick=function(){nb.disabled=true;nb.style.opacity='.7';nb.innerHTML='<i class=\"fin-spin ti ti-loader-2\" style=\"font-size:15px\"></i> Menyimpan...';startLoad();setTimeout(function(){document.getElementById('wizForm').submit();},80);};}"
    + "else{nb.innerHTML='Lanjut <i class=\"ti ti-arrow-right\" style=\"font-size:15px\"></i>';nb.onclick=wizNext;}"
    + "var icons={1:'ti-receipt',2:'ti-forms',3:'ti-circle-check'};"
    + "document.getElementById('wizIcon').innerHTML='<i class=\"ti '+icons[n]+'\"></i>';}"
    + "function wizDurasiChange(v){"
    + "var el=document.getElementById('wizDetailMain');"
    + "if(el)el.style.display=v==='Open / Loss'?'':'none';"
    + "wizHideErr('wizDetailMainErr');wizHideErr('wizDurasiErr');"
    + "wizComputeBilliardPrice();}"
    + "function wizShowErr(id,msg){"
    + "var el=document.getElementById(id);"
    + "if(el){el.textContent=msg;el.style.display='';el.scrollIntoView({block:'nearest'});}}"
    + "function wizNext(){"
    // STEP 1 validation: tanggal & jam wajib
    + "if(wizS.step===1){"
    + "var dtEl=document.getElementById('wizDatetime');"
    + "if(!dtEl||!dtEl.value){"
    + "if(dtEl){dtEl.focus();dtEl.style.borderColor='#a32d2d';"
    + "setTimeout(function(){dtEl.style.borderColor='';},2000);}"
    + "alert('Tanggal & jam wajib diisi.');return;}}"
    + "if(wizS.step===2){"
    + "if(wizS.act==='billiard'&&wizS.tipe==='income'){"
    + "var mj=document.getElementById('wizMeja');"
    + "if(!mj||!mj.value){wizShowErr('wizMejaErr','Nomor meja wajib dipilih.');return;}"
    + "var dr=document.getElementById('wizDurasi');"
    + "if(!dr||!dr.value){wizShowErr('wizDurasiErr','Durasi wajib dipilih.');return;}"
    + "if(dr.value==='Open / Loss'){"
    + "var dtl=document.getElementById('wizDetailMainInp');"
    + "if(!dtl||!dtl.value.trim()){wizShowErr('wizDetailMainErr','Detail main wajib diisi untuk durasi Open / Loss.');if(dtl)dtl.focus();return;}}}"
    + "if((wizS.act==='kopi'||(wizS.act==='billiard'&&wizS.kopiAddon))&&wizS.tipe==='income'){"
    + "var hasItem=false;"
    + "document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){var s=r.querySelector('select');if(s&&s.value)hasItem=true;});"
    + "if(!hasItem){wizShowErr('wizKopiErr',wizS.act==='billiard'?'Pilih minimal 1 item, atau matikan opsi minum/makan.':'Pilih minimal 1 item pesanan.');return;}}"
    // Pengeluaran / Lainnya: kategori wajib + sub kategori wajib (kalau ada)
    + "if(wizS.tipe==='expense'||wizS.act==='other'){"
    + "var ksel=document.getElementById('wizKatSel');"
    + "if(!ksel||!ksel.value){wizShowErr('wizKatErr','Kategori wajib dipilih.');if(ksel)ksel.focus();return;}"
    + "var subWrap=document.getElementById('wizSubKatWrap');"
    + "if(subWrap&&subWrap.style.display!=='none'){"
    + "var ssel=document.getElementById('wizSubKatSel');"
    + "if(!ssel||!ssel.value){wizShowErr('wizSubKatErr','Sub kategori wajib dipilih.');if(ssel)ssel.focus();return;}}}"
    + "var jEl=document.getElementById('wizJumlah');"
    + "var jRaw=jEl?jEl.value.replace(/\\./g,''):'';"
    + "if(!(parseInt(jRaw)>0)){wizShowErr('wizJumlahErr','Jumlah harus diisi dan lebih dari 0.');if(jEl)jEl.focus();return;}"
    + "}"
    + "if(wizS.step<3)wizGoTo(wizS.step+1);}"
    + "function wizPrev(){if(wizS.step>1)wizGoTo(wizS.step-1);}"
    + "var subKatData=" + subKatJson + ";"
    + "function wizOnKatChange(sel){"
    + "var katName=sel.options[sel.selectedIndex]?sel.options[sel.selectedIndex].text:'';"
    + "var subs=subKatData[katName]||[];"
    + "var wrap=document.getElementById('wizSubKatWrap');"
    + "var subSel=document.getElementById('wizSubKatSel');"
    + "if(subs.length>0&&wrap&&subSel){"
    + "subSel.innerHTML='<option value=\"\" disabled selected hidden>— Pilih sub kategori —</option>'+subs.map(function(n){return '<option>'+n+'</option>';}).join('');"
    + "wrap.style.display='';wizHideErr('wizSubKatErr');}"
    + "else if(wrap){wrap.style.display='none';}}"
    // Charts
    + "(function(){"
    + "var bc=document.getElementById('barChart');"
    + "if(bc){var bctx=bc.getContext('2d');"
    + "var inGrad=bctx.createLinearGradient(0,0,0,240);inGrad.addColorStop(0,'rgba(34,197,94,.9)');inGrad.addColorStop(1,'rgba(34,197,94,.45)');"
    + "var outGrad=bctx.createLinearGradient(0,0,0,240);outGrad.addColorStop(0,'rgba(239,68,68,.85)');outGrad.addColorStop(1,'rgba(239,68,68,.35)');"
    + "new Chart(bc,{type:'bar',data:{labels:" + chartLabelsJson + ",datasets:["
    + "{label:'Pemasukan',data:" + chartInJson + ",backgroundColor:inGrad,borderRadius:6,borderSkipped:false,borderWidth:0},"
    + "{label:'Pengeluaran',data:" + chartOutJson + ",backgroundColor:outGrad,borderRadius:6,borderSkipped:false,borderWidth:0}"
    + "]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},"
    + "plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(15,23,42,.88)',titleColor:'#e2e8f0',bodyColor:'#94a3b8',padding:10,cornerRadius:8,"
    + "callbacks:{label:function(ctx){var v=ctx.raw||0;return ' '+ctx.dataset.label+': Rp '+Number(v).toLocaleString('id-ID');}}}},"
    + "scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11},color:'#94a3b8'}},"
    + "y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.15)'},border:{display:false},ticks:{font:{size:11},color:'#94a3b8',"
    + "callback:function(v){return v>=1e6?(v/1e6).toFixed(1)+'jt':v>=1000?(v/1000).toFixed(0)+'rb':v;}}}}}}); }"
    + "var dc=document.getElementById('donutChart');"
    + "if(dc)new Chart(dc,{type:'doughnut',data:{labels:" + donutLabelsJson + ",datasets:[{data:" + donutValsJson + ",backgroundColor:" + donutColorsJson + ",borderWidth:2,borderColor:'#fff',hoverOffset:8}]},"
    + "options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},"
    + "tooltip:{backgroundColor:'rgba(15,23,42,.88)',titleColor:'#e2e8f0',bodyColor:'#94a3b8',padding:10,cornerRadius:8,"
    + "callbacks:{label:function(ctx){return ' '+ctx.label+': Rp '+Number(ctx.raw||0).toLocaleString('id-ID');}}}}}}); "
    + "})();"
    // ── Detail chart: tanggal / hari / jam ──────────────────────
    + "(function(){"
    + "var dc2el=document.getElementById('detailChart');if(!dc2el)return;"
    + "var chartData={"
    + "tanggal:{labels:" + byDateLabelsJson + ",inp:" + byDateInpJson + ",out:" + byDateOutJson + "},"
    + "hari:{labels:['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'],inp:" + byDayInpJson + ",out:" + byDayOutJson + "},"
    + "jam:{labels:['00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'],inp:" + byHourInpJson + ",out:" + byHourOutJson + "}"
    + "};"
    + "var rpFmt=function(v){return 'Rp '+Number(v||0).toLocaleString('id-ID');};"
    + "var yTick=function(v){return v>=1e6?(v/1e6).toFixed(1)+'jt':v>=1000?(v/1000).toFixed(0)+'rb':v;};"
    + "var tooltipCfg={backgroundColor:'rgba(15,23,42,.92)',titleColor:'#e2e8f0',bodyColor:'#94a3b8',padding:12,cornerRadius:10,callbacks:{label:function(ctx){return ' '+ctx.dataset.label+': '+rpFmt(ctx.raw);}}};"
    // ── build bar chart config ───────────────────────────────────
    + "function makeBarCfg(d,maxTick){"
    + "var ctx=dc2el.getContext('2d');"
    + "var inG=ctx.createLinearGradient(0,0,0,220);inG.addColorStop(0,'rgba(34,197,94,.9)');inG.addColorStop(1,'rgba(34,197,94,.35)');"
    + "var outG=ctx.createLinearGradient(0,0,0,220);outG.addColorStop(0,'rgba(239,68,68,.85)');outG.addColorStop(1,'rgba(239,68,68,.3)');"
    + "return{type:'bar',data:{labels:d.labels,datasets:["
    + "{label:'Pemasukan',data:d.inp,backgroundColor:inG,borderRadius:5,borderSkipped:false,borderWidth:0},"
    + "{label:'Pengeluaran',data:d.out,backgroundColor:outG,borderRadius:5,borderSkipped:false,borderWidth:0}"
    + "]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},"
    + "plugins:{legend:{display:false},tooltip:tooltipCfg},"
    + "scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10},color:'#94a3b8',maxTicksLimit:maxTick}},"
    + "y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.15)'},border:{display:false},"
    + "ticks:{font:{size:10},color:'#94a3b8',callback:yTick}}}}};}"
    // ── build line chart config (untuk mode jam) ─────────────────
    + "function makeLineCfg(d){"
    + "return{type:'line',data:{labels:d.labels,datasets:["
    + "{label:'Pemasukan',data:d.inp,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.12)',"
    + "fill:true,tension:0.35,pointRadius:3,pointHoverRadius:6,borderWidth:2.5,pointBackgroundColor:'#22c55e',pointBorderColor:'#fff',pointBorderWidth:1.5},"
    + "{label:'Pengeluaran',data:d.out,borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.08)',"
    + "fill:true,tension:0.35,pointRadius:3,pointHoverRadius:6,borderWidth:2.5,pointBackgroundColor:'#ef4444',pointBorderColor:'#fff',pointBorderWidth:1.5}"
    + "]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},"
    + "plugins:{legend:{display:false},tooltip:tooltipCfg},"
    + "scales:{x:{grid:{color:'rgba(148,163,184,.08)'},border:{display:false},ticks:{font:{size:10},color:'#94a3b8',maxTicksLimit:12}},"
    + "y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.15)'},border:{display:false},"
    + "ticks:{font:{size:10},color:'#94a3b8',callback:yTick}}}}};}"
    // ── init dengan tanggal ──────────────────────────────────────
    + "var dc2inst=new Chart(dc2el,makeBarCfg(chartData.tanggal,16));"
    + "var curType='bar';"
    + "window.switchDetailChart=function(mode){"
    + "['tanggal','hari','jam'].forEach(function(m){"
    + "var b=document.getElementById('tab'+m.charAt(0).toUpperCase()+m.slice(1));if(b)b.classList.toggle('active',m===mode);});"
    + "var subMap={tanggal:'Per tanggal dalam bulan',hari:'Per hari dalam seminggu',jam:'Per jam dalam sehari'};"
    + "var sl=document.getElementById('fdcSubLabel');if(sl)sl.textContent=subMap[mode]||'';"
    + "var d=chartData[mode];"
    + "var needLine=mode==='jam';"
    + "if(needLine&&curType==='bar'||!needLine&&curType==='line'){"
    + "dc2inst.destroy();"
    + "dc2inst=new Chart(dc2el,needLine?makeLineCfg(d):makeBarCfg(d,mode==='tanggal'?16:7));"
    + "curType=needLine?'line':'bar';"
    + "}else{"
    + "dc2inst.data.labels=d.labels;"
    + "dc2inst.data.datasets[0].data=d.inp;"
    + "dc2inst.data.datasets[1].data=d.out;"
    + "if(!needLine)dc2inst.options.scales.x.ticks.maxTicksLimit=mode==='tanggal'?16:7;"
    + "dc2inst.update();}};"
    + "})();"
    + "function fmtSaldoKas(el){var raw=el.value.replace(/\\D/g,'');var n=parseInt(raw)||0;el.value=n>0?String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):'';}"
    + "function saveSaldoKas(){var v=(document.getElementById('finSaldoKas')||{}).value||'';var d=new Date();var today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');try{localStorage.setItem('fin_saldo_kas',JSON.stringify({v:v,d:today}));}catch(e){}}"
    + "(function(){try{var raw=localStorage.getItem('fin_saldo_kas');if(!raw)return;var obj=JSON.parse(raw);var d=new Date();var today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(obj&&obj.d===today){var el=document.getElementById('finSaldoKas');if(el&&obj.v)el.value=obj.v;}else{localStorage.removeItem('fin_saldo_kas');}}catch(e){}})();"
    + "function wizDropzoneClick(){var dz=document.getElementById('wizDropzone');if(dz&&dz.classList.contains('has-file'))return;document.getElementById('wizBuktiInput').click();}"
    + "function wizUpdateUpload(){var wrap=document.getElementById('wizUploadWrap');var lbl=document.getElementById('wizUploadLbl');var dzLbl=document.getElementById('dzLbl');if(!wrap)return;var showQris=wizS.bayar==='qris';var showNota=wizS.tipe==='expense';var show=showQris||showNota;wrap.style.display=show?'':'none';if(!show)return;"
    + "if(showNota){if(lbl)lbl.innerHTML='Foto Nota / Struk <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span>';if(dzLbl)dzLbl.textContent='Tap untuk foto nota atau struk';}"
    + "else{if(lbl)lbl.innerHTML='Bukti Transfer QRIS <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span>';if(dzLbl)dzLbl.textContent='Tap untuk upload bukti transfer QRIS';}}"
    + "function wizHandleFile(input){var file=input.files[0];if(!file)return;"
    + "if(file.size>5*1024*1024){alert('Ukuran file maksimal 5MB. Pilih foto yang lebih kecil.');input.value='';return;}"
    + "var reader=new FileReader();reader.onload=function(e){"
    + "var img=new Image();img.onload=function(){"
    + "var MAX=1200;var ratio=Math.min(MAX/img.width,MAX/img.height,1);"
    + "var w=Math.round(img.width*ratio),h=Math.round(img.height*ratio);"
    + "var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;"
    + "canvas.getContext('2d').drawImage(img,0,0,w,h);"
    + "var dataUrl=canvas.toDataURL('image/jpeg',0.78);"
    + "document.getElementById('wizFBukti').value=dataUrl;"
    + "var previewImg=document.getElementById('dzPreviewImg');"
    + "var fileName=document.getElementById('dzFileName');"
    + "var content=document.getElementById('dzContent');"
    + "var preview=document.getElementById('dzPreview');"
    + "var rmBtn=document.getElementById('wizRmFileBtn');"
    + "var dz=document.getElementById('wizDropzone');"
    + "if(previewImg)previewImg.src=dataUrl;"
    + "if(fileName)fileName.textContent=file.name+' → '+Math.round(dataUrl.length*0.75/1024)+'KB';"
    + "if(content)content.style.display='none';"
    + "if(preview)preview.style.display='';"
    + "if(rmBtn)rmBtn.style.display='';"
    + "if(dz)dz.classList.add('has-file');"
    + "};img.src=e.target.result;};reader.readAsDataURL(file);}"
    + "function wizRemoveFile(){var fb=document.getElementById('wizFBukti');if(fb)fb.value='';"
    + "var inp=document.getElementById('wizBuktiInput');if(inp)inp.value='';"
    + "var content=document.getElementById('dzContent');if(content)content.style.display='';"
    + "var preview=document.getElementById('dzPreview');if(preview)preview.style.display='none';"
    + "var rmBtn=document.getElementById('wizRmFileBtn');if(rmBtn)rmBtn.style.display='none';"
    + "var dz=document.getElementById('wizDropzone');if(dz)dz.classList.remove('has-file');}"
    + "function showToast(msg,type){"
    +   "var el=document.getElementById('toast');if(!el)return;"
    +   "var ic=type==='ok'?'ti-circle-check-filled':type==='err'?'ti-alert-circle-filled':'ti-info-circle';"
    +   "var icEl=document.createElement('i');icEl.className='ti '+ic;"
    +   "var spanEl=document.createElement('span');spanEl.className='toast-msg';spanEl.textContent=msg;"
    +   "el.innerHTML='';el.appendChild(icEl);el.appendChild(spanEl);"
    +   "el.className='toast '+(type||'ok');"
    +   "void el.offsetWidth;el.classList.add('show');"
    +   "clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},5000);"
    + "}"
    + "function startLoad(){var b=document.getElementById('finPgBar');if(!b)return;b.style.transition='none';b.style.width='0';void b.offsetWidth;b.className='fin-pgbar run';}"
    + "(function(){"
    +   "var m=" + safeJson(toastMsg) + ";var t=" + safeJson(toastType) + ";"
    +   "var rawMsg=" + safeJson(msg) + ";"
    +   "if(m)showToast(m,t);"
    +   "if(rawMsg==='created'){"
    +     "setTimeout(function(){"
    +       "var first=document.querySelector('#trxRows .fin-row');"
    +       "if(first){first.classList.add('flash-new');first.scrollIntoView({behavior:'smooth',block:'center'});}"
    +     "},250);"
    +   "}"
    + "})();"
    + "</script>"
    + buildFinanceBottomNav(role)
    + "</body></html>";
}

// ── Halaman kelola kategori ───────────────────────────────────
export function financeKategoriPage(role = "owner", kategoriList = [], showErr = false, subKategoriList = []) {
  const errHtml = showErr
    ? "<div style=\"background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px\"><i class=\"ti ti-alert-circle\"></i> Kategori sudah ada atau tidak valid.</div>"
    : "";

  const inList  = kategoriList.filter((k) => k.jenis === "pemasukan");
  const outList = kategoriList.filter((k) => k.jenis === "pengeluaran");

  const subByKatId = {};
  subKategoriList.forEach((s) => {
    if (!subByKatId[s.kategori_id]) subByKatId[s.kategori_id] = [];
    subByKatId[s.kategori_id].push(s);
  });

  const makeRows = (list, jenis) => {
    if (list.length === 0) {
      return "<div class=\"ki-empty\"><i class=\"ti ti-inbox\"></i>"
        + "<div><strong>Belum ada kategori</strong><br><span>Gunakan form di bawah untuk menambah kategori baru.</span></div></div>";
    }
    return list.map((k) => {
      const subs    = subByKatId[k.id] || [];
      const hasSub  = subs.length > 0;
      const subBtnCls = "ki-sub-btn" + (hasSub ? " has-sub" : "");
      const subBtnLabel = "<i class=\"ti ti-chevron-right ki-chev\"></i> "
        + (hasSub ? subs.length + " Sub kategori" : "Tambah sub");
      const subItems = subs.length > 0
        ? subs.map((s) =>
            "<div class=\"ki-sub-item\">"
            + "<i class=\"ti ti-corner-down-right\" style=\"font-size:11px;color:var(--txt3);flex-shrink:0\"></i>"
            + "<span style=\"flex:1\">" + escHtml(s.nama) + "</span>"
            + "<a href=\"/operasional/kategori/sub/hapus?id=" + s.id + "\" class=\"ki-sub-del\" title=\"Hapus\" onclick=\"return confirm('Hapus sub kategori ini?')\"><i class=\"ti ti-x\"></i></a>"
            + "</div>"
          ).join("")
        : "<p class=\"ki-sub-none\">Belum ada sub kategori — tambah di bawah.</p>";
      return "<div class=\"kat-row\" data-id=\"" + k.id + "\">"
        + "<div class=\"ki-row-main\">"
        + "<i class=\"ti ti-grip-vertical ki-grip\"></i>"
        + "<div class=\"ki-color-dot\" style=\"background:" + (jenis === "income" ? "var(--green)" : "var(--red)") + "\"></div>"
        + "<span class=\"ki-name\">" + escHtml(k.nama) + "</span>"
        + "<div class=\"ki-acts\">"
        + "<button type=\"button\" class=\"" + subBtnCls + "\" id=\"subtoggle-" + k.id + "\" onclick=\"toggleSub(" + k.id + ")\">" + subBtnLabel + "</button>"
        + "<a href=\"/operasional/kategori/hapus?id=" + k.id + "\" class=\"ki-del\" onclick=\"return confirm('Hapus kategori ini?')\" title=\"Hapus\"><i class=\"ti ti-trash\"></i> Hapus</a>"
        + "</div></div>"
        + "<div class=\"ki-sub-panel\" id=\"sub-" + k.id + "\">"
        + "<div class=\"ki-sub-list\">" + subItems + "</div>"
        + "<form action=\"/operasional/kategori/sub/tambah\" method=\"post\" class=\"ki-sub-add\">"
        + "<input type=\"hidden\" name=\"kategori_id\" value=\"" + k.id + "\">"
        + "<input type=\"text\" name=\"nama\" class=\"ki-sub-inp\" placeholder=\"Nama sub kategori baru...\" required>"
        + "<button type=\"submit\" class=\"ki-sub-btn-add\"><i class=\"ti ti-plus\"></i> Tambah</button>"
        + "</form></div>"
        + "</div>";
    }).join("");
  };

  const extraCss = [
    // Tabs
    ".ki-tabs{display:flex;gap:8px;margin-bottom:8px}",
    ".ki-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--surface2);color:var(--txt3);transition:all .15s;user-select:none}",
    ".ki-tab:hover{color:var(--txt2);background:var(--surface)}",
    ".ki-tab.active.inc{background:var(--green-bg);color:var(--accent);border-color:var(--green)}",
    ".ki-tab.active.exp{background:var(--red-bg);color:var(--red);border-color:var(--red)}",
    ".ki-tab-badge{font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;line-height:1.5}",
    ".ki-tab.inc .ki-tab-badge{background:var(--green-bg);color:var(--accent)}",
    ".ki-tab.exp .ki-tab-badge{background:var(--red-bg);color:var(--red)}",
    // Panel
    ".ki-panel{display:none;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;overflow:hidden;position:relative}",
    ".ki-panel.inc.active{display:block}",
    ".ki-panel.exp.active{display:block}",
    ".ki-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}",
    ".ki-panel.inc::before{background:var(--green)}",
    ".ki-panel.exp::before{background:var(--red)}",
    ".ki-panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px;border-bottom:1px solid var(--border)}",
    ".ki-panel-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txt3);display:flex;align-items:center;gap:6px}",
    ".ki-panel.inc .ki-panel-title i{color:var(--accent)}",
    ".ki-panel.exp .ki-panel-title i{color:var(--red)}",
    ".ki-drag-tip{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--txt3)}",
    // Category rows
    ".kat-row{border-bottom:1px solid var(--border);background:var(--surface)}",
    ".kat-row:last-child{border-bottom:none}",
    ".kat-row.sortable-ghost{opacity:.3;background:var(--surface2)}",
    ".kat-row.sortable-chosen{background:var(--surface2)}",
    ".kat-row.sortable-drag{box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;border:1px solid var(--border2)}",
    ".ki-row-main{display:flex;align-items:center;gap:8px;padding:11px 14px;transition:background .1s}",
    ".ki-row-main:hover{background:var(--surface2)}",
    ".ki-grip{font-size:18px;color:var(--border2);cursor:grab;flex-shrink:0;transition:color .15s;line-height:1}",
    ".ki-row-main:hover .ki-grip{color:var(--txt3)}",
    ".ki-grip:active{cursor:grabbing}",
    ".ki-color-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}",
    ".ki-name{flex:1;font-size:14px;font-weight:500;color:var(--txt)}",
    ".ki-acts{display:flex;align-items:center;gap:6px;flex-shrink:0}",
    ".ki-sub-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border2);background:var(--surface2);color:var(--txt3);transition:all .15s;white-space:nowrap}",
    ".ki-sub-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--green-bg)}",
    ".ki-sub-btn.has-sub{background:var(--green-bg);color:var(--accent);border-color:rgba(45,102,36,.2)}",
    ".ki-sub-btn.expanded{background:var(--accent);color:#fff;border-color:var(--accent)}",
    ".ki-chev{font-size:12px;transition:transform .18s}",
    ".ki-sub-btn.expanded .ki-chev{transform:rotate(90deg)}",
    ".ki-del{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;color:var(--txt3);text-decoration:none;flex-shrink:0;font-size:12px;font-weight:500;border:1px solid transparent;transition:all .15s}",
    ".ki-del:hover{background:var(--red-bg);color:var(--red);border-color:rgba(184,48,48,.15)}",
    // Sub panel
    ".ki-sub-panel{display:none;border-top:1px dashed var(--border);background:var(--surface2)}",
    ".ki-sub-panel.open{display:block}",
    ".ki-sub-list{padding:8px 14px 6px 42px}",
    ".ki-sub-item{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--txt2)}",
    ".ki-sub-item:last-child{border-bottom:none}",
    ".ki-sub-del{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;font-size:12px;color:var(--txt3);text-decoration:none;flex-shrink:0;transition:all .15s}",
    ".ki-sub-del:hover{background:var(--red-bg);color:var(--red)}",
    ".ki-sub-none{padding:8px 0 4px;font-size:11px;color:var(--txt3);font-style:italic;display:flex;align-items:center;gap:5px;margin:0}",
    ".ki-sub-add{display:flex;gap:6px;padding:8px 14px 10px 42px;border-top:1px solid var(--border)}",
    ".ki-sub-inp{flex:1;padding:7px 10px;border:1px solid var(--border2);border-radius:6px;font-size:12px;font-family:var(--ff);color:var(--txt);background:var(--surface);outline:none}",
    ".ki-sub-inp:focus{border-color:var(--accent)}",
    ".ki-sub-btn-add{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;font-family:var(--ff);cursor:pointer;transition:opacity .15s;white-space:nowrap}",
    ".ki-sub-btn-add:hover{opacity:.85}",
    // Add form at bottom of panel
    ".ki-add-section{border-top:2px dashed var(--border);background:var(--surface);padding:14px 16px}",
    ".ki-add-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txt3);margin-bottom:10px;display:flex;align-items:center;gap:6px}",
    ".ki-add-form{display:flex;gap:8px}",
    ".ki-add-inp-wrap{flex:1;position:relative}",
    ".ki-add-inp-wrap i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:14px;pointer-events:none}",
    ".ki-add-inp{width:100%;padding:10px 12px 10px 34px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:13px;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;transition:border-color .15s,background .15s;box-sizing:border-box}",
    ".ki-add-inp:focus{border-color:var(--accent);background:var(--surface)}",
    ".ki-add-inp::placeholder{color:var(--txt3)}",
    // Empty
    ".ki-empty{display:flex;align-items:center;gap:14px;padding:24px 18px;color:var(--txt3)}",
    ".ki-empty i{font-size:30px;opacity:.25;flex-shrink:0}",
    ".ki-empty div{font-size:12px;line-height:1.7}",
    ".ki-empty span{color:var(--txt3)}",
    // Toast
    ".kat-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--surface);border:1px solid var(--border);color:var(--txt);padding:10px 18px;border-radius:24px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.1);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:9999;display:flex;align-items:center;gap:6px}",
    ".kat-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}",
    ".kat-toast.ok{background:var(--accent);color:#fff;border-color:var(--accent)}",
    ".kat-toast.err{background:var(--red);color:#fff;border-color:var(--red)}",
  ].join("");

  return docHeadV4("Kelola Kategori")
    + "<style>" + extraCss + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "kategori", role)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-category\"></i></div>"
    + "<div><div class=\"topbar-name\">Kelola Kategori</div><div class=\"topbar-label\">Keuangan</div></div>"
    + "</div></header>"
    + "<div class=\"page\">"

    + "<a href=\"/operasional\" style=\"display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent);text-decoration:none;font-weight:500;margin-bottom:16px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"

    + "<div class=\"dash-topbar\" style=\"margin-bottom:20px\">"
    + "<div><div class=\"page-title\">Kelola Kategori</div>"
    + "<div class=\"page-sub\">Atur kategori &amp; sub kategori untuk transaksi keuangan</div></div>"
    + "</div>"

    + errHtml

    // ── Tabs ─────────────────────────────────────────────────────
    + "<div class=\"ki-tabs\">"
    + "<div class=\"ki-tab inc active\" id=\"tab-inc\" onclick=\"switchTab('inc')\">"
    + "<i class=\"ti ti-arrow-up\"></i> Pemasukan"
    + "<span class=\"ki-tab-badge\">" + inList.length + "</span>"
    + "</div>"
    + "<div class=\"ki-tab exp\" id=\"tab-exp\" onclick=\"switchTab('exp')\">"
    + "<i class=\"ti ti-arrow-down\"></i> Pengeluaran"
    + "<span class=\"ki-tab-badge\">" + outList.length + "</span>"
    + "</div>"
    + "</div>"

    // ── Pemasukan Panel ──────────────────────────────────────────
    + "<div class=\"ki-panel inc active\" id=\"panel-inc\">"
    + "<div class=\"ki-panel-head\">"
    + "<div class=\"ki-panel-title\"><i class=\"ti ti-arrow-up\"></i> Kategori Pemasukan</div>"
    + "<div class=\"ki-drag-tip\"><i class=\"ti ti-grip-vertical\"></i> Geser untuk urutan</div>"
    + "</div>"
    + "<div class=\"ki-panel-body\" data-jenis=\"pemasukan\">" + makeRows(inList, "income") + "</div>"
    + "<div class=\"ki-add-section\">"
    + "<div class=\"ki-add-label\"><i class=\"ti ti-circle-plus\"></i> Tambah Kategori Pemasukan</div>"
    + "<form action=\"/operasional/kategori/tambah\" method=\"post\">"
    + "<input type=\"hidden\" name=\"jenis\" value=\"pemasukan\">"
    + "<div class=\"ki-add-form\">"
    + "<div class=\"ki-add-inp-wrap\"><i class=\"ti ti-tag\"></i>"
    + "<input class=\"ki-add-inp\" name=\"nama\" type=\"text\" placeholder=\"Nama kategori baru...\" required></div>"
    + "<button type=\"submit\" class=\"btn-primary\" style=\"height:41px;white-space:nowrap;padding:0 18px\"><i class=\"ti ti-plus\"></i> Tambah</button>"
    + "</div></form>"
    + "</div></div>"

    // ── Pengeluaran Panel ────────────────────────────────────────
    + "<div class=\"ki-panel exp\" id=\"panel-exp\">"
    + "<div class=\"ki-panel-head\">"
    + "<div class=\"ki-panel-title\"><i class=\"ti ti-arrow-down\"></i> Kategori Pengeluaran</div>"
    + "<div class=\"ki-drag-tip\"><i class=\"ti ti-grip-vertical\"></i> Geser untuk urutan</div>"
    + "</div>"
    + "<div class=\"ki-panel-body\" data-jenis=\"pengeluaran\">" + makeRows(outList, "expense") + "</div>"
    + "<div class=\"ki-add-section\">"
    + "<div class=\"ki-add-label\"><i class=\"ti ti-circle-plus\"></i> Tambah Kategori Pengeluaran</div>"
    + "<form action=\"/operasional/kategori/tambah\" method=\"post\">"
    + "<input type=\"hidden\" name=\"jenis\" value=\"pengeluaran\">"
    + "<div class=\"ki-add-form\">"
    + "<div class=\"ki-add-inp-wrap\"><i class=\"ti ti-tag\"></i>"
    + "<input class=\"ki-add-inp\" name=\"nama\" type=\"text\" placeholder=\"Nama kategori baru...\" required></div>"
    + "<button type=\"submit\" class=\"btn-primary\" style=\"height:41px;white-space:nowrap;padding:0 18px\"><i class=\"ti ti-plus\"></i> Tambah</button>"
    + "</div></form>"
    + "</div></div>"

    + "</div></div></div>"

    + "<div class=\"kat-toast\" id=\"katToast\"><span id=\"katToastMsg\"></span></div>"

    + "<script src=\"https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js\"><\/script>"
    + "<script>"
    + "function switchTab(t){"
    + "['inc','exp'].forEach(function(x){"
    + "document.getElementById('tab-'+x).className='ki-tab '+x+(t===x?' active':'');"
    + "document.getElementById('panel-'+x).className='ki-panel '+x+(t===x?' active':'');"
    + "});}"
    + "function toggleSub(id){"
    + "var area=document.getElementById('sub-'+id);"
    + "var btn=document.getElementById('subtoggle-'+id);"
    + "if(!area)return;"
    + "var open=area.classList.contains('open');"
    + "area.classList.toggle('open',!open);"
    + "if(btn)btn.classList.toggle('expanded',!open);}"
    + "function showKatToast(msg,type){"
    + "var t=document.getElementById('katToast'),m=document.getElementById('katToastMsg');"
    + "if(!t||!m)return;"
    + "m.textContent=msg;"
    + "t.className='kat-toast show '+(type||'ok');"
    + "clearTimeout(window._ktt);"
    + "window._ktt=setTimeout(function(){t.className='kat-toast';},2000);}"
    + "function saveUrutan(listEl){"
    + "var ids=Array.from(listEl.querySelectorAll('.kat-row')).map(function(r){return parseInt(r.getAttribute('data-id'))||0;}).filter(Boolean);"
    + "if(!ids.length)return;"
    + "fetch('/operasional/kategori/urutan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:ids})})"
    + ".then(function(r){return r.ok?r.json():Promise.reject();})"
    + ".then(function(d){showKatToast(d&&d.ok?'Urutan tersimpan ✓':'Gagal simpan',d&&d.ok?'ok':'err');})"
    + ".catch(function(){showKatToast('Gagal simpan urutan','err');});}"
    + "document.querySelectorAll('.ki-panel-body').forEach(function(el){"
    + "if(typeof Sortable==='undefined')return;"
    + "Sortable.create(el,{animation:160,handle:'.ki-grip',ghostClass:'sortable-ghost',chosenClass:'sortable-chosen',dragClass:'sortable-drag',onEnd:function(e){if(e.oldIndex!==e.newIndex)saveUrutan(el);}});});"
    + "</script>"
    + buildFinanceBottomNav("owner")
    + "</body></html>";
}

// ── Kelola Menu Items ─────────────────────────────────────────
const MENU_KAT_OPTS = [
  { value: "minuman",         label: "Minuman"          },
  { value: "makanan",         label: "Makanan"          },
  { value: "rokok_bungkusan", label: "Rokok Bungkusan"  },
  { value: "rokok_eceran",    label: "Rokok Eceran"     },
];

const katLabel = (v) => MENU_KAT_OPTS.find((o) => o.value === v)?.label ?? v;

function katSelect(name, selected = "minuman", extraStyle = "") {
  return "<select name=\"" + name + "\" class=\"cat-input\" style=\"" + extraStyle + "\">"
    + MENU_KAT_OPTS.map((o) =>
        "<option value=\"" + o.value + "\"" + (o.value === selected ? " selected" : "") + ">" + o.label + "</option>"
      ).join("")
    + "</select>";
}

export function financeMenuPage(role = "owner", items = [], toppings = [], hasErr = false, editItem = null) {
  const rpFmt = (n) => "Rp " + Number(n).toLocaleString("id-ID");

  // Build topping map by item_id
  const toppingMap = {};
  toppings.forEach((t) => {
    if (!toppingMap[t.item_id]) toppingMap[t.item_id] = [];
    toppingMap[t.item_id].push(t);
  });

  // Stats
  const totalAll = items.length;
  const totalMin = items.filter((m) => (m.kategori || "minuman") === "minuman").length;
  const totalMak = items.filter((m) => (m.kategori || "minuman") === "makanan").length;
  const totalBS  = items.filter((m) => m.best_seller).length;

  // Category icon/color config
  const katConf = {
    minuman:         { icon: "ti-coffee", cls: "k-blue",  label: "Minuman"         },
    makanan:         { icon: "ti-bowl",   cls: "k-amber", label: "Makanan"         },
    rokok_bungkusan: { icon: "ti-leaf",   cls: "k-red",   label: "Rokok Bungkusan" },
    rokok_eceran:    { icon: "ti-leaf",   cls: "k-red",   label: "Rokok Eceran"    },
  };

  const renderCard = (m, idx) => {
    const itemToppings = toppingMap[m.id] || [];
    if (editItem && editItem.id === m.id) {
      const isMin = (m.kategori || "minuman") === "minuman";
      const bsVal = m.best_seller ? "1" : "0";
      const bsCls = m.best_seller ? " on" : "";
      const bsBC  = m.best_seller ? "#c47f1a" : "#e2e8e0";
      const bsBG  = m.best_seller ? "#faeeda" : "#f9fbf8";
      const boxBG = m.best_seller ? "#c47f1a" : "#fff";
      const boxBC = m.best_seller ? "#c47f1a" : "#d4ddd2";
      const boxCl = m.best_seller ? "#fff"    : "transparent";
      const lblCl = m.best_seller ? "#c47f1a" : "#7a8c78";
      return "<div class=\"menu-card-edit\" style=\"grid-column:1/-1\">"
        + "<form action=\"/operasional/menu/edit\" method=\"post\">"
        + "<input type=\"hidden\" name=\"id\" value=\"" + m.id + "\">"
        + "<div style=\"display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px\">"
        + "<input class=\"mp-input\" type=\"text\" name=\"nama\" value=\"" + escHtml(m.nama) + "\" required style=\"flex:1;min-width:140px\" placeholder=\"Nama item\">"
        + "<select name=\"kategori\" class=\"mp-input\" style=\"min-width:130px\">"
        + MENU_KAT_OPTS.map((o) => "<option value=\"" + o.value + "\"" + (o.value === (m.kategori || "minuman") ? " selected" : "") + ">" + o.label + "</option>").join("")
        + "</select>"
        + "</div>"
        + "<div style=\"display:flex;gap:8px;flex-wrap:wrap;align-items:center\">"
        + "<div class=\"mp-pfield\" style=\"flex:1;min-width:120px\"><span class=\"mp-pfx\">Rp</span><input class=\"mp-pinp\" type=\"text\" name=\"harga\" value=\"" + m.harga + "\" required oninput=\"fmtH(this)\" placeholder=\"Harga\"></div>"
        + (isMin ? "<div class=\"mp-pfield\" style=\"flex:1;min-width:120px\"><span class=\"mp-pfx\">Rp</span><input class=\"mp-pinp\" type=\"text\" name=\"harga_hot\" value=\"" + (m.harga_hot || "") + "\" oninput=\"fmtH(this)\" placeholder=\"Harga Hot (opsional)\"></div>" : "")
        + "<input type=\"hidden\" name=\"best_seller\" value=\"" + bsVal + "\">"
        + "<div class=\"mp-bs-chk" + bsCls + "\" onclick=\"mpToggleBS(this)\" style=\"border-color:" + bsBC + ";background:" + bsBG + "\">"
        + "<div class=\"mp-bs-box\" style=\"background:" + boxBG + ";border-color:" + boxBC + ";color:" + boxCl + "\"><i class=\"ti ti-check\"></i></div>"
        + "<div class=\"mp-bs-lbl\" style=\"color:" + lblCl + "\"><i class=\"ti ti-star\" style=\"font-size:13px\"></i> Best Seller</div>"
        + "</div>"
        + "<button type=\"submit\" class=\"mp-btn-save\">Simpan</button>"
        + "<a href=\"/operasional/menu\" class=\"mp-btn-cancel\">Batal</a>"
        + "</div>"
        + "</form>"
        + "<div class=\"mp-topping-sec\">"
        + "<div class=\"mp-topping-lbl\">Topping</div>"
        + (itemToppings.length
            ? "<div class=\"mp-topping-tags\">"
              + itemToppings.map((t) =>
                  "<div class=\"mp-topping-tag\">" + escHtml(t.nama)
                  + " <span>+Rp " + Number(t.harga).toLocaleString("id-ID") + "</span>"
                  + "<a href=\"/operasional/menu/topping/hapus?id=" + t.id + "\" class=\"mp-topping-del\" onclick=\"return confirm('Hapus topping " + escHtml(t.nama) + "?')\">✕</a>"
                  + "</div>"
                ).join("") + "</div>"
            : "")
        + "<form action=\"/operasional/menu/topping/tambah\" method=\"post\" style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:8px\">"
        + "<input type=\"hidden\" name=\"item_id\" value=\"" + m.id + "\">"
        + "<input class=\"mp-input\" type=\"text\" name=\"nama\" placeholder=\"Nama topping\" required style=\"flex:1;min-width:120px\">"
        + "<div class=\"mp-pfield\" style=\"width:110px\"><span class=\"mp-pfx\">Rp</span><input class=\"mp-pinp\" type=\"text\" name=\"harga\" placeholder=\"Harga\" required oninput=\"fmtH(this)\"></div>"
        + "<button type=\"submit\" class=\"mp-btn-save\"><i class=\"ti ti-plus\"></i> Tambah</button>"
        + "</form>"
        + "</div>"
        + "</div>";
    }
    const itemTops = toppingMap[m.id] || [];
    const bsRibbon = m.best_seller ? "<div class=\"mp-ribbon\"><i class=\"ti ti-star\"></i> Best Seller</div>" : "";
    const topBadge = itemTops.length ? "<span class=\"mp-top-badge\">" + itemTops.length + " topping</span>" : "";
    const priceHtml = m.harga_hot
      ? "<div class=\"mp-price-vars\">"
        + "<div class=\"mp-pv-row\"><span class=\"mp-pv-lbl\"><i class=\"ti ti-sun\"></i> Normal</span><span class=\"mp-pv-val\" style=\"color:#2660a4\">" + rpFmt(m.harga) + "</span></div>"
        + "<div class=\"mp-pv-row\"><span class=\"mp-pv-lbl\"><i class=\"ti ti-flame\"></i> Hot</span><span class=\"mp-pv-val\" style=\"color:#c47f1a\">" + rpFmt(m.harga_hot) + "</span></div>"
        + "</div>"
      : "<div class=\"mp-price-normal\">" + rpFmt(m.harga) + "</div>";
    return "<div class=\"menu-card\" data-cat=\"" + escHtml(m.kategori || "minuman") + "\" data-bs=\"" + (m.best_seller ? "1" : "0") + "\" data-harga=\"" + m.harga + "\" data-idx=\"" + idx + "\" data-nama=\"" + escHtml(m.nama.toLowerCase()) + "\">"
      + bsRibbon
      + "<div class=\"mp-card-name\">" + escHtml(m.nama) + topBadge + "</div>"
      + "<div class=\"mp-price-wrap\">" + priceHtml + "</div>"
      + "<div class=\"mp-card-actions\">"
      + "<a href=\"/operasional/menu?edit=" + m.id + "\" class=\"mp-btn-edit\"><i class=\"ti ti-edit\"></i> Edit</a>"
      + "<a href=\"/operasional/menu/hapus?id=" + m.id + "\" class=\"mp-btn-del\" onclick=\"return confirm('Hapus " + escHtml(m.nama) + "?')\"><i class=\"ti ti-trash\"></i></a>"
      + "</div>"
      + "</div>";
  };

  const sections = MENU_KAT_OPTS.map((k) => {
    const conf = katConf[k.value] || { icon: "ti-dots", cls: "k-blue" };
    const rows = items.filter((m) => (m.kategori || "minuman") === k.value);
    const cardsHtml = rows.length
      ? rows.map((m, i) => renderCard(m, items.indexOf(m))).join("")
      : "<div class=\"mp-sec-empty\" style=\"grid-column:1/-1\"><i class=\"ti ti-basket-off\"></i>Belum ada item</div>";
    return "<div class=\"mp-sec\" id=\"sec-" + k.value + "\" data-cat=\"" + k.value + "\">"
      + "<div class=\"mp-sec-hdr\" onclick=\"toggleSection('" + k.value + "')\">"
      + "<div class=\"mp-sec-left\">"
      + "<div class=\"mp-sec-icon " + conf.cls + "\"><i class=\"ti " + conf.icon + "\"></i></div>"
      + "<span class=\"mp-sec-title\">" + conf.label + "</span>"
      + "<span class=\"mp-sec-badge\" id=\"badge-" + k.value + "\">" + rows.length + " item</span>"
      + "</div>"
      + "<i class=\"ti ti-chevron-down mp-sec-chev\" id=\"chev-" + k.value + "\"></i>"
      + "</div>"
      + "<div class=\"mp-grid\" id=\"grid-" + k.value + "\">" + cardsHtml + "</div>"
      + "<div class=\"mp-pagination\" id=\"pag-" + k.value + "\" style=\"display:none\"></div>"
      + "</div>";
  }).join("");

  const addPanel = "<div class=\"mp-add-panel\">"
    + "<div class=\"mp-add-hdr\">"
    + "<div class=\"mp-add-title\"><i class=\"ti ti-circle-plus\"></i> Tambah Menu Baru</div>"
    + "<div class=\"mp-add-sub\">Isi detail item lalu klik Tambah</div>"
    + "</div>"
    + "<div class=\"mp-add-body\">"
    + "<form action=\"/operasional/menu/tambah\" method=\"post\" id=\"addMenuForm\">"
    + "<div class=\"mp-fg\"><label class=\"mp-lbl\">Nama Item</label>"
    + "<input class=\"mp-input\" type=\"text\" name=\"nama\" placeholder=\"contoh: Kopi Susu\" required></div>"
    + "<div class=\"mp-fg\"><label class=\"mp-lbl\">Kategori</label>"
    + "<select class=\"mp-input\" name=\"kategori\" id=\"addKat\" onchange=\"onAddKatChange()\">"
    + MENU_KAT_OPTS.map((o) => "<option value=\"" + o.value + "\">" + o.label + "</option>").join("")
    + "</select></div>"
    + "<div class=\"mp-fg\"><label class=\"mp-lbl\">Harga (Rp)</label>"
    + "<div class=\"mp-pfield\"><span class=\"mp-pfx\">Rp</span><input class=\"mp-pinp\" type=\"text\" name=\"harga\" placeholder=\"7.000\" required oninput=\"fmtH(this)\"></div></div>"
    + "<div class=\"mp-fg\" id=\"hotToggleWrap\">"
    + "<div class=\"mp-hot-toggle\" id=\"hotToggle\" onclick=\"toggleHot()\">"
    + "<i class=\"ti ti-flame mp-ht-icon\"></i><span class=\"mp-ht-text\">Ada varian Hot / Panas?</span>"
    + "<div class=\"mp-ht-switch\"><div class=\"mp-ht-knob\"></div></div>"
    + "</div>"
    + "<div class=\"mp-hot-price\" id=\"hotPriceWrap\">"
    + "<label class=\"mp-lbl\" style=\"margin-top:10px\">Harga Varian Hot (Rp)</label>"
    + "<div class=\"mp-pfield\"><span class=\"mp-pfx\">Rp</span><input class=\"mp-pinp\" type=\"text\" name=\"harga_hot\" id=\"addHargaHot\" placeholder=\"6.000\" oninput=\"fmtH(this)\"></div>"
    + "</div></div>"
    + "<div class=\"mp-fg\">"
    + "<input type=\"hidden\" name=\"best_seller\" value=\"0\">"
    + "<div class=\"mp-bs-chk\" id=\"addBsCheck\" onclick=\"toggleBS()\">"
    + "<div class=\"mp-bs-box\" id=\"addBsBox\"><i class=\"ti ti-check\"></i></div>"
    + "<div class=\"mp-bs-lbl\"><i class=\"ti ti-star\" style=\"font-size:13px\"></i> Tandai sebagai Best Seller</div>"
    + "</div></div>"
    + "<div class=\"mp-add-footer\"><button type=\"submit\" class=\"mp-btn-add\"><i class=\"ti ti-plus\"></i> Tambah ke Menu</button></div>"
    + "</form></div></div>";

  const css = [
    ".main-wrap,.page{background:#f4f6f3!important}",
    ".mp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}",
    ".mp-stat{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden}",
    ".mp-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:10px 10px 0 0;background:#3a7d2c}",
    ".mp-stat.amber::before{background:#c47f1a}.mp-stat.blue::before{background:#2660a4}",
    ".mp-stat-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}",
    ".mp-stat-icon.green{background:#eaf3de;color:#2d6624}.mp-stat-icon.amber{background:#faeeda;color:#c47f1a}.mp-stat-icon.blue{background:#e6f1fb;color:#2660a4}",
    ".mp-stat-lbl{font-size:10px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}",
    ".mp-stat-val{font-size:20px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace;line-height:1}",
    ".mp-stat-sub{font-size:11px;color:#7a8c78;margin-top:2px}",
    ".mp-toolbar{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:12px 16px;margin-bottom:20px;flex-wrap:wrap}",
    ".mp-search{position:relative;flex:1;min-width:150px}",
    ".mp-search i{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#7a8c78;font-size:15px}",
    ".mp-search-inp{width:100%;padding:8px 10px 8px 34px;border:1px solid #e2e8e0;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;outline:none;background:#f9fbf8}",
    ".mp-search-inp:focus{border-color:#3a7d2c;background:#fff}",
    ".mp-cat-tabs{display:flex;gap:4px;flex-wrap:wrap}",
    ".mp-tab{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:500;color:#7a8c78;cursor:pointer;border:1px solid transparent;background:transparent;font-family:'DM Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:5px;white-space:nowrap}",
    ".mp-tab:hover{background:#f4f6f3;color:#1a2318}.mp-tab.active{background:#eaf3de;color:#2d6624;border-color:rgba(45,102,36,.2);font-weight:600}",
    ".mp-tab-cnt{font-size:10px;background:rgba(0,0,0,.08);padding:1px 5px;border-radius:10px}.mp-tab.active .mp-tab-cnt{background:rgba(45,102,36,.15)}",
    ".mp-sort{padding:8px 12px;border:1px solid #e2e8e0;border-radius:8px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#f9fbf8;outline:none;cursor:pointer}",
    ".mp-content{display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:flex-start}",
    "@media(max-width:1100px){.mp-content{grid-template-columns:1fr}.mp-stats{grid-template-columns:repeat(2,1fr)}.mp-add-panel{position:static!important}}",
    ".mp-sections{display:flex;flex-direction:column;gap:16px}",
    ".mp-sec{background:#fff;border:1px solid #e2e8e0;border-radius:12px;overflow:hidden}",
    ".mp-sec-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f0f3ef;background:#f9fbf8;cursor:pointer;user-select:none}",
    ".mp-sec-hdr:hover{background:#f4f7f2}",
    ".mp-sec-left{display:flex;align-items:center;gap:10px}",
    ".mp-sec-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px}",
    ".mp-sec-icon.k-blue{background:#e6f1fb;color:#2660a4}.mp-sec-icon.k-amber{background:#faeeda;color:#c47f1a}.mp-sec-icon.k-red{background:#fcebeb;color:#a32d2d}",
    ".mp-sec-title{font-size:13px;font-weight:600;color:#1a2318}",
    ".mp-sec-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:#e2e8e0;color:#7a8c78}",
    ".mp-sec-chev{font-size:16px;color:#b0bfae;transition:transform .2s}.mp-sec-hdr.collapsed .mp-sec-chev{transform:rotate(-90deg)}",
    ".mp-grid{padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}",
    ".menu-card{background:#f9fbf8;border:1px solid #e2e8e0;border-radius:10px;padding:14px;position:relative;transition:all .15s}",
    ".menu-card:hover{border-color:#b4d4a0;background:#f4f9f0;box-shadow:0 2px 8px rgba(45,102,36,.08)}",
    ".mp-ribbon{display:inline-flex;align-items:center;gap:3px;background:#faeeda;color:#c47f1a;font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px}",
    ".mp-ribbon i{font-size:10px}",
    ".mp-card-name{font-size:13px;font-weight:600;color:#1a2318;margin-bottom:6px;line-height:1.3}",
    ".mp-top-badge{display:inline-block;font-size:9px;font-weight:600;color:#7a8c78;background:#f0f3ef;border-radius:10px;padding:1px 6px;margin-left:4px;vertical-align:middle}",
    ".mp-price-wrap{margin-bottom:10px}",
    ".mp-price-normal{font-size:14px;font-weight:700;color:#2d6624;font-family:'DM Mono',monospace}",
    ".mp-price-vars{display:flex;flex-direction:column;gap:2px}",
    ".mp-pv-row{display:flex;align-items:center;justify-content:space-between}",
    ".mp-pv-lbl{font-size:10px;color:#7a8c78;display:flex;align-items:center;gap:3px}.mp-pv-lbl i{font-size:11px}",
    ".mp-pv-val{font-size:12px;font-weight:600;font-family:'DM Mono',monospace}",
    ".mp-card-actions{display:flex;gap:5px}",
    ".mp-btn-edit{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:6px;background:#fff;border:1px solid #d4ddd2;border-radius:7px;font-size:11px;font-weight:500;color:#1a2318;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;text-decoration:none}",
    ".mp-btn-edit:hover{background:#eef1ed;border-color:#b0bfae}.mp-btn-edit i{font-size:13px}",
    ".mp-btn-del{width:30px;display:flex;align-items:center;justify-content:center;background:#fef5f5;border:1px solid #f7c1c1;border-radius:7px;font-size:13px;color:#a32d2d;cursor:pointer;transition:all .15s;text-decoration:none}",
    ".mp-btn-del:hover{background:#fcebeb}",
    ".menu-card-edit{background:#fff;border:1.5px solid #3a7d2c;border-radius:10px;padding:16px;grid-column:1/-1}",
    ".mp-topping-sec{margin-top:12px;padding-top:12px;border-top:1px solid #f0f3ef}",
    ".mp-topping-lbl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7a8c78;margin-bottom:8px}",
    ".mp-topping-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}",
    ".mp-topping-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;border:1px solid #e2e8e0;font-size:11px;color:#1a2318}",
    ".mp-topping-tag span{color:#7a8c78}.mp-topping-del{color:#a32d2d;margin-left:2px;text-decoration:none;font-size:11px}",
    ".mp-sec-empty{padding:24px;text-align:center;color:#b0bfae;font-size:12px}",
    ".mp-sec-empty i{font-size:24px;display:block;margin-bottom:6px;opacity:.3}",
    ".mp-add-panel{position:sticky;top:28px;background:#fff;border:1px solid #e2e8e0;border-radius:12px;overflow:hidden}",
    ".mp-add-hdr{padding:16px 18px;border-bottom:1px solid #f0f3ef;background:#f9fbf8}",
    ".mp-add-title{font-size:13px;font-weight:600;color:#1a2318;display:flex;align-items:center;gap:7px}.mp-add-title i{font-size:16px;color:#2d6624}",
    ".mp-add-sub{font-size:11px;color:#7a8c78;margin-top:3px}",
    ".mp-add-body{padding:18px}",
    ".mp-fg{margin-bottom:14px}",
    ".mp-lbl{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#7a8c78;margin-bottom:7px;display:block}",
    ".mp-input{width:100%;padding:9px 12px;border:1.5px solid #e2e8e0;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;outline:none;background:#f9fbf8;transition:border-color .15s}",
    ".mp-input:focus{border-color:#3a7d2c;background:#fff}.mp-input::placeholder{color:#b0bfae}",
    ".mp-pfield{display:flex;align-items:center;border:1.5px solid #e2e8e0;border-radius:8px;background:#f9fbf8;overflow:hidden;transition:border-color .15s}",
    ".mp-pfield:focus-within{border-color:#3a7d2c;background:#fff}",
    ".mp-pfx{padding:9px 10px;font-size:12px;font-weight:600;color:#7a8c78;background:#f0f3ef;border-right:1px solid #e2e8e0;white-space:nowrap}",
    ".mp-pinp{flex:1;padding:9px 10px;border:none;background:transparent;font-size:13px;font-family:'DM Mono',monospace;color:#1a2318;outline:none;min-width:0}",
    ".mp-hot-toggle{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f9fbf8;border:1.5px solid #e2e8e0;border-radius:8px;cursor:pointer;transition:all .15s}",
    ".mp-hot-toggle:hover{border-color:#b4d4a0}.mp-hot-toggle.on{border-color:#c47f1a;background:#faeeda}",
    ".mp-ht-icon{font-size:18px;color:#7a8c78}.mp-hot-toggle.on .mp-ht-icon{color:#c47f1a}",
    ".mp-ht-text{flex:1;font-size:12px;font-weight:500;color:#7a8c78}.mp-hot-toggle.on .mp-ht-text{color:#c47f1a}",
    ".mp-ht-switch{width:32px;height:18px;background:#d4ddd2;border-radius:99px;position:relative;transition:background .2s;flex-shrink:0}",
    ".mp-hot-toggle.on .mp-ht-switch{background:#c47f1a}",
    ".mp-ht-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}",
    ".mp-hot-toggle.on .mp-ht-knob{transform:translateX(14px)}",
    ".mp-hot-price{overflow:hidden;max-height:0;opacity:0;transition:max-height .3s ease,opacity .25s ease}",
    ".mp-hot-price.show{max-height:80px;opacity:1;margin-top:12px}",
    ".mp-bs-chk{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f9fbf8;border:1.5px solid #e2e8e0;border-radius:8px;cursor:pointer;transition:all .15s}",
    ".mp-bs-chk:hover{border-color:#c47f1a}.mp-bs-chk.on{border-color:#c47f1a;background:#faeeda}",
    ".mp-bs-box{width:16px;height:16px;border-radius:4px;border:1.5px solid #d4ddd2;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent;transition:all .15s;flex-shrink:0}",
    ".mp-bs-chk.on .mp-bs-box{background:#c47f1a;border-color:#c47f1a;color:#fff}",
    ".mp-bs-lbl{font-size:12px;font-weight:500;color:#7a8c78;display:flex;align-items:center;gap:5px}",
    ".mp-bs-chk.on .mp-bs-lbl{color:#c47f1a}",
    ".mp-add-footer{padding:14px 18px;border-top:1px solid #f0f3ef}",
    ".mp-btn-add{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;background:#2d6624;border:none;border-radius:9px;font-size:13px;font-family:'DM Sans',sans-serif;color:#fff;cursor:pointer;font-weight:600;transition:background .15s}",
    ".mp-btn-add:hover{background:#255519}.mp-btn-add i{font-size:16px}",
    ".mp-btn-save{padding:8px 16px;background:#2d6624;border:none;border-radius:8px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;color:#fff;cursor:pointer;white-space:nowrap;height:40px}",
    ".mp-btn-save:hover{background:#255519}",
    ".mp-btn-cancel{padding:8px 16px;background:#f4f6f3;border:1px solid #e2e8e0;border-radius:8px;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;color:#7a8c78;cursor:pointer;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;height:40px}",
    ".mp-btn-cancel:hover{background:#eef1ed}",
    ".mp-pagination{display:flex;align-items:center;justify-content:center;gap:4px;padding:10px 14px;border-top:1px solid #f0f3ef}",
    ".mp-pag-btn{min-width:32px;height:32px;padding:0 8px;border-radius:7px;border:1px solid #e2e8e0;background:#f9fbf8;color:#7a8c78;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s}",
    ".mp-pag-btn:hover:not([disabled]){background:#2d6624;color:#fff;border-color:#2d6624}",
    ".mp-pag-btn[disabled]{opacity:.35;cursor:default}.mp-pag-btn.active{background:#2d6624;color:#fff;border-color:#2d6624}",
    ".mp-err{background:#fef5f5;color:#a32d2d;border:1px solid #f7c1c1;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px;display:flex;align-items:center;gap:6px}",
  ].join("");

  const js = ""
    + "function fmtH(el){var r=el.value.replace(/\\D/g,'');var n=parseInt(r)||0;el.value=n>0?String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):''}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "function toggleSection(cat){var grid=document.getElementById('grid-'+cat);var hdr=document.querySelector('#sec-'+cat+' .mp-sec-hdr');var pag=document.getElementById('pag-'+cat);var open=grid.style.display!=='none';grid.style.display=open?'none':'';if(pag)pag.style.display=open?'none':'';hdr.classList.toggle('collapsed',open);}"
    // Hot toggle (add form)
    + "var hotOn=false;"
    + "function toggleHot(){hotOn=!hotOn;document.getElementById('hotToggle').classList.toggle('on',hotOn);document.getElementById('hotPriceWrap').classList.toggle('show',hotOn);var h=document.getElementById('addHargaHot');if(!hotOn&&h)h.value='';}"
    + "function onAddKatChange(){var kat=document.getElementById('addKat').value;var w=document.getElementById('hotToggleWrap');w.style.display=kat==='minuman'?'':'none';if(kat!=='minuman'&&hotOn)toggleHot();}"
    // BS toggle (add form)
    + "var bsOn=false;"
    + "function toggleBS(){bsOn=!bsOn;var el=document.getElementById('addBsCheck');el.classList.toggle('on',bsOn);var box=document.getElementById('addBsBox');box.style.background=bsOn?'#c47f1a':'#fff';box.style.borderColor=bsOn?'#c47f1a':'#d4ddd2';box.style.color=bsOn?'#fff':'transparent';var frm=document.getElementById('addMenuForm');var inp=frm.querySelector('input[name=best_seller]');if(inp)inp.value=bsOn?'1':'0';}"
    // BS toggle (edit forms)
    + "function mpToggleBS(el){var on=!el.classList.contains('on');el.classList.toggle('on',on);var box=el.querySelector('.mp-bs-box');if(box){box.style.background=on?'#c47f1a':'#fff';box.style.borderColor=on?'#c47f1a':'#d4ddd2';box.style.color=on?'#fff':'transparent';}var lbl=el.querySelector('.mp-bs-lbl');if(lbl)lbl.style.color=on?'#c47f1a':'#7a8c78';el.style.borderColor=on?'#c47f1a':'#e2e8e0';el.style.background=on?'#faeeda':'#f9fbf8';var frm=el.closest('form');if(frm){var hi=frm.querySelector('input[name=best_seller]');if(hi)hi.value=on?'1':'0';}}"
    // Filter state
    + "var curCat='all',curSearch='',curSort='default';"
    + "function filterCat(cat,btn){curCat=cat;document.querySelectorAll('.mp-tab').forEach(function(t){t.classList.remove('active');});btn.classList.add('active');applyMenuFilter();}"
    + "function filterMenu(v){curSearch=v.toLowerCase();applyMenuFilter();}"
    + "function sortMenu(v){curSort=v;applyMenuFilter();}"
    + "var mpPS={};"
    + "function mpGoPage(btn){mpPS[btn.dataset.cat]=parseInt(btn.dataset.page);applyMenuFilter();}"
    + "function applyMenuFilter(){"
    + "document.querySelectorAll('.mp-sec').forEach(function(sec){"
    + "var cat=sec.dataset.cat;"
    + "var grid=document.getElementById('grid-'+cat);"
    + "if(!grid||grid.style.display==='none')return;"
    + "var cards=Array.from(grid.querySelectorAll('.menu-card'));"
    + "if(curSort==='name-az')cards.sort(function(a,b){return(a.dataset.nama||'').localeCompare(b.dataset.nama||'');});"
    + "else if(curSort==='name-za')cards.sort(function(a,b){return(b.dataset.nama||'').localeCompare(a.dataset.nama||'');});"
    + "else if(curSort==='price-hl')cards.sort(function(a,b){return parseInt(b.dataset.harga||0)-parseInt(a.dataset.harga||0);});"
    + "else if(curSort==='price-lh')cards.sort(function(a,b){return parseInt(a.dataset.harga||0)-parseInt(b.dataset.harga||0);});"
    + "else cards.sort(function(a,b){return parseInt(a.dataset.idx||0)-parseInt(b.dataset.idx||0);});"
    + "cards.forEach(function(c){grid.appendChild(c);});"
    + "var visible=cards.filter(function(c){if(curSearch&&(c.dataset.nama||'').indexOf(curSearch)<0)return false;if(curCat==='bestseller'&&c.dataset.bs!=='1')return false;if(curCat!=='all'&&curCat!=='bestseller'&&c.dataset.cat!==curCat)return false;return true;});"
    + "var PAGE=10;var page=mpPS[cat]||1;"
    + "var total=Math.max(1,Math.ceil(visible.length/PAGE));if(page>total)page=total;mpPS[cat]=page;"
    + "var s=(page-1)*PAGE,e=s+PAGE;"
    + "cards.forEach(function(c){c.style.display=visible.indexOf(c)>=s&&visible.indexOf(c)<e?'':'none';});"
    + "var badge=document.getElementById('badge-'+cat);if(badge)badge.textContent=visible.length+' item';"
    + "sec.style.display=(curCat!=='all'&&curCat!=='bestseller'&&cat!==curCat)?'none':'';"
    + "var pd=document.getElementById('pag-'+cat);if(pd){"
    + "if(total<=1){pd.style.display='none';}else{"
    + "pd.style.display='flex';"
    + "var b='<button onclick=\"mpGoPage(this)\" data-cat=\"'+cat+'\" data-page=\"'+(page-1)+'\" class=\"mp-pag-btn\"'+(page<=1?' disabled':'')+'>&#8249;</button>';"
    + "for(var p=1;p<=total;p++)b+='<button onclick=\"mpGoPage(this)\" data-cat=\"'+cat+'\" data-page=\"'+p+'\" class=\"mp-pag-btn'+(p===page?' active':'')+'\">'+p+'</button>';"
    + "b+='<button onclick=\"mpGoPage(this)\" data-cat=\"'+cat+'\" data-page=\"'+(page+1)+'\" class=\"mp-pag-btn\"'+(page>=total?' disabled':'')+'>&#8250;</button>';"
    + "pd.innerHTML=b;}}});"
    // update global stat counters
    + "var all=document.querySelectorAll('.menu-card');var tot=all.length;"
    + "var el;el=document.getElementById('statTotal');if(el)el.textContent=tot;"
    + "el=document.getElementById('statMin');if(el)el.textContent=[].filter.call(all,function(c){return c.dataset.cat==='minuman';}).length;"
    + "el=document.getElementById('statMak');if(el)el.textContent=[].filter.call(all,function(c){return c.dataset.cat==='makanan';}).length;"
    + "el=document.getElementById('statBS');if(el)el.textContent=[].filter.call(all,function(c){return c.dataset.bs==='1';}).length;"
    + "el=document.getElementById('cntAll');if(el)el.textContent=tot;"
    + "el=document.getElementById('cntMin');if(el)el.textContent=[].filter.call(all,function(c){return c.dataset.cat==='minuman';}).length;"
    + "el=document.getElementById('cntMak');if(el)el.textContent=[].filter.call(all,function(c){return c.dataset.cat==='makanan';}).length;"
    + "}"
    + "(function(){onAddKatChange();applyMenuFilter();})();";

  return docHeadV4("Kelola Menu")
    + "<style>" + css + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "menu", role)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-coffee\"></i></div>"
    + "<div><div class=\"topbar-name\">Kelola Menu</div><div class=\"topbar-label\">Kopi / Snack</div></div>"
    + "</div></header>"
    + "<div class=\"page\">"
    + "<div style=\"display:flex;align-items:center;gap:6px;font-size:12px;color:#7a8c78;margin-bottom:18px\">"
    + "<a href=\"/operasional\" style=\"color:#2d6624;text-decoration:none;font-weight:500;display:flex;align-items:center;gap:4px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "</div>"
    + "<div style=\"font-size:20px;font-weight:700;color:#1a2318;margin-bottom:4px\">Menu Kopi / Snack</div>"
    + "<div style=\"font-size:13px;color:#6b7c69;margin-bottom:22px\">Kelola item menu dan harga yang tersedia di kasir</div>"
    + (hasErr ? "<div class=\"mp-err\"><i class=\"ti ti-alert-circle\"></i> Nama sudah ada atau data tidak valid.</div>" : "")
    // Stats
    + "<div class=\"mp-stats\">"
    + "<div class=\"mp-stat\"><div class=\"mp-stat-icon green\"><i class=\"ti ti-list\"></i></div>"
    + "<div><div class=\"mp-stat-lbl\">Total Menu</div><div class=\"mp-stat-val\" id=\"statTotal\">" + totalAll + "</div><div class=\"mp-stat-sub\">Semua kategori</div></div></div>"
    + "<div class=\"mp-stat amber\"><div class=\"mp-stat-icon amber\"><i class=\"ti ti-coffee\"></i></div>"
    + "<div><div class=\"mp-stat-lbl\">Minuman</div><div class=\"mp-stat-val\" id=\"statMin\">" + totalMin + "</div><div class=\"mp-stat-sub\">Item tersedia</div></div></div>"
    + "<div class=\"mp-stat blue\"><div class=\"mp-stat-icon blue\"><i class=\"ti ti-bowl\"></i></div>"
    + "<div><div class=\"mp-stat-lbl\">Makanan</div><div class=\"mp-stat-val\" id=\"statMak\">" + totalMak + "</div><div class=\"mp-stat-sub\">Item tersedia</div></div></div>"
    + "<div class=\"mp-stat\"><div class=\"mp-stat-icon green\"><i class=\"ti ti-star\"></i></div>"
    + "<div><div class=\"mp-stat-lbl\">Best Seller</div><div class=\"mp-stat-val\" id=\"statBS\">" + totalBS + "</div><div class=\"mp-stat-sub\">Paling sering dipesan</div></div></div>"
    + "</div>"
    // Toolbar
    + "<div class=\"mp-toolbar\">"
    + "<div class=\"mp-search\"><i class=\"ti ti-search\"></i><input class=\"mp-search-inp\" type=\"text\" placeholder=\"Cari nama menu...\" oninput=\"filterMenu(this.value)\"></div>"
    + "<div class=\"mp-cat-tabs\">"
    + "<button class=\"mp-tab active\" onclick=\"filterCat('all',this)\"><i class=\"ti ti-apps\" style=\"font-size:13px\"></i> Semua <span class=\"mp-tab-cnt\" id=\"cntAll\">" + totalAll + "</span></button>"
    + "<button class=\"mp-tab\" onclick=\"filterCat('minuman',this)\"><i class=\"ti ti-coffee\" style=\"font-size:13px\"></i> Minuman <span class=\"mp-tab-cnt\" id=\"cntMin\">" + totalMin + "</span></button>"
    + "<button class=\"mp-tab\" onclick=\"filterCat('makanan',this)\"><i class=\"ti ti-bowl\" style=\"font-size:13px\"></i> Makanan <span class=\"mp-tab-cnt\" id=\"cntMak\">" + totalMak + "</span></button>"
    + "<button class=\"mp-tab\" onclick=\"filterCat('bestseller',this)\"><i class=\"ti ti-star\" style=\"font-size:13px\"></i> Best Seller</button>"
    + "</div>"
    + "<select class=\"mp-sort\" onchange=\"sortMenu(this.value)\">"
    + "<option value=\"default\">Urutan Input</option>"
    + "<option value=\"name-az\">Nama A–Z</option>"
    + "<option value=\"name-za\">Nama Z–A</option>"
    + "<option value=\"price-hl\">Harga Termahal</option>"
    + "<option value=\"price-lh\">Harga Termurah</option>"
    + "</select></div>"
    // Content
    + "<div class=\"mp-content\">"
    + "<div class=\"mp-sections\">" + sections + "</div>"
    + addPanel
    + "</div>"
    + "</div></div></div>"
    + "<script>" + js + "</script>"
    + buildFinanceBottomNav("owner")
    + "</body></html>";
}

// ── /operasional/analisis — halaman detail analisis target ────
export function financeAnalisisPage({ role = "owner", displayName = "", analisis, trend30 = [], msg = "" }) {
  const an = analisis;
  const bd = an.costBreakdown;
  const sim = an.simulasi;

  const toastMsg  = msg === "added"   ? "Biaya berhasil ditambah"
    : msg === "updated" ? "Biaya berhasil diupdate"
    : msg === "deleted" ? "Biaya berhasil dihapus"
    : msg === "err"     ? "Gagal: pastikan nama & nominal terisi"
    : "";
  const toastType = msg === "err" ? "err" : "ok";
  const toastHtml = toastMsg
    ? "<div class=\"ap-toast " + toastType + " show\" id=\"apToast\">" + escHtml(toastMsg) + "</div>"
    : "";

  // 3 mini-card status (full version)
  const scopeCard = (lbl, sub, data) => {
    const { pemasukan, target, status } = data;
    const margin = pemasukan - target;
    const pct    = Math.min(100, Math.round((pemasukan / Math.max(target, 1)) * 100));
    return "<div class=\"an-card\" style=\"--accent-bar:" + status.color + "\">"
      + "<div class=\"an-card-hdr\">"
      +   "<div><div class=\"an-scope\">" + lbl + "</div>"
      +   "<div class=\"an-sub\">" + sub + "</div></div>"
      +   "<div class=\"an-status\" style=\"background:" + status.color + "\">"
      +     status.emoji + " " + status.label + "</div>"
      + "</div>"
      + "<div class=\"an-amount-row\">"
      +   "<div class=\"an-amount\">" + rp(pemasukan) + "</div>"
      +   "<div class=\"an-target\">/ " + rp(target) + "</div>"
      + "</div>"
      + "<div class=\"an-progress\"><div class=\"an-progress-fill\" "
      +   "style=\"width:" + pct + "%;background:" + status.color + "\"></div></div>"
      + "<div class=\"an-margin " + (margin >= 0 ? "pos" : "neg") + "\">"
      +   (margin >= 0 ? "▲ Surplus " : "▼ Defisit ") + rp(Math.abs(margin))
      +   " · " + pct + "% target</div>"
      + "</div>";
  };

  // Trend chart 30 hari — data utk Chart.js (mixed bar + target line)
  const trendLabels  = trend30.map((d) => {
    const date = new Date(d.tanggal + "T00:00:00");
    return date.getDate() + "/" + (date.getMonth() + 1);
  });
  const trendValues  = trend30.map((d) => d.pemasukan);
  const trendFulls   = trend30.map((d) => {
    const date = new Date(d.tanggal + "T00:00:00");
    return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  });
  const trendColors  = trend30.map((d) => d.pemasukan >= an.targets.hari ? "#22c55e" : d.pemasukan > 0 ? "#f59e0b" : "#e2e8f0");
  // Summary stats utk legend
  const trendDaysOk    = trend30.filter((d) => d.pemasukan >= an.targets.hari).length;
  const trendDaysLow   = trend30.filter((d) => d.pemasukan > 0 && d.pemasukan < an.targets.hari).length;
  const trendDaysZero  = trend30.filter((d) => d.pemasukan === 0).length;

  // ── Breakdown rows (CRUD) ──
  const frekLabel = (f) =>
    f === "harian"   ? "Harian"
    : f === "mingguan" ? "Mingguan"
    : "Bulanan";
  const frekHint  = (f, n) =>
    f === "harian"   ? "(× 30 hari)"
    : f === "mingguan" ? "(× 4.3 minggu)"
    : "";

  const biayaRows = bd.items.length === 0
    ? "<div class=\"ap-empty\"><i class=\"ti ti-database-off\"></i> Belum ada biaya tercatat. Klik <strong>+ Tambah Biaya</strong> untuk mulai.</div>"
    : "<div class=\"ap-biaya-list\">" + bd.items.map((x) => {
      const dataAttrs = " data-id=\"" + x.id + "\" data-nama=\"" + escHtml(x.nama)
        + "\" data-frek=\"" + x.frekuensi + "\" data-nominal=\"" + x.nominal + "\"";
      return "<div class=\"ap-biaya-row\">"
        + "<div class=\"ap-biaya-meta\">"
        +   "<div class=\"ap-biaya-nama\">" + escHtml(x.nama) + "</div>"
        +   "<div class=\"ap-biaya-sub\">"
        +     "<span class=\"ap-biaya-frek\">" + frekLabel(x.frekuensi) + "</span>"
        +     " · " + rp(x.nominal) + "/" + (x.frekuensi === "harian" ? "hari" : x.frekuensi === "mingguan" ? "minggu" : "bulan")
        +     " <span style=\"color:var(--txt3)\">" + frekHint(x.frekuensi) + "</span>"
        +   "</div>"
        + "</div>"
        + "<div class=\"ap-biaya-total\">" + rp(x.perBulan) + "<span class=\"ap-biaya-pct\">" + Math.round(x.share * 100) + "%</span></div>"
        + "<div class=\"ap-biaya-act\">"
        +   "<button class=\"ap-act-btn\" type=\"button\"" + dataAttrs + " onclick=\"openEditBiaya(this)\" title=\"Edit\"><i class=\"ti ti-edit\"></i></button>"
        +   "<a class=\"ap-act-btn danger\" href=\"/operasional/analisis/biaya/hapus?id=" + x.id + "\""
        +     " onclick=\"return confirm('Hapus biaya &quot;" + escHtml(x.nama).replace(/'/g, "\\'") + "&quot;?')\" title=\"Hapus\"><i class=\"ti ti-trash\"></i></a>"
        + "</div>"
        + "</div>";
    }).join("") + "</div>";

  const pageCss = [
    ".ap-page{max-width:1100px;margin:0 auto;padding-bottom:60px}",
    ".ap-hdr{margin-bottom:22px}",
    ".ap-title{font-size:22px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:10px;margin-bottom:6px}",
    ".ap-sub{font-size:12px;color:var(--txt3)}",
    ".ap-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}",
    "@media(max-width:768px){.ap-grid{grid-template-columns:1fr}}",
    // Reuse .an-* styles already in dashboard CSS, plus tambahan utk trend chart
    ".an-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden}",
    ".an-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent-bar,#22c55e)}",
    ".an-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}",
    ".an-scope{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txt3)}",
    ".an-sub{font-size:11px;color:var(--txt3)}",
    ".an-status{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:700;color:#fff}",
    ".an-amount-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;flex-wrap:wrap}",
    ".an-amount{font-size:18px;font-weight:700;font-family:var(--ff-mono);color:var(--txt)}",
    ".an-target{font-size:11px;color:var(--txt3);font-family:var(--ff-mono)}",
    ".an-progress{height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-bottom:6px}",
    ".an-progress-fill{height:100%;border-radius:3px}",
    ".an-margin{font-size:11px;color:var(--txt2)}",
    ".an-margin.pos{color:#22c55e}",
    ".an-margin.neg{color:#ef4444}",
    // Trend chart
    ".ap-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:18px}",
    ".ap-card-title{font-size:13px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:8px;margin-bottom:14px}",
    ".ap-card-title-sub{font-size:11px;font-weight:500;color:var(--txt3);margin-left:auto;font-family:var(--ff-mono)}",
    // Trend chart wrap (Chart.js)
    ".trend-chart-wrap{position:relative;height:240px;width:100%;margin-top:8px}",
    "@media(max-width:540px){.trend-chart-wrap{height:200px}}",
    // Legend summary di atas chart
    ".trend-summary{display:flex;flex-wrap:wrap;gap:6px 16px;padding:12px 14px;background:var(--surface2);border-radius:10px;margin-top:10px;font-size:11.5px;color:var(--txt2)}",
    ".trend-stat{display:inline-flex;align-items:center;gap:6px;line-height:1.4}",
    ".trend-stat strong{color:var(--txt);font-weight:700;font-family:var(--ff-mono)}",
    ".trend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;display:inline-block}",
    ".trend-dot-target{width:14px;height:0;border-top:2px dashed #a855f7;border-radius:0;align-self:center}",
    // Breakdown
    ".an-bd-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}",
    ".an-bd-item{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-radius:9px;font-size:12px}",
    ".an-bd-item span:first-child{color:var(--txt2)}",
    ".an-bd-item span:last-child{font-weight:700;color:var(--txt);font-family:var(--ff-mono)}",
    ".an-bd-total{margin-top:14px;padding-top:14px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--txt)}",
    ".an-bd-total span:last-child{font-family:var(--ff-mono)}",
    // Simulator (sama dgn dashboard versi)
    ".an-sim{background:linear-gradient(135deg,rgba(59,130,246,.06),rgba(168,85,247,.04));border:1px solid rgba(59,130,246,.18);border-radius:14px;padding:18px 22px}",
    ".an-sim-hdr{font-size:13px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:7px;margin-bottom:14px}",
    ".an-sim-body{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:12px}",
    "@media(max-width:540px){.an-sim-body{grid-template-columns:1fr}}",
    ".an-sim-cell{padding:12px 14px;background:var(--surface);border-radius:10px;border:1px solid var(--border)}",
    ".an-sim-cell-lbl{font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".an-sim-cell-val{font-size:14px;font-weight:700;font-family:var(--ff-mono);color:var(--txt)}",
    ".an-sim-rec{margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}",
    // Disclaimer di halaman penuh
    ".ap-note{display:flex;align-items:flex-start;gap:10px;margin-bottom:18px;padding:12px 16px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);border-left:3px solid #f59e0b;border-radius:10px;font-size:12.5px;color:var(--txt2);line-height:1.55}",
    ".ap-note i{color:#f59e0b;font-size:17px;flex-shrink:0;margin-top:1px}",
    ".ap-note strong{color:var(--txt);font-weight:700}",
    // ── Status threshold tabel — clean & polished ────────────────
    ".stt-card{padding:22px 24px 20px}",
    ".stt-wrap{margin-top:14px;border-radius:12px;border:1px solid var(--border);overflow-x:auto;background:var(--surface)}",
    ".stt-table{width:100%;border-collapse:separate;border-spacing:0;font-variant-numeric:tabular-nums}",
    // Header
    ".stt-th{padding:13px 20px;text-align:left;font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.12em;background:var(--surface2);border-bottom:1px solid var(--border);white-space:nowrap}",
    ".stt-th-status{padding-left:24px}",
    ".stt-th-num{text-align:right;padding-right:24px}",
    // Body row
    ".stt-row{transition:background .14s ease}",
    ".stt-row:not(:last-child) td{border-bottom:1px solid var(--border)}",
    ".stt-row:hover{background:var(--stt-bg,rgba(168,85,247,.04))}",
    ".stt-row td{padding:16px 20px;vertical-align:middle}",
    // Status column (icon + name + rasio)
    ".stt-c-status{padding-left:24px!important;position:relative}",
    ".stt-c-status::before{content:'';position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:0 2px 2px 0;background:var(--stt-c);opacity:.85}",
    ".stt-status-wrap{display:flex;align-items:center;gap:12px}",
    ".stt-icon{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;line-height:1;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}",
    ".stt-status-text{display:flex;flex-direction:column;gap:3px;min-width:0}",
    ".stt-name{font-size:13.5px;font-weight:700;letter-spacing:-.01em;line-height:1.2}",
    ".stt-rasio{font-family:var(--ff-mono);font-size:10.5px;font-weight:600;color:var(--txt3);letter-spacing:0;line-height:1.2}",
    // Description
    ".stt-c-desc{font-size:12.5px;color:var(--txt2);line-height:1.5;max-width:340px}",
    // Number columns
    ".stt-c-num{font-family:var(--ff-mono);font-size:12.5px;font-weight:500;color:var(--txt2);white-space:nowrap;text-align:right;letter-spacing:-.01em;padding-right:24px!important}",
    ".stt-c-primary{color:var(--txt);font-weight:700;font-size:13.5px}",
    ".stt-dash{display:inline-block;margin:0 6px;color:var(--txt3);font-weight:400}",
    // Tip box
    ".stt-tip{display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:13px 16px;background:linear-gradient(135deg,rgba(245,158,11,.06),rgba(168,85,247,.04));border:1px solid rgba(245,158,11,.2);border-radius:11px;font-size:12px;color:var(--txt2);line-height:1.6}",
    ".stt-tip i{color:#f59e0b;font-size:17px;flex-shrink:0;margin-top:1px}",
    ".stt-tip strong{color:var(--txt);font-weight:700}",
    // Responsive
    "@media(max-width:880px){.stt-hide-md{display:none!important}}",
    "@media(max-width:640px){.stt-hide-sm{display:none!important}}",
    /* Mobile stack cards (≤640px): tabel hide, cards show */
    ".stt-mobile-stack{display:none}",
    "@media(max-width:640px){.stt-wrap{display:none!important}.stt-mobile-stack{display:flex!important;flex-direction:column;gap:10px;margin-top:10px}}",
    ".stt-mcard{border:1px solid var(--border);border-left:4px solid var(--stt-c);border-radius:11px;padding:13px 14px;background:var(--surface)}",
    ".stt-mcard-hdr{display:flex;align-items:center;gap:11px;margin-bottom:8px}",
    ".stt-mcard-titles{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}",
    ".stt-mcard-desc{font-size:12px;color:var(--txt2);line-height:1.45;margin-bottom:10px;padding-bottom:9px;border-bottom:1px dashed var(--border)}",
    ".stt-mcard-vals{display:flex;flex-direction:column;gap:5px}",
    ".stt-mcard-val{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:11.5px}",
    ".stt-mcard-vlbl{color:var(--txt3);font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;flex-shrink:0}",
    ".stt-mcard-vnum{font-family:var(--ff-mono);font-weight:700;color:var(--txt);font-size:12px;text-align:right;overflow-wrap:anywhere}",
    /* ── Halaman Analisis Target — responsive mobile ─────────── */
    "@media(max-width:640px){",
    "  .ap-page{padding-bottom:40px;width:100%;box-sizing:border-box;max-width:100%}",
    "  .ap-page *{box-sizing:border-box;max-width:100%}",
    "  .ap-hdr{margin-bottom:16px}",
    "  .ap-title{font-size:18px!important;gap:8px!important}",
    "  .ap-sub{font-size:11px;overflow-wrap:break-word}",
    "  .ap-grid{gap:10px;margin-bottom:14px}",
    "  .ap-card{padding:14px 14px!important;margin-bottom:12px;border-radius:12px;overflow:hidden}",
    "  .ap-card-title{font-size:13px;flex-wrap:wrap;gap:6px;margin-bottom:12px}",
    "  .ap-card-title-sub{font-size:10.5px;width:100%;margin-left:0;margin-top:2px;font-family:var(--ff)!important}",
    "  .ap-note{padding:11px 13px;font-size:12px;line-height:1.5;margin-bottom:14px}",
    "  .ap-note i{font-size:15px}",
    "  .ap-note span{min-width:0;overflow-wrap:break-word;word-break:normal;flex:1}",
    "  .stt-tip{padding:11px 13px;font-size:11.5px;line-height:1.5;margin-top:12px;overflow-wrap:break-word}",
    "  /* 3 scope card */",
    "  .an-card{padding:12px 14px!important;border-radius:11px}",
    "  .an-card-hdr{margin-bottom:8px;gap:8px;flex-wrap:wrap}",
    "  .an-scope{font-size:9.5px}",
    "  .an-status{font-size:10px;padding:3px 8px}",
    "  .an-amount-row{flex-wrap:wrap;gap:4px;margin-bottom:6px}",
    "  .an-amount{font-size:16px}",
    "  .an-target{font-size:10.5px}",
    "  .an-progress{height:5px}",
    "  .an-margin{font-size:10.5px}",
    "  /* Simulator */",
    "  .an-sim{padding:13px 14px}",
    "  .an-sim-hdr{font-size:12px;margin-bottom:10px}",
    "  .an-sim-cell{padding:10px 12px}",
    "  .an-sim-cell-lbl{font-size:9.5px}",
    "  .an-sim-cell-val{font-size:12.5px}",
    "  .an-sim-rec{font-size:12px;padding:10px 12px;margin-top:10px}",
    "  /* Trend summary */",
    "  .trend-summary{padding:10px 12px;font-size:11px;gap:5px 12px}",
    "  .trend-stat strong{font-size:11px}",
    "  /* Biaya wajib CRUD list */",
    "  .ap-add-btn{padding:5px 10px;font-size:11px;margin-left:auto}",
    "}",
    // CRUD biaya
    ".ap-add-btn{margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:var(--ff);transition:opacity .15s}",
    ".ap-add-btn:hover{opacity:.85}",
    ".ap-biaya-list{display:flex;flex-direction:column;gap:6px}",
    ".ap-biaya-row{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;padding:12px 14px;background:var(--surface2);border-radius:10px;transition:background .15s}",
    ".ap-biaya-row:hover{background:var(--surface)}",
    ".ap-biaya-nama{font-size:13px;font-weight:600;color:var(--txt);margin-bottom:2px}",
    ".ap-biaya-sub{font-size:11px;color:var(--txt2)}",
    ".ap-biaya-frek{display:inline-block;font-size:9.5px;font-weight:700;text-transform:uppercase;padding:1px 7px;border-radius:8px;background:rgba(59,130,246,.12);color:#3b82f6;letter-spacing:.06em}",
    ".ap-biaya-total{font-family:var(--ff-mono);font-weight:700;color:var(--txt);font-size:13px;text-align:right;display:flex;flex-direction:column;gap:2px;align-items:flex-end}",
    ".ap-biaya-pct{font-size:10px;color:var(--txt3);font-weight:500}",
    ".ap-biaya-act{display:flex;gap:4px}",
    ".ap-act-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);background:var(--surface);border-radius:7px;color:var(--txt2);cursor:pointer;text-decoration:none;font-size:13px;transition:all .15s}",
    ".ap-act-btn:hover{border-color:var(--accent);color:var(--accent)}",
    ".ap-act-btn.danger:hover{border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,.05)}",
    ".ap-empty{text-align:center;padding:30px 20px;color:var(--txt3);font-size:13px;background:var(--surface2);border-radius:10px}",
    ".ap-empty i{font-size:32px;display:block;margin-bottom:8px;opacity:.5}",
    "@media(max-width:540px){.ap-biaya-row{grid-template-columns:1fr auto}.ap-biaya-act{grid-column:1/-1;justify-content:flex-end}}",
    // Modal
    ".ap-modal-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px}",
    ".ap-modal-overlay.open{display:flex}",
    ".ap-modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto}",
    ".ap-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid var(--border)}",
    ".ap-modal-title{font-size:15px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:7px}",
    ".ap-modal-close{background:none;border:none;color:var(--txt3);cursor:pointer;font-size:18px;padding:4px}",
    "#biayaForm{padding:18px 22px 22px}",
    ".ap-fmg{margin-bottom:14px}",
    ".ap-lbl{display:block;font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}",
    ".ap-inp{width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--border2);border-radius:9px;font-size:13px;color:var(--txt);font-family:var(--ff);outline:none;box-sizing:border-box}",
    ".ap-inp:focus{border-color:var(--accent)}",
    ".ap-tog{display:flex;gap:4px;background:var(--surface2);padding:4px;border-radius:10px}",
    ".ap-tog-btn{flex:1;padding:8px;background:transparent;border:none;border-radius:7px;font-size:12px;font-weight:600;color:var(--txt3);cursor:pointer;font-family:var(--ff);transition:all .15s}",
    ".ap-tog-btn.sel{background:var(--accent);color:#fff}",
    ".ap-hint{font-size:10.5px;color:var(--txt3);margin-top:5px;font-style:italic}",
    ".ap-inp-pfx{display:flex;align-items:stretch;background:var(--surface2);border:1px solid var(--border2);border-radius:9px;overflow:hidden}",
    ".ap-inp-pfx:focus-within{border-color:var(--accent)}",
    ".ap-pfx-lbl{padding:10px 12px;background:var(--surface);font-size:12px;font-weight:600;color:var(--txt2);display:flex;align-items:center}",
    ".ap-inp-pfx-inp{flex:1;padding:10px 12px;background:transparent;border:none;font-size:13px;color:var(--txt);font-family:var(--ff);outline:none;font-family:var(--ff-mono);font-weight:600}",
    ".ap-submit{width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--ff);margin-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:6px}",
    ".ap-submit:hover{opacity:.9}",
    // Toast
    ".ap-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);padding:11px 22px;border-radius:22px;font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;pointer-events:none;opacity:0;transition:all .25s ease;box-shadow:0 4px 16px rgba(0,0,0,.15)}",
    ".ap-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}",
    ".ap-toast.ok{background:#dcfce7;color:#16a34a;border:1px solid rgba(34,197,94,.3)}",
    ".ap-toast.err{background:#fee2e2;color:#dc2626;border:1px solid rgba(239,68,68,.3)}",
  ].join("");

  return docHeadV4("Analisis Target")
    + "<style>" + pageCss + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "analisis", role, displayName)
    + "<div class=\"main-wrap\">"

    // Topbar mobile
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-target\"></i></div>"
    + "<div><div class=\"topbar-name\">Analisis Target</div>"
    + "<div class=\"topbar-label\">Detail biaya &amp; rekomendasi</div></div>"
    + "</div>"
    + "<div class=\"topbar-right\">" + buildFinanceTopbarProfile(role, displayName) + "</div>"
    + "</header>"

    + "<div class=\"page\" style=\"padding-bottom:80px\">"
    + "<div class=\"ap-page\">"

    // Header
    + "<div class=\"ap-hdr\">"
    +   "<div class=\"ap-title\"><i class=\"ti ti-target\" style=\"color:#a855f7\"></i> Analisis Target Operasional</div>"
    +   "<div class=\"ap-sub\">Total biaya wajib " + rp(bd.totalMonthly) + " / bulan · "
    +     "target " + rp(bd.totalDaily) + " / hari</div>"
    + "</div>"

    // 3 scope cards
    + "<div class=\"ap-grid\">"
    +   scopeCard("Hari ini",   "Target " + rp(an.targets.hari)   + " / hari",   an.hari)
    +   scopeCard("Minggu ini", "Target " + rp(an.targets.minggu) + " / minggu", an.minggu)
    +   scopeCard("Bulan ini",  "Target " + rp(an.targets.bulan)  + " / bulan",  an.bulan)
    + "</div>"

    // Disclaimer
    + "<div class=\"ap-note\"><i class=\"ti ti-info-circle\"></i>"
    +   "<span><strong>Catatan:</strong> ini data biaya rutin yang terlihat — "
    +   "<strong>belum termasuk pengeluaran darurat</strong> seperti kerusakan stik, meja, bola, "
    +   "perbaikan AC/lampu, atau renovasi minor. Sisakan margin untuk dana cadangan.</span></div>"

    // ── Cara Baca Status — tabel clean & polished ───────────────
    + (function() {
        const STATUS = [
          { key: "minus",  emoji: "📉", label: "Minus",           color: "#ef4444", bg: "rgba(239,68,68,.10)",  min: 0,   max: 1,    rasio: "< 1×",        desc: "Rugi — pemasukan di bawah biaya wajib" },
          { key: "sepi",   emoji: "😴", label: "Sepi",            color: "#64748b", bg: "rgba(100,116,139,.12)",min: 1,   max: 1.2,  rasio: "1× – 1.2×",   desc: "Impas tipis — sekedar tutup biaya" },
          { key: "target", emoji: "✅", label: "Target Tercapai", color: "#22c55e", bg: "rgba(34,197,94,.10)",  min: 1.2, max: 1.7,  rasio: "1.2× – 1.7×", desc: "Cukup biaya + margin kecil" },
          { key: "ramai",  emoji: "🔥", label: "Ramai",           color: "#3b82f6", bg: "rgba(59,130,246,.10)", min: 1.7, max: 2.5,  rasio: "1.7× – 2.5×", desc: "Margin bagus, profit sehat" },
          { key: "wow",    emoji: "🚀", label: "Ramai Sekali",    color: "#a855f7", bg: "rgba(168,85,247,.10)", min: 2.5, max: null, rasio: "≥ 2.5×",      desc: "Margin sangat bagus, surplus tinggi" },
        ];
        const fmtRange = (target, min, max) => {
          const lo = Math.round(target * min);
          if (max === null) return "≥&nbsp;" + rp(lo);
          if (min === 0)    return "<&nbsp;" + rp(Math.round(target * max));
          const hi = Math.round(target * max);
          return rp(lo) + "<span class=\"stt-dash\">–</span>" + rp(hi);
        };

        const rows = STATUS.map((s) =>
          "<tr class=\"stt-row\" style=\"--stt-c:" + s.color + ";--stt-bg:" + s.bg + "\">"
          +   "<td class=\"stt-c-status\">"
          +     "<div class=\"stt-status-wrap\">"
          +       "<div class=\"stt-icon\" style=\"background:" + s.bg + ";color:" + s.color + "\">" + s.emoji + "</div>"
          +       "<div class=\"stt-status-text\">"
          +         "<div class=\"stt-name\" style=\"color:" + s.color + "\">" + s.label + "</div>"
          +         "<div class=\"stt-rasio\">" + s.rasio + " target</div>"
          +       "</div>"
          +     "</div>"
          +   "</td>"
          +   "<td class=\"stt-c-desc stt-hide-sm\">" + s.desc + "</td>"
          +   "<td class=\"stt-c-num stt-c-primary\">" + fmtRange(an.targets.hari, s.min, s.max) + "</td>"
          +   "<td class=\"stt-c-num stt-hide-md\">" + fmtRange(an.targets.minggu, s.min, s.max) + "</td>"
          +   "<td class=\"stt-c-num stt-hide-md\">" + fmtRange(an.targets.bulan, s.min, s.max) + "</td>"
          + "</tr>"
        ).join("");

        // Mobile card-stack version (≤640px)
        const mobileCards = STATUS.map((s) =>
          "<div class=\"stt-mcard\" style=\"--stt-c:" + s.color + ";--stt-bg:" + s.bg + "\">"
          +   "<div class=\"stt-mcard-hdr\">"
          +     "<div class=\"stt-icon\" style=\"background:" + s.bg + ";color:" + s.color + "\">" + s.emoji + "</div>"
          +     "<div class=\"stt-mcard-titles\">"
          +       "<div class=\"stt-name\" style=\"color:" + s.color + "\">" + s.label + "</div>"
          +       "<div class=\"stt-rasio\">" + s.rasio + " target</div>"
          +     "</div>"
          +   "</div>"
          +   "<div class=\"stt-mcard-desc\">" + s.desc + "</div>"
          +   "<div class=\"stt-mcard-vals\">"
          +     "<div class=\"stt-mcard-val\"><span class=\"stt-mcard-vlbl\">Per Hari</span><span class=\"stt-mcard-vnum\">" + fmtRange(an.targets.hari, s.min, s.max) + "</span></div>"
          +     "<div class=\"stt-mcard-val\"><span class=\"stt-mcard-vlbl\">Per Minggu</span><span class=\"stt-mcard-vnum\">" + fmtRange(an.targets.minggu, s.min, s.max) + "</span></div>"
          +     "<div class=\"stt-mcard-val\"><span class=\"stt-mcard-vlbl\">Per Bulan</span><span class=\"stt-mcard-vnum\">" + fmtRange(an.targets.bulan, s.min, s.max) + "</span></div>"
          +   "</div>"
          + "</div>"
        ).join("");

        return "<div class=\"ap-card stt-card\">"
          + "<div class=\"ap-card-title\"><i class=\"ti ti-route\" style=\"color:#a855f7\"></i>"
          +   "Cara Baca Status"
          +   "<span class=\"ap-card-title-sub\">Rentang pemasukan per status — skala target</span>"
          + "</div>"
          + "<div class=\"stt-mobile-stack\">" + mobileCards + "</div>"
          + "<div class=\"stt-wrap\">"
          + "<table class=\"stt-table\">"
          + "<thead><tr>"
          +   "<th class=\"stt-th stt-th-status\">Status</th>"
          +   "<th class=\"stt-th stt-hide-sm\">Arti</th>"
          +   "<th class=\"stt-th stt-th-num\">Per&nbsp;Hari</th>"
          +   "<th class=\"stt-th stt-th-num stt-hide-md\">Per&nbsp;Minggu</th>"
          +   "<th class=\"stt-th stt-th-num stt-hide-md\">Per&nbsp;Bulan</th>"
          + "</tr></thead>"
          + "<tbody>" + rows + "</tbody>"
          + "</table></div>"
          + "<div class=\"stt-tip\">"
          +   "<i class=\"ti ti-bulb\"></i>"
          +   "<span>Rentang dihitung dari rasio <strong>pemasukan ÷ biaya wajib</strong>. "
          +   "<strong>Target Tercapai</strong> = pemasukan 1.2×–1.7× target → cukup tutup biaya + surplus kecil. "
          +   "<strong>Ramai Sekali</strong> = momentum bagus utk evaluasi ekspansi / tambah karyawan.</span>"
          + "</div>"
          + "</div>";
      })()

    // Trend chart 30 hari — Chart.js (interactive, dgn target line)
    + "<div class=\"ap-card\">"
    +   "<div class=\"ap-card-title\"><i class=\"ti ti-chart-bar\" style=\"color:#3b82f6\"></i>"
    +     "Trend Pemasukan vs Target — 30 Hari Terakhir"
    +     "<span class=\"ap-card-title-sub\">Hover bar utk detail harian</span>"
    +   "</div>"
    +   "<div class=\"trend-summary\">"
    +     "<div class=\"trend-stat\"><span class=\"trend-dot\" style=\"background:#22c55e\"></span>"
    +       "<strong>" + trendDaysOk + "</strong> hari memenuhi target</div>"
    +     "<div class=\"trend-stat\"><span class=\"trend-dot\" style=\"background:#f59e0b\"></span>"
    +       "<strong>" + trendDaysLow + "</strong> hari di bawah target</div>"
    +     "<div class=\"trend-stat\"><span class=\"trend-dot\" style=\"background:#e2e8f0\"></span>"
    +       "<strong>" + trendDaysZero + "</strong> hari tanpa transaksi</div>"
    +     "<div class=\"trend-stat\"><span class=\"trend-dot trend-dot-target\"></span>"
    +       "Target <strong>" + rp(an.targets.hari) + "</strong> / hari</div>"
    +   "</div>"
    +   "<div class=\"trend-chart-wrap\"><canvas id=\"trendChartCanvas\"></canvas></div>"
    + "</div>"

    // Biaya Wajib (CRUD)
    + "<div class=\"ap-card\">"
    +   "<div class=\"ap-card-title\"><i class=\"ti ti-list-details\" style=\"color:#f59e0b\"></i>"
    +     "Biaya Wajib"
    +     "<span class=\"ap-card-title-sub\">Total " + rp(bd.totalMonthly) + " / bulan</span>"
    +     "<button class=\"ap-add-btn\" type=\"button\" onclick=\"openAddBiaya()\">"
    +       "<i class=\"ti ti-plus\"></i> Tambah Biaya</button>"
    +   "</div>"
    +   biayaRows
    +   "<div class=\"an-bd-total\"><span>Total per bulan</span><span>" + rp(bd.totalMonthly) + "</span></div>"
    + "</div>"

    // Simulator
    + "<div class=\"an-sim\">"
    +   "<div class=\"an-sim-hdr\"><i class=\"ti ti-user-plus\"></i> Simulasi: Tambah 1 Karyawan (+Rp 900.000/bulan)</div>"
    +   "<div class=\"an-sim-body\">"
    +     "<div class=\"an-sim-cell\">"
    +       "<div class=\"an-sim-cell-lbl\">Rata-rata 30 hari terakhir</div>"
    +       "<div class=\"an-sim-cell-val\">" + rp(sim.rataPemasukan) + " / hari</div>"
    +     "</div>"
    +     "<div class=\"an-sim-cell\">"
    +       "<div class=\"an-sim-cell-lbl\">Margin sekarang</div>"
    +       "<div class=\"an-sim-cell-val\" style=\"color:" + (sim.marginLama >= 0 ? "#22c55e" : "#ef4444") + "\">"
    +         (sim.marginLama >= 0 ? "+" : "") + rp(sim.marginLama) + " / hari</div>"
    +     "</div>"
    +     "<div class=\"an-sim-cell\">"
    +       "<div class=\"an-sim-cell-lbl\">Beban tambahan karyawan baru</div>"
    +       "<div class=\"an-sim-cell-val\" style=\"color:#ef4444\">−" + rp(sim.tambahanHarian) + " / hari</div>"
    +     "</div>"
    +     "<div class=\"an-sim-cell\">"
    +       "<div class=\"an-sim-cell-lbl\">Margin setelah +1 karyawan</div>"
    +       "<div class=\"an-sim-cell-val\" style=\"color:" + (sim.marginBaru >= 0 ? "#22c55e" : "#ef4444") + "\">"
    +         (sim.marginBaru >= 0 ? "+" : "") + rp(sim.marginBaru) + " / hari</div>"
    +     "</div>"
    +   "</div>"
    +   "<div class=\"an-sim-rec\" style=\"background:" + sim.color + "20;color:" + sim.color + ";border:1px solid " + sim.color + "40\">"
    +     sim.emoji + " " + escHtml(sim.rekomendasi)
    +   "</div>"
    + "</div>"

    + "</div></div></div>"

    // ── Modal Tambah/Edit Biaya ──
    + "<div class=\"ap-modal-overlay\" id=\"biayaModal\" onclick=\"if(event.target===this)closeBiayaModal()\">"
    +   "<div class=\"ap-modal\">"
    +     "<div class=\"ap-modal-hdr\">"
    +       "<div class=\"ap-modal-title\" id=\"bmTitle\"><i class=\"ti ti-plus\"></i> Tambah Biaya Wajib</div>"
    +       "<button class=\"ap-modal-close\" onclick=\"closeBiayaModal()\"><i class=\"ti ti-x\"></i></button>"
    +     "</div>"
    +     "<form id=\"biayaForm\" method=\"post\">"
    +       "<input type=\"hidden\" name=\"id\" id=\"bmId\">"
    +       "<div class=\"ap-fmg\">"
    +         "<label class=\"ap-lbl\">Nama Biaya</label>"
    +         "<input class=\"ap-inp\" type=\"text\" name=\"nama\" id=\"bmNama\" placeholder=\"mis. WiFi, Gaji 3 orang, dll\" required maxlength=\"80\">"
    +       "</div>"
    +       "<div class=\"ap-fmg\">"
    +         "<label class=\"ap-lbl\">Frekuensi</label>"
    +         "<div class=\"ap-tog\">"
    +           "<button type=\"button\" class=\"ap-tog-btn\" data-frek=\"bulanan\" onclick=\"bmSetFrek('bulanan')\">Bulanan</button>"
    +           "<button type=\"button\" class=\"ap-tog-btn\" data-frek=\"harian\" onclick=\"bmSetFrek('harian')\">Harian</button>"
    +           "<button type=\"button\" class=\"ap-tog-btn\" data-frek=\"mingguan\" onclick=\"bmSetFrek('mingguan')\">Mingguan</button>"
    +         "</div>"
    +         "<input type=\"hidden\" name=\"frekuensi\" id=\"bmFrek\" value=\"bulanan\">"
    +         "<div class=\"ap-hint\" id=\"bmHint\">Nominal per bulan</div>"
    +       "</div>"
    +       "<div class=\"ap-fmg\">"
    +         "<label class=\"ap-lbl\">Nominal (Rp)</label>"
    +         "<div class=\"ap-inp-pfx\"><span class=\"ap-pfx-lbl\">Rp</span>"
    +           "<input class=\"ap-inp-pfx-inp\" type=\"text\" inputmode=\"numeric\" name=\"nominal\" id=\"bmNominal\" placeholder=\"0\" oninput=\"bmFmt(this)\" required>"
    +         "</div>"
    +       "</div>"
    +       "<button type=\"submit\" class=\"ap-submit\"><i class=\"ti ti-check\"></i> Simpan</button>"
    +     "</form>"
    +   "</div>"
    + "</div>"

    + toastHtml

    + buildFinanceBottomNav(role)
    + "<script>"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin/members';}"
    + "function financeLogout(){if(!confirm('Keluar dari sesi keuangan?'))return;window.location.href='/operasional/logout';}"
    + "function toggleTheme(){var d=document.documentElement;var cur=d.getAttribute('data-theme');d.setAttribute('data-theme',cur==='light'?'dark':'light');try{localStorage.setItem('theme',d.getAttribute('data-theme'))}catch(_){}}"
    + "try{var _t=localStorage.getItem('theme');if(_t)document.documentElement.setAttribute('data-theme',_t);}catch(_){}"
    // Modal handlers
    + "function bmFmt(el){var raw=el.value.replace(/\\D/g,'');var n=parseInt(raw)||0;el.value=n>0?String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):'';}"
    + "function bmSetFrek(f){document.getElementById('bmFrek').value=f;"
    +   "document.querySelectorAll('.ap-tog-btn').forEach(function(b){b.classList.toggle('sel',b.getAttribute('data-frek')===f);});"
    +   "var h=document.getElementById('bmHint');h.textContent=f==='harian'?'Nominal per hari (auto × 30 untuk bulanan)':f==='mingguan'?'Nominal per minggu (auto × 4.3 untuk bulanan)':'Nominal per bulan';}"
    + "function openAddBiaya(){document.getElementById('bmTitle').innerHTML='<i class=\"ti ti-plus\"></i> Tambah Biaya Wajib';"
    +   "document.getElementById('biayaForm').action='/operasional/analisis/biaya/tambah';"
    +   "document.getElementById('bmId').value='';"
    +   "document.getElementById('bmNama').value='';"
    +   "document.getElementById('bmNominal').value='';"
    +   "bmSetFrek('bulanan');"
    +   "document.getElementById('biayaModal').classList.add('open');"
    +   "setTimeout(function(){document.getElementById('bmNama').focus();},100);}"
    + "function openEditBiaya(btn){var d=btn.dataset;"
    +   "document.getElementById('bmTitle').innerHTML='<i class=\"ti ti-edit\"></i> Edit Biaya';"
    +   "document.getElementById('biayaForm').action='/operasional/analisis/biaya/edit';"
    +   "document.getElementById('bmId').value=d.id;"
    +   "document.getElementById('bmNama').value=d.nama;"
    +   "document.getElementById('bmNominal').value=Number(d.nominal).toLocaleString('id-ID');"
    +   "bmSetFrek(d.frek);"
    +   "document.getElementById('biayaModal').classList.add('open');}"
    + "function closeBiayaModal(){document.getElementById('biayaModal').classList.remove('open');}"
    + "setTimeout(function(){var t=document.getElementById('apToast');if(t)setTimeout(function(){t.classList.remove('show');},3000);},100);"
    + "</script>"
    // Chart.js + init trend bar chart
    + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js\"></script>"
    + "<script>"
    + "(function(){"
    +   "var el=document.getElementById('trendChartCanvas');if(!el||!window.Chart)return;"
    +   "var labels=" + safeJson(trendLabels) + ";"
    +   "var vals=" + safeJson(trendValues) + ";"
    +   "var fulls=" + safeJson(trendFulls) + ";"
    +   "var colors=" + safeJson(trendColors) + ";"
    +   "var target=" + an.targets.hari + ";"
    +   "var rpFmt=function(v){return 'Rp '+Number(v||0).toLocaleString('id-ID');};"
    +   "var yTick=function(v){return v>=1e6?(v/1e6).toFixed(1)+'jt':v>=1000?Math.round(v/1000)+'rb':v;};"
    +   "new Chart(el,{"
    +     "type:'bar',"
    +     "data:{labels:labels,datasets:["
    +       "{type:'bar',label:'Pemasukan',data:vals,backgroundColor:colors,borderRadius:5,borderSkipped:false,borderWidth:0,maxBarThickness:24,order:2},"
    +       "{type:'line',label:'Target',data:labels.map(function(){return target;}),borderColor:'#a855f7',borderWidth:2,borderDash:[6,4],pointRadius:0,pointHoverRadius:0,fill:false,tension:0,order:1}"
    +     "]},"
    +     "options:{responsive:true,maintainAspectRatio:false,"
    +       "interaction:{intersect:false,mode:'index'},"
    +       "plugins:{"
    +         "legend:{display:false},"
    +         "tooltip:{backgroundColor:'rgba(15,23,42,.94)',titleColor:'#e2e8f0',bodyColor:'#cbd5e1',padding:12,cornerRadius:10,displayColors:false,"
    +           "callbacks:{title:function(ctx){return fulls[ctx[0].dataIndex];},"
    +             "label:function(ctx){if(ctx.dataset.label==='Target')return '  Target: '+rpFmt(target);"
    +               "var v=ctx.raw||0;var pct=target>0?Math.round(v/target*100):0;"
    +               "return ['  Pemasukan: '+rpFmt(v),'  ('+pct+'% dari target)'];}}}"
    +       "},"
    +       "scales:{"
    +         "x:{grid:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8',maxRotation:0,autoSkip:true,autoSkipPadding:10}},"
    +         "y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.12)',drawBorder:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8',padding:8,callback:function(v){return yTick(v);}}}"
    +       "}}"
    +   "});"
    + "})();"
    + "</script>"
    + "</body></html>";
}
