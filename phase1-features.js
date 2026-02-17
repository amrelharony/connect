// ═══════════════════════════════════════════════════════════════
// PHASE 1 FEATURES MODULE — amrelharony.com
// Drop-in script: <script src="phase1-features.js" defer></script>
//
// Features:
//   1. Zen Mode (Z key / button) — distraction-free corporate view
//   2. Download PDF Resume (Ctrl+P enhanced / button)
//   3. Surprise Me (R key / floating button) — random section jump
//   4. Section-Aware Emoji Cursor Trail (desktop only)
//
// Zero dependencies — works alongside existing site JS
// ═══════════════════════════════════════════════════════════════
(function PhaseOneFeatures() {
  'use strict';

  // ───────────────────────────────────────────
  // CONSTANTS
  // ───────────────────────────────────────────
  const IS_DESKTOP = window.matchMedia('(pointer:fine)').matches;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ───────────────────────────────────────────
  // INJECT ALL CSS
  // ───────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'phase1-css';
  style.textContent = `

/* ═══════════════════════════════════════════
   1. ZEN MODE
   ═══════════════════════════════════════════ */

/* Kill all visual noise */
body.zen-mode #bgC,
body.zen-mode .mesh,
body.zen-mode .noise,
body.zen-mode .cg,
body.zen-mode .cd,
body.zen-mode .cursor-particle,
body.zen-mode .emoji-particle,
body.zen-mode .sbar,
body.zen-mode .combo-indicator,
body.zen-mode .live-console,
body.zen-mode .xp-footer,
body.zen-mode .streak,
body.zen-mode .toast-container,
body.zen-mode .smart-cta,
body.zen-mode .shake-hint,
body.zen-mode .shake-bar,
body.zen-mode .desk-hint,
body.zen-mode .weather-widget,
body.zen-mode .visitor-count,
body.zen-mode .rec-card,
body.zen-mode #recContainer { display: none !important; }

/* Freeze all decorative animations */
body.zen-mode .ng { animation: none !important; }
body.zen-mode .sd::after { animation: none !important; }
body.zen-mode .pf svg circle { animation: none !important; }
body.zen-mode .tc-auto-fill { animation: none !important; transition: none !important; }
body.zen-mode .pre-fill { box-shadow: none !important; }
body.zen-mode .ticker { animation: tickScroll 120s linear infinite !important; }

/* Remove hover transforms for clean feel */
body.zen-mode .lk:hover,
body.zen-mode .lk:focus-visible { transform: none !important; box-shadow: none !important; }
body.zen-mode .lk .ls,
body.zen-mode .lk .lm { display: none !important; }
body.zen-mode .conf-badge:hover,
body.zen-mode .rt:hover,
body.zen-mode .vcb:hover,
body.zen-mode .si:hover,
body.zen-mode .cert-card:hover,
body.zen-mode .nl:hover,
body.zen-mode .insight-card:hover,
body.zen-mode .trophy-badge:hover .trophy-badge-emoji { transform: none !important; }

/* Keep links interactive but subtle */
body.zen-mode .lk:hover { background: var(--cardH) !important; }
body.zen-mode .nl:hover { background: var(--cardH) !important; color: var(--text) !important; }

/* Zen Banner */
.zen-banner {
  display: none;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent);
  opacity: .5;
  padding: 6px 16px;
  margin-bottom: 12px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  transition: opacity .3s;
}
.zen-banner:hover { opacity: .8; }
body.zen-mode .zen-banner { display: flex; align-items: center; justify-content: center; gap: 6px; }

/* Zen transition overlay */
.zen-flash {
  position: fixed; inset: 0; z-index: 9999;
  background: var(--bg);
  opacity: 0;
  pointer-events: none;
  transition: opacity .4s ease;
}
.zen-flash.active { opacity: 1; }


/* ═══════════════════════════════════════════
   2. PDF RESUME
   ═══════════════════════════════════════════ */

.pdf-resume-btn .pdf-icon { transition: transform .3s cubic-bezier(.16,1,.3,1); }
.pdf-resume-btn:hover .pdf-icon { transform: translateY(2px); }

/* Enhanced print stylesheet */
@media print {
  /* Hide everything non-essential */
  .zen-banner, .surprise-btn, #zenBtn, .pdf-resume-btn,
  #preloader, .noise, .sbar, .cg, .cd, .mesh, #bgC,
  .top-btns, .weather-widget, .toast-container, .combo-indicator,
  .smart-cta, .xp-footer, .live-console, .visitor-count, .streak,
  .foot, #trophyOverlay, #shortcutOverlay, #termOverlay,
  #gameOverlay, #shareOverlay, #easterEgg, canvas,
  .vcb, .rec-card, #recContainer, .surprise-btn,
  #contactSecret, .shake-hint, .desk-hint, .shake-bar,
  .ticker-wrap, .ph, .qb, #linkedinFeed,
  .tc-nav, .tc-counter, .tc-auto-bar, .tc-cats,
  .cursor-particle, .emoji-particle, .conf-strip,
  #greetBar { display: none !important; }

  /* Reset transforms and visibility */
  body { background: #fff !important; color: #000 !important;
         overflow: visible !important; font-size: 11pt !important; }
  .rv, .sa { opacity: 1 !important; transform: none !important; }
  #app { opacity: 1 !important; max-width: 700px; margin: 0 auto; padding: 16px 24px; }
  .print-only { display: block !important; }

  /* Typography reset */
  * { color: #111 !important; border-color: #ddd !important;
      text-shadow: none !important; box-shadow: none !important; }
  .ng { background: none !important; -webkit-background-clip: unset !important;
        color: #111 !important; -webkit-text-fill-color: #111 !important; }
  .hn { font-size: 24pt !important; }
  .vp, .vp strong { color: #333 !important; font-size: 10pt !important; }
  .rt { border-color: #ccc !important; color: #555 !important;
        background: #f5f5f5 !important; font-size: 7pt !important; }
  .st { border-color: #ccc !important; background: #f9f9f9 !important; }
  .imp-num { color: #000 !important; }
  .imp-label { color: #666 !important; }

  /* Profile image smaller */
  .pf { width: 72px !important; height: 72px !important; margin: 12px auto 4px !important; }
  .pf svg { display: none !important; }
  .fb { display: none !important; }

  /* Links as clean cards */
  .lk { border-color: #ddd !important; background: #fafafa !important;
        padding: 10px !important; break-inside: avoid; }
  .lk .ls, .lk .lm { display: none !important; }
  .la { display: none !important; }
  .li { border-color: #ddd !important; background: #f5f5f5 !important; }
  .lt { font-size: 10pt !important; }
  .lsu { font-size: 7pt !important; }

  /* Timeline */
  .tl-item { page-break-inside: avoid; break-inside: avoid; }
  .tl-line { background: #999 !important; }
  .tl-dot { border-color: #999 !important; }
  .tl-yr { color: #000 !important; font-weight: 700; }
  .nd { opacity: 1 !important; }
  .ndt { color: #000 !important; }
  .ndl { background: #999 !important; }

  /* Certs grid — compact 4-column */
  .cert-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 4px !important; }
  .cert-card { padding: 6px 4px !important; break-inside: avoid; page-break-inside: avoid;
               border-color: #ddd !important; background: #fafafa !important; }
  .cert-icon { font-size: 16px !important; }
  .cert-name { font-size: 6pt !important; }
  .cert-name strong { font-size: 7pt !important; }
  .cert-org { font-size: 5pt !important; color: #666 !important; }
  .cert-verify { display: none !important; }

  /* Testimonials — show first 4 in grid */
  .tc-section { page-break-before: always; }
  .tc-viewport { min-height: auto !important; overflow: visible !important; }
  .tc-track { flex-wrap: wrap !important; transform: none !important; gap: 6px !important; }
  .tc-slide { min-width: 47% !important; flex: 0 0 47% !important; }
  .tc-slide:nth-child(n+5) { display: none !important; }
  .tc-card { min-height: auto !important; padding: 8px !important;
             border-color: #ddd !important; background: #fafafa !important; }
  .tc-quote { font-size: 8pt !important; }
  .tc-name { font-size: 8pt !important; }
  .tc-role { font-size: 6pt !important; }
  .tc-avatar { width: 20px !important; height: 20px !important; font-size: 9px !important; }
  .tc-cat-badge { font-size: 5pt !important; }

  /* URLs visible */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 7pt; color: #888 !important; word-break: break-all; }
  a.lk::after, a.cert-card::after, a.nl::after { display: none !important; }

  /* Page setup */
  @page { margin: 1.5cm 1.8cm; size: A4; }
  h1 { page-break-after: avoid; }
}


/* ═══════════════════════════════════════════
   3. SURPRISE ME BUTTON
   ═══════════════════════════════════════════ */

.surprise-btn {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 99;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--sub);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  -webkit-tap-highlight-color: transparent;
}
.surprise-btn:hover,
.surprise-btn:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 4px 20px var(--glow);
  outline: none;
}
.surprise-btn:active { transform: scale(.95); }
.surprise-btn.spinning i {
  animation: surpriseSpin .5s cubic-bezier(.16,1,.3,1);
}
@keyframes surpriseSpin {
  0%   { transform: rotate(0) scale(1); }
  40%  { transform: rotate(200deg) scale(1.3); }
  100% { transform: rotate(360deg) scale(1); }
}

/* Surprise highlight pulse */
.surprise-highlight {
  outline: 2px solid var(--accent) !important;
  outline-offset: 8px !important;
  border-radius: 12px;
  animation: surprisePulse 1.5s ease-out forwards;
}
@keyframes surprisePulse {
  0%   { outline-color: var(--accent); outline-offset: 8px; }
  50%  { outline-color: var(--accent2); outline-offset: 12px; }
  100% { outline-color: transparent; outline-offset: 20px; }
}

/* Tooltip that shows section name */
.surprise-toast {
  position: fixed;
  bottom: 78px;
  right: 16px;
  z-index: 99;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  opacity: 0;
  transform: translateY(8px);
  transition: all .3s cubic-bezier(.16,1,.3,1);
  pointer-events: none;
  white-space: nowrap;
  backdrop-filter: blur(12px);
}
.surprise-toast.show {
  opacity: 1;
  transform: translateY(0);
}

body.zen-mode .surprise-btn { box-shadow: none; }
body.zen-mode .surprise-btn:hover { transform: scale(1.05); }

@media(max-width:600px) {
  .surprise-btn {
    bottom: 14px; right: 12px;
    width: 38px; height: 38px; font-size: 14px;
  }
  .surprise-toast { bottom: 60px; right: 12px; }
}


/* ═══════════════════════════════════════════
   4. EMOJI CURSOR TRAIL
   ═══════════════════════════════════════════ */

/* Replace original dot particles with emojis */
body:not(.zen-mode) .cursor-particle { display: none !important; }

.emoji-particle {
  position: fixed;
  pointer-events: none;
  z-index: 9990;
  user-select: none;
  line-height: 1;
  opacity: 0;
}
`;
  document.head.appendChild(style);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: ZEN MODE
  // ═══════════════════════════════════════════════════

  function initZenMode() {
    const topBtns = document.getElementById('topBtns');
    const themeBtn = document.getElementById('tbtn');
    if (!topBtns || !themeBtn) return;

    // Create zen toggle button
    const zenBtn = document.createElement('button');
    zenBtn.className = 'tbtn';
    zenBtn.id = 'zenBtn';
    zenBtn.setAttribute('aria-label', 'Toggle Zen Mode');
    zenBtn.title = 'Zen Mode (Z)';
    zenBtn.innerHTML = '<i class="fa-solid fa-eye" id="zenIcon"></i>';
    // Insert after theme button
    themeBtn.insertAdjacentElement('afterend', zenBtn);

    // Create zen banner inside #app
    const app = document.getElementById('app');
    if (app) {
      const banner = document.createElement('div');
      banner.className = 'zen-banner';
      banner.id = 'zenBanner';
      banner.innerHTML =
        '<i class="fa-solid fa-eye-slash" style="font-size:10px"></i>' +
        '<span>ZEN MODE — Clean reading view · Press <strong style="color:var(--text)">Z</strong> to exit</span>';
      app.insertBefore(banner, app.firstChild);
    }

    // Create flash overlay for smooth transition
    const flash = document.createElement('div');
    flash.className = 'zen-flash';
    flash.id = 'zenFlash';
    document.body.appendChild(flash);

    // Apply / remove zen mode
    function applyZen(active, animate) {
      const icon = document.getElementById('zenIcon');
      if (animate && !REDUCED_MOTION) {
        // Flash transition
        flash.classList.add('active');
        setTimeout(() => {
          document.body.classList.toggle('zen-mode', active);
          if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
          setTimeout(() => flash.classList.remove('active'), 100);
        }, 200);
      } else {
        document.body.classList.toggle('zen-mode', active);
        if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      }
      localStorage.setItem('zenMode', active ? '1' : '0');

      // Log to console system if available
      const console_el = document.getElementById('liveConsole');
      if (console_el && active) {
        console_el.textContent = '🧘 Zen mode activated — clean reading experience';
      }
    }

    // Restore saved state (no animation on load)
    if (localStorage.getItem('zenMode') === '1') {
      applyZen(true, false);
    }

    // Toggle handler
    zenBtn.addEventListener('click', () => {
      const willActivate = !document.body.classList.contains('zen-mode');
      applyZen(willActivate, true);
      // Award XP
      if (window.VDna) window.VDna.addXp(3);
    });

    // Keyboard: Z
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        zenBtn.click();
      }
    });
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: PDF RESUME
  // ═══════════════════════════════════════════════════

  function initPdfResume() {
    // Find the "Share My Profile" button
    const shareBtn = document.querySelector('button.vcb[onclick="openShare()"]');
    if (!shareBtn) return;

    // Create PDF button
    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'vcb rv pdf-resume-btn';
    pdfBtn.setAttribute('style',
      'background:var(--card);color:var(--text);border:1px solid var(--border);' +
      'margin-bottom:8px;opacity:1;transform:none;');
    pdfBtn.innerHTML =
      '<i class="fa-solid fa-file-pdf pdf-icon"></i>' +
      '<span id="pdfBtnText">Download PDF Resume</span>';
    pdfBtn.addEventListener('click', triggerPdfDownload);

    // Insert before the share button
    shareBtn.insertAdjacentElement('beforebegin', pdfBtn);

    // Inject hidden print-only resume content
    injectPrintResume();

    // Hook into browser's print events for Ctrl+P
    window.addEventListener('beforeprint', () => {
      document.body.classList.add('printing-resume');
    });
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-resume');
      // Reset button state
      const txt = document.getElementById('pdfBtnText');
      const icon = pdfBtn.querySelector('i');
      if (txt) txt.textContent = 'Download PDF Resume';
      if (icon) icon.className = 'fa-solid fa-file-pdf pdf-icon';
      pdfBtn.style.removeProperty('pointer-events');
    });
  }

  function triggerPdfDownload() {
    const btn = document.querySelector('.pdf-resume-btn');
    const txt = document.getElementById('pdfBtnText');
    const icon = btn ? btn.querySelector('i') : null;

    // Visual feedback
    if (txt) txt.textContent = 'Preparing Resume...';
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin pdf-icon';
    if (btn) btn.style.pointerEvents = 'none';

    // Small delay for UI update, then print
    setTimeout(() => {
      document.body.classList.add('printing-resume');
      window.print();
      // afterprint event handles cleanup
    }, 300);
  }

  function injectPrintResume() {
    if (document.getElementById('printResumeContent')) return;

    const content = document.createElement('div');
    content.id = 'printResumeContent';
    content.className = 'print-only';
    content.innerHTML = `
      <div style="margin-top:20px;padding-top:14px;border-top:2px solid #111;">
        <h2 style="font-size:14pt;margin-bottom:6px;font-weight:800;">Professional Summary</h2>
        <p style="font-size:10pt;line-height:1.7;color:#333;margin:0;">
          Results-driven Delivery Lead and Scrum Master with 12+ years in banking and financial
          technology. Doctorate (DBA) in Digital Transformation from Helwan University. Author of
          "The Bilingual Executive" — bridging business and technology leadership. Certified PMP,
          SAFe 6 SM, PSM II, PSPO II, PMI-ACP, ICAgile ATF, and CDMP. 3,240+ mentoring minutes
          on ADPList. Keynote speaker at 7+ industry conferences including Seamless North Africa,
          Africa FinTech Forum, and DevOpsDays Cairo.
        </p>
      </div>
      <div style="margin-top:14px;">
        <h2 style="font-size:14pt;margin-bottom:6px;font-weight:800;">Core Competencies</h2>
        <p style="font-size:9.5pt;color:#333;line-height:1.8;margin:0;">
          Agile Delivery &amp; Scrum · SAFe Framework · Kanban · Data Analytics &amp; Governance ·
          Digital Transformation Strategy · Stakeholder Management · FinTech Innovation ·
          Project &amp; Program Management · Mentoring &amp; Coaching · Team Facilitation ·
          Python · SQL · Jira &amp; Confluence · Process Optimization · Change Management
        </p>
      </div>
      <div style="margin-top:14px;">
        <h2 style="font-size:14pt;margin-bottom:6px;font-weight:800;">Key Achievements</h2>
        <ul style="font-size:9.5pt;line-height:1.9;color:#333;padding-left:18px;margin:0;">
          <li>Championed hybrid Scrum/Kanban framework for the Data &amp; Analytics Division at Banque Misr</li>
          <li>Published "The Bilingual Executive" (print, ebook &amp; AI-narrated audiobook), launched at Greek Campus Cairo</li>
          <li>Founded the "Fintech Bilinguals" professional community in Cairo</li>
          <li>Delivered 3,240+ coaching &amp; mentoring minutes as an ADPList Top Mentor</li>
          <li>Won Banque Misr "Best Learner Award" for continuous professional development</li>
          <li>Earned 20+ professional certifications spanning project management, agile, data, and finance</li>
          <li>Invited panelist and keynote speaker at 7+ regional conferences and summits</li>
        </ul>
      </div>
      <div style="margin-top:14px;">
        <h2 style="font-size:14pt;margin-bottom:6px;font-weight:800;">Contact</h2>
        <p style="font-size:9.5pt;color:#333;margin:0;">
          a.elharony@gmail.com &nbsp;·&nbsp; +201114260806 &nbsp;·&nbsp;
          linkedin.com/in/amrmelharony &nbsp;·&nbsp; amrelharony.com
        </p>
      </div>
    `;

    // Insert before the footer
    const foot = document.querySelector('.foot');
    if (foot && foot.parentElement) {
      foot.parentElement.insertBefore(content, foot);
    }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: SURPRISE ME
  // ═══════════════════════════════════════════════════

  function initSurpriseMe() {
    // Floating button
    const btn = document.createElement('button');
    btn.className = 'surprise-btn';
    btn.id = 'surpriseBtn';
    btn.setAttribute('aria-label', 'Surprise Me — Jump to a random section');
    btn.title = 'Surprise Me! (R)';
    btn.innerHTML = '<i class="fa-solid fa-shuffle"></i>';
    document.body.appendChild(btn);

    // Label toast
    const toast = document.createElement('div');
    toast.className = 'surprise-toast';
    toast.id = 'surpriseToast';
    document.body.appendChild(toast);

    // Target sections
    const SECTIONS = [
      { sel: '.imp',          label: '📊 Impact Numbers',  emoji: '📊' },
      { sel: '.tl-wrap',      label: '🚀 The Journey',     emoji: '🚀' },
      { sel: '#certGrid',     label: '📜 Certifications',  emoji: '📜' },
      { sel: '.tc-section',   label: '⭐ Testimonials',    emoji: '⭐' },
      { sel: '.conf-strip',   label: '🎤 Conferences',     emoji: '🎤' },
      { sel: '#linkedinFeed', label: '📝 Latest Articles',  emoji: '📝' },
      { sel: '.lk',           label: '🔗 Featured Links',  emoji: '🔗' },
    ];

    let lastIdx = -1;
    let toastTimer = null;

    function showSurpriseToast(label) {
      toast.textContent = label;
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function surprise() {
      // Pick random section (avoid repeat)
      let idx;
      let attempts = 0;
      do {
        idx = Math.floor(Math.random() * SECTIONS.length);
        attempts++;
      } while (idx === lastIdx && attempts < 10 && SECTIONS.length > 1);
      lastIdx = idx;

      const section = SECTIONS[idx];
      const el = document.querySelector(section.sel);
      if (!el) return;

      // Spin the button icon
      btn.classList.add('spinning');
      setTimeout(() => btn.classList.remove('spinning'), 500);

      // Show label
      showSurpriseToast(section.label);

      // Smooth scroll with offset
      const rect = el.getBoundingClientRect();
      const y = rect.top + window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

      // Highlight flash
      setTimeout(() => {
        el.classList.add('surprise-highlight');
        setTimeout(() => el.classList.remove('surprise-highlight'), 1500);
      }, 400);

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);

      // XP
      if (window.VDna) window.VDna.addXp(2);
    }

    btn.addEventListener('click', surprise);

    // Keyboard: R (but not when game is open — game uses R for restart)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Skip if any overlay is open
      const overlays = ['gameOverlay', 'termOverlay', 'trophyOverlay', 'shortcutOverlay', 'shareOverlay', 'easterEgg'];
      for (const id of overlays) {
        if (document.getElementById(id)?.classList.contains('show')) return;
      }
      if (e.key === 'r' || e.key === 'R') {
        surprise();
      }
    });
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 4: SECTION-AWARE EMOJI CURSOR TRAIL
  // ═══════════════════════════════════════════════════

  function initEmojiCursor() {
    if (!IS_DESKTOP || REDUCED_MOTION) return;

    // Section → emoji mapping
    const EMOJI_MAP = {
      default:      ['✨', '⚡', '💫', '·'],
      book:         ['📘', '✍️', '📖', '💡'],
      mentor:       ['🎓', '🧠', '💡', '🌱'],
      community:    ['🤝', '🌍', '💬', '🔗'],
      timeline:     ['🚀', '📅', '⏳', '🎯'],
      certs:        ['🎯', '📜', '🏆', '✅'],
      testimonials: ['⭐', '💬', '❤️', '🙌'],
      contact:      ['📧', '🔗', '📱', '💌'],
      articles:     ['📝', '🗞️', '💡', '📰'],
      impact:       ['📊', '🔢', '📈', '💪'],
      conferences:  ['🎤', '🎪', '🌐', '🗣️'],
    };

    // Section detection rules (checked in order, first match wins)
    const SECTION_RULES = [
      { sel: '.lk[href*="bilingual"]',          section: 'book' },
      { sel: '.lk[href*="adplist"]',             section: 'mentor' },
      { sel: '.lk[href*="fintech-bilinguals"]',  section: 'community' },
      { sel: '.tl-wrap, .tl-item',               section: 'timeline' },
      { sel: '#certGrid, .cert-card, .cert-grid',section: 'certs' },
      { sel: '.tc-section, .tc-card',            section: 'testimonials' },
      { sel: '#contactSecret, .sr',              section: 'contact' },
      { sel: '#linkedinFeed, .nl',               section: 'articles' },
      { sel: '.imp, .imp-item',                  section: 'impact' },
      { sel: '.conf-strip, .conf-badge',         section: 'conferences' },
    ];

    let currentSection = 'default';
    let lastEmit = 0;
    const EMIT_INTERVAL = 70; // ms between particles
    const POOL_SIZE = 30;     // reuse DOM elements
    const pool = [];
    let poolIdx = 0;

    // Pre-create particle pool for performance
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('span');
      el.className = 'emoji-particle';
      el.style.willChange = 'transform, opacity';
      document.body.appendChild(el);
      pool.push(el);
    }

    // Track which section the mouse is over
    document.addEventListener('mouseover', (e) => {
      for (const rule of SECTION_RULES) {
        if (e.target.closest(rule.sel)) {
          currentSection = rule.section;
          return;
        }
      }
      currentSection = 'default';
    }, { passive: true });

    // Spawn emoji particles
    document.addEventListener('mousemove', (e) => {
      // Skip in zen mode
      if (document.body.classList.contains('zen-mode')) return;

      const now = Date.now();
      if (now - lastEmit < EMIT_INTERVAL) return;
      lastEmit = now;

      const emojis = EMOJI_MAP[currentSection] || EMOJI_MAP.default;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];

      // Get particle from pool
      const p = pool[poolIdx % POOL_SIZE];
      poolIdx++;

      // Reset
      p.style.transition = 'none';
      p.textContent = emoji;
      p.style.left = e.clientX + 'px';
      p.style.top = e.clientY + 'px';
      p.style.fontSize = (10 + Math.random() * 6) + 'px';
      p.style.opacity = '0.7';
      p.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';

      // Force reflow
      p.offsetHeight; // eslint-disable-line no-unused-expressions

      // Animate out
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 25; // float upward bias
      const rot = (Math.random() - 0.5) * 80;

      requestAnimationFrame(() => {
        p.style.transition = 'all .65s cubic-bezier(.16,1,.3,1)';
        p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.2)`;
        p.style.opacity = '0';
      });
    }, { passive: true });
  }


  // ═══════════════════════════════════════════════════
  // UPDATE KEYBOARD SHORTCUTS OVERLAY
  // ═══════════════════════════════════════════════════

  function updateShortcutsPanel() {
    const panel = document.querySelector('.shortcut-panel');
    if (!panel) return;

    const closeDiv = panel.querySelector('.sc-close');
    if (!closeDiv) return;

    // Add new shortcuts before the close button
    const shortcuts = [
      { key: 'Z', desc: 'Toggle Zen Mode' },
      { key: 'R', desc: 'Surprise Me (random section)' },
    ];

    shortcuts.forEach(sc => {
      // Check if already added
      if (panel.querySelector(`[data-p1-key="${sc.key}"]`)) return;
      const row = document.createElement('div');
      row.className = 'sc-row';
      row.dataset.p1Key = sc.key;
      row.innerHTML = `<span class="sc-key">${sc.key}</span><span class="sc-desc">${sc.desc}</span>`;
      panel.insertBefore(row, closeDiv);
    });
  }


  // ═══════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═══════════════════════════════════════════════════

  function init() {
    initZenMode();
    initPdfResume();
    initSurpriseMe();
    initEmojiCursor();
    updateShortcutsPanel();

    console.log(
      '%c✨ Phase 1 Features Loaded %c Zen Mode · PDF Resume · Surprise Me · Emoji Cursor',
      'background:#00e1ff;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#00e1ff;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  // Wait for DOM + existing scripts to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    // DOM already ready, but wait a tick for the main script's IIFE
    setTimeout(init, 100);
  }

})();
