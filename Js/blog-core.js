// blog-core.js — Shared namespace, config, helpers, worker, idle scheduling, virtual scroller
(function() {
    'use strict';

    var B = window._Blog = {
        PAGE_SIZE: 12,
        MAX_EXCERPT: 200,
        ADMIN_SHORTCUT: { ctrl: true, shift: true, key: 'P' },

        _routeGen: 0,
        _viewedSlugs: new Set(),
        _allFeedArticles: [],

        articles: [],
        currentArticle: null,
        adminSession: null,
        editingArticle: null,

        _cmsHasUnsaved: false,

        _fetchCache: new Map(),
        CACHE_TTL: 60000,
        _activeAbort: null,

        _feedScrollY: 0,
        _reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        originalTitle: document.title,

        app: null,
        blogView: null,
        adminDialog: null,
        _sidebarOpen: false
    };

    B._markCmsDirty = function() { B._cmsHasUnsaved = true; };
    B._markCmsClean = function() { B._cmsHasUnsaved = false; };
    B._cmsBeforeUnload = function(e) { if (B._cmsHasUnsaved) { e.preventDefault(); e.returnValue = ''; } };

    B.esc = function(s) { var d = document.createElement('span'); d.textContent = s || ''; return d.innerHTML; };
    B.snd = function(t) { if (window._sonification && window._sonification[t]) window._sonification[t](); else if (window._haptic && window._haptic[t]) window._haptic[t](); };

    B._getCached = function(key) {
        var entry = B._fetchCache.get(key);
        if (entry && (window.getTrueTime ? window.getTrueTime() : Date.now()) - entry.ts < B.CACHE_TTL) return entry.data;
        B._fetchCache.delete(key);
        return null;
    };
    B._setCache = function(key, data) {
        B._fetchCache.set(key, { data: data, ts: window.getTrueTime ? window.getTrueTime() : Date.now() });
    };
    B._abortPrevious = function() {
        if (B._activeAbort) { B._activeAbort.abort(); }
        B._activeAbort = new AbortController();
        return B._activeAbort.signal;
    };

    B.postProcessHtml = function(html) {
        html = html.replace(
            /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|DANGER|IMPORTANT|CAUTION|QUOTE)\]\s*<br\s*\/?>\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
            function(_, type, content) {
                var t = type.toUpperCase();
                var icons = { NOTE: '\u2139\ufe0f', TIP: '\ud83d\udca1', WARNING: '\u26a0\ufe0f', DANGER: '\ud83d\uded1', IMPORTANT: '\u2757', CAUTION: '\ud83d\udea8', QUOTE: '\u275d' };
                var cls = { NOTE: 'note', TIP: 'tip', WARNING: 'warning', DANGER: 'danger', IMPORTANT: 'warning', CAUTION: 'danger', QUOTE: 'quote' };
                return '<div class="callout callout-' + (cls[t] || 'note') + '"><div class="callout-title">' + (icons[t] || '') + ' ' + t + '</div><p>' + content + '</p></div>';
            }
        );
        return html;
    };

    B.readingTime = function(text) {
        var w = (text || '').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(w / 200)) + ' min read';
    };

    B.fmtDate = function(d) {
        try {
            var date = new Date(d);
            if (isNaN(date.getTime())) return 'Unknown date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return 'Unknown date'; }
    };

    B.slugify = function(str) {
        return (str || '').toLowerCase().trim()
            .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    };

    B.processEmbeds = function(html) {
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-embed"><div class="lb-yt-embed"><iframe src="https://www.youtube-nocookie.com/embed/$1" allowfullscreen loading="lazy" title="YouTube video"></iframe></div></div>');
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*https?:\/\/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-tweet-embed"><blockquote class="twitter-tweet" data-dnt="true"><a href="https://twitter.com/$1/status/$2"></a></blockquote></div>');
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*https?:\/\/codepen\.io\/([\w-]+)\/pen\/([\w-]+)[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-codepen-embed"><iframe src="https://codepen.io/$1/embed/$2?default-tab=result&theme-id=dark" loading="lazy" title="CodePen"></iframe></div>');
        return html;
    };

    B.parseMarkdown = function(md) {
        if (window.marked && window.marked.parse) {
            window.marked.setOptions({ breaks: true, gfm: true });
            return B.processEmbeds(B.postProcessHtml(window.marked.parse(md || '')));
        }
        var s = B.esc(md || '');
        s = s.replace(/```([\s\S]*?)```/g, function(_, code) { return '<pre><code>' + code.trim() + '</code></pre>'; });
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/`(.+?)`/g, '<code>$1</code>');
        s = s.replace(/\n/g, '<br>');
        return B.processEmbeds(s);
    };

    B.debounce = function(fn, ms) {
        var t;
        return function() {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function() { fn.apply(ctx, args); }, ms);
        };
    };

    /* ── Web Worker for Markdown Parsing ── */
    var _mdWorker = null;
    var _mdWorkerReady = false;
    var _mdWorkerCallbacks = new Map();
    var _mdWorkerSeq = 0;

    function _initMdWorker() {
        if (_mdWorker || typeof Worker === 'undefined') return;
        try {
            var src = [
                'var markedLoaded = false;',
                'var markedRef = null;',
                'self.onmessage = function(e) {',
                '    var d = e.data;',
                '    if (d.type === "init") {',
                '        try {',
                '            importScripts(d.markedUrl);',
                '            markedRef = self.marked || (typeof marked !== "undefined" ? marked : null);',
                '            if (markedRef) { markedLoaded = true; self.postMessage({type:"ready"}); }',
                '            else { self.postMessage({type:"error",error:"marked.js loaded but not found on global"}); }',
                '        }',
                '        catch(err) { self.postMessage({type:"error",error:"Failed to load marked.js: " + err.message}); }',
                '        return;',
                '    }',
                '    if (d.type === "parse") {',
                '        if (!markedLoaded || !markedRef) { self.postMessage({type:"result",id:d.id,html:"",fallback:true}); return; }',
                '        try {',
                '            markedRef.setOptions({breaks:true,gfm:true});',
                '            var html = markedRef.parse(d.md || "");',
                '            self.postMessage({type:"result",id:d.id,html:html});',
                '        } catch(err) { self.postMessage({type:"result",id:d.id,html:"",fallback:true}); }',
                '    }',
                '};'
            ].join('\n');
            var blob = new Blob([src], { type: 'application/javascript' });
            _mdWorker = new Worker(URL.createObjectURL(blob));
            _mdWorker.onmessage = function(e) {
                var d = e.data;
                if (d.type === 'ready') { _mdWorkerReady = true; return; }
                if (d.type === 'result') {
                    var cb = _mdWorkerCallbacks.get(d.id);
                    if (cb) { _mdWorkerCallbacks.delete(d.id); cb(d.html, d.fallback); }
                }
            };
            _mdWorker.onerror = function() { _mdWorkerReady = false; _mdWorker = null; };
            var markedScript = document.querySelector('script[src*="marked"]');
            var markedUrl = markedScript ? markedScript.src : 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            _mdWorker.postMessage({ type: 'init', markedUrl: markedUrl });
        } catch (e) { _mdWorker = null; }
    }

    B.parseMarkdownAsync = function(md, callback) {
        if (_mdWorker && _mdWorkerReady) {
            var id = ++_mdWorkerSeq;
            _mdWorkerCallbacks.set(id, function(html, fallback) {
                if (fallback) { callback(B.parseMarkdown(md)); return; }
                callback(B.processEmbeds(B.postProcessHtml(html)));
            });
            _mdWorker.postMessage({ type: 'parse', id: id, md: md || '' });
        } else {
            callback(B.parseMarkdown(md));
        }
    };

    _initMdWorker();

    /* ── requestIdleCallback Scheduling ── */
    var _ric = window.requestIdleCallback || function(cb) { return setTimeout(cb, 16); };
    var _ricCancel = window.cancelIdleCallback || clearTimeout;

    B.scheduleIdle = function(fn, timeout) {
        return _ric(fn, { timeout: timeout || 500 });
    };

    B.debounceIdle = function(fn, ms, idleTimeout) {
        var timer, idleHandle;
        return function() {
            var args = arguments, ctx = this;
            clearTimeout(timer);
            if (idleHandle) _ricCancel(idleHandle);
            timer = setTimeout(function() {
                idleHandle = B.scheduleIdle(function() { fn.apply(ctx, args); }, idleTimeout || 500);
            }, ms);
        };
    };

    /* ── Virtual Scroller ── */
    B._VirtualScroller = function(container, rowHeight, renderRow, totalCount) {
        var self = this;
        self.container = container;
        self.rowH = rowHeight || 40;
        self.renderRow = renderRow;
        self.total = totalCount || 0;
        self.buffer = 5;
        self._items = [];
        self._scrollEl = null;
        self._innerEl = null;
        self._raf = null;
        self._lastStart = -1;
        self._lastEnd = -1;

        self.mount = function() {
            container.style.overflow = 'auto';
            container.style.position = 'relative';
            self._innerEl = document.createElement('div');
            self._innerEl.style.cssText = 'position:relative;width:100%';
            self._innerEl.style.height = (self.total * self.rowH) + 'px';
            container.innerHTML = '';
            container.appendChild(self._innerEl);
            container.addEventListener('scroll', self._onScroll);
            self._render();
        };

        self.update = function(newTotal, newRender) {
            self.total = newTotal;
            if (newRender) self.renderRow = newRender;
            if (self._innerEl) self._innerEl.style.height = (self.total * self.rowH) + 'px';
            self._lastStart = -1;
            self._render();
        };

        self._onScroll = function() {
            if (self._raf) return;
            self._raf = requestAnimationFrame(function() { self._raf = null; self._render(); });
        };

        self._render = function() {
            if (!self._innerEl) return;
            var scrollTop = container.scrollTop;
            var viewH = container.clientHeight;
            var start = Math.max(0, Math.floor(scrollTop / self.rowH) - self.buffer);
            var end = Math.min(self.total, Math.ceil((scrollTop + viewH) / self.rowH) + self.buffer);
            if (start === self._lastStart && end === self._lastEnd) return;
            self._lastStart = start;
            self._lastEnd = end;
            var frag = document.createDocumentFragment();
            for (var i = start; i < end; i++) {
                var row = self.renderRow(i);
                if (row) {
                    row.style.position = 'absolute';
                    row.style.top = (i * self.rowH) + 'px';
                    row.style.width = '100%';
                    frag.appendChild(row);
                }
            }
            self._innerEl.innerHTML = '';
            self._innerEl.style.height = (self.total * self.rowH) + 'px';
            self._innerEl.appendChild(frag);
        };

        self.destroy = function() {
            container.removeEventListener('scroll', self._onScroll);
            if (self._raf) cancelAnimationFrame(self._raf);
        };
    };

    B._genLocalId = function() { return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); };

    B.xmlEsc = function(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

})();
