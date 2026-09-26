import { pool } from '../../config/database.js';
import { followRepository } from './follow.repository.js';
import { userRepository } from '../users/user.repository.js';
import { notificationRepository } from '../notifications/notification.repository.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../errors/AppError.js';

export class FollowService {
  async follow(followerId, followingId) {
    if (followerId === followingId) {
      throw new ForbiddenError('Cannot follow yourself', 'CANNOT_FOLLOW_SELF');
    }

    const targetUser = await userRepository.findById(followingId);
    if (!targetUser || targetUser.status !== 'active') {
      throw new NotFoundError('User');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await followRepository.create(followerId, followingId);

      // Create notification
      await notificationRepository.create({
        recipientId: followingId,
        actorId: followerId,
        type: 'follow',
      });

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        throw new ConflictError('Already following this user', 'ALREADY_FOLLOWING');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async unfollow(followerId, followingId) {
    return followRepository.delete(followerId, followingId);
  }

  async getFollowers(userId, params, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return followRepository.getFollowers(userId, params, currentUserId);
  }

  async getFollowing(userId, params, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return followRepository.getFollowing(userId, params, currentUserId);
  }

  async isFollowing(followerId, followingId) {
    return followRepository.isFollowing(followerId, followingId);
  }

  async countFollowers(userId) {
    return followRepository.countFollowers(userId);
  }

  async countFollowing(userId) {
    return followRepository.countFollowing(userId);
  }
}

export const followService = new FollowService();