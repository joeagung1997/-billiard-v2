// src/views/admin.js
// ── HTML views untuk halaman admin ───────────────────────────
// ATURAN: TIDAK ADA nested backtick. Semua kondisional dihitung
// sebagai variabel string biasa SEBELUM dimasukkan ke template literal.

import { CONFIG } from "../config.js";
import { getBulanOptions, formatTanggalPendek, formatTanggalBulan } from "../utils/format.js";

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
    + '<title>' + title + ' — ' + CONFIG.NAMA_ARENA + '</title>';
}

// ── Login page ────────────────────────────────────────────────

export function adminLoginPage(showError) {
  const errHtml = showError
    ? '<div class="err">PIN salah. Coba lagi.</div>'
    : '';

  return docHead('Admin')
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070d18;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.card{background:#0c1526;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:32px 24px;max-width:340px;width:100%;text-align:center}'
    + 'input[type=password]{width:100%;padding:14px;background:#0d1b2e;border:1.5px solid rgba(255,255,255,.07);border-radius:12px;font-size:28px;text-align:center;letter-spacing:.5em;color:#e8edf5;outline:none;font-family:monospace;margin-bottom:12px}'
    + 'input[type=password]:focus{border-color:#3b82f6}'
    + 'button{width:100%;background:#2563eb;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer}'
    + '.err{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px}'
    + '</style></head><body><div class="card">'
    + '<div style="font-size:40px;margin-bottom:12px">🎱</div>'
    + '<div style="font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;margin-bottom:8px">' + CONFIG.NAMA_ARENA + '</div>'
    + '<h1 style="font-size:20px;font-weight:700;color:#e8edf5;margin-bottom:4px">Admin Panel</h1>'
    + '<p style="font-size:13px;color:#4a5e78;margin-bottom:24px">Masukkan PIN untuk masuk</p>'
    + errHtml
    + '<form action="/admin/login" method="post">'
    + '<input type="password" name="pin" placeholder="••••" maxlength="8" autofocus autocomplete="off">'
    + '<button type="submit">Masuk</button>'
    + '</form></div></body></html>';
}

// ── Dashboard ─────────────────────────────────────────────────

export function adminDashboard({ db, log, token, req }) {
  const { members } = db;

  const stats = {
    total:  members.length,
    scan:   members.filter((m) => m.sudahScanHariIni).length,
    reward: members.filter((m) => m.status === 'GRATIS').length,
    aktif:  members.filter((m) => m.totalMain > 0).length,
  };

  const hostBase  = req.protocol + '://' + req.get('host');

  // Bulan options — string biasa
  const bulanOpts = getBulanOptions()
    .map((o) => '<option value="' + o.val + '"' + (o.selected ? ' selected' : '') + '>' + o.lbl + '</option>')
    .join('');

  // Data JSON untuk JS client
  const dataScan = members
    .filter((m) => m.sudahScanHariIni && m.tanggalScanTerakhir)
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

  const dataLog = log.map(({ nama, aksi, detail, ts }) => ({
    nama, aksi, detail: detail ?? '',
    tgl: new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }),
  }));

  const dataMember = members.map((m) => {
    const d = m.tanggalScanTerakhir ? new Date(m.tanggalScanTerakhir) : null;
    return {
      kode:        m.kode,
      nama:        m.nama,
      telepon:     m.telepon ?? '',
      totalMain:   m.totalMain ?? 0,
      totalGratis: m.totalGratis ?? 0,
      status:      m.status ?? '-',
      sudahScan:   m.sudahScanHariIni ?? false,
      tglDaftar:   m.tanggalDaftar    ? formatTanggalPendek(m.tanggalDaftar)   : '—',
      tglTerakhir: m.tanggalScanTerakhir ? formatTanggalBulan(m.tanggalScanTerakhir) : '—',
      bulanScan:   d ? (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')) : '',
    };
  });

  const now = new Date().toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });

  // CSS dashboard — string array join, tidak ada template literal
  const css = [
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
    '.topbar { position:sticky; top:0; z-index:50; background:var(--surface); border-bottom:1px solid var(--border); padding:var(--sp-3) var(--sp-4); display:flex; align-items:center; justify-content:space-between; gap:var(--sp-3); }',
    '.topbar-brand { display:flex; align-items:center; gap:var(--sp-3); }',
    '.topbar-name { font-size:var(--fs-md); font-weight:var(--fw-bk); color:var(--txt); }',
    '.topbar-label { font-size:var(--fs-xs); color:var(--txt3); margin-top:1px; }',
    '.topbar-right { display:flex; align-items:center; gap:var(--sp-2); }',
    '.theme-btn { background:var(--surface2); border:1px solid var(--border2); border-radius:var(--r-sm); padding:5px var(--sp-2); font-size:var(--fs-sm); color:var(--txt2); cursor:pointer; }',
    '.page { padding:var(--sp-4); padding-bottom:60px; max-width:960px; margin:0 auto; }',
    '.sec-label { font-size:var(--fs-xs); font-weight:var(--fw-b); letter-spacing:.08em; text-transform:uppercase; color:var(--txt3); margin-bottom:var(--sp-2); margin-top:var(--sp-5); }',
    '.stats { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--sp-2); margin-bottom:var(--sp-4); }',
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
    '.action-bar { display:flex; gap:var(--sp-2); flex-wrap:wrap; margin-bottom:var(--sp-3); }',
    '.btn-primary { display:inline-flex; align-items:center; gap:var(--sp-1); background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); padding:var(--sp-2) var(--sp-4); font-size:var(--fs-base); font-weight:var(--fw-bk); text-decoration:none; cursor:pointer; }',
    '.btn-secondary { display:inline-flex; align-items:center; gap:var(--sp-1); background:var(--surface2); color:var(--txt2); border:1px solid var(--border2); border-radius:var(--r-md); padding:var(--sp-2) var(--sp-3); font-size:var(--fs-base); font-weight:var(--fw-b); text-decoration:none; cursor:pointer; }',
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
    '.modal-overlay { display:none; position:fixed; inset:0; z-index:300; background:rgba(0,0,0,.75); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:var(--sp-4); }',
    '.modal-overlay.open { display:flex; }',
    '.modal-box { background:var(--surface); border:1px solid var(--border2); border-radius:var(--r-xl); padding:var(--sp-5); max-width:360px; width:100%; text-align:center; animation:modalIn .2s ease; position:relative; }',
    '@keyframes modalIn { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }',
    '.modal-close { position:absolute; top:var(--sp-3); right:var(--sp-3); background:var(--surface2); border:1px solid var(--border); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; color:var(--txt2); }',
    '.modal-qr-wrap { background:#fff; border-radius:var(--r-lg); padding:var(--sp-3); display:inline-block; margin-bottom:var(--sp-3); overflow:hidden; width:100%; }',
    '.modal-qr-wrap img { display:block; width:100%; height:auto; border-radius:var(--r-sm); }',
    '.modal-name { font-size:var(--fs-lg); font-weight:var(--fw-bk); color:var(--txt); margin-bottom:4px; }',
    '.modal-kode { font-family:monospace; font-size:var(--fs-sm); color:var(--green); margin-bottom:var(--sp-4); }',
    '.modal-btns { display:flex; gap:var(--sp-2); justify-content:center; flex-wrap:wrap; }',
    '.modal-btn { display:inline-flex; align-items:center; gap:5px; padding:var(--sp-2) var(--sp-4); border-radius:var(--r-md); font-size:var(--fs-sm); font-weight:var(--fw-b); text-decoration:none; cursor:pointer; border:none; }',
    '.modal-btn-dl   { background:var(--green); color:#fff; }',
    '.modal-btn-copy { background:var(--accent); color:#fff; }',
    '.modal-btn-wa   { background:#25d366; color:#fff; }',
    '.toast { position:fixed; bottom:var(--sp-5); left:50%; transform:translateX(-50%); background:var(--green-bg); color:var(--green); border:1px solid rgba(34,197,94,.3); border-radius:var(--r-md); padding:var(--sp-2) var(--sp-5); font-size:var(--fs-sm); font-weight:var(--fw-b); display:none; z-index:200; white-space:nowrap; pointer-events:none; }',

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
    // Desktop: table visible, mobile-list hidden
    '@media (min-width:641px) { #mobile-list { display:none !important; } }',
    // Mobile: table hidden, mobile-list visible; layout fixes
    '@media (max-width:640px) {',
    '  .table-wrap { display:none; }',
    '  .pg-wrap { display:none; }',
    '  .topbar-label { display:none; }',
    '  .topbar { padding:8px 12px; }',
    '  .page { padding:10px; padding-bottom:60px; }',
    '  .stats { gap:6px; }',
    '  .stat-card { padding:10px 12px; }',
    '  .stat-num { font-size:22px; }',
    '  .tabs-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }',
    '  .tab-btn { padding:10px 6px; font-size:11px; min-width:74px; }',
    '  .action-bar { gap:6px; }',
    '  .btn-primary { padding:9px 12px; font-size:12px; }',
    '  .btn-secondary { padding:9px 10px; font-size:12px; }',
    '  .filter-bar { flex-direction:column; gap:6px; }',
    '  .search-wrap { min-width:unset; width:100%; }',
    '  .search-input { width:100%; }',
    '  .sel { width:100%; }',
    '  .filter-bar .sel:last-child { display:none; }',
    '  .sec-label { margin-top:12px; }',
    '}',
  ].join('');

  return '<!DOCTYPE html><html lang="id" data-theme="dark"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Admin — ' + CONFIG.NAMA_ARENA + '</title>'
    + '<style>' + css + '</style>'
    + '</head><body>'

    + '<header class="topbar">'
    + '<div class="topbar-brand"><span style="font-size:20px">🎱</span>'
    + '<div><div class="topbar-name">' + CONFIG.NAMA_ARENA + '</div>'
    + '<div class="topbar-label">Admin Dashboard</div></div></div>'
    + '<div class="topbar-right">'
    + '<span style="font-size:var(--fs-xs);color:var(--txt3)">' + now + '</span>'
    + '<button class="theme-btn" onclick="toggleTheme()" id="themeBtn">🌙</button>'
    + '</div></header>'

    + '<main class="page">'

    + '<div class="stats">'
    + '<div class="stat-card"><div style="font-size:18px;margin-bottom:4px">👥</div><div class="stat-num">' + stats.total + '</div><div class="stat-lbl">Total member</div></div>'
    + '<div class="stat-card"><div style="font-size:18px;margin-bottom:4px">📲</div><div class="stat-num">' + stats.scan + '</div><div class="stat-lbl">Scan hari ini</div></div>'
    + '<div class="stat-card"><div style="font-size:18px;margin-bottom:4px">🎁</div><div class="stat-num">' + stats.reward + '</div><div class="stat-lbl">Reward pending</div></div>'
    + '<div class="stat-card"><div style="font-size:18px;margin-bottom:4px">🔥</div><div class="stat-num">' + stats.aktif + '</div><div class="stat-lbl">Aktif bulan ini</div></div>'
    + '</div>'

    + '<div class="card" style="margin-bottom:var(--sp-4)">'
    + '<div class="tabs-wrap">'
    + '<div class="tab-btn on" onclick="switchTab(\'scan\')">📲 Hari ini</div>'
    + '<div class="tab-btn" onclick="switchTab(\'lb\')">🏆 Leaderboard</div>'
    + '<div class="tab-btn" onclick="switchTab(\'log\')">📋 Log</div>'
    + '</div>'
    + '<div id="tab-scan" class="tab-body on"><div id="scan-list"></div><button id="scan-showbtn" class="show-all-btn" style="display:none"></button></div>'
    + '<div id="tab-lb" class="tab-body"><div id="lb-list"></div><button id="lb-showbtn" class="show-all-btn" style="display:none"></button></div>'
    + '<div id="tab-log" class="tab-body"><div id="log-list"></div><button id="log-showbtn" class="show-all-btn" style="display:none"></button></div>'
    + '</div>'

    + '<div class="sec-label" style="display:flex;align-items:center;justify-content:space-between">'
    + '<span>Kelola Member</span>'
    + '<span id="member-badge" class="filter-badge" style="display:none"></span>'
    + '</div>'
    + '<div class="action-bar">'
    + '<a href="/admin/tambah?tk=' + token + '" class="btn-primary">＋ Tambah Member</a>'
    + '<a href="/keuangan" class="btn-secondary" style="color:var(--green);border-color:var(--green-bg)">💰 Keuangan</a>'
    + '<a href="/admin/reset?tk=' + token + '" class="btn-secondary" onclick="return confirm(\'Reset scan harian semua member?\')">↺ Reset Harian</a>'
    + '</div>'

    + '<div class="filter-bar">'
    + '<div class="search-wrap"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--txt3);pointer-events:none">🔍</span>'
    + '<input class="search-input" type="text" id="cari" placeholder="Cari nama, kode, atau no. HP…" oninput="filterMember()" style="padding-left:34px"></div>'
    + '<select id="filterBulan" class="sel" onchange="filterMember()"><option value="">Semua bulan</option>' + bulanOpts + '</select>'
    + '<select id="filterStatus" class="sel" onchange="filterMember()"><option value="">Semua status</option><option value="hadir">Hadir hari ini</option><option value="gratis">Reward pending</option><option value="aktif">Aktif bulan ini</option><option value="nonaktif">Tidak aktif</option></select>'
    + '</div>'

    + '<div class="card">'
    + '<div id="tbl-summary" class="filter-summary" style="display:none"></div>'
    + '<div class="table-wrap"><table><thead><tr>'
    + '<th>Kode</th><th>Nama &amp; No. HP</th><th>Progress</th>'
    + '<th>Status</th><th>Reward</th><th style="text-align:center">QR</th>'
    + '<th style="text-align:right">Aksi</th>'
    + '</tr></thead><tbody id="tbody"></tbody></table>'
    + '<div id="tbl-empty" class="empty-state" style="display:none">Tidak ada member yang cocok</div>'
    + '</div>'
    + '<div class="pg-wrap" id="member-pg"></div>'
    + '</div>'
    // Mobile card list — hanya tampil di layar ≤640px (CSS mengatur ini)
    + '<div id="mobile-list" style="margin-top:8px"></div>'

    + '</main>'

    + '<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this){closeModal()}">'
    + '<div class="modal-box"><button class="modal-close" onclick="closeModal()">✕</button>'
    + '<div class="modal-qr-wrap"><img id="modalImg" src="" alt="QR"></div>'
    + '<div class="modal-name" id="modalName"></div>'
    + '<div class="modal-kode" id="modalKode"></div>'
    + '<div class="modal-btns">'
    + '<a id="modalDl" class="modal-btn modal-btn-dl" download>⬇ Download</a>'
    + '<button class="modal-btn modal-btn-copy" onclick="copyModal()">Copy URL</button>'
    + '<a id="modalWa" class="modal-btn modal-btn-wa" target="_blank" rel="noopener">' + WA_SVG + ' WhatsApp</a>'
    + '</div></div></div>'

    + '<div class="toast" id="toast">✓ Disalin!</div>'

    + '<script>'
    + 'const DATA_SCAN   = ' + JSON.stringify(dataScan)   + ';'
    + 'const DATA_LB     = ' + JSON.stringify(dataLb)     + ';'
    + 'const DATA_LOG    = ' + JSON.stringify(dataLog)    + ';'
    + 'const DATA_MEMBER = ' + JSON.stringify(dataMember) + ';'
    + 'const TK          = ' + JSON.stringify(token)      + ';'
    + 'const BATAS       = ' + CONFIG.BATAS_MAIN          + ';'
    + 'const HOST        = ' + JSON.stringify(hostBase)   + ';'
    + '</script>'
    + '<script src="/dashboard.js"></script>'
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

export function addMemberSuccess({ tk, kode, nama, telepon, scanUrl, brandedCard }) {
  const qrSection = brandedCard
    ? '<div class="qr-card-wrap"><img src="' + brandedCard.encoded + '" alt="QR Card"></div>'
      + '<p class="qr-hint">Kartu QR siap — download lalu kirim ke WhatsApp member atau cetak</p>'
    : '';

  // shareUrl pakai /member/:kode agar WA preview ada gambar QR
  // Paksa HTTPS agar thumbnail muncul di WA (WA tidak crawl HTTP)
  const shareUrl = scanUrl.replace('/scan?id=', '/member/').replace('http://', 'https://');
  const waMsg = encodeURIComponent(
    'Halo ' + nama + '! Ini kartu member ' + CONFIG.NAMA_ARENA + '. '
    + 'Scan QR ini tiap kali mau main ya! ' + shareUrl
  );

  return docHead('Member Terdaftar')
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080e18;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.wrap{max-width:440px;width:100%;text-align:center}'
    + '.ic{width:48px;height:48px;border-radius:50%;background:#14532d;border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 10px}'
    + '.qr-card-wrap{margin:16px 0;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.5)}'
    + '.qr-card-wrap img{display:block;width:100%;height:auto}'
    + '.qr-hint{font-size:11px;color:#334155;margin-bottom:16px}'
    + '.btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}'
    + '.btn{display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;text-decoration:none}'
    + '.btn-dl{background:#22c55e;color:#fff}'
    + '.btn-wa{background:#25d366;color:#fff}'
    + '.btn-b{background:#2563eb;color:#fff}'
    + '.btn-w{background:#1e2d45;color:#94a3b8}'
    + '</style>'
    + '</head><body><div class="wrap">'
    + '<div class="ic">✓</div>'
    + '<h1 style="font-size:18px;font-weight:700;color:#22c55e;margin-bottom:3px">Member Terdaftar!</h1>'
    + '<div style="font-size:20px;font-weight:700;color:#e8edf5;margin-bottom:3px">' + nama + '</div>'
    + '<div style="font-size:13px;color:#4a5e78;font-family:monospace;margin-bottom:16px">' + telepon + '</div>'
    + qrSection
    + '<div class="btns">'
    + '<a href="/admin/qr/' + kode + '?tk=' + tk + '" class="btn btn-dl" download="QR-' + kode + '.svg">⬇ Download Kartu QR</a>'
    + '<a href="https://wa.me/?text=' + waMsg + '" target="_blank" class="btn btn-wa">Kirim WA</a>'
    + '<a href="/admin/tambah?tk=' + tk + '" class="btn btn-w">＋ Tambah lagi</a>'
    + '<a href="/admin?tk=' + tk + '" class="btn btn-b">Dashboard</a>'
    + '</div></div></body></html>';
}

// ── Edit member page ──────────────────────────────────────────

export function editMemberPage(tk, member) {
  const tlpEdit = (member.telepon ?? '').replace('+62 ', '').replace(/[^0-9]/g, '');

  return docHead('Edit Member')
    + '<style>' + DARK_BASE
    + '.kode-tag{font-family:monospace;font-size:12px;color:#22c55e;margin-bottom:20px;display:block}'
    + '</style>'
    + '</head><body><div class="card">'
    + '<a href="/admin?tk=' + tk + '" class="back">← Kembali</a>'
    + '<h1>Edit Member</h1>'
    + '<span class="kode-tag">' + member.kode + '</span>'
    + '<form action="/admin/edit" method="get">'
    + '<input type="hidden" name="tk" value="' + tk + '">'
    + '<input type="hidden" name="kode" value="' + member.kode + '">'
    + '<div class="fw"><label>Nama</label>'
    + '<input type="text" name="nama" value="' + member.nama.replace(/"/g, '&quot;') + '" required autofocus autocomplete="off">'
    + '</div>'
    + '<div class="fw"><label>No. Telepon</label>'
    + '<div class="tel-wrap"><span class="tel-pre">+62</span>'
    + '<input type="tel" name="tlp" value="' + tlpEdit + '" placeholder="81234567890"'
    + ' autocomplete="off" inputmode="numeric"'
    + ' oninput="this.value=this.value.replace(/[^0-9]/g,\'\')">'
    + '</div>'
    + '<p class="hint">Kosongkan jika tidak ingin mengubah nomor</p>'
    + '</div>'
    + '<button type="submit">Simpan Perubahan</button>'
    + '</form>'
    + '</div></body></html>';
}
