// src/views/qrCard.js
// ── HTML view: branded QR card v3 (dipakai di iframe modal) ──

import { CONFIG } from "../config.js";

export const qrCardPage = ({ nama, kode, totalMain, status, qrDataUrl }) => {
  const tm       = totalMain ?? 0;
  const batas    = CONFIG.BATAS_MAIN;
  const isBonus  = status === "BONUS";
  const sisaLagi = isBonus ? 0 : Math.max(0, batas - tm);

  // ── Dot progress ──────────────────────────────────────────────
  let dotsHtml = "";
  for (let i = 0; i < batas; i++) {
    const n = i + 1;
    if (isBonus)      dotsHtml += `<div class="dot-seg free"></div>`;
    else if (n <= tm) dotsHtml += `<div class="dot-seg on"></div>`;
    else              dotsHtml += `<div class="dot-seg"></div>`;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Kartu Member — ${CONFIG.NAMA_ARENA}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --gold:#C9A84C;--gold-lt:#F0D88A;--gold-dk:#7A5E1A;
  --green:#0E6B38;--green-lt:#2DB56D;--green-xlt:#5DDBA0;
  --bg:#060B08;--text:#EEF2ED;--muted:rgba(238,242,237,0.40);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{
  height:auto;
  background:var(--bg);
}
body{
  font-family:'DM Sans',sans-serif;
  background:var(--bg);
  display:flex;flex-direction:column;
  align-items:center;justify-content:flex-start;
  padding:10px 12px 8px;
  overflow:visible;
  width:100%;
  height:auto;
  min-height:0;
}
body::before{
  content:'';position:fixed;inset:0;
  background:
    radial-gradient(ellipse 80% 60% at 50% -5%,rgba(14,107,56,.14) 0%,transparent 65%),
    radial-gradient(ellipse 50% 40% at 85% 85%,rgba(201,168,76,.07) 0%,transparent 60%),
    radial-gradient(ellipse 40% 40% at 10% 75%,rgba(14,107,56,.06) 0%,transparent 60%);
  pointer-events:none;z-index:0;
}
body::after{
  content:'';position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:.5;pointer-events:none;z-index:0;
}

/* Page header */
.ph{text-align:center;margin-bottom:10px;position:relative;z-index:1;animation:fadeDown .5s ease both}
.ph-brand{font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:.3em;color:var(--gold);margin-bottom:3px}
.ph-desc{font-size:10px;color:var(--muted);font-weight:300;line-height:1.4}

/* Scene */
.scene{
  perspective:1200px;position:relative;z-index:1;
  animation:fadeUp .7s ease .1s both;
  display:flex;align-items:flex-end;
}

/* Card outer */
.card-outer{
  width:340px;border-radius:22px;position:relative;
  transition:transform .6s cubic-bezier(.23,1,.32,1);
  transform-style:preserve-3d;
}
.card-outer::before{
  content:'';position:absolute;inset:-1.5px;border-radius:23px;
  background:linear-gradient(145deg,#E8C96A 0%,#C9A84C 15%,transparent 40%,#0E6B38 70%,#2DB56D 88%,#C9A84C 100%);
  z-index:-1;
}
.card-outer::after{
  content:'';position:absolute;inset:-18px;border-radius:40px;
  background:radial-gradient(ellipse at 50% 60%,rgba(14,107,56,.22) 0%,rgba(201,168,76,.08) 45%,transparent 70%);
  z-index:-2;pointer-events:none;filter:blur(6px);
}

/* Card */
.card{
  width:340px;
  background:linear-gradient(155deg,#0A160E 0%,#06100A 50%,#050D08 100%);
  border-radius:22px;overflow:hidden;position:relative;
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.6) 25%,rgba(240,216,138,.9) 50%,rgba(45,181,109,.6) 75%,transparent);
}
.card::after{
  content:'';position:absolute;inset:0;border-radius:22px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),inset 0 -1px 0 rgba(0,0,0,.3);
  pointer-events:none;z-index:10;
}

/* Holographic strip */
.holo{
  position:absolute;top:-30px;right:-20px;
  width:160px;height:380px;
  background:linear-gradient(110deg,transparent 0%,rgba(93,219,160,.04) 20%,rgba(201,168,76,.07) 35%,rgba(93,219,160,.05) 50%,rgba(201,168,76,.04) 65%,transparent 80%);
  transform:rotate(-15deg);pointer-events:none;
  animation:holoShift 6s ease-in-out infinite;
}

/* Watermark */
.watermark{
  position:absolute;right:-24px;top:-24px;
  width:120px;height:120px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,rgba(40,40,40,.3),rgba(5,5,5,.15));
  border:1px solid rgba(255,255,255,.025);
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:48px;color:rgba(255,255,255,.022);
  pointer-events:none;overflow:hidden;
}

/* Corner deco */
.corner-deco{position:absolute;top:0;left:0;width:60px;height:60px;pointer-events:none}
.corner-deco::before{
  content:'';position:absolute;top:14px;left:14px;width:28px;height:28px;
  border-top:1px solid rgba(201,168,76,.2);border-left:1px solid rgba(201,168,76,.2);
  border-radius:2px 0 0 0;
}

/* Card face */
.card-face{padding:18px 18px 16px;position:relative}

/* Top row */
.top-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.brand-cluster{display:flex;align-items:center;gap:9px}

/* 8-ball logo */
.ball-logo{
  width:36px;height:36px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#2a2a2a,#090909);
  border:1px solid rgba(255,255,255,.08);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 12px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);
  position:relative;flex-shrink:0;
}
.ball-logo::before{
  content:'';position:absolute;inset:0;border-radius:50%;
  background:url("data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='10' fill='white'/%3E%3C/svg%3E") center/45% no-repeat;
  opacity:.92;
}
.ball-logo::after{
  content:'8';position:absolute;inset:0;
  display:flex;align-items:center;justify-content:center;
  font-family:'DM Sans',sans-serif;font-size:10px;font-weight:700;color:#111;
}
.ball-shine{position:absolute;top:5px;left:6px;width:8px;height:6px;border-radius:50%;background:rgba(255,255,255,.45);filter:blur(1px)}

.brand-name-lg{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.16em;color:var(--text);line-height:1}
.brand-sub{font-size:8px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-top:2px}

/* Chip */
.card-chip{
  width:32px;height:24px;border-radius:4px;
  background:linear-gradient(135deg,#C9A84C,#8A6A1E 40%,#C9A84C 70%,#F0D88A);
  position:relative;box-shadow:0 2px 6px rgba(0,0,0,.5);
}
.card-chip::before{
  content:'';position:absolute;inset:2.5px;border-radius:2px;
  border:.7px solid rgba(0,0,0,.3);
  background:linear-gradient(135deg,#D4AE5A,#9A7620);
}
.card-chip::after{
  content:'';position:absolute;top:50%;left:0;right:0;height:.7px;
  background:rgba(0,0,0,.25);transform:translateY(-50%);
}

/* Main row */
.main-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px}

/* QR block */
.qr-block{flex-shrink:0;position:relative}
.qr-frame{
  width:106px;height:106px;background:#fff;border-radius:9px;padding:7px;
  box-shadow:0 0 0 1px rgba(201,168,76,.3),0 6px 24px rgba(0,0,0,.6);
  position:relative;
}
.qr-frame::before,.qr-frame::after,.qr-c1,.qr-c2{
  content:'';position:absolute;width:13px;height:13px;
  border-color:var(--gold-lt);border-style:solid;
}
.qr-frame::before{top:-2px;left:-2px;border-width:2px 0 0 2px;border-radius:3px 0 0 0}
.qr-frame::after{bottom:-2px;right:-2px;border-width:0 2px 2px 0;border-radius:0 0 3px 0}
.qr-c1{top:-2px;right:-2px;border-width:2px 2px 0 0;border-radius:0 3px 0 0}
.qr-c2{bottom:-2px;left:-2px;border-width:0 0 2px 2px;border-radius:0 0 0 3px}
.qr-img{width:100%;height:100%;display:block;border-radius:3px}
.qr-label{text-align:center;margin-top:7px;font-size:7px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}

/* Member info */
.member-info{flex:1;padding-top:2px;min-width:0}
.mi-label{font-size:8px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:3px}
.mi-name{
  font-family:'Cormorant Garamond',serif;font-weight:700;
  color:var(--text);line-height:1.1;letter-spacing:.01em;margin-bottom:8px;
  text-shadow:0 1px 0 rgba(255,255,255,.06),0 -1px 0 rgba(0,0,0,.4);
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  word-break:break-word;
  font-size:clamp(14px,4.5vw,22px);
}
.mi-id-row{display:flex;align-items:center;gap:6px;margin-bottom:12px}
.mi-id-dot{width:6px;height:6px;border-radius:50%;background:var(--green-lt);box-shadow:0 0 6px var(--green-lt);flex-shrink:0}
.mi-id{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;color:var(--green-lt);letter-spacing:.12em}
.mi-stats{display:flex;gap:8px}
.stat-pill{flex:1;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:6px 7px}
.sp-label{font-size:7.5px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.sp-value{font-family:'DM Mono',monospace;font-size:13px;font-weight:500;color:var(--text);line-height:1}
.sp-value span{font-size:8px;color:var(--muted)}

/* Divider */
.card-divider{
  height:1px;margin:0 0 12px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.12) 20%,rgba(201,168,76,.18) 50%,rgba(201,168,76,.12) 80%,transparent);
}

/* Session tracker */
.session-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.session-lbl{font-size:7.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.session-num{font-family:'DM Mono',monospace;font-size:10px;color:var(--text);font-weight:500}
.session-num em{color:var(--gold);font-style:normal}
.dots-track{display:flex;gap:3px;margin-bottom:5px}
.dot-seg{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.07);position:relative;overflow:hidden}
.dot-seg.on{background:linear-gradient(90deg,var(--green),var(--green-lt));box-shadow:0 0 6px rgba(45,181,109,.45)}
.dot-seg.on::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3) 50%,transparent);animation:shimmer 2.5s ease-in-out infinite}
.dot-seg.free{background:linear-gradient(90deg,var(--gold-dk),var(--gold));box-shadow:0 0 6px rgba(201,168,76,.4)}
.session-caption{font-size:9.5px;color:var(--muted);display:flex;align-items:center;justify-content:space-between}
.free-pill{
  font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);
  background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.22);
  padding:2px 6px;border-radius:9px;display:flex;align-items:center;gap:3px;
}

/* Check-in strip */
.checkin-strip{
  display:flex;align-items:center;justify-content:center;gap:7px;
  padding:9px 16px;margin:12px -18px -16px;
  background:linear-gradient(90deg,rgba(14,107,56,.12),rgba(45,181,109,.09) 50%,rgba(14,107,56,.12));
  border-top:1px solid rgba(45,181,109,.18);
  position:relative;overflow:hidden;
}
.checkin-strip::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(45,181,109,.06),transparent);
  animation:sweep 4s ease-in-out infinite;
}
.ci-icon{width:16px;height:16px;border-radius:50%;background:var(--green-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 8px rgba(45,181,109,.5)}
.ci-text{font-size:10px;font-weight:600;color:var(--green-lt);letter-spacing:.03em}

/* Chibi */
.chibi-wrap{
  flex-shrink:0;margin-left:-12px;margin-bottom:-4px;align-self:flex-end;
  animation:chibiFloat 3.5s ease-in-out infinite;
  filter:drop-shadow(0 4px 10px rgba(0,0,0,.55)) drop-shadow(0 -2px 8px rgba(45,181,109,.18));
}

/* Page footer */
.pf{margin-top:8px;text-align:center;position:relative;z-index:1;animation:fadeUp .7s ease .35s both}
.pf-text{font-size:9px;color:rgba(238,242,237,.18);letter-spacing:.06em}

/* Animations */
@keyframes fadeDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes sweep{0%{left:-100%}55%{left:100%}100%{left:100%}}
@keyframes holoShift{0%,100%{opacity:.7;transform:rotate(-15deg) translateX(0)}50%{opacity:1;transform:rotate(-15deg) translateX(-20px)}}
@keyframes chibiFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes chibiWink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(0.05)}}
@keyframes cueWag{0%,100%{transform:rotate(-6deg);transform-origin:bottom center}50%{transform:rotate(4deg);transform-origin:bottom center}}

/* Bonus pill */
.bonus-pill{background:rgba(201,168,76,.12)!important;border-color:rgba(201,168,76,.3)!important}

/* JS akan set zoom di runtime */
</style>
</head>
<body>

<!-- Page header -->
<div class="ph">
  <div class="ph-brand">${CONFIG.NAMA_ARENA}</div>
  <div class="ph-desc">Tunjukkan kartu ini ke kasir untuk check-in billiard.</div>
</div>

<!-- Scene: card + chibi -->
<div class="scene">

  <div class="card-outer" id="cardOuter">
    <div class="card">

      <div class="watermark">8</div>
      <div class="holo"></div>
      <div class="corner-deco"></div>

      <div class="card-face">

        <!-- Top row -->
        <div class="top-row">
          <div class="brand-cluster">
            <div class="ball-logo"><div class="ball-shine"></div></div>
            <div>
              <div class="brand-name-lg">${CONFIG.NAMA_ARENA}</div>
              <div class="brand-sub">Member Card</div>
            </div>
          </div>
          <div class="card-chip"></div>
        </div>

        <!-- Main row: QR + member info -->
        <div class="main-row">
          <div class="qr-block">
            <div class="qr-frame">
              <div class="qr-c1"></div>
              <div class="qr-c2"></div>
              <img class="qr-img" src="${qrDataUrl}" alt="QR Code member" draggable="false">
            </div>
            <div class="qr-label">Scan to Check-in</div>
          </div>

          <div class="member-info">
            <div class="mi-label">Member Name</div>
            <div class="mi-name">${nama}</div>
            <div class="mi-id-row">
              <div class="mi-id-dot"></div>
              <div class="mi-id">${kode}</div>
            </div>
            <div class="mi-stats">
              <div class="stat-pill${isBonus ? ' bonus-pill' : ''}">
                <div class="sp-label">Sesi</div>
                <div class="sp-value">${isBonus ? batas : tm} <span>/ ${batas}</span></div>
              </div>
              <div class="stat-pill${isBonus ? ' bonus-pill' : ''}">
                <div class="sp-label">${isBonus ? 'Status' : 'Reward'}</div>
                <div class="sp-value" style="${isBonus ? 'font-size:9px;color:#C9A84C' : ''}">${isBonus ? '🎁 Klaim!' : sisaLagi + ' <span>lagi</span>'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-divider"></div>

        <!-- Session tracker -->
        <div class="session-row">
          <div class="session-lbl">Sesi Bulan Ini</div>
          <div class="session-num"><em>${tm}</em> / ${batas}</div>
        </div>
        <div class="dots-track"
             role="progressbar"
             aria-valuenow="${tm}" aria-valuemin="0" aria-valuemax="${batas}"
             aria-label="${tm} dari ${batas} sesi">
          ${dotsHtml}
        </div>
        <div class="session-caption">
          <span>${isBonus ? 'Semua sesi selesai!' : (tm + ' / ' + batas + ' sesi \xb7 ' + sisaLagi + ' lagi untuk gratis')}</span>
          <div class="free-pill" style="${isBonus ? 'background:rgba(201,168,76,.25);border-color:rgba(201,168,76,.5)' : ''}">
            <svg width="7" height="7" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" fill="currentColor"/>
            </svg>
            ${isBonus ? 'BONUS' : 'FREE'}
          </div>
        </div>

        <!-- Check-in strip -->
        <div class="checkin-strip" style="${isBonus ? 'background:linear-gradient(90deg,rgba(201,168,76,.15),rgba(201,168,76,.1) 50%,rgba(201,168,76,.15));border-top-color:rgba(201,168,76,.3)' : ''}">
          <div class="ci-icon" aria-hidden="true" style="${isBonus ? 'background:#C9A84C;box-shadow:0 0 8px rgba(201,168,76,.5)' : ''}">
            ${isBonus
              ? '<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 1L5.5 3.5H8L6 5.5L7 8L4.5 6.5L2 8L3 5.5L1 3.5H3.5Z" fill="#000" stroke="none"/></svg>'
              : '<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            }
          </div>
          <div class="ci-text" style="${isBonus ? 'color:#C9A84C' : ''}">${isBonus ? '🎁 Bonus siap! Tunjukkan ke kasir' : 'Scan QR untuk check-in'}</div>
        </div>

      </div><!-- /card-face -->
    </div><!-- /card -->
  </div><!-- /card-outer -->

  <!-- Chibi character -->
  <div class="chibi-wrap" aria-hidden="true">
    <svg width="72" height="96" viewBox="0 0 72 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cSkin" cx="42%" cy="35%" r="58%">
          <stop offset="0%" stop-color="#FDDCB0"/><stop offset="100%" stop-color="#E8A870"/>
        </radialGradient>
        <radialGradient id="cBall" cx="36%" cy="32%" r="54%">
          <stop offset="0%" stop-color="#2a2a2a"/><stop offset="100%" stop-color="#090909"/>
        </radialGradient>
        <radialGradient id="cBallHi" cx="30%" cy="28%" r="38%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.5)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <linearGradient id="cJacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e4228"/><stop offset="100%" stop-color="#0c1e10"/>
        </linearGradient>
        <linearGradient id="cCue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a8fe0"/>
          <stop offset="12%" stop-color="#d4a460"/>
          <stop offset="88%" stop-color="#a07030"/>
          <stop offset="100%" stop-color="#6b4018"/>
        </linearGradient>
        <linearGradient id="cHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2e1a08"/><stop offset="100%" stop-color="#180d04"/>
        </linearGradient>
      </defs>
      <g style="transform-origin:58px 70px;animation:cueWag 3s ease-in-out infinite">
        <rect x="55" y="8" width="4" height="72" rx="2" fill="url(#cCue)"/>
        <rect x="55.5" y="5" width="3" height="6" rx="1.5" fill="#4a90c4"/>
        <rect x="55" y="10" width="4" height="2" rx="1" fill="#e0d8c8"/>
      </g>
      <rect x="22" y="62" width="11" height="22" rx="5" fill="#0f1f14"/>
      <rect x="36" y="62" width="11" height="22" rx="5" fill="#0f1f14"/>
      <ellipse cx="27" cy="84" rx="9" ry="5" fill="#1a1008"/>
      <ellipse cx="42" cy="84" rx="9" ry="5" fill="#1a1008"/>
      <rect x="16" y="44" width="39" height="24" rx="7" fill="url(#cJacket)"/>
      <path d="M27 44 L32 54 L20 60 Z" fill="#122a18" opacity="0.85"/>
      <path d="M44 44 L39 54 L51 60 Z" fill="#122a18" opacity="0.85"/>
      <path d="M32 44 L34 52 L37 52 L39 44 Z" fill="#f0f0e8"/>
      <path d="M33 46 L32 56 L35.5 61 L39 56 L38 46 Z" fill="#C9A84C"/>
      <ellipse cx="35.5" cy="46" rx="3" ry="2" fill="#E8C96A"/>
      <path d="M50 48 L56 48 L54 53 L48 52 Z" fill="#C9A84C" opacity="0.8"/>
      <path d="M18 50 Q8 56 7 64" stroke="#FDDCB0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M18 50 Q8 56 7 64" stroke="url(#cJacket)" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="7" cy="66" rx="6" ry="5" fill="url(#cSkin)"/>
      <circle cx="7" cy="74" r="9" fill="url(#cBall)"/>
      <circle cx="7" cy="74" r="9" fill="url(#cBallHi)"/>
      <circle cx="7" cy="75" r="4" fill="white" opacity="0.93"/>
      <text x="7" y="78" font-family="'DM Sans',sans-serif" font-size="5" font-weight="700" fill="#111" text-anchor="middle">8</text>
      <path d="M53 50 Q60 56 58 62" stroke="#FDDCB0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M53 50 Q60 56 58 62" stroke="url(#cJacket)" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="57" cy="64" rx="5" ry="4" fill="url(#cSkin)"/>
      <rect x="30" y="38" width="10" height="9" rx="3" fill="url(#cSkin)"/>
      <path d="M26 44 L30 38 L35.5 41 L41 38 L45 44 Z" fill="#f0f0e8"/>
      <ellipse cx="35" cy="24" rx="20" ry="20" fill="url(#cSkin)"/>
      <ellipse cx="15" cy="25" rx="4.5" ry="6" fill="url(#cSkin)"/>
      <ellipse cx="15" cy="25" rx="2.5" ry="4" fill="#e09070" opacity="0.4"/>
      <ellipse cx="55" cy="25" rx="4.5" ry="6" fill="url(#cSkin)"/>
      <ellipse cx="55" cy="25" rx="2.5" ry="4" fill="#e09070" opacity="0.4"/>
      <ellipse cx="35" cy="11" rx="20" ry="11" fill="url(#cHair)"/>
      <ellipse cx="18" cy="18" rx="7" ry="10" fill="url(#cHair)"/>
      <ellipse cx="52" cy="18" rx="7" ry="10" fill="url(#cHair)"/>
      <path d="M28 10 Q33 2 40 6 Q46 10 43 14 Q37 6 29 12 Z" fill="#3e2810"/>
      <rect x="18" y="20" width="14" height="10" rx="3" fill="rgba(201,168,76,0.06)" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <rect x="38" y="20" width="14" height="10" rx="3" fill="rgba(201,168,76,0.06)" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <line x1="32" y1="24" x2="38" y2="24" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <line x1="18" y1="24" x2="14" y2="23" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <line x1="52" y1="24" x2="56" y2="23" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <path d="M20 21 L23 21 L21 23 Z" fill="rgba(255,255,255,0.22)"/>
      <path d="M40 21 L43 21 L41 23 Z" fill="rgba(255,255,255,0.22)"/>
      <path d="M20 19 Q25 16 30 18" stroke="#3e2810" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M40 18 Q45 16 50 19" stroke="#3e2810" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="25" cy="25" rx="5.5" ry="5.5" fill="white"/>
      <circle cx="25" cy="25.5" r="3.5" fill="#3a2510"/>
      <circle cx="25" cy="25.5" r="2.2" fill="#1a0f04"/>
      <circle cx="26.3" cy="24.2" r="1.2" fill="white" opacity="0.9"/>
      <ellipse cx="45" cy="25" rx="5.5" ry="5.5" fill="white"/>
      <g style="transform-origin:45px 25.5px;animation:chibiWink 4.5s ease-in-out infinite 2s">
        <circle cx="45" cy="25.5" r="3.5" fill="#3a2510"/>
        <circle cx="45" cy="25.5" r="2.2" fill="#1a0f04"/>
        <circle cx="46.3" cy="24.2" r="1.2" fill="white" opacity="0.9"/>
      </g>
      <ellipse cx="17" cy="31" rx="5" ry="3.5" fill="rgba(240,130,110,0.22)"/>
      <ellipse cx="53" cy="31" rx="5" ry="3.5" fill="rgba(240,130,110,0.22)"/>
      <path d="M33.5 29 Q35 32 36.5 29" stroke="#c8906a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M24 34 Q35 42 46 34" stroke="#c8906a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M26 35.5 Q35 41 44 35.5 Q35 39 26 35.5 Z" fill="white" opacity="0.8"/>
      <path d="M62 14 L63 11 L64 14 L67 15 L64 16 L63 19 L62 16 L59 15 Z" fill="#C9A84C" opacity="0.6"/>
      <path d="M3 20 L3.7 18 L4.4 20 L6.4 20.8 L4.4 21.6 L3.7 23.6 L3 21.6 L1 20.8 Z" fill="#2DB56D" opacity="0.55"/>
    </svg>
  </div>

</div><!-- /scene -->

<div class="pf">
  <div class="pf-text">Tunjukkan QR ini ke kasir untuk check-in</div>
</div>

<script>
  // ── Zoom seluruh halaman agar muat di lebar iframe ────────────
  // zoom (bukan transform) → benar-benar mengecilkan layout,
  // tidak ada overflow, dan scrollHeight ikut menyesuaikan.
  function applyZoom() {
    var scene = document.querySelector('.scene');
    if (!scene) return;
    // Lebar yang dibutuhkan: scene natural width + body padding 24px
    var needed = scene.scrollWidth + 24;
    var vw = document.documentElement.clientWidth;
    if (needed > vw && needed > 0) {
      var ratio = vw / needed;
      document.body.style.zoom = ratio.toFixed(4);
    } else {
      document.body.style.zoom = '';
    }
  }

  // ── Kirim tinggi ke parent (akurat setelah zoom) ─────────────
  var _lastH = 0;
  function sendHeight() {
    // getBoundingClientRect().height sudah memperhitungkan CSS zoom,
    // berbeda dengan scrollHeight yang bisa return nilai pra-zoom
    var rect = document.body.getBoundingClientRect();
    var h = Math.ceil(rect.height + rect.top);
    // fallback kalau rect tidak akurat
    if (h < 50) h = document.documentElement.scrollHeight;
    if (Math.abs(h - _lastH) > 3) {
      _lastH = h;
      window.parent.postMessage({ qrH: h }, '*');
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    applyZoom();
    requestAnimationFrame(sendHeight);
    // Satu kali lagi setelah font Google Fonts selesai load
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        applyZoom();
        requestAnimationFrame(sendHeight);
      });
    }
  }

  if (document.readyState === 'complete') { init(); }
  else { window.addEventListener('load', init); }

  // ── Subtle 3D tilt on mouse move ──────────────────────────────
  var outer = document.getElementById('cardOuter');
  document.addEventListener('mousemove', function(e) {
    var rect = outer.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top  + rect.height / 2;
    var dx = (e.clientX - cx) / rect.width;
    var dy = (e.clientY - cy) / rect.height;
    outer.style.transform = 'rotateY(' + (dx * 10) + 'deg) rotateX(' + (-dy * 7) + 'deg)';
  });
  document.addEventListener('mouseleave', function() {
    outer.style.transform = '';
  });
</script>
</body>
</html>`;
};

// ── memberCardPage — layout portrait mobile-friendly untuk /member/:kode ──────
// QR besar (250px), mudah di-scan kasir, layar penuh tanpa empty space.
export const memberCardPage = ({ nama, kode, totalMain, qrDataUrl }) => {
  const tm    = totalMain ?? 0;
  const batas = CONFIG.BATAS_MAIN;
  const sisaLagi = Math.max(0, batas - tm);

  let dotsHtml = "";
  for (let i = 0; i < batas; i++) {
    const n = i + 1;
    if (n <= tm) dotsHtml += `<div class="dot-seg on"></div>`;
    else         dotsHtml += `<div class="dot-seg"></div>`;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<title>Kartu Member — ${CONFIG.NAMA_ARENA}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --gold:#C9A84C;--gold-lt:#F0D88A;
  --green:#0E6B38;--green-lt:#2DB56D;
  --bg:#060B08;--text:#EEF2ED;--muted:rgba(238,242,237,0.45);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  background:var(--bg);
  min-height:100vh;
  font-family:'DM Sans',sans-serif;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:20px 16px 24px;
}

/* Background glow */
body::before{
  content:'';position:fixed;inset:0;
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%,rgba(14,107,56,.18) 0%,transparent 60%),
    radial-gradient(ellipse 40% 40% at 85% 90%,rgba(201,168,76,.08) 0%,transparent 60%);
  pointer-events:none;z-index:0;
}

/* Wrapper */
.wrap{
  width:100%;max-width:380px;
  display:flex;flex-direction:column;align-items:center;
  gap:0;position:relative;z-index:1;
}

/* Header */
.hdr{text-align:center;margin-bottom:18px;padding-right:62px}
.hdr-brand{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.32em;color:var(--gold)}
.hdr-sub{font-size:11px;color:var(--muted);margin-top:3px}

/* Card wrapper — flex row: card di kiri, chibi di kanan bawah */
.card-wrap{
  display:flex;align-items:flex-end;
  width:100%;gap:0;
  perspective:900px;
}
.card{flex:1;min-width:0;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.23,1,.32,1)}

/* Chibi */
.chibi{
  flex-shrink:0;
  width:80px;
  margin-left:-18px; /* sedikit overlap dengan tepi card */
  margin-bottom:36px; /* setinggi CI strip dari bawah */
  filter:drop-shadow(0 4px 10px rgba(0,0,0,.6)) drop-shadow(0 -2px 8px rgba(45,181,109,.2));
  animation:chibiFloat 3.5s ease-in-out infinite;
  pointer-events:none;
}
@keyframes chibiFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes chibiWink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.05)}}
@keyframes cueWag{0%,100%{transform:rotate(-6deg);transform-origin:bottom center}50%{transform:rotate(4deg);transform-origin:bottom center}}

/* Card */
.card{
  width:100%;
  background:linear-gradient(155deg,#0A160E 0%,#06100A 50%,#050D08 100%);
  border-radius:22px;overflow:hidden;position:relative;
  border:1px solid rgba(201,168,76,.22);
  box-shadow:0 0 0 1px rgba(45,181,109,.08),0 20px 60px rgba(0,0,0,.7);
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.7) 30%,rgba(240,216,138,.9) 50%,rgba(45,181,109,.6) 70%,transparent);
}

/* Card top bar */
.card-top{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.04);
}
.brand-row{display:flex;align-items:center;gap:8px}
.ball{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a2a,#090909);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:9px;font-weight:700;color:#fff;position:relative}
.ball::before{content:'';position:absolute;top:4px;left:5px;width:7px;height:5px;border-radius:50%;background:rgba(255,255,255,.45);filter:blur(1px)}
.brand-txt .name{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.15em;color:var(--text)}
.brand-txt .sub{font-size:7px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.chip{width:28px;height:21px;border-radius:3px;background:linear-gradient(135deg,#C9A84C,#8A6A1E 40%,#C9A84C 70%,#F0D88A)}

/* QR section — BESAR untuk mudah di-scan */
.qr-section{
  padding:20px 16px 14px;
  display:flex;flex-direction:column;align-items:center;gap:12px;
}
.qr-outer{
  position:relative;
  padding:10px;background:#fff;border-radius:14px;
  box-shadow:0 0 0 1px rgba(201,168,76,.35),0 8px 30px rgba(0,0,0,.6);
  width:260px;height:260px;
}
.qr-outer::before,.qr-outer::after,.qr-c1,.qr-c2{
  content:'';position:absolute;width:16px;height:16px;
  border-color:var(--gold-lt);border-style:solid;
}
.qr-outer::before{top:-3px;left:-3px;border-width:2.5px 0 0 2.5px;border-radius:4px 0 0 0}
.qr-outer::after {bottom:-3px;right:-3px;border-width:0 2.5px 2.5px 0;border-radius:0 0 4px 0}
.qr-c1{top:-3px;right:-3px;border-width:2.5px 2.5px 0 0;border-radius:0 4px 0 0}
.qr-c2{bottom:-3px;left:-3px;border-width:0 0 2.5px 2.5px;border-radius:0 0 0 4px}
.qr-outer img{width:100%;height:100%;display:block;border-radius:6px}
.qr-label{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}

/* Member info */
.mi{width:100%;padding:0 16px 14px;text-align:center}
.mi-lbl{font-size:8px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:4px}
.mi-name{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--text);line-height:1;margin-bottom:8px}
.mi-id{display:inline-flex;align-items:center;gap:6px;background:rgba(45,181,109,.08);border:1px solid rgba(45,181,109,.2);border-radius:20px;padding:4px 12px}
.mi-dot{width:6px;height:6px;border-radius:50%;background:var(--green-lt);box-shadow:0 0 6px var(--green-lt)}
.mi-kode{font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:var(--green-lt);letter-spacing:.1em}

/* Stats pills */
.stats{display:flex;gap:8px;padding:0 16px 14px}
.stat{flex:1;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:7px 8px;text-align:center}
.st-lbl{font-size:7px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.st-val{font-family:'DM Mono',monospace;font-size:14px;font-weight:500;color:var(--text)}
.st-val span{font-size:9px;color:var(--muted)}

/* Progress dots */
.prog{padding:0 16px 16px}
.prog-row{display:flex;justify-content:space-between;margin-bottom:5px}
.prog-lbl{font-size:8px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}
.prog-num{font-family:'DM Mono',monospace;font-size:10px;color:var(--text)}
.prog-num em{color:var(--gold);font-style:normal}
.dots-track{display:flex;gap:3px;margin-bottom:5px}
.dot-seg{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.07)}
.dot-seg.on{background:linear-gradient(90deg,var(--green),var(--green-lt));box-shadow:0 0 5px rgba(45,181,109,.4)}
.dot-seg.free{background:linear-gradient(90deg,#7A5E1A,var(--gold))}
.prog-cap{font-size:9px;color:var(--muted);display:flex;justify-content:space-between;align-items:center}
.free-pill{font-size:7px;font-weight:700;letter-spacing:.1em;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.22);padding:2px 7px;border-radius:9px}

/* Check-in strip */
.ci-strip{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:11px 16px;
  background:linear-gradient(90deg,rgba(14,107,56,.15),rgba(45,181,109,.1) 50%,rgba(14,107,56,.15));
  border-top:1px solid rgba(45,181,109,.2);
}
.ci-icon{width:18px;height:18px;border-radius:50%;background:var(--green-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 8px rgba(45,181,109,.5)}
.ci-txt{font-size:11px;font-weight:600;color:var(--green-lt);letter-spacing:.04em}

/* Holo strip */
.holo-strip{
  position:absolute;top:0;right:0;width:90px;height:100%;
  background:linear-gradient(110deg,transparent 0%,rgba(93,219,160,.03) 30%,rgba(201,168,76,.05) 50%,rgba(93,219,160,.03) 70%,transparent 90%);
  pointer-events:none;animation:holoMove 5s ease-in-out infinite;
}
@keyframes holoMove{0%,100%{opacity:.6;transform:translateX(0)}50%{opacity:1;transform:translateX(-15px)}}

/* Terms */
.terms{
  width:100%;max-width:380px;margin-top:16px;
  padding:14px 16px 16px;
  background:rgba(14,107,56,.06);
  border:1px solid rgba(201,168,76,.14);
  border-radius:14px;
}
.terms-title{
  display:flex;align-items:center;gap:7px;
  font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.18em;
  color:var(--gold);margin-bottom:4px;
}
.terms-sub{font-size:10px;color:var(--muted);margin-bottom:11px}
.terms-list{display:flex;flex-direction:column;gap:9px}
.term-item{display:flex;gap:9px;align-items:flex-start}
.term-icon{font-size:14px;flex-shrink:0;line-height:1.4}
.term-text{font-size:10.5px;color:rgba(238,242,237,.7);line-height:1.55}
.term-text strong{color:var(--text);font-weight:600}
.terms-footer{
  margin-top:12px;padding-top:10px;
  border-top:1px solid rgba(201,168,76,.1);
  font-size:9.5px;color:var(--muted);text-align:center;
}

/* Footer */
.ftr{margin-top:14px;text-align:center}
.ftr-txt{font-size:10px;color:rgba(238,242,237,.18);letter-spacing:.06em}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-brand">${CONFIG.NAMA_ARENA}</div>
    <div class="hdr-sub">Tunjukkan QR ini ke kasir untuk check-in billiard</div>
  </div>

  <!-- Card + Chibi (flex row: card kiri, chibi kanan bawah) -->
  <div class="card-wrap">

  <!-- Real card -->
  <div class="card" id="memberCard">
    <div class="holo-strip"></div>

    <!-- Top bar -->
    <div class="card-top">
      <div class="brand-row">
        <div class="ball">8</div>
        <div class="brand-txt">
          <div class="name">${CONFIG.NAMA_ARENA}</div>
          <div class="sub">Member Card</div>
        </div>
      </div>
      <div class="chip"></div>
    </div>

    <!-- QR besar -->
    <div class="qr-section">
      <div class="qr-outer">
        <div class="qr-c1"></div><div class="qr-c2"></div>
        <img src="${qrDataUrl}" alt="QR Code" draggable="false">
      </div>
      <div class="qr-label">Scan to Check-in</div>
    </div>

    <!-- Member info -->
    <div class="mi">
      <div class="mi-lbl">Member Name</div>
      <div class="mi-name">${nama}</div>
      <div class="mi-id">
        <div class="mi-dot"></div>
        <div class="mi-kode">${kode}</div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats">
      <div class="stat">
        <div class="st-lbl">Sesi</div>
        <div class="st-val">${tm} <span>/ ${batas}</span></div>
      </div>
      <div class="stat">
        <div class="st-lbl">Reward</div>
        <div class="st-val">${sisaLagi} <span>lagi</span></div>
      </div>
    </div>

    <!-- Progress -->
    <div class="prog">
      <div class="prog-row">
        <div class="prog-lbl">Sesi Bulan Ini</div>
        <div class="prog-num"><em>${tm}</em> / ${batas}</div>
      </div>
      <div class="dots-track">${dotsHtml}</div>
      <div class="prog-cap">
        <span>${sisaLagi} sesi lagi untuk gratis</span>
        <div class="free-pill">★ FREE</div>
      </div>
    </div>

    <!-- Check-in strip -->
    <div class="ci-strip">
      <div class="ci-icon">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4 7L8 3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="ci-txt">Scan QR untuk check-in</div>
    </div>
  </div><!-- /card -->

  <!-- Chibi — flex sibling di kanan bawah card -->
  <div class="chibi" aria-hidden="true">
    <svg width="80" height="107" viewBox="0 0 72 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mSkin" cx="42%" cy="35%" r="58%"><stop offset="0%" stop-color="#FDDCB0"/><stop offset="100%" stop-color="#E8A870"/></radialGradient>
        <radialGradient id="mBall" cx="36%" cy="32%" r="54%"><stop offset="0%" stop-color="#2a2a2a"/><stop offset="100%" stop-color="#090909"/></radialGradient>
        <radialGradient id="mBallHi" cx="30%" cy="28%" r="38%"><stop offset="0%" stop-color="rgba(255,255,255,0.5)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="mJacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e4228"/><stop offset="100%" stop-color="#0c1e10"/></linearGradient>
        <linearGradient id="mCue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a8fe0"/><stop offset="12%" stop-color="#d4a460"/><stop offset="88%" stop-color="#a07030"/><stop offset="100%" stop-color="#6b4018"/></linearGradient>
        <linearGradient id="mHair" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2e1a08"/><stop offset="100%" stop-color="#180d04"/></linearGradient>
      </defs>
      <g style="transform-origin:58px 70px;animation:cueWag 3s ease-in-out infinite">
        <rect x="55" y="8" width="4" height="72" rx="2" fill="url(#mCue)"/>
        <rect x="55.5" y="5" width="3" height="6" rx="1.5" fill="#4a90c4"/>
        <rect x="55" y="10" width="4" height="2" rx="1" fill="#e0d8c8"/>
      </g>
      <rect x="22" y="62" width="11" height="22" rx="5" fill="#0f1f14"/>
      <rect x="36" y="62" width="11" height="22" rx="5" fill="#0f1f14"/>
      <ellipse cx="27" cy="84" rx="9" ry="5" fill="#1a1008"/>
      <ellipse cx="42" cy="84" rx="9" ry="5" fill="#1a1008"/>
      <rect x="16" y="44" width="39" height="24" rx="7" fill="url(#mJacket)"/>
      <path d="M27 44 L32 54 L20 60 Z" fill="#122a18" opacity="0.85"/>
      <path d="M44 44 L39 54 L51 60 Z" fill="#122a18" opacity="0.85"/>
      <path d="M32 44 L34 52 L37 52 L39 44 Z" fill="#f0f0e8"/>
      <path d="M33 46 L32 56 L35.5 61 L39 56 L38 46 Z" fill="#C9A84C"/>
      <ellipse cx="35.5" cy="46" rx="3" ry="2" fill="#E8C96A"/>
      <path d="M50 48 L56 48 L54 53 L48 52 Z" fill="#C9A84C" opacity="0.8"/>
      <path d="M18 50 Q8 56 7 64" stroke="#FDDCB0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M18 50 Q8 56 7 64" stroke="url(#mJacket)" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="7" cy="66" rx="6" ry="5" fill="url(#mSkin)"/>
      <circle cx="7" cy="74" r="9" fill="url(#mBall)"/>
      <circle cx="7" cy="74" r="9" fill="url(#mBallHi)"/>
      <circle cx="7" cy="75" r="4" fill="white" opacity="0.93"/>
      <text x="7" y="78" font-family="'DM Sans',sans-serif" font-size="5" font-weight="700" fill="#111" text-anchor="middle">8</text>
      <path d="M53 50 Q60 56 58 62" stroke="#FDDCB0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M53 50 Q60 56 58 62" stroke="url(#mJacket)" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="57" cy="64" rx="5" ry="4" fill="url(#mSkin)"/>
      <rect x="30" y="38" width="10" height="9" rx="3" fill="url(#mSkin)"/>
      <path d="M26 44 L30 38 L35.5 41 L41 38 L45 44 Z" fill="#f0f0e8"/>
      <ellipse cx="35" cy="24" rx="20" ry="20" fill="url(#mSkin)"/>
      <ellipse cx="15" cy="25" rx="4.5" ry="6" fill="url(#mSkin)"/>
      <ellipse cx="15" cy="25" rx="2.5" ry="4" fill="#e09070" opacity="0.4"/>
      <ellipse cx="55" cy="25" rx="4.5" ry="6" fill="url(#mSkin)"/>
      <ellipse cx="55" cy="25" rx="2.5" ry="4" fill="#e09070" opacity="0.4"/>
      <ellipse cx="35" cy="11" rx="20" ry="11" fill="url(#mHair)"/>
      <ellipse cx="18" cy="18" rx="7" ry="10" fill="url(#mHair)"/>
      <ellipse cx="52" cy="18" rx="7" ry="10" fill="url(#mHair)"/>
      <path d="M28 10 Q33 2 40 6 Q46 10 43 14 Q37 6 29 12 Z" fill="#3e2810"/>
      <rect x="18" y="20" width="14" height="10" rx="3" fill="rgba(201,168,76,0.06)" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <rect x="38" y="20" width="14" height="10" rx="3" fill="rgba(201,168,76,0.06)" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <line x1="32" y1="24" x2="38" y2="24" stroke="#C9A84C" stroke-width="1.2" opacity="0.85"/>
      <ellipse cx="25" cy="25" rx="5.5" ry="5.5" fill="white"/>
      <circle cx="25" cy="25.5" r="3.5" fill="#3a2510"/>
      <circle cx="25" cy="25.5" r="2.2" fill="#1a0f04"/>
      <circle cx="26.3" cy="24.2" r="1.2" fill="white" opacity="0.9"/>
      <ellipse cx="45" cy="25" rx="5.5" ry="5.5" fill="white"/>
      <g style="transform-origin:45px 25.5px;animation:chibiWink 4.5s ease-in-out infinite 2s">
        <circle cx="45" cy="25.5" r="3.5" fill="#3a2510"/>
        <circle cx="45" cy="25.5" r="2.2" fill="#1a0f04"/>
        <circle cx="46.3" cy="24.2" r="1.2" fill="white" opacity="0.9"/>
      </g>
      <ellipse cx="17" cy="31" rx="5" ry="3.5" fill="rgba(240,130,110,0.22)"/>
      <ellipse cx="53" cy="31" rx="5" ry="3.5" fill="rgba(240,130,110,0.22)"/>
      <path d="M33.5 29 Q35 32 36.5 29" stroke="#c8906a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M24 34 Q35 42 46 34" stroke="#c8906a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M26 35.5 Q35 41 44 35.5 Q35 39 26 35.5 Z" fill="white" opacity="0.8"/>
    </svg>
  </div>

  </div><!-- /card-wrap -->

  <!-- Ketentuan Member -->
  <div class="terms">
    <div class="terms-title">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#C9A84C" stroke-width="1.3"/><line x1="4" y1="5" x2="10" y2="5" stroke="#C9A84C" stroke-width="1.2" stroke-linecap="round"/><line x1="4" y1="7.5" x2="10" y2="7.5" stroke="#C9A84C" stroke-width="1.2" stroke-linecap="round"/><line x1="4" y1="10" x2="7.5" y2="10" stroke="#C9A84C" stroke-width="1.2" stroke-linecap="round"/></svg>
      Ketentuan Member ${CONFIG.NAMA_ARENA}
    </div>
    <div class="terms-sub">Biar nggak ada salah paham, simak dulu ya! 😊</div>
    <div class="terms-list">
      <div class="term-item">
        <span class="term-icon">🎁</span>
        <div class="term-text"><strong>Bonus kamu berlaku 2 minggu</strong> — lebih dari itu, sayang banget kalau hangus. Jadi jangan lupa diklaim!</div>
      </div>
      <div class="term-item">
        <span class="term-icon">🌙</span>
        <div class="term-text"><strong>Malam Minggu? Tunggu sepi dulu</strong> — Bonus gratis nggak bisa diklaim saat ramai. Datang siang lebih aman &amp; lebih santai!</div>
      </div>
      <div class="term-item">
        <span class="term-icon">💤</span>
        <div class="term-text"><strong>Lama nggak mampir?</strong> — Member yang nggak scan lebih dari 2 bulan otomatis jadi tidak aktif.</div>
      </div>
      <div class="term-item">
        <span class="term-icon">🔄</span>
        <div class="term-text"><strong>Sempat balik tapi menghilang lagi?</strong> — Kalau sudah scan tapi absen lagi lebih dari 1 bulan, progres sesi akan mulai dari nol.</div>
      </div>
    </div>
    <div class="terms-footer">Punya pertanyaan? Hubungi kasir kami langsung.</div>
  </div>

  <div class="ftr"><div class="ftr-txt">${CONFIG.NAMA_ARENA} • Member Card</div></div>
</div>

<script>
(function() {
  var card = document.getElementById('memberCard');
  if (!card) return;

  function applyTilt(dx, dy) {
    // dx, dy: -0.5..0.5 normalized offset from card center
    card.style.transform = 'rotateY(' + (dx * 18) + 'deg) rotateX(' + (-dy * 12) + 'deg)';
  }
  function resetTilt() {
    card.style.transform = '';
  }

  // Desktop: mouse move over document
  document.addEventListener('mousemove', function(e) {
    var rect = card.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = (e.clientX - cx) / rect.width;
    var dy = (e.clientY - cy) / rect.height;
    applyTilt(dx, dy);
  });
  document.addEventListener('mouseleave', resetTilt);

  // Mobile: touch move
  card.addEventListener('touchmove', function(e) {
    if (!e.touches.length) return;
    var t = e.touches[0];
    var rect = card.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = (t.clientX - cx) / rect.width;
    var dy = (t.clientY - cy) / rect.height;
    applyTilt(dx, dy);
  }, { passive: true });
  card.addEventListener('touchend', resetTilt, { passive: true });
})();
</script>
</body>
</html>`;
};
