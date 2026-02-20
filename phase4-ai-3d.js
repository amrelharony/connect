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
  position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.96);
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  opacity: 0; visibility: hidden; transition: opacity .4s, visibility .4s;
  pointer-events: none; backdrop-filter: blur(14px);
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
@media(max-width:600px) { .viewer3d-container { height: 450px; max-height: 80vh; } }
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
    if (!window.TermCmds) return;
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
          <div class="viewer3d-loading-text">Loading 3D engine...</div>
        </div>
        <div class="viewer3d-hud" id="v3dHud">
          <span class="viewer3d-title" id="v3dTitle">3D Viewer</span>
          <span class="viewer3d-close" onclick="window._close3D()"ESC</span>
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

    const loader = engineType === 'model-viewer' ? loadModelViewerJS() : loadThreeJS();

    loader.then(() => {
      if (loading) loading.classList.add('hidden');
      builder(container);
    }).catch(err => {
      console.error(`${engineType} load failed:`, err);
      if (loading) loading.querySelector('.viewer3d-loading-text').textContent = 'Failed to load 3D engine';
    });
  }

  function close3D() {
    const overlay = document.getElementById('viewer3dOverlay');
    overlay?.classList.remove('show');
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
  // FEATURE 3: BOOK VIEWER (3D Only - No AR)
  // ═══════════════════════════════════════════════════
  function launchBookViewer() {
    // Title updated to remove "AR"
    open3D('📘 The Bilingual Executive — 3D Viewer', buildBookScene, 'model-viewer');
  }

  function buildBookScene(container) {
    // REMOVED: ar, ar-modes, ios-src, and the slot="ar-button" button
    const mvHTML = `
      <model-viewer
        src="book.glb"
        alt="A 3D model of The Bilingual Executive book"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        loading="eager"
      >
      </model-viewer>
      <div class="viewer3d-hint" id="v3dHint">
        ${isMobile ? 'Pinch to zoom · Drag to rotate' : 'Scroll to zoom · Drag to rotate · Click to open site'}
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mvHTML;
    while (tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

    const mv = container.querySelector('model-viewer');

    // ─────────────────────────────────────────────
    // DRAG VS CLICK DETECTION LOGIC
    // ─────────────────────────────────────────────
    let startX = 0, startY = 0;

    const onDown = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
    };

    mv.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    mv.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

    mv.addEventListener('click', (e) => {
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);

      // Only open if movement is minimal (a genuine click, not a rotate drag)
      if (diffX < 5 && diffY < 5) {
        window.open('https://bilingualexecutive.amrelharony.com/', '_blank');
      } else {
        // Prevent default behavior if it was a drag
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 4: DATA MESH (THREE.JS)
  // ═══════════════════════════════════════════════════
  function launchDataMesh() {
    open3D('🔀 Data Mesh — Interactive Domains', buildMeshScene, 'three');
  }

  function buildMeshScene(container) {
    const hint = document.createElement('div');
    hint.className = 'viewer3d-hint';
    hint.textContent = 'Drag to rotate · Scroll to zoom';
    container.appendChild(hint);

    const W = container.clientWidth, H = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    container.insertBefore(renderer.domElement, hint);

    const geometry = new THREE.IcosahedronGeometry(1.5, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0x00e1ff, wireframe: true });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    function animate() {
      if (!renderer.domElement.closest('body')) return;
      requestAnimationFrame(animate);
      sphere.rotation.x += 0.005;
      sphere.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    animate();

    window._v3dCleanup = () => { renderer.dispose(); };
  }

  // ═══════════════════════════════════════════════════
  // WIRE UP (ROBUST BADGE FINDER)
  // ═══════════════════════════════════════════════════
  function wireUp() {
    if (window.TermCmds) {
      window.TermCmds.book3d = () => { setTimeout(launchBookViewer, 300); return '📘 Launching...'; };
      window.TermCmds.datamesh = () => { setTimeout(launchDataMesh, 300); return '🔀 Launching...'; };
    }

    const selectors = ['a.lk[href*="bilingual"]', 'a[href*="bilingual"]', 'a[href*="book"]'];
    let bookCard = null;
    for (const sel of selectors) {
      bookCard = document.querySelector(sel);
      if (bookCard) break;
    }

    if (bookCard) {
      console.log('✅ Found Book Card');
      const badge = document.createElement('span');
      badge.style.cssText = `
        font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;
        text-transform:uppercase;padding:4px 8px;border-radius:100px;
        background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);
        color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;
        display:inline-flex;align-items:center;gap:4px;white-space:nowrap;
        position:relative;z-index:10;
      `;
      // UPDATED LABEL: Removed "AR"
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

  function init() {
    create3DOverlay();
    initAskAmr();
    wireUp();
    console.log('%c🤖 Phase 4 Loaded', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 350));
  else setTimeout(init, 350);

})();
