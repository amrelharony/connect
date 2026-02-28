'use strict';

let W = 0, H = 0, CD = 140, MR = 200;
let mouse = { x: -9999, y: -9999 };
let gy = { x: 0, y: 0 };
let pts = [];

function createParticle() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.2 + 0.4, ph: Math.random() * 6.28, cr: 0
  };
}

function updateParticle(p) {
  p.ph += 0.015;
  p.cr = p.r + Math.sin(p.ph) * 0.25;
  p.x += p.vx + gy.x * 0.04;
  p.y += p.vy + gy.y * 0.04;
  if (p.x < -10) p.x = W + 10;
  if (p.x > W + 10) p.x = -10;
  if (p.y < -10) p.y = H + 10;
  if (p.y > H + 10) p.y = -10;
  const dx = mouse.x - p.x, dy = mouse.y - p.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < MR && d > 0) {
    const f = (MR - d) / MR;
    p.x -= (dx / d) * f * 2.5;
    p.y -= (dy / d) * f * 2.5;
  }
}

function computeFrame() {
  const n = pts.length;
  const posData = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    updateParticle(pts[i]);
    posData[i * 3] = pts[i].x;
    posData[i * 3 + 1] = pts[i].y;
    posData[i * 3 + 2] = pts[i].cr;
  }

  const connBuf = [];
  const cdSq = CD * CD;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const dd = dx * dx + dy * dy;
      if (dd < cdSq) {
        connBuf.push(i, j, 1 - Math.sqrt(dd) / CD);
      }
    }
  }
  const connections = new Float32Array(connBuf);

  self.postMessage({ positions: posData, connections: connections },
    [posData.buffer, connections.buffer]);
}

self.onmessage = function(e) {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      W = msg.W; H = msg.H;
      CD = msg.CD || 140; MR = msg.MR || 200;
      pts = [];
      for (let i = 0; i < msg.count; i++) pts.push(createParticle());
      break;
    case 'resize':
      W = msg.W; H = msg.H;
      break;
    case 'input':
      if (msg.mouse) mouse = msg.mouse;
      if (msg.gy) gy = msg.gy;
      break;
    case 'tick':
      computeFrame();
      break;
  }
};
