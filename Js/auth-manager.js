// auth-manager.js — Just-In-Time Anonymous Auth with Progressive Enhancement
// Generates a Supabase anonymous session only when a visitor takes an action
// that requires database persistence (guestbook, arcade, NFT, etc.).
// Returning visitors reuse their existing session (stored in localStorage by Supabase SDK).
(function AuthManagerInit() {
  'use strict';

  const AuthManager = {
    _sessionPromise: null,
    _hasValidSession: false,
    _listeners: [],

    getSession() {
      if (this._sessionPromise) return this._sessionPromise;
      this._sessionPromise = this._resolve();
      this._sessionPromise.catch(() => {
        this._sessionPromise = null;
        this._hasValidSession = false;
      });
      return this._sessionPromise;
    },

    async _resolve() {
      if (!window._sb) {
        this._sessionPromise = null;
        this._hasValidSession = false;
        return null;
      }
      try {
        const { data: { session } } = await window._sb.auth.getSession();
        if (session) {
          this._hasValidSession = true;
          return session;
        }
      } catch (e) {
        console.warn('[AuthManager] getSession check failed:', e.message);
      }
      try {
        const { data, error } = await window._sb.auth.signInAnonymously();
        if (error) throw error;
        this._hasValidSession = true;
        this._notifyListeners(data.session);
        return data.session;
      } catch (e) {
        console.error('[AuthManager] Anonymous sign-in failed:', e.message);
        this._sessionPromise = null;
        this._hasValidSession = false;
        return null;
      }
    },

    async getUid() {
      const s = await this.getSession();
      return s?.user?.id ?? null;
    },

    currentUidSync() {
      if (!window._sb) return null;
      try {
        const stored = JSON.parse(localStorage.getItem(
          'sb-' + new URL(window._SB_URL).hostname.split('.')[0] + '-auth-token'
        ) || 'null');
        return stored?.user?.id ?? null;
      } catch (_) { return null; }
    },

    isAnonymous() {
      if (!window._sb) return false;
      try {
        const stored = JSON.parse(localStorage.getItem(
          'sb-' + new URL(window._SB_URL).hostname.split('.')[0] + '-auth-token'
        ) || 'null');
        return stored?.user?.is_anonymous === true;
      } catch (_) { return false; }
    },

    hasSession() {
      return this._hasValidSession;
    },

    onSession(fn) {
      this._listeners.push(fn);
    },

    _notifyListeners(session) {
      this._listeners.forEach(fn => { try { fn(session); } catch (_) {} });
    },

    async linkEmail(email) {
      if (!window._sb) return { data: null, error: { message: 'Supabase not available' } };
      const { data, error } = await window._sb.auth.updateUser({ email });
      if (!error) this._sessionPromise = Promise.resolve(data.session || await this._refreshSession());
      return { data, error };
    },

    async linkOAuth(provider) {
      if (!window._sb) return { data: null, error: { message: 'Supabase not available' } };
      return window._sb.auth.linkIdentity({ provider });
    },

    async _refreshSession() {
      if (!window._sb) return null;
      try {
        const { data: { session }, error } = await window._sb.auth.refreshSession();
        if (error) throw error;
        return session;
      } catch (_) { return null; }
    }
  };

  window.AuthManager = AuthManager;

  AuthManager.onSession(() => {
    if (window.VDna && window.VDna.syncToCloud) {
      setTimeout(() => window.VDna.syncToCloud(), 500);
    }
  });

  if (window._sb) {
    window._sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        AuthManager._sessionPromise = Promise.resolve(session);
        AuthManager._hasValidSession = true;
      } else if (event === 'SIGNED_OUT') {
        AuthManager._sessionPromise = null;
        AuthManager._hasValidSession = false;
      }
    });
  }
})();
