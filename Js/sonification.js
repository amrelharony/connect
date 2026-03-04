// sonification.js — Algorithmic Data Sonification Engine
// Pure Web Audio API synthesis. Zero MP3s. Every sound is math.
// Transforms game state, live data, and user behavior into generative music.

(function Sonification() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // CORE ENGINE
  // ═══════════════════════════════════════════════════

  let ctx = null, master = null;
  let activeModule = null;
  const MAX_VOICES = 12;
  let voiceCount = 0;

  function getCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const sa = window._spatialAudio;
    if (sa) {
      ctx = sa.getCtx();
      master = sa.getMaster();
    }
    if (!ctx) return null;
    if (!master) { master = ctx.createGain(); master.connect(ctx.destination); }
    return ctx;
  }

  function ok() {
    if (!window._spatialAudio || !window._spatialAudio.isEnabled()) return false;
    if (document.body.classList.contains('perf-critical')) return false;
    return !!getCtx();
  }

  function constrained() {
    return document.body.classList.contains('perf-serious');
  }

  function maxVoices() { return constrained() ? 4 : MAX_VOICES; }

  // ── Scales ──
  const SCALES = {
    majorPentatonic: [0, 2, 4, 7, 9],
    major:          [0, 2, 4, 5, 7, 9, 11],
    minor:          [0, 2, 3, 5, 7, 8, 10],
    diminished:     [0, 2, 3, 5, 6, 8, 9, 11],
    chromatic:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    mixolydian:     [0, 2, 4, 5, 7, 9, 10],
    dorian:         [0, 2, 3, 5, 7, 9, 10],
    lydian:         [0, 2, 4, 6, 7, 9, 11],
  };

  function mtof(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function noteInScale(scale, rootMidi, degree) {
    const s = scale.length;
    const octave = Math.floor(degree / s);
    const idx = ((degree % s) + s) % s;
    return mtof(rootMidi + scale[idx] + octave * 12);
  }

  // ── Synthesis Primitives ──

  function note(freq, type, dur, vel, pan) {
    const c = getCtx();
    if (!c || voiceCount >= maxVoices()) return;
    vel = vel || 0.08;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vel, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    if (pan != null) {
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), c.currentTime);
      osc.connect(gain).connect(p).connect(master);
    } else {
      osc.connect(gain).connect(master);
    }
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
    voiceCount++;
    osc.onended = () => { voiceCount--; };
  }

  function chord(freqs, type, dur, vel) {
    freqs.forEach(f => note(f, type, dur, (vel || 0.06) / freqs.length));
  }

  function noise(dur, filterFreq, vol, filterType) {
    const c = getCtx();
    if (!c || voiceCount >= maxVoices()) return;
    const len = Math.max(0.01, dur);
    const bufSize = Math.ceil(c.sampleRate * len);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.05, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + len);
    if (filterFreq) {
      const filt = c.createBiquadFilter();
      filt.type = filterType || 'bandpass';
      filt.frequency.setValueAtTime(filterFreq, c.currentTime);
      filt.Q.setValueAtTime(2, c.currentTime);
      src.connect(filt).connect(gain).connect(master);
    } else {
      src.connect(gain).connect(master);
    }
    src.start(c.currentTime);
    voiceCount++;
    src.onended = () => { voiceCount--; };
  }

  function sweep(startFreq, endFreq, dur, type, vel) {
    const c = getCtx();
    if (!c || voiceCount >= maxVoices()) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(startFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), c.currentTime + dur);
    gain.gain.setValueAtTime(vel || 0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain).connect(master);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
    voiceCount++;
    osc.onended = () => { voiceCount--; };
  }

  // Persistent drone that can be stopped/updated
  function drone(freq, type, vol) {
    const c = getCtx();
    if (!c) return null;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(vol || 0.04, c.currentTime + 0.5);
    osc.connect(gain).connect(master);
    osc.start(c.currentTime);
    voiceCount++;
    return {
      setFreq(f) { osc.frequency.linearRampToValueAtTime(f, c.currentTime + 0.1); },
      setVol(v) { gain.gain.linearRampToValueAtTime(Math.max(0.0001, v), c.currentTime + 0.1); },
      stop(fadeTime) {
        const ft = fadeTime || 0.5;
        gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + ft);
        osc.stop(c.currentTime + ft + 0.05);
        voiceCount = Math.max(0, voiceCount - 1);
      }
    };
  }

  // ── Tempo Clock ──
  let clockInterval = null, clockBPM = 120, beatCallbacks = [];

  function setBPM(bpm) {
    clockBPM = Math.max(30, Math.min(300, bpm));
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = setInterval(tick, 60000 / clockBPM);
    }
  }

  function startClock(bpm) {
    clockBPM = bpm || 120;
    beatCallbacks = [];
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(tick, 60000 / clockBPM);
  }

  function stopClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    beatCallbacks = [];
  }

  function onBeat(fn) { beatCallbacks.push(fn); }

  function tick() {
    if (!ok()) return;
    for (const fn of beatCallbacks) { try { fn(); } catch(e) {} }
  }

  // ── Utility ──
  function stopModule(mod) {
    if (activeModule === mod) { activeModule = null; stopClock(); }
  }

  // ═══════════════════════════════════════════════════
  // MODULE 1: SPRINT STACKER
  // ═══════════════════════════════════════════════════

  let stackerDrone = null, stackerBeatId = 0;

  function stackerStart(level) {
    if (!ok()) return;
    if (stackerDrone) { try { stackerDrone.stop(0.1); } catch(e) {} stackerDrone = null; }
    activeModule = 'stacker';
    stackerDrone = drone(55, 'sine', 0.03);
    startClock(60 + level * 15);
    const id = ++stackerBeatId;
    onBeat(() => {
      if (stackerBeatId !== id || activeModule !== 'stacker') return;
      sweep(60, 30, 0.08, 'sine', 0.06);
    });
  }

  function stackerTick(cleared, level, maxHeight, totalRows) {
    if (!ok()) return;
    const ratio = maxHeight / totalRows;
    if (stackerDrone) {
      stackerDrone.setFreq(55 + ratio * 30);
      stackerDrone.setVol(0.02 + ratio * 0.04);
    }
    setBPM(60 + level * 15);

    if (cleared === 0) {
      noise(0.03, 4000, 0.04);
    } else if (cleared === 1) {
      chord([mtof(60), mtof(64), mtof(67)], 'triangle', 0.4, 0.08);
    } else if (cleared === 2) {
      chord([mtof(60), mtof(65), mtof(67)], 'triangle', 0.5, 0.09);
      note(mtof(64), 'sine', 0.3, 0.05);
    } else if (cleared === 3) {
      chord([mtof(60), mtof(64), mtof(67), mtof(71)], 'triangle', 0.6, 0.1);
    } else {
      chord([mtof(48), mtof(60), mtof(64), mtof(67), mtof(72)], 'triangle', 1.2, 0.12);
      sweep(200, 8000, 0.8, 'sine', 0.04);
      setTimeout(() => {
        if (ok()) chord([mtof(55), mtof(67), mtof(72), mtof(76)], 'sine', 1.0, 0.06);
      }, 300);
    }
  }

  function stackerEnd() {
    if (stackerDrone) { stackerDrone.stop(1.0); stackerDrone = null; }
    stackerBeatId++;
    stopClock();
    if (!ok()) return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => { if (ok()) note(mtof(72 - i * 2), 'sawtooth', 0.3, 0.04); }, i * 80);
    }
    stopModule('stacker');
  }

  // ═══════════════════════════════════════════════════
  // MODULE 2: FINTECH TRADER
  // ═══════════════════════════════════════════════════

  let traderDrone = null, traderRoot = 48;

  function traderStart() {
    if (!ok()) return;
    if (traderDrone) { try { traderDrone.stop(0.1); } catch(e) {} traderDrone = null; }
    activeModule = 'trader';
    traderRoot = 48;
    traderDrone = drone(mtof(traderRoot), 'triangle', 0.025);
  }

  function traderCollect(type, portfolio, streak, level) {
    if (!ok()) return;
    const newRoot = 48 + Math.min(12, Math.floor(portfolio / 2000));
    if (newRoot !== traderRoot) {
      traderRoot = newRoot;
      if (traderDrone) traderDrone.setFreq(mtof(traderRoot));
    }

    if (type === 'bomb') {
      sweep(mtof(traderRoot + 24), mtof(traderRoot), 0.3, 'sawtooth', 0.1);
      noise(0.15, 800, 0.08, 'lowpass');
    } else {
      noise(0.03, 8000, 0.04);
      const degree = (streak % 5);
      const freq = noteInScale(SCALES.majorPentatonic, traderRoot + 12, degree);
      note(freq, 'sine', 0.15, 0.06);
      if (type === 'gem' || type === 'rocket') {
        note(freq * 1.5, 'triangle', 0.2, 0.04);
      }
    }

    if (streak === 5) {
      chord([mtof(traderRoot + 12), mtof(traderRoot + 19), mtof(traderRoot + 24)], 'sine', 0.8, 0.05);
    }
  }

  function traderEnd(portfolio) {
    if (traderDrone) { traderDrone.stop(2.0); traderDrone = null; }
    if (!ok()) return;
    sweep(mtof(traderRoot + 12), mtof(traderRoot - 12), 1.5, 'sine', 0.05);
    stopModule('trader');
  }

  // ═══════════════════════════════════════════════════
  // MODULE 3: DATA MESH ROUTER
  // ═══════════════════════════════════════════════════

  let routerVoices = 0, routerRoot = 60, routerArpId = 0;

  const DOMAIN_TIMBRE = {
    ANALYTICS: 'sine',
    RISK:      'sawtooth',
    CUSTOMER:  'triangle',
    PAYMENTS:  'square',
  };

  function routerStart() {
    if (!ok()) return;
    activeModule = 'router';
    routerVoices = 1;
    routerRoot = 60;
    const id = ++routerArpId;
    startClock(140);
    let step = 0;
    onBeat(() => {
      if (routerArpId !== id || activeModule !== 'router' || !ok()) return;
      for (let v = 0; v < Math.min(routerVoices, maxVoices() - 2); v++) {
        const deg = (step + v * 2) % 7;
        const freq = noteInScale(SCALES.major, routerRoot, deg);
        note(freq, 'sine', 0.12, 0.03 / (v + 1));
      }
      step++;
    });
  }

  function routerRotate() {
    if (!ok()) return;
    noise(0.01, 2000, 0.03);
  }

  function routerConnect(domainName, routesComplete) {
    if (!ok()) return;
    routerVoices = Math.min(6, routesComplete + 1);
    const timbre = DOMAIN_TIMBRE[domainName] || 'sine';
    const freqs = [];
    for (let i = 0; i < 5; i++) {
      freqs.push(noteInScale(SCALES.majorPentatonic, routerRoot, i));
    }
    freqs.forEach((f, i) => {
      setTimeout(() => { if (ok()) note(f, timbre, 0.2, 0.05); }, i * 60);
    });
    note(mtof(routerRoot + 12), 'sine', 0.5, 0.04);
  }

  function routerEnd() {
    routerArpId++;
    stopClock();
    if (!ok()) return;
    sweep(mtof(routerRoot + 12), mtof(routerRoot - 12), 1.0, 'sine', 0.04);
    stopModule('router');
  }

  // ═══════════════════════════════════════════════════
  // MODULE 4: BILINGUAL SWIPE
  // ═══════════════════════════════════════════════════

  function swipeCard() {
    if (!ok()) return;
    note(400, 'sine', 0.2, 0.05, -0.9);
    setTimeout(() => { if (ok()) note(500, 'sine', 0.2, 0.05, 0.9); }, 250);
  }

  function swipeAnswer(correct, streak) {
    if (!ok()) return;
    if (correct) {
      note(400, 'sine', 0.5, 0.06, 0);
      note(500, 'sine', 0.5, 0.06, 0);
      if (streak === 3) sweep(500, 800, 0.3, 'triangle', 0.04);
      if (streak === 5) {
        chord([mtof(60), mtof(64), mtof(67), mtof(72)], 'triangle', 0.6, 0.06);
      }
    } else {
      note(400, 'sawtooth', 0.3, 0.05, 0);
      note(568, 'sawtooth', 0.3, 0.05, 0);
    }
  }

  function swipeTick(timeLeft) {
    if (!ok() || constrained()) return;
    const pct = timeLeft / 100;
    if (pct < 0.5 || timeLeft % Math.max(1, Math.floor(pct * 4)) === 0) {
      noise(0.02, 3000 + (1 - pct) * 3000, 0.03);
    }
  }

  // ═══════════════════════════════════════════════════
  // MODULE 5: SCOPE DEFENDER
  // ═══════════════════════════════════════════════════

  let defenderDrone = null, defenderBeatId = 0, defenderBPM = 140;

  function defenderStart() {
    if (!ok()) return;
    if (defenderDrone) { try { defenderDrone.stop(0.1); } catch(e) {} defenderDrone = null; }
    activeModule = 'defender';
    defenderBPM = 140;
    defenderDrone = drone(40, 'sine', 0.01);
    const id = ++defenderBeatId;
    startClock(defenderBPM);
    let step = 0;
    onBeat(() => {
      if (defenderBeatId !== id || activeModule !== 'defender' || !ok()) return;
      if (step % 4 === 0) noise(0.04, 100, 0.04, 'lowpass');
      if (step % 2 === 0) noise(0.02, 6000, 0.02);
      step++;
    });
  }

  function defenderShoot() {
    if (!ok()) return;
    sweep(2000, 800, 0.05, 'sine', 0.04);
  }

  function defenderHit(enemyType) {
    if (!ok()) return;
    noise(0.03, 2000, 0.04);
    const pitchMap = { '🐛': 72, '📋': 65, '🔥': 58, '💣': 48 };
    const midi = pitchMap[enemyType] || 65;
    note(mtof(midi), 'square', 0.08, 0.05);
  }

  function defenderLifeLost(lives) {
    if (!ok()) return;
    sweep(120, 40, 0.4, 'sine', 0.08);
    noise(0.2, 400, 0.06, 'lowpass');
  }

  function defenderPowerUp(type, activePU) {
    if (!ok()) return;
    if (type === 'speed' || type === '☕') {
      defenderBPM = 280;
      setBPM(280);
      note(mtof(72), 'triangle', 0.15, 0.05);
      note(mtof(76), 'triangle', 0.15, 0.04);
    } else if (type === 'shield' || type === '🛡️') {
      chord([mtof(60), mtof(67), mtof(72)], 'sine', 1.0, 0.04);
    } else if (type === 'triple' || type === '📦') {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => { if (ok()) note(mtof(65 + i * 4), 'square', 0.06, 0.03); }, i * 40);
      }
    }
  }

  function defenderWave(wave) {
    if (!ok()) return;
    if (defenderBPM > 140) { defenderBPM = 140; setBPM(140); }
    note(mtof(60), 'triangle', 0.3, 0.06);
    setTimeout(() => { if (ok()) note(mtof(67), 'triangle', 0.3, 0.06); }, 120);
    if (defenderDrone) defenderDrone.setVol(0.01);
  }

  function defenderEnd() {
    if (defenderDrone) { defenderDrone.stop(1.5); defenderDrone = null; }
    defenderBeatId++;
    stopClock();
    if (!ok()) return;
    sweep(mtof(60), mtof(36), 1.5, 'sawtooth', 0.05);
    stopModule('defender');
  }

  // ═══════════════════════════════════════════════════
  // MODULE 6: LIVE FINTECH VISUALIZER
  // ═══════════════════════════════════════════════════

  let vizRoot = 60, vizLastT = 0;

  const ASSET_TIMBRE = { BTCUSDT: 'sine', ETHUSDT: 'triangle', SOLUSDT: 'square' };

  function vizTrade(trade) {
    if (!ok()) return;
    const now = performance.now();
    if (now - vizLastT < 80) return;
    vizLastT = now;

    const isBuy = !trade.m;
    const qty = parseFloat(trade.q) || 0.01;
    const price = parseFloat(trade.p) || 1;
    const val = qty * price;
    const vel = Math.min(0.12, Math.max(0.01, Math.log10(val + 1) / 6));
    const dur = Math.min(2.0, Math.max(0.1, Math.log10(val + 1) * 0.15));

    const scale = isBuy ? SCALES.majorPentatonic : SCALES.minor;
    const degree = Math.floor(Math.random() * scale.length) + (isBuy ? 0 : -2);
    const freq = noteInScale(scale, vizRoot, degree);
    const timbre = ASSET_TIMBRE[trade.s] || 'sine';

    note(freq, timbre, dur, vel);
  }

  // ═══════════════════════════════════════════════════
  // MODULE 7: GUESTBOOK
  // ═══════════════════════════════════════════════════

  let gbDrones = [];

  const EMOJI_HARMONIC = {
    '🔥': -5, '🚀': -3, '💪': -7,
    '⭐': 7, '✨': 12, '🎉': 9,
    '👋': 0, '🤝': 2, '👏': 4,
    '❤️': 0.1,
  };

  function guestbookOpen(entries) {
    if (!ok() || !entries) return;
    gbDrones.forEach(d => { try { d.stop(0.3); } catch(e) {} });
    gbDrones = [];
    const count = entries.length || 0;
    const root = 48;
    const chordTones = [root, root + 4, root + 7];
    if (count > 10) chordTones.push(root + 11);
    if (count > 30) chordTones.push(root + 14);
    if (count > 50) { chordTones.push(root + 17); chordTones.push(root + 21); }

    const emojiCounts = {};
    entries.forEach(e => { if (e.emoji) emojiCounts[e.emoji] = (emojiCounts[e.emoji] || 0) + 1; });
    let totalShift = 0, emojiTotal = 0;
    for (const [emoji, cnt] of Object.entries(emojiCounts)) {
      const shift = EMOJI_HARMONIC[emoji] || 0;
      totalShift += shift * cnt;
      emojiTotal += cnt;
    }
    const avgShift = emojiTotal > 0 ? totalShift / emojiTotal : 0;
    const adjustedRoot = root + Math.round(avgShift * 0.3);

    gbDrones = chordTones.map((midi, i) => {
      const adjusted = midi + (adjustedRoot - root);
      return drone(mtof(adjusted), 'triangle', 0.015 / (i + 1));
    });
  }

  function guestbookSign(emoji) {
    if (!ok()) return;
    const root = 48;
    const tones = [root, root + 4, root + 7, root + 12];
    tones.forEach((midi, i) => {
      setTimeout(() => {
        if (ok()) note(mtof(midi), 'sine', 0.3, 0.05);
      }, i * 80);
    });
  }

  function guestbookClose() {
    gbDrones.forEach(d => { try { d.stop(2.0); } catch(e) {} });
    gbDrones = [];
  }

  // ═══════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════

  function status() {
    return {
      active: activeModule,
      voices: voiceCount,
      bpm: clockBPM,
      enabled: !!(window._spatialAudio && window._spatialAudio.isEnabled()),
    };
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  let activeScale = SCALES.majorPentatonic;
  let activeRoot = 48;

  window._sonoSetMood = function(mood) {
    switch (mood) {
      case 'warm':      activeScale = SCALES.majorPentatonic; activeRoot = 48; break;
      case 'focused':   activeScale = SCALES.major;           activeRoot = 50; break;
      case 'calm':      activeScale = SCALES.majorPentatonic; activeRoot = 45; break;
      case 'melancholy': activeScale = SCALES.minor;          activeRoot = 46; break;
      case 'serene':    activeScale = SCALES.major;           activeRoot = 52; break;
      case 'intense':   activeScale = SCALES.diminished;      activeRoot = 44; break;
      case 'surprised': activeScale = SCALES.chromatic;       activeRoot = 48; break;
      case 'playful':   activeScale = SCALES.mixolydian;     activeRoot = 50; break;
      case 'determined':activeScale = SCALES.dorian;         activeRoot = 46; break;
      case 'curious':   activeScale = SCALES.lydian;         activeRoot = 48; break;
      default:          activeScale = SCALES.majorPentatonic; activeRoot = 48; break;
    }
  };

  window._sono = {
    stackerStart, stackerTick, stackerEnd,
    traderStart, traderCollect, traderEnd,
    routerStart: routerStart, routerRotate, routerConnect, routerEnd,
    swipeCard, swipeAnswer, swipeTick,
    defenderStart: defenderStart, defenderShoot, defenderHit,
    defenderLifeLost, defenderPowerUp, defenderWave, defenderEnd,
    vizTrade,
    guestbookOpen, guestbookSign, guestbookClose,
    status,
  };

  var _initMood = document.body && document.body.getAttribute('data-mood');
  if (_initMood) window._sonoSetMood(_initMood);
  console.log('%c🎵 Sonification%c Web Audio synthesis ready','background:#6366f1;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');
})();
