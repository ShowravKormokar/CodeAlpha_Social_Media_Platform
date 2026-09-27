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

  changePassword(data) {
    return api.post('/auth/change-password', data);
  },

  verifyEmail(token) {
    return api.post('/auth/verify-email', { token });
  },

  resendVerification(email) {
    return api.post('/auth/resend-verification', { email });
  },

  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword(token, newPassword) {
    return api.post('/auth/reset-password', { token, newPassword });
  },
};