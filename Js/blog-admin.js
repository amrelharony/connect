// blog-admin.js — Admin auth, CMS interface, article management
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;
    var fmtDate = B.fmtDate;

    /* ═══════════════════════════════════════════════════
       ADMIN DIALOG — Auth + CMS
       ═══════════════════════════════════════════════════ */

    function isAdmin() {
        // Check Supabase Auth session (needed for RLS writes)
        if (B.adminSession) return true;
        // Fallback to passkey (UI-only — RLS writes may fail without Supabase Auth)
        if (window._passkey && window._passkey.isAuthenticated) return true;
        return false;
    }

    function hasSupabaseAuth() {
        return !!B.adminSession;
    }

    async function checkSupabaseSession() {
        if (!window._sb) return null;
        try {
            const { data } = await window._sb.auth.getSession();
            if (data && data.session) {
                B.adminSession = data.session;
                return data.session;
            }
        } catch (e) { }
        return null;
    }

    async function openAdmin() {
        if (!B.adminDialog) return;

        snd('menuOpen');
        B.adminDialog.showModal();

        // Check existing session
        const session = await checkSupabaseSession();

        if (session || isAdmin()) {
            renderCMS(!hasSupabaseAuth());
        } else {
            renderAuthForm();
        }
    }

    function closeAdmin() {
        if (B.adminDialog) {
            // Auto-save article draft on close
            var titleEl = document.getElementById('lbCmsTitle');
            var editorContent = B._getEditorValue();
            if (!B.editingArticle && titleEl && (titleEl.value.trim() || editorContent.trim())) {
                try {
                    var DRAFTS_KEY = '_lb_drafts';
                    var drafts = [];
                    try { drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY)) || []; } catch(e) {}
                    var now = Date.now();
                    var f = {
                        title: titleEl.value,
                        slug: (document.getElementById('lbCmsSlug') || {}).value || '',
                        excerpt: (document.getElementById('lbCmsExcerpt') || {}).value || '',
                        tags: (document.getElementById('lbCmsTags') || {}).value || '',
                        cover: (document.getElementById('lbCmsCover') || {}).value || '',
                        content: editorContent
                    };
                    var activeId = window._lbActiveDraftId;
                    if (activeId) {
                        var idx = drafts.findIndex(function(d) { return d.id === activeId; });
                        if (idx >= 0) Object.assign(drafts[idx], f, { updatedAt: now });
                        else drafts.unshift(Object.assign({ id: activeId, createdAt: now, updatedAt: now }, f));
                    } else {
                        var uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                        drafts.unshift(Object.assign({ id: uid, createdAt: now, updatedAt: now }, f));
                    }
                    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
                } catch(e) {}
            }
            // Auto-save thought draft on close
            var tContent = document.getElementById('lbQuickContent');
            if (tContent && tContent.value.trim()) {
                try {
                    var T_KEY = '_lb_thought_drafts';
                    var tDrafts = [];
                    try { tDrafts = JSON.parse(localStorage.getItem(T_KEY)) || []; } catch(e) {}
                    var tnow = Date.now();
                    var tActiveId = window._lbTActiveDraftId;
                    if (tActiveId) {
                        var tidx = tDrafts.findIndex(function(d) { return d.id === tActiveId; });
                        if (tidx >= 0) Object.assign(tDrafts[tidx], { content: tContent.value, updatedAt: tnow });
                        else tDrafts.unshift({ id: tActiveId, content: tContent.value, createdAt: tnow, updatedAt: tnow });
                    } else {
                        var tuid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                        tDrafts.unshift({ id: tuid, content: tContent.value, createdAt: tnow, updatedAt: tnow });
                    }
                    localStorage.setItem(T_KEY, JSON.stringify(tDrafts));
                } catch(e) {}
            }
            B._destroyCM6();
            B._markCmsClean();
            window.removeEventListener('beforeunload', B._cmsBeforeUnload);
            B.adminDialog.close();
            snd('menuClose');
        }
    }

    function renderAuthForm() {
        B.adminDialog.innerHTML = `
      <div class="lb-admin-panel lb-auth-panel" style="max-width:480px;margin:120px auto">
        <div class="lb-admin-header">
          <span class="lb-admin-title">⌨ ADMIN ACCESS</span>
          <button class="lb-admin-close" id="lbAuthClose">ESC</button>
        </div>
        <div class="lb-auth-form" style="margin:40px auto">
          <div class="lb-auth-title">AUTHENTICATE</div>
          <div class="lb-auth-sub">SUPABASE AUTH · EMAIL + PASSWORD</div>
          <input type="email" class="lb-auth-input" id="lbAuthEmail" placeholder="admin@example.com" autocomplete="email">
          <input type="password" class="lb-auth-input" id="lbAuthPass" placeholder="••••••••" autocomplete="current-password">
          <button class="lb-auth-submit" id="lbAuthSubmit">SIGN IN</button>
          <div class="lb-auth-error" id="lbAuthError"></div>
        </div>
      </div>`;

        document.getElementById('lbAuthClose').addEventListener('click', closeAdmin);
        document.getElementById('lbAuthSubmit').addEventListener('click', handleSignIn);

        // Enter key
        ['lbAuthEmail', 'lbAuthPass'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', e => {
                if (e.key === 'Enter') handleSignIn();
            });
        });

        document.getElementById('lbAuthEmail').focus();
    }

    async function handleSignIn() {
        const email = document.getElementById('lbAuthEmail').value.trim();
        const pass = document.getElementById('lbAuthPass').value;
        const errEl = document.getElementById('lbAuthError');
        const btn = document.getElementById('lbAuthSubmit');

        if (!email || !pass) { errEl.textContent = 'Email and password required.'; return; }
        if (!window._sb) { errEl.textContent = 'Supabase not available.'; return; }

        btn.disabled = true;
        btn.textContent = 'AUTHENTICATING...';
        errEl.textContent = '';

        try {
            const { data, error } = await window._sb.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
            B.adminSession = data.session;
            snd('success');
            renderCMS(false);
        } catch (e) {
            errEl.textContent = e.message || 'Authentication failed.';
            btn.disabled = false;
            btn.textContent = 'SIGN IN';
        }
    }

    async function handleSignOut() {
        if (window._sb) {
            try { await window._sb.auth.signOut(); } catch (e) { }
        }
        B.adminSession = null;
        // signOut replaces the anonymous session on the shared client;
        // nullify AuthManager so the next visitor action triggers a fresh anonymous sign-in
        if (window.AuthManager) {
            window.AuthManager._sessionPromise = null;
            window.AuthManager._hasValidSession = false;
        }
        closeAdmin();
    }

    /* ═══════════════════════════════════════════════════
       CMS INTERFACE
       ═══════════════════════════════════════════════════ */
    async function renderCMS(passkeyOnly) {
        B.editingArticle = null;
        var _quickPendFile = null;

        B.adminDialog.innerHTML = `
      <div class="lb-admin-panel">
        <div class="lb-admin-header">
          <span class="lb-admin-title">CONTENT MANAGEMENT</span>
          <div class="lb-cms-btn-group">
            <button class="lb-cms-btn secondary" id="lbCmsSignout">Sign Out</button>
            <button class="lb-admin-close" id="lbCmsClose">ESC</button>
          </div>
        </div>
        ${passkeyOnly ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#f59e0b;border:1px solid rgba(245,158,11,.3);padding:8px 12px;margin-bottom:16px">Passkey-only mode. Sign in via Supabase Auth for full write access (Ctrl+Shift+P then Sign Out then Re-login).</div>' : ''}

        <div class="lb-cms-tabs">
          <button class="lb-cms-tab active" data-admintab="article">Write Article</button>
          <button class="lb-cms-tab" data-admintab="micro">Thoughts</button>
          <button class="lb-cms-tab" data-admintab="analytics">Analytics</button>
          <button class="lb-cms-tab" data-admintab="comments">Comments</button>
          <button class="lb-cms-tab" data-admintab="intelligence">Intelligence</button>
          <button class="lb-cms-tab" data-admintab="subscribers">Subscribers</button>
        </div>

        <!-- ── Thoughts Tab ── -->
        <div class="lb-cms-tab-content" id="lbTabMicro" data-admintab-content="micro">
          <div class="lb-quick-post">
            <textarea class="lb-quick-textarea" id="lbQuickContent" maxlength="500" placeholder="What's on your mind? (max 500 chars)&#10;&#10;Poll syntax: [poll:Question?|Option1|Option2]"></textarea>
            <div class="lb-quick-char" id="lbQuickChar">0 / 500</div>
            <div class="lb-quick-row">
              <label class="lb-cms-btn secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                <span>Attach Image</span>
                <input type="file" accept="image/*" id="lbQuickImage" style="display:none">
              </label>
              <img class="lb-quick-img-preview" id="lbQuickImgPreview" alt="">
            </div>
            <div class="lb-cms-actions">
              <div class="lb-cms-btn-group">
                <button class="lb-cms-btn primary" id="lbQuickPost">POST</button>
                <button class="lb-cms-btn secondary" id="lbQuickDraft">SAVE DRAFT</button>
                <button class="lb-cms-btn secondary" id="lbQuickScheduleToggle">SCHEDULE</button>
                <label class="lb-li-toggle"><input type="checkbox" id="lbQuickLinkedIn" checked><span class="lb-li-label"><i class="fa-brands fa-linkedin"></i> Post to LinkedIn</span></label>
              </div>
              <div class="lb-schedule-row" id="lbQuickScheduleRow" style="display:none">
                <input type="datetime-local" class="lb-schedule-input" id="lbQuickScheduleAt">
                <button class="lb-cms-btn primary" id="lbQuickSchedulePost">SCHEDULE POST</button>
                <button class="lb-cms-btn secondary" id="lbQuickScheduleCancel" style="padding:4px 8px;font-size:8px">Cancel</button>
              </div>
              <span class="lb-cms-status" id="lbQuickStatus"></span>
            </div>
          </div>

          <!-- ── Thoughts Sub-tabs ── -->
          <div class="lb-sub-tabs" id="lbMicroSubTabs">
            <button class="lb-sub-tab active" data-msubtab="tdrafts">Drafts <span id="lbTDraftsBadge" style="font-size:8px;opacity:.6"></span></button>
            <button class="lb-sub-tab" data-msubtab="tscheduled">Scheduled <span id="lbTSchedBadge" style="font-size:8px;opacity:.6"></span></button>
            <button class="lb-sub-tab" data-msubtab="tpublished">Published <span id="lbTPubBadge" style="font-size:8px;opacity:.6"></span></button>
          </div>

          <div class="lb-sub-content active" data-msubtab-content="tdrafts">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbTDraftsSearch" placeholder="Search drafts..." type="text">
              <span class="lb-drafts-count" id="lbTDraftsCount"></span>
              <button class="lb-cms-btn primary" id="lbTDraftsNew" style="padding:6px 14px;font-size:9px">+ NEW</button>
            </div>
            <div class="lb-drafts-list" id="lbTDraftsList"></div>
          </div>

          <div class="lb-sub-content" data-msubtab-content="tscheduled">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbTSchedSearch" placeholder="Search scheduled..." type="text">
              <span class="lb-drafts-count" id="lbTSchedCount"></span>
            </div>
            <div class="lb-drafts-list" id="lbTSchedList"></div>
          </div>

          <div class="lb-sub-content" data-msubtab-content="tpublished">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbTPubSearch" placeholder="Search published..." type="text">
              <span class="lb-drafts-count" id="lbTPubCount"></span>
            </div>
            <div class="lb-drafts-list" id="lbTPubList"></div>
          </div>
        </div>

        <!-- ── Write Article Tab ── -->
        <div class="lb-cms-tab-content active" id="lbTabArticle" data-admintab-content="article">
          <div class="lb-cms" id="lbCmsForm">
            <div class="lb-cms-row">
              <div>
                <label class="lb-cms-label">Title</label>
                <input class="lb-cms-input" id="lbCmsTitle" placeholder="Article title...">
              </div>
              <div>
                <label class="lb-cms-label">Slug</label>
                <input class="lb-cms-input" id="lbCmsSlug" placeholder="auto-generated-from-title">
              </div>
            </div>
            <div class="lb-cms-row">
              <div>
                <label class="lb-cms-label">Excerpt</label>
                <input class="lb-cms-input" id="lbCmsExcerpt" placeholder="Brief summary for the article card...">
              </div>
              <div>
                <label class="lb-cms-label">Tags (comma-separated)</label>
                <input class="lb-cms-input" id="lbCmsTags" placeholder="agile, fintech, leadership">
              </div>
            </div>
            <div class="lb-cms-row">
              <div>
                <label class="lb-cms-label">Series Name (optional)</label>
                <input class="lb-cms-input" id="lbCmsSeries" placeholder="e.g. Building a Fintech Platform">
              </div>
              <div>
                <label class="lb-cms-label">Series Order</label>
                <input class="lb-cms-input" id="lbCmsSeriesOrder" type="number" placeholder="1" min="0" value="0">
              </div>
            </div>
            <div class="lb-cms-row full">
              <div>
                <label class="lb-cms-label">Cover Image</label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input class="lb-cms-input" id="lbCmsCover" placeholder="Paste image or URL..." style="flex:1">
                  <label class="lb-cms-btn secondary" style="cursor:pointer;white-space:nowrap;padding:6px 10px;font-size:9px;display:inline-flex;align-items:center;gap:4px">
                    📎 Upload<input type="file" accept="image/*" id="lbCmsCoverFile" style="display:none">
                  </label>
                </div>
                <img id="lbCmsCoverPreview" alt="" style="display:none;max-width:100%;max-height:120px;margin-top:6px;border-radius:6px;border:1px solid var(--border)">
              </div>
            </div>
            <div>
              <label class="lb-cms-label">Content (Markdown)</label>
              <div class="lb-toolbar" id="lbToolbar">
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="h2" title="Heading 2 (Ctrl+2)">H2</button>
                  <button class="lb-tool-btn" data-fmt="h3" title="Heading 3 (Ctrl+3)">H3</button>
                  <button class="lb-tool-btn" data-fmt="h4" title="Heading 4 (Ctrl+4)">H4</button>
                </div>
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="bold" title="Bold (Ctrl+B)"><b>B</b></button>
                  <button class="lb-tool-btn" data-fmt="italic" title="Italic (Ctrl+I)"><i>I</i></button>
                  <button class="lb-tool-btn" data-fmt="strike" title="Strikethrough"><s>S</s></button>
                  <button class="lb-tool-btn" data-fmt="code" title="Inline Code (Ctrl+\`)"><code>&lt;&gt;</code></button>
                </div>
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="link" title="Link (Ctrl+K)">🔗</button>
                  <button class="lb-tool-btn" data-fmt="image" title="Image">🖼</button>
                  <button class="lb-tool-btn" data-fmt="quote" title="Blockquote">&#x275D;</button>
                </div>
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="ul" title="Bullet List (Ctrl+1)">&#x2022; &#x2014;</button>
                  <button class="lb-tool-btn" data-fmt="ol" title="Numbered List">1. &#x2014;</button>
                  <button class="lb-tool-btn" data-fmt="checklist" title="Checklist">&#x2611;</button>
                </div>
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="codeblock" title="Code Block">&#x2328;</button>
                  <button class="lb-tool-btn" data-fmt="table" title="Table">&#x25A6;</button>
                  <button class="lb-tool-btn" data-fmt="hr" title="Divider">&#x2014;</button>
                </div>
                <div class="lb-toolbar-group">
                  <button class="lb-tool-btn" data-fmt="callout" title="Callout Note">&#x1F4CC;</button>
                  <button class="lb-tool-btn" data-fmt="details" title="Collapsible Section">&#x25B8;</button>
                </div>
                <div class="lb-toolbar-group lb-preview-toggle-wrap">
                  <button class="lb-tool-btn" id="lbPreviewToggle" title="Toggle Preview">&#x1F441; Preview</button>
                  <button class="lb-tool-btn" id="lbShortcutsBtn" title="Keyboard Shortcuts (Ctrl+/)">?</button>
                </div>
              </div>
              <div class="lb-cms-split" id="lbCmsSplit">
                <textarea class="lb-cms-textarea" id="lbCmsContent" placeholder="Write your article in Markdown..."></textarea>
                <div class="lb-cms-preview" id="lbCmsPreview"><div class="lb-content" id="lbCmsPreviewContent" style="font-size:14px"><span style="color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:10px">Live preview will appear here...</span></div></div>
              </div>
              <div class="lb-editor-stats" id="lbEditorStats">
                <span id="lbWordCount">0 words</span>
                <span id="lbReadTime">0 min read</span>
                <span id="lbCharCount">0 chars</span>
                <span class="lb-ws-stats" id="lbWritingSessionStats"></span>
                <button class="lb-seo-toggle-btn" id="lbSeoToggle" title="SEO Score">SEO <span id="lbSeoGrade" class="lb-seo-grade">--</span></button>
                <button class="lb-editor-fullscreen-btn" id="lbEditorFullscreen" title="Fullscreen editor"><i class="fa-solid fa-expand"></i> Fullscreen</button>
              </div>
              <div class="lb-seo-panel" id="lbSeoPanel" style="display:none">
                <div class="lb-seo-header">SEO ANALYSIS <button class="lb-seo-close" id="lbSeoClose">×</button></div>
                <div class="lb-seo-score-ring" id="lbSeoRing"></div>
                <div class="lb-seo-checks" id="lbSeoChecks"></div>
              </div>
            </div>
            <div class="lb-cms-actions">
              <div class="lb-cms-btn-group">
                <button class="lb-cms-btn primary" id="lbCmsPublish">PUBLISH</button>
                <button class="lb-cms-btn secondary" id="lbCmsDraft">SAVE DRAFT</button>
                <button class="lb-cms-btn secondary" id="lbCmsScheduleToggle">SCHEDULE</button>
                <label class="lb-li-toggle"><input type="checkbox" id="lbCmsLinkedIn" checked><span class="lb-li-label"><i class="fa-brands fa-linkedin"></i> Post to LinkedIn</span></label>
                <button class="lb-cms-btn secondary" id="lbCmsHistory" style="display:none">HISTORY</button>
                <button class="lb-cms-btn secondary" id="lbCmsShareReview" style="display:none">SHARE FOR REVIEW</button>
              </div>
              <div class="lb-schedule-row" id="lbCmsScheduleRow" style="display:none">
                <input type="datetime-local" class="lb-schedule-input" id="lbCmsScheduleAt">
                <button class="lb-cms-btn primary" id="lbCmsSchedulePublish">SCHEDULE PUBLISH</button>
                <button class="lb-cms-btn secondary" id="lbCmsScheduleCancel" style="padding:4px 8px;font-size:8px">Cancel</button>
              </div>
              <span class="lb-cms-status" id="lbCmsStatus"></span>
            </div>
          </div>

          <!-- ── Sub-tabs: Drafts / Scheduled / Published ── -->
          <div class="lb-sub-tabs" id="lbArticleSubTabs">
            <button class="lb-sub-tab active" data-subtab="drafts">Drafts <span id="lbDraftsBadge" style="font-size:8px;opacity:.6"></span></button>
            <button class="lb-sub-tab" data-subtab="scheduled">Scheduled <span id="lbSchedBadge" style="font-size:8px;opacity:.6"></span></button>
            <button class="lb-sub-tab" data-subtab="published">Published <span id="lbPubBadge" style="font-size:8px;opacity:.6"></span></button>
            <button class="lb-sub-tab" data-subtab="calendar">📅 Calendar</button>
          </div>

          <div class="lb-sub-content active" data-subtab-content="drafts">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbDraftsSearch" placeholder="Search drafts..." type="text">
              <span class="lb-drafts-count" id="lbDraftsCount"></span>
              <button class="lb-cms-btn primary" id="lbDraftsNew" style="padding:6px 14px;font-size:9px">+ NEW DRAFT</button>
              <div style="position:relative;display:inline-block"><button class="lb-cms-btn secondary" id="lbTemplateBtn" style="padding:6px 10px;font-size:9px">📄 Template</button><div class="lb-template-dropdown" id="lbTemplateDropdown" style="display:none;position:absolute;top:100%;right:0;z-index:50;background:var(--bg);border:1px solid var(--border);min-width:200px;margin-top:4px;box-shadow:0 8px 24px rgba(0,0,0,.3)"></div></div>
            </div>
            <div class="lb-drafts-list" id="lbDraftsList"></div>
          </div>

          <div class="lb-sub-content" data-subtab-content="scheduled">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbSchedSearch" placeholder="Search scheduled..." type="text">
              <span class="lb-drafts-count" id="lbSchedCount"></span>
            </div>
            <div class="lb-drafts-list" id="lbSchedList"></div>
          </div>

          <div class="lb-sub-content" data-subtab-content="published">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbPubSearch" placeholder="Search published..." type="text">
              <span class="lb-drafts-count" id="lbPubCount"></span>
            </div>
            <div class="lb-drafts-list" id="lbPubList"></div>
          </div>
          <div class="lb-sub-content" data-subtab-content="calendar">
            <div id="lbCalendarPanel"></div>
          </div>
          <div id="lbVersionPanel" style="display:none"></div>
        </div>

        <!-- ── Analytics Tab ── -->
        <div class="lb-cms-tab-content" id="lbTabAnalytics" data-admintab-content="analytics">
          <div id="lbAnalyticsContent"><div class="lb-empty"><div class="lb-empty-icon">📊</div>Loading analytics...</div></div>
        </div>

        <!-- ── Comments Tab ── -->
        <div class="lb-cms-tab-content" id="lbTabComments" data-admintab-content="comments">
          <div id="lbCommentsAdmin"><div class="lb-empty"><div class="lb-empty-icon">💬</div>Loading comments...</div></div>
        </div>

        <!-- ── Intelligence Tab ── -->
        <div class="lb-cms-tab-content" id="lbTabIntelligence" data-admintab-content="intelligence">
          <div id="lbIntelContent"><div class="lb-empty"><div class="lb-empty-icon">🧠</div>Loading intelligence...</div></div>
        </div>

        <!-- ── Subscribers Tab ── -->
        <div class="lb-cms-tab-content" id="lbTabSubscribers" data-admintab-content="subscribers">
          <div id="lbSubscribersContent"><div class="lb-empty"><div class="lb-empty-icon">📧</div>Loading subscribers...</div></div>
        </div>
      </div>`;

        // ── Tab switching ──
        B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                B.adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
                var target = B.adminDialog.querySelector('[data-admintab-content="' + tab.dataset.admintab + '"]');
                if (target) target.classList.add('active');
                if (tab.dataset.admintab === 'micro') {
                    var activeMSub = B.adminDialog.querySelector('#lbMicroSubTabs .lb-sub-tab.active');
                    var mkey = activeMSub ? activeMSub.dataset.msubtab : 'tdrafts';
                    if (mkey === 'tdrafts') renderTDraftsList();
                    else if (mkey === 'tscheduled') _renderMicroTab('tscheduled');
                    else if (mkey === 'tpublished') _renderMicroTab('tpublished');
                }
                if (tab.dataset.admintab === 'article') {
                    var activeSub = B.adminDialog.querySelector('#lbArticleSubTabs .lb-sub-tab.active');
                    var key = activeSub ? activeSub.dataset.subtab : 'drafts';
                    if (key === 'drafts') renderDraftsList();
                    else if (key === 'scheduled') _renderFilteredTab('scheduled');
                    else if (key === 'published') _renderFilteredTab('published');
                    else if (key === 'calendar') _renderContentCalendar();
                }
                if (tab.dataset.admintab === 'analytics') {
                    B.renderAnalyticsDashboard();
                }
                if (tab.dataset.admintab === 'comments') {
                    _renderCommentsAdmin();
                }
                if (tab.dataset.admintab === 'intelligence') {
                    if (B.renderIntelligenceDashboard) B.renderIntelligenceDashboard();
                }
                if (tab.dataset.admintab === 'subscribers') {
                    _renderSubscribersAdmin();
                }
            });
        });

        // ── Quick Post: char count ──
        var quickContent = document.getElementById('lbQuickContent');
        var quickChar = document.getElementById('lbQuickChar');
        quickContent.addEventListener('input', function() {
            var len = quickContent.value.length;
            quickChar.textContent = len + ' / 500';
            quickChar.className = 'lb-quick-char' + (len > 450 ? (len > 500 ? ' over' : ' warn') : '');
        });

        // ── Quick Post: image attach ──
        var quickImageInput = document.getElementById('lbQuickImage');
        var quickImgPreview = document.getElementById('lbQuickImgPreview');
        quickImageInput.addEventListener('change', function() {
            if (quickImageInput.files && quickImageInput.files[0]) {
                _quickPendFile = quickImageInput.files[0];
                var reader = new FileReader();
                reader.onload = function(e) { quickImgPreview.src = e.target.result; quickImgPreview.style.display = 'block'; };
                reader.readAsDataURL(_quickPendFile);
            }
        });

        // ── Quick Post: clipboard paste image ──
        quickContent.addEventListener('paste', function(e) {
            var items = (e.clipboardData || {}).items;
            if (!items) return;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    _quickPendFile = items[i].getAsFile();
                    var reader = new FileReader();
                    reader.onload = function(ev) { quickImgPreview.src = ev.target.result; quickImgPreview.style.display = 'block'; };
                    reader.readAsDataURL(_quickPendFile);
                    document.getElementById('lbQuickStatus').textContent = 'Image pasted from clipboard';
                    snd('tap');
                    break;
                }
            }
        });

        // ── Quick Post: schedule toggle ──
        document.getElementById('lbQuickScheduleToggle').addEventListener('click', function() {
            var row = document.getElementById('lbQuickScheduleRow');
            row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        });
        document.getElementById('lbQuickScheduleCancel').addEventListener('click', function() {
            document.getElementById('lbQuickScheduleRow').style.display = 'none';
            document.getElementById('lbQuickScheduleAt').value = '';
        });

        // ── Quick Post: submit ──
        async function submitQuickPost(scheduledAt) {
            var content = quickContent.value.trim();
            if (!content && !_quickPendFile) return;
            if (content.length > 500) { document.getElementById('lbQuickStatus').textContent = 'Content exceeds 500 characters.'; return; }
            var postBtn = document.getElementById('lbQuickPost');
            var schedBtn = document.getElementById('lbQuickSchedulePost');
            postBtn.disabled = true; schedBtn.disabled = true;
            document.getElementById('lbQuickStatus').textContent = scheduledAt ? 'Scheduling...' : 'Posting...';
            try {
                var liCheck = document.getElementById('lbQuickLinkedIn');
                var liShare = liCheck ? liCheck.checked : false;
                var result = await window._createMicroblogPost(content, _quickPendFile, scheduledAt || null, liShare);
                if (!result.success) throw new Error(result.error);
                snd('success');
                quickContent.value = ''; quickChar.textContent = '0 / 500'; quickChar.className = 'lb-quick-char';
                _quickPendFile = null; quickImageInput.value = ''; quickImgPreview.style.display = 'none'; quickImgPreview.src = '';
                document.getElementById('lbQuickScheduleRow').style.display = 'none';
                document.getElementById('lbQuickScheduleAt').value = '';
                document.getElementById('lbQuickStatus').textContent = scheduledAt ? 'Scheduled!' : 'Published!';
                if (window.UniToast) window.UniToast(scheduledAt ? 'Post scheduled!' : 'Post published!', '', scheduledAt ? '🕐' : '✅', 'success');
                if (!scheduledAt && window._refreshMicroblogFeed) window._refreshMicroblogFeed();
                // Clear active thought draft & refresh micro tabs
                if (_tActiveDraftId) {
                    var _tds = getAllThoughtDrafts().filter(function(d) { return d.id !== _tActiveDraftId; });
                    saveThoughtDraftsArr(_tds);
                    _tSetActive(null);
                    updateTDraftsBadge();
                }
                fetchMicroPosts();
            } catch (e) {
                document.getElementById('lbQuickStatus').textContent = 'Failed: ' + (e.message || 'Unknown error');
                if (window.UniToast) window.UniToast('Post failed.', '', '⚠️', 'warn');
            } finally {
                postBtn.disabled = false; schedBtn.disabled = false;
            }
        }
        document.getElementById('lbQuickPost').addEventListener('click', function() { submitQuickPost(null); });
        document.getElementById('lbQuickSchedulePost').addEventListener('click', function() {
            var dt = document.getElementById('lbQuickScheduleAt').value;
            if (!dt) { document.getElementById('lbQuickStatus').textContent = 'Pick a date/time first.'; return; }
            submitQuickPost(new Date(dt).toISOString());
        });

        // ── Thoughts: multi-draft localStorage engine ──
        var T_DRAFTS_KEY = '_lb_thought_drafts';
        var _tActiveDraftId = null;
        var _tAutoSaveTimer = null;
        var _tCloudAutoSaveTimer = null;
        function _tSetActive(id) { _tActiveDraftId = id; window._lbTActiveDraftId = id; }

        function getAllThoughtDrafts() { try { return JSON.parse(localStorage.getItem(T_DRAFTS_KEY)) || []; } catch(e) { return []; } }
        function saveThoughtDraftsArr(arr) { try { localStorage.setItem(T_DRAFTS_KEY, JSON.stringify(arr)); } catch(e) {} }

        function saveCurrentThoughtDraft(silent) {
            var content = document.getElementById('lbQuickContent').value;
            if (!content) return;
            var drafts = getAllThoughtDrafts();
            var now = Date.now();
            if (_tActiveDraftId) {
                var idx = drafts.findIndex(function(d) { return d.id === _tActiveDraftId; });
                if (idx >= 0) Object.assign(drafts[idx], { content: content, updatedAt: now });
                else drafts.unshift({ id: _tActiveDraftId, content: content, createdAt: now, updatedAt: now });
            } else {
                _tSetActive(_uid());
                drafts.unshift({ id: _tActiveDraftId, content: content, createdAt: now, updatedAt: now });
            }
            saveThoughtDraftsArr(drafts);
            updateTDraftsBadge();
            if (!silent) {
                var st = document.getElementById('lbQuickStatus');
                if (st && !/Posting|Scheduling|Saving/.test(st.textContent))
                    st.textContent = 'Draft auto-saved';
            }
        }

        function loadThoughtDraft(draft) {
            _tSetActive(draft.id);
            document.getElementById('lbQuickContent').value = draft.content || '';
            var len = (draft.content || '').length;
            quickChar.textContent = len + ' / 500';
            quickChar.className = 'lb-quick-char' + (len > 450 ? (len > 500 ? ' over' : ' warn') : '');
            document.getElementById('lbQuickStatus').textContent = 'Loaded draft';
            B.adminDialog.scrollTop = 0;
            snd('tap');
        }

        function deleteThoughtDraft(id) {
            var drafts = getAllThoughtDrafts().filter(function(d) { return d.id !== id; });
            saveThoughtDraftsArr(drafts);
            if (_tActiveDraftId === id) _tSetActive(null);
            updateTDraftsBadge();
            renderTDraftsList();
        }

        function clearThoughtEditor() {
            _tSetActive(null);
            quickContent.value = ''; quickChar.textContent = '0 / 500'; quickChar.className = 'lb-quick-char';
            _quickPendFile = null; quickImageInput.value = ''; quickImgPreview.style.display = 'none'; quickImgPreview.src = '';
            document.getElementById('lbQuickScheduleRow').style.display = 'none';
            document.getElementById('lbQuickScheduleAt').value = '';
            document.getElementById('lbQuickStatus').textContent = 'New draft started';
        }

        var _tCloudDrafts = [];

        function updateTDraftsBadge() {
            var badge = document.getElementById('lbTDraftsBadge');
            if (!badge) return;
            var localCount = getAllThoughtDrafts().length;
            var cloudCount = _tCloudDrafts.length;
            var total = localCount + cloudCount;
            badge.textContent = total ? '(' + total + ')' : '';
        }

        async function renderTDraftsList(filter) {
            var listEl = document.getElementById('lbTDraftsList');
            var countEl = document.getElementById('lbTDraftsCount');
            if (!listEl) return;

            // Fetch cloud drafts
            if (window._fetchMicroblogCloudDrafts) {
                _tCloudDrafts = await window._fetchMicroblogCloudDrafts();
            }

            // Normalize local drafts
            var localItems = getAllThoughtDrafts().map(function(d) {
                return { src: 'local', id: d.id, content: d.content || '', ts: d.updatedAt || d.createdAt, raw: d };
            });
            // Normalize cloud drafts
            var cloudItems = (_tCloudDrafts || []).map(function(d) {
                return { src: 'cloud', id: d.id, content: d.content || '', ts: new Date(d.created_at).getTime(), raw: d };
            });

            var all = localItems.concat(cloudItems);
            all.sort(function(a, b) { return b.ts - a.ts; });

            if (filter) {
                var q = filter.toLowerCase();
                all = all.filter(function(d) { return d.content.toLowerCase().includes(q); });
            }
            if (countEl) countEl.textContent = all.length + ' draft' + (all.length !== 1 ? 's' : '');
            updateTDraftsBadge();

            if (!all.length) {
                listEl.innerHTML = '<div class="lb-drafts-empty">' + (filter ? 'No drafts match "' + esc(filter) + '"' : 'No thought drafts yet.<br>Start writing and drafts are auto-saved.') + '</div>';
                return;
            }

            listEl.innerHTML = all.map(function(d) {
                var preview = esc(d.content.slice(0, 80)) + (d.content.length > 80 ? '...' : '');
                var icon = d.src === 'cloud' ? '☁️' : '💾';
                var timeStr = d.src === 'local' ? _timeSince(d.ts) : new Date(d.ts).toLocaleDateString();
                var isActive = d.src === 'local' && d.id === _tActiveDraftId;
                if (d.src === 'local') {
                    return '<div class="lb-draft-row' + (isActive ? ' active' : '') + '" data-tdraft-id="' + d.id + '">' +
                        '<div class="lb-draft-info">' +
                            '<div class="lb-draft-title">' + icon + ' ' + preview + '</div>' +
                            '<div class="lb-draft-meta"><span>' + timeStr + '</span><span>' + d.content.length + ' chars</span></div>' +
                        '</div>' +
                        '<div class="lb-draft-actions">' +
                            '<button class="lb-draft-btn" data-tdraft-load="' + d.id + '">OPEN</button>' +
                            '<button class="lb-draft-btn del" data-tdraft-del="' + d.id + '">DEL</button>' +
                        '</div></div>';
                }
                return '<div class="lb-draft-row" data-tcloud-id="' + d.id + '">' +
                    '<div class="lb-draft-info">' +
                        '<div class="lb-draft-title">' + icon + ' ' + (preview || 'Empty draft') + '</div>' +
                        '<div class="lb-draft-meta"><span>' + timeStr + '</span><span>' + d.content.length + ' chars</span></div>' +
                    '</div>' +
                    '<div class="lb-draft-actions">' +
                        '<button class="lb-draft-btn" data-tcloud-publish="' + d.id + '">PUB</button>' +
                        '<button class="lb-draft-btn" data-tcloud-edit="' + d.id + '">EDIT</button>' +
                        '<button class="lb-draft-btn del" data-tcloud-del="' + d.id + '">DEL</button>' +
                    '</div></div>';
            }).join('');

            // Bind local draft actions
            listEl.querySelectorAll('[data-tdraft-load]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var draft = getAllThoughtDrafts().find(function(d) { return d.id === btn.dataset.tdraftLoad; });
                    if (draft) loadThoughtDraft(draft);
                });
            });
            listEl.querySelectorAll('[data-tdraft-del]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (confirm('Delete this draft?')) { deleteThoughtDraft(btn.dataset.tdraftDel); snd('delete'); }
                });
            });
            listEl.querySelectorAll('[data-tdraft-id]').forEach(function(row) {
                row.addEventListener('click', function() {
                    var draft = getAllThoughtDrafts().find(function(d) { return d.id === row.dataset.tdraftId; });
                    if (draft) loadThoughtDraft(draft);
                });
            });
            // Bind cloud draft actions
            listEl.querySelectorAll('[data-tcloud-edit]').forEach(function(el) {
                el.addEventListener('click', function() {
                    var draft = _tCloudDrafts.find(function(d) { return d.id === el.dataset.tcloudEdit; });
                    if (draft) {
                        quickContent.value = draft.content || '';
                        quickChar.textContent = (draft.content || '').length + ' / 500';
                        document.getElementById('lbQuickStatus').textContent = 'Editing cloud draft';
                        snd('tap');
                    }
                });
            });
            listEl.querySelectorAll('[data-tcloud-publish]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Publish this thought now?')) return;
                    if (window._publishMicroblogDraft) {
                        var result = await window._publishMicroblogDraft(el.dataset.tcloudPublish);
                        if (result.success) {
                            snd('success');
                            if (window.UniToast) window.UniToast('Thought published!', '', '🚀', 'success');
                            if (window._refreshMicroblogFeed) window._refreshMicroblogFeed();
                            await renderTDraftsList();
                        } else {
                            if (window.UniToast) window.UniToast('Failed to publish.', '', '⚠️', 'warn');
                        }
                    }
                });
            });
            listEl.querySelectorAll('[data-tcloud-del]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Delete this cloud draft permanently?')) return;
                    if (window._deleteMicroblogPost) {
                        var result = await window._deleteMicroblogPost(el.dataset.tcloudDel);
                        if (result.success) {
                            snd('success');
                            if (window.UniToast) window.UniToast('Cloud draft deleted.', '', '🗑️', 'success');
                            await renderTDraftsList();
                        } else {
                            if (window.UniToast) window.UniToast('Failed to delete.', '', '⚠️', 'warn');
                        }
                    }
                });
            });
        }

        // Thought auto-save on input (local at 10s, cloud at 30s)
        quickContent.addEventListener('input', function() {
            clearTimeout(_tAutoSaveTimer);
            _tAutoSaveTimer = setTimeout(function() { saveCurrentThoughtDraft(false); }, 10000);
            clearTimeout(_tCloudAutoSaveTimer);
            _tCloudAutoSaveTimer = setTimeout(async function() {
                var content = quickContent.value.trim();
                if (content && window._saveMicroblogDraft) {
                    await window._saveMicroblogDraft(content, null, null);
                    renderTDraftsList();
                }
            }, 30000);
        });

        // Save Draft button — saves locally AND to Supabase cloud
        document.getElementById('lbQuickDraft').addEventListener('click', async function() {
            saveCurrentThoughtDraft(false);
            var content = document.getElementById('lbQuickContent').value.trim();
            if (content && window._saveMicroblogDraft) {
                document.getElementById('lbQuickStatus').textContent = 'Saving to cloud...';
                var result = await window._saveMicroblogDraft(content, _quickPendFile, null);
                if (result.success) {
                    document.getElementById('lbQuickStatus').textContent = 'Draft saved to cloud!';
                    if (window.UniToast) window.UniToast('Thought draft saved to cloud.', '', '☁️', 'success');
                    renderTDraftsList();
                } else {
                    document.getElementById('lbQuickStatus').textContent = 'Saved locally (cloud save failed).';
                    if (window.UniToast) window.UniToast('Saved locally.', '', '💾', 'success');
                }
            } else {
                document.getElementById('lbQuickStatus').textContent = 'Draft saved locally!';
                if (window.UniToast) window.UniToast('Thought draft saved.', '', '💾', 'success');
            }
            snd('success');
        });

        // New thought draft
        document.getElementById('lbTDraftsNew').addEventListener('click', function() {
            saveCurrentThoughtDraft(true);
            clearThoughtEditor();
            snd('tap');
        });

        // Thought drafts search
        document.getElementById('lbTDraftsSearch').addEventListener('input', B.debounce(function(e) {
            renderTDraftsList(e.target.value.trim());
        }, 200));

        // ── Thoughts: Scheduled & Published from Supabase ──
        var _allMicroPosts = [];

        async function fetchMicroPosts() {
            if (!window._sb) return;
            try {
                var r = await window._sb.from('microblog')
                    .select('id,content,created_at,pinned,scheduled_at,image_url,views')
                    .order('created_at', { ascending: false });
                if (r.error) throw r.error;
                _allMicroPosts = r.data || [];
                _renderMicroTab('tscheduled');
                _renderMicroTab('tpublished');
            } catch(e) {}
        }

        function _classifyMicro(p) {
            if (p.scheduled_at && new Date(p.scheduled_at) > new Date()) return 'tscheduled';
            return 'tpublished';
        }

        function _renderMicroTab(tab, filter) {
            var cfg = { tscheduled: { listId: 'lbTSchedList', countId: 'lbTSchedCount', badgeId: 'lbTSchedBadge' },
                        tpublished: { listId: 'lbTPubList', countId: 'lbTPubCount', badgeId: 'lbTPubBadge' } }[tab];
            if (!cfg) return;
            var items = _allMicroPosts.filter(function(p) { return _classifyMicro(p) === tab; });
            if (filter) {
                var q = filter.toLowerCase();
                items = items.filter(function(p) { return (p.content || '').toLowerCase().includes(q); });
            }
            var listEl = document.getElementById(cfg.listId);
            var countEl = document.getElementById(cfg.countId);
            var badgeEl = document.getElementById(cfg.badgeId);
            var total = _allMicroPosts.filter(function(p) { return _classifyMicro(p) === tab; }).length;
            if (badgeEl) badgeEl.textContent = total ? '(' + total + ')' : '';
            if (countEl) countEl.textContent = items.length + ' post' + (items.length !== 1 ? 's' : '');
            if (!listEl) return;
            if (!items.length) {
                var msgs = { tscheduled: 'No scheduled thoughts.', tpublished: 'No published thoughts.' };
                listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:8px 0">' + (msgs[tab] || 'No posts.') + '</div>';
                return;
            }
            listEl.innerHTML = items.map(function(p) {
                var preview = esc((p.content || '').slice(0, 100)) + ((p.content || '').length > 100 ? '...' : '');
                var schedInfo = tab === 'tscheduled' ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:#a855f7;margin-left:4px">🕐 ' + esc(new Date(p.scheduled_at).toLocaleString()) + '</span>' : '';
                var viewsInfo = tab === 'tpublished' ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-left:4px">' + (p.views || 0) + ' views</span>' : '';
                var actions = '';
                if (tab === 'tscheduled') actions += '<button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px;color:#f59e0b;border-color:rgba(245,158,11,.3)" data-micro-unsched="' + p.id + '">UNSCHEDULE</button>';
                if (tab === 'tpublished' && p.pinned) actions += '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--accent);margin-right:4px">📌</span>';
                actions += '<button class="lb-cms-btn danger" style="padding:4px 8px;font-size:8px" data-micro-del="' + p.id + '">DEL</button>';
                return '<div class="lb-cms-article-row">' +
                    '<span class="lb-cms-article-title" style="cursor:default">' + preview + '</span>' +
                    schedInfo + viewsInfo +
                    '<div class="lb-cms-article-actions">' + actions + '</div></div>';
            }).join('');
            _bindMicroActions(listEl);
        }

        function _bindMicroActions(container) {
            container.querySelectorAll('[data-micro-unsched]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Cancel scheduled publish?')) return;
                    try {
                        var upd = await window._sb.from('microblog').update({ scheduled_at: null }).eq('id', el.dataset.microUnsched);
                        if (upd.error) throw upd.error;
                        snd('success');
                        if (window.UniToast) window.UniToast('Schedule cancelled.', '', '✅', 'success');
                        await fetchMicroPosts();
                    } catch(err) {
                        if (window.UniToast) window.UniToast('Failed.', '', '⚠️', 'warn');
                    }
                });
            });
            container.querySelectorAll('[data-micro-del]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Delete this thought permanently?')) return;
                    try {
                        var del = await window._sb.from('microblog').delete().eq('id', el.dataset.microDel);
                        if (del.error) throw del.error;
                        snd('success');
                        if (window.UniToast) window.UniToast('Thought deleted.', '', '🗑️', 'success');
                        await fetchMicroPosts();
                        if (window._refreshMicroblogFeed) window._refreshMicroblogFeed();
                    } catch(err) {
                        if (window.UniToast) window.UniToast('Failed to delete.', '', '⚠️', 'warn');
                    }
                });
            });
        }

        // Thoughts sub-tab switching
        document.getElementById('lbMicroSubTabs').addEventListener('click', function(e) {
            var btn = e.target.closest('.lb-sub-tab');
            if (!btn) return;
            var key = btn.dataset.msubtab;
            document.querySelectorAll('#lbMicroSubTabs .lb-sub-tab').forEach(function(t) { t.classList.remove('active'); });
            btn.classList.add('active');
            B.adminDialog.querySelectorAll('#lbTabMicro .lb-sub-content').forEach(function(c) { c.classList.remove('active'); });
            var target = B.adminDialog.querySelector('[data-msubtab-content="' + key + '"]');
            if (target) target.classList.add('active');
            if (key === 'tdrafts') { renderTDraftsList(); }
            if (key === 'tscheduled') _renderMicroTab('tscheduled');
            if (key === 'tpublished') _renderMicroTab('tpublished');
        });

        // Thoughts scheduled/published search
        document.getElementById('lbTSchedSearch').addEventListener('input', B.debounce(function(e) {
            _renderMicroTab('tscheduled', e.target.value.trim());
        }, 200));
        document.getElementById('lbTPubSearch').addEventListener('input', B.debounce(function(e) {
            _renderMicroTab('tpublished', e.target.value.trim());
        }, 200));

        renderTDraftsList();
        fetchMicroPosts();

        // ── Shared: close / signout ──
        document.getElementById('lbCmsClose').addEventListener('click', closeAdmin);
        document.getElementById('lbCmsSignout').addEventListener('click', handleSignOut);

        // ── Article tab: existing bindings ──
        document.getElementById('lbCmsPublish').addEventListener('click', function() { B.saveArticle(true, null); });
        document.getElementById('lbCmsDraft').addEventListener('click', function() { B.saveArticle(false, null); });

        // ── Article tab: schedule toggle ──
        document.getElementById('lbCmsScheduleToggle').addEventListener('click', function() {
            var row = document.getElementById('lbCmsScheduleRow');
            row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        });
        document.getElementById('lbCmsScheduleCancel').addEventListener('click', function() {
            document.getElementById('lbCmsScheduleRow').style.display = 'none';
            document.getElementById('lbCmsScheduleAt').value = '';
        });
        document.getElementById('lbCmsSchedulePublish').addEventListener('click', function() {
            const dt = document.getElementById('lbCmsScheduleAt').value;
            if (!dt) { document.getElementById('lbCmsStatus').textContent = 'Pick a date/time first.'; return; }
            B.saveArticle(false, new Date(dt).toISOString());
        });

        document.getElementById('lbCmsTitle').addEventListener('input', function() {
            const slugEl = document.getElementById('lbCmsSlug');
            if (!B.editingArticle) {
                slugEl.value = B.slugify(document.getElementById('lbCmsTitle').value);
            }
        });

        let _slugCheckTimer = null;
        document.getElementById('lbCmsSlug').addEventListener('input', function() {
            clearTimeout(_slugCheckTimer);
            const slugEl = this;
            const val = slugEl.value.trim();
            if (!val || !window._sb) return;
            _slugCheckTimer = setTimeout(async function() {
                try {
                    const res = await window._sb.from('longform_articles').select('id,slug').eq('slug', val).limit(1);
                    const exists = (res.data || []).some(function(a) { return !B.editingArticle || a.id !== B.editingArticle.id; });
                    slugEl.style.borderColor = exists ? '#ef4444' : '';
                    const statusEl = document.getElementById('lbCmsStatus');
                    if (exists && statusEl) statusEl.textContent = 'Slug "' + val + '" already exists.';
                    else if (statusEl && statusEl.textContent.includes('already exists')) statusEl.textContent = '';
                } catch(e) {}
            }, 500);
        });

        let _syncStatus = 'idle';
        function _updateSyncIndicator(status) {
            _syncStatus = status;
            const statusEl = document.getElementById('lbCmsStatus');
            if (!statusEl) return;
            const msgs = { idle: '', saving_local: 'Saving locally...', saved_local: 'Saved locally', saving_cloud: 'Syncing to cloud...', saved_cloud: 'Synced \u2713', error: 'Save failed' };
            if (msgs[status] !== undefined && !statusEl.textContent.includes('Published') && !statusEl.textContent.includes('Scheduled')) {
                statusEl.textContent = msgs[status] || '';
            }
        }

        B._cmsHasUnsaved = false;
        window.addEventListener('beforeunload', B._cmsBeforeUnload);
        ['lbCmsTitle','lbCmsSlug','lbCmsExcerpt','lbCmsTags','lbCmsCover','lbCmsContent'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', B._markCmsDirty);
        });

        function _updateEditorStats() {
            const text = B._getEditorValue();
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            const chars = text.length;
            const wc = document.getElementById('lbWordCount');
            const rt = document.getElementById('lbReadTime');
            const cc = document.getElementById('lbCharCount');
            if (wc) wc.textContent = words + ' word' + (words !== 1 ? 's' : '');
            if (rt) rt.textContent = Math.max(1, Math.ceil(words / 200)) + ' min read';
            if (cc) cc.textContent = chars + ' chars';
            _updateWritingSession(words);
            _debouncedSeoUpdate();
        }

        /* ── B3: SEO Score Analyzer ── */
        var _seoPanel = document.getElementById('lbSeoPanel');
        var _seoToggle = document.getElementById('lbSeoToggle');
        var _seoClose = document.getElementById('lbSeoClose');
        if (_seoToggle) _seoToggle.addEventListener('click', function() {
            if (_seoPanel) { _seoPanel.style.display = _seoPanel.style.display === 'none' ? 'block' : 'none'; _runSeoAnalysis(); }
        });
        if (_seoClose) _seoClose.addEventListener('click', function() { if (_seoPanel) _seoPanel.style.display = 'none'; });

        function _fleschKincaid(text) {
            var sentences = (text.match(/[.!?]+/g) || []).length || 1;
            var words = text.trim().split(/\s+/).filter(Boolean);
            var wc = words.length || 1;
            var syllables = 0;
            words.forEach(function(w) {
                w = w.toLowerCase().replace(/[^a-z]/g, '');
                if (w.length <= 3) { syllables += 1; return; }
                w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
                var m = w.match(/[aeiouy]{1,2}/g);
                syllables += (m ? m.length : 1);
            });
            var score = 206.835 - 1.015 * (wc / sentences) - 84.6 * (syllables / wc);
            return Math.max(0, Math.min(100, Math.round(score)));
        }

        function _runSeoAnalysis() {
            var title = (document.getElementById('lbCmsTitle') || {}).value || '';
            var excerpt = (document.getElementById('lbCmsExcerpt') || {}).value || '';
            var content = B._getEditorValue();
            var slug = (document.getElementById('lbCmsSlug') || {}).value || '';
            var words = content.trim().split(/\s+/).filter(Boolean);
            var wc = words.length;
            var checks = [];
            var score = 0;
            var total = 0;

            function add(pass, icon, msg, weight) {
                weight = weight || 1;
                total += weight;
                if (pass === true) score += weight;
                else if (pass === 'warn') score += weight * 0.5;
                checks.push({ status: pass === true ? 'pass' : (pass === 'warn' ? 'warn' : 'fail'), msg: msg });
            }

            add(title.length >= 30 && title.length <= 65, title.length >= 30 && title.length <= 65 ? '✓' : '✗',
                'Title length: ' + title.length + ' chars (ideal: 30-65)', 2);
            add(excerpt.length >= 80 && excerpt.length <= 160, excerpt.length >= 50 ? (excerpt.length <= 200 ? 'warn' : false) : false,
                'Meta description: ' + excerpt.length + ' chars (ideal: 80-160)', 2);
            add(wc >= 300, wc >= 150 ? (wc >= 300 ? true : 'warn') : false,
                'Content length: ' + wc + ' words (min: 300 recommended)', 1);

            var h2Count = (content.match(/^## /gm) || []).length;
            var h3Count = (content.match(/^### /gm) || []).length;
            add(h2Count >= 2, h2Count >= 1 ? (h2Count >= 2 ? true : 'warn') : false,
                'Heading structure: ' + h2Count + ' H2s, ' + h3Count + ' H3s', 1);

            var imgCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
            var imgAltMissing = (content.match(/!\[\]\(/g) || []).length;
            add(imgCount > 0 && imgAltMissing === 0, imgCount > 0 ? (imgAltMissing === 0 ? true : 'warn') : 'warn',
                'Images: ' + imgCount + ' found' + (imgAltMissing ? ', ' + imgAltMissing + ' missing alt text' : ''), 1);

            var linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length - imgCount;
            add(linkCount >= 1, linkCount >= 1 ? true : 'warn',
                'Internal/external links: ' + Math.max(0, linkCount) + ' found', 1);

            var readability = _fleschKincaid(content);
            add(readability >= 60, readability >= 40 ? (readability >= 60 ? true : 'warn') : false,
                'Readability: ' + readability + '/100 (Flesch-Kincaid, 60+ is good)', 1);

            add(slug.length > 0 && slug.length <= 60 && !slug.includes(' '), slug.length > 0 ? true : false,
                'URL slug: ' + (slug || '(empty)') + ' (' + slug.length + ' chars)', 1);

            var pct = total ? Math.round((score / total) * 100) : 0;
            var grade = pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
            var gradeClass = pct >= 80 ? 'grade-a' : pct >= 60 ? 'grade-b' : pct >= 40 ? 'grade-c' : 'grade-d';

            var gradeEl = document.getElementById('lbSeoGrade');
            if (gradeEl) { gradeEl.textContent = grade; gradeEl.className = 'lb-seo-grade ' + gradeClass; }

            var ringEl = document.getElementById('lbSeoRing');
            if (ringEl) {
                var r = 28, circ = 2 * Math.PI * r;
                ringEl.innerHTML = '<svg width="70" height="70" viewBox="0 0 70 70">' +
                    '<circle cx="35" cy="35" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="4"/>' +
                    '<circle cx="35" cy="35" r="' + r + '" fill="none" stroke="' + (pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444') + '" stroke-width="4" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ - (pct / 100) * circ).toFixed(1) + '" transform="rotate(-90 35 35)" stroke-linecap="round"/>' +
                    '<text x="35" y="38" text-anchor="middle" fill="var(--text)" font-family="JetBrains Mono,monospace" font-size="14" font-weight="700">' + pct + '</text></svg>' +
                    '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--sub)">/ 100 SEO Score</span>';
            }

            var checksEl = document.getElementById('lbSeoChecks');
            if (checksEl) {
                checksEl.innerHTML = checks.map(function(c) {
                    var icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
                    return '<div class="lb-seo-check ' + c.status + '"><span class="icon">' + icon + '</span><span class="msg">' + esc(c.msg) + '</span></div>';
                }).join('');
            }
        }
        var _debouncedSeoUpdate = B.debounce(function() {
            if (_seoPanel && _seoPanel.style.display !== 'none') _runSeoAnalysis();
        }, 800);

        /* ── B4: Writing Session Stats ── */
        var _wsSessionStart = Date.now();
        var _wsStartWords = 0;
        var _wsLastWords = 0;
        var _wsSessionInited = false;

        function _getWritingStats() {
            try { return JSON.parse(localStorage.getItem('_lb_writing_stats')) || {}; } catch(e) { return {}; }
        }
        function _saveWritingStats(s) {
            try { localStorage.setItem('_lb_writing_stats', JSON.stringify(s)); } catch(e) {}
        }

        function _updateWritingSession(currentWords) {
            if (!_wsSessionInited) { _wsStartWords = currentWords; _wsLastWords = currentWords; _wsSessionInited = true; return; }
            var elapsed = (Date.now() - _wsSessionStart) / 60000;
            var written = Math.max(0, currentWords - _wsStartWords);
            var wpm = elapsed > 0.5 ? Math.round(written / elapsed) : 0;
            _wsLastWords = currentWords;

            var stats = _getWritingStats();
            var today = new Date().toISOString().slice(0, 10);
            if (!stats.days) stats.days = {};
            if (!stats.days[today]) stats.days[today] = { words: 0 };
            stats.days[today].words = Math.max(stats.days[today].words || 0, written);

            var streak = 0;
            var d = new Date();
            for (var i = 0; i < 365; i++) {
                var key = d.toISOString().slice(0, 10);
                if (stats.days[key] && stats.days[key].words > 0) { streak++; d.setDate(d.getDate() - 1); }
                else break;
            }
            stats.streak = streak;
            _saveWritingStats(stats);

            var el = document.getElementById('lbWritingSessionStats');
            if (el) {
                var goalTarget = stats.dailyGoal || 500;
                var dailyWords = stats.days[today] ? stats.days[today].words : 0;
                var goalPct = Math.min(100, Math.round((dailyWords / goalTarget) * 100));
                var r = 5.5, circ = 2 * Math.PI * r;
                var ringSVG = '<svg class="lb-ws-goal-ring" viewBox="0 0 16 16"><circle class="bg" cx="8" cy="8" r="' + r + '"/><circle class="fg" cx="8" cy="8" r="' + r + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ - (goalPct / 100) * circ).toFixed(1) + '" transform="rotate(-90 8 8)"/></svg>';
                el.innerHTML = (wpm > 0 ? '<span class="lb-ws-wpm">' + wpm + ' wpm</span>' : '') +
                    (streak > 1 ? '<span class="lb-ws-streak">' + streak + 'd streak</span>' : '') +
                    '<span class="lb-ws-goal" title="Daily goal: ' + dailyWords + '/' + goalTarget + ' words">' + ringSVG + goalPct + '%</span>';
            }
        }

        const _updatePreview = B.debounceIdle(function() {
            const previewEl = document.getElementById('lbCmsPreviewContent');
            if (!previewEl) return;
            const val = B._getEditorValue();
            B.parseMarkdownAsync(val, function(html) {
                previewEl.innerHTML = html || '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            });
            _updateEditorStats();
            if (B._cmView && typeof scheduleAutoSave === 'function') scheduleAutoSave();
        }, 300, 500);

        const editorEl = document.getElementById('lbCmsContent');
        const previewPane = document.getElementById('lbCmsPreview');
        const splitEl = document.getElementById('lbCmsSplit');

        (async function _setupEditor() {
            var cmContainer = document.createElement('div');
            cmContainer.id = 'lbCmEditor';
            cmContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:300px;position:relative';

            var loadingEl = document.createElement('div');
            loadingEl.className = 'lb-cm-loading';
            loadingEl.textContent = 'Loading editor...';
            cmContainer.appendChild(loadingEl);

            if (editorEl && editorEl.parentNode) {
                editorEl.parentNode.insertBefore(cmContainer, editorEl);
                editorEl.style.display = 'none';
            }

            var view = await B._initCM6(cmContainer, editorEl ? editorEl.value : '', _updatePreview);

            if (view) {
                if (loadingEl.parentNode) loadingEl.remove();

                // Observe body class changes for theme switching
                var _cmThemeObserver = new MutationObserver(function() { B._switchCM6Theme(); });
                _cmThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                view._themeObserver = _cmThemeObserver;

                // Scroll sync via CM6 scroll DOM (throttled with rAF)
                var cmScroller = cmContainer.querySelector('.cm-scroller');
                if (cmScroller && previewPane) {
                    var _cmScrollRaf = false;
                    cmScroller.addEventListener('scroll', function() {
                        if (_cmScrollRaf) return;
                        _cmScrollRaf = true;
                        requestAnimationFrame(function() {
                            _cmScrollRaf = false;
                            var pct = cmScroller.scrollTop / (cmScroller.scrollHeight - cmScroller.clientHeight || 1);
                            previewPane.scrollTop = pct * (previewPane.scrollHeight - previewPane.clientHeight);
                        });
                    }, { passive: true });
                }

                // Drag-and-drop images onto CM6
                var cmDom = cmContainer.querySelector('.cm-editor');
                if (cmDom) {
                    cmDom.addEventListener('dragover', function(e) { e.preventDefault(); cmDom.classList.add('lb-dropzone-active'); });
                    cmDom.addEventListener('dragleave', function() { cmDom.classList.remove('lb-dropzone-active'); });
                    cmDom.addEventListener('drop', async function(e) {
                        e.preventDefault();
                        cmDom.classList.remove('lb-dropzone-active');
                        var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type.startsWith('image/'); });
                        if (!files.length) return;
                        var statusEl = document.getElementById('lbCmsStatus');
                        for (var i = 0; i < files.length; i++) {
                            try {
                                if (statusEl) statusEl.textContent = 'Uploading image ' + (i + 1) + '/' + files.length + '...';
                                var url = await uploadImageToStorage(files[i], 'article');
                                B.insertAtCursor('\n![image](' + url + ')\n');
                            } catch(err) {
                                if (statusEl) statusEl.textContent = 'Upload failed.';
                            }
                        }
                        if (statusEl) statusEl.textContent = files.length + ' image(s) uploaded.';
                        _updatePreview();
                    });
                }

                // Clipboard paste (images + rich text) in CM6
                // Use capture phase on .cm-editor so we fire BEFORE CM6's internal paste handler
                if (cmDom) {
                    cmDom.addEventListener('paste', async function(e) {
                        var imageFile = getClipboardImage(e);
                        if (imageFile) {
                            e.preventDefault();
                            e.stopPropagation();
                            var statusEl = document.getElementById('lbCmsStatus');
                            if (statusEl) statusEl.textContent = 'Uploading image...';
                            try {
                                var publicUrl = await uploadImageToStorage(imageFile, 'article');
                                B.insertAtCursor('\n![image](' + publicUrl + ')\n');
                                if (statusEl) statusEl.textContent = 'Image uploaded!';
                                snd('success');
                            } catch (err) {
                                if (statusEl) statusEl.textContent = 'Image upload failed: ' + (err.message || err);
                            }
                            return;
                        }
                        var html = getClipboardHtml(e);
                        if (html) {
                            e.preventDefault();
                            e.stopPropagation();
                            var md = htmlToMarkdown(html);
                            B.insertAtCursor(md);
                        }
                    }, { capture: true });
                }
            } else {
                // CM6 failed - fall back to textarea
                if (cmContainer.parentNode) cmContainer.remove();
                if (editorEl) {
                    editorEl.style.display = '';
                    editorEl.addEventListener('input', _updatePreview);
                    // Textarea scroll sync
                    if (previewPane) {
                        editorEl.addEventListener('scroll', function() {
                            var pct = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight || 1);
                            previewPane.scrollTop = pct * (previewPane.scrollHeight - previewPane.clientHeight);
                        });
                    }
                    // Textarea drag-and-drop
                    editorEl.addEventListener('dragover', function(e) { e.preventDefault(); editorEl.classList.add('lb-dropzone-active'); });
                    editorEl.addEventListener('dragleave', function() { editorEl.classList.remove('lb-dropzone-active'); });
                    editorEl.addEventListener('drop', async function(e) {
                        e.preventDefault();
                        editorEl.classList.remove('lb-dropzone-active');
                        var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type.startsWith('image/'); });
                        if (!files.length) return;
                        var statusEl = document.getElementById('lbCmsStatus');
                        for (var i = 0; i < files.length; i++) {
                            try {
                                if (statusEl) statusEl.textContent = 'Uploading image ' + (i + 1) + '/' + files.length + '...';
                                var url = await uploadImageToStorage(files[i], 'article');
                                B.insertAtCursor('\n![image](' + url + ')\n');
                            } catch(err) {
                                if (statusEl) statusEl.textContent = 'Upload failed.';
                            }
                        }
                        if (statusEl) statusEl.textContent = files.length + ' image(s) uploaded.';
                        _updatePreview();
                    });
                }
            }
            _updateEditorStats();
            _updatePreview();
        })();

        // Fullscreen toggle
        const fsBtn = document.getElementById('lbEditorFullscreen');
        var _fsExitBtn = null;
        function _exitFullscreen() {
            if (!splitEl) return;
            splitEl.classList.remove('lb-editor-fs');
            if (fsBtn) fsBtn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
            if (_fsExitBtn && _fsExitBtn.parentNode) _fsExitBtn.remove();
        }
        if (fsBtn && splitEl) {
            fsBtn.addEventListener('click', function() {
                splitEl.classList.toggle('lb-editor-fs');
                if (splitEl.classList.contains('lb-editor-fs')) {
                    fsBtn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
                    _fsExitBtn = document.createElement('button');
                    _fsExitBtn.className = 'lb-fs-exit-btn';
                    _fsExitBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                    _fsExitBtn.title = 'Exit Fullscreen';
                    _fsExitBtn.addEventListener('click', _exitFullscreen);
                    splitEl.appendChild(_fsExitBtn);
                } else {
                    _exitFullscreen();
                }
            });
        }

        // ── Multi-draft localStorage engine ──
        const DRAFTS_KEY = '_lb_drafts';
        let _autoSaveTimer = null;
        let _cloudAutoSaveTimer = null;
        let _activeDraftId = window._lbActiveDraftId || null;
        function _setActiveDraft(id) { _activeDraftId = id; window._lbActiveDraftId = id; }

        function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
        function getAllDrafts() { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || []; } catch(e) { return []; } }
        function saveDraftsArray(arr) {
            try {
                if (arr.length > 50) arr = arr.slice(0, 50);
                localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr));
            } catch(e) {
                if (e.name === 'QuotaExceededError') {
                    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.slice(0, 10))); } catch(e2) {}
                }
            }
        }

        function _collectFormData() {
            return {
                title: document.getElementById('lbCmsTitle').value,
                slug: document.getElementById('lbCmsSlug').value,
                excerpt: document.getElementById('lbCmsExcerpt').value,
                tags: document.getElementById('lbCmsTags').value,
                cover: document.getElementById('lbCmsCover').value,
                content: B._getEditorValue()
            };
        }

        function saveCurrentDraft(silent) {
            if (B.editingArticle) return;
            const f = _collectFormData();
            if (!f.title && !f.content) return;
            const drafts = getAllDrafts();
            const now = Date.now();
            if (_activeDraftId) {
                const idx = drafts.findIndex(function(d) { return d.id === _activeDraftId; });
                if (idx >= 0) {
                    Object.assign(drafts[idx], f, { updatedAt: now });
                } else {
                    drafts.unshift(Object.assign({ id: _activeDraftId, createdAt: now, updatedAt: now }, f));
                }
            } else {
                _setActiveDraft(_uid());
                drafts.unshift(Object.assign({ id: _activeDraftId, createdAt: now, updatedAt: now }, f));
            }
            saveDraftsArray(drafts);
            updateDraftsBadge();
            if (!silent) {
                const st = document.getElementById('lbCmsStatus');
                if (st && !/Publishing|Scheduling|Saving/.test(st.textContent))
                    st.textContent = 'Auto-saved locally';
            }
        }

        function loadDraftIntoEditor(draft) {
            _setActiveDraft(draft.id);
            document.getElementById('lbCmsTitle').value = draft.title || '';
            document.getElementById('lbCmsSlug').value = draft.slug || '';
            document.getElementById('lbCmsExcerpt').value = draft.excerpt || '';
            document.getElementById('lbCmsTags').value = draft.tags || '';
            document.getElementById('lbCmsCover').value = draft.cover || '';
            B._setEditorValue(draft.content || '');
            B.editingArticle = null;
            _updatePreview();
            // Switch to article tab
            B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            B.adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            const artTab = B.adminDialog.querySelector('[data-admintab="article"]');
            const artContent = B.adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');
            document.getElementById('lbCmsStatus').textContent = 'Loaded draft: "' + (draft.title || 'Untitled') + '"';
            B.adminDialog.scrollTop = 0;
            snd('tap');
        }

        function deleteDraft(draftId) {
            const drafts = getAllDrafts().filter(function(d) { return d.id !== draftId; });
            saveDraftsArray(drafts);
            if (_activeDraftId === draftId) _setActiveDraft(null);
            updateDraftsBadge();
            renderDraftsList();
        }
        window._lbDeleteDraft = deleteDraft;

        function clearEditorForNewDraft() {
            _setActiveDraft(null);
            B.editingArticle = null;
            document.getElementById('lbCmsTitle').value = '';
            document.getElementById('lbCmsSlug').value = '';
            document.getElementById('lbCmsExcerpt').value = '';
            document.getElementById('lbCmsTags').value = '';
            document.getElementById('lbCmsCover').value = '';
            B._setEditorValue('');
            document.getElementById('lbCmsPreviewContent').innerHTML = '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            document.getElementById('lbCmsScheduleRow').style.display = 'none';
            document.getElementById('lbCmsScheduleAt').value = '';
            document.getElementById('lbCmsStatus').textContent = 'New draft started';
            const seriesInput = document.getElementById('lbCmsSeries');
            const seriesOrderInput = document.getElementById('lbCmsSeriesOrder');
            if (seriesInput) seriesInput.value = '';
            if (seriesOrderInput) seriesOrderInput.value = '0';
            const histBtn = document.getElementById('lbCmsHistory');
            const reviewBtn = document.getElementById('lbCmsShareReview');
            if (histBtn) histBtn.style.display = 'none';
            if (reviewBtn) reviewBtn.style.display = 'none';
            const vp = document.getElementById('lbVersionPanel');
            if (vp) vp.style.display = 'none';
        }

        function updateDraftsBadge() {
            const badge = document.getElementById('lbDraftsBadge');
            if (!badge) return;
            const localCount = getAllDrafts().length;
            const cloudCount = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === 'draft'; }).length;
            const total = localCount + cloudCount;
            badge.textContent = total ? '(' + total + ')' : '';
        }

        function _timeSince(ts) {
            const s = Math.floor((Date.now() - ts) / 1000);
            if (s < 60) return 'just now';
            if (s < 3600) return Math.floor(s / 60) + 'm ago';
            if (s < 86400) return Math.floor(s / 3600) + 'h ago';
            if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
            return new Date(ts).toLocaleDateString();
        }

        function _wordCount(text) {
            if (!text) return 0;
            return text.trim().split(/\s+/).filter(Boolean).length;
        }

        function renderDraftsList(filter) {
            const listEl = document.getElementById('lbDraftsList');
            const countEl = document.getElementById('lbDraftsCount');
            if (!listEl) return;

            const localItems = getAllDrafts().map(function(d) {
                return { src: 'local', id: d.id, title: d.title || 'Untitled Draft', content: d.content || '', tags: d.tags || '', excerpt: d.excerpt || '', ts: d.updatedAt || d.createdAt, raw: d };
            });
            const cloudItems = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === 'draft'; }).map(function(a) {
                return { src: 'cloud', id: a.id, title: a.title || 'Untitled', content: a.content || '', tags: '', excerpt: a.excerpt || '', slug: a.slug, ts: new Date(a.created_at).getTime(), raw: a };
            });

            let all = localItems.concat(cloudItems);
            all.sort(function(a, b) { return b.ts - a.ts; });

            if (filter) {
                const q = filter.toLowerCase();
                all = all.filter(function(d) {
                    return d.title.toLowerCase().includes(q) || d.tags.toLowerCase().includes(q) ||
                           d.excerpt.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
                });
            }
            if (countEl) countEl.textContent = all.length + ' draft' + (all.length !== 1 ? 's' : '');
            updateDraftsBadge();

            if (!all.length) {
                listEl.innerHTML = '<div class="lb-drafts-empty">' + (filter ? 'No drafts match "' + esc(filter) + '"' : 'No drafts yet.<br>Start writing and drafts are auto-saved.') + '</div>';
                return;
            }

            listEl.innerHTML = all.map(function(d) {
                const icon = d.src === 'cloud' ? '☁️' : '💾';
                const words = _wordCount(d.content);
                if (d.src === 'local') {
                    const isActive = d.id === _activeDraftId;
                    return '<div class="lb-draft-row' + (isActive ? ' active' : '') + '" data-draft-id="' + d.id + '">' +
                        '<div class="lb-draft-info">' +
                            '<div class="lb-draft-title">' + icon + ' ' + esc(d.title) + '</div>' +
                            '<div class="lb-draft-meta">' +
                                '<span>' + _timeSince(d.ts) + '</span>' +
                                '<span>' + words + ' word' + (words !== 1 ? 's' : '') + '</span>' +
                                (d.tags ? '<span>' + esc(d.tags) + '</span>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="lb-draft-actions">' +
                            '<button class="lb-draft-btn" data-draft-load="' + d.id + '">OPEN</button>' +
                            '<button class="lb-draft-btn del" data-draft-del="' + d.id + '">DEL</button>' +
                        '</div></div>';
                }
                return '<div class="lb-draft-row">' +
                    '<div class="lb-draft-info">' +
                        '<div class="lb-draft-title">' + icon + ' ' + esc(d.title) + '</div>' +
                        '<div class="lb-draft-meta">' +
                            '<span>' + new Date(d.ts).toLocaleDateString() + '</span>' +
                            '<span>' + words + ' word' + (words !== 1 ? 's' : '') + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="lb-draft-actions">' +
                        '<button class="lb-draft-btn" data-publish-draft="' + d.id + '">PUB</button>' +
                        '<button class="lb-draft-btn" data-edit-slug="' + esc(d.slug || '') + '">EDIT</button>' +
                        '<button class="lb-draft-btn del" data-delete-id="' + d.id + '">DEL</button>' +
                    '</div></div>';
            }).join('');

            // Bind local draft actions
            listEl.querySelectorAll('[data-draft-load]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const draft = getAllDrafts().find(function(d) { return d.id === btn.dataset.draftLoad; });
                    if (draft) loadDraftIntoEditor(draft);
                });
            });
            listEl.querySelectorAll('[data-draft-del]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const draft = getAllDrafts().find(function(d) { return d.id === btn.dataset.draftDel; });
                    const name = draft ? (draft.title || 'Untitled Draft') : 'this draft';
                    if (confirm('Delete "' + name + '"? This cannot be undone.')) {
                        deleteDraft(btn.dataset.draftDel);
                        snd('delete');
                    }
                });
            });
            listEl.querySelectorAll('[data-draft-id]').forEach(function(row) {
                row.addEventListener('click', function() {
                    const draft = getAllDrafts().find(function(d) { return d.id === row.dataset.draftId; });
                    if (draft) loadDraftIntoEditor(draft);
                });
            });
            // Bind cloud article actions (PUBLISH, EDIT, DEL)
            _bindArticleActions(listEl);
        }

        function scheduleAutoSave() {
            clearTimeout(_autoSaveTimer);
            _autoSaveTimer = setTimeout(function() {
                if (!B.editingArticle) {
                    _updateSyncIndicator('saving_local');
                    saveCurrentDraft(false);
                    setTimeout(function() { _updateSyncIndicator('saved_local'); }, 200);
                }
            }, 10000);
            clearTimeout(_cloudAutoSaveTimer);
            _cloudAutoSaveTimer = setTimeout(function() {
                _updateSyncIndicator('saving_cloud');
                B.saveArticle(false, null, true).then(function(saved) {
                    if (saved) { _updateSyncIndicator('saved_cloud'); B._markCmsClean(); }
                }).catch(function() {
                    _updateSyncIndicator('error');
                });
            }, 30000);
        }
        const _autoSaveFields = ['lbCmsTitle','lbCmsSlug','lbCmsExcerpt','lbCmsTags','lbCmsCover'];
        if (!B._cmView) _autoSaveFields.push('lbCmsContent');
        _autoSaveFields.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', scheduleAutoSave);
        });

        // Drafts tab: search + new
        document.getElementById('lbDraftsSearch').addEventListener('input', B.debounce(function(e) {
            const q = e.target.value.trim();
            renderDraftsList(q);
        }, 200));
        document.getElementById('lbDraftsNew').addEventListener('click', function() {
            saveCurrentDraft(true);
            clearEditorForNewDraft();
            B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            B.adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            const artTab2 = B.adminDialog.querySelector('[data-admintab="article"]');
            const artContent2 = B.adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab2) artTab2.classList.add('active');
            if (artContent2) artContent2.classList.add('active');
            snd('tap');
        });

        /* ── B5: Content Templates ── */
        var _TEMPLATES = [
            { name:'How-To Guide', icon:'📋', content:'## Introduction\n\nBriefly explain what the reader will learn and why it matters.\n\n## Prerequisites\n\n- Prerequisite 1\n- Prerequisite 2\n\n## Step 1: [Title]\n\nExplain the first step in detail.\n\n```\n// code example\n```\n\n## Step 2: [Title]\n\nExplain the next step.\n\n## Step 3: [Title]\n\nContinue with remaining steps.\n\n## Common Pitfalls\n\n> [!WARNING]\n> Describe common mistakes to avoid.\n\n## Summary\n\nRecap what the reader accomplished and suggest next steps.\n'},
            { name:'Listicle', icon:'📝', content:'## Introduction\n\nHook the reader with why this list matters. Set expectations for what they\'ll gain.\n\n---\n\n## 1. [First Item]\n\nExplain why this item made the list. Include a concrete example or data point.\n\n## 2. [Second Item]\n\nProvide actionable insight for each item.\n\n## 3. [Third Item]\n\nVary the depth — some items get more coverage than others.\n\n## 4. [Fourth Item]\n\nKeep momentum with shorter entries mixed with longer ones.\n\n## 5. [Fifth Item]\n\nEnd with a strong final item.\n\n---\n\n## The Bottom Line\n\nSummarize the key takeaway and include a call to action.\n'},
            { name:'Technical Deep Dive', icon:'🔬', content:'## Overview\n\nState the problem or technology being explored. Why should engineers care?\n\n## Background & Context\n\nProvide necessary background. Link to foundational concepts.\n\n## Architecture\n\n```\n[Diagram or high-level architecture description]\n```\n\nExplain the system design and key components.\n\n## Implementation Details\n\n### Core Algorithm\n\n```python\n# implementation\n```\n\n### Data Flow\n\nDescribe how data moves through the system.\n\n## Performance Analysis\n\n| Metric | Before | After | Improvement |\n|--------|--------|-------|-------------|\n| Latency | - | - | - |\n| Throughput | - | - | - |\n\n## Trade-offs & Limitations\n\nDiscuss what was sacrificed and what remains unsolved.\n\n## Conclusion\n\nSummarize findings and outline future work.\n\n## References\n\n- [Reference 1](url)\n- [Reference 2](url)\n'},
            { name:'Case Study', icon:'📊', content:'## Executive Summary\n\nOne-paragraph summary of the challenge, solution, and results.\n\n## The Challenge\n\nDescribe the problem in context. Include:\n- Business constraints\n- Technical constraints\n- Scale/timeline pressure\n\n## Our Approach\n\n### Discovery Phase\n\nWhat we learned during initial research.\n\n### Solution Design\n\nThe architecture and strategy we chose, and why.\n\n### Implementation\n\nKey decisions and milestones during the build.\n\n## Results\n\n> **Key Metric 1:** X% improvement\n> **Key Metric 2:** Y% reduction\n> **Key Metric 3:** Z units saved\n\n## Lessons Learned\n\n1. **Lesson 1** — What we\'d do differently.\n2. **Lesson 2** — What worked unexpectedly well.\n3. **Lesson 3** — Advice for others facing similar challenges.\n\n## What\'s Next\n\nFuture plans and iterations.\n'},
            { name:'Opinion / Essay', icon:'💡', content:'## [Opening Hook]\n\nStart with a provocative statement, question, or anecdote that captures the reader\'s attention.\n\n## The Conventional Wisdom\n\nPresent the commonly held view or status quo that you\'re challenging or building upon.\n\n## Why I Disagree (or Agree)\n\nPresent your thesis. Support it with:\n- Personal experience\n- Data or research\n- Logical reasoning\n\n## The Nuance\n\nAcknowledge counterarguments. Show intellectual honesty.\n\n> [!NOTE]\n> Address the strongest objection to your position here.\n\n## What This Means in Practice\n\nMake your argument concrete. How should the reader think or act differently?\n\n## Closing Thought\n\nEnd with a memorable statement that reinforces your thesis.\n'},
            { name:'Tutorial with Code', icon:'💻', content:'## What We\'re Building\n\nDescribe the end result. Include a screenshot or demo link if possible.\n\n## Tech Stack\n\n- **Language:** \n- **Framework:** \n- **Tools:** \n\n## Setup\n\n```bash\n# installation commands\nnpm init -y\nnpm install\n```\n\n## Part 1: Project Structure\n\n```\nproject/\n├── src/\n│   ├── index.js\n│   └── utils.js\n├── tests/\n└── package.json\n```\n\n## Part 2: Core Implementation\n\n```javascript\n// Main implementation\n```\n\nExplain each section of the code.\n\n## Part 3: Adding Features\n\n```javascript\n// Feature code\n```\n\n## Part 4: Testing\n\n```javascript\n// Test code\n```\n\n## Deployment\n\nInstructions for deploying the finished project.\n\n## Next Steps\n\nIdeas for extending the project further.\n\n## Full Source Code\n\n[GitHub Repository](url)\n'}
        ];

        var _templateBtn = document.getElementById('lbTemplateBtn');
        var _templateDropdown = document.getElementById('lbTemplateDropdown');
        if (_templateBtn && _templateDropdown) {
            _templateDropdown.innerHTML = _TEMPLATES.map(function(t, i) {
                return '<div class="lb-cmd-item" data-tpl-idx="' + i + '" style="padding:8px 12px;font-size:10px"><span class="lb-cmd-icon">' + t.icon + '</span><span class="lb-cmd-label">' + t.name + '</span></div>';
            }).join('');
            _templateBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                _templateDropdown.style.display = _templateDropdown.style.display === 'none' ? 'block' : 'none';
            });
            _templateDropdown.addEventListener('click', function(e) {
                var item = e.target.closest('[data-tpl-idx]');
                if (!item) return;
                var idx = parseInt(item.dataset.tplIdx, 10);
                var tpl = _TEMPLATES[idx];
                if (!tpl) return;
                saveCurrentDraft(true);
                clearEditorForNewDraft();
                B._setEditorValue(tpl.content);
                var _tplStatus = document.getElementById('lbCmsStatus');
                if (_tplStatus) _tplStatus.textContent = 'Template loaded: ' + tpl.name;
                _templateDropdown.style.display = 'none';
                B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
                B.adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
                var artTab3 = B.adminDialog.querySelector('[data-admintab="article"]');
                var artContent3 = B.adminDialog.querySelector('[data-admintab-content="article"]');
                if (artTab3) artTab3.classList.add('active');
                if (artContent3) artContent3.classList.add('active');
                snd('success');
            });
            document.addEventListener('click', function(e) {
                if (!_templateBtn.contains(e.target) && !_templateDropdown.contains(e.target)) _templateDropdown.style.display = 'none';
            });
        }

        /* ── B2: Content Calendar / Kanban ── */
        var _calMonth = new Date().getMonth();
        var _calYear = new Date().getFullYear();

        function _renderContentCalendar() {
            var panel = document.getElementById('lbCalendarPanel');
            if (!panel) return;
            var allArticles = _allAdminArticles || [];
            var localDrafts = [];
            try { localDrafts = JSON.parse(localStorage.getItem('_lb_drafts')) || []; } catch(e) {}

            var drafts = allArticles.filter(function(a) { return _classifyArticle(a) === 'draft'; });
            var scheduled = allArticles.filter(function(a) { return _classifyArticle(a) === 'scheduled'; });
            var published = allArticles.filter(function(a) { return _classifyArticle(a) === 'published'; });

            var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            var firstDay = new Date(_calYear, _calMonth, 1).getDay();
            var daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
            var today = new Date();
            var todayStr = today.toISOString().slice(0, 10);

            var articlesByDate = {};
            allArticles.forEach(function(a) {
                var d = a.scheduled_at || a.created_at;
                if (d) { var key = new Date(d).toISOString().slice(0, 10); if (!articlesByDate[key]) articlesByDate[key] = []; articlesByDate[key].push(a); }
            });

            var calCells = '';
            dayNames.forEach(function(d) { calCells += '<div class="lb-cal-day-header">' + d + '</div>'; });
            for (var i = 0; i < firstDay; i++) { calCells += '<div class="lb-cal-cell other-month"></div>'; }
            for (var d = 1; d <= daysInMonth; d++) {
                var dateStr = _calYear + '-' + String(_calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
                var isToday = dateStr === todayStr;
                var arts = articlesByDate[dateStr] || [];
                var dots = arts.map(function(a) { return '<div class="lb-cal-dot ' + _classifyArticle(a) + '"></div>'; }).join('');
                calCells += '<div class="lb-cal-cell' + (isToday ? ' today' : '') + '" data-cal-date="' + dateStr + '">' + d + dots + '</div>';
            }

            var kanbanHtml = '<div class="lb-kanban">';
            [{ title:'DRAFTS', items:drafts.concat(localDrafts.map(function(ld) { return { title: ld.title || '(untitled)', created_at: ld.createdAt, _local: true }; })), cls:'draft' },
             { title:'SCHEDULED', items:scheduled, cls:'scheduled' },
             { title:'PUBLISHED', items:published.slice(0, 10), cls:'published' }
            ].forEach(function(col) {
                kanbanHtml += '<div class="lb-kanban-col" data-kanban-col="' + col.cls + '" draggable="false">' +
                    '<div class="lb-kanban-col-title">' + col.title + ' <span class="lb-kanban-count">' + col.items.length + '</span></div>';
                col.items.slice(0, 15).forEach(function(a) {
                    var dateStr = a.scheduled_at || a.created_at;
                    kanbanHtml += '<div class="lb-kanban-card" draggable="true" data-kanban-id="' + (a.id || '') + '" data-kanban-slug="' + esc(a.slug || '') + '">' +
                        '<div class="lb-kanban-card-title">' + esc(a.title || '(untitled)') + '</div>' +
                        '<div class="lb-kanban-card-meta">' + (dateStr ? fmtDate(dateStr) : '') + (a.views !== undefined ? ' · ' + (a.views || 0) + ' views' : '') + '</div></div>';
                });
                kanbanHtml += '</div>';
            });
            kanbanHtml += '</div>';

            panel.innerHTML =
                '<div class="lb-cal-panel">' +
                '<div class="lb-cal-header"><div class="lb-cal-title">' + monthNames[_calMonth] + ' ' + _calYear + '</div>' +
                '<div class="lb-cal-nav"><button id="lbCalPrev">◀</button><button id="lbCalToday">Today</button><button id="lbCalNext">▶</button></div></div>' +
                '<div class="lb-cal-grid">' + calCells + '</div></div>' +
                kanbanHtml;

            panel.querySelector('#lbCalPrev').addEventListener('click', function() { _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } _renderContentCalendar(); });
            panel.querySelector('#lbCalNext').addEventListener('click', function() { _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } _renderContentCalendar(); });
            panel.querySelector('#lbCalToday').addEventListener('click', function() { _calMonth = today.getMonth(); _calYear = today.getFullYear(); _renderContentCalendar(); });

            // Drag-and-drop for kanban
            var cards = panel.querySelectorAll('.lb-kanban-card');
            var cols = panel.querySelectorAll('.lb-kanban-col');
            cards.forEach(function(card) {
                card.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', card.dataset.kanbanId); card.classList.add('dragging'); });
                card.addEventListener('dragend', function() { card.classList.remove('dragging'); cols.forEach(function(c) { c.classList.remove('drag-over'); }); });
            });
            cols.forEach(function(col) {
                col.addEventListener('dragover', function(e) { e.preventDefault(); col.classList.add('drag-over'); });
                col.addEventListener('dragleave', function() { col.classList.remove('drag-over'); });
                col.addEventListener('drop', async function(e) {
                    e.preventDefault(); col.classList.remove('drag-over');
                    var articleId = e.dataTransfer.getData('text/plain');
                    if (!articleId || !window._sb) return;
                    var targetCol = col.dataset.kanbanCol;
                    var update = {};
                    if (targetCol === 'published') update = { published: true, scheduled_at: null };
                    else if (targetCol === 'draft') update = { published: false, scheduled_at: null };
                    else return;
                    try {
                        var r = await window._sb.from('longform_articles').update(update).eq('id', articleId);
                        if (r.error) throw r.error;
                        snd('success');
                        if (window.UniToast) window.UniToast('Article moved to ' + targetCol, '', '✅', 'success');
                        await fetchAdminArticles();
                        _renderContentCalendar();
                    } catch(err) { if (window.UniToast) window.UniToast('Move failed', '', '⚠️', 'warn'); }
                });
            });

            // Click card to edit
            panel.querySelectorAll('.lb-kanban-card[data-kanban-slug]').forEach(function(card) {
                card.addEventListener('dblclick', function() {
                    var slug = card.dataset.kanbanSlug;
                    if (slug) loadArticleForEdit(slug);
                });
            });
        }

        // Sub-tab switching inside Write Article
        document.getElementById('lbArticleSubTabs').addEventListener('click', function(e) {
            const btn = e.target.closest('.lb-sub-tab');
            if (!btn) return;
            const key = btn.dataset.subtab;
            document.querySelectorAll('#lbArticleSubTabs .lb-sub-tab').forEach(function(t) { t.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('lbTabArticle').querySelectorAll('.lb-sub-content').forEach(function(c) { c.classList.remove('active'); });
            const target = B.adminDialog.querySelector('[data-subtab-content="' + key + '"]');
            if (target) target.classList.add('active');
            if (key === 'drafts') renderDraftsList();
            if (key === 'scheduled') _renderFilteredTab('scheduled');
            if (key === 'published') _renderFilteredTab('published');
            if (key === 'calendar') _renderContentCalendar();
        });

        // Scheduled/Published sub-tab search
        document.getElementById('lbSchedSearch').addEventListener('input', B.debounce(function(e) {
            _renderFilteredTab('scheduled', e.target.value.trim());
        }, 200));
        document.getElementById('lbPubSearch').addEventListener('input', B.debounce(function(e) {
            _renderFilteredTab('published', e.target.value.trim());
        }, 200));

        // Migrate legacy single-draft to multi-draft
        try {
            var legacyDraft = JSON.parse(localStorage.getItem('_lb_article_draft'));
            if (legacyDraft && (legacyDraft.title || legacyDraft.content)) {
                var drafts = getAllDrafts();
                drafts.unshift({
                    id: _uid(),
                    title: legacyDraft.title || '',
                    slug: legacyDraft.slug || '',
                    excerpt: legacyDraft.excerpt || '',
                    tags: legacyDraft.tags || '',
                    cover: legacyDraft.cover || '',
                    content: legacyDraft.content || '',
                    createdAt: legacyDraft.savedAt || Date.now(),
                    updatedAt: legacyDraft.savedAt || Date.now()
                });
                saveDraftsArray(drafts);
                localStorage.removeItem('_lb_article_draft');
            }
        } catch(e) {}

        updateDraftsBadge();

        // ── Shared image upload helper ──
        async function uploadImageToStorage(imageFile, prefix) {
            if (!imageFile || !window._sb) throw new Error('No file or Supabase unavailable');
            if (!hasSupabaseAuth()) throw new Error('Supabase Auth required for image uploads. Sign in via Ctrl+Shift+P → Sign Out → Re-login.');
            // Refresh session to ensure a valid token for storage RLS
            try { await window._sb.auth.refreshSession(); } catch (_) {}
            var ext = (imageFile.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            var fn = (prefix || 'img') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
            var ur = await window._sb.storage.from('microblog-images').upload(fn, imageFile, { cacheControl: '3600', upsert: false });
            if (ur.error) {
                if (ur.error.message && ur.error.message.includes('row-level security')) {
                    throw new Error('Storage RLS blocked upload. Check that the microblog-images bucket allows INSERT for authenticated users.');
                }
                throw ur.error;
            }
            return window._sb.storage.from('microblog-images').getPublicUrl(ur.data.path).data.publicUrl;
        }

        function getClipboardImage(e) {
            var items = (e.clipboardData || {}).items;
            if (!items) return null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) return items[i].getAsFile();
            }
            return null;
        }

        function htmlToMarkdown(html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var abbreviations = {};

            function listDepth(node) {
                var depth = 0;
                var p = node.parentElement;
                while (p) {
                    var pt = p.tagName.toLowerCase();
                    if (pt === 'ul' || pt === 'ol') depth++;
                    p = p.parentElement;
                }
                return Math.max(0, depth - 1);
            }

            function walk(node) {
                if (node.nodeType === 3) return node.textContent;
                if (node.nodeType !== 1) return '';
                var tag = node.tagName.toLowerCase();
                var children = Array.from(node.childNodes).map(walk).join('');

                switch (tag) {
                    case 'h1': return '\n# ' + children.trim() + '\n';
                    case 'h2': return '\n## ' + children.trim() + '\n';
                    case 'h3': return '\n### ' + children.trim() + '\n';
                    case 'h4': return '\n#### ' + children.trim() + '\n';
                    case 'h5': return '\n##### ' + children.trim() + '\n';
                    case 'h6': return '\n###### ' + children.trim() + '\n';
                    case 'strong': case 'b': return '**' + children + '**';
                    case 'em': case 'i': return '*' + children + '*';
                    case 'u': case 'ins': return '<u>' + children + '</u>';
                    case 's': case 'del': case 'strike': return '~~' + children + '~~';
                    case 'mark': return '==' + children + '==';
                    case 'sub': return '~' + children + '~';
                    case 'sup': {
                        var fnLink = node.querySelector('a[href^="#fn"]') || node.querySelector('a[id^="fnref"]') || node.querySelector('a.footnote-ref');
                        if (fnLink) {
                            var fnText = fnLink.textContent.trim();
                            return '[^' + fnText + ']';
                        }
                        return '^' + children + '^';
                    }
                    case 'abbr': {
                        var title = node.getAttribute('title');
                        if (title) abbreviations[children.trim()] = title;
                        return children;
                    }
                    case 'code':
                        if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') return children;
                        return '`' + children + '`';
                    case 'pre': {
                        var codeEl = node.querySelector('code');
                        var lang = '';
                        if (codeEl) {
                            var cls = codeEl.className || '';
                            var m = cls.match(/language-(\w+)|lang-(\w+)/);
                            if (m) lang = m[1] || m[2];
                        }
                        var codeText = codeEl ? codeEl.textContent : node.textContent;
                        return '\n```' + lang + '\n' + codeText.replace(/\n$/, '') + '\n```\n';
                    }
                    case 'blockquote': return '\n' + children.trim().split('\n').map(function(l) { return '> ' + l; }).join('\n') + '\n';
                    case 'a': {
                        var href = node.getAttribute('href') || '';
                        if (href.match(/^#fn\d/) || node.classList.contains('footnote-backref')) return '';
                        if (href) return '[' + children + '](' + href + ')';
                        return children;
                    }
                    case 'img': {
                        var src = node.getAttribute('src') || '';
                        var alt = node.getAttribute('alt') || 'image';
                        return '![' + alt + '](' + src + ')';
                    }
                    case 'picture': case 'source': return children;
                    case 'video': {
                        var vsrc = node.getAttribute('src') || '';
                        var sourceEl = node.querySelector('source');
                        if (!vsrc && sourceEl) vsrc = sourceEl.getAttribute('src') || '';
                        return vsrc ? '\n<video src="' + vsrc + '" controls></video>\n' : children;
                    }
                    case 'iframe': {
                        var iSrc = node.getAttribute('src') || '';
                        var yMatch = iSrc.match(/youtube\.com\/embed\/([^?&]+)|youtu\.be\/([^?&]+)/);
                        if (yMatch) return '\n[![Video](https://img.youtube.com/vi/' + (yMatch[1] || yMatch[2]) + '/0.jpg)](https://www.youtube.com/watch?v=' + (yMatch[1] || yMatch[2]) + ')\n';
                        return iSrc ? '\n<iframe src="' + iSrc + '"></iframe>\n' : '';
                    }
                    case 'ul': case 'ol': {
                        var depth = listDepth(node);
                        if (depth === 0) return '\n' + children + '\n';
                        return children;
                    }
                    case 'li': {
                        var parent = node.parentElement;
                        var indent = '  '.repeat(listDepth(node));
                        var checkbox = node.querySelector(':scope > input[type="checkbox"]');
                        if (checkbox) {
                            var checked = checkbox.checked ? '[x] ' : '[ ] ';
                            var cbChildren = Array.from(node.childNodes).filter(function(n) { return n !== checkbox; }).map(walk).join('');
                            return indent + '- ' + checked + cbChildren.trim() + '\n';
                        }
                        if (parent && parent.tagName.toLowerCase() === 'ol') {
                            var idx = Array.from(parent.children).indexOf(node) + 1;
                            return indent + idx + '. ' + children.trim() + '\n';
                        }
                        return indent + '- ' + children.trim() + '\n';
                    }
                    case 'dl': return '\n' + children + '\n';
                    case 'dt': return '\n' + children.trim() + '\n';
                    case 'dd': return ': ' + children.trim() + '\n';
                    case 'figure': return '\n' + children.trim() + '\n';
                    case 'figcaption': return '\n*' + children.trim() + '*\n';
                    case 'details': {
                        var summaryEl = node.querySelector(':scope > summary');
                        var summaryText = summaryEl ? Array.from(summaryEl.childNodes).map(walk).join('').trim() : 'Details';
                        var bodyParts = Array.from(node.childNodes).filter(function(n) { return n !== summaryEl; }).map(walk).join('');
                        return '\n<details>\n<summary>' + summaryText + '</summary>\n\n' + bodyParts.trim() + '\n\n</details>\n';
                    }
                    case 'summary': return '';
                    case 'br': return '\n';
                    case 'hr': return '\n---\n';
                    case 'p': case 'div': {
                        var align = node.style && node.style.textAlign;
                        if (!align) align = node.getAttribute('align');
                        var text = children.trim();
                        if (align === 'center') return '\n<p align="center">' + text + '</p>\n';
                        if (align === 'right') return '\n<p align="right">' + text + '</p>\n';
                        return '\n' + text + '\n';
                    }
                    case 'center': return '\n<p align="center">' + children.trim() + '</p>\n';
                    case 'table': {
                        var rows = node.querySelectorAll('tr');
                        if (!rows.length) return children;
                        var md = '\n';
                        rows.forEach(function(tr, ri) {
                            var cells = tr.querySelectorAll('th, td');
                            md += '| ' + Array.from(cells).map(function(c) { return walk(c).trim(); }).join(' | ') + ' |\n';
                            if (ri === 0) md += '| ' + Array.from(cells).map(function() { return '---'; }).join(' | ') + ' |\n';
                        });
                        return md;
                    }
                    case 'th': case 'td': case 'thead': case 'tbody': case 'tfoot': case 'tr': case 'colgroup': case 'col':
                        return children;
                    case 'input': {
                        if (node.type === 'checkbox') return node.checked ? '[x] ' : '[ ] ';
                        return '';
                    }
                    case 'span': {
                        var bg = node.style && node.style.backgroundColor;
                        if (bg && bg !== 'transparent') return '==' + children + '==';
                        var cls = node.className || '';
                        if (cls.match(/highlight|mark/i)) return '==' + children + '==';
                        if (cls.match(/math|katex|mathjax/i)) return '$' + node.textContent + '$';
                        return children;
                    }
                    case 'math': return '$' + node.textContent + '$';
                    case 'section': {
                        if (node.classList.contains('footnotes') || node.getAttribute('role') === 'doc-endnotes') {
                            var items = node.querySelectorAll('li');
                            var fnMd = '\n';
                            items.forEach(function(li) {
                                var id = li.id || '';
                                var num = id.replace(/^fn-?/, '') || (Array.from(li.parentElement.children).indexOf(li) + 1);
                                var content = Array.from(li.childNodes).map(walk).join('').replace(/\s*↩\s*$/,'').trim();
                                fnMd += '[^' + num + ']: ' + content + '\n';
                            });
                            return fnMd;
                        }
                        return children;
                    }
                    case 'script': {
                        var stype = node.getAttribute('type') || '';
                        if (stype.match(/math/i)) return '\n$$\n' + node.textContent.trim() + '\n$$\n';
                        return '';
                    }
                    case 'style': case 'link': case 'meta': case 'noscript': return '';
                    case 'aside': {
                        if (node.classList.contains('footnotes')) {
                            var fItems = node.querySelectorAll('li');
                            var fMd = '\n';
                            fItems.forEach(function(li) {
                                var fid = li.id || '';
                                var fnum = fid.replace(/^fn-?/, '') || (Array.from(li.parentElement.children).indexOf(li) + 1);
                                var fContent = Array.from(li.childNodes).map(walk).join('').replace(/\s*↩\s*$/,'').trim();
                                fMd += '[^' + fnum + ']: ' + fContent + '\n';
                            });
                            return fMd;
                        }
                        return children;
                    }
                    case 'ruby': {
                        var rt = node.querySelector('rt');
                        var base = Array.from(node.childNodes).filter(function(n) { return n.tagName !== 'RT' && n.tagName !== 'RP'; }).map(walk).join('');
                        return rt ? base + ' (' + rt.textContent + ')' : children;
                    }
                    case 'rt': case 'rp': return '';
                    case 'kbd': return '`' + children + '`';
                    case 'var': case 'samp': return '`' + children + '`';
                    case 'cite': return '*' + children + '*';
                    case 'q': return '"' + children + '"';
                    case 'small': return '<small>' + children + '</small>';
                    case 'address': return '*' + children.trim() + '*\n';
                    case 'label': return children;
                    case 'nav': case 'header': case 'footer': case 'main': case 'article': return children;
                    default: return children;
                }
            }

            var result = walk(doc.body);
            var abbrKeys = Object.keys(abbreviations);
            if (abbrKeys.length) {
                result += '\n\n';
                abbrKeys.forEach(function(k) { result += '*[' + k + ']: ' + abbreviations[k] + '\n'; });
            }
            return result.replace(/\n{3,}/g, '\n\n').trim();
        }

        function getClipboardHtml(e) {
            if (!e.clipboardData) return null;
            var html = e.clipboardData.getData('text/html');
            if (!html || html.length < 10) return null;
            var plain = e.clipboardData.getData('text/plain') || '';
            if (html.replace(/<[^>]*>/g, '').trim() === plain.trim()) return null;
            return html;
        }

        function updateCoverPreview(url) {
            var prev = document.getElementById('lbCmsCoverPreview');
            if (!prev) return;
            if (url && url.startsWith('http')) { prev.src = url; prev.style.display = 'block'; }
            else { prev.src = ''; prev.style.display = 'none'; }
        }

        // ── Cover image: file upload button ──
        document.getElementById('lbCmsCoverFile').addEventListener('change', async function() {
            if (!this.files || !this.files[0]) return;
            var statusEl = document.getElementById('lbCmsStatus');
            var coverInput = document.getElementById('lbCmsCover');
            coverInput.value = 'Uploading...';
            statusEl.textContent = 'Uploading cover image...';
            try {
                var publicUrl = await uploadImageToStorage(this.files[0], 'cover');
                coverInput.value = publicUrl;
                coverInput.dispatchEvent(new Event('input'));
                updateCoverPreview(publicUrl);
                statusEl.textContent = 'Cover image uploaded!';
                snd('success');
            } catch (err) {
                coverInput.value = '';
                updateCoverPreview('');
                statusEl.textContent = 'Cover upload failed: ' + (err.message || err);
            }
            this.value = '';
        });

        // ── Cover image: clipboard paste ──
        document.getElementById('lbCmsCover').addEventListener('paste', async function(e) {
            var imageFile = getClipboardImage(e);
            if (!imageFile) return;
            e.preventDefault();
            var statusEl = document.getElementById('lbCmsStatus');
            var coverInput = document.getElementById('lbCmsCover');
            coverInput.value = 'Uploading...';
            statusEl.textContent = 'Uploading cover image...';
            try {
                var publicUrl = await uploadImageToStorage(imageFile, 'cover');
                coverInput.value = publicUrl;
                coverInput.dispatchEvent(new Event('input'));
                updateCoverPreview(publicUrl);
                statusEl.textContent = 'Cover image uploaded!';
                snd('success');
            } catch (err) {
                coverInput.value = '';
                updateCoverPreview('');
                statusEl.textContent = 'Cover upload failed: ' + (err.message || err);
            }
        });

        // ── Cover image: show preview when URL changes ──
        document.getElementById('lbCmsCover').addEventListener('input', function() {
            updateCoverPreview(this.value.trim());
        });

        // ── Article content: clipboard paste (textarea fallback; CM6 paste handled in _setupEditor) ──
        if (!B._cmView) {
            document.getElementById('lbCmsContent').addEventListener('paste', async function(e) {
                var imageFile = getClipboardImage(e);
                if (imageFile) {
                    e.preventDefault();
                    var statusEl = document.getElementById('lbCmsStatus');
                    statusEl.textContent = 'Uploading image...';
                    try {
                        var publicUrl = await uploadImageToStorage(imageFile, 'article');
                        B.insertAtCursor('\n![image](' + publicUrl + ')\n');
                        statusEl.textContent = 'Image uploaded!';
                        snd('success');
                    } catch (err) {
                        statusEl.textContent = 'Image upload failed: ' + (err.message || err);
                    }
                    return;
                }
                var html = getClipboardHtml(e);
                if (html) {
                    e.preventDefault();
                    var md = htmlToMarkdown(html);
                    var ta = this;
                    var start = ta.selectionStart;
                    var end = ta.selectionEnd;
                    ta.value = ta.value.substring(0, start) + md + ta.value.substring(end);
                    ta.selectionStart = ta.selectionEnd = start + md.length;
                    ta.dispatchEvent(new Event('input'));
                }
            });
        }

        // ── Hidden file input for toolbar image button ──
        window._articleImgInput = document.createElement('input');
        var _articleImgInput = window._articleImgInput;
        _articleImgInput.type = 'file';
        _articleImgInput.accept = 'image/*';
        _articleImgInput.style.display = 'none';
        document.body.appendChild(_articleImgInput);
        _articleImgInput.addEventListener('change', async function() {
            if (!this.files || !this.files[0]) return;
            var statusEl = document.getElementById('lbCmsStatus');
            statusEl.textContent = 'Uploading image...';
            try {
                var publicUrl = await uploadImageToStorage(this.files[0], 'article');
                B.insertAtCursor('\n![image](' + publicUrl + ')\n');
                statusEl.textContent = 'Image uploaded!';
                snd('success');
            } catch (err) {
                statusEl.textContent = 'Image upload failed: ' + (err.message || err);
            }
            this.value = '';
        });

        // Toolbar button clicks
        document.getElementById('lbToolbar').addEventListener('click', function(e) {
            var btn = e.target.closest('[data-fmt]');
            if (!btn) return;
            e.preventDefault();
            B.insertFormat(btn.dataset.fmt);
        });

        var _pvToggle = document.getElementById('lbPreviewToggle');
        if (_pvToggle) {
            _pvToggle.addEventListener('click', function(e) {
                e.preventDefault();
                var pv = document.getElementById('lbCmsPreview');
                if (!pv) return;
                pv.classList.toggle('mobile-show');
                _pvToggle.style.borderColor = pv.classList.contains('mobile-show') ? 'var(--accent)' : 'transparent';
                _pvToggle.style.color = pv.classList.contains('mobile-show') ? 'var(--accent)' : '';
            });
        }

        // Keyboard shortcuts overlay
        const _scBtn = document.getElementById('lbShortcutsBtn');
        if (_scBtn) {
            _scBtn.addEventListener('click', function() {
                const existing = document.querySelector('.lb-drill-overlay[data-shortcuts]');
                if (existing) { existing.remove(); return; }
                const shortcuts = [
                    ['Ctrl+B', 'Bold'], ['Ctrl+I', 'Italic'], ['Ctrl+K', 'Link'],
                    ['Ctrl+`', 'Inline Code'], ['Ctrl+S', 'Save Draft'],
                    ['Ctrl+2', 'Heading 2'], ['Ctrl+3', 'Heading 3'], ['Ctrl+4', 'Heading 4'],
                    ['Ctrl+1', 'Bullet List'], ['Ctrl+Shift+P', 'Open/Close Admin'],
                    ['Ctrl+/', 'Show Shortcuts'], ['Esc', 'Close Dialog']
                ];
                const overlay = document.createElement('div');
                overlay.className = 'lb-drill-overlay';
                overlay.setAttribute('data-shortcuts', '1');
                overlay.innerHTML = '<div class="lb-drill-modal" style="max-width:420px">' +
                    '<button class="lb-drill-close" aria-label="Close">ESC</button>' +
                    '<div class="lb-drill-title">Keyboard Shortcuts</div>' +
                    '<div style="margin-top:16px">' + shortcuts.map(function(s) {
                        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px">' +
                            '<span style="font-family:JetBrains Mono,monospace;font-size:10px;padding:2px 8px;border:1px solid var(--border);border-radius:3px">' + s[0] + '</span>' +
                            '<span style="color:var(--sub)">' + s[1] + '</span></div>';
                    }).join('') + '</div></div>';
                document.body.appendChild(overlay);
                overlay.querySelector('.lb-drill-close').addEventListener('click', function() { overlay.remove(); });
                overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
            });
        }

        // Keyboard shortcuts (textarea fallback only; CM6 handles its own keybindings)
        B._cmSaveHandler = function() { B._markCmsClean(); saveCurrentDraft(true); B.saveArticle(false, null); };
        if (!B._cmView) {
            document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
                if (!e.ctrlKey && !e.metaKey) return;
                if (e.key.toLowerCase() === 's') { e.preventDefault(); B._cmSaveHandler(); return; }
                const fmtMap = { 'b': 'bold', 'i': 'italic', 'k': 'link', '`': 'code', '1': 'ul', '2': 'h2', '3': 'h3', '4': 'h4' };
                const fmt = fmtMap[e.key.toLowerCase()];
                if (fmt) { e.preventDefault(); B.insertFormat(fmt); }
            });
            document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    B.insertAtCursor('  ');
                }
            });
        }

        // Fetch existing articles
        await fetchAdminArticles();
    }

    let _allAdminArticles = [];

    async function fetchAdminArticles() {
        if (!window._sb) return;

        try {
            const r = await window._sb
                .from('longform_articles')
                .select('id,title,slug,published,created_at,views,scheduled_at')
                .order('created_at', { ascending: false });

            if (r.error) throw r.error;
            _allAdminArticles = r.data || [];

            renderDraftsList();
            _renderFilteredTab('scheduled');
            _renderFilteredTab('published');
        } catch (e) {}
    }

    function _classifyArticle(a) {
        if (a.scheduled_at && !a.published && new Date(a.scheduled_at) > new Date()) return 'scheduled';
        if (a.published) return 'published';
        return 'draft';
    }

    function _renderFilteredTab(tab, filter) {
        var cfg = { scheduled: { listId: 'lbSchedList', countId: 'lbSchedCount', badgeId: 'lbSchedBadge' },
                    published: { listId: 'lbPubList', countId: 'lbPubCount', badgeId: 'lbPubBadge' } }[tab];
        if (!cfg) return;
        var articles = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === tab; });
        if (filter) {
            var q = filter.toLowerCase();
            articles = articles.filter(function(a) {
                return (a.title || '').toLowerCase().includes(q) || (a.slug || '').toLowerCase().includes(q);
            });
        }
        var listEl = document.getElementById(cfg.listId);
        var countEl = document.getElementById(cfg.countId);
        var badgeEl = document.getElementById(cfg.badgeId);
        var total = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === tab; }).length;
        if (badgeEl) badgeEl.textContent = total ? '(' + total + ')' : '';
        if (countEl) countEl.textContent = articles.length + ' article' + (articles.length !== 1 ? 's' : '');
        _renderArticleList(listEl, articles, tab);
    }

    /* ── B6: Bulk Operations ── */
    var _bulkSelected = new Set();

    function _updateBulkBar(listEl) {
        if (!listEl || !listEl.parentElement) return;
        var existing = listEl.parentElement.querySelector('.lb-bulk-bar');
        if (_bulkSelected.size === 0) { if (existing) existing.remove(); return; }
        if (!existing) {
            existing = document.createElement('div');
            existing.className = 'lb-bulk-bar';
            listEl.parentElement.insertBefore(existing, listEl);
        }
        var totalCheckboxes = listEl.querySelectorAll('.lb-bulk-check').length;
        var allChecked = totalCheckboxes > 0 && _bulkSelected.size >= totalCheckboxes;
        existing.innerHTML = '<span class="lb-bulk-count">' + _bulkSelected.size + ' selected</span>' +
            '<label style="font-size:9px;color:var(--sub);cursor:pointer;display:flex;align-items:center;gap:3px"><input type="checkbox" class="lb-bulk-select-all"' + (allChecked ? ' checked' : '') + '> All</label>' +
            '<div class="lb-bulk-actions">' +
            '<button class="lb-cms-btn primary" style="padding:3px 8px;font-size:8px" data-bulk-action="publish">PUBLISH</button>' +
            '<button class="lb-cms-btn secondary" style="padding:3px 8px;font-size:8px" data-bulk-action="unpublish">UNPUBLISH</button>' +
            '<button class="lb-cms-btn danger" style="padding:3px 8px;font-size:8px" data-bulk-action="delete">DELETE</button>' +
            '</div>';
        var selAll = existing.querySelector('.lb-bulk-select-all');
        if (selAll) selAll.addEventListener('change', function() {
            listEl.querySelectorAll('.lb-bulk-check').forEach(function(cb) { cb.checked = selAll.checked; if (selAll.checked) _bulkSelected.add(cb.dataset.bulkId); else _bulkSelected.delete(cb.dataset.bulkId); });
            _updateBulkBar(listEl);
        });
        existing.querySelectorAll('[data-bulk-action]').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                var action = btn.dataset.bulkAction;
                var ids = Array.from(_bulkSelected);
                if (!ids.length || !window._sb) return;
                if (!confirm(action.charAt(0).toUpperCase() + action.slice(1) + ' ' + ids.length + ' article(s)?')) return;
                try {
                    for (var i = 0; i < ids.length; i++) {
                        if (action === 'publish') await window._sb.from('longform_articles').update({ published: true, scheduled_at: null }).eq('id', ids[i]);
                        else if (action === 'unpublish') await window._sb.from('longform_articles').update({ published: false }).eq('id', ids[i]);
                        else if (action === 'delete') await window._sb.from('longform_articles').delete().eq('id', ids[i]);
                    }
                    snd('success');
                    _bulkSelected.clear();
                    if (window.UniToast) window.UniToast(ids.length + ' article(s) ' + action + 'ed', '', '✅', 'success');
                    await fetchAdminArticles();
                } catch(e) { if (window.UniToast) window.UniToast('Bulk operation failed', '', '⚠️', 'warn'); }
            });
        });
    }

    function _renderArticleList(listEl, data, mode) {
        if (!listEl) return;

        if (!data || !data.length) {
            var msgs = { scheduled: 'No scheduled articles.', published: 'No published articles.' };
            listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:8px 0">' + (msgs[mode] || 'No articles.') + '</div>';
            var oldBar = listEl.parentElement.querySelector('.lb-bulk-bar');
            if (oldBar) oldBar.remove();
            return;
        }

        listEl.innerHTML = data.map(function(a) {
            var cls = _classifyArticle(a);
            var draftInfo = cls === 'draft' ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-left:4px">☁️ ' + new Date(a.created_at).toLocaleDateString() + '</span>' : '';
            var schedInfo = cls === 'scheduled' ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:#a855f7;margin-left:4px" title="' + esc(new Date(a.scheduled_at).toLocaleString()) + '">🕐 ' + esc(new Date(a.scheduled_at).toLocaleString()) + '</span>' : '';
            var viewsInfo = cls === 'published' ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-left:4px">' + (a.views || 0) + ' views</span>' : '';
            var actions = '';
            if (cls === 'draft') actions += '<button class="lb-cms-btn primary" style="padding:4px 8px;font-size:8px" data-publish-draft="' + a.id + '">PUBLISH</button>';
            if (cls === 'scheduled') actions += '<button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px;color:#f59e0b;border-color:rgba(245,158,11,.3)" data-cancel-schedule="' + a.id + '">UNSCHEDULE</button>';
            if (cls === 'published') actions += '<button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px" data-unpublish-id="' + a.id + '">UNPUBLISH</button>';
            actions += '<button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px" data-edit-slug="' + esc(a.slug) + '">EDIT</button>';
            actions += '<button class="lb-cms-btn danger" style="padding:4px 8px;font-size:8px" data-delete-id="' + a.id + '">DEL</button>';
            return '<div class="lb-cms-article-row">' +
                '<input type="checkbox" class="lb-bulk-check" data-bulk-id="' + a.id + '"' + (_bulkSelected.has(a.id) ? ' checked' : '') + ' style="margin-right:6px;cursor:pointer">' +
                '<span class="lb-cms-article-title" data-title-slug="' + esc(a.slug) + '">' + esc(a.title) + '</span>' +
                draftInfo + schedInfo + viewsInfo +
                '<div class="lb-cms-article-actions">' + actions + '</div></div>';
        }).join('');

        listEl.querySelectorAll('.lb-bulk-check').forEach(function(cb) {
            cb.addEventListener('change', function() {
                if (cb.checked) _bulkSelected.add(cb.dataset.bulkId);
                else _bulkSelected.delete(cb.dataset.bulkId);
                _updateBulkBar(listEl);
            });
        });

        _bindArticleActions(listEl);
    }

    function _bindArticleActions(container) {
        container.querySelectorAll('[data-title-slug]').forEach(function(el) {
            el.addEventListener('click', function() { loadArticleForEdit(el.dataset.titleSlug); });
        });
        container.querySelectorAll('[data-edit-slug]').forEach(function(el) {
            el.addEventListener('click', function() { loadArticleForEdit(el.dataset.editSlug); });
        });
        container.querySelectorAll('[data-delete-id]').forEach(function(el) {
            el.addEventListener('click', function() { B.deleteArticle(el.dataset.deleteId); });
        });
        container.querySelectorAll('[data-publish-draft]').forEach(function(el) {
            el.addEventListener('click', async function() {
                if (!confirm('Publish this draft now?')) return;
                try {
                    var upd = await window._sb.from('longform_articles').update({ published: true }).eq('id', el.dataset.publishDraft);
                    if (upd.error) throw upd.error;
                    snd('success');
                    if (window.UniToast) window.UniToast('Article published!', '', '🚀', 'success');
                    await fetchAdminArticles();
                } catch (err) {
                    if (window.UniToast) window.UniToast('Failed to publish.', '', '⚠️', 'warn');
                }
            });
        });
        container.querySelectorAll('[data-cancel-schedule]').forEach(function(el) {
            el.addEventListener('click', async function() {
                if (!confirm('Remove scheduled publish time? Article will revert to draft.')) return;
                try {
                    var upd = await window._sb.from('longform_articles').update({ scheduled_at: null }).eq('id', el.dataset.cancelSchedule);
                    if (upd.error) throw upd.error;
                    snd('success');
                    if (window.UniToast) window.UniToast('Schedule cancelled.', '', '✅', 'success');
                    await fetchAdminArticles();
                } catch (err) {
                    if (window.UniToast) window.UniToast('Failed to cancel schedule.', '', '⚠️', 'warn');
                }
            });
        });
        container.querySelectorAll('[data-unpublish-id]').forEach(function(el) {
            el.addEventListener('click', async function() {
                if (!confirm('Unpublish this article? It will become a draft.')) return;
                try {
                    var upd = await window._sb.from('longform_articles').update({ published: false }).eq('id', el.dataset.unpublishId);
                    if (upd.error) throw upd.error;
                    snd('success');
                    if (window.UniToast) window.UniToast('Article unpublished.', '', '📝', 'success');
                    await fetchAdminArticles();
                } catch (err) {
                    if (window.UniToast) window.UniToast('Failed to unpublish.', '', '⚠️', 'warn');
                }
            });
        });
    }

    async function loadArticleForEdit(slug) {
        if (!window._sb) return;

        try {
            const { data, error } = await window._sb
                .from('longform_articles')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error || !data) return;

            B.editingArticle = data;

            // Switch to article tab
            B.adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            B.adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            var artTab = B.adminDialog.querySelector('[data-admintab="article"]');
            var artContent = B.adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');

            document.getElementById('lbCmsTitle').value = data.title || '';
            document.getElementById('lbCmsSlug').value = data.slug || '';
            document.getElementById('lbCmsExcerpt').value = data.excerpt || '';
            document.getElementById('lbCmsTags').value = (data.tags || []).join(', ');
            document.getElementById('lbCmsCover').value = data.cover_image || '';
            B._setEditorValue(data.content || '');

            if (data.scheduled_at && !data.published) {
                var dt = new Date(data.scheduled_at);
                var local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('lbCmsScheduleAt').value = local;
                document.getElementById('lbCmsScheduleRow').style.display = 'flex';
            } else {
                document.getElementById('lbCmsScheduleAt').value = '';
                document.getElementById('lbCmsScheduleRow').style.display = 'none';
            }

            document.getElementById('lbCmsPreviewContent').innerHTML = B.parseMarkdown(data.content);
            document.getElementById('lbCmsStatus').textContent = 'Editing: "' + (data.title || '') + '"';

            // Series fields
            var seriesInput = document.getElementById('lbCmsSeries');
            var seriesOrderInput = document.getElementById('lbCmsSeriesOrder');
            if (seriesInput) seriesInput.value = data.series_name || '';
            if (seriesOrderInput) seriesOrderInput.value = data.series_order || 0;

            // Show versioning and review buttons
            var histBtn = document.getElementById('lbCmsHistory');
            var reviewBtn = document.getElementById('lbCmsShareReview');
            if (histBtn) { histBtn.style.display = ''; histBtn.onclick = function() { B.showVersionHistory(data.id); }; }
            if (reviewBtn) { reviewBtn.style.display = ''; reviewBtn.onclick = function() { B.shareForReview(data.id); }; }

            // Hide version panel
            var vp = document.getElementById('lbVersionPanel');
            if (vp) vp.style.display = 'none';

            B.adminDialog.scrollTop = 0;
            snd('tap');

        } catch (e) { }
    }


    /* ═══════════════════════════════════════════════════
       PHASE 3: VERSION HISTORY
       ═══════════════════════════════════════════════════ */
    async function showVersionHistory(articleId) {
        var panel = document.getElementById('lbVersionPanel');
        if (!panel || !window._sb) return;

        if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }

        panel.innerHTML = '<div class="lb-empty">Loading versions...</div>';
        panel.style.display = 'block';

        try {
            var res = await window._sb
                .from('article_versions')
                .select('*')
                .eq('article_id', articleId)
                .order('version_number', { ascending: false });

            var versions = res.data || [];
            if (!versions.length) {
                panel.innerHTML = '<div class="lb-version-history"><div style="padding:16px;font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);text-align:center">No previous versions.</div></div>';
                return;
            }

            panel.innerHTML = '<div class="lb-version-history">' +
                '<div style="padding:8px 14px;font-family:\'JetBrains Mono\',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);border-bottom:1px solid var(--border)">VERSION HISTORY</div>' +
                versions.map(function(v) {
                    return '<div class="lb-version-row">' +
                        '<span class="lb-version-num">v' + v.version_number + '</span>' +
                        '<span class="lb-version-title">' + esc(v.title || '(untitled)') + '</span>' +
                        '<span class="lb-version-time">' + B.timeAgo(v.created_at) + '</span>' +
                        '<div class="lb-version-actions">' +
                        '<button class="lb-draft-btn" data-version-restore="' + v.id + '">RESTORE</button>' +
                        '</div></div>';
                }).join('') + '</div>';

            panel.querySelectorAll('[data-version-restore]').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    var vid = btn.dataset.versionRestore;
                    var ver = versions.find(function(v) { return v.id === vid; });
                    if (!ver || !confirm('Restore version ' + ver.version_number + '? This will overwrite the current editor contents.')) return;
                    document.getElementById('lbCmsTitle').value = ver.title || '';
                    B._setEditorValue(ver.content || '');
                    document.getElementById('lbCmsExcerpt').value = ver.excerpt || '';
                    if (ver.tags) document.getElementById('lbCmsTags').value = (ver.tags || []).join(', ');
                    document.getElementById('lbCmsPreviewContent').innerHTML = B.parseMarkdown(ver.content || '');
                    document.getElementById('lbCmsStatus').textContent = 'Restored version ' + ver.version_number;
                    panel.style.display = 'none';
                    snd('success');
                });
            });
        } catch (e) {
            panel.innerHTML = '<div class="lb-version-history"><div style="padding:16px;color:var(--sub);text-align:center;font-size:10px">Failed to load versions.</div></div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: SHARE FOR REVIEW
       ═══════════════════════════════════════════════════ */
    async function shareForReview(articleId) {
        if (!window._sb) return;
        var token = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        try {
            await window._sb.rpc('create_review_link', { p_article_id: articleId, p_token: token });
            var url = window.location.origin + window.location.pathname + '?review=' + token;
            navigator.clipboard.writeText(url).then(function() {
                if (window.UniToast) window.UniToast('Review link copied!', url, '🔗', 'success');
            }).catch(function() {
                prompt('Copy this review link:', url);
            });
            snd('success');
        } catch (e) {
            if (window.UniToast) window.UniToast('Failed to create review link.', '', '⚠️', 'warn');
        }
    }

    async function saveArticle(publish, scheduledAt, isAutoSave) {
        if (!window._sb) return;

        const title = document.getElementById('lbCmsTitle').value.trim();
        const slug = document.getElementById('lbCmsSlug').value.trim() || B.slugify(title);
        const excerpt = document.getElementById('lbCmsExcerpt').value.trim();
        const tags = document.getElementById('lbCmsTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        const cover = document.getElementById('lbCmsCover').value.trim();
        const content = B._getEditorValue();
        const seriesName = (document.getElementById('lbCmsSeries') || {}).value || '';
        const seriesOrder = parseInt((document.getElementById('lbCmsSeriesOrder') || {}).value, 10) || 0;

        if (!title) {
            if (!isAutoSave) document.getElementById('lbCmsStatus').textContent = 'Title is required.';
            return;
        }
        if (!slug) {
            if (!isAutoSave) document.getElementById('lbCmsStatus').textContent = 'Slug is required.';
            return;
        }

        const pubBtn = document.getElementById('lbCmsPublish');
        const draftBtn = document.getElementById('lbCmsDraft');
        if (!isAutoSave) {
            pubBtn.disabled = true;
            draftBtn.disabled = true;
        }

        const statusMsg = isAutoSave ? 'Auto-saving...' : (scheduledAt ? 'Scheduling...' : (publish ? 'Publishing...' : 'Saving draft...'));
        document.getElementById('lbCmsStatus').textContent = statusMsg;

        const liCheck = document.getElementById('lbCmsLinkedIn');
        const liShare = liCheck ? liCheck.checked : false;

        const row = {
            title: title,
            slug: slug,
            excerpt: excerpt,
            content: content,
            cover_image: cover,
            tags: tags,
            published: scheduledAt ? false : publish,
            scheduled_at: scheduledAt || null,
            linkedin_posted: (publish || scheduledAt) ? !liShare : true,
            series_name: seriesName.trim() || null,
            series_order: seriesOrder
        };

        try {
            let error, insertedRow = null;
            if (B.editingArticle) {
                try { await window._sb.rpc('save_article_version', { p_article_id: B.editingArticle.id }); } catch(e) {}
                const res = await window._sb.from('longform_articles').update(row).eq('id', B.editingArticle.id);
                error = res.error;
            } else {
                const res2 = await window._sb.from('longform_articles').insert(row).select();
                error = res2.error;
                if (res2.data && res2.data.length) insertedRow = res2.data[0];
            }

            if (error) throw error;

            snd('success');
            if (window._lbActiveDraftId) {
                try {
                    if (window._lbDeleteDraft) window._lbDeleteDraft(window._lbActiveDraftId);
                    else {
                        const _dk = '_lb_drafts';
                        let _dd = JSON.parse(localStorage.getItem(_dk)) || [];
                        _dd = _dd.filter(function(d) { return d.id !== window._lbActiveDraftId; });
                        localStorage.setItem(_dk, JSON.stringify(_dd));
                        window._lbActiveDraftId = null;
                    }
                } catch(e) {}
            }
            try { localStorage.removeItem('_lb_article_draft'); } catch(e) {}

            if (isAutoSave && !B.editingArticle && insertedRow) {
                B.editingArticle = insertedRow;
                document.getElementById('lbCmsStatus').textContent = 'Auto-saved to cloud.';
                const pubBtn2 = document.getElementById('lbCmsPublish');
                const draftBtn2 = document.getElementById('lbCmsDraft');
                if (pubBtn2) pubBtn2.disabled = false;
                if (draftBtn2) draftBtn2.disabled = false;
                return true;
            }

            B._markCmsClean();
            const doneMsg = scheduledAt ? 'Scheduled!' : (publish ? 'Published!' : 'Draft saved!');
            document.getElementById('lbCmsStatus').textContent = doneMsg;

            if (window.UniToast && !isAutoSave) {
                window.UniToast(scheduledAt ? 'Article scheduled!' : (publish ? 'Article published!' : 'Draft saved.'), '', scheduledAt ? '\ud83d\udd50' : (publish ? '\ud83d\ude80' : '\ud83d\udcbe'), 'success');
            }

            if (!B.editingArticle && !isAutoSave) {
                document.getElementById('lbCmsTitle').value = '';
                document.getElementById('lbCmsSlug').value = '';
                document.getElementById('lbCmsExcerpt').value = '';
                document.getElementById('lbCmsTags').value = '';
                document.getElementById('lbCmsCover').value = '';
                B._setEditorValue('');
                document.getElementById('lbCmsPreviewContent').innerHTML = '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
                const _si = document.getElementById('lbCmsSeries');
                const _so = document.getElementById('lbCmsSeriesOrder');
                if (_si) _si.value = '';
                if (_so) _so.value = '0';
            }
            if (!isAutoSave) {
                document.getElementById('lbCmsScheduleRow').style.display = 'none';
                document.getElementById('lbCmsScheduleAt').value = '';
            }

            if (!isAutoSave && !B.editingArticle) B.editingArticle = null;
            if (!isAutoSave) await fetchAdminArticles();

            if (publish && !scheduledAt) {
                setTimeout(function() {
                    const statusEl = document.getElementById('lbCmsStatus');
                    if (!statusEl) return;
                    const safeSlug = esc(slug);
                    statusEl.innerHTML = 'Published! <a href="?post=' + safeSlug + '" style="color:var(--accent);text-decoration:underline;cursor:pointer" id="lbCmsViewLink">View article</a>';
                    const viewLink = document.getElementById('lbCmsViewLink');
                    if (viewLink) {
                        viewLink.addEventListener('click', function(ev) {
                            ev.preventDefault();
                            closeAdmin();
                            B.navigateTo({ post: slug });
                        });
                    }
                }, 100);
            }

            return true;

        } catch (e) {
            const msg = (e.code === '23505' || (e.message || '').includes('duplicate'))
                ? 'Slug already exists. Choose a different slug.'
                : (e.message || 'Save failed.');
            document.getElementById('lbCmsStatus').textContent = msg;
            if (isAutoSave) throw e;
        } finally {
            pubBtn.disabled = false;
            draftBtn.disabled = false;
        }
    }

    async function deleteArticle(id) {
        if (!window._sb || !confirm('Delete this article permanently?')) return;

        try {
            const { error } = await window._sb.from('longform_articles').delete().eq('id', id);
            if (error) throw error;
            snd('success');
            await fetchAdminArticles();
        } catch (e) {
            if (window.UniToast) window.UniToast('Delete failed.', '', '⚠️', 'warn');
        }
    }

    /* ═══════════════════════════════════════════════════
       KEYBOARD SHORTCUT — Ctrl+Shift+P
       ═══════════════════════════════════════════════════ */
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key === B.ADMIN_SHORTCUT.key) {
            e.preventDefault();
            if (B.adminDialog && B.adminDialog.open) {
                closeAdmin();
            } else {
                openAdmin();
            }
        }
    });

    // ESC: if fullscreen editor is active, exit fullscreen instead of closing admin
    if (B.adminDialog) {
        B.adminDialog.addEventListener('cancel', e => {
            const splitEl = document.getElementById('lbCmsSplit');
            if (splitEl && splitEl.classList.contains('lb-editor-fs')) {
                e.preventDefault();
                if (typeof _exitFullscreen === 'function') _exitFullscreen();
                else {
                    splitEl.classList.remove('lb-editor-fs');
                    var _fb = document.getElementById('lbEditorFullscreen');
                    if (_fb) _fb.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
                    var _ex = splitEl.querySelector('.lb-fs-exit-btn');
                    if (_ex) _ex.remove();
                }
            }
        });
        B.adminDialog.addEventListener('close', () => {
            snd('menuClose');
        });
        B.adminDialog.addEventListener('click', e => {
            if (e.target === B.adminDialog) closeAdmin();
        });
    }

    /* ═══════════════════════════════════════════════════
       B1: COMMAND PALETTE (Ctrl+K)
       Styles in Css/blog.css (.lb-cmd-*)
       ═══════════════════════════════════════════════════ */

    var _cmdPaletteOpen = false;

    function _getCmdPaletteCommands() {
        return [
            { id:'newArticle', icon:'📝', label:'New Article', cat:'Content', action:function(){ _switchAdminTab('article'); _clickEl('lbDraftsNew'); }},
            { id:'newThought', icon:'💭', label:'New Thought', cat:'Content', action:function(){ _switchAdminTab('micro'); _clickEl('lbTDraftsNew'); }},
            { id:'publish', icon:'🚀', label:'Publish Current Article', cat:'Content', action:function(){ _clickEl('lbCmsPublish'); }},
            { id:'saveDraft', icon:'💾', label:'Save Draft', cat:'Content', key:'Ctrl+S', action:function(){ _clickEl('lbCmsDraft'); }},
            { id:'togglePreview', icon:'👁', label:'Toggle Preview', cat:'Editor', action:function(){ _clickEl('lbPreviewToggle'); }},
            { id:'fullscreen', icon:'⛶', label:'Fullscreen Editor', cat:'Editor', action:function(){ _clickEl('lbEditorFullscreen'); }},
            { id:'insertTable', icon:'▦', label:'Insert Table', cat:'Insert', action:function(){ if(typeof B.insertFormat==='function') B.insertFormat('table'); }},
            { id:'insertCode', icon:'⌨', label:'Insert Code Block', cat:'Insert', action:function(){ if(typeof B.insertFormat==='function') B.insertFormat('codeblock'); }},
            { id:'insertCallout', icon:'📌', label:'Insert Callout', cat:'Insert', action:function(){ if(typeof B.insertFormat==='function') B.insertFormat('callout'); }},
            { id:'tabDrafts', icon:'📋', label:'Open Drafts', cat:'Navigate', action:function(){ _switchAdminTab('article'); _switchSubTab('drafts'); }},
            { id:'tabScheduled', icon:'🕐', label:'Open Scheduled', cat:'Navigate', action:function(){ _switchAdminTab('article'); _switchSubTab('scheduled'); }},
            { id:'tabPublished', icon:'✅', label:'Open Published', cat:'Navigate', action:function(){ _switchAdminTab('article'); _switchSubTab('published'); }},
            { id:'tabAnalytics', icon:'📊', label:'Open Analytics', cat:'Navigate', action:function(){ _switchAdminTab('analytics'); }},
            { id:'tabThoughts', icon:'💬', label:'Open Thoughts', cat:'Navigate', action:function(){ _switchAdminTab('micro'); }},
            { id:'exportCSV', icon:'⤓', label:'Export Analytics CSV', cat:'Data', action:function(){ _switchAdminTab('analytics'); setTimeout(function(){ _clickEl('lbExportCSV'); },300); }},
            { id:'signOut', icon:'🚪', label:'Sign Out', cat:'Account', action:function(){ _clickEl('lbCmsSignout'); }},
        ];
    }

    function _switchAdminTab(tabKey) {
        if (!B.adminDialog) return;
        var tab = B.adminDialog.querySelector('[data-admintab="' + tabKey + '"]');
        if (tab) tab.click();
    }
    function _switchSubTab(subKey) {
        if (!B.adminDialog) return;
        var tab = B.adminDialog.querySelector('[data-subtab="' + subKey + '"]');
        if (tab) tab.click();
    }
    function _clickEl(id) { var el = document.getElementById(id); if (el) el.click(); }

    function _fuzzyMatch(query, text) {
        var q = query.toLowerCase();
        var t = text.toLowerCase();
        if (t.includes(q)) return true;
        var qi = 0;
        for (var ti = 0; ti < t.length && qi < q.length; ti++) {
            if (t[ti] === q[qi]) qi++;
        }
        return qi === q.length;
    }

    function openCmdPalette() {
        if (_cmdPaletteOpen || !B.adminDialog || !B.adminDialog.open) return;
        _cmdPaletteOpen = true;
        var commands = _getCmdPaletteCommands();
        var activeIdx = 0;

        var overlay = document.createElement('div');
        overlay.className = 'lb-cmd-overlay';
        overlay.innerHTML = '<div class="lb-cmd-box"><input class="lb-cmd-input" placeholder="Type a command..." autofocus><div class="lb-cmd-results"></div></div>';
        document.body.appendChild(overlay);

        var input = overlay.querySelector('.lb-cmd-input');
        var results = overlay.querySelector('.lb-cmd-results');

        function renderResults(filter) {
            var filtered = filter ? commands.filter(function(c) { return _fuzzyMatch(filter, c.label) || _fuzzyMatch(filter, c.cat); }) : commands;
            if (!filtered.length) { results.innerHTML = '<div class="lb-cmd-empty">No matching commands</div>'; return; }
            var cats = {};
            filtered.forEach(function(c) { if (!cats[c.cat]) cats[c.cat] = []; cats[c.cat].push(c); });
            var html = '';
            Object.keys(cats).forEach(function(cat) {
                html += '<div class="lb-cmd-cat">' + esc(cat) + '</div>';
                cats[cat].forEach(function(c, i) {
                    var gIdx = filtered.indexOf(c);
                    html += '<div class="lb-cmd-item' + (gIdx === activeIdx ? ' active' : '') + '" data-cmd="' + c.id + '">' +
                        '<span class="lb-cmd-icon">' + c.icon + '</span>' +
                        '<span class="lb-cmd-label">' + esc(c.label) + '</span>' +
                        (c.key ? '<span class="lb-cmd-shortcut">' + c.key + '</span>' : '') + '</div>';
                });
            });
            results.innerHTML = html;
            results.querySelectorAll('.lb-cmd-item').forEach(function(item) {
                item.addEventListener('click', function() { executeCmd(item.dataset.cmd); });
                item.addEventListener('mouseenter', function() {
                    results.querySelectorAll('.lb-cmd-item').forEach(function(it) { it.classList.remove('active'); });
                    item.classList.add('active');
                    var all = Array.from(results.querySelectorAll('.lb-cmd-item'));
                    activeIdx = all.indexOf(item);
                });
            });
        }

        function executeCmd(id) {
            var cmd = commands.find(function(c) { return c.id === id; });
            closePalette();
            if (cmd) { snd('tap'); cmd.action(); }
        }

        function closePalette() {
            _cmdPaletteOpen = false;
            overlay.remove();
        }

        input.addEventListener('input', function() { activeIdx = 0; renderResults(input.value.trim()); });

        input.addEventListener('keydown', function(e) {
            var items = results.querySelectorAll('.lb-cmd-item');
            if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); _highlightCmdItem(items, activeIdx); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); _highlightCmdItem(items, activeIdx); }
            else if (e.key === 'Enter') { e.preventDefault(); if (items[activeIdx]) executeCmd(items[activeIdx].dataset.cmd); }
            else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
        });

        overlay.addEventListener('click', function(e) { if (e.target === overlay) closePalette(); });
        renderResults('');
        input.focus();
    }

    function _highlightCmdItem(items, idx) {
        items.forEach(function(it, i) { it.classList.toggle('active', i === idx); });
        if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k' && B.adminDialog && B.adminDialog.open) {
            e.preventDefault();
            openCmdPalette();
        }
    });

    /* ═══════════════════════════════════════════════════
       COMMENTS MANAGEMENT TAB
       ═══════════════════════════════════════════════════ */
    var _cmtFilter = 'all';
    var _cmtSearch = '';
    var _cmtPage = 0;
    var _cmtPerPage = 25;

    async function _renderCommentsAdmin() {
        var container = document.getElementById('lbCommentsAdmin');
        if (!container || !window._sb) return;
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">💬</div>Loading comments...</div>';

        try {
            var [commentsRes, articlesRes] = await Promise.all([
                window._sb.from('article_comments').select('*').order('created_at', { ascending: false }),
                window._sb.from('longform_articles').select('id,title,slug')
            ]);
            var allComments = commentsRes.data || [];
            var articles = articlesRes.data || [];
            var articleMap = {};
            articles.forEach(function(a) { articleMap[a.id] = a; });

            var todayStr = new Date().toISOString().slice(0, 10);
            var todayCount = allComments.filter(function(c) { return c.created_at && c.created_at.slice(0, 10) === todayStr; }).length;
            var flaggedCount = allComments.filter(function(c) { return c.flagged; }).length;
            var avgPerArticle = articles.length ? (allComments.length / articles.length).toFixed(1) : '0';

            function _filtered() {
                var list = allComments;
                if (_cmtFilter === 'flagged') list = list.filter(function(c) { return c.flagged; });
                if (_cmtSearch) {
                    var q = _cmtSearch.toLowerCase();
                    list = list.filter(function(c) {
                        return (c.author_name || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q);
                    });
                }
                return list;
            }

            function _render() {
                var filtered = _filtered();
                var paged = filtered.slice(0, (_cmtPage + 1) * _cmtPerPage);
                var hasMore = paged.length < filtered.length;

                container.innerHTML =
                    '<div class="lb-cmt-admin-bar">' +
                    '<div class="lb-kpi-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + allComments.length + '</div><div class="lb-kpi-label">Total</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + todayCount + '</div><div class="lb-kpi-label">Today</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:#f59e0b">' + flaggedCount + '</div><div class="lb-kpi-label">Flagged</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + avgPerArticle + '</div><div class="lb-kpi-label">Avg/Article</div></div>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
                    '<button class="lb-cms-btn ' + (_cmtFilter === 'all' ? 'primary' : 'secondary') + '" data-cmtf="all">All</button>' +
                    '<button class="lb-cms-btn ' + (_cmtFilter === 'flagged' ? 'primary' : 'secondary') + '" data-cmtf="flagged">Flagged</button>' +
                    '<input class="lb-cms-input" placeholder="Search comments..." value="' + esc(_cmtSearch) + '" id="lbCmtSearch" style="flex:1;min-width:140px;max-width:300px">' +
                    '<button class="lb-cms-btn secondary" id="lbCmtBulkDel" style="color:#ef4444">Bulk Delete Selected</button>' +
                    '</div></div>' +
                    '<div class="lb-cmt-admin-list">' +
                    (paged.length ? paged.map(function(c) {
                        var art = articleMap[c.article_id];
                        var artTitle = art ? art.title : 'Unknown';
                        var artSlug = art ? art.slug : '';
                        var preview = (c.content || '').slice(0, 120) + ((c.content || '').length > 120 ? '...' : '');
                        return '<div class="lb-cmt-admin-row' + (c.flagged ? ' flagged' : '') + '" data-cid="' + c.id + '">' +
                            '<label class="lb-cmt-check"><input type="checkbox" data-cmt-sel="' + c.id + '"></label>' +
                            '<div class="lb-cmt-admin-body">' +
                            '<div class="lb-cmt-admin-meta">' +
                            '<strong>' + esc(c.author_name) + '</strong>' +
                            '<span class="lb-cmt-admin-time">' + B.fmtDate(c.created_at) + '</span>' +
                            '<span class="lb-cmt-admin-article" data-slug="' + esc(artSlug) + '" title="Go to article">' + esc(artTitle.slice(0, 40)) + '</span>' +
                            (c.parent_id ? '<span style="font-size:8px;opacity:.5">↩ reply</span>' : '') +
                            '<span style="font-size:9px;color:var(--sub)">❤ ' + (c.likes || 0) + '</span>' +
                            '</div>' +
                            '<div class="lb-cmt-admin-text">' + esc(preview) + '</div>' +
                            '</div>' +
                            '<div class="lb-cmt-admin-actions">' +
                            '<button class="lb-cms-btn secondary" data-flag="' + c.id + '" data-flagged="' + (c.flagged ? '1' : '0') + '" style="font-size:8px;padding:4px 8px">' + (c.flagged ? '✓ Unflag' : '⚑ Flag') + '</button>' +
                            '<button class="lb-cms-btn secondary" data-del-cmt="' + c.id + '" style="font-size:8px;padding:4px 8px;color:#ef4444">Delete</button>' +
                            '</div></div>';
                    }).join('') : '<div class="lb-empty" style="padding:20px"><div class="lb-empty-icon">💬</div>No comments found.</div>') +
                    '</div>' +
                    (hasMore ? '<button class="lb-cms-btn secondary" id="lbCmtMore" style="margin-top:12px;width:100%">Load More (' + (filtered.length - paged.length) + ' remaining)</button>' : '');

                // Bind events
                container.querySelectorAll('[data-cmtf]').forEach(function(btn) {
                    btn.addEventListener('click', function() { _cmtFilter = btn.dataset.cmtf; _cmtPage = 0; _render(); });
                });
                var searchInput = document.getElementById('lbCmtSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', function() { _cmtSearch = searchInput.value; _cmtPage = 0; _render(); });
                }
                var moreBtn = document.getElementById('lbCmtMore');
                if (moreBtn) moreBtn.addEventListener('click', function() { _cmtPage++; _render(); });

                container.querySelectorAll('[data-del-cmt]').forEach(function(btn) {
                    btn.addEventListener('click', async function() {
                        if (!confirm('Delete this comment?')) return;
                        await window._sb.rpc('delete_article_comment', { p_comment_id: btn.dataset.delCmt });
                        allComments = allComments.filter(function(c) { return c.id !== btn.dataset.delCmt; });
                        snd('tap');
                        _render();
                    });
                });

                container.querySelectorAll('[data-flag]').forEach(function(btn) {
                    btn.addEventListener('click', async function() {
                        var newFlag = btn.dataset.flagged === '0';
                        await window._sb.rpc('flag_article_comment', { p_comment_id: btn.dataset.flag, p_flagged: newFlag });
                        var c = allComments.find(function(x) { return x.id === btn.dataset.flag; });
                        if (c) c.flagged = newFlag;
                        flaggedCount = allComments.filter(function(x) { return x.flagged; }).length;
                        snd('tap');
                        _render();
                    });
                });

                var bulkBtn = document.getElementById('lbCmtBulkDel');
                if (bulkBtn) {
                    bulkBtn.addEventListener('click', async function() {
                        var checked = container.querySelectorAll('[data-cmt-sel]:checked');
                        if (!checked.length) return;
                        if (!confirm('Delete ' + checked.length + ' comment(s)?')) return;
                        var ids = Array.from(checked).map(function(cb) { return cb.dataset.cmtSel; });
                        for (var i = 0; i < ids.length; i++) {
                            await window._sb.rpc('delete_article_comment', { p_comment_id: ids[i] });
                        }
                        allComments = allComments.filter(function(c) { return ids.indexOf(c.id) === -1; });
                        snd('success');
                        _render();
                    });
                }

                container.querySelectorAll('[data-slug]').forEach(function(el) {
                    el.addEventListener('click', function() {
                        if (el.dataset.slug) {
                            B.closeAdmin();
                            B.navigateTo({ post: el.dataset.slug });
                        }
                    });
                });
            }
            _render();
        } catch (e) {
            container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div>Failed to load comments.</div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       SUBSCRIBERS MANAGEMENT TAB
       ═══════════════════════════════════════════════════ */
    var _subsCache = null;
    var _subsSortCol = 'created_at';
    var _subsSortAsc = false;

    async function _renderSubscribersAdmin() {
        var container = document.getElementById('lbSubscribersContent');
        if (!container || !window._sb) return;
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">📧</div>Loading subscribers...</div>';

        try {
            var [subsRes, logRes, domainsRes] = await Promise.all([
                window._sb.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
                window._sb.from('bulletin_log').select('*').order('sent_at', { ascending: false }).limit(10),
                window._sb.from('blocked_email_domains').select('*').order('domain', { ascending: true })
            ]);

            var subscribers = subsRes.data || [];
            var bulletins = logRes.data || [];
            var blockedDomains = domainsRes.data || [];
            _subsCache = subscribers;

            var confirmed = subscribers.filter(function(s) { return s.confirmed && !s.unsubscribed_at; });
            var pending = subscribers.filter(function(s) { return !s.confirmed && !s.unsubscribed_at; });
            var unsubscribed = subscribers.filter(function(s) { return !!s.unsubscribed_at; });

            function _renderSubsTable(search) {
                var filtered = subscribers;
                if (search) {
                    var q = search.toLowerCase();
                    filtered = subscribers.filter(function(s) {
                        return s.email.toLowerCase().includes(q) ||
                            (s.job_title || '').toLowerCase().includes(q) ||
                            (s.phone || '').toLowerCase().includes(q);
                    });
                }

                var sortKey = _subsSortCol;
                filtered.sort(function(a, b) {
                    var av = a[sortKey] || '';
                    var bv = b[sortKey] || '';
                    if (sortKey === 'created_at') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
                    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
                    return _subsSortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
                });

                if (!filtered.length) return '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:12px 0">No subscribers found.</div>';

                return '<table class="lb-perf-table"><thead><tr>' +
                    '<th><input type="checkbox" class="lb-sub-select-all"></th>' +
                    '<th data-sub-sort="email">Email</th>' +
                    '<th data-sub-sort="job_title">Job Title</th>' +
                    '<th>Phone</th>' +
                    '<th data-sub-sort="confirmed">Status</th>' +
                    '<th data-sub-sort="created_at">Joined</th>' +
                    '<th>Actions</th>' +
                    '</tr></thead><tbody>' +
                    filtered.map(function(s) {
                        var status, statusClass;
                        if (s.unsubscribed_at) { status = 'Unsubscribed'; statusClass = 'color:#ef4444'; }
                        else if (s.confirmed) { status = 'Confirmed'; statusClass = 'color:#22c55e'; }
                        else { status = 'Pending'; statusClass = 'color:#f59e0b'; }
                        return '<tr>' +
                            '<td><input type="checkbox" class="lb-sub-check" data-sub-id="' + s.id + '"></td>' +
                            '<td style="font-size:10px">' + esc(s.email) + '</td>' +
                            '<td style="font-size:10px;color:var(--sub)">' + esc(s.job_title || '—') + '</td>' +
                            '<td style="font-size:10px;color:var(--sub)">' + esc(s.phone || '—') + '</td>' +
                            '<td><span style="font-size:9px;font-weight:700;' + statusClass + '">' + status + '</span></td>' +
                            '<td style="font-size:9px;color:var(--sub)">' + (s.created_at ? fmtDate(s.created_at) : '—') + '</td>' +
                            '<td><button class="lb-cms-btn secondary" data-sub-delete="' + s.id + '" style="padding:2px 8px;font-size:8px">Delete</button></td>' +
                            '</tr>';
                    }).join('') +
                    '</tbody></table>';
            }

            function _renderBulletinLog() {
                if (!bulletins.length) return '<div style="font-size:10px;color:var(--sub);padding:8px">No bulletins sent yet.</div>';
                return bulletins.map(function(b) {
                    var statusIcon = b.status === 'sent' ? '✅' : b.status === 'pending' ? '⏳' : '❌';
                    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-family:\'JetBrains Mono\',monospace;font-size:10px">' +
                        '<span>' + statusIcon + '</span>' +
                        '<span style="color:var(--sub)">' + fmtDate(b.sent_at) + '</span>' +
                        '<span style="color:var(--text)">' + b.article_count + ' articles</span>' +
                        '<span style="color:var(--accent)">' + b.recipient_count + ' recipients</span>' +
                        (b.batch_remaining > 0 ? '<span style="color:#f59e0b">' + b.batch_remaining + ' remaining</span>' : '') +
                        '</div>';
                }).join('');
            }

            function _renderBlockedDomains() {
                if (!blockedDomains.length) return '<div style="font-size:10px;color:var(--sub);padding:8px">No blocked domains configured.</div>';
                return '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
                    blockedDomains.map(function(d) {
                        return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);border-radius:20px;font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#ef4444">' +
                            esc(d.domain) +
                            '<button data-domain-delete="' + d.id + '" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0 0 0 2px;line-height:1;opacity:.6">&times;</button>' +
                            '</span>';
                    }).join('') +
                    '</div>';
            }

            container.innerHTML =
                '<div class="lb-analytics-dash">' +
                '<div class="lb-analytics-kpis" style="margin-bottom:16px">' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + subscribers.length + '</div><div class="lb-kpi-label">Total</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:#22c55e">' + confirmed.length + '</div><div class="lb-kpi-label">Confirmed</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:#f59e0b">' + pending.length + '</div><div class="lb-kpi-label">Pending</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:#ef4444">' + unsubscribed.length + '</div><div class="lb-kpi-label">Unsubscribed</div></div>' +
                '</div>' +

                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1;margin-bottom:16px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
                        '<div class="lb-analytics-panel-title" style="margin:0">SUBSCRIBERS</div>' +
                        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                            '<input class="lb-drafts-search" id="lbSubSearch" placeholder="Search email, title, phone..." type="text" style="width:220px">' +
                            '<button class="lb-cms-btn secondary" id="lbSubExportCSV" style="padding:4px 12px;font-size:9px">Export CSV</button>' +
                            '<button class="lb-cms-btn secondary" id="lbSubBulkDelete" style="padding:4px 12px;font-size:9px;display:none">Delete Selected</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="lbSubTableWrap" style="overflow-x:auto">' + _renderSubsTable() + '</div>' +
                '</div>' +

                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">ADD SUBSCRIBER</div>' +
                        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">' +
                            '<input class="lb-cms-input" id="lbSubAddEmail" placeholder="email@company.com" style="font-size:10px">' +
                            '<div style="display:flex;gap:6px">' +
                                '<input class="lb-cms-input" id="lbSubAddJobTitle" placeholder="Job Title" style="flex:1;font-size:10px">' +
                                '<input class="lb-cms-input" id="lbSubAddPhone" placeholder="Phone (opt)" style="flex:1;font-size:10px">' +
                            '</div>' +
                            '<button class="lb-cms-btn primary" id="lbSubAddBtn" style="padding:6px 14px;font-size:9px;align-self:flex-start">Add</button>' +
                        '</div>' +
                        '<div id="lbSubAddStatus" style="font-family:\'JetBrains Mono\',monospace;font-size:9px;margin-top:6px;min-height:14px"></div>' +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">SEND BULLETIN</div>' +
                        '<p style="font-size:10px;color:var(--sub);margin:8px 0;font-family:\'JetBrains Mono\',monospace;line-height:1.5">Manually trigger the biweekly digest to all confirmed subscribers.</p>' +
                        '<button class="lb-cms-btn primary" id="lbSubSendBulletin" style="font-size:9px">Send Bulletin Now</button>' +
                        '<div id="lbBulletinStatus" style="font-family:\'JetBrains Mono\',monospace;font-size:9px;margin-top:6px;min-height:14px"></div>' +
                    '</div>' +
                '</div>' +

                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1;margin-top:16px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
                        '<div class="lb-analytics-panel-title" style="margin:0">BLOCKED DOMAINS <span style="font-weight:400;color:var(--sub)">(' + blockedDomains.length + ')</span></div>' +
                        '<div style="display:flex;gap:6px">' +
                            '<input class="lb-cms-input" id="lbDomainAddInput" placeholder="example.com" style="width:160px;font-size:10px">' +
                            '<button class="lb-cms-btn primary" id="lbDomainAddBtn" style="padding:4px 12px;font-size:9px">Block</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="lbBlockedDomainsWrap">' + _renderBlockedDomains() + '</div>' +
                '</div>' +

                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1;margin-top:16px">' +
                    '<div class="lb-analytics-panel-title">BULLETIN HISTORY</div>' +
                    _renderBulletinLog() +
                '</div>' +
                '</div>';

            // Search
            var searchInput = document.getElementById('lbSubSearch');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    var wrap = document.getElementById('lbSubTableWrap');
                    if (wrap) wrap.innerHTML = _renderSubsTable(searchInput.value.trim());
                    _bindSubTableEvents();
                });
            }

            // Export CSV
            var exportBtn = document.getElementById('lbSubExportCSV');
            if (exportBtn) {
                exportBtn.addEventListener('click', function() {
                    var rows = [['Email', 'Job Title', 'Phone', 'Status', 'Joined']];
                    subscribers.forEach(function(s) {
                        var status = s.unsubscribed_at ? 'Unsubscribed' : (s.confirmed ? 'Confirmed' : 'Pending');
                        rows.push([
                            '"' + s.email + '"',
                            '"' + (s.job_title || '') + '"',
                            '"' + (s.phone || '') + '"',
                            status,
                            s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : ''
                        ]);
                    });
                    var csv = rows.map(function(r) { return r.join(','); }).join('\n');
                    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'subscribers-' + new Date().toISOString().slice(0, 10) + '.csv';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    snd('success');
                    if (window.UniToast) window.UniToast('Subscribers exported!', '', '⬇', 'success');
                });
            }

            // Add subscriber
            var addBtn = document.getElementById('lbSubAddBtn');
            if (addBtn) {
                addBtn.addEventListener('click', async function() {
                    var emailInput = document.getElementById('lbSubAddEmail');
                    var jobTitleInput = document.getElementById('lbSubAddJobTitle');
                    var phoneInput = document.getElementById('lbSubAddPhone');
                    var statusEl = document.getElementById('lbSubAddStatus');
                    var email = (emailInput.value || '').trim().toLowerCase();
                    var jobTitle = (jobTitleInput.value || '').trim();
                    var phone = (phoneInput.value || '').trim();
                    if (!email || !email.includes('@')) { statusEl.textContent = 'Enter a valid email.'; statusEl.style.color = '#f59e0b'; return; }
                    addBtn.disabled = true;
                    statusEl.textContent = 'Adding...';
                    statusEl.style.color = 'var(--sub)';
                    try {
                        var insertData = { email: email, confirmed: true };
                        if (jobTitle) insertData.job_title = jobTitle;
                        if (phone) insertData.phone = phone;
                        await window._sb.from('newsletter_subscribers').insert(insertData);
                        snd('success');
                        statusEl.textContent = 'Added!';
                        statusEl.style.color = '#22c55e';
                        emailInput.value = '';
                        jobTitleInput.value = '';
                        phoneInput.value = '';
                        setTimeout(function() { _renderSubscribersAdmin(); }, 800);
                    } catch (e) {
                        statusEl.textContent = e.message || 'Failed to add.';
                        statusEl.style.color = '#ef4444';
                    }
                    addBtn.disabled = false;
                });
            }

            // Send bulletin
            var bulletinBtn = document.getElementById('lbSubSendBulletin');
            if (bulletinBtn) {
                bulletinBtn.addEventListener('click', async function() {
                    if (!confirm('Send biweekly bulletin to all ' + confirmed.length + ' confirmed subscribers?')) return;
                    var statusEl = document.getElementById('lbBulletinStatus');
                    bulletinBtn.disabled = true;
                    statusEl.textContent = 'Sending...';
                    statusEl.style.color = 'var(--sub)';
                    try {
                        var secret = prompt('Enter admin secret:');
                        if (!secret) { bulletinBtn.disabled = false; statusEl.textContent = ''; return; }
                        var res = await fetch('/api/newsletter-bulletin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }
                        });
                        var data = await res.json();
                        if (data.error) throw new Error(data.error);
                        if (data.skipped) {
                            statusEl.textContent = 'Skipped: ' + data.reason;
                            statusEl.style.color = '#f59e0b';
                        } else {
                            statusEl.textContent = 'Sent ' + data.sent + '/' + data.totalSubscribers + ' emails (' + data.articles + ' articles)';
                            statusEl.style.color = '#22c55e';
                            snd('success');
                            if (window.UniToast) window.UniToast('Bulletin sent!', data.sent + ' emails delivered', '📧', 'success');
                        }
                    } catch (e) {
                        statusEl.textContent = e.message || 'Failed to send.';
                        statusEl.style.color = '#ef4444';
                        if (window.UniToast) window.UniToast('Bulletin failed.', '', '⚠️', 'warn');
                    }
                    bulletinBtn.disabled = false;
                });
            }

            // Blocked domains: add
            var domainAddBtn = document.getElementById('lbDomainAddBtn');
            if (domainAddBtn) {
                domainAddBtn.addEventListener('click', async function() {
                    var input = document.getElementById('lbDomainAddInput');
                    var domain = (input.value || '').trim().toLowerCase().replace(/^@/, '');
                    if (!domain || !domain.includes('.')) {
                        if (window.UniToast) window.UniToast('Enter a valid domain.', '', '⚠️', 'warn');
                        return;
                    }
                    domainAddBtn.disabled = true;
                    try {
                        await window._sb.from('blocked_email_domains').insert({ domain: domain });
                        snd('success');
                        input.value = '';
                        if (window.UniToast) window.UniToast('Domain blocked!', domain, '🚫', 'success');
                        _renderSubscribersAdmin();
                    } catch (e) {
                        if (window.UniToast) window.UniToast('Failed to block domain.', e.message || '', '⚠️', 'warn');
                    }
                    domainAddBtn.disabled = false;
                });
            }

            // Blocked domains: delete
            _bindDomainDeleteEvents();
            function _bindDomainDeleteEvents() {
                var wrap = document.getElementById('lbBlockedDomainsWrap');
                if (!wrap) return;
                wrap.querySelectorAll('[data-domain-delete]').forEach(function(btn) {
                    btn.addEventListener('click', async function() {
                        try {
                            await window._sb.from('blocked_email_domains').delete().eq('id', btn.dataset.domainDelete);
                            snd('success');
                            _renderSubscribersAdmin();
                        } catch (e) {
                            if (window.UniToast) window.UniToast('Failed to unblock.', '', '⚠️', 'warn');
                        }
                    });
                });
            }

            _bindSubTableEvents();

            function _bindSubTableEvents() {
                var wrap = document.getElementById('lbSubTableWrap');
                if (!wrap) return;
                var bulkBtn = document.getElementById('lbSubBulkDelete');

                var selectAll = wrap.querySelector('.lb-sub-select-all');
                if (selectAll) {
                    selectAll.addEventListener('change', function() {
                        wrap.querySelectorAll('.lb-sub-check').forEach(function(cb) { cb.checked = selectAll.checked; });
                        if (bulkBtn) bulkBtn.style.display = selectAll.checked ? '' : 'none';
                    });
                }

                wrap.querySelectorAll('.lb-sub-check').forEach(function(cb) {
                    cb.addEventListener('change', function() {
                        var anyChecked = wrap.querySelector('.lb-sub-check:checked');
                        if (bulkBtn) bulkBtn.style.display = anyChecked ? '' : 'none';
                    });
                });

                wrap.querySelectorAll('[data-sub-delete]').forEach(function(btn) {
                    btn.addEventListener('click', async function() {
                        if (!confirm('Delete this subscriber?')) return;
                        try {
                            await window._sb.from('newsletter_subscribers').delete().eq('id', btn.dataset.subDelete);
                            snd('success');
                            _renderSubscribersAdmin();
                        } catch (e) {
                            if (window.UniToast) window.UniToast('Failed to delete.', '', '⚠️', 'warn');
                        }
                    });
                });

                if (bulkBtn) {
                    bulkBtn.onclick = async function() {
                        var ids = [];
                        wrap.querySelectorAll('.lb-sub-check:checked').forEach(function(cb) { ids.push(cb.dataset.subId); });
                        if (!ids.length) return;
                        if (!confirm('Delete ' + ids.length + ' subscriber(s)?')) return;
                        try {
                            for (var i = 0; i < ids.length; i++) {
                                await window._sb.from('newsletter_subscribers').delete().eq('id', ids[i]);
                            }
                            snd('success');
                            if (window.UniToast) window.UniToast(ids.length + ' subscriber(s) deleted.', '', '🗑️', 'success');
                            _renderSubscribersAdmin();
                        } catch (e) {
                            if (window.UniToast) window.UniToast('Failed to delete.', '', '⚠️', 'warn');
                        }
                    };
                }

                wrap.querySelectorAll('[data-sub-sort]').forEach(function(th) {
                    th.style.cursor = 'pointer';
                    th.addEventListener('click', function() {
                        var col = th.dataset.subSort;
                        if (_subsSortCol === col) _subsSortAsc = !_subsSortAsc;
                        else { _subsSortCol = col; _subsSortAsc = false; }
                        wrap.innerHTML = _renderSubsTable(searchInput ? searchInput.value.trim() : '');
                        _bindSubTableEvents();
                    });
                });
            }

        } catch (e) {
            console.error('[blog] Subscribers admin error:', e);
            container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div>Failed to load subscribers.</div>';
        }
    }

    // Register on shared namespace
    B.isAdmin = isAdmin;
    B.openAdmin = openAdmin;
    B.closeAdmin = closeAdmin;
    B.renderCMS = renderCMS;
    B.saveArticle = saveArticle;
    B.deleteArticle = deleteArticle;
    B.showVersionHistory = showVersionHistory;
    B.shareForReview = shareForReview;
})();
