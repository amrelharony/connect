// blog-telemetry.js — Unified event telemetry: impressions, interactions, mood capture
(function() {
    'use strict';
    var B = window._Blog;
    if (!B) return;

    var _queue = [];
    var _impressionsSeen = {};
    var _flushInterval = null;
    var _observers = [];
    var FLUSH_MS = 10000;
    var DWELL_MIN_MS = 2000;

    function _sessionId() {
        if (window._visitSessionId) return window._visitSessionId;
        var sid = sessionStorage.getItem('_tele_sid');
        if (!sid) {
            sid = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
            sessionStorage.setItem('_tele_sid', sid);
        }
        return sid;
    }

    function _currentMood() {
        try { return window._emotionEngine && window._emotionEngine.getMood ? window._emotionEngine.getMood() : null; } catch (e) { return null; }
    }

    function _currentArticleId() {
        try {
            var el = document.querySelector('[data-article-id]');
            return el ? el.dataset.articleId : null;
        } catch (e) { return null; }
    }

    function track(eventType, eventData) {
        _queue.push({
            session_id: _sessionId(),
            article_id: eventData && eventData.article_id ? eventData.article_id : _currentArticleId(),
            event_type: eventType,
            event_data: eventData || {},
            mood: _currentMood(),
            created_at: new Date().toISOString()
        });
    }

    function flush() {
        if (!_queue.length || !window._sb) return;
        var batch = _queue.splice(0, 50);
        var payload = batch.map(function(e) {
            var d = Object.assign({}, e);
            if (!d.article_id) delete d.article_id;
            return d;
        });
        window._sb.rpc('batch_insert_events', { p_events: payload }).catch(function() {
            _queue = batch.concat(_queue);
        });
    }

    function _startFlushing() {
        if (_flushInterval) return;
        _flushInterval = setInterval(flush, FLUSH_MS);
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') flush();
        });
        window.addEventListener('beforeunload', flush);
    }

    // ── Impression Observer ──
    function observeImpressions(root) {
        if (!root) return;
        var targets = root.querySelectorAll('h2, h3, blockquote, pre, figure, .lb-gallery, .lb-article-footer, .lb-author-card, .lb-comments-section');
        if (!targets.length) return;

        var dwellTimers = {};

        var io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                var el = entry.target;
                var key = el.dataset.teleKey;
                if (!key) {
                    key = (el.tagName.toLowerCase()) + '-' + (el.id || Math.random().toString(36).slice(2, 8));
                    el.dataset.teleKey = key;
                }

                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    if (!dwellTimers[key]) {
                        dwellTimers[key] = { start: Date.now(), fired: false };
                    }
                } else {
                    if (dwellTimers[key] && !dwellTimers[key].fired) {
                        var elapsed = Date.now() - dwellTimers[key].start;
                        if (elapsed >= DWELL_MIN_MS && !_impressionsSeen[key]) {
                            _impressionsSeen[key] = true;
                            track('impression', { section: key, dwell_ms: elapsed });
                        }
                    }
                    delete dwellTimers[key];
                }
            });
        }, { threshold: [0, 0.5, 1.0] });

        targets.forEach(function(el) { io.observe(el); });
        _observers.push(io);

        // Fire pending dwells on cleanup
        var checkDwells = setInterval(function() {
            var now = Date.now();
            Object.keys(dwellTimers).forEach(function(key) {
                if (!dwellTimers[key].fired && (now - dwellTimers[key].start) >= DWELL_MIN_MS && !_impressionsSeen[key]) {
                    _impressionsSeen[key] = true;
                    dwellTimers[key].fired = true;
                    track('impression', { section: key, dwell_ms: now - dwellTimers[key].start });
                }
            });
        }, 3000);
        _observers.push({ disconnect: function() { clearInterval(checkDwells); } });
    }

    // ── Feed card impression observer ──
    function observeFeedCards(container) {
        if (!container) return;
        var cards = container.querySelectorAll('.lb-card-v2, .lb-hero');
        if (!cards.length) return;

        var io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    var el = entry.target;
                    var slug = el.dataset.slug || el.querySelector('[data-slug]')?.dataset.slug || '';
                    var key = 'card-' + slug;
                    if (!_impressionsSeen[key] && slug) {
                        _impressionsSeen[key] = true;
                        track('feed_impression', { slug: slug });
                    }
                }
            });
        }, { threshold: [0.5] });

        cards.forEach(function(c) { io.observe(c); });
        _observers.push(io);
    }

    // ── Scroll depth tracking ──
    function trackScrollDepth(contentEl) {
        if (!contentEl) return;
        var milestones = { 25: false, 50: false, 75: false, 100: false };
        var handler = function() {
            var rect = contentEl.getBoundingClientRect();
            var scrolled = window.innerHeight - rect.top;
            var total = contentEl.offsetHeight;
            if (total <= 0) return;
            var pct = Math.min(100, Math.round((scrolled / total) * 100));
            [25, 50, 75, 100].forEach(function(m) {
                if (pct >= m && !milestones[m]) {
                    milestones[m] = true;
                    track('scroll_' + m, { percent: m });
                }
            });
        };
        window.addEventListener('scroll', handler, { passive: true });
        _observers.push({ disconnect: function() { window.removeEventListener('scroll', handler); } });
    }

    function destroy() {
        flush();
        if (_flushInterval) { clearInterval(_flushInterval); _flushInterval = null; }
        _observers.forEach(function(o) { if (o && o.disconnect) o.disconnect(); });
        _observers = [];
        _impressionsSeen = {};
    }

    _startFlushing();

    B._telemetry = {
        track: track,
        flush: flush,
        observeImpressions: observeImpressions,
        observeFeedCards: observeFeedCards,
        trackScrollDepth: trackScrollDepth,
        destroy: destroy
    };
})();
