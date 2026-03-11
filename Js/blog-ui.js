// blog-ui.js — DOM references, sidebar, page transitions, scroll reveals, skeletons
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;

    // DOM References
    B.app = document.getElementById('app');
    B.blogView = document.getElementById('blogView');
    B.adminDialog = document.getElementById('blogAdmin');

    if (!B.blogView) return;

    // Sidebar state (private)
    var _sidebarEl = null;
    var _sidebarToggle = null;
    var _sidebarOverlay = null;
    B._sidebarOpen = false;

    function _createSidebar() {
        if (_sidebarEl) return;

        _sidebarOverlay = document.createElement('div');
        _sidebarOverlay.className = 'lb-sidebar-overlay';
        document.body.appendChild(_sidebarOverlay);

        _sidebarEl = document.createElement('aside');
        _sidebarEl.className = 'lb-sidebar';
        _sidebarEl.setAttribute('aria-label', 'Blog sidebar navigation');
        var weatherEl = document.getElementById('weatherWidget');
        var weatherHTML = '';
        if (weatherEl) {
            var iconEl = document.getElementById('weatherIcon');
            var tempEl = document.getElementById('weatherTemp');
            var iconContent = iconEl ? iconEl.innerHTML : '<i class="fa-solid fa-cloud"></i>';
            var tempContent = tempEl ? tempEl.textContent : '--°C';
            weatherHTML = '<div class="lb-sidebar-weather">' + iconContent + ' ' + tempContent + '</div>';
        }

        _sidebarEl.innerHTML =
            '<div class="lb-sidebar-header">' +
                '<span class="lb-sidebar-brand">NAVIGATION</span>' +
                '<button class="lb-sidebar-close" aria-label="Close sidebar"><i class="fa-solid fa-xmark"></i></button>' +
            '</div>' +
            weatherHTML +
            '<ul class="lb-sidebar-nav">' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="portfolio"><i class="fa-solid fa-house"></i> Home</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link active" data-nav="feed"><i class="fa-solid fa-newspaper"></i> All Articles</button></li>' +
                '<div class="lb-sidebar-divider"></div>' +
                '<div class="lb-sidebar-section">Portfolio</div>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="journey"><i class="fa-solid fa-road"></i> The Journey</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="certs"><i class="fa-solid fa-certificate"></i> Certifications</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="testimonials"><i class="fa-solid fa-quote-left"></i> Testimonials</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="newsletters"><i class="fa-solid fa-envelope-open-text"></i> Newsletters</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-nav="writing"><i class="fa-solid fa-pen-nib"></i> Writing</button></li>' +
                '<div class="lb-sidebar-divider"></div>' +
                '<div class="lb-sidebar-section">Tools</div>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-action="rss"><i class="fa-solid fa-rss"></i> RSS Feed</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-action="theme"><i class="fa-solid fa-moon" id="lbSidebarThemeIcon"></i> Toggle Theme</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-action="terminal"><i class="fa-solid fa-terminal"></i> Terminal</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-action="arcade"><i class="fa-solid fa-gamepad"></i> Arcade</button></li>' +
                '<li class="lb-sidebar-item"><button class="lb-sidebar-link" data-action="shortcuts"><i class="fa-solid fa-keyboard"></i> Shortcuts</button></li>' +
                '<div class="lb-sidebar-divider"></div>' +
                '<div class="lb-sidebar-section">Connect</div>' +
                '<li class="lb-sidebar-item"><a class="lb-sidebar-link" href="https://www.linkedin.com/in/amrmelharony" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin"></i> LinkedIn</a></li>' +
                '<li class="lb-sidebar-item"><a class="lb-sidebar-link" href="https://calendly.com/amrmelharony/30min" target="_blank" rel="noopener"><i class="fa-solid fa-calendar-check"></i> Book a Call</a></li>' +
                '<li class="lb-sidebar-item"><a class="lb-sidebar-link" href="https://bilingualexecutive.amrelharony.com/" target="_blank" rel="noopener"><i class="fa-solid fa-book"></i> The Book</a></li>' +
            '</ul>';
        document.body.appendChild(_sidebarEl);

        _sidebarToggle = document.createElement('button');
        _sidebarToggle.className = 'lb-sidebar-toggle';
        _sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
        _sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        document.body.appendChild(_sidebarToggle);

        _sidebarToggle.addEventListener('click', _toggleSidebar);
        _sidebarEl.querySelector('.lb-sidebar-close').addEventListener('click', _closeSidebar);
        _sidebarOverlay.addEventListener('click', _closeSidebar);

        _sidebarEl.querySelectorAll('.lb-sidebar-link[data-nav]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var nav = btn.dataset.nav;
                _closeSidebar();
                if (nav === 'portfolio') {
                    if (window._blogNav) window._blogNav({});
                } else if (nav === 'feed') {
                    if (window._blogNav) window._blogNav({ blog: 'feed' });
                } else {
                    if (window._blogNav) window._blogNav({});
                    var sectionMap = { journey: 'secJourney', certs: 'secCerts', testimonials: 'secTestimonials', newsletters: 'secNewsletters', writing: 'secContentHub' };
                    var targetId = sectionMap[nav];
                    if (targetId) {
                        setTimeout(function() {
                            var el = document.getElementById(targetId);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 400);
                    }
                }
            });
        });

        _sidebarEl.querySelectorAll('.lb-sidebar-link[data-action]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var action = btn.dataset.action;
                _closeSidebar();
                if (action === 'rss') {
                    if (typeof B.generateRSS === 'function') B.generateRSS();
                } else if (action === 'theme') {
                    var themeBtn = document.getElementById('tbtn');
                    if (themeBtn) themeBtn.click();
                    var sIcon = document.getElementById('lbSidebarThemeIcon');
                    if (sIcon) {
                        var isLight = document.body.classList.contains('light-mode');
                        sIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                    }
                } else if (action === 'terminal') {
                    if (window.openTerm) window.openTerm();
                } else if (action === 'arcade') {
                    if (window._openArcade) window._openArcade();
                } else if (action === 'shortcuts') {
                    if (window.openShortcuts) window.openShortcuts();
                    else {
                        var scOverlay = document.getElementById('shortcutOverlay');
                        if (scOverlay) scOverlay.classList.add('show');
                    }
                }
            });
        });
    }

    function _toggleSidebar() {
        if (B._sidebarOpen) _closeSidebar(); else _openSidebar();
    }

    function _openSidebar() {
        if (!_sidebarEl) return;
        B._sidebarOpen = true;
        _sidebarEl.classList.add('open');
        _sidebarOverlay.classList.add('show');
        if (_sidebarToggle) {
            if (window.innerWidth > 768) _sidebarToggle.classList.add('shifted');
            _sidebarToggle.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }
        var sIcon = document.getElementById('lbSidebarThemeIcon');
        if (sIcon) sIcon.className = document.body.classList.contains('light-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        var weatherEl = document.getElementById('weatherWidget');
        var swEl = _sidebarEl.querySelector('.lb-sidebar-weather');
        if (weatherEl && swEl) {
            var iconEl = document.getElementById('weatherIcon');
            var tempEl = document.getElementById('weatherTemp');
            swEl.innerHTML = (iconEl ? iconEl.innerHTML : '') + ' ' + (tempEl ? tempEl.textContent : '--°C');
        }
    }

    function _closeSidebar() {
        if (!_sidebarEl) return;
        B._sidebarOpen = false;
        _sidebarEl.classList.remove('open');
        _sidebarOverlay.classList.remove('show');
        if (_sidebarToggle) {
            _sidebarToggle.classList.remove('shifted');
            _sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
    }

    function _showSidebarToggle() {
        _createSidebar();
        if (_sidebarToggle) _sidebarToggle.classList.add('blog-active');
    }

    function _hideSidebarToggle() {
        _closeSidebar();
        if (_sidebarToggle) _sidebarToggle.classList.remove('blog-active');
    }

    function _updateSidebarActive(view) {
        if (!_sidebarEl) return;
        _sidebarEl.querySelectorAll('.lb-sidebar-link[data-nav]').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.nav === view);
        });
    }

    // Early route check (lines 2175-2182)
    (function earlyRouteCheck() {
        var p = new URLSearchParams(window.location.search);
        if (p.has('blog') || p.has('post') || p.has('review')) {
            if (B.app) B.app.style.display = 'none';
            B.blogView.style.display = 'block';
            B.blogView.classList.add('active');
        }
    })();

    // Page transition state (private)
    var _transitionEl = null;
    var _transitionActive = false;
    var _scrollRevealObserver = null;
    B._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function _ensureTransitionEl() {
        if (_transitionEl) return _transitionEl;
        _transitionEl = document.createElement('div');
        _transitionEl.className = 'lb-transition';
        document.body.appendChild(_transitionEl);
        return _transitionEl;
    }

    function transitionTo(callback) {
        if (B._reducedMotion) { callback(); return; }
        if (B._gsapRouteTransition && B._gsapRouteTransition(callback)) return;
        var el = _ensureTransitionEl();
        if (_transitionActive) {
            el.classList.remove('active');
            _transitionActive = false;
        }
        _transitionActive = true;
        el.classList.add('active');
        setTimeout(function() {
            callback();
            setTimeout(function() {
                el.classList.remove('active');
                _transitionActive = false;
            }, 60);
        }, 220);
    }

    function _initScrollReveals(container) {
        if (B._reducedMotion) {
            container.querySelectorAll('.lb-reveal,.lb-reveal-left').forEach(function(el) { el.classList.add('visible'); });
            return;
        }
        if (!_scrollRevealObserver) {
            _scrollRevealObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        if (_scrollRevealObserver) _scrollRevealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        }
        container.querySelectorAll('.lb-reveal:not(.visible),.lb-reveal-left:not(.visible)').forEach(function(el) {
            _scrollRevealObserver.observe(el);
        });
    }

    function _destroyScrollReveals() {
        if (_scrollRevealObserver) {
            _scrollRevealObserver.disconnect();
            _scrollRevealObserver = null;
        }
        if (B._gsapKillScrollTriggers) B._gsapKillScrollTriggers();
    }

    function feedSkeleton() {
        return '<div class="lb-skel-hero"><div class="lb-skeleton" style="border:none;height:100%"><div class="lb-skel-line w40"></div><div class="lb-skel-line w80 h24" style="margin-top:16px"></div><div class="lb-skel-line w60"></div></div></div>' +
            '<div class="lb-skel-grid">' + Array.from({ length: 4 }, function() {
                return '<div class="lb-skel-card"><div class="lb-skel-card-img"></div><div class="lb-skel-card-body"><div class="lb-skel-line w80 h24"></div><div class="lb-skel-line w60"></div><div class="lb-skel-line w40"></div></div></div>';
            }).join('') + '</div>';
    }

    function articleSkeleton() {
        return `<div style="max-width:800px;margin:0 auto">
      <div class="lb-skeleton" style="border:none;padding:0">
        <div class="lb-skel-line w40"></div>
        <div class="lb-skel-line w80 h24" style="margin-top:16px"></div>
        <div class="lb-skel-line w60"></div>
      </div>
      <div style="margin-top:48px">
        ${Array.from({ length: 8 }, () => '<div class="lb-skel-line"></div>').join('')}
      </div>
    </div>`;
    }

    // Register ALL public functions on B
    B._createSidebar = _createSidebar;
    B._toggleSidebar = _toggleSidebar;
    B._openSidebar = _openSidebar;
    B._closeSidebar = _closeSidebar;
    B._showSidebarToggle = _showSidebarToggle;
    B._hideSidebarToggle = _hideSidebarToggle;
    B._updateSidebarActive = _updateSidebarActive;
    B.transitionTo = transitionTo;
    B._initScrollReveals = _initScrollReveals;
    B._destroyScrollReveals = _destroyScrollReveals;
    B.feedSkeleton = feedSkeleton;
    B.articleSkeleton = articleSkeleton;
})();
