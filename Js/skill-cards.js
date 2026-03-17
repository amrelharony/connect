// skills-cloud.js v2 — Glassmorphism Skill Matrix with GSAP + Sound + Haptics
// Respects window._reducedMotion and window._suspended global flags.
(function () {
  'use strict';

  var grid = document.getElementById('skillsTimeline');
  if (!grid) return;

  var cards = grid.querySelectorAll('.sk-card');
  if (!cards.length) return;

  var gsap = window.gsap;
  var reducedMotion = window._reducedMotion || false;
  var isDesktop = window.matchMedia('(pointer:fine)').matches;
  var activeCard = null;

  // ── Haptic helpers ──
  function hapticTap()      { if (window._haptic) window._haptic.tap(); }
  function hapticExpand()   { if (window._haptic) window._haptic.expand(); }
  function hapticCollapse() { if (window._haptic) window._haptic.collapse(); }

  // ── Sound helpers (uses spatial audio when available) ──
  function playExpandSound() {
    if (window._spatialAudio && window._spatialAudio.isEnabled()) {
      try {
        var ctx = window._spatialAudio.getCtx();
        if (ctx) {
          // Rising tone: short ascending arp
          [0, 4, 7].forEach(function (semi, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440 * Math.pow(2, (60 + semi - 69) / 12), ctx.currentTime + i * 0.06);
            gain.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
            var master = window._spatialAudio.getMaster();
            osc.connect(gain).connect(master || ctx.destination);
            osc.start(ctx.currentTime + i * 0.06);
            osc.stop(ctx.currentTime + i * 0.06 + 0.15);
          });
        }
      } catch (e) {}
    }
  }

  function playCollapseSound() {
    if (window._spatialAudio && window._spatialAudio.isEnabled()) {
      try {
        var ctx = window._spatialAudio.getCtx();
        if (ctx) {
          // Descending soft blip
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440 * Math.pow(2, (67 - 69) / 12), ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440 * Math.pow(2, (55 - 69) / 12), ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          var master = window._spatialAudio.getMaster();
          osc.connect(gain).connect(master || ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (e) {}
    }
  }

  function playChipSound(index) {
    if (window._spatialAudio && window._spatialAudio.isEnabled()) {
      try {
        var ctx = window._spatialAudio.getCtx();
        if (ctx && index < 4) { // Only first 4 chips get sound (avoid spam)
          var pentatonic = [0, 2, 4, 7, 9];
          var semi = pentatonic[index % pentatonic.length];
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440 * Math.pow(2, (72 + semi - 69) / 12), ctx.currentTime);
          gain.gain.setValueAtTime(0.02, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          var master = window._spatialAudio.getMaster();
          osc.connect(gain).connect(master || ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.12);
        }
      } catch (e) {}
    }
  }

  // ── 1. GSAP Entrance Animation ──
  function entranceAnimation() {
    if (!gsap || reducedMotion) {
      cards.forEach(function (card) {
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
      return;
    }

    cards.forEach(function (card, i) {
      gsap.fromTo(card,
        { opacity: 0, y: 40, scale: 0.94, rotateX: 8, filter: 'blur(4px)' },
        {
          opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)',
          duration: 0.7,
          delay: 2.4 + i * 0.1,
          ease: 'power3.out',
          onComplete: function () {
            gsap.set(card, { clearProps: 'all' });
            card.style.opacity = '1';
            card.style.transform = 'none';
          }
        }
      );
    });
  }

  // ── 2. Expand / Collapse Toggle ──
  function toggleCard(card) {
    var wasActive = card.classList.contains('sk-active');

    // Collapse all other cards
    cards.forEach(function (c) {
      if (c !== card && c.classList.contains('sk-active')) {
        collapseCard(c);
      }
    });

    if (wasActive) {
      collapseCard(card);
      hapticCollapse();
      playCollapseSound();
    } else {
      expandCard(card);
      hapticExpand();
      playExpandSound();
    }
  }

  function expandCard(card) {
    card.classList.add('sk-active');
    activeCard = card;

    var chips = card.querySelectorAll('.sk-chip');
    var body = card.querySelector('.sk-card-body');
    var accent = card.getAttribute('data-sk-accent') || 'var(--accent)';

    // Set accent color on chips' left border
    chips.forEach(function (chip) {
      chip.style.borderLeftColor = accent;
    });

    if (gsap && !reducedMotion) {
      // Animate body open
      if (body) {
        gsap.fromTo(body,
          { maxHeight: 0, paddingBottom: 0 },
          { maxHeight: 1000, paddingBottom: 20, duration: 0.4, ease: 'power2.out' }
        );
      }

      // Stagger chips in
      gsap.fromTo(chips,
        { opacity: 0, y: 12, scale: 0.92 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.35,
          stagger: {
            each: 0.04,
            onComplete: function () {
              var idx = Array.prototype.indexOf.call(chips, this.targets()[0]);
              playChipSound(idx);
            }
          },
          ease: 'power2.out',
          delay: 0.15,
          onComplete: function () {
            chips.forEach(function (chip) {
              chip.classList.add('sk-visible');
              gsap.set(chip, { clearProps: 'opacity,y,scale' });
            });
          }
        }
      );
    } else {
      chips.forEach(function (chip) {
        chip.classList.add('sk-visible');
      });
    }
  }

  function collapseCard(card) {
    card.classList.remove('sk-active');
    if (activeCard === card) activeCard = null;

    var chips = card.querySelectorAll('.sk-chip');
    var body = card.querySelector('.sk-card-body');

    if (gsap && !reducedMotion) {
      // Animate chips out
      gsap.to(chips, {
        opacity: 0, y: -8, scale: 0.95,
        duration: 0.2,
        stagger: 0.02,
        ease: 'power2.in'
      });

      // Animate body closed
      if (body) {
        gsap.to(body, {
          maxHeight: 0,
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: function () {
            chips.forEach(function (chip) {
              chip.classList.remove('sk-visible');
              gsap.set(chip, { clearProps: 'all' });
            });
            gsap.set(body, { clearProps: 'all' });
          }
        });
      }
    } else {
      chips.forEach(function (chip) {
        chip.classList.remove('sk-visible');
      });
    }
  }

  // ── 3. Click Handlers + Hover Sound ──
  var lastHoverTime = 0;

  function playHoverSound() {
    var now = Date.now();
    if (now - lastHoverTime < 150) return; // throttle
    lastHoverTime = now;

    if (window._spatialAudio && window._spatialAudio.isEnabled()) {
      try {
        var ctx = window._spatialAudio.getCtx();
        if (ctx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          gain.gain.setValueAtTime(0.015, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
          var master = window._spatialAudio.getMaster();
          osc.connect(gain).connect(master || ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch (e) {}
    }
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.classList.contains('sk-chip')) return;
      toggleCard(card);
    });

    card.addEventListener('mouseenter', function () {
      playHoverSound();
      hapticTap();
    });
  });

  // ── 4. 3D Tilt Hover Effect (Desktop Only) ──
  if (isDesktop && !reducedMotion) {
    cards.forEach(function (card) {
      var glow = card.querySelector('.sk-card-glow');
      var accent = card.getAttribute('data-sk-accent') || 'var(--accent)';
      var cx = 0, cy = 0, tx = 0, ty = 0;

      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;

        tx = ((y - r.height / 2) / (r.height / 2)) * -4;
        ty = ((x - r.width / 2) / (r.width / 2)) * 4;

        if (glow) {
          glow.style.background = 'radial-gradient(300px circle at ' + x + 'px ' + y + 'px, rgba(0, 225, 255, .06), transparent 60%)';
        }
      });

      card.addEventListener('mouseleave', function () {
        tx = 0;
        ty = 0;
      });

      // Smooth tilt animation loop
      (function tiltLoop() {
        if (!window._suspended) {
          cx += (tx - cx) * 0.1;
          cy += (ty - cy) * 0.1;

          if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
            card.style.transform = 'perspective(800px) rotateX(' + cx + 'deg) rotateY(' + cy + 'deg) scale3d(1.01,1.01,1.01)';
          } else if (tx === 0 && ty === 0 && Math.abs(cx) < 0.01 && Math.abs(cy) < 0.01) {
            card.style.transform = '';
          }
        }
        requestAnimationFrame(tiltLoop);
      })();
    });
  }

  // ── 5. Vibration feedback for mobile touch ──
  if (!isDesktop) {
    cards.forEach(function (card) {
      card.addEventListener('touchstart', function () {
        if (window._userHasInteracted && navigator.vibrate) {
          navigator.vibrate(15);
        }
      }, { passive: true });
    });
  }

  // ── 6. Launch entrance ──
  entranceAnimation();

})();
