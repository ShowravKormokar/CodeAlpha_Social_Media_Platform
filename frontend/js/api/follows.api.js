import { api } from './client.js';

export const followsApi = {
  follow(userId) {
    return api.post(`/users/${userId}/follow`);
  },

  unfollow(userId) {
    return api.delete(`/users/${userId}/follow`);
  },

  getFollowers(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/${userId}/followers?${query}`);
  },

  getFollowing(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/${userId}/following?${query}`);
  },

  getRelationship(userId) {
    return api.get(`/users/${userId}/relationship`);
  },

  getSuggestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users/suggestions?${query}`);
  },
};