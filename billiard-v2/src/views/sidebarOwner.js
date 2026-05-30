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
import { arenaName } from "../utils/brand.js";
import { notifSheetCss } from "./notif.js";
import { currentModules } from "../utils/tenant.js";

// Helper: initials nama (mis. "Agung Setiawan" → "AS")
function initials(name) {
  if (!name) return "OW";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function buildOwnerSidebar({ token = "", activePage = "", displayName = "" } = {}) {
  const tkSet = token
    ? `try{localStorage.setItem('warpat_atk','${token}');}catch(_){}`
    : "";

  const tkParam = token ? `&tk=${encodeURIComponent(token)}` : "";
  const soon = (title) => "/admin/segera-hadir?title=" + encodeURIComponent(title) + tkParam;

  const profileName   = (displayName || "").trim() || "Owner";
  const profileAvatar = initials(displayName);

  // ── Section definitions (urutan: Utama → Operasional → Member → Billiard
  //    → Warkop → SDM → Laporan → Pengaturan)
  const sections = [
    {
      key: "utama",
      emoji: "🏠",
      label: "Utama",
      items: [
        { id: "dashboard", href: "/admin?tk=" + token, icon: "ti ti-layout-dashboard", label: "Dashboard" },
      ],
    },
    {
      key: "operasional",
      emoji: "💰",
      label: "Operasional",
      items: [
        { id: "keuangan",  href: "/operasional",           icon: "ti ti-chart-pie", label: "Dashboard Keuangan", tk: true },
        { id: "transaksi", href: "/operasional/transaksi", icon: "ti ti-receipt",   label: "Transaksi",          tk: true },
        { id: "analisis",  href: "/operasional/analisis",  icon: "ti ti-target",    label: "Analisis Target",    tk: true },
        { id: "planning",  href: "/operasional/planning",  icon: "ti ti-route",     label: "Planning & Roadmap", tk: true, module: "planning" },
        { id: "kategori",  href: "/operasional/kategori",  icon: "ti ti-tag",       label: "Kelola Kategori",    tk: true },
      ],
    },
    {
      key: "member",
      emoji: "👥",
      label: "Member",
      items: [
        { id: "members",           href: "/admin/members?tk=" + token,           icon: "ti ti-user-circle", label: "Kelola Member" },
        { id: "riwayat-kunjungan", href: "/admin/riwayat-kunjungan?tk=" + token, icon: "ti ti-history",     label: "Riwayat Kunjungan" },
      ],
    },
    {
      key: "billiard",
      emoji: "🎱",
      label: "Billiard",
      module: "billiard",
      items: [
        { id: "manajemen-meja", href: soon("Manajemen Meja"), icon: "ti ti-grid-dots",  label: "Manajemen Meja", soon: true },
        { id: "riwayat-sewa",   href: soon("Riwayat Sewa"),   icon: "ti ti-receipt-2",  label: "Riwayat Sewa",   soon: true },
        { id: "turnamen",       href: soon("Turnamen"),       icon: "ti ti-trophy",     label: "Turnamen",       soon: true },
      ],
    },
    {
      key: "warkop",
      emoji: "☕",
      label: "Warkop",
      module: "warkop",
      items: [
        { id: "menu",     href: "/operasional/menu",      icon: "ti ti-list-details",     label: "Kelola Menu",      tk: true },
      ],
    },
    {
      // Inventori = INTI (semua jenis usaha butuh stok & supplier) → selalu tampil.
      key: "inventori",
      emoji: "📦",
      label: "Inventori",
      items: [
        { id: "stok",     href: "/operasional/stok",      icon: "ti ti-package",          label: "Stok & Inventory", tk: true },
        { id: "supplier", href: "/operasional/supplier",  icon: "ti ti-truck-delivery",   label: "Supplier",         tk: true },
      ],
    },
    {
      key: "sdm",
      emoji: "👨‍💼",
      label: "SDM",
      module: "sdm",
      items: [
        { id: "kru",            href: "/operasional/sdm",                   icon: "ti ti-users-group", label: "Kelola Kru",      tk: true },
        { id: "penggajian",     href: "/operasional/sdm#gaji",              icon: "ti ti-coin",        label: "Penggajian",      tk: true },
        { id: "aktivitas-kru",  href: "/operasional/monitoring/aktivitas",  icon: "ti ti-activity",    label: "Aktivitas Kru",   tk: true },
        { id: "shift-setoran",  href: "/operasional/monitoring/setoran",    icon: "ti ti-cash",        label: "Shift & Setoran", tk: true },
      ],
    },
    {
      key: "laporan",
      emoji: "📊",
      label: "Laporan",
      items: [
        { id: "laporan-untung-rugi",  href: soon("Laporan Untung Rugi"),  icon: "ti ti-trending-up",     label: "Untung Rugi",  soon: true },
        { id: "laporan-arus-kas",     href: soon("Laporan Arus Kas"),     icon: "ti ti-arrows-exchange", label: "Arus Kas",     soon: true },
        { id: "laporan-per-sumber",   href: soon("Laporan Per Sumber"),   icon: "ti ti-chart-donut",     label: "Per Sumber",   soon: true },
        { id: "laporan-per-kategori", href: soon("Laporan Per Kategori"), icon: "ti ti-chart-bar",       label: "Per Kategori", soon: true },
      ],
    },
    {
      key: "pengaturan",
      emoji: "⚙️",
      label: "Pengaturan",
      items: [
        { id: "catatan-fitur", href: "/operasional/catatan-fitur", icon: "ti ti-notes",         label: "Catatan Fitur",         tk: true },
        { id: "profil",   href: soon("Profil"),               icon: "ti ti-user-cog",        label: "Profil",                soon: true },
        { id: "pengguna", href: soon("Pengguna & Hak Akses"), icon: "ti ti-shield-lock",     label: "Pengguna & Hak Akses",  soon: true },
        { id: "backup",   href: soon("Backup Data"),          icon: "ti ti-database-export", label: "Backup Data",           soon: true },
      ],
    },
  ];

  // (Area Admin Platform kini terpisah di /platform dgn login & layout sendiri —
  //  tidak lagi muncul sebagai section di sidebar owner.)

  // Build nav HTML
  // Section dianggap "open" kalau: ada item aktif DI section itu, ATAU
  // section termasuk 'always open' (Operasional default expanded — section
  // utama harian, biar 1-klik akses ke Dashboard Keuangan / Transaksi).
  const activeModules = currentModules();
  const modOK = (m) => !m || activeModules.includes(m);
  const alwaysOpenKeys = new Set(["operasional"]);
  let navHtml = "";
  for (const sec of sections) {
    if (!modOK(sec.module)) continue;                 // modul section mati → sembunyikan
    const visItems = sec.items.filter((it) => modOK(it.module));
    if (visItems.length === 0) continue;              // semua item ter-filter → skip section
    const isOpen = alwaysOpenKeys.has(sec.key) || visItems.some((i) => i.id === activePage);
    navHtml += `<div class="own-section${isOpen ? " open" : ""}" data-key="${sec.key}">`;
    navHtml += `<button type="button" class="own-section-hdr" onclick="ownToggle(this)">`
      +   `<span class="own-section-emoji">${sec.emoji}</span>`
      +   `<span class="own-section-label">${sec.label}</span>`
      +   `<i class="ti ti-chevron-down own-section-chev"></i>`
      + `</button>`;
    navHtml += `<div class="own-section-body">`;
    for (const it of visItems) {
      const isActive = it.id === activePage;
      const onclick  = it.tk ? tkSet : "";
      const itemCls  = "own-item"
        + (isActive ? " active" : "")
        + (it.soon ? " own-item-soon" : "");
      navHtml += `<a href="${it.href}" class="${itemCls}"${onclick ? ` onclick="${onclick}"` : ""}>`
        + `<i class="${it.icon} own-item-icon"></i>`
        + `<span class="own-item-label">${it.label}</span>`
        + (it.soon ? `<span class="own-item-dot" title="Segera hadir"></span>` : "")
        + `</a>`;
    }
    navHtml += `</div>`;
    navHtml += `</div>`;
  }

  return `<div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
  <aside class="sidebar own-sidebar" id="ownSidebar">
    <div class="own-brand">
      <div class="own-brand-logo"><i class="ti ti-circle-number-8"></i><span class="own-brand-online"></span></div>
      <div class="own-brand-text">
        <div class="own-brand-name">${arenaName()}</div>
        <div class="own-brand-sub">Owner Panel</div>
      </div>
      <button type="button" class="sidebar-bell" onclick="openNotifSheet()" aria-label="Notifikasi" title="Notifikasi">
        <i class="ti ti-bell"></i>
        <span class="sidebar-bell-cnt" id="sidebarBellCnt" style="display:none"></span>
      </button>
      <button type="button" class="sidebar-close" onclick="closeSidebar()" aria-label="Tutup menu" title="Tutup">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <!-- Inline CSS utk sheet body (di-share antar halaman owner) -->
    <style id="notifSheetStyle">${notifSheetCss}
    .sidebar-bell-cnt{position:absolute;top:-3px;right:-3px;background:#a32d2d;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:9px;font-family:'DM Mono',monospace;min-width:16px;text-align:center;line-height:1.4}
    .sidebar-bell{position:relative}
    </style>

    <div class="own-nav-scroll">
      ${navHtml}
    </div>

    <div class="own-quick">
      <div class="own-quick-label">Aksi Cepat</div>
      <div class="own-quick-grid">
        <a href="/scan" class="own-quick-btn"><i class="ti ti-qrcode"></i><span>Scan Member</span></a>
        <a href="/operasional?openModal=trx" class="own-quick-btn own-quick-btn-primary"${tkSet ? ` onclick="${tkSet}"` : ""}><i class="ti ti-plus"></i><span>Transaksi Baru</span></a>
      </div>
    </div>

    <div class="own-profile">
      <div class="own-profile-avatar">${profileAvatar}</div>
      <div class="own-profile-info">
        <div class="own-profile-name">${profileName}</div>
        <div class="own-profile-role">Owner</div>
      </div>
      <button type="button" class="own-profile-logout" onclick="ownerLogout()" aria-label="Logout" title="Keluar"><i class="ti ti-logout"></i></button>
    </div>
  </aside>
  <!-- Notif sheet — sengaja di luar <aside> biar tidak ke-trap transform drawer di mobile (position:fixed ke viewport, bukan ke sidebar) -->
  <div class="notif-sheet-overlay" id="notifSheetOv" onclick="if(event.target===this)closeNotifSheet()">
    <div class="notif-sheet">
      <div class="notif-sheet-hdr">
        <div class="notif-sheet-title"><i class="ti ti-bell"></i> Notifikasi</div>
        <button type="button" class="notif-sheet-close" onclick="closeNotifSheet()"><i class="ti ti-x"></i></button>
      </div>
      <div class="notif-sheet-body" id="notifSheetBody">
        <div class="ns-loading">
          <i class="ti ti-loader-2"></i>
          <div>Memuat notifikasi...</div>
        </div>
      </div>
    </div>
  </div>
  <script>
    function ownToggle(btn) {
      var sec = btn.parentElement;
      if (sec) sec.classList.toggle("open");
    }
    function ownerLogout() {
      if (!confirm("Keluar dari sesi owner?")) return;
      try { localStorage.removeItem("warpat_atk"); } catch (_) {}
      // Pakai /admin/logout supaya cookie _frt juga ke-clear di server.
      // Tanpa ini, fallback _frt di middleware auto-login balik.
      window.location.href = "/admin/logout";
    }
    // ── Notif bell — auto-fetch unread count + lazy load sheet ──
    (function(){
      function updateBellBadge(count) {
        var cnt = document.getElementById("sidebarBellCnt");
        var topDot = document.getElementById("topbarBellDot");
        var show = count > 0;
        if (cnt) {
          cnt.style.display = show ? "inline-block" : "none";
          cnt.textContent = count > 99 ? "99+" : count;
        }
        if (topDot) topDot.style.display = show ? "inline-block" : "none";
      }
      function fetchUnreadCount() {
        fetch("/operasional/notif/unread-count", { credentials: "same-origin" })
          .then(function(r){ return r.json(); })
          .then(function(d){ updateBellBadge(d.count || 0); })
          .catch(function(){});
      }
      // Initial fetch saat page load
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fetchUnreadCount);
      } else {
        fetchUnreadCount();
      }
      // Poll tiap 60 detik (ringan: 1 SELECT COUNT)
      setInterval(fetchUnreadCount, 60000);
      window.__notifUpdateBadge = updateBellBadge;
      window.__notifRefreshBadge = fetchUnreadCount;
    })();

    function openNotifSheet(){
      var o=document.getElementById("notifSheetOv");
      if(o) o.classList.add("open");
      // Lazy load sheet body
      var body = document.getElementById("notifSheetBody");
      if (body) {
        body.innerHTML = '<div class="ns-loading"><i class="ti ti-loader-2"></i><div>Memuat notifikasi...</div></div>';
        fetch("/operasional/notif/sheet", { credentials: "same-origin" })
          .then(function(r){ return r.text(); })
          .then(function(html){ body.innerHTML = html; })
          .catch(function(){ body.innerHTML = '<div class="ns-loading">Gagal memuat notifikasi.</div>'; });
      }
    }
    function closeNotifSheet(){var o=document.getElementById("notifSheetOv");if(o)o.classList.remove("open");}

    // ── Notif actions ───────────────────────────────────────
    function notifMarkRead(id) {
      fetch("/operasional/notif/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "id=" + encodeURIComponent(id),
        credentials: "same-origin",
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d.ok) {
          var item = document.querySelector('.ns-item[data-id="' + id + '"]');
          if (item) {
            item.classList.add("is-read");
            var dot = item.querySelector(".ns-unread-dot");
            if (dot) dot.remove();
            var btn = item.querySelector(".ns-act-read");
            if (btn) btn.remove();
          }
          if (window.__notifUpdateBadge) window.__notifUpdateBadge(d.unreadCount || 0);
        }
      }).catch(function(){});
    }
    function notifMarkAllRead() {
      fetch("/operasional/notif/mark-all-read", { method: "POST", credentials: "same-origin" })
        .then(function(r){ return r.json(); }).then(function(d){
          if (d.ok) {
            // Re-fetch sheet for clean state
            var body = document.getElementById("notifSheetBody");
            if (body) {
              fetch("/operasional/notif/sheet", { credentials: "same-origin" })
                .then(function(r){ return r.text(); })
                .then(function(html){ body.innerHTML = html; });
            }
            if (window.__notifUpdateBadge) window.__notifUpdateBadge(0);
          }
        }).catch(function(){});
    }
    function notifDelete(id) {
      fetch("/operasional/notif/hapus", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "id=" + encodeURIComponent(id),
        credentials: "same-origin",
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d.ok) {
          var item = document.querySelector('.ns-item[data-id="' + id + '"]');
          if (item) item.remove();
          if (window.__notifUpdateBadge) window.__notifUpdateBadge(d.unreadCount || 0);
          // Kalau list jadi kosong, re-render sheet (empty state)
          var list = document.getElementById("nsList");
          if (list && list.children.length === 0) {
            var body = document.getElementById("notifSheetBody");
            if (body) {
              fetch("/operasional/notif/sheet", { credentials: "same-origin" })
                .then(function(r){ return r.text(); })
                .then(function(html){ body.innerHTML = html; });
            }
          }
        }
      }).catch(function(){});
    }
    function notifClearAll() {
      if (!confirm("Hapus semua notifikasi? Aksi ini tidak bisa dibatalkan.")) return;
      fetch("/operasional/notif/hapus-semua", { method: "POST", credentials: "same-origin" })
        .then(function(r){ return r.json(); }).then(function(d){
          if (d.ok) {
            var body = document.getElementById("notifSheetBody");
            if (body) {
              fetch("/operasional/notif/sheet", { credentials: "same-origin" })
                .then(function(r){ return r.text(); })
                .then(function(html){ body.innerHTML = html; });
            }
            if (window.__notifUpdateBadge) window.__notifUpdateBadge(0);
          }
        }).catch(function(){});
    }
    function notifSetFilter(btn) {
      // Toggle active pill + filter visibility ns-item by data-tipe
      var pills = document.querySelectorAll(".ns-pill");
      pills.forEach(function(p){ p.classList.remove("active"); });
      btn.classList.add("active");
      var key = btn.dataset.filter;
      var items = document.querySelectorAll(".ns-item");
      items.forEach(function(it){
        it.style.display = (!key || it.dataset.tipe === key) ? "" : "none";
      });
    }
    function notifOnClickLink(id) {
      // Silent mark-read sebelum navigate. Pakai sendBeacon biar gak block navigasi.
      try {
        if (navigator.sendBeacon) {
          var fd = new FormData();
          fd.append("id", id);
          navigator.sendBeacon("/operasional/notif/mark-read", fd);
        } else {
          fetch("/operasional/notif/mark-read", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "id=" + encodeURIComponent(id),
            credentials: "same-origin",
            keepalive: true,
          });
        }
      } catch (_) {}
      // Biarkan default navigate berlanjut (return true)
      return true;
    }
    // Mobile drawer: hamburger toggle sidebar + backdrop. Body lock scroll saat open.
    function toggleSidebar(){
      var s=document.getElementById("ownSidebar"),b=document.getElementById("sidebarBackdrop");
      var willOpen = s && !s.classList.contains("open");
      if(s)s.classList.toggle("open", willOpen);
      if(b)b.classList.toggle("open", willOpen);
      document.body.classList.toggle("sidebar-lock", willOpen);
    }
    function closeSidebar(){
      var s=document.getElementById("ownSidebar"),b=document.getElementById("sidebarBackdrop");
      if(s)s.classList.remove("open");
      if(b)b.classList.remove("open");
      document.body.classList.remove("sidebar-lock");
    }
    // Fallback handlers utk bottom-nav buttons di halaman finance child
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
export function buildOwnerTopbarBell() {
  return `<button type="button" class="topbar-bell" onclick="openNotifSheet()" aria-label="Notifikasi">
    <i class="ti ti-bell"></i>
    <span class="topbar-bell-dot" id="topbarBellDot" style="display:none"></span>
  </button>`;
}

// Hamburger button untuk mobile topbar — buka drawer sidebar owner.
// Visible cuma di mobile (<769px). Desktop sidebar selalu visible.
export function buildOwnerMenuToggle() {
  return `<button type="button" class="menu-toggle" onclick="toggleSidebar()" aria-label="Buka menu" title="Menu">
    <i class="ti ti-menu-2"></i>
  </button>`;
}

// ── Owner Header (desktop only) ──────────────────────────────
// Breadcrumb + global search + quick icons + page-specific action buttons.
// breadcrumb: array of {label, href?} — last item is current page (no link).
// actionsHtml: string HTML untuk action buttons di kanan (page-specific).
// hasNotifDot: tampilin red dot di bell (kalau ada notif unread).
export function buildOwnerHeader({ breadcrumb = [], actionsHtml = "", hasNotifDot = false } = {}) {
  const bcParts = breadcrumb.map((b, i) => {
    const isLast = i === breadcrumb.length - 1;
    const sep = i > 0 ? `<i class="ti ti-chevron-right own-bc-sep"></i>` : "";
    if (isLast || !b.href) {
      return `${sep}<span class="own-bc-curr">${b.label}</span>`;
    }
    return `${sep}<a href="${b.href}" class="own-bc-link">${b.label}</a>`;
  }).join("");

  return `<header class="own-header">
    <nav class="own-bc">${bcParts}</nav>
    <div class="own-search">
      <i class="ti ti-search own-search-icon"></i>
      <input type="text" class="own-search-input" placeholder="Cari transaksi, member, meja..." autocomplete="off" disabled>
    </div>
    <div class="own-header-actions">
      <button type="button" class="own-header-icon" title="Bantuan" onclick="alert('Bantuan: hubungi owner via WA')"><i class="ti ti-help"></i></button>
      <button type="button" class="own-header-icon own-header-bell" onclick="openNotifSheet()" title="Notifikasi">
        <i class="ti ti-bell"></i>
        ${hasNotifDot ? '<span class="own-header-bell-dot"></span>' : ''}
      </button>
      ${actionsHtml}
    </div>
  </header>`;
}

// ── Sidebar AREA ADMIN PLATFORM (superadmin) ─────────────────────────
// Ringkas & TERPISAH dari sidebar owner warung: tanpa menu operasional
// (billiard/warkop/stok/member/dll). Reuse CSS .own-sidebar agar konsisten.
export function buildPlatformSidebar({ token = "", activePage = "", displayName = "" } = {}) {
  const tk = token ? "?tk=" + encodeURIComponent(token) : "";
  const items = [
    { id: "dashboard",     href: "/platform" + tk,           icon: "ti ti-layout-dashboard", label: "Dashboard" },
    { id: "daftar-warung", href: "/platform/warung" + tk,    icon: "ti ti-building-store",    label: "Daftar Warung" },
    { id: "buat-warung",   href: "/platform/baru" + tk,      icon: "ti ti-plus",             label: "Buat Warung" },
    { id: "langganan",     href: "/platform/langganan" + tk, icon: "ti ti-receipt-2",        label: "Kelola Langganan" },
  ];
  const nav = items.map((it) =>
    `<a href="${it.href}" class="own-item${it.id === activePage ? " active" : ""}">`
    + `<i class="${it.icon} own-item-icon"></i><span class="own-item-label">${it.label}</span></a>`
  ).join("");
  const name = (displayName || "").trim() || "Super Admin";

  return `<div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
  <aside class="sidebar own-sidebar" id="ownSidebar">
    <div class="own-brand">
      <div class="own-brand-logo"><i class="ti ti-shield-cog"></i><span class="own-brand-online"></span></div>
      <div class="own-brand-text">
        <div class="own-brand-name">Admin Platform</div>
        <div class="own-brand-sub">Superadmin</div>
      </div>
      <button type="button" class="sidebar-close" onclick="closeSidebar()" aria-label="Tutup menu" title="Tutup"><i class="ti ti-x"></i></button>
    </div>
    <div class="own-nav-scroll">
      <div class="own-section open"><div class="own-section-body">${nav}</div></div>
    </div>
    <div class="own-profile">
      <div class="own-profile-avatar">SA</div>
      <div class="own-profile-info">
        <div class="own-profile-name">${name}</div>
        <div class="own-profile-role">Superadmin</div>
      </div>
      <a href="/platform/logout" class="own-profile-logout" aria-label="Logout" title="Keluar"><i class="ti ti-logout"></i></a>
    </div>
  </aside>
  <script>
    function toggleSidebar(){var s=document.getElementById("ownSidebar"),b=document.getElementById("sidebarBackdrop");var o=s&&!s.classList.contains("open");if(s)s.classList.toggle("open",o);if(b)b.classList.toggle("open",o);document.body.classList.toggle("sidebar-lock",o);}
    function closeSidebar(){var s=document.getElementById("ownSidebar"),b=document.getElementById("sidebarBackdrop");if(s)s.classList.remove("open");if(b)b.classList.remove("open");document.body.classList.remove("sidebar-lock");}
  </script>`;
}
