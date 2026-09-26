import { likeRepository } from './like.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { NotFoundError } from '../../errors/AppError.js';

export class LikeService {
  async like(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return likeRepository.create(postId, userId);
  }

  async unlike(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return likeRepository.delete(postId, userId);
  }

  async getLikes(postId, params) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return likeRepository.getByPost(postId, params);
  }

  async userHasLiked(postId, userId) {
    return likeRepository.userHasLiked(postId, userId);
  }

  async getLikeCount(postId) {
    return likeRepository.count(postId);
  }
}

export const likeService = new LikeService();