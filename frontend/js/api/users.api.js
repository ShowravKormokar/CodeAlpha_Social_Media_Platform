import { api } from './client.js';

export const usersApi = {
  getProfile(userId) {
    return api.get(`/users/${userId}`);
  },

  updateProfile(data) {
    return api.patch('/users/me', data);
  },

  changePassword(data) {
    return api.patch('/users/me/password', data);
  },

  search(query) {
    return api.get(`/users/search?q=${encodeURIComponent(query)}`);
  },

  getPosts(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/${userId}/posts?${query}`);
  },

  getFollowers(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/${userId}/followers?${query}`);
  },

  getFollowing(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/${userId}/following?${query}`);
  },
};