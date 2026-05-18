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

// ── Member detail modal ──────────────────────────────────────
const formatRiwTime = (ts) => {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const tgl = d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric", timeZone:"Asia/Jakarta" });
    const jam = d.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", timeZone:"Asia/Jakarta" });
    return tgl + " · " + jam;
  } catch (_) { return String(ts); }
};

const formatDateOnly = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"2-digit", timeZone:"Asia/Jakarta" });
  } catch (_) { return String(s); }
};

let currentDetailMember = null;

window.openMemberDetail = function(kode) {
  if (!Array.isArray(DATA_MEMBER)) return;
  const m = DATA_MEMBER.find((x) => x.kode === kode);
  if (!m) return;
  currentDetailMember = m;

  const isBonus = m.status === "BONUS";
  const isGratis = m.status === "GRATIS";
  const isVip = (m.totalMain || 0) >= BATAS;
  const waNum = (m.telepon || "").replace(/[^0-9]/g, "");

  // Avatar initials
  const ini = m.nama.trim().split(/\s+/).slice(0, 2).map((w) => (w[0] || "").toUpperCase()).join("");
  document.getElementById("dtAv").textContent = ini || "?";
  document.getElementById("dtNm").textContent = m.nama;
  document.getElementById("dtCd").textContent = m.kode;
  document.getElementById("dtKode").textContent = m.kode;

  // Badges
  const badges = [];
  badges.push(m.aktif
    ? `<span class="dt-b aktif"><i class="ti ti-point-filled"></i>Aktif</span>`
    : `<span class="dt-b off"><i class="ti ti-point-filled"></i>Tidak Aktif</span>`);
  if (isBonus)       badges.push(`<span class="dt-b bonus">🎁 Bonus</span>`);
  else if (isGratis) badges.push(`<span class="dt-b bonus">🎁 Reward</span>`);
  else if (isVip)    badges.push(`<span class="dt-b vip">👑 VIP</span>`);
  else               badges.push(`<span class="dt-b reg">Regular</span>`);
  document.getElementById("dtBadges").innerHTML = badges.join("");

  // Stats
  document.getElementById("dtKunjungan").textContent = m.totalMain || 0;
  document.getElementById("dtBergabung").textContent = m.tglDaftar || "—";
  document.getElementById("dtTerakhir").textContent  = m.tglTerakhir || "—";

  // Phone
  const phoneEl = document.getElementById("dtPhone");
  const phoneWa = document.getElementById("dtPhoneWa");
  if (m.telepon) {
    phoneEl.textContent = m.telepon;
    phoneEl.classList.add("link");
    phoneEl.classList.remove("muted");
    if (waNum) {
      phoneWa.onclick = function() { return openWA(waNum, ""); };
      phoneWa.removeAttribute("href");
      phoneWa.style.cursor = "pointer";
      phoneWa.style.display = "";
    } else {
      phoneWa.style.display = "none";
    }
  } else {
    phoneEl.textContent = "Belum diisi";
    phoneEl.classList.remove("link");
    phoneEl.classList.add("muted");
    phoneWa.style.display = "none";
  }

  // Reward stats: total didapat (lifetime) + status terbaru
  const claimed = m.totalGratis || 0;
  const pending = isBonus ? 1 : 0;
  const totalReward = claimed + pending;
  document.getElementById("dtRewardTotal").innerHTML = totalReward > 0
    ? `<span>${totalReward}× reward</span>` + (totalReward > 0
        ? ` <span style="color:#aaa;font-weight:400;font-size:11px">· ${claimed} diklaim, ${pending} pending</span>`
        : "")
    : `<span style="color:#bbb;font-weight:400">Belum ada</span>`;

  let statusHtml;
  if (pending > 0) {
    statusHtml = `<span class="dt-status warn"><i class="ti ti-clock"></i>Belum Diklaim</span>`;
  } else if (claimed > 0) {
    statusHtml = `<span class="dt-status ok"><i class="ti ti-circle-check-filled"></i>Sudah Diklaim Semua</span>`;
  } else {
    statusHtml = `<span class="dt-status muted">—</span>`;
  }
  document.getElementById("dtRewardStatus").innerHTML = statusHtml;

  // Bonus expiry warning
  const warnEl = document.getElementById("dtBonusWarn");
  if (isBonus && m.bonusSisaHari !== null && m.bonusSisaHari !== undefined) {
    warnEl.innerHTML = `<div class="dt-exp-warn bonus">
      <i class="ti ti-clock-exclamation"></i>
      <p>Bonus belum diklaim — hangus dalam <strong>${m.bonusSisaHari} hari</strong></p>
    </div>`;
  } else {
    warnEl.innerHTML = "";
  }

  // Riwayat dari DATA_LOG (filter SCAN untuk member ini, max 10)
  const riv = (Array.isArray(DATA_LOG) ? DATA_LOG : [])
    .filter((l) => l.kode === m.kode && l.aksi === "SCAN")
    .slice(0, 10);
  const rivEl = document.getElementById("dtRiwayat");
  if (riv.length === 0) {
    rivEl.innerHTML = `<div class="dt-empty">
      <i class="ti ti-calendar-off"></i>
      <p>Belum ada riwayat kunjungan</p>
    </div>`;
  } else {
    rivEl.innerHTML = riv.map((l, i) => `<div class="dt-riv-item">
      <div class="dt-riv-dot"></div>
      <div class="dt-riv-body">
        <p class="dt-riv-label">${esc(l.detail || "Kunjungan ke-" + (riv.length - i))}</p>
        <p class="dt-riv-time">${esc(l.tgl || "")}</p>
      </div>
    </div>`).join("");
  }

  // Footer actions — direct chat ke nomor member via openWA() helper
  const waBtn = document.getElementById("dtBtnWa");
  if (waNum) {
    const baseUrl  = (HOST || "").replace("http://", "https://");
    const shareUrl = baseUrl + "/member/" + m.kode;
    const msg = encodeURIComponent("Halo " + m.nama + "! Ini kartu member billiard kamu.\nTunjukkan QR ini ke kasir tiap mau main: " + shareUrl);
    waBtn.onclick = function() { return openWA(waNum, msg); };
    waBtn.removeAttribute("href");
    waBtn.style.cursor = "pointer";
    waBtn.style.display = "";
  } else {
    waBtn.style.display = "none";
  }

  const baseUrl = (HOST || "").replace("http://", "https://");
  const scanUrl = baseUrl + "/scan?id=" + m.kode;
  const dlUrl   = "/admin/qr/"     + m.kode + "?tk=" + TK;
  const imgUrl  = "/admin/qr-img/" + m.kode + "?tk=" + TK;
  const safeNama = m.nama.replace(/'/g, "\\'");
  document.getElementById("dtBtnQr").onclick = function() {
    closeMemberDetail();
    openModal(m.kode, safeNama, scanUrl, dlUrl, imgUrl);
  };
  const resetBtn = document.getElementById("dtBtnReset");
  const resetUrl = "/admin/reset-qr?tk=" + TK + "&kode=" + m.kode;
  resetBtn.href = resetUrl;
  resetBtn.dataset.confirm = "resetqr";
  resetBtn.dataset.name = m.nama;
  resetBtn.dataset.href = resetUrl;
  resetBtn.onclick = function() { closeMemberDetail(); confirmAction(this); return false; };

  // Pastikan modal kembali ke view mode (kalau sebelumnya ditutup saat edit)
  cancelDetailEdit();
  document.getElementById("memberDetailOv").classList.add("open");
};

window.closeMemberDetail = function() {
  const ov = document.getElementById("memberDetailOv");
  if (ov) ov.classList.remove("open");
  currentDetailMember = null;
};

// ── Inline edit member (di dalam modal detail) ────────────────
window.startDetailEdit = function() {
  const m = currentDetailMember;
  if (!m) return;
  // Sembunyikan view mode
  document.getElementById("dtBody").style.display = "none";
  document.getElementById("dtFtView").style.display = "none";
  // Tampilkan edit form + footer edit
  document.getElementById("dtEditForm").style.display = "";
  document.getElementById("dtFtEdit").style.display = "";
  // Populate fields
  document.getElementById("dtEditNama").value = m.nama || "";
  document.getElementById("dtEditTlp").value  = (m.telepon || "").replace(/[^0-9]/g, "").replace(/^62/, "");
  setTimeout(function() { document.getElementById("dtEditNama").focus(); }, 100);
};

window.cancelDetailEdit = function() {
  document.getElementById("dtBody").style.display = "";
  document.getElementById("dtFtView").style.display = "";
  document.getElementById("dtEditForm").style.display = "none";
  document.getElementById("dtFtEdit").style.display = "none";
};

window.saveDetailEdit = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const m = currentDetailMember;
  if (!m) return;
  const nama = document.getElementById("dtEditNama").value.trim();
  const tlp  = document.getElementById("dtEditTlp").value.trim();
  if (!nama) {
    alert("Nama wajib diisi.");
    document.getElementById("dtEditNama").focus();
    return;
  }
  // Submit via redirect URL — backend save lalu redirect kembali ke /admin/members
  const url = "/admin/edit?tk=" + encodeURIComponent(TK)
    + "&kode=" + encodeURIComponent(m.kode)
    + "&nama=" + encodeURIComponent(nama)
    + "&tlp="  + encodeURIComponent(tlp);
  window.location.href = url;
};

// ── Tab switcher ──────────────────────────────────────────────
const TAB_IDS = ["scan", "lb", "log"];

const switchTab = (id) => {
  // Support both old (.tab) and new (.tab-btn) markup
  document.querySelectorAll(".tab-row .tab, .tab-row .tab-btn").forEach((btn, i) =>
    btn.classList.toggle("on", TAB_IDS[i] === id)
  );
  // Support both old (.tab-body) and new (.log-panel) markup
  document.querySelectorAll(".tab-body, .log-panel").forEach((panel) =>
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

// ── WA opener — JS-driven biar reliable di Samsung Internet / A07 ─
// Strategi: coba whatsapp:// (direct app scheme) dulu, fallback ke
// api.whatsapp.com kalau gagal. Encode otomatis pesan + URL.
window.openWA = function(num, msg) {
  num = String(num || "").replace(/\D/g, "");
  msg = msg || "";
  if (!num) return false;
  const apiUrl = "https://api.whatsapp.com/send?phone=" + num + (msg ? "&text=" + msg : "");
  // window.open dalam user-event handler — lebih reliable trigger
  // app intent di Samsung Internet daripada <a target=_blank>.
  const w = window.open(apiUrl, "_blank");
  if (!w) window.location.href = apiUrl; // fallback bila popup blocker
  return false;
};

// ── Render helpers ────────────────────────────────────────────

// Helper: initials dari nama (max 2 huruf)
const logInitials = (s) => {
  const w = (s || "").trim().split(/\s+/).slice(0, 2);
  return w.map((x) => (x[0] || "").toUpperCase()).join("") || "?";
};

const renderScan = ({ nama, kode, jam }) =>
  `<div class="log-item">
    <div class="log-av">${logInitials(nama)}</div>
    <div class="log-body">
      <div class="log-name">${esc(nama)} <span class="chip ch-scan">Scan</span></div>
      <div class="log-sub">${esc(kode)}</div>
    </div>
    <div class="log-time">${esc(jam)}</div>
  </div>`;

const renderLb = ({ nama, kode, total, reward }, idx) => {
  const rankCls = idx === 0 ? " gold" : idx === 1 ? " silver" : idx === 2 ? " bronze" : "";
  const isEmpty = total === 0;
  const ptsCls = isEmpty ? " muted" : "";
  const avCls  = isEmpty ? " muted" : "";
  return `<div class="lb-item">
    <div class="lb-rank${rankCls}">${idx + 1}</div>
    <div class="lb-av${avCls}">${logInitials(nama)}</div>
    <div class="lb-info">
      <div class="lb-name">${esc(nama)}</div>
      <div class="lb-sub">${total} kunjungan${reward ? " · " + reward + "× reward" : ""}</div>
    </div>
    <div class="lb-pts${ptsCls}">${total} pts</div>
  </div>`;
};

// Mapping aksi -> chip class + label
const LOG_CHIP = {
  SCAN:          { cls: "ch-scan",   label: "Scan" },
  BONUS_EARNED:  { cls: "ch-bonus",  label: "Bonus Earned" },
  BONUS_KLAIM:   { cls: "ch-bonus",  label: "Bonus Diklaim" },
  BONUS_EXPIRED: { cls: "ch-hapus",  label: "Bonus Hangus" },
  REWARD_GRATIS: { cls: "ch-reward", label: "Reward" },
  SCAN_RESET:    { cls: "ch-reset",  label: "Reset Scan" },
  EDIT_MEMBER:   { cls: "ch-edit",   label: "Edit Member" },
  DELETE_MEMBER: { cls: "ch-hapus",  label: "Hapus" },
  RESET_QR:      { cls: "ch-reset",  label: "Reset QR" },
};

const renderLog = ({ nama, aksi, detail, tgl }) => {
  const c = LOG_CHIP[aksi] || { cls: "ch-reset", label: aksi || "—" };
  return `<div class="log-item">
    <div class="log-av">${logInitials(nama)}</div>
    <div class="log-body">
      <div class="log-name">${esc(nama)} <span class="chip ${c.cls}">${esc(c.label)}</span></div>
      ${detail ? `<div class="log-sub">${esc(detail)}</div>` : ""}
    </div>
    <div class="log-time">${esc(tgl)}</div>
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
  const qrClick  = `openModal('${m.kode}','${safeNama}','${scanUrl}','${dlUrl}','${imgUrl}','${waNum || ""}')`;
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
      <div class="m-cell clickable" data-tip="Lihat detail member" onclick="openMemberDetail('${m.kode}')">
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
        ${waNum ? `<button type="button" onclick="openWA('${waNum}','${waShareMsg}')" class="icon-btn" data-tip="Kirim ke WhatsApp" style="background:#25d366;color:#fff;border-radius:7px;font-size:16px"><i class="ti ti-brand-whatsapp" style="pointer-events:none"></i></button>` : ""}
        <a href="${resetQrUrl}" data-confirm="resetqr" data-name="${esc(m.nama)}" data-href="${resetQrUrl}" onclick="confirmAction(this);return false" class="icon-btn" data-tip="Reset QR (kartu hilang)">
          <i class="ti ti-refresh"></i>
        </a>
        <button type="button" class="icon-btn" data-tip="Edit data member" onclick="openMemberDetail('${m.kode}');setTimeout(startDetailEdit,30)">
          <i class="ti ti-edit"></i>
        </button>
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
  const waNum    = (m.telepon ?? "").replace(/[^0-9]/g, "");
  const qrClick  = `openModal('${m.kode}','${safeNama}','${scanUrl}','${dlUrl}','${imgUrl}','${waNum || ""}')`;
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
    ? `<button type="button" onclick="openWA('${waNum}','')" class="mc-btn mc-btn-wa">WA</button>`
    : "";

  const waShareBtn = waNum
    ? `<button type="button" onclick="openWA('${waNum}','${waShareMsg}')" class="mc-btn mc-btn-wa">📤 Kirim QR</button>`
    : "";

  const resetQrMcBtn = `<a href="${resetQrUrlMc}" data-confirm="resetqr" data-name="${esc(m.nama)}" data-href="${resetQrUrlMc}" onclick="confirmAction(this);return false" class="mc-btn">🔄 Reset QR</a>`;

  return `<div class="mc ${m.aktif ? "aktif" : "nonaktif"}">
    <div class="mc-top">
      <img src="${imgUrl}" alt="QR" class="mc-qr" loading="lazy" onclick="${qrClick}">
      <div class="mc-body" style="cursor:pointer" onclick="openMemberDetail('${m.kode}')">
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
      <button type="button" class="mc-btn" onclick="openMemberDetail('${m.kode}');setTimeout(startDetailEdit,30)">Edit</button>
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

const openModal = (kode, nama, scanUrl, dlUrl, imgUrl, waNum) => {
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
  const waEl = document.getElementById("modalWa");
  if (waNum) {
    waEl.onclick = function() { return openWA(waNum, msg); };
    waEl.removeAttribute("href");
    waEl.style.cursor = "pointer";
  } else {
    // Tanpa nomor — fallback ke api.whatsapp.com text-only (contact picker)
    waEl.onclick = null;
    waEl.href = `https://api.whatsapp.com/send?text=${msg}`;
  }

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
