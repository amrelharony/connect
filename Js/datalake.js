// datalake.js — OPFS Data Lake Controller
// Async SQLite storage via OPFS with localStorage fallback, write coalescing,
// and BroadcastChannel leader election for multi-tab OPFS lock safety.
(function() {
  'use strict';

  const COALESCE_MS = 50;
  const ELECT_WAIT_MS = 200;
  const HEARTBEAT_MS = 3000;
  const HEARTBEAT_TIMEOUT_MS = 6000;
  const BC_NAME = 'amr-lake-v1';

  let worker = null;
  let ready = false;
  let msgId = 0;
  const pending = new Map();
  let batchQueue = [];
  let batchTimer = null;
  let mode = 'pending'; // 'opfs' | 'proxy' | 'fallback' | 'pending'
  let initPromise = null;
  let destroyed = false;

  const _tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  let _isMaster = false;
  let _bc = null;
  const _pendingRemote = new Map();
  let _heartbeatInterval = null;
  let _heartbeatWatchdog = null;
  let _lastHeartbeat = 0;

  // ═══════════════════════════════════════════════════
  // FEATURE DETECTION
  // ═══════════════════════════════════════════════════
  function supportsOPFS() {
    return typeof Worker !== 'undefined' &&
           typeof navigator !== 'undefined' &&
           navigator.storage &&
           typeof navigator.storage.getDirectory === 'function';
  }

  function supportsBroadcastChannel() {
    return typeof BroadcastChannel !== 'undefined';
  }

  // ═══════════════════════════════════════════════════
  // WORKER COMMUNICATION (master only)
  // ═══════════════════════════════════════════════════
  function send(msg) {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject(new Error('Lake destroyed'));
      if (!worker) return reject(new Error('No worker'));
      const id = ++msgId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Lake timeout')); }, 30000);
      pending.set(id, { resolve(v) { clearTimeout(timer); resolve(v); }, reject(e) { clearTimeout(timer); reject(e); } });
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
  // PROXY COMMUNICATION (secondary tabs)
  // ═══════════════════════════════════════════════════
  function proxyRequest(msg) {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject(new Error('Lake destroyed'));
      if (!_bc) return reject(new Error('No channel'));
      const id = _tabId + ':' + (++msgId);
      const timer = setTimeout(() => { _pendingRemote.delete(id); reject(new Error('Proxy timeout')); }, 30000);
      _pendingRemote.set(id, { resolve(v) { clearTimeout(timer); resolve(v); }, reject(e) { clearTimeout(timer); reject(e); } });
      _bc.postMessage({ t: 'lake:request', from: _tabId, id, msg });
    });
  }

  function proxyEnqueue(op) {
    batchQueue.push(op);
    if (!batchTimer) batchTimer = setTimeout(proxyFlush, COALESCE_MS);
  }

  function proxyFlush() {
    batchTimer = null;
    if (!batchQueue.length || !ready) return;
    const ops = batchQueue.splice(0);
    proxyRequest({ type: 'batch', ops }).catch((e) => {
      if (window.AmrOS) window.AmrOS.logError('DataLake', 'proxyFlush: ' + ((e && e.message) || e));
    });
  }

  // ═══════════════════════════════════════════════════
  // WRITE COALESCING (master)
  // ═══════════════════════════════════════════════════
  function flushBatch() {
    batchTimer = null;
    if (!batchQueue.length || !ready) return Promise.resolve();
    const ops = batchQueue.splice(0);
    return send({ type: 'batch', ops }).catch((e) => { if(window.AmrOS)window.AmrOS.logError('DataLake','flushBatch: '+((e&&e.message)||e)); });
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
  // LEADER ELECTION VIA BROADCASTCHANNEL
  // ═══════════════════════════════════════════════════
  function runElection() {
    return new Promise((resolve) => {
      if (!supportsBroadcastChannel()) return resolve(true);

      if (!_bc) _bc = new BroadcastChannel(BC_NAME);
      const myPriority = Date.now() + Math.random();
      let dominated = false;

      function onElect(e) {
        const d = e.data;
        if (d.t === 'lake:elect' && (d.priority > myPriority || (d.priority === myPriority && d.from > _tabId))) {
          dominated = true;
        }
        if (d.t === 'lake:heartbeat') {
          dominated = true;
          _lastHeartbeat = Date.now();
        }
      }

      _bc.addEventListener('message', onElect);
      _bc.postMessage({ t: 'lake:elect', from: _tabId, priority: myPriority });

      setTimeout(() => {
        _bc.removeEventListener('message', onElect);
        _bc.addEventListener('message', handleChannelMessage);
        resolve(!dominated);
      }, ELECT_WAIT_MS);
    });
  }

  function becomeMaster() {
    _isMaster = true;
    _heartbeatInterval = setInterval(() => {
      if (_bc) _bc.postMessage({ t: 'lake:heartbeat', from: _tabId });
    }, HEARTBEAT_MS);

    window.addEventListener('beforeunload', abdicateMaster);
  }

  function abdicateMaster() {
    if (!_isMaster) return;
    if (_bc) {
      try { _bc.postMessage({ t: 'lake:abdicate', from: _tabId }); } catch (_) {}
    }
  }

  function startHeartbeatWatchdog() {
    _lastHeartbeat = Date.now();
    _heartbeatWatchdog = setInterval(() => {
      if (Date.now() - _lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        clearInterval(_heartbeatWatchdog);
        _heartbeatWatchdog = null;
        promoteToMaster();
      }
    }, HEARTBEAT_MS);
  }

  function promoteToMaster() {
    if (_isMaster || destroyed) return;
    if (_heartbeatWatchdog) { clearInterval(_heartbeatWatchdog); _heartbeatWatchdog = null; }
    mode = 'pending';
    ready = false;
    initPromise = null;

    if (_bc) _bc.removeEventListener('message', handleChannelMessage);

    runElection().then((won) => {
      if (won) {
        becomeMaster();
        return initWorker();
      } else {
        mode = 'proxy';
        ready = true;
        startHeartbeatWatchdog();
      }
    }).catch(() => {
      mode = 'fallback';
      ready = true;
    });
  }

  function handleChannelMessage(e) {
    const d = e.data;

    if (d.t === 'lake:heartbeat') {
      _lastHeartbeat = Date.now();
      return;
    }

    if (d.t === 'lake:abdicate') {
      promoteToMaster();
      return;
    }

    if (d.t === 'lake:elect' && _isMaster) {
      if (_bc) _bc.postMessage({ t: 'lake:heartbeat', from: _tabId });
      return;
    }

    // Master handles proxy requests from secondary tabs
    if (d.t === 'lake:request' && _isMaster) {
      const reqId = d.id;
      const msg = d.msg;
      send(msg).then((result) => {
        if (_bc) _bc.postMessage({ t: 'lake:response', to: d.from, id: reqId, result });
      }).catch((err) => {
        if (_bc) _bc.postMessage({ t: 'lake:response', to: d.from, id: reqId, error: err.message || String(err) });
      });
      return;
    }

    // Secondary tabs receive responses from master
    if (d.t === 'lake:response' && d.to === _tabId) {
      const p = _pendingRemote.get(d.id);
      if (!p) return;
      _pendingRemote.delete(d.id);
      if (d.error) p.reject(new Error(d.error));
      else p.resolve(d.result);
      return;
    }
  }

  // ═══════════════════════════════════════════════════
  // WORKER INITIALIZATION (master only)
  // ═══════════════════════════════════════════════════
  function initWorker() {
    return new Promise((resolve) => {
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
          console.log('%c\uD83D\uDDC4\uFE0F Data Lake: OPFS + SQLite active (master)', 'background:#22c55e;color:#fff;padding:2px 5px;border-radius:3px;');

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
  }

  // ═══════════════════════════════════════════════════
  // INITIALIZATION (with election)
  // ═══════════════════════════════════════════════════
  function initialize() {
    if (initPromise) return initPromise;

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) console.log('%c\uD83D\uDDC4\uFE0F Data Lake: Persistent storage granted', 'background:#22c55e;color:#fff;padding:2px 5px;border-radius:3px;');
        else console.warn('[DataLake] Persistent storage denied \u2014 data may be evicted under storage pressure');
      }).catch(() => {});
    }

    if (!supportsOPFS()) {
      mode = 'fallback';
      ready = true;
      console.log('%c\uD83D\uDDC4\uFE0F Data Lake: localStorage fallback', 'background:#6b7a90;color:#fff;padding:2px 5px;border-radius:3px;');
      initPromise = Promise.resolve();
      return initPromise;
    }

    initPromise = runElection().then((won) => {
      if (won) {
        becomeMaster();
        return initWorker();
      } else {
        mode = 'proxy';
        ready = true;
        startHeartbeatWatchdog();
        console.log('%c\uD83D\uDDC4\uFE0F Data Lake: proxy mode (secondary tab)', 'background:#3b82f6;color:#fff;padding:2px 5px;border-radius:3px;');
      }
    }).catch(() => {
      mode = 'fallback';
      ready = true;
    });

    return initPromise;
  }

  // ═══════════════════════════════════════════════════
  // DISPATCH: route to worker (master) or proxy (secondary)
  // ═══════════════════════════════════════════════════
  function dispatch(msg) {
    if (_isMaster) return send(msg);
    if (mode === 'proxy') return proxyRequest(msg);
    return Promise.reject(new Error('Lake not ready'));
  }

  function dispatchEnqueue(op) {
    if (_isMaster) enqueue(op);
    else if (mode === 'proxy') proxyEnqueue(op);
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
    get isMaster() { return _isMaster; },

    async waitReady() {
      if (ready) return;
      await initPromise;
    },

    async get(store, key) {
      if (mode === 'fallback') return fallback.get(store, key);
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.get(store, key);
      return dispatch({ type: 'get', store, key });
    },

    put(store, key, value) {
      if (mode === 'fallback') { fallback.put(store, key, value); return; }
      if (!ready) { fallback.put(store, key, value); return; }
      dispatchEnqueue({ type: 'put', store, key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    },

    putImmediate(store, key, value) {
      if (mode === 'fallback') { fallback.put(store, key, value); return Promise.resolve(); }
      if (!ready) { fallback.put(store, key, value); return Promise.resolve(); }
      return dispatch({ type: 'put', store, key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    },

    async getAll(store) {
      if (mode === 'fallback') return fallback.getAll(store);
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.getAll(store);
      return dispatch({ type: 'getAll', store });
    },

    del(store, key) {
      if (mode === 'fallback') { fallback.del(store, key); return; }
      if (!ready) return;
      dispatchEnqueue({ type: 'delete', store, key });
    },

    recordScore(game, score, player) {
      if (mode === 'fallback') return;
      if (!ready) return;
      dispatchEnqueue({ type: 'score', game, score, player: player || 'Anon' });
    },

    logEvent(eventType, data) {
      if (mode === 'fallback') return;
      if (!ready) return;
      dispatchEnqueue({ type: 'event', eventType, data });
    },

    async exec(sql, params) {
      if (mode === 'fallback') return fallback.exec();
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.exec();
      return dispatch({ type: 'exec', sql, params });
    },

    async stats() {
      if (mode === 'fallback') return fallback.stats();
      if (!ready) await initPromise;
      if (mode === 'fallback') return fallback.stats();
      const s = await dispatch({ type: 'stats' });
      s.mode = _isMaster ? 'opfs' : 'proxy';
      return s;
    },

    async exportDB() {
      if (mode === 'fallback') return null;
      if (!ready) await initPromise;
      if (mode === 'fallback') return null;
      if (_isMaster) {
        if (batchQueue.length) await flushBatch();
        return send({ type: 'export' });
      }
      return dispatch({ type: 'export' });
    },

    destroy() {
      destroyed = true;
      if (batchTimer) clearTimeout(batchTimer);
      if (_heartbeatInterval) clearInterval(_heartbeatInterval);
      if (_heartbeatWatchdog) clearInterval(_heartbeatWatchdog);
      window.removeEventListener('beforeunload', abdicateMaster);

      for (const [, { reject }] of pending) reject(new Error('Lake destroyed'));
      pending.clear();
      for (const [, { reject }] of _pendingRemote) reject(new Error('Lake destroyed'));
      _pendingRemote.clear();

      if (_isMaster) abdicateMaster();

      const hadBatch = batchQueue.length > 0;
      if (hadBatch && worker) {
        try { worker.postMessage({ id: ++msgId, type: 'batch', ops: batchQueue.splice(0) }); } catch (_) {}
      }
      const w = worker; worker = null; ready = false;
      if (w) { setTimeout(() => w.terminate(), hadBatch ? 500 : 0); }
      if (_bc) { try { _bc.close(); } catch (_) {} _bc = null; }
    }
  };

  window._lake = lake;

  initialize();

  if(window._registerTeardown) window._registerTeardown(function() { if (window._lake) window._lake.destroy(); });
})();
