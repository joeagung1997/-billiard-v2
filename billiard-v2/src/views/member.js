// src/views/member.js
// ── HTML views untuk halaman member (scan, PIN, hasil) ────────

import { CONFIG, getTip } from "../config.js";
import { formatTanggal } from "../utils/format.js";

// ── Shared assets ─────────────────────────────────────────────

const FONTS_LINK = `<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const SHARED_CSS = `
:root{
  --gold:#C9A84C;--gold-lt:#E8C96A;--gold-dk:#8A6A1E;
  --green:#1A7A4A;--green-lt:#2DB56D;--green-glow:rgba(45,181,109,0.35);
  --bg:#070D09;--card-bg:#0A1210;--border:rgba(201,168,76,0.22);
  --text:#EFF3EE;--muted:rgba(239,243,238,0.42);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:32px 16px;position:relative;overflow-x:hidden;
}
body::before{
  content:'';position:fixed;inset:0;
  background:
    radial-gradient(ellipse 70% 50% at 50% -10%,rgba(45,181,109,.10) 0%,transparent 65%),
    radial-gradient(ellipse 40% 30% at 80% 90%,rgba(201,168,76,.07) 0%,transparent 60%),
    radial-gradient(ellipse 30% 30% at 10% 70%,rgba(45,100,180,.04) 0%,transparent 60%);
  pointer-events:none;
}
body::after{
  content:'';position:fixed;inset:0;opacity:.45;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events:none;z-index:0;
}
.page-header{text-align:center;margin-bottom:20px;position:relative;z-index:1;animation:fadeDown .6s ease both}
.brand-name{font-family:'Cormorant Garamond',serif;font-size:12px;font-weight:600;letter-spacing:.38em;text-transform:uppercase;color:var(--gold);margin-bottom:5px}
.page-desc{font-size:12px;color:var(--muted);font-weight:300}
.card-wrap{position:relative;z-index:1;animation:fadeUp .7s ease .1s both}
.card-wrap::before{
  content:'';position:absolute;inset:-1.5px;border-radius:27px;
  background:linear-gradient(145deg,var(--gold-dk) 0%,transparent 40%,var(--green) 80%,var(--gold) 100%);
  filter:blur(.5px);z-index:-1;
}
.card-wrap::after{
  content:'';position:absolute;inset:-30px;border-radius:50px;
  background:radial-gradient(ellipse at 50% 70%,rgba(45,181,109,.13) 0%,transparent 65%);
  z-index:-2;pointer-events:none;
}
.card{width:360px;background:var(--card-bg);border-radius:24px;border:1px solid var(--border);overflow:hidden;position:relative}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--gold-lt) 35%,var(--green-lt) 65%,transparent);
  opacity:.7;
}
.char-banner{
  position:relative;width:100%;height:210px;
  background:linear-gradient(175deg,#0c1f14 0%,#071009 60%,#040c06 100%);
  overflow:hidden;display:flex;align-items:flex-end;justify-content:center;
}
.char-banner::before{
  content:'';position:absolute;inset:0;
  background-image:linear-gradient(rgba(45,181,109,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(45,181,109,.04) 1px,transparent 1px);
  background-size:28px 28px;
}
.char-banner::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:70px;
  background:linear-gradient(to top,var(--card-bg),transparent);z-index:2;
}
.char-spotlight{position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:280px;height:220px;background:radial-gradient(ellipse at 50% 90%,rgba(45,181,109,.18) 0%,rgba(45,181,109,.05) 40%,transparent 70%);z-index:0}
.char-shadow{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:120px;height:14px;background:radial-gradient(ellipse,rgba(0,0,0,.7) 0%,transparent 75%);z-index:1;filter:blur(3px)}
.character-svg{position:relative;z-index:3;filter:drop-shadow(0 -6px 20px rgba(45,181,109,.20)) drop-shadow(0 4px 12px rgba(0,0,0,.6));animation:floatChar 4s ease-in-out infinite}
.banner-brand{position:absolute;top:14px;left:16px;z-index:4;display:flex;align-items:center;gap:7px}
.bb-orb{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a3a22,#0d2016);border:1px solid rgba(45,181,109,.35);display:flex;align-items:center;justify-content:center}
.bb-dot{width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2db56d,#0f5c2e);box-shadow:0 0 6px rgba(45,181,109,.5);position:relative}
.bb-dot::after{content:'';position:absolute;top:2px;left:2px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.55)}
.bb-name{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--text);letter-spacing:.04em;line-height:1}
.bb-tag{font-size:8px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-top:2px}
.banner-chip{position:absolute;top:16px;right:16px;z-index:4;display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;backdrop-filter:blur(4px)}
.chip-gold{border:1px solid rgba(201,168,76,.28);background:rgba(201,168,76,.07)}
.chip-green{border:1px solid rgba(45,181,109,.35);background:rgba(45,181,109,.09)}
.chip-amber{border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.07)}
.chip-dot{width:6px;height:6px;border-radius:50%}
.chip-dot-gold{background:var(--gold-lt);box-shadow:0 0 6px var(--gold);animation:pulseGold 2s ease-in-out infinite}
.chip-dot-green{background:#2DB56D;box-shadow:0 0 6px var(--green-lt);animation:pulseGreen 2s ease-in-out infinite}
.chip-dot-amber{background:#fbbf24;box-shadow:0 0 6px #f59e0b;animation:pulseAmber 2s ease-in-out infinite}
.chip-label{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.chip-label-gold{color:var(--gold)}
.chip-label-green{color:var(--green-lt)}
.chip-label-amber{color:#fbbf24}
.card-body{padding:0 22px 22px}
.member-identity{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.member-left{flex:1;min-width:0}
.member-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--text);letter-spacing:.02em;line-height:1;margin-bottom:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.member-id-wrap{display:inline-flex;align-items:center;gap:5px;background:rgba(45,181,109,.08);border:1px solid rgba(45,181,109,.22);border-radius:20px;padding:4px 11px}
.member-id{font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:var(--green-lt);letter-spacing:.13em}
.qr-mini{width:72px;height:72px;background:#fff;border-radius:8px;padding:6px;box-shadow:0 0 0 1px rgba(201,168,76,.18),0 4px 16px rgba(0,0,0,.5);flex-shrink:0;margin-left:14px;position:relative}
.qr-mini::before,.qr-mini::after{content:'';position:absolute;width:10px;height:10px;border-color:var(--gold-lt);border-style:solid}
.qr-mini::before{top:-2px;left:-2px;border-width:2px 0 0 2px;border-radius:2px 0 0 0}
.qr-mini::after{bottom:-2px;right:-2px;border-width:0 2px 2px 0;border-radius:0 0 2px 0}
.qr-mini-svg{width:100%;height:100%}
.divider{height:1px;margin-bottom:14px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.15) 30%,rgba(201,168,76,.15) 70%,transparent)}
.session-section{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);border-radius:14px;padding:13px 14px;margin-bottom:12px}
.session-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.session-label{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.session-count{font-family:'DM Mono',monospace;font-size:12px;font-weight:500;color:var(--text)}
.session-count em{color:var(--gold);font-style:normal}
.dots-row{display:flex;gap:4px;margin-bottom:9px;align-items:center}
.dot{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.07);position:relative;overflow:hidden}
.dot-filled{background:linear-gradient(90deg,var(--green),var(--green-lt));box-shadow:0 0 7px rgba(45,181,109,.4)}
.dot-filled::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28) 50%,transparent);animation:shimmer 2.2s ease-in-out infinite}
.dot-free{background:linear-gradient(90deg,var(--gold-dk),var(--gold));box-shadow:0 0 7px rgba(201,168,76,.35)}
.session-meta{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted)}
.free-badge{display:flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
.checkin-badge{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:11px;margin-bottom:14px;position:relative;overflow:hidden}
.checkin-badge::before{content:'';position:absolute;top:0;left:-100%;width:200%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);animation:sweep 3.5s ease-in-out infinite}
.cb-green{background:linear-gradient(135deg,rgba(45,181,109,.11),rgba(45,181,109,.05));border:1px solid rgba(45,181,109,.22)}
.cb-amber{background:linear-gradient(135deg,rgba(251,191,36,.09),rgba(251,191,36,.03));border:1px solid rgba(251,191,36,.22)}
.cb-gold{background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.28)}
.check-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ci-green{background:var(--green-lt);box-shadow:0 0 9px var(--green-glow)}
.ci-amber{background:#f59e0b;box-shadow:0 0 9px rgba(245,158,11,.35)}
.ci-gold{background:var(--gold);box-shadow:0 0 9px rgba(201,168,76,.4)}
.checkin-text{font-size:12px;font-weight:600;letter-spacing:.02em}
.ct-green{color:var(--green-lt)}
.ct-amber{color:#fbbf24}
.ct-gold{color:var(--gold-lt)}
.tip-section{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:11px 13px;margin-bottom:12px}
.point-earn-badge{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:9px 13px;margin-bottom:11px;
  background:linear-gradient(135deg,rgba(201,168,76,.14),rgba(201,168,76,.06));
  border:1px solid rgba(201,168,76,.32);border-radius:11px;
  font-size:12px;color:var(--gold-lt);
}
.point-earn-badge .pe-icon{font-size:14px;line-height:1}
.point-earn-badge .pe-text{letter-spacing:.01em}
.point-earn-badge strong{color:var(--gold);font-weight:700}
.tip-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.tip-text{font-size:12px;color:rgba(239,243,238,.55);line-height:1.65}
.card-footer{text-align:center;font-size:10px;letter-spacing:.07em;color:rgba(239,243,238,.22)}
@keyframes fadeDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes floatChar{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes sweep{0%{left:-100%}60%{left:100%}100%{left:100%}}
@keyframes pulseGold{0%,100%{opacity:1;box-shadow:0 0 6px var(--gold)}50%{opacity:.55;box-shadow:0 0 12px var(--gold)}}
@keyframes pulseGreen{0%,100%{opacity:1;box-shadow:0 0 6px var(--green-lt)}50%{opacity:.55;box-shadow:0 0 12px var(--green-lt)}}
@keyframes pulseAmber{0%,100%{opacity:1;box-shadow:0 0 6px #fbbf24}50%{opacity:.55;box-shadow:0 0 12px #fbbf24}}
@keyframes blinkEye{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(0.08)}}
@keyframes cueSwing{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(2deg)}}
@keyframes ballBounce{0%,100%{transform:translateY(0) scale(1,1)}45%{transform:translateY(-5px) scale(1.04,.97)}50%{transform:translateY(-6px) scale(1.05,.96)}55%{transform:translateY(-5px) scale(1.04,.97)}}
@keyframes celebrateGlow{0%,100%{box-shadow:0 0 20px rgba(201,168,76,.15)}50%{box-shadow:0 0 45px rgba(201,168,76,.4)}}

/* WA booking button (post-checkin) */
.act-row{width:100%;max-width:380px;margin:14px auto 0;display:flex}
.act-btn-wa{
  flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 16px;font-size:13px;font-weight:600;letter-spacing:.02em;
  font-family:'DM Sans',sans-serif;
  background:#25D366;color:#fff;border:none;border-radius:12px;
  text-decoration:none;cursor:pointer;
  box-shadow:0 4px 14px rgba(37,211,102,.25);
  transition:transform .15s ease,background .2s ease,box-shadow .2s ease;
}
.act-btn-wa:hover{background:#1EBE58;box-shadow:0 6px 18px rgba(37,211,102,.35)}
.act-btn-wa:active{transform:translateY(1px)}

/* Terms (ketentuan member) block */
.terms-block{
  width:100%;max-width:380px;margin:14px auto 0;
  padding:14px 16px 16px;
  background:rgba(14,107,56,.06);
  border:1px solid rgba(201,168,76,.14);
  border-radius:14px;
}
.terms-title{
  display:flex;align-items:center;gap:7px;
  font-family:'Cormorant Garamond',serif;
  font-size:14px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;
  color:var(--gold);margin-bottom:4px;
}
.terms-sub{font-size:10.5px;color:var(--muted);margin-bottom:11px}
.terms-list{display:flex;flex-direction:column;gap:9px}
.term-item{display:flex;gap:9px;align-items:flex-start}
.term-icon{font-size:14px;flex-shrink:0;line-height:1.4}
.term-text{font-size:10.5px;color:rgba(239,243,238,.7);line-height:1.55}
.term-text strong{color:var(--text);font-weight:600}
.terms-footer{
  margin-top:12px;padding-top:10px;
  border-top:1px solid rgba(201,168,76,.1);
  font-size:9.5px;color:var(--muted);text-align:center;
}
`;

// ── Character SVG ─────────────────────────────────────────────
const CHARACTER_SVG = `<svg class="character-svg" width="210" height="195" viewBox="0 0 210 195"
     xmlns="http://www.w3.org/2000/svg" aria-label="Maskot billiard">
  <defs>
    <radialGradient id="skinGrad" cx="45%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#FDDCB0"/><stop offset="100%" stop-color="#E8B07A"/>
    </radialGradient>
    <linearGradient id="jacketGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a3a22"/><stop offset="100%" stop-color="#0a1e10"/>
    </linearGradient>
    <linearGradient id="cueGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8B5E2A"/><stop offset="60%" stop-color="#C49A5A"/><stop offset="100%" stop-color="#6B3F18"/>
    </linearGradient>
    <radialGradient id="ballGrad" cx="38%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#111111"/>
    </radialGradient>
    <radialGradient id="ballHl" cx="35%" cy="30%" r="40%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <linearGradient id="tieGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C9A84C"/><stop offset="100%" stop-color="#8A6A1E"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1a08"/><stop offset="100%" stop-color="#1a0f04"/>
    </linearGradient>
  </defs>
  <g style="transform-origin:155px 100px;animation:cueSwing 3s ease-in-out infinite">
    <rect x="148" y="28" width="6" height="152" rx="3" fill="url(#cueGrad)"/>
    <rect x="149" y="24" width="4" height="8" rx="2" fill="#4a90c4"/>
    <rect x="148.5" y="31" width="5" height="4" rx="1" fill="#ddd"/>
    <rect x="148" y="100" width="6" height="2" rx="1" fill="rgba(0,0,0,0.25)"/>
    <rect x="148" y="140" width="6" height="2" rx="1" fill="rgba(0,0,0,0.2)"/>
  </g>
  <rect x="79" y="143" width="22" height="38" rx="8" fill="#0f1f14"/>
  <rect x="105" y="143" width="22" height="38" rx="8" fill="#0f1f14"/>
  <ellipse cx="90" cy="181" rx="15" ry="7" fill="#1a1008"/>
  <ellipse cx="88" cy="179" rx="8" ry="4" fill="#2d1c0e" opacity="0.5"/>
  <ellipse cx="116" cy="181" rx="15" ry="7" fill="#1a1008"/>
  <ellipse cx="114" cy="179" rx="8" ry="4" fill="#2d1c0e" opacity="0.5"/>
  <rect x="68" y="100" width="70" height="52" rx="10" fill="url(#jacketGrad)"/>
  <path d="M86 100 L96 120 L80 130 Z" fill="#122a18" opacity="0.9"/>
  <path d="M120 100 L110 120 L126 130 Z" fill="#122a18" opacity="0.9"/>
  <path d="M96 100 L100 115 L106 115 L110 100 Z" fill="#f0f0e8"/>
  <path d="M100 103 L98 120 L103 128 L108 120 L106 103 Z" fill="url(#tieGrad)"/>
  <ellipse cx="103" cy="103" rx="4" ry="3" fill="#C9A84C"/>
  <circle cx="103" cy="135" r="2" fill="rgba(255,255,255,0.12)"/>
  <circle cx="103" cy="143" r="2" fill="rgba(255,255,255,0.12)"/>
  <path d="M122 108 L130 108 L128 114 L120 113 Z" fill="#C9A84C" opacity="0.85"/>
  <path d="M70 108 Q55 115 52 130 Q50 138 56 142" stroke="#FDDCB0" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M70 108 Q55 115 52 130 Q50 138 56 142" stroke="url(#jacketGrad)" stroke-width="12" fill="none" stroke-linecap="round"/>
  <ellipse cx="57" cy="144" rx="10" ry="8" fill="url(#skinGrad)"/>
  <ellipse cx="50" cy="140" rx="4" ry="3" fill="#FDDCB0" transform="rotate(-20 50 140)"/>
  <ellipse cx="48" cy="146" rx="4" ry="3" fill="#FDDCB0" transform="rotate(-10 48 146)"/>
  <ellipse cx="51" cy="151" rx="4" ry="3" fill="#FDDCB0" transform="rotate(10 51 151)"/>
  <path d="M136 108 Q148 116 150 128 Q151 136 148 140" stroke="#FDDCB0" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M136 108 Q148 116 150 128 Q151 136 148 140" stroke="url(#jacketGrad)" stroke-width="12" fill="none" stroke-linecap="round"/>
  <ellipse cx="149" cy="142" rx="9" ry="7" fill="url(#skinGrad)"/>
  <g style="transform-origin:57px 160px;animation:ballBounce 2s ease-in-out infinite 0.5s">
    <circle cx="52" cy="163" r="18" fill="url(#ballGrad)"/>
    <circle cx="52" cy="163" r="18" fill="url(#ballHl)"/>
    <circle cx="53" cy="164" r="8.5" fill="white" opacity="0.95"/>
    <text x="53" y="168" font-family="'DM Sans',sans-serif" font-size="10" font-weight="700" fill="#111" text-anchor="middle">8</text>
  </g>
  <rect x="97" y="90" width="14" height="14" rx="4" fill="#FDDCB0"/>
  <path d="M92 98 L97 90 L103 94 L109 90 L114 98 Z" fill="#f0f0e8"/>
  <ellipse cx="103" cy="68" rx="30" ry="32" fill="url(#skinGrad)"/>
  <ellipse cx="73" cy="70" rx="7" ry="9" fill="url(#skinGrad)"/>
  <ellipse cx="73" cy="70" rx="4" ry="6" fill="#e8a87a" opacity="0.5"/>
  <ellipse cx="133" cy="70" rx="7" ry="9" fill="url(#skinGrad)"/>
  <ellipse cx="133" cy="70" rx="4" ry="6" fill="#e8a87a" opacity="0.5"/>
  <ellipse cx="103" cy="46" rx="30" ry="18" fill="url(#hairGrad)"/>
  <ellipse cx="78" cy="55" rx="10" ry="14" fill="url(#hairGrad)"/>
  <ellipse cx="128" cy="55" rx="10" ry="14" fill="url(#hairGrad)"/>
  <path d="M95 40 Q100 28 110 33 Q120 38 115 44 Q108 34 98 40 Z" fill="#3a2510"/>
  <ellipse cx="100" cy="42" rx="12" ry="5" fill="rgba(255,255,255,0.06)" transform="rotate(-15 100 42)"/>
  <path d="M86 56 Q92 52 98 55" stroke="#3a2510" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M108 55 Q114 52 120 56" stroke="#3a2510" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="92" cy="64" rx="8" ry="8.5" fill="white"/>
  <ellipse cx="114" cy="64" rx="8" ry="8.5" fill="white"/>
  <path d="M84 60 Q92 56 100 60" fill="rgba(0,0,0,0.06)"/>
  <path d="M106 60 Q114 56 122 60" fill="rgba(0,0,0,0.06)"/>
  <circle cx="92" cy="65" r="5.5" fill="#3a2510"/>
  <circle cx="92" cy="65" r="3.5" fill="#1a0f04"/>
  <g style="transform-origin:114px 65px;animation:blinkEye 4s ease-in-out infinite 2s">
    <circle cx="114" cy="65" r="5.5" fill="#3a2510"/>
    <circle cx="114" cy="65" r="3.5" fill="#1a0f04"/>
  </g>
  <circle cx="94" cy="63" r="1.8" fill="white" opacity="0.9"/>
  <circle cx="116" cy="63" r="1.8" fill="white" opacity="0.9"/>
  <ellipse cx="80" cy="75" rx="8" ry="5" fill="rgba(240,140,120,0.22)"/>
  <ellipse cx="126" cy="75" rx="8" ry="5" fill="rgba(240,140,120,0.22)"/>
  <path d="M101 70 Q103 76 106 70" stroke="#c8906a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M88 80 Q103 93 118 80" stroke="#c8906a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M91 82 Q103 92 115 82 Q103 86 91 82 Z" fill="white" opacity="0.85"/>
  <rect x="82" y="58" width="20" height="14" rx="4" fill="none" stroke="#C9A84C" stroke-width="1.5" opacity="0.7"/>
  <rect x="108" y="58" width="20" height="14" rx="4" fill="none" stroke="#C9A84C" stroke-width="1.5" opacity="0.7"/>
  <line x1="102" y1="63" x2="108" y2="63" stroke="#C9A84C" stroke-width="1.5" opacity="0.7"/>
  <line x1="82" y1="63" x2="75" y2="62" stroke="#C9A84C" stroke-width="1.5" opacity="0.7"/>
  <line x1="128" y1="63" x2="135" y2="62" stroke="#C9A84C" stroke-width="1.5" opacity="0.7"/>
  <path d="M85 60 L89 60 L87 62 Z" fill="rgba(255,255,255,0.18)"/>
  <path d="M111 60 L115 60 L113 62 Z" fill="rgba(255,255,255,0.18)"/>
  <g opacity="0.7">
    <path d="M32 55 L33.5 52 L35 55 L38 56.5 L35 58 L33.5 61 L32 58 L29 56.5 Z" fill="#C9A84C" opacity="0.5"/>
    <path d="M170 50 L171 48 L172 50 L174 51 L172 52 L171 54 L170 52 L168 51 Z" fill="#C9A84C" opacity="0.4"/>
    <path d="M165 90 L166 88 L167 90 L169 91 L167 92 L166 94 L165 92 L163 91 Z" fill="#2DB56D" opacity="0.5"/>
    <path d="M40 95 L41 93 L42 95 L44 96 L42 97 L41 99 L40 97 L38 96 Z" fill="#2DB56D" opacity="0.45"/>
  </g>
  <circle cx="38" cy="40" r="5" fill="#E53935" opacity="0.7"/>
  <circle cx="38" cy="40" r="5" fill="url(#ballHl)" opacity="0.7"/>
  <text x="38" y="44" font-family="sans-serif" font-size="5" font-weight="700" fill="white" text-anchor="middle" opacity="0.9">1</text>
  <circle cx="172" cy="75" r="5" fill="#1565C0" opacity="0.7"/>
  <circle cx="172" cy="75" r="5" fill="url(#ballHl)" opacity="0.7"/>
  <text x="172" y="79" font-family="sans-serif" font-size="5" font-weight="700" fill="white" text-anchor="middle" opacity="0.9">9</text>
  <rect x="82" y="183" width="43" height="13" rx="6.5" fill="rgba(201,168,76,0.12)" stroke="rgba(201,168,76,0.25)" stroke-width="1"/>
  <text x="103.5" y="193" font-family="'DM Sans',sans-serif" font-size="7" font-weight="600" fill="#C9A84C" text-anchor="middle" letter-spacing="1">MEMBER</text>
</svg>`;

// ── Mini QR decorative placeholder ────────────────────────────
const MINI_QR = `<svg class="qr-mini-svg" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="21" height="21" fill="white"/>
  <rect x="0" y="0" width="6" height="6" fill="#111"/><rect x="1" y="1" width="4" height="4" fill="white"/><rect x="2" y="2" width="2" height="2" fill="#111"/>
  <rect x="15" y="0" width="6" height="6" fill="#111"/><rect x="16" y="1" width="4" height="4" fill="white"/><rect x="17" y="2" width="2" height="2" fill="#111"/>
  <rect x="0" y="15" width="6" height="6" fill="#111"/><rect x="1" y="16" width="4" height="4" fill="white"/><rect x="2" y="17" width="2" height="2" fill="#111"/>
  <rect x="7" y="0" fill="#111" width="1" height="1"/><rect x="9" y="0" fill="#111" width="1" height="1"/><rect x="11" y="0" fill="#111" width="1" height="1"/>
  <rect x="8" y="1" fill="#111" width="1" height="1"/><rect x="10" y="1" fill="#111" width="1" height="1"/><rect x="13" y="1" fill="#111" width="1" height="1"/>
  <rect x="7" y="2" fill="#111" width="1" height="1"/><rect x="11" y="2" fill="#111" width="1" height="1"/>
  <rect x="9" y="3" fill="#111" width="1" height="1"/><rect x="12" y="3" fill="#111" width="1" height="1"/>
  <rect x="8" y="4" fill="#111" width="1" height="1"/><rect x="10" y="4" fill="#111" width="1" height="1"/>
  <rect x="7" y="5" fill="#111" width="1" height="1"/><rect x="11" y="5" fill="#111" width="1" height="1"/>
  <rect x="0" y="7" fill="#111" width="1" height="1"/><rect x="2" y="7" fill="#111" width="1" height="1"/><rect x="6" y="7" fill="#111" width="1" height="1"/>
  <rect x="8" y="7" fill="#111" width="1" height="1"/><rect x="10" y="7" fill="#111" width="1" height="1"/>
  <rect x="0" y="8" fill="#111" width="1" height="1"/><rect x="3" y="8" fill="#111" width="1" height="1"/><rect x="7" y="8" fill="#111" width="1" height="1"/>
  <rect x="14" y="8" fill="#111" width="1" height="1"/><rect x="16" y="8" fill="#111" width="1" height="1"/><rect x="20" y="8" fill="#111" width="1" height="1"/>
  <rect x="1" y="9" fill="#111" width="1" height="1"/><rect x="5" y="9" fill="#111" width="1" height="1"/><rect x="8" y="9" fill="#111" width="1" height="1"/>
  <rect x="15" y="9" fill="#111" width="1" height="1"/><rect x="17" y="9" fill="#111" width="1" height="1"/>
  <rect x="0" y="10" fill="#111" width="1" height="1"/><rect x="4" y="10" fill="#111" width="1" height="1"/>
  <rect x="14" y="10" fill="#111" width="1" height="1"/><rect x="18" y="10" fill="#111" width="1" height="1"/>
  <rect x="2" y="11" fill="#111" width="1" height="1"/><rect x="7" y="11" fill="#111" width="1" height="1"/>
  <rect x="15" y="11" fill="#111" width="1" height="1"/><rect x="17" y="11" fill="#111" width="1" height="1"/>
  <rect x="7" y="13" fill="#111" width="1" height="1"/><rect x="9" y="13" fill="#111" width="1" height="1"/>
  <rect x="8" y="14" fill="#111" width="1" height="1"/><rect x="10" y="14" fill="#111" width="1" height="1"/><rect x="12" y="14" fill="#111" width="1" height="1"/>
  <rect x="7" y="15" fill="#111" width="1" height="1"/><rect x="11" y="15" fill="#111" width="1" height="1"/>
  <rect x="8" y="16" fill="#111" width="1" height="1"/><rect x="10" y="16" fill="#111" width="1" height="1"/>
  <rect x="7" y="17" fill="#111" width="1" height="1"/><rect x="9" y="17" fill="#111" width="1" height="1"/><rect x="12" y="17" fill="#111" width="1" height="1"/>
  <rect x="8" y="18" fill="#111" width="1" height="1"/><rect x="11" y="18" fill="#111" width="1" height="1"/>
</svg>`;

// ── Member ID badge ────────────────────────────────────────────
const idIcon = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
  <rect x=".5" y="1.5" width="10" height="7" rx="1.5" stroke="#2DB56D" stroke-width="1.1"/>
  <rect x="2" y="4" width="4" height="1" rx=".5" fill="#2DB56D"/>
  <rect x="2" y="5.5" width="2.5" height="1" rx=".5" fill="#2DB56D"/>
  <circle cx="8" cy="5" r="1.2" fill="#2DB56D"/>
</svg>`;

// ── Star icon (free badge) ─────────────────────────────────────
const starIcon = `<svg width="7" height="7" viewBox="0 0 8 8" fill="none" aria-hidden="true">
  <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" fill="currentColor"/>
</svg>`;

// ── Banner block builder ───────────────────────────────────────
const charBanner = (chipVariant, chipText, arenaName) => `
<div class="char-banner">
  <div class="char-spotlight"></div>
  <div class="char-shadow"></div>
  <div class="banner-brand">
    <div class="bb-orb"><div class="bb-dot"></div></div>
    <div>
      <div class="bb-name">${arenaName}</div>
      <div class="bb-tag">Member Card</div>
    </div>
  </div>
  <div class="banner-chip ${chipVariant}">
    <div class="chip-dot chip-dot-${chipVariant.replace('chip-','')}"></div>
    <div class="chip-label chip-label-${chipVariant.replace('chip-','')}">${chipText}</div>
  </div>
  ${CHARACTER_SVG}
</div>`;

// ── Dots progress builder ──────────────────────────────────────
const buildDots = (filled, total) => {
  let out = "";
  for (let i = 0; i < total; i++) {
    const n = i + 1;
    if (n === total)        out += `<div class="dot dot-free"></div>`;
    else if (n <= filled)   out += `<div class="dot dot-filled"></div>`;
    else                    out += `<div class="dot"></div>`;
  }
  return out;
};

// ── Session section builder ────────────────────────────────────
const sessionSection = (tm, batas, label) => {
  const sisa = Math.max(0, batas - tm);
  return `
<div class="session-section">
  <div class="session-header">
    <div class="session-label">${label}</div>
    <div class="session-count"><em>${tm}</em> / ${batas}</div>
  </div>
  <div class="dots-row" role="progressbar" aria-valuenow="${tm}" aria-valuemin="0" aria-valuemax="${batas}">
    ${buildDots(tm, batas)}
  </div>
  <div class="session-meta">
    <span>${tm} dari ${batas} sesi &nbsp;·&nbsp; ${sisa} lagi untuk gratis</span>
    <div class="free-badge">${starIcon} Free</div>
  </div>
</div>`;
};

// ── Member identity block ──────────────────────────────────────
const memberIdentity = (nama, kode) => `
<div class="member-identity">
  <div class="member-left">
    <div class="member-name">${nama}</div>
    ${kode ? `<div class="member-id-wrap">${idIcon}<span class="member-id">${kode}</span></div>` : ""}
  </div>
  <div class="qr-mini">${MINI_QR}</div>
</div>`;

// ── WA Booking button (post-checkin) ──────────────────────────
const waBookBtn = (nama, kode) => {
  const wa   = CONFIG.NOMOR_WA || "6281519210552";
  const text = encodeURIComponent(
    `Halo ${CONFIG.NAMA_ARENA}, saya ${nama}${kode ? ` (member ${kode})` : ""}. Mau booking meja, ada yang tersedia? 🎱`
  );
  return `<div class="act-row">
    <a class="act-btn-wa" href="https://wa.me/${wa}?text=${text}" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.126 1.535 5.862L.057 23.5l5.773-1.514A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.031-1.385l-.36-.214-3.427.899.916-3.338-.235-.375A9.808 9.808 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
      </svg>
      Booking Meja via WhatsApp
    </a>
  </div>`;
};

// ── Terms / Ketentuan Member block ────────────────────────────
const termsBlock = () => `
<div class="terms-block">
  <div class="terms-title">Ketentuan Member ${CONFIG.NAMA_ARENA}</div>
  <div class="terms-sub">Biar nggak ada salah paham, simak dulu ya!</div>
  <div class="terms-list">
    <div class="term-item">
      <span class="term-icon">🎁</span>
      <div class="term-text"><strong>Bonus berlaku 2 minggu</strong> — lebih dari itu sayang banget kalau hangus. Jangan lupa diklaim!</div>
    </div>
    <div class="term-item">
      <span class="term-icon">🌙</span>
      <div class="term-text"><strong>Malam Minggu? Tunggu sepi dulu</strong> — Bonus gratis nggak bisa diklaim saat ramai. Datang siang lebih aman.</div>
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
</div>`;

// ── HTML doc wrapper ───────────────────────────────────────────
const htmlDoc = (title, extraCss, bodyContent) => `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${title}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
${FONTS_LINK}
<style>${SHARED_CSS}${extraCss || ""}</style>
</head>
<body>${bodyContent}</body>
</html>`;

// ─────────────────────────────────────────────────────────────
// ── PIN Page (kasir) ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

export const pinPage = (kode, nama, errorMsg = null) => htmlDoc(
  CONFIG.NAMA_ARENA,
  `
input[type=password]{
  width:100%;padding:14px;
  border:1.5px solid rgba(201,168,76,.25);
  border-radius:12px;font-size:28px;text-align:center;
  letter-spacing:.5em;outline:none;
  font-family:'DM Mono',monospace;margin-bottom:12px;
  background:rgba(255,255,255,.04);color:var(--text);
  transition:border-color .2s,box-shadow .2s;
}
input[type=password]:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
.durasi-label{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:7px;text-align:center}
.durasi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.durasi-opt{position:relative;cursor:pointer}
.durasi-opt input{position:absolute;opacity:0;pointer-events:none}
.durasi-chip{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 4px;border-radius:10px;border:1.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);transition:all .15s ease}
.durasi-chip .h{font-family:'DM Mono',monospace;font-size:15px;font-weight:600;color:var(--text);line-height:1}
.durasi-chip .p{font-size:9px;font-weight:600;letter-spacing:.06em;color:var(--muted);margin-top:3px;text-transform:uppercase}
/* 4/6/8 jam = non-default, kasih tint amber biar kasir aware */
.durasi-opt.is-long .durasi-chip{border-color:rgba(245,158,11,.18)}
.durasi-opt input:checked + .durasi-chip{background:linear-gradient(135deg,rgba(45,181,109,.16),rgba(45,181,109,.08));border-color:rgba(45,181,109,.5);box-shadow:0 0 0 3px rgba(45,181,109,.1)}
.durasi-opt.is-long input:checked + .durasi-chip{background:linear-gradient(135deg,rgba(245,158,11,.18),rgba(245,158,11,.08));border-color:rgba(245,158,11,.55);box-shadow:0 0 0 3px rgba(245,158,11,.1)}
.durasi-opt input:checked + .durasi-chip .h{color:var(--green-lt)}
.durasi-opt input:checked + .durasi-chip .p{color:var(--green-lt)}
.durasi-opt.is-long input:checked + .durasi-chip .h{color:#fbbf24}
.durasi-opt.is-long input:checked + .durasi-chip .p{color:#fbbf24}
.durasi-opt:hover .durasi-chip{border-color:rgba(255,255,255,.18)}
.durasi-warn{
  display:none;align-items:flex-start;gap:8px;
  background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.28);
  border-radius:10px;padding:9px 11px;margin-bottom:14px;
  font-size:11.5px;color:#fbbf24;line-height:1.5;
}
.durasi-warn.show{display:flex}
.durasi-warn .w-ic{flex-shrink:0;font-size:14px;line-height:1.3}
.durasi-warn strong{color:#fde68a;font-weight:700}
button[type=submit]{
  width:100%;border:none;border-radius:12px;padding:14px;
  font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.06em;
  background:linear-gradient(135deg,var(--green),#0f4a2e);color:#fff;
  text-transform:uppercase;transition:opacity .15s,transform .15s;
}
button[type=submit]:active{opacity:.85;transform:scale(.98)}
.err{
  background:rgba(239,68,68,.08);color:#fca5a5;
  border:1px solid rgba(239,68,68,.25);border-radius:10px;
  padding:8px 12px;font-size:12px;margin-bottom:12px;text-align:center;
}
.pin-card{
  width:360px;background:var(--card-bg);border-radius:24px;
  border:1px solid var(--border);padding:28px 24px;position:relative;
}
.pin-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--gold-lt) 35%,var(--green-lt) 65%,transparent);
  opacity:.7;border-radius:24px 24px 0 0;
}
`,
  `
<div class="page-header">
  <div class="brand-name">${CONFIG.NAMA_ARENA}</div>
  <div class="page-desc">Konfirmasi check-in billiard</div>
</div>
<div class="card-wrap">
  <div class="pin-card">
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(45,181,109,.1);border:1px solid rgba(45,181,109,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-lt)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:5px">${nama}</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green-lt);letter-spacing:.1em">${kode}</div>
    </div>
    <p style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:16px;line-height:1.65">
      Kasir: masukkan PIN untuk<br>konfirmasi kehadiran member.
    </p>
    ${errorMsg ? `<div class="err">${errorMsg}</div>` : ""}
    <form action="/checkin" method="POST" id="checkinForm" onsubmit="return confirmCheckin(event)">
      <input type="hidden" name="id" value="${kode}">
      <div class="durasi-label">Durasi main (jam)</div>
      <div class="durasi-row">
        <label class="durasi-opt"><input type="radio" name="durasi" value="2" checked onchange="onDurasiChange(this)"><span class="durasi-chip"><span class="h">2</span><span class="p">1 point</span></span></label>
        <label class="durasi-opt is-long" onclick="return guardLong(2,4,event)"><input type="radio" name="durasi" value="4" onchange="onDurasiChange(this)"><span class="durasi-chip"><span class="h">4</span><span class="p">2 point</span></span></label>
        <label class="durasi-opt is-long" onclick="return guardLong(2,6,event)"><input type="radio" name="durasi" value="6" onchange="onDurasiChange(this)"><span class="durasi-chip"><span class="h">6</span><span class="p">3 point</span></span></label>
        <label class="durasi-opt is-long" onclick="return guardLong(2,8,event)"><input type="radio" name="durasi" value="8" onchange="onDurasiChange(this)"><span class="durasi-chip"><span class="h">8</span><span class="p">4 point</span></span></label>
      </div>
      <div class="durasi-warn" id="durasiWarn">
        <span class="w-ic">⚠️</span>
        <span>Dipilih <strong id="warnJam">4 jam</strong> (+<strong id="warnPt">2</strong> point). Pastikan benar — kebanyakan member main <strong>2 jam</strong>.</span>
      </div>
      <input type="password" name="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="••••" maxlength="8" autofocus oninput="this.value=this.value.replace(/[^0-9]/g,'')">
      <button type="submit">Konfirmasi Check-in</button>
    </form>
    <script>
      // Confirmation untuk durasi non-default (4/6/8 jam). Klik chip selain
      // yg lagi aktif → confirm dialog. Confirm OK → switch. Cancel → batal.
      function guardLong(current, target, evt) {
        var cur = document.querySelector('input[name="durasi"]:checked');
        var curVal = cur ? parseInt(cur.value, 10) : 2;
        if (curVal === target) return true; // udah aktif, gak perlu confirm
        var pt = target / 2;
        var msg = 'Ganti durasi ke ' + target + ' jam?\\n\\nMember akan dapet ' + pt + ' point.\\nKebanyakan member main 2 jam.';
        if (!confirm(msg)) {
          evt.preventDefault();
          return false;
        }
      }
      function onDurasiChange(input) {
        var val = parseInt(input.value, 10);
        var warn = document.getElementById('durasiWarn');
        if (val === 2) {
          warn.classList.remove('show');
        } else {
          document.getElementById('warnJam').textContent = val + ' jam';
          document.getElementById('warnPt').textContent = val / 2;
          warn.classList.add('show');
        }
      }
      // Safety net pas submit — kalau pilih non-default, confirm sekali lagi
      function confirmCheckin(evt) {
        var cur = document.querySelector('input[name="durasi"]:checked');
        var val = cur ? parseInt(cur.value, 10) : 2;
        if (val !== 2) {
          var ok = confirm('Konfirmasi check-in dgn durasi ' + val + ' jam (+' + (val/2) + ' point)?');
          if (!ok) { evt.preventDefault(); return false; }
        }
        return true;
      }
    </script>
    <p style="font-size:11px;color:var(--muted);text-align:center;margin-top:14px;line-height:1.65">
      Hanya kasir yang bisa konfirmasi check-in.<br>Member cukup tunjukkan QR.
    </p>
  </div>
</div>`
);

// ─────────────────────────────────────────────────────────────
// ── Result Pages ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

export const resultPage = (tipe, data) => {
  const {
    nama = "", judul = "", pesan = "",
    totalMain = 0, totalGratis = 0, kode = "",
    expired = false, jamScan = "",
    durasi = 0, pointDapat = 0,
  } = data;

  const tm  = totalMain;
  const now = formatTanggal(new Date());
  const tip = getTip();

  // ── Sukses ─────────────────────────────────────────────────
  if (tipe === "sukses") return htmlDoc(
    CONFIG.NAMA_ARENA, "",
    `
<div class="page-header">
  <div class="brand-name">${CONFIG.NAMA_ARENA}</div>
  <div class="page-desc">Tunjukkan kartu ini ke kasir untuk check-in billiard.</div>
</div>
<div class="card-wrap">
  <div class="card">
    ${charBanner("chip-green", "Check-in ✓", CONFIG.NAMA_ARENA)}
    <div class="card-body">
      ${memberIdentity(nama, kode)}
      <div class="divider"></div>
      ${sessionSection(tm, CONFIG.BATAS_MAIN, "Sesi Bulan Ini")}
      ${durasi > 0 ? `<div class="point-earn-badge">
        <span class="pe-icon">⭐</span>
        <span class="pe-text">Main <strong>${durasi} jam</strong> · dapet <strong>+${pointDapat} point</strong></span>
      </div>` : ""}
      <div class="checkin-badge cb-green">
        <div class="check-icon ci-green">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5L4 7L8 3" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="checkin-text ct-green">
          ${expired ? "Periode baru dimulai — selamat main!" : "Check-in berhasil hari ini!"}
        </div>
      </div>
      <div class="tip-section">
        <div class="tip-label">Tip hari ini</div>
        <div class="tip-text">${tip}</div>
      </div>
      <div class="card-footer">${now}</div>
    </div>
  </div>
</div>`
  );

  // ── Sudah Scan ─────────────────────────────────────────────
  if (tipe === "sudahScan") return htmlDoc(
    CONFIG.NAMA_ARENA, "",
    `
<div class="page-header">
  <div class="brand-name">${CONFIG.NAMA_ARENA}</div>
  <div class="page-desc">Kartu Member</div>
</div>
<div class="card-wrap">
  <div class="card">
    ${charBanner("chip-amber", "Sudah Hadir", CONFIG.NAMA_ARENA)}
    <div class="card-body">
      ${memberIdentity(nama, kode)}
      <div class="divider"></div>
      ${sessionSection(tm, CONFIG.BATAS_MAIN, "Sesi Bulan Ini")}
      <div class="checkin-badge cb-amber">
        <div class="check-icon ci-amber">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" stroke="white" stroke-width="1.4"/>
            <path d="M5 3.2V5l1 1" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="checkin-text ct-amber">
          Sudah check-in pukul ${jamScan} — sampai besok!
        </div>
      </div>
      <div class="card-footer">${now}</div>
    </div>
  </div>
</div>
${waBookBtn(nama, kode)}
${termsBlock()}`
  );

  // ── Gratis ─────────────────────────────────────────────────
  if (tipe === "gratis") return htmlDoc(
    CONFIG.NAMA_ARENA,
    `.card{animation:celebrateGlow 2s ease-in-out infinite}`,
    `
<div class="page-header">
  <div class="brand-name">${CONFIG.NAMA_ARENA}</div>
  <div class="page-desc">Selamat — reward menanti kamu!</div>
</div>
<div class="card-wrap">
  <div class="card">
    ${charBanner("chip-gold", "GRATIS 🏆", CONFIG.NAMA_ARENA)}
    <div class="card-body">
      ${memberIdentity(nama, kode)}
      <div class="divider"></div>
      <div class="session-section" style="border-color:rgba(201,168,76,.2);background:rgba(201,168,76,.04)">
        <div class="session-header">
          <div class="session-label">Reward Gratis</div>
          <div class="session-count"><em style="color:var(--gold)">${totalGratis}\xd7</em> diraih</div>
        </div>
        <div style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:6px">Reward ke-${totalGratis}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:var(--gold-lt);line-height:1;margin-bottom:6px">MAIN GRATIS!</div>
          <div style="font-size:11px;color:var(--muted)">Kamu sudah main ${CONFIG.BATAS_MAIN}\xd7 bulan ini 🎉</div>
        </div>
      </div>
      <div class="checkin-badge cb-gold">
        <div class="check-icon ci-gold">
          ${starIcon}
        </div>
        <div class="checkin-text ct-gold">Tunjukkan halaman ini ke kasir — jangan tutup!</div>
      </div>
      <div class="card-footer">${now} &nbsp;\xb7&nbsp; Reward #${totalGratis}</div>
    </div>
  </div>
</div>`
  );

  // ── Error ───────────────────────────────────────────────────
  return htmlDoc(
    CONFIG.NAMA_ARENA, "",
    `
<div class="card-wrap">
  <div class="card">
    <div style="padding:40px 24px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
        </svg>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--text);margin-bottom:10px">
        ${judul || "Terjadi Kesalahan"}
      </div>
      <p style="font-size:13px;color:var(--muted);line-height:1.65;margin-bottom:22px">
        ${pesan || "Hubungi kasir untuk bantuan."}
      </p>
      <div class="tip-section">
        <div class="tip-label">Perlu bantuan?</div>
        <div class="tip-text">Hubungi kasir atau pemilik arena untuk mendaftarkan QR kamu.</div>
      </div>
    </div>
  </div>
</div>`
  );
};
