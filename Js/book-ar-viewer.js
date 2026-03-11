// book-ar-viewer.js — 3D Book Viewer (<model-viewer>), pinch/zoom haptics, badge finder
// Requires: ai3d-core.js (window._AI3D)
(function() {
  'use strict';
  var A = window._AI3D;

  function launchBookViewer() {
    A.open3D('\ud83d\udcd8 3D Book Viewer', buildBookScene, 'model-viewer');
  }

  function buildBookScene(container) {
    const mvHTML = `
      <model-viewer
        src="Assets/book.glb"
        ios-src="Assets/book.usdz"
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
        <button slot="ar-button" class="ar-btn" title="View in AR">\ud83d\udc41</button>
      </model-viewer>
      <div class="viewer3d-hint" id="v3dHint">
        ${A.isMobile ? 'Pinch \u00b7 Drag \u00b7 Tap AR' : 'Scroll \u00b7 Drag \u00b7 Rotate'}
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mvHTML;
    while (tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

    const mv = container.querySelector('model-viewer');

    if (mv) {
      mv.style.touchAction = 'none';

      mv.addEventListener('error', () => {
        A.Haptic.warning();
        const hint = document.getElementById('v3dHint');
        if (hint) hint.textContent = '\u26a0\ufe0f Model not found';
      });

      let userInteracting = false;
      mv.addEventListener('camera-change', () => { if (userInteracting) A.Haptic.rotate(); });
      mv.addEventListener('interact-started', () => { userInteracting = true; });
      mv.addEventListener('interact-stopped', () => { userInteracting = false; });
      mv.addEventListener('ar-status', (e) => {
        if (e.detail.status === 'session-started') A.Haptic.arEnter();
        else if (e.detail.status === 'not-presenting') A.Haptic.tap();
      });

      let lastPinchDist = 0;
      mv.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist && Math.abs(dist - lastPinchDist) > 8) A.Haptic.zoom();
          lastPinchDist = dist;
        }
      }, { passive: false });
      mv.addEventListener('touchend', () => { lastPinchDist = 0; }, { passive: true });
      mv.addEventListener('wheel', () => A.Haptic.zoom(), { passive: true });
    }

    window._v3dCleanup = () => {
      if (mv) { mv.remove(); }
    };

    const hud = container.querySelector('#v3dHud');
    if (hud) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'viewer3d-close-btn';
      closeBtn.textContent = '\u2715';
      closeBtn.setAttribute('aria-label', 'Close 3D viewer');
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); A.close3D(); });
      hud.appendChild(closeBtn);
    }
  }

  // ── Badge finder (from wireUp) ──
  function wireUpBadge() {
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
      const badge = document.createElement('span');
      badge.id = 'badge3dPreview';
      badge.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;border-radius:100px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;position:relative;z-index:10;";
      badge.innerHTML = '\ud83d\udce6 3D PREVIEW';
      badge.addEventListener('mouseenter', () => { badge.style.background = 'rgba(99,102,241,.2)'; badge.style.color = '#fff'; });
      badge.addEventListener('mouseleave', () => { badge.style.background = 'rgba(99,102,241,.1)'; badge.style.color = '#6366f1'; });
      badge.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        launchBookViewer();
      });
      const sub = bookCard.querySelector('.lsu');
      if (sub) {
        sub.style.display = 'flex'; sub.style.flexDirection = 'column'; sub.style.alignItems = 'flex-start';
        sub.appendChild(badge);
      } else {
        bookCard.style.display = 'flex'; bookCard.style.flexDirection = 'column';
        bookCard.appendChild(badge);
      }
    }
  }

  // Register terminal command + badge
  window.TermCmds = window.TermCmds || {};
  window.TermCmds.book3d = () => { setTimeout(launchBookViewer, 300); return '\ud83d\udcd8 Launching...'; };
  wireUpBadge();
})();
