(function() {
    'use strict';
    var B = window._Blog;
    var snd = B.snd;

    // Private state (CM6 variables)
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
            { key: 'Mod-s', run: function() { if (typeof B._cmSaveHandler === 'function') B._cmSaveHandler(); return true; } },
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
            details: () => insertBlock('<details>\n<summary>Click to expand</summary>\n\nHidden content goes here.\n\n</details>')
        };
        if (formats[fmt]) {
            formats[fmt]();
            snd('tap');
        }
    }

    // Register all public functions on B
    B._loadCM6 = _loadCM6;
    B._initCM6 = _initCM6;
    B._destroyCM6 = _destroyCM6;
    B._switchCM6Theme = _switchCM6Theme;
    B._cmSaveHandler = null;
    Object.defineProperty(B, '_cmView', { get: function() { return _cmView; }, configurable: true });
    B._getEditorValue = _getEditorValue;
    B._setEditorValue = _setEditorValue;
    B._getEditorSelection = _getEditorSelection;
    B._editorDispatch = _editorDispatch;
    B.insertAtCursor = insertAtCursor;
    B.wrapSelection = wrapSelection;
    B.insertLineFormat = insertLineFormat;
    B.insertBlock = insertBlock;
    B.insertFormat = insertFormat;
})();
