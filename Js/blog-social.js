// blog-social.js — Reactions, comments, text selection share
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;

    /* ═══════════════════════════════════════════════════
       REACTION BAR
       ═══════════════════════════════════════════════════ */
    const ARTICLE_RX = [
        { key: 'heart', emoji: '❤️', label: 'Love' },
        { key: 'fire', emoji: '🔥', label: 'Fire' },
        { key: 'bulb', emoji: '💡', label: 'Insightful' },
        { key: 'clap', emoji: '👏', label: 'Bravo' },
        { key: 'target', emoji: '🎯', label: 'On Point' }
    ];
    const LB_RX_KEY = '_lb_reactions';
    var _rxPickerDismiss = null;

    function getLocalRx() { try { return JSON.parse(localStorage.getItem(LB_RX_KEY) || '{}'); } catch { return {}; } }
    function setLocalRx(v) { localStorage.setItem(LB_RX_KEY, JSON.stringify(v)); }

    function renderReactionBar(article) {
        var container = document.getElementById('lbReactions');
        if (!container) return;
        if (_rxPickerDismiss) { document.removeEventListener('click', _rxPickerDismiss); _rxPickerDismiss = null; }

        var rx = article.reactions || {};
        var myRx = (getLocalRx()[article.id] || []);

        var activeRx = ARTICLE_RX.filter(function(r) { return (rx[r.key] || 0) > 0 || myRx.indexOf(r.key) !== -1; });
        var btns = activeRx.map(function(r) {
            return '<button class="lb-rx-btn ' + (myRx.indexOf(r.key) !== -1 ? 'active' : '') + '" data-rk="' + r.key + '" title="' + r.label + '">' + r.emoji + ' <span class="rcount">' + (rx[r.key] || 0) + '</span></button>';
        }).join('');

        var pickerBtns = ARTICLE_RX.map(function(r) {
            return '<button data-rk="' + r.key + '" title="' + r.label + '">' + r.emoji + '</button>';
        }).join('');

        container.innerHTML = btns +
            '<span class="lb-rx-wrap">' +
            '<button class="lb-rx-add" id="lbRxAdd" title="React">+</button>' +
            '<div class="lb-rx-picker" id="lbRxPicker">' + pickerBtns + '</div>' +
            '</span>';

        container.querySelectorAll('.lb-rx-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { toggleArticleRx(article, btn.dataset.rk); });
        });

        var addBtn = document.getElementById('lbRxAdd');
        var picker = document.getElementById('lbRxPicker');
        if (addBtn && picker) {
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                picker.classList.toggle('show');
            });
            picker.querySelectorAll('button').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    picker.classList.remove('show');
                    toggleArticleRx(article, btn.dataset.rk);
                });
            });
            _rxPickerDismiss = function() { picker.classList.remove('show'); };
            document.addEventListener('click', _rxPickerDismiss);
        }
    }

    async function toggleArticleRx(article, rk) {
        if (!window._sb) return;
        var all = getLocalRx();
        var my = all[article.id] || [];
        var was = my.indexOf(rk) !== -1;
        if (was) { all[article.id] = my.filter(function(k) { return k !== rk; }); }
        else { if (!all[article.id]) all[article.id] = []; all[article.id].push(rk); }
        setLocalRx(all);
        snd('tap');

        if (!was && B._telemetry) B._telemetry.track('reaction', { article_id: article.id, reaction: rk });

        try {
            var result = await window._sb.rpc('update_article_reactions', {
                p_article_id: article.id, p_reaction_key: rk, p_delta: was ? -1 : 1
            });
            if (result.data) { article.reactions = result.data; }
        } catch (e) { /* silent */ }
        renderReactionBar(article);
    }

    /* ═══════════════════════════════════════════════════
       COMMENTS
       ═══════════════════════════════════════════════════ */
    const LB_COMMENTER_KEY = '_lb_commenter';
    const LB_COMMENT_LIKES_KEY = '_lb_comment_likes';
    const ADMIN_NAME = 'Amr Elharony';

    function getCommenterName() { return localStorage.getItem(LB_COMMENTER_KEY) || ''; }
    function setCommenterName(n) { localStorage.setItem(LB_COMMENTER_KEY, n); }
    function getCommentLikes() { try { return JSON.parse(localStorage.getItem(LB_COMMENT_LIKES_KEY) || '[]'); } catch { return []; } }
    function setCommentLikes(v) { localStorage.setItem(LB_COMMENT_LIKES_KEY, JSON.stringify(v)); }

    function buildCommentTree(comments) {
        var map = {};
        var roots = [];
        comments.forEach(function(c) { map[c.id] = Object.assign({}, c, { replies: [] }); });
        comments.forEach(function(c) {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].replies.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        });
        return roots;
    }

    function timeAgo(dateStr) {
        var diff = Date.now() - new Date(dateStr).getTime();
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        var days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd ago';
        var months = Math.floor(days / 30);
        return months + 'mo ago';
    }

    function renderCommentHtml(c, isAdmin, likedIds, depth) {
        var isAuthor = (c.author_name || '').toLowerCase() === ADMIN_NAME.toLowerCase();
        var isLiked = likedIds.indexOf(c.id) !== -1;
        var bodyHtml = esc(c.content).replace(/\n/g, '<br>');
        var html = '<div class="lb-comment" data-cid="' + c.id + '">' +
            '<div class="lb-comment-header">' +
            '<span class="lb-comment-author' + (isAuthor ? ' admin' : '') + '">' + esc(c.author_name) + '</span>' +
            '<span class="lb-comment-time">' + timeAgo(c.created_at) + '</span>' +
            '</div>' +
            '<div class="lb-comment-body"><p>' + bodyHtml + '</p></div>' +
            '<div class="lb-comment-actions">' +
            '<button class="lb-comment-action-btn' + (isLiked ? ' liked' : '') + '" data-like="' + c.id + '">' +
            '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + (c.likes || 0) +
            '</button>';
        if (depth < 2) {
            html += '<button class="lb-comment-action-btn" data-reply="' + c.id + '"><i class="fa-regular fa-comment"></i> Reply</button>';
        }
        if (isAdmin) {
            html += '<button class="lb-comment-action-btn del" data-del="' + c.id + '"><i class="fa-regular fa-trash-can"></i></button>';
        }
        html += '</div>';
        html += '<div class="lb-comment-reply-form" id="replyForm-' + c.id + '" style="display:none"></div>';

        if (c.replies && c.replies.length > 0) {
            html += '<div class="lb-comment-replies">';
            c.replies.forEach(function(r) {
                html += renderCommentHtml(r, isAdmin, likedIds, depth + 1);
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    async function renderComments(articleId) {
        var section = document.getElementById('lbCommentsSection');
        if (!section || !window._sb) return;
        var isAdmin = !!(window._passkey && window._passkey.isAuthenticated) || !!(window._hasBlogAdminSession && window._hasBlogAdminSession());

        try {
            var result = await window._sb
                .from('article_comments')
                .select('*')
                .eq('article_id', articleId)
                .order('created_at', { ascending: true });
            var comments = result.data || [];
            var tree = buildCommentTree(comments);
            var likedIds = getCommentLikes();
            var savedName = getCommenterName();

            section.innerHTML = '<div class="lb-comments-section">' +
                '<h3 class="lb-comments-title">Discussion <span class="count">' + comments.length + ' comment' + (comments.length !== 1 ? 's' : '') + '</span></h3>' +
                '<div class="lb-comment-form" id="lbCommentForm">' +
                '<div class="lb-comment-form-row">' +
                '<input class="lb-comment-name" id="lbCommentName" placeholder="Your name" maxlength="60" value="' + esc(savedName) + '">' +
                '<textarea class="lb-comment-textarea" id="lbCommentText" placeholder="Share your thoughts..." rows="3"></textarea>' +
                '</div>' +
                '<button class="lb-comment-submit" id="lbCommentSubmit">Post Comment</button>' +
                '</div>' +
                (tree.length ? '<div class="lb-comment-list" id="lbCommentList">' +
                    tree.map(function(c) { return renderCommentHtml(c, isAdmin, likedIds, 0); }).join('') +
                    '</div>' : '<div class="lb-comments-empty">No comments yet. Be the first to share your thoughts.</div>') +
                '</div>';

            bindCommentEvents(articleId, isAdmin);


        } catch (e) { /* silent */ }
    }

    function bindCommentEvents(articleId, isAdmin) {
        var section = document.getElementById('lbCommentsSection');
        if (!section) return;

        var submitBtn = document.getElementById('lbCommentSubmit');
        if (submitBtn) {
            submitBtn.addEventListener('click', async function() {
                var nameInput = document.getElementById('lbCommentName');
                var textInput = document.getElementById('lbCommentText');
                if (!nameInput || !textInput) return;
                var name = nameInput.value.trim() || 'Anonymous';
                var content = textInput.value.trim();
                if (!content) return;
                submitBtn.disabled = true;
                setCommenterName(name);
                try {
                    await window._sb.from('article_comments').insert({
                        article_id: articleId,
                        author_name: name,
                        content: content
                    });
                    snd('success');
                    if (B._telemetry) B._telemetry.track('comment_submit', { article_id: articleId });
                    renderComments(articleId);
                } catch (e) {
                    submitBtn.disabled = false;
                }
            });
        }

        section.querySelectorAll('[data-like]').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                var cid = btn.dataset.like;
                var liked = getCommentLikes();
                var wasLiked = liked.indexOf(cid) !== -1;
                if (wasLiked) { liked = liked.filter(function(id) { return id !== cid; }); }
                else { liked.push(cid); }
                setCommentLikes(liked);
                snd('tap');
                try {
                    await window._sb.rpc('like_article_comment', { p_comment_id: cid, p_delta: wasLiked ? -1 : 1 });
                } catch (e) { /* silent */ }
                renderComments(articleId);
            });
        });

        section.querySelectorAll('[data-reply]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var cid = btn.dataset.reply;
                var formEl = document.getElementById('replyForm-' + cid);
                if (!formEl) return;
                if (formEl.style.display !== 'none') { formEl.style.display = 'none'; formEl.innerHTML = ''; return; }
                var savedName = getCommenterName();
                formEl.style.display = 'block';
                formEl.innerHTML =
                    '<input class="lb-comment-name" placeholder="Your name" maxlength="60" value="' + esc(savedName) + '" style="margin-bottom:6px;width:100%">' +
                    '<textarea class="lb-comment-reply-input" placeholder="Write a reply..."></textarea>' +
                    '<div class="lb-comment-reply-actions">' +
                    '<button class="lb-cms-btn primary" style="font-size:9px;padding:6px 16px">Reply</button>' +
                    '<button class="lb-cms-btn secondary" style="font-size:9px;padding:6px 16px">Cancel</button>' +
                    '</div>';
                var replyBtn = formEl.querySelector('.lb-cms-btn.primary');
                var cancelBtn = formEl.querySelector('.lb-cms-btn.secondary');
                cancelBtn.addEventListener('click', function() { formEl.style.display = 'none'; formEl.innerHTML = ''; });
                replyBtn.addEventListener('click', async function() {
                    var rName = formEl.querySelector('.lb-comment-name').value.trim() || 'Anonymous';
                    var rContent = formEl.querySelector('.lb-comment-reply-input').value.trim();
                    if (!rContent) return;
                    replyBtn.disabled = true;
                    setCommenterName(rName);
                    try {
                        await window._sb.from('article_comments').insert({
                            article_id: articleId,
                            parent_id: cid,
                            author_name: rName,
                            content: rContent
                        });
                        snd('success');
                        if (B._telemetry) B._telemetry.track('comment_reply', { article_id: articleId, parent_id: cid });
                        renderComments(articleId);
                    } catch (e) {
                        replyBtn.disabled = false;
                    }
                });
            });
        });

        if (isAdmin) {
            section.querySelectorAll('[data-del]').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    if (!confirm('Delete this comment?')) return;
                    try {
                        await window._sb.rpc('delete_article_comment', { p_comment_id: btn.dataset.del });
                        snd('tap');
                        renderComments(articleId);
                    } catch (e) { /* silent */ }
                });
            });
        }
    }

    /* ═══════════════════════════════════════════════════
       TEXT SELECTION SHARE
       ═══════════════════════════════════════════════════ */
    var _quoteTooltip = null;
    var _quoteHandlers = {};

    function initTextSelection(article) {
        destroyTextSelection();
        var contentEl = document.querySelector('.lb-content');
        if (!contentEl) return;

        var _lastTouchTime = 0;

        _quoteHandlers.mouseup = function(e) {
            if (Date.now() - _lastTouchTime < 1000) return;
            setTimeout(function() { showQuoteTooltip(e, article); }, 10);
        };
        contentEl.addEventListener('mouseup', _quoteHandlers.mouseup);

        _quoteHandlers.touchstart = function() { _lastTouchTime = Date.now(); };
        contentEl.addEventListener('touchstart', _quoteHandlers.touchstart, { passive: true });

        var _selChangeTimer = null;
        _quoteHandlers.selectionchange = function() {
            clearTimeout(_selChangeTimer);
            var sel = window.getSelection();
            if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
            _selChangeTimer = setTimeout(function() {
                sel = window.getSelection();
                if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
                var anchor = sel.anchorNode;
                if (anchor && contentEl.contains(anchor.nodeType === 3 ? anchor.parentElement : anchor)) {
                    showQuoteTooltip(null, article);
                }
            }, 600);
        };
        document.addEventListener('selectionchange', _quoteHandlers.selectionchange);
    }

    function destroyTextSelection() {
        var contentEl = document.querySelector('.lb-content');
        if (contentEl) {
            if (_quoteHandlers.mouseup) contentEl.removeEventListener('mouseup', _quoteHandlers.mouseup);
            if (_quoteHandlers.touchstart) contentEl.removeEventListener('touchstart', _quoteHandlers.touchstart);
        }
        if (_quoteHandlers.selectionchange) {
            document.removeEventListener('selectionchange', _quoteHandlers.selectionchange);
        }
        _quoteHandlers = {};
        removeQuoteTooltip();
    }

    function showQuoteTooltip(e, article) {
        removeQuoteTooltip();
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
        var text = sel.toString().trim();
        if (text.length < 5) return;

        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        var savedRange = range.cloneRange();

        _quoteTooltip = document.createElement('div');
        _quoteTooltip.className = 'lb-quote-tooltip';
        _quoteTooltip.innerHTML =
            '<button data-action="copy"><i class="fa-regular fa-copy"></i> Copy</button>' +
            '<button data-action="share"><i class="fa-solid fa-share-nodes"></i> Share</button>' +
            '<span class="lb-quote-hl-colors">' +
            '<span class="lb-quote-hl-dot" data-color="yellow" title="Highlight yellow"></span>' +
            '<span class="lb-quote-hl-dot" data-color="blue" title="Highlight blue"></span>' +
            '<span class="lb-quote-hl-dot" data-color="green" title="Highlight green"></span>' +
            '<span class="lb-quote-hl-dot" data-color="pink" title="Highlight pink"></span>' +
            '</span>';

        document.body.appendChild(_quoteTooltip);

        var tw = _quoteTooltip.offsetWidth;
        var left = rect.left + (rect.width / 2) - (tw / 2) + window.scrollX;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        _quoteTooltip.style.top = (rect.top + window.scrollY - _quoteTooltip.offsetHeight - 8) + 'px';
        _quoteTooltip.style.left = left + 'px';

        var quoteStr = '"' + text + '"\n— ' + (article.title || '') + '\n' + window.location.href;

        _quoteTooltip.querySelector('[data-action="copy"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            navigator.clipboard.writeText(quoteStr).then(function() {
                if (window.UniToast) window.UniToast('Quote copied!', '', '\ud83d\udccb', 'success');
            }).catch(function() { if (window.UniToast) window.UniToast('Copy failed', '', '\u26a0\ufe0f', 'error'); });
            snd('success');
            removeQuoteTooltip();
        });

        _quoteTooltip.querySelector('[data-action="share"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            if (navigator.share) {
                navigator.share({ title: article.title, text: '"' + text + '"', url: window.location.href }).catch(function() { if (window.UniToast) window.UniToast('Share cancelled', '', '', 'info'); });
            } else {
                navigator.clipboard.writeText(quoteStr).then(function() {
                    if (window.UniToast) window.UniToast('Quote copied!', '', '\ud83d\udccb', 'success');
                }).catch(function() { if (window.UniToast) window.UniToast('Copy failed', '', '\u26a0\ufe0f', 'error'); });
            }
            snd('success');
            removeQuoteTooltip();
        });

        _quoteTooltip.querySelectorAll('.lb-quote-hl-dot').forEach(function(dot) {
            dot.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var color = dot.dataset.color;
                B.createHighlight(savedRange, text, color, article);
                removeQuoteTooltip();
                window.getSelection().removeAllRanges();
                snd('success');
            });
        });

        document.addEventListener('mousedown', dismissQuoteOnClick);
        document.addEventListener('touchstart', dismissQuoteOnClick);
    }

    function dismissQuoteOnClick(e) {
        if (_quoteTooltip && !_quoteTooltip.contains(e.target)) {
            removeQuoteTooltip();
        }
    }

    function removeQuoteTooltip() {
        if (_quoteTooltip) { _quoteTooltip.remove(); _quoteTooltip = null; }
        document.removeEventListener('mousedown', dismissQuoteOnClick);
        document.removeEventListener('touchstart', dismissQuoteOnClick);
    }

    // Register
    B.renderReactionBar = renderReactionBar;
    B.renderComments = renderComments;
    B.timeAgo = timeAgo;
    B.initTextSelection = initTextSelection;
    B.destroyTextSelection = destroyTextSelection;
})();
