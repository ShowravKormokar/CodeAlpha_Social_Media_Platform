import { pool } from '../../config/database.js';
import { postRepository } from './post.repository.js';
import { likeRepository } from '../likes/like.repository.js';
import { commentRepository } from '../comments/comment.repository.js';
import { notificationRepository } from '../notifications/notification.repository.js';
import { mediaService } from '../media/media.service.js';
import { MEDIA_TYPES } from '../media/media.constants.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';
import { logger } from '../../config/logger.js';

export class PostService {
  async create(userId, data) {
    // Ownership and purpose are proven before the row is written, so a
    // post can never point at somebody else's media or at an upload
    // made for a different purpose.
    if (data.imageMediaId) {
      await mediaService.assertOwnedForPurpose(
        data.imageMediaId, userId, MEDIA_TYPES.POST_IMAGE
      );
    }

    const post = await postRepository.create({
      userId,
      content: data.content,
      imageUrl: data.imageMediaId ? null : data.imageUrl,
      imageMediaId: data.imageMediaId,
    });

    return this.getPostWithAuthor(post.id, userId);
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

    const updateData = { ...data };

    // An uploaded image and an external URL are two sources for one
    // slot, so setting either clears the other.
    if (updateData.imageMediaId !== undefined) {
      updateData.imageUrl = null;
    } else if (updateData.imageUrl !== undefined) {
      updateData.imageMediaId = null;
    }

    if (updateData.imageMediaId) {
      await mediaService.assertOwnedForPurpose(
        updateData.imageMediaId, userId, MEDIA_TYPES.POST_IMAGE
      );
    }

    await postRepository.update(postId, userId, updateData);

    // The new reference is committed; only now is the replaced image
    // released. A failed update above leaves the original in place.
    if (post.image_media_id && post.image_media_id !== updateData.imageMediaId) {
      await this.releaseReplacedMedia(post.image_media_id, userId);
    }

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

    const deleted = await postRepository.softDelete(postId, userId);

    // A soft-deleted post can no longer display its image, so the
    // upload and its stored file are released once the delete has
    // succeeded. Cleanup never turns a successful delete into an error.
    if (deleted && post.image_media_id) {
      await this.releaseReplacedMedia(post.image_media_id, userId);
    }

    return deleted;
  }

  /**
   * Cleanup is best-effort by design: an unreferenced media row is
   * reclaimable later by the orphan sweep, whereas failing here would
   * surface an error to a user whose action actually succeeded.
   */
  async releaseReplacedMedia(mediaId, ownerId) {
    try {
      await mediaService.cleanupIfUnreferenced(mediaId, ownerId);
    } catch (err) {
      logger.error({ err, mediaId, ownerId }, 'Failed to release replaced post media');
    }
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
      imageMediaId: post.image_media_id,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        id: post.user_id,
        username: post.username,
        displayName: post.display_name,
        avatarUrl: post.avatar_url,
        avatarMediaId: post.avatar_media_id,
      },
      likesCount: parseInt(post.likes_count) || 0,
      commentsCount: parseInt(post.comments_count) || 0,
      userLiked: !!post.user_liked,
    };
  }
}

export const postService = new PostService();