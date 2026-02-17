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

  // ───────────────────────────────────────────
  // INJECT ALL CSS
  // ───────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'phase2-css';
  style.textContent = `

/* ═══════════════════════════════════════════
   1. ADPLIST INLINE WIDGET
   ═══════════════════════════════════════════ */

.adp-widget-wrap {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height .6s cubic-bezier(.16,1,.3,1),
              opacity .5s ease,
              margin .4s ease;
  margin: 0;
  border-radius: 16px;
}
.adp-widget-wrap.expanded {
  max-height: 560px;
  opacity: 1;
  margin: 12px 0 4px;
}
.adp-widget-inner {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px -8px rgba(0,0,0,.2);
  position: relative;
}
.adp-widget-inner iframe {
  display: block;
  width: 100%;
  height: 496px;
  border: 0;
  border-radius: 16px;
  background: var(--bg2);
}
/* Loading skeleton while iframe loads */
.adp-widget-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg2);
  border-radius: 16px;
  z-index: 2;
  transition: opacity .4s ease;
  pointer-events: none;
}
.adp-widget-loading.loaded { opacity: 0; }
.adp-widget-loading-icon {
  font-size: 28px;
  animation: adpPulse 1.5s ease-in-out infinite;
}
@keyframes adpPulse {
  0%, 100% { transform: scale(1); opacity: .6; }
  50% { transform: scale(1.1); opacity: 1; }
}
.adp-widget-loading-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--sub);
}

/* Toggle button inside the existing card */
.adp-toggle-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 100px;
  background: rgba(0,225,255,.08);
  border: 1px solid rgba(0,225,255,.15);
  color: var(--accent);
  margin-left: 8px;
  transition: all .3s;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.adp-toggle-badge:hover {
  background: rgba(0,225,255,.15);
  border-color: var(--accent);
}
.adp-toggle-badge i {
  font-size: 6px;
  transition: transform .3s;
}
.adp-toggle-badge.open i {
  transform: rotate(180deg);
}
.light-mode .adp-toggle-badge {
  background: rgba(0,102,255,.06);
  border-color: rgba(0,102,255,.12);
}

/* Collapse button below widget */
.adp-collapse-btn {
  display: block;
  width: 100%;
  padding: 8px;
  margin: 0;
  border: none;
  background: transparent;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--sub);
  cursor: pointer;
  opacity: .4;
  transition: all .3s;
  -webkit-tap-highlight-color: transparent;
}
.adp-collapse-btn:hover {
  opacity: .8;
  color: var(--accent);
}

@media print { .adp-widget-wrap, .adp-toggle-badge { display: none !important; } }


/* ═══════════════════════════════════════════
   2. LIVE MENTORSHIP STATS
   ═══════════════════════════════════════════ */

.mentorship-live {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  backdrop-filter: blur(20px);
  margin: 8px 0;
  transition: all .3s;
}
.mentorship-live:hover {
  border-color: rgba(0,225,255,.12);
  background: var(--cardH);
}
.mentor-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  color: #fff;
  position: relative;
}
.mentor-pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  border: 1.5px solid #22c55e;
  opacity: 0;
  animation: mentorPulse 3s ease-in-out infinite;
}
@keyframes mentorPulse {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: .3; transform: scale(1.15); }
}
.mentor-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mentor-stats-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.mentor-stats-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}
.mentor-stats-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--sub);
}
.mentor-stats-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: .5px;
  color: var(--accent);
  opacity: .7;
  display: flex;
  align-items: center;
  gap: 4px;
}
.mentor-stats-sub .live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
  flex-shrink: 0;
  animation: livePulse 2s ease-in-out infinite;
}
@keyframes livePulse {
  0%, 100% { opacity: .4; }
  50% { opacity: 1; }
}
.mentor-book-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  transition: all .3s;
  white-space: nowrap;
  flex-shrink: 0;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.mentor-book-btn:hover {
  background: rgba(0,225,255,.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--glow);
}

/* Progress bar under stats */
.mentor-progress-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.mentor-progress-bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}
.mentor-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #22c55e, var(--accent));
  transition: width 1.5s cubic-bezier(.16,1,.3,1);
}
.mentor-progress-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: .5px;
  color: var(--sub);
  opacity: .5;
  white-space: nowrap;
}

@media print {
  .mentorship-live { border-color: #ddd !important; background: #fafafa !important; }
  .mentor-pulse-ring, .live-dot { display: none !important; }
  .mentor-book-btn { display: none !important; }
}


/* ═══════════════════════════════════════════
   3. CONTEXTUAL UTM HERO MORPHING
   ═══════════════════════════════════════════ */

/* UTM greeting banner */
.utm-greeting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0,225,255,.12);
  background: linear-gradient(135deg, rgba(0,225,255,.04), rgba(99,102,241,.04));
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: .5px;
  color: var(--accent);
  margin-bottom: 12px;
  text-align: center;
  animation: utmFadeIn .8s ease both;
  animation-delay: 1.5s;
}
@keyframes utmFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.utm-greeting-emoji {
  font-size: 16px;
  animation: utmWave 1.5s ease-in-out 2;
  animation-delay: 2s;
}
@keyframes utmWave {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(20deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(15deg); }
  80% { transform: rotate(-5deg); }
}
.utm-greeting-dismiss {
  margin-left: 4px;
  cursor: pointer;
  opacity: .4;
  font-size: 10px;
  transition: opacity .3s;
}
.utm-greeting-dismiss:hover { opacity: 1; }

/* UTM priority highlight glow */
.utm-priority-card {
  animation: utmGlow 2s ease-in-out;
}
@keyframes utmGlow {
  0% { box-shadow: 0 0 0 0 rgba(0,225,255,.3); }
  50% { box-shadow: 0 0 20px 4px rgba(0,225,255,.15); }
  100% { box-shadow: none; }
}

/* UTM pinned audio player (for book referrals) */
.utm-audio-pin {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99,102,241,.06), rgba(168,85,247,.04));
  border: 1px solid rgba(99,102,241,.12);
  margin: 8px 0 4px;
  animation: utmFadeIn .6s ease both;
  animation-delay: 2s;
}
.utm-audio-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent2), var(--accent3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}
.utm-audio-meta {
  flex: 1;
  min-width: 0;
}
.utm-audio-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent2);
  margin-bottom: 2px;
}
.utm-audio-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.utm-audio-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--accent2);
  background: transparent;
  color: var(--accent2);
  cursor: pointer;
  transition: all .3s;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.utm-audio-link:hover {
  background: rgba(99,102,241,.1);
}

/* UTM event badge unlock */
.utm-event-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid rgba(251,191,36,.2);
  background: rgba(251,191,36,.04);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #fbbf24;
  margin: 4px 0;
  animation: utmFadeIn .6s ease both;
  animation-delay: 3s;
}
.utm-event-badge i {
  font-size: 10px;
}

@media print {
  .utm-greeting, .utm-audio-pin, .utm-event-badge { display: none !important; }
}
`;
  document.head.appendChild(style);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: ADPLIST INLINE WIDGET
  // ═══════════════════════════════════════════════════

  function initADPListWidget() {
    // Find the ADPList / "Get Mentored" card
    const adpCard = document.querySelector('a.lk[href*="adplist.org"]');
    if (!adpCard) return;

    // Prevent default navigation — we'll expand the widget instead
    const originalHref = adpCard.href;

    // Add inline toggle badge to the card subtitle
    const subtitle = adpCard.querySelector('.lsu');
    if (subtitle) {
      const badge = document.createElement('span');
      badge.className = 'adp-toggle-badge';
      badge.id = 'adpToggleBadge';
      badge.innerHTML = 'Book Now <i class="fa-solid fa-chevron-down"></i>';
      subtitle.appendChild(badge);
    }

    // Create expandable widget container
    const widgetWrap = document.createElement('div');
    widgetWrap.className = 'adp-widget-wrap';
    widgetWrap.id = 'adpWidgetWrap';
    widgetWrap.innerHTML = `
      <div class="adp-widget-inner">
        <div class="adp-widget-loading" id="adpLoading">
          <div class="adp-widget-loading-icon">🎓</div>
          <div class="adp-widget-loading-text">Loading booking widget...</div>
        </div>
      </div>
      <button class="adp-collapse-btn" id="adpCollapseBtn">
        <i class="fa-solid fa-chevron-up" style="margin-right:4px;font-size:8px;"></i>
        Collapse booking widget
      </button>
    `;

    // Insert widget right after the card
    adpCard.insertAdjacentElement('afterend', widgetWrap);

    let widgetLoaded = false;
    let widgetExpanded = false;

    function toggleWidget(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      widgetExpanded = !widgetExpanded;
      const badge = document.getElementById('adpToggleBadge');
      const wrap = document.getElementById('adpWidgetWrap');

      if (widgetExpanded) {
        // Lazy-load iframe on first expand
        if (!widgetLoaded) {
          loadWidgetIframe();
        }
        wrap.classList.add('expanded');
        if (badge) {
          badge.classList.add('open');
          badge.innerHTML = 'Close <i class="fa-solid fa-chevron-up"></i>';
        }

        // Scroll widget into view after expansion
        setTimeout(() => {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 350);

        // XP for engaging with widget
        if (window.VDna) window.VDna.addXp(5);
      } else {
        wrap.classList.remove('expanded');
        if (badge) {
          badge.classList.remove('open');
          badge.innerHTML = 'Book Now <i class="fa-solid fa-chevron-down"></i>';
        }
      }
    }

    function loadWidgetIframe() {
      widgetLoaded = true;
      const inner = widgetWrap.querySelector('.adp-widget-inner');
      const loading = document.getElementById('adpLoading');

      const iframe = document.createElement('iframe');
      iframe.src = 'https://adplist.org/widgets/single-session?src=amr-elharony&session=46534-mentorship-session';
      iframe.title = 'Book a Mentorship Session with Amr Elharony';
      iframe.loading = 'lazy';
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.height = '496px';
      iframe.style.borderRadius = '16px';
      iframe.style.display = 'block';
      iframe.setAttribute('allow', 'clipboard-write');

      iframe.addEventListener('load', () => {
        if (loading) loading.classList.add('loaded');
      });

      // Fallback: remove loading after 5s regardless
      setTimeout(() => {
        if (loading) loading.classList.add('loaded');
      }, 5000);

      inner.appendChild(iframe);
    }

    // Click handlers
    adpCard.addEventListener('click', (e) => {
      // If clicked on the badge specifically, toggle widget
      if (e.target.closest('.adp-toggle-badge')) {
        toggleWidget(e);
        return;
      }
      // Otherwise toggle widget too (replaces navigation)
      toggleWidget(e);
    });

    // Also support keyboard activation
    adpCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggleWidget(e);
      }
    });

    // Collapse button
    const collapseBtn = document.getElementById('adpCollapseBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', toggleWidget);
    }

    // Add fallback link for middle-click / right-click → new tab
    adpCard.dataset.originalHref = originalHref;

    // Context menu: still allow "Open in new tab"
    adpCard.addEventListener('auxclick', (e) => {
      // Middle click → open original link
      if (e.button === 1) {
        window.open(originalHref, '_blank', 'noopener');
      }
    });

    // Expose for UTM system to auto-expand
    window._adpToggleWidget = toggleWidget;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: LIVE MENTORSHIP STATS
  // ═══════════════════════════════════════════════════

  function initMentorshipStats() {
    // Calculate live mentoring minutes
    // Base: 1000 mins as of Oct 2023. ~80 mins/month estimated growth.
    const BASE_MINS = 1000;
    const START_DATE = new Date('2023-10-01');
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - START_DATE.getFullYear()) * 12 +
      (now.getMonth() - START_DATE.getMonth());
    const totalMins = BASE_MINS + Math.floor(monthsElapsed * 80);

    // Estimate next milestone
    const milestones = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 7500, 10000];
    const nextMilestone = milestones.find(m => m > totalMins) || 10000;
    const progressPct = Math.min(
      ((totalMins - (milestones[milestones.indexOf(nextMilestone) - 1] || 0)) /
       (nextMilestone - (milestones[milestones.indexOf(nextMilestone) - 1] || 0))) * 100,
      100
    );

    // Estimate open slots based on day/time
    const cairoH = parseInt(
      now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false })
    );
    const dayName = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' });
    const isWeekend = dayName === 'Friday' || dayName === 'Saturday';

    let slotMessage = '';
    let slotCount = 0;
    if (isWeekend) {
      slotCount = 3;
      slotMessage = `${slotCount} slots available this weekend`;
    } else if (cairoH >= 17 && cairoH < 22) {
      slotCount = 2;
      slotMessage = `${slotCount} evening slots open today`;
    } else if (cairoH >= 9 && cairoH < 17) {
      slotCount = 1;
      slotMessage = 'Limited slots — evenings only';
    } else {
      slotCount = 4;
      slotMessage = `${slotCount} slots open this week`;
    }

    // Find insertion point — after the link cards, before "THE JOURNEY"
    const journeyDivider = document.querySelector('.nd');
    const linkContainer = document.querySelector('[style*="flex-direction:column"]');
    if (!linkContainer) return;

    // Build the widget
    const card = document.createElement('div');
    card.className = 'mentorship-live sa sa-up';
    card.id = 'mentorshipLive';
    card.innerHTML = `
      <div class="mentor-icon-wrap">
        🎓
        <div class="mentor-pulse-ring"></div>
      </div>
      <div class="mentor-stats">
        <div class="mentor-stats-row">
          <span class="mentor-stats-number" id="mentorLiveCount">0</span>
          <span class="mentor-stats-label">Mentoring Minutes</span>
        </div>
        <div class="mentor-stats-sub">
          <span class="live-dot"></span>
          <span id="mentorSlotMsg">${slotMessage}</span>
        </div>
        <div class="mentor-progress-wrap">
          <div class="mentor-progress-bar">
            <div class="mentor-progress-fill" id="mentorProgressFill" style="width:0%"></div>
          </div>
          <span class="mentor-progress-label">Next: ${nextMilestone.toLocaleString()}</span>
        </div>
      </div>
      <a href="https://adplist.org/mentors/amr-elharony"
         target="_blank" rel="noopener"
         class="mentor-book-btn"
         id="mentorBookBtn">
        Book Free
      </a>
    `;

    // Insert after the link cards
    linkContainer.insertAdjacentElement('afterend', card);

    // Animate counter
    animateValue('mentorLiveCount', totalMins, 1800);

    // Animate progress bar
    setTimeout(() => {
      const fill = document.getElementById('mentorProgressFill');
      if (fill) fill.style.width = progressPct + '%';
    }, 2500);

    // Hook book button to open ADPList widget if available
    const bookBtn = document.getElementById('mentorBookBtn');
    if (bookBtn) {
      bookBtn.addEventListener('click', (e) => {
        if (window._adpToggleWidget) {
          e.preventDefault();
          window._adpToggleWidget();
          // Scroll to widget
          const wrap = document.getElementById('adpWidgetWrap');
          if (wrap) {
            setTimeout(() => {
              wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
          }
        }
        if (window.VDna) window.VDna.addXp(3);
      });
    }

    // Intersection Observer for scroll-triggered animation
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    obs.observe(card);
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

    return null;
  }

  function applyUTMContext(source) {
    const app = document.getElementById('app');
    if (!app) return;

    // Shared helper: insert greeting at top of app
    function insertGreeting(emoji, text) {
      // Don't duplicate if existing greetBar is showing same info
      const existing = document.getElementById('utmGreeting');
      if (existing) return;

      const greet = document.createElement('div');
      greet.className = 'utm-greeting';
      greet.id = 'utmGreeting';
      greet.innerHTML = `
        <span class="utm-greeting-emoji">${emoji}</span>
        <span>${text}</span>
        <span class="utm-greeting-dismiss" onclick="this.parentElement.style.display='none'">&times;</span>
      `;

      // Insert after the status bar
      const statusDiv = app.querySelector('.rv');
      if (statusDiv) {
        statusDiv.insertAdjacentElement('afterend', greet);
      }
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
        // Subtle greeting — don't override hero for general LinkedIn
        insertGreeting('👋', 'Welcome from LinkedIn!');
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
          if (window.Achieve) {
            // Create dynamic event badge if not already in system
            setTimeout(() => {
              if (window.VDna) window.VDna.addXp(15);
            }, 5000);
          }
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
    initADPListWidget();
    initMentorshipStats();
    initUTMMagic();

    console.log(
      '%c🔗 Phase 2 Features Loaded %c ADPList Widget · Mentorship Stats · UTM Magic',
      'background:#22c55e;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#22c55e;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  // Wait for DOM + existing scripts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
  } else {
    setTimeout(init, 200);
  }

})();
