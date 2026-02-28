// desktop-vision.js — Spatial Mode (3 gestures: pinch·palm·fist)
// MediaPipe HandLandmarker (GPU) · One Euro Filter · Minimal overlay

(function DesktopVision() {
  'use strict';

  const CDN        = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
  const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  const SCROLL_K     = 18;
  const PALM_DEAD    = 0.12;
  const CONFIRM_MS   = 500;
  const COOLDOWN_MS  = 700;
  const CURL_TH      = 1.2;
  const PINCH_IN     = 0.42;   // enter pinch when distance/palm < this
  const PINCH_OUT    = 0.55;   // exit pinch when distance/palm > this (hysteresis)

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
  let fsmS = 'idle', fsmT = 0, fsmF = 0, fsmP = 0;

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

  function fingerCurl(lm, mcp, pip, dip, tip) {
    return (ang(lm[mcp], lm[pip], lm[tip]) + ang(lm[pip], lm[dip], lm[tip])) * 0.5;
  }

  function palmSize(lm) {
    const dx = lm[0].x - lm[9].x, dy = lm[0].y - lm[9].y, dz = (lm[0].z || 0) - (lm[9].z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  }

  function pinchDist(lm) {
    const dx = lm[4].x - lm[8].x, dy = lm[4].y - lm[8].y, dz = (lm[4].z || 0) - (lm[8].z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ── Classifier (3 gestures only) ──
  function classify(lm) {
    const pd = pinchDist(lm) / palmSize(lm);

    // Hysteresis: once in pinch, stay until fingers spread past PINCH_OUT
    if (wasPinch) {
      if (pd < PINCH_OUT) return 'pinch';
      wasPinch = false;
    } else if (pd < PINCH_IN) {
      wasPinch = true;
      return 'pinch';
    }

    const ext =
      (fingerCurl(lm, 5, 6, 7, 8)   > CURL_TH ? 1 : 0) +
      (fingerCurl(lm, 9, 10, 11, 12) > CURL_TH ? 1 : 0) +
      (fingerCurl(lm, 13, 14, 15, 16) > CURL_TH ? 1 : 0) +
      (fingerCurl(lm, 17, 18, 19, 20) > CURL_TH ? 1 : 0);

    if (ext === 0) return 'fist';
    if (ext >= 3)  return 'open_palm';
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

  // ── FSM (fist hold-to-confirm) ──
  function fsmTick(now) {
    if (fsmS === 'cooldown') {
      if (now - fsmF > COOLDOWN_MS) fsmS = 'idle';
      fsmP = 0;
      return false;
    }
    if (pose !== 'fist') { fsmS = 'idle'; fsmP = 0; return false; }
    if (fsmS === 'idle') { fsmS = 'confirming'; fsmT = now; fsmP = 0; return false; }
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
      ['miniGameOverlay', '_closeMG'], ['cmdPaletteOverlay', '_closePalette']
    ];
    for (const [id, fn] of pairs) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show') && typeof window[fn] === 'function') {
        window[fn]();
        return;
      }
    }
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

  // ── Frame processing ──
  function process(now) {
    if (!cur) {
      pose = 'none'; pinchFired = false; wasPinch = false; palmY = 0.5;
      hist.length = 0; stable = 'none';
      fsmS = 'idle'; fsmP = 0; fsmT = 0; fsmF = 0;
      hud('\u{1F441}\uFE0F Show your hand\u2026');
      return;
    }

    const raw = classify(cur);
    pose = raw === 'pinch' ? 'pinch' : accumulate(raw);

    if (pose !== 'pinch') pinchFired = false;

    if (pose === 'pinch')     { doPinch();  hud('\u{1F90F} Click'); }
    else if (pose === 'open_palm') { doScroll(); hud('\u270B Scroll'); }
    else if (pose === 'fist') {
      if (fsmTick(now)) closeOverlay();
      hud(fsmP > 0 ? '\u270A ' + Math.round(fsmP * 100) + '%' : '\u270A Dismiss');
    }
    else { fsmS = 'idle'; fsmP = 0; hud('\u{1F441}\uFE0F Waiting\u2026'); }
  }

  // ── Detection ──
  function detect(ts) {
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
    if (!cur) return;

    const light = document.body.classList.contains('light-mode');
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

    // Fist confirm arc
    if (fsmP > 0) {
      ctx.save();
      ctx.strokeStyle = light ? '#d97706' : '#ff00ff'; ctx.lineWidth = 2.5;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = glow; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(pts[9].x, pts[9].y, 26, -1.5708, -1.5708 + 6.283 * fsmP);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── HUD ──
  function hud(t) {
    if (t === hudTxt) return;
    hudTxt = t;
    if (hudEl) { hudEl.textContent = t; hudEl.style.visibility = t ? 'visible' : 'hidden'; }
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
    hudEl = null; hudTxt = '';
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
    closeCam(); killUI();
    cur = null; tgt = null; prev = null;
    pose = 'none'; pinchFired = false; wasPinch = false; palmY = 0.5;
    hist.length = 0; stable = 'none';
    fsmS = 'idle'; fsmP = 0; fsmT = 0; fsmF = 0;
    resetF();
  }

  window._spatialVision = { activate, deactivate, getVideo: function() { return videoEl; } };
})();
