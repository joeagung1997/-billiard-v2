// public/dashboard.js
// ── Client-side dashboard logic ───────────────────────────────
// DATA_SCAN, DATA_LB, DATA_LOG, DATA_MEMBER, TK, BATAS, HOST
// sudah di-inject server sebagai variabel global di HTML

"use strict";
const CONFIG_ARENA = document.title.replace(" — Admin", "") || "Billiard";

// ── Theme ─────────────────────────────────────────────────────
const THEME_KEY = "warpat_admin_theme";

const applyTheme = (t) => {
  document.documentElement.setAttribute("data-theme", t);
  const icon = t === "dark" ? "🌙" : "☀️";
  document.querySelectorAll(".theme-btn").forEach(function(b) { b.textContent = icon; });
  try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
};

const toggleTheme = () => {
  const cur = document.documentElement.getAttribute("data-theme");
  applyTheme(cur === "dark" ? "light" : "dark");
};

// Sync icon with current data-theme (set by inline script before JS loaded)
try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) applyTheme(saved);
  else {
    // No saved pref — just sync the button icon to match the inline-script default
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const icon = cur === "dark" ? "🌙" : "☀️";
    document.querySelectorAll(".theme-btn").forEach(function(b) { b.textContent = icon; });
  }
} catch (_) {}

// ── Confirm modal — replace native confirm() dgn UI yg lebih bagus ──
const CONFIRM_PRESET = {
  hapus: {
    icon: "ti-trash",
    iconBg: "#fcebeb",
    iconColor: "#a32d2d",
    title: "Hapus Member",
    msg: (n) => `Member <b>${n}</b> akan dihapus <b style="color:#a32d2d">permanen</b> dari sistem. Aksi ini tidak bisa dibatalkan. Yakin?`,
    okText: "Ya, Hapus",
    okStyle: "danger",
  },
  resetqr: {
    icon: "ti-refresh",
    iconBg: "#fef3e1",
    iconColor: "#c47f1a",
    title: "Reset QR Member",
    msg: (n) => `QR member <b>${n}</b> akan diganti dengan kode baru. Kartu QR lama <b style="color:#c47f1a">tidak bisa dipakai lagi</b>. Yakin?`,
    okText: "Ya, Reset QR",
    okStyle: "warn",
  },
  klaim: {
    icon: "ti-gift",
    iconBg: "#faf0d3",
    iconColor: "#8a6800",
    title: "Klaim Bonus",
    msg: (n) => `Klaim bonus untuk <b>${n}</b>? Progress sesi akan direset ke 0.`,
    okText: "Ya, Klaim",
    okStyle: "primary",
  },
};

window.confirmAction = function(el) {
  const kind = el.dataset.confirm;
  const name = el.dataset.name || "member ini";
  const href = el.dataset.href;
  const p = CONFIRM_PRESET[kind];
  if (!p) { window.location.href = href; return; }

  const ov  = document.getElementById("confirmOv");
  if (!ov) { if (confirm(p.title + "\n\n" + name)) window.location.href = href; return; }

  document.getElementById("confirmIcon").innerHTML = '<i class="ti ' + p.icon + '"></i>';
  document.getElementById("confirmIcon").style.background = p.iconBg;
  document.getElementById("confirmIcon").style.color = p.iconColor;
  document.getElementById("confirmTitle").textContent = p.title;
  document.getElementById("confirmMsg").innerHTML = p.msg(name);
  const okBtn = document.getElementById("confirmOk");
  okBtn.textContent = p.okText;
  okBtn.className = "btn-confirm-ok " + p.okStyle;
  okBtn.onclick = function() {
    closeConfirm();
    window.location.href = href;
  };
  ov.classList.add("open");
};

window.closeConfirm = function() {
  const ov = document.getElementById("confirmOv");
  if (ov) ov.classList.remove("open");
};

// ── Tab switcher ──────────────────────────────────────────────
const TAB_IDS = ["scan", "lb", "log"];

const switchTab = (id) => {
  document.querySelectorAll(".tab-row .tab").forEach((btn, i) =>
    btn.classList.toggle("on", TAB_IDS[i] === id)
  );
  document.querySelectorAll(".tab-body").forEach((panel) =>
    panel.classList.remove("on")
  );
  document.getElementById(`tab-${id}`)?.classList.add("on");
};

// ── Escape HTML ───────────────────────────────────────────────
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ── WA icon SVG ───────────────────────────────────────────────
const WA_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.103 1.508 5.827L0 24l6.335-1.482A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.214-3.732.873.916-3.641-.235-.374A9.818 9.818 0 1112 21.818z"/>
</svg>`;

// ── Render helpers ────────────────────────────────────────────

const renderScan = ({ nama, kode, jam }) =>
  `<div class="list-item">
    <div class="list-main">
      <div class="list-name">${esc(nama)}</div>
      <div class="list-sub">${esc(kode)}</div>
    </div>
    <span class="badge badge-green">${esc(jam)}</span>
  </div>`;

const MEDALS = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

const renderLb = ({ nama, kode, total, reward }, idx) =>
  `<div class="list-item">
    <span class="lb-rank">${MEDALS[idx] ?? idx + 1}</span>
    <div class="list-main">
      <div class="list-name">${esc(nama)}</div>
      <div class="list-sub">${esc(kode)}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="lb-score">${total} <span class="lb-score-lbl">kunjungan</span></div>
      <div style="font-size:var(--fs-xs);color:var(--txt3);margin-top:2px">${reward ?? 0}× reward</div>
    </div>
  </div>`;

const LOG_BADGE = {
  SCAN:          `<span class="badge badge-green">✓ Scan</span>`,
  BONUS_EARNED:  `<span class="badge badge-gold">🎁 Bonus Earned</span>`,
  BONUS_KLAIM:   `<span class="badge badge-gold" style="background:rgba(201,168,76,.25)">✅ Bonus Diklaim</span>`,
  BONUS_EXPIRED: `<span class="badge badge-red" style="background:rgba(239,68,68,.15);color:#f87171">⏰ Bonus Hangus</span>`,
  REWARD_GRATIS: `<span class="badge badge-gold">🎁 Reward</span>`,
  SCAN_RESET:    `<span class="badge badge-blue">↺ Reset Scan</span>`,
  EDIT_MEMBER:   `<span class="badge" style="background:rgba(38,96,164,.15);color:#2660a4">✏ Edit Member</span>`,
  DELETE_MEMBER: `<span class="badge badge-red" style="background:rgba(163,45,45,.15);color:#a32d2d">🗑 Hapus Member</span>`,
  RESET_QR:      `<span class="badge" style="background:rgba(196,127,26,.15);color:#c47f1a">🔄 Reset QR</span>`,
};

const renderLog = ({ nama, aksi, detail, tgl }) => {
  // Fallback: tampilkan aksi mentah (bukan default ke 'Scan' yg misleading)
  const badge = LOG_BADGE[aksi]
    || `<span class="badge" style="background:var(--surface2);color:var(--txt2)">${esc(aksi || "—")}</span>`;
  return `<div class="list-item">
    <div class="list-main">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span class="list-name">${esc(nama)}</span>${badge}
      </div>
      <div style="font-size:var(--fs-xs);color:var(--txt3);margin-top:3px">${esc(detail)}</div>
    </div>
    <span style="font-size:var(--fs-xs);color:var(--txt3);flex-shrink:0;text-align:right">${esc(tgl)}</span>
  </div>`;
};

const AVATAR_COLORS = ["green", "amber", "blue", "teal"];
const avatarColor = (nama) => AVATAR_COLORS[
  (nama || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length
];
const initials = (nama) => {
  const w = (nama || "").trim().split(/\s+/).slice(0, 2);
  return w.map((x) => (x[0] || "").toUpperCase()).join("");
};

const renderMemberRow = (m, idx) => {
  const isBonus  = m.status === "BONUS";
  const isVip    = (m.totalMain ?? 0) >= BATAS;
  const baseUrl  = (HOST || "").replace("http://", "https://");
  const scanUrl  = baseUrl + "/scan?id=" + m.kode;
  const shareUrl = baseUrl + "/member/" + m.kode;
  const dlUrl    = "/admin/qr/" + m.kode + "?tk=" + TK;
  const imgUrl   = "/admin/qr-img/" + m.kode + "?tk=" + TK;
  const waNum    = (m.telepon ?? "").replace(/[^0-9]/g, "");
  const safeNama = m.nama.replace(/'/g, "\\'");
  const qrClick  = `openModal('${m.kode}','${safeNama}','${scanUrl}','${dlUrl}','${imgUrl}')`;
  const color    = avatarColor(m.nama);

  const waShareMsg = encodeURIComponent(
    "Halo " + m.nama + "! Ini kartu member billiard kamu.\n" +
    "Tunjukkan QR ini ke kasir tiap mau main: " + shareUrl
  );

  const tipeBadge = isBonus
    ? `<span class="badge badge-gold" style="display:inline-flex;align-items:center;gap:4px"><i class="ti ti-gift" style="font-size:10px"></i>Bonus!</span>`
    : `<span class="badge badge-regular">Regular</span>`;

  const statusHtml = isBonus
    ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.35);color:#C9A84C"><i class="ti ti-gift" style="font-size:11px"></i>Bonus</span>`
    : m.aktif
      ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;background:var(--green-bg);border:1px solid rgba(45,102,36,.25);color:var(--accent)"><i class="ti ti-circle-check" style="font-size:11px"></i>Aktif</span>`
      : `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;background:var(--red-bg);border:1px solid rgba(184,48,48,.25);color:var(--red)"><i class="ti ti-circle-x" style="font-size:11px"></i>Tidak Aktif</span>`;

  const hadirDot = m.sudahScan
    ? `<span title="Hadir hari ini" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-left:5px;vertical-align:middle"></span>`
    : "";

  const bonusExpiry = isBonus && m.bonusSisaHari !== null
    ? `<div style="font-size:10px;color:#f59e0b;margin-top:2px">⏳ Hangus ${m.bonusSisaHari}h lagi</div>`
    : "";

  const resetQrUrl     = `/admin/reset-qr?tk=${TK}&kode=${m.kode}`;
  const resetQrConfirm = `return confirm('Reset QR member ${safeNama}? Kode lama tidak bisa dipakai lagi.')`;
  const klaimUrl       = `/admin/klaim?tk=${TK}&kode=${m.kode}`;
  const klaimConfirm   = `return confirm('Klaim bonus ${safeNama}? Progress sesi akan direset ke 0.')`;

  const rowStyle = isBonus
    ? `grid-template-columns:40px 1fr 110px 110px 90px 110px 200px;background:rgba(201,168,76,.06);border-left:3px solid #C9A84C`
    : `grid-template-columns:40px 1fr 110px 110px 90px 110px 200px`;

  const hapusUrl = `/admin/hapus?tk=${TK}&kode=${m.kode}`;

  return `<div class="tbl-row" style="${rowStyle}">
    <div class="tbl-td"><span class="row-num">${idx + 1}</span></div>
    <div class="tbl-td">
      <div class="m-cell">
        <div class="m-av ${color}">${initials(m.nama)}</div>
        <div>
          <div class="m-nm">${esc(m.nama)}${hadirDot}</div>
          <div class="m-id">${esc(m.kode)}</div>
          ${bonusExpiry}
        </div>
      </div>
    </div>
    <div class="tbl-td">${tipeBadge}</div>
    <div class="tbl-td muted" style="font-size:12px">${esc(m.tglDaftar)}</div>
    <div class="tbl-td">${statusHtml}</div>
    <div class="tbl-td r" style="font-size:12px;color:var(--txt2)">${m.tglTerakhir === '—' ? '<span style="color:var(--txt3)">—</span>' : m.tglTerakhir}</div>
    <div class="tbl-td r">
      <div class="act-cell">
        ${isBonus ? `<a href="${klaimUrl}" data-confirm="klaim" data-name="${esc(m.nama)}" data-href="${klaimUrl}" onclick="confirmAction(this);return false" class="icon-btn" data-tip="Klaim Bonus" style="background:#C9A84C;color:#000;font-weight:700;font-size:13px">🎁</a>` : ""}
        <button class="icon-btn" data-tip="Lihat QR" onclick="${qrClick}">
          <i class="ti ti-qrcode"></i>
        </button>
        ${waNum ? `<a href="https://wa.me/?text=${waShareMsg}" target="_blank" rel="noopener" class="icon-btn" data-tip="Kirim ke WhatsApp" style="background:#25d366;color:#fff;border-radius:7px">${WA_SVG}</a>` : ""}
        <a href="${resetQrUrl}" data-confirm="resetqr" data-name="${esc(m.nama)}" data-href="${resetQrUrl}" onclick="confirmAction(this);return false" class="icon-btn" data-tip="Reset QR (kartu hilang)">
          <i class="ti ti-refresh"></i>
        </a>
        <a href="/admin/edit?tk=${TK}&kode=${m.kode}" class="icon-btn" data-tip="Edit data member">
          <i class="ti ti-edit"></i>
        </a>
        <a href="${hapusUrl}" data-confirm="hapus" data-name="${esc(m.nama)}" data-href="${hapusUrl}" onclick="confirmAction(this);return false" class="icon-btn danger" data-tip="Hapus member">
          <i class="ti ti-trash"></i>
        </a>
      </div>
    </div>
  </div>`;
};

// ── Mobile member card ────────────────────────────────────────
const renderMemberCard = (m) => {
  const isBonus  = m.status === "BONUS";
  const isGratis = m.status === "GRATIS";
  const pct      = Math.min(Math.round((m.totalMain ?? 0) / BATAS * 100), 100);
  const baseUrl  = (HOST || "").replace("http://", "https://");
  const scanUrl  = (HOST || "") + "/scan?id=" + m.kode;
  const shareUrl = baseUrl + "/member/" + m.kode;
  const imgUrl   = "/admin/qr-img/" + m.kode + "?tk=" + TK;
  const dlUrl    = "/admin/qr/" + m.kode + "?tk=" + TK;
  const safeNama = m.nama.replace(/'/g, "\\'");
  const qrClick  = `openModal('${m.kode}','${safeNama}','${scanUrl}','${dlUrl}','${imgUrl}')`;
  const waNum    = (m.telepon ?? "").replace(/[^0-9]/g, "");
  const waShareMsg = encodeURIComponent(
    "Halo " + m.nama + "! Ini kartu member billiard kamu.\n"
    + "Tunjukkan QR ini ke kasir tiap mau main: " + shareUrl
  );

  // Status aktif/tidak aktif (scan < 2 bulan)
  const aktifBadge = m.aktif
    ? `<span class="badge badge-green" style="font-size:10px">● Aktif</span>`
    : `<span class="badge badge-inactive" style="font-size:10px;background:var(--surface2);color:var(--txt3)">● Tidak Aktif</span>`;
  const hadirBadge = m.sudahScan
    ? `<span class="badge badge-blue" style="font-size:10px">✓ Hadir</span>`
    : "";
  const gratisBadge = isBonus
    ? `<span class="badge badge-gold" style="font-size:10px">🎁 Bonus!</span>`
    : isGratis
      ? `<span class="badge badge-gold" style="font-size:10px">🎁 Reward</span>`
      : "";

  const bonusExpiryMc = isBonus && m.bonusSisaHari !== null
    ? `<div style="font-size:10px;color:#f59e0b;margin-top:4px;text-align:center">⏳ Hangus dalam ${m.bonusSisaHari} hari</div>`
    : "";

  const klaimUrlMc = `/admin/klaim?tk=${TK}&kode=${m.kode}`;
  const resetQrUrlMc = `/admin/reset-qr?tk=${TK}&kode=${m.kode}`;
  const hapusUrlMc   = `/admin/hapus?tk=${TK}&kode=${m.kode}`;

  const klaimBtn = (isBonus || isGratis)
    ? `<a href="${klaimUrlMc}" data-confirm="klaim" data-name="${esc(m.nama)}" data-href="${klaimUrlMc}" onclick="confirmAction(this);return false" class="mc-btn mc-btn-gold">🎁 Klaim Bonus</a>`
    : "";

  const waBtn = waNum
    ? `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener" class="mc-btn mc-btn-wa">WA</a>`
    : "";

  const waShareBtn = `<a href="https://wa.me/?text=${waShareMsg}" target="_blank" rel="noopener"
      class="mc-btn mc-btn-wa">📤 Kirim QR</a>`;

  const resetQrMcBtn = `<a href="${resetQrUrlMc}" data-confirm="resetqr" data-name="${esc(m.nama)}" data-href="${resetQrUrlMc}" onclick="confirmAction(this);return false" class="mc-btn">🔄 Reset QR</a>`;

  return `<div class="mc ${m.aktif ? "aktif" : "nonaktif"}">
    <div class="mc-top">
      <img src="${imgUrl}" alt="QR" class="mc-qr" loading="lazy" onclick="${qrClick}">
      <div class="mc-body">
        <div class="mc-name">${esc(m.nama)}</div>
        <div class="mc-kode">${esc(m.kode)}</div>
        <div class="mc-prog">
          <div class="mc-prog-track"><div class="mc-prog-fill" style="width:${pct}%"></div></div>
          <span class="mc-prog-txt">${m.totalMain}/${BATAS}</span>
        </div>
        <div class="mc-badges">${aktifBadge}${hadirBadge}${gratisBadge}</div>
        ${bonusExpiryMc}
      </div>
      <div class="mc-right">
        <button onclick="${qrClick}" class="mc-btn mc-btn-qr" style="padding:8px 14px;font-size:18px">QR</button>
      </div>
    </div>
    <div class="mc-btm">
      ${waShareBtn}
      ${waBtn}
      ${resetQrMcBtn}
      ${klaimBtn}
      <a href="/admin/edit?tk=${TK}&kode=${m.kode}" class="mc-btn">Edit</a>
      <a href="${hapusUrlMc}" data-confirm="hapus" data-name="${esc(m.nama)}" data-href="${hapusUrlMc}" onclick="confirmAction(this);return false" class="mc-btn mc-btn-red">Hapus</a>
    </div>
  </div>`;
};

// ── Simple list dengan "Lihat semua" button ───────────────────
const initSimpleList = (data, listId, btnId, renderFn) => {
  const listEl = document.getElementById(listId);
  const btnEl  = document.getElementById(btnId);
  if (!listEl) return;

  let expanded = false;
  const LIMIT  = 10;

  const draw = () => {
    if (data.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><i class="ti ti-inbox"></i>Tidak ada data</div>`;
      btnEl && (btnEl.style.display = "none");
      return;
    }
    const slice = expanded ? data : data.slice(0, LIMIT);
    listEl.innerHTML = slice.map((d, i) => renderFn(d, i)).join("");

    if (btnEl) {
      btnEl.style.display = data.length <= LIMIT ? "none" : "block";
      btnEl.textContent   = expanded
        ? `Sembunyikan (${data.length} item)`
        : `Lihat semua ${data.length} item`;
    }
  };

  btnEl?.addEventListener("click", () => { expanded = !expanded; draw(); });
  draw();
};

// ── Member tabel pagination ───────────────────────────────────
const memberState = {
  filtered: Array.isArray(DATA_MEMBER) ? [...DATA_MEMBER] : [],
  page:     1,
  perPage:  10,
};

const renderMemberTable = () => {
  const { filtered, page, perPage } = memberState;
  const total  = filtered.length;
  const pages  = Math.max(1, Math.ceil(total / perPage));
  const start  = (page - 1) * perPage;
  const slice  = filtered.slice(start, start + perPage);

  const tbody   = document.getElementById("tbody");
  const emptyEl = document.getElementById("tbl-empty");

  if (total === 0) {
    tbody.innerHTML       = "";
    emptyEl.style.display = "block";
  } else {
    tbody.innerHTML       = slice.map(renderMemberRow).join("");
    emptyEl.style.display = "none";
  }

  // Mobile card list
  const mobileList = document.getElementById("mobile-list");
  if (mobileList) {
    if (total === 0) {
      mobileList.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--txt3);font-size:13px">Tidak ada member yang cocok</div>`;
    } else {
      mobileList.innerHTML = slice.map(renderMemberCard).join("");
    }
  }

  // Badge jumlah
  const badge = document.getElementById("member-badge");
  if (badge) {
    badge.style.display = "inline-flex";
    badge.textContent   = `${total} member`;
  }

  // Pagination bar
  const pgEl = document.getElementById("member-pg");
  if (!pgEl) return;
  if (total <= perPage) { pgEl.style.display = "none"; pgEl.innerHTML = ""; return; }
  pgEl.style.display = "flex";

  const buildPageRange = (cur, max) => {
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "…", max];
    if (cur >= max - 3) return [1, "…", max - 4, max - 3, max - 2, max - 1, max];
    return [1, "…", cur - 1, cur, cur + 1, "…", max];
  };

  const pageBtns = buildPageRange(page, pages)
    .map((p) =>
      p === "…"
        ? `<span class="tbl-pg-btn disable">…</span>`
        : `<button class="tbl-pg-btn ${p === page ? "active" : ""}" onclick="goPage(${p})">${p}</button>`
    ).join("");

  pgEl.innerHTML = `
    <div class="tbl-pg-info">Menampilkan ${start + 1}–${Math.min(start + perPage, total)} dari ${total} member</div>
    <div class="tbl-pg-btns">
      <button class="tbl-pg-btn ${page === 1 ? "disable" : ""}" onclick="goPage(${page - 1})">
        <i class="ti ti-chevron-left" style="font-size:13px"></i>
      </button>
      ${pageBtns}
      <button class="tbl-pg-btn ${page === pages ? "disable" : ""}" onclick="goPage(${page + 1})">
        <i class="ti ti-chevron-right" style="font-size:13px"></i>
      </button>
    </div>`;
};

const goPage = (p) => {
  const pages = Math.ceil(memberState.filtered.length / memberState.perPage);
  memberState.page = Math.max(1, Math.min(p, pages));
  renderMemberTable();
};

const changePerPage = (n) => {
  memberState.perPage = n;
  memberState.page    = 1;
  renderMemberTable();
};

// ── Filter member ─────────────────────────────────────────────
const filterMember = () => {
  const q      = (document.getElementById("cari")?.value ?? "").toLowerCase().trim();
  const bulan  = document.getElementById("filterBulan")?.value ?? "";
  const status = document.getElementById("filterStatus")?.value ?? "";

  memberState.filtered = DATA_MEMBER.filter((m) => {
    const matchQ = !q || `${m.nama}${m.kode}${m.telepon ?? ""}`.toLowerCase().includes(q);
    const matchB = !bulan || m.bulanScan === bulan;
    const matchS =
      status === "hadir"    ? m.sudahScan :
      status === "gratis"   ? m.status === "BONUS" || m.status === "GRATIS" :
      status === "aktif"    ? m.aktif === true :
      status === "nonaktif" ? m.aktif === false :
      true;
    return matchQ && matchB && matchS;
  });

  memberState.page = 1;
  renderMemberTable();

  const summary  = document.getElementById("tbl-summary");
  const hasFilter = q || bulan || status;
  if (summary) {
    summary.style.display = hasFilter ? "flex" : "none";
    if (hasFilter) {
      summary.innerHTML = `
        <span>Menampilkan <strong>${memberState.filtered.length}</strong> dari <strong>${DATA_MEMBER.length}</strong> member</span>
        <button onclick="resetFilter()" class="tbl-btn" style="padding:2px 8px">&#10005; Reset</button>`;
    }
  }
};

const resetFilter = () => {
  ["cari", "filterBulan", "filterStatus"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filterMember();
};

// ── Copy URL ──────────────────────────────────────────────────
const copyUrl = (url, btn) => {
  navigator.clipboard?.writeText(url).then(() => {
    const prev = btn.textContent;
    btn.textContent = "✓";
    showToast();
    setTimeout(() => { btn.textContent = prev; }, 1800);
  });
};

const showToast = () => {
  const toast = document.getElementById("toast");
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 1800);
};

// ── Modal QR ──────────────────────────────────────────────────
let _modalUrl  = "";
let _openedAt  = 0;          // waktu openModal dipanggil
let _pendingQr = null;       // data postMessage yang menunggu

const MIN_LOADER_MS = 450;   // loader minimal tampil 450ms

// Terapkan card (sembunyikan loader, tampilkan iframe)
const _applyCard = (qrH) => {
  const frame  = document.getElementById("modalFrame");
  const loader = document.getElementById("modalLoader");
  if (frame) {
    frame.style.height  = (qrH + 8) + "px";
    frame.style.opacity = "1";
  }
  if (loader) loader.classList.add("done");
};

// Terima tinggi dari iframe via postMessage
window.addEventListener("message", (e) => {
  if (e.data && typeof e.data.qrH === "number") {
    const elapsed = Date.now() - _openedAt;
    const wait    = Math.max(0, MIN_LOADER_MS - elapsed);
    if (wait > 0) {
      // Card siap tapi loader belum cukup tampil → tunda
      _pendingQr = e.data.qrH;
      setTimeout(() => { if (_pendingQr !== null) { _applyCard(_pendingQr); _pendingQr = null; } }, wait);
    } else {
      _applyCard(e.data.qrH);
    }
  }
});

const openModal = (kode, nama, scanUrl, dlUrl, imgUrl) => {
  _modalUrl  = scanUrl;
  _openedAt  = Date.now();
  _pendingQr = null;

  // Reset: tampilkan loader, sembunyikan iframe
  const frame  = document.getElementById("modalFrame");
  const loader = document.getElementById("modalLoader");
  if (loader) { loader.classList.remove("done"); }
  frame.style.opacity = "0";
  frame.style.height  = "0";
  frame.src = `/admin/qr-view/${kode}?tk=${TK}`;

  document.getElementById("modalName").textContent = "";
  document.getElementById("modalKode").textContent = "";

  const dlEl = document.getElementById("modalDl");
  dlEl.href  = `/admin/qr/${kode}?tk=${TK}`;
  dlEl.setAttribute("download", `Kartu-${kode}.html`);

  const shareUrl = scanUrl.replace('/scan?id=', '/member/').replace('http://', 'https://');
  const msg = encodeURIComponent('Halo ' + nama + '! Ini kartu member billiard kamu.\nTunjukkan QR ini ke kasir tiap mau main: ' + shareUrl);
  document.getElementById("modalWa").href = `https://wa.me/?text=${msg}`;

  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
};

const closeModal = () => {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
};

const copyModal = () => {
  navigator.clipboard?.writeText(_modalUrl).then(() => {
    const btn = document.getElementById("modalCopy") ?? document.querySelector(".modal-btn-copy");
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "✓ Disalin!";
      setTimeout(() => { btn.textContent = prev; }, 2000);
    }
    showToast();
  });
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ── Expose globals yang dipanggil dari inline HTML ─────────────
Object.assign(window, {
  toggleTheme, switchTab, filterMember, resetFilter,
  goPage, changePerPage, copyUrl, openModal, closeModal, copyModal,
});

// ── Init ───────────────────────────────────────────────────────
initSimpleList(DATA_SCAN || [], "scan-list", "scan-showbtn", renderScan);
initSimpleList(DATA_LB   || [], "lb-list",   "lb-showbtn",   renderLb);
initSimpleList(DATA_LOG  || [], "log-list",  "log-showbtn",  renderLog);
if (document.getElementById('tbody')) {
  // Reset semua filter ke default agar tidak ada browser-saved value yang auto-filter
  ["cari", "filterBulan", "filterStatus"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filterMember();
}
