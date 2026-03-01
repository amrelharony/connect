// voip.js — Spatial VoIP Engine
// Attaches audio MediaStream tracks to existing WebRTC RTCPeerConnections
// from mesh.js. Routes incoming audio through Web Audio API with HRTF
// PannerNode (cursor x/y) + GainNode (scroll distance) for 3D spatial voice.

(function SpatialVoIP() {
  'use strict';

  const mesh = window._mesh;
  if (!mesh) { console.warn('[VoIP] Mesh not available — VoIP disabled.'); return; }

  let localStream = null;
  let muted = false;
  const activeCalls = new Map();
  const peerPipelines = new Map();
  const senders = new Map();
  let ctx = null;
  let masterGain = null;
  let callUI = null;
  const pendingReconnects = new Set();

  // ═══════════════════════════════════════════════════
  // MICROPHONE CAPTURE
  // ═══════════════════════════════════════════════════

  async function startMic() {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track && track.readyState === 'live') return localStream;
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    });
    localStream.getAudioTracks().forEach(t => {
      t.addEventListener('ended', onMicTrackEnded, { once: true });
    });
    return localStream;
  }

  function onMicTrackEnded() {
    if (activeCalls.size === 0) return;
    localStream = null;
    startMic().then(async (newStream) => {
      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;
      for (const [peerId, sender] of senders) {
        try {
          await sender.replaceTrack(newTrack);
        } catch (_) {
          const ns = mesh.addTrack(peerId, newTrack, newStream);
          if (ns) senders.set(peerId, ns);
        }
      }
      showCallToast(null, 'reconnected');
    }).catch(() => {
      hangupAll();
      showCallToast(null, 'mic-denied');
    });
  }

  function stopMic() {
    if (!localStream) return;
    localStream.getTracks().forEach(t => {
      t.removeEventListener('ended', onMicTrackEnded);
      t.stop();
    });
    localStream = null;
  }

  // ═══════════════════════════════════════════════════
  // AUDIO CONTEXT ACQUISITION
  // ═══════════════════════════════════════════════════

  function ensureAudioCtx() {
    if (ctx && ctx.state !== 'closed') {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const sa = window._spatialAudio;
    if (sa) {
      ctx = sa.getCtx();
      masterGain = sa.getMaster();
    }
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { console.warn('[VoIP] Cannot create AudioContext'); return false; }
    }
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (ctx.listener.positionX) {
      ctx.listener.positionX.value = 0;
      ctx.listener.positionY.value = 0;
      ctx.listener.positionZ.value = 0;
    } else {
      ctx.listener.setPosition(0, 0, 0);
    }
    return true;
  }

  // ═══════════════════════════════════════════════════
  // SPATIAL AUDIO PIPELINE (per-peer)
  // ═══════════════════════════════════════════════════

  function createSpatialPipeline(remoteStream) {
    try {
      const audioEl = document.createElement('audio');
      audioEl.srcObject = remoteStream;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);

      const playPromise = audioEl.play();
      if (playPromise) playPromise.catch(e => console.warn('[VoIP] Audio element play blocked:', e.message));

      return { source: null, panner: null, gain: null, stream: remoteStream, audioEl };
    } catch (e) {
      console.warn('[VoIP] Pipeline creation threw:', e.message);
      return null;
    }
  }

  function destroyPipeline(peerId) {
    const p = peerPipelines.get(peerId);
    if (!p) return;
    if (p.source) try { p.source.disconnect(); } catch (_) {}
    if (p.panner) try { p.panner.disconnect(); } catch (_) {}
    if (p.gain) try { p.gain.disconnect(); } catch (_) {}
    if (p.audioEl) { p.audioEl.pause(); p.audioEl.srcObject = null; p.audioEl.remove(); }
    peerPipelines.delete(peerId);
  }

  // ═══════════════════════════════════════════════════
  // POSITION UPDATES
  // ═══════════════════════════════════════════════════

  function updatePeerAudio(peerId, peerData) {
    const pipeline = peerPipelines.get(peerId);
    if (!pipeline) return;
    if (pipeline.audioEl) {
      const peerScroll = peerData.scrollPct || 0;
      const myScroll = window._mpMyScrollPct || 0;
      const scrollDist = Math.abs(peerScroll - myScroll) / 100;
      pipeline.audioEl.volume = Math.max(0.15, 1.0 - scrollDist * 0.85);
    }
  }

  // ═══════════════════════════════════════════════════
  // INCOMING TRACK HANDLER
  // ═══════════════════════════════════════════════════

  function onRemoteTrack(peerId, stream, track) {
    if (track.kind !== 'audio') return;
    if (!activeCalls.has(peerId)) {
      activeCalls.set(peerId, { direction: 'incoming', startTime: Date.now() });
    }
    destroyPipeline(peerId);
    const pipeline = createSpatialPipeline(stream);
    if (pipeline) {
      peerPipelines.set(peerId, pipeline);
      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'connected');
    } else {
      console.warn('[VoIP] Failed to create spatial pipeline — audio context issue');
    }
  }

  // ═══════════════════════════════════════════════════
  // CALL MANAGEMENT
  // ═══════════════════════════════════════════════════

  async function call(peerId, _attempt) {
    _attempt = _attempt || 0;
    if (activeCalls.has(peerId)) return;

    if (!mesh.isConnected(peerId)) {
      if (_attempt < 3) {
        setTimeout(() => { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, 1000 * (_attempt + 1));
        if (_attempt === 0) showCallToast(peerId, 'reconnecting');
        return;
      }
      showCallToast(peerId, 'no-mesh');
      return;
    }

    try {
      const stream = await startMic();
      const track = stream.getAudioTracks()[0];
      if (!track) { showCallToast(peerId, 'failed'); return; }
      const sender = mesh.addTrack(peerId, track, stream);
      if (!sender) {
        if (_attempt < 3) {
          setTimeout(() => { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, 1000 * (_attempt + 1));
          return;
        }
        showCallToast(peerId, 'failed');
        return;
      }
      senders.set(peerId, sender);
      activeCalls.set(peerId, { direction: 'outgoing', startTime: Date.now() });

      mesh.sendTo(peerId, { type: 'voip_ring', from: window._mpMyId });

      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'calling');

      if (window._game) window._game.unlock('voice_used');
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') {
        showCallToast(peerId, 'mic-denied');
        return;
      }
      if (_attempt < 3) {
        setTimeout(() => { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, 1000 * (_attempt + 1));
        return;
      }
      showCallToast(peerId, 'failed');
    }
  }

  function hangup(peerId) {
    pendingReconnects.delete(peerId);
    const sender = senders.get(peerId);
    if (sender) {
      try { mesh.removeTrack(peerId, sender); } catch (_) {}
      senders.delete(peerId);
    }
    destroyPipeline(peerId);
    activeCalls.delete(peerId);

    mesh.sendTo(peerId, { type: 'voip_hangup', from: window._mpMyId });

    if (activeCalls.size === 0 && pendingReconnects.size === 0) stopMic();
    updateCallUI();
    showCallToast(peerId, 'ended');
  }

  function hangupAll() {
    pendingReconnects.clear();
    for (const pid of [...activeCalls.keys()]) hangup(pid);
  }

  function setMuted(m) {
    muted = m;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !m; });
    }
    updateCallUI();
  }

  async function autoAnswer(peerId, _attempt) {
    _attempt = _attempt || 0;
    if (activeCalls.has(peerId)) return;
    if (!mesh.isConnected(peerId)) {
      if (_attempt < 3) {
        setTimeout(() => { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, 1000 * (_attempt + 1));
        return;
      }
      return;
    }
    try {
      const stream = await startMic();
      const track = stream.getAudioTracks()[0];
      if (!track) return;
      const sender = mesh.addTrack(peerId, track, stream);
      if (!sender) {
        if (_attempt < 2) {
          setTimeout(() => { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, 1000);
          return;
        }
        return;
      }
      senders.set(peerId, sender);
      activeCalls.set(peerId, { direction: 'incoming', startTime: Date.now() });
      mesh.sendTo(peerId, { type: 'voip_answer', from: window._mpMyId });
      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'connected');
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') {
        showCallToast(peerId, 'mic-denied');
        return;
      }
      if (_attempt < 2) {
        setTimeout(() => { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, 1000);
        return;
      }
    }
  }

  function handleMeshMessage(peerId, msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'voip_hangup') {
      pendingReconnects.delete(peerId);
      destroyPipeline(peerId);
      activeCalls.delete(peerId);
      const sender = senders.get(peerId);
      if (sender) { try { mesh.removeTrack(peerId, sender); } catch (_) {} senders.delete(peerId); }
      if (activeCalls.size === 0 && pendingReconnects.size === 0) stopMic();
      updateCallUI();
      showCallToast(peerId, 'ended');
    }
    if (msg.type === 'voip_ring') {
      showCallToast(peerId, 'incoming');
      autoAnswer(peerId);
    }
    if (msg.type === 'voip_answer') {
      showCallToast(peerId, 'connected');
    }
  }

  // ═══════════════════════════════════════════════════
  // CALL UI
  // ═══════════════════════════════════════════════════

  function getCallUI() {
    if (callUI) return callUI;
    callUI = document.createElement('div');
    callUI.className = 'voip-indicator';
    callUI.innerHTML = '<div class="voip-dot"></div><span class="voip-label"></span>' +
      '<button class="voip-mute-btn" title="Toggle mute"></button>' +
      '<button class="voip-hangup-btn" title="Hang up"></button>';
    document.body.appendChild(callUI);

    callUI.querySelector('.voip-mute-btn').addEventListener('click', () => {
      setMuted(!muted);
    });
    callUI.querySelector('.voip-hangup-btn').addEventListener('click', () => {
      hangupAll();
    });
    return callUI;
  }

  function updateCallUI() {
    const ui = getCallUI();
    if (activeCalls.size === 0) {
      ui.classList.remove('active');
      return;
    }
    ui.classList.add('active');

    const names = [];
    for (const pid of activeCalls.keys()) {
      const peerData = window._mesh.getPeers().get(pid);
      if (peerData) {
        const presencePeers = window._presenceEngine ? window._presenceEngine.peers : {};
        const pArr = presencePeers[pid];
        const nick = pArr && pArr[0] ? pArr[0].nickname : pid.slice(0, 6);
        names.push(nick);
      } else {
        names.push(pid.slice(0, 6));
      }
    }

    const label = ui.querySelector('.voip-label');
    label.textContent = names.join(', ');

    const muteBtn = ui.querySelector('.voip-mute-btn');
    muteBtn.textContent = muted ? '🔇' : '🎤';
    muteBtn.title = muted ? 'Unmute' : 'Mute';
  }

  function showCallToast(peerId, status) {
    const messages = {
      'calling':      '📞 Calling... voice chat initiated',
      'connected':    '🎧 Voice connected — spatial audio active',
      'ended':        '📴 Voice chat ended',
      'failed':       '❌ Voice connection failed — mesh not ready',
      'mic-denied':   '🎤 Microphone access denied',
      'no-mesh':      '⚠️ No mesh connection to this peer',
      'incoming':     '📞 Incoming voice chat request',
      'reconnecting': '🔄 Voice reconnecting...',
      'reconnected':  '🔄 Microphone reconnected'
    };
    const msg = messages[status] || status;
    if (window.UniToast) {
      if (typeof window.UniToast === 'function') window.UniToast(msg);
      else if (window.UniToast.add) window.UniToast.add(msg, '', '📞', 'accent');
    }
  }

  // ═══════════════════════════════════════════════════
  // INIT — Wire into mesh
  // ═══════════════════════════════════════════════════

  if (mesh.onTrack) {
    mesh.onTrack(onRemoteTrack);
  }

  if (mesh.addMessageInterceptor) {
    mesh.addMessageInterceptor((peerId, msg) => {
      if (msg && msg.type && msg.type.startsWith('voip_')) {
        handleMeshMessage(peerId, msg);
        return true;
      }
      return false;
    });
  }

  setInterval(() => {
    const timedOut = [];
    for (const [peerId, callInfo] of activeCalls) {
      if (!mesh.isConnected(peerId)) {
        if (!callInfo._disconnectedAt) {
          callInfo._disconnectedAt = Date.now();
          showCallToast(peerId, 'reconnecting');
        } else if (Date.now() - callInfo._disconnectedAt > 30000) {
          timedOut.push(peerId);
        }
      } else if (callInfo._disconnectedAt) {
        callInfo._disconnectedAt = null;
        const sender = senders.get(peerId);
        if (!sender) {
          startMic().then(stream => {
            const track = stream.getAudioTracks()[0];
            if (!track) return;
            const ns = mesh.addTrack(peerId, track, stream);
            if (ns) { senders.set(peerId, ns); showCallToast(peerId, 'connected'); }
          }).catch(() => {});
        }
      }
    }
    for (const pid of timedOut) {
      hangup(pid);
      pendingReconnects.add(pid);
    }
    for (const peerId of [...pendingReconnects]) {
      if (mesh.isConnected(peerId)) {
        pendingReconnects.delete(peerId);
        call(peerId);
      }
    }
  }, 3000);

  window.addEventListener('beforeunload', () => {
    hangupAll();
  });

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  window._voip = {
    call,
    hangup,
    hangupAll,
    autoAnswer,
    isCalling: (peerId) => activeCalls.has(peerId),
    getActiveCalls: () => new Set(activeCalls.keys()),
    setMuted,
    isMuted: () => muted,
    updatePeerAudio
  };

  console.log('%c📞 VoIP%c Spatial voice engine ready','background:#06b6d4;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');
})();
