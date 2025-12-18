// auth.js - Site-wide authentication for aicrochet.org

const AUTH_TOKEN_KEY = 'crochet_auth_token';
const USER_KEY = 'crochet_user';

function isJwtExpired(token) {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);
    return !exp || exp <= now;
  } catch {
    return true;
  }
}

class Auth {
  constructor() {
    this.user = null;
    this.token = null;
    this._expWatch = null;
  }

  async init() {
    this.token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    this.user = userStr ? JSON.parse(userStr) : null;

    if (!this.token) return;

    const isValid = await this.validateSession();
    if (!isValid) {
      this.clearAuth();
      try { window.refreshAuthUI && window.refreshAuthUI(); } catch {}
      return;
    }

    // Fetch profile
    try {
      const resp = await fetch('/.netlify/functions/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          action: 'getProfile',
          payload: {}
        })
      });
      const json = await resp.json();
      if (json?.data?.display_name) {
        if (!this.user) this.user = {};
        this.user.display_name = json.data.display_name;
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
    } catch (e) {
      console.warn('init: profile fetch failed', e);
    }

    // Background token expiry watcher
    if (!this._expWatch) {
      this._expWatch = setInterval(async () => {
        if (!this.token || !isJwtExpired(this.token)) return;
        console.warn('Token expired - clearing auth');
        this.clearAuth();
        try { window.refreshAuthUI && window.refreshAuthUI(); } catch {}
      }, 60000);
    }
  }

  async validateSession() {
    if (!this.token) return false;

    const parts = this.token.split('.');
    if (parts.length !== 3) return false;

    try {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async signIn(email, password) {
    const response = await fetch('/.netlify/functions/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signIn',
        payload: { email, password }
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.data || !result.data.user) {
      throw new Error('Invalid response from server');
    }

    if (!result.data.user.email_confirmed_at) {
      throw new Error('Please verify your email before signing in.');
    }

    this.user = result.data.user;
    this.token = result.data.session.access_token;

    // Fetch profile
    try {
      const profResponse = await fetch('/.netlify/functions/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          action: 'getProfile',
          payload: {}
        })
      });
      const profResult = await profResponse.json();
      if (profResult.data?.display_name) {
        this.user.display_name = profResult.data.display_name;
      }
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    }

    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    localStorage.setItem(AUTH_TOKEN_KEY, this.token);

    return this.user;
  }

  async signUp(email, password, displayName) {
    const response = await fetch('/.netlify/functions/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signUp',
        payload: {
          email,
          password,
          display_name: displayName,
          redirectTo: window.location.href
        }
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  async signOut() {
    try {
      await fetch('/.netlify/functions/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signOut' })
      });
    } catch (_) {}

    this.clearAuth();
    window.location.reload();
  }

  clearAuth() {
    this.user = null;
    this.token = null;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    if (this._expWatch) {
      clearInterval(this._expWatch);
      this._expWatch = null;
    }
  }

  isAuthenticated() {
    return !!this.user && !!this.token && !isJwtExpired(this.token);
  }

  getUser() {
    return this.user;
  }

  getToken() {
    if (!this.token) return null;
    if (isJwtExpired(this.token)) {
      this.clearAuth();
      try { window.refreshAuthUI && window.refreshAuthUI(); } catch {}
      return null;
    }
    return this.token;
  }
}

// Global instance
window.auth = new Auth();
