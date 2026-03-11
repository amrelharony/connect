// webauthn.js — Biometric Passkey Manager (WebAuthn / FIDO2)
// Passwordless authentication using device biometrics (FaceID, TouchID, Windows Hello).
// Credentials stored in Data Lake + localStorage; synced to Supabase when available.
(function PasskeyManager() {
  'use strict';

  const RP_NAME = "Amr's FinTech Portfolio";
  const RP_ID = 'amrelharony.com';
  const LS_KEY = '_passkey_creds';
  const LS_SESSION = '_passkey_session';
  const LAKE_STORE = 'auth';
  const CHALLENGE_BYTES = 32;
  const TIMEOUT_MS = 120000;

  let _authenticated = false;
  let _currentCredential = null;
  let _overlayEl = null;
  let _platformAvailable = null; // cached after async check

  // ═══════════════════════════════════════════════════
  // FEATURE DETECTION
  // ═══════════════════════════════════════════════════

  function isAvailable() {
    return !!(window.PublicKeyCredential &&
              navigator.credentials &&
              typeof navigator.credentials.create === 'function' &&
              typeof navigator.credentials.get === 'function');
  }

  async function isPlatformAvailable() {
    if (!isAvailable()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (_) { return false; }
  }

  // ═══════════════════════════════════════════════════
  // ENCODING HELPERS
  // ═══════════════════════════════════════════════════

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64ToBuf(b64) {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function generateChallenge() {
    const buf = new Uint8Array(CHALLENGE_BYTES);
    crypto.getRandomValues(buf);
    return buf;
  }

  function getUserId() {
    const vdna = window.VDna ? window.VDna.get() : {};
    if (vdna._passkeyUserId) return vdna._passkeyUserId;
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    if (window.VDna) { vdna._passkeyUserId = id; window.VDna.save(); }
    return id;
  }

  function getDisplayName() {
    try { return localStorage.getItem('arcade_player_name') || 'Portfolio Visitor'; } catch(_) { return 'Portfolio Visitor'; }
  }

  // ═══════════════════════════════════════════════════
  // CREDENTIAL STORAGE
  // ═══════════════════════════════════════════════════

  function loadCredentials() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function saveCredentials(creds) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(creds)); } catch (_) {}
    if (window._lake && window._lake.isReady) {
      window._lake.put(LAKE_STORE, 'credentials', JSON.stringify(creds));
    }
  }

  function addCredential(cred) {
    const creds = loadCredentials();
    creds.push(cred);
    saveCredentials(creds);
  }

  function setSession(credId) {
    _authenticated = true;
    _currentCredential = credId;
    try { sessionStorage.setItem(LS_SESSION, JSON.stringify({ credId, ts: window.getTrueTime ? window.getTrueTime() : Date.now() })); } catch (_) {}
    if (window._lake && window._lake.isReady) {
      window._lake.logEvent('passkey_auth', credId);
    }
    updateUI();
  }

  function clearSession() {
    _authenticated = false;
    _currentCredential = null;
    try { sessionStorage.removeItem(LS_SESSION); } catch (_) {}
    updateUI();
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(LS_SESSION);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s.credId || ((window.getTrueTime ? window.getTrueTime() : Date.now()) - s.ts) >= 86400000) return;
      const creds = loadCredentials();
      if (creds.length === 0 || !creds.some(c => c.credId === s.credId)) {
        sessionStorage.removeItem(LS_SESSION);
        return;
      }
      _authenticated = true;
      _currentCredential = s.credId;
      updateUI();
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════
  // WEBAUTHN REGISTRATION (Create Passkey)
  // ═══════════════════════════════════════════════════

  async function register(displayName) {
    if (!isAvailable()) throw new Error('WebAuthn not supported');

    const name = displayName || getDisplayName();
    const userId = getUserId();
    const challenge = generateChallenge();
    const existingCreds = loadCredentials();

    const createOptions = {
      publicKey: {
        rp: {
          name: RP_NAME,
          id: RP_ID
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: name,
          displayName: name
        },
        challenge: challenge,
        pubKeyCredParams: [
          { alg: -7,   type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        timeout: TIMEOUT_MS,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false
        },
        attestation: 'none',
        excludeCredentials: existingCreds.map(c => ({
          id: b64ToBuf(c.credId),
          type: 'public-key',
          transports: ['internal']
        }))
      }
    };

    const credential = await navigator.credentials.create(createOptions);
    if (!credential) throw new Error('Registration cancelled');

    const credData = {
      credId: bufToB64(credential.rawId),
      publicKey: bufToB64(credential.response.getPublicKey ? credential.response.getPublicKey() : new ArrayBuffer(0)),
      algorithm: credential.response.getPublicKeyAlgorithm ? credential.response.getPublicKeyAlgorithm() : -7,
      displayName: name,
      createdAt: Date.now(),
      authenticatorType: 'platform',
      transports: credential.response.getTransports ? credential.response.getTransports() : ['internal'],
      userAgent: navigator.userAgent.slice(0, 80)
    };

    addCredential(credData);
    setSession(credData.credId);

    if (window.VDna) {
      const p = window.VDna.get();
      p._passkeyRegistered = true;
      p._passkeyDisplayName = name;
      p._passkeyRegisteredAt = Date.now();
      window.VDna.save();
    }

    syncToSupabase(credData);

    return credData;
  }

  // ═══════════════════════════════════════════════════
  // WEBAUTHN AUTHENTICATION (Verify Identity)
  // ═══════════════════════════════════════════════════

  async function authenticate() {
    if (!isAvailable()) throw new Error('WebAuthn not supported');

    const creds = loadCredentials();
    if (creds.length === 0) throw new Error('No passkeys registered');

    const challenge = generateChallenge();

    const getOptions = {
      publicKey: {
        challenge: challenge,
        timeout: TIMEOUT_MS,
        rpId: RP_ID,
        allowCredentials: creds.map(c => ({
          id: b64ToBuf(c.credId),
          type: 'public-key',
          transports: c.transports || ['internal']
        })),
        userVerification: 'required'
      }
    };

    const assertion = await navigator.credentials.get(getOptions);
    if (!assertion) throw new Error('Authentication cancelled');
    const usedCredId = bufToB64(assertion.rawId);
    const matchedCred = creds.find(c => c.credId === usedCredId);

    if (matchedCred) {
      matchedCred.lastUsed = Date.now();
      matchedCred.useCount = (matchedCred.useCount || 0) + 1;
      saveCredentials(creds);
    }

    setSession(usedCredId);

    return {
      credId: usedCredId,
      displayName: matchedCred ? matchedCred.displayName : 'Unknown',
      authenticatorData: bufToB64(assertion.response.authenticatorData),
      signature: bufToB64(assertion.response.signature)
    };
  }

  // ═══════════════════════════════════════════════════
  // SUPABASE SYNC
  // ═══════════════════════════════════════════════════

  async function syncToSupabase(credData) {
    if (!window._sb) return;
    try {
      const playerName = getDisplayName();
      await window._sb.from('passkey_profiles').insert({
        cred_id: credData.credId,
        display_name: credData.displayName,
        player_name: playerName,
        created_at: new Date(credData.createdAt).toISOString(),
        authenticator_type: credData.authenticatorType,
        algorithm: credData.algorithm
      });
    } catch (e) { if(window.AmrOS)window.AmrOS.logError('WebAuthn','passkey_profiles insert: '+((e&&e.message)||e)); }
  }

  // ═══════════════════════════════════════════════════
  // UI OVERLAY
  // ═══════════════════════════════════════════════════

  function buildOverlay() {
    if (document.getElementById('passkeyOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'passkeyOverlay';
    ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); });
    ov.innerHTML = `<div class="pk-panel">
      <div class="pk-header">
        <div class="pk-shield">🔐</div>
        <div class="pk-title">Biometric Passkeys</div>
        <div class="pk-subtitle">WebAuthn · FIDO2 · Passwordless</div>
      </div>
      <div class="pk-body" id="pkBody"></div>
      <div class="pk-footer">
        <div class="pk-tech">
          <span class="pk-chip"><i class="fa-solid fa-fingerprint"></i> Platform Authenticator</span>
          <span class="pk-chip"><i class="fa-solid fa-shield-halved"></i> ECDSA P-256</span>
          <span class="pk-chip"><i class="fa-solid fa-lock"></i> No Passwords</span>
        </div>
        <div class="pk-close" onclick="window._closePasskey()">[ ESC or tap to close ]</div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    _overlayEl = ov;
  }

  function renderBody() {
    const body = document.getElementById('pkBody');
    if (!body) return;

    const creds = loadCredentials();
    const platformReady = isAvailable();

    if (!platformReady) {
      body.innerHTML = `
        <div class="pk-state pk-unavail">
          <div class="pk-state-icon">⚠️</div>
          <div class="pk-state-title">WebAuthn Not Available</div>
          <div class="pk-state-desc">Your browser or device doesn't support biometric passkeys. Try Chrome, Edge, or Safari on a device with FaceID, TouchID, or Windows Hello.</div>
        </div>`;
      return;
    }

    if (_authenticated && creds.length > 0) {
      const active = creds.find(c => c.credId === _currentCredential) || creds[0];
      body.innerHTML = `
        <div class="pk-state pk-authed">
          <div class="pk-state-icon">✅</div>
          <div class="pk-state-title">Identity Verified</div>
          <div class="pk-state-desc">Authenticated via biometric passkey</div>
        </div>
        <div class="pk-cred-card">
          <div class="pk-cred-top">
            <div class="pk-cred-avatar"><i class="fa-solid fa-fingerprint"></i></div>
            <div class="pk-cred-info">
              <div class="pk-cred-name">${escHtml(active.displayName)}</div>
              <div class="pk-cred-id">${active.credId.slice(0, 16)}...</div>
            </div>
            <div class="pk-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</div>
          </div>
          <div class="pk-cred-details">
            <div class="pk-cred-row"><span>Created</span><span>${new Date(active.createdAt).toLocaleDateString()}</span></div>
            <div class="pk-cred-row"><span>Algorithm</span><span>${active.algorithm === -7 ? 'ES256 (P-256)' : 'RS256'}</span></div>
            <div class="pk-cred-row"><span>Transports</span><span>${(active.transports || ['internal']).join(', ')}</span></div>
            ${active.lastUsed ? `<div class="pk-cred-row"><span>Last Used</span><span>${new Date(active.lastUsed).toLocaleDateString()}</span></div>` : ''}
            ${active.useCount ? `<div class="pk-cred-row"><span>Authentications</span><span>${active.useCount}</span></div>` : ''}
          </div>
        </div>
        <div class="pk-actions">
          <button class="pk-btn pk-btn-verify" onclick="window._passkeyReauth()"><i class="fa-solid fa-fingerprint"></i> Re-Authenticate</button>
          <button class="pk-btn pk-btn-secondary" onclick="window._passkeyRevoke()"><i class="fa-solid fa-trash-can"></i> Revoke Passkey</button>
        </div>
        ${creds.length > 1 ? `<div class="pk-multi">${creds.length} passkeys registered on this device</div>` : ''}`;
    } else if (creds.length > 0) {
      body.innerHTML = `
        <div class="pk-state pk-locked">
          <div class="pk-state-icon">🔒</div>
          <div class="pk-state-title">Passkey Registered</div>
          <div class="pk-state-desc">Authenticate with your biometric to verify your identity and secure your scores.</div>
        </div>
        <div class="pk-actions">
          <button class="pk-btn pk-btn-primary" onclick="window._passkeyAuth()">
            <i class="fa-solid fa-fingerprint"></i>
            <span>Authenticate with Biometric</span>
          </button>
        </div>`;
    } else {
      body.innerHTML = `
        <div class="pk-state pk-new">
          <div class="pk-state-icon">🛡️</div>
          <div class="pk-state-title">Secure Your Wallet</div>
          <div class="pk-state-desc">Create a passwordless account using your device's native biometrics. Your arcade scores and identity are cryptographically bound to your fingerprint or face — the same technology used in FinTech banking apps.</div>
        </div>
        <div class="pk-name-input">
          <label class="pk-label" for="pkName">Display Name</label>
          <input class="pk-input" id="pkName" type="text" placeholder="${escHtml(getDisplayName())}" maxlength="30" autocomplete="off" spellcheck="false">
        </div>
        <div class="pk-actions">
          <button class="pk-btn pk-btn-primary" onclick="window._passkeyRegister()">
            <i class="fa-solid fa-fingerprint"></i>
            <span>Create Passkey</span>
          </button>
        </div>
        <div class="pk-features">
          <div class="pk-feat"><i class="fa-solid fa-face-smile"></i><span>FaceID / TouchID / Windows Hello</span></div>
          <div class="pk-feat"><i class="fa-solid fa-key"></i><span>No passwords — cryptographic keys only</span></div>
          <div class="pk-feat"><i class="fa-solid fa-database"></i><span>Credentials stored in your Data Lake</span></div>
          <div class="pk-feat"><i class="fa-solid fa-trophy"></i><span>Verified badge on arcade leaderboards</span></div>
        </div>`;
    }
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function openOverlay() {
    buildOverlay();
    renderBody();
    const ov = document.getElementById('passkeyOverlay');
    if (ov) {
      ov.classList.add('show');
      if (window._haptic) window._haptic.menuOpen();
      if (window.autoDismiss) window.autoDismiss('passkeyOverlay', closeOverlay);
      const nameInput = document.getElementById('pkName');
      if (nameInput) setTimeout(() => nameInput.focus(), 350);
    }
  }

  function closeOverlay() {
    const ov = document.getElementById('passkeyOverlay');
    if (ov) ov.classList.remove('show');
    if (window._haptic) window._haptic.menuClose();
    if (window.cancelAutoDismiss) window.cancelAutoDismiss('passkeyOverlay');
  }

  function updateUI() {
    const lockBtn = document.getElementById('pkLockBtn');
    if (lockBtn) {
      lockBtn.innerHTML = _authenticated
        ? '<i class="fa-solid fa-lock-open"></i>'
        : '<i class="fa-solid fa-lock"></i>';
      lockBtn.title = _authenticated ? 'Passkey Verified' : 'Secure with Passkey';
      if (_authenticated) lockBtn.classList.add('pk-active');
      else lockBtn.classList.remove('pk-active');
    }

    if (_overlayEl && _overlayEl.classList.contains('show')) renderBody();
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC ACTIONS (bound to UI buttons)
  // ═══════════════════════════════════════════════════

  window._passkeyRegister = async function() {
    const nameInput = document.getElementById('pkName');
    const name = (nameInput && nameInput.value.trim()) || getDisplayName();
    const btn = document.querySelector('.pk-btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning biometric...'; }

    try {
      const cred = await register(name);
      if (window.UniToast && window.UniToast.add) {
        window.UniToast.add('🔐 Passkey Created', 'Identity secured with biometric — ' + cred.displayName, '🛡️', 'accent');
      }
      if (window._game) window._game.unlock('passkey_registered');
      if (window.VDna) window.VDna.addXp(50);
      renderBody();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i><span>Create Passkey</span>'; }
      if (err.name !== 'NotAllowedError') {
        if (window.UniToast && window.UniToast.add) {
          window.UniToast.add('Passkey Error', err.message || 'Registration failed', '⚠️', 'warn');
        }
      }
    }
  };

  window._passkeyAuth = async function() {
    const btn = document.querySelector('.pk-btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...'; }

    try {
      const result = await authenticate();
      if (window.UniToast && window.UniToast.add) {
        window.UniToast.add('✅ Identity Verified', 'Authenticated as ' + result.displayName, '🔓', 'accent');
      }
      if (window._game) window._game.unlock('passkey_verified');
      if (window.VDna) window.VDna.addXp(15);
      renderBody();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i><span>Authenticate with Biometric</span>'; }
      if (err.name !== 'NotAllowedError') {
        if (window.UniToast && window.UniToast.add) {
          window.UniToast.add('Auth Failed', err.message || 'Authentication failed', '⚠️', 'warn');
        }
      }
    }
  };

  window._passkeyReauth = async function() {
    try {
      const result = await authenticate();
      if (window.UniToast && window.UniToast.add) {
        window.UniToast.add('✅ Re-Authenticated', 'Session refreshed for ' + result.displayName, '🔓', 'accent');
      }
      renderBody();
    } catch (err) {
      if (err.name !== 'NotAllowedError' && window.UniToast && window.UniToast.add) {
        window.UniToast.add('Auth Failed', err.message, '⚠️', 'warn');
      }
    }
  };

  window._passkeyRevoke = function() {
    if (!confirm('Revoke all passkeys? You can re-register anytime.')) return;
    saveCredentials([]);
    clearSession();
    if (window.VDna) {
      const p = window.VDna.get();
      delete p._passkeyRegistered;
      delete p._passkeyDisplayName;
      delete p._passkeyUserId;
      delete p._passkeyRegisteredAt;
      window.VDna.save();
    }
    if (window.UniToast && window.UniToast.add) {
      window.UniToast.add('Passkey Revoked', 'All credentials removed', '🗑️', 'accent');
    }
    renderBody();
  };

  window._openPasskey = openOverlay;
  window._closePasskey = closeOverlay;

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  window._passkey = {
    isAvailable,
    isPlatformAvailable,
    get platformReady() { return _platformAvailable === true; },
    get isAuthenticated() { return _authenticated; },
    get currentCredential() { return _currentCredential; },
    get credentialCount() { return loadCredentials().length; },
    getDisplayName() {
      const creds = loadCredentials();
      const active = creds.find(c => c.credId === _currentCredential);
      return active ? active.displayName : null;
    },
    getVerifiedName() {
      if (!_authenticated) return null;
      const creds = loadCredentials();
      const active = creds.find(c => c.credId === _currentCredential);
      return active ? active.displayName : null;
    },
    register,
    authenticate,
    open: openOverlay,
    close: closeOverlay,
    revoke() {
      saveCredentials([]);
      clearSession();
      if (window.VDna) {
        const p = window.VDna.get();
        delete p._passkeyRegistered;
        delete p._passkeyDisplayName;
        delete p._passkeyUserId;
        delete p._passkeyRegisteredAt;
        window.VDna.save();
      }
    }
  };

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════

  restoreSession();

  isPlatformAvailable().then(avail => {
    _platformAvailable = avail;
    if (avail) {
      console.log('%c🔐 WebAuthn: Platform authenticator available', 'background:#22c55e;color:#fff;padding:2px 5px;border-radius:3px;');
    } else {
      console.log('%c🔐 WebAuthn: Not available on this device', 'background:#6b7a90;color:#fff;padding:2px 5px;border-radius:3px;');
    }
  });

})();
