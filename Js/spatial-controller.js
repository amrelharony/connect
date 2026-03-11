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
  let _emoWaitIv = null;

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

    const src = IS_MOBILE ? 'Js/mobile-gyro.js' : 'Js/desktop-vision.js';
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
      if (window._haptic) window._haptic.enter();
      if (window.VDna) window.VDna.addXp(15);

      if (!IS_MOBILE && mod.getVideo) {
        const _startEmotion = () => {
          if (window._emotionEngine) {
            try { window._emotionEngine.startFace(mod.getVideo()); } catch (_) {}
          }
        };
        if (window._emotionEngine) {
          _startEmotion();
        } else if (window._loadEmotion) {
          window._loadEmotion().then(_startEmotion).catch(function() {});
        } else {
          _emoWaitIv = setInterval(() => {
            if (window._emotionEngine) { clearInterval(_emoWaitIv); _emoWaitIv = null; _startEmotion(); }
          }, 500);
          setTimeout(() => { clearInterval(_emoWaitIv); _emoWaitIv = null; }, 10000);
        }
      }
    }
    return ok;
  }

  function deactivate() {
    activating = false;
    if (_emoWaitIv) { clearInterval(_emoWaitIv); _emoWaitIv = null; }
    if (activeModule) {
      if (window._haptic) window._haptic.menuClose();
      if (window._emotionEngine) try { window._emotionEngine.stopFace(); } catch (_) {}
      if (window._emotionEngine && window._emotionEngine.destroy) window._emotionEngine.destroy();
      activeModule.deactivate();
      activeModule = null;
    }
    setBtnState(false);
  }

  function toggle() {
    if (activeModule) { deactivate(); return false; }
    return activate();
  }

  function setBtnState(on) {
    const btn = document.getElementById('spatialBtn');
    if (!btn) return;
    btn.classList.toggle('spatial-active', on);
    btn.classList.toggle('active', on);
  }

  window._toggleSpatialNav = toggle;
  window._closeSpatialNav  = deactivate;
  window._isSpatialActive  = () => !!activeModule;
})();
