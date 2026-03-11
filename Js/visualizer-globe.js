// visualizer-globe.js — Interactive 3D Globe, Supabase realtime, visitor arcs
// Requires: ai3d-core.js (window._AI3D)
(function() {
  'use strict';
  var A = window._AI3D;

  // ── Globe CSS ──
  var css = document.createElement('style');
  css.id = 'globe-css';
  css.textContent = `
.globe-hud { position:absolute; top:34px; left:0; right:0; bottom:0; pointer-events:none; z-index:10; font-family:'JetBrains Mono',monospace; display:flex; flex-direction:column; justify-content:space-between; padding:8px 12px; }
.globe-stats-glass { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; padding-bottom:6px; }
.globe-stat-card { text-align:center; padding:7px 10px; border-radius:12px; background:rgba(10,22,40,.45); backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); border:1px solid rgba(0,225,255,.1); box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 2px 12px rgba(0,0,0,.3); transition:border-color .4s, box-shadow .4s; position:relative; overflow:hidden; min-width:62px; }
.globe-stat-card::before { content:''; position:absolute; inset:0; border-radius:12px; background:linear-gradient(135deg,rgba(0,225,255,.04) 0%,transparent 60%); pointer-events:none; }
.globe-stat-card.glow { border-color:rgba(0,225,255,.35); box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 0 18px rgba(0,225,255,.12); }
.globe-stat-val { font-size:15px; font-weight:700; color:#00e1ff; line-height:1; text-shadow:0 0 14px rgba(0,225,255,.45); font-variant-numeric:tabular-nums; }
.globe-stat-label { font-size:6.5px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.38); margin-top:3px; }
.globe-live-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:4px; vertical-align:middle; animation:globePulse 2s ease-in-out infinite; box-shadow:0 0 6px rgba(34,197,94,.5); }
@keyframes globePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(.7); } }
.globe-bottom-glass { background:rgba(10,22,40,.4); backdrop-filter:blur(12px) saturate(160%); -webkit-backdrop-filter:blur(12px) saturate(160%); border:1px solid rgba(0,225,255,.08); border-radius:10px; padding:6px 12px; margin-bottom:14px; }
.globe-legend { display:flex; gap:12px; justify-content:center; align-items:center; font-size:7px; letter-spacing:.5px; color:rgba(255,255,255,.35); }
.globe-legend-dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:3px; vertical-align:middle; }
.globe-toast { position:absolute; top:72px; left:50%; transform:translateX(-50%) translateY(-8px); font-family:'JetBrains Mono',monospace; font-size:7.5px; letter-spacing:.8px; color:#22c55e; background:rgba(10,22,40,.55); backdrop-filter:blur(12px); border:1px solid rgba(34,197,94,.2); border-radius:8px; padding:4px 10px; opacity:0; transition:opacity .4s, transform .4s; pointer-events:none; z-index:20; white-space:nowrap; }
.globe-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
`;
  document.head.appendChild(css);

  const CAIRO_LAT = 30.0444, CAIRO_LNG = 31.2357;

  function latLngToVec3(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function launchGlobe() {
    A.open3D('\ud83c\udf10 Global Visitor Reach', buildGlobeScene, 'three');
  }
  window._launchGlobe = launchGlobe;

  function buildGlobeScene(container) {
    if (typeof THREE === 'undefined') return;

    const W = container.clientWidth, H = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 3.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const hintEl = container.querySelector('.viewer3d-hint');
    if (hintEl) container.insertBefore(renderer.domElement, hintEl);
    else container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthTexLoader = new THREE.TextureLoader();
    const earthTex = earthTexLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
    const globeMat = new THREE.MeshBasicMaterial({ map: earthTex, transparent: true, opacity: 0.92 });
    group.add(new THREE.Mesh(globeGeo, globeMat));

    const gridGeo = new THREE.SphereGeometry(1.002, 36, 18);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, wireframe: true, transparent: true, opacity: 0.04 });
    group.add(new THREE.Mesh(gridGeo, gridMat));

    const atmosGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, transparent: true, opacity: 0.03, side: THREE.BackSide });
    group.add(new THREE.Mesh(atmosGeo, atmosMat));
    const atmos2Geo = new THREE.SphereGeometry(1.15, 32, 32);
    const atmos2Mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.015, side: THREE.BackSide });
    group.add(new THREE.Mesh(atmos2Geo, atmos2Mat));

    const cairoPos = latLngToVec3(CAIRO_LAT, CAIRO_LNG, 1.01);
    const cairoDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00e1ff })
    );
    cairoDot.position.copy(cairoPos);
    group.add(cairoDot);

    const ringGeo = new THREE.RingGeometry(0.03, 0.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(cairoPos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    group.add(ring);

    let alive = true;
    const arcData = [];
    const ARC_PTS = 60;
    const VISITOR_COLOR = 0x22c55e;
    const disposables = [];
    const regionHits = {};
    let realtimeChannel = null;

    function regionKey(lat, lng) {
      return Math.round(lat / 5) + ',' + Math.round(lng / 5);
    }

    function addLocation(lat, lng, delay, isRealtime) {
      if (!alive) return;
      const pos = latLngToVec3(lat, lng, 1.008);

      const rk = regionKey(lat, lng);
      regionHits[rk] = (regionHits[rk] || 0) + 1;
      const intensity = Math.min(regionHits[rk] / 8, 1);
      const baseSize = 0.01 + intensity * 0.012;
      const baseOpacity = 0.55 + intensity * 0.4;

      const dotGeo = new THREE.SphereGeometry(baseSize, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: VISITOR_COLOR, transparent: true, opacity: baseOpacity });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      group.add(dot);
      disposables.push(dotGeo, dotMat);

      const mid = pos.clone().add(cairoPos).multiplyScalar(0.5);
      const dist = pos.distanceTo(cairoPos);
      mid.normalize().multiplyScalar(1 + dist * 0.35);

      const curve = new THREE.QuadraticBezierCurve3(pos, mid, cairoPos);
      const points = curve.getPoints(ARC_PTS);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      arcGeo.setDrawRange(0, 0);
      const arcMat = new THREE.LineBasicMaterial({ color: isRealtime ? 0x00e1ff : VISITOR_COLOR, transparent: true, opacity: isRealtime ? 0.85 : 0.5 + intensity * 0.3 });
      const line = new THREE.Line(arcGeo, arcMat);
      group.add(line);
      disposables.push(arcGeo, arcMat);

      arcData.push({
        geo: arcGeo, total: ARC_PTS + 1, drawn: 0,
        speed: isRealtime ? 1.8 : 0.8 + Math.random() * 0.5,
        delay, startTime: performance.now()
      });
    }

    const statEls = {};
    let statsRefreshTimer = null;
    const STATS_CACHE_KEY = '_globe_stats_cache';

    function animateCounter(el, target, suffix, prefix) {
      suffix = suffix || '';
      prefix = prefix || '';
      const duration = 1200;
      const start = performance.now();
      const from = 0;
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (target - from) * ease);
        el.innerHTML = prefix + val.toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function flashGlow(cardEl) {
      cardEl.classList.add('glow');
      setTimeout(() => cardEl.classList.remove('glow'), 1200);
    }

    async function fetchGlobeStats() {
      if (!window._sb) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) applyStats(JSON.parse(cached));
        return;
      }
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [countryRes, totalRes, uniqueRes, liveRes, topRes, todayRes] = await Promise.all([
          window._sb.rpc('count_distinct_countries'),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }),
          window._sb.rpc('count_unique_visitors'),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }).gte('created_at', fiveMinAgo),
          window._sb.from('site_visits').select('country').not('country', 'is', null).order('country').limit(1000),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo)
        ]);

        let topCountry = '\u2014';
        if (topRes.data && topRes.data.length) {
          const freq = {};
          topRes.data.forEach(r => { if (r.country) freq[r.country] = (freq[r.country] || 0) + 1; });
          topCountry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '\u2014';
        }

        const stats = {
          countries: countryRes.data ?? 0,
          totalVisits: totalRes.count ?? 0,
          uniqueVisitors: uniqueRes.data ?? 0,
          liveNow: liveRes.count ?? 0,
          topCountry,
          todayVisits: todayRes.count ?? 0
        };

        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
        applyStats(stats, true);
      } catch (e) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) applyStats(JSON.parse(cached));
      }
    }

    function applyStats(s, animate) {
      if (statEls.countries) {
        if (animate) { animateCounter(statEls.countries, s.countries); flashGlow(statEls.countriesCard); }
        else statEls.countries.textContent = s.countries.toLocaleString();
      }
      if (statEls.totalVisits) {
        if (animate) { animateCounter(statEls.totalVisits, s.totalVisits); flashGlow(statEls.totalVisitsCard); }
        else statEls.totalVisits.textContent = s.totalVisits.toLocaleString();
      }
      if (statEls.uniqueVisitors) {
        if (animate) { animateCounter(statEls.uniqueVisitors, s.uniqueVisitors); flashGlow(statEls.uniqueVisitorsCard); }
        else statEls.uniqueVisitors.textContent = s.uniqueVisitors.toLocaleString();
      }
      const liveDotHtml = '<span class="globe-live-dot"></span>';
      if (statEls.liveNow) {
        if (animate) { animateCounter(statEls.liveNow, s.liveNow, '', liveDotHtml); flashGlow(statEls.liveNowCard); }
        else statEls.liveNow.innerHTML = liveDotHtml + s.liveNow.toLocaleString();
      }
      if (statEls.topCountry) {
        statEls.topCountry.textContent = s.topCountry || '\u2014';
        if (animate) flashGlow(statEls.topCountryCard);
      }
      if (statEls.todayVisits) {
        if (animate) { animateCounter(statEls.todayVisits, s.todayVisits); flashGlow(statEls.todayVisitsCard); }
        else statEls.todayVisits.textContent = s.todayVisits.toLocaleString();
      }
    }

    if (window._sb) {
      window._sb.from('site_visits').select('lat,lng,country')
        .not('lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) data.forEach((e, i) => {
            if (e.lat && e.lng) addLocation(e.lat, e.lng, i * 250 + Math.random() * 200, false);
          });
        }).catch(() => {});
    }

    const hudEl = document.createElement('div');
    hudEl.className = 'globe-hud';
    hudEl.innerHTML = `<div class="globe-stats-glass">
      <div class="globe-stat-card" id="gs-countries"><div class="globe-stat-val" id="gsv-countries">\u2014</div><div class="globe-stat-label">Countries</div></div>
      <div class="globe-stat-card" id="gs-total"><div class="globe-stat-val" id="gsv-total">\u2014</div><div class="globe-stat-label">Total Visits</div></div>
      <div class="globe-stat-card" id="gs-unique"><div class="globe-stat-val" id="gsv-unique">\u2014</div><div class="globe-stat-label">Visitors</div></div>
      <div class="globe-stat-card" id="gs-live"><div class="globe-stat-val" id="gsv-live"><span class="globe-live-dot"></span>\u2014</div><div class="globe-stat-label">Live Now</div></div>
      <div class="globe-stat-card" id="gs-top"><div class="globe-stat-val" id="gsv-top" style="font-size:10px">\u2014</div><div class="globe-stat-label">Top Country</div></div>
      <div class="globe-stat-card" id="gs-today"><div class="globe-stat-val" id="gsv-today">\u2014</div><div class="globe-stat-label">Today</div></div>
    </div>
    <div class="globe-bottom-glass">
      <div class="globe-legend">
        <span><span class="globe-legend-dot" style="background:#00e1ff"></span>Cairo (Home)</span>
        <span><span class="globe-legend-dot" style="background:#22c55e"></span>Visitors</span>
      </div>
    </div>`;
    container.appendChild(hudEl);

    const toastEl = document.createElement('div');
    toastEl.className = 'globe-toast';
    container.appendChild(toastEl);

    statEls.countries = hudEl.querySelector('#gsv-countries');
    statEls.countriesCard = hudEl.querySelector('#gs-countries');
    statEls.totalVisits = hudEl.querySelector('#gsv-total');
    statEls.totalVisitsCard = hudEl.querySelector('#gs-total');
    statEls.uniqueVisitors = hudEl.querySelector('#gsv-unique');
    statEls.uniqueVisitorsCard = hudEl.querySelector('#gs-unique');
    statEls.liveNow = hudEl.querySelector('#gsv-live');
    statEls.liveNowCard = hudEl.querySelector('#gs-live');
    statEls.topCountry = hudEl.querySelector('#gsv-top');
    statEls.topCountryCard = hudEl.querySelector('#gs-top');
    statEls.todayVisits = hudEl.querySelector('#gsv-today');
    statEls.todayVisitsCard = hudEl.querySelector('#gs-today');

    fetchGlobeStats();
    statsRefreshTimer = setInterval(() => { if (alive && !document.hidden) fetchGlobeStats(); }, 30000);

    function showToast(city, country) {
      toastEl.textContent = '\u25cf ' + (city ? city + ', ' : '') + (country || 'New visitor');
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    if (window._sb && window._sb.channel) {
      realtimeChannel = window._sb.channel('globe-visits')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_visits' }, (payload) => {
          if (!alive) return;
          const row = payload.new;
          if (row.lat && row.lng) {
            addLocation(row.lat, row.lng, 0, true);
            showToast(row.city, row.country);
          }
          fetchGlobeStats();
        })
        .subscribe();
    }

    const newHint = document.createElement('div');
    newHint.className = 'viewer3d-hint';
    newHint.textContent = A.isMobile ? 'Drag \u00b7 Pinch to zoom' : 'Drag to rotate \u00b7 Scroll to zoom';
    container.appendChild(newHint);

    let dragging = false, prevX = 0, prevY = 0;
    let rotY = -0.5, rotX = 0.15;
    let autoRot = true, autoTimer = null;

    const pDown = (x, y) => { dragging = true; prevX = x; prevY = y; autoRot = false; if (autoTimer) clearTimeout(autoTimer); };
    const pMove = (x, y) => {
      if (!dragging) return;
      rotY += (x - prevX) * 0.006;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + (y - prevY) * 0.006));
      prevX = x; prevY = y;
      A.Haptic.rotate();
    };
    const pUp = () => { dragging = false; autoTimer = setTimeout(() => { autoRot = true; }, 3000); };
    const onWindowMouseUp = () => pUp();

    renderer.domElement.addEventListener('mousedown', e => pDown(e.clientX, e.clientY));
    renderer.domElement.addEventListener('mousemove', e => pMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onWindowMouseUp);
    renderer.domElement.addEventListener('touchstart', e => { if (e.touches.length === 1) pDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    renderer.domElement.addEventListener('touchmove', e => { if (e.touches.length === 1) pMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    renderer.domElement.addEventListener('touchend', pUp, { passive: true });
    renderer.domElement.addEventListener('wheel', e => {
      camera.position.z = Math.max(2, Math.min(5.5, camera.position.z + e.deltaY * 0.003));
      A.Haptic.zoom();
    }, { passive: true });

    const onResize = () => {
      if (!alive) return;
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    function animate() {
      if (!alive || !renderer.domElement.isConnected) { alive = false; return; }
      requestAnimationFrame(animate);
      if (window._suspended || document.hidden) return;

      if (autoRot) rotY += 0.002;
      group.rotation.y = rotY;
      group.rotation.x = rotX;

      const t = performance.now() * 0.003;
      ring.scale.setScalar(1 + Math.sin(t) * 0.3);
      ringMat.opacity = 0.3 + Math.sin(t) * 0.2;

      const now = performance.now();
      for (const a of arcData) {
        if (now - a.startTime < a.delay) continue;
        if (a.drawn < a.total) {
          a.drawn = Math.min(a.total, a.drawn + a.speed);
          a.geo.setDrawRange(0, Math.floor(a.drawn));
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    window._v3dCleanup = () => {
      alive = false;
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('resize', onResize);
      if (autoTimer) clearTimeout(autoTimer);
      if (statsRefreshTimer) clearInterval(statsRefreshTimer);
      if (realtimeChannel && window._sb) {
        window._sb.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      disposables.forEach(d => d.dispose());
      globeGeo.dispose(); globeMat.dispose();
      gridGeo.dispose(); gridMat.dispose();
      atmosGeo.dispose(); atmosMat.dispose();
      atmos2Geo.dispose(); atmos2Mat.dispose();
      cairoDot.geometry.dispose(); cairoDot.material.dispose();
      ringGeo.dispose(); ringMat.dispose();
      renderer.dispose();
    };
  }

  // Register terminal commands
  window.TermCmds = window.TermCmds || {};
  window.TermCmds.globe = () => { setTimeout(launchGlobe, 300); return '\ud83c\udf10 Launching Global Reach Globe...'; };
  window.TermCmds.world = window.TermCmds.globe;
})();
