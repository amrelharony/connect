// amros-telemetry.js — Centralized error telemetry for AmrOS
// Buffers errors and flushes to Data Lake (OPFS/SQLite) in batches.
(function() {
  'use strict';
  var buffer = [];
  var FLUSH_INTERVAL = 30000;
  var MAX_BUFFER = 50;

  window.AmrOS = window.AmrOS || {};
  window.AmrOS.logError = function(module, error, severity) {
    var entry = {
      module: module,
      msg: (error && error.message) || String(error),
      stack: (error && error.stack) || '',
      severity: severity || 'warn',
      ts: Date.now(),
      ua: navigator.userAgent.slice(0, 120)
    };
    console.error('[' + module + ']', error);
    buffer.push(entry);
    if (buffer.length >= MAX_BUFFER) flush();
  };

  function flush() {
    if (!buffer.length) return;
    var batch = buffer.splice(0);
    if (window._lake && window._lake.isReady) {
      batch.forEach(function(e) {
        window._lake.logEvent('sys_error', e);
      });
    }
  }

  setInterval(flush, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', flush);
})();
