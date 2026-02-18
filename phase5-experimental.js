// ═══════════════════════════════════════════════════════════════
// PHASE 5: EXPERIMENTAL "WOW FACTOR" — amrelharony.com (v2)
// Drop-in: <script src="phase5-experimental.js" defer></script>
//
// Features:
//   1. Cyberpunk Theme Override (terminal `> cyberpunk`)
//   2. Bio-Rhythm Animation (sunrise/sunset palette + speed)
//   3. Live Digital Twin Status (simulated real-time activity)
//
// Audio removed. All on-device, no external APIs, privacy-first
// ═══════════════════════════════════════════════════════════════
(function PhaseFiveExperimental() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  const CAIRO_LAT = 30.0444;
  const CAIRO_LNG = 31.2357;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase5-css';
  css.textContent = `

/* ═══════════════════════════════════════════
   1. CYBERPUNK THEME
   ═══════════════════════════════════════════ */

body.cyberpunk-mode {
  --bg: #0a0010;
  --bg2: #0f0018;
  --card: rgba(20,0,40,.7);
  --cardH: rgba(30,0,60,.8);
  --border: rgba(255,0,100,.15);
  --text: #f0d0ff;
  --sub: #8a5ca0;
  --accent: #ff0066;
  --accent2: #00ffcc;
  --accent3: #ffcc00;
  --glow: rgba(255,0,102,.25);
}

body.cyberpunk-mode::before {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,102,.015) 2px, rgba(255,0,102,.015) 4px);
  pointer-events: none;
  animation: cpScanlines 8s linear infinite;
}
@keyframes cpScanlines { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }

body.cyberpunk-mode::after {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background: radial-gradient(ellipse at 20% 50%, rgba(255,0,102,.06), transparent 60%),
              radial-gradient(ellipse at 80% 30%, rgba(0,255,204,.04), transparent 50%);
  pointer-events: none;
}

body.cyberpunk-mode .ng {
  background: linear-gradient(135deg, #ff0066, #ff6600, #ffcc00, #00ffcc) !important;
  -webkit-background-clip: text !important; background-clip: text !important;
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 0 8px rgba(255,0,102,.4));
}
body.cyberpunk-mode .hn { text-shadow: 0 0 20px rgba(255,0,102,.5), 0 0 40px rgba(255,0,102,.2); }

body.cyberpunk-mode .lk,
body.cyberpunk-mode .cert-card,
body.cyberpunk-mode .tc-card,
body.cyberpunk-mode .insight-card {
  border-color: rgba(255,0,102,.12) !important;
  box-shadow: inset 0 0 20px rgba(255,0,102,.03);
}
body.cyberpunk-mode .lk:hover,
body.cyberpunk-mode .cert-card:hover {
  border-color: rgba(255,0,102,.3) !important;
  box-shadow: 0 0 20px rgba(255,0,102,.1), inset 0 0 20px rgba(255,0,102,.05) !important;
}

body.cyberpunk-mode .rt {
  border-color: rgba(0,255,204,.2) !important;
  color: #00ffcc !important;
  text-shadow: 0 0 6px rgba(0,255,204,.3);
}
body.cyberpunk-mode .imp-num {
  color: #ffcc00 !important;
  text-shadow: 0 0 12px rgba(255,204,0,.4);
}
body.cyberpunk-mode .tl-line {
  background: linear-gradient(180deg, #ff0066, #00ffcc, #ffcc00) !important;
  box-shadow: 0 0 8px rgba(255,0,102,.3);
}
body.cyberpunk-mode .tl-dot {
  border-color: #ff0066 !important;
  box-shadow: 0 0 8px rgba(255,0,102,.5);
}
body.cyberpunk-mode .pf svg circle {
  stroke: #ff0066 !important;
  filter: drop-shadow(0 0 6px rgba(255,0,102,.5));
}
body.cyberpunk-mode .xp-footer {
  border-color: rgba(255,0,102,.15) !important;
  background: rgba(10,0,16,.95) !important;
}
body.cyberpunk-mode::-webkit-scrollbar-thumb {
  background: rgba(255,0,102,.3) !important;
}

.cp-flash {
  position: fixed; inset: 0; z-index: 99999; pointer-events: none; opacity: 0;
}
.cp-flash.active { animation: cpFlash .6s ease-out; }
@keyframes cpFlash {
  0% { opacity: 0; background: #ff0066; }
  15% { opacity: .8; background: #ff0066; }
  30% { opacity: 0; }
  45% { opacity: .4; background: #00ffcc; }
  60% { opacity: 0; }
  75% { opacity: .2; background: #ffcc00; }
  100% { opacity: 0; }
}

.cp-indicator {
  position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 100;
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 2px; text-transform: uppercase; color: #ff0066;
  text-shadow: 0 0 8px rgba(255,0,102,.5);
  opacity: 0; transition: opacity .5s; pointer-events: none;
}
body.cyberpunk-mode .cp-indicator { opacity: .5; }
body.cyberpunk-mode .cp-indicator:hover { opacity: 1; }


/* ═══════════════════════════════════════════
   2. BIO-RHYTHM
   ═══════════════════════════════════════════ */

.bio-glow {
  position: fixed; inset: 0; z-index: -2;
  pointer-events: none; opacity: 0; transition: opacity 2s ease;
}
.bio-glow.active { opacity: 1; }
body.zen-mode .bio-glow { display: none; }
body.cyberpunk-mode .bio-glow { display: none; }


/* ═══════════════════════════════════════════
   3. DIGITAL TWIN STATUS
   ═══════════════════════════════════════════ */

.twin-status {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: var(--sub); letter-spacing: .5px; margin-top: 6px;
  transition: all .4s; cursor: default; overflow: hidden;
}
.twin-status:hover { border-color: rgba(0,225,255,.1); background: rgba(255,255,255,.03); }
.twin-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: background .5s;
}
.twin-dot.online { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.4); animation: livePulse 2s ease-in-out infinite; }
.twin-dot.busy { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,.3); }
.twin-dot.away { background: #6b7280; }
.twin-dot.sleeping { background: #3b82f6; box-shadow: 0 0 6px rgba(59,130,246,.2); animation: sleepPulse 4s ease-in-out infinite; }
@keyframes sleepPulse { 0%, 100% { opacity: .3; } 50% { opacity: .8; } }
.twin-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.twin-activity { color: var(--text); font-weight: 500; }
.twin-time { color: var(--sub); opacity: .5; font-size: 7px; flex-shrink: 0; }
.twin-typing { display: inline-flex; gap: 2px; margin-left: 4px; }
.twin-typing-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--accent); animation: typeDot 1.4s ease-in-out infinite;
}
.twin-typing-dot:nth-child(2) { animation-delay: .2s; }
.twin-typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot { 0%, 100% { opacity: .2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }

@media print { .twin-status { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: CYBERPUNK THEME OVERRIDE
  // ═══════════════════════════════════════════════════

  function initCyberpunk() {
    const flash = document.createElement('div');
    flash.className = 'cp-flash'; flash.id = 'cpFlash';
    document.body.appendChild(flash);

    const indicator = document.createElement('div');
    indicator.className = 'cp-indicator';
    indicator.textContent = '◆ CYBERPUNK MODE ◆';
    document.body.appendChild(indicator);

    if (localStorage.getItem('cyberpunkMode') === '1') {
      document.body.classList.add('cyberpunk-mode');
    }

    window._toggleCyberpunk = function(animate) {
      const active = document.body.classList.toggle('cyberpunk-mode');
      localStorage.setItem('cyberpunkMode', active ? '1' : '0');
      if (animate && !RM) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 700);
      }
      const consoleEl = document.getElementById('liveConsole');
      if (consoleEl) {
        consoleEl.textContent = active
          ? '🌆 Cyberpunk mode engaged — welcome to Night City'
          : '☀️ Cyberpunk mode deactivated — back to default';
      }
      if (window.VDna) window.VDna.addXp(active ? 10 : 0);
      return active;
    };

    if (window.TermCmds) {
      window.TermCmds.cyberpunk = () => {
        const active = window._toggleCyberpunk(true);
        return active
          ? '<span style="color:#ff0066;text-shadow:0 0 8px rgba(255,0,102,.5)">◆ CYBERPUNK MODE ACTIVATED ◆</span><br><span style="color:#8a5ca0">Neon dreams loading... Welcome to Night City, choom.</span>'
          : '<span style="color:#00e1ff">Cyberpunk mode deactivated. Reality restored.</span>';
      };
      window.TermCmds.neon = window.TermCmds.cyberpunk;
      window.TermCmds.nightcity = window.TermCmds.cyberpunk;
    }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: BIO-RHYTHM ANIMATION
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
  // FEATURE 3: LIVE DIGITAL TWIN STATUS
  // ═══════════════════════════════════════════════════

  function initDigitalTwin() {
    const now = new Date();
    const cairoH = parseInt(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }));
    const cairoM = parseInt(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', minute: 'numeric' }));
    const dayName = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' });
    const isWeekend = dayName === 'Friday' || dayName === 'Saturday';
    const mins = cairoH * 60 + cairoM;
    const status = getTwinStatus(mins, isWeekend);

    const rtags = document.getElementById('rtags');
    if (!rtags) return;

    const el = document.createElement('div');
    el.className = 'twin-status'; el.id = 'twinStatus';
    el.innerHTML = `
      <span class="twin-dot ${status.state}"></span>
      <span class="twin-text">
        <span class="twin-activity">${status.activity}</span>
        ${status.typing ? '<span class="twin-typing"><span class="twin-typing-dot"></span><span class="twin-typing-dot"></span><span class="twin-typing-dot"></span></span>' : ''}
      </span>
      <span class="twin-time">${status.timeLabel}</span>
    `;
    rtags.insertAdjacentElement('afterend', el);

    setInterval(() => {
      const n = new Date();
      const ch = parseInt(n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }));
      const cm = parseInt(n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', minute: 'numeric' }));
      const dn = n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' });
      const we = dn === 'Friday' || dn === 'Saturday';
      const s = getTwinStatus(ch * 60 + cm, we);
      el.querySelector('.twin-dot').className = `twin-dot ${s.state}`;
      el.querySelector('.twin-activity').textContent = s.activity;
      el.querySelector('.twin-time').textContent = s.timeLabel;
    }, 300000);
  }

  function getTwinStatus(mins, isWeekend) {
    const h = Math.floor(mins / 60), m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const timeLabel = `${h12}:${String(m).padStart(2, '0')} ${ampm} Cairo`;

    if (isWeekend) {
      if (mins < 480) return { state: 'sleeping', activity: '😴 Recharging for the week', timeLabel, typing: false };
      if (mins < 600) return { state: 'away', activity: '☕ Weekend morning routine', timeLabel, typing: false };
      if (mins < 720) return { state: 'online', activity: '📚 Reading & learning', timeLabel, typing: false };
      if (mins < 840) return { state: 'online', activity: '✍️ Working on The Bilingual Executive', timeLabel, typing: true };
      if (mins < 960) return { state: 'online', activity: '🎓 Mentoring sessions on ADPList', timeLabel, typing: false };
      if (mins < 1080) return { state: 'away', activity: '👨‍👩‍👦 Family time', timeLabel, typing: false };
      if (mins < 1200) return { state: 'online', activity: '💻 Building side projects', timeLabel, typing: true };
      if (mins < 1320) return { state: 'online', activity: '🎮 Exploring fintech trends', timeLabel, typing: false };
      return { state: 'sleeping', activity: '😴 Recharging for the week', timeLabel, typing: false };
    }

    if (mins < 420) return { state: 'sleeping', activity: '😴 Getting rest before another big day', timeLabel, typing: false };
    if (mins < 480) return { state: 'away', activity: '☕ Morning prep — Cairo sunrise', timeLabel, typing: false };
    if (mins < 540) return { state: 'busy', activity: '🏦 Heading to Banque Misr — commute', timeLabel, typing: false };
    if (mins < 600) return { state: 'busy', activity: '📊 Morning standup & sprint review', timeLabel, typing: false };
    if (mins < 720) return { state: 'busy', activity: '🚀 Leading data & analytics delivery', timeLabel, typing: true };
    if (mins < 780) return { state: 'away', activity: '🍽️ Lunch break', timeLabel, typing: false };
    if (mins < 900) return { state: 'busy', activity: '📋 Stakeholder meetings & backlog grooming', timeLabel, typing: false };
    if (mins < 1020) return { state: 'busy', activity: '⚡ Sprint execution & team facilitation', timeLabel, typing: true };
    if (mins < 1080) return { state: 'online', activity: '📝 Wrapping up — EOD handoffs', timeLabel, typing: false };
    if (mins < 1140) return { state: 'online', activity: '🎓 Evening mentoring on ADPList', timeLabel, typing: false };
    if (mins < 1260) return { state: 'online', activity: '💡 Side projects & community work', timeLabel, typing: true };
    if (mins < 1380) return { state: 'online', activity: '📖 Reading or writing', timeLabel, typing: false };
    return { state: 'sleeping', activity: '😴 Getting rest before another big day', timeLabel, typing: false };
  }


  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initBioRhythm();
    initCyberpunk();
    initDigitalTwin();

    console.log(
      '%c✦ Phase 5 Loaded %c Cyberpunk · Bio-Rhythm · Digital Twin',
      'background:#ff0066;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#0a0010;color:#ff0066;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 400));
  } else {
    setTimeout(init, 400);
  }

})();
