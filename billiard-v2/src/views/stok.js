// src/views/stok.js
// ── Halaman Stok & Inventory — kelola stok bahan baku (owner only) ──
// Fitur: stats berwarna per status, threshold ("Belum diatur" badge),
// empty state 2-mode (no data vs filter no match), separate action
// (Restock/Adjust/Threshold), bulk restock, sortable columns (JS), last
// updated info, panel riwayat pergerakan stok.

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

function relTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60)   return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60)   return min + " menit lalu";
  const hour = Math.floor(min / 60);
  if (hour < 24)  return hour + " jam lalu";
  const day = Math.floor(hour / 24);
  if (day < 30)   return day + " hari lalu";
  const month = Math.floor(day / 30);
  if (month < 12) return month + " bulan lalu";
  return Math.floor(month / 12) + " tahun lalu";
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Status stok: out (≤ 0), low (≤ stok_min & > 0 & stok_min > 0), ok.
function stokStatus(stok, stokMin) {
  const s = Number(stok) || 0;
  const m = Number(stokMin) || 0;
  if (s <= 0) return "out";
  if (m > 0 && s <= m) return "low";
  return "ok";
}

const STATUS_CONF = {
  ok:   { label: "OK",          color: "#2d6624", bg: "#eaf3de", icon: "ti-circle-check" },
  low:  { label: "Stok Tipis",  color: "#c47f1a", bg: "#fef9e6", icon: "ti-alert-triangle" },
  out:  { label: "Habis",       color: "#a32d2d", bg: "#fef5f5", icon: "ti-alert-octagon" },
};

const JENIS_CONF = {
  in:     { label: "Masuk",  color: "#2d6624", bg: "#eaf3de", icon: "ti-arrow-down-circle", sign: "+" },
  out:    { label: "Keluar", color: "#a32d2d", bg: "#fef5f5", icon: "ti-arrow-up-circle",   sign: "-" },
  adjust: { label: "Opname", color: "#2660a4", bg: "#e6f1fb", icon: "ti-equal",             sign: "=" },
};

export function stokPage({
  bahanList = [], suppliers = [], recentMovements = [],
  filter = "", searchQ = "",
  role = "owner", displayName = "",
  editBahan = null, action = "",
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
  const totalNilai = bahanList.reduce((s, b) => s + ((Number(b.stok) || 0) * (Number(b.harga_per_satuan) || 0)), 0);

  // ── Edit/action mode ──────────────────────────────────────────
  const isEdit = !!editBahan;
  // action menentukan form mana yg ditampilin saat edit mode.
  const showRestock   = isEdit && (action === "restock" || action === "");
  const showAdjust    = isEdit && action === "adjust";
  const showThreshold = isEdit && action === "threshold";

  // ── Form: Restock (default saat klik +Restock) ────────────────
  const restockForm = showRestock ? ""
    + "<div class=\"st-form-wrap st-form-restock\">"
    +   "<div class=\"st-form-hdr\">"
    +     "<div class=\"st-form-title\"><i class=\"ti ti-arrow-down-circle\"></i> Restock: <b>" + escHtml(editBahan.nama) + "</b></div>"
    +     "<a href=\"/operasional/stok\" class=\"st-cancel\">Batal</a>"
    +   "</div>"
    +   renderEditInfo(editBahan)
    +   "<form action=\"/operasional/stok/restock\" method=\"post\" class=\"st-form\">"
    +     "<input type=\"hidden\" name=\"bahan_id\" value=\"" + editBahan.id + "\">"
    +     "<div class=\"st-form-row\">"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Jumlah Masuk (" + escHtml(editBahan.satuan || "pcs") + ") <span class=\"st-req\">*</span></label>"
    +         "<input class=\"st-inp\" type=\"number\" name=\"qty\" step=\"0.001\" min=\"0.001\" required placeholder=\"Mis. 10\" autofocus>"
    +       "</div>"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Catatan</label>"
    +         "<input class=\"st-inp\" type=\"text\" name=\"catatan\" maxlength=\"200\" placeholder=\"Mis. beli dari Toko ABC tgl 30 Mei\">"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"st-form-actions\">"
    +       "<button type=\"submit\" class=\"st-btn-save st-btn-restock\"><i class=\"ti ti-plus\"></i> Simpan Restock</button>"
    +       "<a href=\"/operasional/stok\" class=\"st-btn-cancel\">Batal</a>"
    +     "</div>"
    +   "</form>"
    + "</div>"
    : "";

  // ── Form: Adjust (kurang/koreksi/opname) ──────────────────────
  // Default radio: 'adjust' (set absolute) — lebih intuitif utk use case "set stok ke
  // nilai tertentu" (mis. opname / set jadi 0). Mode 'out' (kurangi) urutan ke-2.
  const adjustForm = showAdjust ? ""
    + "<div class=\"st-form-wrap st-form-adjust\">"
    +   "<div class=\"st-form-hdr\">"
    +     "<div class=\"st-form-title\"><i class=\"ti ti-adjustments\"></i> Adjust / Koreksi Stok: <b>" + escHtml(editBahan.nama) + "</b></div>"
    +     "<a href=\"/operasional/stok\" class=\"st-cancel\">Batal</a>"
    +   "</div>"
    +   renderEditInfo(editBahan)
    +   "<form action=\"/operasional/stok/adjust\" method=\"post\" class=\"st-form\" id=\"adjustForm\""
    +        " data-stok-lama=\"" + (Number(editBahan.stok) || 0) + "\""
    +        " data-satuan=\"" + escHtml(editBahan.satuan || "pcs") + "\">"
    +     "<input type=\"hidden\" name=\"bahan_id\" value=\"" + editBahan.id + "\">"
    +     "<div class=\"st-adj-jenis\">"
    +       "<label class=\"st-adj-radio\"><input type=\"radio\" name=\"jenis\" value=\"adjust\" checked onchange=\"updateAdjPreview()\"> <i class=\"ti ti-equal\"></i> Set Stok ke Nilai (opname)</label>"
    +       "<label class=\"st-adj-radio\"><input type=\"radio\" name=\"jenis\" value=\"out\" onchange=\"updateAdjPreview()\"> <i class=\"ti ti-minus\"></i> Kurangi (rusak/terpakai)</label>"
    +     "</div>"
    +     "<div class=\"st-form-row\">"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Jumlah (" + escHtml(editBahan.satuan || "pcs") + ") <span class=\"st-req\">*</span></label>"
    +         "<input class=\"st-inp\" type=\"number\" id=\"adjQty\" name=\"qty\" step=\"0.001\" min=\"0\" required placeholder=\"0\" autofocus oninput=\"updateAdjPreview()\">"
    +         "<div class=\"st-adj-preview\" id=\"adjPreview\"></div>"
    +       "</div>"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Catatan</label>"
    +         "<input class=\"st-inp\" type=\"text\" name=\"catatan\" maxlength=\"200\" placeholder=\"Mis. 3 pcs rusak; atau stok opname Mei\">"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"st-form-actions\">"
    +       "<button type=\"submit\" class=\"st-btn-save\"><i class=\"ti ti-check\"></i> Simpan Adjust</button>"
    +       "<a href=\"/operasional/stok\" class=\"st-btn-cancel\">Batal</a>"
    +     "</div>"
    +   "</form>"
    + "</div>"
    : "";

  // ── Form: Set Threshold ───────────────────────────────────────
  const thresholdForm = showThreshold ? ""
    + "<div class=\"st-form-wrap st-form-thr\">"
    +   "<div class=\"st-form-hdr\">"
    +     "<div class=\"st-form-title\"><i class=\"ti ti-alert-triangle\"></i> Set Threshold Min: <b>" + escHtml(editBahan.nama) + "</b></div>"
    +     "<a href=\"/operasional/stok\" class=\"st-cancel\">Batal</a>"
    +   "</div>"
    +   "<div class=\"st-thr-hint\"><i class=\"ti ti-info-circle\"></i> Threshold min = batas bawah stok. Saat stok turun di bawah/sama dgn nilai ini, status berubah jadi <b>Stok Tipis</b>. Isi <b>0</b> utk hilangkan threshold.</div>"
    +   "<form action=\"/operasional/stok/set-threshold\" method=\"post\" class=\"st-form\">"
    +     "<input type=\"hidden\" name=\"bahan_id\" value=\"" + editBahan.id + "\">"
    +     "<div class=\"st-form-row\">"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Threshold Min (" + escHtml(editBahan.satuan || "pcs") + ")</label>"
    +         "<input class=\"st-inp\" type=\"number\" name=\"stok_min\" step=\"0.001\" min=\"0\" required value=\"" + (Number(editBahan.stok_min) || 0) + "\" autofocus>"
    +       "</div>"
    +       "<div class=\"st-form-field\">"
    +         "<label class=\"st-lbl\">Info</label>"
    +         "<div class=\"st-thr-curr\">Stok saat ini: <b>" + fmtStok(editBahan.stok) + " " + escHtml(editBahan.satuan || "pcs") + "</b></div>"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"st-form-actions\">"
    +       "<button type=\"submit\" class=\"st-btn-save\"><i class=\"ti ti-check\"></i> Simpan Threshold</button>"
    +       "<a href=\"/operasional/stok\" class=\"st-btn-cancel\">Batal</a>"
    +     "</div>"
    +   "</form>"
    + "</div>"
    : "";

  // ── Row render ────────────────────────────────────────────────
  const renderRow = (b) => {
    const st = stokStatus(b.stok, b.stok_min);
    const conf = STATUS_CONF[st];
    const supNama = b.supplier_nama || b.supplier || "";
    const nilai = (Number(b.stok) || 0) * (Number(b.harga_per_satuan) || 0);
    const hasMin = Number(b.stok_min) > 0;
    const lastAt = b.last_movement_at || b.updated_at;
    const lastBy = b.last_movement_by || "";

    return ""
      + "<tr class=\"st-row st-" + st + "\""
      +    " data-nama=\"" + escHtml((b.nama || "").toLowerCase()) + "\""
      +    " data-stok=\"" + (Number(b.stok) || 0) + "\""
      +    " data-min=\""  + (Number(b.stok_min) || 0) + "\""
      +    " data-nilai=\"" + nilai + "\""
      +    " data-status=\"" + st + "\""
      +    " data-last=\""  + (lastAt ? new Date(lastAt).getTime() : 0) + "\">"
      +   "<td class=\"st-col-chk\">"
      +     "<label class=\"st-chk-wrap\"><input type=\"checkbox\" class=\"st-row-chk\" data-id=\"" + b.id + "\" data-nama=\"" + escHtml(b.nama) + "\" data-satuan=\"" + escHtml(b.satuan || "pcs") + "\"><span></span></label>"
      +   "</td>"
      +   "<td class=\"st-col-nama\">"
      +     "<div class=\"st-nama-main\">" + escHtml(b.nama) + "</div>"
      +     (supNama ? "<div class=\"st-nama-sup\"><i class=\"ti ti-truck\"></i> " + escHtml(supNama) + "</div>" : "")
      +   "</td>"
      +   "<td class=\"st-col-stok\">"
      +     "<span class=\"st-stok-val\">" + fmtStok(b.stok) + "</span>"
      +     "<span class=\"st-stok-satuan\"> " + escHtml(b.satuan || "pcs") + "</span>"
      +   "</td>"
      +   "<td class=\"st-col-min\">"
      +     (hasMin
        ? "<span class=\"st-min-val\">" + fmtStok(b.stok_min) + " " + escHtml(b.satuan || "pcs") + "</span>"
        : "<span class=\"st-badge st-badge-none\"><i class=\"ti ti-help-circle\"></i> Belum diatur</span>")
      +   "</td>"
      +   "<td class=\"st-col-status\">"
      +     "<span class=\"st-badge\" style=\"background:" + conf.bg + ";color:" + conf.color + "\">"
      +       "<i class=\"ti " + conf.icon + "\"></i> " + conf.label
      +     "</span>"
      +   "</td>"
      +   "<td class=\"st-col-harga\">" + fmtRp(b.harga_per_satuan) + "</td>"
      +   "<td class=\"st-col-nilai\">" + fmtRp(nilai) + "</td>"
      +   "<td class=\"st-col-last\">"
      +     (lastAt
        ? "<div class=\"st-last-time\" title=\"" + escHtml(fmtDateTime(lastAt)) + "\">" + relTime(lastAt) + "</div>"
          + (lastBy ? "<div class=\"st-last-by\"><i class=\"ti ti-user\"></i> " + escHtml(lastBy) + "</div>" : "")
        : "<span class=\"st-last-none\">—</span>")
      +   "</td>"
      +   "<td class=\"st-col-act\">"
      +     "<a href=\"/operasional/stok?edit=" + b.id + "&action=restock\" class=\"st-act st-act-restock\" title=\"Restock (tambah stok masuk)\"><i class=\"ti ti-plus\"></i> Restock</a>"
      +     "<a href=\"/operasional/stok?edit=" + b.id + "&action=adjust\" class=\"st-act st-act-adjust\" title=\"Adjust / Koreksi\"><i class=\"ti ti-adjustments\"></i> Adjust</a>"
      +     "<a href=\"/operasional/stok?edit=" + b.id + "&action=threshold\" class=\"st-act st-act-thr\" title=\"Set Threshold Min\"><i class=\"ti ti-alert-triangle\"></i></a>"
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
    +     filterPill("",     "Semua",        total,         !filter)
    +     filterPill("warn", "Perlu Restok", cntLow + cntOut, filter === "warn")
    +     filterPill("low",  "Stok Tipis",   cntLow,         filter === "low")
    +     filterPill("out",  "Habis",        cntOut,         filter === "out")
    +   "</div>"
    +   "<form method=\"get\" action=\"/operasional/stok\" class=\"st-search\">"
    +     (filter ? "<input type=\"hidden\" name=\"filter\" value=\"" + escHtml(filter) + "\">" : "")
    +     "<i class=\"ti ti-search st-search-icon\"></i>"
    +     "<input class=\"st-search-inp\" type=\"text\" name=\"q\" placeholder=\"Cari nama bahan...\" value=\"" + escHtml(searchQ || "") + "\">"
    +     (q ? "<a href=\"/operasional/stok" + (filter ? "?filter=" + escHtml(filter) : "") + "\" class=\"st-search-clear\"><i class=\"ti ti-x\"></i></a>" : "")
    +   "</form>"
    + "</div>";

  // ── Bulk toolbar (hidden by default, JS shows it) ─────────────
  const bulkToolbar = ""
    + "<div class=\"st-bulk-bar\" id=\"stBulkBar\" style=\"display:none\">"
    +   "<div class=\"st-bulk-info\"><span id=\"stBulkCount\">0</span> bahan dipilih</div>"
    +   "<div class=\"st-bulk-actions\">"
    +     "<button type=\"button\" class=\"st-bulk-btn st-bulk-restock\" onclick=\"openBulkRestock()\"><i class=\"ti ti-arrow-down-circle\"></i> Restock Sekaligus</button>"
    +     "<button type=\"button\" class=\"st-bulk-btn-cancel\" onclick=\"clearBulkSelection()\"><i class=\"ti ti-x\"></i> Batal Pilih</button>"
    +   "</div>"
    + "</div>";

  // ── Bulk restock modal/inline form (initially hidden) ─────────
  const bulkForm = ""
    + "<div class=\"st-bulk-modal\" id=\"stBulkModal\" style=\"display:none\">"
    +   "<div class=\"st-bulk-modal-inner\">"
    +     "<div class=\"st-form-hdr\">"
    +       "<div class=\"st-form-title\"><i class=\"ti ti-arrow-down-circle\"></i> Bulk Restock</div>"
    +       "<button type=\"button\" class=\"st-cancel\" onclick=\"closeBulkRestock()\">Tutup</button>"
    +     "</div>"
    +     "<div class=\"st-bulk-hint\"><i class=\"ti ti-info-circle\"></i> Isi jumlah utk setiap bahan. Bahan dgn jumlah 0/kosong akan di-skip.</div>"
    +     "<form action=\"/operasional/stok/bulk-restock\" method=\"post\" class=\"st-form\">"
    +       "<div id=\"stBulkList\" class=\"st-bulk-list\"></div>"
    +       "<div class=\"st-form-row\">"
    +         "<div class=\"st-form-field st-form-full\">"
    +           "<label class=\"st-lbl\">Catatan (untuk semua bahan di atas)</label>"
    +           "<input class=\"st-inp\" type=\"text\" name=\"catatan\" maxlength=\"200\" placeholder=\"Mis. Belanja stok Mei dari Toko ABC\">"
    +         "</div>"
    +       "</div>"
    +       "<div class=\"st-form-actions\">"
    +         "<button type=\"submit\" class=\"st-btn-save st-btn-restock\"><i class=\"ti ti-check\"></i> Simpan Bulk Restock</button>"
    +         "<button type=\"button\" class=\"st-btn-cancel\" onclick=\"closeBulkRestock()\">Batal</button>"
    +       "</div>"
    +     "</form>"
    +   "</div>"
    + "</div>";

  // ── Empty state 2-mode ────────────────────────────────────────
  const emptyNoData = ""
    + "<div class=\"st-empty st-empty-onboard\">"
    +   "<i class=\"ti ti-package-off\"></i>"
    +   "<div class=\"st-empty-title\">Mulai catat stok pertama</div>"
    +   "<div class=\"st-empty-sub\">Belum ada bahan baku terdaftar. Tambahkan bahan baku pertama (nama, satuan, harga per satuan, dll), baru stoknya bisa dikelola di sini.</div>"
    +   "<div class=\"st-empty-cta\">"
    +     "<a href=\"/operasional/menu?tab=bahan\" class=\"st-empty-btn\"><i class=\"ti ti-plus\"></i> Tambah Bahan Baku Pertama</a>"
    +   "</div>"
    + "</div>";

  const emptyFilter = ""
    + "<div class=\"st-empty\">"
    +   "<i class=\"ti ti-mood-empty\"></i>"
    +   "<div class=\"st-empty-title\">Tidak ada bahan yang cocok dgn filter</div>"
    +   "<div class=\"st-empty-sub\">Coba ubah filter atau hapus pencarian.</div>"
    + "</div>";

  // ── Table ─────────────────────────────────────────────────────
  // Sort indicator panah ditambahkan via JS (data-sort-col atribut header).
  const tableHtml = ""
    + "<div class=\"st-table-wrap\">"
    + "<table class=\"st-table\" id=\"stTable\">"
    +   "<thead><tr>"
    +     "<th class=\"st-col-chk\"><label class=\"st-chk-wrap\"><input type=\"checkbox\" id=\"stChkAll\" onclick=\"toggleAllChk(this)\"><span></span></label></th>"
    +     "<th class=\"st-sortable\" data-sort=\"nama\">Bahan</th>"
    +     "<th class=\"st-sortable\" data-sort=\"stok\">Stok</th>"
    +     "<th class=\"st-sortable\" data-sort=\"min\">Threshold</th>"
    +     "<th class=\"st-sortable\" data-sort=\"status\">Status</th>"
    +     "<th>Harga/Satuan</th>"
    +     "<th class=\"st-sortable\" data-sort=\"nilai\">Nilai Stok</th>"
    +     "<th class=\"st-sortable\" data-sort=\"last\">Terakhir Diperbarui</th>"
    +     "<th class=\"st-col-act-hdr\">Aksi</th>"
    +   "</tr></thead>"
    +   "<tbody id=\"stTbody\">" + filtered.map(renderRow).join("") + "</tbody>"
    + "</table>"
    + "</div>";

  // ── Riwayat panel di bawah tabel ──────────────────────────────
  const renderMov = (m) => {
    const conf = JENIS_CONF[m.jenis] || JENIS_CONF.adjust;
    const sat  = m.bahan_satuan || "pcs";
    return ""
      + "<div class=\"st-mov-item\">"
      +   "<div class=\"st-mov-icon\" style=\"background:" + conf.bg + ";color:" + conf.color + "\">"
      +     "<i class=\"ti " + conf.icon + "\"></i>"
      +   "</div>"
      +   "<div class=\"st-mov-body\">"
      +     "<div class=\"st-mov-head\">"
      +       "<span class=\"st-mov-bahan\">" + escHtml(m.bahan_nama || "(bahan dihapus)") + "</span>"
      +       "<span class=\"st-mov-jenis\" style=\"color:" + conf.color + "\">" + conf.label + "</span>"
      +     "</div>"
      +     "<div class=\"st-mov-meta\">"
      +       "<span class=\"st-mov-qty\" style=\"color:" + conf.color + "\">"
      +         conf.sign + " " + fmtStok(Math.abs(m.qty_change)) + " " + escHtml(sat)
      +       "</span>"
      +       "<span class=\"st-mov-after\">→ stok jadi <b>" + fmtStok(m.qty_after) + " " + escHtml(sat) + "</b></span>"
      +     "</div>"
      +     (m.catatan ? "<div class=\"st-mov-catatan\"><i class=\"ti ti-note\"></i> " + escHtml(m.catatan) + "</div>" : "")
      +     "<div class=\"st-mov-foot\">"
      +       "<span class=\"st-mov-time\" title=\"" + escHtml(fmtDateTime(m.created_at)) + "\"><i class=\"ti ti-clock\"></i> " + relTime(m.created_at) + "</span>"
      +       (m.created_by ? "<span class=\"st-mov-by\"><i class=\"ti ti-user\"></i> " + escHtml(m.created_by) + "</span>" : "")
      +     "</div>"
      +   "</div>"
      + "</div>";
  };

  const movPanel = recentMovements.length === 0
    ? ""
    : ""
      + "<div class=\"st-mov-panel\">"
      +   "<div class=\"st-mov-hdr\">"
      +     "<div class=\"st-mov-title\"><i class=\"ti ti-history\"></i> Riwayat Pergerakan Stok Terakhir</div>"
      +     "<div class=\"st-mov-count\">" + recentMovements.length + " entry terbaru</div>"
      +   "</div>"
      +   "<div class=\"st-mov-list\">" + recentMovements.map(renderMov).join("") + "</div>"
      + "</div>";

  // ── Message banner ────────────────────────────────────────────
  const msgBlock = msg === "adjusted"   ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Stok berhasil di-adjust.</div>"
                 : msg === "restocked"  ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Restock berhasil dicatat.</div>"
                 : msg === "threshold"  ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Threshold min disimpan.</div>"
                 : msg === "bulkrestock" ? "<div class=\"st-msg ok\"><i class=\"ti ti-circle-check\"></i> Bulk restock selesai.</div>"
                 : msg === "nochange"   ? "<div class=\"st-msg warn\"><i class=\"ti ti-info-circle\"></i> Tidak ada perubahan stok — nilai yang di-input sama dengan stok saat ini.</div>"
                 : hasErr               ? "<div class=\"st-msg err\"><i class=\"ti ti-alert-circle\"></i> Gagal menyimpan — pastikan input valid (qty &gt; 0 untuk mode Kurangi, tidak negatif).</div>"
                 : "";

  // ── CSS ───────────────────────────────────────────────────────
  const css = [
    ".main-wrap,.page{background:#f4f6f3!important}",

    // Stats — text color sesuai status border
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
    ".st-stat-val{font-size:22px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace;line-height:1}",
    ".st-stat-val.small{font-size:15px}",
    // Colored numbers
    ".st-stat.s-ok  .st-stat-val{color:#2d6624}",
    ".st-stat.s-low .st-stat-val{color:#c47f1a}",
    ".st-stat.s-out .st-stat-val{color:#a32d2d}",
    ".st-stat.s-nilai .st-stat-val{color:#2660a4}",

    // Form wrap (Restock/Adjust/Threshold)
    ".st-form-wrap{background:#fff;border:1px solid #e2e8e0;border-radius:12px;padding:18px;margin-bottom:18px}",
    ".st-form-restock{border-color:#2d6624;background:#f5faf0}",
    ".st-form-adjust{border-color:#c47f1a;background:#fffbf2}",
    ".st-form-thr{border-color:#2660a4;background:#f0f6fb}",
    ".st-form-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,.06)}",
    ".st-form-title{font-size:14px;font-weight:700;color:#1a2318;display:flex;align-items:center;gap:7px}",
    ".st-form-title i{font-size:18px}",
    ".st-form-restock .st-form-title i{color:#2d6624}",
    ".st-form-adjust .st-form-title i{color:#c47f1a}",
    ".st-form-thr .st-form-title i{color:#2660a4}",
    ".st-cancel{font-size:12px;color:#7a8c78;text-decoration:none;padding:6px 10px;border-radius:6px;background:#fff;border:1px solid #e2e8e0;cursor:pointer;font-family:'DM Sans',sans-serif}",
    ".st-cancel:hover{background:#eef1ed}",

    ".st-form-info{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;padding:12px;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:8px}",
    "@media(max-width:768px){.st-form-info{grid-template-columns:repeat(2,1fr)}}",
    ".st-form-info-lbl{font-size:10px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}",
    ".st-form-info-val{font-size:14px;font-weight:600;color:#1a2318;font-family:'DM Mono',monospace}",

    ".st-form{display:flex;flex-direction:column;gap:12px}",
    ".st-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "@media(max-width:768px){.st-form-row{grid-template-columns:1fr}}",
    ".st-form-full{grid-column:1 / -1}",
    ".st-lbl{display:block;font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".st-req{color:#a32d2d}",
    ".st-inp{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#fff;outline:none}",
    ".st-inp:focus{border-color:#2d6624}",
    ".st-form-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid rgba(0,0,0,.06)}",
    ".st-btn-save{padding:9px 18px;background:#c47f1a;border:none;border-radius:7px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:6px}",
    ".st-btn-save:hover{background:#a86a15}",
    ".st-btn-restock{background:#2d6624}",
    ".st-btn-restock:hover{background:#255519}",
    ".st-btn-cancel{padding:9px 18px;background:#fff;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-weight:500;color:#7a8c78;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer;font-family:'DM Sans',sans-serif}",
    ".st-btn-cancel:hover{background:#f4f6f3}",
    ".st-adj-jenis{display:flex;gap:10px;flex-wrap:wrap}",
    ".st-adj-radio{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fff;border:1px solid #e2e8e0;border-radius:8px;font-size:12.5px;font-weight:500;cursor:pointer}",
    ".st-adj-radio:has(input:checked){background:#fef9e6;border-color:#c47f1a;color:#c47f1a}",
    ".st-adj-radio input{margin:0}",
    // Preview line
    ".st-adj-preview{margin-top:6px;font-size:12px;color:#4a5e58;padding:6px 10px;background:#fff;border:1px dashed #d4ddd2;border-radius:6px;font-family:'DM Mono',monospace;display:none}",
    ".st-adj-preview.show{display:block}",
    ".st-adj-preview.warn{border-color:#f7c1c1;color:#a32d2d;background:#fef5f5;border-style:solid}",
    ".st-adj-preview b{color:#1a2318}",
    ".st-thr-hint,.st-bulk-hint{padding:10px 14px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:8px;font-size:12px;color:#4a5e58;margin-bottom:12px;display:flex;align-items:flex-start;gap:7px;line-height:1.5}",
    ".st-thr-hint i,.st-bulk-hint i{color:#2660a4;font-size:14px;flex-shrink:0;margin-top:1px}",
    ".st-thr-curr{padding:9px 12px;background:#fff;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;color:#1a2318}",

    // Filter
    ".st-filter{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}",
    ".st-pills{display:flex;gap:6px;flex-wrap:wrap}",
    ".st-pill{padding:7px 13px;border-radius:20px;background:#fff;border:1px solid #e2e8e0;font-size:12px;font-weight:500;color:#4a5e58;text-decoration:none;display:inline-flex;align-items:center;gap:5px}",
    ".st-pill:hover{background:#eef1ed}",
    ".st-pill.active{background:#2d6624;border-color:#2d6624;color:#fff}",
    ".st-pill-cnt{font-size:10.5px;background:rgba(255,255,255,.2);padding:1px 7px;border-radius:10px;min-width:18px;text-align:center}",
    ".st-pill:not(.active) .st-pill-cnt{background:#f0f3ef;color:#7a8c78}",
    ".st-search{display:flex;align-items:center;background:#fff;border:1px solid #e2e8e0;border-radius:7px;padding:0 10px;max-width:280px}",
    ".st-search-icon{font-size:14px;color:#7a8c78}",
    ".st-search-inp{flex:1;padding:8px 8px;border:none;background:transparent;font-size:12.5px;font-family:'DM Sans',sans-serif;outline:none;color:#1a2318;min-width:140px}",
    ".st-search-clear{padding:4px;color:#7a8c78;text-decoration:none;display:inline-flex}",

    // Bulk toolbar
    ".st-bulk-bar{background:#2d6624;color:#fff;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;animation:slideDown .2s ease-out}",
    "@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}",
    ".st-bulk-info{font-size:13px;font-weight:600}",
    ".st-bulk-info #stBulkCount{font-size:15px;font-weight:700;font-family:'DM Mono',monospace}",
    ".st-bulk-actions{display:flex;gap:6px;flex-wrap:wrap}",
    ".st-bulk-btn{padding:7px 14px;background:#fff;color:#2d6624;border:none;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:'DM Sans',sans-serif}",
    ".st-bulk-btn:hover{background:#eaf3de}",
    ".st-bulk-btn-cancel{padding:7px 14px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:7px;font-size:12.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:'DM Sans',sans-serif}",
    ".st-bulk-btn-cancel:hover{background:rgba(255,255,255,.1)}",

    // Bulk modal (inline overlay)
    ".st-bulk-modal{position:fixed;inset:0;background:rgba(15,30,12,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}",
    ".st-bulk-modal-inner{background:#fff;border-radius:12px;max-width:680px;width:100%;max-height:85vh;overflow:auto;padding:18px}",
    ".st-bulk-list{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;padding:4px}",
    ".st-bulk-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f9fbf8;border:1px solid #e2e8e0;border-radius:8px}",
    ".st-bulk-item-nama{flex:1;font-size:13px;font-weight:600;color:#1a2318}",
    ".st-bulk-item-curr{font-size:11px;color:#7a8c78;font-family:'DM Mono',monospace}",
    ".st-bulk-item-inp{width:120px}",
    ".st-bulk-item-sat{font-size:11px;color:#7a8c78;min-width:40px}",

    // Table
    ".st-table-wrap{background:#fff;border:1px solid #e2e8e0;border-radius:10px;overflow:hidden;overflow-x:auto}",
    ".st-table{width:100%;border-collapse:collapse;min-width:900px}",
    ".st-table thead th{background:#f4f6f3;padding:10px 12px;font-size:11px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.05em;text-align:left;border-bottom:1px solid #e2e8e0;white-space:nowrap}",
    ".st-table tbody td{padding:11px 12px;font-size:12.5px;color:#1a2318;border-bottom:1px solid #f0f3ef;vertical-align:middle}",
    ".st-table tbody tr:hover{background:#f9fbf8}",
    ".st-table tbody tr:last-child td{border-bottom:none}",
    ".st-row.st-low{background:#fffbf2}",
    ".st-row.st-low:hover{background:#fef9e6}",
    ".st-row.st-out{background:#fef5f5}",
    ".st-row.st-out:hover{background:#fcdede}",
    ".st-row.st-selected{background:#eaf3de !important;outline:2px solid #2d6624;outline-offset:-2px}",
    // Sortable headers — arrow via pseudo-element (unicode, lebih reliable dari Tabler font)
    ".st-sortable{cursor:pointer;user-select:none;position:relative}",
    ".st-sortable:hover{color:#2d6624;background:#eef1ed!important}",
    ".st-sortable::after{content:' \\2195';opacity:.35;font-size:11px;margin-left:3px;vertical-align:middle}",
    ".st-sortable.sort-asc::after{content:' \\2191';opacity:1;color:#2d6624}",
    ".st-sortable.sort-desc::after{content:' \\2193';opacity:1;color:#2d6624}",
    // Checkbox col
    ".st-col-chk{width:32px;text-align:center}",
    ".st-chk-wrap{display:inline-flex;align-items:center;cursor:pointer;position:relative}",
    ".st-chk-wrap input{width:16px;height:16px;cursor:pointer;accent-color:#2d6624}",
    ".st-col-nama{min-width:160px}",
    ".st-nama-main{font-weight:600;color:#1a2318}",
    ".st-nama-sup{font-size:10.5px;color:#7a8c78;margin-top:2px;display:flex;align-items:center;gap:3px}",
    ".st-nama-sup i{font-size:11px}",
    ".st-col-stok,.st-col-min,.st-col-harga,.st-col-nilai{font-family:'DM Mono',monospace;white-space:nowrap}",
    ".st-stok-val{font-size:14px;font-weight:700;color:#1a2318}",
    ".st-stok-satuan{font-size:11px;color:#7a8c78;font-family:'DM Sans',sans-serif}",
    ".st-min-val{font-size:12px;color:#7a8c78}",
    ".st-col-harga{font-size:11.5px;color:#7a8c78}",
    ".st-col-nilai{font-size:12px;color:#4a5e58}",
    ".st-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:600;white-space:nowrap}",
    ".st-badge i{font-size:12px}",
    ".st-badge-none{background:#f0f3ef;color:#7a8c78;border:1px dashed #d4ddd2}",
    ".st-col-last{min-width:130px}",
    ".st-last-time{font-size:11.5px;color:#4a5e58;font-weight:500}",
    ".st-last-by{font-size:10.5px;color:#7a8c78;display:flex;align-items:center;gap:3px;margin-top:1px}",
    ".st-last-by i{font-size:11px}",
    ".st-last-none{color:#b0bfae;font-style:italic;font-size:11.5px}",

    ".st-col-act{white-space:nowrap;text-align:right}",
    ".st-col-act-hdr{text-align:right}",
    ".st-act{padding:5px 9px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-left:3px;border:1px solid;vertical-align:middle}",
    ".st-act-restock{background:#eaf3de;border-color:#b4d4a0;color:#2d6624}",
    ".st-act-restock:hover{background:#dceacb}",
    ".st-act-adjust{background:#fef9e6;border-color:#f0e3c5;color:#c47f1a}",
    ".st-act-adjust:hover{background:#fef0c4}",
    ".st-act-thr{background:#f0f6fb;border-color:#c5d8ea;color:#2660a4;padding:5px 7px}",
    ".st-act-thr:hover{background:#e0ecf6}",
    ".st-act i{font-size:13px}",

    // Empty
    ".st-empty{background:#fff;border:1px dashed #d4ddd2;border-radius:12px;padding:40px 20px;text-align:center;color:#7a8c78}",
    ".st-empty i{font-size:42px;margin-bottom:10px;color:#b0bfae;display:block}",
    ".st-empty-title{font-size:14px;font-weight:600;color:#1a2318;margin-bottom:5px}",
    ".st-empty-sub{font-size:12px;color:#7a8c78;max-width:480px;margin:0 auto;line-height:1.5}",
    ".st-empty-onboard{padding:50px 20px;background:linear-gradient(180deg,#fff 0%,#f9fbf8 100%);border:1px dashed #b4d4a0}",
    ".st-empty-onboard i{color:#2d6624}",
    ".st-empty-onboard .st-empty-title{font-size:18px;color:#1a2318}",
    ".st-empty-cta{margin-top:18px}",
    ".st-empty-btn{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#2d6624;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;box-shadow:0 2px 6px rgba(45,102,36,.2)}",
    ".st-empty-btn:hover{background:#255519;box-shadow:0 3px 10px rgba(45,102,36,.3)}",
    ".st-empty-btn i{font-size:15px}",

    // Riwayat panel
    ".st-mov-panel{margin-top:18px;background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:16px 18px}",
    ".st-mov-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f0f3ef}",
    ".st-mov-title{font-size:14px;font-weight:700;color:#1a2318;display:flex;align-items:center;gap:6px}",
    ".st-mov-title i{font-size:16px;color:#2660a4}",
    ".st-mov-count{font-size:11px;color:#7a8c78}",
    ".st-mov-list{display:flex;flex-direction:column;gap:8px;max-height:480px;overflow-y:auto;padding-right:4px}",
    ".st-mov-item{display:flex;gap:10px;padding:10px 12px;background:#f9fbf8;border:1px solid #e2e8e0;border-radius:8px}",
    ".st-mov-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".st-mov-icon i{font-size:16px}",
    ".st-mov-body{flex:1;min-width:0}",
    ".st-mov-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}",
    ".st-mov-bahan{font-size:13px;font-weight:600;color:#1a2318}",
    ".st-mov-jenis{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}",
    ".st-mov-meta{font-size:12px;color:#4a5e58;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:'DM Mono',monospace}",
    ".st-mov-qty{font-weight:700}",
    ".st-mov-after{color:#7a8c78}",
    ".st-mov-catatan{font-size:11.5px;color:#7a8c78;font-style:italic;margin-top:4px;display:flex;align-items:flex-start;gap:4px}",
    ".st-mov-catatan i{font-size:12px;color:#b0bfae;flex-shrink:0;margin-top:1px}",
    ".st-mov-foot{margin-top:5px;display:flex;gap:10px;align-items:center;font-size:10.5px;color:#7a8c78}",
    ".st-mov-foot i{font-size:11px;color:#b0bfae;margin-right:2px}",
    ".st-mov-time,.st-mov-by{display:inline-flex;align-items:center;gap:2px}",

    // Msg
    ".st-msg{padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:7px}",
    ".st-msg.ok{background:#eaf3de;color:#2d6624;border:1px solid #b4d4a0}",
    ".st-msg.err{background:#fef5f5;color:#a32d2d;border:1px solid #f7c1c1}",
    ".st-msg.warn{background:#fef9e6;color:#c47f1a;border:1px solid #f0e3c5}",
  ].join("");

  // ── JS: sorting + bulk select + bulk modal + adjust preview ────
  const js = `
    // ── Adjust preview: hitung "stok akan jadi" realtime ─────
    function updateAdjPreview() {
      var form = document.getElementById("adjustForm");
      var prev = document.getElementById("adjPreview");
      var qtyInp = document.getElementById("adjQty");
      if (!form || !prev) return;
      var stokLama = parseFloat(form.dataset.stokLama) || 0;
      var satuan   = form.dataset.satuan || "pcs";
      var qty      = parseFloat(qtyInp.value) || 0;
      var jenis    = (form.querySelector('input[name="jenis"]:checked') || {}).value || "adjust";
      if (!qtyInp.value) { prev.classList.remove("show","warn"); prev.innerHTML = ""; return; }

      var stokBaru, label, warn = false;
      if (jenis === "adjust") {
        stokBaru = Math.max(0, qty);
        label = "→ Stok akan jadi: <b>" + fmtNum(stokBaru) + " " + satuan + "</b>";
        if (stokBaru === stokLama) { warn = true; label += " (tidak berubah — gak akan disimpan)"; }
      } else {
        // out
        if (qty <= 0) { warn = true; label = "Mode 'Kurangi' butuh jumlah > 0."; }
        else {
          stokBaru = Math.max(0, stokLama - qty);
          label = "→ Stok akan jadi: <b>" + fmtNum(stokBaru) + " " + satuan + "</b>"
                + " (kurangi " + fmtNum(qty) + " " + satuan + ")";
        }
      }
      prev.innerHTML = label;
      prev.classList.add("show");
      prev.classList.toggle("warn", warn);
    }
    function fmtNum(n) {
      var num = Number(n) || 0;
      if (Number.isInteger(num)) return num.toString();
      return num.toFixed(3).replace(/\\.?0+$/, "").replace(".", ",");
    }
    // Trigger initial preview kalau form sudah ada (defer DOMContentLoaded)
    document.addEventListener("DOMContentLoaded", function(){
      if (document.getElementById("adjustForm")) updateAdjPreview();
    });

    // ── Sorting: klik header toggle direction ────────────────
    (function(){
      var tbody = document.getElementById("stTbody");
      var headers = document.querySelectorAll("#stTable .st-sortable");
      var current = { col: null, dir: "asc" };
      function sortRows(col, dir) {
        if (!tbody) return;
        var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
        var STATUS_RANK = { out: 0, low: 1, ok: 2 };
        rows.sort(function(a, b){
          var av, bv;
          if (col === "nama") {
            av = (a.dataset.nama || "").toLowerCase();
            bv = (b.dataset.nama || "").toLowerCase();
            return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
          }
          if (col === "status") {
            av = STATUS_RANK[a.dataset.status] != null ? STATUS_RANK[a.dataset.status] : 99;
            bv = STATUS_RANK[b.dataset.status] != null ? STATUS_RANK[b.dataset.status] : 99;
          } else {
            av = parseFloat(a.dataset[col === "min" ? "min" : (col === "last" ? "last" : col)]) || 0;
            bv = parseFloat(b.dataset[col === "min" ? "min" : (col === "last" ? "last" : col)]) || 0;
          }
          return dir === "asc" ? av - bv : bv - av;
        });
        rows.forEach(function(r){ tbody.appendChild(r); });
      }
      headers.forEach(function(h){
        h.addEventListener("click", function(){
          var col = h.dataset.sort;
          var dir = (current.col === col && current.dir === "asc") ? "desc" : "asc";
          headers.forEach(function(x){ x.classList.remove("sort-asc","sort-desc"); });
          h.classList.add(dir === "asc" ? "sort-asc" : "sort-desc");
          current = { col: col, dir: dir };
          sortRows(col, dir);
        });
      });
    })();

    // ── Bulk select ─────────────────────────────────────────
    function toggleAllChk(master) {
      var rows = document.querySelectorAll(".st-row-chk");
      rows.forEach(function(c){
        if (c.offsetParent !== null) {  // skip hidden rows
          c.checked = master.checked;
          var tr = c.closest("tr");
          if (tr) tr.classList.toggle("st-selected", c.checked);
        }
      });
      updateBulkBar();
    }
    function updateBulkBar() {
      var checked = document.querySelectorAll(".st-row-chk:checked");
      var bar = document.getElementById("stBulkBar");
      var cnt = document.getElementById("stBulkCount");
      if (bar && cnt) {
        cnt.textContent = checked.length;
        bar.style.display = checked.length > 0 ? "flex" : "none";
      }
    }
    document.addEventListener("change", function(e){
      if (e.target && e.target.classList.contains("st-row-chk")) {
        var tr = e.target.closest("tr");
        if (tr) tr.classList.toggle("st-selected", e.target.checked);
        updateBulkBar();
      }
    });
    function clearBulkSelection() {
      document.querySelectorAll(".st-row-chk").forEach(function(c){
        c.checked = false;
        var tr = c.closest("tr");
        if (tr) tr.classList.remove("st-selected");
      });
      var master = document.getElementById("stChkAll");
      if (master) master.checked = false;
      updateBulkBar();
    }

    // ── Bulk restock modal ──────────────────────────────────
    function openBulkRestock() {
      var checked = document.querySelectorAll(".st-row-chk:checked");
      if (checked.length === 0) return;
      var list = document.getElementById("stBulkList");
      list.innerHTML = "";
      checked.forEach(function(c){
        var id  = c.dataset.id;
        var nm  = c.dataset.nama;
        var sat = c.dataset.satuan;
        var tr  = c.closest("tr");
        var stokNow = tr ? tr.dataset.stok : "0";
        var div = document.createElement("div");
        div.className = "st-bulk-item";
        div.innerHTML = '<div class="st-bulk-item-nama">' + escapeHtml(nm) +
          ' <span class="st-bulk-item-curr">(saat ini: ' + stokNow + ' ' + escapeHtml(sat) + ')</span></div>' +
          '<input type="hidden" name="bahan_ids[]" value="' + id + '">' +
          '<input class="st-inp st-bulk-item-inp" type="number" name="qty_' + id + '" step="0.001" min="0" placeholder="Jumlah masuk">' +
          '<span class="st-bulk-item-sat">' + escapeHtml(sat) + '</span>';
        list.appendChild(div);
      });
      document.getElementById("stBulkModal").style.display = "flex";
    }
    function closeBulkRestock() {
      document.getElementById("stBulkModal").style.display = "none";
    }
    function escapeHtml(s) {
      return String(s == null ? "" : s)
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }
  `;

  // ── Pick which empty state ───────────────────────────────────
  // Empty mode:
  //   - bahanList kosong → onboard empty (CTA "Mulai catat stok pertama")
  //   - bahanList ada tapi filter no match → filter empty
  //   - filtered ada → render table
  let bodyHtml;
  if (bahanList.length === 0) {
    bodyHtml = emptyNoData;
  } else if (filtered.length === 0) {
    bodyHtml = filterBar + emptyFilter;
  } else {
    bodyHtml = filterBar + bulkToolbar + tableHtml + movPanel;
  }

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
    + "<div style=\"font-size:13px;color:#6b7c69;margin-bottom:22px\">Pantau stok bahan baku, atur threshold low-stock, dan catat restock. Bahan baru ditambahkan lewat <a href=\"/operasional/menu?tab=bahan\" style=\"color:#2d6624;font-weight:500\">tab Bahan Baku</a>.</div>"
    + msgBlock
    // Stats — selalu tampil (sesuai data global, bukan filtered)
    + (bahanList.length > 0
      ? "<div class=\"st-stats\">"
        +   "<div class=\"st-stat s-total\"><div class=\"st-stat-lbl\">Total Bahan</div><div class=\"st-stat-val\">" + total + "</div></div>"
        +   "<div class=\"st-stat s-ok\"><div class=\"st-stat-lbl\">Stok OK</div><div class=\"st-stat-val\">" + cntOk + "</div></div>"
        +   "<div class=\"st-stat s-low\"><div class=\"st-stat-lbl\">Stok Tipis</div><div class=\"st-stat-val\">" + cntLow + "</div></div>"
        +   "<div class=\"st-stat s-out\"><div class=\"st-stat-lbl\">Habis</div><div class=\"st-stat-val\">" + cntOut + "</div></div>"
        +   "<div class=\"st-stat s-nilai\"><div class=\"st-stat-lbl\">Total Nilai Stok</div><div class=\"st-stat-val small\">" + fmtRp(totalNilai) + "</div></div>"
        + "</div>"
      : "")
    + restockForm + adjustForm + thresholdForm
    + bodyHtml
    + bulkForm
    + "</div></div></div>"
    + "<script>" + js + "</script>"
    + "</body></html>";
}

// Helper: render info card untuk edit form (4 kolom: stok now, threshold, harga, nilai)
function renderEditInfo(b) {
  const nilai = (Number(b.stok) || 0) * (Number(b.harga_per_satuan) || 0);
  return ""
    + "<div class=\"st-form-info\">"
    +   "<div><div class=\"st-form-info-lbl\">Stok Saat Ini</div><div class=\"st-form-info-val\">" + fmtStok(b.stok) + " " + escHtml(b.satuan || "pcs") + "</div></div>"
    +   "<div><div class=\"st-form-info-lbl\">Threshold</div><div class=\"st-form-info-val\">" + (Number(b.stok_min) > 0 ? fmtStok(b.stok_min) + " " + escHtml(b.satuan || "pcs") : "—") + "</div></div>"
    +   "<div><div class=\"st-form-info-lbl\">Harga/Satuan</div><div class=\"st-form-info-val\">" + fmtRp(b.harga_per_satuan) + "</div></div>"
    +   "<div><div class=\"st-form-info-lbl\">Nilai Stok</div><div class=\"st-form-info-val\">" + fmtRp(nilai) + "</div></div>"
    + "</div>";
}
