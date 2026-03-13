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
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80',   username: '8eb6b5714a5af570db3337bc', credential: 'Ef2wRVk0Jr3N8qex' },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '8eb6b5714a5af570db3337bc', credential: 'Ef2wRVk0Jr3N8qex' },
    { urls: 'turn:global.relay.metered.ca:443',  username: '8eb6b5714a5af570db3337bc', credential: 'Ef2wRVk0Jr3N8qex' },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '8eb6b5714a5af570db3337bc', credential: 'Ef2wRVk0Jr3N8qex' }
  ];
  const DC_LABEL       = 'mesh';
  const HB_INTERVAL    = 5000;
  const HB_TIMEOUT     = 12000;
  const RECONNECT_MAX  = 30000;
  const DISCONNECT_GRACE = 10000;
  const ICE_RESTART_TIMEOUT = 8000;
  const YJS_CDN        = 'https://cdn.jsdelivr.net/npm/yjs@13/dist/yjs.mjs';
  const MAX_PEERS      = 8;
  const RELAY_TTL      = 2;
  const SEEN_CAP       = 500;

  const _sb  = window._sb;
  const myId = window._mpMyId;
  if (!_sb || !myId) return;

  let _msgSeq = 0;
  const _seenRelayIds = new Set();
  function _nextMsgId() { return myId.slice(0, 8) + ':' + (++_msgSeq); }
  function _markSeen(id) {
    _seenRelayIds.add(id);
    if (_seenRelayIds.size > SEEN_CAP) _seenRelayIds.delete(_seenRelayIds.values().next().value);
  }

  // ═══════════════════════════════════════════════════
  // SECTION 2: SIGNAL RELAY — Supabase SDP/ICE bridge
  // ═══════════════════════════════════════════════════
  let sigChannel = _sb.channel('mesh-signal');
  let sigReady = false;
  const sigQueue = [];

  function sigSend(event, payload) {
    if (!sigReady) {
      sigQueue.push({ event, payload });
      return;
    }
    sigChannel.send({ type: 'broadcast', event, payload });
  }

  function sigFlush() {
    while (sigQueue.length > 0) {
      const { event, payload } = sigQueue.shift();
      sigChannel.send({ type: 'broadcast', event, payload });
    }
  }

  const sigHandlers = { sdp_offer: [], sdp_answer: [], ice_candidate: [] };

  function onSignal(event, fn) {
    if (sigHandlers[event]) sigHandlers[event].push(fn);
  }

  let sigReconnectAttempt = 0;

  function bindSigListeners() {
    ['sdp_offer', 'sdp_answer', 'ice_candidate'].forEach(ev => {
      sigChannel.on('broadcast', { event: ev }, ({ payload }) => {
        if (!payload || payload.to !== myId) return;
        sigHandlers[ev].forEach(fn => fn(payload));
      });
    });
  }

  function sigSubscribe() {
    sigChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        sigReady = true;
        sigReconnectAttempt = 0;
        console.log('%c🔗 Mesh%c Signaling channel ready','background:#3b82f6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');
        sigFlush();
        retryPendingOffers();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        sigReady = false;
        sigReconnectAttempt++;
        if (sigReconnectAttempt >= 3) {
          console.warn('[Mesh] Signaling failed after 3 attempts — going offline');
          if (window.AmrOS) window.AmrOS.offlineMode = true;
          return;
        }
        const delay = Math.min(30000, 2000 * Math.pow(2, sigReconnectAttempt - 1));
        setTimeout(() => {
          if (sigReady) return;
          try { sigChannel.unsubscribe(); } catch (_) {}
          sigChannel = _sb.channel('mesh-signal');
          bindSigListeners();
          sigSubscribe();
        }, delay);
      }
    });
  }

  bindSigListeners();
  sigSubscribe();

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

      this._polite = myId < peerId;
      this._makingOffer = false;
      this._ignoreOffer = false;

      this._disconnectTimer = null;
      this._iceRestartTimer = null;
      this._iceRestartCount = 0;

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
        if (s === 'connected') {
          this._clearRecoveryTimers();
          this._iceRestartCount = 0;
        } else if (s === 'disconnected') {
          if (!this._disconnectTimer) {
            this._disconnectTimer = setTimeout(() => {
              this._disconnectTimer = null;
              if (this.state !== 'closed') this._attemptIceRestart();
            }, DISCONNECT_GRACE);
          }
        } else if (s === 'failed') {
          this._clearRecoveryTimers();
          this._attemptIceRestart();
        } else if (s === 'closed') {
          this.close();
        }
      };

      this._pc.oniceconnectionstatechange = () => {
        if (this.state === 'closed') return;
        const s = this._pc.iceConnectionState;
        if (s === 'disconnected' && !this._disconnectTimer) {
          this._disconnectTimer = setTimeout(() => {
            this._disconnectTimer = null;
            if (this.state !== 'closed' && this._pc.iceConnectionState !== 'connected'
                && this._pc.iceConnectionState !== 'completed') {
              this._attemptIceRestart();
            }
          }, DISCONNECT_GRACE);
        }
        if (s === 'connected' || s === 'completed') {
          this._clearRecoveryTimers();
        }
      };

      this._onTrack = null;
      this._audioSenders = [];

      this._pc.ontrack = (e) => {
        if (this._onTrack) this._onTrack(this.peerId, e.streams[0] || new MediaStream([e.track]), e.track);
      };

      this._pc.onnegotiationneeded = async () => {
        if (this.state !== 'open') return;
        try {
          this._makingOffer = true;
          await this._pc.setLocalDescription();
          sigSend('sdp_offer', { to: this.peerId, from: myId, sdp: this._pc.localDescription });
        } catch (_) {
        } finally {
          this._makingOffer = false;
        }
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
        if (p.from !== peerId || this.state === 'closed') return;
        const cand = new RTCIceCandidate(p.candidate);
        if (this._pc.remoteDescription) {
          this._pc.addIceCandidate(cand).catch((e) => {
            if (!this._ignoreOffer) console.warn('[Mesh] ICE candidate failed:', e.message);
          });
        } else {
          this._iceQueue.push(cand);
        }
      };
      this._sigHandlerAnswer = (p) => {
        if (p.from !== peerId || this.state === 'closed') return;
        this._pc.setRemoteDescription(new RTCSessionDescription(p.sdp))
          .then(() => this._drainIceQueue())
          .catch((e) => { if(window.AmrOS)window.AmrOS.logError('Mesh','setRemoteDescription: '+((e&&e.message)||e)); });
      };
      this._sigHandlerOffer = async (p) => {
        if (p.from !== peerId || this.state === 'closed') return;
        const offerCollision = this._makingOffer || this._pc.signalingState !== 'stable';
        this._ignoreOffer = !this._polite && offerCollision;
        if (this._ignoreOffer) return;
        this._handleOffer(p.sdp);
      };

      onSignal('ice_candidate', this._sigHandlerICE);
      onSignal('sdp_answer', this._sigHandlerAnswer);
      onSignal('sdp_offer', this._sigHandlerOffer);
    }

    async _doOffer(iceRestart) {
      const isRenegotiation = this.state === 'open';
      if (!isRenegotiation) this._setState('connecting');
      try {
        this._makingOffer = true;
        const offer = await this._pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
        await this._pc.setLocalDescription(offer);
        sigSend('sdp_offer', { to: this.peerId, from: myId, sdp: this._pc.localDescription });
      } catch (e) {
        console.warn('[Mesh] Offer failed for', this.peerId.slice(0, 8), e.message);
        if (!isRenegotiation) this.close();
      } finally {
        this._makingOffer = false;
      }
    }

    async _handleOffer(sdp) {
      const isRenegotiation = this.state === 'open';
      if (!isRenegotiation) this._setState('connecting');
      try {
        await this._pc.setRemoteDescription(new RTCSessionDescription(sdp));
        this._drainIceQueue();
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        sigSend('sdp_answer', { to: this.peerId, from: myId, sdp: this._pc.localDescription });
      } catch (e) {
        console.warn('[Mesh] Answer failed for', this.peerId.slice(0, 8), e.message);
        if (!isRenegotiation) this.close();
      }
    }

    _drainIceQueue() {
      while (this._iceQueue.length) {
        this._pc.addIceCandidate(this._iceQueue.shift()).catch((e) => { if(window.AmrOS)window.AmrOS.logError('Mesh','addIceCandidate: '+((e&&e.message)||e)); });
      }
    }

    _clearRecoveryTimers() {
      if (this._disconnectTimer) { clearTimeout(this._disconnectTimer); this._disconnectTimer = null; }
      if (this._iceRestartTimer) { clearTimeout(this._iceRestartTimer); this._iceRestartTimer = null; }
    }

    _attemptIceRestart() {
      if (this.state === 'closed') return;
      if (this._iceRestartCount >= 3) { this.close(); return; }
      this._iceRestartCount++;
      this._lastPong = Date.now();
      this._doOffer(true).catch((e) => { if(window.AmrOS)window.AmrOS.logError('Mesh','iceRestart offer: '+((e&&e.message)||e)); });
      this._iceRestartTimer = setTimeout(() => {
        this._iceRestartTimer = null;
        if (this.state !== 'closed' && this._pc.connectionState !== 'connected') {
          this._attemptIceRestart();
        }
      }, ICE_RESTART_TIMEOUT);
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
      this._clearRecoveryTimers();
      if (this._hbTimer) { clearInterval(this._hbTimer); this._hbTimer = null; }
      if (this._sigHandlerICE) { const a = sigHandlers.ice_candidate; const i = a.indexOf(this._sigHandlerICE); if (i >= 0) a.splice(i, 1); }
      if (this._sigHandlerAnswer) { const a = sigHandlers.sdp_answer; const i = a.indexOf(this._sigHandlerAnswer); if (i >= 0) a.splice(i, 1); }
      if (this._sigHandlerOffer) { const a = sigHandlers.sdp_offer; const i = a.indexOf(this._sigHandlerOffer); if (i >= 0) a.splice(i, 1); }
      this._iceQueue = [];
      if (this._audioSenders.length) {
        this._audioSenders.forEach(s => { try { this._pc.removeTrack(s); } catch (_) {} });
        this._audioSenders = [];
      }
      try { this._dc?.close(); } catch (_) {}
      try { this._pc?.close(); } catch (_) {}
      this._dc = null;
    }

    getStats() {
      return { latency: this._latency, bytesSent: this._bytesSent, bytesRecv: this._bytesRecv };
    }
  }

  // ═══════════════════════════════════════════════════
  // SECTION 4: MESH NETWORK — Partial mesh (max 8 peers + gossip relay)
  // ═══════════════════════════════════════════════════
  const links = new Map();
  let appMessageHandler = null;
  let appStateHandler = null;
  let trackHandler = null;
  const messageInterceptors = [];
  let meshStartTime = Date.now();
  const reconnectTimers = new Map();

  function onPeerMessage(peerId, msg) {
    if (msg instanceof ArrayBuffer || msg instanceof Uint8Array) {
      handleCRDTUpdate(peerId, msg);
      return;
    }
    if (msg && msg._crdt) return;
    if (msg && msg._hb) return;

    if (msg && msg._relay) {
      if (_seenRelayIds.has(msg._relay.id)) return;
      _markSeen(msg._relay.id);
      if (msg._relay.ttl > 0) {
        const fwd = JSON.stringify(Object.assign({}, msg, {
          _relay: { origin: msg._relay.origin, id: msg._relay.id, ttl: msg._relay.ttl - 1 }
        }));
        for (const [pid, link] of links) {
          if (pid !== peerId && pid !== msg._relay.origin && link.state === 'open') link._sendRaw(fwd);
        }
      }
      const clean = Object.assign({}, msg);
      delete clean._relay;
      msg = clean;
    }

    for (let i = 0; i < messageInterceptors.length; i++) {
      if (messageInterceptors[i](peerId, msg)) return;
    }
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
    if (links.size >= MAX_PEERS) return;
    const isOfferer = myId > peerId;
    
    const link = new PeerLink(peerId, isOfferer, onPeerMessage, onPeerState);
    if (trackHandler) link._onTrack = trackHandler;
    links.set(peerId, link);
    updateHUD();
  }

  function retryPendingOffers() {
    for (const [peerId, link] of links) {
      if (link.state === 'connecting' || link.state === 'new') {
        const isOfferer = myId > peerId;
        if (isOfferer) {
          link._doOffer().catch(() => {});
        }
      }
    }
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
    newIds.delete(myId);

    for (const pid of currentPeerIds) {
      if (!newIds.has(pid)) disconnectPeer(pid);
    }
    currentPeerIds = newIds;

    const candidates = [];
    for (const pid of newIds) {
      if (!links.has(pid)) candidates.push(pid);
    }
    const budget = MAX_PEERS - links.size;
    if (budget > 0 && candidates.length > 0) {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      for (let i = 0; i < Math.min(budget, candidates.length); i++) {
        connectToPeer(candidates[i]);
      }
    }
  }

  // Accept inbound connections from peers that selected us but we didn't select
  onSignal('sdp_offer', (p) => {
    if (links.has(p.from) || links.size >= MAX_PEERS) return;
    if (!currentPeerIds.has(p.from)) return;
    const link = new PeerLink(p.from, false, onPeerMessage, onPeerState);
    if (trackHandler) link._onTrack = trackHandler;
    links.set(p.from, link);
    updateHUD();
    link._handleOffer(p.sdp);
  });

  function broadcast(msg) {
    const id = _nextMsgId();
    _markSeen(id);
    const raw = JSON.stringify(Object.assign({}, msg, { _relay: { origin: myId, id: id, ttl: RELAY_TTL } }));
    for (const [, link] of links) {
      if (link.state === 'open') link._sendRaw(raw);
    }
  }

  function sendTo(peerId, msg) {
    const link = links.get(peerId);
    if (link && link.state === 'open') link.send(msg);
  }

  function broadcastBinary(buf) {
    const src = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const payload = new Uint8Array(src.length + 1);
    payload[0] = RELAY_TTL;
    payload.set(src, 1);
    for (const [, link] of links) {
      if (link.state === 'open') link.sendBinary(payload);
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
      const raw = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
      if (raw.length < 2) return;
      const ttl = raw[0];
      const update = raw.subarray(1);
      Y.applyUpdate(doc, update, 'remote');
      if (ttl > 0) {
        const fwd = new Uint8Array(update.length + 1);
        fwd[0] = ttl - 1;
        fwd.set(update, 1);
        for (const [pid, link] of links) {
          if (pid !== peerId && link.state === 'open') link.sendBinary(fwd);
        }
      }
    } catch (_) {}
  }

  function sendFullState(peerId) {
    if (!crdtReady || !Y || !doc) return;
    const state = Y.encodeStateAsUpdate(doc);
    sendTo(peerId, { _crdt: 'full_state' });
    const link = links.get(peerId);
    if (link && link.state === 'open') {
      const payload = new Uint8Array(state.length + 1);
      payload[0] = 0;
      payload.set(state, 1);
      link.sendBinary(payload);
    }
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
      scores.push({ player, score, ts: window.getTrueTime ? window.getTrueTime() : Date.now() });
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > 10) scores.length = 10;
      leaderboard.set(gameId, scores);
    });
  }

  function addChatMessage(from, fromNick, text, type) {
    if (!crdtReady || !chatLog) return;
    doc.transact(() => {
      chatLog.push([{ from, fromNick, text, ts: window.getTrueTime ? window.getTrueTime() : Date.now(), type: type || 'broadcast' }]);
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
      hudEl.style.opacity = '0';
      hudEl.style.pointerEvents = 'none';
      return;
    }
    hudEl.style.opacity = '';
    hudEl.style.pointerEvents = '';
    if (open >= total) {
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
    getPeers() { return new Map(links); },
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

    addMessageInterceptor(fn) {
      messageInterceptors.push(fn);
    },
    onTrack(fn) {
      trackHandler = fn;
      for (const [, link] of links) link._onTrack = fn;
    },
    getPeerConnection(peerId) {
      const l = links.get(peerId);
      return l && l.state === 'open' ? l._pc : null;
    },
    addTrack(peerId, track, stream) {
      const l = links.get(peerId);
      if (!l || l.state !== 'open') return null;
      const sender = l._pc.addTrack(track, stream);
      l._audioSenders.push(sender);
      return sender;
    },
    removeTrack(peerId, sender) {
      const l = links.get(peerId);
      if (!l || l.state !== 'open') return;
      try { l._pc.removeTrack(sender); } catch (_) {}
      l._audioSenders = l._audioSenders.filter(s => s !== sender);
    },
  };

  window._mesh = meshAPI;
  window._meshRecordScore = recordScore;
  console.log('%c🔗 Mesh%c WebRTC mesh — id: '+myId.slice(0,8),'background:#3b82f6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');

  // Auto-init: load CRDTs (HUD hidden by default — toggle via terminal `mesh` command)
  initCRDT().then(() => {
    if (window.VDna) window.VDna.addXp(10);
  });

  window.addEventListener('beforeunload', () => {
    Array.from(links.keys()).forEach(pid => disconnectPeer(pid));
    sigChannel.unsubscribe();
    removeHUD();
  });
})();
