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
      <!-- Summary mini -->
      <div class="plan-wishlist-summary">
        <div class="plan-sum-item"><span class="plan-sum-lbl">Total Item</span><b>${items.length}</b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Estimasi Total</span><b>${rp(totalEstimasi)}</b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Potensi ROI</span><b class="plan-roi-val">${rp(totalRoi)}<small>/bln</small></b></div>
        <div class="plan-sum-item"><span class="plan-sum-lbl">Status</span><b class="plan-sum-status">
          ${countByStatus.idea || 0} ide · ${countByStatus.plan || 0} plan · ${countByStatus.ongoing || 0} on-going · ${countByStatus.done || 0} done
        </b></div>
      </div>

      ${items.length === 0
        ? `<div class="plan-empty">
            <i class="ti ti-clipboard-list"></i>
            <div class="plan-empty-title">Belum ada item di wishlist</div>
            <div class="plan-empty-sub">Mulai catat rencana upgrade & ekspansi bisnis kamu.</div>
            <button type="button" class="btn-primary" onclick="openPlanModal('')"><i class="ti ti-plus"></i> Tambah Item Pertama</button>
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

// ── Timeline tab (preview) ──────────────────────────────────
function renderTimelineTab() {
  return `
    <div class="plan-tab-content">
      <div class="plan-soon-card">
        <div class="plan-soon-hdr">
          <div class="plan-soon-ic"><i class="ti ti-timeline-event-exclamation"></i></div>
          <div>
            <div class="plan-soon-title">Roadmap Timeline</div>
            <div class="plan-soon-sub">Visual Gantt chart 6-12 bulan — drag-drop reschedule. Segera hadir.</div>
          </div>
          <span class="plan-soon-badge">Segera</span>
        </div>
        <div class="plan-soon-preview">
          <div class="plan-gantt-preview">
            <div class="plan-gantt-hdr">
              <span></span>
              <span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span><span>Nov</span>
            </div>
            <div class="plan-gantt-row"><span class="plan-gantt-lbl">Tambah meja 4</span><div class="plan-gantt-bar" style="grid-column:5/7;background:#3a7d2c"></div></div>
            <div class="plan-gantt-row"><span class="plan-gantt-lbl">Pasang AC</span><div class="plan-gantt-bar" style="grid-column:2/4;background:#d97706"></div></div>
            <div class="plan-gantt-row"><span class="plan-gantt-lbl">Upgrade karpet</span><div class="plan-gantt-bar" style="grid-column:3/5;background:#a855f7"></div></div>
            <div class="plan-gantt-row"><span class="plan-gantt-lbl">Kulkas display</span><div class="plan-gantt-bar" style="grid-column:4/6;background:#2563eb"></div></div>
          </div>
          <div class="plan-soon-features">
            <div class="plan-soon-feat"><i class="ti ti-calendar"></i> Drag-drop untuk reschedule item</div>
            <div class="plan-soon-feat"><i class="ti ti-link"></i> Link ke kalender + reminder vendor</div>
            <div class="plan-soon-feat"><i class="ti ti-eye"></i> Filter per kategori / prioritas</div>
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
    + "<link rel=\"stylesheet\" href=\"/admin.css?v=56\">"
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

    // Page heading
    + "<div class=\"dash-topbar fin-page-head\">"
    + "<div class=\"fin-page-head-text\">"
    + "<h1 class=\"fin-page-title\">📈 Planning &amp; Roadmap"
    +   " <span class=\"fin-role-badge fin-role-owner\"><i class=\"ti ti-crown\"></i>OWNER</span>"
    + "</h1>"
    + "<p class=\"fin-page-sub\">Catat rencana upgrade, alokasi tabungan goal, dan simulasi ROI ekspansi bisnis.</p>"
    + "</div>"
    + "<div class=\"topbar-actions\">"
    + "<button type=\"button\" class=\"btn-primary\" onclick=\"openPlanModal('')\"><i class=\"ti ti-plus\" style=\"font-size:14px\"></i> Tambah Item</button>"
    + "</div>"
    + "</div>"

    // Tabs nav
    + "<div class=\"plan-tabs-nav\">"
    + "<button type=\"button\" class=\"plan-tab-btn active\" data-tab=\"wishlist\" onclick=\"switchPlanTab('wishlist')\"><i class=\"ti ti-clipboard-list\"></i> Wishlist <span class=\"plan-tab-count\">" + items.length + "</span></button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"anggaran\" onclick=\"switchPlanTab('anggaran')\"><i class=\"ti ti-piggy-bank\"></i> Anggaran <span class=\"plan-soon-pill\">Segera</span></button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"timeline\" onclick=\"switchPlanTab('timeline')\"><i class=\"ti ti-timeline-event\"></i> Timeline <span class=\"plan-soon-pill\">Segera</span></button>"
    + "<button type=\"button\" class=\"plan-tab-btn\" data-tab=\"simulasi\" onclick=\"switchPlanTab('simulasi')\"><i class=\"ti ti-calculator\"></i> Simulasi <span class=\"plan-soon-pill\">Segera</span></button>"
    + "</div>"

    // Tab contents
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"wishlist\">" + renderWishlistTab(items) + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"anggaran\" style=\"display:none\">" + renderAnggaranTab() + "</div>"
    + "<div class=\"plan-tab-wrap\" data-tab-content=\"timeline\" style=\"display:none\">" + renderTimelineTab() + "</div>"
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
