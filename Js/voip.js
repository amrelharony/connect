// voip.js — Spatial VoIP Engine (Resilient)
// Attaches audio MediaStream tracks to existing WebRTC RTCPeerConnections
// from mesh.js. Routes incoming audio through Web Audio API with HRTF
// PannerNode (cursor x/y) + GainNode (scroll distance) for 3D spatial voice.

(function SpatialVoIP() {
  'use strict';

  var mesh = window._mesh;
  if (!mesh) { console.warn('[VoIP] Mesh not available — VoIP disabled.'); return; }

  var localStream = null;
  var muted = false;
  var activeCalls = new Map();
  var peerPipelines = new Map();
  var senders = new Map();
  var ctx = null;
  var masterGain = null;
  var callUI = null;
  var pendingReconnects = new Set();
  var _micAcquiring = false;
  var _destroyed = false;

  // ═══════════════════════════════════════════════════
  // PRE-WARMED AUDIO POOL (Safari autoplay workaround)
  // ═══════════════════════════════════════════════════

  var _audioPool = [];
  var _poolWarmed = false;

  function warmAudioPool() {
    if (_poolWarmed) return;
    _poolWarmed = true;
    for (var i = 0; i < 4; i++) {
      var el = document.createElement('audio');
      el.style.display = 'none';
      document.body.appendChild(el);
      var silentCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = silentCtx.createOscillator();
      var silentGain = silentCtx.createGain();
      silentGain.gain.value = 0;
      osc.connect(silentGain);
      silentGain.connect(silentCtx.destination);
      var dest = silentCtx.createMediaStreamDestination();
      silentGain.connect(dest);
      el.srcObject = dest.stream;
      el.play().catch(function() {});
      osc.start();
      setTimeout(function(o, c) { o.stop(); c.close(); }.bind(null, osc, silentCtx), 200);
      _audioPool.push(el);
    }
  }

  ['click', 'touchstart'].forEach(function(evt) {
    document.addEventListener(evt, warmAudioPool, { once: true, passive: true });
  });

  // ═══════════════════════════════════════════════════
  // RETRY UTILITIES
  // ═══════════════════════════════════════════════════

  function backoffDelay(attempt, base, cap) {
    base = base || 1000;
    cap = cap || 15000;
    var delay = Math.min(base * Math.pow(2, attempt), cap);
    return delay + Math.random() * delay * 0.3;
  }

  function retrySend(peerId, msg, maxRetries) {
    maxRetries = maxRetries || 3;
    var attempt = 0;
    function tryOnce() {
      if (_destroyed) return;
      try {
        if (mesh.isConnected(peerId)) {
          mesh.sendTo(peerId, msg);
          return;
        }
      } catch (e) { if(window.AmrOS)window.AmrOS.logError('VoIP','sendTo retry: '+((e&&e.message)||e)); }
      attempt++;
      if (attempt < maxRetries) {
        setTimeout(tryOnce, backoffDelay(attempt, 500, 4000));
      }
    }
    tryOnce();
  }

  // ═══════════════════════════════════════════════════
  // MICROPHONE CAPTURE (race-protected)
  // ═══════════════════════════════════════════════════

  function startMic() {
    if (localStream) {
      var track = localStream.getAudioTracks()[0];
      if (track && track.readyState === 'live') return Promise.resolve(localStream);
      localStream.getTracks().forEach(function(t) { t.stop(); });
      localStream = null;
    }
    if (_micAcquiring) {
      return new Promise(function(resolve, reject) {
        var waited = 0;
        var iv = setInterval(function() {
          waited += 100;
          if (localStream) { clearInterval(iv); resolve(localStream); }
          else if (waited > 8000 || !_micAcquiring) { clearInterval(iv); reject(new Error('mic-timeout')); }
        }, 100);
      });
    }
    _micAcquiring = true;
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    }).then(function(stream) {
      _micAcquiring = false;
      if (_destroyed) { stream.getTracks().forEach(function(t) { t.stop(); }); return null; }
      localStream = stream;
      localStream.getAudioTracks().forEach(function(t) {
        t.addEventListener('ended', onMicTrackEnded, { once: true });
      });
      return localStream;
    }).catch(function(e) {
      _micAcquiring = false;
      throw e;
    });
  }

  function onMicTrackEnded() {
    if (activeCalls.size === 0) return;
    localStream = null;
    startMic().then(function(newStream) {
      if (!newStream) return;
      var newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;
      var promises = [];
      senders.forEach(function(sender, peerId) {
        promises.push(
          Promise.resolve().then(function() {
            return sender.replaceTrack(newTrack);
          }).catch(function() {
            var ns = mesh.addTrack(peerId, newTrack, newStream);
            if (ns) senders.set(peerId, ns);
          })
        );
      });
      Promise.all(promises).then(function() {
        showCallToast(null, 'reconnected');
      });
    }).catch(function() {
      hangupAll();
      showCallToast(null, 'mic-denied');
    });
  }

  function stopMic() {
    if (!localStream) return;
    localStream.getTracks().forEach(function(t) {
      t.removeEventListener('ended', onMicTrackEnded);
      t.stop();
    });
    localStream = null;
  }

  // ═══════════════════════════════════════════════════
  // AUDIO CONTEXT (resilient acquisition + recovery)
  // ═══════════════════════════════════════════════════

  function ensureAudioCtx() {
    if (ctx && ctx.state !== 'closed') {
      if (ctx.state === 'suspended') ctx.resume().catch(function() {});
      return true;
    }
    var sa = window._spatialAudio;
    if (sa) {
      ctx = sa.getCtx();
      masterGain = sa.getMaster();
    }
    if (!ctx || ctx.state === 'closed') {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { console.warn('[VoIP] Cannot create AudioContext'); return false; }
    }
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function() {});

    ctx.addEventListener('statechange', onCtxStateChange);

    if (ctx.listener.positionX) {
      ctx.listener.positionX.value = 0;
      ctx.listener.positionY.value = 0;
      ctx.listener.positionZ.value = 0;
    } else {
      ctx.listener.setPosition(0, 0, 0);
    }
    return true;
  }

  function onCtxStateChange() {
    if (!ctx) return;
    if (ctx.state === 'suspended' && activeCalls.size > 0) {
      ctx.resume().catch(function() {});
    }
    if (ctx.state === 'closed' && activeCalls.size > 0) {
      ctx = null;
      masterGain = null;
      if (ensureAudioCtx()) {
        rebuildAllPipelines();
      }
    }
  }

  function rebuildAllPipelines() {
    peerPipelines.forEach(function(pipeline, peerId) {
      if (pipeline.stream) {
        destroyPipeline(peerId);
        var newPipeline = createSpatialPipeline(pipeline.stream);
        if (newPipeline) peerPipelines.set(peerId, newPipeline);
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // SPATIAL AUDIO PIPELINE (per-peer)
  // ═══════════════════════════════════════════════════

  function createSpatialPipeline(remoteStream) {
    try {
      var audioEl = _audioPool.length > 0 ? _audioPool.pop() : document.createElement('audio');
      audioEl.srcObject = remoteStream;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.style.display = 'none';
      if (!audioEl.parentNode) document.body.appendChild(audioEl);

      var playPromise = audioEl.play();
      if (playPromise) {
        playPromise.catch(function(e) {
          console.warn('[VoIP] Audio element play blocked:', e.message);
          retryPlay(audioEl, 0);
        });
      }

      return { source: null, panner: null, gain: null, stream: remoteStream, audioEl: audioEl, healthy: true, silentSince: 0 };
    } catch (e) {
      console.warn('[VoIP] Pipeline creation threw:', e.message);
      return null;
    }
  }

  function retryPlay(audioEl, attempt) {
    if (attempt >= 5 || !audioEl || !audioEl.srcObject) return;
    setTimeout(function() {
      if (!audioEl.srcObject) return;
      audioEl.play().catch(function() {
        retryPlay(audioEl, attempt + 1);
      });
    }, backoffDelay(attempt, 300, 5000));
  }

  function destroyPipeline(peerId) {
    var p = peerPipelines.get(peerId);
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
    var pipeline = peerPipelines.get(peerId);
    if (!pipeline) return;
    if (pipeline.audioEl) {
      var peerScroll = peerData.scrollPct || 0;
      var myScroll = window._mpMyScrollPct || 0;
      var scrollDist = Math.abs(peerScroll - myScroll) / 100;
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
    var pipeline = createSpatialPipeline(stream);
    if (pipeline) {
      peerPipelines.set(peerId, pipeline);
      monitorRemoteTrack(peerId, track);
      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'connected');
    } else {
      console.warn('[VoIP] Failed to create spatial pipeline — retrying');
      setTimeout(function() {
        if (activeCalls.has(peerId)) onRemoteTrack(peerId, stream, track);
      }, 1500);
    }
  }

  function monitorRemoteTrack(peerId, track) {
    track.addEventListener('ended', function() {
      if (activeCalls.has(peerId)) {
        showCallToast(peerId, 'reconnecting');
      }
    }, { once: true });

    track.addEventListener('mute', function() {
      var pipeline = peerPipelines.get(peerId);
      if (pipeline) pipeline.healthy = false;
    });

    track.addEventListener('unmute', function() {
      var pipeline = peerPipelines.get(peerId);
      if (pipeline) { pipeline.healthy = true; pipeline.silentSince = 0; }
    });
  }

  // ═══════════════════════════════════════════════════
  // CALL MANAGEMENT (exponential backoff)
  // ═══════════════════════════════════════════════════

  function call(peerId, _attempt) {
    _attempt = _attempt || 0;
    if (_destroyed || activeCalls.has(peerId)) return;
    if (window.AmrOS && window.AmrOS.offlineMode) { showCallToast(peerId, 'no-mesh'); return; }

    if (!mesh.isConnected(peerId)) {
      if (_attempt < 5) {
        setTimeout(function() { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, backoffDelay(_attempt));
        if (_attempt === 0) showCallToast(peerId, 'reconnecting');
        return;
      }
      showCallToast(peerId, 'no-mesh');
      return;
    }

    startMic().then(function(stream) {
      if (!stream) { showCallToast(peerId, 'failed'); return; }
      var track = stream.getAudioTracks()[0];
      if (!track) { showCallToast(peerId, 'failed'); return; }
      var sender = mesh.addTrack(peerId, track, stream);
      if (!sender) {
        if (_attempt < 5) {
          setTimeout(function() { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, backoffDelay(_attempt));
          return;
        }
        showCallToast(peerId, 'failed');
        return;
      }
      senders.set(peerId, sender);
      activeCalls.set(peerId, { direction: 'outgoing', startTime: Date.now() });

      retrySend(peerId, { type: 'voip_ring', from: window._mpMyId });

      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'calling');

      if (window._game) window._game.unlock('voice_used');
    }).catch(function(e) {
      if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') {
        showCallToast(peerId, 'mic-denied');
        return;
      }
      if (_attempt < 5) {
        setTimeout(function() { if (!activeCalls.has(peerId)) call(peerId, _attempt + 1); }, backoffDelay(_attempt));
        return;
      }
      showCallToast(peerId, 'failed');
    });
  }

  function hangup(peerId) {
    pendingReconnects.delete(peerId);
    var sender = senders.get(peerId);
    if (sender) {
      try { mesh.removeTrack(peerId, sender); } catch (e) { if(window.AmrOS)window.AmrOS.logError('VoIP','removeTrack hangup: '+((e&&e.message)||e)); }
      senders.delete(peerId);
    }
    destroyPipeline(peerId);
    activeCalls.delete(peerId);

    retrySend(peerId, { type: 'voip_hangup', from: window._mpMyId });

    if (activeCalls.size === 0 && pendingReconnects.size === 0) stopMic();
    updateCallUI();
    showCallToast(peerId, 'ended');
  }

  function hangupAll() {
    pendingReconnects.clear();
    var pids = [];
    activeCalls.forEach(function(_, pid) { pids.push(pid); });
    pids.forEach(function(pid) { hangup(pid); });
  }

  function setMuted(m) {
    muted = m;
    if (localStream) {
      localStream.getAudioTracks().forEach(function(t) { t.enabled = !m; });
    }
    updateCallUI();
  }

  function autoAnswer(peerId, _attempt) {
    _attempt = _attempt || 0;
    if (_destroyed || activeCalls.has(peerId)) return;
    if (!mesh.isConnected(peerId)) {
      if (_attempt < 5) {
        setTimeout(function() { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, backoffDelay(_attempt));
        return;
      }
      return;
    }
    startMic().then(function(stream) {
      if (!stream) return;
      var track = stream.getAudioTracks()[0];
      if (!track) return;
      var sender = mesh.addTrack(peerId, track, stream);
      if (!sender) {
        if (_attempt < 4) {
          setTimeout(function() { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, backoffDelay(_attempt));
          return;
        }
        return;
      }
      senders.set(peerId, sender);
      activeCalls.set(peerId, { direction: 'incoming', startTime: Date.now() });
      retrySend(peerId, { type: 'voip_answer', from: window._mpMyId });
      updateCallUI();
      if (window._haptic) window._haptic.success();
      showCallToast(peerId, 'connected');
    }).catch(function(e) {
      if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') {
        showCallToast(peerId, 'mic-denied');
        return;
      }
      if (_attempt < 4) {
        setTimeout(function() { if (!activeCalls.has(peerId)) autoAnswer(peerId, _attempt + 1); }, backoffDelay(_attempt));
        return;
      }
    });
  }

  function handleMeshMessage(peerId, msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'voip_hangup') {
      pendingReconnects.delete(peerId);
      destroyPipeline(peerId);
      activeCalls.delete(peerId);
      var sender = senders.get(peerId);
      if (sender) { try { mesh.removeTrack(peerId, sender); } catch (e) { if(window.AmrOS)window.AmrOS.logError('VoIP','removeTrack msg: '+((e&&e.message)||e)); } senders.delete(peerId); }
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
    callUI.setAttribute('role', 'status');
    callUI.setAttribute('aria-live', 'polite');
    callUI.setAttribute('aria-label', 'Voice call controls');
    callUI.innerHTML = '<div class="voip-dot" aria-hidden="true"></div><span class="voip-label"></span>' +
      '<button class="voip-mute-btn" title="Toggle mute" aria-label="Toggle mute"></button>' +
      '<button class="voip-hangup-btn" title="Hang up" aria-label="Hang up call"></button>';
    document.body.appendChild(callUI);

    callUI.querySelector('.voip-mute-btn').addEventListener('click', function() {
      setMuted(!muted);
    });
    callUI.querySelector('.voip-hangup-btn').addEventListener('click', function() {
      hangupAll();
    });
    return callUI;
  }

  function updateCallUI() {
    var ui = getCallUI();
    if (activeCalls.size === 0) {
      ui.classList.remove('active');
      return;
    }
    ui.classList.add('active');

    var names = [];
    activeCalls.forEach(function(_, pid) {
      var peerData = window._mesh.getPeers().get(pid);
      if (peerData) {
        var presencePeers = window._presenceEngine ? window._presenceEngine.peers : {};
        var pArr = presencePeers[pid];
        var nick = pArr && pArr[0] ? pArr[0].nickname : pid.slice(0, 6);
        names.push(nick);
      } else {
        names.push(pid.slice(0, 6));
      }
    });

    var label = ui.querySelector('.voip-label');
    label.textContent = names.join(', ');

    var muteBtn = ui.querySelector('.voip-mute-btn');
    muteBtn.textContent = muted ? '🔇' : '🎤';
    muteBtn.title = muted ? 'Unmute' : 'Mute';
  }

  function showCallToast(peerId, status) {
    var messages = {
      'calling':      '📞 Calling... voice chat initiated',
      'connected':    '🎧 Voice connected — spatial audio active',
      'ended':        '📴 Voice chat ended',
      'failed':       '❌ Voice connection failed — mesh not ready',
      'mic-denied':   '🎤 Microphone access denied',
      'no-mesh':      '⚠️ No mesh connection to this peer',
      'incoming':     '📞 Incoming voice chat request',
      'reconnecting': '🔄 Voice reconnecting...',
      'reconnected':  '🔄 Microphone reconnected',
      'degraded':     '⚠️ Audio quality degraded — monitoring'
    };
    var msg = messages[status] || status;
    if (window.UniToast) {
      if (typeof window.UniToast === 'function') window.UniToast(msg);
      else if (window.UniToast.add) window.UniToast.add(msg, '', '📞', 'accent');
    }
  }

  // ═══════════════════════════════════════════════════
  // VISIBILITY CHANGE — suspend/resume on tab switch
  // ═══════════════════════════════════════════════════

  document.addEventListener('visibilitychange', function() {
    if (activeCalls.size === 0) return;
    if (document.hidden) {
      if (localStream) {
        localStream.getAudioTracks().forEach(function(t) {
          if (t.readyState === 'live' && t.enabled) t._wasEnabled = true;
        });
      }
    } else {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function() {});

      if (localStream) {
        var track = localStream.getAudioTracks()[0];
        if (!track || track.readyState !== 'live') {
          onMicTrackEnded();
        }
      }

      peerPipelines.forEach(function(pipeline) {
        if (pipeline.audioEl && pipeline.audioEl.paused && pipeline.audioEl.srcObject) {
          pipeline.audioEl.play().catch(function() {});
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════
  // HEALTH CHECK (connection + audio stream health)
  // ═══════════════════════════════════════════════════

  var _healthInterval = setInterval(function() {
    if (_destroyed) return;

    // Check local mic health
    if (activeCalls.size > 0 && localStream) {
      var localTrack = localStream.getAudioTracks()[0];
      if (!localTrack || localTrack.readyState !== 'live') {
        onMicTrackEnded();
      }
    }

    // Check remote stream health
    peerPipelines.forEach(function(pipeline, peerId) {
      if (!pipeline.audioEl) return;
      var stream = pipeline.audioEl.srcObject;
      if (!stream) { pipeline.healthy = false; return; }
      var tracks = stream.getAudioTracks();
      if (tracks.length === 0 || tracks[0].readyState === 'ended') {
        pipeline.healthy = false;
      }
    });

    // Check mesh connectivity for active calls
    var timedOut = [];
    activeCalls.forEach(function(callInfo, peerId) {
      if (!mesh.isConnected(peerId)) {
        if (!callInfo._disconnectedAt) {
          callInfo._disconnectedAt = Date.now();
          showCallToast(peerId, 'reconnecting');
        } else if (Date.now() - callInfo._disconnectedAt > 30000) {
          timedOut.push(peerId);
        }
      } else if (callInfo._disconnectedAt) {
        callInfo._disconnectedAt = null;
        var sender = senders.get(peerId);
        if (!sender) {
          startMic().then(function(stream) {
            if (!stream) return;
            var track = stream.getAudioTracks()[0];
            if (!track) return;
            var ns = mesh.addTrack(peerId, track, stream);
            if (ns) {
              senders.set(peerId, ns);
              showCallToast(peerId, 'connected');
            }
          }).catch(function() {
            showCallToast(peerId, 'reconnecting');
          });
        } else {
          showCallToast(peerId, 'reconnected');
        }
      }

      // Detect stale pipeline (unhealthy for > 10s)
      var pipeline = peerPipelines.get(peerId);
      if (pipeline && !pipeline.healthy) {
        if (!pipeline.silentSince) {
          pipeline.silentSince = Date.now();
        } else if (Date.now() - pipeline.silentSince > 10000) {
          showCallToast(peerId, 'degraded');
          pipeline.silentSince = Date.now();
        }
      }
    });

    timedOut.forEach(function(pid) {
      hangup(pid);
      pendingReconnects.add(pid);
    });

    pendingReconnects.forEach(function(peerId) {
      if (mesh.isConnected(peerId)) {
        pendingReconnects.delete(peerId);
        call(peerId);
      }
    });
  }, 3000);

  window.addEventListener('beforeunload', function() {
    _destroyed = true;
    clearInterval(_healthInterval);
    hangupAll();
  });

  // ═══════════════════════════════════════════════════
  // INIT — Wire into mesh
  // ═══════════════════════════════════════════════════

  if (mesh.onTrack) {
    mesh.onTrack(onRemoteTrack);
  }

  if (mesh.addMessageInterceptor) {
    mesh.addMessageInterceptor(function(peerId, msg) {
      if (msg && msg.type && msg.type.startsWith('voip_')) {
        handleMeshMessage(peerId, msg);
        return true;
      }
      return false;
    });
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  window._voip = {
    call: call,
    hangup: hangup,
    hangupAll: hangupAll,
    autoAnswer: autoAnswer,
    isCalling: function(peerId) { return activeCalls.has(peerId); },
    getActiveCalls: function() { return new Set(activeCalls.keys()); },
    setMuted: setMuted,
    isMuted: function() { return muted; },
    updatePeerAudio: updatePeerAudio
  };

  console.log('%c📞 VoIP%c Spatial voice engine ready (resilient)','background:#06b6d4;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');
})();
