// ═══════════════════════════════════════════════════════════════
// PHASE 5: EXPERIMENTAL "WOW FACTOR" — amrelharony.com (v2)
// Drop-in: <script src="phase5-experimental.js" defer></script>
//
// Features:
//   1. Bio-Rhythm Animation (sunrise/sunset palette + speed)
//   2. Live Digital Twin Status (simulated real-time activity)
//
// Audio removed. All on-device, no external APIs, privacy-first
// ═══════════════════════════════════════════════════════════════
(function PhaseFiveExperimental() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  const CAIRO_LAT = 30.0444;
  const CAIRO_LNG = 31.2357;

  // phase5-css: styles moved to Css/phase5.css


  // ═══════════════════════════════════════════════════
  // FEATURE 1: BIO-RHYTHM ANIMATION
  // ═══════════════════════════════════════════════════

  function initBioRhythm() {
    if (RM) return;
    const sun = calcSunTimes(new Date(), CAIRO_LAT, CAIRO_LNG);
    const cairoNow = getCairoDate(new Date());
    const phase = getSunPhase(cairoNow, sun);

    const glow = document.createElement('div');
    glow.className = 'bio-glow'; glow.id = 'bioGlow';
    document.body.appendChild(glow);

    const PALETTES = {
      dawn:     { bg: 'radial-gradient(ellipse at 50% 80%, rgba(255,140,50,.04), transparent 70%)', speed: 1.2 },
      morning:  { bg: 'radial-gradient(ellipse at 30% 40%, rgba(255,200,50,.03), transparent 60%)', speed: 1.0 },
      midday:   { bg: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,200,.02), transparent 50%)', speed: 0.8 },
      afternoon:{ bg: 'radial-gradient(ellipse at 70% 50%, rgba(255,160,50,.03), transparent 60%)', speed: 0.9 },
      dusk:     { bg: 'radial-gradient(ellipse at 50% 70%, rgba(255,80,50,.04), rgba(100,0,200,.02) 60%, transparent 80%)', speed: 1.1 },
      evening:  { bg: 'radial-gradient(ellipse at 40% 60%, rgba(60,0,120,.04), transparent 60%)', speed: 1.3 },
      night:    { bg: 'radial-gradient(ellipse at 50% 50%, rgba(0,20,60,.04), transparent 50%)', speed: 1.5 },
    };

    const palette = PALETTES[phase] || PALETTES.night;
    glow.style.background = palette.bg;
    document.documentElement.style.setProperty('--bio-speed', palette.speed);
    setTimeout(() => glow.classList.add('active'), 2000);

    window._bioPhase = phase;
    window._bioSpeed = palette.speed;
  }

  // Minimal SunCalc
  function calcSunTimes(date, lat, lng) {
    const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
    function toJulian(d) { return d.valueOf() / dayMs - 0.5 + J1970; }
    function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
    function toDays(d) { return toJulian(d) - J2000; }
    const e = rad * 23.4397;
    function declination(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclipticLongitude(M) {
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2*M) + 0.0003 * Math.sin(3*M));
      return M + C + rad * 102.9372 + Math.PI;
    }
    function julianCycle(d, lw) { return Math.round(d - 0.0009 - lw / (2 * Math.PI)); }
    function approxTransit(Ht, lw, n) { return 0.0009 + (Ht + lw) / (2 * Math.PI) + n; }
    function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2*L); }
    function hourAngle(h, phi, d) {
      const cosH = (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
      return Math.acos(Math.max(-1, Math.min(1, cosH)));
    }
    function getSetJ(h, lw, phi, dec, n, M, L) {
      const w = hourAngle(h, phi, dec);
      return solarTransitJ(approxTransit(w, lw, n), M, L);
    }
    const lw = rad * -lng, phi = rad * lat, d = toDays(date);
    const n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    const Jset = getSetJ(rad * -0.833, lw, phi, dec, n, M, L);
    const Jnoon = solarTransitJ(ds, M, L);
    return { sunrise: fromJulian(Jnoon - (Jset - Jnoon)), sunset: fromJulian(Jset), noon: fromJulian(Jnoon) };
  }

  function getCairoDate(d) { return new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })); }

  function getSunPhase(now, sun) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const riseMins = sun.sunrise.getHours() * 60 + sun.sunrise.getMinutes();
    const setMins = sun.sunset.getHours() * 60 + sun.sunset.getMinutes();
    if (mins < riseMins - 30) return 'night';
    if (mins < riseMins + 30) return 'dawn';
    if (mins < 720) return 'morning';
    if (mins < riseMins + (setMins - riseMins) * 0.6) return 'midday';
    if (mins < setMins - 60) return 'afternoon';
    if (mins < setMins + 30) return 'dusk';
    if (mins < setMins + 120) return 'evening';
    return 'night';
  }




  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initBioRhythm();

    console.log(
      '%c✦ Phase 5 Loaded %c Cyberpunk · Bio-Rhythm',
      'background:#ff0066;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#0a0010;color:#ff0066;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  function boot() {
    if (window._coreReady) init();
    else window.addEventListener('AmrOS:CoreReady', init, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
