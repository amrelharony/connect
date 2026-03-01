// biometric-risk.js — Behavioral Biometric Profiling Engine
// Banking-grade behavioral analysis using real-time physics calculus
// (velocity, acceleration, jerk) and Isolation Forest anomaly detection.
// Computes a "Human & Executive Confidence Score" from mouse, scroll,
// and keystroke telemetry. Zero external dependencies.

(function BiometricRisk() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════
  const BUF       = 200;     // ring buffer size (~3.3s at 60fps)
  const SAMPLE_MS = 500;     // feature extraction interval
  const MIN_SAMP  = 30;      // minimum samples before scoring
  const N_TREES   = 15;      // isolation forest size
  const MAX_DEPTH = 8;
  const IDLE_TH   = 500;     // ms before counting as idle
  const MOUSE_TH  = 16;      // ms throttle (~60fps)

  // ═══════════════════════════════════════════════════
  // RING BUFFER — zero-allocation circular Float64Array
  // ═══════════════════════════════════════════════════
  class Ring {
    constructor(n) { this.d = new Float64Array(n); this.n = n; this.h = 0; this.c = 0; }
    push(v) { this.d[this.h] = v; this.h = (this.h + 1) % this.n; if (this.c < this.n) this.c++; }
    last()  { return this.c ? this.d[(this.h - 1 + this.n) % this.n] : 0; }
    mean()  { if (!this.c) return 0; let s=0; for (let i=0;i<this.c;i++) s+=this.d[i]; return s/this.c; }
    absMean() { if (!this.c) return 0; let s=0; for (let i=0;i<this.c;i++) s+=Math.abs(this.d[i]); return s/this.c; }
    std() {
      if (this.c < 2) return 0;
      const m = this.mean(); let s = 0;
      for (let i = 0; i < this.c; i++) { const v = this.d[i] - m; s += v * v; }
      return Math.sqrt(s / this.c);
    }
    toArray() {
      const a = [], start = (this.h - this.c + this.n) % this.n;
      for (let i = 0; i < this.c; i++) a.push(this.d[(start + i) % this.n]);
      return a;
    }
  }

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════
  const velBuf   = new Ring(BUF);
  const accelBuf = new Ring(BUF);
  const jerkBuf  = new Ring(BUF);
  const curvBuf  = new Ring(BUF);
  const scrollVelBuf = new Ring(100);
  const keyIntervals = new Ring(50);

  let lastMX = 0, lastMY = 0, lastMT = 0, lastAngle = null;
  let lastScrollY = 0, lastScrollT = 0;
  let lastKeyT = 0;
  let idleStart = 0, totalIdle = 0;
  let clickCount = 0;

  let featureVecs = [];
  let forest      = null;
  let latestAnomaly = 0.5;
  let booted      = false;
  let bootTime    = 0;
  let xpAwarded   = false;

  // ═══════════════════════════════════════════════════
  // DATA COLLECTION — passive, zero-allocation hot path
  // ═══════════════════════════════════════════════════
  function onMouse(e) {
    const now = performance.now();
    const dt = now - lastMT;
    if (dt < MOUSE_TH) return;

    if (lastMT > 0) {
      const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      const vel   = Math.sqrt(dx*dx + dy*dy) / dt;
      const accel = (vel - velBuf.last()) / dt;
      const jerk  = (accel - accelBuf.last()) / dt;

      const angle = Math.atan2(dy, dx);
      let dA = 0;
      if (lastAngle !== null) {
        dA = angle - lastAngle;
        if (dA > Math.PI)  dA -= 2 * Math.PI;
        if (dA < -Math.PI) dA += 2 * Math.PI;
      }

      velBuf.push(vel);
      accelBuf.push(accel);
      jerkBuf.push(jerk);
      curvBuf.push(Math.abs(dA));
      lastAngle = angle;

      if (idleStart > 0) { totalIdle += now - idleStart; idleStart = 0; }
    }
    lastMX = e.clientX; lastMY = e.clientY; lastMT = now;
  }

  function onScroll() {
    const now = performance.now();
    const dt = now - lastScrollT;
    if (dt < 50) return;
    scrollVelBuf.push((window.scrollY - lastScrollY) / dt);
    lastScrollY = window.scrollY;
    lastScrollT = now;
  }

  function onKey() {
    const now = performance.now();
    if (lastKeyT > 0) {
      const gap = now - lastKeyT;
      if (gap < 2000) keyIntervals.push(gap);
    }
    lastKeyT = now;
  }

  function onClick() { clickCount++; }

  // ═══════════════════════════════════════════════════
  // FEATURE EXTRACTION
  // ═══════════════════════════════════════════════════
  function extractFeatures() {
    const now = performance.now();
    const total = now - bootTime;
    if (idleStart > 0) { totalIdle += now - idleStart; idleStart = now; }
    const idleRatio = total > 0 ? Math.min(1, totalIdle / total) : 0;

    return [
      velBuf.mean(),           // 0: mean velocity (px/ms)
      velBuf.std(),            // 1: velocity variation
      accelBuf.absMean(),      // 2: mean |acceleration|
      jerkBuf.absMean(),       // 3: mean |jerk| (smoothness indicator)
      curvBuf.mean(),          // 4: mean curvature (direction changes)
      scrollVelBuf.absMean(),  // 5: mean |scroll velocity|
      idleRatio,               // 6: fraction of session spent idle
    ];
  }

  function sample() {
    if (velBuf.c < 5) return;
    const fv = extractFeatures();
    featureVecs.push(fv);
    if (featureVecs.length > 600) featureVecs = featureVecs.slice(-400);

    if (featureVecs.length >= MIN_SAMP && featureVecs.length % 15 === 0) {
      forest = iforest(featureVecs, N_TREES, MAX_DEPTH);
    }
    if (forest) latestAnomaly = iscore(forest, fv, featureVecs.length);
  }

  // ═══════════════════════════════════════════════════
  // ISOLATION FOREST — Liu et al. 2008, pure JS
  // ═══════════════════════════════════════════════════
  function avgPathC(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }

  function itree(data, maxD, depth) {
    if (data.length <= 1 || depth >= maxD) return { leaf: true, size: data.length };
    const fi = Math.floor(Math.random() * data[0].length);
    let lo = Infinity, hi = -Infinity;
    for (const d of data) { if (d[fi] < lo) lo = d[fi]; if (d[fi] > hi) hi = d[fi]; }
    if (lo === hi) return { leaf: true, size: data.length };
    const sv = lo + Math.random() * (hi - lo);
    const L = [], R = [];
    for (const d of data) (d[fi] < sv ? L : R).push(d);
    return { fi, sv, l: itree(L, maxD, depth+1), r: itree(R, maxD, depth+1) };
  }

  function ipath(node, pt, depth) {
    if (node.leaf) return depth + avgPathC(node.size);
    return ipath(pt[node.fi] < node.sv ? node.l : node.r, pt, depth + 1);
  }

  function iforest(data, nTrees, maxD) {
    const sub = Math.min(256, data.length);
    const trees = [];
    for (let i = 0; i < nTrees; i++) {
      const s = [];
      for (let j = 0; j < sub; j++) s.push(data[Math.floor(Math.random() * data.length)]);
      trees.push(itree(s, maxD, 0));
    }
    return trees;
  }

  function iscore(forest, pt, n) {
    let avg = 0;
    for (const t of forest) avg += ipath(t, pt, 0);
    avg /= forest.length;
    return Math.pow(2, -avg / avgPathC(n));
  }

  // ═══════════════════════════════════════════════════
  // CONFIDENCE SCORING
  // ═══════════════════════════════════════════════════
  function computeProfile() {
    if (featureVecs.length < MIN_SAMP) return null;
    const fv = featureVecs[featureVecs.length - 1];
    const jMean = fv[3], idleR = fv[6];

    const smoothness   = Math.max(0, 1 - jMean / 0.0004);
    const velCV        = fv[0] > 0 ? fv[1] / (fv[0] + 0.001) : 0;
    const deliberation = Math.min(1, velCV * 1.5);

    let rhythm = 0.5;
    if (keyIntervals.c >= 5) {
      const cv = keyIntervals.std() / (keyIntervals.mean() + 1);
      rhythm = Math.min(1, cv * 1.5);
    }

    const idleScore = Math.max(0, 1 - Math.abs(idleR - 0.35) * 2.5);
    const normalcy  = 1 - latestAnomaly;

    const score = Math.round(
      (smoothness * 0.25 + deliberation * 0.2 + rhythm * 0.15 +
       idleScore  * 0.15 + normalcy     * 0.25) * 100
    );

    return {
      score: Math.max(0, Math.min(100, score)),
      smoothness, deliberation, rhythm, idleScore, anomaly: latestAnomaly,
      classification: classify(score, fv[0], fv[4], idleR),
      raw: fv
    };
  }

  function classify(score, vel, curv, idle) {
    if (score > 80) return vel < 0.4 ? 'EXECUTIVE' : 'SENIOR ANALYST';
    if (score > 65) return curv > 0.15 ? 'TRADER' : 'ANALYST';
    if (score > 45) return idle > 0.5 ? 'OBSERVER' : 'ASSOCIATE';
    return 'AUTOMATED';
  }

  // ═══════════════════════════════════════════════════
  // TERMINAL RENDERING
  // ═══════════════════════════════════════════════════
  function render() {
    const prof = computeProfile();
    const elapsed = Math.floor((performance.now() - bootTime) / 1000);
    const mm = Math.floor(elapsed / 60), ss = elapsed % 60;

    if (!prof) {
      const waiting = velBuf.c < 5;
      const eta = waiting
        ? 'Awaiting mouse input to begin profiling...'
        : `Profile ready in ~${Math.max(1, Math.ceil((MIN_SAMP - featureVecs.length) * SAMPLE_MS / 1000))}s`;
      return `<span class="term-cyan">⚡ BEHAVIORAL BIOMETRIC RISK PROFILE</span>
<span class="term-warn">⏳ Collecting behavioral telemetry... (${featureVecs.length}/${MIN_SAMP} samples)
Move the mouse, scroll, and interact naturally.
${eta}</span>`;
    }

    if (!xpAwarded && window.VDna) { window.VDna.addXp(10); xpAwarded = true; }

    const sc = prof.score;
    const sColor = sc > 75 ? 'term-green' : sc > 50 ? 'term-warn' : 'term-red';

    const descs = {
      EXECUTIVE:       'Deliberate navigation, efficient path selection',
      'SENIOR ANALYST':'Thorough exploration, detailed behavioral review',
      TRADER:          'Quick, decisive movements — reactive pattern',
      ANALYST:         'Methodical, measured interaction style',
      OBSERVER:        'Passive consumption, reading-focused',
      ASSOCIATE:       'Exploratory, learning the interface',
      AUTOMATED:       'Suspicious regularity — possible automation',
    };

    const scatter = renderScatter();

    return `<span class="term-cyan">⚡ BEHAVIORAL BIOMETRIC RISK PROFILE</span>
<span class="term-gray">Banking-grade behavioral analysis • Isolation Forest anomaly detection</span>

<span class="term-white">HUMAN & EXECUTIVE CONFIDENCE</span>
  ${bar(sc / 100, 25)} <span class="${sColor}">${sc}/100</span>
  <span class="term-accent">Classification: ${prof.classification}</span>
  <span class="term-gray">${descs[prof.classification] || ''}</span>

${scatter}
  <span class="term-gray">Smoothness:</span>    ${bar(prof.smoothness, 15)} <span class="term-white">${pct(prof.smoothness)}</span>  <span class="term-gray">ẍ(t) jerk magnitude</span>
  <span class="term-gray">Deliberation:</span>  ${bar(prof.deliberation, 15)} <span class="term-white">${pct(prof.deliberation)}</span>  <span class="term-gray">σ(v)/μ(v) coefficient of variation</span>
  <span class="term-gray">Rhythm:</span>        ${bar(prof.rhythm, 15)} <span class="term-white">${pct(prof.rhythm)}</span>  <span class="term-gray">keystroke interval regularity</span>
  <span class="term-gray">Idle pattern:</span>  ${bar(prof.idleScore, 15)} <span class="term-white">${pct(prof.idleScore)}</span>  <span class="term-gray">reading vs browsing ratio</span>
  <span class="term-gray">Normalcy:</span>      ${bar(1-prof.anomaly, 15)} <span class="term-white">${pct(1-prof.anomaly)}</span>  <span class="term-gray">Isolation Forest path length</span>

<span class="term-gray">Samples:</span> ${featureVecs.length} <span class="term-gray">│ Session:</span> ${mm}m ${ss}s <span class="term-gray">│ Forest:</span> ${forest ? N_TREES + ' trees, depth ' + MAX_DEPTH : 'building...'}
<span class="term-gray">Clicks:</span> ${clickCount} <span class="term-gray">│ Keys:</span> ${keyIntervals.c} <span class="term-gray">│ Scrolls:</span> ${scrollVelBuf.c} <span class="term-gray">│ Mouse pts:</span> ${velBuf.c}`;
  }

  function bar(val, w) {
    const v = Math.max(0, Math.min(1, val));
    const f = Math.round(v * w);
    return '<span class="term-cyan">' + '█'.repeat(f) + '</span><span class="term-gray">' + '░'.repeat(w - f) + '</span>';
  }

  function pct(v) { return (Math.max(0, Math.min(1, v)) * 100).toFixed(0) + '%'; }

  function renderScatter() {
    const W = 32, H = 10;
    const vels = velBuf.toArray(), accels = accelBuf.toArray();
    if (vels.length < 10) return '<span class="term-gray">  (insufficient mouse data for scatter)</span>\n';

    let maxV = 0, maxA = 0;
    for (let i = 0; i < vels.length; i++) {
      const av = Math.abs(vels[i]), aa = Math.abs(accels[i]);
      if (av > maxV) maxV = av;
      if (aa > maxA) maxA = aa;
    }
    maxV = maxV * 1.1 || 1;
    maxA = maxA * 1.1 || 1;

    const grid = Array.from({ length: H }, () => new Uint8Array(W));
    const len = Math.min(vels.length, accels.length);
    for (let i = 0; i < len; i++) {
      const x = Math.min(W-1, Math.floor(Math.abs(vels[i]) / maxV * (W-1)));
      const y = Math.min(H-1, H-1 - Math.floor(Math.abs(accels[i]) / maxA * (H-1)));
      grid[y][x] = Math.min(9, grid[y][x] + 1);
    }

    let out = '<span class="term-cyan">  Velocity vs Acceleration — Behavioral Scatter</span>\n';
    for (let y = 0; y < H; y++) {
      out += y === 0
        ? '<span class="term-gray"> A▲│</span>'
        : '<span class="term-gray">   │</span>';
      for (let x = 0; x < W; x++) {
        const c = grid[y][x];
        if      (c === 0) out += ' ';
        else if (c <= 2)  out += '<span class="term-cyan">·</span>';
        else if (c <= 4)  out += '<span class="term-green">◦</span>';
        else              out += '<span class="term-warn">█</span>';
      }
      out += '\n';
    }
    out += '<span class="term-gray">   └' + '─'.repeat(W) + '▶ V</span>\n';
    return out;
  }

  // ═══════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════
  function boot() {
    if (booted) return;
    booted = true;
    bootTime = performance.now();
    lastScrollY = window.scrollY;
    lastScrollT = bootTime;

    document.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('keydown', onKey, { passive: true });
    document.addEventListener('click', onClick, { passive: true });

    const _idleIv = setInterval(() => {
      if (lastMT > 0 && performance.now() - lastMT > IDLE_TH && !idleStart)
        idleStart = performance.now() - (performance.now() - lastMT - IDLE_TH);
    }, 500);

    const _sampleIv = setInterval(sample, SAMPLE_MS);

    window._riskCleanup = () => { clearInterval(_idleIv); clearInterval(_sampleIv); document.removeEventListener('mousemove', onMouse); window.removeEventListener('scroll', onScroll); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };

    console.log(
      '%c🔬 BIOMETRIC ENGINE ONLINE%c  Behavioral profiling active — type risk-profile in terminal',
      'color:#00f3ff;font-weight:bold;font-size:11px;text-shadow:0 0 4px #00f3ff',
      'color:#8899aa;font-style:italic'
    );
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  window._riskProfile = {
    render,
    getProfile: computeProfile,
    samples: () => featureVecs.length,
    score: () => { const p = computeProfile(); return p ? p.score : null; },
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  else
    boot();
})();
