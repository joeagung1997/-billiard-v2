// src/views/admin.js
// ── HTML views untuk halaman admin ───────────────────────────
// ATURAN: TIDAK ADA nested backtick. Semua kondisional dihitung
// sebagai variabel string biasa SEBELUM dimasukkan ke template literal.

import { CONFIG } from "../config.js";
import { getBulanOptions, formatTanggalPendek, formatTanggalBulan, formatTanggalJam } from "../utils/format.js";
import { initials } from "./finance.js";

// ── WA SVG icon (string biasa, bukan template literal) ────────
const WA_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">'
  + '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>'
  + '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.103 1.508 5.827L0 24l6.335-1.482A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.214-3.732.873.916-3.641-.235-.374A9.818 9.818 0 1112 21.818z"/>'
  + '</svg>';

// ── CSS admin gelap (shared) ──────────────────────────────────
const DARK_BASE = [
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080e18;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}',
  '.card{background:#0d1829;border:1px solid #1e2d45;border-radius:20px;padding:28px 22px;max-width:400px;width:100%}',
  '.back{display:flex;align-items:center;gap:6px;font-size:13px;color:#3b82f6;text-decoration:none;margin-bottom:20px}',
  'h1{font-size:20px;font-weight:700;color:#e2e8f0;margin-bottom:4px}',
  '.fw{margin-bottom:18px}',
  'label{display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}',
  'input[type=text],input[type=tel]{width:100%;padding:13px 14px;background:#0a1422;border:1.5px solid #1e3a5f;border-radius:12px;font-size:15px;color:#e2e8f0;outline:none;font-family:inherit}',
  'input:focus{border-color:#3b82f6}',
  'input::placeholder{color:#2a3a52}',
  'input.err-f{border-color:#ef4444}',
  '.err-msg{font-size:12px;color:#f87171;margin-top:6px;padding:8px 10px;background:rgba(239,68,68,.08);border-radius:8px;border:1px solid rgba(239,68,68,.2)}',
  '.tel-wrap{display:flex}',
  '.tel-pre{background:#111f35;border:1.5px solid #1e3a5f;border-right:none;border-radius:12px 0 0 12px;padding:13px 12px;font-size:15px;color:#475569;white-space:nowrap;user-select:none}',
  '.tel-wrap input{border-radius:0 12px 12px 0}',
  '.hint{font-size:11px;color:#334155;margin-top:5px}',
  'button[type=submit]{width:100%;background:#2563eb;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px}',
  'button[type=submit]:active{opacity:.85}',
  'a.btn-link{display:inline-block;border-radius:10px;padding:10px 22px;font-size:13px;font-weight:600;text-decoration:none}',
].join('');

function docHead(title) {
  return '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
    + '<title>' + title + ' — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
}

// ── Login page ────────────────────────────────────────────────

export function adminLoginPage(showError) {
  const errHtml = showError
    ? '<div class="error-msg show"><i class="ti ti-alert-circle"></i><span>Username atau PIN salah. Silakan coba lagi.</span></div>'
    : '<div class="error-msg"><i class="ti ti-alert-circle"></i><span>Username atau PIN salah. Silakan coba lagi.</span></div>';

  // ── Login design clean v2 — Fraunces + Geist, light theme, single wrapper card ──
  const css = [
    ':root{',
    '  --green:#1F5C28;--green-lt:#2D7A35;--green-soft:#E8F5E9;--green-mid:#C8E6CB;',
    '  --text:#111814;--text-mid:#3D5240;--text-muted:#7A9480;',
    '  --border:#E2EAE3;--border-mid:#C8D8CA;',
    '  --bg:#F8FAF8;--white:#FFFFFF;',
    '}',
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:"Geist",sans-serif;background:var(--bg);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;-webkit-font-smoothing:antialiased}',

    /* Subtle background grid */
    'body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px;opacity:0.4;pointer-events:none}',
    /* Green glow spot top-left */
    'body::after{content:"";position:fixed;top:-120px;left:-80px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(31,92,40,0.07) 0%,transparent 65%);pointer-events:none}',

    /* Wrapper */
    '.wrapper{position:relative;z-index:1;display:grid;grid-template-columns:340px 1fr;gap:0;width:100%;max-width:900px;min-height:560px;background:var(--white);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.02),0 20px 60px rgba(0,0,0,0.06);animation:wrapIn .5s cubic-bezier(.23,1,.32,1) both}',

    /* Left brand panel */
    '.brand-panel{background:var(--text);padding:40px 36px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}',
    '.brand-panel::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:20px 20px}',
    '.brand-panel::after{content:"";position:absolute;bottom:-60px;right:-60px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(45,122,53,0.18),transparent 65%);pointer-events:none}',
    '.bp-content,.bp-bottom{position:relative;z-index:1}',

    '.bp-logo{display:flex;align-items:center;gap:9px;margin-bottom:48px;text-decoration:none}',
    '.bp-logo-sq{width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff}',
    '.bp-logo-name{font-family:"Fraunces",serif;font-size:14px;font-weight:600;color:rgba(255,255,255,0.8);letter-spacing:0.01em}',

    '.bp-title{font-family:"Fraunces",serif;font-size:34px;font-weight:600;line-height:1.08;letter-spacing:-0.03em;color:#fff;margin-bottom:14px}',
    '.bp-title em{font-style:italic;font-weight:300;color:rgba(255,255,255,0.6)}',
    '.bp-sub{font-size:13px;font-weight:300;color:rgba(255,255,255,0.45);line-height:1.65}',

    '.bp-features{list-style:none;margin-top:28px;display:flex;flex-direction:column;gap:10px}',
    '.bp-features li{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(255,255,255,0.45)}',
    '.bp-feat-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.2);flex-shrink:0}',
    '.bp-features li.lit{color:rgba(255,255,255,0.7)}',
    '.bp-features li.lit .bp-feat-dot{background:var(--green-soft);box-shadow:0 0 6px rgba(200,230,200,0.5)}',

    '.bp-meta{display:flex;gap:22px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07)}',
    '.bp-meta-val{font-family:"DM Mono",monospace;font-size:16px;font-weight:500;color:rgba(255,255,255,0.8);line-height:1}',
    '.bp-meta-label{font-size:10px;color:rgba(255,255,255,0.28);margin-top:4px;letter-spacing:0.04em}',

    /* Right form panel */
    '.form-panel{padding:48px 44px;display:flex;flex-direction:column;justify-content:center;background:var(--white);position:relative}',
    '.form-panel::before{content:"";position:absolute;top:0;left:0;bottom:0;width:1px;background:var(--border)}',

    '.form-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--green);margin-bottom:10px;opacity:0;animation:slideUp .4s ease .1s both}',
    '.form-title{font-family:"Fraunces",serif;font-size:30px;font-weight:600;color:var(--text);letter-spacing:-0.03em;line-height:1.1;margin-bottom:6px;opacity:0;animation:slideUp .4s ease .15s both}',
    '.form-sub{font-size:13px;font-weight:300;color:var(--text-muted);margin-bottom:32px;opacity:0;animation:slideUp .4s ease .2s both}',

    /* Error */
    '.error-msg{display:flex;align-items:center;gap:8px;padding:10px 13px;background:#FEF2F2;border:1px solid #FECACA;border-radius:9px;margin-bottom:18px;font-size:12px;color:#DC2626;max-height:0;overflow:hidden;opacity:0;transition:max-height .25s ease,opacity .2s ease,margin .2s ease,padding .2s ease;padding-top:0;padding-bottom:0;margin-bottom:0}',
    '.error-msg.show{max-height:60px;opacity:1;padding:10px 13px;margin-bottom:18px;animation:shake .45s cubic-bezier(.36,.07,.19,.97)}',
    '.error-msg i{font-size:14px;flex-shrink:0}',
    '@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',

    /* PIN dots */
    '.pin-dots{display:flex;justify-content:center;gap:11px;margin-bottom:20px;opacity:0;animation:slideUp .4s ease .25s both}',
    '.dot{width:13px;height:13px;border-radius:50%;background:var(--bg);border:2px solid var(--border-mid);transition:all .15s cubic-bezier(.34,1.56,.64,1)}',
    '.dot.filled{background:var(--green);border-color:var(--green);transform:scale(1.18);box-shadow:0 0 10px rgba(31,92,40,.45)}',

    /* Numpad */
    '.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px;opacity:0;animation:slideUp .4s ease .3s both}',
    '.np-btn{background:var(--bg);border:1px solid var(--border-mid);border-radius:10px;color:var(--text);font-size:18px;font-weight:600;padding:14px 10px;cursor:pointer;transition:background .12s,transform .1s,border-color .12s;font-family:"Geist",sans-serif;touch-action:manipulation;user-select:none;line-height:1}',
    '.np-btn:hover{background:#EEF2EE;border-color:var(--border-mid)}',
    '.np-btn:active{transform:scale(.94);opacity:.85}',
    '.np-btn.del-btn{color:#B0BFB2;font-size:17px}',
    '.np-btn.go-btn{background:var(--green);border-color:var(--green);color:#fff;box-shadow:0 2px 8px rgba(31,92,40,.2);font-size:17px}',
    '.np-btn.go-btn:hover{background:var(--green-lt);box-shadow:0 4px 14px rgba(31,92,40,.28)}',

    /* Username input */
    '.uname-wrap{margin-bottom:20px;opacity:0;animation:slideUp .4s ease .22s both}',
    '.uname-lbl{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);margin-bottom:7px;display:block}',
    '.uname-inp{width:100%;padding:11px 14px;border:1.5px solid var(--border-mid);border-radius:10px;font-family:"Geist",sans-serif;font-size:14px;font-weight:400;color:var(--text);background:var(--bg);outline:none;transition:border-color .15s,box-shadow .15s,background .15s;-webkit-appearance:none}',
    '.uname-inp:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(31,92,40,.1);background:var(--white)}',
    '.uname-inp::placeholder{color:var(--text-muted);font-weight:300;font-size:13px}',
    '.uname-inp.err{border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,.08)}',
    /* PIN section label */
    '.pin-lbl{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;display:block;opacity:0;animation:slideUp .4s ease .24s both}',

    /* Or divider + back btn */
    '.or-row{display:flex;align-items:center;gap:12px;margin:18px 0;opacity:0;animation:slideUp .4s ease .35s both}',
    '.or-row::before,.or-row::after{content:"";flex:1;height:1px;background:var(--border)}',
    '.or-row span{font-size:11px;color:var(--text-muted);white-space:nowrap}',

    '.back-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:9px;font-size:13px;font-weight:400;color:var(--text-muted);text-decoration:none;transition:all .15s;background:var(--bg);opacity:0;animation:slideUp .4s ease .4s both}',
    '.back-btn:hover{background:var(--white);border-color:var(--border-mid);color:var(--text)}',

    '.form-note{margin-top:20px;text-align:center;font-size:11px;color:var(--text-muted);line-height:1.6;opacity:0;animation:slideUp .4s ease .45s both}',

    /* Animations */
    '@keyframes wrapIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',

    '@media (max-width:720px){.wrapper{grid-template-columns:1fr;max-width:440px}.brand-panel{display:none}.form-panel{padding:40px 32px}}',
  ].join('');

  const script = [
    'var _pin="",MAX=4,LS_KEY="warpat_last_uname";',
    'function press(n){if(_pin.length>=MAX)return;_pin+=n;upd();if(_pin.length===MAX)go();}',
    'function del(){_pin=_pin.slice(0,-1);upd();}',
    'function upd(){for(var i=0;i<MAX;i++){var d=document.getElementById("d"+i);if(d)d.classList.toggle("filled",i<_pin.length);}}',
    'function go(){',
    '  var un=document.getElementById("unameInp");',
    '  if(!un||!un.value.trim()){',
    '    if(un){un.focus();un.classList.add("err");setTimeout(function(){un.classList.remove("err");},600);}',
    '    return;',
    '  }',
    '  if(!_pin.length)return;',
    '  var uv=un.value.trim();',
    '  try{localStorage.setItem(LS_KEY,uv);}catch(_){}',
    '  document.getElementById("pi").value=_pin;',
    '  document.getElementById("pun").value=uv;',
    '  document.getElementById("pf").submit();',
    '}',
    // Keyboard: jika fokus di username input, biarkan native. Jika Enter, pindah ke PIN / submit.
    'document.addEventListener("keydown",function(e){',
    '  var un=document.getElementById("unameInp");',
    '  if(document.activeElement===un){',
    '    if(e.key==="Enter"){e.preventDefault();if(!_pin.length){document.getElementById("d0")&&document.getElementById("d0").parentElement.focus();}else{go();}}',
    '    return;',
    '  }',
    '  if(e.key>="0"&&e.key<="9")press(e.key);',
    '  else if(e.key==="Backspace")del();',
    '  else if(e.key==="Enter")go();',
    '});',
    // Prefill username dari localStorage, lalu auto-focus
    'window.addEventListener("load",function(){',
    '  var u=document.getElementById("unameInp");if(!u)return;',
    '  try{var s=localStorage.getItem(LS_KEY);if(s)u.value=s;}catch(_){}',
    '  if(u.value){var p=document.querySelector(".numpad .np-btn");if(p)p.focus();}else{u.focus();}',
    '});',
  ].join('');

  const dots = [0,1,2,3].map(function(i) { return '<div class="dot" id="d' + i + '"></div>'; }).join('');

  return '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
    + '<title>Masuk — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    + '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,600&family=Geist:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">'
    + '<style>' + css + '</style>'
    + '</head><body>'

    + '<div class="wrapper">'

    // LEFT BRAND PANEL
    + '<div class="brand-panel">'
    + '<div class="bp-content">'
    + '<a href="/" class="bp-logo">'
    + '<div class="bp-logo-sq">8</div>'
    + '<span class="bp-logo-name">' + CONFIG.NAMA_ARENA + '</span>'
    + '</a>'
    + '<h2 class="bp-title">Selamat<br>datang<br><em>kembali</em></h2>'
    + '<p class="bp-sub">Masuk untuk mengakses dashboard operasional billiard Anda.</p>'
    + '<ul class="bp-features">'
    + '<li class="lit"><div class="bp-feat-dot"></div>Dashboard real-time</li>'
    + '<li class="lit"><div class="bp-feat-dot"></div>Kelola member &amp; QR check-in</li>'
    + '<li class="lit"><div class="bp-feat-dot"></div>Laporan keuangan otomatis</li>'
    + '<li><div class="bp-feat-dot"></div>Kelola menu kopi &amp; snack</li>'
    + '<li><div class="bp-feat-dot"></div>Leaderboard &amp; reward sesi</li>'
    + '</ul>'
    + '</div>'
    + '<div class="bp-bottom">'
    + '<div class="bp-meta">'
    + '<div class="bp-meta-item"><div class="bp-meta-val">QR</div><div class="bp-meta-label">Check-in</div></div>'
    + '<div class="bp-meta-item"><div class="bp-meta-val">100%</div><div class="bp-meta-label">Digital</div></div>'
    + '<div class="bp-meta-item"><div class="bp-meta-val">&infin;</div><div class="bp-meta-label">Member</div></div>'
    + '</div>'
    + '</div>'
    + '</div>'

    // RIGHT FORM PANEL — username + PIN numpad
    + '<div class="form-panel">'
    + '<div class="form-eyebrow">Admin Panel</div>'
    + '<h1 class="form-title">Masuk</h1>'
    + '<p class="form-sub">Masukkan username dan PIN Anda untuk akses dashboard.</p>'

    + errHtml

    // Username input
    + '<div class="uname-wrap">'
    + '<label class="uname-lbl" for="unameInp">Username</label>'
    + '<input type="text" id="unameInp" class="uname-inp" placeholder="contoh: owner / karyawan1"'
    + ' autocomplete="username" autocorrect="off" autocapitalize="none" spellcheck="false">'
    + '</div>'

    // PIN section
    + '<span class="pin-lbl">PIN</span>'
    + '<div class="pin-dots">' + dots + '</div>'

    + '<div class="numpad">'
    + '<button type="button" class="np-btn" onclick="press(\'1\')">1</button>'
    + '<button type="button" class="np-btn" onclick="press(\'2\')">2</button>'
    + '<button type="button" class="np-btn" onclick="press(\'3\')">3</button>'
    + '<button type="button" class="np-btn" onclick="press(\'4\')">4</button>'
    + '<button type="button" class="np-btn" onclick="press(\'5\')">5</button>'
    + '<button type="button" class="np-btn" onclick="press(\'6\')">6</button>'
    + '<button type="button" class="np-btn" onclick="press(\'7\')">7</button>'
    + '<button type="button" class="np-btn" onclick="press(\'8\')">8</button>'
    + '<button type="button" class="np-btn" onclick="press(\'9\')">9</button>'
    + '<button type="button" class="np-btn del-btn" onclick="del()" aria-label="Hapus"><i class="ti ti-backspace"></i></button>'
    + '<button type="button" class="np-btn" onclick="press(\'0\')">0</button>'
    + '<button type="button" class="np-btn go-btn" onclick="go()" aria-label="Masuk"><i class="ti ti-arrow-right"></i></button>'
    + '</div>'

    + '<form id="pf" action="/admin/login" method="post">'
    + '<input type="hidden" name="pin"      id="pi">'
    + '<input type="hidden" name="username" id="pun">'
    + '</form>'

    + '<div class="or-row"><span>atau</span></div>'

    + '<a href="/" class="back-btn"><i class="ti ti-arrow-left" style="font-size:14px"></i> Kembali ke halaman utama</a>'

    + '<p class="form-note">Isi username → tap PIN → tekan ➜ untuk masuk.</p>'
    + '</div>'

    + '</div>'

    + '<script>' + script + '<\/script>'
    + '</body></html>';
}

// ── Dashboard helpers (shared between adminDashboard & memberPage) ───────────

// ── Format Rupiah (server-side) ───────────────────────────────
function rpFmt(n) {
  const abs = Math.abs(Math.round(Number(n) || 0));
  const s   = String(abs);
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return 'Rp ' + parts.join('.');
}

// ── buildAdminCss — shared CSS for all admin dashboard pages ─────────────────
function buildAdminCss() {
  return [
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    ':root {',
    '  --ff: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;',
    '  --fs-xs:11px; --fs-sm:12px; --fs-base:13px; --fs-md:14px; --fs-lg:16px; --fs-2xl:26px;',
    '  --fw-m:500; --fw-b:600; --fw-bk:700;',
    '  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px;',
    '  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-xl:18px;',
    '  --bg:#070d18; --surface:#0c1526; --surface2:#111f35;',
    '  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.12);',
    '  --txt:#e8edf5; --txt2:#8496b0; --txt3:#4a5e78;',
    '  --accent:#3b82f6; --green:#22c55e; --green-bg:rgba(34,197,94,.12);',
    '  --gold:#f59e0b; --gold-bg:rgba(245,158,11,.12);',
    '  --red:#ef4444; --red-bg:rgba(239,68,68,.10);',
    '}',
    '[data-theme="light"] {',
    '  --bg:#f4f6fa; --surface:#fff; --surface2:#f0f4f8;',
    '  --border:rgba(0,0,0,.07); --border2:rgba(0,0,0,.12);',
    '  --txt:#0d1117; --txt2:#556070; --txt3:#94a3b8;',
    '}',
    'body { font-family:var(--ff); font-size:var(--fs-base); color:var(--txt); background:var(--bg); min-height:100vh; -webkit-font-smoothing:antialiased; }',

    // ── Layout ──────────────────────────────────────────────
    '.layout { display:flex; min-height:100vh; }',
    '.main-wrap { flex:1; min-width:0; display:flex; flex-direction:column; }',

    // ── Sidebar ─────────────────────────────────────────────
    '.sidebar { width:240px; flex-shrink:0; background:var(--surface); border-right:1px solid var(--border); min-height:100vh; position:sticky; top:0; height:100vh; display:flex; flex-direction:column; overflow-y:auto; z-index:60; }',
    '.sb-brand { display:flex; align-items:center; gap:10px; padding:18px 14px 14px; border-bottom:1px solid var(--border); }',
    '.sb-brand-icon { width:38px; height:38px; background:linear-gradient(135deg,#1a3c72,#0e2245); border:1px solid rgba(59,130,246,.22); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }',
    '.sb-brand-name { font-size:var(--fs-base); font-weight:var(--fw-bk); color:var(--txt); line-height:1.2; }',
    '.sb-brand-sub { font-size:var(--fs-xs); color:var(--txt3); margin-top:2px; }',
    '.sb-section { padding:10px 10px 4px; }',
    '.sb-lbl { font-size:10px; font-weight:var(--fw-bk); letter-spacing:.1em; text-transform:uppercase; color:var(--txt3); padding:0 4px; margin-bottom:4px; }',
    '.sb-divider { height:1px; background:var(--border); margin:8px 14px; }',
    '.sb-footer { margin-top:auto; padding:12px 14px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; }',
    '.sb-time { font-size:10px; color:var(--txt3); line-height:1.4; }',
    '.nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:10px; color:var(--txt2); font-size:var(--fs-sm); font-weight:var(--fw-b); text-decoration:none; cursor:pointer; border:none; background:transparent; font-family:var(--ff); width:100%; transition:background .12s, color .12s; }',
    '.nav-item:hover { background:var(--surface2); color:var(--txt); }',
    '.nav-item.active { background:rgba(59,130,246,.1); color:var(--accent); font-weight:600; }',
    '.nav-item.active.nav-green { background:var(--green-bg); color:var(--green); }',
    '.nav-icon { font-size:15px; width:22px; text-align:center; flex-shrink:0; }',
    '.nav-green:hover { background:var(--green-bg); color:var(--green); }',
    '.nav-gold:hover { background:var(--gold-bg); color:var(--gold); }',
    '.nav-red:hover { background:var(--red-bg); color:var(--red); }',

    // ── Topbar (mobile only) ─────────────────────────────────
    '.topbar { position:sticky; top:0; z-index:50; background:var(--surface); border-bottom:1px solid var(--border); padding:var(--sp-3) var(--sp-4); display:flex; align-items:center; justify-content:space-between; gap:var(--sp-3); }',
    '.topbar-brand { display:flex; align-items:center; gap:var(--sp-3); }',
    '.topbar-name { font-size:var(--fs-md); font-weight:var(--fw-bk); color:var(--txt); }',
    '.topbar-label { font-size:var(--fs-xs); color:var(--txt3); margin-top:1px; }',
    '.topbar-right { display:flex; align-items:center; gap:var(--sp-2); }',
    '.theme-btn { background:var(--surface2); border:1px solid var(--border2); border-radius:var(--r-sm); padding:5px var(--sp-2); font-size:var(--fs-sm); color:var(--txt2); cursor:pointer; }',

    // ── Bottom nav (mobile only) ─────────────────────────────
    '.bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; background:var(--surface); border-top:1px solid var(--border); z-index:100; padding:4px 0; }',
    '.bn-item { display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; padding:6px 4px; color:var(--txt3); font-size:10px; font-weight:600; text-decoration:none; cursor:pointer; border:none; background:transparent; font-family:var(--ff); touch-action:manipulation; }',
    '.bn-item.active, .bn-item:hover { color:var(--accent); }',
    '.bn-green.active, .bn-green:hover { color:var(--green); }',
    '.bn-red:hover { color:var(--red); }',
    '.bn-icon { font-size:18px; line-height:1; }',

    // ── Page ─────────────────────────────────────────────────
    '.page { padding:var(--sp-4); padding-bottom:60px; max-width:900px; }',
    '.sec-label { font-size:var(--fs-xs); font-weight:var(--fw-b); letter-spacing:.08em; text-transform:uppercase; color:var(--txt3); margin-bottom:var(--sp-2); margin-top:var(--sp-5); }',
    '.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--sp-2); margin-bottom:var(--sp-4); }',
    '.stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:var(--sp-3) var(--sp-4); }',
    '.stat-num { font-size:var(--fs-2xl); font-weight:var(--fw-bk); color:var(--txt); line-height:1; }',
    '.stat-lbl { font-size:var(--fs-xs); color:var(--txt2); margin-top:3px; }',
    '.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; }',
    '.tabs-wrap { display:flex; border-bottom:1px solid var(--border); }',
    '.tab-btn { flex:1; padding:var(--sp-3) var(--sp-2); font-size:var(--fs-sm); font-weight:var(--fw-b); color:var(--txt3); cursor:pointer; border-bottom:2px solid transparent; text-align:center; white-space:nowrap; }',
    '.tab-btn.on { color:var(--green); border-bottom-color:var(--green); }',
    '.tab-body { display:none; }',
    '.tab-body.on { display:block; }',
    '.list-item { display:flex; align-items:center; gap:var(--sp-3); padding:var(--sp-3) var(--sp-4); border-bottom:1px solid var(--border); }',
    '.list-item:last-child { border-bottom:none; }',
    '.list-main { flex:1; min-width:0; }',
    '.list-name { font-size:var(--fs-base); font-weight:var(--fw-m); color:var(--txt); }',
    '.list-sub { font-size:var(--fs-xs); color:var(--txt3); margin-top:2px; font-family:monospace; }',
    '.badge { display:inline-flex; align-items:center; gap:3px; padding:2px var(--sp-2); border-radius:var(--r-sm); font-size:var(--fs-xs); font-weight:var(--fw-b); }',
    '.badge-green { background:var(--green-bg); color:var(--green); }',
    '.badge-gold  { background:var(--gold-bg); color:var(--gold); }',
    '.badge-blue  { background:rgba(59,130,246,.12); color:var(--accent); }',
    '.show-all-btn { display:block; width:100%; padding:var(--sp-3); border:none; border-top:1px solid var(--border); background:var(--surface2); color:var(--accent); font-size:var(--fs-sm); font-weight:var(--fw-b); cursor:pointer; }',
    '.show-all-btn:hover { background:var(--surface); }',
    '.btn-add-member { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; background:var(--accent); color:#fff; border-radius:var(--r-md); font-size:var(--fs-xs); font-weight:var(--fw-bk); text-decoration:none; white-space:nowrap; }',
    '.btn-add-member:hover { opacity:.85; }',
    '.filter-bar { display:flex; gap:var(--sp-2); margin-bottom:var(--sp-2); flex-wrap:wrap; align-items:center; }',
    '.search-wrap { position:relative; flex:1; min-width:160px; }',
    '.search-input { width:100%; padding:var(--sp-2) var(--sp-3) var(--sp-2) 34px; background:var(--surface); border:1px solid var(--border2); border-radius:var(--r-md); color:var(--txt); font-size:var(--fs-base); outline:none; font-family:var(--ff); }',
    '.search-input:focus { border-color:var(--accent); }',
    '.search-input::placeholder { color:var(--txt3); }',
    '.sel { padding:var(--sp-2) var(--sp-3); background:var(--surface); border:1px solid var(--border2); border-radius:var(--r-md); color:var(--txt); font-size:var(--fs-base); outline:none; cursor:pointer; font-family:var(--ff); }',
    '.table-wrap { overflow-x:auto; }',
    'table { width:100%; border-collapse:collapse; min-width:520px; }',
    'thead tr { border-bottom:1px solid var(--border); }',
    'th { padding:var(--sp-2) var(--sp-4); font-size:var(--fs-xs); font-weight:var(--fw-b); color:var(--txt3); text-transform:uppercase; letter-spacing:.07em; text-align:left; background:var(--surface2); white-space:nowrap; }',
    'tbody tr { border-bottom:1px solid var(--border); transition:background .1s; }',
    'tbody tr:last-child { border-bottom:none; }',
    'tbody tr:hover { background:var(--surface2); }',
    'td { padding:var(--sp-3) var(--sp-4); vertical-align:middle; }',
    '.tbl-btn { display:inline-block; padding:3px var(--sp-2); border-radius:var(--r-sm); font-size:var(--fs-xs); font-weight:var(--fw-b); cursor:pointer; text-decoration:none; border:1px solid var(--border2); color:var(--txt2); background:var(--surface2); white-space:nowrap; }',
    '.tbl-btn:hover { opacity:.75; }',
    '.tbl-btn-blue { color:var(--accent); border-color:rgba(59,130,246,.25); background:rgba(59,130,246,.08); }',
    '.tbl-btn-red { color:var(--red); border-color:rgba(239,68,68,.25); background:var(--red-bg); }',
    '.tbl-btn-gold { color:var(--gold); border-color:rgba(245,158,11,.25); background:var(--gold-bg); }',
    '.prog-track { background:var(--border2); border-radius:99px; height:5px; width:72px; overflow:hidden; margin-bottom:4px; }',
    '.prog-fill { height:100%; border-radius:99px; background:var(--green); }',
    '.lb-rank { font-size:20px; width:32px; text-align:center; flex-shrink:0; }',
    '.lb-score { font-size:var(--fs-md); font-weight:var(--fw-bk); color:var(--green); }',
    '.lb-score-lbl { font-size:var(--fs-xs); color:var(--txt3); font-weight:400; }',
    '.empty-state { text-align:center; padding:var(--sp-6); color:var(--txt3); font-size:var(--fs-sm); }',
    '.pg-wrap { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-3) var(--sp-4); border-top:1px solid var(--border); flex-wrap:wrap; gap:var(--sp-2); }',
    '.pg-info { font-size:var(--fs-xs); color:var(--txt3); display:flex; align-items:center; gap:var(--sp-2); }',
    '.pg-btns { display:flex; gap:4px; }',
    '.pg-btn { min-width:30px; height:30px; padding:0 var(--sp-1); border-radius:var(--r-sm); border:1px solid var(--border2); background:var(--surface2); color:var(--txt2); font-size:var(--fs-xs); font-weight:var(--fw-b); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }',
    '.pg-btn:hover:not(:disabled) { background:var(--accent); color:#fff; border-color:var(--accent); }',
    '.pg-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }',
    '.pg-btn:disabled { opacity:.35; cursor:default; }',
    '.pg-size-sel { padding:3px var(--sp-2); background:var(--surface2); border:1px solid var(--border2); border-radius:var(--r-sm); color:var(--txt2); font-size:var(--fs-xs); outline:none; cursor:pointer; }',
    '.filter-summary { font-size:var(--fs-xs); color:var(--txt3); padding:var(--sp-2) var(--sp-4); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:var(--sp-2); }',
    '.filter-badge { display:inline-flex; align-items:center; gap:4px; background:var(--green-bg); color:var(--green); padding:2px var(--sp-2); border-radius:var(--r-sm); font-size:var(--fs-xs); font-weight:var(--fw-b); }',
    '.modal-overlay { display:none; position:fixed; inset:0; z-index:300; background:rgba(0,0,0,.82); backdrop-filter:blur(6px); align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto; }',
    '.modal-overlay.open { display:flex; }',
    '.modal-box { background:#0a0f0c; border:1px solid rgba(201,168,76,0.18); border-radius:var(--r-xl); padding:16px 16px 18px; max-width:540px; width:100%; text-align:center; animation:modalIn .25s ease; position:relative; margin:auto; }',
    '@keyframes modalIn { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }',
    '.modal-close { position:absolute; top:12px; right:12px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; color:rgba(255,255,255,.5); z-index:10; }',
    '.modal-close:hover { background:rgba(255,255,255,.1); color:rgba(255,255,255,.8); }',
    '.modal-qr-wrap { border-radius:18px; overflow:hidden; margin-bottom:14px; background:#060B08; }',
    '.modal-qr-wrap iframe { display:block; width:100%; height:0; border:none; transition:height .35s cubic-bezier(.4,0,.2,1), opacity .3s ease; opacity:0; }',
    /* loader: in-flow, bukan absolute — pasti muncul */
    '.qr-loader { width:100%; height:400px; background:#060B08; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:0; border-radius:18px; }',
    '.qr-loader.done { display:none; }',
    '.qr-lbar { width:100%; height:3px; background:rgba(201,168,76,.12); overflow:hidden; position:relative; border-radius:0 0 18px 18px; }',
    '.qr-lbar::after { content:""; position:absolute; top:0; left:-50%; width:50%; height:100%; background:linear-gradient(90deg,transparent,#C9A84C 40%,#2DB56D 60%,transparent); animation:lbarRun 1.3s ease-in-out infinite; }',
    '@keyframes lbarRun { 0%{left:-50%} 100%{left:110%} }',
    '.modal-name { font-size:var(--fs-lg); font-weight:var(--fw-bk); color:var(--txt); margin-bottom:4px; }',
    '.modal-kode { font-family:monospace; font-size:var(--fs-sm); color:var(--green); margin-bottom:var(--sp-4); }',
    '.modal-btns { display:flex; gap:var(--sp-2); justify-content:center; flex-wrap:wrap; }',
    '.modal-btn { display:inline-flex; align-items:center; gap:5px; padding:var(--sp-2) var(--sp-4); border-radius:var(--r-md); font-size:var(--fs-sm); font-weight:var(--fw-b); text-decoration:none; cursor:pointer; border:none; }',
    '.modal-btn-dl   { background:var(--green); color:#fff; }',
    '.modal-btn-copy { background:var(--accent); color:#fff; }',
    '.modal-btn-wa   { background:#25d366; color:#fff; }',
    '.toast { position:fixed; bottom:var(--sp-5); left:50%; transform:translateX(-50%); background:var(--green-bg); color:var(--green); border:1px solid rgba(34,197,94,.3); border-radius:var(--r-md); padding:var(--sp-2) var(--sp-5); font-size:var(--fs-sm); font-weight:var(--fw-b); display:none; z-index:200; white-space:nowrap; pointer-events:none; }',

    // ── Keuangan mini card ────────────────────────────────────
    '.mini-fin-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px 16px; margin-bottom:var(--sp-4); }',
    '.mini-fin-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }',
    '.mini-fin-title { font-size:var(--fs-sm); font-weight:var(--fw-bk); color:var(--txt); }',
    '.mini-fin-link { font-size:var(--fs-xs); color:var(--accent); text-decoration:none; }',
    '.mini-fin-link:hover { text-decoration:underline; }',
    '.mini-fin-body { display:flex; align-items:stretch; gap:0; }',
    '.mini-fin-item { flex:1; min-width:0; padding:0 12px; text-align:center; }',
    '.mini-fin-item:first-child { padding-left:0; }',
    '.mini-fin-item:last-child { padding-right:0; }',
    '.mini-fin-lbl { font-size:var(--fs-xs); color:var(--txt3); margin-bottom:4px; white-space:nowrap; }',
    '.mini-fin-val { font-size:var(--fs-sm); font-weight:var(--fw-bk); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.mini-fin-divider { width:1px; background:var(--border); flex-shrink:0; }',

    // ── Trend chart card ──────────────────────────────────────
    '.trend-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px 16px; margin-bottom:var(--sp-4); }',
    '.trend-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }',
    '.trend-title { font-size:var(--fs-sm); font-weight:var(--fw-bk); color:var(--txt); margin-bottom:2px; }',
    '.trend-sub { font-size:var(--fs-xs); color:var(--txt3); }',
    '.trend-bars { display:flex; gap:4px; align-items:flex-end; }',
    '.chart-title-dot { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 6px rgba(58,125,44,.5); flex-shrink:0; }',
    '.date-range-row { display:flex; align-items:center; gap:6px; background:var(--surface2); border:1px solid var(--border2); border-radius:9px; padding:6px 10px; flex-shrink:0; }',
    '.date-inp { border:none; background:transparent; font-size:12px; font-family:monospace; color:var(--txt); outline:none; width:100px; }',
    '.date-apply-btn { display:flex; align-items:center; gap:4px; padding:4px 10px; background:var(--green); border:none; border-radius:6px; font-size:11px; font-weight:600; font-family:var(--ff); color:#fff; cursor:pointer; white-space:nowrap; }',
    '.date-apply-btn:hover { opacity:.85; }',
    '.period-toggle { display:flex; gap:2px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:3px; margin-bottom:14px; width:fit-content; }',
    '.period-btn { padding:5px 12px; border-radius:6px; font-size:11px; font-weight:500; color:var(--txt3); cursor:pointer; border:none; background:transparent; font-family:var(--ff); }',
    '.period-btn:hover { color:var(--txt); }',
    '.period-btn.active { background:var(--surface); color:var(--green); font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.08); }',
    '.chart-tooltip-box { position:absolute; background:#0f2010; color:#fff; border-radius:8px; padding:8px 12px; font-size:12px; pointer-events:none; display:none; z-index:10; white-space:nowrap; box-shadow:0 4px 16px rgba(0,0,0,.3); }',
    '.chart-tooltip-box::after { content:""; position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); border-left:5px solid transparent; border-right:5px solid transparent; border-top:5px solid #0f2010; }',
    '.cstat-grid { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--border); }',
    '.cstat-item { padding:13px 16px; border-right:1px solid var(--border); }',
    '.cstat-item:last-child { border-right:none; }',
    '.cstat-lbl { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--txt3); margin-bottom:6px; display:flex; align-items:center; gap:5px; }',
    '.cstat-val { font-size:17px; font-weight:600; color:var(--txt); line-height:1; margin-bottom:3px; }',
    '.cstat-sub { font-size:11px; color:var(--txt3); }',
    '.cstat-badge { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:600; padding:2px 7px; border-radius:20px; margin-top:4px; }',
    '.cbadge-neu { background:var(--surface2); color:var(--txt3); }',
    '.heatmap-sec { padding:12px 16px; border-bottom:1px solid var(--border); }',
    '.hm-title { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--txt3); margin-bottom:8px; }',
    '.hm-days-row { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }',
    '.hm-day-lbl { font-size:8px; color:var(--txt3); text-align:center; font-weight:500; }',
    '.hm-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }',
    '.hm-cell { aspect-ratio:1; border-radius:3px; background:var(--border); cursor:pointer; transition:transform .1s; position:relative; }',
    '.hm-cell:hover { transform:scale(1.2); z-index:1; }',
    '.hm-cell.lv1 { background:#c8e6b4; }',
    '.hm-cell.lv2 { background:#8bc97a; }',
    '.hm-cell.lv3 { background:#3a7d2c; }',
    '.hm-cell.lv4 { background:#255519; box-shadow:0 0 6px rgba(37,85,25,.4); }',
    '.hm-cell.hm-future { background:transparent; border:1px dashed var(--border); opacity:.5; cursor:default; }',
    '.hm-cell.hm-future:hover { transform:none; }',

    // ── Mobile card layout ────────────────────────────────────
    '.mc { background:var(--surface); border:1px solid var(--border); border-radius:14px; margin-bottom:8px; overflow:hidden; transition:border-color .15s; }',
    '.mc.hadir { border-color:rgba(34,197,94,.25); }',
    '.mc-top { display:flex; align-items:center; gap:10px; padding:12px; }',
    '.mc-qr { width:58px; height:58px; border-radius:10px; background:#fff; padding:3px; cursor:pointer; flex-shrink:0; object-fit:cover; transition:transform .15s; touch-action:manipulation; }',
    '.mc-qr:active { transform:scale(.95); }',
    '.mc-body { flex:1; min-width:0; }',
    '.mc-name { font-size:15px; font-weight:600; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.mc-kode { font-size:11px; color:var(--green); font-family:monospace; letter-spacing:.05em; margin-top:1px; }',
    '.mc-prog { display:flex; align-items:center; gap:6px; margin-top:6px; }',
    '.mc-prog-track { flex:1; height:5px; background:var(--border2); border-radius:99px; overflow:hidden; }',
    '.mc-prog-fill { height:100%; border-radius:99px; background:var(--green); }',
    '.mc-prog-txt { font-size:10px; color:var(--txt3); white-space:nowrap; flex-shrink:0; }',
    '.mc-badges { display:flex; gap:4px; flex-wrap:wrap; margin-top:5px; }',
    '.mc-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }',
    '.mc-btm { display:flex; gap:6px; padding:8px 12px; border-top:1px solid var(--border); background:var(--surface2); flex-wrap:wrap; }',
    '.mc-btn { display:inline-flex; align-items:center; gap:4px; padding:7px 13px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--border2); background:var(--surface); color:var(--txt2); text-decoration:none; white-space:nowrap; touch-action:manipulation; }',
    '.mc-btn:active { opacity:.75; }',
    '.mc-btn-qr   { background:var(--green-bg); color:var(--green); border-color:rgba(34,197,94,.3); }',
    '.mc-btn-wa   { background:#25d366; color:#fff; border-color:#25d366; }',
    '.mc-btn-gold { color:var(--gold); border-color:rgba(245,158,11,.3); background:var(--gold-bg); }',
    '.mc-btn-red  { color:var(--red); border-color:rgba(239,68,68,.25); background:var(--red-bg); }',
    '.mc-empty { text-align:center; padding:32px 16px; color:var(--txt3); font-size:13px; }',

    // ── Responsive ────────────────────────────────────────────
    '@media (min-width:641px) { #mobile-list { display:none !important; } }',
    '@media (max-width:640px) {',
    '  .table-wrap { display:none; }',
    '  .pg-wrap { display:none; }',
    '  .topbar-label { display:none; }',
    '  .topbar { padding:8px 12px; }',
    '  .page { padding:10px; padding-bottom:90px; }',
    '  .stats { grid-template-columns:repeat(2,1fr); gap:6px; }',
    '  .stat-card { padding:10px 12px; }',
    '  .stat-num { font-size:22px; }',
    '  .tabs-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }',
    '  .tab-btn { padding:10px 6px; font-size:11px; min-width:74px; }',
    '  .filter-bar { flex-direction:column; gap:6px; }',
    '  .search-wrap { min-width:unset; width:100%; }',
    '  .search-input { width:100%; }',
    '  .sel { width:100%; }',
    '  .filter-bar .sel:last-child { display:none; }',
    '  .sec-label { margin-top:12px; }',
    '  .sidebar { display:none; }',
    '  .bottom-nav { display:flex; }',
    '  .mini-fin-item { padding:0 6px; }',
    '  .mini-fin-val { font-size:10px; }',
    '  .mini-fin-lbl { font-size:9px; }',
    '  .trend-card { padding:12px; }',
    '  .dash-topbar { flex-direction:column; gap:10px; align-items:stretch !important; }',
    '  .topbar-actions { width:100%; justify-content:flex-start; flex-wrap:wrap; gap:8px; }',
    '  .topbar-actions > * { flex:1 1 calc(50% - 4px); min-width:0; }',
    /* ── Dashboard Owner — admin dashboard chart card mobile ──── */
    '  .content-grid { grid-template-columns:1fr !important; gap:12px !important; }',
    '  .bottom-grid { grid-template-columns:1fr !important; gap:12px !important; }',
    /* cstat-grid: 4 → 2 cols, padding lebih kecil */
    '  .cstat-grid { grid-template-columns:repeat(2,1fr) !important; }',
    '  .cstat-item { padding:12px 14px !important; }',
    '  .cstat-val { font-size:18px !important; }',
    '  .cstat-lbl { font-size:10.5px !important; }',
    /* Chart period toggle wrap & full-width */
    '  .chart-period-toggle { width:100% !important; display:grid !important; grid-template-columns:repeat(4,1fr); gap:3px !important; }',
    '  .chart-period-btn { font-size:11px !important; padding:8px 4px !important; }',
    /* Date range row → full width stack */
    '  .date-range-row { flex-wrap:wrap; width:100%; padding:8px 10px; }',
    '  .date-range-row .date-inp2 { flex:1 1 calc(50% - 8px); min-width:0; }',
    '  .date-apply-btn { flex:1 1 100%; justify-content:center; padding:8px !important; }',
    /* Chart card section title row wrap */
    '  .card { border-radius:12px; }',
    /* Heatmap days/cells lebih kompak */
    '  .hm-cell { font-size:10px !important; }',
    /* Card header lebih compact */
    '  .card-header { padding:14px 16px !important; }',
    '  .card-title { font-size:14px !important; }',
    /* Mini financial bar */
    '  .summary-bar { padding:14px 16px !important; gap:8px !important; }',
    '  .summary-bar > * { min-width:0; }',
    /* Toolbar period bar (di /admin/members) */
    '  .toolbar-card { padding:12px !important; }',
    '}',
    /* iPhone SE & smaller */
    '@media (max-width:400px) {',
    '  .stats { grid-template-columns:repeat(2,1fr); }',
    '  .cstat-grid { grid-template-columns:1fr !important; }',
    '  .stat-num { font-size:20px; }',
    '  .topbar-actions > * { flex:1 1 100%; }',
    '}',
    '@media (min-width:641px) {',
    '  .topbar { display:none; }',
    '}',
  ].join('');
}

// ── Topbar profile pill (mobile) — sama style dgn finance topbar ───────────
function buildAdminTopbarProfile(user = {}) {
  const isOwner = user.role === 'owner';
  const fallback = isOwner ? 'Owner' : 'Partner';
  const name = (user.displayName || '').trim() || fallback;
  const ini  = initials(user.displayName) || (isOwner ? 'OW' : 'PR');
  const bg   = isOwner ? 'rgba(45,102,36,.18)' : 'rgba(30,64,175,.15)';
  const fg   = isOwner ? '#22c55e' : '#60a5fa';
  const roleLbl = isOwner ? 'Owner' : 'Partner';

  return '<div class="topbar-profile" title="' + name + ' · ' + roleLbl + '">'
    + '<div class="tb-avatar" style="background:' + bg + ';color:' + fg + '">' + ini + '</div>'
    + '<div class="tb-prof-info">'
    +   '<div class="tb-prof-name">' + name + '</div>'
    +   '<div class="tb-prof-role">' + roleLbl + '</div>'
    + '</div>'
    + '</div>';
}

// ── buildSidebar — shared sidebar HTML (revamp v2) ──────────────────────────
function buildSidebar(token, activePage, user = {}) {
  const dashCls    = 'nav-item' + (activePage === 'dashboard' ? ' active' : '');
  const membersCls = 'nav-item' + (activePage === 'members'   ? ' active' : '');
  // Persist token onclick (untuk navigate ke /operasional yg gak butuh tk param)
  const tkOnclick  = 'try{localStorage.setItem(\'warpat_atk\',\'' + token + '\');}catch(_){}';

  // Profile — pakai displayName user yg login, fallback ke role label
  const isOwner       = user.role === 'owner';
  const fallbackName  = isOwner ? 'Owner' : 'Partner';
  const profileName   = (user.displayName || '').trim() || fallbackName;
  const profileRole   = isOwner ? 'Owner' : 'Partner';
  const profileAvatar = initials(user.displayName) || (isOwner ? 'OW' : 'PR');
  const avatarBg      = isOwner ? 'rgba(45,102,36,.18)' : 'rgba(30,64,175,.15)';
  const avatarFg      = isOwner ? '#22c55e' : '#60a5fa';

  return '<aside class="sidebar">'
    // ── Logo ───────────────────────────────────────
    + '<div class="logo-area">'
    + '<div class="logo-row">'
    + '<div class="logo-mark"><i class="ti ti-circle-number-8"></i><div class="logo-online"></div></div>'
    + '<div class="logo-text">'
    + '<div class="logo-name">' + CONFIG.NAMA_ARENA + '</div>'
    + '<div class="logo-sub">Admin Panel</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="sidebar-divider"></div>'

    // ── Nav scroll ─────────────────────────────────
    + '<div class="nav-scroll">'

    // GROUP: UTAMA
    + '<div class="nav-group">'
    + '<div class="nav-group-label">Utama</div>'
    + '<a href="/admin?tk=' + token + '" class="' + dashCls + '">'
    + '<div class="nav-item-icon"><i class="ti ti-layout-dashboard"></i></div>'
    + '<span class="nav-item-text">Dashboard</span>'
    + '</a>'
    + '<a href="/admin/members?tk=' + token + '" class="' + membersCls + '">'
    + '<div class="nav-item-icon"><i class="ti ti-users"></i></div>'
    + '<span class="nav-item-text">Kelola Member</span>'
    + '</a>'
    + '</div>'

    // GROUP: OPERASIONAL (expandable submenu)
    + '<div class="nav-group">'
    + '<div class="nav-group-label">Operasional</div>'
    + '<div class="nav-item" onclick="toggleSubmenu(\'ops\', this)">'
    + '<div class="nav-item-icon"><i class="ti ti-briefcase"></i></div>'
    + '<span class="nav-item-text">Operasional</span>'
    + '<i class="ti ti-chevron-down nav-chevron"></i>'
    + '</div>'
    + '<div class="submenu-wrap">'
    + '<div class="submenu" id="sub-ops">'
    + '<a href="/operasional" class="submenu-item" onclick="' + tkOnclick + '">'
    + '<div class="sub-dot"></div>Dashboard Keuangan</a>'
    + (isOwner
      ? '<a href="/operasional/analisis" class="submenu-item" onclick="' + tkOnclick + '">'
        + '<div class="sub-dot"></div>Analisis Target</a>'
        + '<a href="/operasional/kategori" class="submenu-item" onclick="' + tkOnclick + '">'
        + '<div class="sub-dot"></div>Kelola Kategori</a>'
        + '<a href="/operasional/menu" class="submenu-item" onclick="' + tkOnclick + '">'
        + '<div class="sub-dot"></div>Kelola Menu</a>'
        + '<a href="/operasional/sdm" class="submenu-item" onclick="' + tkOnclick + '">'
        + '<div class="sub-dot"></div>SDM &amp; Penggajian</a>'
        + '<a href="/operasional/monitoring/aktivitas" class="submenu-item" onclick="' + tkOnclick + '">'
        + '<div class="sub-dot"></div>Monitoring Karyawan</a>'
      : '')
    + '</div>'
    + '</div>'
    + '</div>'

    + '</div>'

    // ── Quick Actions ──────────────────────────────
    + '<div class="sidebar-divider"></div>'
    + '<div class="quick-actions">'
    + '<div class="nav-group-label" style="padding-bottom:8px">Aksi Cepat</div>'
    + '<div class="qa-grid">'
    + '<a href="/scan" class="qa-btn"><i class="ti ti-qrcode"></i>Scan Member</a>'
    + '<a href="/operasional" class="qa-btn" onclick="' + tkOnclick + '"><i class="ti ti-plus"></i>Transaksi</a>'
    + '<button class="qa-btn danger" onclick="adminLogout()"><i class="ti ti-logout"></i>Keluar</button>'
    + '</div>'
    + '</div>'

    // ── Profile ────────────────────────────────────
    + '<div class="sidebar-bottom">'
    + '<div class="profile-card">'
    + '<div class="profile-avatar" style="background:' + avatarBg + ';color:' + avatarFg + '">' + profileAvatar + '</div>'
    + '<div class="profile-info">'
    + '<div class="profile-name">' + profileName + '</div>'
    + '<div class="profile-role">' + profileRole + '</div>'
    + '</div>'
    + '<div class="profile-actions">'
    + '<button class="profile-btn danger" title="Logout" onclick="adminLogout()"><i class="ti ti-logout"></i></button>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '</aside>'
    + '<script>'
    + 'function toggleSubmenu(id,el){'
    + 'var sub=document.getElementById("sub-"+id);'
    + 'var open=sub.classList.contains("open");'
    + 'sub.classList.toggle("open",!open);'
    + 'el.classList.toggle("open",!open);}'
    + 'function adminLogout(){'
    + 'if(!confirm("Keluar dari sesi admin?"))return;'
    + 'try{localStorage.removeItem("warpat_atk")}catch(_){};'
    + 'window.location.href="/admin";}'
    + '</script>';
}

// ── buildBottomNav — shared bottom nav HTML (revamp v2) ─────────────────────
function buildBottomNav(token, activePage, user = {}) {
  const dashActive    = activePage === 'dashboard' ? ' active' : '';
  const membersActive = activePage === 'members'   ? ' active' : '';
  const opsActive     = activePage === 'operasional' ? ' active' : '';
  const tkOnclick     = 'try{localStorage.setItem(\'warpat_atk\',\'' + token + '\');}catch(_){}';
  const isOwner       = user.role === 'owner';

  return '<nav class="bottom-nav">'
    + '<a href="/admin?tk=' + token + '" class="bn-item' + dashActive + '">'
    + '<span class="bn-icon"><i class="ti ti-layout-dashboard"></i></span>Home'
    + '</a>'
    + '<a href="/admin/members?tk=' + token + '" class="bn-item' + membersActive + '">'
    + '<span class="bn-icon"><i class="ti ti-users"></i></span>Member'
    + '</a>'
    + '<button type="button" class="bn-item' + opsActive + '" onclick="' + tkOnclick + ';openBnSheet()">'
    + '<span class="bn-icon"><i class="ti ti-briefcase"></i></span>Operasional'
    + '</button>'
    + '<a href="/scan" class="bn-item">'
    + '<span class="bn-icon"><i class="ti ti-qrcode"></i></span>Scan'
    + '</a>'
    + '</nav>'

    // ── Bottom sheet sub-menu Operasional ──────────────────────
    + '<div class="bn-sheet-overlay" id="bnSheetOv" onclick="closeBnSheet()"></div>'
    + '<div class="bn-sheet" id="bnSheet" role="dialog" aria-label="Sub-menu Operasional">'
    + '<div class="bn-sheet-handle"></div>'
    + '<div class="bn-sheet-title">Operasional</div>'
    + '<a href="/operasional" class="bn-sheet-item">'
    + '<div class="bn-sheet-icon"><i class="ti ti-wallet"></i></div>'
    + '<div><div class="bn-sheet-name">Dashboard Keuangan</div>'
    + '<div class="bn-sheet-sub">Pemasukan, pengeluaran &amp; saldo</div></div>'
    + '</a>'
    + (isOwner
      ? '<a href="/operasional/analisis" class="bn-sheet-item">'
        + '<div class="bn-sheet-icon" style="background:rgba(168,85,247,.12);color:#a855f7"><i class="ti ti-target"></i></div>'
        + '<div><div class="bn-sheet-name">Analisis Target</div>'
        + '<div class="bn-sheet-sub">Target hari/minggu/bulan &amp; simulasi karyawan</div></div>'
        + '</a>'
        + '<a href="/operasional/kategori" class="bn-sheet-item">'
        + '<div class="bn-sheet-icon"><i class="ti ti-tag"></i></div>'
        + '<div><div class="bn-sheet-name">Kelola Kategori</div>'
        + '<div class="bn-sheet-sub">Atur kategori pemasukan &amp; pengeluaran</div></div>'
        + '</a>'
        + '<a href="/operasional/menu" class="bn-sheet-item">'
        + '<div class="bn-sheet-icon"><i class="ti ti-coffee"></i></div>'
        + '<div><div class="bn-sheet-name">Kelola Menu</div>'
        + '<div class="bn-sheet-sub">Kopi, snack, rokok &amp; topping</div></div>'
        + '</a>'
        + '<a href="/operasional/sdm" class="bn-sheet-item">'
        + '<div class="bn-sheet-icon"><i class="ti ti-users"></i></div>'
        + '<div><div class="bn-sheet-name">SDM &amp; Penggajian</div>'
        + '<div class="bn-sheet-sub">Karyawan, gaji, kasbon &amp; THR</div></div>'
        + '</a>'
        + '<a href="/operasional/monitoring/aktivitas" class="bn-sheet-item">'
        + '<div class="bn-sheet-icon"><i class="ti ti-chart-bar"></i></div>'
        + '<div><div class="bn-sheet-name">Monitoring Karyawan</div>'
        + '<div class="bn-sheet-sub">Aktivitas, setoran shift &amp; selisih kas</div></div>'
        + '</a>'
      : '')
    + '</div>'

    + '<script>'
    + 'function openBnSheet(){'
    + 'document.getElementById("bnSheet").classList.add("open");'
    + 'document.getElementById("bnSheetOv").classList.add("open");}'
    + 'function closeBnSheet(){'
    + 'document.getElementById("bnSheet").classList.remove("open");'
    + 'document.getElementById("bnSheetOv").classList.remove("open");}'
    + '</script>';
}

// ── buildModal — shared modal overlay HTML ────────────────────────────────────
function buildModal() {
  return '<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this){closeModal()}">'
    + '<div class="modal-box"><button class="modal-close" onclick="closeModal()">✕</button>'
    + '<div class="modal-qr-wrap">'
    + '<div id="modalLoader" class="qr-loader"><div class="qr-lbar"></div></div>'
    + '<iframe id="modalFrame" src="" title="Kartu Member" scrolling="no"></iframe>'
    + '</div>'
    + '<div class="modal-name" id="modalName"></div>'
    + '<div class="modal-kode" id="modalKode"></div>'
    + '<div class="modal-btns">'
    + '<a id="modalDl" class="modal-btn modal-btn-dl" download>⬇ Download</a>'
    + '<button class="modal-btn modal-btn-copy" onclick="copyModal()">Copy URL</button>'
    + '<a id="modalWa" class="modal-btn modal-btn-wa" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp" style="pointer-events:none;font-size:16px"></i> WhatsApp</a>'
    + '</div></div></div>';
}

export function adminDashboard({ db, log, transaksi = [], token, req, user = {} }) {
  const { members } = db;

  const nowWib   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const curBulan = nowWib.getFullYear() + '-' + String(nowWib.getMonth() + 1).padStart(2, '0');

  // Operational day = periode 24h dimulai jam 2 pagi WIB.
  // Aktivitas antara 00:00-02:00 dihitung sebagai hari sebelumnya.
  const opDay = (date) => {
    const w = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    if (w.getHours() < 2) w.setDate(w.getDate() - 1);
    return w.getFullYear() + '-' + String(w.getMonth() + 1).padStart(2, '0') + '-' + String(w.getDate()).padStart(2, '0');
  };
  const todayOp = opDay(new Date());

  const stats = {
    total:    members.length,
    // Reset otomatis jam 2 pagi: hitung member dengan scan dalam operational day ini
    scan:     members.filter((m) => m.tanggalScanTerakhir && opDay(m.tanggalScanTerakhir) === todayOp).length,
    reward:   members.filter((m) => m.status === 'GRATIS').length,
    aktif:    members.filter((m) => m.totalMain > 0).length,
    // Reset otomatis jam 2 pagi: hitung member yang daftar dalam operational day ini
    bariBaru: members.filter((m) => m.tanggalDaftar && opDay(m.tanggalDaftar) === todayOp).length,
  };

  const hostBase  = req.protocol + '://' + req.get('host');

  // Data JSON untuk JS client — pakai operational day (sejak jam 2 pagi)
  const dataScan = members
    .filter((m) => m.tanggalScanTerakhir && opDay(m.tanggalScanTerakhir) === todayOp)
    .sort((a, b) => new Date(b.tanggalScanTerakhir) - new Date(a.tanggalScanTerakhir))
    .map(({ nama, kode, tanggalScanTerakhir }) => ({
      nama, kode,
      jam: new Date(tanggalScanTerakhir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }),
    }));

  const dataLb = [...members]
    .map((m) => ({
      nama: m.nama, kode: m.kode,
      total:  (m.totalMain ?? 0) + (m.totalGratis ?? 0) * CONFIG.BATAS_MAIN,
      reward: m.totalGratis ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  const dataLog = log.map(({ kode, nama, aksi, detail, ts }) => ({
    kode, nama, aksi, detail: detail ?? '',
    tgl: new Date(ts).toLocaleString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
    }),
  }));

  const now = new Date().toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });

  // ── Ringkasan keuangan ────────────────────────────────────────
  const todayStr    = curBulan + '-' + String(nowWib.getDate()).padStart(2, '0');
  const trxBulan    = transaksi.filter((t) => (t.tanggal ?? '').startsWith(curBulan));
  const pemasukanBulan   = trxBulan.filter((t) => t.jenis === 'pemasukan').reduce((s, t) => s + (t.jumlah ?? 0), 0);
  const pengeluaranBulan = trxBulan.filter((t) => t.jenis === 'pengeluaran').reduce((s, t) => s + (t.jumlah ?? 0), 0);
  const saldoBulan       = pemasukanBulan - pengeluaranBulan;
  const trxHariIni       = transaksi.filter((t) => t.tanggal === todayStr);
  const pemasukanHariIni = trxHariIni.filter((t) => t.jenis === 'pemasukan').reduce((s, t) => s + (t.jumlah ?? 0), 0);

  // ── Trend kunjungan 30 hari ───────────────────────────────────
  const trendDays = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nowWib);
    d.setDate(d.getDate() - i);
    const ymd = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
    const lbl = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    const isToday = (i === 0);
    const count = log.filter((l) => {
      if (l.aksi !== 'SCAN') return false;
      const ld = new Date(new Date(l.ts).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const lymd = ld.getFullYear() + '-'
        + String(ld.getMonth() + 1).padStart(2, '0') + '-'
        + String(ld.getDate()).padStart(2, '0');
      return lymd === ymd;
    }).length;
    trendDays.push({ ymd, lbl, count, isToday });
  }
  const maxCount = Math.max(...trendDays.map((d) => d.count), 1);

  // Build trend bar chart HTML (pure CSS)
  const trendBars = trendDays.map(function(d) {
    const pct     = Math.round((d.count / maxCount) * 100);
    const barH    = Math.max(pct, d.count > 0 ? 4 : 0);
    const color   = d.isToday ? 'var(--accent)' : 'var(--green)';
    const opacity = d.isToday ? '1' : '0.6';
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0">'
      + '<div style="font-size:10px;font-weight:700;color:' + (d.count > 0 ? 'var(--txt2)' : 'var(--txt3)') + '">'
      + (d.count > 0 ? d.count : '') + '</div>'
      + '<div style="width:100%;display:flex;align-items:flex-end;height:56px">'
      + '<div style="width:100%;height:' + barH + '%;background:' + color + ';opacity:' + opacity + ';'
      + 'border-radius:4px 4px 0 0;transition:height .3s;min-height:' + (d.count > 0 ? '3px' : '0') + '">'
      + '</div>'
      + '</div>'
      + '<div style="font-size:9px;color:' + (d.isToday ? 'var(--accent)' : 'var(--txt3)') + ';'
      + 'font-weight:' + (d.isToday ? '700' : '400') + ';text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">'
      + d.lbl + '</div>'
      + '</div>';
  }).join('');

  // ── Helpers ───────────────────────────────────────────────────
  const bulanLabel = nowWib.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const rpS = (n) => {
    const a = Math.abs(Math.round(n || 0));
    return a >= 1e6 ? 'Rp ' + (a / 1e6).toFixed(1) + 'jt'
      : a >= 1e3   ? 'Rp ' + (a / 1e3).toFixed(0)  + 'rb'
      : 'Rp ' + a;
  };

  // ── Chart data ───────────────────────────────────────────────
  const allChartLabels = JSON.stringify(trendDays.map((d) => d.lbl));
  const allChartData   = JSON.stringify(trendDays.map((d) => d.count));
  // Heatmap 28 hari — aligned ke kolom hari (Min Sen Sel Rab Kam Jum Sab)
  // Grid 4 baris × 7 kolom. Kolom 0 = Minggu. Today harus tepat di kolom
  // yg sesuai weekday hari ini (mis. Sen=col1). Untuk itu kita mulai dari
  // hari Minggu 3 minggu lalu (current Sunday - 21), dan cell future (>today)
  // di-set null biar JS render-nya dim/empty.
  const todayWibDay = nowWib.getDay();          // 0=Min, 1=Sen, ..., 6=Sab
  const startSunday = new Date(nowWib);
  startSunday.setDate(startSunday.getDate() - todayWibDay - 21);  // Minggu 3 minggu lalu
  const heatmap28 = [];
  for (let i = 0; i < 28; i++) {
    const hd = new Date(startSunday);
    hd.setDate(hd.getDate() + i);
    // Cell future (setelah hari ini) → null, biar UI tampil dim/kosong
    if (hd.getTime() > nowWib.getTime()) {
      heatmap28.push(null);
      continue;
    }
    const hymd = hd.getFullYear() + '-'
      + String(hd.getMonth() + 1).padStart(2, '0') + '-'
      + String(hd.getDate()).padStart(2, '0');
    // Count SCAN aja — konsisten dgn trend chart "Trend Kunjungan" di atas.
    const hcnt = log.filter((l) => {
      if (l.aksi !== 'SCAN') return false;
      const ld = new Date(new Date(l.ts).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const lymd = ld.getFullYear() + '-'
        + String(ld.getMonth() + 1).padStart(2, '0') + '-'
        + String(ld.getDate()).padStart(2, '0');
      return lymd === hymd;
    }).length;
    heatmap28.push(hcnt);
  }
  const heatmapJson = JSON.stringify(heatmap28);
  // default view: 7 hari
  const trend7 = trendDays.slice(-7);
  const totalScan7 = trend7.reduce((s, d) => s + d.count, 0);
  const bestDayObj = trend7.reduce((b, d) => (d.count > b.count ? d : b), trend7[0]);
  const bestDayLbl = (bestDayObj && bestDayObj.count > 0) ? bestDayObj.lbl : '—';
  const avgVisit   = totalScan7 > 0 ? (totalScan7 / 7).toFixed(1) : '0';

  // ── Member list card HTML ─────────────────────────────────────
  const initials = (s) => {
    const w = (s || '').trim().split(/\s+/).slice(0, 2);
    return w.map((x) => (x[0] || '').toUpperCase()).join('');
  };
  const topMembers = [...members].sort((a, b) => (b.totalMain || 0) - (a.totalMain || 0)).slice(0, 5);
  const topMembersHtml = topMembers.length
    ? topMembers.map(function(m) {
        const isVip = (m.totalMain || 0) >= CONFIG.BATAS_MAIN;
        const since = m.tanggalDaftar
          ? 'Sejak ' + new Date(m.tanggalDaftar).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
          : 'Member';
        return '<div class="member-item">'
          + '<div class="m-avatar">' + initials(m.nama) + '</div>'
          + '<div class="m-info">'
          + '<div class="m-name">' + m.nama + '</div>'
          + '<div class="m-since">' + since + '</div>'
          + '</div>'
          + '<div class="m-badge' + (isVip ? ' vip' : '') + '">' + (isVip ? 'VIP' : 'Regular') + '</div>'
          + '</div>';
      }).join('')
    : '<div class="empty-state"><i class="ti ti-users"></i>Belum ada member</div>';

  // ── Finance rows card HTML (revamp v3) ─────────────────────────
  // Mapping kategori -> icon + warna box (matching mockup)
  const finIcon = (t) => {
    const cat = (t.kategori || '').toLowerCase();
    const ket = (t.keterangan || '').toLowerCase();
    if (cat.includes('sewa') || ket.includes('meja')) return { cls: 'green', icon: 'ti-armchair' };
    if (cat.includes('makan') || cat.includes('minum') || cat.includes('kopi') || ket.includes('kopi') || ket.includes('mie')) return { cls: 'amber', icon: 'ti-coffee' };
    if (cat.includes('rokok')) return { cls: 'amber', icon: 'ti-cigarette' };
    if (cat.includes('turnamen')) return { cls: 'blue', icon: 'ti-trophy' };
    if (t.jenis === 'pengeluaran') return { cls: 'red', icon: 'ti-arrow-down-circle' };
    return { cls: 'green', icon: 'ti-receipt' };
  };
  const recentTrx = transaksi.filter((t) => !t.voidedAt).slice(-5).reverse();
  const recentTrxHtml = recentTrx.length
    ? recentTrx.map(function(t) {
        const isIn = t.jenis === 'pemasukan';
        const ic = finIcon(t);
        const label = t.keterangan || t.kategori || (isIn ? 'Pemasukan' : 'Pengeluaran');
        const dateTxt = (t.tanggal || bulanLabel) + (t.jam ? ' · ' + t.jam : '');
        return '<div class="fin-item">'
          + '<div class="fin-ic ' + ic.cls + '"><i class="ti ' + ic.icon + '"></i></div>'
          + '<div class="fin-info">'
          + '<div class="fin-label">' + label + '</div>'
          + '<div class="fin-date">' + dateTxt + '</div>'
          + '</div>'
          + '<div class="fin-amt ' + (isIn ? 'income' : 'expense') + '">'
          + (isIn ? '+' : '−') + rpFmt(t.jumlah)
          + '</div>'
          + '</div>';
      }).join('')
    : '<div class="empty-state" style="padding:32px 0"><i class="ti ti-receipt"></i>Belum ada transaksi</div>';

  const scanPct = stats.total > 0 ? Math.round(stats.scan / stats.total * 100) : 0;

  return '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>Admin — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">'
    + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/admin.css?v=38">'
    + '</head><body>'

    + '<div class="layout">'
    + buildSidebar(token, 'dashboard', user)

    + '<div class="main-wrap">'

    // Mobile topbar (hidden ≥769px via CSS)
    + '<header class="topbar">'
    + '<div class="topbar-brand">'
    + '<div class="sb-brand-icon" style="width:28px;height:28px;font-size:14px;margin-right:6px">'
    + '<i class="ti ti-circle-number-8"></i></div>'
    + '<div><div class="topbar-name">' + CONFIG.NAMA_ARENA + '</div>'
    + '<div class="topbar-label">' + now + '</div></div>'
    + '</div>'
    + '<div class="topbar-right">'
    + buildAdminTopbarProfile(user)
    + '</div></header>'

    + '<div class="page">'

    // ── Desktop topbar ──────────────────────────────────────────
    + '<div class="dash-topbar">'
    + '<div>'
    + '<div class="page-title">Dashboard</div>'
    + '<div class="page-sub">' + now + ' — Ringkasan operasional harian</div>'
    + '</div>'
    + '<div class="topbar-actions">'
    + '<a href="/admin/members?tk=' + token + '" class="btn-outline">'
    + '<i class="ti ti-users" style="font-size:14px"></i> Member</a>'
    + '<a href="/operasional" class="btn-primary"'
    + ' onclick="try{localStorage.setItem(\'warpat_atk\',\'' + token + '\');}catch(_){}"><i class="ti ti-briefcase" style="font-size:14px"></i> Operasional</a>'
    + '</div>'
    + '</div>'

    // ── Stat grid ───────────────────────────────────────────────
    + '<div class="stat-grid" style="grid-template-columns:repeat(5,1fr)">'

    + '<div class="stat-card">'
    + '<div class="stat-label">Total Member'
    + '<div class="stat-icon green"><i class="ti ti-users"></i></div></div>'
    + '<div class="stat-value">' + stats.total + '</div>'
    + '<div class="stat-footer">'
    + '<i class="ti ti-circle-check" style="font-size:12px;color:var(--accent)"></i>&nbsp;Terdaftar aktif'
    + '</div></div>'

    + '<div class="stat-card amber">'
    + '<div class="stat-label">Scan Hari Ini'
    + '<div class="stat-icon amber"><i class="ti ti-scan"></i></div></div>'
    + '<div class="stat-value">' + stats.scan + '</div>'
    + '<div class="stat-footer">dari ' + stats.total + ' member</div></div>'

    + '<div class="stat-card blue">'
    + '<div class="stat-label">Reward Pending'
    + '<div class="stat-icon blue"><i class="ti ti-gift"></i></div></div>'
    + '<div class="stat-value">' + stats.reward + '</div>'
    + '<div class="stat-footer">Menunggu klaim</div></div>'

    + '<div class="stat-card">'
    + '<div class="stat-label">Pendapatan Bulan Ini'
    + '<div class="stat-icon green"><i class="ti ti-trending-up"></i></div></div>'
    + '<div class="stat-value" style="font-size:22px">' + rpFmt(pemasukanBulan) + '</div>'
    + '<div class="stat-footer">' + bulanLabel + '</div></div>'

    + '<div class="stat-card blue">'
    + '<div class="stat-label">Member Baru'
    + '<div class="stat-icon blue"><i class="ti ti-user-plus"></i></div></div>'
    + '<div class="stat-value">' + stats.bariBaru + '</div>'
    + '<div class="stat-footer">Daftar hari ini (sejak 02:00)</div></div>'

    + '</div>'

    // ── Summary bar ─────────────────────────────────────────────
    + '<div class="summary-bar">'
    + '<div><div class="sum-label">Pemasukan ' + bulanLabel + '</div>'
    + '<div class="sum-val green">' + rpFmt(pemasukanBulan) + '</div></div>'
    + '<div class="divider-v"></div>'
    + '<div><div class="sum-label">Pengeluaran</div>'
    + '<div class="sum-val red">' + rpFmt(pengeluaranBulan) + '</div></div>'
    + '<div class="divider-v"></div>'
    + '<div><div class="sum-label">Saldo Bersih</div>'
    + '<div class="sum-val' + (saldoBulan < 0 ? ' red' : '') + '">' + rpFmt(saldoBulan) + '</div></div>'
    + '<div class="divider-v"></div>'
    + '<div><div class="sum-label">Pemasukan Hari Ini</div>'
    + '<div class="sum-val">' + rpFmt(pemasukanHariIni) + '</div></div>'
    + '<a href="/operasional" class="sum-btn"'
    + ' onclick="try{localStorage.setItem(\'warpat_atk\',\'' + token + '\');}catch(_){}"><i class="ti ti-arrow-right" style="font-size:14px"></i> Lihat Detail Keuangan</a>'
    + '</div>'

    // ── Content grid ────────────────────────────────────────────
    + '<div class="content-grid">'

    // Chart card — revamped
    + '<div class="card" style="overflow:visible">'
    + '<div style="padding:18px 20px 0">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap">'
    + '<div>'
    + '<div style="font-size:15px;font-weight:600;color:var(--txt);display:flex;align-items:center;gap:8px;margin-bottom:4px">'
    + '<div class="chart-title-dot"></div>Trend Kunjungan</div>'
    + '<div style="font-size:12px;color:var(--txt3);display:flex;align-items:center;gap:5px">'
    + '<i class="ti ti-calendar-stats" style="font-size:13px"></i>'
    + '<span id="chartSub"></span>'
    + '</div></div>'
    + '<div class="date-range-row">'
    + '<i class="ti ti-calendar" style="font-size:14px;color:var(--txt3)"></i>'
    + '<input class="date-inp2" type="date" id="dateFrom" value="' + trendDays[16].ymd + '">'
    + '<span style="font-size:11px;color:var(--txt3)">—</span>'
    + '<input class="date-inp2" type="date" id="dateTo" value="' + trendDays[29].ymd + '">'
    + '<button class="date-apply-btn" onclick="applyDateRange()">'
    + '<i class="ti ti-check" style="font-size:11px"></i> Terapkan</button>'
    + '</div></div>'
    + '<div class="chart-period-toggle">'
    + '<button class="chart-period-btn" onclick="setPeriod(7,this)">7 Hari</button>'
    + '<button class="chart-period-btn active" onclick="setPeriod(14,this)">14 Hari</button>'
    + '<button class="chart-period-btn" onclick="setPeriod(30,this)">30 Hari</button>'
    + '<button class="chart-period-btn" onclick="setPeriod(0,this)">Custom</button>'
    + '</div>'
    + '</div>'
    + '<div style="position:relative;padding:4px 20px 14px;height:240px">'
    + '<canvas id="trendChart" role="img"></canvas>'
    + '<div class="chart-tooltip-box" id="chartTooltip">'
    + '<div style="font-size:10px;color:rgba(255,255,255,.5);margin-bottom:3px" id="ttDate"></div>'
    + '<div style="font-weight:600;color:#7dcf6a" id="ttVal"></div>'
    + '</div></div>'
    + '<div class="cstat-grid">'
    + '<div class="cstat-item"><div class="cstat-lbl"><i class="ti ti-trophy" style="color:#c47f1a"></i> Hari Terbaik</div>'
    + '<div class="cstat-val" id="metaBest">' + bestDayLbl + '</div>'
    + '<div class="cstat-sub">kunjungan terbanyak</div></div>'
    + '<div class="cstat-item"><div class="cstat-lbl"><i class="ti ti-chart-bar" style="color:#2660a4"></i> Rata-rata / Hari</div>'
    + '<div class="cstat-val" id="metaAvg">' + avgVisit + '</div>'
    + '<div class="cstat-sub">kunjungan / hari</div></div>'
    + '<div class="cstat-item"><div class="cstat-lbl"><i class="ti ti-sum" style="color:var(--green)"></i> Total Periode</div>'
    + '<div class="cstat-val" id="metaTotal">' + totalScan7 + '</div>'
    + '<div class="cstat-sub">kunjungan</div></div>'
    + '<div class="cstat-item"><div class="cstat-lbl"><i class="ti ti-users" style="color:var(--txt3)"></i> Member Aktif</div>'
    + '<div class="cstat-val">' + stats.scan + ' <span style="font-size:13px;color:var(--txt3);font-weight:400">/ ' + stats.total + '</span></div>'
    + '<div class="cstat-sub">scan hari ini</div>'
    + '<div class="cstat-badge cbadge-neu">' + scanPct + '% hadir</div>'
    + '</div>'
    + '</div>'
    + '</div>'

    // Member list card
    + '<div class="card">'
    + '<div class="card-header"><div>'
    + '<div class="card-title">Member Terdaftar</div>'
    + '<div class="card-sub">' + stats.total + ' terdaftar</div>'
    + '</div>'
    + '<a href="/admin/members?tk=' + token + '" class="link-btn">Kelola <i class="ti ti-arrow-right" style="font-size:12px"></i></a>'
    + '</div>'
    + '<div class="heatmap-sec">'
    + '<div class="hm-title">Aktivitas 4 Minggu Terakhir</div>'
    + '<div class="hm-days-row">'
    + '<div class="hm-day-lbl">M</div><div class="hm-day-lbl">S</div><div class="hm-day-lbl">S</div>'
    + '<div class="hm-day-lbl">R</div><div class="hm-day-lbl">K</div><div class="hm-day-lbl">J</div>'
    + '<div class="hm-day-lbl">S</div>'
    + '</div>'
    + '<div class="hm-grid" id="hmGrid"></div>'
    + '</div>'
    + topMembersHtml
    + '<div class="progress-wrap">'
    + '<div class="progress-meta"><span>Aktif hari ini</span><span>' + stats.scan + ' / ' + stats.total + '</span></div>'
    + '<div class="progress-bar"><div class="progress-fill" style="width:' + scanPct + '%"></div></div>'
    + '</div>'
    + '</div>'

    + '</div>'

    // ── Bottom grid ─────────────────────────────────────────────
    + '<div class="bottom-grid">'

    // Activity tabs card (revamp v3 — ghost outline tabs)
    + '<div class="card">'
    + '<div class="card-header">'
    + '<div class="card-title">Aktivitas hari ini</div>'
    + '<span style="font-size:11px;color:#bbb">' + nowWib.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) + '</span>'
    + '</div>'
    + '<div class="tab-wrap">'
    + '<div class="tab-row">'
    + '<button type="button" class="tab-btn on" onclick="switchTab(\'scan\')">Scan</button>'
    + '<button type="button" class="tab-btn" onclick="switchTab(\'lb\')">Leaderboard</button>'
    + '<button type="button" class="tab-btn" onclick="switchTab(\'log\')">Log</button>'
    + '</div>'
    + '</div>'
    + '<div id="tab-scan" class="log-panel on"><div class="log-list"><div id="scan-list"></div></div></div>'
    + '<div id="tab-lb"   class="log-panel"><div class="log-list"><div id="lb-list"></div></div></div>'
    + '<div id="tab-log"  class="log-panel"><div class="log-list"><div id="log-list"></div></div></div>'
    + '</div>'

    // Riwayat Keuangan card (revamp v3 — fin-item + saldo-box dark green)
    + '<div class="card" style="display:flex;flex-direction:column">'
    + '<div class="card-header">'
    + '<div class="card-title">Riwayat keuangan</div>'
    + '<a href="/operasional" class="detail-link"'
    + ' onclick="try{localStorage.setItem(\'warpat_atk\',\'' + token + '\');}catch(_){}">Detail <i class="ti ti-arrow-right" style="font-size:12px"></i></a>'
    + '</div>'
    + '<div class="fin-body">'
    + '<div class="fin-month">' + bulanLabel + '</div>'
    + '<div class="fin-list">' + recentTrxHtml + '</div>'
    + '</div>'
    + '<div class="saldo-box">'
    + '<div>'
    + '<div class="saldo-label">Saldo bersih</div>'
    + '<div class="saldo-val' + (saldoBulan < 0 ? ' neg' : '') + '">' + (saldoBulan < 0 ? '−' : '') + rpFmt(Math.abs(saldoBulan)) + '</div>'
    + '<div class="saldo-period">' + bulanLabel + ' · ' + recentTrx.length + ' transaksi terbaru</div>'
    + '</div>'
    + '<div class="saldo-icon"><i class="ti ti-trending-' + (saldoBulan >= 0 ? 'up' : 'down') + '"></i></div>'
    + '</div>'
    + '</div>'

    + '</div>'

    + '</div>'
    + '</div>'
    + '</div>'

    + buildBottomNav(token, 'dashboard', user)
    + buildModal()

    + '<div class="toast" id="toast">✓ Disalin!</div>'

    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>'
    + '<script>'
    + 'const DATA_SCAN   = ' + JSON.stringify(dataScan)   + ';'
    + 'const DATA_LB     = ' + JSON.stringify(dataLb)     + ';'
    + 'const DATA_LOG    = ' + JSON.stringify(dataLog)    + ';'
    + 'const DATA_MEMBER = [];'
    + 'const TK          = ' + JSON.stringify(token)      + ';'
    + 'const BATAS       = ' + CONFIG.BATAS_MAIN          + ';'
    + 'const HOST        = ' + JSON.stringify(hostBase)   + ';'
    + 'const ALL_LABELS  = ' + allChartLabels             + ';'
    + 'const ALL_DATA    = ' + allChartData               + ';'
    + 'const ALL_YMD     = ' + JSON.stringify(trendDays.map((d) => d.ymd)) + ';'
    + 'const ALL_HM=' + heatmapJson + ';'
    + 'var trendChart;'
    + '(function(){'
    + 'var cvs=document.getElementById("trendChart");'
    + 'if(!cvs)return;'
    + 'var ctx=cvs.getContext("2d");'
    + 'var grad=ctx.createLinearGradient(0,0,0,220);'
    + 'grad.addColorStop(0,"rgba(58,125,44,0.18)");'
    + 'grad.addColorStop(0.6,"rgba(58,125,44,0.05)");'
    + 'grad.addColorStop(1,"rgba(58,125,44,0)");'
    + 'var init=ALL_LABELS.slice(-14);var initd=ALL_DATA.slice(-14);'
    + 'trendChart=new Chart(cvs,{'
    + 'type:"line",'
    + 'data:{labels:init,datasets:[{label:"Kunjungan",data:initd,'
    + 'borderColor:"#3a7d2c",backgroundColor:grad,'
    + 'tension:0.45,fill:true,'
    + 'pointBackgroundColor:"#fff",pointBorderColor:"#3a7d2c",pointBorderWidth:2,'
    + 'pointRadius:5,pointHoverRadius:7,'
    + 'pointHoverBackgroundColor:"#3a7d2c",pointHoverBorderColor:"#fff",pointHoverBorderWidth:2,'
    + 'borderWidth:2.5}]},'
    + 'options:{responsive:true,maintainAspectRatio:false,'
    + 'interaction:{mode:"index",intersect:false},'
    + 'plugins:{legend:{display:false},tooltip:{enabled:false,external:ttExternal}},'
    + 'scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11,family:"DM Sans"},color:"#7a8c78"}},'
    + 'y:{beginAtZero:true,grid:{color:"rgba(0,0,0,.04)"},border:{display:false},ticks:{font:{size:11,family:"DM Sans"},color:"#7a8c78",stepSize:1,padding:8}}}'
    + '}});'
    + '})();'
    + 'function ttExternal(context){'
    + '  var tt=document.getElementById("chartTooltip");'
    + '  var tip=context.tooltip;'
    + '  if(tip.opacity===0){tt.style.display="none";return;}'
    + '  var dp=tip.dataPoints[0];'
    + '  document.getElementById("ttDate").textContent=dp.label;'
    + '  document.getElementById("ttVal").textContent=dp.raw+" kunjungan";'
    + '  tt.style.display="block";'
    + '  tt.style.left=tip.caretX-tt.offsetWidth/2+"px";'
    + '  tt.style.top=tip.caretY-tt.offsetHeight-12+"px";'
    + '}'
    + 'function setPeriod(n,btn){'
    + '  document.querySelectorAll(".chart-period-btn").forEach(function(b){b.classList.remove("active");});'
    + '  btn.classList.add("active");'
    + '  if(n===0)return;'
    + '  var to=ALL_YMD[ALL_YMD.length-1];'
    + '  var from=ALL_YMD[Math.max(0,ALL_YMD.length-n)];'
    + '  document.getElementById("dateFrom").value=from;'
    + '  document.getElementById("dateTo").value=to;'
    + '  applyDateRange();'
    + '}'
    + '(function(){'
    + '  var grid=document.getElementById("hmGrid");'
    + '  if(!grid||!ALL_HM)return;'
    + '  var cls=["","lv1","lv2","lv3","lv4"];'
    + '  ALL_HM.forEach(function(v){'
    + '    var c=document.createElement("div");'
    + '    if(v===null){'
    + '      c.className="hm-cell hm-future";'
    + '      c.title="Belum terjadi";'
    + '    }else{'
    + '      c.className="hm-cell"+(v>0?" "+cls[Math.min(v,4)]:"");'
    + '      c.title=v+" kunjungan";'
    + '    }'
    + '    grid.appendChild(c);'
    + '  });'
    + '})();'
    + 'function fmtDate(s){var p=s.split("-");return p[2]+"-"+p[1]+"-"+p[0];}'
    + 'function applyDateRange(){'
    + '  var from=document.getElementById("dateFrom").value;'
    + '  var to=document.getElementById("dateTo").value;'
    + '  if(!from||!to||from>to)return;'
    + '  var lookup={};'
    + '  for(var i=0;i<ALL_YMD.length;i++){lookup[ALL_YMD[i]]={lbl:ALL_LABELS[i],cnt:ALL_DATA[i]};}'
    + '  var labels=[],data=[];'
    + '  var cur=new Date(from+"T00:00:00");'
    + '  var end=new Date(to+"T00:00:00");'
    + '  while(cur<=end){'
    + '    var y=cur.getFullYear();'
    + '    var mo=String(cur.getMonth()+1).padStart(2,"0");'
    + '    var dd=String(cur.getDate()).padStart(2,"0");'
    + '    var ymd=y+"-"+mo+"-"+dd;'
    + '    var info=lookup[ymd];'
    + '    var lbl=info?info.lbl:cur.toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"});'
    + '    labels.push(lbl);data.push(info?info.cnt:0);'
    + '    cur.setDate(cur.getDate()+1);'
    + '  }'
    + '  if(trendChart){'
    + '    trendChart.data.labels=labels.length?labels:["Tidak ada data"];'
    + '    trendChart.data.datasets[0].data=labels.length?data:[0];'
    + '    trendChart.update();'
    + '  }'
    + '  var total=data.reduce(function(s,v){return s+v;},0);'
    + '  var maxVal=labels.length?Math.max.apply(null,data):0;'
    + '  var best=total>0?labels[data.indexOf(maxVal)]:"—";'
    + '  var avg=total>0?(total/data.length).toFixed(1):"0";'
    + '  var sub=document.getElementById("chartSub");'
    + '  if(sub)sub.textContent=fmtDate(from)+" s/d "+fmtDate(to)+" — total "+total+" kunjungan";'
    + '  var mb=document.getElementById("metaBest");if(mb)mb.textContent=best;'
    + '  var ma=document.getElementById("metaAvg");if(ma)ma.textContent=avg;'
    + '  var mt=document.getElementById("metaTotal");if(mt)mt.textContent=total;'
    + '}'
    + 'setPeriod(14,document.querySelector(".chart-period-btn.active"));'
    + '<\/script>'
    + '<script src="/dashboard.js?v=39"><\/script>'
    + '</body></html>';
}

// ── Kelola Member page ────────────────────────────────────────

export function memberPage({ db, log = [], token, req, user = {} }) {
  const { members } = db;
  const hostBase = req.protocol + '://' + req.get('host');

  // Log riwayat per-member untuk modal detail. Filter ke event yg
  // beneran scan (SCAN, SCAN_RESET, BONUS_EARNED) — semua nambah point.
  // Pass `ts` mentah (ISO) supaya client bisa parse bulan utk filter.
  // `tgl` udah ke-format lengkap: hari, tgl, bulan, tahun, jam.
  const dataLogMember = log
    .filter((l) => l.aksi === 'SCAN' || l.aksi === 'SCAN_RESET' || l.aksi === 'BONUS_EARNED')
    .map(({ kode, nama, aksi, detail, ts }) => ({
      kode, nama, aksi, detail: detail ?? '',
      ts: new Date(ts).toISOString(),
      tgl: new Date(ts).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      }),
    }));
  const nowWibM  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const curBulanM = nowWibM.getFullYear() + '-' + String(nowWibM.getMonth() + 1).padStart(2, '0');
  const bulanLabelM = nowWibM.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Operational day = periode 24h dimulai jam 2 pagi WIB.
  const opDayM = (date) => {
    const w = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    if (w.getHours() < 2) w.setDate(w.getDate() - 1);
    return w.getFullYear() + '-' + String(w.getMonth() + 1).padStart(2, '0') + '-' + String(w.getDate()).padStart(2, '0');
  };
  const todayOpM = opDayM(new Date());

  // Reset otomatis jam 02:00 WIB
  const memberBaruCount = members.filter((m) => m.tanggalDaftar && opDayM(m.tanggalDaftar) === todayOpM).length;
  const scanHariIniCount = members.filter((m) => m.tanggalScanTerakhir && opDayM(m.tanggalScanTerakhir) === todayOpM).length;

  const dataMember = members.map((m) => {
    const d = m.tanggalScanTerakhir ? new Date(m.tanggalScanTerakhir) : null;
    const bonusSisaHari = m.bonusEarnedAt
      ? Math.max(0, 14 - Math.floor((Date.now() - new Date(m.bonusEarnedAt).getTime()) / 86400000))
      : null;
    return {
      kode:          m.kode,
      nama:          m.nama,
      telepon:       m.telepon ?? '',
      totalMain:     m.totalMain ?? 0,
      totalPoint:    m.totalPoint ?? 0,
      totalGratis:   m.totalGratis ?? 0,
      status:        m.status ?? '-',
      sudahScan:     !!(m.tanggalScanTerakhir && opDayM(m.tanggalScanTerakhir) === todayOpM),
      aktif:         m.aktif ?? false,
      tglDaftar:     m.tanggalDaftar         ? formatTanggalPendek(m.tanggalDaftar)         : '—',
      tglTerakhir:   m.tanggalScanTerakhir   ? formatTanggalJam(m.tanggalScanTerakhir)      : '—',
      bulanScan:     m.tanggalDaftar ? new Date(m.tanggalDaftar).toISOString().slice(0, 7) : '',
      bonusEarnedAt: m.bonusEarnedAt ?? null,
      bonusSisaHari,
    };
  }).sort((a, b) => {
    const score = (m) => m.status === 'BONUS' ? 3 : m.aktif ? 2 : 0;
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (b.totalMain || 0) - (a.totalMain || 0);
  });

  const bulanOpts = getBulanOptions()
    .map((o) => '<option value="' + o.val + '"' + (o.selected ? ' selected' : '') + '>' + o.lbl + '</option>')
    .join('');

  const now = new Date().toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });

  return '<!DOCTYPE html><html lang="id"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>Kelola Member — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">'
    + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/admin.css?v=38">'
    + '</head><body>'

    + '<div class="layout">'
    + buildSidebar(token, 'members', user)

    + '<div class="main-wrap">'

    + '<header class="topbar">'
    + '<div class="topbar-brand">'
    + '<div class="sb-brand-icon" style="width:28px;height:28px;font-size:14px;margin-right:6px">'
    + '<i class="ti ti-circle-number-8"></i></div>'
    + '<div><div class="topbar-name">' + CONFIG.NAMA_ARENA + '</div>'
    + '<div class="topbar-label">Kelola Member · ' + now + '</div></div>'
    + '</div>'
    + '<div class="topbar-right">'
    + buildAdminTopbarProfile(user)
    + '</div></header>'

    + '<div class="page">'

    // ── Desktop topbar ──────────────────────────────────────────
    + '<div class="dash-topbar">'
    + '<div>'
    + '<div class="page-title">Kelola Member</div>'
    + '<div class="page-sub">Manajemen data anggota &amp; status keanggotaan</div>'
    + '</div>'
    + '<div class="topbar-actions">'
    + '<span id="member-badge" class="filter-badge" style="display:none"></span>'
    + '<a href="/admin/tambah?tk=' + token + '" class="btn-primary">'
    + '<i class="ti ti-plus" style="font-size:14px"></i> Tambah Member</a>'
    + '</div>'
    + '</div>'

    // ── Stat grid ───────────────────────────────────────────────
    + '<div class="stat-grid" style="grid-template-columns:repeat(5,1fr)">'

    + '<div class="stat-card">'
    + '<div class="stat-label">Total Member<div class="stat-icon green"><i class="ti ti-users"></i></div></div>'
    + '<div class="stat-value">' + members.length + '</div>'
    + '<div class="stat-footer">Semua terdaftar</div></div>'

    + '<div class="stat-card">'
    + '<div class="stat-label">Member Aktif<div class="stat-icon green"><i class="ti ti-user-check"></i></div></div>'
    + '<div class="stat-value">' + members.filter(function(m){ return m.aktif; }).length + '</div>'
    + '<div class="stat-footer">Scan &lt; 2 bulan terakhir</div></div>'

    + '<div class="stat-card amber">'
    + '<div class="stat-label">Member VIP<div class="stat-icon amber"><i class="ti ti-crown"></i></div></div>'
    + '<div class="stat-value">' + members.filter(function(m){ return (m.totalMain||0) >= CONFIG.BATAS_MAIN; }).length + '</div>'
    + '<div class="stat-footer">' + Math.round(members.filter(function(m){ return (m.totalMain||0) >= CONFIG.BATAS_MAIN; }).length / Math.max(members.length,1) * 100) + '% dari total</div></div>'

    + '<div class="stat-card blue">'
    + '<div class="stat-label">Scan Hari Ini<div class="stat-icon blue"><i class="ti ti-scan"></i></div></div>'
    + '<div class="stat-value">' + scanHariIniCount + '</div>'
    + '<div class="stat-footer">dari ' + members.length + ' member</div></div>'

    + '<div class="stat-card blue">'
    + '<div class="stat-label">Member Baru<div class="stat-icon blue"><i class="ti ti-user-plus"></i></div></div>'
    + '<div class="stat-value">' + memberBaruCount + '</div>'
    + '<div class="stat-footer">Daftar hari ini (sejak 02:00)</div></div>'

    + '</div>'

    // ── Toolbar ─────────────────────────────────────────────────
    + '<div class="toolbar-card">'
    + '<div class="search-wrap" style="flex:1;min-width:160px;position:relative">'
    + '<i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:15px"></i>'
    + '<input class="search-input" type="text" id="cari" placeholder="Cari nama, kode, atau no. HP…" oninput="filterMember()" autocomplete="off" style="padding-left:34px"></div>'
    + '<select id="filterBulan" class="sel" onchange="filterMember()"><option value="">Semua bulan</option>' + bulanOpts + '</select>'
    + '<select id="filterStatus" class="sel" onchange="filterMember()"><option value="">Semua status</option><option value="hadir">Hadir hari ini</option><option value="gratis">Reward pending</option><option value="aktif">Aktif bulan ini</option><option value="nonaktif">Tidak aktif</option></select>'
    + '</div>'

    // ── Table ───────────────────────────────────────────────────
    + '<div class="table-card">'
    + '<div id="tbl-summary" class="filter-summary" style="display:none"></div>'
    + '<div class="tbl-head" style="grid-template-columns:40px 1fr 110px 110px 90px 110px 200px">'
    + '<div class="tbl-th">#</div>'
    + '<div class="tbl-th">Member</div>'
    + '<div class="tbl-th">Tipe</div>'
    + '<div class="tbl-th">Bergabung</div>'
    + '<div class="tbl-th">Status</div>'
    + '<div class="tbl-th r">Terakhir Datang</div>'
    + '<div class="tbl-th r">Aksi</div>'
    + '</div>'
    + '<div id="tbody"></div>'
    + '<div id="tbl-empty" class="empty-state" style="display:none"><i class="ti ti-users"></i>Tidak ada member yang cocok</div>'
    + '</div>'

    + '<div id="mobile-list" style="margin-top:8px"></div>'
    + '<div class="tbl-pg" id="member-pg" style="display:none;margin-top:10px;border-radius:14px"></div>'

    + '</div>'
    + '</div>'
    + '</div>'

    + buildBottomNav(token, 'members', user)
    + buildModal()

    // ── Member detail modal (full profile pop-up) ──────────────
    + '<div class="dt-ov" id="memberDetailOv" onclick="if(event.target===this)closeMemberDetail()">'
    + '<div class="dt-md">'
    + '<div class="dt-hd">'
    + '<div class="dt-av" id="dtAv">—</div>'
    + '<div class="dt-hd-info">'
    + '<p class="dt-nm" id="dtNm">—</p>'
    + '<p class="dt-cd" id="dtCd">—</p>'
    + '<div class="dt-hd-badges" id="dtBadges"></div>'
    + '</div>'
    + '<button class="dt-xb" aria-label="Tutup" onclick="closeMemberDetail()"><i class="ti ti-x"></i></button>'
    + '</div>'
    + '<div class="dt-body" id="dtBody">'
    + '<div class="dt-stats">'
    + '<div class="dt-st"><p class="dt-st-v" id="dtKunjungan">0</p><p class="dt-st-l">Kunjungan</p></div>'
    + '<div class="dt-st"><p class="dt-st-v sm" id="dtBergabung">—</p><p class="dt-st-l">Bergabung</p></div>'
    + '<div class="dt-st"><p class="dt-st-v sm" id="dtTerakhir">—</p><p class="dt-st-l">Terakhir Scan</p></div>'
    + '</div>'
    + '<div class="dt-sec">'
    + '<p class="dt-sec-t">Informasi</p>'
    + '<div class="dt-inf-row">'
    + '<div class="dt-inf-ic"><i class="ti ti-phone"></i></div>'
    + '<div class="dt-inf-body"><p class="dt-inf-l">Nomor HP</p><p class="dt-inf-v link" id="dtPhone">—</p></div>'
    + '<a class="dt-wa-inline" id="dtPhoneWa" target="_blank" rel="noopener" style="display:none"><i class="ti ti-brand-whatsapp"></i>WA</a>'
    + '</div>'
    + '<div class="dt-inf-row">'
    + '<div class="dt-inf-ic"><i class="ti ti-qrcode"></i></div>'
    + '<div class="dt-inf-body"><p class="dt-inf-l">Kode Member</p><p class="dt-inf-v mono" id="dtKode">—</p></div>'
    + '</div>'
    + '<div class="dt-inf-row">'
    + '<div class="dt-inf-ic"><i class="ti ti-coin"></i></div>'
    + '<div class="dt-inf-body"><p class="dt-inf-l">Point</p><p class="dt-inf-v" id="dtPoint">0</p></div>'
    + '</div>'
    + '<div class="dt-inf-row">'
    + '<div class="dt-inf-ic"><i class="ti ti-gift"></i></div>'
    + '<div class="dt-inf-body"><p class="dt-inf-l">Total Reward Didapat</p><p class="dt-inf-v" id="dtRewardTotal">—</p></div>'
    + '</div>'
    + '<div class="dt-inf-row">'
    + '<div class="dt-inf-ic"><i class="ti ti-circle-check"></i></div>'
    + '<div class="dt-inf-body"><p class="dt-inf-l">Status Reward</p><div id="dtRewardStatus"></div></div>'
    + '</div>'
    + '</div>'
    + '<div class="dt-sec">'
    + '<div class="dt-riv-hdr">'
    + '<p class="dt-sec-t" style="margin:0">Riwayat Kunjungan</p>'
    + '<span class="dt-riv-total" id="dtRivTotal">0 total</span>'
    + '</div>'
    + '<div class="dt-riv-filter-row">'
    + '<select id="dtRivFilter" class="dt-riv-filter"><option value="">Semua bulan</option></select>'
    + '</div>'
    + '<div id="dtBonusWarn"></div>'
    + '<div class="dt-riv-wrap"><div id="dtRiwayat" class="dt-riv"></div></div>'
    + '</div>'
    + '</div>' // /dt-body

    // Edit panel (hidden by default — toggle dari tombol Edit)
    + '<form class="dt-edit" id="dtEditForm" style="display:none" onsubmit="saveDetailEdit(event);return false">'
    + '<div class="dt-sec">'
    + '<p class="dt-sec-t">Edit Data Member</p>'
    + '<div class="dt-edit-field">'
    + '<label class="dt-edit-label" for="dtEditNama">Nama Lengkap</label>'
    + '<input id="dtEditNama" type="text" required maxlength="60" class="dt-edit-input" autocomplete="off">'
    + '</div>'
    + '<div class="dt-edit-field">'
    + '<label class="dt-edit-label" for="dtEditTlp">Nomor HP <span class="dt-edit-opt">(opsional)</span></label>'
    + '<div class="dt-edit-tlp">'
    + '<span class="dt-edit-prefix">+62</span>'
    + '<input id="dtEditTlp" type="tel" inputmode="numeric" placeholder="81234567890" class="dt-edit-input has-prefix" autocomplete="off"'
    + ' oninput="this.value=this.value.replace(/[^0-9]/g,\'\')">'
    + '</div>'
    + '<p class="dt-edit-hint">Kosongkan kalau tidak ada nomor</p>'
    + '</div>'
    + '</div>'
    + '</form>'

    + '<div class="dt-ft" id="dtFtView">'
    + '<a class="dt-btn dt-btn-wa" id="dtBtnWa" target="_blank" rel="noopener" style="display:none"><i class="ti ti-brand-whatsapp"></i>WA</a>'
    + '<button type="button" class="dt-btn" id="dtBtnQr"><i class="ti ti-qrcode"></i>QR</button>'
    + '<button type="button" class="dt-btn" id="dtBtnEdit" onclick="startDetailEdit()"><i class="ti ti-edit"></i>Edit</button>'
    + '<a class="dt-btn dt-btn-main" id="dtBtnReset"><i class="ti ti-refresh"></i>Reset QR</a>'
    + '</div>'

    + '<div class="dt-ft" id="dtFtEdit" style="display:none">'
    + '<button type="button" class="dt-btn" onclick="cancelDetailEdit()"><i class="ti ti-x"></i>Batal</button>'
    + '<button type="button" class="dt-btn dt-btn-main" onclick="saveDetailEdit()"><i class="ti ti-check"></i>Simpan Perubahan</button>'
    + '</div>'

    + '</div>'
    + '</div>'

    // ── Confirm modal (custom, untuk hapus/reset QR/klaim) ─────
    + '<div class="confirm-ov" id="confirmOv" onclick="if(event.target===this)closeConfirm()">'
    + '<div class="confirm-box">'
    + '<div class="confirm-icon" id="confirmIcon"><i class="ti ti-alert-triangle"></i></div>'
    + '<div class="confirm-title" id="confirmTitle">Konfirmasi</div>'
    + '<div class="confirm-msg" id="confirmMsg">Apakah Anda yakin?</div>'
    + '<div class="confirm-actions">'
    + '<button type="button" class="btn-confirm-cancel" onclick="closeConfirm()">Batal</button>'
    + '<button type="button" class="btn-confirm-ok danger" id="confirmOk">Yakin</button>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '<div class="toast" id="toast">✓ Disalin!</div>'

    + '<script>'
    + 'const DATA_SCAN   = [];'
    + 'const DATA_LB     = [];'
    + 'const DATA_LOG    = ' + JSON.stringify(dataLogMember) + ';'
    + 'const DATA_MEMBER = ' + JSON.stringify(dataMember) + ';'
    + 'const TK          = ' + JSON.stringify(token)      + ';'
    + 'const BATAS       = ' + CONFIG.BATAS_MAIN          + ';'
    + 'const HOST        = ' + JSON.stringify(hostBase)   + ';'
    + '</script>'
    + '<script src="/dashboard.js?v=39"></script>'
    + '</body></html>';
}

// ── Tambah member form ────────────────────────────────────────

export function addMemberPage(tk, errTlp) {
  const errHtml = errTlp
    ? '<div class="err-msg">Nomor tidak valid. Masukkan 8–12 digit setelah +62.</div>'
    : '';

  return docHead('Tambah Member')
    + '<style>' + DARK_BASE + '</style>'
    + '</head><body><div class="card">'
    + '<a href="/admin?tk=' + tk + '" class="back">← Dashboard</a>'
    + '<h1>Tambah Member Baru</h1>'
    + '<p style="font-size:13px;color:#475569;margin-bottom:24px">Kode member dibuat otomatis.</p>'
    + '<form action="/admin/tambah" method="get" id="frm">'
    + '<input type="hidden" name="tk" value="' + tk + '">'
    + '<div class="fw"><label>Nama Lengkap</label>'
    + '<input type="text" name="nama" placeholder="contoh: Budi Santoso" required autofocus autocomplete="off">'
    + '</div>'
    + '<div class="fw"><label>No. Telepon <span style="color:#ef4444">*</span></label>'
    + '<div class="tel-wrap"><span class="tel-pre">+62</span>'
    + '<input type="tel" id="tlpInput" name="tlp" placeholder="81234567890"'
    + ' required autocomplete="off" inputmode="numeric"'
    + ' oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"'
    + (errTlp ? ' class="err-f"' : '') + '>'
    + '</div>'
    + errHtml
    + '<p class="hint">Hanya angka. Contoh: 81234567890</p>'
    + '</div>'
    + '<button type="submit" onclick="return validateForm()">＋ Daftarkan Member</button>'
    + '</form>'
    + '<script>'
    + 'function validateForm(){'
    + 'var v=document.getElementById("tlpInput").value.replace(/[^0-9]/g,"");'
    + 'if(v.length<8||v.length>12){document.getElementById("tlpInput").classList.add("err-f");return false;}'
    + 'return true;}'
    + '</script>'
    + '</div></body></html>';
}

// ── Tambah member sukses ──────────────────────────────────────

export function addMemberSuccess({ tk, kode, nama, telepon, scanUrl }) {
  const shareUrl = scanUrl.replace('/scan?id=', '/member/').replace('http://', 'https://');
  const waMsg = encodeURIComponent(
    'Halo ' + nama + '! Ini kartu member ' + CONFIG.NAMA_ARENA + '.\n'
    + 'Scan QR ini tiap kali mau main ya! ' + shareUrl
  );
  // Normalize ke format internasional WhatsApp (62XXX, tanpa +/spasi/dash)
  // telepon datang sbg "+62 812-3456-7890" → digits aja: "6281234567890"
  // Pakai api.whatsapp.com/send (bukan wa.me) — lebih reliable di Android
  // budget/Samsung Internet yang sering gagal handle redirect wa.me.
  const waNum = (telepon || '').replace(/\D/g, '');
  const waHref = waNum
    ? 'https://api.whatsapp.com/send?phone=' + waNum + '&text=' + waMsg
    : 'https://api.whatsapp.com/send?text=' + waMsg;

  return docHead('Member Terdaftar')
    + '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@500&display=swap" rel="stylesheet">'
    + '<style>'
    + ':root{--gold:#C9A84C;--gold-lt:#F0D88A;--green:#0E6B38;--green-lt:#2DB56D;--bg:#060B08;--text:#EEF2ED;--muted:rgba(238,242,237,0.42)}'
    + '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
    + 'body{'
    +   'font-family:"DM Sans",sans-serif;background:var(--bg);min-height:100vh;'
    +   'display:flex;flex-direction:column;align-items:center;justify-content:center;'
    +   'padding:32px 20px 40px;position:relative;overflow-x:hidden;'
    + '}'
    + 'body::before{'
    +   'content:"";position:fixed;inset:0;'
    +   'background:radial-gradient(ellipse 80% 60% at 50% -5%,rgba(14,107,56,.14) 0%,transparent 65%),'
    +     'radial-gradient(ellipse 50% 40% at 85% 85%,rgba(201,168,76,.07) 0%,transparent 60%);'
    +   'pointer-events:none;z-index:0;'
    + '}'
    + '.wrap{max-width:480px;width:100%;text-align:center;position:relative;z-index:1}'
    /* header badge */
    + '.ok-ring{'
    +   'width:52px;height:52px;border-radius:50%;margin:0 auto 14px;'
    +   'background:rgba(45,181,109,.12);border:1.5px solid rgba(45,181,109,.35);'
    +   'display:flex;align-items:center;justify-content:center;'
    +   'box-shadow:0 0 20px rgba(45,181,109,.18);'
    +   'animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;'
    + '}'
    + '@keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}'
    + '.ok-label{'
    +   'font-family:"Bebas Neue",sans-serif;font-size:11px;letter-spacing:.32em;'
    +   'color:var(--green-lt);margin-bottom:6px;'
    + '}'
    + '.member-name{'
    +   'font-family:"Cormorant Garamond",serif;font-size:34px;font-weight:700;'
    +   'color:var(--text);line-height:1;margin-bottom:8px;'
    +   'text-shadow:0 1px 0 rgba(255,255,255,.06);'
    + '}'
    + '.member-tlp{'
    +   'font-family:"DM Mono",monospace;font-size:12px;color:var(--muted);'
    +   'margin-bottom:6px;letter-spacing:.06em;'
    + '}'
    + '.member-kode{'
    +   'display:inline-flex;align-items:center;gap:5px;'
    +   'background:rgba(45,181,109,.08);border:1px solid rgba(45,181,109,.22);'
    +   'border-radius:20px;padding:4px 12px;margin-bottom:22px;'
    + '}'
    + '.member-kode span{font-family:"DM Mono",monospace;font-size:11px;color:var(--green-lt);letter-spacing:.12em}'
    /* card iframe */
    + '.card-frame-wrap{'
    +   'border-radius:20px;overflow:hidden;margin-bottom:20px;'
    +   'box-shadow:0 0 0 1px rgba(201,168,76,.14),0 16px 48px rgba(0,0,0,.6);'
    + '}'
    + '.card-frame-wrap iframe{display:block;width:100%;height:520px;border:none;transition:height .3s ease}'
    /* action buttons */
    + '.btns-primary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}'
    + '.btns-secondary{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
    + '.btn{'
    +   'display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;'
    +   'padding:12px 16px;font-size:13px;font-weight:600;text-decoration:none;'
    +   'letter-spacing:.02em;transition:opacity .15s,transform .1s;border:none;cursor:pointer;'
    + '}'
    + '.btn:active{opacity:.8;transform:scale(.97)}'
    + '.btn-dl{background:var(--green-lt);color:#fff}'
    + '.btn-wa{background:#25d366;color:#fff}'
    + '.btn-more{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(238,242,237,.65);font-size:12px;padding:10px 12px}'
    + '.btn-dash{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);color:var(--gold);font-size:12px;padding:10px 12px}'
    + '</style>'
    + '</head><body><div class="wrap">'
    /* Header */
    + '<div class="ok-ring" aria-hidden="true">'
    +   '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    +     '<path d="M4 11L9 16L18 6" stroke="#2DB56D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    +   '</svg>'
    + '</div>'
    + '<div class="ok-label">Member Terdaftar</div>'
    + '<div class="member-name">' + nama + '</div>'
    + '<div class="member-tlp">' + telepon + '</div>'
    + '<div class="member-kode">'
    +   '<svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true">'
    +     '<rect x=".5" y="1.5" width="10" height="7" rx="1.5" stroke="#2DB56D" stroke-width="1.1"/>'
    +     '<rect x="2" y="4" width="4" height="1" rx=".5" fill="#2DB56D"/>'
    +     '<rect x="2" y="5.5" width="2.5" height="1" rx=".5" fill="#2DB56D"/>'
    +     '<circle cx="8" cy="5" r="1.2" fill="#2DB56D"/>'
    +   '</svg>'
    +   '<span>' + kode + '</span>'
    + '</div>'
    /* Card iframe */
    + '<div class="card-frame-wrap">'
    +   '<iframe src="/admin/qr-view/' + kode + '?tk=' + tk + '" title="Kartu Member" scrolling="no"></iframe>'
    + '</div>'
    /* Buttons — primary row */
    + '<div class="btns-primary">'
    + '<a href="/admin/qr/' + kode + '?tk=' + tk + '" class="btn btn-dl" download="QR-' + kode + '.svg">'
    +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M3 20h18"/></svg>'
    +   'Download Kartu'
    + '</a>'
    + '<a href="' + waHref + '" target="_blank" rel="noopener" class="btn btn-wa">'
    +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.103 1.508 5.827L0 24l6.335-1.482A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.214-3.732.873.916-3.641-.235-.374A9.818 9.818 0 1112 21.818z"/></svg>'
    +   'Kirim WA'
    + '</a>'
    + '</div>'
    /* Buttons — secondary row */
    + '<div class="btns-secondary">'
    + '<a href="/admin/tambah?tk=' + tk + '" class="btn btn-more">'
    +   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
    +   'Tambah lagi'
    + '</a>'
    + '<a href="/admin?tk=' + tk + '" class="btn btn-dash">'
    +   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
    +   'Dashboard'
    + '</a>'
    + '</div>'
    + '<script>'
    + 'window.addEventListener("message",function(e){'
    + 'if(e.data&&e.data.qrH){'
    + 'var f=document.querySelector(".card-frame-wrap iframe");'
    + 'if(f)f.style.height=Math.ceil(e.data.qrH)+"px";'
    + '}'
    + '});'
    + '</script>'
    + '</div></body></html>';
}

// editMemberPage() dihapus — edit member sekarang inline via modal
// detail di /admin/members. GET /admin/edit jadi save-only endpoint.
