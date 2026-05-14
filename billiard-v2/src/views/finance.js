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
    + "<title>" + title + " — " + CONFIG.NAMA_ARENA + "</title>";
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
  "input[type=text],input[type=number],input[type=date],select.inp {",
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
    ? "<div style=\"background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);"
      + "border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px\">PIN salah. Coba lagi.</div>"
    : "";

  return docHead("Keuangan")
    + "<style>"
    + CSS
    + "body { display:flex; align-items:center; justify-content:center; padding:20px; }"
    + ".card { max-width:320px; padding:32px 24px; text-align:center; border-radius:20px; }"
    + "input[type=password] { width:100%; padding:14px; background:#0d1b2e; border:1.5px solid rgba(255,255,255,.12);"
    + "  border-radius:12px; font-size:28px; text-align:center; letter-spacing:.5em; color:var(--txt);"
    + "  outline:none; font-family:monospace; margin-bottom:12px; }"
    + "input[type=password]:focus { border-color:var(--accent); }"
    + ".btn-login { width:100%; background:var(--accent); color:#fff; border:none; border-radius:12px;"
    + "  padding:14px; font-size:15px; font-weight:700; cursor:pointer; }"
    + "</style></head><body><div class=\"card\">"
    + "<div style=\"font-size:36px;margin-bottom:12px\">💰</div>"
    + "<div style=\"font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;"
    + "color:var(--green);margin-bottom:8px\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<h1 style=\"font-size:20px;font-weight:700;color:var(--txt);margin-bottom:4px\">Laporan Keuangan</h1>"
    + "<p style=\"font-size:13px;color:var(--txt3);margin-bottom:20px\">Masukkan PIN untuk mengakses</p>"
    + errHtml
    + "<form action=\"/keuangan/login\" method=\"post\">"
    + "<input type=\"password\" name=\"pin\" placeholder=\"••••\" maxlength=\"8\" autofocus autocomplete=\"off\">"
    + "<button class=\"btn-login\" type=\"submit\">Masuk</button>"
    + "</form>"
    + "</div></body></html>";
}

// ── Dashboard ─────────────────────────────────────────────────
export function financeDashboard({ transaksi, token, bulanFilter, jenisFilter }) {
  const now = new Date();
  const curBulan = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const bFilter  = bulanFilter  || curBulan;
  const jFilter  = jenisFilter  || "";

  // Filter & sort
  const filtered = transaksi.filter((t) => {
    return t.tanggal.slice(0, 7) === bFilter
      && (!jFilter || t.jenis === jFilter);
  });
  const sorted = [...filtered].sort((a, b) =>
    b.tanggal !== a.tanggal
      ? b.tanggal.localeCompare(a.tanggal)
      : (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );

  // Summary
  const totalIn  = filtered.filter((t) => t.jenis === "pemasukan") .reduce((s, t) => s + t.jumlah, 0);
  const totalOut = filtered.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.jumlah, 0);
  const saldo    = totalIn - totalOut;

  // Bulan options (12 bulan terakhir)
  const bulanOpts = Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const lbl = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return "<option value=\"" + val + "\"" + (val === bFilter ? " selected" : "") + ">" + lbl + "</option>";
  }).join("");

  // Rows
  const rows = sorted.length > 0
    ? sorted.map((t) => {
        const isIn   = t.jenis === "pemasukan";
        const tglDisp = new Date(t.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
        });
        return "<tr>"
          + "<td style=\"white-space:nowrap\">" + tglDisp + "</td>"
          + "<td><span class=\"badge " + (isIn ? "badge-green" : "badge-red") + "\">"
          + (isIn ? "↑ Masuk" : "↓ Keluar") + "</span></td>"
          + "<td>" + escHtml(t.kategori) + "</td>"
          + "<td style=\"max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\""
          + " title=\"" + escHtml(t.keterangan) + "\">" + escHtml(t.keterangan || "—") + "</td>"
          + "<td style=\"font-weight:700;color:" + (isIn ? "var(--green)" : "var(--red)") + ";white-space:nowrap\">"
          + (isIn ? "+" : "−") + rp(t.jumlah) + "</td>"
          + "<td><a href=\"/keuangan/hapus?id=" + t.id + "&ftk=" + token
          + "\" class=\"tbl-btn tbl-btn-red\" onclick=\"return confirm('Hapus transaksi ini?')\">Hapus</a></td>"
          + "</tr>";
      }).join("")
    : "<tr><td colspan=\"6\" class=\"empty-state\">Belum ada transaksi</td></tr>";

  const bulanLabel = new Date(bFilter + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const saldoClass = saldo >= 0 ? "stat-saldo-pos" : "stat-saldo-neg";

  return docHead("Keuangan")
    + "<style>" + CSS + "</style>"
    + "</head><body data-theme=\"dark\">"

    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\"><span style=\"font-size:20px\">💰</span>"
    + "<div><div class=\"topbar-name\">" + CONFIG.NAMA_ARENA + "</div>"
    + "<div class=\"topbar-label\">Laporan Keuangan</div></div></div>"
    + "<div class=\"topbar-right\">"
    + "<button class=\"theme-btn\" onclick=\"toggleTheme()\" id=\"themeBtn\">🌙</button>"
    + "<a href=\"/admin\" class=\"btn-secondary\" style=\"font-size:12px\">Admin</a>"
    + "</div></header>"

    + "<main class=\"page\">"

    + "<div class=\"stats\">"
    + "<div class=\"stat-card\"><div style=\"font-size:16px;margin-bottom:4px\">↑</div>"
    + "<div class=\"stat-num stat-up\">" + rp(totalIn) + "</div>"
    + "<div class=\"stat-lbl\">Pemasukan — " + bulanLabel + "</div></div>"

    + "<div class=\"stat-card\"><div style=\"font-size:16px;margin-bottom:4px\">↓</div>"
    + "<div class=\"stat-num stat-down\">" + rp(totalOut) + "</div>"
    + "<div class=\"stat-lbl\">Pengeluaran — " + bulanLabel + "</div></div>"

    + "<div class=\"stat-card\"><div style=\"font-size:16px;margin-bottom:4px\">=</div>"
    + "<div class=\"stat-num " + saldoClass + "\">" + (saldo < 0 ? "−" : "") + rp(Math.abs(saldo)) + "</div>"
    + "<div class=\"stat-lbl\">Saldo bersih</div></div>"
    + "</div>"

    + "<div class=\"action-bar\">"
    + "<a href=\"/keuangan/tambah?ftk=" + token + "\" class=\"btn-primary\">＋ Tambah Transaksi</a>"
    + "</div>"

    + "<div class=\"filter-bar\">"
    + "<select class=\"sel\" onchange=\"applyFilter()\" id=\"fBulan\">" + bulanOpts + "</select>"
    + "<select class=\"sel\" onchange=\"applyFilter()\" id=\"fJenis\">"
    + "<option value=\"\"" + (!jFilter ? " selected" : "") + ">Semua</option>"
    + "<option value=\"pemasukan\""  + (jFilter === "pemasukan"   ? " selected" : "") + ">Pemasukan</option>"
    + "<option value=\"pengeluaran\"" + (jFilter === "pengeluaran" ? " selected" : "") + ">Pengeluaran</option>"
    + "</select>"
    + "</div>"

    + "<div class=\"sec-label\">" + sorted.length + " transaksi — " + bulanLabel + "</div>"
    + "<div class=\"card\"><div class=\"table-wrap\">"
    + "<table><thead><tr>"
    + "<th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th><th>Aksi</th>"
    + "</tr></thead><tbody>" + rows + "</tbody></table>"
    + "</div></div>"

    + "</main>"
    + "<div class=\"toast\" id=\"toast\"></div>"

    + "<script>"
    + "const FTK=" + JSON.stringify(token) + ";"
    + "function applyFilter(){"
    + "const b=document.getElementById('fBulan').value;"
    + "const j=document.getElementById('fJenis').value;"
    + "let url='/keuangan?ftk='+FTK+'&bulan='+b;"
    + "if(j)url+='&jenis='+j;"
    + "window.location.href=url;}"

    + "function toggleTheme(){"
    + "const el=document.documentElement;"
    + "const t=el.getAttribute('data-theme')==='light'?'dark':'light';"
    + "el.setAttribute('data-theme',t);"
    + "document.getElementById('themeBtn').textContent=t==='dark'?'🌙':'☀️';"
    + "localStorage.setItem('theme',t);}"

    + "const saved=localStorage.getItem('theme');"
    + "if(saved){document.documentElement.setAttribute('data-theme',saved);"
    + "const btn=document.getElementById('themeBtn');"
    + "if(btn)btn.textContent=saved==='dark'?'🌙':'☀️';}"
    + "</script>"
    + "</body></html>";
}

// ── Form tambah transaksi ─────────────────────────────────────
export function financeFormPage(token) {
  const today = new Date().toISOString().slice(0, 10);

  return docHead("Tambah Transaksi")
    + "<style>" + CSS
    + "body { display:flex; align-items:flex-start; justify-content:center; padding:20px; }"
    + "</style></head><body data-theme=\"dark\">"
    + "<div class=\"form-card\" style=\"margin-top:20px\">"
    + "<a href=\"/keuangan?ftk=" + token + "\" class=\"back-link\" style=\"margin-bottom:18px;display:inline-flex\">← Kembali</a>"
    + "<h1 style=\"font-size:18px;font-weight:700;color:var(--txt);margin-bottom:4px\">Tambah Transaksi</h1>"
    + "<p style=\"font-size:12px;color:var(--txt3);margin-bottom:20px\">Catat pemasukan atau pengeluaran</p>"

    + "<form action=\"/keuangan/tambah\" method=\"post\" id=\"frm\">"
    + "<input type=\"hidden\" name=\"ftk\" value=\"" + token + "\">"

    // Jenis toggle
    + "<div class=\"fw\"><label>Jenis</label>"
    + "<div class=\"jenis-toggle\">"
    + "<div class=\"jenis-btn active-in\" id=\"btnIn\" onclick=\"setJenis('pemasukan')\">↑ Pemasukan</div>"
    + "<div class=\"jenis-btn\" id=\"btnOut\" onclick=\"setJenis('pengeluaran')\">↓ Pengeluaran</div>"
    + "</div>"
    + "<input type=\"hidden\" name=\"jenis\" id=\"jenis\" value=\"pemasukan\">"
    + "</div>"

    // Tanggal
    + "<div class=\"fw\"><label>Tanggal</label>"
    + "<input type=\"date\" name=\"tanggal\" value=\"" + today + "\" required></div>"

    // Kategori
    + "<div class=\"fw\"><label>Kategori</label>"
    + "<select name=\"kategori\" class=\"inp\" id=\"kategori\">"
    + "<optgroup label=\"Pemasukan\" id=\"grpIn\">"
    + "<option>Sewa Meja</option><option>Makanan / Minuman</option>"
    + "<option>Turnamen</option><option>Registrasi Member</option><option>Lain-lain</option>"
    + "</optgroup>"
    + "<optgroup label=\"Pengeluaran\" id=\"grpOut\" style=\"display:none\">"
    + "<option>Listrik / Air</option><option>Gaji / Honor</option>"
    + "<option>Stok / Perlengkapan</option><option>Perawatan</option>"
    + "<option>Operasional</option><option>Lain-lain</option>"
    + "</optgroup>"
    + "</select></div>"

    // Keterangan
    + "<div class=\"fw\"><label>Keterangan</label>"
    + "<input type=\"text\" name=\"keterangan\" placeholder=\"contoh: Meja 2 — 3 jam\" autocomplete=\"off\"></div>"

    // Jumlah
    + "<div class=\"fw\"><label>Jumlah (Rp)</label>"
    + "<input type=\"number\" name=\"jumlah\" placeholder=\"0\" min=\"1\" required"
    + " oninput=\"previewRp(this.value)\">"
    + "<div id=\"rpPreview\" style=\"font-size:12px;color:var(--txt3);margin-top:4px\"></div>"
    + "</div>"

    + "<button class=\"btn-submit\" type=\"submit\">Simpan Transaksi</button>"
    + "</form></div>"

    + "<script>"
    + "function setJenis(j){"
    + "document.getElementById('jenis').value=j;"
    + "const isIn=j==='pemasukan';"
    + "document.getElementById('btnIn').className='jenis-btn'+(isIn?' active-in':'');"
    + "document.getElementById('btnOut').className='jenis-btn'+(!isIn?' active-out':'');"
    + "document.getElementById('grpIn').style.display=isIn?'':'none';"
    + "document.getElementById('grpOut').style.display=isIn?'none':'';"
    + "const sel=document.getElementById('kategori');"
    + "sel.selectedIndex=0;}"

    + "function previewRp(v){"
    + "const n=parseInt(v)||0;"
    + "if(n>0){"
    + "const s=String(n),parts=[];"
    + "for(let i=s.length;i>0;i-=3)parts.unshift(s.slice(Math.max(0,i-3),i));"
    + "document.getElementById('rpPreview').textContent='Rp\\u00a0'+parts.join('.');"
    + "}else document.getElementById('rpPreview').textContent='';}"
    + "</script>"
    + "</body></html>";
}
