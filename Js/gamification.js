// gamification.js — Ultra Advanced Gamification Engine
// Unified achievements, deeper progression, challenges, leaderboards.
// Replaces scattered BADGES/TROPHIES/Achieve/checkTrophy in site.js.

(function GamificationEngine() {
  'use strict';

  // ════════════════════════════════════════════════════════
  // CONSTANTS
  // ════════════════════════════════════════════════════════

  var LEVELS = [
    { xp:0,     name:'Visitor',      color:'var(--sub)' },
    { xp:30,    name:'Curious',      color:'var(--accent)' },
    { xp:80,    name:'Explorer',     color:'#3b82f6' },
    { xp:150,   name:'Engaged',      color:'#8b5cf6' },
    { xp:250,   name:'Fan',          color:'#a855f7' },
    { xp:400,   name:'Enthusiast',   color:'#ec4899' },
    { xp:600,   name:'Devotee',      color:'#f97316' },
    { xp:850,   name:'Champion',     color:'#ef4444' },
    { xp:1150,  name:'Expert',       color:'#22c55e' },
    { xp:1500,  name:'Master',       color:'#14b8a6' },
    { xp:2000,  name:'Grandmaster',  color:'#6366f1' },
    { xp:2600,  name:'Virtuoso',     color:'#d946ef' },
    { xp:3300,  name:'Sage',         color:'#0ea5e9' },
    { xp:4200,  name:'Oracle',       color:'#f59e0b' },
    { xp:5300,  name:'Titan',        color:'#dc2626' },
    { xp:6500,  name:'Paragon',      color:'#7c3aed' },
    { xp:8000,  name:'Mythic',       color:'#06b6d4' },
    { xp:10000, name:'Transcendent', color:'#e11d48' },
    { xp:12500, name:'Ascendant',    color:'#c084fc' },
    { xp:15000, name:'Legend',       color:'#fbbf24' }
  ];

  var PRESTIGE_TIERS = [
    { name:'Bronze Star', mult:1.2, icon:'⭐' },
    { name:'Silver Star', mult:1.5, icon:'🌟' },
    { name:'Gold Star',   mult:2.0, icon:'💫' }
  ];

  var RARITY_META = {
    common:    { label:'Common',       color:'#6b7a90', order:0 },
    rare:      { label:'✦ Rare',       color:'#3b82f6', order:1 },
    epic:      { label:'✦✦ Epic',      color:'#a855f7', order:2 },
    legendary: { label:'★ Legendary',  color:'#fbbf24', order:3 },
    mythic:    { label:'✦✦✦ Mythic',   color:'#06b6d4', order:4 }
  };

  var BRANCH_TIERS = ['Novice','Apprentice','Adept','Expert','Master'];

  // ════════════════════════════════════════════════════════
  // UNIFIED ACHIEVEMENT REGISTRY (~60 achievements)
  // ════════════════════════════════════════════════════════

  var ACHIEVEMENTS = [
    // ── Explore ──
    { id:'explorer_timeline',    icon:'🗺️', name:'Timeline Explorer',      desc:'Scrolled through the career timeline',      cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_certs',       icon:'📜', name:'Cert Collector',          desc:'Viewed the certifications grid',             cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_testimonials',icon:'⭐', name:'Social Proof',           desc:'Read the testimonials section',              cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_conferences', icon:'🎤', name:'Conference Goer',        desc:'Discovered the conferences section',         cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_articles',    icon:'📝', name:'Article Reader',          desc:'Scrolled to LinkedIn articles',              cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_impact',      icon:'📊', name:'Numbers Person',          desc:'Viewed impact numbers section',              cat:'explore', rarity:'common',    xp:5 },
    { id:'explorer_contact',     icon:'📧', name:'Contact Finder',          desc:'Revealed contact information',               cat:'explore', rarity:'rare',      xp:10 },
    { id:'explorer_full',        icon:'🌟', name:'Full Site Explorer',      desc:'Visited every major section',                cat:'explore', rarity:'epic',      xp:25 },
    { id:'explorer',             icon:'🔍', name:'Explorer',                desc:'Scrolled to 100%',                           cat:'explore', rarity:'rare',      xp:25 },
    { id:'speed',                icon:'⚡', name:'Speed Reader',            desc:'Reached bottom in <30s',                     cat:'explore', rarity:'epic',      xp:50 },
    { id:'deep',                 icon:'🧠', name:'Deep Diver',              desc:'Spent 3+ minutes exploring',                 cat:'explore', rarity:'common',    xp:25 },
    // Tiered chain
    { id:'explorer_i',           icon:'🗺️', name:'Explorer I',             desc:'Viewed 3 sections',                          cat:'explore', rarity:'common',    xp:10 },
    { id:'explorer_ii',          icon:'🗺️', name:'Explorer II',            desc:'Viewed 5 sections',                          cat:'explore', rarity:'rare',      xp:20, chain:'explorer_i' },
    { id:'explorer_iii',         icon:'🗺️', name:'Explorer III',           desc:'Viewed all 8 sections',                      cat:'explore', rarity:'epic',      xp:40, chain:'explorer_ii' },

    // ── Social ──
    { id:'connector',            icon:'🤝', name:'Connector',               desc:'Clicked a link',                             cat:'social',  rarity:'common',    xp:10 },
    { id:'social',               icon:'🔗', name:'Networker',               desc:'Clicked 5+ different links',                 cat:'social',  rarity:'rare',      xp:25 },
    { id:'scholar',              icon:'📖', name:'Scholar',                  desc:'Read all 3 newsletters',                     cat:'social',  rarity:'rare',      xp:30 },
    { id:'certified',            icon:'📜', name:'Cert Inspector',           desc:'Visited 3+ certifications',                  cat:'social',  rarity:'rare',      xp:25 },
    { id:'shaker',               icon:'📱', name:'Shaker',                   desc:'Unlocked contact section',                   cat:'social',  rarity:'rare',      xp:25 },
    { id:'guestbook_signed',     icon:'✍️', name:'Wall Signer',             desc:'Left a mark in the guestbook',               cat:'social',  rarity:'rare',      xp:15 },
    { id:'voice_used',           icon:'🎙️', name:'Voice Commander',         desc:'Used voice navigation',                      cat:'social',  rarity:'rare',      xp:15 },
    { id:'palette_used',         icon:'⌨️', name:'Power User',              desc:'Used the command palette',                    cat:'social',  rarity:'common',    xp:10 },
    { id:'terminal_used',        icon:'💻', name:'Terminal Hacker',          desc:'Opened the terminal',                        cat:'social',  rarity:'common',    xp:10 },
    { id:'theme_zen',            icon:'🧘', name:'Zen Master',              desc:'Toggled Zen Mode',                            cat:'social',  rarity:'common',    xp:10 },
    { id:'networking_event',     icon:'👥', name:'Networking Event',         desc:'Online at the same time as another visitor',  cat:'social',  rarity:'rare',      xp:20 },
    { id:'team_player',          icon:'✋', name:'Team Player',              desc:'Mutual high-five with another user',          cat:'social',  rarity:'epic',      xp:30 },
    { id:'hacker_coop',          icon:'🔓', name:'Hacker',                   desc:'Co-op dual-lock sequence with another user',  cat:'social',  rarity:'legendary', xp:40 },
    { id:'angel_investor',       icon:'🛡️', name:'Angel Investor',          desc:'Sent a power-up to another player',           cat:'social',  rarity:'rare',      xp:15 },
    { id:'critical_mass',        icon:'⚡', name:'Mainframe Overload',      desc:'5+ users online simultaneously',              cat:'social',  rarity:'epic',      xp:25 },
    // Tiered chain
    { id:'social_i',             icon:'🤝', name:'Social I',                desc:'1 multiplayer interaction',                   cat:'social',  rarity:'common',    xp:10 },
    { id:'social_ii',            icon:'🤝', name:'Social II',               desc:'5 multiplayer interactions',                  cat:'social',  rarity:'rare',      xp:20, chain:'social_i' },
    { id:'social_iii',           icon:'🤝', name:'Social III',              desc:'10 multiplayer interactions',                 cat:'social',  rarity:'epic',      xp:40, chain:'social_ii' },

    // ── Arcade ──
    { id:'arcade_first',         icon:'🕹️', name:'First Play',              desc:'Played your first arcade game',              cat:'arcade',  rarity:'common',    xp:10 },
    { id:'arcade_5plays',        icon:'🎮', name:'Arcade Regular',           desc:'Played 5+ arcade games',                     cat:'arcade',  rarity:'rare',      xp:20 },
    { id:'arcade_highscore',     icon:'🏅', name:'High Scorer',              desc:'Set a high score in any game',               cat:'arcade',  rarity:'rare',      xp:20 },
    { id:'arcade_allgames',      icon:'👑', name:'Game Master',              desc:'Played every arcade game at least once',      cat:'arcade',  rarity:'epic',      xp:30 },
    { id:'arcade_boss',          icon:'⚔️', name:'Boss Defeated',            desc:'Beat the final boss',                        cat:'arcade',  rarity:'legendary', xp:40 },
    { id:'qa_tester',            icon:'🐛', name:'QA Tester',                desc:'Squashed a bug!',                            cat:'arcade',  rarity:'rare',      xp:20 },
    // Tiered chain
    { id:'gamer_i',              icon:'🎮', name:'Gamer I',                  desc:'Played 1 arcade game',                       cat:'arcade',  rarity:'common',    xp:10 },
    { id:'gamer_ii',             icon:'🎮', name:'Gamer II',                 desc:'Played 5 arcade games',                      cat:'arcade',  rarity:'rare',      xp:20, chain:'gamer_i' },
    { id:'gamer_iii',            icon:'🎮', name:'Gamer III',                desc:'Played all games',                           cat:'arcade',  rarity:'epic',      xp:40, chain:'gamer_ii' },

    // ── Milestone ──
    { id:'regular',              icon:'🔄', name:'Regular',                   desc:'Visited 3+ times',                           cat:'milestone', rarity:'common',  xp:15 },
    { id:'visit_3',              icon:'🔄', name:'Returning Visitor',         desc:'Came back 3+ times',                         cat:'milestone', rarity:'common',  xp:10 },
    { id:'visit_10',             icon:'💎', name:'Loyal Visitor',             desc:'Visited 10+ times',                          cat:'milestone', rarity:'rare',    xp:25 },
    { id:'nightowl',             icon:'🌙', name:'Night Owl',                desc:'Visited midnight-5AM',                       cat:'milestone', rarity:'rare',    xp:25 },
    { id:'globe',                icon:'🌍', name:'Globetrotter',              desc:'Visited from outside Egypt',                 cat:'milestone', rarity:'rare',    xp:25 },
    { id:'streak5',              icon:'🔥', name:'Streak Master',             desc:'5+ day visit streak',                        cat:'milestone', rarity:'epic',    xp:40 },
    { id:'xp_50',                icon:'⚡', name:'XP Collector',              desc:'Earned 50+ XP',                              cat:'milestone', rarity:'common',  xp:10 },
    { id:'xp_200',               icon:'🔥', name:'XP Hoarder',               desc:'Earned 200+ XP',                             cat:'milestone', rarity:'rare',    xp:20 },
    { id:'xp_1000',              icon:'💫', name:'XP Legend',                 desc:'Earned 1000+ XP',                            cat:'milestone', rarity:'epic',    xp:40 },
    { id:'collector',            icon:'🏆', name:'Collector',                 desc:'Unlocked 15 achievements',                   cat:'milestone', rarity:'legendary', xp:60 },
    { id:'completionist',        icon:'🏆', name:'Completionist',            desc:'Unlocked 40+ achievements',                  cat:'milestone', rarity:'legendary', xp:80 },

    // ── Secret (hidden until unlocked) ──
    { id:'secret',               icon:'🤫', name:'Secret Agent',              desc:'Found the easter egg',                       cat:'meta', rarity:'epic',      xp:40, secret:true },
    { id:'matrix_dweller',       icon:'🟢', name:'Matrix Dweller',           desc:'Stayed in matrix rain 30+ seconds',          cat:'meta', rarity:'epic',      xp:40, secret:true },
    { id:'night_shift',          icon:'🌃', name:'Night Shift',              desc:'Visited 3 days in a row past midnight',       cat:'meta', rarity:'legendary', xp:60, secret:true },
    { id:'speed_demon',          icon:'🚀', name:'Speed Demon',              desc:'Reached level 5 in under 10 minutes',         cat:'meta', rarity:'legendary', xp:60, secret:true },

    // ── Daily/Challenge ──
    { id:'dedicated',            icon:'📅', name:'Dedicated',                 desc:'Completed 7 daily challenges in a row',       cat:'meta', rarity:'epic',      xp:50 },
    { id:'committed',            icon:'📆', name:'Committed',                 desc:'Completed 4 weekly challenges',               cat:'meta', rarity:'legendary', xp:80 },

    // ── Mythic (prestige & mastery) ──
    { id:'legend',               icon:'👑', name:'Legend',                     desc:'Prestiged for the first time',                cat:'meta', rarity:'mythic',    xp:150, secret:true },
    { id:'transcendent',         icon:'🌌', name:'Transcendent',              desc:'Prestiged 3 times',                           cat:'meta', rarity:'mythic',    xp:150, secret:true, chain:'legend' },
    { id:'renaissance',          icon:'🎭', name:'Renaissance',               desc:'Mastered all 4 skill branches',               cat:'meta', rarity:'mythic',    xp:150, secret:true },

    // ── NFT ──
    { id:'nft_minter',           icon:'⛓️', name:'On-Chain',                  desc:'Materialized your first achievement NFT',     cat:'meta', rarity:'epic',      xp:30 },

    // ── Biometric Passkeys (WebAuthn) ──
    { id:'passkey_registered',   icon:'🔐', name:'FinTech Executive',         desc:'Created a biometric passkey via WebAuthn',    cat:'meta', rarity:'epic',      xp:50 },
    { id:'passkey_verified',     icon:'🛡️', name:'Identity Verified',         desc:'Authenticated with biometric passkey',        cat:'meta', rarity:'rare',      xp:15 }
  ];

  var ACHV_MAP = {};
  ACHIEVEMENTS.forEach(function(a) { ACHV_MAP[a.id] = a; });

  // Section selectors for exploration tracking
  var EXPLORE_SECTIONS = {
    explorer_timeline:    '.tl-wrap',
    explorer_certs:       '#certGrid',
    explorer_testimonials:'.tc-section',
    explorer_conferences: '.conf-strip',
    explorer_articles:    '#linkedinFeed',
    explorer_impact:      '.imp'
  };

  var SILENT_EXPLORE = ['explorer_timeline','explorer_certs','explorer_testimonials',
                        'explorer_conferences','explorer_articles','explorer_impact'];

  // ════════════════════════════════════════════════════════
  // DAILY & WEEKLY CHALLENGE POOLS
  // ════════════════════════════════════════════════════════

  var DAILY_POOL = [
    { id:'d_sections3',  desc:'Visit 3 different sections',  xp:20, check:function(p){ return (p.sectionsViewed||[]).length >= 3; } },
    { id:'d_scroll50',   desc:'Reach 50% scroll depth',      xp:15, check:function(p){ return (p.scrollMax||0) >= 50; } },
    { id:'d_clicks3',    desc:'Click 3 links',                xp:15, check:function(p){ return (p.sessionClicks||0) >= 3; } },
    { id:'d_terminal',   desc:'Use the terminal',             xp:20, check:function(p){ return !!(p.unlocked && p.unlocked.terminal_used); } },
    { id:'d_flip',       desc:'Flip the profile card',        xp:15, check:function(p){ return !!p._flippedCard; } },
    { id:'d_2min',       desc:'Spend 2+ minutes on site',     xp:20, check:function(p){ return (Date.now() - (p.sessionStart||Date.now())) >= 120000; } },
    { id:'d_scroll100',  desc:'Scroll to 100%',               xp:25, check:function(p){ return (p.scrollMax||0) >= 100; } },
    { id:'d_share',      desc:'Share the site',               xp:20, check:function(p){ return !!p._shared; } },
    { id:'d_guestbook',  desc:'Sign the guestbook',           xp:25, check:function(p){ return !!(p.unlocked && p.unlocked.guestbook_signed); } },
    { id:'d_arcade',     desc:'Play an arcade game',          xp:20, check:function(p){ var a;try{a=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){a={};} return (a.totalPlays||0) > (p._arcadePlaysAtStart||0); } },
    { id:'d_palette',    desc:'Use the command palette',      xp:15, check:function(p){ return !!(p.unlocked && p.unlocked.palette_used); } },
    { id:'d_zen',        desc:'Toggle Zen Mode',              xp:15, check:function(p){ return !!(p.unlocked && p.unlocked.theme_zen); } },
    { id:'d_voice',      desc:'Use voice navigation',         xp:20, check:function(p){ return !!(p.unlocked && p.unlocked.voice_used); } },
    { id:'d_5links',     desc:'Click 5 different links',      xp:20, check:function(p){ return (p.clickedLinks||[]).length >= 5; } },
  ];

  var WEEKLY_POOL = [
    { id:'w_3achvs',    desc:'Unlock 3 new achievements',   xp:60, check:function(p){ return (p._weeklyUnlocks||0) >= 3; } },
    { id:'w_allgames',  desc:'Play all 5 arcade games',     xp:65, check:function(p){ var a;try{a=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){a={};} var hs=a.highScores||{}; return Object.keys(hs).length>=4; } },
    { id:'w_streak5',   desc:'Achieve 5-day visit streak',  xp:70, check:function(p){ return parseInt(localStorage.getItem('streak')||'0') >= 5; } },
    { id:'w_xp100',     desc:'Earn 100+ XP this week',      xp:60, check:function(p){ return (p._weeklyXpGain||0) >= 100; } },
    { id:'w_scroll100', desc:'Reach 100% scroll depth',     xp:50, check:function(p){ return (p.scrollMax||0) >= 100; } },
    { id:'w_10achvs',   desc:'Have 10+ achievements total', xp:75, check:function(p){ return countUnlocked(p) >= 10; } },
    { id:'w_social3',   desc:'3 multiplayer interactions',   xp:65, check:function(p){ return (p._mpInteractions||0) >= 3; } },
    { id:'w_level5',    desc:'Reach Level 5',                xp:60, check:function(p){ return computeLevel(p.xp||0) >= 5; } }
  ];

  // ════════════════════════════════════════════════════════
  // STATE HELPERS
  // ════════════════════════════════════════════════════════

  function getProfile() {
    return window.VDna ? window.VDna.get() : {};
  }

  function saveProfile() {
    if (window.VDna) window.VDna.save();
  }

  function countUnlocked(p) {
    var u = p.unlocked || {};
    return Object.keys(u).length;
  }

  function isUnlocked(p, id) {
    return !!(p.unlocked && p.unlocked[id]);
  }

  function computeLevel(xp) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) return i + 1;
    }
    return 1;
  }

  function getLevelInfo(level) {
    var l = LEVELS[level - 1] || LEVELS[0];
    var next = LEVELS[level] || LEVELS[LEVELS.length - 1];
    return { name: l.name, color: l.color, xpFloor: l.xp, xpCeil: next.xp };
  }

  // ════════════════════════════════════════════════════════
  // COMBO SYSTEM
  // ════════════════════════════════════════════════════════

  var comboCount = 0, comboTimer = null;
  function comboHit() {
    comboCount++;
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(function() {
      comboCount = 0;
      var el = document.getElementById('comboIndicator');
      if (el) el.classList.remove('show');
    }, 8000);
    if (comboCount >= 2) {
      var el = document.getElementById('comboIndicator');
      if (el) {
        var cc = document.getElementById('comboCount');
        var cm = document.getElementById('comboMult');
        if (cc) cc.textContent = '×' + comboCount;
        if (cm) cm.textContent = Math.min(comboCount, 5) + '× XP';
        el.classList.add('show');
      }
    }
    return Math.min(comboCount, 5);
  }

  // ════════════════════════════════════════════════════════
  // PROGRESSION ENGINE
  // ════════════════════════════════════════════════════════

  var _addXpDepth = 0;
  function addXp(n) {
    var p = getProfile();
    var prestige = p.prestige || 0;
    var prestigeMult = prestige > 0
      ? PRESTIGE_TIERS[Math.min(prestige, PRESTIGE_TIERS.length) - 1].mult : 1.0;
    var mpMult = typeof window._mpXpMultiplier === 'function' ? window._mpXpMultiplier() : 1;
    var total = Math.round(n * mpMult * prestigeMult);
    p.xp = (p.xp || 0) + total;

    // Track weekly XP gain
    p._weeklyXpGain = (p._weeklyXpGain || 0) + total;

    var oldLevel = p.level || 1;
    p.level = computeLevel(p.xp);
    saveProfile();
    updateXpUI();

    if (window._haptic && n >= 5) window._haptic.xp();

    // Level up check
    if (p.level > oldLevel) {
      queueToast({ _levelUp: true, level: p.level });
      syncLeaderboard();
    }

    // XP milestones + challenge check (skip if re-entrant to prevent deep recursion)
    if (_addXpDepth < 3) {
      _addXpDepth++;
      if (p.xp >= 50)   unlock('xp_50');
      if (p.xp >= 200)  unlock('xp_200');
      if (p.xp >= 1000) unlock('xp_1000');
      checkChallengeProgress();
      _addXpDepth--;
    }
  }

  function prestige() {
    var p = getProfile();
    if (p.level < 20) return false;
    p.prestige = (p.prestige || 0) + 1;
    p.xp = 0;
    p.level = 1;
    saveProfile();
    updateXpUI();

    if (p.prestige === 1) unlock('legend');
    if (p.prestige >= 3)  unlock('transcendent');

    syncLeaderboard();
    return true;
  }

  // ════════════════════════════════════════════════════════
  // SKILL BRANCHES
  // ════════════════════════════════════════════════════════

  var BRANCH_ACHVS = {
    explorer: ['explorer_timeline','explorer_certs','explorer_testimonials','explorer_conferences',
               'explorer_articles','explorer_impact','explorer_contact','explorer_full','explorer',
               'speed','deep','explorer_i','explorer_ii','explorer_iii'],
    social:   ['connector','social','scholar','certified','shaker','guestbook_signed','voice_used',
               'palette_used','terminal_used','networking_event','team_player','hacker_coop',
               'angel_investor','critical_mass','social_i','social_ii','social_iii'],
    gamer:    ['arcade_first','arcade_5plays','arcade_highscore','arcade_allgames','arcade_boss',
               'qa_tester','gamer_i','gamer_ii','gamer_iii'],
    hacker:   ['terminal_used','palette_used','theme_zen','secret',
               'matrix_dweller','speed_demon']
  };

  function getBranchLevel(branchId) {
    var p = getProfile();
    var ids = BRANCH_ACHVS[branchId] || [];
    var unlocked = 0;
    ids.forEach(function(id) { if (isUnlocked(p, id)) unlocked++; });
    var pct = ids.length > 0 ? unlocked / ids.length : 0;
    var tier = Math.min(Math.floor(pct * 5), 4);
    return { tier: tier, tierName: BRANCH_TIERS[tier], pct: Math.round(pct * 100), unlocked: unlocked, total: ids.length };
  }

  function getAllBranches() {
    return {
      explorer: getBranchLevel('explorer'),
      social:   getBranchLevel('social'),
      gamer:    getBranchLevel('gamer'),
      hacker:   getBranchLevel('hacker')
    };
  }

  function checkRenaissance() {
    var b = getAllBranches();
    if (b.explorer.tier >= 4 && b.social.tier >= 4 && b.gamer.tier >= 4 && b.hacker.tier >= 4) {
      unlock('renaissance');
    }
  }

  // ════════════════════════════════════════════════════════
  // UNLOCK ENGINE (unified Achieve.check + checkTrophy)
  // ════════════════════════════════════════════════════════

  var unlockShown = {};
  var toastQueue = [];
  var toastActive = false;

  function unlock(id) {
    if (unlockShown[id]) return false;
    var p = getProfile();
    if (isUnlocked(p, id)) return false;

    var achv = ACHV_MAP[id];
    if (!achv) return false;

    // Chain prerequisite check
    if (achv.chain && !isUnlocked(p, achv.chain)) return false;

    unlockShown[id] = true;
    if (!p.unlocked) p.unlocked = {};
    p.unlocked[id] = Date.now();

    // Also keep legacy achievements array for backwards compat
    if (!p.achievements) p.achievements = [];
    if (!p.achievements.includes(id)) p.achievements.push(id);
    if (!p.achieveTimes) p.achieveTimes = {};
    p.achieveTimes[id] = Date.now();

    saveProfile();

    // XP with combo
    var mult = comboHit();
    var xp = achv.xp * (mult >= 2 ? mult : 1);
    var earnedXp = xp;
    addXp(xp);

    // Track weekly unlocks
    p._weeklyUnlocks = (p._weeklyUnlocks || 0) + 1;
    saveProfile();

    // Queue toast (skip silent exploration toasts)
    if (!SILENT_EXPLORE.includes(id)) {
      queueToast({
        icon: achv.icon, name: achv.name, desc: achv.desc,
        rarity: achv.rarity, xp: earnedXp, combo: mult,
        secret: achv.secret
      });
    }

    // Notification dot
    var dot = document.getElementById('trophyDot');
    if (dot) dot.style.display = 'block';

    // Meta-checks
    var total = countUnlocked(p);
    if (total >= 15) unlock('collector');
    if (total >= 40) unlock('completionist');

    checkRenaissance();
    checkChallengeProgress();

    // Auto lazy-mint NFT for this achievement
    if (window._nft) window._nft.lazyMint(id);

    return true;
  }

  // ════════════════════════════════════════════════════════
  // TOAST SYSTEM
  // ════════════════════════════════════════════════════════

  function queueToast(item) {
    toastQueue.push(item);
    if (!toastActive) processToastQueue();
  }

  function processToastQueue() {
    if (window._isSiteReady && !window._isSiteReady()) {
      setTimeout(processToastQueue, 500);
      return;
    }
    if (toastQueue.length === 0) { toastActive = false; return; }
    toastActive = true;
    var item = toastQueue.shift();
    if (item._levelUp) showLevelUpToast(item);
    else showAchievementToast(item);
    setTimeout(processToastQueue, 4800);
  }

  function showAchievementToast(data) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    var r = data.rarity || 'common';
    var meta = RARITY_META[r] || RARITY_META.common;
    var comboStr = data.combo >= 2 ? ' (×' + data.combo + ' combo!)' : '';
    if (window.UniToast && typeof window.UniToast === 'object' && window.UniToast.add) {
      window.UniToast.add(
        data.icon + ' ' + data.name,
        data.desc + ' · +' + data.xp + ' XP' + comboStr,
        data.icon,
        r === 'mythic' || r === 'legendary' || r === 'epic' ? 'accent' : 'default'
      );
    } else {
      toast.className = 'uni-toast';
      toast.dataset.type = r;
      var _esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
      toast.innerHTML = '<div class="uni-toast-icon">' + _esc(data.icon) + '</div>' +
        '<div class="uni-toast-content">' +
          '<div class="uni-toast-title">' + _esc('Achievement: ' + data.name) + '</div>' +
          '<div class="uni-toast-meta">' + _esc(data.desc + ' · +' + data.xp + ' XP' + comboStr) + '</div>' +
        '</div>';
      container.appendChild(toast);
      setTimeout(function() { toast.classList.add('show'); }, 50);
      setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 500); }, 4200);
    }

    if (window._haptic && window._userHasInteracted) {
      if (r === 'mythic' || r === 'legendary' || r === 'epic') window._haptic.trophyRare();
      else window._haptic.trophy();
    }
  }

  function showLevelUpToast(item) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    var info = getLevelInfo(item.level);
    if (window.UniToast && typeof window.UniToast === 'object' && window.UniToast.add) {
      window.UniToast.add('🎉 Level Up!', 'You reached Level ' + item.level + ': ' + info.name, '🎉', 'accent');
    } else {
      toast.className = 'uni-toast';
      toast.dataset.type = 'accent';
      var _esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
      toast.innerHTML = '<div class="uni-toast-icon">🎉</div>' +
        '<div class="uni-toast-content">' +
          '<div class="uni-toast-title">' + _esc('Level Up!') + '</div>' +
          '<div class="uni-toast-meta">' + _esc('You reached Level ' + item.level + ': ' + info.name) + '</div>' +
        '</div>';
      container.appendChild(toast);
      setTimeout(function() { toast.classList.add('show'); }, 50);
      setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 500); }, 4200);
    }

    if (window._haptic && window._userHasInteracted) window._haptic.levelUp();
  }

  // ════════════════════════════════════════════════════════
  // XP UI
  // ════════════════════════════════════════════════════════

  function updateXpUI() {
    var p = getProfile();
    var level = p.level || 1;
    var info = getLevelInfo(level);
    var pct = info.xpCeil > info.xpFloor
      ? Math.min(((p.xp - info.xpFloor) / (info.xpCeil - info.xpFloor)) * 100, 100) : 100;
    var xpText = document.getElementById('xpText');
    var xpFill = document.getElementById('xpBarFill');
    var xpLvl  = document.getElementById('xpLevel');
    if (xpText) xpText.textContent = (p.xp || 0) + ' XP';
    if (xpFill) xpFill.style.width = pct + '%';
    if (xpLvl) {
      var prestige = p.prestige || 0;
      var stars = prestige > 0 ? ' ' + (PRESTIGE_TIERS[Math.min(prestige,PRESTIGE_TIERS.length)-1]||PRESTIGE_TIERS[0]).icon : '';
      xpLvl.textContent = 'LVL ' + level + ' · ' + info.name + stars;
      xpLvl.style.color = info.color;
      try {
        if (info.color.startsWith('#')) {
          var r2 = parseInt(info.color.slice(1,3),16), g2 = parseInt(info.color.slice(3,5),16), b2 = parseInt(info.color.slice(5,7),16);
          xpLvl.style.background = 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',0.1)';
        } else {
          xpLvl.style.background = info.color.replace(')', ',0.1)').replace('var(','rgba(').replace('--sub','107,122,144').replace('--accent','0,225,255');
        }
      } catch(e) {}
    }
  }

  // ════════════════════════════════════════════════════════
  // CHALLENGE SYSTEM
  // ════════════════════════════════════════════════════════

  function seedHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function getDailySeed() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  }

  function getWeeklySeed() {
    var d = new Date();
    var oneJan = new Date(d.getFullYear(), 0, 1);
    var week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + week;
  }

  function getActiveDaily() {
    var seed = getDailySeed();
    var idx = seedHash(seed) % DAILY_POOL.length;
    return { seed: seed, challenge: DAILY_POOL[idx] };
  }

  function getActiveWeekly() {
    var seed = getWeeklySeed();
    var idx = seedHash(seed) % WEEKLY_POOL.length;
    return { seed: seed, challenge: WEEKLY_POOL[idx] };
  }

  function initChallenges() {
    var p = getProfile();
    if (!p._challengeState) p._challengeState = {};
    var cs = p._challengeState;

    // Daily reset
    var daily = getActiveDaily();
    if (cs.dailySeed !== daily.seed) {
      var wasConsecutive = false;
      if (cs.dailyDone && cs.dailySeed) {
        var parts = cs.dailySeed.split('-');
        var prev = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        var today = new Date();
        today.setHours(0,0,0,0);
        var diff = (today - prev) / 86400000;
        wasConsecutive = diff === 1;
      }
      cs.dailyStreak = wasConsecutive ? (cs.dailyStreak || 0) + 1 : 0;
      cs.dailySeed = daily.seed;
      cs.dailyDone = false;
    }

    // Weekly reset
    var weekly = getActiveWeekly();
    if (cs.weeklySeed !== weekly.seed) {
      cs.weeklySeed = weekly.seed;
      cs.weeklyDone = false;
      p._weeklyUnlocks = 0;
      p._weeklyXpGain = 0;
    }

    // Snapshot arcade plays at session start
    var arcade;try{arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){arcade={};}
    p._arcadePlaysAtStart = arcade.totalPlays || 0;

    saveProfile();
  }

  function checkChallengeProgress() {
    var p = getProfile();
    if (!p._challengeState) return;
    var cs = p._challengeState;

    // Daily
    if (!cs.dailyDone) {
      var daily = getActiveDaily();
      if (daily.challenge.check(p)) {
        cs.dailyDone = true;
        addXp(daily.challenge.xp);
        if (window.UniToast && window.UniToast.add) window.UniToast.add('Daily Challenge Complete!', '+' + daily.challenge.xp + ' XP', '📅', 'accent');
        // Streak check
        if ((cs.dailyStreak || 0) >= 7) unlock('dedicated');
        updateChallengeHUD();
        saveProfile();
      }
    }

    // Weekly
    if (!cs.weeklyDone) {
      var weekly = getActiveWeekly();
      if (weekly.challenge.check(p)) {
        cs.weeklyDone = true;
        cs.weeklyCount = (cs.weeklyCount || 0) + 1;
        addXp(weekly.challenge.xp);
        if (window.UniToast && window.UniToast.add) window.UniToast.add('Weekly Challenge Complete!', '+' + weekly.challenge.xp + ' XP', '📆', 'accent');
        if ((cs.weeklyCount || 0) >= 4) unlock('committed');
        saveProfile();
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // CHALLENGE HUD (small fixed widget)
  // ════════════════════════════════════════════════════════

  var challengeHUD = null;
  function createChallengeHUD() {
    if (challengeHUD) return;
    challengeHUD = document.createElement('div');
    challengeHUD.className = 'challenge-hud';
    challengeHUD.addEventListener('click', function() { openCase('challenges'); });
    document.body.appendChild(challengeHUD);
    updateChallengeHUD();
    setTimeout(function() { challengeHUD.classList.add('show'); }, 5000);
  }

  function updateChallengeHUD() {
    if (!challengeHUD) return;
    var p = getProfile();
    var cs = p._challengeState || {};
    var daily = getActiveDaily();
    var done = cs.dailyDone;
    challengeHUD.innerHTML = '<span class="challenge-hud-icon">' + (done ? '✅' : '📅') + '</span>' +
      '<span class="challenge-hud-text">' + (done ? 'Daily done!' : daily.challenge.desc) + '</span>';
    if (done) challengeHUD.classList.add('done');
    else challengeHUD.classList.remove('done');
  }

  // ════════════════════════════════════════════════════════
  // LEADERBOARD (Supabase)
  // ════════════════════════════════════════════════════════

  function getPlayerName() {
    return localStorage.getItem('arcade_player_name') || null;
  }

  function promptPlayerName() {
    var name = prompt('Enter your name for the leaderboard:');
    if (name && name.trim()) {
      name = name.trim().slice(0, 20);
      localStorage.setItem('arcade_player_name', name);
      return name;
    }
    return null;
  }

  function syncLeaderboard() {
    if (!window._sb) return;
    var name = getPlayerName();
    if (!name) return;
    var p = getProfile();
    var arcade;try{arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){arcade={};}
    var hs = arcade.highScores || {};
    var totalArcade = 0;
    Object.values(hs).forEach(function(v) { totalArcade += v; });

    window._sb.from('gamification_profiles').upsert({
      player_name: name,
      xp: p.xp || 0,
      level: p.level || 1,
      prestige: p.prestige || 0,
      achievements_count: countUnlocked(p),
      total_arcade_score: totalArcade,
      daily_streak: (p._challengeState && p._challengeState.dailyStreak) || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_name' }).then(function() {}).catch(function() {});
  }

  function fetchLeaderboard(type, callback) {
    if (!window._sb) { callback([]); return; }
    var query;
    if (type === 'arcade') {
      query = window._sb.from('gamification_profiles')
        .select('player_name, total_arcade_score, level, prestige')
        .order('total_arcade_score', { ascending: false }).limit(25);
    } else if (type === 'weekly') {
      var weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = window._sb.from('gamification_profiles')
        .select('player_name, xp, level, prestige')
        .gte('updated_at', weekAgo.toISOString())
        .order('xp', { ascending: false }).limit(25);
    } else {
      query = window._sb.from('gamification_profiles')
        .select('player_name, xp, level, prestige, achievements_count')
        .order('xp', { ascending: false }).limit(25);
    }
    query.then(function(res) { callback(res.data || []); })
         .catch(function() { callback([]); });
  }

  // ════════════════════════════════════════════════════════
  // TROPHY CASE UI
  // ════════════════════════════════════════════════════════

  var caseOverlay = null;
  var activeTab = 'achievements';

  function createCaseOverlay() {
    if (caseOverlay) return;
    caseOverlay = document.createElement('div');
    caseOverlay.id = 'gameCaseOverlay';
    caseOverlay.addEventListener('click', function(e) { if (e.target === caseOverlay) closeCase(); });
    caseOverlay.innerHTML =
      '<div class="gc-panel">' +
        '<div class="gc-tabs">' +
          '<button class="gc-tab active" data-tab="achievements">Achievements</button>' +
          '<button class="gc-tab" data-tab="progress">Progress</button>' +
          '<button class="gc-tab" data-tab="challenges">Challenges</button>' +
          '<button class="gc-tab" data-tab="leaderboard">Leaderboard</button>' +
          '<button class="gc-tab" data-tab="nfts">NFTs</button>' +
        '</div>' +
        '<div class="gc-body" id="gcBody"></div>' +
        '<div class="gc-close" id="gcClose">[ ESC or tap to close ]</div>' +
      '</div>';
    document.body.appendChild(caseOverlay);
    caseOverlay.querySelectorAll('.gc-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        caseOverlay.querySelectorAll('.gc-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        renderTab(activeTab);
        if (window._haptic) window._haptic.tap();
      });
    });
    document.getElementById('gcClose').addEventListener('click', closeCase);
  }

  function openCase(tab) {
    createCaseOverlay();
    if (tab) {
      activeTab = tab;
      caseOverlay.querySelectorAll('.gc-tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
    }
    renderTab(activeTab);
    caseOverlay.classList.add('show');
    if (window._haptic) window._haptic.menuOpen();
    var dot = document.getElementById('trophyDot'); if (dot) dot.style.display = 'none';
    var trBtn = document.getElementById('trophyBtn'); if (trBtn) trBtn.classList.add('active');
    if (window.autoDismiss) window.autoDismiss('gameCaseOverlay', closeCase);
  }

  function closeCase() {
    if (caseOverlay) caseOverlay.classList.remove('show');
    if (window._haptic) window._haptic.menuClose();
    var trBtn = document.getElementById('trophyBtn'); if (trBtn) trBtn.classList.remove('active');
    if (window.cancelAutoDismiss) window.cancelAutoDismiss('gameCaseOverlay');
  }

  function renderTab(tab) {
    var body = document.getElementById('gcBody');
    if (!body) return;
    switch (tab) {
      case 'achievements': renderAchievementsTab(body); break;
      case 'progress':     renderProgressTab(body); break;
      case 'challenges':   renderChallengesTab(body); break;
      case 'leaderboard':  renderLeaderboardTab(body); break;
      case 'nfts':         if (window._nft) window._nft.renderNFTsTab(body); else body.innerHTML = '<div class="nft-empty">NFT engine loading...</div>'; break;
    }
  }

  function renderAchievementsTab(body) {
    var p = getProfile();
    var total = ACHIEVEMENTS.length;
    var unlocked = countUnlocked(p);
    var cats = ['explore','social','arcade','milestone','meta'];
    var catLabels = { explore:'Exploration', social:'Social', arcade:'Arcade', milestone:'Milestone', meta:'Secret & Meta' };
    var html = '<div class="gc-achv-header">' +
      '<span class="gc-achv-count">' + unlocked + '/' + total + ' Achievements</span>' +
      '</div>';

    cats.forEach(function(cat) {
      var items = ACHIEVEMENTS.filter(function(a) { return a.cat === cat; });
      if (items.length === 0) return;
      var catUnlocked = items.filter(function(a) { return isUnlocked(p, a.id); }).length;
      html += '<div class="gc-cat-label">' + catLabels[cat] + ' (' + catUnlocked + '/' + items.length + ')</div>';
      html += '<div class="gc-achv-grid">';
      // Sort: unlocked first, then by rarity desc
      items.sort(function(a, b) {
        var aU = isUnlocked(p, a.id) ? 0 : 1;
        var bU = isUnlocked(p, b.id) ? 0 : 1;
        if (aU !== bU) return aU - bU;
        return (RARITY_META[b.rarity] || {}).order - (RARITY_META[a.rarity] || {}).order;
      });
      items.forEach(function(a) {
        var u = isUnlocked(p, a.id);
        var hidden = a.secret && !u;
        var meta = RARITY_META[a.rarity] || RARITY_META.common;
        var time = u && p.achieveTimes && p.achieveTimes[a.id]
          ? new Date(p.achieveTimes[a.id]).toLocaleDateString() : '';
        var nftBadge = '';
        if (u && window._nft) {
          var nftEntry = window._nft.getLazyMintedById(a.id);
          if (nftEntry) {
            nftBadge = nftEntry.materialized
              ? '<span class="gc-achv-nft on-chain" title="On-chain NFT">⛓️</span>'
              : '<span class="gc-achv-nft off-chain" title="NFT Collected">☁️</span>';
          }
        }
        html += '<div class="gc-achv ' + (u ? 'unlocked' : 'locked') + ' ' + a.rarity + '">' +
          nftBadge +
          '<div class="gc-achv-icon">' + (hidden ? '❓' : u ? a.icon : '🔒') + '</div>' +
          '<div class="gc-achv-name">' + (hidden ? '???' : a.name) + '</div>' +
          '<div class="gc-achv-desc">' + (hidden ? 'Hidden achievement' : a.desc) + '</div>' +
          '<span class="gc-achv-rarity" style="color:' + meta.color + '">' + a.xp + ' XP</span>' +
          (time ? '<div class="gc-achv-time">' + time + '</div>' : '') +
          '</div>';
      });
      html += '</div>';
    });
    body.innerHTML = html;
  }

  function renderProgressTab(body) {
    var p = getProfile();
    var level = p.level || 1;
    var info = getLevelInfo(level);
    var prestige = p.prestige || 0;
    var pct = info.xpCeil > info.xpFloor
      ? Math.min(((p.xp - info.xpFloor) / (info.xpCeil - info.xpFloor)) * 100, 100) : 100;
    var stars = '';
    for (var i = 0; i < prestige; i++) {
      stars += (PRESTIGE_TIERS[Math.min(i, 2)] || PRESTIGE_TIERS[0]).icon;
    }

    var branches = getAllBranches();
    var branchHtml = '';
    ['explorer','social','gamer','hacker'].forEach(function(bId) {
      var b = branches[bId];
      var label = bId.charAt(0).toUpperCase() + bId.slice(1);
      branchHtml += '<div class="gc-branch">' +
        '<div class="gc-branch-label">' + label + ' <span class="gc-branch-tier">' + b.tierName + '</span></div>' +
        '<div class="gc-branch-bar"><div class="gc-branch-fill gc-branch-' + bId + '" style="width:' + b.pct + '%"></div></div>' +
        '<div class="gc-branch-stat">' + b.unlocked + '/' + b.total + '</div>' +
        '</div>';
    });

    var canPrestige = level >= 20;

    var html = '<div class="gc-progress-header">' +
      '<div class="gc-level-big" style="color:' + info.color + '">LVL ' + level + (stars ? ' ' + stars : '') + '</div>' +
      '<div class="gc-level-name">' + info.name + '</div>' +
      '</div>' +
      '<div class="gc-xp-section">' +
        '<div class="gc-xp-bar"><div class="gc-xp-fill" style="width:' + pct + '%;background:' + info.color + '"></div></div>' +
        '<div class="gc-xp-label">' + (p.xp||0) + ' / ' + info.xpCeil + ' XP</div>' +
      '</div>' +
      '<div class="gc-stats-row">' +
        '<div class="gc-stat"><div class="gc-stat-val">' + (p.xp||0) + '</div><div class="gc-stat-lbl">Total XP</div></div>' +
        '<div class="gc-stat"><div class="gc-stat-val">' + countUnlocked(p) + '</div><div class="gc-stat-lbl">Achievements</div></div>' +
        '<div class="gc-stat"><div class="gc-stat-val">' + (p.visits||1) + '</div><div class="gc-stat-lbl">Visits</div></div>' +
        '<div class="gc-stat"><div class="gc-stat-val">' + (parseInt(localStorage.getItem('streak')||'0')) + '</div><div class="gc-stat-lbl">Streak</div></div>' +
      '</div>' +
      '<div class="gc-section-title">Skill Branches</div>' +
      branchHtml +
      (canPrestige ? '<button class="gc-prestige-btn" id="gcPrestigeBtn">⭐ Prestige (Reset to Level 1, keep achievements, earn XP faster)</button>' : '') +
      '<div class="gc-share-row"><button class="gc-share-btn" id="gcShareBtn"><i class="fa-solid fa-share" style="margin-right:4px"></i>Share Progress</button></div>';

    body.innerHTML = html;

    if (canPrestige) {
      document.getElementById('gcPrestigeBtn').addEventListener('click', function() {
        if (confirm('Prestige will reset your XP and level to 1, but you keep all achievements and earn XP faster. Continue?')) {
          prestige();
          renderTab('progress');
        }
      });
    }
    document.getElementById('gcShareBtn').addEventListener('click', shareProgress);
  }

  function renderChallengesTab(body) {
    var p = getProfile();
    var cs = p._challengeState || {};
    var daily = getActiveDaily();
    var weekly = getActiveWeekly();

    var html = '<div class="gc-section-title">Daily Challenge</div>' +
      '<div class="gc-challenge ' + (cs.dailyDone ? 'done' : '') + '">' +
        '<div class="gc-challenge-icon">' + (cs.dailyDone ? '✅' : '📅') + '</div>' +
        '<div class="gc-challenge-body">' +
          '<div class="gc-challenge-desc">' + daily.challenge.desc + '</div>' +
          '<div class="gc-challenge-xp">+' + daily.challenge.xp + ' XP</div>' +
        '</div>' +
      '</div>' +
      '<div class="gc-challenge-streak">Daily Streak: ' + (cs.dailyStreak || 0) + ' 🔥</div>' +
      '<div class="gc-section-title">Weekly Challenge</div>' +
      '<div class="gc-challenge ' + (cs.weeklyDone ? 'done' : '') + '">' +
        '<div class="gc-challenge-icon">' + (cs.weeklyDone ? '✅' : '📆') + '</div>' +
        '<div class="gc-challenge-body">' +
          '<div class="gc-challenge-desc">' + weekly.challenge.desc + '</div>' +
          '<div class="gc-challenge-xp">+' + weekly.challenge.xp + ' XP</div>' +
        '</div>' +
      '</div>' +
      '<div class="gc-challenge-streak">Weeklies Completed: ' + (cs.weeklyCount || 0) + '</div>';
    body.innerHTML = html;
  }

  function renderLeaderboardTab(body) {
    var html = '<div class="gc-lb-tabs">' +
      '<button class="gc-lb-tab active" data-lb="alltime">All-Time</button>' +
      '<button class="gc-lb-tab" data-lb="weekly">Weekly</button>' +
      '<button class="gc-lb-tab" data-lb="arcade">Arcade</button>' +
      '</div>' +
      '<div class="gc-lb-body" id="gcLbBody"><div class="gc-lb-loading">Loading...</div></div>';
    body.innerHTML = html;

    body.querySelectorAll('.gc-lb-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        body.querySelectorAll('.gc-lb-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        loadLeaderboard(tab.dataset.lb);
        if (window._haptic) window._haptic.tap();
      });
    });

    loadLeaderboard('alltime');
  }

  function loadLeaderboard(type) {
    var lbBody = document.getElementById('gcLbBody');
    if (!lbBody) return;
    lbBody.innerHTML = '<div class="gc-lb-loading">Loading...</div>';

    fetchLeaderboard(type, function(data) {
      if (!data || data.length === 0) {
        lbBody.innerHTML = '<div class="gc-lb-empty">No entries yet. Be the first!</div>';
        return;
      }
      var myName = getPlayerName();
      var medals = ['🥇','🥈','🥉'];
      var scoreKey = type === 'arcade' ? 'total_arcade_score' : 'xp';
      var html = '<div class="gc-lb-list">';
      data.forEach(function(row, i) {
        var isMe = myName && row.player_name === myName;
        var rank = i < 3 ? medals[i] : '#' + (i + 1);
        var prestigeStars = '';
        for (var s = 0; s < (row.prestige || 0); s++) prestigeStars += '⭐';
        var _esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
        html += '<div class="gc-lb-row' + (isMe ? ' gc-lb-me' : '') + '">' +
          '<span class="gc-lb-rank">' + rank + '</span>' +
          '<span class="gc-lb-name">' + _esc(row.player_name) + (prestigeStars ? ' ' + prestigeStars : '') + '</span>' +
          '<span class="gc-lb-score">' + (parseInt(row[scoreKey]) || 0) + (type === 'arcade' ? ' pts' : ' XP') + '</span>' +
          '<span class="gc-lb-lvl">LVL ' + (parseInt(row.level) || 1) + '</span>' +
          '</div>';
      });
      html += '</div>';

      if (!myName) {
        html += '<button class="gc-lb-join" id="gcLbJoin">Join the Leaderboard</button>';
      }
      lbBody.innerHTML = html;

      var joinBtn = document.getElementById('gcLbJoin');
      if (joinBtn) {
        joinBtn.addEventListener('click', function() {
          var name = promptPlayerName();
          if (name) { syncLeaderboard(); loadLeaderboard(type); }
        });
      }
    });
  }

  // ════════════════════════════════════════════════════════
  // SHARE PROGRESS
  // ════════════════════════════════════════════════════════

  function shareProgress() {
    var p = getProfile();
    var level = p.level || 1;
    var info = getLevelInfo(level);
    var prestige = p.prestige || 0;
    var stars = '';
    for (var i = 0; i < prestige; i++) stars += '⭐';
    var text = '🏆 I\'m Level ' + level + ' (' + info.name + ')' + (stars ? ' ' + stars : '') +
      ' on amrelharony.com!\n' +
      countUnlocked(p) + '/' + ACHIEVEMENTS.length + ' achievements · ' + (p.xp||0) + ' XP\n' +
      'Can you beat my score?';
    if (navigator.share) {
      navigator.share({ title: 'My Gamification Progress', text: text, url: 'https://amrelharony.com' }).catch(function(){});
    } else {
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('gcShareBtn');
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(function() { btn.innerHTML = '<i class="fa-solid fa-share" style="margin-right:4px"></i>Share Progress'; }, 2000); }
      });
    }
    var pp = getProfile();
    pp._shared = true;
    saveProfile();
  }

  // ════════════════════════════════════════════════════════
  // EXPLORATION TRACKER
  // ════════════════════════════════════════════════════════

  var exploredSections = new Set();

  function checkExploration() {
    var viewH = window.innerHeight;
    var p = getProfile();
    for (var trophyId in EXPLORE_SECTIONS) {
      if (exploredSections.has(trophyId)) continue;
      var el = document.querySelector(EXPLORE_SECTIONS[trophyId]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.top < viewH * 0.7 && r.bottom > viewH * 0.3) {
        exploredSections.add(trophyId);
        unlock(trophyId);
        if (exploredSections.size >= Object.keys(EXPLORE_SECTIONS).length) {
          unlock('explorer_full');
        }
      }
    }
    // Tiered explorer chains
    var viewed = (p.sectionsViewed || []).length;
    if (viewed >= 3) unlock('explorer_i');
    if (viewed >= 5) unlock('explorer_ii');
    if (viewed >= 8) unlock('explorer_iii');
  }

  // ════════════════════════════════════════════════════════
  // AUTO-CHECKS ON LOAD
  // ════════════════════════════════════════════════════════

  function autoCheck() {
    var p = getProfile();
    if (p.visits >= 3) unlock('regular');
    if (p.visits >= 3) unlock('visit_3');
    if (p.visits >= 10) unlock('visit_10');

    var cairoH = parseInt(new Date().toLocaleString('en-US',{timeZone:'Africa/Cairo',hour:'numeric',hour12:false}));
    if (cairoH >= 0 && cairoH < 5) {
      unlock('nightowl');
      var today = new Date().toDateString();
      if (p._nightVisitDate !== today) {
        var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        p._nightStreak = (p._nightVisitDate === yesterday.toDateString()) ? (p._nightStreak || 0) + 1 : 1;
        p._nightVisitDate = today;
        saveProfile();
        if (p._nightStreak >= 3) unlock('night_shift');
      }
    }

    var streak = parseInt(localStorage.getItem('streak') || '0');
    if (streak >= 5) unlock('streak5');

    if (p.tz && !p.tz.includes('Cairo') && !p.tz.includes('Africa')) unlock('globe');

    setTimeout(function() { unlock('deep'); }, 180000);

    if ((p.clickedLinks || []).length >= 5) unlock('social');

    var certClicks = (p.clickedLinks||[]).filter(function(l) {
      return l.includes('credly') || l.includes('certmetrics') || l.includes('cdmp') || l.includes('datacamp');
    });
    if (certClicks.length >= 3) unlock('certified');

    // Speed reader
    var loadTime = Date.now();
    var speedDone = false;
    var speedCheck = function() {
      if (speedDone) return;
      var pct = scrollY / (document.documentElement.scrollHeight - innerHeight);
      if (pct > 0.95 && (Date.now() - loadTime) < 30000) {
        speedDone = true;
        unlock('speed');
        removeEventListener('scroll', speedCheck);
      }
    };
    addEventListener('scroll', speedCheck, { passive: true });
    setTimeout(function() { speedDone = true; removeEventListener('scroll', speedCheck); }, 35000);

    // Speed demon (level 5 in <10 min)
    setTimeout(function() {
      if (computeLevel(getProfile().xp) >= 5) unlock('speed_demon');
    }, 600000);

    // Arcade checks
    var arcade;try{arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){arcade={};}
    if ((arcade.totalPlays||0) >= 1) { unlock('arcade_first'); unlock('gamer_i'); }
    if ((arcade.totalPlays||0) >= 5) { unlock('arcade_5plays'); unlock('gamer_ii'); }
    if (arcade.bossBeaten) unlock('arcade_boss');
    var hs = arcade.highScores || {};
    if (Object.keys(hs).length > 0) unlock('arcade_highscore');
    if (Object.keys(hs).length >= 4) { unlock('arcade_allgames'); unlock('gamer_iii'); }

    // XP milestones
    if ((p.xp||0) >= 50)   unlock('xp_50');
    if ((p.xp||0) >= 200)  unlock('xp_200');
    if ((p.xp||0) >= 1000) unlock('xp_1000');

    // Completionist
    if (countUnlocked(p) >= 15) unlock('collector');
    if (countUnlocked(p) >= 40) unlock('completionist');
  }

  // ════════════════════════════════════════════════════════
  // CLICK-BASED ACHIEVEMENT TRACKING
  // ════════════════════════════════════════════════════════

  function initClickTracking() {
    document.addEventListener('click', function() {
      var p = getProfile();
      if ((p.clickedLinks || []).length >= 5) unlock('social');
      var certs = (p.clickedLinks||[]).filter(function(l) {
        return l.includes('credly') || l.includes('certmetrics') || l.includes('cdmp') || l.includes('datacamp');
      });
      if (certs.length >= 3) unlock('certified');
    }, { passive: true });
  }

  // ════════════════════════════════════════════════════════
  // TERMINAL COMMANDS
  // ════════════════════════════════════════════════════════

  function registerTerminalCommands() {
    if (!window.TermCmds) window.TermCmds = {};
    var T = window.TermCmds;

    T.admin = function() { setTimeout(function() { openCase('progress'); }, 200); return '<span style="color:#ef4444">🏆 Opening Trophy Case & Progress...</span>'; };
    T.stats = T.admin;
    T.insights = T.admin;
    T.trophies = T.admin;
    T.trophy = T.admin;
    T.progress = T.admin;
    T.achievements = T.admin;

    T.xp = function() {
      var p = getProfile();
      var level = p.level || 1;
      var info = getLevelInfo(level);
      var prestige = p.prestige || 0;
      var pctFull = info.xpCeil > info.xpFloor ? (p.xp - info.xpFloor) / (info.xpCeil - info.xpFloor) : 1;
      var filled = Math.min(20, Math.round(pctFull * 20));
      var bar = '';
      for (var i = 0; i < filled; i++) bar += '█';
      for (var j = filled; j < 20; j++) bar += '░';
      var stars = '';
      for (var k = 0; k < prestige; k++) stars += '⭐';
      return '<span class="term-cyan">Level ' + level + ' ' + stars + '</span> — <span class="term-green">' + (p.xp||0) + ' XP</span>\n' +
        '<span class="term-gray">[' + bar + '] ' + ((p.xp||0) - info.xpFloor) + '/' + (info.xpCeil - info.xpFloor) + ' to next level</span>\n' +
        '<span class="term-gray">Achievements: ' + countUnlocked(p) + '/' + ACHIEVEMENTS.length + '</span>';
    };

    T.prestige = function() {
      var p = getProfile();
      if (p.level < 20) return '<span class="term-red">You must be Level 20 to prestige. Current: Level ' + (p.level||1) + '</span>';
      if (prestige()) {
        return '<span class="term-green">⭐ PRESTIGE! You are now Prestige ' + (p.prestige||1) + '. XP multiplier: ' + PRESTIGE_TIERS[Math.min((p.prestige||1)-1,2)].mult + 'x</span>';
      }
      return '<span class="term-red">Prestige failed.</span>';
    };

    T.challenges = function() {
      var p = getProfile();
      var cs = p._challengeState || {};
      var daily = getActiveDaily();
      var weekly = getActiveWeekly();
      return '<span class="term-cyan">Daily:</span> ' + daily.challenge.desc + (cs.dailyDone ? ' <span class="term-green">✅</span>' : '') +
        '\n<span class="term-cyan">Weekly:</span> ' + weekly.challenge.desc + (cs.weeklyDone ? ' <span class="term-green">✅</span>' : '') +
        '\n<span class="term-gray">Daily streak: ' + (cs.dailyStreak||0) + ' | Weeklies done: ' + (cs.weeklyCount||0) + '</span>';
    };

    T.leaderboard = function() {
      setTimeout(function() { openCase('leaderboard'); }, 200);
      return '<span class="term-green">🏆 Opening Leaderboard...</span>';
    };
    T.lb = T.leaderboard;

    T.branches = function() {
      var b = getAllBranches();
      var out = '';
      ['explorer','social','gamer','hacker'].forEach(function(id) {
        var br = b[id];
        out += '<span class="term-cyan">' + id + '</span>: ' + br.tierName + ' (' + br.pct + '%) ' + br.unlocked + '/' + br.total + '\n';
      });
      return out.trim();
    };
  }

  // ════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════

  function init() {
    if (!window.VDna) { setTimeout(init, 200); return; }
    var p = getProfile();
    if (!p.unlocked) p.unlocked = {};
    if (!p.prestige) p.prestige = 0;
    if (!p._challengeState) p._challengeState = {};
    if (!p.achieveTimes) p.achieveTimes = {};

    // Migrate legacy achievements to unlocked
    if (p.achievements && p.achievements.length > 0) {
      p.achievements.forEach(function(id) {
        if (!p.unlocked[id]) {
          p.unlocked[id] = (p.achieveTimes && p.achieveTimes[id]) || Date.now();
        }
      });
    }

    // Recompute level with new scale
    p.level = computeLevel(p.xp || 0);
    saveProfile();

    initChallenges();
    initClickTracking();

    // Deferred init (after site.js terminal and UI are fully wired)
    setTimeout(function() {
      registerTerminalCommands();
      autoCheck();
      updateXpUI();
      createChallengeHUD();
    }, 4000);

    // Exploration scroll listener (auto-removes once all sections explored)
    function _onScrollExplore() { requestAnimationFrame(function() { checkExploration(); if (exploredSections.size >= Object.keys(EXPLORE_SECTIONS).length) window.removeEventListener('scroll', _onScrollExplore); }); }
    window.addEventListener('scroll', _onScrollExplore, { passive: true });
    setTimeout(checkExploration, 6000);

    // Periodic challenge check
    setInterval(checkChallengeProgress, 15000);
  }

  // ════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════

  window._game = {
    unlock: unlock,
    addXp: addXp,
    prestige: prestige,
    openCase: openCase,
    closeCase: closeCase,
    getProfile: function() {
      var p = getProfile();
      return {
        xp: p.xp || 0, level: p.level || 1, prestige: p.prestige || 0,
        achievements: countUnlocked(p), totalAchievements: ACHIEVEMENTS.length,
        branches: getAllBranches()
      };
    },
    syncLeaderboard: syncLeaderboard,
    shareProgress: shareProgress,
    updateXpUI: updateXpUI,
    checkChallengeProgress: checkChallengeProgress,
    ACHIEVEMENTS: ACHIEVEMENTS,
    LEVELS: LEVELS
  };

  // Backward compat
  window.openTrophy = function() { openCase('achievements'); };
  window.closeTrophy = closeCase;
  window.shareTrophy = shareProgress;
  window.Achieve = { check: unlock };
  window.checkTrophy = unlock;
  window.showTrophyToast = function(id) { /* no-op, handled by unlock */ };
  window._openTrophies = function() { openCase('progress'); };
  window._closeAdmin = closeCase;

  init();

})();
