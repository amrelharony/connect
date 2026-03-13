// boids-swarm.js — Pure Boids flocking & formation detection
// Zero DOM dependencies. All geometry is in [0,1]² normalized space.
(function() {
  'use strict';

  // ── Vector helpers ──

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function vec2Dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function vec2Len(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
  function vec2Norm(v) { var l = vec2Len(v); return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }; }
  function vec2Limit(v, max) { var l = vec2Len(v); if (l <= max) return v; var s = max / l; return { x: v.x * s, y: v.y * s }; }

  // ── Boid creation ──

  function createBoid(parentIdx) {
    return {
      parentIdx: parentIdx,
      pos: { x: 0.5 + (Math.random() - 0.5) * 0.05, y: 0.5 + (Math.random() - 0.5) * 0.05 },
      vel: { x: (Math.random() - 0.5) * 0.001, y: (Math.random() - 0.5) * 0.001 }
    };
  }

  /**
   * One flocking tick — separation + alignment + cohesion + homing.
   * Mutates boids array in place. Returns it for convenience.
   *
   * @param {Array} boids       - array of {parentIdx, pos:{x,y}, vel:{x,y}}
   * @param {Array} parentPositions - array of {x,y} for each parent cursor
   * @param {Object} config     - { maxSpeed, maxForce, perception, sepDist, ghostsPerPeer }
   */
  function updateBoids(boids, parentPositions, config) {
    var maxSpeed = config.maxSpeed || 0.005;
    var maxForce = config.maxForce || 0.0003;
    var perception = config.perception || 0.15;
    var sepDist = config.sepDist || 0.03;
    var ghostsPerPeer = config.ghostsPerPeer || 3;

    // Ensure correct boid count
    var targetCount = parentPositions.length * ghostsPerPeer;
    while (boids.length < targetCount) {
      boids.push(createBoid(Math.floor(boids.length / ghostsPerPeer)));
    }
    while (boids.length > targetCount) boids.pop();

    for (var idx = 0; idx < boids.length; idx++) {
      boids[idx].parentIdx = Math.floor(idx / ghostsPerPeer);
    }

    for (var i = 0; i < boids.length; i++) {
      var b = boids[i];
      var parent = parentPositions[b.parentIdx];
      if (!parent) continue;

      var sepX = 0, sepY = 0;
      var aliX = 0, aliY = 0;
      var cohX = 0, cohY = 0;
      var neighbors = 0;

      for (var j = 0; j < boids.length; j++) {
        if (i === j) continue;
        var o = boids[j];
        var dist = vec2Dist(b.pos, o.pos);
        if (dist > perception || dist === 0) continue;

        if (dist < sepDist) {
          var dx = b.pos.x - o.pos.x, dy = b.pos.y - o.pos.y;
          sepX += dx / (dist * dist);
          sepY += dy / (dist * dist);
        }
        aliX += o.vel.x;
        aliY += o.vel.y;
        cohX += o.pos.x;
        cohY += o.pos.y;
        neighbors++;
      }

      var accX = sepX * 1.8, accY = sepY * 1.8;

      if (neighbors > 0) {
        aliX /= neighbors; aliY /= neighbors;
        var aliNorm = vec2Norm({ x: aliX, y: aliY });
        var aliSteer = vec2Limit({ x: aliNorm.x * maxSpeed - b.vel.x, y: aliNorm.y * maxSpeed - b.vel.y }, maxForce);
        accX += aliSteer.x * 1.0;
        accY += aliSteer.y * 1.0;

        cohX /= neighbors; cohY /= neighbors;
        var cohDir = vec2Norm({ x: cohX - b.pos.x, y: cohY - b.pos.y });
        var cohSteer = vec2Limit({ x: cohDir.x * maxSpeed - b.vel.x, y: cohDir.y * maxSpeed - b.vel.y }, maxForce);
        accX += cohSteer.x * 1.2;
        accY += cohSteer.y * 1.2;
      }

      var homeDir = vec2Norm({ x: parent.x - b.pos.x, y: parent.y - b.pos.y });
      var homeSteer = vec2Limit({ x: homeDir.x * maxSpeed - b.vel.x, y: homeDir.y * maxSpeed - b.vel.y }, maxForce * 0.5);
      accX += homeSteer.x * 0.8;
      accY += homeSteer.y * 0.8;

      b.vel.x += accX;
      b.vel.y += accY;
      var v = vec2Limit(b.vel, maxSpeed);
      b.vel.x = v.x; b.vel.y = v.y;
      b.pos.x = clamp01(b.pos.x + b.vel.x);
      b.pos.y = clamp01(b.pos.y + b.vel.y);
    }
    return boids;
  }

  /**
   * Compute average spread, center, and count.
   */
  function getSwarmMetrics(boids) {
    if (boids.length === 0) return { avgDist: 1, center: { x: 0.5, y: 0.5 }, count: 0 };
    var cx = 0, cy = 0;
    for (var i = 0; i < boids.length; i++) { cx += boids[i].pos.x; cy += boids[i].pos.y; }
    cx /= boids.length; cy /= boids.length;

    var totalDist = 0;
    for (var i = 0; i < boids.length; i++) totalDist += vec2Dist(boids[i].pos, { x: cx, y: cy });
    return { avgDist: totalDist / boids.length, center: { x: cx, y: cy }, count: boids.length };
  }

  /**
   * Pure formation detection — returns array of {type, members, key, center?, well?}.
   * No XP awarding, no toasts — caller handles side effects.
   *
   * @param {Array} positions  - [{x, y, pid}, ...]
   * @param {Array} wells      - [{section, center:{x,y}}, ...] gravity wells for orbit detection
   */
  function detectFormations(positions, wells) {
    var formations = [];
    if (positions.length < 3) return formations;

    // Line detection
    var sortedX = positions.slice().sort(function(a, b) { return a.x - b.x; });
    var yDeltas = sortedX.map(function(p) { return p.y; });
    var minY = Math.min.apply(null, yDeltas), maxY = Math.max.apply(null, yDeltas);
    if (maxY - minY < 0.05) {
      var key = 'line:' + positions.map(function(p) { return p.pid; }).sort().join(',');
      formations.push({ type: 'line', members: positions.map(function(p) { return p.pid; }), key: key });
    }

    // Cluster detection
    var cx = 0, cy = 0;
    for (var i = 0; i < positions.length; i++) { cx += positions[i].x; cy += positions[i].y; }
    cx /= positions.length; cy /= positions.length;
    var allClose = true;
    for (var i = 0; i < positions.length; i++) {
      if (vec2Dist(positions[i], { x: cx, y: cy }) >= 0.1) { allClose = false; break; }
    }
    if (allClose) {
      var key = 'cluster:' + positions.map(function(p) { return p.pid; }).sort().join(',');
      formations.push({ type: 'cluster', members: positions.map(function(p) { return p.pid; }), center: { x: cx, y: cy }, key: key });
    }

    // Orbit detection
    if (wells) {
      for (var w = 0; w < wells.length; w++) {
        var well = wells[w];
        var orbiters = [];
        for (var i = 0; i < positions.length; i++) {
          var d = vec2Dist(positions[i], well.center);
          if (d >= 0.1 && d <= 0.2) orbiters.push(positions[i]);
        }
        if (orbiters.length >= 3) {
          var key = 'orbit:' + well.section + ':' + orbiters.map(function(p) { return p.pid; }).sort().join(',');
          formations.push({ type: 'orbit', members: orbiters.map(function(p) { return p.pid; }), well: well, key: key });
        }
      }
    }

    return formations;
  }

  window.BoidsSwarm = {
    clamp01: clamp01,
    vec2Dist: vec2Dist,
    vec2Norm: vec2Norm,
    vec2Limit: vec2Limit,
    createBoid: createBoid,
    updateBoids: updateBoids,
    getSwarmMetrics: getSwarmMetrics,
    detectFormations: detectFormations
  };
})();
