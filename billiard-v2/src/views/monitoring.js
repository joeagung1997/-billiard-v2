// src/views/monitoring.js
// ── HTML views untuk Monitoring Karyawan ─────────────────────

import { docHeadV4, buildFinanceSidebar, buildFinanceBottomNav, escHtml } from "./finance.js";

// ── Format Rupiah ─────────────────────────────────────────────
const rp = (n) => {
  const abs = Math.abs(Math.round(Number(n) || 0));
  if (abs === 0) return "Rp 0";
  const s = String(abs);
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (Number(n) < 0 ? "-" : "") + "Rp " + parts.join(".");
};

// ── Shared CSS for monitoring pages ──────────────────────────
const MON_CSS = [
  ".mon-page{max-width:1000px;margin:0 auto}",
  ".mon-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}",
  ".mon-title{font-size:18px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:8px}",
  ".mon-title-icon{width:32px;height:32px;border-radius:10px;background:rgba(59,130,246,.12);color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}",
  ".mon-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:18px}",
  ".mon-filter label{font-size:11px;font-weight:600;color:var(--txt3);white-space:nowrap}",
  ".mon-chips{display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%;width:100%;margin-bottom:4px}",
  ".mon-chip{padding:6px 13px;background:var(--surface2);border:1px solid var(--border2);border-radius:18px;font-size:11px;font-weight:600;color:var(--txt2);cursor:pointer;font-family:var(--ff);transition:all .12s;white-space:nowrap}",
  ".mon-chip:hover{background:var(--surface);color:var(--txt)}",
  ".mon-chip.active{background:#3b82f6;border-color:#3b82f6;color:#fff}",
  ".mon-filter input,.mon-filter select{background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--txt);font-family:var(--ff);outline:none}",
  ".mon-filter input:focus,.mon-filter select:focus{border-color:var(--accent)}",
  ".mon-filter-btn{padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--ff);white-space:nowrap}",
  ".mon-tabs-wrap{margin-bottom:20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}",
  ".mon-tabs-wrap::-webkit-scrollbar{display:none}",
  ".mon-tabs{display:inline-flex;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:5px;width:fit-content}",
  ".mon-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;font-size:12px;font-weight:600;color:var(--txt3);text-decoration:none;border-radius:10px;transition:all .18s ease;white-space:nowrap;position:relative}",
  ".mon-tab i{font-size:15px;line-height:1}",
  ".mon-tab.active{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 2px 8px rgba(59,130,246,.35),0 0 0 1px rgba(255,255,255,.06) inset}",
  ".mon-tab:hover:not(.active){background:var(--surface);color:var(--txt)}",
  "@media(max-width:640px){.mon-tab{padding:9px 12px;font-size:11.5px;gap:5px}.mon-tab i{font-size:14px}}",
  ".mon-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:18px;box-shadow:0 1px 3px rgba(15,23,42,.04)}",
  ".mon-table{width:100%;border-collapse:separate;border-spacing:0}",
  ".mon-table thead th{padding:14px 18px;text-align:left;font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--border);white-space:nowrap;background:var(--surface2);position:sticky;top:0;z-index:1}",
  ".mon-table tbody td{padding:13px 18px;font-size:12.5px;color:var(--txt2);vertical-align:middle;border-bottom:1px solid var(--border);transition:background .14s ease,box-shadow .14s ease}",
  ".mon-table tbody tr:last-child td{border-bottom:none}",
  ".mon-table tbody tr:nth-child(even) td{background:rgba(148,163,184,.025)}",
  ".mon-table tbody tr:hover td{background:rgba(59,130,246,.07)}",
  ".mon-table tbody tr:hover td:first-child{box-shadow:inset 3px 0 0 0 #3b82f6}",
  ".mon-table td[style*=\"text-align:right\"],.mon-table th[style*=\"text-align:right\"]{font-variant-numeric:tabular-nums}",
  ".mon-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700}",
  ".mon-badge-in{background:rgba(34,197,94,.12);color:#22c55e}",
  ".mon-badge-out{background:rgba(239,68,68,.1);color:#ef4444}",
  ".mon-badge-ok{background:rgba(34,197,94,.12);color:#22c55e}",
  ".mon-badge-kurang{background:rgba(239,68,68,.1);color:#ef4444}",
  ".mon-badge-lebih{background:rgba(245,158,11,.12);color:#f59e0b}",
  ".mon-badge-siang{background:rgba(245,158,11,.1);color:#f59e0b}",
  ".mon-badge-malam{background:rgba(99,102,241,.1);color:#6366f1}",
  ".mon-empty{text-align:center;padding:56px 24px;color:var(--txt3);font-size:13px;line-height:1.6}",
  ".mon-empty i{font-size:46px;display:block;margin:0 auto 14px;opacity:.35;width:78px;height:78px;line-height:78px;border-radius:50%;background:var(--surface2)}",
  ".mon-sum-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:18px}",
  ".mon-sum-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}",
  ".mon-sum-lbl{font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}",
  ".mon-sum-val{font-size:16px;font-weight:700;font-family:var(--ff-mono,monospace)}",
  ".mon-sum-val.inc{color:#22c55e}",
  ".mon-sum-val.out{color:#ef4444}",
  ".mon-sum-val.acc{color:#3b82f6}",
  ".mon-sum-val.warn{color:#f59e0b}",
  // Modal
  ".mon-modal-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px}",
  ".mon-modal-overlay.open{display:flex}",
  ".mon-modal{background:var(--surface);border:1px solid var(--border);border-radius:18px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}",
  ".mon-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid var(--border)}",
  ".mon-modal-title{font-size:15px;font-weight:700;color:var(--txt)}",
  ".mon-modal-close{background:none;border:none;color:var(--txt3);cursor:pointer;font-size:18px;padding:4px}",
  ".mon-modal-body{padding:20px}",
  ".mon-field{margin-bottom:16px}",
  ".mon-label{display:block;font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}",
  ".mon-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:9px;padding:9px 12px;font-size:13px;color:var(--txt);font-family:var(--ff);outline:none;box-sizing:border-box}",
  ".mon-input:focus{border-color:var(--accent)}",
  ".mon-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
  ".mon-submit{width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--ff);margin-top:4px}",
  ".mon-submit:hover{opacity:.9}",
  ".mon-add-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--ff);text-decoration:none;white-space:nowrap}",
  ".mon-add-btn:hover{opacity:.9}",
  // Toast
  ".mon-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:9998;white-space:nowrap;pointer-events:none;opacity:0;transition:all .25s ease;display:flex;align-items:center;gap:8px}",
  ".mon-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}",
  ".mon-toast.ok{background:#dcfce7;color:#16a34a;border:1px solid rgba(34,197,94,.3)}",
  ".mon-toast.err{background:#fee2e2;color:#dc2626;border:1px solid rgba(239,68,68,.3)}",
  // Responsive
  "@media(max-width:640px){.mon-filter{flex-direction:column;align-items:stretch}.mon-filter input,.mon-filter select{width:100%}.mon-hide-mobile{display:none!important}}",
].join("");

// ── Shared page shell ─────────────────────────────────────────
function monPage(title, role, activeTab, bodyHtml, extraScript) {
  const tabs = [
    { id: "aktivitas", label: "Aktivitas Transaksi", href: "/operasional/monitoring/aktivitas", icon: "ti-list" },
    { id: "member",    label: "Aktivitas Member",    href: "/operasional/monitoring/member",    icon: "ti-users" },
    { id: "setoran",   label: "Setoran Shift",       href: "/operasional/monitoring/setoran",   icon: "ti-report-money" },
    { id: "selisih",   label: "Selisih Kas",         href: "/operasional/monitoring/selisih",   icon: "ti-scale" },
  ];

  const tabsHtml = tabs.map((t) =>
    "<a href=\"" + t.href + "\" class=\"mon-tab" + (t.id === activeTab ? " active" : "") + "\">"
    + "<i class=\"ti " + t.icon + "\"></i><span>" + t.label + "</span></a>"
  ).join("");

  return docHeadV4("Monitoring Karyawan")
    + "<style>" + MON_CSS + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "monitoring", role)
    + "<div class=\"main-wrap\">"

    // Topbar mobile
    + "<div class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div style=\"width:30px;height:30px;border-radius:8px;background:rgba(59,130,246,.12);display:flex;align-items:center;justify-content:center;font-size:15px;color:#3b82f6\"><i class=\"ti ti-chart-bar\"></i></div>"
    + "<div><div class=\"topbar-name\">Monitoring Karyawan</div><div class=\"topbar-label\">Pantau aktivitas &amp; setoran</div></div>"
    + "</div>"
    + "<div class=\"topbar-right\">"
    + "<button class=\"theme-btn\" onclick=\"toggleTheme()\" title=\"Ganti tema\"><i class=\"ti ti-sun\"></i></button>"
    + "</div>"
    + "</div>"

    + "<div class=\"page\" style=\"padding-bottom:80px\">"
    + "<div class=\"mon-page\">"

    // Header
    + "<div class=\"mon-hdr\">"
    + "<div class=\"mon-title\"><div class=\"mon-title-icon\"><i class=\"ti ti-chart-bar\"></i></div>Monitoring Karyawan</div>"
    + "</div>"

    // Tabs (pill segmented control)
    + "<div class=\"mon-tabs-wrap\"><div class=\"mon-tabs\">" + tabsHtml + "</div></div>"

    + bodyHtml

    + "</div>"
    + "</div>"
    + "</div>"
    + "</div>"
    + buildFinanceBottomNav(role)

    + "<script>"
    + "function goAdmin(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin?tk='+t:'/admin';}"
    + "function goMembers(){var t=localStorage.getItem('warpat_atk');window.location.href=t?'/admin/members?tk='+t:'/admin/members';}"
    + "function toggleTheme(){var d=document.documentElement;var cur=d.getAttribute('data-theme');d.setAttribute('data-theme',cur==='light'?'dark':'light');try{localStorage.setItem('theme',d.getAttribute('data-theme'))}catch(_){}}"
    + "try{var _t=localStorage.getItem('theme');if(_t)document.documentElement.setAttribute('data-theme',_t);}catch(_){}"
    + (extraScript || "")
    + "<\/script>"
    + "</body></html>";
}

// ── Tabs query builder ────────────────────────────────────────
function buildQuery(params) {
  const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  return qs ? "?" + qs : "";
}

// ── Helper: quick-filter chips utk date range ──────────────────
// Form harus punya id `formId`, dgn inputs [name=dari] dan [name=sampai].
// Inputs harus on-change call markCustom() supaya chip Custom highlight.
function buildDateChips({ tglDari, tglSampai, formId }) {
  const _now       = new Date();
  const today      = _now.toISOString().slice(0, 10);
  const yesterday  = new Date(_now.getTime() - 86400000).toISOString().slice(0, 10);
  const _dow       = (_now.getUTCDay() + 6) % 7; // 0 = Senin
  const weekStart  = new Date(_now.getTime() - _dow * 86400000).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  let activeChip = "custom";
  if      (tglDari === today      && tglSampai === today)      activeChip = "today";
  else if (tglDari === yesterday  && tglSampai === yesterday)  activeChip = "yesterday";
  else if (tglDari === weekStart  && tglSampai === today)      activeChip = "week";
  else if (tglDari === monthStart && tglSampai === today)      activeChip = "month";

  const chip = (id, lbl, d, s) =>
    "<button type=\"button\" class=\"mon-chip" + (activeChip === id ? " active" : "") + "\""
    + " onclick=\"qf('" + d + "','" + s + "')\">" + lbl + "</button>";

  const chipsHtml = "<div class=\"mon-chips\">"
    + chip("today",     "Hari ini",   today,      today)
    + chip("yesterday", "Kemarin",    yesterday,  yesterday)
    + chip("week",      "Minggu ini", weekStart,  today)
    + chip("month",     "Bulan ini",  monthStart, today)
    + "<button type=\"button\" id=\"chipCustom\" class=\"mon-chip" + (activeChip === "custom" ? " active" : "") + "\""
    + " onclick=\"applyCustom()\">Custom</button>"
    + "</div>";

  const script = "function qf(d,s){var f=document.getElementById('" + formId + "');"
    + "f.querySelector('[name=dari]').value=d;"
    + "f.querySelector('[name=sampai]').value=s;"
    + "f.submit();}"
    + "function applyCustom(){document.getElementById('" + formId + "').submit();}"
    + "function markCustom(){"
    + "var chips=document.querySelectorAll('.mon-chip');"
    + "for(var i=0;i<chips.length;i++)chips[i].classList.remove('active');"
    + "document.getElementById('chipCustom').classList.add('active');}";

  return { chipsHtml, script };
}

// ── 1. Aktivitas Transaksi ────────────────────────────────────
export function monitoringAktivitas({ logs, tglDari, tglSampai, username, jenis, karyawanList, accountsAll = [], role }) {
  // Map username → display name (mencakup owner juga, biar transaksi owner tetap rapih)
  const nameMap = Object.fromEntries(
    accountsAll.map((a) => [a.username, a.display_name || a.username])
  );
  // Summary stats
  const totalIn  = logs.filter((l) => l.jenis === "pemasukan").reduce((s, l) => s + l.jumlah, 0);
  const totalOut = logs.filter((l) => l.jenis === "pengeluaran").reduce((s, l) => s + l.jumlah, 0);
  const uniqueRecorders = new Set(logs.map((l) => l.dicatatOleh).filter(Boolean));

  const summaryHtml = "<div class=\"mon-sum-row\">"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Transaksi</div><div class=\"mon-sum-val acc\">" + logs.length + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Pemasukan</div><div class=\"mon-sum-val inc\">" + rp(totalIn) + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Pengeluaran</div><div class=\"mon-sum-val out\">" + rp(totalOut) + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Pencatat Aktif</div><div class=\"mon-sum-val\">" + uniqueRecorders.size + " orang</div></div>"
    + "</div>";

  const { chipsHtml, script: chipsScript } = buildDateChips({ tglDari, tglSampai, formId: "actFilterForm" });

  // Filter bar
  const karyawanOpts = karyawanList.map((k) =>
    "<option value=\"" + escHtml(k.username) + "\"" + (username === k.username ? " selected" : "") + ">"
    + escHtml(k.display_name || k.username) + "</option>"
  ).join("");

  const filterHtml = "<form method=\"get\" action=\"/operasional/monitoring/aktivitas\" class=\"mon-filter\" id=\"actFilterForm\">"
    + chipsHtml
    + "<label>Dari</label>"
    + "<input type=\"date\" name=\"dari\" id=\"fDari\" value=\"" + escHtml(tglDari) + "\" style=\"width:130px\" onchange=\"markCustom()\">"
    + "<label>Sampai</label>"
    + "<input type=\"date\" name=\"sampai\" id=\"fSampai\" value=\"" + escHtml(tglSampai) + "\" style=\"width:130px\" onchange=\"markCustom()\">"
    + "<label>Karyawan</label>"
    + "<select name=\"user\">"
    + "<option value=\"\">Semua</option>"
    + karyawanOpts
    + "</select>"
    + "<label>Jenis</label>"
    + "<select name=\"jenis\">"
    + "<option value=\"\">Semua</option>"
    + "<option value=\"pemasukan\"" + (jenis === "pemasukan" ? " selected" : "") + ">Pemasukan</option>"
    + "<option value=\"pengeluaran\"" + (jenis === "pengeluaran" ? " selected" : "") + ">Pengeluaran</option>"
    + "</select>"
    + "<button type=\"submit\" class=\"mon-filter-btn\"><i class=\"ti ti-search\"></i> Filter</button>"
    + "</form>";

  // Table rows
  let tableBody = "";
  if (logs.length === 0) {
    tableBody = "<tr><td colspan=\"7\" class=\"mon-empty\"><i class=\"ti ti-receipt-off\"></i><br>Belum ada transaksi di periode ini</td></tr>";
  } else {
    tableBody = logs.map((l) => {
      const isIn  = l.jenis === "pemasukan";
      const tgl   = typeof l.tanggal === "object"
        ? l.tanggal.toISOString().slice(0, 10)
        : String(l.tanggal).slice(0, 10);
      const tglFmt = new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const waktu  = l.jam ? tglFmt + " " + l.jam : tglFmt;
      const badge  = isIn
        ? "<span class=\"mon-badge mon-badge-in\"><i class=\"ti ti-arrow-up\" style=\"font-size:9px\"></i> Masuk</span>"
        : "<span class=\"mon-badge mon-badge-out\"><i class=\"ti ti-arrow-down\" style=\"font-size:9px\"></i> Keluar</span>";
      const jumlahFmt = (isIn ? "+" : "-") + rp(l.jumlah);
      const jumlahColor = isIn ? "color:#22c55e" : "color:#ef4444";
      const bayarBadge = l.bayar === "cash"
        ? "<span style=\"font-size:10px;background:rgba(34,197,94,.1);color:#16a34a;padding:2px 6px;border-radius:4px;margin-left:4px\">Cash</span>"
        : l.bayar === "qris"
        ? "<span style=\"font-size:10px;background:rgba(59,130,246,.1);color:#3b82f6;padding:2px 6px;border-radius:4px;margin-left:4px\">QRIS</span>"
        : "";
      const recorderDisp = l.dicatatOleh ? (nameMap[l.dicatatOleh] || l.dicatatOleh) : "—";
      return "<tr>"
        + "<td style=\"white-space:nowrap;color:var(--txt3);font-size:11px\">" + escHtml(waktu) + "</td>"
        + "<td><span style=\"font-weight:600;color:var(--txt)\">" + escHtml(recorderDisp) + "</span></td>"
        + "<td>" + badge + "</td>"
        + "<td class=\"mon-hide-mobile\"><span style=\"background:var(--surface2);padding:2px 8px;border-radius:6px;font-size:11px\">"
        + escHtml(l.kategori || "—") + "</span></td>"
        + "<td class=\"mon-hide-mobile\">" + escHtml(l.keterangan || "—") + "</td>"
        + "<td style=\"text-align:right;font-weight:700;font-family:monospace;" + jumlahColor + ";white-space:nowrap\">"
        + escHtml(jumlahFmt) + bayarBadge + "</td>"
        + "</tr>";
    }).join("");
  }

  const tableHtml = "<div class=\"mon-card\"><div style=\"overflow-x:auto\">"
    + "<table class=\"mon-table\">"
    + "<thead><tr>"
    + "<th>Waktu</th><th>Dicatat Oleh</th><th>Tipe</th>"
    + "<th class=\"mon-hide-mobile\">Kategori</th>"
    + "<th class=\"mon-hide-mobile\">Keterangan</th>"
    + "<th style=\"text-align:right\">Jumlah</th>"
    + "</tr></thead>"
    + "<tbody>" + tableBody + "</tbody>"
    + "</table></div></div>";

  const body = summaryHtml + filterHtml + tableHtml;
  return monPage("Monitoring Aktivitas", role, "aktivitas", body, chipsScript);
}

// ── 1b. Aktivitas Member (dari tabel logs) ────────────────────
export function monitoringMember({ logs, tglDari, tglSampai, aksi, role }) {
  // Aksi list & label friendly
  const aksiMeta = {
    SCAN:           { label: "Kunjungan",       cls: "mon-badge-in",     icon: "ti-qrcode" },
    SCAN_RESET:     { label: "Scan + Reset",    cls: "mon-badge-lebih",  icon: "ti-refresh" },
    DAFTAR_MEMBER:  { label: "Daftar Baru",     cls: "mon-badge-malam",  icon: "ti-user-plus" },
    EDIT_MEMBER:    { label: "Edit Data",       cls: "mon-badge-siang",  icon: "ti-edit" },
    DELETE_MEMBER:  { label: "Hapus Member",    cls: "mon-badge-out",    icon: "ti-trash" },
    HAPUS:          { label: "Hapus Member",    cls: "mon-badge-out",    icon: "ti-trash" },
    BONUS_KLAIM:    { label: "Klaim Bonus",     cls: "mon-badge-ok",     icon: "ti-gift" },
    BONUS_EARNED:   { label: "Bonus Earned",    cls: "mon-badge-in",     icon: "ti-award" },
    BONUS_EXPIRED:  { label: "Bonus Expired",   cls: "mon-badge-out",    icon: "ti-clock-x" },
    RESET_QR:       { label: "Reset QR",        cls: "mon-badge-lebih",  icon: "ti-qrcode" },
  };

  // Summary
  const countBy = (act) => logs.filter((l) => l.aksi === act).length;
  const scanCount   = countBy("SCAN") + countBy("SCAN_RESET");
  const daftarCount = countBy("DAFTAR_MEMBER");
  const klaimCount  = countBy("BONUS_KLAIM");

  const summaryHtml = "<div class=\"mon-sum-row\">"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Aktivitas</div><div class=\"mon-sum-val acc\">" + logs.length + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Kunjungan / Scan</div><div class=\"mon-sum-val inc\">" + scanCount + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Member Baru</div><div class=\"mon-sum-val\">" + daftarCount + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Klaim Bonus</div><div class=\"mon-sum-val warn\">" + klaimCount + "</div></div>"
    + "</div>";

  const { chipsHtml, script: chipsScript } = buildDateChips({ tglDari, tglSampai, formId: "memFilterForm" });

  // Dropdown aksi
  const aksiOpts = Object.entries(aksiMeta)
    .filter(([k]) => k !== "HAPUS") // HAPUS = duplicate DELETE_MEMBER (legacy), hide dr filter
    .map(([k, v]) =>
      "<option value=\"" + escHtml(k) + "\"" + (aksi === k ? " selected" : "") + ">" + escHtml(v.label) + "</option>"
    ).join("");

  const filterHtml = "<form method=\"get\" action=\"/operasional/monitoring/member\" class=\"mon-filter\" id=\"memFilterForm\">"
    + chipsHtml
    + "<label>Dari</label>"
    + "<input type=\"date\" name=\"dari\" id=\"fDari\" value=\"" + escHtml(tglDari) + "\" style=\"width:130px\" onchange=\"markCustom()\">"
    + "<label>Sampai</label>"
    + "<input type=\"date\" name=\"sampai\" id=\"fSampai\" value=\"" + escHtml(tglSampai) + "\" style=\"width:130px\" onchange=\"markCustom()\">"
    + "<label>Aksi</label>"
    + "<select name=\"aksi\">"
    + "<option value=\"\">Semua</option>"
    + aksiOpts
    + "</select>"
    + "<button type=\"submit\" class=\"mon-filter-btn\"><i class=\"ti ti-search\"></i> Filter</button>"
    + "</form>";

  // Tabel
  let tableBody = "";
  if (logs.length === 0) {
    tableBody = "<tr><td colspan=\"5\" class=\"mon-empty\"><i class=\"ti ti-users-off\"></i><br>Belum ada aktivitas member di periode ini</td></tr>";
  } else {
    tableBody = logs.map((l) => {
      const meta = aksiMeta[l.aksi] || { label: l.aksi, cls: "mon-badge-siang", icon: "ti-activity" };
      const tsDate = l.ts instanceof Date ? l.ts : new Date(l.ts);
      const waktu  = tsDate.toLocaleString("id-ID", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Jakarta",
      });
      const badge = "<span class=\"mon-badge " + meta.cls + "\">"
        + "<i class=\"ti " + meta.icon + "\" style=\"font-size:9px\"></i> " + escHtml(meta.label) + "</span>";
      const memberHtml = l.kode
        ? "<span style=\"font-weight:600;color:var(--txt)\">" + escHtml(l.nama || "—") + "</span>"
          + "<span style=\"font-size:10px;color:var(--txt3);margin-left:6px;font-family:monospace\">" + escHtml(l.kode) + "</span>"
        : "<span style=\"color:var(--txt3)\">—</span>";
      return "<tr>"
        + "<td style=\"white-space:nowrap;color:var(--txt3);font-size:11px\">" + escHtml(waktu) + "</td>"
        + "<td>" + badge + "</td>"
        + "<td>" + memberHtml + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"color:var(--txt2);font-size:12px\">" + escHtml(l.detail || "—") + "</td>"
        + "</tr>";
    }).join("");
  }

  const tableHtml = "<div class=\"mon-card\"><div style=\"overflow-x:auto\">"
    + "<table class=\"mon-table\">"
    + "<thead><tr>"
    + "<th>Waktu</th><th>Aksi</th><th>Member</th>"
    + "<th class=\"mon-hide-mobile\">Detail</th>"
    + "</tr></thead>"
    + "<tbody>" + tableBody + "</tbody>"
    + "</table></div></div>";

  const body = summaryHtml + filterHtml + tableHtml;
  return monPage("Aktivitas Member", role, "member", body, chipsScript);
}

// ── 2. Setoran Shift ──────────────────────────────────────────
export function monitoringSetoran({ setoranList, bulan, username, karyawanList, role, financeUser, financeDisplay, msg }) {
  // Summary
  const totalShift  = setoranList.length;
  const totalSetor  = setoranList.reduce((s, r) => s + r.uangSetor,   0);
  const totalSelisih = setoranList.reduce((s, r) => s + r.selisih,    0);
  const totalPemasukan = setoranList.reduce((s, r) => s + r.pemasukan, 0);

  const summaryHtml = "<div class=\"mon-sum-row\">"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Shift</div><div class=\"mon-sum-val acc\">" + totalShift + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Pemasukan</div><div class=\"mon-sum-val inc\">" + rp(totalPemasukan) + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Disetor</div><div class=\"mon-sum-val\">" + rp(totalSetor) + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Selisih</div><div class=\"mon-sum-val" + (totalSelisih < 0 ? " out" : totalSelisih > 0 ? " warn" : "") + "\">" + rp(totalSelisih) + "</div></div>"
    + "</div>";

  // Generate month options (12 months)
  const now = new Date();
  let bulanOpts = "";
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const lbl = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    bulanOpts += "<option value=\"" + val + "\"" + (val === bulan ? " selected" : "") + ">" + lbl + "</option>";
  }

  const karyawanOpts = karyawanList.map((k) =>
    "<option value=\"" + escHtml(k.username) + "\"" + (username === k.username ? " selected" : "") + ">"
    + escHtml(k.display_name || k.username) + "</option>"
  ).join("");

  const filterHtml = "<form method=\"get\" action=\"/operasional/monitoring/setoran\" class=\"mon-filter\">"
    + "<label>Bulan</label>"
    + "<select name=\"bulan\">" + bulanOpts + "</select>"
    + "<label>Karyawan</label>"
    + "<select name=\"user\"><option value=\"\">Semua</option>" + karyawanOpts + "</select>"
    + "<button type=\"submit\" class=\"mon-filter-btn\"><i class=\"ti ti-search\"></i> Filter</button>"
    + "</form>";

  // Action bar
  const actionBarHtml = "<div style=\"display:flex;justify-content:flex-end;margin-bottom:16px\">"
    + "<button class=\"mon-add-btn\" onclick=\"openSetoranModal()\"><i class=\"ti ti-plus\"></i> Laporan Shift</button>"
    + "</div>";

  // Table
  let tableBody = "";
  if (setoranList.length === 0) {
    tableBody = "<tr><td colspan=\"10\" class=\"mon-empty\"><i class=\"ti ti-report-off\"></i><br>Belum ada laporan setoran di bulan ini</td></tr>";
  } else {
    tableBody = setoranList.map((s) => {
      const tglFmt = new Date(s.tanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const shiftBadge = s.shift === "malam"
        ? "<span class=\"mon-badge mon-badge-malam\"><i class=\"ti ti-moon\" style=\"font-size:9px\"></i> Malam</span>"
        : "<span class=\"mon-badge mon-badge-siang\"><i class=\"ti ti-sun\" style=\"font-size:9px\"></i> Siang</span>";
      const selBadge = s.selisih === 0
        ? "<span class=\"mon-badge mon-badge-ok\">Sesuai</span>"
        : s.selisih < 0
        ? "<span class=\"mon-badge mon-badge-kurang\">" + rp(s.selisih) + "</span>"
        : "<span class=\"mon-badge mon-badge-lebih\">+" + rp(s.selisih) + "</span>";
      const jamStr = (s.jamBuka || s.jamTutup) ? (s.jamBuka || "—") + " – " + (s.jamTutup || "—") : "—";
      return "<tr>"
        + "<td style=\"white-space:nowrap;font-size:11px;color:var(--txt3)\">" + escHtml(tglFmt) + "</td>"
        + "<td style=\"font-weight:600;color:var(--txt)\">" + escHtml(s.karyawanNama) + "</td>"
        + "<td>" + shiftBadge + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"font-size:11px;color:var(--txt3)\">" + escHtml(jamStr) + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"text-align:right;font-family:monospace\">" + rp(s.modalAwal) + "</td>"
        + "<td style=\"text-align:right;font-family:monospace;color:#22c55e\">" + rp(s.pemasukan) + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"text-align:right;font-family:monospace;color:#ef4444\">" + rp(s.pengeluaran) + "</td>"
        + "<td style=\"text-align:right;font-family:monospace\">" + rp(s.uangSetor) + "</td>"
        + "<td style=\"text-align:right\">" + selBadge + "</td>"
        + "</tr>";
    }).join("");
  }

  const tableHtml = "<div class=\"mon-card\"><div style=\"overflow-x:auto\">"
    + "<table class=\"mon-table\">"
    + "<thead><tr>"
    + "<th>Tanggal</th><th>Karyawan</th><th>Shift</th>"
    + "<th class=\"mon-hide-mobile\">Jam Buka-Tutup</th>"
    + "<th class=\"mon-hide-mobile\" style=\"text-align:right\">Modal</th>"
    + "<th style=\"text-align:right\">Pemasukan</th>"
    + "<th class=\"mon-hide-mobile\" style=\"text-align:right\">Pengeluaran</th>"
    + "<th style=\"text-align:right\">Disetor</th>"
    + "<th style=\"text-align:right\">Selisih</th>"
    + "</tr></thead>"
    + "<tbody>" + tableBody + "</tbody>"
    + "</table></div></div>";

  // Karyawan options for modal form
  const modalKaryawanOpts = karyawanList.map((k) =>
    "<option value=\"" + escHtml(k.username) + "\" data-nama=\"" + escHtml(k.display_name || k.username) + "\">"
    + escHtml(k.display_name || k.username) + "</option>"
  ).join("");

  // Default tanggal = today
  const todayStr = new Date().toISOString().slice(0, 10);

  // Modal form
  const modalHtml = "<div class=\"mon-modal-overlay\" id=\"setoranModal\" onclick=\"if(event.target===this)closeSetoranModal()\">"
    + "<div class=\"mon-modal\">"
    + "<div class=\"mon-modal-hdr\">"
    + "<div class=\"mon-modal-title\"><i class=\"ti ti-report-money\" style=\"margin-right:6px\"></i>Laporan Setoran Shift</div>"
    + "<button class=\"mon-modal-close\" onclick=\"closeSetoranModal()\"><i class=\"ti ti-x\"></i></button>"
    + "</div>"
    + "<div class=\"mon-modal-body\">"
    + "<form method=\"post\" action=\"/operasional/monitoring/setoran\" id=\"setoranForm\">"

    + "<div class=\"mon-row-2\">"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Tanggal</label>"
    + "<input class=\"mon-input\" type=\"date\" name=\"tanggal\" id=\"sfTanggal\" value=\"" + escHtml(todayStr) + "\" required></div>"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Shift</label>"
    + "<select class=\"mon-input\" name=\"shift\" id=\"sfShift\">"
    + "<option value=\"siang\">Siang</option>"
    + "<option value=\"malam\">Malam</option>"
    + "</select></div>"
    + "</div>"

    + "<div class=\"mon-field\"><label class=\"mon-label\">Karyawan</label>"
    + "<select class=\"mon-input\" name=\"karyawan_username\" id=\"sfKaryawanSel\" onchange=\"sfFillNama(this)\">"
    + "<option value=\"\">-- Pilih karyawan --</option>"
    + modalKaryawanOpts
    + "</select></div>"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Nama Karyawan</label>"
    + "<input class=\"mon-input\" type=\"text\" name=\"karyawan_nama\" id=\"sfNama\" placeholder=\"Nama karyawan\" required></div>"

    + "<div class=\"mon-row-2\">"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Jam Buka</label>"
    + "<input class=\"mon-input\" type=\"time\" name=\"jam_buka\" id=\"sfJamBuka\"></div>"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Jam Tutup</label>"
    + "<input class=\"mon-input\" type=\"time\" name=\"jam_tutup\" id=\"sfJamTutup\"></div>"
    + "</div>"

    + "<div class=\"mon-row-2\">"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Modal Awal (Rp)</label>"
    + "<input class=\"mon-input\" type=\"number\" name=\"modal_awal\" id=\"sfModal\" value=\"0\" min=\"0\" oninput=\"sfCalc()\"></div>"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Pemasukan (Rp)</label>"
    + "<input class=\"mon-input\" type=\"number\" name=\"pemasukan\" id=\"sfPemasukan\" value=\"0\" min=\"0\" oninput=\"sfCalc()\"></div>"
    + "</div>"

    + "<div class=\"mon-row-2\">"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Pengeluaran (Rp)</label>"
    + "<input class=\"mon-input\" type=\"number\" name=\"pengeluaran\" id=\"sfPengeluaran\" value=\"0\" min=\"0\" oninput=\"sfCalc()\"></div>"
    + "<div class=\"mon-field\"><label class=\"mon-label\">Uang Disetor (Rp)</label>"
    + "<input class=\"mon-input\" type=\"number\" name=\"uang_setor\" id=\"sfSetor\" value=\"0\" min=\"0\" oninput=\"sfCalc()\"></div>"
    + "</div>"

    + "<div class=\"mon-field\" style=\"background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:12px\">"
    + "<div style=\"font-size:11px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px\">Selisih Kas</div>"
    + "<div id=\"sfSelisihVal\" style=\"font-size:18px;font-weight:700;font-family:monospace\">Rp 0</div>"
    + "<div id=\"sfSelisihDesc\" style=\"font-size:11px;color:var(--txt3);margin-top:3px\">(modal + pemasukan - pengeluaran) - disetor</div>"
    + "</div>"

    + "<div class=\"mon-field\" style=\"margin-top:14px\"><label class=\"mon-label\">Keterangan</label>"
    + "<input class=\"mon-input\" type=\"text\" name=\"keterangan\" placeholder=\"Catatan (opsional)\" maxlength=\"200\"></div>"

    + "<button type=\"submit\" class=\"mon-submit\"><i class=\"ti ti-check\" style=\"margin-right:6px\"></i>Simpan Laporan</button>"
    + "</form>"
    + "</div></div></div>";

  const toastHtml = msg === "ok"
    ? "<div class=\"mon-toast ok show\" id=\"monToast\"><i class=\"ti ti-check\"></i> Laporan shift berhasil disimpan</div>"
    : msg === "err"
    ? "<div class=\"mon-toast err show\" id=\"monToast\"><i class=\"ti ti-x\"></i> Gagal menyimpan, cek kembali form</div>"
    : "";

  const script = "function openSetoranModal(){"
    + "document.getElementById('setoranModal').classList.add('open');}"
    + "function closeSetoranModal(){"
    + "document.getElementById('setoranModal').classList.remove('open');}"
    + "function sfFillNama(sel){"
    + "var opt=sel.options[sel.selectedIndex];"
    + "var n=opt.getAttribute('data-nama')||'';"
    + "document.getElementById('sfNama').value=n;}"
    + "function sfCalc(){"
    + "var m=parseInt(document.getElementById('sfModal').value)||0;"
    + "var p=parseInt(document.getElementById('sfPemasukan').value)||0;"
    + "var o=parseInt(document.getElementById('sfPengeluaran').value)||0;"
    + "var s=parseInt(document.getElementById('sfSetor').value)||0;"
    + "var sel=(m+p-o)-s;"
    + "var el=document.getElementById('sfSelisihVal');"
    + "var abs=Math.abs(sel);"
    + "var parts=[];var str=String(abs);"
    + "for(var i=str.length;i>0;i-=3)parts.unshift(str.slice(Math.max(0,i-3),i));"
    + "var fmt=(sel<0?'-':'')+'Rp '+parts.join('.');"
    + "el.textContent=fmt;"
    + "el.style.color=sel===0?'var(--txt)':sel<0?'#ef4444':'#f59e0b';}"
    + "setTimeout(function(){"
    + "var t=document.getElementById('monToast');"
    + "if(t){setTimeout(function(){t.classList.remove('show');},3000);}},100);"
    + (msg === "ok" || msg === "err" ? "" : "");

  const body = summaryHtml + filterHtml + actionBarHtml + tableHtml + modalHtml + toastHtml;
  return monPage("Setoran Shift", role, "setoran", body, script);
}

// ── 3. Selisih Kas ────────────────────────────────────────────
export function monitoringSelisih({ setoranList, bulan, username, karyawanList, role }) {
  // Stats
  const sesuai = setoranList.filter((s) => s.selisih === 0).length;
  const kurang = setoranList.filter((s) => s.selisih < 0);
  const lebih  = setoranList.filter((s) => s.selisih > 0);
  const totalKurang = kurang.reduce((s, r) => s + Math.abs(r.selisih), 0);
  const totalLebih  = lebih.reduce((s, r) => s + r.selisih,            0);

  const summaryHtml = "<div class=\"mon-sum-row\">"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Total Shift</div><div class=\"mon-sum-val acc\">" + setoranList.length + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Sesuai / Tepat</div><div class=\"mon-sum-val inc\">" + sesuai + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Kurang (total)</div><div class=\"mon-sum-val out\">" + rp(totalKurang) + "</div></div>"
    + "<div class=\"mon-sum-card\"><div class=\"mon-sum-lbl\">Lebih (total)</div><div class=\"mon-sum-val warn\">" + rp(totalLebih) + "</div></div>"
    + "</div>";

  // Filter bar
  const now = new Date();
  let bulanOpts = "";
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const lbl = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    bulanOpts += "<option value=\"" + val + "\"" + (val === bulan ? " selected" : "") + ">" + lbl + "</option>";
  }

  const karyawanOpts = karyawanList.map((k) =>
    "<option value=\"" + escHtml(k.username) + "\"" + (username === k.username ? " selected" : "") + ">"
    + escHtml(k.display_name || k.username) + "</option>"
  ).join("");

  const filterHtml = "<form method=\"get\" action=\"/operasional/monitoring/selisih\" class=\"mon-filter\">"
    + "<label>Bulan</label>"
    + "<select name=\"bulan\">" + bulanOpts + "</select>"
    + "<label>Karyawan</label>"
    + "<select name=\"user\"><option value=\"\">Semua</option>" + karyawanOpts + "</select>"
    + "<button type=\"submit\" class=\"mon-filter-btn\"><i class=\"ti ti-search\"></i> Filter</button>"
    + "</form>";

  // Table
  let tableBody = "";
  if (setoranList.length === 0) {
    tableBody = "<tr><td colspan=\"8\" class=\"mon-empty\"><i class=\"ti ti-scale-off\"></i><br>Belum ada data selisih di bulan ini</td></tr>";
  } else {
    tableBody = setoranList.map((s) => {
      const tglFmt = new Date(s.tanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const shiftBadge = s.shift === "malam"
        ? "<span class=\"mon-badge mon-badge-malam\">Malam</span>"
        : "<span class=\"mon-badge mon-badge-siang\">Siang</span>";

      let statusBadge, statusColor;
      if (s.selisih === 0) {
        statusBadge = "<span class=\"mon-badge mon-badge-ok\"><i class=\"ti ti-check\" style=\"font-size:9px\"></i> Sesuai</span>";
        statusColor = "#22c55e";
      } else if (s.selisih < 0) {
        statusBadge = "<span class=\"mon-badge mon-badge-kurang\"><i class=\"ti ti-arrow-down\" style=\"font-size:9px\"></i> Kurang</span>";
        statusColor = "#ef4444";
      } else {
        statusBadge = "<span class=\"mon-badge mon-badge-lebih\"><i class=\"ti ti-arrow-up\" style=\"font-size:9px\"></i> Lebih</span>";
        statusColor = "#f59e0b";
      }

      const selisihFmt = s.selisih === 0
        ? "<span style=\"color:var(--txt3)\">—</span>"
        : "<span style=\"color:" + statusColor + ";font-family:monospace;font-weight:700\">"
          + (s.selisih > 0 ? "+" : "") + rp(s.selisih) + "</span>";

      const kasHarusAda = s.modalAwal + s.pemasukan - s.pengeluaran;

      return "<tr>"
        + "<td style=\"white-space:nowrap;font-size:11px;color:var(--txt3)\">" + escHtml(tglFmt) + "</td>"
        + "<td style=\"font-weight:600;color:var(--txt)\">" + escHtml(s.karyawanNama) + "</td>"
        + "<td>" + shiftBadge + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"text-align:right;font-family:monospace;color:#22c55e\">" + rp(s.pemasukan) + "</td>"
        + "<td class=\"mon-hide-mobile\" style=\"text-align:right;font-family:monospace\">" + rp(kasHarusAda) + "</td>"
        + "<td style=\"text-align:right;font-family:monospace\">" + rp(s.uangSetor) + "</td>"
        + "<td style=\"text-align:right\">" + selisihFmt + "</td>"
        + "<td style=\"text-align:right\">" + statusBadge + "</td>"
        + "</tr>";
    }).join("");
  }

  const tableHtml = "<div class=\"mon-card\"><div style=\"overflow-x:auto\">"
    + "<table class=\"mon-table\">"
    + "<thead><tr>"
    + "<th>Tanggal</th><th>Karyawan</th><th>Shift</th>"
    + "<th class=\"mon-hide-mobile\" style=\"text-align:right\">Pemasukan</th>"
    + "<th class=\"mon-hide-mobile\" style=\"text-align:right\">Kas Harus Ada</th>"
    + "<th style=\"text-align:right\">Disetor</th>"
    + "<th style=\"text-align:right\">Selisih</th>"
    + "<th style=\"text-align:right\">Status</th>"
    + "</tr></thead>"
    + "<tbody>" + tableBody + "</tbody>"
    + "</table></div></div>";

  const body = summaryHtml + filterHtml + tableHtml;
  return monPage("Selisih Kas", role, "selisih", body, "");
}
