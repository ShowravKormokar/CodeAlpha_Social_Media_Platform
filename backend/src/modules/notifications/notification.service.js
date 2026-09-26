import { notificationRepository } from './notification.repository.js';

export class NotificationService {
  async getNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    return notificationRepository.listByRecipient(userId, { page, limit, unreadOnly });
  }

  async markAsRead(notificationId, userId) {
    return notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId) {
    return notificationRepository.countUnread(userId);
  }
}

export const notificationService = new NotificationService();