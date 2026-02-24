// spatial.js — Spatial Navigation Controller
// Lazy-loaded from site.js. Uses MediaPipe via spatial-worker.js for
// eye-gaze scrolling and hand-gesture game/UI control.

(function SpatialNav() {
  'use strict';

  // ── Config ──
  const FRAME_MS  = 1000 / 15;  // 15 fps capture
  const EMA       = 0.3;        // Exponential moving average smoothing
  const GAZE_DEAD = 0.15;       // ±15% center dead zone for gaze scroll
  const SWIPE_MIN = 0.08;       // Min displacement (normalized) for swipe
  const SWIPE_CD  = 350;        // Cooldown between swipes (ms)
  const PINCH_TH  = 0.06;       // Thumb-index distance for pinch-click
  const SCROLL_K  = 14;         // Scroll speed multiplier

  // ── State ──
  let active      = false;
  let worker      = null;
  let videoEl     = null;
  let stream      = null;
  let frameId     = null;
  let workerBusy  = false;
  let lastFrameT  = 0;

  // Gesture accumulators
  let gazeY        = 0.5;
  let palmHist     = [];
  let swipeCdUntil = 0;
  let pinchHeld    = false;
  let gestureLabel = '';

  // DOM refs
  let pipCanvas = null;
  let pipCtx    = null;
  let hudEl     = null;

  // ═══════════════════════════════════════════════════
  // CAMERA
  // ═══════════════════════════════════════════════════
  async function openCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user', frameRate: { max: 30 } },
        audio: false
      });
    } catch (_) {
      if (window.UniToast) window.UniToast('Camera access denied — spatial nav requires webcam');
      return false;
    }
    videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', '');
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
  // WORKER LIFECYCLE
  // ═══════════════════════════════════════════════════
  function initWorker() {
    return new Promise((resolve, reject) => {
      try { worker = new Worker('spatial-worker.js', { type: 'module' }); }
      catch (e) { return reject(e); }

      const timeout = setTimeout(() => reject(new Error('Model load timeout (45s)')), 45000);

      worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
          clearTimeout(timeout);
          worker.onmessage = onWorkerResult;
          resolve();
        } else if (e.data.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(e.data.msg));
        }
      };
      worker.onerror = (err) => { clearTimeout(timeout); reject(err); };
      worker.postMessage({ type: 'init' });
    });
  }

  function onWorkerResult(e) {
    workerBusy = false;
    if (e.data.type === 'result') processGestures(e.data.face, e.data.hands);
  }

  function destroyWorker() {
    if (worker) { worker.terminate(); worker = null; }
    workerBusy = false;
  }

  // ═══════════════════════════════════════════════════
  // FRAME LOOP
  // ═══════════════════════════════════════════════════
  function startLoop() {
    function tick() {
      if (!active) return;
      frameId = requestAnimationFrame(tick);

      const now = performance.now();
      if (now - lastFrameT < FRAME_MS) return;
      lastFrameT = now;

      if (!videoEl || videoEl.readyState < 2) return;
      drawPiP();

      if (!workerBusy && worker) {
        workerBusy = true;
        createImageBitmap(videoEl).then(bmp => {
          if (!active || !worker) { bmp.close(); workerBusy = false; return; }
          worker.postMessage({ type: 'frame', bitmap: bmp, timestamp: now }, [bmp]);
        }).catch(() => { workerBusy = false; });
      }
    }
    tick();
  }

  // ═══════════════════════════════════════════════════
  // GESTURE ENGINE
  // ═══════════════════════════════════════════════════
  function processGestures(face, hands) {
    const now     = performance.now();
    const hasHand = hands?.length > 0;

    // ── Eye Gaze → Page Scroll (suppressed when hand visible) ──
    if (face && !hasHand) {
      gazeY += (face.gazeY - gazeY) * EMA;
      const dev = gazeY - 0.5;

      if (Math.abs(dev) > GAZE_DEAD) {
        const sign = dev > 0 ? 1 : -1;
        const norm = (Math.abs(dev) - GAZE_DEAD) / (0.5 - GAZE_DEAD);
        window.scrollBy({ top: sign * norm * norm * SCROLL_K, behavior: 'auto' });
      }

      setHUD(
        face.blinkL && face.blinkR ? '😑 Blink' :
        Math.abs(gazeY - 0.5) > GAZE_DEAD
          ? (gazeY > 0.5 ? '⬇ Scroll Down' : '⬆ Scroll Up')
          : '👁️ Tracking'
      );
    }

    // ── Hand → Swipe / Pinch ──
    if (hasHand) {
      const h = hands[0];

      // Pinch → click at mapped screen position
      if (h.pinch < PINCH_TH) {
        if (!pinchHeld) {
          pinchHeld = true;
          const sx = Math.max(0, Math.min(window.innerWidth, (1 - h.x) * window.innerWidth));
          const sy = Math.max(0, Math.min(window.innerHeight, h.y * window.innerHeight));
          const el = document.elementFromPoint(sx, sy);
          if (el) { el.click(); setHUD('🤏 Click'); }
        }
        return;
      }
      pinchHeld = false;

      // Swipe detection via displacement over recent frames
      palmHist.push({ x: h.x, y: h.y, t: now });
      if (palmHist.length > 6) palmHist.shift();

      if (palmHist.length >= 3 && now > swipeCdUntil) {
        const first = palmHist[0];
        const dx = h.x - first.x;
        const dy = h.y - first.y;
        const dt = now - first.t;

        if (dt > 50 && dt < 600 && (Math.abs(dx) > SWIPE_MIN || Math.abs(dy) > SWIPE_MIN)) {
          const actions = window._gamepadActions;
          const horiz = Math.abs(dx) > Math.abs(dy);

          if (horiz) {
            if (dx < -SWIPE_MIN) {
              // Camera-mirrored: hand moves left in frame = user swiped right
              if (actions?.right) actions.right();
              else if (actions?.setDir) actions.setDir({ x: 1, y: 0 });
              else clickSwipeOpt(1);
              setHUD('👉 Swipe Right');
            } else {
              if (actions?.left) actions.left();
              else if (actions?.setDir) actions.setDir({ x: -1, y: 0 });
              else clickSwipeOpt(0);
              setHUD('👈 Swipe Left');
            }
          } else {
            if (dy < -SWIPE_MIN) {
              if (actions?.up) actions.up();
              else if (actions?.setDir) actions.setDir({ x: 0, y: -1 });
              else window.scrollBy({ top: -200, behavior: 'smooth' });
              setHUD('⬆ Swipe Up');
            } else {
              if (actions?.down) actions.down();
              else if (actions?.setDir) actions.setDir({ x: 0, y: 1 });
              else window.scrollBy({ top: 200, behavior: 'smooth' });
              setHUD('⬇ Swipe Down');
            }
          }

          swipeCdUntil = now + SWIPE_CD;
          palmHist = [];
        }
      }

      if (gestureLabel === '') setHUD('✋ Hand Detected');
    } else {
      palmHist = [];
      pinchHeld = false;
    }

    if (!face && !hasHand) setHUD('👁️ Waiting...');
  }

  function clickSwipeOpt(idx) {
    const opts = document.querySelectorAll('.swipe-opt');
    if (opts.length) (opts[idx] || opts[0])?.click();
  }

  // ═══════════════════════════════════════════════════
  // UI — PiP Camera Preview + Gesture HUD
  // ═══════════════════════════════════════════════════
  function createUI() {
    pipCanvas = document.createElement('canvas');
    pipCanvas.className = 'spatial-pip';
    pipCanvas.width = 160;
    pipCanvas.height = 120;
    document.body.appendChild(pipCanvas);
    pipCtx = pipCanvas.getContext('2d');

    hudEl = document.createElement('div');
    hudEl.className = 'spatial-hud';
    hudEl.textContent = 'Initializing...';
    document.body.appendChild(hudEl);
  }

  function removeUI() {
    pipCanvas?.remove(); pipCanvas = null; pipCtx = null;
    hudEl?.remove(); hudEl = null;
  }

  function drawPiP() {
    if (!pipCtx || !videoEl) return;
    pipCtx.save();
    pipCtx.scale(-1, 1);
    pipCtx.drawImage(videoEl, -160, 0, 160, 120);
    pipCtx.restore();
  }

  function setHUD(label) {
    if (label === gestureLabel) return;
    gestureLabel = label;
    if (hudEl) hudEl.textContent = label;
  }

  // ═══════════════════════════════════════════════════
  // ACTIVATE / DEACTIVATE
  // ═══════════════════════════════════════════════════
  async function activate() {
    if (active) return true;

    createUI();
    setHUD('Requesting camera...');

    if (!(await openCamera())) { removeUI(); return false; }

    setHUD('Loading MediaPipe models (~10 MB first time)...');
    try {
      await initWorker();
    } catch (err) {
      setHUD('Error: ' + (err.message || err));
      destroyWorker();
      closeCamera();
      setTimeout(removeUI, 4000);
      return false;
    }

    if (!worker || !videoEl) return false;
    active = true;
    startLoop();
    setHUD('👁️ Tracking');

    document.getElementById('spatialBtn')?.classList.add('spatial-active');
    if (window.UniToast) window.UniToast('Spatial Nav active — look up/down to scroll, swipe to control');
    if (window.VDna) window.VDna.addXp(15);

    return true;
  }

  function deactivate() {
    active = false;
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    destroyWorker();
    closeCamera();
    removeUI();

    gazeY = 0.5;
    palmHist = [];
    pinchHeld = false;
    gestureLabel = '';

    document.getElementById('spatialBtn')?.classList.remove('spatial-active');
  }

  function toggle() {
    if (active) { deactivate(); return false; }
    activate();
    return true;
  }

  // ── Expose globals ──
  window._toggleSpatialNav = toggle;
  window._closeSpatialNav  = deactivate;
  window._isSpatialActive  = () => active;
})();
