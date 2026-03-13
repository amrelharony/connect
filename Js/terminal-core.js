// terminal-core.js — AmrOS Terminal UI Engine
// Tab manager, fuzzy autocomplete, status bar, boot sequence, input handler.
(function() {
'use strict';

var _termEsc = window._termEsc;
var TermCmds = window.TermCmds;

// ── Tab Manager ──
var _termTabMgr = {
    tabs: [],
    activeId: null,
    nextId: 1,
    maxTabs: 5,

    init: function() {
        this.addTab(true);
        document.getElementById('termTabAdd').addEventListener('click', function() { _termTabMgr.addTab(); });
    },

    _makeTab: function() {
        var id = this.nextId++;
        return { id: id, title: 'Tab ' + id, bodyHTML: '', history: [], histIdx: -1, path: ['~'] };
    },

    addTab: function(silent) {
        if (this.tabs.length >= this.maxTabs) return '<span class="term-warn">Max ' + this.maxTabs + ' tabs</span>';
        var tab = this._makeTab();
        this.tabs.push(tab);
        this.switchTab(tab.id, silent);
        this._renderTabs();
        if (!silent && window._haptic) window._haptic.tap();
        if (!silent) return '<span class="term-green">Opened ' + tab.title + '</span>';
        return '';
    },

    closeTab: function() {
        if (this.tabs.length <= 1) return '<span class="term-warn">Cannot close last tab</span>';
        var idx = this.tabs.findIndex(function(t) { return t.id === _termTabMgr.activeId; });
        this.tabs.splice(idx, 1);
        var next = this.tabs[Math.min(idx, this.tabs.length - 1)];
        this.switchTab(next.id);
        this._renderTabs();
        return '<span class="term-green">Tab closed</span>';
    },

    renameTab: function(name) {
        var n = (name || '').trim();
        if (!n) return '<span class="term-warn">Usage: rename &lt;name&gt;</span>';
        var tab = this.getActive();
        if (tab) { tab.title = n; this._renderTabs(); }
        return '<span class="term-green">Renamed to ' + _termEsc(n) + '</span>';
    },

    getActive: function() { return this.tabs.find(function(t) { return t.id === _termTabMgr.activeId; }); },

    switchTab: function(id, silent) {
        var prev = this.getActive();
        var body = document.getElementById('termBody');
        if (prev) prev.bodyHTML = body.innerHTML;
        this.activeId = id;
        var next = this.getActive();
        if (next) {
            body.innerHTML = next.bodyHTML;
            body.scrollTop = body.scrollHeight;
        }
        this._renderTabs();
        _termUpdateStatus();
    },

    _renderTabs: function() {
        var self = this;
        var container = document.getElementById('termTabs');
        if (!container) return;
        container.innerHTML = this.tabs.map(function(t) {
            return '<div class="term-tab' + (t.id === self.activeId ? ' active' : '') + '" data-tid="' + t.id + '">' +
            '<span>' + _termEsc(t.title) + '</span>' +
            (self.tabs.length > 1 ? '<span class="term-tab-close" data-tclose="' + t.id + '">×</span>' : '') +
            '</div>';
        }).join('');
        container.querySelectorAll('.term-tab').forEach(function(el) {
            el.addEventListener('click', function(e) {
                if (e.target.dataset.tclose) {
                    var cur = self.getActive();
                    if (cur) cur.bodyHTML = document.getElementById('termBody').innerHTML;
                    self.activeId = parseInt(e.target.dataset.tclose);
                    self.closeTab();
                    return;
                }
                self.switchTab(parseInt(el.dataset.tid));
            });
        });
        var tsEl = document.getElementById('tsTabs');
        if (tsEl) {
            var idx = this.tabs.findIndex(function(t) { return t.id === self.activeId; }) + 1;
            tsEl.textContent = idx + '/' + this.tabs.length;
        }
    }
};
window._termTabMgr = _termTabMgr;

// ── Autocomplete Engine ──
function _termFuzzy(input, candidate) {
    var lower = candidate.toLowerCase();
    var inp = input.toLowerCase();
    if (!inp) return { match: false, score: 0 };
    if (lower.startsWith(inp)) return { match: true, score: 100 - candidate.length };
    if (lower.indexOf(inp) >= 0) return { match: true, score: 50 - candidate.length };
    var si = 0;
    for (var ci = 0; ci < lower.length && si < inp.length; ci++) {
        if (lower[ci] === inp[si]) si++;
    }
    if (si === inp.length) return { match: true, score: 20 - candidate.length };
    return { match: false, score: 0 };
}

function _termGetSuggestions(input) {
    if (!input) return [];
    var parts = input.split(' ');
    var prefix = parts[0].toLowerCase();
    if (parts.length > 1) return [];
    var results = [];
    var seen = {};
    var meta = TermCmds._meta;
    for (var cmd in meta) {
        if (!meta.hasOwnProperty(cmd)) continue;
        if (seen[cmd]) continue;
        var f = _termFuzzy(prefix, cmd);
        if (f.match) {
            seen[cmd] = true;
            results.push({ cmd: cmd, desc: meta[cmd].desc, score: f.score });
        }
    }
    results.sort(function(a, b) { return b.score - a.score; });
    return results.slice(0, 6);
}

var _suggestIdx = -1;
var _currentSuggestions = [];

function _termShowSuggest(input) {
    var el = document.getElementById('termSuggest');
    var ghost = document.getElementById('termGhost');
    if (!el) return;
    _currentSuggestions = _termGetSuggestions(input);
    _suggestIdx = -1;
    if (_currentSuggestions.length === 0 || !input) {
        el.classList.remove('show');
        if (ghost) ghost.textContent = '';
        return;
    }
    el.innerHTML = _currentSuggestions.map(function(s, i) {
        return '<div class="term-suggest-item' + (i === _suggestIdx ? ' active' : '') + '" data-idx="' + i + '">' +
        '<span class="term-suggest-cmd">' + s.cmd + '</span>' +
        '<span class="term-suggest-desc">' + s.desc + '</span></div>';
    }).join('');
    el.classList.add('show');
    el.querySelectorAll('.term-suggest-item').forEach(function(item) {
        item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            var idx = parseInt(item.dataset.idx);
            var inp = document.getElementById('termInput');
            inp.value = _currentSuggestions[idx].cmd + ' ';
            el.classList.remove('show');
            if (ghost) ghost.textContent = '';
            if (window._haptic) window._haptic.tap();
            inp.focus();
        });
    });
    if (ghost && _currentSuggestions.length > 0) {
        var top = _currentSuggestions[0].cmd;
        if (top.toLowerCase().startsWith(input.toLowerCase())) {
            ghost.textContent = input + top.slice(input.length);
        } else {
            ghost.textContent = '';
        }
    }
}

function _termSuggestNav(dir) {
    if (_currentSuggestions.length === 0) return false;
    _suggestIdx += dir;
    if (_suggestIdx < -1) _suggestIdx = _currentSuggestions.length - 1;
    if (_suggestIdx >= _currentSuggestions.length) _suggestIdx = -1;
    var el = document.getElementById('termSuggest');
    if (!el) return false;
    el.querySelectorAll('.term-suggest-item').forEach(function(item, i) {
        item.classList.toggle('active', i === _suggestIdx);
    });
    return true;
}

function _termAcceptSuggest() {
    var inp = document.getElementById('termInput');
    var ghost = document.getElementById('termGhost');
    if (_suggestIdx >= 0 && _suggestIdx < _currentSuggestions.length) {
        inp.value = _currentSuggestions[_suggestIdx].cmd + ' ';
    } else if (_currentSuggestions.length > 0) {
        var top = _currentSuggestions[0].cmd;
        if (top.toLowerCase().startsWith(inp.value.toLowerCase())) {
            inp.value = top + ' ';
        }
    }
    document.getElementById('termSuggest').classList.remove('show');
    if (ghost) ghost.textContent = '';
    _currentSuggestions = [];
    _suggestIdx = -1;
}

// ── Status Bar ──
var _termUptimeTimer = null;
function _termUpdateStatus() {
    var tab = _termTabMgr.getActive();
    var tsPath = document.getElementById('tsPath');
    var tsAI = document.getElementById('tsAI');
    if (tsPath && tab) {
        tsPath.textContent = tab.path.length === 1 ? '~' : '~/' + tab.path.slice(1).join('/');
    }
    if (tsAI) {
        var isAI = window._llmReady;
        var cls = isAI ? 'ai' : 'kb';
        var txt = isAI ? 'AI' : 'KB';
        tsAI.innerHTML = '<span class="term-status-badge ' + cls + '">' + txt + '</span>';
    }
}

function _termStartUptime() {
    if (_termUptimeTimer) return;
    var start = performance.now();
    _termUptimeTimer = setInterval(function() {
        var el = document.getElementById('tsUptime');
        if (!el) return;
        var s = Math.floor((performance.now() - start) / 1000);
        el.textContent = Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    }, 1000);
}

// ── Boot Sequence ──
function _termBoot(body) {
    var lines = [
        { text: '<span class="term-gray">[kernel]</span> AmrOS v5.0 Ultra initializing...', delay: 0 },
        { text: '<span class="term-gray">[modules]</span> Loaded: fs, net, ai, render, haptic', delay: 120 },
        { text: '<span class="term-gray">[gpu]</span> Glassmorphism compositor active', delay: 200 },
        { text: '<span class="term-green">✔ AmrOS v5.0 ' + (window._llmReady ? '— Sentient Mode (local AI)' : 'Ultra Kernel Ready') + '</span>', delay: 350 },
        { text: '<span class="term-gray">Type <span class="term-cyan">help</span> for commands · <span class="term-cyan">Tab</span> to autocomplete</span>', delay: 450 },
    ];
    body.innerHTML = '';
    lines.forEach(function(l) {
        setTimeout(function() {
            if (!body.isConnected) return;
            body.insertAdjacentHTML('beforeend', '<div class="term-line">' + l.text + '</div>');
            body.scrollTop = body.scrollHeight;
        }, l.delay);
    });
}

// ── Terminal Open / Close ──
window.openTerm = function() {
    var tEl = document.getElementById('termOverlay'); if (!tEl) return;
    tEl.classList.add('show');
    if(window._haptic)window._haptic.menuOpen();
    if(window._game)window._game.unlock('terminal_used');
    if (_termTabMgr.tabs.length === 0) _termTabMgr.init();
    var body = document.getElementById('termBody');
    var tab = _termTabMgr.getActive();
    if (tab && !tab.bodyHTML) _termBoot(body);
    _termStartUptime();
    _termUpdateStatus();
    if (window._onTermOpen) window._onTermOpen();
    setTimeout(function() { document.getElementById('termInput').focus(); }, 350);
    if(window._trapFocus) window._trapFocus('termOverlay');
    if(window.autoDismiss) window.autoDismiss('termOverlay', window.closeTerm);
};

window.closeTerm = function() {
    var el = document.getElementById('termOverlay');
    if (el) el.classList.remove('show');
    if(window._haptic)window._haptic.menuClose();
    if(window._releaseFocus) window._releaseFocus('termOverlay');
    if(window.cancelAutoDismiss) window.cancelAutoDismiss('termOverlay');
    if (_termUptimeTimer) { clearInterval(_termUptimeTimer); _termUptimeTimer = null; }
    var tab = _termTabMgr.getActive();
    if (tab) tab.bodyHTML = document.getElementById('termBody').innerHTML;
    document.getElementById('termSuggest').classList.remove('show');
    var ghost = document.getElementById('termGhost');
    if (ghost) ghost.textContent = '';
};

// ── Input Handler ──
var inputField = document.getElementById('termInput');
if(!inputField){console.warn('Terminal input not found');} else {
inputField.addEventListener('input', function() {
    _termShowSuggest(inputField.value.trim());
});

inputField.addEventListener('keydown', function(e) {
    var suggestVisible = document.getElementById('termSuggest').classList.contains('show');

    if (e.key === 'Tab') {
        e.preventDefault();
        _termAcceptSuggest();
        return;
    }
    if (e.key === 'ArrowRight' && inputField.selectionStart === inputField.value.length) {
        var ghost = document.getElementById('termGhost');
        if (ghost && ghost.textContent) { _termAcceptSuggest(); e.preventDefault(); return; }
    }
    if (e.key === 'Escape') {
        if (suggestVisible) { document.getElementById('termSuggest').classList.remove('show'); _currentSuggestions = []; _suggestIdx = -1; var g = document.getElementById('termGhost'); if(g) g.textContent=''; e.preventDefault(); return; }
        return;
    }
    if (suggestVisible && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        _termSuggestNav(e.key === 'ArrowDown' ? 1 : -1);
        return;
    }
    if (e.key === 'ArrowUp' && !suggestVisible) {
        e.preventDefault();
        var tab = _termTabMgr.getActive(); if (!tab) return;
        if (tab.history.length > 0) {
            if (tab.histIdx < tab.history.length - 1) tab.histIdx++;
            e.target.value = tab.history[tab.history.length - 1 - tab.histIdx];
            _termShowSuggest('');
        }
        return;
    }
    if (e.key === 'ArrowDown' && !suggestVisible) {
        e.preventDefault();
        var tab2 = _termTabMgr.getActive(); if (!tab2) return;
        if (tab2.histIdx > 0) {
            tab2.histIdx--;
            e.target.value = tab2.history[tab2.history.length - 1 - tab2.histIdx];
        } else { tab2.histIdx = -1; e.target.value = ''; }
        _termShowSuggest('');
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault(); _termTabMgr.addTab(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault(); _termTabMgr.closeTab(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        var idx = parseInt(e.key) - 1;
        if (idx < _termTabMgr.tabs.length) _termTabMgr.switchTab(_termTabMgr.tabs[idx].id);
        return;
    }

    if (e.key === 'Enter') {
        var input = e.target;
        var raw = input.value.trim();
        var parts = raw.split(' ');
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1).join(' ');
        input.value = '';
        document.getElementById('termSuggest').classList.remove('show');
        var gh = document.getElementById('termGhost'); if (gh) gh.textContent = '';
        _currentSuggestions = []; _suggestIdx = -1;

        var tab3 = _termTabMgr.getActive();
        if (!tab3) return;
        tab3.histIdx = -1;

        if (raw) {
            tab3.history.push(raw);
            if (tab3.history.length > 50) tab3.history.shift();
            try { localStorage.setItem('amros_history', JSON.stringify(tab3.history)); } catch(ex) {}
        }

        var body = document.getElementById('termBody');
        var pathStr = tab3.path.length === 1 ? '~' : '~/' + tab3.path.slice(1).join('/');
        body.insertAdjacentHTML('beforeend', '<div class="term-line"><span class="term-green">amr@v5</span>:<span class="term-cyan">' + pathStr + '</span> <span class="term-accent">❯</span> <span class="term-white">' + _termEsc(cmd) + '</span> <span class="term-gray">' + _termEsc(args) + '</span></div>');

        if (TermCmds._aliases[cmd]) cmd = TermCmds._aliases[cmd];

        if (typeof TermCmds[cmd] === 'function') {
            if(window._haptic)window._haptic.tap();
            var out = TermCmds[cmd](args, tab3);
            if (out === '__CLEAR__') {
                body.innerHTML = '';
                var bootLines = [
                    '<span class="term-gray">[kernel]</span> AmrOS v5.0 Ultra initializing...',
                    '<span class="term-gray">[modules]</span> Loaded: fs, net, ai, render, haptic',
                    '<span class="term-gray">[gpu]</span> Glassmorphism compositor active',
                    '<span class="term-green">✔ AmrOS v5.0 ' + (window._llmReady ? '— Sentient Mode (local AI)' : 'Ultra Kernel Ready') + '</span>',
                    '<span class="term-gray">Type <span class="term-cyan">help</span> for commands · <span class="term-cyan">Tab</span> to autocomplete</span>'
                ];
                bootLines.forEach(function(t) { body.insertAdjacentHTML('beforeend', '<div class="term-line">' + t + '</div>'); });
            }
            else if (out) body.insertAdjacentHTML('beforeend', '<div class="term-line">' + (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(out.replace(/\n/g, '<br>')) : out.replace(/\n/g, '<br>')) + '</div>');
        } else if (TermCmds[cmd] !== undefined) {
        } else if (raw) {
            if(window._haptic)window._haptic.warning();
            body.insertAdjacentHTML('beforeend', '<div class="term-line glitch"><span class="term-red">✗ ' + _termEsc(cmd) + ': command not found</span></div>');
        }
        body.scrollTop = body.scrollHeight;
        tab3.bodyHTML = body.innerHTML;
        _termUpdateStatus();
    }
});
}

})();
