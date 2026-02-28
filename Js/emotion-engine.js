// emotion-engine.js — Dual-source Mood Adaptation Engine
// Source 1: Weather (default) — maps WMO codes to site mood
// Source 2: Face emotion (when spatial mode active on desktop) — overrides weather
// FaceLandmarker runs on main thread (MediaPipe WASM requires DOM access).
// Detection is throttled to ~3 fps to minimize main-thread contention with HandLandmarker.

(function EmotionEngine() {
  'use strict';

  const CDN        = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
  const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  const SMOOTH_ALPHA = 0.15;
  const DETECT_INTERVAL = 300;
  const HYSTERESIS_FRAMES = 6;

  // All detectable emotions
  const EMOTIONS = ['happy', 'focused', 'surprised', 'calm', 'angry', 'sad', 'sleepy', 'playful', 'determined', 'curious'];

  const MOOD_COLORS = {
    warm:       { accent: '#fbbf24', glow: 'rgba(251,191,36,.35)',  glowS: 'rgba(251,191,36,.18)' },
    focused:    { accent: '#6366f1', glow: 'rgba(99,102,241,.35)',  glowS: 'rgba(99,102,241,.18)' },
    surprised:  { accent: '#a855f7', glow: 'rgba(168,85,247,.35)',  glowS: 'rgba(168,85,247,.18)' },
    calm:       { accent: '#2dd4bf', glow: 'rgba(45,212,191,.35)',  glowS: 'rgba(45,212,191,.18)' },
    melancholy: { accent: '#60a5fa', glow: 'rgba(96,165,250,.35)', glowS: 'rgba(96,165,250,.18)' },
    serene:     { accent: '#94a3b8', glow: 'rgba(148,163,184,.35)', glowS: 'rgba(148,163,184,.18)' },
    intense:    { accent: '#ef4444', glow: 'rgba(239,68,68,.4)',    glowS: 'rgba(239,68,68,.2)' },
    neutral:    { accent: '#8a95a8', glow: 'rgba(138,149,168,.2)',  glowS: 'rgba(138,149,168,.1)' },
    playful:    { accent: '#f472b6', glow: 'rgba(244,114,182,.4)', glowS: 'rgba(244,114,182,.2)' },
    determined: { accent: '#f59e0b', glow: 'rgba(245,158,11,.4)',  glowS: 'rgba(245,158,11,.2)' },
    curious:    { accent: '#34d399', glow: 'rgba(52,211,153,.35)', glowS: 'rgba(52,211,153,.18)' }
  };

  const MOOD_LABELS = {
    warm:       '☀️ warm',
    focused:    '🎯 focused',
    surprised:  '😲 surprised',
    calm:       '🍃 calm',
    melancholy: '🌧️ melancholy',
    serene:     '😴 serene',
    intense:    '🔥 intense',
    neutral:    '• neutral',
    playful:    '😄 playful',
    determined: '💪 determined',
    curious:    '🤔 curious'
  };

  const EMOTION_TO_MOOD = {
    happy:      'warm',
    focused:    'focused',
    surprised:  'surprised',
    calm:       'calm',
    angry:      'intense',
    sad:        'melancholy',
    sleepy:     'serene',
    playful:    'playful',
    determined: 'determined',
    curious:    'curious',
    neutral:    'neutral'
  };

  const FLUID_PARAMS = {
    warm:       { hue: 40,  intensity: 1.2, curl: 28 },
    focused:    { hue: 240, intensity: 0.8, curl: 18 },
    surprised:  { hue: 280, intensity: 1.4, curl: 35 },
    calm:       { hue: 170, intensity: 0.9, curl: 15 },
    melancholy: { hue: 220, intensity: 0.7, curl: 20 },
    serene:     { hue: 210, intensity: 0.6, curl: 12 },
    intense:    { hue: 0,   intensity: 1.6, curl: 45 },
    neutral:    { hue: 200, intensity: 0.5, curl: 10 },
    playful:    { hue: 330, intensity: 1.3, curl: 32 },
    determined: { hue: 30,  intensity: 1.1, curl: 22 },
    curious:    { hue: 155, intensity: 1.0, curl: 25 }
  };

  let currentMood = 'neutral';
  let currentSource = 'init';
  let currentConfidence = 0;

  let faceLander = null;
  let faceReady = false;
  let faceLoading = false;
  let faceActive = false;
  let _emoDestroyed = false;
  let faceVideo = null;
  let detectTimer = null;
  let styleEl = null;
  let indicatorEl = null;

  var smoothScores = {};
  for (var ei = 0; ei < EMOTIONS.length; ei++) smoothScores[EMOTIONS[ei]] = 0;
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
    if (!colors || mood === 'neutral') {
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

    var spatialHudActive = !!document.querySelector('.spatial-hud');
    if (source === 'face' && faceActive && !spatialHudActive) {
      indicatorEl.classList.add('show');
    } else {
      indicatorEl.classList.remove('show');
    }
  }

  function removeIndicator() {
    if (indicatorEl) { indicatorEl.remove(); indicatorEl = null; }
  }

  function showIndicatorStatus(text, dotColor) {
    if (document.querySelector('.spatial-hud')) return;
    createIndicator();
    indicatorEl.querySelector('.mood-label').textContent = text;
    indicatorEl.querySelector('.mood-dot').style.background = dotColor || '#8a95a8';
    indicatorEl.querySelector('.mood-src').textContent = '👁';
    indicatorEl.classList.add('show');
  }

  // ═══════════════════════════════════════════════════
  // BLENDSHAPE CLASSIFIER (10 emotions)
  // ═══════════════════════════════════════════════════
  function classify(shapes) {
    var get = function(name) {
      for (var i = 0; i < shapes.length; i++) {
        if (shapes[i].categoryName === name) return shapes[i].score;
      }
      return 0;
    };

    // Raw blendshape readouts
    var smileL    = get('mouthSmileLeft');
    var smileR    = get('mouthSmileRight');
    var cheekL    = get('cheekSquintLeft');
    var cheekR    = get('cheekSquintRight');
    var browDownL = get('browDownLeft');
    var browDownR = get('browDownRight');
    var browUpL   = get('browOuterUpLeft');
    var browUpR   = get('browOuterUpRight');
    var browInL   = get('browInnerUp');
    var eyeWideL  = get('eyeWideLeft');
    var eyeWideR  = get('eyeWideRight');
    var eyeSquL   = get('eyeSquintLeft');
    var eyeSquR   = get('eyeSquintRight');
    var eyeBlkL   = get('eyeBlinkLeft');
    var eyeBlkR   = get('eyeBlinkRight');
    var jawOpen   = get('jawOpen');
    var jawFwd    = get('jawForward');
    var frownL    = get('mouthFrownLeft');
    var frownR    = get('mouthFrownRight');
    var noseSnrL  = get('noseSneerLeft');
    var noseSnrR  = get('noseSneerRight');
    var mouthPrs  = get('mouthPressLeft') + get('mouthPressRight');
    var lipTight  = get('mouthRollLower') + get('mouthRollUpper');

    var smile = (smileL + smileR) * 0.5;
    var cheek = (cheekL + cheekR) * 0.5;
    var frown = (frownL + frownR) * 0.5;
    var browDown = (browDownL + browDownR) * 0.5;
    var browUp = (browUpL + browUpR) * 0.5;
    var eyeWide = (eyeWideL + eyeWideR) * 0.5;
    var eyeSqu = (eyeSquL + eyeSquR) * 0.5;
    var eyeBlink = (eyeBlkL + eyeBlkR) * 0.5;
    var noseSn = (noseSnrL + noseSnrR) * 0.5;

    // ── Emotion scores ──

    // Happy: smiling with cheek raise
    var happy = smile * 0.7 + cheek * 0.3;

    // Playful: duchenne smile (smile + eye crinkle) — genuine amusement
    var playful = Math.min(smile, eyeSqu) * 0.6 + cheek * 0.2 + (jawOpen > 0.3 ? 0.2 : 0);

    // Focused: brows furrowed, mouth closed
    var focused = browDown * 0.7 + (1 - jawOpen) * 0.15 + eyeSqu * 0.15;

    // Surprised: brows up + eyes wide + jaw dropped
    var surprised = browUp * 0.35 + eyeWide * 0.35 + jawOpen * 0.3;

    // Angry: brows down + frown + nose sneer + jaw tension
    var angry = browDown * 0.3 + frown * 0.25 + noseSn * 0.25 + mouthPrs * 0.1 + lipTight * 0.1;

    // Sad: inner brow raised + mouth frown + low cheek/smile activity
    var sad = browInL * 0.35 + frown * 0.35 + Math.max(0, 0.3 - smile) * 0.3;

    // Sleepy: eyes squinting or blinking + low overall facial tension
    var totalActivity = 0;
    for (var i = 0; i < shapes.length; i++) totalActivity += shapes[i].score;
    var avgActivity = totalActivity / Math.max(1, shapes.length);
    var sleepy = eyeBlink * 0.4 + eyeSqu * 0.3 + Math.max(0, 0.5 - avgActivity) * 0.3;

    // Determined: jaw set forward + brows down + mouth pressed tight
    var determined = jawFwd * 0.3 + browDown * 0.25 + mouthPrs * 0.25 + lipTight * 0.2;

    // Curious: one brow raised (asymmetry) + eyes wide + slight head engagement
    var browAsymmetry = Math.abs(browUpL - browUpR) + Math.abs(browDownL - browDownR);
    var curious = browAsymmetry * 0.35 + eyeWide * 0.3 + browInL * 0.2 + (1 - smile) * 0.15;

    // Calm: low variance across all blendshapes (relaxed face)
    var totalVariance = 0;
    for (var j = 0; j < shapes.length; j++) totalVariance += shapes[j].score * shapes[j].score;
    var calm = Math.max(0, 1 - Math.sqrt(totalVariance / Math.max(1, shapes.length)) * 4);

    var scores = {
      happy: happy, playful: playful, focused: focused, surprised: surprised,
      angry: angry, sad: sad, sleepy: sleepy, determined: determined,
      curious: curious, calm: calm
    };

    // Disambiguation: prefer more specific emotions over generic ones
    // If playful scores close to happy, playful wins (it's more specific)
    if (playful > 0.15 && playful > happy * 0.7) scores.happy *= 0.6;
    // If determined scores close to focused, determined wins
    if (determined > 0.15 && determined > focused * 0.7) scores.focused *= 0.6;

    var best = 'neutral', bestVal = 0.18;
    for (var k in scores) {
      if (scores[k] > bestVal) { bestVal = scores[k]; best = k; }
    }
    return { emotion: best, confidence: Math.min(1, bestVal) };
  }

  // ═══════════════════════════════════════════════════
  // FACE EMOTION (main-thread FaceLandmarker)
  // ═══════════════════════════════════════════════════
  async function loadFaceModel() {
    if (faceReady || faceLoading) return;
    faceLoading = true;
    try {
      var V = await import(CDN + '/vision_bundle.mjs');
      var fs = await V.FilesetResolver.forVisionTasks(CDN + '/wasm');
      var lander = await V.FaceLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        numFaces: 1
      });
      if (_emoDestroyed) { lander.close(); faceLoading = false; return; }
      faceLander = lander;
      faceReady = true;
      faceLoading = false;
      if (faceActive) {
        showIndicatorStatus('• neutral', '#8a95a8');
        startDetectLoop();
      }
    } catch (e) {
      faceLoading = false;
      console.warn('[emotion] FaceLandmarker load failed:', e);
      showIndicatorStatus('⚠ model error', '#ef4444');
    }
  }

  function startFace(videoEl) {
    if (faceActive || !videoEl) return;
    faceVideo = videoEl;
    faceActive = true;
    for (var k in smoothScores) smoothScores[k] = 0;
    stableEmotion = 'neutral';
    stableCount = 0;

    showIndicatorStatus('• loading model…', '#8a95a8');

    if (faceReady) {
      showIndicatorStatus('• neutral', '#8a95a8');
      startDetectLoop();
    } else {
      loadFaceModel();
    }
  }

  function stopFace() {
    faceActive = false;
    faceVideo = null;
    if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
    if (indicatorEl) indicatorEl.classList.remove('show');
    initWeatherMood();
  }

  function startDetectLoop() {
    if (detectTimer) return;
    detectTimer = setInterval(detectFrame, DETECT_INTERVAL);
  }

  var _detecting = false;
  function detectFrame() {
    if (_detecting) return;
    if (!faceActive || !faceVideo || !faceReady || !faceLander) return;
    if (faceVideo.readyState < 2) return;
    if (document.body.classList.contains('perf-serious') || document.body.classList.contains('perf-critical')) return;

    _detecting = true;
    try {
      var result = faceLander.detectForVideo(faceVideo, Math.round(performance.now()));
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        var shapes = result.faceBlendshapes[0].categories;
        var cls = classify(shapes);
        processEmotion(cls.emotion, cls.confidence);
      } else {
        processEmotion('neutral', 0);
      }
    } catch (err) {
      console.warn('[emotion] detectFrame error:', err);
    } finally {
      _detecting = false;
    }
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

    var mood = EMOTION_TO_MOOD[stableEmotion] || 'neutral';
    setMood(mood, 'face', bestVal);
  }

  // ═══════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════
  function destroy() {
    _emoDestroyed = true;
    stopFace();
    if (faceLander) { faceLander.close(); faceLander = null; faceReady = false; faceLoading = false; }
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
