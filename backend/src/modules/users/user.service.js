import { userRepository } from './user.repository.js';
import { profileRepository } from './profile.repository.js';
import { followService } from '../follows/follow.service.js';
import { followRepository } from '../follows/follow.repository.js';
import { mediaService } from '../media/media.service.js';
import { MEDIA_TYPES } from '../media/media.constants.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../errors/AppError.js';
import { getFollowerBadge } from '../../common/utils/followerBadge.js';
import { logger } from '../../config/logger.js';

/**
 * Maps a stored profile row to the API shape. An uploaded image is
 * reported as a media id and resolved by the client through
 * `GET /api/v1/media/:id/content`; `avatarUrl` / `coverUrl` remain the
 * source of truth for an externally supplied URL.
 */
function formatProfile(profile) {
  if (!profile) return null;
  return {
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl: profile.avatar_url,
    avatarMediaId: profile.avatar_media_id,
    coverUrl: profile.cover_url,
    bannerMediaId: profile.banner_media_id,
    websiteUrl: profile.website_url,
    location: profile.location,
  };
}

export class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const profile = await profileRepository.findByUserId(userId);
    const stats = await userRepository.getStats(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      createdAt: user.created_at,
      profile: formatProfile(profile),
      stats,
    };
  }

  async getPublicProfile(userId, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.status !== 'active') {
      throw new NotFoundError('User');
    }

    const profile = await profileRepository.findByUserId(userId);
    const stats = await userRepository.getStats(userId);
    let isFollowing = false;
    let followsYou = false;
    let mutualFollowersCount = 0;

    if (currentUserId && currentUserId !== userId) {
      const [isFollowingResult, followsYouResult, mutualResult] = await Promise.all([
        userRepository.isFollowing(currentUserId, userId),
        userRepository.isFollowing(userId, currentUserId),
        userRepository.countMutualFollowers(currentUserId, userId),
      ]);
      isFollowing = isFollowingResult;
      followsYou = followsYouResult;
      mutualFollowersCount = mutualResult;
    }

    const followerBadge = getFollowerBadge(stats?.followers || 0);

    return {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      profile: formatProfile(profile),
      stats,
      isFollowing,
      followsYou,
      mutualFollowersCount,
      followerBadge,
    };
  }

  async updateProfile(userId, data) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const allowedFields = [
      'displayName', 'bio', 'avatarUrl', 'coverUrl',
      'websiteUrl', 'location', 'avatarMediaId', 'bannerMediaId',
    ];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // A media reference and the legacy external URL are two sources for
    // the same slot. Setting the other one clears the first, so the
    // profile can never show an uploaded image and a stale URL at once.
    if (updateData.avatarMediaId !== undefined) {
      if (updateData.avatarUrl === undefined) updateData.avatarUrl = null;
    } else if (updateData.avatarUrl !== undefined) {
      if (data.avatarMediaId === undefined) updateData.avatarMediaId = null;
    }
    if (updateData.bannerMediaId !== undefined) {
      if (updateData.coverUrl === undefined) updateData.coverUrl = null;
    } else if (updateData.coverUrl !== undefined) {
      if (data.bannerMediaId === undefined) updateData.bannerMediaId = null;
    }

    // Ownership and purpose are proven before any reference is written.
    // `avatarMediaId: null` is a removal, so it skips the lookup.
    if (updateData.avatarMediaId) {
      await mediaService.assertOwnedForPurpose(
        updateData.avatarMediaId, userId, MEDIA_TYPES.PROFILE_AVATAR
      );
    }
    if (updateData.bannerMediaId) {
      await mediaService.assertOwnedForPurpose(
        updateData.bannerMediaId, userId, MEDIA_TYPES.PROFILE_BANNER
      );
    }

    const before = await profileRepository.findByUserId(userId);
    const replacingAvatar = before?.avatar_media_id;
    const replacingBanner = before?.banner_media_id;

    if (Object.keys(updateData).length > 0) {
      await profileRepository.update(userId, updateData);
    }

    // Only now that the new references are committed is the previous
    // media released. A field the caller did not send is left strictly
    // alone, so updating a banner never disturbs the avatar.
    const released = [];
    const hadAvatar = 'avatarMediaId' in updateData;
    const hadBanner = 'bannerMediaId' in updateData;
    if (hadAvatar && replacingAvatar && replacingAvatar !== updateData.avatarMediaId) {
      released.push(replacingAvatar);
    }
    if (hadBanner && replacingBanner && replacingBanner !== updateData.bannerMediaId) {
      released.push(replacingBanner);
    }
    await this.releaseReplacedMedia(released, userId);

    return this.getProfile(userId);
  }

  /**
   * Cleanup runs after the referencing write has succeeded and never
   * fails the request: a leftover record is recoverable through the
   * orphan sweep, whereas a failed update would be user-visible.
   */
  async releaseReplacedMedia(mediaIds, ownerId) {
    for (const mediaId of mediaIds) {
      try {
        await mediaService.cleanupIfUnreferenced(mediaId, ownerId);
      } catch (err) {
        logger.error({ err, mediaId, ownerId }, 'Failed to release replaced profile media');
      }
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    return this.authService?.changePassword(userId, currentPassword, newPassword);
  }

  async searchUsers(query, { page = 1, limit = 20 }, currentUserId = null) {
    if (!query || query.trim().length < 2) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const searchTerm = query.trim();
    const [users, countResult] = await Promise.all([
      userRepository.search(searchTerm, limit, (page - 1) * limit),
      userRepository.searchCount(searchTerm),
    ]);

    const total = parseInt(countResult);
    
    // Get profile data and follow status for each user
    const userIds = users.map(u => u.id);
    const [profiles, statsMap, followingMap, followersMap, mutualMap] = await Promise.all([
      userIds.length > 0 ? profileRepository.findByUserIds(userIds) : [],
      userIds.length > 0 ? userRepository.getStatsBatch(userIds) : {},
      (currentUserId && userIds.length > 0) ? userRepository.isFollowingBatch(currentUserId, userIds) : {},
      (currentUserId && userIds.length > 0) ? userRepository.isFollowedByBatch(currentUserId, userIds) : {},
      (currentUserId && userIds.length > 0) ? userRepository.countMutualFollowersBatch(currentUserId, userIds) : {},
    ]);

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    return {
      data: users.map(u => {
        const profile = profileMap.get(u.id);
        const stats = statsMap[u.id] || { posts: 0, followers: 0, following: 0 };
        const isFollowing = followingMap[u.id] || false;
        const followsYou = followersMap[u.id] || false;
        const mutualFollowersCount = mutualMap[u.id] || 0;
        const followerBadge = getFollowerBadge(stats.followers || 0);
        
        return {
          id: u.id,
          username: u.username,
          createdAt: u.created_at,
          profile: formatProfile(profile),
          stats,
          isFollowing,
          followsYou,
          mutualFollowersCount,
          followerBadge,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserPosts(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Import postRepository here to avoid circular dependency
    const { postRepository } = await import('../posts/post.repository.js');
    return postRepository.list({ page, limit, userId }, currentUserId);
  }

  async getFollowers(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Privacy: only the authenticated user can access their own full followers list
    if (currentUserId !== userId) {
      throw new ForbiddenError('Cannot view another user\'s followers list', 'FORBIDDEN');
    }

    return followService.getFollowers(userId, { page, limit }, currentUserId);
  }

  async getFollowing(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Privacy: only the authenticated user can access their own full following list
    if (currentUserId !== userId) {
      throw new ForbiddenError('Cannot view another user\'s following list', 'FORBIDDEN');
    }

    return followService.getFollowing(userId, { page, limit }, currentUserId);
  }

  async getRelationship(userId, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.status !== 'active') {
      throw new NotFoundError('User');
    }

    const stats = await userRepository.getStats(userId);
    let isFollowing = false;
    let followsYou = false;
    let mutualFollowersCount = 0;

    if (currentUserId && currentUserId !== userId) {
      const [isFollowingResult, followsYouResult, mutualResult] = await Promise.all([
        userRepository.isFollowing(currentUserId, userId),
        userRepository.isFollowing(userId, currentUserId),
        userRepository.countMutualFollowers(currentUserId, userId),
      ]);
      isFollowing = isFollowingResult;
      followsYou = followsYouResult;
      mutualFollowersCount = mutualResult;
    }

    const followerBadge = getFollowerBadge(stats?.followers || 0);

    return {
      id: user.id,
      username: user.username,
      stats,
      isFollowing,
      followsYou,
      mutualFollowersCount,
      followerBadge,
    };
  }

  async getSuggestions(currentUserId, { limit = 10 } = {}) {
    if (!currentUserId) {
      return { data: [] };
    }

    // Get users followed by people the current user follows (friends of friends)
    // Exclude current user and already followed users
    const query = `
      WITH followed_by_following AS (
        SELECT uf.following_id as suggested_id, COUNT(DISTINCT uf.follower_id) as mutual_count
        FROM user_follows uf
        JOIN user_follows uf2 ON uf2.following_id = uf.follower_id
        WHERE uf2.follower_id = $1
          AND uf.following_id != $1
          AND uf.following_id NOT IN (
            SELECT following_id FROM user_follows WHERE follower_id = $1
          )
        GROUP BY uf.following_id
      ),
      mutual_followers AS (
        SELECT uf.following_id as suggested_id, COUNT(DISTINCT uf.follower_id) as mutual_count
        FROM user_follows uf
        JOIN user_follows uf2 ON uf2.following_id = uf.follower_id
        WHERE uf.follower_id = $1
          AND uf2.following_id = uf.following_id
          AND uf.following_id != $1
          AND uf.following_id NOT IN (
            SELECT following_id FROM user_follows WHERE follower_id = $1
          )
        GROUP BY uf.following_id
      )
      SELECT u.id, u.username, u.created_at,
             COALESCE(fbf.mutual_count, 0) + COALESCE(mf.mutual_count, 0) as total_mutual
      FROM users u
      LEFT JOIN followed_by_following fbf ON fbf.suggested_id = u.id
      LEFT JOIN mutual_followers mf ON mf.suggested_id = u.id
      WHERE u.id != $1
        AND u.deleted_at IS NULL
        AND u.status = 'active'
        AND u.id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
      ORDER BY total_mutual DESC, u.created_at DESC
      LIMIT $2
    `;

    const { pool } = await import('../../config/database.js');
    const result = await pool.query(query, [currentUserId, limit]);
    
    if (result.rows.length === 0) {
      // Fallback: suggest active users not followed by current user
      const fallbackQuery = `
        SELECT u.id, u.username, u.created_at, 0 as total_mutual
        FROM users u
        WHERE u.id != $1
          AND u.deleted_at IS NULL
          AND u.status = 'active'
          AND u.id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
        ORDER BY u.created_at DESC
        LIMIT $2
      `;
      const fallbackResult = await pool.query(fallbackQuery, [currentUserId, limit]);
      result.rows = fallbackResult.rows;
    }

    const userIds = result.rows.map(r => r.id);
    
    // Get profile data and stats for suggested users
    const [profiles, statsMap] = await Promise.all([
      userIds.length > 0 ? profileRepository.findByUserIds(userIds) : [],
      userIds.length > 0 ? userRepository.getStatsBatch(userIds) : {},
    ]);

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    return {
      data: result.rows.map(u => {
        const profile = profileMap.get(u.id);
        const stats = statsMap[u.id] || { posts: 0, followers: 0, following: 0 };
        const followerBadge = getFollowerBadge(stats.followers || 0);
        
        return {
          id: u.id,
          username: u.username,
          createdAt: u.created_at,
          profile: formatProfile(profile),
          stats,
          mutualFollowersCount: u.total_mutual || 0,
          followerBadge,
        };
      }),
    };
  }
}

export const userService = new UserService();