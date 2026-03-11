// compute-pressure.js — Infrastructure SLA Management
// Uses the W3C Compute Pressure API (Chrome 115+) with rAF frame-timing
// fallback. Monitors device thermal/CPU load and dynamically degrades
// expensive UI features to maintain 60fps SLA.
//
// Applies body classes: perf-fair | perf-serious | perf-critical
// Dispatches CustomEvent 'computepressure' on window for JS modules.

(function ComputePressure() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════
  const IDX = { nominal: 0, fair: 1, serious: 2, critical: 3 };

  const FPS_NOMINAL = 52;
  const FPS_FAIR    = 38;
  const FPS_SERIOUS = 24;

  const ESCALATE_AFTER   = 3;
  const DEESCALATE_AFTER = 8;

  const CHECK_MS   = 2000;
  const WARMUP_MS  = 6000;
  const FPS_WINDOW = 40;

  // Console styles
  const S = {
    hdr: 'color:#00f3ff;font-weight:bold;font-size:11px;text-shadow:0 0 4px #00f3ff',
    nom: 'color:#22c55e;font-weight:bold',
    fai: 'color:#f59e0b;font-weight:bold',
    ser: 'color:#f97316;font-weight:bold',
    cri: 'color:#ef4444;font-weight:bold;font-size:12px',
    msg: 'color:#8899aa;font-style:italic',
  };
  const SS = { nominal: S.nom, fair: S.fai, serious: S.ser, critical: S.cri };

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════
  let level     = 'nominal';
  let pending   = 'nominal';
  let streak    = 0;
  let observer  = null;
  let fallbackId = null;
  let initT     = 0;
  let booted    = false;
  let apiMode   = 'none';

  // FPS tracking (fallback)
  let stamps    = [];
  let lastCheck = 0;

  // ═══════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════
  function boot() {
    if (booted) return;
    booted = true;
    initT  = performance.now();

    if (typeof PressureObserver !== 'undefined') {
      try {
        observer = new PressureObserver(onNative, { sampleInterval: 1000 });
        observer.observe('cpu').catch(() => {
          observer = null;
          apiMode = 'fallback';
          startFallback();
        });
        apiMode = 'native';
        logBoot();
        return;
      } catch { /* constructor threw — fall through */ }
    }

    apiMode = 'fallback';
    startFallback();
    logBoot();
  }

  function logBoot() {
    console.log(
      '%c⚡ SLA MONITOR ONLINE%c  ' +
      (apiMode === 'native' ? 'W3C Compute Pressure API' : 'Frame Timing Heuristic'),
      S.hdr, S.msg
    );
  }

  // ═══════════════════════════════════════════════════
  // NATIVE COMPUTE PRESSURE API
  // ═══════════════════════════════════════════════════
  function onNative(records) {
    if (performance.now() - initT < WARMUP_MS) return;
    if (document.visibilityState === 'hidden') return;
    const r = records[records.length - 1];
    if (r && r.state) evaluate(r.state);
  }

  // ═══════════════════════════════════════════════════
  // rAF FPS FALLBACK
  // ═══════════════════════════════════════════════════
  function startFallback() {
    function tick(ts) {
      if (!booted) return;
      fallbackId = requestAnimationFrame(tick);
      if (window._suspended) return;

      // Detect gap from page hide/unhide — reset buffer to avoid false positives
      if (stamps.length && ts - stamps[stamps.length - 1] > 1000) {
        stamps = [];
        lastCheck = ts;
      }
      stamps.push(ts);
      if (stamps.length > FPS_WINDOW) stamps.shift();

      if (ts - lastCheck >= CHECK_MS && stamps.length >= 20) {
        lastCheck = ts;
        if (ts - initT < WARMUP_MS) return;
        if (document.visibilityState === 'hidden') return;

        const dt  = stamps[stamps.length - 1] - stamps[0];
        const fps = (stamps.length - 1) * 1000 / dt;

        let s = 'critical';
        if (fps >= FPS_NOMINAL) s = 'nominal';
        else if (fps >= FPS_FAIR) s = 'fair';
        else if (fps >= FPS_SERIOUS) s = 'serious';
        evaluate(s);
      }
    }
    fallbackId = requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════════
  // STATE MACHINE — hysteresis prevents flip-flopping
  // ═══════════════════════════════════════════════════
  function evaluate(newState) {
    if (newState === level) { pending = level; streak = 0; return; }
    if (newState === pending) { streak++; } else { pending = newState; streak = 1; }
    const need = IDX[newState] > IDX[level] ? ESCALATE_AFTER : DEESCALATE_AFTER;
    if (streak >= need) transition(newState);
  }

  function transition(next) {
    const prev = level;
    level = next;
    streak = 0;

    document.body.classList.remove('perf-fair', 'perf-serious', 'perf-critical');
    if (next !== 'nominal') document.body.classList.add('perf-' + next);

    const escalating = IDX[next] > IDX[prev];

    if (escalating) {
      console.log(
        '%c⚡ SLA ALERT: %c' + next.toUpperCase() +
        '%c\nDelivery Lead protocol engaged: scaling back non-critical services to maintain 60fps SLA.',
        S.hdr, SS[next], S.msg
      );
    } else {
      console.log(
        '%c⚡ SLA RESTORED: %c' + next.toUpperCase() +
        '%c — load stabilized, restoring services.',
        S.hdr, SS[next], S.msg
      );
    }

    if (escalating && IDX[next] >= 2 && window.UniToast)
      window.UniToast('⚡ System load ' + next + ' — scaling back effects to maintain 60fps SLA');
    if (!escalating && IDX[prev] >= 2 && IDX[next] < 2 && window.UniToast)
      window.UniToast('✅ Load stabilized — visual effects restored');

    window.dispatchEvent(new CustomEvent('computepressure', {
      detail: { state: next, previous: prev, level: IDX[next] }
    }));

    if (escalating && IDX[next] >= 2 && window.VDna) window.VDna.addXp(5);
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  window._pressure = {
    state:         () => level,
    level:         () => IDX[level],
    isConstrained: () => IDX[level] >= 2,
    mode:          () => apiMode,
    destroy() {
      booted = false;
      if (observer) { try { observer.unobserve('cpu'); } catch {} observer = null; }
      if (fallbackId) { cancelAnimationFrame(fallbackId); fallbackId = null; }
      document.body.classList.remove('perf-fair', 'perf-serious', 'perf-critical');
      level = 'nominal';
    }
  };

  // Boot on DOM ready (or immediately if already ready)
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  else
    boot();
})();
