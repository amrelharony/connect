// visualizer-data-mesh.js — Live FinTech Visualizer (Three.js + Binance WebSocket)
// Requires: ai3d-core.js (window._AI3D)
(function() {
  'use strict';
  var A = window._AI3D;

  // ── Data Mesh CSS ──
  var css = document.createElement('style');
  css.id = 'data-mesh-css';
  css.textContent = `
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
@media(max-width:600px) { .ftv-hud { padding: 8px 10px; } .ftv-price { font-size: 9px; } }
`;
  document.head.appendChild(css);

  function launchDataMesh() {
    A.open3D('\ud83d\udcca Live Trades', buildMeshScene, 'three');
  }

  function buildMeshScene(container) {
    if (typeof THREE === 'undefined') { console.error('THREE.js not loaded'); return; }
    const ASSET_COLORS = { BTCUSDT: 0x00e1ff, ETHUSDT: 0xa855f7, SOLUSDT: 0x22c55e };
    const ASSET_LABELS = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
    const NODE_LIFETIME = 4000;
    const MAX_NODES = 60;

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
    hint.textContent = 'Live \u00b7 Binance';
    container.appendChild(hint);

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
      A.Haptic.trade(isBuy);
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

    let alive = true;
    function animate() {
      if (!alive || !renderer.domElement.closest('body')) { alive = false; return; }
      requestAnimationFrame(animate);
      if (window._suspended) return;

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
      const arrow = trade.m ? '\u2193' : '\u2191';
      const color = trade.m ? '#ef4444' : '#22c55e';

      if (trade.s === 'BTCUSDT') {
        const el = document.getElementById('ftvPrice');
        if (el) {
          const dir = lastBtcPrice ? (price > lastBtcPrice ? '\u25b2' : price < lastBtcPrice ? '\u25bc' : '') : '';
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
        A.Haptic.success();
        const h = document.getElementById('ftvHint');
        if (h) h.textContent = 'Live \u00b7 Binance';
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
            if (window._sono) window._sono.vizTrade(trade);
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

    window._v3dCleanup = () => {
      alive = false;
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      if (tpsInterval) clearInterval(tpsInterval);
      nodes.forEach(n => { n.mesh.geometry.dispose(); n.mat.dispose(); });
      lines.forEach(l => { l.line.geometry.dispose(); l.lMat.dispose(); });
      lineMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }

  // Register terminal commands
  window.TermCmds = window.TermCmds || {};
  window.TermCmds.datamesh = () => { setTimeout(launchDataMesh, 300); return '\ud83d\udcca Launching Live FinTech Visualizer...'; };
  window.TermCmds.visualizer = () => { setTimeout(launchDataMesh, 300); return '\ud83d\udcca Launching Live FinTech Visualizer...'; };
})();
