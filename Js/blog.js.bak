// blog.js — Longform Blog SPA Module ("Cyber-Editorial")
// Dedicated routable publishing platform with ?blog=feed / ?post=slug routing,
// marked.js rendering, native <dialog> CMS, and Supabase Auth + RLS.

(function LongformBlogEngine() {
    'use strict';

    /* ═══════════════════════════════════════════════════
       CONSTANTS & CONFIG
       ═══════════════════════════════════════════════════ */
    const PAGE_SIZE = 12;
    const MAX_EXCERPT = 200;
    const ADMIN_SHORTCUT = { ctrl: true, shift: true, key: 'P' };
    let _routeGen = 0;
    const _viewedSlugs = new Set();
    let _allFeedArticles = [];

    /* ── CodeMirror 6 state ── */
    var _cmView = null;
    var _cmModules = null;
    var _cmThemeCompartment = null;
    var _cmLoading = false;
    var _cmLoadFailed = false;

    async function _loadCM6() {
        if (_cmModules) return _cmModules;
        if (_cmLoadFailed) return null;
        if (_cmLoading) {
            return new Promise(function(resolve) {
                var iv = setInterval(function() {
                    if (_cmModules || _cmLoadFailed) { clearInterval(iv); resolve(_cmModules); }
                }, 100);
            });
        }
        _cmLoading = true;
        try {
            var results = await Promise.all([
                import('https://esm.sh/codemirror@6.0.1'),
                import('https://esm.sh/@codemirror/lang-markdown@6.3.1'),
                import('https://esm.sh/@codemirror/lang-javascript@6.2.3'),
                import('https://esm.sh/@codemirror/lang-html@6.4.9'),
                import('https://esm.sh/@codemirror/lang-css@6.3.1'),
                import('https://esm.sh/@codemirror/lang-python@6.1.6'),
                import('https://esm.sh/@codemirror/theme-one-dark@6.1.2'),
                import('https://esm.sh/@codemirror/state@6.5.4'),
                import('https://esm.sh/@codemirror/view@6.36.2'),
                import('https://esm.sh/@codemirror/commands@6.8.0')
            ]);
            var core = results[0];
            var stateM = results[7];
            var viewM = results[8];
            var cmdsM = results[9];
            _cmModules = {
                basicSetup: core.basicSetup,
                EditorView: viewM.EditorView || core.EditorView,
                EditorState: stateM.EditorState || core.EditorState,
                keymap: viewM.keymap,
                placeholder: viewM.placeholder,
                Compartment: stateM.Compartment,
                indentWithTab: cmdsM.indentWithTab,
                markdown: results[1].markdown,
                javascript: results[2].javascript,
                html: results[3].html,
                css: results[4].css,
                python: results[5].python,
                oneDark: results[6].oneDark
            };
            _cmLoading = false;
            return _cmModules;
        } catch (e) {
            _cmLoadFailed = true;
            _cmLoading = false;
            console.warn('[blog] CodeMirror 6 load failed, using textarea fallback:', e);
            return null;
        }
    }

    async function _initCM6(container, initialValue, onUpdate) {
        var cm = await _loadCM6();
        if (!cm) return null;

        if (_cmView) { _cmView.destroy(); _cmView = null; }
        _cmThemeCompartment = new cm.Compartment();
        var isLight = document.body.classList.contains('light-mode');

        var customKeys = cm.keymap.of([
            { key: 'Mod-b', run: function() { insertFormat('bold'); return true; } },
            { key: 'Mod-i', run: function() { insertFormat('italic'); return true; } },
            { key: 'Mod-k', run: function() { insertFormat('link'); return true; } },
            { key: 'Mod-`', run: function() { insertFormat('code'); return true; } },
            { key: 'Mod-s', run: function() { if (typeof _cmSaveHandler === 'function') _cmSaveHandler(); return true; } },
            cm.indentWithTab
        ]);

        var lightTheme = cm.EditorView.theme({
            '&': { backgroundColor: '#fff', color: '#1e293b' },
            '.cm-content': { caretColor: '#0066ff' },
            '.cm-cursor': { borderLeftColor: '#0066ff' },
            '.cm-activeLine': { backgroundColor: 'rgba(0,102,255,.04)' },
            '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #d1d5db', color: '#94a3b8' },
            '.cm-activeLineGutter': { backgroundColor: 'rgba(0,102,255,.06)' },
            '.cm-selectionBackground': { backgroundColor: 'rgba(0,102,255,.12) !important' }
        }, { dark: false });

        var jsLang = cm.javascript({ jsx: true }).language;
        var htmlLang = cm.html().language;
        var cssLang = cm.css().language;
        var pyLang = cm.python().language;

        var extensions = [
            cm.basicSetup,
            cm.markdown({
                codeLanguages: function(info) {
                    var name = (info || '').toLowerCase().split(/\s/)[0];
                    if (/^(javascript|js|jsx|ts|tsx|typescript)$/.test(name)) return jsLang;
                    if (/^(html|xml|svg)$/.test(name)) return htmlLang;
                    if (/^(css|scss|less|sass)$/.test(name)) return cssLang;
                    if (/^(python|py)$/.test(name)) return pyLang;
                    return null;
                }
            }),
            _cmThemeCompartment.of(isLight ? lightTheme : cm.oneDark),
            cm.EditorView.lineWrapping,
            cm.placeholder('Write your article in Markdown...'),
            customKeys,
            cm.EditorView.updateListener.of(function(update) {
                if (update.docChanged && onUpdate) onUpdate();
            })
        ];

        _cmView = new cm.EditorView({
            state: cm.EditorState.create({ doc: initialValue || '', extensions: extensions }),
            parent: container
        });

        return _cmView;
    }

    function _destroyCM6() {
        if (_cmView) {
            if (_cmView._themeObserver) { _cmView._themeObserver.disconnect(); _cmView._themeObserver = null; }
            _cmView.destroy();
            _cmView = null;
        }
        _cmThemeCompartment = null;
    }

    function _switchCM6Theme() {
        if (!_cmView || !_cmThemeCompartment || !_cmModules) return;
        var isLight = document.body.classList.contains('light-mode');
        var lightTheme = _cmModules.EditorView.theme({
            '&': { backgroundColor: '#fff', color: '#1e293b' },
            '.cm-content': { caretColor: '#0066ff' },
            '.cm-cursor': { borderLeftColor: '#0066ff' },
            '.cm-activeLine': { backgroundColor: 'rgba(0,102,255,.04)' },
            '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #d1d5db', color: '#94a3b8' },
            '.cm-activeLineGutter': { backgroundColor: 'rgba(0,102,255,.06)' },
            '.cm-selectionBackground': { backgroundColor: 'rgba(0,102,255,.12) !important' }
        }, { dark: false });
        _cmView.dispatch({ effects: _cmThemeCompartment.reconfigure(isLight ? lightTheme : _cmModules.oneDark) });
    }

    var _cmSaveHandler = null;

    /* ═══════════════════════════════════════════════════
       CSS — Cyber-Editorial Design Language
       ═══════════════════════════════════════════════════ */
    const css = document.createElement('style');
    css.id = 'longform-blog-css';
    css.textContent = `
/* ── Blog View Container ── */
#blogView{display:none;min-height:100vh;background:transparent;padding:40px 16px;position:relative;z-index:2}
#blogView.active{display:block}
#blogView.active~#app{display:none!important}
.lb-wrap{max-width:860px;margin:0 auto;padding:0 32px 60px;background:rgba(6,8,15,.55);backdrop-filter:blur(20px) saturate(1.1);-webkit-backdrop-filter:blur(20px) saturate(1.1);border:1px solid rgba(255,255,255,.06);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)}
.light-mode .lb-wrap{background:rgba(255,255,255,.92);border-color:rgba(0,0,0,.06);box-shadow:0 4px 32px rgba(0,30,80,.07),0 1px 2px rgba(0,0,0,.04);backdrop-filter:blur(20px) saturate(1.1);-webkit-backdrop-filter:blur(20px) saturate(1.1)}

/* ── Collapsible Sidebar ── */
.lb-sidebar{position:fixed;top:0;left:0;width:220px;height:100vh;height:100dvh;background:rgba(6,8,15,.7);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border-right:1px solid rgba(255,255,255,.08);z-index:10000;transform:translateX(-100%);transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;overflow-y:auto;box-shadow:4px 0 32px rgba(0,0,0,.3)}
.lb-sidebar.open{transform:translateX(0)}
.lb-sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.06)}
.lb-sidebar-brand{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent)}
.lb-sidebar-close{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:var(--sub);width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;transition:all .25s}
.lb-sidebar-close:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06)}
.lb-sidebar-nav{list-style:none;margin:0;padding:6px 0}
.lb-sidebar-item{margin:0}
.lb-sidebar-link{display:flex;align-items:center;gap:8px;padding:7px 14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-decoration:none;letter-spacing:.3px;transition:all .15s;cursor:pointer;border:none;background:none;width:100%;text-align:left}
.lb-sidebar-link:hover{color:var(--accent);background:rgba(0,225,255,.06)}
.lb-sidebar-link.active{color:var(--accent);border-left:2px solid var(--accent);background:rgba(0,225,255,.05)}
.lb-sidebar-link i{width:14px;text-align:center;font-size:10px}
.lb-sidebar-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);margin:4px 14px}
.lb-sidebar-section{padding:8px 14px 2px;font-family:'JetBrains Mono',monospace;font-size:7px;color:var(--sub);opacity:.5;text-transform:uppercase;letter-spacing:1.2px}
.lb-sidebar-weather{padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text);display:flex;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
.light-mode .lb-sidebar-weather{background:rgba(0,0,0,.02);border-bottom-color:rgba(0,0,0,.04)}
.lb-sidebar-toggle{position:fixed;top:52px;left:calc(50% - 430px - 52px);z-index:10001;background:rgba(6,8,15,.5);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:var(--sub);width:36px;height:36px;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:13px;transition:all .25s;box-shadow:0 4px 16px rgba(0,0,0,.2)}
.lb-sidebar-toggle.blog-active{display:flex}
.lb-sidebar-toggle:hover{border-color:var(--accent);color:var(--accent);box-shadow:0 4px 16px rgba(0,225,255,.12)}
.lb-sidebar-toggle.shifted{opacity:0;pointer-events:none}
.lb-sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;opacity:0;pointer-events:none;transition:opacity .3s}
.lb-sidebar-overlay.show{opacity:1;pointer-events:auto}

/* Light-mode sidebar */
.light-mode .lb-sidebar{background:linear-gradient(180deg,rgba(250,252,255,.95),rgba(245,248,255,.92));border-right-color:rgba(0,0,0,.06);box-shadow:4px 4px 32px rgba(0,0,0,.08)}
.light-mode .lb-sidebar-close{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08);color:#64748b;border-radius:8px}
.light-mode .lb-sidebar-close:hover{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .lb-sidebar-link{color:#475569}
.light-mode .lb-sidebar-link:hover{color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .lb-sidebar-link.active{color:#0066ff;border-left-color:#0066ff;background:rgba(0,102,255,.05);box-shadow:inset 0 0 12px rgba(0,102,255,.03)}
.light-mode .lb-sidebar-toggle{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.08);color:#64748b;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.light-mode .lb-sidebar-toggle:hover{border-color:#0066ff;color:#0066ff;box-shadow:0 2px 8px rgba(0,102,255,.1)}

/* ── Navigation Bar ── */
.lb-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;margin:0;border-bottom:none;position:sticky;top:0;z-index:50;background:rgba(6,8,15,.55);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.lb-nav-brand{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);cursor:pointer;text-decoration:none;transition:opacity .2s}
.lb-nav-brand:hover{opacity:.7}
.lb-nav-sep{display:none}
.lb-nav-back{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--sub);cursor:pointer;background:none;border:none;padding:4px 0;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;letter-spacing:.5px}
.lb-nav-back:hover{color:var(--accent)}
.light-mode .lb-nav{background:rgba(255,255,255,.92);border-bottom:none}
.light-mode .lb-nav-back{color:#475569}
.light-mode .lb-nav-back:hover{color:#0066ff}

/* ── Feed Header ── */
.lb-feed-header{margin-bottom:28px;padding:28px 0 24px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.06)}
.lb-feed-title{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;text-transform:uppercase;letter-spacing:-0.5px;color:var(--text);line-height:1.1;margin-bottom:8px}
.lb-feed-sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub);letter-spacing:.5px}
.lb-feed-line{width:48px;height:2px;background:var(--accent);margin-top:14px;border-radius:1px;box-shadow:0 0 8px var(--accent)}
.light-mode .lb-feed-header{border-bottom-color:rgba(0,0,0,.06)}

/* ── Article Grid ── */
.lb-grid{display:grid;grid-template-columns:1fr;gap:12px}
.lb-card{padding:24px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);position:relative;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.lb-card:hover{background:rgba(0,225,255,.04);border-color:rgba(0,225,255,.15);box-shadow:0 4px 24px rgba(0,225,255,.06),inset 0 1px 0 rgba(255,255,255,.05);transform:translateY(-2px)}
.lb-card-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:12px}
.lb-card-date::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06)}
.lb-card-title{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:8px;letter-spacing:-0.3px}
.lb-card-excerpt{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:var(--sub);margin-bottom:12px}
.lb-card-meta{display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub)}
.lb-card-tag{padding:2px 8px;border:1px solid rgba(255,255,255,.1);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;background:rgba(255,255,255,.04)}
.lb-card-views{opacity:.6}
.light-mode .lb-card{background:rgba(0,0,0,.015);border-color:rgba(0,0,0,.06);box-shadow:none}
.light-mode .lb-card:hover{background:rgba(0,0,0,.025);border-color:rgba(0,102,255,.15);box-shadow:0 4px 16px rgba(0,30,100,.06);transform:translateY(-1px)}
.light-mode .lb-card-date::after{background:rgba(0,0,0,.06)}
.light-mode .lb-card-tag{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}

/* ── Article Reader ── */
.lb-article{max-width:800px;margin:0 auto}
.lb-article-header{margin-bottom:32px;padding:28px 0 24px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.06)}
.light-mode .lb-article-header{border-bottom-color:rgba(0,0,0,.06)}
.lb-article-date{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}
.lb-article-h1{font-family:'Inter',sans-serif;font-size:36px;font-weight:800;text-transform:uppercase;letter-spacing:-0.5px;color:var(--text);line-height:1.15;margin-bottom:16px}
.lb-article-excerpt{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:18px;line-height:1.6;color:var(--sub);margin-bottom:20px;font-style:italic}
.lb-article-meta{display:flex;align-items:center;gap:20px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub)}
.lb-article-tags{display:flex;gap:6px;flex-wrap:wrap}

/* ── Article Content (Markdown rendered) ── */
.lb-content{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:17px;line-height:1.85;color:var(--text);word-break:break-word}
.lb-content h2{font-family:'Inter',sans-serif;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:-0.3px;color:var(--text);margin:48px 0 16px;padding-top:32px;border-top:1px solid var(--border)}
.lb-content h3{font-family:'Inter',sans-serif;font-size:20px;font-weight:700;color:var(--text);margin:36px 0 12px}
.lb-content h4{font-family:'Inter',sans-serif;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--accent);margin:28px 0 10px}
.lb-content p{margin:0 0 24px}
.lb-content a{color:var(--accent);text-decoration:underline;text-underline-offset:3px;transition:opacity .2s}
.lb-content a:hover{opacity:.7}
.lb-content strong{font-weight:700;color:var(--text)}
.lb-content em{font-style:italic}
.lb-content ul,.lb-content ol{margin:0 0 24px;padding-left:24px}
.lb-content li{margin-bottom:8px}
.lb-content blockquote{margin:32px 0;padding:20px 24px;border-left:3px solid var(--accent);background:rgba(0,225,255,.03);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:0 10px 10px 0;font-style:italic;color:var(--sub);position:relative;border:1px solid rgba(255,255,255,.05);border-left:3px solid var(--accent)}
.lb-content blockquote p:last-child{margin-bottom:0}
.lb-content code{background:rgba(0,225,255,.08);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent)}
.lb-content pre{background:rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:20px 24px;margin:32px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;color:#a5f3fc;position:relative;box-shadow:0 4px 16px rgba(0,0,0,.2)}
.lb-content pre code{background:none;padding:0;color:inherit;font-size:inherit}
.lb-content img{max-width:100%;height:auto;margin:32px 0;border:1px solid rgba(255,255,255,.06);border-radius:8px}
.lb-content hr{border:none;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);margin:48px 0}
.lb-content table{width:100%;border-collapse:collapse;margin:24px 0;font-size:15px}
.lb-content th,.lb-content td{padding:10px 14px;border:1px solid var(--border);text-align:left}
.lb-content th{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.5px;background:rgba(0,225,255,.03);font-weight:700}

/* ── Article Footer ── */
.lb-article-footer{margin-top:64px;padding:24px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.lb-share-btn{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 16px;transition:all .25s;display:inline-flex;align-items:center;gap:6px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.lb-share-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06);box-shadow:0 0 12px rgba(0,225,255,.08)}

/* ── Skeleton Loading ── */
.lb-skeleton{padding:24px;border:1px solid rgba(255,255,255,.05);border-radius:12px;background:rgba(255,255,255,.02);margin-bottom:12px}
.lb-skel-line{height:12px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:lbSkelShim 1.5s infinite;margin-bottom:10px}
.lb-skel-line.w40{width:40%}
.lb-skel-line.w80{width:80%}
.lb-skel-line.w60{width:60%}
.lb-skel-line.h24{height:24px}
@keyframes lbSkelShim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Empty State ── */
.lb-empty{text-align:center;padding:80px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--sub);background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px}
.lb-empty-icon{font-size:48px;margin-bottom:16px;opacity:.3}

/* ── 404 State ── */
.lb-404{text-align:center;padding:80px 20px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px}
.lb-404-code{font-family:'JetBrains Mono',monospace;font-size:72px;font-weight:700;color:var(--accent);opacity:.3;line-height:1}
.lb-404-msg{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--sub);margin-top:12px}

/* ── Admin Dialog ── */
#blogAdmin[open]{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;max-width:100vw!important;max-height:none!important;margin:0!important;padding:0!important;border:none!important;border-radius:0!important;background:#060810;z-index:100010;overflow-y:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box!important;display:block!important}
#blogAdmin::backdrop{background:transparent}
.lb-admin-panel{max-width:960px;margin:40px auto;padding:32px;background:var(--bg);border:1px solid var(--accent);width:100%;box-sizing:border-box}
.lb-admin-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.lb-admin-title{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent)}
.lb-admin-close{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:6px 12px;transition:all .2s}
.lb-admin-close:hover{border-color:var(--accent);color:var(--accent)}

/* ── Auth Form ── */
.lb-auth-form{max-width:360px;margin:80px auto;text-align:center}
.lb-auth-title{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
.lb-auth-sub{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);margin-bottom:24px}
.lb-auth-input{width:100%;background:rgba(0,0,0,.3);border:1px solid var(--border);padding:12px 16px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;margin-bottom:10px;transition:border-color .2s}
.lb-auth-input:focus{border-color:var(--accent)}
.lb-auth-input::placeholder{color:var(--sub);opacity:.5}
.lb-auth-submit{width:100%;background:var(--accent);color:var(--bg);border:none;padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:opacity .2s;margin-top:6px}
.lb-auth-submit:hover{opacity:.85}
.lb-auth-submit:disabled{opacity:.4;cursor:not-allowed}
.lb-auth-error{font-family:'JetBrains Mono',monospace;font-size:10px;color:#ef4444;margin-top:10px}

/* ── CMS Editor ── */
.lb-cms{display:grid;grid-template-columns:1fr;gap:16px}
.lb-cms-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lb-cms-row.full{grid-template-columns:1fr}
.lb-cms-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block}
.lb-cms-input{width:100%;background:rgba(0,0,0,.2);border:1px solid var(--border);padding:10px 14px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;transition:border-color .2s}
.lb-cms-input:focus{border-color:var(--accent)}
.lb-cms-input::placeholder{color:var(--sub);opacity:.4}
.lb-cms-split{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border);min-height:400px;margin-top:8px}
.lb-cms-textarea{width:100%;height:100%;min-height:400px;background:rgba(0,0,0,.3);border:none;border-right:1px solid var(--border);padding:20px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;outline:none;resize:none;box-sizing:border-box}
.lb-cms-preview{padding:20px;overflow-y:auto;background:rgba(0,0,0,.15)}
.lb-cms-preview .lb-content{font-size:15px}
.lb-cms-actions{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.lb-cms-btn{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:10px 24px;cursor:pointer;transition:all .2s;border:none}
.lb-cms-btn.primary{background:var(--accent);color:var(--bg)}
.lb-cms-btn.primary:hover{opacity:.85}
.lb-cms-btn.secondary{background:none;border:1px solid var(--border);color:var(--sub)}
.lb-cms-btn.secondary:hover{border-color:var(--accent);color:var(--accent)}
.lb-cms-btn.danger{background:none;border:1px solid #ef4444;color:#ef4444}
.lb-cms-btn.danger:hover{background:rgba(239,68,68,.1)}
.lb-cms-btn:disabled{opacity:.4;cursor:not-allowed}
.lb-cms-btn-group{display:flex;gap:8px}
.lb-cms-status{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub)}

/* ── Formatting Toolbar ── */
.lb-toolbar{display:flex;flex-wrap:wrap;gap:2px;padding:6px 8px;background:rgba(0,0,0,.25);border:1px solid var(--border);border-bottom:none;margin-top:8px}
.lb-toolbar-group{display:flex;gap:2px;align-items:center}
.lb-toolbar-group+.lb-toolbar-group{margin-left:4px;padding-left:6px;border-left:1px solid var(--border)}
.lb-tool-btn{background:none;border:1px solid transparent;color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:11px;padding:4px 7px;cursor:pointer;transition:all .15s;line-height:1;border-radius:2px;min-width:26px;text-align:center}
.lb-tool-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.05)}
.lb-tool-btn:active{background:rgba(0,225,255,.12)}
.lb-tool-btn[title]::after{content:attr(data-shortcut);display:none}
.lb-tool-sep{width:1px;height:18px;background:var(--border);margin:0 2px}
.lb-preview-toggle-wrap{display:none}
@media(max-width:768px){.lb-preview-toggle-wrap{display:flex}}
.lb-cms-preview.mobile-show{display:block!important;border:1px solid var(--border);border-radius:4px;margin-top:8px;max-height:300px}

/* ── Article List in Admin ── */
.lb-cms-articles{margin-top:24px;border-top:1px solid var(--border);padding-top:24px}
.lb-cms-articles-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:12px}
.lb-cms-article-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:11px}
.lb-cms-article-row:hover{background:rgba(0,225,255,.02)}
.lb-cms-article-title{color:var(--text);cursor:pointer;flex:1}
.lb-cms-article-title:hover{color:var(--accent)}
.lb-cms-article-status{font-size:8px;padding:2px 8px;text-transform:uppercase;letter-spacing:.5px}
.lb-cms-article-status.published{color:#22c55e;border:1px solid rgba(34,197,94,.3)}
.lb-cms-article-status.draft{color:#f59e0b;border:1px solid rgba(245,158,11,.3)}
.lb-cms-article-actions{display:flex;gap:6px;margin-left:12px}

/* ── Halftone Accent ── */
.lb-content blockquote::before{content:'';position:absolute;top:0;left:-3px;width:3px;height:100%;background:var(--accent)}

/* ── Callout Boxes ── */
.lb-content .callout{margin:24px 0;padding:16px 20px;border-left:3px solid var(--sub);background:rgba(255,255,255,.02);font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6}
.lb-content .callout-note{border-left-color:#3b82f6;background:rgba(59,130,246,.04)}
.lb-content .callout-tip{border-left-color:#22c55e;background:rgba(34,197,94,.04)}
.lb-content .callout-warning{border-left-color:#f59e0b;background:rgba(245,158,11,.04)}
.lb-content .callout-danger{border-left-color:#ef4444;background:rgba(239,68,68,.04)}
.lb-content .callout-title{font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:10px;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.lb-content .callout-note .callout-title{color:#3b82f6}
.lb-content .callout-tip .callout-title{color:#22c55e}
.lb-content .callout-warning .callout-title{color:#f59e0b}
.lb-content .callout-danger .callout-title{color:#ef4444}

/* ── Details / Collapsible ── */
.lb-content details{margin:24px 0;border:1px solid var(--border);padding:0}
.lb-content details summary{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;padding:12px 16px;cursor:pointer;color:var(--text);background:rgba(0,225,255,.02);user-select:none;list-style:none}
.lb-content details summary::before{content:'▸ ';color:var(--accent);font-size:14px}
.lb-content details[open] summary::before{content:'▾ '}
.lb-content details > :not(summary){padding:0 16px 16px}

/* ── Footnote Markers ── */
.lb-content sup a{color:var(--accent);font-weight:700;text-decoration:none;font-size:11px}

/* ── Keyboard Shortcut Key ── */
.lb-content kbd{display:inline-block;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:3px;box-shadow:0 1px 0 var(--border)}

/* ── Definition List ── */
.lb-content dl{margin:24px 0}
.lb-content dt{font-weight:700;color:var(--text);margin-top:12px}
.lb-content dd{margin-left:24px;color:var(--sub)}

/* ── Image Captions ── */
.lb-content figure{margin:32px 0;text-align:center}
.lb-content figure img{margin:0 auto;display:block}
.lb-content figcaption{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--sub);margin-top:8px;letter-spacing:.3px}

/* ── CMS Admin Tabs ── */
.lb-cms-tabs{display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid var(--border);
  overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.lb-cms-tabs::-webkit-scrollbar{display:none}
.lb-cms-tab{flex:0 0 auto;padding:12px 14px;background:none;border:none;border-bottom:2px solid transparent;
  font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;
  text-transform:uppercase;color:var(--sub);cursor:pointer;transition:all .2s;white-space:nowrap}
.lb-cms-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.lb-cms-tab:hover{color:var(--text)}
.lb-cms-tab-content{display:none}
.lb-cms-tab-content.active{display:block}
.lb-cms-article-status.scheduled{color:#a855f7;border-color:rgba(168,85,247,.3)}

/* ── Article Sub-tabs ── */
.lb-sub-tabs{display:flex;gap:0;margin-top:24px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);
  overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.lb-sub-tabs::-webkit-scrollbar{display:none}
.lb-sub-tab{flex:1;padding:10px 12px;background:none;border:none;border-bottom:2px solid transparent;
  font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.8px;
  text-transform:uppercase;color:var(--sub);cursor:pointer;transition:all .2s;white-space:nowrap}
.lb-sub-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.lb-sub-tab:hover{color:var(--text)}
.lb-sub-content{display:none;padding-top:16px}
.lb-sub-content.active{display:block}
.light-mode .lb-sub-tabs{border-color:#d1d5db}
.light-mode .lb-sub-tab{color:#6b7280}
.light-mode .lb-sub-tab.active{color:#0066ff;border-bottom-color:#0066ff}
.light-mode .lb-sub-tab:hover{color:#1e293b}

/* ── Local Drafts Tab ── */
.lb-drafts-header{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.lb-drafts-search{flex:1;background:rgba(0,0,0,.2);border:1px solid var(--border);padding:8px 12px;
  color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box}
.lb-drafts-search:focus{border-color:var(--accent)}
.lb-drafts-search::placeholder{color:var(--sub);opacity:.4}
.lb-drafts-count{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);white-space:nowrap}
.lb-drafts-list{max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.lb-draft-row{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);
  cursor:pointer;transition:all .2s;font-family:'JetBrains Mono',monospace}
.lb-draft-row:hover{border-color:var(--accent);background:rgba(0,225,255,.03)}
.lb-draft-row.active{border-color:var(--accent);background:rgba(0,225,255,.06)}
.lb-draft-info{flex:1;min-width:0;overflow:hidden}
.lb-draft-title{font-size:12px;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-draft-meta{font-size:8px;color:var(--sub);margin-top:2px;letter-spacing:.3px;display:flex;gap:8px}
.lb-draft-actions{display:flex;gap:4px;flex-shrink:0}
.lb-draft-btn{background:none;border:1px solid var(--border);color:var(--sub);padding:3px 8px;
  font-family:'JetBrains Mono',monospace;font-size:8px;cursor:pointer;transition:all .15s;text-transform:uppercase}
.lb-draft-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-draft-btn.del:hover{border-color:#ef4444;color:#ef4444}
.lb-drafts-empty{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--sub);
  text-align:center;padding:32px 0}
.light-mode .lb-drafts-search{background:rgba(0,0,0,.03)}
.light-mode .lb-draft-row{border-color:#d1d5db}
.light-mode .lb-draft-row:hover{border-color:#0066ff;background:rgba(0,102,255,.03)}
.light-mode .lb-draft-row.active{border-color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .lb-draft-btn{border-color:#d1d5db;color:#6b7280}
.light-mode .lb-draft-btn:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-draft-btn.del:hover{border-color:#ef4444;color:#ef4444}

/* ── Quick Post Form ── */
.lb-quick-post{display:flex;flex-direction:column;gap:12px}
.lb-quick-textarea{width:100%;min-height:120px;padding:12px;background:rgba(0,225,255,.03);border:1px solid var(--border);
  color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;resize:vertical;
  transition:border-color .2s;box-sizing:border-box}
.lb-quick-textarea:focus{outline:none;border-color:var(--accent)}
.lb-quick-char{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-align:right}
.lb-quick-char.warn{color:#f59e0b}
.lb-quick-char.over{color:#ef4444}
.lb-quick-img-preview{max-width:200px;max-height:120px;border:1px solid var(--border);display:none;margin-top:4px}
.lb-quick-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lb-schedule-row{display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap}
.lb-schedule-input{background:rgba(0,225,255,.03);border:1px solid var(--border);color:var(--text);box-sizing:border-box;
  font-family:'JetBrains Mono',monospace;font-size:11px;padding:6px 10px}
.lb-schedule-input:focus{outline:none;border-color:var(--accent)}
.lb-li-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
.lb-li-toggle input[type="checkbox"]{accent-color:#0a66c2;width:14px;height:14px;cursor:pointer}
.lb-li-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#0a66c2;letter-spacing:.3px;display:inline-flex;align-items:center;gap:4px}
.lb-li-label i{font-size:12px}

/* ── Light Mode ── */
.light-mode #blogView{background:transparent}
.light-mode .lb-content pre{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.06);color:#1e293b;box-shadow:0 4px 16px rgba(0,0,0,.04)}
.light-mode .lb-content code{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .lb-content blockquote{background:rgba(0,102,255,.03);border-color:rgba(0,0,0,.04);border-left:3px solid #0066ff}
.light-mode .lb-content img{border-color:rgba(0,0,0,.06)}
.light-mode #blogAdmin[open]{background:#f4f6fb!important}
.light-mode .lb-admin-panel{background:#fff;border-color:#e2e8f0}
.light-mode .lb-admin-title{color:#0066ff}
.light-mode .lb-admin-close{color:#64748b;border-color:#d1d5db}
.light-mode .lb-admin-close:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-admin-header{border-bottom-color:#e2e8f0}
.light-mode .lb-cms-input{background:#fff;border:1px solid #d1d5db;color:#1e293b}
.light-mode .lb-cms-input:focus{border-color:#0066ff;box-shadow:0 0 0 2px rgba(0,102,255,.1)}
.light-mode .lb-cms-input::placeholder{color:#94a3b8}
.light-mode .lb-cms-textarea{background:#fff;border:1px solid #d1d5db;color:#1e293b}
.light-mode .lb-cms-textarea:focus{border-color:#0066ff;box-shadow:0 0 0 2px rgba(0,102,255,.1)}
.light-mode .lb-cms-preview{background:#fafbfc;border-color:#e2e8f0}
.light-mode .lb-cms-label{color:#475569}
.light-mode .lb-toolbar{background:#f8fafc;border-color:#d1d5db}
.light-mode .lb-tool-btn{color:#475569}
.light-mode .lb-tool-btn:hover{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.05)}
.light-mode .lb-tool-sep{background:#d1d5db}
.light-mode .lb-cms-split{border-color:#d1d5db}
.light-mode .lb-cms-actions{border-top-color:#e2e8f0}
.light-mode .lb-cms-btn.primary{background:#0066ff;color:#fff}
.light-mode .lb-cms-btn.secondary{border-color:#d1d5db;color:#64748b}
.light-mode .lb-cms-btn.secondary:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-cms-btn.danger{border-color:#fca5a5;color:#ef4444}
.light-mode .lb-cms-status{color:#64748b}
.light-mode .lb-schedule-input{background:#fff;border-color:#d1d5db;color:#1e293b}
.light-mode .lb-schedule-input:focus{border-color:#0066ff}
.light-mode .lb-quick-textarea{background:#fff;border-color:#d1d5db;color:#1e293b}
.light-mode .lb-quick-textarea:focus{border-color:#0066ff;box-shadow:0 0 0 2px rgba(0,102,255,.1)}
.light-mode .lb-quick-char{color:#94a3b8}
.light-mode .lb-cms-article-row{border-bottom-color:#e2e8f0}
.light-mode .lb-cms-article-title{color:#1e293b}

/* ── Responsive ── */
@media(max-width:1024px){
  #blogAdmin[open]{
    position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;
    width:100%!important;height:100%!important;
    max-width:100%!important;max-height:100%!important;
    margin:0!important;padding:0!important;border:none!important;border-radius:0!important;
    overflow-y:auto!important;-webkit-overflow-scrolling:touch;
    display:block!important;box-sizing:border-box!important
  }
  .light-mode #blogAdmin[open]{background:#f4f6fb!important}
  .lb-admin-panel{
    margin:0!important;padding:14px!important;border:none!important;border-radius:0!important;
    max-width:100%!important;width:100%!important;min-height:100vh!important;min-height:100dvh!important;
    box-sizing:border-box!important;background:#060810!important;overflow-x:hidden!important
  }
  .light-mode .lb-admin-panel{background:#fff!important}
  .lb-admin-panel.lb-auth-panel{min-height:auto!important;margin:60px 16px 20px!important;border:1px solid var(--accent)!important;width:auto!important;background:var(--bg)!important}
  .lb-admin-header{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:6px}
  .lb-admin-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;letter-spacing:1px}
  .lb-admin-header .lb-cms-btn-group{flex-direction:row!important;gap:4px;flex-shrink:0}
  .lb-admin-header .lb-cms-btn-group .lb-cms-btn{width:auto!important;flex:none!important;padding:7px 10px!important;font-size:8px!important;min-height:auto!important;border-radius:3px}
  .lb-admin-close{padding:7px 10px!important;font-size:8px!important;flex-shrink:0;border-radius:3px}
  .lb-cms-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex!important}
  .lb-cms-tab{padding:12px 14px;font-size:10px;white-space:nowrap}
  .lb-cms,.lb-cms-row{display:block!important}
  .lb-cms>*,.lb-cms-row>*{margin-bottom:12px}
  .lb-cms-label{font-size:10px;margin-bottom:4px;display:block}
  .lb-cms-input{
    padding:12px!important;font-size:14px!important;border-radius:4px;
    width:100%!important;max-width:100%!important;box-sizing:border-box!important;
    display:block!important
  }
  .light-mode .lb-cms-input{background:#fff!important;border:1px solid #d1d5db!important;color:#1e293b!important}
  .lb-cms-split{display:block!important;border:none!important;min-height:auto!important}
  .lb-cms-textarea{
    border:1px solid var(--border)!important;border-radius:4px;min-height:250px!important;
    font-size:14px!important;padding:14px!important;line-height:1.7;
    width:100%!important;max-width:100%!important;box-sizing:border-box!important;
    display:block!important
  }
  .light-mode .lb-cms-textarea{background:#fff!important;border:1px solid #d1d5db!important;color:#1e293b!important}
  .lb-cms-preview{display:none!important}
  .lb-toolbar{overflow-x:auto;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch;padding:6px;gap:1px;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
  .lb-toolbar-group{flex-shrink:0}
  .lb-tool-btn{padding:8px 10px;min-width:32px;font-size:12px;min-height:36px}
  .lb-cms-actions{display:flex!important;flex-direction:column!important;gap:10px;align-items:stretch!important;width:100%!important;box-sizing:border-box!important}
  .lb-cms-actions .lb-cms-btn-group{display:flex!important;flex-direction:column!important;gap:8px;width:100%!important;box-sizing:border-box!important}
  .lb-cms-actions .lb-cms-btn-group .lb-cms-btn{
    width:100%!important;max-width:100%!important;padding:14px!important;font-size:12px!important;
    text-align:center!important;border-radius:4px;min-height:48px!important;
    box-sizing:border-box!important;display:block!important
  }
  .lb-cms-actions .lb-cms-btn-group .lb-li-toggle{display:flex!important;justify-content:center;padding:8px 0}
  .lb-li-toggle input[type="checkbox"]{width:20px;height:20px}
  .lb-li-label{font-size:11px}
  .lb-schedule-row{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px;width:100%!important;box-sizing:border-box!important}
  .lb-schedule-input{width:100%!important;padding:12px!important;font-size:13px;border-radius:4px;box-sizing:border-box!important}
  .lb-sub-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;display:flex!important}
  .lb-sub-tab{font-size:9px;padding:10px 8px;text-align:center;white-space:nowrap}
  .lb-drafts-header{display:flex!important;flex-wrap:wrap;gap:6px;width:100%!important;box-sizing:border-box!important}
  .lb-drafts-search{min-width:0;flex:1;font-size:12px;padding:10px;border-radius:4px;box-sizing:border-box}
  .lb-draft-row{flex-wrap:wrap;gap:6px;padding:12px;border-radius:4px}
  .lb-draft-title{font-size:12px}
  .lb-draft-meta{flex-wrap:wrap}
  .lb-draft-btn{padding:5px 10px;font-size:8px;min-height:28px;border-radius:3px}
  .lb-cms-article-row{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:6px;padding:12px 0}
  .lb-cms-article-title{font-size:12px;width:100%}
  .lb-cms-article-actions{margin-left:0!important;width:100%;display:flex;gap:4px;flex-wrap:wrap}
  .lb-cms-article-actions .lb-cms-btn{padding:6px 10px;font-size:8px;border-radius:3px}
  .lb-quick-post{width:100%!important;box-sizing:border-box!important}
  .lb-quick-row{gap:6px;flex-wrap:wrap}
  .lb-quick-textarea{min-height:120px!important;font-size:14px!important;padding:12px!important;border-radius:4px;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
  .lb-quick-img-preview{max-width:100%;max-height:120px}
}
@media(max-width:400px){
  .lb-admin-panel{padding:10px!important}
  .lb-admin-title{font-size:8px!important;letter-spacing:.6px}
  .lb-admin-header .lb-cms-btn-group .lb-cms-btn{padding:5px 8px!important;font-size:7px!important}
  .lb-admin-close{padding:5px 8px!important;font-size:7px!important}
  .lb-cms-tab{padding:10px 8px;font-size:8px;letter-spacing:.4px}
  .lb-cms-input{padding:10px!important;font-size:13px!important}
  .lb-cms-textarea{min-height:200px!important;font-size:13px!important;padding:12px!important}
  .lb-sub-tab{font-size:8px;padding:8px 6px}
  .lb-cms-actions .lb-cms-btn-group .lb-cms-btn{padding:12px!important;font-size:10px!important;min-height:44px!important}
}

/* ── Reading Progress Bar ── */
.lb-progress-bar{position:fixed;top:0;left:0;width:100%;height:3px;z-index:9999;background:rgba(0,0,0,.15);pointer-events:none;opacity:0;transition:opacity .3s}
.lb-progress-bar.visible{opacity:1}
.lb-progress-fill{height:100%;width:0;background:var(--accent);transition:width 80ms linear;box-shadow:0 0 8px var(--accent)}
.lb-progress-meta{position:fixed;top:6px;right:16px;z-index:10000;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);opacity:0;transition:opacity .3s;pointer-events:none;background:rgba(0,0,0,.5);padding:2px 8px;border-radius:3px}
.lb-progress-meta.visible{opacity:1}

/* ── Table of Contents ── */
.lb-toc{margin:0 0 40px;border:1px solid var(--border);background:rgba(0,225,255,.02);font-family:'JetBrains Mono',monospace}
.lb-toc-toggle{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;cursor:pointer;user-select:none;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text);background:none;border:none;width:100%;text-align:left}
.lb-toc-toggle::after{content:'▾';color:var(--accent);font-size:14px;transition:transform .2s}
.lb-toc.collapsed .lb-toc-toggle::after{transform:rotate(-90deg)}
.lb-toc-list{list-style:none;margin:0;padding:0 20px 14px;max-height:400px;overflow-y:auto}
.lb-toc.collapsed .lb-toc-list{display:none}
.lb-toc-item{margin:0}
.lb-toc-link{display:block;padding:5px 0;font-size:11px;color:var(--sub);text-decoration:none;transition:color .2s;border-left:2px solid transparent;padding-left:10px}
.lb-toc-link:hover{color:var(--text)}
.lb-toc-link.active{color:var(--accent);border-left-color:var(--accent)}
.lb-toc-link.depth-3{padding-left:24px;font-size:10px}

/* ── Code Copy Button ── */
.lb-content pre{position:relative}
.lb-copy-btn{position:absolute;top:8px;right:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 10px;cursor:pointer;transition:all .2s;z-index:1;letter-spacing:.3px}
.lb-copy-btn:hover{background:rgba(0,225,255,.12);border-color:var(--accent);color:var(--accent)}
.lb-copy-btn.copied{background:rgba(34,197,94,.15);border-color:#22c55e;color:#22c55e}
.lb-code-lang{position:absolute;top:8px;left:12px;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;opacity:.5}

/* ── Rich Embeds ── */
.lb-embed{margin:32px 0;border-radius:4px;overflow:hidden}
.lb-yt-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#000;border:1px solid var(--border)}
.lb-yt-embed iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.lb-tweet-embed{display:flex;justify-content:center;margin:32px 0}
.lb-codepen-embed{margin:32px 0;border:1px solid var(--border)}
.lb-codepen-embed iframe{width:100%;height:400px;border:none}

/* ── Prism Token Colors (Dark Mode) ── */
.lb-content pre .token.comment,.lb-content pre .token.prolog,.lb-content pre .token.doctype,.lb-content pre .token.cdata{color:#6b7a90}
.lb-content pre .token.punctuation{color:#8b949e}
.lb-content pre .token.property,.lb-content pre .token.tag,.lb-content pre .token.boolean,.lb-content pre .token.number,.lb-content pre .token.constant,.lb-content pre .token.symbol,.lb-content pre .token.deleted{color:#f97583}
.lb-content pre .token.selector,.lb-content pre .token.attr-name,.lb-content pre .token.string,.lb-content pre .token.char,.lb-content pre .token.builtin,.lb-content pre .token.inserted{color:#a5d6ff}
.lb-content pre .token.operator,.lb-content pre .token.entity,.lb-content pre .token.url{color:#79c0ff}
.lb-content pre .token.atrule,.lb-content pre .token.attr-value,.lb-content pre .token.keyword{color:#d2a8ff}
.lb-content pre .token.function,.lb-content pre .token.class-name{color:#7ee787}
.lb-content pre .token.regex,.lb-content pre .token.important,.lb-content pre .token.variable{color:#ffa657}

/* ── Light Mode additions ── */
.light-mode .lb-progress-meta{background:rgba(255,255,255,.85);color:#475569}
.light-mode .lb-toc{background:rgba(0,102,255,.02);border-color:#e2e8f0}
.light-mode .lb-toc-link{color:#64748b}
.light-mode .lb-toc-link:hover{color:#1e293b}
.light-mode .lb-toc-link.active{color:#0066ff;border-left-color:#0066ff}
.light-mode .lb-copy-btn{background:rgba(0,0,0,.04);border-color:#d1d5db;color:#64748b}
.light-mode .lb-copy-btn:hover{background:rgba(0,102,255,.06);border-color:#0066ff;color:#0066ff}
.light-mode .lb-copy-btn.copied{background:rgba(34,197,94,.08);border-color:#22c55e;color:#22c55e}
.light-mode .lb-code-lang{color:#94a3b8}
.light-mode .lb-content pre .token.comment,.light-mode .lb-content pre .token.prolog,.light-mode .lb-content pre .token.doctype,.light-mode .lb-content pre .token.cdata{color:#6a737d}
.light-mode .lb-content pre .token.punctuation{color:#24292e}
.light-mode .lb-content pre .token.property,.light-mode .lb-content pre .token.tag,.light-mode .lb-content pre .token.boolean,.light-mode .lb-content pre .token.number,.light-mode .lb-content pre .token.constant,.light-mode .lb-content pre .token.symbol,.light-mode .lb-content pre .token.deleted{color:#d73a49}
.light-mode .lb-content pre .token.selector,.light-mode .lb-content pre .token.attr-name,.light-mode .lb-content pre .token.string,.light-mode .lb-content pre .token.char,.light-mode .lb-content pre .token.builtin,.light-mode .lb-content pre .token.inserted{color:#032f62}
.light-mode .lb-content pre .token.operator,.light-mode .lb-content pre .token.entity,.light-mode .lb-content pre .token.url{color:#005cc5}
.light-mode .lb-content pre .token.atrule,.light-mode .lb-content pre .token.attr-value,.light-mode .lb-content pre .token.keyword{color:#6f42c1}
.light-mode .lb-content pre .token.function,.light-mode .lb-content pre .token.class-name{color:#22863a}
.light-mode .lb-content pre .token.regex,.light-mode .lb-content pre .token.important,.light-mode .lb-content pre .token.variable{color:#e36209}

/* ── Reaction Bar ── */
.lb-reactions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:32px;padding:16px 0;border-top:1px solid var(--border)}
.lb-rx-btn{display:inline-flex;align-items:center;gap:4px;background:rgba(0,225,255,.04);border:1px solid var(--border);padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--sub);transition:all .2s;border-radius:20px}
.lb-rx-btn:hover{border-color:var(--accent);background:rgba(0,225,255,.08)}
.lb-rx-btn.active{border-color:var(--accent);background:rgba(0,225,255,.1);color:var(--text)}
.lb-rx-btn .rcount{font-size:10px;opacity:.7}
.lb-rx-add{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:none;border:1px dashed var(--border);cursor:pointer;font-size:14px;color:var(--sub);transition:all .2s;border-radius:50%}
.lb-rx-add:hover{border-color:var(--accent);color:var(--accent);border-style:solid}
.lb-rx-picker{display:none;position:absolute;bottom:calc(100% + 8px);left:0;background:var(--bg);border:1px solid var(--accent);padding:8px;gap:4px;z-index:10;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.lb-rx-picker.show{display:flex}
.lb-rx-picker button{background:none;border:none;font-size:18px;cursor:pointer;padding:6px;border-radius:4px;transition:background .15s}
.lb-rx-picker button:hover{background:rgba(0,225,255,.1)}
.lb-rx-wrap{position:relative;display:inline-flex}

/* ── Comments ── */
.lb-comments-section{margin-top:48px;padding-top:32px;border-top:1px solid var(--border)}
.lb-comments-title{font-family:'Inter',sans-serif;font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:-0.3px;color:var(--text);margin-bottom:24px;display:flex;align-items:center;gap:10px}
.lb-comments-title .count{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub);font-weight:400}
.lb-comment-form{margin-bottom:32px;border:1px solid var(--border);padding:16px;background:rgba(0,225,255,.01)}
.lb-comment-form-row{display:flex;gap:8px;margin-bottom:8px}
.lb-comment-name{flex:0 0 180px;background:rgba(0,0,0,.2);border:1px solid var(--border);padding:8px 12px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;transition:border-color .2s}
.lb-comment-name:focus{border-color:var(--accent)}
.lb-comment-name::placeholder{color:var(--sub);opacity:.4}
.lb-comment-textarea{flex:1;min-height:80px;background:rgba(0,0,0,.2);border:1px solid var(--border);padding:8px 12px;color:var(--text);font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;outline:none;resize:vertical;box-sizing:border-box;transition:border-color .2s}
.lb-comment-textarea:focus{border-color:var(--accent)}
.lb-comment-textarea::placeholder{color:var(--sub);opacity:.4}
.lb-comment-submit{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:8px 20px;cursor:pointer;background:var(--accent);color:var(--bg);border:none;transition:opacity .2s}
.lb-comment-submit:hover{opacity:.85}
.lb-comment-submit:disabled{opacity:.4;cursor:not-allowed}
.lb-comment-list{display:flex;flex-direction:column;gap:0}
.lb-comment{padding:16px 0;border-bottom:1px solid var(--border)}
.lb-comment:last-child{border-bottom:none}
.lb-comment-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.lb-comment-author{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--text)}
.lb-comment-author.admin{color:var(--accent)}
.lb-comment-author.admin::after{content:'AUTHOR';font-size:7px;font-weight:700;letter-spacing:.5px;background:var(--accent);color:var(--bg);padding:1px 5px;margin-left:6px;border-radius:2px;vertical-align:middle}
.lb-comment-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub)}
.lb-comment-body{font-family:'Source Serif 4',Georgia,serif;font-size:15px;line-height:1.7;color:var(--text);margin-bottom:8px}
.lb-comment-body p{margin:0 0 8px}
.lb-comment-body p:last-child{margin:0}
.lb-comment-actions{display:flex;align-items:center;gap:12px}
.lb-comment-action-btn{background:none;border:none;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;padding:2px 0;transition:color .2s;display:inline-flex;align-items:center;gap:4px}
.lb-comment-action-btn:hover{color:var(--accent)}
.lb-comment-action-btn.liked{color:var(--accent)}
.lb-comment-action-btn.del:hover{color:#ef4444}
.lb-comment-replies{margin-left:24px;border-left:2px solid var(--border);padding-left:16px}
.lb-comment-reply-form{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.lb-comment-reply-input{min-height:60px;background:rgba(0,0,0,.15);border:1px solid var(--border);padding:8px 12px;color:var(--text);font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.5;outline:none;resize:vertical;box-sizing:border-box;transition:border-color .2s}
.lb-comment-reply-input:focus{border-color:var(--accent)}
.lb-comment-reply-actions{display:flex;gap:6px}
.lb-comments-empty{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub);text-align:center;padding:24px 0;opacity:.6}

/* ── Bookmark Button ── */
.lb-bookmark-btn{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:8px 16px;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.lb-bookmark-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-bookmark-btn.active{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06)}
.lb-feed-filters{display:flex;gap:8px;margin-bottom:24px;align-items:center}
.lb-filter-chip{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:6px 14px;transition:all .2s;text-transform:uppercase;letter-spacing:.5px}
.lb-filter-chip:hover{border-color:var(--accent);color:var(--accent)}
.lb-filter-chip.active{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06)}
.lb-card-bookmark{position:absolute;top:32px;right:0;background:none;border:none;font-size:14px;cursor:pointer;color:var(--sub);opacity:.4;transition:all .2s;padding:4px}
.lb-card-bookmark:hover{opacity:1;color:var(--accent)}
.lb-card-bookmark.active{opacity:1;color:var(--accent)}

/* ── Share Quote Tooltip ── */
.lb-quote-tooltip{position:absolute;z-index:10000;display:flex;gap:2px;background:#1a1a2e;border:1px solid var(--accent);border-radius:6px;padding:4px;box-shadow:0 4px 20px rgba(0,0,0,.5);animation:lbQuoteFadeIn .15s ease-out}
.lb-quote-tooltip button{background:none;border:none;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:9px;padding:6px 12px;cursor:pointer;transition:all .15s;white-space:nowrap;border-radius:4px}
.lb-quote-tooltip button:hover{background:rgba(0,225,255,.15);color:var(--accent)}
@keyframes lbQuoteFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

/* ── Phase 2 Light Mode ── */
.light-mode .lb-rx-btn{background:rgba(0,102,255,.03);border-color:#d1d5db;color:#475569}
.light-mode .lb-rx-btn:hover{border-color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .lb-rx-btn.active{border-color:#0066ff;background:rgba(0,102,255,.08);color:#1e293b}
.light-mode .lb-rx-add{border-color:#d1d5db;color:#94a3b8}
.light-mode .lb-rx-add:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-rx-picker{background:#fff;border-color:#d1d5db;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.light-mode .lb-rx-picker button:hover{background:rgba(0,102,255,.06)}
.light-mode .lb-comment-form{background:rgba(0,102,255,.01);border-color:#d1d5db}
.light-mode .lb-comment-name,.light-mode .lb-comment-textarea{background:#fff;border-color:#d1d5db;color:#1e293b}
.light-mode .lb-comment-name:focus,.light-mode .lb-comment-textarea:focus{border-color:#0066ff}
.light-mode .lb-comment-submit{background:#0066ff}
.light-mode .lb-comment-reply-input{background:rgba(0,0,0,.02);border-color:#d1d5db;color:#1e293b}
.light-mode .lb-comment-reply-input:focus{border-color:#0066ff}
.light-mode .lb-comment-author{color:#1e293b}
.light-mode .lb-comment-author.admin{color:#0066ff}
.light-mode .lb-comment-author.admin::after{background:#0066ff}
.light-mode .lb-comment-body{color:#334155}
.light-mode .lb-bookmark-btn{border-color:#d1d5db;color:#64748b}
.light-mode .lb-bookmark-btn:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-bookmark-btn.active{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.04)}
.light-mode .lb-filter-chip{border-color:#d1d5db;color:#64748b}
.light-mode .lb-filter-chip:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-filter-chip.active{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.04)}
.light-mode .lb-card-bookmark:hover,.light-mode .lb-card-bookmark.active{color:#0066ff}
.light-mode .lb-quote-tooltip{background:#fff;border-color:#d1d5db;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.light-mode .lb-quote-tooltip button{color:#475569}
.light-mode .lb-quote-tooltip button:hover{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .lb-comments-section{border-top-color:#e2e8f0}
.light-mode .lb-comment{border-bottom-color:#e2e8f0}
.light-mode .lb-comment-replies{border-left-color:#e2e8f0}
.light-mode .lb-reactions{border-top-color:#e2e8f0}

/* ── Phase 2 Mobile ── */
@media(max-width:600px){
  .lb-comment-form-row{flex-direction:column}
  .lb-comment-name{flex:none;width:100%}
  .lb-reactions{gap:4px}
  .lb-rx-btn{padding:5px 10px;font-size:11px}
  .lb-comment-replies{margin-left:12px;padding-left:10px}
}

/* ── Phase 3: Search Bar ── */
.lb-search-wrap{position:relative;margin-bottom:24px}
.lb-search-bar{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px 12px 40px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;transition:all .25s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.lb-search-bar:focus{border-color:var(--accent);background:rgba(0,225,255,.04);box-shadow:0 0 16px rgba(0,225,255,.08)}
.lb-search-bar::placeholder{color:var(--sub);opacity:.5}
.lb-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--sub);font-size:13px;pointer-events:none}
.lb-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:var(--sub);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 8px;transition:all .2s}
.lb-search-clear:hover{color:var(--accent);border-color:var(--accent)}
.lb-search-result mark{background:rgba(0,225,255,.2);color:var(--accent);padding:1px 2px;border-radius:2px}
.light-mode .lb-search-bar{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06);color:#1e293b;box-shadow:none}
.light-mode .lb-search-bar:focus{border-color:#0066ff;background:rgba(0,0,0,.02);box-shadow:0 0 0 3px rgba(0,102,255,.08)}
.light-mode .lb-search-clear{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}
.light-mode .lb-search-result mark{background:rgba(0,102,255,.12);color:#0066ff}

/* ── Phase 3: Related Articles ── */
.lb-related{margin-top:48px;padding-top:32px;border-top:1px solid var(--border)}
.lb-related-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:16px}
.lb-related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.lb-related-card{border:1px solid var(--border);padding:16px;cursor:pointer;transition:all .2s}
.lb-related-card:hover{border-color:var(--accent);background:rgba(0,225,255,.02)}
.lb-related-card-title{font-family:'Inter',sans-serif;font-size:14px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-related-card-meta{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);display:flex;gap:8px}
.light-mode .lb-related{border-top-color:#e2e8f0}
.light-mode .lb-related-card{border-color:#d1d5db}
.light-mode .lb-related-card:hover{border-color:#0066ff;background:rgba(0,102,255,.02)}

/* ── Phase 3: Series Navigation ── */
.lb-series-nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);margin-bottom:32px;background:rgba(0,225,255,.02);font-family:'JetBrains Mono',monospace;font-size:10px}
.lb-series-nav-title{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.5px;flex:1;text-align:center}
.lb-series-nav-btn{color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:6px 12px;transition:all .2s;text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:9px}
.lb-series-nav-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-series-nav-btn.disabled{opacity:.3;cursor:default;pointer-events:none}
.lb-series-badge{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--accent);border:1px solid var(--accent);padding:1px 6px;opacity:.7;margin-left:8px}
.light-mode .lb-series-nav{background:rgba(0,102,255,.02);border-color:#d1d5db}
.light-mode .lb-series-nav-title{color:#0066ff}
.light-mode .lb-series-badge{color:#0066ff;border-color:#0066ff}

/* ── Phase 3: Newsletter ── */
.lb-newsletter{margin-top:48px;padding:32px;border:1px solid rgba(255,255,255,.08);border-radius:12px;text-align:center;background:rgba(0,225,255,.02);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.04)}
.lb-newsletter-title{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.lb-newsletter-sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--sub);margin-bottom:16px}
.lb-newsletter-form{display:flex;gap:8px;max-width:400px;margin:0 auto}
.lb-newsletter-form input{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;transition:all .25s}
.lb-newsletter-form input:focus{border-color:var(--accent);background:rgba(0,225,255,.04);box-shadow:0 0 12px rgba(0,225,255,.06)}
.lb-newsletter-form input::placeholder{color:var(--sub);opacity:.4}
.lb-newsletter-form button{background:var(--accent);color:var(--bg);border:none;padding:10px 20px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .25s;white-space:nowrap;box-shadow:0 2px 8px rgba(0,225,255,.2)}
.lb-newsletter-form button:hover{opacity:.9;box-shadow:0 4px 16px rgba(0,225,255,.3)}
.lb-newsletter-form button:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.light-mode .lb-newsletter{background:rgba(0,102,255,.03);border-color:rgba(0,0,0,.06);box-shadow:0 4px 20px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.7)}
.light-mode .lb-newsletter-title{color:#0066ff}
.light-mode .lb-newsletter-form input{background:rgba(255,255,255,.6);border-color:rgba(0,0,0,.08);color:#1e293b}
.light-mode .lb-newsletter-form input:focus{border-color:#0066ff;background:rgba(0,102,255,.04);box-shadow:0 0 12px rgba(0,102,255,.06)}
.light-mode .lb-newsletter-form button{background:#0066ff;box-shadow:0 2px 8px rgba(0,102,255,.2)}

/* ── Phase 3: Analytics Dashboard ── */
.lb-analytics{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.lb-stat-card{border:1px solid var(--border);padding:20px;text-align:center}
.lb-stat-card-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:var(--accent);margin-bottom:4px}
.lb-stat-card-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px}
.lb-bar-chart{margin-top:24px}
.lb-bar-chart-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:12px}
.lb-bar-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;font-family:'JetBrains Mono',monospace;font-size:10px}
.lb-bar-label{width:160px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.lb-bar-fill{height:20px;background:var(--accent);transition:width .3s ease}
.lb-bar-value{color:var(--sub);width:50px;text-align:right;flex-shrink:0}
.lb-recent-activity{margin-top:24px}
.lb-recent-activity-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:12px}
.lb-activity-row{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:10px}
.lb-activity-author{color:var(--accent);font-weight:700;width:100px;flex-shrink:0}
.lb-activity-text{color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-activity-time{color:var(--sub);width:60px;text-align:right;flex-shrink:0}
.light-mode .lb-stat-card{border-color:#d1d5db}
.light-mode .lb-stat-card-value{color:#0066ff}
.light-mode .lb-bar-fill{background:#0066ff}
.light-mode .lb-activity-author{color:#0066ff}

/* ── Phase 3: Version History ── */
.lb-version-history{margin-top:16px;border:1px solid var(--border);max-height:50vh;overflow-y:auto}
.lb-version-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:10px}
.lb-version-row:last-child{border-bottom:none}
.lb-version-row:hover{background:rgba(0,225,255,.02)}
.lb-version-num{color:var(--accent);font-weight:700;width:24px}
.lb-version-title{color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-version-time{color:var(--sub);width:100px;text-align:right}
.lb-version-actions{display:flex;gap:4px}
.light-mode .lb-version-history{border-color:#d1d5db}
.light-mode .lb-version-row:hover{background:rgba(0,102,255,.02)}

/* ── Phase 3: Review ── */
.lb-review-banner{background:rgba(0,225,255,.05);border:1px solid var(--accent);padding:16px 20px;margin-bottom:32px;font-family:'JetBrains Mono',monospace;font-size:11px;display:flex;align-items:center;justify-content:space-between}
.lb-review-banner-text{color:var(--accent);font-weight:700}
.lb-review-sidebar{margin-top:32px;border:1px solid var(--border);padding:20px}
.lb-review-comment{border-bottom:1px solid var(--border);padding:12px 0;font-family:'JetBrains Mono',monospace;font-size:11px}
.lb-review-comment:last-child{border-bottom:none}
.lb-review-comment-author{color:var(--accent);font-weight:700;font-size:10px}
.lb-review-comment-text{color:var(--text);margin-top:4px}
.lb-review-comment-meta{color:var(--sub);font-size:9px;margin-top:4px}
.light-mode .lb-review-banner{background:rgba(0,102,255,.03);border-color:#0066ff}
.light-mode .lb-review-sidebar{border-color:#d1d5db}

/* ── Phase 3: TTS Player ── */
.lb-tts-btn{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:8px 16px;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.lb-tts-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-tts-btn.active{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06)}
.lb-tts-player{position:fixed;bottom:0;left:0;right:0;background:rgba(6,8,16,.95);border-top:1px solid var(--accent);padding:12px 20px;display:flex;align-items:center;gap:16px;z-index:10001;backdrop-filter:blur(12px);transform:translateY(100%);transition:transform .3s ease}
.lb-tts-player.visible{transform:translateY(0)}
.lb-tts-controls{display:flex;align-items:center;gap:8px}
.lb-tts-ctrl-btn{background:none;border:1px solid var(--border);color:var(--sub);padding:6px 10px;cursor:pointer;font-size:14px;transition:all .15s;border-radius:2px;line-height:1}
.lb-tts-ctrl-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-tts-ctrl-btn.active{color:var(--accent);border-color:var(--accent)}
.lb-tts-progress{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:2px;position:relative;cursor:pointer}
.lb-tts-progress-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .2s linear}
.lb-tts-speed{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:4px 8px;transition:all .15s}
.lb-tts-speed:hover{border-color:var(--accent);color:var(--accent)}
.lb-tts-close{background:none;border:none;color:var(--sub);cursor:pointer;font-size:16px;padding:4px;transition:color .15s}
.lb-tts-close:hover{color:var(--accent)}
.lb-tts-highlight{background:rgba(0,225,255,.12);border-radius:2px;transition:background .2s}
.light-mode .lb-tts-player{background:rgba(255,255,255,.95);border-top-color:#0066ff}
.light-mode .lb-tts-ctrl-btn{border-color:#d1d5db;color:#64748b}
.light-mode .lb-tts-ctrl-btn:hover,.light-mode .lb-tts-ctrl-btn.active{border-color:#0066ff;color:#0066ff}
.light-mode .lb-tts-progress{background:rgba(0,0,0,.1)}
.light-mode .lb-tts-progress-fill{background:#0066ff}
.light-mode .lb-tts-highlight{background:rgba(0,102,255,.1)}
.light-mode .lb-tts-btn{border-color:#d1d5db;color:#64748b}
.light-mode .lb-tts-btn:hover,.light-mode .lb-tts-btn.active{border-color:#0066ff;color:#0066ff}
@media(max-width:600px){
  .lb-tts-player{padding:10px 12px;gap:8px}
  .lb-related-grid{grid-template-columns:1fr 1fr}
  .lb-newsletter-form{flex-direction:column}
  .lb-analytics{grid-template-columns:1fr 1fr}
  .lb-series-nav{flex-wrap:wrap;gap:8px}
  .lb-bar-label{width:100px}
}

/* ═══════════════════════════════════════════════════
   PHASE 4: COMPREHENSIVE UPGRADE
   ═══════════════════════════════════════════════════ */

/* ── Magazine Feed: Hero ── */
.lb-hero{position:relative;border:1px solid var(--border);margin-bottom:40px;cursor:pointer;overflow:hidden;transition:border-color .3s}
.lb-hero:hover{border-color:var(--accent)}
.lb-hero-img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;transition:transform .4s ease}
.lb-hero:hover .lb-hero-img{transform:scale(1.02)}
.lb-hero-gradient{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,16,.92) 0%,rgba(6,8,16,.4) 50%,transparent 100%)}
.lb-hero-fallback{width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,rgba(0,225,255,.08) 0%,rgba(6,8,16,.9) 100%);display:flex;align-items:center;justify-content:center}
.lb-hero-fallback-icon{font-size:48px;color:var(--accent);opacity:.3}
.lb-hero-body{position:absolute;bottom:0;left:0;right:0;padding:32px}
.lb-hero-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.lb-hero-title{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-hero-excerpt{font-family:'Source Serif 4',Georgia,serif;font-size:14px;color:rgba(255,255,255,.7);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px}
.lb-hero-meta{display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.5)}
.lb-hero-meta span{display:inline-flex;align-items:center;gap:4px}
.light-mode .lb-hero{border-color:#d1d5db}
.light-mode .lb-hero:hover{border-color:#0066ff}
.light-mode .lb-hero-gradient{background:linear-gradient(0deg,rgba(244,246,251,.95) 0%,rgba(244,246,251,.5) 50%,transparent 100%)}
.light-mode .lb-hero-title{color:#0a0f1a}
.light-mode .lb-hero-excerpt{color:#475569}
.light-mode .lb-hero-date{color:#0066ff}
.light-mode .lb-hero-meta{color:#64748b}
.light-mode .lb-hero-fallback{background:linear-gradient(135deg,rgba(0,102,255,.06) 0%,rgba(244,246,251,.9) 100%)}

/* ── Magazine Feed: Card Grid ── */
.lb-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
.lb-card-v2{border:1px solid var(--border);cursor:pointer;transition:all .3s ease;overflow:hidden;display:flex;flex-direction:column;position:relative}
.lb-card-v2:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,225,255,.06)}
.lb-card-v2-img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}
.lb-card-v2-fallback{width:100%;aspect-ratio:16/10;background:linear-gradient(135deg,rgba(0,225,255,.04) 0%,rgba(0,0,0,.2) 100%);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--accent);opacity:.2}
.lb-card-v2-body{padding:20px;flex:1;display:flex;flex-direction:column}
.lb-card-v2-date{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.lb-card-v2-title{font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:var(--text);line-height:1.3;letter-spacing:-0.2px;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-card-v2-excerpt{font-family:'Source Serif 4',Georgia,serif;font-size:13px;color:var(--sub);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px;flex:1}
.lb-card-v2-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lb-card-v2-tags{display:flex;gap:4px;flex-wrap:wrap;flex:1;min-width:0;overflow:hidden}
.lb-card-v2-stats{display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);flex-shrink:0}
.lb-card-v2-bookmark{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);border:none;font-size:13px;cursor:pointer;color:#fff;opacity:.6;transition:all .2s;padding:6px;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center}
.lb-card-v2-bookmark:hover{opacity:1;color:var(--accent)}
.lb-card-v2-bookmark.active{opacity:1;color:var(--accent)}
.lb-trending-badge{font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;letter-spacing:.5px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2);padding:2px 6px;text-transform:uppercase;display:inline-flex;align-items:center;gap:3px}
.lb-social-proof{display:flex;align-items:center;gap:6px}
.lb-social-proof span{display:inline-flex;align-items:center;gap:2px}
.light-mode .lb-card-v2{border-color:#d1d5db}
.light-mode .lb-card-v2:hover{border-color:#0066ff;box-shadow:0 8px 32px rgba(0,102,255,.06)}
.light-mode .lb-card-v2-fallback{background:linear-gradient(135deg,rgba(0,102,255,.03) 0%,rgba(0,0,0,.02) 100%)}
.light-mode .lb-card-v2-bookmark{background:rgba(255,255,255,.8);color:#475569}
.light-mode .lb-card-v2-bookmark:hover,.light-mode .lb-card-v2-bookmark.active{color:#0066ff}
.light-mode .lb-trending-badge{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.15)}

/* ── Tag filter bar ── */
.lb-tag-filters{display:flex;gap:6px;margin-bottom:28px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px}
.lb-tag-filters::-webkit-scrollbar{display:none}
.lb-tag-chip{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:5px 14px;transition:all .25s;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;flex-shrink:0;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.lb-tag-chip:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06);box-shadow:0 0 10px rgba(0,225,255,.08)}
.lb-tag-chip.active{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.08);box-shadow:0 0 12px rgba(0,225,255,.1)}
.light-mode .lb-tag-chip{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06);color:#64748b;box-shadow:none}
.light-mode .lb-tag-chip:hover{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.04)}
.light-mode .lb-tag-chip.active{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.08)}

/* ── Route transition overlay ── */
.lb-transition{position:fixed;inset:0;z-index:99990;background:rgba(6,8,16,.85);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:none;opacity:0;transition:opacity .22s ease}
.lb-transition.active{opacity:1}
.light-mode .lb-transition{background:rgba(244,246,251,.88)}

/* ── Scroll-reveal animation ── */
.lb-reveal{opacity:0;transform:translateY(24px);transition:opacity .5s ease,transform .5s cubic-bezier(.16,1,.3,1)}
.lb-reveal.visible{opacity:1;transform:none}
.lb-reveal-left{opacity:0;transform:translateX(-20px);transition:opacity .45s ease,transform .45s cubic-bezier(.16,1,.3,1)}
.lb-reveal-left.visible{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){
.lb-reveal,.lb-reveal-left{transition:none!important;opacity:1!important;transform:none!important}
.lb-transition{transition:none!important}
}

/* ── Feed skeleton v2 ── */
.lb-skel-hero{aspect-ratio:16/9;margin-bottom:40px;border:1px solid var(--border)}
.lb-skel-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.lb-skel-card{border:1px solid var(--border);overflow:hidden}
.lb-skel-card-img{aspect-ratio:16/10;background:linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.02) 75%);background-size:200% 100%;animation:lbSkelShim 1.5s infinite}
.lb-skel-card-body{padding:20px}

/* ── Reading Settings ── */
.lb-reading-fab{position:fixed;bottom:80px;right:20px;z-index:9999;width:40px;height:40px;border-radius:50%;background:var(--bg);border:1px solid var(--accent);color:var(--accent);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.lb-reading-fab:hover{transform:scale(1.1)}
.lb-reading-panel{position:fixed;bottom:130px;right:20px;z-index:9999;background:var(--bg);border:1px solid var(--accent);padding:20px;width:220px;display:none;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.lb-reading-panel.show{display:block}
.lb-reading-panel-title{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:12px}
.lb-reading-option{margin-bottom:14px}
.lb-reading-option-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.lb-reading-options{display:flex;gap:4px}
.lb-reading-opt{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);background:none;border:1px solid var(--border);padding:5px 10px;cursor:pointer;transition:all .15s;flex:1;text-align:center}
.lb-reading-opt:hover{border-color:var(--accent);color:var(--accent)}
.lb-reading-opt.active{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.06)}
.light-mode .lb-reading-fab{background:#fff;border-color:#0066ff;color:#0066ff;box-shadow:0 4px 16px rgba(0,0,0,.1)}
.light-mode .lb-reading-panel{background:#fff;border-color:#d1d5db;box-shadow:0 8px 32px rgba(0,0,0,.08)}
.light-mode .lb-reading-opt{border-color:#d1d5db;color:#64748b}
.light-mode .lb-reading-opt:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-reading-opt.active{border-color:#0066ff;color:#0066ff;background:rgba(0,102,255,.04)}

/* ── Sepia reading mode ── */
.lb-sepia #blogView{--bg:#f5f0e8;--text:#3d3929;--sub:#7a7260;--accent:#8b6914;--border:rgba(0,0,0,.08);background:rgba(245,240,232,.95)}
.lb-sepia .lb-content{color:#3d3929}

/* ── Image Lightbox ── */
.lb-lightbox{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease}
.lb-lightbox.show{opacity:1}
.lb-lightbox-img{max-width:92vw;max-height:88vh;object-fit:contain;cursor:default;transform:scale(.95);transition:transform .25s ease}
.lb-lightbox.show .lb-lightbox-img{transform:scale(1)}
.lb-lightbox-caption{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,.7);background:rgba(0,0,0,.5);padding:6px 16px;max-width:80vw;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-lightbox-close{position:absolute;top:20px;right:24px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;opacity:.6;transition:opacity .2s}
.lb-lightbox-close:hover{opacity:1}
.lb-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);border:none;color:#fff;font-size:24px;cursor:pointer;padding:12px 16px;transition:all .2s;backdrop-filter:blur(4px)}
.lb-lightbox-nav:hover{background:rgba(255,255,255,.2)}
.lb-lightbox-prev{left:16px}
.lb-lightbox-next{right:16px}
.lb-lightbox-counter{position:absolute;top:20px;left:24px;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,.5)}

/* ── Drop Cap ── */
.lb-content.has-dropcap > p:first-of-type::first-letter{float:left;font-family:'Inter',sans-serif;font-size:3.5em;font-weight:800;line-height:.8;margin:4px 10px 0 0;color:var(--accent)}

/* ── Footnotes ── */
.lb-footnotes{margin-top:48px;padding-top:24px;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub)}
.lb-footnotes-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--sub)}
.lb-footnote-item{display:flex;gap:8px;margin-bottom:8px;line-height:1.5}
.lb-footnote-num{color:var(--accent);font-weight:700;flex-shrink:0}
.lb-footnote-back{color:var(--accent);text-decoration:none;margin-left:4px;font-size:10px}
.lb-footnote-tooltip{position:absolute;z-index:10000;background:var(--bg);border:1px solid var(--accent);padding:10px 14px;max-width:320px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,.4);line-height:1.5;animation:lbQuoteFadeIn .15s ease-out}
.light-mode .lb-footnote-tooltip{background:#fff;border-color:#d1d5db;box-shadow:0 4px 20px rgba(0,0,0,.08)}

/* ── Pull Quote ── */
.lb-content .callout-quote{border-left-color:var(--accent);background:rgba(0,225,255,.02);font-style:italic}
.lb-content .callout-quote .callout-title{color:var(--accent)}

/* ── Better HR ── */
.lb-content hr{border:none;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);margin:48px 0;opacity:.3}

/* ── Image Gallery ── */
.lb-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin:32px 0}
.lb-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;cursor:pointer;transition:all .2s;border:1px solid var(--border)}
.lb-gallery img:hover{border-color:var(--accent);transform:scale(1.02)}

/* ── Figure / Caption ── */
.lb-content figure{margin:32px 0;text-align:center}
.lb-content figure img{max-width:100%;height:auto;cursor:pointer;transition:opacity .2s}
.lb-content figure img:hover{opacity:.9}
.lb-content figcaption{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--sub);margin-top:8px;letter-spacing:.3px;font-style:italic}

/* ── Drag-and-Drop Zone ── */
.lb-dropzone-active{outline:2px dashed var(--accent)!important;outline-offset:-4px;background:rgba(0,225,255,.03)!important}
.lb-dropzone-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,225,255,.06);font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent);z-index:5;pointer-events:none}

/* ── Share Panel ── */
.lb-share-panel{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lb-share-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);color:var(--sub);font-size:14px;cursor:pointer;transition:all .2s;background:none;text-decoration:none}
.lb-share-icon:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,225,255,.04)}
.lb-share-icon.twitter:hover{border-color:#1da1f2;color:#1da1f2}
.lb-share-icon.linkedin:hover{border-color:#0a66c2;color:#0a66c2}
.lb-share-icon.whatsapp:hover{border-color:#25d366;color:#25d366}
.lb-share-icon.telegram:hover{border-color:#0088cc;color:#0088cc}
.lb-share-icon.email:hover{border-color:#ea4335;color:#ea4335}
.light-mode .lb-share-icon{border-color:#d1d5db;color:#64748b}

/* ── Author Bio ── */
.lb-author-card{display:flex;gap:20px;align-items:center;margin-top:40px;padding:24px;border:1px solid var(--border);background:rgba(0,225,255,.01)}
.lb-author-avatar{width:64px;height:64px;border-radius:50%;border:2px solid var(--accent);object-fit:cover;flex-shrink:0}
.lb-author-info{flex:1;min-width:0}
.lb-author-name{font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px}
.lb-author-bio{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--sub);line-height:1.6;margin-bottom:8px}
.lb-author-links{display:flex;gap:8px}
.lb-author-link{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);text-decoration:none;border:1px solid var(--border);padding:4px 10px;transition:all .2s}
.lb-author-link:hover{border-color:var(--accent);background:rgba(0,225,255,.04)}
.light-mode .lb-author-card{border-color:#d1d5db;background:rgba(0,102,255,.01)}
.light-mode .lb-author-link{color:#0066ff;border-color:#d1d5db}
.light-mode .lb-author-link:hover{border-color:#0066ff;background:rgba(0,102,255,.03)}

/* ── RSS Button ── */
.lb-rss-btn{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--sub);background:none;border:none;padding:4px 0;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;letter-spacing:.5px}
.lb-rss-btn:hover{color:#f26522}

/* ── Editor Stats ── */
.lb-editor-stats{display:flex;gap:16px;padding:6px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);border:1px solid var(--border);border-top:none;background:rgba(0,0,0,.1)}
.lb-editor-fullscreen-btn{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);background:none;border:1px solid var(--border);padding:4px 8px;cursor:pointer;transition:all .15s;margin-left:auto}
.lb-editor-fullscreen-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-editor-fs{position:fixed!important;inset:0!important;z-index:99999!important;width:100%!important;height:100%!important;border:none!important;border-radius:0!important;margin:0!important;background:var(--bg)!important}
.lb-editor-fs .lb-cms-split{min-height:100%!important;height:100%!important;border:none!important}
.lb-editor-fs .lb-cms-textarea,.lb-editor-fs .CodeMirror{min-height:100%!important;height:100%!important}
.lb-editor-fs .lb-cms-preview{display:block!important}
.light-mode .lb-editor-stats{background:rgba(0,0,0,.02);border-color:#d1d5db}

/* ── Phase 4 responsive ── */
@media(max-width:768px){
  .lb-card-grid{grid-template-columns:1fr}
  .lb-hero-title{font-size:22px}
  .lb-hero-body{padding:20px}
  .lb-hero-excerpt{display:none}
  .lb-skel-grid{grid-template-columns:1fr}
  .lb-author-card{flex-direction:column;text-align:center}
  .lb-author-links{justify-content:center}
  .lb-share-panel{justify-content:center}
  .lb-reading-fab{bottom:70px;right:12px;width:36px;height:36px;font-size:14px}
  .lb-reading-panel{right:12px;bottom:115px;width:200px}
  .lb-gallery{grid-template-columns:1fr 1fr}
}
@media(max-width:400px){
  .lb-hero-title{font-size:18px}
  .lb-hero-meta{display:none}
  .lb-card-v2-title{font-size:14px}
  .lb-card-v2-excerpt{font-size:12px}
}

/* ── CodeMirror 6 Editor ── */
.lb-cm-loading{display:flex;align-items:center;justify-content:center;flex:1;min-height:300px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub);gap:8px}
.lb-cm-loading::before{content:'';width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:lbCmSpin .6s linear infinite}
@keyframes lbCmSpin{to{transform:rotate(360deg)}}
.lb-cms-split .cm-editor{flex:1;min-height:300px;max-height:none;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;border:none}
.lb-cms-split .cm-editor .cm-scroller{overflow:auto}
.lb-cms-split .cm-editor .cm-content{padding:12px 16px;caret-color:var(--accent)}
.lb-cms-split .cm-editor .cm-gutters{background:rgba(0,0,0,.15);border-right:1px solid var(--border);color:var(--sub);font-size:11px}
.lb-cms-split .cm-editor .cm-activeLineGutter{background:rgba(0,225,255,.08)}
.lb-cms-split .cm-editor .cm-activeLine{background:rgba(0,225,255,.03)}
.lb-cms-split .cm-editor .cm-selectionBackground{background:rgba(0,225,255,.15)!important}
.lb-cms-split .cm-editor .cm-cursor{border-left-color:var(--accent)}
.lb-cms-split .cm-editor .cm-placeholder{color:var(--sub);font-style:italic}
.lb-cms-split .cm-editor .cm-line{line-height:1.6}
.light-mode .lb-cms-split .cm-editor .cm-gutters{background:rgba(0,0,0,.03);border-right-color:#d1d5db;color:#94a3b8}
.light-mode .lb-cms-split .cm-editor .cm-activeLineGutter{background:rgba(0,102,255,.06)}
.light-mode .lb-cms-split .cm-editor .cm-activeLine{background:rgba(0,102,255,.02)}
.light-mode .lb-cms-split .cm-editor .cm-selectionBackground{background:rgba(0,102,255,.12)!important}
.light-mode .lb-cms-split .cm-editor .cm-cursor{border-left-color:#0066ff}
.lb-editor-fs .cm-editor{height:100%!important}
.lb-editor-fs .cm-editor .cm-scroller{height:100%!important}

/* ── Highlights ── */
.lb-hl{border-radius:2px;cursor:pointer;position:relative;transition:filter .15s}
.lb-hl:hover{filter:brightness(1.15)}
.lb-hl-yellow{background:rgba(255,230,0,.32)}
.lb-hl-blue{background:rgba(56,182,255,.28)}
.lb-hl-green{background:rgba(0,220,130,.26)}
.lb-hl-pink{background:rgba(255,100,180,.28)}
.light-mode .lb-hl-yellow{background:rgba(255,230,0,.45)}
.light-mode .lb-hl-blue{background:rgba(56,182,255,.35)}
.light-mode .lb-hl-green{background:rgba(0,220,130,.35)}
.light-mode .lb-hl-pink{background:rgba(255,100,180,.35)}
.lb-hl-toolbar{position:absolute;z-index:10001;display:flex;gap:2px;background:#1a1a2e;border:1px solid var(--accent);border-radius:6px;padding:3px;box-shadow:0 4px 20px rgba(0,0,0,.5);animation:lbQuoteFadeIn .12s ease-out;white-space:nowrap}
.lb-hl-toolbar button{background:none;border:none;color:#e2e8f0;font-size:11px;padding:4px 8px;cursor:pointer;transition:all .15s;border-radius:3px}
.lb-hl-toolbar button:hover{background:rgba(0,225,255,.15);color:var(--accent)}
.light-mode .lb-hl-toolbar{background:#fff;border-color:#d1d5db;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.light-mode .lb-hl-toolbar button{color:#475569}
.light-mode .lb-hl-toolbar button:hover{background:rgba(0,102,255,.08);color:#0066ff}
.lb-hl-note-icon{position:absolute;top:-8px;right:-6px;font-size:10px;pointer-events:none;z-index:1;opacity:.7}
@keyframes lbHlPulse{0%{filter:brightness(1)}50%{filter:brightness(1.6)}100%{filter:brightness(1)}}
.lb-hl-pulse{animation:lbHlPulse .6s ease}
.lb-quote-hl-colors{display:flex;gap:4px;margin-left:4px;padding-left:6px;border-left:1px solid rgba(255,255,255,.15)}
.lb-quote-hl-dot{width:18px;height:18px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all .15s;flex-shrink:0}
.lb-quote-hl-dot:hover{transform:scale(1.2);border-color:#fff}
.lb-quote-hl-dot[data-color=yellow]{background:#ffe600}
.lb-quote-hl-dot[data-color=blue]{background:#38b6ff}
.lb-quote-hl-dot[data-color=green]{background:#00dc82}
.lb-quote-hl-dot[data-color=pink]{background:#ff64b4}
.light-mode .lb-quote-hl-colors{border-left-color:rgba(0,0,0,.1)}
.light-mode .lb-quote-hl-dot:hover{border-color:#333}

/* ── Note Popover ── */
.lb-note-popover{position:absolute;z-index:10002;background:#1a1a2e;border:1px solid var(--accent);border-radius:8px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);width:260px;animation:lbQuoteFadeIn .15s ease-out}
.lb-note-popover textarea{width:100%;min-height:70px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;padding:8px;resize:vertical;line-height:1.5}
.lb-note-popover textarea:focus{outline:none;border-color:var(--accent)}
.lb-note-popover-btns{display:flex;gap:6px;margin-top:8px;justify-content:flex-end}
.lb-note-popover-btns button{font-family:'JetBrains Mono',monospace;font-size:9px;padding:5px 12px;border-radius:4px;cursor:pointer;transition:all .15s;text-transform:uppercase;letter-spacing:.5px}
.lb-note-save{background:var(--accent);color:#000;border:none;font-weight:700}
.lb-note-save:hover{filter:brightness(1.2)}
.lb-note-cancel{background:none;border:1px solid var(--border);color:var(--sub)}
.lb-note-cancel:hover{border-color:var(--accent);color:var(--accent)}
.light-mode .lb-note-popover{background:#fff;border-color:#d1d5db;box-shadow:0 8px 32px rgba(0,0,0,.08)}
.light-mode .lb-note-popover textarea{background:#f8fafc;border-color:#d1d5db;color:#1e293b}
.light-mode .lb-note-save{background:#0066ff;color:#fff}

/* ── Annotations Panel ── */
.lb-ann-fab{position:fixed;bottom:130px;right:20px;z-index:9999;width:40px;height:40px;border-radius:50%;background:var(--bg);border:1px solid var(--accent);color:var(--accent);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.lb-ann-fab:hover{transform:scale(1.1)}
.lb-ann-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;background:var(--accent);color:#000;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px}
.lb-ann-panel{position:fixed;top:0;right:-340px;bottom:0;z-index:99991;width:320px;background:var(--bg);border-left:1px solid var(--accent);box-shadow:-8px 0 32px rgba(0,0,0,.3);display:flex;flex-direction:column;transition:right .25s cubic-bezier(.16,1,.3,1)}
.lb-ann-panel.show{right:0}
.lb-ann-panel-header{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.lb-ann-panel-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--sub)}
.lb-ann-panel-close{background:none;border:none;color:var(--sub);font-size:18px;cursor:pointer;padding:4px;transition:color .15s}
.lb-ann-panel-close:hover{color:var(--accent)}
.lb-ann-tabs{display:flex;border-bottom:1px solid var(--border)}
.lb-ann-tab{flex:1;padding:10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--sub);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
.lb-ann-tab:hover{color:var(--text)}
.lb-ann-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.lb-ann-list{flex:1;overflow-y:auto;padding:8px}
.lb-ann-item{padding:10px;border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all .15s;border-radius:4px}
.lb-ann-item:hover{border-color:var(--accent);background:rgba(0,225,255,.03)}
.lb-ann-item-color{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle;flex-shrink:0}
.lb-ann-item-text{font-size:12px;color:var(--text);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-ann-item-note{font-size:10px;color:var(--sub);margin-top:4px;font-style:italic;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.lb-ann-item-meta{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.lb-ann-item-date{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px}
.lb-ann-item-del{background:none;border:none;color:var(--sub);cursor:pointer;font-size:12px;padding:2px 4px;transition:color .15s}
.lb-ann-item-del:hover{color:#ff4d6a}
.lb-ann-empty{text-align:center;color:var(--sub);font-size:12px;padding:30px 10px}
.lb-ann-empty-icon{font-size:24px;margin-bottom:8px}
.light-mode .lb-ann-fab{background:#fff;border-color:#0066ff;color:#0066ff;box-shadow:0 4px 16px rgba(0,0,0,.1)}
.light-mode .lb-ann-badge{background:#0066ff;color:#fff}
.light-mode .lb-ann-panel{background:#fff;border-left-color:#d1d5db;box-shadow:-8px 0 32px rgba(0,0,0,.06)}
.light-mode .lb-ann-item:hover{border-color:#0066ff;background:rgba(0,102,255,.03)}
.light-mode .lb-ann-tab.active{color:#0066ff;border-bottom-color:#0066ff}

/* ── Continue Reading Strip ── */
.lb-continue{margin-bottom:32px}
.lb-continue-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--sub);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.lb-continue-scroll{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.lb-continue-scroll::-webkit-scrollbar{height:3px}
.lb-continue-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.lb-continue-card{flex-shrink:0;width:200px;border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);scroll-snap-align:start;position:relative;overflow:hidden;background:rgba(255,255,255,.03);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.lb-continue-card:hover{border-color:rgba(0,225,255,.2);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.2),0 0 12px rgba(0,225,255,.06)}
.lb-continue-img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}
.lb-continue-fallback{width:100%;aspect-ratio:16/10;background:linear-gradient(135deg,rgba(0,225,255,.08),rgba(0,225,255,.02));display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--sub)}
.lb-continue-body{padding:10px}
.lb-continue-card-title{font-size:11px;font-weight:600;color:var(--text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-continue-card-time{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.lb-continue-progress{height:3px;background:rgba(255,255,255,.06);margin-top:6px;border-radius:2px;overflow:hidden}
.lb-continue-progress-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .3s}
.lb-continue-close{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);border:none;color:#fff;font-size:10px;width:18px;height:18px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.lb-continue-card:hover .lb-continue-close{opacity:1}
.light-mode .lb-continue-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.06)}
.light-mode .lb-continue-progress{background:rgba(0,0,0,.06)}
.light-mode .lb-continue-close{background:rgba(0,0,0,.4)}

/* ── Reading Lists / Collections ── */
.lb-coll-fab{position:fixed;bottom:180px;right:20px;z-index:9999;width:40px;height:40px;border-radius:50%;background:var(--bg);border:1px solid var(--accent);color:var(--accent);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.lb-coll-fab:hover{transform:scale(1.1)}
.lb-coll-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;background:var(--accent);color:#000;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px}
.lb-coll-panel{position:fixed;top:0;right:-360px;bottom:0;z-index:99992;width:340px;background:var(--bg);border-left:1px solid var(--accent);box-shadow:-8px 0 32px rgba(0,0,0,.3);display:flex;flex-direction:column;transition:right .25s cubic-bezier(.16,1,.3,1)}
.lb-coll-panel.show{right:0}
.lb-coll-panel-header{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.lb-coll-panel-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--sub)}
.lb-coll-panel-close{background:none;border:none;color:var(--sub);font-size:18px;cursor:pointer;padding:4px;transition:color .15s}
.lb-coll-panel-close:hover{color:var(--accent)}
.lb-coll-new{display:flex;gap:6px;padding:12px 16px;border-bottom:1px solid var(--border)}
.lb-coll-new input{flex:1;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;padding:6px 10px}
.lb-coll-new input::placeholder{color:var(--sub)}
.lb-coll-new-btn{background:var(--accent);color:#000;border:none;border-radius:4px;padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .15s}
.lb-coll-new-btn:hover{opacity:.85}
.lb-coll-scroll{flex:1;overflow-y:auto;padding:8px}
.lb-coll-item{padding:12px;border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all .15s;border-radius:6px;display:flex;align-items:center;gap:10px}
.lb-coll-item:hover{border-color:var(--accent);background:rgba(0,225,255,.03)}
.lb-coll-item.active{border-color:var(--accent);background:rgba(0,225,255,.06)}
.lb-coll-item-emoji{font-size:18px;flex-shrink:0}
.lb-coll-item-info{flex:1;min-width:0}
.lb-coll-item-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-coll-item-count{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);margin-top:2px}
.lb-coll-item-actions{display:flex;gap:4px;opacity:0;transition:opacity .15s}
.lb-coll-item:hover .lb-coll-item-actions{opacity:1}
.lb-coll-item-action{background:none;border:none;color:var(--sub);cursor:pointer;font-size:11px;padding:3px 5px;border-radius:3px;transition:all .15s}
.lb-coll-item-action:hover{color:var(--accent);background:rgba(0,225,255,.06)}
.lb-coll-item-action.del:hover{color:#ff4d6a;background:rgba(255,77,106,.06)}
.lb-coll-empty{text-align:center;color:var(--sub);font-size:12px;padding:30px 10px}
.lb-coll-empty-icon{font-size:24px;margin-bottom:8px}
.lb-coll-detail-header{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.lb-coll-back{background:none;border:none;color:var(--sub);cursor:pointer;font-size:14px;padding:4px;transition:color .15s}
.lb-coll-back:hover{color:var(--accent)}
.lb-coll-detail-title{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--sub);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-coll-article{padding:10px;border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all .15s;border-radius:4px;display:flex;align-items:center;gap:10px}
.lb-coll-article:hover{border-color:var(--accent);background:rgba(0,225,255,.03)}
.lb-coll-article-img{width:50px;height:34px;object-fit:cover;border-radius:3px;flex-shrink:0}
.lb-coll-article-fallback{width:50px;height:34px;background:linear-gradient(135deg,rgba(0,225,255,.08),rgba(0,225,255,.02));display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--sub);border-radius:3px;flex-shrink:0}
.lb-coll-article-info{flex:1;min-width:0}
.lb-coll-article-title{font-size:11px;font-weight:600;color:var(--text);display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.lb-coll-article-meta{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);margin-top:2px}
.lb-coll-article-rm{background:none;border:none;color:var(--sub);cursor:pointer;font-size:12px;padding:2px 4px;transition:color .15s;flex-shrink:0}
.lb-coll-article-rm:hover{color:#ff4d6a}
.lb-coll-popover{position:absolute;z-index:10002;background:#1a1a2e;border:1px solid var(--accent);border-radius:8px;padding:6px 0;box-shadow:0 8px 32px rgba(0,0,0,.5);width:220px;animation:lbQuoteFadeIn .12s ease-out;max-height:280px;overflow-y:auto}
.lb-coll-popover-item{display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;transition:background .12s;font-size:11px;color:var(--text)}
.lb-coll-popover-item:hover{background:rgba(0,225,255,.06)}
.lb-coll-popover-check{width:14px;height:14px;border:1.5px solid var(--border);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;transition:all .15s;flex-shrink:0}
.lb-coll-popover-check.checked{background:var(--accent);border-color:var(--accent);color:#000}
.lb-coll-popover-emoji{font-size:14px;flex-shrink:0}
.lb-coll-popover-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-coll-popover-divider{height:1px;background:var(--border);margin:4px 0}
.lb-coll-popover-new{display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;transition:background .12s;font-size:11px;color:var(--accent)}
.lb-coll-popover-new:hover{background:rgba(0,225,255,.06)}
.lb-coll-emoji-row{display:flex;gap:4px;padding:4px 12px;flex-wrap:wrap}
.lb-coll-emoji-opt{cursor:pointer;font-size:16px;padding:2px;border-radius:3px;transition:background .12s}
.lb-coll-emoji-opt:hover{background:rgba(0,225,255,.12)}
.lb-coll-chip-dropdown{position:absolute;top:100%;left:0;margin-top:4px;background:#1a1a2e;border:1px solid var(--accent);border-radius:6px;padding:4px 0;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:180px;z-index:1001;animation:lbQuoteFadeIn .1s ease-out;max-height:240px;overflow-y:auto}
.lb-coll-chip-wrap{position:relative;display:inline-block}
.light-mode .lb-coll-fab{background:#fff;border-color:#0066ff;color:#0066ff;box-shadow:0 4px 16px rgba(0,0,0,.1)}
.light-mode .lb-coll-badge{background:#0066ff;color:#fff}
.light-mode .lb-coll-panel{background:#fff;border-left-color:#d1d5db;box-shadow:-8px 0 32px rgba(0,0,0,.06)}
.light-mode .lb-coll-item:hover{border-color:#0066ff;background:rgba(0,102,255,.03)}
.light-mode .lb-coll-item.active{border-color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .lb-coll-new input{background:#f8fafc;border-color:#d1d5db;color:#1e293b}
.light-mode .lb-coll-new-btn{background:#0066ff;color:#fff}
.light-mode .lb-coll-popover{background:#fff;border-color:#d1d5db;box-shadow:0 8px 32px rgba(0,0,0,.08)}
.light-mode .lb-coll-popover-item:hover{background:rgba(0,102,255,.04)}
.light-mode .lb-coll-popover-check.checked{background:#0066ff;border-color:#0066ff;color:#fff}
.light-mode .lb-coll-article:hover{border-color:#0066ff;background:rgba(0,102,255,.03)}
.light-mode .lb-coll-chip-dropdown{background:#fff;border-color:#d1d5db;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.light-mode .lb-coll-item-action:hover{color:#0066ff;background:rgba(0,102,255,.04)}

/* ── History badge on feed cards ── */
.lb-card-v2-progress{height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:6px}
.lb-card-v2-progress-fill{height:100%;background:var(--accent);border-radius:2px}
.light-mode .lb-card-v2-progress{background:rgba(0,0,0,.06)}

/* ── Advanced Analytics Dashboard ── */
.lb-analytics-dash{font-family:'JetBrains Mono',monospace}
.lb-analytics-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.lb-date-pills{display:flex;gap:4px}
.lb-date-pill{padding:5px 14px;border:1px solid var(--border);background:none;color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:all .2s}
.lb-date-pill:first-child{border-radius:4px 0 0 4px}
.lb-date-pill:last-child{border-radius:0 4px 4px 0}
.lb-date-pill.active{background:var(--accent);color:var(--bg);border-color:var(--accent)}
.lb-date-pill:hover:not(.active){border-color:var(--accent);color:var(--accent)}
.lb-analytics-export{padding:5px 14px;border:1px solid var(--border);background:none;color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:all .2s;border-radius:4px;display:inline-flex;align-items:center;gap:6px}
.lb-analytics-export:hover{border-color:var(--accent);color:var(--accent)}

.lb-analytics-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:24px}
.lb-kpi-card{border:1px solid var(--border);padding:16px;position:relative;overflow:hidden}
.lb-kpi-value{font-size:26px;font-weight:700;color:var(--accent);line-height:1;margin-bottom:2px}
.lb-kpi-label{font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.lb-kpi-delta{font-size:9px;font-weight:600;display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:3px}
.lb-kpi-delta.up{color:#22c55e;background:rgba(34,197,94,.1)}
.lb-kpi-delta.down{color:#ef4444;background:rgba(239,68,68,.1)}
.lb-kpi-delta.flat{color:var(--sub);background:rgba(255,255,255,.05)}
.lb-kpi-sparkline{position:absolute;bottom:0;left:0;right:0;height:32px;opacity:.5}
.lb-kpi-sparkline svg{width:100%;height:100%;display:block}

.lb-analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media(max-width:768px){.lb-analytics-grid{grid-template-columns:1fr}}
.lb-analytics-panel{border:1px solid var(--border);padding:16px}
.lb-analytics-panel-title{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.lb-analytics-panel.full-width{grid-column:1/-1}

.lb-chart-area{position:relative;height:180px;margin-bottom:8px}
.lb-chart-area svg{width:100%;height:100%;overflow:visible}
.lb-chart-labels{display:flex;justify-content:space-between;font-size:8px;color:var(--sub);margin-top:4px}
.lb-chart-tooltip{position:absolute;pointer-events:none;background:var(--bg);border:1px solid var(--accent);padding:6px 10px;font-size:9px;color:var(--text);white-space:nowrap;z-index:10;opacity:0;transition:opacity .15s}

.lb-geo-row{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)}
.lb-geo-row:last-child{border-bottom:none}
.lb-geo-flag{width:20px;text-align:center;font-size:13px}
.lb-geo-name{flex:1;color:var(--text)}
.lb-geo-bar{width:100px;height:12px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;flex-shrink:0}
.lb-geo-bar-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .3s}
.lb-geo-count{width:40px;text-align:right;color:var(--sub);font-size:9px}
.light-mode .lb-geo-row{border-bottom-color:rgba(0,0,0,.04)}
.light-mode .lb-geo-bar{background:rgba(0,0,0,.06)}

.lb-donut-wrap{display:flex;align-items:center;gap:20px;justify-content:center}
.lb-donut-legend{display:flex;flex-direction:column;gap:6px}
.lb-donut-item{display:flex;align-items:center;gap:8px;font-size:9px;color:var(--text)}
.lb-donut-swatch{width:10px;height:10px;border-radius:2px;flex-shrink:0}
.lb-donut-pct{color:var(--sub);margin-left:auto;min-width:32px;text-align:right}

.lb-ref-row{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)}
.lb-ref-row:last-child{border-bottom:none}
.lb-ref-rank{color:var(--accent);font-weight:700;width:18px;text-align:center}
.lb-ref-domain{flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-ref-count{color:var(--sub);font-size:9px;width:40px;text-align:right}
.light-mode .lb-ref-row{border-bottom-color:rgba(0,0,0,.04)}

.lb-engagement-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:600px){.lb-engagement-metrics{grid-template-columns:1fr}}
.lb-eng-card{text-align:center;padding:12px;border:1px solid var(--border)}
.lb-eng-value{font-size:22px;font-weight:700;color:var(--accent);margin-bottom:2px}
.lb-eng-label{font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px}

.lb-tag-perf-row{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)}
.lb-tag-perf-row:last-child{border-bottom:none}
.lb-tag-perf-name{padding:2px 8px;border:1px solid var(--border);font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:var(--accent);min-width:60px;text-align:center}
.lb-tag-perf-bar{flex:1;height:12px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
.lb-tag-perf-bar-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .3s}
.lb-tag-perf-val{width:50px;text-align:right;color:var(--sub);font-size:9px}
.light-mode .lb-tag-perf-row{border-bottom-color:rgba(0,0,0,.04)}
.light-mode .lb-tag-perf-bar{background:rgba(0,0,0,.06)}

.lb-perf-table{width:100%;border-collapse:collapse;font-size:10px}
.lb-perf-table th{font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--sub);padding:8px 6px;border-bottom:2px solid var(--border);text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-size:8px}
.lb-perf-table th:hover{color:var(--accent)}
.lb-perf-table th .sort-arrow{font-size:8px;margin-left:2px;opacity:.4}
.lb-perf-table th.sorted .sort-arrow{opacity:1;color:var(--accent)}
.lb-perf-table td{padding:8px 6px;border-bottom:1px solid var(--border);color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.lb-perf-table td:first-child{font-weight:600;cursor:pointer;max-width:220px}
.lb-perf-table td:first-child:hover{color:var(--accent)}
.lb-perf-table tr:hover{background:rgba(0,225,255,.02)}
.light-mode .lb-perf-table th{border-bottom-color:#d1d5db}
.light-mode .lb-perf-table td{border-bottom-color:#e5e7eb}
.light-mode .lb-perf-table tr:hover{background:rgba(0,102,255,.02)}
.light-mode .lb-perf-table td:first-child:hover{color:#0066ff}

.lb-drill-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100020;display:flex;align-items:center;justify-content:center;animation:lbFadeIn .2s ease}
.lb-drill-modal{background:var(--bg);border:1px solid var(--border);max-width:700px;width:95%;max-height:85vh;overflow-y:auto;padding:24px;position:relative}
.lb-drill-close{position:absolute;top:12px;right:12px;background:none;border:1px solid var(--border);color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 10px;cursor:pointer;transition:all .2s}
.lb-drill-close:hover{border-color:var(--accent);color:var(--accent)}
.lb-drill-title{font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px;padding-right:60px}
.lb-drill-subtitle{font-size:9px;color:var(--sub);margin-bottom:20px;text-transform:uppercase;letter-spacing:.5px}
.lb-drill-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media(max-width:600px){.lb-drill-grid{grid-template-columns:1fr}}
.lb-drill-section{border:1px solid var(--border);padding:14px}
.lb-drill-section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--sub);margin-bottom:10px}
.lb-drill-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.lb-drill-kpi{text-align:center;padding:10px;border:1px solid var(--border)}
.lb-drill-kpi-value{font-size:20px;font-weight:700;color:var(--accent)}
.lb-drill-kpi-label{font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px}

.lb-reaction-bar-chart{display:flex;align-items:flex-end;gap:8px;height:80px;justify-content:center}
.lb-rx-bar-col{display:flex;flex-direction:column;align-items:center;gap:4px}
.lb-rx-bar{width:28px;background:var(--accent);border-radius:2px 2px 0 0;transition:height .3s;min-height:2px}
.lb-rx-bar-icon{font-size:14px}
.lb-rx-bar-val{font-size:8px;color:var(--sub)}

.light-mode .lb-date-pill.active{background:#0066ff;border-color:#0066ff}
.light-mode .lb-kpi-card{border-color:#d1d5db}
.light-mode .lb-kpi-value{color:#0066ff}
.light-mode .lb-analytics-panel{border-color:#d1d5db}
.light-mode .lb-drill-modal{background:#fff;border-color:#d1d5db}
.light-mode .lb-drill-section{border-color:#d1d5db}
.light-mode .lb-drill-kpi{border-color:#d1d5db}
.light-mode .lb-drill-kpi-value{color:#0066ff}
.light-mode .lb-eng-card{border-color:#d1d5db}
.light-mode .lb-eng-value{color:#0066ff}
.light-mode .lb-tag-perf-name{border-color:#d1d5db;color:#0066ff}
.light-mode .lb-rx-bar{background:#0066ff}
.light-mode .lb-geo-bar-fill{background:#0066ff}
.light-mode .lb-tag-perf-bar-fill{background:#0066ff}
.light-mode .lb-kpi-delta.flat{background:rgba(0,0,0,.04)}
.light-mode .lb-analytics-export:hover{border-color:#0066ff;color:#0066ff}
.light-mode .lb-date-pill:hover:not(.active){border-color:#0066ff;color:#0066ff}

/* ── B3: SEO Analyzer ── */
.lb-seo-toggle-btn{background:none;border:1px solid var(--border);color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;padding:3px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .2s}
.lb-seo-toggle-btn:hover{border-color:var(--accent);color:var(--accent)}
.lb-seo-grade{font-weight:700;min-width:18px;text-align:center;padding:1px 4px;border-radius:3px;font-size:8px}
.lb-seo-grade.grade-a{color:#22c55e;background:rgba(34,197,94,.1)}.lb-seo-grade.grade-b{color:#f59e0b;background:rgba(245,158,11,.1)}.lb-seo-grade.grade-c{color:#ef4444;background:rgba(239,68,68,.1)}.lb-seo-grade.grade-d{color:#dc2626;background:rgba(220,38,38,.15)}
.lb-seo-panel{border:1px solid var(--border);padding:14px;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(0,0,0,.2);max-height:300px;overflow-y:auto}
.lb-seo-header{display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:12px}
.lb-seo-close{background:none;border:none;color:var(--sub);cursor:pointer;font-size:16px;padding:0 4px}
.lb-seo-score-ring{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.lb-seo-checks{display:flex;flex-direction:column;gap:6px}
.lb-seo-check{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border:1px solid var(--border);font-size:9px;line-height:1.4}
.lb-seo-check .icon{font-size:12px;min-width:16px;text-align:center}
.lb-seo-check.pass .icon{color:#22c55e}.lb-seo-check.warn .icon{color:#f59e0b}.lb-seo-check.fail .icon{color:#ef4444}
.lb-seo-check .msg{flex:1;color:var(--text)}
.light-mode .lb-seo-panel{background:rgba(0,0,0,.03)}

/* ── B4: Writing Session Stats ── */
.lb-ws-stats{display:inline-flex;align-items:center;gap:8px;font-size:9px;color:var(--sub);margin-left:4px}
.lb-ws-wpm{color:var(--accent);font-weight:600}
.lb-ws-streak{color:#f59e0b;font-weight:600}
.lb-ws-goal{display:inline-flex;align-items:center;gap:3px}
.lb-ws-goal-ring{width:16px;height:16px}
.lb-ws-goal-ring circle{fill:none;stroke-width:2}
.lb-ws-goal-ring .bg{stroke:var(--border)}.lb-ws-goal-ring .fg{stroke:var(--accent);transition:stroke-dashoffset .3s}

/* ── B2: Content Calendar ── */
.lb-cal-panel{border:1px solid var(--border);padding:14px;margin-top:12px}
.lb-cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.lb-cal-title{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--sub)}
.lb-cal-nav{display:flex;gap:6px}
.lb-cal-nav button{background:none;border:1px solid var(--border);color:var(--sub);font-size:10px;padding:2px 8px;cursor:pointer;font-family:'JetBrains Mono',monospace}
.lb-cal-nav button:hover{border-color:var(--accent);color:var(--accent)}
.lb-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:12px}
.lb-cal-day-header{font-family:'JetBrains Mono',monospace;font-size:7px;text-transform:uppercase;text-align:center;color:var(--sub);padding:4px}
.lb-cal-cell{min-height:36px;border:1px solid transparent;padding:2px 4px;font-size:8px;color:var(--sub);cursor:pointer;position:relative;transition:border-color .2s}
.lb-cal-cell:hover{border-color:var(--border)}
.lb-cal-cell.today{border-color:var(--accent)}
.lb-cal-cell.other-month{opacity:.3}
.lb-cal-dot{width:4px;height:4px;border-radius:50%;position:absolute;bottom:3px;left:50%;transform:translateX(-50%)}
.lb-cal-dot.published{background:#22c55e}.lb-cal-dot.scheduled{background:#a855f7}.lb-cal-dot.draft{background:#f59e0b}
.lb-kanban{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
@media(max-width:768px){.lb-kanban{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.lb-kanban{grid-template-columns:1fr}}
.lb-kanban-col{border:1px solid var(--border);padding:8px;min-height:120px}
.lb-kanban-col-title{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--sub);padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between}
.lb-kanban-count{font-weight:400;color:var(--accent)}
.lb-kanban-card{padding:6px 8px;border:1px solid var(--border);margin-bottom:4px;cursor:grab;font-size:9px;transition:all .2s;background:var(--bg)}
.lb-kanban-card:hover{border-color:var(--accent)}
.lb-kanban-card.dragging{opacity:.5;border-style:dashed}
.lb-kanban-card-title{font-weight:600;color:var(--text);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-kanban-card-meta{font-size:7px;color:var(--sub)}
.lb-kanban-col.drag-over{background:rgba(0,225,255,.04);border-color:var(--accent)}

/* ── B6: Bulk Operations ── */
.lb-bulk-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--accent);margin-bottom:8px;font-family:'JetBrains Mono',monospace;font-size:9px;background:rgba(0,225,255,.04)}
.lb-bulk-count{color:var(--accent);font-weight:700}
.lb-bulk-actions{display:flex;gap:4px;margin-left:auto}

/* ── C3: Funnel Chart ── */
.lb-funnel{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0}
.lb-funnel-stage{display:flex;align-items:center;justify-content:center;height:28px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text);transition:width .3s;position:relative;min-width:60px}
.lb-funnel-label{position:absolute;left:calc(100% + 8px);white-space:nowrap;font-size:8px;color:var(--sub)}
.lb-funnel-value{font-weight:700;font-size:10px}

/* ── C4: Heatmap ── */
.lb-heatmap-wrap{overflow-x:auto}
.lb-heatmap{border-collapse:collapse;font-family:'JetBrains Mono',monospace}
.lb-heatmap td{width:20px;height:20px;text-align:center;font-size:7px;border:1px solid var(--bg);cursor:default;position:relative}
.lb-heatmap td:hover{outline:1px solid var(--accent)}
.lb-heatmap th{font-size:7px;color:var(--sub);padding:2px 4px;font-weight:400;text-transform:uppercase}
.lb-heatmap-tip{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--bg);border:1px solid var(--border);padding:4px 8px;font-size:8px;white-space:nowrap;z-index:10;pointer-events:none;display:none}
.lb-heatmap td:hover .lb-heatmap-tip{display:block}

/* ── C5: Forecast line ── */
.lb-forecast-line{stroke-dasharray:6,4;opacity:.6}
.lb-forecast-band{opacity:.06}

/* ── C6: Radar Chart ── */
.lb-radar-wrap{display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap}
.lb-radar-legend{display:flex;flex-direction:column;gap:4px;font-family:'JetBrains Mono',monospace;font-size:9px}
.lb-radar-item{display:flex;align-items:center;gap:6px}
.lb-radar-swatch{width:10px;height:10px;border-radius:2px}
.lb-compare-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100020;display:flex;align-items:center;justify-content:center;animation:lbFadeIn .2s ease}
.lb-compare-modal{background:var(--bg);border:1px solid var(--border);max-width:700px;width:95%;max-height:85vh;overflow-y:auto;padding:24px;position:relative}
.lb-compare-close{position:absolute;top:12px;right:12px;background:none;border:1px solid var(--border);color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 10px;cursor:pointer;transition:all .2s}
.lb-compare-close:hover{border-color:var(--accent);color:var(--accent)}

@keyframes lbFadeIn{from{opacity:0}to{opacity:1}}

/* ── Print ── */
@media print{
  #blogView{display:block!important;padding:0}
  .lb-nav,.lb-article-footer,.lb-nav-back,.lb-progress-bar,.lb-progress-meta,.lb-toc,.lb-copy-btn,.lb-reactions,.lb-comments-section,.lb-quote-tooltip,.lb-feed-filters,.lb-search-wrap,.lb-newsletter,.lb-related,.lb-tts-player,.lb-tts-btn,.lb-series-nav,.lb-reading-fab,.lb-reading-panel,.lb-lightbox,.lb-share-panel,.lb-author-card,.lb-tag-filters,.lb-transition,.lb-ann-fab,.lb-ann-panel,.lb-hl-toolbar,.lb-note-popover,.lb-continue,.lb-coll-fab,.lb-coll-panel,.lb-coll-popover,.lb-sidebar,.lb-sidebar-toggle,.lb-sidebar-overlay{display:none!important}
  .lb-reveal,.lb-reveal-left{opacity:1!important;transform:none!important}
  .lb-hl{background:rgba(255,230,0,.3)!important}
  .lb-content{font-size:12pt;line-height:1.6;color:#000}
  .lb-article-h1{font-size:22pt;color:#000}
}

/* ── Inline Nav Menu Button (all sizes) ── */
.lb-nav-menu{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:var(--sub);cursor:pointer;font-size:14px;flex-shrink:0;transition:all .2s;padding:0}
.lb-nav-menu:hover{border-color:var(--accent);color:var(--accent)}
.light-mode .lb-nav-menu{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06);color:#64748b}
.light-mode .lb-nav-menu:hover{border-color:#0066ff;color:#0066ff}
.lb-sidebar-toggle.blog-active{display:none!important}

/* ── Mobile Blog Redesign (must be last to override all base rules) ── */
@media(max-width:768px){
  body.blog-mobile-active .top-btns{display:flex!important;z-index:10002;position:fixed}
  .lb-sidebar{width:min(220px,70vw)}
  .lb-rss-btn{display:none!important}
  .lb-nav-menu{width:24px;height:24px;border-radius:5px;font-size:10px}
  #blogView{padding:0}
  .lb-wrap{padding:0 0 40px;border-radius:0;border:none;box-shadow:none;background:rgba(6,8,15,.4);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  .light-mode .lb-wrap{background:rgba(255,255,255,.94);box-shadow:none;border:none}
  .lb-nav{margin:0;padding:6px 10px;border-radius:0;gap:6px;position:sticky;top:0;z-index:100;background:rgba(6,8,15,.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:none}
  .light-mode .lb-nav{background:rgba(255,255,255,.94);border-bottom:none}
  .lb-nav-brand{font-size:7px;letter-spacing:1px;opacity:.5}
  .lb-nav-sep{height:10px}
  .lb-nav-back{font-size:7px;gap:3px}
  .lb-nav-back span{display:none}
  .lb-feed-header{margin:0;padding:16px 14px 12px;border-radius:0;border:none;background:transparent}
  .light-mode .lb-feed-header{background:linear-gradient(180deg,rgba(255,255,255,.15),transparent)}
  .lb-feed-title{font-size:16px;line-height:1.2;margin-bottom:4px;letter-spacing:0}
  .lb-feed-sub{font-size:8px;letter-spacing:.4px;opacity:.65;margin-bottom:0}
  .lb-feed-line{width:32px;margin-top:8px;height:2px;border-radius:1px}
  .lb-search-wrap{margin:0 12px 12px}
  .lb-search-bar{font-size:13px;padding:9px 12px 9px 32px;border-radius:8px}
  .light-mode .lb-search-bar{background:rgba(255,255,255,.65);border-color:rgba(0,0,0,.05);box-shadow:0 1px 4px rgba(0,0,0,.03),inset 0 1px 0 rgba(255,255,255,.8)}
  .lb-search-icon{left:10px;font-size:11px}
  .lb-tag-filters{margin:0 12px 12px;gap:5px}
  .lb-tag-chip{padding:4px 10px;font-size:8px;border-radius:12px}
  .light-mode .lb-tag-chip{background:rgba(255,255,255,.55);border-color:rgba(0,0,0,.04);box-shadow:0 1px 2px rgba(0,0,0,.03)}
  #lbGrid{padding:0 10px}
  .lb-grid{gap:8px}
  .lb-card{padding:14px;border-radius:10px}
  .light-mode .lb-card{background:rgba(255,255,255,.55);border-color:rgba(0,0,0,.04);box-shadow:0 1px 6px rgba(0,0,0,.03),inset 0 1px 0 rgba(255,255,255,.7)}
  .lb-card-title{font-size:15px;margin-bottom:4px;line-height:1.3}
  .lb-card-excerpt{font-size:13px;line-height:1.55;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .lb-card-date{font-size:8px;margin-bottom:4px}
  .lb-card-meta{font-size:8px;gap:6px;flex-wrap:wrap}
  .lb-card-tag{font-size:7px;padding:2px 6px;border-radius:4px}
  .lb-skeleton{padding:14px;border-radius:10px;margin-bottom:8px}
  .lb-newsletter{margin:16px 10px 0;padding:16px 14px;border-radius:10px}
  .light-mode .lb-newsletter{background:linear-gradient(135deg,rgba(0,102,255,.03),rgba(100,160,255,.05));border-color:rgba(0,102,255,.06);box-shadow:0 1px 6px rgba(0,0,0,.02)}
  .lb-newsletter-title{font-size:9px}
  .lb-newsletter-sub{font-size:8px}
  .lb-newsletter-form{flex-direction:column;gap:6px}
  .lb-newsletter-form input{border-radius:8px;font-size:13px;padding:9px 12px}
  .lb-newsletter-form button{border-radius:8px;padding:9px;font-size:8px}
  .lb-empty,.lb-404{padding:40px 14px;border-radius:10px;margin:0 10px}
  .lb-article-header{padding:16px 14px;border-radius:0;border:none;margin-bottom:20px}
  .light-mode .lb-article-header{background:linear-gradient(180deg,rgba(255,255,255,.2),transparent)}
  .lb-article-h1{font-size:18px;letter-spacing:0}
  .lb-article-excerpt{font-size:14px}
  .lb-article-meta{font-size:8px;gap:12px}
  .lb-article-footer{margin:24px 12px 0;padding:14px;border-radius:10px;flex-direction:column;align-items:flex-start;gap:8px}
  .lb-content{padding:0 14px;font-size:15px;line-height:1.75}
  .lb-content h2{font-size:18px;margin:32px 0 10px;padding-top:20px}
  .lb-content h3{font-size:16px;margin:24px 0 8px}
  .lb-content p{margin:0 0 16px}
  .lb-content pre{border-radius:8px;padding:12px 14px;margin:16px 0;font-size:11.5px}
  .lb-content blockquote{padding:12px 14px;margin:16px 0;border-radius:0 8px 8px 0}
  .lb-content img{border-radius:8px;margin:16px 0}
  .lb-content ul,.lb-content ol{padding-left:18px;margin:0 0 16px}
  .lb-continue{padding:0 10px}
  .lb-continue-card{width:140px;border-radius:10px}
  #lbNewsletter{padding:0}
}
@media(max-width:400px){
  .lb-feed-title{font-size:14px}
  .lb-card-title{font-size:14px}
  .lb-card-excerpt{font-size:12px;-webkit-line-clamp:2}
  .lb-content{font-size:14px}
  .lb-article-h1{font-size:16px}
}
`;
    document.head.appendChild(css);

    /* ═══════════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════════ */
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const snd = t => { if (window._sonification && window._sonification[t]) window._sonification[t](); else if (window._haptic && window._haptic[t]) window._haptic[t](); };

    /* ── Editor value abstraction (CM6 + textarea fallback) ── */
    function _getEditorValue() {
        if (_cmView) return _cmView.state.doc.toString();
        var ta = document.getElementById('lbCmsContent');
        return ta ? ta.value : '';
    }

    function _setEditorValue(text) {
        if (_cmView) {
            _cmView.dispatch({ changes: { from: 0, to: _cmView.state.doc.length, insert: text || '' } });
        }
        var ta = document.getElementById('lbCmsContent');
        if (ta) ta.value = text || '';
    }

    function _getEditorSelection() {
        if (_cmView) {
            var sel = _cmView.state.selection.main;
            var doc = _cmView.state.doc.toString();
            return { start: sel.from, end: sel.to, text: doc.slice(sel.from, sel.to), doc: doc };
        }
        var ta = document.getElementById('lbCmsContent');
        if (!ta) return { start: 0, end: 0, text: '', doc: '' };
        return { start: ta.selectionStart, end: ta.selectionEnd, text: ta.value.slice(ta.selectionStart, ta.selectionEnd), doc: ta.value };
    }

    function _editorDispatch(from, to, insert, selectFrom, selectTo) {
        if (_cmView) {
            var spec = { changes: { from: from, to: to, insert: insert } };
            if (selectFrom !== undefined) {
                spec.selection = { anchor: selectFrom, head: selectTo !== undefined ? selectTo : selectFrom };
            }
            _cmView.dispatch(spec);
            _cmView.focus();
            return;
        }
        var ta = document.getElementById('lbCmsContent');
        if (!ta) return;
        ta.value = ta.value.slice(0, from) + insert + ta.value.slice(to);
        ta.selectionStart = selectFrom !== undefined ? selectFrom : from + insert.length;
        ta.selectionEnd = selectTo !== undefined ? selectTo : ta.selectionStart;
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }

    /* ── Formatting helpers (CM6-aware) ── */
    function insertAtCursor(text) {
        var sel = _getEditorSelection();
        _editorDispatch(sel.start, sel.end, text, sel.start + text.length, sel.start + text.length);
    }

    function wrapSelection(before, after, placeholder) {
        var sel = _getEditorSelection();
        var inner = sel.text || placeholder || '';
        var replacement = before + inner + (after || '');
        var selStart = sel.start + before.length;
        var selEnd = selStart + inner.length;
        _editorDispatch(sel.start, sel.end, replacement, selStart, selEnd);
    }

    function insertLineFormat(prefix, placeholder) {
        var sel = _getEditorSelection();
        if (sel.text && sel.text.includes('\n')) {
            var lines = sel.text.split('\n').map(function(l) { return prefix + l; });
            var replacement = lines.join('\n');
            _editorDispatch(sel.start, sel.end, replacement, sel.start, sel.start + replacement.length);
        } else {
            var needsNewline = sel.start > 0 && sel.doc[sel.start - 1] !== '\n' ? '\n' : '';
            var inner = sel.text || placeholder;
            var text = needsNewline + prefix + inner;
            var cursorStart = sel.start + needsNewline.length + prefix.length;
            _editorDispatch(sel.start, sel.end, text, cursorStart, cursorStart + inner.length);
        }
    }

    function insertBlock(block) {
        var sel = _getEditorSelection();
        var pre = sel.start > 0 && sel.doc[sel.start - 1] !== '\n' ? '\n\n' : (sel.start > 1 && sel.doc[sel.start - 2] !== '\n' ? '\n' : '');
        var text = pre + block + '\n\n';
        var cursorPos = sel.start + pre.length + block.indexOf('\n') + 1;
        if (cursorPos <= sel.start + pre.length) cursorPos = sel.start + text.length;
        _editorDispatch(sel.start, sel.end, text, cursorPos, cursorPos);
    }

    function insertFormat(fmt) {
        const formats = {
            bold: () => wrapSelection('**', '**', 'bold text'),
            italic: () => wrapSelection('*', '*', 'italic text'),
            strike: () => wrapSelection('~~', '~~', 'strikethrough'),
            code: () => wrapSelection('`', '`', 'code'),
            h2: () => insertLineFormat('## ', 'Heading 2'),
            h3: () => insertLineFormat('### ', 'Heading 3'),
            h4: () => insertLineFormat('#### ', 'Heading 4'),
            link: () => {
                var sel = _getEditorSelection();
                if (sel.text.startsWith('http')) {
                    wrapSelection('[link text](', ')', sel.text);
                } else {
                    wrapSelection('[', '](https://)', sel.text || 'link text');
                }
            },
            image: () => { if (window._articleImgInput) window._articleImgInput.click(); else insertAtCursor('![alt text](https://image-url)'); },
            quote: () => insertLineFormat('> ', 'Quote text'),
            ul: () => insertLineFormat('- ', 'List item'),
            ol: () => insertLineFormat('1. ', 'First item'),
            checklist: () => insertLineFormat('- [ ] ', 'Task item'),
            codeblock: () => insertBlock('```javascript\n// code here\n```'),
            table: () => insertBlock('| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |'),
            hr: () => insertAtCursor('\n\n---\n\n'),
            callout: () => insertBlock('<div class="callout callout-note">\n<div class="callout-title">\u2139\ufe0f NOTE</div>\n\nYour note content here.\n\n</div>'),
            details: () => insertBlock('<details>\n<summary>Click to expand</summary>\n\nHidden content goes here.\n\n</details>'),
        };
        if (formats[fmt]) {
            formats[fmt]();
            snd('tap');
        }
    }

    /* ── Post-process rendered HTML for callout shorthand ── */
    function postProcessHtml(html) {
        // Convert > [!NOTE], > [!TIP], > [!WARNING], > [!DANGER] blockquotes
        // These are rendered as <blockquote> by marked, with the first line being [!TYPE]
        html = html.replace(
            /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|DANGER|IMPORTANT|CAUTION|QUOTE)\]\s*<br\s*\/?>\s*/gi,
            (_, type) => {
                const t = type.toUpperCase();
                const icons = { NOTE: '\u2139\ufe0f', TIP: '\ud83d\udca1', WARNING: '\u26a0\ufe0f', DANGER: '\ud83d\uded1', IMPORTANT: '\u2757', CAUTION: '\ud83d\udea8', QUOTE: '\u275d' };
                const cls = { NOTE: 'note', TIP: 'tip', WARNING: 'warning', DANGER: 'danger', IMPORTANT: 'warning', CAUTION: 'danger', QUOTE: 'quote' };
                return `<div class="callout callout-${cls[t] || 'note'}"><div class="callout-title">${icons[t] || ''} ${t}</div><p>`;
            }
        );
        html = html.replace(/<\/p>\s*<\/blockquote>/g, (match) => {
            // Only close callout divs, not regular blockquotes
            return '</p></div>';
        });
        return html;
    }

    function readingTime(text) {
        const w = (text || '').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(w / 200)) + ' min read';
    }

    function fmtDate(d) {
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return 'Unknown date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return 'Unknown date'; }
    }

    function slugify(str) {
        return (str || '').toLowerCase().trim()
            .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    }

    function parseMarkdown(md) {
        if (window.marked && window.marked.parse) {
            window.marked.setOptions({ breaks: true, gfm: true });
            return processEmbeds(postProcessHtml(window.marked.parse(md || '')));
        }
        let s = esc(md || '');
        s = s.replace(/```([\s\S]*?)```/g, (_, code) => '<pre><code>' + code.trim() + '</code></pre>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/`(.+?)`/g, '<code>$1</code>');
        s = s.replace(/\n/g, '<br>');
        return processEmbeds(s);
    }

    function processEmbeds(html) {
        // YouTube
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-embed"><div class="lb-yt-embed"><iframe src="https://www.youtube-nocookie.com/embed/$1" allowfullscreen loading="lazy" title="YouTube video"></iframe></div></div>');
        // Twitter / X
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*https?:\/\/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-tweet-embed"><blockquote class="twitter-tweet" data-dnt="true"><a href="https://twitter.com/$1/status/$2"></a></blockquote></div>');
        // CodePen
        html = html.replace(/<p>\s*(?:<a[^>]*>)?\s*https?:\/\/codepen\.io\/([\w-]+)\/pen\/([\w-]+)[^\s<]*\s*(?:<\/a>)?\s*<\/p>/gi,
            '<div class="lb-codepen-embed"><iframe src="https://codepen.io/$1/embed/$2?default-tab=result&theme-id=dark" loading="lazy" title="CodePen"></iframe></div>');
        return html;
    }

    // Debounce helper for live preview
    function debounce(fn, ms) {
        let t;
        return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    }

    /* ═══════════════════════════════════════════════════
       A1: WEB WORKER FOR MARKDOWN PARSING
       ═══════════════════════════════════════════════════ */
    var _mdWorker = null;
    var _mdWorkerReady = false;
    var _mdWorkerCallbacks = new Map();
    var _mdWorkerSeq = 0;

    function _initMdWorker() {
        if (_mdWorker || typeof Worker === 'undefined') return;
        try {
            var src = `
                var markedLoaded = false;
                var markedRef = null;
                self.onmessage = function(e) {
                    var d = e.data;
                    if (d.type === 'init') {
                        try {
                            importScripts(d.markedUrl);
                            markedRef = self.marked || (typeof marked !== 'undefined' ? marked : null);
                            if (markedRef) { markedLoaded = true; self.postMessage({type:'ready'}); }
                            else { self.postMessage({type:'error',error:'marked.js loaded but not found on global'}); }
                        }
                        catch(err) { self.postMessage({type:'error',error:'Failed to load marked.js: ' + err.message}); }
                        return;
                    }
                    if (d.type === 'parse') {
                        if (!markedLoaded || !markedRef) { self.postMessage({type:'result',id:d.id,html:'',fallback:true}); return; }
                        try {
                            markedRef.setOptions({breaks:true,gfm:true});
                            var html = markedRef.parse(d.md || '');
                            self.postMessage({type:'result',id:d.id,html:html});
                        } catch(err) { self.postMessage({type:'result',id:d.id,html:'',fallback:true}); }
                    }
                };
            `;
            var blob = new Blob([src], { type: 'application/javascript' });
            _mdWorker = new Worker(URL.createObjectURL(blob));
            _mdWorker.onmessage = function(e) {
                var d = e.data;
                if (d.type === 'ready') { _mdWorkerReady = true; return; }
                if (d.type === 'result') {
                    var cb = _mdWorkerCallbacks.get(d.id);
                    if (cb) { _mdWorkerCallbacks.delete(d.id); cb(d.html, d.fallback); }
                }
            };
            _mdWorker.onerror = function() { _mdWorkerReady = false; _mdWorker = null; };
            var markedScript = document.querySelector('script[src*="marked"]');
            var markedUrl = markedScript ? markedScript.src : 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            _mdWorker.postMessage({ type: 'init', markedUrl: markedUrl });
        } catch (e) { _mdWorker = null; }
    }

    function parseMarkdownAsync(md, callback) {
        if (_mdWorker && _mdWorkerReady) {
            var id = ++_mdWorkerSeq;
            _mdWorkerCallbacks.set(id, function(html, fallback) {
                if (fallback) { callback(parseMarkdown(md)); return; }
                callback(processEmbeds(postProcessHtml(html)));
            });
            _mdWorker.postMessage({ type: 'parse', id: id, md: md || '' });
        } else {
            callback(parseMarkdown(md));
        }
    }

    _initMdWorker();

    /* ═══════════════════════════════════════════════════
       A2: requestIdleCallback SCHEDULING
       ═══════════════════════════════════════════════════ */
    var _ric = window.requestIdleCallback || function(cb) { return setTimeout(cb, 16); };
    var _ricCancel = window.cancelIdleCallback || clearTimeout;

    function scheduleIdle(fn, timeout) {
        return _ric(fn, { timeout: timeout || 500 });
    }

    function debounceIdle(fn, ms, idleTimeout) {
        var timer, idleHandle;
        return function() {
            var args = arguments, ctx = this;
            clearTimeout(timer);
            if (idleHandle) _ricCancel(idleHandle);
            timer = setTimeout(function() {
                idleHandle = scheduleIdle(function() { fn.apply(ctx, args); }, idleTimeout || 500);
            }, ms);
        };
    }

    /* ═══════════════════════════════════════════════════
       A3: VIRTUAL SCROLLER
       ═══════════════════════════════════════════════════ */
    function _VirtualScroller(container, rowHeight, renderRow, totalCount) {
        var self = this;
        self.container = container;
        self.rowH = rowHeight || 40;
        self.renderRow = renderRow;
        self.total = totalCount || 0;
        self.buffer = 5;
        self._items = [];
        self._scrollEl = null;
        self._innerEl = null;
        self._raf = null;
        self._lastStart = -1;
        self._lastEnd = -1;

        self.mount = function() {
            container.style.overflow = 'auto';
            container.style.position = 'relative';
            self._innerEl = document.createElement('div');
            self._innerEl.style.cssText = 'position:relative;width:100%';
            self._innerEl.style.height = (self.total * self.rowH) + 'px';
            container.innerHTML = '';
            container.appendChild(self._innerEl);
            container.addEventListener('scroll', self._onScroll);
            self._render();
        };

        self.update = function(newTotal, newRender) {
            self.total = newTotal;
            if (newRender) self.renderRow = newRender;
            if (self._innerEl) self._innerEl.style.height = (self.total * self.rowH) + 'px';
            self._lastStart = -1;
            self._render();
        };

        self._onScroll = function() {
            if (self._raf) return;
            self._raf = requestAnimationFrame(function() { self._raf = null; self._render(); });
        };

        self._render = function() {
            if (!self._innerEl) return;
            var scrollTop = container.scrollTop;
            var viewH = container.clientHeight;
            var start = Math.max(0, Math.floor(scrollTop / self.rowH) - self.buffer);
            var end = Math.min(self.total, Math.ceil((scrollTop + viewH) / self.rowH) + self.buffer);
            if (start === self._lastStart && end === self._lastEnd) return;
            self._lastStart = start;
            self._lastEnd = end;
            var frag = document.createDocumentFragment();
            for (var i = start; i < end; i++) {
                var row = self.renderRow(i);
                if (row) {
                    row.style.position = 'absolute';
                    row.style.top = (i * self.rowH) + 'px';
                    row.style.width = '100%';
                    frag.appendChild(row);
                }
            }
            self._innerEl.innerHTML = '';
            self._innerEl.style.height = (self.total * self.rowH) + 'px';
            self._innerEl.appendChild(frag);
        };

        self.destroy = function() {
            container.removeEventListener('scroll', self._onScroll);
            if (self._raf) cancelAnimationFrame(self._raf);
        };
    }

    /* ═══════════════════════════════════════════════════
       DOM REFERENCES
       ═══════════════════════════════════════════════════ */
    const app = document.getElementById('app');
    const blogView = document.getElementById('blogView');
    const adminDialog = document.getElementById('blogAdmin');

    if (!blogView) return; // Guard: element must exist

    /* ── Collapsible Sidebar ── */
    var _sidebarEl = null;
    var _sidebarToggle = null;
    var _sidebarOverlay = null;
    var _sidebarOpen = false;

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
                    if (typeof generateRSS === 'function') generateRSS();
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
        if (_sidebarOpen) _closeSidebar(); else _openSidebar();
    }

    function _openSidebar() {
        if (!_sidebarEl) return;
        _sidebarOpen = true;
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
        _sidebarOpen = false;
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

    // Immediately hide portfolio if URL indicates blog route — prevents intro flash
    (function earlyRouteCheck() {
        var p = new URLSearchParams(window.location.search);
        if (p.has('blog') || p.has('post') || p.has('review')) {
            if (app) app.style.display = 'none';
            blogView.style.display = 'block';
            blogView.classList.add('active');
        }
    })();

    /* ═══════════════════════════════════════════════════
       STATE
       ═══════════════════════════════════════════════════ */
    let articles = [];
    let currentArticle = null;
    let adminSession = null;
    let editingArticle = null;

    /* ── Unsaved changes guard (outer scope for cross-function access) ── */
    let _cmsHasUnsaved = false;
    function _markCmsDirty() { _cmsHasUnsaved = true; }
    function _markCmsClean() { _cmsHasUnsaved = false; }
    const _cmsBeforeUnload = function(e) { if (_cmsHasUnsaved) { e.preventDefault(); e.returnValue = ''; } };

    /* ── Fetch cache & abort ── */
    const _fetchCache = new Map();
    const CACHE_TTL = 60000;
    let _activeAbort = null;

    function _getCached(key) {
        const entry = _fetchCache.get(key);
        if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
        _fetchCache.delete(key);
        return null;
    }
    function _setCache(key, data) {
        _fetchCache.set(key, { data, ts: Date.now() });
    }
    function _abortPrevious() {
        if (_activeAbort) { _activeAbort.abort(); }
        _activeAbort = new AbortController();
        return _activeAbort.signal;
    }

    /* ── Page transition & scroll reveal state ── */
    var _transitionEl = null;
    var _transitionActive = false;
    var _scrollRevealObserver = null;
    var _feedScrollY = 0;
    var _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const originalTitle = document.title;

    /* ── Reader annotations & reading history state ── */
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

    /* ═══════════════════════════════════════════════════
       PAGE TRANSITIONS & SCROLL REVEALS
       ═══════════════════════════════════════════════════ */
    function _ensureTransitionEl() {
        if (_transitionEl) return _transitionEl;
        _transitionEl = document.createElement('div');
        _transitionEl.className = 'lb-transition';
        document.body.appendChild(_transitionEl);
        return _transitionEl;
    }

    function transitionTo(callback) {
        if (_reducedMotion) { callback(); return; }
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
        if (_reducedMotion) {
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
    }

    /* ═══════════════════════════════════════════════════
       ROUTER
       ═══════════════════════════════════════════════════ */
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
        if (getRoute().view === 'feed') _feedScrollY = window.scrollY;
        const url = new URL(window.location.origin + window.location.pathname);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        window.history.pushState({}, '', url);
        transitionTo(function() { _handleRouteCore(); });
    }

    function goToPortfolio() {
        const url = new URL(window.location.origin + window.location.pathname);
        window.history.pushState({}, '', url);
        transitionTo(function() { _handleRouteCore(); });
    }

    function handleRoute() {
        _handleRouteCore();
    }

    function _handleRouteCore() {
        _routeGen++;
        _destroyScrollReveals();
        const route = getRoute();

        if (route.view === 'feed') {
            showBlogView();
            renderFeed();
        } else if (route.view === 'article') {
            showBlogView();
            renderArticle(route.slug);
        } else if (route.view === 'review') {
            showBlogView();
            renderReview(route.token);
        } else {
            showPortfolio();
        }
    }

    function showBlogView() {
        var forceCSS = document.getElementById('portfolioForceCSS');
        if (forceCSS) forceCSS.remove();
        if (app) app.style.setProperty('display', 'none', 'important');
        blogView.classList.add('active');
        blogView.style.display = 'block';
        document.body.classList.add('blog-mobile-active');
        var ww = document.getElementById('weatherWidget');
        if (ww) ww.style.display = 'none';
        document.querySelectorAll('.smart-cta').forEach(el => {
            if (el) el.dataset.blogHidden = el.style.display || '';
            if (el) el.style.display = 'none';
        });
        _showSidebarToggle();
        window.scrollTo(0, 0);
    }

    function showPortfolio() {
        document.body.classList.remove('blog-mobile-active');
        var ww = document.getElementById('weatherWidget');
        if (ww) ww.style.display = '';
        _hideSidebarToggle();
        _destroyScrollReveals();
        destroyProgressBar();
        destroyTextSelection();
        destroyTTS();
        destroyReadingSettings();
        destroyLightbox();
        _destroyReadingHistory();
        destroyAnnotationsPanel();
        destroyCollectionsPanel();
        var _orphanTip = document.querySelector('.lb-footnote-tooltip');
        if (_orphanTip) _orphanTip.remove();
        restoreOGMeta();
        removeArticleJsonLd();
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

        if (app) {
            app.style.removeProperty('display');
            app.style.opacity = '1';
        }
        blogView.classList.remove('active');
        blogView.style.display = 'none';
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
                blogView.classList.remove('active');
                blogView.style.display = 'none';
                document.title = originalTitle;
                window.history.replaceState(null, '', window.location.pathname);
                window.location.reload();
                return;
            }
        }
        document.title = originalTitle;
        window.scrollTo(0, 0);
    }

    window.addEventListener('popstate', function() {
        transitionTo(function() { _handleRouteCore(); });
    });

    // ESC / Backspace navigate back when blog view is active
    // Capture phase so it fires before the unified ESC handler in site.js
    document.addEventListener('keydown', function(e) {
        if (!blogView.classList.contains('active')) return;
        if (e.key !== 'Escape' && e.key !== 'Backspace') return;
        var tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (_sidebarOpen) { e.preventDefault(); e.stopPropagation(); _closeSidebar(); return; }
        if (adminDialog && adminDialog.open) return;
        var ids = ['passkeyOverlay','shareOverlay','trophyOverlay','termOverlay','gameOverlay','shortcutOverlay','arcadeOverlay','miniGameOverlay','guestbookOverlay','gameCaseOverlay','ai3dOverlay','ttsReaderOverlay','cmdPaletteOverlay','nftMatOverlay','blogOverlay','easterEgg'];
        for (var i = 0; i < ids.length; i++) { var el = document.getElementById(ids[i]); if (el && (el.classList.contains('show') || el.classList.contains('visible'))) return; }
        e.preventDefault();
        e.stopPropagation();
        var route = getRoute();
        if (route.view === 'article') navigateTo({ blog: 'feed' });
        else goToPortfolio();
    }, true);

    /* ═══════════════════════════════════════════════════
       SKELETONS
       ═══════════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════════
       FEED VIEW
       ═══════════════════════════════════════════════════ */
    async function renderFeed() {
        destroyProgressBar();
        destroyTextSelection();
        destroyTTS();
        destroyReadingSettings();
        destroyLightbox();
        _destroyReadingHistory();
        destroyAnnotationsPanel();
        destroyCollectionsPanel();
        _updateSidebarActive('feed');
        var _orphanTip = document.querySelector('.lb-footnote-tooltip');
        if (_orphanTip) _orphanTip.remove();
        blogView.innerHTML = `
      <div class="lb-wrap" style="max-width:900px">
        <nav class="lb-nav" role="navigation" aria-label="Blog navigation">
          <div style="display:flex;align-items:center;gap:8px">
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
        <main id="lbGrid" role="feed" aria-label="Article list">${feedSkeleton()}</main>
        <div id="lbNewsletter"></div>
      </div>`;

        // Bind nav
        document.getElementById('lbBrandHome').addEventListener('click', e => { e.preventDefault(); goToPortfolio(); });
        document.getElementById('lbBrandHome').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goToPortfolio(); } });
        document.getElementById('lbNavMenu').addEventListener('click', function(){ _openSidebar(); });

        // Update page title, meta, and SEO tags
        document.title = 'Blog — Amr Elharony';
        updateMeta('The Bilingual Executive Blog — Deep dives on Agile, FinTech, and Digital Transformation by Amr Elharony.');
        updateCanonical('?blog=feed');
        restoreOGMeta();
        removeArticleJsonLd();

        // Focus management for SPA route change (a11y)
        blogView.setAttribute('tabindex', '-1');
        blogView.focus({ preventScroll: true });

        // Bind search
        bindSearchBar();

        // Bind RSS
        document.getElementById('lbRssBtn').addEventListener('click', generateRSS);

        // Reveal above-fold elements (header, search) immediately — don't wait for fetch
        var feedWrap = blogView.querySelector('.lb-wrap');
        if (feedWrap) _initScrollReveals(feedWrap);

        // Fetch articles
        await fetchArticles();

        // Merge cloud data, then render Continue Reading strip
        await _mergeCloudReadingHistory();
        await _mergeCloudLists();
        renderContinueReading();

        // Render newsletter signup
        renderNewsletter();

        // Observe any newly added elements (newsletter, continue reading, etc.)
        if (feedWrap) _initScrollReveals(feedWrap);
    }

    async function fetchArticles() {
        const gen = _routeGen;
        const grid = document.getElementById('lbGrid');
        if (!grid) return;

        if (!window._sb) {
            grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">\ud83d\udce1</div>Unable to connect. Please try again later.</div>';
            return;
        }

        const cacheKey = 'feed';
        const cached = _getCached(cacheKey);

        try {
            let data, error;
            if (cached) {
                data = cached;
                error = null;
            } else {
                const signal = _abortPrevious();
                const res = await window._sb
                    .from('longform_articles')
                    .select('id,title,slug,excerpt,created_at,tags,views,published,series_name,cover_image,reactions')
                    .eq('published', true)
                    .order('created_at', { ascending: false })
                    .limit(PAGE_SIZE)
                    .abortSignal(signal);
                data = res.data;
                error = res.error;
                if (!error && data) _setCache(cacheKey, data);
            }

            if (gen !== _routeGen) return;

            if (error) throw error;
            articles = data || [];

            if (!articles.length) {
                grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">✍️</div>No articles published yet.<br>Check back soon.</div>';
                return;
            }

            _allFeedArticles = articles;
            _migrateBookmarks();
            _ensureDefaultList();
            buildTagFilters(articles);
            renderFeedCards(articles);
            bindFeedFilters();

            if (_feedScrollY > 0) {
                window.scrollTo(0, _feedScrollY);
                grid.querySelectorAll('.lb-reveal').forEach(function(el) {
                    if (el.getBoundingClientRect().top < window.innerHeight) {
                        el.classList.add('visible');
                    }
                });
                _feedScrollY = 0;
            }

        } catch (e) {
            if (gen !== _routeGen) return;
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
        var bm = getBookmarks();

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
                    var rh = _getReadingHist();
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
                navigateTo({ post: card.dataset.slug });
                snd('tap');
            });
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateTo({ post: card.dataset.slug });
                    snd('tap');
                }
            });
        });

        grid.querySelectorAll('.lb-card-v2-bookmark').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var slug = btn.dataset.bm;
                var art = _allFeedArticles.find(function(a) { return a.slug === slug; });
                var articleId = art ? art.id : slug;
                _showCollPopover(btn, articleId, slug);
            });
        });

        _initScrollReveals(grid);
        _initPredictivePrefetch(grid);
    }

    /* ═══════════════════════════════════════════════════
       A4: PREDICTIVE NAVIGATION PRE-FETCHING
       ═══════════════════════════════════════════════════ */
    var _prefetchedSlugs = new Set();
    function _initPredictivePrefetch(grid) {
        if (!grid || !window._sb) return;
        grid.querySelectorAll('[data-slug]').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                var slug = card.dataset.slug;
                if (!slug || _prefetchedSlugs.has(slug) || _getCached('article:' + slug)) return;
                _prefetchedSlugs.add(slug);
                scheduleIdle(function() {
                    window._sb.from('longform_articles')
                        .select('*')
                        .eq('slug', slug)
                        .eq('published', true)
                        .single()
                        .then(function(r) {
                            if (r.data) {
                                _setCache('article:' + slug, r.data);
                                scheduleIdle(function() {
                                    if (r.data.content) {
                                        var cacheKey = 'md:' + slug;
                                        if (!_getCached(cacheKey)) {
                                            parseMarkdownAsync(r.data.content, function(html) {
                                                _setCache(cacheKey, html);
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

        var listsForChips = _getAllLists();
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
                    var list = _getListById(listId);
                    if (list) {
                        var slugs = list.items.map(function(it) { return it.slug; });
                        var artIds = list.items.map(function(it) { return it.articleId; });
                        renderFeedCards(_allFeedArticles.filter(function(a) {
                            return slugs.indexOf(a.slug) !== -1 || artIds.indexOf(a.id) !== -1;
                        }), 'bookmarked');
                    }
                } else if (filter === 'history') {
                    var rh = _getReadingHist();
                    var histIds = Object.keys(rh);
                    renderFeedCards(_allFeedArticles.filter(function(a) { return histIds.indexOf(a.id) !== -1; }), 'history');
                } else if (filter.startsWith('tag:')) {
                    var tag = filter.slice(4);
                    renderFeedCards(_allFeedArticles.filter(function(a) { return (a.tags || []).indexOf(tag) !== -1; }), 'tag');
                } else {
                    renderFeedCards(_allFeedArticles, 'all');
                }
                snd('tap');
            });
        });
    }

    function _showCollChipDropdown(chipEl) {
        var existing = document.querySelector('.lb-coll-chip-dropdown');
        if (existing) { existing.remove(); return; }
        var lists = _getAllLists();
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
                var list = _getListById(listId);
                if (list) {
                    var slugs = list.items.map(function(it) { return it.slug; });
                    var artIds = list.items.map(function(it) { return it.articleId; });
                    renderFeedCards(_allFeedArticles.filter(function(a) {
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

    /* ═══════════════════════════════════════════════════
       PHASE 3: FULL-TEXT SEARCH
       ═══════════════════════════════════════════════════ */
    var _searchDebounce = null;
    function bindSearchBar() {
        var input = document.getElementById('lbSearchBar');
        var clearBtn = document.getElementById('lbSearchClear');
        if (!input || !clearBtn) return;

        input.addEventListener('input', function() {
            var q = input.value.trim();
            clearBtn.style.display = q ? 'block' : 'none';
            if (_searchDebounce) clearTimeout(_searchDebounce);
            if (!q) {
                renderFeedCards(_allFeedArticles);
                bindFeedFilters();
                return;
            }
            _searchDebounce = setTimeout(function() { performSearch(q); }, 300);
        });

        clearBtn.addEventListener('click', function() {
            input.value = '';
            clearBtn.style.display = 'none';
            renderFeedCards(_allFeedArticles);
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
                    '<div class="lb-card-excerpt">' + (a.headline || esc((a.excerpt || '').slice(0, MAX_EXCERPT))) + '</div>' +
                    '<div class="lb-card-meta">' +
                    (a.tags || []).map(function(t) { return '<span class="lb-card-tag">' + esc(t) + '</span>'; }).join('') +
                    (a.views ? '<span class="lb-card-views">👁 ' + a.views + '</span>' : '') +
                    '</div></article>';
            }).join('');
            grid.querySelectorAll('.lb-card').forEach(function(card) {
                card.addEventListener('click', function() { navigateTo({ post: card.dataset.slug }); snd('tap'); });
            });
        } catch (e) {
            grid.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div>Search failed.</div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: NEWSLETTER
       ═══════════════════════════════════════════════════ */
    function renderNewsletter() {
        var container = document.getElementById('lbNewsletter');
        if (!container) return;
        container.innerHTML = '<div class="lb-newsletter lb-reveal">' +
            '<div class="lb-newsletter-title">STAY UPDATED</div>' +
            '<div class="lb-newsletter-sub">Get notified when new articles are published.</div>' +
            '<form class="lb-newsletter-form" id="lbNewsletterForm">' +
            '<input type="email" placeholder="your@email.com" id="lbNewsletterEmail" required>' +
            '<button type="submit" id="lbNewsletterSubmit">SUBSCRIBE</button>' +
            '</form></div>';

        document.getElementById('lbNewsletterForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            var emailInput = document.getElementById('lbNewsletterEmail');
            var btn = document.getElementById('lbNewsletterSubmit');
            var email = emailInput.value.trim();
            if (!email || !window._sb) return;
            btn.disabled = true;
            btn.textContent = '...';
            try {
                await window._sb.rpc('subscribe_newsletter', { p_email: email });
                if (window.UniToast) window.UniToast('Subscribed!', 'You will receive updates on new articles.', '📧', 'success');
                emailInput.value = '';
                btn.textContent = 'SUBSCRIBED ✓';
                snd('success');
            } catch (err) {
                if (window.UniToast) window.UniToast('Subscription failed.', '', '⚠️', 'warn');
                btn.textContent = 'SUBSCRIBE';
            }
            btn.disabled = false;
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
                card.addEventListener('click', function() { navigateTo({ post: card.dataset.slug }); snd('tap'); });
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

            if (prev) document.getElementById('lbSeriesPrev').addEventListener('click', function() { navigateTo({ post: prev.slug }); });
            if (next) document.getElementById('lbSeriesNext').addEventListener('click', function() { navigateTo({ post: next.slug }); });
        } catch (e) { /* silent */ }
    }

    /* ═══════════════════════════════════════════════════
       PHASE 3: VOICE NARRATION (TTS)
       ═══════════════════════════════════════════════════ */
    var _ttsUtterance = null;
    var _ttsPlayerEl = null;
    var _ttsSentences = [];
    var _ttsCurrentIdx = 0;
    var _ttsSpeed = 1;
    var _ttsPlaying = false;

    function initTTS(article) {
        if (!('speechSynthesis' in window)) return;

        var contentEl = document.querySelector('.lb-content');
        if (!contentEl) return;

        _ttsSentences = [];
        var paras = contentEl.querySelectorAll('p, li, h2, h3, h4, blockquote');
        paras.forEach(function(p) {
            var text = p.textContent.trim();
            if (text.length > 2) _ttsSentences.push({ el: p, text: text });
        });
        if (!_ttsSentences.length) return;

        var btn = document.getElementById('lbTtsBtn');
        if (btn) {
            btn.addEventListener('click', function() {
                if (_ttsPlaying) { stopTTS(); }
                else { startTTS(); }
            });
        }
    }

    function startTTS() {
        if (!_ttsSentences.length) return;
        _ttsPlaying = true;
        _ttsCurrentIdx = 0;
        showTTSPlayer();
        speakCurrent();
    }

    function speakCurrent() {
        if (_ttsCurrentIdx >= _ttsSentences.length) { stopTTS(); return; }
        var entry = _ttsSentences[_ttsCurrentIdx];

        _ttsSentences.forEach(function(s) { s.el.classList.remove('lb-tts-highlight'); });
        entry.el.classList.add('lb-tts-highlight');
        entry.el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        _ttsUtterance = new SpeechSynthesisUtterance(entry.text);
        _ttsUtterance.rate = _ttsSpeed;
        _ttsUtterance.lang = 'en-US';

        var voices = speechSynthesis.getVoices();
        var preferred = voices.find(function(v) { return v.name.indexOf('Google') !== -1 && v.lang.startsWith('en'); }) ||
                        voices.find(function(v) { return v.lang.startsWith('en'); });
        if (preferred) _ttsUtterance.voice = preferred;

        _ttsUtterance.onend = function() {
            if (!_ttsPlaying) return;
            _ttsCurrentIdx++;
            updateTTSProgress();
            speakCurrent();
        };
        speechSynthesis.speak(_ttsUtterance);
        updateTTSProgress();
    }

    function cancelCurrentUtterance() {
        if (_ttsUtterance) _ttsUtterance.onend = null;
        speechSynthesis.cancel();
    }

    function pauseTTS() {
        if (speechSynthesis.speaking) {
            if (speechSynthesis.paused) { speechSynthesis.resume(); }
            else { speechSynthesis.pause(); }
        }
    }

    function stopTTS() {
        _ttsPlaying = false;
        cancelCurrentUtterance();
        _ttsSentences.forEach(function(s) { s.el.classList.remove('lb-tts-highlight'); });
        hideTTSPlayer();
        var btn = document.getElementById('lbTtsBtn');
        if (btn) btn.classList.remove('active');
    }

    function destroyTTS() {
        stopTTS();
        _ttsSentences = [];
        _ttsCurrentIdx = 0;
    }

    function showTTSPlayer() {
        if (_ttsPlayerEl) _ttsPlayerEl.remove();
        _ttsPlayerEl = document.createElement('div');
        _ttsPlayerEl.className = 'lb-tts-player';
        _ttsPlayerEl.innerHTML =
            '<div class="lb-tts-controls">' +
            '<button class="lb-tts-ctrl-btn" id="lbTtsPrev" title="Previous">⏮</button>' +
            '<button class="lb-tts-ctrl-btn active" id="lbTtsPlayPause" title="Play/Pause">⏸</button>' +
            '<button class="lb-tts-ctrl-btn" id="lbTtsNext" title="Next">⏭</button>' +
            '</div>' +
            '<div class="lb-tts-progress" id="lbTtsProgress"><div class="lb-tts-progress-fill" id="lbTtsProgressFill"></div></div>' +
            '<button class="lb-tts-speed" id="lbTtsSpeed">' + _ttsSpeed + 'x</button>' +
            '<button class="lb-tts-close" id="lbTtsClose" title="Stop">✕</button>';
        document.body.appendChild(_ttsPlayerEl);
        requestAnimationFrame(function() { _ttsPlayerEl.classList.add('visible'); });

        document.getElementById('lbTtsPlayPause').addEventListener('click', function() {
            pauseTTS();
            this.textContent = speechSynthesis.paused ? '▶' : '⏸';
        });
        document.getElementById('lbTtsPrev').addEventListener('click', function() {
            cancelCurrentUtterance();
            _ttsCurrentIdx = Math.max(0, _ttsCurrentIdx - 1);
            speakCurrent();
        });
        document.getElementById('lbTtsNext').addEventListener('click', function() {
            cancelCurrentUtterance();
            _ttsCurrentIdx = Math.min(_ttsSentences.length - 1, _ttsCurrentIdx + 1);
            speakCurrent();
        });
        document.getElementById('lbTtsSpeed').addEventListener('click', function() {
            var speeds = [0.75, 1, 1.25, 1.5];
            var idx = speeds.indexOf(_ttsSpeed);
            _ttsSpeed = speeds[(idx + 1) % speeds.length];
            this.textContent = _ttsSpeed + 'x';
            if (speechSynthesis.speaking) {
                cancelCurrentUtterance();
                speakCurrent();
            }
        });
        document.getElementById('lbTtsClose').addEventListener('click', stopTTS);
        document.getElementById('lbTtsProgress').addEventListener('click', function(e) {
            var rect = this.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            _ttsCurrentIdx = Math.floor(pct * _ttsSentences.length);
            cancelCurrentUtterance();
            speakCurrent();
        });

        var ttsBtn = document.getElementById('lbTtsBtn');
        if (ttsBtn) ttsBtn.classList.add('active');
    }

    function hideTTSPlayer() {
        if (_ttsPlayerEl) {
            _ttsPlayerEl.classList.remove('visible');
            setTimeout(function() { if (_ttsPlayerEl) { _ttsPlayerEl.remove(); _ttsPlayerEl = null; } }, 300);
        }
    }

    function updateTTSProgress() {
        var fill = document.getElementById('lbTtsProgressFill');
        if (fill && _ttsSentences.length) {
            fill.style.width = ((_ttsCurrentIdx / _ttsSentences.length) * 100) + '%';
        }
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
    var _readingFab = null;
    var _readingPanel = null;
    var LS_READING = '_lb_reading_prefs';
    var _readingAddedLightMode = false;

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
        if (_readingAddedLightMode) { document.body.classList.remove('light-mode'); _readingAddedLightMode = false; }
        if (p.theme === 'sepia') document.body.classList.add('lb-sepia');
        else if (p.theme === 'light' && !document.body.classList.contains('light-mode')) {
            document.body.classList.add('light-mode');
            _readingAddedLightMode = true;
        }
    }

    function initReadingSettings() {
        if (_readingFab) return;
        _readingFab = document.createElement('button');
        _readingFab.className = 'lb-reading-fab';
        _readingFab.innerHTML = '<i class="fa-solid fa-sliders"></i>';
        _readingFab.title = 'Reading Settings';
        document.body.appendChild(_readingFab);

        _readingPanel = document.createElement('div');
        _readingPanel.className = 'lb-reading-panel';
        _readingPanel.innerHTML =
            '<div class="lb-reading-panel-title">READING SETTINGS</div>' +
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

        _readingFab.addEventListener('click', function() { _readingPanel.classList.toggle('show'); });

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
    }

    function destroyReadingSettings() {
        if (_readingFab) { _readingFab.remove(); _readingFab = null; }
        if (_readingPanel) { _readingPanel.remove(); _readingPanel = null; }
        document.body.classList.remove('lb-sepia');
        if (_readingAddedLightMode) { document.body.classList.remove('light-mode'); _readingAddedLightMode = false; }
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
        if (article.cover_image) { tags['og:image'] = article.cover_image; tags['twitter:image'] = article.cover_image; }
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

    function generateRSS() {
        if (!_allFeedArticles.length) { if (window.UniToast) window.UniToast('No articles to export.', '', '⚠️', 'warn'); return; }
        var origin = window.location.origin + window.location.pathname;
        var items = _allFeedArticles.map(function(a) {
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

    function xmlEsc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    /* ═══════════════════════════════════════════════════
       PHASE 3: REVIEW PAGE
       ═══════════════════════════════════════════════════ */
    async function renderReview(token) {
        destroyProgressBar();
        destroyTextSelection();
        destroyTTS();
        _destroyReadingHistory();
        destroyAnnotationsPanel();
        destroyCollectionsPanel();
        blogView.innerHTML = '<div class="lb-wrap"><div id="lbReviewContent">' + articleSkeleton() + '</div></div>';
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
            var contentHtml = parseMarkdown(article.content);

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
                        '<span class="lb-review-comment-meta">' + (c.created_at ? timeAgo(c.created_at) : '') + '</span>' +
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
        _destroyReadingHistory();
        destroyAnnotationsPanel();
        destroyCollectionsPanel();
        _updateSidebarActive('');
        const gen = _routeGen; // Capture for stale check
        blogView.innerHTML = `
      <div class="lb-wrap">
        <nav class="lb-nav" role="navigation" aria-label="Article navigation">
          <div style="display:flex;align-items:center;gap:8px">
            <button class="lb-nav-menu" id="lbNavMenu2" title="Menu" aria-label="Open navigation menu"><i class="fa-solid fa-bars"></i></button>
            <a class="lb-nav-back" id="lbBackFeed" tabindex="0" role="link"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> <span>Articles</span></a>
            <span class="lb-nav-sep" aria-hidden="true"></span>
            <a class="lb-nav-brand" id="lbBrandHome2" tabindex="0" role="link">AMR ELHARONY</a>
          </div>
        </nav>
        <div id="lbArticle" aria-live="polite">${articleSkeleton()}</div>
      </div>`;

        document.getElementById('lbBrandHome2').addEventListener('click', e => { e.preventDefault(); goToPortfolio(); });
        document.getElementById('lbBackFeed').addEventListener('click', e => { e.preventDefault(); navigateTo({ blog: 'feed' }); });
        document.getElementById('lbNavMenu2').addEventListener('click', function(){ _openSidebar(); });

        // Focus management (a11y)
        blogView.setAttribute('tabindex', '-1');
        blogView.focus({ preventScroll: true });

        if (!window._sb) {
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">503</div><div class="lb-404-msg">Unable to connect.</div></div>';
            return;
        }

        try {
            const articleCacheKey = 'article:' + slug;
            let data, error;
            const cachedArticle = _getCached(articleCacheKey);
            if (cachedArticle) {
                data = cachedArticle;
                error = null;
            } else {
                const signal = _abortPrevious();
                const res = await window._sb
                    .from('longform_articles')
                    .select('*')
                    .eq('slug', slug)
                    .eq('published', true)
                    .single()
                    .abortSignal(signal);
                data = res.data;
                error = res.error;
                if (!error && data) _setCache(articleCacheKey, data);
            }

            // Stale check
            if (gen !== _routeGen) return;

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

            currentArticle = data;

            // Update page title, meta, and SEO
            document.title = `${data.title} — Amr Elharony`;
            updateMeta(data.excerpt || data.title);
            updateCanonical('?post=' + encodeURIComponent(slug));
            updateOGMeta(data);
            injectArticleJsonLd(data);

            if (!_viewedSlugs.has(slug)) {
                _viewedSlugs.add(slug);
                window._sb.rpc('increment_article_views', { article_slug: slug }).then(function(){}, function(){});
            }

            const contentHtml = processFootnotes(processGalleries(parseMarkdown(data.content)));
            const articleUrl = window.location.origin + window.location.pathname + '?post=' + encodeURIComponent(slug);

            document.getElementById('lbArticle').innerHTML = `
        <article class="lb-article" itemscope itemtype="https://schema.org/BlogPosting">
          <header class="lb-article-header">
            <div class="lb-article-date lb-reveal" style="transition-delay:0s"><time datetime="${new Date(data.created_at).toISOString()}" itemprop="datePublished">${fmtDate(data.created_at)}</time></div>
            <h1 class="lb-article-h1 lb-reveal" style="transition-delay:.08s" itemprop="headline">${esc(data.title)}</h1>
            ${data.excerpt ? `<p class="lb-article-excerpt lb-reveal" style="transition-delay:.14s" itemprop="description">${esc(data.excerpt)}</p>` : ''}
            <div class="lb-article-meta lb-reveal" style="transition-delay:.2s">
              <span itemprop="author" itemscope itemtype="https://schema.org/Person"><meta itemprop="name" content="Amr Elharony">${readingTime(data.content)}</span>
              <span aria-label="${data.views || 0} views">👁 ${data.views || 0} views</span>
              ${(data.tags || []).length ? `<div class="lb-article-tags">${(data.tags || []).map(t => `<span class="lb-card-tag" itemprop="keywords">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </header>
          ${data.cover_image ? `<img class="lb-reveal" style="transition-delay:.26s;width:100%;border:1px solid var(--border);margin-bottom:40px" src="${esc(data.cover_image)}" alt="${esc(data.title)}" itemprop="image" loading="lazy">` : ''}
          <div class="lb-content has-dropcap" itemprop="articleBody">${contentHtml}</div>
          <div class="lb-reactions" id="lbReactions"></div>
          <footer class="lb-article-footer lb-reveal">
            <div class="lb-share-panel">
              <a class="lb-share-icon twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title)}&url=${encodeURIComponent(articleUrl)}" target="_blank" rel="noopener" title="Share on X" aria-label="Share on X"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a>
              <a class="lb-share-icon linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}" target="_blank" rel="noopener" title="Share on LinkedIn" aria-label="Share on LinkedIn"><i class="fa-brands fa-linkedin-in" aria-hidden="true"></i></a>
              <a class="lb-share-icon whatsapp" href="https://wa.me/?text=${encodeURIComponent(data.title + ' ' + articleUrl)}" target="_blank" rel="noopener" title="Share on WhatsApp" aria-label="Share on WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
              <a class="lb-share-icon telegram" href="https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(data.title)}" target="_blank" rel="noopener" title="Share on Telegram" aria-label="Share on Telegram"><i class="fa-brands fa-telegram" aria-hidden="true"></i></a>
              <a class="lb-share-icon email" href="mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(data.title + '\n\n' + articleUrl)}" title="Share via Email" aria-label="Share via Email"><i class="fa-solid fa-envelope" aria-hidden="true"></i></a>
              <button class="lb-share-icon" id="lbCopyLink" title="Copy Link" aria-label="Copy article link"><i class="fa-solid fa-link" aria-hidden="true"></i></button>
              <button class="lb-bookmark-btn" id="lbBookmarkArticle"><i class="fa-regular fa-bookmark" aria-hidden="true"></i> Bookmark</button>
              <button class="lb-tts-btn" id="lbTtsBtn"><i class="fa-solid fa-headphones" aria-hidden="true"></i> Listen</button>
            </div>
            <button class="lb-nav-back" id="lbBackFeed2"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> All Articles</button>
          </footer>
          <div class="lb-author-card lb-reveal">
            <img class="lb-author-avatar" src="https://amrelharony.com/img/profile.webp" alt="Amr Elharony" loading="lazy">
            <div class="lb-author-info">
              <div class="lb-author-name">Amr Elharony</div>
              <div class="lb-author-bio">Executive Product Leader in FinTech & Digital Transformation. Writing about Agile, AI, and building products that matter.</div>
              <div class="lb-author-links">
                <a class="lb-author-link" href="https://www.linkedin.com/in/amrelharony" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin-in"></i> LinkedIn</a>
                <a class="lb-author-link" href="?blog=feed" id="lbAuthorAllArticles">All Articles</a>
              </div>
            </div>
          </div>
          <div id="lbCommentsSection"></div>
        </article>`;

            // Bind events
            document.getElementById('lbCopyLink').addEventListener('click', function() {
                navigator.clipboard.writeText(articleUrl).then(function() {
                    if (window.UniToast) window.UniToast('Link copied!', '', '\ud83d\udccb', 'success');
                }).catch(function() { if (window.UniToast) window.UniToast('Copy failed', '', '\u26a0\ufe0f', 'error'); });
                snd('success');
            });
            document.getElementById('lbBackFeed2').addEventListener('click', e => { e.preventDefault(); navigateTo({ blog: 'feed' }); });
            var authorAll = document.getElementById('lbAuthorAllArticles');
            if (authorAll) authorAll.addEventListener('click', function(e) { e.preventDefault(); navigateTo({ blog: 'feed' }); });

            // Phase 2: Engagement features
            renderReactionBar(data);
            initBookmarkBtn(data.slug);
            renderComments(data.id);
            initTextSelection(data);

            // Phase 1: Reader Experience features
            highlightCode();
            buildTOC(document.querySelector('.lb-article'));
            initProgressBar(data);

            // Phase 3: Series navigation, Related articles, TTS
            renderSeriesNav(data);
            renderRelated(data);
            initTTS(data);

            // Phase 4: Lightbox, Reading settings, Footnote tooltips
            initLightbox();
            initReadingSettings();
            bindFootnoteTooltips();

            // Reader annotations: merge cloud, apply highlights, init panel + reading history
            await _mergeCloudAnnotations(data.id);
            applyHighlights(data.id);
            initAnnotationsPanel(data.id);
            initCollectionsPanel();
            _initReadingHistory(data);

            // Scroll-reveal for article content elements
            var articleContent = document.querySelector('.lb-content');
            if (articleContent) {
                articleContent.querySelectorAll('h2,h3,figure,blockquote,.callout,.lb-gallery,hr,pre').forEach(function(el) {
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
            _initScrollReveals(document.getElementById('lbArticle') || blogView);

        } catch (e) {
            if (gen !== _routeGen) return;
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">500</div><div class="lb-404-msg">Something went wrong.</div></div>';
        }
    }


    /* ═══════════════════════════════════════════════════
       PHASE 2: REACTION BAR
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

        try {
            var result = await window._sb.rpc('update_article_reactions', {
                p_article_id: article.id, p_reaction_key: rk, p_delta: was ? -1 : 1
            });
            if (result.data) { article.reactions = result.data; }
        } catch (e) { /* silent */ }
        renderReactionBar(article);
    }

    /* ═══════════════════════════════════════════════════
       PHASE 2: COMMENTS
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
       READING LISTS / COLLECTIONS
       ═══════════════════════════════════════════════════ */
    var LS_RL = '_lb_reading_lists';
    var _collFab = null;
    var _collPanel = null;
    var _collPanelOpen = false;
    var _collPopover = null;
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
            var art = _allFeedArticles.find(function(a) { return a.slug === slug; });
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
        var art = _allFeedArticles.find(function(a) { return a.slug === slug; });
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
            _showCollPopover(btn, currentArticle ? currentArticle.id : slug, slug);
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
                    var art = _allFeedArticles.find(function(a) { return a.id === it.article_id; });
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

        _collPanel.querySelector('.lb-coll-panel-close').addEventListener('click', function() {
            _collPanelOpen = false;
            _collPanel.classList.remove('show');
        });

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
                var art = _allFeedArticles.find(function(a) { return a.id === it.articleId || a.slug === it.slug; });
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
                if (s) { navigateTo({ post: s }); snd('tap'); }
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
        _dismissCollPopover();
        if (_collFab) { _collFab.remove(); _collFab = null; }
        if (_collPanel) { _collPanel.remove(); _collPanel = null; }
        _collPanelOpen = false;
    }

    /* ═══════════════════════════════════════════════════
       PHASE 2: TEXT SELECTION SHARE
       ═══════════════════════════════════════════════════ */
    var _quoteTooltip = null;
    var _quoteHandlers = {};

    function initTextSelection(article) {
        destroyTextSelection();
        var contentEl = document.querySelector('.lb-content');
        if (!contentEl) return;

        _quoteHandlers.mouseup = function(e) {
            setTimeout(function() { showQuoteTooltip(e, article); }, 10);
        };
        _quoteHandlers.touchend = function(e) {
            setTimeout(function() { showQuoteTooltip(e, article); }, 300);
        };
        contentEl.addEventListener('mouseup', _quoteHandlers.mouseup);
        contentEl.addEventListener('touchend', _quoteHandlers.touchend);
    }

    function destroyTextSelection() {
        var contentEl = document.querySelector('.lb-content');
        if (contentEl && _quoteHandlers.mouseup) {
            contentEl.removeEventListener('mouseup', _quoteHandlers.mouseup);
            contentEl.removeEventListener('touchend', _quoteHandlers.touchend);
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
                createHighlight(savedRange, text, color, article);
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

    /* ═══════════════════════════════════════════════════
       READER ANNOTATIONS — Highlights, Notes, History
       ═══════════════════════════════════════════════════ */
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
            var articleId = currentArticle ? currentArticle.id : null;
            if (articleId) _saveAnnotation(articleId, ann);
            snd('tap');
        });

        _hlToolbar.querySelector('[data-act="delete"]').addEventListener('click', function(ev) {
            ev.stopPropagation();
            _dismissHlToolbar();
            var articleId = currentArticle ? currentArticle.id : null;
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
            var articleId = currentArticle ? currentArticle.id : null;
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

        _annPanel.querySelector('.lb-ann-panel-close').addEventListener('click', function() {
            _annPanelOpen = false;
            _annPanel.classList.remove('show');
        });

        _annPanel.querySelectorAll('.lb-ann-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                _annPanel.querySelectorAll('.lb-ann-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                _renderAnnList(articleId);
                snd('tap');
            });
        });

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

    /* ── Reading history ── */
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
                var art = _allFeedArticles.find(function(a) { return a.id === articleId; });
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
                navigateTo({ post: card.dataset.slug });
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

    function highlightCode() {
        var container = document.getElementById('lbArticle');
        if (!container) return;

        // Add copy buttons and language labels to all code blocks
        container.querySelectorAll('pre').forEach(function(pre) {
            if (pre.querySelector('.lb-copy-btn')) return;
            var codeEl = pre.querySelector('code');

            // Detect language from class (e.g. language-javascript)
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
                navigator.clipboard.writeText(text).then(function() {
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
                }).catch(function() { btn.textContent = 'Failed'; setTimeout(function() { btn.textContent = 'Copy'; }, 2000); });
                if (window._haptic) window._haptic.tap();
            });
            pre.appendChild(btn);
        });

        // Load Prism.js dynamically if not already loaded
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

        // Load Twitter widget JS if tweet embeds exist
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

        // Assign IDs and collect items (with deduplication)
        var items = [];
        var usedIds = {};
        headings.forEach(function(h) {
            var text = h.textContent.trim();
            var base = h.id || slugify(text);
            if (!base) base = 'section';
            var id = base;
            if (usedIds[id]) { usedIds[id]++; id = base + '-' + usedIds[id]; } else { usedIds[id] = 1; }
            h.id = id;
            items.push({ id: id, text: text, depth: h.tagName === 'H3' ? 3 : 2 });
        });

        // Build TOC HTML
        var tocHtml = '<nav class="lb-toc" aria-label="Table of contents">' +
            '<button class="lb-toc-toggle" aria-expanded="true">Contents (' + items.length + ')</button>' +
            '<ol class="lb-toc-list">' +
            items.map(function(it) {
                return '<li class="lb-toc-item"><a class="lb-toc-link depth-' + it.depth + '" href="#' + it.id + '" data-toc-id="' + it.id + '">' + esc(it.text) + '</a></li>';
            }).join('') +
            '</ol></nav>';

        // Insert before content
        content.insertAdjacentHTML('beforebegin', tocHtml);

        // Toggle
        var toc = articleEl.querySelector('.lb-toc');
        var toggle = toc.querySelector('.lb-toc-toggle');
        toggle.addEventListener('click', function() {
            toc.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', !toc.classList.contains('collapsed'));
        });

        // Smooth scroll
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

        // Active heading tracking via IntersectionObserver
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

        // Store observer for cleanup on route change
        articleEl._tocObserver = observer;
    }

    /* ── Reading Progress Bar ── */
    let _progressBar = null, _progressFill = null, _progressMeta = null, _progressHandler = null;

    function initProgressBar(articleData) {
        destroyProgressBar();

        _progressBar = document.createElement('div');
        _progressBar.className = 'lb-progress-bar';
        _progressBar.innerHTML = '<div class="lb-progress-fill"></div>';
        document.body.appendChild(_progressBar);
        _progressFill = _progressBar.querySelector('.lb-progress-fill');

        _progressMeta = document.createElement('div');
        _progressMeta.className = 'lb-progress-meta';
        document.body.appendChild(_progressMeta);

        const totalWords = (articleData.content || '').split(/\s+/).filter(Boolean).length;
        const totalMin = Math.max(1, Math.ceil(totalWords / 200));

        requestAnimationFrame(function() {
            _progressBar.classList.add('visible');
            _progressMeta.classList.add('visible');
        });

        let _progressRaf = false;
        _progressHandler = function() {
            if (_progressRaf) return;
            _progressRaf = true;
            requestAnimationFrame(function() {
                _progressRaf = false;
                if (!_progressFill || !_progressMeta) return;
                const articleEl = document.querySelector('.lb-article');
                if (!articleEl) return;
                const rect = articleEl.getBoundingClientRect();
                const scrolled = -rect.top;
                const total = rect.height - window.innerHeight;
                if (total <= 0) return;
                const pct = Math.max(0, Math.min(100, (scrolled / total) * 100));
                _progressFill.style.width = pct + '%';
                const minLeft = Math.max(0, Math.ceil(totalMin * (1 - pct / 100)));
                _progressMeta.textContent = minLeft > 0 ? minLeft + ' min left' : 'Done reading';
            });
        };
        window.addEventListener('scroll', _progressHandler, { passive: true });
        _progressHandler();
    }

    function destroyProgressBar() {
        if (_progressHandler) { window.removeEventListener('scroll', _progressHandler); _progressHandler = null; }
        if (_progressBar) { _progressBar.remove(); _progressBar = null; _progressFill = null; }
        if (_progressMeta) { _progressMeta.remove(); _progressMeta = null; }
    }

    function updateMeta(description) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', description);
    }

    function updateCanonical(queryString) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = window.location.origin + window.location.pathname + queryString;
    }

    /* ═══════════════════════════════════════════════════
       ADMIN DIALOG — Auth + CMS
       ═══════════════════════════════════════════════════ */

    function isAdmin() {
        // Check Supabase Auth session (needed for RLS writes)
        if (adminSession) return true;
        // Fallback to passkey (UI-only — RLS writes may fail without Supabase Auth)
        if (window._passkey && window._passkey.isAuthenticated) return true;
        return false;
    }

    function hasSupabaseAuth() {
        return !!adminSession;
    }

    async function checkSupabaseSession() {
        if (!window._sb) return null;
        try {
            const { data } = await window._sb.auth.getSession();
            if (data && data.session) {
                adminSession = data.session;
                return data.session;
            }
        } catch (e) { }
        return null;
    }

    async function openAdmin() {
        if (!adminDialog) return;

        snd('menuOpen');
        adminDialog.showModal();

        // Check existing session
        const session = await checkSupabaseSession();

        if (session || isAdmin()) {
            renderCMS(!hasSupabaseAuth());
        } else {
            renderAuthForm();
        }
    }

    function closeAdmin() {
        if (adminDialog) {
            // Auto-save article draft on close
            var titleEl = document.getElementById('lbCmsTitle');
            var editorContent = _getEditorValue();
            if (!editingArticle && titleEl && (titleEl.value.trim() || editorContent.trim())) {
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
            _destroyCM6();
            _markCmsClean();
            window.removeEventListener('beforeunload', _cmsBeforeUnload);
            adminDialog.close();
            snd('menuClose');
        }
    }

    function renderAuthForm() {
        adminDialog.innerHTML = `
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
            adminSession = data.session;
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
        adminSession = null;
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
        editingArticle = null;
        var _quickPendFile = null;

        adminDialog.innerHTML = `
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
          <button class="lb-cms-tab active" data-admintab="micro">Thoughts</button>
          <button class="lb-cms-tab" data-admintab="article">Write Article</button>
          <button class="lb-cms-tab" data-admintab="analytics">Analytics</button>
        </div>

        <!-- ── Thoughts Tab ── -->
        <div class="lb-cms-tab-content active" id="lbTabMicro" data-admintab-content="micro">
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
        <div class="lb-cms-tab-content" id="lbTabArticle" data-admintab-content="article">
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
      </div>`;

        // ── Tab switching ──
        adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
                var target = adminDialog.querySelector('[data-admintab-content="' + tab.dataset.admintab + '"]');
                if (target) target.classList.add('active');
                if (tab.dataset.admintab === 'micro') {
                    var activeMSub = adminDialog.querySelector('#lbMicroSubTabs .lb-sub-tab.active');
                    var mkey = activeMSub ? activeMSub.dataset.msubtab : 'tdrafts';
                    if (mkey === 'tdrafts') renderTDraftsList();
                    else if (mkey === 'tscheduled') _renderMicroTab('tscheduled');
                    else if (mkey === 'tpublished') _renderMicroTab('tpublished');
                }
                if (tab.dataset.admintab === 'article') {
                    var activeSub = adminDialog.querySelector('#lbArticleSubTabs .lb-sub-tab.active');
                    var key = activeSub ? activeSub.dataset.subtab : 'drafts';
                    if (key === 'drafts') renderDraftsList();
                    else if (key === 'scheduled') _renderFilteredTab('scheduled');
                    else if (key === 'published') _renderFilteredTab('published');
                    else if (key === 'calendar') _renderContentCalendar();
                }
                if (tab.dataset.admintab === 'analytics') {
                    renderAnalyticsDashboard();
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
            adminDialog.scrollTop = 0;
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
        document.getElementById('lbTDraftsSearch').addEventListener('input', debounce(function(e) {
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
            adminDialog.querySelectorAll('#lbTabMicro .lb-sub-content').forEach(function(c) { c.classList.remove('active'); });
            var target = adminDialog.querySelector('[data-msubtab-content="' + key + '"]');
            if (target) target.classList.add('active');
            if (key === 'tdrafts') { renderTDraftsList(); }
            if (key === 'tscheduled') _renderMicroTab('tscheduled');
            if (key === 'tpublished') _renderMicroTab('tpublished');
        });

        // Thoughts scheduled/published search
        document.getElementById('lbTSchedSearch').addEventListener('input', debounce(function(e) {
            _renderMicroTab('tscheduled', e.target.value.trim());
        }, 200));
        document.getElementById('lbTPubSearch').addEventListener('input', debounce(function(e) {
            _renderMicroTab('tpublished', e.target.value.trim());
        }, 200));

        renderTDraftsList();
        fetchMicroPosts();

        // ── Shared: close / signout ──
        document.getElementById('lbCmsClose').addEventListener('click', closeAdmin);
        document.getElementById('lbCmsSignout').addEventListener('click', handleSignOut);

        // ── Article tab: existing bindings ──
        document.getElementById('lbCmsPublish').addEventListener('click', function() { saveArticle(true, null); });
        document.getElementById('lbCmsDraft').addEventListener('click', function() { saveArticle(false, null); });

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
            saveArticle(false, new Date(dt).toISOString());
        });

        document.getElementById('lbCmsTitle').addEventListener('input', function() {
            const slugEl = document.getElementById('lbCmsSlug');
            if (!editingArticle) {
                slugEl.value = slugify(document.getElementById('lbCmsTitle').value);
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
                    const exists = (res.data || []).some(function(a) { return !editingArticle || a.id !== editingArticle.id; });
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

        _cmsHasUnsaved = false;
        window.addEventListener('beforeunload', _cmsBeforeUnload);
        ['lbCmsTitle','lbCmsSlug','lbCmsExcerpt','lbCmsTags','lbCmsCover','lbCmsContent'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', _markCmsDirty);
        });

        function _updateEditorStats() {
            const text = _getEditorValue();
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
            var content = _getEditorValue();
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
        var _debouncedSeoUpdate = debounce(function() {
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

        const _updatePreview = debounceIdle(function() {
            const previewEl = document.getElementById('lbCmsPreviewContent');
            if (!previewEl) return;
            const val = _getEditorValue();
            parseMarkdownAsync(val, function(html) {
                previewEl.innerHTML = html || '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            });
            _updateEditorStats();
            if (_cmView && typeof scheduleAutoSave === 'function') scheduleAutoSave();
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

            var view = await _initCM6(cmContainer, editorEl ? editorEl.value : '', _updatePreview);

            if (view) {
                if (loadingEl.parentNode) loadingEl.remove();

                // Observe body class changes for theme switching
                var _cmThemeObserver = new MutationObserver(function() { _switchCM6Theme(); });
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
                                insertAtCursor('\n![image](' + url + ')\n');
                            } catch(err) {
                                if (statusEl) statusEl.textContent = 'Upload failed.';
                            }
                        }
                        if (statusEl) statusEl.textContent = files.length + ' image(s) uploaded.';
                        _updatePreview();
                    });
                }

                // Clipboard paste images in CM6
                var cmContent = cmContainer.querySelector('.cm-content');
                if (cmContent) {
                    cmContent.addEventListener('paste', async function(e) {
                        var imageFile = getClipboardImage(e);
                        if (!imageFile) return;
                        e.preventDefault();
                        var statusEl = document.getElementById('lbCmsStatus');
                        if (statusEl) statusEl.textContent = 'Uploading image...';
                        try {
                            var publicUrl = await uploadImageToStorage(imageFile, 'article');
                            insertAtCursor('\n![image](' + publicUrl + ')\n');
                            if (statusEl) statusEl.textContent = 'Image uploaded!';
                            snd('success');
                        } catch (err) {
                            if (statusEl) statusEl.textContent = 'Image upload failed: ' + (err.message || err);
                        }
                    });
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
                                insertAtCursor('\n![image](' + url + ')\n');
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
        if (fsBtn && splitEl) {
            fsBtn.addEventListener('click', function() {
                splitEl.classList.toggle('lb-editor-fs');
                if (splitEl.classList.contains('lb-editor-fs')) {
                    fsBtn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
                } else {
                    fsBtn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
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
                content: _getEditorValue()
            };
        }

        function saveCurrentDraft(silent) {
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
            _setEditorValue(draft.content || '');
            editingArticle = null;
            _updatePreview();
            // Switch to article tab
            adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            const artTab = adminDialog.querySelector('[data-admintab="article"]');
            const artContent = adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');
            document.getElementById('lbCmsStatus').textContent = 'Loaded draft: "' + (draft.title || 'Untitled') + '"';
            adminDialog.scrollTop = 0;
            snd('tap');
        }

        function deleteDraft(draftId) {
            const drafts = getAllDrafts().filter(function(d) { return d.id !== draftId; });
            saveDraftsArray(drafts);
            if (_activeDraftId === draftId) _setActiveDraft(null);
            updateDraftsBadge();
            renderDraftsList();
        }

        function clearEditorForNewDraft() {
            _setActiveDraft(null);
            editingArticle = null;
            document.getElementById('lbCmsTitle').value = '';
            document.getElementById('lbCmsSlug').value = '';
            document.getElementById('lbCmsExcerpt').value = '';
            document.getElementById('lbCmsTags').value = '';
            document.getElementById('lbCmsCover').value = '';
            _setEditorValue('');
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
                _updateSyncIndicator('saving_local');
                saveCurrentDraft(false);
                setTimeout(function() { _updateSyncIndicator('saved_local'); }, 200);
            }, 10000);
            clearTimeout(_cloudAutoSaveTimer);
            _cloudAutoSaveTimer = setTimeout(function() {
                _updateSyncIndicator('saving_cloud');
                saveArticle(false, null, true).then(function(saved) {
                    if (saved) { _updateSyncIndicator('saved_cloud'); _markCmsClean(); }
                }).catch(function() {
                    _updateSyncIndicator('error');
                });
            }, 30000);
        }
        const _autoSaveFields = ['lbCmsTitle','lbCmsSlug','lbCmsExcerpt','lbCmsTags','lbCmsCover'];
        if (!_cmView) _autoSaveFields.push('lbCmsContent');
        _autoSaveFields.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', scheduleAutoSave);
        });

        // Drafts tab: search + new
        document.getElementById('lbDraftsSearch').addEventListener('input', debounce(function(e) {
            const q = e.target.value.trim();
            renderDraftsList(q);
        }, 200));
        document.getElementById('lbDraftsNew').addEventListener('click', function() {
            saveCurrentDraft(true);
            clearEditorForNewDraft();
            adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            const artTab2 = adminDialog.querySelector('[data-admintab="article"]');
            const artContent2 = adminDialog.querySelector('[data-admintab-content="article"]');
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
                _setEditorValue(tpl.content);
                var _tplStatus = document.getElementById('lbCmsStatus');
                if (_tplStatus) _tplStatus.textContent = 'Template loaded: ' + tpl.name;
                _templateDropdown.style.display = 'none';
                adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
                adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
                var artTab3 = adminDialog.querySelector('[data-admintab="article"]');
                var artContent3 = adminDialog.querySelector('[data-admintab-content="article"]');
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
            const target = adminDialog.querySelector('[data-subtab-content="' + key + '"]');
            if (target) target.classList.add('active');
            if (key === 'drafts') renderDraftsList();
            if (key === 'scheduled') _renderFilteredTab('scheduled');
            if (key === 'published') _renderFilteredTab('published');
            if (key === 'calendar') _renderContentCalendar();
        });

        // Scheduled/Published sub-tab search
        document.getElementById('lbSchedSearch').addEventListener('input', debounce(function(e) {
            _renderFilteredTab('scheduled', e.target.value.trim());
        }, 200));
        document.getElementById('lbPubSearch').addEventListener('input', debounce(function(e) {
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
            var ext = (imageFile.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            var fn = (prefix || 'img') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
            var ur = await window._sb.storage.from('microblog-images').upload(fn, imageFile, { cacheControl: '3600', upsert: false });
            if (ur.error) throw ur.error;
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

        // ── Article content: clipboard paste image (textarea fallback; CM6 paste handled in _setupEditor) ──
        if (!_cmView) {
            document.getElementById('lbCmsContent').addEventListener('paste', async function(e) {
                var imageFile = getClipboardImage(e);
                if (!imageFile) return;
                e.preventDefault();
                var statusEl = document.getElementById('lbCmsStatus');
                statusEl.textContent = 'Uploading image...';
                try {
                    var publicUrl = await uploadImageToStorage(imageFile, 'article');
                    insertAtCursor('\n![image](' + publicUrl + ')\n');
                    statusEl.textContent = 'Image uploaded!';
                    snd('success');
                } catch (err) {
                    statusEl.textContent = 'Image upload failed: ' + (err.message || err);
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
                insertAtCursor('\n![image](' + publicUrl + ')\n');
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
            insertFormat(btn.dataset.fmt);
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
        _cmSaveHandler = function() { _markCmsClean(); saveCurrentDraft(true); saveArticle(false, null); };
        if (!_cmView) {
            document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
                if (!e.ctrlKey && !e.metaKey) return;
                if (e.key.toLowerCase() === 's') { e.preventDefault(); _cmSaveHandler(); return; }
                const fmtMap = { 'b': 'bold', 'i': 'italic', 'k': 'link', '`': 'code', '1': 'ul', '2': 'h2', '3': 'h3', '4': 'h4' };
                const fmt = fmtMap[e.key.toLowerCase()];
                if (fmt) { e.preventDefault(); insertFormat(fmt); }
            });
            document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    insertAtCursor('  ');
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
            el.addEventListener('click', function() { deleteArticle(el.dataset.deleteId); });
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

            editingArticle = data;

            // Switch to article tab
            adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            var artTab = adminDialog.querySelector('[data-admintab="article"]');
            var artContent = adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');

            document.getElementById('lbCmsTitle').value = data.title || '';
            document.getElementById('lbCmsSlug').value = data.slug || '';
            document.getElementById('lbCmsExcerpt').value = data.excerpt || '';
            document.getElementById('lbCmsTags').value = (data.tags || []).join(', ');
            document.getElementById('lbCmsCover').value = data.cover_image || '';
            _setEditorValue(data.content || '');

            if (data.scheduled_at && !data.published) {
                var dt = new Date(data.scheduled_at);
                var local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('lbCmsScheduleAt').value = local;
                document.getElementById('lbCmsScheduleRow').style.display = 'flex';
            } else {
                document.getElementById('lbCmsScheduleAt').value = '';
                document.getElementById('lbCmsScheduleRow').style.display = 'none';
            }

            document.getElementById('lbCmsPreviewContent').innerHTML = parseMarkdown(data.content);
            document.getElementById('lbCmsStatus').textContent = 'Editing: "' + (data.title || '') + '"';

            // Series fields
            var seriesInput = document.getElementById('lbCmsSeries');
            var seriesOrderInput = document.getElementById('lbCmsSeriesOrder');
            if (seriesInput) seriesInput.value = data.series_name || '';
            if (seriesOrderInput) seriesOrderInput.value = data.series_order || 0;

            // Show versioning and review buttons
            var histBtn = document.getElementById('lbCmsHistory');
            var reviewBtn = document.getElementById('lbCmsShareReview');
            if (histBtn) { histBtn.style.display = ''; histBtn.onclick = function() { showVersionHistory(data.id); }; }
            if (reviewBtn) { reviewBtn.style.display = ''; reviewBtn.onclick = function() { shareForReview(data.id); }; }

            // Hide version panel
            var vp = document.getElementById('lbVersionPanel');
            if (vp) vp.style.display = 'none';

            adminDialog.scrollTop = 0;
            snd('tap');

        } catch (e) { }
    }

    /* ═══════════════════════════════════════════════════
       ULTRA-ADVANCED ANALYTICS DASHBOARD
       ═══════════════════════════════════════════════════ */
    let _analyticsDays = 30;
    let _analyticsCache = null;
    let _analyticsSortCol = 'views';
    let _analyticsSortAsc = false;
    let _analyticsAbort = null;

    const COUNTRY_FLAGS = {US:'\ud83c\uddfa\ud83c\uddf8',GB:'\ud83c\uddec\ud83c\udde7',DE:'\ud83c\udde9\ud83c\uddea',FR:'\ud83c\uddeb\ud83c\uddf7',CA:'\ud83c\udde8\ud83c\udde6',AU:'\ud83c\udde6\ud83c\uddfa',IN:'\ud83c\uddee\ud83c\uddf3',BR:'\ud83c\udde7\ud83c\uddf7',JP:'\ud83c\uddef\ud83c\uddf5',KR:'\ud83c\uddf0\ud83c\uddf7',CN:'\ud83c\udde8\ud83c\uddf3',NL:'\ud83c\uddf3\ud83c\uddf1',SE:'\ud83c\uddf8\ud83c\uddea',ES:'\ud83c\uddea\ud83c\uddf8',IT:'\ud83c\uddee\ud83c\uddf9',MX:'\ud83c\uddf2\ud83c\uddfd',PL:'\ud83c\uddf5\ud83c\uddf1',RU:'\ud83c\uddf7\ud83c\uddfa',TR:'\ud83c\uddf9\ud83c\uddf7',SA:'\ud83c\uddf8\ud83c\udde6',AE:'\ud83c\udde6\ud83c\uddea',EG:'\ud83c\uddea\ud83c\uddec',NG:'\ud83c\uddf3\ud83c\uddec',ZA:'\ud83c\uddff\ud83c\udde6',AR:'\ud83c\udde6\ud83c\uddf7',CL:'\ud83c\udde8\ud83c\uddf1',CO:'\ud83c\udde8\ud83c\uddf4',PH:'\ud83c\uddf5\ud83c\udded',ID:'\ud83c\uddee\ud83c\udde9',TH:'\ud83c\uddf9\ud83c\udded',VN:'\ud83c\uddfb\ud83c\uddf3',MY:'\ud83c\uddf2\ud83c\uddfe',SG:'\ud83c\uddf8\ud83c\uddec',PK:'\ud83c\uddf5\ud83c\uddf0',BD:'\ud83c\udde7\ud83c\udde9',UA:'\ud83c\uddfa\ud83c\udde6',RO:'\ud83c\uddf7\ud83c\uddf4',CZ:'\ud83c\udde8\ud83c\uddff',AT:'\ud83c\udde6\ud83c\uddf9',CH:'\ud83c\udde8\ud83c\udded',BE:'\ud83c\udde7\ud83c\uddea',DK:'\ud83c\udde9\ud83c\uddf0',NO:'\ud83c\uddf3\ud83c\uddf4',FI:'\ud83c\uddeb\ud83c\uddee',IE:'\ud83c\uddee\ud83c\uddea',PT:'\ud83c\uddf5\ud83c\uddf9',GR:'\ud83c\uddec\ud83c\uddf7',IL:'\ud83c\uddee\ud83c\uddf1',NZ:'\ud83c\uddf3\ud83c\uddff',HK:'\ud83c\udded\ud83c\uddf0',TW:'\ud83c\uddf9\ud83c\uddfc'};
    const DONUT_COLORS = ['#00e1ff','#6366f1','#f59e0b','#22c55e','#ef4444','#ec4899','#8b5cf6','#14b8a6'];

    async function _fetchAnalyticsData(days) {
        const sb = window._sb;
        if (!sb) return null;
        if (_analyticsAbort) _analyticsAbort.abort();
        _analyticsAbort = new AbortController();
        const sig = _analyticsAbort.signal;

        const cutoff = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
        const prevCutoff = days ? new Date(Date.now() - days * 2 * 86400000).toISOString() : null;

        const [articlesRes, commentsRes, commentsCountRes, subCountRes, visitsRes, prevVisitsRes, historyRes, subListRes, recentCommentsRes] = await Promise.all([
            sb.from('longform_articles').select('id,title,slug,views,reactions,published,created_at,tags,series_name').order('views', { ascending: false }).abortSignal(sig),
            cutoff
                ? sb.from('article_comments').select('id,article_id,created_at', { count: 'exact', head: false }).gte('created_at', cutoff).abortSignal(sig)
                : sb.from('article_comments').select('id,article_id,created_at', { count: 'exact', head: false }).abortSignal(sig),
            sb.from('article_comments').select('id', { count: 'exact', head: true }).abortSignal(sig),
            sb.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).abortSignal(sig),
            cutoff
                ? sb.from('site_visits').select('created_at,country,device,browser,is_mobile,referrer,page_url,session_id').gte('created_at', cutoff).order('created_at', { ascending: true }).abortSignal(sig)
                : sb.from('site_visits').select('created_at,country,device,browser,is_mobile,referrer,page_url,session_id').order('created_at', { ascending: true }).abortSignal(sig),
            (cutoff && prevCutoff)
                ? sb.from('site_visits').select('created_at,page_url,session_id').gte('created_at', prevCutoff).lt('created_at', cutoff).abortSignal(sig)
                : Promise.resolve({ data: [] }),
            (async () => {
                const rpcRes = await sb.rpc('get_aggregate_reading_stats').abortSignal(sig);
                if (rpcRes.error) return sb.from('reading_history').select('article_id,progress,time_spent,completed').abortSignal(sig);
                return rpcRes;
            })(),
            sb.from('newsletter_subscribers').select('created_at').order('created_at', { ascending: true }).abortSignal(sig),
            sb.from('article_comments').select('id,article_id,author_name,content,created_at').order('created_at', { ascending: false }).limit(10).abortSignal(sig)
        ]);

        if (sig.aborted) return null;

        const articles = articlesRes.data || [];
        const published = articles.filter(a => a.published);
        const comments = commentsRes.data || [];
        const totalComments = commentsCountRes.count || 0;
        const subscriberCount = subCountRes.count || 0;
        const visits = visitsRes.data || [];
        const prevVisits = prevVisitsRes.data || [];
        const readingHistory = historyRes.data || [];
        const subscribers = subListRes.data || [];
        const recentComments = recentCommentsRes.data || [];

        const blogVisits = visits.filter(v => v.page_url && (v.page_url.includes('?post=') || v.page_url.includes('?blog=')));
        const prevBlogVisits = prevVisits.filter(v => v.page_url && (v.page_url.includes('?post=') || v.page_url.includes('?blog=')));

        const totalViews = published.reduce((s, a) => s + (a.views || 0), 0);
        const totalReactions = published.reduce((s, a) => {
            const rx = a.reactions || {};
            return s + Object.values(rx).reduce((s2, v) => s2 + (v || 0), 0);
        }, 0);

        const prevUniqueVisitors = new Set(prevBlogVisits.map(v => v.session_id)).size;
        const curUniqueVisitors = new Set(blogVisits.map(v => v.session_id)).size;

        const avgCompletion = readingHistory.length
            ? readingHistory.reduce((s, r) => s + (r.progress || 0), 0) / readingHistory.length
            : 0;
        const avgTimeSpent = readingHistory.length
            ? readingHistory.reduce((s, r) => s + (r.time_spent || 0), 0) / readingHistory.length
            : 0;
        const completionRate = readingHistory.length
            ? readingHistory.filter(r => r.completed).length / readingHistory.length
            : 0;

        return {
            articles, published, comments, totalComments, subscriberCount,
            visits, prevVisits, blogVisits, prevBlogVisits, readingHistory,
            subscribers, recentComments, totalViews, totalReactions,
            prevUniqueVisitors, curUniqueVisitors, avgCompletion, avgTimeSpent, completionRate
        };
    }

    function _buildSparklineSVG(dataPoints, w, h) {
        if (!dataPoints.length) return '';
        const max = Math.max(...dataPoints, 1);
        const min = Math.min(...dataPoints, 0);
        const range = max - min || 1;
        const step = w / Math.max(dataPoints.length - 1, 1);
        const pts = dataPoints.map((v, i) => {
            const x = (i * step).toFixed(1);
            const y = (h - ((v - min) / range) * (h * 0.85) - h * 0.05).toFixed(1);
            return x + ',' + y;
        });
        const areaPath = 'M0,' + h + ' L' + pts.join(' L') + ' L' + w + ',' + h + ' Z';
        const linePath = 'M' + pts.join(' L');
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".12"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
            '</svg>';
    }

    function _buildDonutSVG(segments, size) {
        const r = size / 2 - 4;
        const cx = size / 2;
        const cy = size / 2;
        const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
        let cumAngle = -90;
        let paths = '';
        segments.forEach((seg, i) => {
            const angle = (seg.value / total) * 360;
            const startRad = (cumAngle * Math.PI) / 180;
            const endRad = ((cumAngle + angle) * Math.PI) / 180;
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            const large = angle > 180 ? 1 : 0;
            if (angle > 0.5) {
                paths += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) +
                    ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) +
                    ' Z" fill="' + (DONUT_COLORS[i % DONUT_COLORS.length]) + '" opacity=".85"/>';
            }
            cumAngle += angle;
        });
        const inner = r * 0.55;
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + inner + '" fill="var(--bg)"/>';
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + paths + '</svg>';
    }

    function _buildAreaChart(dailyData, w, h) {
        if (!dailyData.length) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:40px 0">No data for this period</div>';
        const maxVal = Math.max(...dailyData.map(d => d.value), 1);
        const step = w / Math.max(dailyData.length - 1, 1);
        const pts = dailyData.map((d, i) => {
            const x = (i * step).toFixed(1);
            const y = (h - (d.value / maxVal) * (h * 0.85) - h * 0.05).toFixed(1);
            return { x, y, label: d.label, value: d.value };
        });
        const linePath = 'M' + pts.map(p => p.x + ',' + p.y).join(' L');
        const areaPath = 'M0,' + h + ' L' + pts.map(p => p.x + ',' + p.y).join(' L') + ' L' + (w) + ',' + h + ' Z';

        let gridLines = '';
        for (let i = 0; i <= 4; i++) {
            const gy = (h - (i / 4) * h * 0.85 - h * 0.05).toFixed(1);
            const val = Math.round((i / 4) * maxVal);
            gridLines += '<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="var(--border)" stroke-width=".5" stroke-dasharray="4,4"/>';
            gridLines += '<text x="2" y="' + (parseFloat(gy) - 3) + '" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + val + '</text>';
        }

        let dots = '';
        pts.forEach((p, i) => {
            dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="var(--accent)" opacity="0" data-chart-idx="' + i + '">' +
                '<set attributeName="opacity" to="1" begin="mouseover" end="mouseout"/></circle>';
        });

        const labels = [];
        const labelStep = Math.max(1, Math.floor(dailyData.length / 6));
        for (let i = 0; i < dailyData.length; i += labelStep) labels.push(dailyData[i].label);
        if (dailyData.length > 1 && (dailyData.length - 1) % labelStep !== 0) labels.push(dailyData[dailyData.length - 1].label);

        return '<div class="lb-chart-area"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            gridLines +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".08"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            dots +
            '</svg><div class="lb-chart-tooltip" id="lbChartTip"></div></div>' +
            '<div class="lb-chart-labels">' + labels.map(l => '<span>' + l + '</span>').join('') + '</div>';
    }

    /* ═══════════════════════════════════════════════════
       C3: READING FUNNEL VISUALIZATION
       ═══════════════════════════════════════════════════ */
    function _buildFunnelChart(readingHistory, w) {
        w = w || 280;
        if (!readingHistory || !Array.isArray(readingHistory)) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No reading data</div>';
        var total = readingHistory.length;
        if (!total) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No reading data</div>';
        var started = readingHistory.filter(function(r) { return (r.progress || 0) > 0; }).length;
        var q25 = readingHistory.filter(function(r) { return (r.progress || 0) >= 25; }).length;
        var q50 = readingHistory.filter(function(r) { return (r.progress || 0) >= 50; }).length;
        var q75 = readingHistory.filter(function(r) { return (r.progress || 0) >= 75; }).length;
        var completed = readingHistory.filter(function(r) { return r.completed; }).length;

        var stages = [
            { label: 'Landed', value: total, pct: 100 },
            { label: 'Started', value: started, pct: Math.round((started / total) * 100) },
            { label: '25%', value: q25, pct: Math.round((q25 / total) * 100) },
            { label: '50%', value: q50, pct: Math.round((q50 / total) * 100) },
            { label: '75%', value: q75, pct: Math.round((q75 / total) * 100) },
            { label: 'Done', value: completed, pct: Math.round((completed / total) * 100) }
        ];

        var colors = ['#00e1ff','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75'];
        var html = '<div class="lb-funnel">';
        stages.forEach(function(s, i) {
            var barW = Math.max(60, (s.pct / 100) * w);
            html += '<div class="lb-funnel-stage" style="width:' + barW + 'px;background:' + colors[i] + ';opacity:' + (1 - i * 0.12).toFixed(2) + '">' +
                '<span class="lb-funnel-value">' + s.value + '</span>' +
                '<span class="lb-funnel-label">' + s.label + ' (' + s.pct + '%)</span></div>';
        });
        html += '</div>';
        return html;
    }

    /* ═══════════════════════════════════════════════════
       C4: PUBLISHING TIME HEATMAP
       ═══════════════════════════════════════════════════ */
    function _buildPublishHeatmap(articles, visits) {
        var grid = {};
        var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) grid[d + ':' + h] = { views: 0, count: 0 };

        articles.forEach(function(a) {
            if (!a.created_at) return;
            var dt = new Date(a.created_at);
            var key = dt.getDay() + ':' + dt.getHours();
            grid[key].views += (a.views || 0);
            grid[key].count++;
        });

        var maxViews = 1;
        Object.values(grid).forEach(function(cell) { if (cell.views > maxViews) maxViews = cell.views; });

        var hours = [];
        for (var h = 0; h < 24; h++) hours.push(h);
        var html = '<div class="lb-heatmap-wrap"><table class="lb-heatmap"><thead><tr><th></th>';
        hours.forEach(function(h) { html += '<th>' + (h < 10 ? '0' : '') + h + '</th>'; });
        html += '</tr></thead><tbody>';

        dayNames.forEach(function(dayName, d) {
            html += '<tr><th>' + dayName + '</th>';
            hours.forEach(function(h) {
                var cell = grid[d + ':' + h];
                var intensity = cell.views / maxViews;
                var bg = 'rgba(0,225,255,' + (intensity * 0.8).toFixed(2) + ')';
                html += '<td style="background:' + bg + '"><div class="lb-heatmap-tip">' + dayName + ' ' + h + ':00 · ' + cell.views + ' views / ' + cell.count + ' posts</div></td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    /* ═══════════════════════════════════════════════════
       C5: PREDICTIVE TRAFFIC FORECASTING
       ═══════════════════════════════════════════════════ */
    function _linearRegression(data) {
        var n = data.length;
        if (n < 3) return { slope: 0, intercept: 0, predict: function() { return 0; } };
        var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        data.forEach(function(d, i) { sumX += i; sumY += d.value; sumXY += i * d.value; sumXX += i * i; });
        var denom = n * sumXX - sumX * sumX;
        if (denom === 0) return { slope: 0, intercept: sumY / n, predict: function(x) { return Math.max(0, Math.round(sumY / n)); } };
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        return {
            slope: slope,
            intercept: intercept,
            predict: function(x) { return Math.max(0, Math.round(slope * x + intercept)); }
        };
    }

    function _buildAreaChartWithForecast(dailyData, w, h, forecastDays) {
        if (!dailyData.length) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:40px 0">No data for this period</div>';

        var reg = _linearRegression(dailyData);
        var forecast = [];
        if (forecastDays && dailyData.length >= 7) {
            for (var f = 0; f < forecastDays; f++) {
                var idx = dailyData.length + f;
                var dt = new Date(Date.now() + (f + 1) * 86400000);
                forecast.push({ label: (dt.getMonth() + 1) + '/' + dt.getDate(), value: reg.predict(idx), date: dt.toISOString().slice(0, 10) });
            }
        }

        var allData = dailyData.concat(forecast);
        var maxVal = Math.max(...allData.map(function(d) { return d.value; }), 1);
        var totalPts = allData.length;
        var step = w / Math.max(totalPts - 1, 1);

        var pts = allData.map(function(d, i) {
            var x = (i * step).toFixed(1);
            var y = (h - (d.value / maxVal) * (h * 0.85) - h * 0.05).toFixed(1);
            return { x: x, y: y, label: d.label, value: d.value };
        });

        var realPts = pts.slice(0, dailyData.length);
        var fcPts = pts.slice(dailyData.length - 1);

        var linePath = 'M' + realPts.map(function(p) { return p.x + ',' + p.y; }).join(' L');
        var areaPath = 'M0,' + h + ' L' + realPts.map(function(p) { return p.x + ',' + p.y; }).join(' L') + ' L' + realPts[realPts.length - 1].x + ',' + h + ' Z';

        var gridLines = '';
        for (var i = 0; i <= 4; i++) {
            var gy = (h - (i / 4) * h * 0.85 - h * 0.05).toFixed(1);
            var val = Math.round((i / 4) * maxVal);
            gridLines += '<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="var(--border)" stroke-width=".5" stroke-dasharray="4,4"/>';
            gridLines += '<text x="2" y="' + (parseFloat(gy) - 3) + '" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + val + '</text>';
        }

        var forecastSvg = '';
        if (fcPts.length > 1) {
            var fcLine = 'M' + fcPts.map(function(p) { return p.x + ',' + p.y; }).join(' L');
            var fcArea = 'M' + fcPts[0].x + ',' + h + ' L' + fcPts.map(function(p) { return p.x + ',' + p.y; }).join(' L') + ' L' + fcPts[fcPts.length - 1].x + ',' + h + ' Z';
            forecastSvg = '<path d="' + fcArea + '" class="lb-forecast-band" fill="var(--accent)"/>' +
                '<path d="' + fcLine + '" class="lb-forecast-line" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        }

        var labels = [];
        var labelStep = Math.max(1, Math.floor(allData.length / 6));
        for (var i = 0; i < allData.length; i += labelStep) labels.push(allData[i].label);

        return '<div class="lb-chart-area"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            gridLines +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".08"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            forecastSvg +
            '</svg></div>' +
            '<div class="lb-chart-labels">' + labels.map(function(l) { return '<span>' + l + '</span>'; }).join('') + '</div>' +
            (forecast.length ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-top:4px;text-align:right">Dashed = ' + forecastDays + '-day forecast (linear regression)</div>' : '');
    }

    /* ═══════════════════════════════════════════════════
       C6: COMPARATIVE ARTICLE ANALYSIS (Radar Chart)
       ═══════════════════════════════════════════════════ */
    function _buildRadarChart(articles, data, size) {
        size = size || 220;
        var cx = size / 2, cy = size / 2, r = size / 2 - 30;
        var dims = ['Views','Reactions','Comments','Completion','Time Spent'];
        var angleStep = (2 * Math.PI) / dims.length;
        var colors = ['#00e1ff','#f59e0b','#22c55e','#ec4899','#8b5cf6'];

        var maxVals = dims.map(function() { return 1; });
        articles.forEach(function(a) {
            var vals = _getArticleDimValues(a, data);
            vals.forEach(function(v, i) { if (v > maxVals[i]) maxVals[i] = v; });
        });

        var axisLines = '', axisLabels = '';
        dims.forEach(function(dim, i) {
            var angle = -Math.PI / 2 + i * angleStep;
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            axisLines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="0.5"/>';
            var lx = cx + (r + 18) * Math.cos(angle);
            var ly = cy + (r + 18) * Math.sin(angle);
            axisLabels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + dim + '</text>';
        });

        var gridRings = '';
        [0.25, 0.5, 0.75, 1].forEach(function(pct) {
            var pts = dims.map(function(_, i) {
                var angle = -Math.PI / 2 + i * angleStep;
                return (cx + r * pct * Math.cos(angle)).toFixed(1) + ',' + (cy + r * pct * Math.sin(angle)).toFixed(1);
            }).join(' ');
            gridRings += '<polygon points="' + pts + '" fill="none" stroke="var(--border)" stroke-width="0.5" opacity=".4"/>';
        });

        var polygons = '';
        articles.forEach(function(a, ai) {
            var vals = _getArticleDimValues(a, data);
            var pts = vals.map(function(v, i) {
                var norm = maxVals[i] ? v / maxVals[i] : 0;
                var angle = -Math.PI / 2 + i * angleStep;
                return (cx + r * norm * Math.cos(angle)).toFixed(1) + ',' + (cy + r * norm * Math.sin(angle)).toFixed(1);
            }).join(' ');
            polygons += '<polygon points="' + pts + '" fill="' + colors[ai % colors.length] + '" fill-opacity=".15" stroke="' + colors[ai % colors.length] + '" stroke-width="2"/>';
        });

        var legend = articles.map(function(a, i) {
            return '<div class="lb-radar-item"><span class="lb-radar-swatch" style="background:' + colors[i % colors.length] + '"></span>' + esc((a.title || '').slice(0, 30)) + '</div>';
        }).join('');

        return '<div class="lb-radar-wrap"><svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
            gridRings + axisLines + polygons + axisLabels + '</svg>' +
            '<div class="lb-radar-legend">' + legend + '</div></div>';
    }

    function _getArticleDimValues(article, data) {
        var rx = article.reactions || {};
        var totalRx = Object.values(rx).reduce(function(s, v) { return s + (v || 0); }, 0);
        var comments = (data.comments || []).filter(function(c) { return c.article_id === article.id; }).length;
        var hist = (data.readingHistory || []).filter(function(r) { return r.article_id === article.id; });
        var avgComp = hist.length ? hist.reduce(function(s, r) { return s + (r.progress || 0); }, 0) / hist.length * 100 : 0;
        var avgTime = hist.length ? hist.reduce(function(s, r) { return s + (r.time_spent || 0); }, 0) / hist.length / 60 : 0;
        return [article.views || 0, totalRx, comments, avgComp, avgTime];
    }

    function _showCompareOverlay(selectedSlugs, data) {
        if (!data || !data.published) return;
        var articles = data.published.filter(function(a) { return a.slug && selectedSlugs.indexOf(a.slug) >= 0; });
        if (articles.length < 2) { if (window.UniToast) window.UniToast('Select at least 2 articles to compare', '', '⚠️', 'warn'); return; }
        var overlay = document.createElement('div');
        overlay.className = 'lb-compare-overlay';
        overlay.innerHTML = '<div class="lb-compare-modal">' +
            '<button class="lb-compare-close">ESC</button>' +
            '<div style="font-family:Inter,sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px">Comparative Analysis</div>' +
            _buildRadarChart(articles, data, 240) +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.lb-compare-close').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }

    function _aggregateDaily(visits, days) {
        const buckets = {};
        const now = Date.now();
        let d = days;
        if (!d && visits.length) {
            const oldest = new Date(visits[0].created_at).getTime();
            d = Math.max(7, Math.ceil((now - oldest) / 86400000) + 1);
        }
        d = d || 30;
        for (let i = 0; i < d; i++) {
            const dt = new Date(now - (d - 1 - i) * 86400000);
            const key = dt.toISOString().slice(0, 10);
            buckets[key] = 0;
        }
        visits.forEach(v => {
            const key = new Date(v.created_at).toISOString().slice(0, 10);
            if (key in buckets) buckets[key]++;
        });
        return Object.entries(buckets).map(([k, v]) => ({
            label: k.slice(5),
            value: v,
            date: k
        }));
    }

    function _computeDelta(cur, prev) {
        if (!prev) return { pct: 0, dir: 'flat' };
        const pct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
        return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
    }

    function _deltaHTML(delta) {
        const arrow = delta.dir === 'up' ? '\u25b2' : delta.dir === 'down' ? '\u25bc' : '\u2014';
        return '<span class="lb-kpi-delta ' + delta.dir + '">' + arrow + ' ' + delta.pct + '%</span>';
    }

    function _getDailySparkData(visits, days) {
        const d = days || 7;
        const buckets = [];
        const now = Date.now();
        for (let i = 0; i < d; i++) {
            const dt = new Date(now - (d - 1 - i) * 86400000);
            const key = dt.toISOString().slice(0, 10);
            buckets.push({ key, count: 0 });
        }
        visits.forEach(v => {
            const key = new Date(v.created_at).toISOString().slice(0, 10);
            const b = buckets.find(b => b.key === key);
            if (b) b.count++;
        });
        return buckets.map(b => b.count);
    }

    function _extractDomain(referrer) {
        if (!referrer) return '(direct)';
        try {
            const u = new URL(referrer);
            return u.hostname.replace(/^www\./, '');
        } catch (e) { return referrer.slice(0, 40); }
    }

    function _renderDrillDown(article, data) {
        const articleComments = data.comments.filter(c => c.article_id === article.id);
        const articleHistory = data.readingHistory.filter(r => r.article_id === article.id);
        const articleVisits = data.blogVisits.filter(v => v.page_url && v.page_url.includes(article.slug));

        const rx = article.reactions || {};
        const rxKeys = ['heart', 'fire', 'bulb', 'clap', 'target'];
        const rxIcons = { heart: '\u2764\ufe0f', fire: '\ud83d\udd25', bulb: '\ud83d\udca1', clap: '\ud83d\udc4f', target: '\ud83c\udfaf' };
        const rxMax = Math.max(...rxKeys.map(k => rx[k] || 0), 1);

        const avgProg = articleHistory.length
            ? Math.round(articleHistory.reduce((s, r) => s + (r.progress || 0), 0) / articleHistory.length * 100)
            : 0;
        const avgTime = articleHistory.length
            ? Math.round(articleHistory.reduce((s, r) => s + (r.time_spent || 0), 0) / articleHistory.length)
            : 0;
        const compRate = articleHistory.length
            ? Math.round(articleHistory.filter(r => r.completed).length / articleHistory.length * 100)
            : 0;

        const refCounts = {};
        articleVisits.forEach(v => {
            const d = _extractDomain(v.referrer);
            refCounts[d] = (refCounts[d] || 0) + 1;
        });
        const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const dailyVisits = _aggregateDaily(articleVisits, _analyticsDays);

        const overlay = document.createElement('div');
        overlay.className = 'lb-drill-overlay';
        overlay.innerHTML =
            '<div class="lb-drill-modal">' +
            '<button class="lb-drill-close" aria-label="Close drill-down">ESC</button>' +
            '<div class="lb-drill-title">' + esc(article.title) + '</div>' +
            '<div class="lb-drill-subtitle">' + esc(article.slug) + ' \u00b7 ' + fmtDate(article.created_at) + '</div>' +
            '<div class="lb-drill-kpis">' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + (article.views || 0) + '</div><div class="lb-drill-kpi-label">Views</div></div>' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + articleComments.length + '</div><div class="lb-drill-kpi-label">Comments</div></div>' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + Object.values(rx).reduce((s, v) => s + (v || 0), 0) + '</div><div class="lb-drill-kpi-label">Reactions</div></div>' +
            '</div>' +
            '<div class="lb-drill-grid">' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">VIEWS OVER TIME</div>' +
                    _buildAreaChart(dailyVisits, 280, 100) +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">REACTIONS BREAKDOWN</div>' +
                    '<div class="lb-reaction-bar-chart">' +
                    rxKeys.map(k => {
                        const val = rx[k] || 0;
                        const h = Math.max(2, (val / rxMax) * 60);
                        return '<div class="lb-rx-bar-col">' +
                            '<div class="lb-rx-bar-val">' + val + '</div>' +
                            '<div class="lb-rx-bar" style="height:' + h + 'px"></div>' +
                            '<div class="lb-rx-bar-icon">' + (rxIcons[k] || k) + '</div></div>';
                    }).join('') +
                    '</div>' +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">READER ENGAGEMENT</div>' +
                    '<div class="lb-engagement-metrics">' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + avgProg + '%</div><div class="lb-eng-label">Avg Progress</div></div>' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(avgTime / 60) + 'm</div><div class="lb-eng-label">Avg Time</div></div>' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + compRate + '%</div><div class="lb-eng-label">Completion</div></div>' +
                    '</div>' +
                    '<div style="margin-top:12px"><div class="lb-drill-section-title">READING FUNNEL</div>' + _buildFunnelChart(articleHistory, 240) + '</div>' +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">TOP REFERRERS</div>' +
                    (topRefs.length ? topRefs.map((r, i) =>
                        '<div class="lb-ref-row"><span class="lb-ref-rank">' + (i + 1) + '</span><span class="lb-ref-domain">' + esc(r[0]) + '</span><span class="lb-ref-count">' + r[1] + '</span></div>'
                    ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:12px">No referrer data</div>') +
                '</div>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        overlay.querySelector('.lb-drill-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        const escHandler = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    function _exportCSV(data) {
        const rows = [['Title', 'Slug', 'Views', 'Reactions', 'Comments', 'Tags', 'Published Date']];
        const commentsByArticle = {};
        data.comments.forEach(c => { commentsByArticle[c.article_id] = (commentsByArticle[c.article_id] || 0) + 1; });

        data.published.forEach(a => {
            const rx = a.reactions || {};
            const totalRx = Object.values(rx).reduce((s, v) => s + (v || 0), 0);
            rows.push([
                '"' + (a.title || '').replace(/"/g, '""') + '"',
                a.slug,
                a.views || 0,
                totalRx,
                commentsByArticle[a.id] || 0,
                '"' + (a.tags || []).join(', ') + '"',
                a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : ''
            ]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blog-analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        if (window.UniToast) window.UniToast('CSV exported', '', '\u2913', 'success');
    }

    function _bindCompareCheckboxes(wrap, data) {
        var compareBtn = wrap.querySelector('#lbCompareBtn');
        var checks = wrap.querySelectorAll('.lb-perf-compare-check');
        var selectAll = wrap.querySelector('.lb-perf-select-all');
        function updateBtn() {
            var selected = wrap.querySelectorAll('.lb-perf-compare-check:checked');
            if (compareBtn) compareBtn.style.display = selected.length >= 2 ? '' : 'none';
        }
        checks.forEach(function(cb) { cb.addEventListener('change', updateBtn); });
        if (selectAll) selectAll.addEventListener('change', function() {
            checks.forEach(function(cb) { cb.checked = selectAll.checked; });
            updateBtn();
        });
        if (compareBtn) compareBtn.addEventListener('click', function() {
            var slugs = [];
            wrap.querySelectorAll('.lb-perf-compare-check:checked').forEach(function(cb) { slugs.push(cb.dataset.compareSlug); });
            if (slugs.length >= 2) _showCompareOverlay(slugs.slice(0, 5), data);
        });
    }

    async function renderAnalyticsDashboard() {
        const container = document.getElementById('lbAnalyticsContent');
        if (!container || !window._sb) return;
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">\ud83d\udcca</div>Loading analytics...</div>';

        try {
            const data = await _fetchAnalyticsData(_analyticsDays);
            if (!data) return;
            _analyticsCache = data;

            const dailyBlog = _aggregateDaily(data.blogVisits, _analyticsDays);
            const sparkVisits = _getDailySparkData(data.blogVisits, 7);
            const sparkComments = _getDailySparkData(data.comments, 7);

            const viewDelta = _computeDelta(data.curUniqueVisitors, data.prevUniqueVisitors);
            const prevComments = data.prevVisits.length ? Math.round(data.comments.length * 0.8) : 0;
            const commentDelta = _computeDelta(data.comments.length, prevComments);

            // Geographic breakdown
            const geoCounts = {};
            data.blogVisits.forEach(v => { if (v.country) geoCounts[v.country] = (geoCounts[v.country] || 0) + 1; });
            const geoTop = Object.entries(geoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const geoMax = geoTop.length ? geoTop[0][1] : 1;

            // Device breakdown
            const mobileCnt = data.blogVisits.filter(v => v.is_mobile).length;
            const desktopCnt = data.blogVisits.length - mobileCnt;
            const deviceSegments = [{ label: 'Desktop', value: desktopCnt }, { label: 'Mobile', value: mobileCnt }].filter(s => s.value > 0);

            // Browser breakdown
            const browserCounts = {};
            data.blogVisits.forEach(v => { if (v.browser) browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1; });
            const browserTop = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const browserSegments = browserTop.map(([name, val]) => ({ label: name, value: val }));

            // Referrer analysis
            const refCounts = {};
            data.blogVisits.forEach(v => { const d = _extractDomain(v.referrer); refCounts[d] = (refCounts[d] || 0) + 1; });
            const refTop = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

            // Tag performance
            const tagViews = {};
            data.published.forEach(a => { (a.tags || []).forEach(t => { tagViews[t] = (tagViews[t] || 0) + (a.views || 0); }); });
            const tagTop = Object.entries(tagViews).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const tagMax = tagTop.length ? tagTop[0][1] : 1;

            // Newsletter growth
            const subDaily = {};
            data.subscribers.forEach(s => {
                const key = new Date(s.created_at).toISOString().slice(0, 10);
                subDaily[key] = (subDaily[key] || 0) + 1;
            });
            let subCum = 0;
            const subGrowth = Object.entries(subDaily).sort().map(([k, v]) => { subCum += v; return { label: k.slice(5), value: subCum }; });

            // Content performance table
            const commentsByArticle = {};
            data.comments.forEach(c => { commentsByArticle[c.article_id] = (commentsByArticle[c.article_id] || 0) + 1; });
            const historyByArticle = {};
            data.readingHistory.forEach(r => {
                if (!historyByArticle[r.article_id]) historyByArticle[r.article_id] = [];
                historyByArticle[r.article_id].push(r);
            });

            /* ── C1: Advanced Engagement Scoring ── */
            let perfData = data.published.map(a => {
                const rx = a.reactions || {};
                const totalRx = Object.values(rx).reduce((s, v) => s + (v || 0), 0);
                const cCount = commentsByArticle[a.id] || 0;
                const hist = historyByArticle[a.id] || [];
                const avgComp = hist.length ? Math.round(hist.reduce((s, r) => s + (r.progress || 0), 0) / hist.length * 100) : 0;
                const avgTime = hist.length ? hist.reduce((s, r) => s + (r.time_spent || 0), 0) / hist.length / 60 : 0;
                const rawScore = (a.views || 0) * 1 + totalRx * 5 + cCount * 10 + (avgComp / 100) * 20 + avgTime * 2;
                return { ...a, totalRx, cCount, avgComp, avgTime, rawScore };
            });

            const maxRaw = Math.max(...perfData.map(p => p.rawScore), 1);
            perfData.forEach(a => {
                a.engScore = Math.round((a.rawScore / maxRaw) * 100);
                a.engGrade = a.engScore >= 90 ? 'A+' : a.engScore >= 80 ? 'A' : a.engScore >= 70 ? 'B+' : a.engScore >= 60 ? 'B' : a.engScore >= 50 ? 'C+' : a.engScore >= 40 ? 'C' : a.engScore >= 30 ? 'D' : 'F';
                a.engColor = a.engScore >= 70 ? '#22c55e' : a.engScore >= 50 ? '#f59e0b' : '#ef4444';
            });

            /* ── C2: Content Decay Detection ── */
            perfData.forEach(a => {
                const articleVisits = data.blogVisits.filter(v => v.page_url && v.page_url.includes(a.slug));
                const now = Date.now();
                const last7 = articleVisits.filter(v => (now - new Date(v.created_at).getTime()) < 7 * 86400000).length;
                const ageInDays = Math.max(1, (now - new Date(a.created_at).getTime()) / 86400000);
                const lifetimeDaily = (a.views || 0) / ageInDays;
                const recent7Daily = last7 / 7;
                if (lifetimeDaily < 0.1) { a.trend = 'stable'; a.trendIcon = '—'; a.trendColor = 'var(--sub)'; }
                else if (recent7Daily > lifetimeDaily * 1.5) { a.trend = 'up'; a.trendIcon = '▲'; a.trendColor = '#22c55e'; }
                else if (recent7Daily >= lifetimeDaily * 0.7) { a.trend = 'stable'; a.trendIcon = '—'; a.trendColor = 'var(--sub)'; }
                else if (recent7Daily >= lifetimeDaily * 0.3) { a.trend = 'declining'; a.trendIcon = '▼'; a.trendColor = '#f59e0b'; }
                else { a.trend = 'attention'; a.trendIcon = '⚠'; a.trendColor = '#ef4444'; }
            });

            const healthCounts = { up:0, stable:0, declining:0, attention:0 };
            perfData.forEach(a => { healthCounts[a.trend] = (healthCounts[a.trend] || 0) + 1; });

            const sortPerfData = (col, asc) => {
                const key = { title: 'title', views: 'views', reactions: 'totalRx', comments: 'cCount', completion: 'avgComp', score: 'engScore', trend: 'trend' }[col] || 'views';
                perfData.sort((a, b) => {
                    const av = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
                    const bv = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
                    return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
                });
            };
            sortPerfData(_analyticsSortCol, _analyticsSortAsc);

            const renderPerfTable = () => {
                const cols = [
                    { key: 'title', label: 'Article' },
                    { key: 'views', label: 'Views' },
                    { key: 'reactions', label: 'Rx' },
                    { key: 'comments', label: 'Cmt' },
                    { key: 'completion', label: 'Comp%' },
                    { key: 'score', label: 'Eng. Score' },
                    { key: 'trend', label: 'Trend' }
                ];
                return '<table class="lb-perf-table"><thead><tr>' +
                    cols.map(c => {
                        const sorted = _analyticsSortCol === c.key;
                        const arrow = sorted ? (_analyticsSortAsc ? '\u25b2' : '\u25bc') : '\u25bc';
                        return '<th data-perf-sort="' + c.key + '" class="' + (sorted ? 'sorted' : '') + '">' + c.label + ' <span class="sort-arrow">' + arrow + '</span></th>';
                    }).join('') +
                    '<th style="width:30px"><input type="checkbox" class="lb-perf-select-all" title="Select for comparison"></th>' +
                    '</tr></thead><tbody>' +
                    perfData.map(a =>
                        '<tr><td data-perf-drill="' + esc(a.slug) + '" title="' + esc(a.title) + '">' + esc(a.title) + '</td>' +
                        '<td>' + (a.views || 0) + '</td>' +
                        '<td>' + a.totalRx + '</td>' +
                        '<td>' + a.cCount + '</td>' +
                        '<td>' + a.avgComp + '%</td>' +
                        '<td><span style="display:inline-flex;align-items:center;gap:4px"><span style="background:' + a.engColor + ';color:#000;font-weight:700;padding:1px 5px;border-radius:3px;font-size:8px">' + a.engGrade + '</span> ' + a.engScore + '</span></td>' +
                        '<td><span style="color:' + a.trendColor + ';font-weight:700" title="' + a.trend + '">' + a.trendIcon + '</span></td>' +
                        '<td><input type="checkbox" class="lb-perf-compare-check" data-compare-slug="' + esc(a.slug) + '"></td>' +
                        '</tr>'
                    ).join('') +
                    '</tbody></table>' +
                    '<button class="lb-cms-btn secondary" id="lbCompareBtn" style="margin-top:8px;padding:4px 12px;font-size:9px;display:none">Compare Selected</button>';
            };

            // Build dashboard HTML
            container.innerHTML =
                '<div class="lb-analytics-dash">' +

                // Toolbar
                '<div class="lb-analytics-toolbar">' +
                    '<div class="lb-date-pills">' +
                        [7, 30, 90, 0].map(d => {
                            const isActive = d === 0 ? !_analyticsDays : _analyticsDays === d;
                            return '<button class="lb-date-pill' + (isActive ? ' active' : '') +
                            '" data-analytics-days="' + d + '">' + (d ? d + 'd' : 'All') + '</button>';
                        }).join('') +
                    '</div>' +
                    '<button class="lb-analytics-export" id="lbExportCSV">\u2913 EXPORT CSV</button>' +
                '</div>' +

                // KPI Cards
                '<div class="lb-analytics-kpis">' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalViews + '</div><div class="lb-kpi-label">Total Views</div>' + _deltaHTML(viewDelta) + '<div class="lb-kpi-sparkline">' + _buildSparklineSVG(sparkVisits, 170, 32) + '</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.published.length + '</div><div class="lb-kpi-label">Published</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalComments + '</div><div class="lb-kpi-label">Comments</div>' + _deltaHTML(commentDelta) + '<div class="lb-kpi-sparkline">' + _buildSparklineSVG(sparkComments, 170, 32) + '</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalReactions + '</div><div class="lb-kpi-label">Reactions</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.subscriberCount + '</div><div class="lb-kpi-label">Subscribers</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + Math.round(data.avgCompletion * 100) + '%</div><div class="lb-kpi-label">Avg Read Completion</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="font-size:16px"><span style="color:#22c55e">' + healthCounts.up + '</span> <span style="color:var(--sub)">' + healthCounts.stable + '</span> <span style="color:#f59e0b">' + healthCounts.declining + '</span> <span style="color:#ef4444">' + healthCounts.attention + '</span></div><div class="lb-kpi-label">Content Health (▲ — ▼ ⚠)</div></div>' +
                '</div>' +

                // Views chart (full width)
                '<div class="lb-analytics-panel full-width">' +
                    '<div class="lb-analytics-panel-title">BLOG TRAFFIC <span style="font-weight:400;font-size:8px">' + data.blogVisits.length + ' visits · with forecast</span></div>' +
                    _buildAreaChartWithForecast(dailyBlog, 600, 180, 14) +
                '</div>' +

                // Grid: Geo + Device/Browser
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">GEOGRAPHIC BREAKDOWN</div>' +
                        (geoTop.length ? geoTop.map(([country, cnt]) =>
                            '<div class="lb-geo-row">' +
                            '<span class="lb-geo-flag">' + (COUNTRY_FLAGS[country] || '\ud83c\udf10') + '</span>' +
                            '<span class="lb-geo-name">' + esc(country) + '</span>' +
                            '<div class="lb-geo-bar"><div class="lb-geo-bar-fill" style="width:' + Math.max(3, (cnt / geoMax) * 100) + '%"></div></div>' +
                            '<span class="lb-geo-count">' + cnt + '</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No geographic data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">DEVICE SPLIT</div>' +
                        (deviceSegments.length ? '<div class="lb-donut-wrap">' +
                            _buildDonutSVG(deviceSegments, 100) +
                            '<div class="lb-donut-legend">' +
                            deviceSegments.map((s, i) =>
                                '<div class="lb-donut-item"><span class="lb-donut-swatch" style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></span>' + esc(s.label) +
                                '<span class="lb-donut-pct">' + Math.round(s.value / Math.max(data.blogVisits.length, 1) * 100) + '%</span></div>'
                            ).join('') +
                            '</div></div>' : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No device data</div>') +
                        (browserSegments.length ? '<div style="margin-top:16px"><div class="lb-analytics-panel-title" style="margin-bottom:10px">BROWSER</div><div class="lb-donut-wrap">' +
                            _buildDonutSVG(browserSegments, 80) +
                            '<div class="lb-donut-legend">' +
                            browserSegments.map((s, i) =>
                                '<div class="lb-donut-item"><span class="lb-donut-swatch" style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></span>' + esc(s.label) +
                                '<span class="lb-donut-pct">' + Math.round(s.value / Math.max(data.blogVisits.length, 1) * 100) + '%</span></div>'
                            ).join('') +
                            '</div></div></div>' : '') +
                    '</div>' +
                '</div>' +

                // Grid: Referrers + Engagement
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">TOP REFERRERS</div>' +
                        (refTop.length ? refTop.map(([domain, cnt], i) =>
                            '<div class="lb-ref-row"><span class="lb-ref-rank">' + (i + 1) + '</span><span class="lb-ref-domain">' + esc(domain) + '</span><span class="lb-ref-count">' + cnt + '</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No referrer data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">READER ENGAGEMENT</div>' +
                        '<div class="lb-engagement-metrics">' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.avgCompletion * 100) + '%</div><div class="lb-eng-label">Avg Progress</div></div>' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.avgTimeSpent / 60) + 'm</div><div class="lb-eng-label">Avg Time Spent</div></div>' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.completionRate * 100) + '%</div><div class="lb-eng-label">Completion Rate</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // Grid: Tag performance + Newsletter growth
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">TAG PERFORMANCE</div>' +
                        (tagTop.length ? tagTop.map(([tag, views]) =>
                            '<div class="lb-tag-perf-row"><span class="lb-tag-perf-name">' + esc(tag) + '</span>' +
                            '<div class="lb-tag-perf-bar"><div class="lb-tag-perf-bar-fill" style="width:' + Math.max(3, (views / tagMax) * 100) + '%"></div></div>' +
                            '<span class="lb-tag-perf-val">' + views + ' views</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No tag data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">NEWSLETTER GROWTH</div>' +
                        (subGrowth.length ? _buildAreaChart(subGrowth, 280, 120) : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No subscriber data</div>') +
                    '</div>' +
                '</div>' +

                // C3: Reading Funnel + C4: Publishing Time Heatmap
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">READING FUNNEL</div>' +
                        _buildFunnelChart(data.readingHistory, 260) +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">BEST PUBLISHING TIME</div>' +
                        _buildPublishHeatmap(data.published, data.blogVisits) +
                    '</div>' +
                '</div>' +

                // Content performance table
                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1">' +
                    '<div class="lb-analytics-panel-title">CONTENT PERFORMANCE <span style="font-weight:400;font-size:8px">' + perfData.length + ' articles</span></div>' +
                    '<div id="lbPerfTableWrap">' + renderPerfTable() + '</div>' +
                '</div>' +

                // Recent comments
                (data.recentComments.length ? '<div class="lb-analytics-panel full-width" style="grid-column:1/-1">' +
                    '<div class="lb-analytics-panel-title">RECENT COMMENTS</div>' +
                    data.recentComments.map(c =>
                        '<div class="lb-activity-row">' +
                        '<span class="lb-activity-author">' + esc(c.author_name) + '</span>' +
                        '<span class="lb-activity-text">' + esc((c.content || '').slice(0, 80)) + '</span>' +
                        '<span class="lb-activity-time">' + timeAgo(c.created_at) + '</span></div>'
                    ).join('') +
                '</div>' : '') +

                '</div>';

            // Bind date pill switching
            container.querySelectorAll('.lb-date-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const d = parseInt(pill.dataset.analyticsDays, 10);
                    _analyticsDays = d || null;
                    renderAnalyticsDashboard();
                });
            });

            // Bind CSV export
            const exportBtn = document.getElementById('lbExportCSV');
            if (exportBtn) exportBtn.addEventListener('click', () => _exportCSV(data));

            // Bind table sorting + drill-down via event delegation
            const perfWrap = document.getElementById('lbPerfTableWrap');
            if (perfWrap) {
                perfWrap.addEventListener('click', function(e) {
                    const sortTh = e.target.closest('[data-perf-sort]');
                    if (sortTh) {
                        const col = sortTh.dataset.perfSort;
                        if (_analyticsSortCol === col) _analyticsSortAsc = !_analyticsSortAsc;
                        else { _analyticsSortCol = col; _analyticsSortAsc = false; }
                        sortPerfData(_analyticsSortCol, _analyticsSortAsc);
                        perfWrap.innerHTML = renderPerfTable();
                        _bindCompareCheckboxes(perfWrap, data);
                        return;
                    }
                    const drillTd = e.target.closest('[data-perf-drill]');
                    if (drillTd) {
                        const slug = drillTd.dataset.perfDrill;
                        const article = data.published.find(a => a.slug === slug);
                        if (article) _renderDrillDown(article, data);
                    }
                });
                _bindCompareCheckboxes(perfWrap, data);
            }

        } catch (e) {
            console.error('[blog] Analytics error:', e);
            container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">\u26a0\ufe0f</div>Failed to load analytics.</div>';
        }
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
                        '<span class="lb-version-time">' + timeAgo(v.created_at) + '</span>' +
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
                    _setEditorValue(ver.content || '');
                    document.getElementById('lbCmsExcerpt').value = ver.excerpt || '';
                    if (ver.tags) document.getElementById('lbCmsTags').value = (ver.tags || []).join(', ');
                    document.getElementById('lbCmsPreviewContent').innerHTML = parseMarkdown(ver.content || '');
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
        const slug = document.getElementById('lbCmsSlug').value.trim() || slugify(title);
        const excerpt = document.getElementById('lbCmsExcerpt').value.trim();
        const tags = document.getElementById('lbCmsTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        const cover = document.getElementById('lbCmsCover').value.trim();
        const content = _getEditorValue();
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
            if (editingArticle) {
                try { await window._sb.rpc('save_article_version', { p_article_id: editingArticle.id }); } catch(e) {}
                const res = await window._sb.from('longform_articles').update(row).eq('id', editingArticle.id);
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
                    const _dk = '_lb_drafts';
                    let _dd = JSON.parse(localStorage.getItem(_dk)) || [];
                    _dd = _dd.filter(function(d) { return d.id !== window._lbActiveDraftId; });
                    localStorage.setItem(_dk, JSON.stringify(_dd));
                    window._lbActiveDraftId = null;
                } catch(e) {}
            }
            try { localStorage.removeItem('_lb_article_draft'); } catch(e) {}

            if (isAutoSave && !editingArticle && insertedRow) {
                editingArticle = insertedRow;
                document.getElementById('lbCmsStatus').textContent = 'Auto-saved to cloud.';
                const pubBtn2 = document.getElementById('lbCmsPublish');
                const draftBtn2 = document.getElementById('lbCmsDraft');
                if (pubBtn2) pubBtn2.disabled = false;
                if (draftBtn2) draftBtn2.disabled = false;
                return true;
            }

            _markCmsClean();
            const doneMsg = scheduledAt ? 'Scheduled!' : (publish ? 'Published!' : 'Draft saved!');
            document.getElementById('lbCmsStatus').textContent = doneMsg;

            if (window.UniToast && !isAutoSave) {
                window.UniToast(scheduledAt ? 'Article scheduled!' : (publish ? 'Article published!' : 'Draft saved.'), '', scheduledAt ? '\ud83d\udd50' : (publish ? '\ud83d\ude80' : '\ud83d\udcbe'), 'success');
            }

            if (!editingArticle && !isAutoSave) {
                document.getElementById('lbCmsTitle').value = '';
                document.getElementById('lbCmsSlug').value = '';
                document.getElementById('lbCmsExcerpt').value = '';
                document.getElementById('lbCmsTags').value = '';
                document.getElementById('lbCmsCover').value = '';
                _setEditorValue('');
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

            if (!isAutoSave) editingArticle = null;
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
                            navigateTo({ post: slug });
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
        if (e.ctrlKey && e.shiftKey && e.key === ADMIN_SHORTCUT.key) {
            e.preventDefault();
            if (adminDialog && adminDialog.open) {
                closeAdmin();
            } else {
                openAdmin();
            }
        }
    });

    // ESC to close admin dialog (native dialog handles this, but ensure proper cleanup)
    if (adminDialog) {
        adminDialog.addEventListener('close', () => {
            snd('menuClose');
        });
        adminDialog.addEventListener('click', e => {
            if (e.target === adminDialog) closeAdmin();
        });
    }

    /* ═══════════════════════════════════════════════════
       B1: COMMAND PALETTE (Ctrl+K)
       ═══════════════════════════════════════════════════ */
    (function injectCmdPaletteCSS() {
        var s = document.createElement('style');
        s.textContent = `
            .lb-cmd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding-top:min(20vh,160px)}
            .lb-cmd-box{background:var(--bg,#0d1117);border:1px solid var(--border,#1e293b);border-radius:12px;width:min(520px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;font-family:'JetBrains Mono',monospace}
            .lb-cmd-input{width:100%;padding:14px 18px;background:transparent;border:none;border-bottom:1px solid var(--border,#1e293b);color:var(--text,#e2e8f0);font-size:13px;font-family:inherit;outline:none}
            .lb-cmd-input::placeholder{color:var(--sub,#475569)}
            .lb-cmd-results{max-height:320px;overflow-y:auto;padding:6px 0}
            .lb-cmd-item{display:flex;align-items:center;gap:10px;padding:9px 18px;cursor:pointer;font-size:11px;color:var(--text,#e2e8f0);transition:background .1s}
            .lb-cmd-item:hover,.lb-cmd-item.active{background:rgba(0,225,255,.08)}
            .lb-cmd-item.active{border-left:2px solid var(--accent,#00e1ff)}
            .lb-cmd-icon{width:20px;text-align:center;font-size:13px;opacity:.7}
            .lb-cmd-label{flex:1}
            .lb-cmd-shortcut{font-size:9px;color:var(--sub,#475569);letter-spacing:.5px}
            .lb-cmd-empty{padding:20px;text-align:center;color:var(--sub,#475569);font-size:10px}
            .lb-cmd-cat{padding:6px 18px 3px;font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:var(--sub,#475569);font-weight:700}
        `;
        document.head.appendChild(s);
    })();

    var _cmdPaletteOpen = false;

    function _getCmdPaletteCommands() {
        return [
            { id:'newArticle', icon:'📝', label:'New Article', cat:'Content', action:function(){ _switchAdminTab('article'); _clickEl('lbDraftsNew'); }},
            { id:'newThought', icon:'💭', label:'New Thought', cat:'Content', action:function(){ _switchAdminTab('micro'); _clickEl('lbTDraftsNew'); }},
            { id:'publish', icon:'🚀', label:'Publish Current Article', cat:'Content', action:function(){ _clickEl('lbCmsPublish'); }},
            { id:'saveDraft', icon:'💾', label:'Save Draft', cat:'Content', key:'Ctrl+S', action:function(){ _clickEl('lbCmsDraft'); }},
            { id:'togglePreview', icon:'👁', label:'Toggle Preview', cat:'Editor', action:function(){ _clickEl('lbPreviewToggle'); }},
            { id:'fullscreen', icon:'⛶', label:'Fullscreen Editor', cat:'Editor', action:function(){ _clickEl('lbEditorFullscreen'); }},
            { id:'insertTable', icon:'▦', label:'Insert Table', cat:'Insert', action:function(){ if(typeof insertFormat==='function') insertFormat('table'); }},
            { id:'insertCode', icon:'⌨', label:'Insert Code Block', cat:'Insert', action:function(){ if(typeof insertFormat==='function') insertFormat('codeblock'); }},
            { id:'insertCallout', icon:'📌', label:'Insert Callout', cat:'Insert', action:function(){ if(typeof insertFormat==='function') insertFormat('callout'); }},
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
        if (!adminDialog) return;
        var tab = adminDialog.querySelector('[data-admintab="' + tabKey + '"]');
        if (tab) tab.click();
    }
    function _switchSubTab(subKey) {
        if (!adminDialog) return;
        var tab = adminDialog.querySelector('[data-subtab="' + subKey + '"]');
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
        if (_cmdPaletteOpen || !adminDialog || !adminDialog.open) return;
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
        if (e.ctrlKey && e.key === 'k' && adminDialog && adminDialog.open) {
            e.preventDefault();
            openCmdPalette();
        }
    });

    /* ═══════════════════════════════════════════════════
       INLINE ARTICLE FEED (for tabbed content hub)
       ═══════════════════════════════════════════════════ */
    var inlineArticleFeed = document.getElementById('inlineArticleFeed');
    function renderInlineArticles(articles) {
        if (!inlineArticleFeed) return;
        if (!articles || !articles.length) {
            inlineArticleFeed.innerHTML = '<div style="text-align:center;color:#6b7a90;font-size:11px;padding:16px;font-family:\'JetBrains Mono\',monospace">No articles published yet.</div>';
            return;
        }
        var show = articles.slice(0, 5);
        inlineArticleFeed.innerHTML = show.map(function(a, i) {
            var excerpt = esc((a.excerpt || '').slice(0, 140));
            if ((a.excerpt || '').length > 140) excerpt += '…';
            var tags = (a.tags || []).slice(0, 3).map(function(t) {
                return '<span class="blog-inline-tag">' + esc(t) + '</span>';
            }).join(' ');
            return '<div class="blog-inline-post" data-inline-article-slug="' + esc(a.slug) + '" style="cursor:pointer;transition-delay:' + (i * 60) + 'ms">' +
                '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#6b7a90;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">' + fmtDate(a.created_at) + ' · ' + readingTime(a.content || a.excerpt || '') + '</div>' +
                '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3">' + esc(a.title) + '</div>' +
                (excerpt ? '<div style="font-size:12px;color:#6b7a90;line-height:1.5;margin-bottom:6px">' + excerpt + '</div>' : '') +
                (tags ? '<div style="display:flex;gap:4px;flex-wrap:wrap">' + tags + '</div>' : '') +
                '</div>';
        }).join('');
        requestAnimationFrame(function() {
            inlineArticleFeed.querySelectorAll('.blog-inline-post').forEach(function(el) { el.classList.add('visible'); });
        });
    }
    if (inlineArticleFeed) {
        inlineArticleFeed.innerHTML = [0, 1, 2].map(function() { return '<div class="blog-skeleton" style="margin-bottom:0"><div class="blog-skel-line"></div><div class="blog-skel-line"></div><div class="blog-skel-line"></div></div>'; }).join('');
        if (window._sb) {
            window._sb.from('longform_articles')
                .select('id,title,slug,excerpt,content,created_at,tags,views,series_name')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(5)
                .then(function(r) { renderInlineArticles(r.data || []); })
                .catch(function() { renderInlineArticles([]); });
        } else {
            renderInlineArticles([]);
        }
        inlineArticleFeed.addEventListener('click', function(e) {
            var card = e.target.closest('[data-inline-article-slug]');
            if (card) navigateTo({ post: card.dataset.inlineArticleSlug });
        });
    }

    /* ═══════════════════════════════════════════════════
       GLOBAL API
       ═══════════════════════════════════════════════════ */
    window._blogNav = (params) => navigateTo(params);
    window._blogGoHome = goToPortfolio;
    window.openBlogAdmin = openAdmin;
    window._hasBlogAdminSession = () => !!adminSession;

    // Terminal integration
    if (window.TermCmds) {
        window.TermCmds.blog_articles = () => {
            setTimeout(() => navigateTo({ blog: 'feed' }), 200);
            return '<span class="term-green">📝 Opening Blog...</span>';
        };
        if (window.TermCmds._meta) {
            window.TermCmds._meta['blog_articles'] = { cat: 'APPS', desc: 'Read Amr\'s longform blog articles' };
        }
    }

    /* ═══════════════════════════════════════════════════
       INITIAL ROUTE CHECK
       ═══════════════════════════════════════════════════ */
    // Check route on page load (deferred to let other scripts initialize)
    setTimeout(() => {
        const route = getRoute();
        if (route.view !== 'portfolio') {
            handleRoute();
        }
        if (new URLSearchParams(location.search).has('admin')) {
            openAdmin();
        }
    }, 100);

})();
