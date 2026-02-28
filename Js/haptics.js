// haptics.js — Intentional Haptic Feedback
// Only fires on meaningful moments: achievements, errors, game events.

(function HapticEngine() {
  'use strict';

  var ok = !!(navigator.vibrate);
  var noop = function() {};

  function blocked() {
    return !ok || document.body.classList.contains('perf-critical');
  }

  function fire(pattern) {
    if (blocked()) return;
    navigator.vibrate(pattern);
  }

  window._haptic = {
    // Silent — no vibration for routine UI interactions
    tap:       noop,
    toggle:    noop,
    menuOpen:  noop,
    menuClose: noop,
    swipe:     noop,
    cardPress: noop,
    cardFlip:  noop,
    expand:    noop,
    collapse:  noop,
    notify:    noop,
    milestone: noop,
    xp:        noop,
    heartbeat: noop,
    rotate:    noop,

    // Intentional — vibrate only when something meaningful happens
    success:    function() { fire([6, 30, 6, 30, 10]); },
    warning:    function() { fire([15, 30, 25]); },
    levelUp:    function() { fire([8, 30, 8, 30, 8, 30, 12, 50, 15]); },
    trophy:     function() { fire([10, 25, 10, 25, 20]); },
    trophyRare: function() { fire([12, 25, 12, 25, 12, 25, 30]); },
    enter:      function() { fire([4, 15, 4, 15, 4, 15, 8, 30, 12]); },

    // Games — vibrate during active gameplay
    collect:  function() { fire(8); },
    hit:      function() { fire([20, 12, 35]); },
    gameOver: function() { fire([50, 35, 80, 35, 120]); },
    shoot:    function() { fire([4, 10, 6]); },

    raw: fire
  };
})();
