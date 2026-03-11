// ai3d.js — Backward-compatible shim
// Loads all ai3d sub-modules for anything that still references this file directly.
(function() {
  'use strict';
  function _ls(src) {
    return new Promise(function(resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script'); s.src = src;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  _ls('Js/ai3d-core.js')
    .then(function() { return _ls('Js/kb-docs.js').catch(function(){}); })
    .then(function() {
      return Promise.all([
        _ls('Js/chatbot-llm.js'),
        _ls('Js/book-ar-viewer.js'),
        _ls('Js/visualizer-data-mesh.js'),
        _ls('Js/visualizer-globe.js')
      ]);
    })
    .then(function() {
      console.log('%c\ud83e\udde9 AI3D shim: all modules loaded', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
    })
    .catch(function(err) { console.warn('AI3D shim load error:', err); });
})();
