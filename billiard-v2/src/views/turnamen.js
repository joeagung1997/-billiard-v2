// src/views/turnamen.js
// ── Halaman Turnamen billiard (owner) ────────────────────────────────
// Dua view:
//   financeTurnamenPage       → daftar turnamen + buat baru.
//   financeTurnamenDetailPage → kelola peserta (draft) atau bagan knockout
//                               (berjalan/selesai) + input skor + juara.

import { docHeadV4, escHtml, buildFinanceSidebar } from "./finance.js";

const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

// DATE (pg) → 'YYYY-MM-DD'. node-postgres mem-parse kolom DATE jadi Date di
// tengah-malam LOKAL, jadi pakai komponen lokal (bukan toISOString yang UTC) —
// kalau pakai UTC, di server WIB tanggal mundur 1 hari (mis. 14 → 13 Jun).
const toDateInput = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtTanggal = (v) => {
  const s = toDateInput(v);
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return d + " " + (MONTHS[m - 1] || "") + " " + y;
};

const STMETA = {
  draft:    { label: "Pendaftaran", cls: "draft", icon: "ti-user-plus" },
  berjalan: { label: "Berlangsung", cls: "live",  icon: "ti-tournament" },
  selesai:  { label: "Selesai",     cls: "done",  icon: "ti-trophy" },
};
const statusBadge = (st) => {
  const m = STMETA[st] || STMETA.draft;
  return "<span class=\"tn-badge " + m.cls + "\"><i class=\"ti " + m.icon + "\"></i> " + m.label + "</span>";
};

// Label ronde dari jumlah match di ronde tsb.
function rondeLabel(matchCount) {
  if (matchCount === 1) return "Final";
  if (matchCount === 2) return "Semifinal";
  if (matchCount === 4) return "Perempat Final";
  return (matchCount * 2) + " Besar";
}

// ── CSS dipakai kedua view ───────────────────────────────────────────
const TN_CSS = `
  .tn-back{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;margin-bottom:14px}
  .tn-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .tn-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:4px}
  .tn-badge.draft{background:#eef2ff;color:#4338ca}
  .tn-badge.live{background:#fef3e2;color:#b45309}
  .tn-badge.done{background:#e7f5e7;color:#2d6624}
  .btn-primary{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none}
  .tn-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;border:1px solid var(--border2);background:var(--surface2);color:var(--txt)}
  .tn-btn.danger{color:#a32d2d;border-color:#f0caca;background:#fdf3f3}
  .tn-btn.accent{background:var(--accent);color:#fff;border-color:var(--accent)}
  /* ── List ─────────────────────────────────────────── */
  .tn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  .tn-card{display:block;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;text-decoration:none;color:inherit;transition:box-shadow .15s,transform .15s}
  .tn-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.07);transform:translateY(-2px)}
  .tn-card-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .tn-ic{width:42px;height:42px;flex:none;border-radius:11px;background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px}
  .tn-card-title{font-size:15px;font-weight:700;color:var(--txt);line-height:1.3}
  .tn-card-cab{font-size:12px;color:var(--txt2)}
  .tn-card-row{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--txt2);margin-top:6px}
  .tn-card-row i{font-size:14px;color:var(--txt3)}
  .tn-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
  .tn-juara{font-size:12px;color:#2d6624;font-weight:600;display:flex;align-items:center;gap:4px}
  .tn-empty{display:flex;gap:14px;align-items:center;background:var(--surface);border:1px dashed var(--border2);border-radius:14px;padding:28px 24px;color:var(--txt2);font-size:13px}
  .tn-empty i{font-size:34px;color:var(--txt3)}
  /* ── Detail: info card ────────────────────────────── */
  .tn-info{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;margin-bottom:18px}
  .tn-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-top:14px}
  .tn-info-item .k{font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;gap:4px;margin-bottom:3px}
  .tn-info-item .v{font-size:14px;font-weight:600;color:var(--txt)}
  /* ── Champion banner ──────────────────────────────── */
  .tn-champ{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:16px;padding:16px 20px;margin-bottom:18px}
  .tn-champ-ic{width:52px;height:52px;flex:none;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 12px rgba(217,119,6,.35)}
  .tn-champ-t{font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.05em}
  .tn-champ-n{font-size:20px;font-weight:800;color:#92400e}
  /* ── Peserta (draft) ──────────────────────────────── */
  .tn-sec{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;margin-bottom:18px}
  .tn-sec-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
  .tn-sec-title{font-size:15px;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:7px}
  .tn-sec-title i{color:var(--accent)}
  .tn-padd{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:var(--surface2);border:1px solid var(--border);border-radius:11px;padding:12px;margin-bottom:14px}
  .tn-fg{display:flex;flex-direction:column;gap:4px}
  .tn-fg.grow{flex:1;min-width:160px}
  .tn-fg label{font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.03em}
  .tn-fg input,.tn-fg select,.tn-fg textarea{font-family:inherit;font-size:13px;padding:9px 11px;border:1px solid var(--border2);border-radius:9px;background:var(--surface);color:var(--txt);width:100%}
  .tn-plist{display:flex;flex-direction:column;gap:8px}
  .tn-pitem{display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}
  .tn-pseed{width:26px;height:26px;flex:none;border-radius:7px;background:var(--surface2);color:var(--txt2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'DM Mono',monospace}
  .tn-pname{font-size:13.5px;font-weight:600;color:var(--txt)}
  .tn-pkontak{font-size:12px;color:var(--txt3)}
  .tn-pdel{margin-left:auto;background:none;border:none;color:var(--txt3);cursor:pointer;font-size:17px;display:flex;padding:4px;border-radius:6px}
  .tn-pdel:hover{color:#a32d2d;background:#fdf3f3}
  .tn-gen{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px dashed var(--border2)}
  .tn-gen-note{font-size:12px;color:var(--txt2);max-width:420px}
  /* ── Bracket ──────────────────────────────────────── */
  .tn-bracket-wrap{overflow-x:auto;padding:4px 2px 14px}
  .tn-bracket{display:flex;gap:30px;min-width:min-content;align-items:stretch}
  .tn-round{display:flex;flex-direction:column;justify-content:space-around;min-width:210px;gap:14px}
  .tn-round-hd{font-size:12px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;text-align:center;padding-bottom:4px}
  .tn-match{background:var(--surface);border:1px solid var(--border);border-radius:11px;overflow:hidden;position:relative}
  .tn-match.pending-ready{border-color:#fcd34d}
  .tn-slot{display:flex;align-items:center;gap:8px;padding:9px 11px;font-size:13px;color:var(--txt)}
  .tn-slot+.tn-slot{border-top:1px solid var(--border)}
  .tn-slot .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tn-slot .sc{font-family:'DM Mono',monospace;font-weight:700;color:var(--txt2);min-width:18px;text-align:center}
  .tn-slot.win{background:#f3faf3}
  .tn-slot.win .nm{font-weight:700;color:#2d6624}
  .tn-slot.win .sc{color:#2d6624}
  .tn-slot.tbd .nm{color:var(--txt3);font-style:italic}
  .tn-slot .seed{font-size:10px;color:var(--txt3);font-family:'DM Mono',monospace;flex:none}
  .tn-match-foot{padding:7px 11px;border-top:1px solid var(--border);background:var(--surface2)}
  .tn-score-btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:6px;border:none;border-radius:7px;background:var(--accent);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
  .tn-bye{font-size:11px;color:var(--txt3);text-align:center;padding:6px;font-style:italic}
  /* ── Modal ────────────────────────────────────────── */
  .tn-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9998;padding:20px}
  .tn-modal.show{display:flex}
  .tn-modal-card{background:var(--surface);border-radius:16px;width:100%;max-width:420px;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
  .tn-modal-hd{position:sticky;top:0;background:var(--surface);display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border);font-size:15px;font-weight:700;color:var(--txt)}
  .tn-modal-hd i.t{color:var(--accent)}
  .tn-modal-x{background:none;border:none;color:var(--txt3);cursor:pointer;font-size:19px;display:flex}
  .tn-modal-body{padding:18px}
  .tn-modal-body .tn-fg{margin-bottom:13px}
  .tn-score-vs{display:flex;flex-direction:column;gap:10px;margin-bottom:6px}
  .tn-score-line{display:flex;align-items:center;gap:12px}
  .tn-score-line .pn{flex:1;font-size:14px;font-weight:600;color:var(--txt);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tn-score-line input{width:76px;font-family:'DM Mono',monospace;font-size:18px;font-weight:700;text-align:center;padding:9px;border:1px solid var(--border2);border-radius:9px;background:var(--surface2);color:var(--txt)}
  .tn-modal-submit{width:100%;justify-content:center;margin-top:6px}
  .tn-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--accent);color:#fff;padding:11px 20px;border-radius:24px;font-size:13px;font-weight:600;box-shadow:0 6px 20px rgba(45,102,36,.35);opacity:0;pointer-events:none;transition:all .2s;z-index:9999}
  .tn-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  @media(max-width:680px){.tn-grid{grid-template-columns:1fr}}
`;

// ── Shared field helper untuk form buat/edit turnamen ────────────────
function turnamenFormFields(t = {}) {
  return ""
    + "<div class=\"tn-fg grow\"><label>Nama Turnamen <span style=\"color:#a32d2d\">*</span></label>"
    +   "<input name=\"nama\" type=\"text\" maxlength=\"120\" required placeholder=\"mis. Turnamen 8-Ball Cup\" value=\"" + escHtml(t.nama || "") + "\"></div>"
    + "<div class=\"tn-fg\"><label>Cabang / Game</label>"
    +   "<input name=\"cabang\" type=\"text\" maxlength=\"40\" list=\"tnCabang\" placeholder=\"8-ball\" value=\"" + escHtml(t.cabang || "") + "\">"
    +   "<datalist id=\"tnCabang\"><option value=\"8-ball\"><option value=\"9-ball\"><option value=\"10-ball\"><option value=\"Snooker\"><option value=\"Boliklor\"></datalist></div>"
    + "<div class=\"tn-fg\"><label>Tanggal</label><input name=\"tanggal\" type=\"date\" value=\"" + escHtml(toDateInput(t.tanggal)) + "\"></div>"
    + "<div class=\"tn-fg\"><label>Biaya Daftar (Rp)</label><input name=\"biaya_daftar\" type=\"number\" min=\"0\" step=\"1000\" placeholder=\"0\" value=\"" + (t.biayaDaftar ? t.biayaDaftar : "") + "\"></div>"
    + "<div class=\"tn-fg grow\"><label>Hadiah</label><input name=\"hadiah\" type=\"text\" maxlength=\"200\" placeholder=\"mis. Juara Rp 1.000.000 + trofi\" value=\"" + escHtml(t.hadiah || "") + "\"></div>"
    + "<div class=\"tn-fg grow\"><label>Catatan</label><input name=\"catatan\" type=\"text\" maxlength=\"500\" placeholder=\"opsional\" value=\"" + escHtml(t.catatan || "") + "\"></div>";
}

// ════════════════════════════════════════════════════════════════════
// LIST
// ════════════════════════════════════════════════════════════════════
export function financeTurnamenPage({ role = "owner", displayName = "", list = [], msg = "" } = {}) {
  const toastMsg = msg === "created" ? "Turnamen dibuat"
    : msg === "deleted" ? "Turnamen dihapus"
    : msg === "edited"  ? "Perubahan tersimpan"
    : "";

  const cards = list.length === 0
    ? "<div class=\"tn-empty\"><i class=\"ti ti-trophy-off\"></i><div><strong>Belum ada turnamen</strong><br>"
      + "<span>Klik <b>Buat Turnamen</b> untuk membuat event pertama — daftarkan peserta lalu buat bagan otomatis.</span></div></div>"
    : "<div class=\"tn-grid\">" + list.map((t) => {
        const juara = (t.status === "selesai" && t.juaraNama)
          ? "<span class=\"tn-juara\"><i class=\"ti ti-trophy\"></i> " + escHtml(t.juaraNama) + "</span>"
          : "<span style=\"font-size:12px;color:var(--txt3)\">" + (t.pesertaCount || 0) + " peserta</span>";
        return "<a class=\"tn-card\" href=\"/operasional/turnamen/" + t.id + "\">"
          + "<div class=\"tn-card-top\"><div class=\"tn-ic\"><i class=\"ti ti-trophy\"></i></div>"
          +   "<div><div class=\"tn-card-title\">" + escHtml(t.nama) + "</div>"
          +   "<div class=\"tn-card-cab\">" + escHtml(t.cabang || "—") + "</div></div></div>"
          + "<div class=\"tn-card-row\"><i class=\"ti ti-calendar\"></i> " + fmtTanggal(t.tanggal) + "</div>"
          + (t.hadiah ? "<div class=\"tn-card-row\"><i class=\"ti ti-gift\"></i> " + escHtml(t.hadiah) + "</div>" : "")
          + "<div class=\"tn-card-foot\">" + statusBadge(t.status) + juara + "</div>"
          + "</a>";
      }).join("") + "</div>";

  const js =
    "function tnOpenCreate(){document.getElementById('tnCreateModal').classList.add('show');}"
    + "function tnCloseCreate(){document.getElementById('tnCreateModal').classList.remove('show');}"
    + (toastMsg ? "setTimeout(function(){var t=document.getElementById('tnToast');if(t){t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2200);}},150);" : "");

  return docHeadV4("Turnamen")
    + "<style>" + TN_CSS + "</style></head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "turnamen", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\"><div class=\"topbar-brand\"><div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-trophy\"></i></div>"
    +   "<div><div class=\"topbar-name\">Turnamen</div><div class=\"topbar-label\">Billiard</div></div></div></header>"
    + "<div class=\"page\">"
    + "<a href=\"/operasional\" class=\"tn-back\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "<div class=\"tn-head\"><div><div class=\"page-title\">Turnamen</div>"
    +   "<div class=\"page-sub\">Buat &amp; kelola turnamen billiard beserta peserta dan bagan pertandingannya.</div></div>"
    +   "<button type=\"button\" class=\"btn-primary\" onclick=\"tnOpenCreate()\"><i class=\"ti ti-plus\"></i> Buat Turnamen</button></div>"
    + cards
    + "</div></div></div>"
    // Create modal
    + "<div class=\"tn-modal\" id=\"tnCreateModal\" onclick=\"if(event.target===this)tnCloseCreate()\"><div class=\"tn-modal-card\">"
    +   "<div class=\"tn-modal-hd\"><span><i class=\"ti ti-trophy t\"></i> Buat Turnamen</span><button type=\"button\" class=\"tn-modal-x\" onclick=\"tnCloseCreate()\"><i class=\"ti ti-x\"></i></button></div>"
    +   "<form method=\"post\" action=\"/operasional/turnamen/buat\" class=\"tn-modal-body\" style=\"display:flex;flex-wrap:wrap;gap:12px\">"
    +     turnamenFormFields()
    +     "<button type=\"submit\" class=\"btn-primary tn-modal-submit\"><i class=\"ti ti-check\"></i> Buat Turnamen</button>"
    +   "</form>"
    + "</div></div>"
    + (toastMsg ? "<div class=\"tn-toast\" id=\"tnToast\"><i class=\"ti ti-check\"></i> " + toastMsg + "</div>" : "")
    + "<script>" + js + "</script>"
    + "</body></html>";
}

// ════════════════════════════════════════════════════════════════════
// DETAIL
// ════════════════════════════════════════════════════════════════════
export function financeTurnamenDetailPage({
  role = "owner", displayName = "",
  turnamen = null, peserta = [], matches = [], msg = "",
} = {}) {
  if (!turnamen) {
    return docHeadV4("Turnamen") + "</head><body><div class=\"layout\">"
      + buildFinanceSidebar("", "turnamen", role, displayName)
      + "<div class=\"main-wrap\"><div class=\"page\"><p style=\"padding:40px\">Turnamen tidak ditemukan. <a href=\"/operasional/turnamen\">Kembali</a></p></div></div></div></body></html>";
  }

  const toastMsg = msg === "created" ? "Turnamen dibuat — tambahkan peserta"
    : msg === "peserta_add" ? "Peserta ditambah"
    : msg === "peserta_del" ? "Peserta dihapus"
    : msg === "bagan"       ? "Bagan dibuat"
    : msg === "skor"        ? "Skor tersimpan"
    : msg === "reset"       ? "Bagan dibongkar — kembali ke pendaftaran"
    : msg === "edited"      ? "Perubahan tersimpan"
    : msg === "err_few"     ? "Minimal 2 peserta untuk membuat bagan"
    : msg === "err_draw"    ? "Skor tidak boleh seri — harus ada pemenang"
    : "";
  const isErr = msg.startsWith("err_");

  const pMap = {};
  for (const p of peserta) pMap[p.id] = p;
  const pName = (id) => (id && pMap[id]) ? pMap[id].nama : "";
  const tid = turnamen.id;

  // ── Champion banner ────────────────────────────────────────────
  const champ = (turnamen.status === "selesai" && turnamen.juaraId && pMap[turnamen.juaraId])
    ? "<div class=\"tn-champ\"><div class=\"tn-champ-ic\"><i class=\"ti ti-trophy\"></i></div>"
      + "<div><div class=\"tn-champ-t\">Juara Turnamen</div><div class=\"tn-champ-n\">" + escHtml(pMap[turnamen.juaraId].nama) + "</div></div></div>"
    : "";

  // ── Info card ──────────────────────────────────────────────────
  const pot = (turnamen.biayaDaftar || 0) * peserta.length;
  const infoCard = "<div class=\"tn-info\">"
    + "<div class=\"tn-head\" style=\"margin:0\">"
    +   "<div><div style=\"font-size:20px;font-weight:800;color:var(--txt);display:flex;align-items:center;gap:10px;flex-wrap:wrap\">" + escHtml(turnamen.nama) + " " + statusBadge(turnamen.status) + "</div>"
    +   (turnamen.catatan ? "<div style=\"font-size:13px;color:var(--txt2);margin-top:5px\">" + escHtml(turnamen.catatan) + "</div>" : "") + "</div>"
    +   "<div style=\"display:flex;gap:8px\">"
    +     "<button type=\"button\" class=\"tn-btn\" onclick=\"tnOpenEdit()\"><i class=\"ti ti-pencil\"></i> Edit</button>"
    +     "<a class=\"tn-btn danger\" href=\"/operasional/turnamen/" + tid + "/hapus\" onclick=\"return confirm('Hapus turnamen ini beserta peserta &amp; bagannya? Tidak bisa dibatalkan.')\"><i class=\"ti ti-trash\"></i></a>"
    +   "</div>"
    + "</div>"
    + "<div class=\"tn-info-grid\">"
    +   "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-device-gamepad-2\"></i> Cabang</div><div class=\"v\">" + escHtml(turnamen.cabang || "—") + "</div></div>"
    +   "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-calendar\"></i> Tanggal</div><div class=\"v\">" + fmtTanggal(turnamen.tanggal) + "</div></div>"
    +   "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-users\"></i> Peserta</div><div class=\"v\">" + peserta.length + " orang</div></div>"
    +   "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-ticket\"></i> Biaya Daftar</div><div class=\"v\">" + rp(turnamen.biayaDaftar || 0) + "</div></div>"
    +   (pot > 0 ? "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-pig-money\"></i> Pot Pendaftaran</div><div class=\"v\">" + rp(pot) + "</div></div>" : "")
    +   (turnamen.hadiah ? "<div class=\"tn-info-item\"><div class=\"k\"><i class=\"ti ti-gift\"></i> Hadiah</div><div class=\"v\">" + escHtml(turnamen.hadiah) + "</div></div>" : "")
    + "</div></div>";

  // ── Body: draft → peserta; else → bracket ──────────────────────
  let body = "";
  if (turnamen.status === "draft") {
    const plist = peserta.length === 0
      ? "<div style=\"font-size:13px;color:var(--txt3);padding:8px 0\">Belum ada peserta. Tambahkan minimal 2 untuk membuat bagan.</div>"
      : "<div class=\"tn-plist\">" + peserta.map((p, i) =>
          "<div class=\"tn-pitem\"><div class=\"tn-pseed\">" + (i + 1) + "</div>"
          + "<div><div class=\"tn-pname\">" + escHtml(p.nama) + "</div>"
          + (p.kontak ? "<div class=\"tn-pkontak\">" + escHtml(p.kontak) + "</div>" : "") + "</div>"
          + "<a class=\"tn-pdel\" href=\"/operasional/turnamen/" + tid + "/peserta/hapus?pid=" + p.id + "\" title=\"Hapus peserta\" onclick=\"return confirm('Hapus peserta ini?')\"><i class=\"ti ti-x\"></i></a>"
          + "</div>"
        ).join("") + "</div>";

    const canGen = peserta.length >= 2;
    body = "<div class=\"tn-sec\">"
      + "<div class=\"tn-sec-hd\"><div class=\"tn-sec-title\"><i class=\"ti ti-users\"></i> Peserta <span style=\"color:var(--txt3);font-weight:600\">(" + peserta.length + ")</span></div></div>"
      + "<form method=\"post\" action=\"/operasional/turnamen/" + tid + "/peserta/tambah\" class=\"tn-padd\">"
      +   "<div class=\"tn-fg grow\"><label>Nama Peserta</label><input name=\"nama\" type=\"text\" maxlength=\"80\" required placeholder=\"Nama pemain\"></div>"
      +   "<div class=\"tn-fg\"><label>Kontak (opsional)</label><input name=\"kontak\" type=\"text\" maxlength=\"40\" placeholder=\"WA / HP\"></div>"
      +   "<button type=\"submit\" class=\"tn-btn accent\"><i class=\"ti ti-user-plus\"></i> Tambah</button>"
      + "</form>"
      + plist
      + "<div class=\"tn-gen\">"
      +   "<div class=\"tn-gen-note\"><i class=\"ti ti-info-circle\"></i> Bagan single-elimination dibuat otomatis dari urutan daftar. Jika jumlah peserta bukan kelipatan 2, peserta teratas dapat <b>bye</b> (lolos otomatis ronde pertama).</div>"
      +   (canGen
            ? "<form method=\"post\" action=\"/operasional/turnamen/" + tid + "/bagan\" onsubmit=\"return confirm('Buat bagan dari " + peserta.length + " peserta? Pendaftaran akan ditutup.')\"><button type=\"submit\" class=\"btn-primary\"><i class=\"ti ti-tournament\"></i> Buat Bagan</button></form>"
            : "<button type=\"button\" class=\"btn-primary\" disabled style=\"opacity:.5;cursor:not-allowed\"><i class=\"ti ti-tournament\"></i> Buat Bagan</button>")
      + "</div>"
      + "</div>";
  } else {
    // ── Bracket ──────────────────────────────────────────────────
    const byRonde = {};
    for (const m of matches) (byRonde[m.ronde] = byRonde[m.ronde] || []).push(m);
    const rondes = Object.keys(byRonde).map(Number).sort((a, b) => a - b);

    const scoreData = {};  // matchId → {p1,p2,s1,s2} utk modal
    const slotHtml = (pid, score, isWin, showScore, seedNo) => {
      const tbd = !pid;
      const nm = pid ? escHtml(pName(pid)) : "Menunggu…";
      return "<div class=\"tn-slot" + (isWin ? " win" : "") + (tbd ? " tbd" : "") + "\">"
        + (pid && seedNo ? "<span class=\"seed\">#" + seedNo + "</span>" : "")
        + "<span class=\"nm\">" + nm + "</span>"
        + (showScore ? "<span class=\"sc\">" + score + "</span>" : "")
        + "</div>";
    };
    const seedOf = (pid) => { const p = pMap[pid]; return p ? (peserta.findIndex((x) => x.id === pid) + 1) : 0; };

    const bracket = rondes.map((r) => {
      const ms = byRonde[r];
      const hd = "<div class=\"tn-round-hd\">" + rondeLabel(ms.length) + "</div>";
      const cards = ms.map((m) => {
        const done = m.status === "selesai";
        const bye = done && (!m.peserta1Id || !m.peserta2Id);
        const bothReady = m.peserta1Id && m.peserta2Id;
        const showScore = done && !bye;
        const w1 = done && m.pemenangId && m.pemenangId === m.peserta1Id;
        const w2 = done && m.pemenangId && m.pemenangId === m.peserta2Id;
        let foot = "";
        if (bye) {
          foot = "<div class=\"tn-bye\">Bye — lolos otomatis</div>";
        } else if (bothReady && turnamen.status === "berjalan") {
          // boleh input / edit skor selama turnamen berjalan
          scoreData[m.id] = { p1: pName(m.peserta1Id), p2: pName(m.peserta2Id), s1: m.skor1, s2: m.skor2 };
          foot = "<div class=\"tn-match-foot\"><button type=\"button\" class=\"tn-score-btn\" onclick=\"tnScore(" + m.id + ")\">"
            + "<i class=\"ti ti-" + (done ? "pencil" : "ballpen") + "\"></i> " + (done ? "Ubah Skor" : "Input Skor") + "</button></div>";
        }
        const cls = "tn-match" + (bothReady && !done ? " pending-ready" : "");
        return "<div class=\"" + cls + "\">"
          + slotHtml(m.peserta1Id, m.skor1, w1, showScore, seedOf(m.peserta1Id))
          + slotHtml(m.peserta2Id, m.skor2, w2, showScore, seedOf(m.peserta2Id))
          + foot + "</div>";
      }).join("");
      return "<div class=\"tn-round\">" + hd + cards + "</div>";
    }).join("");

    const resetBtn = "<form method=\"post\" action=\"/operasional/turnamen/" + tid + "/reset\" onsubmit=\"return confirm('Bongkar bagan dan kembali ke tahap pendaftaran? Semua skor akan hilang.')\">"
      + "<button type=\"submit\" class=\"tn-btn danger\"><i class=\"ti ti-rotate\"></i> Bongkar Bagan</button></form>";

    body = "<div class=\"tn-sec\">"
      + "<div class=\"tn-sec-hd\"><div class=\"tn-sec-title\"><i class=\"ti ti-tournament\"></i> Bagan Pertandingan</div>" + resetBtn + "</div>"
      + "<div class=\"tn-bracket-wrap\"><div class=\"tn-bracket\">" + bracket + "</div></div>"
      + "</div>";

    // simpan data skor utk JS modal
    body += "<script>var TN_SCORE=" + safeJson(scoreData) + ";</script>";
  }

  const editData = safeJson({
    nama: turnamen.nama, cabang: turnamen.cabang, tanggal: toDateInput(turnamen.tanggal),
    biayaDaftar: turnamen.biayaDaftar, hadiah: turnamen.hadiah, catatan: turnamen.catatan,
  });

  const js =
    "var TN_ED=" + editData + ";"
    + "function tnOpenEdit(){var m=document.getElementById('tnEditModal');var f=m.querySelector('form');"
    +   "f.nama.value=TN_ED.nama||'';f.cabang.value=TN_ED.cabang||'';f.tanggal.value=TN_ED.tanggal||'';"
    +   "f.biaya_daftar.value=TN_ED.biayaDaftar||'';f.hadiah.value=TN_ED.hadiah||'';f.catatan.value=TN_ED.catatan||'';"
    +   "m.classList.add('show');}"
    + "function tnCloseEdit(){document.getElementById('tnEditModal').classList.remove('show');}"
    + "function tnScore(id){var d=(window.TN_SCORE||{})[id];if(!d)return;var m=document.getElementById('tnScoreModal');"
    +   "document.getElementById('tnMatchId').value=id;"
    +   "document.getElementById('tnP1').textContent=d.p1;document.getElementById('tnP2').textContent=d.p2;"
    +   "document.getElementById('tnSkor1').value=d.s1||0;document.getElementById('tnSkor2').value=d.s2||0;"
    +   "m.classList.add('show');setTimeout(function(){document.getElementById('tnSkor1').focus();},50);}"
    + "function tnCloseScore(){document.getElementById('tnScoreModal').classList.remove('show');}"
    + (toastMsg ? "setTimeout(function(){var t=document.getElementById('tnToast');if(t){t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2600);}},150);" : "");

  return docHeadV4(turnamen.nama)
    + "<style>" + TN_CSS + "</style></head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "turnamen", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\"><div class=\"topbar-brand\"><div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-trophy\"></i></div>"
    +   "<div><div class=\"topbar-name\">" + escHtml(turnamen.nama) + "</div><div class=\"topbar-label\">Turnamen</div></div></div></header>"
    + "<div class=\"page\">"
    + "<a href=\"/operasional/turnamen\" class=\"tn-back\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Semua Turnamen</a>"
    + champ
    + infoCard
    + body
    + "</div></div></div>"
    // Edit modal
    + "<div class=\"tn-modal\" id=\"tnEditModal\" onclick=\"if(event.target===this)tnCloseEdit()\"><div class=\"tn-modal-card\">"
    +   "<div class=\"tn-modal-hd\"><span><i class=\"ti ti-pencil t\"></i> Edit Turnamen</span><button type=\"button\" class=\"tn-modal-x\" onclick=\"tnCloseEdit()\"><i class=\"ti ti-x\"></i></button></div>"
    +   "<form method=\"post\" action=\"/operasional/turnamen/" + tid + "/edit\" class=\"tn-modal-body\" style=\"display:flex;flex-wrap:wrap;gap:12px\">"
    +     turnamenFormFields(turnamen)
    +     "<button type=\"submit\" class=\"btn-primary tn-modal-submit\"><i class=\"ti ti-check\"></i> Simpan Perubahan</button>"
    +   "</form></div></div>"
    // Score modal
    + "<div class=\"tn-modal\" id=\"tnScoreModal\" onclick=\"if(event.target===this)tnCloseScore()\"><div class=\"tn-modal-card\">"
    +   "<div class=\"tn-modal-hd\"><span><i class=\"ti ti-ballpen t\"></i> Input Skor</span><button type=\"button\" class=\"tn-modal-x\" onclick=\"tnCloseScore()\"><i class=\"ti ti-x\"></i></button></div>"
    +   "<form method=\"post\" action=\"/operasional/turnamen/" + tid + "/match/skor\" class=\"tn-modal-body\">"
    +     "<input type=\"hidden\" name=\"match_id\" id=\"tnMatchId\">"
    +     "<div class=\"tn-score-vs\">"
    +       "<div class=\"tn-score-line\"><span class=\"pn\" id=\"tnP1\"></span><input type=\"number\" name=\"skor1\" id=\"tnSkor1\" min=\"0\" max=\"999\" required></div>"
    +       "<div class=\"tn-score-line\"><span class=\"pn\" id=\"tnP2\"></span><input type=\"number\" name=\"skor2\" id=\"tnSkor2\" min=\"0\" max=\"999\" required></div>"
    +     "</div>"
    +     "<div style=\"font-size:11.5px;color:var(--txt3);margin:8px 0 4px\"><i class=\"ti ti-info-circle\"></i> Pemenang = skor lebih tinggi. Seri tidak diperbolehkan.</div>"
    +     "<button type=\"submit\" class=\"btn-primary tn-modal-submit\"><i class=\"ti ti-check\"></i> Simpan Skor</button>"
    +   "</form></div></div>"
    + (toastMsg ? "<div class=\"tn-toast" + (isErr ? " err" : "") + "\" id=\"tnToast\" style=\"" + (isErr ? "background:#a32d2d" : "") + "\"><i class=\"ti ti-" + (isErr ? "alert-triangle" : "check") + "\"></i> " + toastMsg + "</div>" : "")
    + "<script>" + js + "</script>"
    + "</body></html>";
}
