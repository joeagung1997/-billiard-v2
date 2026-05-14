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

try { const saved = localStorage.getItem(THEME_KEY); if (saved) applyTheme(saved); } catch (_) {}

// ── Tab switcher ──────────────────────────────────────────────
const TAB_IDS = ["scan", "lb", "log"];

const switchTab = (id) => {
  document.querySelectorAll(".tab-btn").forEach((btn, i) =>
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

const renderLog = ({ nama, aksi, detail, tgl }) => {
  const badge =
    aksi === "REWARD_GRATIS" ? `<span class="badge badge-gold">🎁 Reward</span>` :
    aksi === "SCAN_RESET"    ? `<span class="badge badge-blue">↺ Reset</span>` :
                               `<span class="badge badge-green">✓ Scan</span>`;
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

const renderMemberRow = (m) => {
  const pct      = Math.round((m.totalMain ?? 0) / BATAS * 100);
  const isGratis = m.status === "GRATIS";
  const baseUrl  = (HOST || '').replace('http://', 'https://');
  const scanUrl  = baseUrl + '/scan?id=' + m.kode;
  const shareUrl = baseUrl + '/member/' + m.kode;
  const dlUrl    = '/admin/qr/' + m.kode + '?tk=' + TK;
  const imgUrl   = '/admin/qr-img/' + m.kode + '?tk=' + TK;
  const waNum    = (m.telepon ?? '').replace(/[^0-9]/g, '');

  // Ikon WA kecil → buka chat ke nomor member
  const waIcon = waNum
    ? '<a href="https://wa.me/' + waNum + '" target="_blank" rel="noopener"'
      + ' title="Chat WA ' + esc(m.nama) + '"'
      + ' style="display:inline-flex;align-items:center;justify-content:center;'
      + 'width:22px;height:22px;background:#25d366;border-radius:50%;'
      + 'flex-shrink:0;text-decoration:none">' + WA_SVG + '</a>'
    : '';

  // Tombol Kirim QR → share URL /member/ yang ada thumbnail preview WA
  const waShareMsg = encodeURIComponent(
    'Halo ' + m.nama + '! Ini kartu member billiard kamu.\n'
    + 'Tunjukkan QR ini ke kasir tiap mau main: ' + shareUrl
  );
  const waShareBtn = '<a href="https://wa.me/?text=' + waShareMsg + '"'
    + ' target="_blank" rel="noopener" class="tbl-btn"'
    + ' style="background:#25d366;color:#fff;border-color:#25d366;display:inline-flex;align-items:center;gap:3px">'
    + WA_SVG + ' QR</a>';

  const progressHtml = isGratis
    ? `<span class="badge badge-green">🎁 GRATIS</span>`
    : `<div>
         <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
         <span style="font-size:11px;color:var(--green)">${m.totalMain}/${BATAS}</span>
       </div>`;

  const statusHtml = m.sudahScan
    ? `<span class="badge badge-green">✓ Hadir</span>`
    : `<span style="color:var(--txt3);font-size:12px">—</span>`;

  const klaimBtn = isGratis
    ? `<a href="/admin/klaim?tk=${TK}&kode=${m.kode}"
          onclick="return confirm('Tandai reward sudah diklaim?')"
          class="tbl-btn tbl-btn-gold">Klaim</a>`
    : "";

  const safeNama = m.nama.replace(/'/g, "\\'");
  const qrClick  = `openModal('${m.kode}','${safeNama}','${scanUrl}','${dlUrl}','${imgUrl}')`;

  return `<tr>
    <td>
      <span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--green)">${esc(m.kode)}</span>
      <div style="font-size:11px;color:var(--txt3);margin-top:2px">${esc(m.tglDaftar)}</div>
    </td>
    <td>
      <div style="font-size:13px;font-weight:500;color:var(--txt)">${esc(m.nama)}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
        <span style="font-size:11px;color:var(--txt3);font-family:monospace">${esc(m.telepon || "—")}</span>
        ${waIcon}
      </div>
    </td>
    <td>${progressHtml}</td>
    <td>${statusHtml}</td>
    <td><span style="font-size:13px;font-weight:700;color:var(--gold)">${m.totalGratis ?? 0}×</span></td>
    <td style="text-align:center">
      <img src="${imgUrl}" width="52" height="52" alt="QR" loading="lazy"
           onclick="${qrClick}"
           style="border-radius:8px;background:#fff;padding:3px;display:block;
                  cursor:pointer;transition:transform .15s"
           onmouseover="this.style.transform='scale(1.1)'"
           onmouseout="this.style.transform='scale(1)'">
    </td>
    <td>
      <div style="display:flex;gap:4px;align-items:center;justify-content:flex-end;flex-wrap:wrap">
        <a href="${dlUrl}" class="tbl-btn tbl-btn-blue" download="QR-${m.kode}.svg">⬇ QR</a>
        ${waShareBtn}
        ${klaimBtn}
        <a href="/admin/edit?tk=${TK}&kode=${m.kode}" class="tbl-btn">Edit</a>
        <a href="/admin/hapus?tk=${TK}&kode=${m.kode}"
           onclick="return confirm('Hapus member ${safeNama}?')"
           class="tbl-btn tbl-btn-red">Hapus</a>
      </div>
    </td>
  </tr>`;
};

// ── Mobile member card ────────────────────────────────────────
const renderMemberCard = (m) => {
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

  const statusBadge = m.sudahScan
    ? `<span class="badge badge-green" style="font-size:10px">✓ Hadir</span>`
    : "";
  const gratisBadge = isGratis
    ? `<span class="badge badge-gold" style="font-size:10px">🎁 Reward</span>`
    : "";

  const klaimBtn = isGratis
    ? `<a href="/admin/klaim?tk=${TK}&kode=${m.kode}"
          onclick="return confirm('Tandai reward sudah diklaim?')"
          class="mc-btn mc-btn-gold">🎁 Klaim</a>`
    : "";

  const waBtn = waNum
    ? `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener" class="mc-btn mc-btn-wa">WA</a>`
    : "";

  const waShareBtn = `<a href="https://wa.me/?text=${waShareMsg}" target="_blank" rel="noopener"
      class="mc-btn mc-btn-wa">📤 Kirim QR</a>`;

  return `<div class="mc ${m.sudahScan ? "hadir" : ""}">
    <div class="mc-top">
      <img src="${imgUrl}" alt="QR" class="mc-qr" loading="lazy" onclick="${qrClick}">
      <div class="mc-body">
        <div class="mc-name">${esc(m.nama)}</div>
        <div class="mc-kode">${esc(m.kode)}</div>
        <div class="mc-prog">
          <div class="mc-prog-track"><div class="mc-prog-fill" style="width:${pct}%"></div></div>
          <span class="mc-prog-txt">${m.totalMain}/${BATAS}</span>
        </div>
        <div class="mc-badges">${statusBadge}${gratisBadge}</div>
      </div>
      <div class="mc-right">
        <button onclick="${qrClick}" class="mc-btn mc-btn-qr" style="padding:8px 14px;font-size:18px">QR</button>
      </div>
    </div>
    <div class="mc-btm">
      ${waShareBtn}
      ${waBtn}
      ${klaimBtn}
      <a href="/admin/edit?tk=${TK}&kode=${m.kode}" class="mc-btn">Edit</a>
      <a href="/admin/hapus?tk=${TK}&kode=${m.kode}"
         onclick="return confirm('Hapus member ${safeNama}?')"
         class="mc-btn mc-btn-red">Hapus</a>
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
      listEl.innerHTML = `<div class="empty-state">Tidak ada data</div>`;
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
  if (total <= perPage) { pgEl.innerHTML = ""; return; }

  const sizeOpts = [10, 25, 50]
    .map((n) => `<option value="${n}" ${n === perPage ? "selected" : ""}>${n} / hal</option>`)
    .join("");

  const buildPageRange = (cur, max) => {
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "…", max];
    if (cur >= max - 3) return [1, "…", max - 4, max - 3, max - 2, max - 1, max];
    return [1, "…", cur - 1, cur, cur + 1, "…", max];
  };

  const pageBtns = buildPageRange(page, pages)
    .map((p) =>
      p === "…"
        ? `<span class="pg-btn" style="cursor:default">…</span>`
        : `<button class="pg-btn ${p === page ? "active" : ""}" onclick="goPage(${p})">${p}</button>`
    ).join("");

  pgEl.innerHTML = `
    <div class="pg-info">
      ${start + 1}–${Math.min(start + perPage, total)} dari ${total}
      <select class="pg-size-sel" id="pgSize" onchange="changePerPage(+this.value)">${sizeOpts}</select>
    </div>
    <div class="pg-btns">
      <button class="pg-btn" onclick="goPage(${page - 1})" ${page === 1 ? "disabled" : ""}>&#8249;</button>
      ${pageBtns}
      <button class="pg-btn" onclick="goPage(${page + 1})" ${page === pages ? "disabled" : ""}>&#8250;</button>
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
      status === "gratis"   ? m.status === "GRATIS" :
      status === "aktif"    ? (m.totalMain ?? 0) > 0 :
      status === "nonaktif" ? (m.totalMain ?? 0) === 0 && !m.sudahScan :
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
let _modalUrl = "";

const openModal = (kode, nama, scanUrl, dlUrl, imgUrl) => {
  _modalUrl = scanUrl;

  // Tampilkan branded card SVG — lebih informatif dari thumbnail biasa
  const modalImg = document.getElementById("modalImg");
  modalImg.src              = `/admin/qr-card/${kode}?tk=${TK}`;
  modalImg.style.width      = "100%";
  modalImg.style.height     = "auto";
  modalImg.style.borderRadius = "16px";
  modalImg.removeAttribute("width");
  modalImg.removeAttribute("height");

  document.getElementById("modalName").textContent = "";  // nama sudah ada di kartu
  document.getElementById("modalKode").textContent = "";  // kode sudah ada di kartu

  const dlEl = document.getElementById("modalDl");
  dlEl.href  = dlUrl;
  dlEl.setAttribute("download", `QR-${kode}.png`);

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
if (document.getElementById('tbody')) renderMemberTable();
