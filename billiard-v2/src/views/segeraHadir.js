// src/views/segeraHadir.js
// ── Placeholder page utk menu yg blm di-implement ────────────

import { CONFIG } from "../config.js";
import { buildOwnerSidebar, buildOwnerTopbarBell } from "./sidebarOwner.js";

export function segeraHadirPage({ title = "Fitur Ini", token = "", user = {} }) {
  const displayName = (user.displayName || "").trim();
  const isOwner = user.role === "owner";

  return `<!DOCTYPE html><html lang="id"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <title>${title} — ${CONFIG.NAMA_ARENA}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/admin.css?v=40">
    <style>
      .soon-wrap{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 80px);padding:24px}
      .soon-card{max-width:480px;width:100%;text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:40px 28px;box-shadow:0 4px 16px rgba(0,0,0,.04)}
      .soon-icon{width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#3a7d2c,#22c55e);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:32px;margin-bottom:18px}
      .soon-title{font-size:20px;font-weight:700;color:var(--txt);margin-bottom:8px}
      .soon-sub{font-size:13px;color:var(--txt2);line-height:1.6;margin-bottom:24px}
      .soon-back{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border:1px solid var(--border2);border-radius:9px;font-size:13px;color:var(--txt);background:var(--surface2);text-decoration:none;cursor:pointer;font-family:inherit}
      .soon-back:hover{background:var(--border)}
    </style>
  </head><body>
    <div class="layout">
      ${isOwner ? buildOwnerSidebar({ token, activePage: "", displayName }) : ""}
      <div class="main-wrap">
        <header class="topbar">
          <div class="topbar-brand">
            <div class="sb-brand-icon" style="width:28px;height:28px;font-size:14px;margin-right:6px"><i class="ti ti-circle-number-8"></i></div>
            <div>
              <div class="topbar-name">${title}</div>
              <div class="topbar-label">Segera Hadir</div>
            </div>
          </div>
          <div class="topbar-right">${isOwner ? buildOwnerTopbarBell() : ""}</div>
        </header>
        <div class="page">
          <div class="soon-wrap">
            <div class="soon-card">
              <div class="soon-icon"><i class="ti ti-tools"></i></div>
              <div class="soon-title">${title}</div>
              <div class="soon-sub">Fitur ini sedang dalam pengembangan. Sabar ya, segera tersedia di update berikutnya. 🚀</div>
              <a href="javascript:history.back()" class="soon-back"><i class="ti ti-arrow-left"></i> Kembali</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}
