// blog-feed.js — Feed rendering, article fetching, tag filters, search, pre-fetching
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;
    var fmtDate = B.fmtDate;

    var _prefetchedSlugs = new Set();
    var _searchDebounce = null;

    async function renderFeed() {
        B.destroyArticleToolbar();
        B.destroyProgressBar();
        B.destroyTextSelection();
        B.destroyTTS();
        B.destroyLightbox();
        B._destroyReadingHistory();
        B.destroyAnnotationsPanel();
        B.destroyCollectionsPanel();
        B._updateSidebarActive('feed');
        var _orphanTip = document.querySelector('.lb-footnote-tooltip');
        if (_orphanTip) _orphanTip.remove();
        B.blogView.innerHTML = `
      <div class="lb-wrap" style="max-width:900px">
        <nav class="lb-nav" role="navigation" aria-label="Blog navigation">
          <div style="display:flex;align-items:center;gap:16px">
            <button class="lb-nav-menu" id="lbNavMenu" title="Menu" aria-label="Open navigation menu"><i class="fa-solid fa-bars"></i></button>
            <a class="lb-nav-brand" id="lbBrandHome" tabindex="0" role="link">AMR ELHARONY</a>
          </div>
          <button class="lb-rss-btn" id="lbRssBtn" title="RSS Feed"><i class="fa-solid fa-rss"></i> <span>RSS</span></button>
        </nav>
        <header class="lb-feed-header lb-reveal">
          <h1 class="lb-feed-title">THE BILINGUAL<br>EXECUTIVE BLOG</h1>
          <p class="lb-feed-sub">DEEP DIVES ON AGILE, FINTECH, AND DIGITAL TRANSFORMATION</p>
          <div class="lb-feed-line" aria-hidden="true"></div>
        </header>
        <div class="lb-search-wrap lb-reveal" style="transition-delay:.1s">
          <i class="fa-solid fa-magnifying-glass lb-search-icon" aria-hidden="true"></i>
          <input class="lb-search-bar" id="lbSearchBar" type="text" placeholder="Search articles..." aria-label="Search articles">
          <button class="lb-search-clear" id="lbSearchClear" style="display:none">CLEAR</button>
        </div>
        <div class="lb-tag-filters" id="lbTagFilters"></div>
        <main id="lbGrid" role="feed" aria-label="Article list">${B.feedSkeleton()}</main>
        <div id="lbNewsletter"></div>
      </div>`;

        // Bind nav
        var _brandEl = document.getElementById('lbBrandHome');
        _brandEl.addEventListener('click', e => { e.preventDefault(); B.goToPortfolio(); });
        _brandEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); B.goToPortfolio(); } });
        _brandEl.addEventListener('dblclick', function(e) { e.preventDefault(); e.stopPropagation(); if (window.openBlogAdmin) window.openBlogAdmin(); });
        (function() {
            var _bLastTap = 0;
            _brandEl.addEventListener('touchend', function(e) {
                var now = Date.now();
                if (now - _bLastTap < 350) { e.preventDefault(); e.stopPropagation(); if (window.openBlogAdmin) window.openBlogAdmin(); }
                _bLastTap = now;
            });
        })();
        document.getElementById('lbNavMenu').addEventListener('click', function(){ B._openSidebar(); });

        if (B._scrambleBrand) {
            setTimeout(function() { B._scrambleBrand(document.getElementById('lbBrandHome'), 'AMR ELHARONY'); }, 300);
        }

        // Update page title, meta, and SEO tags
        document.title = 'Blog — Amr Elharony';
        B.updateMeta('The Bilingual Executive Blog — Deep dives on Agile, FinTech, and Digital Transformation by Amr Elharony.');
        B.updateCanonical('?blog=feed');
        B.restoreOGMeta();
        B.removeArticleJsonLd();

        // Focus management for SPA route change (a11y)
        B.blogView.setAttribute('tabindex', '-1');
        B.blogView.focus({ preventScroll: true });

        // Bind search
        bindSearchBar();

        // Bind RSS
        document.getElementById('lbRssBtn').addEventListener('click', B.generateRSS);

        // Reveal above-fold elements (header, search) immediately — don't wait for fetch
        var feedWrap = B.blogView.querySelector('.lb-wrap');
        if (!B._gsapFeedEntrance || !B._gsapFeedEntrance(feedWrap)) {
            if (feedWrap) B._initScrollReveals(feedWrap);
        }

        // Fetch articles
        await fetchArticles();

        // Merge cloud data, then render Continue Reading strip
        await B._mergeCloudReadingHistory();
        await B._mergeCloudLists();
        B.renderContinueReading();

        // Render newsletter signup
        B.renderNewsletter();
        if (B._gsapNewsletter) {
            var _nlEl = document.getElementById('lbNewsletter');
            B._gsapNewsletter(_nlEl);
            var _nlInner = _nlEl ? _nlEl.querySelector('.lb-newsletter') : null;
            if (_nlInner) _nlInner.classList.add('gsap-revealed');
        }

        // Observe any newly added elements (newsletter, continue reading, etc.)
        if (!B._gsapScrollReveals || !B._gsapScrollReveals(feedWrap)) {
            if (feedWrap) B._initScrollReveals(feedWrap);
        }
        if (B._gsapRefreshScrollTrigger) B._gsapRefreshScrollTrigger();
    }

    async function fetchArticles() {
        const gen = B._routeGen;
        const grid = document.getElementById('lbGrid');
        if (!grid) return;

        if (!window._sb) {
            grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">\ud83d\udce1</div>Unable to connect. Please try again later.</div>';
            return;
        }

        const cacheKey = 'feed';
        const cached = B._getCached(cacheKey);

        try {
            let data, error;
            if (cached) {
                data = cached;
                error = null;
            } else {
                const signal = B._abortPrevious();
                const res = await window._sb
                    .from('longform_articles')
                    .select('id,title,slug,excerpt,created_at,tags,views,published,series_name,cover_image,reactions')
                    .eq('published', true)
                    .order('created_at', { ascending: false })
                    .limit(B.PAGE_SIZE)
                    .abortSignal(signal);
                data = res.data;
                error = res.error;
                if (!error && data) B._setCache(cacheKey, data);
            }

            if (gen !== B._routeGen) return;

            if (error) throw error;
            B.articles = data || [];

            if (!B.articles.length) {
                grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">✍️</div>No articles published yet.<br>Check back soon.</div>';
                return;
            }

            B._allFeedArticles = B.articles;
            B._migrateBookmarks();
            B._ensureDefaultList();
            buildTagFilters(B.articles);
            renderFeedCards(B.articles);
            bindFeedFilters();

            if (B._feedScrollY > 0) {
                window.scrollTo(0, B._feedScrollY);
                grid.querySelectorAll('.lb-reveal').forEach(function(el) {
                    if (el.getBoundingClientRect().top < window.innerHeight) {
                        el.classList.add('visible');
                    }
                });
                B._feedScrollY = 0;
            }

        } catch (e) {
            if (gen !== B._routeGen) return;
            grid.innerHTML = '<div class="lb-empty" role="alert"><div class="lb-empty-icon">⚠️</div>Failed to load articles.</div>';
        }
    }

    function _articleRxCount(a) {
        var rx = a.reactions || {};
        return Object.keys(rx).reduce(function(s, k) { return s + (rx[k] || 0); }, 0);
    }

    function _isTrending(a) { return (a.views || 0) >= 50 || _articleRxCount(a) >= 10; }

    function renderFeedCards(list, filterMode) {
        var grid = document.getElementById('lbGrid');
        if (!grid) return;
        var bm = B.getBookmarks();

        if (!list.length) {
            var emptyMsg = 'No articles published yet.<br>Check back soon.';
            var emptyIcon = '✍️';
            if (filterMode === 'bookmarked') { emptyMsg = 'No bookmarked articles yet.'; emptyIcon = '🔖'; }
            else if (filterMode === 'history') { emptyMsg = 'No reading history yet.<br>Start reading to track progress.'; emptyIcon = '📖'; }
            else if (filterMode === 'tag') { emptyMsg = 'No articles found with this tag.'; emptyIcon = '🏷️'; }
            grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">' + emptyIcon + '</div>' + emptyMsg + '</div>';
            return;
        }

        var hero = list[0];
        var rest = list.slice(1);
        var heroBm = bm.indexOf(hero.slug) !== -1;

        var heroHtml = '<div class="lb-hero lb-reveal" data-slug="' + esc(hero.slug) + '" tabindex="0" role="article" aria-label="' + esc(hero.title) + '">' +
            (hero.cover_image ?
                '<img class="lb-hero-img" src="' + esc(hero.cover_image) + '" alt="' + esc(hero.title) + '" loading="eager" fetchpriority="high">' :
                '<div class="lb-hero-fallback"><span class="lb-hero-fallback-icon"><i class="fa-solid fa-newspaper"></i></span></div>') +
            '<div class="lb-hero-gradient"></div>' +
            '<div class="lb-hero-body">' +
            '<div class="lb-hero-date">' + (_isTrending(hero) ? '<span class="lb-trending-badge"><i class="fa-solid fa-fire"></i> TRENDING</span>' : '') + fmtDate(hero.created_at) + '</div>' +
            '<div class="lb-hero-title">' + esc(hero.title) + '</div>' +
            '<div class="lb-hero-excerpt">' + esc((hero.excerpt || '').slice(0, 160)) + '</div>' +
            '<div class="lb-hero-meta"><span>👁 ' + (hero.views || 0) + ' views</span>' +
            (hero.series_name ? '<span class="lb-series-badge" style="opacity:1">' + esc(hero.series_name) + '</span>' : '') +
            '</div></div>' +
            '<button class="lb-card-v2-bookmark' + (heroBm ? ' active' : '') + '" data-bm="' + esc(hero.slug) + '" style="top:16px;right:16px"><i class="fa-' + (heroBm ? 'solid' : 'regular') + ' fa-bookmark"></i></button>' +
            '</div>';

        var cardsHtml = rest.length ? '<div class="lb-card-grid">' + rest.map(function(a, idx) {
            var isBookmarked = bm.indexOf(a.slug) !== -1;
            var rxCount = _articleRxCount(a);
            var colDelay = (idx % 2) * 0.07;
            return '<article class="lb-card-v2 lb-reveal" style="transition-delay:' + colDelay.toFixed(2) + 's" data-slug="' + esc(a.slug) + '" tabindex="0" role="article" aria-label="' + esc(a.title) + '">' +
                (a.cover_image ?
                    '<img class="lb-card-v2-img" src="' + esc(a.cover_image) + '" alt="' + esc(a.title) + '" loading="lazy">' :
                    '<div class="lb-card-v2-fallback"><i class="fa-solid fa-feather-pointed"></i></div>') +
                '<button class="lb-card-v2-bookmark' + (isBookmarked ? ' active' : '') + '" data-bm="' + esc(a.slug) + '"><i class="fa-' + (isBookmarked ? 'solid' : 'regular') + ' fa-bookmark"></i></button>' +
                '<div class="lb-card-v2-body">' +
                '<div class="lb-card-v2-date">' + fmtDate(a.created_at) +
                (_isTrending(a) ? ' <span class="lb-trending-badge"><i class="fa-solid fa-fire"></i> TRENDING</span>' : '') +
                '</div>' +
                '<div class="lb-card-v2-title">' + esc(a.title) + '</div>' +
                '<div class="lb-card-v2-excerpt">' + esc((a.excerpt || '').slice(0, 120)) + '</div>' +
                '<div class="lb-card-v2-footer">' +
                '<div class="lb-card-v2-tags">' +
                (a.tags || []).slice(0, 2).map(function(t) { return '<span class="lb-card-tag">' + esc(t) + '</span>'; }).join('') +
                (a.series_name ? '<span class="lb-series-badge">' + esc(a.series_name) + '</span>' : '') +
                '</div>' +
                '<div class="lb-card-v2-stats lb-social-proof">' +
                '<span>👁 ' + (a.views || 0) + '</span>' +
                (rxCount ? '<span>❤ ' + rxCount + '</span>' : '') +
                '</div>' +
                (function() {
                    var rh = B._getReadingHist();
                    var entry = rh[a.id];
                    if (entry && entry.progress > 0 && !entry.completed) {
                        return '<div class="lb-card-v2-progress"><div class="lb-card-v2-progress-fill" style="width:' + Math.round(entry.progress) + '%"></div></div>';
                    }
                    return '';
                })() +
                '</div></div></article>';
        }).join('') + '</div>' : '';

        grid.innerHTML = heroHtml + cardsHtml;

        grid.querySelectorAll('.lb-hero,.lb-card-v2').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.lb-card-v2-bookmark')) return;
                B.navigateTo({ post: card.dataset.slug });
                snd('tap');
            });
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    B.navigateTo({ post: card.dataset.slug });
                    snd('tap');
                }
            });
        });

        grid.querySelectorAll('.lb-card-v2-bookmark').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var slug = btn.dataset.bm;
                var art = B._allFeedArticles.find(function(a) { return a.slug === slug; });
                var articleId = art ? art.id : slug;
                B._showCollPopover(btn, articleId, slug);
            });
        });

        if (B._gsapCardMicro) {
            grid.querySelectorAll('.lb-hero,.lb-card-v2').forEach(function(card) {
                B._gsapCardMicro(card);
            });
        }

        var heroEl = grid.querySelector('.lb-hero');
        if (heroEl && B._gsapHeroParallax) B._gsapHeroParallax(heroEl);

        if (!B._gsapScrollReveals || !B._gsapScrollReveals(grid)) {
            B._initScrollReveals(grid);
        }
        _initPredictivePrefetch(grid);

        if (B._telemetry) B._telemetry.observeFeedCards(grid);
    }

    function _initPredictivePrefetch(grid) {
        if (!grid || !window._sb) return;
        grid.querySelectorAll('[data-slug]').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                var slug = card.dataset.slug;
                if (!slug || _prefetchedSlugs.has(slug) || B._getCached('article:' + slug)) return;
                _prefetchedSlugs.add(slug);
                B.scheduleIdle(function() {
                    window._sb.from('longform_articles')
                        .select('*')
                        .eq('slug', slug)
                        .eq('published', true)
                        .single()
                        .then(function(r) {
                            if (r.data) {
                                B._setCache('article:' + slug, r.data);
                                B.scheduleIdle(function() {
                                    if (r.data.content) {
                                        var cacheKey = 'md:' + slug;
                                        if (!B._getCached(cacheKey)) {
                                            B.parseMarkdownAsync(r.data.content, function(html) {
                                                B._setCache(cacheKey, html);
                                            });
                                        }
                                    }
                                }, 1000);
                            }
                        })
                        .catch(function() {});
                }, 200);
            }, { once: true });
        });
    }

    function buildTagFilters(articles) {
        var container = document.getElementById('lbTagFilters');
        if (!container) return;
        var tagSet = {};
        articles.forEach(function(a) { (a.tags || []).forEach(function(t) { tagSet[t] = (tagSet[t] || 0) + 1; }); });
        var sorted = Object.keys(tagSet).sort(function(a, b) { return tagSet[b] - tagSet[a]; }).slice(0, 10);
        if (!sorted.length) { container.style.display = 'none'; return; }

        var listsForChips = B._getAllLists();
        var collChips = '';
        if (listsForChips.length > 1) {
            collChips = '<span class="lb-coll-chip-wrap"><button class="lb-tag-chip" data-filter="collections"><i class="fa-solid fa-layer-group"></i> Collections <i class="fa-solid fa-caret-down" style="font-size:8px;margin-left:2px"></i></button></span>';
        } else if (listsForChips.length === 1) {
            collChips = '<button class="lb-tag-chip" data-filter="list:' + listsForChips[0].id + '"><i class="fa-solid fa-bookmark"></i> Saved</button>';
        }
        container.innerHTML =
            '<button class="lb-tag-chip active" data-filter="all">All</button>' +
            collChips +
            '<button class="lb-tag-chip" data-filter="history"><i class="fa-solid fa-clock-rotate-left"></i> History</button>' +
            sorted.map(function(t) { return '<button class="lb-tag-chip" data-filter="tag:' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    }

    function bindFeedFilters() {
        var filters = document.getElementById('lbTagFilters');
        if (!filters) return;
        filters.querySelectorAll('.lb-tag-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                var filter = chip.dataset.filter;

                if (filter === 'collections') {
                    _showCollChipDropdown(chip);
                    return;
                }

                filters.querySelectorAll('.lb-tag-chip').forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');

                if (filter.startsWith('list:')) {
                    var listId = filter.slice(5);
                    var list = B._getListById(listId);
                    if (list) {
                        var slugs = list.items.map(function(it) { return it.slug; });
                        var artIds = list.items.map(function(it) { return it.articleId; });
                        renderFeedCards(B._allFeedArticles.filter(function(a) {
                            return slugs.indexOf(a.slug) !== -1 || artIds.indexOf(a.id) !== -1;
                        }), 'bookmarked');
                    }
                } else if (filter === 'history') {
                    var rh = B._getReadingHist();
                    var histIds = Object.keys(rh);
                    renderFeedCards(B._allFeedArticles.filter(function(a) { return histIds.indexOf(a.id) !== -1; }), 'history');
                } else if (filter.startsWith('tag:')) {
                    var tag = filter.slice(4);
                    renderFeedCards(B._allFeedArticles.filter(function(a) { return (a.tags || []).indexOf(tag) !== -1; }), 'tag');
                } else {
                    renderFeedCards(B._allFeedArticles, 'all');
                }
                snd('tap');
            });
        });
    }

    function _showCollChipDropdown(chipEl) {
        var existing = document.querySelector('.lb-coll-chip-dropdown');
        if (existing) { existing.remove(); return; }
        var lists = B._getAllLists();
        if (!lists.length) return;

        var dd = document.createElement('div');
        dd.className = 'lb-coll-chip-dropdown';
        dd.innerHTML = lists.map(function(l) {
            return '<div class="lb-coll-popover-item" data-list-id="' + l.id + '">' +
                '<span class="lb-coll-popover-emoji">' + (l.emoji || '📑') + '</span>' +
                '<span class="lb-coll-popover-name">' + esc(l.name) + ' (' + l.items.length + ')</span></div>';
        }).join('');

        var wrap = chipEl.closest('.lb-coll-chip-wrap');
        if (wrap) wrap.appendChild(dd);
        else { chipEl.parentNode.appendChild(dd); dd.style.position = 'absolute'; }

        dd.querySelectorAll('.lb-coll-popover-item').forEach(function(item) {
            item.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var listId = item.dataset.listId;
                var filters = document.getElementById('lbTagFilters');
                if (filters) {
                    filters.querySelectorAll('.lb-tag-chip').forEach(function(c) { c.classList.remove('active'); });
                    chipEl.classList.add('active');
                }
                var list = B._getListById(listId);
                if (list) {
                    var slugs = list.items.map(function(it) { return it.slug; });
                    var artIds = list.items.map(function(it) { return it.articleId; });
                    renderFeedCards(B._allFeedArticles.filter(function(a) {
                        return slugs.indexOf(a.slug) !== -1 || artIds.indexOf(a.id) !== -1;
                    }), 'bookmarked');
                }
                dd.remove();
                snd('tap');
            });
        });

        setTimeout(function() {
            function dismissDD(ev) {
                if (!dd.contains(ev.target) && ev.target !== chipEl) {
                    dd.remove();
                    document.removeEventListener('mousedown', dismissDD);
                    document.removeEventListener('touchstart', dismissDD);
                }
            }
            document.addEventListener('mousedown', dismissDD);
            document.addEventListener('touchstart', dismissDD);
        }, 0);
    }

    function bindSearchBar() {
        var input = document.getElementById('lbSearchBar');
        var clearBtn = document.getElementById('lbSearchClear');
        if (!input || !clearBtn) return;

        input.addEventListener('input', function() {
            var q = input.value.trim();
            clearBtn.style.display = q ? 'block' : 'none';
            if (_searchDebounce) clearTimeout(_searchDebounce);
            if (!q) {
                renderFeedCards(B._allFeedArticles);
                bindFeedFilters();
                return;
            }
            _searchDebounce = setTimeout(function() { performSearch(q); }, 300);
        });

        clearBtn.addEventListener('click', function() {
            input.value = '';
            clearBtn.style.display = 'none';
            renderFeedCards(B._allFeedArticles);
            bindFeedFilters();
            input.focus();
        });
    }

    async function performSearch(query) {
        var grid = document.getElementById('lbGrid');
        if (!grid || !window._sb) return;
        grid.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">🔍</div>Searching...</div>';

        try {
            var result = await window._sb.rpc('search_articles', { query: query });
            var data = result.data || [];
            if (!data.length) {
                grid.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">🔍</div>No results for "' + esc(query) + '"</div>';
                return;
            }
            grid.innerHTML = data.map(function(a) {
                return '<article class="lb-card lb-search-result" data-slug="' + esc(a.slug) + '" tabindex="0" role="article">' +
                    '<div class="lb-card-date"><time>' + fmtDate(a.created_at) + '</time></div>' +
                    '<div class="lb-card-title">' + esc(a.title) + '</div>' +
                    '<div class="lb-card-excerpt">' + (a.headline || esc((a.excerpt || '').slice(0, B.MAX_EXCERPT))) + '</div>' +
                    '<div class="lb-card-meta">' +
                    (a.tags || []).map(function(t) { return '<span class="lb-card-tag">' + esc(t) + '</span>'; }).join('') +
                    (a.views ? '<span class="lb-card-views">👁 ' + a.views + '</span>' : '') +
                    '</div></article>';
            }).join('');
            grid.querySelectorAll('.lb-card').forEach(function(card) {
                card.addEventListener('click', function() { B.navigateTo({ post: card.dataset.slug }); snd('tap'); });
            });
        } catch (e) {
            grid.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div>Search failed.</div>';
        }
    }

    // Register
    B.renderFeed = renderFeed;
    B.fetchArticles = fetchArticles;
    B.renderFeedCards = renderFeedCards;
    B.buildTagFilters = buildTagFilters;
    B.bindFeedFilters = bindFeedFilters;
    B._articleRxCount = _articleRxCount;
    B._isTrending = _isTrending;
})();
