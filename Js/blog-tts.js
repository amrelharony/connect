// blog-tts.js — Voice narration / TTS module
(function() {
    'use strict';
    var B = window._Blog;
    var snd = B.snd;

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

    // Register
    B.initTTS = initTTS;
    B.destroyTTS = destroyTTS;
})();
