'use strict';

let columns = 0, canvasHeight = 0, fontSize = 14;
let drops = [];
const chars = '01AMRELHARONYDATAAGILEFINTECH\u0662\u0660\u0662\u0666';
const TRAIL_LEN = 12;

function computeFrame() {
  const n = drops.length;
  const headChars = new Uint16Array(n);
  const headY = new Float32Array(n);
  const trailData = [];

  for (let i = 0; i < n; i++) {
    headChars[i] = chars.charCodeAt(Math.floor(Math.random() * chars.length));
    headY[i] = drops[i] * fontSize;

    for (let t = 1; t <= TRAIL_LEN; t++) {
      const ty = headY[i] - t * fontSize;
      if (ty < 0) break;
      trailData.push(i, ty, (1 - t / TRAIL_LEN) * 0.4,
        chars.charCodeAt(Math.floor(Math.random() * chars.length)));
    }

    if (drops[i] * fontSize > canvasHeight && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }

  const trails = new Float32Array(trailData);
  self.postMessage({ headChars, headY, trails }, [headChars.buffer, headY.buffer, trails.buffer]);
}

self.onmessage = function(e) {
  const msg = e.data;
  if (msg.type === 'init') {
    columns = msg.columns;
    canvasHeight = msg.canvasHeight;
    fontSize = msg.fontSize || 14;
    drops = Array(columns).fill(1);
  } else if (msg.type === 'tick') {
    computeFrame();
  }
};
