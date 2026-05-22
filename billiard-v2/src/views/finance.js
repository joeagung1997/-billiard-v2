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
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=16\">";
}

export function buildFinanceSidebar(ftk, page = "keuangan") {
  const isKeu  = page === "keuangan";
  const isKat  = page === "kategori";
  const isMenu = page === "menu";
  const isSdm  = page === "sdm";
  const subOpen = isKeu || isKat || isMenu || isSdm;
  const opsItemCls = "nav-item" + (subOpen ? " open" : "");

  const subItem = (href, label, active) =>
    "<a href=\"" + href + "\" class=\"submenu-item" + (active ? " active" : "") + "\">"
    + "<div class=\"sub-dot\"></div>" + label + "</a>";

  return "<aside class=\"sidebar\">"
    // ── Logo ───────────────────────────────────────
    + "<div class=\"logo-area\">"
    + "<div class=\"logo-row\">"
    + "<div class=\"logo-mark\"><i class=\"ti ti-circle-number-8\"></i><div class=\"logo-online\"></div></div>"
    + "<div class=\"logo-text\">"
    + "<div class=\"logo-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"logo-sub\">Admin Panel</div>"
    + "</div>"
    + "</div>"
    + "</div>"
    + "<div class=\"sidebar-divider\"></div>"

    // ── Nav scroll ─────────────────────────────────
    + "<div class=\"nav-scroll\">"

    // GROUP: UTAMA (link kembali ke admin)
    + "<div class=\"nav-group\">"
    + "<div class=\"nav-group-label\">Utama</div>"
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goAdmin()\">"
    + "<div class=\"nav-item-icon\"><i class=\"ti ti-layout-dashboard\"></i></div>"
    + "<span class=\"nav-item-text\">Dashboard</span>"
    + "</a>"
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goMembers()\">"
    + "<div class=\"nav-item-icon\"><i class=\"ti ti-users\"></i></div>"
    + "<span class=\"nav-item-text\">Kelola Member</span>"
    + "</a>"
    + "</div>"

    // GROUP: OPERASIONAL (auto-open karena kita di dalamnya)
    + "<div class=\"nav-group\">"
    + "<div class=\"nav-group-label\">Operasional</div>"
    + "<div class=\"" + opsItemCls + "\" onclick=\"toggleSubmenu('ops', this)\">"
    + "<div class=\"nav-item-icon\"><i class=\"ti ti-briefcase\"></i></div>"
    + "<span class=\"nav-item-text\">Operasional</span>"
    + "<i class=\"ti ti-chevron-down nav-chevron\"></i>"
    + "</div>"
    + "<div class=\"submenu-wrap\">"
    + "<div class=\"submenu" + (subOpen ? " open" : "") + "\" id=\"sub-ops\">"
    + subItem("/operasional", "Dashboard Keuangan", isKeu)
    + subItem("/operasional/kategori", "Kelola Kategori", isKat)
    + subItem("/operasional/menu", "Kelola Menu", isMenu)
    + subItem("/operasional/sdm", "SDM & Penggajian", isSdm)
    + "</div>"
    + "</div>"
    + "</div>"

    + "</div>"

    // ── Quick Actions ──────────────────────────────
    + "<div class=\"sidebar-divider\"></div>"
    + "<div class=\"quick-actions\">"
    + "<div class=\"nav-group-label\" style=\"padding-bottom:8px\">Aksi Cepat</div>"
    + "<div class=\"qa-grid\">"
    + "<a href=\"/scan\" class=\"qa-btn\"><i class=\"ti ti-qrcode\"></i>Scan Member</a>"
    + "<a href=\"/operasional\" class=\"qa-btn\"><i class=\"ti ti-plus\"></i>Transaksi</a>"
    + "<button class=\"qa-btn danger\" onclick=\"adminLogout()\"><i class=\"ti ti-logout\"></i>Keluar</button>"
    + "</div>"
    + "</div>"

    // ── Profile ────────────────────────────────────
    + "<div class=\"sidebar-bottom\">"
    + "<div class=\"profile-card\">"
    + "<div class=\"profile-avatar\">AD</div>"
    + "<div class=\"profile-info\">"
    + "<div class=\"profile-name\">Admin</div>"
    + "<div class=\"profile-role\">Administrator</div>"
    + "</div>"
    + "<div class=\"profile-actions\">"
    + "<button class=\"profile-btn danger\" title=\"Logout\" onclick=\"adminLogout()\"><i class=\"ti ti-logout\"></i></button>"
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
    + "function adminLogout(){"
    + "if(!confirm('Keluar dari sesi admin?'))return;"
    + "try{localStorage.removeItem('warpat_atk')}catch(_){};"
    + "window.location.href='/';}"
    + "</script>";
}

// ── Bottom nav untuk halaman /operasional/* (mobile) ─────────────
// Menggunakan goAdmin/goMembers (baca token dari localStorage) karena
// halaman finance tidak punya admin token di server-side.
export function buildFinanceBottomNav() {
  return "<nav class=\"bottom-nav\">"
    + "<a href=\"#\" class=\"bn-item\" onclick=\"goAdmin();return false\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-layout-dashboard\"></i></span>Home"
    + "</a>"
    + "<a href=\"#\" class=\"bn-item\" onclick=\"goMembers();return false\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-users\"></i></span>Member"
    + "</a>"
    + "<button type=\"button\" class=\"bn-item active\" onclick=\"openBnSheet()\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-briefcase\"></i></span>Operasional"
    + "</button>"
    + "<a href=\"/scan\" class=\"bn-item\">"
    + "<span class=\"bn-icon\"><i class=\"ti ti-qrcode\"></i></span>Scan"
    + "</a>"
    + "</nav>"

    // ── Bottom sheet sub-menu Operasional ──────────────────────
    + "<div class=\"bn-sheet-overlay\" id=\"bnSheetOv\" onclick=\"closeBnSheet()\"></div>"
    + "<div class=\"bn-sheet\" id=\"bnSheet\" role=\"dialog\" aria-label=\"Sub-menu Operasional\">"
    + "<div class=\"bn-sheet-handle\"></div>"
    + "<div class=\"bn-sheet-title\">Operasional</div>"
    + "<a href=\"/operasional\" class=\"bn-sheet-item\">"
    + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-wallet\"></i></div>"
    + "<div><div class=\"bn-sheet-name\">Dashboard Keuangan</div>"
    + "<div class=\"bn-sheet-sub\">Pemasukan, pengeluaran &amp; saldo</div></div>"
    + "</a>"
    + "<a href=\"/operasional/kategori\" class=\"bn-sheet-item\">"
    + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-tag\"></i></div>"
    + "<div><div class=\"bn-sheet-name\">Kelola Kategori</div>"
    + "<div class=\"bn-sheet-sub\">Atur kategori pemasukan &amp; pengeluaran</div></div>"
    + "</a>"
    + "<a href=\"/operasional/menu\" class=\"bn-sheet-item\">"
    + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-coffee\"></i></div>"
    + "<div><div class=\"bn-sheet-name\">Kelola Menu</div>"
    + "<div class=\"bn-sheet-sub\">Kopi, snack, rokok &amp; topping</div></div>"
    + "</a>"
    + "<a href=\"/operasional/sdm\" class=\"bn-sheet-item\">"
    + "<div class=\"bn-sheet-icon\"><i class=\"ti ti-users\"></i></div>"
    + "<div><div class=\"bn-sheet-name\">SDM &amp; Penggajian</div>"
    + "<div class=\"bn-sheet-sub\">Karyawan, gaji, kasbon &amp; THR</div></div>"
    + "</a>"
    + "</div>"

    + "<script>"
    + "function openBnSheet(){"
    + "document.getElementById('bnSheet').classList.add('open');"
    + "document.getElementById('bnSheetOv').classList.add('open');}"
    + "function closeBnSheet(){"
    + "document.getElementById('bnSheet').classList.remove('open');"
    + "document.getElementById('bnSheetOv').classList.remove('open');}"
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
  ".toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%);",
  "  background:var(--green-bg); color:var(--green); border:1px solid rgba(34,197,94,.3);",
  "  border-radius:var(--r-md); padding:8px 20px; font-size:12px; font-weight:700;",
  "  z-index:200; white-space:nowrap; pointer-events:none; opacity:0; transition:opacity .3s; }",
  ".toast.show { opacity:1; }",
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
  ].join("");

  const script = [
    "var _pin='',MAX=6;",
    "function press(n){if(_pin.length>=MAX)return;_pin+=n;upd();}",
    "function del(){_pin=_pin.slice(0,-1);upd();}",
    "function upd(){for(var i=0;i<MAX;i++){var d=document.getElementById('d'+i);if(d)d.classList.toggle('filled',i<_pin.length);}}",
    "function go(){if(!_pin.length)return;document.getElementById('pi').value=_pin;document.getElementById('pf').submit();}",
    "document.addEventListener('keydown',function(e){if(e.key>='0'&&e.key<='9')press(e.key);else if(e.key==='Backspace')del();else if(e.key==='Enter')go();});",
  ].join("");

  const dots = [0,1,2,3,4,5].map(function(i){ return "<div class=\"dot\" id=\"d" + i + "\"></div>"; }).join("");

  return docHead("Keuangan Login")
    + "<style>" + loginCss + "</style>"
    + "</head><body>"
    + "<div class=\"bg-glow\"></div>"
    + "<div class=\"card\">"
    +   "<div class=\"icon-box\">💰</div>"
    +   "<div class=\"arena-lbl\">" + CONFIG.NAMA_ARENA + "</div>"
    +   "<h1>Laporan Keuangan</h1>"
    +   "<p class=\"sub\">Masukkan PIN untuk akses</p>"
    +   errHtml
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
    +   "</form>"
    +   "<div class=\"login-footer\">Gunakan keyboard atau tap angka di atas</div>"
    + "</div>"
    + "<script>" + script + "<\/script>"
    + "</body></html>";
}

// ── Dashboard ─────────────────────────────────────────────────
export function financeDashboard({ transaksi, token, bulanFilter, jenisFilter, tglDari, tglSampai, kategoriList = [], subKategoriList = [], menuItems = [], toppings = [] }) {
  const now = new Date();
  const curBulan = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const bFilter  = bulanFilter || curBulan;
  const jFilter  = jenisFilter || "";
  const tDari    = tglDari    || "";
  const tSampai  = tglSampai  || "";

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
  const activeFiltered = filtered.filter((t) => !t.voidedAt);
  const voidedCount    = filtered.length - activeFiltered.length;

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

  // ── Weekly breakdown for bar chart (exclude voided) ─────────
  const weekIn  = [0, 0, 0, 0];
  const weekOut = [0, 0, 0, 0];
  activeFiltered.forEach(function(t) {
    const day = parseInt((t.tanggal || "").split("-")[2] || "1", 10);
    const wi  = Math.min(Math.floor((day - 1) / 7), 3);
    if (t.jenis === "pemasukan")    weekIn[wi]  += t.jumlah;
    else                            weekOut[wi] += t.jumlah;
  });

  // ── Category breakdown for donut chart ───────────────────────
  const catMap = {};
  pemasukan.forEach(function(t) {
    catMap[t.kategori || "Lainnya"] = (catMap[t.kategori || "Lainnya"] || 0) + t.jumlah;
  });
  const catEntries = Object.entries(catMap).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 4);
  const DONUT_COLORS = ["#3a7d2c", "#2660a4", "#c47f1a", "#d4ddd2"];
  const donutVals   = catEntries.length ? catEntries.map(function(e) { return e[1]; }) : [1];
  const donutLabels = catEntries.length ? catEntries.map(function(e) { return e[0]; }) : ["Tidak ada data"];
  const donutColors = catEntries.length ? catEntries.map(function(_, i) { return DONUT_COLORS[i] || "#d4ddd2"; }) : ["#e8ede6"];

  // ── Donut legend HTML ─────────────────────────────────────────
  const donutLegHtml = catEntries.length
    ? catEntries.map(function(e, i) {
        const pct = totalIn > 0 ? Math.round((e[1] / totalIn) * 100) : 0;
        return "<div class=\"dl-item\">"
          + "<div class=\"dl-left\"><div class=\"dl-dot\" style=\"background:" + (DONUT_COLORS[i] || "#d4ddd2") + "\"></div>"
          + "<div><div class=\"dl-name\">" + escHtml(e[0]) + "</div><div class=\"dl-pct\">" + pct + "%</div></div></div>"
          + "<div class=\"dl-amt\">" + rp(e[1]) + "</div>"
          + "</div>";
      }).join("")
    : "<div class=\"empty-donut-leg\"><i class=\"ti ti-chart-donut\"></i>Belum ada pemasukan</div>";

  // ── Transaction rows ────────────────────────────────────────
  const makeRow = function(t) {
    const isIn    = t.jenis === "pemasukan";
    const isVoid  = !!t.voidedAt;
    const tglDisp = new Date(t.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
    const rowCls   = "fin-row" + (isVoid ? " trx-voided" : "");
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
    return "<div class=\"" + rowCls + "\">"
      + "<div class=\"fr-td muted mono\">" + tglDisp + "</div>"
      + "<div class=\"fr-td fr-desc\">"
      + "<div class=\"fr-desc-title\">" + escHtml(t.keterangan || "—") + "</div>"
      + "<div class=\"fr-desc-meta\">#" + escHtml(String(t.id).slice(-6)) + (t.jam ? " · " + escHtml(t.jam) : "") + "</div>"
      + reasonHt
      + "</div>"
      + "<div class=\"fr-td\"><span class=\"cat-tag\">" + escHtml(t.kategori || "—") + "</span></div>"
      + "<div class=\"fr-td right " + (isIn ? "amt-in" : "amt-out") + "\">" + (isIn ? "+" : "−") + rp(t.jumlah) + "</div>"
      + "<div class=\"fr-td\"><span class=\"t-badge " + (isIn ? "in" : "out") + "\">"
      + "<i class=\"ti ti-arrow-" + (isIn ? "up" : "down") + "\" style=\"font-size:9px;margin-right:2px\"></i>"
      + (isIn ? "Masuk" : "Keluar") + "</span></div>"
      + "<div class=\"fr-td right fr-act\">" + aksiHt + "</div>"
      + "</div>";
  };

  const rows = sortedTbl.length > 0
    ? "<div id=\"trxRows\">" + sortedTbl.map(makeRow).join("") + "</div>"
    : "<div class=\"empty-state\" id=\"emptyState\"><i class=\"ti ti-receipt-off\"></i>Belum ada transaksi di periode ini</div>";

  const hasDateFilter = !!tDari;

  // ── Periode aktif detection ───────────────────────────────────
  const todayStr = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Senin=0
  const mondayDate = new Date(now); mondayDate.setDate(now.getDate() - dayOfWeek);
  const mondayStr = mondayDate.toISOString().slice(0, 10);

  const isHariIni    = tDari === todayStr && tSampai === todayStr;
  const isMingguIni  = tDari === mondayStr && tSampai === todayStr;
  const isBulanIni   = !tDari && bFilter === curBulan;
  const periodeKey   = isHariIni ? "hari" : isMingguIni ? "minggu" : isBulanIni ? "bulan" : "custom";

  // Safe JSON serializer untuk embed di <script> — escape `<` agar tidak
  // memutus tag </script> kalau data user mengandung karakter HTML.
  const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

  const chartLabelsJson = safeJson(["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"]);
  const chartInJson     = safeJson(weekIn);
  const chartOutJson    = safeJson(weekOut);
  const donutValsJson   = safeJson(donutVals);
  const donutLabelsJson = safeJson(donutLabels);
  const donutColorsJson = safeJson(donutColors);

  return docHeadV4("Keuangan")
    + "</head><body>"

    + "<div class=\"layout\">"
    + buildFinanceSidebar(token, "keuangan")
    + "<div class=\"main-wrap\">"

    // Mobile topbar
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-circle-number-8\"></i></div>"
    + "<div><div class=\"topbar-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"topbar-label\">Keuangan</div></div>"
    + "</div>"
    + "<div class=\"topbar-right\"><span style=\"font-size:11px;color:var(--txt3)\">" + bulanLabel + "</span></div>"
    + "</header>"

    + "<div class=\"page\">"

    // ── Desktop topbar ──────────────────────────────────────────
    + "<div class=\"dash-topbar\">"
    + "<div><div class=\"page-title\">Keuangan</div>"
    + "<div class=\"page-sub\">Laporan pemasukan, pengeluaran &amp; saldo — " + bulanLabel + "</div></div>"
    + "<div class=\"topbar-actions\">"
    + "<a href=\"/operasional/kategori\" class=\"btn-outline\"><i class=\"ti ti-settings\" style=\"font-size:14px\"></i> Kategori</a>"
    + "<button class=\"btn-primary\" onclick=\"openTrxModal()\"><i class=\"ti ti-plus\" style=\"font-size:14px\"></i> Catat Transaksi</button>"
    + "</div></div>"

    // ── Filter bar (single card) ────────────────────────────────
    + "<div class=\"fin-filter-bar\">"
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

    // ── Stat grid (4 cards dengan colored top border) ───────────
    + "<div class=\"fin-stat-grid\">"

    + "<div class=\"fin-stat-card income\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Pemasukan</div>"
    + "<div class=\"fin-stat-icon income\"><i class=\"ti ti-trending-up\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + rp(totalIn) + "</div>"
    + "<div class=\"fin-stat-foot\">"
    + (inDelta !== 0
        ? "<span class=\"" + (inDelta >= 0 ? "fin-badge-up" : "fin-badge-down") + "\"><i class=\"ti ti-arrow-" + (inDelta >= 0 ? "up" : "down") + "\" style=\"font-size:10px\"></i> " + Math.abs(inDelta) + "%</span>&nbsp;vs " + prevLabel
        : "<span>vs " + prevLabel + "</span>")
    + "</div></div>"

    + "<div class=\"fin-stat-card expense\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Pengeluaran</div>"
    + "<div class=\"fin-stat-icon expense\"><i class=\"ti ti-trending-down\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + rp(totalOut) + "</div>"
    + "<div class=\"fin-stat-foot\">" + bulanLabel + "</div></div>"

    + "<div class=\"fin-stat-card saldo\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Saldo Bersih</div>"
    + "<div class=\"fin-stat-icon saldo\"><i class=\"ti ti-scale\"></i></div></div>"
    + "<div class=\"fin-stat-val\" style=\"" + (saldo < 0 ? "color:#a32d2d" : "") + "\">" + (saldo < 0 ? "−" : "") + rp(Math.abs(saldo)) + "</div>"
    + "<div class=\"fin-stat-foot\">Akumulasi " + bulanLabelShort + "</div></div>"

    + "<div class=\"fin-stat-card trx\">"
    + "<div class=\"fin-stat-top\"><div class=\"fin-stat-lbl\">Transaksi</div>"
    + "<div class=\"fin-stat-icon trx\"><i class=\"ti ti-receipt\"></i></div></div>"
    + "<div class=\"fin-stat-val\">" + activeFiltered.length + "</div>"
    + "<div class=\"fin-stat-foot\">" + (voidedCount > 0 ? voidedCount + " dibatalkan" : "Total catatan aktif") + "</div></div>"

    + "</div>"

    // ── Charts ──────────────────────────────────────────────────
    + "<div class=\"fin-charts-row\">"

    // Bar chart card
    + "<div class=\"card\">"
    + "<div class=\"card-header\"><div>"
    + "<div class=\"card-title\">Grafik Pemasukan &amp; Pengeluaran</div>"
    + "<div class=\"card-sub\">" + bulanLabel + " per minggu</div>"
    + "</div>"
    + "<div style=\"display:flex;align-items:center;gap:14px;font-size:11px;color:var(--txt3)\">"
    + "<span><span class=\"leg-dot\" style=\"background:#3a7d2c\"></span>&nbsp;Pemasukan</span>"
    + "<span><span class=\"leg-dot\" style=\"background:#f09595\"></span>&nbsp;Pengeluaran</span>"
    + "</div></div>"
    + "<div class=\"chart-wrap\" style=\"height:200px\"><canvas id=\"barChart\"></canvas></div>"
    + "<div class=\"fin-chart-foot\">"
    + "<div class=\"fin-cf-item\"><div class=\"fin-cf-lbl\">Total Pemasukan</div>"
    + "<div class=\"fin-cf-val\" style=\"color:#2d6624\">" + rp(totalIn) + "</div>"
    + "<div class=\"fin-cf-sub\">" + bulanLabelShort + "</div></div>"
    + "<div class=\"fin-cf-item\"><div class=\"fin-cf-lbl\">Total Pengeluaran</div>"
    + "<div class=\"fin-cf-val\" style=\"color:#a32d2d\">" + rp(totalOut) + "</div>"
    + "<div class=\"fin-cf-sub\">" + bulanLabelShort + "</div></div>"
    + "<div class=\"fin-cf-item\"><div class=\"fin-cf-lbl\">Margin Bersih</div>"
    + "<div class=\"fin-cf-val\">" + margin + "%</div>"
    + "<div class=\"fin-cf-sub\">dari pemasukan</div></div>"
    + "</div>"
    + "</div>"

    // Donut chart card
    + "<div class=\"card\">"
    + "<div class=\"card-header\"><div>"
    + "<div class=\"card-title\">Komposisi Pemasukan</div>"
    + "<div class=\"card-sub\">Berdasarkan kategori</div>"
    + "</div></div>"
    + "<div class=\"fin-donut-wrap\">"
    + "<canvas id=\"donutChart\"></canvas>"
    + "<div class=\"fin-donut-center\">"
    + "<div class=\"fin-dc-val\">" + rp(totalIn) + "</div>"
    + "<div class=\"fin-dc-sub\">Total</div>"
    + "</div>"
    + "</div>"
    + "<div class=\"fin-donut-leg\">" + donutLegHtml + "</div>"
    + "</div>"

    + "</div>"

    // ── Transaction table ───────────────────────────────────────
    + "<div class=\"fin-table-card\">"
    + "<div class=\"fin-tbl-toolbar\">"
    + "<div class=\"fin-search-wrap\">"
    + "<i class=\"ti ti-search\"></i>"
    + "<input class=\"fin-search-inp\" type=\"text\" placeholder=\"Cari keterangan atau kategori...\" id=\"trxSearch\" oninput=\"searchTrx()\">"
    + "</div>"
    + "</div>"
    + "<div class=\"fin-tbl-head\">"
    + "<div class=\"fin-th\">Tanggal</div>"
    + "<div class=\"fin-th\">Keterangan</div>"
    + "<div class=\"fin-th\">Kategori</div>"
    + "<div class=\"fin-th right\">Jumlah</div>"
    + "<div class=\"fin-th\">Tipe</div>"
    + "<div class=\"fin-th right\">Aksi</div>"
    + "</div>"
    + rows
    + "<div class=\"fin-tbl-footer\">"
    + "<div class=\"fin-tf-left\">"
    + "<span>" + sortedTbl.length + " transaksi"
    + (voidedCount > 0 ? " <span style=\"color:#a32d2d\">(" + voidedCount + " dibatalkan)</span>" : "")
    + "</span>"
    + "<span style=\"color:#e2e8e0\">|</span>"
    + "<span>Saldo: <span class=\"fin-tf-saldo\" style=\"color:" + (saldo >= 0 ? "#2d6624" : "#a32d2d") + "\">" + (saldo < 0 ? "−" : "+") + rp(Math.abs(saldo)) + "</span></span>"
    + "</div>"
    + "</div>"
    + "</div>"

    + "</div>"
    + "</div>"
    + "</div>"

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
    + "<button type=\"button\" class=\"fin-tog-btn sel-siang\" id=\"wiz-siang\" onclick=\"wizSetWaktu('siang')\"><i class=\"ti ti-sun\"></i>Siang</button>"
    + "<button type=\"button\" class=\"fin-tog-btn\" id=\"wiz-malam\" onclick=\"wizSetWaktu('malam')\"><i class=\"ti ti-moon\"></i>Malam</button>"
    + "</div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Tanggal &amp; Jam</label>"
    + "<div class=\"fin-inp-pfx\"><span class=\"fin-pfx-lbl\"><i class=\"ti ti-calendar\" style=\"font-size:14px\"></i></span>"
    + "<input class=\"fin-pfx-inp\" type=\"datetime-local\" id=\"wizDatetime\" value=\"" + new Date().toISOString().slice(0, 16) + "\" style=\"width:100%\"></div></div>"
    + "</div>"
    // STEP 2
    + "<div id=\"wizStep2\" style=\"display:none\">"
    + "<div id=\"wizBilliard\" class=\"fin-dynamic\">"
    + "<div class=\"fin-info-chip\"><i class=\"ti ti-info-circle\"></i><span>Isi detail sesi main billiard.</span></div>"
    + "<div class=\"frow\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Nomor Meja</label>"
    + "<select class=\"fsel\" id=\"wizMeja\" onchange=\"wizHideErr('wizMejaErr')\"><option value=\"\">Pilih meja...</option><option>Meja 1</option><option>Meja 2</option><option>Meja 3</option><option>Meja 4</option><option>Meja 5</option><option>Meja 6</option><option>Meja 7</option><option>Meja 8</option></select>"
    + "<div id=\"wizMejaErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Nomor meja wajib dipilih.</div>"
    + "</div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Durasi</label>"
    + "<select class=\"fsel\" id=\"wizDurasi\" onchange=\"wizDurasiChange(this.value)\"><option value=\"\">Pilih durasi...</option><option>Open / Loss</option><option>1 Jam</option><option>2 Jam</option><option>3 Jam</option><option>4 Jam</option><option>5 Jam</option><option>6 Jam</option><option>7 Jam</option></select>"
    + "<div id=\"wizDurasiErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Durasi wajib dipilih.</div>"
    + "</div>"
    + "</div>"
    + "<div id=\"wizDetailMain\" class=\"fmg\" style=\"display:none\">"
    + "<label class=\"fin-wiz-lbl\">Detail Main <span style=\"color:#a32d2d;text-transform:none;letter-spacing:0\">*</span></label>"
    + "<input class=\"finp\" type=\"text\" id=\"wizDetailMainInp\" placeholder=\"contoh: 1 jam 30 menit, meja 2 — 3 orang...\">"
    + "<div id=\"wizDetailMainErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Detail main wajib diisi untuk durasi Open / Loss.</div>"
    + "</div>"
    + "</div>"
    + "<div id=\"wizKopi\" class=\"fin-dynamic\">"
    + "<div class=\"fin-info-chip\"><i class=\"ti ti-info-circle\"></i><span>Pilih item dari menu dan atur jumlah. Total otomatis terhitung.</span></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Item Pesanan</label>"
    + "<div class=\"fin-menu-items\" id=\"wizMenuItems\">"
    + "<div class=\"fin-menu-row\">"
    + "<select class=\"fsel\" onchange=\"wizItemChange(this)\"><option value=\"\">Pilih item...</option>" + menuOptsHtml + "</select>"
    + "<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\" oninput=\"wizCalcTotal()\">"
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
    + "<select class=\"fsel\" id=\"wizKatSel\" onchange=\"wizOnKatChange(this)\">"
    + "<optgroup label=\"Pemasukan\" id=\"wizGrpIn\">" + modalGrpIn + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"wizGrpOut\">" + modalGrpOut + "</optgroup>"
    + "</select></div>"
    + "<div class=\"fmg\" id=\"wizSubKatWrap\" style=\"display:none\">"
    + "<label class=\"fin-wiz-lbl\">Sub Kategori <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span></label>"
    + "<select class=\"fsel\" id=\"wizSubKatSel\"><option value=\"\">— Pilih sub kategori —</option></select>"
    + "</div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Jumlah (Rp)</label>"
    + "<div class=\"fin-inp-pfx\"><span class=\"fin-pfx-lbl\">Rp</span>"
    + "<input class=\"fin-pfx-inp\" type=\"text\" inputmode=\"numeric\" id=\"wizJumlah\" placeholder=\"0\" oninput=\"wizFmtJ(this)\"></div>"
    + "<div id=\"wizJumlahErr\" style=\"display:none;font-size:11px;color:#a32d2d;margin-top:4px\">Jumlah harus diisi dan lebih dari 0.</div>"
    + "</div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Keterangan <span style=\"font-weight:400;font-size:10px;text-transform:none;letter-spacing:0;color:#b0bfae\">(opsional)</span></label>"
    + "<input class=\"finp\" type=\"text\" id=\"wizKet\" placeholder=\"Catatan tambahan...\"></div>"
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
    + "<div class=\"fin-sb-total\"><span>Total</span><span class=\"fin-sb-total-val\" id=\"sumTotal\">Rp 0</span></div>"
    + "</div></div>"
    + "<form id=\"wizForm\" action=\"/operasional/tambah\" method=\"post\" style=\"display:none\">"
    + ""
    + "<input type=\"hidden\" name=\"jenis\" id=\"wizFJenis\" value=\"pemasukan\">"
    + "<input type=\"hidden\" name=\"waktu\" id=\"wizFWaktu\" value=\"siang\">"
    + "<input type=\"hidden\" name=\"datetime\" id=\"wizFDt\">"
    + "<input type=\"hidden\" name=\"kategori\" id=\"wizFKat\">"
    + "<input type=\"hidden\" name=\"sub_kategori\" id=\"wizFSubKat\">"
    + "<input type=\"hidden\" name=\"keterangan\" id=\"wizFKet\">"
    + "<input type=\"hidden\" name=\"jumlah\" id=\"wizFJ\">"
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
    + "<form id=\"voidForm\" action=\"/operasional/void\" method=\"post\">"
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

    + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js\"><\/script>"
    + "<script>"
    + "const WIZ_MENU_OPTS=" + safeJson("<option value=''>Pilih item...</option>" + menuOptsHtml) + ";"
    + "const WIZ_TOPPINGS=" + safeJson(toppingsByName) + ";"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
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
    + "function applyFilter(){window.location.href=buildUrl();}"
    + "function applyTglFilter(){"
    + "var d=document.getElementById('fTglDari').value;"
    + "var s=document.getElementById('fTglSampai').value;"
    + "if(d&&s&&s<d)document.getElementById('fTglSampai').value=d;"
    + "window.location.href=buildUrl();}"
    + "function clearTgl(){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var url='/operasional?bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "window.location.href=url;}"
    + "function setPeriode(p){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var today=new Date();"
    + "var ymd=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};"
    + "var url='/operasional?bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "if(p==='hari'){url+='&tgl_dari='+ymd(today)+'&tgl_sampai='+ymd(today);}"
    + "else if(p==='minggu'){var dow=today.getDay()===0?6:today.getDay()-1;var mon=new Date(today);mon.setDate(today.getDate()-dow);url+='&tgl_dari='+ymd(mon)+'&tgl_sampai='+ymd(today);}"
    + "window.location.href=url;}"
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
    + "function searchTrx(){"
    + "var q=document.getElementById('trxSearch').value.toLowerCase();"
    + "var rows=document.querySelectorAll('#trxRows .fin-row');"
    + "rows.forEach(function(r){"
    + "var txt=r.textContent.toLowerCase();"
    + "r.style.display=txt.indexOf(q)>=0?'':'none';});}"
    + "function openTrxModal(){document.getElementById('trxOverlay').classList.add('open');wizGoTo(1);}"
    + "function closeTrxModal(){document.getElementById('trxOverlay').classList.remove('open');}"
    + "function openVoidModal(btn){"
    + "document.getElementById('voidId').value=btn.dataset.id;"
    + "document.getElementById('voidDesc').textContent=btn.dataset.desc;"
    + "document.getElementById('voidAmount').textContent=btn.dataset.amount;"
    + "document.getElementById('voidReason').value='';"
    + "document.getElementById('voidOverlay').classList.add('open');"
    + "setTimeout(function(){document.getElementById('voidReason').focus();},150);}"
    + "function closeVoidModal(){document.getElementById('voidOverlay').classList.remove('open');}"
    + "var wizS={step:1,tipe:'income',act:'billiard',waktu:'siang'};"
    + "function wizSetTipe(t){wizS.tipe=t;"
    + "document.getElementById('wiz-income').className='fin-tog-btn'+(t==='income'?' sel-income':'');"
    + "document.getElementById('wiz-expense').className='fin-tog-btn'+(t==='expense'?' sel-expense':'');"
    + "document.getElementById('wizActGroup').style.display=t==='income'?'':'none';"
    + "if(t==='expense')wizS.act='other';}"
    + "function wizSetAct(a){wizS.act=a;"
    + "['billiard','kopi','other'].forEach(function(x){document.getElementById('wiz-'+x).className='fin-tog-btn'+(x===a?' sel':'');});}"
    + "function wizSetWaktu(w){wizS.waktu=w;"
    + "document.getElementById('wiz-siang').className='fin-tog-btn'+(w==='siang'?' sel-siang':'');"
    + "document.getElementById('wiz-malam').className='fin-tog-btn'+(w==='malam'?' sel-malam':'');}"
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
    + "function wizAddItem(){"
    + "var c=document.getElementById('wizMenuItems'),r=document.createElement('div');r.className='fin-menu-row';"
    + "r.innerHTML='<select class=\"fsel\" onchange=\"wizItemChange(this)\">'+WIZ_MENU_OPTS+'</select>'"
    + "+'<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\" oninput=\"wizCalcTotal()\">'"
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
    + "function wizCalcTotal(){"
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
    + "function wizGoTo(n){"
    + "wizS.step=n;"
    + "[1,2,3].forEach(function(i){document.getElementById('wizStep'+i).style.display=i===n?'':'none';});"
    + "if(n===2){"
    + "var isBill=wizS.act==='billiard'&&wizS.tipe==='income';"
    + "var isKopi=wizS.act==='kopi'&&wizS.tipe==='income';"
    + "var isOth=wizS.act==='other'||wizS.tipe==='expense';"
    + "var bs=document.getElementById('wizBilliard'),ks=document.getElementById('wizKopi'),os=document.getElementById('wizOther');"
    + "if(bs)bs.className='fin-dynamic'+(isBill?' open':'');"
    + "if(ks)ks.className='fin-dynamic'+(isKopi?' open':'');"
    + "if(os)os.className='fin-dynamic'+(isOth?' open':'');"
    + "var gi=document.getElementById('wizGrpIn'),go=document.getElementById('wizGrpOut');"
    + "if(gi)gi.style.display=wizS.tipe==='income'?'':'none';"
    + "if(go)go.style.display=wizS.tipe==='expense'?'':'none';}"
    + "if(n===3){"
    + "var actMap={billiard:'Main Billiard',kopi:'Kopi / Snack',other:'Lainnya'};"
    + "document.getElementById('sumTipe').textContent=wizS.tipe==='income'?'Pemasukan':'Pengeluaran';"
    + "document.getElementById('sumAkt').textContent=wizS.tipe==='expense'?'Pengeluaran':(actMap[wizS.act]||'—');"
    + "document.getElementById('sumWaktu').textContent=wizS.waktu==='siang'?'Siang':'Malam';"
    + "var kat='';"
    + "if(wizS.tipe==='expense'||wizS.act==='other'){var ks2=document.getElementById('wizKatSel');if(ks2&&ks2.selectedIndex>=0)kat=ks2.options[ks2.selectedIndex].text;}"
    + "else if(wizS.act==='billiard'){kat='Sewa Meja';}else if(wizS.act==='kopi'){kat='Kopi / Snack';}"
    + "document.getElementById('sumKat').textContent=kat||'—';"
    + "var ket='';"
    + "if(wizS.act==='billiard'&&wizS.tipe==='income'){"
    + "var mj=document.getElementById('wizMeja');var dr=document.getElementById('wizDurasi');"
    + "var dtl=document.getElementById('wizDetailMainInp');"
    + "ket=(mj?mj.value:'')+(dr&&dr.value?' · '+dr.value:'');"
    + "if(dr&&dr.value==='Open / Loss'&&dtl&&dtl.value.trim())ket+=' ('+dtl.value.trim()+')';}"
    + "else if(wizS.act==='kopi'&&wizS.tipe==='income'){"
    + "var items=[];document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){"
    + "var sel=r.querySelector('select');var qty=r.querySelector('.fin-qty-inp');"
    + "if(sel&&sel.value){"
    + "var q=parseInt(qty?qty.value:'1')||1;"
    + "var opt2=sel.options[sel.selectedIndex];"
    + "var kat2=opt2?opt2.dataset.kategori||'minuman':'minuman';"
    + "var hH=opt2?parseInt(opt2.dataset.hargaHot||'0'):0;"
    + "var tmp=r.dataset.temp||'ice';"
    + "var iStr=q>1?q+'\\xD7 '+sel.value:sel.value;"
    + "if(kat2==='minuman'&&hH>0)iStr+=' ('+tmp+')';"
    + "var ts=[];r.querySelectorAll('.wiz-tops label').forEach(function(lbl){"
    + "var cb=lbl.querySelector('input[type=checkbox]');"
    + "if(!cb||!cb.checked)return;"
    + "var tq=parseInt(lbl.querySelector('input[type=number]')?lbl.querySelector('input[type=number]').value:'1')||1;"
    + "var tn=lbl.querySelector('span')?lbl.querySelector('span').textContent:'';"
    + "ts.push(tq>1?tq+'\\xD7 '+tn:tn);});"
    + "if(ts.length)iStr+=' + '+ts.join(', ');"
    + "items.push(iStr);}});"
    + "ket=items.join(', ');}"
    + "var ketExtra=(document.getElementById('wizKet')?document.getElementById('wizKet').value:'').trim();"
    + "if(ket&&ketExtra&&ket!==ketExtra)ket=ket+' — '+ketExtra;else if(!ket)ket=ketExtra;"
    + "document.getElementById('sumKet').textContent=ket||'—';"
    + "var jRaw=(document.getElementById('wizJumlah')?document.getElementById('wizJumlah').value:'').replace(/\\./g,'');"
    + "document.getElementById('sumTotal').textContent='Rp '+(parseInt(jRaw)||0).toLocaleString('id-ID');"
    + "document.getElementById('wizFJenis').value=wizS.tipe==='income'?'pemasukan':'pengeluaran';"
    + "document.getElementById('wizFWaktu').value=wizS.waktu;"
    + "var dtEl=document.getElementById('wizDatetime');document.getElementById('wizFDt').value=dtEl?dtEl.value:'';"
    + "document.getElementById('wizFKat').value=kat;"
    + "var subEl2=document.getElementById('wizSubKatSel');var subKatVal=(subEl2&&subEl2.value&&subEl2.value!=='')?subEl2.options[subEl2.selectedIndex].text:'';"
    + "document.getElementById('wizFSubKat').value=subKatVal;"
    + "document.getElementById('wizFKet').value=ket;"
    + "document.getElementById('wizFJ').value=jRaw;}"
    + "var pct={1:33,2:66,3:100};document.getElementById('wizProg').style.width=pct[n]+'%';"
    + "[1,2,3].forEach(function(i){document.getElementById('wizSd'+i).className='fin-sd'+(i===n?' active':i<n?' done':'');});"
    + "document.getElementById('wizStepLbl').textContent='Langkah '+n+' dari 3';"
    + "document.getElementById('wizBtnBack').style.display=n>1?'':'none';"
    + "var nb=document.getElementById('wizBtnNext');"
    + "if(n===3){nb.innerHTML='<i class=\"ti ti-check\" style=\"font-size:15px\"></i> Simpan Transaksi';"
    + "nb.onclick=function(){document.getElementById('wizForm').submit();};}"
    + "else{nb.innerHTML='Lanjut <i class=\"ti ti-arrow-right\" style=\"font-size:15px\"></i>';nb.onclick=wizNext;}"
    + "var icons={1:'ti-receipt',2:'ti-forms',3:'ti-circle-check'};"
    + "document.getElementById('wizIcon').innerHTML='<i class=\"ti '+icons[n]+'\"></i>';}"
    + "function wizDurasiChange(v){"
    + "var el=document.getElementById('wizDetailMain');"
    + "if(el)el.style.display=v==='Open / Loss'?'':'none';"
    + "wizHideErr('wizDetailMainErr');wizHideErr('wizDurasiErr');}"
    + "function wizShowErr(id,msg){"
    + "var el=document.getElementById(id);"
    + "if(el){el.textContent=msg;el.style.display='';el.scrollIntoView({block:'nearest'});}}"
    + "function wizNext(){"
    + "if(wizS.step===2){"
    + "if(wizS.act==='billiard'&&wizS.tipe==='income'){"
    + "var mj=document.getElementById('wizMeja');"
    + "if(!mj||!mj.value){wizShowErr('wizMejaErr','Nomor meja wajib dipilih.');return;}"
    + "var dr=document.getElementById('wizDurasi');"
    + "if(!dr||!dr.value){wizShowErr('wizDurasiErr','Durasi wajib dipilih.');return;}"
    + "if(dr.value==='Open / Loss'){"
    + "var dtl=document.getElementById('wizDetailMainInp');"
    + "if(!dtl||!dtl.value.trim()){wizShowErr('wizDetailMainErr','Detail main wajib diisi untuk durasi Open / Loss.');if(dtl)dtl.focus();return;}}}"
    + "if(wizS.act==='kopi'&&wizS.tipe==='income'){"
    + "var hasItem=false;"
    + "document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){var s=r.querySelector('select');if(s&&s.value)hasItem=true;});"
    + "if(!hasItem){wizShowErr('wizKopiErr','Pilih minimal 1 item pesanan.');return;}}"
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
    + "subSel.innerHTML='<option value=\"\">— Pilih sub kategori —</option>'+subs.map(function(n){return '<option>'+n+'</option>';}).join('');"
    + "wrap.style.display='';}"
    + "else if(wrap){wrap.style.display='none';}}"
    // Charts
    + "(function(){"
    + "var bc=document.getElementById('barChart');"
    + "if(bc)new Chart(bc,{type:'bar',data:{labels:" + chartLabelsJson + ",datasets:["
    + "{label:'Pemasukan',data:" + chartInJson + ",backgroundColor:'#3a7d2c',borderRadius:6,borderSkipped:false},"
    + "{label:'Pengeluaran',data:" + chartOutJson + ",backgroundColor:'#f09595',borderRadius:6,borderSkipped:false}"
    + "]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},"
    + "scales:{x:{grid:{display:false},ticks:{font:{size:11,family:'DM Sans'},color:'#7a8c78'}},"
    + "y:{beginAtZero:true,grid:{color:'#f0f3ef'},ticks:{font:{size:11,family:'DM Sans'},color:'#7a8c78',"
    + "callback:function(v){return 'Rp '+(v>=1000?(v/1000).toFixed(0)+'rb':v);}}}}}}); "
    + "var dc=document.getElementById('donutChart');"
    + "if(dc)new Chart(dc,{type:'doughnut',data:{labels:" + donutLabelsJson + ",datasets:[{data:" + donutValsJson + ",backgroundColor:" + donutColorsJson + ",borderWidth:0,hoverOffset:4}]},"
    + "options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}});"
    + "})();"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}

// ── Halaman kelola kategori ───────────────────────────────────
export function financeKategoriPage(token, kategoriList = [], showErr = false, subKategoriList = []) {
  const errHtml = showErr
    ? "<div style=\"background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px\">Kategori sudah ada atau tidak valid.</div>"
    : "";

  const inList  = kategoriList.filter((k) => k.jenis === "pemasukan");
  const outList = kategoriList.filter((k) => k.jenis === "pengeluaran");

  const subByKatId = {};
  subKategoriList.forEach((s) => {
    if (!subByKatId[s.kategori_id]) subByKatId[s.kategori_id] = [];
    subByKatId[s.kategori_id].push(s);
  });

  const makeRows = (list, jenis) => list.length > 0
    ? list.map((k) => {
        const subs    = subByKatId[k.id] || [];
        const hasSub  = subs.length > 0;
        const subLabel = hasSub ? subs.length + " Sub" : "Sub";
        const subRows  = subs.length > 0
          ? subs.map((s) =>
              "<div class=\"ks-row\">"
              + "<i class=\"ti ti-corner-down-right ks-arrow\"></i>"
              + "<span class=\"ks-name\">" + escHtml(s.nama) + "</span>"
              + "<a href=\"/operasional/kategori/sub/hapus?id=" + s.id + "\" class=\"ks-del\" title=\"Hapus\" onclick=\"return confirm('Hapus sub kategori ini?')\"><i class=\"ti ti-x\"></i></a>"
              + "</div>"
            ).join("")
          : "<div class=\"ks-empty\"><i class=\"ti ti-folder-open\"></i> Belum ada sub kategori</div>";

        return "<div class=\"kat-row\" data-id=\"" + k.id + "\">"
          + "<div class=\"kat-row-main\">"
          + "<i class=\"ti ti-grip-vertical kat-grip\" title=\"Geser untuk ubah urutan\"></i>"
          + "<div class=\"kat-dot " + jenis + "\"></div>"
          + "<span class=\"kat-row-name\">" + escHtml(k.nama) + "</span>"
          + "<button type=\"button\" class=\"kat-sub-btn" + (hasSub ? " active" : "") + "\" id=\"subtoggle-" + k.id + "\" onclick=\"toggleSub(" + k.id + ")\" title=\"Kelola sub kategori\">"
          + "<i class=\"ti ti-chevron-right\"></i> " + subLabel
          + "</button>"
          + "<a href=\"/operasional/kategori/hapus?id=" + k.id + "\" class=\"kat-del\" title=\"Hapus kategori\" onclick=\"return confirm('Hapus kategori ini?')\"><i class=\"ti ti-trash\"></i></a>"
          + "</div>"
          + "<div class=\"kat-sub-area\" id=\"sub-" + k.id + "\">"
          + "<div class=\"ks-list\">" + subRows + "</div>"
          + "<form action=\"/operasional/kategori/sub/tambah\" method=\"post\" class=\"ks-add-form\">"
          + "<input type=\"hidden\" name=\"kategori_id\" value=\"" + k.id + "\">"
          + "<input type=\"text\" name=\"nama\" class=\"ks-inp\" placeholder=\"Tambah sub kategori baru...\" required>"
          + "<button type=\"submit\" class=\"ks-add-btn\"><i class=\"ti ti-plus\"></i> Tambah</button>"
          + "</form>"
          + "</div>"
          + "</div>";
      }).join("")
    : "<div class=\"kat-empty-row\"><i class=\"ti ti-inbox\"></i><div>Belum ada kategori.<br><span>Gunakan form di atas untuk menambah.</span></div></div>";

  const extraCss = [
    // Grid
    ".kat-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;margin-top:20px}",
    "@media(max-width:820px){.kat-grid{grid-template-columns:1fr}}",
    // Add card
    ".kat-add-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}",
    ".kat-add-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--txt3);margin-bottom:12px;display:flex;align-items:center;gap:6px}",
    ".kat-add-label i{color:var(--accent);font-size:14px}",
    ".kat-type-row{display:flex;gap:6px;margin-bottom:12px}",
    ".kat-pill{display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s;user-select:none}",
    ".kat-pill.inc{background:var(--green-bg);color:var(--accent);border-color:rgba(45,102,36,.2)}",
    ".kat-pill.inc.on{background:var(--accent);color:#fff;border-color:var(--accent)}",
    ".kat-pill.exp{background:var(--red-bg);color:var(--red);border-color:rgba(184,48,48,.2)}",
    ".kat-pill.exp.on{background:var(--red);color:#fff;border-color:var(--red)}",
    ".kat-form-row{display:flex;gap:8px}",
    ".kat-inp-wrap{flex:1;position:relative}",
    ".kat-inp-wrap i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:15px;pointer-events:none}",
    ".kat-name-inp{width:100%;padding:10px 12px 10px 36px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:13px;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;transition:border-color .15s,background .15s;box-sizing:border-box}",
    ".kat-name-inp:focus{border-color:var(--accent);background:var(--surface)}",
    ".kat-name-inp::placeholder{color:var(--txt3)}",
    // Column card
    ".kat-col{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}",
    ".kat-col-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);position:relative}",
    ".kat-col-head::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}",
    ".kat-col.inc .kat-col-head::before{background:var(--green)}",
    ".kat-col.exp .kat-col-head::before{background:var(--red)}",
    ".kat-col-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}",
    ".kat-col.inc .kat-col-title{color:var(--accent)}",
    ".kat-col.exp .kat-col-title{color:var(--red)}",
    ".kat-col-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;line-height:1.5}",
    ".kat-col.inc .kat-col-badge{background:var(--green-bg);color:var(--accent)}",
    ".kat-col.exp .kat-col-badge{background:var(--red-bg);color:var(--red)}",
    ".kat-drag-tip{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--txt3)}",
    // Category rows
    ".kat-row{border-bottom:1px solid var(--border);background:var(--surface)}",
    ".kat-row:last-child{border-bottom:none}",
    ".kat-row.sortable-ghost{opacity:.3;background:var(--surface2)}",
    ".kat-row.sortable-chosen{background:var(--surface2)}",
    ".kat-row.sortable-drag{box-shadow:0 4px 16px rgba(0,0,0,.1);border-radius:8px;border:1px solid var(--border2)}",
    ".kat-row-main{display:flex;align-items:center;gap:8px;padding:10px 14px;transition:background .1s}",
    ".kat-row-main:hover{background:var(--surface2)}",
    ".kat-grip{font-size:18px;color:var(--border2);cursor:grab;flex-shrink:0;transition:color .15s;line-height:1}",
    ".kat-row-main:hover .kat-grip{color:var(--txt3)}",
    ".kat-grip:active{cursor:grabbing}",
    ".kat-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}",
    ".kat-dot.income{background:var(--green)}",
    ".kat-dot.expense{background:var(--red)}",
    ".kat-row-name{flex:1;font-size:13px;font-weight:500;color:var(--txt)}",
    ".kat-sub-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border2);background:var(--surface2);color:var(--txt3);transition:all .15s;white-space:nowrap;flex-shrink:0}",
    ".kat-sub-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--green-bg)}",
    ".kat-sub-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}",
    ".kat-sub-btn.active:hover{opacity:.85}",
    ".kat-sub-btn i{font-size:12px;transition:transform .18s}",
    ".kat-sub-btn.expanded i{transform:rotate(90deg)}",
    ".kat-del{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;color:var(--txt3);text-decoration:none;flex-shrink:0;transition:all .15s;font-size:14px}",
    ".kat-del:hover{background:var(--red-bg);color:var(--red)}",
    // Sub-category area
    ".kat-sub-area{display:none;border-top:1px dashed var(--border);background:var(--surface2)}",
    ".kat-sub-area.open{display:block}",
    ".ks-list{padding:6px 14px 6px 44px}",
    ".ks-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--txt2)}",
    ".ks-row:last-child{border-bottom:none}",
    ".ks-arrow{font-size:12px;color:var(--txt3);flex-shrink:0}",
    ".ks-name{flex:1}",
    ".ks-del{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;font-size:12px;color:var(--txt3);text-decoration:none;flex-shrink:0;transition:all .15s}",
    ".ks-del:hover{background:var(--red-bg);color:var(--red)}",
    ".ks-empty{padding:10px 0 4px;font-size:11px;color:var(--txt3);font-style:italic;display:flex;align-items:center;gap:5px}",
    ".ks-add-form{display:flex;gap:6px;padding:8px 14px 10px 44px;border-top:1px solid var(--border)}",
    ".ks-inp{flex:1;padding:7px 10px;border:1px solid var(--border2);border-radius:6px;font-size:12px;font-family:var(--ff);color:var(--txt);background:var(--surface);outline:none}",
    ".ks-inp:focus{border-color:var(--accent)}",
    ".ks-add-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;font-family:var(--ff);cursor:pointer;transition:opacity .15s;white-space:nowrap}",
    ".ks-add-btn:hover{opacity:.85}",
    // Empty state
    ".kat-empty-row{display:flex;align-items:center;gap:14px;padding:24px 18px;color:var(--txt3)}",
    ".kat-empty-row i{font-size:30px;opacity:.25;flex-shrink:0}",
    ".kat-empty-row div{font-size:12px;line-height:1.7;color:var(--txt3)}",
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
    + buildFinanceSidebar(token, "kategori")
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

    // ── Tambah form ─────────────────────────────────────────────
    + "<div class=\"kat-add-card\">"
    + "<div class=\"kat-add-label\"><i class=\"ti ti-circle-plus\"></i> Tambah Kategori Baru</div>"
    + "<div class=\"kat-type-row\">"
    + "<div class=\"kat-pill inc on\" id=\"pill-inc\" onclick=\"selectType('income')\"><i class=\"ti ti-arrow-up\" style=\"font-size:11px\"></i> Pemasukan</div>"
    + "<div class=\"kat-pill exp\" id=\"pill-exp\" onclick=\"selectType('expense')\"><i class=\"ti ti-arrow-down\" style=\"font-size:11px\"></i> Pengeluaran</div>"
    + "</div>"
    + "<form action=\"/operasional/kategori/tambah\" method=\"post\">"
    + "<input type=\"hidden\" name=\"jenis\" id=\"jenisInput\" value=\"pemasukan\">"
    + "<div class=\"kat-form-row\">"
    + "<div class=\"kat-inp-wrap\"><i class=\"ti ti-tag\"></i>"
    + "<input class=\"kat-name-inp\" name=\"nama\" id=\"catInput\" type=\"text\" placeholder=\"Nama kategori pemasukan...\" required></div>"
    + "<button type=\"submit\" class=\"btn-primary\" style=\"height:41px;white-space:nowrap;padding:0 18px\"><i class=\"ti ti-plus\"></i> Tambah</button>"
    + "</div>"
    + "</form></div>"

    // ── Grid dua kolom ──────────────────────────────────────────
    + "<div class=\"kat-grid\">"

    // Pemasukan
    + "<div class=\"kat-col inc\">"
    + "<div class=\"kat-col-head\">"
    + "<div class=\"kat-col-title\"><i class=\"ti ti-arrow-up\"></i> Pemasukan <span class=\"kat-col-badge\">" + inList.length + "</span></div>"
    + "<div class=\"kat-drag-tip\"><i class=\"ti ti-grip-vertical\"></i> Geser = urutan</div>"
    + "</div>"
    + "<div class=\"kat-list\" data-jenis=\"pemasukan\">" + makeRows(inList, "income") + "</div>"
    + "</div>"

    // Pengeluaran
    + "<div class=\"kat-col exp\">"
    + "<div class=\"kat-col-head\">"
    + "<div class=\"kat-col-title\"><i class=\"ti ti-arrow-down\"></i> Pengeluaran <span class=\"kat-col-badge\">" + outList.length + "</span></div>"
    + "<div class=\"kat-drag-tip\"><i class=\"ti ti-grip-vertical\"></i> Geser = urutan</div>"
    + "</div>"
    + "<div class=\"kat-list\" data-jenis=\"pengeluaran\">" + makeRows(outList, "expense") + "</div>"
    + "</div>"

    + "</div>"
    + "</div></div></div>"

    + "<div class=\"kat-toast\" id=\"katToast\"><span id=\"katToastMsg\"></span></div>"

    + "<script src=\"https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js\"><\/script>"
    + "<script>"
    + "function selectType(t){"
    + "var isInc=t==='income';"
    + "document.getElementById('jenisInput').value=isInc?'pemasukan':'pengeluaran';"
    + "document.getElementById('pill-inc').className='kat-pill inc'+(isInc?' on':'');"
    + "document.getElementById('pill-exp').className='kat-pill exp'+(!isInc?' on':'');"
    + "var inp=document.getElementById('catInput');"
    + "inp.placeholder=isInc?'Nama kategori pemasukan...':'Nama kategori pengeluaran...';"
    + "inp.focus();}"
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
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "document.querySelectorAll('.kat-list').forEach(function(el){"
    + "if(typeof Sortable==='undefined')return;"
    + "Sortable.create(el,{animation:160,handle:'.kat-grip',ghostClass:'sortable-ghost',chosenClass:'sortable-chosen',dragClass:'sortable-drag',onEnd:function(e){if(e.oldIndex!==e.newIndex)saveUrutan(el);}});});"
    + "</script>"
    + buildFinanceBottomNav()
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

export function financeMenuPage(token, items = [], toppings = [], hasErr = false, editItem = null) {
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
    + buildFinanceSidebar(token, "menu")
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
    + buildFinanceBottomNav()
    + "</body></html>";
}
