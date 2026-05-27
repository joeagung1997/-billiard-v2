// src/views/catatan.js
// ── Halaman Catatan Fitur — note pengembangan aplikasi (owner only) ──

import { docHeadV4, escHtml, buildFinanceSidebar } from "./finance.js";

// Konfigurasi tampilan untuk priority & status
const PRIORITY_CONF = {
  urgent: { label: "Urgent",  color: "#a32d2d", bg: "#fef5f5", icon: "ti-alert-octagon" },
  high:   { label: "High",    color: "#c47f1a", bg: "#fef9e6", icon: "ti-flame" },
  medium: { label: "Medium",  color: "#2660a4", bg: "#e6f1fb", icon: "ti-equal" },
  low:    { label: "Low",     color: "#7a8c78", bg: "#f4f6f3", icon: "ti-arrow-down-circle" },
};
const STATUS_CONF = {
  ide:      { label: "Ide",      color: "#7c2dc4", bg: "#f3e9fc", icon: "ti-bulb" },
  planning: { label: "Planning", color: "#2660a4", bg: "#e6f1fb", icon: "ti-pencil" },
  coding:   { label: "Coding",   color: "#c47f1a", bg: "#fef9e6", icon: "ti-code" },
  done:     { label: "Done",     color: "#2d6624", bg: "#eaf3de", icon: "ti-check" },
};

const PRIORITY_KEYS = ["urgent", "high", "medium", "low"];
const STATUS_KEYS   = ["ide", "planning", "coding", "done"];

// Format relative time (server-side).
function relTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60)       return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60)       return min + " menit lalu";
  const hour = Math.floor(min / 60);
  if (hour < 24)      return hour + " jam lalu";
  const day = Math.floor(hour / 24);
  if (day < 30)       return day + " hari lalu";
  const month = Math.floor(day / 30);
  if (month < 12)     return month + " bulan lalu";
  return Math.floor(month / 12) + " tahun lalu";
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function catatanFiturPage({ notes = [], filters = {}, role = "owner", displayName = "", editNote = null, hasErr = false, msg = "" } = {}) {
  // Stats
  const total = notes.length;
  const byStatus = STATUS_KEYS.reduce((acc, k) => { acc[k] = notes.filter((n) => n.status === k).length; return acc; }, {});

  // Group by priority utk display
  const grouped = PRIORITY_KEYS.map((pkey) => ({
    key: pkey,
    conf: PRIORITY_CONF[pkey],
    items: notes.filter((n) => n.priority === pkey),
  })).filter((g) => g.items.length > 0);

  // ── Render single note card ────────────────────────────────────
  const renderNoteCard = (n) => {
    const stat = STATUS_CONF[n.status] || STATUS_CONF.ide;
    const isDone = n.status === "done";
    return ""
      + "<div class=\"cf-card" + (isDone ? " done" : "") + "\">"
      +   "<div class=\"cf-card-row\">"
      +     "<div class=\"cf-card-main\">"
      +       "<div class=\"cf-card-title\">" + escHtml(n.title) + "</div>"
      +       (n.deskripsi ? "<div class=\"cf-card-desc\">" + escHtml(n.deskripsi) + "</div>" : "")
      +       "<div class=\"cf-card-meta\">"
      +         "<span class=\"cf-chip cf-stat\" style=\"background:" + stat.bg + ";color:" + stat.color + "\">"
      +           "<i class=\"ti " + stat.icon + "\"></i> " + stat.label + "</span>"
      +         (n.kategori ? "<span class=\"cf-chip cf-kat\"><i class=\"ti ti-tag\"></i> " + escHtml(n.kategori) + "</span>" : "")
      +         "<span class=\"cf-meta-time\"><i class=\"ti ti-clock\"></i> " + relTime(n.updated_at) + "</span>"
      +         (n.done_at ? "<span class=\"cf-meta-time\" style=\"color:#2d6624\"><i class=\"ti ti-circle-check\"></i> done " + fmtDate(n.done_at) + "</span>" : "")
      +         (n.created_by ? "<span class=\"cf-meta-by\">oleh " + escHtml(n.created_by) + "</span>" : "")
      +       "</div>"
      +     "</div>"
      +     "<div class=\"cf-card-actions\">"
      +       // Quick status change (form posts to /status)
      +       "<form action=\"/operasional/catatan-fitur/status\" method=\"post\" class=\"cf-quick-stat\">"
      +         "<input type=\"hidden\" name=\"id\" value=\"" + n.id + "\">"
      +         "<select name=\"status\" onchange=\"this.form.submit()\" class=\"cf-stat-sel\">"
      +           STATUS_KEYS.map((s) => "<option value=\"" + s + "\"" + (s === n.status ? " selected" : "") + ">" + STATUS_CONF[s].label + "</option>").join("")
      +         "</select>"
      +       "</form>"
      +       "<a href=\"/operasional/catatan-fitur?edit=" + n.id + "\" class=\"cf-btn-edit\" title=\"Edit\"><i class=\"ti ti-edit\"></i></a>"
      +       "<a href=\"/operasional/catatan-fitur/hapus?id=" + n.id + "\" class=\"cf-btn-del\" onclick=\"return confirm('Hapus catatan ini?')\" title=\"Hapus\"><i class=\"ti ti-trash\"></i></a>"
      +     "</div>"
      +   "</div>"
      + "</div>";
  };

  // ── Render priority group ──────────────────────────────────────
  const renderGroup = (g) => {
    return ""
      + "<div class=\"cf-group\">"
      +   "<div class=\"cf-group-hdr\">"
      +     "<span class=\"cf-prio-badge\" style=\"background:" + g.conf.bg + ";color:" + g.conf.color + "\">"
      +       "<i class=\"ti " + g.conf.icon + "\"></i> " + g.conf.label.toUpperCase()
      +     "</span>"
      +     "<span class=\"cf-group-count\">" + g.items.length + " item</span>"
      +   "</div>"
      +   "<div class=\"cf-list\">"
      +     g.items.map(renderNoteCard).join("")
      +   "</div>"
      + "</div>";
  };

  // ── Add/Edit form (full-width, top of page) ───────────────────
  const isEdit = !!editNote;
  const fmTitle    = isEdit ? editNote.title    : "";
  const fmDesc     = isEdit ? editNote.deskripsi : "";
  const fmPrio     = isEdit ? editNote.priority : "medium";
  const fmStat     = isEdit ? editNote.status   : "ide";
  const fmKat      = isEdit ? editNote.kategori : "";
  const formAction = isEdit ? "/operasional/catatan-fitur/edit" : "/operasional/catatan-fitur/tambah";

  const formBlock = ""
    + "<div class=\"cf-form-wrap" + (isEdit ? " editing" : "") + "\">"
    +   "<div class=\"cf-form-hdr\">"
    +     "<div class=\"cf-form-title\"><i class=\"ti " + (isEdit ? "ti-edit" : "ti-circle-plus") + "\"></i> "
    +       (isEdit ? "Edit Catatan" : "Tambah Catatan Baru") + "</div>"
    +     (isEdit ? "<a href=\"/operasional/catatan-fitur\" class=\"cf-cancel\">Batal</a>" : "")
    +   "</div>"
    +   "<form action=\"" + formAction + "\" method=\"post\" class=\"cf-form\">"
    +     (isEdit ? "<input type=\"hidden\" name=\"id\" value=\"" + editNote.id + "\">" : "")
    +     "<input class=\"cf-inp\" type=\"text\" name=\"title\" placeholder=\"Judul catatan (mis. 'Hide pendapatan utk karyawan')\" required maxlength=\"200\" value=\"" + escHtml(fmTitle) + "\">"
    +     "<textarea class=\"cf-textarea\" name=\"deskripsi\" placeholder=\"Deskripsi detail (opsional) — kapan, dimana, kenapa...\" rows=\"3\" maxlength=\"4000\">" + escHtml(fmDesc) + "</textarea>"
    +     "<div class=\"cf-form-row\">"
    +       "<div class=\"cf-form-field\">"
    +         "<label class=\"cf-lbl\">Priority</label>"
    +         "<select class=\"cf-inp\" name=\"priority\">"
    +           PRIORITY_KEYS.map((p) => "<option value=\"" + p + "\"" + (p === fmPrio ? " selected" : "") + ">" + PRIORITY_CONF[p].label + "</option>").join("")
    +         "</select>"
    +       "</div>"
    +       "<div class=\"cf-form-field\">"
    +         "<label class=\"cf-lbl\">Status</label>"
    +         "<select class=\"cf-inp\" name=\"status\">"
    +           STATUS_KEYS.map((s) => "<option value=\"" + s + "\"" + (s === fmStat ? " selected" : "") + ">" + STATUS_CONF[s].label + "</option>").join("")
    +         "</select>"
    +       "</div>"
    +       "<div class=\"cf-form-field\">"
    +         "<label class=\"cf-lbl\">Kategori (opsional)</label>"
    +         "<input class=\"cf-inp\" type=\"text\" name=\"kategori\" placeholder=\"UI / Bug / Data / dll\" maxlength=\"60\" value=\"" + escHtml(fmKat) + "\">"
    +       "</div>"
    +       "<div class=\"cf-form-field cf-form-field-btn\">"
    +         "<button type=\"submit\" class=\"cf-btn-save\"><i class=\"ti " + (isEdit ? "ti-check" : "ti-plus") + "\"></i> " + (isEdit ? "Simpan" : "Tambah") + "</button>"
    +       "</div>"
    +     "</div>"
    +   "</form>"
    + "</div>";

  // ── Filter bar ────────────────────────────────────────────────
  const buildFilterUrl = (overrides) => {
    const params = { ...filters, ...overrides };
    const qs = Object.entries(params)
      .filter(([_, v]) => v && v !== "")
      .map(([k, v]) => k + "=" + encodeURIComponent(v))
      .join("&");
    return "/operasional/catatan-fitur" + (qs ? "?" + qs : "");
  };
  const hasFilter = filters.status || filters.priority || filters.kategori;
  const filterBar = ""
    + "<div class=\"cf-filter-bar\">"
    +   "<form method=\"get\" action=\"/operasional/catatan-fitur\" class=\"cf-filter-form\">"
    +     "<select name=\"status\" onchange=\"this.form.submit()\" class=\"cf-inp\">"
    +       "<option value=\"\">Semua Status</option>"
    +       STATUS_KEYS.map((s) => "<option value=\"" + s + "\"" + (s === filters.status ? " selected" : "") + ">" + STATUS_CONF[s].label + "</option>").join("")
    +     "</select>"
    +     "<select name=\"priority\" onchange=\"this.form.submit()\" class=\"cf-inp\">"
    +       "<option value=\"\">Semua Priority</option>"
    +       PRIORITY_KEYS.map((p) => "<option value=\"" + p + "\"" + (p === filters.priority ? " selected" : "") + ">" + PRIORITY_CONF[p].label + "</option>").join("")
    +     "</select>"
    +     "<input class=\"cf-inp\" type=\"text\" name=\"kategori\" placeholder=\"Filter kategori...\" value=\"" + escHtml(filters.kategori || "") + "\">"
    +     "<button type=\"submit\" class=\"cf-btn-filter\"><i class=\"ti ti-filter\"></i> Filter</button>"
    +     (hasFilter ? "<a href=\"/operasional/catatan-fitur\" class=\"cf-btn-clear\"><i class=\"ti ti-x\"></i> Reset</a>" : "")
    +   "</form>"
    + "</div>";

  // ── Empty state ───────────────────────────────────────────────
  const emptyState = ""
    + "<div class=\"cf-empty\">"
    +   "<i class=\"ti ti-notes\"></i>"
    +   "<div class=\"cf-empty-title\">" + (hasFilter ? "Tidak ada catatan yang cocok" : "Belum ada catatan fitur") + "</div>"
    +   "<div class=\"cf-empty-sub\">" + (hasFilter ? "Coba ubah filter atau reset." : "Tambah catatan pertama di form atas — ide, bug, atau rencana fitur apapun.") + "</div>"
    + "</div>";

  // ── CSS ───────────────────────────────────────────────────────
  const css = [
    ".main-wrap,.page{background:#f4f6f3!important}",
    ".cf-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}",
    "@media(max-width:768px){.cf-stats{grid-template-columns:repeat(2,1fr)}}",
    ".cf-stat{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:12px 14px;position:relative;overflow:hidden}",
    ".cf-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:10px 10px 0 0}",
    ".cf-stat.s-total::before{background:#7a8c78}",
    ".cf-stat.s-ide::before{background:#7c2dc4}",
    ".cf-stat.s-planning::before{background:#2660a4}",
    ".cf-stat.s-coding::before{background:#c47f1a}",
    ".cf-stat.s-done::before{background:#2d6624}",
    ".cf-stat-lbl{font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".cf-stat-val{font-size:22px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace;line-height:1}",

    ".cf-form-wrap{background:#fff;border:1px solid #e2e8e0;border-radius:12px;padding:18px;margin-bottom:18px}",
    ".cf-form-wrap.editing{border-color:#c47f1a;background:#fffbf2}",
    ".cf-form-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0f3ef}",
    ".cf-form-title{font-size:14px;font-weight:700;color:#1a2318;display:flex;align-items:center;gap:7px}",
    ".cf-form-title i{font-size:18px;color:#2d6624}",
    ".cf-cancel{font-size:12px;color:#7a8c78;text-decoration:none;padding:6px 10px;border-radius:6px;background:#f4f6f3;border:1px solid #e2e8e0}",
    ".cf-cancel:hover{background:#eef1ed}",
    ".cf-form{display:flex;flex-direction:column;gap:10px}",
    ".cf-inp{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#f9fbf8;outline:none}",
    ".cf-inp:focus{border-color:#2d6624;background:#fff}",
    ".cf-textarea{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#f9fbf8;outline:none;resize:vertical;min-height:60px}",
    ".cf-textarea:focus{border-color:#2d6624;background:#fff}",
    ".cf-lbl{display:block;font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".cf-form-row{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:flex-end}",
    "@media(max-width:768px){.cf-form-row{grid-template-columns:1fr 1fr}}",
    ".cf-form-field-btn{display:flex;align-items:flex-end}",
    ".cf-btn-save{padding:9px 18px;background:#2d6624;border:none;border-radius:7px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;height:36px}",
    ".cf-btn-save:hover{background:#255519}",
    ".cf-btn-save i{font-size:15px}",

    ".cf-filter-bar{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:10px 14px;margin-bottom:18px}",
    ".cf-filter-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
    ".cf-filter-form .cf-inp{flex:1;min-width:140px;max-width:200px;padding:7px 10px;font-size:12.5px}",
    ".cf-btn-filter,.cf-btn-clear{padding:7px 12px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:5px;text-decoration:none;border:1px solid}",
    ".cf-btn-filter{background:#2d6624;border-color:#2d6624;color:#fff}",
    ".cf-btn-filter:hover{background:#255519}",
    ".cf-btn-clear{background:#fef5f5;border-color:#f7c1c1;color:#a32d2d}",

    ".cf-group{margin-bottom:20px}",
    ".cf-group-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px}",
    ".cf-prio-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em}",
    ".cf-prio-badge i{font-size:13px}",
    ".cf-group-count{font-size:11px;color:#7a8c78}",
    ".cf-list{display:flex;flex-direction:column;gap:8px}",

    ".cf-card{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:14px 16px;transition:all .15s}",
    ".cf-card:hover{border-color:#b4d4a0;box-shadow:0 2px 8px rgba(45,102,36,.06)}",
    ".cf-card.done{opacity:.65;background:#f9fbf8}",
    ".cf-card.done .cf-card-title{text-decoration:line-through;color:#7a8c78}",
    ".cf-card-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}",
    ".cf-card-main{flex:1;min-width:0}",
    ".cf-card-title{font-size:14px;font-weight:600;color:#1a2318;margin-bottom:4px;line-height:1.35}",
    ".cf-card-desc{font-size:12.5px;color:#4a5e58;line-height:1.5;margin-bottom:8px;white-space:pre-wrap;word-break:break-word}",
    ".cf-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:#7a8c78}",
    ".cf-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:600}",
    ".cf-chip i{font-size:11px}",
    ".cf-chip.cf-kat{background:#f0f3ef;color:#4a5e58}",
    ".cf-meta-time{display:inline-flex;align-items:center;gap:3px}",
    ".cf-meta-time i{font-size:11px}",
    ".cf-meta-by{font-style:italic;color:#b0bfae}",
    ".cf-card-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}",
    ".cf-stat-sel{padding:6px 10px;border:1px solid #e2e8e0;border-radius:7px;font-size:11.5px;font-weight:500;color:#1a2318;background:#fff;cursor:pointer;font-family:'DM Sans',sans-serif}",
    ".cf-btn-edit,.cf-btn-del{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:7px;text-decoration:none;border:1px solid;cursor:pointer}",
    ".cf-btn-edit{background:#fff;border-color:#d4ddd2;color:#1a2318}",
    ".cf-btn-edit:hover{background:#eef1ed}",
    ".cf-btn-del{background:#fef5f5;border-color:#f7c1c1;color:#a32d2d}",
    ".cf-btn-del:hover{background:#fcdede}",
    ".cf-btn-edit i,.cf-btn-del i{font-size:14px}",

    ".cf-empty{background:#fff;border:1px dashed #d4ddd2;border-radius:12px;padding:40px 20px;text-align:center;color:#7a8c78}",
    ".cf-empty i{font-size:42px;margin-bottom:10px;color:#b0bfae}",
    ".cf-empty-title{font-size:14px;font-weight:600;color:#1a2318;margin-bottom:5px}",
    ".cf-empty-sub{font-size:12px;color:#7a8c78}",

    ".cf-msg{padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:7px}",
    ".cf-msg.ok{background:#eaf3de;color:#2d6624;border:1px solid #b4d4a0}",
    ".cf-msg.err{background:#fef5f5;color:#a32d2d;border:1px solid #f7c1c1}",
  ].join("");

  const msgBlock = msg === "added"   ? "<div class=\"cf-msg ok\"><i class=\"ti ti-circle-check\"></i> Catatan baru ditambahkan.</div>"
                 : msg === "edited"  ? "<div class=\"cf-msg ok\"><i class=\"ti ti-circle-check\"></i> Catatan diperbarui.</div>"
                 : msg === "deleted" ? "<div class=\"cf-msg ok\"><i class=\"ti ti-circle-check\"></i> Catatan dihapus.</div>"
                 : msg === "stat"    ? "<div class=\"cf-msg ok\"><i class=\"ti ti-circle-check\"></i> Status diperbarui.</div>"
                 : hasErr            ? "<div class=\"cf-msg err\"><i class=\"ti ti-alert-circle\"></i> Judul wajib diisi.</div>"
                 : "";

  return docHeadV4("Catatan Fitur")
    + "<style>" + css + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "catatan", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-notes\"></i></div>"
    + "<div><div class=\"topbar-name\">Catatan Fitur</div><div class=\"topbar-label\">Pengembangan Aplikasi</div></div>"
    + "</div></header>"
    + "<div class=\"page\">"
    + "<div style=\"display:flex;align-items:center;gap:6px;font-size:12px;color:#7a8c78;margin-bottom:18px\">"
    + "<a href=\"/operasional\" style=\"color:#2d6624;text-decoration:none;font-weight:500;display:flex;align-items:center;gap:4px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "</div>"
    + "<div style=\"font-size:20px;font-weight:700;color:#1a2318;margin-bottom:4px\">Catatan Fitur</div>"
    + "<div style=\"font-size:13px;color:#6b7c69;margin-bottom:22px\">Catat ide, bug, atau rencana pengembangan aplikasi</div>"
    + msgBlock
    // Stats
    + "<div class=\"cf-stats\">"
    + "<div class=\"cf-stat s-total\"><div class=\"cf-stat-lbl\">Total</div><div class=\"cf-stat-val\">" + total + "</div></div>"
    + "<div class=\"cf-stat s-ide\"><div class=\"cf-stat-lbl\">Ide</div><div class=\"cf-stat-val\">" + (byStatus.ide || 0) + "</div></div>"
    + "<div class=\"cf-stat s-planning\"><div class=\"cf-stat-lbl\">Planning</div><div class=\"cf-stat-val\">" + (byStatus.planning || 0) + "</div></div>"
    + "<div class=\"cf-stat s-coding\"><div class=\"cf-stat-lbl\">Coding</div><div class=\"cf-stat-val\">" + (byStatus.coding || 0) + "</div></div>"
    + "<div class=\"cf-stat s-done\"><div class=\"cf-stat-lbl\">Done</div><div class=\"cf-stat-val\">" + (byStatus.done || 0) + "</div></div>"
    + "</div>"
    + formBlock
    + filterBar
    + (notes.length === 0 ? emptyState : grouped.map(renderGroup).join(""))
    + "</div></div></div>"
    + "</body></html>";
}
