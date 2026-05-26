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
// Hitung balik modal (bulan): estimasi ÷ roiEstimate per bulan
const calcBalikModal = (estimasi, roi) => {
  const e = Number(estimasi) || 0;
  const r = Number(roi) || 0;
  if (e <= 0 || r <= 0) return 0;
  return e / r;
};

// Format durasi: < 12 bln → "X bulan", >= 12 bln → "X.Y tahun"
const fmtDurasi = (bln) => {
  if (!bln || bln <= 0) return "";
  if (bln < 12) return Math.round(bln) + " bulan";
  return (bln / 12).toFixed(1).replace(/\.0$/, "") + " tahun";
};

// Hitung warning deadline: H-30 prog<80% → "Terlambat", H-60 prog<50% → "Perlu dikejar"
const calcDeadlineWarn = (targetDate, savedAmount, estimasi) => {
  if (!targetDate || !estimasi || estimasi <= 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  if (isNaN(target)) return null;
  const daysLeft = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return null;
  const pct = Math.min(100, (savedAmount / estimasi) * 100);
  if (daysLeft <= 30 && pct < 80) {
    return { lvl: "danger", lbl: "Terlambat", icon: "ti-alert-triangle", daysLeft };
  }
  if (daysLeft <= 60 && pct < 50) {
    return { lvl: "warn", lbl: "Perlu dikejar", icon: "ti-clock-exclamation", daysLeft };
  }
  return null;
};

function renderWishlistTab(items) {
  const groups = groupByPrioritas(items);
  const countByStatus = items.reduce((acc, it) => {
    acc[it.status || "idea"] = (acc[it.status || "idea"] || 0) + 1;
    return acc;
  }, {});

  const renderRow = (it) => {
    const kat = KATEGORI_LABELS[it.kategori] || KATEGORI_LABELS.lain;
    const balikModalBln = calcBalikModal(it.estimasi, it.roiEstimate);
    const balikModalLbl = fmtDurasi(balikModalBln);
    const saved = Number(it.savedAmount) || 0;
    const estimasi = Number(it.estimasi) || 0;
    const pct = estimasi > 0 ? Math.min(100, Math.round((saved / estimasi) * 100)) : 0;
    const remaining = Math.max(0, estimasi - saved);
    const warn = calcDeadlineWarn(it.targetDate, saved, estimasi);
    const isDone = it.status === "done";
    return `
    <div class="plan-row${isDone ? ' plan-row-done' : ''}" data-id="${escHtml(it.id)}">
      <div class="plan-row-thumb" style="background:${kat.bg};color:${kat.color}">
        <span class="plan-row-thumb-emoji">${kat.lbl.split(' ')[0]}</span>
      </div>
      <div class="plan-row-main">
        <div class="plan-row-title">${escHtml(it.nama)}</div>
        <div class="plan-row-meta">
          ${renderTag(KATEGORI_LABELS, it.kategori)}
          ${renderTag(STATUS_LABELS, it.status)}
          ${it.targetDate ? `<span class="plan-meta-item"><i class="ti ti-calendar"></i> ${escHtml(it.targetDate)}</span>` : ''}
          ${it.vendor ? `<span class="plan-meta-item"><i class="ti ti-building-store"></i> ${escHtml(it.vendor)}</span>` : ''}
          ${balikModalLbl ? `<span class="plan-meta-item plan-meta-bep" title="Estimasi balik modal dari ROI/bulan"><i class="ti ti-trending-up"></i> Balik modal: ${balikModalLbl}</span>` : ''}
          ${warn ? `<span class="plan-meta-item plan-warn-${warn.lvl}" title="H-${warn.daysLeft} & progress ${pct}%"><i class="ti ${warn.icon}"></i> ${warn.lbl}</span>` : ''}
        </div>
        ${estimasi > 0 ? `
        <div class="plan-row-progress" title="Sudah terkumpul ${rp(saved)} dari target ${rp(estimasi)}">
          <div class="plan-row-prog-bar"><div class="plan-row-prog-fill plan-prog-${pct >= 100 ? 'done' : (pct >= 50 ? 'mid' : 'low')}" style="width:${pct}%"></div></div>
          <div class="plan-row-prog-txt">${rp(saved)} <span class="plan-row-prog-sep">/</span> ${rp(estimasi)} <b>(${pct}%)</b>${remaining > 0 ? ` <span class="plan-row-prog-rem">· sisa ${rp(remaining)}</span>` : ''}</div>
        </div>` : ''}
        ${it.catatan ? `<div class="plan-row-catatan">${escHtml(it.catatan)}</div>` : ''}
      </div>
      <div class="plan-row-side">
        <div class="plan-row-estimasi">${rp(it.estimasi)}</div>
        ${it.roiEstimate > 0 ? `<div class="plan-row-roi">+ROI ${rp(it.roiEstimate)}/bln</div>` : ''}
        <div class="plan-row-actions">
          ${!isDone ? `<button type="button" class="plan-btn-icon plan-btn-done" title="Tandai Selesai" onclick="markPlanDone('${escHtml(it.id)}')"><i class="ti ti-check"></i></button>` : ''}
          <button type="button" class="plan-btn-icon" title="Kirim ke Anggaran" onclick="sendToAnggaran('${escHtml(it.id)}')"><i class="ti ti-piggy-bank"></i></button>
          <button type="button" class="plan-btn-icon" title="Duplikat" onclick="duplicatePlanItem('${escHtml(it.id)}')"><i class="ti ti-copy"></i></button>
          <button type="button" class="plan-btn-icon" title="Edit" onclick="openPlanModal('${escHtml(it.id)}')"><i class="ti ti-edit"></i></button>
          <button type="button" class="plan-btn-icon danger" title="Hapus" onclick="deletePlanItem('${escHtml(it.id)}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
  `;
  };

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

      <!-- Filter & Sort toolbar -->
      <div class="plan-filter-bar">
        <div class="plan-filter-grp">
          <label class="plan-filter-lbl"><i class="ti ti-filter"></i> Status</label>
          <select id="planFilterStatus" class="plan-filter-inp" onchange="applyPlanFilter()">
            <option value="">Semua</option>
            <option value="idea">💡 Idea</option>
            <option value="plan">📋 Plan</option>
            <option value="ongoing">🚧 On-going</option>
            <option value="done">✅ Done</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
        </div>
        <div class="plan-filter-grp">
          <label class="plan-filter-lbl">Prioritas</label>
          <select id="planFilterPrio" class="plan-filter-inp" onchange="applyPlanFilter()">
            <option value="">Semua</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="penting">🟡 Penting</option>
            <option value="nice">🟢 Nice to have</option>
            <option value="idea">💡 Ide</option>
          </select>
        </div>
        <div class="plan-filter-grp">
          <label class="plan-filter-lbl">Kategori</label>
          <select id="planFilterKat" class="plan-filter-inp" onchange="applyPlanFilter()">
            <option value="">Semua</option>
            <option value="billiard">🎱 Billiard</option>
            <option value="warkop">☕ Warkop</option>
            <option value="renovasi">🔨 Renovasi</option>
            <option value="sdm">👥 SDM</option>
            <option value="marketing">📢 Marketing</option>
            <option value="ekspansi">🚀 Ekspansi</option>
            <option value="lain">📦 Lain-lain</option>
          </select>
        </div>
        <div class="plan-filter-grp">
          <label class="plan-filter-lbl"><i class="ti ti-arrows-sort"></i> Urutkan</label>
          <select id="planFilterSort" class="plan-filter-inp" onchange="applyPlanFilter()">
            <option value="default">Prioritas (default)</option>
            <option value="roi_desc">ROI tertinggi</option>
            <option value="bep_asc">Balik modal tercepat</option>
            <option value="target_asc">Target terdekat</option>
            <option value="cost_asc">Termurah</option>
            <option value="cost_desc">Termahal</option>
          </select>
        </div>
        <button type="button" class="plan-filter-reset" onclick="resetPlanFilter()" title="Reset filter"><i class="ti ti-x"></i></button>
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
        : `<div id="planWishlistResults">
            ${renderGroup('urgent', 'Urgent', groups.urgent)}
            ${renderGroup('penting', 'Penting', groups.penting)}
            ${renderGroup('nice', 'Nice to have', groups.nice)}
            ${renderGroup('idea', 'Ide', groups.idea)}
          </div>
          <div id="planWishlistEmpty" class="plan-empty plan-filter-empty" style="display:none">
            <i class="ti ti-filter-off"></i>
            <div class="plan-empty-title">Tidak ada item cocok dgn filter</div>
            <div class="plan-empty-sub">Coba reset filter atau ubah kriteria pencarian.</div>
            <button type="button" class="btn-outline" onclick="resetPlanFilter()" style="margin-top:12px"><i class="ti ti-refresh"></i> Reset Filter</button>
          </div>`}
    </div>
  `;
}

// ── Anggaran tab (FUNCTIONAL — Goal CRUD + manual deposit) ──
const GOAL_STATUS_LABELS = {
  active:    { lbl: "Aktif",     bg: "rgba(45,102,36,.12)",  color: "#2d6624" },
  paused:    { lbl: "Pause",     bg: "rgba(245,158,11,.12)", color: "#d97706" },
  completed: { lbl: "Tercapai",  bg: "rgba(34,197,94,.15)",  color: "#16a34a" },
};

const SOURCE_LABELS = {
  laba:        "Laba Bersih",
  pemasukan:   "Total Pemasukan",
  billiard:    "Pemasukan Billiard",
  warkop:      "Pemasukan Warkop",
  nominal:     "Nominal Fixed",
};

function renderAnggaranTab(goals, items) {
  const active   = goals.filter((g) => g.status === "active");
  const paused   = goals.filter((g) => g.status === "paused");
  const done     = goals.filter((g) => g.status === "completed");

  const totalTarget    = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCollected = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

  const renderGoalCard = (g) => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const isDone = g.status === "completed" || pct >= 100;
    const stat = GOAL_STATUS_LABELS[g.status] || GOAL_STATUS_LABELS.active;
    const linkedItem = g.linkedItemId ? items.find((it) => it.id === g.linkedItemId) : null;

    return `
      <div class="plan-goal-card ${isDone ? 'plan-goal-done' : ''}">
        <div class="plan-goal-card-hdr">
          <div class="plan-goal-card-title">
            <span class="plan-goal-emoji">${isDone ? '🏆' : '🎯'}</span>
            <span>${escHtml(g.nama)}</span>
            <span class="plan-tag" style="background:${stat.bg};color:${stat.color}">${stat.lbl}</span>
          </div>
          <div class="plan-goal-card-actions">
            <button type="button" class="plan-btn-icon" title="Edit" onclick="openGoalModal('${escHtml(g.id)}')"><i class="ti ti-edit"></i></button>
            <button type="button" class="plan-btn-icon danger" title="Hapus" onclick="deleteGoal('${escHtml(g.id)}')"><i class="ti ti-trash"></i></button>
          </div>
        </div>
        <div class="plan-goal-card-amounts">
          <div class="plan-goal-current">${rp(g.currentAmount)}</div>
          <div class="plan-goal-target">/ ${rp(g.targetAmount)}</div>
          <div class="plan-goal-pct">${pct}%</div>
        </div>
        <div class="plan-goal-bar"><div class="plan-goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="plan-goal-meta-grid">
          ${g.autoPercent > 0 ? `<div class="plan-goal-meta-item"><i class="ti ti-percentage"></i> Auto ${g.autoPercent}% dari ${SOURCE_LABELS[g.source] || g.source}</div>` : ''}
          ${g.targetDate ? `<div class="plan-goal-meta-item"><i class="ti ti-calendar"></i> Target ${escHtml(g.targetDate)}</div>` : ''}
          ${linkedItem ? `<div class="plan-goal-meta-item"><i class="ti ti-link"></i> ${escHtml(linkedItem.nama)}</div>` : ''}
          ${remaining > 0 && !isDone ? `<div class="plan-goal-meta-item"><i class="ti ti-coin"></i> Sisa ${rp(remaining)}</div>` : ''}
        </div>
        ${isDone ? '' : `
        <div class="plan-goal-card-footer">
          <button type="button" class="plan-goal-deposit-btn" onclick="openDepositModal('${escHtml(g.id)}')">
            <i class="ti ti-cash-banknote"></i> Setor Dana
          </button>
        </div>`}
      </div>
    `;
  };

  if (goals.length === 0) {
    return `
      <div class="plan-tab-content">
        <div class="plan-empty-hero">
          <div class="plan-empty-illust">
            <div class="plan-empty-icon-bg"></div>
            <i class="ti ti-piggy-bank plan-empty-icon"></i>
            <span class="plan-empty-sparkle plan-empty-sparkle-1">🎯</span>
            <span class="plan-empty-sparkle plan-empty-sparkle-2">💰</span>
            <span class="plan-empty-sparkle plan-empty-sparkle-3">🏆</span>
          </div>
          <div class="plan-empty-title">Belum ada goal tabungan</div>
          <div class="plan-empty-sub">Buat goal pertama untuk menabung target ekspansi atau upgrade bisnis.<br>Pasang persentase auto-sisihkan dari laba — biar konsisten!</div>
          <button type="button" class="btn-primary plan-empty-cta" onclick="openGoalModal('')">
            <i class="ti ti-target"></i> Buat Goal Pertama
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="plan-tab-content">
      <!-- Overview card -->
      <div class="plan-goals-overview">
        <div class="plan-goals-ov-stat">
          <span class="plan-goals-ov-lbl">Total Goal</span>
          <b>${goals.length} <small>(${active.length} aktif)</small></b>
        </div>
        <div class="plan-goals-ov-stat">
          <span class="plan-goals-ov-lbl">Sudah Terkumpul</span>
          <b class="in">${rp(totalCollected)}</b>
        </div>
        <div class="plan-goals-ov-stat">
          <span class="plan-goals-ov-lbl">Total Target</span>
          <b>${rp(totalTarget)}</b>
        </div>
        <div class="plan-goals-ov-stat">
          <span class="plan-goals-ov-lbl">Progress Overall</span>
          <b class="net">${overallPct}%</b>
        </div>
      </div>

      <div class="plan-goals-toolbar">
        <h3 class="plan-section-title">🎯 Goal Aktif (${active.length})</h3>
        <button type="button" class="btn-primary plan-toolbar-btn" onclick="openGoalModal('')">
          <i class="ti ti-plus"></i> Buat Goal Baru
        </button>
      </div>

      ${active.length > 0
        ? `<div class="plan-goals-grid">${active.map(renderGoalCard).join('')}</div>`
        : `<div class="plan-empty" style="padding:30px 20px"><i class="ti ti-flag"></i><div class="plan-empty-title" style="font-size:14px">Belum ada goal aktif</div></div>`}

      ${paused.length > 0 ? `
        <h3 class="plan-section-title" style="margin-top:24px">⏸️ Pause (${paused.length})</h3>
        <div class="plan-goals-grid">${paused.map(renderGoalCard).join('')}</div>
      ` : ''}

      ${done.length > 0 ? `
        <h3 class="plan-section-title" style="margin-top:24px">🏆 Tercapai (${done.length})</h3>
        <div class="plan-goals-grid">${done.map(renderGoalCard).join('')}</div>
      ` : ''}
    </div>
  `;
}

// Goal modal HTML — diappend ke body, dipakai utk add/edit
function renderGoalModal(items) {
  const itemOpts = items
    .filter((it) => it.status !== "cancelled" && it.status !== "done")
    .map((it) => `<option value="${escHtml(it.id)}">${escHtml(it.nama)}</option>`)
    .join("");
  return `
    <div class="overlay" id="goalModalOv" onclick="if(event.target===this)closeGoalModal()">
      <div class="over-modal plan-modal">
        <div class="plan-modal-hdr">
          <div>
            <h3 class="plan-modal-title" id="goalModalTitle">Buat Goal Baru</h3>
            <p class="plan-modal-sub">Target tabungan untuk upgrade / ekspansi bisnis</p>
          </div>
          <button type="button" class="plan-modal-close" onclick="closeGoalModal()"><i class="ti ti-x"></i></button>
        </div>
        <form id="goalForm" class="plan-modal-form" onsubmit="submitGoalForm(event)">
          <input type="hidden" id="goalFId" name="id">
          <div class="plan-form-row">
            <label class="plan-form-lbl">Nama Goal <span class="req">*</span></label>
            <input type="text" id="goalFNama" name="nama" class="plan-form-inp" required maxlength="200" placeholder="contoh: Tambah meja billiard ke-4">
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Target Tabungan (Rp) <span class="req">*</span></label>
              <input type="text" inputmode="numeric" id="goalFTarget" name="target_amount" class="plan-form-inp" required placeholder="0" oninput="planFmtNum(this)">
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Auto-Sisihkan (%)</label>
              <input type="number" id="goalFAuto" name="auto_percent" class="plan-form-inp" min="0" max="100" placeholder="0" value="0">
            </div>
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Sumber Dana</label>
              <select id="goalFSource" name="source" class="plan-form-inp">
                <option value="laba">💰 Laba Bersih</option>
                <option value="pemasukan">📈 Total Pemasukan</option>
                <option value="billiard">🎱 Pemasukan Billiard</option>
                <option value="warkop">☕ Pemasukan Warkop</option>
                <option value="nominal">📌 Nominal Fixed</option>
              </select>
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Status</label>
              <select id="goalFStatus" name="status" class="plan-form-inp">
                <option value="active">✅ Aktif</option>
                <option value="paused">⏸️ Pause</option>
                <option value="completed">🏆 Tercapai</option>
              </select>
            </div>
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Target Tanggal <span class="opt">opsional</span></label>
              <input type="date" id="goalFDate" name="target_date" class="plan-form-inp">
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Link ke Wishlist <span class="opt">opsional</span></label>
              <select id="goalFLinked" name="linked_item_id" class="plan-form-inp">
                <option value="">— Tidak link —</option>
                ${itemOpts}
              </select>
            </div>
          </div>
          <div class="plan-form-row">
            <label class="plan-form-lbl">Catatan <span class="opt">opsional</span></label>
            <textarea id="goalFCatatan" name="catatan" class="plan-form-inp" rows="2" maxlength="500"></textarea>
          </div>
          <div class="plan-form-actions">
            <button type="button" class="btn-outline" onclick="closeGoalModal()">Batal</button>
            <button type="submit" class="btn-primary"><i class="ti ti-device-floppy"></i> Simpan Goal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deposit modal -->
    <div class="overlay" id="depositModalOv" onclick="if(event.target===this)closeDepositModal()">
      <div class="over-modal plan-modal" style="max-width:440px">
        <div class="plan-modal-hdr">
          <div>
            <h3 class="plan-modal-title">💰 Setor Dana ke Goal</h3>
            <p class="plan-modal-sub" id="depositGoalName">—</p>
          </div>
          <button type="button" class="plan-modal-close" onclick="closeDepositModal()"><i class="ti ti-x"></i></button>
        </div>
        <form id="depositForm" class="plan-modal-form" onsubmit="submitDepositForm(event)">
          <input type="hidden" id="depositFId" name="id">
          <div class="plan-deposit-info" id="depositInfo">
            <div class="plan-deposit-row"><span>Terkumpul</span><b id="depositCurrent">Rp 0</b></div>
            <div class="plan-deposit-row"><span>Target</span><b id="depositTarget">Rp 0</b></div>
            <div class="plan-deposit-row"><span>Sisa</span><b id="depositRemain" class="out">Rp 0</b></div>
          </div>
          <div class="plan-form-row">
            <label class="plan-form-lbl">Jumlah Setor (Rp) <span class="req">*</span></label>
            <input type="text" inputmode="numeric" id="depositFAmount" name="amount" class="plan-form-inp" required placeholder="0" oninput="planFmtNum(this)">
          </div>
          <div class="plan-deposit-quick">
            <span class="plan-deposit-quick-lbl">Cepat:</span>
            <button type="button" onclick="setDepositAmount(100000)">+Rp 100k</button>
            <button type="button" onclick="setDepositAmount(500000)">+Rp 500k</button>
            <button type="button" onclick="setDepositAmount(1000000)">+Rp 1jt</button>
            <button type="button" onclick="setDepositAmount('sisa')">Lunasi Sisa</button>
          </div>
          <div class="plan-form-actions">
            <button type="button" class="btn-outline" onclick="closeDepositModal()">Batal</button>
            <button type="submit" class="btn-primary"><i class="ti ti-cash-banknote"></i> Setor</button>
          </div>
        </form>
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

// ── Simulasi tab (FUNCTIONAL — interactive ROI calculator) ──
function renderSimulasiTab(items) {
  // Wishlist items dgn estimasi & roi untuk auto-fill
  const itemOpts = items
    .filter((it) => it.estimasi > 0 && it.status !== "cancelled" && it.status !== "done")
    .map((it) => `<option value="${escHtml(it.id)}" data-estimasi="${it.estimasi}" data-roi="${it.roiEstimate || 0}" data-nama="${escHtml(it.nama)}">${escHtml(it.nama)} — ${rp(it.estimasi)}</option>`)
    .join("");

  return `
    <div class="plan-tab-content">
      <div class="plan-sim-wrap">
        <!-- Input panel -->
        <div class="plan-sim-input-card">
          <div class="plan-sim-card-hdr">
            <div class="plan-sim-card-ic"><i class="ti ti-calculator"></i></div>
            <div>
              <h3 class="plan-sim-card-title">🔮 ROI / Break-Even Calculator</h3>
              <p class="plan-sim-card-sub">Input data investasi & lihat 3 skenario hasil otomatis</p>
            </div>
          </div>
          <form class="plan-sim-form" onsubmit="event.preventDefault();calcSimulasi()">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Nama Investasi</label>
              <input type="text" id="simNama" class="plan-form-inp" placeholder="contoh: Tambah meja billiard ke-4">
            </div>
            ${itemOpts ? `
            <div class="plan-form-row">
              <label class="plan-form-lbl">Auto-fill dari Wishlist <span class="opt">opsional</span></label>
              <select id="simFromItem" class="plan-form-inp" onchange="autoFillFromItem()">
                <option value="">— Pilih item utk auto-fill —</option>
                ${itemOpts}
              </select>
            </div>
            ` : ''}
            <div class="plan-form-grid">
              <div class="plan-form-row">
                <label class="plan-form-lbl">Modal Awal (Rp) <span class="req">*</span></label>
                <input type="text" inputmode="numeric" id="simModal" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this);calcSimulasi()">
              </div>
              <div class="plan-form-row">
                <label class="plan-form-lbl">Pendapatan / Bulan (Rp) <span class="req">*</span></label>
                <input type="text" inputmode="numeric" id="simRevenue" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this);calcSimulasi()">
              </div>
            </div>
            <div class="plan-form-grid">
              <div class="plan-form-row">
                <label class="plan-form-lbl">Biaya Rutin / Bulan (Rp)</label>
                <input type="text" inputmode="numeric" id="simCost" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this);calcSimulasi()">
              </div>
              <div class="plan-form-row">
                <label class="plan-form-lbl">Pajak / Fee (%) <span class="opt">opsional</span></label>
                <input type="number" id="simTax" class="plan-form-inp" min="0" max="100" placeholder="0" value="0" oninput="calcSimulasi()">
              </div>
            </div>
            <button type="button" class="plan-sim-reset" onclick="resetSimulasi()"><i class="ti ti-refresh"></i> Reset</button>
          </form>
        </div>

        <!-- Result panel -->
        <div class="plan-sim-result-card" id="simResultCard">
          <div class="plan-sim-empty">
            <i class="ti ti-chart-arcs"></i>
            <div class="plan-sim-empty-title">Hasil simulasi muncul di sini</div>
            <div class="plan-sim-empty-sub">Isi <b>Modal Awal</b> &amp; <b>Pendapatan/Bulan</b> minimal untuk lihat hasil.</div>
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
            <label class="plan-form-lbl">Sudah Terkumpul (Rp) <span class="opt">tabungan saat ini</span></label>
            <input type="text" inputmode="numeric" id="planFSaved" name="saved_amount" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this)">
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
export function planningPage({ items = [], goals = [], token = "", role = "owner", displayName = "" } = {}) {
  const isOwner = role === "owner";
  const itemsJson = JSON.stringify(items).replace(/</g, "\\u003c");
  const goalsJson = JSON.stringify(goals).replace(/</g, "\\u003c");

  return docHeadV4("Planning & Roadmap")
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=59\">"
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
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"anggaran\" onclick=\"switchPlanTab('anggaran')\"><i class=\"ti ti-piggy-bank\"></i> Anggaran" + (goals.length > 0 ? " <span class=\"plan-tab-count\">" + goals.length + "</span>" : "") + "</button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"timeline\" onclick=\"switchPlanTab('timeline')\"><i class=\"ti ti-timeline-event\"></i> Timeline" + (items.filter((it) => it.targetDate && it.status !== "cancelled").length > 0 ? " <span class=\"plan-tab-count\">" + items.filter((it) => it.targetDate && it.status !== "cancelled").length + "</span>" : "") + "</button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"simulasi\" onclick=\"switchPlanTab('simulasi')\"><i class=\"ti ti-calculator\"></i> Simulasi</button>"
    + "</div>"

    // Tab contents
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"wishlist\">" + renderWishlistTab(items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"anggaran\" style=\"display:none\">" + renderAnggaranTab(goals, items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"timeline\" style=\"display:none\">" + renderTimelineTab(items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"simulasi\" style=\"display:none\">" + renderSimulasiTab(items) + "</div>"

    + "</div>" // .page
    + "</div>" // .main-wrap
    + "</div>" // .layout

    // Modals
    + renderItemModal()
    + renderGoalModal(items)

    + "<script>"
    + "const PLAN_ITEMS=" + itemsJson + ";"
    + "const PLAN_GOALS=" + goalsJson + ";"
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
    +       "document.getElementById('planFSaved').value=it.savedAmount?_planRpFmt(it.savedAmount):'';"
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
    +     "saved_amount:(fd.get('saved_amount')||'').replace(/\\./g,''),"
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

    // ── Quick actions: Tandai Selesai / Duplikat / Kirim ke Anggaran ──
    + "function _planPostItem(url,it){"
    +   "var data={id:it.id||'',nama:it.nama||'',kategori:it.kategori||'lain',"
    +     "estimasi:String(it.estimasi||0),prioritas:it.prioritas||'nice',"
    +     "status:it.status||'idea',target_date:it.targetDate||'',"
    +     "roi_estimate:String(it.roiEstimate||0),saved_amount:String(it.savedAmount||0),"
    +     "vendor:it.vendor||'',catatan:it.catatan||''};"
    +   "return fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)});"
    + "}"
    + "function markPlanDone(id){"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "if(!confirm('Tandai item ini selesai (status: Done)?'))return;"
    +   "var copy=Object.assign({},it,{status:'done'});"
    +   "_planPostItem('/operasional/planning/edit',copy)"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal update status');});"
    + "}"
    + "function duplicatePlanItem(id){"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "var copy=Object.assign({},it,{id:'',nama:(it.nama||'')+' (copy)',status:'idea',savedAmount:0});"
    +   "_planPostItem('/operasional/planning/add',copy)"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal duplikat');});"
    + "}"
    + "function sendToAnggaran(id){"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "switchPlanTab('anggaran');"
    +   "openGoalModal('');"
    +   "setTimeout(function(){"
    +     "document.getElementById('goalFNama').value='Tabungan: '+(it.nama||'');"
    +     "if(it.estimasi>0)document.getElementById('goalFTarget').value=_planRpFmt(it.estimasi);"
    +     "if(it.targetDate)document.getElementById('goalFDate').value=it.targetDate;"
    +     "var linkedSel=document.getElementById('goalFLinked');"
    +     "if(linkedSel){var hasOpt=false;for(var i=0;i<linkedSel.options.length;i++){if(linkedSel.options[i].value===it.id){hasOpt=true;break;}}"
    +       "if(hasOpt)linkedSel.value=it.id;}"
    +   "},200);"
    + "}"

    // ── Filter & Sort (client-side, re-render wishlist groups) ─────
    + "function _planRpEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}"
    + "var _PLAN_KAT={billiard:{lbl:'🎱 Billiard',bg:'rgba(45,102,36,.12)',color:'#2d6624'},warkop:{lbl:'☕ Warkop',bg:'rgba(245,158,11,.12)',color:'#d97706'},renovasi:{lbl:'🔨 Renovasi',bg:'rgba(168,85,247,.12)',color:'#a855f7'},sdm:{lbl:'👥 SDM',bg:'rgba(59,130,246,.12)',color:'#2563eb'},marketing:{lbl:'📢 Marketing',bg:'rgba(236,72,153,.12)',color:'#db2777'},ekspansi:{lbl:'🚀 Ekspansi',bg:'rgba(239,68,68,.12)',color:'#dc2626'},lain:{lbl:'📦 Lain-lain',bg:'rgba(122,140,120,.12)',color:'#7a8c78'}};"
    + "var _PLAN_PRIO={urgent:{lbl:'🔴 Urgent',bg:'rgba(239,68,68,.12)',color:'#dc2626'},penting:{lbl:'🟡 Penting',bg:'rgba(245,158,11,.12)',color:'#d97706'},nice:{lbl:'🟢 Nice to have',bg:'rgba(34,197,94,.12)',color:'#16a34a'},idea:{lbl:'💡 Ide',bg:'rgba(122,140,120,.12)',color:'#7a8c78'}};"
    + "var _PLAN_STAT={idea:{lbl:'💡 Idea',bg:'rgba(122,140,120,.12)',color:'#7a8c78'},plan:{lbl:'📋 Plan',bg:'rgba(59,130,246,.12)',color:'#2563eb'},ongoing:{lbl:'🚧 On-going',bg:'rgba(245,158,11,.12)',color:'#d97706'},done:{lbl:'✅ Done',bg:'rgba(34,197,94,.12)',color:'#16a34a'},cancelled:{lbl:'❌ Cancelled',bg:'rgba(239,68,68,.12)',color:'#dc2626'}};"
    + "function _planTagHtml(map,key){var m=map[key]||map.lain||map.idea;return '<span class=\"plan-tag\" style=\"background:'+m.bg+';color:'+m.color+'\">'+m.lbl+'</span>';}"
    + "function _planRpStr(n){var a=Math.abs(Math.round(Number(n)||0));return 'Rp '+_planRpFmt(a);}"
    + "function _planCalcBep(est,roi){var e=+est||0,r=+roi||0;if(e<=0||r<=0)return 0;return e/r;}"
    + "function _planFmtDur(b){if(!b||b<=0)return '';if(b<12)return Math.round(b)+' bulan';var t=(b/12).toFixed(1).replace(/\\.0$/,'');return t+' tahun';}"
    + "function _planCalcWarn(d,s,e){if(!d||!e||e<=0)return null;var t=new Date(d);if(isNaN(t))return null;var n=new Date();n.setHours(0,0,0,0);var dl=Math.floor((t-n)/86400000);if(dl<0)return null;var p=Math.min(100,(s/e)*100);if(dl<=30&&p<80)return{lvl:'danger',lbl:'Terlambat',icon:'ti-alert-triangle',daysLeft:dl};if(dl<=60&&p<50)return{lvl:'warn',lbl:'Perlu dikejar',icon:'ti-clock-exclamation',daysLeft:dl};return null;}"
    + "function _planRenderRow(it){"
    +   "var kat=_PLAN_KAT[it.kategori]||_PLAN_KAT.lain;"
    +   "var bep=_planCalcBep(it.estimasi,it.roiEstimate);"
    +   "var bepLbl=_planFmtDur(bep);"
    +   "var saved=+it.savedAmount||0;var est=+it.estimasi||0;"
    +   "var pct=est>0?Math.min(100,Math.round((saved/est)*100)):0;"
    +   "var rem=Math.max(0,est-saved);"
    +   "var w=_planCalcWarn(it.targetDate,saved,est);"
    +   "var done=it.status==='done';"
    +   "var idEsc=_planRpEsc(it.id);"
    +   "var h='<div class=\"plan-row'+(done?' plan-row-done':'')+'\" data-id=\"'+idEsc+'\">';"
    +   "h+='<div class=\"plan-row-thumb\" style=\"background:'+kat.bg+';color:'+kat.color+'\"><span class=\"plan-row-thumb-emoji\">'+kat.lbl.split(' ')[0]+'</span></div>';"
    +   "h+='<div class=\"plan-row-main\"><div class=\"plan-row-title\">'+_planRpEsc(it.nama)+'</div><div class=\"plan-row-meta\">';"
    +   "h+=_planTagHtml(_PLAN_KAT,it.kategori)+_planTagHtml(_PLAN_STAT,it.status);"
    +   "if(it.targetDate)h+='<span class=\"plan-meta-item\"><i class=\"ti ti-calendar\"></i> '+_planRpEsc(it.targetDate)+'</span>';"
    +   "if(it.vendor)h+='<span class=\"plan-meta-item\"><i class=\"ti ti-building-store\"></i> '+_planRpEsc(it.vendor)+'</span>';"
    +   "if(bepLbl)h+='<span class=\"plan-meta-item plan-meta-bep\" title=\"Estimasi balik modal\"><i class=\"ti ti-trending-up\"></i> Balik modal: '+bepLbl+'</span>';"
    +   "if(w)h+='<span class=\"plan-meta-item plan-warn-'+w.lvl+'\" title=\"H-'+w.daysLeft+' & progress '+pct+'%\"><i class=\"ti '+w.icon+'\"></i> '+w.lbl+'</span>';"
    +   "h+='</div>';"
    +   "if(est>0){var pcls=pct>=100?'done':(pct>=50?'mid':'low');h+='<div class=\"plan-row-progress\" title=\"Terkumpul '+_planRpStr(saved)+' dari '+_planRpStr(est)+'\"><div class=\"plan-row-prog-bar\"><div class=\"plan-row-prog-fill plan-prog-'+pcls+'\" style=\"width:'+pct+'%\"></div></div><div class=\"plan-row-prog-txt\">'+_planRpStr(saved)+' <span class=\"plan-row-prog-sep\">/</span> '+_planRpStr(est)+' <b>('+pct+'%)</b>'+(rem>0?' <span class=\"plan-row-prog-rem\">· sisa '+_planRpStr(rem)+'</span>':'')+'</div></div>';}"
    +   "if(it.catatan)h+='<div class=\"plan-row-catatan\">'+_planRpEsc(it.catatan)+'</div>';"
    +   "h+='</div><div class=\"plan-row-side\"><div class=\"plan-row-estimasi\">'+_planRpStr(it.estimasi)+'</div>';"
    +   "if(it.roiEstimate>0)h+='<div class=\"plan-row-roi\">+ROI '+_planRpStr(it.roiEstimate)+'/bln</div>';"
    +   "h+='<div class=\"plan-row-actions\">';"
    +   "if(!done)h+='<button type=\"button\" class=\"plan-btn-icon plan-btn-done\" title=\"Tandai Selesai\" onclick=\"markPlanDone(\\''+idEsc+'\\')\"><i class=\"ti ti-check\"></i></button>';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon\" title=\"Kirim ke Anggaran\" onclick=\"sendToAnggaran(\\''+idEsc+'\\')\"><i class=\"ti ti-piggy-bank\"></i></button>';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon\" title=\"Duplikat\" onclick=\"duplicatePlanItem(\\''+idEsc+'\\')\"><i class=\"ti ti-copy\"></i></button>';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon\" title=\"Edit\" onclick=\"openPlanModal(\\''+idEsc+'\\')\"><i class=\"ti ti-edit\"></i></button>';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon danger\" title=\"Hapus\" onclick=\"deletePlanItem(\\''+idEsc+'\\')\"><i class=\"ti ti-trash\"></i></button>';"
    +   "h+='</div></div></div>';"
    +   "return h;"
    + "}"
    + "function _planRenderGroup(key,rows){if(!rows.length)return '';return '<div class=\"plan-group\"><div class=\"plan-group-hdr\">'+_planTagHtml(_PLAN_PRIO,key)+'<span class=\"plan-group-count\">'+rows.length+' item</span></div><div class=\"plan-group-body\">'+rows.map(_planRenderRow).join('')+'</div></div>';}"
    + "function applyPlanFilter(){"
    +   "var fs=document.getElementById('planFilterStatus');if(!fs)return;"
    +   "var st=fs.value,pr=document.getElementById('planFilterPrio').value,kt=document.getElementById('planFilterKat').value,so=document.getElementById('planFilterSort').value;"
    +   "var arr=PLAN_ITEMS.slice();"
    +   "if(st)arr=arr.filter(function(x){return(x.status||'idea')===st;});"
    +   "if(pr)arr=arr.filter(function(x){return(x.prioritas||'nice')===pr;});"
    +   "if(kt)arr=arr.filter(function(x){return(x.kategori||'lain')===kt;});"
    +   "var res=document.getElementById('planWishlistResults');var emp=document.getElementById('planWishlistEmpty');"
    +   "if(!res)return;"
    +   "if(arr.length===0){res.innerHTML='';if(emp)emp.style.display='';return;}"
    +   "if(emp)emp.style.display='none';"
    +   "if(so==='default'){"
    +     "var prioOrder={urgent:1,penting:2,nice:3,idea:4};"
    +     "var grp={urgent:[],penting:[],nice:[],idea:[]};"
    +     "arr.forEach(function(x){var k=x.prioritas||'nice';if(grp[k])grp[k].push(x);else grp.nice.push(x);});"
    +     "res.innerHTML=_planRenderGroup('urgent',grp.urgent)+_planRenderGroup('penting',grp.penting)+_planRenderGroup('nice',grp.nice)+_planRenderGroup('idea',grp.idea);"
    +   "}else{"
    +     "var sortFn={"
    +       "roi_desc:function(a,b){return(+b.roiEstimate||0)-(+a.roiEstimate||0);},"
    +       "bep_asc:function(a,b){var pa=_planCalcBep(a.estimasi,a.roiEstimate),pb=_planCalcBep(b.estimasi,b.roiEstimate);if(pa===0)return 1;if(pb===0)return-1;return pa-pb;},"
    +       "target_asc:function(a,b){if(!a.targetDate)return 1;if(!b.targetDate)return-1;return a.targetDate.localeCompare(b.targetDate);},"
    +       "cost_asc:function(a,b){return(+a.estimasi||0)-(+b.estimasi||0);},"
    +       "cost_desc:function(a,b){return(+b.estimasi||0)-(+a.estimasi||0);}"
    +     "}[so];"
    +     "if(sortFn)arr.sort(sortFn);"
    +     "var sortLbl={roi_desc:'ROI Tertinggi',bep_asc:'Balik Modal Tercepat',target_asc:'Target Terdekat',cost_asc:'Termurah',cost_desc:'Termahal'}[so]||so;"
    +     "res.innerHTML='<div class=\"plan-group\"><div class=\"plan-group-hdr\"><span class=\"plan-tag\" style=\"background:rgba(45,102,36,.12);color:#2d6624\"><i class=\"ti ti-arrows-sort\"></i> '+sortLbl+'</span><span class=\"plan-group-count\">'+arr.length+' item</span></div><div class=\"plan-group-body\">'+arr.map(_planRenderRow).join('')+'</div></div>';"
    +   "}"
    + "}"
    + "function resetPlanFilter(){"
    +   "['planFilterStatus','planFilterPrio','planFilterKat'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});"
    +   "var so=document.getElementById('planFilterSort');if(so)so.value='default';"
    +   "applyPlanFilter();"
    + "}"

    // ── Goal modal: add / edit ────────────────────────────
    + "function openGoalModal(id){"
    +   "var ov=document.getElementById('goalModalOv');"
    +   "document.getElementById('goalForm').reset();"
    +   "document.getElementById('goalFId').value='';"
    +   "document.getElementById('goalModalTitle').textContent='Buat Goal Baru';"
    +   "document.getElementById('goalFAuto').value='0';"
    +   "if(id){"
    +     "var g=PLAN_GOALS.find(function(x){return x.id===id;});"
    +     "if(g){"
    +       "document.getElementById('goalModalTitle').textContent='Edit Goal';"
    +       "document.getElementById('goalFId').value=g.id;"
    +       "document.getElementById('goalFNama').value=g.nama||'';"
    +       "document.getElementById('goalFTarget').value=g.targetAmount?_planRpFmt(g.targetAmount):'';"
    +       "document.getElementById('goalFAuto').value=g.autoPercent||0;"
    +       "document.getElementById('goalFSource').value=g.source||'laba';"
    +       "document.getElementById('goalFStatus').value=g.status||'active';"
    +       "document.getElementById('goalFDate').value=g.targetDate||'';"
    +       "document.getElementById('goalFLinked').value=g.linkedItemId||'';"
    +       "document.getElementById('goalFCatatan').value=g.catatan||'';"
    +     "}"
    +   "}"
    +   "ov.classList.add('open');"
    +   "setTimeout(function(){document.getElementById('goalFNama').focus();},150);"
    + "}"
    + "function closeGoalModal(){document.getElementById('goalModalOv').classList.remove('open');}"
    + "function submitGoalForm(e){"
    +   "e.preventDefault();"
    +   "var fd=new FormData(document.getElementById('goalForm'));"
    +   "var data={id:fd.get('id'),nama:fd.get('nama'),"
    +     "target_amount:(fd.get('target_amount')||'').replace(/\\./g,''),"
    +     "auto_percent:fd.get('auto_percent'),source:fd.get('source'),"
    +     "status:fd.get('status'),target_date:fd.get('target_date'),"
    +     "linked_item_id:fd.get('linked_item_id'),catatan:fd.get('catatan')};"
    +   "var url=data.id?'/operasional/planning/goal/edit':'/operasional/planning/goal/add';"
    +   "fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)})"
    +     ".then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d};});})"
    +     ".then(function(res){if(res.ok)location.reload();else alert('Gagal: '+(res.data.error||'unknown'));});"
    + "}"
    + "function deleteGoal(id){"
    +   "if(!confirm('Hapus goal ini permanen?'))return;"
    +   "fetch('/operasional/planning/goal/delete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(id)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal hapus');});"
    + "}"

    // ── Deposit modal ────────────────────────────────────
    + "var _currentDepositGoal=null;"
    + "function openDepositModal(id){"
    +   "var g=PLAN_GOALS.find(function(x){return x.id===id;});if(!g)return;"
    +   "_currentDepositGoal=g;"
    +   "document.getElementById('depositFId').value=g.id;"
    +   "document.getElementById('depositFAmount').value='';"
    +   "document.getElementById('depositGoalName').textContent='Goal: '+g.nama;"
    +   "document.getElementById('depositCurrent').textContent=_rpDisp(g.currentAmount);"
    +   "document.getElementById('depositTarget').textContent=_rpDisp(g.targetAmount);"
    +   "document.getElementById('depositRemain').textContent=_rpDisp(Math.max(0,g.targetAmount-g.currentAmount));"
    +   "document.getElementById('depositModalOv').classList.add('open');"
    +   "setTimeout(function(){document.getElementById('depositFAmount').focus();},150);"
    + "}"
    + "function closeDepositModal(){document.getElementById('depositModalOv').classList.remove('open');_currentDepositGoal=null;}"
    + "function _rpDisp(n){return 'Rp '+_planRpFmt(n||0);}"
    + "function setDepositAmount(v){"
    +   "var inp=document.getElementById('depositFAmount');"
    +   "if(v==='sisa'&&_currentDepositGoal){"
    +     "var rem=Math.max(0,_currentDepositGoal.targetAmount-_currentDepositGoal.currentAmount);"
    +     "inp.value=rem?_planRpFmt(rem):'';"
    +   "}else{inp.value=_planRpFmt(v);}"
    + "}"
    + "function submitDepositForm(e){"
    +   "e.preventDefault();"
    +   "var id=document.getElementById('depositFId').value;"
    +   "var amount=(document.getElementById('depositFAmount').value||'').replace(/\\./g,'');"
    +   "if(!amount||parseInt(amount)<=0){alert('Jumlah setor harus > 0');return;}"
    +   "fetch('/operasional/planning/goal/deposit',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id:id,amount:amount})})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal setor');});"
    + "}"

    // ── Simulasi ROI calculator ───────────────────────────
    + "function autoFillFromItem(){"
    +   "var sel=document.getElementById('simFromItem');var opt=sel.options[sel.selectedIndex];"
    +   "if(!opt||!opt.value)return;"
    +   "document.getElementById('simNama').value=opt.dataset.nama||'';"
    +   "document.getElementById('simModal').value=opt.dataset.estimasi>0?_planRpFmt(opt.dataset.estimasi):'';"
    +   "document.getElementById('simRevenue').value=opt.dataset.roi>0?_planRpFmt(opt.dataset.roi):'';"
    +   "calcSimulasi();"
    + "}"
    + "function resetSimulasi(){"
    +   "['simNama','simModal','simRevenue','simCost'].forEach(function(id){document.getElementById(id).value='';});"
    +   "document.getElementById('simTax').value='0';"
    +   "var s=document.getElementById('simFromItem');if(s)s.value='';"
    +   "calcSimulasi();"
    + "}"
    + "function calcSimulasi(){"
    +   "var modal=parseInt((document.getElementById('simModal').value||'').replace(/\\./g,''))||0;"
    +   "var revenue=parseInt((document.getElementById('simRevenue').value||'').replace(/\\./g,''))||0;"
    +   "var cost=parseInt((document.getElementById('simCost').value||'').replace(/\\./g,''))||0;"
    +   "var tax=parseFloat(document.getElementById('simTax').value)||0;"
    +   "var resCard=document.getElementById('simResultCard');"
    +   "if(modal<=0||revenue<=0){"
    +     "resCard.innerHTML='<div class=\"plan-sim-empty\"><i class=\"ti ti-chart-arcs\"></i><div class=\"plan-sim-empty-title\">Hasil simulasi muncul di sini</div><div class=\"plan-sim-empty-sub\">Isi <b>Modal Awal</b> &amp; <b>Pendapatan/Bulan</b> minimal untuk lihat hasil.</div></div>';"
    +     "return;"
    +   "}"
    +   "var scenarios=[{key:'best',label:'🟢 Best Case',sub:'120% dari estimasi',mult:1.2,colorCls:'good'},"
    +     "{key:'normal',label:'🟡 Normal',sub:'Sesuai estimasi',mult:1.0,colorCls:'mid'},"
    +     "{key:'worst',label:'🔴 Worst Case',sub:'50% dari estimasi',mult:0.5,colorCls:'bad'}];"
    +   "var html='<div class=\"plan-sim-result-hdr\"><h3>📊 Hasil Simulasi</h3>"
    +     "<div class=\"plan-sim-result-sub\">Modal '+_rpDisp(modal)+' &middot; Net/bln estimasi '+_rpDisp((revenue-cost)-((revenue-cost)*tax/100))+'</div></div>';"
    +   "html+='<div class=\"plan-sim-cards\">';"
    +   "var normalBep=0,normalRoi=0;"
    +   "scenarios.forEach(function(s){"
    +     "var rev=Math.round(revenue*s.mult);"
    +     "var grossNet=rev-cost;"
    +     "var taxAmt=grossNet>0?Math.round(grossNet*tax/100):0;"
    +     "var net=grossNet-taxAmt;"
    +     "var bep=net>0?(modal/net):0;"
    +     "var bepStr=net>0?(bep<12?bep.toFixed(1)+' bln':(bep/12).toFixed(1)+' thn'):'~';"
    +     "var roi=net>0?((net*12-modal)/modal*100):(net*12-modal)/modal*100;"
    +     "var roiStr=isFinite(roi)?roi.toFixed(0)+'%':'~';"
    +     "if(s.key==='normal'){normalBep=bep;normalRoi=roi;}"
    +     "html+='<div class=\"plan-sim-scen-card '+s.colorCls+'\">"
    +       "<div class=\"plan-sim-scen-hdr\">'+s.label+'<small>'+s.sub+'</small></div>"
    +       "<div class=\"plan-sim-scen-row\"><span>Pendapatan</span><b>'+_rpDisp(rev)+'</b></div>"
    +       "<div class=\"plan-sim-scen-row\"><span>Net/bln</span><b class=\"'+(net>=0?'in':'out')+'\">'+_rpDisp(net)+'</b></div>"
    +       "<div class=\"plan-sim-scen-divider\"></div>"
    +       "<div class=\"plan-sim-scen-big\"><span>Break-Even</span><b>'+bepStr+'</b></div>"
    +       "<div class=\"plan-sim-scen-big\"><span>ROI Tahun 1</span><b class=\"'+(roi>=0?'in':'out')+'\">'+roiStr+'</b></div>"
    +     "</div>';"
    +   "});"
    +   "html+='</div>';"
    +   "var rec='';var recCls='neutral';"
    +   "if(normalBep===0){rec='⚠️ Rugi — Pendapatan ga cukup nutupin biaya rutin. Reconsider.';recCls='bad';}"
    +   "else if(normalBep<=6&&normalRoi>=100){rec='✅ Sangat Layak — BEP cepat ('+normalBep.toFixed(1)+' bln) dan ROI tahun 1 tinggi ('+normalRoi.toFixed(0)+'%). Rekomendasi: <b>EKSEKUSI</b>.';recCls='good';}"
    +   "else if(normalBep<=12){rec='👍 Layak — BEP '+normalBep.toFixed(1)+' bln, ROI tahun 1 '+normalRoi.toFixed(0)+'%. Perhitungkan worst case sebelum eksekusi.';recCls='mid';}"
    +   "else{rec='⚠️ Hati-hati — BEP lama ('+normalBep.toFixed(1)+' bln). Cari opportunity dgn ROI lebih cepat atau review modal.';recCls='bad';}"
    +   "html+='<div class=\"plan-sim-rec plan-sim-rec-'+recCls+'\">💡 <b>Rekomendasi:</b> '+rec+'</div>';"
    +   "resCard.innerHTML=html;"
    + "}"

    + "</script>"

    + "</body></html>";
}
