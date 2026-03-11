// blog-router.js — Router, navigation, route handling
(function() {
    'use strict';
    var B = window._Blog;

    function getRoute() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('review')) return { view: 'review', token: params.get('review') };
        if (params.has('blog')) {
            const val = params.get('blog');
            if (val && val !== 'feed') return { view: 'article', slug: val };
            return { view: 'feed' };
        }
        if (params.has('post')) return { view: 'article', slug: params.get('post') };
        return { view: 'portfolio' };
    }

    function navigateTo(params) {
        if (getRoute().view === 'feed') B._feedScrollY = window.scrollY;
        const url = new URL(window.location.origin + window.location.pathname);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        window.history.pushState({}, '', url);
        B.transitionTo(function() { _handleRouteCore(); });
    }

    function goToPortfolio() {
        const url = new URL(window.location.origin + window.location.pathname);
        window.history.pushState({}, '', url);
        B.transitionTo(function() { _handleRouteCore(); });
    }

    function handleRoute() {
        _handleRouteCore();
    }

    function _handleRouteCore() {
        B._routeGen++;
        B._destroyScrollReveals();
        const route = getRoute();

        if (route.view === 'feed') {
            B.showBlogView();
            B.renderFeed();
        } else if (route.view === 'article') {
            B.showBlogView();
            B.renderArticle(route.slug);
        } else if (route.view === 'review') {
            B.showBlogView();
            B.renderReview(route.token);
        } else {
            B.showPortfolio();
        }
    }

    function showBlogView() {
        var forceCSS = document.getElementById('portfolioForceCSS');
        if (forceCSS) forceCSS.remove();
        if (B.app) B.app.style.setProperty('display', 'none', 'important');
        B.blogView.classList.add('active');
        B.blogView.style.display = 'block';
        document.body.classList.add('blog-mobile-active');
        var ww = document.getElementById('weatherWidget');
        if (ww) ww.style.display = 'none';
        document.querySelectorAll('.smart-cta').forEach(function(el) {
            el.dataset.blogHidden = el.style.display || '';
            el.style.display = 'none';
        });
        B._showSidebarToggle();
        window.scrollTo(0, 0);
    }

    function showPortfolio() {
        document.body.classList.remove('blog-mobile-active');
        var ww = document.getElementById('weatherWidget');
        if (ww) ww.style.display = '';
        B._hideSidebarToggle();
        B._destroyScrollReveals();
        B.destroyArticleToolbar();
        B.destroyProgressBar();
        B.destroyTextSelection();
        B.destroyTTS();
        B.destroyLightbox();
        B._destroyReadingHistory();
        B.destroyAnnotationsPanel();
        B.destroyCollectionsPanel();
        var _orphanTip = document.querySelector('.lb-footnote-tooltip');
        if (_orphanTip) _orphanTip.remove();
        B.restoreOGMeta();
        B.removeArticleJsonLd();
        var directCSS = document.getElementById('blogDirectCSS');
        if (directCSS) directCSS.remove();

        // Inject CSS override that forces all animated elements visible
        var forceCSS = document.getElementById('portfolioForceCSS');
        if (!forceCSS) {
            forceCSS = document.createElement('style');
            forceCSS.id = 'portfolioForceCSS';
            forceCSS.textContent = '#app{display:block!important;opacity:1!important}' +
                '.rv,.sa,.nd{opacity:1!important;transform:none!important}' +
                '.cert-card,.cert-grid,.tc-section,.tc-viewport,.tc-track,.tc-slide,.tc-card,.tc-cats,.tc-nav,.tc-dots,.tc-counter,.tc-auto-bar{opacity:1!important;visibility:visible!important}';
            document.head.appendChild(forceCSS);
        }

        if (B.app) {
            B.app.style.removeProperty('display');
            B.app.style.opacity = '1';
        }
        B.blogView.classList.remove('active');
        B.blogView.style.display = 'none';
        // Restore portfolio elements
        document.querySelectorAll('[data-blog-hidden]').forEach(el => {
            el.style.display = el.dataset.blogHidden;
            delete el.dataset.blogHidden;
        });
        // Force all animation classes resolved
        document.querySelectorAll('.rv').forEach(el => {
            el.classList.remove('rv');
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        document.querySelectorAll('.sa').forEach(el => {
            el.classList.add('vis');
        });

        // Re-render testimonial carousel (needs recalc after being in hidden container)
        if (window._rerenderTestimonials) {
            setTimeout(window._rerenderTestimonials, 50);
        } else {
            var _fTrack = document.getElementById('tcTrack');
            if (_fTrack && _fTrack.children.length === 0) {
                B.blogView.classList.remove('active');
                B.blogView.style.display = 'none';
                document.title = B.originalTitle;
                window.history.replaceState(null, '', window.location.pathname);
                window.location.reload();
                return;
            }
        }
        document.title = B.originalTitle;
        window.scrollTo(0, 0);
    }

    // popstate handler (line 2434-2436)
    window.addEventListener('popstate', function() {
        B.transitionTo(function() { _handleRouteCore(); });
    });

    // ESC / Backspace handler (lines 2438-2454)
    document.addEventListener('keydown', function(e) {
        if (!B.blogView.classList.contains('active')) return;
        if (e.key !== 'Escape' && e.key !== 'Backspace') return;
        var tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (B._sidebarOpen) { e.preventDefault(); e.stopPropagation(); B._closeSidebar(); return; }
        if (B.adminDialog && B.adminDialog.open) return;
        var ids = ['passkeyOverlay','shareOverlay','trophyOverlay','termOverlay','gameOverlay','shortcutOverlay','arcadeOverlay','miniGameOverlay','guestbookOverlay','gameCaseOverlay','ai3dOverlay','ttsReaderOverlay','cmdPaletteOverlay','nftMatOverlay','blogOverlay','easterEgg'];
        for (var i = 0; i < ids.length; i++) { var el = document.getElementById(ids[i]); if (el && (el.classList.contains('show') || el.classList.contains('visible'))) return; }
        e.preventDefault();
        e.stopPropagation();
        var route = getRoute();
        if (route.view === 'article') navigateTo({ blog: 'feed' });
        else goToPortfolio();
    }, true);

    // Register
    B.getRoute = getRoute;
    B.navigateTo = navigateTo;
    B.goToPortfolio = goToPortfolio;
    B.handleRoute = handleRoute;
    B.showBlogView = showBlogView;
    B.showPortfolio = showPortfolio;
})();
