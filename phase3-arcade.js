// ═══════════════════════════════════════════════════════════════
// PHASE 3: THE AMR ARCADE — amrelharony.com
// Drop-in: <script src="phase3-arcade.js" defer></script>
//
// Features:
//   1. Arcade Hub (gamepad icon / > play command)
//   2. Time-of-Day Base Game assignment
//   3. Sprint Stacker (Morning — Tetris metaphor)
//   4. Data Mesh Router (Afternoon — Pipe mania)
//   5. FinTech Trader (Evening — wraps existing Snake)
//   6. Bilingual Swipe (Night — jargon matching)
//   7. Scope Defender (Level 5 — Space Invaders boss)
//   8. XP unlock progression
//   9. Rage Click Bug Bash easter egg
//
// Lazy-loaded: No game canvas runs until user opens a game
// ═══════════════════════════════════════════════════════════════
(function PhaseThreeArcade() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ───────────────────────────────────────
  // GAME DEFINITIONS
  // ───────────────────────────────────────
  const GAMES = {
    stacker:   { id:'stacker',   name:'Sprint Stacker',   icon:'🧱', tagline:'The Agile Leader',      desc:'Pack features into sprints before time runs out', period:'Morning',  time:'06:00–12:00', unlockLevel:1, color:'#22c55e' },
    router:    { id:'router',    name:'Data Mesh Router',  icon:'🔀', tagline:'The Data Expert',       desc:'Route data to the right business domains',        period:'Afternoon',time:'12:00–18:00', unlockLevel:1, color:'#3b82f6' },
    trader:    { id:'trader',    name:'FinTech Trader',    icon:'📈', tagline:'The FinTech Veteran',   desc:'Grow your portfolio, dodge margin calls',          period:'Evening',  time:'18:00–23:00', unlockLevel:1, color:'#00e1ff' },
    bilingual: { id:'bilingual', name:'Bilingual Swipe',   icon:'🌐', tagline:'The Communicator',      desc:'Match tech jargon to business value',              period:'Night',    time:'23:00–06:00', unlockLevel:1, color:'#a855f7' },
    defender:  { id:'defender',  name:'Scope Defender',    icon:'🛡️', tagline:'The Delivery Lead',     desc:'Defend the sprint from scope creep & prod bugs',   period:'Boss',     time:'Level 5',     unlockLevel:5, color:'#ef4444' },
  };

  const GAME_ORDER = ['stacker','router','trader','bilingual','defender'];
  const LEVEL_XP = [0, 50, 150, 300, 500]; // XP needed for levels 1-5

  // ───────────────────────────────────────
  // STATE
  // ───────────────────────────────────────
  function getArcadeState() {
    const raw = localStorage.getItem('arcade_state');
    const def = { baseGame:null, unlockedGames:[], highScores:{}, bossBeaten:false, totalPlays:0 };
    try { return raw ? { ...def, ...JSON.parse(raw) } : def; } catch(e) { return def; }
  }
  function saveArcadeState(s) { localStorage.setItem('arcade_state', JSON.stringify(s)); }

  function getPlayerLevel() {
    if (window.VDna) return window.VDna.get().level || 1;
    return 1;
  }
  function getPlayerXP() {
    if (window.VDna) return window.VDna.get().xp || 0;
    return 0;
  }
  function addXP(n) { if (window.VDna) window.VDna.addXp(n); }

  // Determine base game from Cairo time
  function getBaseGame() {
    const h = parseInt(new Date().toLocaleString('en-US',{timeZone:'Africa/Cairo',hour:'numeric',hour12:false}));
    if (h >= 6 && h < 12)  return 'stacker';
    if (h >= 12 && h < 18) return 'router';
    if (h >= 18 && h < 23) return 'trader';
    return 'bilingual';
  }

  // Initialize base game on first visit
  function initBaseGame() {
    const s = getArcadeState();
    if (!s.baseGame) {
      s.baseGame = getBaseGame();
      if (!s.unlockedGames.includes(s.baseGame)) s.unlockedGames.push(s.baseGame);
      saveArcadeState(s);
    }
    return s;
  }

  function isGameUnlocked(gameId) {
    const s = getArcadeState();
    const game = GAMES[gameId];
    if (!game) return false;
    // Base game always unlocked
    if (s.baseGame === gameId) return true;
    // Already in unlocked list
    if (s.unlockedGames.includes(gameId)) return true;
    // Check level
    const lvl = getPlayerLevel();
    if (lvl >= game.unlockLevel) {
      // Auto-unlock
      if (!s.unlockedGames.includes(gameId)) { s.unlockedGames.push(gameId); saveArcadeState(s); }
      return true;
    }
    return false;
  }

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase3-css';
  css.textContent = `
/* ARCADE HUB OVERLAY */
#arcadeOverlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .4s,visibility .4s;backdrop-filter:blur(14px);pointer-events:none}
#arcadeOverlay.show{opacity:1;visibility:visible;pointer-events:auto}
.arcade-hub{width:96%;max-width:420px;max-height:88vh;overflow-y:auto;padding:20px;border-radius:20px;background:linear-gradient(180deg,#080c16,#0d1420);border:1px solid #1a2332;transform:scale(.9);transition:transform .5s cubic-bezier(.16,1,.3,1)}
#arcadeOverlay.show .arcade-hub{transform:scale(1)}
.arcade-hub::-webkit-scrollbar{width:3px}.arcade-hub::-webkit-scrollbar-thumb{background:#1a2332;border-radius:3px}

.arcade-header{text-align:center;margin-bottom:16px}
.arcade-title{font-family:'JetBrains Mono',monospace;font-size:14px;letter-spacing:3px;text-transform:uppercase;background:linear-gradient(135deg,#00e1ff,#6366f1,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700}
.arcade-subtitle{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.5px;color:#4a5568;margin-top:4px}
.arcade-level-bar{display:flex;align-items:center;gap:8px;margin:12px 0 0;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid #1a2332}
.arcade-level-badge{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap}
.arcade-xp-track{flex:1;height:6px;border-radius:3px;background:#111827;overflow:hidden}
.arcade-xp-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#00e1ff,#6366f1,#a855f7);transition:width .8s cubic-bezier(.16,1,.3,1)}
.arcade-xp-text{font-family:'JetBrains Mono',monospace;font-size:8px;color:#4a5568;white-space:nowrap}
.arcade-base-tag{display:inline-flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:100px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#22c55e;margin-top:8px}

/* GAME CARDS */
.arcade-grid{display:flex;flex-direction:column;gap:8px}
.arcade-card{display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid #1a2332;cursor:pointer;transition:all .3s;position:relative;overflow:hidden;-webkit-tap-highlight-color:transparent}
.arcade-card:hover:not(.locked){background:rgba(255,255,255,.04);border-color:rgba(0,225,255,.15);transform:translateX(4px)}
.arcade-card.locked{opacity:.35;cursor:default;filter:grayscale(.8)}
.arcade-card.locked:hover{transform:none}
.arcade-card-glow{position:absolute;inset:0;opacity:0;transition:opacity .3s;pointer-events:none}
.arcade-card:hover:not(.locked) .arcade-card-glow{opacity:1}
.arcade-card-icon{font-size:28px;flex-shrink:0;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.03);border:1px solid #1a2332;transition:transform .3s}
.arcade-card:hover:not(.locked) .arcade-card-icon{transform:scale(1.1) rotate(5deg)}
.arcade-card-meta{flex:1;min-width:0}
.arcade-card-name{font-size:14px;font-weight:600;color:#e2e8f0}
.arcade-card-tagline{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;margin-top:1px}
.arcade-card-desc{font-size:10px;color:#4a5568;margin-top:3px}
.arcade-card-right{text-align:right;flex-shrink:0}
.arcade-card-score{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#00e1ff}
.arcade-card-plays{font-family:'JetBrains Mono',monospace;font-size:7px;color:#4a5568;letter-spacing:.5px;margin-top:1px}
.arcade-card-lock{font-size:18px;color:#4a5568}
.arcade-card-unlock{font-family:'JetBrains Mono',monospace;font-size:7px;color:#4a5568;letter-spacing:.5px;margin-top:2px}
.arcade-card.base-game{border-color:rgba(34,197,94,.15)}
.arcade-card.base-game::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22c55e,transparent)}
.arcade-card.boss-card{border-color:rgba(239,68,68,.15)}
.arcade-card.boss-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#ef4444,transparent)}

.arcade-close{text-align:center;margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#4a5568;opacity:.4;cursor:pointer}.arcade-close:hover{opacity:1;color:#00e1ff}

/* GAME OVERLAY (shared by all mini-games) */
#miniGameOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.97);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;pointer-events:none}
#miniGameOverlay.show{opacity:1;visibility:visible;pointer-events:auto}
.mg-container{width:96%;max-width:400px;max-height:90vh;overflow-y:auto;border-radius:16px;background:#080c14;border:1px solid #1a2332;transform:scale(.9);transition:transform .4s cubic-bezier(.16,1,.3,1)}
#miniGameOverlay.show .mg-container{transform:scale(1)}
.mg-hud{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#0a0f1a;border-bottom:1px solid #1a2332}
.mg-hud-item{text-align:center}
.mg-hud-val{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#00e1ff;line-height:1}
.mg-hud-val.good{color:#22c55e}.mg-hud-val.bad{color:#ef4444}
.mg-hud-label{font-family:'JetBrains Mono',monospace;font-size:6px;letter-spacing:1.5px;text-transform:uppercase;color:#4a5568;margin-top:2px}
.mg-canvas-wrap{padding:8px;position:relative;display:flex;justify-content:center}
.mg-canvas{display:block;border:1px solid #1a2332;border-radius:8px;background:#080c14;touch-action:none}
.mg-msg{font-family:'JetBrains Mono',monospace;font-size:10px;color:#8b949e;padding:6px 14px;min-height:24px;text-align:center}
.mg-msg .bonus{color:#fbbf24}.mg-msg .warn{color:#ef4444}.mg-msg .good{color:#22c55e}
.mg-hint{font-family:'JetBrains Mono',monospace;font-size:7px;color:#2d3748;padding:0 14px 4px;text-align:center}
.mg-btns{display:flex;gap:8px;justify-content:center;padding:8px 14px 12px}
.mg-btn{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;padding:7px 16px;border-radius:6px;border:1px solid #1a2332;background:#0d1420;color:#6b7280;cursor:pointer;transition:all .2s;flex:1;text-align:center;-webkit-tap-highlight-color:transparent}
.mg-btn:hover,.mg-btn:active{border-color:#00e1ff;color:#00e1ff}
.mg-title-bar{text-align:center;padding:8px 14px 0}
.mg-title{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}

/* BILINGUAL SWIPE */
.swipe-area{padding:12px;min-height:280px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:none}
.swipe-card{width:90%;max-width:300px;padding:24px 20px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid #1a2332;text-align:center;position:absolute;transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .3s;cursor:grab;user-select:none;-webkit-user-select:none}
.swipe-card.dragging{transition:none;cursor:grabbing}
.swipe-card.gone-left{transform:translateX(-150%) rotate(-20deg);opacity:0}
.swipe-card.gone-right{transform:translateX(150%) rotate(20deg);opacity:0}
.swipe-tech{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#00e1ff;margin-bottom:8px}
.swipe-term{font-size:20px;font-weight:700;color:#e2e8f0;margin-bottom:12px}
.swipe-options{display:flex;flex-direction:column;gap:6px}
.swipe-opt{padding:10px 14px;border-radius:10px;border:1px solid #1a2332;background:rgba(255,255,255,.02);font-size:12px;color:#8b949e;cursor:pointer;transition:all .2s;text-align:left;-webkit-tap-highlight-color:transparent}
.swipe-opt:hover{border-color:rgba(0,225,255,.2);color:#e2e8f0}
.swipe-opt.correct{border-color:#22c55e;color:#22c55e;background:rgba(34,197,94,.06)}
.swipe-opt.wrong{border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,.06)}
.swipe-labels{display:flex;justify-content:space-between;padding:0 20px;margin-top:0}
.swipe-label{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#4a5568;opacity:.4}
.swipe-progress{display:flex;gap:3px;justify-content:center;padding:4px 14px}
.swipe-pip{width:8px;height:3px;border-radius:2px;background:#1a2332;transition:background .3s}
.swipe-pip.done{background:#22c55e}.swipe-pip.wrong-pip{background:#ef4444}.swipe-pip.current{background:#00e1ff}

/* CONFETTI */
.confetti-piece{position:fixed;pointer-events:none;z-index:10001;font-size:14px;animation:confettiFall 3s ease-out forwards}
@keyframes confettiFall{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(100vh) rotate(720deg)}}

/* BUG BASH */
.bug-sprite{position:fixed;z-index:9995;font-size:24px;cursor:pointer;transition:none;user-select:none;-webkit-user-select:none;animation:bugScurry 4s ease-in-out forwards;pointer-events:auto;filter:drop-shadow(0 0 4px rgba(239,68,68,.4))}
@keyframes bugScurry{0%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translate(var(--bx),var(--by)) rotate(var(--br))}}
.bug-splat{position:fixed;z-index:9995;font-size:28px;pointer-events:none;animation:bugSplat .5s ease-out forwards}
@keyframes bugSplat{0%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}

@media print{#arcadeOverlay,#miniGameOverlay,.bug-sprite,.confetti-piece{display:none!important}}
@media(max-width:600px){.mg-hint{display:none}.arcade-card{padding:10px}.arcade-card-icon{width:36px;height:36px;font-size:22px}}
`;
  document.head.appendChild(css);

  // ───────────────────────────────────────
  // ARCADE HUB UI
  // ───────────────────────────────────────
  function createArcadeHub() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'arcadeOverlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeArcade(); });
    overlay.innerHTML = `<div class="arcade-hub" id="arcadeHub"></div>`;
    document.body.appendChild(overlay);

    // Mini-game overlay (shared canvas container)
    const gameOv = document.createElement('div');
    gameOv.id = 'miniGameOverlay';
    gameOv.addEventListener('click', e => { if (e.target === gameOv) closeMiniGame(); });
    gameOv.innerHTML = `<div class="mg-container" id="mgContainer"></div>`;
    document.body.appendChild(gameOv);
  }

  function renderArcadeHub() {
    const hub = document.getElementById('arcadeHub');
    if (!hub) return;
    const state = getArcadeState();
    const lvl = getPlayerLevel();
    const xp = getPlayerXP();
    const LEVEL_NAMES = ['Visitor','Curious','Explorer','Engaged','Fan','Superfan','Legend'];
    const LEVEL_COLORS = ['#6b7a90','#00e1ff','#3b82f6','#a855f7','#f97316','#ef4444','#fbbf24'];
    const lvlName = LEVEL_NAMES[lvl - 1] || 'Legend';
    const lvlColor = LEVEL_COLORS[lvl - 1] || '#fbbf24';
    const currLvlXp = LEVEL_XP[lvl - 1] || 0;
    const nextLvlXp = LEVEL_XP[lvl] || LEVEL_XP[LEVEL_XP.length - 1];
    const xpPct = Math.min(((xp - currLvlXp) / (nextLvlXp - currLvlXp)) * 100, 100);

    let cards = '';
    GAME_ORDER.forEach(id => {
      const g = GAMES[id];
      const unlocked = isGameUnlocked(id);
      const isBase = state.baseGame === id;
      const isBoss = id === 'defender';
      const hs = state.highScores[id] || 0;
      const cls = [
        'arcade-card',
        !unlocked ? 'locked' : '',
        isBase ? 'base-game' : '',
        isBoss ? 'boss-card' : ''
      ].filter(Boolean).join(' ');

      cards += `
        <div class="${cls}" data-game="${id}" ${unlocked ? '' : 'title="Locked"'}>
          <div class="arcade-card-glow" style="background:radial-gradient(circle at 30% 50%,${g.color}08,transparent 70%)"></div>
          <div class="arcade-card-icon" style="border-color:${unlocked ? g.color + '33' : '#1a2332'}">${unlocked ? g.icon : '🔒'}</div>
          <div class="arcade-card-meta">
            <div class="arcade-card-name">${g.name}</div>
            <div class="arcade-card-tagline" style="color:${unlocked ? g.color : '#4a5568'}">${g.tagline}${isBase ? ' · ⭐ Your base game' : ''}</div>
            <div class="arcade-card-desc">${g.desc}</div>
          </div>
          <div class="arcade-card-right">
            ${unlocked
              ? `<div class="arcade-card-score">${hs > 0 ? '$' + hs.toLocaleString() : '—'}</div>
                 <div class="arcade-card-plays">${g.period} ${g.time}</div>`
              : `<div class="arcade-card-lock">🔒</div>
                 <div class="arcade-card-unlock">Level ${g.unlockLevel}</div>`}
          </div>
        </div>`;
    });

    hub.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title">🕹️ Amr Arcade</div>
        <div class="arcade-subtitle">Each game reflects a side of my expertise</div>
        <div class="arcade-level-bar">
          <span class="arcade-level-badge" style="color:${lvlColor};background:${lvlColor}15">LVL ${lvl} · ${lvlName}</span>
          <div class="arcade-xp-track"><div class="arcade-xp-fill" style="width:${xpPct}%"></div></div>
          <span class="arcade-xp-text">${xp} XP</span>
        </div>
        <div class="arcade-base-tag"><i class="fa-solid fa-clock" style="font-size:8px"></i> Your base: ${GAMES[state.baseGame]?.name || '...'} (${GAMES[state.baseGame]?.period || ''})</div>
      </div>
      <div class="arcade-grid">${cards}</div>
      ${state.bossBeaten ? '<div style="text-align:center;margin-top:12px;font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#fbbf24;letter-spacing:1px">🏆 BOSS DEFEATED — ALL GAMES MASTERED</div>' : ''}
      <div class="arcade-close" onclick="window._closeArcade()">[ ESC or tap to close ]</div>
    `;

    // Bind card clicks
    hub.querySelectorAll('.arcade-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const gid = card.dataset.game;
        closeArcade();
        setTimeout(() => launchGame(gid), 300);
      });
    });
  }

  function openArcade() {
    initBaseGame();
    renderArcadeHub();
    document.getElementById('arcadeOverlay').classList.add('show');
    addXP(1);
  }
  function closeArcade() {
    document.getElementById('arcadeOverlay')?.classList.remove('show');
  }
  window._closeArcade = closeArcade;
  window._openArcade = openArcade;

  // ───────────────────────────────────────
  // MINI-GAME LAUNCHER
  // ───────────────────────────────────────
  let activeGameCleanup = null;

  function launchGame(gameId) {
    if (gameId === 'trader') {
      // Use existing snake game
      if (typeof window.openGame === 'function') window.openGame();
      return;
    }
    const container = document.getElementById('mgContainer');
    if (!container) return;
    // Clean up previous game
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }

    const g = GAMES[gameId];
    document.getElementById('miniGameOverlay').classList.add('show');

    const s = getArcadeState();
    s.totalPlays = (s.totalPlays || 0) + 1;
    saveArcadeState(s);

    switch (gameId) {
      case 'stacker':   activeGameCleanup = GameStacker(container, g); break;
      case 'router':    activeGameCleanup = GameRouter(container, g); break;
      case 'bilingual': activeGameCleanup = GameBilingual(container, g); break;
      case 'defender':  activeGameCleanup = GameDefender(container, g); break;
    }
  }

  function closeMiniGame() {
    document.getElementById('miniGameOverlay')?.classList.remove('show');
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
  }

  function recordScore(gameId, score) {
    const s = getArcadeState();
    if (!s.highScores[gameId] || score > s.highScores[gameId]) {
      s.highScores[gameId] = score;
    }
    saveArcadeState(s);
    addXP(Math.floor(score / 50) + 5);
  }

  // ═══════════════════════════════════════════════════
  // GAME 1: SPRINT STACKER (Tetris-style)
  // ═══════════════════════════════════════════════════
  function GameStacker(container, meta) {
    const COLS = 10, ROWS = 18, SZ = 16;
    const W = COLS * SZ, H = ROWS * SZ;
    let score = 0, lines = 0, level = 1, gameOver = false, paused = false;
    let interval = null, rafId = null;

    container.innerHTML = `
      <div class="mg-title-bar"><div class="mg-title" style="color:${meta.color}">🧱 Sprint Stacker</div></div>
      <div class="mg-hud">
        <div class="mg-hud-item"><div class="mg-hud-val good" id="ssScore">0</div><div class="mg-hud-label">Story Points</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="ssLines">0</div><div class="mg-hud-label">Sprints</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="ssLevel">1</div><div class="mg-hud-label">Velocity</div></div>
      </div>
      <div class="mg-canvas-wrap"><canvas id="ssCanvas" class="mg-canvas" width="${W}" height="${H}"></canvas></div>
      <div class="mg-msg" id="ssMsg">Pack features into sprints — clear rows to deliver!</div>
      <div class="mg-hint">← → move · ↑ rotate · ↓ drop · P pause</div>
      <div class="mg-btns"><button class="mg-btn" onclick="window._ssRestart()">↻ New Sprint</button><button class="mg-btn" onclick="window._closeMG()">✕ Close</button></div>`;

    const cv = document.getElementById('ssCanvas'), cx = cv.getContext('2d');
    // Board: 0 = empty, >0 = color index
    const board = Array.from({length:ROWS}, () => Array(COLS).fill(0));
    const COLORS = ['','#22c55e','#00e1ff','#6366f1','#a855f7','#f97316','#ef4444','#fbbf24'];
    // Tetrominos
    const SHAPES = [
      [[1,1,1,1]],                     // I
      [[1,1],[1,1]],                    // O
      [[0,1,0],[1,1,1]],               // T
      [[1,0,0],[1,1,1]],               // L
      [[0,0,1],[1,1,1]],               // J
      [[0,1,1],[1,1,0]],               // S
      [[1,1,0],[0,1,1]],               // Z
    ];

    let cur = null, cx2, cy2;

    function spawn() {
      const idx = Math.floor(Math.random() * SHAPES.length);
      const shape = SHAPES[idx].map(r => [...r]);
      cur = { shape, color: idx + 1 };
      cx2 = Math.floor((COLS - shape[0].length) / 2);
      cy2 = 0;
      if (collides(cx2, cy2, shape)) { gameOver = true; endGame(); }
    }

    function collides(px, py, sh) {
      for (let r = 0; r < sh.length; r++)
        for (let c = 0; c < sh[r].length; c++)
          if (sh[r][c]) {
            const nx = px + c, ny = py + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
      return false;
    }

    function lock() {
      for (let r = 0; r < cur.shape.length; r++)
        for (let c = 0; c < cur.shape[r].length; c++)
          if (cur.shape[r][c]) {
            const ny = cy2 + r;
            if (ny >= 0) board[ny][cx2 + c] = cur.color;
          }
      // Clear lines
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(v => v > 0)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(0));
          cleared++; r++;
        }
      }
      if (cleared > 0) {
        const pts = [0, 100, 300, 500, 800][cleared] || 800;
        score += pts * level;
        lines += cleared;
        level = Math.floor(lines / 5) + 1;
        document.getElementById('ssMsg').innerHTML = `<span class="bonus">+${pts * level} pts — ${cleared} sprint${cleared > 1 ? 's' : ''} delivered!</span>`;
      }
      updateHUD();
      spawn();
    }

    function rotate() {
      const sh = cur.shape;
      const rot = sh[0].map((_, i) => sh.map(r => r[i]).reverse());
      if (!collides(cx2, cy2, rot)) cur.shape = rot;
    }

    function move(dx) { if (!collides(cx2 + dx, cy2, cur.shape)) cx2 += dx; }
    function drop() { while (!collides(cx2, cy2 + 1, cur.shape)) cy2++; lock(); }

    function tick() {
      if (gameOver || paused) return;
      if (!collides(cx2, cy2 + 1, cur.shape)) cy2++;
      else lock();
    }

    function updateHUD() {
      const el = id => document.getElementById(id);
      el('ssScore').textContent = score;
      el('ssLines').textContent = lines;
      el('ssLevel').textContent = level;
    }

    function draw() {
      cx.fillStyle = '#080c14'; cx.fillRect(0, 0, W, H);
      // Grid
      cx.strokeStyle = 'rgba(0,225,255,.03)'; cx.lineWidth = 0.3;
      for (let i = 0; i <= COLS; i++) { cx.beginPath(); cx.moveTo(i*SZ, 0); cx.lineTo(i*SZ, H); cx.stroke(); }
      for (let i = 0; i <= ROWS; i++) { cx.beginPath(); cx.moveTo(0, i*SZ); cx.lineTo(W, i*SZ); cx.stroke(); }
      // Board
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (board[r][c]) {
            cx.fillStyle = COLORS[board[r][c]];
            cx.fillRect(c*SZ+1, r*SZ+1, SZ-2, SZ-2);
            cx.fillStyle = 'rgba(255,255,255,.08)';
            cx.fillRect(c*SZ+1, r*SZ+1, SZ-2, (SZ-2)/3);
          }
      // Current piece + ghost
      if (cur && !gameOver) {
        // Ghost
        let gy = cy2;
        while (!collides(cx2, gy + 1, cur.shape)) gy++;
        cx.globalAlpha = 0.15;
        for (let r = 0; r < cur.shape.length; r++)
          for (let c = 0; c < cur.shape[r].length; c++)
            if (cur.shape[r][c]) {
              cx.fillStyle = COLORS[cur.color];
              cx.fillRect((cx2+c)*SZ+1, (gy+r)*SZ+1, SZ-2, SZ-2);
            }
        cx.globalAlpha = 1;
        // Piece
        for (let r = 0; r < cur.shape.length; r++)
          for (let c = 0; c < cur.shape[r].length; c++)
            if (cur.shape[r][c]) {
              cx.fillStyle = COLORS[cur.color];
              cx.fillRect((cx2+c)*SZ+1, (cy2+r)*SZ+1, SZ-2, SZ-2);
              cx.fillStyle = 'rgba(255,255,255,.12)';
              cx.fillRect((cx2+c)*SZ+1, (cy2+r)*SZ+1, SZ-2, (SZ-2)/3);
            }
      }
      // Game over
      if (gameOver) {
        cx.fillStyle = 'rgba(8,12,20,.85)'; cx.fillRect(0, 0, W, H);
        cx.fillStyle = '#ef4444'; cx.font = 'bold 14px JetBrains Mono'; cx.textAlign = 'center';
        cx.fillText('SPRINT FAILED', W/2, H/2 - 16);
        cx.fillStyle = '#e2e8f0'; cx.font = '12px JetBrains Mono';
        cx.fillText(score + ' story points', W/2, H/2 + 6);
        cx.fillStyle = '#4a5568'; cx.font = '9px JetBrains Mono';
        cx.fillText('Press R to retry', W/2, H/2 + 28);
      }
      if (!gameOver) rafId = requestAnimationFrame(draw);
    }

    function endGame() {
      if (interval) clearInterval(interval);
      recordScore('stacker', score);
      document.getElementById('ssMsg').innerHTML = `<span class="warn">Sprint failed! Final: ${score} story points · ${lines} sprints</span>`;
      draw();
    }

    function restart() {
      for (let r = 0; r < ROWS; r++) board[r].fill(0);
      score = 0; lines = 0; level = 1; gameOver = false; paused = false;
      if (interval) clearInterval(interval);
      spawn();
      interval = setInterval(tick, Math.max(100, 500 - level * 30));
      updateHUD();
      document.getElementById('ssMsg').textContent = 'Pack features into sprints — clear rows to deliver!';
      draw();
    }

    // Controls
    const keyHandler = e => {
      if (!document.getElementById('miniGameOverlay')?.classList.contains('show')) return;
      if (gameOver) { if (e.key === 'r' || e.key === 'R') restart(); return; }
      if (e.key === 'p' || e.key === 'P') { paused = !paused; return; }
      if (paused) return;
      switch (e.key) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowUp': rotate(); break;
        case 'ArrowDown': drop(); break;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', keyHandler);

    // Touch controls
    let tx = 0, ty = 0;
    const touchStart = e => { if (e.target.closest('.mg-btn')) return; tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const touchEnd = e => {
      if (e.target.closest('.mg-btn') || gameOver) return;
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) { rotate(); return; }
      if (Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? 1 : -1); }
      else if (dy > 30) drop();
    };
    cv.addEventListener('touchstart', touchStart, {passive:true});
    cv.addEventListener('touchend', touchEnd, {passive:true});

    window._ssRestart = restart;
    spawn();
    interval = setInterval(tick, 500);
    draw();

    // Return cleanup function
    return () => {
      if (interval) clearInterval(interval);
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', keyHandler);
      cv.removeEventListener('touchstart', touchStart);
      cv.removeEventListener('touchend', touchEnd);
      delete window._ssRestart;
    };
  }


  // ═══════════════════════════════════════════════════
  // GAME 2: DATA MESH ROUTER (Pipe-mania style)
  // ═══════════════════════════════════════════════════
  function GameRouter(container, meta) {
    const COLS = 7, ROWS = 7, SZ = 38;
    const W = COLS * SZ, H = ROWS * SZ;
    let score = 0, routesComplete = 0, timer = 45, gameOver = false;
    let timerInterval = null, rafId = null;

    // Pipe types: connections [top, right, bottom, left]
    const PIPE_TYPES = [
      { id:'straight_v', conn:[1,0,1,0], sym:'║' },
      { id:'straight_h', conn:[0,1,0,1], sym:'═' },
      { id:'bend_tr',    conn:[1,1,0,0], sym:'╚' },
      { id:'bend_br',    conn:[0,1,1,0], sym:'╔' },
      { id:'bend_bl',    conn:[0,0,1,1], sym:'╗' },
      { id:'bend_tl',    conn:[1,0,0,1], sym:'╝' },
      { id:'cross',      conn:[1,1,1,1], sym:'╬' },
      { id:'tee_t',      conn:[1,1,0,1], sym:'╩' },
    ];

    const DOMAINS = [
      { name:'ANALYTICS', color:'#00e1ff', emoji:'📊' },
      { name:'CUSTOMER',  color:'#22c55e', emoji:'👥' },
      { name:'RISK',      color:'#f97316', emoji:'⚠️' },
      { name:'PAYMENTS',  color:'#a855f7', emoji:'💳' },
    ];

    container.innerHTML = `
      <div class="mg-title-bar"><div class="mg-title" style="color:${meta.color}">🔀 Data Mesh Router</div></div>
      <div class="mg-hud">
        <div class="mg-hud-item"><div class="mg-hud-val good" id="drScore">0</div><div class="mg-hud-label">Routes</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="drTimer">45</div><div class="mg-hud-label">Seconds</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="drDomain">—</div><div class="mg-hud-label">Domain</div></div>
      </div>
      <div class="mg-canvas-wrap"><canvas id="drCanvas" class="mg-canvas" width="${W}" height="${H}"></canvas></div>
      <div class="mg-msg" id="drMsg">Click pipes to rotate them — connect source to domain!</div>
      <div class="mg-hint">Click/tap pipes to rotate · Connect the highlighted path</div>
      <div class="mg-btns"><button class="mg-btn" onclick="window._drRestart()">↻ New Routes</button><button class="mg-btn" onclick="window._closeMG()">✕ Close</button></div>`;

    const cv = document.getElementById('drCanvas'), cx = cv.getContext('2d');
    let grid = [];
    let source = { r: 0, c: 3 };
    let target = { r: 6, c: 3 };
    let currentDomain = null;

    function initGrid() {
      grid = Array.from({length:ROWS}, () =>
        Array.from({length:COLS}, () => {
          const pipe = { ...PIPE_TYPES[Math.floor(Math.random() * PIPE_TYPES.length)] };
          pipe.conn = [...pipe.conn];
          // Random rotations
          const rotations = Math.floor(Math.random() * 4);
          for (let i = 0; i < rotations; i++) pipe.conn = [pipe.conn[3], pipe.conn[0], pipe.conn[1], pipe.conn[2]];
          return pipe;
        })
      );
      currentDomain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      source = { r: 0, c: Math.floor(Math.random() * COLS) };
      target = { r: ROWS - 1, c: Math.floor(Math.random() * COLS) };
    }

    function rotatePipe(r, c) {
      if (gameOver) return;
      const p = grid[r][c];
      p.conn = [p.conn[3], p.conn[0], p.conn[1], p.conn[2]];
      if (navigator.vibrate) navigator.vibrate(15);
      // Check if route is complete
      if (checkConnection()) {
        score++;
        routesComplete++;
        timer = Math.min(timer + 5, 60); // Bonus time
        document.getElementById('drMsg').innerHTML = `<span class="bonus">✅ Route to ${currentDomain.emoji} ${currentDomain.name} connected! +5s</span>`;
        setTimeout(() => { initGrid(); draw(); }, 600);
      }
      draw();
    }

    function checkConnection() {
      // BFS from source to target
      const visited = Array.from({length:ROWS}, () => Array(COLS).fill(false));
      const queue = [source];
      visited[source.r][source.c] = true;
      const dirs = [[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]]; // [dr,dc,fromDir,toDir]

      while (queue.length) {
        const {r, c} = queue.shift();
        if (r === target.r && c === target.c) return true;
        for (const [dr, dc, fromDir, toDir] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || visited[nr][nc]) continue;
          if (grid[r][c].conn[fromDir] && grid[nr][nc].conn[toDir]) {
            visited[nr][nc] = true;
            queue.push({r:nr, c:nc});
          }
        }
      }
      return false;
    }

    function draw() {
      cx.fillStyle = '#080c14'; cx.fillRect(0, 0, W, H);
      // Grid cells
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const p = grid[r][c];
          const x = c * SZ, y = r * SZ;
          const isSource = r === source.r && c === source.c;
          const isTarget = r === target.r && c === target.c;

          // Cell background
          cx.fillStyle = isSource ? 'rgba(0,225,255,.08)' : isTarget ? (currentDomain?.color || '#22c55e') + '12' : 'rgba(255,255,255,.01)';
          cx.fillRect(x + 1, y + 1, SZ - 2, SZ - 2);
          cx.strokeStyle = 'rgba(255,255,255,.04)'; cx.strokeRect(x, y, SZ, SZ);

          // Draw pipe connections as lines
          const mx = x + SZ/2, my = y + SZ/2;
          cx.strokeStyle = isSource || isTarget ? (currentDomain?.color || '#00e1ff') : 'rgba(0,225,255,.4)';
          cx.lineWidth = 3; cx.lineCap = 'round';
          if (p.conn[0]) { cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(mx, y); cx.stroke(); }
          if (p.conn[1]) { cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(x + SZ, my); cx.stroke(); }
          if (p.conn[2]) { cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(mx, y + SZ); cx.stroke(); }
          if (p.conn[3]) { cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(x, my); cx.stroke(); }
          // Center dot
          cx.fillStyle = 'rgba(0,225,255,.2)';
          cx.beginPath(); cx.arc(mx, my, 2, 0, Math.PI*2); cx.fill();

          // Source/target labels
          if (isSource) {
            cx.fillStyle = '#00e1ff'; cx.font = 'bold 9px JetBrains Mono'; cx.textAlign = 'center';
            cx.fillText('SRC', mx, my + 3);
          }
          if (isTarget) {
            cx.fillStyle = currentDomain?.color || '#22c55e'; cx.font = '14px serif'; cx.textAlign = 'center';
            cx.fillText(currentDomain?.emoji || '🎯', mx, my + 5);
          }
        }

      if (gameOver) {
        cx.fillStyle = 'rgba(8,12,20,.88)'; cx.fillRect(0, 0, W, H);
        cx.fillStyle = '#ef4444'; cx.font = 'bold 14px JetBrains Mono'; cx.textAlign = 'center';
        cx.fillText('TIME\'S UP', W/2, H/2 - 12);
        cx.fillStyle = '#e2e8f0'; cx.font = '12px JetBrains Mono';
        cx.fillText(routesComplete + ' routes completed', W/2, H/2 + 10);
      }

      document.getElementById('drScore').textContent = routesComplete;
      document.getElementById('drTimer').textContent = timer;
      document.getElementById('drDomain').textContent = currentDomain?.emoji || '—';
    }

    function endGame() {
      gameOver = true;
      if (timerInterval) clearInterval(timerInterval);
      recordScore('router', routesComplete * 100);
      document.getElementById('drMsg').innerHTML = `<span class="warn">Time's up! ${routesComplete} routes · ${routesComplete * 100} pts</span>`;
      draw();
    }

    function restart() {
      score = 0; routesComplete = 0; timer = 45; gameOver = false;
      if (timerInterval) clearInterval(timerInterval);
      initGrid();
      timerInterval = setInterval(() => { timer--; if (timer <= 0) endGame(); draw(); }, 1000);
      document.getElementById('drMsg').textContent = 'Click pipes to rotate — connect source to domain!';
      draw();
    }

    // Click handler
    const clickHandler = e => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const sx = cv.width / rect.width, sy = cv.height / rect.height;
      const c = Math.floor(x * sx / SZ), r = Math.floor(y * sy / SZ);
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) rotatePipe(r, c);
    };
    cv.addEventListener('click', clickHandler);

    window._drRestart = restart;
    initGrid();
    timerInterval = setInterval(() => { timer--; if (timer <= 0) endGame(); draw(); }, 1000);
    draw();

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (rafId) cancelAnimationFrame(rafId);
      cv.removeEventListener('click', clickHandler);
      delete window._drRestart;
    };
  }


  // ═══════════════════════════════════════════════════
  // GAME 3: BILINGUAL SWIPE (Jargon matching)
  // ═══════════════════════════════════════════════════
  function GameBilingual(container, meta) {
    const PAIRS = [
      { tech:'API Gateway',           biz:'Single front door for all customer requests',     wrong:['Database backup schedule','Annual revenue forecast'] },
      { tech:'Microservices',         biz:'Small independent teams owning their own products', wrong:['Quarterly board reports','Hardware procurement'] },
      { tech:'CI/CD Pipeline',        biz:'Ship features to customers faster with less risk',  wrong:['Budget approval workflow','Office relocation plan'] },
      { tech:'Data Lake',             biz:'Central storage where all company data lives',      wrong:['Customer loyalty program','Branch renovation plan'] },
      { tech:'Kubernetes',            biz:'Auto-scaling infrastructure that heals itself',      wrong:['Employee training budget','Vendor management system'] },
      { tech:'Machine Learning Model',biz:'System that learns from data to predict outcomes',  wrong:['Manual reporting process','Paper filing system'] },
      { tech:'ETL Pipeline',          biz:'Automatically clean & move data where it\'s needed', wrong:['Customer complaint form','Meeting room booking'] },
      { tech:'OAuth 2.0',             biz:'Secure login without sharing your password',         wrong:['Annual audit checklist','Staff attendance sheet'] },
      { tech:'Event-Driven Architecture', biz:'Systems react instantly when something happens', wrong:['Weekly status email','Monthly planning cycle'] },
      { tech:'Feature Flags',         biz:'Release features to select customers for safe testing', wrong:['HR onboarding checklist','Compliance documentation'] },
      { tech:'GraphQL',               biz:'Let clients ask for exactly the data they need',     wrong:['Financial reconciliation','Inventory audit'] },
      { tech:'Docker Container',      biz:'Package software so it runs the same everywhere',    wrong:['Physical server room','Spreadsheet template'] },
      { tech:'Scrum Sprint',          biz:'Two-week focused cycle to deliver working software', wrong:['Annual strategic plan','Five-year forecast'] },
      { tech:'Kanban Board',          biz:'Visual workflow showing what\'s in progress',         wrong:['Org chart hierarchy','Budget allocation matrix'] },
      { tech:'Technical Debt',        biz:'Shortcuts taken now that cost more to fix later',    wrong:['Company loan payments','Office lease agreement'] },
    ];

    let currentIdx = 0, score = 0, streak = 0, total = 8, gameOver = false;
    const shuffled = [...PAIRS].sort(() => Math.random() - 0.5).slice(0, total);

    container.innerHTML = `
      <div class="mg-title-bar"><div class="mg-title" style="color:${meta.color}">🌐 Bilingual Swipe</div></div>
      <div class="mg-hud">
        <div class="mg-hud-item"><div class="mg-hud-val good" id="bsScore">0</div><div class="mg-hud-label">Correct</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="bsStreak">0</div><div class="mg-hud-label">Streak</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="bsLeft">${total}</div><div class="mg-hud-label">Remaining</div></div>
      </div>
      <div class="swipe-progress" id="bsPips">${shuffled.map((_,i)=>`<div class="swipe-pip${i===0?' current':''}"></div>`).join('')}</div>
      <div class="swipe-area" id="bsArea"></div>
      <div class="mg-msg" id="bsMsg">Match the tech term to its business translation</div>
      <div class="mg-btns"><button class="mg-btn" onclick="window._bsRestart()">↻ New Round</button><button class="mg-btn" onclick="window._closeMG()">✕ Close</button></div>`;

    function renderCard() {
      if (currentIdx >= total) { endGame(); return; }
      const area = document.getElementById('bsArea');
      const pair = shuffled[currentIdx];
      // Shuffle options: 1 correct + 2 wrong
      const options = [pair.biz, ...pair.wrong].sort(() => Math.random() - 0.5);

      area.innerHTML = `
        <div class="swipe-card" id="bsCard">
          <div class="swipe-tech">${pair.tech}</div>
          <div class="swipe-term">What does this mean for the business?</div>
          <div class="swipe-options" id="bsOptions">
            ${options.map((o, i) => `<div class="swipe-opt" data-answer="${o === pair.biz ? 'correct' : 'wrong'}" data-idx="${i}">${o}</div>`).join('')}
          </div>
        </div>`;

      // Bind option clicks
      area.querySelectorAll('.swipe-opt').forEach(opt => {
        opt.addEventListener('click', () => handleAnswer(opt));
      });

      // Update pips
      const pips = document.querySelectorAll('.swipe-pip');
      pips.forEach((p, i) => {
        p.classList.toggle('current', i === currentIdx);
      });

      document.getElementById('bsLeft').textContent = total - currentIdx;
    }

    function handleAnswer(opt) {
      if (gameOver) return;
      const isCorrect = opt.dataset.answer === 'correct';
      const card = document.getElementById('bsCard');

      // Highlight all options
      document.querySelectorAll('.swipe-opt').forEach(o => {
        o.style.pointerEvents = 'none';
        if (o.dataset.answer === 'correct') o.classList.add('correct');
        else if (o === opt && !isCorrect) o.classList.add('wrong');
      });

      const pips = document.querySelectorAll('.swipe-pip');

      if (isCorrect) {
        score++;
        streak++;
        if (pips[currentIdx]) pips[currentIdx].classList.add('done');
        const pts = 50 * (streak >= 3 ? 2 : 1);
        document.getElementById('bsMsg').innerHTML = `<span class="good">✅ Correct! +${pts} pts${streak >= 3 ? ' 🔥×' + streak : ''}</span>`;
        if (navigator.vibrate) navigator.vibrate(20);
      } else {
        streak = 0;
        if (pips[currentIdx]) pips[currentIdx].classList.add('wrong-pip');
        document.getElementById('bsMsg').innerHTML = `<span class="warn">❌ Not quite — see the correct answer highlighted</span>`;
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }

      document.getElementById('bsScore').textContent = score;
      document.getElementById('bsStreak').textContent = streak;

      // Animate card out, next card in
      setTimeout(() => {
        if (card) card.classList.add(isCorrect ? 'gone-right' : 'gone-left');
        setTimeout(() => { currentIdx++; renderCard(); }, 400);
      }, 1200);
    }

    function endGame() {
      gameOver = true;
      const area = document.getElementById('bsArea');
      const pct = Math.round(score / total * 100);
      const grade = pct >= 90 ? '🌟 Bilingual Master!' : pct >= 70 ? '📘 Strong Translator!' : pct >= 50 ? '📝 Getting There!' : '📖 Keep Learning!';
      area.innerHTML = `
        <div class="swipe-card" style="position:relative">
          <div class="swipe-tech">RESULTS</div>
          <div class="swipe-term">${grade}</div>
          <div style="font-size:32px;margin:8px 0">${pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : '📚'}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#8b949e">${score}/${total} correct · ${pct}%</div>
        </div>`;
      const totalPts = score * 50;
      recordScore('bilingual', totalPts);
      document.getElementById('bsMsg').innerHTML = `<span class="bonus">Final score: ${totalPts} pts — ${grade}</span>`;
    }

    function restart() {
      currentIdx = 0; score = 0; streak = 0; gameOver = false;
      shuffled.length = 0;
      shuffled.push(...[...PAIRS].sort(() => Math.random() - 0.5).slice(0, total));
      document.getElementById('bsPips').innerHTML = shuffled.map((_, i) => `<div class="swipe-pip${i === 0 ? ' current' : ''}"></div>`).join('');
      document.getElementById('bsScore').textContent = '0';
      document.getElementById('bsStreak').textContent = '0';
      document.getElementById('bsMsg').textContent = 'Match the tech term to its business translation';
      renderCard();
    }

    window._bsRestart = restart;
    renderCard();

    return () => { delete window._bsRestart; };
  }


  // ═══════════════════════════════════════════════════
  // GAME 4: SCOPE DEFENDER (Space Invaders — BOSS)
  // ═══════════════════════════════════════════════════
  function GameDefender(container, meta) {
    const W = 300, H = 340;
    let score = 0, lives = 3, wave = 1, gameOver = false;
    let interval = null, rafId = null;

    container.innerHTML = `
      <div class="mg-title-bar"><div class="mg-title" style="color:${meta.color}">🛡️ Scope Defender — FINAL BOSS</div></div>
      <div class="mg-hud">
        <div class="mg-hud-item"><div class="mg-hud-val good" id="sdScore">0</div><div class="mg-hud-label">Bugs Fixed</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="sdWave">1</div><div class="mg-hud-label">Wave</div></div>
        <div class="mg-hud-item"><div class="mg-hud-val" id="sdLives">❤️❤️❤️</div><div class="mg-hud-label">Sprint Health</div></div>
      </div>
      <div class="mg-canvas-wrap"><canvas id="sdCanvas" class="mg-canvas" width="${W}" height="${H}"></canvas></div>
      <div class="mg-msg" id="sdMsg">Defend the sprint! Shoot down scope creep & prod bugs</div>
      <div class="mg-hint">← → move · Space shoot · Auto-fire on mobile</div>
      <div class="mg-btns"><button class="mg-btn" onclick="window._sdRestart()">↻ New Wave</button><button class="mg-btn" onclick="window._closeMG()">✕ Close</button></div>`;

    const cv = document.getElementById('sdCanvas'), cx = cv.getContext('2d');

    // Player
    let player = { x: W / 2, w: 30, h: 14 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let enemyDir = 1, enemySpeed = 0.4, lastShot = 0;

    const ENEMY_TYPES = [
      { emoji:'🐛', name:'Bug',    points:10, hp:1, w:22, h:22 },
      { emoji:'📋', name:'Scope',  points:20, hp:1, w:22, h:22 },
      { emoji:'🔥', name:'Hotfix', points:30, hp:2, w:24, h:24 },
      { emoji:'💣', name:'P0 Bug', points:50, hp:3, w:26, h:26 },
    ];

    function spawnWave() {
      enemies = [];
      const rows = Math.min(3 + Math.floor(wave / 2), 5);
      const cols = Math.min(5 + wave, 9);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const type = ENEMY_TYPES[Math.min(r, ENEMY_TYPES.length - 1)];
          enemies.push({
            x: 30 + c * 30, y: 20 + r * 28,
            ...type, hp: type.hp,
            baseX: 30 + c * 30
          });
        }
      enemySpeed = 0.4 + wave * 0.15;
      enemyDir = 1;
    }

    function shoot() {
      const now = Date.now();
      if (now - lastShot < 250) return;
      lastShot = now;
      bullets.push({ x: player.x, y: H - 24, dy: -5 });
    }

    function spawnParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 15, color });
      }
    }

    function update() {
      if (gameOver) return;

      // Move bullets
      bullets.forEach(b => b.y += b.dy);
      bullets = bullets.filter(b => b.y > -10);

      // Move enemies
      let hitEdge = false;
      enemies.forEach(e => {
        e.x += enemySpeed * enemyDir;
        if (e.x <= 10 || e.x >= W - 10) hitEdge = true;
      });
      if (hitEdge) {
        enemyDir *= -1;
        enemies.forEach(e => e.y += 8);
      }

      // Check if enemies reached bottom
      if (enemies.some(e => e.y + e.h >= H - 30)) {
        lives--;
        if (lives <= 0) { endGame(); return; }
        enemies.forEach(e => e.y -= 30);
        document.getElementById('sdMsg').innerHTML = '<span class="warn">⚠️ Scope creep reached the sprint!</span>';
      }

      // Bullet-enemy collisions
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei];
          if (Math.abs(b.x - e.x) < e.w/2 && Math.abs(b.y - e.y) < e.h/2) {
            e.hp--;
            bullets.splice(bi, 1);
            if (e.hp <= 0) {
              score += e.points;
              spawnParticles(e.x, e.y, '#22c55e', 6);
              enemies.splice(ei, 1);
              document.getElementById('sdMsg').innerHTML = `<span class="good">${e.emoji} ${e.name} squashed! +${e.points}</span>`;
            } else {
              spawnParticles(e.x, e.y, '#f97316', 3);
            }
            break;
          }
        }
      }

      // Wave cleared
      if (enemies.length === 0) {
        wave++;
        spawnWave();
        document.getElementById('sdMsg').innerHTML = `<span class="bonus">🎉 Wave ${wave}! Scope creep intensifies...</span>`;
      }

      // Auto-fire on mobile
      if (isMobile && Date.now() - lastShot > 400) shoot();

      // Particles
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles = particles.filter(p => p.life > 0);

      updateHUD();
    }

    function updateHUD() {
      document.getElementById('sdScore').textContent = score;
      document.getElementById('sdWave').textContent = wave;
      document.getElementById('sdLives').textContent = '❤️'.repeat(Math.max(0, lives));
    }

    function draw() {
      cx.fillStyle = '#060910'; cx.fillRect(0, 0, W, H);

      // Grid lines
      cx.strokeStyle = 'rgba(239,68,68,.02)'; cx.lineWidth = 0.5;
      for (let i = 0; i < W; i += 20) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, H); cx.stroke(); }
      for (let i = 0; i < H; i += 20) { cx.beginPath(); cx.moveTo(0, i); cx.lineTo(W, i); cx.stroke(); }

      // Player (shield shape)
      cx.fillStyle = '#00e1ff';
      cx.beginPath();
      cx.moveTo(player.x, H - 20);
      cx.lineTo(player.x - player.w/2, H - 6);
      cx.lineTo(player.x + player.w/2, H - 6);
      cx.closePath();
      cx.fill();
      // Glow
      cx.shadowColor = '#00e1ff'; cx.shadowBlur = 8;
      cx.fill();
      cx.shadowBlur = 0;

      // Bullets
      bullets.forEach(b => {
        cx.fillStyle = '#22c55e';
        cx.fillRect(b.x - 1, b.y, 2, 8);
        cx.shadowColor = '#22c55e'; cx.shadowBlur = 4;
        cx.fillRect(b.x - 1, b.y, 2, 8);
        cx.shadowBlur = 0;
      });

      // Enemies
      cx.font = '18px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      enemies.forEach(e => {
        cx.fillText(e.emoji, e.x, e.y);
        // HP indicator for multi-hit enemies
        if (ENEMY_TYPES.find(t => t.emoji === e.emoji)?.hp > 1) {
          cx.fillStyle = e.hp > 1 ? 'rgba(239,68,68,.6)' : 'rgba(239,68,68,.3)';
          cx.fillRect(e.x - 8, e.y + 12, 16 * (e.hp / ENEMY_TYPES.find(t => t.emoji === e.emoji).hp), 2);
        }
      });

      // Particles
      particles.forEach(p => {
        cx.globalAlpha = p.life / 15;
        cx.fillStyle = p.color;
        cx.beginPath(); cx.arc(p.x, p.y, 2, 0, Math.PI*2); cx.fill();
      });
      cx.globalAlpha = 1;

      // Defense line
      cx.strokeStyle = 'rgba(0,225,255,.1)'; cx.lineWidth = 1; cx.setLineDash([4, 4]);
      cx.beginPath(); cx.moveTo(0, H - 26); cx.lineTo(W, H - 26); cx.stroke();
      cx.setLineDash([]);

      // Game over
      if (gameOver) {
        cx.fillStyle = 'rgba(6,9,16,.9)'; cx.fillRect(0, 0, W, H);
        cx.fillStyle = '#fbbf24'; cx.font = 'bold 16px JetBrains Mono'; cx.textAlign = 'center';

        const s = getArcadeState();
        if (score >= 300 && !s.bossBeaten) {
          cx.fillText('🏆 BOSS DEFEATED!', W/2, H/2 - 20);
          cx.fillStyle = '#22c55e'; cx.font = '11px JetBrains Mono';
          cx.fillText('You are the Delivery Lead', W/2, H/2 + 8);
          s.bossBeaten = true; saveArcadeState(s);
          triggerConfetti();
        } else {
          cx.fillStyle = '#ef4444';
          cx.fillText('SPRINT COLLAPSED', W/2, H/2 - 20);
          cx.fillStyle = '#e2e8f0'; cx.font = '12px JetBrains Mono';
          cx.fillText(score + ' bugs fixed · Wave ' + wave, W/2, H/2 + 8);
        }
        cx.fillStyle = '#4a5568'; cx.font = '9px JetBrains Mono';
        cx.fillText('Press R to retry', W/2, H/2 + 32);
      }

      if (!gameOver) rafId = requestAnimationFrame(draw);
    }

    function endGame() {
      gameOver = true;
      if (interval) clearInterval(interval);
      recordScore('defender', score);
      draw();
    }

    function restart() {
      score = 0; lives = 3; wave = 1; gameOver = false;
      bullets = []; particles = [];
      player.x = W / 2;
      if (interval) clearInterval(interval);
      spawnWave();
      interval = setInterval(update, 16);
      updateHUD();
      document.getElementById('sdMsg').textContent = 'Defend the sprint! Shoot down scope creep & prod bugs';
      rafId = requestAnimationFrame(draw);
    }

    // Controls
    const keys = {};
    const keyDown = e => {
      if (!document.getElementById('miniGameOverlay')?.classList.contains('show')) return;
      keys[e.key] = true;
      if (e.key === ' ') { shoot(); e.preventDefault(); }
      if (e.key === 'r' || e.key === 'R') { if (gameOver) restart(); }
    };
    const keyUp = e => { keys[e.key] = false; };
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);

    // Movement loop
    const moveLoop = setInterval(() => {
      if (gameOver) return;
      if (keys['ArrowLeft']) player.x = Math.max(player.w/2, player.x - 4);
      if (keys['ArrowRight']) player.x = Math.min(W - player.w/2, player.x + 4);
    }, 16);

    // Touch controls
    const touchMove = e => {
      if (e.target.closest('.mg-btn')) return;
      const rect = cv.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / rect.width * W;
      player.x = Math.max(player.w/2, Math.min(W - player.w/2, x));
    };
    cv.addEventListener('touchmove', touchMove, {passive:true});
    cv.addEventListener('touchstart', e => { if (!e.target.closest('.mg-btn')) shoot(); }, {passive:true});

    window._sdRestart = restart;
    spawnWave();
    interval = setInterval(update, 16);
    draw();

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(moveLoop);
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      cv.removeEventListener('touchmove', touchMove);
      delete window._sdRestart;
    };
  }


  // ═══════════════════════════════════════════════════
  // CONFETTI SYSTEM
  // ═══════════════════════════════════════════════════
  function triggerConfetti() {
    const emojis = ['🎉','🏆','⭐','🎊','✨','🥇','🛡️','🚀'];
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'confetti-piece';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-20px';
        el.style.animationDuration = (2 + Math.random() * 2) + 's';
        el.style.animationDelay = Math.random() * 0.3 + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 5000);
      }, i * 60);
    }
    // Vibrate celebration
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100, 50, 200]);
    // XP bonus
    addXP(100);
  }


  // ═══════════════════════════════════════════════════
  // RAGE CLICK BUG BASH EASTER EGG
  // ═══════════════════════════════════════════════════
  function initBugBash() {
    const clickTracker = {};
    let bugsSquashed = 0;

    document.addEventListener('click', e => {
      const target = e.target;
      const key = target.tagName + (target.className || '').slice(0, 20);
      if (!clickTracker[key]) clickTracker[key] = { count: 0, time: 0 };
      const t = clickTracker[key];
      const now = Date.now();
      if (now - t.time > 2000) t.count = 0;
      t.count++;
      t.time = now;

      if (t.count >= 5) {
        t.count = 0;
        spawnBug(e.clientX, e.clientY);
      }
    });

    function spawnBug(startX, startY) {
      const bug = document.createElement('span');
      bug.className = 'bug-sprite';
      bug.textContent = '🐞';
      bug.style.left = startX + 'px';
      bug.style.top = startY + 'px';

      // Random scurry direction
      const bx = (Math.random() - 0.5) * 300;
      const by = (Math.random() - 0.5) * 300;
      const br = (Math.random() - 0.5) * 360;
      bug.style.setProperty('--bx', bx + 'px');
      bug.style.setProperty('--by', by + 'px');
      bug.style.setProperty('--br', br + 'deg');

      bug.addEventListener('click', e => {
        e.stopPropagation();
        bugsSquashed++;
        // Splat
        const splat = document.createElement('span');
        splat.className = 'bug-splat';
        splat.textContent = '💥';
        splat.style.left = e.clientX - 14 + 'px';
        splat.style.top = e.clientY - 14 + 'px';
        document.body.appendChild(splat);
        setTimeout(() => splat.remove(), 600);
        bug.remove();

        addXP(50);
        if (navigator.vibrate) navigator.vibrate([30, 20, 60]);

        // Award badge
        if (window.Achieve) window.Achieve.check('qa_tester');

        // If VDna doesn't have qa_tester badge, show a manual toast
        if (bugsSquashed === 1) {
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.style.cssText = 'border-color:#ef4444;box-shadow:0 8px 32px rgba(239,68,68,.25)';
          toast.innerHTML = `<div class="toast-shimmer"></div><div class="toast-emoji">🐞</div><div class="toast-body"><div class="toast-title" style="color:#ef4444">Bug Bash!</div><div class="toast-desc">QA Tester — squashed a rage-click bug</div><div class="toast-xp">+50 XP</div></div>`;
          const tc = document.getElementById('toastContainer');
          if (tc) { tc.appendChild(toast); setTimeout(() => toast.classList.add('show'), 50); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 4200); }
        }
      });

      document.body.appendChild(bug);
      setTimeout(() => bug.remove(), 4500);
    }
  }


  // ═══════════════════════════════════════════════════
  // WIRE UP: Replace existing game button, Terminal cmd
  // ═══════════════════════════════════════════════════
  function wireUp() {
    // Replace existing game button to open Arcade Hub
    const gameBtn = document.getElementById('gameBtn');
    if (gameBtn) {
      gameBtn.removeAttribute('onclick');
      gameBtn.addEventListener('click', openArcade);
    }

    // Add terminal command
    if (window.TermCmds) {
      window.TermCmds.play = () => { closeMiniGame(); setTimeout(openArcade, 300); return '<span class="term-green">Launching Amr Arcade...</span>'; };
      window.TermCmds.arcade = window.TermCmds.play;
    }

    // Global close mini-game
    window._closeMG = closeMiniGame;

    // Keyboard: Escape closes mini-game, G opens arcade
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') { closeMiniGame(); closeArcade(); }
    });

    // Add shortcut to panel if exists
    const panel = document.querySelector('.shortcut-panel');
    if (panel) {
      const closeDiv = panel.querySelector('.sc-close');
      if (closeDiv && !panel.querySelector('[data-p3-key]')) {
        const row = document.createElement('div');
        row.className = 'sc-row';
        row.dataset.p3Key = '1';
        row.innerHTML = '<span class="sc-key">G</span><span class="sc-desc">Open Amr Arcade</span>';
        panel.insertBefore(row, closeDiv);
      }
    }
  }


  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initBaseGame();
    createArcadeHub();
    wireUp();
    initBugBash();

    console.log(
      '%c🕹️ Phase 3 Loaded %c Amr Arcade · 5 Games · Bug Bash',
      'background:#a855f7;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#a855f7;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  } else {
    setTimeout(init, 300);
  }

})();
