// data-intro.js — Data Cinema SVG Intro Engine
// 2D State Matrix: Time (phase geometry) x Weather (palette + SVG filters)
// Data Cinema: bold strokes, intense glow, cinematic timing, phase-adaptive
(function DataIntroEngine() {
  'use strict';

  var W, H;
  function dims() { W = window.innerWidth; H = window.innerHeight; }
  dims();

  var MOB = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;

  // ── Utilities ──────────────────────────────────────────────
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function F(n) { return n.toFixed(1); }

  function getCairoHour() {
    try {
      var s = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false });
      var h = parseInt(s, 10);
      return (isNaN(h) || h > 23) ? 0 : h;
    } catch (e) { return new Date().getHours(); }
  }

  function getPhase(h) {
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'midday';
    if (h >= 17 && h < 21) return 'dusk';
    return 'night';
  }

  function getAtmosphere(code) {
    code = Number(code) || 0;
    if (code <= 1) return 'clear';
    if (code <= 48) return 'cloud';
    if (code <= 82) return 'rain';
    return 'storm';
  }

  // ── Palettes (dark = dusk/night, light = morning/midday) ──
  var PALETTES_DARK = {
    clear: { primary: '#00e5ff', secondary: '#818cf8', tertiary: '#c084fc', glow: 'rgba(0,229,255,0.8)', bg: '#06080f', glass: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.22)', speed: 1 },
    cloud: { primary: '#94a3b8', secondary: '#64748b', tertiary: '#cbd5e1', glow: 'rgba(148,163,184,0.5)', bg: '#0c1018', glass: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', speed: 0.6 },
    rain:  { primary: '#60a5fa', secondary: '#3b82f6', tertiary: '#93c5fd', glow: 'rgba(96,165,250,0.7)', bg: '#050a18', glass: 'rgba(100,165,250,0.06)', border: 'rgba(59,130,246,0.25)', speed: 0.8 },
    storm: { primary: '#c084fc', secondary: '#f87171', tertiary: '#e879f9', glow: 'rgba(192,132,252,0.8)', bg: '#08050f', glass: 'rgba(192,132,252,0.06)', border: 'rgba(192,132,252,0.25)', speed: 1.4 }
  };

  var PALETTES_LIGHT = {
    clear: { primary: '#0055ee', secondary: '#4f46e5', tertiary: '#7c3aed', glow: 'rgba(0,85,238,0.35)', bg: '#f4f6fb', bg2: '#e8ecf4', glass: 'rgba(0,20,60,0.08)', border: 'rgba(0,20,60,0.18)', speed: 1 },
    cloud: { primary: '#3e4c5e', secondary: '#2d3a4a', tertiary: '#5a6a7e', glow: 'rgba(62,76,94,0.30)', bg: '#eef1f8', bg2: '#e2e6f0', glass: 'rgba(0,0,30,0.09)', border: 'rgba(0,0,30,0.20)', speed: 0.6 },
    rain:  { primary: '#1d5ed8', secondary: '#1e40af', tertiary: '#3b7cf0', glow: 'rgba(29,94,216,0.35)', bg: '#edf2ff', bg2: '#dfe6fa', glass: 'rgba(0,30,80,0.09)', border: 'rgba(0,30,80,0.20)', speed: 0.8 },
    storm: { primary: '#6d28d9', secondary: '#c42020', tertiary: '#8b5cf6', glow: 'rgba(109,40,217,0.35)', bg: '#f5f0ff', bg2: '#ece4f8', glass: 'rgba(60,0,120,0.09)', border: 'rgba(60,0,120,0.20)', speed: 1.4 }
  };

  var _livePal = null;
  function syncPaletteFromCSS() {
    try {
      var cs = getComputedStyle(document.documentElement);
      var a = cs.getPropertyValue('--accent').trim();
      if (!a) { _livePal = null; return; }
      _livePal = {
        accent: a,
        accent2: cs.getPropertyValue('--accent2').trim(),
        accent3: cs.getPropertyValue('--accent3').trim(),
        bg: cs.getPropertyValue('--bg').trim()
      };
    } catch (e) { _livePal = null; }
  }

  function getPalette(atmo, isLight) {
    var base = isLight ? PALETTES_LIGHT[atmo] : PALETTES_DARK[atmo];
    if (!_livePal || !_livePal.accent) return base;
    var hex = _livePal.accent;
    var rr = parseInt(hex.slice(1, 3), 16) || 0;
    var gg = parseInt(hex.slice(3, 5), 16) || 0;
    var bb = parseInt(hex.slice(5, 7), 16) || 0;
    var ga = isLight ? 0.35 : 0.8;
    return {
      primary: hex,
      secondary: _livePal.accent2 || base.secondary,
      tertiary: _livePal.accent3 || base.tertiary,
      glow: 'rgba(' + rr + ',' + gg + ',' + bb + ',' + ga + ')',
      bg: _livePal.bg || base.bg,
      glass: base.glass,
      border: base.border,
      speed: base.speed
    };
  }

  var PHASE_BG = { morning: null, midday: null, dusk: '#0d0810', night: '#040608' };

  // ── Filter Stack (Data Cinema: dramatically stronger) ─────
  function buildFilterDefs(atmo, temp, wind, isLight) {
    temp = typeof temp === 'number' ? temp : 25;
    wind = typeof wind === 'number' ? wind : 5;
    var t = clamp((temp - 10) / 30, 0, 1);
    var r = lerp(0, 1, t), g = lerp(0.88, 0.65, t), b = lerp(1, 0, t);
    var matrix = r + ' 0 0 0 0  0 ' + g + ' 0 0 0  0 0 ' + b + ' 0 0  0 0 0 1 0';
    var freq = (0.001 + (wind / 100) * 0.02).toFixed(4);
    var blurVal = atmo === 'cloud' ? '6' : '0';
    var turbScale = atmo === 'storm' ? '16' : '0';
    var pal = getPalette(atmo, isLight);
    var mf;

    if (isLight) {
      mf = '<filter id="diGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="8" result="s"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.25" result="c"/><feComposite in="c" in2="s" operator="in" result="cs"/><feMerge><feMergeNode in="cs"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="diGlowHot" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="12" result="s"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.35" result="c"/><feComposite in="c" in2="s" operator="in" result="cs"/><feMerge><feMergeNode in="cs"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="diGlowSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="4" result="s"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.15" result="c"/><feComposite in="c" in2="s" operator="in" result="cs"/><feMerge><feMergeNode in="cs"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="diGlass" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="f"/><feFlood flood-color="rgba(0,0,40,1)" flood-opacity="0.08" result="t"/><feComposite in="t" in2="f" operator="in" result="td"/><feMerge><feMergeNode in="f"/><feMergeNode in="td"/></feMerge></filter>' +
        '<filter id="diGlassEdge" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="e"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.15" result="ec"/><feComposite in="ec" in2="e" operator="in" result="ce"/><feMerge><feMergeNode in="ce"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="diTrail" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="4" result="tb"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.12" result="tc"/><feComposite in="tc" in2="tb" operator="in" result="ct"/><feMerge><feMergeNode in="ct"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<radialGradient id="diLensFlare" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + pal.primary + '" stop-opacity="0.20"/><stop offset="100%" stop-color="' + pal.primary + '" stop-opacity="0"/></radialGradient>';
    } else {
      mf = '<filter id="diGlow"><feGaussianBlur stdDeviation="12" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>' +
        '<filter id="diGlowHot"><feGaussianBlur stdDeviation="18" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>' +
        '<filter id="diGlowSoft"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>' +
        '<filter id="diGlass" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="f"/><feFlood flood-color="' + pal.primary + '" flood-opacity="0.1" result="t"/><feComposite in="t" in2="f" operator="in" result="td"/><feMerge><feMergeNode in="f"/><feMergeNode in="td"/></feMerge></filter>' +
        '<filter id="diGlassEdge" x="-25%" y="-25%" width="150%" height="150%"><feMorphology operator="dilate" radius="1.2" result="d"/><feGaussianBlur in="d" stdDeviation="4" result="eg"/><feMerge><feMergeNode in="eg"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="diTrail"><feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>' +
        '<radialGradient id="diLensFlare" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + pal.primary + '" stop-opacity="0.85"/><stop offset="100%" stop-color="' + pal.primary + '" stop-opacity="0"/></radialGradient>';
    }

    var tempMatrix = isLight
      ? lerp(0.8, 1, t) + ' 0 0 0 0  0 ' + lerp(0.92, 0.85, t) + ' 0 0 0  0 0 ' + lerp(1, 0.8, t) + ' 0 0  0 0 0 1 0'
      : matrix;
    return '<defs>' +
      '<filter id="diTempColor" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + tempMatrix + '"/></filter>' +
      '<filter id="diBlur"><feGaussianBlur stdDeviation="' + blurVal + '"/></filter>' +
      '<filter id="diGlitch"><feTurbulence type="fractalNoise" baseFrequency="' + freq + '" numOctaves="3" seed="42" result="turb"/><feDisplacementMap in="SourceGraphic" in2="turb" scale="' + turbScale + '" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      mf +
      '<filter id="diTempGlitch" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + matrix + '" result="colored"/><feTurbulence type="fractalNoise" baseFrequency="' + freq + '" numOctaves="3" seed="42" result="turb2"/><feDisplacementMap in="colored" in2="turb2" scale="' + turbScale + '" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<linearGradient id="diEdgeFadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="5%" stop-color="white" stop-opacity="1"/><stop offset="95%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>' +
      '<mask id="diVFade"><rect width="' + W + '" height="' + H + '" fill="url(#diEdgeFadeV)"/></mask>' +
    '</defs>';
  }

  // ── Glass Panel (bold strokes, dual accent lines) ─────────
  function glassPanel(x, y, w, h, r, pal, opacity, delay, isLight) {
    opacity = opacity || 0.7;
    var sw = isLight ? 1.2 : 1.5;
    var aOp = isLight ? 0.25 : 0.4;
    var svg = '<g opacity="0">';
    if (typeof delay === 'number') {
      svg = '<g opacity="0"><animate attributeName="opacity" from="0" to="' + opacity + '" dur="0.4s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>';
    }
    svg += '<rect x="' + F(x) + '" y="' + F(y) + '" width="' + F(w) + '" height="' + F(h) + '" rx="' + r + '" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + sw + '" filter="url(#diGlass)"/>';
    svg += '<line x1="' + F(x + r) + '" y1="' + F(y + 0.5) + '" x2="' + F(x + w - r) + '" y2="' + F(y + 0.5) + '" stroke="' + pal.primary + '" stroke-opacity="' + aOp + '" stroke-width="0.8"/>';
    svg += '<line x1="' + F(x + r) + '" y1="' + F(y + h - 0.5) + '" x2="' + F(x + w - r) + '" y2="' + F(y + h - 0.5) + '" stroke="' + pal.primary + '" stroke-opacity="' + (aOp * 0.5).toFixed(2) + '" stroke-width="0.5"/>';
    svg += '</g>';
    return svg;
  }

  // ── Ambient Particles (large, bright) ─────────────────────
  function ambientParticles(count, pal, isLight) {
    var svg = '';
    var pk = isLight ? 0.35 : 0.5;
    var flt = isLight ? ' filter="url(#diGlowSoft)"' : '';
    for (var i = 0; i < count; i++) {
      var px = rand(0, W), py = rand(0, H), sz = rand(1.5, 4);
      var dur = rand(5, 12).toFixed(1), dl = rand(0, 3).toFixed(2), dr = rand(-100, 100);
      svg += '<circle cx="' + F(px) + '" cy="' + F(py) + '" r="' + F(sz) + '" fill="' + pal.primary + '" opacity="0"' + flt + '>' +
        '<animate attributeName="opacity" values="0;' + pk + ';' + (pk * 0.3).toFixed(2) + ';' + (pk * 0.7).toFixed(2) + ';0" dur="' + dur + 's" begin="' + dl + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="cy" from="' + F(py) + '" to="' + F(py - 120) + '" dur="' + dur + 's" begin="' + dl + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="cx" from="' + F(px) + '" to="' + F(px + dr) + '" dur="' + dur + 's" begin="' + dl + 's" repeatCount="indefinite"/></circle>';
    }
    return svg;
  }

  // ── Typewriter Label (larger, bolder, glowing) ────────────
  function typewriterLabel(text, x, y, pal, beginTime, isLight) {
    var fill, maxOp, filterAttr, fontSize, fontWeight;
    if (isLight) {
      fill = pal.primary;
      maxOp = '1';
      filterAttr = '';
      fontSize = '14';
      fontWeight = '700';
    } else {
      fill = pal.primary;
      maxOp = '0.8';
      filterAttr = ' filter="url(#diGlowSoft)"';
      fontSize = '12';
      fontWeight = '500';
    }
    var svg = '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="' + fontSize + '" letter-spacing="8" font-weight="' + fontWeight + '"' + filterAttr + '>';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i] === ' ' ? '&#160;' : text[i];
      var d = (beginTime + i * 0.05).toFixed(2);
      svg += '<tspan fill="' + fill + '" fill-opacity="0">' + ch +
        '<animate attributeName="fill-opacity" from="0" to="' + maxOp + '" dur="0.12s" begin="' + d + 's" fill="freeze"/>' +
        '<animate attributeName="fill-opacity" from="' + maxOp + '" to="0" dur="0.4s" begin="3.2s" fill="freeze"/></tspan>';
    }
    svg += '</text>';
    return svg;
  }

  // ── Radial Burst (dramatic entrance rays) ─────────────────
  function radialBurst(cx, cy, pal, count, maxR, delay, isLight) {
    var svg = '', sw = isLight ? 2 : 3, op = isLight ? 0.6 : 0.8;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var ex = cx + Math.cos(a) * maxR, ey = cy + Math.sin(a) * maxR;
      svg += '<line x1="' + F(cx) + '" y1="' + F(cy) + '" x2="' + F(cx) + '" y2="' + F(cy) + '" stroke="' + pal.primary + '" stroke-width="' + sw + '" stroke-opacity="0" stroke-linecap="round">' +
        '<animate attributeName="x2" to="' + F(ex) + '" dur="0.35s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
        '<animate attributeName="y2" to="' + F(ey) + '" dur="0.35s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
        '<animate attributeName="stroke-opacity" values="0;' + op + ';0" dur="0.6s" begin="' + delay.toFixed(2) + 's" fill="freeze"/></line>';
    }
    return svg;
  }

  // ── Scan Line (horizontal sweep) ──────────────────────────
  function scanLine(pal, delay, isLight) {
    var op = isLight ? 0.3 : 0.5;
    return '<line x1="0" y1="0" x2="' + W + '" y2="0" stroke="' + pal.primary + '" stroke-width="2" stroke-opacity="0">' +
      '<animate attributeName="y1" from="0" to="' + H + '" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
      '<animate attributeName="y2" from="0" to="' + H + '" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
      '<animate attributeName="stroke-opacity" values="0;' + op + ';' + op + ';0" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/></line>';
  }

  // ── Rain Overlay (boosted) ────────────────────────────────
  function rainOverlay(w, h, pal, isLight) {
    if (!pal) return '';
    var cols = Math.floor(w / 25);
    if (MOB) cols = Math.floor(cols * 0.6);
    var sOp = isLight ? 0.22 : 0.18;
    var lines = '';
    for (var i = 0; i < cols; i++) {
      var x = (i + 0.5) * 25, dl = rand(0, 2).toFixed(2), dur = rand(1, 1.8).toFixed(2);
      var dL = Math.floor(rand(10, 28));
      lines += '<line x1="' + x + '" y1="-20" x2="' + x + '" y2="' + (h + 20) + '" stroke="' + pal.primary + '" stroke-opacity="' + sOp + '" stroke-width="1.2" stroke-dasharray="' + dL + ' ' + (dL * 3) + '"><animate attributeName="stroke-dashoffset" from="0" to="-' + (dL * 4) + '" dur="' + dur + 's" begin="' + dl + 's" repeatCount="indefinite"/></line>';
    }
    return '<g class="di-rain" opacity="0.7">' + lines + '</g>';
  }

  // ── Storm Flash (boosted) ─────────────────────────────────
  function stormFlash(w, h, pal, isLight) {
    var color = isLight ? '#000000' : pal.secondary;
    return '<rect width="' + w + '" height="' + h + '" fill="' + color + '" opacity="0"><animate attributeName="opacity" values="0;0;' + (isLight ? '0.06' : '0.18') + ';0;0;0;' + (isLight ? '0.03' : '0.08') + ';0" dur="2.5s" begin="0.5s" repeatCount="indefinite"/></rect>';
  }

  // ── Shockwave (boosted) ───────────────────────────────────
  function shockwave(cx, cy, pal, delay, maxR, isLight) {
    maxR = maxR || Math.max(W, H) * 0.6;
    var sw = isLight ? 2 : 4, op = isLight ? 0.5 : 0.9;
    return '<circle cx="' + cx + '" cy="' + cy + '" r="0" fill="none" stroke="' + pal.primary + '" stroke-width="' + sw + '" stroke-opacity="0" stroke-dasharray="8 12">' +
      '<animate attributeName="r" from="0" to="' + F(maxR) + '" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
      '<animate attributeName="stroke-opacity" values="0;' + op + ';' + (op * 0.3).toFixed(2) + ';0" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/>' +
      '<animate attributeName="stroke-width" from="' + sw + '" to="0.5" dur="0.8s" begin="' + delay.toFixed(2) + 's" fill="freeze"/></circle>';
  }

  // ══════════════════════════════════════════════════════════════
  //  SCENE 1: NEURAL IGNITION (Morning, 05:00-11:59)
  // ══════════════════════════════════════════════════════════════
  function sceneInitialization(atmo, temp, wind, isLight) {
    dims();
    var pal = getPalette(atmo, isLight);
    var cx = W / 2, cy = H / 2, svg = '', maxDim = Math.max(W, H);

    // ACT 1: IGNITION (0-0.4s)
    svg += radialBurst(cx, cy, pal, 16, maxDim * 0.6, 0.0, isLight);
    svg += shockwave(cx, cy, pal, 0.05, maxDim * 0.55, isLight);
    svg += shockwave(cx, cy, pal, 0.15, maxDim * 0.7, isLight);
    var flashR = Math.min(W, H) * 0.15;
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(flashR) + '" fill="' + pal.primary + '" opacity="0" filter="url(#diGlowHot)"><animate attributeName="opacity" values="0;' + (isLight ? '0.4' : '0.8') + ';0" dur="0.4s" begin="0s" fill="freeze"/></circle>';

    // ACT 2: FIBONACCI SPIRAL NETWORK (0.4-2.5s)
    var nodeCount = MOB ? 24 : 40;
    var spacing = Math.min(W, H) * (MOB ? 0.035 : 0.028);
    var prevX = cx, prevY = cy;
    var lineSW = isLight ? 1.5 : 2, lineOp = isLight ? 0.7 : 0.9;
    var dashOp = isLight ? 0.5 : 0.7, dotOp = isLight ? 0.7 : 1;

    for (var n = 0; n < nodeCount; n++) {
      var theta = n * 2.399963;
      var rr = Math.sqrt(n + 1) * spacing;
      var nx = cx + Math.cos(theta) * rr, ny = cy + Math.sin(theta) * rr;
      var nd = (0.4 + n * 0.04).toFixed(2);

      if (n > 0) {
        svg += '<line x1="' + F(prevX) + '" y1="' + F(prevY) + '" x2="' + F(prevX) + '" y2="' + F(prevY) + '" stroke="' + pal.primary + '" stroke-width="' + lineSW + '" stroke-opacity="0" filter="url(#diGlowSoft)">' +
          '<animate attributeName="x2" to="' + F(nx) + '" dur="0.15s" begin="' + nd + 's" fill="freeze"/><animate attributeName="y2" to="' + F(ny) + '" dur="0.15s" begin="' + nd + 's" fill="freeze"/>' +
          '<animate attributeName="stroke-opacity" from="0" to="' + lineOp + '" dur="0.15s" begin="' + nd + 's" fill="freeze"/></line>';
        var fd = (parseFloat(nd) + 0.15).toFixed(2);
        svg += '<line x1="' + F(prevX) + '" y1="' + F(prevY) + '" x2="' + F(nx) + '" y2="' + F(ny) + '" stroke="' + pal.tertiary + '" stroke-width="' + (isLight ? '1' : '1.5') + '" stroke-opacity="0" stroke-dasharray="6 10">' +
          '<animate attributeName="stroke-opacity" from="0" to="' + dashOp + '" dur="0.2s" begin="' + fd + 's" fill="freeze"/>' +
          '<animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1.5s" begin="' + fd + 's" repeatCount="indefinite"/></line>';
      }

      svg += '<rect x="' + F(nx - 6) + '" y="' + F(ny - 4) + '" width="12" height="8" rx="3" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + (isLight ? '0.8' : '1') + '" opacity="0" filter="url(#diGlass)">' +
        '<animate attributeName="opacity" from="0" to="0.9" dur="0.15s" begin="' + nd + 's" fill="freeze"/></rect>';
      svg += '<circle cx="' + F(nx) + '" cy="' + F(ny) + '" r="3" fill="' + pal.primary + '" opacity="0" filter="url(#diGlow)"><animate attributeName="opacity" from="0" to="' + dotOp + '" dur="0.1s" begin="' + nd + 's" fill="freeze"/></circle>';
      prevX = nx; prevY = ny;
    }

    svg += scanLine(pal, 0.6, isLight);

    // Faint perspective grid
    var gOp = isLight ? 0.06 : 0.04, gs = MOB ? 50 : 36, gridSvg = '';
    for (var gi = 0; gi <= Math.ceil(W / gs) + 1; gi++) gridSvg += '<line x1="' + F(gi * gs) + '" y1="0" x2="' + F(gi * gs) + '" y2="' + H + '" stroke="' + pal.primary + '" stroke-opacity="' + gOp + '" stroke-width="0.5"/>';
    for (var gj = 0; gj <= Math.ceil(H / gs) + 1; gj++) gridSvg += '<line x1="0" y1="' + F(gj * gs) + '" x2="' + W + '" y2="' + F(gj * gs) + '" stroke="' + pal.primary + '" stroke-opacity="' + gOp + '" stroke-width="0.5"/>';
    svg = '<g mask="url(#diVFade)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.6s" fill="freeze"/>' + gridSvg + '</g>' + svg;

    // 4 HUD panels sliding in
    var pw = MOB ? 90 : 130, ph = MOB ? 32 : 40, pm = MOB ? 12 : 24;
    svg += '<g transform="translate(-' + (pw + pm) + ',0)"><animateTransform attributeName="transform" type="translate" from="-' + (pw + pm) + ',0" to="0,0" dur="0.5s" begin="0.5s" fill="freeze"/>' + glassPanel(pm, pm, pw, ph, 6, pal, 0.8, 0.5, isLight) + '</g>';
    svg += '<g transform="translate(' + (pw + pm) + ',0)"><animateTransform attributeName="transform" type="translate" from="' + (pw + pm) + ',0" to="0,0" dur="0.5s" begin="0.6s" fill="freeze"/>' + glassPanel(W - pm - pw, pm, pw, ph, 6, pal, 0.8, 0.6, isLight) + '</g>';
    svg += '<g transform="translate(-' + (pw + pm) + ',0)"><animateTransform attributeName="transform" type="translate" from="-' + (pw + pm) + ',0" to="0,0" dur="0.5s" begin="0.7s" fill="freeze"/>' + glassPanel(pm, H - pm - ph, pw, ph, 6, pal, 0.8, 0.7, isLight) + '</g>';
    svg += '<g transform="translate(' + (pw + pm) + ',0)"><animateTransform attributeName="transform" type="translate" from="' + (pw + pm) + ',0" to="0,0" dur="0.5s" begin="0.8s" fill="freeze"/>' + glassPanel(W - pm - pw, H - pm - ph, pw, ph, 6, pal, 0.8, 0.8, isLight) + '</g>';

    // ACT 3: Central emblem
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="20" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="1.5" filter="url(#diGlass)" opacity="0"><animate attributeName="opacity" from="0" to="0.9" dur="0.3s" begin="0.1s" fill="freeze"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + pal.primary + '" filter="url(#diGlowHot)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="0.1s" fill="freeze"/><animate attributeName="r" values="5;9;5" dur="2s" begin="0.3s" repeatCount="indefinite"/></circle>';
    svg += '<line x1="' + F(cx - 14) + '" y1="' + cy + '" x2="' + F(cx + 14) + '" y2="' + cy + '" stroke="' + pal.primary + '" stroke-width="1" stroke-opacity="0"><animate attributeName="stroke-opacity" from="0" to="0.5" dur="0.3s" begin="2.5s" fill="freeze"/></line>';
    svg += '<line x1="' + cx + '" y1="' + F(cy - 14) + '" x2="' + cx + '" y2="' + F(cy + 14) + '" stroke="' + pal.primary + '" stroke-width="1" stroke-opacity="0"><animate attributeName="stroke-opacity" from="0" to="0.5" dur="0.3s" begin="2.5s" fill="freeze"/></line>';

    svg += ambientParticles(MOB ? 20 : 40, pal, isLight);
    if (atmo === 'rain') svg += rainOverlay(W, H, pal, isLight);
    if (atmo === 'storm') svg += stormFlash(W, H, pal, isLight);
    if (atmo === 'clear') {
      svg += '<circle cx="' + F(W * 0.75) + '" cy="' + F(H * 0.2) + '" r="' + F(Math.min(W, H) * 0.2) + '" fill="url(#diLensFlare)" opacity="0"><animate attributeName="opacity" from="0" to="' + (isLight ? '0.12' : '0.5') + '" dur="1s" begin="0.5s" fill="freeze"/></circle>';
    }
    return svg;
  }

  // ══════════════════════════════════════════════════════════════
  //  SCENE 2: QUANTUM FORGE (Midday, 12:00-16:59)
  // ══════════════════════════════════════════════════════════════
  function sceneMeshRouter(atmo, temp, wind, isLight) {
    dims();
    var pal = getPalette(atmo, isLight);
    var cx = W / 2, cy = H / 2;
    var ringR = Math.min(W, H) * (MOB ? 0.3 : 0.26);
    var svg = '', speed = pal.speed;
    var gAttr = atmo === 'storm' ? ' filter="url(#diGlitch)"' : '';

    // ACT 1: ACTIVATION
    svg += '<rect width="' + W + '" height="' + H + '" fill="' + (isLight ? pal.primary : 'white') + '" opacity="0"><animate attributeName="opacity" values="0;' + (isLight ? '0.06' : '0.15') + ';0" dur="0.3s" begin="0s" fill="freeze"/></rect>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="0" fill="' + pal.primary + '" filter="url(#diGlowHot)" opacity="1"><animate attributeName="r" from="0" to="10" dur="0.3s" begin="0s" fill="freeze"/></circle>';

    // Glass observation frame
    var fW = Math.min(W * 0.72, ringR * 3.4), fH = Math.min(H * 0.65, ringR * 3.4);
    svg += '<rect x="' + F(cx - fW / 2) + '" y="' + F(cy - fH / 2) + '" width="' + F(fW) + '" height="' + F(fH) + '" rx="16" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + (isLight ? '1' : '1.5') + '" filter="url(#diGlass)" opacity="0"><animate attributeName="opacity" from="0" to="0.7" dur="0.5s" begin="0.2s" fill="freeze"/></rect>';

    // ACT 2: 5 Gyroscope rings (THICK)
    var rSW = isLight ? 1.5 : 1, rOp = isLight ? 0.7 : 0.85, tOp = isLight ? 0.3 : 0.4;
    var configs = [
      { r: ringR, dur: 8, color: pal.primary, dash: '20 8', sw: 3 * rSW },
      { r: ringR * 0.88, dur: 11, color: pal.secondary, dash: '14 6', sw: 2.5 * rSW },
      { r: ringR * 0.76, dur: 14, color: pal.tertiary, dash: '10 10', sw: 2 * rSW },
      { r: ringR * 1.12, dur: 18, color: pal.primary, dash: '6 14', sw: 1.5 * rSW },
      { r: ringR * 0.62, dur: 7, color: pal.secondary, dash: '24 4', sw: 2 * rSW }
    ];
    for (var ri = 0; ri < configs.length; ri++) {
      var rc = configs[ri], rd = (rc.dur / speed).toFixed(1);
      svg += '<g style="transform-origin:' + cx + 'px ' + cy + 'px;animation:diRotate' + ri + ' ' + rd + 's linear infinite" opacity="0"' + gAttr + '>' +
        '<animate attributeName="opacity" from="0" to="0.85" dur="0.4s" begin="' + (0.3 + ri * 0.15).toFixed(2) + 's" fill="freeze"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(rc.r) + '" fill="none" stroke="' + rc.color + '" stroke-width="' + rc.sw + '" stroke-opacity="' + rOp + '" stroke-dasharray="' + rc.dash + '" filter="url(#diGlassEdge)">' +
        '<animate attributeName="stroke-dashoffset" from="0" to="-' + Math.floor(rc.r * 3) + '" dur="' + rd + 's" repeatCount="indefinite"/></circle>';
      var ticks = MOB ? 10 : 18;
      for (var ti = 0; ti < ticks; ti++) {
        var ta = (ti / ticks) * Math.PI * 2;
        svg += '<line x1="' + F(cx + Math.cos(ta) * (rc.r - 4)) + '" y1="' + F(cy + Math.sin(ta) * (rc.r - 4)) + '" x2="' + F(cx + Math.cos(ta) * (rc.r + 4)) + '" y2="' + F(cy + Math.sin(ta) * (rc.r + 4)) + '" stroke="' + rc.color + '" stroke-opacity="' + tOp + '" stroke-width="0.6"/>';
      }
      svg += '</g>';
    }

    // Core containment
    var coreR = ringR * 0.3;
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(coreR) + '" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + (isLight ? '1' : '1.5') + '" filter="url(#diGlass)" opacity="0"><animate attributeName="opacity" from="0" to="0.9" dur="0.4s" begin="0.4s" fill="freeze"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(coreR * 0.7) + '" fill="none" stroke="' + pal.primary + '" stroke-width="2" stroke-opacity="0" stroke-dasharray="6 4"><animate attributeName="stroke-opacity" from="0" to="' + (isLight ? '0.6' : '0.85') + '" dur="0.3s" begin="0.5s" fill="freeze"/><animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="360 ' + cx + ' ' + cy + '" dur="5s" repeatCount="indefinite"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + pal.primary + '" filter="url(#diGlow)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="0.4s" fill="freeze"/><animate attributeName="r" values="8;16;8" dur="1.8s" begin="0.5s" repeatCount="indefinite"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + pal.primary + '" filter="url(#diGlowHot)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="0.4s" fill="freeze"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(coreR * 1.6) + '" fill="url(#diLensFlare)" opacity="0"><animate attributeName="opacity" values="' + (isLight ? '0;0.15;0;0.1;0' : '0;0.4;0;0.3;0') + '" dur="2.5s" begin="0.6s" repeatCount="indefinite"/></circle>';

    // 12 Energy arcs
    var arcN = MOB ? 6 : 12;
    for (var ai = 0; ai < arcN; ai++) {
      var a1 = rand(0, Math.PI * 2), a2 = a1 + rand(0.8, 2);
      var ar1 = ringR * rand(0.35, 0.9), ar2 = ringR * rand(0.35, 0.9);
      var ax1 = cx + Math.cos(a1) * ar1, ay1 = cy + Math.sin(a1) * ar1;
      var ax2 = cx + Math.cos(a2) * ar2, ay2 = cy + Math.sin(a2) * ar2;
      var amid = (a1 + a2) / 2, acp = ringR * rand(0.15, 0.55);
      var arcP = 'M' + F(ax1) + ',' + F(ay1) + ' Q' + F(cx + Math.cos(amid) * acp) + ',' + F(cy + Math.sin(amid) * acp) + ' ' + F(ax2) + ',' + F(ay2);
      var arcL = Math.sqrt(Math.pow(ax2 - ax1, 2) + Math.pow(ay2 - ay1, 2)) * 1.3;
      var adl = rand(0.5, 2).toFixed(2);
      svg += '<path d="' + arcP + '" fill="none" stroke="' + pal.primary + '" stroke-width="' + (isLight ? '1.8' : '2.5') + '" stroke-opacity="0" stroke-linecap="round" stroke-dasharray="' + F(arcL) + '" stroke-dashoffset="' + F(arcL) + '" filter="url(#diGlowSoft)">' +
        '<animate attributeName="stroke-opacity" from="0" to="' + (isLight ? '0.7' : '0.9') + '" dur="0.15s" begin="' + adl + 's" fill="freeze"/>' +
        '<animate attributeName="stroke-dashoffset" from="' + F(arcL) + '" to="0" dur="0.5s" begin="' + adl + 's" fill="freeze"/>' +
        '<animate attributeName="stroke-opacity" from="' + (isLight ? '0.7' : '0.9') + '" to="' + (isLight ? '0.2' : '0.15') + '" dur="0.8s" begin="' + (parseFloat(adl) + 0.5).toFixed(2) + 's" fill="freeze"/></path>';
    }

    // 18 Comet particles with 3 trail ghosts
    var pCount = MOB ? 10 : 18;
    for (var pi = 0; pi < pCount; pi++) {
      var oR = ringR * rand(0.25, 0.85), pA = (pi / pCount) * 360;
      var pD = rand(2.5, 5).toFixed(1), pdl = rand(0, 1.5).toFixed(2);
      var ppx = cx + Math.cos(pA * Math.PI / 180) * oR, ppy = cy + Math.sin(pA * Math.PI / 180) * oR;
      svg += '<circle cx="' + F(ppx) + '" cy="' + F(ppy) + '" r="2.5" fill="' + pal.primary + '" opacity="' + (isLight ? '0.7' : '1') + '"><animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="360 ' + cx + ' ' + cy + '" dur="' + pD + 's" begin="' + pdl + 's" repeatCount="indefinite"/></circle>';
      for (var gh = 1; gh <= 3; gh++) {
        var gA = pA - gh * 6, gpx = cx + Math.cos(gA * Math.PI / 180) * oR, gpy = cy + Math.sin(gA * Math.PI / 180) * oR;
        var gOp = Math.max(0.05, (isLight ? 0.35 : 0.5) - gh * (isLight ? 0.08 : 0.12));
        svg += '<circle cx="' + F(gpx) + '" cy="' + F(gpy) + '" r="' + F(2.5 - gh * 0.4) + '" fill="' + pal.primary + '" opacity="' + gOp.toFixed(2) + '" filter="url(#diTrail)"><animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="360 ' + cx + ' ' + cy + '" dur="' + pD + 's" begin="' + pdl + 's" repeatCount="indefinite"/></circle>';
      }
    }

    // Floating data labels
    if (!MOB) {
      var labels = ['0x4F', 'ACK', 'SYN', 'RTT', 'TCP', 'TTL'];
      for (var lb = 0; lb < labels.length; lb++) {
        var la = (lb / labels.length) * Math.PI * 2, lr = ringR * rand(0.92, 1.2);
        var lx = cx + Math.cos(la) * lr, ly = cy + Math.sin(la) * lr, ld = rand(7, 12).toFixed(1);
        svg += '<g opacity="0"><animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="360 ' + cx + ' ' + cy + '" dur="' + ld + 's" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;' + (isLight ? '0.3' : '0.5') + ';' + (isLight ? '0.2' : '0.35') + ';0" dur="' + ld + 's" repeatCount="indefinite"/>' +
          '<rect x="' + F(lx - 16) + '" y="' + F(ly - 7) + '" width="32" height="14" rx="3" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="0.5"/>' +
          '<text x="' + F(lx) + '" y="' + F(ly + 3) + '" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="9" fill="' + pal.primary + '" fill-opacity="' + (isLight ? '0.6' : '0.8') + '">' + labels[lb] + '</text></g>';
      }
    }

    svg += ambientParticles(MOB ? 12 : 24, pal, isLight);
    if (atmo === 'rain') svg += rainOverlay(W, H, pal, isLight);
    if (atmo === 'storm') svg += stormFlash(W, H, pal, isLight);
    return svg;
  }

  // ══════════════════════════════════════════════════════════════
  //  SCENE 3: CONVERGENCE PROTOCOL (Dusk, 17:00-20:59)
  // ══════════════════════════════════════════════════════════════
  function sceneGoldenBridge(atmo, temp, wind, isLight) {
    dims();
    var pal = getPalette(atmo, isLight);
    var svg = '', groundY = H * 0.58;
    var blurF = atmo === 'cloud' ? ' filter="url(#diBlur)"' : '';
    var pm = MOB ? 8 : 18, panW = W * 0.37, panH = H * 0.48, panY = groundY - panH * 0.4;

    // ACT 1: TOWERS RISE
    var colSW = isLight ? 3 : 6, colOp = isLight ? 0.4 : 0.7, colFade = isLight ? 0.1 : 0.15;
    svg += '<line x1="' + F(pm + panW * 0.5) + '" y1="' + H + '" x2="' + F(pm + panW * 0.5) + '" y2="' + H + '" stroke="' + pal.primary + '" stroke-width="' + colSW + '" stroke-opacity="0" filter="url(#diGlow)">' +
      '<animate attributeName="y2" from="' + H + '" to="' + F(panY) + '" dur="0.4s" begin="0s" fill="freeze"/><animate attributeName="stroke-opacity" from="0" to="' + colOp + '" dur="0.3s" begin="0s" fill="freeze"/><animate attributeName="stroke-opacity" from="' + colOp + '" to="' + colFade + '" dur="0.5s" begin="0.5s" fill="freeze"/></line>';
    var rPX = W - pm - panW;
    svg += '<line x1="' + F(rPX + panW * 0.5) + '" y1="' + H + '" x2="' + F(rPX + panW * 0.5) + '" y2="' + H + '" stroke="' + pal.secondary + '" stroke-width="' + colSW + '" stroke-opacity="0" filter="url(#diGlow)">' +
      '<animate attributeName="y2" from="' + H + '" to="' + F(panY) + '" dur="0.4s" begin="0.1s" fill="freeze"/><animate attributeName="stroke-opacity" from="0" to="' + colOp + '" dur="0.3s" begin="0.1s" fill="freeze"/><animate attributeName="stroke-opacity" from="' + colOp + '" to="' + colFade + '" dur="0.5s" begin="0.6s" fill="freeze"/></line>';

    // Glass terrain panels
    var pSW = isLight ? 1 : 1.5, gOp1 = isLight ? 0.15 : 0.1, gOp2 = isLight ? 0.12 : 0.08, gSt = MOB ? 22 : 16;
    svg += '<g' + blurF + '><rect x="' + F(pm) + '" y="' + F(panY) + '" width="' + F(panW) + '" height="' + F(panH) + '" rx="10" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + pSW + '" filter="url(#diGlass)" opacity="0"><animate attributeName="opacity" from="0" to="' + (isLight ? '0.8' : '1') + '" dur="0.4s" begin="0.2s" fill="freeze"/></rect>';
    for (var gx = pm + gSt; gx < pm + panW; gx += gSt) svg += '<line x1="' + F(gx) + '" y1="' + F(panY + 8) + '" x2="' + F(gx) + '" y2="' + F(panY + panH - 8) + '" stroke="' + pal.primary + '" stroke-opacity="' + gOp1 + '" stroke-width="0.8"/>';
    for (var gy = panY + gSt; gy < panY + panH; gy += gSt) svg += '<line x1="' + F(pm + 8) + '" y1="' + F(gy) + '" x2="' + F(pm + panW - 8) + '" y2="' + F(gy) + '" stroke="' + pal.primary + '" stroke-opacity="' + gOp2 + '" stroke-width="0.8"/>';
    svg += '</g>';
    svg += '<g' + blurF + '><rect x="' + F(rPX) + '" y="' + F(panY) + '" width="' + F(panW) + '" height="' + F(panH) + '" rx="10" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="' + pSW + '" filter="url(#diGlass)" opacity="0"><animate attributeName="opacity" from="0" to="' + (isLight ? '0.8' : '1') + '" dur="0.4s" begin="0.3s" fill="freeze"/></rect>';
    for (var gx2 = rPX + gSt; gx2 < rPX + panW; gx2 += gSt) svg += '<line x1="' + F(gx2) + '" y1="' + F(panY + 8) + '" x2="' + F(gx2) + '" y2="' + F(panY + panH - 8) + '" stroke="' + pal.secondary + '" stroke-opacity="' + gOp1 + '" stroke-width="0.8"/>';
    for (var gy2 = panY + gSt; gy2 < panY + panH; gy2 += gSt) svg += '<line x1="' + F(rPX + 8) + '" y1="' + F(gy2) + '" x2="' + F(rPX + panW - 8) + '" y2="' + F(gy2) + '" stroke="' + pal.secondary + '" stroke-opacity="' + gOp2 + '" stroke-width="0.8"/>';
    svg += '</g>';

    // ACT 2: 7-STRAND BRIDGE
    var bS = pm + panW - 5, bE = rPX + 5, bM = W * 0.5, bP = groundY - Math.min(W, H) * 0.2;
    var drawDur = (1.2 / pal.speed).toFixed(1);
    var strands = [
      { off: 0, sw: isLight ? 3 : 4, op: isLight ? 0.85 : 0.95 },
      { off: -10, sw: isLight ? 2 : 2.5, op: isLight ? 0.55 : 0.65 },
      { off: 10, sw: isLight ? 2 : 2.5, op: isLight ? 0.55 : 0.65 },
      { off: -22, sw: 1.5, op: isLight ? 0.35 : 0.4 },
      { off: 22, sw: 1.5, op: isLight ? 0.35 : 0.4 },
      { off: -34, sw: 1, op: isLight ? 0.2 : 0.25 },
      { off: 34, sw: 1, op: isLight ? 0.2 : 0.25 }
    ];
    for (var si = 0; si < strands.length; si++) {
      var st = strands[si], pk = bP + st.off;
      var sP = 'M' + F(bS) + ',' + F(groundY) + ' Q' + F(bM) + ',' + F(pk) + ' ' + F(bE) + ',' + F(groundY);
      var sL = Math.sqrt(Math.pow(bE - bS, 2) + Math.pow(groundY - pk, 2)) * 1.4;
      var sdl = (0.5 + si * 0.06).toFixed(2);
      svg += '<path d="' + sP + '" fill="none" stroke="' + pal.primary + '" stroke-width="' + st.sw + '" stroke-opacity="0" stroke-linecap="round"' + (si === 0 ? ' filter="url(#diGlassEdge)"' : '') + ' stroke-dasharray="' + F(sL) + '" stroke-dashoffset="' + F(sL) + '">' +
        '<animate attributeName="stroke-opacity" from="0" to="' + st.op + '" dur="0.2s" begin="' + sdl + 's" fill="freeze"/><animate attributeName="stroke-dashoffset" from="' + F(sL) + '" to="0" dur="' + drawDur + 's" begin="' + sdl + 's" fill="freeze"/></path>';
    }

    // Mid-point shockwave
    var shDl = 0.5 + parseFloat(drawDur);
    svg += shockwave(bM, bP, pal, shDl, Math.min(W, H) * 0.3, isLight);

    // 8 tracer particles
    var mainP = 'M' + F(bS) + ',' + F(groundY) + ' Q' + F(bM) + ',' + F(bP) + ' ' + F(bE) + ',' + F(groundY);
    var tC = MOB ? 4 : 8;
    for (var di = 0; di < tC; di++) {
      var dDur = rand(1.2, 2).toFixed(1), ddl = (shDl + di * 0.25).toFixed(2);
      svg += '<circle r="4" fill="' + pal.primary + '" opacity="0" filter="url(#diGlow)"><animateMotion path="' + mainP + '" dur="' + dDur + 's" begin="' + ddl + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;' + (isLight ? '0.7' : '1') + ';' + (isLight ? '0.7' : '1') + ';0" dur="' + dDur + 's" begin="' + ddl + 's" repeatCount="indefinite"/></circle>';
      svg += '<circle r="2" fill="' + pal.primary + '" opacity="0" filter="url(#diTrail)"><animateMotion path="' + mainP + '" dur="' + dDur + 's" begin="' + (parseFloat(ddl) + 0.06).toFixed(2) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;' + (isLight ? '0.35' : '0.5') + ';' + (isLight ? '0.35' : '0.5') + ';0" dur="' + dDur + 's" begin="' + (parseFloat(ddl) + 0.06).toFixed(2) + 's" repeatCount="indefinite"/></circle>';
    }

    // Endpoint nodes
    svg += '<circle cx="' + F(bS) + '" cy="' + F(groundY) + '" r="8" fill="' + pal.primary + '" opacity="0" filter="url(#diGlowHot)"><animate attributeName="opacity" from="0" to="' + (isLight ? '0.7' : '1') + '" dur="0.3s" begin="0.5s" fill="freeze"/></circle>';
    svg += '<circle cx="' + F(bE) + '" cy="' + F(groundY) + '" r="8" fill="' + pal.secondary + '" opacity="0" filter="url(#diGlowHot)"><animate attributeName="opacity" from="0" to="' + (isLight ? '0.7' : '1') + '" dur="0.3s" begin="' + (shDl - 0.1).toFixed(2) + 's" fill="freeze"/></circle>';

    // 16 glass fragments
    var fC = MOB ? 8 : 16, fPk = isLight ? 0.5 : 0.8;
    for (var fi = 0; fi < fC; fi++) {
      var fx = rand(pm, W - pm), fy = rand(groundY - 30, groundY + panH * 0.3), fSz = rand(6, 18);
      var fDur = rand(3, 7).toFixed(1), fdl = rand(0.8, 2.5).toFixed(2);
      svg += '<rect x="' + F(fx) + '" y="' + F(fy) + '" width="' + F(fSz) + '" height="' + F(fSz * 0.6) + '" rx="2" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="0.5" opacity="0" transform="rotate(' + Math.floor(rand(-40, 40)) + ' ' + F(fx) + ' ' + F(fy) + ')">' +
        '<animate attributeName="opacity" values="0;' + fPk + ';' + (fPk * 0.5).toFixed(2) + ';0" dur="' + fDur + 's" begin="' + fdl + 's" repeatCount="indefinite"/><animate attributeName="y" from="' + F(fy) + '" to="' + F(fy - 80) + '" dur="' + fDur + 's" begin="' + fdl + 's" repeatCount="indefinite"/></rect>';
    }

    // Horizon glow
    svg += '<rect x="0" y="' + F(groundY - 25) + '" width="' + W + '" height="50" fill="url(#diLensFlare)" opacity="0"><animate attributeName="opacity" values="' + (isLight ? '0;0.08;0.04;0.06;0' : '0;0.25;0.12;0.18;0') + '" dur="3.5s" begin="0.5s" repeatCount="indefinite"/></rect>';

    // ACT 3: Info cards
    var cW = MOB ? 50 : 70, cH = MOB ? 20 : 26;
    svg += glassPanel(bS - cW / 2, groundY + 14, cW, cH, 5, pal, 1.0, shDl + 0.2, isLight);
    svg += glassPanel(bE - cW / 2, groundY + 14, cW, cH, 5, pal, 1.0, shDl + 0.4, isLight);

    svg += ambientParticles(MOB ? 12 : 22, pal, isLight);
    if (atmo === 'rain') svg += rainOverlay(W, H, pal, isLight);
    if (atmo === 'storm') svg += stormFlash(W, H, pal, isLight);
    return svg;
  }

  // ══════════════════════════════════════════════════════════════
  //  SCENE 4: GENESIS LATTICE (Night, 21:00-04:59)
  // ══════════════════════════════════════════════════════════════
  function sceneLedger(atmo, temp, wind, isLight) {
    dims();
    var pal = getPalette(atmo, isLight);
    var svg = '', hexR = MOB ? 30 : 26;
    var hexH = hexR * Math.sqrt(3);
    var cols = Math.ceil(W / (hexR * 3)) + 2, rows = Math.ceil(H / hexH) + 2;
    var cx = W / 2, cy = H / 2, maxDist = Math.sqrt(cx * cx + cy * cy);

    function hexPts(hx, hy, r) {
      var pts = [];
      for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; pts.push(F(hx + Math.cos(a) * r) + ',' + F(hy + Math.sin(a) * r)); }
      return pts.join(' ');
    }

    // ACT 1: FAST SCAN (0-1.0s)
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="0" fill="none" stroke="' + pal.primary + '" stroke-width="' + (isLight ? '2' : '4') + '" stroke-opacity="0" stroke-dasharray="8 6">' +
      '<animate attributeName="r" from="0" to="' + F(maxDist) + '" dur="0.8s" begin="0s" fill="freeze"/><animate attributeName="stroke-opacity" values="0;' + (isLight ? '0.6' : '0.9') + ';' + (isLight ? '0.3' : '0.4') + ';0" dur="0.8s" begin="0s" fill="freeze"/></circle>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="0" fill="none" stroke="' + pal.tertiary + '" stroke-width="1" stroke-opacity="0"><animate attributeName="r" from="0" to="' + F(maxDist) + '" dur="0.9s" begin="0.05s" fill="freeze"/><animate attributeName="stroke-opacity" values="0;' + (isLight ? '0.2' : '0.3') + ';0" dur="0.9s" begin="0.05s" fill="freeze"/></circle>';

    // Bold hex grid
    var hexes = '', hexCenters = [], hS = isLight ? 0.25 : 0.3, hF = isLight ? 0.04 : 0.05;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var hx = col * hexR * 3 + (row % 2 ? hexR * 1.5 : 0), hy = row * hexH * 0.5;
        hexCenters.push({ x: hx, y: hy });
        var dist = Math.sqrt(Math.pow(hx - cx, 2) + Math.pow(hy - cy, 2));
        var fade = clamp(1 - dist / maxDist, 0.05, 1), sdl = (dist / maxDist * 0.8).toFixed(2);
        hexes += '<polygon points="' + hexPts(hx, hy, hexR - 2) + '" fill="' + pal.glass + '" stroke="' + pal.primary + '" stroke-width="1" stroke-opacity="0" fill-opacity="0" filter="url(#diTempColor)">' +
          '<animate attributeName="stroke-opacity" from="0" to="' + (hS * fade).toFixed(3) + '" dur="0.2s" begin="' + sdl + 's" fill="freeze"/><animate attributeName="fill-opacity" from="0" to="' + (hF * fade).toFixed(4) + '" dur="0.2s" begin="' + sdl + 's" fill="freeze"/></polygon>';
      }
    }
    svg += (atmo === 'storm') ? '<g filter="url(#diGlitch)">' + hexes + '</g>' : '<g>' + hexes + '</g>';

    // ACT 2: GENESIS BLOCK (2.5x)
    var genR = hexR * 2.5;
    svg += '<polygon points="' + hexPts(cx, cy, genR) + '" fill="' + pal.glass + '" stroke="' + pal.border + '" stroke-width="2.5" opacity="0" filter="url(#diGlass)"><animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1s" fill="freeze"/></polygon>';
    svg += '<polygon points="' + hexPts(cx, cy, genR * 0.45) + '" fill="none" stroke="' + pal.primary + '" stroke-width="2" stroke-opacity="0" stroke-dasharray="8 4"><animate attributeName="stroke-opacity" from="0" to="' + (isLight ? '0.6' : '0.85') + '" dur="0.3s" begin="1.2s" fill="freeze"/><animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="360 ' + cx + ' ' + cy + '" dur="10s" repeatCount="indefinite"/></polygon>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + F(genR * 0.5) + '" fill="' + pal.primary + '" opacity="0" filter="url(#diGlowHot)"><animate attributeName="opacity" values="0;' + (isLight ? '0.5' : '1') + ';' + (isLight ? '0.25' : '0.5') + ';' + (isLight ? '0.4' : '0.8') + ';0" dur="2.5s" begin="1s" repeatCount="indefinite"/></circle>';

    // 3 confirmation waves (60% participation)
    var wHex = '', wFOp = isLight ? 0.15 : 0.2;
    for (var wi = 0; wi < 3; wi++) {
      var wSt = 1.2 + wi;
      for (var hi = 0; hi < hexCenters.length; hi++) {
        if (Math.random() > 0.6) continue;
        var hc = hexCenters[hi], hD = Math.sqrt(Math.pow(hc.x - cx, 2) + Math.pow(hc.y - cy, 2));
        wHex += '<polygon points="' + hexPts(hc.x, hc.y, hexR - 2) + '" fill="' + pal.primary + '" fill-opacity="0" stroke="none"><animate attributeName="fill-opacity" values="0;' + wFOp + ';0" dur="0.5s" begin="' + (wSt + hD / maxDist * 0.6).toFixed(2) + 's" repeatCount="1"/></polygon>';
      }
    }
    svg += '<g>' + wHex + '</g>';

    // Network veins
    if (!MOB) {
      var veins = '', vOp = isLight ? 0.08 : 0.1;
      for (var vi = 0; vi < hexCenters.length; vi++) {
        var va = hexCenters[vi];
        for (var vj = vi + 1; vj < hexCenters.length; vj++) {
          var vb = hexCenters[vj], vD = Math.sqrt(Math.pow(va.x - vb.x, 2) + Math.pow(va.y - vb.y, 2));
          if (vD < hexR * 3.5 && vD > hexR * 1.5 && Math.random() < 0.18)
            veins += '<line x1="' + F(va.x) + '" y1="' + F(va.y) + '" x2="' + F(vb.x) + '" y2="' + F(vb.y) + '" stroke="' + pal.primary + '" stroke-opacity="' + vOp + '" stroke-width="0.8"/>';
        }
      }
      svg += '<g>' + veins + '</g>';
    }

    // 8 data columns
    var dcN = MOB ? 4 : 8, dcOp = isLight ? 0.12 : 0.15;
    for (var dc = 0; dc < dcN; dc++) {
      var dcx = rand(W * 0.08, W * 0.92), dcy = rand(0, H * 0.3), dcL = rand(H * 0.3, H * 0.65);
      var dcD = Math.floor(rand(5, 12)), dcDur = rand(1.5, 4).toFixed(1);
      svg += '<line x1="' + F(dcx) + '" y1="' + F(dcy) + '" x2="' + F(dcx) + '" y2="' + F(dcy + dcL) + '" stroke="' + pal.primary + '" stroke-opacity="' + dcOp + '" stroke-width="1" stroke-dasharray="' + dcD + ' ' + (dcD * 3) + '"><animate attributeName="stroke-dashoffset" from="0" to="-' + (dcD * 6) + '" dur="' + dcDur + 's" repeatCount="indefinite"/></line>';
    }

    // ACT 3: Genesis luminous border
    svg += '<polygon points="' + hexPts(cx, cy, genR + 4) + '" fill="none" stroke="' + pal.primary + '" stroke-width="1.5" stroke-opacity="0" filter="url(#diGlassEdge)"><animate attributeName="stroke-opacity" values="0;' + (isLight ? '0.4' : '0.6') + ';' + (isLight ? '0.15' : '0.2') + ';' + (isLight ? '0.3' : '0.5') + ';0" dur="3s" begin="1.5s" repeatCount="indefinite"/></polygon>';

    svg += ambientParticles(MOB ? 10 : 20, pal, isLight);
    if (atmo === 'rain') svg += rainOverlay(W, H, pal, isLight);
    if (atmo === 'storm') svg += stormFlash(W, H, pal, isLight);
    return svg;
  }

  // ── CSS Keyframes for Quantum Forge Rings ─────────────────
  function ringKeyframes() {
    return '<style>' +
      '@keyframes diRotate0{from{transform:perspective(800px) rotateX(65deg) rotateZ(0deg)}to{transform:perspective(800px) rotateX(65deg) rotateZ(360deg)}}' +
      '@keyframes diRotate1{from{transform:perspective(800px) rotateY(55deg) rotateZ(0deg)}to{transform:perspective(800px) rotateY(55deg) rotateZ(360deg)}}' +
      '@keyframes diRotate2{from{transform:perspective(800px) rotateX(40deg) rotateY(40deg) rotateZ(0deg)}to{transform:perspective(800px) rotateX(40deg) rotateY(40deg) rotateZ(360deg)}}' +
      '@keyframes diRotate3{from{transform:perspective(800px) rotateX(25deg) rotateY(65deg) rotateZ(0deg)}to{transform:perspective(800px) rotateX(25deg) rotateY(65deg) rotateZ(360deg)}}' +
      '@keyframes diRotate4{from{transform:perspective(800px) rotateX(70deg) rotateY(20deg) rotateZ(0deg)}to{transform:perspective(800px) rotateX(70deg) rotateY(20deg) rotateZ(360deg)}}' +
    '</style>';
  }

  // ══════════════════════════════════════════════════════════════
  //  ORCHESTRATOR
  // ══════════════════════════════════════════════════════════════
  var SCENES = {
    morning: sceneInitialization,
    midday:  sceneMeshRouter,
    dusk:    sceneGoldenBridge,
    night:   sceneLedger
  };

  var PHASE_LABELS = {
    morning: 'NEURAL IGNITION',
    midday:  'QUANTUM FORGE',
    dusk:    'CONVERGENCE PROTOCOL',
    night:   'GENESIS LATTICE'
  };

  function buildFullSVG(phase, atmo, temp, wind) {
    dims();
    syncPaletteFromCSS();
    var isLight = document.body.classList.contains('light-mode');
    var pal = getPalette(atmo, isLight);
    var bgColor;
    if (isLight) {
      bgColor = pal.bg && pal.bg !== '#06080f' && pal.bg !== '#0c1018' ? pal.bg : '#f4f6fb';
    } else {
      bgColor = _livePal ? pal.bg : (PHASE_BG[phase] || pal.bg);
    }
    var sceneContent = SCENES[phase](atmo, temp, wind, isLight);
    var filterDefs = buildFilterDefs(atmo, temp, wind, isLight);
    var labelSvg = typewriterLabel(PHASE_LABELS[phase] || '', W / 2, H - 40, pal, 1.2, isLight);
    var extra = phase === 'midday' ? ringKeyframes() : '';

    var bgMarkup;
    if (isLight) {
      var bg2 = pal.bg2 || bgColor;
      bgMarkup = '<defs><radialGradient id="diBgGrad" cx="50%" cy="40%" r="70%">' +
        '<stop offset="0%" stop-color="' + bgColor + '"/>' +
        '<stop offset="100%" stop-color="' + bg2 + '"/>' +
        '</radialGradient></defs>' +
        '<rect width="' + W + '" height="' + H + '" fill="url(#diBgGrad)"/>';
    } else {
      bgMarkup = '<rect width="' + W + '" height="' + H + '" fill="' + bgColor + '"/>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice">' +
      extra + filterDefs + bgMarkup +
      sceneContent + labelSvg +
    '</svg>';
  }

  function triggerAnimations(svgEl) {
    var anims = svgEl.querySelectorAll('animate, animateTransform, animateMotion');
    for (var i = 0; i < anims.length; i++) {
      try {
        if (anims[i].getAttribute('begin') === 'indefinite') {
          anims[i].beginElement();
        }
      } catch (e) {}
    }
  }

  function fadeDissolve(overlay, callback) {
    if (window.gsap) {
      window.gsap.to(overlay, {
        opacity: 0,
        duration: 0.8,
        delay: 0.1,
        ease: 'power2.inOut',
        onComplete: function () {
          overlay.classList.remove('active');
          overlay.style.opacity = '';
          overlay.innerHTML = '';
          if (callback) callback();
        }
      });
    } else {
      overlay.style.transition = 'opacity 0.8s ease';
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.classList.remove('active');
        overlay.style.opacity = '';
        overlay.style.transition = '';
        overlay.innerHTML = '';
        if (callback) callback();
      }, 850);
    }
  }

  // ── Intro Ambient Sonification (graceful degradation) ─────
  var MOOD_NOTES = {
    warm: [60, 64, 67], focused: [62, 66, 69], calm: [57, 60, 64],
    melancholy: [58, 61, 65], serene: [64, 67, 71], intense: [56, 59, 63],
    surprised: [60, 63, 67], playful: [62, 66, 69], determined: [58, 62, 65],
    curious: [60, 64, 67], neutral: [60, 64, 67]
  };
  function midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function introSonify(duration) {
    try {
      var sa = window._spatialAudio;
      var ctx = sa && sa.getCtx ? sa.getCtx() : null;
      if (!ctx) return;

      function play() {
        if (ctx.state !== 'running') return;
        var dest = (sa && sa.getMaster) ? sa.getMaster() : ctx.destination;
        var mood = (document.body.getAttribute('data-mood') || 'neutral');
        var notes = MOOD_NOTES[mood] || MOOD_NOTES.neutral;
        var now = ctx.currentTime;

        var master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.025, now + 0.8);
        master.gain.linearRampToValueAtTime(0.02, now + duration * 0.6);
        master.gain.linearRampToValueAtTime(0, now + duration);
        master.connect(dest);

        for (var i = 0; i < notes.length; i++) {
          var osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFreq(notes[i] - 12), now);
          var g = ctx.createGain();
          g.gain.setValueAtTime(i === 0 ? 1 : 0.6, now);
          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + duration + 0.1);
        }
      }

      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(function () {});
      } else {
        play();
      }
    } catch (e) {}
  }

  // ── Public API ─────────────────────────────────────────────
  var _previewTimer = 0;

  function _onEsc(e) {
    if (e.key === 'Escape') {
      var overlay = document.getElementById('introOverlay');
      if (overlay && overlay.classList.contains('active')) {
        clearTimeout(_previewTimer);
        fadeDissolve(overlay);
        document.removeEventListener('keydown', _onEsc);
      }
    }
  }

  window._dataIntro = {
    init: function (weatherData, launchFn) {
      var overlay = document.getElementById('introOverlay');
      if (!overlay) { if (launchFn) launchFn(); return; }

      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (launchFn) launchFn();
        return;
      }

      var data = weatherData || window._weatherData || {};
      var hour = getCairoHour();
      var phase = getPhase(hour);
      var atmo = getAtmosphere(data.code);
      var temp = typeof data.temp === 'number' ? data.temp : 25;
      var wind = typeof data.wind === 'number' ? data.wind : 5;

      var svgMarkup = buildFullSVG(phase, atmo, temp, wind);
      overlay.innerHTML = svgMarkup;
      overlay.classList.add('active');
      introSonify(4.3);

      var svgEl = overlay.querySelector('svg');
      if (svgEl) {
        requestAnimationFrame(function () {
          triggerAnimations(svgEl);
        });
      }

      setTimeout(function () {
        fadeDissolve(overlay, launchFn);
      }, 3500);
    },

    preview: function (phase, atmo, temp, wind) {
      phase = phase || 'morning';
      atmo = atmo || 'clear';
      temp = typeof temp === 'number' ? temp : 25;
      wind = typeof wind === 'number' ? wind : 5;

      var overlay = document.getElementById('introOverlay');
      if (!overlay) return;
      clearTimeout(_previewTimer);
      overlay.style.opacity = '';
      overlay.innerHTML = buildFullSVG(phase, atmo, temp, wind);
      overlay.classList.add('active');
      introSonify(5.5);
      var svgEl = overlay.querySelector('svg');
      if (svgEl) requestAnimationFrame(function () { triggerAnimations(svgEl); });

      document.addEventListener('keydown', _onEsc);
      overlay.onclick = function () {
        clearTimeout(_previewTimer);
        fadeDissolve(overlay);
        document.removeEventListener('keydown', _onEsc);
        overlay.onclick = null;
      };
      _previewTimer = setTimeout(function () {
        fadeDissolve(overlay);
        document.removeEventListener('keydown', _onEsc);
        overlay.onclick = null;
      }, 5000);
    },

    getPhase: getPhase,
    getAtmosphere: getAtmosphere,
    getCairoHour: getCairoHour
  };
  console.log('%c🎬 Data Cinema%c SVG intro engine ready','background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');

})();
