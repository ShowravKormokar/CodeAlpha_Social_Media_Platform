import { api } from './client.js';

export const postsApi = {
  create(data) {
    return api.post('/posts', data);
  },

  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/posts?${query}`);
  },

  get(postId) {
    return api.get(`/posts/${postId}`);
  },

  update(postId, data) {
    return api.patch(`/posts/${postId}`, data);
  },

  delete(postId) {
    return api.delete(`/posts/${postId}`);
  },

  getComments(postId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/posts/${postId}/comments?${query}`);
  },
};