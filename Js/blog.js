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
    let _routeGen = 0; // Race condition guard: increment on each route change
    const _viewedSlugs = new Set(); // Prevent view inflation on refresh/back

    /* ═══════════════════════════════════════════════════
       CSS — Cyber-Editorial Design Language
       ═══════════════════════════════════════════════════ */
    const css = document.createElement('style');
    css.id = 'longform-blog-css';
    css.textContent = `
/* ── Blog View Container ── */
#blogView{display:none;min-height:100vh;background:var(--bg);padding:0 16px;position:relative;z-index:2}
#blogView.active{display:block}
.lb-wrap{max-width:800px;margin:0 auto;padding:40px 0 80px}

/* ── Navigation Bar ── */
.lb-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--accent);margin-bottom:40px}
.lb-nav-brand{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent);cursor:pointer;text-decoration:none;transition:opacity .2s}
.lb-nav-brand:hover{opacity:.7}
.lb-nav-back{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:6px 14px;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.lb-nav-back:hover{border-color:var(--accent);color:var(--accent)}

/* ── Feed Header ── */
.lb-feed-header{margin-bottom:48px}
.lb-feed-title{font-family:'Inter',sans-serif;font-size:32px;font-weight:800;text-transform:uppercase;letter-spacing:-0.5px;color:var(--text);line-height:1.1;margin-bottom:8px}
.lb-feed-sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sub);letter-spacing:.5px}
.lb-feed-line{width:60px;height:2px;background:var(--accent);margin-top:16px}

/* ── Article Grid ── */
.lb-grid{display:grid;grid-template-columns:1fr;gap:0}
.lb-card{padding:32px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:background .2s;position:relative}
.lb-card:first-child{border-top:1px solid var(--border)}
.lb-card:hover{background:rgba(0,225,255,.02)}
.lb-card-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:12px}
.lb-card-date::after{content:'';flex:1;height:1px;background:var(--border)}
.lb-card-title{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:8px;letter-spacing:-0.3px}
.lb-card-excerpt{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:var(--sub);margin-bottom:12px}
.lb-card-meta{display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub)}
.lb-card-tag{padding:2px 8px;border:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px}
.lb-card-views{opacity:.6}

/* ── Article Reader ── */
.lb-article{max-width:800px;margin:0 auto}
.lb-article-header{margin-bottom:48px;padding-bottom:32px;border-bottom:1px solid var(--border)}
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
.lb-content blockquote{margin:32px 0;padding:20px 24px;border-left:3px solid var(--accent);background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,225,255,.015) 2px,rgba(0,225,255,.015) 4px);font-style:italic;color:var(--sub);position:relative}
.lb-content blockquote p:last-child{margin-bottom:0}
.lb-content code{background:rgba(0,225,255,.08);padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent)}
.lb-content pre{background:rgba(0,0,0,.4);border:1px solid var(--border);padding:20px 24px;margin:32px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;color:#a5f3fc;position:relative}
.lb-content pre code{background:none;padding:0;color:inherit;font-size:inherit}
.lb-content img{max-width:100%;height:auto;margin:32px 0;border:1px solid var(--border)}
.lb-content hr{border:none;height:1px;background:var(--border);margin:48px 0}
.lb-content table{width:100%;border-collapse:collapse;margin:24px 0;font-size:15px}
.lb-content th,.lb-content td{padding:10px 14px;border:1px solid var(--border);text-align:left}
.lb-content th{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.5px;background:rgba(0,225,255,.03);font-weight:700}

/* ── Article Footer ── */
.lb-article-footer{margin-top:64px;padding-top:32px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.lb-share-btn{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--sub);cursor:pointer;background:none;border:1px solid var(--border);padding:8px 16px;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.lb-share-btn:hover{border-color:var(--accent);color:var(--accent)}

/* ── Skeleton Loading ── */
.lb-skeleton{padding:32px 0;border-bottom:1px solid var(--border)}
.lb-skel-line{height:12px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:lbSkelShim 1.5s infinite;margin-bottom:10px}
.lb-skel-line.w40{width:40%}
.lb-skel-line.w80{width:80%}
.lb-skel-line.w60{width:60%}
.lb-skel-line.h24{height:24px}
@keyframes lbSkelShim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Empty State ── */
.lb-empty{text-align:center;padding:80px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--sub)}
.lb-empty-icon{font-size:48px;margin-bottom:16px;opacity:.3}

/* ── 404 State ── */
.lb-404{text-align:center;padding:80px 20px}
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
.light-mode #blogView{background:var(--bg)}
.light-mode .lb-content pre{background:rgba(0,0,0,.04);color:#1e293b}
.light-mode .lb-content code{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .lb-content blockquote{background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,102,255,.02) 2px,rgba(0,102,255,.02) 4px)}
.light-mode .lb-card:hover{background:rgba(0,102,255,.02)}
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
  .lb-wrap{padding:24px 0 60px}
  .lb-feed-title{font-size:24px}
  .lb-article-h1{font-size:24px}
  .lb-content{font-size:16px}
  .lb-article-footer{flex-direction:column;align-items:flex-start}
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
  .lb-feed-title{font-size:20px}
  .lb-article-h1{font-size:22px}
  .lb-content{font-size:15px}
}

/* ── Print ── */
@media print{
  #blogView{display:block!important;padding:0}
  .lb-nav,.lb-article-footer,.lb-nav-back{display:none!important}
  .lb-content{font-size:12pt;line-height:1.6;color:#000}
  .lb-article-h1{font-size:22pt;color:#000}
}
`;
    document.head.appendChild(css);

    /* ═══════════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════════ */
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const snd = t => { if (window._sonification && window._sonification[t]) window._sonification[t](); else if (window._haptic && window._haptic[t]) window._haptic[t](); };

    /* ── Textarea formatting helpers ── */
    function insertAtCursor(text) {
        const ta = document.getElementById('lbCmsContent');
        if (!ta) return;
        const start = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }

    function wrapSelection(before, after, placeholder) {
        const ta = document.getElementById('lbCmsContent');
        if (!ta) return;
        const start = ta.selectionStart, end = ta.selectionEnd;
        const selected = ta.value.slice(start, end);
        const text = selected || placeholder || '';
        const replacement = before + text + (after || '');
        ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(end);
        if (selected) {
            ta.selectionStart = start + before.length;
            ta.selectionEnd = start + before.length + text.length;
        } else {
            ta.selectionStart = start + before.length;
            ta.selectionEnd = start + before.length + text.length;
        }
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }

    function insertLineFormat(prefix, placeholder) {
        const ta = document.getElementById('lbCmsContent');
        if (!ta) return;
        const start = ta.selectionStart;
        // Find the beginning of the current line
        const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
        const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        if (selected && selected.includes('\n')) {
            // Multi-line: prefix each line
            const lines = selected.split('\n').map(l => prefix + l);
            const replacement = lines.join('\n');
            ta.value = ta.value.slice(0, ta.selectionStart) + replacement + ta.value.slice(ta.selectionEnd);
            ta.selectionStart = ta.selectionStart;
            ta.selectionEnd = ta.selectionStart + replacement.length;
        } else {
            // Ensure we're on a new line
            const needsNewline = start > 0 && ta.value[start - 1] !== '\n' ? '\n' : '';
            const text = needsNewline + prefix + (selected || placeholder);
            ta.value = ta.value.slice(0, start) + text + ta.value.slice(ta.selectionEnd);
            ta.selectionStart = start + needsNewline.length + prefix.length;
            ta.selectionEnd = ta.selectionStart + (selected || placeholder).length;
        }
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }

    function insertBlock(block) {
        const ta = document.getElementById('lbCmsContent');
        if (!ta) return;
        const start = ta.selectionStart;
        // Ensure blank line before and after
        const before = start > 0 && ta.value[start - 1] !== '\n' ? '\n\n' : (start > 1 && ta.value[start - 2] !== '\n' ? '\n' : '');
        const text = before + block + '\n\n';
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(ta.selectionEnd);
        // Place cursor inside the block (after first line)
        const cursorPos = start + before.length + block.indexOf('\n') + 1;
        ta.selectionStart = ta.selectionEnd = cursorPos > 0 ? cursorPos : start + text.length;
        ta.focus();
        ta.dispatchEvent(new Event('input'));
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
                const ta = document.getElementById('lbCmsContent');
                const selected = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
                if (selected.startsWith('http')) {
                    wrapSelection('[link text](', ')', selected);
                } else {
                    wrapSelection('[', '](https://)', selected || 'link text');
                }
            },
            image: () => insertAtCursor('![alt text](https://image-url)'),
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
            /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|DANGER|IMPORTANT|CAUTION)\]\s*<br\s*\/?>\s*/gi,
            (_, type) => {
                const t = type.toUpperCase();
                const icons = { NOTE: '\u2139\ufe0f', TIP: '\ud83d\udca1', WARNING: '\u26a0\ufe0f', DANGER: '\ud83d\uded1', IMPORTANT: '\u2757', CAUTION: '\ud83d\udea8' };
                const cls = { NOTE: 'note', TIP: 'tip', WARNING: 'warning', DANGER: 'danger', IMPORTANT: 'warning', CAUTION: 'danger' };
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
            // Configure marked for safety and line breaks
            window.marked.setOptions({ breaks: true, gfm: true });
            return postProcessHtml(window.marked.parse(md || ''));
        }
        // Fallback: basic rendering (input already escaped)
        let s = esc(md || '');
        s = s.replace(/```([\s\S]*?)```/g, (_, code) => '<pre><code>' + code.trim() + '</code></pre>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/`(.+?)`/g, '<code>$1</code>');
        s = s.replace(/\n/g, '<br>');
        return s;
    }

    // Debounce helper for live preview
    function debounce(fn, ms) {
        let t;
        return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    }

    /* ═══════════════════════════════════════════════════
       DOM REFERENCES
       ═══════════════════════════════════════════════════ */
    const app = document.getElementById('app');
    const blogView = document.getElementById('blogView');
    const adminDialog = document.getElementById('blogAdmin');

    if (!blogView) return; // Guard: element must exist

    // Immediately hide portfolio if URL indicates blog route — prevents intro flash
    (function earlyRouteCheck() {
        var p = new URLSearchParams(window.location.search);
        if (p.has('blog') || p.has('post')) {
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
    const originalTitle = document.title; // Preserve for portfolio restoration

    /* ═══════════════════════════════════════════════════
       ROUTER
       ═══════════════════════════════════════════════════ */
    function getRoute() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('blog')) {
            const val = params.get('blog');
            if (val && val !== 'feed') return { view: 'article', slug: val };
            return { view: 'feed' };
        }
        if (params.has('post')) return { view: 'article', slug: params.get('post') };
        return { view: 'portfolio' };
    }

    function navigateTo(params) {
        const url = new URL(window.location.origin + window.location.pathname);
        // Only carry over blog-related params (drop other SPA params like ?s=)
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        window.history.pushState({}, '', url);
        handleRoute();
    }

    function goToPortfolio() {
        const url = new URL(window.location.origin + window.location.pathname);
        window.history.pushState({}, '', url);
        handleRoute();
    }

    function handleRoute() {
        _routeGen++; // Invalidate any in-flight fetches from previous route
        const route = getRoute();

        if (route.view === 'feed') {
            showBlogView();
            renderFeed();
        } else if (route.view === 'article') {
            showBlogView();
            renderArticle(route.slug);
        } else {
            showPortfolio();
        }
    }

    function showBlogView() {
        if (app) app.style.display = 'none';
        blogView.classList.add('active');
        blogView.style.display = 'block';
        // Hide portfolio-only elements
        document.querySelectorAll('.smart-cta, .weather-widget, .top-btns').forEach(el => {
            if (el) el.dataset.blogHidden = el.style.display || '';
            if (el) el.style.display = 'none';
        });
        window.scrollTo(0, 0);
    }

    function showPortfolio() {
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
            app.style.display = '';
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

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleRoute);

    // ESC / Backspace navigate back when blog view is active
    // Capture phase so it fires before the unified ESC handler in site.js
    document.addEventListener('keydown', function(e) {
        if (!blogView.classList.contains('active')) return;
        if (e.key !== 'Escape' && e.key !== 'Backspace') return;
        var tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
        return Array.from({ length: 4 }, () =>
            `<div class="lb-skeleton">
        <div class="lb-skel-line w40"></div>
        <div class="lb-skel-line w80 h24"></div>
        <div class="lb-skel-line w60"></div>
        <div class="lb-skel-line w40"></div>
      </div>`
        ).join('');
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
        blogView.innerHTML = `
      <div class="lb-wrap">
        <nav class="lb-nav" role="navigation" aria-label="Blog navigation">
          <a class="lb-nav-brand" id="lbBrandHome" tabindex="0" role="link">AMR ELHARONY</a>
          <a class="lb-nav-back" id="lbBackPortfolio" tabindex="0" role="link"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Portfolio</a>
        </nav>
        <header class="lb-feed-header">
          <h1 class="lb-feed-title">THE BILINGUAL<br>EXECUTIVE BLOG</h1>
          <p class="lb-feed-sub">DEEP DIVES ON AGILE, FINTECH, AND DIGITAL TRANSFORMATION</p>
          <div class="lb-feed-line" aria-hidden="true"></div>
        </header>
        <main class="lb-grid" id="lbGrid" role="feed" aria-label="Article list">${feedSkeleton()}</main>
      </div>`;

        // Bind nav
        document.getElementById('lbBrandHome').addEventListener('click', e => { e.preventDefault(); goToPortfolio(); });
        document.getElementById('lbBrandHome').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goToPortfolio(); } });
        document.getElementById('lbBackPortfolio').addEventListener('click', e => { e.preventDefault(); goToPortfolio(); });
        document.getElementById('lbBackPortfolio').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goToPortfolio(); } });

        // Update page title, meta, and SEO tags
        document.title = 'Blog — Amr Elharony';
        updateMeta('The Bilingual Executive Blog — Deep dives on Agile, FinTech, and Digital Transformation by Amr Elharony.');
        updateCanonical('?blog=feed');

        // Focus management for SPA route change (a11y)
        blogView.setAttribute('tabindex', '-1');
        blogView.focus({ preventScroll: true });

        // Fetch articles
        await fetchArticles();
    }

    async function fetchArticles() {
        const gen = _routeGen; // Capture current generation for stale check
        const grid = document.getElementById('lbGrid');
        if (!grid) return;

        if (!window._sb) {
            grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">📡</div>Unable to connect. Please try again later.</div>';
            return;
        }

        try {
            const { data, error } = await window._sb
                .from('longform_articles')
                .select('id,title,slug,excerpt,created_at,tags,views,published')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            // Stale check: user navigated away during fetch
            if (gen !== _routeGen) return;

            if (error) throw error;
            articles = data || [];

            if (!articles.length) {
                grid.innerHTML = '<div class="lb-empty" role="status"><div class="lb-empty-icon">✍️</div>No articles published yet.<br>Check back soon.</div>';
                return;
            }

            grid.innerHTML = articles.map((a, i) => `
        <article class="lb-card" data-slug="${esc(a.slug)}" tabindex="0" role="article" aria-label="${esc(a.title)}">
          <div class="lb-card-date"><time datetime="${new Date(a.created_at).toISOString()}">${fmtDate(a.created_at)}</time></div>
          <div class="lb-card-title">${esc(a.title)}</div>
          <div class="lb-card-excerpt">${esc((a.excerpt || '').slice(0, MAX_EXCERPT))}${(a.excerpt || '').length > MAX_EXCERPT ? '…' : ''}</div>
          <div class="lb-card-meta">
            ${(a.tags || []).map(t => `<span class="lb-card-tag">${esc(t)}</span>`).join('')}
            ${a.views ? `<span class="lb-card-views" aria-label="${a.views} views">👁 ${a.views}</span>` : ''}
          </div>
        </article>`
            ).join('');

            // Bind clicks AND keyboard navigation
            grid.querySelectorAll('.lb-card').forEach(card => {
                card.addEventListener('click', () => {
                    navigateTo({ post: card.dataset.slug });
                    snd('tap');
                });
                card.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateTo({ post: card.dataset.slug });
                        snd('tap');
                    }
                });
            });

        } catch (e) {
            if (gen !== _routeGen) return; // Don't render error for stale route
            grid.innerHTML = '<div class="lb-empty" role="alert"><div class="lb-empty-icon">⚠️</div>Failed to load articles.</div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       ARTICLE READER VIEW
       ═══════════════════════════════════════════════════ */
    async function renderArticle(slug) {
        const gen = _routeGen; // Capture for stale check
        blogView.innerHTML = `
      <div class="lb-wrap">
        <nav class="lb-nav" role="navigation" aria-label="Article navigation">
          <a class="lb-nav-brand" id="lbBrandHome2" tabindex="0" role="link">AMR ELHARONY</a>
          <a class="lb-nav-back" id="lbBackFeed" tabindex="0" role="link"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> All Articles</a>
        </nav>
        <div id="lbArticle" aria-live="polite">${articleSkeleton()}</div>
      </div>`;

        document.getElementById('lbBrandHome2').addEventListener('click', e => { e.preventDefault(); goToPortfolio(); });
        document.getElementById('lbBackFeed').addEventListener('click', e => { e.preventDefault(); navigateTo({ blog: 'feed' }); });

        // Focus management (a11y)
        blogView.setAttribute('tabindex', '-1');
        blogView.focus({ preventScroll: true });

        if (!window._sb) {
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">503</div><div class="lb-404-msg">Unable to connect.</div></div>';
            return;
        }

        try {
            const { data, error } = await window._sb
                .from('longform_articles')
                .select('*')
                .eq('slug', slug)
                .eq('published', true)
                .single();

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

            // Increment views (fire and forget, deduplicated per session)
            if (!_viewedSlugs.has(slug)) {
                _viewedSlugs.add(slug);
                window._sb.rpc('increment_article_views', { article_slug: slug }).catch(() => { });
            }

            const contentHtml = parseMarkdown(data.content);

            document.getElementById('lbArticle').innerHTML = `
        <article class="lb-article" itemscope itemtype="https://schema.org/BlogPosting">
          <header class="lb-article-header">
            <div class="lb-article-date"><time datetime="${new Date(data.created_at).toISOString()}" itemprop="datePublished">${fmtDate(data.created_at)}</time></div>
            <h1 class="lb-article-h1" itemprop="headline">${esc(data.title)}</h1>
            ${data.excerpt ? `<p class="lb-article-excerpt" itemprop="description">${esc(data.excerpt)}</p>` : ''}
            <div class="lb-article-meta">
              <span itemprop="author" itemscope itemtype="https://schema.org/Person"><meta itemprop="name" content="Amr Elharony">${readingTime(data.content)}</span>
              <span aria-label="${data.views || 0} views">👁 ${data.views || 0} views</span>
              ${(data.tags || []).length ? `<div class="lb-article-tags">${(data.tags || []).map(t => `<span class="lb-card-tag" itemprop="keywords">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </header>
          ${data.cover_image ? `<img src="${esc(data.cover_image)}" alt="${esc(data.title)}" style="width:100%;border:1px solid var(--border);margin-bottom:40px" itemprop="image">` : ''}
          <div class="lb-content" itemprop="articleBody">${contentHtml}</div>
          <footer class="lb-article-footer">
            <button class="lb-share-btn" id="lbShareArticle"><i class="fa-solid fa-share-from-square" aria-hidden="true"></i> Share Article</button>
            <button class="lb-nav-back" id="lbBackFeed2"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> All Articles</button>
          </footer>
        </article>`;

            // Bind events
            document.getElementById('lbShareArticle').addEventListener('click', () => shareArticle(data));
            document.getElementById('lbBackFeed2').addEventListener('click', e => { e.preventDefault(); navigateTo({ blog: 'feed' }); });

            // Syntax highlight code blocks
            highlightCode();

        } catch (e) {
            if (gen !== _routeGen) return;
            // #region agent log
            console.warn('[DBG-2bc5ee] renderArticle error:', e.message, e.stack);
            // #endregion
            document.getElementById('lbArticle').innerHTML = '<div class="lb-404" role="alert"><div class="lb-404-code">500</div><div class="lb-404-msg">Something went wrong.</div></div>';
        }
    }

    function shareArticle(article) {
        const url = window.location.href;
        const text = `${article.title} — by Amr Elharony\n${article.excerpt || ''}\n${url}`;

        if (navigator.share) {
            navigator.share({ title: article.title, text: article.excerpt || '', url }).catch(() => { });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                if (window.UniToast) window.UniToast('Link copied!', '', '📋', 'success');
            }).catch(() => { });
        }
        snd('success');
    }

    function highlightCode() {
        // If Prism.js is loaded, use it
        if (window.Prism) {
            window.Prism.highlightAllUnder(document.getElementById('lbArticle'));
        }
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
            var contentEl = document.getElementById('lbCmsContent');
            if (!editingArticle && titleEl && contentEl && (titleEl.value.trim() || contentEl.value.trim())) {
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
                        content: contentEl.value
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
            <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
              <div class="lb-drafts-header" style="margin-bottom:6px">
                <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);letter-spacing:1px">☁️ CLOUD DRAFTS</span>
                <span class="lb-drafts-count" id="lbTCloudDraftsCount"></span>
              </div>
              <div class="lb-drafts-list" id="lbTCloudDraftsList"></div>
            </div>
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
            <div class="lb-cms-row full">
              <div>
                <label class="lb-cms-label">Cover Image URL</label>
                <input class="lb-cms-input" id="lbCmsCover" placeholder="https://...">
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
                </div>
              </div>
              <div class="lb-cms-split">
                <textarea class="lb-cms-textarea" id="lbCmsContent" placeholder="Write your article in Markdown..."></textarea>
                <div class="lb-cms-preview" id="lbCmsPreview"><div class="lb-content" id="lbCmsPreviewContent" style="font-size:14px"><span style="color:var(--sub);font-family:'JetBrains Mono',monospace;font-size:10px">Live preview will appear here...</span></div></div>
              </div>
            </div>
            <div class="lb-cms-actions">
              <div class="lb-cms-btn-group">
                <button class="lb-cms-btn primary" id="lbCmsPublish">PUBLISH</button>
                <button class="lb-cms-btn secondary" id="lbCmsDraft">SAVE DRAFT</button>
                <button class="lb-cms-btn secondary" id="lbCmsScheduleToggle">SCHEDULE</button>
                <label class="lb-li-toggle"><input type="checkbox" id="lbCmsLinkedIn" checked><span class="lb-li-label"><i class="fa-brands fa-linkedin"></i> Post to LinkedIn</span></label>
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
          </div>

          <div class="lb-sub-content active" data-subtab-content="drafts">
            <div class="lb-drafts-header">
              <input class="lb-drafts-search" id="lbDraftsSearch" placeholder="Search drafts..." type="text">
              <span class="lb-drafts-count" id="lbDraftsCount"></span>
              <button class="lb-cms-btn primary" id="lbDraftsNew" style="padding:6px 14px;font-size:9px">+ NEW DRAFT</button>
            </div>
            <div class="lb-drafts-list" id="lbDraftsList"></div>
            <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
              <div class="lb-drafts-header" style="margin-bottom:6px">
                <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);letter-spacing:1px">☁️ CLOUD DRAFTS</span>
                <span class="lb-drafts-count" id="lbCloudDraftsCount"></span>
              </div>
              <div class="lb-drafts-list" id="lbCloudDraftsList"></div>
            </div>
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
                    if (key === 'drafts') { renderDraftsList(); _renderFilteredTab('draft'); }
                    else if (key === 'scheduled') _renderFilteredTab('scheduled');
                    else if (key === 'published') _renderFilteredTab('published');
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

        async function renderTCloudDrafts() {
            var listEl = document.getElementById('lbTCloudDraftsList');
            var countEl = document.getElementById('lbTCloudDraftsCount');
            if (!listEl) return;
            if (window._fetchMicroblogCloudDrafts) {
                _tCloudDrafts = await window._fetchMicroblogCloudDrafts();
            }
            if (countEl) countEl.textContent = _tCloudDrafts.length + ' draft' + (_tCloudDrafts.length !== 1 ? 's' : '');
            updateTDraftsBadge();
            if (!_tCloudDrafts.length) {
                listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:8px 0">No cloud drafts. Click SAVE DRAFT to save to the cloud.</div>';
                return;
            }
            listEl.innerHTML = _tCloudDrafts.map(function(d) {
                var preview = (d.content || '').substring(0, 80) + ((d.content || '').length > 80 ? '...' : '');
                var date = new Date(d.created_at).toLocaleDateString();
                return '<div class="lb-cms-article-row">' +
                    '<span class="lb-cms-article-title" style="cursor:pointer" data-tcloud-edit="' + d.id + '">' + esc(preview || 'Empty draft') + '</span>' +
                    '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-left:4px">☁️ ' + date + '</span>' +
                    '<div class="lb-cms-article-actions">' +
                        '<button class="lb-cms-btn primary" style="padding:4px 8px;font-size:8px" data-tcloud-publish="' + d.id + '">PUBLISH</button>' +
                        '<button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px" data-tcloud-edit="' + d.id + '">EDIT</button>' +
                        '<button class="lb-cms-btn danger" style="padding:4px 8px;font-size:8px" data-tcloud-del="' + d.id + '">DEL</button>' +
                    '</div></div>';
            }).join('');
            _bindTCloudActions(listEl);
        }

        function _bindTCloudActions(container) {
            container.querySelectorAll('[data-tcloud-edit]').forEach(function(el) {
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
            container.querySelectorAll('[data-tcloud-publish]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Publish this thought now?')) return;
                    if (window._publishMicroblogDraft) {
                        var result = await window._publishMicroblogDraft(el.dataset.tcloudPublish);
                        if (result.success) {
                            snd('success');
                            if (window.UniToast) window.UniToast('Thought published!', '', '🚀', 'success');
                            if (window._refreshMicroblogFeed) window._refreshMicroblogFeed();
                            await renderTCloudDrafts();
                        } else {
                            if (window.UniToast) window.UniToast('Failed to publish.', '', '⚠️', 'warn');
                        }
                    }
                });
            });
            container.querySelectorAll('[data-tcloud-del]').forEach(function(el) {
                el.addEventListener('click', async function() {
                    if (!confirm('Delete this cloud draft permanently?')) return;
                    if (window._deleteMicroblogPost) {
                        var result = await window._deleteMicroblogPost(el.dataset.tcloudDel);
                        if (result.success) {
                            snd('success');
                            if (window.UniToast) window.UniToast('Cloud draft deleted.', '', '🗑️', 'success');
                            await renderTCloudDrafts();
                        } else {
                            if (window.UniToast) window.UniToast('Failed to delete.', '', '⚠️', 'warn');
                        }
                    }
                });
            });
        }

        function renderTDraftsList(filter) {
            var listEl = document.getElementById('lbTDraftsList');
            var countEl = document.getElementById('lbTDraftsCount');
            if (!listEl) return;
            var drafts = getAllThoughtDrafts();
            if (filter) {
                var q = filter.toLowerCase();
                drafts = drafts.filter(function(d) { return (d.content || '').toLowerCase().includes(q); });
            }
            if (countEl) countEl.textContent = drafts.length + ' draft' + (drafts.length !== 1 ? 's' : '');
            if (!drafts.length) {
                listEl.innerHTML = '<div class="lb-drafts-empty">' + (filter ? 'No drafts match "' + esc(filter) + '"' : 'No thought drafts yet.<br>Start writing and drafts are auto-saved.') + '</div>';
                return;
            }
            listEl.innerHTML = drafts.map(function(d) {
                var preview = esc((d.content || '').slice(0, 80)) + ((d.content || '').length > 80 ? '...' : '');
                var isActive = d.id === _tActiveDraftId;
                return '<div class="lb-draft-row' + (isActive ? ' active' : '') + '" data-tdraft-id="' + d.id + '">' +
                    '<div class="lb-draft-info">' +
                        '<div class="lb-draft-title">' + preview + '</div>' +
                        '<div class="lb-draft-meta"><span>' + _timeSince(d.updatedAt || d.createdAt) + '</span><span>' + (d.content || '').length + ' chars</span></div>' +
                    '</div>' +
                    '<div class="lb-draft-actions">' +
                        '<button class="lb-draft-btn" data-tdraft-load="' + d.id + '">OPEN</button>' +
                        '<button class="lb-draft-btn del" data-tdraft-del="' + d.id + '">DEL</button>' +
                    '</div></div>';
            }).join('');
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
            listEl.querySelectorAll('.lb-draft-row').forEach(function(row) {
                row.addEventListener('click', function() {
                    var draft = getAllThoughtDrafts().find(function(d) { return d.id === row.dataset.tdraftId; });
                    if (draft) loadThoughtDraft(draft);
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
                    renderTCloudDrafts();
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
                    renderTCloudDrafts();
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
            if (key === 'tdrafts') { renderTDraftsList(); renderTCloudDrafts(); }
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

        updateTDraftsBadge();
        renderTCloudDrafts();
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
            var dt = document.getElementById('lbCmsScheduleAt').value;
            if (!dt) { document.getElementById('lbCmsStatus').textContent = 'Pick a date/time first.'; return; }
            saveArticle(false, new Date(dt).toISOString());
        });

        // Auto-slug from title
        document.getElementById('lbCmsTitle').addEventListener('input', function() {
            var slugEl = document.getElementById('lbCmsSlug');
            if (!editingArticle) {
                slugEl.value = slugify(document.getElementById('lbCmsTitle').value);
            }
        });

        // Live preview
        var _updatePreview = debounce(function() {
            var previewEl = document.getElementById('lbCmsPreviewContent');
            var contentEl = document.getElementById('lbCmsContent');
            if (!previewEl || !contentEl) return;
            previewEl.innerHTML = parseMarkdown(contentEl.value) || '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
        }, 300);
        document.getElementById('lbCmsContent').addEventListener('input', _updatePreview);

        // ── Multi-draft localStorage engine ──
        var DRAFTS_KEY = '_lb_drafts';
        var _autoSaveTimer = null;
        var _cloudAutoSaveTimer = null;
        var _activeDraftId = window._lbActiveDraftId || null;
        function _setActiveDraft(id) { _activeDraftId = id; window._lbActiveDraftId = id; }

        function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
        function getAllDrafts() { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || []; } catch(e) { return []; } }
        function saveDraftsArray(arr) { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr)); } catch(e) {} }

        function _collectFormData() {
            return {
                title: document.getElementById('lbCmsTitle').value,
                slug: document.getElementById('lbCmsSlug').value,
                excerpt: document.getElementById('lbCmsExcerpt').value,
                tags: document.getElementById('lbCmsTags').value,
                cover: document.getElementById('lbCmsCover').value,
                content: document.getElementById('lbCmsContent').value
            };
        }

        function saveCurrentDraft(silent) {
            var f = _collectFormData();
            if (!f.title && !f.content) return;
            var drafts = getAllDrafts();
            var now = Date.now();
            if (_activeDraftId) {
                var idx = drafts.findIndex(function(d) { return d.id === _activeDraftId; });
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
                var st = document.getElementById('lbCmsStatus');
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
            document.getElementById('lbCmsContent').value = draft.content || '';
            editingArticle = null;
            _updatePreview();
            // Switch to article tab
            adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            var artTab = adminDialog.querySelector('[data-admintab="article"]');
            var artContent = adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');
            document.getElementById('lbCmsStatus').textContent = 'Loaded draft: "' + (draft.title || 'Untitled') + '"';
            adminDialog.scrollTop = 0;
            snd('tap');
        }

        function deleteDraft(draftId) {
            var drafts = getAllDrafts().filter(function(d) { return d.id !== draftId; });
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
            document.getElementById('lbCmsContent').value = '';
            document.getElementById('lbCmsPreviewContent').innerHTML = '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            document.getElementById('lbCmsScheduleRow').style.display = 'none';
            document.getElementById('lbCmsScheduleAt').value = '';
            document.getElementById('lbCmsStatus').textContent = 'New draft started';
        }

        function updateDraftsBadge() {
            var badge = document.getElementById('lbDraftsBadge');
            if (!badge) return;
            var localCount = getAllDrafts().length;
            var cloudCount = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === 'draft'; }).length;
            var total = localCount + cloudCount;
            badge.textContent = total ? '(' + total + ')' : '';
        }

        function _timeSince(ts) {
            var s = Math.floor((Date.now() - ts) / 1000);
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
            var listEl = document.getElementById('lbDraftsList');
            var countEl = document.getElementById('lbDraftsCount');
            if (!listEl) return;

            var drafts = getAllDrafts();
            if (filter) {
                var q = filter.toLowerCase();
                drafts = drafts.filter(function(d) {
                    return (d.title || '').toLowerCase().includes(q) ||
                           (d.tags || '').toLowerCase().includes(q) ||
                           (d.excerpt || '').toLowerCase().includes(q) ||
                           (d.content || '').toLowerCase().includes(q);
                });
            }
            if (countEl) countEl.textContent = drafts.length + ' draft' + (drafts.length !== 1 ? 's' : '');

            if (!drafts.length) {
                listEl.innerHTML = '<div class="lb-drafts-empty">' + (filter ? 'No drafts match "' + esc(filter) + '"' : 'No local drafts yet.<br>Start writing and drafts are auto-saved.') + '</div>';
                return;
            }

            listEl.innerHTML = drafts.map(function(d) {
                var words = _wordCount(d.content);
                var isActive = d.id === _activeDraftId;
                return '<div class="lb-draft-row' + (isActive ? ' active' : '') + '" data-draft-id="' + d.id + '">' +
                    '<div class="lb-draft-info">' +
                        '<div class="lb-draft-title">' + esc(d.title || 'Untitled Draft') + '</div>' +
                        '<div class="lb-draft-meta">' +
                            '<span>' + _timeSince(d.updatedAt || d.createdAt) + '</span>' +
                            '<span>' + words + ' word' + (words !== 1 ? 's' : '') + '</span>' +
                            (d.tags ? '<span>' + esc(d.tags) + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="lb-draft-actions">' +
                        '<button class="lb-draft-btn" data-draft-load="' + d.id + '">OPEN</button>' +
                        '<button class="lb-draft-btn del" data-draft-del="' + d.id + '">DEL</button>' +
                    '</div>' +
                '</div>';
            }).join('');

            listEl.querySelectorAll('[data-draft-load]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var draft = getAllDrafts().find(function(d) { return d.id === btn.dataset.draftLoad; });
                    if (draft) loadDraftIntoEditor(draft);
                });
            });
            listEl.querySelectorAll('[data-draft-del]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var draft = getAllDrafts().find(function(d) { return d.id === btn.dataset.draftDel; });
                    var name = draft ? (draft.title || 'Untitled Draft') : 'this draft';
                    if (confirm('Delete "' + name + '"? This cannot be undone.')) {
                        deleteDraft(btn.dataset.draftDel);
                        snd('delete');
                    }
                });
            });
            listEl.querySelectorAll('.lb-draft-row').forEach(function(row) {
                row.addEventListener('click', function() {
                    var draft = getAllDrafts().find(function(d) { return d.id === row.dataset.draftId; });
                    if (draft) loadDraftIntoEditor(draft);
                });
            });
        }

        function scheduleAutoSave() {
            clearTimeout(_autoSaveTimer);
            _autoSaveTimer = setTimeout(function() { saveCurrentDraft(false); }, 10000);
            clearTimeout(_cloudAutoSaveTimer);
            _cloudAutoSaveTimer = setTimeout(function() { saveArticle(false, null); }, 30000);
        }
        ['lbCmsTitle','lbCmsSlug','lbCmsExcerpt','lbCmsTags','lbCmsCover','lbCmsContent'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', scheduleAutoSave);
        });

        // Drafts tab: search + new
        document.getElementById('lbDraftsSearch').addEventListener('input', debounce(function(e) {
            var q = e.target.value.trim();
            renderDraftsList(q);
            _renderFilteredTab('draft', q);
        }, 200));
        document.getElementById('lbDraftsNew').addEventListener('click', function() {
            saveCurrentDraft(true);
            clearEditorForNewDraft();
            // Switch to article tab
            adminDialog.querySelectorAll('.lb-cms-tab').forEach(function(t) { t.classList.remove('active'); });
            adminDialog.querySelectorAll('.lb-cms-tab-content').forEach(function(c) { c.classList.remove('active'); });
            var artTab = adminDialog.querySelector('[data-admintab="article"]');
            var artContent = adminDialog.querySelector('[data-admintab-content="article"]');
            if (artTab) artTab.classList.add('active');
            if (artContent) artContent.classList.add('active');
            snd('tap');
        });

        // Sub-tab switching inside Write Article
        document.getElementById('lbArticleSubTabs').addEventListener('click', function(e) {
            var btn = e.target.closest('.lb-sub-tab');
            if (!btn) return;
            var key = btn.dataset.subtab;
            document.querySelectorAll('#lbArticleSubTabs .lb-sub-tab').forEach(function(t) { t.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('lbTabArticle').querySelectorAll('.lb-sub-content').forEach(function(c) { c.classList.remove('active'); });
            var target = adminDialog.querySelector('[data-subtab-content="' + key + '"]');
            if (target) target.classList.add('active');
            if (key === 'drafts') { renderDraftsList(); _renderFilteredTab('draft'); }
            if (key === 'scheduled') _renderFilteredTab('scheduled');
            if (key === 'published') _renderFilteredTab('published');
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

        // Keyboard shortcuts on textarea
        document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
            if (!e.ctrlKey && !e.metaKey) return;
            if (e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrentDraft(true); saveArticle(false, null); return; }
            var shortcuts = { 'b': 'bold', 'i': 'italic', 'k': 'link', '`': 'code', '1': 'ul', '2': 'h2', '3': 'h3', '4': 'h4' };
            var fmt = shortcuts[e.key.toLowerCase()];
            if (fmt) { e.preventDefault(); insertFormat(fmt); }
        });

        // Tab key handling in textarea
        document.getElementById('lbCmsContent').addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                insertAtCursor('  ');
            }
        });

        // Fetch existing articles
        await fetchAdminArticles();
    }

    var _allAdminArticles = [];

    async function fetchAdminArticles() {
        if (!window._sb) return;

        try {
            var r = await window._sb
                .from('longform_articles')
                .select('id,title,slug,published,created_at,views,scheduled_at')
                .order('created_at', { ascending: false });

            if (r.error) throw r.error;
            _allAdminArticles = r.data || [];

            _renderFilteredTab('draft');
            _renderFilteredTab('scheduled');
            _renderFilteredTab('published');
            _updateDraftsBadgeWithCloud();
        } catch (e) {}
    }

    function _updateDraftsBadgeWithCloud() {
        var badge = document.getElementById('lbDraftsBadge');
        if (!badge) return;
        var localCount = 0;
        try { localCount = (JSON.parse(localStorage.getItem('_lb_drafts')) || []).length; } catch(e) {}
        var cloudCount = _allAdminArticles.filter(function(a) { return _classifyArticle(a) === 'draft'; }).length;
        var total = localCount + cloudCount;
        badge.textContent = total ? '(' + total + ')' : '';
    }

    function _classifyArticle(a) {
        if (a.scheduled_at && !a.published && new Date(a.scheduled_at) > new Date()) return 'scheduled';
        if (a.published) return 'published';
        return 'draft';
    }

    function _renderFilteredTab(tab, filter) {
        var cfg = { draft:     { listId: 'lbCloudDraftsList', countId: 'lbCloudDraftsCount', badgeId: null },
                    scheduled: { listId: 'lbSchedList', countId: 'lbSchedCount', badgeId: 'lbSchedBadge' },
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

    function _renderArticleList(listEl, data, mode) {
        if (!listEl) return;

        if (!data || !data.length) {
            var msgs = { draft: 'No cloud drafts. Click SAVE DRAFT to save to the cloud.', scheduled: 'No scheduled articles.', published: 'No published articles.' };
            listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:8px 0">' + (msgs[mode] || 'No articles.') + '</div>';
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
                '<span class="lb-cms-article-title" data-title-slug="' + esc(a.slug) + '">' + esc(a.title) + '</span>' +
                draftInfo + schedInfo + viewsInfo +
                '<div class="lb-cms-article-actions">' + actions + '</div></div>';
        }).join('');

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
            document.getElementById('lbCmsContent').value = data.content || '';

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
            adminDialog.scrollTop = 0;
            snd('tap');

        } catch (e) { }
    }

    async function saveArticle(publish, scheduledAt) {
        if (!window._sb) return;

        var title = document.getElementById('lbCmsTitle').value.trim();
        var slug = document.getElementById('lbCmsSlug').value.trim() || slugify(title);
        var excerpt = document.getElementById('lbCmsExcerpt').value.trim();
        var tags = document.getElementById('lbCmsTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        var cover = document.getElementById('lbCmsCover').value.trim();
        var content = document.getElementById('lbCmsContent').value;

        if (!title) {
            document.getElementById('lbCmsStatus').textContent = 'Title is required.';
            return;
        }
        if (!slug) {
            document.getElementById('lbCmsStatus').textContent = 'Slug is required.';
            return;
        }

        var pubBtn = document.getElementById('lbCmsPublish');
        var draftBtn = document.getElementById('lbCmsDraft');
        pubBtn.disabled = true;
        draftBtn.disabled = true;

        var statusMsg = scheduledAt ? 'Scheduling...' : (publish ? 'Publishing...' : 'Saving draft...');
        document.getElementById('lbCmsStatus').textContent = statusMsg;

        var liCheck = document.getElementById('lbCmsLinkedIn');
        var liShare = liCheck ? liCheck.checked : false;

        var row = {
            title: title,
            slug: slug,
            excerpt: excerpt,
            content: content,
            cover_image: cover,
            tags: tags,
            published: scheduledAt ? false : publish,
            scheduled_at: scheduledAt || null,
            linkedin_posted: (publish || scheduledAt) ? !liShare : true
        };

        try {
            var error;
            if (editingArticle) {
                var res = await window._sb.from('longform_articles').update(row).eq('id', editingArticle.id);
                error = res.error;
            } else {
                var res2 = await window._sb.from('longform_articles').insert(row);
                error = res2.error;
            }

            if (error) throw error;

            snd('success');
            if (window._lbActiveDraftId) {
                try {
                    var _dk = '_lb_drafts';
                    var _dd = JSON.parse(localStorage.getItem(_dk)) || [];
                    _dd = _dd.filter(function(d) { return d.id !== window._lbActiveDraftId; });
                    localStorage.setItem(_dk, JSON.stringify(_dd));
                    window._lbActiveDraftId = null;
                } catch(e) {}
            }
            try { localStorage.removeItem('_lb_article_draft'); } catch(e) {}
            var doneMsg = scheduledAt ? 'Scheduled!' : (publish ? 'Published!' : 'Draft saved!');
            document.getElementById('lbCmsStatus').textContent = doneMsg;

            if (window.UniToast) {
                window.UniToast(scheduledAt ? 'Article scheduled!' : (publish ? 'Article published!' : 'Draft saved.'), '', scheduledAt ? '🕐' : (publish ? '🚀' : '💾'), 'success');
            }

            if (!editingArticle) {
                document.getElementById('lbCmsTitle').value = '';
                document.getElementById('lbCmsSlug').value = '';
                document.getElementById('lbCmsExcerpt').value = '';
                document.getElementById('lbCmsTags').value = '';
                document.getElementById('lbCmsCover').value = '';
                document.getElementById('lbCmsContent').value = '';
                document.getElementById('lbCmsPreviewContent').innerHTML = '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            }
            document.getElementById('lbCmsScheduleRow').style.display = 'none';
            document.getElementById('lbCmsScheduleAt').value = '';

            editingArticle = null;
            await fetchAdminArticles();

            if (publish && !scheduledAt) {
                setTimeout(function() {
                    var statusEl = document.getElementById('lbCmsStatus');
                    if (!statusEl) return;
                    var safeSlug = esc(slug);
                    statusEl.innerHTML = 'Published! <a href="?post=' + safeSlug + '" style="color:var(--accent);text-decoration:underline;cursor:pointer" id="lbCmsViewLink">View article</a>';
                    var viewLink = document.getElementById('lbCmsViewLink');
                    if (viewLink) {
                        viewLink.addEventListener('click', function(ev) {
                            ev.preventDefault();
                            closeAdmin();
                            navigateTo({ post: slug });
                        });
                    }
                }, 100);
            }

        } catch (e) {
            var msg = (e.code === '23505' || (e.message || '').includes('duplicate'))
                ? 'Slug already exists. Choose a different slug.'
                : (e.message || 'Save failed.');
            document.getElementById('lbCmsStatus').textContent = msg;
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
                '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#6b7a90;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">' + fmtDate(a.created_at) + ' · ' + readTime(a.content || a.excerpt || '') + '</div>' +
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
                .select('id,title,slug,excerpt,content,created_at,tags,views')
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
