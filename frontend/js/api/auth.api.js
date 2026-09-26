import { api } from './client.js';

export const authApi = {
  register(data) {
    return api.post('/auth/register', data);
  },

  login(data) {
    return api.post('/auth/login', data);
  },

  logout() {
    return api.post('/auth/logout');
  },

  me() {
    return api.get('/auth/me');
  },

  refresh() {
    return api.post('/auth/refresh');
  },
};