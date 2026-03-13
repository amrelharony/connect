// blog-reader-data.js — Reading lists, collections, annotations, reading history
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;
    var fmtDate = B.fmtDate;

    var _collFab = null;
    var _collPanel = null;
    var _collPanelOpen = false;
    var _collPopover = null;
    var _hlToolbar = null;
    var _notePopover = null;
    var _annFab = null;
    var _annPanel = null;
    var _annPanelOpen = false;
    var _rhTimer = null;
    var _rhTimeSpent = 0;
    var _rhArticleId = null;
    var _rhProgress = 0;
    var _rhSyncTimeout = null;

    // READING LISTS / COLLECTIONS (lines 4149-4779)
    var LS_RL = '_lb_reading_lists';
    var _COLL_EMOJIS = ['📑','🔖','🧠','🚀','💡','📚','🎯','⭐','🔬','💻','📰','🌍'];

    function _getRLData() { try { return JSON.parse(localStorage.getItem(LS_RL) || '{"lists":[]}'); } catch(e) { return { lists: [] }; } }
    function _setRLData(v) { try { localStorage.setItem(LS_RL, JSON.stringify(v)); } catch(e) {} }

    function _migrateBookmarks() {
        var data = _getRLData();
        if (data.lists.length) return;
        var old = [];
        try { old = JSON.parse(localStorage.getItem('_lb_bookmarks') || '[]'); } catch(e) {}
        var defaultList = {
            id: _genLocalId(), cloudId: null, name: 'Saved', emoji: '🔖',
            position: 0, isDefault: true, items: []
        };
        old.forEach(function(slug, i) {
            var art = B._allFeedArticles.find(function(a) { return a.slug === slug; });
            defaultList.items.push({
                articleId: art ? art.id : slug,
                slug: slug,
                position: i,
                addedAt: new Date().toISOString()
            });
        });
        data.lists = [defaultList];
        _setRLData(data);
        try { localStorage.removeItem('_lb_bookmarks'); } catch(e) {}
    }

    function _ensureDefaultList() {
        var data = _getRLData();
        var def = data.lists.find(function(l) { return l.isDefault; });
        if (!def) {
            data.lists.unshift({
                id: _genLocalId(), cloudId: null, name: 'Saved', emoji: '🔖',
                position: 0, isDefault: true, items: []
            });
            _setRLData(data);
        }
    }

    function _getDefaultList() {
        var data = _getRLData();
        return data.lists.find(function(l) { return l.isDefault; }) || data.lists[0];
    }

    function _getAllLists() { return _getRLData().lists || []; }

    function _getListById(listId) {
        return _getAllLists().find(function(l) { return l.id === listId; }) || null;
    }

    function _isArticleInList(listId, articleId, slug) {
        var list = _getListById(listId);
        if (!list) return false;
        return list.items.some(function(it) {
            return it.articleId === articleId || it.slug === slug;
        });
    }

    function _isArticleInAnyList(articleId, slug) {
        return _getAllLists().some(function(l) {
            return l.items.some(function(it) { return it.articleId === articleId || it.slug === slug; });
        });
    }

    function _addToList(listId, articleId, slug) {
        var data = _getRLData();
        var list = data.lists.find(function(l) { return l.id === listId; });
        if (!list) return;
        if (list.items.some(function(it) { return it.articleId === articleId || it.slug === slug; })) return;
        list.items.push({
            articleId: articleId, slug: slug,
            position: list.items.length,
            addedAt: new Date().toISOString()
        });
        _setRLData(data);
        _syncAddItem(list, articleId);
    }

    function _removeFromList(listId, articleId, slug) {
        var data = _getRLData();
        var list = data.lists.find(function(l) { return l.id === listId; });
        if (!list) return;
        list.items = list.items.filter(function(it) {
            return it.articleId !== articleId && it.slug !== slug;
        });
        _setRLData(data);
        _syncRemoveItem(list, articleId);
    }

    function _createList(name, emoji) {
        var data = _getRLData();
        var newList = {
            id: _genLocalId(), cloudId: null,
            name: name, emoji: emoji || '📑',
            position: data.lists.length,
            isDefault: false, items: []
        };
        data.lists.push(newList);
        _setRLData(data);
        _syncCreateList(newList);
        return newList;
    }

    function _renameList(listId, name, emoji) {
        var data = _getRLData();
        var list = data.lists.find(function(l) { return l.id === listId; });
        if (!list || list.isDefault) return;
        list.name = name;
        if (emoji) list.emoji = emoji;
        _setRLData(data);
        _syncRenameList(list);
    }

    function _deleteList(listId) {
        var data = _getRLData();
        var list = data.lists.find(function(l) { return l.id === listId; });
        if (!list || list.isDefault) return;
        var cloudId = list.cloudId;
        data.lists = data.lists.filter(function(l) { return l.id !== listId; });
        _setRLData(data);
        if (cloudId) _syncDeleteList(cloudId);
    }

    function getBookmarks() {
        var def = _getDefaultList();
        return def ? def.items.map(function(it) { return it.slug; }) : [];
    }

    function toggleBookmark(slug) {
        _ensureDefaultList();
        var def = _getDefaultList();
        if (!def) return false;
        var art = B._allFeedArticles.find(function(a) { return a.slug === slug; });
        var articleId = art ? art.id : slug;
        if (_isArticleInList(def.id, articleId, slug)) {
            _removeFromList(def.id, articleId, slug);
            snd('tap');
            return false;
        } else {
            _addToList(def.id, articleId, slug);
            snd('tap');
            return true;
        }
    }

    function initBookmarkBtn(slug) {
        var btn = document.getElementById('lbBookmarkArticle');
        if (!btn) return;
        _ensureDefaultList();
        var isBookmarked = getBookmarks().indexOf(slug) !== -1;
        updateBookmarkBtn(btn, isBookmarked);
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            _showCollPopover(btn, B.currentArticle ? B.currentArticle.id : slug, slug);
        });
    }

    function updateBookmarkBtn(btn, active) {
        if (active) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-bookmark" aria-hidden="true"></i> Saved';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-regular fa-bookmark" aria-hidden="true"></i> Save';
        }
    }

    /* ── Cloud sync helpers ── */
    function _syncCreateList(list) {
        if (!window._sb) return;
        window._sb.rpc('create_reading_list', {
            p_name: list.name, p_emoji: list.emoji
        }).then(function(res) {
            if (res.data) {
                var data = _getRLData();
                var l = data.lists.find(function(x) { return x.id === list.id; });
                if (l) {
                    l.cloudId = res.data;
                    _setRLData(data);
                    l.items.forEach(function(item) {
                        window._sb.rpc('add_to_reading_list', {
                            p_list_id: res.data, p_article_id: item.articleId
                        }).then(function() {}, function() {});
                    });
                }
            }
        }, function() {});
    }

    function _syncRenameList(list) {
        if (!window._sb || !list.cloudId) return;
        window._sb.rpc('rename_reading_list', {
            p_list_id: list.cloudId, p_name: list.name, p_emoji: list.emoji
        }).then(function() {}, function() {});
    }

    function _syncDeleteList(cloudId) {
        if (!window._sb) return;
        window._sb.rpc('delete_reading_list', { p_list_id: cloudId }).then(function() {}, function() {});
    }

    function _syncAddItem(list, articleId) {
        if (!window._sb || !list.cloudId) return;
        window._sb.rpc('add_to_reading_list', {
            p_list_id: list.cloudId, p_article_id: articleId
        }).then(function() {}, function() {});
    }

    function _syncRemoveItem(list, articleId) {
        if (!window._sb || !list.cloudId) return;
        window._sb.rpc('remove_from_reading_list', {
            p_list_id: list.cloudId, p_article_id: articleId
        }).then(function() {}, function() {});
    }

    async function _fetchCloudLists() {
        if (!window._sb) return [];
        try {
            var res = await window._sb
                .from('reading_lists')
                .select('id,name,emoji,position,created_at')
                .order('position', { ascending: true });
            if (res.error || !res.data) return [];
            var lists = [];
            for (var i = 0; i < res.data.length; i++) {
                var rl = res.data[i];
                var itemsRes = await window._sb
                    .from('reading_list_items')
                    .select('article_id,position,added_at')
                    .eq('list_id', rl.id)
                    .order('position', { ascending: true });
                var items = (itemsRes.data || []).map(function(it) {
                    var art = B._allFeedArticles.find(function(a) { return a.id === it.article_id; });
                    return {
                        articleId: it.article_id,
                        slug: art ? art.slug : '',
                        position: it.position,
                        addedAt: it.added_at
                    };
                });
                lists.push({
                    id: rl.id, cloudId: rl.id,
                    name: rl.name, emoji: rl.emoji,
                    position: rl.position,
                    isDefault: i === 0 && rl.name === 'Saved',
                    items: items
                });
            }
            return lists;
        } catch(e) { return []; }
    }

    async function _mergeCloudLists() {
        var cloud = await _fetchCloudLists();
        if (!cloud.length) return;
        var data = _getRLData();
        cloud.forEach(function(cl) {
            var local = data.lists.find(function(l) {
                return l.cloudId === cl.cloudId || (l.name === cl.name && l.isDefault === cl.isDefault);
            });
            if (local) {
                local.cloudId = cl.cloudId;
                cl.items.forEach(function(ci) {
                    var exists = local.items.some(function(li) {
                        return li.articleId === ci.articleId;
                    });
                    if (!exists) local.items.push(ci);
                });
            } else {
                data.lists.push(cl);
            }
        });
        _setRLData(data);
    }

    /* ── Collections popover (for cards & article footer) ── */
    function _showCollPopover(anchorEl, articleId, slug) {
        _dismissCollPopover();
        var lists = _getAllLists();
        var rect = anchorEl.getBoundingClientRect();
        _collPopover = document.createElement('div');
        _collPopover.className = 'lb-coll-popover';

        var html = '';
        lists.forEach(function(l) {
            var inList = _isArticleInList(l.id, articleId, slug);
            html += '<div class="lb-coll-popover-item" data-list-id="' + l.id + '">' +
                '<span class="lb-coll-popover-check' + (inList ? ' checked' : '') + '">' + (inList ? '✓' : '') + '</span>' +
                '<span class="lb-coll-popover-emoji">' + (l.emoji || '📑') + '</span>' +
                '<span class="lb-coll-popover-name">' + esc(l.name) + '</span></div>';
        });
        html += '<div class="lb-coll-popover-divider"></div>' +
            '<div class="lb-coll-popover-new" id="lbCollPopNew"><i class="fa-solid fa-plus" style="font-size:10px"></i> New list</div>';

        _collPopover.innerHTML = html;
        document.body.appendChild(_collPopover);

        var pw = _collPopover.offsetWidth;
        var ph = _collPopover.offsetHeight;
        var left = rect.right - pw + window.scrollX;
        var top = rect.bottom + 4 + window.scrollY;
        if (top + ph > window.scrollY + window.innerHeight) top = rect.top + window.scrollY - ph - 4;
        left = Math.max(8, Math.min(left, window.innerWidth - pw - 8 + window.scrollX));
        _collPopover.style.top = top + 'px';
        _collPopover.style.left = left + 'px';
        _collPopover.style.position = 'absolute';

        _collPopover.querySelectorAll('.lb-coll-popover-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                var listId = item.dataset.listId;
                var check = item.querySelector('.lb-coll-popover-check');
                if (_isArticleInList(listId, articleId, slug)) {
                    _removeFromList(listId, articleId, slug);
                    check.classList.remove('checked');
                    check.textContent = '';
                } else {
                    _addToList(listId, articleId, slug);
                    check.classList.add('checked');
                    check.textContent = '✓';
                }
                _refreshBookmarkButtons(slug);
                _updateCollBadge();
                snd('tap');
            });
        });

        var newBtn = _collPopover.querySelector('#lbCollPopNew');
        if (newBtn) {
            newBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                _showInlineNewList(_collPopover, articleId, slug);
            });
        }

        setTimeout(function() {
            document.addEventListener('mousedown', _collPopoverDismissHandler);
            document.addEventListener('touchstart', _collPopoverDismissHandler);
        }, 0);
    }

    function _showInlineNewList(popover, articleId, slug) {
        var existing = popover.querySelector('.lb-coll-inline-new');
        if (existing) return;
        var wrap = document.createElement('div');
        wrap.className = 'lb-coll-inline-new';
        wrap.style.cssText = 'padding:6px 12px;display:flex;flex-direction:column;gap:4px';
        wrap.innerHTML =
            '<input type="text" placeholder="List name..." style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:11px;padding:5px 8px">' +
            '<div class="lb-coll-emoji-row">' + _COLL_EMOJIS.map(function(e) {
                return '<span class="lb-coll-emoji-opt" data-em="' + e + '">' + e + '</span>';
            }).join('') + '</div>' +
            '<button style="background:var(--accent);color:#000;border:none;border-radius:4px;padding:5px 8px;font-family:\'JetBrains Mono\',monospace;font-size:10px;font-weight:700;cursor:pointer">Create</button>';
        popover.appendChild(wrap);
        var inp = wrap.querySelector('input');
        inp.focus();
        var selEmoji = '📑';
        wrap.querySelectorAll('.lb-coll-emoji-opt').forEach(function(em) {
            em.addEventListener('click', function(ev) {
                ev.stopPropagation();
                selEmoji = em.dataset.em;
                wrap.querySelectorAll('.lb-coll-emoji-opt').forEach(function(o) { o.style.background = 'none'; });
                em.style.background = 'rgba(0,225,255,.2)';
            });
        });
        wrap.querySelector('button').addEventListener('click', function(ev) {
            ev.stopPropagation();
            var name = inp.value.trim();
            if (!name) return;
            var newList = _createList(name, selEmoji);
            if (articleId) _addToList(newList.id, articleId, slug);
            _refreshBookmarkButtons(slug);
            _updateCollBadge();
            _dismissCollPopover();
            snd('success');
            if (window.UniToast) window.UniToast('List "' + name + '" created!', '', selEmoji, 'success');
        });
    }

    function _collPopoverDismissHandler(e) {
        if (_collPopover && !_collPopover.contains(e.target)) _dismissCollPopover();
    }

    function _dismissCollPopover() {
        if (_collPopover) { _collPopover.remove(); _collPopover = null; }
        document.removeEventListener('mousedown', _collPopoverDismissHandler);
        document.removeEventListener('touchstart', _collPopoverDismissHandler);
    }

    function _refreshBookmarkButtons(slug) {
        var inAny = _isArticleInAnyList(slug, slug);
        document.querySelectorAll('.lb-card-v2-bookmark[data-bm="' + slug + '"]').forEach(function(btn) {
            btn.className = 'lb-card-v2-bookmark' + (inAny ? ' active' : '');
            btn.innerHTML = '<i class="fa-' + (inAny ? 'solid' : 'regular') + ' fa-bookmark"></i>';
        });
        var footerBtn = document.getElementById('lbBookmarkArticle');
        if (footerBtn) updateBookmarkBtn(footerBtn, inAny);
    }

    /* ── Collections sidebar panel ── */
    function _closeCollPanel() {
        if (!_collPanel) return;
        _collPanelOpen = false;
        _collPanel.classList.remove('show');
    }

    function _collPanelOutsideClick(e) {
        if (!_collPanelOpen || !_collPanel) return;
        if (_collPanel.contains(e.target)) return;
        if (_collFab && _collFab.contains(e.target)) return;
        if (_collPopover && _collPopover.contains(e.target)) return;
        _closeCollPanel();
    }

    function _collPanelEsc(e) {
        if (e.key === 'Escape' && _collPanelOpen && _collPanel) {
            e.preventDefault();
            e.stopPropagation();
            _closeCollPanel();
        }
    }

    function initCollectionsPanel() {
        destroyCollectionsPanel();
        _ensureDefaultList();

        _collFab = document.createElement('button');
        _collFab.className = 'lb-coll-fab';
        _collFab.title = 'Collections';
        _collFab.innerHTML = '<i class="fa-solid fa-layer-group"></i><span class="lb-coll-badge" style="display:none">0</span>';
        document.body.appendChild(_collFab);

        _collPanel = document.createElement('div');
        _collPanel.className = 'lb-coll-panel';
        _collPanel.innerHTML =
            '<div class="lb-coll-panel-header"><span class="lb-coll-panel-title">Collections</span><button class="lb-coll-panel-close">&times;</button></div>' +
            '<div class="lb-coll-new"><input type="text" placeholder="New list name..." id="lbCollNewInput"><button class="lb-coll-new-btn" id="lbCollNewBtn">Create</button></div>' +
            '<div class="lb-coll-scroll" id="lbCollScroll"></div>';
        document.body.appendChild(_collPanel);

        _collFab.addEventListener('click', function() {
            _collPanelOpen = !_collPanelOpen;
            _collPanel.classList.toggle('show', _collPanelOpen);
            if (_collPanelOpen) _renderCollList();
            snd('tap');
        });

        _collPanel.querySelector('.lb-coll-panel-close').addEventListener('click', _closeCollPanel);
        document.addEventListener('pointerdown', _collPanelOutsideClick);
        document.addEventListener('keydown', _collPanelEsc, true);

        var newInput = document.getElementById('lbCollNewInput');
        var newBtn = document.getElementById('lbCollNewBtn');
        if (newInput && newBtn) {
            var emojiSel = '📑';
            newBtn.addEventListener('click', function() {
                var name = newInput.value.trim();
                if (!name) return;
                _createList(name, emojiSel);
                newInput.value = '';
                _renderCollList();
                _updateCollBadge();
                snd('success');
                if (window.UniToast) window.UniToast('List "' + name + '" created!', '', emojiSel, 'success');
            });
            newInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') newBtn.click();
            });
        }

        _updateCollBadge();
    }

    function _updateCollBadge() {
        if (!_collFab) return;
        var total = _getAllLists().reduce(function(s, l) { return s + l.items.length; }, 0);
        var badge = _collFab.querySelector('.lb-coll-badge');
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function _renderCollList(detailListId) {
        var scroll = document.getElementById('lbCollScroll');
        if (!scroll) return;
        var lists = _getAllLists();

        if (detailListId) {
            _renderCollDetail(scroll, detailListId);
            return;
        }

        if (!lists.length) {
            scroll.innerHTML = '<div class="lb-coll-empty"><div class="lb-coll-empty-icon">📚</div>No collections yet.<br>Create one above.</div>';
            return;
        }

        scroll.innerHTML = lists.map(function(l) {
            return '<div class="lb-coll-item" data-list-id="' + l.id + '">' +
                '<span class="lb-coll-item-emoji">' + (l.emoji || '📑') + '</span>' +
                '<div class="lb-coll-item-info">' +
                '<div class="lb-coll-item-name">' + esc(l.name) + '</div>' +
                '<div class="lb-coll-item-count">' + l.items.length + ' article' + (l.items.length !== 1 ? 's' : '') + '</div>' +
                '</div>' +
                (l.isDefault ? '' :
                    '<div class="lb-coll-item-actions">' +
                    '<button class="lb-coll-item-action rename" data-id="' + l.id + '" title="Rename">✏️</button>' +
                    '<button class="lb-coll-item-action del" data-id="' + l.id + '" title="Delete">🗑️</button>' +
                    '</div>') +
                '</div>';
        }).join('');

        scroll.querySelectorAll('.lb-coll-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.lb-coll-item-action')) return;
                _renderCollList(item.dataset.listId);
                snd('tap');
            });
        });

        scroll.querySelectorAll('.lb-coll-item-action.rename').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var listId = btn.dataset.id;
                var list = _getListById(listId);
                if (!list) return;
                _showRenameInline(btn.closest('.lb-coll-item'), list);
            });
        });

        scroll.querySelectorAll('.lb-coll-item-action.del').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var listId = btn.dataset.id;
                var list = _getListById(listId);
                if (!list) return;
                if (!confirm('Delete "' + list.name + '"? Articles won\'t be deleted.')) return;
                _deleteList(listId);
                _renderCollList();
                _updateCollBadge();
                snd('tap');
                if (window.UniToast) window.UniToast('List deleted', '', '🗑️', 'info');
            });
        });
    }

    function _showRenameInline(itemEl, list) {
        var infoEl = itemEl.querySelector('.lb-coll-item-info');
        if (!infoEl) return;
        var origHtml = infoEl.innerHTML;
        infoEl.innerHTML =
            '<input type="text" value="' + esc(list.name) + '" style="background:rgba(255,255,255,.05);border:1px solid var(--accent);border-radius:3px;color:var(--text);font-size:11px;padding:3px 6px;width:100%;font-family:\'JetBrains Mono\',monospace">' +
            '<div class="lb-coll-emoji-row" style="margin-top:4px">' + _COLL_EMOJIS.map(function(e) {
                return '<span class="lb-coll-emoji-opt' + (e === list.emoji ? '" style="background:rgba(0,225,255,.2)' : '') + '" data-em="' + e + '">' + e + '</span>';
            }).join('') + '</div>';
        var inp = infoEl.querySelector('input');
        inp.focus();
        inp.select();
        var selEmoji = list.emoji;
        infoEl.querySelectorAll('.lb-coll-emoji-opt').forEach(function(em) {
            em.addEventListener('click', function(ev) {
                ev.stopPropagation();
                selEmoji = em.dataset.em;
                infoEl.querySelectorAll('.lb-coll-emoji-opt').forEach(function(o) { o.style.background = 'none'; });
                em.style.background = 'rgba(0,225,255,.2)';
            });
        });
        function save() {
            var newName = inp.value.trim();
            if (newName) {
                _renameList(list.id, newName, selEmoji);
                snd('success');
            }
            _renderCollList();
        }
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') _renderCollList();
        });
        inp.addEventListener('blur', function() {
            setTimeout(save, 150);
        });
    }

    function _renderCollDetail(scroll, listId) {
        var list = _getListById(listId);
        if (!list) { _renderCollList(); return; }

        var items = list.items.slice().sort(function(a, b) { return (a.position || 0) - (b.position || 0); });

        scroll.innerHTML =
            '<div class="lb-coll-detail-header">' +
            '<button class="lb-coll-back">&larr;</button>' +
            '<span class="lb-coll-detail-title">' + (list.emoji || '📑') + ' ' + esc(list.name) + ' (' + items.length + ')</span>' +
            '</div>' +
            (items.length ? items.map(function(it) {
                var art = B._allFeedArticles.find(function(a) { return a.id === it.articleId || a.slug === it.slug; });
                var title = art ? art.title : it.slug;
                var cover = art ? art.cover_image : '';
                return '<div class="lb-coll-article" data-slug="' + esc(it.slug) + '">' +
                    (cover ?
                        '<img class="lb-coll-article-img" src="' + esc(cover) + '" alt="' + esc(title) + '" loading="lazy">' :
                        '<div class="lb-coll-article-fallback"><i class="fa-solid fa-feather-pointed"></i></div>') +
                    '<div class="lb-coll-article-info">' +
                    '<div class="lb-coll-article-title">' + esc(title) + '</div>' +
                    '<div class="lb-coll-article-meta">' + _timeAgo(it.addedAt) + '</div>' +
                    '</div>' +
                    '<button class="lb-coll-article-rm" data-art-id="' + it.articleId + '" data-slug="' + esc(it.slug) + '" title="Remove">&times;</button>' +
                    '</div>';
            }).join('') :
                '<div class="lb-coll-empty"><div class="lb-coll-empty-icon">📭</div>No articles in this list yet.</div>');

        scroll.querySelector('.lb-coll-back').addEventListener('click', function() {
            _renderCollList();
            snd('tap');
        });

        scroll.querySelectorAll('.lb-coll-article').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.lb-coll-article-rm')) return;
                var s = card.dataset.slug;
                if (s) { B.navigateTo({ post: s }); snd('tap'); }
            });
        });

        scroll.querySelectorAll('.lb-coll-article-rm').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                _removeFromList(listId, btn.dataset.artId, btn.dataset.slug);
                _renderCollDetail(scroll, listId);
                _updateCollBadge();
                _refreshBookmarkButtons(btn.dataset.slug);
                snd('tap');
            });
        });
    }

    function destroyCollectionsPanel() {
        document.removeEventListener('pointerdown', _collPanelOutsideClick);
        document.removeEventListener('keydown', _collPanelEsc, true);
        _dismissCollPopover();
        if (_collFab) { _collFab.remove(); _collFab = null; }
        if (_collPanel) { _collPanel.remove(); _collPanel = null; }
        _collPanelOpen = false;
    }

    // ANNOTATIONS (lines 4897-5401)
    const LS_ANNOTATIONS = '_lb_annotations';
    const LS_READING_HIST = '_lb_reading_history';

    function _getAnnotations() { try { return JSON.parse(localStorage.getItem(LS_ANNOTATIONS) || '{}'); } catch(e) { return {}; } }
    function _setAnnotations(v) {
        try {
            // Cap annotations: keep max 200 per article, max 50 articles
            const keys = Object.keys(v);
            if (keys.length > 50) {
                keys.slice(0, keys.length - 50).forEach(k => delete v[k]);
            }
            keys.forEach(k => { if (Array.isArray(v[k]) && v[k].length > 200) v[k] = v[k].slice(-200); });
            localStorage.setItem(LS_ANNOTATIONS, JSON.stringify(v));
        } catch(e) {
            if (e.name === 'QuotaExceededError') {
                try { const pruned = {}; const k = Object.keys(v); k.slice(-10).forEach(id => { pruned[id] = v[id]; }); localStorage.setItem(LS_ANNOTATIONS, JSON.stringify(pruned)); } catch(e2) {}
            }
        }
    }
    function _getReadingHist() { try { return JSON.parse(localStorage.getItem(LS_READING_HIST) || '{}'); } catch(e) { return {}; } }
    function _setReadingHist(v) {
        try {
            // Keep only the 100 most recent entries
            const entries = Object.entries(v);
            if (entries.length > 100) {
                entries.sort((a, b) => (b[1].last_read_at || 0) - (a[1].last_read_at || 0));
                v = Object.fromEntries(entries.slice(0, 100));
            }
            localStorage.setItem(LS_READING_HIST, JSON.stringify(v));
        } catch(e) {
            if (e.name === 'QuotaExceededError') {
                try { const entries = Object.entries(v).sort((a, b) => (b[1].last_read_at || 0) - (a[1].last_read_at || 0)); localStorage.setItem(LS_READING_HIST, JSON.stringify(Object.fromEntries(entries.slice(0, 30)))); } catch(e2) {}
            }
        }
    }

    function _getArticleAnnotations(articleId) {
        var all = _getAnnotations();
        return all[articleId] || [];
    }

    function _saveAnnotation(articleId, ann) {
        var all = _getAnnotations();
        if (!all[articleId]) all[articleId] = [];
        var idx = all[articleId].findIndex(function(a) { return a.id === ann.id; });
        if (idx >= 0) all[articleId][idx] = ann;
        else all[articleId].push(ann);
        _setAnnotations(all);
        _syncAnnotationToCloud(articleId, ann);
    }

    function _deleteAnnotation(articleId, annId) {
        var all = _getAnnotations();
        var cloudId = null;
        if (all[articleId]) {
            var ann = all[articleId].find(function(a) { return a.id === annId; });
            if (ann) cloudId = ann.cloudId || ann.id;
            all[articleId] = all[articleId].filter(function(a) { return a.id !== annId; });
            if (!all[articleId].length) delete all[articleId];
        }
        _setAnnotations(all);
        if (cloudId && !cloudId.startsWith('local_')) _deleteAnnotationFromCloud(cloudId);
    }

    function _syncAnnotationToCloud(articleId, ann) {
        if (!window._sb) return;
        if (ann.cloudId && !ann.cloudId.startsWith('local_')) {
            window._sb.rpc('update_annotation_note', {
                p_annotation_id: ann.cloudId,
                p_note: ann.note || null
            }).then(function() {}, function() {});
            window._sb.from('reader_annotations')
                .update({ color: ann.color })
                .eq('id', ann.cloudId)
                .then(function() {}, function() {});
            return;
        }
        window._sb.rpc('upsert_annotation', {
            p_article_id: articleId,
            p_text: ann.text,
            p_note: ann.note || null,
            p_color: ann.color,
            p_start: ann.start,
            p_end: ann.end
        }).then(function(res) {
            if (res.data && ann.id.startsWith('local_')) {
                var all = _getAnnotations();
                if (all[articleId]) {
                    var item = all[articleId].find(function(a) { return a.id === ann.id; });
                    if (item) item.cloudId = res.data;
                    _setAnnotations(all);
                }
            }
        }, function() {});
    }

    function _deleteAnnotationFromCloud(annId) {
        if (!window._sb) return;
        window._sb.rpc('delete_annotation', { p_annotation_id: annId }).then(function() {}, function() {});
    }

    async function _fetchCloudAnnotations(articleId) {
        if (!window._sb) return [];
        try {
            var res = await window._sb
                .from('reader_annotations')
                .select('id,highlighted_text,note,color,start_offset,end_offset,created_at')
                .eq('article_id', articleId);
            if (res.error || !res.data) return [];
            return res.data.map(function(r) {
                return { id: r.id, cloudId: r.id, text: r.highlighted_text, note: r.note, color: r.color, start: r.start_offset, end: r.end_offset, created_at: r.created_at };
            });
        } catch(e) { return []; }
    }

    async function _mergeCloudAnnotations(articleId) {
        var cloudAnns = await _fetchCloudAnnotations(articleId);
        if (!cloudAnns.length) return;
        var all = _getAnnotations();
        var local = all[articleId] || [];
        cloudAnns.forEach(function(ca) {
            var exists = local.some(function(la) {
                return la.cloudId === ca.id || (la.start === ca.start && la.end === ca.end);
            });
            if (!exists) local.push(ca);
        });
        all[articleId] = local;
        _setAnnotations(all);
    }

    function _genLocalId() { return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

    /* ── Text offset computation for DOM Range serialization ── */
    function _getTextOffset(container, targetNode, targetOffset) {
        var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        var offset = 0;
        var node;
        while ((node = walker.nextNode())) {
            if (node === targetNode) return offset + targetOffset;
            offset += node.textContent.length;
        }
        return offset;
    }

    function _findRangeFromOffsets(container, startOff, endOff) {
        var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        var offset = 0;
        var startNode = null, startLocal = 0, endNode = null, endLocal = 0;
        var node;
        while ((node = walker.nextNode())) {
            var len = node.textContent.length;
            if (!startNode && offset + len > startOff) {
                startNode = node;
                startLocal = startOff - offset;
            }
            if (offset + len >= endOff) {
                endNode = node;
                endLocal = endOff - offset;
                break;
            }
            offset += len;
        }
        if (!startNode || !endNode) return null;
        try {
            var r = document.createRange();
            r.setStart(startNode, startLocal);
            r.setEnd(endNode, endLocal);
            return r;
        } catch(e) { return null; }
    }

    /* ── Create / Apply / Remove highlights ── */
    function createHighlight(range, text, color, article) {
        var contentEl = document.querySelector('.lb-content');
        if (!contentEl || !article) return;

        var startOff = _getTextOffset(contentEl, range.startContainer, range.startOffset);
        var endOff = _getTextOffset(contentEl, range.endContainer, range.endOffset);

        var ann = {
            id: _genLocalId(),
            text: text,
            note: null,
            color: color,
            start: startOff,
            end: endOff,
            created_at: new Date().toISOString()
        };

        _saveAnnotation(article.id, ann);
        _wrapHighlight(range, ann);
        _updateAnnBadge(article.id);

        if (window.UniToast) window.UniToast('Text highlighted!', '', '🖍️', 'success');
    }

    function _wrapHighlight(range, ann) {
        var mark = document.createElement('mark');
        mark.className = 'lb-hl lb-hl-' + ann.color;
        mark.dataset.annId = ann.id;
        if (ann.note) {
            var ni = document.createElement('span');
            ni.className = 'lb-hl-note-icon';
            ni.textContent = '📝';
            mark.appendChild(ni);
        }
        try {
            range.surroundContents(mark);
        } catch(e) {
            var frag = range.extractContents();
            mark.appendChild(frag);
            range.insertNode(mark);
        }
        mark.addEventListener('click', function(ev) { ev.stopPropagation(); _showHlToolbar(mark, ann); });
    }

    function applyHighlights(articleId) {
        var contentEl = document.querySelector('.lb-content');
        if (!contentEl) return;
        var anns = _getArticleAnnotations(articleId);
        var sorted = anns.slice().sort(function(a, b) { return b.start - a.start; });
        sorted.forEach(function(ann) {
            var range = _findRangeFromOffsets(contentEl, ann.start, ann.end);
            if (range) _wrapHighlight(range, ann);
        });
    }

    function _removeHighlightMark(annId) {
        var mark = document.querySelector('.lb-hl[data-ann-id="' + annId + '"]');
        if (!mark) return;
        var parent = mark.parentNode;
        while (mark.firstChild) {
            if (mark.firstChild.classList && mark.firstChild.classList.contains('lb-hl-note-icon')) {
                mark.removeChild(mark.firstChild);
            } else {
                parent.insertBefore(mark.firstChild, mark);
            }
        }
        parent.removeChild(mark);
        parent.normalize();
    }

    /* ── Highlight toolbar (hover/click on a highlight) ── */
    function _showHlToolbar(markEl, ann) {
        _dismissHlToolbar();
        _dismissNotePopover();
        var rect = markEl.getBoundingClientRect();
        _hlToolbar = document.createElement('div');
        _hlToolbar.className = 'lb-hl-toolbar';
        _hlToolbar.innerHTML =
            '<button data-act="note" title="Add note">📝</button>' +
            '<button data-act="color" title="Change color">🎨</button>' +
            '<button data-act="delete" title="Remove">🗑️</button>';
        document.body.appendChild(_hlToolbar);

        var tw = _hlToolbar.offsetWidth;
        var left = rect.left + (rect.width / 2) - (tw / 2) + window.scrollX;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        _hlToolbar.style.top = (rect.top + window.scrollY - _hlToolbar.offsetHeight - 6) + 'px';
        _hlToolbar.style.left = left + 'px';

        _hlToolbar.querySelector('[data-act="note"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            _dismissHlToolbar();
            _showNotePopover(markEl, ann);
        });

        _hlToolbar.querySelector('[data-act="color"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            var colors = ['yellow', 'blue', 'green', 'pink'];
            var cur = colors.indexOf(ann.color);
            ann.color = colors[(cur + 1) % colors.length];
            markEl.className = 'lb-hl lb-hl-' + ann.color;
            var articleId = B.currentArticle ? B.currentArticle.id : null;
            if (articleId) _saveAnnotation(articleId, ann);
            snd('tap');
        });

        _hlToolbar.querySelector('[data-act="delete"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            _dismissHlToolbar();
            var articleId = B.currentArticle ? B.currentArticle.id : null;
            if (articleId) _deleteAnnotation(articleId, ann.id);
            _removeHighlightMark(ann.id);
            _updateAnnBadge(articleId);
            if (_annPanelOpen && articleId) _renderAnnList(articleId);
            snd('tap');
            if (window.UniToast) window.UniToast('Highlight removed', '', '🗑️', 'info');
        });

        setTimeout(function() {
            document.addEventListener('mousedown', _hlToolbarDismissHandler);
            document.addEventListener('touchstart', _hlToolbarDismissHandler);
        }, 0);
    }

    function _hlToolbarDismissHandler(e) {
        if (_hlToolbar && !_hlToolbar.contains(e.target)) _dismissHlToolbar();
    }

    function _dismissHlToolbar() {
        if (_hlToolbar) { _hlToolbar.remove(); _hlToolbar = null; }
        document.removeEventListener('mousedown', _hlToolbarDismissHandler);
        document.removeEventListener('touchstart', _hlToolbarDismissHandler);
    }

    /* ── Note popover ── */
    function _showNotePopover(markEl, ann) {
        _dismissNotePopover();
        var rect = markEl.getBoundingClientRect();
        _notePopover = document.createElement('div');
        _notePopover.className = 'lb-note-popover';
        _notePopover.innerHTML =
            '<textarea placeholder="Add a note...">' + esc(ann.note || '') + '</textarea>' +
            '<div class="lb-note-popover-btns">' +
            '<button class="lb-note-cancel">Cancel</button>' +
            '<button class="lb-note-save">Save</button>' +
            '</div>';
        document.body.appendChild(_notePopover);

        var pw = _notePopover.offsetWidth;
        var left = rect.left + (rect.width / 2) - (pw / 2) + window.scrollX;
        left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
        _notePopover.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        _notePopover.style.left = left + 'px';

        var ta = _notePopover.querySelector('textarea');
        ta.focus();

        _notePopover.querySelector('.lb-note-save').addEventListener('click', function(ev) {
            ev.stopPropagation();
            ann.note = ta.value.trim() || null;
            var articleId = B.currentArticle ? B.currentArticle.id : null;
            if (articleId) _saveAnnotation(articleId, ann);
            var existing = markEl.querySelector('.lb-hl-note-icon');
            if (ann.note && !existing) {
                var ni = document.createElement('span');
                ni.className = 'lb-hl-note-icon';
                ni.textContent = '📝';
                markEl.insertBefore(ni, markEl.firstChild);
            } else if (!ann.note && existing) {
                existing.remove();
            }
            if (_annPanelOpen && articleId) _renderAnnList(articleId);
            _dismissNotePopover();
            snd('success');
            if (window.UniToast) window.UniToast(ann.note ? 'Note saved!' : 'Note removed', '', '📝', 'success');
        });

        _notePopover.querySelector('.lb-note-cancel').addEventListener('click', function(ev) {
            ev.stopPropagation();
            _dismissNotePopover();
        });

        setTimeout(function() {
            document.addEventListener('mousedown', _notePopoverDismissHandler);
            document.addEventListener('touchstart', _notePopoverDismissHandler);
        }, 0);
    }

    function _notePopoverDismissHandler(e) {
        if (_notePopover && !_notePopover.contains(e.target)) _dismissNotePopover();
    }

    function _dismissNotePopover() {
        if (_notePopover) { _notePopover.remove(); _notePopover = null; }
        document.removeEventListener('mousedown', _notePopoverDismissHandler);
        document.removeEventListener('touchstart', _notePopoverDismissHandler);
    }

    /* ── Annotations panel (sidebar) ── */
    function _closeAnnPanel() {
        if (!_annPanel) return;
        _annPanelOpen = false;
        _annPanel.classList.remove('show');
    }

    function _annPanelOutsideClick(e) {
        if (!_annPanelOpen || !_annPanel) return;
        if (_annPanel.contains(e.target)) return;
        if (_annFab && _annFab.contains(e.target)) return;
        _closeAnnPanel();
    }

    function _annPanelEsc(e) {
        if (e.key === 'Escape' && _annPanelOpen && _annPanel) {
            e.preventDefault();
            e.stopPropagation();
            _closeAnnPanel();
        }
    }

    function initAnnotationsPanel(articleId) {
        destroyAnnotationsPanel();

        _annFab = document.createElement('button');
        _annFab.className = 'lb-ann-fab';
        _annFab.title = 'Annotations';
        _annFab.innerHTML = '<i class="fa-solid fa-highlighter"></i><span class="lb-ann-badge" style="display:none">0</span>';
        document.body.appendChild(_annFab);

        _annPanel = document.createElement('div');
        _annPanel.className = 'lb-ann-panel';
        _annPanel.innerHTML =
            '<div class="lb-ann-panel-header"><span class="lb-ann-panel-title">Annotations</span><button class="lb-ann-panel-close">&times;</button></div>' +
            '<div class="lb-ann-tabs">' +
            '<button class="lb-ann-tab active" data-tab="all">All</button>' +
            '<button class="lb-ann-tab" data-tab="notes">With Notes</button>' +
            '</div>' +
            '<div class="lb-ann-list"></div>';
        document.body.appendChild(_annPanel);

        _annFab.addEventListener('click', function() {
            _annPanelOpen = !_annPanelOpen;
            _annPanel.classList.toggle('show', _annPanelOpen);
            if (_annPanelOpen) _renderAnnList(articleId);
            snd('tap');
        });

        _annPanel.querySelector('.lb-ann-panel-close').addEventListener('click', _closeAnnPanel);

        _annPanel.querySelectorAll('.lb-ann-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                _annPanel.querySelectorAll('.lb-ann-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                _renderAnnList(articleId);
                snd('tap');
            });
        });

        document.addEventListener('pointerdown', _annPanelOutsideClick);
        document.addEventListener('keydown', _annPanelEsc, true);

        _updateAnnBadge(articleId);
    }

    function _updateAnnBadge(articleId) {
        if (!_annFab) return;
        var anns = _getArticleAnnotations(articleId);
        var badge = _annFab.querySelector('.lb-ann-badge');
        if (anns.length > 0) {
            badge.textContent = anns.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function _renderAnnList(articleId) {
        var list = _annPanel ? _annPanel.querySelector('.lb-ann-list') : null;
        if (!list) return;
        var activeTab = _annPanel.querySelector('.lb-ann-tab.active');
        var filter = activeTab ? activeTab.dataset.tab : 'all';
        var anns = _getArticleAnnotations(articleId);
        if (filter === 'notes') anns = anns.filter(function(a) { return a.note; });
        anns.sort(function(a, b) { return a.start - b.start; });

        if (!anns.length) {
            list.innerHTML = '<div class="lb-ann-empty"><div class="lb-ann-empty-icon">' +
                (filter === 'notes' ? '📝' : '🖍️') + '</div>' +
                (filter === 'notes' ? 'No notes yet. Add notes to your highlights.' : 'No highlights yet. Select text to highlight.') + '</div>';
            return;
        }

        list.innerHTML = anns.map(function(ann) {
            var colorMap = { yellow: '#ffe600', blue: '#38b6ff', green: '#00dc82', pink: '#ff64b4' };
            return '<div class="lb-ann-item" data-ann-id="' + ann.id + '">' +
                '<div style="display:flex;align-items:flex-start;gap:8px">' +
                '<span class="lb-ann-item-color" style="background:' + (colorMap[ann.color] || '#ffe600') + ';margin-top:4px"></span>' +
                '<div style="flex:1;min-width:0">' +
                '<div class="lb-ann-item-text">' + esc(ann.text) + '</div>' +
                (ann.note ? '<div class="lb-ann-item-note">📝 ' + esc(ann.note) + '</div>' : '') +
                '</div></div>' +
                '<div class="lb-ann-item-meta">' +
                '<span class="lb-ann-item-date">' + _timeAgo(ann.created_at) + '</span>' +
                '<button class="lb-ann-item-del" data-del="' + ann.id + '" title="Delete">&times;</button>' +
                '</div></div>';
        }).join('');

        list.querySelectorAll('.lb-ann-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.lb-ann-item-del')) return;
                var annId = item.dataset.annId;
                var mark = document.querySelector('.lb-hl[data-ann-id="' + annId + '"]');
                if (mark) {
                    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    mark.classList.add('lb-hl-pulse');
                    setTimeout(function() { mark.classList.remove('lb-hl-pulse'); }, 700);
                }
                snd('tap');
            });
        });

        list.querySelectorAll('.lb-ann-item-del').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var annId = btn.dataset.del;
                _deleteAnnotation(articleId, annId);
                _removeHighlightMark(annId);
                _updateAnnBadge(articleId);
                _renderAnnList(articleId);
                snd('tap');
            });
        });
    }

    function destroyAnnotationsPanel() {
        document.removeEventListener('pointerdown', _annPanelOutsideClick);
        document.removeEventListener('keydown', _annPanelEsc, true);
        _dismissHlToolbar();
        _dismissNotePopover();
        if (_annFab) { _annFab.remove(); _annFab = null; }
        if (_annPanel) { _annPanel.remove(); _annPanel = null; }
        _annPanelOpen = false;
    }

    function _timeAgo(dateStr) {
        if (!dateStr) return '';
        var diff = Date.now() - new Date(dateStr).getTime();
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        var days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd ago';
        return new Date(dateStr).toLocaleDateString();
    }

    // READING HISTORY (lines 5403-5537)
    function _initReadingHistory(articleData) {
        _destroyReadingHistory();
        _rhArticleId = articleData.id;
        _rhTimeSpent = 0;
        _rhProgress = 0;

        var hist = _getReadingHist();
        var existing = hist[_rhArticleId];
        if (existing) {
            _rhTimeSpent = existing.time_spent || 0;
            _rhProgress = existing.progress || 0;
        }

        hist[_rhArticleId] = Object.assign(existing || {}, {
            slug: articleData.slug,
            title: articleData.title,
            cover_image: articleData.cover_image || '',
            last_read_at: new Date().toISOString(),
            time_spent: _rhTimeSpent,
            progress: _rhProgress,
            completed: (existing && existing.completed) || false
        });
        _setReadingHist(hist);

        _rhTimer = setInterval(function() {
            if (document.hidden) return;
            _rhTimeSpent++;
            _rhProgress = _getCurrentProgress();
            var h = _getReadingHist();
            if (h[_rhArticleId]) {
                h[_rhArticleId].time_spent = _rhTimeSpent;
                h[_rhArticleId].progress = Math.max(h[_rhArticleId].progress || 0, _rhProgress);
                if (_rhProgress >= 95) h[_rhArticleId].completed = true;
                h[_rhArticleId].last_read_at = new Date().toISOString();
                _setReadingHist(h);
            }
        }, 1000);

        _rhSyncTimeout = setInterval(function() {
            _syncReadingToCloud();
        }, 15000);
    }

    function _getCurrentProgress() {
        var articleEl = document.querySelector('.lb-article');
        if (!articleEl) return 0;
        var rect = articleEl.getBoundingClientRect();
        var scrolled = -rect.top;
        var total = rect.height - window.innerHeight;
        if (total <= 0) return 100;
        return Math.max(0, Math.min(100, Math.round((scrolled / total) * 100)));
    }

    function _syncReadingToCloud() {
        if (!window._sb || !_rhArticleId) return;
        var h = _getReadingHist();
        var entry = h[_rhArticleId];
        if (!entry) return;
        window._sb.rpc('upsert_reading_progress', {
            p_article_id: _rhArticleId,
            p_progress: entry.progress || 0,
            p_time_spent: entry.time_spent || 0,
            p_completed: entry.completed || false
        }).then(function() {}, function() {});
    }

    function _destroyReadingHistory() {
        if (_rhTimer) { clearInterval(_rhTimer); _rhTimer = null; }
        if (_rhSyncTimeout) { clearInterval(_rhSyncTimeout); _rhSyncTimeout = null; }
        if (_rhArticleId) {
            _rhProgress = _getCurrentProgress();
            var h = _getReadingHist();
            if (h[_rhArticleId]) {
                h[_rhArticleId].progress = Math.max(h[_rhArticleId].progress || 0, _rhProgress);
                h[_rhArticleId].time_spent = _rhTimeSpent;
                if (_rhProgress >= 95) h[_rhArticleId].completed = true;
                _setReadingHist(h);
            }
            _syncReadingToCloud();
        }
        _rhArticleId = null;
        _rhTimeSpent = 0;
        _rhProgress = 0;
    }

    async function _fetchCloudReadingHistory() {
        if (!window._sb) return {};
        try {
            var res = await window._sb
                .from('reading_history')
                .select('article_id,last_read_at,progress,time_spent,completed')
                .order('last_read_at', { ascending: false })
                .limit(50);
            if (res.error || !res.data) return {};
            var map = {};
            res.data.forEach(function(r) {
                map[r.article_id] = {
                    last_read_at: r.last_read_at,
                    progress: r.progress,
                    time_spent: r.time_spent,
                    completed: r.completed
                };
            });
            return map;
        } catch(e) { return {}; }
    }

    async function _mergeCloudReadingHistory() {
        var cloud = await _fetchCloudReadingHistory();
        if (!Object.keys(cloud).length) return;
        var local = _getReadingHist();
        Object.keys(cloud).forEach(function(articleId) {
            var ce = cloud[articleId];
            var le = local[articleId];
            if (!le) {
                var art = B._allFeedArticles.find(function(a) { return a.id === articleId; });
                if (art) {
                    ce.slug = art.slug;
                    ce.title = art.title;
                    ce.cover_image = art.cover_image || '';
                }
                local[articleId] = ce;
            } else {
                le.progress = Math.max(le.progress || 0, ce.progress || 0);
                le.time_spent = Math.max(le.time_spent || 0, ce.time_spent || 0);
                le.completed = le.completed || ce.completed;
                if (new Date(ce.last_read_at) > new Date(le.last_read_at || 0)) {
                    le.last_read_at = ce.last_read_at;
                }
            }
        });
        _setReadingHist(local);
    }

    /* ── Continue Reading strip (feed) ── */
    function renderContinueReading() {
        var existing = document.getElementById('lbContinue');
        if (existing) existing.remove();

        var hist = _getReadingHist();
        var inProgress = [];
        Object.keys(hist).forEach(function(articleId) {
            var entry = hist[articleId];
            if (entry.progress > 0 && !entry.completed && entry.slug) {
                inProgress.push(Object.assign({ articleId: articleId }, entry));
            }
        });

        inProgress.sort(function(a, b) {
            return new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime();
        });

        if (!inProgress.length) return;

        var wrap = document.createElement('div');
        wrap.className = 'lb-continue lb-reveal';
        wrap.id = 'lbContinue';
        wrap.innerHTML =
            '<div class="lb-continue-title"><i class="fa-solid fa-clock-rotate-left"></i> Continue Reading</div>' +
            '<div class="lb-continue-scroll">' +
            inProgress.slice(0, 8).map(function(item) {
                return '<div class="lb-continue-card" data-slug="' + esc(item.slug) + '">' +
                    (item.cover_image ?
                        '<img class="lb-continue-img" src="' + esc(item.cover_image) + '" alt="' + esc(item.title || '') + '" loading="lazy">' :
                        '<div class="lb-continue-fallback"><i class="fa-solid fa-feather-pointed"></i></div>') +
                    '<button class="lb-continue-close" data-rm="' + item.articleId + '" title="Remove" aria-label="Remove from continue reading">&times;</button>' +
                    '<div class="lb-continue-body">' +
                    '<div class="lb-continue-card-title">' + esc(item.title) + '</div>' +
                    '<div class="lb-continue-card-time">' + _timeAgo(item.last_read_at) + '</div>' +
                    '<div class="lb-continue-progress"><div class="lb-continue-progress-fill" style="width:' + Math.round(item.progress) + '%"></div></div>' +
                    '</div></div>';
            }).join('') +
            '</div>';

        var grid = document.getElementById('lbGrid');
        if (grid) grid.parentNode.insertBefore(wrap, grid);

        wrap.querySelectorAll('.lb-continue-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.lb-continue-close')) return;
                B.navigateTo({ post: card.dataset.slug });
                snd('tap');
            });
        });

        wrap.querySelectorAll('.lb-continue-close').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var artId = btn.dataset.rm;
                var h = _getReadingHist();
                delete h[artId];
                _setReadingHist(h);
                btn.closest('.lb-continue-card').remove();
                var remaining = wrap.querySelectorAll('.lb-continue-card');
                if (!remaining.length) wrap.remove();
                snd('tap');
            });
        });
    }

    // Register ALL public functions on B
    B._getRLData = _getRLData;
    B._setRLData = _setRLData;
    B._migrateBookmarks = _migrateBookmarks;
    B._ensureDefaultList = _ensureDefaultList;
    B._getDefaultList = _getDefaultList;
    B._getAllLists = _getAllLists;
    B._getListById = _getListById;
    B._isArticleInList = _isArticleInList;
    B._isArticleInAnyList = _isArticleInAnyList;
    B._addToList = _addToList;
    B._removeFromList = _removeFromList;
    B._createList = _createList;
    B._renameList = _renameList;
    B._deleteList = _deleteList;
    B.getBookmarks = getBookmarks;
    B.toggleBookmark = toggleBookmark;
    B.initBookmarkBtn = initBookmarkBtn;
    B.updateBookmarkBtn = updateBookmarkBtn;
    B._showCollPopover = _showCollPopover;
    B.initCollectionsPanel = initCollectionsPanel;
    B.destroyCollectionsPanel = destroyCollectionsPanel;
    B._getAnnotations = _getAnnotations;
    B._setAnnotations = _setAnnotations;
    B._getReadingHist = _getReadingHist;
    B._setReadingHist = _setReadingHist;
    B._getArticleAnnotations = _getArticleAnnotations;
    B.createHighlight = createHighlight;
    B.applyHighlights = applyHighlights;
    B.initAnnotationsPanel = initAnnotationsPanel;
    B.destroyAnnotationsPanel = destroyAnnotationsPanel;
    B._initReadingHistory = _initReadingHistory;
    B._destroyReadingHistory = _destroyReadingHistory;
    B._mergeCloudAnnotations = _mergeCloudAnnotations;
    B._mergeCloudReadingHistory = _mergeCloudReadingHistory;
    B._mergeCloudLists = _mergeCloudLists;
    B._timeAgo = _timeAgo;
    B.renderContinueReading = renderContinueReading;
    B._genLocalId = _genLocalId;
})();
