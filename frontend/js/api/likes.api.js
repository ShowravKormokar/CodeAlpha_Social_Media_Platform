import { api } from './client.js';

export const likesApi = {
  like(postId) {
    return api.post(`/posts/${postId}/like`);
  },

  unlike(postId) {
    return api.delete(`/posts/${postId}/like`);
  },

  getLikes(postId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/posts/${postId}/likes?${query}`);
  },
};