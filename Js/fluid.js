// fluid.js — Navier-Stokes Fluid Dynamics Background
// GPU-accelerated via WebGL fragment shaders with ping-pong framebuffers.
// Reacts to cursor, site audio (AnalyserNode), and live Binance BTC trades.
// Lazy-loaded from site.js. Falls back to particle system if WebGL unavailable.

(function FluidSim() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MOB = window.matchMedia('(pointer:coarse)').matches;
  if (RM) return;

  // ═══════════════════════════════════════════════════
  // SECTION 1: WEBGL BOOTSTRAP
  // ═══════════════════════════════════════════════════
  const canvas = document.createElement('canvas');
  canvas.id = 'fluidCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;width:100%;height:100%';
  canvas.setAttribute('aria-hidden', 'true');

  const gl = canvas.getContext('webgl', {
    alpha: false, depth: false, stencil: false,
    antialias: false, preserveDrawingBuffer: false
  });
  if (!gl) return;

  let _contextLost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); _contextLost = true; }, false);
  canvas.addEventListener('webglcontextrestored', () => { _contextLost = false; }, false);

  const halfFloat = gl.getExtension('OES_texture_half_float');
  const halfFloatLinear = gl.getExtension('OES_texture_half_float_linear');
  if (!halfFloat) return;

  const bgC = document.getElementById('bgC');
  if (bgC) { document.body.insertBefore(canvas, bgC); bgC.style.display = 'none'; }
  else document.body.appendChild(canvas);

  const HALF_FLOAT = halfFloat.HALF_FLOAT_OES;
  const SIM_SCALE = MOB ? 6 : 4;
  let simW, simH, dpr;
  let splatQueue = [];
  let running = true;
  let frameId = null;
  let tradeCount = 0;
  let slowFrames = 0;
  let lastTime = 0;

  function calcSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    simW = Math.max(64, Math.floor(canvas.width / SIM_SCALE));
    simH = Math.max(64, Math.floor(canvas.height / SIM_SCALE));
  }
  calcSize();

  // Fullscreen quad
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  // ═══════════════════════════════════════════════════
  // SECTION 2: GLSL SHADERS
  // ═══════════════════════════════════════════════════
  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const ADVECT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity, uSource;
    uniform vec2 texelSize;
    uniform float dt, dissipation;
    void main() {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
    }
  `;

  const DIVERGENCE = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
      float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;
      float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `;

  const CURL = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).y;
      float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).y;
      float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).x;
      float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).x;
      gl_FragColor = vec4(R - L - T + B, 0.0, 0.0, 1.0);
    }
  `;

  const VORTICITY = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity, uCurl;
    uniform vec2 texelSize;
    uniform float curl, dt;
    void main() {
      float L = texture2D(uCurl, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uCurl, vUv + vec2(texelSize.x, 0.0)).x;
      float B = texture2D(uCurl, vUv - vec2(0.0, texelSize.y)).x;
      float T = texture2D(uCurl, vUv + vec2(0.0, texelSize.y)).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      float len = max(length(force), 1e-5);
      force = force / len * curl * C;
      vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `;

  const PRESSURE = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uPressure, uDivergence;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }
  `;

  const GRAD_SUB = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uPressure, uVelocity;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
      vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `;

  const SPLAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspect;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main() {
      vec2 p = vUv - point;
      p.x *= aspect;
      vec3 s = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + s, 1.0);
    }
  `;

  const DISPLAY = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float intensity;
    void main() {
      vec3 c = texture2D(uTexture, vUv).rgb * intensity;
      c = c / (1.0 + c);
      c = pow(c, vec3(1.0 / 2.2));
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  const CLEAR = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main() {
      gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `;

  // ═══════════════════════════════════════════════════
  // SECTION 2b: SHADER COMPILATION
  // ═══════════════════════════════════════════════════
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Fluid shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(fragSrc) {
    const prog = gl.createProgram();
    const vs = compileShader(gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) { gl.deleteProgram(prog); return null; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Fluid program link error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    const uniforms = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      uniforms[info.name] = gl.getUniformLocation(prog, info.name);
    }
    return { prog, uniforms, bind() { gl.useProgram(prog); } };
  }

  const progs = {
    advect:    createProgram(ADVECT),
    divergence: createProgram(DIVERGENCE),
    curl:      createProgram(CURL),
    vorticity: createProgram(VORTICITY),
    pressure:  createProgram(PRESSURE),
    gradSub:   createProgram(GRAD_SUB),
    splat:     createProgram(SPLAT),
    display:   createProgram(DISPLAY),
    clear:     createProgram(CLEAR),
  };

  // ═══════════════════════════════════════════════════
  // SECTION 3: FRAMEBUFFER MANAGEMENT
  // ═══════════════════════════════════════════════════
  let texId = 0;
  function createFBO(w, h, filter) {
    const id = texId++;
    gl.activeTexture(gl.TEXTURE0 + id);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, HALF_FLOAT, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return { tex, fbo, id, w, h };
  }

  function createDoubleFBO(w, h) {
    let a = createFBO(w, h, gl.LINEAR);
    let b = createFBO(w, h, gl.LINEAR);
    return {
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; }
    };
  }

  let velocity, dye, pressure, divergenceTex, curlTex;
  let allFBOs = [];

  function deleteFBO(f) {
    if (!f) return;
    gl.deleteTexture(f.tex);
    gl.deleteFramebuffer(f.fbo);
  }

  function initFBOs() {
    for (const f of allFBOs) deleteFBO(f);
    allFBOs = [];
    texId = 0;
    velocity = createDoubleFBO(simW, simH);
    dye = createDoubleFBO(simW, simH);
    pressure = createDoubleFBO(simW, simH);
    divergenceTex = createFBO(simW, simH, gl.NEAREST);
    curlTex = createFBO(simW, simH, gl.NEAREST);
    allFBOs = [velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, divergenceTex, curlTex];
  }
  initFBOs();

  let resizeTimer = null;
  let _lastResizeW = window.innerWidth;
  function onResize() {
    if (window.innerWidth === _lastResizeW) return;
    _lastResizeW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      calcSize();
      initFBOs();
    }, 200);
  }
  addEventListener('resize', onResize);

  // ═══════════════════════════════════════════════════
  // SECTION 3b: DRAW HELPERS
  // ═══════════════════════════════════════════════════
  function bindAttr() {
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const loc = 0;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function blit(target) {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 4: SIMULATION STEP
  // ═══════════════════════════════════════════════════
  const SIM_DT = 0.016;
  const JACOBI_ITERS = 20;
  const PRESSURE_DISSIPATION = 0.8;
  let curlStrength = 25;
  let displayIntensity = 1.0;

  function step(dt) {
    bindAttr();
    gl.disable(gl.BLEND);
    const tsV = [1.0 / simW, 1.0 / simH];

    // Process splats (velocity scaled to texel-space for advection compatibility)
    for (const s of splatQueue) {
      applySplat(velocity.read, velocity.write, s.x, s.y, s.dx * simW, s.dy * simH, 0, s.radius);
      velocity.swap();
      applySplat(dye.read, dye.write, s.x, s.y, s.r, s.g, s.b, s.radius);
      dye.swap();
    }
    splatQueue.length = 0;

    // Advect velocity
    const adv = progs.advect;
    adv.bind();
    gl.uniform2f(adv.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1f(adv.uniforms.dt, dt);
    gl.uniform1f(adv.uniforms.dissipation, 0.99);
    gl.uniform1i(adv.uniforms.uVelocity, velocity.read.id);
    gl.uniform1i(adv.uniforms.uSource, velocity.read.id);
    blit(velocity.write);
    velocity.swap();

    // Advect dye (re-bind velocity to use freshly advected field)
    gl.uniform1i(adv.uniforms.uVelocity, velocity.read.id);
    gl.uniform1f(adv.uniforms.dissipation, 0.97);
    gl.uniform1i(adv.uniforms.uSource, dye.read.id);
    blit(dye.write);
    dye.swap();

    // Curl
    const cu = progs.curl;
    cu.bind();
    gl.uniform2f(cu.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1i(cu.uniforms.uVelocity, velocity.read.id);
    blit(curlTex);

    // Vorticity confinement
    const vo = progs.vorticity;
    vo.bind();
    gl.uniform2f(vo.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1i(vo.uniforms.uVelocity, velocity.read.id);
    gl.uniform1i(vo.uniforms.uCurl, curlTex.id);
    gl.uniform1f(vo.uniforms.curl, curlStrength);
    gl.uniform1f(vo.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    // Divergence
    const dv = progs.divergence;
    dv.bind();
    gl.uniform2f(dv.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1i(dv.uniforms.uVelocity, velocity.read.id);
    blit(divergenceTex);

    // Clear pressure
    const cl = progs.clear;
    cl.bind();
    gl.uniform1i(cl.uniforms.uTexture, pressure.read.id);
    gl.uniform1f(cl.uniforms.value, PRESSURE_DISSIPATION);
    blit(pressure.write);
    pressure.swap();

    // Jacobi pressure solve
    const pr = progs.pressure;
    pr.bind();
    gl.uniform2f(pr.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1i(pr.uniforms.uDivergence, divergenceTex.id);
    for (let i = 0; i < JACOBI_ITERS; i++) {
      gl.uniform1i(pr.uniforms.uPressure, pressure.read.id);
      blit(pressure.write);
      pressure.swap();
    }

    // Gradient subtract
    const gs = progs.gradSub;
    gs.bind();
    gl.uniform2f(gs.uniforms.texelSize, tsV[0], tsV[1]);
    gl.uniform1i(gs.uniforms.uPressure, pressure.read.id);
    gl.uniform1i(gs.uniforms.uVelocity, velocity.read.id);
    blit(velocity.write);
    velocity.swap();

    // Display
    const dp = progs.display;
    dp.bind();
    gl.uniform1i(dp.uniforms.uTexture, dye.read.id);
    gl.uniform1f(dp.uniforms.intensity, displayIntensity);
    blit(null);
  }

  function applySplat(readFBO, writeFBO, x, y, dr, dg, db, radius) {
    const sp = progs.splat;
    sp.bind();
    gl.uniform1i(sp.uniforms.uTarget, readFBO.id);
    gl.uniform1f(sp.uniforms.aspect, simW / simH);
    gl.uniform2f(sp.uniforms.point, x, y);
    gl.uniform3f(sp.uniforms.color, dr, dg, db);
    gl.uniform1f(sp.uniforms.radius, radius);
    blit(writeFBO);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 5: CURSOR INPUT
  // ═══════════════════════════════════════════════════
  let lastMX = -1, lastMY = -1;
  let cursorColor = [0, 0.88, 1.0];
  const SPLAT_RADIUS = MOB ? 0.0025 : 0.0015;
  const FORCE_MULT = MOB ? 3.0 : 5.0;

  function onPointerMove(px, py) {
    if (!running) return;
    const x = px / innerWidth;
    const y = 1.0 - py / innerHeight;
    if (lastMX < 0) { lastMX = x; lastMY = y; return; }
    const dx = (x - lastMX) * FORCE_MULT;
    const dy = (y - lastMY) * FORCE_MULT;
    lastMX = x; lastMY = y;
    if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return;
    splatQueue.push({ x, y, dx, dy, r: cursorColor[0], g: cursorColor[1], b: cursorColor[2], radius: SPLAT_RADIUS });
  }

  function onMouseMove(e) { onPointerMove(e.clientX, e.clientY); }
  function onTouchMove(e) { if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY); }
  function onTouchEnd() { lastMX = -1; lastMY = -1; }
  addEventListener('mousemove', onMouseMove);
  addEventListener('touchmove', onTouchMove, { passive: true });
  addEventListener('touchend', onTouchEnd);

  // ═══════════════════════════════════════════════════
  // SECTION 6: AUDIO REACTIVITY
  // ═══════════════════════════════════════════════════
  let analyser = null;
  let freqData = null;

  function initAudio() {
    try {
      const sa = window._spatialAudio;
      if (!sa) return;
      const ctx = sa.getCtx();
      const master = sa.getMaster && sa.getMaster();
      if (!ctx || !master) return;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      master.connect(analyser);
    } catch (_) { analyser = null; }
  }

  function sampleAudio() {
    if (!analyser || !freqData) return;
    try { analyser.getByteFrequencyData(freqData); } catch (_) { return; }
    const bins = freqData.length;
    const bassEnd = Math.floor(bins * 0.08);
    const midEnd = Math.floor(bins * 0.5);

    let bass = 0, mid = 0, high = 0;
    for (let i = 0; i < bassEnd; i++) bass += freqData[i];
    for (let i = bassEnd; i < midEnd; i++) mid += freqData[i];
    for (let i = midEnd; i < bins; i++) high += freqData[i];
    bass = bass / (bassEnd * 255);
    mid = mid / ((midEnd - bassEnd) * 255);
    high = high / ((bins - midEnd) * 255);

    curlStrength = 25 + bass * 40;

    if (mid > 0.15) {
      splatQueue.push({
        x: Math.random(), y: Math.random(),
        dx: (Math.random() - 0.5) * 0.2, dy: (Math.random() - 0.5) * 0.2,
        r: 0.4, g: 0.15, b: 0.6, radius: 0.001 + mid * 0.002
      });
    }

    if (high > 0.12) {
      splatQueue.push({
        x: Math.random(), y: Math.random(),
        dx: 0, dy: 0,
        r: 0.0, g: 0.5, b: 0.8, radius: 0.0008
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // SECTION 7: BINANCE TRADE SHOCKWAVES
  // ═══════════════════════════════════════════════════
  let tradeWS = null;
  let tradeReconnect = 1000;
  let userInteracted = false;

  function connectTrades() {
    if (!running || tradeWS) return;
    try {
      tradeWS = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
      tradeWS.onopen = () => { tradeReconnect = 1000; };
      tradeWS.onmessage = (evt) => {
        try {
          const t = JSON.parse(evt.data);
          const val = parseFloat(t.q) * parseFloat(t.p);
          tradeCount++;
          if (val < 5000) return;
          const isBuy = !t.m;
          const r = isBuy ? 0.1 : 0.9;
          const g = isBuy ? 0.8 : 0.2;
          const b = 0.2;
          const mag = Math.log10(val) - 3.5;
          const radius = Math.min(0.008, 0.001 + mag * 0.0008);
          const force = Math.min(0.5, mag * 0.08);
          splatQueue.push({
            x: Math.random(), y: Math.random(),
            dx: (Math.random() - 0.5) * force, dy: (Math.random() - 0.5) * force,
            r, g, b, radius
          });
          if (val > 1000000) curlStrength = Math.min(80, curlStrength + 15);
        } catch (_) {}
      };
      tradeWS.onerror = () => {};
      tradeWS.onclose = () => {
        tradeWS = null;
        tradeReconnect = Math.min(tradeReconnect * 2, 16000);
        if (running) setTimeout(connectTrades, tradeReconnect);
      };
    } catch (_) {}
  }

  function onFirstInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    connectTrades();
    initAudio();
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
  }
  document.addEventListener('click', onFirstInteraction, { once: true });
  document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
  document.addEventListener('keydown', onFirstInteraction, { once: true });

  // ═══════════════════════════════════════════════════
  // SECTION 8: THEME INTEGRATION
  // ═══════════════════════════════════════════════════
  function setTheme(theme) {
    if (theme === 'light') {
      cursorColor = [0.06, 0.09, 0.16];
      displayIntensity = 0.6;
      curlStrength = 18;
      canvas.style.display = 'none';
      if (bgC) bgC.style.display = '';
    } else {
      cursorColor = [0, 0.88, 1.0];
      displayIntensity = 1.0;
      curlStrength = 25;
      canvas.style.display = '';
      if (bgC) bgC.style.display = 'none';
    }
  }

  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  setTheme(currentTheme);

  // ═══════════════════════════════════════════════════
  // SECTION 9: MAIN LOOP + PERFORMANCE GUARD
  // ═══════════════════════════════════════════════════
  function loop(now) {
    if (!running) return;
    frameId = requestAnimationFrame(loop);
    if (_contextLost || document.hidden || window._suspended) return;
    const dt = Math.min((now - lastTime) / 1000, 0.033) || SIM_DT;
    lastTime = now;

    if (dt > 0.032) { slowFrames++; } else { slowFrames = Math.max(0, slowFrames - 1); }
    if (slowFrames > 120 && simW > 64) {
      simW = Math.max(64, Math.floor(simW * 0.7));
      simH = Math.max(64, Math.floor(simH * 0.7));
      initFBOs();
      slowFrames = 0;
    }

    sampleAudio();
    step(dt);
  }

  // Seed with initial splats for visual interest on load
  for (let i = 0; i < 5; i++) {
    splatQueue.push({
      x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6,
      dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
      r: cursorColor[0] * (0.5 + Math.random() * 0.5),
      g: cursorColor[1] * (0.5 + Math.random() * 0.5),
      b: cursorColor[2] * (0.5 + Math.random() * 0.5),
      radius: 0.002 + Math.random() * 0.003
    });
  }

  lastTime = performance.now();
  frameId = requestAnimationFrame(loop);

  // ═══════════════════════════════════════════════════
  // SECTION 10: GLOBAL API
  // ═══════════════════════════════════════════════════
  function externalSplat(x, y, dx, dy, r, g, b, radius) {
    splatQueue.push({ x, y, dx, dy, r, g, b, radius: radius || 0.002 });
  }

  function destroy() {
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    if (resizeTimer) clearTimeout(resizeTimer);
    if (tradeWS) { tradeWS.onclose = null; tradeWS.close(); tradeWS = null; }
    removeEventListener('resize', onResize);
    removeEventListener('mousemove', onMouseMove);
    removeEventListener('touchmove', onTouchMove);
    removeEventListener('touchend', onTouchEnd);
    removeEventListener('beforeunload', destroy);
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
    for (const f of allFBOs) deleteFBO(f);
    allFBOs = [];
    if (quadBuf) gl.deleteBuffer(quadBuf);
    for (const name of Object.keys(progs)) {
      if (progs[name] && progs[name].prog) gl.deleteProgram(progs[name].prog);
    }
    canvas.remove();
    if (bgC) bgC.style.display = '';
    const oldScript = document.querySelector('script[src="Js/fluid.js"]');
    if (oldScript) oldScript.remove();
    window._fluidSplat = null;
    window._fluidActive = false;
    window._fluidDestroy = null;
    window._fluidSetTheme = null;
    window._fluidSetIntensity = null;
    window._fluidSetMood = null;
    window._fluidGetStats = null;
  }

  window._fluidSetMood = (hue, intensity, curl) => {
    const light = document.body.classList.contains('light-mode');
    if (light) return;
    const h = hue / 360;
    const s = 0.85, l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r1, g1, b1;
    const seg = Math.floor(h * 6);
    if (seg === 0) { r1 = c; g1 = x; b1 = 0; }
    else if (seg === 1) { r1 = x; g1 = c; b1 = 0; }
    else if (seg === 2) { r1 = 0; g1 = c; b1 = x; }
    else if (seg === 3) { r1 = 0; g1 = x; b1 = c; }
    else if (seg === 4) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    cursorColor = [r1 + m, g1 + m, b1 + m];
    displayIntensity = Math.max(0.4, Math.min(2, intensity));
    curlStrength = Math.max(8, Math.min(80, curl));
  };

  window._fluidSplat = externalSplat;
  window._fluidActive = true;
  window._fluidDestroy = destroy;
  window._fluidSetTheme = setTheme;
  window._fluidSetIntensity = (v) => { displayIntensity = Math.max(0, Math.min(2, v)); };
  window._fluidGetStats = () => ({
    simW, simH, tradeCount,
    canvasW: canvas.width, canvasH: canvas.height,
    slowFrames, curlStrength: Math.round(curlStrength),
    audioActive: !!analyser, tradeWSActive: tradeWS && tradeWS.readyState === 1
  });

  addEventListener('beforeunload', destroy);

  if (window.UniToast) window.UniToast('Navier-Stokes fluid active — move your cursor');
  if (window.VDna) window.VDna.addXp(10);
})();
