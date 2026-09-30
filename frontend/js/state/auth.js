import { authApi } from '../api/auth.api.js';
import { api, ApiError } from '../api/client.js';

const auth = {
  user: null,
  _subscribers: new Set(),
  _initPromise: null,

  async init() {
    if (!this._initPromise) {
      this._initPromise = (async () => {
        try {
          const data = await authApi.me();
          this.user = data.data?.user ?? data.user ?? data;
          this._notify();
          return true;
        } catch {
          this.user = null;
          this._notify();
          return false;
        }
      })();
    }

    try {
      return await this._initPromise;
    } finally {
      this._initPromise = null;
    }
  },

  async login(credentials) {
    try {
      const data = await authApi.login(credentials);
      this.user = data.data?.user ?? data.user ?? data;
      this._notify();
      return { success: true, data };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async register(data) {
    try {
      const response = await authApi.register(data);
      this.user = response.data?.user ?? response.user ?? response;
      this._notify();
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async logout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      api.clearRefreshTimer();
      this.user = null;
      this._notify();
    }
  },

  updateProfile(profile) {
    if (!this.user || !profile) return this.user;

    this.user = {
      ...this.user,
      profile: {
        ...(this.user.profile || {}),
        ...profile,
      },
    };
    this._notify();
    return this.user;
  },

  async changePassword(data) {
    try {
      const response = await authApi.changePassword(data);
      // Logout after password change as tokens are revoked
      api.clearRefreshTimer();
      this.user = null;
      this._notify();
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async verifyEmail(token) {
    try {
      const response = await authApi.verifyEmail(token);
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async resendVerification(email) {
    try {
      const response = await authApi.resendVerification(email);
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async forgotPassword(email) {
    try {
      const response = await authApi.forgotPassword(email);
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const response = await authApi.resetPassword(token, newPassword);
      return { success: true, data: response };
    } catch (err) {
      return this._handleError(err);
    }
  },

  subscribe(callback) {
    this._subscribers.add(callback);
    // Immediately call with current user
    callback(this.user);
    return () => this._subscribers.delete(callback);
  },

  _notify() {
    this._subscribers.forEach(cb => cb(this.user));
  },

  _handleError(err) {
    if (err instanceof ApiError) {
      return {
        success: false,
        error: {
          message: err.message,
          code: err.code,
          details: err.details
        }
      };
    }
    return {
      success: false,
      error: {
        message: err.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      }
    };
  }
};

export { auth };