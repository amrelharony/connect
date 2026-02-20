// ═══════════════════════════════════════════════════════════════
// PHASE 4: AI, INTERACTIVE 3D & AR — amrelharony.com
// Drop-in: <script src="phase4-ai-3d.js" defer></script>
//
// Features:
//   1. "Ask Amr" Terminal Chatbot
//   2. Context-Aware Hover Previews
//   3. 3D & AR Book Viewer (Click-Safe)
//   4. 3D Data Mesh Visualizer
// ═══════════════════════════════════════════════════════════════
(function PhaseFourAI3DAR() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase4-css';
  css.textContent = `
/* 1. ASK AMR */
.term-chat-msg { margin: 6px 0; padding: 8px 10px; border-radius: 8px; font-size: 11px; line-height: 1.6; animation: termFadeIn .3s ease; }
@keyframes termFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.term-chat-q { background: rgba(0,225,255,.06); border-left: 2px solid var(--accent, #00e1ff); color: #c9d1d9; }
.term-chat-a { background: rgba(255,255,255,.03); border-left: 2px solid rgba(255,255,255,.08); color: #8b949e; }
.term-chat-a strong { color: #e2e8f0; } .term-chat-a .highlight { color: #00e1ff; }
.term-chat-typing { display: inline-flex; gap: 3px; padding: 4px 0; }
.term-chat-typing span { width: 4px; height: 4px; border-radius: 50%; background: #00e1ff; animation: typeDot 1.2s ease-in-out infinite; }
.term-chat-typing span:nth-child(2) { animation-delay: .2s; } .term-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
.term-chat-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.term-chat-topic { font-family: 'JetBrains Mono', monospace; font-size: 8px; padding: 2px 8px; border-radius: 100px; border: 1px solid rgba(0,225,255,.15); color: #00e1ff; cursor: pointer; transition: all .2s; }
.term-chat-topic:hover { background: rgba(0,225,255,.08); border-color: #00e1ff; }

/* 2. HOVER PREVIEWS */
.hover-preview { position: fixed; z-index: 9998; max-width: 280px; padding: 10px 14px; border-radius: 12px; background: rgba(13,20,32,.97); border: 1px solid #1a2332; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,.4); pointer-events: none; opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; font-size: 11px; line-height: 1.5; color: #8b949e; }
.hover-preview.show { opacity: 1; transform: translateY(0); }
.hover-preview-title { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
.hover-preview-title.tech { color: #00e1ff; } .hover-preview-title.biz { color: #22c55e; }
.hover-preview-body { color: #c9d1d9; } .hover-preview-body strong { color: #e2e8f0; }
body.zen-mode .hover-preview { display: none !important; }
@media(max-width:768px) { .hover-preview { display: none !important; } }

/* 3. 3D VIEWER OVERLAY */
#viewer3dOverlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.96); display: flex; align-items: center; justify-content: center; flex-direction: column; opacity: 0; visibility: hidden; transition: opacity .4s, visibility .4s; pointer-events: none; backdrop-filter: blur(14px); }
#viewer3dOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.viewer3d-container { width: 96%; max-width: 500px; height: 400px; border-radius: 16px; overflow: hidden; border: 1px solid #1a2332; background: #060910; position: relative; transform: scale(.9); transition: transform .5s cubic-bezier(.16,1,.3,1); }
#viewer3dOverlay.show .viewer3d-container { transform: scale(1); }
model-viewer { width: 100%; height: 100%; --poster-color: transparent; }

.viewer3d-hud { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 10; }
.viewer3d-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(0,225,255,.6); text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
.viewer3d-close { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer; pointer-events: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid #1a2332; background: rgba(0,0,0,.8); transition: all .2s; }
.viewer3d-close:hover { color: #00e1ff; border-color: rgba(0,225,255,.2); }
.viewer3d-hint { position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #6f7b8f; letter-spacing: 1px; pointer-events: none; z-index: 10; }
.viewer3d-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; background: #060910; z-index: 20; transition: opacity .5s; }
.viewer3d-loading.hidden { opacity: 0; pointer-events: none; }
.viewer3d-loading-text { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: #4a5568; }
.viewer3d-loading-spinner { font-size: 28px; animation: v3dSpin 2s ease-in-out infinite; }
@keyframes v3dSpin { 0% { transform: rotateY(0); } 100% { transform: rotateY(360deg); } }

/* AR Button Styling - Forced Visible */
#ar-button {
  background-image: url(https://cdn.glitch.global/a92517b6-34df-4658-9b32-0469cb28037f/ar_icon_white.png?v=1660934672966);
  background-repeat: no-repeat; background-size: 20px 20px; background-position: 12px 50%;
  background-color: rgba(0, 225, 255, 0.9); position: absolute; left: 50%; transform: translateX(-50%);
  white-space: nowrap; bottom: 40px; padding: 0px 16px 0px 40px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #060910;
  height: 36px; line-height: 36px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 4px 12px rgba(0,225,255,0.3); cursor: pointer; transition: all 0.2s; z-index: 15;
}
#ar-button:hover { background-color: #fff; color: #00e1ff; box-shadow: 0 4px 16px rgba(0,225,255,0.5); }
.mesh-label { position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: rgba(255,255,255,.7); pointer-events: none; text-shadow: 0 1px 4px rgba(0,0,0,.8); white-space: nowrap; transform: translate(-50%, -50%); }
@media(max-width:600px) { .viewer3d-container { height: 450px; max-height: 80vh; } }
`;
  document.head.appendChild(css);

  // 1. ASK AMR (Condensed for brevity)
  const KB = [{ keys: ['who','about','intro'], answer: `I'm <strong>Amr Elharony</strong> — a Delivery Lead at <strong>Banque Misr</strong>.` }];
  function askAmr(q) { return q ? `I don't have a specific answer. Try: <strong>career, book, certifications</strong>.` : `👋 Hey! Ask me about Amr's <strong>book or career</strong>.`; }
  function initAskAmr() {
    if (!window.TermCmds) return;
    window.TermCmds.ask = (args) => {
      const ans = askAmr(args);
      return `<div class="term-chat-msg term-chat-q">❓ ${args||''}</div><div class="term-chat-msg term-chat-a">${ans}</div>`;
    };
    window.TermCmds.amr = window.TermCmds.ask;
  }

  // 2. HOVER PREVIEWS
  function initHoverPreviews() {
    if (isMobile) return;
    const t = document.createElement('div'); t.className = 'hover-preview'; document.body.appendChild(t);
    document.querySelectorAll('a.lk[href*="bilingual"]').forEach(l => {
      l.addEventListener('mouseenter', () => { t.innerHTML='<div class="hover-preview-body"><strong>THE BOOK</strong><br>A leadership guide.</div>'; t.classList.add('show'); });
      l.addEventListener('mouseleave', () => t.classList.remove('show'));
    });
  }

  // 3D CORE
  let threeL=false, threeP=null, mvL=false, mvP=null;
  function create3DOverlay() {
    const o = document.createElement('div'); o.id = 'viewer3dOverlay';
    o.addEventListener('click', e => { if (e.target === o) close3D(); });
    o.innerHTML = `<div class="viewer3d-container" id="v3dContainer"><div class="viewer3d-loading" id="v3dLoading"><div class="viewer3d-loading-spinner">📦</div></div><div class="viewer3d-hud"><span class="viewer3d-title" id="v3dTitle">3D</span><span class="viewer3d-close" onclick="window._close3D()">✕ Close</span></div></div>`;
    document.body.appendChild(o);
  }
  function open3D(title, builder, type='three') {
    const o = document.getElementById('viewer3dOverlay'), c = document.getElementById('v3dContainer');
    Array.from(c.children).forEach(ch => { if(!['v3dLoading','v3dHud'].includes(ch.id) && !ch.classList.contains('viewer3d-hud')) ch.remove(); });
    document.getElementById('v3dTitle').textContent = title;
    document.getElementById('v3dLoading').classList.remove('hidden');
    o.classList.add('show');
    (type==='model-viewer' ? loadMV() : loadThree()).then(() => {
      document.getElementById('v3dLoading').classList.add('hidden');
      builder(c);
    });
  }
  function close3D() { document.getElementById('viewer3dOverlay').classList.remove('show'); if(window._v3dCleanup) window._v3dCleanup(); }
  window._close3D = close3D;
  function loadThree() {
    if(threeL) return Promise.resolve();
    return threeP || (threeP = new Promise(r => { const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload=()=>{threeL=true;r()}; document.head.appendChild(s); }));
  }
  function loadMV() {
    if(mvL) return Promise.resolve();
    return mvP || (mvP = new Promise(r => { const s=document.createElement('script'); s.type='module'; s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'; s.onload=()=>{mvL=true;r()}; document.head.appendChild(s); }));
  }

  // 3. BOOK VIEWER (FIXED DRAG vs CLICK)
  function launchBookViewer() { open3D('📘 The Bilingual Executive', buildBook, 'model-viewer'); }
  function buildBook(c) {
    // Note: The AR button will ONLY appear on mobile devices that support AR.
    const h = `
      <model-viewer src="book.glb" ios-src="book.usdz" ar ar-modes="webxr scene-viewer quick-look" camera-controls shadow-intensity="1" auto-rotate>
        <button slot="ar-button" id="ar-button">View in your space</button>
      </model-viewer>
      <div class="viewer3d-hint">${isMobile ? 'Pinch to zoom' : 'Drag to rotate · Click to open site'}</div>`;
    const d = document.createElement('div'); d.innerHTML = h;
    while (d.firstChild) c.appendChild(d.firstChild);

    // --- DRAG vs CLICK LOGIC ---
    const mv = c.querySelector('model-viewer');
    let startX = 0, startY = 0;
    
    // Capture start position
    const onStart = (x,y) => { startX = x; startY = y; };
    mv.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
    mv.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY));

    // Calculate distance on Click
    const onClick = (e) => {
      // Get end position (mouse or touch)
      let endX = e.clientX, endY = e.clientY;
      if (e.changedTouches && e.changedTouches.length > 0) {
          endX = e.changedTouches[0].clientX;
          endY = e.changedTouches[0].clientY;
      }
      // Distance formula
      const dist = Math.hypot(endX - startX, endY - startY);
      
      // If moved less than 10 pixels, it's a CLICK. Otherwise, it's a DRAG.
      if (dist < 10) {
         window.open('https://bilingualexecutive.amrelharony.com/', '_blank');
      }
    };
    
    mv.addEventListener('click', onClick);
  }

  // 4. DATA MESH
  function launchDataMesh() { open3D('🔀 Data Mesh', buildMesh, 'three'); }
  function buildMesh(c) {
    const W=c.clientWidth, H=c.clientHeight;
    const sc=new THREE.Scene(); sc.background=new THREE.Color(0x060910);
    const ca=new THREE.PerspectiveCamera(50,W/H,0.1,100); ca.position.z=7;
    const re=new THREE.WebGLRenderer({antialias:true}); re.setSize(W,H); c.appendChild(re.domElement);
    const g=new THREE.IcosahedronGeometry(1.5,0); const m=new THREE.MeshBasicMaterial({color:0x00e1ff,wireframe:true});
    const sp=new THREE.Mesh(g,m); sc.add(sp);
    function ani(){ if(!re.domElement.closest('body'))return; requestAnimationFrame(ani); sp.rotation.x+=0.01; sp.rotation.y+=0.01; re.render(sc,ca); }
    ani(); window._v3dCleanup=()=>{re.dispose();};
  }

  // INIT
  function init() {
    create3DOverlay(); initAskAmr(); initHoverPreviews();
    // Badge logic
    const sel = ['a.lk[href*="bilingual"]','a[href*="bilingual"]','a[href*="book"]'];
    let b = null; for(const s of sel){ b=document.querySelector(s); if(b)break; }
    if(b) {
      const sp = document.createElement('span');
      sp.style.cssText='font-family:monospace;font-size:9px;padding:4px 8px;border-radius:10px;background:#eee;color:#333;margin-top:5px;cursor:pointer;display:inline-block;';
      sp.innerHTML='📦 3D + AR';
      sp.onclick=(e)=>{e.preventDefault();e.stopPropagation();launchBookViewer();};
      b.parentNode.insertBefore(sp, b.nextSibling);
    }
    if (window.TermCmds) window.TermCmds.book3d = launchBookViewer;
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>setTimeout(init,350)); else setTimeout(init,350);
})();
