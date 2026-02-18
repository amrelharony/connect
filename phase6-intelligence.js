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
   3. INTERACTIVE TIMELINE (WOW FACTOR)
   ═══════════════════════════════════════════ */

.tl-filters {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
  margin: 8px 0 4px; padding: 0 8px;
}
.tl-filter-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 3px 10px; border-radius: 100px;
  border: 1px solid #1a2332; background: transparent; color: #4a5568;
  cursor: pointer; transition: all .25s; -webkit-tap-highlight-color: transparent;
}
.tl-filter-btn:hover { border-color: rgba(0,225,255,.2); color: #8b949e; }
.tl-filter-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(0,225,255,.06); }

/* Scroll-driven timeline line glow */
.tl-line-glow {
  position: absolute; top: 0; left: 50%; width: 3px; transform: translateX(-50%);
  background: linear-gradient(180deg, #00e1ff, #6366f1, #a855f7);
  border-radius: 2px; height: 0%;
  transition: height .15s linear;
  box-shadow: 0 0 8px rgba(0,225,255,.3), 0 0 20px rgba(99,102,241,.15);
  pointer-events: none; z-index: 1;
}

/* Staggered item animations */
.tl-item {
  transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1);
  cursor: pointer;
}
.tl-item.tl-hidden {
  opacity: 0;
  transform: translateY(24px);
}
.tl-item.tl-visible {
  opacity: 1;
  transform: translateY(0);
}
.tl-item.filtered-out {
  opacity: .1 !important;
  transform: scale(.92) !important;
  pointer-events: none;
  filter: grayscale(.6);
}

/* Active item in viewport — subtle glow */
.tl-item.tl-active .tl-dot {
  box-shadow: 0 0 0 4px rgba(0,225,255,.12), 0 0 12px rgba(0,225,255,.2);
  border-color: var(--accent) !important;
  transform: scale(1.3);
  transition: all .4s cubic-bezier(.16,1,.3,1);
}
.tl-item.tl-active {
  background: rgba(0,225,255,.02);
  border-radius: 10px;
}
.tl-item:hover .tl-yr { color: var(--accent); }

/* Expand region */
.tl-item-expand {
  max-height: 0; overflow: hidden; opacity: 0;
  transition: max-height .5s cubic-bezier(.16,1,.3,1), opacity .4s .1s, margin .3s;
  margin: 0;
}
.tl-item-expand.open { max-height: 250px; opacity: 1; margin: 8px 0 0; }
.tl-expand-content {
  padding: 10px 12px; border-radius: 10px;
  background: rgba(0,225,255,.02); border: 1px solid rgba(0,225,255,.06);
  font-size: 10px; line-height: 1.7; color: #8b949e;
  position: relative; overflow: hidden;
}
.tl-expand-content::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: .3;
}
.tl-expand-content strong { color: #e2e8f0; }
.tl-expand-metric {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.1);
  color: #22c55e; margin: 4px 4px 0 0;
}

/* Year navigator (fixed sidebar) */
.tl-year-nav {
  position: fixed; right: 8px; top: 50%; transform: translateY(-50%);
  z-index: 98; display: flex; flex-direction: column; gap: 2px;
  opacity: 0; transition: opacity .4s; pointer-events: none;
}
.tl-year-nav.show { opacity: 1; pointer-events: auto; }
.tl-year-pip {
  font-family: 'JetBrains Mono', monospace; font-size: 6px;
  color: #2d3748; padding: 2px 6px; border-radius: 4px;
  text-align: right; cursor: pointer; transition: all .2s;
  letter-spacing: .5px;
}
.tl-year-pip:hover { color: #6b7280; }
.tl-year-pip.active {
  color: var(--accent); background: rgba(0,225,255,.06);
  transform: translateX(-3px);
}

body.zen-mode .tl-filters,
body.zen-mode .tl-year-nav,
body.zen-mode .tl-item-expand { display: none !important; }
body.zen-mode .tl-line-glow { display: none; }

@media(max-width:600px) { .tl-year-nav { display: none !important; } }
@media print { .tl-filters, .tl-item-expand, .tl-year-nav, .tl-line-glow { display: none !important; } }


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
  // FEATURE 3: INTERACTIVE TIMELINE (WOW FACTOR)
  // ═══════════════════════════════════════════════════

  function initInteractiveTimeline() {
    const tlWrap = document.querySelector('.tl-wrap');
    if (!tlWrap) return;
    const items = tlWrap.querySelectorAll('.tl-item');
    if (!items.length) return;

    // Make tl-wrap relative for the glow line
    tlWrap.style.position = 'relative';

    // Tag system
    const TAGS = {
      banking:  ['bank','banque','misr','operations','financial','treasury'],
      agile:    ['scrum','agile','kanban','safe','sprint','delivery','pmp','lead'],
      data:     ['data','analytics','cdmp','warehouse','pipeline','governance','mesh'],
      speaking: ['speak','conference','seamless','devopsdays','keynote','panel','summit'],
      learning: ['cert','degree','doctorate','dba','learn','study','university','award'],
      author:   ['book','bilingual','executive','author','publish','write','community'],
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

    // Expandable details
    const DETAILS = {
      banking:  '<strong>Banking Operations & Finance</strong> — Front-office operations, transaction processing, compliance workflows. Foundation for data flows in financial institutions.',
      agile:    '<strong>Agile Delivery Leadership</strong> — Scrum/Kanban facilitation, sprint planning, retrospectives, stakeholder alignment. <span class="tl-expand-metric">⚡ Hybrid framework adoption</span><span class="tl-expand-metric">📈 Improved team velocity</span>',
      data:     '<strong>Data & Analytics</strong> — Data pipelines, governance frameworks, analytics platforms, cross-domain data products. <span class="tl-expand-metric">📊 Data-driven decisions</span>',
      speaking: '<strong>Industry Engagement</strong> — Keynotes and panels at 7+ conferences, sharing insights on agile, fintech, and digital transformation across MENA.',
      learning: '<strong>Continuous Learning</strong> — 20+ professional certifications, doctorate research, Banque Misr Best Learner Award. <span class="tl-expand-metric">🏆 Best Learner Award</span>',
      author:   '<strong>Thought Leadership</strong> — Published "The Bilingual Executive", founded Fintech Bilinguals community, 2,400+ mentoring minutes on ADPList.',
    };

    // Insert filter buttons
    const filters = document.createElement('div');
    filters.className = 'tl-filters'; filters.id = 'tlFilters';
    ['all', ...Object.keys(TAGS)].forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tl-filter-btn' + (tag === 'all' ? ' active' : '');
      btn.textContent = tag; btn.dataset.filter = tag;
      btn.addEventListener('click', () => filterTimeline(tag));
      filters.appendChild(btn);
    });
    tlWrap.insertBefore(filters, tlWrap.firstChild);

    // Glow line overlay (fills as you scroll through timeline)
    const glowLine = document.createElement('div');
    glowLine.className = 'tl-line-glow';
    glowLine.id = 'tlGlowLine';
    const existingLine = tlWrap.querySelector('.tl-line');
    if (existingLine) {
      existingLine.style.position = 'relative';
      existingLine.appendChild(glowLine);
    }

    // Add expand + hide items initially
    items.forEach((item, idx) => {
      const tags = item.dataset.tags.split(',');
      const primaryTag = tags[0];
      const detail = DETAILS[primaryTag] || DETAILS.banking;

      const expandDiv = document.createElement('div');
      expandDiv.className = 'tl-item-expand';
      expandDiv.innerHTML = `<div class="tl-expand-content">${detail}</div>`;
      item.appendChild(expandDiv);

      item.addEventListener('click', () => {
        const isOpen = expandDiv.classList.contains('open');
        tlWrap.querySelectorAll('.tl-item-expand.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) expandDiv.classList.add('open');
      });

      // Start hidden for entrance animation
      if (!RM) {
        item.classList.add('tl-hidden');
        item.style.transitionDelay = (idx % 4) * 0.08 + 's';
      }
    });

    // Year navigator (desktop only)
    const yearNav = document.createElement('div');
    yearNav.className = 'tl-year-nav'; yearNav.id = 'tlYearNav';
    const years = new Set();
    items.forEach(item => {
      const yr = item.querySelector('.tl-yr');
      if (yr) years.add(yr.textContent.trim());
    });
    [...years].forEach(y => {
      const pip = document.createElement('div');
      pip.className = 'tl-year-pip'; pip.textContent = y; pip.dataset.year = y;
      pip.addEventListener('click', () => {
        const target = [...items].find(i => i.querySelector('.tl-yr')?.textContent.trim() === y);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      yearNav.appendChild(pip);
    });
    document.body.appendChild(yearNav);

    // ─── SCROLL OBSERVER: entrance + active + glow line + year nav ───
    let scrollRAF = null;
    function onScroll() {
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(() => {
        scrollRAF = null;
        const wrapRect = tlWrap.getBoundingClientRect();
        const viewH = window.innerHeight;

        // Is timeline in view?
        const inView = wrapRect.top < viewH && wrapRect.bottom > 0;
        yearNav.classList.toggle('show', inView && !isMobile);

        if (!inView) return;

        // Glow line progress
        const progress = Math.max(0, Math.min(1,
          (viewH - wrapRect.top) / (wrapRect.height + viewH)
        ));
        glowLine.style.height = (progress * 100) + '%';

        // Per-item checks
        let activeYear = null;
        items.forEach(item => {
          const r = item.getBoundingClientRect();
          const visible = r.top < viewH * 0.85 && r.bottom > viewH * 0.15;
          const centered = r.top < viewH * 0.6 && r.bottom > viewH * 0.4;

          // Entrance
          if (visible && item.classList.contains('tl-hidden')) {
            item.classList.remove('tl-hidden');
            item.classList.add('tl-visible');
          }

          // Active highlight
          item.classList.toggle('tl-active', centered && !item.classList.contains('filtered-out'));

          // Year nav
          if (centered) {
            const yr = item.querySelector('.tl-yr');
            if (yr) activeYear = yr.textContent.trim();
          }
        });

        // Update year nav
        yearNav.querySelectorAll('.tl-year-pip').forEach(p => {
          p.classList.toggle('active', p.dataset.year === activeYear);
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Initial trigger
    setTimeout(onScroll, 600);

    function filterTimeline(tag) {
      document.querySelectorAll('.tl-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === tag));
      items.forEach(item => {
        if (tag === 'all') {
          item.classList.remove('filtered-out');
        } else {
          item.classList.toggle('filtered-out', !item.dataset.tags.split(',').includes(tag));
        }
      });
    }

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

    function scrollTo(sel) { const el = document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
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
