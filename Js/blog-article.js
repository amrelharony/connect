// blog-article.js — Article reader, newsletter, related, series, lightbox, reading settings, footnotes, galleries, SEO, review, TOC, progress bar, code highlighting
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;
    var fmtDate = B.fmtDate;

    function _fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch(e) {}
        document.body.removeChild(ta);
        return ok;
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: NEWSLETTER (Biweekly Bulletin)
       ═══════════════════════════════════════════════════ */
    var _blockedDomains = new Set([
        'gmail.com','yahoo.com','yahoo.co.uk','hotmail.com','outlook.com',
        'live.com','msn.com','aol.com','icloud.com','me.com','mac.com',
        'protonmail.com','proton.me','zoho.com','yandex.com','mail.com',
        'gmx.com','gmx.de','fastmail.com','tutanota.com','tuta.com',
        'hushmail.com','inbox.com','mailinator.com','guerrillamail.com',
        'tempmail.com','yopmail.com','qq.com','163.com','126.com'
    ]);

    if (window._sb) {
        window._sb.rpc('get_blocked_domains').then(function(res) {
            if (Array.isArray(res.data)) res.data.forEach(function(d) { _blockedDomains.add(d); });
        }).catch(function() {});
    }

    function _isCorporateEmail(email) {
        var domain = (email.split('@')[1] || '').toLowerCase();
        return domain && !_blockedDomains.has(domain);
    }

    function renderNewsletter() {
        var container = document.getElementById('lbNewsletter');
        if (!container) return;

        var countHtml = '<span class="lb-newsletter-count" id="lbNewsletterCount"></span>';

        container.innerHTML = '<div class="lb-newsletter lb-reveal">' +
            '<div class="lb-newsletter-icon">📰</div>' +
            '<div class="lb-newsletter-title">BIWEEKLY DIGEST</div>' +
            '<div class="lb-newsletter-sub">Get a curated roundup of new articles delivered to your corporate inbox every two weeks.</div>' +
            countHtml +
            '<form class="lb-newsletter-form" id="lbNewsletterForm">' +
            '<input type="email" placeholder="you@company.com" id="lbNewsletterEmail" required autocomplete="email">' +
            '<div class="lb-newsletter-fields">' +
            '<input type="text" placeholder="Job Title *" id="lbNewsletterJobTitle" required autocomplete="organization-title">' +
            '<input type="tel" placeholder="Phone (optional)" id="lbNewsletterPhone" autocomplete="tel">' +
            '</div>' +
            '<button type="submit" id="lbNewsletterSubmit">SUBSCRIBE</button>' +
            '</form>' +
            '<div class="lb-newsletter-status" id="lbNewsletterStatus"></div>' +
            '</div>';

        if (window._sb) {
            window._sb.rpc('get_newsletter_count').then(function(res) {
                var countEl = document.getElementById('lbNewsletterCount');
                if (countEl && res.data && res.data > 0) {
                    countEl.textContent = 'Join ' + res.data + '+ reader' + (res.data !== 1 ? 's' : '');
                    countEl.classList.add('visible');
                }
            }).catch(function() {});
        }

        document.getElementById('lbNewsletterForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            var emailInput = document.getElementById('lbNewsletterEmail');
            var jobTitleInput = document.getElementById('lbNewsletterJobTitle');
            var phoneInput = document.getElementById('lbNewsletterPhone');
            var btn = document.getElementById('lbNewsletterSubmit');
            var statusEl = document.getElementById('lbNewsletterStatus');
            var email = emailInput.value.trim();
            var jobTitle = jobTitleInput.value.trim();
            var phone = phoneInput.value.trim();
            if (!email || !jobTitle || !window._sb) return;

            if (!_isCorporateEmail(email)) {
                statusEl.textContent = 'Please use a corporate email address.';
                statusEl.className = 'lb-newsletter-status visible error';
                if (window.UniToast) window.UniToast('Corporate email required', 'Personal email providers are not accepted.', '⚠️', 'warn');
                return;
            }

            btn.disabled = true;
            btn.textContent = '...';
            statusEl.textContent = '';
            statusEl.className = 'lb-newsletter-status';
            try {
                var res = await window._sb.rpc('subscribe_newsletter', { p_email: email, p_job_title: jobTitle, p_phone: phone || null });
                var token = res.data;

                if (res.error) throw new Error(res.error.message || 'Subscription failed');

                snd('success');

                if (token) {
                    fetch('/api/newsletter-confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email, token: token })
                    }).catch(function() {});

                    var formEl = document.getElementById('lbNewsletterForm');
                    if (formEl) formEl.style.display = 'none';
                    statusEl.innerHTML = '<span class="lb-newsletter-pending-icon">📧</span> Check your inbox to confirm your subscription.';
                    statusEl.className = 'lb-newsletter-status visible';
                    if (window.UniToast) window.UniToast('Almost there!', 'Check your inbox to confirm your subscription.', '📧', 'success');
                } else {
                    btn.textContent = 'SUBSCRIBED ✓';
                    emailInput.value = '';
                    jobTitleInput.value = '';
                    phoneInput.value = '';
                    if (window.UniToast) window.UniToast('Already subscribed!', 'You\'re already on the list.', '✅', 'success');
                    btn.disabled = false;
                }
            } catch (err) {
                var msg = (err.message || '').toLowerCase();
                if (msg.includes('corporate email')) {
                    statusEl.textContent = 'Please use a corporate email address.';
                    statusEl.className = 'lb-newsletter-status visible error';
                    if (window.UniToast) window.UniToast('Corporate email required', '', '⚠️', 'warn');
                } else if (msg.includes('job title')) {
                    statusEl.textContent = 'Job title is required.';
                    statusEl.className = 'lb-newsletter-status visible error';
                } else {
                    if (window.UniToast) window.UniToast('Subscription failed.', '', '⚠️', 'warn');
                }
                btn.textContent = 'SUBSCRIBE';
                btn.disabled = false;
            }
        });
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: RELATED ARTICLES
       ═══════════════════════════════════════════════════ */
    async function renderRelated(article) {
        var articleEl = document.querySelector('.lb-article');
        if (!articleEl || !window._sb) return;
        var tags = article.tags || [];

        try {
            var res = await window._sb
                .from('longform_articles')
                .select('id,title,slug,excerpt,created_at,tags,views')
                .eq('published', true)
                .neq('id', article.id)
                .order('created_at', { ascending: false })
                .limit(20);

            var pool = res.data || [];
            if (!pool.length) return;

            pool.forEach(function(a) {
                a._overlap = (a.tags || []).filter(function(t) { return tags.indexOf(t) !== -1; }).length;
            });
            pool.sort(function(a, b) { return b._overlap - a._overlap || b.views - a.views; });
            var related = pool.slice(0, 4);
            if (related.length < 2) return;

            var html = '<div class="lb-related">' +
                '<div class="lb-related-title">RELATED ARTICLES</div>' +
                '<div class="lb-related-grid">' +
                related.map(function(a) {
                    return '<div class="lb-related-card" data-slug="' + esc(a.slug) + '">' +
                        '<div class="lb-related-card-title">' + esc(a.title) + '</div>' +
                        '<div class="lb-related-card-meta">' +
                        '<span>' + fmtDate(a.created_at) + '</span>' +
                        (a.views ? '<span>👁 ' + a.views + '</span>' : '') +
                        '</div></div>';
                }).join('') +
                '</div></div>';

            var reactions = document.getElementById('lbReactions');
            if (reactions) reactions.insertAdjacentHTML('beforebegin', html);
            else articleEl.querySelector('.lb-article-footer').insertAdjacentHTML('beforebegin', html);

            document.querySelectorAll('.lb-related-card').forEach(function(card) {
                card.addEventListener('click', function() { B.navigateTo({ post: card.dataset.slug }); snd('tap'); });
            });
        } catch (e) { /* silent */ }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: ARTICLE SERIES
       ═══════════════════════════════════════════════════ */
    async function renderSeriesNav(article) {
        if (!article.series_name || !window._sb) return;
        try {
            var res = await window._sb
                .from('longform_articles')
                .select('id,title,slug,series_order')
                .eq('published', true)
                .eq('series_name', article.series_name)
                .order('series_order', { ascending: true });

            var siblings = res.data || [];
            if (siblings.length < 2) return;
            var currentIdx = -1;
            siblings.forEach(function(s, i) { if (s.id === article.id) currentIdx = i; });
            if (currentIdx === -1) return;

            var prev = currentIdx > 0 ? siblings[currentIdx - 1] : null;
            var next = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

            var html = '<div class="lb-series-nav">' +
                '<button class="lb-series-nav-btn' + (!prev ? ' disabled' : '') + '" id="lbSeriesPrev">' +
                '<i class="fa-solid fa-chevron-left"></i> Prev</button>' +
                '<span class="lb-series-nav-title">' + esc(article.series_name) +
                ' — Part ' + (currentIdx + 1) + ' of ' + siblings.length + '</span>' +
                '<button class="lb-series-nav-btn' + (!next ? ' disabled' : '') + '" id="lbSeriesNext">' +
                'Next <i class="fa-solid fa-chevron-right"></i></button>' +
                '</div>';

            var contentEl = document.querySelector('.lb-content');
            if (contentEl) contentEl.insertAdjacentHTML('beforebegin', html);

            if (prev) document.getElementById('lbSeriesPrev').addEventListener('click', function() { B.navigateTo({ post: prev.slug }); });
            if (next) document.getElementById('lbSeriesNext').addEventListener('click', function() { B.navigateTo({ post: next.slug }); });
        } catch (e) { /* silent */ }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 4: IMAGE LIGHTBOX
       ═══════════════════════════════════════════════════ */
    var _lightboxEl = null;
    var _lightboxImages = [];
    var _lightboxIdx = 0;

    function initLightbox() {
        var content = document.querySelector('.lb-content');
        if (!content) return;
        _lightboxImages = Array.from(content.querySelectorAll('img'));
        if (!_lightboxImages.length) return;
        _lightboxImages.forEach(function(img, idx) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function(e) {
                e.stopPropagation();
                openLightbox(idx);
            });
        });
    }

    function openLightbox(idx) {
        _lightboxIdx = idx;
        if (_lightboxEl) _lightboxEl.remove();
        _lightboxEl = document.createElement('div');
        _lightboxEl.className = 'lb-lightbox';
        _lightboxEl.innerHTML =
            '<button class="lb-lightbox-close" title="Close">&times;</button>' +
            (_lightboxImages.length > 1 ? '<span class="lb-lightbox-counter">' + (idx + 1) + ' / ' + _lightboxImages.length + '</span>' : '') +
            '<img class="lb-lightbox-img" src="" alt="">' +
            '<div class="lb-lightbox-caption"></div>' +
            (_lightboxImages.length > 1 ? '<button class="lb-lightbox-nav lb-lightbox-prev" aria-label="Previous image">&#8249;</button><button class="lb-lightbox-nav lb-lightbox-next" aria-label="Next image">&#8250;</button>' : '');
        document.body.appendChild(_lightboxEl);
        updateLightboxImage();
        requestAnimationFrame(function() { _lightboxEl.classList.add('show'); });

        _lightboxEl.querySelector('.lb-lightbox-close').addEventListener('click', closeLightbox);
        _lightboxEl.addEventListener('click', function(e) { if (e.target === _lightboxEl) closeLightbox(); });
        var prev = _lightboxEl.querySelector('.lb-lightbox-prev');
        var next = _lightboxEl.querySelector('.lb-lightbox-next');
        if (prev) prev.addEventListener('click', function(e) { e.stopPropagation(); _lightboxIdx = (_lightboxIdx - 1 + _lightboxImages.length) % _lightboxImages.length; updateLightboxImage(); });
        if (next) next.addEventListener('click', function(e) { e.stopPropagation(); _lightboxIdx = (_lightboxIdx + 1) % _lightboxImages.length; updateLightboxImage(); });

        document.addEventListener('keydown', _lightboxKeyHandler);
    }

    function updateLightboxImage() {
        if (!_lightboxEl || !_lightboxImages[_lightboxIdx]) return;
        var img = _lightboxImages[_lightboxIdx];
        _lightboxEl.querySelector('.lb-lightbox-img').src = img.src;
        _lightboxEl.querySelector('.lb-lightbox-img').alt = img.alt || '';
        var cap = _lightboxEl.querySelector('.lb-lightbox-caption');
        cap.textContent = img.alt || '';
        cap.style.display = img.alt ? '' : 'none';
        var counter = _lightboxEl.querySelector('.lb-lightbox-counter');
        if (counter) counter.textContent = (_lightboxIdx + 1) + ' / ' + _lightboxImages.length;
    }

    function _lightboxKeyHandler(e) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft' && _lightboxImages.length > 1) { _lightboxIdx = (_lightboxIdx - 1 + _lightboxImages.length) % _lightboxImages.length; updateLightboxImage(); }
        else if (e.key === 'ArrowRight' && _lightboxImages.length > 1) { _lightboxIdx = (_lightboxIdx + 1) % _lightboxImages.length; updateLightboxImage(); }
    }

    function closeLightbox() {
        document.removeEventListener('keydown', _lightboxKeyHandler);
        if (_lightboxEl) {
            _lightboxEl.classList.remove('show');
            setTimeout(function() { if (_lightboxEl) { _lightboxEl.remove(); _lightboxEl = null; } }, 250);
        }
    }

    function destroyLightbox() {
        document.removeEventListener('keydown', _lightboxKeyHandler);
        if (_lightboxEl) { _lightboxEl.remove(); _lightboxEl = null; }
        _lightboxImages = [];
    }

    /* ═══════════════════════════════════════════════════
       PHASE 4: READING SETTINGS
       ═══════════════════════════════════════════════════ */
    var _readingPanel = null;
    var LS_READING = '_lb_reading_prefs';
    var _readingAddedLightMode = false;
    var _readingRemovedLightMode = false;

    function getReadingPrefs() {
        try { return JSON.parse(localStorage.getItem(LS_READING)) || {}; } catch(e) { return {}; }
    }

    function saveReadingPrefs(p) { try { localStorage.setItem(LS_READING, JSON.stringify(p)); } catch(e) {} }

    function applyReadingPrefs() {
        var p = getReadingPrefs();
        var content = document.querySelector('.lb-content');
        if (!content) return;
        if (p.fontSize) content.style.fontSize = p.fontSize;
        if (p.fontFamily) content.style.fontFamily = p.fontFamily;
        document.body.classList.remove('lb-sepia');
        // Restore light-mode we previously added
        if (_readingAddedLightMode) { document.body.classList.remove('light-mode'); _readingAddedLightMode = false; }
        // Restore light-mode we previously removed
        if (_readingRemovedLightMode) { document.body.classList.add('light-mode'); _readingRemovedLightMode = false; }
        if (p.theme === 'dark') {
            // Force dark: remove light-mode even if it was set by the global toggle
            if (document.body.classList.contains('light-mode')) {
                document.body.classList.remove('light-mode');
                _readingRemovedLightMode = true;
            }
        } else if (p.theme === 'sepia') {
            document.body.classList.add('lb-sepia');
        } else if (p.theme === 'light' && !document.body.classList.contains('light-mode')) {
            document.body.classList.add('light-mode');
            _readingAddedLightMode = true;
        }
    }

    function _closeReadingPanel() {
        if (_readingPanel) _readingPanel.classList.remove('show');
    }

    function _readingPanelOutsideClick(e) {
        if (!_readingPanel || !_readingPanel.classList.contains('show')) return;
        if (_readingPanel.contains(e.target)) return;
        if (_toolbar && _toolbar.contains(e.target)) return;
        if (_toolsMenu && _toolsMenu.contains(e.target)) return;
        _closeReadingPanel();
    }

    function _readingPanelEsc(e) {
        if (e.key === 'Escape' && _readingPanel && _readingPanel.classList.contains('show')) {
            e.preventDefault();
            e.stopPropagation();
            _closeReadingPanel();
        }
    }

    function initReadingSettings() {
        if (_readingPanel) return;
        _readingPanel = document.createElement('div');
        _readingPanel.className = 'lb-reading-panel';
        _readingPanel.innerHTML =
            '<div class="lb-reading-panel-header"><span class="lb-reading-panel-title">READING SETTINGS</span><button class="lb-reading-panel-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
            '<div class="lb-reading-option"><div class="lb-reading-option-label">Font Size</div><div class="lb-reading-options">' +
            '<button class="lb-reading-opt" data-fontsize="14px">S</button>' +
            '<button class="lb-reading-opt" data-fontsize="17px">M</button>' +
            '<button class="lb-reading-opt" data-fontsize="20px">L</button></div></div>' +
            '<div class="lb-reading-option"><div class="lb-reading-option-label">Theme</div><div class="lb-reading-options">' +
            '<button class="lb-reading-opt" data-theme="dark">Dark</button>' +
            '<button class="lb-reading-opt" data-theme="light">Light</button>' +
            '<button class="lb-reading-opt" data-theme="sepia">Sepia</button></div></div>' +
            '<div class="lb-reading-option"><div class="lb-reading-option-label">Font</div><div class="lb-reading-options">' +
            '<button class="lb-reading-opt" data-font="\'Source Serif 4\',Georgia,serif">Serif</button>' +
            '<button class="lb-reading-opt" data-font="\'Inter\',sans-serif">Sans</button>' +
            '<button class="lb-reading-opt" data-font="\'JetBrains Mono\',monospace">Mono</button></div></div>';
        document.body.appendChild(_readingPanel);

        var prefs = getReadingPrefs();
        _readingPanel.querySelectorAll('[data-fontsize]').forEach(function(btn) {
            if (prefs.fontSize === btn.dataset.fontsize) btn.classList.add('active');
            btn.addEventListener('click', function() {
                _readingPanel.querySelectorAll('[data-fontsize]').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                prefs.fontSize = btn.dataset.fontsize;
                saveReadingPrefs(prefs);
                applyReadingPrefs();
            });
        });
        _readingPanel.querySelectorAll('[data-theme]').forEach(function(btn) {
            if (prefs.theme === btn.dataset.theme) btn.classList.add('active');
            btn.addEventListener('click', function() {
                _readingPanel.querySelectorAll('[data-theme]').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                prefs.theme = btn.dataset.theme;
                saveReadingPrefs(prefs);
                applyReadingPrefs();
            });
        });
        _readingPanel.querySelectorAll('[data-font]').forEach(function(btn) {
            if (prefs.fontFamily === btn.dataset.font) btn.classList.add('active');
            btn.addEventListener('click', function() {
                _readingPanel.querySelectorAll('[data-font]').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                prefs.fontFamily = btn.dataset.font;
                saveReadingPrefs(prefs);
                applyReadingPrefs();
            });
        });
        applyReadingPrefs();

        _readingPanel.querySelector('.lb-reading-panel-close').addEventListener('click', _closeReadingPanel);
        document.addEventListener('pointerdown', _readingPanelOutsideClick);
        document.addEventListener('keydown', _readingPanelEsc, true);
    }

    function destroyReadingSettings() {
        document.removeEventListener('pointerdown', _readingPanelOutsideClick);
        document.removeEventListener('keydown', _readingPanelEsc, true);
        if (_readingPanel) { _readingPanel.remove(); _readingPanel = null; }
        document.body.classList.remove('lb-sepia');
        if (_readingAddedLightMode) { document.body.classList.remove('light-mode'); _readingAddedLightMode = false; }
        if (_readingRemovedLightMode) { document.body.classList.add('light-mode'); _readingRemovedLightMode = false; }
    }

    /* ═══════════════════════════════════════════════════
       UNIFIED ARTICLE TOOLBAR
       Combines: progress meta, tools FAB, reading settings,
       and smart CTA into one floating pill.
       ═══════════════════════════════════════════════════ */
    var _toolbar = null, _toolbarCta = null, _toolbarCtaDivider = null;
    var _toolbarProgress = null, _toolbarGear = null;
    var _toolsMenu = null, _toolsOpen = false;
    var _toolbarVisible = false, _toolbarHideTimer = null;
    var _toolbarAutoHideDelay = 8000;
    var _toolbarHideTime = 0;

    function _syncChallengeHUD(show) {
        var ch = document.querySelector('.challenge-hud');
        if (!ch) return;
        var _g = window.gsap;
        if (show) {
            ch.classList.add('show');
            if (_g && !B._reducedMotion) { _g.killTweensOf(ch); _g.to(ch, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' }); }
        } else {
            if (_g && !B._reducedMotion) { _g.killTweensOf(ch); _g.to(ch, { opacity: 0, y: 8, duration: 0.25, ease: 'power2.in', onComplete: function() { ch.classList.remove('show'); } }); }
            else { ch.classList.remove('show'); }
        }
    }

    function _showToolbar() {
        if (!_toolbar) return;
        if (_toolbarVisible) { _resetToolbarHideTimer(); return; }
        if (Date.now() - _toolbarHideTime < 600) return;
        _toolbarVisible = true;
        var _g = window.gsap;
        if (_g && !B._reducedMotion) {
            _g.killTweensOf(_toolbar);
            _g.to(_toolbar, { opacity: 1, y: 0, scale: 1, visibility: 'visible', duration: 0.3, ease: 'back.out(1.4)' });
        } else {
            _toolbar.style.opacity = '1';
            _toolbar.style.visibility = 'visible';
            _toolbar.style.transform = 'none';
        }
        _syncChallengeHUD(true);
        _resetToolbarHideTimer();
    }

    function _hideToolbar() {
        if (!_toolbar || !_toolbarVisible) return;
        _closeToolsMenu();
        _toolbarVisible = false;
        _toolbarHideTime = Date.now();
        clearTimeout(_toolbarHideTimer);
        var _g = window.gsap;
        if (_g && !B._reducedMotion) {
            _g.killTweensOf(_toolbar);
            _g.to(_toolbar, { opacity: 0, y: 12, scale: 0.9, duration: 0.25, ease: 'power2.in', onComplete: function() { if (_toolbar) _toolbar.style.visibility = 'hidden'; } });
        } else {
            _toolbar.style.opacity = '0';
            _toolbar.style.visibility = 'hidden';
        }
        _syncChallengeHUD(false);
    }

    window._hideArticleToolbar = function() {
        if (_toolbarVisible && _toolbar) { _hideToolbar(); return true; }
        return false;
    };

    function _resetToolbarHideTimer() {
        clearTimeout(_toolbarHideTimer);
        if (_toolsOpen) return;
        _toolbarHideTimer = setTimeout(_hideToolbar, _toolbarAutoHideDelay);
    }

    function _onToolbarScroll() {
        _showToolbar();
    }

    function _onToolbarOutsideClick(e) {
        if (!_toolbar || !_toolbarVisible) return;
        if (_toolbar.contains(e.target)) return;
        if (_toolsMenu && _toolsMenu.contains(e.target)) return;
        if (_readingPanel && _readingPanel.contains(e.target)) return;
        _hideToolbar();
    }

    function initArticleToolbar(articleData) {
        destroyArticleToolbar();
        initProgressBar();

        _toolbar = document.createElement('div');
        _toolbar.className = 'lb-article-toolbar';

        _toolbarCta = document.createElement('a');
        _toolbarCta.className = 'lb-toolbar-cta';
        _toolbarCta.target = '_blank';
        _toolbarCta.rel = 'noopener';
        _toolbarCta.title = 'Connect';

        _toolbarCtaDivider = document.createElement('div');
        _toolbarCtaDivider.className = 'lb-toolbar-divider hidden';

        _toolbarProgress = document.createElement('div');
        _toolbarProgress.className = 'lb-toolbar-progress';

        _toolbarGear = document.createElement('button');
        _toolbarGear.className = 'lb-toolbar-gear';
        _toolbarGear.innerHTML = '<i class="fa-solid fa-gear"></i>';
        _toolbarGear.title = 'Article Tools';

        _toolbar.appendChild(_toolbarCta);
        _toolbar.appendChild(_toolbarCtaDivider);
        _toolbar.appendChild(_toolbarProgress);
        _toolbar.appendChild(_toolbarGear);
        document.body.appendChild(_toolbar);

        _toolsMenu = document.createElement('div');
        _toolsMenu.className = 'lb-tools-menu';
        _toolsMenu.innerHTML =
            '<div class="lb-tools-menu-item" data-tool="collections"><i class="fa-solid fa-layer-group"></i>Collections</div>' +
            '<div class="lb-tools-menu-item" data-tool="annotations"><i class="fa-solid fa-highlighter"></i>Annotations</div>' +
            '<div class="lb-tools-menu-item" data-tool="settings"><i class="fa-solid fa-sliders"></i>Settings</div>';
        document.body.appendChild(_toolsMenu);

        _toolbar.addEventListener('click', function(e) {
            e.stopPropagation();
            if (_toolbarCta && _toolbarCta.contains(e.target)) return;
            _toolsOpen = !_toolsOpen;
            _toolsMenu.classList.toggle('show', _toolsOpen);
            _toolbarGear.classList.toggle('active', _toolsOpen);
            if (_toolsOpen) clearTimeout(_toolbarHideTimer);
            else _resetToolbarHideTimer();
        });

        _toolsMenu.querySelector('[data-tool="settings"]').addEventListener('click', function() {
            _closeToolsMenu();
            if (_readingPanel) _readingPanel.classList.toggle('show');
        });

        _toolsMenu.querySelector('[data-tool="annotations"]').addEventListener('click', function() {
            _closeToolsMenu();
            var annFab = document.querySelector('.lb-ann-fab');
            if (annFab) annFab.click();
        });

        _toolsMenu.querySelector('[data-tool="collections"]').addEventListener('click', function() {
            _closeToolsMenu();
            var collFab = document.querySelector('.lb-coll-fab');
            if (collFab) collFab.click();
        });

        document.addEventListener('click', _toolsOutsideClick);
        document.addEventListener('pointerdown', _onToolbarOutsideClick);
        window.addEventListener('scroll', _onToolbarScroll, { passive: true });

        _toolbar.addEventListener('mouseenter', function() { clearTimeout(_toolbarHideTimer); });
        _toolbar.addEventListener('mouseleave', function() { if (_toolbarVisible) _resetToolbarHideTimer(); });

        initReadingSettings();

        var totalWords = (articleData.content || '').split(/\s+/).filter(Boolean).length;
        var totalMin = Math.max(1, Math.ceil(totalWords / 200));
        _toolbarProgress.textContent = totalMin + ' min left';
        var _progArticle = document.querySelector('.lb-article');
        var _cachedArticleTop = _progArticle ? _progArticle.offsetTop : 0;
        var _cachedArticleH = _progArticle ? _progArticle.offsetHeight : 0;
        var _cachedViewH = window.innerHeight;
        var _progressRaf = false;

        _progResizeHandler = function() {
            if (_progArticle) { _cachedArticleTop = _progArticle.offsetTop; _cachedArticleH = _progArticle.offsetHeight; }
            _cachedViewH = window.innerHeight;
        };
        window.addEventListener('resize', _progResizeHandler, { passive: true });

        _progressHandler = function() {
            if (_progressRaf) return;
            _progressRaf = true;
            requestAnimationFrame(function() {
                _progressRaf = false;
                if (!_toolbarProgress || !_progressFill || !_progArticle) return;
                var scrolled = window.scrollY - _cachedArticleTop;
                var total = _cachedArticleH - _cachedViewH;
                if (total <= 0) return;
                var pct = Math.max(0, Math.min(100, (scrolled / total) * 100));
                _progressFill.style.width = pct + '%';
                var minLeft = Math.max(0, Math.ceil(totalMin * (1 - pct / 100)));
                _toolbarProgress.textContent = minLeft > 0 ? minLeft + ' min left' : 'Done reading';
            });
        };
        window.addEventListener('scroll', _progressHandler, { passive: true });
        _progressHandler();

        if (_progressBar) _progressBar.classList.add('visible');

        var _g = window.gsap;
        if (_g && !B._reducedMotion) {
            _g.set(_toolbar, { opacity: 0, y: 20, scale: 0.85, visibility: 'visible' });
            _g.to(_toolbar, {
                opacity: 1, y: 0, scale: 1,
                duration: 0.5, delay: 0.6,
                ease: 'back.out(1.6)',
                onComplete: function() { _toolbarVisible = true; _resetToolbarHideTimer(); }
            });
        } else {
            _toolbar.style.opacity = '1';
            _toolbar.style.visibility = 'visible';
            _toolbarVisible = true;
            _resetToolbarHideTimer();
        }

        window._blogToolbarCta = function(type, href, icon) {
            if (!_toolbarCta) return;
            _toolbarCta.href = href;
            _toolbarCta.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
            _toolbarCta.classList.add('show');
            _toolbarCtaDivider.classList.remove('hidden');
            if (_g && !B._reducedMotion) {
                _g.from(_toolbarCta, { scale: 0, opacity: 0, duration: 0.35, ease: 'back.out(2)' });
                _g.from(_toolbarCtaDivider, { scaleY: 0, opacity: 0, duration: 0.2, delay: 0.1 });
            }
        };
    }

    function _closeToolsMenu() {
        _toolsOpen = false;
        if (_toolsMenu) _toolsMenu.classList.remove('show');
        if (_toolbarGear) _toolbarGear.classList.remove('active');
    }

    function _toolsOutsideClick(e) {
        if (_toolsOpen && _toolbarGear && _toolsMenu && !_toolbarGear.contains(e.target) && !_toolsMenu.contains(e.target)) {
            _closeToolsMenu();
        }
    }

    function _teardownToolbar() {
        if (_toolbar) { _toolbar.remove(); _toolbar = null; }
        if (_toolsMenu) { _toolsMenu.remove(); _toolsMenu = null; }
        _toolbarCta = null; _toolbarCtaDivider = null;
        _toolbarProgress = null; _toolbarGear = null;
        _toolsOpen = false;
        destroyReadingSettings();
        destroyProgressBar();
    }

    function destroyArticleToolbar() {
        document.removeEventListener('click', _toolsOutsideClick);
        document.removeEventListener('pointerdown', _onToolbarOutsideClick);
        window.removeEventListener('scroll', _onToolbarScroll);
        clearTimeout(_toolbarHideTimer);
        _toolbarVisible = false;
        if (_progressHandler) { window.removeEventListener('scroll', _progressHandler); _progressHandler = null; }
        if (_progResizeHandler) { window.removeEventListener('resize', _progResizeHandler); _progResizeHandler = null; }
        window._blogToolbarCta = null;

        var _g = window.gsap;
        if (_g && _toolbar && !B._reducedMotion) {
            var tb = _toolbar;
            _g.killTweensOf(tb);
            _g.to(tb, {
                opacity: 0, y: 12, scale: 0.9,
                duration: 0.25, ease: 'power2.in',
                onComplete: function() { tb.remove(); }
            });
            if (_toolsMenu) { _toolsMenu.remove(); _toolsMenu = null; }
            _toolbar = null;
            _toolbarCta = null; _toolbarCtaDivider = null;
            _toolbarProgress = null; _toolbarGear = null;
            _toolsOpen = false;
            destroyReadingSettings();
            destroyProgressBar();
        } else {
            _teardownToolbar();
        }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 4: FOOTNOTES
       ═══════════════════════════════════════════════════ */
    function processFootnotes(html) {
        var refs = {};
        var refRegex = /\[\^(\w+)\]/g;
        var defRegex = /<p>\[\^(\w+)\]:\s*([\s\S]*?)<\/p>/g;

        html = html.replace(defRegex, function(_, id, text) {
            refs[id] = text.trim();
            return '';
        });

        html = html.replace(refRegex, function(_, id) {
            if (!refs[id]) return '[^' + id + ']';
            return '<sup><a href="#fn-' + id + '" class="lb-fn-ref" data-fn="' + esc(id) + '" data-fn-text="' + esc(refs[id]) + '">' + id + '</a></sup>';
        });

        if (Object.keys(refs).length) {
            html += '<div class="lb-footnotes"><div class="lb-footnotes-title">Footnotes</div>';
            Object.keys(refs).forEach(function(id) {
                html += '<div class="lb-footnote-item" id="fn-' + id + '"><span class="lb-footnote-num">' + id + '.</span><span>' + refs[id] + ' <a class="lb-footnote-back" href="#fnref-' + id + '">↩</a></span></div>';
            });
            html += '</div>';
        }
        return html;
    }

    function bindFootnoteTooltips() {
        document.querySelectorAll('.lb-fn-ref').forEach(function(ref) {
            ref.id = 'fnref-' + ref.dataset.fn;
            ref.addEventListener('mouseenter', function(e) {
                var existing = document.querySelector('.lb-footnote-tooltip');
                if (existing) existing.remove();
                var tip = document.createElement('div');
                tip.className = 'lb-footnote-tooltip';
                tip.textContent = ref.dataset.fnText;
                document.body.appendChild(tip);
                var rect = ref.getBoundingClientRect();
                tip.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
                tip.style.top = (rect.bottom + window.scrollY + 6) + 'px';
            });
            ref.addEventListener('mouseleave', function() {
                var tip = document.querySelector('.lb-footnote-tooltip');
                if (tip) tip.remove();
            });
        });
    }

    /* ═══════════════════════════════════════════════════
       PHASE 4: IMAGE GALLERIES
       ═══════════════════════════════════════════════════ */
    function processGalleries(html) {
        // Add lazy loading + async decoding to all article body images
        html = html.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy" decoding="async"');

        html = html.replace(/<p>\s*(<img[^>]+>)\s*<\/p>/g, function(_, imgTag) {
            const alt = (imgTag.match(/alt="([^"]*)"/) || [])[1] || '';
            if (alt) {
                return '<figure>' + imgTag + '<figcaption>' + esc(alt) + '</figcaption></figure>';
            }
            return '<figure>' + imgTag + '</figure>';
        });

        html = html.replace(/(<figure>[\s\S]*?<\/figure>\s*){2,}/g, function(match) {
            return '<div class="lb-gallery">' +
                match.replace(/<\/?figure>/g, '').replace(/<figcaption>[\s\S]*?<\/figcaption>/g, '') +
                '</div>';
        });
        return html;
    }

    /* ═══════════════════════════════════════════════════
       PHASE 4: SEO — DYNAMIC OG + JSON-LD + RSS
       ═══════════════════════════════════════════════════ */
    var _originalOG = {};

    function updateOGMeta(article) {
        var url = window.location.origin + window.location.pathname + '?post=' + encodeURIComponent(article.slug);
        var tags = { 'og:title': article.title, 'og:description': article.excerpt || article.title, 'og:url': url, 'og:type': 'article',
            'twitter:title': article.title, 'twitter:description': article.excerpt || article.title };
        if (article.cover_image) { tags['og:image'] = article.cover_image; tags['og:image:width'] = '1200'; tags['og:image:height'] = '630'; tags['twitter:image'] = article.cover_image; }
        Object.keys(tags).forEach(function(prop) {
            var attr = prop.startsWith('twitter:') ? 'name' : 'property';
            var el = document.querySelector('meta[' + attr + '="' + prop + '"]');
            if (el) {
                if (!_originalOG[prop]) _originalOG[prop] = el.getAttribute('content');
                el.setAttribute('content', tags[prop]);
            } else {
                el = document.createElement('meta');
                el.setAttribute(attr, prop);
                el.setAttribute('content', tags[prop]);
                document.head.appendChild(el);
                _originalOG[prop] = null;
            }
        });
    }

    function restoreOGMeta() {
        Object.keys(_originalOG).forEach(function(prop) {
            var attr = prop.startsWith('twitter:') ? 'name' : 'property';
            var el = document.querySelector('meta[' + attr + '="' + prop + '"]');
            if (el) {
                if (_originalOG[prop] !== null) el.setAttribute('content', _originalOG[prop]);
                else el.remove();
            }
        });
        _originalOG = {};
    }

    function injectArticleJsonLd(article) {
        removeArticleJsonLd();
        var ld = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: article.title,
            description: article.excerpt || '',
            datePublished: new Date(article.created_at).toISOString(),
            dateModified: new Date(article.updated_at || article.created_at).toISOString(),
            author: { '@type': 'Person', name: 'Amr Elharony', url: 'https://amrelharony.com' },
            publisher: { '@type': 'Person', name: 'Amr Elharony' },
            url: window.location.origin + window.location.pathname + '?post=' + encodeURIComponent(article.slug),
            wordCount: (article.content || '').split(/\s+/).filter(Boolean).length,
            keywords: (article.tags || []).join(', ')
        };
        if (article.cover_image) ld.image = article.cover_image;
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = 'lb-article-jsonld';
        s.textContent = JSON.stringify(ld);
        document.head.appendChild(s);
    }

    function removeArticleJsonLd() {
        var el = document.getElementById('lb-article-jsonld');
        if (el) el.remove();
    }

    function xmlEsc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function generateRSS() {
        var allFeedArticles = B._allFeedArticles || [];
        if (!allFeedArticles.length) { if (window.UniToast) window.UniToast('No articles to export.', '', '⚠️', 'warn'); return; }
        var origin = window.location.origin + window.location.pathname;
        var items = allFeedArticles.map(function(a) {
            return '<item><title>' + xmlEsc(a.title) + '</title>' +
                '<link>' + origin + '?post=' + encodeURIComponent(a.slug) + '</link>' +
                '<description>' + xmlEsc(a.excerpt || '') + '</description>' +
                '<pubDate>' + new Date(a.created_at).toUTCString() + '</pubDate>' +
                '<guid>' + origin + '?post=' + encodeURIComponent(a.slug) + '</guid>' +
                (a.tags ? a.tags.map(function(t) { return '<category>' + xmlEsc(t) + '</category>'; }).join('') : '') +
                '</item>';
        }).join('\n');
        var rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n' +
            '<title>The Bilingual Executive Blog — Amr Elharony</title>\n' +
            '<link>' + origin + '?blog=feed</link>\n' +
            '<description>Deep dives on Agile, FinTech, and Digital Transformation</description>\n' +
            '<language>en-us</language>\n' +
            '<atom:link href="' + origin + '?blog=feed" rel="self" type="application/rss+xml"/>\n' +
            items + '\n</channel>\n</rss>';
        var blob = new Blob([rss], { type: 'application/rss+xml' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'feed.xml';
        a.click();
        URL.revokeObjectURL(a.href);
        snd('success');
        if (window.UniToast) window.UniToast('RSS feed downloaded!', '', '📡', 'success');
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: REVIEW PAGE
       ═══════════════════════════════════════════════════ */
    async function renderReview(token) {
        destroyArticleToolbar();
        destroyProgressBar();
        B.destroyTextSelection();
        B.destroyTTS();
        B._destroyReadingHistory();
        B.destroyAnnotationsPanel();
        B.destroyCollectionsPanel();
        B.blogView.innerHTML = '<div class="lb-wrap"><div id="lbReviewContent">' + B.articleSkeleton() + '</div></div>';
        window.scrollTo(0, 0);

        if (!window._sb) {
            document.getElementById('lbReviewContent').innerHTML = '<div class="lb-404"><div class="lb-404-code">503</div><div class="lb-404-msg">Unable to connect.</div></div>';
            return;
        }

        try {
            var res = await window._sb
                .from('article_reviews')
                .select('*, longform_articles(*)')
                .eq('review_token', token)
                .single();

            if (res.error || !res.data || !res.data.longform_articles) {
                document.getElementById('lbReviewContent').innerHTML = '<div class="lb-404"><div class="lb-404-code">404</div><div class="lb-404-msg">Review link not found or expired.</div></div>';
                return;
            }

            var review = res.data;
            var article = review.longform_articles;
            var isExpired = new Date(review.expires_at) < new Date();
            var comments = review.comments || [];
            var contentHtml = B.parseMarkdown(article.content);

            document.getElementById('lbReviewContent').innerHTML =
                '<div class="lb-review-banner">' +
                '<span class="lb-review-banner-text">DRAFT REVIEW' + (isExpired ? ' (EXPIRED)' : '') + '</span>' +
                '<span style="font-size:9px;color:var(--sub)">Expires: ' + new Date(review.expires_at).toLocaleDateString() + '</span>' +
                '</div>' +
                '<article class="lb-article">' +
                '<header class="lb-article-header">' +
                '<h1 class="lb-article-h1">' + esc(article.title) + '</h1>' +
                (article.excerpt ? '<p class="lb-article-excerpt">' + esc(article.excerpt) + '</p>' : '') +
                '</header>' +
                '<div class="lb-content">' + contentHtml + '</div>' +
                '</article>' +
                (!isExpired ? '<div class="lb-review-sidebar">' +
                '<h3 class="lb-related-title">LEAVE A COMMENT</h3>' +
                '<input class="lb-cms-input" id="lbReviewName" placeholder="Your name" style="margin-bottom:8px">' +
                '<textarea class="lb-cms-textarea" id="lbReviewText" placeholder="Share your feedback..." rows="3" style="min-height:80px;border:1px solid var(--border);margin-bottom:8px"></textarea>' +
                '<button class="lb-cms-btn primary" id="lbReviewSubmit">Submit Feedback</button>' +
                '</div>' : '') +
                (comments.length ? '<div class="lb-review-sidebar" style="margin-top:16px"><h3 class="lb-related-title">REVIEWER COMMENTS (' + comments.length + ')</h3>' +
                comments.map(function(c) {
                    return '<div class="lb-review-comment">' +
                        '<span class="lb-review-comment-author">' + esc(c.reviewer || 'Anonymous') + '</span>' +
                        '<div class="lb-review-comment-text">' + esc(c.text) + '</div>' +
                        '<span class="lb-review-comment-meta">' + (c.created_at ? B.timeAgo(c.created_at) : '') + '</span>' +
                        '</div>';
                }).join('') + '</div>' : '');

            if (!isExpired) {
                document.getElementById('lbReviewSubmit').addEventListener('click', async function() {
                    var name = (document.getElementById('lbReviewName').value || '').trim() || 'Anonymous';
                    var text = (document.getElementById('lbReviewText').value || '').trim();
                    if (!text) return;
                    this.disabled = true;
                    this.textContent = 'Submitting...';
                    try {
                        await window._sb.rpc('add_review_comment', { p_token: token, p_reviewer: name, p_comment_text: text, p_paragraph_index: 0 });
                        snd('success');
                        if (window.UniToast) window.UniToast('Feedback submitted!', '', '✅', 'success');
                        renderReview(token);
                    } catch (e) {
                        this.disabled = false;
                        this.textContent = 'Submit Feedback';
                        if (window.UniToast) window.UniToast('Failed to submit feedback.', '', '⚠️', 'warn');
                    }
                });
            }

            highlightCode();
        } catch (e) {
            document.getElementById('lbReviewContent').innerHTML = '<div class="lb-404"><div class="lb-404-code">500</div><div class="lb-404-msg">Something went wrong.</div></div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       ARTICLE READER VIEW
       ═══════════════════════════════════════════════════ */
    async function renderArticle(slug) {
        B._destroyReadingHistory();
        B.destroyAnnotationsPanel();
        B.destroyCollectionsPanel();
        B._updateSidebarActive('');
        const gen = B._routeGen;
        B.blogView.innerHTML = `
      <div class="lb-wrap">
        <nav class="lb-nav" role="navigation" aria-label="Article navigation">
          <div style="display:flex;align-items:center;gap:16px">
            <a class="lb-nav-back" id="lbBackFeed" tabindex="0" role="link"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> <span>Articles</span></a>
            <span class="lb-nav-sep" aria-hidden="true"></span>
            <a class="lb-nav-brand" id="lbBrandHome2" tabindex="0" role="link">AMR ELHARONY</a>
          </div>
        </nav>
        <div id="lbArticle" aria-live="polite">${B.articleSkeleton()}</div>
      </div>`;

        var _brandEl2 = document.getElementById('lbBrandHome2');
        _brandEl2.addEventListener('click', e => { e.preventDefault(); B.goToPortfolio(); });
        _brandEl2.addEventListener('dblclick', function(e) { e.preventDefault(); e.stopPropagation(); if (window.openBlogAdmin) window.openBlogAdmin(); });
        (function() {
            var _bLastTap = 0;
            _brandEl2.addEventListener('touchend', function(e) {
                var now = Date.now();
                if (now - _bLastTap < 350) { e.preventDefault(); e.stopPropagation(); if (window.openBlogAdmin) window.openBlogAdmin(); }
                _bLastTap = now;
            });
        })();
        document.getElementById('lbBackFeed').addEventListener('click', e => { e.preventDefault(); B.navigateTo({ blog: 'feed' }); });

        if (B._scrambleBrand) {
            setTimeout(function() { B._scrambleBrand(document.getElementById('lbBrandHome2'), 'AMR ELHARONY'); }, 300);
        }

        B.blogView.setAttribute('tabindex', '-1');
        B.blogView.focus({ preventScroll: true });

        if (!window._sb) {
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">503</div><div class="lb-404-msg">Unable to connect.</div></div>';
            return;
        }

        try {
            const articleCacheKey = 'article:' + slug;
            let data, error;
            const cachedArticle = B._getCached(articleCacheKey);
            if (cachedArticle) {
                data = cachedArticle;
                error = null;
            } else {
                const signal = B._abortPrevious();
                const res = await window._sb
                    .from('longform_articles')
                    .select('*')
                    .eq('slug', slug)
                    .eq('published', true)
                    .single()
                    .abortSignal(signal);
                data = res.data;
                error = res.error;
                if (!error && data) B._setCache(articleCacheKey, data);
            }

            if (gen !== B._routeGen) return;

            if (error || !data) {
                document.getElementById('lbArticle').innerHTML = `
          <div class="lb-404" role="alert">
            <div class="lb-404-code">404</div>
            <div class="lb-404-msg">Article not found.</div>
            <button class="lb-nav-back" style="margin-top:24px" onclick="window._blogNav({blog:'feed'})">
              <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to Articles
            </button>
          </div>`;
                return;
            }

            B.currentArticle = data;

            document.title = `${data.title} — Amr Elharony`;
            updateMeta(data.excerpt || data.title);
            updateCanonical('?post=' + encodeURIComponent(slug));
            updateOGMeta(data);
            injectArticleJsonLd(data);

            if (!B._viewedSlugs.has(slug)) {
                B._viewedSlugs.add(slug);
                window._sb.rpc('increment_article_views', { article_slug: slug }).then(function(){}, function(){});
            }

            const contentHtml = processFootnotes(processGalleries(B.parseMarkdown(data.content)));
            const articleUrl = window.location.origin + window.location.pathname + '?post=' + encodeURIComponent(slug);

            document.getElementById('lbArticle').innerHTML = `
        <article class="lb-article" itemscope itemtype="https://schema.org/BlogPosting" data-article-id="${data.id}">
          <header class="lb-article-header">
            <div class="lb-article-date lb-reveal"><time datetime="${new Date(data.created_at).toISOString()}" itemprop="datePublished">${fmtDate(data.created_at)}</time></div>
            <h1 class="lb-article-h1 lb-reveal" itemprop="headline">${esc(data.title)}</h1>
            ${data.excerpt ? `<p class="lb-article-excerpt lb-reveal" itemprop="description">${esc(data.excerpt)}</p>` : ''}
            <div class="lb-article-meta lb-reveal">
              <span itemprop="author" itemscope itemtype="https://schema.org/Person"><meta itemprop="name" content="Amr Elharony">${B.readingTime(data.content)}</span>
              <span aria-label="${data.views || 0} views">👁 ${data.views || 0} views</span>
            </div>
          </header>
          ${data.cover_image ? `<img class="lb-cover-img lb-reveal" src="${esc(data.cover_image)}" alt="${esc(data.title)}" itemprop="image" fetchpriority="high">` : ''}
          <div class="lb-content has-dropcap" itemprop="articleBody">${contentHtml}</div>
          ${(data.tags || []).length ? `<div class="lb-article-tags lb-reveal">${(data.tags || []).map(t => `<span class="lb-card-tag" itemprop="keywords">${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="lb-reactions" id="lbReactions"></div>
          <footer class="lb-article-footer lb-reveal">
            <div class="lb-share-panel">
              <a class="lb-share-icon twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title + (data.excerpt ? '\n\n' + data.excerpt : ''))}&url=${encodeURIComponent(articleUrl)}" target="_blank" rel="noopener" title="Share on X" aria-label="Share on X"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a>
              <button class="lb-share-icon linkedin" id="lbShareLinkedIn" title="Share on LinkedIn" aria-label="Share on LinkedIn"><i class="fa-brands fa-linkedin-in" aria-hidden="true"></i></button>
              <a class="lb-share-icon whatsapp" href="https://wa.me/?text=${encodeURIComponent(data.title + (data.excerpt ? '\n\n' + data.excerpt : '') + '\n\n' + articleUrl)}" target="_blank" rel="noopener" title="Share on WhatsApp" aria-label="Share on WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
              <a class="lb-share-icon telegram" href="https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(data.title + (data.excerpt ? '\n\n' + data.excerpt : ''))}" target="_blank" rel="noopener" title="Share on Telegram" aria-label="Share on Telegram"><i class="fa-brands fa-telegram" aria-hidden="true"></i></a>
              <a class="lb-share-icon email" href="mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(data.title + (data.excerpt ? '\n\n' + data.excerpt : '') + '\n\n' + articleUrl)}" title="Share via Email" aria-label="Share via Email"><i class="fa-solid fa-envelope" aria-hidden="true"></i></a>
              <button class="lb-share-icon" id="lbCopyLink" title="Copy Link" aria-label="Copy article link"><i class="fa-solid fa-link" aria-hidden="true"></i></button>
              <button class="lb-bookmark-btn" id="lbBookmarkArticle"><i class="fa-regular fa-bookmark" aria-hidden="true"></i> Bookmark</button>
              <button class="lb-tts-btn" id="lbTtsBtn"><i class="fa-solid fa-headphones" aria-hidden="true"></i> Listen</button>
            </div>
          </footer>
          <div class="lb-author-card lb-reveal">
            <img class="lb-author-avatar" src="Assets/profile.jpg" alt="Amr Elharony" loading="lazy">
            <div class="lb-author-info">
              <div class="lb-author-name">Amr Elharony</div>
              <div class="lb-author-bio">Delivery Lead, Mentor, FinTech Author & Speaker — bridging banking and technology to deliver measurable digital transformation across MENA.</div>
              <div class="lb-author-links">
                <a class="lb-author-link" href="https://www.linkedin.com/in/amrmelharony" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin-in"></i> LinkedIn</a>
                <a class="lb-author-link" href="https://t.me/Amrmelharony" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> Telegram</a>
                <a class="lb-author-link" href="https://adplist.org/mentors/amr-elharony" target="_blank" rel="noopener"><i class="fa-solid fa-calendar-check"></i> ADPList</a>
              </div>
            </div>
          </div>
          <div id="lbCommentsSection"></div>
        </article>`;

            var copyBtn = document.getElementById('lbCopyLink');
            copyBtn.addEventListener('click', function() {
                function onCopied() {
                    if (window.UniToast && window.UniToast.add) window.UniToast.add('Link copied!', '', '\ud83d\udccb', 'success');
                    else if (window.UniToast) window.UniToast('Link copied!');
                    snd('success');
                    var icon = copyBtn.querySelector('i');
                    if (icon) { icon.className = 'fa-solid fa-check'; }
                    copyBtn.classList.add('copied');
                    setTimeout(function() {
                        if (icon) { icon.className = 'fa-solid fa-link'; }
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(articleUrl).then(onCopied).catch(function() {
                        _fallbackCopy(articleUrl) ? onCopied() : prompt('Copy this link:', articleUrl);
                    });
                } else {
                    _fallbackCopy(articleUrl) ? onCopied() : prompt('Copy this link:', articleUrl);
                }
                if (B._telemetry) B._telemetry.track('copy_link', { article_id: data.id, slug: data.slug });
            });

            // LinkedIn Share: copy excerpt + link to clipboard, then open LinkedIn
            var liBtn = document.getElementById('lbShareLinkedIn');
            if (liBtn) {
                liBtn.addEventListener('click', function() {
                    var shareText = data.title;
                    if (data.excerpt) shareText += '\n\n' + data.excerpt;
                    shareText += '\n\n' + articleUrl;

                    var linkedInUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(articleUrl);

                    // Copy composed text to clipboard so user can paste it
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(shareText).then(function() {
                            if (window.UniToast) {
                                if (window.UniToast.add) window.UniToast.add('Article text copied! Paste it in your LinkedIn post.', '', '📋', 'success');
                                else window.UniToast('Article text copied! Paste it in your LinkedIn post.');
                            }
                        }).catch(function() {});
                    } else if (typeof _fallbackCopy === 'function') {
                        _fallbackCopy(shareText);
                    }

                    // Open LinkedIn share window
                    window.open(linkedInUrl, '_blank', 'noopener,width=600,height=500');

                    if (B._telemetry) B._telemetry.track('share_linkedin', { article_id: data.id, slug: data.slug });
                    snd('success');
                });
            }

            if (B._telemetry) {
                document.querySelectorAll('.lb-share-icon[class*=" "]').forEach(function(a) {
                    a.addEventListener('click', function() {
                        var platform = (a.classList.contains('twitter') ? 'x' : a.classList.contains('linkedin') ? 'linkedin' : a.classList.contains('whatsapp') ? 'whatsapp' : a.classList.contains('telegram') ? 'telegram' : a.classList.contains('email') ? 'email' : null);
                        if (platform) B._telemetry.track('share_' + platform, { article_id: data.id, slug: data.slug });
                    });
                });
                var ttsBtn = document.getElementById('lbTtsBtn');
                if (ttsBtn) ttsBtn.addEventListener('click', function() { B._telemetry.track('tts_start', { article_id: data.id }); }, { once: true });
                var bmBtn = document.getElementById('lbBookmarkArticle');
                if (bmBtn) bmBtn.addEventListener('click', function() { B._telemetry.track('bookmark', { article_id: data.id, slug: data.slug }); }, { once: true });
            }

            B.renderReactionBar(data);
            B.initBookmarkBtn(data.slug);
            B.renderComments(data.id);
            B.initTextSelection(data);

            highlightCode();
            buildTOC(document.querySelector('.lb-article'));

            renderSeriesNav(data);
            renderRelated(data);
            B.initTTS(data);

            initLightbox();
            bindFootnoteTooltips();

            await B._mergeCloudAnnotations(data.id);
            B.applyHighlights(data.id);
            B.initAnnotationsPanel(data.id);
            B.initCollectionsPanel();
            initArticleToolbar(data);
            B._initReadingHistory(data);

            var _artEl = document.querySelector('.lb-article');
            var _artContent = document.querySelector('.lb-content');
            var _artContainer = document.getElementById('lbArticle') || B.blogView;

            var _gsapEntrance = B._gsapArticleEntrance && B._gsapArticleEntrance(_artEl);
            var _gsapReveals = B._gsapArticleScrollReveals && B._gsapArticleScrollReveals(_artContent);

            if (!_gsapEntrance || !_gsapReveals) {
                if (_artContent) {
                    _artContent.querySelectorAll('h2,h3,figure,blockquote,.callout,.lb-gallery,hr,pre').forEach(function(el) {
                        el.classList.add('lb-reveal');
                    });
                }
                var tocEl = document.querySelector('.lb-toc');
                if (tocEl) tocEl.classList.add('lb-reveal-left');
                var relatedEl = document.querySelector('.lb-related');
                if (relatedEl) relatedEl.classList.add('lb-reveal');
                var seriesEl = document.querySelector('.lb-series-nav');
                if (seriesEl) seriesEl.classList.add('lb-reveal');
                var newsletterEl = document.querySelector('.lb-newsletter');
                if (newsletterEl) newsletterEl.classList.add('lb-reveal');

                if (!B._gsapScrollReveals || !B._gsapScrollReveals(_artContainer)) {
                    B._initScrollReveals(_artContainer);
                }
            }

            if (B._telemetry) {
                B._telemetry.observeImpressions(_artEl);
                B._telemetry.trackScrollDepth(_artContent);
            }

        } catch (e) {
            if (gen !== B._routeGen) return;
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">500</div><div class="lb-404-msg">Something went wrong.</div></div>';
        }
    }

    /* ── Code Highlighting ── */
    function highlightCode() {
        var container = document.getElementById('lbArticle');
        if (!container) return;

        container.querySelectorAll('pre').forEach(function(pre) {
            if (pre.querySelector('.lb-copy-btn')) return;
            var codeEl = pre.querySelector('code');

            var lang = '';
            if (codeEl) {
                var cls = (codeEl.className || '').match(/language-(\w+)/);
                if (cls) lang = cls[1];
            }
            if (lang) {
                var langLabel = document.createElement('span');
                langLabel.className = 'lb-code-lang';
                langLabel.textContent = lang;
                pre.appendChild(langLabel);
            }

            var btn = document.createElement('button');
            btn.className = 'lb-copy-btn';
            btn.textContent = 'Copy';
            btn.addEventListener('click', function() {
                var text = codeEl ? codeEl.textContent : pre.textContent;
                function onDone() { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000); }
                function onFail() { btn.textContent = 'Failed'; setTimeout(function() { btn.textContent = 'Copy'; }, 2000); }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(onDone).catch(function() { _fallbackCopy(text) ? onDone() : onFail(); });
                } else {
                    _fallbackCopy(text) ? onDone() : onFail();
                }
                if (window._haptic) window._haptic.tap();
            });
            pre.appendChild(btn);
        });

        if (window.Prism) {
            window.Prism.highlightAllUnder(container);
        } else if (!document.getElementById('prism-core-js')) {
            var script = document.createElement('script');
            script.id = 'prism-core-js';
            script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1/prism.min.js';
            script.setAttribute('data-manual', '');
            script.onload = function() {
                var autoloader = document.createElement('script');
                autoloader.src = 'https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js';
                autoloader.onload = function() {
                    if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
                        window.Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1/components/';
                    }
                    var target = document.getElementById('lbArticle');
                    if (target && window.Prism) window.Prism.highlightAllUnder(target);
                };
                document.head.appendChild(autoloader);
            };
            document.head.appendChild(script);
        }

        if (container.querySelector('.lb-tweet-embed') && !document.getElementById('twitter-wjs')) {
            var tw = document.createElement('script');
            tw.id = 'twitter-wjs';
            tw.src = 'https://platform.twitter.com/widgets.js';
            tw.async = true;
            document.head.appendChild(tw);
        } else if (window.twttr && window.twttr.widgets) {
            window.twttr.widgets.load(container);
        }
    }

    /* ── Table of Contents ── */
    function buildTOC(articleEl) {
        if (!articleEl) return;
        var content = articleEl.querySelector('.lb-content');
        if (!content) return;
        var headings = content.querySelectorAll('h2, h3');
        if (headings.length < 2) return;

        var items = [];
        var usedIds = {};
        headings.forEach(function(h) {
            var text = h.textContent.trim();
            var base = h.id || B.slugify(text);
            if (!base) base = 'section';
            var id = base;
            if (usedIds[id]) { usedIds[id]++; id = base + '-' + usedIds[id]; } else { usedIds[id] = 1; }
            h.id = id;
            items.push({ id: id, text: text, depth: h.tagName === 'H3' ? 3 : 2 });
        });

        var tocHtml = '<nav class="lb-toc" aria-label="Table of contents">' +
            '<button class="lb-toc-toggle" aria-expanded="true">Contents (' + items.length + ')</button>' +
            '<ol class="lb-toc-list">' +
            items.map(function(it) {
                return '<li class="lb-toc-item"><a class="lb-toc-link depth-' + it.depth + '" href="#' + it.id + '" data-toc-id="' + it.id + '">' + esc(it.text) + '</a></li>';
            }).join('') +
            '</ol></nav>';

        content.insertAdjacentHTML('beforebegin', tocHtml);

        var toc = articleEl.querySelector('.lb-toc');
        var toggle = toc.querySelector('.lb-toc-toggle');
        toggle.addEventListener('click', function() {
            toc.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', !toc.classList.contains('collapsed'));
        });

        toc.querySelectorAll('.lb-toc-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.getElementById(link.dataset.tocId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, '', '#' + link.dataset.tocId);
                }
                if (window._haptic) window._haptic.tap();
            });
        });

        var tocLinks = toc.querySelectorAll('.lb-toc-link');
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    tocLinks.forEach(function(l) { l.classList.remove('active'); });
                    var active = toc.querySelector('[data-toc-id="' + entry.target.id + '"]');
                    if (active) active.classList.add('active');
                }
            });
        }, { rootMargin: '-10% 0px -80% 0px' });

        headings.forEach(function(h) { observer.observe(h); });

        articleEl._tocObserver = observer;
    }

    /* ── Reading Progress Bar ── */
    var _progressBar = null, _progressFill = null, _progressHandler = null, _progResizeHandler = null;

    function initProgressBar() {
        destroyProgressBar();
        _progressBar = document.createElement('div');
        _progressBar.className = 'lb-progress-bar';
        _progressBar.innerHTML = '<div class="lb-progress-fill"></div>';
        document.body.appendChild(_progressBar);
        _progressFill = _progressBar.querySelector('.lb-progress-fill');
    }

    function destroyProgressBar() {
        if (_progressBar) { _progressBar.remove(); _progressBar = null; _progressFill = null; }
    }

    function updateMeta(description) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', description);
    }

    function updateCanonical(queryString) {
        var link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = window.location.origin + window.location.pathname + queryString;
    }

    /* Register public functions on B */
    B.renderNewsletter = renderNewsletter;
    B.renderRelated = renderRelated;
    B.renderSeriesNav = renderSeriesNav;
    B.initLightbox = initLightbox;
    B.destroyLightbox = destroyLightbox;
    B.initArticleToolbar = initArticleToolbar;
    B.destroyArticleToolbar = destroyArticleToolbar;
    B.processFootnotes = processFootnotes;
    B.bindFootnoteTooltips = bindFootnoteTooltips;
    B.processGalleries = processGalleries;
    B.updateOGMeta = updateOGMeta;
    B.restoreOGMeta = restoreOGMeta;
    B.injectArticleJsonLd = injectArticleJsonLd;
    B.removeArticleJsonLd = removeArticleJsonLd;
    B.generateRSS = generateRSS;
    B.renderReview = renderReview;
    B.renderArticle = renderArticle;
    B.highlightCode = highlightCode;
    B.buildTOC = buildTOC;
    B.initProgressBar = initProgressBar;
    B.destroyProgressBar = destroyProgressBar;
    B.updateMeta = updateMeta;
    B.updateCanonical = updateCanonical;
})();
