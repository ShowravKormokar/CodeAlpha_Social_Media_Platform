import { postRepository } from '../posts/post.repository.js';

export class FeedService {
  async getFeed(userId, { page = 1, limit = 20 }) {
    return postRepository.getFeed(userId, { page, limit });
  }
}

export const feedService = new FeedService();