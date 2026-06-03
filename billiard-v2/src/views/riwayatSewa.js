// src/views/riwayatSewa.js
// ── Halaman Riwayat Sewa — sesi meja billiard yang sudah SELESAI (owner) ──
// Data: sesi status 'closed' + item transaksi (sewa + F&B) ber-sesi_id. Filter
// tanggal (WIB) & meja, ringkasan durasi/total/bayar, detail item per sesi.

import { docHeadV4, escHtml, buildFinanceSidebar } from "./finance.js";

const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

// Tanggal & jam dalam WIB (eksplisit, tak bergantung TZ server).
const fmtJamWIB = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
};
const fmtTglWIB = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
};
const fmtDurasi = (ms) => {
  if (!ms || ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (h === 0) return m + " mnt";
  if (m === 0) return h + " jam";
  return h + " jam " + m + " mnt";
};

export function financeRiwayatSewaPage({
  role = "owner", displayName = "",
  sesiList = [], mejaList = [], stats = {},
  filter = { dari: "", sampai: "", mejaId: 0 },
  msg = "",
} = {}) {
  const toastMsg = msg === "closed" ? "Sesi ditutup &amp; masuk riwayat" : "";

  const mejaOpts = ["<option value=\"0\">Semua meja</option>"]
    .concat(mejaList.map((m) =>
      "<option value=\"" + m.id + "\"" + (filter.mejaId === m.id ? " selected" : "") + ">" + escHtml(m.nama) + "</option>"
    )).join("");

  const itemRow = (it) => {
    const isSewa = it.kategori === "Sewa Meja";
    const icon = isSewa ? "ti-clock-play" : "ti-coffee";
    const bayar = it.bayar === "qris" ? "QRIS" : it.bayar === "cash" ? "Cash" : "";
    const status = it.lunas
      ? "<span class=\"rs-pay paid\"><i class=\"ti ti-circle-check\"></i> Lunas" + (bayar ? " · " + bayar : "") + "</span>"
      : "<span class=\"rs-pay unpaid\"><i class=\"ti ti-clock\"></i> Belum bayar</span>";
    return "<tr>"
      + "<td><i class=\"ti " + icon + " rs-it-ic\"></i> " + (isSewa ? "Sewa" : "F&amp;B") + "</td>"
      + "<td class=\"rs-it-ket\">" + escHtml(it.keterangan || "—") + "</td>"
      + "<td>" + status + "</td>"
      + "<td class=\"rs-it-amt\">" + rp(it.jumlah || 0) + "</td>"
      + "</tr>";
  };

  const card = (s) => {
    const payBadge = s.belum > 0
      ? "<span class=\"rs-badge unpaid\"><i class=\"ti ti-alert-circle\"></i> Sisa " + rp(s.belum) + "</span>"
      : "<span class=\"rs-badge paid\"><i class=\"ti ti-circle-check\"></i> Lunas</span>";
    const detail = (s.items && s.items.length)
      ? "<table class=\"rs-itable\"><thead><tr><th>Jenis</th><th>Keterangan</th><th>Bayar</th><th style=\"text-align:right\">Jumlah</th></tr></thead>"
        + "<tbody>" + s.items.map(itemRow).join("") + "</tbody>"
        + "<tfoot><tr><td colspan=\"3\">Total</td><td class=\"rs-it-amt\">" + rp(s.total) + "</td></tr></tfoot></table>"
      : "<div class=\"rs-noitem\">Tidak ada item.</div>";
    return "<div class=\"rs-card\" data-id=\"" + s.id + "\">"
      + "<button type=\"button\" class=\"rs-head\" onclick=\"rsToggle(this)\">"
      +   "<div class=\"rs-chip\">" + escHtml((String(s.namaMeja || "?").match(/\d+/) || [String(s.namaMeja || "?").slice(0, 2)])[0]) + "</div>"
      +   "<div class=\"rs-main\">"
      +     "<div class=\"rs-t1\">" + escHtml(s.namaMeja || "Meja") + " <span class=\"rs-date\">" + fmtTglWIB(s.openedAt) + "</span></div>"
      +     "<div class=\"rs-t2\"><i class=\"ti ti-clock\"></i> " + fmtJamWIB(s.openedAt) + "–" + fmtJamWIB(s.closedAt)
      +       " <span class=\"rs-sep\">·</span> " + fmtDurasi(s.durasiMs)
      +       " <span class=\"rs-sep\">·</span> " + (s.items ? s.items.length : 0) + " item</div>"
      +   "</div>"
      +   "<div class=\"rs-right\">"
      +     "<div class=\"rs-total\">" + rp(s.total) + "</div>" + payBadge
      +   "</div>"
      +   "<i class=\"ti ti-chevron-down rs-caret\"></i>"
      + "</button>"
      + "<div class=\"rs-detail\">"
      +   (s.dibukaOleh ? "<div class=\"rs-meta\"><i class=\"ti ti-user\"></i> Dibuka oleh " + escHtml(s.dibukaOleh) + "</div>" : "")
      +   (s.catatan ? "<div class=\"rs-meta\"><i class=\"ti ti-note\"></i> " + escHtml(s.catatan) + "</div>" : "")
      +   detail
      + "</div>"
      + "</div>";
  };

  const list = sesiList.length === 0
    ? "<div class=\"rs-empty\"><i class=\"ti ti-history-off\"></i><div><strong>Belum ada riwayat sewa</strong><br>"
      + "<span>Sesi meja yang sudah ditutup akan muncul di sini. Tutup sesi lewat <a href=\"/operasional/sesi\">Sesi Meja</a>.</span></div></div>"
    : sesiList.map(card).join("");

  const css = `
    .rs-back{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;margin-bottom:14px}
    .rs-filter{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:16px}
    .rs-fg{display:flex;flex-direction:column;gap:4px}
    .rs-fg label{font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.03em}
    .rs-fg input,.rs-fg select{font-family:inherit;font-size:13px;padding:8px 10px;border:1px solid var(--border2);border-radius:9px;background:var(--surface2);color:var(--txt)}
    .rs-fbtn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
    .rs-fbtn.ghost{background:var(--surface2);color:var(--txt);border:1px solid var(--border2)}
    .rs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:18px}
    .rs-stat{padding:14px 16px;border-right:1px solid var(--border)}
    .rs-stat:last-child{border-right:none}
    .rs-stat-k{font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;display:flex;align-items:center;gap:5px}
    .rs-stat-v{font-size:20px;font-weight:700;color:var(--txt);font-family:'DM Mono',monospace}
    .rs-stat-m{font-size:11px;color:var(--txt2);margin-top:2px}
    .rs-list{display:flex;flex-direction:column;gap:10px}
    .rs-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:box-shadow .15s}
    .rs-card.open{box-shadow:0 4px 16px rgba(0,0,0,.06)}
    .rs-head{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit}
    .rs-chip{width:38px;height:38px;flex:none;border-radius:10px;background:linear-gradient(135deg,#2d6624,#3a7d2c);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;font-family:'DM Mono',monospace}
    .rs-main{flex:1;min-width:0}
    .rs-t1{font-size:14px;font-weight:600;color:var(--txt)}
    .rs-date{font-size:12px;font-weight:500;color:var(--txt3);margin-left:4px}
    .rs-t2{font-size:12px;color:var(--txt2);margin-top:2px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
    .rs-t2 i{font-size:13px}
    .rs-sep{color:var(--border2)}
    .rs-right{text-align:right;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
    .rs-total{font-size:15px;font-weight:700;color:var(--txt);font-family:'DM Mono',monospace}
    .rs-badge{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px}
    .rs-badge.paid{background:#e7f5e7;color:#2d6624}
    .rs-badge.unpaid{background:#fdeaea;color:#a32d2d}
    .rs-caret{flex:none;color:var(--txt3);transition:transform .2s;font-size:18px}
    .rs-card.open .rs-caret{transform:rotate(180deg)}
    .rs-detail{display:none;padding:0 14px 14px;border-top:1px solid var(--border)}
    .rs-card.open .rs-detail{display:block}
    .rs-meta{font-size:12px;color:var(--txt2);margin-top:10px;display:flex;align-items:center;gap:5px}
    .rs-itable{width:100%;border-collapse:collapse;margin-top:12px;font-size:12.5px}
    .rs-itable th{text-align:left;font-size:11px;color:var(--txt3);font-weight:600;text-transform:uppercase;letter-spacing:.03em;padding:6px 8px;border-bottom:1px solid var(--border)}
    .rs-itable td{padding:8px;border-bottom:1px solid var(--border);color:var(--txt)}
    .rs-it-ic{color:var(--accent)}
    .rs-it-ket{color:var(--txt2)}
    .rs-it-amt{text-align:right;font-family:'DM Mono',monospace;font-weight:600;white-space:nowrap}
    .rs-itable tfoot td{font-weight:700;border-bottom:none;border-top:2px solid var(--border)}
    .rs-pay{font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
    .rs-pay.paid{background:#e7f5e7;color:#2d6624}
    .rs-pay.unpaid{background:#fdeaea;color:#a32d2d}
    .rs-noitem{font-size:12px;color:var(--txt3);padding:12px 0}
    .rs-empty{display:flex;gap:14px;align-items:center;background:var(--surface);border:1px dashed var(--border2);border-radius:14px;padding:28px 24px;color:var(--txt2);font-size:13px}
    .rs-empty i{font-size:34px;color:var(--txt3)}
    .rs-empty a{color:var(--accent);font-weight:600;text-decoration:none}
    .rs-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--accent);color:#fff;padding:11px 20px;border-radius:24px;font-size:13px;font-weight:600;box-shadow:0 6px 20px rgba(45,102,36,.35);opacity:0;pointer-events:none;transition:all .2s;z-index:9999}
    .rs-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    @media(max-width:680px){
      .rs-stats{grid-template-columns:repeat(2,1fr)}
      .rs-stat:nth-child(2n){border-right:none}
      .rs-stat:nth-child(1),.rs-stat:nth-child(2){border-bottom:1px solid var(--border)}
      .rs-right{display:none}
      .rs-fg,.rs-fg input,.rs-fg select{flex:1 1 100%;width:100%}
    }
  `;

  const js =
    "function rsToggle(b){var c=b.closest('.rs-card');if(c)c.classList.toggle('open');}"
    + (toastMsg ? "setTimeout(function(){var t=document.getElementById('rsToast');if(t){t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2200);}},150);" : "");

  return docHeadV4("Riwayat Sewa")
    + "<style>" + css + "</style>"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar("", "riwayat-sewa", role, displayName)
    + "<div class=\"main-wrap\">"
    + "<header class=\"topbar\">"
    +   "<div class=\"topbar-brand\"><div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-receipt-2\"></i></div>"
    +   "<div><div class=\"topbar-name\">Riwayat Sewa</div><div class=\"topbar-label\">Billiard</div></div></div>"
    + "</header>"
    + "<div class=\"page\">"
    + "<a href=\"/operasional\" class=\"rs-back\"><i class=\"ti ti-arrow-left\" style=\"font-size:14px\"></i> Kembali ke Keuangan</a>"
    + "<div class=\"page-title\">Riwayat Sewa</div>"
    + "<div class=\"page-sub\" style=\"margin-bottom:18px\">Daftar sesi meja yang sudah selesai — durasi, item sewa &amp; F&amp;B, serta status pembayaran.</div>"
    + "<form class=\"rs-filter\" method=\"get\" action=\"/operasional/riwayat-sewa\">"
    +   "<div class=\"rs-fg\"><label>Dari tanggal</label><input type=\"date\" name=\"dari\" value=\"" + escHtml(filter.dari || "") + "\"></div>"
    +   "<div class=\"rs-fg\"><label>Sampai tanggal</label><input type=\"date\" name=\"sampai\" value=\"" + escHtml(filter.sampai || "") + "\"></div>"
    +   "<div class=\"rs-fg\"><label>Meja</label><select name=\"meja\">" + mejaOpts + "</select></div>"
    +   "<button type=\"submit\" class=\"rs-fbtn\"><i class=\"ti ti-filter\"></i> Terapkan</button>"
    +   "<a href=\"/operasional/riwayat-sewa\" class=\"rs-fbtn ghost\"><i class=\"ti ti-x\"></i> Reset</a>"
    + "</form>"
    + "<div class=\"rs-stats\">"
    +   "<div class=\"rs-stat\"><div class=\"rs-stat-k\"><i class=\"ti ti-list-check\"></i> Total sesi</div><div class=\"rs-stat-v\">" + (stats.count || 0) + "</div><div class=\"rs-stat-m\">selesai pada periode</div></div>"
    +   "<div class=\"rs-stat\"><div class=\"rs-stat-k\"><i class=\"ti ti-cash\"></i> Pendapatan</div><div class=\"rs-stat-v\">" + rp(stats.revenue || 0) + "</div><div class=\"rs-stat-m\">item lunas</div></div>"
    +   "<div class=\"rs-stat\"><div class=\"rs-stat-k\"><i class=\"ti ti-clock\"></i> Total durasi</div><div class=\"rs-stat-v\">" + fmtDurasi(stats.durasiMs || 0) + "</div><div class=\"rs-stat-m\">akumulasi main</div></div>"
    +   "<div class=\"rs-stat\"><div class=\"rs-stat-k\"><i class=\"ti ti-alert-circle\"></i> Belum lunas</div><div class=\"rs-stat-v\">" + rp(stats.belum || 0) + "</div><div class=\"rs-stat-m\">piutang sesi</div></div>"
    + "</div>"
    + "<div class=\"rs-list\">" + list + "</div>"
    + "</div></div></div>"
    + (toastMsg ? "<div class=\"rs-toast\" id=\"rsToast\"><i class=\"ti ti-check\"></i> " + toastMsg + "</div>" : "")
    + "<script>" + js + "</script>"
    + "</body></html>";
}
