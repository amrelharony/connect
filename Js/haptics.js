// haptics.js — Centralized Haptic Feedback Engine
// Mood-adaptive vibration patterns for every interactive touchpoint.
// Integrates with emotion-engine.js for intensity scaling.

(function HapticEngine() {
  'use strict';

  var ok = !!(navigator.vibrate);
  var moodScale = 1.0;
  var throttles = {};

  var MOOD_SCALES = {
    warm: 1.0, surprised: 1.0, intense: 1.0,
    neutral: 0.85, focused: 0.6,
    calm: 0.5, serene: 0.5, melancholy: 0.5
  };

  document.addEventListener('moodchange', function(e) {
    var m = e.detail && e.detail.mood;
    moodScale = (m && MOOD_SCALES[m] !== undefined) ? MOOD_SCALES[m] : 1.0;
  });

  function blocked() {
    return !ok || document.body.classList.contains('perf-critical');
  }

  function fire(pattern) {
    if (blocked()) return;
    if (typeof pattern === 'number') {
      navigator.vibrate(Math.max(1, Math.round(pattern * moodScale)));
    } else if (Array.isArray(pattern)) {
      navigator.vibrate(pattern.map(function(v) { return Math.max(1, Math.round(v * moodScale)); }));
    }
  }

  function throttled(key, pattern, ms) {
    if (blocked()) return;
    var now = Date.now();
    if (throttles[key] && now - throttles[key] < ms) return;
    throttles[key] = now;
    fire(pattern);
  }

  window._haptic = {
    // Navigation
    tap:       function() { fire(6); },
    toggle:    function() { fire([6, 40, 6]); },
    menuOpen:  function() { fire([4, 25, 8]); },
    menuClose: function() { fire([8, 25, 4]); },
    swipe:     function() { fire(4); },

    // Feedback
    success:    function() { fire([8, 30, 8, 30, 15]); },
    warning:    function() { fire([25, 40, 50]); },
    notify:     function() { fire([5, 20, 10]); },
    levelUp:    function() { fire([10, 30, 10, 30, 10, 30, 10, 60, 20]); },
    trophy:     function() { fire([15, 25, 15, 25, 30]); },
    trophyRare: function() { fire([20, 30, 20, 30, 20, 30, 50]); },

    // Content
    cardPress: function() { fire(8); },
    cardFlip:  function() { fire([6, 35, 10]); },
    expand:    function() { fire([4, 20, 6]); },
    collapse:  function() { fire([6, 20, 4]); },

    // Games
    collect:  function() { fire(12); },
    hit:      function() { fire([30, 15, 50]); },
    gameOver: function() { fire([80, 40, 120, 40, 200]); },
    shoot:    function() { fire([5, 10, 8]); },
    rotate:   function() { throttled('rotate', 3, 100); },

    // System
    milestone: function() { fire([6, 20, 6, 20, 12]); },
    xp:        function() { fire([4, 15, 6]); },
    enter:     function() { fire([4, 15, 4, 15, 4, 15, 8, 30, 12]); },
    heartbeat: function() { fire([3, 80, 3]); },

    // Raw (for any custom one-off needs)
    raw: fire
  };
})();
