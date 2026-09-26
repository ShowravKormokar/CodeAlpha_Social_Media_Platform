import { pool } from '../../config/database.js';
import { postRepository } from './post.repository.js';
import { likeRepository } from '../likes/like.repository.js';
import { commentRepository } from '../comments/comment.repository.js';
import { notificationRepository } from '../notifications/notification.repository.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export class PostService {
  async create(userId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const post = await postRepository.create({ userId, content: data.content, imageUrl: data.imageUrl });

      // Create notification for followers (optional, can be async)
      // For now, just commit
      await client.query('COMMIT');

      return this.getPostWithAuthor(post.id, userId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getPost(postId, currentUserId = null) {
    return this.getPostWithAuthor(postId, currentUserId);
  }

  async getPostWithAuthor(postId, currentUserId = null) {
    const post = await postRepository.findById(postId, currentUserId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return this.formatPost(post);
  }

  async update(postId, userId, data) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenError('Cannot update this post', 'FORBIDDEN');
    }

    const updated = await postRepository.update(postId, userId, data);
    return this.getPostWithAuthor(postId, userId);
  }

  async delete(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenError('Cannot delete this post', 'FORBIDDEN');
    }

    return postRepository.softDelete(postId, userId);
  }

  async list(params, currentUserId = null) {
    return postRepository.list(params, currentUserId);
  }

  async getFeed(userId, params) {
    return postRepository.getFeed(userId, params);
  }

  async like(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await likeRepository.create(postId, userId);

      // Create notification if not self-like
      if (post.user_id !== userId) {
        await notificationRepository.create({
          recipientId: post.user_id,
          actorId: userId,
          type: 'like',
          postId,
        });
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async unlike(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    return likeRepository.delete(postId, userId);
  }

  async getLikes(postId, params) {
    return likeRepository.getByPost(postId, params);
  }

  async getComments(postId, params) {
    return commentRepository.listByPost(postId, params);
  }

  formatPost(post) {
    return {
      id: post.id,
      userId: post.user_id,
      content: post.content,
      imageUrl: post.image_url,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        id: post.user_id,
        username: post.username,
        displayName: post.display_name,
        avatarUrl: post.avatar_url,
      },
      likesCount: parseInt(post.likes_count) || 0,
      commentsCount: parseInt(post.comments_count) || 0,
      userLiked: !!post.user_liked,
    };
  }
}

export const postService = new PostService();