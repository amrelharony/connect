// presence-engine.js — Ultra Advanced Presence Engine v2
// Replaces the multiplayer IIFE and Presence Audio Engine from site.js.
// Lazy-loaded: <script src="presence-engine.js" defer></script>

(function PresenceEngineV2() {
  'use strict';

  const _sb = window._sb;
  if (!_sb) return;

  // ═══════════════════════════════════════════════════════════════
  // CONSTANTS & CONFIG
  // ═══════════════════════════════════════════════════════════════

  const AVATARS = ['1F680','1F525','1F4A1','1F30E','1F3AF','1F4BB','1F916','1F9E0','1F3AE','1F4CA','26A1','1F48E','1F6E1','1F52E','1F3C6','2728','1F9D1','1F47E','1F4AB','1F5A5'];
  const SECTIONS = ['hero','timeline','certs','testimonials','conferences','articles','impact'];
  const SECTION_MAP = {
    '.tl-wrap':'timeline','#certGrid':'certs','.tc-section':'testimonials',
    '.conf-strip':'conferences','#linkedinFeed':'articles','.imp':'impact'
  };
  const INTERACTION_WEIGHTS = {
    high_five: 3.0, co_op_lock: 4.0, xp_tip: 2.5, whisper: 2.0,
    power_up: 2.0, formation: 1.5, cursor_chat: 0.5, same_section: 0.1
  };
  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0];
  const TIMBRES = ['sine', 'triangle', 'sawtooth'];

  function emojiFromCode(hex) { return String.fromCodePoint(parseInt(hex, 16)); }
  function escText(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function hashId(id) { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0; return Math.abs(h); }
  function clampPan(v) { return Math.max(-1, Math.min(1, v)); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function vec2Dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function vec2Len(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
  function vec2Norm(v) { const l = vec2Len(v); return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }; }
  function vec2Limit(v, max) { const l = vec2Len(v); if (l <= max) return v; const s = max / l; return { x: v.x * s, y: v.y * s }; }

  // ═══════════════════════════════════════════════════════════════
  // NETWORK OPTIMIZER
  // Delta compression, adaptive sync rate, gossip protocol
  // ═══════════════════════════════════════════════════════════════

  class NetworkOptimizer {
    constructor(engine) {
      this.engine = engine;
      this.lastSentState = {};
      this.syncTimer = null;
      this.currentInterval = 3000;
      this.gossipTimer = null;
      this.gossipVersions = new Map();
      this.cursorVelocity = 0;
      this.prevCursorPos = { x: 0.5, y: 0.5 };
      this.isScrolling = false;
      this.recentInteractions = 0;
      this.lastSectionChange = 0;
      this._scrollTimeout = null;
    }

    start() {
      this._scheduleSync();
      this.gossipTimer = setInterval(() => this._gossipDigest(), 2000);

      window.addEventListener('scroll', () => {
        this.isScrolling = true;
        if (this._scrollTimeout) clearTimeout(this._scrollTimeout);
        this._scrollTimeout = setTimeout(() => { this.isScrolling = false; }, 300);
      }, { passive: true });
    }

    stop() {
      if (this.syncTimer) clearTimeout(this.syncTimer);
      if (this.gossipTimer) clearInterval(this.gossipTimer);
      if (this._scrollTimeout) clearTimeout(this._scrollTimeout);
    }

    recordInteraction() {
      this.recentInteractions++;
      setTimeout(() => { this.recentInteractions = Math.max(0, this.recentInteractions - 1); }, 60000);
    }

    forceSync() {
      this.engine._trackMeta(true);
    }

    computeDelta(current) {
      const delta = {};
      let changed = false;
      for (const key of Object.keys(current)) {
        if (key === 'x' || key === 'y') {
          const qCur = Math.round(current[key] * 65535);
          const qPrev = Math.round((this.lastSentState[key] || 0) * 65535);
          if (Math.abs(qCur - qPrev) > 655) {
            delta[key] = current[key];
            changed = true;
          }
        } else if (JSON.stringify(current[key]) !== JSON.stringify(this.lastSentState[key])) {
          delta[key] = current[key];
          changed = true;
        }
      }
      if (changed) this.lastSentState = { ...current };
      return changed ? delta : null;
    }

    adaptSyncRate() {
      const dx = this.engine.myX - this.prevCursorPos.x;
      const dy = this.engine.myY - this.prevCursorPos.y;
      this.cursorVelocity = Math.sqrt(dx * dx + dy * dy);
      this.prevCursorPos = { x: this.engine.myX, y: this.engine.myY };

      const cursorActivity = clamp01(this.cursorVelocity * 10);
      const scrollActivity = this.isScrolling ? 1 : 0;
      const interactionRate = clamp01(this.recentInteractions / 5);
      const sectionRecency = clamp01(1 - (Date.now() - this.lastSectionChange) / 10000);

      const activity = cursorActivity * 0.3 + scrollActivity * 0.2 + interactionRate * 0.3 + sectionRecency * 0.2;
      this.currentInterval = Math.round(5000 - 4500 * activity);
      this.currentInterval = Math.max(500, Math.min(5000, this.currentInterval));
    }

    _scheduleSync() {
      this.syncTimer = setTimeout(() => {
        this.adaptSyncRate();
        this.engine._trackMeta(false);
        this._scheduleSync();
      }, this.currentInterval);
    }

    _gossipDigest() {
      if (!window._mesh || window._mesh.getOpenCount() === 0) return;
      const digest = {};
      for (const [pid, ver] of this.gossipVersions) {
        digest[pid] = ver;
      }
      if (Object.keys(digest).length > 0) {
        window._mesh.broadcast({ type: 'gossip_digest', from: this.engine.myId, digest });
      }
    }

    handleGossip(payload) {
      if (payload.type === 'gossip_digest') {
        let hasNewer = false;
        for (const [pid, ver] of Object.entries(payload.digest)) {
          const localVer = this.gossipVersions.get(pid) || 0;
          if (ver > localVer) {
            this.gossipVersions.set(pid, ver);
            hasNewer = true;
          }
        }
        if (hasNewer && window._mesh) {
          const merged = {};
          for (const [pid, ver] of this.gossipVersions) merged[pid] = ver;
          window._mesh.broadcast({ type: 'gossip_update', from: this.engine.myId, digest: merged, ttl: 2 });
        }
      } else if (payload.type === 'gossip_update' && payload.ttl > 0) {
        for (const [pid, ver] of Object.entries(payload.digest || {})) {
          const localVer = this.gossipVersions.get(pid) || 0;
          if (ver > localVer) this.gossipVersions.set(pid, ver);
        }
        if (window._mesh) {
          window._mesh.broadcast({ ...payload, ttl: payload.ttl - 1 });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PREDICTIVE CORE
  // Kalman filter for cursor smoothing, Markov chain for section
  // prediction, engagement scoring
  // ═══════════════════════════════════════════════════════════════

  class PredictiveCore {
    constructor(engine) {
      this.engine = engine;
      this.filters = new Map();
      this.markov = new Float64Array(SECTIONS.length * SECTIONS.length);
      this._initMarkov();
      this.engagementData = new Map();
      this.sectionHistory = [];
    }

    _initMarkov() {
      const N = SECTIONS.length;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          this.markov[i * N + j] = 1 / N;
        }
      }
    }

    _getOrCreateFilter(peerId) {
      let kf = this.filters.get(peerId);
      if (!kf) {
        kf = {
          x: new Float64Array(4),   // state: [x, y, vx, vy]
          P: new Float64Array(16),  // 4x4 covariance
          lastUpdate: 0,
          initialized: false
        };
        for (let i = 0; i < 4; i++) kf.P[i * 4 + i] = 1.0;
        this.filters.set(peerId, kf);
      }
      return kf;
    }

    updateFilter(peerId, mx, my) {
      const kf = this._getOrCreateFilter(peerId);
      const now = performance.now() / 1000;

      if (!kf.initialized) {
        kf.x[0] = mx; kf.x[1] = my; kf.x[2] = 0; kf.x[3] = 0;
        kf.lastUpdate = now;
        kf.initialized = true;
        return;
      }

      const dt = Math.min(now - kf.lastUpdate, 5);
      kf.lastUpdate = now;

      // Predict
      this._kalmanPredict(kf, dt);

      // Update with measurement
      const sigmaR = 0.01;
      const R = [sigmaR, 0, 0, sigmaR];

      const S00 = kf.P[0] + R[0], S01 = kf.P[1] + R[1];
      const S10 = kf.P[4] + R[2], S11 = kf.P[5] + R[3];
      const det = S00 * S11 - S01 * S10;
      if (Math.abs(det) < 1e-12) return;
      const invDet = 1 / det;
      const Si00 = S11 * invDet, Si01 = -S01 * invDet;
      const Si10 = -S10 * invDet, Si11 = S00 * invDet;

      // Kalman gain K = P * H^T * S^-1 (H = [I2, 0])
      const K = new Float64Array(8);
      for (let i = 0; i < 4; i++) {
        K[i * 2]     = kf.P[i * 4] * Si00 + kf.P[i * 4 + 1] * Si10;
        K[i * 2 + 1] = kf.P[i * 4] * Si01 + kf.P[i * 4 + 1] * Si11;
      }

      const y0 = mx - kf.x[0], y1 = my - kf.x[1];
      for (let i = 0; i < 4; i++) {
        kf.x[i] += K[i * 2] * y0 + K[i * 2 + 1] * y1;
      }

      const I_KH = new Float64Array(16);
      for (let i = 0; i < 4; i++) I_KH[i * 4 + i] = 1;
      for (let i = 0; i < 4; i++) {
        I_KH[i * 4]     -= K[i * 2];
        I_KH[i * 4 + 1] -= K[i * 2 + 1];
      }
      const newP = new Float64Array(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += I_KH[i * 4 + k] * kf.P[k * 4 + j];
          newP[i * 4 + j] = s;
        }
      }
      kf.P.set(newP);
    }

    predict(peerId, dt) {
      const kf = this.filters.get(peerId);
      if (!kf || !kf.initialized) return null;

      return {
        x: clamp01(kf.x[0] + kf.x[2] * dt),
        y: clamp01(kf.x[1] + kf.x[3] * dt),
        vx: kf.x[2],
        vy: kf.x[3]
      };
    }

    _kalmanPredict(kf, dt) {
      const x0 = kf.x[0], x1 = kf.x[1], x2 = kf.x[2], x3 = kf.x[3];
      kf.x[0] = x0 + x2 * dt;
      kf.x[1] = x1 + x3 * dt;

      const sigmaQ = 0.001;
      const dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;
      const q11 = sigmaQ * dt4 / 4, q13 = sigmaQ * dt3 / 2, q33 = sigmaQ * dt2;

      // F * P * F^T + Q
      const oP = new Float64Array(kf.P);
      for (let i = 0; i < 4; i++) {
        kf.P[i * 4]     = oP[i * 4] + oP[i * 4 + 2] * dt;
        kf.P[i * 4 + 1] = oP[i * 4 + 1] + oP[i * 4 + 3] * dt;
      }
      const oP2 = new Float64Array(kf.P);
      for (let j = 0; j < 4; j++) {
        kf.P[j]      = oP2[j] + oP2[8 + j] * dt;
        kf.P[4 + j]  = oP2[4 + j] + oP2[12 + j] * dt;
      }
      kf.P[0] += q11; kf.P[2] += q13; kf.P[5] += q11; kf.P[7] += q13;
      kf.P[8] += q13; kf.P[10] += q33; kf.P[13] += q13; kf.P[15] += q33;
    }

    recordTransition(fromSection, toSection) {
      const fi = SECTIONS.indexOf(fromSection);
      const ti = SECTIONS.indexOf(toSection);
      if (fi < 0 || ti < 0) return;
      const N = SECTIONS.length;
      const lr = 0.1;
      this.markov[fi * N + ti] += lr;
      let rowSum = 0;
      for (let j = 0; j < N; j++) rowSum += this.markov[fi * N + j];
      if (rowSum > 0) for (let j = 0; j < N; j++) this.markov[fi * N + j] /= rowSum;
      this.sectionHistory.push({ from: fromSection, to: toSection, t: Date.now() });
      if (this.sectionHistory.length > 200) this.sectionHistory.shift();
    }

    predictNextSection(currentSection) {
      const ci = SECTIONS.indexOf(currentSection);
      if (ci < 0) return { section: null, confidence: 0 };
      const N = SECTIONS.length;
      let bestJ = 0, bestP = 0;
      for (let j = 0; j < N; j++) {
        if (this.markov[ci * N + j] > bestP) { bestP = this.markov[ci * N + j]; bestJ = j; }
      }
      return { section: SECTIONS[bestJ], confidence: bestP - 1 / N };
    }

    computeEngagement(peerId, peerData) {
      let ed = this.engagementData.get(peerId);
      if (!ed) {
        ed = { firstSeen: Date.now(), interactions: 0, sections: new Set(), lastActive: Date.now(), cursorDist: 0, prevPos: null };
        this.engagementData.set(peerId, ed);
      }

      const now = Date.now();
      const sessionDur = (now - ed.firstSeen) / 1000;
      if (peerData.section) ed.sections.add(peerData.section);

      if (ed.prevPos) {
        const dx = (peerData.x || 0.5) - ed.prevPos.x;
        const dy = (peerData.y || 0.5) - ed.prevPos.y;
        ed.cursorDist += Math.sqrt(dx * dx + dy * dy);
      }
      if (ed.prevPos) { ed.prevPos.x = peerData.x || 0.5; ed.prevPos.y = peerData.y || 0.5; }
      else ed.prevPos = { x: peerData.x || 0.5, y: peerData.y || 0.5 };
      ed.lastActive = now;

      const scrollNorm = clamp01((peerData.scrollPct || 0) / 100);
      const timeNorm = clamp01(sessionDur / 300);
      const interactionNorm = clamp01(ed.interactions / 10);
      const sectionCov = ed.sections.size / SECTIONS.length;
      const cursorNorm = clamp01(ed.cursorDist / 50);
      const recency = Math.exp(-0.001 * (now - ed.lastActive) / 1000);

      return scrollNorm * 0.15 + timeNorm * 0.20 + interactionNorm * 0.25 +
             sectionCov * 0.15 + cursorNorm * 0.10 + recency * 0.15;
    }

    recordPeerInteraction(peerId) {
      const ed = this.engagementData.get(peerId);
      if (ed) ed.interactions++;
    }

    removePeer(peerId) {
      this.filters.delete(peerId);
      this.engagementData.delete(peerId);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHYSICS ENGINE
  // Gravity wells around popular sections, peer magnetism, momentum
  // ═══════════════════════════════════════════════════════════════

  class PhysicsEngine {
    constructor(engine) {
      this.engine = engine;
      this.bodies = new Map();
      this.wells = [];
    }

    getOrCreateBody(peerId) {
      let b = this.bodies.get(peerId);
      if (!b) {
        b = { pos: { x: 0.5, y: 0.5 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 1, damping: 0.92 };
        this.bodies.set(peerId, b);
      }
      return b;
    }

    setBodyTarget(peerId, x, y) {
      const b = this.getOrCreateBody(peerId);
      b.pos.x = x;
      b.pos.y = y;
    }

    updateGravityWells(peers) {
      const counts = {};
      for (const [, pArr] of Object.entries(peers)) {
        const p = (pArr[0] || {});
        if (p.section) counts[p.section] = (counts[p.section] || 0) + 1;
      }

      this.wells = [];
      const selMap = { timeline: '.tl-wrap', certs: '#certGrid', testimonials: '.tc-section', conferences: '.conf-strip', articles: '#linkedinFeed', impact: '.imp' };
      for (const [secName, sel] of Object.entries(selMap)) {
        const cnt = counts[secName] || 0;
        if (cnt < 2) continue;
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cx = (r.left + r.width / 2) / window.innerWidth;
        const cy = (r.top + r.height / 2) / window.innerHeight;

        const prediction = this.engine.predictive.predictNextSection(this.engine.mySection);
        const boost = (prediction.section === secName && prediction.confidence > 0.1) ? 1.5 : 1;

        const influence = this.engine.social.getMaxInfluenceInSection(secName, peers);
        const inflBoost = 1 + influence * 0.2;

        this.wells.push({
          section: secName, center: { x: clamp01(cx), y: clamp01(cy) },
          viewerCount: cnt,
          strength: 0.0005 * Math.log2(cnt) * boost * inflBoost
        });
      }
    }

    tick(dt) {
      const myId = this.engine.myId;

      for (const [pid, body] of this.bodies) {
        if (pid === myId) continue;
        body.acc.x = 0;
        body.acc.y = 0;

        // Gravity wells
        for (const well of this.wells) {
          const dx = well.center.x - body.pos.x;
          const dy = well.center.y - body.pos.y;
          const dist2 = dx * dx + dy * dy;
          const dist = Math.sqrt(dist2);
          if (dist < 0.01 || dist > 0.5) continue;
          let F = well.strength / dist2;
          F = Math.min(F, 0.01);
          body.acc.x += (dx / dist) * F;
          body.acc.y += (dy / dist) * F;
        }

        // Peer magnetism
        for (const [otherId, otherBody] of this.bodies) {
          if (otherId === pid || otherId === myId) continue;
          const peerData = this.engine._getPeerData(pid);
          const otherData = this.engine._getPeerData(otherId);
          if (!peerData || !otherData) continue;
          const sameSection = peerData.section && peerData.section === otherData.section;
          if (!sameSection) continue;

          const dx = otherBody.pos.x - body.pos.x;
          const dy = otherBody.pos.y - body.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.001) continue;

          let F;
          if (dist < 0.05) {
            F = -0.002 / Math.max(dist * dist, 0.001);
          } else if (dist < 0.3) {
            const affinity = this.engine.social.getAffinity(pid, otherId);
            F = 0.0003 * (1 + affinity);
          } else {
            continue;
          }
          body.acc.x += (dx / dist) * F;
          body.acc.y += (dy / dist) * F;
        }

        body.vel.x += body.acc.x * dt;
        body.vel.y += body.acc.y * dt;
        body.vel.x *= body.damping;
        body.vel.y *= body.damping;
        body.pos.x = clamp01(body.pos.x + body.vel.x * dt);
        body.pos.y = clamp01(body.pos.y + body.vel.y * dt);
      }
    }

    getPosition(peerId) {
      const b = this.bodies.get(peerId);
      return b ? { x: b.pos.x, y: b.pos.y } : null;
    }

    removePeer(peerId) {
      this.bodies.delete(peerId);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SWARM INTELLIGENCE
  // Boids flocking for ghost particles, formation detection
  // ═══════════════════════════════════════════════════════════════

  class SwarmIntelligence {
    constructor(engine) {
      this.engine = engine;
      this.boids = [];
      this.formations = [];
      this.lastFormationCheck = 0;
      this.awardedFormations = new Set();
      this.GHOSTS_PER_PEER = 3;
      this.MAX_SPEED = 0.005;
      this.MAX_FORCE = 0.0003;
      this.PERCEPTION = 0.15;
      this.SEP_DIST = 0.03;
    }

    updateBoids(renderedPeers) {
      // Ensure correct boid count
      const targetCount = renderedPeers.length * this.GHOSTS_PER_PEER;
      while (this.boids.length < targetCount) {
        this.boids.push({
          parentIdx: Math.floor(this.boids.length / this.GHOSTS_PER_PEER),
          pos: { x: 0.5 + (Math.random() - 0.5) * 0.05, y: 0.5 + (Math.random() - 0.5) * 0.05 },
          vel: { x: (Math.random() - 0.5) * 0.001, y: (Math.random() - 0.5) * 0.001 }
        });
      }
      while (this.boids.length > targetCount) this.boids.pop();

      for (let i = 0; i < this.boids.length; i++) {
        this.boids[i].parentIdx = Math.floor(i / this.GHOSTS_PER_PEER);
      }

      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];
        const parent = renderedPeers[b.parentIdx];
        if (!parent) continue;

        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0;
        let cohX = 0, cohY = 0;
        let neighbors = 0;

        for (let j = 0; j < this.boids.length; j++) {
          if (i === j) continue;
          const o = this.boids[j];
          const dist = vec2Dist(b.pos, o.pos);
          if (dist > this.PERCEPTION || dist === 0) continue;

          if (dist < this.SEP_DIST) {
            const dx = b.pos.x - o.pos.x, dy = b.pos.y - o.pos.y;
            sepX += dx / (dist * dist);
            sepY += dy / (dist * dist);
          }
          aliX += o.vel.x;
          aliY += o.vel.y;
          cohX += o.pos.x;
          cohY += o.pos.y;
          neighbors++;
        }

        let acc = { x: 0, y: 0 };

        // Separation
        acc.x += sepX * 1.8;
        acc.y += sepY * 1.8;

        if (neighbors > 0) {
          // Alignment
          aliX /= neighbors; aliY /= neighbors;
          const aliNorm = vec2Norm({ x: aliX, y: aliY });
          let aliSteer = { x: aliNorm.x * this.MAX_SPEED - b.vel.x, y: aliNorm.y * this.MAX_SPEED - b.vel.y };
          aliSteer = vec2Limit(aliSteer, this.MAX_FORCE);
          acc.x += aliSteer.x * 1.0;
          acc.y += aliSteer.y * 1.0;

          // Cohesion
          cohX /= neighbors; cohY /= neighbors;
          const cohDir = vec2Norm({ x: cohX - b.pos.x, y: cohY - b.pos.y });
          let cohSteer = { x: cohDir.x * this.MAX_SPEED - b.vel.x, y: cohDir.y * this.MAX_SPEED - b.vel.y };
          cohSteer = vec2Limit(cohSteer, this.MAX_FORCE);
          acc.x += cohSteer.x * 1.2;
          acc.y += cohSteer.y * 1.2;
        }

        // Homing toward parent cursor
        const homeDir = vec2Norm({ x: parent.x - b.pos.x, y: parent.y - b.pos.y });
        let homeSteer = { x: homeDir.x * this.MAX_SPEED - b.vel.x, y: homeDir.y * this.MAX_SPEED - b.vel.y };
        homeSteer = vec2Limit(homeSteer, this.MAX_FORCE * 0.5);
        acc.x += homeSteer.x * 0.8;
        acc.y += homeSteer.y * 0.8;

        b.vel.x += acc.x;
        b.vel.y += acc.y;
        const v = vec2Limit(b.vel, this.MAX_SPEED);
        b.vel.x = v.x; b.vel.y = v.y;
        b.pos.x = clamp01(b.pos.x + b.vel.x);
        b.pos.y = clamp01(b.pos.y + b.vel.y);
      }
    }

    detectFormations(renderedPeers) {
      const now = Date.now();
      if (now - this.lastFormationCheck < 500) return this.formations;
      this.lastFormationCheck = now;
      this.formations = [];
      if (renderedPeers.length < 3) return this.formations;

      const positions = renderedPeers.map(p => ({ x: p.x, y: p.y, pid: p.pid }));

      // Line detection
      const sortedX = [...positions].sort((a, b) => a.x - b.x);
      const yDeltas = sortedX.map(p => p.y);
      const minY = Math.min(...yDeltas), maxY = Math.max(...yDeltas);
      if (maxY - minY < 0.05) {
        const key = 'line:' + positions.map(p => p.pid).sort().join(',');
        this.formations.push({ type: 'line', members: positions.map(p => p.pid), key });
      }

      // Cluster detection
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      const allClose = positions.every(p => vec2Dist(p, { x: cx, y: cy }) < 0.1);
      if (allClose) {
        const key = 'cluster:' + positions.map(p => p.pid).sort().join(',');
        this.formations.push({ type: 'cluster', members: positions.map(p => p.pid), center: { x: cx, y: cy }, key });
      }

      // Orbit detection
      for (const well of this.engine.physics.wells) {
        const orbiters = positions.filter(p => {
          const d = vec2Dist(p, well.center);
          return d >= 0.1 && d <= 0.2;
        });
        if (orbiters.length >= 3) {
          const key = 'orbit:' + well.section + ':' + orbiters.map(p => p.pid).sort().join(',');
          this.formations.push({ type: 'orbit', members: orbiters.map(p => p.pid), well, key });
        }
      }

      // Award XP for new formations
      for (const f of this.formations) {
        if (!this.awardedFormations.has(f.key)) {
          this.awardedFormations.add(f.key);
          if (window.VDna) window.VDna.addXp(15);
          for (const pid of f.members) {
            this.engine.social.recordInteraction(this.engine.myId, pid, 'formation');
          }
          if (window.UniToast) window.UniToast(`✨ ${f.type.charAt(0).toUpperCase() + f.type.slice(1)} formation detected! +15 XP`);
        }
      }

      return this.formations;
    }

    getSwarmMetrics() {
      if (this.boids.length === 0) return { avgDist: 1, center: { x: 0.5, y: 0.5 }, count: 0 };
      let cx = 0, cy = 0;
      for (const b of this.boids) { cx += b.pos.x; cy += b.pos.y; }
      cx /= this.boids.length; cy /= this.boids.length;

      let totalDist = 0;
      for (const b of this.boids) totalDist += vec2Dist(b.pos, { x: cx, y: cy });
      return {
        avgDist: totalDist / this.boids.length,
        center: { x: cx, y: cy },
        count: this.boids.length
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SOCIAL GRAPH
  // Affinity with decay, trust via reciprocity, PageRank influence
  // ═══════════════════════════════════════════════════════════════

  class SocialGraph {
    constructor(engine) {
      this.engine = engine;
      this.interactions = [];
      this.MAX_LOG = 1000;
      this.influence = new Map();
      this.lastInfluenceCalc = 0;
      this._sameSecTimers = {};
    }

    recordInteraction(fromId, toId, type) {
      const weight = INTERACTION_WEIGHTS[type] || 1;
      this.interactions.push({ from: fromId, to: toId, type, weight, t: Date.now() });
      if (this.interactions.length > this.MAX_LOG) this.interactions.shift();
      this.engine.network.recordInteraction();
      this.engine.predictive.recordPeerInteraction(toId);
    }

    getAffinity(a, b) {
      const now = Date.now();
      const lambda = 0.0005;
      let raw = 0;
      for (const e of this.interactions) {
        if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) {
          raw += e.weight * Math.exp(-lambda * (now - e.t) / 1000);
        }
      }
      return 1 - Math.exp(-raw / 10);
    }

    getTrust(a, b) {
      let aToB = 0, bToA = 0;
      const intervals_a = [], intervals_b = [];
      let lastA = 0, lastB = 0;
      for (const e of this.interactions) {
        if (e.from === a && e.to === b) {
          aToB++;
          if (lastA) intervals_a.push(e.t - lastA);
          lastA = e.t;
        }
        if (e.from === b && e.to === a) {
          bToA++;
          if (lastB) intervals_b.push(e.t - lastB);
          lastB = e.t;
        }
      }
      const reciprocity = Math.min(aToB, bToA) / Math.max(aToB, bToA, 1);
      const consistency = (arr) => {
        if (arr.length < 2) return 1;
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        if (mean === 0) return 1;
        const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length);
        return clamp01(1 - std / mean);
      };
      return reciprocity * consistency(intervals_a) * consistency(intervals_b);
    }

    computeInfluence(peers) {
      const now = Date.now();
      if (now - this.lastInfluenceCalc < 30000) return;
      this.lastInfluenceCalc = now;

      const peerIds = Object.keys(peers);
      const N = peerIds.length;
      if (N < 2) { this.influence.clear(); return; }

      const d = 0.85;
      const rank = new Map();
      for (const pid of peerIds) rank.set(pid, 1 / N);

      for (let iter = 0; iter < 10; iter++) {
        const newRank = new Map();
        for (const pid of peerIds) newRank.set(pid, (1 - d) / N);

        for (const pid of peerIds) {
          const outDegree = peerIds.filter(other => other !== pid && this.getAffinity(pid, other) > 0.01).length || 1;
          for (const other of peerIds) {
            if (other === pid) continue;
            if (this.getAffinity(pid, other) > 0.01) {
              newRank.set(other, newRank.get(other) + d * rank.get(pid) / outDegree);
            }
          }
        }
        for (const [pid, val] of newRank) rank.set(pid, val);
      }
      this.influence = rank;
    }

    getInfluence(peerId) {
      return this.influence.get(peerId) || 0;
    }

    getMaxInfluenceInSection(section, peers) {
      let maxInf = 0;
      for (const [pid, pArr] of Object.entries(peers)) {
        const p = (pArr[0] || {});
        if (p.section === section) {
          maxInf = Math.max(maxInf, this.getInfluence(pid));
        }
      }
      return maxInf;
    }

    updatePassiveAffinity(peers, myId, mySection) {
      const now = Date.now();
      for (const [pid, pArr] of Object.entries(peers)) {
        if (pid === myId) continue;
        const p = (pArr[0] || {});
        if (p.section && p.section === mySection && mySection !== 'hero') {
          if (!this._sameSecTimers[pid]) {
            this._sameSecTimers[pid] = now;
          } else if (now - this._sameSecTimers[pid] >= 10000) {
            this.recordInteraction(myId, pid, 'same_section');
            this._sameSecTimers[pid] = now;
          }
        } else {
          delete this._sameSecTimers[pid];
        }
      }
    }

    isTrusted(peerId) {
      return this.getTrust(this.engine.myId, peerId) > 0.5;
    }

    hasHighAffinity(peerId) {
      return this.getAffinity(this.engine.myId, peerId) > 0.3;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERACTION MANAGER
  // All 10 existing systems, enhanced with social/predictive logic
  // ═══════════════════════════════════════════════════════════════

  class InteractionManager {
    constructor(engine) {
      this.engine = engine;
      this.pendingHighFives = {};
      this.whisperTarget = null;
      this.coopLocks = {};
      this.spectatingUser = null;
      this.lastBroadcastTime = 0;
      this.lastTipTime = 0;
      this.sameSecTimers = {};
      this.vsPanel = null;
      this.chatActive = false;
      this.chatText = '';
      this.chatBubbleEl = null;
      this.chatTimeout = null;
      this.peerChatBubbles = {};
    }

    handleCtxAction(action, targetId) {
      switch (action) {
        case 'highfive': this.sendHighFive(targetId); break;
        case 'whisper': this.openWhisper(targetId); break;
        case 'tip': this.sendTip(targetId); break;
        case 'spectate': this.startSpectate(targetId); break;
        case 'invest': this.sendInvest(targetId); break;
      }
    }

    handleBroadcastEvent(payload) {
      if (!payload || !payload.type) return;
      const myId = this.engine.myId;
      if (payload._mid && this.engine._meshSeen.has(payload._mid)) return;
      if (payload._mid) { this.engine._meshSeen.add(payload._mid); setTimeout(() => this.engine._meshSeen.delete(payload._mid), 15000); }

      if (payload.type === 'gossip_digest' || payload.type === 'gossip_update') {
        this.engine.network.handleGossip(payload);
        return;
      }

      switch (payload.type) {
        case 'high_five':
          if (payload.to === myId) this.receiveHighFive(payload.from, payload.fromNick);
          break;
        case 'whisper':
          if (payload.to === myId) this.receiveWhisper(payload.fromNick, payload.text);
          if (payload.from !== myId) this.engine.social.recordInteraction(payload.from, myId, 'whisper');
          break;
        case 'power_up':
          if (payload.to === myId) this.receivePowerUp(payload.fromNick);
          if (payload.from !== myId) this.engine.social.recordInteraction(payload.from, myId, 'power_up');
          break;
        case 'broadcast_msg':
          if (payload.from !== myId) this.receiveBroadcast(payload.fromNick, payload.text);
          break;
        case 'co_op_lock':
          if (payload.from !== myId) this.receiveCoopLock(payload.from, payload.fromNick, payload.lockNum);
          break;
        case 'xp_tip':
          if (payload.to === myId) this.receiveTip(payload.fromNick, payload.amount);
          if (payload.from !== myId) this.engine.social.recordInteraction(payload.from, myId, 'xp_tip');
          break;
        case 'cursor_chat':
          if (payload.from !== myId) {
            this.engine.ui.renderPeerChat(payload.from, payload.fromNick, payload.avatar, payload.text, payload.x, payload.y);
            this.engine.social.recordInteraction(payload.from, this.engine.myId, 'cursor_chat');
          }
          break;
        case 'cursor_chat_end':
          if (payload.from !== myId) this.engine.ui.removePeerChat(payload.from);
          break;
      }
    }

    // ── SYSTEM 1a: HIGH-FIVE ──
    sendHighFive(targetId) {
      this.engine.meshSend({ type: 'high_five', from: this.engine.myId, to: targetId, fromNick: this.engine.myNickname });
      this.pendingHighFives[targetId] = Date.now();
      if (window.UniToast) window.UniToast('✋ High-five sent! Waiting for them to high-five back...');
    }

    receiveHighFive(from, fromNick) {
      if (window._presenceAudio) window._presenceAudio.onHighFive();
      if (window._haptic) window._haptic.success();
      this.engine.social.recordInteraction(from, this.engine.myId, 'high_five');
      if (this.pendingHighFives[from] && Date.now() - this.pendingHighFives[from] < 10000) {
        delete this.pendingHighFives[from];
        this.engine.ui.spawnParticleBurst();
        if (window._game) window._game.unlock('team_player');
        if (window.VDna) { var _p=window.VDna.get(); _p._mpInteractions=(_p._mpInteractions||0)+1; window.VDna.addXp(25); if(window._game){if(_p._mpInteractions>=1)window._game.unlock('social_i');if(_p._mpInteractions>=5)window._game.unlock('social_ii');if(_p._mpInteractions>=10)window._game.unlock('social_iii');} }
        if (window.UniToast) window.UniToast('🎉 DOUBLE HIGH-FIVE with ' + fromNick + '! +25 XP!');
      } else {
        this.pendingHighFives[from] = Date.now();
        this.engine.meshSend({ type: 'high_five', from: this.engine.myId, to: from, fromNick: this.engine.myNickname });
        if (window.UniToast) window.UniToast('✋ ' + fromNick + ' wants to high-five! High-fiving back...');
        setTimeout(() => {
          this.engine.ui.spawnParticleBurst();
          if (window._game) window._game.unlock('team_player');
          if (window.VDna) { var _p2=window.VDna.get(); _p2._mpInteractions=(_p2._mpInteractions||0)+1; window.VDna.addXp(25); if(window._game){if(_p2._mpInteractions>=1)window._game.unlock('social_i');if(_p2._mpInteractions>=5)window._game.unlock('social_ii');if(_p2._mpInteractions>=10)window._game.unlock('social_iii');} }
        }, 300);
      }
    }

    // ── SYSTEM 1b: PROXIMITY WHISPERS ──
    checkProximityWhisper() {
      const mySection = this.engine.mySection;
      const peers = this.engine.peers;
      const myId = this.engine.myId;
      for (const [pid, pArr] of Object.entries(peers)) {
        if (pid === myId) continue;
        const p = pArr[0] || {};
        if (p.section && p.section === mySection && mySection !== 'hero') {
          if (!this.sameSecTimers[pid]) this.sameSecTimers[pid] = Date.now();
          else if (Date.now() - this.sameSecTimers[pid] > 3000) {
            const nick = p.nickname || 'Anon';
            const pred = this.engine.predictive.predictNextSection(p.section);
            const extra = (pred.confidence > 0.3) ? ` — predicted heading to ${pred.section}` : '';
            if (window.UniToast) window.UniToast(`💬 ${nick} is also viewing ${mySection}${extra} — click their avatar to whisper`);
            this.sameSecTimers[pid] = Date.now() + 30000;
          }
        } else {
          delete this.sameSecTimers[pid];
        }
      }
    }

    openWhisper(targetId) {
      this.whisperTarget = targetId;
      const pData = this.engine._getPeerData(targetId);
      this.engine.ui.whisperEl.style.display = 'flex';
      const inp = document.getElementById('mpWhisperInput');
      inp.placeholder = `Whisper to ${(pData && pData.nickname) || 'Anon'}...`;
      inp.focus();
    }

    receiveWhisper(fromNick, text) {
      if (window._presenceAudio) window._presenceAudio.onWhisper();
      if (window._haptic) window._haptic.notify();
      if (window.UniToast) window.UniToast(`💬 ${fromNick}: ${text}`);
    }

    // ── SYSTEM 2: ARCADE SPECTATOR ──
    checkVSMode() {
      const myGS = this.engine.myGameState;
      const peers = this.engine.peers;
      const myId = this.engine.myId;
      if (!myGS) { if (this.vsPanel) { this.vsPanel.remove(); this.vsPanel = null; } return; }
      const rival = Object.entries(peers).find(([k, pArr]) => {
        if (k === myId) return false;
        const p = pArr[0] || {};
        return p.gameState && p.gameState.game === myGS.game;
      });
      if (rival) {
        const [, rArr] = rival;
        const r = rArr[0];
        if (!this.vsPanel) { this.vsPanel = document.createElement('div'); this.vsPanel.className = 'mp-vs-panel'; document.body.appendChild(this.vsPanel); }
        this.vsPanel.innerHTML = `<div class="mp-vs-label">VS</div><div class="mp-vs-nick">${r.nickname || 'Anon'}</div><div class="mp-vs-score">${r.gameState.score || 0}</div>`;
        this.vsPanel.style.display = 'flex';
        window._mpGhostScore = r.gameState.score || 0;
      } else {
        if (this.vsPanel) this.vsPanel.style.display = 'none';
        window._mpGhostScore = null;
      }
    }

    sendInvest(targetId) {
      this.engine.meshSend({ type: 'power_up', from: this.engine.myId, to: targetId, fromNick: this.engine.myNickname, kind: 'shield' });
      if (window._game) window._game.unlock('angel_investor');
      if (window.VDna) { var _pa=window.VDna.get(); _pa._mpInteractions=(_pa._mpInteractions||0)+1; window.VDna.addXp(10); window.VDna.save(); }
      if (window.UniToast) window.UniToast('🛡 Power-up sent! +10 XP');
    }

    receivePowerUp(fromNick) {
      if (window._presenceAudio) window._presenceAudio.onPowerUp();
      if (window._haptic) window._haptic.collect();
      if (window._gamePowerUp) window._gamePowerUp('shield');
      if (window.VDna) window.VDna.addXp(10);
      if (window.UniToast) window.UniToast('🛡 ' + fromNick + ' invested in you! Shield activated! +10 XP');
    }

    // ── SYSTEM 3a: BROADCAST TERMINAL ──
    termBroadcast(text) {
      const now = Date.now();
      const trusted = Object.keys(this.engine.peers).some(pid => pid !== this.engine.myId && this.engine.social.isTrusted(pid));
      const cooldown = trusted ? 5000 : 10000;
      const maxLen = trusted ? 400 : 200;
      if (now - this.lastBroadcastTime < cooldown) return `<span class="term-red">Rate limited. Wait ${cooldown / 1000}s between broadcasts.</span>`;
      if (!text || !text.trim()) return '<span class="term-gray">Usage: broadcast &lt;message&gt;</span>';
      this.lastBroadcastTime = now;
      const msg = text.trim().substring(0, maxLen);
      this.engine.meshSend({ type: 'broadcast_msg', from: this.engine.myId, fromNick: this.engine.myNickname, text: msg });
      if (window._mesh) window._mesh.addChatMessage(this.engine.myId, this.engine.myNickname, msg, 'broadcast');
      return `<span class="term-green">📡 Broadcast sent: "${msg}"</span>`;
    }

    receiveBroadcast(fromNick, text) {
      if (window._presenceAudio) window._presenceAudio.onBroadcast();
      const body = document.getElementById('termBody');
      if (body) {
        body.innerHTML += `<div class="term-line"><span style="color:#a855f7">[broadcast]</span> <span style="color:#22c55e">${escText(fromNick)}</span>: ${escText(text)}</div>`;
        body.scrollTop = body.scrollHeight;
      }
      if (window.UniToast) window.UniToast('📡 ' + escText(fromNick) + ': ' + escText(text));
    }

    // ── SYSTEM 3b: CO-OP LOCKS ──
    termEngage(args) {
      const match = (args || '').match(/(\d)/);
      const num = match ? parseInt(match[1]) : NaN;
      if (num !== 1 && num !== 2) return '<span class="term-gray">Usage: engage lock 1 or engage lock 2</span>';
      this.engine.meshSend({ type: 'co_op_lock', from: this.engine.myId, fromNick: this.engine.myNickname, lockNum: num });
      this.coopLocks['self_' + num] = Date.now();
      this.checkCoopUnlock();
      return `<span class="term-cyan">🔒 Lock ${num} engaged. Waiting for partner...</span>`;
    }

    receiveCoopLock(from, fromNick, lockNum) {
      this.coopLocks['peer_' + lockNum] = { time: Date.now(), from, fromNick };
      this.engine.social.recordInteraction(from, this.engine.myId, 'co_op_lock');
      this.checkCoopUnlock();
    }

    checkCoopUnlock() {
      const s1 = this.coopLocks['self_1'], s2 = this.coopLocks['self_2'];
      const p1 = this.coopLocks['peer_1'], p2 = this.coopLocks['peer_2'];
      const now = Date.now();
      const W = 5000;
      const hasBoth = (
        ((s1 && p2 && p2.time && now - s1 < W && now - p2.time < W) ||
         (s2 && p1 && p1.time && now - s2 < W && now - p1.time < W))
      );
      if (hasBoth) {
        this.coopLocks = {};
        if (window._haptic) window._haptic.levelUp();
        if (window._game) window._game.unlock('hacker_coop');
        if (window.VDna) { var _pc=window.VDna.get(); _pc._mpInteractions=(_pc._mpInteractions||0)+1; window.VDna.addXp(30); window.VDna.save(); }
        const body = document.getElementById('termBody');
        if (body) {
          body.innerHTML += `<div class="term-line"><span style="color:#22c55e;text-shadow:0 0 8px #22c55e">
╔══════════════════════════════════════╗
║  🔓 DUAL-LOCK SEQUENCE COMPLETE!    ║
║  Co-op hack successful.             ║
║  Hacker trophy unlocked! +30 XP     ║
╚══════════════════════════════════════╝</span></div>`;
          body.scrollTop = body.scrollHeight;
        }
        if (window.UniToast) window.UniToast('🔓 Hacker trophy unlocked! Co-op with another user!');
      }
    }

    // ── SYSTEM 4b: SPECTATOR MODE ──
    startSpectate(targetId) {
      this.spectatingUser = targetId;
      const pData = this.engine._getPeerData(targetId);
      this.engine.ui.specBanner.innerHTML = `👁 Spectating <strong>${(pData && pData.nickname) || 'Anon'}</strong> <span class="mp-spec-exit" id="mpSpecExit">✕ Exit</span>`;
      this.engine.ui.specBanner.style.display = 'flex';
      document.getElementById('mpSpecExit').addEventListener('click', () => this.stopSpectate());
      this.doSpectateScroll();
    }

    stopSpectate() {
      this.spectatingUser = null;
      this.engine.ui.specBanner.style.display = 'none';
    }

    doSpectateScroll() {
      if (!this.spectatingUser) return;
      const pData = this.engine._getPeerData(this.spectatingUser);
      if (!pData || pData.scrollPct === undefined) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetY = (pData.scrollPct / 100) * maxScroll;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    // ── SYSTEM 5a: XP TIPPING ──
    sendTip(targetId) {
      const now = Date.now();
      const cooldown = this.engine.social.hasHighAffinity(targetId) ? 15000 : 30000;
      if (now - this.lastTipTime < cooldown) { if (window.UniToast) window.UniToast(`⏳ Wait ${cooldown / 1000}s between tips`); return; }
      const vdna = window.VDna ? window.VDna.get() : {};
      if ((vdna.xp || 0) < 10) { if (window.UniToast) window.UniToast('❌ Need at least 10 XP to tip'); return; }
      this.lastTipTime = now;
      if (window.VDna) { window.VDna.get().xp -= 5; window.VDna.save(); }
      this.engine.meshSend({ type: 'xp_tip', from: this.engine.myId, to: targetId, fromNick: this.engine.myNickname, amount: 5 });
      this.engine.ui.spawnCoinAnimation();
      if (window.UniToast) window.UniToast('🪙 Sent 5 XP tip!');
    }

    receiveTip(fromNick, amount) {
      if (window._presenceAudio) window._presenceAudio.onTip();
      if (window._haptic) window._haptic.xp();
      if (window.VDna) window.VDna.addXp(amount);
      this.engine.ui.spawnCoinAnimation();
      if (window.UniToast) window.UniToast('🪙 ' + fromNick + ' tipped you ' + amount + ' XP!');
    }

    // ── SYSTEM 6: CRITICAL MASS ──
    checkCriticalMass() {
      const liveCount = this.engine.liveCount;
      if (liveCount >= 5 && !this.engine.criticalMassActive) {
        this.engine.criticalMassActive = true;
        if (!document.body.classList.contains('cyberpunk-mode') && window._toggleCyberpunk) window._toggleCyberpunk(true);
        if (window._game) window._game.unlock('critical_mass');
        if (window.UniToast) window.UniToast('⚡ Critical mass reached. Mainframe overloaded.');
      } else if (liveCount < 5 && this.engine.criticalMassActive) {
        this.engine.criticalMassActive = false;
        if (document.body.classList.contains('cyberpunk-mode') && window._toggleCyberpunk) window._toggleCyberpunk(true);
      }
    }

    // ── SYSTEM 7: CURSOR CHAT ──
    initCursorChat() {
      this.chatBubbleEl = document.createElement('div');
      this.chatBubbleEl.className = 'cc-bubble cc-mine';
      this.chatBubbleEl.style.display = 'none';
      this.chatBubbleEl.innerHTML = `<span class="cc-avatar">${emojiFromCode(this.engine.myAvatar)}</span><span class="cc-text" id="ccMyText"></span><span class="cc-caret"></span>`;
      document.body.appendChild(this.chatBubbleEl);

      this._positionBubble = (e) => {
        if (!this.chatActive) return;
        this.chatBubbleEl.style.left = e.clientX + 16 + 'px';
        this.chatBubbleEl.style.top = e.clientY + 16 + 'px';
      };

      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.key === '/' && !this.chatActive) { e.preventDefault(); this.openCursorChat(); return; }
        if (!this.chatActive) return;
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); this.closeCursorChat(); return; }
        if (e.key === 'Backspace') {
          e.preventDefault();
          this.chatText = this.chatText.slice(0, -1);
          document.getElementById('ccMyText').textContent = this.chatText;
          this._broadcastChatText();
          this._resetChatDismiss();
          return;
        }
        if (e.key.length === 1 && this.chatText.length < 120) {
          e.preventDefault();
          this.chatText += e.key;
          document.getElementById('ccMyText').textContent = this.chatText;
          this._broadcastChatText();
          this._resetChatDismiss();
        }
      });
    }

    openCursorChat() {
      if (this.chatActive) return;
      this.chatActive = true;
      this.chatText = '';
      document.getElementById('ccMyText').textContent = '';
      this.chatBubbleEl.style.display = 'flex';
      this.chatBubbleEl.style.left = (window.innerWidth * this.engine.myX + 16) + 'px';
      this.chatBubbleEl.style.top = (window.innerHeight * this.engine.myY + 16) + 'px';
      document.addEventListener('mousemove', this._positionBubble, { passive: true });
      if (this.chatTimeout) clearTimeout(this.chatTimeout);
    }

    closeCursorChat() {
      if (!this.chatActive) return;
      this.chatActive = false;
      this.chatBubbleEl.style.display = 'none';
      document.removeEventListener('mousemove', this._positionBubble);
      if (this.chatText.trim()) {
        this.engine.meshSend({ type: 'cursor_chat_end', from: this.engine.myId });
      }
      this.chatText = '';
    }

    _broadcastChatText() {
      this.engine.meshSend({
        type: 'cursor_chat', from: this.engine.myId, fromNick: this.engine.myNickname,
        avatar: this.engine.myAvatar, text: this.chatText, x: this.engine.myX, y: this.engine.myY
      });
    }

    _resetChatDismiss() {
      if (this.chatTimeout) clearTimeout(this.chatTimeout);
      this.chatTimeout = setTimeout(() => this.closeCursorChat(), 8000);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI RENDERER
  // Presence bar, peer cursors, context menu, particles, chat
  // ═══════════════════════════════════════════════════════════════

  class UIRenderer {
    constructor(engine) {
      this.engine = engine;
      this.barWrap = null;
      this.ctxMenu = null;
      this.whisperEl = null;
      this.specBanner = null;
      this.peerCursorPool = [];
      this.boidEls = [];
      this.wellIndicators = new Map();
      this.peerChatBubbles = {};
      this.MAX_RENDERED_CURSORS = 10;
    }

    init() {
      const vcEl = document.getElementById('visitorCount');

      this.barWrap = document.createElement('div');
      this.barWrap.id = 'mpBar';
      this.barWrap.className = 'mp-bar';
      this.barWrap.innerHTML = `<div class="mp-avatars" id="mpAvatars"></div><div class="mp-status" id="mpStatus"></div>`;
      vcEl.insertAdjacentElement('afterend', this.barWrap);


      this.ctxMenu = document.createElement('div');
      this.ctxMenu.id = 'mpCtx';
      this.ctxMenu.className = 'mp-ctx';
      this.ctxMenu.style.display = 'none';
      document.body.appendChild(this.ctxMenu);

      this.whisperEl = document.createElement('div');
      this.whisperEl.id = 'mpWhisper';
      this.whisperEl.className = 'mp-whisper';
      this.whisperEl.style.display = 'none';
      this.whisperEl.innerHTML = `<input type="text" class="mp-whisper-input" id="mpWhisperInput" maxlength="80" placeholder="Say hello..."><span class="mp-whisper-close" id="mpWhisperClose">&times;</span>`;
      document.body.appendChild(this.whisperEl);

      this.specBanner = document.createElement('div');
      this.specBanner.id = 'mpSpecBanner';
      this.specBanner.className = 'mp-spec-banner';
      this.specBanner.style.display = 'none';
      document.body.appendChild(this.specBanner);

      // Close handlers
      const closeCtx = () => { this.ctxMenu.style.display = 'none'; };
      document.addEventListener('click', (e) => { if (!e.target.closest('#mpCtx, .mp-avatar')) closeCtx(); });

      document.getElementById('mpWhisperClose').addEventListener('click', () => {
        this.whisperEl.style.display = 'none';
        this.engine.interactions.whisperTarget = null;
      });

      document.getElementById('mpWhisperInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.engine.interactions.whisperTarget) {
          const msg = e.target.value.trim().substring(0, 80);
          if (!msg) return;
          this.engine.meshSend({ type: 'whisper', from: this.engine.myId, to: this.engine.interactions.whisperTarget, fromNick: this.engine.myNickname, text: msg });
          e.target.value = '';
          if (window.UniToast) window.UniToast('💬 Whisper sent');
          this.whisperEl.style.display = 'none';
          this.engine.interactions.whisperTarget = null;
        }
      });

      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.engine.interactions.spectatingUser) this.engine.interactions.stopSpectate(); });
      document.addEventListener('click', (e) => { if (this.engine.interactions.spectatingUser && !e.target.closest('#mpSpecBanner, .mp-avatar, #mpCtx')) this.engine.interactions.stopSpectate(); });

      // Peer cursor pool
      for (let i = 0; i < this.MAX_RENDERED_CURSORS; i++) {
        const el = document.createElement('div');
        el.className = 'pe-cursor';
        el.style.cssText = 'position:fixed;z-index:9990;pointer-events:none;display:none;font-size:12px;transition:transform 16ms linear;will-change:transform;opacity:0.5;';
        el.innerHTML = '<span class="pe-cursor-emoji"></span><span class="pe-cursor-nick" style="font-size:8px;margin-left:4px;color:var(--sub);font-family:JetBrains Mono,monospace;white-space:nowrap;"></span>';
        document.body.appendChild(el);
        this.peerCursorPool.push(el);
      }

      // Boid ghost particle pool (3 per cursor = 30 max)
      for (let i = 0; i < this.MAX_RENDERED_CURSORS * 3; i++) {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;z-index:9989;pointer-events:none;display:none;width:4px;height:4px;border-radius:50%;background:rgba(0,225,255,0.2);transition:transform 16ms linear;will-change:transform;';
        document.body.appendChild(el);
        this.boidEls.push(el);
      }
    }

    renderBar() {
      const avatarBox = document.getElementById('mpAvatars');
      const statusBox = document.getElementById('mpStatus');
      const peers = this.engine.peers;
      const myId = this.engine.myId;
      const peerList = Object.entries(peers).filter(([k]) => k !== myId);
      this.engine.liveCount = peerList.length + 1;
      const others = peerList.length;

      if (others > 0) {
        statusBox.innerHTML = `<span class="live-dot"></span> ${others} other${others > 1 ? ' professionals' : ' professional'} viewing now`;
        statusBox.classList.add('visible');
        if (!this.engine.trophyAwarded) {
          this.engine.trophyAwarded = true;
          if (window._game) window._game.unlock('networking_event');
        }
      } else {
        statusBox.classList.remove('visible');
        statusBox.innerHTML = '';
      }

      let html = `<div class="mp-avatar mp-avatar-me" title="You (${this.engine.myNickname})" data-id="${myId}">${emojiFromCode(this.engine.myAvatar)}</div>`;
      for (const [pid, pArr] of peerList) {
        const p = pArr[0] || {};
        const status = p.gameState ? `Playing ${p.gameState.game}` : (p.section || 'browsing');
        const engagement = this.engine.predictive.computeEngagement(pid, p);
        const influence = this.engine.social.getInfluence(pid);
        const glowIntensity = Math.round(clamp01(engagement * 0.5 + influence * 0.5) * 100);
        const trust = this.engine.social.getTrust(myId, pid);
        const trustBadge = trust > 0.5 ? ' ✓' : '';
        const pred = this.engine.predictive.predictNextSection(p.section || 'hero');
        const predHint = pred.confidence > 0.2 ? ` → ${pred.section}` : '';
        const extraStyle = glowIntensity > 30 ? `box-shadow:0 0 ${glowIntensity / 10}px rgba(0,225,255,${glowIntensity / 200})` : '';
        html += `<div class="mp-avatar" title="${p.nickname || 'Anonymous'}: ${status}${predHint}" data-id="${pid}" data-nick="${p.nickname || 'Anon'}" style="${extraStyle}">${emojiFromCode(p.avatar || '1F47E')}${trustBadge}</div>`;
      }
      avatarBox.innerHTML = html;

      avatarBox.querySelectorAll('.mp-avatar:not(.mp-avatar-me)').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = el.dataset.id;
          const pData = (peers[pid] || [{}])[0];
          this.showCtx(el, pid, pData);
        });
      });

      this.checkAttentionGlow();
      this.engine.interactions.checkCriticalMass();
      this.engine.interactions.checkProximityWhisper();
      this.engine.interactions.checkVSMode();
    }

    showCtx(anchorEl, pid, pData) {
      const nick = pData.nickname || 'Anon';
      const isPlaying = pData.gameState && pData.gameState.status;
      const isBoss = pData.gameState && pData.gameState.status === 'boss';
      const sameSection = pData.section && pData.section === this.engine.mySection;

      let items = `<div class="mp-ctx-title">${nick}</div>`;
      items += `<div class="mp-ctx-item" data-action="highfive" data-pid="${pid}">✋ High-Five</div>`;
      if (sameSection) items += `<div class="mp-ctx-item" data-action="whisper" data-pid="${pid}">💬 Whisper</div>`;
      items += `<div class="mp-ctx-item" data-action="tip" data-pid="${pid}">🪙 Tip 5 XP</div>`;
      items += `<div class="mp-ctx-item" data-action="spectate" data-pid="${pid}">👁 Spectate</div>`;
      if (isPlaying && pData.gameState.game === 'defender' && isBoss) {
        items += `<div class="mp-ctx-item" data-action="invest" data-pid="${pid}">🛡 Invest (Power-Up)</div>`;
      }
      this.ctxMenu.innerHTML = items;
      const rect = anchorEl.getBoundingClientRect();
      this.ctxMenu.style.left = rect.left + 'px';
      this.ctxMenu.style.top = (rect.bottom + 4) + 'px';
      this.ctxMenu.style.display = 'block';

      this.ctxMenu.querySelectorAll('.mp-ctx-item').forEach(it => {
        it.addEventListener('click', () => {
          this.engine.interactions.handleCtxAction(it.dataset.action, it.dataset.pid);
          this.ctxMenu.style.display = 'none';
        });
      });
    }

    checkAttentionGlow() {
      const sectionCounts = {};
      for (const [, pArr] of Object.entries(this.engine.peers)) {
        const p = pArr[0] || {};
        if (p.section) sectionCounts[p.section] = (sectionCounts[p.section] || 0) + 1;
      }
      const selMap = { timeline: '.tl-wrap', certs: '#certGrid', testimonials: '.tc-section', conferences: '.conf-strip', articles: '#linkedinFeed', impact: '.imp' };
      for (const [secName, sel] of Object.entries(selMap)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cnt = sectionCounts[secName] || 0;
        let badge = el.querySelector('.mp-attn-badge');
        if (cnt >= 3) {
          el.classList.add('attention-glow');
          if (!badge) { badge = document.createElement('span'); badge.className = 'mp-attn-badge'; el.style.position = el.style.position || 'relative'; el.appendChild(badge); }
          badge.textContent = cnt + ' viewing now';
        } else {
          el.classList.remove('attention-glow');
          if (badge) badge.remove();
        }
      }
    }

    renderPeerCursors(renderedPeers) {
      for (let i = 0; i < this.peerCursorPool.length; i++) {
        const el = this.peerCursorPool[i];
        if (i < renderedPeers.length) {
          const p = renderedPeers[i];
          const px = p.x * window.innerWidth;
          const py = p.y * window.innerHeight;
          el.style.transform = `translate(${px}px, ${py}px)`;
          el.style.display = 'block';
          el.style.opacity = (0.3 + 0.7 * (p.engagement || 0)).toFixed(2);
          el.querySelector('.pe-cursor-emoji').textContent = emojiFromCode(p.avatar || '1F47E');
          const nickEl = el.querySelector('.pe-cursor-nick');
          nickEl.textContent = p.nickname || '';
        } else {
          el.style.display = 'none';
        }
      }

      // Render boid ghost particles
      const boids = this.engine.swarm.boids;
      const isLight = document.body.classList.contains('light-mode');
      for (let i = 0; i < this.boidEls.length; i++) {
        if (i < boids.length) {
          const b = boids[i];
          const bx = b.pos.x * window.innerWidth;
          const by = b.pos.y * window.innerHeight;
          this.boidEls[i].style.transform = `translate(${bx}px, ${by}px)`;
          this.boidEls[i].style.display = 'block';
          this.boidEls[i].style.background = isLight ? 'rgba(0,102,255,0.15)' : 'rgba(0,225,255,0.2)';
        } else {
          this.boidEls[i].style.display = 'none';
        }
      }
    }

    spawnParticleBurst(opts) {
      const count = (opts && opts.count) || 20;
      const emojis = (opts && opts.emojis) || ['✋','⭐','🎉','💥','✨'];
      const burst = document.createElement('div');
      burst.className = 'mp-particle-burst';
      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'mp-particle';
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 80;
        p.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
        p.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
        p.style.setProperty('--delay', (Math.random() * 0.2) + 's');
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        burst.appendChild(p);
      }
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 1500);
    }

    spawnCoinAnimation() {
      const coin = document.createElement('div');
      coin.className = 'mp-coin';
      coin.textContent = '🪙';
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 1200);
    }

    renderPeerChat(fromId, fromNick, avatar, text, x, y) {
      let bubble = this.peerChatBubbles[fromId];
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'cc-bubble cc-peer';
        bubble.innerHTML = `<span class="cc-avatar">${emojiFromCode(avatar || '1F47E')}</span><span class="cc-nick">${fromNick}</span><span class="cc-text"></span>`;
        document.body.appendChild(bubble);
        this.peerChatBubbles[fromId] = bubble;
        if (window._presenceAudio) window._presenceAudio.onWhisper();
      }
      bubble.querySelector('.cc-text').textContent = text;
      bubble.style.left = (x * window.innerWidth + 16) + 'px';
      bubble.style.top = (y * window.innerHeight + 16) + 'px';
      bubble.style.display = 'flex';
      if (bubble._timer) clearTimeout(bubble._timer);
      bubble._timer = setTimeout(() => { bubble.style.display = 'none'; }, 10000);
    }

    removePeerChat(fromId) {
      const bubble = this.peerChatBubbles[fromId];
      if (bubble) {
        bubble.style.opacity = '0';
        setTimeout(() => { bubble.style.display = 'none'; bubble.style.opacity = ''; }, 300);
      }
    }

    cleanupPeerCursors(activePeerIds) {
      const chatIds = Object.keys(this.peerChatBubbles);
      for (const pid of chatIds) {
        if (!activePeerIds.has(pid)) this.removePeerChat(pid);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIO SPATIALIZER
  // Spatial audio, swarm harmonics, gravity well hum
  // ═══════════════════════════════════════════════════════════════

  class AudioSpatializer {
    constructor(engine) {
      this.engine = engine;
      this.prevPeerPositions = {};
      this.prevPeerGameStates = {};
      this.prevPeerCount = 0;
      this.heartbeatInterval = null;
      this.wellDrones = new Map();
      this._lastSwarmHarmonicTime = 0;
    }

    _getCtx() { return null; }
    _getMaster() { return null; }
    _isEnabled() { return false; }

    _playTone(freq, duration, pan, type, vol, delay) {
      const c = this._getCtx(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const osc = c.createOscillator(), gain = c.createGain(), panner = c.createStereoPanner();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol || 0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      panner.pan.setValueAtTime(clampPan(pan || 0), t);
      osc.connect(gain).connect(panner).connect(this._getMaster() || c.destination);
      osc.start(t); osc.stop(t + duration);
    }

    _makeNoise(duration, freq, bandwidth, vol) {
      const c = this._getCtx(); if (!c) return;
      const bufSize = Math.floor(c.sampleRate * duration);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.setValueAtTime(freq, c.currentTime); filter.Q.setValueAtTime(bandwidth || 1, c.currentTime);
      const gain = c.createGain();
      gain.gain.setValueAtTime(vol || 0.02, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      src.connect(filter).connect(gain).connect(this._getMaster() || c.destination);
      src.start(c.currentTime); src.stop(c.currentTime + duration);
    }

    _playSweep(startF, endF, duration, vol, type) {
      const c = this._getCtx(); if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(startF, t); osc.frequency.exponentialRampToValueAtTime(endF, t + duration);
      gain.gain.setValueAtTime(vol || 0.03, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(this._getMaster() || c.destination);
      osc.start(t); osc.stop(t + duration);
    }

    // ── Event sounds ──
    playHighFiveChord() { if (!this._isEnabled()) return; this._playTone(523.25, 0.3, 0, 'triangle', 0.04); this._playTone(659.25, 0.3, 0, 'triangle', 0.04); this._playTone(783.99, 0.3, 0, 'triangle', 0.04); }
    playTipCoin() { if (!this._isEnabled()) return; this._playTone(783.99, 0.06, 0, 'square', 0.025, 0); this._playTone(659.25, 0.06, 0, 'square', 0.025, 0.07); this._playTone(523.25, 0.06, 0, 'square', 0.025, 0.14); }
    playJoinTone() { if (!this._isEnabled()) return; this._playTone(261.63, 0.1, 0, 'sine', 0.025, 0); this._playTone(329.63, 0.1, 0, 'sine', 0.025, 0.08); }
    playLeaveTone() { if (!this._isEnabled()) return; this._playTone(329.63, 0.1, 0, 'sine', 0.025, 0); this._playTone(261.63, 0.1, 0, 'sine', 0.025, 0.08); }
    playWhisperBreath() { if (!this._isEnabled()) return; this._makeNoise(0.1, 2000, 2, 0.02); }
    playPowerUpSweep() { if (!this._isEnabled()) return; this._playSweep(200, 1200, 0.3, 0.03, 'sawtooth'); }

    playGhostTyping() {
      if (!this._isEnabled()) return;
      const clicks = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clicks; i++) {
        setTimeout(() => this._makeNoise(0.012, 4000 + Math.random() * 1000, 3, 0.008 + Math.random() * 0.004), i * 50);
      }
    }

    playRadarPing() {
      if (!this._isEnabled()) return;
      const c = this._getCtx(); if (!c) return;
      const osc1 = c.createOscillator(), g1 = c.createGain();
      osc1.type = 'sine'; osc1.frequency.setValueAtTime(1500, c.currentTime);
      g1.gain.setValueAtTime(0.03, c.currentTime); g1.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.2);
      osc1.connect(g1).connect(this._getMaster() || c.destination); osc1.start(c.currentTime); osc1.stop(c.currentTime + 0.2);
      const delay = c.createDelay(0.3); delay.delayTime.setValueAtTime(0.1, c.currentTime);
      const osc2 = c.createOscillator(), g2 = c.createGain();
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(1500, c.currentTime);
      g2.gain.setValueAtTime(0.015, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
      osc2.connect(g2).connect(delay).connect(this._getMaster() || c.destination); osc2.start(c.currentTime); osc2.stop(c.currentTime + 0.3);
    }

    // ── Spatial cursor sounds ──
    _updateSpatialCursors(closest, peers) {
      for (const { pid, data, dist } of closest) {
        const px = data.x || 0.5;
        const pan = px * 2 - 1;
        const proxVol = Math.max(0.005, 0.04 - dist * 0.015);
        const freq = 180 + hashId(pid) % 120;
        this._playTone(freq, 0.4, pan, 'sine', proxVol);

        const prev = this.prevPeerPositions[pid];
        if (prev) {
          const dx = (data.x || 0.5) - prev.x, dy = (data.y || 0.5) - prev.y;
          const vel = Math.sqrt(dx * dx + dy * dy);
          if (vel > 0.15) this._makeNoise(0.15, 800 + vel * 2000, 0.5, Math.min(0.03, vel * 0.04));
        }
        this.prevPeerPositions[pid] = { x: data.x || 0.5, y: data.y || 0.5 };
      }
      for (const pid of Object.keys(this.prevPeerPositions)) {
        if (!peers[pid]) delete this.prevPeerPositions[pid];
      }
    }

    // ── Swarm sync ──
    _onSwarmSync(peers, closest) {
      const peerCount = Object.keys(peers).length - 1;
      if (peerCount !== this.prevPeerCount) {
        if (peerCount > this.prevPeerCount) { this._playJoinArpeggio(); this.playJoinTone(); }
        else { this._playLeaveArpeggio(); this.playLeaveTone(); }
        this.prevPeerCount = peerCount;
      }
      closest.forEach(({ pid, data }, i) => {
        const h = hashId(pid);
        this._playTone(PENTATONIC[h % PENTATONIC.length], 0.15 + (h % 15) * 0.01, (data.x || 0.5) * 2 - 1, TIMBRES[h % TIMBRES.length], 0.015, i * 0.2);
      });
    }

    _playJoinArpeggio() { for (let i = 0; i < 3; i++) this._playTone(PENTATONIC[i], 0.12, 0, 'sine', 0.02, i * 0.08); }
    _playLeaveArpeggio() { for (let i = 2; i >= 0; i--) this._playTone(PENTATONIC[i], 0.12, 0, 'sine', 0.02, (2 - i) * 0.08); }

    // ── Arcade acoustics ──
    _checkArcadeTransitions(peers) {
      if (!this._isEnabled()) return;
      const myId = this.engine.myId;
      for (const [pid, pArr] of Object.entries(peers)) {
        if (pid === myId) continue;
        const p = pArr[0] || {};
        const prev = this.prevPeerGameStates[pid], cur = p.gameState;
        if (!prev && cur && cur.status === 'playing') { this._makeNoise(0.1, 200, 0.5, 0.02); this._playTone(120, 0.2, 0, 'sine', 0.015, 0.08); }
        if (cur && cur.status === 'finished' && (!prev || prev.status !== 'finished') && cur.score > 100) {
          this._makeNoise(0.2, 2000, 0.8, 0.03);
          this._playTone(523.25, 0.03, 0, 'square', 0.025, 0.05); this._playTone(659.25, 0.03, 0, 'square', 0.025, 0.09); this._playTone(783.99, 0.03, 0, 'square', 0.025, 0.13);
        }
        this.prevPeerGameStates[pid] = cur ? { ...cur } : null;
      }
      for (const pid of Object.keys(this.prevPeerGameStates)) { if (!peers[pid]) delete this.prevPeerGameStates[pid]; }

      const hasRival = Object.entries(peers).some(([k, pArr]) => {
        if (k === myId) return false;
        const p = pArr[0] || {};
        const myGS = peers[myId] ? (peers[myId][0] || {}).gameState : null;
        return myGS && p.gameState && p.gameState.game === myGS.game;
      });
      if (hasRival) this._startHeartbeat(); else this._stopHeartbeat();
    }

    _startHeartbeat() {
      if (this.heartbeatInterval) return;
      this.heartbeatInterval = setInterval(() => { if (this._isEnabled()) this._playTone(60, 0.05, 0, 'sine', 0.015); }, 1000);
    }
    _stopHeartbeat() { if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; } }

    // ── Swarm harmonic (NEW) ──
    playSwarmHarmonic(metrics) {
      if (!this._isEnabled() || metrics.count < 6) return;
      if (metrics.avgDist > 0.05) return;
      const now = performance.now();
      if (now - this._lastSwarmHarmonicTime < 500) return;
      this._lastSwarmHarmonicTime = now;
      const peerCount = metrics.count / 3;
      const pan = metrics.center.x * 2 - 1;
      const vol = Math.max(0.005, 0.02 * (1 - metrics.avgDist * 20));
      this._playTone(523.25, 0.4, pan, 'sine', vol);
      if (peerCount >= 2) this._playTone(783.99, 0.4, pan, 'sine', vol * 0.8);
      if (peerCount >= 3) this._playTone(659.25, 0.4, pan, 'sine', vol * 0.6);
      if (peerCount >= 4) this._playTone(932.33, 0.4, pan, 'sine', vol * 0.4);
    }

    // ── Gravity well hum (NEW) ──
    updateWellDrones(wells) {
      if (!this._isEnabled()) {
        this._killAllDrones();
        return;
      }
      const c = this._getCtx();
      if (!c) return;

      const activeKeys = new Set();
      for (const well of wells) {
        const key = well.section;
        activeKeys.add(key);
        if (this.wellDrones.has(key)) continue;
        const freq = 60 + SECTIONS.indexOf(well.section) * 20;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.005 * Math.log2(well.viewerCount), c.currentTime + 2);
        osc.connect(gain).connect(this._getMaster() || c.destination);
        osc.start(c.currentTime);
        this.wellDrones.set(key, { osc, gain });
      }

      for (const [key, drone] of this.wellDrones) {
        if (!activeKeys.has(key)) {
          drone.gain.gain.linearRampToValueAtTime(0, drone.gain.context.currentTime + 2);
          setTimeout(() => { try { drone.osc.stop(); } catch (e) {} }, 2500);
          this.wellDrones.delete(key);
        }
      }
    }

    _killAllDrones() {
      for (const [, drone] of this.wellDrones) { try { drone.osc.stop(); } catch (e) {} }
      this.wellDrones.clear();
    }

    // ── Main sync handler ──
    onPresenceSync(peers) {
      if (!this._isEnabled()) return;
      const myId = this.engine.myId;
      const closest = this._getClosestPeers(peers, myId);
      this._updateSpatialCursors(closest, peers);
      this._onSwarmSync(peers, closest);
      this._checkArcadeTransitions(peers);
    }

    _getClosestPeers(peers, myId) {
      const myPos = { x: this.engine.myX, y: this.engine.myY };
      const myData = peers[myId] ? (peers[myId][0] || {}) : {};
      const mySection = myData.section || 'hero';
      const list = [];
      for (const [pid, pArr] of Object.entries(peers)) {
        if (pid === myId) continue;
        const p = pArr[0] || {};
        const dx = (p.x || 0.5) - myPos.x, dy = (p.y || 0.5) - myPos.y;
        const posDist = Math.sqrt(dx * dx + dy * dy);
        const ia = SECTIONS.indexOf(mySection), ib = SECTIONS.indexOf(p.section || 'hero');
        const secDist = (ia < 0 || ib < 0) ? 3 : Math.abs(ia - ib);
        list.push({ pid, data: p, dist: posDist + secDist * 0.3 });
      }
      list.sort((a, b) => a.dist - b.dist);
      return list.slice(0, 5);
    }

    destroy() {
      this._stopHeartbeat();
      this._killAllDrones();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESENCE ENGINE — Main Orchestrator
  // ═══════════════════════════════════════════════════════════════

  class PresenceEngine {
    constructor() {
      this.myId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      this.myAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      this.myNickname = localStorage.getItem('arcade_player_name') || ('User-' + this.myId.slice(0, 4));

      this.peers = {};
      this.liveCount = 0;
      this.trophyAwarded = false;
      this.criticalMassActive = false;
      this.mySection = null;
      this.myScrollPct = 0;
      this.myGameState = null;
      this.xpMultiplier = 1;
      this.xpMultiplierEnd = 0;

      this.myX = 0.5;
      this.myY = 0.5;
      this._lastMouseTime = 0;
      this._lastTrackTime = 0;

      this._meshSeen = new Set();
      this.channel = null;
      this.evChannel = null;
      this.frameId = null;
      this._prevSection = null;

      // Subsystems
      this.network = new NetworkOptimizer(this);
      this.predictive = new PredictiveCore(this);
      this.physics = new PhysicsEngine(this);
      this.swarm = new SwarmIntelligence(this);
      this.social = new SocialGraph(this);
      this.interactions = new InteractionManager(this);
      this.ui = new UIRenderer(this);
      this.audio = new AudioSpatializer(this);
    }

    boot() {
      // Mouse tracking
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - this._lastMouseTime < 50) return;
        this._lastMouseTime = now;
        this.myX = e.clientX / window.innerWidth;
        this.myY = e.clientY / window.innerHeight;
      }, { passive: true });

      // Init UI
      this.ui.init();
      this.interactions.initCursorChat();

      // Supabase channels
      this.channel = _sb.channel('site-presence', { config: { presence: { key: this.myId } } });
      this.evChannel = _sb.channel('site-events');

      this.channel
        .on('presence', { event: 'sync' }, () => this._onPresenceSync())
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.channel.track({
              nickname: this.myNickname, avatar: this.myAvatar, section: this._detectSection(),
              scrollPct: this._getScrollPct(), gameState: null,
              x: this.myX, y: this.myY, online_at: new Date().toISOString()
            });
          }
        });

      this.evChannel
        .on('broadcast', { event: 'mp_event' }, ({ payload }) => this.interactions.handleBroadcastEvent(payload))
        .subscribe();

      // Scroll-driven presence tracking
      window.addEventListener('scroll', () => requestAnimationFrame(() => this._trackMeta(false)), { passive: true });

      // Adaptive sync
      this.network.start();

      // P2P mesh
      if (typeof loadMesh === 'function') {
        loadMesh().then(() => {
          if (window._mesh) {
            window._mesh.onMessage((peerId, msg) => {
              if (msg && typeof msg === 'object' && msg.type) this.interactions.handleBroadcastEvent(msg);
            });
            window._mesh.syncPeers(Object.keys(this.channel.presenceState()));
          }
        }).catch(() => {});
      }

      // Render loop
      this._startRenderLoop();

      // Social graph periodic tasks
      this._socialInterval = setInterval(() => {
        this.social.computeInfluence(this.peers);
        this.social.updatePassiveAffinity(this.peers, this.myId, this.mySection);
      }, 10000);

      // Expose globals
      this._exposeGlobals();

      // Cleanup
      window.addEventListener('beforeunload', () => this.destroy());
    }

    destroy() {
      if (this.frameId) { cancelAnimationFrame(this.frameId); this.frameId = null; }
      this.network.stop();
      this.audio.destroy();
      if (this._socialInterval) clearInterval(this._socialInterval);
      if (this.channel) { this.channel.untrack(); this.channel.unsubscribe(); }
      if (this.evChannel) this.evChannel.unsubscribe();
    }

    meshSend(payload) {
      const mid = payload._mid = payload._mid || (this.myId.slice(0, 6) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      this._meshSeen.add(mid);
      setTimeout(() => this._meshSeen.delete(mid), 15000);
      if (window._mesh && window._mesh.getOpenCount() > 0) window._mesh.broadcast(payload);
      this.evChannel.send({ type: 'broadcast', event: 'mp_event', payload });
    }

    _detectSection() {
      const vh = window.innerHeight;
      for (const [sel, name] of Object.entries(SECTION_MAP)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.6 && r.bottom > vh * 0.4) return name;
      }
      return 'hero';
    }

    _getScrollPct() { return Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0; }

    _trackMeta(force) {
      const now = Date.now();
      if (!force && now - this._lastTrackTime < 2000) return;
      this._lastTrackTime = now;
      const newSection = this._detectSection();

      if (this._prevSection && newSection !== this._prevSection) {
        this.predictive.recordTransition(this._prevSection, newSection);
        this.network.lastSectionChange = now;
      }
      this._prevSection = newSection;
      this.mySection = newSection;
      this.myScrollPct = this._getScrollPct();

      const current = {
        nickname: this.myNickname, avatar: this.myAvatar, section: this.mySection,
        scrollPct: this.myScrollPct, gameState: this.myGameState,
        x: this.myX, y: this.myY, online_at: new Date().toISOString()
      };

      const delta = this.network.computeDelta(current);
      if (delta || force) {
        this.channel.track(current);
      }
    }

    _onPresenceSync() {
      const state = this.channel.presenceState();
      const oldPeerIds = new Set(Object.keys(this.peers));
      this.peers = state;

      // Update Kalman filters with new measurements
      for (const [pid, pArr] of Object.entries(state)) {
        if (pid === this.myId) continue;
        const p = pArr[0] || {};
        this.predictive.updateFilter(pid, p.x || 0.5, p.y || 0.5);
        this.physics.setBodyTarget(pid, p.x || 0.5, p.y || 0.5);
      }

      // Clean up departed peers
      for (const pid of oldPeerIds) {
        if (!state[pid]) {
          this.predictive.removePeer(pid);
          this.physics.removePeer(pid);
        }
      }

      this.ui.renderBar();
      if (this.interactions.spectatingUser) this.interactions.doSpectateScroll();
      this.audio.onPresenceSync(state);
      this.ui.cleanupPeerCursors(new Set(Object.keys(state)));
      if (window._mesh) window._mesh.syncPeers(Object.keys(state));

      this.physics.updateGravityWells(state);
      this.audio.updateWellDrones(this.physics.wells);
    }

    _startRenderLoop() {
      let lastTime = performance.now();
      const loop = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Build list of rendered peers
        const renderedPeers = [];
        for (const [pid, pArr] of Object.entries(this.peers)) {
          if (pid === this.myId) continue;
          const p = pArr[0] || {};
          const predicted = this.predictive.predict(pid, dt);
          const physPos = this.physics.getPosition(pid);
          const engagement = this.predictive.computeEngagement(pid, p);

          let rx, ry;
          if (predicted && physPos) {
            rx = predicted.x * 0.7 + physPos.x * 0.3;
            ry = predicted.y * 0.7 + physPos.y * 0.3;
          } else if (predicted) {
            rx = predicted.x; ry = predicted.y;
          } else {
            rx = p.x || 0.5; ry = p.y || 0.5;
          }

          renderedPeers.push({ pid, x: rx, y: ry, avatar: p.avatar, nickname: p.nickname, engagement });
        }

        // Cap rendered peers to top 10 by proximity
        const myPos = { x: this.myX, y: this.myY };
        renderedPeers.sort((a, b) => vec2Dist(a, myPos) - vec2Dist(b, myPos));
        const visible = renderedPeers.slice(0, 10);

        // Physics tick
        this.physics.tick(dt);

        // Boids
        this.swarm.updateBoids(visible);
        this.swarm.detectFormations(visible);

        // Render
        this.ui.renderPeerCursors(visible);

        // Swarm audio
        const metrics = this.swarm.getSwarmMetrics();
        this.audio.playSwarmHarmonic(metrics);

        this.frameId = requestAnimationFrame(loop);
      };
      this.frameId = requestAnimationFrame(loop);
    }

    _getPeerData(peerId) {
      const pArr = this.peers[peerId];
      return pArr ? (pArr[0] || {}) : null;
    }

    _exposeGlobals() {
      window._mpMyId = this.myId;
      window._mpSetGame = (state) => { this.myGameState = state; this._trackMeta(true); };
      window._mpClearGame = () => { this.myGameState = null; this._trackMeta(true); };
      window._mpGetPeers = () => this.peers;
      window._mpXpMultiplier = () => this.xpMultiplier;
      window._mpGetMyPos = () => ({ x: this.myX, y: this.myY });
      window._openCursorChat = () => this.interactions.openCursorChat();

      window._presenceAudio = {
        onHighFive: () => this.audio.playHighFiveChord(),
        onTip: () => this.audio.playTipCoin(),
        onJoin: () => this.audio.playJoinTone(),
        onLeave: () => this.audio.playLeaveTone(),
        onWhisper: () => this.audio.playWhisperBreath(),
        onPowerUp: () => this.audio.playPowerUpSweep(),
        onBroadcast: () => this.audio.playRadarPing(),
        onGuestbookEntry: () => this.audio.playGhostTyping(),
        onPresenceSync: (peers) => this.audio.onPresenceSync(peers)
      };

      window.TermCmds = window.TermCmds || {};
      window.TermCmds.broadcast = (args) => this.interactions.termBroadcast(args);
      window.TermCmds.engage = (args) => this.interactions.termEngage(args);

      window._presenceEngine = this;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════

  const engine = new PresenceEngine();
  engine.boot();

})();
