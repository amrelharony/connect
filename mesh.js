// mesh.js — Decentralized P2P Data Mesh
// WebRTC full-mesh network with Yjs CRDTs, signaled via Supabase.
// Lazy-loaded from site.js after multiplayer presence connects.

(function DataMesh() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // SECTION 1: CONSTANTS & CONFIG
  // ═══════════════════════════════════════════════════
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];
  const DC_LABEL       = 'mesh';
  const HB_INTERVAL    = 5000;
  const HB_TIMEOUT     = 12000;
  const RECONNECT_MAX  = 30000;
  const YJS_CDN        = 'https://cdn.jsdelivr.net/npm/yjs@13/dist/yjs.mjs';

  const _sb  = window._sb;
  const myId = window._mpMyId;
  if (!_sb || !myId) return;

  // ═══════════════════════════════════════════════════
  // SECTION 2: SIGNAL RELAY — Supabase SDP/ICE bridge
  // ═══════════════════════════════════════════════════
  const sigChannel = _sb.channel('mesh-signal');
  let sigReady = false;

  function sigSend(event, payload) {
    if (!sigReady) return;
    sigChannel.send({ type: 'broadcast', event, payload });
  }

  const sigHandlers = { sdp_offer: [], sdp_answer: [], ice_candidate: [] };

  function onSignal(event, fn) {
    if (sigHandlers[event]) sigHandlers[event].push(fn);
  }

  ['sdp_offer', 'sdp_answer', 'ice_candidate'].forEach(ev => {
    sigChannel.on('broadcast', { event: ev }, ({ payload }) => {
      if (!payload || payload.to !== myId) return;
      sigHandlers[ev].forEach(fn => fn(payload));
    });
  });

  sigChannel.subscribe((status) => { sigReady = status === 'SUBSCRIBED'; });

  // ═══════════════════════════════════════════════════
  // SECTION 3: PEER LINK — Single RTCPeerConnection
  // ═══════════════════════════════════════════════════
  class PeerLink {
    constructor(peerId, isOfferer, onMessage, onStateChange) {
      this.peerId = peerId;
      this.state = 'new';
      this._onMessage = onMessage;
      this._onStateChange = onStateChange;
      this._dc = null;
      this._hbTimer = null;
      this._lastPong = Date.now();
      this._bytesSent = 0;
      this._bytesRecv = 0;
      this._latency = -1;
      this._pingTs = 0;

      this._pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this._iceQueue = [];

      this._pc.onicecandidate = (e) => {
        if (e.candidate) {
          sigSend('ice_candidate', { to: peerId, from: myId, candidate: e.candidate });
        }
      };

      this._pc.onconnectionstatechange = () => {
        if (this.state === 'closed') return;
        const s = this._pc.connectionState;
        if (s === 'failed' || s === 'disconnected' || s === 'closed') this.close();
      };

      if (isOfferer) {
        this._dc = this._pc.createDataChannel(DC_LABEL);
        this._wireChannel(this._dc);
        this._doOffer();
      } else {
        this._pc.ondatachannel = (e) => {
          this._dc = e.channel;
          this._wireChannel(this._dc);
        };
      }

      this._sigHandlerICE = (p) => {
        if (p.from === peerId && this.state !== 'closed') {
          const cand = new RTCIceCandidate(p.candidate);
          if (this._pc.remoteDescription) {
            this._pc.addIceCandidate(cand).catch(() => {});
          } else {
            this._iceQueue.push(cand);
          }
        }
      };
      this._sigHandlerAnswer = (p) => {
        if (p.from === peerId && isOfferer && this.state !== 'closed') {
          this._pc.setRemoteDescription(new RTCSessionDescription(p.sdp))
            .then(() => this._drainIceQueue())
            .catch(() => {});
        }
      };
      this._sigHandlerOffer = (p) => {
        if (p.from === peerId && !isOfferer && this.state !== 'closed') this._handleOffer(p.sdp);
      };

      onSignal('ice_candidate', this._sigHandlerICE);
      onSignal('sdp_answer', this._sigHandlerAnswer);
      onSignal('sdp_offer', this._sigHandlerOffer);
    }

    async _doOffer() {
      this._setState('connecting');
      try {
        const offer = await this._pc.createOffer();
        await this._pc.setLocalDescription(offer);
        sigSend('sdp_offer', { to: this.peerId, from: myId, sdp: this._pc.localDescription });
      } catch (_) { this.close(); }
    }

    async _handleOffer(sdp) {
      this._setState('connecting');
      try {
        await this._pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this._drainIceQueue();
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        sigSend('sdp_answer', { to: this.peerId, from: myId, sdp: this._pc.localDescription });
      } catch (_) { this.close(); }
    }

    _drainIceQueue() {
      while (this._iceQueue.length) {
        this._pc.addIceCandidate(this._iceQueue.shift()).catch(() => {});
      }
    }

    _wireChannel(ch) {
      ch.binaryType = 'arraybuffer';
      ch.onopen = () => {
        this._setState('open');
        this._lastPong = Date.now();
        this._startHeartbeat();
      };
      ch.onclose = () => this.close();
      ch.onerror = () => this.close();
      ch.onmessage = (e) => {
        if (typeof e.data === 'string') {
          this._bytesRecv += e.data.length;
          let msg;
          try { msg = JSON.parse(e.data); } catch (_) { return; }
          if (msg._hb === 'ping') { this._sendRaw(JSON.stringify({ _hb: 'pong' })); return; }
          if (msg._hb === 'pong') { this._lastPong = Date.now(); this._latency = Date.now() - this._pingTs; return; }
          this._onMessage(this.peerId, msg);
        } else {
          this._bytesRecv += e.data.byteLength;
          this._onMessage(this.peerId, e.data);
        }
      };
    }

    _startHeartbeat() {
      this._hbTimer = setInterval(() => {
        if (this.state !== 'open') return;
        if (Date.now() - this._lastPong > HB_TIMEOUT) { this.close(); return; }
        this._pingTs = Date.now();
        this._sendRaw(JSON.stringify({ _hb: 'ping' }));
      }, HB_INTERVAL);
    }

    _sendRaw(data) {
      try {
        if (this._dc && this._dc.readyState === 'open') {
          this._dc.send(data);
          this._bytesSent += typeof data === 'string' ? data.length : data.byteLength;
        }
      } catch (_) {}
    }

    send(msg) {
      this._sendRaw(JSON.stringify(msg));
    }

    sendBinary(buf) {
      this._sendRaw(buf);
    }

    _setState(s) {
      if (this.state === s) return;
      this.state = s;
      this._onStateChange(this.peerId, s);
    }

    close() {
      if (this.state === 'closed') return;
      this._setState('closed');
      if (this._hbTimer) { clearInterval(this._hbTimer); this._hbTimer = null; }
      if (this._sigHandlerICE) { const a = sigHandlers.ice_candidate; const i = a.indexOf(this._sigHandlerICE); if (i >= 0) a.splice(i, 1); }
      if (this._sigHandlerAnswer) { const a = sigHandlers.sdp_answer; const i = a.indexOf(this._sigHandlerAnswer); if (i >= 0) a.splice(i, 1); }
      if (this._sigHandlerOffer) { const a = sigHandlers.sdp_offer; const i = a.indexOf(this._sigHandlerOffer); if (i >= 0) a.splice(i, 1); }
      this._iceQueue = [];
      try { this._dc?.close(); } catch (_) {}
      try { this._pc?.close(); } catch (_) {}
      this._dc = null;
    }

    getStats() {
      return { latency: this._latency, bytesSent: this._bytesSent, bytesRecv: this._bytesRecv };
    }
  }

  // ═══════════════════════════════════════════════════
  // SECTION 4: MESH NETWORK — Full mesh manager
  // ═══════════════════════════════════════════════════
  const links = new Map();
  let appMessageHandler = null;
  let appStateHandler = null;
  let meshStartTime = Date.now();
  const reconnectTimers = new Map();

  function onPeerMessage(peerId, msg) {
    if (msg instanceof ArrayBuffer || msg instanceof Uint8Array) {
      handleCRDTUpdate(peerId, msg);
      return;
    }
    if (msg && msg._crdt) return;
    if (msg && msg._hb) return;
    if (appMessageHandler) appMessageHandler(peerId, msg);
  }

  function onPeerState(peerId, state) {
    if (state === 'closed') {
      links.delete(peerId);
      scheduleReconnect(peerId);
    }
    if (state === 'open') {
      setTimeout(() => sendFullState(peerId), 500);
    }
    updateHUD();
    if (appStateHandler) appStateHandler(peerId, state);
  }

  function connectToPeer(peerId) {
    if (links.has(peerId)) return;
    const isOfferer = myId > peerId;
    const link = new PeerLink(peerId, isOfferer, onPeerMessage, onPeerState);
    links.set(peerId, link);
    updateHUD();
  }

  function disconnectPeer(peerId) {
    const link = links.get(peerId);
    if (link) { link.close(); links.delete(peerId); }
    const rt = reconnectTimers.get(peerId);
    if (rt) { clearTimeout(rt.timer); reconnectTimers.delete(peerId); }
  }

  function scheduleReconnect(peerId) {
    if (!currentPeerIds.has(peerId)) return;
    const info = reconnectTimers.get(peerId) || { attempt: 0, timer: null };
    if (info.timer) clearTimeout(info.timer);
    info.attempt++;
    const delay = Math.min(RECONNECT_MAX, 1000 * Math.pow(2, info.attempt - 1));
    info.timer = setTimeout(() => {
      reconnectTimers.delete(peerId);
      if (currentPeerIds.has(peerId) && !links.has(peerId)) connectToPeer(peerId);
    }, delay);
    reconnectTimers.set(peerId, info);
  }

  let currentPeerIds = new Set();

  function syncPeers(presencePeerIds) {
    if (!presencePeerIds) return;
    const newIds = new Set(presencePeerIds);
    for (const pid of newIds) {
      if (pid !== myId && !links.has(pid)) connectToPeer(pid);
    }
    for (const pid of currentPeerIds) {
      if (!newIds.has(pid)) disconnectPeer(pid);
    }
    currentPeerIds = newIds;
    currentPeerIds.delete(myId);
  }

  function broadcast(msg) {
    const raw = JSON.stringify(msg);
    for (const [, link] of links) {
      if (link.state === 'open') link._sendRaw(raw);
    }
  }

  function sendTo(peerId, msg) {
    const link = links.get(peerId);
    if (link && link.state === 'open') link.send(msg);
  }

  function broadcastBinary(buf) {
    for (const [, link] of links) {
      if (link.state === 'open') link.sendBinary(buf);
    }
  }

  function getOpenCount() {
    let c = 0;
    for (const [, l] of links) if (l.state === 'open') c++;
    return c;
  }

  function getStats() {
    let totalSent = 0, totalRecv = 0, avgLatency = 0, latCount = 0;
    for (const [, l] of links) {
      const s = l.getStats();
      totalSent += s.bytesSent;
      totalRecv += s.bytesRecv;
      if (s.latency >= 0) { avgLatency += s.latency; latCount++; }
    }
    return {
      peers: links.size,
      connected: getOpenCount(),
      totalPeers: currentPeerIds.size,
      bytesSent: totalSent,
      bytesRecv: totalRecv,
      avgLatency: latCount ? Math.round(avgLatency / latCount) : -1,
      uptime: Math.round((Date.now() - meshStartTime) / 1000)
    };
  }

  // ═══════════════════════════════════════════════════
  // SECTION 5: CRDT SYNC — Yjs over WebRTC DataChannels
  // ═══════════════════════════════════════════════════
  let Y = null;
  let doc = null;
  let leaderboard = null;
  let chatLog = null;
  let meshMeta = null;
  let awareness = null;
  let crdtReady = false;

  async function initCRDT() {
    try {
      const mod = await import(YJS_CDN);
      Y = mod;
      doc = new Y.Doc();
      leaderboard = doc.getMap('leaderboard');
      chatLog = doc.getArray('chatLog');
      meshMeta = doc.getMap('meshMeta');

      awareness = new Map();

      doc.on('update', (update, origin) => {
        if (origin === 'remote') return;
        broadcastBinary(update);
      });

      crdtReady = true;
    } catch (_) {
      crdtReady = false;
    }
  }

  function handleCRDTUpdate(peerId, data) {
    if (!crdtReady || !Y || !doc) return;
    try {
      const update = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
      Y.applyUpdate(doc, update, 'remote');
    } catch (_) {}
  }

  function sendFullState(peerId) {
    if (!crdtReady || !Y || !doc) return;
    const state = Y.encodeStateAsUpdate(doc);
    sendTo(peerId, { _crdt: 'full_state' });
    const link = links.get(peerId);
    if (link && link.state === 'open') link.sendBinary(state);
  }

  function recordScore(gameId, player, score) {
    if (!crdtReady || !leaderboard) return;
    doc.transact(() => {
      let scores = leaderboard.get(gameId);
      if (!scores) {
        scores = [];
      } else {
        scores = JSON.parse(JSON.stringify(scores));
      }
      scores.push({ player, score, ts: Date.now() });
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > 10) scores.length = 10;
      leaderboard.set(gameId, scores);
    });
  }

  function addChatMessage(from, fromNick, text, type) {
    if (!crdtReady || !chatLog) return;
    doc.transact(() => {
      chatLog.push([{ from, fromNick, text, ts: Date.now(), type: type || 'broadcast' }]);
      if (chatLog.length > 100) chatLog.delete(0, chatLog.length - 100);
    });
  }

  function getChatHistory() {
    if (!crdtReady || !chatLog) return [];
    return chatLog.toArray();
  }

  function getLeaderboard(gameId) {
    if (!crdtReady || !leaderboard) return [];
    return leaderboard.get(gameId) || [];
  }

  // ═══════════════════════════════════════════════════
  // SECTION 6: MESH HUD
  // ═══════════════════════════════════════════════════
  let hudEl = null;
  let hudVisible = false;

  function createHUD() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.className = 'mesh-hud';
    hudEl.innerHTML = '<span class="mesh-indicator"></span><span class="mesh-label"></span>';
    document.body.appendChild(hudEl);
    hudVisible = true;
    updateHUD();
  }

  function removeHUD() {
    if (hudEl) { hudEl.remove(); hudEl = null; }
    hudVisible = false;
  }

  function toggleHUD() {
    if (hudVisible) removeHUD(); else createHUD();
    return hudVisible;
  }

  function updateHUD() {
    if (!hudEl) return;
    const open = getOpenCount();
    const total = currentPeerIds.size;
    const indicator = hudEl.querySelector('.mesh-indicator');
    const label = hudEl.querySelector('.mesh-label');
    if (!indicator || !label) return;

    if (open === 0) {
      indicator.className = 'mesh-indicator mesh-off';
      label.textContent = 'No peers';
    } else if (open >= total) {
      indicator.className = 'mesh-indicator mesh-full';
      label.textContent = open + ' peer' + (open > 1 ? 's' : '') + ' direct';
    } else {
      indicator.className = 'mesh-indicator mesh-partial';
      label.textContent = open + '/' + total + ' mesh';
    }
  }

  // ═══════════════════════════════════════════════════
  // SECTION 7: GLOBAL API
  // ═══════════════════════════════════════════════════
  const meshAPI = {
    broadcast(payload) {
      broadcast(payload);
    },
    sendTo(peerId, payload) {
      sendTo(peerId, payload);
    },
    isConnected(peerId) {
      const l = links.get(peerId);
      return l ? l.state === 'open' : false;
    },
    getDoc()   { return doc; },
    getPeers() { return links; },
    getStats,
    getOpenCount,
    syncPeers,
    toggleHUD,

    recordScore,
    addChatMessage,
    getChatHistory,
    getLeaderboard,

    onMessage(fn)     { appMessageHandler = fn; },
    onPeerState(fn)   { appStateHandler = fn; },
    isCRDTReady()     { return crdtReady; },
  };

  window._mesh = meshAPI;
  window._meshRecordScore = recordScore;

  // Auto-init: load CRDTs then show HUD
  initCRDT().then(() => {
    createHUD();
    if (window.UniToast) window.UniToast('P2P Data Mesh active — decentralized swarm ready');
    if (window.VDna) window.VDna.addXp(10);
  });

  window.addEventListener('beforeunload', () => {
    for (const [pid] of links) disconnectPeer(pid);
    sigChannel.unsubscribe();
    removeHUD();
  });
})();
