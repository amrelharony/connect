// ═══════════════════════════════════════════════════════════════
// PHASE 6: SOCIAL PROOF & VISITOR INTELLIGENCE — amrelharony.com (v2)
// Drop-in: <script src="phase6-intelligence.js" defer></script>
//
// Features:
//   1. Command Palette (Cmd+K / Ctrl+K)
//   2. Visitor Insights Dashboard (terminal > admin)
//   3. Interactive Resume Timeline (scroll-animated, filterable)
//   4. Live Guestbook (emoji wall)
//   5. Voice Navigation (Web Speech API)
//
// Radar chart removed. Timeline rebuilt with wow-factor animations.
// ═══════════════════════════════════════════════════════════════
(function PhaseSixIntelligence() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase6-css';
  css.textContent = `

/* ═══════════════════════════════════════════
   1. COMMAND PALETTE
   ═══════════════════════════════════════════ */

#cmdPaletteOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.7); backdrop-filter: blur(12px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 18vh;
  opacity: 0; visibility: hidden; transition: opacity .2s, visibility .2s; pointer-events: none;
}
#cmdPaletteOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.cmd-palette {
  width: 94%; max-width: 460px; border-radius: 16px;
  background: rgba(13,20,32,.98); border: 1px solid #1a2332;
  box-shadow: 0 20px 60px rgba(0,0,0,.6); overflow: hidden;
  transform: scale(.95) translateY(-10px);
  transition: transform .25s cubic-bezier(.16,1,.3,1);
}
#cmdPaletteOverlay.show .cmd-palette { transform: scale(1) translateY(0); }
.cmd-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid #1a2332;
}
.cmd-input-icon { color: #4a5568; font-size: 14px; flex-shrink: 0; }
.cmd-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  color: #e2e8f0; caret-color: #00e1ff;
}
.cmd-input::placeholder { color: #3a4a5c; }
.cmd-input-hint { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #2d3748; letter-spacing: 1px; flex-shrink: 0; }
.cmd-results { max-height: 320px; overflow-y: auto; padding: 6px; }
.cmd-results::-webkit-scrollbar { width: 3px; }
.cmd-results::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
.cmd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background .15s; -webkit-tap-highlight-color: transparent;
}
.cmd-item:hover, .cmd-item.active { background: rgba(0,225,255,.06); }
.cmd-item-icon { font-size: 16px; width: 24px; text-align: center; flex-shrink: 0; }
.cmd-item-text { flex: 1; min-width: 0; }
.cmd-item-name { font-size: 12px; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd-item-name mark { background: none; color: #00e1ff; font-weight: 600; }
.cmd-item-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,.04); color: #4a5568;
  letter-spacing: .5px; text-transform: uppercase; flex-shrink: 0;
}
.cmd-empty { text-align: center; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #3a4a5c; }
.cmd-footer {
  display: flex; justify-content: center; gap: 12px;
  padding: 8px; border-top: 1px solid #111827;
  font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #2d3748; letter-spacing: 1px;
}
@media print { #cmdPaletteOverlay { display: none !important; } }


/* ═══════════════════════════════════════════
   2. ADMIN DASHBOARD
   ═══════════════════════════════════════════ */

#adminOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.96); display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: opacity .3s, visibility .3s;
  pointer-events: none; backdrop-filter: blur(14px);
}
#adminOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.admin-panel {
  width: 96%; max-width: 520px; max-height: 85vh; overflow-y: auto;
  padding: 20px; border-radius: 16px;
  background: #080c14; border: 1px solid #1a2332;
  transform: scale(.9); transition: transform .4s cubic-bezier(.16,1,.3,1);
}
#adminOverlay.show .admin-panel { transform: scale(1); }
.admin-panel::-webkit-scrollbar { width: 3px; }
.admin-panel::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
.admin-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #ef4444; text-align: center; margin-bottom: 14px; }
.admin-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.admin-stat { padding: 12px; border-radius: 10px; background: rgba(255,255,255,.02); border: 1px solid #1a2332; text-align: center; }
.admin-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: #00e1ff; line-height: 1; }
.admin-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 1.5px; text-transform: uppercase; color: #4a5568; margin-top: 4px; }
.admin-section { margin-top: 14px; padding-top: 14px; border-top: 1px solid #111827; }
.admin-section-title { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
.admin-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px; }
.admin-row-label { color: #8b949e; }
.admin-row-val { font-family: 'JetBrains Mono', monospace; color: #e2e8f0; font-weight: 600; }
.admin-bar-wrap { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.admin-bar-label { font-size: 10px; color: #6b7280; width: 80px; flex-shrink: 0; }
.admin-bar-track { flex: 1; height: 6px; border-radius: 3px; background: #111827; overflow: hidden; }
.admin-bar-fill { height: 100%; border-radius: 3px; transition: width .8s cubic-bezier(.16,1,.3,1); }
.admin-bar-val { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; width: 30px; text-align: right; }
.admin-close { text-align: center; margin-top: 14px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer; opacity: .4; }
.admin-close:hover { opacity: 1; color: #ef4444; }
@media print { #adminOverlay { display: none !important; } }


/* ═══════════════════════════════════════════
   ALWAYS-VISIBLE CTA BUTTONS
   ═══════════════════════════════════════════ */
.always-cta-row {
  display: flex; gap: 8px; margin: 14px 0 4px;
}
.always-cta {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 12px; border-radius: 10px;
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  text-decoration: none; transition: all .35s cubic-bezier(.16,1,.3,1);
  position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.always-cta::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.08) 50%, transparent 60%);
  transform: translateX(-100%); pointer-events: none;
}
.always-cta:hover::before { animation: shm .7s ease forwards; }
@keyframes shm { to { transform: translateX(100%); } }
.always-cta-linkedin {
  background: linear-gradient(135deg, #0077b5, #005f8f);
  color: #fff; border: 1px solid rgba(0,119,181,.3);
}
.always-cta-linkedin:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,119,181,.3); color: #fff; }
.always-cta-cal {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: var(--bg); border: 1px solid rgba(0,225,255,.2);
}
.always-cta-cal:hover { transform: translateY(-2px); box-shadow: 0 6px 20px var(--glowS); color: var(--bg); }
.always-cta i { font-size: 12px; }
@media print { .always-cta-row { display: none !important; } }


/* ═══════════════════════════════════════════
   3. INTERACTIVE TIMELINE — ADVANCED ENGINE
   ═══════════════════════════════════════════ */

/* --- Canvas particle backdrop --- */
.tl-particle-canvas {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  border-radius: 12px; opacity: .6;
}

/* --- Filter pills --- */
.tl-filters {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
  margin: 0 0 10px; padding: 0;
}
.tl-filter-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 4px 12px; border-radius: 100px;
  border: 1px solid var(--border); background: var(--card); color: var(--sub);
  cursor: pointer; transition: all .3s cubic-bezier(.16,1,.3,1);
  -webkit-tap-highlight-color: transparent; backdrop-filter: blur(6px);
}
.tl-filter-btn:hover { border-color: rgba(0,225,255,.25); color: var(--text); background: var(--cardH); }
.tl-filter-btn.active {
  border-color: var(--accent); color: var(--accent);
  background: rgba(0,225,255,.08);
  box-shadow: 0 0 12px rgba(0,225,255,.1), inset 0 0 12px rgba(0,225,255,.03);
}

/* --- SVG animated line (replaces static div line) --- */
.tl-svg-line {
  position: absolute; left: 0; top: 0; width: 12px; height: 100%;
  z-index: 1; pointer-events: none; overflow: visible;
}
.tl-svg-path-bg { fill: none; stroke: var(--border); stroke-width: 1.5; }
.tl-svg-path-glow {
  fill: none; stroke: url(#tlLineGrad); stroke-width: 2.5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px rgba(0,225,255,.5)) drop-shadow(0 0 12px rgba(99,102,241,.2));
  transition: stroke-dashoffset .08s linear;
}

/* --- Enhanced items --- */
.tl-item.tl-enhanced {
  cursor: pointer; flex-wrap: wrap; position: relative;
  transition: all .5s cubic-bezier(.16,1,.3,1) !important;
}

/* Entrance: slide + blur + scale */
.tl-item.tl-hidden {
  opacity: 0 !important;
  transform: translateX(-16px) translateY(14px) scale(.97) !important;
  filter: blur(3px);
}
.tl-item.tl-visible {
  opacity: 1 !important; transform: none !important; filter: none;
  transition: opacity .6s cubic-bezier(.16,1,.3,1),
              transform .6s cubic-bezier(.16,1,.3,1),
              filter .6s cubic-bezier(.16,1,.3,1) !important;
}

/* Filter out */
.tl-item.filtered-out {
  opacity: .08 !important; transform: scale(.94) translateX(8px) !important;
  pointer-events: none; filter: grayscale(.8) blur(1px);
  transition: all .45s cubic-bezier(.16,1,.3,1) !important;
}

/* --- Dot: orbital ring + radar ping --- */
.tl-item.tl-enhanced .tl-dot {
  transition: all .45s cubic-bezier(.16,1,.3,1);
  z-index: 3;
}
.tl-item.tl-enhanced .tl-dot::before {
  content: ''; position: absolute;
  inset: -5px; border-radius: 50%;
  border: 1px dashed transparent;
  transition: border-color .4s;
}
.tl-item.tl-active .tl-dot::before {
  border-color: rgba(0,225,255,.2);
  animation: tlOrbit 4s linear infinite;
}
/* Radar ping on active */
.tl-item.tl-active .tl-dot::after {
  content: ''; position: absolute;
  inset: -3px; border-radius: 50%;
  border: 1.5px solid var(--accent);
  animation: tlPing 2s cubic-bezier(0,.6,.5,1) infinite;
}
.tl-item:not(.tl-active) .tl-dot::after { display: none; }

@keyframes tlOrbit { to { transform: rotate(360deg); } }
@keyframes tlPing {
  0% { transform: scale(1); opacity: .7; }
  100% { transform: scale(3); opacity: 0; }
}

/* Active dot glow */
.tl-item.tl-active .tl-dot {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 4px rgba(0,225,255,.1), 0 0 16px rgba(0,225,255,.35) !important;
  transform: scale(1.4);
}

/* Active item ambient glow */
.tl-item.tl-active {
  background: linear-gradient(90deg, rgba(0,225,255,.03), transparent 80%);
  border-radius: 8px; padding: 10px 0 10px 16px !important;
}

/* --- Era headers: gradient text + animated bar --- */
.tl-item.tl-era.tl-visible .tl-txt strong {
  background: linear-gradient(90deg, var(--text), var(--accent));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: tlEraShift 4s ease-in-out infinite alternate;
}
@keyframes tlEraShift {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}
.tl-item.tl-era.tl-visible::after {
  content: ''; position: absolute; bottom: -1px;
  left: 36px; right: 0; height: 1px;
  background: linear-gradient(90deg, var(--accent), transparent);
  opacity: .15; animation: tlBarSlide .8s ease-out forwards;
}
@keyframes tlBarSlide { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }

/* --- Year label glow on active --- */
.tl-item.tl-active .tl-yr {
  color: var(--accent) !important;
  text-shadow: 0 0 8px rgba(0,225,255,.4);
  transition: all .3s !important;
}
.tl-item:hover .tl-yr { color: var(--accent); }

/* --- Expand card: glass morphism + 3D --- */
.tl-item-expand {
  max-height: 0; overflow: hidden; opacity: 0;
  transition: max-height .55s cubic-bezier(.16,1,.3,1), opacity .4s .08s, margin .3s;
  margin: 0; flex-basis: 100%; width: 100%; order: 99;
}
.tl-item-expand.open { max-height: 280px; opacity: 1; margin: 8px 0 0; }
.tl-expand-content {
  padding: 12px 14px; border-radius: 12px;
  background: rgba(0,225,255,.02);
  border: 1px solid rgba(0,225,255,.06);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  font-size: 10px; line-height: 1.7; color: var(--sub);
  position: relative; overflow: hidden;
  transform-style: preserve-3d;
  transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s;
}
.tl-expand-content:hover {
  transform: perspective(600px) rotateX(1deg) rotateY(-1deg) scale(1.01);
  box-shadow: 0 8px 24px rgba(0,225,255,.06);
}
.tl-expand-content::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent);
  opacity: .4;
}
.tl-expand-content::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 20% 0%, rgba(0,225,255,.04), transparent 70%);
  pointer-events: none;
}
.tl-expand-content strong { color: var(--text); }
.tl-expand-metric {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 3px 8px; border-radius: 6px;
  background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.12);
  color: #22c55e; margin: 6px 4px 0 0;
  box-shadow: 0 0 8px rgba(34,197,94,.06);
}

/* --- Year navigator (fixed sidebar) --- */
.tl-year-nav {
  position: fixed; right: 8px; top: 50%; transform: translateY(-50%);
  z-index: 98; display: flex; flex-direction: column; gap: 1px;
  opacity: 0; transition: opacity .4s; pointer-events: none;
}
.tl-year-nav.show { opacity: 1; pointer-events: auto; }
.tl-year-pip {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  color: var(--sub); padding: 3px 8px; border-radius: 6px;
  text-align: right; cursor: pointer; transition: all .3s cubic-bezier(.16,1,.3,1);
  letter-spacing: .5px; opacity: .3; position: relative;
}
.tl-year-pip:hover { opacity: .7; color: var(--text); }
.tl-year-pip.active {
  color: var(--accent); background: rgba(0,225,255,.08);
  transform: translateX(-4px); opacity: 1;
  box-shadow: 0 0 10px rgba(0,225,255,.08);
}
.tl-year-pip.active::before {
  content: ''; position: absolute; right: -2px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 3px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

/* --- Progress counter (above timeline) --- */
.tl-progress-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; opacity: 0; transition: opacity .5s;
}
.tl-progress-bar.show { opacity: 1; }
.tl-progress-track {
  flex: 1; height: 2px; border-radius: 1px; background: var(--border);
  overflow: hidden; position: relative;
}
.tl-progress-fill {
  height: 100%; border-radius: 1px; width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent3));
  transition: width .15s linear; position: relative;
}
.tl-progress-fill::after {
  content: ''; position: absolute; right: 0; top: -2px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 8px var(--accent);
}
.tl-progress-label {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  color: var(--accent); letter-spacing: 1px; flex-shrink: 0; min-width: 28px;
  text-align: right;
}

/* --- Zen / RTL / Mobile / Print --- */
body.zen-mode .tl-filters, body.zen-mode .tl-year-nav,
body.zen-mode .tl-item-expand, body.zen-mode .tl-particle-canvas,
body.zen-mode .tl-svg-line, body.zen-mode .tl-progress-bar { display: none !important; }
[dir="rtl"] .tl-svg-line { left: auto; right: 0; }
[dir="rtl"] .tl-year-nav { right: auto; left: 8px; }
[dir="rtl"] .tl-year-pip { text-align: left; }
[dir="rtl"] .tl-year-pip.active { transform: translateX(4px); }
@media(max-width:600px) { .tl-year-nav { display: none !important; } }
@media print {
  .tl-filters, .tl-item-expand, .tl-year-nav,
  .tl-svg-line, .tl-particle-canvas, .tl-progress-bar { display: none !important; }
}


/* ═══════════════════════════════════════════
   4. GUESTBOOK
   ═══════════════════════════════════════════ */

#guestbookOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.92); display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: opacity .3s, visibility .3s;
  pointer-events: none; backdrop-filter: blur(10px);
}
#guestbookOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.gb-panel {
  width: 94%; max-width: 400px; max-height: 80vh;
  padding: 20px; border-radius: 16px;
  background: #080c14; border: 1px solid #1a2332; overflow-y: auto;
  transform: scale(.9); transition: transform .4s cubic-bezier(.16,1,.3,1);
}
#guestbookOverlay.show .gb-panel { transform: scale(1); }
.gb-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #00e1ff; text-align: center; margin-bottom: 4px; }
.gb-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #4a5568; text-align: center; letter-spacing: 1px; margin-bottom: 14px; }
.gb-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.gb-emoji-row { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
.gb-emoji-btn {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid #1a2332; background: transparent; font-size: 18px;
  cursor: pointer; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.gb-emoji-btn:hover { border-color: rgba(0,225,255,.2); transform: scale(1.1); }
.gb-emoji-btn.selected { border-color: #00e1ff; background: rgba(0,225,255,.08); transform: scale(1.15); }
.gb-name-input, .gb-msg-input {
  border: 1px solid #1a2332; border-radius: 8px;
  background: rgba(255,255,255,.02); color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  padding: 8px 10px; outline: none; transition: border-color .2s;
}
.gb-name-input:focus, .gb-msg-input:focus { border-color: rgba(0,225,255,.3); }
.gb-name-input::placeholder, .gb-msg-input::placeholder { color: #2d3748; }
.gb-submit {
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 8px 16px; border-radius: 8px;
  border: 1px solid #00e1ff; background: rgba(0,225,255,.06);
  color: #00e1ff; cursor: pointer; transition: all .2s; align-self: center;
}
.gb-submit:hover { background: rgba(0,225,255,.15); }
.gb-submit:disabled { opacity: .3; cursor: default; }
.gb-entries { display: flex; flex-direction: column; gap: 6px; }
.gb-entry {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px; border-radius: 10px;
  background: rgba(255,255,255,.02); border: 1px solid #111827;
  animation: gbFadeIn .3s ease;
}
@keyframes gbFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.gb-entry-emoji { font-size: 20px; flex-shrink: 0; }
.gb-entry-meta { flex: 1; min-width: 0; }
.gb-entry-name { font-size: 11px; font-weight: 600; color: #c9d1d9; }
.gb-entry-msg { font-size: 10px; color: #6b7280; margin-top: 2px; }
.gb-entry-time { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #2d3748; margin-top: 3px; }
.gb-empty { text-align: center; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #2d3748; }
.gb-close { text-align: center; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer; opacity: .4; }
.gb-close:hover { opacity: 1; color: #00e1ff; }
.gb-bubble {
  position: fixed; pointer-events: none; z-index: 98; font-size: 20px; opacity: 0;
  animation: gbBubble 6s ease-out forwards;
}
@keyframes gbBubble {
  0% { opacity: 0; transform: translateY(0) scale(.5); }
  10% { opacity: .6; transform: translateY(-20px) scale(1); }
  90% { opacity: .3; transform: translateY(-120px) scale(.8); }
  100% { opacity: 0; transform: translateY(-150px) scale(.6); }
}
@media print { #guestbookOverlay, .gb-bubble { display: none !important; } }


/* ═══════════════════════════════════════════
   5. VOICE NAVIGATION
   ═══════════════════════════════════════════ */

.voice-btn {
  position: fixed; bottom: 24px; left: 16px; z-index: 99;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--card);
  backdrop-filter: blur(20px); color: var(--sub);
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .3s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  opacity: .5; -webkit-tap-highlight-color: transparent;
}
.voice-btn:hover { opacity: 1; border-color: var(--accent); color: var(--accent); transform: scale(1.08); }
.voice-btn.listening {
  opacity: 1; border-color: #ef4444; color: #ef4444;
  animation: voicePulse 1.5s ease-in-out infinite;
}
@keyframes voicePulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.3); }
  50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
}
.voice-transcript {
  position: fixed; bottom: 68px; left: 16px; z-index: 99;
  max-width: 260px; padding: 8px 12px; border-radius: 10px;
  background: rgba(13,20,32,.95); border: 1px solid #1a2332;
  backdrop-filter: blur(12px);
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  color: #8b949e; opacity: 0; transform: translateY(6px);
  transition: all .3s; pointer-events: none;
}
.voice-transcript.show { opacity: 1; transform: translateY(0); }
.voice-transcript .heard { color: #00e1ff; }
.voice-transcript .action { color: #22c55e; font-weight: 600; }
body.zen-mode .voice-btn, body.zen-mode .voice-transcript { display: none !important; }
@media(max-width:600px) {
  .voice-btn { bottom: 14px; left: 12px; width: 32px; height: 32px; font-size: 11px; }
  .voice-transcript { bottom: 52px; left: 12px; }
}
@media print { .voice-btn, .voice-transcript { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: COMMAND PALETTE
  // ═══════════════════════════════════════════════════

  function initCommandPalette() {
    const REGISTRY = [
      { name:'Impact Numbers',       icon:'📊', action:()=>scrollTo('.imp'),              cat:'Section' },
      { name:'The Journey / Timeline',icon:'🚀', action:()=>scrollTo('.tl-wrap'),          cat:'Section' },
      { name:'Certifications',        icon:'📜', action:()=>scrollTo('#certGrid'),          cat:'Section' },
      { name:'Testimonials',          icon:'⭐', action:()=>scrollTo('.tc-section'),        cat:'Section' },
      { name:'Conferences',           icon:'🎤', action:()=>scrollTo('.conf-strip'),        cat:'Section' },
      { name:'LinkedIn Articles',     icon:'📝', action:()=>scrollTo('#linkedinFeed'),      cat:'Section' },
      { name:'Contact',               icon:'📧', action:()=>{ const s=document.getElementById('contactSecret'); if(s) s.classList.add('revealed'); scrollTo('.sr'); }, cat:'Section' },
      { name:'The Bilingual Executive (Book)', icon:'📘', action:()=>clickLink('bilingual'), cat:'Link' },
      { name:'ADPList Mentoring',     icon:'🎓', action:()=>clickLink('adplist'),      cat:'Link' },
      { name:'Fintech Bilinguals Community', icon:'🤝', action:()=>clickLink('fintech-bilinguals'), cat:'Link' },
      { name:'LinkedIn Profile',      icon:'💼', action:()=>clickLink('linkedin.com'), cat:'Link' },
      { name:'Open Arcade',           icon:'🕹️', action:()=>{ if(window._openArcade) window._openArcade(); }, cat:'Game' },
      { name:'Sprint Stacker',        icon:'🧱', action:()=>launchCmd('play stacker'),     cat:'Game' },
      { name:'Data Mesh Router',      icon:'🔀', action:()=>launchCmd('play router'),      cat:'Game' },
      { name:'FinTech Trader',        icon:'📈', action:()=>{ if(window.openGame) window.openGame(); }, cat:'Game' },
      { name:'Bilingual Swipe',       icon:'🌐', action:()=>launchCmd('play bilingual'),   cat:'Game' },
      { name:'Zen Mode',              icon:'🧘', action:()=>{ const b=document.getElementById('zenBtn'); if(b) b.click(); }, cat:'Feature' },
      { name:'Cyberpunk Theme',       icon:'🌆', action:()=>{ if(window._toggleCyberpunk) window._toggleCyberpunk(true); }, cat:'Feature' },
      { name:'3D Book Viewer',        icon:'📦', action:()=>launchCmd('book3d'),            cat:'Feature' },
      { name:'Data Mesh 3D',          icon:'🔀', action:()=>launchCmd('datamesh'),          cat:'Feature' },
      { name:'Guestbook',             icon:'🌍', action:()=>openGuestbook(),                cat:'Feature' },
      { name:'Voice Navigation',      icon:'🔊', action:()=>toggleVoice(),                  cat:'Feature' },
      { name:'Open Terminal',          icon:'💻', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'Terminal' },
      { name:'Ask Amr (AI Chat)',      icon:'🤖', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'Terminal' },
      { name:'Keyboard Shortcuts',     icon:'⌨️', action:()=>{ const o=document.getElementById('shortcutOverlay'); if(o) o.classList.add('show'); }, cat:'Terminal' },
      { name:'PMP Certification',      icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
      { name:'SAFe 6 Scrum Master',    icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
      { name:'PSM II',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
      { name:'PSPO II',                icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
      { name:'PMI-ACP',                icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
      { name:'CDMP Data Management',   icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert' },
    ];

    function scrollTo(sel) { const el = document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
    function clickLink(partial) { const lk = document.querySelector(`a.lk[href*="${partial}"]`); if(lk) lk.click(); }
    function launchCmd(cmd) { if(window.TermCmds) { const parts=cmd.split(' '); const fn=window.TermCmds[parts[0]]; if(fn) fn(parts.slice(1).join(' ')); } }

    const overlay = document.createElement('div');
    overlay.id = 'cmdPaletteOverlay';
    overlay.addEventListener('click', e => { if(e.target === overlay) closePalette(); });
    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-input-wrap">
          <span class="cmd-input-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input class="cmd-input" id="cmdInput" placeholder="Search sections, games, features, certs..." autocomplete="off" spellcheck="false">
          <span class="cmd-input-hint">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdInput');
    const results = document.getElementById('cmdResults');
    let activeIdx = 0, filtered = [...REGISTRY];

    function openPalette() { overlay.classList.add('show'); input.value=''; activeIdx=0; filtered=[...REGISTRY]; render(); setTimeout(()=>input.focus(),100); }
    function closePalette() { overlay.classList.remove('show'); input.blur(); }

    function render() {
      if (!filtered.length) { results.innerHTML = '<div class="cmd-empty">No results found</div>'; return; }
      const q = input.value.toLowerCase();
      results.innerHTML = filtered.map((item, i) => {
        const name = q ? item.name.replace(new RegExp(`(${escRegex(q)})`, 'gi'), '<mark>$1</mark>') : item.name;
        return `<div class="cmd-item ${i===activeIdx?'active':''}" data-idx="${i}">
          <span class="cmd-item-icon">${item.icon}</span>
          <div class="cmd-item-text"><div class="cmd-item-name">${name}</div></div>
          <span class="cmd-item-badge">${item.cat}</span>
        </div>`;
      }).join('');
      results.querySelectorAll('.cmd-item').forEach(el => el.addEventListener('click', ()=>select(parseInt(el.dataset.idx))));
      const ae = results.querySelector('.cmd-item.active'); if(ae) ae.scrollIntoView({block:'nearest'});
    }
    function select(idx) { const item=filtered[idx]; if(!item)return; closePalette(); setTimeout(()=>item.action(),150); if(window.VDna)window.VDna.addXp(2); }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      filtered = q ? REGISTRY.filter(i=>i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)).sort((a,b)=>(a.name.toLowerCase().startsWith(q)?0:1)-(b.name.toLowerCase().startsWith(q)?0:1)) : [...REGISTRY];
      activeIdx=0; render();
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,filtered.length-1);render();}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);render();}
      else if(e.key==='Enter'){e.preventDefault();select(activeIdx);}
      else if(e.key==='Escape'){closePalette();}
    });

    document.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();overlay.classList.contains('show')?closePalette():openPalette();} });

    if(window.TermCmds){
      window.TermCmds.search=()=>{setTimeout(openPalette,200);return'<span class="term-green">Opening command palette...</span>';};
      window.TermCmds.find=window.TermCmds.search;
    }
    window._openPalette = openPalette;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: VISITOR INSIGHTS DASHBOARD
  // ═══════════════════════════════════════════════════

  function initAdminDashboard() {
    const overlay = document.createElement('div');
    overlay.id = 'adminOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeAdmin(); });
    overlay.innerHTML = `<div class="admin-panel" id="adminPanel"></div>`;
    document.body.appendChild(overlay);

    function openAdmin() { renderAdmin(); overlay.classList.add('show'); }
    function closeAdmin() { overlay.classList.remove('show'); }
    window._closeAdmin = closeAdmin;

    function renderAdmin() {
      const panel=document.getElementById('adminPanel');
      const vdna=window.VDna?window.VDna.get():{};
      const arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');
      const gb=JSON.parse(localStorage.getItem('guestbook_entries')||'[]');
      const xp=vdna.xp||0, level=vdna.level||1, visits=vdna.visits||1;
      const achievements=vdna.unlocked?Object.keys(vdna.unlocked).length:0;
      const totalPlays=arcade.totalPlays||0, bossBeaten=arcade.bossBeaten?'Yes ✅':'No';
      const highScores=arcade.highScores||{};
      const utmSources=vdna.utmSources||[];
      const gbCount=gb.length;
      const ua=navigator.userAgent;
      const device=/Mobile|Android/i.test(ua)?'Mobile':'Desktop';
      const browser=/Chrome/i.test(ua)?'Chrome':/Firefox/i.test(ua)?'Firefox':/Safari/i.test(ua)?'Safari':'Other';
      const engagement=Math.min(100,Math.round((xp/5)+(achievements*8)+(totalPlays*5)+(visits*2)+(gbCount*10)));
      const gameScoreRows=Object.entries(highScores).map(([id,score])=>`<div class="admin-row"><span class="admin-row-label">${id}</span><span class="admin-row-val">${score}</span></div>`).join('')||'<div class="admin-row"><span class="admin-row-label">No games played yet</span></div>';

      panel.innerHTML = `
        <div class="admin-title">📊 Visitor Intelligence</div>
        <div class="admin-grid">
          <div class="admin-stat"><div class="admin-stat-val">${xp}</div><div class="admin-stat-label">Total XP</div></div>
          <div class="admin-stat"><div class="admin-stat-val">LVL ${level}</div><div class="admin-stat-label">Level</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${visits}</div><div class="admin-stat-label">Visits</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${achievements}</div><div class="admin-stat-label">Achievements</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${totalPlays}</div><div class="admin-stat-label">Games Played</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${gbCount}</div><div class="admin-stat-label">Guestbook</div></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Engagement Score</div>
          <div class="admin-bar-wrap">
            <span class="admin-bar-label">Overall</span>
            <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${engagement}%;background:linear-gradient(90deg,#22c55e,#00e1ff)"></div></div>
            <span class="admin-bar-val">${engagement}%</span>
          </div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Game High Scores</div>
          ${gameScoreRows}
          <div class="admin-row"><span class="admin-row-label">Boss Defeated</span><span class="admin-row-val">${bossBeaten}</span></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Visitor Profile</div>
          <div class="admin-row"><span class="admin-row-label">Device</span><span class="admin-row-val">${device}</span></div>
          <div class="admin-row"><span class="admin-row-label">Browser</span><span class="admin-row-val">${browser}</span></div>
          <div class="admin-row"><span class="admin-row-label">Base Game</span><span class="admin-row-val">${arcade.baseGame||'—'}</span></div>
          <div class="admin-row"><span class="admin-row-label">UTM Sources</span><span class="admin-row-val">${utmSources.length>0?utmSources.join(', '):'Direct'}</span></div>
          <div class="admin-row"><span class="admin-row-label">Zen Mode</span><span class="admin-row-val">${localStorage.getItem('zenMode')==='1'?'On':'Off'}</span></div>
          <div class="admin-row"><span class="admin-row-label">Cyberpunk</span><span class="admin-row-val">${localStorage.getItem('cyberpunkMode')==='1'?'On':'Off'}</span></div>
        </div>
        <div class="admin-close" onclick="window._closeAdmin()">[ ESC or tap to close ]</div>`;
    }

    if(window.TermCmds){
      window.TermCmds.admin=()=>{setTimeout(openAdmin,200);return'<span style="color:#ef4444">🔒 Opening Visitor Intelligence dashboard...</span>';};
      window.TermCmds.stats=window.TermCmds.admin;
      window.TermCmds.insights=window.TermCmds.admin;
    }
    document.addEventListener('keydown', e => { if(e.key==='Escape'&&overlay.classList.contains('show')) closeAdmin(); });
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 0: ALWAYS-VISIBLE CTA BUTTONS
  // ═══════════════════════════════════════════════════

  function initAlwaysCTA() {
    // Smart insertion: try multiple strategies to find the right spot
    // 1) After the last .lk (link card) row
    // 2) After .bio or description area
    // 3) Before .imp (impact numbers)
    // 4) After #app > div first child flex container
    let anchor = null;
    let position = 'afterend';

    // Strategy 1: Find last link card container
    const allLinks = document.querySelectorAll('a.lk');
    if (allLinks.length) {
      const lastLk = allLinks[allLinks.length - 1];
      // Walk up to the flex row containing link cards
      anchor = lastLk.closest('div[style*="flex"]') || lastLk.closest('.rv') || lastLk.parentElement;
    }

    // Strategy 2: Find the bio/subtitle area
    if (!anchor) {
      anchor = document.querySelector('.bio') || document.querySelector('.sub-bio') || document.querySelector('.desc');
    }

    // Strategy 3: Insert before impact numbers section
    if (!anchor) {
      const imp = document.querySelector('.imp');
      if (imp) { anchor = imp; position = 'beforebegin'; }
    }

    // Strategy 4: After the main profile container
    if (!anchor) {
      anchor = document.querySelector('#app > div > div') || document.querySelector('#app > div');
      if (anchor) {
        // Find a reasonable child element after the header
        const children = anchor.children;
        if (children.length > 3) { anchor = children[3]; position = 'afterend'; }
      }
    }

    if (!anchor) return;

    // Check we haven't already injected
    if (document.querySelector('.always-cta-row')) return;

    const row = document.createElement('div');
    row.className = 'always-cta-row rv';
    row.innerHTML = `
      <a href="https://www.linkedin.com/in/amrmelharony" target="_blank" rel="noopener"
         class="always-cta always-cta-linkedin">
        <i class="fa-brands fa-linkedin"></i> LinkedIn
      </a>
      <a href="https://calendly.com/amrmelharony/30min" target="_blank" rel="noopener"
         class="always-cta always-cta-cal">
        <i class="fa-solid fa-calendar-check"></i> Book My Calendar
      </a>`;

    anchor.insertAdjacentElement(position, row);

    // Animate in with GSAP if available
    if (window.gsap) {
      gsap.fromTo(row, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 2.2, ease: 'power3.out' });
    } else {
      row.style.opacity = '0'; row.style.transform = 'translateY(20px)';
      row.style.transition = 'opacity .6s ease, transform .6s ease';
      setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'none'; }, 2200);
    }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: INTERACTIVE TIMELINE — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════

  function initInteractiveTimeline() {
    const tlWrap = document.querySelector('.tl-wrap');
    if (!tlWrap) return;
    const items = Array.from(tlWrap.querySelectorAll('.tl-item'));
    if (!items.length) return;

    tlWrap.style.position = 'relative';

    // ─── TAG CLASSIFICATION ───
    const TAGS = {
      banking:  ['bank','banque','misr','operations','financial','treasury','officer'],
      agile:    ['scrum','agile','kanban','safe','sprint','delivery','pmp','lead','hybrid'],
      data:     ['data','analytics','cdmp','warehouse','pipeline','governance','mesh','analyst'],
      speaking: ['speak','conference','seamless','devopsdays','keynote','panel','summit','techne','forum'],
      learning: ['cert','degree','doctorate','dba','learn','study','university','award','earned','mba'],
      author:   ['book','bilingual','executive','author','publish','write','community','founded','launched'],
    };

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const tags = [];
      for (const [tag, keywords] of Object.entries(TAGS)) {
        if (keywords.some(kw => text.includes(kw))) tags.push(tag);
      }
      if (!tags.length) tags.push('general');
      item.dataset.tags = tags.join(',');
    });

    // ─── EXPANDABLE DETAILS ───
    const DETAILS = {
      banking:  '<strong>Banking Operations & Finance</strong> — Front-office ops, transaction processing, compliance workflows. Foundation for data flows in financial institutions. <span class="tl-expand-metric">🏦 12+ years experience</span>',
      agile:    '<strong>Agile Delivery Leadership</strong> — Scrum/Kanban facilitation, sprint planning, retrospectives, stakeholder alignment. <span class="tl-expand-metric">⚡ Hybrid framework</span><span class="tl-expand-metric">📈 Team velocity +40%</span>',
      data:     '<strong>Data & Analytics</strong> — Data pipelines, governance, analytics platforms, cross-domain products. <span class="tl-expand-metric">📊 Data-driven decisions</span><span class="tl-expand-metric">💾 CDMP certified</span>',
      speaking: '<strong>Industry Engagement</strong> — Keynotes and panels at 9+ conferences across MENA, sharing insights on agile, fintech, and digital transformation. <span class="tl-expand-metric">🎤 9+ panel stages</span>',
      learning: '<strong>Continuous Learning</strong> — 20+ certifications, doctorate research, Banque Misr Best Learner Award. <span class="tl-expand-metric">🏆 Best Learner Award</span><span class="tl-expand-metric">🎓 DBA completed</span>',
      author:   '<strong>Thought Leadership</strong> — Published "The Bilingual Executive", founded Fintech Bilinguals, 2,300+ mentoring minutes on ADPList. <span class="tl-expand-metric">📚 Book launch</span><span class="tl-expand-metric">🤝 Community founder</span>',
    };

    // ─── 1. HIDE EXISTING STATIC LINE ───
    const staticLine = tlWrap.querySelector('.tl-line');
    if (staticLine) staticLine.style.display = 'none';

    // ─── 2. SVG ANIMATED LINE ───
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('class', 'tl-svg-line');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    // Gradient definition
    const defs = document.createElementNS(svgNS, 'defs');
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.id = 'tlLineGrad'; grad.setAttribute('x1','0'); grad.setAttribute('y1','0');
    grad.setAttribute('x2','0'); grad.setAttribute('y2','1');
    const stops = [
      { offset: '0%', color: '#00e1ff' },
      { offset: '40%', color: '#6366f1' },
      { offset: '100%', color: '#a855f7' },
    ];
    stops.forEach(s => {
      const st = document.createElementNS(svgNS, 'stop');
      st.setAttribute('offset', s.offset);
      st.setAttribute('stop-color', s.color);
      grad.appendChild(st);
    });
    defs.appendChild(grad);
    svgEl.appendChild(defs);

    // Two paths: bg + animated glow
    const bgPath = document.createElementNS(svgNS, 'line');
    bgPath.setAttribute('class', 'tl-svg-path-bg');
    bgPath.setAttribute('x1', '6'); bgPath.setAttribute('y1', '0');
    bgPath.setAttribute('x2', '6'); bgPath.setAttribute('y2', '100%');
    svgEl.appendChild(bgPath);

    const glowPath = document.createElementNS(svgNS, 'line');
    glowPath.setAttribute('class', 'tl-svg-path-glow');
    glowPath.setAttribute('x1', '6'); glowPath.setAttribute('y1', '0');
    glowPath.setAttribute('x2', '6'); glowPath.setAttribute('y2', '100%');
    svgEl.appendChild(glowPath);

    tlWrap.appendChild(svgEl);

    // Size SVG to wrap height
    function sizeSVG() {
      const h = tlWrap.scrollHeight;
      svgEl.setAttribute('viewBox', `0 0 12 ${h}`);
      svgEl.style.height = h + 'px';
      bgPath.setAttribute('y2', h);
      glowPath.setAttribute('y2', h);
      const pathLen = h;
      glowPath.style.strokeDasharray = pathLen;
      glowPath.style.strokeDashoffset = pathLen;
      glowPath._pathLen = pathLen;
    }
    // Defer sizing until layout is stable
    setTimeout(sizeSVG, 100);
    window.addEventListener('resize', () => { setTimeout(sizeSVG, 50); });

    // ─── 3. CANVAS PARTICLE BACKDROP ───
    const canvas = document.createElement('canvas');
    canvas.className = 'tl-particle-canvas';
    tlWrap.insertBefore(canvas, tlWrap.firstChild);
    const ctx = canvas.getContext('2d');
    let cW = 0, cH = 0, particles = [], canvasActive = false;

    function sizeCanvas() {
      cW = canvas.width = tlWrap.offsetWidth;
      cH = canvas.height = tlWrap.scrollHeight;
    }

    class TLParticle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * cW;
        this.y = Math.random() * cH;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.r = Math.random() * 1.2 + 0.3;
        this.alpha = Math.random() * 0.25 + 0.05;
        this.phase = Math.random() * Math.PI * 2;
      }
      update() {
        this.phase += 0.008;
        this.x += this.vx + Math.sin(this.phase) * 0.05;
        this.y += this.vy + Math.cos(this.phase * 0.7) * 0.03;
        if (this.x < -5 || this.x > cW + 5 || this.y < -5 || this.y > cH + 5) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,225,255,${this.alpha})`;
        ctx.fill();
      }
    }

    function initParticles() {
      sizeCanvas();
      const count = Math.min(Math.floor(cW * cH / 8000), 40);
      particles = [];
      for (let i = 0; i < count; i++) particles.push(new TLParticle());
    }

    let animFrame = null;
    function animateParticles() {
      if (!canvasActive) return;
      ctx.clearRect(0, 0, cW, cH);
      particles.forEach(p => { p.update(); p.draw(); });
      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = dx * dx + dy * dy;
          if (d < 5000) {
            ctx.strokeStyle = `rgba(0,225,255,${0.03 * (1 - d / 5000)})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animFrame = requestAnimationFrame(animateParticles);
    }

    // ─── 4. FILTER PILLS ───
    const filters = document.createElement('div');
    filters.className = 'tl-filters'; filters.id = 'tlFilters';
    const filterIcons = { all: '✦', banking: '🏦', agile: '⚡', data: '📊', speaking: '🎤', learning: '🎓', author: '📚' };
    ['all', ...Object.keys(TAGS)].forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tl-filter-btn' + (tag === 'all' ? ' active' : '');
      btn.innerHTML = (filterIcons[tag] || '') + ' ' + tag;
      btn.dataset.filter = tag;
      btn.addEventListener('click', () => filterTimeline(tag));
      filters.appendChild(btn);
    });
    tlWrap.parentNode.insertBefore(filters, tlWrap);

    // ─── 5. PROGRESS BAR ───
    const progressBar = document.createElement('div');
    progressBar.className = 'tl-progress-bar'; progressBar.id = 'tlProgressBar';
    progressBar.innerHTML = `
      <div class="tl-progress-track"><div class="tl-progress-fill" id="tlProgressFill"></div></div>
      <span class="tl-progress-label" id="tlProgressLabel">0%</span>`;
    tlWrap.parentNode.insertBefore(progressBar, tlWrap);
    const progressFill = document.getElementById('tlProgressFill');
    const progressLabel = document.getElementById('tlProgressLabel');

    // ─── 6. EXPAND CARDS + MARK ITEMS ───
    items.forEach((item, idx) => {
      const tags = item.dataset.tags.split(',');
      const primaryTag = tags[0];
      const detail = DETAILS[primaryTag] || DETAILS.banking;

      const expandDiv = document.createElement('div');
      expandDiv.className = 'tl-item-expand';
      expandDiv.innerHTML = `<div class="tl-expand-content">${detail}</div>`;
      item.appendChild(expandDiv);

      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // Don't capture link clicks
        const isOpen = expandDiv.classList.contains('open');
        tlWrap.querySelectorAll('.tl-item-expand.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) {
          expandDiv.classList.add('open');
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(15);
        }
      });

      item.classList.add('tl-enhanced');
    });

    // ─── 7. ENTRANCE ANIMATION (after GSAP finishes) ───
    if (!RM) {
      setTimeout(() => {
        const viewH = window.innerHeight;
        items.forEach((item, idx) => {
          const r = item.getBoundingClientRect();
          if (r.top > viewH) {
            item.classList.add('tl-hidden');
            // Stagger delay based on position within each era group
            item.style.transitionDelay = (idx % 5) * 0.06 + 's';
          } else {
            item.classList.add('tl-visible');
          }
        });
      }, 4800);
    }

    // ─── 8. YEAR NAVIGATOR (desktop) ───
    const yearNav = document.createElement('div');
    yearNav.className = 'tl-year-nav'; yearNav.id = 'tlYearNav';
    const years = [];
    items.forEach(item => {
      const yr = item.querySelector('.tl-yr');
      if (yr) {
        const y = yr.textContent.trim();
        if (!years.includes(y)) years.push(y);
      }
    });
    years.forEach(y => {
      const pip = document.createElement('div');
      pip.className = 'tl-year-pip'; pip.textContent = y; pip.dataset.year = y;
      pip.addEventListener('click', () => {
        const target = items.find(i => i.querySelector('.tl-yr')?.textContent.trim() === y);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      yearNav.appendChild(pip);
    });
    document.body.appendChild(yearNav);

    // ─── 9. MASTER SCROLL ENGINE ───
    let rafId = null;
    let lastProgress = -1;
    let initialized = false;

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const wrapRect = tlWrap.getBoundingClientRect();
        const viewH = window.innerHeight;
        const inView = wrapRect.top < viewH && wrapRect.bottom > 0;

        // Year nav visibility
        yearNav.classList.toggle('show', inView && !isMobile);

        // Progress bar visibility
        progressBar.classList.toggle('show', inView);

        // Canvas activation
        if (inView && !canvasActive) {
          canvasActive = true;
          if (!initialized) { initParticles(); initialized = true; }
          animateParticles();
        } else if (!inView && canvasActive) {
          canvasActive = false;
          if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
        }

        if (!inView) return;

        // ── SVG line draw progress ──
        const rawProgress = Math.max(0, Math.min(1,
          (viewH * 0.5 - wrapRect.top) / wrapRect.height
        ));
        // Smooth ease
        const progress = rawProgress * rawProgress * (3 - 2 * rawProgress); // smoothstep

        if (glowPath._pathLen && Math.abs(progress - lastProgress) > 0.001) {
          lastProgress = progress;
          const offset = glowPath._pathLen * (1 - progress);
          glowPath.style.strokeDashoffset = offset;

          // Progress bar
          const pct = Math.round(progress * 100);
          progressFill.style.width = pct + '%';
          progressLabel.textContent = pct + '%';
        }

        // ── Per-item checks ──
        let activeYear = null;
        items.forEach(item => {
          const r = item.getBoundingClientRect();
          const visible = r.top < viewH * 0.88 && r.bottom > viewH * 0.12;
          const centered = r.top < viewH * 0.6 && r.bottom > viewH * 0.35;

          // Entrance reveal
          if (visible && item.classList.contains('tl-hidden')) {
            item.classList.remove('tl-hidden');
            item.classList.add('tl-visible');
          }

          // Active highlight
          const wasActive = item.classList.contains('tl-active');
          const isActive = centered && !item.classList.contains('filtered-out');
          if (isActive !== wasActive) {
            item.classList.toggle('tl-active', isActive);
          }

          // Year nav tracking
          if (centered) {
            const yr = item.querySelector('.tl-yr');
            if (yr) activeYear = yr.textContent.trim();
          }
        });

        // Update year nav pips
        yearNav.querySelectorAll('.tl-year-pip').forEach(p => {
          p.classList.toggle('active', p.dataset.year === activeYear);
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      if (initialized) { sizeCanvas(); sizeSVG(); }
      onScroll();
    }, { passive: true });

    // Initial trigger after GSAP completes
    setTimeout(() => { sizeSVG(); onScroll(); }, 5000);

    // ─── 10. FILTER SYSTEM ───
    function filterTimeline(tag) {
      document.querySelectorAll('.tl-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === tag)
      );
      items.forEach(item => {
        const isEra = item.classList.contains('tl-era');
        if (tag === 'all' || isEra) {
          item.classList.remove('filtered-out');
        } else {
          const match = item.dataset.tags.split(',').includes(tag);
          item.classList.toggle('filtered-out', !match);
        }
      });
      // Re-trigger entrance for newly visible items
      setTimeout(onScroll, 100);
    }

    // ─── 11. TERMINAL INTEGRATION ───
    if (window.TermCmds) {
      window.TermCmds.timeline = (args) => {
        const tag = (args || '').trim().toLowerCase();
        if (tag && Object.keys(TAGS).includes(tag)) {
          filterTimeline(tag);
          setTimeout(() => scrollTo('.tl-wrap'), 200);
          return `<span class="term-green">Filtered timeline to: ${tag}</span>`;
        }
        return `<span class="term-gray">Usage: timeline [banking|agile|data|speaking|learning|author]</span>`;
      };
    }

    function scrollTo(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE GUESTBOOK
  // ═══════════════════════════════════════════════════

  const GB_EMOJIS = ['👋','⭐','🔥','💡','🚀','❤️','🎉','🤝','👏','💪'];
  const GB_KEY = 'guestbook_entries';
  function getGBEntries() { try { return JSON.parse(localStorage.getItem(GB_KEY) || '[]'); } catch(e) { return []; } }
  function saveGBEntries(entries) { localStorage.setItem(GB_KEY, JSON.stringify(entries.slice(-50))); }

  function initGuestbook() {
    const overlay = document.createElement('div');
    overlay.id = 'guestbookOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeGuestbook(); });
    overlay.innerHTML = `
      <div class="gb-panel">
        <div class="gb-title">🌍 Visitor Wall</div>
        <div class="gb-subtitle">Leave your mark — say hi!</div>
        <div class="gb-form" id="gbForm">
          <div class="gb-emoji-row" id="gbEmojiRow"></div>
          <input class="gb-name-input" id="gbName" placeholder="Your name" maxlength="30">
          <input class="gb-msg-input" id="gbMsg" placeholder="Quick message (optional)" maxlength="100">
          <button class="gb-submit" id="gbSubmit" disabled>Sign the Wall</button>
        </div>
        <div class="gb-entries" id="gbEntries"></div>
        <div class="gb-close" onclick="window._closeGuestbook()">[ ESC or tap to close ]</div>
      </div>`;
    document.body.appendChild(overlay);

    const emojiRow = document.getElementById('gbEmojiRow');
    let selectedEmoji = null;
    GB_EMOJIS.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'gb-emoji-btn'; btn.textContent = e;
      btn.addEventListener('click', () => {
        emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected'); selectedEmoji = e; updateSubmit();
      });
      emojiRow.appendChild(btn);
    });

    const nameInput=document.getElementById('gbName'), submitBtn=document.getElementById('gbSubmit');
    function updateSubmit() { submitBtn.disabled = !selectedEmoji || !nameInput.value.trim(); }
    nameInput.addEventListener('input', updateSubmit);

    submitBtn.addEventListener('click', () => {
      if (!selectedEmoji || !nameInput.value.trim()) return;
      const entry = { emoji:selectedEmoji, name:nameInput.value.trim(), msg:document.getElementById('gbMsg').value.trim(), time:Date.now() };
      const entries = getGBEntries(); entries.push(entry); saveGBEntries(entries);
      nameInput.value=''; document.getElementById('gbMsg').value=''; selectedEmoji=null;
      emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b=>b.classList.remove('selected'));
      submitBtn.disabled=true; renderEntries(); spawnBubble(entry.emoji);
      if(window.VDna)window.VDna.addXp(10); if(navigator.vibrate)navigator.vibrate(30);
    });

    function renderEntries() {
      const entries = getGBEntries().reverse();
      const container = document.getElementById('gbEntries');
      container.innerHTML = entries.length === 0
        ? '<div class="gb-empty">No entries yet — be the first! ✨</div>'
        : entries.map(e => `<div class="gb-entry">
            <span class="gb-entry-emoji">${e.emoji}</span>
            <div class="gb-entry-meta">
              <div class="gb-entry-name">${escHtml(e.name)}</div>
              ${e.msg ? `<div class="gb-entry-msg">${escHtml(e.msg)}</div>` : ''}
              <div class="gb-entry-time">${timeAgo(e.time)}</div>
            </div>
          </div>`).join('');
    }

    if(window.TermCmds){ window.TermCmds.guestbook=()=>{setTimeout(openGuestbook,200);return'<span class="term-green">🌍 Opening guestbook...</span>';}; window.TermCmds.wall=window.TermCmds.guestbook; }
    window._closeGuestbook = closeGuestbook;
    document.addEventListener('keydown', e => { if(e.key==='Escape'&&overlay.classList.contains('show')) closeGuestbook(); });

    const entries = getGBEntries();
    if (entries.length > 0 && !RM) {
      entries.slice(-5).forEach((e, i) => setTimeout(() => spawnBubble(e.emoji), 3000 + i * 2000));
    }
  }

  function openGuestbook() {
    document.getElementById('guestbookOverlay').classList.add('show');
    const entries = getGBEntries().reverse();
    const container = document.getElementById('gbEntries');
    container.innerHTML = entries.length === 0
      ? '<div class="gb-empty">No entries yet — be the first! ✨</div>'
      : entries.map(e => `<div class="gb-entry">
          <span class="gb-entry-emoji">${e.emoji}</span>
          <div class="gb-entry-meta">
            <div class="gb-entry-name">${escHtml(e.name)}</div>
            ${e.msg ? `<div class="gb-entry-msg">${escHtml(e.msg)}</div>` : ''}
            <div class="gb-entry-time">${timeAgo(e.time)}</div>
          </div>
        </div>`).join('');
  }
  function closeGuestbook() { document.getElementById('guestbookOverlay')?.classList.remove('show'); }
  function spawnBubble(emoji) {
    const el=document.createElement('span'); el.className='gb-bubble'; el.textContent=emoji;
    el.style.left=(15+Math.random()*70)+'vw'; el.style.bottom='10px';
    document.body.appendChild(el); setTimeout(()=>el.remove(),6500);
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 5: VOICE NAVIGATION
  // ═══════════════════════════════════════════════════

  let voiceActive = false, recognition = null;

  function initVoiceNav() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';

    const btn = document.createElement('button');
    btn.className = 'voice-btn'; btn.id = 'voiceBtn';
    btn.setAttribute('aria-label','Voice Navigation'); btn.title = 'Voice Command (V)';
    btn.innerHTML = '<i class="fa-solid fa-microphone-slash" id="voiceIcon"></i>';
    document.body.appendChild(btn);

    const transcript = document.createElement('div');
    transcript.className = 'voice-transcript'; transcript.id = 'voiceTranscript';
    document.body.appendChild(transcript);

    const ROUTES = [
      { match:/open\s*arcade|play\s*game|games/i,        action:()=>{if(window._openArcade)window._openArcade();return'Opening Arcade';} },
      { match:/certif|certs|badges/i,                     action:()=>{scrollTo('#certGrid');return'Scrolling to Certifications';} },
      { match:/testimon|recommend|reviews/i,               action:()=>{scrollTo('.tc-section');return'Scrolling to Testimonials';} },
      { match:/timeline|journey|experience|career/i,       action:()=>{scrollTo('.tl-wrap');return'Scrolling to Timeline';} },
      { match:/contact|email|phone|reach/i,                action:()=>{const s=document.getElementById('contactSecret');if(s)s.classList.add('revealed');scrollTo('.sr');return'Revealing Contact Info';} },
      { match:/book|bilingual|author/i,                    action:()=>{clickLink('bilingual');return'Opening Book Link';} },
      { match:/mentor|adplist|coaching/i,                   action:()=>{clickLink('adplist');return'Opening ADPList';} },
      { match:/conference|speak|talks/i,                    action:()=>{scrollTo('.conf-strip');return'Scrolling to Conferences';} },
      { match:/article|linkedin|post/i,                     action:()=>{scrollTo('#linkedinFeed');return'Scrolling to Articles';} },
      { match:/zen\s*mode|clean|focus/i,                    action:()=>{const b=document.getElementById('zenBtn');if(b)b.click();return'Toggling Zen Mode';} },
      { match:/cyberpunk|neon|night\s*city/i,               action:()=>{if(window._toggleCyberpunk)window._toggleCyberpunk(true);return'Toggling Cyberpunk';} },
      { match:/search|find|command|palette/i,               action:()=>{if(window._openPalette)window._openPalette();return'Opening Command Palette';} },
      { match:/guest\s*book|wall|sign/i,                    action:()=>{openGuestbook();return'Opening Guestbook';} },
      { match:/impact|numbers|stats/i,                      action:()=>{scrollTo('.imp');return'Scrolling to Impact Numbers';} },
      { match:/top|home|start|beginning/i,                  action:()=>{window.scrollTo({top:0,behavior:'smooth'});return'Scrolling to Top';} },
    ];
    function scrollTo(sel){const el=document.querySelector(sel);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
    function clickLink(partial){const lk=document.querySelector(`a.lk[href*="${partial}"]`);if(lk)lk.click();}

    let hideTimer = null;
    recognition.onresult = (event) => {
      let text=''; for(let i=event.resultIndex;i<event.results.length;i++) text+=event.results[i][0].transcript;
      const isFinal=event.results[event.results.length-1].isFinal;
      transcript.innerHTML=`<span class="heard">"${text}"</span>`; transcript.classList.add('show');
      if(hideTimer)clearTimeout(hideTimer);
      if(isFinal){
        let matched=false;
        for(const route of ROUTES){if(route.match.test(text)){const result=route.action();transcript.innerHTML=`<span class="heard">"${text}"</span> → <span class="action">${result}</span>`;matched=true;if(window.VDna)window.VDna.addXp(3);break;}}
        if(!matched) transcript.innerHTML=`<span class="heard">"${text}"</span> → <span style="color:#6b7280">Try: certifications, arcade, contact, book, mentor...</span>`;
        hideTimer=setTimeout(()=>transcript.classList.remove('show'),3500);
        stopVoice();
      }
    };
    recognition.onerror=()=>stopVoice();
    recognition.onend=()=>{if(voiceActive)stopVoice();};

    function startVoice(){voiceActive=true;btn.classList.add('listening');document.getElementById('voiceIcon').className='fa-solid fa-microphone';transcript.innerHTML='<span style="color:#ef4444">Listening...</span>';transcript.classList.add('show');try{recognition.start();}catch(e){}if(navigator.vibrate)navigator.vibrate(50);}
    function stopVoice(){voiceActive=false;btn.classList.remove('listening');document.getElementById('voiceIcon').className='fa-solid fa-microphone-slash';try{recognition.stop();}catch(e){}}
    function toggleVoice(){voiceActive?stopVoice():startVoice();}
    window._toggleVoice=toggleVoice;

    btn.addEventListener('click',toggleVoice);
    document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='v'&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleVoice();});
    if(window.TermCmds){window.TermCmds.voice=()=>{setTimeout(toggleVoice,200);return voiceActive?'<span class="term-gray">🔇 Voice stopped</span>':'<span class="term-green">🎤 Listening for voice command...</span>';};}
  }


  // ═══════════════════════════════════════════════════
  // WIRE SHORTCUTS
  // ═══════════════════════════════════════════════════
  function wireShortcuts() {
    const panel = document.querySelector('.shortcut-panel');
    if (!panel) return;
    const closeDiv = panel.querySelector('.sc-close');
    if (!closeDiv) return;
    [{ key:'⌘K', desc:'Command Palette' }, { key:'V', desc:'Voice Navigation' }].forEach(sc => {
      if (panel.querySelector(`[data-p6-key="${sc.key}"]`)) return;
      const row = document.createElement('div');
      row.className = 'sc-row'; row.dataset.p6Key = sc.key;
      row.innerHTML = `<span class="sc-key">${sc.key}</span><span class="sc-desc">${sc.desc}</span>`;
      panel.insertBefore(row, closeDiv);
    });
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function timeAgo(ts) {
    const diff = Date.now() - ts, mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initAlwaysCTA();
    initCommandPalette();
    initAdminDashboard();
    initInteractiveTimeline();
    initGuestbook();
    initVoiceNav();
    wireShortcuts();
    console.log(
      '%c⚡ Phase 6 Loaded %c Palette · Admin · Timeline · Guestbook · Voice',
      'background:#fbbf24;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#fbbf24;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else { setTimeout(init, 500); }

})();
