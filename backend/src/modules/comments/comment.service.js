import { pool } from '../../config/database.js';
import { commentRepository } from './comment.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { notificationRepository } from '../notifications/notification.repository.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

export class CommentService {
  async create(postId, userId, data) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const comment = await commentRepository.create({ postId, userId, content: data.content });

      // Create notification if not self-comment
      if (post.user_id !== userId) {
        await notificationRepository.create({
          recipientId: post.user_id,
          actorId: userId,
          type: 'comment',
          postId,
          commentId: comment.id,
        });
      }

      await client.query('COMMIT');
      return this.getCommentWithAuthor(comment.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getComment(commentId) {
    return this.getCommentWithAuthor(commentId);
  }

  async getCommentWithAuthor(commentId) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    return this.formatComment(comment);
  }

  async update(commentId, userId, data) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenError('Cannot update this comment', 'FORBIDDEN');
    }

    const updated = await commentRepository.update(commentId, userId, data);
    return this.getCommentWithAuthor(commentId);
  }

  async delete(commentId, userId) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenError('Cannot delete this comment', 'FORBIDDEN');
    }

    return commentRepository.softDelete(commentId, userId);
  }

  async listByPost(postId, params) {
    return commentRepository.listByPost(postId, params);
  }

  formatComment(comment) {
    return {
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: {
        id: comment.user_id,
        username: comment.username,
        displayName: comment.display_name,
        avatarUrl: comment.avatar_url,
      },
    };
  }
}

export const commentService = new CommentService();