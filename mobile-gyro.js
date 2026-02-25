// mobile-gyro.js — Advanced "Magic Window" Spatial Mode for Mobile
// DeviceOrientation (gyroscope) + DeviceMotion (accelerometer).
// Tilt-to-scroll, parallax, snap-to-section, shake-to-share,
// face-down theme toggle, compass rotation, and section indicator.
// Zero heat: no camera, no ML — pure sensor math + passive listeners.

(function MobileGyro() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════
  const SCROLL_DEADZONE = 5;
  const SCROLL_MAX_DEG  = 30;
  const SCROLL_SPEED    = 12;
  const PARALLAX_SCALE  = 0.6;
  const SMOOTHING       = 0.12;

  const SNAP_VEL_TH    = 40;     // deg/s threshold for snap detection
  const SNAP_RETURN_MS = 300;    // max ms for snap round-trip
  const SNAP_CD_MS     = 600;
  const SHAKE_TH       = 15;     // m/s² acceleration threshold
  const SHAKE_COUNT    = 3;      // peaks needed
  const SHAKE_WINDOW   = 600;    // ms window
  const SHAKE_CD_MS    = 2000;
  const FACEDOWN_MS    = 800;    // hold face-down this long to toggle theme
  const FACEDOWN_CD_MS = 2000;
  const DTILT_PEAK_TH  = 20;    // deg deviation for double-tilt
  const DTILT_WINDOW   = 500;   // ms between two tilts
  const COMPASS_SCALE  = 0.5;   // vw max compass parallax

  const SECTIONS = ['#pfw','#secJourney','#secCerts','#secTestimonials','#secNewsletters'];

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════
  let active      = false;
  let frameId     = null;
  let permGranted = false;
  let hudEl       = null;
  let motionBtn   = null;
  let sectionIndicator = null;

  // Raw orientation (updated by event listeners)
  let rawAlpha = 0, rawBeta = 0, rawGamma = 0;
  let neutralBeta = 0;
  let smoothBeta = 0, smoothGamma = 0, smoothAlpha = 0;
  let neutralAlpha = 0;

  // Accelerometer (DeviceMotion)
  let accelX = 0, accelY = 0, accelZ = 0;
  let accelBuffer = []; // {x, y, z, t} — last 20 samples

  // Snap detection
  let prevGamma   = 0;
  let snapPeakT   = 0;
  let snapPeakDir = 0; // +1 or -1
  let snapCooldown = 0;

  // Shake detection
  let shakePeaks   = []; // timestamps of acceleration peaks
  let shakeCooldown = 0;

  // Face-down detection
  let faceDownStartT = 0;
  let faceDownCooldown = 0;

  // Double forward tilt (tracks peak→valley→peak cycles)
  let dTiltPeaks   = []; // timestamps of completed peak→valley transitions
  let dTiltCooldown = 0;
  let dTiltInPeak  = false; // currently above threshold

  // Section navigation
  let currentSection = 0;

  // Parallax layers (cached)
  let layerBg = null, layerMid = null, layerFg = null;

  // Intersection observer
  let visibleSections = new Set();
  let observer = null;

  // HUD
  let lastHudText = '';

  // ═══════════════════════════════════════════════════
  // DEVICE ORIENTATION
  // ═══════════════════════════════════════════════════
  function onOrientation(e) {
    if (e.alpha != null) rawAlpha = e.alpha;
    if (e.beta  != null) rawBeta  = e.beta;
    if (e.gamma != null) rawGamma = e.gamma;
  }

  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    accelX = a.x || 0;
    accelY = a.y || 0;
    accelZ = a.z || 0;
    const now = performance.now();
    accelBuffer.push({ x: accelX, y: accelY, z: accelZ, t: now });
    while (accelBuffer.length > 20) accelBuffer.shift();
  }

  async function requestPermission() {
    if (permGranted) return true;
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') { showHUD('Motion denied'); return false; }
      } catch { showHUD('Motion permission failed'); return false; }
    }
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    window.addEventListener('devicemotion', onMotion, { passive: true });
    permGranted = true;
    return true;
  }

  // ═══════════════════════════════════════════════════
  // iOS PERMISSION BUTTON
  // ═══════════════════════════════════════════════════
  function needsPermButton() {
    return typeof DeviceOrientationEvent !== 'undefined' &&
           typeof DeviceOrientationEvent.requestPermission === 'function' &&
           !permGranted;
  }

  function showPermButton() {
    return new Promise(resolve => {
      motionBtn = document.createElement('button');
      motionBtn.className = 'spatial-motion-btn';
      motionBtn.innerHTML = '<i class="fa-solid fa-compass"></i> Enable Motion';
      document.body.appendChild(motionBtn);
      requestAnimationFrame(() => { motionBtn.classList.add('show'); });
      motionBtn.addEventListener('click', async () => {
        const ok = await requestPermission();
        motionBtn.classList.remove('show');
        setTimeout(() => { motionBtn.remove(); motionBtn = null; }, 300);
        resolve(ok);
      }, { once: true });
    });
  }

  // ═══════════════════════════════════════════════════
  // ADVANCED GESTURE DETECTORS
  // ═══════════════════════════════════════════════════

  // Quick snap left/right: sharp gamma velocity spike + return
  function detectSnap(now) {
    if (now < snapCooldown) return null;

    const gammaVel = (rawGamma - prevGamma);
    prevGamma = rawGamma;

    if (Math.abs(gammaVel) > SNAP_VEL_TH / 60) {
      if (snapPeakT === 0) {
        snapPeakT = now;
        snapPeakDir = gammaVel > 0 ? 1 : -1;
      }
    }

    if (snapPeakT > 0 && now - snapPeakT < SNAP_RETURN_MS) {
      if (Math.abs(gammaVel) > SNAP_VEL_TH / 60 &&
          ((gammaVel > 0 ? 1 : -1) !== snapPeakDir)) {
        const dir = snapPeakDir;
        snapPeakT = 0;
        snapCooldown = now + SNAP_CD_MS;
        return dir;
      }
    } else if (snapPeakT > 0 && now - snapPeakT >= SNAP_RETURN_MS) {
      snapPeakT = 0;
    }
    return null;
  }

  // Shake: 3+ acceleration magnitude peaks in 600ms window
  function detectShake(now) {
    if (now < shakeCooldown) return false;
    const mag = Math.sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
    if (mag > SHAKE_TH) {
      if (!shakePeaks.length || now - shakePeaks[shakePeaks.length-1] > 80) {
        shakePeaks.push(now);
      }
    }
    while (shakePeaks.length && now - shakePeaks[0] > SHAKE_WINDOW) shakePeaks.shift();
    if (shakePeaks.length >= SHAKE_COUNT) {
      shakePeaks = [];
      shakeCooldown = now + SHAKE_CD_MS;
      return true;
    }
    return false;
  }

  // Face-down: beta > 150 or < -150 for FACEDOWN_MS
  function detectFaceDown(now) {
    if (now < faceDownCooldown) return false;
    const isFaceDown = Math.abs(rawBeta) > 150;
    if (isFaceDown) {
      if (faceDownStartT === 0) faceDownStartT = now;
      if (now - faceDownStartT >= FACEDOWN_MS) {
        faceDownStartT = 0;
        faceDownCooldown = now + FACEDOWN_CD_MS;
        return true;
      }
    } else {
      faceDownStartT = 0;
    }
    return false;
  }

  // Double forward tilt: two distinct peak→return cycles within 500ms
  function detectDoubleTilt(now) {
    if (now < dTiltCooldown) return false;
    const dev = Math.abs(smoothBeta);
    if (dev > DTILT_PEAK_TH) {
      dTiltInPeak = true;
    } else if (dTiltInPeak && dev < DTILT_PEAK_TH * 0.5) {
      dTiltInPeak = false;
      dTiltPeaks.push(now);
    }
    while (dTiltPeaks.length && now - dTiltPeaks[0] > DTILT_WINDOW) dTiltPeaks.shift();
    if (dTiltPeaks.length >= 2) {
      dTiltPeaks = [];
      dTiltInPeak = false;
      dTiltCooldown = now + 1500;
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════
  // SECTION NAVIGATION
  // ═══════════════════════════════════════════════════
  function scrollToSection(idx) {
    if (idx < 0 || idx >= SECTIONS.length) return;
    currentSection = idx;
    const el = document.querySelector(SECTIONS[idx]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateSectionIndicator();
  }

  function nextSection() {
    scrollToSection(Math.min(SECTIONS.length - 1, currentSection + 1));
  }

  function prevSection() {
    scrollToSection(Math.max(0, currentSection - 1));
  }

  // ═══════════════════════════════════════════════════
  // INTERSECTION OBSERVER
  // ═══════════════════════════════════════════════════
  function initObserver() {
    const sections = document.querySelectorAll(
      '.lk, .cert-card, .tl-item, .tc-section, .conf-strip, .imp, [class*="nd"]'
    );
    if (!sections.length) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      }
    }, { threshold: 0.1 });
    sections.forEach(el => observer.observe(el));
  }

  function destroyObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    visibleSections.clear();
  }

  // ═══════════════════════════════════════════════════
  // PARALLAX
  // ═══════════════════════════════════════════════════
  function cacheLayers() {
    layerBg  = document.querySelector('.spatial-layer-bg');
    layerMid = document.querySelector('.spatial-layer-mid');
    layerFg  = document.querySelector('.spatial-layer-fg');
  }

  function applyParallax(gammaNorm, alphaNorm) {
    if (layerBg)  layerBg.style.transform  = `translate3d(${gammaNorm * PARALLAX_SCALE * -1}vw, 0, 0)`;
    if (layerMid) layerMid.style.transform = `translate3d(${gammaNorm * PARALLAX_SCALE * -0.5}vw, 0, 0)`;
    if (layerFg)  layerFg.style.transform  = `translate3d(${gammaNorm * PARALLAX_SCALE * 0.3}vw, 0, 0)`;

    for (const el of visibleSections) {
      const tx = gammaNorm * 3;
      const ry = alphaNorm * COMPASS_SCALE;
      el.style.transform = `translate3d(${tx}px, 0, 0) rotateY(${ry}deg)`;
    }
  }

  function clearParallax() {
    if (layerBg)  layerBg.style.transform = '';
    if (layerMid) layerMid.style.transform = '';
    if (layerFg)  layerFg.style.transform = '';
    for (const el of visibleSections) el.style.transform = '';
  }

  // ═══════════════════════════════════════════════════
  // HUD + SECTION INDICATOR
  // ═══════════════════════════════════════════════════
  function createHUD() {
    hudEl = document.createElement('div');
    hudEl.className = 'spatial-hud';
    hudEl.textContent = 'Initializing...';
    document.body.appendChild(hudEl);

    sectionIndicator = document.createElement('div');
    sectionIndicator.className = 'spatial-section-indicator';
    document.body.appendChild(sectionIndicator);
    updateSectionIndicator();
  }

  function removeHUD() {
    if (hudEl) { hudEl.remove(); hudEl = null; }
    if (sectionIndicator) { sectionIndicator.remove(); sectionIndicator = null; }
    lastHudText = '';
  }

  function showHUD(text) {
    if (text === lastHudText) return;
    lastHudText = text;
    if (hudEl) hudEl.textContent = text;
  }

  function updateSectionIndicator() {
    if (!sectionIndicator) return;
    let html = '';
    for (let i = 0; i < SECTIONS.length; i++) {
      html += `<span class="spatial-dot${i === currentSection ? ' active' : ''}"></span>`;
    }
    sectionIndicator.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════
  // RENDER LOOP
  // ═══════════════════════════════════════════════════
  function startLoop() {
    function tick() {
      if (!active) return;
      frameId = requestAnimationFrame(tick);
      const now = performance.now();

      // Smooth sensor values
      smoothBeta  += (rawBeta  - neutralBeta - smoothBeta) * SMOOTHING;
      smoothGamma += (rawGamma - smoothGamma) * SMOOTHING;
      smoothAlpha += ((rawAlpha - neutralAlpha) - smoothAlpha) * SMOOTHING * 0.5;

      // ── Advanced gesture detection ──
      const snap = detectSnap(now);
      if (snap) {
        if (snap > 0) nextSection();
        else prevSection();
        showHUD(snap > 0 ? '➡ Next Section' : '⬅ Prev Section');
        return;
      }

      if (detectShake(now)) {
        if (typeof window.openShare === 'function') window.openShare();
        showHUD('📤 Shake → Share!');
        if (window.UniToast) window.UniToast('Shake detected — opening Share');
        return;
      }

      if (detectFaceDown(now)) {
        const btn = document.getElementById('tbtn');
        if (btn) btn.click();
        showHUD('🌓 Face Down → Theme');
        if (window.UniToast) window.UniToast('Theme toggled via face-down');
        return;
      }

      if (detectDoubleTilt(now)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        currentSection = 0;
        updateSectionIndicator();
        showHUD('⬆ Double Tilt → Top');
        return;
      }

      // ── Standard tilt-to-scroll ──
      const absBeta = Math.abs(smoothBeta);
      if (absBeta > SCROLL_DEADZONE) {
        const sign = smoothBeta > 0 ? 1 : -1;
        const norm = Math.min((absBeta - SCROLL_DEADZONE) / (SCROLL_MAX_DEG - SCROLL_DEADZONE), 1);
        window.scrollBy(0, sign * norm * norm * SCROLL_SPEED);
      }

      // ── Parallax (gamma + compass alpha) ──
      const gammaNorm = Math.max(-1, Math.min(1, smoothGamma / 45));
      const alphaNorm = Math.max(-1, Math.min(1, smoothAlpha / 30));
      applyParallax(gammaNorm, alphaNorm);

      // ── HUD ──
      if (absBeta > SCROLL_DEADZONE)
        showHUD(smoothBeta > 0 ? '⬇ Scrolling Down' : '⬆ Scrolling Up');
      else if (Math.abs(smoothGamma) > 3)
        showHUD(smoothGamma > 0 ? '↗ Tilt Right' : '↖ Tilt Left');
      else
        showHUD('📱 Spatial Active');
    }
    tick();
  }

  // ═══════════════════════════════════════════════════
  // ACTIVATE / DEACTIVATE
  // ═══════════════════════════════════════════════════
  async function activate() {
    if (active) return true;
    createHUD();

    if (needsPermButton()) {
      showHUD('Tap button to enable motion');
      const ok = await showPermButton();
      if (!ok) { removeHUD(); return false; }
    } else {
      const ok = await requestPermission();
      if (!ok) { removeHUD(); return false; }
    }

    showHUD('Hold still — calibrating...');
    await new Promise(r => setTimeout(r, 350));
    neutralBeta  = rawBeta;
    neutralAlpha = rawAlpha;
    prevGamma    = rawGamma;

    active = true;
    cacheLayers();
    initObserver();
    startLoop();
    showHUD('📱 Spatial Active');
    return true;
  }

  function deactivate() {
    active = false;
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('devicemotion', onMotion);
    permGranted = false;
    clearParallax();
    destroyObserver();
    removeHUD();
    if (motionBtn) { motionBtn.remove(); motionBtn = null; }
    layerBg = null; layerMid = null; layerFg = null;
    smoothBeta = 0; smoothGamma = 0; smoothAlpha = 0;
    accelBuffer = []; shakePeaks = []; dTiltPeaks = [];
    snapPeakT = 0; faceDownStartT = 0; dTiltInPeak = false;
    currentSection = 0;
  }

  window._spatialGyro = { activate, deactivate };
})();
