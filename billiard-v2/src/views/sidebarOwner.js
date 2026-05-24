// src/views/sidebarOwner.js
// ── Sidebar unified untuk role OWNER ─────────────────────────
// Dipakai shared oleh admin.js & finance.js. Karyawan tetep pakai sidebar lama.
//
// activePage: identifier item yg highlighted. Mapping:
//   dashboard, members, riwayat-kunjungan,
//   manajemen-meja, riwayat-sewa, turnamen,
//   menu, stok, supplier,
//   keuangan, transaksi, analisis, kategori,
//   kru, penggajian, aktivitas-kru, shift-setoran,
//   laporan-untung-rugi, laporan-arus-kas, laporan-per-sumber, laporan-per-kategori,
//   profil, pengguna, backup

import { CONFIG } from "../config.js";

// Helper: initials nama (mis. "Agung Setiawan" → "AS")
function initials(name) {
  if (!name) return "OW";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Helper: build sidebar nav item (atau submenu item)
function navItem(href, icon, label, isActive, tkOnclick) {
  const cls = "nav-item" + (isActive ? " active" : "");
  const onclick = tkOnclick ? ` onclick="${tkOnclick}"` : "";
  return `<a href="${href}" class="${cls}"${onclick}>`
    + `<div class="nav-item-icon"><i class="${icon}"></i></div>`
    + `<span class="nav-item-text">${label}</span>`
    + `</a>`;
}

function subItem(href, label, isActive, tkOnclick) {
  const cls = "submenu-item" + (isActive ? " active" : "");
  const onclick = tkOnclick ? ` onclick="${tkOnclick}"` : "";
  return `<a href="${href}" class="${cls}"${onclick}>`
    + `<div class="sub-dot"></div>${label}`
    + `</a>`;
}

export function buildOwnerSidebar({ token = "", activePage = "", displayName = "" } = {}) {
  // Persist token utk navigate ke route yg butuh ?tk= di-resolve dari localStorage
  const tkSet = token
    ? `try{localStorage.setItem('warpat_atk','${token}');}catch(_){}`
    : "";

  // Append ?tk= ke /admin/segera-hadir biar verifyToken lolos
  const tkParam = token ? `&tk=${encodeURIComponent(token)}` : "";

  // URL "Segera Hadir" placeholder — title encoded sbg query param.
  // Routed via /admin/segera-hadir (admin router mounted di /admin).
  const soon = (title) => "/admin/segera-hadir?title=" + encodeURIComponent(title) + tkParam;

  const profileName   = (displayName || "").trim() || "Owner";
  const profileAvatar = initials(displayName);

  // Detect active section (utk auto-open submenu yg ada item aktif)
  const sectionActive = (items) => items.some((id) => id === activePage);

  // ── Section definitions (utk semua group)
  const sections = [
    {
      key: "utama",
      label: "🏠 Utama",
      icon: "ti ti-home",
      items: [
        { id: "dashboard", href: "/admin?tk=" + token, icon: "ti ti-layout-dashboard", label: "Dashboard" },
      ],
    },
    {
      key: "member",
      label: "👥 Member",
      icon: "ti ti-users",
      items: [
        { id: "members",            href: "/admin/members?tk=" + token, icon: "ti ti-user-circle", label: "Kelola Member" },
        { id: "riwayat-kunjungan",  href: soon("Riwayat Kunjungan"),    icon: "ti ti-history",     label: "Riwayat Kunjungan", soon: true },
      ],
    },
    {
      key: "billiard",
      label: "🎱 Billiard",
      icon: "ti ti-circle-number-8",
      items: [
        { id: "manajemen-meja", href: soon("Manajemen Meja"), icon: "ti ti-grid-dots",        label: "Manajemen Meja", soon: true },
        { id: "riwayat-sewa",   href: soon("Riwayat Sewa"),   icon: "ti ti-receipt-2",        label: "Riwayat Sewa",   soon: true },
        { id: "turnamen",       href: soon("Turnamen"),       icon: "ti ti-trophy",           label: "Turnamen",       soon: true },
      ],
    },
    {
      key: "warkop",
      label: "☕ Warkop",
      icon: "ti ti-coffee",
      items: [
        { id: "menu",     href: "/operasional/menu", icon: "ti ti-list-details", label: "Kelola Menu",      tk: true },
        { id: "stok",     href: soon("Stok & Inventory"),  icon: "ti ti-package",      label: "Stok & Inventory", soon: true },
        { id: "supplier", href: soon("Supplier"),          icon: "ti ti-truck-delivery", label: "Supplier",         soon: true },
      ],
    },
    {
      key: "operasional",
      label: "💰 Operasional",
      icon: "ti ti-wallet",
      items: [
        { id: "keuangan",  href: "/operasional",            icon: "ti ti-chart-pie",     label: "Dashboard Keuangan", tk: true },
        { id: "transaksi", href: "/operasional#trx-list",   icon: "ti ti-receipt",       label: "Transaksi",          tk: true },
        { id: "analisis",  href: "/operasional/analisis",   icon: "ti ti-target",        label: "Analisis Target",    tk: true },
        { id: "kategori",  href: "/operasional/kategori",   icon: "ti ti-tag",           label: "Kelola Kategori",    tk: true },
      ],
    },
    {
      key: "sdm",
      label: "👨‍💼 SDM",
      icon: "ti ti-id-badge-2",
      items: [
        { id: "kru",            href: "/operasional/sdm",                       icon: "ti ti-users-group", label: "Kelola Kru",     tk: true },
        { id: "penggajian",     href: "/operasional/sdm#gaji",                  icon: "ti ti-coin",        label: "Penggajian",     tk: true },
        { id: "aktivitas-kru",  href: "/operasional/monitoring/aktivitas",      icon: "ti ti-activity",    label: "Aktivitas Kru",  tk: true },
        { id: "shift-setoran",  href: "/operasional/monitoring/setoran",        icon: "ti ti-cash",        label: "Shift & Setoran", tk: true },
      ],
    },
    {
      key: "laporan",
      label: "📊 Laporan",
      icon: "ti ti-report-analytics",
      items: [
        { id: "laporan-untung-rugi",   href: soon("Laporan Untung Rugi"),  icon: "ti ti-trending-up",    label: "Untung Rugi",  soon: true },
        { id: "laporan-arus-kas",      href: soon("Laporan Arus Kas"),     icon: "ti ti-arrows-exchange", label: "Arus Kas",     soon: true },
        { id: "laporan-per-sumber",    href: soon("Laporan Per Sumber"),   icon: "ti ti-chart-donut",    label: "Per Sumber",   soon: true },
        { id: "laporan-per-kategori",  href: soon("Laporan Per Kategori"), icon: "ti ti-chart-bar",      label: "Per Kategori", soon: true },
      ],
    },
    {
      key: "pengaturan",
      label: "⚙️ Pengaturan",
      icon: "ti ti-settings",
      items: [
        { id: "profil",   href: soon("Profil"),                icon: "ti ti-user-cog",  label: "Profil",                soon: true },
        { id: "pengguna", href: soon("Pengguna & Hak Akses"),  icon: "ti ti-shield-lock", label: "Pengguna & Hak Akses", soon: true },
        { id: "backup",   href: soon("Backup Data"),           icon: "ti ti-database-export", label: "Backup Data",      soon: true },
      ],
    },
  ];

  // Render sections sbg submenu (collapsible)
  let navHtml = "";
  for (const sec of sections) {
    const isOpen = sectionActive(sec.items.map((i) => i.id));
    navHtml += `<div class="nav-group">`;
    // Section header sbg toggle submenu — pakai .nav-item + chevron
    navHtml += `<div class="nav-item nav-section-toggle${isOpen ? " open" : ""}" onclick="toggleSubmenu('${sec.key}', this)">`
      +   `<div class="nav-item-icon"><i class="${sec.icon}"></i></div>`
      +   `<span class="nav-item-text">${sec.label}</span>`
      +   `<i class="ti ti-chevron-down nav-chevron"></i>`
      + `</div>`;
    // Submenu
    navHtml += `<div class="submenu-wrap"><div class="submenu${isOpen ? " open" : ""}" id="sub-${sec.key}">`;
    for (const it of sec.items) {
      const isActive = it.id === activePage;
      const onclick = it.tk ? tkSet : "";
      const soonBadge = it.soon ? ` <span class="soon-badge">Segera</span>` : "";
      navHtml += `<a href="${it.href}" class="submenu-item${isActive ? " active" : ""}"${onclick ? ` onclick="${onclick}"` : ""}>`
        + `<div class="sub-dot"></div>${it.label}${soonBadge}`
        + `</a>`;
    }
    navHtml += `</div></div>`;
    navHtml += `</div>`;
  }

  return `<aside class="sidebar">
    <div class="logo-area">
      <div class="logo-row">
        <div class="logo-mark"><i class="ti ti-circle-number-8"></i><div class="logo-online"></div></div>
        <div class="logo-text">
          <div class="logo-name">${CONFIG.NAMA_ARENA}</div>
          <div class="logo-sub">Owner Panel</div>
        </div>
        <button type="button" class="sidebar-bell" onclick="openNotifSheet()" aria-label="Notifikasi" title="Notifikasi">
          <i class="ti ti-bell"></i>
          <span class="sidebar-bell-dot" style="display:none"></span>
        </button>
      </div>
    </div>

    <!-- Notif sheet (rendered once per page; bell button buka via openNotifSheet) -->
    <div class="notif-sheet-overlay" id="notifSheetOv" onclick="if(event.target===this)closeNotifSheet()">
      <div class="notif-sheet">
        <div class="notif-sheet-hdr">
          <div class="notif-sheet-title"><i class="ti ti-bell"></i> Notifikasi</div>
          <button type="button" class="notif-sheet-close" onclick="closeNotifSheet()"><i class="ti ti-x"></i></button>
        </div>
        <div class="notif-sheet-body">
          <div class="notif-empty">
            <i class="ti ti-bell-off" style="font-size:32px;color:#94a3b8"></i>
            <div style="margin-top:12px;font-size:13px;color:#7a8c78">Belum ada notifikasi.</div>
            <div style="margin-top:4px;font-size:11px;color:#94a3b8">Fitur notif sedang dalam pengembangan.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="sidebar-divider"></div>

    <div class="nav-scroll">
      ${navHtml}
    </div>

    <div class="sidebar-divider"></div>
    <div class="quick-actions">
      <div class="nav-group-label" style="padding-bottom:8px">⚡ Aksi Cepat</div>
      <div class="qa-grid">
        <a href="/scan" class="qa-btn"><i class="ti ti-qrcode"></i>Scan Member</a>
        <a href="/operasional?openModal=trx" class="qa-btn"${tkSet ? ` onclick="${tkSet}"` : ""}><i class="ti ti-plus"></i>Transaksi Baru</a>
      </div>
    </div>

    <div class="sidebar-bottom">
      <div class="profile-card">
        <div class="profile-avatar" style="background:rgba(45,102,36,.18);color:#22c55e">${profileAvatar}</div>
        <div class="profile-info">
          <div class="profile-name">${profileName}</div>
          <div class="profile-role">Owner</div>
        </div>
        <div class="profile-actions">
          <button class="profile-btn danger" title="Logout" onclick="ownerLogout()"><i class="ti ti-logout"></i></button>
        </div>
      </div>
    </div>
  </aside>
  <script>
    function toggleSubmenu(id, el) {
      var sub = document.getElementById("sub-" + id);
      if (!sub) return;
      var open = sub.classList.contains("open");
      sub.classList.toggle("open", !open);
      el.classList.toggle("open", !open);
    }
    function ownerLogout() {
      if (!confirm("Keluar dari sesi owner?")) return;
      try { localStorage.removeItem("warpat_atk"); } catch (_) {}
      window.location.href = "/admin";
    }
    function openNotifSheet(){var o=document.getElementById("notifSheetOv");if(o)o.classList.add("open");}
    function closeNotifSheet(){var o=document.getElementById("notifSheetOv");if(o)o.classList.remove("open");}
    // Fallback handlers utk bottom-nav buttons (dipakai di halaman finance child)
    // — kalau page-level script tdk define, ini yg dipakai.
    if (typeof openBnSheet !== "function") {
      window.openBnSheet  = function(){var s=document.getElementById("bnSheet"),o=document.getElementById("bnSheetOv");if(s)s.classList.add("open");if(o)o.classList.add("open");};
      window.closeBnSheet = function(){var s=document.getElementById("bnSheet"),o=document.getElementById("bnSheetOv");if(s)s.classList.remove("open");if(o)o.classList.remove("open");};
    }
    if (typeof goAdmin !== "function") {
      window.goAdmin   = function(){var t=localStorage.getItem("warpat_atk");window.location.href=t?"/admin?tk="+t:"/admin";};
    }
    if (typeof goMembers !== "function") {
      window.goMembers = function(){var t=localStorage.getItem("warpat_atk");window.location.href=t?"/admin/members?tk="+t:"/admin/members";};
    }
    if (typeof financeLogout !== "function") {
      window.financeLogout = function(){if(!confirm("Keluar dari sesi keuangan?"))return;window.location.href="/operasional/logout";};
    }
  </script>`;
}

// Bell icon untuk topbar mobile (notif sheet sudah ke-render via buildOwnerSidebar).
// openNotifSheet/closeNotifSheet defined di sidebar script.
export function buildOwnerTopbarBell() {
  return `<button type="button" class="topbar-bell" onclick="openNotifSheet()" aria-label="Notifikasi">
    <i class="ti ti-bell"></i>
    <span class="topbar-bell-dot" id="topbarBellDot" style="display:none"></span>
  </button>`;
}
