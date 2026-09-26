import { userRepository } from './user.repository.js';
import { profileRepository } from './profile.repository.js';
import { NotFoundError, ConflictError } from '../../errors/AppError.js';

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
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        websiteUrl: profile.website_url,
        location: profile.location,
      } : null,
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

    if (currentUserId && currentUserId !== userId) {
      isFollowing = await userRepository.isFollowing(currentUserId, userId);
    }

    return {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        websiteUrl: profile.website_url,
        location: profile.location,
      } : null,
      stats,
      isFollowing,
    };
  }

  async updateProfile(userId, data) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const allowedFields = ['displayName', 'bio', 'avatarUrl', 'coverUrl', 'websiteUrl', 'location'];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.getProfile(userId);
    }

    const profile = await profileRepository.update(userId, updateData);
    return this.getProfile(userId);
  }

  async changePassword(userId, currentPassword, newPassword) {
    return this.authService?.changePassword(userId, currentPassword, newPassword);
  }

  async searchUsers(query, { page = 1, limit = 20 }) {
    if (!query || query.trim().length < 2) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const users = await userRepository.search(query.trim(), limit, (page - 1) * limit);
    return {
      data: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        status: u.status,
        createdAt: u.created_at,
      })),
      pagination: { page, limit, total: users.length, totalPages: 1 },
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

    const { followRepository } = await import('../follows/follow.repository.js');
    return followRepository.getFollowers(userId, { page, limit }, currentUserId);
  }

  async getFollowing(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const { followRepository } = await import('../follows/follow.repository.js');
    return followRepository.getFollowing(userId, { page, limit }, currentUserId);
  }
}

export const userService = new UserService();