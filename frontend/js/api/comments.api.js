import { api } from './client.js';

export const commentsApi = {
  create(postId, data) {
    return api.post(`/posts/${postId}/comments`, data);
  },

  update(commentId, data) {
    return api.patch(`/comments/${commentId}`, data);
  },

  delete(commentId) {
    return api.delete(`/comments/${commentId}`);
  },
};