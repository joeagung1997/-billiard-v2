// src/views/notif.js
// ── Render partial HTML utk notif sheet sidebar ─────────────────
// Bukan full page — di-inject ke .notif-sheet-body via JS fetch.

import { escHtml } from "./finance.js";

const TIPE_CONF = {
  stok_low: {
    label: "Stok Tipis", icon: "ti-alert-triangle",
    color: "#c47f1a", bg: "#fef9e6",
  },
  stok_out: {
    label: "Stok Habis", icon: "ti-alert-octagon",
    color: "#a32d2d", bg: "#fef5f5",
  },
  target_harian: {
    label: "Target Harian", icon: "ti-target",
    color: "#2d6624", bg: "#eaf3de",
  },
  target_mingguan: {
    label: "Target Mingguan", icon: "ti-target",
    color: "#2d6624", bg: "#eaf3de",
  },
  target_bulanan: {
    label: "Target Bulanan", icon: "ti-target",
    color: "#2d6624", bg: "#eaf3de",
  },
  daily_summary: {
    label: "Ringkasan Harian", icon: "ti-calendar-stats",
    color: "#2660a4", bg: "#e6f1fb",
  },
  transaksi_in: {
    label: "Pemasukan", icon: "ti-arrow-down-circle",
    color: "#2d6624", bg: "#eaf3de",
  },
  transaksi_out: {
    label: "Pengeluaran", icon: "ti-arrow-up-circle",
    color: "#a32d2d", bg: "#fef5f5",
  },
  sesi_auto_close: {
    label: "Meja Auto-Tutup", icon: "ti-player-stop",
    color: "#2660a4", bg: "#e6f1fb",
  },
};

// Filter pills order — tampil semua tipe yg punya entry + "Semua".
const FILTER_GROUPS = [
  { key: "",            label: "Semua" },
  { key: "transaksi",   label: "Transaksi", match: ["transaksi_in", "transaksi_out"] },
  { key: "stok",        label: "Stok",      match: ["stok_low", "stok_out"] },
  { key: "target",      label: "Target",    match: ["target_harian", "target_mingguan", "target_bulanan"] },
  { key: "daily",       label: "Ringkasan", match: ["daily_summary"] },
  { key: "meja",        label: "Meja",      match: ["sesi_auto_close"] },
];

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

// Render partial. Output di-inject ke .notif-sheet-body via fetch.
export function renderNotifSheetBody({ notifs = [], unreadCount = 0 } = {}) {
  if (notifs.length === 0) {
    return ""
      + "<div class=\"notif-empty\">"
      +   "<i class=\"ti ti-bell-off\" style=\"font-size:32px;color:#94a3b8\"></i>"
      +   "<div style=\"margin-top:12px;font-size:13px;color:#7a8c78\">Belum ada notifikasi.</div>"
      +   "<div style=\"margin-top:4px;font-size:11px;color:#94a3b8\">Notif muncul otomatis saat stok tipis, target tercapai, atau ringkasan harian.</div>"
      + "</div>";
  }

  // Count per filter group untuk badge
  const counts = {};
  for (const g of FILTER_GROUPS) {
    if (g.key === "") counts[g.key] = notifs.length;
    else counts[g.key] = notifs.filter((n) => g.match.includes(n.tipe)).length;
  }

  // Filter pills
  const pills = FILTER_GROUPS
    .filter((g) => g.key === "" || counts[g.key] > 0)
    .map((g) => ""
      + "<button type=\"button\" class=\"ns-pill" + (g.key === "" ? " active" : "") + "\""
      +   " data-filter=\"" + g.key + "\" onclick=\"notifSetFilter(this)\">"
      +   escHtml(g.label) + " <span class=\"ns-pill-cnt\">" + counts[g.key] + "</span>"
      + "</button>")
    .join("");

  // Bulk action toolbar
  const toolbar = ""
    + "<div class=\"ns-toolbar\">"
    +   "<div class=\"ns-pills\">" + pills + "</div>"
    +   "<div class=\"ns-bulk\">"
    +     (unreadCount > 0
      ? "<button type=\"button\" class=\"ns-bulk-btn\" onclick=\"notifMarkAllRead()\"><i class=\"ti ti-check\"></i> Tandai Semua Dibaca</button>"
      : "")
    +     "<button type=\"button\" class=\"ns-bulk-btn ns-bulk-danger\" onclick=\"notifClearAll()\"><i class=\"ti ti-trash\"></i> Hapus Semua</button>"
    +   "</div>"
    + "</div>";

  // Items
  const renderItem = (n) => {
    const conf = TIPE_CONF[n.tipe] || { label: "Info", icon: "ti-info-circle", color: "#7a8c78", bg: "#f0f3ef" };
    const isRead = !!n.read_at;
    const filterKey = n.tipe.startsWith("stok_")      ? "stok"
                    : n.tipe.startsWith("target_")    ? "target"
                    : n.tipe.startsWith("transaksi_") ? "transaksi"
                    : n.tipe === "daily_summary"     ? "daily"
                    : n.tipe === "sesi_auto_close"   ? "meja" : "";
    return ""
      + "<div class=\"ns-item" + (isRead ? " is-read" : "") + "\""
      +    " data-id=\"" + n.id + "\" data-tipe=\"" + filterKey + "\">"
      +   "<div class=\"ns-item-icon\" style=\"background:" + conf.bg + ";color:" + conf.color + "\">"
      +     "<i class=\"ti " + conf.icon + "\"></i>"
      +   "</div>"
      +   "<div class=\"ns-item-body\">"
      +     "<div class=\"ns-item-head\">"
      +       (n.link
        ? "<a href=\"" + escHtml(n.link) + "\" class=\"ns-item-title\" onclick=\"notifOnClickLink(" + n.id + ")\">" + escHtml(n.title) + "</a>"
        : "<span class=\"ns-item-title\">" + escHtml(n.title) + "</span>")
      +       (!isRead ? "<span class=\"ns-unread-dot\" title=\"Belum dibaca\"></span>" : "")
      +     "</div>"
      +     (n.pesan ? "<div class=\"ns-item-msg\">" + escHtml(n.pesan) + "</div>" : "")
      +     "<div class=\"ns-item-foot\">"
      +       "<span class=\"ns-item-tag\" style=\"color:" + conf.color + "\">"
      +         "<i class=\"ti " + conf.icon + "\"></i> " + conf.label
      +       "</span>"
      +       "<span class=\"ns-item-time\">" + relTime(n.created_at) + "</span>"
      +     "</div>"
      +   "</div>"
      +   "<div class=\"ns-item-actions\">"
      +     (!isRead
        ? "<button type=\"button\" class=\"ns-act ns-act-read\" title=\"Tandai dibaca\" onclick=\"notifMarkRead(" + n.id + ")\"><i class=\"ti ti-check\"></i></button>"
        : "")
      +     "<button type=\"button\" class=\"ns-act ns-act-del\" title=\"Hapus\" onclick=\"notifDelete(" + n.id + ")\"><i class=\"ti ti-trash\"></i></button>"
      +   "</div>"
      + "</div>";
  };

  const list = ""
    + "<div class=\"ns-list\" id=\"nsList\">"
    +   notifs.map(renderItem).join("")
    + "</div>";

  return toolbar + list;
}

// ── CSS untuk sheet body — di-inject sekali di sidebarOwner.js ──
// Export utk dipakai sidebarOwner.js (selalu di-render).
export const notifSheetCss = [
  ".ns-toolbar{padding:10px 14px;background:#fff;border-bottom:1px solid #e2e8e0;display:flex;flex-direction:column;gap:8px}",
  ".ns-pills{display:flex;gap:6px;flex-wrap:wrap}",
  ".ns-pill{padding:5px 11px;border-radius:14px;background:#f4f6f3;border:1px solid #e2e8e0;font-size:11.5px;font-weight:500;color:#4a5e58;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:5px}",
  ".ns-pill:hover{background:#eef1ed}",
  ".ns-pill.active{background:#2d6624;border-color:#2d6624;color:#fff}",
  ".ns-pill-cnt{font-size:10px;background:rgba(255,255,255,.2);padding:0 6px;border-radius:8px;min-width:16px;text-align:center}",
  ".ns-pill:not(.active) .ns-pill-cnt{background:#fff;color:#7a8c78}",
  ".ns-bulk{display:flex;gap:6px;flex-wrap:wrap}",
  ".ns-bulk-btn{padding:5px 11px;border-radius:6px;background:#fff;border:1px solid #d4ddd2;color:#1a2318;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:4px}",
  ".ns-bulk-btn:hover{background:#eef1ed}",
  ".ns-bulk-btn i{font-size:13px}",
  ".ns-bulk-danger{background:#fef5f5;border-color:#f7c1c1;color:#a32d2d}",
  ".ns-bulk-danger:hover{background:#fcdede}",

  ".ns-list{padding:6px 0;overflow-y:auto;max-height:calc(85vh - 110px)}",
  ".ns-item{display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid #f0f3ef;background:#fff;transition:background .15s}",
  ".ns-item:hover{background:#f9fbf8}",
  ".ns-item.is-read{opacity:.65;background:#f9fbf8}",
  ".ns-item-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
  ".ns-item-icon i{font-size:18px}",
  ".ns-item-body{flex:1;min-width:0}",
  ".ns-item-head{display:flex;align-items:center;gap:6px;margin-bottom:3px}",
  ".ns-item-title{font-size:13px;font-weight:600;color:#1a2318;text-decoration:none;line-height:1.35;word-break:break-word}",
  "a.ns-item-title:hover{color:#2d6624;text-decoration:underline}",
  ".ns-unread-dot{width:7px;height:7px;border-radius:50%;background:#2d6624;flex-shrink:0;box-shadow:0 0 0 2px rgba(45,102,36,.18)}",
  ".ns-item-msg{font-size:12px;color:#4a5e58;line-height:1.45;margin-bottom:5px;word-break:break-word}",
  ".ns-item-foot{display:flex;align-items:center;gap:10px;font-size:10.5px;color:#7a8c78}",
  ".ns-item-tag{display:inline-flex;align-items:center;gap:3px;font-weight:600}",
  ".ns-item-tag i{font-size:11px}",
  ".ns-item-time{display:inline-flex;align-items:center;gap:3px}",
  ".ns-item-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}",
  ".ns-act{width:28px;height:28px;border-radius:6px;border:1px solid;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:#fff;font-family:'DM Sans',sans-serif}",
  ".ns-act i{font-size:13px}",
  ".ns-act-read{border-color:#b4d4a0;color:#2d6624}",
  ".ns-act-read:hover{background:#eaf3de}",
  ".ns-act-del{border-color:#f7c1c1;color:#a32d2d}",
  ".ns-act-del:hover{background:#fef5f5}",

  // Loading state
  ".ns-loading{padding:40px 20px;text-align:center;color:#7a8c78;font-size:13px}",
  ".ns-loading i{font-size:24px;margin-bottom:8px;display:block;color:#b0bfae;animation:nsSpin 1s linear infinite}",
  "@keyframes nsSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}",
].join("");
