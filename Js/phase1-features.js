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

  // phase1-css: styles moved to Css/phase1.css



  // ═══════════════════════════════════════════════════
  // FEATURE 1: ZEN MODE
  // ═══════════════════════════════════════════════════

  function initZenMode() {
    const topBtns = document.getElementById('topBtns');
    const themeBtn = document.getElementById('tbtn');
    if (!topBtns || !themeBtn) return;

    const audioBtn = document.getElementById('audioBtn');
    const gbBtn = document.getElementById('guestbookBtn');
    const spatialBtn = document.getElementById('spatialBtn');
    const zenBtn = document.getElementById('zenBtn');

    if (gbBtn) {
      gbBtn.addEventListener('click', () => {
        if (typeof window.openGuestbook === 'function') window.openGuestbook();
      });
    }
    window._syncAudioBtn = function(on) {
      const ai = document.getElementById('audioIcon');
      if (ai) ai.className = on ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      if (audioBtn) { audioBtn.title = on ? 'Sound on (S)' : 'Sound off (S)'; audioBtn.classList.toggle('active', on); }
    };
    if (audioBtn) {
      audioBtn.addEventListener('click', () => { if (window._spatialAudio) { const on = window._spatialAudio.toggle(); window._syncAudioBtn(on); if(window._haptic)window._haptic.toggle(); } });
      setTimeout(() => { audioBtn.style.display = 'flex'; }, 4000);
    }

    if (spatialBtn) {
      spatialBtn.addEventListener('click', () => { loadSpatial().then(() => window._toggleSpatialNav()).catch(_noop); });
    }

    // Create zen banner inside #app
    const app = document.getElementById('app');
    if (app) {
      const banner = document.createElement('div');
      banner.className = 'zen-banner';
      banner.id = 'zenBanner';
      banner.innerHTML =
        '<i class="fa-solid fa-eye-slash" style="font-size:10px"></i>' +
        '<span>ZEN MODE</span>';
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
        flash.classList.add('active');
        setTimeout(() => {
          document.body.classList.toggle('zen-mode', active);
          if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
          zenBtn.classList.toggle('active', active);
          setTimeout(() => flash.classList.remove('active'), 100);
        }, 200);
      } else {
        document.body.classList.toggle('zen-mode', active);
        if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        zenBtn.classList.toggle('active', active);
      }
      localStorage.setItem('zenMode', active ? '1' : '0'); _lakePref('zenMode',active?'1':'0');

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
      if(window._haptic)window._haptic.toggle();
      if (window.VDna) window.VDna.addXp(3);
    });

    // Keyboard: Z (zen), N (spatial nav)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey && !e.altKey) zenBtn.click();
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) spatialBtn.click();
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
  function updateShortcutsPanel() {}


  // ═══════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═══════════════════════════════════════════════════

  function init() {
    initZenMode();
    initEmojiCursor();
    updateShortcutsPanel();

    console.log(
      '%c✨ Phase 1 Features Loaded %c Zen Mode · PDF Resume · Surprise Me · Emoji Cursor',
      'background:#00e1ff;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#00e1ff;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  function boot() {
    if (window._coreReady) init();
    else window.addEventListener('AmrOS:CoreReady', init, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
