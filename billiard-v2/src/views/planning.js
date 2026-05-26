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

// Skor prioritas otomatis: (ROI/biaya) × bobot prioritas × urgency.
// Item dgn skor tertinggi dapet badge 🏆.
const PRIORITAS_WEIGHT = { urgent: 4, penting: 3, nice: 2, idea: 1 };
const calcUrgencyFactor = (targetDate) => {
  if (!targetDate) return 1.0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(targetDate); if (isNaN(t)) return 1.0;
  const days = Math.floor((t - today) / (86400000));
  if (days < 0) return 0.8;
  if (days < 30)  return 2.0;
  if (days < 90)  return 1.5;
  if (days < 180) return 1.2;
  return 1.0;
};
const calcSkor = (it) => {
  if (!it || it.status === "done" || it.status === "cancelled") return 0;
  const est = Number(it.estimasi) || 0;
  const roi = Number(it.roiEstimate) || 0;
  if (est <= 0 || roi <= 0) return 0;
  const roiRatio = (roi / est) * 100; // ROI/biaya × 100 supaya angkanya lebih dapet di-grade
  const w = PRIORITAS_WEIGHT[it.prioritas || "nice"] || 2;
  const u = calcUrgencyFactor(it.targetDate);
  return Math.round(roiRatio * w * u * 10) / 10;
};
// Cari item dgn skor tertinggi (yg dapet 🏆)
const findTopSkor = (items) => {
  let topId = null; let topVal = 0;
  for (const it of items) {
    const s = calcSkor(it);
    if (s > topVal) { topVal = s; topId = it.id; }
  }
  return topVal > 0 ? topId : null;
};

// Dampak cashflow: bulan eksekusi -biaya, mulai bulan berikutnya +ROI/bln.
// Return null kalau tdk lengkap.
const calcCashflowImpact = (it) => {
  const est = Number(it.estimasi) || 0;
  const roi = Number(it.roiEstimate) || 0;
  if (!it.targetDate || est <= 0) return null;
  const t = new Date(it.targetDate); if (isNaN(t)) return null;
  const bulanLbl = t.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const tNext = new Date(t.getFullYear(), t.getMonth() + 1, 1);
  const nextLbl = tNext.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return { execBulan: bulanLbl, outflow: est, nextBulan: nextLbl, monthlyROI: roi };
};

function renderWishlistTab(items) {
  const groups = groupByPrioritas(items);
  const countByStatus = items.reduce((acc, it) => {
    acc[it.status || "idea"] = (acc[it.status || "idea"] || 0) + 1;
    return acc;
  }, {});
  const topSkorId = findTopSkor(items);

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
    const skor = calcSkor(it);
    const isTopSkor = it.id === topSkorId;
    const attachments = Array.isArray(it.attachments) ? it.attachments.slice(0, 4) : [];
    const moreAtt = (Array.isArray(it.attachments) ? it.attachments.length : 0) - attachments.length;
    const cashflow = calcCashflowImpact(it);
    // Pakai foto pertama sebagai thumbnail kalau ada — kalau gak, fallback emoji kategori
    const firstImg = attachments.find((u) => /\.(jpe?g|png|webp|gif)$/i.test(u));
    return `
    <div class="plan-row${isDone ? ' plan-row-done' : ''}${isTopSkor ? ' plan-row-top' : ''}" data-id="${escHtml(it.id)}">
      <div class="plan-row-thumb" style="background:${kat.bg};color:${kat.color}">
        ${firstImg
          ? `<img src="${escHtml(firstImg)}" alt="" class="plan-row-thumb-img" loading="lazy">`
          : `<span class="plan-row-thumb-emoji">${kat.lbl.split(' ')[0]}</span>`}
      </div>
      <div class="plan-row-main">
        <div class="plan-row-title">${isTopSkor ? '<span class="plan-trophy" title="Rekomendasi #1 dieksekusi duluan (skor tertinggi)">🏆</span> ' : ''}${escHtml(it.nama)}${skor > 0 ? ` <span class="plan-skor-badge" title="Skor prioritas otomatis">Skor ${skor}</span>` : ''}</div>
        ${isTopSkor ? `<div class="plan-top-banner"><i class="ti ti-award"></i> Rekomendasi #1 dieksekusi duluan</div>` : ''}
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
        ${cashflow ? `<div class="plan-row-cashflow"><i class="ti ti-cash-banknote"></i> <b>Dampak cashflow:</b> ${cashflow.execBulan} <span class="plan-cf-out">−${rp(cashflow.outflow)}</span>${cashflow.monthlyROI > 0 ? `, mulai ${cashflow.nextBulan} <span class="plan-cf-in">+${rp(cashflow.monthlyROI)}/bln</span>` : ''}</div>` : ''}
        ${attachments.length > 0 ? `<div class="plan-row-attachments">${attachments.map((u) => {
          const isPdf = /\.pdf$/i.test(u);
          return isPdf
            ? `<a href="${escHtml(u)}" target="_blank" rel="noopener" class="plan-att plan-att-pdf" title="Lihat PDF"><i class="ti ti-file-text"></i> PDF</a>`
            : `<a href="${escHtml(u)}" target="_blank" rel="noopener" class="plan-att plan-att-img"><img src="${escHtml(u)}" alt="" loading="lazy"></a>`;
        }).join('')}${moreAtt > 0 ? `<span class="plan-att plan-att-more">+${moreAtt}</span>` : ''}</div>` : ''}
        ${it.catatan ? `<div class="plan-row-catatan">${escHtml(it.catatan)}</div>` : ''}
      </div>
      <div class="plan-row-side">
        <div class="plan-row-estimasi">${rp(it.estimasi)}</div>
        ${it.roiEstimate > 0 ? `<div class="plan-row-roi">+ROI ${rp(it.roiEstimate)}/bln</div>` : ''}
        <div class="plan-row-actions">
          <button type="button" class="plan-btn-icon" title="Edit (aksi lain di dalam detail)" onclick="openPlanModal('${escHtml(it.id)}')"><i class="ti ti-edit"></i></button>
          <button type="button" class="plan-btn-icon danger" title="Hapus" onclick="deletePlanItem('${escHtml(it.id)}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
  `;
  };

  // Comparison table renderer (mode bandingkan)
  const renderCompareTable = (rows) => {
    const sorted = rows.slice().sort((a, b) => calcSkor(b) - calcSkor(a));
    const head = `<thead><tr>
        <th>#</th>
        <th>Nama</th>
        <th>Kategori</th>
        <th class="num">Biaya</th>
        <th class="num">ROI/bln</th>
        <th class="num">Balik Modal</th>
        <th>Prioritas</th>
        <th class="num">Skor</th>
        <th>Status</th>
      </tr></thead>`;
    const body = sorted.map((it, i) => {
      const bep = fmtDurasi(calcBalikModal(it.estimasi, it.roiEstimate)) || '—';
      const skor = calcSkor(it);
      const isTop = it.id === topSkorId;
      return `<tr class="${isTop ? 'plan-cmp-top' : ''}" onclick="openPlanModal('${escHtml(it.id)}')" style="cursor:pointer">
        <td><b>${i + 1}</b></td>
        <td>${isTop ? '🏆 ' : ''}${escHtml(it.nama)}</td>
        <td>${renderTag(KATEGORI_LABELS, it.kategori)}</td>
        <td class="num">${rp(it.estimasi)}</td>
        <td class="num">${it.roiEstimate > 0 ? rp(it.roiEstimate) : '—'}</td>
        <td class="num">${bep}</td>
        <td>${renderTag(PRIORITAS_LABELS, it.prioritas)}</td>
        <td class="num"><b>${skor > 0 ? skor : '—'}</b></td>
        <td>${renderTag(STATUS_LABELS, it.status)}</td>
      </tr>`;
    }).join('');
    return `<div class="plan-cmp-wrap"><table class="plan-cmp-table">${head}<tbody>${body}</tbody></table></div>`;
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

      <!-- View mode toggle: List vs Bandingkan -->
      <div class="plan-view-toggle-wrap">
        <div class="plan-view-toggle" role="tablist">
          <button type="button" class="plan-view-btn active" data-view="list" onclick="switchPlanView('list')"><i class="ti ti-list"></i> List</button>
          <button type="button" class="plan-view-btn" data-view="compare" onclick="switchPlanView('compare')"><i class="ti ti-table"></i> Bandingkan</button>
        </div>
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
          <div id="planWishlistCompare" style="display:none">${renderCompareTable(items)}</div>
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

          <!-- Aksi Cepat — visible saat editing item existing -->
          <div id="planQuickActions" class="plan-quick-actions" style="display:none">
            <div class="plan-quick-actions-lbl"><i class="ti ti-bolt"></i> Aksi Cepat</div>
            <div class="plan-quick-actions-row">
              <button type="button" class="plan-quick-btn" onclick="sendToAnggaranFromModal()"><i class="ti ti-piggy-bank"></i> Kirim ke Anggaran</button>
              <button type="button" class="plan-quick-btn" onclick="duplicatePlanItemFromModal()"><i class="ti ti-copy"></i> Duplikat</button>
            </div>
          </div>

          <!-- TIPE selector — gating conditional fields (ROI, Vendor, dll) -->
          <div class="plan-form-row">
            <label class="plan-form-lbl">Tipe Item</label>
            <div class="plan-tipe-seg" role="radiogroup">
              <label class="plan-tipe-opt"><input type="radio" name="tipe" value="investasi" checked><span><i class="ti ti-trending-up"></i> Investasi</span></label>
              <label class="plan-tipe-opt"><input type="radio" name="tipe" value="hutang"><span><i class="ti ti-credit-card"></i> Hutang / Tagihan</span></label>
            </div>
          </div>

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
              <label class="plan-form-lbl"><span id="planFEstimasiLbl">Estimasi Biaya (Rp)</span></label>
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
              <label class="plan-form-lbl"><span id="planFDateLbl">Target Tanggal Eksekusi</span></label>
              <input type="date" id="planFDate" name="target_date" class="plan-form-inp">
            </div>
            <div class="plan-form-row plan-only-investasi plan-hide-roi">
              <label class="plan-form-lbl"><span id="planFRoiLbl">Estimasi ROI (Rp/bulan)</span></label>
              <input type="text" inputmode="numeric" id="planFRoi" name="roi_estimate" class="plan-form-inp" placeholder="0" oninput="planFmtNum(this)">
              <small class="plan-form-hint" id="planFRoiHint">Income proyeksi pasca eksekusi (utk hitung balik modal &amp; skor prioritas)</small>
            </div>
          </div>

          <!-- Detail tambahan — collapse by default supaya modal gak panjang -->
          <details class="plan-details-extra">
            <summary><i class="ti ti-chevron-right"></i> Detail Lainnya <span class="plan-details-hint">(vendor, catatan, lampiran)</span></summary>
            <div class="plan-form-row plan-only-investasi">
              <label class="plan-form-lbl"><span id="planFVendorLbl">Vendor / Supplier</span> <span class="opt">opsional</span></label>
              <input type="text" id="planFVendor" name="vendor" class="plan-form-inp" maxlength="150" placeholder="contoh: Pak Budi 081xxxxxxxxx">
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Catatan / Link Referensi <span class="opt">opsional</span></label>
              <textarea id="planFCatatan" name="catatan" class="plan-form-inp" rows="3" maxlength="500" placeholder="Link Tokopedia, spec produk, dll..."></textarea>
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Lampiran <span class="opt">foto, brosur PDF (max 5MB/file, total 10 file)</span></label>
              <div id="planDropzone" class="plan-dropzone" onclick="document.getElementById('planFileInp').click()" ondragover="planDzOver(event)" ondragleave="planDzLeave(event)" ondrop="planDzDrop(event)">
                <i class="ti ti-cloud-upload"></i>
                <div class="plan-dz-lbl">Klik atau drag file foto / PDF ke sini</div>
                <div class="plan-dz-sub">JPG, PNG, WEBP, PDF — max 5MB per file</div>
              </div>
              <input type="file" id="planFileInp" accept="image/jpeg,image/png,image/webp,application/pdf" multiple style="display:none" onchange="planDzPickFiles(event)">
              <div id="planAttList" class="plan-att-list"></div>
            </div>
          </details>

          <!-- Dampak cashflow preview — cuma utk investasi -->
          <div class="plan-form-row plan-only-investasi" id="planImpactRow" style="display:none">
            <label class="plan-form-lbl">Dampak Cashflow</label>
            <div id="planImpactBox" class="plan-impact-box"></div>
          </div>

          <!-- Riwayat Pembayaran — visible saat editing item existing -->
          <div class="plan-payment-section" id="planPaymentSection" style="display:none">
            <div class="plan-payment-header">
              <div class="plan-payment-title"><i class="ti ti-history"></i> Riwayat Pembayaran</div>
              <button type="button" class="plan-payment-add-btn" onclick="openPaymentModal()"><i class="ti ti-plus"></i> Bayar Cicilan</button>
            </div>
            <div id="planPaymentSummary" class="plan-payment-summary"></div>
            <div id="planPaymentList" class="plan-payment-list"></div>
          </div>

          <div class="plan-form-actions">
            <button type="button" class="btn-outline" onclick="closePlanModal()">Batal</button>
            <button type="submit" class="btn-primary"><i class="ti ti-device-floppy"></i> Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Sub-modal: Bayar Cicilan -->
    <div class="overlay" id="paymentModalOv" onclick="if(event.target===this)closePaymentModal()">
      <div class="over-modal plan-modal" style="max-width:440px">
        <div class="plan-modal-hdr">
          <div>
            <h3 class="plan-modal-title">💰 Bayar Cicilan</h3>
            <p class="plan-modal-sub" id="paymentItemName">—</p>
          </div>
          <button type="button" class="plan-modal-close" onclick="closePaymentModal()"><i class="ti ti-x"></i></button>
        </div>
        <form id="paymentForm" class="plan-modal-form" onsubmit="submitPaymentForm(event)">
          <input type="hidden" id="paymentItemId" name="item_id">
          <div class="plan-deposit-info" id="paymentInfo">
            <div class="plan-deposit-row"><span>Sudah dibayar</span><b id="paymentCurrent">Rp 0</b></div>
            <div class="plan-deposit-row"><span>Total tagihan</span><b id="paymentTarget">Rp 0</b></div>
            <div class="plan-deposit-row"><span>Sisa</span><b id="paymentRemain" class="out">Rp 0</b></div>
          </div>
          <div class="plan-form-grid">
            <div class="plan-form-row">
              <label class="plan-form-lbl">Bulan <span class="req">*</span></label>
              <input type="month" id="paymentFBulan" name="bulan" class="plan-form-inp" required onchange="_planUpdatePaymentProjection()">
            </div>
            <div class="plan-form-row">
              <label class="plan-form-lbl">Jumlah (Rp) <span class="req">*</span></label>
              <input type="text" inputmode="numeric" id="paymentFAmount" name="amount" class="plan-form-inp" required placeholder="0" oninput="planFmtNum(this);_planUpdatePaymentProjection()">
            </div>
          </div>
          <div class="plan-deposit-quick">
            <span class="plan-deposit-quick-lbl">Cepat:</span>
            <button type="button" onclick="setPaymentAmount(500000)">+Rp 500k</button>
            <button type="button" onclick="setPaymentAmount(1000000)">+Rp 1jt</button>
            <button type="button" onclick="setPaymentAmount(2000000)">+Rp 2jt</button>
            <button type="button" onclick="setPaymentAmount('sisa')">Lunasi Sisa</button>
          </div>

          <!-- Proyeksi cicilan real-time -->
          <div id="paymentProjection" class="plan-payment-projection" style="display:none"></div>

          <div class="plan-form-row">
            <label class="plan-form-lbl">Catatan <span class="opt">opsional</span></label>
            <input type="text" id="paymentFCatatan" name="catatan" class="plan-form-inp" maxlength="300" placeholder="contoh: Bayar via Gopay">
          </div>
          <div class="plan-form-actions">
            <button type="button" class="btn-outline" onclick="closePaymentModal()">Batal</button>
            <button type="button" id="paymentScheduleBtn" class="btn-outline plan-pay-sch-btn" onclick="submitPaymentSchedule()" style="display:none"><i class="ti ti-calendar-plus"></i> Buat Rencana</button>
            <button type="submit" class="btn-primary"><i class="ti ti-cash-banknote"></i> Simpan (Bayar Sekarang)</button>
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
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=75\">"
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
    + "var _planKeptAtts=[];" // existing URLs to preserve
    + "var _planNewAtts=[];"  // new files {name,type,data(base64)}
    + "function _planApplyTipe(t){"
    +   "var form=document.getElementById('planForm');if(!form)return;"
    +   "form.classList.remove('plan-tipe-investasi','plan-tipe-hutang','plan-tipe-tabungan');"
    +   "form.classList.add('plan-tipe-'+(t||'investasi'));"
    +   "var labels={"
    +     "investasi:{date:'Target Tanggal Eksekusi',estimasi:'Estimasi Biaya (Rp)',roi:'Estimasi ROI (Rp/bulan)',vendor:'Vendor / Supplier'},"
    +     "hutang:   {date:'Target Lunas',           estimasi:'Total Tagihan (Rp)',  roi:'Cicilan Wajib (Rp/bulan)', vendor:'Pihak / Kreditur'}"
    +   "};"
    +   "var L=labels[t]||labels.investasi;"
    +   "var dl=document.getElementById('planFDateLbl');if(dl)dl.textContent=L.date;"
    +   "var el=document.getElementById('planFEstimasiLbl');if(el)el.textContent=L.estimasi;"
    +   "var rl=document.getElementById('planFRoiLbl');if(rl)rl.textContent=L.roi;"
    +   "var vl=document.getElementById('planFVendorLbl');if(vl)vl.textContent=L.vendor;"
    + "}"
    + "function openPlanModal(id){"
    +   "var ov=document.getElementById('planModalOv');"
    +   "document.getElementById('planForm').reset();"
    +   "document.getElementById('planFId').value='';"
    +   "document.getElementById('planModalTitle').textContent='Tambah Item';"
    +   "_planKeptAtts=[];_planNewAtts=[];"
    +   "var qa=document.getElementById('planQuickActions');if(qa)qa.style.display='none';"
    +   "var tipeDefault='investasi';"
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
    +       "_planKeptAtts=Array.isArray(it.attachments)?it.attachments.slice():[];"
    +       "tipeDefault=it.tipe||'investasi';"
    +       "if(qa)qa.style.display='';"
    +       "_planRenderPayments(it);"
    +     "}"
    +   "}else{"
    +     "var sec=document.getElementById('planPaymentSection');if(sec)sec.style.display='none';"
    +   "}"
    // Set radio tipe + apply class ke form
    +   "var rTipe=document.querySelector('input[name=tipe][value=\"'+tipeDefault+'\"]');"
    +   "if(rTipe)rTipe.checked=true;"
    +   "_planApplyTipe(tipeDefault);"
    +   "_planRenderAttList();"
    +   "_planUpdateImpact();"
    +   "ov.classList.add('open');"
    +   "setTimeout(function(){document.getElementById('planFNama').focus();},150);"
    + "}"
    + "function closePlanModal(){document.getElementById('planModalOv').classList.remove('open');_planKeptAtts=[];_planNewAtts=[];}"

    // Wrapper supaya tombol di modal bisa pakai id dari planFId
    + "function markPlanDoneFromModal(){var id=document.getElementById('planFId').value;if(id)markPlanDone(id);}"
    + "function duplicatePlanItemFromModal(){var id=document.getElementById('planFId').value;if(id)duplicatePlanItem(id);}"
    + "function sendToAnggaranFromModal(){var id=document.getElementById('planFId').value;if(!id)return;closePlanModal();setTimeout(function(){sendToAnggaran(id);},200);}"

    // ── Upload lampiran (dropzone + file picker + base64 preview) ──
    + "function planDzOver(e){e.preventDefault();e.currentTarget.classList.add('drag');}"
    + "function planDzLeave(e){e.currentTarget.classList.remove('drag');}"
    + "function planDzDrop(e){e.preventDefault();e.currentTarget.classList.remove('drag');"
    +   "if(e.dataTransfer&&e.dataTransfer.files)_planReadFiles(e.dataTransfer.files);}"
    + "function planDzPickFiles(e){_planReadFiles(e.target.files);e.target.value='';}"
    + "function _planReadFiles(fileList){"
    +   "var arr=Array.from(fileList||[]);"
    +   "var allowed=['image/jpeg','image/png','image/webp','application/pdf'];"
    +   "arr.forEach(function(f){"
    +     "if(!allowed.includes(f.type)){alert('Format tidak didukung: '+f.name+' ('+f.type+')');return;}"
    +     "if(f.size>5*1024*1024){alert('File terlalu besar (max 5MB): '+f.name);return;}"
    +     "if((_planKeptAtts.length+_planNewAtts.length)>=10){alert('Max 10 lampiran per item.');return;}"
    +     "var rd=new FileReader();"
    +     "rd.onload=function(ev){_planNewAtts.push({name:f.name,type:f.type,data:ev.target.result});_planRenderAttList();};"
    +     "rd.readAsDataURL(f);"
    +   "});"
    + "}"
    + "function _planRpEsc2(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}"
    + "function _planRenderAttList(){"
    +   "var el=document.getElementById('planAttList');if(!el)return;"
    +   "var html='';"
    +   "_planKeptAtts.forEach(function(u,i){"
    +     "var isPdf=/\\.pdf$/i.test(u);"
    +     "html+='<div class=\"plan-att-card\">'+(isPdf?'<div class=\"plan-att-pdf-thumb\"><i class=\"ti ti-file-text\"></i></div>':'<img src=\"'+_planRpEsc2(u)+'\" alt=\"\">')+'<button type=\"button\" class=\"plan-att-rm\" title=\"Hapus\" onclick=\"_planRmKept('+i+')\"><i class=\"ti ti-x\"></i></button></div>';"
    +   "});"
    +   "_planNewAtts.forEach(function(f,i){"
    +     "var isPdf=f.type==='application/pdf';"
    +     "html+='<div class=\"plan-att-card plan-att-new\">'+(isPdf?'<div class=\"plan-att-pdf-thumb\"><i class=\"ti ti-file-text\"></i><small>'+_planRpEsc2(f.name)+'</small></div>':'<img src=\"'+f.data+'\" alt=\"\">')+'<button type=\"button\" class=\"plan-att-rm\" title=\"Batalkan\" onclick=\"_planRmNew('+i+')\"><i class=\"ti ti-x\"></i></button></div>';"
    +   "});"
    +   "el.innerHTML=html;"
    + "}"
    + "function _planRmKept(i){_planKeptAtts.splice(i,1);_planRenderAttList();}"
    + "function _planRmNew(i){_planNewAtts.splice(i,1);_planRenderAttList();}"

    // ── Dampak cashflow preview (live di modal) ───────────────
    + "function _planUpdateImpact(){"
    +   "var d=document.getElementById('planFDate').value;"
    +   "var est=parseInt((document.getElementById('planFEstimasi').value||'').replace(/\\./g,''))||0;"
    +   "var roi=parseInt((document.getElementById('planFRoi').value||'').replace(/\\./g,''))||0;"
    +   "var row=document.getElementById('planImpactRow');var box=document.getElementById('planImpactBox');"
    +   "if(!row||!box)return;"
    +   "if(!d||est<=0){row.style.display='none';return;}"
    +   "var t=new Date(d);if(isNaN(t)){row.style.display='none';return;}"
    +   "var bln=t.toLocaleDateString('id-ID',{month:'long',year:'numeric'});"
    +   "var nx=new Date(t.getFullYear(),t.getMonth()+1,1);"
    +   "var nxLbl=nx.toLocaleDateString('id-ID',{month:'long',year:'numeric'});"
    +   "var html='<div class=\"plan-impact-line\"><span class=\"plan-impact-bullet plan-cf-out\">●</span> '+bln+': <b class=\"plan-cf-out\">−Rp '+_planRpFmt(est)+'</b> <small>(outflow eksekusi)</small></div>';"
    +   "if(roi>0){"
    +     "var bep=Math.ceil(est/roi);"
    +     "html+='<div class=\"plan-impact-line\"><span class=\"plan-impact-bullet plan-cf-in\">●</span> Mulai '+nxLbl+': <b class=\"plan-cf-in\">+Rp '+_planRpFmt(roi)+'/bln</b> <small>(ROI proyeksi · BEP ~'+bep+' bln)</small></div>';"
    +     "var totalYr=roi*12-est;"
    +     "html+='<div class=\"plan-impact-line plan-impact-net\"><i class=\"ti ti-chart-line\"></i> Net 12 bulan setelah eksekusi: <b class=\"'+(totalYr>=0?'plan-cf-in':'plan-cf-out')+'\">'+(totalYr>=0?'+':'')+'Rp '+_planRpFmt(Math.abs(totalYr))+'</b></div>';"
    +   "}else{html+='<div class=\"plan-impact-line\"><small style=\"color:var(--txt3)\">Isi ROI/bulan untuk lihat proyeksi pemasukan pasca eksekusi.</small></div>';}"
    +   "box.innerHTML=html;row.style.display='';"
    + "}"
    // Wire impact preview ke input changes (date, estimasi, roi)
    + "function _planWireImpact(){"
    +   "['planFDate','planFEstimasi','planFRoi'].forEach(function(id){"
    +     "var el=document.getElementById(id);if(!el||el._planImpactWired)return;"
    +     "el.addEventListener('input',_planUpdateImpact);el.addEventListener('change',_planUpdateImpact);"
    +     "el._planImpactWired=true;"
    +   "});"
    +   "document.querySelectorAll('input[name=tipe]').forEach(function(r){"
    +     "if(r._planTipeWired)return;"
    +     "r.addEventListener('change',function(){_planApplyTipe(r.value);_planUpdateImpact();});"
    +     "r._planTipeWired=true;"
    +   "});"
    + "}"
    + "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_planWireImpact);}else{_planWireImpact();}"

    // ── View mode toggle (List vs Bandingkan) ─────────────────
    + "function switchPlanView(v){"
    +   "document.querySelectorAll('.plan-view-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===v);});"
    +   "var res=document.getElementById('planWishlistResults');var cmp=document.getElementById('planWishlistCompare');"
    +   "var fbar=document.querySelector('.plan-filter-bar');"
    +   "if(v==='compare'){if(res)res.style.display='none';if(cmp)cmp.style.display='';if(fbar)fbar.style.display='none';}"
    +   "else{if(res)res.style.display='';if(cmp)cmp.style.display='none';if(fbar)fbar.style.display='';}"
    + "}"

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
    +     "tipe:fd.get('tipe')||'investasi',"
    +     "vendor:fd.get('vendor'),catatan:fd.get('catatan'),"
    +     "attachments_kept:JSON.stringify(_planKeptAtts),"
    +     "attachments_new:JSON.stringify(_planNewAtts)};"
    +   "var url=data.id?'/operasional/planning/edit':'/operasional/planning/add';"
    +   "var btn=e.target.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.innerHTML='<i class=\"ti ti-loader-2\"></i> Menyimpan...';}"
    +   "fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})"
    +     ".then(function(r){if(r.ok)location.reload();else{if(btn){btn.disabled=false;btn.innerHTML='<i class=\"ti ti-device-floppy\"></i> Simpan';}alert('Gagal menyimpan: '+r.status);}})"
    +     ".catch(function(err){if(btn){btn.disabled=false;btn.innerHTML='<i class=\"ti ti-device-floppy\"></i> Simpan';}alert('Error: '+err.message);});"
    + "}"
    + "function deletePlanItem(id){"
    +   "if(!confirm('Hapus item ini permanen? Tidak bisa di-undo.'))return;"
    +   "fetch('/operasional/planning/delete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(id)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal hapus');});"
    + "}"

    // ── Riwayat Pembayaran (tracking cicilan/tanggungan bulanan) ──
    + "function _planFmtBulanID(b){if(!b)return '';var p=b.split('-');if(p.length<2)return b;var d=new Date(parseInt(p[0]),parseInt(p[1])-1,1);return d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});}"
    + "function _planCalcLunas(it){"
    +   "var ps=Array.isArray(it.payments)?it.payments:[];"
    +   "var est=+it.estimasi||0,saved=+it.savedAmount||0;"
    +   "var rem=Math.max(0,est-saved);"
    +   "if(rem<=0)return{lunas:true,monthsLeft:0,avgPerMonth:0,projectedDate:null,sourceMonths:0,remaining:0};"
    +   "if(ps.length===0)return{lunas:false,monthsLeft:null,avgPerMonth:0,projectedDate:null,sourceMonths:0,remaining:rem};"
    +   "var byMonth={};ps.forEach(function(p){byMonth[p.bulan]=(byMonth[p.bulan]||0)+(+p.amount||0);});"
    +   "var bulans=Object.keys(byMonth).sort().reverse().slice(0,3);"
    +   "if(bulans.length===0)return{lunas:false,monthsLeft:null,avgPerMonth:0,projectedDate:null,sourceMonths:0,remaining:rem};"
    +   "var total=bulans.reduce(function(s,b){return s+byMonth[b];},0);"
    +   "var avg=total/bulans.length;"
    +   "var ml=avg>0?Math.ceil(rem/avg):null;"
    +   "var pd=null;if(ml!=null){var d=new Date();d.setDate(1);d.setMonth(d.getMonth()+ml);pd=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});}"
    +   "return{lunas:false,monthsLeft:ml,avgPerMonth:avg,projectedDate:pd,sourceMonths:bulans.length,remaining:rem};"
    + "}"
    + "function _planRenderPayments(it){"
    +   "var sec=document.getElementById('planPaymentSection');var sum=document.getElementById('planPaymentSummary');var list=document.getElementById('planPaymentList');"
    +   "if(!sec||!sum||!list)return;"
    +   "sec.style.display='';"
    +   "var ps=Array.isArray(it.payments)?it.payments.slice():[];"
    +   "var est=+it.estimasi||0,saved=+it.savedAmount||0;"
    +   "var lr=_planCalcLunas(it);"
    +   "var sumHtml='<div class=\"plan-payment-stat\"><span>Sudah dibayar</span><b class=\"plan-cf-in\">'+_planRpStr(saved)+(est>0?' <small>/ '+_planRpStr(est)+'</small>':'')+'</b></div>';"
    +   "sumHtml+='<div class=\"plan-payment-stat\"><span>Sisa</span><b class=\"plan-cf-out\">'+_planRpStr(lr.remaining)+'</b></div>';"
    +   "if(lr.lunas){sumHtml+='<div class=\"plan-payment-stat plan-pay-lunas\"><span>Status</span><b>🎉 Lunas!</b></div>';}"
    +   "else if(lr.monthsLeft!=null){sumHtml+='<div class=\"plan-payment-stat\"><span>Rata-rata/bulan</span><b>'+_planRpStr(lr.avgPerMonth)+'<small> avg '+lr.sourceMonths+' bln terakhir</small></b></div>';"
    +     "sumHtml+='<div class=\"plan-payment-stat plan-pay-est\"><span>Estimasi lunas</span><b>'+lr.monthsLeft+' bulan lagi<small> (~'+lr.projectedDate+')</small></b></div>';}"
    +   "else{sumHtml+='<div class=\"plan-payment-stat\"><span>Estimasi lunas</span><b><small>Tambah pembayaran utk hitung</small></b></div>';}"
    +   "sum.innerHTML=sumHtml;"
    +   "if(ps.length===0){list.innerHTML='<div class=\"plan-payment-empty\"><i class=\"ti ti-receipt-off\"></i> Belum ada riwayat pembayaran. Klik <b>Bayar Cicilan</b> untuk mulai catat.</div>';return;}"
    +   "ps.sort(function(a,b){if(a.bulan!==b.bulan)return a.bulan<b.bulan?-1:1;if(a.paidAt&&b.paidAt)return a.paidAt<b.paidAt?-1:1;return 0;});"
    +   "var html='';"
    +   "ps.forEach(function(p){"
    +     "var paid=p.paid!==false;"
    +     "var idEsc=_planRpEsc(p.id);"
    +     "html+='<div class=\"plan-payment-item'+(paid?'':' plan-payment-item-unpaid')+'\">"
    +       "<label class=\"plan-pay-check\" title=\"'+(paid?'Sudah dibayar — klik utk batalkan':'Belum dibayar — klik utk tandai sudah bayar')+'\">"
    +         "<input type=\"checkbox\" '+(paid?'checked':'')+' onchange=\"togglePayment(\\''+idEsc+'\\',this.checked)\">"
    +         "<span class=\"plan-pay-check-mark\"></span>"
    +       "</label>"
    +       "<div class=\"plan-payment-item-main\">"
    +         "<div class=\"plan-payment-item-bulan\"><i class=\"ti ti-calendar-month\"></i> '+_planFmtBulanID(p.bulan)+(paid?'':' <span class=\"plan-pay-sch-tag\">Jadwal</span>')+'</div>"
    +         "<div class=\"plan-payment-item-amount\">'+_planRpStr(p.amount)+'</div>"
    +         "'+(p.catatan?'<div class=\"plan-payment-item-catatan\">'+_planRpEsc(p.catatan)+'</div>':'')+'"
    +       "</div>"
    +       "<button type=\"button\" class=\"plan-payment-item-rm\" title=\"Hapus pembayaran\" onclick=\"deletePayment(\\''+idEsc+'\\')\"><i class=\"ti ti-trash\"></i></button>"
    +     "</div>';"
    +   "});"
    +   "list.innerHTML=html;"
    + "}"

    + "function openPaymentModal(){"
    +   "var id=document.getElementById('planFId').value;if(!id){alert('Simpan item dulu sebelum catat pembayaran.');return;}"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "document.getElementById('paymentItemId').value=id;"
    +   "document.getElementById('paymentItemName').textContent=it.nama||'';"
    +   "document.getElementById('paymentFAmount').value='';"
    +   "document.getElementById('paymentFCatatan').value='';"
    +   "var now=new Date();var bln=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');"
    +   "document.getElementById('paymentFBulan').value=bln;"
    +   "var saved=+it.savedAmount||0,est=+it.estimasi||0;"
    +   "document.getElementById('paymentCurrent').textContent=_planRpStr(saved);"
    +   "document.getElementById('paymentTarget').textContent=_planRpStr(est);"
    +   "document.getElementById('paymentRemain').textContent=_planRpStr(Math.max(0,est-saved));"
    +   "_planUpdatePaymentProjection();"
    +   "document.getElementById('paymentModalOv').classList.add('open');"
    +   "setTimeout(function(){document.getElementById('paymentFAmount').focus();},150);"
    + "}"
    + "function closePaymentModal(){document.getElementById('paymentModalOv').classList.remove('open');}"
    + "function setPaymentAmount(v){"
    +   "var inp=document.getElementById('paymentFAmount');"
    +   "if(v==='sisa'){var id=document.getElementById('paymentItemId').value;var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;var rem=Math.max(0,(+it.estimasi||0)-(+it.savedAmount||0));inp.value=rem>0?_planRpFmt(rem):'';}"
    +   "else{inp.value=_planRpFmt(v);}"
    +   "_planUpdatePaymentProjection();"
    + "}"

    // Proyeksi real-time di sub-modal Bayar Cicilan: kalau bayar X/bln, lunas dlm Y bulan tgl Z + list bulanan
    + "function _planUpdatePaymentProjection(){"
    +   "var box=document.getElementById('paymentProjection');if(!box)return;"
    +   "var id=document.getElementById('paymentItemId').value;"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});"
    +   "if(!it){box.style.display='none';return;}"
    +   "var amt=parseInt((document.getElementById('paymentFAmount').value||'').replace(/\\./g,''))||0;"
    +   "var saved=+it.savedAmount||0,est=+it.estimasi||0;"
    +   "var rem=Math.max(0,est-saved);"
    +   "if(rem<=0||est<=0){box.style.display='none';return;}"
    // Detect preset aktif (kalau amount === ceil(sisa/N))
    +   "var presets=[3,6,12,24];"
    +   "var activeN=null;"
    +   "if(amt>0){for(var pi=0;pi<presets.length;pi++){if(amt===Math.ceil(rem/presets[pi])){activeN=presets[pi];break;}}}"
    +   "var presetsHtml='<div class=\"plan-proj-presets-wrap\">"
    +     "<span class=\"plan-proj-presets-lbl\">Bagi otomatis</span>"
    +     "<div class=\"plan-proj-presets-grid\">"
    +       "<button type=\"button\" class=\"plan-proj-preset'+(activeN===3?' active':'')+'\" onclick=\"_planSplitBy(3)\">3 bln</button>"
    +       "<button type=\"button\" class=\"plan-proj-preset'+(activeN===6?' active':'')+'\" onclick=\"_planSplitBy(6)\">6 bln</button>"
    +       "<button type=\"button\" class=\"plan-proj-preset'+(activeN===12?' active':'')+'\" onclick=\"_planSplitBy(12)\">12 bln</button>"
    +       "<button type=\"button\" class=\"plan-proj-preset'+(activeN===24?' active':'')+'\" onclick=\"_planSplitBy(24)\">24 bln</button>"
    +     "</div>"
    +   "</div>';"
    +   "var resetBtn=amt>0?'<button type=\"button\" class=\"plan-proj-reset\" onclick=\"_planResetSplit()\" title=\"Kosongin jumlah\"><i class=\"ti ti-refresh\"></i> Reset</button>':'';"
    +   "var hdrHtml='<div class=\"plan-proj-hdr-row\"><div class=\"plan-proj-hdr\"><i class=\"ti ti-calculator\"></i> Rencana Cicilan</div>'+resetBtn+'</div>';"
    +   "if(amt<=0){"
    +     "box.innerHTML=hdrHtml+"
    +       "'<div class=\"plan-proj-empty\">Isi <b>Jumlah</b> per bulan, atau klik preset di bawah untuk bagi otomatis.</div>'+presetsHtml;"
    +     "box.style.display='';"
    +     "var schBtn0=document.getElementById('paymentScheduleBtn');if(schBtn0)schBtn0.style.display='none';"
    +     "return;"
    +   "}"
    +   "var bulanInpVal=document.getElementById('paymentFBulan').value;"
    +   "var startDate=bulanInpVal?new Date(parseInt(bulanInpVal.slice(0,4)),parseInt(bulanInpVal.slice(5,7))-1,1):new Date();"
    +   "var schedule=[];var remaining=rem;var mo=0;"
    +   "while(remaining>0&&mo<60){"
    +     "var pay=Math.min(amt,remaining);"
    +     "var d=new Date(startDate.getFullYear(),startDate.getMonth()+mo,1);"
    +     "schedule.push({bulan:d.toLocaleDateString('id-ID',{month:'long',year:'numeric'}),amount:pay,isLast:pay===remaining});"
    +     "remaining-=pay;mo++;"
    +   "}"
    +   "var endLbl=schedule.length>0?schedule[schedule.length-1].bulan:'-';"
    +   "var html=hdrHtml;"
    +   "html+=presetsHtml;"
    // Banner Rencana Dipilih — prominent, jelasin user wajib bayar segini perbulan
    +   "html+='<div class=\"plan-proj-chosen\">"
    +     "<div class=\"plan-proj-chosen-ic\"><i class=\"ti ti-circle-check-filled\"></i></div>"
    +     "<div class=\"plan-proj-chosen-txt\">"
    +       "<div class=\"plan-proj-chosen-ttl\">Rencana Dipilih'+(activeN?' <span class=\"plan-proj-chosen-tag\">Bagi '+activeN+' bln</span>':'')+'</div>"
    +       "<div class=\"plan-proj-chosen-body\">Wajib bayar <b>'+_planRpStr(amt)+'/bulan</b> selama <b>'+schedule.length+' bulan</b> &middot; lunas <b>'+endLbl+'</b></div>"
    +     "</div>"
    +   "</div>';"
    +   "html+='<div class=\"plan-proj-grid\">';"
    +   "html+='<div class=\"plan-proj-stat\"><span>Cicilan/bln</span><b>'+_planRpStr(amt)+'</b></div>';"
    +   "html+='<div class=\"plan-proj-stat\"><span>Total bulan</span><b>'+schedule.length+' bulan</b></div>';"
    +   "html+='<div class=\"plan-proj-stat plan-proj-end\"><span>Selesai (lunas)</span><b>'+endLbl+'</b></div>';"
    +   "html+='</div>';"
    +   "html+='<div class=\"plan-proj-list-hdr\"><i class=\"ti ti-list-numbers\"></i> Daftar bulanan</div>';"
    +   "html+='<div class=\"plan-proj-list\">';"
    +   "schedule.forEach(function(s,i){"
    +     "html+='<div class=\"plan-proj-row'+(s.isLast?' plan-proj-row-last':'')+'\">"
    +       "<span class=\"plan-proj-row-num\">'+(i+1)+'</span>"
    +       "<span class=\"plan-proj-row-bulan\">'+s.bulan+'</span>"
    +       "<span class=\"plan-proj-row-amt\">'+_planRpStr(s.amount)+'</span>"
    +       "'+(s.isLast?'<span class=\"plan-proj-row-lunas\">🎉 Lunas</span>':'')+'"
    +     "</div>';"
    +   "});"
    +   "html+='</div>';"
    +   "if(mo>=60)html+='<div class=\"plan-proj-note plan-proj-warn\"><i class=\"ti ti-alert-triangle\"></i> List dipotong di 60 bulan. Cicilan terlalu kecil utk sisa segini — naikkan jumlah/bln.</div>';"
    +   "box.innerHTML=html;box.style.display='';"
    // Update tombol Buat Rencana: visible kalau >1 bulan, label sesuai count
    +   "var schBtn=document.getElementById('paymentScheduleBtn');"
    +   "if(schBtn){if(schedule.length>1){schBtn.style.display='';schBtn.innerHTML='<i class=\"ti ti-calendar-plus\"></i> Buat Rencana '+schedule.length+' Bulan';}else{schBtn.style.display='none';}}"
    + "}"
    + "function _planSplitBy(n){"
    +   "var id=document.getElementById('paymentItemId').value;"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "var rem=Math.max(0,(+it.estimasi||0)-(+it.savedAmount||0));"
    +   "if(rem<=0||!n)return;"
    +   "var per=Math.ceil(rem/n);"
    +   "document.getElementById('paymentFAmount').value=_planRpFmt(per);"
    +   "_planUpdatePaymentProjection();"
    + "}"
    + "function _planResetSplit(){"
    +   "document.getElementById('paymentFAmount').value='';"
    +   "_planUpdatePaymentProjection();"
    +   "document.getElementById('paymentFAmount').focus();"
    + "}"
    // Bulk-create N pembayaran scheduled (unpaid) dari rencana cicilan
    + "function submitPaymentSchedule(){"
    +   "var id=document.getElementById('paymentItemId').value;"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===id;});if(!it)return;"
    +   "var amt=parseInt((document.getElementById('paymentFAmount').value||'').replace(/\\./g,''))||0;"
    +   "var bln=document.getElementById('paymentFBulan').value;"
    +   "var rem=Math.max(0,(+it.estimasi||0)-(+it.savedAmount||0));"
    +   "if(amt<=0||!bln||rem<=0){alert('Isi Jumlah & Bulan dulu.');return;}"
    +   "var count=Math.ceil(rem/amt);"
    +   "if(count>60){alert('Cicilan terlalu kecil — max 60 bulan/rencana.');return;}"
    +   "if(!confirm('Buat rencana '+count+' bulan?\\n\\nSemua bulan akan masuk sebagai jadwal di Riwayat (belum dibayar). Centang checklist saat sudah bayar tiap bulan.'))return;"
    +   "fetch('/operasional/planning/payment/schedule',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({item_id:id,amount:String(amt),start_bulan:bln,count:String(count),remaining:String(rem)})})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal buat rencana');});"
    + "}"
    // Toggle status paid/unpaid utk row pembayaran — update local + re-render
    // tanpa reload, biar modal tetap open & user bisa centang banyak entry.
    + "function togglePayment(id,paid){"
    +   "var itemId=document.getElementById('planFId').value;"
    +   "var it=PLAN_ITEMS.find(function(x){return x.id===itemId;});"
    +   "var listEl=document.getElementById('planPaymentList');"
    +   "var scrollTop=listEl?listEl.scrollTop:0;"
    +   "fetch('/operasional/planning/payment/toggle',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id:id,paid:String(paid)})})"
    +     ".then(function(r){"
    +       "if(!r.ok){alert('Gagal update status');"
    +         "var cb=document.querySelector('.plan-pay-check input[onchange*=\"'+id+'\"]');"
    +         "if(cb)cb.checked=!paid;"
    +         "return;}"
    // Sinkron local state ke result dari server
    +       "if(it&&Array.isArray(it.payments)){"
    +         "var p=it.payments.find(function(x){return x.id===id;});"
    +         "if(p){"
    +           "var wasPaid=p.paid!==false;"
    +           "if(wasPaid!==paid){"
    +             "p.paid=paid;"
    +             "if(paid&&!wasPaid)it.savedAmount=(+it.savedAmount||0)+(+p.amount||0);"
    +             "else if(!paid&&wasPaid)it.savedAmount=Math.max(0,(+it.savedAmount||0)-(+p.amount||0));"
    +           "}"
    +         "}"
    +       "}"
    +       "if(it){_planRenderPayments(it);"
    +         "var newList=document.getElementById('planPaymentList');"
    +         "if(newList)newList.scrollTop=scrollTop;}"
    +     "});"
    + "}"
    + "function submitPaymentForm(e){"
    +   "e.preventDefault();"
    +   "var data={item_id:document.getElementById('paymentItemId').value,"
    +     "amount:(document.getElementById('paymentFAmount').value||'').replace(/\\./g,''),"
    +     "bulan:document.getElementById('paymentFBulan').value,"
    +     "catatan:document.getElementById('paymentFCatatan').value};"
    +   "if(!data.amount||parseInt(data.amount)<=0){alert('Jumlah pembayaran harus > 0');return;}"
    +   "if(!data.bulan){alert('Bulan wajib diisi');return;}"
    +   "fetch('/operasional/planning/payment/add',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal simpan pembayaran');});"
    + "}"
    + "function deletePayment(id){"
    +   "if(!confirm('Hapus catatan pembayaran ini? Saldo terbayar akan dikurangi.'))return;"
    +   "fetch('/operasional/planning/payment/delete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(id)})"
    +     ".then(function(r){if(r.ok)location.reload();else alert('Gagal hapus pembayaran');});"
    + "}"

    // ── Quick actions: Tandai Selesai / Duplikat / Kirim ke Anggaran ──
    // Pakai JSON body biar attachments tetap kepertahankan saat quick action.
    + "function _planPostItem(url,it){"
    +   "var atts=Array.isArray(it.attachments)?it.attachments:[];"
    +   "var data={id:it.id||'',nama:it.nama||'',kategori:it.kategori||'lain',"
    +     "estimasi:String(it.estimasi||0),prioritas:it.prioritas||'nice',"
    +     "status:it.status||'idea',target_date:it.targetDate||'',"
    +     "roi_estimate:String(it.roiEstimate||0),saved_amount:String(it.savedAmount||0),"
    +     "vendor:it.vendor||'',catatan:it.catatan||'',"
    +     "attachments_kept:JSON.stringify(atts),attachments_new:'[]'};"
    +   "return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});"
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
    +   "var copy=Object.assign({},it,{id:'',nama:(it.nama||'')+' (copy)',status:'idea',savedAmount:0,attachments:[]});"
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
    + "var _PLAN_PRIO_W={urgent:4,penting:3,nice:2,idea:1};"
    + "function _planUrg(d){if(!d)return 1;var n=new Date();n.setHours(0,0,0,0);var t=new Date(d);if(isNaN(t))return 1;var dl=Math.floor((t-n)/86400000);if(dl<0)return 0.8;if(dl<30)return 2;if(dl<90)return 1.5;if(dl<180)return 1.2;return 1;}"
    + "function _planCalcSkor(it){if(!it||it.status==='done'||it.status==='cancelled')return 0;var e=+it.estimasi||0,r=+it.roiEstimate||0;if(e<=0||r<=0)return 0;var rr=(r/e)*100;var w=_PLAN_PRIO_W[it.prioritas||'nice']||2;return Math.round(rr*w*_planUrg(it.targetDate)*10)/10;}"
    + "function _planFindTop(items){var top=null,topV=0;items.forEach(function(it){var s=_planCalcSkor(it);if(s>topV){topV=s;top=it.id;}});return topV>0?top:null;}"
    + "function _planCashflow(it){var e=+it.estimasi||0,r=+it.roiEstimate||0;if(!it.targetDate||e<=0)return null;var t=new Date(it.targetDate);if(isNaN(t))return null;var b=t.toLocaleDateString('id-ID',{month:'long',year:'numeric'});var nx=new Date(t.getFullYear(),t.getMonth()+1,1);var n=nx.toLocaleDateString('id-ID',{month:'long',year:'numeric'});return{execBulan:b,outflow:e,nextBulan:n,monthlyROI:r};}"
    + "function _planRenderRow(it,topId){"
    +   "var kat=_PLAN_KAT[it.kategori]||_PLAN_KAT.lain;"
    +   "var bep=_planCalcBep(it.estimasi,it.roiEstimate);"
    +   "var bepLbl=_planFmtDur(bep);"
    +   "var saved=+it.savedAmount||0;var est=+it.estimasi||0;"
    +   "var pct=est>0?Math.min(100,Math.round((saved/est)*100)):0;"
    +   "var rem=Math.max(0,est-saved);"
    +   "var w=_planCalcWarn(it.targetDate,saved,est);"
    +   "var done=it.status==='done';"
    +   "var sk=_planCalcSkor(it);"
    +   "var isTop=it.id===topId&&topId;"
    +   "var cf=_planCashflow(it);"
    +   "var atts=Array.isArray(it.attachments)?it.attachments.slice(0,4):[];"
    +   "var moreAtt=(Array.isArray(it.attachments)?it.attachments.length:0)-atts.length;"
    +   "var firstImg=atts.find(function(u){return /\\.(jpe?g|png|webp|gif)$/i.test(u);});"
    +   "var idEsc=_planRpEsc(it.id);"
    +   "var h='<div class=\"plan-row'+(done?' plan-row-done':'')+(isTop?' plan-row-top':'')+'\" data-id=\"'+idEsc+'\">';"
    +   "h+='<div class=\"plan-row-thumb\" style=\"background:'+kat.bg+';color:'+kat.color+'\">';"
    +   "h+=firstImg?'<img src=\"'+_planRpEsc(firstImg)+'\" alt=\"\" class=\"plan-row-thumb-img\" loading=\"lazy\">':'<span class=\"plan-row-thumb-emoji\">'+kat.lbl.split(' ')[0]+'</span>';"
    +   "h+='</div>';"
    +   "h+='<div class=\"plan-row-main\"><div class=\"plan-row-title\">';"
    +   "if(isTop)h+='<span class=\"plan-trophy\" title=\"Rekomendasi #1\">🏆</span> ';"
    +   "h+=_planRpEsc(it.nama);"
    +   "if(sk>0)h+=' <span class=\"plan-skor-badge\" title=\"Skor prioritas\">Skor '+sk+'</span>';"
    +   "h+='</div>';"
    +   "if(isTop)h+='<div class=\"plan-top-banner\"><i class=\"ti ti-award\"></i> Rekomendasi #1 dieksekusi duluan</div>';"
    +   "h+='<div class=\"plan-row-meta\">';"
    +   "h+=_planTagHtml(_PLAN_KAT,it.kategori)+_planTagHtml(_PLAN_STAT,it.status);"
    +   "if(it.targetDate)h+='<span class=\"plan-meta-item\"><i class=\"ti ti-calendar\"></i> '+_planRpEsc(it.targetDate)+'</span>';"
    +   "if(it.vendor)h+='<span class=\"plan-meta-item\"><i class=\"ti ti-building-store\"></i> '+_planRpEsc(it.vendor)+'</span>';"
    +   "if(bepLbl)h+='<span class=\"plan-meta-item plan-meta-bep\" title=\"Estimasi balik modal\"><i class=\"ti ti-trending-up\"></i> Balik modal: '+bepLbl+'</span>';"
    +   "if(w)h+='<span class=\"plan-meta-item plan-warn-'+w.lvl+'\" title=\"H-'+w.daysLeft+' & progress '+pct+'%\"><i class=\"ti '+w.icon+'\"></i> '+w.lbl+'</span>';"
    +   "h+='</div>';"
    +   "if(est>0){var pcls=pct>=100?'done':(pct>=50?'mid':'low');h+='<div class=\"plan-row-progress\" title=\"Terkumpul '+_planRpStr(saved)+' dari '+_planRpStr(est)+'\"><div class=\"plan-row-prog-bar\"><div class=\"plan-row-prog-fill plan-prog-'+pcls+'\" style=\"width:'+pct+'%\"></div></div><div class=\"plan-row-prog-txt\">'+_planRpStr(saved)+' <span class=\"plan-row-prog-sep\">/</span> '+_planRpStr(est)+' <b>('+pct+'%)</b>'+(rem>0?' <span class=\"plan-row-prog-rem\">· sisa '+_planRpStr(rem)+'</span>':'')+'</div></div>';}"
    +   "if(cf)h+='<div class=\"plan-row-cashflow\"><i class=\"ti ti-cash-banknote\"></i> <b>Dampak cashflow:</b> '+cf.execBulan+' <span class=\"plan-cf-out\">−'+_planRpStr(cf.outflow)+'</span>'+(cf.monthlyROI>0?', mulai '+cf.nextBulan+' <span class=\"plan-cf-in\">+'+_planRpStr(cf.monthlyROI)+'/bln</span>':'')+'</div>';"
    +   "if(atts.length>0){h+='<div class=\"plan-row-attachments\">';"
    +     "atts.forEach(function(u){var isPdf=/\\.pdf$/i.test(u);h+=isPdf?('<a href=\"'+_planRpEsc(u)+'\" target=\"_blank\" rel=\"noopener\" class=\"plan-att plan-att-pdf\" title=\"Lihat PDF\"><i class=\"ti ti-file-text\"></i> PDF</a>'):('<a href=\"'+_planRpEsc(u)+'\" target=\"_blank\" rel=\"noopener\" class=\"plan-att plan-att-img\"><img src=\"'+_planRpEsc(u)+'\" alt=\"\" loading=\"lazy\"></a>');});"
    +     "if(moreAtt>0)h+='<span class=\"plan-att plan-att-more\">+'+moreAtt+'</span>';h+='</div>';}"
    +   "if(it.catatan)h+='<div class=\"plan-row-catatan\">'+_planRpEsc(it.catatan)+'</div>';"
    +   "h+='</div><div class=\"plan-row-side\"><div class=\"plan-row-estimasi\">'+_planRpStr(it.estimasi)+'</div>';"
    +   "if(it.roiEstimate>0)h+='<div class=\"plan-row-roi\">+ROI '+_planRpStr(it.roiEstimate)+'/bln</div>';"
    +   "h+='<div class=\"plan-row-actions\">';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon\" title=\"Edit (aksi lain di dalam detail)\" onclick=\"openPlanModal(\\''+idEsc+'\\')\"><i class=\"ti ti-edit\"></i></button>';"
    +   "h+='<button type=\"button\" class=\"plan-btn-icon danger\" title=\"Hapus\" onclick=\"deletePlanItem(\\''+idEsc+'\\')\"><i class=\"ti ti-trash\"></i></button>';"
    +   "h+='</div></div></div>';"
    +   "return h;"
    + "}"
    + "function _planRenderGroup(key,rows,topId){if(!rows.length)return '';return '<div class=\"plan-group\"><div class=\"plan-group-hdr\">'+_planTagHtml(_PLAN_PRIO,key)+'<span class=\"plan-group-count\">'+rows.length+' item</span></div><div class=\"plan-group-body\">'+rows.map(function(it){return _planRenderRow(it,topId);}).join('')+'</div></div>';}"
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
    +   "var topId=_planFindTop(arr);"
    +   "if(so==='default'){"
    +     "var prioOrder={urgent:1,penting:2,nice:3,idea:4};"
    +     "var grp={urgent:[],penting:[],nice:[],idea:[]};"
    +     "arr.forEach(function(x){var k=x.prioritas||'nice';if(grp[k])grp[k].push(x);else grp.nice.push(x);});"
    +     "res.innerHTML=_planRenderGroup('urgent',grp.urgent,topId)+_planRenderGroup('penting',grp.penting,topId)+_planRenderGroup('nice',grp.nice,topId)+_planRenderGroup('idea',grp.idea,topId);"
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
    +     "res.innerHTML='<div class=\"plan-group\"><div class=\"plan-group-hdr\"><span class=\"plan-tag\" style=\"background:rgba(45,102,36,.12);color:#2d6624\"><i class=\"ti ti-arrows-sort\"></i> '+sortLbl+'</span><span class=\"plan-group-count\">'+arr.length+' item</span></div><div class=\"plan-group-body\">'+arr.map(function(it){return _planRenderRow(it,topId);}).join('')+'</div></div>';"
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
