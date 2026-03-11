
// ═══════════════════════════════════════════════════════════════
// SPATIAL UI AUDIO — Web Audio API synthesized sounds
// Unmuted by default. Toggle via terminal: > audio on / audio off
// ═══════════════════════════════════════════════════════════════
(function SpatialAudioModule() {
  'use strict';

  var _lakePref = window._lakePref;

  let ctx = null;
  let masterGain = null;
  let enabled = true;
  let hadUserGesture = false;

  function markGesture() {
    hadUserGesture = true;
    document.removeEventListener('click', markGesture, true);
    document.removeEventListener('touchstart', markGesture, true);
    document.removeEventListener('keydown', markGesture, true);
  }
  document.addEventListener('click', markGesture, { capture: true, once: true });
  document.addEventListener('touchstart', markGesture, { capture: true, once: true });
  document.addEventListener('keydown', markGesture, { capture: true, once: true });

  function getCtx() {
    if (!hadUserGesture) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
      if (ctx) { masterGain = ctx.createGain(); masterGain.connect(ctx.destination); }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, duration, panVal, type, vol) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const pan = c.createStereoPanner();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol || 0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal || 0)), c.currentTime);
    osc.connect(gain).connect(pan).connect(masterGain || c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function sweep(startFreq, endFreq, duration, panVal) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const pan = c.createStereoPanner();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
    gain.gain.setValueAtTime(0.05, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal || 0)), c.currentTime);
    osc.connect(gain).connect(pan).connect(masterGain || c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  const INTERACTIVE = 'button,.tbtn,.lk,.mg-btn,.arcade-card:not(.locked),.always-cta,.gb-emoji-btn,.gb-submit,.swipe-opt,.trophy-btn,.vcb,.term-chat-topic,.sc-row,.si,.conf-badge,.cert-card,.nl,.tl-item,.rt,.share-dl-btn,.tc-cat-btn,.gc-achv,.nft-card,.mp-avatar,.mp-ctx-item,.swipe-card,.pe-cursor,.challenge-hud,.gc-challenge';

  var hoverProfiles = [
    { sel: '.challenge-hud',base:2100, range: 400, wave: 'sine',     dur: 0.03 },
    { sel: '.gc-challenge',base: 1600, range: 500, wave: 'sine',     dur: 0.03 },
    { sel: '.mp-avatar',  base: 2600, range: 500, wave: 'sine',     dur: 0.025 },
    { sel: '.mp-ctx-item',base: 2200, range: 400, wave: 'triangle', dur: 0.025 },
    { sel: '.pe-cursor',  base: 3400, range: 400, wave: 'sine',     dur: 0.02 },
    { sel: '.swipe-opt',  base: 1700, range: 500, wave: 'triangle', dur: 0.03 },
    { sel: '.swipe-card', base: 1300, range: 400, wave: 'sine',     dur: 0.03 },
    { sel: '.gc-achv',    base: 1500, range: 500, wave: 'sine',     dur: 0.035 },
    { sel: '.nft-card',   base: 1900, range: 700, wave: 'triangle', dur: 0.035 },
    { sel: '.conf-badge', base: 1800, range: 600, wave: 'triangle', dur: 0.03 },
    { sel: '.cert-card',  base: 2400, range: 800, wave: 'sine',     dur: 0.03 },
    { sel: '.nl',         base: 1600, range: 400, wave: 'sine',     dur: 0.03 },
    { sel: '.si',         base: 3000, range: 600, wave: 'sine',     dur: 0.025 },
    { sel: '.tl-item',    base: 1400, range: 400, wave: 'triangle', dur: 0.03 },
    { sel: '.rt',         base: 2800, range: 500, wave: 'sine',     dur: 0.025 },
    { sel: '.lk',         base: 2000, range: 600, wave: 'triangle', dur: 0.03 },
    { sel: '.tc-cat-btn', base: 2600, range: 400, wave: 'sine',     dur: 0.025 },
    { sel: '.share-dl-btn',base:3200, range: 400, wave: 'triangle', dur: 0.025 }
  ];

  document.body.addEventListener('mouseenter', (e) => {
    if (!enabled) return;
    const el = e.target.closest(INTERACTIVE);
    if (!el) return;
    const panVal = (e.clientX / window.innerWidth) * 2 - 1;
    const yNorm = 1 - e.clientY / window.innerHeight;
    var prof = null;
    for (var i = 0; i < hoverProfiles.length; i++) {
      if (el.matches(hoverProfiles[i].sel) || el.closest(hoverProfiles[i].sel)) { prof = hoverProfiles[i]; break; }
    }
    if (prof) {
      blip(prof.base + yNorm * prof.range, prof.dur, panVal, prof.wave, 0.04);
    } else {
      blip(2200 + yNorm * 1800, 0.035, panVal, 'sine', 0.05);
    }
  }, true);

  document.body.addEventListener('click', (e) => {
    if (!enabled) return;
    const el = e.target.closest(INTERACTIVE);
    if (!el) return;
    const panVal = (e.clientX / window.innerWidth) * 2 - 1;
    blip(1400, 0.02, panVal, 'square', 0.03);
    setTimeout(() => blip(1800, 0.02, panVal, 'square', 0.03), 25);
  }, true);

  const overlayIds = ['arcadeOverlay','miniGameOverlay','guestbookOverlay','shortcutOverlay','termOverlay','gameOverlay','shareOverlay','viewer3dOverlay','easterEgg'];
  const overlayObs = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target;
      if (!overlayIds.includes(el.id)) continue;
      if (el.classList.contains('show')) sweep(400, 1200, 0.15, 0);
      else sweep(1200, 400, 0.1, 0);
    }
  });
  overlayIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) overlayObs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  setTimeout(() => {
    overlayIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._audioObserved) { el._audioObserved = true; overlayObs.observe(el, { attributes: true, attributeFilter: ['class'] }); }
    });
  }, 5000);

  window._spatialAudio = {
    isEnabled: () => enabled,
    getCtx: getCtx,
    getMaster: () => { getCtx(); return masterGain; },
    playContactUnlock: () => {
      if (!enabled) return;
      blip(392, 0.12, -0.4, 'sine', 0.06);
      setTimeout(() => blip(494, 0.12, -0.2, 'sine', 0.06), 80);
      setTimeout(() => blip(587, 0.12, 0, 'sine', 0.06), 160);
      setTimeout(() => blip(784, 0.16, 0.2, 'sine', 0.07), 260);
      setTimeout(() => { blip(988, 0.22, 0, 'sine', 0.05); sweep(988, 1318, 0.3, 0); }, 380);
    },
    toggle: (on) => {
      enabled = typeof on === 'boolean' ? on : !enabled;
      localStorage.setItem('audio_enabled', enabled ? '1' : '0'); _lakePref('audio_enabled',enabled?'1':'0');
      if (enabled) blip(800, 0.05, 0, 'sine', 0.06);
      return enabled;
    }
  };

  // Audio TermCmd → moved to terminal-commands.js

  // ── Section-reveal tones: unique musical phrase per section ──
  var _revealedSections = {};
  var sectionTones = {
    'hname':          function() { sweep(300, 600, 0.2, 0); setTimeout(function(){ blip(784, 0.08, 0, 'sine', 0.04); }, 200); },
    'pfw':            function() { blip(523, 0.12, 0, 'sine', 0.05); setTimeout(function(){ blip(659, 0.12, 0, 'sine', 0.05); }, 80); setTimeout(function(){ blip(784, 0.15, 0, 'sine', 0.04); }, 160); },
    'rtags':          function() { blip(698, 0.06, -0.3, 'sine', 0.03); setTimeout(function(){ blip(784, 0.06, 0.3, 'sine', 0.03); }, 60); },
    'imp':            function() { blip(262, 0.1, -0.4, 'triangle', 0.04); setTimeout(function(){ blip(330, 0.1, 0, 'triangle', 0.04); }, 70); setTimeout(function(){ blip(392, 0.12, 0.4, 'triangle', 0.04); }, 140); },
    'ticker-wrap':    function() { sweep(600, 400, 0.15, 0); },
    'conf-strip':     function() { blip(440, 0.1, -0.3, 'triangle', 0.05); setTimeout(function(){ blip(554, 0.1, 0, 'triangle', 0.05); }, 70); setTimeout(function(){ blip(659, 0.12, 0.3, 'triangle', 0.04); }, 140); },
    'contactSecret':  function() { blip(277, 0.08, 0, 'triangle', 0.04); setTimeout(function(){ blip(349, 0.08, 0, 'triangle', 0.03); }, 70); },
    'linkCards':      function() { blip(494, 0.08, -0.2, 'triangle', 0.04); setTimeout(function(){ blip(587, 0.08, 0.2, 'triangle', 0.04); }, 65); setTimeout(function(){ blip(740, 0.1, 0, 'triangle', 0.03); }, 130); },
    'secJourney':     function() { blip(294, 0.12, -0.3, 'sine', 0.05); setTimeout(function(){ blip(370, 0.12, 0, 'sine', 0.05); }, 90); setTimeout(function(){ blip(440, 0.14, 0.3, 'sine', 0.04); }, 180); },
    'secCerts':       function() { blip(587, 0.1, 0.2, 'sine', 0.05); setTimeout(function(){ blip(698, 0.1, 0, 'sine', 0.05); }, 90); setTimeout(function(){ blip(880, 0.14, -0.2, 'sine', 0.04); }, 180); },
    'secTestimonials':function() { blip(330, 0.1, 0, 'sine', 0.04); setTimeout(function(){ blip(415, 0.1, -0.2, 'sine', 0.04); }, 80); setTimeout(function(){ blip(494, 0.12, 0.2, 'sine', 0.04); }, 160); },
    'secNewsletters': function() { blip(392, 0.12, -0.2, 'sine', 0.04); setTimeout(function(){ blip(494, 0.12, 0.2, 'sine', 0.04); }, 100); },
    'secContentHub':  function() { blip(349, 0.1, 0, 'triangle', 0.04); setTimeout(function(){ blip(440, 0.1, 0.3, 'triangle', 0.04); }, 80); setTimeout(function(){ blip(523, 0.12, -0.3, 'triangle', 0.04); }, 160); }
  };

  function playSectionTone(id) {
    if (!enabled || _revealedSections[id]) return;
    _revealedSections[id] = true;
    var fn = sectionTones[id];
    if (fn) fn();
  }

  var toneObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) playSectionTone(e.target.id || e.target.className.split(' ')[0]);
    });
  }, { threshold: 0.3 });

  setTimeout(function() {
    ['hname', 'pfw', 'rtags', 'contactSecret', 'secJourney', 'secCerts', 'secTestimonials', 'secNewsletters', 'secContentHub'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) toneObs.observe(el);
    });
    var byClass = { '.imp': 'imp', '.ticker-wrap': 'ticker-wrap', '.conf-strip': 'conf-strip' };
    Object.keys(byClass).forEach(function(sel) {
      var el = document.querySelector(sel);
      if (el) { el.id = el.id || byClass[sel]; toneObs.observe(el); }
    });
    var lkWrap = document.querySelector('.lk');
    if (lkWrap && lkWrap.parentElement) { lkWrap.parentElement.id = lkWrap.parentElement.id || 'linkCards'; toneObs.observe(lkWrap.parentElement); }
  }, 3000);

  // ── Click interaction tones (all unique) ──

  // Profile picture flip — C#5-E5-G#5 bright arpeggio
  var pfCard = document.getElementById('pfw');
  if (pfCard) {
    pfCard.addEventListener('click', function() {
      if (!enabled) return;
      blip(554, 0.06, 0, 'sine', 0.04);
      setTimeout(function() { blip(659, 0.06, 0, 'sine', 0.04); }, 50);
      setTimeout(function() { blip(831, 0.08, 0, 'sine', 0.03); }, 100);
    });
  }

  // Conference badge — E5+A5 triangle pair, spatially panned
  var confStripEl = document.querySelector('.conf-strip');
  if (confStripEl) {
    confStripEl.addEventListener('click', function(e) {
      if (!enabled) return;
      if (e.target.closest('.conf-badge')) {
        var pan = (e.clientX / window.innerWidth) * 2 - 1;
        blip(659, 0.06, pan, 'triangle', 0.04);
        setTimeout(function() { blip(880, 0.08, pan * 0.5, 'triangle', 0.03); }, 60);
      }
    });
  }

  // Certification card — G5+B5 sine pair
  var certGrid = document.getElementById('certGrid');
  if (certGrid) {
    certGrid.addEventListener('click', function(e) {
      if (!enabled) return;
      if (e.target.closest('.cert-card')) {
        var pan = (e.clientX / window.innerWidth) * 2 - 1;
        blip(784, 0.05, pan, 'sine', 0.04);
        setTimeout(function() { blip(988, 0.06, 0, 'sine', 0.03); }, 50);
      }
    });
  }

  // LinkedIn newsletter — C5+E5 warm sine
  var nlFeed = document.getElementById('linkedinFeed');
  if (nlFeed) {
    nlFeed.addEventListener('click', function(e) {
      if (!enabled) return;
      if (e.target.closest('.nl')) {
        blip(523, 0.06, 0, 'sine', 0.04);
        setTimeout(function() { blip(659, 0.07, 0, 'sine', 0.03); }, 60);
      }
    });
  }

  // Content hub tab — A4+C#5 triangle
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.ch-tab')) {
      blip(440, 0.05, 0, 'triangle', 0.04);
      setTimeout(function() { blip(554, 0.06, 0, 'triangle', 0.03); }, 50);
    }
  });

  // Social icons — F#5+A5 quick sparkle
  var srow = document.getElementById('srow');
  if (srow) {
    srow.addEventListener('click', function(e) {
      if (!enabled) return;
      if (e.target.closest('.si')) {
        blip(740, 0.04, (e.clientX / window.innerWidth) * 2 - 1, 'sine', 0.04);
        setTimeout(function() { blip(880, 0.05, 0, 'sine', 0.03); }, 40);
      }
    });
  }

  // Save Contact button — D5+F#5+A5 descending resolve
  var vcBtn = document.getElementById('vcBtn');
  if (vcBtn) {
    vcBtn.addEventListener('click', function() {
      if (!enabled) return;
      blip(587, 0.06, 0, 'triangle', 0.04);
      setTimeout(function() { blip(740, 0.06, 0, 'triangle', 0.04); }, 55);
      setTimeout(function() { blip(880, 0.08, 0, 'triangle', 0.03); }, 110);
    });
  }

  // Link cards (Book, Bilinguals, Calendly) — Bb4+D5 warm pair
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.lk')) {
      blip(466, 0.06, 0, 'triangle', 0.04);
      setTimeout(function() { blip(587, 0.07, 0, 'triangle', 0.03); }, 55);
    }
  });

  // Timeline era items — G4+B4 click
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.tl-item')) {
      blip(392, 0.05, 0, 'sine', 0.03);
      setTimeout(function() { blip(494, 0.06, 0, 'sine', 0.03); }, 45);
    }
  });

  // Testimonial carousel arrows — prev: descending, next: ascending
  setTimeout(function() {
    var tcPrev = document.getElementById('tcPrev');
    var tcNext = document.getElementById('tcNext');
    if (tcPrev) tcPrev.addEventListener('click', function() {
      if (!enabled) return;
      blip(587, 0.05, -0.3, 'sine', 0.03);
      setTimeout(function() { blip(494, 0.06, -0.3, 'sine', 0.03); }, 50);
    });
    if (tcNext) tcNext.addEventListener('click', function() {
      if (!enabled) return;
      blip(494, 0.05, 0.3, 'sine', 0.03);
      setTimeout(function() { blip(587, 0.06, 0.3, 'sine', 0.03); }, 50);
    });
  }, 3000);

  // Testimonial category button — E5 single ping
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.tc-cat-btn')) {
      blip(659, 0.06, 0, 'sine', 0.03);
    }
  });

  // Share platform buttons — Ab5+C6 bright pair
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.share-plat')) {
      blip(831, 0.05, 0, 'sine', 0.03);
      setTimeout(function() { blip(1047, 0.06, 0, 'sine', 0.03); }, 45);
    }
  });

  // Share tab buttons — F5 single click
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.share-tab')) {
      blip(698, 0.05, 0, 'triangle', 0.03);
    }
  });

  // Theme toggle — D6+G5 toggle pair
  var themeBtn = document.getElementById('tbtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      if (!enabled) return;
      blip(1175, 0.04, 0, 'sine', 0.03);
      setTimeout(function() { blip(784, 0.06, 0, 'sine', 0.03); }, 45);
    });
  }

  // Inline blog/article post click — Ab4+Db5 page-turn pair
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('[data-inline-pid]') || e.target.closest('[data-inline-article-slug]')) {
      blip(415, 0.05, 0, 'sine', 0.03);
      setTimeout(function() { blip(554, 0.06, 0, 'sine', 0.03); }, 50);
    }
  });

  // XP footer — Eb5-G5-Bb5 achievement chime
  var xpFooter = document.getElementById('xpFooter');
  if (xpFooter) {
    xpFooter.addEventListener('click', function() {
      if (!enabled) return;
      blip(622, 0.04, 0, 'triangle', 0.03);
      setTimeout(function() { blip(784, 0.04, 0, 'triangle', 0.03); }, 35);
      setTimeout(function() { blip(932, 0.05, 0, 'triangle', 0.03); }, 70);
    });
  }

  // Achievement card click — B4+D#5+F#5 crystalline arpeggio
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var card = e.target.closest('.gc-achv');
    if (!card) return;
    var isLocked = card.classList.contains('locked');
    if (isLocked) {
      blip(330, 0.04, 0, 'triangle', 0.03);
      setTimeout(function() { blip(277, 0.05, 0, 'triangle', 0.03); }, 50);
    } else {
      blip(494, 0.05, 0, 'sine', 0.04);
      setTimeout(function() { blip(622, 0.05, 0, 'sine', 0.03); }, 45);
      setTimeout(function() { blip(740, 0.06, 0, 'sine', 0.03); }, 90);
    }
  });

  // NFT card click — F#5+A#5+C#6 shimmer arpeggio
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var card = e.target.closest('.nft-card');
    if (!card) return;
    blip(740, 0.05, 0, 'triangle', 0.04);
    setTimeout(function() { blip(932, 0.05, 0, 'triangle', 0.03); }, 45);
    setTimeout(function() { blip(1109, 0.06, 0, 'triangle', 0.03); }, 90);
  });

  // Challenge HUD click — different sound for done vs active
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var hud = e.target.closest('.challenge-hud');
    if (!hud) return;
    if (hud.classList.contains('done')) {
      blip(523, 0.05, 0, 'sine', 0.04);
      setTimeout(function() { blip(659, 0.05, 0, 'sine', 0.03); }, 45);
      setTimeout(function() { blip(784, 0.06, 0, 'sine', 0.03); }, 90);
      setTimeout(function() { blip(1047, 0.07, 0, 'sine', 0.03); }, 140);
    } else {
      blip(349, 0.05, 0, 'triangle', 0.04);
      setTimeout(function() { blip(440, 0.06, 0, 'triangle', 0.03); }, 55);
    }
  });

  // Challenge card click — warm chime for done, subtle for active
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var card = e.target.closest('.gc-challenge');
    if (!card) return;
    if (card.classList.contains('done')) {
      blip(659, 0.05, 0, 'sine', 0.04);
      setTimeout(function() { blip(831, 0.05, 0, 'sine', 0.03); }, 50);
      setTimeout(function() { blip(988, 0.06, 0, 'sine', 0.03); }, 100);
    } else {
      blip(440, 0.04, 0, 'triangle', 0.03);
      setTimeout(function() { blip(554, 0.05, 0, 'triangle', 0.03); }, 50);
    }
  });

  // Peer avatar click — E5+G#5 social ping
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    if (e.target.closest('.mp-avatar')) {
      blip(659, 0.05, 0, 'sine', 0.04);
      setTimeout(function() { blip(831, 0.06, 0, 'sine', 0.03); }, 50);
    }
  });

  // Avatar context menu item — D5 resolving click per action
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var item = e.target.closest('.mp-ctx-item');
    if (!item) return;
    var action = item.dataset.action;
    if (action === 'highfive') {
      blip(784, 0.05, 0, 'triangle', 0.04);
      setTimeout(function() { blip(988, 0.05, 0, 'triangle', 0.03); }, 40);
      setTimeout(function() { blip(1175, 0.06, 0, 'triangle', 0.03); }, 80);
    } else if (action === 'whisper') {
      blip(440, 0.06, 0, 'sine', 0.03);
      setTimeout(function() { blip(554, 0.07, 0, 'sine', 0.03); }, 60);
    } else if (action === 'tip') {
      blip(1047, 0.04, 0, 'triangle', 0.03);
      setTimeout(function() { blip(1319, 0.04, 0, 'triangle', 0.03); }, 35);
      setTimeout(function() { blip(1568, 0.05, 0, 'triangle', 0.03); }, 70);
    } else if (action === 'call') {
      sweep(400, 800, 0.15, 0);
      setTimeout(function() { blip(880, 0.06, 0, 'sine', 0.03); }, 160);
    } else if (action === 'hangup') {
      sweep(800, 300, 0.12, 0);
    } else if (action === 'spectate') {
      blip(587, 0.05, -0.3, 'sine', 0.03);
      setTimeout(function() { blip(740, 0.05, 0.3, 'sine', 0.03); }, 50);
    } else {
      blip(587, 0.05, 0, 'sine', 0.03);
    }
  });

  // Swipe quiz option — correct: ascending chime, wrong: descending
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var opt = e.target.closest('.swipe-opt');
    if (!opt) return;
    setTimeout(function() {
      if (opt.classList.contains('correct')) {
        blip(523, 0.05, 0, 'sine', 0.04);
        setTimeout(function() { blip(659, 0.05, 0, 'sine', 0.03); }, 50);
        setTimeout(function() { blip(784, 0.06, 0, 'sine', 0.03); }, 100);
      } else if (opt.classList.contains('wrong')) {
        blip(494, 0.05, 0, 'triangle', 0.03);
        setTimeout(function() { blip(370, 0.06, 0, 'triangle', 0.03); }, 60);
      }
    }, 50);
  });

  // Swipe card drag release — whoosh sweep
  document.addEventListener('click', function(e) {
    if (!enabled) return;
    var card = e.target.closest('.swipe-card');
    if (card && !e.target.closest('.swipe-opt')) {
      blip(349, 0.04, 0, 'triangle', 0.03);
    }
  });
  if(window._registerTeardown) window._registerTeardown(function() { if (ctx) { try { ctx.close(); } catch(e) {} ctx = null; } });
})();
