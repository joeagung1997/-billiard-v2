// src/views/supplier.js
// ── Halaman Supplier — kelola data pemasok bahan baku (owner only) ──

import { docHeadV4, escHtml, buildFinanceSidebar } from "./finance.js";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function supplierPage({
  suppliers = [],
  searchQ = "",
  role = "owner", displayName = "",
  editSup = null,
  msg = "", hasErr = false,
} = {}) {

  // ── Filter / search ────────────────────────────────────────────
  let filtered = suppliers.slice();
  const q = (searchQ || "").trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((s) =>
      (s.nama   || "").toLowerCase().includes(q) ||
      (s.kontak || "").toLowerCase().includes(q) ||
      (s.alamat || "").toLowerCase().includes(q)
    );
  }

  // ── Stats ─────────────────────────────────────────────────────
  const total = suppliers.length;
  const totalBahan = suppliers.reduce((s, x) => s + (x.bahan_count || 0), 0);
  const dgnBahan = suppliers.filter((s) => (s.bahan_count || 0) > 0).length;
  const tanpaBahan = total - dgnBahan;

  // ── Add/Edit form ─────────────────────────────────────────────
  const isEdit = !!editSup;
  const fmNama    = isEdit ? editSup.nama    : "";
  const fmKontak  = isEdit ? editSup.kontak  : "";
  const fmAlamat  = isEdit ? editSup.alamat  : "";
  const fmCatatan = isEdit ? editSup.catatan : "";
  const formAction = isEdit ? "/operasional/supplier/edit" : "/operasional/supplier/tambah";

  const formBlock = ""
    + "<div class=\"sp-form-wrap" + (isEdit ? " editing" : "") + "\">"
    +   "<div class=\"sp-form-hdr\">"
    +     "<div class=\"sp-form-title\"><i class=\"ti " + (isEdit ? "ti-edit" : "ti-truck-delivery") + "\"></i> "
    +       (isEdit ? "Edit Supplier" : "Tambah Supplier Baru") + "</div>"
    +     (isEdit ? "<a href=\"/operasional/supplier\" class=\"sp-cancel\">Batal</a>" : "")
    +   "</div>"
    +   "<form action=\"" + formAction + "\" method=\"post\" class=\"sp-form\">"
    +     (isEdit ? "<input type=\"hidden\" name=\"id\" value=\"" + editSup.id + "\">" : "")
    +     "<div class=\"sp-form-row\">"
    +       "<div class=\"sp-form-field\">"
    +         "<label class=\"sp-lbl\">Nama Supplier <span style=\"color:#a32d2d\">*</span></label>"
    +         "<input class=\"sp-inp\" type=\"text\" name=\"nama\" required maxlength=\"120\" placeholder=\"Mis. Toko Sembako ABC\" value=\"" + escHtml(fmNama) + "\">"
    +       "</div>"
    +       "<div class=\"sp-form-field\">"
    +         "<label class=\"sp-lbl\">Kontak (HP / WA)</label>"
    +         "<input class=\"sp-inp\" type=\"text\" name=\"kontak\" maxlength=\"120\" placeholder=\"0812-3456-7890\" value=\"" + escHtml(fmKontak) + "\">"
    +       "</div>"
    +     "</div>"
    +     "<div class=\"sp-form-field sp-form-full\">"
    +       "<label class=\"sp-lbl\">Alamat</label>"
    +       "<input class=\"sp-inp\" type=\"text\" name=\"alamat\" maxlength=\"250\" placeholder=\"Alamat lengkap (opsional)\" value=\"" + escHtml(fmAlamat) + "\">"
    +     "</div>"
    +     "<div class=\"sp-form-field sp-form-full\">"
    +       "<label class=\"sp-lbl\">Catatan</label>"
    +       "<textarea class=\"sp-textarea\" name=\"catatan\" maxlength=\"500\" rows=\"2\" placeholder=\"Catatan opsional — jam buka, produk spesialis, dll\">" + escHtml(fmCatatan) + "</textarea>"
    +     "</div>"
    +     "<div class=\"sp-form-actions\">"
    +       "<button type=\"submit\" class=\"sp-btn-save\"><i class=\"ti " + (isEdit ? "ti-check" : "ti-plus") + "\"></i> " + (isEdit ? "Simpan Perubahan" : "Tambah Supplier") + "</button>"
    +       (isEdit ? "<a href=\"/operasional/supplier\" class=\"sp-btn-cancel\">Batal</a>" : "")
    +     "</div>"
    +   "</form>"
    + "</div>";

  // ── Search bar ────────────────────────────────────────────────
  const searchBar = ""
    + "<div class=\"sp-search-bar\">"
    +   "<form method=\"get\" action=\"/operasional/supplier\" class=\"sp-search\">"
    +     "<i class=\"ti ti-search sp-search-icon\"></i>"
    +     "<input class=\"sp-search-inp\" type=\"text\" name=\"q\" placeholder=\"Cari supplier (nama / kontak / alamat)...\" value=\"" + escHtml(searchQ || "") + "\">"
    +     (q ? "<a href=\"/operasional/supplier\" class=\"sp-search-clear\"><i class=\"ti ti-x\"></i></a>" : "")
    +   "</form>"
    + "</div>";

  // ── Render supplier card ──────────────────────────────────────
  const renderCard = (s) => {
    const cnt = s.bahan_count || 0;
    return ""
      + "<div class=\"sp-card\">"
      +   "<div class=\"sp-card-hdr\">"
      +     "<div class=\"sp-card-name\">"
      +       "<div class=\"sp-card-avatar\"><i class=\"ti ti-building-store\"></i></div>"
      +       "<div>"
      +         "<div class=\"sp-card-nama\">" + escHtml(s.nama) + "</div>"
      +         "<div class=\"sp-card-cnt\">"
      +           "<span class=\"sp-cnt-badge" + (cnt > 0 ? " has-bahan" : "") + "\">"
      +             "<i class=\"ti ti-package\"></i> " + cnt + " bahan"
      +           "</span>"
      +         "</div>"
      +       "</div>"
      +     "</div>"
      +     "<div class=\"sp-card-actions\">"
      +       "<a href=\"/operasional/supplier?edit=" + s.id + "\" class=\"sp-btn-edit\" title=\"Edit\"><i class=\"ti ti-edit\"></i></a>"
      +       "<a href=\"/operasional/supplier/hapus?id=" + s.id + "\" class=\"sp-btn-del\" "
      +         "onclick=\"return confirm('Hapus supplier &quot;" + escHtml(s.nama).replace(/'/g, "&#39;") + "&quot;?\\n\\n"
      +           + (cnt > 0 ? cnt + " bahan terkait akan di-unlink (tidak ke-hapus)." : "Tidak ada bahan terkait.") + "');\" title=\"Hapus\">"
      +         "<i class=\"ti ti-trash\"></i>"
      +       "</a>"
      +     "</div>"
      +   "</div>"
      +   "<div class=\"sp-card-body\">"
      +     (s.kontak  ? "<div class=\"sp-card-info\"><i class=\"ti ti-phone\"></i> " + escHtml(s.kontak) + "</div>" : "")
      +     (s.alamat  ? "<div class=\"sp-card-info\"><i class=\"ti ti-map-pin\"></i> " + escHtml(s.alamat) + "</div>" : "")
      +     (s.catatan ? "<div class=\"sp-card-catatan\"><i class=\"ti ti-note\"></i> " + escHtml(s.catatan) + "</div>" : "")
      +     (!s.kontak && !s.alamat && !s.catatan ? "<div class=\"sp-card-empty\">Belum ada kontak / alamat / catatan.</div>" : "")
      +   "</div>"
      +   "<div class=\"sp-card-foot\">"
      +     "<span class=\"sp-foot-time\">ditambahkan " + fmtDate(s.created_at) + "</span>"
      +   "</div>"
      + "</div>";
  };

  // ── Empty state ───────────────────────────────────────────────
  const emptyState = ""
    + "<div class=\"sp-empty\">"
    +   "<i class=\"ti ti-truck-off\"></i>"
    +   "<div class=\"sp-empty-title\">"
    +     (suppliers.length === 0 ? "Belum ada supplier" : "Tidak ada supplier yang cocok dgn pencarian")
    +   "</div>"
    +   "<div class=\"sp-empty-sub\">"
    +     (suppliers.length === 0
      ? "Tambah supplier pertama lewat form di atas. Setelah itu, bahan baku bisa di-link ke supplier ini."
      : "Coba ubah kata kunci pencarian atau hapus filter.")
    +   "</div>"
    + "</div>";

  // ── Message banner ────────────────────────────────────────────
  const msgBlock = msg === "added"   ? "<div class=\"sp-msg ok\"><i class=\"ti ti-circle-check\"></i> Supplier baru ditambahkan.</div>"
                 : msg === "edited"  ? "<div class=\"sp-msg ok\"><i class=\"ti ti-circle-check\"></i> Data supplier diperbarui.</div>"
                 : msg === "deleted" ? "<div class=\"sp-msg ok\"><i class=\"ti ti-circle-check\"></i> Supplier dihapus.</div>"
                 : hasErr            ? "<div class=\"sp-msg err\"><i class=\"ti ti-alert-circle\"></i> Gagal — pastikan nama supplier diisi dan unik.</div>"
                 : "";

  // ── CSS ───────────────────────────────────────────────────────
  const css = [
    ".main-wrap,.page{background:#f4f6f3!important}",

    // Stats
    ".sp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}",
    "@media(max-width:768px){.sp-stats{grid-template-columns:repeat(2,1fr)}}",
    ".sp-stat{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:12px 14px;position:relative;overflow:hidden}",
    ".sp-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}",
    ".sp-stat.s-total::before{background:#7a8c78}",
    ".sp-stat.s-bahan::before{background:#2660a4}",
    ".sp-stat.s-aktif::before{background:#2d6624}",
    ".sp-stat.s-pasif::before{background:#b0bfae}",
    ".sp-stat-lbl{font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".sp-stat-val{font-size:22px;font-weight:700;color:#1a2318;font-family:'DM Mono',monospace;line-height:1}",

    // Form
    ".sp-form-wrap{background:#fff;border:1px solid #e2e8e0;border-radius:12px;padding:18px;margin-bottom:18px}",
    ".sp-form-wrap.editing{border-color:#c47f1a;background:#fffbf2}",
    ".sp-form-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0f3ef}",
    ".sp-form-title{font-size:14px;font-weight:700;color:#1a2318;display:flex;align-items:center;gap:7px}",
    ".sp-form-title i{font-size:18px;color:#2d6624}",
    ".sp-form-wrap.editing .sp-form-title i{color:#c47f1a}",
    ".sp-cancel{font-size:12px;color:#7a8c78;text-decoration:none;padding:6px 10px;border-radius:6px;background:#f4f6f3;border:1px solid #e2e8e0}",
    ".sp-cancel:hover{background:#eef1ed}",
    ".sp-form{display:flex;flex-direction:column;gap:12px}",
    ".sp-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "@media(max-width:768px){.sp-form-row{grid-template-columns:1fr}}",
    ".sp-form-full{grid-column:1 / -1}",
    ".sp-lbl{display:block;font-size:10.5px;font-weight:700;color:#7a8c78;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    ".sp-inp{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#f9fbf8;outline:none}",
    ".sp-inp:focus{border-color:#2d6624;background:#fff}",
    ".sp-textarea{width:100%;padding:9px 12px;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1a2318;background:#f9fbf8;outline:none;resize:vertical;min-height:50px}",
    ".sp-textarea:focus{border-color:#2d6624;background:#fff}",
    ".sp-form-actions{display:flex;gap:8px;padding-top:8px;border-top:1px solid #f0f3ef;margin-top:4px}",
    ".sp-btn-save{padding:10px 20px;background:#2d6624;border:none;border-radius:7px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:6px}",
    ".sp-btn-save:hover{background:#255519}",
    ".sp-btn-save i{font-size:15px}",
    ".sp-btn-cancel{padding:10px 20px;background:#fff;border:1px solid #e2e8e0;border-radius:7px;font-size:13px;font-weight:500;color:#7a8c78;text-decoration:none;display:inline-flex;align-items:center}",

    // Search
    ".sp-search-bar{margin-bottom:14px}",
    ".sp-search{display:flex;align-items:center;background:#fff;border:1px solid #e2e8e0;border-radius:8px;padding:0 12px;max-width:500px}",
    ".sp-search-icon{font-size:16px;color:#7a8c78;margin-right:8px}",
    ".sp-search-inp{flex:1;padding:9px 0;border:none;background:transparent;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;color:#1a2318}",
    ".sp-search-clear{padding:6px;color:#7a8c78;text-decoration:none;display:inline-flex;align-items:center}",
    ".sp-search-clear:hover{color:#a32d2d}",

    // Grid
    ".sp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}",
    "@media(max-width:480px){.sp-grid{grid-template-columns:1fr}}",

    // Card
    ".sp-card{background:#fff;border:1px solid #e2e8e0;border-radius:10px;padding:14px 16px;transition:all .15s;display:flex;flex-direction:column}",
    ".sp-card:hover{border-color:#b4d4a0;box-shadow:0 2px 8px rgba(45,102,36,.06)}",
    ".sp-card-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f0f3ef}",
    ".sp-card-name{display:flex;gap:10px;align-items:center;flex:1;min-width:0}",
    ".sp-card-avatar{width:36px;height:36px;border-radius:8px;background:#eaf3de;color:#2d6624;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".sp-card-avatar i{font-size:18px}",
    ".sp-card-nama{font-size:14px;font-weight:700;color:#1a2318;line-height:1.3;word-break:break-word}",
    ".sp-card-cnt{margin-top:3px}",
    ".sp-cnt-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:600;background:#f0f3ef;color:#7a8c78}",
    ".sp-cnt-badge.has-bahan{background:#e6f1fb;color:#2660a4}",
    ".sp-cnt-badge i{font-size:11px}",
    ".sp-card-actions{display:flex;gap:5px;flex-shrink:0}",
    ".sp-btn-edit,.sp-btn-del{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;text-decoration:none;border:1px solid;cursor:pointer}",
    ".sp-btn-edit{background:#fff;border-color:#d4ddd2;color:#1a2318}",
    ".sp-btn-edit:hover{background:#eef1ed}",
    ".sp-btn-del{background:#fef5f5;border-color:#f7c1c1;color:#a32d2d}",
    ".sp-btn-del:hover{background:#fcdede}",
    ".sp-btn-edit i,.sp-btn-del i{font-size:13px}",
    ".sp-card-body{flex:1;display:flex;flex-direction:column;gap:6px;margin-bottom:10px}",
    ".sp-card-info{font-size:12px;color:#4a5e58;display:flex;align-items:flex-start;gap:5px;line-height:1.4;word-break:break-word}",
    ".sp-card-info i{font-size:13px;color:#7a8c78;flex-shrink:0;margin-top:1px}",
    ".sp-card-catatan{font-size:11.5px;color:#7a8c78;font-style:italic;display:flex;align-items:flex-start;gap:5px;padding:6px 8px;background:#f9fbf8;border-radius:5px;line-height:1.4}",
    ".sp-card-catatan i{font-size:12px;color:#b0bfae;flex-shrink:0;margin-top:1px}",
    ".sp-card-empty{font-size:11px;color:#b0bfae;font-style:italic}",
    ".sp-card-foot{padding-top:8px;border-top:1px solid #f0f3ef}",
    ".sp-foot-time{font-size:10.5px;color:#b0bfae}",

    // Empty
    ".sp-empty{background:#fff;border:1px dashed #d4ddd2;border-radius:12px;padding:40px 20px;text-align:center;color:#7a8c78}",
    ".sp-empty i{font-size:42px;margin-bottom:10px;color:#b0bfae;display:block}",
    ".sp-empty-title{font-size:14px;font-weight:600;color:#1a2318;margin-bottom:5px}",
    ".sp-empty-sub{font-size:12px;color:#7a8c78;max-width:400px;margin:0 auto;line-height:1.5}",

    // Msg
    ".sp-msg{padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:7px}",
    ".sp-msg.ok{background:#eaf3de;color:#2d6624;border:1px solid #b4d4a0}",
    ".sp-msg.err{background:#fef5f5;color:#a32d2d;border:1px solid #f7c1c1}",
  ].join("");

  return docHeadV4("Supplier")
    + "<style>" + css + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "supplier", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    +   "<div class=\"topbar-brand\">"
    +     "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-truck-delivery\"></i></div>"
    +     "<div><div class=\"topbar-name\">Supplier</div><div class=\"topbar-label\">Kelola Pemasok Bahan Baku</div></div>"
    +   "</div>"
    + "</header>"
    + "<div class=\"page\">"
    + "<div style=\"display:flex;align-items:center;gap:6px;font-size:12px;color:#7a8c78;margin-bottom:18px\">"
    +   "<a href=\"/operasional\" style=\"color:#2d6624;text-decoration:none;font-weight:500;display:flex;align-items:center;gap:4px\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "</div>"
    + "<div style=\"font-size:20px;font-weight:700;color:#1a2318;margin-bottom:4px\">Supplier</div>"
    + "<div style=\"font-size:13px;color:#6b7c69;margin-bottom:22px\">Daftar pemasok / vendor bahan baku. Link bahan baku ke supplier lewat <a href=\"/operasional/menu?tab=bahan\" style=\"color:#2d6624;font-weight:500\">tab Bahan Baku</a>.</div>"
    + msgBlock
    // Stats
    + "<div class=\"sp-stats\">"
    +   "<div class=\"sp-stat s-total\"><div class=\"sp-stat-lbl\">Total Supplier</div><div class=\"sp-stat-val\">" + total + "</div></div>"
    +   "<div class=\"sp-stat s-aktif\"><div class=\"sp-stat-lbl\">Punya Bahan</div><div class=\"sp-stat-val\">" + dgnBahan + "</div></div>"
    +   "<div class=\"sp-stat s-pasif\"><div class=\"sp-stat-lbl\">Belum Punya Bahan</div><div class=\"sp-stat-val\">" + tanpaBahan + "</div></div>"
    +   "<div class=\"sp-stat s-bahan\"><div class=\"sp-stat-lbl\">Total Bahan Terlink</div><div class=\"sp-stat-val\">" + totalBahan + "</div></div>"
    + "</div>"
    + formBlock
    + searchBar
    + (filtered.length === 0 ? emptyState : "<div class=\"sp-grid\">" + filtered.map(renderCard).join("") + "</div>")
    + "</div></div></div>"
    + "</body></html>";
}
