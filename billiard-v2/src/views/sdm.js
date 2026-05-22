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
].join("");

// ── Dashboard SDM ─────────────────────────────────────────────
export function sdmDashboard(karyawan = [], sdmTrx = [], bulan = "") {
  // Group sdmTrx by karyawan_id
  const trxByK = {};
  sdmTrx.forEach((t) => {
    if (!trxByK[t.karyawan_id]) trxByK[t.karyawan_id] = [];
    trxByK[t.karyawan_id].push(t);
  });

  const tableBody = karyawan.length > 0
    ? karyawan.map((k) => {
        const trxK = trxByK[k.id] || [];
        const r    = hitungRingkasan(k, trxK);
        const nama = escHtml(k.nama);
        const shift = k.shift || "siang";
        const shiftBadge = "<span class=\"sdm-badge sdm-badge-" + shift + "\" style=\"margin-top:3px;display:inline-block\">"
          + (shift === "malam" ? "☽ Malam" : "☀ Siang") + "</span>";
        return "<tr>"
          + "<td><div class=\"sdm-td-nama\">" + nama + "</div>"
          + "<div class=\"sdm-td-jabatan\">" + escHtml(k.jabatan || "—") + "</div>"
          + shiftBadge + "</td>"
          + "<td class=\"r\"><div>" + rp(r.gajiPokok) + "</div>"
          + (r.uangMakanHari > 0 ? "<div style=\"font-size:10px;color:var(--txt3);margin-top:1px\">+ makan " + rp(r.uangMakanHari) + "/hari</div>" : "")
          + "</td>"
          + "<td class=\"r\">" + (r.kasbon > 0 ? "<span class=\"sdm-td-red\">" + rp(r.kasbon) + "</span>" : "<span class=\"sdm-td-muted\">—</span>") + "</td>"
          + "<td class=\"r\">" + (r.sisa > 0 ? "<span class=\"sdm-td-red\">" + rp(r.sisa) + "</span>" : "<span class=\"sdm-td-green\">✓ Lunas</span>") + "</td>"
          + "<td class=\"c\">" + statusBadge(r.status) + "</td>"
          + "<td><div class=\"sdm-act-group\">"
          + "<a href=\"/operasional/sdm/" + k.id + "?bulan=" + bulan + "\" class=\"sdm-btn sdm-btn-secondary\"><i class=\"ti ti-eye\"></i> Detail</a>"
          + (shift === "malam" && k.uang_makan > 0
              ? "<button type=\"button\" class=\"sdm-btn\" style=\"background:#e8eaf6;color:#3949ab;border-color:#c5cae9\" onclick=\"openSdmModal('makan_harian'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "','" + k.uang_makan + "')\"><i class=\"ti ti-bowl-spoon\"></i> Makan</button>"
              : "")
          + "<button type=\"button\" class=\"sdm-btn sdm-btn-warn\" onclick=\"openSdmModal('kasbon'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "')\"><i class=\"ti ti-cash\"></i> Kasbon</button>"
          + "<button type=\"button\" class=\"sdm-btn sdm-btn-primary\" onclick=\"openSdmModal('gaji'," + k.id + ",'" + nama + "'," + r.gajiPokok + "," + r.sisa + ",'" + bulan + "')\"><i class=\"ti ti-wallet\"></i> Bayar</button>"
          + "</div></td>"
          + "</tr>";
      }).join("")
    : "<tr><td colspan=\"6\" class=\"sdm-empty\"><i class=\"ti ti-users\"></i>Belum ada karyawan. <a href=\"/operasional/sdm/karyawan/tambah\" style=\"color:var(--accent)\">Tambah sekarang</a></td></tr>";

  // Bulan selector — 12 bulan terakhir
  const now    = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = d.toISOString().slice(0, 7);
    months.push("<option value=\"" + v + "\"" + (v === bulan ? " selected" : "") + ">" + bulanLabel(v) + "</option>");
  }

  return docHeadV4("SDM & Penggajian")
    + "<style>" + SDM_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-users\"></i></div>"
    + "<div><div class=\"topbar-name\">SDM & Penggajian</div><div class=\"topbar-label\">Operasional</div></div>"
    + "</div></header>"
    + "<div class=\"page\"><div class=\"sdm-page\">"

    // Header
    + "<div class=\"sdm-header\">"
    + "<div><div class=\"sdm-title\">Manajemen SDM</div>"
    + "<div class=\"sdm-sub\">Karyawan aktif: " + karyawan.length + " orang</div></div>"
    + "<div class=\"sdm-hactions\">"
    + "<form method=\"get\" action=\"/operasional/sdm\" style=\"display:inline\">"
    + "<select name=\"bulan\" class=\"sdm-bulan-sel\" onchange=\"this.form.submit()\">" + months.join("") + "</select>"
    + "</form>"
    + "<a href=\"/operasional/sdm/karyawan/tambah\" class=\"sdm-btn-add\"><i class=\"ti ti-plus\" style=\"font-size:15px\"></i> Tambah Karyawan</a>"
    + "<a href=\"/operasional/sdm/akun\" class=\"sdm-btn sdm-btn-secondary\" style=\"font-size:11px\" title=\"Kelola Akun Admin\"><i class=\"ti ti-key\"></i> Akun</a>"
    + "<a href=\"/operasional/sdm/logout\" class=\"sdm-btn sdm-btn-secondary\" style=\"font-size:11px\" title=\"Keluar PIN\"><i class=\"ti ti-lock\"></i></a>"
    + "</div></div>"

    // Tabel karyawan
    + "<div class=\"sdm-table-wrap\"><table class=\"sdm-table\">"
    + "<thead><tr>"
    + "<th>Nama / Jabatan</th>"
    + "<th class=\"r\">Gaji Pokok</th>"
    + "<th class=\"r\">Kasbon</th>"
    + "<th class=\"r\">Sisa Gaji</th>"
    + "<th class=\"c\">Status</th>"
    + "<th class=\"r\">Aksi</th>"
    + "</tr></thead>"
    + "<tbody>" + tableBody + "</tbody>"
    + "</table></div>"
    + "</div></div></div></div>"

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
    + "<input type=\"hidden\" name=\"redirect_to\" id=\"sdmFRedirect\" value=\"" + "/operasional/sdm?bulan=" + bulan + "\">"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Jumlah (Rp)</label>"
    + "<input class=\"sdm-inp\" type=\"text\" inputmode=\"numeric\" id=\"sdmFJumlah\" name=\"jumlah\" placeholder=\"0\" oninput=\"sdmFmtJ(this)\" required></div>"
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
    + "document.getElementById('sdmModalOv').classList.add('open');"
    + "setTimeout(function(){jEl.focus();},80);}"
    + "function closeSdmModal(){document.getElementById('sdmModalOv').classList.remove('open');}"
    + "function sdmFmtJ(el){var raw=el.value.replace(/\\D/g,'');el.value=raw?Number(raw).toLocaleString('id-ID'):''}"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin';}"
    + "</script>"
    + buildFinanceBottomNav()
    + "</body></html>";
}

// ── Detail karyawan ───────────────────────────────────────────
export function sdmDetailPage(karyawan, allTrx = [], bulan = "") {
  const trxBulan = allTrx.filter((t) => t.bulan === bulan);
  const r        = hitungRingkasan(karyawan, trxBulan);

  // Bulan selector
  const bulans = [...new Set(allTrx.map((t) => t.bulan))];
  if (!bulans.includes(bulan)) bulans.unshift(bulan);
  bulans.sort((a, b) => b.localeCompare(a));
  const bulanOpts = bulans.map((b) =>
    "<option value=\"" + b + "\"" + (b === bulan ? " selected" : "") + ">" + bulanLabel(b) + "</option>"
  ).join("");

  // Riwayat transaksi bulan ini
  const trxRows = trxBulan.length > 0
    ? trxBulan.map((t) => {
        const isIn  = t.tipe === "kembali_kasbon";
        const color = TIPE_COLOR[t.tipe] || "orange";
        return "<div class=\"sdm-trx-row\">"
          + "<div><div class=\"sdm-trx-tipe\">"
          + "<span class=\"sdm-badge sdm-badge-" + color + "\">" + (TIPE_LABEL[t.tipe] || t.tipe) + "</span>"
          + "</div>"
          + (t.keterangan ? "<div class=\"sdm-trx-ket\">" + escHtml(t.keterangan) + "</div>" : "")
          + "<div style=\"font-size:10px;color:var(--txt3);margin-top:2px\">" + new Date(t.created_at).toLocaleDateString("id-ID") + "</div>"
          + "</div>"
          + "<div class=\"sdm-trx-jml " + (isIn ? "in" : "out") + "\">" + (isIn ? "+" : "-") + rp(t.jumlah) + "</div>"
          + "<div class=\"sdm-trx-act\">"
          + "<a href=\"/operasional/sdm/transaksi/hapus?id=" + encodeURIComponent(t.id) + "&redirect=/operasional/sdm/" + karyawan.id + "%3Fbulan=" + bulan + "\" class=\"sdm-btn sdm-btn-danger\" onclick=\"return confirm('Hapus transaksi ini?')\" style=\"padding:3px 7px;font-size:10px\"><i class=\"ti ti-trash\"></i></a>"
          + "</div></div>";
      }).join("")
    : "<div class=\"sdm-empty\"><i class=\"ti ti-inbox\"></i>Belum ada transaksi bulan ini</div>";

  const tglMulai = karyawan.tgl_mulai
    ? new Date(karyawan.tgl_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return docHeadV4("SDM — " + karyawan.nama)
    + "<style>" + SDM_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "sdm")
    + "<div class=\"main-wrap\"><header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<a href=\"/operasional/sdm\" style=\"color:var(--accent);font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;text-decoration:none;margin-right:10px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> SDM</a>"
    + "<div><div class=\"topbar-name\">" + escHtml(karyawan.nama) + "</div><div class=\"topbar-label\">Detail Karyawan</div></div>"
    + "</div></header>"
    + "<div class=\"page\"><div class=\"sdm-page\">"

    // Info karyawan
    + "<div class=\"sdm-info-card\">"
    + "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px\">"
    + "<div><div style=\"font-size:17px;font-weight:700;color:var(--txt)\">" + escHtml(karyawan.nama) + "</div>"
    + "<div style=\"font-size:12px;color:var(--txt3);margin-top:2px\">" + escHtml(karyawan.jabatan || "—") + "</div></div>"
    + "<div style=\"display:flex;gap:6px\">"
    + "<a href=\"/operasional/sdm/karyawan/" + karyawan.id + "/edit\" class=\"sdm-btn sdm-btn-secondary\"><i class=\"ti ti-edit\"></i> Edit</a>"
    + "<a href=\"/operasional/sdm/karyawan/" + karyawan.id + "/nonaktif\" class=\"sdm-btn sdm-btn-danger\" onclick=\"return confirm('Nonaktifkan karyawan ini?')\"><i class=\"ti ti-user-off\"></i> Nonaktif</a>"
    + "</div></div>"
    + "<div class=\"sdm-info-grid\">"
    + "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Gaji Pokok</div><div class=\"sdm-info-val\">" + rp(karyawan.gaji_pokok) + " / bln</div></div>"
    + (Number(karyawan.uang_makan) > 0
        ? "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Uang Makan</div><div class=\"sdm-info-val\">" + rp(karyawan.uang_makan) + "/hari <span style=\"color:var(--txt3);font-size:11px\">(di luar gaji)</span></div></div>"
        : "")
    + "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Shift</div><div class=\"sdm-info-val\"><span class=\"sdm-badge sdm-badge-" + (karyawan.shift || "siang") + "\">" + (karyawan.shift === "malam" ? "☽ Malam" : "☀ Siang") + "</span></div></div>"
    + "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Telepon</div><div class=\"sdm-info-val\">" + escHtml(karyawan.telepon || "—") + "</div></div>"
    + "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Mulai Kerja</div><div class=\"sdm-info-val\">" + tglMulai + "</div></div>"
    + "<div class=\"sdm-info-item\"><div class=\"sdm-info-lbl\">Status</div><div class=\"sdm-info-val\">" + escHtml(karyawan.status) + "</div></div>"
    + "</div></div>"

    // Bulan selector + rekap
    + "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px\">"
    + "<div style=\"font-size:14px;font-weight:600;color:var(--txt)\">Rekap " + bulanLabel(bulan) + "</div>"
    + "<form method=\"get\"><input type=\"hidden\" name=\"id\" value=\"" + karyawan.id + "\">"
    + "<select name=\"bulan\" class=\"sdm-bulan-sel\" onchange=\"this.form.submit()\">" + bulanOpts + "</select></form>"
    + "</div>"

    + "<div class=\"sdm-rekap\">"
    + "<div class=\"sdm-rekap-title\">Ringkasan Gaji</div>"
    + "<div class=\"sdm-rekap-row\"><span>Gaji Pokok</span><span>" + rp(r.gajiPokok) + "</span></div>"
    + (r.kasbon > 0 ? "<div class=\"sdm-rekap-row\"><span>Kasbon diambil</span><span style=\"color:var(--red)\">- " + rp(r.kasbon) + "</span></div>" : "")
    + (r.kembali > 0 ? "<div class=\"sdm-rekap-row\"><span>Kembali Kasbon</span><span style=\"color:var(--green)\">+ " + rp(r.kembali) + "</span></div>" : "")
    + (r.dibayar > 0 ? "<div class=\"sdm-rekap-row\"><span>Gaji Dibayar</span><span style=\"color:var(--red)\">- " + rp(r.dibayar) + "</span></div>" : "")
    + (r.thr > 0 ? "<div class=\"sdm-rekap-row\"><span>THR</span><span style=\"color:var(--red)\">- " + rp(r.thr) + "</span></div>" : "")
    + (r.bonus > 0 ? "<div class=\"sdm-rekap-row\"><span>Bonus</span><span style=\"color:var(--red)\">- " + rp(r.bonus) + "</span></div>" : "")
    + "<div class=\"sdm-rekap-row\"><span>Sisa yang Harus Dibayar</span><span style=\"color:" + (r.sisa > 0 ? "var(--red)" : "var(--green)") + "\">"
    + (r.sisa > 0 ? rp(r.sisa) : "✓ Lunas") + "</span></div>"
    + "</div>"


    // Form catat transaksi
    + "<div class=\"sdm-add-trx\">"
    + "<div class=\"sdm-add-trx-title\"><i class=\"ti ti-circle-plus\"></i> Catat Transaksi</div>"
    + "<form method=\"post\" action=\"/operasional/sdm/transaksi\">"
    + "<input type=\"hidden\" name=\"karyawan_id\" value=\"" + karyawan.id + "\">"
    + "<input type=\"hidden\" name=\"bulan\" value=\"" + bulan + "\">"
    + "<input type=\"hidden\" name=\"redirect_to\" value=\"/operasional/sdm/" + karyawan.id + "?bulan=" + bulan + "\">"
    + "<div class=\"sdm-add-form-grid\">"
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
    + "</div>"
    + "<div class=\"sdm-fmg\"><label class=\"sdm-lbl\">Keterangan <span style=\"font-weight:400;text-transform:none\">(opsional)</span></label>"
    + "<input class=\"sdm-inp\" type=\"text\" name=\"keterangan\" placeholder=\"Catatan tambahan...\"></div>"
    + "<button type=\"submit\" class=\"sdm-btn sdm-btn-primary\" style=\"width:100%;justify-content:center;padding:9px\"><i class=\"ti ti-check\"></i> Simpan</button>"
    + "</form></div>"

    // Riwayat transaksi
    + "<div class=\"sdm-trx-list\">"
    + "<div class=\"sdm-trx-head\"><div>Tipe / Keterangan</div><div>Jumlah</div><div style=\"text-align:right\">Aksi</div></div>"
    + trxRows
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
