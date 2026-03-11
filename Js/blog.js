// blog.js — Orchestrator for the Longform Blog SPA
// Wires all modules together, exposes window globals, sets up initial route.
// Requires: blog-core.js, blog-editor.js, blog-ui.js, blog-router.js,
//           blog-feed.js, blog-article.js, blog-tts.js, blog-social.js,
//           blog-reader-data.js, blog-admin.js, blog-analytics.js
(function() {
    'use strict';
    var B = window._Blog;
    if (!B || !B.blogView) return;

    /* ── Window exports ── */
    window._blogNav = function(params) { B.navigateTo(params); };
    window._blogGoHome = B.goToPortfolio;
    window.openBlogAdmin = B.openAdmin;
    window._hasBlogAdminSession = function() { return !!B.adminSession; };

    /* ── Terminal integration ── */
    if (window.TermCmds) {
        window.TermCmds.blog_articles = function() {
            setTimeout(function() { B.navigateTo({ blog: 'feed' }); }, 200);
            return '<span class="term-green">\ud83d\udcdd Opening Blog...</span>';
        };
        if (window.TermCmds._meta) {
            window.TermCmds._meta['blog_articles'] = { cat: 'APPS', desc: 'Read Amr\'s longform blog articles' };
        }
    }

    /* ── Initial route check ── */
    setTimeout(function() {
        var route = B.getRoute();
        if (route.view !== 'portfolio') {
            B.handleRoute();
        }
        if (new URLSearchParams(location.search).has('admin')) {
            B.openAdmin();
        }
    }, 100);
})();
