// emotion-engine.js — Dual-source Mood Adaptation Engine
// Source 1: Weather (default) — maps WMO codes to site mood
// Source 2: Face emotion (when spatial mode active on desktop) — overrides weather
// All face processing is local via Web Worker. Nothing leaves the device.

(function EmotionEngine() {
  'use strict';

  const SMOOTH_ALPHA = 0.15;
  const DETECT_INTERVAL = 150;
  const HYSTERESIS_FRAMES = 6;

  const MOOD_COLORS = {
    warm:       { accent: '#fbbf24', glow: 'rgba(251,191,36,.35)',  glowS: 'rgba(251,191,36,.18)' },
    focused:    { accent: '#6366f1', glow: 'rgba(99,102,241,.35)',  glowS: 'rgba(99,102,241,.18)' },
    surprised:  { accent: '#a855f7', glow: 'rgba(168,85,247,.35)',  glowS: 'rgba(168,85,247,.18)' },
    calm:       { accent: '#2dd4bf', glow: 'rgba(45,212,191,.35)',  glowS: 'rgba(45,212,191,.18)' },
    melancholy: { accent: '#60a5fa', glow: 'rgba(96,165,250,.35)', glowS: 'rgba(96,165,250,.18)' },
    serene:     { accent: '#94a3b8', glow: 'rgba(148,163,184,.35)', glowS: 'rgba(148,163,184,.18)' },
    intense:    { accent: '#a855f7', glow: 'rgba(168,85,247,.45)',  glowS: 'rgba(168,85,247,.22)' },
    neutral:    null
  };

  const MOOD_LABELS = {
    warm: '☀️ warm', focused: '🎯 focused', surprised: '😲 surprised',
    calm: '🍃 calm', melancholy: '🌧️ melancholy', serene: '❄️ serene',
    intense: '⛈️ intense', neutral: '• neutral'
  };

  const EMOTION_TO_MOOD = {
    happy: 'warm', focused: 'focused', surprised: 'surprised',
    calm: 'calm', neutral: null
  };

  const FLUID_PARAMS = {
    warm:       { hue: 40,  intensity: 1.2, curl: 28 },
    focused:    { hue: 240, intensity: 0.8, curl: 18 },
    surprised:  { hue: 280, intensity: 1.4, curl: 35 },
    calm:       { hue: 170, intensity: 0.9, curl: 15 },
    melancholy: { hue: 220, intensity: 0.7, curl: 20 },
    serene:     { hue: 210, intensity: 0.6, curl: 12 },
    intense:    { hue: 270, intensity: 1.5, curl: 45 },
    neutral:    null
  };

  let currentMood = 'neutral';
  let currentSource = 'weather';
  let currentConfidence = 0;

  let worker = null;
  let workerReady = false;
  let faceActive = false;
  let faceVideo = null;
  let detectTimer = null;
  let styleEl = null;
  let indicatorEl = null;

  let smoothScores = { happy: 0, focused: 0, surprised: 0, calm: 0 };
  let stableEmotion = 'neutral';
  let stableCount = 0;

  // ═══════════════════════════════════════════════════
  // WEATHER → MOOD MAPPING
  // ═══════════════════════════════════════════════════
  function weatherCodeToMood(code) {
    code = Number(code);
    if (code <= 1) return 'warm';
    if (code <= 3) return 'neutral';
    if (code <= 48) return 'calm';
    if (code <= 67) return 'melancholy';
    if (code <= 77) return 'serene';
    return 'intense';
  }

  function initWeatherMood() {
    try {
      var raw = localStorage.getItem('cairoWeather');
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.data && parsed.data.code !== undefined) {
        setMood(weatherCodeToMood(parsed.data.code), 'weather', 1);
      }
    } catch (_) {}
  }

  window._setWeatherMood = function(code) {
    if (currentSource === 'face') return;
    setMood(weatherCodeToMood(code), 'weather', 1);
  };

  // ═══════════════════════════════════════════════════
  // MOOD STATE
  // ═══════════════════════════════════════════════════
  function setMood(mood, source, confidence) {
    if (mood === currentMood && source === currentSource) return;
    var prev = currentMood;
    currentMood = mood;
    currentSource = source;
    currentConfidence = confidence || 0;

    document.dispatchEvent(new CustomEvent('moodchange', {
      detail: { mood: mood, source: source, confidence: confidence, prev: prev }
    }));

    applyMoodCSS(mood);
    applyFluidMood(mood);
    applySonoMood(mood);
    updateIndicator(mood, source);

    document.body.setAttribute('data-mood', mood);
  }

  // ═══════════════════════════════════════════════════
  // CSS ADAPTATION
  // ═══════════════════════════════════════════════════
  function applyMoodCSS(mood) {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'mood-vars';
      document.head.appendChild(styleEl);
    }

    var colors = MOOD_COLORS[mood];
    if (!colors) {
      styleEl.textContent = '';
      return;
    }

    styleEl.textContent =
      ':root{--accent:' + colors.accent + ';--glow:' + colors.glow + ';--glowS:' + colors.glowS + '}' +
      '.light-mode{--accent:' + colors.accent + ';--glow:' + colors.glow + ';--glowS:' + colors.glowS + '}';
  }

  // ═══════════════════════════════════════════════════
  // FLUID HOOK
  // ═══════════════════════════════════════════════════
  function applyFluidMood(mood) {
    var p = FLUID_PARAMS[mood];
    if (!p) return;
    if (window._fluidSetMood) window._fluidSetMood(p.hue, p.intensity, p.curl);
  }

  // ═══════════════════════════════════════════════════
  // SONIFICATION HOOK
  // ═══════════════════════════════════════════════════
  function applySonoMood(mood) {
    if (window._sonoSetMood) window._sonoSetMood(mood);
  }

  // ═══════════════════════════════════════════════════
  // MOOD INDICATOR
  // ═══════════════════════════════════════════════════
  function createIndicator() {
    if (indicatorEl) return;
    indicatorEl = document.createElement('div');
    indicatorEl.className = 'mood-indicator';
    indicatorEl.innerHTML = '<span class="mood-dot"></span><span class="mood-label"></span><span class="mood-src"></span>';
    document.body.appendChild(indicatorEl);
  }

  function updateIndicator(mood, source) {
    createIndicator();
    var dot = indicatorEl.querySelector('.mood-dot');
    var label = indicatorEl.querySelector('.mood-label');
    var src = indicatorEl.querySelector('.mood-src');

    var colors = MOOD_COLORS[mood];
    dot.style.background = colors ? colors.accent : 'rgba(255,255,255,.3)';
    label.textContent = MOOD_LABELS[mood] || mood;
    src.textContent = source === 'face' ? '👁' : '☀';
    indicatorEl.classList.add('show');
  }

  function removeIndicator() {
    if (indicatorEl) { indicatorEl.remove(); indicatorEl = null; }
  }

  // ═══════════════════════════════════════════════════
  // FACE EMOTION (piggybacking on spatial camera)
  // ═══════════════════════════════════════════════════
  function startFace(videoEl) {
    if (faceActive || !videoEl) return;
    faceVideo = videoEl;
    faceActive = true;
    smoothScores = { happy: 0, focused: 0, surprised: 0, calm: 0 };
    stableEmotion = 'neutral';
    stableCount = 0;

    if (!worker) {
      worker = new Worker('Js/emotion-worker.js', { type: 'module' });
      worker.onmessage = onWorkerMsg;
      worker.postMessage({ type: 'init' });
    } else if (workerReady) {
      startDetectLoop();
    }
  }

  function stopFace() {
    faceActive = false;
    faceVideo = null;
    if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }

    initWeatherMood();
  }

  function onWorkerMsg(e) {
    if (e.data.type === 'ready') {
      workerReady = true;
      if (faceActive) startDetectLoop();
    }
    if (e.data.type === 'emotion' && faceActive) {
      processEmotion(e.data.emotion, e.data.confidence);
    }
  }

  function startDetectLoop() {
    if (detectTimer) return;
    detectTimer = setInterval(sendFrame, DETECT_INTERVAL);
  }

  function sendFrame() {
    if (!faceActive || !faceVideo || !workerReady) return;
    if (faceVideo.readyState < 2) return;
    if (document.body.classList.contains('perf-serious') || document.body.classList.contains('perf-critical')) return;

    try {
      var bmp = createImageBitmap(faceVideo, { resizeWidth: 160, resizeHeight: 120 });
      bmp.then(function(bitmap) {
        worker.postMessage({ type: 'detect', bitmap: bitmap, ts: performance.now() }, [bitmap]);
      }).catch(function() {});
    } catch (_) {}
  }

  function processEmotion(emotion, confidence) {
    for (var key in smoothScores) {
      var target = (key === emotion) ? confidence : 0;
      smoothScores[key] += (target - smoothScores[key]) * SMOOTH_ALPHA;
    }

    var best = 'neutral', bestVal = 0.15;
    for (var key in smoothScores) {
      if (smoothScores[key] > bestVal) {
        bestVal = smoothScores[key];
        best = key;
      }
    }

    if (best === stableEmotion) {
      stableCount = Math.min(stableCount + 1, HYSTERESIS_FRAMES + 5);
    } else {
      stableCount--;
      if (stableCount <= 0) {
        stableEmotion = best;
        stableCount = HYSTERESIS_FRAMES;
      }
    }

    var mood = EMOTION_TO_MOOD[stableEmotion];
    if (mood) {
      setMood(mood, 'face', bestVal);
    } else if (currentSource === 'face') {
      initWeatherMood();
    }
  }

  // ═══════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════
  function destroy() {
    stopFace();
    if (worker) { worker.terminate(); worker = null; workerReady = false; }
    if (styleEl) { styleEl.remove(); styleEl = null; }
    removeIndicator();
    document.body.removeAttribute('data-mood');
  }

  // ═══════════════════════════════════════════════════
  // INIT + API
  // ═══════════════════════════════════════════════════
  initWeatherMood();

  window._emotionEngine = {
    startFace: startFace,
    stopFace: stopFace,
    destroy: destroy,
    getMood: function() {
      return { mood: currentMood, source: currentSource, confidence: currentConfidence };
    },
    setWeatherMood: function(code) { window._setWeatherMood(code); }
  };
})();
