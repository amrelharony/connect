// ═══════════════════════════════════════════════════════════════
// PHASE 2 FEATURES MODULE — amrelharony.com
// Drop-in script: <script src="phase2-features.js" defer></script>
//
// Features:
//   1. ADPList Inline Widget — expandable booking widget
//   2. Live Mentorship Stats — real-time counter + slot indicator
//   3. Contextual UTM Magic — referrer-aware hero morphing
//
// Zero dependencies — works alongside existing site JS + Phase 1
// ═══════════════════════════════════════════════════════════════
(function PhaseTwoFeatures() {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const params = new URLSearchParams(location.search);

  // phase2-css: styles moved to Css/phase2.css




  // ═══════════════════════════════════════════════════
  // FEATURE 2: LIVE MENTORSHIP STATS
  // ═══════════════════════════════════════════════════

  function initMentorshipStats() {
    // Inject a compact stats badge into the existing ADPList card (no separate card)
    const adpCard = document.querySelector('a.lk[href*="adplist.org"]');
    if (!adpCard) return;

    const subtitle = adpCard.querySelector('.lsu');
    if (!subtitle) return;

    // Static mentoring minutes (update manually when needed)
    const TOTAL_MINS = 2400;

    // Create inline stats badge
    const statsBadge = document.createElement('span');
    statsBadge.className = 'mentor-inline-badge';
    statsBadge.id = 'mentorInlineBadge';
    statsBadge.innerHTML = `<span class="live-dot"></span> ${TOTAL_MINS.toLocaleString()}+ mins`;
    subtitle.appendChild(statsBadge);
  }

  function animateValue(elId, target, duration) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (REDUCED_MOTION) {
      el.textContent = target.toLocaleString() + '+';
      return;
    }
    let current = 0;
    const step = Math.ceil(target / 60);
    const interval = duration / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString() + '+';
      if (current >= target) clearInterval(timer);
    }, interval);
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: CONTEXTUAL UTM MAGIC
  // ═══════════════════════════════════════════════════

  function initUTMMagic() {
    const ref = getRefSource();
    if (!ref) return;

    // Delay application to let the main site's preloader finish
    setTimeout(() => applyUTMContext(ref), 3200);
  }

  function getRefSource() {
    // Priority 1: Explicit ?ref= parameter (existing system)
    const refParam = params.get('ref');

    // Priority 2: utm_source
    const utmSource = params.get('utm_source');

    // Priority 3: utm_campaign
    const utmCampaign = params.get('utm_campaign');

    // Priority 4: document.referrer
    const referrer = document.referrer.toLowerCase();

    // Normalize into a known source key
    const raw = (refParam || utmSource || utmCampaign || '').toLowerCase();

    // Explicit ref map
    const KNOWN_REFS = {
      // ADPList referrals
      adplist:     'adplist',
      mentor:      'adplist',
      mentoring:   'adplist',

      // LinkedIn — book focused
      book:        'book',
      bilingual:   'book',
      author:      'book',
      linkedin_book: 'book',

      // LinkedIn — general
      linkedin:    'linkedin',

      // Events
      seamless:    'event_seamless',
      devopsdays:  'event_devopsdays',
      techne:      'event_techne',
      afff:        'event_afff',
      ai_everything: 'event_ai_everything',
      aime:        'event_ai_everything',
      career180:   'event_career',
      career:      'event_career',
      banking_summit: 'event_banking',

      // Calendly
      calendly:    'calendly',

      // Outlook
      outlook:     'outlook',
    };

    // Try explicit param
    if (raw && KNOWN_REFS[raw]) return KNOWN_REFS[raw];

    // Try partial match in campaign/source
    for (const [key, val] of Object.entries(KNOWN_REFS)) {
      if (raw.includes(key)) return val;
    }

    // Try referrer URL
    if (referrer.includes('adplist.org')) return 'adplist';
    if (referrer.includes('linkedin.com')) return 'linkedin';
    if (referrer.includes('calendly.com')) return 'calendly';
    if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'twitter';
    if (referrer.includes('facebook.com')) return 'facebook';
    if (referrer.includes('outlook.com') || referrer.includes('outlook.live.com') || referrer.includes('office.com')) return 'outlook';

    return null;
  }

  function applyUTMContext(source) {
    const app = document.getElementById('app');
    if (!app) return;

    const _greetShown = {};
    function insertGreeting(emoji, text) {
      if (_greetShown[text]) return;
      _greetShown[text] = true;
      setTimeout(() => {
        if (window.UniToast && window.UniToast.add) {
          window.UniToast.add(text, '', emoji, 'accent');
        }
      }, 2500);
    }

    // Shared helper: highlight & reorder a card
    function prioritizeCard(selector) {
      const card = document.querySelector(selector);
      if (card) {
        card.classList.add('utm-priority-card');
        // Move card to top of its container
        const parent = card.parentElement;
        if (parent && parent.firstElementChild !== card) {
          parent.insertBefore(card, parent.firstElementChild);
        }
      }
    }

    // Route-specific adaptations
    switch (source) {

      // ── ADPList Referrals ──
      case 'adplist': {
        insertGreeting('🎓', 'Welcome from ADPList! Book a session below');

        // Highlight mentoring card
        prioritizeCard('a.lk[href*="adplist"]');

        // Update hero text
        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            '<strong>3,240+ mentoring minutes</strong> and counting. ' +
            'I help professionals navigate <strong>agile, data, and fintech careers</strong> ' +
            'through free 1:1 coaching sessions.';
        }

        // Auto-expand ADPList widget after delay
        setTimeout(() => {
          if (window._adpToggleWidget) window._adpToggleWidget();
        }, 4000);

        // Boost impact number visibility
        const impNum2 = document.getElementById('impNum2');
        if (impNum2) impNum2.style.color = '#22c55e';

        break;
      }

      // ── Book / Author Referrals ──
      case 'book': {
        insertGreeting('📘', 'Thanks for your interest in The Bilingual Executive!');

        // Highlight book card
        prioritizeCard('a.lk[href*="bilingual"]');

        // Update hero
        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            'Author of <strong>"The Bilingual Executive"</strong> — the definitive guide to ' +
            '<strong>bridging business and technology leadership</strong>. ' +
            'Available in print, ebook, and AI-narrated audiobook.';
        }

        // Add audio pin card
        const bookCard = document.querySelector('a.lk[href*="bilingual"]');
        if (bookCard) {
          const audioPin = document.createElement('div');
          audioPin.className = 'utm-audio-pin';
          audioPin.innerHTML = `
            <div class="utm-audio-icon">🎧</div>
            <div class="utm-audio-meta">
              <div class="utm-audio-label">Now available as audiobook</div>
              <div class="utm-audio-title">The Bilingual Executive — AI Narrated Edition</div>
            </div>
            <a href="https://bilingualexecutive.amrelharony.com/"
               target="_blank" rel="noopener"
               class="utm-audio-link">
              Listen
            </a>
          `;
          bookCard.insertAdjacentElement('afterend', audioPin);
        }

        break;
      }

      // ── LinkedIn General ──
      case 'linkedin': {
        insertGreeting('👋', 'Welcome from LinkedIn!');
        break;
      }

      // ── Outlook ──
      case 'outlook': {
        insertGreeting('📧', 'Welcome from Outlook!');
        break;
      }

      // ── Calendly ──
      case 'calendly': {
        insertGreeting('📅', 'Excited for our upcoming call!');

        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            "Looking forward to connecting! Here's a quick overview of my background in " +
            '<strong>agile delivery, data analytics, and fintech</strong> so we can make ' +
            'the most of our time together.';
        }
        break;
      }

      // ── Events ──
      default: {
        if (source.startsWith('event_')) {
          const EVENT_MAP = {
            event_seamless:       { name: 'Seamless North Africa',   emoji: '🌍' },
            event_devopsdays:     { name: 'DevOpsDays Cairo',        emoji: '⚙️' },
            event_techne:         { name: 'Techne Summit',           emoji: '🚀' },
            event_afff:           { name: 'Africa FinTech Forum',    emoji: '🏦' },
            event_ai_everything:  { name: 'AI Everything MEA',       emoji: '🤖' },
            event_career:         { name: 'Egypt Career Summit',     emoji: '💼' },
            event_banking:        { name: 'Banking & Fintech Summit', emoji: '🏛️' },
          };

          const event = EVENT_MAP[source] || { name: 'the event', emoji: '🎪' };

          insertGreeting(event.emoji, `Great connecting at ${event.name}!`);

          // Add event badge
          const tagContainer = document.getElementById('rtags');
          if (tagContainer) {
            const badge = document.createElement('span');
            badge.className = 'utm-event-badge';
            badge.innerHTML = `<i class="fa-solid fa-ticket"></i> Met at ${event.name}`;
            tagContainer.insertAdjacentElement('afterend', badge);
          }

          // Auto-unlock contact section for event visitors
          setTimeout(() => {
            if (typeof window.revealContact === 'function') {
              window.revealContact();
            } else {
              // Fallback: try triggering via existing ?s param logic
              const secret = document.getElementById('contactSecret');
              if (secret && !secret.classList.contains('revealed')) {
                secret.classList.add('revealed');
              }
            }
          }, 4500);

          // Award special event networking badge
          setTimeout(() => {
            if (window.VDna) window.VDna.addXp(15);
          }, 5000);
        }
        break;
      }
    }

    // Track UTM source in visitor DNA
    if (window.VDna) {
      const p = window.VDna.get();
      if (!p.utmSources) p.utmSources = [];
      if (!p.utmSources.includes(source)) {
        p.utmSources.push(source);
      }
      p.lastUtmSource = source;
      window.VDna.save();
    }
  }


  // ═══════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═══════════════════════════════════════════════════

  function init() {
    initMentorshipStats();
    initUTMMagic();

    console.log(
      '%c🔗 Phase 2 Features Loaded %c Mentorship Stats · UTM Magic',
      'background:#22c55e;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#22c55e;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  function boot() {
    if (window._coreReady) init();
    else window.addEventListener('AmrOS:CoreReady', init, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
