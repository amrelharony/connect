// blog-gsap.js — GSAP-powered blog animations (entrance, scroll reveals, transitions, parallax, micro-interactions)
(function() {
    'use strict';
    var B = window._Blog;
    if (!B) return;

    var _gsap = window.gsap;
    var _ST = window.ScrollTrigger;

    if (_gsap && _ST) {
        _gsap.registerPlugin(_ST);
    }

    function _ok() { return _gsap && !B._reducedMotion; }
    function _stOk() { return _ok() && _ST; }

    // ─── Mood Animation Profiles (synced with Emotion Engine) ───

    var MOOD_PROFILES = {
        neutral:     { ds: 1,    ease: 'power3.out',          titleEase: 'back.out(1.3)',          ss: 1,    yBase: 1,    parallax: 6  },
        warm:        { ds: 1.1,  ease: 'power3.out',          titleEase: 'back.out(1.6)',          ss: 1.1,  yBase: 1.15, parallax: 8  },
        playful:     { ds: 1.05, ease: 'elastic.out(1,0.45)', titleEase: 'elastic.out(1,0.4)',     ss: 1.15, yBase: 1.2,  parallax: 9  },
        focused:     { ds: 0.75, ease: 'power4.out',          titleEase: 'power4.out',             ss: 0.7,  yBase: 0.7,  parallax: 3  },
        determined:  { ds: 0.8,  ease: 'power4.out',          titleEase: 'power3.out',             ss: 0.75, yBase: 0.75, parallax: 4  },
        calm:        { ds: 1.3,  ease: 'power2.out',          titleEase: 'power2.out',             ss: 1.2,  yBase: 0.8,  parallax: 4  },
        serene:      { ds: 1.35, ease: 'power2.out',          titleEase: 'power2.out',             ss: 1.25, yBase: 0.75, parallax: 3  },
        intense:     { ds: 0.7,  ease: 'power4.out',          titleEase: 'power3.out',             ss: 0.6,  yBase: 0.85, parallax: 10 },
        melancholy:  { ds: 1.4,  ease: 'power2.inOut',        titleEase: 'power2.out',             ss: 1.3,  yBase: 0.6,  parallax: 3  },
        surprised:   { ds: 0.9,  ease: 'elastic.out(1,0.35)', titleEase: 'elastic.out(1,0.3)',     ss: 0.9,  yBase: 1.3,  parallax: 7  },
        curious:     { ds: 1,    ease: 'power3.out',          titleEase: 'back.out(1.5)',          ss: 1.2,  yBase: 1.1,  parallax: 6  }
    };

    function _getMoodProfile(moodOverride) {
        var mood = moodOverride;
        if (!mood) {
            try {
                var ee = window._emotionEngine;
                mood = (ee && ee.getMood) ? ee.getMood().mood : 'neutral';
            } catch (_) { mood = 'neutral'; }
        }
        var src = MOOD_PROFILES[mood] || MOOD_PROFILES.neutral;
        return { ds: src.ds, ease: src.ease, titleEase: src.titleEase, ss: src.ss, yBase: src.yBase, parallax: src.parallax };
    }

    var _articleMoodHandler = null;

    // ─── 1. Feed Entrance Timeline ───

    B._gsapFeedEntrance = function(wrapEl) {
        if (!_ok() || !wrapEl) return false;

        var blogView = wrapEl.closest('#blogView');
        if (blogView) blogView.classList.add('gsap-active');

        var tl = _gsap.timeline({ defaults: { ease: 'power3.out' } });

        var nav = wrapEl.querySelector('.lb-nav');
        var header = wrapEl.querySelector('.lb-feed-header');
        var title = wrapEl.querySelector('.lb-feed-title');
        var sub = wrapEl.querySelector('.lb-feed-sub');
        var line = wrapEl.querySelector('.lb-feed-line');
        var search = wrapEl.querySelector('.lb-search-wrap');
        var chips = wrapEl.querySelectorAll('.lb-tag-chip');

        if (nav) {
            tl.from(nav, { y: -24, opacity: 0, duration: 0.45 }, 0);
        }

        if (title) {
            tl.from(title, { y: 36, opacity: 0, duration: 0.6, ease: 'back.out(1.4)' }, 0.08);
        }

        if (sub) {
            tl.from(sub, { y: 20, opacity: 0, duration: 0.5 }, 0.2);
        }

        if (line) {
            tl.from(line, { scaleX: 0, transformOrigin: 'left center', duration: 0.5, ease: 'power2.out' }, 0.3);
        }

        if (search) {
            tl.from(search, { y: 24, opacity: 0, scale: 0.97, duration: 0.5 }, 0.25);
        }

        if (chips.length) {
            tl.from(chips, { x: -16, opacity: 0, stagger: 0.04, duration: 0.35 }, 0.35);
        }

        if (header) header.classList.add('gsap-revealed', 'visible');
        if (search) search.classList.add('gsap-revealed', 'visible');

        return true;
    };

    // ─── 2. ScrollTrigger Card/Element Reveals ───

    B._gsapScrollReveals = function(container) {
        if (!_stOk() || !container) return false;

        var blogView = container.closest('#blogView');
        if (blogView) blogView.classList.add('gsap-active');

        var revealEls = container.querySelectorAll('.lb-reveal:not(.gsap-revealed)');
        var revealLeftEls = container.querySelectorAll('.lb-reveal-left:not(.gsap-revealed)');
        if (revealEls.length) {
            _gsap.set(revealEls, { opacity: 0, y: 50, rotationX: 4 });

            _ST.batch(revealEls, {
                start: 'top 92%',
                onEnter: function(batch) {
                    _gsap.to(batch, {
                        opacity: 1, y: 0, rotationX: 0,
                        stagger: 0.08,
                        duration: 0.7,
                        ease: 'power3.out',
                        onComplete: function() {
                            batch.forEach(function(el) { el.classList.add('gsap-revealed', 'visible'); });
                        }
                    });
                },
                once: true
            });
        }

        if (revealLeftEls.length) {
            _gsap.set(revealLeftEls, { opacity: 0, x: -24 });

            _ST.batch(revealLeftEls, {
                start: 'top 92%',
                onEnter: function(batch) {
                    _gsap.to(batch, {
                        opacity: 1, x: 0,
                        stagger: 0.06,
                        duration: 0.55,
                        ease: 'power3.out',
                        onComplete: function() {
                            batch.forEach(function(el) { el.classList.add('gsap-revealed', 'visible'); });
                        }
                    });
                },
                once: true
            });
        }

        return true;
    };

    // ─── 3. GSAP Route Transition ───

    var _gsapTransitionActive = false;

    B._gsapRouteTransition = function(callback) {
        if (!_ok()) return false;

        if (_gsapTransitionActive) return false;
        _gsapTransitionActive = true;

        var overlay = document.querySelector('.lb-transition');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'lb-transition';
            document.body.appendChild(overlay);
        }

        overlay.style.pointerEvents = 'all';

        var tl = _gsap.timeline({
            onComplete: function() {
                _gsapTransitionActive = false;
                overlay.style.pointerEvents = 'none';
                _gsap.set(overlay, { clearProps: 'opacity' });
            }
        });

        tl.set(overlay, { opacity: 0 })
        .to(overlay, {
            opacity: 1,
            duration: 0.25,
            ease: 'power2.inOut'
        })
        .call(function() {
            try { callback(); } catch (e) { console.error('[blog-gsap] transition callback error:', e); }
            window.scrollTo(0, 0);
        })
        .to(overlay, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            delay: 0.05
        });

        return true;
    };

    // ─── 4. Hero Parallax ───

    B._gsapHeroParallax = function(heroEl) {
        if (!_stOk() || !heroEl) return;

        var img = heroEl.querySelector('.lb-hero-img');
        var body = heroEl.querySelector('.lb-hero-body');
        var gradient = heroEl.querySelector('.lb-hero-gradient');

        if (img) {
            _gsap.to(img, {
                yPercent: 15,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroEl,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.6
                }
            });
        }

        if (body) {
            _gsap.to(body, {
                y: -20,
                opacity: 0.6,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroEl,
                    start: 'center center',
                    end: 'bottom top',
                    scrub: 0.4
                }
            });
        }

        if (gradient) {
            _gsap.to(gradient, {
                opacity: 0.3,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroEl,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.5
                }
            });
        }
    };

    // ─── 5. Newsletter Entrance ───

    B._gsapNewsletter = function(nlEl) {
        if (!_stOk() || !nlEl) return;

        var container = nlEl.querySelector('.lb-newsletter');
        if (!container) return;

        var title = container.querySelector('.lb-newsletter-title');
        var sub = container.querySelector('.lb-newsletter-sub');
        var form = container.querySelector('.lb-newsletter-form');

        _gsap.set(container, { opacity: 0, y: 24 });

        var tl = _gsap.timeline({
            scrollTrigger: {
                trigger: container,
                start: 'top 90%',
                once: true
            },
            defaults: { ease: 'power3.out' }
        });

        tl.to(container, { opacity: 1, y: 0, duration: 0.5 });
        if (title) tl.from(title, { y: 10, opacity: 0, duration: 0.35 }, 0.1);
        if (sub) tl.from(sub, { y: 10, opacity: 0, duration: 0.35 }, 0.18);
        if (form) tl.from(form, { y: 12, opacity: 0, duration: 0.4 }, 0.26);
    };

    // ─── 6. Card Tap/Press Micro-interactions ───

    B._gsapCardMicro = function(card) {
        if (!_ok() || !card || card._gsapMicro) return;
        card._gsapMicro = true;

        card.addEventListener('pointerdown', function(e) {
            if (e.target.closest('.lb-card-v2-bookmark')) return;
            _gsap.to(card, { scale: 0.97, duration: 0.15, ease: 'power2.out' });
        });

        card.addEventListener('pointerup', function() {
            _gsap.to(card, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
        });

        card.addEventListener('pointerleave', function() {
            _gsap.to(card, { scale: 1, duration: 0.25, ease: 'power2.out', overwrite: true });
        });

        card.addEventListener('mouseenter', function() {
            _gsap.to(card, {
                boxShadow: '0 6px 28px rgba(0,225,255,.12), inset 0 1px 0 rgba(255,255,255,.06)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', function() {
            _gsap.to(card, {
                boxShadow: 'none',
                duration: 0.35,
                ease: 'power2.out'
            });
        });
    };

    // ─── 7. Article Entrance Timeline ───

    B._gsapArticleEntrance = function(articleEl) {
        if (!_ok() || !articleEl) return false;

        var blogView = articleEl.closest('#blogView');
        if (blogView) blogView.classList.add('gsap-active');

        var p = _getMoodProfile();
        var tl = _gsap.timeline({ defaults: { ease: p.ease } });

        var date = articleEl.querySelector('.lb-article-date');
        var h1 = articleEl.querySelector('.lb-article-h1');
        var excerpt = articleEl.querySelector('.lb-article-excerpt');
        var meta = articleEl.querySelector('.lb-article-meta');
        var tags = articleEl.querySelectorAll('.lb-card-tag');
        var header = articleEl.querySelector('.lb-article-header');
        var cover = articleEl.querySelector('.lb-article > img[itemprop="image"]');

        if (date) {
            tl.from(date, { y: 16 * p.yBase, opacity: 0, letterSpacing: '4px', duration: 0.45 * p.ds }, 0);
        }

        if (h1) {
            tl.from(h1, { y: 40 * p.yBase, opacity: 0, duration: 0.65 * p.ds, ease: p.titleEase }, 0.06);
        }

        if (excerpt) {
            tl.from(excerpt, { y: 20 * p.yBase, opacity: 0, duration: 0.5 * p.ds }, 0.18);
        }

        if (meta) {
            tl.from(meta, { y: 14 * p.yBase, opacity: 0, duration: 0.4 * p.ds }, 0.26);
        }

        if (tags.length) {
            tl.from(tags, { x: -10, opacity: 0, stagger: 0.035 * p.ss, duration: 0.3 * p.ds }, 0.32);
        }

        if (header) {
            tl.from(header, {
                borderBottomColor: 'transparent',
                duration: 0.5 * p.ds,
                ease: 'power2.out'
            }, 0.4);
        }

        if (cover) {
            tl.from(cover, { scale: 1.04, opacity: 0, duration: 0.7 * p.ds, ease: 'power2.out' }, 0.3);

            if (_ST) {
                _gsap.to(cover, {
                    yPercent: p.parallax,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: cover,
                        start: 'top 80%',
                        end: 'bottom 20%',
                        scrub: 0.5
                    }
                });
            }
        }

        [date, h1, excerpt, meta].forEach(function(el) {
            if (el) el.classList.add('gsap-revealed', 'visible');
        });

        return true;
    };

    // ─── 8. Comments Section Animation Helper ───

    function _animateComments(cs, p) {
        if (!_stOk() || !cs) return;

        var title = cs.querySelector('.lb-comments-title');
        var form = cs.querySelector('.lb-comment-form');
        var submit = cs.querySelector('.lb-comment-submit');
        var comments = cs.querySelectorAll('.lb-comment');

        if (title) {
            _gsap.set(title, { opacity: 0, x: -20 });
            _ST.create({
                trigger: title, start: 'top 90%', once: true,
                onEnter: function() {
                    _gsap.to(title, { opacity: 1, x: 0, duration: 0.45 * p.ds, ease: p.ease });
                }
            });
        }

        if (form) {
            _gsap.set(form, { opacity: 0, y: 16, scale: 0.96 });
            _ST.create({
                trigger: form, start: 'top 90%', once: true,
                onEnter: function() {
                    _gsap.to(form, { opacity: 1, y: 0, scale: 1, duration: 0.5 * p.ds, ease: p.ease });
                }
            });
        }

        if (comments.length) {
            _gsap.set(comments, { opacity: 0, y: 16 });
            _ST.batch(comments, {
                start: 'top 92%',
                onEnter: function(batch) {
                    _gsap.to(batch, {
                        opacity: 1, y: 0, stagger: 0.06 * p.ss,
                        duration: 0.45 * p.ds, ease: p.ease
                    });
                },
                once: true
            });
        }
    }

    // ─── 9. Article Content Scroll Reveals ───

    B._gsapArticleScrollReveals = function(contentEl) {
        if (!_stOk() || !contentEl) return false;

        var blogView = contentEl.closest('#blogView');
        if (blogView) blogView.classList.add('gsap-active');

        var p = _getMoodProfile();

        if (_articleMoodHandler) document.removeEventListener('moodchange', _articleMoodHandler);
        _articleMoodHandler = function(e) {
            var np = _getMoodProfile(e.detail.mood);
            for (var k in np) p[k] = np[k];
        };
        document.addEventListener('moodchange', _articleMoodHandler);

        var _cachedGlow = null;
        function _glowFlash(el) {
            if (!_cachedGlow) _cachedGlow = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim();
            if (!_cachedGlow) return;
            _gsap.fromTo(el,
                { boxShadow: '0 0 16px 2px ' + _cachedGlow },
                { boxShadow: '0 0 0px 0px rgba(0,0,0,0)', duration: 0.8, ease: 'power2.out' }
            );
        }

        var article = contentEl.closest('.lb-article');

        contentEl.querySelectorAll('h2').forEach(function(el) {
            _gsap.set(el, { opacity: 0, y: 30 });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        opacity: 1, y: 0, duration: 0.55 * p.ds, ease: p.ease,
                        onComplete: function() {
                            el.classList.add('gsap-revealed', 'visible');
                        }
                    });
                    if (el.style.borderTopWidth !== '0px') {
                        _gsap.from(el, {
                            borderTopColor: 'transparent', duration: 0.6 * p.ds, delay: 0.15,
                            ease: 'power2.out'
                        });
                    }
                }
            });
        });

        contentEl.querySelectorAll('h3').forEach(function(el) {
            _gsap.set(el, { opacity: 0, y: 20 });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        opacity: 1, y: 0, duration: 0.45 * p.ds, ease: p.ease,
                        onComplete: function() { el.classList.add('gsap-revealed', 'visible'); }
                    });
                }
            });
        });

        contentEl.querySelectorAll('blockquote').forEach(function(el) {
            _gsap.set(el, { opacity: 0, x: -12 });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        opacity: 1, x: 0, duration: 0.55 * p.ds, ease: p.ease,
                        onComplete: function() {
                            el.classList.add('gsap-revealed', 'visible');
                            _glowFlash(el);
                        }
                    });
                }
            });
        });

        contentEl.querySelectorAll('pre').forEach(function(el) {
            _gsap.set(el, { opacity: 0, clipPath: 'inset(0 0 100% 0)' });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        opacity: 1, clipPath: 'inset(0 0 0% 0)',
                        duration: 0.6 * p.ds, ease: 'power2.out',
                        onComplete: function() {
                            el.classList.add('gsap-revealed', 'visible');
                            _gsap.set(el, { clearProps: 'clipPath' });
                            _glowFlash(el);
                        }
                    });
                }
            });
        });

        contentEl.querySelectorAll('figure, .lb-gallery').forEach(function(el) {
            _gsap.set(el, { opacity: 0, scale: 0.96, y: 16 });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        opacity: 1, scale: 1, y: 0,
                        duration: 0.6 * p.ds, ease: p.ease,
                        onComplete: function() { el.classList.add('gsap-revealed', 'visible'); }
                    });
                }
            });
        });

        contentEl.querySelectorAll('hr').forEach(function(el) {
            _gsap.set(el, { scaleX: 0, transformOrigin: 'center center' });
            _ST.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(el, {
                        scaleX: 1, duration: 0.7 * p.ds, ease: 'power2.inOut',
                        onComplete: function() { el.classList.add('gsap-revealed', 'visible'); }
                    });
                }
            });
        });

        var toc = article ? article.querySelector('.lb-toc') : null;
        if (toc) {
            _gsap.set(toc, { opacity: 0, x: -20, scale: 0.98 });
            _ST.create({
                trigger: toc, start: 'top 88%', once: true,
                onEnter: function() {
                    _gsap.to(toc, {
                        opacity: 1, x: 0, scale: 1,
                        duration: 0.5 * p.ds, ease: p.ease,
                        onComplete: function() { toc.classList.add('gsap-revealed', 'visible'); }
                    });
                }
            });
        }

        var footer = article ? article.querySelector('.lb-article-footer') : null;
        if (footer) {
            var shareIcons = footer.querySelectorAll('.lb-share-icon');
            var bookmarkBtn = footer.querySelector('.lb-bookmark-btn');
            var ttsBtn = footer.querySelector('.lb-tts-btn');

            _gsap.set(footer, { opacity: 0, y: 24, scale: 0.97 });
            if (shareIcons.length) _gsap.set(shareIcons, { opacity: 0, x: -8, scale: 0.8 });
            if (bookmarkBtn) _gsap.set(bookmarkBtn, { opacity: 0, y: 6 });
            if (ttsBtn) _gsap.set(ttsBtn, { opacity: 0, y: 6 });

            _ST.create({
                trigger: footer, start: 'top 88%', once: true,
                onEnter: function() {
                    var ftTl = _gsap.timeline({
                        defaults: { ease: p.ease },
                        onComplete: function() { footer.classList.add('gsap-revealed', 'visible'); }
                    });
                    ftTl.to(footer, { opacity: 1, y: 0, scale: 1, duration: 0.5 * p.ds }, 0);
                    if (shareIcons.length) {
                        ftTl.to(shareIcons, { opacity: 1, x: 0, scale: 1, stagger: 0.04 * p.ss, duration: 0.35 * p.ds, ease: 'back.out(1.4)' }, 0.12);
                    }
                    if (bookmarkBtn) ftTl.to(bookmarkBtn, { opacity: 1, y: 0, duration: 0.3 * p.ds }, 0.35);
                    if (ttsBtn) ftTl.to(ttsBtn, { opacity: 1, y: 0, duration: 0.3 * p.ds }, 0.4);
                }
            });
        }

        var authorCard = article ? article.querySelector('.lb-author-card') : null;
        if (authorCard) {
            var avatar = authorCard.querySelector('.lb-author-avatar');
            var authorName = authorCard.querySelector('.lb-author-name');
            var authorBio = authorCard.querySelector('.lb-author-bio');
            var authorLinks = authorCard.querySelector('.lb-author-links');

            _gsap.set(authorCard, { opacity: 0, y: 20, scale: 0.98 });
            _ST.create({
                trigger: authorCard, start: 'top 88%', once: true,
                onEnter: function() {
                    var acTl = _gsap.timeline({
                        defaults: { ease: p.ease },
                        onComplete: function() { authorCard.classList.add('gsap-revealed', 'visible'); }
                    });
                    acTl.to(authorCard, { opacity: 1, y: 0, scale: 1, duration: 0.5 * p.ds }, 0);
                    if (avatar) acTl.from(avatar, { scale: 0.6, opacity: 0, duration: 0.45 * p.ds, ease: 'back.out(2)' }, 0.1);
                    if (authorName) acTl.from(authorName, { x: 12, opacity: 0, duration: 0.35 * p.ds }, 0.2);
                    if (authorBio) acTl.from(authorBio, { y: 8, opacity: 0, duration: 0.35 * p.ds }, 0.3);
                    if (authorLinks) acTl.from(authorLinks, { y: 8, opacity: 0, scale: 0.9, duration: 0.3 * p.ds, ease: 'back.out(1.4)' }, 0.38);
                }
            });
        }

        var commentsSection = article ? article.querySelector('.lb-comments-section') : null;
        if (!commentsSection) {
            var commentsContainer = article ? article.querySelector('#lbCommentsSection') : null;
            if (commentsContainer) {
                var _commObs = new MutationObserver(function(mutations, obs) {
                    var cs = commentsContainer.querySelector('.lb-comments-section');
                    if (!cs) return;
                    obs.disconnect();
                    _animateComments(cs, p);
                });
                _commObs.observe(commentsContainer, { childList: true });
            }
        } else {
            _animateComments(commentsSection, p);
        }

        var remainingReveals = article ? article.querySelectorAll('.lb-reveal:not(.gsap-revealed)') : [];
        if (remainingReveals.length) {
            _gsap.set(remainingReveals, { opacity: 0, y: 30 });
            _ST.batch(remainingReveals, {
                start: 'top 90%',
                onEnter: function(batch) {
                    _gsap.to(batch, {
                        opacity: 1, y: 0, stagger: 0.06 * p.ss,
                        duration: 0.55 * p.ds, ease: p.ease,
                        onComplete: function() {
                            batch.forEach(function(el) { el.classList.add('gsap-revealed', 'visible'); });
                        }
                    });
                },
                once: true
            });
        }

        return true;
    };

    // ─── Cleanup helper ───

    B._gsapKillScrollTriggers = function() {
        if (_ST) {
            _ST.getAll().forEach(function(t) { t.kill(); });
        }
        if (_articleMoodHandler) {
            document.removeEventListener('moodchange', _articleMoodHandler);
            _articleMoodHandler = null;
        }
        var blogView = document.getElementById('blogView');
        if (blogView) blogView.classList.remove('gsap-active');
    };

    B._gsapRefreshScrollTrigger = function() {
        if (_ST) _ST.refresh();
    };

    // ── Brand text scramble (matches main site Scr class) ──
    var _scrChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    B._scrambleBrand = function(el, text) {
        if (!el || B._reducedMotion) return;
        var q = [];
        for (var i = 0; i < text.length; i++) {
            q.push({ to: text[i], start: Math.floor(Math.random() * 15), end: Math.floor(Math.random() * 15) + 15 + i * 2, c: null });
        }
        var f = 0;
        (function u() {
            var o = '', done = 0;
            for (var i = 0; i < q.length; i++) {
                var x = q[i];
                if (f >= x.end) { o += x.to; done++; }
                else if (f >= x.start) {
                    if (!x.c || Math.random() < 0.3) x.c = _scrChars[Math.floor(Math.random() * _scrChars.length)];
                    o += '<span style="color:var(--accent);opacity:.5">' + x.c + '</span>';
                } else { o += ''; }
            }
            el.innerHTML = o;
            if (done < q.length) { f++; requestAnimationFrame(u); }
            else { el.textContent = text; }
        })();
    };

})();
