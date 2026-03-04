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
#blogAdmin{position:fixed;inset:0;width:100vw;height:100vh;max-width:100vw;max-height:100vh;margin:0;padding:0;border:none;background:rgba(6,8,15,.92);z-index:100010;overflow-y:auto}
#blogAdmin::backdrop{background:transparent}
.lb-admin-panel{max-width:960px;margin:40px auto;padding:32px;background:var(--bg);border:1px solid var(--accent)}
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

/* ── Light Mode ── */
.light-mode #blogView{background:var(--bg)}
.light-mode .lb-content pre{background:rgba(0,0,0,.04);color:#1e293b}
.light-mode .lb-content code{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .lb-content blockquote{background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,102,255,.02) 2px,rgba(0,102,255,.02) 4px)}
.light-mode .lb-card:hover{background:rgba(0,102,255,.02)}
.light-mode .lb-cms-textarea{background:rgba(0,0,0,.02)}
.light-mode .lb-cms-preview{background:rgba(0,0,0,.01)}
.light-mode #blogAdmin{background:rgba(244,246,251,.95)}

/* ── Responsive ── */
@media(max-width:768px){
  .lb-wrap{padding:24px 0 60px}
  .lb-feed-title{font-size:24px}
  .lb-article-h1{font-size:26px}
  .lb-content{font-size:16px}
  .lb-cms-split{grid-template-columns:1fr;min-height:300px}
  .lb-cms-textarea{border-right:none;border-bottom:1px solid var(--border);min-height:250px}
  .lb-cms-row{grid-template-columns:1fr}
  .lb-admin-panel{margin:16px;padding:20px}
  .lb-article-footer{flex-direction:column;align-items:flex-start}
}
@media(max-width:480px){
  .lb-feed-title{font-size:20px}
  .lb-article-h1{font-size:22px}
  .lb-content{font-size:15px}
  .lb-card-title{font-size:18px}
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
        if (params.has('blog')) return { view: 'feed' };
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
        if (app) app.style.display = '';
        blogView.classList.remove('active');
        blogView.style.display = 'none';
        // Restore portfolio elements
        document.querySelectorAll('[data-blog-hidden]').forEach(el => {
            el.style.display = el.dataset.blogHidden;
            delete el.dataset.blogHidden;
        });
        // Restore original page title
        document.title = originalTitle;
    }

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleRoute);

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
            adminDialog.close();
            snd('menuClose');
        }
    }

    function renderAuthForm() {
        adminDialog.innerHTML = `
      <div class="lb-admin-panel" style="max-width:480px;margin:120px auto">
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
        closeAdmin();
    }

    /* ═══════════════════════════════════════════════════
       CMS INTERFACE
       ═══════════════════════════════════════════════════ */
    async function renderCMS(passkeyOnly) {
        editingArticle = null;

        adminDialog.innerHTML = `
      <div class="lb-admin-panel">
        <div class="lb-admin-header">
          <span class="lb-admin-title">✍ CONTENT MANAGEMENT</span>
          <div class="lb-cms-btn-group">
            <button class="lb-cms-btn secondary" id="lbCmsSignout">Sign Out</button>
            <button class="lb-admin-close" id="lbCmsClose">ESC</button>
          </div>
        </div>
        ${passkeyOnly ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#f59e0b;border:1px solid rgba(245,158,11,.3);padding:8px 12px;margin-bottom:16px">⚠ Passkey-only mode. Sign in via Supabase Auth for full write access (Ctrl+Shift+P → Sign Out → Re-login).</div>' : ''}
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
                <button class="lb-tool-btn" data-fmt="quote" title="Blockquote">❝</button>
              </div>
              <div class="lb-toolbar-group">
                <button class="lb-tool-btn" data-fmt="ul" title="Bullet List (Ctrl+1)">• —</button>
                <button class="lb-tool-btn" data-fmt="ol" title="Numbered List">1. —</button>
                <button class="lb-tool-btn" data-fmt="checklist" title="Checklist">☑</button>
              </div>
              <div class="lb-toolbar-group">
                <button class="lb-tool-btn" data-fmt="codeblock" title="Code Block">⌨</button>
                <button class="lb-tool-btn" data-fmt="table" title="Table">▦</button>
                <button class="lb-tool-btn" data-fmt="hr" title="Divider">—</button>
              </div>
              <div class="lb-toolbar-group">
                <button class="lb-tool-btn" data-fmt="callout" title="Callout Note">📌</button>
                <button class="lb-tool-btn" data-fmt="details" title="Collapsible Section">▸</button>
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
            </div>
            <span class="lb-cms-status" id="lbCmsStatus"></span>
          </div>
        </div>

        <div class="lb-cms-articles" id="lbCmsArticles">
          <div class="lb-cms-articles-title">EXISTING ARTICLES</div>
          <div id="lbCmsArticleList">Loading...</div>
        </div>
      </div>`;

        // Bind events
        document.getElementById('lbCmsClose').addEventListener('click', closeAdmin);
        document.getElementById('lbCmsSignout').addEventListener('click', handleSignOut);
        document.getElementById('lbCmsPublish').addEventListener('click', () => saveArticle(true));
        document.getElementById('lbCmsDraft').addEventListener('click', () => saveArticle(false));

        // Auto-slug from title
        document.getElementById('lbCmsTitle').addEventListener('input', () => {
            const slugEl = document.getElementById('lbCmsSlug');
            if (!editingArticle) {
                slugEl.value = slugify(document.getElementById('lbCmsTitle').value);
            }
        });

        // Live preview (debounced to avoid perf issues on long content)
        const _updatePreview = debounce(() => {
            const previewEl = document.getElementById('lbCmsPreviewContent');
            const contentEl = document.getElementById('lbCmsContent');
            if (!previewEl || !contentEl) return;
            const content = contentEl.value;
            previewEl.innerHTML = parseMarkdown(content) || '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
        }, 300);
        document.getElementById('lbCmsContent').addEventListener('input', _updatePreview);

        // Toolbar button clicks
        document.getElementById('lbToolbar').addEventListener('click', e => {
            const btn = e.target.closest('[data-fmt]');
            if (!btn) return;
            e.preventDefault();
            insertFormat(btn.dataset.fmt);
        });

        // Keyboard shortcuts on textarea
        document.getElementById('lbCmsContent').addEventListener('keydown', e => {
            if (!e.ctrlKey && !e.metaKey) return;
            const shortcuts = { 'b': 'bold', 'i': 'italic', 'k': 'link', '`': 'code', '1': 'ul', '2': 'h2', '3': 'h3', '4': 'h4' };
            const fmt = shortcuts[e.key.toLowerCase()];
            if (fmt) { e.preventDefault(); insertFormat(fmt); }
            // Tab to indent
            if (e.key === 'Tab') { /* let browser handle */ }
        });

        // Tab key handling in textarea (insert spaces instead of moving focus)
        document.getElementById('lbCmsContent').addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                e.preventDefault();
                insertAtCursor('  ');
            }
        });

        // Fetch existing articles
        await fetchAdminArticles();
    }

    async function fetchAdminArticles() {
        const listEl = document.getElementById('lbCmsArticleList');
        if (!listEl || !window._sb) return;

        try {
            // Admin needs to see all articles (published + drafts)
            // This requires the admin RLS policy
            const { data, error } = await window._sb
                .from('longform_articles')
                .select('id,title,slug,published,created_at,views')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || !data.length) {
                listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--sub);padding:8px 0">No articles yet. Write your first one above.</div>';
                return;
            }

            listEl.innerHTML = data.map(a => `
        <div class="lb-cms-article-row">
          <span class="lb-cms-article-title" data-title-slug="${esc(a.slug)}">${esc(a.title)}</span>
          <span class="lb-cms-article-status ${a.published ? 'published' : 'draft'}">${a.published ? 'PUBLISHED' : 'DRAFT'}</span>
          <div class="lb-cms-article-actions">
            <button class="lb-cms-btn secondary" style="padding:4px 8px;font-size:8px" data-edit-slug="${esc(a.slug)}">EDIT</button>
            <button class="lb-cms-btn danger" style="padding:4px 8px;font-size:8px" data-delete-id="${a.id}">DEL</button>
          </div>
        </div>`
            ).join('');

            // Bind edit (title click and button)
            listEl.querySelectorAll('[data-title-slug]').forEach(el => {
                el.addEventListener('click', () => loadArticleForEdit(el.dataset.titleSlug));
            });
            listEl.querySelectorAll('[data-edit-slug]').forEach(el => {
                el.addEventListener('click', () => loadArticleForEdit(el.dataset.editSlug));
            });
            listEl.querySelectorAll('[data-delete-id]').forEach(el => {
                el.addEventListener('click', () => deleteArticle(el.dataset.deleteId));
            });

        } catch (e) {
            listEl.innerHTML = '<div style="color:#ef4444;font-size:10px">Failed to load articles.</div>';
        }
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

            // Populate form
            document.getElementById('lbCmsTitle').value = data.title || '';
            document.getElementById('lbCmsSlug').value = data.slug || '';
            document.getElementById('lbCmsExcerpt').value = data.excerpt || '';
            document.getElementById('lbCmsTags').value = (data.tags || []).join(', ');
            document.getElementById('lbCmsCover').value = data.cover_image || '';
            document.getElementById('lbCmsContent').value = data.content || '';

            // Update preview
            document.getElementById('lbCmsPreviewContent').innerHTML = parseMarkdown(data.content);

            // Update status
            document.getElementById('lbCmsStatus').textContent = `Editing: "${data.title}"`;

            // Scroll to top of dialog
            adminDialog.scrollTop = 0;
            snd('tap');

        } catch (e) { }
    }

    async function saveArticle(publish) {
        if (!window._sb) return;

        const title = document.getElementById('lbCmsTitle').value.trim();
        const slug = document.getElementById('lbCmsSlug').value.trim() || slugify(title);
        const excerpt = document.getElementById('lbCmsExcerpt').value.trim();
        const tags = document.getElementById('lbCmsTags').value.split(',').map(t => t.trim()).filter(Boolean);
        const cover = document.getElementById('lbCmsCover').value.trim();
        const content = document.getElementById('lbCmsContent').value;

        if (!title) {
            document.getElementById('lbCmsStatus').textContent = '⚠ Title is required.';
            return;
        }
        if (!slug) {
            document.getElementById('lbCmsStatus').textContent = '⚠ Slug is required.';
            return;
        }

        const pubBtn = document.getElementById('lbCmsPublish');
        const draftBtn = document.getElementById('lbCmsDraft');
        pubBtn.disabled = true;
        draftBtn.disabled = true;
        document.getElementById('lbCmsStatus').textContent = publish ? 'Publishing...' : 'Saving draft...';

        const row = {
            title,
            slug,
            excerpt,
            content,
            cover_image: cover,
            tags,
            published: publish
        };

        try {
            let error;
            if (editingArticle) {
                // Update existing
                ({ error } = await window._sb.from('longform_articles').update(row).eq('id', editingArticle.id));
            } else {
                // Insert new
                ({ error } = await window._sb.from('longform_articles').insert(row));
            }

            if (error) throw error;

            snd('success');
            document.getElementById('lbCmsStatus').textContent = publish ? '✓ Published!' : '✓ Draft saved!';

            if (window.UniToast) {
                window.UniToast(publish ? 'Article published!' : 'Draft saved.', '', publish ? '🚀' : '💾', 'success');
            }

            // Clear form if new article
            if (!editingArticle) {
                document.getElementById('lbCmsTitle').value = '';
                document.getElementById('lbCmsSlug').value = '';
                document.getElementById('lbCmsExcerpt').value = '';
                document.getElementById('lbCmsTags').value = '';
                document.getElementById('lbCmsCover').value = '';
                document.getElementById('lbCmsContent').value = '';
                document.getElementById('lbCmsPreviewContent').innerHTML = '<span style="color:var(--sub);font-family:\'JetBrains Mono\',monospace;font-size:10px">Live preview will appear here...</span>';
            }

            editingArticle = null;
            await fetchAdminArticles();

            // If published, offer to navigate
            if (publish) {
                setTimeout(() => {
                    const statusEl = document.getElementById('lbCmsStatus');
                    if (!statusEl) return;
                    const safeSlug = esc(slug);
                    statusEl.innerHTML = `✓ Published! <a href="?post=${safeSlug}" style="color:var(--accent);text-decoration:underline;cursor:pointer" id="lbCmsViewLink">View article →</a>`;
                    const viewLink = document.getElementById('lbCmsViewLink');
                    if (viewLink) {
                        viewLink.addEventListener('click', e => {
                            e.preventDefault();
                            closeAdmin();
                            navigateTo({ post: slug });
                        });
                    }
                }, 100);
            }

        } catch (e) {
            const msg = (e.code === '23505' || (e.message || '').includes('duplicate'))
                ? '⚠ Slug already exists. Choose a different slug.'
                : '⚠ ' + (e.message || 'Save failed.');
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
       GLOBAL API
       ═══════════════════════════════════════════════════ */
    window._blogNav = (params) => navigateTo(params);
    window._blogGoHome = goToPortfolio;
    window.openBlogAdmin = openAdmin;

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
    }, 100);

})();
