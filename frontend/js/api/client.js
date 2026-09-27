const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.refreshPromise = null;
    this.refreshTimer = null;
  }

  async request(endpoint, options = {}, retryAfterRefresh = true) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (
        response.status === 401 &&
        retryAfterRefresh &&
        ['UNAUTHORIZED', 'TOKEN_EXPIRED'].includes(data?.error?.code) &&
        !['/auth/login', '/auth/register', '/auth/refresh'].includes(endpoint)
      ) {
        if (await this.refreshSession()) {
          return this.request(endpoint, options, false);
        }
      }

      if (!response.ok) {
        throw new ApiError(data?.error?.message || 'Request failed', response.status, data?.error?.code, data?.error?.details);
      }

      this.scheduleRefresh(data?.data?.accessTokenExpiresAt);
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network error', 0, 'NETWORK_ERROR');
    }
  }

  scheduleRefresh(expiresAt) {
    this.clearRefreshTimer();

    const expiry = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
    if (!Number.isFinite(expiry)) return;

    const delay = Math.max(0, expiry - Date.now() - 60_000);
    this.refreshTimer = window.setTimeout(() => this.refreshBeforeExpiry(expiry), delay);
  }

  async refreshBeforeExpiry(expiry) {
    const refreshed = await this.refreshSession();
    if (refreshed === false && Date.now() < expiry) {
      const retryDelay = Math.min(15_000, Math.max(1_000, expiry - Date.now()));
      this.refreshTimer = window.setTimeout(() => this.refreshBeforeExpiry(expiry), retryDelay);
    }
  }

  refreshSession() {
    if (!this.refreshPromise) {
      const performRefresh = async () => {
        try {
          const response = await fetch(`${this.baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const data = await response.json().catch(() => null);

          if (!response.ok) {
            if (response.status === 401) {
              this.clearRefreshTimer();
              window.dispatchEvent(new Event('auth:expired'));
              return null;
            }
            return false;
          }

          this.scheduleRefresh(data?.data?.accessTokenExpiresAt);
          return true;
        } catch {
          return false;
        }
      };

      const refresh = () => {
        if (navigator.locks?.request) {
          return navigator.locks.request('socialapp-auth-refresh', performRefresh);
        }
        return performRefresh();
      };

      this.refreshPromise = refresh().catch(() => false).finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  clearRefreshTimer() {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const api = new ApiClient();

export { ApiError };