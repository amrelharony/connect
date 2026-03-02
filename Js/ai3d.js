// ai3d.js - Lazy-loaded AI chatbot + 3D viewer + FinTech visualizer (extracted from site.js)
// Dependencies: window.autoDismiss, window.cancelAutoDismiss, window.VDna

// ═══════════════════════════════════════════════════════════════
// PHASE 4: AI, INTERACTIVE 3D — amrelharony.com
// Drop-in: <script src="phase4-ai-3d.js" defer></script>
//
// Features:
//   1. "Ask Amr" Terminal Chatbot
//   2. 3D Book Viewer (<model-viewer>) - NO AR
//   3. 3D Data Mesh Visualizer (Three.js)
// ═══════════════════════════════════════════════════════════════
(function PhaseFourAI3D() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  function _h() { return window._haptic || {}; }
  const Haptic = {
    tap()        { const h = _h(); if (h.tap) h.tap(); },
    doubleTap()  { const h = _h(); if (h.tap) h.tap(); },
    hold()       { const h = _h(); if (h.expand) h.expand(); },
    success()    { const h = _h(); if (h.success) h.success(); },
    warning()    { const h = _h(); if (h.warning) h.warning(); },
    arEnter()    { const h = _h(); if (h.enter) h.enter(); },
    trade()      { const h = _h(); if (h.collect) h.collect(); },
    rotate()     { const h = _h(); if (h.rotate) h.rotate(); },
    zoom()       { const h = _h(); if (h.rotate) h.rotate(); },
    pulse()      { const h = _h(); if (h.heartbeat) h.heartbeat(); },
    sequence(p)  { const h = _h(); if (h.raw) h.raw(p); },
  };

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase4-css';
  css.textContent = `
/* ═══════════════════════════════════════════
   1. ASK AMR — TERMINAL CHAT MODE
   ═══════════════════════════════════════════ */
/* Terminal Chat — Glassmorphism */
.term-chat-msg {
  margin: 6px 0; padding: 8px 12px; border-radius: 10px;
  font-size: 11px; line-height: 1.6; animation: termFadeIn .3s ease;
}
@keyframes termFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.term-chat-q {
  background: rgba(0,225,255,.05); backdrop-filter: blur(8px);
  border-left: 2px solid rgba(0,225,255,.4); color: #c9d1d9;
}
.term-chat-a {
  background: rgba(255,255,255,.02); backdrop-filter: blur(8px);
  border-left: 2px solid rgba(255,255,255,.06); color: #8b949e;
}
.term-chat-a strong { color: #e2e8f0; }
.term-chat-a .highlight { color: #00e1ff; text-shadow: 0 0 8px rgba(0,225,255,.2); }
.term-chat-typing { display: inline-flex; gap: 3px; padding: 4px 0; }
.term-chat-typing span {
  width: 4px; height: 4px; border-radius: 50%; background: #00e1ff;
  box-shadow: 0 0 6px rgba(0,225,255,.4); animation: typeDot 1.2s ease-in-out infinite;
}
.term-chat-typing span:nth-child(2) { animation-delay: .2s; }
.term-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
.term-chat-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.term-chat-topic {
  font-family: 'JetBrains Mono', monospace; font-size: 8px; padding: 3px 10px;
  border-radius: 100px; border: 1px solid rgba(0,225,255,.12);
  background: rgba(0,225,255,.03); backdrop-filter: blur(6px);
  color: #00e1ff; cursor: pointer; transition: all .2s;
  -webkit-tap-highlight-color: transparent; text-shadow: 0 0 6px rgba(0,225,255,.15);
}
.term-chat-topic:hover { background: rgba(0,225,255,.1); border-color: rgba(0,225,255,.3); }
.term-chat-cursor {
  display: inline-block; width: 2px; height: 13px; background: #00e1ff;
  box-shadow: 0 0 8px rgba(0,225,255,.5); animation: termCursorBlink .8s step-end infinite;
  vertical-align: text-bottom; margin-left: 2px;
}
@keyframes termCursorBlink { 50% { opacity: 0; } }
.term-chat-confidence {
  display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase; padding: 2px 6px;
  border-radius: 4px; margin-bottom: 6px; backdrop-filter: blur(4px);
}
.term-chat-confidence.high { background: rgba(34,197,94,.1); color: #22c55e; border: 1px solid rgba(34,197,94,.15); text-shadow: 0 0 6px rgba(34,197,94,.2); }
.term-chat-confidence.good { background: rgba(0,225,255,.06); color: #00e1ff; border: 1px solid rgba(0,225,255,.1); text-shadow: 0 0 6px rgba(0,225,255,.2); }
.term-chat-followups { margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,.03); }
.term-chat-followup-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 1.5px; text-transform: uppercase; color: #4a5568; margin-bottom: 4px; }
.term-chat-a .term-chat-topics { margin-top: 8px; }
.term-chat-badge {
  display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px;
  border-radius: 4px; margin-bottom: 6px; margin-right: 4px; vertical-align: middle;
  backdrop-filter: blur(4px);
}
.term-chat-badge.ai { background: rgba(34,197,94,.1); color: #22c55e; border: 1px solid rgba(34,197,94,.15); text-shadow: 0 0 6px rgba(34,197,94,.2); }
.term-chat-badge.kb { background: rgba(139,148,158,.06); color: #8b949e; border: 1px solid rgba(139,148,158,.1); }
.term-chat-badge.loading { background: rgba(0,225,255,.06); color: #00e1ff; border: 1px solid rgba(0,225,255,.1); animation: llmPulse 1.5s ease-in-out infinite; }
@keyframes llmPulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

/* LLM download progress bar */
.llm-progress { position: relative; height: 22px; background: rgba(0,225,255,.04); border: 1px solid rgba(0,225,255,.1); border-radius: 6px; margin-bottom: 10px; overflow: hidden; font-family: 'JetBrains Mono', monospace; }
.llm-progress-bar { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, rgba(0,225,255,.15), rgba(99,102,241,.2)); border-radius: 6px; transition: width .3s; }
.llm-progress-label { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; height: 100%; font-size: 8px; letter-spacing: .5px; color: rgba(255,255,255,.6); padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ═══════════════════════════════════════════
   2. 3D VIEWER OVERLAY STYLES
   ═══════════════════════════════════════════ */
#viewer3dOverlay {
  position: fixed; inset: 0; z-index: 9999; background: transparent;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  opacity: 0; visibility: hidden; transition: opacity .4s, visibility .4s;
  pointer-events: none; backdrop-filter: blur(6px);
}
#viewer3dOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.viewer3d-container {
  width: 96%; max-width: 500px; height: 400px; border-radius: 16px;
  overflow: hidden; border: 1px solid rgba(0,225,255,.08); background: rgba(6,9,16,.75);
  backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 8px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.03);
  position: relative; transform: scale(.9); transition: transform .5s cubic-bezier(.16,1,.3,1);
}
#viewer3dOverlay.show .viewer3d-container { transform: scale(1); }
model-viewer { width: 100%; height: 100%; --poster-color: transparent; }

.viewer3d-hud {
  position: absolute; top: 0; left: 0; right: 0; display: flex;
  justify-content: space-between; align-items: center; pointer-events: none; z-index: 20;
  padding: 8px 12px; background: rgba(6,9,16,.6); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,225,255,.06);
}
.viewer3d-title {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.5px;
  text-transform: uppercase; color: rgba(0,225,255,.6); text-shadow: 0 0 10px rgba(0,225,255,.25);
}
.viewer3d-close {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #8b949e; cursor: pointer;
  pointer-events: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(0,225,255,.12);
  background: rgba(0,0,0,.4); backdrop-filter: blur(8px); transition: all .2s;
}
.viewer3d-close:hover { color: #00e1ff; border-color: rgba(0,225,255,.3); background: rgba(0,225,255,.08); }
.viewer3d-hint {
  position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;
  font-family: 'JetBrains Mono', monospace; font-size: 8px; color: rgba(111,123,143,.6);
  letter-spacing: 1px; pointer-events: none; z-index: 10;
}
.viewer3d-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 8px; background: rgba(6,9,16,.9); z-index: 20; transition: opacity .5s;
}
.viewer3d-loading.hidden { opacity: 0; pointer-events: none; }
.viewer3d-loading-text {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; color: rgba(139,148,158,.5);
}
.viewer3d-close-btn {
  font-size: 14px; line-height: 1; color: #8b949e; cursor: pointer;
  pointer-events: auto; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(0,225,255,.12);
  background: rgba(0,0,0,.4); backdrop-filter: blur(8px); transition: all .2s;
}
.viewer3d-close-btn:hover { color: #ef4444; border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.08); }
.viewer3d-loading-spinner { font-size: 28px; animation: v3dSpin 2s ease-in-out infinite; }
@keyframes v3dSpin { 0% { transform: rotateY(0); } 100% { transform: rotateY(360deg); } }

/* Node labels in data mesh */
.mesh-label {
  position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: rgba(255,255,255,.7); letter-spacing: .5px; pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,.8); white-space: nowrap; transform: translate(-50%, -50%);
}
.ar-btn {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; line-height: 1; padding: 0;
  border-radius: 50%; border: 1px solid rgba(0,225,255,.25);
  background: rgba(0,225,255,.08); color: #00e1ff; cursor: pointer;
  backdrop-filter: blur(8px); transition: all .25s; z-index: 15;
}
.ar-btn:hover { background: rgba(0,225,255,.2); border-color: #00e1ff; transform: translateY(-50%) scale(1.12); box-shadow: 0 0 12px rgba(0,225,255,.25); }

/* Live FinTech Visualizer HUD */
.ftv-hud {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  font-family: 'JetBrains Mono', monospace; padding: 12px 16px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.ftv-hud-top {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.ftv-price {
  font-size: 11px; letter-spacing: .5px; color: rgba(255,255,255,.7);
  text-shadow: 0 1px 6px rgba(0,0,0,.9);
}
.ftv-tps {
  font-size: 9px; color: rgba(255,255,255,.4); letter-spacing: 1px;
}
.ftv-ticker {
  display: flex; flex-wrap: wrap; gap: 6px 12px; justify-content: center;
  padding-bottom: 24px;
}
.ftv-trade {
  font-size: 8px; color: rgba(255,255,255,.55); letter-spacing: .3px;
  white-space: nowrap;
}
/* Globe Data Viz — Glassmorphism */
.globe-hud { position:absolute; top:34px; left:0; right:0; bottom:0; pointer-events:none; z-index:10; font-family:'JetBrains Mono',monospace; display:flex; flex-direction:column; justify-content:space-between; padding:8px 12px; }
.globe-stats-glass { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; padding-bottom:6px; }
.globe-stat-card { text-align:center; padding:7px 10px; border-radius:12px; background:rgba(10,22,40,.45); backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); border:1px solid rgba(0,225,255,.1); box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 2px 12px rgba(0,0,0,.3); transition:border-color .4s, box-shadow .4s; position:relative; overflow:hidden; min-width:62px; }
.globe-stat-card::before { content:''; position:absolute; inset:0; border-radius:12px; background:linear-gradient(135deg,rgba(0,225,255,.04) 0%,transparent 60%); pointer-events:none; }
.globe-stat-card.glow { border-color:rgba(0,225,255,.35); box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 0 18px rgba(0,225,255,.12); }
.globe-stat-val { font-size:15px; font-weight:700; color:#00e1ff; line-height:1; text-shadow:0 0 14px rgba(0,225,255,.45); font-variant-numeric:tabular-nums; }
.globe-stat-label { font-size:6.5px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.38); margin-top:3px; }
.globe-live-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:4px; vertical-align:middle; animation:globePulse 2s ease-in-out infinite; box-shadow:0 0 6px rgba(34,197,94,.5); }
@keyframes globePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(.7); } }
.globe-bottom-glass { background:rgba(10,22,40,.4); backdrop-filter:blur(12px) saturate(160%); -webkit-backdrop-filter:blur(12px) saturate(160%); border:1px solid rgba(0,225,255,.08); border-radius:10px; padding:6px 12px; margin-bottom:14px; }
.globe-legend { display:flex; gap:12px; justify-content:center; align-items:center; font-size:7px; letter-spacing:.5px; color:rgba(255,255,255,.35); }
.globe-legend-dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:3px; vertical-align:middle; }
.globe-toast { position:absolute; top:72px; left:50%; transform:translateX(-50%) translateY(-8px); font-family:'JetBrains Mono',monospace; font-size:7.5px; letter-spacing:.8px; color:#22c55e; background:rgba(10,22,40,.55); backdrop-filter:blur(12px); border:1px solid rgba(34,197,94,.2); border-radius:8px; padding:4px 10px; opacity:0; transition:opacity .4s, transform .4s; pointer-events:none; z-index:20; white-space:nowrap; }
.globe-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }

@media(max-width:600px) { .viewer3d-container { height: 450px; max-height: 80vh; } .ftv-hud { padding: 8px 10px; } .ftv-price { font-size: 9px; } }
@media print { #viewer3dOverlay { display: none !important; } }
`;
  document.head.appendChild(css);

  // ═══════════════════════════════════════════════════
  // FEATURE 1: "ASK AMR" TERMINAL CHATBOT
  // ═══════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════
  // KNOWLEDGE BASE (120+ entries)
  // ═══════════════════════════════════════════════════
  const KB = [
    // ── IDENTITY / BIO ──
    {keys:['who','about','introduction','intro','yourself','amr','background','bio'],cat:'identity',answer:`I'm <strong>Amr Elharony</strong> — a Delivery Lead and Scrum Master at <strong>Banque Misr's Data & Analytics Division</strong> in Cairo, Egypt. I have <strong>12+ years</strong> in banking & fintech, a <strong>Doctorate in Digital Transformation</strong>, and I'm the author of <span class="highlight">"The Bilingual Executive"</span>.`},
    {keys:['role','current','position','job','title','doing'],cat:'career',answer:`I currently serve as <strong>Delivery Lead & Scrum Master</strong> at <strong>Banque Misr's Data & Analytics Division</strong>, leading agile delivery of data products across one of Egypt's oldest and largest banks.`},
    {keys:['location','based','live','city','country','where'],cat:'contact',answer:`I'm based in <strong>Cairo, Egypt</strong>, working at the heart of the MENA fintech ecosystem. I mentor globally through ADPList and speak at conferences across Africa and the Middle East.`},
    {keys:['tagline','motto','philosophy','believe','mission','vision'],cat:'identity',answer:`My philosophy: <strong>"Bridge the gap between business and technology."</strong> The most impactful leaders are those who can speak both languages — strategy and engineering — fluently.`},
    {keys:['summary','overview','everything','tell me','pitch','elevator'],cat:'identity',answer:`<strong>Amr Elharony</strong>: 12+ year banking & fintech professional, PSM II & SAFe 6 Agilist, Doctorate in Digital Transformation, author of "The Bilingual Executive", Top ADPList Mentor with 2,400+ minutes, speaker at 9+ international stages. Currently leading data delivery at Banque Misr.`},
    // ── CAREER TIMELINE ──
    {keys:['career','journey','path','timeline','history','experience','professional'],cat:'career',answer:`My career spans <strong>12+ years</strong>: IT Officer in the Egyptian Armed Forces, banking roles at leading institutions, PMP, MBA, and a <strong>Doctorate in Digital Transformation</strong>. Today I lead data delivery at <strong>Banque Misr</strong> and author books on bilingual leadership.`},
    {keys:['military','army','armed forces','national service','2014'],cat:'career',answer:`I served as an <strong>IT Officer in the Egyptian Armed Forces</strong>, building discipline, leadership under pressure, and systems thinking — foundational skills I carry into every role.`},
    {keys:['early career','first job','start','began','beginning'],cat:'career',answer:`I started in <strong>IT operations within banking</strong>, quickly realizing that the intersection of technology and business strategy was where I could create the most impact. That insight shaped my entire career.`},
    {keys:['banque misr','bank misr','current company','employer'],cat:'org',answer:`<strong>Banque Misr</strong> is one of Egypt's oldest and largest state-owned banks (est. 1920). I work in its <strong>Data & Analytics Division</strong>, leading agile delivery of data products serving millions of customers.`},
    {keys:['data division','data analytics','data team','data products'],cat:'career',answer:`In Banque Misr's <strong>Data & Analytics Division</strong>, I lead agile delivery of dashboards, ML pipelines, and analytics platforms that drive strategic decisions across the bank.`},
    {keys:['scrum master','sm','scrum role','facilitate'],cat:'career',answer:`As a <strong>PSM II certified Scrum Master</strong>, I facilitate sprint ceremonies, remove impediments, and coach cross-functional teams toward continuous improvement across multiple banking teams.`},
    {keys:['delivery lead','lead','leadership','manage','manager'],cat:'career',answer:`As <strong>Delivery Lead</strong>, I'm accountable for end-to-end delivery of data products — from backlog refinement to production deployment, aligning technical execution with business outcomes.`},
    {keys:['author','writer','writing career','thought leader','published'],cat:'book',answer:`I authored <span class="highlight">"The Bilingual Executive"</span>, a book on bridging business and technology leadership — a natural extension of my belief that the best leaders speak both languages fluently.`},
    {keys:['speaker','speaking','public speaking','keynote','stage','talk'],cat:'conf',answer:`I've spoken on <strong>9+ international stages</strong> including Seamless North Africa, Africa FinTech Forum, DevOpsDays Cairo, and Techne Summit — covering fintech, agile leadership, and digital transformation.`},
    {keys:['milestone','achievement','accomplishment','proud'],cat:'career',answer:`Key milestones: <strong>12+ years</strong> in banking, <strong>20+ certifications</strong>, a <strong>Doctorate</strong>, a published book, <strong>2,400+ mentoring minutes</strong>, and speaking at <strong>9+ stages</strong>.`},
    {keys:['transition','pivot','change','shift','move','moved'],cat:'career',answer:`My career pivots: <strong>Military → Banking IT → Project Management → Agile/Scrum → Data & Analytics → Thought Leadership</strong>. Each transition was intentional, building on the previous foundation.`},
    {keys:['2020','covid','pandemic','remote','work from home'],cat:'career',answer:`During COVID-19, I helped lead the <strong>remote work transition</strong> for banking teams — proving that even traditionally in-office financial institutions could maintain velocity with the right agile practices.`},
    {keys:['2022','book launch','recent year'],cat:'career',answer:`2022 was a landmark year: I launched <span class="highlight">"The Bilingual Executive"</span>, expanded conference speaking internationally, and deepened my impact as a Top ADPList mentor.`},
    {keys:['2023','2024','2025','latest','recent work','now'],cat:'career',answer:`Recently I've been <strong>scaling data delivery at Banque Misr</strong>, earning advanced certifications (SAFe 6, PSM II), and growing the Fintech Bilinguals community while mentoring globally and speaking at major events.`},
    {keys:['future','plan','next','goal','aspiration','dream'],cat:'career',answer:`Focus areas ahead: <strong>scaling agile data delivery</strong> in banking, expanding writing and speaking impact, growing the Fintech Bilinguals community, and contributing to Egypt's fintech ecosystem.`},
    // ── CERTIFICATIONS ──
    {keys:['certifications','certified','certs','credentials','badges','qualifications'],cat:'cert',answer:`I hold <strong>20+ professional certifications</strong> including PMP, SAFe 6 Agilist, PSM II, PSPO II, PMI-ACP, PSK I, ICAgile ATF, CDMP, CEDF, DataCamp, Jira, and more — spanning project management, agile, data, and fintech.`},
    {keys:['pmp','project management professional','pmi'],cat:'cert',answer:`My <strong>PMP (Project Management Professional)</strong> from PMI validates expertise in predictive, agile, and hybrid project management. It was a foundational credential that shaped my delivery mindset.`},
    {keys:['safe','scaled agile','safe 6','safe agilist','sa'],cat:'cert',answer:`I'm a <strong>SAFe 6 Certified Agilist</strong>, enabling me to lead Lean-Agile transformation at enterprise scale — essential for aligning multiple agile teams in large banking environments.`},
    {keys:['psm','psm ii','psm2','professional scrum master'],cat:'cert',answer:`<strong>PSM II</strong> from Scrum.org demonstrates advanced mastery of Scrum — coaching stances, facilitation techniques, and organizational design for agility.`},
    {keys:['pspo','pspo ii','pspo2','product owner','professional scrum product owner'],cat:'cert',answer:`<strong>PSPO II</strong> validates my ability to maximize product value, manage complex stakeholder landscapes, and make data-driven product decisions.`},
    {keys:['pmi-acp','acp','agile certified practitioner'],cat:'cert',answer:`The <strong>PMI-ACP</strong> recognizes competence across agile methodologies — Scrum, Kanban, Lean, XP, and hybrid approaches, complementing my PMP with deep agile expertise.`},
    {keys:['psk','psk i','professional scrum kanban','kanban cert'],cat:'cert',answer:`<strong>PSK I</strong> certifies my ability to apply Kanban within Scrum — optimizing flow, limiting WIP, and using data to drive process improvement.`},
    {keys:['icagile','atf','agile team facilitation','facilitation cert'],cat:'cert',answer:`<strong>ICAgile ATF</strong> certifies expertise in facilitating collaborative team sessions, conflict resolution, and creating psychologically safe environments for agile teams.`},
    {keys:['cdmp','data management','dama','data professional'],cat:'cert',answer:`<strong>CDMP</strong> from DAMA validates competence in data governance, data quality, metadata management, and data architecture — critical for data analytics delivery.`},
    {keys:['cedf','frankfurt','frankfurt school','fintech cert','executive digital finance'],cat:'cert',answer:`<strong>CEDF</strong> from Frankfurt School of Finance & Management covers digital banking, blockchain, mobile money, and financial inclusion in emerging markets.`},
    {keys:['datacamp','data science','data cert','analytics cert'],cat:'cert',answer:`I've completed multiple <strong>DataCamp certifications</strong> in data science, Python, and SQL — building technical foundations that complement my delivery leadership in data teams.`},
    {keys:['jira','atlassian','jira cert'],cat:'cert',answer:`My <strong>Jira certification from Atlassian</strong> validates expertise in configuring boards, workflows, reporting, and automation for Scrum and Kanban setups.`},
    {keys:['scrum scale','scrum at scale','s@s'],cat:'cert',answer:`<strong>Scrum@Scale</strong> enables me to coordinate multiple Scrum teams, establish Scrum of Scrums, and scale agile practices across entire business units.`},
    {keys:['agile certs','agile certifications','agile credentials'],cat:'cert',answer:`Agile certifications: <strong>PSM II, PSPO II, PMI-ACP, PSK I, SAFe 6 Agilist, ICAgile ATF, Scrum@Scale</strong> — covering Scrum mastery, product ownership, Kanban, facilitation, and enterprise agility.`},
    {keys:['pmi certs','pmi certifications'],cat:'cert',answer:`From PMI: <strong>PMP and PMI-ACP</strong>, covering both traditional project management excellence and agile practitioner competence.`},
    {keys:['data certs','data certifications'],cat:'cert',answer:`Data-related certs: <strong>CDMP (DAMA), DataCamp certifications</strong> in data science and analytics, plus CEDF from Frankfurt School covering digital finance and data-driven banking.`},
    {keys:['latest cert','newest cert','recent cert','newest certification'],cat:'cert',answer:`Most recent: <strong>SAFe 6 Agilist and PSM II</strong>, reflecting commitment to the cutting edge of agile practice and enterprise transformation.`},
    {keys:['cert strategy','why certify','certification value','why certifications'],cat:'cert',answer:`I pursue certifications strategically: each fills a gap between where I am and where I want to impact. <strong>Certs validate expertise, open doors, and signal commitment</strong> to continuous growth.`},
    // ── BOOK ──
    {keys:['book','bilingual executive','bilingual','publication'],cat:'book',answer:`<span class="highlight">"The Bilingual Executive"</span> is my book about bridging <strong>business and technology leadership</strong>. It argues that the most effective digital-age leaders must speak both strategy and engineering fluently.`},
    {keys:['book theme','book about','book topic','book content','book idea'],cat:'book',answer:`The book explores how leaders can become <strong>"bilingual"</strong> — fluent in both business strategy and technology execution, covering digital transformation, agile leadership, and data-driven decision making.`},
    {keys:['book available','buy book','purchase','where to buy','book format','get book','order'],cat:'book',answer:`"The Bilingual Executive" is available as a <strong>printed book, ebook, and AI-narrated audiobook</strong> at <span class="highlight">bilingualexecutive.amrelharony.com</span>.`},
    {keys:['book launch','book event','launch event','book release'],cat:'book',answer:`The book launch brought together <strong>tech leaders, banking professionals, and agile practitioners</strong> — marking the culmination of years of insights from bridging business and technology in Egypt's banking sector.`},
    {keys:['book audience','who should read','target reader','reader'],cat:'book',answer:`Written for <strong>mid-to-senior professionals</strong> bridging business and tech — product managers, tech leads, delivery managers, and anyone navigating digital transformation.`},
    {keys:['book takeaway','key lesson','book lesson','book insight','main point'],cat:'book',answer:`Key takeaways: <strong>1)</strong> Leaders must be bilingual across business & tech. <strong>2)</strong> Agile is a mindset, not just methodology. <strong>3)</strong> Data literacy is a leadership skill. <strong>4)</strong> DT starts with people.`},
    {keys:['writing process','how write','book journey','book creation','wrote','how long'],cat:'book',answer:`Writing required disciplined effort alongside a full-time career, drawing from <strong>12+ years of real-world experience</strong> in banking, agile, and digital transformation — turning lessons into actionable frameworks.`},
    {keys:['audiobook','audio','narrated','listen','audio version'],cat:'book',answer:`The audiobook is <strong>AI-narrated</strong>, accessible for busy professionals who prefer listening during commutes or workouts. Available alongside print and ebook editions. Try typing <span class="highlight">"read book"</span> to hear a TTS preview with a live audio visualizer!`},
    {keys:['read book','tts','text to speech','read aloud','read excerpt'],cat:'book',answer:`Type <span class="highlight">read book</span> in the terminal to launch the TTS audiobook preview. It reads an excerpt of "The Bilingual Executive" using your browser's best voice, with a live frequency visualizer.`},
    {keys:['ambient light','ambient','light sensor','auto theme','room brightness','lux'],cat:'skill',answer:`This site uses the <strong>Ambient Light Sensor API</strong> to auto-switch between Light, Dark, and Cyberpunk modes based on your room's brightness. Type <span class="highlight">ambient</span> to toggle it.`},
    {keys:['spatial','gesture','hand tracking','eye tracking','webcam','spatial nav','computer vision','mediapipe'],cat:'skill',answer:`Type <span class="highlight">spatial</span> to enable Spatial Navigation — uses your webcam with <strong>MediaPipe</strong> for eye-gaze scrolling and hand-gesture game control. Swipe in the air to play arcade games, look up/down to scroll the page.`},
    {keys:['mesh','p2p','webrtc','peer to peer','data mesh','decentralized','crdt','yjs','swarm'],cat:'skill',answer:`This site uses a <strong>WebRTC P2P Data Mesh</strong> — visitors connect directly to each other in a decentralized swarm. Supabase is used only for signaling (SDP/ICE exchange). Arcade leaderboards and terminal chat sync via <strong>Yjs CRDTs</strong> over DataChannels. Type <span class="highlight">mesh-stats</span> to see the live topology.`},
    {keys:['background','particle','mesh','canvas','animation'],cat:'skill',answer:`The site background uses a <strong>CSS particle mesh</strong> — lightweight animated dots that respond to the current weather mood via CSS custom properties. The mesh tint shifts based on emotion (warm amber for sunny, cool blue for rain, etc.) and adapts to light/dark mode.`},
    {keys:['llm','local ai','webgpu','sentient','language model','smollm','webllm','gpu inference','edge ai','on device'],cat:'skill',answer:`The terminal runs a <strong>local Large Language Model</strong> (SmolLM2-1.7B) directly on your GPU via <strong>WebGPU</strong> and the WebLLM engine. No API keys, no servers — the AI runs 100% in your browser at 40+ tok/s. Type <span class="highlight">llm</span> to see inference stats.`},
    {keys:['prefetch','predictive','webnn','npu','prefetching','predict','ml','machine learning','hardware ml','markov'],cat:'skill',answer:`The site uses <strong>WebNN-accelerated predictive prefetching</strong> — a Markov transition model (with an optional 2-layer MLP running on your device's NPU/tensor cores via WebNN) predicts your next click based on scroll velocity, cursor trajectory, and behavioral history. Assets load 300ms before you click them. Type <span class="highlight">prefetch-stats</span> to see prediction accuracy.`},
    {keys:['opfs','data lake','datalake','sqlite','storage','database','origin private file system','portable','export','lake'],cat:'skill',answer:`Instead of <code>localStorage</code>, your session data lives in an <strong>OPFS Data Lake</strong> — a real <strong>SQLite database</strong> running via WebAssembly inside a Web Worker. It uses the <strong>Origin Private File System</strong> for async, low-level disk I/O. All XP, scores, preferences, and analytics are stored in structured SQL tables with write coalescing. Type <span class="highlight">lake-stats</span> to inspect the database, or <span class="highlight">lake-export</span> to download a portable <code>.db</code> file you can open in any SQLite viewer.`},
    // ── CONFERENCES ──
    {keys:['conference','conferences','speaking','events','stages','spoke'],cat:'conf',answer:`I've spoken at <strong>9+ international conferences</strong>: Seamless North Africa, Africa FinTech Forum, DevOpsDays Cairo, Techne Summit, Banking & Fintech Summit, Egypt Career Summit, and TechUp Women.`},
    {keys:['seamless','seamless north africa'],cat:'conf',answer:`At <strong>Seamless North Africa</strong>, I spoke on fintech innovation and agile delivery — how Egyptian banks can accelerate digital product delivery using Scrum and data-driven practices.`},
    {keys:['africa fintech','fintech forum','africa fintech forum'],cat:'conf',answer:`At the <strong>Africa FinTech Forum</strong>, I discussed digital transformation in African banking, data analytics for financial inclusion, and how agile accelerates fintech innovation.`},
    {keys:['devopsdays','devops','devopsdays cairo'],cat:'conf',answer:`At <strong>DevOpsDays Cairo</strong>, I presented on bridging agile delivery with DevOps culture — showing how banking Scrum teams can adopt CI/CD and data pipeline automation.`},
    {keys:['techne','techne summit'],cat:'conf',answer:`At <strong>Techne Summit</strong>, I shared insights on bilingual leadership in tech organizations and the role of agile coaching in scaling startups and fintech ventures.`},
    {keys:['banking fintech summit','banking summit','fintech summit'],cat:'conf',answer:`At the <strong>Banking & Fintech Summit</strong>, I spoke about traditional banking and fintech convergence — how agile frameworks help legacy institutions innovate without sacrificing stability.`},
    {keys:['egypt career','career summit','career advice'],cat:'conf',answer:`At the <strong>Egypt Career Summit</strong>, I shared career strategies for MENA professionals — continuous learning, certifications, and building a personal brand.`},
    {keys:['techup','techup women','women in tech','diversity'],cat:'conf',answer:`At <strong>TechUp Women</strong>, I advocated for gender diversity in fintech and tech leadership, sharing strategies for inclusive team building and mentoring women in tech.`},
    // ── SKILLS / EXPERTISE ──
    {keys:['skills','expertise','competencies','strengths','good at','specialize'],cat:'skill',answer:`Core competencies: <strong>Agile/Scrum, FinTech, Data Analytics, Digital Transformation, Project Management, Stakeholder Management, Change Management, Coaching, Product Ownership, SAFe, Kanban</strong>.`},
    {keys:['fintech','financial technology','fin tech','digital finance'],cat:'skill',answer:`<strong>12+ years in banking & fintech</strong> — digital banking, payment systems, data-driven financial products, and regulatory technology at the intersection of financial services and technology.`},
    {keys:['agile','scrum','methodology','framework','agile methodology'],cat:'skill',answer:`Deeply experienced in <strong>Agile and Scrum</strong> with PSM II, PSPO II, PMI-ACP, and SAFe 6 certifications. I've led agile transformations in banking, coached teams, and facilitated at scale.`},
    {keys:['data','analytics','data analysis','data science','bi','business intelligence'],cat:'skill',answer:`I lead delivery of <strong>data analytics products</strong> — dashboards, ML models, data pipelines, and BI platforms, holding CDMP and DataCamp certifications in data management.`},
    {keys:['digital transformation','dt','digitalization','modernization'],cat:'skill',answer:`My <strong>Doctorate is in Digital Transformation</strong>. I specialize in helping traditional banking institutions embrace digital tools, agile practices, and data-driven decision-making.`},
    {keys:['banking','bank','financial services','financial sector','finance industry'],cat:'skill',answer:`<strong>12+ years in banking</strong> — core banking systems, regulatory compliance, credit operations, branch transformation, and digitizing legacy financial institutions.`},
    {keys:['project management','pm','manage projects','project delivery'],cat:'skill',answer:`PMP-certified with experience in <strong>predictive, agile, and hybrid project management</strong>. I've delivered complex banking projects spanning technology, operations, and organizational change.`},
    {keys:['stakeholder','stakeholder management','communication','influence'],cat:'skill',answer:`I excel at <strong>stakeholder management</strong> — aligning executive sponsors, product owners, technical teams, and regulatory bodies across all organizational levels.`},
    {keys:['change management','change','organizational change','adoption'],cat:'skill',answer:`I specialize in <strong>change management</strong> for agile transformations — helping organizations navigate resistance and build buy-in in traditionally rigid banking environments.`},
    {keys:['coaching','coach','teach','guide','develop people','mentor skill'],cat:'skill',answer:`I coach teams and individuals in <strong>agile practices, career development, and leadership growth</strong> using Socratic questioning, active listening, and practical frameworks.`},
    {keys:['product ownership','product','po','product management','product strategy'],cat:'skill',answer:`With <strong>PSPO II</strong>, I bring advanced product ownership — value maximization, backlog strategy, stakeholder alignment, and evidence-based product management in banking.`},
    {keys:['kanban','flow','wip','work in progress','lean'],cat:'skill',answer:`<strong>PSK I certified</strong> — I apply Kanban within Scrum to optimize flow, reduce cycle times, and limit WIP. Lean-Kanban practices are essential for continuous delivery in data teams.`},
    {keys:['safe framework','enterprise agile','scaled','scaling agile'],cat:'skill',answer:`As a <strong>SAFe 6 Agilist</strong>, I drive enterprise-level agile — PI Planning, Agile Release Trains, and Lean Portfolio Management to coordinate multiple teams in large banking organizations.`},
    {keys:['remote','hybrid','distributed','virtual','work remotely'],cat:'skill',answer:`Extensive experience leading <strong>remote and hybrid teams</strong>, having successfully transitioned banking teams to distributed work during COVID-19 while maintaining velocity.`},
    {keys:['mena','middle east','africa','region','emerging market','arab'],cat:'skill',answer:`Deep understanding of the <strong>MENA fintech ecosystem</strong> — regulatory landscapes, cultural dynamics, Arabic-English bilingual environments, and opportunities in Egypt, North Africa, and the Gulf.`},
    {keys:['ai','artificial intelligence','machine learning','ml','ai basics','genai','gpt'],cat:'skill',answer:`I work alongside <strong>AI/ML teams in data delivery</strong>, understanding ML pipelines, model deployment, and integrating AI products into banking workflows. I leverage GenAI for productivity.`},
    // ── MENTORING ──
    {keys:['mentor','mentoring','adplist','mentorship','coach people'],cat:'mentor',answer:`I'm a <strong>Top Mentor on ADPList</strong> with <strong>2,400+ mentoring minutes</strong>, helping professionals worldwide with career transitions, agile practices, fintech careers, and leadership development.`},
    {keys:['mentoring approach','mentoring style','how mentor','method'],cat:'mentor',answer:`My approach is <strong>practical and personalized</strong>: listen first, understand context, then share frameworks and real-world examples. Actionable next steps over generic advice, drawing from 12+ years of experience.`},
    {keys:['mentoring topics','what mentor','mentor about','help with','mentor help'],cat:'mentor',answer:`I mentor on: <strong>career transitions, agile/Scrum adoption, fintech careers, certification strategy, leadership, job search, interview prep, personal branding</strong>, and navigating the MENA tech market.`},
    {keys:['mentee','mentees','who mentor','demographics','students'],cat:'mentor',answer:`Mentees span <strong>20+ countries</strong> — early-career professionals, mid-level managers transitioning to agile, fintech enthusiasts, MBA students, and career changers entering tech.`},
    {keys:['session','session format','mentoring session','how sessions','booking'],cat:'mentor',answer:`Sessions are <strong>30-45 minutes via ADPList</strong> video call, focused on 1-2 specific challenges. I send follow-up resources and action items after each session.`},
    {keys:['mentoring feedback','mentee feedback','reviews','mentoring reviews','rating'],cat:'mentor',answer:`<strong>80+ testimonials</strong> highlight actionable advice, deep industry knowledge, and a supportive coaching style. Feedback consistently praises practical frameworks and genuine care for growth.`},
    {keys:['book session','schedule','calendly','how to book','book mentor','appointment'],cat:'mentor',answer:`Book through my <strong>ADPList profile</strong> or <strong>Calendly</strong>. Sessions are free and available worldwide for guidance in agile, fintech, or career development.`},
    {keys:['mentoring stats','mentoring numbers','mentoring impact','mentoring data'],cat:'mentor',answer:`Mentoring impact: <strong>2,400+ minutes</strong>, <strong>80+ testimonials</strong>, mentees across <strong>20+ countries</strong>, consistently rated as a Top Mentor on ADPList.`},
    // ── CONTACT / SOCIAL ──
    {keys:['contact','reach','get in touch','connect','reach out','message','email'],cat:'contact',answer:`Reach me via <strong>LinkedIn</strong> (Amr Elharony), <strong>email</strong>, or book on <strong>ADPList/Calendly</strong>. Also on <strong>WhatsApp and Telegram</strong> for professional connections.`},
    {keys:['linkedin','social media','profile','professional network'],cat:'contact',answer:`Connect on <strong>LinkedIn: Amr Elharony</strong>. I share insights on agile leadership, fintech trends, data analytics, and career development.`},
    {keys:['calendly','book call','schedule call','appointment','meeting'],cat:'contact',answer:`Schedule through <strong>Calendly</strong> or <strong>ADPList</strong>. I offer free mentoring sessions and am open to speaking engagements and collaboration.`},
    {keys:['whatsapp','telegram','chat','instant message','dm'],cat:'contact',answer:`Available on <strong>WhatsApp and Telegram</strong> for professional conversations. Reach out for quick questions or to schedule in-depth discussions.`},
    {keys:['website','site','portfolio','online','web presence','amrelharony.com'],cat:'contact',answer:`You're on <strong>amrelharony.com</strong>! It features my career timeline, certifications, book, testimonials, and this AI chatbot. Explore the terminal for hidden features.`},
    // ── TESTIMONIALS ──
    {keys:['testimonial','testimonials','review','reviews','feedback','said','people say','recommendation'],cat:'testimonial',answer:`<strong>80+ testimonials</strong> from colleagues, mentees, and collaborators praising strategic thinking, technical depth, mentoring impact, and agile leadership across themes like strategy, technology, and team culture.`},
    {keys:['strategy testimonial','strategic','strategic thinking','strategic leadership'],cat:'testimonial',answer:`On strategy: <em>"Amr brings a rare ability to connect high-level business strategy with ground-level execution. His strategic vision transformed how our team approaches digital products."</em>`},
    {keys:['tech testimonial','technical','technical skill','technical depth'],cat:'testimonial',answer:`On technology: <em>"Amr has an exceptional grasp of both the technical and business sides. He can discuss architecture with engineers and strategy with executives equally well."</em>`},
    {keys:['mentoring testimonial','mentee review','mentoring review','mentor feedback'],cat:'testimonial',answer:`On mentoring: <em>"Amr's mentoring changed my career trajectory. His actionable advice, combined with genuine care, made every session invaluable."</em> — ADPList mentees highlight transformative impact.`},
    {keys:['agile testimonial','scrum testimonial','agile feedback','scrum feedback'],cat:'testimonial',answer:`On agile: <em>"Amr's Scrum mastery goes beyond ceremonies — he creates an environment where teams genuinely embrace agility. His coaching made our sprints more productive."</em>`},
    {keys:['results testimonial','impact testimonial','outcome','delivery feedback'],cat:'testimonial',answer:`On results: <em>"Under Amr's delivery leadership, our team's velocity increased significantly while maintaining quality. He has a gift for removing blockers and keeping everyone aligned."</em>`},
    {keys:['culture testimonial','team culture','team building','collaboration feedback'],cat:'testimonial',answer:`On culture: <em>"Amr builds psychologically safe environments where team members feel empowered to speak up, experiment, and learn from failures."</em>`},
    {keys:['leadership testimonial','leader feedback','management style','leadership style'],cat:'testimonial',answer:`On leadership: <em>"Amr leads by example — 20+ certifications, a doctorate, a published book. That commitment to continuous learning inspires everyone around him."</em>`},
    {keys:['communication testimonial','presentation','presenting','articulate'],cat:'testimonial',answer:`On communication: <em>"Whether on stage at Seamless North Africa or in a sprint review, Amr translates complex topics into clear, actionable insights for any audience."</em>`},
    {keys:['innovation testimonial','innovative','creative','forward thinking'],cat:'testimonial',answer:`On innovation: <em>"Amr consistently pushes boundaries in banking technology. His forward-thinking approach to data products has put our team ahead of the curve."</em>`},
    {keys:['data testimonial','analytics feedback','data skills'],cat:'testimonial',answer:`On data: <em>"Amr uniquely combines data management expertise (CDMP) with agile delivery leadership. He understands both technical pipelines and the business value data should deliver."</em>`},
    {keys:['coaching testimonial','coach feedback','growth mindset'],cat:'testimonial',answer:`On coaching: <em>"Amr's coaching is empowering rather than directive. He asks the right questions to help you find your own answers, then provides frameworks to structure your thinking."</em>`},
    {keys:['banking testimonial','bank feedback','financial services feedback'],cat:'testimonial',answer:`On banking: <em>"Amr's deep understanding of banking operations combined with agile expertise makes him uniquely effective at driving digital transformation in financial institutions."</em>`},
    {keys:['book testimonial','book review','reader feedback','book feedback'],cat:'testimonial',answer:`On the book: <em>"'The Bilingual Executive' is a must-read for anyone navigating business and technology. Amr's real-world examples make abstract concepts immediately actionable."</em>`},
    {keys:['conference testimonial','speaking feedback','audience feedback','event feedback'],cat:'testimonial',answer:`On speaking: <em>"Amr's presentations are engaging, insightful, and practical. He brings real stories from the trenches of banking and fintech that resonate with diverse audiences."</em>`},
    {keys:['overall testimonial','general feedback','what others say','reputation'],cat:'testimonial',answer:`Overall: <em>"Amr excels as practitioner, leader, author, speaker, and mentor simultaneously. His impact extends far beyond his immediate team — he elevates entire organizations."</em>`},
    // ── EDUCATION ──
    {keys:['education','degree','university','academic','school','study','studied'],cat:'edu',answer:`Education: <strong>BA from Helwan University</strong>, <strong>MBA in Entrepreneurship</strong>, <strong>Doctorate (DBA) in Digital Transformation</strong>, and <strong>CEDF from Frankfurt School</strong>. Plus AMIDEAST programs and continuous professional development.`},
    {keys:['helwan','helwan university','bachelor','ba','undergraduate'],cat:'edu',answer:`<strong>Bachelor's from Helwan University</strong> in Egypt — the academic foundation for my career in banking and technology management.`},
    {keys:['mba','master','entrepreneurship','graduate','masters'],cat:'edu',answer:`My <strong>MBA in Entrepreneurship</strong> sharpened business acumen — strategy, innovation, financial modeling, and venture development, bridging technical skills with business leadership.`},
    {keys:['dba','doctorate','doctoral','phd','digital transformation degree','dissertation'],cat:'edu',answer:`My <strong>Doctorate (DBA) in Digital Transformation</strong> researches how traditional banking institutions can systematically embrace digital technologies, agile methodologies, and data-driven decision making.`},
    {keys:['frankfurt school','cedf','digital finance program'],cat:'edu',answer:`The <strong>CEDF from Frankfurt School</strong> covered digital banking, blockchain, mobile money, and financial inclusion — providing global perspective on fintech innovation beyond MENA.`},
    {keys:['amideast','exchange','international education','us education'],cat:'edu',answer:`Through <strong>AMIDEAST</strong>, I participated in professional development programs expanding exposure to international best practices in technology management and cross-cultural leadership.`},
    // ── IMPACT METRICS ──
    {keys:['impact','numbers','metrics','stats','statistics','data points','by the numbers'],cat:'impact',answer:`Impact: <strong>12+ years</strong> in banking, <strong>2,400+ mentoring minutes</strong>, <strong>9+ conference stages</strong>, <strong>80+ testimonials</strong>, <strong>20+ certifications</strong>, <strong>1 published book</strong>. Each number represents real human impact.`},
    {keys:['years experience','years banking','how long','experience years','12 years'],cat:'impact',answer:`<strong>12+ years</strong> in banking and fintech — IT operations, project management, agile delivery, data analytics, and thought leadership. Compound expertise from each year building on the last.`},
    {keys:['mentoring minutes','2400','mentoring hours','time mentoring'],cat:'impact',answer:`<strong>2,400+ mentoring minutes</strong> on ADPList — equivalent to 40+ hours of one-on-one career guidance for mentees across 20+ countries.`},
    {keys:['stages','speaking count','conferences count','events count','9 stages'],cat:'impact',answer:`<strong>9+ international stages</strong> across Africa and the Middle East — from Seamless North Africa to DevOpsDays Cairo, each reaching hundreds of professionals.`},
    {keys:['testimonials count','80 testimonials','feedback count','reviews count'],cat:'impact',answer:`<strong>80+ testimonials</strong> from colleagues, mentees, and collaborators — consistent impact across strategy, technology, mentoring, agile leadership, and team culture.`},
    // ── ORGANIZATIONS ──
    {keys:['organizations','org','companies','affiliations','associations','member'],cat:'org',answer:`Key affiliations: <strong>Banque Misr</strong>, <strong>Egyptian FinTech Association</strong>, <strong>Fintech Bilinguals</strong> (founder), <strong>ADPList</strong> (Top Mentor), and <strong>Egyptian Armed Forces</strong> (alumni).`},
    {keys:['egyptian fintech','fintech association','efa','fintech egypt'],cat:'org',answer:`Active in the <strong>Egyptian FinTech Association</strong>, contributing to Egypt's fintech ecosystem through knowledge sharing, policy advocacy, and community building.`},
    {keys:['fintech bilinguals','community','bilinguals','founder','built community'],cat:'org',answer:`I founded <strong>Fintech Bilinguals</strong>, a community for professionals bridging business and technology in fintech — sharing insights, opportunities, and best practices for bilingual leadership.`},
    {keys:['adplist org','adplist platform','adplist mentor','mentoring platform'],cat:'org',answer:`On <strong>ADPList</strong>, I'm a <strong>Top Mentor</strong> — one of the platform's most active and highly-rated mentors, providing free career guidance worldwide in agile, fintech, and leadership.`},
    {keys:['armed forces alumni','military alumni','army alumni'],cat:'org',answer:`As an <strong>Egyptian Armed Forces alumni</strong>, I carry forward discipline, structured thinking, and leadership-under-pressure — qualities that translate directly to high-stakes delivery environments.`},
    // ── MISC ──
    {keys:['fun','hobby','hobbies','free time','interests','outside work','personal'],cat:'identity',answer:`Outside work: <strong>continuous learning, writing, and community building</strong>. I enjoy exploring new tech tools, reading about leadership, and mentoring the next generation of fintech professionals.`},
    {keys:['language','arabic','english','bilingual','speak','languages'],cat:'identity',answer:`Fluently <strong>bilingual in Arabic and English</strong> — which inspired my book title. Operating across both languages shaped my belief that the best leaders are bilingual across business and technology too.`},
    {keys:['why','motivation','drive','what drives','passionate','passion'],cat:'identity',answer:`Driven by <strong>impact over titles</strong>. Whether delivering data products, mentoring a career changer, or writing a book — my motivation is creating tangible value that outlasts any single role.`},
    {keys:['advice','tip','tips','recommendation','suggest','recommend'],cat:'identity',answer:`Top advice: <strong>1)</strong> Certify strategically. <strong>2)</strong> Build your brand early. <strong>3)</strong> Mentor and be mentored. <strong>4)</strong> Stay curious. <strong>5)</strong> Write and speak to clarify your thinking.`},
    {keys:['hire','hiring','available','freelance','consulting','consult','work with'],cat:'contact',answer:`Open to <strong>speaking engagements, consulting, and advisory roles</strong> in agile transformation, fintech strategy, and data delivery. Reach out via LinkedIn or email.`},
    {keys:['thank','thanks','appreciate','gratitude','great'],cat:'identity',answer:`Thank you! Feel free to explore more — ask about <strong>career, certifications, book, conferences, mentoring</strong>, or anything else. I'm here to help!`},
    {keys:['hello','hi','hey','greetings','good morning','good evening','howdy'],cat:'identity',answer:`Hey there! 👋 Welcome to Amr's knowledge base. Ask me anything about his <strong>career, certifications, book, mentoring, conferences</strong>, and more.`},
    {keys:['globe','map','world','global','reach','international','countries','visitors'],cat:'impact',answer:`Amr's mentorship spans <strong>20+ countries</strong> worldwide. Type <span class="highlight">globe</span> in the terminal to launch the interactive 3D globe visualization showing mentee locations and visitor arcs connecting back to Cairo.`},
  ];

  // ═══════════════════════════════════════════════════
  // SYNONYM MAP & TF-IDF SCORING ENGINE
  // ═══════════════════════════════════════════════════
  const SYNONYMS = {};
  const _synGroups = [
    ['pm','project management','pmp','project manager','pmi'],
    ['scrum','agile','sprint','scrum master','psm','retrospective','standup'],
    ['dt','digital transformation','digitalization','modernization','digital'],
    ['fintech','financial technology','fin tech','digital finance','digital banking'],
    ['cert','certification','certifications','certified','credential','badge','qualification'],
    ['book','bilingual executive','publication','author','writing','wrote','publish'],
    ['mentor','mentoring','mentorship','coaching','adplist','coach','guidance'],
    ['data','analytics','data science','bi','business intelligence','data analysis'],
    ['ai','artificial intelligence','machine learning','ml','genai','gpt'],
    ['career','experience','journey','timeline','professional','work history','path'],
    ['edu','education','university','degree','academic','school','studied'],
    ['banking','bank','financial services','finance','financial sector'],
    ['leadership','lead','leader','manage','management','delivery lead','manager'],
    ['kanban','flow','wip','lean','pull system'],
    ['product','product ownership','po','product management','pspo','backlog'],
    ['conference','conferences','speaking','event','stage','talk','keynote','spoke','speaker'],
    ['testimonial','testimonials','review','feedback','recommendation','endorsement'],
    ['impact','metrics','stats','numbers','results','achievement','accomplishment'],
    ['contact','email','linkedin','calendly','reach','connect','social','whatsapp','telegram'],
    ['safe','scaled agile','safe 6','enterprise agile','agile release train'],
    ['org','organization','organizations','company','association','affiliation','member'],
  ];
  _synGroups.forEach(group => {
    group.forEach(term => {
      if (!SYNONYMS[term]) SYNONYMS[term] = new Set();
      group.forEach(other => { if (other !== term) SYNONYMS[term].add(other); });
    });
  });

  const _keyFreq = {};
  KB.forEach(e => e.keys.forEach(k => { _keyFreq[k] = (_keyFreq[k]||0)+1; }));
  const _maxFreq = Math.max(1, ...Object.values(_keyFreq));

  function scoreEntry(entry, words, ngrams, q) {
    let score = 0;
    for (const w of words) {
      if (w.length < 2) continue;
      for (const key of entry.keys) {
        if (key === w) {
          score += 5 * (1 + Math.log(_maxFreq / (_keyFreq[key] || 1)));
        } else if (key.length > 2 && (key.includes(w) || w.includes(key))) {
          score += 2;
        }
      }
    }
    for (const ng of ngrams) {
      const syns = SYNONYMS[ng];
      if (syns) {
        for (const syn of syns) {
          if (entry.keys.indexOf(syn) >= 0) { score += 4; break; }
        }
      }
    }
    for (const key of entry.keys) {
      if (key.length > 2 && q.includes(key)) score += 6;
    }
    if (entry.cat && q.includes(entry.cat)) score += 3;
    return score;
  }

  function matchQuery(query) {
    if (!query || !query.trim()) return {matches:[], confidence:'welcome', topScore:0};
    const q = query.toLowerCase().replace(/[?!.,;:'"]/g, '').trim();
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const ngrams = [...words];
    for (let i = 0; i < words.length - 1; i++) ngrams.push(words[i] + ' ' + words[i+1]);
    for (let i = 0; i < words.length - 2; i++) ngrams.push(words[i] + ' ' + words[i+1] + ' ' + words[i+2]);

    const scored = KB.map(entry => ({entry, score: scoreEntry(entry, words, ngrams, q)}))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length || scored[0].score < 8) {
      return {matches: scored.slice(0, 1), confidence: 'low', topScore: scored[0]?.score || 0};
    }
    const topScore = scored[0].score;
    const confidence = topScore >= 15 ? 'high' : 'good';
    const seen = new Set();
    const matches = [];
    for (const s of scored) {
      if (matches.length >= 3) break;
      const sig = s.entry.answer.substring(0, 80);
      if (seen.has(sig)) continue;
      seen.add(sig);
      matches.push(s);
    }
    return {matches, confidence, topScore};
  }

  // ═══════════════════════════════════════════════════
  // FOLLOW-UP SUGGESTIONS & TOPICS
  // ═══════════════════════════════════════════════════
  const CAT_FOLLOW_UPS = {
    identity: ['career journey','certifications','book','mentoring'],
    career: ['certifications','education','skills','conferences'],
    cert: ['agile','career','education','data'],
    book: ['conferences','mentoring','testimonials','writing process'],
    conf: ['book','fintech','career','speaking'],
    skill: ['certifications','career','data','agile'],
    mentor: ['testimonials','book session','contact','impact'],
    contact: ['mentoring','linkedin','career','speaking'],
    testimonial: ['mentoring','career','book','leadership'],
    edu: ['certifications','career','digital transformation','skills'],
    impact: ['career','mentoring','certifications','conferences'],
    org: ['career','fintech','community','banking'],
  };
  const TOPICS = ['career','certifications','skills','book','fintech','agile','data','conferences','mentoring','education','testimonials','impact','contact','organizations','digital transformation'];

  function getFollowUps(cats) {
    const all = new Set();
    cats.forEach(c => { (CAT_FOLLOW_UPS[c] || []).forEach(f => all.add(f)); });
    return [...all].slice(0, 4);
  }

  // ═══════════════════════════════════════════════════
  // LOCAL LLM ENGINE (WebGPU + WebLLM)
  // ═══════════════════════════════════════════════════
  const LLM_MODEL = 'SmolLM2-1.7B-Instruct-q4f16_1-MLC';
  let _llmEngine = null;
  let _llmReady = false;
  let _llmLoading = false;
  let _llmDisabled = false;
  let _llmProgress = { text: '', progress: 0 };
  let _llmLastStats = null;
  let _llmHistory = [];
  let _llmSystemPrompt = null;

  function buildSystemPrompt() {
    const grouped = {};
    KB.forEach(e => {
      const c = e.cat || 'other';
      if (!grouped[c]) grouped[c] = [];
      const plain = e.answer.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      grouped[c].push(plain);
    });
    let ctx = '';
    for (const [cat, entries] of Object.entries(grouped)) {
      ctx += `\n[${cat.toUpperCase()}]\n`;
      entries.forEach(e => { ctx += '- ' + e + '\n'; });
    }
    return {
      role: 'system',
      content: `You are Amr Elharony's AI assistant embedded in his portfolio website. Answer visitors' questions about Amr using ONLY the context below. Be concise (2-4 sentences). Use first person when speaking as Amr. If the question is outside the context, say so politely and suggest related topics. Do NOT invent facts.\n\nCONTEXT:${ctx}`
    };
  }

  function updateLLMProgressUI() {
    const bar = document.getElementById('llmProgress');
    if (!bar) return;
    if (!_llmLoading) { bar.remove(); return; }
    const fill = bar.querySelector('.llm-progress-bar');
    const label = bar.querySelector('.llm-progress-label');
    if (fill) fill.style.width = Math.round(_llmProgress.progress * 100) + '%';
    if (label) label.textContent = _llmProgress.text;
  }

  function showLLMProgressBar() {
    if (document.getElementById('llmProgress')) return;
    const body = document.getElementById('termBody');
    if (!body) return;
    const div = document.createElement('div');
    div.id = 'llmProgress';
    div.className = 'llm-progress';
    div.innerHTML = '<div class="llm-progress-bar"></div><span class="llm-progress-label">Initializing local AI...</span>';
    body.prepend(div);
  }

  async function initLLM() {
    if (_llmReady || _llmLoading || _llmDisabled || isMobile) return;
    if (!navigator.gpu) return;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return;
    } catch (_) { return; }

    _llmLoading = true;
    showLLMProgressBar();
    if (window.UniToast) window.UniToast('Downloading local AI model... (cached after first load)');

    let worker = null;
    try {
      const { CreateWebWorkerMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
      worker = new Worker('Js/llm-worker.js', { type: 'module' });
      _llmEngine = await CreateWebWorkerMLCEngine(worker, LLM_MODEL, {
        initProgressCallback: (report) => {
          _llmProgress = { text: report.text || '', progress: report.progress || 0 };
          updateLLMProgressUI();
        }
      });
      _llmSystemPrompt = buildSystemPrompt();
      _llmReady = true;
      _llmLoading = false;
      updateLLMProgressUI();
      if (window.UniToast) window.UniToast('Local AI ready — Sentient Mode active');
      if (window.VDna) window.VDna.addXp(15);
    } catch (err) {
      console.warn('WebLLM init failed:', err);
      if (worker) try { worker.terminate(); } catch (_) {}
      _llmLoading = false;
      _llmReady = false;
      updateLLMProgressUI();
    }
  }

  // ═══════════════════════════════════════════════════
  // LLM STREAMING RENDERER
  // ═══════════════════════════════════════════════════
  async function streamLLMAnswer(containerId, question, sid) {
    if (sid !== _streamId) return;
    const el = document.getElementById(containerId);
    if (!el || !_llmEngine) return;

    const pendingHistory = [..._llmHistory, { role: 'user', content: question }];
    const messages = [_llmSystemPrompt, ...pendingHistory];
    let fullText = '';
    let tokenCount = 0;
    const t0 = performance.now();

    try {
      const completion = await _llmEngine.chat.completions.create({
        messages,
        stream: true,
        max_tokens: 300,
        temperature: 0.7,
      });

      el.innerHTML = '';

      for await (const chunk of completion) {
        if (sid !== _streamId) return;
        const delta = chunk.choices[0]?.delta?.content || '';
        if (!delta) continue;
        fullText += delta;
        tokenCount++;
        const escaped = fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const rendered = escaped
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        el.innerHTML = rendered + '<span class="term-chat-cursor"></span>';
        const body = el.closest('.term-body') || document.getElementById('termBody');
        if (body) body.scrollTop = body.scrollHeight;
      }

      const elapsed = (performance.now() - t0) / 1000;
      const tokPerSec = elapsed > 0 ? Math.round(tokenCount / elapsed) : 0;
      _llmLastStats = { tokenCount, elapsed: elapsed.toFixed(1), tokPerSec, model: LLM_MODEL };

      _llmHistory = [...pendingHistory, { role: 'assistant', content: fullText }];
      if (_llmHistory.length > 20) _llmHistory = _llmHistory.slice(-20);

      const escaped = fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const rendered = escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      el.innerHTML = `<span class="term-chat-badge ai">AI · ${tokPerSec} tok/s</span> ${rendered}`;

      const result = matchQuery(question);
      appendFollowUps(el, result);
    } catch (err) {
      el.innerHTML = '<span class="term-chat-badge kb">KB fallback</span> ';
      const result = matchQuery(question);
      if (result.matches.length) {
        el.innerHTML += result.matches.map(m => m.entry.answer).join('<br><br>');
      } else {
        el.innerHTML += 'Sorry, the AI encountered an error. Here are some topics you can ask about:';
      }
      appendFollowUps(el, result);
    }
  }

  // ═══════════════════════════════════════════════════
  // STREAMING RENDERER (KB fallback)
  // ═══════════════════════════════════════════════════
  let _streamId = 0;

  function streamAnswer(containerId, result, sid) {
    if (sid !== _streamId) return;
    const el = document.getElementById(containerId);
    if (!el) return;

    let html = '<span class="term-chat-badge kb">KB</span> ';
    if (result.confidence === 'high')
      html += '<span class="term-chat-confidence high">● high confidence</span> ';
    else if (result.confidence === 'good')
      html += '<span class="term-chat-confidence good">● good match</span> ';

    if (!result.matches || !result.matches.length) {
      html += 'I don\'t have a specific answer for that yet. Try one of the topics below!';
    } else {
      html += result.matches.map(m => m.entry.answer).join('<br><br>');
    }

    if (RM) {
      el.innerHTML = html;
      appendFollowUps(el, result);
      return;
    }

    const tokens = [];
    const re = /(<[^>]+>)|(\s+)|([^\s<]+)/g;
    let m;
    while ((m = re.exec(html))) {
      tokens.push(m[1] ? {t:1, v:m[1]} : m[2] ? {t:2, v:m[2]} : {t:3, v:m[3]});
    }

    let buf = '', idx = 0;
    function tick() {
      if (sid !== _streamId) return;
      while (idx < tokens.length && tokens[idx].t !== 3) { buf += tokens[idx++].v; }
      if (idx < tokens.length) buf += tokens[idx++].v;
      el.innerHTML = buf + (idx < tokens.length ? '<span class="term-chat-cursor"></span>' : '');
      const body = el.closest('.term-body');
      if (body) body.scrollTop = body.scrollHeight;
      if (idx < tokens.length) setTimeout(tick, 33);
      else appendFollowUps(el, result);
    }
    tick();
  }

  function appendFollowUps(el, result) {
    const cats = (result.matches || []).map(m => m.entry.cat);
    const fups = getFollowUps(cats);
    let h = '';
    if (fups.length) {
      h += '<div class="term-chat-followups"><div class="term-chat-followup-label">Related topics</div><div class="term-chat-topics">';
      fups.forEach(t => { const st=t.replace(/'/g,'&#39;').replace(/"/g,'&quot;'); h += `<span class="term-chat-topic" onclick="document.getElementById('termInput').value='ask ${st}';document.getElementById('termInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))">${st}</span>`; });
      h += '</div></div>';
    }
    h += '<div class="term-chat-topics" style="margin-top:6px">';
    TOPICS.forEach(t => { const st=t.replace(/'/g,'&#39;').replace(/"/g,'&quot;'); h += `<span class="term-chat-topic" onclick="document.getElementById('termInput').value='ask ${st}';document.getElementById('termInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))">${st}</span>`; });
    h += '</div>';
    el.insertAdjacentHTML('beforeend', h);
    const body = el.closest('.term-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  // ═══════════════════════════════════════════════════
  // WELCOME & INIT
  // ═══════════════════════════════════════════════════
  function formatWelcome() { return formatWelcomeLLM(); }

  function formatWelcomeLLM() {
    const mode = _llmReady ? '🧠 <strong>Sentient Mode</strong> (local AI active)' : _llmLoading ? '⏳ AI model loading...' : '📚 Knowledge Base mode';
    let h = `${mode}\nAsk me anything about Amr's <strong>career, certifications, book, mentoring, conferences</strong>, and more.\n\nTry: <span class="highlight">"Tell me about your book"</span> or <span class="highlight">"What certifications do you have?"</span>`;
    h += '<div class="term-chat-topics" style="margin-top:8px">';
    TOPICS.forEach(t => { const st=t.replace(/'/g,'&#39;').replace(/"/g,'&quot;'); h += `<span class="term-chat-topic" onclick="document.getElementById('termInput').value='ask ${st}';document.getElementById('termInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))">${st}</span>`; });
    h += '</div>';
    return h;
  }

  function initAskAmr() {
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.ask = function(args) {
      const question = (args || '').trim();
      if (!question) return formatWelcomeLLM();

      const forceLocal = question.startsWith('--local ');
      const q = forceLocal ? question.slice(8).trim() : question;

      const streamId = 'stream-' + Date.now();
      _streamId++;
      const myId = _streamId;
      let html = `<div class="term-chat-msg term-chat-q">❓ ${escHtml(q)}</div>`;
      html += `<div class="term-chat-msg term-chat-a" id="${streamId}"><span class="term-chat-typing"><span></span><span></span><span></span></span></div>`;

      if (_llmReady && !forceLocal && !_llmDisabled) {
        setTimeout(() => streamLLMAnswer(streamId, q, myId), 200);
      } else {
        const result = matchQuery(q);
        setTimeout(() => streamAnswer(streamId, result, myId), 400);
      }
      return html;
    };
    window.TermCmds.amr = (args) => window.TermCmds.ask(args || 'who are you');

    // LLM terminal commands
    window.TermCmds.llm = function() {
      if (_llmReady) {
        const s = _llmLastStats;
        let out = `<span class="term-green">🧠 Local LLM — Sentient Mode Active</span>\n`;
        out += `<span class="term-gray">Model:</span>    ${LLM_MODEL}\n`;
        out += `<span class="term-gray">Status:</span>   <span class="term-green">● Ready</span>\n`;
        out += `<span class="term-gray">History:</span>  ${_llmHistory.length} messages`;
        if (s) out += `\n<span class="term-gray">Last query:</span> ${s.tokenCount} tokens in ${s.elapsed}s (${s.tokPerSec} tok/s)`;
        return out;
      }
      if (_llmLoading) return '<span class="term-cyan">⏳ Model downloading... ' + Math.round(_llmProgress.progress * 100) + '%</span>\n<span class="term-gray">' + _llmProgress.text + '</span>';
      if (_llmDisabled) return '<span class="term-gray">LLM disabled — type <span class="term-white">llm-on</span> to re-enable</span>';
      if (isMobile) return '<span class="term-gray">LLM not available on mobile devices (insufficient GPU memory)</span>';
      if (!navigator.gpu) return '<span class="term-gray">WebGPU not supported in this browser — using KB matcher</span>';
      return '<span class="term-gray">LLM not loaded — type <span class="term-white">llm-load</span> to download</span>';
    };

    window.TermCmds['llm-load'] = function() {
      if (_llmReady) return '<span class="term-green">🧠 LLM already loaded and ready</span>';
      if (_llmLoading) return '<span class="term-cyan">⏳ Already downloading...</span>';
      _llmDisabled = false;
      initLLM();
      return '<span class="term-green">🧠 Starting LLM download...</span>';
    };

    window.TermCmds['llm-off'] = function() {
      _llmDisabled = true;
      return '<span class="term-gray">LLM disabled — using KB matcher for all queries</span>';
    };

    window.TermCmds['llm-on'] = function() {
      _llmDisabled = false;
      if (_llmReady) return '<span class="term-green">🧠 LLM re-enabled — Sentient Mode active</span>';
      initLLM();
      return '<span class="term-green">🧠 LLM enabled — initializing...</span>';
    };

    const _origClear = window.TermCmds.clear;
    window.TermCmds.clear = function() {
      _llmHistory = [];
      if (_llmLoading) showLLMProgressBar();
      return _origClear ? _origClear() : '__CLEAR__';
    };

    initLLM();
  }

  // ═══════════════════════════════════════════════════
  // 3D OVERLAY CORE
  // ═══════════════════════════════════════════════════
  let threeLoaded = false, threeLoadPromise = null;
  let modelViewerLoaded = false, modelViewerLoadPromise = null;

  function create3DOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'viewer3dOverlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) close3D(); });
    overlay.innerHTML = `
      <div class="viewer3d-container" id="v3dContainer">
        <div class="viewer3d-loading" id="v3dLoading">
          <div class="viewer3d-loading-spinner">📦</div>
          <div class="viewer3d-loading-text">Loading...</div>
        </div>
        <div class="viewer3d-hud" id="v3dHud">
          <span class="viewer3d-title" id="v3dTitle">3D Viewer</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  function open3D(title, builder, engineType = 'three') {
    if (window._v3dCleanup) { window._v3dCleanup(); window._v3dCleanup = null; }

    const overlay = document.getElementById('viewer3dOverlay');
    const loading = document.getElementById('v3dLoading');
    const titleEl = document.getElementById('v3dTitle');
    const container = document.getElementById('v3dContainer');

    if (container) Array.from(container.children).forEach(child => {
        if (!['v3dLoading', 'v3dHud'].includes(child.id)) child.remove();
    });

    if (titleEl) titleEl.textContent = title;
    if (loading) loading.classList.remove('hidden');
    overlay.classList.add('show');
    Haptic.doubleTap();
    window.autoDismiss3D('viewer3dOverlay',close3D);

    const loader = engineType === 'model-viewer' ? loadModelViewerJS() : loadThreeJS();

    loader.then(() => {
      if (loading) loading.classList.add('hidden');
      Haptic.success();
      builder(container);
    }).catch(err => {
      console.error(`${engineType} load failed:`, err);
      Haptic.warning();
      if (loading) loading.querySelector('.viewer3d-loading-text').textContent = 'Failed to load';
    });
  }

  function close3D() {
    Haptic.tap();
    const overlay = document.getElementById('viewer3dOverlay');
    overlay?.classList.remove('show');
    window.cancelAutoDismiss('viewer3dOverlay');
    const container = document.getElementById('v3dContainer');
    if (container) {
        if (container.querySelector('canvas')) container.querySelector('canvas').remove();
        if (container.querySelector('model-viewer')) container.querySelector('model-viewer').remove();
    }
    if (window._v3dCleanup) { window._v3dCleanup(); window._v3dCleanup = null; }
  }
  window._close3D = close3D;

  function loadThreeJS() {
    if (threeLoaded && window.THREE) return Promise.resolve();
    if (threeLoadPromise) return threeLoadPromise;
    threeLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => { threeLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return threeLoadPromise;
  }

  function loadModelViewerJS() {
    if (modelViewerLoaded || customElements.get('model-viewer')) return Promise.resolve();
    if (modelViewerLoadPromise) return modelViewerLoadPromise;
    modelViewerLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => { modelViewerLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return modelViewerLoadPromise;
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 3: BOOK VIEWER (3D & AR)
  // ═══════════════════════════════════════════════════
  function launchBookViewer() {
    open3D('📘 3D Book Viewer', buildBookScene, 'model-viewer');
  }

  function buildBookScene(container) {
    const mvHTML = `
      <model-viewer
        src="Assets/book.glb"
        ios-src="Assets/book.usdz"
        ar
        ar-modes="webxr scene-viewer quick-look"
        alt="A 3D model of The Bilingual Executive book"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        loading="eager"
      >
        <button slot="ar-button" class="ar-btn" title="View in AR">👁</button>
      </model-viewer>
      <div class="viewer3d-hint" id="v3dHint">
        ${isMobile ? 'Pinch · Drag · Tap AR' : 'Scroll · Drag · Rotate'}
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mvHTML;
    while (tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

    const mv = container.querySelector('model-viewer');

    if (mv) {
      mv.addEventListener('error', () => {
        Haptic.warning();
        const hint = document.getElementById('v3dHint');
        if (hint) hint.textContent = '⚠️ Model not found';
      });

      let userInteracting = false;
      mv.addEventListener('camera-change', () => { if (userInteracting) Haptic.rotate(); });
      mv.addEventListener('interact-started', () => { userInteracting = true; });
      mv.addEventListener('interact-stopped', () => { userInteracting = false; });
      mv.addEventListener('ar-status', (e) => {
        if (e.detail.status === 'session-started') Haptic.arEnter();
        else if (e.detail.status === 'not-presenting') Haptic.tap();
      });

      let lastPinchDist = 0;
      mv.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist && Math.abs(dist - lastPinchDist) > 8) Haptic.zoom();
          lastPinchDist = dist;
        }
      }, { passive: true });
      mv.addEventListener('touchend', () => { lastPinchDist = 0; }, { passive: true });
      mv.addEventListener('wheel', () => Haptic.zoom(), { passive: true });
    }

    window._v3dCleanup = () => {
      if (mv) { mv.remove(); }
    };

    const hud = container.querySelector('#v3dHud');
    if (hud) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'viewer3d-close-btn';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', 'Close 3D viewer');
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close3D(); });
      hud.appendChild(closeBtn);
    }
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE FINTECH VISUALIZER (THREE.JS + BINANCE WS)
  // ═══════════════════════════════════════════════════
  function launchDataMesh() {
    open3D('📊 Live Trades', buildMeshScene, 'three');
  }

  function buildMeshScene(container) {
    if (typeof THREE === 'undefined') { console.error('THREE.js not loaded'); return; }
    const ASSET_COLORS = { BTCUSDT: 0x00e1ff, ETHUSDT: 0xa855f7, SOLUSDT: 0x22c55e };
    const ASSET_LABELS = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
    const NODE_LIFETIME = 4000;
    const MAX_NODES = 60;

    // --- HUD ---
    const hud = document.createElement('div');
    hud.className = 'ftv-hud';
    hud.innerHTML = `
      <div class="ftv-hud-top">
        <div class="ftv-price" id="ftvPrice">BTC --</div>
        <div class="ftv-tps" id="ftvTps">0 trades/s</div>
      </div>
      <div class="ftv-ticker" id="ftvTicker"></div>`;
    container.appendChild(hud);

    const hint = document.createElement('div');
    hint.className = 'viewer3d-hint';
    hint.id = 'ftvHint';
    hint.textContent = 'Live · Binance';
    container.appendChild(hint);

    // --- THREE.JS SCENE ---
    const W = container.clientWidth, H = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    container.insertBefore(renderer.domElement, hint);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, wireframe: true, transparent: true, opacity: 0.3 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const nodes = [];
    const lines = [];
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, color: 0x00e1ff });

    function randomOnSphere(radius) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }

    function spawnNode(trade) {
      const assetColor = ASSET_COLORS[trade.s] || 0x00e1ff;
      const isBuy = !trade.m;
      const qty = parseFloat(trade.q) || 0.01;
      const size = Math.max(0.04, Math.min(0.2, Math.log10(qty + 1) * 0.08));
      Haptic.trade(isBuy);
      const brightness = isBuy ? 1.0 : 0.5;

      const geo = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: assetColor, transparent: true, opacity: brightness
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = randomOnSphere(2.5 + Math.random() * 1.0);
      mesh.position.copy(pos);
      group.add(mesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), pos]);
      const lMat = lineMat.clone();
      lMat.color = new THREE.Color(assetColor);
      lMat.opacity = 0.15;
      const line = new THREE.Line(lineGeo, lMat);
      group.add(line);

      const born = performance.now();
      nodes.push({ mesh, mat, born });
      lines.push({ line, lMat, born });

      while (nodes.length > MAX_NODES) {
        const old = nodes.shift();
        group.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mat.dispose();
      }
      while (lines.length > MAX_NODES) {
        const old = lines.shift();
        group.remove(old.line);
        old.line.geometry.dispose();
        old.lMat.dispose();
      }

      coreMat.opacity = 0.6;
    }

    // --- ANIMATE ---
    let alive = true;
    function animate() {
      if (!alive || !renderer.domElement.closest('body')) { alive = false; return; }
      requestAnimationFrame(animate);

      group.rotation.y += 0.002;
      group.rotation.x += 0.0005;

      if (coreMat.opacity > 0.3) coreMat.opacity -= 0.005;

      const now = performance.now();
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const age = now - n.born;
        if (age > NODE_LIFETIME) {
          group.remove(n.mesh);
          n.mesh.geometry.dispose();
          n.mat.dispose();
          nodes.splice(i, 1);
        } else {
          n.mat.opacity = Math.max(0, (1 - age / NODE_LIFETIME) * (n.mat.opacity > 0.5 ? 1.0 : 0.5));
        }
      }
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        const age = now - l.born;
        if (age > NODE_LIFETIME * 0.6) {
          group.remove(l.line);
          l.line.geometry.dispose();
          l.lMat.dispose();
          lines.splice(i, 1);
        } else {
          l.lMat.opacity = Math.max(0, 0.15 * (1 - age / (NODE_LIFETIME * 0.6)));
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // --- WEBSOCKET ---
    let ws = null;
    let reconnectDelay = 1000;
    let tradeCount = 0;
    let tpsInterval = null;
    let lastBtcPrice = null;
    const recentTrades = [];

    function updateHUD(trade) {
      const label = ASSET_LABELS[trade.s] || trade.s;
      const price = parseFloat(trade.p);
      const qty = parseFloat(trade.q);
      const arrow = trade.m ? '↓' : '↑';
      const color = trade.m ? '#ef4444' : '#22c55e';

      if (trade.s === 'BTCUSDT') {
        const el = document.getElementById('ftvPrice');
        if (el) {
          const dir = lastBtcPrice ? (price > lastBtcPrice ? '▲' : price < lastBtcPrice ? '▼' : '') : '';
          const cls = price >= (lastBtcPrice || price) ? 'color:#22c55e' : 'color:#ef4444';
          el.innerHTML = `BTC <span style="${cls}">$${price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${dir}</span>`;
          lastBtcPrice = price;
        }
      }

      recentTrades.unshift({ label, price, qty, arrow, color });
      if (recentTrades.length > 8) recentTrades.length = 8;
      const ticker = document.getElementById('ftvTicker');
      if (ticker) {
        ticker.innerHTML = recentTrades.map(t =>
          `<span class="ftv-trade"><span style="color:${t.color}">${t.arrow}</span> ${t.label} $${t.price.toLocaleString(undefined,{maximumFractionDigits:2})} <span style="opacity:.4">${t.qty.toFixed(4)}</span></span>`
        ).join('');
      }

      tradeCount++;
    }

    function connectWS() {
      if (!alive) return;
      if (ws) { try { ws.onclose = null; ws.close(); } catch(e) {} ws = null; }
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade');
      } catch(e) {
        fallback(); return;
      }

      ws.onopen = () => {
        reconnectDelay = 1000;
        Haptic.success();
        const h = document.getElementById('ftvHint');
        if (h) h.textContent = 'Live · Binance';
      };

      let lastSpawnTime = 0;
      const SPAWN_INTERVAL = 200;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const trade = msg.data;
          if (!trade || !trade.s) return;
          updateHUD(trade);
          const now = performance.now();
          if (now - lastSpawnTime >= SPAWN_INTERVAL) {
            lastSpawnTime = now;
            spawnNode(trade);
            if (window._sono) window._sono.vizTrade(trade);
          }
        } catch(e) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (!alive) return;
        setTimeout(connectWS, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 8000);
      };
    }

    function fallback() {
      const h = document.getElementById('ftvHint');
      if (h) h.textContent = 'Offline mode';
    }

    connectWS();

    tpsInterval = setInterval(() => {
      const el = document.getElementById('ftvTps');
      if (el) el.textContent = tradeCount + ' trades/s';
      tradeCount = 0;
    }, 1000);

    // --- CLEANUP ---
    window._v3dCleanup = () => {
      alive = false;
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      if (tpsInterval) clearInterval(tpsInterval);
      nodes.forEach(n => { n.mesh.geometry.dispose(); n.mat.dispose(); });
      lines.forEach(l => { l.line.geometry.dispose(); l.lMat.dispose(); });
      lineMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }

  // ═══════════════════════════════════════════════════
  // FEATURE 5: INTERACTIVE 3D GLOBE — GLOBAL REACH
  // ═══════════════════════════════════════════════════
  const CAIRO_LAT = 30.0444, CAIRO_LNG = 31.2357;

  function latLngToVec3(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function launchGlobe() {
    open3D('🌐 Global Visitor Reach', buildGlobeScene, 'three');
  }
  window._launchGlobe = launchGlobe;

  function buildGlobeScene(container) {
    if (typeof THREE === 'undefined') return;

    const W = container.clientWidth, H = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060910);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 3.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const hintEl = container.querySelector('.viewer3d-hint');
    if (hintEl) container.insertBefore(renderer.domElement, hintEl);
    else container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // ── Earth ──
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthTexLoader = new THREE.TextureLoader();
    const earthTex = earthTexLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
    const globeMat = new THREE.MeshBasicMaterial({ map: earthTex, transparent: true, opacity: 0.92 });
    group.add(new THREE.Mesh(globeGeo, globeMat));

    // ── Grid ──
    const gridGeo = new THREE.SphereGeometry(1.002, 36, 18);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, wireframe: true, transparent: true, opacity: 0.04 });
    group.add(new THREE.Mesh(gridGeo, gridMat));

    // ── Atmosphere ──
    const atmosGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, transparent: true, opacity: 0.03, side: THREE.BackSide });
    group.add(new THREE.Mesh(atmosGeo, atmosMat));
    const atmos2Geo = new THREE.SphereGeometry(1.15, 32, 32);
    const atmos2Mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.015, side: THREE.BackSide });
    group.add(new THREE.Mesh(atmos2Geo, atmos2Mat));

    // ── Cairo Beacon ──
    const cairoPos = latLngToVec3(CAIRO_LAT, CAIRO_LNG, 1.01);
    const cairoDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00e1ff })
    );
    cairoDot.position.copy(cairoPos);
    group.add(cairoDot);

    const ringGeo = new THREE.RingGeometry(0.03, 0.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(cairoPos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    group.add(ring);

    // ── Arcs & Dots ──
    let alive = true;
    const arcData = [];
    const ARC_PTS = 60;
    const VISITOR_COLOR = 0x22c55e;
    const disposables = [];
    const regionHits = {};
    let realtimeChannel = null;

    function regionKey(lat, lng) {
      return Math.round(lat / 5) + ',' + Math.round(lng / 5);
    }

    function addLocation(lat, lng, delay, isRealtime) {
      if (!alive) return;
      const pos = latLngToVec3(lat, lng, 1.008);

      const rk = regionKey(lat, lng);
      regionHits[rk] = (regionHits[rk] || 0) + 1;
      const intensity = Math.min(regionHits[rk] / 8, 1);
      const baseSize = 0.01 + intensity * 0.012;
      const baseOpacity = 0.55 + intensity * 0.4;

      const dotGeo = new THREE.SphereGeometry(baseSize, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: VISITOR_COLOR, transparent: true, opacity: baseOpacity });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      group.add(dot);
      disposables.push(dotGeo, dotMat);

      const mid = pos.clone().add(cairoPos).multiplyScalar(0.5);
      const dist = pos.distanceTo(cairoPos);
      mid.normalize().multiplyScalar(1 + dist * 0.35);

      const curve = new THREE.QuadraticBezierCurve3(pos, mid, cairoPos);
      const points = curve.getPoints(ARC_PTS);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      arcGeo.setDrawRange(0, 0);
      const arcMat = new THREE.LineBasicMaterial({ color: isRealtime ? 0x00e1ff : VISITOR_COLOR, transparent: true, opacity: isRealtime ? 0.85 : 0.5 + intensity * 0.3 });
      const line = new THREE.Line(arcGeo, arcMat);
      group.add(line);
      disposables.push(arcGeo, arcMat);

      arcData.push({
        geo: arcGeo, total: ARC_PTS + 1, drawn: 0,
        speed: isRealtime ? 1.8 : 0.8 + Math.random() * 0.5,
        delay, startTime: performance.now()
      });
    }

    // ── Dynamic Stats Engine ──
    const statEls = {};
    let statsRefreshTimer = null;
    const STATS_CACHE_KEY = '_globe_stats_cache';

    function animateCounter(el, target, suffix, prefix) {
      suffix = suffix || '';
      prefix = prefix || '';
      const duration = 1200;
      const start = performance.now();
      const from = 0;
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (target - from) * ease);
        el.innerHTML = prefix + val.toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function flashGlow(cardEl) {
      cardEl.classList.add('glow');
      setTimeout(() => cardEl.classList.remove('glow'), 1200);
    }

    async function fetchGlobeStats() {
      if (!window._sb) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) applyStats(JSON.parse(cached));
        return;
      }
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [countryRes, totalRes, uniqueRes, liveRes, topRes, todayRes] = await Promise.all([
          window._sb.rpc('count_distinct_countries'),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }),
          window._sb.rpc('count_unique_visitors'),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }).gte('created_at', fiveMinAgo),
          window._sb.from('site_visits').select('country').not('country', 'is', null).order('country').limit(1000),
          window._sb.from('site_visits').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo)
        ]);

        let topCountry = '—';
        if (topRes.data && topRes.data.length) {
          const freq = {};
          topRes.data.forEach(r => { if (r.country) freq[r.country] = (freq[r.country] || 0) + 1; });
          topCountry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        }

        const stats = {
          countries: countryRes.data ?? 0,
          totalVisits: totalRes.count ?? 0,
          uniqueVisitors: uniqueRes.data ?? 0,
          liveNow: liveRes.count ?? 0,
          topCountry,
          todayVisits: todayRes.count ?? 0
        };

        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
        applyStats(stats, true);
      } catch (e) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) applyStats(JSON.parse(cached));
      }
    }

    function applyStats(s, animate) {
      if (statEls.countries) {
        if (animate) { animateCounter(statEls.countries, s.countries); flashGlow(statEls.countriesCard); }
        else statEls.countries.textContent = s.countries.toLocaleString();
      }
      if (statEls.totalVisits) {
        if (animate) { animateCounter(statEls.totalVisits, s.totalVisits); flashGlow(statEls.totalVisitsCard); }
        else statEls.totalVisits.textContent = s.totalVisits.toLocaleString();
      }
      if (statEls.uniqueVisitors) {
        if (animate) { animateCounter(statEls.uniqueVisitors, s.uniqueVisitors); flashGlow(statEls.uniqueVisitorsCard); }
        else statEls.uniqueVisitors.textContent = s.uniqueVisitors.toLocaleString();
      }
      const liveDotHtml = '<span class="globe-live-dot"></span>';
      if (statEls.liveNow) {
        if (animate) { animateCounter(statEls.liveNow, s.liveNow, '', liveDotHtml); flashGlow(statEls.liveNowCard); }
        else statEls.liveNow.innerHTML = liveDotHtml + s.liveNow.toLocaleString();
      }
      if (statEls.topCountry) {
        statEls.topCountry.textContent = s.topCountry || '—';
        if (animate) flashGlow(statEls.topCountryCard);
      }
      if (statEls.todayVisits) {
        if (animate) { animateCounter(statEls.todayVisits, s.todayVisits); flashGlow(statEls.todayVisitsCard); }
        else statEls.todayVisits.textContent = s.todayVisits.toLocaleString();
      }
    }

    // ── Fetch visitor locations from site_visits ──
    if (window._sb) {
      window._sb.from('site_visits').select('lat,lng,country')
        .not('lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) data.forEach((e, i) => {
            if (e.lat && e.lng) addLocation(e.lat, e.lng, i * 250 + Math.random() * 200, false);
          });
        }).catch(() => {});
    }

    // ── Glassmorphism HUD ──
    const hudEl = document.createElement('div');
    hudEl.className = 'globe-hud';
    hudEl.innerHTML = `<div class="globe-stats-glass">
      <div class="globe-stat-card" id="gs-countries"><div class="globe-stat-val" id="gsv-countries">—</div><div class="globe-stat-label">Countries</div></div>
      <div class="globe-stat-card" id="gs-total"><div class="globe-stat-val" id="gsv-total">—</div><div class="globe-stat-label">Total Visits</div></div>
      <div class="globe-stat-card" id="gs-unique"><div class="globe-stat-val" id="gsv-unique">—</div><div class="globe-stat-label">Visitors</div></div>
      <div class="globe-stat-card" id="gs-live"><div class="globe-stat-val" id="gsv-live"><span class="globe-live-dot"></span>—</div><div class="globe-stat-label">Live Now</div></div>
      <div class="globe-stat-card" id="gs-top"><div class="globe-stat-val" id="gsv-top" style="font-size:10px">—</div><div class="globe-stat-label">Top Country</div></div>
      <div class="globe-stat-card" id="gs-today"><div class="globe-stat-val" id="gsv-today">—</div><div class="globe-stat-label">Today</div></div>
    </div>
    <div class="globe-bottom-glass">
      <div class="globe-legend">
        <span><span class="globe-legend-dot" style="background:#00e1ff"></span>Cairo (Home)</span>
        <span><span class="globe-legend-dot" style="background:#22c55e"></span>Visitors</span>
      </div>
    </div>`;
    container.appendChild(hudEl);

    const toastEl = document.createElement('div');
    toastEl.className = 'globe-toast';
    container.appendChild(toastEl);

    statEls.countries = hudEl.querySelector('#gsv-countries');
    statEls.countriesCard = hudEl.querySelector('#gs-countries');
    statEls.totalVisits = hudEl.querySelector('#gsv-total');
    statEls.totalVisitsCard = hudEl.querySelector('#gs-total');
    statEls.uniqueVisitors = hudEl.querySelector('#gsv-unique');
    statEls.uniqueVisitorsCard = hudEl.querySelector('#gs-unique');
    statEls.liveNow = hudEl.querySelector('#gsv-live');
    statEls.liveNowCard = hudEl.querySelector('#gs-live');
    statEls.topCountry = hudEl.querySelector('#gsv-top');
    statEls.topCountryCard = hudEl.querySelector('#gs-top');
    statEls.todayVisits = hudEl.querySelector('#gsv-today');
    statEls.todayVisitsCard = hudEl.querySelector('#gs-today');

    fetchGlobeStats();
    statsRefreshTimer = setInterval(() => { if (alive && !document.hidden) fetchGlobeStats(); }, 30000);

    // ── Supabase Realtime ──
    function showToast(city, country) {
      toastEl.textContent = '● ' + (city ? city + ', ' : '') + (country || 'New visitor');
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    if (window._sb && window._sb.channel) {
      realtimeChannel = window._sb.channel('globe-visits')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_visits' }, (payload) => {
          if (!alive) return;
          const row = payload.new;
          if (row.lat && row.lng) {
            addLocation(row.lat, row.lng, 0, true);
            showToast(row.city, row.country);
          }
          fetchGlobeStats();
        })
        .subscribe();
    }

    const newHint = document.createElement('div');
    newHint.className = 'viewer3d-hint';
    newHint.textContent = isMobile ? 'Drag · Pinch to zoom' : 'Drag to rotate · Scroll to zoom';
    container.appendChild(newHint);

    // ── Interaction ──
    let dragging = false, prevX = 0, prevY = 0;
    let rotY = -0.5, rotX = 0.15;
    let autoRot = true, autoTimer = null;

    const pDown = (x, y) => { dragging = true; prevX = x; prevY = y; autoRot = false; if (autoTimer) clearTimeout(autoTimer); };
    const pMove = (x, y) => {
      if (!dragging) return;
      rotY += (x - prevX) * 0.006;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + (y - prevY) * 0.006));
      prevX = x; prevY = y;
      Haptic.rotate();
    };
    const pUp = () => { dragging = false; autoTimer = setTimeout(() => { autoRot = true; }, 3000); };
    const onWindowMouseUp = () => pUp();

    renderer.domElement.addEventListener('mousedown', e => pDown(e.clientX, e.clientY));
    renderer.domElement.addEventListener('mousemove', e => pMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onWindowMouseUp);
    renderer.domElement.addEventListener('touchstart', e => { if (e.touches.length === 1) pDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    renderer.domElement.addEventListener('touchmove', e => { if (e.touches.length === 1) pMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    renderer.domElement.addEventListener('touchend', pUp, { passive: true });
    renderer.domElement.addEventListener('wheel', e => {
      camera.position.z = Math.max(2, Math.min(5.5, camera.position.z + e.deltaY * 0.003));
      Haptic.zoom();
    }, { passive: true });

    // ── Resize ──
    const onResize = () => {
      if (!alive) return;
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animate ──
    function animate() {
      if (!alive || !renderer.domElement.isConnected) { alive = false; return; }
      requestAnimationFrame(animate);
      if (document.hidden) return;

      if (autoRot) rotY += 0.002;
      group.rotation.y = rotY;
      group.rotation.x = rotX;

      const t = performance.now() * 0.003;
      ring.scale.setScalar(1 + Math.sin(t) * 0.3);
      ringMat.opacity = 0.3 + Math.sin(t) * 0.2;

      const now = performance.now();
      for (const a of arcData) {
        if (now - a.startTime < a.delay) continue;
        if (a.drawn < a.total) {
          a.drawn = Math.min(a.total, a.drawn + a.speed);
          a.geo.setDrawRange(0, Math.floor(a.drawn));
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // ── Cleanup ──
    window._v3dCleanup = () => {
      alive = false;
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('resize', onResize);
      if (autoTimer) clearTimeout(autoTimer);
      if (statsRefreshTimer) clearInterval(statsRefreshTimer);
      if (realtimeChannel && window._sb) {
        window._sb.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      disposables.forEach(d => d.dispose());
      globeGeo.dispose(); globeMat.dispose();
      gridGeo.dispose(); gridMat.dispose();
      atmosGeo.dispose(); atmosMat.dispose();
      atmos2Geo.dispose(); atmos2Mat.dispose();
      cairoDot.geometry.dispose(); cairoDot.material.dispose();
      ringGeo.dispose(); ringMat.dispose();
      renderer.dispose();
    };
  }

  // ═══════════════════════════════════════════════════
  // WIRE UP (ROBUST BADGE FINDER)
  // ═══════════════════════════════════════════════════
  function wireUp() {
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.book3d = () => { setTimeout(launchBookViewer, 300); return '📘 Launching...'; };
    window.TermCmds.datamesh = () => { setTimeout(launchDataMesh, 300); return '📊 Launching Live FinTech Visualizer...'; };
    window.TermCmds.visualizer = () => { setTimeout(launchDataMesh, 300); return '📊 Launching Live FinTech Visualizer...'; };
    window.TermCmds.globe = () => { setTimeout(launchGlobe, 300); return '🌐 Launching Global Reach Globe...'; };
    window.TermCmds.world = window.TermCmds.globe;

    const selectors = ['a.lk[href*="bilingual"]', 'a[href*="bilingual"]', 'a[href*="book"]'];
    let bookCard = null;
    for (const sel of selectors) {
      bookCard = document.querySelector(sel);
      if (bookCard) break;
    }

    const existingBadge = document.getElementById('badge3dPreview');
    if (existingBadge) {
      const freshBadge = existingBadge.cloneNode(true);
      freshBadge.addEventListener('mouseenter', () => { freshBadge.style.background = 'rgba(99,102,241,.2)'; freshBadge.style.color = '#fff'; });
      freshBadge.addEventListener('mouseleave', () => { freshBadge.style.background = 'rgba(99,102,241,.1)'; freshBadge.style.color = '#6366f1'; });
      freshBadge.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); launchBookViewer(); });
      existingBadge.replaceWith(freshBadge);
    } else if (bookCard) {
      
      const badge = document.createElement('span');
      badge.id = 'badge3dPreview';
      badge.style.cssText = `
        font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;
        text-transform:uppercase;padding:4px 8px;border-radius:100px;
        background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);
        color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;
        display:inline-flex;align-items:center;gap:4px;white-space:nowrap;
        position:relative;z-index:10;
      `;
      badge.innerHTML = '📦 3D PREVIEW';
      badge.addEventListener('mouseenter', () => { badge.style.background = 'rgba(99,102,241,.2)'; badge.style.color = '#fff'; });
      badge.addEventListener('mouseleave', () => { badge.style.background = 'rgba(99,102,241,.1)'; badge.style.color = '#6366f1'; });
      badge.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        launchBookViewer();
      });

      const sub = bookCard.querySelector('.lsu');
      if(sub) {
          sub.style.display='flex'; sub.style.flexDirection='column'; sub.style.alignItems='flex-start';
          sub.appendChild(badge);
      } else {
          bookCard.style.display='flex'; bookCard.style.flexDirection='column';
          bookCard.appendChild(badge);
      }
    } else {
      
    }
  }

  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  Object.defineProperty(window, '_llmReady', { get: () => _llmReady });

  function init() {
    create3DOverlay();
    initAskAmr();
    wireUp();
    console.log('%c🤖 Phase 4 Loaded', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
