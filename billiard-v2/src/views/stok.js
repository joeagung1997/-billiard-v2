// src/views/stok.js
// ── Halaman Stok & Inventory — kelola stok bahan baku (owner only) ──
// View list bahan dgn info stok current + low-stock alert + adjust stok.

import { docHeadV4, escHtml, buildFinanceSidebar } from "./finance.js";

// Format angka stok: hilangin trailing zero (mis. 5.0 → "5", 2.5 → "2,5").
function fmtStok(n) {
  const num = Number(n) || 0;
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(3).replace(/\.?0+$/, "").replace(".", ",");
}

function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Status stok: out (0), low (≤ stok_min & >0), ok (> stok_min).
// stok_min=0 → tidak ada threshold, status selalu "ok" kecuali stok=0 ("out").
function stokStatus(stok, stokMin) {
  const s = Number(stok) || 0;
  const m = Number(stokMin) || 0;
  if (s <= 0) return "out";
  if (m > 0 && s <= m) return "low";
  return "ok";
}

const STATUS_CONF = {
  ok:   { label: "OK",        color: "#2d6624", bg: "#eaf3de", icon: "ti-circle-check" },
  low:  { label: "Stok Tipis", color: "#c47f1a", bg: "#fef9e6", icon: "ti-alert-triangle" },
  out:  { label: "Habis",     color: "#a32d2d", bg: "#fef5f5", icon: "ti-alert-octagon" },
};

export function stokPage({
  bahanList = [], suppliers = [],
  filter = "", searchQ = "",
  role = "owner", displayName = "",
  editBahan = null,
  msg = "", hasErr = false,
} = {}) {

  // ── Filter bahan ───────────────────────────────────────────────
  let filtered = bahanList.slice();
  if (filter === "low")  filtered = filtered.filter((b) => stokStatus(b.stok, b.stok_min) === "low");
  if (filter === "out")  filtered = filtered.filter((b) => stokStatus(b.stok, b.stok_min) === "out");
  if (filter === "warn") filtered = filtered.filter((b) => { const s = stokStatus(b.stok, b.stok_min); return s === "low" || s === "out"; });
  const q = (searchQ || "").trim().toLowerCase();
  if (q) filtered = filtered.filter((b) => (b.nama || "").toLowerCase().includes(q));

  // ── Stats ─────────────────────────────────────────────────────
  const total = bahanList.length;
  const cntOk   = bahanList.filter((b) => stokStatus(b.stok, b.stok_min) === "ok").length;
  const cntLow  = bahanList.filter((b) => stokStatus(b.stok, b.stok_min) === "low").length;
  const cntOut  = bahanList.filter((b) => stokStatus(b.stok, b.stok_min) === "out").length;
  // Total nilai stok = sum(stok × harga_per_satuan)
  const totalNilai = bahanList.reduce((s, b) => s + ((Number(b.stok) || 0) * (Number(b.harga_per_satuan) || 0)), 0);

  // ── Adjust form (modal terkait editBahan) ─────────────────────
  const isEdit = !!editBahan;

  // ── Render row tabel bahan ────────────────────────────────────
  const renderRow = (b) => {
    const st = stokStatus(b.stok, b.stok_min);
    const conf = STATUS_CONF[st];
    const supNama = b.supplier_nama || b.supplier || "";
    const nilai = (Number(b.stok) || 0) * (Number(b.harga_per_satuan) || 0);
    return ""
      + "<tr class=\"st-row st-" + st + "\">"
      +   "<td class=\"st-col-nama\">"
      +     "<div class=\"st-nama-main\">" + escHtml(b.nama) + "</div>"
      +     (supNama ? "<div class=\"st-nama-sup\"><i class=\"ti ti-truck\"></i> " + escHtml(supNama) + "</div>" : "")
      +   "</td>"
      +   "<td class=\"st-col-stok\">"
      +     "<span class=\"st-stok-val\">" + fmtStok(b.stok) + "</span>"
      +     "<span class=\"st-stok-satuan\"> " + escHtml(b.satuan || "pcs") + "</span>"
      +   "</td>"
      +   "<td class=\"st-col-min\">"
      +     (Number(b.stok_min) > 0
        ? "<span class=\"st-min-val\">" + fmtStok(b.stok_min) + " " + escHtml(b.satuan || "pcs") + "</span>"
        : "<span class=\"st-min-none\">—</span>")
      +   "</td>"
      +   "<td class=\"st-col-status\">"
      +     "<span class=\"st-badge\" style=\"background:" + conf.bg + ";color:" + conf.color + "\">"
      +       "<i class=\"ti " + conf.icon + "\"></i> " + conf.label
      +     "</span>"
      +   "</td>"
      +   "<td class=\"st-col-nilai\">" + fmtRp(nilai) + "</td>"
      +   "<td class=\"st-col-act\">"
      +     "<a href=\"/operasional/stok?edit=" + b.id + "\" class=\"st-btn-adjust\" title=\"Adjust stok\"><i class=\"ti ti-edit\"></i> Adjust</a>"
      +   "</td>"
      + "</tr>";
  };

  // ── Filter pills ──────────────────────────────────────────────
  const filterPill = (key, label, count, active) => ""
    + "<a href=\"/operasional/stok" + (key ? "?filter=" + key : "") + (q ? (key ? "&" : "?") + "q=" + encodeURIComponent(searchQ) : "") + "\""
    +    " class=\"st-pill" + (active ? " active" : "") + "\">"
    +   label + " <span class=\"st-pill-cnt\">" + count + "</span>"
    + "</a>";

  const filterBar = ""
    + "<div class=\"st-filter\">"
    +   "<div class=\"st-pills\">"
    +     filterPill("",     "Semua",      total,  !filter)
    +     filterPill("warn", "Perlu Restok", cntLow + cntOut, filter === "warn")
    +     filterPill("low",  "Stok Tipis", cntLow, filter === "low")
    +     filterPill("out",  "Habis",      cntOut, filter === "out")
    +   "</div>"
    +   "<form method=\"get\" action=\"/operasional/stok\" class=\"st-search\">"
    +     (filter ? "<input type=\"hidden\" name=\"filter\" value=\"" + escHtml(filter) + "\">" : "")
    +     "<input class=\"st-search-inp\" type=\"text\" name=\"q\" placeholder=\"Cari nama bahan...\" value=\"" + escHtml(searchQ || "") + "\">"
    +     "<button type=\"submit\" class=\"st-search-btn\"><i class=\"ti ti-search\"></i></button>"
    +     (q ? "<a href=\"/operasional/stok" + (filter ? "?filter=" + escHtml(filter) : "") + "\" class=\"st-search-clear\"><i class=\"ti ti-x\"></i></a>" : "")
    +   "</form>"
    + "</div>";

  // ── Adjust form (modal-ish, inline di atas) ────────────────────
  const adjustForm = isEdit ? ""
    + "<div class=\"st-adj-wrap\">"
    +   "<div class=\"st-adj-hdr\">"
    +     "<div class=\"st-adj-title\"><i class=\"ti ti-adjustments\"></i> Adjust Stok: <b>" + escHtml(editBahan.nama) + "</b></div>"
    +     "<a href=\"/operasional/stok\" class=\"st-cancel\">Batal</a>"
    +   "</div>"
    +   "<div class=\"st-adj-info\">"
    +     "<div class=\"st-adj-info-item\">"
    +       "<div class=\"st-adj-info-lbl\">Stok Saat Ini</div>"
    +       "<div class=\"st-adj-info-val\">" + fmtStok(editBahan.stok) + " " + escHtml(editBahan.satuan || "pcs") + "</div>"
    +     "</div>"
    +     "<div class=\"st-adj-info-item\">"
    +       "<div class=\"st-adj-info-lbl\">Threshold (Min)</div>"
    +       "<div class=\"st-adj-info-val\">" + (Number(editBahan.stok_min) > 0 ? fmtStok(editBahan.stok_min) + " " + escHtml(editBahan.satuan || "pcs") : "—") + "</div>"
    +     "</div>"
    +     "<div class=\"st-adj-info-item\">"
    +       "<div class=\"st-adj-info-lbl\">Harga / Satuan</div>"
    +       "<div class=\"st-adj-info-val\">" + fmtRp(editBahan.harga_per_satuan) + "</div>"
    +     "</div>"
    +     "<div class=\"st-adj-info-item\">"
    +       "<div class=\"st-adj-info-lbl\">Nilai Stok</div>"
    +       "<div class=\"st-adj-info-val\">" + fmtRp((Number(editBahan.stok) || 0) * (Number(editBahan.harga_per_satuan) || 0)) + "</div>"
    +     "</div>"
    +   "</div>"
    +   "<form action=\"/operasional/stok/adjust\" method=\"post\" class=\"st-adj-form\">"
    +     "<input type=\"hidden\" name=\"bahan_id\" value=\"" + editBahan.id + "\">"
    +     "<div class=\"st-adj-jenis\">"
    +       "<label class=\"st-adj-radio\"><input type=\"radio\" name=\"jenis\" value=\"in\" checked> <i class=\"ti ti-plus\"></i> Tambah (Masuk)</label>"
    +       "<label class=\"st-adj-radio\"><input type=\"radio\" name=\"jenis\" value=\"out\"> <i class=\"ti ti-minus\"></i> Kurangi (Keluar)</label>"
    +       "<label class=\"st-adj-radio\"><input type=\"radio\" name=\"jenis\" value=\"adjust\"> <i class=\"ti ti-equal\"></i> Set Absolute (Opname)</label>"
    +     "</div>"
    +     "<div class=\"st-adj-row\">"
    +       "<div class=\"st-adj-field\">"
    +         "<label class=\"st-lbl\">Jumlah (" + escHtml(editBahan.satuan || "pcs") + ")</label>"
    +         "<input class=\"st-inp\" type=\"number\" name=\"qty\" step=\"0.001\" min=\"0\" required placeholder=\"0\">"
    +       "</div>"
    +       "<div class=\"st-adj-field st-adj-field-min\">"
    +         "<label class=\"st-lbl\">Set Threshold Min (opsional)</label>"
    +         "<input class=\"st-inp\" type=\"number\" name=\"stok_min\" step=\"0.001\" min=\"0\" value=\"" + (Number(editBahan.stok_min) || 0) + "\">"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"st-adj-row\">"
    +       "<div class=\"st-adj-field st-adj-field-full\">"
    +         "<label class=\"st-lbl\">Catatan</label>"
    +         "<input class=\"st-inp\" type=\"text\" name=\"catatan\" maxlength=\"200\" placeholder=\"Mis. beli di Toko ABC, atau stok opname Mei\">"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"st-adj-actions\">"
    +       "<button type=\"submit\" class=\"st-btn-save\"><i class=\"ti ti-check\"></i> Simpan</button>"
    +       "<a href=\"/operasional/stok\" class=\"st-btn-cancel2\">Batal</a>"
    +     "</div>"
    +   "</form>"
    + "</div>"
    : "";

  // ── Message banner ────────────────────────────────────────────
  const msgBlock = msg === "adjusted" ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Stok berhasil diperbarui.</div>"
                 : msg === "minset"   ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Threshold stok min diperbarui.</div>"
                 : hasErr             ? "<div class=\"st-msg err\"><i class=\"ti ti-alert-circle\"></i> Gagal menyimpan — pastikan input valid.</div>"
                 : "";

  // ── Empty state ───────────────────────────────────────────────
  const emptyState = ""
    + "<div class=\"st-empty\">"
    +   "<i class=\"ti ti-package-off\"></i>"
    +   "<div class=\"st-empty-title\">"
    +     (bahanList.length === 0 ? "Belum ada bahan baku" : "Tidak ada bahan yang cocok dgn filter")
    +   "</div>"
    +   "<div class=\"st-empty-sub\">"
    +     (bahanList.length === 0
      ? "Tambahkan bahan baku dulu di <a href=\"/operasional/menu?tab=bahan\" style=\"color:#2d6624;font-weight:600\">tab Bahan Baku</a>."
      : "Coba ubah filter atau hapus pencarian.")
    +   "</div>"
    + "</div>";

  // ── Table ─────────────────────────────────────────────────────
  const tableHtml = filtered.length === 0
    ? emptyState
    : ""
      + "<div class=\"st-table-wrap\">"
      + "<table class=\"st-table\">"
      +   "<thead><tr>"
      +     "<th>Bahan</th>"
      +     "<th>Stok Saat Ini</th>"
      +     "<th>Threshold Min</th>"
      +     "<th>Status</th>"
      +     "<th>Nilai Stok</th>"
      +     "<th></th>"
      +   "</tr></thead>"
      +   "<tbody>" + filtered.map(renderRow).join("") + "</tbody>"
      + "</table>"
      + "</div>";

  // ── CSS ───────────────────────────────────────────────────────
  const css = [
    ".main-wrap,.page{background:#f4f6f3!important}",

    // Stats
    ".st-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}",
    "@media(max-width:768px){.st-stats{grid-template-columns:repeat(2,1fr)}}",
    ".st-stat{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:12px 14px;position:relative;overflow:hidden}",
    ".st-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}",
    ".st-stat.s-total::before{background:#7a8c78}",
    ".st-stat.s-ok::before{background:#2d6624}",
    ".st-stat.s-low::before{background:#c47f1a}",
    ".st-stat.s-out::before{background:#a32d2d}",
    ".st-stat.s-nilai::before{background:#2660a4}",
    ".st-stat-lbl{font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".st-stat-val{font-size:20px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace;line-height:1}",
    ".st-stat-val.small{font-size:15px}",

    // Adjust form
    ".st-adj-wrap{background:#fff;border:1px solid #c47f1a;border-radius:12px;padding:18px;margin-bottom:18px;background:#fffbf2}",
    ".st-adj-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0e3c5}",
    ".st-adj-title{font-size:14px;font-weight:700;color:#1a2318;display:flex;align-items:center;gap:7px}",
    ".st-adj-title i{font-size:18px;color:#c47f1a}",
    ".st-cancel{font-size:12px;color:#7a8c78;text-decoration:none;padding:6px 10px;border-radius:6px;background:#f4f6f3;border:1px solid #e2e8e0}",
    ".st-cancel:hover{background:#eef1ed}",

    ".st-adj-info{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;padding:12px;background:#fff;border:1px solid #f0e3c5;border-radius:8px}",
    "@media(max-width:768px){.st-adj-info{grid-template-columns:repeat(2,1fr)}}",
    ".st-adj-info-lbl{font-size:10px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}",
    ".st-adj-info-val{font-size:14px;font-weight:600;color:#1a2318;font-family:'DM Mono',monospace}",

    ".st-adj-form{display:flex;flex-direction:column;gap:12px}",
    ".st-adj-jenis{display:flex;gap:10px;flex-wrap:wrap}",
    ".st-adj-radio{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fff;border:1px solid #e2e8e0;border-radius:8px;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s}",
    ".st-adj-radio:has(input:checked){background:#fef9e6;border-color:#c47f1a;color:#c47f1a}",
    ".st-adj-radio input{margin:0}",
    ".st-adj-radio i{font-size:14px}",
    ".st-adj-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "@media(max-width:768px){.st-adj-row{grid-template-columns:1fr}}",
    ".st-adj-field-full{grid-column:1 / -1}",
    ".st-lbl{display:block;font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".st-inp{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#fff;outline:none}",
    ".st-inp:focus{border-color:#c47f1a;background:#fffbf2}",
    ".st-adj-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid #f0e3c5}",
    ".st-btn-save{padding:9px 18px;background:#2d6624;border:none;border-radius:7px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:6px}",
    ".st-btn-save:hover{background:#255519}",
    ".st-btn-cancel2{padding:9px 18px;background:#fff;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-weight:500;color:#7a8c78;text-decoration:none;display:inline-flex;align-items:center}",

    // Filter bar
    ".st-filter{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}",
    ".st-pills{display:flex;gap:6px;flex-wrap:wrap}",
    ".st-pill{padding:7px 13px;border-radius:20px;background:#fff;border:1px solid #e2e8e0;font-size:12px;font-weight:500;color:#4a5e58;text-decoration:none;display:inline-flex;align-items:center;gap:5px}",
    ".st-pill:hover{background:#eef1ed}",
    ".st-pill.active{background:#2d6624;border-color:#2d6624;color:#fff}",
    ".st-pill-cnt{font-size:10.5px;background:rgba(255,255,255,.2);padding:1px 7px;border-radius:10px;min-width:18px;text-align:center}",
    ".st-pill:not(.active) .st-pill-cnt{background:#f0f3ef;color:#7a8c78}",
    ".st-search{display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #e2e8e0;border-radius:7px;padding:0 4px 0 10px;max-width:280px}",
    ".st-search-inp{flex:1;padding:7px 0;border:none;background:transparent;font-size:12.5px;font-family:'DM Sans',sans-serif;outline:none;color:#1a2318;min-width:140px}",
    ".st-search-btn,.st-search-clear{padding:6px;border:none;background:transparent;cursor:pointer;color:#7a8c78;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}",
    ".st-search-btn:hover,.st-search-clear:hover{color:#2d6624}",

    // Table
    ".st-table-wrap{background:#fff;border:1px solid #e2e8e0;border-radius:10px;overflow:hidden;overflow-x:auto}",
    ".st-table{width:100%;border-collapse:collapse;min-width:700px}",
    ".st-table thead th{background:#f4f6f3;padding:10px 14px;font-size:11px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.05em;text-align:left;border-bottom:1px solid #e2e8e0}",
    ".st-table tbody td{padding:11px 14px;font-size:12.5px;color:#1a2318;border-bottom:1px solid #f0f3ef;vertical-align:middle}",
    ".st-table tbody tr:hover{background:#f9fbf8}",
    ".st-table tbody tr:last-child td{border-bottom:none}",
    ".st-row.st-low{background:#fffbf2}",
    ".st-row.st-low:hover{background:#fef9e6}",
    ".st-row.st-out{background:#fef5f5}",
    ".st-row.st-out:hover{background:#fcdede}",
    ".st-col-nama{min-width:180px}",
    ".st-nama-main{font-weight:600;color:#1a2318}",
    ".st-nama-sup{font-size:10.5px;color:#7a8c78;margin-top:2px;display:flex;align-items:center;gap:3px}",
    ".st-nama-sup i{font-size:11px}",
    ".st-col-stok{font-family:'DM Mono',monospace;white-space:nowrap}",
    ".st-stok-val{font-size:14px;font-weight:700;color:#1a2318}",
    ".st-stok-satuan{font-size:11px;color:#7a8c78;font-family:'DM Sans',sans-serif}",
    ".st-col-min{font-family:'DM Mono',monospace}",
    ".st-min-val{font-size:12px;color:#7a8c78}",
    ".st-min-none{color:#b0bfae}",
    ".st-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:600;white-space:nowrap}",
    ".st-badge i{font-size:12px}",
    ".st-col-nilai{font-family:'DM Mono',monospace;font-size:12px;color:#4a5e58;white-space:nowrap}",
    ".st-col-act{text-align:right;white-space:nowrap}",
    ".st-btn-adjust{padding:6px 10px;border-radius:6px;background:#fef9e6;border:1px solid #f0e3c5;color:#c47f1a;font-size:11.5px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px}",
    ".st-btn-adjust:hover{background:#fef0c4}",
    ".st-btn-adjust i{font-size:13px}",

    // Empty
    ".st-empty{background:#fff;border:1px dashed #d4ddd2;border-radius:12px;padding:40px 20px;text-align:center;color:#7a8c78}",
    ".st-empty i{font-size:42px;margin-bottom:10px;color:#b0bfae;display:block}",
    ".st-empty-title{font-size:14px;font-weight:600;color:#1a2318;margin-bottom:5px}",
    ".st-empty-sub{font-size:12px;color:#7a8c78}",

    // Msg
    ".st-msg{padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:7px}",
    ".st-msg.ok{background:#eaf3de;color:#2d6624;border:1px solid #b4d4a0}",
    ".st-msg.err{background:#fef5f5;color:#a32d2d;border:1px solid #f7c1c1}",
  ].join("");

  return docHeadV4("Stok & Inventory")
    + "<style>" + css + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "stok", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    +   "<div class=\"topbar-brand\">"
    +     "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-package\"></i></div>"
    +     "<div><div class=\"topbar-name\">Stok & Inventory</div><div class=\"topbar-label\">Kelola Bahan Baku</div></div>"
    +   "</div>"
    + "</header>"
    + "<div class=\"page\">"
    + "<div style=\"display:flex;align-items:center;gap:6px;font-size:12px;color:#7a8c78;margin-bottom:18px\">"
    +   "<a href=\"/operasional\" style=\"color:#2d6624;text-decoration:none;font-weight:500;display:flex;align-items:center;gap:4px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "</div>"
    + "<div style=\"font-size:20px;font-weight:700;color:#1a2318;margin-bottom:4px\">Stok & Inventory</div>"
    + "<div style=\"font-size:13px;color:#6b7c69;margin-bottom:22px\">Pantau stok bahan baku & atur threshold low-stock. Tambah bahan baru lewat <a href=\"/operasional/menu?tab=bahan\" style=\"color:#2d6624;font-weight:500\">tab Bahan Baku</a>.</div>"
    + msgBlock
    // Stats
    + "<div class=\"st-stats\">"
    +   "<div class=\"st-stat s-total\"><div class=\"st-stat-lbl\">Total Bahan</div><div class=\"st-stat-val\">" + total + "</div></div>"
    +   "<div class=\"st-stat s-ok\"><div class=\"st-stat-lbl\">Stok OK</div><div class=\"st-stat-val\">" + cntOk + "</div></div>"
    +   "<div class=\"st-stat s-low\"><div class=\"st-stat-lbl\">Stok Tipis</div><div class=\"st-stat-val\">" + cntLow + "</div></div>"
    +   "<div class=\"st-stat s-out\"><div class=\"st-stat-lbl\">Habis</div><div class=\"st-stat-val\">" + cntOut + "</div></div>"
    +   "<div class=\"st-stat s-nilai\"><div class=\"st-stat-lbl\">Total Nilai Stok</div><div class=\"st-stat-val small\">" + fmtRp(totalNilai) + "</div></div>"
    + "</div>"
    + adjustForm
    + filterBar
    + tableHtml
    + "</div></div></div>"
    + "</body></html>";
}
