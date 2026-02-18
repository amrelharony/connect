// ═══════════════════════════════════════════════════════════════
// PHASE 5: EXPERIMENTAL "WOW FACTOR" — amrelharony.com
// Drop-in: <script src="phase5-experimental.js" defer></script>
//
// Features:
//   1. Cyberpunk Theme Override (terminal `> cyberpunk` / Level 5)
//   2. Bio-Rhythm Animation (sunrise/sunset palette + speed)
//   3. Ambient Audio Scape (Web Audio API, scroll-reactive, muted default)
//   4. Live Digital Twin Status (simulated real-time activity)
//
// All on-device, no external APIs, privacy-first
// ═══════════════════════════════════════════════════════════════
(function PhaseFiveExperimental() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // Cairo coordinates for SunCalc
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
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,0,102,.015) 2px,
      rgba(255,0,102,.015) 4px
    );
  pointer-events: none;
  animation: cpScanlines 8s linear infinite;
}
@keyframes cpScanlines {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
}

body.cyberpunk-mode::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: radial-gradient(ellipse at 20% 50%, rgba(255,0,102,.06), transparent 60%),
              radial-gradient(ellipse at 80% 30%, rgba(0,255,204,.04), transparent 50%);
  pointer-events: none;
}

/* Neon glow on headings */
body.cyberpunk-mode .ng {
  background: linear-gradient(135deg, #ff0066, #ff6600, #ffcc00, #00ffcc) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 0 8px rgba(255,0,102,.4));
}

body.cyberpunk-mode .hn {
  text-shadow: 0 0 20px rgba(255,0,102,.5), 0 0 40px rgba(255,0,102,.2);
}

/* Neon borders on cards */
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

/* Tags with neon outline */
body.cyberpunk-mode .rt {
  border-color: rgba(0,255,204,.2) !important;
  color: #00ffcc !important;
  text-shadow: 0 0 6px rgba(0,255,204,.3);
}

/* Impact numbers glow */
body.cyberpunk-mode .imp-num {
  color: #ffcc00 !important;
  text-shadow: 0 0 12px rgba(255,204,0,.4);
}

/* Timeline neon line */
body.cyberpunk-mode .tl-line {
  background: linear-gradient(180deg, #ff0066, #00ffcc, #ffcc00) !important;
  box-shadow: 0 0 8px rgba(255,0,102,.3);
}
body.cyberpunk-mode .tl-dot {
  border-color: #ff0066 !important;
  box-shadow: 0 0 8px rgba(255,0,102,.5);
}

/* Profile ring */
body.cyberpunk-mode .pf svg circle {
  stroke: #ff0066 !important;
  filter: drop-shadow(0 0 6px rgba(255,0,102,.5));
}

/* Footer bar */
body.cyberpunk-mode .xp-footer {
  border-color: rgba(255,0,102,.15) !important;
  background: rgba(10,0,16,.95) !important;
}

/* Scrollbar */
body.cyberpunk-mode::-webkit-scrollbar-thumb {
  background: rgba(255,0,102,.3) !important;
}

/* Cyberpunk activation flash */
.cp-flash {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
  opacity: 0;
}
.cp-flash.active {
  animation: cpFlash .6s ease-out;
}
@keyframes cpFlash {
  0% { opacity: 0; background: #ff0066; }
  15% { opacity: .8; background: #ff0066; }
  30% { opacity: 0; }
  45% { opacity: .4; background: #00ffcc; }
  60% { opacity: 0; }
  75% { opacity: .2; background: #ffcc00; }
  100% { opacity: 0; }
}

/* Cyberpunk toggle in toolbar */
.cp-indicator {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #ff0066;
  text-shadow: 0 0 8px rgba(255,0,102,.5);
  opacity: 0;
  transition: opacity .5s;
  pointer-events: none;
}
body.cyberpunk-mode .cp-indicator { opacity: .5; }
body.cyberpunk-mode .cp-indicator:hover { opacity: 1; }


/* ═══════════════════════════════════════════
   2. BIO-RHYTHM
   ═══════════════════════════════════════════ */

.bio-glow {
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 2s ease;
}
.bio-glow.active { opacity: 1; }

body.zen-mode .bio-glow { display: none; }
body.cyberpunk-mode .bio-glow { display: none; }


/* ═══════════════════════════════════════════
   3. AMBIENT AUDIO
   ═══════════════════════════════════════════ */

.audio-toggle {
  position: fixed;
  bottom: 24px;
  left: 16px;
  z-index: 99;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--sub);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  -webkit-tap-highlight-color: transparent;
  opacity: .5;
}
.audio-toggle:hover {
  opacity: 1;
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(1.08);
}
.audio-toggle.playing {
  opacity: .8;
  border-color: rgba(0,225,255,.2);
  color: var(--accent);
}
.audio-toggle.playing i {
  animation: audioWave 1.5s ease-in-out infinite;
}
@keyframes audioWave {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Audio visualizer bars */
.audio-vis {
  position: fixed;
  bottom: 66px;
  left: 16px;
  z-index: 99;
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 16px;
  opacity: 0;
  transition: opacity .4s;
  pointer-events: none;
}
.audio-vis.active { opacity: .4; }
.audio-vis-bar {
  width: 3px;
  border-radius: 1px;
  background: var(--accent);
  transition: height .15s ease;
}

body.zen-mode .audio-toggle,
body.zen-mode .audio-vis { display: none !important; }

@media(max-width:600px) {
  .audio-toggle { bottom: 14px; left: 12px; width: 32px; height: 32px; font-size: 11px; }
  .audio-vis { bottom: 52px; left: 12px; }
}
@media print { .audio-toggle, .audio-vis { display: none !important; } }


/* ═══════════════════════════════════════════
   4. DIGITAL TWIN STATUS
   ═══════════════════════════════════════════ */

.twin-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.02);
  border: 1px solid var(--border);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: var(--sub);
  letter-spacing: .5px;
  margin-top: 6px;
  transition: all .4s;
  cursor: default;
  overflow: hidden;
}
.twin-status:hover {
  border-color: rgba(0,225,255,.1);
  background: rgba(255,255,255,.03);
}
.twin-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background .5s;
}
.twin-dot.online { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.4); animation: livePulse 2s ease-in-out infinite; }
.twin-dot.busy { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,.3); }
.twin-dot.away { background: #6b7280; }
.twin-dot.sleeping { background: #3b82f6; box-shadow: 0 0 6px rgba(59,130,246,.2); animation: sleepPulse 4s ease-in-out infinite; }
@keyframes sleepPulse {
  0%, 100% { opacity: .3; }
  50% { opacity: .8; }
}
.twin-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.twin-activity {
  color: var(--text);
  font-weight: 500;
}
.twin-time {
  color: var(--sub);
  opacity: .5;
  font-size: 7px;
  flex-shrink: 0;
}
.twin-typing {
  display: inline-flex;
  gap: 2px;
  margin-left: 4px;
}
.twin-typing-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--accent);
  animation: typeDot 1.4s ease-in-out infinite;
}
.twin-typing-dot:nth-child(2) { animation-delay: .2s; }
.twin-typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot {
  0%, 100% { opacity: .2; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

@media print { .twin-status { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: CYBERPUNK THEME OVERRIDE
  // ═══════════════════════════════════════════════════

  function initCyberpunk() {
    // Flash overlay
    const flash = document.createElement('div');
    flash.className = 'cp-flash';
    flash.id = 'cpFlash';
    document.body.appendChild(flash);

    // Top indicator
    const indicator = document.createElement('div');
    indicator.className = 'cp-indicator';
    indicator.textContent = '◆ CYBERPUNK MODE ◆';
    document.body.appendChild(indicator);

    // Restore from localStorage
    if (localStorage.getItem('cyberpunkMode') === '1') {
      document.body.classList.add('cyberpunk-mode');
    }

    // Toggle function
    window._toggleCyberpunk = function(animate) {
      const active = document.body.classList.toggle('cyberpunk-mode');
      localStorage.setItem('cyberpunkMode', active ? '1' : '0');

      if (animate && !RM) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 700);
      }

      // Console log
      const consoleEl = document.getElementById('liveConsole');
      if (consoleEl) {
        consoleEl.textContent = active
          ? '🌆 Cyberpunk mode engaged — welcome to Night City'
          : '☀️ Cyberpunk mode deactivated — back to default';
      }

      if (window.VDna) window.VDna.addXp(active ? 10 : 0);

      return active;
    };

    // Terminal commands
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

    // Lightweight SunCalc — just sunrise/sunset for Cairo
    const sun = calcSunTimes(new Date(), CAIRO_LAT, CAIRO_LNG);
    const now = new Date();
    const cairoNow = getCairoDate(now);
    const phase = getSunPhase(cairoNow, sun);

    // Create ambient glow layer
    const glow = document.createElement('div');
    glow.className = 'bio-glow';
    glow.id = 'bioGlow';
    document.body.appendChild(glow);

    // Phase-based palette
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

    // Adjust existing animation speeds based on phase
    document.documentElement.style.setProperty('--bio-speed', palette.speed);

    // Fade in after page load
    setTimeout(() => glow.classList.add('active'), 2000);

    // Store phase for other systems
    window._bioPhase = phase;
    window._bioSpeed = palette.speed;
  }

  // Minimal SunCalc implementation (no dependencies)
  function calcSunTimes(date, lat, lng) {
    const rad = Math.PI / 180;
    const dayMs = 86400000;
    const J1970 = 2440588;
    const J2000 = 2451545;

    function toJulian(d) { return d.valueOf() / dayMs - 0.5 + J1970; }
    function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
    function toDays(d) { return toJulian(d) - J2000; }

    const e = rad * 23.4397; // obliquity

    function rightAscension(l, b) { return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }
    function declination(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclipticLongitude(M) {
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2*M) + 0.0003 * Math.sin(3*M));
      const P = rad * 102.9372;
      return M + C + P + Math.PI;
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
      const a = approxTransit(w, lw, n);
      return solarTransitJ(a, M, L);
    }

    const lw = rad * -lng;
    const phi = rad * lat;
    const d = toDays(date);
    const n = julianCycle(d, lw);
    const ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L, 0);

    const h0 = rad * -0.833; // sunrise angle
    const Jset = getSetJ(h0, lw, phi, dec, n, M, L);
    const Jnoon = solarTransitJ(ds, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);

    return {
      sunrise: fromJulian(Jrise),
      sunset: fromJulian(Jset),
      noon: fromJulian(Jnoon),
    };
  }

  function getCairoDate(d) {
    const str = d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    return new Date(str);
  }

  function getSunPhase(now, sun) {
    const h = now.getHours();
    const m = now.getMinutes();
    const mins = h * 60 + m;

    const riseH = sun.sunrise.getHours();
    const riseM = sun.sunrise.getMinutes();
    const riseMins = riseH * 60 + riseM;

    const setH = sun.sunset.getHours();
    const setM = sun.sunset.getMinutes();
    const setMins = setH * 60 + setM;

    if (mins < riseMins - 30) return 'night';
    if (mins < riseMins + 30) return 'dawn';
    if (mins < 1200) return 'morning'; // before noon
    if (mins < riseMins + (setMins - riseMins) * 0.6) return 'midday';
    if (mins < setMins - 60) return 'afternoon';
    if (mins < setMins + 30) return 'dusk';
    if (mins < setMins + 120) return 'evening';
    return 'night';
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: AMBIENT AUDIO SCAPE
  // ═══════════════════════════════════════════════════

  function initAmbientAudio() {
    let audioCtx = null;
    let playing = false;
    let nodes = {};
    let visInterval = null;

    // Create toggle button
    const btn = document.createElement('button');
    btn.className = 'audio-toggle';
    btn.id = 'audioToggle';
    btn.setAttribute('aria-label', 'Toggle ambient audio');
    btn.title = 'Ambient Audio (M)';
    btn.innerHTML = '<i class="fa-solid fa-volume-xmark" id="audioIcon"></i>';
    document.body.appendChild(btn);

    // Visualizer bars
    const vis = document.createElement('div');
    vis.className = 'audio-vis';
    vis.id = 'audioVis';
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'audio-vis-bar';
      bar.style.height = '2px';
      vis.appendChild(bar);
    }
    document.body.appendChild(vis);

    function createAudioEngine() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const master = audioCtx.createGain();
      master.gain.value = 0;
      master.connect(audioCtx.destination);

      // Determine mood from bio-rhythm phase
      const phase = window._bioPhase || 'night';
      const MOODS = {
        dawn:      { baseFreq: 220, padFreqs: [220, 277, 330], lfoRate: 0.05, filterFreq: 800, vol: 0.08 },
        morning:   { baseFreq: 261, padFreqs: [261, 329, 392], lfoRate: 0.04, filterFreq: 1200, vol: 0.06 },
        midday:    { baseFreq: 293, padFreqs: [293, 369, 440], lfoRate: 0.03, filterFreq: 1500, vol: 0.05 },
        afternoon: { baseFreq: 261, padFreqs: [261, 311, 392], lfoRate: 0.04, filterFreq: 1000, vol: 0.06 },
        dusk:      { baseFreq: 196, padFreqs: [196, 246, 293], lfoRate: 0.06, filterFreq: 700, vol: 0.07 },
        evening:   { baseFreq: 174, padFreqs: [174, 220, 261], lfoRate: 0.07, filterFreq: 600, vol: 0.08 },
        night:     { baseFreq: 146, padFreqs: [146, 174, 220], lfoRate: 0.08, filterFreq: 500, vol: 0.09 },
      };
      const mood = MOODS[phase] || MOODS.night;

      // Low-pass filter for warmth
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = mood.filterFreq;
      filter.Q.value = 1;
      filter.connect(master);

      // Pad oscillators (3 detuned sines for warm chord)
      const oscs = mood.padFreqs.map((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (i - 1) * 5; // slight detuning

        const gain = audioCtx.createGain();
        gain.gain.value = mood.vol / 3;

        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        return { osc, gain };
      });

      // LFO for gentle movement
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = mood.lfoRate;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 8; // subtle pitch wobble
      lfo.connect(lfoGain);
      oscs.forEach(o => lfoGain.connect(o.osc.frequency));
      lfo.start();

      // Sub bass drone
      const sub = audioCtx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = mood.baseFreq / 2;
      const subGain = audioCtx.createGain();
      subGain.gain.value = mood.vol * 0.4;
      sub.connect(subGain);
      subGain.connect(master);
      sub.start();

      // Noise generator for texture
      const noiseLen = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) noiseData[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.value = 0.004;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 400;
      noiseFilter.Q.value = 0.5;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();

      nodes = { master, filter, oscs, lfo, lfoGain, sub, subGain, noise, noiseGain, noiseFilter, mood };
    }

    function fadeIn() {
      if (!nodes.master) return;
      nodes.master.gain.cancelScheduledValues(audioCtx.currentTime);
      nodes.master.gain.setValueAtTime(nodes.master.gain.value, audioCtx.currentTime);
      nodes.master.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 2);
    }

    function fadeOut(cb) {
      if (!nodes.master) { if (cb) cb(); return; }
      nodes.master.gain.cancelScheduledValues(audioCtx.currentTime);
      nodes.master.gain.setValueAtTime(nodes.master.gain.value, audioCtx.currentTime);
      nodes.master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
      if (cb) setTimeout(cb, 1100);
    }

    function startVis() {
      vis.classList.add('active');
      const bars = vis.querySelectorAll('.audio-vis-bar');
      visInterval = setInterval(() => {
        bars.forEach(bar => {
          const h = 2 + Math.random() * 12;
          bar.style.height = h + 'px';
        });
      }, 200);
    }

    function stopVis() {
      vis.classList.remove('active');
      if (visInterval) { clearInterval(visInterval); visInterval = null; }
      vis.querySelectorAll('.audio-vis-bar').forEach(b => b.style.height = '2px');
    }

    // Scroll reactivity — adjust filter based on scroll position
    let scrollRAF = null;
    function onScroll() {
      if (!playing || !nodes.filter) return;
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(() => {
        const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const freq = nodes.mood.filterFreq + pct * 600; // open filter as you scroll
        nodes.filter.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.3);
        scrollRAF = null;
      });
    }

    function toggleAudio() {
      if (playing) {
        // Stop
        fadeOut(() => {
          if (audioCtx) { audioCtx.close(); audioCtx = null; nodes = {}; }
        });
        playing = false;
        btn.classList.remove('playing');
        document.getElementById('audioIcon').className = 'fa-solid fa-volume-xmark';
        stopVis();
        window.removeEventListener('scroll', onScroll);
      } else {
        // Start
        createAudioEngine();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        fadeIn();
        playing = true;
        btn.classList.add('playing');
        document.getElementById('audioIcon').className = 'fa-solid fa-volume-high';
        startVis();
        window.addEventListener('scroll', onScroll, { passive: true });

        if (window.VDna) window.VDna.addXp(3);
      }
    }

    btn.addEventListener('click', toggleAudio);

    // Keyboard: M
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleAudio();
    });

    // Terminal command
    if (window.TermCmds) {
      window.TermCmds.audio = () => {
        toggleAudio();
        return playing
          ? '<span class="term-green">🎵 Ambient audio scape activated — scroll to modulate</span>'
          : '<span class="term-gray">🔇 Ambient audio stopped</span>';
      };
      window.TermCmds.music = window.TermCmds.audio;
    }

    // Auto-stop when page hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && playing) {
        fadeOut();
      } else if (!document.hidden && playing && nodes.master) {
        fadeIn();
      }
    });
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE DIGITAL TWIN STATUS
  // ═══════════════════════════════════════════════════

  function initDigitalTwin() {
    // Build schedule-based status for Cairo timezone
    const now = new Date();
    const cairoH = parseInt(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }));
    const cairoM = parseInt(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', minute: 'numeric' }));
    const dayName = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' });
    const isWeekend = dayName === 'Friday' || dayName === 'Saturday';
    const mins = cairoH * 60 + cairoM;

    const status = getTwinStatus(mins, isWeekend, dayName);

    // Find insertion point — after role tags
    const rtags = document.getElementById('rtags');
    if (!rtags) return;

    const el = document.createElement('div');
    el.className = 'twin-status';
    el.id = 'twinStatus';
    el.innerHTML = `
      <span class="twin-dot ${status.state}"></span>
      <span class="twin-text">
        <span class="twin-activity">${status.activity}</span>
        ${status.typing ? '<span class="twin-typing"><span class="twin-typing-dot"></span><span class="twin-typing-dot"></span><span class="twin-typing-dot"></span></span>' : ''}
      </span>
      <span class="twin-time">${status.timeLabel}</span>
    `;
    rtags.insertAdjacentElement('afterend', el);

    // Update every 5 minutes
    setInterval(() => {
      const n = new Date();
      const ch = parseInt(n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }));
      const cm = parseInt(n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', minute: 'numeric' }));
      const dn = n.toLocaleString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' });
      const we = dn === 'Friday' || dn === 'Saturday';
      const s = getTwinStatus(ch * 60 + cm, we, dn);
      const dot = el.querySelector('.twin-dot');
      const act = el.querySelector('.twin-activity');
      const time = el.querySelector('.twin-time');
      if (dot) dot.className = `twin-dot ${s.state}`;
      if (act) act.textContent = s.activity;
      if (time) time.textContent = s.timeLabel;
    }, 300000);
  }

  function getTwinStatus(mins, isWeekend, dayName) {
    // Cairo time label
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const timeLabel = `${h12}:${String(m).padStart(2, '0')} ${ampm} Cairo`;

    // Weekend schedule
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

    // Workday schedule
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
  // WIRE UP SHORTCUTS
  // ═══════════════════════════════════════════════════

  function wireShortcuts() {
    const panel = document.querySelector('.shortcut-panel');
    if (!panel) return;
    const closeDiv = panel.querySelector('.sc-close');
    if (!closeDiv) return;

    [
      { key: 'M', desc: 'Toggle ambient audio' },
    ].forEach(sc => {
      if (panel.querySelector(`[data-p5-key="${sc.key}"]`)) return;
      const row = document.createElement('div');
      row.className = 'sc-row';
      row.dataset.p5Key = sc.key;
      row.innerHTML = `<span class="sc-key">${sc.key}</span><span class="sc-desc">${sc.desc}</span>`;
      panel.insertBefore(row, closeDiv);
    });
  }


  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initBioRhythm();     // Must go first — sets phase for audio mood
    initCyberpunk();
    initAmbientAudio();
    initDigitalTwin();
    wireShortcuts();

    console.log(
      '%c✦ Phase 5 Loaded %c Cyberpunk · Bio-Rhythm · Audio · Digital Twin',
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
