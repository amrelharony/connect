// ═══════════════════════════════════════════════════════════════
// PHASE 4: AI, INTERACTIVE 3D & AR — amrelharony.com
// Drop-in: <script src="phase4-ai-3d.js" defer></script>
//
// Features:
//   1. "Ask Amr" Terminal Chatbot
//   2. Context-Aware Hover Previews
//   3. 3D & AR Book Viewer (<model-viewer> with .glb/.usdz)
//   4. 3D Data Mesh Visualizer (Three.js)
// ═══════════════════════════════════════════════════════════════
(function PhaseFourAI3DAR() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase4-css';
  css.textContent = `

/* [SECTIONS 1 & 2 CSS REMAIN UNCHANGED - SNIPPED FOR BREVITY] */
/* ... Insert CSS for ASK AMR and HOVER PREVIEWS here ... */

/* ═══════════════════════════════════════════
   1. ASK AMR — TERMINAL CHAT MODE
   ═══════════════════════════════════════════ */

.term-chat-msg {
  margin: 6px 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  animation: termFadeIn .3s ease;
}
@keyframes termFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.term-chat-q {
  background: rgba(0,225,255,.06);
  border-left: 2px solid var(--accent, #00e1ff);
  color: #c9d1d9;
}
.term-chat-a {
  background: rgba(255,255,255,.03);
  border-left: 2px solid rgba(255,255,255,.08);
  color: #8b949e;
}
.term-chat-a strong { color: #e2e8f0; }
.term-chat-a .highlight { color: #00e1ff; }
.term-chat-typing {
  display: inline-flex;
  gap: 3px;
  padding: 4px 0;
}
.term-chat-typing span {
  width: 4px; height: 4px; border-radius: 50%; background: #00e1ff;
  animation: typeDot 1.2s ease-in-out infinite;
}
.term-chat-typing span:nth-child(2) { animation-delay: .2s; }
.term-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot {
  0%,100% { opacity: .2; } 50% { opacity: 1; }
}

.term-chat-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.term-chat-topic {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  padding: 2px 8px;
  border-radius: 100px;
  border: 1px solid rgba(0,225,255,.15);
  color: #00e1ff;
  cursor: pointer;
  transition: all .2s;
  -webkit-tap-highlight-color: transparent;
}
.term-chat-topic:hover {
  background: rgba(0,225,255,.08);
  border-color: #00e1ff;
}


/* ═══════════════════════════════════════════
   2. HOVER PREVIEWS
   ═══════════════════════════════════════════ */

.hover-preview {
  position: fixed;
  z-index: 9998;
  max-width: 280px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(13,20,32,.97);
  border: 1px solid #1a2332;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity .2s, transform .2s;
  font-size: 11px;
  line-height: 1.5;
  color: #8b949e;
}
.hover-preview.show {
  opacity: 1;
  transform: translateY(0);
}
.hover-preview-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.hover-preview-title.tech { color: #00e1ff; }
.hover-preview-title.biz { color: #22c55e; }
.hover-preview-body { color: #c9d1d9; }
.hover-preview-body strong { color: #e2e8f0; }

body.zen-mode .hover-preview { display: none !important; }
@media(max-width:768px) { .hover-preview { display: none !important; } }
@media print { .hover-preview { display: none !important; } }

/* ═══════════════════════════════════════════
   3 & 4. 3D VIEWER OVERLAY & AR STYLES
   ═══════════════════════════════════════════ */

#viewer3dOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0,0,0,.96);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition: opacity .4s, visibility .4s;
  pointer-events: none;
  backdrop-filter: blur(14px);
}
#viewer3dOverlay.show {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.viewer3d-container {
  width: 96%;
  max-width: 500px;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #1a2332;
  background: #060910;
  position: relative;
  transform: scale(.9);
  transition: transform .5s cubic-bezier(.16,1,.3,1);
}
#viewer3dOverlay.show .viewer3d-container { transform: scale(1); }
/* Ensure model-viewer fills container */
model-viewer { width: 100%; height: 100%; --poster-color: transparent; }

.viewer3d-hud {
  position: absolute;
  top: 10px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 10; /* Ensure HUD is above model-viewer */
}
.viewer3d-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(0,225,255,.6);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8); /* Added shadow for readability over 3D */
}
.viewer3d-close {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #4a5568;
  cursor: pointer;
  pointer-events: auto;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #1a2332;
  background: rgba(0,0,0,.8); /* Darker background */
  transition: all .2s;
}
.viewer3d-close:hover { color: #00e1ff; border-color: rgba(0,225,255,.2); }
.viewer3d-hint {
  position: absolute;
  bottom: 10px;
  left: 0; right: 0;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: #6f7b8f; /* Slightly lighter for better contrast */
  letter-spacing: 1px;
  pointer-events: none;
  z-index: 10;
}
.viewer3d-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  background: #060910;
  z-index: 20; /* Higher z-index */
  transition: opacity .5s;
}
.viewer3d-loading.hidden { opacity: 0; pointer-events: none; }
.viewer3d-loading-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #4a5568;
}
.viewer3d-loading-spinner {
  font-size: 28px;
  animation: v3dSpin 2s ease-in-out infinite;
}
@keyframes v3dSpin { 0% { transform: rotateY(0); } 100% { transform: rotateY(360deg); } }

/* AR Button Styling for model-viewer */
#ar-button {
  background-image: url(https://cdn.glitch.global/a92517b6-34df-4658-9b32-0469cb28037f/ar_icon_white.png?v=1660934672966);
  background-repeat: no-repeat;
  background-size: 20px 20px;
  background-position: 12px 50%;
  background-color: rgba(0, 225, 255, 0.9);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  bottom: 40px;
  padding: 0px 16px 0px 40px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #060910;
  height: 36px;
  line-height: 36px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 4px 12px rgba(0,225,255,0.3);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 15;
}
#ar-button:hover { background-color: #fff; color: #00e1ff; box-shadow: 0 4px 16px rgba(0,225,255,0.5); }
#ar-button:active { transform: translateX(-50%) scale(0.95); }
/* Hide AR button on devices that don't support AR */
model-viewer:not([ar-status="chosen"]) #ar-button { display: none; }


/* Node labels in data mesh */
.mesh-label {
  position: absolute;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: rgba(255,255,255,.7);
  letter-spacing: .5px;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,.8);
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

@media(max-width:600px) {
  .viewer3d-container { height: 450px; /* Taller on mobile for AR view */ max-height: 80vh; }
}
@media print { #viewer3dOverlay { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: "ASK AMR" TERMINAL CHATBOT
  // [THIS SECTION REMAINS UNCHANGED - SNIPPED FOR BREVITY]
  // ═══════════════════════════════════════════════════

  // Knowledge base — structured for keyword matching
  const KB = [
    {
      keys: ['who','about','introduction','intro','yourself','amr','background'],
      answer: `I'm <strong>Amr Elharony</strong> — a Delivery Lead and Scrum Master at <strong>Banque Misr's Data & Analytics Division</strong> in Cairo, Egypt. I have <strong>12+ years</strong> in banking & fintech, a <strong>Doctorate in Digital Transformation</strong>, and I'm the author of <span class="highlight">"The Bilingual Executive"</span>.`
    },
    {
      keys: ['role','job','work','banque','misr','position','current','do'],
      answer: `I lead delivery for the <strong>Data & Analytics Division at Banque Misr</strong>, Egypt's oldest bank. My role involves <strong>Scrum & Kanban facilitation</strong>, stakeholder management, backlog grooming, sprint execution, and championing a <strong>hybrid agile framework</strong> for data-driven projects.`
    },
    {
      keys: ['experience','years','career','history','journey'],
      answer: `<strong>12+ years</strong> spanning banking, fintech, and digital transformation. I started in operations, moved into project management, then specialized in <strong>agile delivery and data analytics</strong>. Key stops include roles in banking operations, IT project delivery, and now leading a data & analytics team.`
    },
    {
      keys: ['book','bilingual','executive','author','write','publish'],
      answer: `<span class="highlight">"The Bilingual Executive"</span> is my book about bridging <strong>business and technology leadership</strong>. It's available as a <strong>printed book, ebook, and AI-narrated audiobook</strong> (via ElevenLabs). It was launched at Greek Campus Cairo and is designed for professionals who want to speak both business and tech fluently.`
    },
    {
      keys: ['mentor','adplist','coaching','session','mentoring','advice','minutes'],
      answer: `I'm a <strong>Top Mentor on ADPList</strong> with <strong>2,400+ mentoring minutes</strong>. I offer free 1:1 sessions on agile, career pivots, fintech, and data careers. You can book at <strong>adplist.org/mentors/amr-elharony</strong>. I believe in paying forward — every session is free.`
    },
    {
      keys: ['certification','certif','pmp','safe','scrum','psm','credential','cert'],
      answer: `I hold <strong>20+ professional certifications</strong> including: <strong>PMP</strong> (PMI), <strong>SAFe 6 Scrum Master</strong>, <strong>PSM II & PSPO II</strong> (Scrum.org), <strong>PMI-ACP</strong>, <strong>ICAgile ATF</strong>, <strong>CDMP</strong> (Data Management), and certifications in Jira, Confluence, finance, and leadership. All verified on Credly.`
    },
    {
      keys: ['education','degree','doctorate','phd','dba','university','study'],
      answer: `I earned a <strong>Doctorate (DBA) in Digital Transformation</strong> from Helwan University, Egypt. My research focused on how organizations navigate digital change in the banking sector. I also hold earlier degrees in commerce & business.`
    },
    {
      keys: ['agile','scrum','kanban','safe','framework','methodology','sprint'],
      answer: `I practice <strong>hybrid Scrum/Kanban</strong> tailored for banking environments. I'm certified in <strong>SAFe 6, PSM II, PSPO II, PMI-ACP, and ICAgile</strong>. My approach focuses on sustainable delivery — not just speed, but <strong>delivering the right thing</strong> with clear stakeholder alignment and measurable outcomes.`
    },
    {
      keys: ['data','analytics','governance','mesh','pipeline','warehouse'],
      answer: `As lead of the <strong>Data & Analytics Division</strong>, I work with data pipelines, analytics platforms, data governance frameworks, and cross-domain data mesh concepts. I hold the <strong>CDMP certification</strong> and believe in treating data as a product — with clear ownership, quality standards, and business alignment.`
    },
    {
      keys: ['fintech','financial','technology','banking','digital','transformation'],
      answer: `FinTech is where my worlds converge. <strong>12+ years in banking</strong> plus deep tech knowledge lets me bridge legacy systems and modern innovation. I founded the <span class="highlight">Fintech Bilinguals</span> community in Cairo to connect professionals who speak both languages. My doctorate research focused specifically on <strong>digital transformation in banking</strong>.`
    },
    {
      keys: ['community','fintech bilinguals','group','network','lead'],
      answer: `I founded <span class="highlight">"Fintech Bilinguals"</span> — a professional community in Cairo bridging business and technology professionals in the fintech space. It's about creating a shared language so business leaders and tech teams can collaborate more effectively.`
    },
    {
      keys: ['speak','conference','talk','event','seamless','devopsdays','keynote','panel'],
      answer: `I've spoken at <strong>7+ conferences</strong> including <strong>Seamless North Africa</strong>, <strong>DevOpsDays Cairo</strong>, <strong>Africa FinTech Forum</strong>, <strong>Techne Summit</strong>, <strong>AI Everything MEA</strong>, and <strong>Egypt Career Summit</strong>. Topics range from agile in banking to digital transformation strategy to career development in fintech.`
    },
    {
      keys: ['skill','technical','tool','python','sql','jira','stack','tech'],
      answer: `My toolkit includes: <strong>Jira & Confluence</strong> (certified admin), <strong>Python</strong> for data analysis, <strong>SQL</strong> for data querying, plus deep expertise in <strong>agile frameworks, stakeholder management, data governance</strong>, and process optimization. I'm also building web projects (this site!) with HTML/CSS/JS.`
    },
    {
      keys: ['contact','email','phone','reach','connect','hire','linkedin'],
      answer: `Best ways to reach me: <strong>a.elharony@gmail.com</strong> · <strong>LinkedIn: /in/amrmelharony</strong> · <strong>ADPList</strong> for free mentoring sessions · or just shake your phone on this page to unlock my contact card!`
    },
    {
      keys: ['award','achievement','recognition','best','learner'],
      answer: `Notable achievements: <strong>Banque Misr "Best Learner Award"</strong> for continuous professional development, <strong>Top Mentor on ADPList</strong>, published author, <strong>20+ certifications</strong>, keynote speaker at 7+ conferences, and community leader of Fintech Bilinguals.`
    },
    {
      keys: ['website','portfolio','site','build','how','made','this'],
      answer: `This portfolio is a <strong>single-page web app</strong> built with vanilla HTML/CSS/JS — no frameworks. It features a gamification engine (VDna), 5 arcade mini-games, a terminal interface, 80+ testimonials, dynamic themes, ambient audio, and context-aware UTM routing. All hand-crafted to showcase both my professional story and technical skills.`
    },
    {
      keys: ['hobby','interest','personal','fun','outside','free time'],
      answer: `Outside work, I'm passionate about <strong>mentoring</strong> (2,400+ free minutes on ADPList), <strong>writing</strong> (working on more content beyond the book), building <strong>side projects</strong> like this portfolio and the Bilingual Executive Toolkit, and staying plugged into the <strong>fintech and agile communities</strong> in Cairo.`
    },
    {
      keys: ['audiobook','elevenlabs','ai narration','narrate','listen'],
      answer: `"The Bilingual Executive" is available as an <strong>AI-narrated audiobook</strong> created with <strong>ElevenLabs</strong>. It's part of my experiment in using AI tools to expand content accessibility. You can access it through the Bilingual Executive Toolkit at <strong>bilingualexecutive.amrelharony.com</strong>.`
    },
  ];

  // Suggested topics for quick-tap
  const TOPICS = ['career','certifications','mentoring','book','fintech','agile','data','conferences','contact'];

  function askAmr(query) {
    if (!query || !query.trim()) {
      return formatWelcome();
    }

    const q = query.toLowerCase().replace(/[?!.,]/g, '').trim();
    const words = q.split(/\s+/);

    // Score each KB entry
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of KB) {
      let score = 0;
      for (const word of words) {
        if (word.length < 3) continue;
        for (const key of entry.keys) {
          if (key.includes(word) || word.includes(key)) {
            score += key === word ? 3 : 2;
          }
        }
      }
      // Bonus for multi-word matches
      for (const key of entry.keys) {
        if (q.includes(key)) score += 4;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && bestScore >= 2) {
      return bestMatch.answer;
    }

    // Fallback
    return `I don't have a specific answer for that, but here's what you can ask me about: <strong>career, certifications, mentoring, book, fintech, agile, data analytics, conferences, contact info, education, skills, awards</strong>, or just say <span class="highlight">hi</span>!`;
  }

  function formatWelcome() {
    return `👋 Hey! I'm Amr's digital knowledge base. Ask me anything about his <strong>career, certifications, book, mentoring, fintech experience</strong>, or professional background.\n\nTry: <span class="highlight">"What certifications do you have?"</span> or <span class="highlight">"Tell me about your book"</span>`;
  }

  function initAskAmr() {
    if (!window.TermCmds) return;

    // Chat history for terminal
    let chatHistory = [];

    // > ask <question>
    window.TermCmds.ask = function(args) {
      const question = (args || '').trim();
      if (!question) return formatWelcome();

      const answer = askAmr(question);
      chatHistory.push({ q: question, a: answer });

      // Build response with topics
      let html = `<div class="term-chat-msg term-chat-q">❓ ${escHtml(question)}</div>`;
      html += `<div class="term-chat-msg term-chat-a">${answer}</div>`;
      html += `<div class="term-chat-topics">`;
      TOPICS.forEach(t => {
        html += `<span class="term-chat-topic" onclick="document.getElementById('termInput').value='ask ${t}';document.getElementById('termInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))">${t}</span>`;
      });
      html += `</div>`;
      return html;
    };

    // Aliases
    window.TermCmds.chat = window.TermCmds.ask;
    window.TermCmds.amr = function(args) { return window.TermCmds.ask(args || 'who are you'); };

    // > ask (no args) shows welcome
    const origHelp = window.TermCmds.help;
    window.TermCmds.help = function() {
      let base = typeof origHelp === 'function' ? origHelp() : '<span class="term-green">Available commands:</span>';
      base += `<br><span class="term-cmd">ask &lt;question&gt;</span> — Ask Amr anything`;
      base += `<br><span class="term-cmd">book3d</span> — 3D book viewer`;
      base += `<br><span class="term-cmd">datamesh</span> — Interactive data mesh visualizer`;
      return base;
    };
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: CONTEXT-AWARE HOVER PREVIEWS
  // [THIS SECTION REMAINS UNCHANGED - SNIPPED FOR BREVITY]
  // ═══════════════════════════════════════════════════

  function initHoverPreviews() {
    if (isMobile) return;

    // Track user behavior to determine tone
    let techClicks = 0, bizClicks = 0;

    // Monitor which sections user engages with
    document.addEventListener('click', e => {
      const el = e.target.closest('.cert-card, .lk, .tc-card, .nl, .conf-badge, .rt, .tl-item');
      if (!el) return;
      if (el.matches('.cert-card') || el.closest('#certGrid')) techClicks++;
      else if (el.matches('.tc-card') || el.closest('.tc-section')) bizClicks++;
      else if (el.matches('.nl')) techClicks++;
      else if (el.matches('.conf-badge')) bizClicks++;
      else if (el.matches('.rt')) {
        if (el.textContent.match(/PMP|SAFe|Scrum|PSM|Data|CDMP|Python/i)) techClicks++;
        else bizClicks++;
      }
    }, { passive: true });

    function getTone() {
      if (techClicks === 0 && bizClicks === 0) return 'balanced';
      return techClicks > bizClicks ? 'tech' : 'biz';
    }

    // Preview data for key elements
    const PREVIEWS = {
      // Links
      'bilingual': {
        tech: { title: 'TECH VIEW', body: 'Built with <strong>ElevenLabs AI narration</strong>, distributed via custom web toolkit. Full-stack authoring pipeline from manuscript to multi-format publishing.' },
        biz:  { title: 'BUSINESS VALUE', body: 'A leadership guide for professionals who want to <strong>bridge the gap</strong> between business strategy and technical execution. Essential for career growth in fintech.' },
      },
      'adplist': {
        tech: { title: 'TECH VIEW', body: '<strong>2,400+ minutes</strong> of 1:1 coaching. Covers agile frameworks, data architecture, career pivots into tech leadership, and certification roadmaps.' },
        biz:  { title: 'BUSINESS VALUE', body: 'Free professional mentoring for anyone looking to <strong>level up their career</strong>. Specializing in banking, fintech, and agile delivery leadership.' },
      },
      'fintech-bilinguals': {
        tech: { title: 'TECH VIEW', body: 'Cairo-based community connecting <strong>engineers and business analysts</strong> in fintech. Knowledge sharing on APIs, data pipelines, and modern banking architecture.' },
        biz:  { title: 'BUSINESS VALUE', body: 'Professional network <strong>bridging business and technology</strong> in Egypt\'s fintech ecosystem. Networking, events, and collaborative learning.' },
      },
      'linkedin': {
        tech: { title: 'TECH VIEW', body: 'Posts on <strong>agile practices, data mesh concepts, Python tips</strong>, and technical leadership in banking environments.' },
        biz:  { title: 'BUSINESS VALUE', body: 'Insights on <strong>career development, leadership, digital transformation</strong> strategy, and the future of fintech in MENA.' },
      },
    };

    // Cert card previews
    const CERT_PREVIEWS = {
      'PMP': {
        tech: { title: 'PROJECT MANAGEMENT PRO', body: 'Gold standard for project managers. Covers predictive, agile, and hybrid approaches. <strong>PMI Global</strong>.' },
        biz:  { title: 'PROJECT MANAGEMENT PRO', body: 'Globally recognized credential ensuring projects are <strong>delivered on time, on budget</strong>, with clear stakeholder value.' },
      },
      'SAFe': {
        tech: { title: 'SCALED AGILE', body: 'SAFe 6 Scrum Master — enterprise-scale agile with <strong>ART coordination, PI Planning</strong>, and cross-team synchronization.' },
        biz:  { title: 'SCALED AGILE', body: 'Framework for aligning <strong>entire organizations</strong> around agile delivery — from team sprints to portfolio strategy.' },
      },
      'PSM': {
        tech: { title: 'SCRUM MASTER', body: 'Scrum.org PSM II — advanced facilitation, empirical process control, <strong>servant leadership</strong> patterns.' },
        biz:  { title: 'SCRUM MASTER', body: 'Expert-level Scrum mastery for <strong>removing blockers, improving team velocity</strong>, and delivering customer value faster.' },
      },
    };

    // Create preview tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'hover-preview';
    tooltip.id = 'hoverPreview';
    document.body.appendChild(tooltip);

    let showTimeout = null, hideTimeout = null;

    function showPreview(el, data) {
      const tone = getTone();
      const preview = tone === 'tech' ? data.tech : data.biz;
      const titleClass = tone === 'tech' ? 'tech' : 'biz';

      tooltip.innerHTML = `<br>        <div class="hover-preview-title ${titleClass}">${preview.title}</div><br>        <div class="hover-preview-body">${preview.body}</div><br>      `;

      const rect = el.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - 140;
      let top = rect.bottom + 8;

      // Keep on screen
      if (left < 10) left = 10;
      if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
      if (top + 100 > window.innerHeight) top = rect.top - 80;

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.classList.add('show');
    }

    function hidePreview() {
      tooltip.classList.remove('show');
    }

    // Attach to link cards
    document.querySelectorAll('a.lk').forEach(lk => {
      const href = lk.href || '';
      let data = null;
      for (const [key, val] of Object.entries(PREVIEWS)) {
        if (href.includes(key)) { data = val; break; }
      }
      if (!data) return;

      lk.addEventListener('mouseenter', () => {
        if (hideTimeout) clearTimeout(hideTimeout);
        showTimeout = setTimeout(() => showPreview(lk, data), 400);
      });
      lk.addEventListener('mouseleave', () => {
        if (showTimeout) clearTimeout(showTimeout);
        hideTimeout = setTimeout(hidePreview, 200);
      });
    });

    // Attach to cert cards
    document.querySelectorAll('.cert-card').forEach(card => {
      const name = card.querySelector('.cert-name')?.textContent || '';
      let data = null;
      for (const [key, val] of Object.entries(CERT_PREVIEWS)) {
        if (name.includes(key)) { data = val; break; }
      }
      if (!data) return;

      card.addEventListener('mouseenter', () => {
        if (hideTimeout) clearTimeout(hideTimeout);
        showTimeout = setTimeout(() => showPreview(card, data), 400);
      });
      card.addEventListener('mouseleave', () => {
        if (showTimeout) clearTimeout(showTimeout);
        hideTimeout = setTimeout(hidePreview, 200);
      });
    });
  }


  // ═══════════════════════════════════════════════════
  // 3D OVERLAY CORE (SHARED)
  // ═══════════════════════════════════════════════════

  let threeLoaded = false;
  let threeLoadPromise = null;
  let modelViewerLoaded = false;
  let modelViewerLoadPromise = null;

  function create3DOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'viewer3dOverlay';
    // Clicking overlay background closes it
    overlay.addEventListener('click', e => { if (e.target === overlay) close3D(); });
    overlay.innerHTML = `
      <div class="viewer3d-container" id="v3dContainer">
        <div class="viewer3d-loading" id="v3dLoading">
          <div class="viewer3d-loading-spinner">📦</div>
          <div class="viewer3d-loading-text">Loading 3D engine...</div>
        </div>
        <div class="viewer3d-hud" id="v3dHud">
          <span class="viewer3d-title" id="v3dTitle">3D Viewer</span>
          <span class="viewer3d-close" onclick="window._close3D()">✕ Close · ESC</span>
        </div>
        </div>`;
    document.body.appendChild(overlay);
  }

  // engineType: 'three' or 'model-viewer'
  function open3D(title, builder, engineType = 'three') {
    const overlay = document.getElementById('viewer3dOverlay');
    const loading = document.getElementById('v3dLoading');
    const titleEl = document.getElementById('v3dTitle');
    const container = document.getElementById('v3dContainer');

    // Reset container content while keeping loader/hud
    Array.from(container.children).forEach(child => {
        if (!['v3dLoading', 'v3dHud'].includes(child.id)) child.remove();
    });

    if (titleEl) titleEl.textContent = title;
    if (loading) loading.classList.remove('hidden');
    overlay.classList.add('show');

    const loader = engineType === 'model-viewer' ? loadModelViewerJS() : loadThreeJS();

    loader.then(() => {
      if (loading) loading.classList.add('hidden');
      builder(container); // Pass container to builder
    }).catch(err => {
      console.error(`${engineType} load failed:`, err);
      if (loading) {
        loading.querySelector('.viewer3d-loading-text').textContent = 'Failed to load 3D engine';
        loading.querySelector('.viewer3d-loading-spinner').textContent = '⚠️';
      }
    });
  }

  function close3D() {
    const overlay = document.getElementById('viewer3dOverlay');
    overlay?.classList.remove('show');
    // Clean up contents
    const container = document.getElementById('v3dContainer');
    if (container) {
        // Remove canvas (Three.js) or model-viewer tag
        const canvas = container.querySelector('canvas');
        if (canvas) canvas.remove();
        const mv = container.querySelector('model-viewer');
        if (mv) mv.remove();
        container.querySelectorAll('.viewer3d-hint').forEach(el => el.remove());
    }
    // Clean up labels (Data Mesh)
    container?.querySelectorAll('.mesh-label').forEach(l => l.remove());
    // Cancel animation (Three.js)
    if (window._v3dCleanup) { window._v3dCleanup(); window._v3dCleanup = null; }
  }
  window._close3D = close3D;

  // Loader for Three.js (Data Mesh)
  function loadThreeJS() {
    if (threeLoaded && window.THREE) return Promise.resolve();
    if (threeLoadPromise) return threeLoadPromise;<br>
    threeLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Using r128 as in original script
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => { threeLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return threeLoadPromise;
  }

  // Loader for Google's <model-viewer> (Book & AR)
  function loadModelViewerJS() {
    if (modelViewerLoaded || customElements.get('model-viewer')) {
        modelViewerLoaded = true;
        return Promise.resolve();
    }
    if (modelViewerLoadPromise) return modelViewerLoadPromise;

    modelViewerLoadPromise = new Promise((resolve, reject) => {
      // Load polyfills first for better compatibility
      const polyfill = document.createElement('script');
      polyfill.src = 'https://unpkg.com/focus-visible@5.0.2/dist/focus-visible.js';
      document.head.appendChild(polyfill);

      const script = document.createElement('script');
      // Using a stable version of model-viewer
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => { modelViewerLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return modelViewerLoadPromise;
  }

// ═══════════════════════════════════════════════════
// FEATURE 3: 3D & AR BOOK VIEWER (REBUILT WITH MODEL-VIEWER)
// ═══════════════════════════════════════════════════

function launchBookViewer() {
  // CRITICAL: You must create 'book.glb' and 'book.usdz' files
  // and place them in the same root directory as this script.
  open3D('📘 The Bilingual Executive — 3D & AR', buildBookARScene, 'model-viewer');
}

function buildBookARScene(container) {
  // Inject the <model-viewer> component
  // This replaces the manual Three.js construction
  const mvHTML = `
    <model-viewer
      src="book.glb"
      ios-src="book.usdz"
      alt="A 3D model of The Bilingual Executive book"
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1"
      loading="eager"
      reveal="auto"
    >
      <button slot="ar-button" id="ar-button">
        View in your space
      </button>
    </model-viewer>
    <div class="viewer3d-hint" id="v3dHint">
      ${isMobile ? 'Pinch to zoom · Drag to rotate' : 'Scroll to zoom · Drag to rotate · Click to open site'}
    </div>
  `;

  // Create a temporary container to parse the string into DOM elements
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = mvHTML;
  while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild);
  }

  const mv = container.querySelector('model-viewer');

  // Add click-to-buy functionality
  mv.addEventListener('click', (e) => {
      // Ensure it's a quick click, not part of a drag interaction
      if (e.detail === 1) {
          window.open('https://bilingualexecutive.amrelharony.com/', '_blank');
      }
  });

  // Add hint text depending on interaction state
  const hint = container.querySelector('#v3dHint');
  mv.addEventListener('camera-change', (e) => {
      if (e.detail.source === 'user-interaction') {
         hint.style.opacity = '0.5';
      }
  });
}


  // ═══════════════════════════════════════════════════
  // FEATURE 4: 3D DATA MESH VISUALIZER (KEEPS USING THREE.JS)
  // ═══════════════════════════════════════════════════

  function launchDataMesh() {
    open3D('🔀 Data Mesh — Interactive Domains', buildMeshScene, 'three');
  }

  function buildMeshScene(container) {
    // Add hint text for this mode
    const hint = document.createElement('div');
    hint.className = 'viewer3d-hint';
    hint.id = 'v3dHint';
    hint.textContent = 'Drag to rotate · Scroll to zoom';
    container.appendChild(hint);

    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.insertBefore(renderer.domElement, hint); // Insert before hint

    // Domain nodes
    const DOMAINS = [
      { name: 'Customer',   color: 0x22c55e, x: -2.2, y: 1.5, z: 0, icon: '👥' },
      { name: 'Payments',   color: 0xa855f7, x: 2.2,  y: 1.5, z: 0, icon: '💳' },
      { name: 'Analytics',  color: 0x00e1ff, x: 0,    y: 2.8, z: 0, icon: '📊' },
      { name: 'Risk',       color: 0xf97316, x: -2.5, y: -1,  z: 0.5, icon: '⚠️' },
      { name: 'Lending',    color: 0x3b82f6, x: 2.5,  y: -1,  z: 0.5, icon: '🏦' },
      { name: 'Compliance', color: 0xef4444, x: -1,   y: -2.5,z: 0, icon: '📋' },
      { name: 'Treasury',   color: 0xfbbf24, x: 1,    y: -2.5,z: 0, icon: '💰' },
      { name: 'Digital',    color: 0x06b6d4, x: 0,    y: 0,   z: 0, icon: '🌐' }, // Hub
    ];

    const CONNECTIONS = [
      [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], // Digital hub → all
      [0, 2], [1, 2], [3, 5], [4, 6], [0, 3], [1, 4], [2, 5], [2, 6], // Cross-domain
    ];

    const group = new THREE.Group();
    const nodeMeshes = [];

    // Create nodes as glowing spheres
    DOMAINS.forEach((d, i) => {
      const isHub = i === 7;
      const radius = isHub ? 0.4 : 0.25;
      const geo = new THREE.SphereGeometry(radius, 24, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: d.color,
        emissive: d.color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.85,
        shininess: 80
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      mesh.userData = { index: i, name: d.name, baseY: d.y };
      group.add(mesh);
      nodeMeshes.push(mesh);

      // Glow ring
      const ringGeo = new THREE.RingGeometry(radius + 0.05, radius + 0.12, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(d.x, d.y, d.z);
      group.add(ring);

      // HTML label
      const label = document.createElement('div');
      label.className = 'mesh-label';
      label.textContent = `${d.icon} ${d.name}`;
      label.style.color = `#${d.color.toString(16).padStart(6, '0')}`;
      container.appendChild(label);
      mesh.userData.label = label;
    });

    // Connections as lines
    CONNECTIONS.forEach(([from, to]) => {
      const a = DOMAINS[from], b = DOMAINS[to];
      const points = [
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(b.x, b.y, b.z)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x1a2332,
        transparent: true,
        opacity: 0.4
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { from, to };
      group.add(line);
    });

    // Data packet particles flowing along connections
    const packets = [];
    for (let i = 0; i < 20; i++) {
      const conn = CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)];
      const pGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({
        color: DOMAINS[conn[0]].color,
        transparent: true,
        opacity: 0.7
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.userData = { from: conn[0], to: conn[1], t: Math.random(), speed: 0.002 + Math.random() * 0.004 };
      group.add(pMesh);
      packets.push(pMesh);
    }

    scene.add(group);

    // Lighting
    scene.add(new THREE.AmbientLight(0x222233, 0.6));
    const pointLight = new THREE.PointLight(0x00e1ff, 0.5, 20);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Mouse rotation
    let isDragging = false, prevX = 0, prevY = 0;
    let rotVelX = 0, rotVelY = 0.002;

    renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    renderer.domElement.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotVelY = (e.clientX - prevX) * 0.004;
      rotVelX = (e.clientY - prevY) * 0.002;
      prevX = e.clientX; prevY = e.clientY;
    });
    renderer.domElement.addEventListener('mouseup', () => isDragging = false);
    renderer.domElement.addEventListener('mouseleave', () => isDragging = false);

    renderer.domElement.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
    renderer.domElement.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotVelY = (e.touches[0].clientX - prevX) * 0.004;
      rotVelX = (e.touches[0].clientY - prevY) * 0.002;
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    }, { passive: true });
    renderer.domElement.addEventListener('touchend', () => isDragging = false, { passive: true });

    renderer.domElement.addEventListener('wheel', e => {
      camera.position.z = Math.max(4, Math.min(12, camera.position.z + e.deltaY * 0.008));
      e.preventDefault();
    }, { passive: false });

    // Update HTML labels to screen coords
    function updateLabels() {
      nodeMeshes.forEach(mesh => {
        const vec = mesh.position.clone();
        vec.applyMatrix4(group.matrixWorld);
        vec.project(camera);
        const x = (vec.x * 0.5 + 0.5) * W;
        const y = (-vec.y * 0.5 + 0.5) * H;
        const label = mesh.userData.label;
        if (label) {
          label.style.left = x + 'px';
          label.style.top = (y - 24) + 'px';
          label.style.opacity = vec.z < 1 ? '0.8' : '0';
        }
      });
    }

    // Animate
    let animId;
    const clock = new THREE.Clock();
    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!isDragging) {
        rotVelY *= 0.97;
        rotVelX *= 0.97;
        rotVelY += 0.0005;
      }
      group.rotation.y += rotVelY;
      group.rotation.x += rotVelX;
      group.rotation.x = Math.max(-0.8, Math.min(0.8, group.rotation.x));

      // Node breathing
      nodeMeshes.forEach((m, i) => {
        m.position.y = m.userData.baseY + Math.sin(t * 0.5 + i) * 0.08;
      });

      // Move data packets
      packets.forEach(p => {
        const d = p.userData;
        d.t += d.speed;
        if (d.t > 1) { d.t = 0; const newConn = CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)]; d.from = newConn[0]; d.to = newConn[1]; }
        const a = DOMAINS[d.from], b = DOMAINS[d.to];
        p.position.set(
          a.x + (b.x - a.x) * d.t,
          a.y + (b.y - a.y) * d.t + Math.sin(d.t * Math.PI) * 0.15,
          a.z + (b.z - a.z) * d.t
        );
      });

      updateLabels();
      renderer.render(scene, camera);
    }
    animate();

    window._v3dCleanup = () => {
      if (animId) cancelAnimationFrame(animId);
      renderer.dispose();
      // Remove labels
      container.querySelectorAll('.mesh-label').forEach(l => l.remove());
    };
  }


// ═══════════════════════════════════════════════════
  // WIRE UP: TERMINAL COMMANDS + TRIGGERS (FIXED)
  // ═══════════════════════════════════════════════════

  function wireUp() {
    // 1. Terminal commands
    if (window.TermCmds) {
      window.TermCmds.book3d = () => {
        setTimeout(launchBookViewer, 300);
        return '<span class="term-green">📘 Launching 3D & AR book viewer...</span>';
      };
      window.TermCmds.book = window.TermCmds.book3d;

      window.TermCmds.datamesh = () => {
        setTimeout(launchDataMesh, 300);
        return '<span class="term-green">🔀 Launching data mesh visualizer...</span>';
      };
      window.TermCmds.mesh = window.TermCmds.datamesh;

      // Update help
      const origHelp = window.TermCmds.help;
      window.TermCmds.help = function() {
        let base = typeof origHelp === 'function' ? origHelp() : '';
        if (!base.includes('book3d')) {
          base += `<br><span class="term-cmd">ask &lt;question&gt;</span> — Ask Amr anything`;
          base += `<br><span class="term-cmd">book3d</span> — 3D & AR book viewer`;
          base += `<br><span class="term-cmd">datamesh</span> — Interactive data mesh visualizer`;
        }
        return base;
      };
    }

    // 2. ROBUST BOOK CARD FINDER
    // We try multiple selectors to find your book link
    const selectors = [
      'a.lk[href*="bilingual"]', // Priority 1: Specific class + link
      'a[href*="bilingual"]',    // Priority 2: Any link with "bilingual"
      'a[href*="book"]'          // Priority 3: Any link with "book"
    ];

    let bookCard = null;
    for (const sel of selectors) {
      bookCard = document.querySelector(sel);
      if (bookCard) break; // Found it!
    }

    if (bookCard) {
      console.log('✅ Phase 4: Found Book Card:', bookCard);

      // Create the Badge
      const badge = document.createElement('span');
      badge.style.cssText = `
        font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;
        text-transform:uppercase;padding:4px 8px;border-radius:100px;
        background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);
        color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;
        display:inline-flex;align-items:center;gap:4px;white-space:nowrap;
        position: relative; z-index: 10;
      `;
      badge.innerHTML = '📦 3D + AR PREVIEW';
      
      // Hover effects
      badge.addEventListener('mouseenter', () => {
        badge.style.background = 'rgba(99,102,241,.2)';
        badge.style.borderColor = '#6366f1';
        badge.style.color = '#fff';
      });
      badge.addEventListener('mouseleave', () => {
        badge.style.background = 'rgba(99,102,241,.1)';
        badge.style.borderColor = 'rgba(99,102,241,.3)';
        badge.style.color = '#6366f1';
      });

      // Click event
      badge.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation(); // Stop the link from opening the URL
        launchBookViewer();
        if (window.VDna) window.VDna.addXp(5);
      });

      // Attach logic: Try subtitle first, otherwise append to card
      const subtitle = bookCard.querySelector('.lsu');
      if (subtitle) {
        // Add a line break if needed
        subtitle.style.display = 'flex';
        subtitle.style.flexDirection = 'column';
        subtitle.style.alignItems = 'flex-start';
        subtitle.appendChild(badge);
      } else {
        // Fallback: Just put it at the end of the card
        bookCard.style.display = 'flex';
        bookCard.style.flexDirection = 'column';
        bookCard.appendChild(badge);
      }
      
    } else {
      console.warn('⚠️ Phase 4: Could not find any link containing "bilingual" or "book". 3D Badge not added.');
    }

    // 3. Keyboard Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('viewer3dOverlay')?.classList.contains('show')) {
        close3D();
      }
    });

    // 4. Panel Shortcut
    const panel = document.querySelector('.shortcut-panel');
    if (panel) {
      const closeDiv = panel.querySelector('.sc-close');
      if (closeDiv && !panel.querySelector('[data-p4-key]')) {
        const row = document.createElement('div');
        row.className = 'sc-row';
        row.dataset.p4Key = '1';
        row.innerHTML = '<span class="sc-key">Terminal</span><span class="sc-desc">> ask / > book3d / > datamesh</span>';
        panel.insertBefore(row, closeDiv);
      }
    }
  }
