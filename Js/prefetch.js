// prefetch.js — WebNN Predictive Prefetching (Hardware ML)
// Predicts user navigation via Markov chain + optional WebNN MLP + cursor trajectory,
// then prefetches lazy-loaded scripts before the user clicks.
(function() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // STATE SPACE & CONFIG
  // ═══════════════════════════════════════════════════
  const STATES = ['hero','timeline','certs','testimonials','conferences','articles','impact','contact','terminal','arcade','book3d','spatial','globe'];
  const N = STATES.length;
  const EMA = 0.3;
  const PREDICT_HZ = 100; // ms between prediction cycles
  const CONFIDENCE_THRESHOLD = 0.15;
  const CURSOR_LOOKAHEAD_MS = 300;
  const CURSOR_MIN_SPEED = 0.3; // px/ms
  const MAX_PREFETCH = 2;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  const SECTION_SEL = {
    '.tl-wrap': 'timeline', '#certGrid': 'certs', '.tc-section': 'testimonials',
    '.conf-strip': 'conferences', '#linkedinFeed': 'articles', '.imp': 'impact',
    '.sr': 'contact'
  };

  const STATE_TO_SCRIPT = {
    terminal: 'Js/ai3d.js', arcade: 'Js/arcade.js', book3d: 'Js/ai3d.js',
    spatial: 'Js/spatial-controller.js', globe: 'Js/ai3d.js',
    emotion: 'Js/emotion-engine.js'
  };

  const TRIGGER_ELEMENTS = [
    { sel: '#termBtn, [onclick*="openTerm"]', script: 'Js/ai3d.js' },
    { sel: '#badge3dPreview', script: 'Js/ai3d.js' },
    { sel: '#spatialBtn', script: 'Js/spatial-controller.js' },
    { sel: '.gb-globe-btn', script: 'Js/ai3d.js' },
    { sel: '[onclick*="openGame"], [onclick*="openArcade"]', script: 'Js/arcade.js' },
  ];

  const COLD_PRIOR = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    [0, 8], [0, 9], [1, 8], [2, 8], [3, 8]
  ];

  // ═══════════════════════════════════════════════════
  // SIGNAL COLLECTOR
  // ═══════════════════════════════════════════════════
  let mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
  let mouseVelX = 0, mouseVelY = 0;
  let scrollY = window.scrollY, prevScrollY = window.scrollY;
  let scrollVel = 0;
  let currentSection = 'hero';
  let sectionEnterTime = Date.now();
  let lastPredictTime = 0;
  let rafId = 0;
  let destroyed = false;

  function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
  document.addEventListener('mousemove', onMouseMove, { passive: true });

  function detectSection() {
    const vh = window.innerHeight;
    for (const [sel, name] of Object.entries(SECTION_SEL)) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.6 && r.bottom > vh * 0.4) return name;
    }
    return 'hero';
  }

  function updateSignals() {
    const dx = mouseX - prevMouseX;
    const dy = mouseY - prevMouseY;
    mouseVelX = mouseVelX * (1 - EMA) + dx * EMA;
    mouseVelY = mouseVelY * (1 - EMA) + dy * EMA;
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    scrollY = window.scrollY;
    const dScroll = scrollY - prevScrollY;
    scrollVel = scrollVel * (1 - EMA) + dScroll * EMA;
    prevScrollY = scrollY;

    const sec = detectSection();
    if (sec !== currentSection) {
      markov.transition(currentSection, sec);
      currentSection = sec;
      sectionEnterTime = Date.now();
    }
  }

  function getFeatureVector() {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    return new Float32Array([
      docH > 0 ? scrollY / docH : 0,
      Math.tanh(scrollVel / 50),
      Math.tanh(mouseVelX / 20),
      Math.tanh(mouseVelY / 20),
      STATES.indexOf(currentSection) / (N - 1),
      Math.min((Date.now() - sectionEnterTime) / 10000, 1)
    ]);
  }

  // ═══════════════════════════════════════════════════
  // MARKOV TRANSITION MODEL
  // ═══════════════════════════════════════════════════
  const STORAGE_KEY = '_prefetchMarkov';
  const markov = {
    matrix: new Float32Array(N * N),
    totalTransitions: 0,

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (arr.length === N * N) {
            this.matrix.set(arr);
            this.totalTransitions = this.matrix.reduce((a, b) => a + b, 0);
          }
        }
      } catch (_) {}
      if (this.totalTransitions < 20) this.applyColdPrior();
    },

    save() {
      const data = JSON.stringify(Array.from(this.matrix));
      try { localStorage.setItem(STORAGE_KEY, data); } catch (_) {}
      if (window._lake && window._lake.isReady) window._lake.put('cache', '_prefetchMarkov', data);
    },

    applyColdPrior() {
      for (const [from, to] of COLD_PRIOR) {
        this.matrix[from * N + to] += 2;
      }
      this.totalTransitions = this.matrix.reduce((a, b) => a + b, 0);
    },

    transition(from, to) {
      const fi = STATES.indexOf(from);
      const ti = STATES.indexOf(to);
      if (fi < 0 || ti < 0) return;
      this.matrix[fi * N + ti]++;
      this.totalTransitions++;
      if (this.totalTransitions % 10 === 0) this.save();
    },

    predict(stateIdx) {
      const row = this.matrix.subarray(stateIdx * N, stateIdx * N + N);
      const sum = row.reduce((a, b) => a + b, 0);
      if (sum === 0) return [];
      const probs = [];
      for (let i = 0; i < N; i++) {
        const p = row[i] / sum;
        if (p >= CONFIDENCE_THRESHOLD) probs.push({ idx: i, state: STATES[i], prob: p });
      }
      probs.sort((a, b) => b.prob - a.prob);
      return probs.slice(0, 3);
    }
  };

  // ═══════════════════════════════════════════════════
  // WEBNN MLP (optional hardware acceleration)
  // ═══════════════════════════════════════════════════
  let webnnReady = false;
  let webnnContext = null;
  let webnnGraph = null;
  let webnnDeviceType = null;
  const W1 = new Float32Array(6 * 8);
  const B1 = new Float32Array(8);
  const W2 = new Float32Array(8 * N);
  const B2 = new Float32Array(N);

  function initWeightsFromMarkov() {
    for (let i = 0; i < W1.length; i++) W1[i] = (Math.random() - 0.5) * 0.5;
    for (let i = 0; i < B1.length; i++) B1[i] = 0.01;
    B2.fill(0);
    const total = markov.totalTransitions || 1;
    for (let h = 0; h < 8; h++) {
      for (let o = 0; o < N; o++) {
        let val = 0;
        for (let s = 0; s < N; s++) {
          val += markov.matrix[s * N + o] / total;
        }
        W2[h * N + o] = val * 2 - (1 / N);
      }
    }
  }

  async function initWebNN() {
    if (!navigator.ml) return;
    const devices = ['npu', 'gpu', 'cpu'];
    for (const dev of devices) {
      try {
        webnnContext = await navigator.ml.createContext({ deviceType: dev });
        webnnDeviceType = dev;
        break;
      } catch (_) { continue; }
    }
    if (!webnnContext) return;

    try {
      initWeightsFromMarkov();
      const builder = new MLGraphBuilder(webnnContext);

      const input = builder.input('input', { dataType: 'float32', shape: [1, 6] });
      const w1 = builder.constant({ dataType: 'float32', shape: [6, 8] }, W1);
      const b1 = builder.constant({ dataType: 'float32', shape: [1, 8] }, B1);
      const w2 = builder.constant({ dataType: 'float32', shape: [8, N] }, W2);
      const b2 = builder.constant({ dataType: 'float32', shape: [1, N] }, B2);

      const hidden = builder.relu(builder.add(builder.matmul(input, w1), b1));
      const output = builder.softmax(builder.add(builder.matmul(hidden, w2), b2));

      webnnGraph = await builder.build({ output });
      webnnReady = true;
      console.log('%c🧠 WebNN prefetch model ready (' + webnnDeviceType.toUpperCase() + ')', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
    } catch (err) {
      console.warn('WebNN build failed, using Markov-only:', err.message);
      webnnReady = false;
    }
  }

  async function webnnPredict(features) {
    if (!webnnReady || !webnnGraph) return null;
    try {
      const inputBuffer = new Float32Array(features);
      const outputBuffer = new Float32Array(N);
      const results = await webnnContext.compute(webnnGraph, { input: inputBuffer }, { output: outputBuffer });
      const out = results.outputs.output;
      const preds = [];
      for (let i = 0; i < N; i++) {
        if (out[i] >= CONFIDENCE_THRESHOLD) preds.push({ idx: i, state: STATES[i], prob: out[i] });
      }
      preds.sort((a, b) => b.prob - a.prob);
      return preds.slice(0, 3);
    } catch (_) {
      webnnReady = false;
      return null;
    }
  }

  // ═══════════════════════════════════════════════════
  // CURSOR TRAJECTORY PREDICTOR
  // ═══════════════════════════════════════════════════
  const cursorHistory = [];
  let triggerRects = null;
  let lastRectCacheTime = 0;

  function cacheTriggerRects() {
    triggerRects = [];
    for (const t of TRIGGER_ELEMENTS) {
      const el = document.querySelector(t.sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      triggerRects.push({
        left: r.left - 20, top: r.top - 20,
        right: r.right + 20, bottom: r.bottom + 20,
        script: t.script
      });
    }
  }

  function predictCursorTarget() {
    if (isMobile) return null;
    cursorHistory.push({ x: mouseX, y: mouseY, t: Date.now() });
    if (cursorHistory.length > 5) cursorHistory.shift();
    if (cursorHistory.length < 2) return null;

    const oldest = cursorHistory[0];
    const newest = cursorHistory[cursorHistory.length - 1];
    const dt = newest.t - oldest.t;
    if (dt < 10) return null;

    const vx = (newest.x - oldest.x) / dt;
    const vy = (newest.y - oldest.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < CURSOR_MIN_SPEED) return null;

    const px = newest.x + vx * CURSOR_LOOKAHEAD_MS;
    const py = newest.y + vy * CURSOR_LOOKAHEAD_MS;

    const now2 = Date.now();
    if (!triggerRects || now2 - lastRectCacheTime > 2000) { cacheTriggerRects(); lastRectCacheTime = now2; }
    if (!triggerRects) return null;

    for (const rect of triggerRects) {
      if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
        return rect.script;
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════
  // PREFETCH ENGINE
  // ═══════════════════════════════════════════════════
  const prefetched = new Set();
  const prefetchLinks = new Map();
  let activePrefetches = 0;
  const stats = { hits: 0, misses: 0, predictions: 0, prefetches: 0 };

  function doPrefetch(scriptUrl) {
    if (destroyed || !scriptUrl || prefetched.has(scriptUrl) || activePrefetches >= MAX_PREFETCH) return;
    prefetched.add(scriptUrl);
    activePrefetches++;
    stats.prefetches++;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = scriptUrl;
    link.onload = link.onerror = () => { activePrefetches--; };
    prefetchLinks.set(scriptUrl, link);
    document.head.appendChild(link);
  }

  const recordedScripts = new Set();
  function recordHit(scriptUrl) {
    if (recordedScripts.has(scriptUrl)) return;
    recordedScripts.add(scriptUrl);
    if (prefetched.has(scriptUrl)) stats.hits++;
    else stats.misses++;
  }

  const _schedIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  function prefetchForSection(sectionPreds) {
    _schedIdle(() => {
      if (destroyed) return;
      for (const pred of sectionPreds) {
        const script = STATE_TO_SCRIPT[pred.state];
        if (script) doPrefetch(script);
        const sel = Object.entries(SECTION_SEL).find(([_, name]) => name === pred.state);
        if (sel) {
          const el = document.querySelector(sel[0]);
          if (el) el.getBoundingClientRect();
        }
      }
    }, { timeout: 200 });
  }

  // ═══════════════════════════════════════════════════
  // MAIN PREDICTION LOOP (10Hz)
  // ═══════════════════════════════════════════════════
  let _predicting = false;
  async function predictionLoop() {
    if (destroyed || _predicting) return;
    _predicting = true;
    try {

    updateSignals();

    const sIdx = STATES.indexOf(currentSection);
    stats.predictions++;

    const features = getFeatureVector();
    let preds = null;
    if (webnnReady) preds = await webnnPredict(features);
    if (!preds) preds = markov.predict(sIdx);
    if (preds && preds.length) prefetchForSection(preds);

    const cursorTarget = predictCursorTarget();
    if (cursorTarget) doPrefetch(cursorTarget);
    } finally { _predicting = false; }
  }

  // ═══════════════════════════════════════════════════
  // DEBUG HUD
  // ═══════════════════════════════════════════════════
  let hudEl = null;
  let hudVisible = false;

  function createHUD() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.id = 'prefetchHud';
    hudEl.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9990;font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.5px;color:rgba(255,255,255,.6);background:rgba(10,15,30,.85);border:1px solid rgba(99,102,241,.2);border-radius:8px;padding:6px 10px;pointer-events:none;display:none;backdrop-filter:blur(8px);max-width:200px;line-height:1.4;';
    document.body.appendChild(hudEl);
  }

  function updateHUD() {
    if (!hudEl || !hudVisible) return;
    const sIdx = STATES.indexOf(currentSection);
    const preds = markov.predict(sIdx);
    const top = preds[0];
    const acc = (stats.hits + stats.misses) > 0 ? Math.round(stats.hits / (stats.hits + stats.misses) * 100) : 0;
    hudEl.innerHTML = `<span style="color:#6366f1">PREFETCH</span> <span style="color:${webnnReady ? '#22c55e' : '#8b949e'}">${webnnReady ? 'WebNN/' + webnnDeviceType.toUpperCase() : 'Markov'}</span><br>` +
      `Section: ${currentSection}<br>` +
      `Predict: ${top ? top.state + ' (' + Math.round(top.prob * 100) + '%)' : 'none'}<br>` +
      `Accuracy: ${acc}% (${stats.hits}/${stats.hits + stats.misses})<br>` +
      `Prefetched: ${stats.prefetches}`;
  }

  function toggleHUD() {
    createHUD();
    hudVisible = !hudVisible;
    hudEl.style.display = hudVisible ? 'block' : 'none';
    if (hudVisible) {
      updateHUD();
      hudUpdateInterval = setInterval(updateHUD, 500);
    } else if (hudUpdateInterval) {
      clearInterval(hudUpdateInterval);
      hudUpdateInterval = null;
    }
  }
  let hudUpdateInterval = null;

  // ═══════════════════════════════════════════════════
  // GLOBAL API
  // ═══════════════════════════════════════════════════
  window._prefetch = {
    getStats() {
      const acc = (stats.hits + stats.misses) > 0 ? Math.round(stats.hits / (stats.hits + stats.misses) * 100) : 0;
      const sIdx = STATES.indexOf(currentSection);
      return {
        hits: stats.hits,
        misses: stats.misses,
        accuracy: acc,
        model: webnnReady ? 'webnn/' + webnnDeviceType : 'markov',
        transitions: markov.totalTransitions,
        prefetches: stats.prefetches,
        predictions: stats.predictions,
        topPredictions: markov.predict(sIdx),
        prefetchedScripts: Array.from(prefetched),
        currentSection
      };
    },
    isActive() { return !destroyed; },
    toggleHUD() { toggleHUD(); },
    recordHit(script) { recordHit(script); },
    destroy() {
      destroyed = true;
      if (rafId) clearInterval(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (hudUpdateInterval) { clearInterval(hudUpdateInterval); hudUpdateInterval = null; }
      if (hudEl) hudEl.remove();
      markov.save();
      prefetchLinks.forEach((link) => { link.remove(); });
      prefetchLinks.clear();
    }
  };

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  markov.load();
  initWebNN().catch(() => {});
  cacheTriggerRects();
  setTimeout(() => cacheTriggerRects(), 3000);
  const onBeforeUnload = () => markov.save();
  window.addEventListener('beforeunload', onBeforeUnload);
  rafId = setInterval(predictionLoop, PREDICT_HZ);

  console.log('%c📊 Predictive Prefetch active', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
})();
