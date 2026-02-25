// desktop-vision.js — "Iron Man HUD" Spatial Mode for Desktop (Ultra-Advanced)
// MediaPipe HandLandmarker (GPU) + 11-pose gesture classifier + FSM
// + cinematic VFX engine + action dispatcher.
// Detection throttled to ~12fps; canvas drawing + interpolation at 60fps.

(function DesktopVision() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════
  const CDN       = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const DETECT_MS = 1000 / 12;
  const EMA       = 0.25;
  const PINCH_TH  = 0.065;
  const SCROLL_K  = 18;
  const PALM_DEAD = 0.15;

  const CONFIRM_MS  = 450;
  const COOLDOWN_MS = 600;
  const SWIPE_MIN   = 0.12;
  const SWIPE_CD_MS = 500;

  let CYAN, MAGENTA, GOLD;
  let _p = null;

  function pal() {
    const light = document.body.classList.contains('light-mode');
    return light ? {
      bone:'#334155', joint:'#1e40af', tip:'#2563eb', accent:'#3b82f6',
      active:'#d97706', fired:'#059669', faded:'#94a3b8', scan:'#e2e8f0',
      vfx1:'#3b82f6', vfx2:'#7c3aed', warm:'#d97706', glow:3,
    } : {
      bone:'#00f3ff', joint:'#00f3ff', tip:'#e0f7ff', accent:'#00f3ff',
      active:'#ff00ff', fired:'#fbbf24', faded:'rgba(0,243,255,0.4)',
      scan:'#00f3ff', vfx1:'#00f3ff', vfx2:'#ff00ff', warm:'#fbbf24', glow:12,
    };
  }

  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
  ];
  const TIP_IDS  = [4, 8, 12, 16, 20];
  const SECTIONS = ['#pfw','#secJourney','#secCerts','#secTestimonials','#secNewsletters'];

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════
  let active = false, handLander = null, videoEl = null, stream = null;
  let frameId = null, lastDetectT = 0, detecting = false;

  let canvas = null, ctx = null;
  let pipCanvas = null, pipCtx = null;
  let hudEl = null, gestureLabel = '';

  let currentLandmarks = null, targetLandmarks = null;

  // Gesture state
  let currentPose   = 'none';
  let pinchHeld     = false;
  let palmY         = 0.5;
  let currentSection = 0;
  let lastHovered = null;

  // FSM
  let fsmGesture = '', fsmStartT = 0, fsmFiredT = 0;
  let fsmState = 'idle'; // idle | confirming | cooldown
  let fsmProgress = 0;

  // Swipe
  let palmHist = [];
  let swipeCooldown = 0;

  // VFX
  let fxQueue   = [];
  let tipTrails = TIP_IDS.map(() => []);

  // ═══════════════════════════════════════════════════
  // GESTURE CLASSIFIER
  // ═══════════════════════════════════════════════════
  function classifyPose(lm) {
    const pd = Math.hypot(lm[4].x-lm[8].x, lm[4].y-lm[8].y, (lm[4].z||0)-(lm[8].z||0));
    if (pd < PINCH_TH) return 'pinch';

    const tOut = Math.abs(lm[4].x - lm[0].x) > Math.abs(lm[3].x - lm[0].x);
    const iUp  = lm[8].y  < lm[6].y;
    const mUp  = lm[12].y < lm[10].y;
    const rUp  = lm[16].y < lm[14].y;
    const pUp  = lm[20].y < lm[18].y;
    const cnt  = (iUp?1:0)+(mUp?1:0)+(rUp?1:0)+(pUp?1:0);

    if (cnt === 0) {
      if (tOut && lm[4].y < lm[3].y) return 'thumbs_up';
      if (tOut && lm[4].y > lm[2].y) return 'thumbs_down';
      return 'fist';
    }
    if (cnt === 1 && iUp) return tOut ? 'gun' : 'point';
    if (cnt === 2 && iUp && mUp) return 'peace';
    if (cnt === 2 && iUp && pUp) return 'rock';
    if (cnt >= 4) return 'open_palm';

    const total = cnt + (tOut ? 1 : 0);
    if (total >= 1 && total <= 5) return 'count_' + total;
    return 'unknown';
  }

  // ═══════════════════════════════════════════════════
  // GESTURE STATE MACHINE
  // ═══════════════════════════════════════════════════
  function updateFSM(gesture, now) {
    if (fsmState === 'cooldown') {
      if (now - fsmFiredT > COOLDOWN_MS) { fsmState = 'idle'; fsmGesture = ''; }
      fsmProgress = 0;
      return null;
    }
    if (gesture !== fsmGesture) {
      fsmGesture = gesture;
      fsmStartT  = now;
      fsmState   = gesture ? 'confirming' : 'idle';
      fsmProgress = 0;
      return null;
    }
    if (fsmState === 'confirming' && gesture) {
      const held = now - fsmStartT;
      fsmProgress = Math.min(1, held / CONFIRM_MS);
      if (held >= CONFIRM_MS) {
        fsmState   = 'cooldown';
        fsmFiredT  = now;
        fsmProgress = 0;
        return gesture;
      }
    }
    return null;
  }

  function clearFSM() {
    if (fsmState !== 'idle') { fsmState = 'idle'; fsmGesture = ''; fsmProgress = 0; }
  }

  function resetGestureState() {
    clearFSM();
    pinchHeld = false; palmY = 0.5;
    palmHist = [];
    if (lastHovered) { lastHovered.classList.remove('spatial-hover'); lastHovered = null; }
  }

  // ═══════════════════════════════════════════════════
  // ACTION DISPATCHER
  // ═══════════════════════════════════════════════════
  function dispatchAction(gesture, now) {
    const W = canvas ? canvas.width : window.innerWidth;
    const H = canvas ? canvas.height : window.innerHeight;
    const screenPt = (idx) => {
      if (!currentLandmarks || !currentLandmarks[idx]) return null;
      return { x: (1 - currentLandmarks[idx].x) * W, y: currentLandmarks[idx].y * H };
    };

    switch (gesture) {
      case 'fist':
        closeAnyOverlay();
        fxQueue.push({ type: 'screenFlash', startT: now, duration: 300 });
        break;
      case 'peace':
        toggleTheme();
        fxQueue.push({ type: 'screenFlash', startT: now, duration: 400 });
        if (window.UniToast) window.UniToast('Theme toggled via gesture');
        break;
      case 'thumbs_up': {
        if (typeof window.openShare === 'function') window.openShare();
        const tp = screenPt(4);
        if (tp) fxQueue.push({ type: 'starBurst', x: tp.x, y: tp.y, startT: now, duration: 1000 });
        break;
      }
    }
  }

  function toggleTheme() {
    const btn = document.getElementById('tbtn');
    if (btn) btn.click();
  }

  function closeAnyOverlay() {
    const overlays = [
      ['termOverlay','closeTerm'],['gameOverlay','closeGame'],
      ['shareOverlay','closeShare'],['trophyOverlay','closeTrophy'],
      ['shortcutOverlay','closeShortcuts'],['arcadeOverlay','_closeArcade'],
      ['miniGameOverlay','_closeMG'],['cmdPaletteOverlay','_closePalette'],
    ];
    for (const [id, fn] of overlays) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show') && typeof window[fn] === 'function') {
        window[fn](); return;
      }
    }
  }

  function scrollToSection(idx) {
    if (idx < 0 || idx >= SECTIONS.length) return;
    currentSection = idx;
    const el = document.querySelector(SECTIONS[idx]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ═══════════════════════════════════════════════════
  // SWIPE DETECTION
  // ═══════════════════════════════════════════════════
  function detectSwipe(now) {
    if (!currentLandmarks || now < swipeCooldown) return null;
    const p = currentLandmarks[9];
    palmHist.push({ x: p.x, y: p.y, t: now });
    while (palmHist.length > 8) palmHist.shift();
    if (palmHist.length < 4) return null;

    const first = palmHist[0], last = palmHist[palmHist.length - 1];
    const dx = last.x - first.x, dt = last.t - first.t;
    if (dt > 50 && dt < 400 && Math.abs(dx) > SWIPE_MIN) {
      swipeCooldown = now + SWIPE_CD_MS;
      palmHist = [];
      return dx < 0 ? 'swipe_right' : 'swipe_left';
    }
    return null;
  }

  function handleSwipe(dir) {
    if (dir === 'swipe_right')
      currentSection = Math.min(SECTIONS.length - 1, currentSection + 1);
    else
      currentSection = Math.max(0, currentSection - 1);
    scrollToSection(currentSection);
    setHUD(dir === 'swipe_right' ? '👉 Next Section' : '👈 Prev Section');
  }

  // ═══════════════════════════════════════════════════
  // CONTINUOUS GESTURE HANDLERS
  // ═══════════════════════════════════════════════════
  function handleScroll() {
    const palm = currentLandmarks[9];
    palmY += (palm.y - palmY) * EMA;
    const dev = palmY - 0.5;
    if (Math.abs(dev) > PALM_DEAD) {
      const sign = dev > 0 ? 1 : -1;
      const norm = (Math.abs(dev) - PALM_DEAD) / (0.5 - PALM_DEAD);
      window.scrollBy({ top: sign * norm * norm * SCROLL_K, behavior: 'auto' });
    }
  }

  function handlePinch() {
    if (pinchHeld) return;
    pinchHeld = true;
    const lm = currentLandmarks;
    const sx = Math.max(0, Math.min(window.innerWidth,  (1 - (lm[4].x+lm[8].x)/2) * window.innerWidth));
    const sy = Math.max(0, Math.min(window.innerHeight, (lm[4].y+lm[8].y)/2 * window.innerHeight));
    const el = document.elementFromPoint(sx, sy);
    if (el) {
      el.click();
      fxQueue.push({ type: 'pinchPulse', x: sx, y: sy, startT: performance.now(), duration: 500 });
    }
  }

  function handlePoint() {
    const lm = currentLandmarks;
    if (!lm || !lm[8]) return;
    const tipX = (1 - lm[8].x) * window.innerWidth;
    const tipY = lm[8].y * window.innerHeight;
    const el = document.elementFromPoint(
      Math.max(0, Math.min(window.innerWidth - 1, tipX)),
      Math.max(0, Math.min(window.innerHeight - 1, tipY))
    );
    if (el === lastHovered) return;
    if (lastHovered) lastHovered.classList.remove('spatial-hover');
    if (el && el !== canvas && el !== document.body && el !== document.documentElement) {
      el.classList.add('spatial-hover');
      lastHovered = el;
    } else {
      lastHovered = null;
    }
  }

  // ═══════════════════════════════════════════════════
  // FRAME PROCESSING
  // ═══════════════════════════════════════════════════
  const FSM_GESTURES = new Set(['fist', 'peace', 'thumbs_up']);

  function processGestureFrame(now) {
    if (!currentLandmarks) {
      currentPose = 'none';
      resetGestureState();
      setHUD('👁️ Waiting for hand...');
      return;
    }

    currentPose = classifyPose(currentLandmarks);

    const swipe = detectSwipe(now);
    if (swipe) { handleSwipe(swipe); return; }

    if (currentPose !== 'pinch') pinchHeld = false;
    if (currentPose !== 'point' && currentPose !== 'gun' && lastHovered) {
      lastHovered.classList.remove('spatial-hover');
      lastHovered = null;
    }

    switch (currentPose) {
      case 'open_palm': clearFSM(); handleScroll(); break;
      case 'pinch':     clearFSM(); handlePinch();  break;
      case 'point':
      case 'gun':       clearFSM(); handlePoint();  break;
      default: {
        const mapped = currentPose === 'thumbs_down' ? 'fist' : currentPose;
        if (!FSM_GESTURES.has(mapped)) { clearFSM(); break; }
        const action = updateFSM(mapped, now);
        if (action) dispatchAction(action, now);
      }
    }
    updateGestureHUD();
  }

  function updateGestureHUD() {
    const labels = {
      open_palm:'✋ Scroll', fist:'✊ Dismiss', thumbs_down:'✊ Dismiss',
      point:'👆 Hover', gun:'👆 Hover',
      peace:'✌️ Theme', thumbs_up:'👍 Share', pinch:'🤏 Click',
      none:'👁️ Waiting...'
    };
    let label = labels[currentPose] || '';

    if (fsmState === 'confirming' && label)
      label += ' ▓' + Math.round(fsmProgress * 100) + '%';
    else if (fsmState === 'cooldown' && performance.now() - fsmFiredT < 300 && label)
      label += ' ⚡';

    setHUD(label);
  }

  // ═══════════════════════════════════════════════════
  // CAMERA
  // ═══════════════════════════════════════════════════
  async function openCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width:{ideal:640}, height:{ideal:480}, facingMode:'user', frameRate:{max:30} },
        audio: false
      });
    } catch {
      if (window.UniToast) window.UniToast('Camera access denied — spatial nav requires webcam');
      return false;
    }
    videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline','');
    videoEl.muted = true;
    videoEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(videoEl);
    await videoEl.play();
    return true;
  }

  function closeCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (videoEl) { videoEl.remove(); videoEl = null; }
  }

  // ═══════════════════════════════════════════════════
  // MEDIAPIPE INIT
  // ═══════════════════════════════════════════════════
  async function initMediaPipe() {
    const V  = await import(CDN + '/vision_bundle.mjs');
    const fs = await V.FilesetResolver.forVisionTasks(CDN + '/wasm');
    handLander = await V.HandLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 1
    });
  }

  // ═══════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════
  function createUI() {
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
    hudEl.textContent = 'Initializing...';
    document.body.appendChild(hudEl);

    window.addEventListener('resize', onResize);
  }

  function removeUI() {
    canvas?.remove(); canvas = null; ctx = null;
    pipCanvas?.remove(); pipCanvas = null; pipCtx = null;
    hudEl?.remove(); hudEl = null;
    window.removeEventListener('resize', onResize);
    gestureLabel = '';
  }

  function onResize() {
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  }

  function setHUD(label) {
    if (label === gestureLabel) return;
    gestureLabel = label;
    if (hudEl) {
      hudEl.textContent = label;
      hudEl.style.visibility = label ? 'visible' : 'hidden';
    }
  }

  // ═══════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════
  function startLoop() {
    function tick() {
      if (!active) return;
      frameId = requestAnimationFrame(tick);
      const now = performance.now();

      if (!detecting && handLander && videoEl && videoEl.readyState >= 2 && now - lastDetectT >= DETECT_MS) {
        lastDetectT = now; detecting = true;
        runDetection(now);
      }

      drawPiP();
      interpolateLandmarks();
      processGestureFrame(now);
      drawFrame(now);
    }
    tick();
  }

  function runDetection(ts) {
    try {
      const r = handLander.detectForVideo(videoEl, ts);
      if (r.landmarks && r.landmarks.length > 0) {
        targetLandmarks = r.landmarks[0];
        if (!currentLandmarks) currentLandmarks = targetLandmarks.map(p => ({x:p.x,y:p.y,z:p.z}));
      } else { targetLandmarks = null; currentLandmarks = null; }
    } catch { /* dropped */ }
    detecting = false;
  }

  function interpolateLandmarks() {
    if (!currentLandmarks || !targetLandmarks) return;
    for (let i = 0; i < currentLandmarks.length && i < targetLandmarks.length; i++) {
      currentLandmarks[i].x += (targetLandmarks[i].x - currentLandmarks[i].x) * EMA;
      currentLandmarks[i].y += (targetLandmarks[i].y - currentLandmarks[i].y) * EMA;
      currentLandmarks[i].z += ((targetLandmarks[i].z||0) - currentLandmarks[i].z) * EMA;
    }
  }

  function drawPiP() {
    if (!pipCtx || !videoEl || videoEl.readyState < 2) return;
    pipCtx.save(); pipCtx.scale(-1,1);
    pipCtx.drawImage(videoEl, -160, 0, 160, 120);
    pipCtx.restore();
  }

  // ═══════════════════════════════════════════════════
  // DRAW FRAME — orchestrates skeleton + VFX
  // ═══════════════════════════════════════════════════
  function drawFrame(now) {
    if (!ctx || !canvas) return;
    _p = pal();
    CYAN = _p.vfx1; MAGENTA = _p.vfx2; GOLD = _p.warm;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!currentLandmarks || !targetLandmarks) {
      drawScanLines(W, H);
      drawFXQueue(now, W, H);
      if (tipTrails[0].length) tipTrails = TIP_IDS.map(() => []);
      return;
    }

    const pts = currentLandmarks.map(p => ({ x:(1-p.x)*W, y:p.y*H, z:p.z }));
    updateTipTrails(pts);

    drawSkeleton(pts);
    drawTipTrails();
    drawGestureVFX(pts, W, H, now);

    if (fsmState === 'confirming') drawConfirmRing(pts, fsmProgress);

    drawFXQueue(now, W, H);
  }

  // ═══════════════════════════════════════════════════
  // SKELETON DRAWING — theme-aware, cohesive
  // ═══════════════════════════════════════════════════
  function getSkeletonColor() {
    if (fsmState === 'confirming') return _p.active;
    if (fsmState === 'cooldown' && performance.now() - fsmFiredT < 200) return _p.fired;
    if (fsmState === 'cooldown') return _p.faded;
    return _p.bone;
  }

  function drawSkeleton(pts) {
    const color = getSkeletonColor();

    // Connections — single batched pass
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = _p.glow;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [a, b] of CONNECTIONS) {
      if (!pts[a] || !pts[b]) continue;
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();
    ctx.restore();

    // Joints — unified palette, tips distinguished by size
    ctx.save();
    ctx.fillStyle = _p.joint;
    ctx.shadowColor = _p.joint;
    ctx.shadowBlur = _p.glow * 0.6;
    for (let i = 0; i < pts.length; i++) {
      const r = TIP_IDS.includes(i) ? 4.5 : 2.5;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Fingertip inner accent
    ctx.save();
    ctx.fillStyle = _p.tip;
    ctx.shadowColor = _p.tip;
    ctx.shadowBlur = _p.glow;
    ctx.globalAlpha = 0.6;
    for (const i of TIP_IDS) {
      if (!pts[i]) continue;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Palm center ring
    if (pts[9]) {
      ctx.save();
      ctx.strokeStyle = _p.accent;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = _p.accent;
      ctx.shadowBlur = _p.glow * 0.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(pts[9].x, pts[9].y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawScanLines(W, H) {
    ctx.save();
    ctx.strokeStyle = _p.scan;
    ctx.lineWidth = 1;
    ctx.globalAlpha = _p.glow > 6 ? 0.04 : 0.07;
    ctx.beginPath();
    for (let y = 0; y < H; y += 4) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // FINGERTIP TRAILS
  // ═══════════════════════════════════════════════════
  function updateTipTrails(pts) {
    for (let i = 0; i < TIP_IDS.length; i++) {
      const p = pts[TIP_IDS[i]];
      if (!p) continue;
      tipTrails[i].push({ x: p.x, y: p.y });
      if (tipTrails[i].length > 8) tipTrails[i].shift();
    }
  }

  function drawTipTrails() {
    ctx.save();
    ctx.fillStyle = _p.accent;
    for (const trail of tipTrails) {
      for (let j = 0; j < trail.length - 1; j++) {
        ctx.globalAlpha = (j + 1) / trail.length * 0.3;
        ctx.beginPath();
        ctx.arc(trail[j].x, trail[j].y, 1.5 + (j / trail.length) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // GESTURE VFX ENGINE
  // ═══════════════════════════════════════════════════
  function drawGestureVFX(pts, W, H, now) {
    switch (currentPose) {
      case 'point':
      case 'gun':        vfxLaser(pts, W, H, now);     break;
      case 'fist':
      case 'thumbs_down': vfxGravityWell(pts, now);     break;
      case 'peace':      vfxPeaceParticles(pts, now);   break;
      case 'thumbs_up':  vfxThumbsUpSparkle(pts, now);  break;
      case 'pinch':      vfxPinchIndicator(pts, now);   break;
    }
  }

  // ── Laser Beam (point) ──
  function vfxLaser(pts, W, H, now) {
    const pip = pts[6], tip = pts[8];
    if (!pip || !tip) return;
    const dx = tip.x-pip.x, dy = tip.y-pip.y, len = Math.hypot(dx, dy);
    if (len < 1) return;
    const scale = Math.max(W, H) / len;
    const endX = tip.x + dx*scale, endY = tip.y + dy*scale;

    ctx.save();
    ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
    ctx.shadowColor = CYAN; ctx.shadowBlur = 15; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(endX, endY); ctx.stroke();

    ctx.strokeStyle = _p.tip; ctx.lineWidth = 1;
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(endX, endY); ctx.stroke();

    const t = now * 0.003;
    ctx.fillStyle = CYAN;
    for (let i = 0; i < 8; i++) {
      const f = ((i / 8) + t) % 1;
      ctx.globalAlpha = 0.25 * (1 - f);
      ctx.beginPath(); ctx.arc(tip.x+(endX-tip.x)*f*0.5, tip.y+(endY-tip.y)*f*0.5, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Gravity Well (fist) ──
  function vfxGravityWell(pts, now) {
    const p = pts[9]; if (!p) return;
    const t = now * 0.003;
    ctx.save();
    ctx.strokeStyle = MAGENTA; ctx.shadowColor = MAGENTA;
    for (let i = 0; i < 4; i++) {
      const phase = (t + i * 0.7) % 2;
      const r = 20 + phase * 40;
      ctx.lineWidth = 2; ctx.shadowBlur = 10;
      ctx.globalAlpha = Math.max(0, 1 - phase / 2) * 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.globalAlpha = 0.25;
    for (let a = 0; a < Math.PI*2; a += Math.PI/8) {
      const inner = 15, outer = 50 + Math.sin(t*3 + a*2) * 10;
      ctx.beginPath();
      ctx.moveTo(p.x+Math.cos(a)*inner, p.y+Math.sin(a)*inner);
      ctx.lineTo(p.x+Math.cos(a)*outer, p.y+Math.sin(a)*outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Peace Particles ──
  function vfxPeaceParticles(pts, now) {
    const a = pts[8], b = pts[12];
    if (!a || !b) return;
    const t = now * 0.005;
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const f = (t + i * 0.12) % 1;
      const x = a.x + (b.x-a.x)*f, y = a.y + (b.y-a.y)*f;
      const hue = (f * 360 + t * 50) % 360;
      ctx.fillStyle = `hsl(${hue},100%,60%)`;
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Thumbs Up Sparkle ──
  function vfxThumbsUpSparkle(pts, now) {
    const p = pts[4]; if (!p) return;
    const t = now * 0.003;
    ctx.save();
    ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
    for (let i = 0; i < 6; i++) {
      const phase = (t + i * 0.35) % 2;
      const y = p.y - phase * 45;
      const x = p.x + Math.sin(t*2 + i) * 10;
      ctx.globalAlpha = Math.max(0, 1 - phase/2) * 0.6;
      ctx.beginPath(); ctx.arc(x, y, 2 + (1-phase/2)*2.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Pinch Indicator ──
  function vfxPinchIndicator(pts, now) {
    if (!pts[4] || !pts[8]) return;
    const cx = (pts[4].x+pts[8].x)/2, cy = (pts[4].y+pts[8].y)/2;
    const pulse = Math.sin(now*0.008)*0.3 + 0.7;
    ctx.save();
    ctx.strokeStyle = MAGENTA; ctx.lineWidth = 2;
    ctx.shadowColor = MAGENTA; ctx.shadowBlur = 20; ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // ── Confirm Ring ──
  function drawConfirmRing(pts, progress) {
    const p = pts[9]; if (!p || progress <= 0) return;
    const r = 30, start = -Math.PI/2, end = start + Math.PI*2*progress;
    ctx.save();
    ctx.strokeStyle = _p.active; ctx.lineWidth = 2.5;
    ctx.shadowColor = _p.active; ctx.shadowBlur = _p.glow; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, start, end); ctx.stroke();
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // FX QUEUE (persistent effects)
  // ═══════════════════════════════════════════════════
  function drawFXQueue(now, W, H) {
    fxQueue = fxQueue.filter(fx => {
      const elapsed = now - fx.startT;
      if (elapsed > fx.duration) return false;
      const p = elapsed / fx.duration;
      switch (fx.type) {
        case 'screenFlash': fxScreenFlash(p, W, H);       break;
        case 'starBurst':   fxStarBurst(fx, p);           break;
        case 'pinchPulse':  fxPinchPulse(fx, p);          break;
      }
      return true;
    });
  }

  function fxScreenFlash(p, W, H) {
    ctx.save();
    ctx.fillStyle = _p.glow > 6 ? '#fff' : '#000';
    ctx.globalAlpha = (1-p) * 0.15;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function fxStarBurst(fx, p) {
    ctx.save();
    const count = 14;
    for (let i = 0; i < count; i++) {
      const ang = (i/count)*Math.PI*2 + fx.startT*0.001;
      const d = p * 90;
      const x = fx.x + Math.cos(ang)*d;
      const y = fx.y + Math.sin(ang)*d - p*50;
      const sz = 3*(1-p);
      ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 10;
      ctx.globalAlpha = (1-p)*0.8;
      ctx.beginPath();
      ctx.moveTo(x, y-sz); ctx.lineTo(x+sz*0.6, y);
      ctx.lineTo(x, y+sz); ctx.lineTo(x-sz*0.6, y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function fxPinchPulse(fx, p) {
    ctx.save();
    ctx.strokeStyle = MAGENTA; ctx.lineWidth = 3*(1-p);
    ctx.shadowColor = MAGENTA; ctx.shadowBlur = 20; ctx.globalAlpha = 1-p;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, 10+p*50, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  // ACTIVATE / DEACTIVATE
  // ═══════════════════════════════════════════════════
  async function activate() {
    if (active) return true;
    createUI();
    setHUD('Requesting camera...');
    if (!(await openCamera())) { removeUI(); return false; }
    setHUD('Loading MediaPipe (~5 MB first time)...');
    try { await initMediaPipe(); } catch (err) {
      setHUD('Error: ' + (err.message || err));
      closeCamera(); setTimeout(removeUI, 4000);
      return false;
    }
    if (!handLander || !videoEl) return false;
    active = true;
    startLoop();
    setHUD('👁️ Waiting for hand...');
    return true;
  }

  function deactivate() {
    active = false;
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    if (handLander) { handLander.close(); handLander = null; }
    closeCamera(); removeUI();
    currentLandmarks = null; targetLandmarks = null;
    resetGestureState();
    fxQueue = [];
    tipTrails = TIP_IDS.map(() => []);
    currentPose = 'none';
  }

  window._spatialVision = { activate, deactivate };
})();
