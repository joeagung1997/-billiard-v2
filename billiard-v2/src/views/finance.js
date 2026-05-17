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

const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function docHead(title) {
  return "<!DOCTYPE html><html lang=\"id\"><head>"
    + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>" + title + " — " + CONFIG.NAMA_ARENA + "</title>"
    + "<link rel=\"stylesheet\" href=\"/finance.css?v=3\">";
}

function docHeadV4(title) {
  return "<!DOCTYPE html><html lang=\"id\"><head>"
    + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>" + title + " — " + CONFIG.NAMA_ARENA + "</title>"
    + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css\">"
    + "<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">"
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=8\">";
}

function buildFinanceSidebar(ftk) {
  return "<aside class=\"sidebar\">"
    + "<div class=\"sb-brand\">"
    + "<div class=\"sb-brand-icon\"><i class=\"ti ti-circle-number-8\"></i></div>"
    + "<div class=\"sb-brand-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"sb-brand-sub\">Admin Panel</div>"
    + "</div>"
    + "<div class=\"sb-section\">"
    + "<div class=\"sb-lbl\">Menu</div>"
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goAdmin()\"><i class=\"ti ti-layout-dashboard\"></i> Dashboard</a>"
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goMembers()\"><i class=\"ti ti-users\"></i> Kelola Member</a>"
    + "<a href=\"/keuangan?ftk=" + ftk + "\" class=\"nav-item active\"><i class=\"ti ti-wallet\"></i> Keuangan</a>"
    + "</div>"
    + "<div class=\"sb-section\">"
    + "<div class=\"sb-lbl\">Aksi</div>"
    + "<a href=\"#\" class=\"nav-item\" onclick=\"goReset()\"><i class=\"ti ti-refresh\"></i> Reset Harian</a>"
    + "</div>"
    + "<div class=\"sb-footer\">"
    + "<div class=\"sb-avatar\">AD</div>"
    + "<div><div class=\"sb-user-name\">Admin</div><div class=\"sb-user-role\">Administrator</div></div>"
    + "</div>"
    + "</aside>";
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
    +   "<form id=\"pf\" action=\"/keuangan/login\" method=\"post\">"
    +     "<input type=\"hidden\" name=\"pin\" id=\"pi\">"
    +   "</form>"
    +   "<div class=\"login-footer\">Gunakan keyboard atau tap angka di atas</div>"
    + "</div>"
    + "<script>" + script + "<\/script>"
    + "</body></html>";
}

// ── Dashboard ─────────────────────────────────────────────────
export function financeDashboard({ transaksi, token, bulanFilter, jenisFilter, tglDari, tglSampai, kategoriList = [] }) {
  const now = new Date();
  const curBulan = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const bFilter  = bulanFilter || curBulan;
  const jFilter  = jenisFilter || "";
  const tDari    = tglDari    || "";
  const tSampai  = tglSampai  || "";

  // Kategori optgroups untuk modal
  const modalGrpIn  = kategoriList.filter((k) => k.jenis === "pemasukan")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");
  const modalGrpOut = kategoriList.filter((k) => k.jenis === "pengeluaran")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");

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

  // Summary
  const pemasukan   = filtered.filter((t) => t.jenis === "pemasukan");
  const pengeluaran = filtered.filter((t) => t.jenis === "pengeluaran");
  const totalIn     = pemasukan.reduce((s, t) => s + t.jumlah, 0);
  const totalOut    = pengeluaran.reduce((s, t) => s + t.jumlah, 0);
  const saldo       = totalIn - totalOut;
  const margin      = totalIn > 0 ? ((saldo / totalIn) * 100).toFixed(1) : "0";

  // Perbandingan bulan lalu untuk badge "vs Apr 2026"
  const prevDate    = new Date(bFilter + "-01");
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevBulan   = prevDate.getFullYear() + "-" + String(prevDate.getMonth() + 1).padStart(2, "0");
  const prevLabel   = prevDate.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  const prevIn      = transaksi.filter((t) => t.tanggal.slice(0, 7) === prevBulan && t.jenis === "pemasukan")
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

  // ── Weekly breakdown for bar chart ───────────────────────────
  const weekIn  = [0, 0, 0, 0];
  const weekOut = [0, 0, 0, 0];
  filtered.forEach(function(t) {
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
    const tglDisp = new Date(t.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
    return "<div class=\"fin-row\">"
      + "<div class=\"fr-td muted mono\">" + tglDisp + "</div>"
      + "<div class=\"fr-td fr-desc\">"
      + "<div class=\"fr-desc-title\">" + escHtml(t.keterangan || "—") + "</div>"
      + "<div class=\"fr-desc-meta\">#" + escHtml(String(t.id).slice(-6)) + (t.jam ? " · " + escHtml(t.jam) : "") + "</div>"
      + "</div>"
      + "<div class=\"fr-td\"><span class=\"cat-tag\">" + escHtml(t.kategori || "—") + "</span></div>"
      + "<div class=\"fr-td right " + (isIn ? "amt-in" : "amt-out") + "\">" + (isIn ? "+" : "−") + rp(t.jumlah) + "</div>"
      + "<div class=\"fr-td\"><span class=\"t-badge " + (isIn ? "in" : "out") + "\">"
      + "<i class=\"ti ti-arrow-" + (isIn ? "up" : "down") + "\" style=\"font-size:9px;margin-right:2px\"></i>"
      + (isIn ? "Masuk" : "Keluar") + "</span></div>"
      + "<div class=\"fr-td right fr-act\">"
      + "<a href=\"/keuangan/edit?id=" + t.id + "&ftk=" + token + "\" class=\"icon-btn\" title=\"Edit\"><i class=\"ti ti-edit\"></i></a>"
      + "</div>"
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

  const chartLabelsJson = JSON.stringify(["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"]);
  const chartInJson     = JSON.stringify(weekIn);
  const chartOutJson    = JSON.stringify(weekOut);
  const donutValsJson   = JSON.stringify(donutVals);
  const donutLabelsJson = JSON.stringify(donutLabels);
  const donutColorsJson = JSON.stringify(donutColors);

  return docHeadV4("Keuangan")
    + "</head><body>"

    + "<div class=\"layout\">"
    + buildFinanceSidebar(token)
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
    + "<a href=\"/keuangan/kategori?ftk=" + token + "\" class=\"btn-outline\"><i class=\"ti ti-settings\" style=\"font-size:14px\"></i> Kategori</a>"
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
    + "<div class=\"fin-stat-val\">" + filtered.length + "</div>"
    + "<div class=\"fin-stat-foot\">Total catatan</div></div>"

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
    + "<span>" + sortedTbl.length + " transaksi</span>"
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
    + "<select class=\"fsel\" id=\"wizMeja\"><option value=\"\">Pilih meja...</option><option>Meja 1</option><option>Meja 2</option><option>Meja 3</option><option>Meja 4</option></select></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Durasi</label>"
    + "<select class=\"fsel\" id=\"wizDurasi\"><option>1 Sesi</option><option>1 Jam</option><option>2 Jam</option><option>3 Jam</option></select></div>"
    + "</div></div>"
    + "<div id=\"wizKopi\" class=\"fin-dynamic\">"
    + "<div class=\"fin-info-chip\"><i class=\"ti ti-info-circle\"></i><span>Tambahkan item yang dipesan.</span></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Item Pesanan</label>"
    + "<div class=\"fin-menu-items\" id=\"wizMenuItems\">"
    + "<div class=\"fin-menu-row\">"
    + "<input class=\"finp\" type=\"text\" placeholder=\"Nama item...\" value=\"Kopi\">"
    + "<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\" placeholder=\"Qty\">"
    + "<button type=\"button\" class=\"fin-btn-rm-row\" onclick=\"wizRmItem(this)\"><i class=\"ti ti-x\"></i></button>"
    + "</div></div>"
    + "<button type=\"button\" class=\"fin-btn-add-item\" onclick=\"wizAddItem()\"><i class=\"ti ti-plus\" style=\"font-size:14px\"></i> Tambah Item</button>"
    + "</div></div>"
    + "<div id=\"wizOther\" class=\"fin-dynamic\">"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Kategori</label>"
    + "<select class=\"fsel\" id=\"wizKatSel\">"
    + "<optgroup label=\"Pemasukan\" id=\"wizGrpIn\">" + modalGrpIn + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"wizGrpOut\">" + modalGrpOut + "</optgroup>"
    + "</select></div></div>"
    + "<div class=\"fmg\"><label class=\"fin-wiz-lbl\">Jumlah (Rp)</label>"
    + "<div class=\"fin-inp-pfx\"><span class=\"fin-pfx-lbl\">Rp</span>"
    + "<input class=\"fin-pfx-inp\" type=\"text\" inputmode=\"numeric\" id=\"wizJumlah\" placeholder=\"0\" oninput=\"wizFmtJ(this)\"></div></div>"
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
    + "<form id=\"wizForm\" action=\"/keuangan/tambah\" method=\"post\" style=\"display:none\">"
    + "<input type=\"hidden\" name=\"ftk\" value=\"" + token + "\">"
    + "<input type=\"hidden\" name=\"jenis\" id=\"wizFJenis\" value=\"pemasukan\">"
    + "<input type=\"hidden\" name=\"waktu\" id=\"wizFWaktu\" value=\"siang\">"
    + "<input type=\"hidden\" name=\"datetime\" id=\"wizFDt\">"
    + "<input type=\"hidden\" name=\"kategori\" id=\"wizFKat\">"
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

    + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js\"><\/script>"
    + "<script>"
    + "const FTK=" + JSON.stringify(token) + ";"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "function goReset(){var t=localStorage.getItem('warpat_atk');if(confirm('Reset scan harian semua member?'))window.location.href=t?'/admin/reset?tk='+t:'/admin';}"
    + "function buildUrl(){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var d=document.getElementById('fTglDari').value;"
    + "var s=document.getElementById('fTglSampai').value;"
    + "var url='/keuangan?ftk='+FTK+'&bulan='+b;"
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
    + "var url='/keuangan?ftk='+FTK+'&bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "window.location.href=url;}"
    + "function setPeriode(p){"
    + "var b=document.getElementById('fBulan').value;"
    + "var j=document.getElementById('fJenis').value;"
    + "var today=new Date();"
    + "var ymd=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};"
    + "var url='/keuangan?ftk='+FTK+'&bulan='+b;"
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
    + "function wizAddItem(){"
    + "var c=document.getElementById('wizMenuItems'),r=document.createElement('div');r.className='fin-menu-row';"
    + "r.innerHTML='<input class=\"finp\" type=\"text\" placeholder=\"Nama item...\">'"
    + "+'<input type=\"number\" class=\"fin-qty-inp\" value=\"1\" min=\"1\">'"
    + "+'<button type=\"button\" class=\"fin-btn-rm-row\" onclick=\"wizRmItem(this)\"><i class=\"ti ti-x\"></i></button>';"
    + "c.appendChild(r);}"
    + "function wizRmItem(btn){var rows=document.querySelectorAll('#wizMenuItems .fin-menu-row');if(rows.length>1)btn.closest('.fin-menu-row').remove();}"
    + "function wizFmtJ(el){var raw=el.value.replace(/\\D/g,'');el.value=raw?raw.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):''}"
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
    + "ket=(mj?mj.value:'')+(dr&&dr.value?' · '+dr.value:'');}"
    + "else if(wizS.act==='kopi'&&wizS.tipe==='income'){"
    + "var items=[];document.querySelectorAll('#wizMenuItems .fin-menu-row').forEach(function(r){"
    + "var nm=r.querySelector('input[type=text]');var qty=r.querySelector('input[type=number]');"
    + "if(nm&&nm.value)items.push(qty&&qty.value>1?qty.value+'× '+nm.value:nm.value);});"
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
    + "function wizNext(){if(wizS.step<3)wizGoTo(wizS.step+1);}"
    + "function wizPrev(){if(wizS.step>1)wizGoTo(wizS.step-1);}"
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
    + "</body></html>";
}

// ── Form tambah transaksi ─────────────────────────────────────
export function financeFormPage(token, kategoriList = []) {
  const today   = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  const grpIn  = kategoriList.filter((k) => k.jenis === "pemasukan")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");
  const grpOut = kategoriList.filter((k) => k.jenis === "pengeluaran")
    .map((k) => "<option>" + escHtml(k.nama) + "</option>").join("");

  return docHead("Tambah Transaksi")
    + "<style>body{display:flex;align-items:flex-start;justify-content:center;padding:20px}</style>"
    + "</head><body>"
    + "<div class=\"form-card\" style=\"margin-top:20px\">"
    + "<a href=\"/keuangan?ftk=" + token + "\" class=\"back-link\" style=\"margin-bottom:18px;display:inline-flex\">← Kembali</a>"
    + "<h1 style=\"font-size:18px;font-weight:700;color:var(--txt);margin-bottom:4px\">Tambah Transaksi</h1>"
    + "<p style=\"font-size:12px;color:var(--txt3);margin-bottom:20px\">Catat pemasukan atau pengeluaran</p>"

    + "<form action=\"/keuangan/tambah\" method=\"post\" id=\"frm\">"
    + "<input type=\"hidden\" name=\"ftk\" value=\"" + token + "\">"

    // Jenis
    + "<div class=\"fw\"><label>Jenis</label>"
    + "<div class=\"jenis-toggle\">"
    + "<div class=\"jenis-btn active-in\" id=\"btnIn\" onclick=\"setJenis('pemasukan')\">↑ Pemasukan</div>"
    + "<div class=\"jenis-btn\" id=\"btnOut\" onclick=\"setJenis('pengeluaran')\">↓ Pengeluaran</div>"
    + "</div>"
    + "<input type=\"hidden\" name=\"jenis\" id=\"jenis\" value=\"pemasukan\">"
    + "</div>"

    // Waktu
    + "<div class=\"fw\"><label>Waktu</label>"
    + "<div class=\"jenis-toggle\">"
    + "<div class=\"jenis-btn active-in\" id=\"btnSiang\" onclick=\"setWaktu('siang')\">☀️ Siang</div>"
    + "<div class=\"jenis-btn\" id=\"btnMalam\" onclick=\"setWaktu('malam')\">🌙 Malam</div>"
    + "</div>"
    + "<input type=\"hidden\" name=\"waktu\" id=\"waktu\" value=\"siang\">"
    + "</div>"

    // Tanggal + Jam
    + "<div class=\"fw\"><label>Tanggal &amp; Jam</label>"
    + "<input type=\"datetime-local\" name=\"datetime\" value=\"" + today + "T" + nowTime + "\" required>"
    + "</div>"

    // Kategori
    + "<div class=\"fw\"><label>Kategori</label>"
    + "<select name=\"kategori\" class=\"inp\" id=\"kategori\">"
    + "<optgroup label=\"Pemasukan\" id=\"grpIn\">" + grpIn + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"grpOut\" style=\"display:none\">" + grpOut + "</optgroup>"
    + "</select></div>"

    // Keterangan
    + "<div class=\"fw\"><label>Keterangan</label>"
    + "<input type=\"text\" name=\"keterangan\" placeholder=\"contoh: Meja 2 — 3 jam\" autocomplete=\"off\"></div>"

    // Jumlah (auto-format)
    + "<div class=\"fw\"><label>Jumlah (Rp)</label>"
    + "<input type=\"text\" name=\"jumlah\" id=\"jumlahDisp\" inputmode=\"numeric\""
    + " placeholder=\"0\" autocomplete=\"off\" oninput=\"fmtJumlah(this)\" required>"
    + "</div>"

    + "<button class=\"btn-submit\" type=\"submit\">Simpan Transaksi</button>"
    + "</form></div>"

    + "<script>"
    + "function fmtJumlah(el){"
    + "var raw=el.value.replace(/\\D/g,'');"
    + "el.value=raw?raw.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):'';"
    + "}"
    + "function setWaktu(w){"
    + "document.getElementById('waktu').value=w;"
    + "var s=w==='siang';"
    + "document.getElementById('btnSiang').className='jenis-btn'+(s?' active-in':'');"
    + "document.getElementById('btnMalam').className='jenis-btn'+(!s?' active-in':'');"
    + "}"
    + "function setJenis(j){"
    + "document.getElementById('jenis').value=j;"
    + "var isIn=j==='pemasukan';"
    + "document.getElementById('btnIn').className='jenis-btn'+(isIn?' active-in':'');"
    + "document.getElementById('btnOut').className='jenis-btn'+(!isIn?' active-out':'');"
    + "document.getElementById('grpIn').style.display=isIn?'':'none';"
    + "document.getElementById('grpOut').style.display=isIn?'none':'';"
    + "document.getElementById('kategori').selectedIndex=0;}"
    + "</script>"
    + "</body></html>";
}

// ── Form edit transaksi ───────────────────────────────────────
export function financeEditPage(token, t, kategoriList = []) {
  const isIn    = t.jenis === "pemasukan";
  const isSiang = (t.waktu ?? "siang") === "siang";

  const makeOpts = (list, selected) =>
    list.map((k) => "<option" + (k.nama === selected ? " selected" : "") + ">" + escHtml(k.nama) + "</option>").join("");

  const grpIn  = makeOpts(kategoriList.filter((k) => k.jenis === "pemasukan"),  isIn  ? t.kategori : "");
  const grpOut = makeOpts(kategoriList.filter((k) => k.jenis === "pengeluaran"), !isIn ? t.kategori : "");

  return docHead("Edit Transaksi")
    + "<style>body{display:flex;align-items:flex-start;justify-content:center;padding:20px}</style>"
    + "</head><body>"
    + "<div class=\"form-card\" style=\"margin-top:20px\">"
    + "<a href=\"/keuangan?ftk=" + token + "\" class=\"back-link\" style=\"margin-bottom:18px;display:inline-flex\">← Kembali</a>"
    + "<h1 style=\"font-size:18px;font-weight:700;color:var(--txt);margin-bottom:4px\">Edit Transaksi</h1>"
    + "<p style=\"font-size:12px;color:var(--txt3);margin-bottom:20px\">Ubah data transaksi</p>"

    + "<form action=\"/keuangan/edit\" method=\"post\" id=\"frm\">"
    + "<input type=\"hidden\" name=\"ftk\" value=\"" + token + "\">"
    + "<input type=\"hidden\" name=\"id\" value=\"" + t.id + "\">"

    // Jenis
    + "<div class=\"fw\"><label>Jenis</label>"
    + "<div class=\"jenis-toggle\">"
    + "<div class=\"jenis-btn" + (isIn ? " active-in" : "") + "\" id=\"btnIn\" onclick=\"setJenis('pemasukan')\">↑ Pemasukan</div>"
    + "<div class=\"jenis-btn" + (!isIn ? " active-out" : "") + "\" id=\"btnOut\" onclick=\"setJenis('pengeluaran')\">↓ Pengeluaran</div>"
    + "</div>"
    + "<input type=\"hidden\" name=\"jenis\" id=\"jenis\" value=\"" + t.jenis + "\">"
    + "</div>"

    // Waktu
    + "<div class=\"fw\"><label>Waktu</label>"
    + "<div class=\"jenis-toggle\">"
    + "<div class=\"jenis-btn" + (isSiang ? " active-in" : "") + "\" id=\"btnSiang\" onclick=\"setWaktu('siang')\">☀️ Siang</div>"
    + "<div class=\"jenis-btn" + (!isSiang ? " active-in" : "") + "\" id=\"btnMalam\" onclick=\"setWaktu('malam')\">🌙 Malam</div>"
    + "</div>"
    + "<input type=\"hidden\" name=\"waktu\" id=\"waktu\" value=\"" + (t.waktu ?? "siang") + "\">"
    + "</div>"

    // Tanggal + Jam
    + "<div class=\"fw\"><label>Tanggal &amp; Jam</label>"
    + "<input type=\"datetime-local\" name=\"datetime\" value=\"" + t.tanggal + "T" + (t.jam || "00:00") + "\" required>"
    + "</div>"

    // Kategori
    + "<div class=\"fw\"><label>Kategori</label>"
    + "<select name=\"kategori\" class=\"inp\" id=\"kategori\">"
    + "<optgroup label=\"Pemasukan\" id=\"grpIn\"" + (!isIn ? " style=\"display:none\"" : "") + ">"
    + grpIn + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"grpOut\"" + (isIn ? " style=\"display:none\"" : "") + ">"
    + grpOut + "</optgroup>"
    + "</select></div>"

    // Keterangan
    + "<div class=\"fw\"><label>Keterangan</label>"
    + "<input type=\"text\" name=\"keterangan\" value=\"" + escHtml(t.keterangan) + "\" autocomplete=\"off\"></div>"

    // Jumlah (auto-format)
    + "<div class=\"fw\"><label>Jumlah (Rp)</label>"
    + "<input type=\"text\" name=\"jumlah\" id=\"jumlahDisp\" inputmode=\"numeric\""
    + " value=\"" + String(t.jumlah).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "\""
    + " autocomplete=\"off\" oninput=\"fmtJumlah(this)\" required>"
    + "</div>"

    + "<button class=\"btn-submit\" type=\"submit\">Simpan Perubahan</button>"
    + "</form></div>"

    + "<script>"
    + "function fmtJumlah(el){"
    + "var raw=el.value.replace(/\\D/g,'');"
    + "el.value=raw?raw.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'):'';"
    + "}"
    + "function setWaktu(w){"
    + "document.getElementById('waktu').value=w;"
    + "var s=w==='siang';"
    + "document.getElementById('btnSiang').className='jenis-btn'+(s?' active-in':'');"
    + "document.getElementById('btnMalam').className='jenis-btn'+(!s?' active-in':'');"
    + "}"
    + "function setJenis(j){"
    + "document.getElementById('jenis').value=j;"
    + "var isIn=j==='pemasukan';"
    + "document.getElementById('btnIn').className='jenis-btn'+(isIn?' active-in':'');"
    + "document.getElementById('btnOut').className='jenis-btn'+(!isIn?' active-out':'');"
    + "document.getElementById('grpIn').style.display=isIn?'':'none';"
    + "document.getElementById('grpOut').style.display=isIn?'none':'';"
    + "document.getElementById('kategori').selectedIndex=0;}"
    + "</script>"
    + "</body></html>";
}

// ── Halaman kelola kategori ───────────────────────────────────
export function financeKategoriPage(token, kategoriList = [], showErr = false) {
  const errHtml = showErr
    ? "<div style=\"background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px\">Kategori sudah ada atau tidak valid.</div>"
    : "";

  const inList  = kategoriList.filter((k) => k.jenis === "pemasukan");
  const outList = kategoriList.filter((k) => k.jenis === "pengeluaran");

  const makeRows = (list, jenis) => list.length > 0
    ? list.map((k) =>
        "<div class=\"kat-row\">"
        + "<div class=\"kat-name\"><div class=\"kat-dot " + jenis + "\"></div>" + escHtml(k.nama) + "</div>"
        + "<div class=\"kat-act\">"
        + "<a href=\"/keuangan/kategori/hapus?id=" + k.id + "&ftk=" + token
        + "\" class=\"btn-del\" onclick=\"return confirm('Hapus kategori ini?')\"><i class=\"ti ti-trash\"></i> Hapus</a>"
        + "</div></div>"
      ).join("")
    : "<div class=\"kat-empty\"><i class=\"ti ti-inbox\"></i>Belum ada kategori</div>";

  const extraCss = [
    ".kat-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}",
    "@media(max-width:860px){.kat-grid{grid-template-columns:1fr}}",
    ".kat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}",
    ".kat-card-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid var(--border)}",
    ".kat-header-left{display:flex;align-items:center;gap:8px}",
    ".kat-type-badge{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}",
    ".kat-type-badge.income{color:var(--accent)}",
    ".kat-type-badge.expense{color:var(--red)}",
    ".count-chip{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px}",
    ".count-chip.income{background:var(--green-bg);color:var(--accent)}",
    ".count-chip.expense{background:var(--red-bg);color:var(--red)}",
    ".kat-table-head{display:grid;grid-template-columns:1fr 64px;padding:8px 18px;background:var(--surface2);border-bottom:1px solid var(--border)}",
    ".kat-th{font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em}",
    ".kat-th.r{text-align:right}",
    ".kat-row{display:grid;grid-template-columns:1fr 64px;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);transition:background .1s}",
    ".kat-row:last-child{border-bottom:none}",
    ".kat-row:hover{background:var(--surface2)}",
    ".kat-name{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--txt)}",
    ".kat-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}",
    ".kat-dot.income{background:var(--green)}",
    ".kat-dot.expense{background:var(--red)}",
    ".kat-act{display:flex;justify-content:flex-end}",
    ".btn-del{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;font-family:var(--ff);cursor:pointer;border:1px solid rgba(184,48,48,.25);background:var(--red-bg);color:var(--red);text-decoration:none;transition:opacity .15s}",
    ".btn-del:hover{opacity:.75}",
    ".btn-del i{font-size:12px}",
    ".kat-empty{padding:24px 18px;text-align:center;font-size:12px;color:var(--txt3)}",
    ".kat-empty i{font-size:24px;display:block;margin-bottom:6px;opacity:.35}",
    ".add-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 22px;margin-bottom:24px}",
    ".add-card-title{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);margin-bottom:14px;display:flex;align-items:center;gap:6px}",
    ".add-card-title i{font-size:14px;color:var(--accent)}",
    ".type-pills{display:flex;gap:6px;margin-bottom:14px}",
    ".type-pill{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1.5px solid transparent;transition:all .15s}",
    ".type-pill.income{background:var(--green-bg);color:var(--accent);border-color:rgba(45,102,36,.2)}",
    ".type-pill.income.active{background:var(--accent);color:#fff;border-color:var(--accent)}",
    ".type-pill.expense{background:var(--red-bg);color:var(--red);border-color:rgba(184,48,48,.2)}",
    ".type-pill.expense.active{background:var(--red);color:#fff;border-color:var(--red)}",
    ".add-form{display:flex;gap:10px;align-items:stretch}",
    ".inp-wrap{position:relative;flex:1}",
    ".inp-wrap i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:16px;pointer-events:none}",
    ".cat-input{width:100%;padding:10px 12px 10px 38px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:13px;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;transition:border-color .15s,background .15s;height:42px}",
    ".cat-input:focus{border-color:var(--accent);background:var(--surface)}",
    ".cat-input::placeholder{color:var(--txt3)}",
    ".stats-mini{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}",
    ".stat-mini{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden}",
    ".stat-mini::before{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;border-radius:var(--r-lg) var(--r-lg) 0 0}",
    ".stat-mini.income::before{background:var(--green)}",
    ".stat-mini.expense::before{background:var(--red)}",
    ".sm-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}",
    ".sm-icon.income{background:var(--green-bg);color:var(--accent)}",
    ".sm-icon.expense{background:var(--red-bg);color:var(--red)}",
    ".sm-label{font-size:11px;font-weight:500;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}",
    ".sm-count{font-size:22px;font-weight:600;color:var(--txt);font-family:var(--ff-mono)}",
  ].join("");

  return docHeadV4("Kelola Kategori")
    + "<style>" + extraCss + "</style>"
    + "</head><body>"

    + "<div class=\"layout\">"
    + buildFinanceSidebar(token)
    + "<div class=\"main-wrap\">"

    // Mobile topbar
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-circle-number-8\"></i></div>"
    + "<div><div class=\"topbar-name\">Kelola Kategori</div>"
    + "<div class=\"topbar-label\">Keuangan</div></div>"
    + "</div>"
    + "</header>"

    + "<div class=\"page\">"

    // Breadcrumb
    + "<div style=\"display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt3);margin-bottom:18px\">"
    + "<a href=\"/keuangan?ftk=" + token + "\" style=\"color:var(--accent);text-decoration:none;font-weight:500;display:flex;align-items:center;gap:4px\">"
    + "<i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "</div>"

    // Page title
    + "<div class=\"dash-topbar\">"
    + "<div><div class=\"page-title\">Kelola Kategori</div>"
    + "<div class=\"page-sub\">Tambah atau hapus kategori transaksi keuangan</div></div>"
    + "</div>"

    + errHtml

    // Stats mini
    + "<div class=\"stats-mini\">"
    + "<div class=\"stat-mini income\">"
    + "<div class=\"sm-icon income\"><i class=\"ti ti-arrow-up-circle\"></i></div>"
    + "<div><div class=\"sm-label\">Kategori Pemasukan</div>"
    + "<div class=\"sm-count\">" + inList.length + "</div></div></div>"
    + "<div class=\"stat-mini expense\">"
    + "<div class=\"sm-icon expense\"><i class=\"ti ti-arrow-down-circle\"></i></div>"
    + "<div><div class=\"sm-label\">Kategori Pengeluaran</div>"
    + "<div class=\"sm-count\">" + outList.length + "</div></div></div>"
    + "</div>"

    // Add card
    + "<div class=\"add-card\">"
    + "<div class=\"add-card-title\"><i class=\"ti ti-circle-plus\"></i> Tambah Kategori Baru</div>"
    + "<div class=\"type-pills\">"
    + "<div class=\"type-pill income active\" id=\"pill-income\" onclick=\"selectType('income')\"><i class=\"ti ti-arrow-up\" style=\"font-size:12px\"></i> Pemasukan</div>"
    + "<div class=\"type-pill expense\" id=\"pill-expense\" onclick=\"selectType('expense')\"><i class=\"ti ti-arrow-down\" style=\"font-size:12px\"></i> Pengeluaran</div>"
    + "</div>"
    + "<form action=\"/keuangan/kategori/tambah\" method=\"post\">"
    + "<input type=\"hidden\" name=\"ftk\" value=\"" + token + "\">"
    + "<input type=\"hidden\" name=\"jenis\" id=\"jenisInput\" value=\"pemasukan\">"
    + "<div class=\"add-form\">"
    + "<div class=\"inp-wrap\"><i class=\"ti ti-tag\"></i>"
    + "<input class=\"cat-input\" name=\"nama\" type=\"text\" id=\"catInput\" placeholder=\"Nama kategori pemasukan...\" required></div>"
    + "<button type=\"submit\" class=\"btn-primary\" style=\"height:42px;white-space:nowrap\"><i class=\"ti ti-plus\" style=\"font-size:16px\"></i> Tambah</button>"
    + "</div></form></div>"

    // Category grid
    + "<div class=\"kat-grid\">"

    // Pemasukan
    + "<div class=\"kat-card\">"
    + "<div class=\"kat-card-header\"><div class=\"kat-header-left\">"
    + "<div class=\"kat-type-badge income\"><i class=\"ti ti-arrow-up\"></i> Pemasukan</div>"
    + "<div class=\"count-chip income\">" + inList.length + "</div>"
    + "</div></div>"
    + "<div class=\"kat-table-head\"><div class=\"kat-th\">Nama Kategori</div><div class=\"kat-th r\">Aksi</div></div>"
    + "<div>" + makeRows(inList, "income") + "</div>"
    + "</div>"

    // Pengeluaran
    + "<div class=\"kat-card\">"
    + "<div class=\"kat-card-header\"><div class=\"kat-header-left\">"
    + "<div class=\"kat-type-badge expense\"><i class=\"ti ti-arrow-down\"></i> Pengeluaran</div>"
    + "<div class=\"count-chip expense\">" + outList.length + "</div>"
    + "</div></div>"
    + "<div class=\"kat-table-head\"><div class=\"kat-th\">Nama Kategori</div><div class=\"kat-th r\">Aksi</div></div>"
    + "<div>" + makeRows(outList, "expense") + "</div>"
    + "</div>"

    + "</div>"
    + "</div>"
    + "</div>"
    + "</div>"

    + "<script>"
    + "function selectType(type){"
    + "document.getElementById('jenisInput').value=type==='income'?'pemasukan':'pengeluaran';"
    + "document.getElementById('pill-income').className='type-pill income'+(type==='income'?' active':'');"
    + "document.getElementById('pill-expense').className='type-pill expense'+(type==='expense'?' active':'');"
    + "document.getElementById('catInput').placeholder=type==='income'?'Nama kategori pemasukan...':'Nama kategori pengeluaran...';"
    + "document.getElementById('catInput').focus();}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "function goReset(){var t=localStorage.getItem('warpat_atk');if(confirm('Reset scan harian semua member?'))window.location.href=t?'/admin/reset?tk='+t:'/admin';}"
    + "</script>"
    + "</body></html>";
}
