// ai3d.js - Lazy-loaded AI chatbot + 3D viewer + FinTech visualizer (extracted from site.js)
// Dependencies: window.autoDismiss, window.cancelAutoDismiss, window.VDna

// ═══════════════════════════════════════════════════════════════
// PHASE 4: AI, INTERACTIVE 3D — amrelharony.com
// Drop-in: <script src="phase4-ai-3d.js" defer></script>
//
// Features:
//   1. "Ask Amr" Terminal Chatbot
//   2. 3D Book Viewer (<model-viewer>) - NO AR
//   3. 3D Data Mesh Visualizer (Three.js)
// ═══════════════════════════════════════════════════════════════
(function PhaseFourAI3D() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ── ADVANCED HAPTIC ENGINE ──
  const Haptic = {
    _ok: !RM && !!navigator.vibrate,
    _last: 0,
    _throttle(ms) { const now = Date.now(); if (now - this._last < ms) return false; this._last = now; return true; },
    tap()        { if (this._ok) navigator.vibrate(8); },
    doubleTap()  { if (this._ok) navigator.vibrate([8, 40, 8]); },
    hold()       { if (this._ok) navigator.vibrate([4, 30, 4, 30, 4]); },
    success()    { if (this._ok) navigator.vibrate([10, 30, 10, 30, 20]); },
    warning()    { if (this._ok) navigator.vibrate([30, 50, 60]); },
    arEnter()    { if (this._ok) navigator.vibrate([5, 20, 5, 20, 5, 20, 10, 40, 15]); },
    trade(isBuy) { if (this._ok && this._throttle(180)) navigator.vibrate(isBuy ? [6, 25, 12] : [12, 25, 6]); },
    rotate()     { if (this._ok && this._throttle(120)) navigator.vibrate(3); },
    zoom()       { if (this._ok && this._throttle(100)) navigator.vibrate(4); },
    pulse(intensity) {
      if (!this._ok || !this._throttle(200)) return;
      const d = Math.min(Math.max(Math.round(intensity * 20), 3), 40);
      navigator.vibrate(d);
    },
    sequence(pattern) { if (this._ok) navigator.vibrate(pattern); },
  };

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase4-css';
  css.textContent = `
/* ═══════════════════════════════════════════
   1. ASK AMR — TERMINAL CHAT MODE
   ═══════════════════════════════════════════ */
.term-chat-msg {
  margin: 6px 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  animation: termFadeIn .3s ease;
}
@keyframes termFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.term-chat-q {
  background: rgba(0,225,255,.06);
  border-left: 2px solid var(--accent, #00e1ff);
  color: #c9d1d9;
}
.term-chat-a {
  background: rgba(255,255,255,.03);
  border-left: 2px solid rgba(255,255,255,.08);
  color: #8b949e;
}
.term-chat-a strong { color: #e2e8f0; }
.term-chat-a .highlight { color: #00e1ff; }
.term-chat-typing {
  display: inline-flex;
  gap: 3px;
  padding: 4px 0;
}
.term-chat-typing span {
  width: 4px; height: 4px; border-radius: 50%; background: #00e1ff;
  animation: typeDot 1.2s ease-in-out infinite;
}
.term-chat-typing span:nth-child(2) { animation-delay: .2s; }
.term-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

.term-chat-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.term-chat-topic {
  font-family: 'JetBrains Mono', monospace; font-size: 8px; padding: 2px 8px;
  border-radius: 100px; border: 1px solid rgba(0,225,255,.15); color: #00e1ff;
  cursor: pointer; transition: all .2s; -webkit-tap-highlight-color: transparent;
}
.term-chat-topic:hover { background: rgba(0,225,255,.08); border-color: #00e1ff; }

/* ═══════════════════════════════════════════
   2. 3D VIEWER OVERLAY STYLES
   ═══════════════════════════════════════════ */
#viewer3dOverlay {
  position: fixed; inset: 0; z-index: 9999; background: transparent;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  opacity: 0; visibility: hidden; transition: opacity .4s, visibility .4s;
  pointer-events: none; backdrop-filter: blur(6px);
}
#viewer3dOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.viewer3d-container {
  width: 96%; max-width: 500px; height: 400px; border-radius: 16px;
  overflow: hidden; border: 1px solid #1a2332; background: #060910;
  position: relative; transform: scale(.9); transition: transform .5s cubic-bezier(.16,1,.3,1);
}
#viewer3dOverlay.show .viewer3d-container { transform: scale(1); }
model-viewer { width: 100%; height: 100%; --poster-color: transparent; }

.viewer3d-hud {
  position: absolute; top: 10px; left: 12px; right: 12px; display: flex;
  justify-content: space-between; align-items: center; pointer-events: none; z-index: 10;
}
.viewer3d-title {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.5px;
  text-transform: uppercase; color: rgba(0,225,255,.6); text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
.viewer3d-close {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer;
  pointer-events: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid #1a2332;
  background: rgba(0,0,0,.8); transition: all .2s;
}
.viewer3d-close:hover { color: #00e1ff; border-color: rgba(0,225,255,.2); }
.viewer3d-hint {
  position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;
  font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #6f7b8f;
  letter-spacing: 1px; pointer-events: none; z-index: 10;
}
.viewer3d-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 8px; background: #060910; z-index: 20; transition: opacity .5s;
}
.viewer3d-loading.hidden { opacity: 0; pointer-events: none; }
.viewer3d-loading-text {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: #4a5568;
}
.viewer3d-loading-spinner { font-size: 28px; animation: v3dSpin 2s ease-in-out infinite; }
@keyframes v3dSpin { 0% { transform: rotateY(0); } 100% { transform: rotateY(360deg); } }

/* Node labels in data mesh */
.mesh-label {
  position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: rgba(255,255,255,.7); letter-spacing: .5px; pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,.8); white-space: nowrap; transform: translate(-50%, -50%);
}
.ar-btn {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; line-height: 1; padding: 0;
  border-radius: 50%; border: 1px solid rgba(0,225,255,.25);
  background: rgba(0,225,255,.08); color: #00e1ff; cursor: pointer;
  backdrop-filter: blur(8px); transition: all .25s; z-index: 15;
}
.ar-btn:hover { background: rgba(0,225,255,.2); border-color: #00e1ff; transform: translateY(-50%) scale(1.12); box-shadow: 0 0 12px rgba(0,225,255,.25); }

/* Live FinTech Visualizer HUD */
.ftv-hud {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  font-family: 'JetBrains Mono', monospace; padding: 12px 16px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.ftv-hud-top {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.ftv-price {
  font-size: 11px; letter-spacing: .5px; color: rgba(255,255,255,.7);
  text-shadow: 0 1px 6px rgba(0,0,0,.9);
}
.ftv-tps {
  font-size: 9px; color: rgba(255,255,255,.4); letter-spacing: 1px;
}
.ftv-ticker {
  display: flex; flex-wrap: wrap; gap: 6px 12px; justify-content: center;
  padding-bottom: 24px;
}
.ftv-trade {
  font-size: 8px; color: rgba(255,255,255,.55); letter-spacing: .3px;
  white-space: nowrap;
}
@media(max-width:600px) { .viewer3d-container { height: 450px; max-height: 80vh; } .ftv-hud { padding: 8px 10px; } .ftv-price { font-size: 9px; } }
@media print { #viewer3dOverlay { display: none !important; } }
`;
  document.head.appendChild(css);

  // ═══════════════════════════════════════════════════
  // FEATURE 1: "ASK AMR" TERMINAL CHATBOT
  // ═══════════════════════════════════════════════════
  const KB = [
    {
      keys: ['who','about','introduction','intro','yourself','amr','background'],
      answer: `I'm <strong>Amr Elharony</strong> — a Delivery Lead and Scrum Master at <strong>Banque Misr's Data & Analytics Division</strong> in Cairo, Egypt. I have <strong>12+ years</strong> in banking & fintech, a <strong>Doctorate in Digital Transformation</strong>, and I'm the author of <span class="highlight">"The Bilingual Executive"</span>.`
    },
    { keys: ['book','bilingual','executive','author','write','publish'], answer: `<span class="highlight">"The Bilingual Executive"</span> is my book about bridging <strong>business and technology leadership</strong>. It's available as a <strong>printed book, ebook, and AI-narrated audiobook</strong>.` },
    { keys: ['mentor','adplist'], answer: `I'm a <strong>Top Mentor on ADPList</strong> with <strong>2,400+ mentoring minutes</strong>.` },
  ];
  const TOPICS = ['career','certifications','mentoring','book','fintech','agile','data','conferences','contact'];

  function askAmr(query) {
    if (!query || !query.trim()) return formatWelcome();
    const q = query.toLowerCase().replace(/[?!.,]/g, '').trim();
    const words = q.split(/\s+/);
    let bestMatch = null, bestScore = 0;
    for (const entry of KB) {
      let score = 0;
      for (const word of words) {
        if (word.length < 3) continue;
        for (const key of entry.keys) if (key.includes(word) || word.includes(key)) score += key === word ? 3 : 2;
      }
      for (const key of entry.keys) if (q.includes(key)) score += 4;
      if (score > bestScore) { bestScore = score; bestMatch = entry; }
    }
    if (bestMatch && bestScore >= 2) return bestMatch.answer;
    return `I don't have a specific answer for that. Try asking about: <strong>career, book, fintech, agile, certifications</strong>.`;
  }

  function formatWelcome() {
    return `👋 Hey! I'm Amr's digital knowledge base. Ask me anything about his <strong>career, certifications, book, mentoring</strong>.\n\nTry: <span class="highlight">"Tell me about your book"</span>`;
  }

  function initAskAmr() {
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.ask = function(args) {
      const question = (args || '').trim();
      if (!question) return formatWelcome();
      const answer = askAmr(question);
      let html = `<div class="term-chat-msg term-chat-q">❓ ${escHtml(question)}</div>`;
      html += `<div class="term-chat-msg term-chat-a">${answer}</div>`;
      html += `<div class="term-chat-topics">`;
      TOPICS.forEach(t => { html += `<span class="term-chat-topic" onclick="document.getElementById('termInput').value='ask ${t}';document.getElementById('termInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))">${t}</span>`; });
      html += `</div>`;
      return html;
    };
    window.TermCmds.amr = (args) => window.TermCmds.ask(args || 'who are you');
  }

  // ═══════════════════════════════════════════════════
  // 3D OVERLAY CORE
  // ═══════════════════════════════════════════════════
  let threeLoaded = false, threeLoadPromise = null;
  let modelViewerLoaded = false, modelViewerLoadPromise = null;

  function create3DOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'viewer3dOverlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) close3D(); });
    overlay.innerHTML = `
      <div class="viewer3d-container" id="v3dContainer">
        <div class="viewer3d-loading" id="v3dLoading">
          <div class="viewer3d-loading-spinner">📦</div>
          <div class="viewer3d-loading-text">Loading...</div>
        </div>
        <div class="viewer3d-hud" id="v3dHud">
          <span class="viewer3d-title" id="v3dTitle">3D Viewer</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  function open3D(title, builder, engineType = 'three') {
    const overlay = document.getElementById('viewer3dOverlay');
    const loading = document.getElementById('v3dLoading');
    const titleEl = document.getElementById('v3dTitle');
    const container = document.getElementById('v3dContainer');

    Array.from(container.children).forEach(child => {
        if (!['v3dLoading', 'v3dHud'].includes(child.id)) child.remove();
    });

    if (titleEl) titleEl.textContent = title;
    if (loading) loading.classList.remove('hidden');
    overlay.classList.add('show');
    Haptic.doubleTap();
    window.autoDismiss3D('viewer3dOverlay',close3D);

    const loader = engineType === 'model-viewer' ? loadModelViewerJS() : loadThreeJS();

    loader.then(() => {
      if (loading) loading.classList.add('hidden');
      Haptic.success();
      builder(container);
    }).catch(err => {
      console.error(`${engineType} load failed:`, err);
      Haptic.warning();
      if (loading) loading.querySelector('.viewer3d-loading-text').textContent = 'Failed to load';
    });
  }

  function close3D() {
    Haptic.tap();
    const overlay = document.getElementById('viewer3dOverlay');
    overlay?.classList.remove('show');
    window.cancelAutoDismiss('viewer3dOverlay');
    const container = document.getElementById('v3dContainer');
    if (container) {
        if (container.querySelector('canvas')) container.querySelector('canvas').remove();
        if (container.querySelector('model-viewer')) container.querySelector('model-viewer').remove();
    }
    if (window._v3dCleanup) { window._v3dCleanup(); window._v3dCleanup = null; }
  }
  window._close3D = close3D;

  function loadThreeJS() {
    if (threeLoaded && window.THREE) return Promise.resolve();
    if (threeLoadPromise) return threeLoadPromise;
    threeLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => { threeLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return threeLoadPromise;
  }

  function loadModelViewerJS() {
    if (modelViewerLoaded || customElements.get('model-viewer')) return Promise.resolve();
    if (modelViewerLoadPromise) return modelViewerLoadPromise;
    modelViewerLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => { modelViewerLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return modelViewerLoadPromise;
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 3: BOOK VIEWER (3D & AR)
  // ═══════════════════════════════════════════════════
  function launchBookViewer() {
    open3D('📘 3D Book Viewer', buildBookScene, 'model-viewer');
  }

  function buildBookScene(container) {
    const mvHTML = `
      <model-viewer
        src="book.glb"
        ios-src="book.usdz"
        ar
        ar-modes="webxr scene-viewer quick-look"
        alt="A 3D model of The Bilingual Executive book"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        loading="eager"
      >
        <button slot="ar-button" class="ar-btn" title="View in AR">👁</button>
      </model-viewer>
      <div class="viewer3d-hint" id="v3dHint">
        ${isMobile ? 'Pinch · Drag · Tap AR' : 'Scroll · Drag · Click'}
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mvHTML;
    while (tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

    const mv = container.querySelector('model-viewer');

    if (mv) {
      mv.addEventListener('error', () => {
        Haptic.warning();
        const hint = document.getElementById('v3dHint');
        if (hint) hint.textContent = '⚠️ Model not found';
      });

      let userInteracting = false;
      mv.addEventListener('camera-change', () => { if (userInteracting) Haptic.rotate(); });
      mv.addEventListener('interact-started', () => { userInteracting = true; });
      mv.addEventListener('interact-stopped', () => { userInteracting = false; });
      mv.addEventListener('ar-status', (e) => {
        if (e.detail.status === 'session-started') Haptic.arEnter();
        else if (e.detail.status === 'not-presenting') Haptic.tap();
      });

      let lastPinchDist = 0;
      mv.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist && Math.abs(dist - lastPinchDist) > 8) Haptic.zoom();
          lastPinchDist = dist;
        }
      }, { passive: true });
      mv.addEventListener('touchend', () => { lastPinchDist = 0; }, { passive: true });
    }

    // ─────────────────────────────────────────────
    // DRAG VS CLICK DETECTION LOGIC
    // ─────────────────────────────────────────────
    let startX = 0, startY = 0;
    let isDragging = false;

    const onDown = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      isDragging = false;
    };

    mv.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    mv.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

    mv.addEventListener('mousemove', (e) => {
      const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
      if (dx > 8 || dy > 8) { isDragging = true; Haptic.rotate(); }
    });

    mv.addEventListener('click', (e) => {
      if (e.target.closest('.ar-btn, [slot="ar-button"]')) { Haptic.arEnter(); return; }
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);

      if (diffX < 5 && diffY < 5) {
        Haptic.hold();
        window.open('https://bilingualexecutive.amrelharony.com/', '_blank');
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    mv.addEventListener('wheel', () => Haptic.zoom(), { passive: true });
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE FINTECH VISUALIZER (THREE.JS + BINANCE WS)
  // ═══════════════════════════════════════════════════
  function launchDataMesh() {
    open3D('📊 Live Trades', buildMeshScene, 'three');
  }

  function buildMeshScene(container) {
    if (typeof THREE === 'undefined') { console.error('THREE.js not loaded'); return; }
    const ASSET_COLORS = { BTCUSDT: 0x00e1ff, ETHUSDT: 0xa855f7, SOLUSDT: 0x22c55e };
    const ASSET_LABELS = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
    const NODE_LIFETIME = 4000;
    const MAX_NODES = 60;

    // --- HUD ---
    const hud = document.createElement('div');
    hud.className = 'ftv-hud';
    hud.innerHTML = `
      <div class="ftv-hud-top">
        <div class="ftv-price" id="ftvPrice">BTC --</div>
        <div class="ftv-tps" id="ftvTps">0 trades/s</div>
      </div>
      <div class="ftv-ticker" id="ftvTicker"></div>`;
    container.appendChild(hud);

    const hint = document.createElement('div');
    hint.className = 'viewer3d-hint';
    hint.id = 'ftvHint';
    hint.textContent = 'Live · Binance';
    container.appendChild(hint);

    // --- THREE.JS SCENE ---
    const W = container.clientWidth, H = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    container.insertBefore(renderer.domElement, hint);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, wireframe: true, transparent: true, opacity: 0.3 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const nodes = [];
    const lines = [];
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, color: 0x00e1ff });

    function randomOnSphere(radius) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }

    function spawnNode(trade) {
      const assetColor = ASSET_COLORS[trade.s] || 0x00e1ff;
      const isBuy = !trade.m;
      const qty = parseFloat(trade.q) || 0.01;
      const size = Math.max(0.04, Math.min(0.2, Math.log10(qty + 1) * 0.08));
      Haptic.trade(isBuy);
      const brightness = isBuy ? 1.0 : 0.5;

      const geo = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: assetColor, transparent: true, opacity: brightness
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = randomOnSphere(2.5 + Math.random() * 1.0);
      mesh.position.copy(pos);
      group.add(mesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), pos]);
      const lMat = lineMat.clone();
      lMat.color = new THREE.Color(assetColor);
      lMat.opacity = 0.15;
      const line = new THREE.Line(lineGeo, lMat);
      group.add(line);

      const born = performance.now();
      nodes.push({ mesh, mat, born });
      lines.push({ line, lMat, born });

      while (nodes.length > MAX_NODES) {
        const old = nodes.shift();
        group.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mat.dispose();
      }
      while (lines.length > MAX_NODES) {
        const old = lines.shift();
        group.remove(old.line);
        old.line.geometry.dispose();
        old.lMat.dispose();
      }

      coreMat.opacity = 0.6;
    }

    // --- ANIMATE ---
    let alive = true;
    function animate() {
      if (!alive || !renderer.domElement.closest('body')) { alive = false; return; }
      requestAnimationFrame(animate);

      group.rotation.y += 0.002;
      group.rotation.x += 0.0005;

      if (coreMat.opacity > 0.3) coreMat.opacity -= 0.005;

      const now = performance.now();
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const age = now - n.born;
        if (age > NODE_LIFETIME) {
          group.remove(n.mesh);
          n.mesh.geometry.dispose();
          n.mat.dispose();
          nodes.splice(i, 1);
        } else {
          n.mat.opacity = Math.max(0, (1 - age / NODE_LIFETIME) * (n.mat.opacity > 0.5 ? 1.0 : 0.5));
        }
      }
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        const age = now - l.born;
        if (age > NODE_LIFETIME * 0.6) {
          group.remove(l.line);
          l.line.geometry.dispose();
          l.lMat.dispose();
          lines.splice(i, 1);
        } else {
          l.lMat.opacity = Math.max(0, 0.15 * (1 - age / (NODE_LIFETIME * 0.6)));
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // --- WEBSOCKET ---
    let ws = null;
    let reconnectDelay = 1000;
    let tradeCount = 0;
    let tpsInterval = null;
    let lastBtcPrice = null;
    const recentTrades = [];

    function updateHUD(trade) {
      const label = ASSET_LABELS[trade.s] || trade.s;
      const price = parseFloat(trade.p);
      const qty = parseFloat(trade.q);
      const arrow = trade.m ? '↓' : '↑';
      const color = trade.m ? '#ef4444' : '#22c55e';

      if (trade.s === 'BTCUSDT') {
        const el = document.getElementById('ftvPrice');
        if (el) {
          const dir = lastBtcPrice ? (price > lastBtcPrice ? '▲' : price < lastBtcPrice ? '▼' : '') : '';
          const cls = price >= (lastBtcPrice || price) ? 'color:#22c55e' : 'color:#ef4444';
          el.innerHTML = `BTC <span style="${cls}">$${price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${dir}</span>`;
          lastBtcPrice = price;
        }
      }

      recentTrades.unshift({ label, price, qty, arrow, color });
      if (recentTrades.length > 8) recentTrades.length = 8;
      const ticker = document.getElementById('ftvTicker');
      if (ticker) {
        ticker.innerHTML = recentTrades.map(t =>
          `<span class="ftv-trade"><span style="color:${t.color}">${t.arrow}</span> ${t.label} $${t.price.toLocaleString(undefined,{maximumFractionDigits:2})} <span style="opacity:.4">${t.qty.toFixed(4)}</span></span>`
        ).join('');
      }

      tradeCount++;
    }

    function connectWS() {
      if (!alive) return;
      if (ws) { try { ws.onclose = null; ws.close(); } catch(e) {} ws = null; }
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade');
      } catch(e) {
        fallback(); return;
      }

      ws.onopen = () => {
        reconnectDelay = 1000;
        Haptic.success();
        const h = document.getElementById('ftvHint');
        if (h) h.textContent = 'Live · Binance';
      };

      let lastSpawnTime = 0;
      const SPAWN_INTERVAL = 200;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const trade = msg.data;
          if (!trade || !trade.s) return;
          updateHUD(trade);
          const now = performance.now();
          if (now - lastSpawnTime >= SPAWN_INTERVAL) {
            lastSpawnTime = now;
            spawnNode(trade);
          }
        } catch(e) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (!alive) return;
        setTimeout(connectWS, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 8000);
      };
    }

    function fallback() {
      const h = document.getElementById('ftvHint');
      if (h) h.textContent = 'Offline mode';
    }

    connectWS();

    tpsInterval = setInterval(() => {
      const el = document.getElementById('ftvTps');
      if (el) el.textContent = tradeCount + ' trades/s';
      tradeCount = 0;
    }, 1000);

    // --- CLEANUP ---
    window._v3dCleanup = () => {
      alive = false;
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      if (tpsInterval) clearInterval(tpsInterval);
      nodes.forEach(n => { n.mesh.geometry.dispose(); n.mat.dispose(); });
      lines.forEach(l => { l.line.geometry.dispose(); l.lMat.dispose(); });
      renderer.dispose();
    };
  }

  // ═══════════════════════════════════════════════════
  // WIRE UP (ROBUST BADGE FINDER)
  // ═══════════════════════════════════════════════════
  function wireUp() {
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.book3d = () => { setTimeout(launchBookViewer, 300); return '📘 Launching...'; };
    window.TermCmds.datamesh = () => { setTimeout(launchDataMesh, 300); return '📊 Launching Live FinTech Visualizer...'; };
    window.TermCmds.visualizer = () => { setTimeout(launchDataMesh, 300); return '📊 Launching Live FinTech Visualizer...'; };

    const selectors = ['a.lk[href*="bilingual"]', 'a[href*="bilingual"]', 'a[href*="book"]'];
    let bookCard = null;
    for (const sel of selectors) {
      bookCard = document.querySelector(sel);
      if (bookCard) break;
    }

    const existingBadge = document.getElementById('badge3dPreview');
    if (existingBadge) {
      const freshBadge = existingBadge.cloneNode(true);
      freshBadge.addEventListener('mouseenter', () => { freshBadge.style.background = 'rgba(99,102,241,.2)'; freshBadge.style.color = '#fff'; });
      freshBadge.addEventListener('mouseleave', () => { freshBadge.style.background = 'rgba(99,102,241,.1)'; freshBadge.style.color = '#6366f1'; });
      freshBadge.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); launchBookViewer(); });
      existingBadge.replaceWith(freshBadge);
    } else if (bookCard) {
      console.log('✅ Found Book Card');
      const badge = document.createElement('span');
      badge.id = 'badge3dPreview';
      badge.style.cssText = `
        font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;
        text-transform:uppercase;padding:4px 8px;border-radius:100px;
        background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);
        color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;
        display:inline-flex;align-items:center;gap:4px;white-space:nowrap;
        position:relative;z-index:10;
      `;
      badge.innerHTML = '📦 3D PREVIEW';
      badge.addEventListener('mouseenter', () => { badge.style.background = 'rgba(99,102,241,.2)'; badge.style.color = '#fff'; });
      badge.addEventListener('mouseleave', () => { badge.style.background = 'rgba(99,102,241,.1)'; badge.style.color = '#6366f1'; });
      badge.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        launchBookViewer();
      });

      const sub = bookCard.querySelector('.lsu');
      if(sub) {
          sub.style.display='flex'; sub.style.flexDirection='column'; sub.style.alignItems='flex-start';
          sub.appendChild(badge);
      } else {
          bookCard.style.display='flex'; bookCard.style.flexDirection='column';
          bookCard.appendChild(badge);
      }
    } else {
      console.log('⚠️ Book card not found. Badge skipped.');
    }
  }

  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  window._haptic = Haptic;

  function init() {
    create3DOverlay();
    initAskAmr();
    wireUp();
    console.log('%c🤖 Phase 4 Loaded', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
