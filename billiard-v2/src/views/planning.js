// src/views/planning.js
// ── Planning & Roadmap Bisnis ─────────────────────────────────
// Phase 1: Wishlist CRUD functional. Anggaran/Timeline/Simulasi = preview only.

import { CONFIG } from "../config.js";
import { docHeadV4, buildFinanceSidebar, buildFinanceTopbarProfile, escHtml } from "./finance.js";
import { buildOwnerHeader, buildOwnerTopbarBell, buildOwnerMenuToggle } from "./sidebarOwner.js";

// ── Helpers ─────────────────────────────────────────────────
const rp = (n) => {
  const abs = Math.abs(Math.round(Number(n) || 0));
  const s = String(abs);
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return "Rp " + parts.join(".");
};

const KATEGORI_LABELS = {
  billiard:  { lbl: "🎱 Billiard",   bg: "rgba(45,102,36,.12)",   color: "#2d6624" },
  warkop:    { lbl: "☕ Warkop",     bg: "rgba(245,158,11,.12)",  color: "#d97706" },
  renovasi:  { lbl: "🔨 Renovasi",   bg: "rgba(168,85,247,.12)",  color: "#a855f7" },
  sdm:       { lbl: "👥 SDM",        bg: "rgba(59,130,246,.12)",  color: "#2563eb" },
  marketing: { lbl: "📢 Marketing",  bg: "rgba(236,72,153,.12)",  color: "#db2777" },
  ekspansi:  { lbl: "🚀 Ekspansi",   bg: "rgba(239,68,68,.12)",   color: "#dc2626" },
  lain:      { lbl: "📦 Lain-lain",  bg: "rgba(122,140,120,.12)", color: "#7a8c78" },
};

const PRIORITAS_LABELS = {
  urgent:  { lbl: "🔴 Urgent",        bg: "rgba(239,68,68,.12)",  color: "#dc2626" },
  penting: { lbl: "🟡 Penting",       bg: "rgba(245,158,11,.12)", color: "#d97706" },
  nice:    { lbl: "🟢 Nice to have",  bg: "rgba(34,197,94,.12)",  color: "#16a34a" },
  idea:    { lbl: "💡 Ide",            bg: "rgba(122,140,120,.12)", color: "#7a8c78" },
};

const STATUS_LABELS = {
  idea:      { lbl: "💡 Idea",       bg: "rgba(122,140,120,.12)", color: "#7a8c78" },
  plan:      { lbl: "📋 Plan",       bg: "rgba(59,130,246,.12)",  color: "#2563eb" },
  ongoing:   { lbl: "🚧 On-going",   bg: "rgba(245,158,11,.12)",  color: "#d97706" },
  done:      { lbl: "✅ Done",        bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  cancelled: { lbl: "❌ Cancelled",  bg: "rgba(239,68,68,.12)",   color: "#dc2626" },
};

const renderTag = (map, key) => {
  const m = map[key] || map[Object.keys(map).pop()];
  return `<span class="plan-tag" style="background:${m.bg};color:${m.color}">${m.lbl}</span>`;
};

// Group items by prioritas
const groupByPrioritas = (items) => {
  const groups = { urgent: [], penting: [], nice: [], idea: [] };
  items.forEach((it) => {
    const p = it.prioritas || "nice";
    if (groups[p]) groups[p].push(it);
    else groups.nice.push(it);
  });
  return groups;
};

// ── Wishlist tab content ────────────────────────────────────
function renderWishlistTab(items) {
  const groups = groupByPrioritas(items);
  const countByStatus = items.reduce((acc, it) => {
    acc[it.status || "idea"] = (acc[it.status || "idea"] || 0) + 1;
    return acc;
  }, {});

  const renderRow = (it) => `
    <div class="plan-row" data-id="${escHtml(it.id)}">
      <div class="plan-row-main">
        <div class="plan-row-title">${escHtml(it.nama)}</div>
        <div class="plan-row-meta">
          ${renderTag(KATEGORI_LABELS, it.kategori)}
          ${renderTag(STATUS_LABELS, it.status)}
          ${it.targetDate ? `<span class="plan-meta-item"><i class="ti ti-calendar"></i> ${escHtml(it.targetDate)}</span>` : ''}
          ${it.vendor ? `<span class="plan-meta-item"><i class="ti ti-building-store"></i> ${escHtml(it.vendor)}</span>` : ''}
        </div>
        ${it.catatan ? `<div class="plan-row-catatan">${escHtml(it.catatan)}</div>` : ''}
      </div>
      <div class="plan-row-side">
        <div class="plan-row-estimasi">${rp(it.estimasi)}</div>
        ${it.roiEstimate > 0 ? `<div class="plan-row-roi">+ROI ${rp(it.roiEstimate)}/bln</div>` : ''}
        <div class="plan-row-actions">
          <button type="button" class="plan-btn-icon" title="Edit" onclick="openPlanModal('${escHtml(it.id)}')"><i class="ti ti-edit"></i></button>
          <button type="button" class="plan-btn-icon danger" title="Hapus" onclick="deletePlanItem('${escHtml(it.id)}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
  `;

  const renderGroup = (key, label, rows) => {
    if (!rows.length) return '';
    return `
      <div class="plan-group">
        <div class="plan-group-hdr">
          ${renderTag(PRIORITAS_LABELS, key)}
          <span class="plan-group-count">${rows.length} item</span>
        </div>
        <div class="plan-group-body">${rows.map(renderRow).join('')}</div>
      </div>
    `;
  };

  const totalEstimasi = items.reduce((s, it) => s + (it.estimasi || 0), 0);
  const totalRoi = items.reduce((s, it) => s + (it.roiEstimate || 0), 0);

  return `
    <div class="plan-tab-content">
      ${items.length > 0 ? `
      <!-- Summary mini — cuma tampil kalau ada item -->
      <div class="plan-wishlist-summary">
        <div class="plan-sum-item"><span class="plan-sum-lbl">Total Item</span><b>${items.length}</b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Estimasi Total</span><b>${rp(totalEstimasi)}</b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Potensi ROI</span><b class="plan-roi-val">${rp(totalRoi)}<small>/bln</small></b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Status</span><b class="plan-sum-status">
          ${countByStatus.idea || 0} ide · ${countByStatus.plan || 0} plan · ${countByStatus.ongoing || 0} on-going · ${countByStatus.done || 0} done
        </b></div>
      </div>
      ` : ''}

      ${items.length === 0
        ? `<div class="plan-empty-hero">
            <div class="plan-empty-illust">
              <div class="plan-empty-icon-bg"></div>
              <i class="ti ti-clipboard-list plan-empty-icon"></i>
              <span class="plan-empty-sparkle plan-empty-sparkle-1">✨</span>
              <span class="plan-empty-sparkle plan-empty-sparkle-2">💡</span>
              <span class="plan-empty-sparkle plan-empty-sparkle-3">🎯</span>
            </div>
            <div class="plan-empty-title">Belum ada item di wishlist</div>
            <div class="plan-empty-sub">Mulai catat rencana upgrade & ekspansi bisnis kamu.<br>Klik salah satu template di bawah untuk memulai cepat 👇</div>
            <div class="plan-empty-templates">
              <button type="button" class="plan-template-btn plan-tpl-billiard" onclick="openPlanModalFromTpl('billiard')">
                <span class="plan-tpl-ic">🎱</span>
                <span class="plan-tpl-info"><b>Tambah Meja Billiard</b><span>Estimasi Rp 12 jt</span></span>
              </button>
              <button type="button" class="plan-template-btn plan-tpl-warkop" onclick="openPlanModalFromTpl('warkop')">
                <span class="plan-tpl-ic">☕</span>
                <span class="plan-tpl-info"><b>Beli Mesin Espresso</b><span>Estimasi Rp 8 jt</span></span>
              </button>
              <button type="button" class="plan-template-btn plan-tpl-renov" onclick="openPlanModalFromTpl('renovasi')">
                <span class="plan-tpl-ic">🔨</span>
                <span class="plan-tpl-info"><b>Pasang AC Area Billiard</b><span>Estimasi Rp 3.5 jt</span></span>
              </button>
              <button type="button" class="plan-template-btn plan-tpl-blank" onclick="openPlanModal('')">
                <span class="plan-tpl-ic">➕</span>
                <span class="plan-tpl-info"><b>Item Custom</b><span>Mulai dari kosong</span></span>
              </button>
            </div>
          </div>`
        : `${renderGroup('urgent', 'Urgent', groups.urgent)}
           ${renderGroup('penting', 'Penting', groups.penting)}
           ${renderGroup('nice', 'Nice to have', groups.nice)}
           ${renderGroup('idea', 'Ide', groups.idea)}`}
    </div>
  `;
}

// ── Anggaran tab (preview) ──────────────────────────────────
function renderAnggaranTab() {
  return `
    <div class="plan-tab-content">
      <div class="plan-soon-card">
        <div class="plan-soon-hdr">
          <div class="plan-soon-ic"><i class="ti ti-piggy-bank"></i></div>
          <div>
            <div class="plan-soon-title">Anggaran & Tabungan Goal</div>
            <div class="plan-soon-sub">Alokasi otomatis dari laba harian — segera hadir</div>
          </div>
          <span class="plan-soon-badge">Segera</span>
        </div>
        <div class="plan-soon-preview">
          <div class="plan-goal-preview">
            <div class="plan-goal-title">🎯 Contoh: Tambah Meja Billiard ke-4</div>
            <div class="plan-goal-amounts">Rp 3.200.000 / Rp 12.000.000 <span>(27%)</span></div>
            <div class="plan-goal-bar"><div class="plan-goal-bar-fill" style="width:27%"></div></div>
            <div class="plan-goal-meta">
              <span>⚙️ Auto-sisihkan 15% dari laba harian</span>
              <span>📅 Estimasi: Sep 2026</span>
            </div>
          </div>
          <div class="plan-soon-features">
            <div class="plan-soon-feat"><i class="ti ti-target"></i> Multi-goal: nabung beberapa item paralel</div>
            <div class="plan-soon-feat"><i class="ti ti-percentage"></i> Sumber dana: % laba / % billiard / nominal fix</div>
            <div class="plan-soon-feat"><i class="ti ti-lock"></i> Lock fund — terpisah dari saldo bebas</div>
            <div class="plan-soon-feat"><i class="ti ti-bell"></i> Reminder progress bulanan</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Timeline tab (FUNCTIONAL — Gantt from wishlist items) ───
function renderTimelineTab(items) {
  // Filter items dgn target_date set & status != cancelled
  const dated = items.filter((it) => it.targetDate && it.status !== "cancelled");

  // Build 12 bulan ke depan dari bulan ini
  const today = new Date();
  const todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0");
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      key: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
      label: d.toLocaleDateString("id-ID", { month: "short" }),
      year: d.getFullYear(),
      isThisMonth: i === 0,
    });
  }

  // Render header row
  const hdrCells = months.map((m, i) => {
    const yrLbl = (i === 0 || m.label === "Jan") ? `<span class="plan-tl-year">${m.year}</span>` : "";
    return `<div class="plan-tl-month${m.isThisMonth ? " current" : ""}">${m.label}${yrLbl}</div>`;
  }).join("");

  // Status → bar color mapping
  const statusColor = {
    idea:    { color: "#94a3b8", style: "striped" },
    plan:    { color: "#2563eb", style: "striped" },
    ongoing: { color: "#3a7d2c", style: "solid"   },
    done:    { color: "#16a34a", style: "solid"   },
  };

  // Render row per item: bar from todayKey → targetMonth
  const rowsHtml = dated.length === 0
    ? `<div class="plan-empty plan-tl-empty">
         <i class="ti ti-timeline-event-exclamation"></i>
         <div class="plan-empty-title">Belum ada item ber-target tanggal</div>
         <div class="plan-empty-sub">Set 'Target Tanggal Eksekusi' di item Wishlist untuk muncul di timeline.</div>
       </div>`
    : dated.map((it) => {
        const targetKey = it.targetDate.slice(0, 7);
        let startIdx = months.findIndex((m) => m.key === todayKey);
        if (startIdx < 0) startIdx = 0;
        let endIdx = months.findIndex((m) => m.key === targetKey);
        const isOverdue = targetKey < todayKey;
        // Kalau target di luar 12 bulan ke depan, clamp ke index terakhir (overflow tag)
        const overflow = endIdx < 0 && targetKey > months[months.length - 1].key;
        if (endIdx < 0) endIdx = months.length - 1;
        if (isOverdue) { startIdx = 0; endIdx = 0; }
        // Grid columns 1-based, +1 utk label kolom (1), +1 utk bar start
        const colStart = startIdx + 2;
        const colEnd   = endIdx + 3; // grid-column end is exclusive
        const sc = statusColor[it.status] || statusColor.plan;
        const barClass = "plan-tl-bar plan-tl-bar-" + sc.style + (isOverdue ? " plan-tl-bar-overdue" : "");
        const barStyle = "grid-column:" + colStart + "/" + colEnd + ";"
                       + "background:" + (isOverdue ? "#dc2626" : sc.color);
        const katMap = KATEGORI_LABELS[it.kategori] || KATEGORI_LABELS.lain;
        return `
          <div class="plan-tl-row" data-id="${escHtml(it.id)}" onclick="openPlanModal('${escHtml(it.id)}')">
            <div class="plan-tl-task">
              <div class="plan-tl-task-title">${escHtml(it.nama)}</div>
              <div class="plan-tl-task-meta">
                <span style="color:${katMap.color}">${katMap.lbl}</span>
                <span class="plan-tl-task-sep">·</span>
                <span>${rp(it.estimasi)}</span>
                ${overflow ? '<span class="plan-tl-overflow">›</span>' : ''}
                ${isOverdue ? '<span class="plan-tl-overdue-pill">Overdue</span>' : ''}
              </div>
            </div>
            <div class="${barClass}" style="${barStyle}" title="${escHtml(it.targetDate)} · ${escHtml(it.status)}">
              <span class="plan-tl-bar-lbl">${it.status === 'ongoing' ? '🚧' : it.status === 'done' ? '✅' : it.status === 'idea' ? '💡' : '📋'}</span>
            </div>
          </div>
        `;
      }).join("");

  return `
    <div class="plan-tab-content">
      <div class="plan-tl-card">
        <div class="plan-tl-hdr">
          <div>
            <h3 class="plan-tl-title">🗺️ Roadmap 12 Bulan Ke Depan</h3>
            <p class="plan-tl-sub">${dated.length} item ber-jadwal · Status & color sesuai prioritas eksekusi</p>
          </div>
          <div class="plan-tl-legend">
            <span class="plan-tl-legend-item"><span class="plan-tl-dot solid" style="background:#3a7d2c"></span>On-going</span>
            <span class="plan-tl-legend-item"><span class="plan-tl-dot striped"></span>Plan</span>
            <span class="plan-tl-legend-item"><span class="plan-tl-dot" style="background:#dc2626"></span>Overdue</span>
          </div>
        </div>
        <div class="plan-tl-grid">
          <div class="plan-tl-thead">
            <div class="plan-tl-task-hdr">Item</div>
            ${hdrCells}
          </div>
          <div class="plan-tl-tbody">
            ${rowsHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Simulasi tab (preview) ──────────────────────────────────
function renderSimulasiTab() {
  return `
    <div class="plan-tab-content">
      <div class="plan-soon-card">
        <div class="plan-soon-hdr">
          <div class="plan-soon-ic"><i class="ti ti-calculator"></i></div>
          <div>
            <div class="plan-soon-title">Simulasi Dampak (ROI Calculator)</div>
            <div class="plan-soon-sub">Hitung BEP, ROI, dan skenario sebelum eksekusi. Segera hadir.</div>
          </div>
          <span class="plan-soon-badge">Segera</span>
        </div>
        <div class="plan-soon-preview">
          <div class="plan-sim-preview">
            <div class="plan-sim-title">🔮 Contoh: Tambah Meja Billiard ke-4</div>
            <div class="plan-sim-row">
              <div class="plan-sim-col">
                <div class="plan-sim-lbl">💸 Investasi</div>
                <div class="plan-sim-val out">Rp 12.500.000</div>
              </div>
              <div class="plan-sim-col">
                <div class="plan-sim-lbl">📈 Pendapatan/Bulan</div>
                <div class="plan-sim-val in">Rp 4.500.000</div>
              </div>
              <div class="plan-sim-col">
                <div class="plan-sim-lbl">⏱️ Break-Even</div>
                <div class="plan-sim-val net">~3 bulan</div>
              </div>
              <div class="plan-sim-col">
                <div class="plan-sim-lbl">🎯 ROI Tahun 1</div>
                <div class="plan-sim-val net">303%</div>
              </div>
            </div>
            <div class="plan-sim-scenarios">
              <span class="plan-sim-scen good">🟢 Best (8jam/hari): BEP 2.2 bln</span>
              <span class="plan-sim-scen mid">🟡 Normal (6jam): BEP 3 bln</span>
              <span class="plan-sim-scen bad">🔴 Worst (3jam): BEP 6 bln</span>
            </div>
            <div class="plan-sim-rec">💡 Rekomendasi: Layak. ROI tinggi, BEP cepat.</div>
          </div>
          <div class="plan-soon-features">
            <div class="plan-soon-feat"><i class="ti ti-chart-line"></i> Best/Normal/Worst scenario</div>
            <div class="plan-soon-feat"><i class="ti ti-coin"></i> Hitung Net = Pendapatan − Biaya rutin</div>
            <div class="plan-soon-feat"><i class="ti ti-bulb"></i> Auto-rekomendasi berdasarkan ROI</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Modal Form (Tambah/Edit Item) ───────────────────────────
function renderItemModal() {
  return `
    <div class="overlay" id="planModalOv" onclick="if(event.target===this)closePlanModal()">
      <div class="over-modal plan-modal">
        <div class="plan-modal-hdr">
          <div>
            <h3 class="plan-modal-title" id="planModalTitle">Tambah Item</h3>
            <p class="plan-modal-sub">Catat rencana upgrade / ekspansi bisnis</p>
          </div>
          <button type="button" class="plan-modal-close" onclick="closePlanModal()"><i class="ti ti-x"></i></button>
        </div>
        <form id="planForm" class="plan-modal-form" onsubmit="submitPlanForm(event)">
          <input type="hidden" id="planFId" name="id">
          <div class="plan-form-row">
            <label class="plan-form-lbl">Nama Item <span class="req">*</span></label>
            <input type="text" id="planFNama" name="nama" class="plan-form-inp" required maxlength="200" placeholder="contoh: Tambah meja billiard ke-4">
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Kategori</label>
              <select id="planFKategori" name="kategori" class="plan-form-inp">
                <option value="billiard">🎱 Billiard</option>
                <option value="warkop">☕ Warkop</option>
                <option value="renovasi">🔨 Renovasi</option>
                <option value="sdm">👥 SDM</option>
                <option value="marketing">📢 Marketing</option>
                <option value="ekspansi">🚀 Ekspansi</option>
                <option value="lain">📦 Lain-lain</option>
              </select>
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Estimasi Biaya (Rp)</label>
              <input type="text" inputmode="numeric" id="planFEstimasi" name="estimasi" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this)">
            </div>
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Prioritas</label>
              <select id="planFPrioritas" name="prioritas" class="plan-form-inp">
                <option value="urgent">🔴 Urgent</option>
                <option value="penting">🟡 Penting</option>
                <option value="nice" selected>🟢 Nice to have</option>
                <option value="idea">💡 Ide</option>
              </select>
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Status</label>
              <select id="planFStatus" name="status" class="plan-form-inp">
                <option value="idea" selected>💡 Idea</option>
                <option value="plan">📋 Plan</option>
                <option value="ongoing">🚧 On-going</option>
                <option value="done">✅ Done</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Target Tanggal Eksekusi</label>
              <input type="date" id="planFDate" name="target_date" class="plan-form-inp">
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Estimasi ROI (Rp/bulan)</label>
              <input type="text" inputmode="numeric" id="planFRoi" name="roi_estimate" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this)">
            </div>
          </div>
          <div class="plan-form-row">
            <label class="plan-form-lbl">Vendor / Supplier <span class="opt">opsional</span></label>
            <input type="text" id="planFVendor" name="vendor" class="plan-form-inp" maxlength="150" placeholder="contoh: Pak Budi 081xxxxxxxxx">
          </div>
          <div class="plan-form-row">
            <label class="plan-form-lbl">Catatan / Link Referensi <span class="opt">opsional</span></label>
            <textarea id="planFCatatan" name="catatan" class="plan-form-inp" rows="3" maxlength="500" placeholder="Link Tokopedia, spec produk, dll..."></textarea>
          </div>
          <div class="plan-form-actions">
            <button type="button" class="btn-outline" onclick="closePlanModal()">Batal</button>
            <button type="submit" class="btn-primary"><i class="ti ti-device-floppy"></i> Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ── Main page ───────────────────────────────────────────────
export function planningPage({ items = [], token = "", role = "owner", displayName = "" } = {}) {
  const isOwner = role === "owner";
  const itemsJson = JSON.stringify(items).replace(/</g, "\\u003c");

  return docHeadV4("Planning & Roadmap")
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=57\">"
    + "</head><body>"
    + "<div class=\"layout\">"
    + buildFinanceSidebar(token, "planning", role, displayName)
    + "<div class=\"main-wrap\">"

    // Owner header desktop
    + (isOwner ? buildOwnerHeader({
        breadcrumb: [{ label: "Operasional", href: "/operasional" }, { label: "Planning & Roadmap" }],
        actionsHtml: '<button type="button" class="own-header-btn own-header-btn-primary" onclick="openPlanModal(\'\')"><i class="ti ti-plus"></i> Tambah Item</button>',
      }) : "")

    // Mobile topbar
    + "<header class=\"topbar\">"
    + (isOwner ? buildOwnerMenuToggle() : "")
    + "<div class=\"topbar-brand\">"
    + "<div class=\"sb-brand-icon\" style=\"width:28px;height:28px;font-size:14px;margin-right:6px\"><i class=\"ti ti-route\"></i></div>"
    + "<div><div class=\"topbar-name\">Planning & Roadmap</div><div class=\"topbar-label\">Operasional</div></div>"
    + "</div>"
    + "<div class=\"topbar-right\">" + (isOwner ? buildOwnerTopbarBell() : "") + buildFinanceTopbarProfile(role, displayName) + "</div>"
    + "</header>"

    + "<div class=\"page\">"

    // Hero page heading — gradient bg, illustration, stats inline
    + "<div class=\"plan-hero\">"
    + "<div class=\"plan-hero-deco\"></div>"
    + "<div class=\"plan-hero-content\">"
    +   "<div class=\"plan-hero-icon\"><i class=\"ti ti-route-2\"></i></div>"
    +   "<div class=\"plan-hero-text\">"
    +     "<div class=\"plan-hero-eyebrow\">Operasional · Strategi Bisnis</div>"
    +     "<h1 class=\"plan-hero-title\">Planning &amp; Roadmap <span class=\"plan-hero-badge\"><i class=\"ti ti-crown\"></i>OWNER</span></h1>"
    +     "<p class=\"plan-hero-sub\">Catat rencana upgrade, alokasi tabungan goal, dan simulasi ROI ekspansi bisnis. Bantu kamu ambil keputusan berdasarkan angka — bukan feeling.</p>"
    +     "<div class=\"plan-hero-stats\">"
    +       "<span class=\"plan-hero-stat\"><i class=\"ti ti-clipboard-list\"></i> <b>" + items.length + "</b> item</span>"
    +       "<span class=\"plan-hero-stat\"><i class=\"ti ti-coin\"></i> Estimasi <b>" + rp(items.reduce((s, i) => s + (i.estimasi || 0), 0)) + "</b></span>"
    +       "<span class=\"plan-hero-stat plan-hero-roi\"><i class=\"ti ti-trending-up\"></i> Potensi ROI <b>" + rp(items.reduce((s, i) => s + (i.roiEstimate || 0), 0)) + "/bln</b></span>"
    +     "</div>"
    +   "</div>"
    + "</div>"
    + "</div>"

    // Tabs nav
    + "<div class=\"plan-tabs-nav\">"
    + "<button type=\"button\" class=\"plan-tab-btn active\" data-tab=\"wishlist\" onclick=\"switchPlanTab('wishlist')\"><i class=\"ti ti-clipboard-list\"></i> Wishlist <span class=\"plan-tab-count\">" + items.length + "</span></button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"anggaran\" onclick=\"switchPlanTab('anggaran')\"><i class=\"ti ti-piggy-bank\"></i> Anggaran <span class=\"plan-soon-pill\">Segera</span></button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"timeline\" onclick=\"switchPlanTab('timeline')\"><i class=\"ti ti-timeline-event\"></i> Timeline" + (items.filter((it) => it.targetDate && it.status !== "cancelled").length > 0 ? " <span class=\"plan-tab-count\">" + items.filter((it) => it.targetDate && it.status !== "cancelled").length + "</span>" : "") + "</button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"simulasi\" onclick=\"switchPlanTab('simulasi')\"><i class=\"ti ti-calculator\"></i> Simulasi <span class=\"plan-soon-pill\">Segera</span></button>"
    + "</div>"

    // Tab contents
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"wishlist\">" + renderWishlistTab(items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"anggaran\" style=\"display:none\">" + renderAnggaranTab() + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"timeline\" style=\"display:none\">" + renderTimelineTab(items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"simulasi\" style=\"display:none\">" + renderSimulasiTab() + "</div>"

    + "</div>" // .page
    + "</div>" // .main-wrap
    + "</div>" // .layout

    // Modal
    + renderItemModal()

    + "<script>"
    + "const PLAN_ITEMS=" + itemsJson + ";"
    + "function switchPlanTab(t){"
    +   "document.querySelectorAll('.plan-tab-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-tab')===t);});"
    +   "document.querySelectorAll('.plan-tab-wrap').forEach(function(d){d.style.display=d.getAttribute('data-tab-content')===t?'':'none';});"
    + "}"
    + "function openPlanModal(id){"
    +   "var ov=document.getElementById('planModalOv');"
    +   "document.getElementById('planForm').reset();"
    +   "document.getElementById('planFId').value='';"
    +   "document.getElementById('planModalTitle').textContent='Tambah Item';"
    +   "if(id){"
    +     "var it=PLAN_ITEMS.find(function(x){return x.id===id;});"
    +     "if(it){"
    +       "document.getElementById('planModalTitle').textContent='Edit Item';"
    +       "document.getElementById('planFId').value=it.id;"
    +       "document.getElementById('planFNama').value=it.nama||'';"
    +       "document.getElementById('planFKategori').value=it.kategori||'lain';"
    +       "document.getElementById('planFEstimasi').value=it.estimasi?_planRpFmt(it.estimasi):'';"
    +       "document.getElementById('planFPrioritas').value=it.prioritas||'nice';"
    +       "document.getElementById('planFStatus').value=it.status||'idea';"
    +       "document.getElementById('planFDate').value=it.targetDate||'';"
    +       "document.getElementById('planFRoi').value=it.roiEstimate?_planRpFmt(it.roiEstimate):'';"
    +       "document.getElementById('planFVendor').value=it.vendor||'';"
    +       "document.getElementById('planFCatatan').value=it.catatan||'';"
    +     "}"
    +   "}"
    +   "ov.classList.add('open');"
    +   "setTimeout(function(){document.getElementById('planFNama').focus();},150);"
    + "}"
    + "function closePlanModal(){document.getElementById('planModalOv').classList.remove('open');}"
    // Template quick-start: pre-fill modal dgn data umum
    + "function openPlanModalFromTpl(tpl){"
    +   "var t={billiard:{nama:'Tambah meja billiard ke-4',kategori:'billiard',estimasi:12000000,prioritas:'urgent',status:'plan',roi:4500000},"
    +     "warkop:{nama:'Beli mesin espresso',kategori:'warkop',estimasi:8000000,prioritas:'penting',status:'idea',roi:1500000},"
    +     "renovasi:{nama:'Pasang AC area billiard',kategori:'renovasi',estimasi:3500000,prioritas:'urgent',status:'plan',roi:0}};"
    +   "var x=t[tpl];if(!x){openPlanModal('');return;}"
    +   "openPlanModal('');"
    +   "document.getElementById('planFNama').value=x.nama;"
    +   "document.getElementById('planFKategori').value=x.kategori;"
    +   "document.getElementById('planFEstimasi').value=_planRpFmt(x.estimasi);"
    +   "document.getElementById('planFPrioritas').value=x.prioritas;"
    +   "document.getElementById('planFStatus').value=x.status;"
    +   "if(x.roi)document.getElementById('planFRoi').value=_planRpFmt(x.roi);"
    + "}"
    + "function _planRpFmt(n){var a=Math.abs(Math.round(Number(n)||0));var s=String(a);return s.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');}"
    + "function planFmtNum(el){var raw=el.value.replace(/\\D/g,'');var n=parseInt(raw)||0;el.value=n>0?_planRpFmt(n):'';}"
    + "function submitPlanForm(e){"
    +   "e.preventDefault();"
    +   "var fd=new FormData(document.getElementById('planForm'));"
    +   "var data={id:fd.get('id'),nama:fd.get('nama'),kategori:fd.get('kategori'),"
    +     "estimasi:(fd.get('estimasi')||'').replace(/\\./g,''),"
    +     "prioritas:fd.get('prioritas'),status:fd.get('status'),"
    +     "target_date:fd.get('target_date'),"
    +     "roi_estimate:(fd.get('roi_estimate')||'').replace(/\\./g,''),"
    +     "vendor:fd.get('vendor'),catatan:fd.get('catatan')};"
    +   "var url=data.id?'/operasional/planning/edit':'/operasional/planning/add';"
    +   "fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal menyimpan: '+r.status);})"
    +     ".catch(function(err){alert('Error: '+err.message);});"
    + "}"
    + "function deletePlanItem(id){"
    +   "if(!confirm('Hapus item ini permanen? Tidak bisa di-undo.'))return;"
    +   "fetch('/operasional/planning/delete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(id)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal hapus');});"
    + "}"
    + "</script>"

    + "</body></html>";
}
