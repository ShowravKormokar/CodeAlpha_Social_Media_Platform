import { pool } from '../../config/database.js';
import { bookmarkRepository } from './bookmark.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { NotFoundError } from '../../errors/AppError.js';

export class BookmarkService {
  async create(userId, postId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return bookmarkRepository.create(userId, postId);
  }

  async delete(userId, postId) {
    return bookmarkRepository.delete(userId, postId);
  }

  async list(userId, params) {
    return bookmarkRepository.listByUser(userId, params);
  }

  async isBookmarked(userId, postId) {
    return bookmarkRepository.isBookmarked(userId, postId);
  }
}

export const bookmarkService = new BookmarkService();