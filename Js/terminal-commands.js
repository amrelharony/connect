// terminal-commands.js — AmrOS Terminal Command Registry
// All TermCmds in one place. To add a new OS feature, update this file.
(function() {
'use strict';

function _termEsc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
window._termEsc = _termEsc;

function _termAppend(html) { var b = document.getElementById('termBody'); if (b && html) { var safe = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html.replace(/\n/g, '<br>')) : html.replace(/\n/g, '<br>'); b.insertAdjacentHTML('beforeend', '<div class="term-line">' + safe + '</div>'); } }
window._termAppend = _termAppend;

var _noop = function(){};

// ═════════════════════════════════════════════════
// CORE COMMAND REGISTRY
// ═════════════════════════════════════════════════
var TermCmds = {
    fs: {
        '~': {
            'projects': {
                'book.txt': 'The Bilingual Executive: Bridging business & tech. Published 2026.',
                'community.txt': 'Fintech Bilinguals: 500+ members bridging the gap.',
                'data_mesh.log': 'Architecture impl at Banque Misr: SUCCESS.'
            },
            'certs': {
                'pmp.crt': 'PMP® Certified (Project Management Professional)',
                'cdmp.crt': 'DAMA Certified Data Management Professional',
                'safe.crt': 'SAFe® 6 Agilist'
            },
            'about.md': 'Delivery Lead & Scrum Master with 12+ years experience.',
            'contact.json': '{"email": "a.elharony@gmail.com", "linkedin": "/in/amrmelharony"}'
        }
    },

    _meta: {
        help:     { cat: 'SYSTEM', desc: 'Show all commands', usage: 'help [command]' },
        whoami:   { cat: 'SYSTEM', desc: 'About Amr' },
        resume:   { cat: 'SYSTEM', desc: 'Quick resume summary' },
        stack:    { cat: 'SYSTEM', desc: 'Tech stack' },
        neofetch: { cat: 'SYSTEM', desc: 'System information' },
        uptime:   { cat: 'SYSTEM', desc: 'Session uptime' },
        xp:       { cat: 'SYSTEM', desc: 'Show XP and level' },
        clear:    { cat: 'SYSTEM', desc: 'Clear terminal output' },
        exit:     { cat: 'SYSTEM', desc: 'Close terminal' },
        ls:       { cat: 'FILES', desc: 'List directory contents' },
        cd:       { cat: 'FILES', desc: 'Change directory', usage: 'cd [dir|..|~]' },
        cat:      { cat: 'FILES', desc: 'Read file contents', usage: 'cat <file>' },
        theme:    { cat: 'VIEW', desc: 'Toggle dark/light mode' },
        zen:      { cat: 'VIEW', desc: 'Toggle Zen Mode' },
        matrix:   { cat: 'VIEW', desc: 'Matrix rain effect' },
        weather:  { cat: 'VIEW', desc: 'Cairo weather' },
        mood:     { cat: 'VIEW', desc: 'Current site mood' },
        goto:     { cat: 'NAV', desc: 'Scroll to section', usage: 'goto <section>' },
        top:      { cat: 'NAV', desc: 'Scroll to top' },
        bottom:   { cat: 'NAV', desc: 'Scroll to bottom' },
        timeline: { cat: 'NAV', desc: 'Scroll to timeline' },
        arcade:   { cat: 'APPS', desc: 'Launch arcade games' },
        wall:     { cat: 'APPS', desc: 'Open guestbook' },
        trophies: { cat: 'APPS', desc: 'Open trophy case' },
        search:   { cat: 'APPS', desc: 'Command palette' },
        book3d:   { cat: 'APPS', desc: '3D book viewer' },
        globe:    { cat: 'APPS', desc: 'Global visitor globe' },
        visualizer:{cat: 'APPS', desc: 'FinTech trade visualizer' },
        ask:      { cat: 'AI', desc: 'Chat with AI assistant', usage: 'ask <question>' },
        llm:      { cat: 'AI', desc: 'Local LLM status' },
        'llm-load':{ cat: 'AI', desc: 'Download local AI model' },
        'llm-off': { cat: 'AI', desc: 'Disable local LLM' },
        'llm-on':  { cat: 'AI', desc: 'Enable local LLM' },
        voice:    { cat: 'AI', desc: 'Toggle voice navigation' },
        audio:    { cat: 'AI', desc: 'Toggle spatial audio', usage: 'audio [on|off]' },
        spatial:  { cat: 'AI', desc: 'Toggle gesture & face navigation' },
        intro:    { cat: 'APPS', desc: 'Preview SVG data intro', usage: 'intro [phase] [atmo]' },
        linkedin: { cat: 'LINKS', desc: 'Open LinkedIn profile' },
        calendar: { cat: 'LINKS', desc: 'Book a meeting' },
        book:     { cat: 'LINKS', desc: 'Open The Bilingual Executive' },
        mentor:   { cat: 'LINKS', desc: 'Book mentoring session' },
        community:{ cat: 'LINKS', desc: 'Open Fintech Bilinguals' },
        broadcast:{ cat: 'SOCIAL', desc: 'Broadcast to visitors', usage: 'broadcast <msg>' },
        engage:   { cat: 'SOCIAL', desc: 'Co-op puzzle', usage: 'engage lock 1|2' },
        reset:    { cat: 'SYSTEM', desc: 'Reset all progress' },
    },

    _aliases: {
        play: 'arcade', guestbook: 'wall', find: 'search',
        admin: 'trophies', stats: 'trophies', progress: 'trophies', achievements: 'trophies',
        sound: 'audio', amr: 'ask',
        datamesh: 'visualizer', world: 'globe',
        'spatial-nav': 'spatial', 'voice-help': 'voice',
        scores: 'trophies',
    },

    getDir: function(path) {
        var d = this.fs['~'];
        for (var i = 1; i < path.length; i++) { if (d[path[i]] && typeof d[path[i]] === 'object') d = d[path[i]]; else break; }
        return d;
    },

    ls: function(args, tab) {
        var dir = this.getDir(tab.path);
        return Object.keys(dir).map(function(k) {
            var isDir = typeof dir[k] === 'object';
            return '<span class="' + (isDir ? 'term-cyan' : 'term-white') + '" style="font-weight:' + (isDir ? 'bold' : 'normal') + '">' + (isDir ? '📁' : '📄') + ' ' + k + '</span>';
        }).join('&nbsp;&nbsp;&nbsp;');
    },

    cd: function(args, tab) {
        var t = (args || '').trim();
        if (!t || t === '~') { tab.path = ['~']; return ''; }
        if (t === '..') { if (tab.path.length > 1) tab.path.pop(); return ''; }
        var dir = this.getDir(tab.path);
        if (dir[t] && typeof dir[t] === 'object') { tab.path.push(t); return ''; }
        return '<span class="term-red">cd: ' + _termEsc(t) + ': No such directory</span>';
    },

    cat: function(args, tab) {
        var t = (args || '').trim();
        var dir = this.getDir(tab.path);
        if (dir[t] && typeof dir[t] === 'string') return '<span class="term-white">' + _termEsc(dir[t]) + '</span>';
        return '<span class="term-red">cat: ' + _termEsc(t) + ': Cannot open file</span>';
    },

    neofetch: function() { return '\n<span class="term-cyan">       /\\       </span>  <span class="term-green">amr@v5</span>\n<span class="term-cyan">      /  \\      </span>  <span class="term-gray">─────────────</span>\n<span class="term-cyan">     / /\\ \\     </span>  <span class="term-cyan">OS</span>: AmrOS v5.0 (Ultra)\n<span class="term-cyan">    / /  \\ \\    </span>  <span class="term-cyan">Uptime</span>: ' + Math.floor(performance.now()/60000) + 'm\n<span class="term-cyan">   / /    \\ \\   </span>  <span class="term-cyan">Shell</span>: AmrSH 2.0\n<span class="term-cyan"> /_/        \\_\\ </span>  <span class="term-cyan">AI</span>: ' + (window._llmReady ? '<span class="term-green">Sentient</span>' : '<span class="term-gray">Keyword</span>'); },

    help: function(args) {
        var t = (args || '').trim().toLowerCase();
        if (t && this._meta[t]) {
            var m = this._meta[t];
            return '<span class="term-cyan">' + t + '</span> — ' + m.desc + (m.usage ? '<br><span class="term-gray">Usage: ' + m.usage + '</span>' : '');
        }
        var groups = {};
        for (var cmd in this._meta) {
            if (!this._meta.hasOwnProperty(cmd)) continue;
            if (this._aliases[cmd]) continue;
            var m2 = this._meta[cmd];
            (groups[m2.cat] = groups[m2.cat] || []).push(cmd);
        }
        var html = '<div class="term-help-grid">';
        var cats = ['SYSTEM','FILES','VIEW','NAV','APPS','AI','LINKS','SOCIAL'];
        for (var ci = 0; ci < cats.length; ci++) {
            var cat = cats[ci];
            if (!groups[cat]) continue;
            html += '<span class="term-help-cat">' + cat + '</span>';
            for (var j = 0; j < groups[cat].length; j++) {
                var c = groups[cat][j];
                html += '<span class="term-help-cmd">' + c + '</span><span class="term-help-desc">' + this._meta[c].desc + '</span>';
            }
        }
        return html + '</div>';
    },

    clear: function() { return '__CLEAR__'; },
    arcade: function() { if(window._openArcade) window._openArcade(); return '<span class="term-green">🕹️ Launching arcade...</span>'; },
    wall: function() { if(window.openGuestbook) window.openGuestbook(); return '<span class="term-green">🌍 Opening guestbook...</span>'; },
    search: function() { if(window._openPalette) window._openPalette(); return '<span class="term-green">⌨️ Opening palette...</span>'; },
    weather: function() {
        var w;try{w=JSON.parse(localStorage.getItem('cairoWeather')||'{}');}catch(e){w={};}
        var d=w.data||{};
        var temp=typeof d.temp==='number'?Math.round(d.temp)+'°C':'--°C';
        var codeNames={'0':'Clear sky','1':'Mainly clear','2':'Partly cloudy','3':'Overcast','45':'Fog','48':'Rime fog','51':'Light drizzle','53':'Drizzle','55':'Heavy drizzle','56':'Freezing drizzle','57':'Heavy freezing drizzle','61':'Light rain','63':'Rain','65':'Heavy rain','66':'Freezing rain','67':'Heavy freezing rain','71':'Light snow','73':'Snow','75':'Heavy snow','77':'Snow grains','80':'Light showers','81':'Showers','82':'Heavy showers','85':'Snow showers','86':'Heavy snow showers','95':'Thunderstorm','96':'Thunderstorm + hail','99':'Heavy thunderstorm + hail'};
        var sky=codeNames[String(d.code)]||'Unknown';
        var mood=window._emotionEngine?window._emotionEngine.getMood():{mood:'--',source:'--'};
        var moodStr=mood.source==='weather'?mood.mood:'--';
        var dayNight=d.isDay?'☀ Day':'🌙 Night';
        return '<span class="term-cyan">📍 Cairo</span> · '+temp+' · '+sky+' · '+dayNight+'\n<span class="term-gray">Mood:</span> '+moodStr;
    },
    theme: function() {
        var n = document.body.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', n); if(window._lakePref) window._lakePref('theme',n);
        if(window._applyTheme) window._applyTheme(n);
        return n === 'light'
          ? '<span class="term-green">☀️ Switched to light mode</span>'
          : '<span class="term-green">🌙 Switched to dark mode</span>';
    },
    exit: function() { window.closeTerm(); return ''; },

    newtab: function() { return window._termTabMgr ? window._termTabMgr.addTab() : ''; },
    closetab: function() { return window._termTabMgr ? window._termTabMgr.closeTab() : ''; },
    rename: function(args) { return window._termTabMgr ? window._termTabMgr.renameTab(args) : ''; },
    tabs: function() {
        if (!window._termTabMgr) return '';
        return window._termTabMgr.tabs.map(function(t, i) {
            return '<span class="' + (t.id === window._termTabMgr.activeId ? 'term-cyan' : 'term-gray') + '">' + (i+1) + '. ' + t.title + (t.id === window._termTabMgr.activeId ? ' ◀' : '') + '</span>';
        }).join('<br>');
    },
    alias: function() {
        return Object.entries(TermCmds._aliases).map(function(e) { return '<span class="term-gray">' + e[0] + '</span> → <span class="term-cyan">' + e[1] + '</span>'; }).join('<br>');
    },

    whoami: function() { return '<span class="term-cyan">Amr Elharony</span>\nDelivery Lead · Scrum Master · FinTech Author & Speaker\n12+ years in banking · DBA · MBA · 20+ certifications\n<span class="term-gray">Cairo, Egypt · Banque Misr</span>'; },

    resume: function() { return '<span class="term-cyan">═ Resume Summary ═</span>\n<span class="term-green">Role:</span> Delivery Lead & Scrum Master @ Banque Misr\n<span class="term-green">Experience:</span> 12+ years in banking & fintech\n<span class="term-green">Education:</span> DBA (Digital Transformation) · MBA · BA\n<span class="term-green">Certs:</span> PMP® · CDMP · SAFe® 6 · 20+ more\n<span class="term-green">Book:</span> The Bilingual Executive\n<span class="term-green">Mentoring:</span> 2,300+ mins on ADPList\n<span class="term-gray">Type "linkedin" or "calendar" to connect</span>'; },

    stack: function() { return '<span class="term-cyan">═ Tech Stack ═</span>\n<span class="term-green">Delivery:</span> Scrum · SAFe · Kanban · Jira · Azure DevOps\n<span class="term-green">Data:</span> Data Mesh · SQL · Power BI · Tableau · Python\n<span class="term-green">Banking:</span> Core Banking · Temenos · SWIFT · AML/KYC\n<span class="term-green">Cloud:</span> Azure · AWS · Docker · CI/CD\n<span class="term-green">Web:</span> HTML/CSS/JS · React · Node.js'; },

    uptime: function() {
        var s = Math.floor(performance.now() / 1000);
        var m = Math.floor(s / 60);
        var h = Math.floor(m / 60);
        return '<span class="term-cyan">Session:</span> ' + (h > 0 ? h + 'h ' : '') + (m % 60) + 'm ' + (s % 60) + 's';
    },

    scores: function() {
        if (window._game) { setTimeout(function() { window._game.openCase('achievements'); }, 200); return '<span class="term-green">🏆 Opening Trophy Case...</span>'; }
        return '<span class="term-gray">No scores yet — play some arcade games!</span>';
    },

    goto: function(args) {
        var sec = (args || '').trim().toLowerCase();
        var selMap = { timeline: '.tl-wrap', certs: '#certGrid', testimonials: '.tc-section', conferences: '.conf-strip', articles: '#linkedinFeed', impact: '.imp', hero: '.pf', contact: '#contactSecret' };
        if (!sec) return '<span class="term-gray">Usage: goto &lt;section&gt;</span>\n<span class="term-gray">Sections: ' + Object.keys(selMap).join(', ') + '</span>';
        var sel = selMap[sec];
        if (!sel) return '<span class="term-red">Unknown section "' + _termEsc(sec) + '"</span>\n<span class="term-gray">Available: ' + Object.keys(selMap).join(', ') + '</span>';
        var el = document.querySelector(sel);
        if (el) { setTimeout(function() { window.closeTerm(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200); }
        return '<span class="term-green">→ Scrolling to ' + sec + '...</span>';
    },

    top: function() { setTimeout(function() { window.closeTerm(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 200); return '<span class="term-green">↑ Scrolling to top...</span>'; },

    bottom: function() { setTimeout(function() { window.closeTerm(); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }, 200); return '<span class="term-green">↓ Scrolling to bottom...</span>'; },

    linkedin: function() { window.open('https://www.linkedin.com/in/amrmelharony', '_blank'); return '<span class="term-green">🔗 Opening LinkedIn...</span>'; },

    calendar: function() { window.open('https://adplist.org/mentors/amr-elharony', '_blank'); return '<span class="term-green">📅 Opening booking page...</span>'; },

    book: function() { window.open('https://bilingualexecutive.amrelharony.com/', '_blank'); return '<span class="term-green">📘 Opening The Bilingual Executive...</span>'; },

    mentor: function() { window.open('https://adplist.org/mentors/amr-elharony', '_blank'); return '<span class="term-green">🎓 Opening ADPList mentoring...</span>'; },

    community: function() { window.open('https://www.linkedin.com/company/fintech-bilinguals/', '_blank'); return '<span class="term-green">🤝 Opening Fintech Bilinguals...</span>'; },

    matrix: function() {
        var c = document.getElementById('bgC');
        if (!c) return '<span class="term-gray">Matrix effect unavailable</span>';
        document.body.classList.toggle('matrix-mode');
        var on = document.body.classList.contains('matrix-mode');
        return on ? '<span class="term-green">🟩 Matrix rain activated</span>' : '<span class="term-gray">Matrix rain deactivated</span>';
    },

    zen: function() {
        if (typeof window._toggleZen === 'function') { window._toggleZen(); return '<span class="term-green">🧘 Zen Mode toggled</span>'; }
        document.body.classList.toggle('zen-mode');
        return document.body.classList.contains('zen-mode') ? '<span class="term-green">🧘 Zen Mode on — press Z to exit</span>' : '<span class="term-gray">Zen Mode off</span>';
    },

    reset: function() {
        if (!confirm('Reset all progress? This clears XP, trophies, and settings.')) return '<span class="term-gray">Cancelled.</span>';
        localStorage.clear();
        return '<span class="term-red">⚠️ All progress reset. Refresh to see changes.</span>';
    },
};

window.TermCmds = TermCmds;

// ═════════════════════════════════════════════════
// LAZY-LOADED STUB COMMANDS
// These reference lazy-loader functions defined in site.js at global scope.
// ═════════════════════════════════════════════════

// — Arcade —
var _stubPlay = function(arg){ window._loadArcade().then(function(){ if(window.TermCmds.play!==_stubPlay){var o=window.TermCmds.play(arg);_termAppend(o);} }).catch(_noop); return '<span class="term-green">Loading Arcade...</span>'; };
TermCmds.play = _stubPlay;
TermCmds.arcade = TermCmds.play;

// — AI / 3D —
var _stubAsk=function(args){loadChatbot().then(function(){if(window.TermCmds.ask!==_stubAsk){var o=window.TermCmds.ask(args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds.ask=_stubAsk;
var _stubAmr=function(args){loadChatbot().then(function(){if(window.TermCmds.amr!==_stubAmr){var o=window.TermCmds.amr(args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds.amr=_stubAmr;
var _stubBook3d=function(){loadBook3D().then(function(){if(window.TermCmds.book3d!==_stubBook3d)window.TermCmds.book3d();}).catch(_noop);return '<span class="term-green">Loading 3D...</span>';};
TermCmds.book3d=_stubBook3d;
var _stubVisualizer=function(){loadDataMesh().then(function(){if(window.TermCmds.visualizer!==_stubVisualizer)window.TermCmds.visualizer();}).catch(_noop);return '<span class="term-green">Loading Visualizer...</span>';};
TermCmds.visualizer=_stubVisualizer;
TermCmds.datamesh=TermCmds.visualizer;
var _stubGlobe=function(){loadGlobe().then(function(){if(window.TermCmds.globe!==_stubGlobe)window.TermCmds.globe();}).catch(_noop);return '<span class="term-green">Loading Globe...</span>';};
TermCmds.globe=_stubGlobe;
TermCmds.world=TermCmds.globe;
var _stubLlm=function(args){loadChatbot().then(function(){if(window.TermCmds.llm!==_stubLlm){var o=window.TermCmds.llm(args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds.llm=_stubLlm;
var _stubLlmLoad=function(args){loadChatbot().then(function(){if(window.TermCmds['llm-load']!==_stubLlmLoad){var o=window.TermCmds['llm-load'](args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds['llm-load']=_stubLlmLoad;
var _stubLlmOff=function(args){loadChatbot().then(function(){if(window.TermCmds['llm-off']!==_stubLlmOff){var o=window.TermCmds['llm-off'](args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds['llm-off']=_stubLlmOff;
var _stubLlmOn=function(args){loadChatbot().then(function(){if(window.TermCmds['llm-on']!==_stubLlmOn){var o=window.TermCmds['llm-on'](args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
TermCmds['llm-on']=_stubLlmOn;

// — VoIP —
TermCmds['voice-call']=function(args){
  var nick=(args||'').trim();
  if(!nick)return '<span class="term-gray">Usage: voice-call &lt;nickname&gt;</span>';
  window._loadVoIP().then(function(){
    if(!window._voip)return;
    var peers=window._presenceEngine?window._presenceEngine.peers:{};
    for(var pid in peers){
      if(!peers.hasOwnProperty(pid))continue;
      var p=(peers[pid][0]||{});
      if(p.nickname&&p.nickname.toLowerCase()===nick.toLowerCase()){
        window._voip.call(pid);
        _termAppend('<span class="term-green">📞 Calling '+_termEsc(p.nickname)+'...</span>');
        return;
      }
    }
    _termAppend('<span class="term-red">User "'+_termEsc(nick)+'" not found online</span>');
  }).catch(function(){_termAppend('<span class="term-red">Failed to load VoIP module</span>');});
  return '<span class="term-green">🎙️ Loading Spatial VoIP...</span>';
};
TermCmds['voice-hangup']=function(){
  if(window._voip){window._voip.hangupAll();return '<span class="term-green">📴 All voice calls ended</span>';}
  return '<span class="term-gray">No active calls</span>';
};
TermCmds['voice-mute']=function(){
  if(window._voip){var m=!window._voip.isMuted();window._voip.setMuted(m);return '<span class="term-green">'+(m?'🔇 Muted':'🎤 Unmuted')+'</span>';}
  return '<span class="term-gray">No active calls</span>';
};
TermCmds['voip-status']=function(){
  var lines=[];
  lines.push('<span class="term-cyan">═══ VoIP Diagnostics ═══</span>');
  lines.push('<span class="term-white">Supabase (_sb):</span>       '+(window._sb?'<span class="term-green">✓ Connected</span>':'<span class="term-red">✕ Not available</span>'));
  lines.push('<span class="term-white">Presence Engine:</span>      '+(window._presenceEngine?'<span class="term-green">✓ Running</span>':'<span class="term-red">✕ Not loaded</span>'));
  if(window._presenceEngine){lines.push('<span class="term-white">  Your ID:</span>            <span class="term-cyan">'+window._presenceEngine.myId.slice(0,8)+'</span> ('+window._presenceEngine.myNickname+')');}
  var peerCount=window._presenceEngine?Object.keys(window._presenceEngine.peers).length-1:0;
  lines.push('<span class="term-white">Online Peers:</span>         '+(peerCount>0?'<span class="term-green">'+peerCount+' peer(s)</span>':'<span class="term-yellow">0 — open another tab to test</span>'));
  if(window._presenceEngine&&peerCount>0){var pe=window._presenceEngine.peers;var myId=window._presenceEngine.myId;for(var k in pe){if(k===myId)continue;var p=(pe[k][0]||{});lines.push('    <span class="term-gray">'+k.slice(0,8)+'</span> → '+(p.nickname||'Anon')+' ('+( window._mesh&&window._mesh.isConnected(k)?'<span class="term-green">mesh ✓</span>':'<span class="term-red">no mesh</span>')+')');}}
  lines.push('<span class="term-white">Mesh (_mesh):</span>         '+(window._mesh?'<span class="term-green">✓ Loaded ('+window._mesh.getOpenCount()+' connected)</span>':'<span class="term-red">✕ Not loaded</span>'));
  lines.push('<span class="term-white">VoIP (_voip):</span>         '+(window._voip?'<span class="term-green">✓ Loaded</span>':'<span class="term-yellow">⏳ Not loaded yet</span>'));
  if(window._voip){var calls=window._voip.getActiveCalls();lines.push('<span class="term-white">  Active Calls:</span>       '+(calls.size>0?'<span class="term-green">'+calls.size+' call(s)</span>':'<span class="term-gray">None</span>'));lines.push('<span class="term-white">  Muted:</span>              '+(window._voip.isMuted()?'<span class="term-yellow">Yes</span>':'<span class="term-green">No</span>'));}
  lines.push('<span class="term-white">Spatial Audio:</span>        '+(window._spatialAudio?'<span class="term-green">✓ '+(window._spatialAudio.isEnabled()?'Enabled':'Disabled')+'</span>':'<span class="term-red">✕ Not loaded</span>'));
  lines.push('');
  if(!window._mesh||window._mesh.getOpenCount()===0){lines.push('<span class="term-yellow">⚠ No mesh connections. Open a 2nd browser tab to create a peer.</span>');}
  else if(!window._voip){lines.push('<span class="term-cyan">💡 Run: voice-call &lt;nickname&gt; to load VoIP and start a call</span>');}
  else{lines.push('<span class="term-green">✓ VoIP ready. Click a peer avatar → Voice Call, or use: voice-call &lt;name&gt;</span>');}
  return lines.join('\n');
};

// — Spatial Nav —
TermCmds.spatial=function(){loadSpatial().then(function(){if(window._isSpatialActive&&window._isSpatialActive()){window._closeSpatialNav();_termAppend('<span class="term-gray">🖐️ Spatial Nav deactivated</span>');}else{_termAppend('<span class="term-green">🖐️ Starting Spatial Nav — grant camera access when prompted</span>');window._toggleSpatialNav();}}).catch(_noop);return '<span class="term-green">Loading Spatial Nav...</span>';};
TermCmds['spatial-nav']=TermCmds.spatial;

// — Intro —
TermCmds.intro=function(args){
  if(!window._dataIntro){return '<span class="term-red">Data intro engine not loaded</span>';}
  var parts=(args||'').trim().split(/\s+/);
  var phases=['morning','midday','dusk','night'];
  var atmos=['clear','cloud','rain','storm'];
  var phase=phases.indexOf(parts[0])>=0?parts[0]:null;
  var atmo=atmos.indexOf(parts[1])>=0?parts[1]:null;
  if(!phase){var h=window._dataIntro.getCairoHour();phase=window._dataIntro.getPhase(h);}
  if(!atmo){var wd=window._weatherData||{};atmo=window._dataIntro.getAtmosphere(wd.code);}
  var wd2=window._weatherData||{};
  window._dataIntro.preview(phase,atmo,wd2.temp,wd2.wind);
  return '<span class="term-green">Playing intro: '+phase+' × '+atmo+'</span>\n<span class="term-gray">Usage: intro [morning|midday|dusk|night] [clear|cloud|rain|storm]</span>';
};

// — Mood —
TermCmds.mood=function(){
  if(!window._emotionEngine){return '<span class="term-gray">Mood engine loading...</span>';}
  var m=window._emotionEngine.getMood();
  var srcLabel=m.source==='face'?'👁 webcam':'☀ weather';
  return '<span class="term-cyan">Mood:</span> '+m.mood+' <span class="term-gray">('+srcLabel+', '+Math.round(m.confidence*100)+'% confidence)</span>';
};

// — Audio (spatial audio toggle) —
TermCmds.audio = function(args) {
    var arg = (args || '').trim().toLowerCase();
    if (arg === 'on') {
      window._spatialAudio.toggle(true);
      if (window._syncAudioBtn) window._syncAudioBtn(true);
      return '<span class="term-green">🔊 Spatial audio enabled</span>';
    }
    if (arg === 'off') {
      window._spatialAudio.toggle(false);
      if (window._syncAudioBtn) window._syncAudioBtn(false);
      return '<span class="term-gray">🔇 Spatial audio disabled</span>';
    }
    var state = window._spatialAudio.toggle();
    if (window._syncAudioBtn) window._syncAudioBtn(state);
    return state
      ? '<span class="term-green">🔊 Spatial audio enabled</span>'
      : '<span class="term-gray">🔇 Spatial audio disabled</span>';
};
TermCmds.sound = TermCmds.audio;

})();
