// microblog.js — Executive Thought Stream v6
// V1-V5: realtime, reactions, pin/edit/delete, search, skeleton, stagger, share,
// bookmarks, markdown+code, images, preview, sonification, comments, hashtags,
// auto-save, J/K nav, YouTube embeds, a11y, views, export, badge flash, spoilers,
// polls, drag-drop, copy, reading time, swipe, deep-links, stats, typewriter.
// V6: formatting toolbar, emoji picker, filter modes, voice input, TTS,
// trending tags, offline cache, confetti, focus mode, thread/quote.

(function MicroblogEngine() {
  'use strict';
  const MAX_CHARS = 500, PAGE_SIZE = 15, BUCKET = 'microblog-images';
  const REACTIONS_KEY = '_blog_reactions', BOOKMARKS_KEY = '_blog_bookmarks';
  const DRAFT_KEY = '_blog_draft', COMMENTER_KEY = '_blog_commenter', POLL_KEY = '_blog_polls', OFFLINE_KEY = '_blog_cache';
  const EMOJIS = ['🚀', '🔥', '💡', '🌟', '🎯', '✅', '💬', '📊', '📦', '⚡', '🎉', '👍', '❤️', '🙏', '👀', '🧠', '💪', '🌍', '💰', '📈', '🔒', '🛠️', '🌱', '✨'];
  const FILTERS = [{ key: 'all', label: 'All' }, { key: 'bookmarked', label: '🔖' }, { key: 'pinned', label: '📌' }, { key: 'media', label: '🖼️' }, { key: 'polls', label: '📊' }];
  const RX = [
    { key: 'heart', emoji: '❤️', label: 'Love' }, { key: 'fire', emoji: '🔥', label: 'Fire' },
    { key: 'bulb', emoji: '💡', label: 'Insightful' }, { key: 'clap', emoji: '👏', label: 'Bravo' },
    { key: 'target', emoji: '🎯', label: 'On Point' }
  ];

  /* ── CSS ── */
  const css = document.createElement('style'); css.id = 'microblog-css';
  css.textContent = `
#blogOverlay{position:fixed;inset:0;z-index:99999;background:rgba(6,8,15,.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s;pointer-events:none}
#blogOverlay.show{opacity:1;visibility:visible;pointer-events:auto}
.blog-panel{width:94%;max-width:540px;max-height:85vh;padding:24px;border-radius:20px;background:rgba(12,18,32,.75);border:1px solid rgba(0,225,255,.15);box-shadow:0 16px 48px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05);transform:scale(.95) translateY(10px);transition:transform .4s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column;overflow:hidden}
#blogOverlay.show .blog-panel{transform:scale(1) translateY(0)}
.blog-header{text-align:center;margin-bottom:14px;flex-shrink:0}
.blog-title{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:2px;color:#00e1ff;text-transform:uppercase;text-shadow:0 0 12px rgba(0,225,255,.3)}
.blog-subtitle{font-size:10px;color:#8b949e;margin-top:4px}
.blog-search-wrap{position:relative;margin-bottom:10px;flex-shrink:0}
.blog-search{width:100%;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:8px 12px 8px 28px;color:#e2e8f0;font-family:'Inter',sans-serif;font-size:11px;outline:none;box-sizing:border-box;transition:border-color .2s}
.blog-search:focus{border-color:rgba(0,225,255,.3)}
.blog-search::placeholder{color:#4a5568}
.blog-search-icon{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#4a5568;font-size:10px;pointer-events:none}
.blog-feed{flex:1;overflow-y:auto;padding-right:8px;display:flex;flex-direction:column;gap:12px}
.blog-feed::-webkit-scrollbar{width:4px}
.blog-feed::-webkit-scrollbar-thumb{background:rgba(0,225,255,.2);border-radius:4px}
.blog-skeleton{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);border-radius:12px;padding:14px}
.blog-skel-line{height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:skelShim 1.5s infinite;margin-bottom:8px}
.blog-skel-line:last-child{width:60%;margin-bottom:0}
@keyframes skelShim{0%{background-position:200% 0}100%{background-position:-200% 0}}
.blog-post{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;transition:border-color .3s,background .3s,opacity .4s,transform .4s;position:relative;opacity:0;transform:translateY(8px);outline:none}
.blog-post.visible{opacity:1;transform:translateY(0)}
.blog-post:hover,.blog-post:focus-visible{background:rgba(255,255,255,.05);border-color:rgba(0,225,255,.2)}
.blog-post.pinned{border-color:rgba(251,191,36,.25);background:rgba(251,191,36,.03)}
.blog-post.pinned::before{content:'📌 PINNED';position:absolute;top:-8px;left:14px;font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;letter-spacing:1px;color:#fbbf24;background:rgba(12,18,32,.9);padding:2px 8px;border-radius:4px;border:1px solid rgba(251,191,36,.2)}
.blog-post.bookmarked{border-left:2px solid #a855f7}
.blog-post.focused-post{box-shadow:0 0 0 2px rgba(0,225,255,.4)}
.blog-post-content{font-size:13px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word}
.blog-post-content strong{font-weight:700;color:#f0f2f5}
.blog-post-content em{font-style:italic;color:#a5b4fc}
.blog-post-content code{background:rgba(0,225,255,.08);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#00e1ff}
.blog-post-content s{text-decoration:line-through;opacity:.6}
.blog-post-content pre{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;margin:8px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:#a5f3fc;white-space:pre}
.blog-post-content .hashtag{color:#00e1ff;cursor:pointer;font-weight:600}
.blog-post-content .hashtag:hover{text-decoration:underline}
.blog-post-img{margin-top:10px;border-radius:10px;max-width:100%;max-height:280px;object-fit:cover;border:1px solid rgba(255,255,255,.06);cursor:pointer;transition:transform .2s}
.blog-post-img:hover{transform:scale(1.02)}
.blog-yt-embed{margin-top:10px;border-radius:10px;overflow:hidden;position:relative;padding-bottom:56.25%;height:0}
.blog-yt-embed iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:10px}
.blog-post-reactions{display:flex;gap:4px;margin-top:10px;flex-wrap:wrap;position:relative}
.blog-reaction-btn{display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);cursor:pointer;font-size:11px;color:#8b949e;transition:all .2s;user-select:none}
.blog-reaction-btn:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);transform:scale(1.05)}
.blog-reaction-btn.active{border-color:rgba(0,225,255,.25);background:rgba(0,225,255,.06);color:#e2e8f0}
.blog-reaction-btn .rcount{font-family:'JetBrains Mono',monospace;font-size:9px}
.blog-reaction-add{padding:3px 6px;border-radius:16px;border:1px dashed rgba(255,255,255,.08);background:none;cursor:pointer;font-size:10px;color:#4a5568;transition:all .2s}
.blog-reaction-add:hover{border-color:rgba(255,255,255,.15);color:#8b949e}
.blog-reaction-picker{position:absolute;bottom:calc(100% + 6px);left:0;display:flex;gap:4px;padding:6px 10px;background:rgba(12,18,32,.95);border:1px solid rgba(0,225,255,.15);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:10;opacity:0;visibility:hidden;transform:translateY(4px);transition:all .2s}
.blog-reaction-picker.show{opacity:1;visibility:visible;transform:translateY(0)}
.blog-reaction-picker button{background:none;border:none;font-size:16px;cursor:pointer;padding:4px;border-radius:6px;transition:all .15s}
.blog-reaction-picker button:hover{background:rgba(255,255,255,.08);transform:scale(1.3)}
.blog-post-meta{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6b7a90}
.blog-post-actions{display:flex;align-items:center;gap:7px}
.blog-action-btn{cursor:pointer;display:flex;align-items:center;gap:3px;transition:color .2s,opacity .2s;opacity:.5;background:none;border:none;color:inherit;font-family:inherit;font-size:inherit;padding:0}
.blog-action-btn:hover{opacity:1;color:#00e1ff}
.blog-action-btn.bookmark-active{opacity:1;color:#a855f7}
.blog-action-btn.delete-btn:hover{color:#ef4444}
.blog-comments-section{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.04)}
.blog-comments-toggle{font-family:'JetBrains Mono',monospace;font-size:9px;color:#6b7a90;cursor:pointer;background:none;border:none;padding:0;transition:color .2s}
.blog-comments-toggle:hover{color:#00e1ff}
.blog-comments-list{display:none;margin-top:8px;flex-direction:column;gap:6px}
.blog-comments-list.open{display:flex}
.blog-comment{background:rgba(255,255,255,.02);border-radius:8px;padding:8px 10px;font-size:11px;color:#c9d1d9}
.blog-comment-author{font-weight:700;color:#00e1ff;font-size:10px;margin-bottom:2px}
.blog-comment-time{font-family:'JetBrains Mono',monospace;font-size:8px;color:#6b7a90;margin-left:6px;font-weight:400}
.blog-comment-form{display:flex;gap:6px;margin-top:6px}
.blog-comment-input{flex:1;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:6px 8px;color:#fff;font-size:11px;outline:none;box-sizing:border-box}
.blog-comment-input:focus{border-color:rgba(0,225,255,.2)}
.blog-comment-send{background:#00e1ff;color:#06080f;border:none;padding:4px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;cursor:pointer}
.blog-views{font-family:'JetBrains Mono',monospace;font-size:8px;color:#4a5568;margin-left:6px}
.blog-composer{display:none;flex-direction:column;gap:8px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.blog-composer.active{display:flex}
.blog-textarea{width:100%;background:rgba(0,0,0,.3);border:1px solid rgba(0,225,255,.2);border-radius:10px;padding:12px;color:#fff;font-family:'Inter',sans-serif;font-size:13px;resize:none;outline:none;box-sizing:border-box;transition:border-color .2s}
.blog-textarea:focus{border-color:#00e1ff;box-shadow:0 0 0 2px rgba(0,225,255,.1)}
.blog-preview{display:none;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px;font-size:13px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;min-height:50px;max-height:120px;overflow-y:auto}
.blog-preview.show{display:block}
.blog-preview strong{font-weight:700;color:#f0f2f5}
.blog-preview em{font-style:italic;color:#a5b4fc}
.blog-preview code{background:rgba(0,225,255,.08);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#00e1ff}
.blog-preview s{text-decoration:line-through;opacity:.6}
.blog-preview pre{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;margin:8px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:#a5f3fc;white-space:pre}
.blog-img-preview{position:relative;display:inline-block;margin-top:4px}
.blog-img-preview img{max-height:80px;border-radius:8px;border:1px solid rgba(0,225,255,.15)}
.blog-img-preview .blog-img-remove{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.blog-composer-footer{display:flex;justify-content:space-between;align-items:center}
.blog-char-count{font-family:'JetBrains Mono',monospace;font-size:9px;color:#6b7a90;transition:color .2s}
.blog-char-count.warn{color:#f59e0b}
.blog-char-count.over{color:#ef4444;font-weight:700}
.blog-composer-actions{display:flex;align-items:center;gap:6px}
.blog-tool-btn{background:none;border:1px solid rgba(0,225,255,.12);color:#00e1ff;padding:5px 8px;border-radius:6px;font-size:11px;cursor:pointer;transition:all .2s}
.blog-tool-btn:hover{background:rgba(0,225,255,.08);border-color:rgba(0,225,255,.3)}
.blog-tool-btn.active{background:rgba(0,225,255,.12);border-color:#00e1ff}
.blog-submit{background:#00e1ff;color:#06080f;border:none;padding:8px 16px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all .2s}
.blog-submit:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,225,255,.3)}
.blog-submit:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
.blog-edit-area{width:100%;background:rgba(0,0,0,.3);border:1px solid rgba(0,225,255,.2);border-radius:8px;padding:10px;color:#fff;font-family:'Inter',sans-serif;font-size:13px;resize:none;outline:none;box-sizing:border-box;margin-top:8px}
.blog-edit-actions{display:flex;gap:6px;margin-top:6px;justify-content:flex-end}
.blog-edit-actions button{font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 10px;border-radius:6px;cursor:pointer;border:none;transition:all .2s}
.blog-edit-save{background:#00e1ff;color:#06080f;font-weight:700}
.blog-edit-cancel{background:rgba(255,255,255,.06);color:#8b949e}
.blog-load-more{text-align:center;padding:12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#00e1ff;cursor:pointer;transition:opacity .2s;border-top:1px solid rgba(255,255,255,.04);margin-top:4px}
.blog-load-more:hover{opacity:.7}
.blog-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-shrink:0}
.blog-close{font-family:'JetBrains Mono',monospace;font-size:9px;color:#8b949e;cursor:pointer;transition:color .2s}
.blog-close:hover{color:#00e1ff}
.blog-export{font-family:'JetBrains Mono',monospace;font-size:9px;color:#4a5568;cursor:pointer;transition:color .2s;background:none;border:none}
.blog-export:hover{color:#00e1ff}
.blog-badge{position:absolute;top:-2px;right:-2px;min-width:14px;height:14px;border-radius:7px;background:#f472b6;color:#fff;font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;pointer-events:none;box-shadow:0 2px 6px rgba(244,114,182,.4)}
.blog-badge.flash{animation:badgeFlash .6s ease}
@keyframes badgeFlash{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
.blog-rt-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:6px;animation:blogPulse 2s ease-in-out infinite}
@keyframes blogPulse{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
.blog-lightbox{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;transition:opacity .3s}
.blog-lightbox.show{opacity:1}
.blog-lightbox img{max-width:92vw;max-height:90vh;border-radius:12px;object-fit:contain}
.blog-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.blog-spoiler{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;margin:6px 0;cursor:pointer;position:relative}
.blog-spoiler::before{content:'⚠️ Spoiler — tap to reveal';font-family:'JetBrains Mono',monospace;font-size:9px;color:#f59e0b;letter-spacing:.5px}
.blog-spoiler .blog-spoiler-body{max-height:0;overflow:hidden;opacity:0;transition:max-height .3s,opacity .3s;margin-top:0}
.blog-spoiler.revealed .blog-spoiler-body{max-height:500px;opacity:1;margin-top:8px}
.blog-spoiler.revealed::before{content:'⚠️ Spoiler'}
.blog-poll{background:rgba(0,225,255,.03);border:1px solid rgba(0,225,255,.1);border-radius:10px;padding:12px;margin:8px 0}
.blog-poll-q{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:#00e1ff;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
.blog-poll-opt{display:flex;align-items:center;gap:8px;padding:6px 10px;margin:4px 0;border-radius:8px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.blog-poll-opt:hover{border-color:rgba(0,225,255,.2);background:rgba(0,225,255,.03)}
.blog-poll-opt.voted{border-color:rgba(0,225,255,.25);cursor:default}
.blog-poll-opt .poll-bar{position:absolute;left:0;top:0;bottom:0;background:rgba(0,225,255,.08);border-radius:8px;transition:width .4s ease}
.blog-poll-opt .poll-label{font-size:11px;color:#e2e8f0;position:relative;z-index:1;flex:1}
.blog-poll-opt .poll-pct{font-family:'JetBrains Mono',monospace;font-size:9px;color:#6b7a90;position:relative;z-index:1}
.blog-copy-btn{cursor:pointer;display:flex;align-items:center;gap:3px;transition:color .2s,opacity .2s;opacity:.5;background:none;border:none;color:inherit;font-family:inherit;font-size:inherit;padding:0}
.blog-copy-btn:hover{opacity:1;color:#22c55e}
.blog-reading-time{font-family:'JetBrains Mono',monospace;font-size:8px;color:#4a5568;margin-left:4px}
.blog-textarea.drag-over{border-color:#22c55e!important;background:rgba(34,197,94,.05)!important;box-shadow:0 0 0 2px rgba(34,197,94,.2)!important}
.blog-deep-link{animation:blogDeepPulse 1s ease 2}
@keyframes blogDeepPulse{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 3px rgba(0,225,255,.3)}}
.blog-stats-panel{background:rgba(0,0,0,.2);border:1px solid rgba(0,225,255,.08);border-radius:10px;padding:14px;margin-bottom:12px;display:none;flex-shrink:0}
.blog-stats-panel.show{display:block}
.blog-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center}
.blog-stat-item{font-family:'JetBrains Mono',monospace}
.blog-stat-num{font-size:18px;font-weight:700;color:#00e1ff;line-height:1}
.blog-stat-label{font-size:7px;color:#6b7a90;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.blog-stats-toggle{font-family:'JetBrains Mono',monospace;font-size:9px;color:#4a5568;cursor:pointer;background:none;border:none;transition:color .2s;padding:0}
.blog-stats-toggle:hover{color:#00e1ff}
.light-mode #blogOverlay{background:rgba(230,235,245,.7)}
.light-mode .blog-panel{background:rgba(255,255,255,.85);border-color:rgba(0,102,255,.15);box-shadow:0 16px 48px rgba(0,0,0,.1)}
.light-mode .blog-title{color:#0066ff;text-shadow:none}
.light-mode .blog-search{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08);color:#1f2937}
.light-mode .blog-post{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.06)}
.light-mode .blog-post:hover,.light-mode .blog-post:focus-visible{border-color:rgba(0,102,255,.2)}
.light-mode .blog-post.pinned{border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.04)}
.light-mode .blog-post-content{color:#1f2937}
.light-mode .blog-post-content strong{color:#0f172a}
.light-mode .blog-post-content em{color:#4f46e5}
.light-mode .blog-post-content code{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .blog-post-content pre{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.08);color:#0f172a}
.light-mode .blog-textarea,.light-mode .blog-comment-input{background:#fff;border-color:rgba(0,0,0,.1);color:#000}
.light-mode .blog-preview{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.06);color:#1f2937}
.light-mode .blog-tool-btn{border-color:rgba(0,102,255,.12);color:#0066ff}
.light-mode .blog-reaction-btn{border-color:rgba(0,0,0,.06);background:rgba(0,0,0,.02)}
.light-mode .blog-reaction-picker{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.1)}
.light-mode .blog-comment{background:rgba(0,0,0,.02)}
.light-mode .blog-comment-author{color:#0066ff}
.light-mode .blog-spoiler{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06)}
.light-mode .blog-poll{background:rgba(0,102,255,.03);border-color:rgba(0,102,255,.1)}
.light-mode .blog-poll-q{color:#0066ff}
.light-mode .blog-stats-panel{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06)}
.light-mode .blog-stat-num{color:#0066ff}
.blog-fmt-bar{display:flex;gap:4px;margin-bottom:6px}
.blog-fmt-btn{background:none;border:1px solid rgba(255,255,255,.06);color:#8b949e;padding:3px 7px;border-radius:5px;font-size:10px;cursor:pointer;transition:all .15s;font-family:'JetBrains Mono',monospace}
.blog-fmt-btn:hover{border-color:rgba(0,225,255,.2);color:#00e1ff}
.blog-emoji-grid{display:none;flex-wrap:wrap;gap:2px;max-width:240px;padding:6px;background:rgba(12,18,32,.95);border:1px solid rgba(0,225,255,.15);border-radius:10px;position:absolute;bottom:calc(100% + 4px);left:0;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.blog-emoji-grid.show{display:flex}
.blog-emoji-grid button{background:none;border:none;font-size:16px;padding:4px;cursor:pointer;border-radius:4px;transition:transform .1s}
.blog-emoji-grid button:hover{transform:scale(1.3);background:rgba(255,255,255,.06)}
.blog-filter-strip{display:flex;gap:4px;margin-bottom:8px;flex-shrink:0;flex-wrap:wrap}
.blog-filter-btn{font-family:'JetBrains Mono',monospace;font-size:8px;padding:3px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:#8b949e;cursor:pointer;transition:all .15s;text-transform:uppercase;letter-spacing:.5px}
.blog-filter-btn:hover{border-color:rgba(0,225,255,.15)}
.blog-filter-btn.active{border-color:rgba(0,225,255,.3);background:rgba(0,225,255,.06);color:#00e1ff}
.blog-trending{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;flex-shrink:0}
.blog-trending-tag{font-family:'JetBrains Mono',monospace;font-size:8px;padding:2px 7px;border-radius:10px;background:rgba(0,225,255,.04);border:1px solid rgba(0,225,255,.08);color:#00e1ff;cursor:pointer;transition:all .15s}
.blog-trending-tag:hover{background:rgba(0,225,255,.1)}
.blog-voice-btn{background:none;border:1px solid rgba(239,68,68,.2);color:#ef4444;padding:5px 8px;border-radius:6px;font-size:11px;cursor:pointer;transition:all .2s}
.blog-voice-btn.recording{border-color:#ef4444;background:rgba(239,68,68,.1);animation:voicePulse 1s infinite}
@keyframes voicePulse{0%,100%{opacity:1}50%{opacity:.5}}
.blog-tts-btn{cursor:pointer;opacity:.4;transition:opacity .2s;background:none;border:none;color:inherit;font-size:inherit;font-family:inherit;padding:0}
.blog-tts-btn:hover{opacity:1;color:#a855f7}
.blog-tts-btn.speaking{opacity:1;color:#a855f7;animation:voicePulse 1s infinite}
.blog-focus-btn{cursor:pointer;opacity:.4;transition:opacity .2s;background:none;border:none;color:inherit;font-size:inherit;font-family:inherit;padding:0}
.blog-focus-btn:hover{opacity:1;color:#f59e0b}
.blog-focus-overlay{position:fixed;inset:0;z-index:100001;background:rgba(6,8,15,.92);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;padding:24px}
.blog-focus-overlay.show{opacity:1}
.blog-focus-card{max-width:560px;width:100%;background:rgba(12,18,32,.85);border:1px solid rgba(0,225,255,.15);border-radius:20px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.5);max-height:80vh;overflow-y:auto}
.blog-focus-card .blog-post-content{font-size:16px;line-height:1.8}
.blog-focus-close{text-align:center;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8b949e;cursor:pointer}
.blog-confetti{position:fixed;top:0;left:50%;z-index:100002;pointer-events:none}
.light-mode .blog-fmt-btn{border-color:rgba(0,0,0,.06);color:#6b7a90}
.light-mode .blog-emoji-grid{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.1)}
.light-mode .blog-filter-btn{border-color:rgba(0,0,0,.06);color:#6b7a90}
.light-mode .blog-filter-btn.active{border-color:rgba(0,102,255,.3);color:#0066ff;background:rgba(0,102,255,.06)}
.light-mode .blog-trending-tag{background:rgba(0,102,255,.04);border-color:rgba(0,102,255,.08);color:#0066ff}
.light-mode .blog-focus-card{background:rgba(255,255,255,.92);border-color:rgba(0,102,255,.15)}
.blog-inline-post{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;cursor:pointer;transition:border-color .3s,background .3s,opacity .4s,transform .4s;opacity:0;transform:translateY(8px)}
.blog-inline-post.visible{opacity:1;transform:translateY(0)}
.blog-inline-post:hover{background:rgba(255,255,255,.06);border-color:rgba(0,225,255,.2)}
.blog-inline-post.pinned{border-color:rgba(251,191,36,.25);background:rgba(251,191,36,.03)}
.blog-inline-content{font-size:13px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.blog-inline-content strong{font-weight:700;color:#f0f2f5}
.blog-inline-content em{font-style:italic;color:#a5b4fc}
.blog-inline-content code{background:rgba(0,225,255,.08);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#00e1ff}
.blog-inline-meta{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6b7a90}
.blog-inline-reactions{display:flex;gap:4px;align-items:center}
.blog-inline-img{margin-top:8px;border-radius:8px;max-width:100%;max-height:160px;object-fit:cover;border:1px solid rgba(255,255,255,.06)}
.light-mode .blog-inline-post{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.06)}
.light-mode .blog-inline-post:hover{border-color:rgba(0,102,255,.2)}
.light-mode .blog-inline-content{color:#1f2937}
.light-mode .blog-inline-content strong{color:#0f172a}
.light-mode .blog-inline-content em{color:#4f46e5}
.light-mode .blog-inline-content code{background:rgba(0,102,255,.06);color:#0066ff}
.light-mode .blog-inline-img{border-color:rgba(0,0,0,.08)}
.light-mode .blog-inline-meta{color:#94a3b8}
.light-mode .blog-inline-post.pinned{border-color:rgba(180,83,9,.2);background:rgba(251,191,36,.04)}
.blog-inline-tag{font-size:8px;padding:2px 6px;border:1px solid rgba(0,225,255,.15);color:#00e1ff;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;text-transform:uppercase;border-radius:4px}
.light-mode .blog-inline-tag{border-color:rgba(0,102,255,.12);color:#0066ff}
`; document.head.appendChild(css);

  /* ── HELPERS ── */
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isAdmin = () => {
    if (window._passkey && window._passkey.isAuthenticated) return true;
    if (window._hasBlogAdminSession && window._hasBlogAdminSession()) return true;
    return false;
  };
  const getJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch (e) { return d; } };
  const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const snd = t => { if (window._sonification && window._sonification[t]) window._sonification[t](); else if (window._haptic && window._haptic[t]) window._haptic[t](); };

  function relTime(d) { const s = Math.floor(Math.max(0, Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; const dy = Math.floor(h / 24); if (dy < 7) return dy + 'd ago'; if (dy < 30) return Math.floor(dy / 7) + 'w ago'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

  function renderMd(s) {
    // Code blocks first (triple backtick)
    s = s.replace(/```([\s\S]*?)```/g, (_, code) => '<pre>' + code.trim() + '</pre>');
    // Spoiler blocks
    s = s.replace(/\|\|\|([\s\S]*?)\|\|\|/g, '<div class="blog-spoiler" onclick="this.classList.toggle(\'revealed\')"><div class="blog-spoiler-body">$1</div></div>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
    return s;
  }

  function readingTime(text) { const w = (text || '').split(/\s+/).filter(Boolean).length; const m = Math.max(1, Math.ceil(w / 200)); return m + ' min read'; }

  function fmtContent(raw) {
    let s = esc(raw);
    s = renderMd(s);
    // Hashtags
    s = s.replace(/#(\w+)/g, '<span class="hashtag" data-tag="$1">#$1</span>');
    // YouTube embeds
    s = s.replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:[^\s<]*)/g,
      '<div class="blog-yt-embed"><iframe src="https://www.youtube-nocookie.com/embed/$1" allowfullscreen loading="lazy"></iframe></div>');
    // URLs (that aren't already in an href or iframe)
    s = s.replace(/(?<!["=])(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">$1</a>');
    return s;
  }

  /* ── UI ── */
  const ov = document.createElement('div'); ov.id = 'blogOverlay';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Delivery Notes Microblog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = `
<div class="blog-panel">
  <div class="blog-header"><div class="blog-title"><span class="blog-rt-dot"></span>💭 Delivery Notes</div><div class="blog-subtitle">Live thoughts on Agile, FinTech, and Data.</div></div>
  <div class="blog-composer" id="blogComposer">
    <div class="blog-fmt-bar" id="blogFmtBar"><button class="blog-fmt-btn" data-fmt="bold" title="Bold"><b>B</b></button><button class="blog-fmt-btn" data-fmt="italic" title="Italic"><i>I</i></button><button class="blog-fmt-btn" data-fmt="code" title="Code">&lt;/&gt;</button><button class="blog-fmt-btn" data-fmt="spoiler" title="Spoiler">|||</button><button class="blog-fmt-btn" data-fmt="strike" title="Strike"><s>S</s></button><span class="blog-fmt-btn" id="blogEmojiTgl" title="Emoji" style="position:relative;cursor:pointer">😀<div class="blog-emoji-grid" id="blogEmojiGrid">${EMOJIS.map(e => '<button data-em="' + e + '">' + e + '</button>').join('')}</div></span><button class="blog-voice-btn" id="blogVoice" title="Voice input"><i class="fa-solid fa-microphone"></i></button></div>
    <textarea id="blogInput" class="blog-textarea" rows="3" maxlength="${MAX_CHARS}" placeholder="What's on your mind? (Markdown · #hashtags · \`\`\`code\`\`\`)" aria-label="Compose post"></textarea>
    <div class="blog-preview" id="blogPreview" aria-live="polite"></div>
    <div class="blog-img-preview" id="blogImgPrev" style="display:none"><img id="blogImgThumb" src="" alt="Attachment"><button class="blog-img-remove" id="blogImgRm" title="Remove">✕</button></div>
    <div class="blog-composer-footer">
      <span class="blog-char-count" id="blogCC">0 / ${MAX_CHARS}</span>
      <div class="blog-composer-actions">
        <button class="blog-tool-btn" id="blogPrevTgl" title="Preview"><i class="fa-solid fa-eye"></i></button>
        <button class="blog-tool-btn" id="blogAttach" title="Image"><i class="fa-solid fa-image"></i></button>
        <input type="file" id="blogFileIn" accept="image/*" style="display:none">
        <button id="blogSubmit" class="blog-submit">Post</button>
      </div>
    </div>
  </div>
  <div class="blog-search-wrap"><i class="fa-solid fa-magnifying-glass blog-search-icon"></i><input class="blog-search" id="blogSearch" type="text" placeholder="Search posts or #tags..." autocomplete="off" aria-label="Search posts"></div>
  <div class="blog-filter-strip" id="blogFilterStrip">${FILTERS.map(f => '<button class="blog-filter-btn' + (f.key === 'all' ? ' active' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>').join('')}</div>
  <div class="blog-trending" id="blogTrending"></div>
  <div class="blog-stats-panel" id="blogStats"><div class="blog-stats-grid" id="blogStatsGrid"></div></div>
  <div class="blog-feed" id="blogFeed" role="feed" aria-label="Blog posts"></div>
  <div class="blog-footer"><span class="blog-close" id="blogClose">[ ESC · B · TAP ]</span><div style="display:flex;gap:10px;align-items:center"><button class="blog-stats-toggle" id="blogStatsBtn" title="Stats" style="display:none"><i class="fa-solid fa-chart-simple"></i></button><button class="blog-export" id="blogExport" title="Export as Markdown"><i class="fa-solid fa-download"></i> Export</button></div></div>
</div>
<span class="blog-sr-only" id="blogAnnounce" aria-live="assertive"></span>`;
  document.body.appendChild(ov);

  const feed = document.getElementById('blogFeed');
  const comp = document.getElementById('blogComposer');
  const inp = document.getElementById('blogInput');
  const sub = document.getElementById('blogSubmit');
  const cc = document.getElementById('blogCC');
  const prev = document.getElementById('blogPreview');
  const prevTgl = document.getElementById('blogPrevTgl');
  const attBtn = document.getElementById('blogAttach');
  const fIn = document.getElementById('blogFileIn');
  const imgPrev = document.getElementById('blogImgPrev');
  const imgThumb = document.getElementById('blogImgThumb');
  const imgRm = document.getElementById('blogImgRm');
  const srch = document.getElementById('blogSearch');
  const announce = document.getElementById('blogAnnounce');

  let pendFile = null, posts = [], page = 0, hasMore = true, rtChan = null, sq = '', pvMode = false, focusIdx = -1, activeFilter = 'all';

  /* ── FORMATTING TOOLBAR ── */
  document.getElementById('blogFmtBar').addEventListener('click', e => {
    const btn = e.target.closest('[data-fmt]'); if (!btn) return;
    const { selectionStart: s, selectionEnd: end } = inp, sel = inp.value.substring(s, end);
    const wraps = { bold: '**', italic: '*', code: '`', spoiler: '|||', strike: '~~' };
    const w = wraps[btn.dataset.fmt]; if (!w) return;
    const repl = w + (sel || 'text') + w;
    inp.setRangeText(repl, s, end, 'end'); inp.focus(); inp.dispatchEvent(new Event('input'));
  });

  /* ── EMOJI PICKER ── */
  const emojiGrid = document.getElementById('blogEmojiGrid');
  document.getElementById('blogEmojiTgl').addEventListener('click', e => { if (e.target.closest('[data-em]')) return; emojiGrid.classList.toggle('show'); });
  emojiGrid.addEventListener('click', e => { const b = e.target.closest('[data-em]'); if (b) { inp.setRangeText(b.dataset.em, inp.selectionStart, inp.selectionStart, 'end'); inp.focus(); inp.dispatchEvent(new Event('input')); emojiGrid.classList.remove('show'); } });
  document.addEventListener('click', e => { if (!e.target.closest('#blogEmojiTgl')) emojiGrid.classList.remove('show'); });

  /* ── VOICE INPUT ── */
  const voiceBtn = document.getElementById('blogVoice');
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR(); recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; const v = inp.value.trimEnd(); inp.value = (v ? v + ' ' : '') + t; inp.dispatchEvent(new Event('input')); };
    recognition.onend = () => voiceBtn.classList.remove('recording');
  }
  voiceBtn.addEventListener('click', () => {
    if (!recognition) { if (window.UniToast) window.UniToast('Speech not supported.', '', '⚠️', 'warn'); return; }
    if (voiceBtn.classList.contains('recording')) { recognition.stop(); } else { recognition.start(); voiceBtn.classList.add('recording'); snd('tap'); }
  });

  /* ── FILTER STRIP ── */
  document.getElementById('blogFilterStrip').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]'); if (!btn) return;
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === activeFilter));
    render(posts);
  });

  /* ── CHAR COUNTER + DRAFT ── */
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) { inp.value = savedDraft; cc.textContent = savedDraft.length + ' / ' + MAX_CHARS; }
  inp.addEventListener('input', () => {
    const l = inp.value.length;
    cc.textContent = l + ' / ' + MAX_CHARS;
    cc.classList.toggle('warn', l > MAX_CHARS * .8 && l <= MAX_CHARS);
    cc.classList.toggle('over', l > MAX_CHARS);
    sub.disabled = l > MAX_CHARS;
    if (pvMode) prev.innerHTML = fmtContent(inp.value);
    try { localStorage.setItem(DRAFT_KEY, inp.value); } catch (e) { }
  });
  prevTgl.addEventListener('click', () => { pvMode = !pvMode; prevTgl.classList.toggle('active', pvMode); prev.classList.toggle('show', pvMode); if (pvMode) prev.innerHTML = fmtContent(inp.value); });

  /* ── IMAGE ── */
  attBtn.addEventListener('click', () => fIn.click());
  fIn.addEventListener('change', () => { const f = fIn.files[0]; if (!f) return; if (!f.type.startsWith('image/')) { if (window.UniToast) window.UniToast('Images only.', '', '⚠️', 'warn'); return; } if (f.size > 5e6) { if (window.UniToast) window.UniToast('Max 5 MB.', '', '⚠️', 'warn'); return; } pendFile = f; const r = new FileReader(); r.onload = e => { imgThumb.src = e.target.result; imgPrev.style.display = 'inline-block'; }; r.readAsDataURL(f); });
  imgRm.addEventListener('click', () => { pendFile = null; fIn.value = ''; imgPrev.style.display = 'none'; imgThumb.src = ''; });

  /* ── DRAG & DROP ── */
  function handleDrop(file) { if (!file || !file.type.startsWith('image/')) return; if (file.size > 5e6) { if (window.UniToast) window.UniToast('Max 5 MB.', '', '⚠️', 'warn'); return; } pendFile = file; const r = new FileReader(); r.onload = e => { imgThumb.src = e.target.result; imgPrev.style.display = 'inline-block'; }; r.readAsDataURL(file); }
  inp.addEventListener('dragover', e => { e.preventDefault(); inp.classList.add('drag-over'); });
  inp.addEventListener('dragleave', () => inp.classList.remove('drag-over'));
  inp.addEventListener('drop', e => { e.preventDefault(); inp.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleDrop(e.dataTransfer.files[0]); });

  /* ── SEARCH ── */
  let sTimer = null;
  srch.addEventListener('input', () => { clearTimeout(sTimer); sTimer = setTimeout(() => { sq = srch.value.trim().toLowerCase(); render(posts); }, 200); });

  /* ── OPEN/CLOSE ── */
  ov.addEventListener('click', e => { if (e.target === ov) closeBlog(); });
  document.getElementById('blogClose').addEventListener('click', closeBlog);

  function openBlog(deepId) { ov.classList.add('show'); snd('menuOpen'); if (window.autoDismiss) window.autoDismiss('blogOverlay', closeBlog); if (isAdmin()) { comp.classList.add('active'); document.getElementById('blogStatsBtn').style.display = ''; } else { comp.classList.remove('active'); document.getElementById('blogStatsBtn').style.display = 'none'; } posts = []; page = 0; hasMore = true; sq = ''; srch.value = ''; focusIdx = -1; showSkel(); fetchPosts(true).then(() => { if (deepId) scrollToPost(deepId); }); startRT(); announce.textContent = 'Delivery Notes opened'; }
  function closeBlog() { ov.classList.remove('show'); snd('menuClose'); if (window.cancelAutoDismiss) window.cancelAutoDismiss('blogOverlay'); announce.textContent = ''; document.getElementById('blogStats').classList.remove('show'); }
  function scrollToPost(pid) { setTimeout(() => { const el = feed.querySelector('[data-pid="' + pid + '"]'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('blog-deep-link'); } }, 300); }
  function showSkel() { feed.innerHTML = [0, 1, 2].map(() => '<div class="blog-skeleton"><div class="blog-skel-line"></div><div class="blog-skel-line"></div><div class="blog-skel-line"></div></div>').join(''); }

  /* ── FETCH ── */
  async function fetchPosts(reset) {
    if (!window._sb) { loadOffline(); return Promise.resolve(); } if (reset) { posts = []; page = 0; hasMore = true; }
    try {
      const f = page * PAGE_SIZE, t = f + PAGE_SIZE - 1;
      const { data, error } = await window._sb.from('microblog').select('*').order('pinned', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).range(f, t);
      if (error) throw error;
      if (!data || data.length < PAGE_SIZE) hasMore = false;
      if (reset) posts = data || []; else posts = posts.concat(data || []);
      page++; render(posts); updateBadge(posts.length); updateTrending(posts);
      // Cache offline
      try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(posts.slice(0, 30))); } catch (e) { }
    } catch (e) { loadOffline(); }
  }
  function loadOffline() {
    try { const cached = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); if (cached.length) { posts = cached; render(posts); updateBadge(posts.length); updateTrending(posts); feed.insertAdjacentHTML('beforeend', '<div style="text-align:center;font-size:9px;color:#f59e0b;padding:8px;font-family:\'JetBrains Mono\',monospace">📡 Offline — showing cached posts</div>'); } else { feed.innerHTML = '<div style="text-align:center;color:#ef4444;font-size:11px">Offline. Could not sync.</div>'; } } catch (e) { feed.innerHTML = '<div style="text-align:center;color:#ef4444;font-size:11px">Offline.</div>'; }
  }

  /* ── TRENDING TAGS ── */
  function updateTrending(ps) {
    const tags = {}; ps.forEach(p => { const m = (p.content || '').match(/#(\w+)/g); if (m) m.forEach(t => { const k = t.toLowerCase(); tags[k] = (tags[k] || 0) + 1; }); });
    const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const el = document.getElementById('blogTrending');
    if (sorted.length) { el.innerHTML = sorted.map(([t]) => '<button class="blog-trending-tag" data-tag="' + t.slice(1) + '">' + t + '</button>').join(''); el.style.display = ''; } else el.style.display = 'none';
  }
  document.getElementById('blogTrending').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (b) { srch.value = '#' + b.dataset.tag; sq = '#' + b.dataset.tag; render(posts); } });

  /* ── CONFETTI ── */
  let lastConfettiCount = 0;
  function maybeConfetti(count) {
    if ([10, 25, 50, 100, 250, 500].includes(count)) {
      for (let i = 0; i < 30; i++) { const c = document.createElement('div'); c.className = 'blog-confetti'; c.textContent = ['🎉', '✨', '🌟', '🚀', '🔥'][Math.floor(Math.random() * 5)]; c.style.cssText = 'left:' + (Math.random() * 100) + 'vw;font-size:' + (16 + Math.random() * 16) + 'px;animation:confFall ' + (1.5 + Math.random() * 2) + 's ease-out forwards;'; document.body.appendChild(c); setTimeout(() => c.remove(), 4000); }
      if (!document.getElementById('confCSS')) { const s = document.createElement('style'); s.id = 'confCSS'; s.textContent = '@keyframes confFall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}'; document.head.appendChild(s); }
      if (window.UniToast) window.UniToast('🎉 Milestone: ' + count + ' posts!', '', '', 'success');
    }
  }

  /* ── TTS ── */
  let ttsUtterance = null;
  function readAloud(text, btn) {
    if (ttsUtterance && speechSynthesis.speaking) { speechSynthesis.cancel(); ttsUtterance = null; document.querySelectorAll('.blog-tts-btn.speaking').forEach(b => b.classList.remove('speaking')); return; }
    ttsUtterance = new SpeechSynthesisUtterance(text); ttsUtterance.rate = 1; ttsUtterance.pitch = 1;
    ttsUtterance.onend = () => { btn.classList.remove('speaking'); ttsUtterance = null; };
    btn.classList.add('speaking'); speechSynthesis.speak(ttsUtterance); snd('tap');
  }

  /* ── FOCUS MODE ── */
  function openFocus(post) {
    const fo = document.createElement('div'); fo.className = 'blog-focus-overlay';
    const ch = post.content ? fmtContent(post.content) : '';
    let imgH = ''; if (post.image_url) imgH = '<img style="max-width:100%;border-radius:12px;margin-top:12px" src="' + esc(post.image_url) + '" alt="">';
    fo.innerHTML = '<div class="blog-focus-card"><div class="blog-post-content">' + ch + '</div>' + imgH + '<div style="margin-top:12px;font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#6b7a90">' + relTime(post.created_at) + ' · ' + readingTime(post.content) + '</div><div class="blog-focus-close">[ ESC or TAP to close ]</div></div>';
    fo.addEventListener('click', e => { if (e.target === fo || e.target.closest('.blog-focus-close')) { fo.classList.remove('show'); setTimeout(() => fo.remove(), 300); } });
    document.body.appendChild(fo); requestAnimationFrame(() => fo.classList.add('show'));
    const escH = e => { if (e.key === 'Escape') { fo.classList.remove('show'); setTimeout(() => fo.remove(), 300); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }

  /* ── REALTIME ── */
  function startRT() {
    if (!window._sb || rtChan) return;
    try {
      rtChan = window._sb.channel('blog-rt')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'microblog' }, p => { if (p.new && !posts.find(x => x.id === p.new.id)) { posts.unshift(p.new); render(posts); updateBadge(posts.length); snd('tap'); flashBadge(); announce.textContent = 'New post arrived'; } })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'microblog' }, p => { posts = posts.filter(x => x.id !== p.old.id); render(posts); updateBadge(posts.length); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'microblog' }, p => { const i = posts.findIndex(x => x.id === p.new.id); if (i !== -1) { posts[i] = p.new; render(posts); } })
        .subscribe();
    } catch (e) { }
  }

  /* ── CREATE ── */
  async function createPost() {
    const c = inp.value.trim(); if ((!c && !pendFile) || !window._sb || c.length > MAX_CHARS) return;
    sub.disabled = true; sub.textContent = 'Posting...';
    try {
      var result = await window._createMicroblogPost(c, pendFile, null);
      if (!result.success) throw new Error(result.error);
      inp.value = ''; cc.textContent = '0 / ' + MAX_CHARS; cc.className = 'blog-char-count'; pendFile = null; fIn.value = ''; imgPrev.style.display = 'none'; imgThumb.src = ''; pvMode = false; prevTgl.classList.remove('active'); prev.classList.remove('show');
      localStorage.removeItem(DRAFT_KEY); snd('success'); if (window.UniToast) window.UniToast('Published.', '', '✅', 'success'); fetchPosts(true);
    } catch (e) { if (window.UniToast) window.UniToast('Failed.', '', '⚠️', 'warn'); }
    finally { sub.disabled = false; sub.textContent = 'Post'; }
  }
  sub.addEventListener('click', createPost);

  /* ── DELETE/PIN/EDIT ── */
  async function deletePost(id) { if (!isAdmin() || !window._sb || !confirm('Delete?')) return; try { const { error } = await window._sb.from('microblog').delete().eq('id', id); if (error) throw error; posts = posts.filter(p => p.id !== id); render(posts); updateBadge(posts.length); snd('success'); } catch (e) { } }
  async function cancelMicroSchedule(id) { if (!isAdmin() || !window._sb || !confirm('Cancel scheduled publish?')) return; try { const { error } = await window._sb.from('microblog').update({ scheduled_at: null }).eq('id', id); if (error) throw error; var p = posts.find(function(x) { return x.id === id; }); if (p) p.scheduled_at = null; render(posts); snd('success'); if (window.UniToast) window.UniToast('Schedule cancelled.', '', '✅', 'success'); } catch (e) { if (window.UniToast) window.UniToast('Failed.', '', '⚠️', 'warn'); } }
  async function togglePin(id) { if (!isAdmin() || !window._sb) return; const p = posts.find(x => x.id === id); if (!p) return; try { const { error } = await window._sb.from('microblog').update({ pinned: !p.pinned }).eq('id', id); if (error) throw error; p.pinned = !p.pinned; render(posts); snd('tap'); } catch (e) { } }
  function startEdit(id) { const p = posts.find(x => x.id === id); if (!p) return; const el = feed.querySelector(`[data-pid="${id}"] .blog-post-content`); if (!el) return; const orig = el.innerHTML; el.innerHTML = ''; const ta = document.createElement('textarea'); ta.className = 'blog-edit-area'; ta.rows = 3; ta.value = p.content || ''; const acts = document.createElement('div'); acts.className = 'blog-edit-actions'; acts.innerHTML = '<button class="blog-edit-cancel">Cancel</button><button class="blog-edit-save">Save</button>'; el.appendChild(ta); el.appendChild(acts); ta.focus(); acts.querySelector('.blog-edit-cancel').onclick = () => { el.innerHTML = orig; }; acts.querySelector('.blog-edit-save').onclick = async () => { const nc = ta.value.trim(); if (!nc || !window._sb) return; try { const { error } = await window._sb.from('microblog').update({ content: nc }).eq('id', id); if (error) throw error; p.content = nc; render(posts); snd('success'); } catch (e) { } }; }

  /* ── REACTIONS ── */
  async function toggleRx(pid, rk) { if (!window._sb) return; const ur = getJ(REACTIONS_KEY, {}); const my = ur[pid] || []; const was = my.includes(rk); if (was) ur[pid] = my.filter(k => k !== rk); else { if (!ur[pid]) ur[pid] = []; ur[pid].push(rk); } setJ(REACTIONS_KEY, ur); snd('tap'); try { const { data: rx } = await window._sb.rpc('update_microblog_reactions', { p_post_id: pid, p_reaction_key: rk, p_delta: was ? -1 : 1 }); if (rx) { const p = posts.find(x => x.id === pid); if (p) { p.reactions = rx; render(posts); } } } catch (e) { } }

  /* ── BOOKMARKS ── */
  function toggleBM(pid) { let bm = getJ(BOOKMARKS_KEY, []); if (bm.includes(pid)) bm = bm.filter(i => i !== pid); else bm.push(pid); setJ(BOOKMARKS_KEY, bm); snd('tap'); render(posts); }

  /* ── SHARE ── */
  function sharePost(p) { const t = (p.content || '').slice(0, 120) + (p.content && p.content.length > 120 ? '...' : ''); if (navigator.share) navigator.share({ title: 'Delivery Notes', text: t, url: 'https://amrelharony.com' }).catch(() => { }); else navigator.clipboard.writeText(t + '\n—amrelharony.com').then(() => { if (window.UniToast) window.UniToast('Copied.', '', '📋', 'success'); }).catch(() => { }); snd('success'); }

  /* ── COMMENTS ── */
  async function loadComments(pid) {
    if (!window._sb) return [];
    try { const { data } = await window._sb.from('microblog_comments').select('*').eq('post_id', pid).order('created_at', { ascending: true }).limit(50); return data || []; } catch (e) { return []; }
  }
  async function addComment(pid, author, content) {
    if (!window._sb || !content.trim()) return;
    try { await window._sb.from('microblog_comments').insert({ post_id: pid, author: author || 'Visitor', content: content.trim() }); snd('success'); } catch (e) { if (window.UniToast) window.UniToast('Comment failed.', '', '⚠️', 'warn'); }
  }

  /* ── VIEW COUNTER ── */
  const viewedPosts = new Set();
  function trackView(pid) {
    if (viewedPosts.has(pid) || !window._sb) return; viewedPosts.add(pid);
    window._sb.rpc('increment_views', { post_id: pid }).then(function(){}, function(){});
  }

  /* ── EXPORT ── */
  document.getElementById('blogExport').addEventListener('click', () => {
    if (!posts.length) return;
    let md = '# Delivery Notes\n\n';
    posts.forEach(p => {
      md += `## ${new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
      md += (p.content || '') + '\n\n';
      if (p.image_url) md += `![Image](${p.image_url})\n\n`;
      md += '---\n\n';
    });
    const blob = new Blob([md], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'delivery-notes.md'; a.click(); URL.revokeObjectURL(a.href);
    snd('success'); if (window.UniToast) window.UniToast('Exported.', '', '📄', 'success');
  });

  /* ── RENDER ── */
  function render(ps) {
    if (!ps.length) { feed.innerHTML = '<div style="text-align:center;color:#8b949e;font-size:11px;padding:20px">No updates yet.</div>'; return; }
    const admin = isAdmin(), bm = getJ(BOOKMARKS_KEY, []), ur = getJ(REACTIONS_KEY, {});
    let list = ps;
    // Apply filter
    if (activeFilter === 'bookmarked') list = list.filter(p => bm.includes(p.id));
    else if (activeFilter === 'pinned') list = list.filter(p => p.pinned);
    else if (activeFilter === 'media') list = list.filter(p => p.image_url);
    else if (activeFilter === 'polls') list = list.filter(p => p.poll);
    if (sq) list = list.filter(p => (p.content || '').toLowerCase().includes(sq));
    if (!list.length) { feed.innerHTML = '<div style="text-align:center;color:#8b949e;font-size:11px;padding:20px">' + (activeFilter !== 'all' ? 'No ' + activeFilter + ' posts.' : 'No matching posts.') + '</div>'; return; }
    if (ps.length !== lastConfettiCount) { maybeConfetti(ps.length); lastConfettiCount = ps.length; }
    list = [...list].sort((a, b) => (a.pinned && !b.pinned) ? -1 : (!a.pinned && b.pinned) ? 1 : 0);

    let html = list.map((p, i) => {
      const time = relTime(p.created_at), ch = p.content ? fmtContent(p.content) : '', pin = p.pinned ? 'pinned' : '', bmk = bm.includes(p.id) ? 'bookmarked' : '', myR = ur[p.id] || [], rx = p.reactions || {};
      let img = ''; if (p.image_url) img = `<img class="blog-post-img" src="${esc(p.image_url)}" alt="Post image" loading="lazy" onclick="window._blogLB(this.src)">`;
      const activeRx = RX.filter(r => (rx[r.key] || 0) > 0 || myR.includes(r.key));
      let rxH = activeRx.map(r => `<button class="blog-reaction-btn ${myR.includes(r.key) ? 'active' : ''}" data-p="${p.id}" data-rk="${r.key}" title="${r.label}">${r.emoji} <span class="rcount">${rx[r.key] || 0}</span></button>`).join('');
      rxH += `<button class="blog-reaction-add" data-pf="${p.id}" title="React">+</button><div class="blog-reaction-picker" id="pk-${p.id}">${RX.map(r => `<button data-p="${p.id}" data-rk="${r.key}" title="${r.label}">${r.emoji}</button>`).join('')}</div>`;
      let adm = ''; if (admin) { var schedBadge = (p.scheduled_at && new Date(p.scheduled_at) > new Date()) ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:#a855f7;border:1px solid rgba(168,85,247,.3);padding:2px 6px;margin-right:4px" title="Scheduled: ' + esc(new Date(p.scheduled_at).toLocaleString()) + '">🕐 ' + esc(new Date(p.scheduled_at).toLocaleString()) + '</span>' : ''; adm = schedBadge + `<button class="blog-action-btn" data-edit="${p.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>` + ((p.scheduled_at && new Date(p.scheduled_at) > new Date()) ? `<button class="blog-action-btn" data-unsched="${p.id}" title="Cancel schedule" style="color:#f59e0b"><i class="fa-solid fa-clock"></i></button>` : '') + `<button class="blog-action-btn" data-pin="${p.id}" title="${p.pinned ? 'Unpin' : 'Pin'}"><i class="fa-solid fa-thumbtack"></i></button><button class="blog-action-btn delete-btn" data-del="${p.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`; }
      const views = p.views ? `<span class="blog-views">👁 ${p.views}</span>` : '';
      const rtime = p.content ? `<span class="blog-reading-time">· ${readingTime(p.content)}</span>` : '';
      // TTS + Focus buttons
      const ttsBtn = p.content ? `<button class="blog-tts-btn" data-tts="${p.id}" title="Read aloud"><i class="fa-solid fa-volume-high"></i></button>` : '';
      const focBtn = `<button class="blog-focus-btn" data-focus="${p.id}" title="Focus mode"><i class="fa-solid fa-expand"></i></button>`;
      // Poll rendering
      let pollH = ''; if (p.poll && p.poll.options) { const voted = getJ(POLL_KEY, {}); const myVote = voted[p.id]; const total = p.poll.options.reduce((s, o) => s + (o.votes || 0), 0); pollH = `<div class="blog-poll"><div class="blog-poll-q">${esc(p.poll.question || '')}</div>${p.poll.options.map((o, oi) => { const pct = total ? Math.round((o.votes || 0) / total * 100) : 0; const isVoted = myVote === oi; return `<div class="blog-poll-opt ${myVote != null ? 'voted' : ''}" data-poll-pid="${p.id}" data-poll-idx="${oi}"><div class="poll-bar" style="width:${myVote != null ? pct : 0}%"></div><span class="poll-label">${esc(o.text)} ${isVoted ? '✓' : ''}</span><span class="poll-pct">${myVote != null ? pct + '%' : ''}</span></div>`; }).join('')}<div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#6b7a90;margin-top:6px">${total} vote${total !== 1 ? 's' : ''}</div></div>`; }
      return `<div class="blog-post ${pin} ${bmk}" data-pid="${p.id}" tabindex="0" role="article" aria-label="Post from ${relTime(p.created_at)}" style="transition-delay:${Math.min(i * 40, 300)}ms">
        <div class="blog-post-content">${ch}</div>${img}${pollH}
        <div class="blog-post-reactions">${rxH}</div>
        <div class="blog-post-meta"><span title="${new Date(p.created_at).toLocaleString()}">${time}${rtime}${views}</span><div class="blog-post-actions">${ttsBtn}${focBtn}<button class="blog-copy-btn" data-copy="${p.id}" title="Copy text"><i class="fa-solid fa-copy"></i></button><button class="blog-action-btn ${bm.includes(p.id) ? 'bookmark-active' : ''}" data-bm="${p.id}" title="Bookmark"><i class="fa-solid fa-bookmark"></i></button><button class="blog-action-btn" data-share="${p.id}" title="Share"><i class="fa-solid fa-share-from-square"></i></button><button class="blog-action-btn" data-cmt="${p.id}" title="Comments"><i class="fa-solid fa-comment"></i></button>${adm}</div></div>
        <div class="blog-comments-section" id="cms-${p.id}" style="display:none"><div class="blog-comments-list" id="cl-${p.id}"></div><div class="blog-comment-form"><input class="blog-comment-input" id="ci-${p.id}" placeholder="Leave a comment..." maxlength="200" aria-label="Write a comment"><button class="blog-comment-send" data-csend="${p.id}">Send</button></div></div>
      </div>`;
    }).join('');
    if (hasMore && !sq) html += '<div class="blog-load-more" id="blogLM">[ LOAD MORE ]</div>';
    feed.innerHTML = html;
    requestAnimationFrame(() => feed.querySelectorAll('.blog-post').forEach(el => el.classList.add('visible')));
    // IntersectionObserver for view counting
    if ('IntersectionObserver' in window) { const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { trackView(e.target.dataset.pid); obs.unobserve(e.target); } }); }, { root: feed, threshold: .5 }); feed.querySelectorAll('.blog-post').forEach(el => obs.observe(el)); }
    const lm = document.getElementById('blogLM'); if (lm) lm.addEventListener('click', () => fetchPosts(false));
  }

  /* ── FEED CLICK DELEGATION ── */
  feed.addEventListener('click', e => {
    const t = e.target.closest('[data-rk]'); if (t && t.dataset.p) { feed.querySelectorAll('.blog-reaction-picker.show').forEach(p => p.classList.remove('show')); toggleRx(t.dataset.p, t.dataset.rk); return; }
    const ab = e.target.closest('.blog-reaction-add'); if (ab) { const pk = document.getElementById('pk-' + ab.dataset.pf); if (pk) { feed.querySelectorAll('.blog-reaction-picker.show').forEach(p => { if (p !== pk) p.classList.remove('show'); }); pk.classList.toggle('show'); } return; }
    const bm = e.target.closest('[data-bm]'); if (bm) { toggleBM(bm.dataset.bm); return; }
    const sh = e.target.closest('[data-share]'); if (sh) { const p = posts.find(x => x.id === sh.dataset.share); if (p) sharePost(p); return; }
    const del = e.target.closest('[data-del]'); if (del) { deletePost(del.dataset.del); return; }
    const pin = e.target.closest('[data-pin]'); if (pin) { togglePin(pin.dataset.pin); return; }
    const unsched = e.target.closest('[data-unsched]'); if (unsched) { cancelMicroSchedule(unsched.dataset.unsched); return; }
    const edit = e.target.closest('[data-edit]'); if (edit) { startEdit(edit.dataset.edit); return; }
    const ht = e.target.closest('.hashtag'); if (ht) { srch.value = '#' + ht.dataset.tag; sq = '#' + ht.dataset.tag.toLowerCase(); render(posts); return; }
    // Copy text
    const cp = e.target.closest('[data-copy]'); if (cp) { const p = posts.find(x => x.id === cp.dataset.copy); if (p && p.content) { navigator.clipboard.writeText(p.content).then(() => { if (window.UniToast) window.UniToast('Copied.', '', '📋', 'success'); snd('success'); }).catch(() => { }); } return; }
    // TTS
    const tts = e.target.closest('[data-tts]'); if (tts) { const p = posts.find(x => x.id === tts.dataset.tts); if (p && p.content) readAloud(p.content, tts); return; }
    // Focus mode
    const foc = e.target.closest('[data-focus]'); if (foc) { const p = posts.find(x => x.id === foc.dataset.focus); if (p) openFocus(p); return; }
    // Poll vote
    const pv = e.target.closest('[data-poll-pid]'); if (pv && !pv.classList.contains('voted')) { votePoll(pv.dataset.pollPid, parseInt(pv.dataset.pollIdx)); return; }
    // Comments toggle
    const cmt = e.target.closest('[data-cmt]'); if (cmt) { const sec = document.getElementById('cms-' + cmt.dataset.cmt); if (sec) { const vis = sec.style.display !== 'none'; sec.style.display = vis ? 'none' : 'block'; if (!vis) loadComments(cmt.dataset.cmt).then(cmts => { const cl = document.getElementById('cl-' + cmt.dataset.cmt); cl.innerHTML = cmts.length ? cmts.map(c => `<div class="blog-comment"><span class="blog-comment-author">${esc(c.author)}<span class="blog-comment-time">${relTime(c.created_at)}</span></span><div>${esc(c.content)}</div></div>`).join('') : '<div style="font-size:10px;color:#6b7a90">No comments yet.</div>'; }); } return; }
    // Comment send
    const cs = e.target.closest('[data-csend]'); if (cs) { const pid = cs.dataset.csend; const ci = document.getElementById('ci-' + pid); if (ci && ci.value.trim()) { const name = localStorage.getItem(COMMENTER_KEY) || prompt('Your name:') || 'Visitor'; localStorage.setItem(COMMENTER_KEY, name); addComment(pid, name, ci.value).then(() => { ci.value = ''; loadComments(pid).then(cmts => { const cl = document.getElementById('cl-' + pid); cl.innerHTML = cmts.map(c => `<div class="blog-comment"><span class="blog-comment-author">${esc(c.author)}<span class="blog-comment-time">${relTime(c.created_at)}</span></span><div>${esc(c.content)}</div></div>`).join(''); }); }); } return; }
    feed.querySelectorAll('.blog-reaction-picker.show').forEach(p => p.classList.remove('show'));
  });

  /* ── POLLS ── */
  async function votePoll(pid, idx) {
    const voted = getJ(POLL_KEY, {}); if (voted[pid] != null) return; voted[pid] = idx; setJ(POLL_KEY, voted); snd('tap');
    const p = posts.find(x => x.id === pid); if (!p || !p.poll) return;
    p.poll.options[idx].votes = (p.poll.options[idx].votes || 0) + 1;
    if (window._sb) { try { const { data: poll } = await window._sb.rpc('vote_microblog_poll', { p_post_id: pid, p_option_idx: idx }); if (poll) p.poll = poll; } catch (e) { } }
    render(posts);
  }

  /* ── ADMIN STATS ── */
  const statsPanel = document.getElementById('blogStats');
  const statsGrid = document.getElementById('blogStatsGrid');
  document.getElementById('blogStatsBtn').addEventListener('click', () => {
    statsPanel.classList.toggle('show');
    if (statsPanel.classList.contains('show')) renderStats();
  });
  function renderStats() {
    if (!posts.length) { statsGrid.innerHTML = '<div style="color:#6b7a90;font-size:10px">No data yet.</div>'; return; }
    const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
    const totalRx = posts.reduce((s, p) => { const rx = p.reactions || {}; return s + Object.values(rx).reduce((a, b) => a + b, 0); }, 0);
    const avgLen = Math.round(posts.reduce((s, p) => s + (p.content || '').length, 0) / posts.length);
    statsGrid.innerHTML = `<div class="blog-stat-item"><div class="blog-stat-num">${posts.length}</div><div class="blog-stat-label">Posts</div></div><div class="blog-stat-item"><div class="blog-stat-num">${totalViews}</div><div class="blog-stat-label">Views</div></div><div class="blog-stat-item"><div class="blog-stat-num">${totalRx}</div><div class="blog-stat-label">Reactions</div></div><div class="blog-stat-item"><div class="blog-stat-num">${avgLen}</div><div class="blog-stat-label">Avg Chars</div></div>`;
  }

  /* ── SWIPE GESTURES ── */
  let touchStartX = 0, touchStartY = 0, touchPost = null;
  feed.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; touchPost = e.target.closest('.blog-post'); }, { passive: true });
  feed.addEventListener('touchend', e => {
    if (!touchPost) return; const dx = e.changedTouches[0].clientX - touchStartX; const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      const pid = touchPost.dataset.pid;
      if (dx > 0) { toggleRx(pid, 'heart'); touchPost.style.transition = 'transform .2s'; touchPost.style.transform = 'translateX(6px)'; setTimeout(() => { touchPost.style.transform = ''; }, 200); }
      else { toggleBM(pid); }
    } touchPost = null;
  }, { passive: true });

  /* ── DEEP LINKS ── */
  function checkDeepLink() { const h = location.hash; if (h.startsWith('#post-')) { const pid = h.slice(6); if (!ov.classList.contains('show')) openBlog(pid); else scrollToPost(pid); } }
  window.addEventListener('hashchange', checkDeepLink);
  setTimeout(checkDeepLink, 2000);

  /* ── LIGHTBOX ── */
  window._blogLB = src => { const lb = document.createElement('div'); lb.className = 'blog-lightbox'; lb.innerHTML = '<img src="' + src + '" alt="Full size">'; lb.onclick = () => { lb.classList.remove('show'); setTimeout(() => lb.remove(), 300); }; document.body.appendChild(lb); requestAnimationFrame(() => lb.classList.add('show')); };

  /* ── BADGE ── */
  let badge = null;
  function updateBadge(n) { const btn = document.getElementById('blogBtn'); if (!btn) return; if (n > 0) { if (!badge) { badge = document.createElement('span'); badge.className = 'blog-badge'; btn.appendChild(badge); } badge.textContent = n > 99 ? '99+' : n; badge.style.display = 'flex'; } else if (badge) badge.style.display = 'none'; }
  function flashBadge() { if (badge) { badge.classList.remove('flash'); void badge.offsetWidth; badge.classList.add('flash'); } }
  if (window._sb) window._sb.from('microblog').select('id', { count: 'exact', head: true }).then(({ count }) => { if (typeof count === 'number') updateBadge(count); }).catch(() => { });

  /* ── KEYBOARD NAV ── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    
    if (!ov.classList.contains('show')) return;
    const items = feed.querySelectorAll('.blog-post'); if (!items.length) return;
    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx + 1, items.length - 1); items.forEach(el => el.classList.remove('focused-post')); items[focusIdx].classList.add('focused-post'); items[focusIdx].focus(); items[focusIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0); items.forEach(el => el.classList.remove('focused-post')); items[focusIdx].classList.add('focused-post'); items[focusIdx].focus(); items[focusIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });

  /* ── REUSABLE POST CREATION (used by admin dialog too) ── */
  window._createMicroblogPost = async function(content, imageFile, scheduledAt, linkedinShare) {
    if (!window._sb) return { success: false, error: 'Supabase not available' };
    if (!content && !imageFile) return { success: false, error: 'Content required' };
    try {
      var img = null;
      if (imageFile) {
        var ext = imageFile.name.split('.').pop() || 'jpg';
        var fn = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var ur = await window._sb.storage.from(BUCKET).upload(fn, imageFile, { cacheControl: '3600', upsert: false });
        if (ur.error) throw ur.error;
        var pu = window._sb.storage.from(BUCKET).getPublicUrl(ur.data.path);
        img = pu.data.publicUrl;
      }
      var row = { content: content || '', published: true };
      if (img) row.image_url = img;
      var pollMatch = (content || '').match(/\[poll:(.+?)\|(.+?)\]/);
      if (pollMatch) {
        var parts = pollMatch[2].split('|');
        row.poll = { question: pollMatch[1], options: parts.map(function(o) { return { text: o.trim(), votes: 0 }; }) };
        row.content = (content || '').replace(/\[poll:.+?\]/, '').trim() || pollMatch[1];
      }
      if (scheduledAt) {
        row.scheduled_at = scheduledAt;
        row.published = false;
      }
      row.linkedin_posted = linkedinShare ? false : true;
      var res = await window._sb.from('microblog').insert(row);
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Insert failed' };
    }
  };
  window._refreshMicroblogFeed = function() { fetchPosts(true); };

  window._saveMicroblogDraft = async function(content, imageFile, existingId) {
    if (!window._sb) return { success: false, error: 'Supabase not available' };
    if (!content && !imageFile) return { success: false, error: 'Content required' };
    try {
      var img = null;
      if (imageFile) {
        var ext = imageFile.name.split('.').pop() || 'jpg';
        var fn = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var ur = await window._sb.storage.from(BUCKET).upload(fn, imageFile, { cacheControl: '3600', upsert: false });
        if (ur.error) throw ur.error;
        img = window._sb.storage.from(BUCKET).getPublicUrl(ur.data.path).data.publicUrl;
      }
      var row = { content: content || '', published: false, linkedin_posted: true };
      if (img) row.image_url = img;
      if (existingId) {
        var res = await window._sb.from('microblog').update(row).eq('id', existingId);
        if (res.error) throw res.error;
      } else {
        var res2 = await window._sb.from('microblog').insert(row);
        if (res2.error) throw res2.error;
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Save failed' };
    }
  };

  window._fetchMicroblogCloudDrafts = async function() {
    if (!window._sb) return [];
    try {
      var r = await window._sb.from('microblog').select('id,content,image_url,created_at').eq('published', false).is('scheduled_at', null).order('created_at', { ascending: false });
      if (r.error) throw r.error;
      return r.data || [];
    } catch (e) { return []; }
  };

  window._publishMicroblogDraft = async function(id) {
    if (!window._sb) return { success: false };
    try {
      var res = await window._sb.from('microblog').update({ published: true, linkedin_posted: false }).eq('id', id);
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  window._deleteMicroblogPost = async function(id) {
    if (!window._sb) return { success: false };
    try {
      var res = await window._sb.from('microblog').delete().eq('id', id);
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  /* ── GLOBAL API ── */
  window.openMicroblog = openBlog; window.closeMicroblog = closeBlog;
  if (window.TermCmds) { window.TermCmds.blog = () => { setTimeout(openBlog, 200); return '<span class="term-green">📰 Opening Delivery Notes v6...</span>'; }; window.TermCmds.thoughts = window.TermCmds.blog; if (window.TermCmds._meta) window.TermCmds._meta['blog'] = { cat: 'APPS', desc: 'Read Amr\'s microblog thoughts (v6)' }; }

  /* ── INLINE FEED ── */
  const inlineFeed = document.getElementById('inlineBlogFeed');
  function renderInline(ps) {
    if (!inlineFeed) return;
    if (!ps || !ps.length) { inlineFeed.innerHTML = '<div style="text-align:center;color:#6b7a90;font-size:11px;padding:16px;font-family:\'JetBrains Mono\',monospace">No posts yet. Check back soon.</div>'; return; }
    const sorted = [...ps].sort((a, b) => (a.pinned && !b.pinned) ? -1 : (!a.pinned && b.pinned) ? 1 : new Date(b.created_at) - new Date(a.created_at));
    const show = sorted.slice(0, 5);
    inlineFeed.innerHTML = show.map((p, i) => {
      const ch = p.content ? fmtContent(p.content) : '';
      const pin = p.pinned ? 'pinned' : '';
      let img = ''; if (p.image_url) img = `<img class="blog-inline-img" src="${esc(p.image_url)}" alt="" loading="lazy">`;
      const rx = p.reactions || {};
      const rxSum = Object.entries(rx).filter(([, v]) => v > 0).map(([k, v]) => { const r = RX.find(x => x.key === k); return r ? r.emoji + v : ''; }).join(' ');
      return `<div class="blog-inline-post ${pin}" data-inline-pid="${p.id}" style="transition-delay:${i * 60}ms">
        <div class="blog-inline-content">${ch}</div>${img}
        <div class="blog-inline-meta"><span>${relTime(p.created_at)} · ${readingTime(p.content)}</span><span class="blog-inline-reactions">${rxSum}</span></div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => inlineFeed.querySelectorAll('.blog-inline-post').forEach(el => el.classList.add('visible')));
  }
  if (inlineFeed) {
    // Show skeleton while loading
    inlineFeed.innerHTML = [0, 1, 2].map(() => '<div class="blog-skeleton" style="margin-bottom:0"><div class="blog-skel-line"></div><div class="blog-skel-line"></div><div class="blog-skel-line"></div></div>').join('');
    // Fetch and render
    if (window._sb) {
      window._sb.from('microblog').select('*').order('pinned', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).range(0, 4)
        .then(({ data }) => { renderInline(data || []); })
        .catch(() => { try { const c = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); renderInline(c.slice(0, 5)); } catch (e) { renderInline([]); } });
    } else {
      try { const c = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); renderInline(c.slice(0, 5)); } catch (e) { renderInline([]); }
    }
    // Click any inline post -> open overlay
    inlineFeed.addEventListener('click', e => { const p = e.target.closest('[data-inline-pid]'); if (p) openBlog(p.dataset.inlinePid); });
  }
})();
