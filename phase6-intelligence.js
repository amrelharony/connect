// ═══════════════════════════════════════════════════════════════
// PHASE 6.1: INTELLIGENCE LAYER — amrelharony.com
// Drop-in: <script src="phase6-intelligence.js" defer></script>
//
// Features:
//   0. Always-visible CTA buttons (LinkedIn + Get Mentored)
//   1. Command Palette (Cmd+K) — fuzzy search, MRU, descriptions, Tab categories
//   2. Trophy Case & Progress Tracker — 24 achievements, exploration tracking
//   3. Interactive Timeline — minimal scroll-line, clean cards, filters
//   4. Live Guestbook (emoji wall)
//   5. Voice Navigation — 30+ routes, compound commands, confidence display
//   6. Advanced Terminal — 35+ commands, easter eggs, neofetch
//   7. ADPList widget cleanup (CSS + DOM) + direct redirect
//   8. Trophy triggers wired into: scroll, guestbook, palette, terminal, voice
//
// 1,957 lines · Syntax validated · RTL/mobile/print/zen safe
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

/* Command Palette enhancements */
.cmd-cat-header {
  font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 1.5px;
  text-transform: uppercase; color: #3a4a5c; padding: 8px 10px 3px; margin-top: 2px;
}
.cmd-item-desc { font-size: 9px; color: #4a5568; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd-item-key {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 1px 5px; border-radius: 3px; border: 1px solid #1a2332;
  color: #4a5568; flex-shrink: 0; letter-spacing: .5px;
}

/* Trophy Toast — subtle notification */
.trophy-toast {
  position: fixed; bottom: 20px; right: 16px; z-index: 99999;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px;
  background: rgba(13,20,32,.88); border: 1px solid rgba(255,255,255,.06);
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
  backdrop-filter: blur(8px);
  transform: translateY(12px); opacity: 0;
  transition: transform .35s cubic-bezier(.16,1,.3,1), opacity .25s;
  font-size: 10px; color: #8b949e;
  pointer-events: none;
}
.trophy-toast.show { transform: translateY(0); opacity: 1; }
.trophy-toast-icon { font-size: 16px; }
.trophy-toast strong { color: #e2e8f0; display: block; font-size: 9px; letter-spacing: .3px; font-weight: 500; }
.trophy-toast span { color: #6b7280; font-size: 9px; }

/* Trophy Grid in Admin Panel */
.trophy-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,.02);
  transition: opacity .3s;
}
.trophy-item.locked { opacity: .3; }
.trophy-item.locked:hover { opacity: .5; }
.trophy-item.unlocked { opacity: 1; }
.trophy-icon { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
.trophy-meta { flex: 1; min-width: 0; }
.trophy-name { font-size: 11px; color: #e2e8f0; font-weight: 600; }
.trophy-desc { font-size: 9px; color: #6b7280; margin-top: 1px; }
.trophy-xp {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 2px 5px; border-radius: 4px;
  background: rgba(34,197,94,.1); color: #22c55e; flex-shrink: 0;
}
@media(max-width:600px) { .trophy-toast { bottom: 10px; right: 10px; left: auto; max-width: 200px; } }

/* Timeline expand card enhancements */
.tl-expand-date {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: #4a5568; margin-left: 6px; letter-spacing: .3px;
}
.tl-expand-content p {
  margin: 6px 0; font-size: 10px; line-height: 1.55; color: #8b949e;
}
.tl-expand-chips {
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;
}
.tl-expand-skills {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: #3a4a5c; margin-top: 6px; padding-top: 6px;
  border-top: 1px solid rgba(255,255,255,.03);
}

/* Hide ADPList inline widget */
[data-adplist-widget], .adplist-widget, iframe[src*="adplist"], .adp-widget-container,
div[id*="adplist-widget"], div[class*="adplist-widget"] { display: none !important; }

/* Hide duplicate status bar (Digital Twin from phase5) */
.twin-status, #twinStatus { display: none !important; }


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
  text-decoration: none; transition: transform .25s ease, box-shadow .25s ease;
  -webkit-tap-highlight-color: transparent;
}
.always-cta-linkedin {
  background: #0077b5; color: #fff; border: 1px solid rgba(0,119,181,.3);
}
.always-cta-linkedin:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,119,181,.2); color: #fff; }
.always-cta-mentor {
  background: rgba(0,225,255,.1); color: var(--accent);
  border: 1px solid rgba(0,225,255,.15);
}
.always-cta-mentor:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,225,255,.1); color: var(--accent); }
.always-cta i { font-size: 12px; }
@media print { .always-cta-row { display: none !important; } }


/* ═══════════════════════════════════════════
   3. INTERACTIVE TIMELINE — MINIMAL ENGINE
   ═══════════════════════════════════════════ */

/* --- Filter pills --- */
.tl-filters {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
  margin: 0 0 10px; padding: 0;
}
.tl-filter-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 4px 10px; border-radius: 100px;
  border: 1px solid var(--border); background: transparent; color: var(--sub);
  cursor: pointer; transition: color .25s, border-color .25s, background .25s;
  -webkit-tap-highlight-color: transparent;
}
.tl-filter-btn:hover { border-color: rgba(255,255,255,.12); color: var(--text); }
.tl-filter-btn.active {
  border-color: var(--accent); color: var(--accent);
  background: rgba(0,225,255,.05);
}

/* --- Scroll-progress line --- */
.tl-scroll-line {
  position: absolute; left: 5px; top: 0; width: 1.5px; height: 100%;
  z-index: 1; pointer-events: none; overflow: hidden;
  background: var(--border); border-radius: 1px;
}
.tl-scroll-line-fill {
  width: 100%; height: 0%; border-radius: 1px;
  background: var(--accent); opacity: .45;
  transition: height .08s linear;
}

/* --- Enhanced items --- */
.tl-item.tl-enhanced {
  cursor: pointer; flex-wrap: wrap; position: relative;
  transition: opacity .4s ease, transform .4s ease !important;
}

/* Entrance: simple fade up */
.tl-item.tl-hidden {
  opacity: 0 !important;
  transform: translateY(10px) !important;
}
.tl-item.tl-visible {
  opacity: 1 !important; transform: none !important;
  transition: opacity .5s ease, transform .5s ease !important;
}

/* Filter out */
.tl-item.filtered-out {
  opacity: .06 !important; transform: scale(.97) !important;
  pointer-events: none;
  transition: opacity .35s ease, transform .35s ease !important;
}

/* --- Dot: clean, no orbits --- */
.tl-item.tl-enhanced .tl-dot {
  transition: background .3s, border-color .3s, transform .3s;
  z-index: 3;
}

/* Active dot — subtle scale + accent */
.tl-item.tl-active .tl-dot {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  transform: scale(1.25);
}

/* Active item — faint left accent */
.tl-item.tl-active {
  border-radius: 6px;
  background: rgba(0,225,255,.02);
}

/* --- Era headers: clean styling --- */
.tl-item.tl-era.tl-visible .tl-txt strong {
  color: var(--text);
}
.tl-item.tl-era.tl-visible::after {
  content: ''; position: absolute; bottom: -1px;
  left: 36px; right: 0; height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,.06), transparent);
}

/* --- Year label on active --- */
.tl-item.tl-active .tl-yr {
  color: var(--accent) !important;
  transition: color .3s !important;
}
.tl-item:hover .tl-yr { color: var(--accent); }

/* --- Expand card: clean, flat --- */
.tl-item-expand {
  max-height: 0; overflow: hidden; opacity: 0;
  transition: max-height .45s ease, opacity .3s .05s, margin .25s;
  margin: 0; flex-basis: 100%; width: 100%; order: 99;
}
.tl-item-expand.open { max-height: 320px; opacity: 1; margin: 8px 0 0; }
.tl-expand-content {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.04);
  font-size: 10px; line-height: 1.7; color: var(--sub);
}
.tl-expand-content strong { color: var(--text); }
.tl-expand-metric {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 3px 8px; border-radius: 5px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
  color: var(--sub); margin: 6px 4px 0 0;
}

/* --- Progress counter (above timeline) --- */
.tl-progress-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; opacity: 0; transition: opacity .4s;
}
.tl-progress-bar.show { opacity: 1; }
.tl-progress-track {
  flex: 1; height: 1.5px; border-radius: 1px; background: var(--border);
  overflow: hidden;
}
.tl-progress-fill {
  height: 100%; border-radius: 1px; width: 0%;
  background: var(--accent); opacity: .5;
  transition: width .12s linear;
}
.tl-progress-label {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  color: var(--sub); letter-spacing: 1px; flex-shrink: 0; min-width: 28px;
  text-align: right;
}

/* --- Zen / RTL / Print --- */
body.zen-mode .tl-filters,
body.zen-mode .tl-item-expand, body.zen-mode .tl-scroll-line,
body.zen-mode .tl-progress-bar { display: none !important; }
[dir="rtl"] .tl-scroll-line { left: auto; right: 5px; }
@media print {
  .tl-filters, .tl-item-expand,
  .tl-scroll-line, .tl-progress-bar { display: none !important; }
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
  // FEATURE 1: COMMAND PALETTE — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // Fuzzy search · MRU tracking · Category headers · Descriptions · Shortcut hints

  function initCommandPalette() {
    const MRU_KEY = 'cmd_mru';
    function getMRU() { try { return JSON.parse(localStorage.getItem(MRU_KEY)||'[]'); } catch(e) { return []; } }
    function addMRU(name) { const mru=getMRU().filter(n=>n!==name); mru.unshift(name); localStorage.setItem(MRU_KEY,JSON.stringify(mru.slice(0,8))); }

    const REGISTRY = [
      // Sections
      { name:'Impact Numbers',         icon:'📊', action:()=>scrollTo('.imp'),              cat:'Section', desc:'Scroll to key metrics', keys:'' },
      { name:'Journey / Timeline',     icon:'🚀', action:()=>scrollTo('.tl-wrap'),          cat:'Section', desc:'Interactive career timeline', keys:'' },
      { name:'Certifications',         icon:'📜', action:()=>scrollTo('#certGrid'),          cat:'Section', desc:'20+ professional badges', keys:'' },
      { name:'Testimonials',           icon:'⭐', action:()=>scrollTo('.tc-section'),        cat:'Section', desc:'Colleague recommendations', keys:'' },
      { name:'Conferences',            icon:'🎤', action:()=>scrollTo('.conf-strip'),        cat:'Section', desc:'Speaking engagements', keys:'' },
      { name:'LinkedIn Articles',      icon:'📝', action:()=>scrollTo('#linkedinFeed'),      cat:'Section', desc:'Published articles feed', keys:'' },
      { name:'Contact Info',           icon:'📧', action:()=>{ const s=document.getElementById('contactSecret'); if(s) s.classList.add('revealed'); scrollTo('.sr'); }, cat:'Section', desc:'Reveal contact details', keys:'' },
      // Links
      { name:'The Bilingual Executive',icon:'📘', action:()=>clickLink('bilingual'),  cat:'Link', desc:'The book on Amazon', keys:'' },
      { name:'ADPList Mentoring',      icon:'🎓', action:()=>window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank'),    cat:'Link', desc:'Book a mentoring session', keys:'' },
      { name:'Fintech Bilinguals',     icon:'🤝', action:()=>clickLink('fintech-bilinguals'), cat:'Link', desc:'Community hub', keys:'' },
      { name:'LinkedIn Profile',       icon:'💼', action:()=>window.open('https://linkedin.com/in/amrmelharony','_blank'), cat:'Link', desc:'Connect on LinkedIn', keys:'' },
      { name:'Book My Calendar',       icon:'📅', action:()=>window.open('https://calendly.com/amrmelharony/30min','_blank'), cat:'Link', desc:'Schedule a 30-min call', keys:'' },
      // Games
      { name:'Open Arcade',            icon:'🕹️', action:()=>{ if(window._openArcade)window._openArcade(); }, cat:'Game', desc:'All 5 mini-games', keys:'' },
      { name:'Sprint Stacker',         icon:'🧱', action:()=>launchCmd('play stacker'),     cat:'Game', desc:'Stack agile sprint blocks', keys:'' },
      { name:'Data Mesh Router',       icon:'🔀', action:()=>launchCmd('play router'),      cat:'Game', desc:'Route data to correct domains', keys:'' },
      { name:'FinTech Trader',         icon:'📈', action:()=>{ if(window.openGame)window.openGame(); }, cat:'Game', desc:'Real-time stock trading sim', keys:'' },
      { name:'Bilingual Swipe',        icon:'🌐', action:()=>launchCmd('play bilingual'),   cat:'Game', desc:'Swipe-match bilingual terms', keys:'' },
      { name:'Snake Game',             icon:'🐍', action:()=>launchCmd('play snake'),        cat:'Game', desc:'Classic snake with data theme', keys:'' },
      // Features
      { name:'Zen Mode',               icon:'🧘', action:()=>{ const b=document.getElementById('zenBtn'); if(b) b.click(); }, cat:'Feature', desc:'Toggle minimal reading mode', keys:'Z' },
      { name:'Cyberpunk Theme',        icon:'🌆', action:()=>{ if(window._toggleCyberpunk)window._toggleCyberpunk(true); }, cat:'Feature', desc:'Neon city theme overlay', keys:'C' },
      { name:'3D Book Viewer',         icon:'📦', action:()=>launchCmd('book3d'),            cat:'Feature', desc:'Interactive 3D book model', keys:'' },
      { name:'Data Mesh 3D',           icon:'🔀', action:()=>launchCmd('datamesh'),          cat:'Feature', desc:'3D data mesh visualization', keys:'' },
      { name:'Guestbook',              icon:'🌍', action:()=>openGuestbook(),                cat:'Feature', desc:'Sign the visitor wall', keys:'G' },
      { name:'Voice Navigation',       icon:'🎙️', action:()=>toggleVoice(),                  cat:'Feature', desc:'Speak commands hands-free', keys:'V' },
      // System
      { name:'Open Terminal',           icon:'💻', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'System', desc:'Full terminal interface', keys:'T' },
      { name:'Ask Amr (AI Chat)',       icon:'🤖', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'System', desc:'Chat with AI assistant', keys:'' },
      { name:'Keyboard Shortcuts',      icon:'⌨️', action:()=>{ const o=document.getElementById('shortcutOverlay'); if(o) o.classList.add('show'); }, cat:'System', desc:'View all shortcuts', keys:'?' },
      { name:'Trophy Case',             icon:'🏆', action:()=>{ if(window._openTrophies) window._openTrophies(); }, cat:'System', desc:'View achievements & progress', keys:'' },
      { name:'Visitor Insights',        icon:'📊', action:()=>{ if(window.TermCmds?.admin) window.TermCmds.admin(); }, cat:'System', desc:'Analytics dashboard', keys:'' },
      // Certs (searchable)
      { name:'PMP Certification',       icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Project Management Professional', keys:'' },
      { name:'SAFe 6 Scrum Master',     icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Scaled Agile Framework', keys:'' },
      { name:'PSM II',                  icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Master II', keys:'' },
      { name:'PSPO II',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Product Owner II', keys:'' },
      { name:'PMI-ACP',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Agile Certified Practitioner', keys:'' },
      { name:'CDMP Data Management',    icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Certified Data Management Professional', keys:'' },
      // Timeline filters (quick access)
      { name:'Filter: Banking',         icon:'🏦', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('banking'); }, cat:'Filter', desc:'Timeline → Banking items', keys:'' },
      { name:'Filter: Agile',           icon:'⚡', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('agile'); }, cat:'Filter', desc:'Timeline → Agile items', keys:'' },
      { name:'Filter: Data',            icon:'📊', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('data'); }, cat:'Filter', desc:'Timeline → Data items', keys:'' },
      { name:'Filter: Speaking',        icon:'🎤', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('speaking'); }, cat:'Filter', desc:'Timeline → Speaking items', keys:'' },
    ];

    function scrollTo(sel) { const el = document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
    function clickLink(partial) { const lk = document.querySelector(`a.lk[href*="${partial}"]`); if(lk) lk.click(); }
    function launchCmd(cmd) { if(window.TermCmds) { const parts=cmd.split(' '); const fn=window.TermCmds[parts[0]]; if(fn) fn(parts.slice(1).join(' ')); } }

    // Fuzzy match scoring
    function fuzzyScore(query, text) {
      const q = query.toLowerCase(), t = text.toLowerCase();
      if (t === q) return 100;
      if (t.startsWith(q)) return 80;
      if (t.includes(q)) return 60;
      // Fuzzy: all chars present in order
      let qi = 0, score = 0;
      for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) { score += (ti === 0 || t[ti-1] === ' ' ? 15 : 5); qi++; }
      }
      return qi === q.length ? score : 0;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cmdPaletteOverlay';
    overlay.addEventListener('click', e => { if(e.target === overlay) closePalette(); });
    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-input-wrap">
          <span class="cmd-input-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input class="cmd-input" id="cmdInput" placeholder="Type to search sections, games, features, certs..." autocomplete="off" spellcheck="false">
          <span class="cmd-input-hint">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer"><span>↑↓ navigate</span><span>↵ select</span><span>tab category</span><span>esc close</span></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdInput');
    const resultsEl = document.getElementById('cmdResults');
    let activeIdx = 0, filtered = [], catFilter = null;

    function getFiltered(q) {
      let list = REGISTRY;
      if (catFilter) list = list.filter(i => i.cat === catFilter);
      if (!q) {
        // Show MRU first, then all grouped by category
        const mru = getMRU();
        const mruItems = mru.map(n => list.find(i => i.name === n)).filter(Boolean);
        const rest = list.filter(i => !mru.includes(i.name));
        return [...mruItems, ...rest];
      }
      return list
        .map(i => ({ item: i, score: Math.max(fuzzyScore(q, i.name), fuzzyScore(q, i.desc||''), fuzzyScore(q, i.cat)) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
    }

    function openPalette() { overlay.classList.add('show'); input.value=''; activeIdx=0; catFilter=null; filtered=getFiltered(''); render(); setTimeout(()=>input.focus(),80); }
    function closePalette() { overlay.classList.remove('show'); input.blur(); }

    function render() {
      if (!filtered.length) { resultsEl.innerHTML = '<div class="cmd-empty">No results found — try different keywords</div>'; return; }
      const q = input.value.toLowerCase();
      let lastCat = '';
      let html = '';
      filtered.forEach((item, i) => {
        // Category header
        if (item.cat !== lastCat && !q) {
          lastCat = item.cat;
          const isFirst = i === 0 && getMRU().includes(item.name);
          html += `<div class="cmd-cat-header">${isFirst ? '⏱ Recent' : item.cat}</div>`;
        }
        const name = q ? item.name.replace(new RegExp(`(${escRegex(q)})`, 'gi'), '<mark>$1</mark>') : item.name;
        html += `<div class="cmd-item ${i===activeIdx?'active':''}" data-idx="${i}">
          <span class="cmd-item-icon">${item.icon}</span>
          <div class="cmd-item-text">
            <div class="cmd-item-name">${name}</div>
            ${item.desc ? `<div class="cmd-item-desc">${item.desc}</div>` : ''}
          </div>
          ${item.keys ? `<span class="cmd-item-key">${item.keys}</span>` : ''}
          <span class="cmd-item-badge">${item.cat}</span>
        </div>`;
      });
      resultsEl.innerHTML = html;
      resultsEl.querySelectorAll('.cmd-item').forEach(el => el.addEventListener('click', ()=>select(parseInt(el.dataset.idx))));
      const ae = resultsEl.querySelector('.cmd-item.active'); if(ae) ae.scrollIntoView({block:'nearest'});
    }

    function select(idx) {
      const item=filtered[idx]; if(!item)return;
      addMRU(item.name);
      closePalette();
      setTimeout(()=>item.action(),120);
      if(window.VDna) window.VDna.addXp(2);
      if(typeof checkTrophy==='function') checkTrophy('palette_used');
    }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      filtered = getFiltered(q);
      activeIdx = 0; render();
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,filtered.length-1);render();}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);render();}
      else if(e.key==='Enter'){e.preventDefault();select(activeIdx);}
      else if(e.key==='Escape'){closePalette();}
      else if(e.key==='Tab'){
        e.preventDefault();
        const cats = [...new Set(REGISTRY.map(i=>i.cat))];
        const curIdx = catFilter ? cats.indexOf(catFilter) : -1;
        catFilter = cats[(curIdx+1) % cats.length] || null;
        if (curIdx + 1 >= cats.length) catFilter = null; // cycle back to all
        filtered = getFiltered(input.value.toLowerCase().trim());
        activeIdx = 0; render();
      }
    });

    document.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();overlay.classList.contains('show')?closePalette():openPalette();} });

    if(window.TermCmds){
      window.TermCmds.search=()=>{setTimeout(openPalette,200);return'<span class="term-green">Opening command palette...</span>';};
      window.TermCmds.find=window.TermCmds.search;
    }
    window._openPalette = openPalette;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: TROPHY CASE & PROGRESS TRACKER
  // ═══════════════════════════════════════════════════
  // 24 achievements · site exploration progress · arcade integration · engagement score

  const TROPHIES = [
    // Exploration (auto-tracked via scroll)
    { id:'explorer_timeline',   icon:'🗺️', name:'Timeline Explorer',      desc:'Scrolled through the full career timeline', cat:'Explore', xp:5 },
    { id:'explorer_certs',      icon:'📜', name:'Cert Collector',          desc:'Viewed the certifications grid', cat:'Explore', xp:5 },
    { id:'explorer_testimonials',icon:'⭐', name:'Social Proof',           desc:'Read the testimonials section', cat:'Explore', xp:5 },
    { id:'explorer_conferences', icon:'🎤', name:'Conference Goer',        desc:'Discovered the conferences section', cat:'Explore', xp:5 },
    { id:'explorer_articles',   icon:'📝', name:'Article Reader',          desc:'Scrolled to LinkedIn articles', cat:'Explore', xp:5 },
    { id:'explorer_impact',     icon:'📊', name:'Numbers Person',          desc:'Viewed impact numbers section', cat:'Explore', xp:5 },
    { id:'explorer_contact',    icon:'📧', name:'Connector',               desc:'Revealed contact information', cat:'Explore', xp:10 },
    { id:'explorer_full',       icon:'🌟', name:'Full Site Explorer',      desc:'Visited every major section', cat:'Explore', xp:25 },
    // Arcade
    { id:'arcade_first',        icon:'🕹️', name:'First Play',             desc:'Played your first arcade game', cat:'Arcade', xp:10 },
    { id:'arcade_5plays',       icon:'🎮', name:'Arcade Regular',          desc:'Played 5+ arcade games', cat:'Arcade', xp:15 },
    { id:'arcade_highscore',    icon:'🏅', name:'High Scorer',             desc:'Set a high score in any game', cat:'Arcade', xp:15 },
    { id:'arcade_allgames',     icon:'👑', name:'Game Master',             desc:'Played every arcade game at least once', cat:'Arcade', xp:25 },
    { id:'arcade_boss',         icon:'⚔️', name:'Boss Defeated',           desc:'Beat the final boss', cat:'Arcade', xp:30 },
    // Engagement
    { id:'guestbook_signed',    icon:'✍️', name:'Wall Signer',            desc:'Left a mark in the guestbook', cat:'Social', xp:10 },
    { id:'voice_used',          icon:'🎙️', name:'Voice Commander',        desc:'Used voice navigation', cat:'Social', xp:10 },
    { id:'palette_used',        icon:'⌨️', name:'Power User',             desc:'Used the command palette', cat:'Social', xp:5 },
    { id:'terminal_used',       icon:'💻', name:'Terminal Hacker',         desc:'Opened the terminal', cat:'Social', xp:5 },
    { id:'theme_cyberpunk',     icon:'🌆', name:'Cyberpunk Activated',    desc:'Enabled the cyberpunk theme', cat:'Social', xp:5 },
    { id:'theme_zen',           icon:'🧘', name:'Zen Master',             desc:'Toggled Zen Mode', cat:'Social', xp:5 },
    // Milestones
    { id:'visit_3',             icon:'🔄', name:'Returning Visitor',       desc:'Came back 3+ times', cat:'Milestone', xp:10 },
    { id:'visit_10',            icon:'💎', name:'Loyal Visitor',           desc:'Visited 10+ times', cat:'Milestone', xp:20 },
    { id:'xp_50',               icon:'⚡', name:'XP Collector',           desc:'Earned 50+ XP', cat:'Milestone', xp:10 },
    { id:'xp_200',              icon:'🔥', name:'XP Hoarder',             desc:'Earned 200+ XP', cat:'Milestone', xp:20 },
    { id:'completionist',       icon:'🏆', name:'Completionist',          desc:'Unlocked 20+ trophies', cat:'Milestone', xp:50 },
  ];

  // Exploration tracking
  const SECTIONS = {
    explorer_timeline:    '.tl-wrap',
    explorer_certs:       '#certGrid',
    explorer_testimonials:'.tc-section',
    explorer_conferences: '.conf-strip',
    explorer_articles:    '#linkedinFeed',
    explorer_impact:      '.imp',
  };

  function checkTrophy(id) {
    const vdna = window.VDna ? window.VDna.get() : {};
    const unlocked = vdna.unlocked || {};
    if (unlocked[id]) return false;
    // Unlock it
    if (window.VDna) {
      if (!window.VDna.get().unlocked) window.VDna.get().unlocked = {};
      window.VDna.get().unlocked[id] = Date.now();
      const trophy = TROPHIES.find(t => t.id === id);
      if (trophy) window.VDna.addXp(trophy.xp);
      window.VDna.save();
    }
    return true;
  }

  function initTrophySystem() {
    // Scroll-based exploration tracker
    let exploredSections = new Set();
    function checkExploration() {
      const viewH = window.innerHeight;
      for (const [trophyId, selector] of Object.entries(SECTIONS)) {
        if (exploredSections.has(trophyId)) continue;
        const el = document.querySelector(selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < viewH * 0.7 && r.bottom > viewH * 0.3) {
          exploredSections.add(trophyId);
          if (checkTrophy(trophyId)) showTrophyToast(trophyId);
          // Check full explorer
          if (exploredSections.size >= Object.keys(SECTIONS).length) {
            if (checkTrophy('explorer_full')) showTrophyToast('explorer_full');
          }
        }
      }
    }
    window.addEventListener('scroll', () => requestAnimationFrame(checkExploration), { passive: true });
    setTimeout(checkExploration, 6000);

    // Visit milestone tracking
    const vdna = window.VDna ? window.VDna.get() : {};
    const visits = vdna.visits || 1;
    if (visits >= 3) checkTrophy('visit_3');
    if (visits >= 10) checkTrophy('visit_10');
    const xp = vdna.xp || 0;
    if (xp >= 50) checkTrophy('xp_50');
    if (xp >= 200) checkTrophy('xp_200');

    // Arcade tracking
    const arcade = JSON.parse(localStorage.getItem('arcade_state')||'{}');
    if ((arcade.totalPlays||0) >= 1) checkTrophy('arcade_first');
    if ((arcade.totalPlays||0) >= 5) checkTrophy('arcade_5plays');
    if (arcade.bossBeaten) checkTrophy('arcade_boss');
    const hs = arcade.highScores || {};
    if (Object.keys(hs).length > 0) checkTrophy('arcade_highscore');
    if (Object.keys(hs).length >= 4) checkTrophy('arcade_allgames');

    // Completionist check
    const unlocked = vdna.unlocked || {};
    if (Object.keys(unlocked).length >= 20) checkTrophy('completionist');
  }

  function showTrophyToast(id) {
    const trophy = TROPHIES.find(t => t.id === id);
    if (!trophy) return;
    // Only show toast for non-exploration trophies (exploration is too frequent/noisy)
    const silentTrophies = ['explorer_timeline','explorer_certs','explorer_testimonials','explorer_conferences','explorer_articles','explorer_impact'];
    if (silentTrophies.includes(id)) return;
    const toast = document.createElement('div');
    toast.className = 'trophy-toast';
    toast.innerHTML = `<span class="trophy-toast-icon">${trophy.icon}</span><div><strong>${trophy.name}</strong><br><span>${trophy.desc}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
  }

  function initAdminDashboard() {
    const overlay = document.createElement('div');
    overlay.id = 'adminOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeAdmin(); });
    overlay.innerHTML = `<div class="admin-panel" id="adminPanel"></div>`;
    document.body.appendChild(overlay);

    function openAdmin() { renderAdmin(); overlay.classList.add('show'); }
    function closeAdmin() { overlay.classList.remove('show'); }
    window._closeAdmin = closeAdmin;
    window._openTrophies = openAdmin;

    function renderAdmin() {
      const panel=document.getElementById('adminPanel');
      const vdna=window.VDna?window.VDna.get():{};
      const arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');
      const gb=JSON.parse(localStorage.getItem('guestbook_entries')||'[]');
      const xp=vdna.xp||0, level=vdna.level||1, visits=vdna.visits||1;
      const unlocked=vdna.unlocked||{};
      const unlockedCount=Object.keys(unlocked).length;
      const totalTrophies=TROPHIES.length;
      const totalPlays=arcade.totalPlays||0;
      const highScores=arcade.highScores||{};
      const gbCount=gb.length;

      // Engagement score (weighted)
      const exploredCount = Object.keys(SECTIONS).filter(id => unlocked[id]).length;
      const exploredPct = Math.round((exploredCount / Object.keys(SECTIONS).length) * 100);
      const arcadePct = Math.min(100, Math.round(totalPlays * 10));
      const socialPct = Math.min(100, (gbCount > 0 ? 25 : 0) + (unlocked.voice_used ? 25 : 0) + (unlocked.palette_used ? 25 : 0) + (unlocked.terminal_used ? 25 : 0));
      const overallPct = Math.round((exploredPct * 0.4) + (arcadePct * 0.3) + (socialPct * 0.3));

      // Trophy grid by category
      const cats = ['Explore','Arcade','Social','Milestone'];
      const trophyGrid = cats.map(cat => {
        const trophies = TROPHIES.filter(t => t.cat === cat);
        const rows = trophies.map(t => {
          const isUnlocked = !!unlocked[t.id];
          return `<div class="trophy-item ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="trophy-icon">${isUnlocked ? t.icon : '🔒'}</span>
            <div class="trophy-meta">
              <div class="trophy-name">${t.name}</div>
              <div class="trophy-desc">${isUnlocked ? t.desc : '???'}</div>
            </div>
            ${isUnlocked ? `<span class="trophy-xp">+${t.xp}xp</span>` : ''}
          </div>`;
        }).join('');
        return `<div class="admin-section">
          <div class="admin-section-title">${cat} (${trophies.filter(t=>unlocked[t.id]).length}/${trophies.length})</div>
          ${rows}
        </div>`;
      }).join('');

      // Game scores
      const gameNames = { stacker:'Sprint Stacker', router:'Data Mesh Router', trader:'FinTech Trader', bilingual:'Bilingual Swipe', snake:'Snake' };
      const gameRows = Object.entries(highScores).map(([id,score]) =>
        `<div class="admin-row"><span class="admin-row-label">${gameNames[id]||id}</span><span class="admin-row-val">${score}</span></div>`
      ).join('') || '<div class="admin-row"><span class="admin-row-label" style="opacity:.4">No games played yet</span></div>';

      panel.innerHTML = `
        <div class="admin-title">🏆 Trophy Case & Progress</div>
        <div class="admin-grid">
          <div class="admin-stat"><div class="admin-stat-val">${xp}</div><div class="admin-stat-label">Total XP</div></div>
          <div class="admin-stat"><div class="admin-stat-val">LVL ${level}</div><div class="admin-stat-label">Level</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${unlockedCount}/${totalTrophies}</div><div class="admin-stat-label">Trophies</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${visits}</div><div class="admin-stat-label">Visits</div></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Site Progress</div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Explored</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${exploredPct}%;background:linear-gradient(90deg,#22c55e,#00e1ff)"></div></div><span class="admin-bar-val">${exploredPct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Arcade</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${arcadePct}%;background:linear-gradient(90deg,#f59e0b,#ef4444)"></div></div><span class="admin-bar-val">${arcadePct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Social</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${socialPct}%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div><span class="admin-bar-val">${socialPct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label"><strong>Overall</strong></span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${overallPct}%;background:linear-gradient(90deg,#00e1ff,#6366f1,#a855f7)"></div></div><span class="admin-bar-val"><strong>${overallPct}%</strong></span></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Arcade Scores</div>
          ${gameRows}
          <div class="admin-row"><span class="admin-row-label">Total Plays</span><span class="admin-row-val">${totalPlays}</span></div>
          <div class="admin-row"><span class="admin-row-label">Boss Defeated</span><span class="admin-row-val">${arcade.bossBeaten?'Yes ✅':'Not yet'}</span></div>
        </div>
        ${trophyGrid}
        <div class="admin-close" onclick="window._closeAdmin()">[ ESC or tap to close ]</div>`;
    }

    if(window.TermCmds){
      window.TermCmds.admin=()=>{setTimeout(openAdmin,200);return'<span style="color:#ef4444">🔒 Opening Trophy Case & Progress...</span>';};
      window.TermCmds.stats=window.TermCmds.admin;
      window.TermCmds.insights=window.TermCmds.admin;
      window.TermCmds.trophies=window.TermCmds.admin;
      window.TermCmds.trophy=window.TermCmds.admin;
      window.TermCmds.progress=window.TermCmds.admin;
      window.TermCmds.achievements=window.TermCmds.admin;
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
      <a href="https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session" target="_blank" rel="noopener"
         class="always-cta always-cta-mentor">
        <i class="fa-solid fa-user-group"></i> Get Mentored
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
  // FEATURE 3: INTERACTIVE TIMELINE — MINIMAL ENGINE
  // ═══════════════════════════════════════════════════

  function initInteractiveTimeline() {
    const tlWrap = document.querySelector('.tl-wrap');
    if (!tlWrap) return;
    const items = Array.from(tlWrap.querySelectorAll('.tl-item'));
    if (!items.length) return;

    tlWrap.style.position = 'relative';

    // ─── TAG CLASSIFICATION ───
    const TAGS = {
      banking:  ['bank','banque','misr','operations','financial','treasury','officer','credit','sme','business banking','corporate','lending'],
      agile:    ['scrum','agile','kanban','safe','sprint','delivery','pmp','lead','hybrid','standup','retrospective','backlog'],
      data:     ['data','analytics','cdmp','warehouse','pipeline','governance','mesh','analyst','bi','dashboard','report','datacamp'],
      speaking: ['speak','conference','seamless','devopsdays','keynote','panel','summit','techne','forum','moderator','career summit','techup'],
      learning: ['cert','degree','doctorate','dba','learn','study','university','award','earned','mba','frankfurt','helwan','bachelor','best learner','toastmasters'],
      author:   ['book','bilingual','executive','author','publish','write','community','founded','launched','fintech bilinguals'],
      mentor:   ['mentor','adplist','coaching','mentee','session','guidance','1000 min'],
      military: ['armed forces','military','army','officer','security','defense','technology officer'],
      fintech:  ['fintech','efa','egyptian fintech','startup','consultant','pro bono','association','ecosystem'],
      intern:   ['intern','nissan','central bank','exchange','mcdr','clearing','reinsurance','jazira'],
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

    // ─── ROLE-SPECIFIC DETAILS (matched by keywords in timeline items) ───
    const ROLE_MAP = [
      {
        match: ['scrum master', '2025', 'scrum/kanban', 'flow metrics'],
        html: `<strong>Scrum Master — Banque Misr</strong> <span class="tl-expand-date">May 2025 – Present</span>
          <p>Championed a hybrid Scrum/Kanban framework for the data analytics team, using flow metrics to identify and eliminate systemic bottlenecks and improve delivery predictability.</p>
          <p>Serves as the key leadership bridge between technical data teams and business stakeholders, translating strategic goals into actionable work.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">⚡ Hybrid Scrum/Kanban</span><span class="tl-expand-metric">📈 Flow Metrics</span><span class="tl-expand-metric">🎯 PMP® + PSM II + ICP-ATF</span></div>
          <div class="tl-expand-skills">Agile Methodologies · Servant Leadership · Flow Metrics & Predictability</div>`
      },
      {
        match: ['corporate banking data analyst', 'data analyst', 'bi report', 'dashboard'],
        html: `<strong>Corporate Banking Data Analyst — Banque Misr</strong> <span class="tl-expand-date">Jun 2021 – May 2025 · 4 yrs</span>
          <p>Strategic pivot from project management into a hands-on data role to master the bank's core data assets — bridging the gap between project goals and data realities.</p>
          <p>Designed and delivered critical BI reports and dashboards for senior leadership, directly influencing corporate banking strategy. Skills validated by DataCamp Professional certification.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📊 BI Dashboards</span><span class="tl-expand-metric">🏦 Corporate Banking Strategy</span><span class="tl-expand-metric">💾 DataCamp Certified</span></div>
          <div class="tl-expand-skills">Stakeholder Management · Business Intelligence (BI)</div>`
      },
      {
        match: ['project management professional', 'pmp', 'cross-functional', 'scope, schedule'],
        html: `<strong>Project Management Professional — Banque Misr</strong> <span class="tl-expand-date">Feb 2020 – Jun 2021 · 1 yr 5 mos</span>
          <p>Applied a disciplined, PMP®-certified approach to lead end-to-end delivery of complex, cross-functional banking projects — rigorously managing scope, schedule, and budget in a regulated enterprise environment.</p>
          <p>Identified data integrity as the primary success factor for key initiatives — the critical insight that motivated specialization in data analytics.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎯 PMP® Certified</span><span class="tl-expand-metric">🏗️ Cross-Functional Delivery</span><span class="tl-expand-metric">🔍 Data Integrity Focus</span></div>
          <div class="tl-expand-skills">Risk Management · Scope Management · Regulated Environment</div>`
      },
      {
        match: ['sme', 'credit analyst', 'lending', 'portfolio risk'],
        html: `<strong>SMEs Credit Analyst — Banque Misr</strong> <span class="tl-expand-date">Nov 2017 – Feb 2020 · 2 yrs 4 mos</span>
          <p>Assessed financial health of corporate clients, managed portfolio risk, and made informed lending recommendations. This role was foundational for developing deep commercial acumen.</p>
          <p>Understanding core business drivers of clients became vital context for later work in technology delivery.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 Credit Risk Analysis</span><span class="tl-expand-metric">📑 Financial Statements</span><span class="tl-expand-metric">🤝 Client Portfolio</span></div>
          <div class="tl-expand-skills">Credit Risk Analysis · Financial Statement Analysis · Commercial Acumen</div>`
      },
      {
        match: ['business banking officer', 'financial advisor', 'small business'],
        html: `<strong>Business Banking Officer — Banque Misr</strong> <span class="tl-expand-date">Nov 2016 – Nov 2017 · 1 yr 1 mo</span>
          <p>Served as a trusted financial advisor and Accredited Small Business Consultant for a diverse portfolio of business clients, helping them achieve commercial goals.</p>
          <p>This client-facing role was foundational for developing deep customer empathy — an invaluable understanding of user needs that drives modern FinTech product development.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👤 Client Advisory</span><span class="tl-expand-metric">🏢 SME Portfolio</span><span class="tl-expand-metric">💡 Customer Empathy</span></div>
          <div class="tl-expand-skills">Relationship Management · Commercial Acumen · Client Needs Analysis</div>`
      },
      {
        match: ['armed forces', 'military', 'technology officer', 'digital security'],
        html: `<strong>Technology Officer | IT & Digital Security — Egyptian Armed Forces</strong> <span class="tl-expand-date">Jan 2015 – Mar 2016 · 1 yr 3 mos</span>
          <p>Commanded IT and digital security operations for a mission-critical unit, ensuring 100% uptime and integrity of vital systems in a high-stakes, zero-failure environment.</p>
          <p>Developed foundational expertise in IT infrastructure, network security, and disciplined operational management — a security-first mindset that now informs building resilient financial technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🛡️ 100% Uptime</span><span class="tl-expand-metric">🔐 Digital Security</span><span class="tl-expand-metric">⭐ Leadership Commendation</span></div>
          <div class="tl-expand-skills">Cybersecurity · Leadership Under Pressure · IT Infrastructure</div>`
      },
      {
        match: ['intern', 'nissan', 'central bank', 'exchange', 'mcdr', 'clearing'],
        html: `<strong>Finance & Banking Internships</strong> <span class="tl-expand-date">Jul 2011 – Jul 2014 · 3 yrs</span>
          <p>Built a robust and diverse foundation through competitive internships at Egypt's leading institutions — hands-on exposure to corporate finance, capital markets, and regulatory supervision.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏭 Nissan Motor Corp</span><span class="tl-expand-metric">🏛️ Central Bank of Egypt</span><span class="tl-expand-metric">📈 Egyptian Exchange</span><span class="tl-expand-metric">🔄 MCDR</span></div>
          <div class="tl-expand-skills">Corporate Finance · Capital Markets · Investment Analysis</div>`
      },
      {
        match: ['adplist', 'mentor', '1000 min', 'top 50'],
        html: `<strong>Leadership & Technology Mentor — ADPList</strong> <span class="tl-expand-date">Oct 2023 – Present · 2 yrs+</span>
          <p>Globally recognized as a Top 50 Mentor in Project Management on the ADPList platform. Dedicated 1,000+ minutes to coaching rising professionals in FinTech, data, and digital transformation.</p>
          <p>Empowers mentees to navigate complex career pivots, develop strategic skills, and accelerate into leadership roles.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏅 Top 50 PM Mentor</span><span class="tl-expand-metric">⏱️ 1,000+ Minutes</span><span class="tl-expand-metric">🌍 Global Remote</span></div>`
      },
      {
        match: ['fintech bilinguals', 'founder', 'community'],
        html: `<strong>Founder — Fintech Bilinguals</strong> <span class="tl-expand-date">Feb 2026 – Present</span>
          <p>Founded a community bridging the gap between Arabic-speaking finance professionals and global fintech knowledge — making cutting-edge concepts accessible across language barriers.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤝 Community Builder</span><span class="tl-expand-metric">🌐 Bilingual</span></div>`
      },
      {
        match: ['egyptian fintech association', 'efa', 'pro bono', 'management consultant'],
        html: `<strong>FinTech Management Consultant (Pro Bono) — EFA</strong> <span class="tl-expand-date">Oct 2019 – Present · 6 yrs+</span>
          <p>Strategic advisor to Egyptian FinTech startups — providing pro bono consulting on go-to-market strategy, business model validation, and regulatory compliance.</p>
          <p>Facilitates industry roundtables and contributes to the national FinTech ecosystem, bridging startups, incumbents, and investors.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🚀 Startup Advisory</span><span class="tl-expand-metric">🏛️ Ecosystem Building</span><span class="tl-expand-metric">💼 6+ Years Pro Bono</span></div>`
      },
      {
        match: ['doctorate', 'dba', 'digital transformation', 'e-hrm'],
        html: `<strong>DBA — Digital Transformation · Helwan University</strong> <span class="tl-expand-date">Completed Dec 2023</span>
          <p>Doctoral research on banking innovation, FinTech, and AI-driven transformation. Thesis: "The Relationship Between E-HRM Systems and Employee Satisfaction in Banking."</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎓 Doctorate</span><span class="tl-expand-metric">🤖 AI & Banking</span><span class="tl-expand-metric">📖 Published Research</span></div>`
      },
      {
        match: ['mba', 'entrepreneurship', 'startup strategy'],
        html: `<strong>MBA — Entrepreneurship · Helwan University</strong> <span class="tl-expand-date">Completed May 2019</span>
          <p>Specialized in startup strategy, product development, and digital finance. Developed a comprehensive business model for FinTech startup growth in the MENA region.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📈 Startup Strategy</span><span class="tl-expand-metric">💡 Product Dev</span><span class="tl-expand-metric">🌍 MENA Focus</span></div>`
      },
      {
        match: ['bachelor', 'ba,', 'international economics'],
        html: `<strong>BA — International Economics · Helwan University</strong> <span class="tl-expand-date">Completed May 2014</span>
          <p>Strong analytical foundation in global finance, macroeconomics, and international trade — essential context for a career at the intersection of banking and technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌐 Global Finance</span><span class="tl-expand-metric">📊 Economics</span></div>`
      },
      {
        match: ['frankfurt', 'digital finance', 'executive program'],
        html: `<strong>Certified Expert in Digital Finance — Frankfurt School</strong> <span class="tl-expand-date">Aug 2019</span>
          <p>Rigorous executive program at one of Europe's top business schools. Deep expertise in AI-driven finance, platform economics, and digital banking strategy.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🇩🇪 Frankfurt School</span><span class="tl-expand-metric">🤖 AI Finance</span><span class="tl-expand-metric">🏦 Digital Banking</span></div>`
      },
      {
        match: ['best learner', 'continuous professional', 'growth mindset'],
        html: `<strong>Best Learner Award — Banque Misr</strong> <span class="tl-expand-date">Dec 2023</span>
          <p>Recognized by bank leadership for outstanding commitment to continuous professional development and proactively acquiring high-value skills in digital transformation and agile methodologies.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏆 Bank Recognition</span><span class="tl-expand-metric">📚 Growth Mindset</span></div>`
      },
      {
        match: ['seamless', 'north africa', 'keynote interview'],
        html: `<strong>Panel Moderator — Seamless North Africa</strong> <span class="tl-expand-date">Sep 2024</span>
          <p>Moderated 4 panels + 1 keynote interview at the region's premier FinTech conference. Led discussions on digital banking, open innovation, and APIs with leaders from N26, Deutsche Bank, BNP Paribas, Mashreq, and Citi Bank.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 4 Panels + Keynote</span><span class="tl-expand-metric">🏦 Global Bank Leaders</span><span class="tl-expand-metric">🌍 MENA Premier</span></div>`
      },
      {
        match: ['devopsdays', 'ai & devops', 'ai-driven automation'],
        html: `<strong>Speaker — DevOpsDays Cairo 2025</strong> <span class="tl-expand-date">Sep 2025</span>
          <p>"AI & DevOps — Powering the Next Wave of Egyptian Fintech": exploring how AI-driven automation and DevOps practices are shaping the future of financial technology in Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤖 AI + DevOps</span><span class="tl-expand-metric">🇪🇬 Egyptian FinTech</span></div>`
      },
      {
        match: ['africa fintech forum', '$100 billion', 'digital payments'],
        html: `<strong>Panel Moderator — Africa FinTech Forum</strong> <span class="tl-expand-date">Jul 2025</span>
          <p>Moderated a powerhouse panel mapping the road to Egypt's $100 billion digital payments industry. Guided conversation on instant payments and AI-driven security with Banque Misr's Chief Consumer Banking Officer and the CEO of Sahl.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 $100B Payments</span><span class="tl-expand-metric">🤖 AI Security</span><span class="tl-expand-metric">🇪🇬 Egypt Vision</span></div>`
      },
      {
        match: ['techne summit', 'virtual cards', 'swipe smarter'],
        html: `<strong>Panel Moderator — Techne Summit Alexandria</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Swipe Smarter: Why Virtual Cards Are the Future of Business Payments" — led discussion on how virtual cards redefine business spending, security, and payments with Money Fellows and Paysky leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💳 Virtual Cards</span><span class="tl-expand-metric">🔒 Payment Security</span></div>`
      },
      {
        match: ['banking & fintech summit', 'traditional vs. digital', 'future of banking'],
        html: `<strong>Panel Moderator — Banking & Fintech Summit</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Future of Banking in Egypt: Traditional vs. Digital" — moderated alongside leaders from KFH Bank, EFG Holding, and Emirates NBD.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏦 Banking Future</span><span class="tl-expand-metric">📱 Digital vs Traditional</span></div>`
      },
      {
        match: ['career summit', 'career 180', 'banking economy'],
        html: `<strong>Panel Moderator — Egypt Career Summit</strong> <span class="tl-expand-date">May 2025</span>
          <p>"Beyond Transactions: Banking's Role in Shaping the Future Economy" — shared stage with COO of Emirates NBD and Chief Dealer of QNB Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌍 Future Economy</span><span class="tl-expand-metric">👥 Next-Gen Leaders</span></div>`
      },
      {
        match: ['techup women', 'data over intuition', 'never go with your gut'],
        html: `<strong>Expert Mentor — TechUp Women Summit</strong> <span class="tl-expand-date">Oct 2024</span>
          <p>"Data Over Intuition: Never Go With Your Gut" — deep dive into data-driven decision-making for career growth and leadership effectiveness. Selected as expert mentor for aspiring technology leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👩‍💻 Women in Tech</span><span class="tl-expand-metric">📊 Data-Driven</span></div>`
      },
      {
        match: ['toastmasters', 'public speaking', 'maadi'],
        html: `<strong>Leadership & Public Speaking — Maadi Toastmasters</strong>
          <p>Actively honed public speaking, impromptu communication, and leadership skills within the Toastmasters International framework. Instrumental for developing stage presence for professional speaking engagements.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 Stage Presence</span><span class="tl-expand-metric">💬 Impromptu</span></div>`
      },
      {
        match: ['bilingual executive', 'book', 'launched', 'published', 'amazon'],
        html: `<strong>The Bilingual Executive — Published Author</strong>
          <p>Published "The Bilingual Executive," a practical guide bridging Arabic-speaking professionals with global business and technology leadership concepts.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📘 Published Book</span><span class="tl-expand-metric">🌐 Bilingual Bridge</span><span class="tl-expand-metric">📦 Amazon</span></div>`
      },
    ];

    // Fallback by tag category (used when no role-specific match found)
    const DETAILS = {
      banking:  '<strong>Banking Career</strong> — 9+ years at Banque Misr spanning business banking, credit analysis, project management, data analytics, and agile delivery. <span class="tl-expand-metric">🏦 Banque Misr</span>',
      agile:    '<strong>Agile Delivery</strong> — Hybrid Scrum/Kanban framework, flow metrics, delivery predictability. Certified PMP®, PSM II, PSPO II, PMI-ACP, ICP-ATF. <span class="tl-expand-metric">⚡ 6+ Agile Certs</span>',
      data:     '<strong>Data & Analytics</strong> — BI dashboards, data governance, analytics platforms. DataCamp certified, CDMP qualified. <span class="tl-expand-metric">📊 BI Leadership</span>',
      speaking: '<strong>Conference Speaker</strong> — 10+ stages including Seamless North Africa (4 panels), DevOpsDays Cairo, Africa FinTech Forum, Techne Summit, TechUp Women. <span class="tl-expand-metric">🎤 10+ Stages</span>',
      learning: '<strong>Continuous Learning</strong> — DBA, MBA, BA from Helwan University. Frankfurt School Digital Finance. 20+ certifications. Best Learner Award. <span class="tl-expand-metric">🏆 Best Learner</span>',
      author:   '<strong>Thought Leadership</strong> — Published "The Bilingual Executive", founded Fintech Bilinguals community, 1,000+ mentoring minutes on ADPList. <span class="tl-expand-metric">📚 Author</span>',
      mentor:   '<strong>Mentorship</strong> — Top 50 ADPList Mentor in Project Management. 1,000+ minutes coaching FinTech, data, and digital transformation professionals. <span class="tl-expand-metric">🏅 Top 50</span>',
      military: '<strong>Military Service</strong> — Technology Officer at Egyptian Armed Forces. 100% uptime for mission-critical systems. Leadership commendation. <span class="tl-expand-metric">🛡️ 100% Uptime</span>',
      fintech:  '<strong>FinTech Ecosystem</strong> — 6+ years pro bono consulting for Egyptian FinTech Association. Startup advisory, ecosystem development. <span class="tl-expand-metric">🚀 6+ Years</span>',
      intern:   '<strong>Foundation Years</strong> — Internships at Nissan, Central Bank of Egypt, Egyptian Exchange, MCDR. Corporate finance, capital markets, regulatory exposure. <span class="tl-expand-metric">🏛️ 4 Institutions</span>',
    };

    // ─── 1. HIDE EXISTING STATIC LINE ───
    const staticLine = tlWrap.querySelector('.tl-line');
    if (staticLine) staticLine.style.display = 'none';

    // ─── 2. SCROLL-PROGRESS LINE (simple div) ───
    const scrollLine = document.createElement('div');
    scrollLine.className = 'tl-scroll-line';
    scrollLine.innerHTML = '<div class="tl-scroll-line-fill" id="tlScrollFill"></div>';
    tlWrap.appendChild(scrollLine);
    const scrollFill = document.getElementById('tlScrollFill');

    // ─── 4. FILTER PILLS ───
    const filters = document.createElement('div');
    filters.className = 'tl-filters'; filters.id = 'tlFilters';
    const filterIcons = { all: '✦', banking: '🏦', agile: '⚡', data: '📊', speaking: '🎤', learning: '🎓', author: '📚', mentor: '🎓', military: '🛡️', fintech: '🚀', intern: '🏛️' };
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
      const itemText = item.textContent.toLowerCase();

      // Try role-specific match first
      let detail = null;
      for (const role of ROLE_MAP) {
        if (role.match.some(kw => itemText.includes(kw.toLowerCase()))) {
          detail = role.html;
          break;
        }
      }
      // Fallback to tag-based detail
      if (!detail) detail = DETAILS[primaryTag] || DETAILS.banking;

      const expandDiv = document.createElement('div');
      expandDiv.className = 'tl-item-expand';
      expandDiv.innerHTML = `<div class="tl-expand-content">${detail}</div>`;
      item.appendChild(expandDiv);

      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const isOpen = expandDiv.classList.contains('open');
        tlWrap.querySelectorAll('.tl-item-expand.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) expandDiv.classList.add('open');
      });

      item.classList.add('tl-enhanced');
    });

    // ─── 7. ENTRANCE ANIMATION ───
    if (!RM) {
      setTimeout(() => {
        const viewH = window.innerHeight;
        items.forEach((item, idx) => {
          const r = item.getBoundingClientRect();
          if (r.top > viewH) {
            item.classList.add('tl-hidden');
            item.style.transitionDelay = (idx % 5) * 0.05 + 's';
          } else {
            item.classList.add('tl-visible');
          }
        });
      }, 2000);
    }

    // ─── 8. MASTER SCROLL ENGINE ───
    let rafId = null;
    let lastProgress = -1;

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const wrapRect = tlWrap.getBoundingClientRect();
        const viewH = window.innerHeight;
        const inView = wrapRect.top < viewH && wrapRect.bottom > 0;

        // Progress bar visibility
        progressBar.classList.toggle('show', inView);

        if (!inView) return;

        // ── Scroll line fill ──
        const rawProgress = Math.max(0, Math.min(1,
          (viewH * 0.5 - wrapRect.top) / wrapRect.height
        ));
        if (Math.abs(rawProgress - lastProgress) > 0.002) {
          lastProgress = rawProgress;
          scrollFill.style.height = (rawProgress * 100) + '%';
          const pct = Math.round(rawProgress * 100);
          progressFill.style.width = pct + '%';
          progressLabel.textContent = pct + '%';
        }

        // ── Per-item checks ──
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
          item.classList.toggle('tl-active', centered && !item.classList.contains('filtered-out'));
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    setTimeout(onScroll, 2500);

    // ─── 9. FILTER SYSTEM ───
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

    // ─── 10. TERMINAL INTEGRATION ───
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
      if(typeof checkTrophy==='function') checkTrophy('guestbook_signed');
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
  // FEATURE 5: VOICE NAVIGATION — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // 25+ routes · continuous mode · trophy triggers · compound commands · confidence display

  let voiceActive = false, recognition = null;

  function initVoiceNav() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    const btn = document.createElement('button');
    btn.className = 'voice-btn'; btn.id = 'voiceBtn';
    btn.setAttribute('aria-label','Voice Navigation'); btn.title = 'Voice Command (V)';
    btn.innerHTML = '<i class="fa-solid fa-microphone-slash" id="voiceIcon"></i>';
    document.body.appendChild(btn);

    const transcript = document.createElement('div');
    transcript.className = 'voice-transcript'; transcript.id = 'voiceTranscript';
    document.body.appendChild(transcript);

    // Route helpers
    function scrollTo(sel){const el=document.querySelector(sel);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
    function clickLink(partial){const lk=document.querySelector(`a.lk[href*="${partial}"]`);if(lk)lk.click();}

    const ROUTES = [
      // Navigation
      { match:/open\s*arcade|play\s*game|games|arcade/i,    action:()=>{if(window._openArcade)window._openArcade();return'🕹️ Opening Arcade';} },
      { match:/play\s*stacker|sprint\s*stacker/i,           action:()=>{if(window.TermCmds?.play)window.TermCmds.play('stacker');return'🧱 Launching Sprint Stacker';} },
      { match:/play\s*router|data\s*mesh\s*router/i,        action:()=>{if(window.TermCmds?.play)window.TermCmds.play('router');return'🔀 Launching Data Mesh Router';} },
      { match:/play\s*trader|fintech\s*trader|stock/i,      action:()=>{if(window.openGame)window.openGame();return'📈 Launching FinTech Trader';} },
      { match:/play\s*snake/i,                               action:()=>{if(window.TermCmds?.play)window.TermCmds.play('snake');return'🐍 Launching Snake';} },
      { match:/play\s*bilingual|bilingual\s*swipe/i,         action:()=>{if(window.TermCmds?.play)window.TermCmds.play('bilingual');return'🌐 Launching Bilingual Swipe';} },
      { match:/certif|certs|badges|credential/i,             action:()=>{scrollTo('#certGrid');return'📜 Scrolling to Certifications';} },
      { match:/testimon|recommend|reviews|endorse/i,         action:()=>{scrollTo('.tc-section');return'⭐ Scrolling to Testimonials';} },
      { match:/timeline|journey|experience|career|history/i, action:()=>{scrollTo('.tl-wrap');return'🚀 Scrolling to Timeline';} },
      { match:/contact|email|phone|reach\s*out|connect/i,    action:()=>{const s=document.getElementById('contactSecret');if(s)s.classList.add('revealed');scrollTo('.sr');if(typeof checkTrophy==='function')checkTrophy('explorer_contact');return'📧 Revealing Contact Info';} },
      { match:/book|bilingual\s*exec|author|amazon/i,        action:()=>{clickLink('bilingual');return'📘 Opening Book Link';} },
      { match:/mentor|adplist|coaching|session/i,             action:()=>{window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank');return'🎓 Opening ADPList';} },
      { match:/conference|speak|talks|panel|keynote/i,        action:()=>{scrollTo('.conf-strip');return'🎤 Scrolling to Conferences';} },
      { match:/article|linkedin.*post|blog|writing/i,         action:()=>{scrollTo('#linkedinFeed');return'📝 Scrolling to Articles';} },
      { match:/impact|numbers|metrics|data\s*point/i,         action:()=>{scrollTo('.imp');return'📊 Scrolling to Impact Numbers';} },
      // Features
      { match:/zen\s*mode|clean|focus|minimal/i,              action:()=>{const b=document.getElementById('zenBtn');if(b)b.click();if(typeof checkTrophy==='function')checkTrophy('theme_zen');return'🧘 Toggling Zen Mode';} },
      { match:/cyberpunk|neon|night\s*city|theme/i,           action:()=>{if(window._toggleCyberpunk)window._toggleCyberpunk(true);if(typeof checkTrophy==='function')checkTrophy('theme_cyberpunk');return'🌆 Toggling Cyberpunk';} },
      { match:/search|find|command|palette|look\s*for/i,      action:()=>{if(window._openPalette)window._openPalette();return'⌨️ Opening Command Palette';} },
      { match:/guest\s*book|wall|sign|visitor/i,              action:()=>{openGuestbook();return'🌍 Opening Guestbook';} },
      { match:/terminal|console|hack|shell/i,                 action:()=>{if(window.openTerm)window.openTerm();return'💻 Opening Terminal';} },
      { match:/trophy|trophies|achievement|progress|badge/i,  action:()=>{if(window._openTrophies)window._openTrophies();return'🏆 Opening Trophy Case';} },
      { match:/calendar|schedule|book.*call|meeting/i,        action:()=>{window.open('https://calendly.com/amrmelharony/30min','_blank');return'📅 Opening Calendar';} },
      { match:/linkedin\s*profile|connect.*linkedin/i,        action:()=>{window.open('https://linkedin.com/in/amrmelharony','_blank');return'💼 Opening LinkedIn';} },
      { match:/three\s*d.*book|3d.*book|book.*viewer/i,       action:()=>{if(window.TermCmds?.book3d)window.TermCmds.book3d();return'📦 Opening 3D Book';} },
      { match:/data\s*mesh\s*3d|mesh.*visual/i,               action:()=>{if(window.TermCmds?.datamesh)window.TermCmds.datamesh();return'🔀 Opening Data Mesh 3D';} },
      // Scroll
      { match:/scroll\s*down|next|continue/i,                 action:()=>{window.scrollBy({top:window.innerHeight*0.7,behavior:'smooth'});return'⬇️ Scrolling down';} },
      { match:/scroll\s*up|back|previous/i,                   action:()=>{window.scrollBy({top:-window.innerHeight*0.7,behavior:'smooth'});return'⬆️ Scrolling up';} },
      { match:/top|home|start|beginning/i,                    action:()=>{window.scrollTo({top:0,behavior:'smooth'});return'⏫ Scrolling to Top';} },
      { match:/bottom|end|footer/i,                           action:()=>{window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});return'⏬ Scrolling to Bottom';} },
      // Meta
      { match:/help|what can|commands|options/i,              action:()=>{showVoiceHelp(transcript);return'📋 Showing available commands';} },
      { match:/stop|cancel|close|never\s*mind/i,             action:()=>{return'👋 Stopped listening';} },
    ];

    function showVoiceHelp(el) {
      el.innerHTML = `<div style="font-size:9px;line-height:1.6;color:#8b949e">
        <strong style="color:#00e1ff">Voice Commands:</strong><br>
        "certifications" · "timeline" · "contact" · "arcade"<br>
        "play stacker" · "trophy case" · "zen mode"<br>
        "scroll down" · "go to top" · "open terminal"<br>
        "book a call" · "linkedin" · "guestbook"<br>
        "help" · "stop"
      </div>`;
      el.classList.add('show');
    }

    let hideTimer = null, commandCount = 0;
    recognition.onresult = (event) => {
      let text=''; for(let i=event.resultIndex;i<event.results.length;i++) text+=event.results[i][0].transcript;
      const isFinal=event.results[event.results.length-1].isFinal;
      const confidence = event.results[event.results.length-1][0].confidence;
      const confPct = Math.round((confidence||0) * 100);

      transcript.innerHTML=`<span class="heard">"${text}"</span> <span style="color:#2d3748;font-size:8px">${confPct}%</span>`;
      transcript.classList.add('show');
      if(hideTimer)clearTimeout(hideTimer);

      if(isFinal){
        let matched=false;
        for(const route of ROUTES){
          if(route.match.test(text)){
            const result=route.action();
            transcript.innerHTML=`<span class="heard">"${text}"</span> → <span class="action">${result}</span>`;
            matched=true;
            commandCount++;
            if(window.VDna) window.VDna.addXp(3);
            // Trophy: first voice command
            if(typeof checkTrophy==='function') checkTrophy('voice_used');
            break;
          }
        }
        if(!matched) {
          transcript.innerHTML=`<span class="heard">"${text}"</span> → <span style="color:#6b7280">Say "help" for available commands</span>`;
        }
        hideTimer=setTimeout(()=>transcript.classList.remove('show'), matched ? 3000 : 4500);
        stopVoice();
      }
    };
    recognition.onerror=(e)=>{ if(e.error!=='aborted') stopVoice(); };
    recognition.onend=()=>{if(voiceActive)stopVoice();};

    function startVoice(){
      voiceActive=true; btn.classList.add('listening');
      document.getElementById('voiceIcon').className='fa-solid fa-microphone';
      transcript.innerHTML='<span style="color:#ef4444;font-size:10px">🎙️ Listening... say a command</span>';
      transcript.classList.add('show');
      try{recognition.start();}catch(e){}
      if(navigator.vibrate)navigator.vibrate(50);
    }
    function stopVoice(){voiceActive=false;btn.classList.remove('listening');document.getElementById('voiceIcon').className='fa-solid fa-microphone-slash';try{recognition.stop();}catch(e){}}
    function toggleVoice(){voiceActive?stopVoice():startVoice();}
    window._toggleVoice=toggleVoice;

    btn.addEventListener('click',toggleVoice);
    document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='v'&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleVoice();});

    if(window.TermCmds){
      window.TermCmds.voice=()=>{setTimeout(toggleVoice,200);return voiceActive?'<span class="term-gray">🔇 Voice stopped</span>':'<span class="term-green">🎤 Listening... say "help" for commands</span>';};
      window.TermCmds['voice-help']=()=>{
        return `<span class="term-green">🎙️ Voice Commands:</span>
<span class="term-gray">Navigation:</span> certifications, timeline, testimonials, contact, impact, conferences, articles
<span class="term-gray">Arcade:</span> arcade, play stacker, play router, play trader, play snake, play bilingual
<span class="term-gray">Features:</span> zen mode, cyberpunk, terminal, guestbook, trophy case, search
<span class="term-gray">Links:</span> linkedin, book a call, mentor, book
<span class="term-gray">Scroll:</span> scroll down, scroll up, go to top, bottom
<span class="term-gray">Meta:</span> help, stop`;
      };
    }
  }


  // ═══════════════════════════════════════════════════
  // WIRE SHORTCUTS
  // ═══════════════════════════════════════════════════
  function wireShortcuts() {
    const panel = document.querySelector('.shortcut-panel');
    if (!panel) return;
    const closeDiv = panel.querySelector('.sc-close');
    if (!closeDiv) return;
    [
      { key:'⌘K', desc:'Command Palette' },
      { key:'V', desc:'Voice Navigation' },
      { key:'G', desc:'Guestbook' },
      { key:'Z', desc:'Zen Mode' },
      { key:'C', desc:'Cyberpunk Theme' },
      { key:'T', desc:'Terminal' },
    ].forEach(sc => {
      if (panel.querySelector(`[data-p6-key="${sc.key}"]`)) return;
      const row = document.createElement('div');
      row.className = 'sc-row'; row.dataset.p6Key = sc.key;
      row.innerHTML = `<span class="sc-key">${sc.key}</span><span class="sc-desc">${sc.desc}</span>`;
      panel.insertBefore(row, closeDiv);
    });
  }


  // ═══════════════════════════════════════════════════
  // REMOVE ADPLIST INLINE WIDGET
  // ═══════════════════════════════════════════════════
  function removeADPListWidget() {
    // Defensive cleanup: remove any ADPList embedded widget remnants
    const selectors = [
      '[data-adplist-widget]', '.adplist-widget', 'iframe[src*="adplist"]',
      '.adp-widget-container', 'div[id*="adplist-widget"]', 'div[class*="adplist-widget"]',
      'script[src*="adplist"]', '.adplist-embed', '[data-widget="adplist"]',
    ];
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));

    // Remove duplicate Digital Twin status bar
    const twinEl = document.getElementById('twinStatus') || document.querySelector('.twin-status');
    if (twinEl) twinEl.remove();

    // Remove inline scripts that load ADPList widget
    document.querySelectorAll('script').forEach(script => {
      if (script.textContent && script.textContent.includes('adplist') && script.textContent.includes('widget')) {
        script.remove();
      }
    });
  }


  // ═══════════════════════════════════════════════════
  // ADVANCED TERMINAL COMMANDS
  // ═══════════════════════════════════════════════════
  function wireAdvancedTerminal() {
    if (!window.TermCmds) return;
    const T = window.TermCmds;

    // ── Help system ──────────────────────────────
    T.help = () => {
      return `<span class="term-green">═══ Phase 6 Terminal Commands ═══</span>

<span class="term-cyan">Navigation:</span>
  <span class="term-white">goto &lt;section&gt;</span>    Scroll to section (timeline, certs, impact, testimonials, conferences, articles, contact)
  <span class="term-white">top</span>               Scroll to top
  <span class="term-white">bottom</span>            Scroll to bottom

<span class="term-cyan">Arcade:</span>
  <span class="term-white">play &lt;game&gt;</span>       Launch a game (stacker, router, trader, bilingual, snake)
  <span class="term-white">arcade</span>            Open the Arcade panel
  <span class="term-white">scores</span>            Show high scores

<span class="term-cyan">Features:</span>
  <span class="term-white">search / find</span>     Open Command Palette (⌘K)
  <span class="term-white">voice</span>             Toggle voice navigation
  <span class="term-white">voice-help</span>        Show voice commands
  <span class="term-white">guestbook / wall</span>  Open guestbook
  <span class="term-white">trophies</span>          Open Trophy Case & Progress
  <span class="term-white">progress</span>          Show site exploration progress
  <span class="term-white">achievements</span>      Same as trophies

<span class="term-cyan">Themes:</span>
  <span class="term-white">zen</span>               Toggle Zen Mode
  <span class="term-white">cyberpunk</span>         Toggle Cyberpunk theme
  <span class="term-white">matrix</span>            Matrix rain effect

<span class="term-cyan">Timeline:</span>
  <span class="term-white">timeline</span>          Scroll to timeline
  <span class="term-white">timeline &lt;tag&gt;</span>   Filter (banking, agile, data, speaking, learning, author)

<span class="term-cyan">Links:</span>
  <span class="term-white">linkedin</span>          Open LinkedIn profile
  <span class="term-white">calendar</span>          Book a meeting
  <span class="term-white">book</span>              Open The Bilingual Executive
  <span class="term-white">mentor</span>            Book a mentoring session
  <span class="term-white">community</span>         Open Fintech Bilinguals

<span class="term-cyan">System:</span>
  <span class="term-white">admin / stats</span>     Visitor insights dashboard
  <span class="term-white">clear</span>             Clear terminal
  <span class="term-white">whoami</span>            About Amr
  <span class="term-white">resume</span>            Quick resume summary
  <span class="term-white">stack</span>             Tech stack
  <span class="term-white">uptime</span>            Session uptime
  <span class="term-white">xp</span>                Show XP and level
  <span class="term-white">export</span>            Export session data
  <span class="term-white">reset</span>             Reset all progress
  <span class="term-white">easter</span>            Find hidden commands 😉`;
    };

    // ── Navigation ──────────────────────────────
    const NAV_MAP = {
      timeline: '.tl-wrap', certs: '#certGrid', certifications: '#certGrid',
      impact: '.imp', numbers: '.imp', testimonials: '.tc-section',
      conferences: '.conf-strip', articles: '#linkedinFeed', contact: '.sr',
    };
    T.goto = (args) => {
      const target = (args || '').trim().toLowerCase();
      if (!target) return '<span class="term-gray">Usage: goto &lt;section&gt; — try: timeline, certs, impact, testimonials, conferences, articles, contact</span>';
      const sel = NAV_MAP[target];
      if (!sel) return `<span class="term-red">Unknown section "${escHtml(target)}".</span> Try: ${Object.keys(NAV_MAP).join(', ')}`;
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (target === 'contact') { const s = document.getElementById('contactSecret'); if (s) s.classList.add('revealed'); }
      }
      return `<span class="term-green">📍 Navigating to ${target}...</span>`;
    };
    T.top = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); return '<span class="term-green">⏫ Scrolling to top</span>'; };
    T.bottom = () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return '<span class="term-green">⏬ Scrolling to bottom</span>'; };

    // ── Arcade ──────────────────────────────
    T.arcade = () => { if (window._openArcade) { setTimeout(() => window._openArcade(), 200); } return '<span class="term-green">🕹️ Opening Arcade...</span>'; };
    T.scores = () => {
      const arcade = JSON.parse(localStorage.getItem('arcade_state') || '{}');
      const hs = arcade.highScores || {};
      const names = { stacker:'Sprint Stacker', router:'Data Mesh Router', trader:'FinTech Trader', bilingual:'Bilingual Swipe', snake:'Snake' };
      if (!Object.keys(hs).length) return '<span class="term-gray">No high scores yet. Play some games first!</span>';
      const rows = Object.entries(hs).map(([id, score]) => `  <span class="term-white">${names[id] || id}</span>: <span class="term-green">${score}</span>`).join('\n');
      return `<span class="term-cyan">🏅 High Scores:</span>\n${rows}\n  <span class="term-gray">Total plays: ${arcade.totalPlays || 0} | Boss: ${arcade.bossBeaten ? '✅ Defeated' : '❌ Not yet'}</span>`;
    };

    // ── Themes ──────────────────────────────
    T.zen = () => { const b = document.getElementById('zenBtn'); if (b) b.click(); if (typeof checkTrophy === 'function') checkTrophy('theme_zen'); return '<span class="term-green">🧘 Toggling Zen Mode</span>'; };
    T.cyberpunk = () => { if (window._toggleCyberpunk) window._toggleCyberpunk(true); if (typeof checkTrophy === 'function') checkTrophy('theme_cyberpunk'); return '<span class="term-green">🌆 Toggling Cyberpunk</span>'; };
    T.matrix = () => {
      // Quick matrix rain effect in terminal
      const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';
      let lines = [];
      for (let i = 0; i < 8; i++) {
        let line = '';
        for (let j = 0; j < 50; j++) line += chars[Math.floor(Math.random() * chars.length)];
        lines.push(`<span style="color:#00ff41;opacity:${0.3 + Math.random() * 0.7}">${line}</span>`);
      }
      return lines.join('\n');
    };

    // ── Links ──────────────────────────────
    T.linkedin = () => { window.open('https://linkedin.com/in/amrmelharony', '_blank'); return '<span class="term-green">💼 Opening LinkedIn profile...</span>'; };
    T.calendar = () => { window.open('https://calendly.com/amrmelharony/30min', '_blank'); return '<span class="term-green">📅 Opening calendar booking...</span>'; };
    T.book = () => { const lk = document.querySelector('a.lk[href*="bilingual"]'); if (lk) lk.click(); return '<span class="term-green">📘 Opening The Bilingual Executive...</span>'; };
    T.mentor = () => { window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session', '_blank'); return '<span class="term-green">🎓 Opening ADPList mentoring...</span>'; };
    T.community = () => { const lk = document.querySelector('a.lk[href*="fintech-bilinguals"]'); if (lk) lk.click(); return '<span class="term-green">🤝 Opening Fintech Bilinguals...</span>'; };

    // ── System / Info ──────────────────────────────
    T.whoami = () => {
      return `<span class="term-cyan">═══ Amr El Harony ═══</span>
<span class="term-white">Scrum Master</span> @ Banque Misr — Data & Analytics Division (9+ yrs at BM)
<span class="term-gray">Career path: Business Banking → Credit Analysis → PMP → Data Analytics → Scrum Master</span>
<span class="term-gray">DBA in Digital Transformation · MBA in Entrepreneurship · BA in International Economics</span>
<span class="term-gray">Certified Expert in Digital Finance (Frankfurt School)</span>
<span class="term-gray">20+ certifications: PMP®, SAFe 6, PSM II, PSPO II, PMI-ACP, ICP-ATF, PSK, CDMP</span>
<span class="term-gray">Author of "The Bilingual Executive" · Founder of Fintech Bilinguals</span>
<span class="term-gray">Top 50 ADPList Mentor (PM) · 1,000+ mentoring minutes</span>
<span class="term-gray">10+ conference stages: Seamless NA, DevOpsDays, Africa FinTech Forum, Techne Summit</span>
<span class="term-gray">6+ years pro bono FinTech consulting (Egyptian FinTech Association)</span>
<span class="term-gray">Technology Officer veteran (Egyptian Armed Forces · IT & Digital Security)</span>`;
    };

    T.resume = () => {
      return `<span class="term-cyan">═══ Career Timeline ═══</span>
<span class="term-white">2025–Now:</span>  Scrum Master — Banque Misr (Data & Analytics) · Hybrid Scrum/Kanban
<span class="term-white">2021–2025:</span> Corporate Banking Data Analyst — BI dashboards, DataCamp certified
<span class="term-white">2020–2021:</span> Project Management Professional — PMP®, cross-functional delivery
<span class="term-white">2017–2020:</span> SMEs Credit Analyst — Portfolio risk, lending, financial analysis
<span class="term-white">2016–2017:</span> Business Banking Officer — Client advisory, SME consulting
<span class="term-white">2015–2016:</span> Technology Officer — Egyptian Armed Forces (IT & Digital Security)
<span class="term-white">2011–2014:</span> Finance Internships — Nissan, Central Bank, Exchange, MCDR

<span class="term-cyan">═══ Education ═══</span>
<span class="term-white">2023:</span> DBA Digital Transformation — Helwan University
<span class="term-white">2019:</span> Certified Expert in Digital Finance — Frankfurt School
<span class="term-white">2019:</span> MBA Entrepreneurship — Helwan University
<span class="term-white">2014:</span> BA International Economics — Helwan University

<span class="term-cyan">═══ Speaking (10+ stages) ═══</span>
<span class="term-white">2025:</span> Banking & FinTech Summit · Techne Summit · DevOpsDays Cairo
<span class="term-white">2025:</span> Africa FinTech Forum · Egypt Career Summit
<span class="term-white">2024:</span> Seamless North Africa (4 panels + keynote) · TechUp Women

<span class="term-cyan">═══ Other Roles ═══</span>
<span class="term-white">2026–Now:</span>  Founder — Fintech Bilinguals community
<span class="term-white">2023–Now:</span>  Top 50 ADPList Mentor (1,000+ minutes)
<span class="term-white">2019–Now:</span>  FinTech Consultant (Pro Bono) — Egyptian FinTech Association
<span class="term-white">Author:</span>    "The Bilingual Executive" (Published)`;
    };

    T.stack = () => {
      return `<span class="term-cyan">═══ Site Tech Stack ═══</span>
<span class="term-white">Frontend:</span>  HTML5 · CSS3 · Vanilla JS (6,300+ lines)
<span class="term-white">Animation:</span> GSAP · CSS Animations · Canvas API · SVG
<span class="term-white">Features:</span>  Command Palette · Voice Nav · Terminal · Guestbook
<span class="term-white">Games:</span>    5 mini-games (Canvas) + Boss Fight
<span class="term-white">3D:</span>       Three.js book viewer · Data Mesh visualization
<span class="term-white">Gamify:</span>   XP system · 24 trophies · progress tracking
<span class="term-white">Themes:</span>   Zen Mode · Cyberpunk · RTL support
<span class="term-white">Data:</span>     localStorage · Visitor DNA system · engagement scoring`;
    };

    T.uptime = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const sessionStart = vdna.sessionStart || Date.now();
      const diff = Date.now() - sessionStart;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return `<span class="term-green">⏱ Session: ${mins}m ${secs}s</span> | <span class="term-gray">Visits: ${vdna.visits || 1}</span>`;
    };

    T.xp = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const xp = vdna.xp || 0, level = vdna.level || 1;
      const unlocked = vdna.unlocked ? Object.keys(vdna.unlocked).length : 0;
      const nextLvl = level * 50;
      const bar = '█'.repeat(Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20))) + '░'.repeat(20 - Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20)));
      return `<span class="term-cyan">Level ${level}</span> — <span class="term-green">${xp} XP</span>
<span class="term-gray">[${bar}] ${xp % nextLvl}/${nextLvl} to next level</span>
<span class="term-gray">Trophies: ${unlocked}/24</span>`;
    };

    T.export = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const arcade = JSON.parse(localStorage.getItem('arcade_state') || '{}');
      const data = { vdna, arcade, exported: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'amrelharony-session.json'; a.click();
      URL.revokeObjectURL(url);
      return '<span class="term-green">📦 Session data exported!</span>';
    };

    T.reset = () => {
      localStorage.removeItem('arcade_state');
      localStorage.removeItem('guestbook_entries');
      localStorage.removeItem('cmd_mru');
      if (window.VDna) {
        const v = window.VDna.get();
        v.xp = 0; v.level = 1; v.unlocked = {};
        window.VDna.save();
      }
      return '<span class="term-red">⚠️ All progress reset. Refresh to see changes.</span>';
    };

    // ── Easter eggs ──────────────────────────────
    T.easter = () => {
      return `<span class="term-green">🥚 Hidden commands exist...</span>
<span class="term-gray">Try: matrix, cowsay, fortune, neofetch, sudo</span>`;
    };
    T.cowsay = (args) => {
      const msg = args || 'Hire Amr!';
      return `<span class="term-white"> ${'_'.repeat(msg.length + 2)}
&lt; ${msg} &gt;
 ${'-'.repeat(msg.length + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</span>`;
    };
    T.fortune = () => {
      const fortunes = [
        'The best way to predict the future is to build it.',
        'Data is the new oil, but insight is the new gold.',
        'Agility is not about going fast, it is about going smart.',
        'The bridge between banking and tech is built one sprint at a time.',
        'A good mentor plants trees they may never sit under.',
        'Digital transformation starts with people, not technology.',
        'Ship fast, learn faster, iterate always.',
      ];
      return `<span class="term-green">🔮 ${fortunes[Math.floor(Math.random() * fortunes.length)]}</span>`;
    };
    T.neofetch = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const ua = navigator.userAgent;
      const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';
      const device = /Mobile|Android/i.test(ua) ? 'Mobile' : 'Desktop';
      return `<span class="term-cyan">        ___
       /   \\      </span><span class="term-white">amrelharony.com</span><span class="term-cyan">
      | A E |     </span><span class="term-gray">───────────────</span><span class="term-cyan">
      |  H  |     </span><span class="term-white">OS:</span><span class="term-gray"> Portfolio v6.0</span><span class="term-cyan">
       \\___/      </span><span class="term-white">Shell:</span><span class="term-gray"> Phase6 Terminal</span>
                  <span class="term-white">Browser:</span><span class="term-gray"> ${browser}</span>
                  <span class="term-white">Device:</span><span class="term-gray"> ${device}</span>
                  <span class="term-white">XP:</span><span class="term-gray"> ${vdna.xp || 0}</span>
                  <span class="term-white">Level:</span><span class="term-gray"> ${vdna.level || 1}</span>
                  <span class="term-white">Visits:</span><span class="term-gray"> ${vdna.visits || 1}</span>
                  <span class="term-white">Uptime:</span><span class="term-gray"> ${Math.floor((Date.now() - (vdna.sessionStart || Date.now())) / 60000)}m</span>`;
    };
    T.sudo = () => '<span class="term-red">Nice try 😎 — you don\'t have root access to this portfolio!</span>';
    T.hack = () => '<span class="term-green">Initializing hack sequence... just kidding. Try "help" instead.</span>';

    // ── Wire trophy trigger for terminal use ──────
    if (typeof checkTrophy === 'function') checkTrophy('terminal_used');
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
    removeADPListWidget();
    initAlwaysCTA();
    initCommandPalette();
    initAdminDashboard();
    initInteractiveTimeline();
    initGuestbook();
    initVoiceNav();
    wireShortcuts();
    wireAdvancedTerminal();
    initTrophySystem();
    console.log(
      '%c⚡ Phase 6.1 Loaded %c Palette+ · Trophies · Timeline · Guestbook · Voice+ · Terminal+',
      'background:#fbbf24;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#fbbf24;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else { setTimeout(init, 500); }

})();
