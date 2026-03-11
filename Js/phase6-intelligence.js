/* PRESENCE AUDIO ENGINE REMOVED - now in presence-engine.js */

// ═══════════════════════════════════════════════════════════════
// PHASE 6.1: INTELLIGENCE LAYER — amrelharony.com
// Drop-in: <script src="phase6-intelligence.js" defer></script>
//
// Features:
//   0. Always-visible CTA buttons (LinkedIn + Get Mentored)
//   1. Command Palette (Cmd+K) — fuzzy search, MRU, descriptions, Tab categories
//   2. Trophy Case & Progress Tracker — 24 achievements, exploration tracking
//   3. Interactive Timeline — minimal scroll-line, clean cards, filters
//   4. Live Guestbook (emoji wall)
//   5. Voice Navigation — 30+ routes, compound commands, confidence display
//   6. Advanced Terminal — 35+ commands, easter eggs, neofetch
//   7. ADPList widget cleanup (CSS + DOM) + direct redirect
//   8. Trophy triggers wired into: scroll, guestbook, palette, terminal, voice
//
// 1,957 lines · Syntax validated · RTL/mobile/print/zen safe
// ═══════════════════════════════════════════════════════════════
(function PhaseSixIntelligence() {
  'use strict';

  var _termEsc = window._termEsc;
  var _termAppend = window._termAppend;

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // phase6-css: styles moved to Css/phase6.css


  // ═══════════════════════════════════════════════════
  // FEATURE 1: COMMAND PALETTE — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // Fuzzy search · MRU tracking · Category headers · Descriptions · Shortcut hints

  function initCommandPalette() {
    const MRU_KEY = 'cmd_mru';
    function getMRU() { try { return JSON.parse(localStorage.getItem(MRU_KEY)||'[]'); } catch(e) { return []; } }
    function addMRU(name) { const mru=getMRU().filter(n=>n!==name); mru.unshift(name); localStorage.setItem(MRU_KEY,JSON.stringify(mru.slice(0,8))); }

    const REGISTRY = [
      // Sections
      { name:'Impact Numbers',         icon:'📊', action:()=>scrollTo('.imp'),              cat:'Section', desc:'Scroll to key metrics', keys:'' },
      { name:'Journey / Timeline',     icon:'🚀', action:()=>scrollTo('.tl-wrap'),          cat:'Section', desc:'Interactive career timeline', keys:'' },
      { name:'Certifications',         icon:'📜', action:()=>scrollTo('#certGrid'),          cat:'Section', desc:'20+ professional badges', keys:'' },
      { name:'Testimonials',           icon:'⭐', action:()=>scrollTo('.tc-section'),        cat:'Section', desc:'Colleague recommendations', keys:'' },
      { name:'Conferences',            icon:'🎤', action:()=>scrollTo('.conf-strip'),        cat:'Section', desc:'Speaking engagements', keys:'' },
      { name:'LinkedIn Articles',      icon:'📝', action:()=>scrollTo('#linkedinFeed'),      cat:'Section', desc:'Published articles feed', keys:'' },
      { name:'Contact Info',           icon:'📧', action:()=>{ const s=document.getElementById('contactSecret'); if(s) s.classList.add('revealed'); scrollTo('.sr'); }, cat:'Section', desc:'Reveal contact details', keys:'C' },
      // Links
      { name:'The Bilingual Executive',icon:'📘', action:()=>clickLink('bilingual'),  cat:'Link', desc:'The book on Amazon', keys:'' },
      { name:'ADPList Mentoring',      icon:'🎓', action:()=>window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank'),    cat:'Link', desc:'Book a mentoring session', keys:'' },
      { name:'Fintech Bilinguals',     icon:'🤝', action:()=>clickLink('fintech-bilinguals'), cat:'Link', desc:'Community hub', keys:'' },
      { name:'LinkedIn Profile',       icon:'💼', action:()=>window.open('https://linkedin.com/in/amrmelharony','_blank'), cat:'Link', desc:'Connect on LinkedIn', keys:'' },
      { name:'Book My Calendar',       icon:'📅', action:()=>window.open('https://calendly.com/amrmelharony/30min','_blank'), cat:'Link', desc:'Schedule a 30-min call', keys:'' },
      // Games
      { name:'Open Arcade',            icon:'🕹️', action:()=>{ if(window._openArcade)window._openArcade(); }, cat:'Game', desc:'All 5 mini-games', keys:'A' },
      { name:'Sprint Stacker',         icon:'🧱', action:()=>{ if(window._launchGame)window._launchGame('stacker'); else if(window.TermCmds?.play)window.TermCmds.play('stacker'); }, cat:'Game', desc:'Stack agile sprint blocks', keys:'' },
      { name:'Data Mesh Router',       icon:'🔀', action:()=>{ if(window._launchGame)window._launchGame('router'); else if(window.TermCmds?.play)window.TermCmds.play('router'); },  cat:'Game', desc:'Route data to correct domains', keys:'' },
      { name:'FinTech Trader',         icon:'📈', action:()=>{ if(window._launchGame)window._launchGame('trader'); else if(window.openGame)window.openGame(); },  cat:'Game', desc:'Real-time stock trading sim', keys:'' },
      { name:'Bilingual Swipe',        icon:'🌐', action:()=>{ if(window._launchGame)window._launchGame('bilingual'); else if(window.TermCmds?.play)window.TermCmds.play('bilingual'); }, cat:'Game', desc:'Swipe-match bilingual terms', keys:'' },
      { name:'Scope Defender',         icon:'🛡️', action:()=>{ if(window._launchGame)window._launchGame('defender'); else if(window.TermCmds?.play)window.TermCmds.play('defender'); }, cat:'Game', desc:'Defend sprint from scope creep', keys:'' },
      { name:'Snake Game',             icon:'🐍', action:()=>{ if(window.openGame)window.openGame(); },                cat:'Game', desc:'Classic snake with data theme', keys:'' },
      // Features
      { name:'Zen Mode',               icon:'🧘', action:()=>{ const b=document.getElementById('zenBtn'); if(b) b.click(); }, cat:'Feature', desc:'Toggle minimal reading mode', keys:'Z' },
      { name:'3D Book Viewer',         icon:'📦', action:()=>launchCmd('book3d'),            cat:'Feature', desc:'Interactive 3D book model', keys:'' },
      { name:'Data Mesh 3D',           icon:'🔀', action:()=>launchCmd('datamesh'),          cat:'Feature', desc:'3D data mesh visualization', keys:'' },
      { name:'Tear Off Terminal',      icon:'📡', action:()=>{if(window._crossWindow)window._crossWindow.tearTerminal();}, cat:'Feature', desc:'Terminal in a separate window', keys:'' },
      { name:'Tear Off Chart',         icon:'📊', action:()=>{if(window._crossWindow)window._crossWindow.tearChart();},    cat:'Feature', desc:'Live trades in a separate window', keys:'' },
      { name:'Monitor Status',         icon:'🖥️', action:()=>launchCmd('monitor-status'),    cat:'Feature', desc:'Cross-window sync status', keys:'' },
      { name:'Guestbook',              icon:'🌍', action:()=>openGuestbook(),                cat:'Feature', desc:'Sign the visitor wall', keys:'G' },
      { name:'Voice Navigation',       icon:'🎙️', action:()=>{if(window._toggleVoice)window._toggleVoice();},                  cat:'Feature', desc:'Speak commands hands-free', keys:'V' },
      // System
      { name:'Open Terminal',           icon:'💻', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'System', desc:'Full terminal interface', keys:'' },
      { name:'Ask Amr (AI Chat)',       icon:'🧠', action:()=>{ if(window.openTerm){window.openTerm();setTimeout(function(){var i=document.getElementById('termInput');if(i){i.value='ask ';i.focus();i.setSelectionRange(4,4);}},400);} }, cat:'System', desc:'Chat with AI assistant', keys:'`' },
      { name:'Keyboard Shortcuts',      icon:'⌨️', action:()=>{ const o=document.getElementById('shortcutOverlay'); if(o) o.classList.add('show'); }, cat:'System', desc:'View all shortcuts', keys:'?' },
      { name:'Trophy Case',             icon:'🏆', action:()=>{ if(window._openTrophies) window._openTrophies(); }, cat:'System', desc:'View achievements & progress', keys:'' },
      { name:'Biometric Passkey',        icon:'🔐', action:()=>{ if(window._openPasskey) window._openPasskey(); }, cat:'Security', desc:'WebAuthn passwordless authentication', keys:'P' },
      { name:'Cursor Chat',              icon:'💬', action:()=>{ if(window._openCursorChat) window._openCursorChat(); }, cat:'System', desc:'Figma-style chat at cursor', keys:'/' },
      { name:'Visitor Insights',        icon:'📊', action:()=>{ if(window.TermCmds?.admin) window.TermCmds.admin(); }, cat:'System', desc:'Analytics dashboard', keys:'' },
      // Certs (searchable)
      { name:'PMP Certification',       icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Project Management Professional', keys:'' },
      { name:'SAFe 6 Scrum Master',     icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Scaled Agile Framework', keys:'' },
      { name:'PSM II',                  icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Master II', keys:'' },
      { name:'PSPO II',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Product Owner II', keys:'' },
      { name:'PMI-ACP',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Agile Certified Practitioner', keys:'' },
      { name:'CDMP Data Management',    icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Certified Data Management Professional', keys:'' },
      // Timeline filters (quick access)
      { name:'Filter: Banking',         icon:'🏦', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('banking'); }, cat:'Filter', desc:'Timeline → Banking items', keys:'' },
      { name:'Filter: Agile',           icon:'⚡', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('agile'); }, cat:'Filter', desc:'Timeline → Agile items', keys:'' },
      { name:'Filter: Data',            icon:'📊', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('data'); }, cat:'Filter', desc:'Timeline → Data items', keys:'' },
      { name:'Filter: Speaking',        icon:'🎤', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('speaking'); }, cat:'Filter', desc:'Timeline → Speaking items', keys:'' },
    ];

    function scrollTo(sel) { const el = document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
    function clickLink(partial) { const lk = document.querySelector(`a.lk[href*="${partial}"]`); if(lk) lk.click(); }
    function launchCmd(cmd) { if(window.TermCmds) { const parts=cmd.split(' '); const fn=window.TermCmds[parts[0]]; if(fn) fn(parts.slice(1).join(' ')); } }

    // Fuzzy match scoring
    function fuzzyScore(query, text) {
      const q = query.toLowerCase(), t = text.toLowerCase();
      if (t === q) return 100;
      if (t.startsWith(q)) return 80;
      if (t.includes(q)) return 60;
      // Fuzzy: all chars present in order
      let qi = 0, score = 0;
      for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) { score += (ti === 0 || t[ti-1] === ' ' ? 15 : 5); qi++; }
      }
      return qi === q.length ? score : 0;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cmdPaletteOverlay';
    overlay.addEventListener('click', e => { if(e.target === overlay) closePalette(); });
    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-input-wrap">
          <span class="cmd-input-icon"><i class="fa-solid fa-bars-staggered"></i></span>
          <input class="cmd-input" id="cmdInput" placeholder="Navigate to..." autocomplete="off" spellcheck="false">
          <span class="cmd-input-hint">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer"><span>↑↓ navigate</span><span>↵ select</span><span>tab category</span><span>esc close</span></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdInput');
    const resultsEl = document.getElementById('cmdResults');
    let activeIdx = 0, filtered = [], catFilter = null;

    function getFiltered(q) {
      let list = REGISTRY;
      if (catFilter) list = list.filter(i => i.cat === catFilter);
      if (!q) {
        // Show MRU first, then all grouped by category
        const mru = getMRU();
        const mruItems = mru.map(n => list.find(i => i.name === n)).filter(Boolean);
        const rest = list.filter(i => !mru.includes(i.name));
        return [...mruItems, ...rest];
      }
      return list
        .map(i => ({ item: i, score: Math.max(fuzzyScore(q, i.name), fuzzyScore(q, i.desc||''), fuzzyScore(q, i.cat)) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
    }

    function openPalette() { overlay.classList.add('show'); input.value=''; activeIdx=0; catFilter=null; filtered=getFiltered(''); render(); setTimeout(()=>input.focus(),80); if(window._haptic)window._haptic.menuOpen(); autoDismiss('cmdPaletteOverlay',closePalette); }
    function closePalette() { overlay.classList.remove('show'); input.blur(); if(window._haptic)window._haptic.menuClose(); cancelAutoDismiss('cmdPaletteOverlay'); }

    function render() {
      if (!filtered.length) { resultsEl.innerHTML = '<div class="cmd-empty">No results found — try different keywords</div>'; return; }
      const q = input.value.toLowerCase();
      let lastCat = '';
      let html = '';
      filtered.forEach((item, i) => {
        // Category header
        if (item.cat !== lastCat && !q) {
          lastCat = item.cat;
          const isFirst = i === 0 && getMRU().includes(item.name);
          html += `<div class="cmd-cat-header">${isFirst ? '⏱ Recent' : item.cat}</div>`;
        }
        const name = q ? item.name.replace(new RegExp(`(${escRegex(q)})`, 'gi'), '<mark>$1</mark>') : item.name;
        html += `<div class="cmd-item ${i===activeIdx?'active':''}" data-idx="${i}">
          <span class="cmd-item-icon">${item.icon}</span>
          <div class="cmd-item-text">
            <div class="cmd-item-name">${name}</div>
            ${item.desc ? `<div class="cmd-item-desc">${item.desc}</div>` : ''}
          </div>
          ${item.keys ? `<span class="cmd-item-key">${item.keys}</span>` : ''}
          <span class="cmd-item-badge">${item.cat}</span>
        </div>`;
      });
      resultsEl.innerHTML = html;
      resultsEl.querySelectorAll('.cmd-item').forEach(el => el.addEventListener('click', ()=>select(parseInt(el.dataset.idx))));
      const ae = resultsEl.querySelector('.cmd-item.active'); if(ae) ae.scrollIntoView({block:'nearest'});
    }

    function select(idx) {
      const item=filtered[idx]; if(!item)return;
      if(window._haptic)window._haptic.tap();
      addMRU(item.name);
      closePalette();
      setTimeout(()=>item.action(),120);
      if(window.VDna) window.VDna.addXp(2);
      if(window._game) window._game.unlock('palette_used');
    }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      filtered = getFiltered(q);
      activeIdx = 0; render();
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,filtered.length-1);render();}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);render();}
      else if(e.key==='Enter'){e.preventDefault();select(activeIdx);}
      else if(e.key==='Escape'){closePalette();}
      else if(e.key==='Tab'){
        e.preventDefault();
        const cats = [...new Set(REGISTRY.map(i=>i.cat))];
        const curIdx = catFilter ? cats.indexOf(catFilter) : -1;
        catFilter = cats[(curIdx+1) % cats.length] || null;
        if (curIdx + 1 >= cats.length) catFilter = null; // cycle back to all
        filtered = getFiltered(input.value.toLowerCase().trim());
        activeIdx = 0; render();
      }
    });

    document.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey)&&(String(e.key).toLowerCase()==='k'||e.code==='KeyK')){e.preventDefault();overlay.classList.contains('show')?closePalette():openPalette();} });

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.search=()=>{setTimeout(openPalette,200);return'<span class="term-green">Opening command palette...</span>';};
    window.TermCmds.find=window.TermCmds.search;
    window._openPalette = openPalette;
    window._closePalette = closePalette;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: TROPHY CASE & PROGRESS (delegated to gamification.js)
  // ═══════════════════════════════════════════════════
  function initTrophySystem() { /* handled by gamification.js */ }
  function initAdminDashboard() { /* handled by gamification.js */ }


  // ═══════════════════════════════════════════════════
  // FEATURE 0: ALWAYS-VISIBLE CTA BUTTONS
  // ═══════════════════════════════════════════════════

  function initAlwaysCTA() {
    // Smart insertion: try multiple strategies to find the right spot
    // 1) After the last .lk (link card) row
    // 2) After .bio or description area
    // 3) Before .imp (impact numbers)
    // 4) After #app > div first child flex container
    let anchor = null;
    let position = 'afterend';

    // Strategy 1: Find last link card container
    const allLinks = document.querySelectorAll('a.lk');
    if (allLinks.length) {
      const lastLk = allLinks[allLinks.length - 1];
      // Walk up to the flex row containing link cards
      anchor = lastLk.closest('div[style*="flex"]') || lastLk.closest('.rv') || lastLk.parentElement;
    }

    // Strategy 2: Find the value proposition / bio area
    if (!anchor) {
      anchor = document.querySelector('.vp') || document.querySelector('#vpText') || document.querySelector('.imp');
    }

    // Strategy 3: Insert before impact numbers section
    if (!anchor) {
      const imp = document.querySelector('.imp');
      if (imp) { anchor = imp; position = 'beforebegin'; }
    }

    // Strategy 4: After the main profile container
    if (!anchor) {
      anchor = document.querySelector('#app > div > div') || document.querySelector('#app > div');
      if (anchor) {
        // Find a reasonable child element after the header
        const children = anchor.children;
        if (children.length > 3) { anchor = children[3]; position = 'afterend'; }
      }
    }

    if (!anchor) return;

    // Check we haven't already injected
    if (document.querySelector('.always-cta-row')) return;

    const row = document.createElement('div');
    row.className = 'always-cta-row rv';
    row.innerHTML = `
      <a href="https://www.linkedin.com/in/amrmelharony" target="_blank" rel="noopener"
         class="always-cta always-cta-linkedin">
        <i class="fa-brands fa-linkedin"></i> LinkedIn
      </a>
      <a href="https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session" target="_blank" rel="noopener"
         class="always-cta always-cta-mentor">
        <img src="Assets/Adplist.png" alt="ADPList" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;"> Get Mentored
      </a>`;

    anchor.insertAdjacentElement(position, row);

    // Animate in with GSAP if available
    if (window.gsap) {
      gsap.fromTo(row, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 2.2, ease: 'power3.out' });
    } else {
      row.style.opacity = '0'; row.style.transform = 'translateY(20px)';
      row.style.transition = 'opacity .6s ease, transform .6s ease';
      setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'none'; }, 2200);
    }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: INTERACTIVE TIMELINE — MINIMAL ENGINE
  // ═══════════════════════════════════════════════════

  function initInteractiveTimeline() {
    const tlWrap = document.querySelector('.tl-wrap');
    if (!tlWrap) return;
    const items = Array.from(tlWrap.querySelectorAll('.tl-item'));
    if (!items.length) return;

    tlWrap.style.position = 'relative';

    // ─── TAG CLASSIFICATION ───
    const TAGS = {
      banking:  ['bank','banque','misr','operations','financial','treasury','officer','credit','sme','business banking','corporate','lending'],
      agile:    ['scrum','agile','kanban','safe','sprint','delivery','pmp','lead','hybrid','standup','retrospective','backlog'],
      data:     ['data','analytics','cdmp','warehouse','pipeline','governance','mesh','analyst','bi','dashboard','report','datacamp'],
      speaking: ['speak','conference','seamless','devopsdays','keynote','panel','summit','techne','forum','moderator','career summit','techup'],
      learning: ['cert','degree','doctorate','dba','learn','study','university','award','earned','mba','frankfurt','helwan','bachelor','best learner','toastmasters'],
      author:   ['book','bilingual','executive','author','publish','write','community','founded','launched','fintech bilinguals'],
      mentor:   ['mentor','adplist','coaching','mentee','session','guidance','1000 min'],
      military: ['armed forces','military','army','officer','security','defense','technology officer'],
      fintech:  ['fintech','efa','egyptian fintech','startup','consultant','pro bono','association','ecosystem'],
      intern:   ['intern','nissan','central bank','exchange','mcdr','clearing','reinsurance','jazira'],
    };

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const tags = [];
      for (const [tag, keywords] of Object.entries(TAGS)) {
        if (keywords.some(kw => text.includes(kw))) tags.push(tag);
      }
      if (!tags.length) tags.push('general');
      item.dataset.tags = tags.join(',');
    });

    // ─── ROLE-SPECIFIC DETAILS (matched by keywords in timeline items) ───
    const ROLE_MAP = [
      {
        match: ['scrum master', '2025', 'scrum/kanban', 'flow metrics'],
        html: `<strong>Scrum Master — Banque Misr</strong> <span class="tl-expand-date">May 2025 – Present</span>
          <p>Championed a hybrid Scrum/Kanban framework for the data analytics team, using flow metrics to identify and eliminate systemic bottlenecks and improve delivery predictability.</p>
          <p>Serves as the key leadership bridge between technical data teams and business stakeholders, translating strategic goals into actionable work.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">⚡ Hybrid Scrum/Kanban</span><span class="tl-expand-metric">📈 Flow Metrics</span><span class="tl-expand-metric">🎯 PMP® + PSM II + ICP-ATF</span></div>
          <div class="tl-expand-skills">Agile Methodologies · Servant Leadership · Flow Metrics & Predictability</div>`
      },
      {
        match: ['corporate banking data analyst', 'data analyst', 'bi report', 'dashboard'],
        html: `<strong>Corporate Banking Data Analyst — Banque Misr</strong> <span class="tl-expand-date">Jun 2021 – May 2025 · 4 yrs</span>
          <p>Strategic pivot from project management into a hands-on data role to master the bank's core data assets — bridging the gap between project goals and data realities.</p>
          <p>Designed and delivered critical BI reports and dashboards for senior leadership, directly influencing corporate banking strategy. Skills validated by DataCamp Professional certification.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📊 BI Dashboards</span><span class="tl-expand-metric">🏦 Corporate Banking Strategy</span><span class="tl-expand-metric">💾 DataCamp Certified</span></div>
          <div class="tl-expand-skills">Stakeholder Management · Business Intelligence (BI)</div>`
      },
      {
        match: ['project management professional', 'pmp', 'cross-functional', 'scope, schedule'],
        html: `<strong>Project Management Professional — Banque Misr</strong> <span class="tl-expand-date">Feb 2020 – Jun 2021 · 1 yr 5 mos</span>
          <p>Applied a disciplined, PMP®-certified approach to lead end-to-end delivery of complex, cross-functional banking projects — rigorously managing scope, schedule, and budget in a regulated enterprise environment.</p>
          <p>Identified data integrity as the primary success factor for key initiatives — the critical insight that motivated specialization in data analytics.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎯 PMP® Certified</span><span class="tl-expand-metric">🏗️ Cross-Functional Delivery</span><span class="tl-expand-metric">🔍 Data Integrity Focus</span></div>
          <div class="tl-expand-skills">Risk Management · Scope Management · Regulated Environment</div>`
      },
      {
        match: ['sme', 'credit analyst', 'lending', 'portfolio risk'],
        html: `<strong>SMEs Credit Analyst — Banque Misr</strong> <span class="tl-expand-date">Nov 2017 – Feb 2020 · 2 yrs 4 mos</span>
          <p>Assessed financial health of corporate clients, managed portfolio risk, and made informed lending recommendations. This role was foundational for developing deep commercial acumen.</p>
          <p>Understanding core business drivers of clients became vital context for later work in technology delivery.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 Credit Risk Analysis</span><span class="tl-expand-metric">📑 Financial Statements</span><span class="tl-expand-metric">🤝 Client Portfolio</span></div>
          <div class="tl-expand-skills">Credit Risk Analysis · Financial Statement Analysis · Commercial Acumen</div>`
      },
      {
        match: ['business banking officer', 'financial advisor', 'small business'],
        html: `<strong>Business Banking Officer — Banque Misr</strong> <span class="tl-expand-date">Nov 2016 – Nov 2017 · 1 yr 1 mo</span>
          <p>Served as a trusted financial advisor and Accredited Small Business Consultant for a diverse portfolio of business clients, helping them achieve commercial goals.</p>
          <p>This client-facing role was foundational for developing deep customer empathy — an invaluable understanding of user needs that drives modern FinTech product development.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👤 Client Advisory</span><span class="tl-expand-metric">🏢 SME Portfolio</span><span class="tl-expand-metric">💡 Customer Empathy</span></div>
          <div class="tl-expand-skills">Relationship Management · Commercial Acumen · Client Needs Analysis</div>`
      },
      {
        match: ['armed forces', 'military', 'technology officer', 'digital security'],
        html: `<strong>Technology Officer | IT & Digital Security — Egyptian Armed Forces</strong> <span class="tl-expand-date">Jan 2015 – Mar 2016 · 1 yr 3 mos</span>
          <p>Commanded IT and digital security operations for a mission-critical unit, ensuring 100% uptime and integrity of vital systems in a high-stakes, zero-failure environment.</p>
          <p>Developed foundational expertise in IT infrastructure, network security, and disciplined operational management — a security-first mindset that now informs building resilient financial technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🛡️ 100% Uptime</span><span class="tl-expand-metric">🔐 Digital Security</span><span class="tl-expand-metric">⭐ Leadership Commendation</span></div>
          <div class="tl-expand-skills">Cybersecurity · Leadership Under Pressure · IT Infrastructure</div>`
      },
      {
        match: ['intern', 'nissan', 'central bank', 'exchange', 'mcdr', 'clearing'],
        html: `<strong>Finance & Banking Internships</strong> <span class="tl-expand-date">Jul 2011 – Jul 2014 · 3 yrs</span>
          <p>Built a robust and diverse foundation through competitive internships at Egypt's leading institutions — hands-on exposure to corporate finance, capital markets, and regulatory supervision.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏭 Nissan Motor Corp</span><span class="tl-expand-metric">🏛️ Central Bank of Egypt</span><span class="tl-expand-metric">📈 Egyptian Exchange</span><span class="tl-expand-metric">🔄 MCDR</span></div>
          <div class="tl-expand-skills">Corporate Finance · Capital Markets · Investment Analysis</div>`
      },
      {
        match: ['adplist', 'mentor', '1000 min', 'top 50'],
        html: `<strong>Leadership & Technology Mentor — ADPList</strong> <span class="tl-expand-date">Oct 2023 – Present · 2 yrs+</span>
          <p>Globally recognized as a Top 50 Mentor in Project Management on the ADPList platform. Dedicated 1,000+ minutes to coaching rising professionals in FinTech, data, and digital transformation.</p>
          <p>Empowers mentees to navigate complex career pivots, develop strategic skills, and accelerate into leadership roles.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏅 Top 50 PM Mentor</span><span class="tl-expand-metric">⏱️ 1,000+ Minutes</span><span class="tl-expand-metric">🌍 Global Remote</span></div>`
      },
      {
        match: ['fintech bilinguals', 'founder', 'community'],
        html: `<strong>Founder — Fintech Bilinguals</strong> <span class="tl-expand-date">Feb 2026 – Present</span>
          <p>Founded a community bridging the gap between Arabic-speaking finance professionals and global fintech knowledge — making cutting-edge concepts accessible across language barriers.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤝 Community Builder</span><span class="tl-expand-metric">🌐 Bilingual</span></div>`
      },
      {
        match: ['egyptian fintech association', 'efa', 'pro bono', 'management consultant'],
        html: `<strong>FinTech Management Consultant (Pro Bono) — EFA</strong> <span class="tl-expand-date">Oct 2019 – Present · 6 yrs+</span>
          <p>Strategic advisor to Egyptian FinTech startups — providing pro bono consulting on go-to-market strategy, business model validation, and regulatory compliance.</p>
          <p>Facilitates industry roundtables and contributes to the national FinTech ecosystem, bridging startups, incumbents, and investors.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🚀 Startup Advisory</span><span class="tl-expand-metric">🏛️ Ecosystem Building</span><span class="tl-expand-metric">💼 6+ Years Pro Bono</span></div>`
      },
      {
        match: ['doctorate', 'dba', 'digital transformation', 'e-hrm'],
        html: `<strong>DBA — Digital Transformation · Helwan University</strong> <span class="tl-expand-date">Completed Dec 2023</span>
          <p>Doctoral research on banking innovation, FinTech, and AI-driven transformation. Thesis: "The Relationship Between E-HRM Systems and Employee Satisfaction in Banking."</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎓 Doctorate</span><span class="tl-expand-metric">🤖 AI & Banking</span><span class="tl-expand-metric">📖 Published Research</span></div>`
      },
      {
        match: ['mba', 'entrepreneurship', 'startup strategy'],
        html: `<strong>MBA — Entrepreneurship · Helwan University</strong> <span class="tl-expand-date">Completed May 2019</span>
          <p>Specialized in startup strategy, product development, and digital finance. Developed a comprehensive business model for FinTech startup growth in the MENA region.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📈 Startup Strategy</span><span class="tl-expand-metric">💡 Product Dev</span><span class="tl-expand-metric">🌍 MENA Focus</span></div>`
      },
      {
        match: ['bachelor', 'ba,', 'international economics'],
        html: `<strong>BA — International Economics · Helwan University</strong> <span class="tl-expand-date">Completed May 2014</span>
          <p>Strong analytical foundation in global finance, macroeconomics, and international trade — essential context for a career at the intersection of banking and technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌐 Global Finance</span><span class="tl-expand-metric">📊 Economics</span></div>`
      },
      {
        match: ['frankfurt', 'digital finance', 'executive program'],
        html: `<strong>Certified Expert in Digital Finance — Frankfurt School</strong> <span class="tl-expand-date">Aug 2019</span>
          <p>Rigorous executive program at one of Europe's top business schools. Deep expertise in AI-driven finance, platform economics, and digital banking strategy.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🇩🇪 Frankfurt School</span><span class="tl-expand-metric">🤖 AI Finance</span><span class="tl-expand-metric">🏦 Digital Banking</span></div>`
      },
      {
        match: ['best learner', 'continuous professional', 'growth mindset'],
        html: `<strong>Best Learner Award — Banque Misr</strong> <span class="tl-expand-date">Dec 2023</span>
          <p>Recognized by bank leadership for outstanding commitment to continuous professional development and proactively acquiring high-value skills in digital transformation and agile methodologies.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏆 Bank Recognition</span><span class="tl-expand-metric">📚 Growth Mindset</span></div>`
      },
      {
        match: ['seamless', 'north africa', 'keynote interview'],
        html: `<strong>Panel Moderator — Seamless North Africa</strong> <span class="tl-expand-date">Sep 2024</span>
          <p>Moderated 4 panels + 1 keynote interview at the region's premier FinTech conference. Led discussions on digital banking, open innovation, and APIs with leaders from N26, Deutsche Bank, BNP Paribas, Mashreq, and Citi Bank.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 4 Panels + Keynote</span><span class="tl-expand-metric">🏦 Global Bank Leaders</span><span class="tl-expand-metric">🌍 MENA Premier</span></div>`
      },
      {
        match: ['devopsdays', 'ai & devops', 'ai-driven automation'],
        html: `<strong>Speaker — DevOpsDays Cairo 2025</strong> <span class="tl-expand-date">Sep 2025</span>
          <p>"AI & DevOps — Powering the Next Wave of Egyptian Fintech": exploring how AI-driven automation and DevOps practices are shaping the future of financial technology in Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤖 AI + DevOps</span><span class="tl-expand-metric">🇪🇬 Egyptian FinTech</span></div>`
      },
      {
        match: ['africa fintech forum', '$100 billion', 'digital payments'],
        html: `<strong>Panel Moderator — Africa FinTech Forum</strong> <span class="tl-expand-date">Jul 2025</span>
          <p>Moderated a powerhouse panel mapping the road to Egypt's $100 billion digital payments industry. Guided conversation on instant payments and AI-driven security with Banque Misr's Chief Consumer Banking Officer and the CEO of Sahl.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 $100B Payments</span><span class="tl-expand-metric">🤖 AI Security</span><span class="tl-expand-metric">🇪🇬 Egypt Vision</span></div>`
      },
      {
        match: ['techne summit', 'virtual cards', 'swipe smarter'],
        html: `<strong>Panel Moderator — Techne Summit Alexandria</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Swipe Smarter: Why Virtual Cards Are the Future of Business Payments" — led discussion on how virtual cards redefine business spending, security, and payments with Money Fellows and Paysky leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💳 Virtual Cards</span><span class="tl-expand-metric">🔒 Payment Security</span></div>`
      },
      {
        match: ['banking & fintech summit', 'traditional vs. digital', 'future of banking'],
        html: `<strong>Panel Moderator — Banking & Fintech Summit</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Future of Banking in Egypt: Traditional vs. Digital" — moderated alongside leaders from KFH Bank, EFG Holding, and Emirates NBD.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏦 Banking Future</span><span class="tl-expand-metric">📱 Digital vs Traditional</span></div>`
      },
      {
        match: ['career summit', 'career 180', 'banking economy'],
        html: `<strong>Panel Moderator — Egypt Career Summit</strong> <span class="tl-expand-date">May 2025</span>
          <p>"Beyond Transactions: Banking's Role in Shaping the Future Economy" — shared stage with COO of Emirates NBD and Chief Dealer of QNB Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌍 Future Economy</span><span class="tl-expand-metric">👥 Next-Gen Leaders</span></div>`
      },
      {
        match: ['techup women', 'data over intuition', 'never go with your gut'],
        html: `<strong>Expert Mentor — TechUp Women Summit</strong> <span class="tl-expand-date">Oct 2024</span>
          <p>"Data Over Intuition: Never Go With Your Gut" — deep dive into data-driven decision-making for career growth and leadership effectiveness. Selected as expert mentor for aspiring technology leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👩‍💻 Women in Tech</span><span class="tl-expand-metric">📊 Data-Driven</span></div>`
      },
      {
        match: ['toastmasters', 'public speaking', 'maadi'],
        html: `<strong>Leadership & Public Speaking — Maadi Toastmasters</strong>
          <p>Actively honed public speaking, impromptu communication, and leadership skills within the Toastmasters International framework. Instrumental for developing stage presence for professional speaking engagements.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 Stage Presence</span><span class="tl-expand-metric">💬 Impromptu</span></div>`
      },
      {
        match: ['bilingual executive', 'book', 'launched', 'published', 'amazon'],
        html: `<strong>The Bilingual Executive — Published Author</strong>
          <p>Published "The Bilingual Executive," a practical guide bridging Arabic-speaking professionals with global business and technology leadership concepts.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📘 Published Book</span><span class="tl-expand-metric">🌐 Bilingual Bridge</span><span class="tl-expand-metric">📦 Amazon</span></div>`
      },
    ];

    // Fallback by tag category (used when no role-specific match found)
    const DETAILS = {
      banking:  '<strong>Banking Career</strong> — 9+ years at Banque Misr spanning business banking, credit analysis, project management, data analytics, and agile delivery. <span class="tl-expand-metric">🏦 Banque Misr</span>',
      agile:    '<strong>Agile Delivery</strong> — Hybrid Scrum/Kanban framework, flow metrics, delivery predictability. Certified PMP®, PSM II, PSPO II, PMI-ACP, ICP-ATF. <span class="tl-expand-metric">⚡ 6+ Agile Certs</span>',
      data:     '<strong>Data & Analytics</strong> — BI dashboards, data governance, analytics platforms. DataCamp certified, CDMP qualified. <span class="tl-expand-metric">📊 BI Leadership</span>',
      speaking: '<strong>Conference Speaker</strong> — 10+ stages including Seamless North Africa (4 panels), DevOpsDays Cairo, Africa FinTech Forum, Techne Summit, TechUp Women. <span class="tl-expand-metric">🎤 10+ Stages</span>',
      learning: '<strong>Continuous Learning</strong> — DBA, MBA, BA from Helwan University. Frankfurt School Digital Finance. 20+ certifications. Best Learner Award. <span class="tl-expand-metric">🏆 Best Learner</span>',
      author:   '<strong>Thought Leadership</strong> — Published "The Bilingual Executive", founded Fintech Bilinguals community, 1,000+ mentoring minutes on ADPList. <span class="tl-expand-metric">📚 Author</span>',
      mentor:   '<strong>Mentorship</strong> — Top 50 ADPList Mentor in Project Management. 1,000+ minutes coaching FinTech, data, and digital transformation professionals. <span class="tl-expand-metric">🏅 Top 50</span>',
      military: '<strong>Military Service</strong> — Technology Officer at Egyptian Armed Forces. 100% uptime for mission-critical systems. Leadership commendation. <span class="tl-expand-metric">🛡️ 100% Uptime</span>',
      fintech:  '<strong>FinTech Ecosystem</strong> — 6+ years pro bono consulting for Egyptian FinTech Association. Startup advisory, ecosystem development. <span class="tl-expand-metric">🚀 6+ Years</span>',
      intern:   '<strong>Foundation Years</strong> — Internships at Nissan, Central Bank of Egypt, Egyptian Exchange, MCDR. Corporate finance, capital markets, regulatory exposure. <span class="tl-expand-metric">🏛️ 4 Institutions</span>',
    };

    // ─── 1. HIDE EXISTING STATIC LINE ───
    const staticLine = tlWrap.querySelector('.tl-line');
    if (staticLine) staticLine.style.display = 'none';

    // ─── 2. SCROLL-PROGRESS LINE (simple div) ───
    const scrollLine = document.createElement('div');
    scrollLine.className = 'tl-scroll-line';
    scrollLine.innerHTML = '<div class="tl-scroll-line-fill" id="tlScrollFill"></div>';
    tlWrap.appendChild(scrollLine);
    const scrollFill = document.getElementById('tlScrollFill');

    // ─── 4. FILTER PILLS ───
    const filters = document.createElement('div');
    filters.className = 'tl-filters'; filters.id = 'tlFilters';
    const filterIcons = { all: '✦', banking: '🏦', agile: '⚡', data: '📊', speaking: '🎤', learning: '🎓', author: '📚', mentor: '🎓', military: '🛡️', fintech: '🚀', intern: '🏛️' };
    ['all', ...Object.keys(TAGS)].forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tl-filter-btn' + (tag === 'all' ? ' active' : '');
      btn.innerHTML = (filterIcons[tag] || '') + ' ' + tag;
      btn.dataset.filter = tag;
      btn.addEventListener('click', () => { if(window._haptic)window._haptic.tap(); filterTimeline(tag); });
      filters.appendChild(btn);
    });
    tlWrap.parentNode.insertBefore(filters, tlWrap);

    // ─── 5. PROGRESS BAR ───
    const progressBar = document.createElement('div');
    progressBar.className = 'tl-progress-bar'; progressBar.id = 'tlProgressBar';
    progressBar.innerHTML = `
      <div class="tl-progress-track"><div class="tl-progress-fill" id="tlProgressFill"></div></div>
      <span class="tl-progress-label" id="tlProgressLabel">0%</span>`;
    tlWrap.parentNode.insertBefore(progressBar, tlWrap);
    const progressFill = document.getElementById('tlProgressFill');
    const progressLabel = document.getElementById('tlProgressLabel');

    // ─── 6. EXPAND CARDS + MARK ITEMS ───
    items.forEach((item, idx) => {
      const tags = item.dataset.tags.split(',');
      const primaryTag = tags[0];
      const itemText = item.textContent.toLowerCase();

      // Try role-specific match first
      let detail = null;
      for (const role of ROLE_MAP) {
        if (role.match.some(kw => itemText.includes(kw.toLowerCase()))) {
          detail = role.html;
          break;
        }
      }
      // Fallback to tag-based detail
      if (!detail) detail = DETAILS[primaryTag] || DETAILS.banking;

      const expandDiv = document.createElement('div');
      expandDiv.className = 'tl-item-expand';
      expandDiv.innerHTML = `<div class="tl-expand-content">${detail}</div>`;
      item.appendChild(expandDiv);

      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const isOpen = expandDiv.classList.contains('open');
        tlWrap.querySelectorAll('.tl-item-expand.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) { expandDiv.classList.add('open'); if(window._haptic)window._haptic.expand(); }
        else { if(window._haptic)window._haptic.collapse(); }
      });

      item.classList.add('tl-enhanced');
    });

    // ─── 7. ENTRANCE ANIMATION ───
    if (!RM) {
      setTimeout(() => {
        const viewH = window.innerHeight;
        items.forEach((item, idx) => {
          const r = item.getBoundingClientRect();
          if (r.top > viewH) {
            item.classList.add('tl-hidden');
            item.style.transitionDelay = (idx % 5) * 0.05 + 's';
          } else {
            item.classList.add('tl-visible');
          }
        });
      }, 2000);
    }

    // ─── 8. MASTER SCROLL ENGINE ───
    let rafId = null;
    let lastProgress = -1;
    let _tlWrapTop = tlWrap.offsetTop;
    let _tlWrapH = tlWrap.offsetHeight;

    window.addEventListener('resize', () => {
      _tlWrapTop = tlWrap.offsetTop;
      _tlWrapH = tlWrap.offsetHeight;
    }, { passive: true });

    const _tlRevealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.classList.contains('tl-hidden')) {
          entry.target.classList.remove('tl-hidden');
          entry.target.classList.add('tl-visible');
        }
      });
    }, { threshold: 0.12 });

    const _tlActiveIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('tl-active',
          entry.isIntersecting && !entry.target.classList.contains('filtered-out'));
      });
    }, { threshold: 0.35 });

    items.forEach(item => { _tlRevealIO.observe(item); _tlActiveIO.observe(item); });

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollY = window.scrollY;
        const viewH = window.innerHeight;
        const inView = scrollY + viewH > _tlWrapTop && scrollY < _tlWrapTop + _tlWrapH;

        progressBar.classList.toggle('show', inView);

        if (!inView) return;

        const rawProgress = Math.max(0, Math.min(1,
          (scrollY + viewH * 0.5 - _tlWrapTop) / _tlWrapH
        ));
        if (Math.abs(rawProgress - lastProgress) > 0.002) {
          lastProgress = rawProgress;
          scrollFill.style.height = (rawProgress * 100) + '%';
          const pct = Math.round(rawProgress * 100);
          progressFill.style.width = pct + '%';
          progressLabel.textContent = pct + '%';
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    setTimeout(onScroll, 2500);

    // ─── 9. FILTER SYSTEM ───
    function filterTimeline(tag) {
      document.querySelectorAll('.tl-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === tag)
      );
      items.forEach(item => {
        const isEra = item.classList.contains('tl-era');
        if (tag === 'all' || isEra) {
          item.classList.remove('filtered-out');
        } else {
          const match = item.dataset.tags.split(',').includes(tag);
          item.classList.toggle('filtered-out', !match);
        }
      });
      // Re-trigger entrance for newly visible items
      setTimeout(onScroll, 100);
    }

    // ─── 10. TERMINAL INTEGRATION ───
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.timeline = (args) => {
      const tag = (args || '').trim().toLowerCase();
      if (tag && Object.keys(TAGS).includes(tag)) {
        filterTimeline(tag);
        setTimeout(() => scrollTo('.tl-wrap'), 200);
        return `<span class="term-green">Filtered timeline to: ${tag}</span>`;
      }
      return `<span class="term-gray">Usage: timeline [banking|agile|data|speaking|learning|author]</span>`;
    };

    function scrollTo(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE GUESTBOOK
  // ═══════════════════════════════════════════════════

  const GB_EMOJIS = ['👋','⭐','🔥','💡','🚀','❤️','🎉','🤝','👏','💪'];

  async function fetchGBEntries() {
    if (!_sb) return [];
    try {
      const { data, error } = await _sb
        .from('guestbook_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn('Supabase guestbook fetch failed:', e); return []; }
  }

  async function insertGBEntry(entry) {
    if (!_sb) return false;
    try {
      const { error } = await _sb.from('guestbook_entries').insert(entry);
      if (error) throw error;
      return true;
    } catch (e) { console.warn('Supabase guestbook insert failed:', e); return false; }
  }

  function renderGBRows(entries) {
    const container = document.getElementById('gbEntries');
    if (!container) return;
    if (entries.length === 0) {
      container.innerHTML = '<div class="gb-empty">No entries yet — be the first! ✨</div>';
      return;
    }
    container.innerHTML = entries.map(e => {
      const ts = e.created_at ? new Date(e.created_at).getTime() : (e.time || Date.now());
      return `<div class="gb-entry">
        <span class="gb-entry-emoji">${escHtml(e.emoji)}</span>
        <div class="gb-entry-meta">
          <div class="gb-entry-name">${escHtml(e.name)}</div>
          ${e.msg ? `<div class="gb-entry-msg">${escHtml(e.msg)}</div>` : ''}
          <div class="gb-entry-time">${timeAgo(ts)}</div>
        </div>
      </div>`;
    }).join('');
  }

  async function renderGBEntriesFromSupabase() {
    const container = document.getElementById('gbEntries');
    if (!container) return;
    container.innerHTML = '<div class="gb-empty" style="opacity:.5">Loading entries...</div>';
    const entries = await fetchGBEntries();
    renderGBRows(entries);
    if (window._sono) window._sono.guestbookOpen(entries);
  }

  function initGuestbook() {
    const overlay = document.createElement('div');
    overlay.id = 'guestbookOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeGuestbook(); });
    overlay.innerHTML = `
      <div class="gb-panel">
        <div class="gb-title">🌍 Visitor Wall</div>
        <div class="gb-subtitle">Leave your mark — say hi!</div>
        <div style="text-align:center"><button type="button" class="gb-globe-btn" id="gbGlobeBtn">🌐 View Globe</button></div>
        <div class="gb-form" id="gbForm">
          <div class="gb-emoji-row" id="gbEmojiRow"></div>
          <input class="gb-name-input" id="gbName" placeholder="Your name" maxlength="30">
          <input class="gb-msg-input" id="gbMsg" placeholder="Quick message (optional)" maxlength="100">
          <button class="gb-submit" id="gbSubmit" disabled>Sign the Wall</button>
        </div>
        <div class="gb-entries" id="gbEntries"></div>
        <div class="gb-close" onclick="window._closeGuestbook()">[ ESC or tap to close ]</div>
      </div>`;
    document.body.appendChild(overlay);

    const emojiRow = document.getElementById('gbEmojiRow');
    let selectedEmoji = null;
    GB_EMOJIS.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'gb-emoji-btn'; btn.textContent = e;
      btn.addEventListener('click', () => {
        emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected'); selectedEmoji = e; updateSubmit();
        if(window._haptic)window._haptic.tap();
      });
      emojiRow.appendChild(btn);
    });

    document.getElementById('gbGlobeBtn').addEventListener('click', function(){
      var btn=this;
      if(window._launchGlobe){window._closeGuestbook();setTimeout(window._launchGlobe,300);return;}
      if(typeof loadGlobe!=='function'){if(window.UniToast)window.UniToast('Globe unavailable');return;}
      btn.textContent='Loading...';btn.disabled=true;
      loadGlobe().then(function(){
        if(window._launchGlobe){window._closeGuestbook();setTimeout(window._launchGlobe,300);}
        else{btn.textContent='🌐 View Globe';btn.disabled=false;if(window.UniToast)window.UniToast('Globe failed to load');}
      }).catch(function(){btn.textContent='🌐 View Globe';btn.disabled=false;if(window.UniToast)window.UniToast('Globe failed to load');});
    });

    const nameInput=document.getElementById('gbName'), submitBtn=document.getElementById('gbSubmit');
    function updateSubmit() { submitBtn.disabled = !selectedEmoji || !nameInput.value.trim(); }
    nameInput.addEventListener('input', updateSubmit);

    let _lastGBSubmit = 0;
    submitBtn.addEventListener('click', async () => {
      if (!selectedEmoji || !nameInput.value.trim()) return;
      if (!GB_EMOJIS.includes(selectedEmoji)) return;
      const now = Date.now();
      if (now - _lastGBSubmit < 30000) { submitBtn.textContent = 'Wait before signing again'; setTimeout(() => { submitBtn.textContent = 'Sign the Wall'; }, 2000); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing...';
      const uid = window.AuthManager ? await window.AuthManager.getUid() : null;
      const name = nameInput.value.trim().slice(0, 30);
      const msg = (document.getElementById('gbMsg').value.trim() || '').slice(0, 200) || null;
      const entry = { emoji: selectedEmoji, name: name, msg: msg, user_id: uid };
      if (window._visitorLoc) { entry.lat = window._visitorLoc.lat; entry.lng = window._visitorLoc.lng; }
      const success = await insertGBEntry(entry);
      if (success) {
        _lastGBSubmit = Date.now();
        nameInput.value = ''; document.getElementById('gbMsg').value = ''; selectedEmoji = null;
        emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b => b.classList.remove('selected'));
        submitBtn.textContent = 'Sign the Wall';
        if (window._sono) window._sono.guestbookSign(entry.emoji);
        await renderGBEntriesFromSupabase();
        spawnBubble(entry.emoji);
        if (window._presenceAudio) window._presenceAudio.onGuestbookEntry();
        if (window.VDna) window.VDna.addXp(10);
        if (window._haptic) window._haptic.success();
        if (window._game) window._game.unlock('guestbook_signed');
      } else {
        submitBtn.textContent = 'Failed — try again';
        setTimeout(() => { submitBtn.textContent = 'Sign the Wall'; }, 3000);
      }
      updateSubmit();
    });

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.guestbook=()=>{setTimeout(openGuestbook,200);return'<span class="term-green">🌍 Opening guestbook...</span>';};
    window.TermCmds.wall=window.TermCmds.guestbook;
    window._closeGuestbook = closeGuestbook;
  }

  window.openGuestbook = openGuestbook;
  function openGuestbook() {
    const el=document.getElementById('guestbookOverlay'); if(!el)return;
    el.classList.add('show');
    if(window._haptic)window._haptic.menuOpen();
    const gbBtn=document.getElementById('guestbookBtn'); if(gbBtn) gbBtn.classList.add('active');
    autoDismiss('guestbookOverlay',closeGuestbook);
    renderGBEntriesFromSupabase();
  }
  function closeGuestbook() { if (window._sono) window._sono.guestbookClose(); document.getElementById('guestbookOverlay')?.classList.remove('show'); const gbBtn=document.getElementById('guestbookBtn'); if(gbBtn) gbBtn.classList.remove('active'); if(window._haptic)window._haptic.menuClose(); cancelAutoDismiss('guestbookOverlay'); }
  function spawnBubble(emoji) {
    const el=document.createElement('span'); el.className='gb-bubble'; el.textContent=emoji;
    el.style.left=(15+Math.random()*70)+'vw'; el.style.bottom='10px';
    document.body.appendChild(el); setTimeout(()=>el.remove(),6500);
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 5: VOICE NAVIGATION — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // 25+ routes · continuous mode · trophy triggers · compound commands · confidence display

  let voiceActive = false, recognition = null;

  function initVoiceNav() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    const btn = document.createElement('button');
    btn.className = 'tbtn voice-tbtn'; btn.id = 'voiceBtn';
    btn.setAttribute('aria-label','Voice Navigation'); btn.title = 'Voice Command (V)';
    btn.innerHTML = '<i class="fa-solid fa-microphone-slash" id="voiceIcon"></i>';
    const audioBtnRef = document.getElementById('audioBtn');
    if (audioBtnRef) audioBtnRef.insertAdjacentElement('afterend', btn);
    else { const themeBtnRef = document.getElementById('tbtn'); if (themeBtnRef) themeBtnRef.insertAdjacentElement('afterend', btn); else document.getElementById('topBtns')?.appendChild(btn); }

    const transcript = document.createElement('div');
    transcript.className = 'voice-transcript'; transcript.id = 'voiceTranscript';
    document.body.appendChild(transcript);

    // Route helpers
    function scrollTo(sel){const el=document.querySelector(sel);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
    function clickLink(partial){const lk=document.querySelector(`a.lk[href*="${partial}"]`);if(lk)lk.click();}

    const ROUTES = [
      // Navigation
      { match:/open\s*arcade|play\s*game|games|arcade/i,    action:()=>{if(window._openArcade)window._openArcade();return'🕹️ Opening Arcade';} },
      { match:/play\s*stacker|sprint\s*stacker/i,           action:()=>{if(window.TermCmds?.play)window.TermCmds.play('stacker');return'🧱 Launching Sprint Stacker';} },
      { match:/play\s*router|data\s*mesh\s*router/i,        action:()=>{if(window.TermCmds?.play)window.TermCmds.play('router');return'🔀 Launching Data Mesh Router';} },
      { match:/play\s*trader|fintech\s*trader|stock/i,      action:()=>{if(window.openGame)window.openGame();return'📈 Launching FinTech Trader';} },
      { match:/play\s*snake/i,                               action:()=>{if(window.TermCmds?.play)window.TermCmds.play('snake');return'🐍 Launching Snake';} },
      { match:/play\s*bilingual|bilingual\s*swipe/i,         action:()=>{if(window.TermCmds?.play)window.TermCmds.play('bilingual');return'🌐 Launching Bilingual Swipe';} },
      { match:/certif|certs|badges|credential/i,             action:()=>{scrollTo('#certGrid');return'📜 Scrolling to Certifications';} },
      { match:/testimon|recommend|reviews|endorse/i,         action:()=>{scrollTo('.tc-section');return'⭐ Scrolling to Testimonials';} },
      { match:/timeline|journey|experience|career|history/i, action:()=>{scrollTo('.tl-wrap');return'🚀 Scrolling to Timeline';} },
      { match:/contact|email|phone|reach\s*out|connect/i,    action:()=>{const s=document.getElementById('contactSecret');if(s)s.classList.add('revealed');scrollTo('.sr');if(window._game)window._game.unlock('explorer_contact');return'📧 Revealing Contact Info';} },
      { match:/read\s*(?:the\s*)?book|audiobook|tts/i,          action:()=>{if(window._openTTSReader)window._openTTSReader();return'📘 Opening Audiobook Preview';} },
      { match:/spatial|gesture|hand\s*track|eye\s*track|webcam/i, action:()=>{loadSpatial().then(()=>window._toggleSpatialNav()).catch(()=>{});return'🖐️ Toggling Spatial Nav';} },
      { match:/mesh|peer|p2p|webrtc|data\s*mesh/i, action:()=>{if(window._mesh){window._mesh.toggleHUD();return'🕸️ Toggling Mesh HUD';}return'🕸️ Mesh not loaded';} },
      { match:/book|bilingual\s*exec|author|amazon/i,        action:()=>{clickLink('bilingual');return'📘 Opening Book Link';} },
      { match:/mentor|adplist|coaching|session/i,             action:()=>{window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank');return'🎓 Opening ADPList';} },
      { match:/conference|speak|talks|panel|keynote/i,        action:()=>{scrollTo('.conf-strip');return'🎤 Scrolling to Conferences';} },
      { match:/article|linkedin.*post|blog|writing/i,         action:()=>{scrollTo('#linkedinFeed');return'📝 Scrolling to Articles';} },
      { match:/impact|numbers|metrics|data\s*point/i,         action:()=>{scrollTo('.imp');return'📊 Scrolling to Impact Numbers';} },
      // Features
      { match:/zen\s*mode|clean|focus|minimal/i,              action:()=>{const b=document.getElementById('zenBtn');if(b)b.click();if(window._game)window._game.unlock('theme_zen');return'🧘 Toggling Zen Mode';} },
      { match:/search|find|command|palette|look\s*for/i,      action:()=>{if(window._openPalette)window._openPalette();return'⌨️ Opening Command Palette';} },
      { match:/guest\s*book|wall|sign|visitor/i,              action:()=>{openGuestbook();return'🌍 Opening Guestbook';} },
      { match:/terminal|console|hack|shell/i,                 action:()=>{if(window.openTerm)window.openTerm();return'💻 Opening Terminal';} },
      { match:/trophy|trophies|achievement|progress|badge/i,  action:()=>{if(window._openTrophies)window._openTrophies();return'🏆 Opening Trophy Case';} },
      { match:/passkey|biometric|fingerprint|faceid|webauthn|secure.*wallet/i, action:()=>{if(window._openPasskey)window._openPasskey();return'🔐 Opening Biometric Passkeys';} },
      { match:/calendar|schedule|book.*call|meeting/i,        action:()=>{window.open('https://calendly.com/amrmelharony/30min','_blank');return'📅 Opening Calendar';} },
      { match:/linkedin\s*profile|connect.*linkedin/i,        action:()=>{window.open('https://linkedin.com/in/amrmelharony','_blank');return'💼 Opening LinkedIn';} },
      { match:/three\s*d.*book|3d.*book|book.*viewer/i,       action:()=>{if(window.TermCmds?.book3d)window.TermCmds.book3d();return'📦 Opening 3D Book';} },
      { match:/data\s*mesh|mesh.*visual|visualizer|fintech.*visual/i, action:()=>{if(window.TermCmds?.datamesh)window.TermCmds.datamesh();return'📊 Opening Live FinTech Visualizer';} },
      // Scroll
      { match:/scroll\s*down|next|continue/i,                 action:()=>{window.scrollBy({top:window.innerHeight*0.7,behavior:'smooth'});return'⬇️ Scrolling down';} },
      { match:/scroll\s*up|back|previous/i,                   action:()=>{window.scrollBy({top:-window.innerHeight*0.7,behavior:'smooth'});return'⬆️ Scrolling up';} },
      { match:/top|home|start|beginning/i,                    action:()=>{window.scrollTo({top:0,behavior:'smooth'});return'⏫ Scrolling to Top';} },
      { match:/bottom|end|footer/i,                           action:()=>{window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});return'⏬ Scrolling to Bottom';} },
      // Meta
      { match:/help|what can|commands|options/i,              action:()=>{showVoiceHelp(transcript);return'📋 Showing available commands';} },
      { match:/stop|cancel|close|never\s*mind/i,             action:()=>{return'👋 Stopped listening';} },
    ];

    function showVoiceHelp(el) {
      el.innerHTML = `<div style="font-size:9px;line-height:1.6;color:#8b949e">
        <strong style="color:#00e1ff">Voice Commands:</strong><br>
        "certifications" · "timeline" · "contact" · "arcade"<br>
        "play stacker" · "trophy case" · "zen mode"<br>
        "scroll down" · "go to top" · "open terminal"<br>
        "book a call" · "linkedin" · "guestbook"<br>
        "passkey" · "help" · "stop"
      </div>`;
      el.classList.add('show');
    }

    let hideTimer = null, listeningTimer = null, commandCount = 0;
    recognition.onresult = (event) => {
      let text=''; for(let i=event.resultIndex;i<event.results.length;i++) text+=event.results[i][0].transcript;
      const isFinal=event.results[event.results.length-1].isFinal;
      const confidence = event.results[event.results.length-1][0].confidence;
      const confPct = Math.round((confidence||0) * 100);

      if(listeningTimer){clearTimeout(listeningTimer);listeningTimer=null;}
      transcript.innerHTML=`<span class="heard">"${escHtml(text)}"</span> <span style="color:#2d3748;font-size:8px">${confPct}%</span>`;
      transcript.classList.add('show');
      if(hideTimer)clearTimeout(hideTimer);

      if(isFinal){
        let matched=false;
        for(const route of ROUTES){
          if(route.match.test(text)){
            const result=route.action();
            transcript.innerHTML=`<span class="heard">"${escHtml(text)}"</span> → <span class="action">${escHtml(result)}</span>`;
            matched=true;
            commandCount++;
            if(window.VDna) window.VDna.addXp(3);
            // Trophy: first voice command
            if(window._game) window._game.unlock('voice_used');
            break;
          }
        }
        if(!matched) {
          transcript.innerHTML=`<span class="heard">"${escHtml(text)}"</span> → <span style="color:#6b7280">Say "help" for available commands</span>`;
        }
        hideTimer=setTimeout(()=>transcript.classList.remove('show'), matched ? 3000 : 4500);
        stopVoice();
      }
    };
    recognition.onerror=(e)=>{ if(e.error!=='aborted') stopVoice(); };
    recognition.onend=()=>{if(voiceActive)stopVoice();};

    function startVoice(){
      voiceActive=true; btn.classList.add('listening'); btn.classList.add('active');
      document.getElementById('voiceIcon').className='fa-solid fa-microphone';
      transcript.innerHTML='<span style="color:#ef4444;font-size:10px">🎙️ Listening... say a command</span>';
      transcript.classList.add('show');
      if(listeningTimer)clearTimeout(listeningTimer);
      listeningTimer=setTimeout(()=>{if(voiceActive)transcript.classList.remove('show');},5000);
      try{recognition.start();}catch(e){}
      if(window._haptic)window._haptic.toggle();
    }
    function stopVoice(){voiceActive=false;btn.classList.remove('listening');btn.classList.remove('active');document.getElementById('voiceIcon').className='fa-solid fa-microphone-slash';if(listeningTimer){clearTimeout(listeningTimer);listeningTimer=null;}transcript.classList.remove('show');try{recognition.stop();}catch(e){}}
    function toggleVoice(){voiceActive?stopVoice():startVoice();}
    window._toggleVoice=toggleVoice;

    btn.addEventListener('click',toggleVoice);
    document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;if(e.key==='v'&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleVoice();});

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.voice=()=>{setTimeout(toggleVoice,200);return voiceActive?'<span class="term-gray">🔇 Voice stopped</span>':'<span class="term-green">🎤 Listening... say "help" for commands</span>';};
    window.TermCmds['voice-help']=()=>{
      return `<span class="term-green">🎙️ Voice Commands:</span>
<span class="term-gray">Navigation:</span> certifications, timeline, testimonials, contact, impact, conferences, articles
<span class="term-gray">Arcade:</span> arcade, play stacker, play router, play trader, play snake, play bilingual
<span class="term-gray">Features:</span> zen mode, terminal, guestbook, trophy case, passkey, search, read book, spatial, mesh
<span class="term-gray">Links:</span> linkedin, book a call, mentor, book
<span class="term-gray">Scroll:</span> scroll down, scroll up, go to top, bottom
<span class="term-gray">Meta:</span> help, stop`;
    };
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 6: TTS BOOK READER — Voice Synthesis + Audio Visualizer
  // ═══════════════════════════════════════════════════

  const BOOK_EXCERPT = [
    'In today\'s digital economy, the most impactful leaders are bilingual.',
    'Not in the traditional sense of speaking two languages — but in their ability to fluently navigate both business strategy and technology execution.',
    'The Bilingual Executive argues that this duality is not optional; it is the defining skill of the modern leader.',
    'Whether you\'re a product manager translating user needs into technical specifications, a delivery lead orchestrating agile sprints while keeping stakeholders aligned, or a C-suite executive making data-driven decisions about digital transformation — bilingual fluency is your competitive edge.',
    'The bridge between business and technology is not built with code alone. It is built with empathy, clarity, and the courage to speak both languages fluently.',
    'Digital transformation starts with people, not technology. The organizations that thrive are those whose leaders can translate vision into execution — one sprint at a time.',
  ];

  let _ttsOverlay = null, _ttsUtterance = null, _ttsAnimFrame = null;
  let _ttsSpeaking = false, _ttsPaused = false;
  let _ttsBarData = [], _ttsLastBoundary = 0, _ttsVoice = null;

  function getTTSVoice() {
    if (_ttsVoice) return _ttsVoice;
    const voices = speechSynthesis.getVoices();
    const prefs = ['Google UK English Female', 'Google US English', 'Samantha', 'Karen', 'Daniel', 'Zira', 'David'];
    for (const p of prefs) {
      const v = voices.find(x => x.name.includes(p));
      if (v) { _ttsVoice = v; return v; }
    }
    _ttsVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    return _ttsVoice;
  }

  function initTTSReader() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.getVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => { _ttsVoice = null; getTTSVoice(); };
    }
  }

  function openTTSReader() {
    if (!('speechSynthesis' in window)) return;
    if (_ttsOverlay) { closeTTSReader(); return; }
    if(window._haptic)window._haptic.menuOpen();

    const rm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const BAR_COUNT = 64;
    _ttsBarData = new Array(BAR_COUNT).fill(0);
    const fullText = BOOK_EXCERPT.join(' ');

    const overlay = document.createElement('div');
    overlay.id = 'ttsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(6,8,15,.92);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .4s';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeTTSReader(); });

    const panel = document.createElement('div');
    panel.style.cssText = 'width:90%;max-width:640px;max-height:90vh;overflow-y:auto;position:relative';

    panel.innerHTML = `
      <button id="ttsCloseBtn" style="position:absolute;top:0;right:0;background:none;border:none;color:#6b7a90;font-size:18px;cursor:pointer;padding:8px;z-index:2">✕</button>
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#00e1ff;margin-bottom:6px;font-family:'JetBrains Mono',monospace">📘 Audiobook Preview</div>
        <div style="font-size:22px;font-weight:700;color:#f0f2f5;line-height:1.3">The Bilingual Executive</div>
        <div style="font-size:12px;color:#6b7a90;margin-top:4px">by Amr Elharony</div>
      </div>
      <canvas id="ttsCanvas" width="640" height="100" style="width:100%;height:80px;border-radius:8px;margin-bottom:20px"></canvas>
      <div id="ttsText" style="font-size:15px;line-height:1.8;color:#a0aec0;margin-bottom:24px;font-family:'Inter','Segoe UI',sans-serif">${fullText}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px">
        <button id="ttsPlayBtn" style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:8px 24px;border-radius:100px;border:1px solid rgba(0,225,255,.3);background:rgba(0,225,255,.08);color:#00e1ff;cursor:pointer;transition:all .2s">▶ Play</button>
        <button id="ttsStopBtn" style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:8px 20px;border-radius:100px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#6b7a90;cursor:pointer;transition:all .2s">■ Stop</button>
        <button id="ttsSpeedBtn" style="font-family:'JetBrains Mono',monospace;font-size:10px;padding:6px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#6b7a90;cursor:pointer;transition:all .2s">1×</button>
      </div>`;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    _ttsOverlay = overlay;
    requestAnimationFrame(() => overlay.style.opacity = '1');

    const canvas = document.getElementById('ttsCanvas');
    const textEl = document.getElementById('ttsText');
    const playBtn = document.getElementById('ttsPlayBtn');
    const stopBtn = document.getElementById('ttsStopBtn');
    const speedBtn = document.getElementById('ttsSpeedBtn');
    document.getElementById('ttsCloseBtn').addEventListener('click', closeTTSReader);

    drawTTSBars(canvas, BAR_COUNT);

    let speedIdx = 1;
    const speeds = [0.75, 1, 1.25, 1.5];
    const speedLabels = ['0.75×', '1×', '1.25×', '1.5×'];

    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      speedBtn.textContent = speedLabels[speedIdx];
      if (_ttsSpeaking) {
        const ci = _ttsUtterance?._lastCharIdx || 0;
        speechSynthesis.cancel();
        _startTTSSpeech(fullText, ci, speeds[speedIdx], canvas, textEl, playBtn, BAR_COUNT, rm);
      }
    });

    playBtn.addEventListener('click', () => {
      if (_ttsSpeaking && !_ttsPaused) {
        speechSynthesis.pause();
        _ttsPaused = true;
        playBtn.textContent = '▶ Play';
        return;
      }
      if (_ttsPaused) {
        speechSynthesis.resume();
        _ttsPaused = false;
        playBtn.textContent = '❚❚ Pause';
        return;
      }
      _startTTSSpeech(fullText, 0, speeds[speedIdx], canvas, textEl, playBtn, BAR_COUNT, rm);
    });

    stopBtn.addEventListener('click', () => {
      speechSynthesis.cancel();
      _ttsSpeaking = false; _ttsPaused = false;
      playBtn.textContent = '▶ Play';
      textEl.textContent = fullText;
      _ttsBarData.fill(0);
      drawTTSBars(canvas, BAR_COUNT);
    });

    document.addEventListener('keydown', _ttsEscHandler);
  }

  function _ttsEscHandler(e) { if (e.key === 'Escape') closeTTSReader(); }

  function _startTTSSpeech(text, fromChar, rate, canvas, textEl, playBtn, barCount, rm) {
    speechSynthesis.cancel();
    const segment = fromChar > 0 ? text.substring(fromChar) : text;
    const utt = new SpeechSynthesisUtterance(segment);
    utt._lastCharIdx = fromChar;
    const voice = getTTSVoice();
    if (voice) utt.voice = voice;
    utt.rate = rate;
    utt.pitch = 1.05;

    utt.onboundary = (ev) => {
      if (ev.name !== 'word') return;
      _ttsLastBoundary = performance.now();
      const absIdx = fromChar + ev.charIndex;
      utt._lastCharIdx = absIdx;
      const before = escHtml(text.substring(0, absIdx));
      const word = escHtml(text.substring(absIdx, absIdx + ev.charLength));
      const after = escHtml(text.substring(absIdx + ev.charLength));
      textEl.innerHTML = `<span style="color:#8b949e">${before}</span><span style="color:#00e1ff;font-weight:600;text-shadow:0 0 8px rgba(0,225,255,.3)">${word}</span><span style="color:#a0aec0">${after}</span>`;
    };

    utt.onend = () => {
      if (utt !== _ttsUtterance) return;
      _ttsSpeaking = false; _ttsPaused = false;
      playBtn.textContent = '▶ Play';
      textEl.textContent = text;
      if (_ttsAnimFrame) cancelAnimationFrame(_ttsAnimFrame);
      _ttsBarData.fill(0);
      drawTTSBars(canvas, barCount);
    };

    speechSynthesis.speak(utt);
    _ttsUtterance = utt;
    _ttsSpeaking = true; _ttsPaused = false;
    _ttsLastBoundary = performance.now();
    playBtn.textContent = '❚❚ Pause';

    if (!rm) _animateTTSBars(canvas, barCount);
    else { _ttsBarData.fill(0.3); drawTTSBars(canvas, barCount); }
  }

  function _animateTTSBars(canvas, barCount) {
    if (_ttsAnimFrame) cancelAnimationFrame(_ttsAnimFrame);
    function tick() {
      if (!_ttsSpeaking && !_ttsPaused) {
        _ttsBarData.fill(0);
        drawTTSBars(canvas, barCount);
        return;
      }
      _ttsAnimFrame = requestAnimationFrame(tick);
      if (window._suspended) return;
      const now = performance.now();
      const sinceWord = now - _ttsLastBoundary;
      const energy = _ttsPaused ? 0 : Math.max(0, 1 - sinceWord / 350);

      for (let i = 0; i < barCount; i++) {
        const freq = Math.sin(now * 0.004 + i * 0.7) * 0.5 + 0.5;
        const harmonic = Math.sin(now * 0.0017 + i * 1.3) * 0.3 + 0.7;
        const bass = i < barCount * 0.25 ? 1.3 : 1;
        const target = energy * freq * harmonic * bass * (0.5 + Math.random() * 0.5);
        _ttsBarData[i] += (target - _ttsBarData[i]) * 0.18;
      }
      drawTTSBars(canvas, barCount);
    }
    tick();
  }

  function drawTTSBars(canvas, barCount) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    const barW = (w / barCount) * 0.7;
    const gap = (w / barCount) * 0.3;

    for (let i = 0; i < barCount; i++) {
      const val = _ttsBarData[i] || 0;
      const barH = Math.max(2, val * h * 0.9);
      const x = i * (barW + gap);
      const ratio = i / barCount;
      const r = Math.round(ratio * 168);
      const g = Math.round(225 - ratio * 127);
      const b = Math.round(255 - ratio * 8);
      c.fillStyle = `rgba(${r},${g},${b},${0.4 + val * 0.6})`;
      c.beginPath();
      if (c.roundRect) { c.roundRect(x, h - barH, barW, barH, 2); }
      else { c.rect(x, h - barH, barW, barH); }
      c.fill();
    }
  }

  function closeTTSReader() {
    if(window._haptic)window._haptic.menuClose();
    speechSynthesis.cancel();
    _ttsSpeaking = false; _ttsPaused = false;
    if (_ttsAnimFrame) cancelAnimationFrame(_ttsAnimFrame);
    document.removeEventListener('keydown', _ttsEscHandler);
    if (_ttsOverlay) {
      _ttsOverlay.style.opacity = '0';
      setTimeout(() => { if (_ttsOverlay) { _ttsOverlay.remove(); _ttsOverlay = null; } }, 400);
    }
  }

  window._openTTSReader = openTTSReader;
  window._closeTTSReader = closeTTSReader;




  // ═══════════════════════════════════════════════════
  // ADVANCED TERMINAL COMMANDS
  // ═══════════════════════════════════════════════════
  function wireAdvancedTerminal() {
    window.TermCmds = window.TermCmds || {};
    const T = window.TermCmds;

    // Phase 6 adds new commands to existing _meta registry instead of overwriting help
    if (T._meta) {
      Object.assign(T._meta, {
        'read':         { cat: 'TOOLS', desc: 'TTS audiobook preview', usage: 'read book' },
        'spatial-help': { cat: 'TOOLS', desc: 'Spatial gesture guide' },
        'risk-profile': { cat: 'TOOLS', desc: 'Behavioral biometrics scatter plot' },
        'voice-help':   { cat: 'TOOLS', desc: 'Show voice commands' },
        'llm-load':     { cat: 'AI', desc: 'Download local AI model' },
        'llm-off':      { cat: 'AI', desc: 'Disable AI, use keyword matching' },
        'llm-on':       { cat: 'AI', desc: 'Re-enable local AI mode' },
        'lake-sql':     { cat: 'AI', desc: 'Run raw SQL on data lake' },
        'prefetch-stats':{ cat: 'AI', desc: 'Prediction accuracy & hit rate' },
        'mesh-stats':   { cat: 'MULTI', desc: 'Mesh stats (peers, latency, CRDT)' },
      });
    }

    // ── Navigation ──────────────────────────────
    const NAV_MAP = {
      timeline: '.tl-wrap', certs: '#certGrid', certifications: '#certGrid',
      impact: '.imp', numbers: '.imp', testimonials: '.tc-section',
      conferences: '.conf-strip', articles: '#linkedinFeed', contact: '.sr',
    };
    T.goto = (args) => {
      const target = (args || '').trim().toLowerCase();
      if (!target) return '<span class="term-gray">Usage: goto &lt;section&gt; — try: timeline, certs, impact, testimonials, conferences, articles, contact</span>';
      const sel = NAV_MAP[target];
      if (!sel) return `<span class="term-red">Unknown section "${escHtml(target)}".</span> Try: ${Object.keys(NAV_MAP).join(', ')}`;
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (target === 'contact') { const s = document.getElementById('contactSecret'); if (s) s.classList.add('revealed'); }
      }
      return `<span class="term-green">📍 Navigating to ${target}...</span>`;
    };
    T.top = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); return '<span class="term-green">⏫ Scrolling to top</span>'; };
    T.bottom = () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return '<span class="term-green">⏬ Scrolling to bottom</span>'; };

    // ── Arcade ──────────────────────────────
    T.arcade = () => { if (window._openArcade) { setTimeout(() => window._openArcade(), 200); } return '<span class="term-green">🕹️ Opening Arcade...</span>'; };
    T.scores = () => {
      let arcade;try{arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){arcade={};}
      const hs = arcade.highScores || {};
      const names = { stacker:'Sprint Stacker', router:'Data Mesh Router', trader:'FinTech Trader', bilingual:'Bilingual Swipe', snake:'Snake' };
      if (!Object.keys(hs).length) return '<span class="term-gray">No high scores yet. Play some games first!</span>';
      const rows = Object.entries(hs).map(([id, score]) => `  <span class="term-white">${names[id] || _termEsc(id)}</span>: <span class="term-green">${_termEsc(String(score))}</span>`).join('\n');
      return `<span class="term-cyan">🏅 High Scores:</span>\n${rows}\n  <span class="term-gray">Total plays: ${arcade.totalPlays || 0} | Boss: ${arcade.bossBeaten ? '✅ Defeated' : '❌ Not yet'}</span>`;
    };

    // ── Passkey ──────────────────────────────
    T.passkey = (arg) => {
      const a = (arg || '').trim().toLowerCase();
      if (!window._passkey) return '<span class="term-gray">WebAuthn module not loaded</span>';
      if (!window._passkey.isAvailable()) return '<span class="term-warn">⚠️ WebAuthn not supported on this device/browser</span>';
      if (a === 'register') {
        setTimeout(() => window._openPasskey(), 200);
        return '<span class="term-green">🔐 Opening Passkey registration...</span>';
      }
      if (a === 'auth' || a === 'login' || a === 'verify') {
        if (window._passkey.credentialCount === 0) return '<span class="term-gray">No passkeys registered. Run: passkey register</span>';
        setTimeout(() => { window._openPasskey(); setTimeout(() => { if (window._passkeyAuth) window._passkeyAuth(); }, 500); }, 200);
        return '<span class="term-green">🔓 Initiating biometric verification...</span>';
      }
      if (a === 'revoke' || a === 'delete') {
        if (window._passkey.credentialCount === 0) return '<span class="term-gray">No passkeys to revoke</span>';
        window._passkey.revoke();
        return '<span class="term-green">🗑️ All passkeys revoked</span>';
      }
      if (a === 'status' || a === 'info' || !a) {
        const count = window._passkey.credentialCount;
        const authed = window._passkey.isAuthenticated;
        const name = window._passkey.getVerifiedName();
        let out = '<span class="term-cyan">🔐 Biometric Passkey Status</span>\n';
        out += `  <span class="term-white">WebAuthn</span>: <span class="term-green">Available</span>\n`;
        out += `  <span class="term-white">Passkeys</span>: ${count > 0 ? '<span class="term-green">' + count + ' registered</span>' : '<span class="term-gray">None</span>'}\n`;
        out += `  <span class="term-white">Session</span>:  ${authed ? '<span class="term-green">✅ Verified' + (name ? ' (' + _termEsc(name) + ')' : '') + '</span>' : '<span class="term-gray">Not authenticated</span>'}\n`;
        out += `  <span class="term-white">Protocol</span>: FIDO2 / WebAuthn L2\n`;
        out += `  <span class="term-white">Algorithm</span>: ECDSA P-256 (ES256)\n`;
        out += '\n<span class="term-gray">Usage: passkey register | auth | status | revoke</span>';
        return out;
      }
      return '<span class="term-gray">Usage: passkey [register|auth|status|revoke]</span>';
    };

    // ── Themes ──────────────────────────────
    T.zen = () => { const b = document.getElementById('zenBtn'); if (b) b.click(); if (window._game) window._game.unlock('theme_zen'); return '<span class="term-green">🧘 Toggling Zen Mode</span>'; };
    T.matrix = () => {
      if (document.getElementById('matrixCanvas')) return '<span class="term-green">🟢 Matrix rain already active</span>';
      const canvas = document.createElement('canvas');
      canvas.id = 'matrixCanvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:9998;pointer-events:none;';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const chars = '01AMRELHARONYDATAAGILEFINTECH٢٠٢٦';
      const fontSize = 14;
      const cols = Math.floor(canvas.width / fontSize);
      let lastFrame = 0;
      const FRAME_INTERVAL = 80;

      if (typeof Worker !== 'undefined') {
        try {
          const mw = new Worker('Js/matrix-worker.js');
          mw.postMessage({ type: 'init', columns: cols, canvasHeight: canvas.height, fontSize: fontSize });
          let mData = null;
          mw.onmessage = function(e) { mData = e.data; };
          function drawW(ts) {
            if (!document.getElementById('matrixCanvas')) { mw.terminate(); return; }
            if (window._suspended) { requestAnimationFrame(drawW); return; }
            if (ts - lastFrame < FRAME_INTERVAL) { requestAnimationFrame(drawW); return; }
            lastFrame = ts;
            if (mData) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
              const hc = mData.headChars, hy = mData.headY, tr = mData.trails;
              for (let i = 0; i < hc.length; i++) { ctx.globalAlpha = 0.9; ctx.fillText(String.fromCharCode(hc[i]), i * fontSize, hy[i]); }
              for (let j = 0; j < tr.length; j += 4) { ctx.globalAlpha = tr[j + 2]; ctx.fillText(String.fromCharCode(tr[j + 3]), tr[j] * fontSize, tr[j + 1]); }
              ctx.globalAlpha = 1;
            }
            mw.postMessage({ type: 'tick' });
            requestAnimationFrame(drawW);
          }
          mw.postMessage({ type: 'tick' });
          requestAnimationFrame(drawW);
          setTimeout(() => { canvas.style.transition = 'opacity 2s'; canvas.style.opacity = '0'; setTimeout(() => { canvas.remove(); mw.terminate(); }, 2000); if(window._game)window._game.unlock('matrix_dweller'); }, 30000);
        } catch (e) { _matrixFallback(canvas, ctx, chars, fontSize, cols); }
      } else {
        _matrixFallback(canvas, ctx, chars, fontSize, cols);
      }
      return '<span class="term-green">Wake up, Neo... (Simulation Active)</span>';
    };
    function _matrixFallback(canvas, ctx, chars, fontSize, cols) {
      const drops = Array(cols).fill(1);
      let lastFrame = 0;
      function draw(ts) {
        if (!document.getElementById('matrixCanvas')) return;
        if (window._suspended) { requestAnimationFrame(draw); return; }
        if (ts - lastFrame < 80) { requestAnimationFrame(draw); return; }
        lastFrame = ts;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < drops.length; i++) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          const y = drops[i] * fontSize;
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
          ctx.fillText(text, i * fontSize, y);
          for (let t = 1; t <= 12; t++) { const ty = y - t * fontSize; if (ty < 0) break; ctx.globalAlpha = (1 - t / 12) * 0.4; ctx.fillText(chars.charAt(Math.floor(Math.random() * chars.length)), i * fontSize, ty); }
          ctx.globalAlpha = 1;
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
      setTimeout(() => { canvas.style.transition = 'opacity 2s'; canvas.style.opacity = '0'; setTimeout(() => canvas.remove(), 2000); if(window._game)window._game.unlock('matrix_dweller'); }, 30000);
    }

    // ── Links ──────────────────────────────
    T.linkedin = () => { window.open('https://linkedin.com/in/amrmelharony', '_blank'); return '<span class="term-green">💼 Opening LinkedIn profile...</span>'; };
    T.calendar = () => { window.open('https://calendly.com/amrmelharony/30min', '_blank'); return '<span class="term-green">📅 Opening calendar booking...</span>'; };
    T.book = () => { const lk = document.querySelector('a.lk[href*="bilingual"]'); if (lk) lk.click(); return '<span class="term-green">📘 Opening The Bilingual Executive...</span>'; };
    T.mentor = () => { window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session', '_blank'); return '<span class="term-green">🎓 Opening ADPList mentoring...</span>'; };
    T.community = () => { const lk = document.querySelector('a.lk[href*="fintech-bilinguals"]'); if (lk) lk.click(); return '<span class="term-green">🤝 Opening Fintech Bilinguals...</span>'; };

    // ── System / Info ──────────────────────────────
    T.whoami = () => {
      return `<span class="term-cyan">═══ Amr El Harony ═══</span>
<span class="term-white">Scrum Master</span> @ Banque Misr — Data & Analytics Division (9+ yrs at BM)
<span class="term-gray">Career path: Business Banking → Credit Analysis → PMP → Data Analytics → Scrum Master</span>
<span class="term-gray">DBA in Digital Transformation · MBA in Entrepreneurship · BA in International Economics</span>
<span class="term-gray">Certified Expert in Digital Finance (Frankfurt School)</span>
<span class="term-gray">20+ certifications: PMP®, SAFe 6, PSM II, PSPO II, PMI-ACP, ICP-ATF, PSK, CDMP</span>
<span class="term-gray">Author of "The Bilingual Executive" · Founder of Fintech Bilinguals</span>
<span class="term-gray">Top 50 ADPList Mentor (PM) · 1,000+ mentoring minutes</span>
<span class="term-gray">10+ conference stages: Seamless NA, DevOpsDays, Africa FinTech Forum, Techne Summit</span>
<span class="term-gray">6+ years pro bono FinTech consulting (Egyptian FinTech Association)</span>
<span class="term-gray">Technology Officer veteran (Egyptian Armed Forces · IT & Digital Security)</span>`;
    };

    T.resume = () => {
      return `<span class="term-cyan">═══ Career Timeline ═══</span>
<span class="term-white">2025–Now:</span>  Scrum Master — Banque Misr (Data & Analytics) · Hybrid Scrum/Kanban
<span class="term-white">2021–2025:</span> Corporate Banking Data Analyst — BI dashboards, DataCamp certified
<span class="term-white">2020–2021:</span> Project Management Professional — PMP®, cross-functional delivery
<span class="term-white">2017–2020:</span> SMEs Credit Analyst — Portfolio risk, lending, financial analysis
<span class="term-white">2016–2017:</span> Business Banking Officer — Client advisory, SME consulting
<span class="term-white">2015–2016:</span> Technology Officer — Egyptian Armed Forces (IT & Digital Security)
<span class="term-white">2011–2014:</span> Finance Internships — Nissan, Central Bank, Exchange, MCDR

<span class="term-cyan">═══ Education ═══</span>
<span class="term-white">2023:</span> DBA Digital Transformation — Helwan University
<span class="term-white">2019:</span> Certified Expert in Digital Finance — Frankfurt School
<span class="term-white">2019:</span> MBA Entrepreneurship — Helwan University
<span class="term-white">2014:</span> BA International Economics — Helwan University

<span class="term-cyan">═══ Speaking (10+ stages) ═══</span>
<span class="term-white">2025:</span> Banking & FinTech Summit · Techne Summit · DevOpsDays Cairo
<span class="term-white">2025:</span> Africa FinTech Forum · Egypt Career Summit
<span class="term-white">2024:</span> Seamless North Africa (4 panels + keynote) · TechUp Women

<span class="term-cyan">═══ Other Roles ═══</span>
<span class="term-white">2026–Now:</span>  Founder — Fintech Bilinguals community
<span class="term-white">2023–Now:</span>  Top 50 ADPList Mentor (1,000+ minutes)
<span class="term-white">2019–Now:</span>  FinTech Consultant (Pro Bono) — Egyptian FinTech Association
<span class="term-white">Author:</span>    "The Bilingual Executive" (Published)`;
    };

    T.stack = () => {
      return `<span class="term-cyan">═══ Site Tech Stack ═══</span>
<span class="term-white">Frontend:</span>  HTML5 · CSS3 · Vanilla JS (6,300+ lines)
<span class="term-white">Animation:</span> GSAP · CSS Animations · Canvas API · SVG
<span class="term-white">Features:</span>  Command Palette · Voice Nav · Terminal · Guestbook
<span class="term-white">Games:</span>    5 mini-games (Canvas) + Boss Fight
<span class="term-white">3D:</span>       Three.js book viewer · Data Mesh visualization
<span class="term-white">Gamify:</span>   XP system · 24 trophies · progress tracking
<span class="term-white">Themes:</span>   Zen Mode · Cyberpunk · RTL support
<span class="term-white">Data:</span>     localStorage · Visitor DNA system · engagement scoring`;
    };

    T.uptime = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const sessionStart = vdna.sessionStart || Date.now();
      const diff = Date.now() - sessionStart;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return `<span class="term-green">⏱ Session: ${mins}m ${secs}s</span> | <span class="term-gray">Visits: ${vdna.visits || 1}</span>`;
    };

    T.xp = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const xp = vdna.xp || 0, level = vdna.level || 1;
      const unlocked = vdna.unlocked ? Object.keys(vdna.unlocked).length : 0;
      const nextLvl = level * 50;
      const bar = '█'.repeat(Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20))) + '░'.repeat(20 - Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20)));
      return `<span class="term-cyan">Level ${level}</span> — <span class="term-green">${xp} XP</span>
<span class="term-gray">[${bar}] ${xp % nextLvl}/${nextLvl} to next level</span>
<span class="term-gray">Trophies: ${unlocked}/24</span>`;
    };

    T.export = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      let arcade;try{arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');}catch(e){arcade={};}
      const data = { vdna, arcade, exported: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'amrelharony-session.json'; a.click();
      URL.revokeObjectURL(url);
      return '<span class="term-green">📦 Session data exported!</span>';
    };

    T.reset = () => {
      localStorage.removeItem('arcade_state');
      localStorage.removeItem('guestbook_entries');
      localStorage.removeItem('cmd_mru');
      if (window.VDna) {
        const v = window.VDna.get();
        v.xp = 0; v.level = 1; v.unlocked = {};
        window.VDna.save();
      }
      return '<span class="term-red">⚠️ All progress reset. Refresh to see changes.</span>';
    };

    // ── Easter eggs ──────────────────────────────
    T.easter = () => {
      return `<span class="term-green">🥚 Hidden commands exist...</span>
<span class="term-gray">Try: matrix, cowsay, fortune, neofetch, sudo</span>`;
    };
    T.cowsay = (args) => {
      const msg = _termEsc(args || 'Hire Amr!');
      return `<span class="term-white"> ${'_'.repeat(msg.length + 2)}
&lt; ${msg} &gt;
 ${'-'.repeat(msg.length + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</span>`;
    };
    T.fortune = () => {
      const fortunes = [
        'The best way to predict the future is to build it.',
        'Data is the new oil, but insight is the new gold.',
        'Agility is not about going fast, it is about going smart.',
        'The bridge between banking and tech is built one sprint at a time.',
        'A good mentor plants trees they may never sit under.',
        'Digital transformation starts with people, not technology.',
        'Ship fast, learn faster, iterate always.',
      ];
      return `<span class="term-green">🔮 ${fortunes[Math.floor(Math.random() * fortunes.length)]}</span>`;
    };
    T.neofetch = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const ua = navigator.userAgent;
      const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';
      const device = /Mobile|Android/i.test(ua) ? 'Mobile' : 'Desktop';
      return `<span class="term-cyan">        ___
       /   \\      </span><span class="term-white">amrelharony.com</span><span class="term-cyan">
      | A E |     </span><span class="term-gray">───────────────</span><span class="term-cyan">
      |  H  |     </span><span class="term-white">OS:</span><span class="term-gray"> Portfolio v6.0</span><span class="term-cyan">
       \\___/      </span><span class="term-white">Shell:</span><span class="term-gray"> Phase6 Terminal</span>
                  <span class="term-white">Browser:</span><span class="term-gray"> ${browser}</span>
                  <span class="term-white">Device:</span><span class="term-gray"> ${device}</span>
                  <span class="term-white">XP:</span><span class="term-gray"> ${vdna.xp || 0}</span>
                  <span class="term-white">Level:</span><span class="term-gray"> ${vdna.level || 1}</span>
                  <span class="term-white">Visits:</span><span class="term-gray"> ${vdna.visits || 1}</span>
                  <span class="term-white">Uptime:</span><span class="term-gray"> ${Math.floor((Date.now() - (vdna.sessionStart || Date.now())) / 60000)}m</span>`;
    };
    T.sudo = () => '<span class="term-red">Nice try 😎 — you don\'t have root access to this portfolio!</span>';
    T.hack = () => '<span class="term-green">Initializing hack sequence... just kidding. Try "help" instead.</span>';

    // ── TTS & Ambient Light ──────────────────────────────
    T['read'] = (args) => {
      if ((args || '').trim().toLowerCase() === 'book') {
        setTimeout(openTTSReader, 300);
        return '<span class="term-green">📘 Launching audiobook preview with TTS...</span>';
      }
      return '<span class="term-gray">Usage: read book</span>';
    };
    T.readbook = () => { setTimeout(openTTSReader, 300); return '<span class="term-green">📘 Launching audiobook preview with TTS...</span>'; };

    T['spatial-help'] = () => {
      return `<span class="term-green">🖐️ Spatial Navigation — Gesture Guide</span>

<span class="term-cyan">Navigation (continuous):</span>
  <span class="term-white">✋ Open Palm</span>      Scroll — hand height controls speed & direction
  <span class="term-white">👆 Point</span>          Hover — fingertip highlights interactive elements
  <span class="term-white">🤏 Pinch</span>          Click — tap the element under your fingers
  <span class="term-white">👋 Swipe L/R</span>      Sections — swipe to jump between sections
  <span class="term-white">🔢 Count 1-5</span>     Jump to section 1-5 by holding up fingers

<span class="term-cyan">Actions (hold to confirm):</span>
  <span class="term-white">✊ Fist</span>           Dismiss — close any active overlay (ESC)
  <span class="term-white">✌️ Peace</span>          Theme — toggle light / dark mode (D)
  <span class="term-white">👍 Thumbs Up</span>     Share — open the share overlay
  <span class="term-white">👎 Thumbs Down</span>   Guestbook — open guestbook (G)
  <span class="term-white">🤘 Rock</span>           Matrix Rain — toggle matrix effect (M)
  <span class="term-white">🔫 Gun</span>            Terminal — open terminal (\`)

<span class="term-cyan">Face Mode (activates when hand not detected):</span>
  <span class="term-white">👁️ Eye Gaze</span>       Scroll — look up/down to scroll the page
  <span class="term-white">😑 Double Blink</span>   Click — blink both eyes twice quickly
  <span class="term-white">👄 Mouth Open</span>     Theme — open mouth wide to toggle theme

<span class="term-gray">Toggle: N key · toolbar button · > spatial</span>`;
    };

    T.ambient = () => {
      if (!('AmbientLightSensor' in window)) return '<span class="term-red">⚠️ Ambient Light Sensor not supported in this browser. Try Chrome with #enable-generic-sensor-extra-classes flag.</span>';
      const on = window._toggleAmbientTheme ? window._toggleAmbientTheme() : false;
      return on
        ? '<span class="term-green">💡 Ambient light auto-theme enabled — theme adapts to room brightness</span>'
        : '<span class="term-gray">💡 Ambient light auto-theme disabled — using manual theme</span>';
    };

    // ── P2P Data Mesh ──────────────────────────────
    T.mesh = () => {
      if (!window._mesh) return '<span class="term-gray">Mesh not loaded yet — waiting for multiplayer init</span>';
      const on = window._mesh.toggleHUD();
      const s = window._mesh.getStats();
      return on
        ? `<span class="term-green">🕸️ Mesh HUD visible — ${s.connected}/${s.totalPeers} peers direct P2P</span>`
        : '<span class="term-gray">🕸️ Mesh HUD hidden</span>';
    };

    T['mesh-stats'] = () => {
      if (!window._mesh) return '<span class="term-gray">Mesh not initialized</span>';
      const s = window._mesh.getStats();
      const fmt = (b) => b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
      return `<span class="term-green">🕸️ P2P Data Mesh Statistics</span>

<span class="term-cyan">Topology:</span>
  <span class="term-white">Direct Peers</span>     ${s.connected} / ${s.totalPeers}
  <span class="term-white">Status</span>           ${s.connected >= s.totalPeers ? '<span class="term-green">Full Mesh</span>' : s.connected > 0 ? '<span style="color:#f59e0b">Partial</span>' : '<span class="term-gray">No peers</span>'}
  <span class="term-white">Latency</span>          ${s.avgLatency >= 0 ? s.avgLatency + ' ms' : '—'}

<span class="term-cyan">Transfer:</span>
  <span class="term-white">Sent</span>             ${fmt(s.bytesSent)}
  <span class="term-white">Received</span>         ${fmt(s.bytesRecv)}

<span class="term-cyan">CRDT:</span>
  <span class="term-white">Ready</span>            ${window._mesh.isCRDTReady() ? '<span class="term-green">Yes (Yjs)</span>' : '<span class="term-gray">No</span>'}
  <span class="term-white">Chat Log</span>         ${window._mesh.isCRDTReady() ? window._mesh.getChatHistory().length + ' msgs' : '—'}

<span class="term-cyan">Uptime:</span>             ${s.uptime}s
<span class="term-gray">Transport: WebRTC DataChannel · Signaling: Supabase · CRDT: Yjs</span>`;
    };

    T.peers = () => {
      if (!window._mesh) return '<span class="term-gray">Mesh not initialized</span>';
      const peers = window._mesh.getPeers();
      if (!peers || peers.size === 0) return '<span class="term-gray">No P2P peers connected</span>';
      let rows = '<span class="term-green">🕸️ Connected Peers</span>\n';
      for (const [pid, link] of peers) {
        const st = link.state;
        const stats = link.getStats();
        const color = st === 'open' ? 'term-green' : st === 'connecting' ? 'style="color:#f59e0b"' : 'term-gray';
        const attr = color.startsWith('term-') ? `class="${color}"` : color;
        rows += `\n  <span ${attr}>●</span> ${pid.slice(0,8)}… <span class="term-gray">${st}${stats.latency >= 0 ? ' · ' + stats.latency + 'ms' : ''}</span>`;
      }
      return rows;
    };

    T.prefetch = () => {
      if (!window._prefetch) return '<span class="term-gray">Prefetch system not loaded yet</span>';
      window._prefetch.toggleHUD();
      return '<span class="term-green">📊 Prefetch debug HUD toggled</span>';
    };

    T['prefetch-stats'] = () => {
      if (!window._prefetch) return '<span class="term-gray">Prefetch system not loaded yet</span>';
      const s = window._prefetch.getStats();
      const top = s.topPredictions;
      let predsStr = top.length ? top.map(p => p.state + ' (' + Math.round(p.prob * 100) + '%)').join(', ') : 'none';
      return `<span class="term-green">📊 Predictive Prefetch Statistics</span>

<span class="term-gray">Model:</span>       ${s.model === 'markov' ? 'Markov Chain' : 'WebNN MLP (' + s.model.split('/')[1] + ')'}
<span class="term-gray">Section:</span>     ${s.currentSection}
<span class="term-gray">Predictions:</span> ${s.predictions} cycles
<span class="term-gray">Prefetched:</span>  ${s.prefetches} scripts [${s.prefetchedScripts.join(', ') || 'none'}]
<span class="term-gray">Accuracy:</span>    ${s.accuracy}% (${s.hits} hits / ${s.misses} misses)
<span class="term-gray">Transitions:</span> ${s.transitions} recorded
<span class="term-gray">Top predict:</span> ${predsStr}`;
    };

    // ── Compute Pressure (SLA Monitor) ──────
    T.pressure = () => {
      if (!window._pressure) return '<span class="term-gray">Pressure monitor not loaded yet</span>';
      const st = window._pressure.state();
      const lv = window._pressure.level();
      const mode = window._pressure.mode();
      const colors = { nominal:'term-green', fair:'term-warn', serious:'term-red', critical:'term-red' };
      return `<span class="${colors[st] || 'term-gray'}">⚡ Compute Pressure: ${st.toUpperCase()}</span>

<span class="term-gray">Level:</span>       ${lv}/3 ${lv >= 2 ? '⚠️ constrained' : '✅ healthy'}
<span class="term-gray">API:</span>         ${mode === 'native' ? 'W3C Compute Pressure API' : 'Frame Timing Heuristic'}
<span class="term-gray">Degradation:</span> ${st === 'nominal' ? 'None' : st === 'fair' ? 'Reduced blur' : st === 'serious' ? 'No blur, no particles' : 'Survival mode'}
<span class="term-gray">Protocol:</span>    Delivery Lead SLA — maintain 60fps under load`;
    };

    // ── Behavioral Biometric Risk Profile ──────
    T['risk-profile'] = () => {
      if (!window._riskProfile) return '<span class="term-gray">Biometric engine not loaded yet</span>';
      return window._riskProfile.render();
    };
    T.risk = T['risk-profile'];

    T.soundtrack = () => {
      if (!window._sono) return '<span class="term-gray">Sonification engine not loaded yet</span>';
      const s = window._sono.status();
      const en = s.enabled ? '<span class="term-green">● ON</span>' : '<span class="term-gray">○ OFF</span>';
      const mod = s.active ? `<span class="term-cyan">${s.active}</span>` : '<span class="term-gray">idle</span>';
      return `<span class="term-green">🎵 Data Sonification Engine</span>

<span class="term-gray">Audio:</span>    ${en}
<span class="term-gray">Module:</span>   ${mod}
<span class="term-gray">Voices:</span>   <span class="term-white">${s.voices}</span> active
<span class="term-gray">BPM:</span>      <span class="term-white">${s.bpm}</span>

<span class="term-cyan">Modules:</span>
  <span class="term-white">Sprint Stacker</span>   Industrial bass pulse + line-clear chords
  <span class="term-white">FinTech Trader</span>   Market drone + hi-hat coins + bomb drops
  <span class="term-white">Data Mesh Router</span> Polyphonic arpeggio + domain timbres
  <span class="term-white">Bilingual Swipe</span>  Binaural panning + harmonic merge
  <span class="term-white">Scope Defender</span>   Sub-bass drone + drum loop + power-ups
  <span class="term-white">FinTech Viz</span>      Per-trade notes from live Binance data
  <span class="term-white">Guestbook</span>        Harmonic chord from visitor signatures

<span class="term-gray">Toggle audio: S key · > audio on/off</span>`;
    };

    // ── Cross-Window DOM Teleportation ──────
    T.tearoff = (arg) => {
      if (!window._crossWindow) return '<span class="term-gray">Cross-window engine not loaded yet</span>';
      const a = (arg || '').trim().toLowerCase();
      if (a === 'terminal' || a === 'term') {
        setTimeout(() => window._crossWindow.tearTerminal(), 200);
        return '<span class="term-green">Tearing off terminal into a new window...</span>';
      }
      if (a === 'chart' || a === 'viz' || a === 'trades') {
        setTimeout(() => window._crossWindow.tearChart(), 200);
        return '<span class="term-green">Tearing off live chart into a new window...</span>';
      }
      return `<span class="term-green">📡 Cross-Window DOM Teleportation</span>

<span class="term-gray">Usage:</span>
  <span class="term-white">tearoff terminal</span>   Tear the terminal into a separate window
  <span class="term-white">tearoff chart</span>      Tear the live trade chart into a separate window

<span class="term-gray">Both windows sync via BroadcastChannel at 60fps.
Drag them apart to see particles bridge across the gap.</span>

<span class="term-gray">Close torn-off windows:</span> Escape key or type <span class="term-cyan">exit</span>`;
    };
    T.tear = T.tearoff;

    T['monitor-status'] = () => {
      if (!window._crossWindow) return '<span class="term-gray">Cross-window engine not loaded yet</span>';
      const s = window._crossWindow.status();
      const peers = s.peers > 0
        ? '<span class="term-green">' + s.peers + ' connected</span>'
        : '<span class="term-gray">0 (tear off a component to connect)</span>';
      const active = s.active.length > 0
        ? s.active.map(a => '<span class="term-cyan">' + a + '</span>').join(', ')
        : '<span class="term-gray">none</span>';
      return `<span class="term-green">📡 Multi-Monitor Status</span>

<span class="term-gray">Window ID:</span>  <span class="term-white">${s.id}</span>
<span class="term-gray">Position:</span>   <span class="term-white">${s.geo.x}, ${s.geo.y}</span>  (${s.geo.w}×${s.geo.h})
<span class="term-gray">Peers:</span>      ${peers}
<span class="term-gray">Active:</span>     ${active}

<span class="term-gray">Sync:</span> BroadcastChannel @ 60fps
<span class="term-gray">Bridge:</span> Screen-space particle teleportation`;
    };

    // ── Data Lake (OPFS + SQLite) ──────
    T.lake = () => {
      if (!window._lake) return '<span class="term-gray">Data Lake not loaded yet</span>';
      const m = window._lake.mode;
      const r = window._lake.isReady;
      return `<span class="term-green">🗄️ Data Lake Status</span>

<span class="term-gray">Mode:</span>   ${m === 'opfs' ? '<span class="term-green">OPFS + SQLite (async)</span>' : m === 'fallback' ? '<span class="term-warn">localStorage fallback</span>' : '<span class="term-gray">initializing...</span>'}
<span class="term-gray">Ready:</span>  ${r ? '<span class="term-green">● yes</span>' : '<span class="term-gray">○ no</span>'}
<span class="term-gray">Engine:</span> wa-sqlite (WebAssembly) + AccessHandlePoolVFS

Type <span class="term-white">lake-stats</span> for table counts and DB size.
Type <span class="term-white">lake-export</span> to download a portable .db file.
Type <span class="term-white">lake-sql</span> <span class="term-gray">"query"</span> to run raw SQL.`;
    };

    T['lake-stats'] = () => {
      if (!window._lake || !window._lake.isReady) return '<span class="term-gray">Data Lake not ready</span>';
      if (window._lake.mode === 'fallback') return '<span class="term-warn">Data Lake running in localStorage fallback — no SQL stats available</span>';
      window._lake.stats().then(s => {
        function fmtBytes(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }
        _termAppend(`<span class="term-green">🗄️ Data Lake Statistics</span>

<span class="term-gray">Mode:</span>       OPFS + SQLite
<span class="term-gray">DB size:</span>    ${fmtBytes(s.dbSize)}
<span class="term-gray">KV rows:</span>    ${s.kvCount} across [${s.stores.join(', ')}]
<span class="term-gray">Scores:</span>     ${s.scoreCount} games recorded
<span class="term-gray">Events:</span>     ${s.eventCount} logged`);
      }).catch(e => { _termAppend('<span class="term-red">Error: ' + _termEsc(e.message) + '</span>'); });
      return '<span class="term-gray">Querying lake...</span>';
    };

    T['lake-export'] = () => {
      if (!window._lake || !window._lake.isReady) return '<span class="term-gray">Data Lake not ready</span>';
      if (window._lake.mode === 'fallback') return '<span class="term-warn">Export not available in fallback mode</span>';
      window._lake.exportDB().then(buf => {
        if (!buf) { _termAppend('<span class="term-red">Export failed</span>'); return; }
        const blob = new Blob([buf], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const d = new Date().toISOString().slice(0, 10);
        a.href = url; a.download = 'amros-datalake-' + d + '.db';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        _termAppend('<span class="term-green">🗄️ Database exported! Open it in DB Browser for SQLite.</span>');
      }).catch(e => { _termAppend('<span class="term-red">Export error: ' + _termEsc(e.message) + '</span>'); });
      return '<span class="term-gray">Preparing export...</span>';
    };

    T['lake-sql'] = (args) => {
      if (!window._lake || !window._lake.isReady) return '<span class="term-gray">Data Lake not ready</span>';
      if (window._lake.mode === 'fallback') return '<span class="term-warn">SQL not available in fallback mode</span>';
      let sql = (args || '').trim();
      if ((sql.startsWith('"') && sql.endsWith('"')) || (sql.startsWith("'") && sql.endsWith("'"))) sql = sql.slice(1, -1);
      if (!sql) return '<span class="term-gray">Usage: lake-sql "SELECT * FROM kv LIMIT 10"</span>';
      window._lake.exec(sql).then(r => {
        if (!r.rows || !r.rows.length) { _termAppend('<span class="term-gray">(no rows)</span>'); return; }
        const cols = r.columns || Object.keys(r.rows[0]);
        let out = '<span class="term-cyan">' + _termEsc(cols.join(' | ')) + '</span>\n';
        out += '<span class="term-gray">' + cols.map(c => '─'.repeat(Math.max(c.length, 6))).join('─┼─') + '</span>\n';
        r.rows.slice(0, 50).forEach(row => {
          out += _termEsc(cols.map(c => { let v = row[c]; if (v === null || v === undefined) v = 'NULL'; v = String(v); return v.length > 40 ? v.slice(0, 37) + '...' : v; }).join(' | ')) + '\n';
        });
        if (r.rows.length > 50) out += '<span class="term-gray">...and ' + (r.rows.length - 50) + ' more rows</span>';
        _termAppend(out);
      }).catch(e => { _termAppend('<span class="term-red">SQL error: ' + _termEsc(e.message) + '</span>'); });
      return '<span class="term-gray">Executing query...</span>';
    };

    // ── Wire trophy trigger for terminal use ──────
  }


  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════
  function escHtml(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function timeAgo(ts) {
    const diff = Date.now() - ts, mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // ═══════════════════════════════════════════════════
  // CERT HAPTIC FEEDBACK
  // ═══════════════════════════════════════════════════
  function initCertHaptic() {
    var grid = document.getElementById('certGrid');
    if (grid) grid.addEventListener('touchstart', function(e) {
      if (e.target.closest('.cert-card') && window._haptic) window._haptic.cardPress();
    }, { passive: true });
    var strip = document.querySelector('.conf-strip');
    if (strip) strip.addEventListener('touchstart', function(e) {
      if (e.target.closest('.conf-badge[data-conf-imgs]') && window._haptic) window._haptic.cardPress();
    }, { passive: true });
  }

  // ═══════════════════════════════════════════════════
  // SHARED IMAGE VIEWER (Glassmorphism Lightbox + Zoom)
  // ═══════════════════════════════════════════════════
  var _imgViewer = null;
  function getImageViewer() {
    if (_imgViewer) return _imgViewer;

    var items = [];
    var currentIdx = 0;
    var zoom = 1;
    var ZOOM_MIN = 1, ZOOM_MAX = 4, ZOOM_STEP = 0.5;
    var _savedOverflow = '';
    var _savedOverflowX = '';

    var viewer = document.createElement('div');
    viewer.className = 'cert-viewer';
    viewer.innerHTML =
      '<div class="cert-viewer-inner">' +
        '<button class="cert-viewer-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
        '<div class="cert-viewer-img-wrap">' +
          '<img class="cert-viewer-img" alt="" draggable="false">' +
        '</div>' +
        '<div class="cert-viewer-toolbar">' +
          '<div class="cert-viewer-label"></div>' +
          '<span class="cert-viewer-counter"></span>' +
          '<button class="cv-btn cv-zoom-out" aria-label="Zoom out"><i class="fa-solid fa-minus"></i></button>' +
          '<span class="cert-viewer-zoom-info" role="button" tabindex="0" title="Click to reset zoom">100%</span>' +
          '<button class="cv-btn cv-zoom-in" aria-label="Zoom in"><i class="fa-solid fa-plus"></i></button>' +
          '<button class="cv-btn cv-fullscreen" aria-label="Full screen"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>' +
        '</div>' +
      '</div>' +
      '<button class="cert-viewer-nav cert-viewer-prev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>' +
      '<button class="cert-viewer-nav cert-viewer-next" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>';
    viewer.style.touchAction = 'none';
    document.body.appendChild(viewer);

    var wrap = viewer.querySelector('.cert-viewer-img-wrap');
    var img = viewer.querySelector('.cert-viewer-img');
    var label = viewer.querySelector('.cert-viewer-label');
    var zoomInfo = viewer.querySelector('.cert-viewer-zoom-info');
    var counter = viewer.querySelector('.cert-viewer-counter');
    var closeBtn = viewer.querySelector('.cert-viewer-close');
    var prevBtn = viewer.querySelector('.cert-viewer-prev');
    var nextBtn = viewer.querySelector('.cert-viewer-next');
    var zoomInBtn = viewer.querySelector('.cv-zoom-in');
    var zoomOutBtn = viewer.querySelector('.cv-zoom-out');
    var fullscreenBtn = viewer.querySelector('.cv-fullscreen');

    img.addEventListener('dragstart', function(e) { e.preventDefault(); });

    function setZoom(z, centerX, centerY) {
      var prevZoom = zoom;
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
      var isZoomed = zoom > 1;
      wrap.classList.toggle('zoomed', isZoomed);
      zoomInfo.textContent = Math.round(zoom * 100) + '%';
      zoomInfo.style.opacity = isZoomed ? '1' : '.6';
      if (!isZoomed) {
        img.style.transform = '';
        img.style.width = '';
        img.style.height = '';
        wrap.scrollTop = 0;
        wrap.scrollLeft = 0;
      } else {
        img.style.transform = 'none';
        var w = img.naturalWidth * zoom;
        var h = img.naturalHeight * zoom;
        img.style.width = w + 'px';
        img.style.height = h + 'px';
        requestAnimationFrame(function() {
          var sw = wrap.scrollWidth - wrap.clientWidth;
          var sh = wrap.scrollHeight - wrap.clientHeight;
          if (prevZoom <= 1) {
            var cx = typeof centerX === 'number' ? centerX : 0.5;
            var cy = typeof centerY === 'number' ? centerY : 0.5;
            wrap.scrollLeft = sw * cx;
            wrap.scrollTop = sh * cy;
          }
        });
      }
    }

    function resetZoom() { setZoom(1); }

    function showItem(idx) {
      resetZoom();
      currentIdx = idx;
      var item = items[idx];
      if (!item) return;
      img.src = item.src;
      img.alt = item.label || 'Image';
      var lbl = item.label || '';
      var isMobile = window.innerWidth <= 600;
      label.textContent = isMobile ? shortenLabel(lbl, 22) : lbl;
      label.title = lbl;
      counter.textContent = (idx + 1) + ' / ' + items.length;
      var single = items.length <= 1;
      prevBtn.style.display = single ? 'none' : '';
      nextBtn.style.display = single ? 'none' : '';
    }

    var _isFullscreen = false;

    function close() {
      if (_isFullscreen) exitFullscreen();
      viewer.classList.remove('show');
      document.body.style.overflow = _savedOverflow;
      document.body.style.overflowX = _savedOverflowX;
      resetZoom();
    }

    function enterFullscreen() {
      _isFullscreen = true;
      viewer.classList.add('cert-viewer-fs');
      document.body.style.overflow = 'hidden';
      if (fullscreenBtn) {
        var ic = fullscreenBtn.querySelector('i');
        if (ic) ic.className = 'fa-solid fa-down-left-and-up-right-to-center';
        fullscreenBtn.setAttribute('aria-label', 'Exit full screen');
      }
    }

    function exitFullscreen() {
      _isFullscreen = false;
      viewer.classList.remove('cert-viewer-fs');
      document.body.style.overflow = _savedOverflow;
      document.body.style.overflowX = _savedOverflowX;
      if (fullscreenBtn) {
        var ic = fullscreenBtn.querySelector('i');
        if (ic) ic.className = 'fa-solid fa-up-right-and-down-left-from-center';
        fullscreenBtn.setAttribute('aria-label', 'Full screen');
      }
    }

    function toggleFullscreen() {
      if (_isFullscreen) exitFullscreen();
      else enterFullscreen();
    }

    function shortenLabel(text, maxLen) {
      if (!text) return '';
      return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    }

    function navigate(dir) {
      showItem((currentIdx + dir + items.length) % items.length);
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function() { navigate(-1); });
    nextBtn.addEventListener('click', function() { navigate(1); });
    zoomInBtn.addEventListener('click', function() { setZoom(zoom + ZOOM_STEP); });
    zoomOutBtn.addEventListener('click', function() { setZoom(zoom - ZOOM_STEP); });
    zoomInfo.addEventListener('click', resetZoom);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    viewer.addEventListener('click', function(e) { if (e.target === viewer) close(); });

    // ── DESKTOP: mouse drag to pan when zoomed + single-click zoom ──
    var dragActive = false, dragStartX = 0, dragStartY = 0, scrollStartX = 0, scrollStartY = 0, dragDist = 0;
    var DRAG_THRESHOLD = 8;

    wrap.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragDist = 0;
      if (zoom > 1) {
        dragActive = true;
        scrollStartX = wrap.scrollLeft;
        scrollStartY = wrap.scrollTop;
        wrap.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', function(e) {
      if (!dragActive) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      dragDist = Math.sqrt(dx * dx + dy * dy);
      wrap.scrollLeft = scrollStartX - dx;
      wrap.scrollTop = scrollStartY - dy;
    });

    document.addEventListener('mouseup', function(e) {
      if (dragActive) {
        dragActive = false;
        wrap.style.cursor = '';
      }
    });

    // ── SINGLE CLICK to toggle zoom (desktop + mobile) ──
    wrap.addEventListener('click', function(e) {
      if (e.target !== img && e.target !== wrap) return;
      if (dragDist > DRAG_THRESHOLD) { dragDist = 0; return; }
      if (zoom > 1) {
        resetZoom();
      } else {
        var rect = wrap.getBoundingClientRect();
        var cx = (e.clientX - rect.left) / rect.width;
        var cy = (e.clientY - rect.top) / rect.height;
        setZoom(2.5, cx, cy);
      }
    });


    // ── DESKTOP: scroll wheel to zoom ──
    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var newZ = zoom + (e.deltaY > 0 ? -0.25 : 0.25);
      if (zoom <= 1 && newZ > 1) {
        var rect = wrap.getBoundingClientRect();
        var cx = (e.clientX - rect.left) / rect.width;
        var cy = (e.clientY - rect.top) / rect.height;
        setZoom(newZ, cx, cy);
      } else {
        setZoom(newZ);
      }
    }, { passive: false });

    // ── MOBILE: pinch to zoom ──
    var pinchDist0 = 0, pinchZoom0 = 1;
    wrap.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist0 = Math.sqrt(dx * dx + dy * dy);
        pinchZoom0 = zoom;
      }
    }, { passive: true });
    wrap.addEventListener('touchmove', function(e) {
      e.preventDefault();
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (pinchDist0 > 0) setZoom(pinchZoom0 * (dist / pinchDist0));
      }
    }, { passive: false });
    wrap.addEventListener('touchend', function() { pinchDist0 = 0; }, { passive: true });

    // ── MOBILE: swipe to navigate ──
    var swipeX0 = 0, swipeY0 = 0, touchDidScroll = false;
    wrap.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        swipeX0 = e.touches[0].clientX;
        swipeY0 = e.touches[0].clientY;
        touchDidScroll = false;
      }
    }, { passive: true });
    wrap.addEventListener('touchmove', function(e) {
      e.preventDefault();
      if (zoom > 1) touchDidScroll = true;
    }, { passive: false });
    wrap.addEventListener('touchend', function(e) {
      if (zoom > 1 || !swipeX0 || touchDidScroll) { swipeX0 = 0; return; }
      var dx = e.changedTouches[0].clientX - swipeX0;
      var dy = e.changedTouches[0].clientY - swipeY0;
      swipeX0 = 0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });

    // ── KEYBOARD ──
    document.addEventListener('keydown', function(e) {
      if (!viewer.classList.contains('show')) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom + ZOOM_STEP); }
      else if (e.key === '-') { e.preventDefault(); setZoom(zoom - ZOOM_STEP); }
      else if (e.key === '0') { e.preventDefault(); resetZoom(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
    });

    _imgViewer = {
      open: function(list, startIdx) {
        _savedOverflow = document.body.style.overflow;
        _savedOverflowX = document.body.style.overflowX;
        items = list;
        _isFullscreen = false;
        viewer.classList.remove('cert-viewer-fs');
        if (fullscreenBtn) {
          var ic = fullscreenBtn.querySelector('i');
          if (ic) ic.className = 'fa-solid fa-up-right-and-down-left-from-center';
        }
        showItem(startIdx || 0);
        viewer.classList.add('show');
        document.body.style.overflow = 'hidden';
      },
      close: close
    };
    return _imgViewer;
  }

  // ═══════════════════════════════════════════════════
  // CERT IMAGE VIEWER (uses shared lightbox)
  // ═══════════════════════════════════════════════════
  function initCertViewer() {
    var grid = document.getElementById('certGrid');
    if (!grid) return;
    var imgCards = Array.from(grid.querySelectorAll('.cert-card[data-cert-img]'));
    if (!imgCards.length) return;

    grid.addEventListener('click', function(e) {
      var card = e.target.closest('.cert-card[data-cert-img]');
      if (!card) return;
      e.preventDefault();
      var n = card.querySelector('.cert-name strong');
      var o = card.querySelector('.cert-org');
      getImageViewer().open([{ src: card.dataset.certImg, label: (n ? n.textContent : '') + (o ? ' — ' + o.textContent : '') }], 0);
    });
  }

  // ═══════════════════════════════════════════════════
  // CONFERENCE IMAGE VIEWER (uses shared lightbox)
  // ═══════════════════════════════════════════════════
  function initConfViewer() {
    var strip = document.querySelector('.conf-strip');
    if (!strip) return;
    var badges = Array.from(strip.querySelectorAll('.conf-badge[data-conf-imgs]'));
    if (!badges.length) return;

    strip.addEventListener('click', function(e) {
      var badge = e.target.closest('.conf-badge[data-conf-imgs]');
      if (!badge) return;
      var confName = badge.textContent.trim();
      var srcs = badge.dataset.confImgs.split('|');
      var list = srcs.map(function(src, i) {
        return { src: src.trim(), label: confName + (srcs.length > 1 ? ' (' + (i + 1) + '/' + srcs.length + ')' : '') };
      });
      getImageViewer().open(list, 0);
    });
  }

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initAlwaysCTA();
    initCommandPalette();
    initAdminDashboard();
    initInteractiveTimeline();
    initGuestbook();
    initVoiceNav();
    initTTSReader();
    wireAdvancedTerminal();
    initTrophySystem();
    initCertHaptic();
    initCertViewer();
    initConfViewer();
    console.log(
      '%c⚡ Phase 6.1 Loaded %c Palette+ · Trophies · Timeline · Guestbook · Voice+ · Terminal+',
      'background:#fbbf24;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#fbbf24;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }
  function boot() {
    if (window._coreReady) init();
    else window.addEventListener('AmrOS:CoreReady', init, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
