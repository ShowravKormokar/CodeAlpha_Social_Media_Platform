import { authApi } from '../api/auth.api.js';

const AUTH_KEY = 'social_media_auth';

let currentUser = null;
let listeners = [];

function notifyListeners() {
  listeners.forEach(fn => fn(currentUser));
}

export const auth = {
  get user() {
    return currentUser;
  },

  get isAuthenticated() {
    return !!currentUser;
  },

  setUser(user) {
    currentUser = user;
    notifyListeners();
  },

  clearUser() {
    currentUser = null;
    notifyListeners();
  },

  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(l => l !== fn);
    };
  },

  async init() {
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        this.setUser(response.data);
        return true;
      }
    } catch {
      // Not authenticated
    }
    this.clearUser();
    return false;
  },

  async login(credentials) {
    const response = await authApi.login(credentials);
    if (response.success && response.data) {
      this.setUser(response.data.user);
    }
    return response;
  },

  async register(data) {
    const response = await authApi.register(data);
    if (response.success && response.data) {
      this.setUser(response.data.user);
    }
    return response;
  },

  async logout() {
    await authApi.logout();
    this.clearUser();
  },
};