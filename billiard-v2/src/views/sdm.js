// src/views/sdm.js
// ── HTML views untuk halaman SDM & Penggajian ─────────────────

import { CONFIG } from "../config.js";
import { docHeadV4, buildFinanceSidebar, buildFinanceBottomNav, escHtml } from "./finance.js";

const rp = (n) => {
  const abs = Math.abs(Math.round(Number(n) || 0));
  const s = String(abs);
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return "Rp " + parts.join(".");
};

const TIPE_LABEL = {
  gaji:          "Gaji",
  kasbon:        "Kasbon",
  kembali_kasbon:"Kembali Kasbon",
  thr:           "THR",
  bonus:         "Bonus",
  makan_harian:  "Makan Harian",
};

const TIPE_COLOR = {
  gaji:          "green",
  kasbon:        "orange",
  kembali_kasbon:"blue",
  thr:           "purple",
  bonus:         "purple",
  makan_harian:  "malam",
};

// Hitung ringkasan gaji satu karyawan untuk satu bulan
function hitungRingkasan(karyawan, trxBulanIni) {
  const gajiPokok     = Number(karyawan.gaji_pokok) || 0;
  const uangMakanHari = Number(karyawan.uang_makan)  || 0;
  const hariKerja     = Number(karyawan.hari_kerja)  || 26;
  const totalMakanEst = uangMakanHari * hariKerja;           // estimasi, bukan bagian gaji
  const kasbon    = trxBulanIni.filter((t) => t.tipe === "kasbon").reduce((s, t) => s + Number(t.jumlah), 0);
  const kembali   = trxBulanIni.filter((t) => t.tipe === "kembali_kasbon").reduce((s, t) => s + Number(t.jumlah), 0);
  const dibayar   = trxBulanIni.filter((t) => t.tipe === "gaji").reduce((s, t) => s + Number(t.jumlah), 0);
  const thr       = trxBulanIni.filter((t) => t.tipe === "thr").reduce((s, t) => s + Number(t.jumlah), 0);
  const bonus     = trxBulanIni.filter((t) => t.tipe === "bonus").reduce((s, t) => s + Number(t.jumlah), 0);
  // makan_harian: pengeluaran operasional harian — TIDAK mempengaruhi sisa gaji
  const makanTrx  = trxBulanIni.filter((t) => t.tipe === "makan_harian").reduce((s, t) => s + Number(t.jumlah), 0);
  const makanCount = trxBulanIni.filter((t) => t.tipe === "makan_harian").length;
  const totalDibayarkan = kasbon + dibayar + thr + bonus - kembali;
  const sisa      = Math.max(0, gajiPokok - totalDibayarkan);
  const status    = totalDibayarkan <= 0 ? "belum"
                  : totalDibayarkan >= gajiPokok ? "lunas" : "sebagian";
  return { gajiPokok, uangMakanHari, hariKerja, totalMakanEst, kasbon, kembali, dibayar, thr, bonus, makanTrx, makanCount, totalDibayarkan, sisa, status };
}

const bulanLabel = (bulan) => {
  if (!bulan) return "";
  const [y, m] = bulan.split("-");
  const names = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
  return (names[parseInt(m) - 1] || m) + " " + y;
};

const statusBadge = (status) => {
  const cfg = {
    lunas:    { cls: "sdm-badge-green",  label: "✓ Lunas" },
    sebagian: { cls: "sdm-badge-orange", label: "◑ Sebagian" },
    belum:    { cls: "sdm-badge-red",    label: "○ Belum" },
  };
  const c = cfg[status] || cfg.belum;
  return "<span class=\"sdm-badge " + c.cls + "\">" + c.label + "</span>";
};

// ── CSS bersama ───────────────────────────────────────────────
const SDM_CSS = [
  ".sdm-page{max-width:900px;margin:0 auto}",
  ".sdm-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:22px}",
  ".sdm-title{font-size:20px;font-weight:700;color:var(--txt);letter-spacing:-.02em}",
  ".sdm-sub{font-size:12px;color:var(--txt3);margin-top:2px}",
  ".sdm-hactions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
  ".sdm-bulan-sel{padding:7px 12px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:12px;font-family:var(--ff);color:var(--txt);background:var(--surface);outline:none;cursor:pointer}",
  ".sdm-bulan-sel:focus{border-color:var(--accent)}",
  ".sdm-btn-add{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-md);font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .15s}",
  ".sdm-btn-add:hover{opacity:.85}",
  ".sdm-badge{display:inline-block;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap}",
  ".sdm-badge-green{background:#d4edda;color:#1a6b2a}",
  ".sdm-badge-orange{background:#fff3cd;color:#856404}",
  ".sdm-badge-red{background:var(--red-bg);color:var(--red)}",
  ".sdm-badge-blue{background:#d1ecf1;color:#0c5460}",
  ".sdm-badge-purple{background:#e8d5f5;color:#6f42c1}",
  ".sdm-badge-siang{background:#fff8e1;color:#e65100}",
  ".sdm-badge-malam{background:#e8eaf6;color:#3949ab}",
  // Tabel utama
  ".sdm-table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}",
  ".sdm-table{width:100%;border-collapse:collapse}",
  ".sdm-table th{padding:10px 16px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em;text-align:left;white-space:nowrap}",
  ".sdm-table th.r{text-align:right}",
  ".sdm-table th.c{text-align:center}",
  ".sdm-table td{padding:12px 16px;border-bottom:1px solid var(--border);vertical-align:middle;font-size:13px;color:var(--txt)}",
  ".sdm-table tr:last-child td{border-bottom:none}",
  ".sdm-table tr:hover td{background:var(--surface2)}",
  ".sdm-table td.r{text-align:right;font-family:var(--ff-mono);font-size:12px}",
  ".sdm-table td.c{text-align:center}",
  ".sdm-td-nama{font-weight:600;color:var(--txt)}",
  ".sdm-td-jabatan{font-size:11px;color:var(--txt3);margin-top:2px}",
  ".sdm-td-red{color:var(--red);font-family:var(--ff-mono);font-size:12px}",
  ".sdm-td-green{color:var(--green);font-family:var(--ff-mono);font-size:12px}",
  ".sdm-td-muted{color:var(--txt3);font-size:12px}",
  ".sdm-act-group{display:flex;align-items:center;gap:4px;justify-content:flex-end}",
  ".sdm-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid transparent;text-decoration:none;transition:opacity .15s;font-family:var(--ff)}",
  ".sdm-btn:hover{opacity:.8}",
  ".sdm-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent)}",
  ".sdm-btn-secondary{background:var(--surface2);color:var(--txt2);border-color:var(--border2)}",
  ".sdm-btn-danger{background:var(--red-bg);color:var(--red);border-color:rgba(184,48,48,.25)}",
  ".sdm-btn-warn{background:#fff3cd;color:#856404;border-color:#ffc107}",
  // Modal
  ".sdm-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:none;align-items:center;justify-content:center;padding:16px}",
  ".sdm-modal-overlay.open{display:flex}",
  ".sdm-modal{background:var(--surface);border-radius:var(--r-lg);padding:22px;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.18)}",
  ".sdm-modal-title{font-size:15px;font-weight:700;color:var(--txt);margin-bottom:16px;display:flex;align-items:center;gap:8px}",
  ".sdm-modal-close{margin-left:auto;background:none;border:none;cursor:pointer;color:var(--txt3);font-size:18px;padding:0 2px}",
  ".sdm-fmg{margin-bottom:12px}",
  ".sdm-lbl{display:block;font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}",
  ".sdm-inp{width:100%;padding:9px 12px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:13px;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;box-sizing:border-box}",
  ".sdm-inp:focus{border-color:var(--accent);background:var(--surface)}",
  ".sdm-sel{width:100%;padding:9px 12px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:13px;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;cursor:pointer}",
  ".sdm-modal-info{font-size:12px;color:var(--txt2);background:var(--surface2);border-radius:var(--r-md);padding:8px 10px;margin-bottom:12px}",
  ".sdm-modal-info strong{color:var(--txt)}",
  ".sdm-modal-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}",
  // Detail page
  ".sdm-info-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;margin-bottom:20px}",
  ".sdm-info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:12px}",
  ".sdm-info-item{}",
  ".sdm-info-lbl{font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em}",
  ".sdm-info-val{font-size:13px;color:var(--txt);margin-top:2px;font-weight:500}",
  ".sdm-rekap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;margin-bottom:20px}",
  ".sdm-rekap-title{font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}",
  ".sdm-rekap-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px}",
  ".sdm-rekap-row:last-child{border-bottom:none;font-weight:700;font-size:14px;padding-top:8px}",
  ".sdm-rekap-row span:last-child{font-family:var(--ff-mono)}",
  ".sdm-trx-list{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}",
  ".sdm-trx-head{display:grid;grid-template-columns:1fr 110px 80px;padding:8px 16px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em}",
  ".sdm-trx-row{display:grid;grid-template-columns:1fr 110px 80px;padding:10px 16px;border-bottom:1px solid var(--border);align-items:center;font-size:12px}",
  ".sdm-trx-row:last-child{border-bottom:none}",
  ".sdm-trx-tipe{display:flex;align-items:center;gap:6px}",
  ".sdm-trx-ket{font-size:11px;color:var(--txt3);margin-top:1px}",
  ".sdm-trx-jml{font-family:var(--ff-mono);font-size:12px;font-weight:600}",
  ".sdm-trx-jml.out{color:var(--red)}",
  ".sdm-trx-jml.in{color:var(--green)}",
  ".sdm-trx-act{display:flex;justify-content:flex-end}",
  ".sdm-empty{padding:32px;text-align:center;font-size:13px;color:var(--txt3)}",
  ".sdm-empty i{font-size:28px;display:block;margin-bottom:8px;opacity:.35}",
  ".sdm-add-trx{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;margin-bottom:20px}",
  ".sdm-add-trx-title{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:6px}",
  ".sdm-add-trx-title i{font-size:14px;color:var(--accent)}",
  ".sdm-add-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
  "@media(max-width:500px){.sdm-add-form-grid{grid-template-columns:1fr}.sdm-stat-row{grid-template-columns:1fr}}",
  ".metode-btn{display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border:1.5px solid var(--border2);border-radius:var(--r-md);font-size:12px;font-weight:600;color:var(--txt2);transition:all .15s;user-select:none}",
  "input[name=metode]:checked + .metode-btn{background:var(--green-bg);border-color:var(--accent);color:var(--accent)}",
].join("");

// ── Dashboard SDM ─────────────────────────────────────────────
export function sdmDashboard(karyawan = [], sdmTrx = [], bulan = "", adminAccounts = [], msg = "") {
  // Group sdmTrx by karyawan_id
  const trxByK = {};
  sdmTrx.forEach((t) => {
    if (!trxByK[t.karyawan_id]) trxByK[t.karyawan_id] = [];
    trxByK[t.karyawan_id].push(t);
  });

  // Lookup username by karyawan nama (match via display_name)
  const userByName = {};
  adminAccounts.forEach((a) => { userByName[a.display_name.toLowerCase()] = a.username; });

  // ── CSS tambahan untuk card layout ───────────────────────────
  const CARD_CSS = [
    ".sdm-cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:4px}",
    ".sdm-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .15s}",
    ".sdm-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}",
    // head
    ".sdm-card-head{display:flex;align-items:center;gap:12px;padding:16px 18px}",
    ".sdm-av{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex-shrink:0;letter-spacing:-.02em}",
    ".sdm-av-siang{background:linear-gradient(135deg,#f59e0b,#ef4444)}",
    ".sdm-av-malam{background:linear-gradient(135deg,#6366f1,#8b5cf6)}",
    ".sdm-card-info{flex:1;min-width:0}",
    ".sdm-card-nama{font-size:15px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".sdm-card-meta{font-size:11px;color:var(--txt3);margin-top:3px;display:flex;align-items:center;gap:5px;flex-wrap:wrap}",
    // progress
    ".sdm-card-prog{padding:0 18px 12px}",
    ".sdm-prog-track{height:5px;background:var(--border);border-radius:99px;overflow:hidden}",
    ".sdm-prog-fill{height:100%;border-radius:99px;transition:width .3s}",
    ".sdm-prog-fill-none{background:var(--border)}",
    ".sdm-prog-fill-part{background:#f59e0b}",
    ".sdm-prog-fill-full{background:var(--accent)}",
    ".sdm-prog-label{font-size:10px;color:var(--txt3);margin-top:4px;display:flex;justify-content:space-between}",
    // stats
    ".sdm-card-stats{display:grid;grid-template-columns:1fr 1fr 1fr;padding:12px 18px;gap:4px;background:var(--surface2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}",
    ".sdm-stat-item{}",
    ".sdm-stat-lbl{font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em}",
    ".sdm-stat-val{font-size:12px;font-weight:700;color:var(--txt);font-family:var(--ff-mono);margin-top:3px}",
    ".sdm-stat-val.red{color:var(--red)}",
    ".sdm-stat-val.green{color:var(--green)}",
    ".sdm-stat-val.muted{color:var(--txt3);font-weight:400}",
    ".sdm-stat-sub{font-size:10px;color:var(--txt3);margin-top:1px}",
    // actions
    ".sdm-card-actions{display:flex;gap:6px;padding:12px 18px;margin-top:auto}",
    ".sdm-card-actions .sdm-btn{flex:1;justify-content:center;font-size:11px;padding:7px 4px}",
    "@media(max-width:600px){.sdm-cards-grid{grid-template-columns:1fr}}",
  ].join("");

  // ── Summary strip ─────────────────────────────────────────────
  const totalGaji    = karyawan.reduce((s, k) => s + (Number(k.gaji_pokok) || 0), 0);
  const totalKasbon  = karyawan.reduce((s, k) => {
    const trxK = trxByK[k.id] || [];
    return s + trxK.filter((t) => t.tipe === "kasbon").reduce((a, t) => a + Number(t.jumlah), 0)
             - trxK.filter((t) => t.tipe === "kembali_kasbon").reduce((a, t) => a + Number(t.jumlah), 0);
  }, 0);
  const totalSisa    = karyawan.reduce((s, k) => {
    const r = hitungRingkasan(k, trxByK[k.id] || []);
    return s + r.sisa;
  }, 0);
  const summaryStrip = karyawan.length > 0
    ? "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px\">"
      + "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px 16px\">"
      + "<div style=\"font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em\">Total Gaji Bulan Ini</div>"
      + "<div style=\"font-size:15px;font-weight:700;color:var(--txt);font-family:var(--ff-mono);margin-top:4px\">" + rp(totalGaji) + "</div></div>"
      + "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px 16px\">"
      + "<div style=\"font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em\">Kasbon Berjalan</div>"
      + "<div style=\"font-size:15px;font-weight:700;font-family:var(--ff-mono);margin-top:4px;color:" + (totalKasbon > 0 ? "var(--red)" : "var(--txt3)") + "\">" + (totalKasbon > 0 ? rp(totalKasbon) : "—") + "</div></div>"
      + "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px 16px\">"
      + "<div style=\"font-size:10px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em\">Sisa Belum Dibayar</div>"
      + "<div style=\"font-size:15px;font-weight:700;font-family:var(--ff-mono);margin-top:4px;color:" + (totalSisa > 0 ? "var(--red)" : "var(--green)") + "\">" + (totalSisa > 0 ? rp(totalSisa) : "✓ Lunas") + "</div></div>"
      + "</div>"
    : "";

  // ── Cards ─────────────────────────────────────────────────────
  const cards = karyawan.length > 0
    ? karyawan.map((k) => {
        const trxK  = trxByK[k.id] || [];
        const r     = hitungRingkasan(k, trxK);
        const nama  = escHtml(k.nama);
        const shift = k.shift || "siang";
        const _words = k.nama.trim().split(/\s+/);
        const inits  = _words.length > 1
          ? _words.slice(0, 2).map((w) => w[0]).join("").toUpperCase()
          : k.nama.trim().slice(0, 2).toUpperCase();
        const pct   = r.gajiPokok > 0 ? Math.min(100, Math.round(r.totalDibayarkan / r.gajiPokok * 100)) : 0;
        const progCls = pct >= 100 ? "sdm-prog-fill-full" : pct > 0 ? "sdm-prog-fill-part" : "sdm-prog-fill-none";
        const shiftBadge = "<span class=\"sdm-badge sdm-badge-" + shift + "\" style=\"font-size:10px\">"
          + (shift === "malam" ? "☽ Malam" : "☀ Siang") + "</span>";

        const adminUser = userByName[k.nama.toLowerCase()] || null;
        const makanBtn = (shift === "malam" && k.uang_makan > 0)
          ? "<button type=\"button\" class=\"sdm-btn\" style=\"flex:1;justify-content:center;font-size:11px;padding:7px 4px;background:#e8eaf6;color:#3949ab;border:1px solid #c5cae9;border-radius:6px\" onclick=\"openSdmModal('makan_harian'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "','" + k.uang_makan + "')\"><i class=\"ti ti-bowl-spoon\"></i> Makan</button>"
          : "";

        return "<div class=\"sdm-card\">"
          // head
          + "<div class=\"sdm-card-head\">"
          + "<div class=\"sdm-av sdm-av-" + shift + "\">" + inits + "</div>"
          + "<div class=\"sdm-card-info\">"
          + "<div class=\"sdm-card-nama\">" + nama + "</div>"
          + "<div class=\"sdm-card-meta\">" + escHtml(k.jabatan || "—") + " " + shiftBadge + "</div>"
          + (adminUser ? "<div style=\"font-size:10px;color:var(--txt3);margin-top:3px;font-family:var(--ff-mono)\">@" + escHtml(adminUser) + "</div>" : "")
          + "</div>"
          + statusBadge(r.status)
          + "</div>"
          // progress
          + "<div class=\"sdm-card-prog\">"
          + "<div class=\"sdm-prog-track\"><div class=\"sdm-prog-fill " + progCls + "\" style=\"width:" + pct + "%\"></div></div>"
          + "<div class=\"sdm-prog-label\"><span>" + pct + "% gaji dibayar</span>"
          + (r.makanCount > 0 ? "<span style=\"color:var(--txt3)\">" + r.makanCount + "× makan</span>" : "")
          + "</div></div>"
          // stats
          + "<div class=\"sdm-card-stats\">"
          + "<div class=\"sdm-stat-item\"><div class=\"sdm-stat-lbl\">Gaji Pokok</div>"
          + "<div class=\"sdm-stat-val\">" + rp(r.gajiPokok) + "</div>"
          + (r.uangMakanHari > 0 ? "<div class=\"sdm-stat-sub\">+ " + rp(r.uangMakanHari) + "/hari</div>" : "")
          + "</div>"
          + "<div class=\"sdm-stat-item\"><div class=\"sdm-stat-lbl\">Kasbon</div>"
          + "<div class=\"sdm-stat-val " + (r.kasbon > 0 ? "red" : "muted") + "\">" + (r.kasbon > 0 ? rp(r.kasbon) : "—") + "</div></div>"
          + "<div class=\"sdm-stat-item\"><div class=\"sdm-stat-lbl\">Sisa Gaji</div>"
          + "<div class=\"sdm-stat-val " + (r.sisa > 0 ? "red" : "green") + "\">" + (r.sisa > 0 ? rp(r.sisa) : "✓ Lunas") + "</div></div>"
          + "</div>"
          // actions
          + "<div class=\"sdm-card-actions\">"
          + "<a href=\"/operasional/sdm/" + k.id + "?bulan=" + bulan + "\" class=\"sdm-btn sdm-btn-secondary\"><i class=\"ti ti-eye\"></i> Detail</a>"
          + makanBtn
          + "<button type=\"button\" class=\"sdm-btn sdm-btn-warn\" onclick=\"openSdmModal('kasbon'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "')\"><i class=\"ti ti-cash\"></i> Kasbon</button>"
          + "<button type=\"button\" class=\"sdm-btn sdm-btn-primary\" onclick=\"openSdmModal('gaji'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "')\"><i class=\"ti ti-wallet\"></i> Bayar</button>"
          + "</div>"
          + "</div>";
      }).join("")
    : "<div class=\"sdm-empty\" style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:48px 24px;text-align:center\">"
      + "<i class=\"ti ti-users\" style=\"font-size:32px;display:block;margin-bottom:10px;opacity:.3\"></i>"
      + "Belum ada karyawan. <a href=\"/operasional/sdm/karyawan/tambah\" style=\"color:var(--accent)\">Tambah sekarang</a></div>";

  // Bulan selector — 12 bulan terakhir
  const now    = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = d.toISOString().slice(0, 7);
    months.push("<option value=\"" + v + "\"" + (v === bulan ? " selected" : "") + ">" + bulanLabel(v) + "</option>");
  }

  return docHeadV4("SDM & Penggajian")
    + "<style>" + SDM_CSS + CARD_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-users\"></i></div>"
    + "<div><div class=\"topbar-name\">SDM & Penggajian</div><div class=\"topbar-label\">Operasional</div></div>"
    + "</div></header>"
    + "<div class=\"page\"><div class=\"sdm-page\">"

    + "<div class=\"sdm-header\">"
    + "<div><div class=\"sdm-title\">Manajemen SDM</div>"
    + "<div class=\"sdm-sub\">Karyawan aktif: " + karyawan.length + " orang · " + bulanLabel(bulan) + "</div></div>"
    + "<div class=\"sdm-hactions\">"
    + "<form method=\"get\" action=\"/operasional/sdm\" style=\"display:inline\">"
    + "<select name=\"bulan\" class=\"sdm-bulan-sel\" onchange=\"this.form.submit()\">" + months.join("") + "</select>"
    + "</form>"
    + "<button type=\"button\" class=\"sdm-btn-add\" onclick=\"openAddKaryawan()\"><i class=\"ti ti-plus\" style=\"font-size:15px\"></i> Tambah Karyawan</button>"
    + "<a href=\"/operasional/sdm/akun\" class=\"sdm-btn sdm-btn-secondary\" style=\"font-size:11px\" title=\"Kelola Akun Admin\"><i class=\"ti ti-key\"></i> Akun</a>"
    + "</div></div>"

    // Toast — sukses & gagal
    + renderSdmToast(msg)

    + summaryStrip
    + "<div class=\"sdm-cards-grid\">" + cards + "</div>"
    + "</div></div></div></div>"

    // Modal tambah karyawan
    + "<div class=\"sdm-modal-overlay\" id=\"addKaryawanOv\" onclick=\"closeAddKaryawan()\">"
    + "<div class=\"sdm-modal\" style=\"max-width:480px;max-height:90vh;overflow-y:auto\" onclick=\"event.stopPropagation()\">"
    + "<div class=\"sdm-modal-title\"><i class=\"ti ti-user-plus\"></i><span>Tambah Karyawan</span>"
    + "<button class=\"sdm-modal-close\" onclick=\"closeAddKaryawan()\"><i class=\"ti ti-x\"></i></button></div>"
    + "<form method=\"post\" action=\"/operasional/sdm/karyawan/tambah\" id=\"addKaryawanForm\">"
    + "<input type=\"hidden\" name=\"redirect_to\" value=\"/operasional/sdm?bulan=" + bulan + "\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Nama Lengkap *</label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"nama\" placeholder=\"Nama karyawan\" required autocomplete=\"off\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Jabatan</label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"jabatan\" placeholder=\"Kasir, Barista, Jaga Malam, dll\"></div>"
    + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Gaji Pokok (Rp) *</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"gaji_pokok\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\" required></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Shift</label>"
    + "<select class=\"sdm-sel\" name=\"shift\" id=\"addShiftSel\" onchange=\"toggleMakanWrap()\">"
    + "<option value=\"siang\">☀ Shift Siang</option>"
    + "<option value=\"malam\">☽ Shift Malam</option>"
    + "</select></div></div>"
    + "<div id=\"addMakanWrap\" style=\"display:none;display:grid;grid-template-columns:1fr 1fr;gap:10px\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Uang Makan/Hari (Rp)</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"uang_makan\" id=\"addUangMakan\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Hari Kerja/Bulan</label>"
    + "<input class=\"sdm-inp\" type=\"number\" name=\"hari_kerja\" value=\"26\" min=\"1\" max=\"31\"></div>"
    + "</div>"
    + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Nomor HP</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"tel\" name=\"telepon\" placeholder=\"08xxxxxxxxxx\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Tanggal Mulai</label>"
    + "<input class=\"sdm-inp\" type=\"date\" name=\"tgl_mulai\"></div>"
    + "</div>"
    + "<div class=\"sdm-modal-foot\">"
    + "<button type=\"button\" class=\"sdm-btn sdm-btn-secondary\" onclick=\"closeAddKaryawan()\">Batal</button>"
    + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\"><i class=\"ti ti-check\"></i> Tambah</button>"
    + "</div></form></div></div>"

    // Modal transaksi
    + "<div class=\"sdm-modal-overlay\" id=\"sdmModalOv\" onclick=\"closeSdmModal()\">"
    + "<div class=\"sdm-modal\" onclick=\"event.stopPropagation()\">"
    + "<div class=\"sdm-modal-title\"><i class=\"ti ti-cash\" id=\"sdmModalIcon\"></i><span id=\"sdmModalTitle\">Transaksi</span>"
    + "<button class=\"sdm-modal-close\" onclick=\"closeSdmModal()\"><i class=\"ti ti-x\"></i></button></div>"
    + "<div class=\"sdm-modal-info\" id=\"sdmModalInfo\"></div>"
    + "<form method=\"post\" action=\"/operasional/sdm/transaksi\" id=\"sdmModalForm\">"
    + "<input type=\"hidden\" name=\"karyawan_id\" id=\"sdmFKid\">"
    + "<input type=\"hidden\" name=\"tipe\" id=\"sdmFTipe\">"
    + "<input type=\"hidden\" name=\"bulan\" id=\"sdmFBulan\">"
    + "<input type=\"hidden\" name=\"redirect_to\" id=\"sdmFRedirect\" value=\"/operasional/sdm?bulan=" + bulan + "\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Jumlah (Rp)</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" id=\"sdmFJumlah\" name=\"jumlah\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\" required></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Metode Pembayaran</label>"
    + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">"
    + "<label style=\"cursor:pointer\"><input type=\"radio\" name=\"metode\" value=\"cash\" checked style=\"display:none\"><div class=\"metode-btn\"><i class=\"ti ti-cash\"></i> Cash</div></label>"
    + "<label style=\"cursor:pointer\"><input type=\"radio\" name=\"metode\" value=\"transfer\" style=\"display:none\"><div class=\"metode-btn\"><i class=\"ti ti-building-bank\"></i> Transfer</div></label>"
    + "</div></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Keterangan <span style=\"font-weight:400;text-transform:none\">(opsional)</span></label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"keterangan\" placeholder=\"Catatan...\"></div>"
    + "<div class=\"sdm-modal-foot\">"
    + "<button type=\"button\" class=\"sdm-btn sdm-btn-secondary\" onclick=\"closeSdmModal()\">Batal</button>"
    + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\">Simpan</button>"
    + "</div></form></div></div>"

    + "<script>"
    + "function openSdmModal(tipe,kid,nama,gaji,sisa,bulan,makanHari){"
    + "var labels={gaji:'Bayar Gaji',kasbon:'Catat Kasbon',kembali_kasbon:'Kembali Kasbon',thr:'Bayar THR',bonus:'Bayar Bonus',makan_harian:'Makan Harian'};"
    + "document.getElementById('sdmModalTitle').textContent=labels[tipe]||tipe;"
    + "document.getElementById('sdmFKid').value=kid;"
    + "document.getElementById('sdmFTipe').value=tipe;"
    + "document.getElementById('sdmFBulan').value=bulan;"
    + "var infoEl=document.getElementById('sdmModalInfo');"
    + "infoEl.innerHTML='<strong>'+nama+'</strong> &nbsp;|&nbsp; Total gaji: <strong>Rp '+Number(gaji).toLocaleString('id-ID')+'</strong>'+(tipe==='gaji'?' &nbsp;|&nbsp; Sisa: <strong>Rp '+Number(sisa).toLocaleString('id-ID')+'</strong>':'');"
    + "var jEl=document.getElementById('sdmFJumlah');"
    + "if(tipe==='gaji'&&sisa>0){jEl.value=Number(sisa).toLocaleString('id-ID');}"
    + "else if(tipe==='makan_harian'&&makanHari>0){jEl.value=Number(makanHari).toLocaleString('id-ID');}"
    + "else{jEl.value='';}"
    + "var radC=document.querySelector('#sdmModalForm input[name=metode][value=cash]');if(radC)radC.checked=true;"
    + "document.getElementById('sdmModalOv').classList.add('open');"
    + "setTimeout(function(){jEl.focus();},80);}"
    + "function closeSdmModal(){document.getElementById('sdmModalOv').classList.remove('open');}"
    + "function sdmFmtJ(el){var raw=el.value.replace(/\\D/g,'');el.value=raw?Number(raw).toLocaleString('id-ID'):''}"
    + "function openAddKaryawan(){document.getElementById('addKaryawanOv').classList.add('open');setTimeout(function(){document.querySelector('#addKaryawanForm [name=nama]').focus();},80);}"
    + "function closeAddKaryawan(){document.getElementById('addKaryawanOv').classList.remove('open');document.getElementById('addKaryawanForm').reset();document.getElementById('addMakanWrap').style.display='none';}"
    + "function toggleMakanWrap(){var s=document.getElementById('addShiftSel').value;document.getElementById('addMakanWrap').style.display=s==='malam'?'grid':'none';}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}

// ── Toast helper (sukses/gagal) — dipakai sdmDashboard & sdmDetailPage
function renderSdmToast(msg) {
  const MSG = {
    tambah_ok:      { kind: "ok",  text: "Karyawan berhasil ditambahkan." },
    edit_ok:        { kind: "ok",  text: "Data karyawan berhasil disimpan." },
    nonaktif_ok:    { kind: "ok",  text: "Karyawan berhasil dinonaktifkan." },
    trx_gaji:       { kind: "ok",  text: "Pembayaran gaji berhasil dicatat." },
    trx_kasbon:     { kind: "ok",  text: "Kasbon berhasil dicatat." },
    trx_kembali:    { kind: "ok",  text: "Pengembalian kasbon berhasil dicatat." },
    trx_thr:        { kind: "ok",  text: "THR berhasil dicatat." },
    trx_bonus:      { kind: "ok",  text: "Bonus berhasil dicatat." },
    trx_makan:      { kind: "ok",  text: "Jatah makan berhasil dicatat." },
    trx_ok:         { kind: "ok",  text: "Transaksi berhasil dicatat." },
    trx_hapus_ok:   { kind: "ok",  text: "Transaksi berhasil dihapus." },
    err_tambah:     { kind: "err", text: "Gagal — nama dan gaji pokok wajib diisi." },
    err_edit:       { kind: "err", text: "Gagal menyimpan data karyawan." },
    err_trx:        { kind: "err", text: "Gagal mencatat transaksi — cek isian." },
    err_hapus:      { kind: "err", text: "Gagal menghapus transaksi." },
    err:            { kind: "err", text: "Terjadi kesalahan, coba lagi." },
  };
  const m = MSG[msg];
  if (!m) return "";
  const css = m.kind === "ok"
    ? "background:#d4edda;color:#1a6b2a;border:1px solid #b8dacc"
    : "background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25)";
  const ic  = m.kind === "ok" ? "ti-check" : "ti-alert-circle";
  return "<div style=\"" + css + ";border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px\">"
    + "<i class=\"ti " + ic + "\"></i> " + escHtml(m.text) + "</div>";
}

// ── Detail karyawan ───────────────────────────────────────────
export function sdmDetailPage(karyawan, allTrx = [], bulan = "", msg = "") {
  const trxBulan = allTrx.filter((t) => t.bulan === bulan);
  const r        = hitungRingkasan(karyawan, trxBulan);

  // ── Riwayat bulanan dgn cutoff & carry-forward kasbon ─────────
  // (1) Cutoff: bulan paling awal = max(tgl_mulai, earliest_trx_bulan). Sebelum itu di-skip.
  const HISTORY_MONTHS = 12;
  const allBulansInData = [...new Set(allTrx.map((t) => t.bulan).filter(Boolean))].sort();
  const earliestTrxStr = allBulansInData[0];
  let cutoffMo = -Infinity;
  if (earliestTrxStr) {
    const [ey, em] = earliestTrxStr.split("-").map(Number);
    if (ey && em) cutoffMo = ey * 12 + (em - 1);
  }
  const tglMulaiObj = karyawan.tgl_mulai ? new Date(karyawan.tgl_mulai) : null;
  if (tglMulaiObj && !isNaN(tglMulaiObj)) {
    const tm = tglMulaiObj.getFullYear() * 12 + tglMulaiObj.getMonth();
    cutoffMo = Math.max(cutoffMo, tm);
  }
  // (2) Carry-forward: kelebihan bayar di bulan X jadi kasbon (advance) bulan X+1.
  //     Hitung running carry dari cutoff sampai bulan ini.
  const nowD = new Date();
  const nowMo = nowD.getFullYear() * 12 + nowD.getMonth();
  const carryByBulan = {};
  let runningCarry = 0;
  if (cutoffMo > -Infinity) {
    for (let mo = cutoffMo; mo <= nowMo; mo++) {
      const y2 = Math.floor(mo / 12);
      const m2 = mo % 12;
      const bk = y2 + "-" + String(m2 + 1).padStart(2, "0");
      const trxB = allTrx.filter((t) => t.bulan === bk);
      const rB = hitungRingkasan(karyawan, trxB);
      const effectiveTarget = Math.max(0, rB.gajiPokok - runningCarry);
      const excess = rB.totalDibayarkan - effectiveTarget;
      let statusE;
      if (rB.totalDibayarkan + runningCarry >= rB.gajiPokok && rB.gajiPokok > 0) statusE = "lunas";
      else if (rB.totalDibayarkan + runningCarry > 0) statusE = "sebagian";
      else statusE = "belum";
      carryByBulan[bk] = {
        carryIn: runningCarry,
        effectiveTarget,
        excess: Math.max(0, excess),
        statusEffective: statusE,
      };
      runningCarry = Math.max(0, excess);
    }
  }
  // (2b) Kalau ada carry-out dari bulan ini, propagate ke bulan2 future
  //      sampai carry consumed (max 6 bulan ke depan).
  let endMo = nowMo;
  if (runningCarry > 0 && cutoffMo > -Infinity) {
    const MAX_FUTURE = 6;
    let extMo = nowMo + 1;
    while (runningCarry > 0 && extMo <= nowMo + MAX_FUTURE) {
      const y2 = Math.floor(extMo / 12);
      const m2 = extMo % 12;
      const bk = y2 + "-" + String(m2 + 1).padStart(2, "0");
      const trxB = allTrx.filter((t) => t.bulan === bk); // future biasanya kosong
      const rB = hitungRingkasan(karyawan, trxB);
      const effectiveTarget = Math.max(0, rB.gajiPokok - runningCarry);
      const excess = rB.totalDibayarkan - effectiveTarget;
      let statusE;
      if (rB.totalDibayarkan + runningCarry >= rB.gajiPokok && rB.gajiPokok > 0) statusE = "lunas";
      else if (rB.totalDibayarkan + runningCarry > 0) statusE = "sebagian";
      else statusE = "belum";
      carryByBulan[bk] = {
        carryIn: runningCarry,
        effectiveTarget,
        excess: Math.max(0, excess),
        statusEffective: statusE,
      };
      runningCarry = Math.max(0, excess);
      endMo = extMo;
      extMo++;
    }
  }
  // (3) Build history rows (max 12, dari endMo ke belakang, sampai cutoff)
  const historyData = [];
  for (let i = 0; i < HISTORY_MONTHS; i++) {
    const targetMo = endMo - i;
    if (targetMo < cutoffMo) break;
    const y = Math.floor(targetMo / 12);
    const m = targetMo % 12;
    const bulanKey = y + "-" + String(m + 1).padStart(2, "0");
    const trxMo = allTrx.filter((t) => t.bulan === bulanKey);
    const sum = hitungRingkasan(karyawan, trxMo);
    const cInfo = carryByBulan[bulanKey] || { carryIn: 0, excess: 0, effectiveTarget: sum.gajiPokok, statusEffective: sum.status };
    const isFuture = targetMo > nowMo;
    historyData.push({ bulan: bulanKey, summary: sum, carryInfo: cInfo, isFuture });
  }

  const HARI = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  // Bulan selector
  const bulans = [...new Set(allTrx.map((t) => t.bulan))];
  if (!bulans.includes(bulan)) bulans.unshift(bulan);
  bulans.sort((a, b) => b.localeCompare(a));
  const bulanOpts = bulans.map((b) =>
    "<option value=\"" + b + "\"" + (b === bulan ? " selected" : "") + ">" + bulanLabel(b) + "</option>"
  ).join("");

  // Avatar inisial
  const shift = karyawan.shift || "siang";
  const _w    = karyawan.nama.trim().split(/\s+/);
  const inits = _w.length > 1 ? _w.slice(0, 2).map((w) => w[0]).join("").toUpperCase() : karyawan.nama.trim().slice(0, 2).toUpperCase();

  const tglMulai = karyawan.tgl_mulai
    ? new Date(karyawan.tgl_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  // Progress
  const pct      = r.gajiPokok > 0 ? Math.min(100, Math.round(r.totalDibayarkan / r.gajiPokok * 100)) : 0;
  const progColor = pct >= 100 ? "var(--accent)" : pct > 0 ? "#f59e0b" : "var(--border)";

  // ── Riwayat timeline ────────────────────────────────────────
  const timeline = trxBulan.length > 0
    ? trxBulan.map((t) => {
        const isIn   = t.tipe === "kembali_kasbon";
        const color  = TIPE_COLOR[t.tipe] || "orange";
        const d      = new Date(t.created_at);
        const hariNm = HARI[d.getDay()];
        const tglStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        const jamStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
        const hapusUrl = "/operasional/sdm/transaksi/hapus?id=" + encodeURIComponent(t.id)
          + "&redirect=/operasional/sdm/" + karyawan.id + "%3Fbulan=" + bulan;

        return "<div style=\"display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)\">"
          // dot
          + "<div style=\"display:flex;flex-direction:column;align-items:center;padding-top:3px\">"
          + "<div style=\"width:10px;height:10px;border-radius:50%;background:var(--accent);flex-shrink:0\"></div>"
          + "<div style=\"flex:1;width:1px;background:var(--border);margin-top:4px\"></div>"
          + "</div>"
          // content
          + "<div style=\"flex:1;min-width:0\">"
          + "<div style=\"display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap\">"
          + "<div>"
          + "<span class=\"sdm-badge sdm-badge-" + color + "\" style=\"font-size:11px\">" + (TIPE_LABEL[t.tipe] || t.tipe) + "</span>"
          + "<div style=\"font-size:11px;color:var(--txt3);margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap\">"
          + "<span><i class=\"ti ti-calendar\" style=\"font-size:10px;margin-right:3px\"></i>" + hariNm + ", " + tglStr + "</span>"
          + "<span><i class=\"ti ti-clock\" style=\"font-size:10px;margin-right:2px\"></i>" + jamStr + "</span>"
          + "<span style=\"background:" + (t.metode === "transfer" ? "#dbeafe" : "#d4edda") + ";color:" + (t.metode === "transfer" ? "#1e40af" : "#1a6b2a") + ";padding:1px 7px;border-radius:20px;font-size:10px;font-weight:600\">"
          + (t.metode === "transfer" ? "🏦 Transfer" : "💵 Cash") + "</span>"
          + "</div>"
          + (t.keterangan ? "<div style=\"font-size:12px;color:var(--txt2);margin-top:5px;font-style:italic\">\"" + escHtml(t.keterangan) + "\"</div>" : "")
          + "</div>"
          + "<div style=\"display:flex;align-items:center;gap:8px;flex-shrink:0\">"
          + "<div style=\"font-size:13px;font-weight:700;font-family:var(--ff-mono);color:" + (isIn ? "var(--green)" : "var(--red)") + "\">"
          + (isIn ? "+" : "−") + rp(t.jumlah) + "</div>"
          + "<a href=\"" + hapusUrl + "\" onclick=\"return confirm('Hapus transaksi ini?')\" style=\"display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:var(--red-bg);color:var(--red);text-decoration:none;font-size:12px\"><i class=\"ti ti-trash\"></i></a>"
          + "</div></div>"
          + "</div></div>";
      }).join("")
    : "<div class=\"sdm-empty\" style=\"padding:36px 0;border:none\"><i class=\"ti ti-inbox\" style=\"font-size:28px;display:block;margin-bottom:8px;opacity:.3\"></i>Belum ada transaksi bulan ini</div>";

  // ── CSS tambahan ─────────────────────────────────────────────
  const DETAIL_CSS = [
    ".det-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}",
    "@media(max-width:640px){.det-grid{grid-template-columns:1fr}}",
    ".det-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;margin-bottom:16px}",
    ".det-card-title{font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:6px}",
    ".det-card-title i{font-size:13px;color:var(--accent)}",
    ".det-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}",
    ".det-row:last-child{border-bottom:none;font-weight:700;font-size:14px;padding-top:10px;margin-top:2px}",
    ".det-row span:last-child{font-family:var(--ff-mono);font-size:12px}",
    // Riwayat Bulanan
    ".sdm-hist-list{display:flex;flex-direction:column;gap:4px}",
    ".sdm-hist-row{display:grid;grid-template-columns:110px 1fr auto auto;gap:12px;align-items:center;padding:10px 12px;border-radius:8px;text-decoration:none;color:inherit;transition:background .15s,border-color .15s;border:1px solid transparent}",
    ".sdm-hist-row:hover{background:var(--surface2);border-color:var(--border)}",
    ".sdm-hist-row-active{background:rgba(45,102,36,.06);border-color:var(--accent)}",
    ".sdm-hist-bulan{font-size:13px;font-weight:600;color:var(--txt)}",
    ".sdm-hist-bar-wrap{display:flex;align-items:center;gap:8px;min-width:0}",
    ".sdm-hist-bar{flex:1;height:6px;background:var(--border);border-radius:99px;overflow:hidden;min-width:60px}",
    ".sdm-hist-bar-fill{height:100%;transition:width .3s;border-radius:99px}",
    ".sdm-hist-bar-lunas{background:#16a34a}",
    ".sdm-hist-bar-sebagian{background:#f59e0b}",
    ".sdm-hist-bar-belum{background:transparent}",
    ".sdm-hist-pct{font-size:10.5px;color:var(--txt3);font-weight:600;font-family:var(--ff-mono);min-width:32px;text-align:right}",
    ".sdm-hist-amt{font-family:var(--ff-mono);font-size:12px;color:var(--txt2);text-align:right;white-space:nowrap}",
    ".sdm-hist-amt small{color:var(--txt3);display:block;font-size:10px;margin-top:1px}",
    ".sdm-hist-carry{color:#6366f1;font-weight:500;font-size:10px;display:block;margin-top:2px;font-family:var(--ff-mono)}",
    ".sdm-hist-excess{color:#16a34a;font-weight:600;font-size:9.5px;display:block;margin-top:2px;font-family:var(--ff-mono)}",
    ".sdm-hist-row-future{background:linear-gradient(180deg,rgba(99,102,241,.04),transparent);border-style:dashed}",
    ".sdm-hist-future-tag{display:inline-block;font-size:9px;font-weight:700;color:#6366f1;background:rgba(99,102,241,.12);padding:1px 6px;border-radius:99px;margin-left:6px;text-transform:uppercase;letter-spacing:.04em;vertical-align:1px}",
    "@media(max-width:640px){.sdm-hist-row{grid-template-columns:90px 1fr auto;font-size:12px}.sdm-hist-amt{display:none}}",
  ].join("");

  return docHeadV4("SDM — " + karyawan.nama)
    + "<style>" + SDM_CSS + DETAIL_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<a href=\"/operasional/sdm\" style=\"color:var(--accent);font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;text-decoration:none;margin-right:10px\"><i class=\"ti ti-arrow-left\"></i> SDM</a>"
    + "<div><div class=\"topbar-name\">" + escHtml(karyawan.nama) + "</div><div class=\"topbar-label\">Detail Karyawan</div></div>"
    + "</div></header>"
    + "<div class=\"page\"><div class=\"sdm-page\" style=\"max-width:760px\">"

    + renderSdmToast(msg)

    // ── Hero card karyawan ──────────────────────────────────────
    + "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 22px;margin-bottom:16px\">"
    + "<div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap\">"
    + "<div style=\"width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;background:" + (shift === "malam" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#f59e0b,#ef4444)") + "\">" + inits + "</div>"
    + "<div style=\"flex:1;min-width:0\">"
    + "<div style=\"font-size:18px;font-weight:700;color:var(--txt)\">" + escHtml(karyawan.nama) + "</div>"
    + "<div style=\"display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap\">"
    + "<span style=\"font-size:12px;color:var(--txt3)\">" + escHtml(karyawan.jabatan || "—") + "</span>"
    + "<span class=\"sdm-badge sdm-badge-" + shift + "\" style=\"font-size:10px\">" + (shift === "malam" ? "☽ Malam" : "☀ Siang") + "</span>"
    + "</div></div>"
    + "<div style=\"display:flex;gap:6px;flex-shrink:0\">"
    + "<a href=\"/operasional/sdm/karyawan/" + karyawan.id + "/edit\" class=\"sdm-btn sdm-btn-secondary\"><i class=\"ti ti-edit\"></i> Edit</a>"
    + "<a href=\"/operasional/sdm/karyawan/" + karyawan.id + "/nonaktif\" class=\"sdm-btn sdm-btn-danger\" onclick=\"return confirm('Nonaktifkan karyawan ini?')\"><i class=\"ti ti-user-off\"></i> Nonaktif</a>"
    + "</div></div>"
    + "<div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)\">"
    + "<div><div class=\"sdm-info-lbl\">Gaji Pokok</div><div class=\"sdm-info-val\">" + rp(karyawan.gaji_pokok) + "<span style=\"font-size:10px;color:var(--txt3)\">/bln</span></div></div>"
    + (Number(karyawan.uang_makan) > 0 ? "<div><div class=\"sdm-info-lbl\">Uang Makan</div><div class=\"sdm-info-val\">" + rp(karyawan.uang_makan) + "<span style=\"font-size:10px;color:var(--txt3)\">/hari</span></div></div>" : "")
    + "<div><div class=\"sdm-info-lbl\">Telepon</div><div class=\"sdm-info-val\">" + escHtml(karyawan.telepon || "—") + "</div></div>"
    + "<div><div class=\"sdm-info-lbl\">Mulai Kerja</div><div class=\"sdm-info-val\">" + tglMulai + "</div></div>"
    + "</div></div>"

    // ── Bulan selector ─────────────────────────────────────────
    + "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px\">"
    + "<div style=\"font-size:14px;font-weight:600;color:var(--txt)\">Rekap <span style=\"color:var(--accent)\">" + bulanLabel(bulan) + "</span></div>"
    + "<form method=\"get\" action=\"/operasional/sdm/" + karyawan.id + "\"><select name=\"bulan\" class=\"sdm-bulan-sel\" onchange=\"this.form.submit()\">" + bulanOpts + "</select></form>"
    + "</div>"

    // ── Grid: Ringkasan + Catat Transaksi ──────────────────────
    + "<div class=\"det-grid\">"

    // Ringkasan gaji
    + "<div class=\"det-card\">"
    + "<div class=\"det-card-title\"><i class=\"ti ti-report-money\"></i> Ringkasan Gaji</div>"
    + "<div style=\"margin-bottom:12px\">"
    + "<div style=\"display:flex;justify-content:space-between;font-size:11px;color:var(--txt3);margin-bottom:5px\"><span>" + pct + "% dibayar</span><span>" + statusBadge(r.status) + "</span></div>"
    + "<div style=\"height:6px;background:var(--border);border-radius:99px;overflow:hidden\"><div style=\"height:100%;width:" + pct + "%;background:" + progColor + ";border-radius:99px\"></div></div>"
    + "</div>"
    + "<div class=\"det-row\"><span>Gaji Pokok</span><span>" + rp(r.gajiPokok) + "</span></div>"
    + (r.kasbon > 0 ? "<div class=\"det-row\"><span style=\"color:var(--red)\">− Kasbon</span><span style=\"color:var(--red)\">" + rp(r.kasbon) + "</span></div>" : "")
    + (r.kembali > 0 ? "<div class=\"det-row\"><span style=\"color:var(--green)\">+ Kembali Kasbon</span><span style=\"color:var(--green)\">" + rp(r.kembali) + "</span></div>" : "")
    + (r.dibayar > 0 ? "<div class=\"det-row\"><span style=\"color:var(--red)\">− Gaji Dibayar</span><span style=\"color:var(--red)\">" + rp(r.dibayar) + "</span></div>" : "")
    + (r.thr > 0 ? "<div class=\"det-row\"><span style=\"color:var(--red)\">− THR</span><span style=\"color:var(--red)\">" + rp(r.thr) + "</span></div>" : "")
    + (r.bonus > 0 ? "<div class=\"det-row\"><span style=\"color:var(--red)\">− Bonus</span><span style=\"color:var(--red)\">" + rp(r.bonus) + "</span></div>" : "")
    + "<div class=\"det-row\"><span>Sisa Harus Dibayar</span><span style=\"color:" + (r.sisa > 0 ? "var(--red)" : "var(--green)") + ";font-size:14px\">" + (r.sisa > 0 ? rp(r.sisa) : "✓ Lunas") + "</span></div>"
    + "</div>"

    // Catat transaksi
    + "<div class=\"det-card\">"
    + "<div class=\"det-card-title\"><i class=\"ti ti-circle-plus\"></i> Catat Transaksi</div>"
    + "<form method=\"post\" action=\"/operasional/sdm/transaksi\">"
    + "<input type=\"hidden\" name=\"karyawan_id\" value=\"" + karyawan.id + "\">"
    + "<input type=\"hidden\" name=\"bulan\" value=\"" + bulan + "\">"
    + "<input type=\"hidden\" name=\"redirect_to\" value=\"/operasional/sdm/" + karyawan.id + "?bulan=" + bulan + "\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Tipe</label>"
    + "<select class=\"sdm-sel\" name=\"tipe\">"
    + "<option value=\"gaji\">Bayar Gaji</option>"
    + "<option value=\"kasbon\">Kasbon</option>"
    + "<option value=\"kembali_kasbon\">Kembali Kasbon</option>"
    + "<option value=\"thr\">THR</option>"
    + "<option value=\"bonus\">Bonus</option>"
    + (karyawan.shift === "malam" ? "<option value=\"makan_harian\">Makan Harian</option>" : "")
    + "</select></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Jumlah (Rp)</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"jumlah\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\" required></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Metode Pembayaran</label>"
    + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">"
    + "<label style=\"cursor:pointer\">"
    + "<input type=\"radio\" name=\"metode\" value=\"cash\" checked style=\"display:none\" onchange=\"updateMetodeBtn()\">"
    + "<div class=\"metode-btn\" data-val=\"cash\"><i class=\"ti ti-cash\"></i> Cash</div></label>"
    + "<label style=\"cursor:pointer\">"
    + "<input type=\"radio\" name=\"metode\" value=\"transfer\" style=\"display:none\" onchange=\"updateMetodeBtn()\">"
    + "<div class=\"metode-btn\" data-val=\"transfer\"><i class=\"ti ti-building-bank\"></i> Transfer</div></label>"
    + "</div></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Keterangan <span style=\"font-weight:400;text-transform:none\">(opsional)</span></label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"keterangan\" placeholder=\"Catatan tambahan...\"></div>"
    + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\" style=\"width:100%;justify-content:center;padding:10px\"><i class=\"ti ti-check\"></i> Simpan Transaksi</button>"
    + "</form></div>"

    + "</div>" // end det-grid

    // ── Riwayat Bulanan dgn carry-forward kasbon ──────────────────
    + (historyData.length > 0
        ? "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;margin-bottom:16px\">"
          + "<div class=\"det-card-title\"><i class=\"ti ti-calendar-stats\"></i> Riwayat Bulanan <span style=\"margin-left:auto;font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:20px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--txt3)\">" + historyData.length + " bulan</span></div>"
          + "<div class=\"sdm-hist-list\">"
          + historyData.map((h) => {
              const sm = h.summary;
              const ci = h.carryInfo;
              const statusE = ci.statusEffective;
              const pct = sm.gajiPokok > 0 ? Math.min(100, Math.round((sm.totalDibayarkan + ci.carryIn) / sm.gajiPokok * 100)) : 0;
              const isActive = h.bulan === bulan;
              const url = "/operasional/sdm/" + karyawan.id + "?bulan=" + h.bulan;
              const futureBadge = h.isFuture
                ? "<small class=\"sdm-hist-future-tag\">Bulan depan</small>"
                : "";
              const carryInLbl = ci.carryIn > 0
                ? (h.isFuture
                    ? "<small class=\"sdm-hist-carry\">sudah diambil " + rp(ci.carryIn) + " (kasbon dari bulan lalu)</small>"
                    : "<small class=\"sdm-hist-carry\">+ kasbon lalu " + rp(ci.carryIn) + "</small>")
                : "";
              const excessLbl  = ci.excess > 0  ? "<small class=\"sdm-hist-excess\">excess → bln depan " + rp(ci.excess) + "</small>" : "";
              return "<a href=\"" + url + "\" class=\"sdm-hist-row" + (isActive ? " sdm-hist-row-active" : "") + (h.isFuture ? " sdm-hist-row-future" : "") + "\">"
                + "<div class=\"sdm-hist-bulan\">" + bulanLabel(h.bulan) + futureBadge + carryInLbl + "</div>"
                + "<div class=\"sdm-hist-bar-wrap\"><div class=\"sdm-hist-bar\"><div class=\"sdm-hist-bar-fill sdm-hist-bar-" + statusE + "\" style=\"width:" + pct + "%\"></div></div><div class=\"sdm-hist-pct\">" + pct + "%</div></div>"
                + "<div class=\"sdm-hist-amt\">" + rp(sm.totalDibayarkan) + "<small>/ " + rp(sm.gajiPokok) + "</small>" + excessLbl + "</div>"
                + statusBadge(statusE)
                + "</a>";
            }).join("")
          + "</div>"
          + "</div>"
        : "")

    // ── Timeline riwayat ────────────────────────────────────────
    + "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;margin-bottom:16px\">"
    + "<div class=\"det-card-title\"><i class=\"ti ti-history\"></i> Riwayat Transaksi — " + bulanLabel(bulan) + " <span style=\"margin-left:auto;font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:20px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--txt3)\">" + trxBulan.length + " transaksi</span></div>"
    + "<div>" + timeline + "</div>"
    + "</div>"

    + "</div></div></div></div>"
    + "<script>"
    + "function sdmFmtJ(el){var raw=el.value.replace(/\\D/g,'');el.value=raw?Number(raw).toLocaleString('id-ID'):''}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}

// ── Halaman PIN ───────────────────────────────────────────────
export function sdmPinPage(showErr = false, redirect = "/operasional/sdm") {
  const PIN_CSS = [
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    "body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:var(--ff)}",
    ".pin-wrap{width:100%;max-width:360px;padding:24px 16px}",
    ".pin-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:32px 28px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08)}",
    ".pin-icon{width:52px;height:52px;border-radius:14px;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px}",
    ".pin-title{font-size:18px;font-weight:700;color:var(--txt);margin-bottom:4px}",
    ".pin-sub{font-size:12px;color:var(--txt3);margin-bottom:24px}",
    ".pin-err{background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.2);border-radius:8px;padding:9px 12px;font-size:12px;margin-bottom:16px}",
    ".pin-inp{width:100%;padding:12px 16px;border:1px solid var(--border2);border-radius:var(--r-md);font-size:22px;letter-spacing:6px;text-align:center;font-family:var(--ff);color:var(--txt);background:var(--surface2);outline:none;margin-bottom:14px;transition:border-color .15s}",
    ".pin-inp:focus{border-color:var(--accent);background:var(--surface)}",
    ".pin-btn{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-md);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--ff);transition:opacity .15s}",
    ".pin-btn:hover{opacity:.85}",
    ".pin-back{display:block;margin-top:14px;font-size:11px;color:var(--txt3);text-decoration:none}",
    ".pin-back:hover{color:var(--accent)}",
  ].join("");

  const errHtml = showErr
    ? "<div class=\"pin-err\"><i class=\"ti ti-alert-circle\" style=\"margin-right:4px\"></i>PIN salah. Coba lagi.</div>"
    : "";

  return docHeadV4("SDM — Masuk")
    + "<style>" + PIN_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"pin-wrap\"><div class=\"pin-card\">"
    + "<div class=\"pin-icon\"><i class=\"ti ti-users\"></i></div>"
    + "<div class=\"pin-title\">SDM & Penggajian</div>"
    + "<div class=\"pin-sub\">Masukkan PIN untuk melanjutkan</div>"
    + errHtml
    + "<form method=\"post\" action=\"/operasional/sdm/pin\">"
    + "<input type=\"hidden\" name=\"redirect_to\" value=\"" + escHtml(redirect) + "\">"
    + "<input class=\"pin-inp\" type=\"password\" name=\"pin\" inputmode=\"numeric\" maxlength=\"8\" placeholder=\"••••\" autocomplete=\"off\" autofocus>"
    + "<button class=\"pin-btn\" type=\"submit\"><i class=\"ti ti-lock-open\" style=\"margin-right:6px\"></i>Masuk</button>"
    + "</form>"
    + "<a href=\"/\" class=\"pin-back\">← Kembali ke beranda</a>"
    + "</div></div>"
    + "</body></html>";
}

// ── Form tambah / edit karyawan ───────────────────────────────
export function sdmFormKaryawan(existing = null, showErr = false) {
  const isEdit  = !!existing;
  const title   = isEdit ? "Edit Karyawan" : "Tambah Karyawan";
  const action  = isEdit
    ? "/operasional/sdm/karyawan/" + existing.id + "/edit"
    : "/operasional/sdm/karyawan/tambah";

  const v = (field, fallback = "") => escHtml(existing ? (existing[field] ?? fallback) : fallback);
  const gajiVal     = existing ? Number(existing.gaji_pokok).toLocaleString("id-ID") : "";
  const makanVal    = existing && existing.uang_makan ? Number(existing.uang_makan).toLocaleString("id-ID") : "";
  const hariKerjaV  = existing?.hari_kerja ?? 26;
  const tglVal      = existing?.tgl_mulai ? new Date(existing.tgl_mulai).toISOString().slice(0, 10) : "";

  const errHtml = showErr
    ? "<div style=\"background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px\">Nama dan gaji pokok wajib diisi.</div>"
    : "";

  return docHeadV4(title)
    + "<style>" + SDM_CSS
    + ".sdm-form-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:24px;max-width:480px}"
    + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<a href=\"/operasional/sdm\" style=\"color:var(--accent);font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;text-decoration:none;margin-right:10px\"><i class=\"ti ti-arrow-left\"></i> SDM</a>"
    + "<div><div class=\"topbar-name\">" + title + "</div><div class=\"topbar-label\">SDM</div></div>"
    + "</div></header>"
    + "<div class=\"page\">"
    + errHtml
    + "<div class=\"sdm-form-card\">"
    + "<form method=\"post\" action=\"" + action + "\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Nama Lengkap *</label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"nama\" value=\"" + v("nama") + "\" placeholder=\"Nama karyawan\" required></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Jabatan</label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"jabatan\" value=\"" + v("jabatan") + "\" placeholder=\"Kasir, Barista, Jaga Malam, dll\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Gaji Pokok (Rp) *</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"gaji_pokok\" value=\"" + gajiVal + "\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\" required></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Uang Makan per Hari (Rp) <span style=\"font-weight:400;text-transform:none\">(opsional — khusus shift malam)</span></label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"uang_makan\" id=\"inpMakan\" value=\"" + makanVal + "\" placeholder=\"0\" oninput=\"sdmFmtJ(this);toggleHariKerja()\"></div>"
    + "<div class=\"sdm-fmg\" id=\"wrapHariKerja\" style=\"" + (Number(existing?.uang_makan) > 0 ? "" : "display:none") + "\"><label class=\"sdm-lbl\">Hari Kerja per Bulan</label>"
    + "<input class=\"sdm-inp\" type=\"number\" name=\"hari_kerja\" value=\"" + hariKerjaV + "\" min=\"1\" max=\"31\" placeholder=\"26\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Nomor HP</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"tel\" name=\"telepon\" value=\"" + v("telepon") + "\" placeholder=\"08xxxxxxxxxx\"></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Shift</label>"
    + "<select class=\"sdm-sel\" name=\"shift\">"
    + "<option value=\"siang\"" + ((!existing || existing.shift === "siang") ? " selected" : "") + ">☀ Shift Siang</option>"
    + "<option value=\"malam\"" + (existing?.shift === "malam" ? " selected" : "") + ">☽ Shift Malam</option>"
    + "</select></div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Tanggal Mulai Kerja</label>"
    + "<input class=\"sdm-inp\" type=\"date\" name=\"tgl_mulai\" value=\"" + tglVal + "\"></div>"
    + "<div style=\"display:flex;gap:8px;margin-top:6px\">"
    + "<a href=\"/operasional/sdm\" class=\"sdm-btn sdm-btn-secondary\" style=\"flex:1;justify-content:center;padding:10px\">Batal</a>"
    + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\" style=\"flex:2;justify-content:center;padding:10px\">"
    + "<i class=\"ti ti-check\"></i> " + (isEdit ? "Simpan Perubahan" : "Tambah Karyawan") + "</button>"
    + "</div></form></div>"
    + "</div></div></div>"
    + "<script>"
    + "function sdmFmtJ(el){var raw=el.value.replace(/\\D/g,'');el.value=raw?Number(raw).toLocaleString('id-ID'):''}"
    + "function toggleHariKerja(){var v=document.getElementById('inpMakan').value.replace(/\\D/g,'');document.getElementById('wrapHariKerja').style.display=parseInt(v)>0?'':'none';}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}

// ── Halaman Kelola Akun Admin ─────────────────────────────────
export function sdmAkunPage(accounts = [], msg = "", err = "") {
  const ROLE_BADGE = {
    owner:    "<span class=\"sdm-badge sdm-badge-purple\" style=\"font-size:10px\">👑 Owner</span>",
    karyawan: "<span class=\"sdm-badge sdm-badge-blue\"   style=\"font-size:10px\">🧑 Karyawan</span>",
  };

  const ERR_MSG = {
    username:      "Username minimal 3 karakter.",
    username_fmt:  "Username hanya boleh huruf kecil, angka, dan underscore (tanpa spasi).",
    username_taken:"Username sudah dipakai akun lain, pilih yang lain.",
    pin:           "PIN harus berupa angka minimal 4 digit.",
    server:        "Terjadi kesalahan server. Coba lagi.",
    invalid:       "ID akun tidak valid.",
  };

  const toast = msg === "ok"
    ? "<div style=\"background:#d4edda;color:#1a6b2a;border:1px solid #b8dacc;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:18px;display:flex;align-items:center;gap:8px\"><i class=\"ti ti-check\"></i> Akun berhasil diperbarui.</div>"
    : err
    ? "<div style=\"background:var(--red-bg);color:var(--red);border:1px solid rgba(184,48,48,.25);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:18px;display:flex;align-items:center;gap:8px\"><i class=\"ti ti-alert-circle\"></i> " + (ERR_MSG[err] || "Terjadi kesalahan.") + "</div>"
    : "";

  const cards = accounts.map((a) => {
    const badge = ROLE_BADGE[a.role] || ROLE_BADGE.karyawan;
    return "<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 22px;margin-bottom:14px\">"
      + "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:16px\">"
      + "<div style=\"width:36px;height:36px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:16px\">"
      + (a.role === "owner" ? "👑" : "🧑") + "</div>"
      + "<div><div style=\"font-size:14px;font-weight:700;color:var(--txt)\">" + escHtml(a.display_name) + "</div>"
      + "<div style=\"margin-top:3px\">" + badge + "</div></div>"
      + "</div>"
      + "<form method=\"post\" action=\"/operasional/sdm/akun/" + a.id + "\">"
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px\" class=\"akun-form-grid\">"
      + "<div><label class=\"sdm-lbl\">Username</label>"
      + "<input class=\"sdm-inp\" type=\"text\" name=\"username\" value=\"" + escHtml(a.username) + "\" required minlength=\"3\" pattern=\"[a-z0-9_]+\" placeholder=\"min 3 karakter\" autocomplete=\"off\"></div>"
      + "<div><label class=\"sdm-lbl\">PIN (angka)</label>"
      + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" name=\"pin\" value=\"" + escHtml(a.pin) + "\" required minlength=\"4\" pattern=\"[0-9]+\" placeholder=\"min 4 digit\" autocomplete=\"off\"></div>"
      + "</div>"
      + (a.role === "karyawan"
        ? "<div style=\"margin-bottom:12px\"><label class=\"sdm-lbl\">Shift Default</label>"
          + "<select class=\"sdm-inp\" name=\"shift\">"
          +   "<option value=\"siang\"" + ((a.shift || "siang") === "siang" ? " selected" : "") + ">☀️ Siang</option>"
          +   "<option value=\"malam\"" + (a.shift === "malam" ? " selected" : "") + ">🌙 Malam</option>"
          + "</select>"
          + "<div style=\"font-size:10.5px;color:var(--txt3);margin-top:4px\">Modal Catat Transaksi → Sesi Waktu auto-pilih ini.</div>"
        + "</div>"
        : "<input type=\"hidden\" name=\"shift\" value=\"siang\">")
      + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\" style=\"width:100%;justify-content:center;padding:9px\"><i class=\"ti ti-device-floppy\"></i> Simpan</button>"
      + "</form></div>";
  }).join("");

  const empty = accounts.length === 0
    ? "<div class=\"sdm-empty\"><i class=\"ti ti-user-off\"></i>Belum ada akun. Tunggu migrasi database selesai.</div>"
    : "";

  return docHeadV4("Kelola Akun Admin")
    + "<style>" + SDM_CSS
    + "@media(max-width:500px){.akun-form-grid{grid-template-columns:1fr!important}}"
    + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<a href=\"/operasional/sdm\" style=\"color:var(--accent);font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;text-decoration:none;margin-right:10px\"><i class=\"ti ti-arrow-left\"></i> SDM</a>"
    + "<div><div class=\"topbar-name\">Kelola Akun Admin</div><div class=\"topbar-label\">SDM</div></div>"
    + "</div></header>"
    + "<div class=\"page\"><div class=\"sdm-page\" style=\"max-width:620px\">"
    + "<div class=\"sdm-header\">"
    + "<div><div class=\"sdm-title\">Akun Login Admin</div>"
    + "<div class=\"sdm-sub\">Atur username & PIN untuk akses dashboard /admin</div></div>"
    + "</div>"
    + toast
    + cards + empty
    + "<div style=\"font-size:11px;color:var(--txt3);margin-top:4px;padding:10px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)\">"
    + "<i class=\"ti ti-info-circle\" style=\"margin-right:4px\"></i>"
    + "Perubahan langsung berlaku saat login berikutnya. Username: huruf kecil, angka, underscore. PIN: angka minimal 4 digit."
    + "</div>"
    + "</div></div></div></div>"
    + "<script>"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}
