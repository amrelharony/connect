// desktop-vision.js — Spatial Mode (full gesture + face control)
// MediaPipe HandLandmarker (GPU) · One Euro Filter · Cyberpunk overlay

(function DesktopVision() {
  'use strict';

  const CDN        = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
  const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  const SCROLL_K     = 18;
  const PALM_DEAD    = 0.12;
  const CONFIRM_MS   = 500;
  const COOLDOWN_MS  = 700;
  const CURL_TH      = 2.0;
  const PINCH_IN     = 0.42;
  const PINCH_OUT    = 0.55;
  const SWIPE_FRAMES = 10;
  const SWIPE_VEL    = 0.035;
  const FACE_IDLE_MS = 1500;     // switch to face mode after this long with no hand
  const BLINK_TH     = 0.35;
  const MOUTH_TH     = 0.4;
  const GAZE_TH      = 0.15;
  const GAZE_SCROLL  = 8;

  const CONNS = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
  ];

  // ── One Euro Filter ──
  class OEF {
    constructor(freq, mc, beta) {
      this.f = freq; this.mc = mc || 1.0; this.b = beta || 0.007;
      this.dc = 1.0; this.xp = null; this.dp = 0;
    }
    _a(c) { const t = 1 / (2 * Math.PI * c); return 1 / (1 + t * this.f); }
    run(x) {
      if (this.xp === null) { this.xp = x; return x; }
      const dx = (x - this.xp) * this.f;
      const ad = this._a(this.dc);
      const ed = ad * dx + (1 - ad) * this.dp;
      this.dp = ed;
      const a = this._a(this.mc + this.b * Math.abs(ed));
      return (this.xp = a * x + (1 - a) * this.xp);
    }
    reset() { this.xp = null; this.dp = 0; }
  }

  // ── State ──
  let active = false, lander = null, videoEl = null, stream = null;
  let frameId = null, lastDT = 0, busy = false;
  let canvas = null, ctx = null, hudEl = null, hudTxt = '';
  let pipCanvas = null, pipCtx = null;
  let cur = null, tgt = null, prev = null;
  let fX = [], fY = [], fZ = [], vel = [];

  let pose = 'none', wasPinch = false, pinchFired = false, palmY = 0.5;
  let hist = [], stable = 'none';
  let fsmS = 'idle', fsmT = 0, fsmF = 0, fsmP = 0, fsmGesture = 'none';

  // Point hover
  let hoverEl = null;

  // Swipe detection
  let swipeHist = [], lastSwipeTime = 0;

  // Face mode
  let lastHandTime = 0, faceMode = false;
  let wasBlinking = false, blinkCount = 0, lastBlinkTime = 0;
  let mouthWasOpen = false, mouthOpenTime = 0;
  let faceBlinkFlash = 0, faceGazeDir = 0, faceGazeStr = 0, faceMouthProg = 0;

  const SECTIONS = ['.pf', '.tl-wrap', '#certGrid', '.tc-section', '.conf-strip', '#linkedinFeed', '.imp'];

  const HW = navigator.hardwareConcurrency || 4;
  let detectMs = HW >= 8 ? 1000 / 15 : HW >= 4 ? 1000 / 10 : 1000 / 6;

  function initF() {
    fX = []; fY = []; fZ = []; vel = [];
    for (let i = 0; i < 21; i++) {
      fX.push(new OEF(15, 1.0, 0.007));
      fY.push(new OEF(15, 1.0, 0.007));
      fZ.push(new OEF(15, 1.0, 0.01));
      vel.push({ x: 0, y: 0 });
    }
  }
  function resetF() {
    for (let i = 0; i < fX.length; i++) { fX[i].reset(); fY[i].reset(); fZ[i].reset(); }
  }

  // ── Geometry helpers ──
  function ang(a, b, c) {
    const bax = a.x - b.x, bay = a.y - b.y, baz = (a.z || 0) - (b.z || 0);
    const bcx = c.x - b.x, bcy = c.y - b.y, bcz = (c.z || 0) - (b.z || 0);
    const dot = bax * bcx + bay * bcy + baz * bcz;
    const la = Math.sqrt(bax * bax + bay * bay + baz * baz);
    const lc = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz);
    return Math.acos(Math.max(-1, Math.min(1, dot / (la * lc + 1e-9))));
  }

  function palmSize(lm) {
    const dx = lm[0].x - lm[9].x, dy = lm[0].y - lm[9].y, dz = (lm[0].z || 0) - (lm[9].z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  }

  function pinchDist(lm) {
    const dx = lm[4].x - lm[8].x, dy = lm[4].y - lm[8].y, dz = (lm[4].z || 0) - (lm[8].z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ── Finger state helpers ──
  function isExt(lm, mcp, pip, dip) {
    return ang(lm[mcp], lm[pip], lm[dip]) > CURL_TH;
  }

  function thumbExt(lm) {
    const dx = lm[4].x - lm[2].x, dy = lm[4].y - lm[2].y, dz = (lm[4].z || 0) - (lm[2].z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz) > palmSize(lm) * 0.5;
  }

  // ── Classifier (full gesture set) ──
  function classify(lm) {
    const pd = pinchDist(lm) / palmSize(lm);

    if (wasPinch) {
      if (pd < PINCH_OUT) return 'pinch';
      wasPinch = false;
    } else if (pd < PINCH_IN) {
      wasPinch = true;
      return 'pinch';
    }

    const idx = isExt(lm, 5, 6, 7);
    const mid = isExt(lm, 9, 10, 11);
    const rng = isExt(lm, 13, 14, 15);
    const pnk = isExt(lm, 17, 18, 19);
    const tmb = thumbExt(lm);
    const ext = (idx?1:0) + (mid?1:0) + (rng?1:0) + (pnk?1:0);

    if (ext === 0 && !tmb) return 'fist';
    if (ext === 0 && tmb)  return lm[4].y < lm[2].y ? 'thumbs_up' : 'thumbs_down';
    if (tmb && !idx && !mid && !rng && pnk) return 'shaka';
    if (idx && !mid && !rng && !pnk && !tmb) return 'point';
    if (idx && mid && !rng && !pnk) return 'peace';
    if (idx && !mid && !rng && pnk) return 'rock';
    if (ext >= 3) return 'open_palm';
    return 'none';
  }

  // ── Accumulator (3-frame, fast) ──
  function accumulate(raw) {
    hist.push(raw);
    if (hist.length > 3) hist.shift();
    const c = {};
    let tw = 0;
    for (let i = 0; i < hist.length; i++) {
      const w = i + 1;
      c[hist[i]] = (c[hist[i]] || 0) + w;
      tw += w;
    }
    let best = '', bestW = 0;
    for (const k in c) { if (c[k] > bestW) { bestW = c[k]; best = k; } }
    const ratio = bestW / tw;
    if (best === stable) return stable;
    if (ratio >= 0.55) { stable = best; return stable; }
    return stable;
  }

  // ── FSM (hold-to-confirm for action gestures) ──
  const HOLD_GESTURES = new Set(['fist','peace','thumbs_up','thumbs_down','rock','shaka']);

  function fsmTick(now, gesture) {
    if (fsmS === 'cooldown') {
      if (now - fsmF > COOLDOWN_MS) fsmS = 'idle';
      fsmP = 0;
      return false;
    }
    if (!HOLD_GESTURES.has(gesture)) { fsmS = 'idle'; fsmP = 0; fsmGesture = 'none'; return false; }
    if (gesture !== fsmGesture) { fsmS = 'confirming'; fsmT = now; fsmP = 0; fsmGesture = gesture; return false; }
    if (fsmS === 'idle') { fsmS = 'confirming'; fsmT = now; fsmP = 0; fsmGesture = gesture; return false; }
    const elapsed = now - fsmT;
    fsmP = Math.min(1, elapsed / CONFIRM_MS);
    if (elapsed >= CONFIRM_MS) {
      fsmS = 'cooldown'; fsmF = now; fsmP = 0;
      return true;
    }
    return false;
  }

  // ── Actions ──
  function closeOverlay() {
    const pairs = [
      ['termOverlay', 'closeTerm'], ['gameOverlay', 'closeGame'],
      ['shareOverlay', 'closeShare'], ['trophyOverlay', 'closeTrophy'],
      ['shortcutOverlay', 'closeShortcuts'], ['arcadeOverlay', '_closeArcade'],
      ['miniGameOverlay', '_closeMG'], ['cmdPaletteOverlay', '_closePalette'],
      ['easterEgg', 'closeEgg'], ['guestbookOverlay', '_closeGuestbook']
    ];
    for (const [id, fn] of pairs) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show') && typeof window[fn] === 'function') {
        window[fn]();
        return;
      }
    }
  }

  function executeAction(gesture) {
    switch (gesture) {
      case 'fist':        closeOverlay(); break;
      case 'peace':       if (window.TermCmds && window.TermCmds.theme) window.TermCmds.theme(); break;
      case 'thumbs_up':   if (window.openShare) window.openShare(); break;
      case 'thumbs_down': if (window.openGuestbook) window.openGuestbook(); break;
      case 'rock':        if (window.TermCmds && window.TermCmds.matrix) window.TermCmds.matrix(); break;
      case 'shaka':
        if (window._toggleVoice) window._toggleVoice();
        if (window._spatialAudio) { const on = window._spatialAudio.toggle(); if (window._syncAudioBtn) window._syncAudioBtn(on); }
        break;
    }
    if (window._haptic) window._haptic.confirm();
  }

  // ── Point hover ──
  function doPointHover() {
    const sx = Math.max(0, Math.min(window.innerWidth - 1, (1 - cur[8].x) * window.innerWidth));
    const sy = Math.max(0, Math.min(window.innerHeight - 1, cur[8].y * window.innerHeight));
    const el = document.elementFromPoint(sx, sy);
    let next = null;
    if (el && el !== canvas && el !== document.body && el !== document.documentElement) {
      next = el.closest('a, button, [onclick], .lk, .tbtn, .conf-badge, .cert-card, .nl, .vcb');
    }
    if (next === hoverEl) return;
    if (hoverEl) hoverEl.classList.remove('spatial-hover');
    if (next) next.classList.add('spatial-hover');
    hoverEl = next;
  }

  function clearHover() { if (hoverEl) { hoverEl.classList.remove('spatial-hover'); hoverEl = null; } }

  // ── Swipe detection ──
  function checkSwipe() {
    if (!cur) { swipeHist.length = 0; return null; }
    swipeHist.push(cur[0].x);
    if (swipeHist.length > SWIPE_FRAMES) swipeHist.shift();
    if (swipeHist.length < SWIPE_FRAMES) return null;
    const now = Date.now();
    if (now - lastSwipeTime < 1200) return null;
    const delta = swipeHist[swipeHist.length - 1] - swipeHist[0];
    if (Math.abs(delta) > SWIPE_VEL * SWIPE_FRAMES) {
      lastSwipeTime = now; swipeHist.length = 0;
      return delta > 0 ? 'left' : 'right';
    }
    return null;
  }

  function doSwipe(dir) {
    const vh = window.innerHeight;
    let ci = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      const el = document.querySelector(SECTIONS[i]);
      if (el && el.getBoundingClientRect().top < vh * 0.5) ci = i;
    }
    const ni = dir === 'left' ? Math.max(0, ci - 1) : Math.min(SECTIONS.length - 1, ci + 1);
    const t = document.querySelector(SECTIONS[ni]);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window._haptic) window._haptic.tap();
  }

  // ── Face mode ──
  function processFace() {
    const fd = window._lastFaceData;
    if (!fd) { faceGazeDir = 0; faceGazeStr = 0; faceMouthProg = 0; return; }

    // Face tilt scroll — tilt head down = scroll down, tilt head up = scroll up
    // Blendshapes track eye gaze which compensates opposite to head tilt, so invert
    const lookUp = (fd.lookUpL + fd.lookUpR) * 0.5;
    const lookDown = (fd.lookDownL + fd.lookDownR) * 0.5;
    if (lookUp > GAZE_TH) {
      const str = Math.min(1, (lookUp - GAZE_TH) / 0.25);
      window.scrollBy({ top: GAZE_SCROLL * str * str * 3, behavior: 'auto' });
      faceGazeDir = 1; faceGazeStr = str;
    } else if (lookDown > GAZE_TH) {
      const str = Math.min(1, (lookDown - GAZE_TH) / 0.25);
      window.scrollBy({ top: -GAZE_SCROLL * str * str * 3, behavior: 'auto' });
      faceGazeDir = -1; faceGazeStr = str;
    } else { faceGazeDir = 0; faceGazeStr = 0; }

    // Double blink click — either eye triggers, more responsive
    const blink = Math.max(fd.blinkL, fd.blinkR);
    if (blink > BLINK_TH && !wasBlinking) {
      wasBlinking = true;
      faceBlinkFlash = 1;
      const now = Date.now();
      if (now - lastBlinkTime < 800) {
        blinkCount++;
        if (blinkCount >= 2) {
          const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          const el = document.elementFromPoint(cx, cy);
          if (el) synthClick(el, cx, cy);
          blinkCount = 0;
          faceBlinkFlash = 2;
          if (window._haptic) window._haptic.tap();
        }
      } else { blinkCount = 1; }
      lastBlinkTime = now;
    } else if (blink < 0.15) { wasBlinking = false; }

    // Mouth open → theme toggle (hold 1s)
    if (fd.jawOpen > MOUTH_TH) {
      if (!mouthWasOpen) { mouthWasOpen = true; mouthOpenTime = Date.now(); }
      else {
        const elapsed = Date.now() - mouthOpenTime;
        faceMouthProg = Math.min(1, elapsed / 1000);
        if (elapsed > 1000) {
          if (window.TermCmds && window.TermCmds.theme) window.TermCmds.theme();
          mouthWasOpen = false; mouthOpenTime = 0; faceMouthProg = 0;
          if (window._haptic) window._haptic.toggle();
        }
      }
    } else { mouthWasOpen = false; faceMouthProg = 0; }
  }

  function synthClick(el, x, y) {
    const o = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }

  function doPinch() {
    if (pinchFired) return;
    pinchFired = true;
    const mx = (cur[4].x + cur[8].x) * 0.5;
    const my = (cur[4].y + cur[8].y) * 0.5;
    const sx = Math.max(0, Math.min(window.innerWidth - 1, (1 - mx) * window.innerWidth));
    const sy = Math.max(0, Math.min(window.innerHeight - 1, my * window.innerHeight));
    const el = document.elementFromPoint(sx, sy);
    if (el && el !== canvas && el !== document.body && el !== document.documentElement) {
      synthClick(el, sx, sy);
    }
  }

  function doScroll() {
    palmY += (cur[9].y - palmY) * 0.25;
    const d = palmY - 0.5;
    if (Math.abs(d) > PALM_DEAD) {
      const n = (Math.abs(d) - PALM_DEAD) / (0.5 - PALM_DEAD);
      window.scrollBy({ top: (d > 0 ? 1 : -1) * n * n * SCROLL_K, behavior: 'auto' });
    }
  }

  // ── Gesture label map ──
  const GESTURE_HUD = {
    pinch: '\u{1F90F} Click', open_palm: '\u270B Scroll', fist: '\u270A Dismiss',
    point: '\u{1F446} Hover', peace: '\u270C\uFE0F Theme', thumbs_up: '\u{1F44D} Share',
    thumbs_down: '\u{1F44E} Guestbook', rock: '\u{1F918} Matrix', shaka: '\u{1F919} Mic + Sound'
  };

  // ── Frame processing ──
  function process(now) {
    // Face mode when hand not detected
    if (!cur) {
      clearHover();
      pose = 'none'; pinchFired = false; wasPinch = false; palmY = 0.5;
      hist.length = 0; stable = 'none';
      fsmS = 'idle'; fsmP = 0; fsmT = 0; fsmF = 0; fsmGesture = 'none';
      swipeHist.length = 0;

      if (!lastHandTime) lastHandTime = now;
      if (now - lastHandTime > FACE_IDLE_MS && window._lastFaceData) {
        if (!faceMode) { faceMode = true; }
        processFace();
        hud('\u{1F441}\uFE0F Face Mode');
      } else {
        hud('\u{1F441}\uFE0F Show your hand\u2026');
      }
      return;
    }

    lastHandTime = now;
    if (faceMode) { faceMode = false; blinkCount = 0; wasBlinking = false; mouthWasOpen = false; faceBlinkFlash = 0; faceGazeDir = 0; faceMouthProg = 0; }

    const raw = classify(cur);
    pose = raw === 'pinch' ? 'pinch' : accumulate(raw);
    if (pose !== 'pinch') pinchFired = false;

    // Swipe detection (runs alongside other gestures)
    const swipe = checkSwipe();
    if (swipe) { doSwipe(swipe); hud(swipe === 'left' ? '\u{1F448} Prev Section' : '\u{1F449} Next Section'); return; }

    // Continuous gestures
    if (pose === 'pinch')     { clearHover(); doPinch(); hud('\u{1F90F} Click'); return; }
    if (pose === 'open_palm') { clearHover(); doScroll(); hud('\u270B Scroll'); return; }
    if (pose === 'point')     { doPointHover(); hud('\u{1F446} Hover'); return; }

    // Hold-to-confirm action gestures
    if (HOLD_GESTURES.has(pose)) {
      clearHover();
      if (fsmTick(now, pose)) executeAction(pose);
      const label = GESTURE_HUD[pose] || pose;
      hud(fsmP > 0 ? label + ' ' + Math.round(fsmP * 100) + '%' : label);
      return;
    }

    clearHover();
    fsmS = 'idle'; fsmP = 0; fsmGesture = 'none';
    hud('\u{1F441}\uFE0F Waiting\u2026');
  }

  // ── Detection ──
  function detect(ts) {
    if (!active || !lander || !videoEl) { busy = false; return; }
    const t0 = performance.now();
    try {
      const r = lander.detectForVideo(videoEl, Math.round(ts));
      if (r.landmarks && r.landmarks.length) {
        let conf = 1;
        if (r.handedness && r.handedness[0] && r.handedness[0][0]) conf = r.handedness[0][0].score;
        if (conf >= 0.6) {
          prev = tgt;
          tgt = r.landmarks[0];
          if (!cur) { cur = tgt.map(p => ({ x: p.x, y: p.y, z: p.z || 0 })); initF(); }
          for (let i = 0; i < 21; i++) {
            const sx = fX[i].run(tgt[i].x);
            const sy = fY[i].run(tgt[i].y);
            const sz = fZ[i].run(tgt[i].z || 0);
            if (prev && prev[i]) { vel[i].x = sx - prev[i].x; vel[i].y = sy - prev[i].y; }
            tgt[i] = { x: sx, y: sy, z: sz };
          }
        } else { tgt = null; cur = null; prev = null; resetF(); }
      } else { tgt = null; cur = null; prev = null; resetF(); }
    } catch { tgt = null; cur = null; prev = null; resetF(); }
    const ms = performance.now() - t0;
    if (ms > 100) detectMs = 1000 / 6;
    else if (ms < 30) detectMs = 1000 / 15;
    busy = false;
  }

  // ── Lerp between detections ──
  function lerp(now) {
    if (!cur || !tgt) return;
    const dt = (now - lastDT) / 1000;
    for (let i = 0; i < 21; i++) {
      const tx = tgt[i].x + vel[i].x * dt * 15;
      const ty = tgt[i].y + vel[i].y * dt * 15;
      cur[i].x += (tx - cur[i].x) * 0.5;
      cur[i].y += (ty - cur[i].y) * 0.5;
      cur[i].z += (tgt[i].z - cur[i].z) * 0.5;
    }
  }

  // ── Draw ──
  function draw(now) {
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const light = document.body.classList.contains('light-mode');

    // Face mode overlay
    if (faceMode && !cur) {
      drawFaceOverlay(now, W, H, light);
      return;
    }
    if (!cur) return;

    const col = light ? '#1e40af' : '#00f3ff';
    const glow = light ? 2 : 8;
    const pts = cur.map(p => ({ x: (1 - p.x) * W, y: p.y * H }));

    // Skeleton
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
    ctx.shadowColor = col; ctx.shadowBlur = glow; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [a, b] of CONNS) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); }
    ctx.stroke();
    ctx.restore();

    // Joints
    ctx.save();
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = glow * 0.4;
    for (let i = 0; i < 21; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 2, 0, 6.283); ctx.fill(); }
    ctx.restore();

    // Pinch ring
    if (pose === 'pinch') {
      const cx = (pts[4].x + pts[8].x) * 0.5, cy = (pts[4].y + pts[8].y) * 0.5;
      ctx.save();
      ctx.strokeStyle = light ? '#7c3aed' : '#ff00ff'; ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.7 + Math.sin(now * 0.01) * 0.15;
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 6.283); ctx.stroke();
      ctx.restore();
    }

    // Point cursor dot
    if (pose === 'point') {
      ctx.save();
      ctx.fillStyle = light ? '#2563eb' : '#00ff88'; ctx.globalAlpha = 0.8;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(pts[8].x, pts[8].y, 6, 0, 6.283); ctx.fill();
      ctx.restore();
    }

    // Hold-to-confirm arc (all action gestures)
    if (fsmP > 0) {
      const colors = { fist:'#ff00ff', peace:'#22c55e', thumbs_up:'#3b82f6', thumbs_down:'#f59e0b', rock:'#ef4444', shaka:'#06b6d4' };
      const arcCol = colors[fsmGesture] || (light ? '#d97706' : '#ff00ff');
      ctx.save();
      ctx.strokeStyle = arcCol; ctx.lineWidth = 2.5;
      ctx.shadowColor = arcCol; ctx.shadowBlur = glow; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(pts[9].x, pts[9].y, 26, -1.5708, -1.5708 + 6.283 * fsmP);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Face mode overlay drawing ──
  function drawFaceOverlay(now, W, H, light) {
    const cx = 60, cy = H * 0.5;
    const accent = light ? '#1e40af' : '#00f3ff';
    const glow = light ? 3 : 10;
    const pulse = 0.4 + Math.sin(now * 0.003) * 0.15;

    // Central reticle ring (breathing animation)
    ctx.save();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.shadowColor = accent; ctx.shadowBlur = glow;
    ctx.globalAlpha = pulse;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, 36, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Eye icon in center
    ctx.save();
    ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse + 0.2;
    ctx.fillText('\u{1F441}\uFE0F', cx, cy);
    ctx.restore();

    // "FACE MODE" label under reticle
    ctx.save();
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.globalAlpha = 0.5 + Math.sin(now * 0.004) * 0.1;
    ctx.letterSpacing = '1.5px';
    ctx.fillText('FACE MODE', cx, cy + 52);
    ctx.restore();

    // Gaze direction chevrons
    if (faceGazeDir !== 0) {
      const gazeCol = light ? '#2563eb' : '#22d3ee';
      const a = 0.3 + faceGazeStr * 0.6;
      const dir = faceGazeDir;
      ctx.save();
      ctx.strokeStyle = gazeCol; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = gazeCol; ctx.shadowBlur = glow;
      for (let i = 0; i < 3; i++) {
        const offset = (dir < 0 ? -70 - i * 14 : 70 + i * 14);
        const fade = a * (1 - i * 0.25);
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + offset);
        ctx.lineTo(cx, cy + offset + dir * 8);
        ctx.lineTo(cx + 10, cy + offset);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Blink flash ring
    if (faceBlinkFlash > 0) {
      const isClick = faceBlinkFlash >= 2;
      const blinkCol = isClick ? (light ? '#7c3aed' : '#ff00ff') : (light ? '#6366f1' : '#a78bfa');
      const r = isClick ? 28 : 22;
      ctx.save();
      ctx.strokeStyle = blinkCol; ctx.lineWidth = isClick ? 3 : 2;
      ctx.shadowColor = blinkCol; ctx.shadowBlur = isClick ? 18 : 10;
      ctx.globalAlpha = faceBlinkFlash >= 2 ? 0.9 : 0.7;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
      if (isClick) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = blinkCol;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
      }
      ctx.restore();
      faceBlinkFlash *= 0.92;
      if (faceBlinkFlash < 0.05) faceBlinkFlash = 0;
    }

    // Mouth open progress arc
    if (faceMouthProg > 0) {
      const mCol = light ? '#d97706' : '#f59e0b';
      ctx.save();
      ctx.strokeStyle = mCol; ctx.lineWidth = 2.5;
      ctx.shadowColor = mCol; ctx.shadowBlur = glow; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(cx, cy + 80, 14, -1.5708, -1.5708 + 6.283 * faceMouthProg);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.7;
      ctx.fillText('\u{1F444}', cx, cy + 80);
      ctx.restore();
    }

  }

  // ── HUD (merged hand gesture + mood) ──
  var lastMood = '';
  function hud(t) {
    var moodStr = '';
    var curMood = '';
    if (window._emotionEngine) {
      var m = window._emotionEngine.getMood();
      if (m && m.source === 'face' && m.mood) {
        curMood = m.mood;
        var MOOD_DOTS = { warm:'#fbbf24', focused:'#6366f1', surprised:'#a855f7', calm:'#2dd4bf', melancholy:'#60a5fa', serene:'#94a3b8', intense:'#ef4444', neutral:'#8a95a8', playful:'#f472b6', determined:'#f59e0b', curious:'#34d399' };
        var dotColor = MOOD_DOTS[m.mood] || '#8a95a8';
        moodStr = ' <span class="shud-sep">\u00b7</span> <span class="shud-dot" style="background:' + dotColor + '"></span> ' + m.mood;
      }
    }
    if (t === hudTxt && curMood === lastMood) return;
    hudTxt = t;
    lastMood = curMood;
    if (!hudEl) return;
    hudEl.innerHTML = t + moodStr;
    hudEl.style.visibility = t ? 'visible' : 'hidden';
  }

  // ── UI ──
  function makeUI() {
    canvas = document.createElement('canvas');
    canvas.className = 'spatial-overlay';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    pipCanvas = document.createElement('canvas');
    pipCanvas.className = 'spatial-pip';
    pipCanvas.width = 160; pipCanvas.height = 120;
    document.body.appendChild(pipCanvas);
    pipCtx = pipCanvas.getContext('2d');

    hudEl = document.createElement('div');
    hudEl.className = 'spatial-hud';
    document.body.appendChild(hudEl);
    const onResize = () => { if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } };
    window.addEventListener('resize', onResize);
    canvas._onResize = onResize;
  }

  function killUI() {
    if (canvas) { window.removeEventListener('resize', canvas._onResize); canvas.remove(); }
    canvas = null; ctx = null;
    if (pipCanvas) pipCanvas.remove();
    pipCanvas = null; pipCtx = null;
    if (hudEl) hudEl.remove();
    hudEl = null; hudTxt = ''; lastMood = '';
  }

  // ── Camera ──
  async function cam() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user', frameRate: { max: 30 } },
        audio: false
      });
    } catch { if (window.UniToast) window.UniToast('Camera denied'); return false; }
    videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', '');
    videoEl.muted = true;
    videoEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(videoEl);
    await videoEl.play();
    return true;
  }

  function closeCam() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (videoEl) { videoEl.remove(); videoEl = null; }
  }

  // ── PiP camera preview ──
  function drawPiP() {
    if (!pipCtx || !videoEl || videoEl.readyState < 2) return;
    pipCtx.save();
    pipCtx.scale(-1, 1);
    pipCtx.drawImage(videoEl, -160, 0, 160, 120);
    pipCtx.restore();
  }

  // ── Main loop ──
  function loop() {
    function tick() {
      if (!active) return;
      frameId = requestAnimationFrame(tick);
      const now = performance.now();
      if (!busy && lander && videoEl && videoEl.readyState >= 2 && now - lastDT >= detectMs) {
        lastDT = now; busy = true; detect(now);
      }
      lerp(now);
      process(now);
      draw(now);
      drawPiP();
    }
    tick();
  }

  // ── Activate / Deactivate ──
  async function activate() {
    if (active) return true;
    makeUI();
    hud('Requesting camera\u2026');
    if (!(await cam())) { killUI(); return false; }
    hud('Loading hand model\u2026');
    try {
      const V = await import(CDN + '/vision_bundle.mjs');
      const fs = await V.FilesetResolver.forVisionTasks(CDN + '/wasm');
      lander = await V.HandLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.7, minHandPresenceConfidence: 0.7, minTrackingConfidence: 0.6
      });
    } catch (e) {
      hud('Error: ' + (e.message || e));
      closeCam(); setTimeout(killUI, 3000);
      return false;
    }
    initF(); active = true; loop();
    hud('\u{1F441}\uFE0F Show your hand\u2026');
    return true;
  }

  function deactivate() {
    active = false;
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    if (lander) { lander.close(); lander = null; }
    closeCam(); killUI(); clearHover();
    cur = null; tgt = null; prev = null;
    pose = 'none'; pinchFired = false; wasPinch = false; palmY = 0.5;
    hist.length = 0; stable = 'none';
    fsmS = 'idle'; fsmP = 0; fsmT = 0; fsmF = 0; fsmGesture = 'none';
    swipeHist.length = 0; lastSwipeTime = 0;
    lastHandTime = 0; faceMode = false;
    wasBlinking = false; blinkCount = 0; lastBlinkTime = 0;
    mouthWasOpen = false; mouthOpenTime = 0;
    faceBlinkFlash = 0; faceGazeDir = 0; faceGazeStr = 0; faceMouthProg = 0;
    resetF();
  }

  window._spatialVision = { activate, deactivate, getVideo: function() { return videoEl; } };
})();
