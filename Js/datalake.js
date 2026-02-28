// datalake.js — OPFS Data Lake Controller
// Async SQLite storage via OPFS with localStorage fallback and write coalescing.
(function() {
  'use strict';

  const COALESCE_MS = 50;
  let worker = null;
  let ready = false;
  let msgId = 0;
  const pending = new Map();
  let batchQueue = [];
  let batchTimer = null;
  let mode = 'pending'; // 'opfs' | 'fallback' | 'pending'
  let initPromise = null;
  let destroyed = false;

  // ═══════════════════════════════════════════════════
  // FEATURE DETECTION
  // ═══════════════════════════════════════════════════
  function supportsOPFS() {
    return typeof Worker !== 'undefined' &&
           typeof navigator !== 'undefined' &&
           navigator.storage &&
           typeof navigator.storage.getDirectory === 'function';
  }

  // ═══════════════════════════════════════════════════
  // WORKER COMMUNICATION
  // ═══════════════════════════════════════════════════
  function send(msg) {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject(new Error('Lake destroyed'));
      if (!worker) return reject(new Error('No worker'));
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...msg, id });
    });
  }

  function onWorkerMessage(e) {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  }

  // ═══════════════════════════════════════════════════
  // WRITE COALESCING
  // ═══════════════════════════════════════════════════
  function flushBatch() {
    batchTimer = null;
    if (!batchQueue.length || !ready) return Promise.resolve();
    const ops = batchQueue.splice(0);
    return send({ type: 'batch', ops }).catch(() => {});
  }

  function enqueue(op) {
    batchQueue.push(op);
    if (!batchTimer) batchTimer = setTimeout(flushBatch, COALESCE_MS);
  }

  // ═══════════════════════════════════════════════════
  // LOCALSTORAGE FALLBACK
  // ═══════════════════════════════════════════════════
  const fallback = {
    _key(store, key) { return '_lake_' + store + '_' + key; },

    get(store, key) {
      try {
        const raw = localStorage.getItem(this._key(store, key));
        return raw !== null ? raw : null;
      } catch (_) { return null; }
    },

    put(store, key, value) {
      try { localStorage.setItem(this._key(store, key), typeof value === 'string' ? value : JSON.stringify(value)); } catch (_) {}
    },

    getAll(store) {
      const prefix = '_lake_' + store + '_';
      const rows = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith(prefix)) {
            rows.push({ key: k.slice(prefix.length), value: localStorage.getItem(k) });
          }
        }
      } catch (_) {}
      return rows;
    },

    del(store, key) {
      try { localStorage.removeItem(this._key(store, key)); } catch (_) {}
    },

    exec() { return { rows: [], columns: [], error: 'SQL not available in fallback mode' }; },
    exportDB() { return null; },
    stats() {
      let count = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          if (localStorage.key(i).startsWith('_lake_')) count++;
        }
      } catch (_) {}
      return { kvCount: count, scoreCount: 0, eventCount: 0, stores: [], dbSize: 0, mode: 'fallback' };
    }
  };

  // ═══════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════
  function initialize() {
    if (initPromise) return initPromise;

    if (!supportsOPFS()) {
      mode = 'fallback';
      ready = true;
      console.log('%c🗄️ Data Lake: localStorage fallback', 'background:#6b7a90;color:#fff;padding:2px 5px;border-radius:3px;');
      initPromise = Promise.resolve();
      return initPromise;
    }

    initPromise = new Promise((resolve) => {
      try {
        worker = new Worker('Js/datalake-worker.js', { type: 'module' });
        worker.onmessage = onWorkerMessage;
        worker.onerror = (err) => {
          console.warn('Data Lake worker error, falling back to localStorage:', err.message || err);
          mode = 'fallback';
          ready = true;
          worker = null;
          for (const [, { reject: rj }] of pending) rj(new Error('Worker error'));
          pending.clear();
          resolve();
        };

        send({ type: 'init' }).then(() => {
          mode = 'opfs';
          ready = true;
          console.log('%c🗄️ Data Lake: OPFS + SQLite active', 'background:#22c55e;color:#fff;padding:2px 5px;border-radius:3px;');

          if (!localStorage.getItem('_lake_migrated')) {
            migrateFromLocalStorage().then(() => {
              localStorage.setItem('_lake_migrated', '1');
            }).catch(() => {});
          }
          resolve();
        }).catch((err) => {
          console.warn('Data Lake init failed, falling back:', err.message || err);
          mode = 'fallback';
          ready = true;
          if (worker) { worker.terminate(); worker = null; }
          resolve();
        });

        setTimeout(() => {
          if (!ready) {
            console.warn('Data Lake init timeout, falling back');
            mode = 'fallback';
            ready = true;
            if (worker) { worker.terminate(); worker = null; }
            for (const [, { reject: rj }] of pending) rj(new Error('Init timeout'));
            pending.clear();
            resolve();
          }
        }, 10000);
      } catch (e) {
        mode = 'fallback';
        ready = true;
        resolve();
      }
    });
    return initPromise;
  }

  // ═══════════════════════════════════════════════════
  // MIGRATION
  // ═══════════════════════════════════════════════════
  async function migrateFromLocalStorage() {
    const data = { profile: {}, prefs: {}, meta: {}, cache: {}, arcade: {} };
    const keyMap = {
      'v_dna': (v) => {
        try {
          const obj = JSON.parse(v);
          for (const [k, val] of Object.entries(obj)) {
            data.profile[k] = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }
        } catch (_) {}
      },
      'theme': (v) => { data.prefs.theme = v; },
      'audio_enabled': (v) => { data.prefs.audio_enabled = v; },
      'zenMode': (v) => { data.prefs.zenMode = v; },
      'cyberpunkMode': (v) => { data.prefs.cyberpunkMode = v; },
      'ambient_theme': (v) => { data.prefs.ambient_theme = v; },
      'shortcuts_seen': (v) => { data.prefs.shortcuts_seen = v; },
      'visited': (v) => { data.meta.visited = v; },
      'streak': (v) => { data.meta.streak = v; },
      'lastVisit': (v) => { data.meta.lastVisit = v; },
      'vc': (v) => { data.meta.vc = v; },
      'arcade_player_name': (v) => { data.meta.arcade_player_name = v; },
      'cairoWeather': (v) => { data.cache.cairoWeather = v; },
      'mktData': (v) => { data.cache.mktData = v; },
      '_prefetchMarkov': (v) => { data.cache._prefetchMarkov = v; },
      'amros_history': (v) => { data.cache.amros_history = v; },
      'cmd_mru': (v) => { data.cache.cmd_mru = v; },
    };

    for (const [lsKey, handler] of Object.entries(keyMap)) {
      try {
        const val = localStorage.getItem(lsKey);
        if (val !== null) handler(val);
      } catch (_) {}
    }

    try {
      const arcadeRaw = localStorage.getItem('arcade_state');
      if (arcadeRaw) {
        const arc = JSON.parse(arcadeRaw);
        data.arcade.baseGame = arc.baseGame || '';
        data.arcade.unlockedGames = JSON.stringify(arc.unlockedGames || []);
        data.arcade.bossBeaten = String(arc.bossBeaten || false);
        data.arcade.totalPlays = String(arc.totalPlays || 0);
        if (arc.highScores) {
          data._scores = arc.highScores;
          data._player = localStorage.getItem('arcade_player_name') || 'Anon';
        }
      }
    } catch (_) {}

    return send({ type: 'migrate', data });
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════
  const lake = {
    get isReady() { return ready; },
    get mode() { return mode; },

    async waitReady() {
      if (ready) return;
      await initPromise;
    },

    async get(store, key) {
      if (mode === 'fallback') return fallback.get(store, key);
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.get(store, key);
      return send({ type: 'get', store, key });
    },

    put(store, key, value) {
      if (mode === 'fallback') { fallback.put(store, key, value); return; }
      if (!ready) { fallback.put(store, key, value); return; }
      enqueue({ type: 'put', store, key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    },

    putImmediate(store, key, value) {
      if (mode === 'fallback') { fallback.put(store, key, value); return Promise.resolve(); }
      if (!ready) { fallback.put(store, key, value); return Promise.resolve(); }
      return send({ type: 'put', store, key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    },

    async getAll(store) {
      if (mode === 'fallback') return fallback.getAll(store);
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.getAll(store);
      return send({ type: 'getAll', store });
    },

    del(store, key) {
      if (mode === 'fallback') { fallback.del(store, key); return; }
      if (!ready) return;
      enqueue({ type: 'delete', store, key });
    },

    recordScore(game, score, player) {
      if (mode === 'fallback') return;
      if (!ready) return;
      enqueue({ type: 'score', game, score, player: player || 'Anon' });
    },

    logEvent(eventType, data) {
      if (mode === 'fallback') return;
      if (!ready) return;
      enqueue({ type: 'event', eventType, data });
    },

    async exec(sql, params) {
      if (mode === 'fallback') return fallback.exec();
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.exec();
      return send({ type: 'exec', sql, params });
    },

    async stats() {
      if (mode === 'fallback') return fallback.stats();
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.stats();
      const s = await send({ type: 'stats' });
      s.mode = 'opfs';
      return s;
    },

    async exportDB() {
      if (mode === 'fallback') return null;
      if (!ready) await initPromise;
      if (mode === 'fallback') return null;
      if (batchQueue.length) await flushBatch();
      return send({ type: 'export' });
    },

    destroy() {
      destroyed = true;
      if (batchTimer) clearTimeout(batchTimer);
      for (const [, { reject }] of pending) reject(new Error('Lake destroyed'));
      pending.clear();
      if (batchQueue.length && worker) {
        try { worker.postMessage({ id: ++msgId, type: 'batch', ops: batchQueue.splice(0) }); } catch (_) {}
      }
      if (worker) { worker.terminate(); worker = null; }
      ready = false;
    }
  };

  window._lake = lake;

  initialize();

  console.log('%c🗄️ Data Lake loading...', 'background:#6366f1;color:#fff;padding:2px 5px;border-radius:3px;');
})();
