// haptics.js — Haptic Feedback Engine
// Subtle pulses for UI interactions; stronger patterns for achievements & games.

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
    tap:       function() { fire(3); },
    toggle:    function() { fire([3, 20, 3]); },
    menuOpen:  function() { fire([3, 15, 5]); },
    menuClose: function() { fire(3); },
    swipe:     function() { fire([4, 12, 4]); },
    cardPress: function() { fire(4); },
    cardFlip:  function() { fire([3, 25, 5]); },
    expand:    function() { fire([3, 15, 5]); },
    collapse:  function() { fire(3); },
    notify:    function() { fire([4, 20, 6]); },
    milestone: function() { fire([4, 20, 4, 20, 6]); },
    xp:        function() { fire(4); },
    heartbeat: function() { fire([4, 40, 4]); },
    rotate:      function() { fire(3); },
    sectionSnap: function() { fire([2, 10, 2]); },

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
  console.log('%c📳 Haptics%c Vibration engine ready','background:#f472b6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');
})();
