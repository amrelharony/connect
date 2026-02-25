// spatial-controller.js — Hybrid Spatial Mode Entry Point
// Detects device capabilities and loads the appropriate module:
//   Mobile  → mobile-gyro.js   (DeviceOrientation + IntersectionObserver, zero-heat)
//   Desktop → desktop-vision.js (MediaPipe HandLandmarker + Cyberpunk HUD canvas)

(function SpatialController() {
  'use strict';

  const IS_MOBILE = window.matchMedia('(pointer:coarse)').matches;

  let activeModule = null;
  let activating   = false;
  let moduleLoaded = false;
  let modulePromise = null;

  function loadModule(src) {
    if (modulePromise) return modulePromise;
    modulePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { moduleLoaded = true; resolve(); };
      s.onerror = () => {
        modulePromise = null;
        if (window.UniToast) window.UniToast('Failed to load Spatial module');
        reject(new Error('Script load failed: ' + src));
      };
      document.head.appendChild(s);
    });
    return modulePromise;
  }

  async function activate() {
    if (activeModule || activating) return true;
    activating = true;

    const src = IS_MOBILE ? 'mobile-gyro.js' : 'desktop-vision.js';
    try {
      await loadModule(src);
    } catch { activating = false; return false; }

    const mod = IS_MOBILE ? window._spatialGyro : window._spatialVision;
    if (!mod) {
      activating = false;
      if (window.UniToast) window.UniToast('Spatial module not found');
      return false;
    }

    const ok = await mod.activate();
    activating = false;
    if (ok) {
      activeModule = mod;
      setBtnState(true);
      if (window.UniToast) {
        window.UniToast(IS_MOBILE
          ? 'Spatial Mode active — tilt to navigate'
          : 'Spatial Mode active — use hand gestures');
      }
      if (window.VDna) window.VDna.addXp(15);
    }
    return ok;
  }

  function deactivate() {
    activating = false;
    if (activeModule) {
      activeModule.deactivate();
      activeModule = null;
    }
    setBtnState(false);
  }

  function toggle() {
    if (activeModule) { deactivate(); return false; }
    activate();
    return true;
  }

  function setBtnState(on) {
    const btn = document.getElementById('spatialBtn');
    if (!btn) return;
    btn.classList.toggle('spatial-active', on);
    btn.classList.toggle('active', on);
  }

  // Expose the same global API as the old spatial.js
  window._toggleSpatialNav = toggle;
  window._closeSpatialNav  = deactivate;
  window._isSpatialActive  = () => !!activeModule;
})();
