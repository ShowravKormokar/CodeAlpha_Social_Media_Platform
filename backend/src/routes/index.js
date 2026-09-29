import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import postRoutes from '../modules/posts/post.routes.js';
import commentRoutes from '../modules/comments/comment.routes.js';
import likeRoutes from '../modules/likes/like.routes.js';
import feedRoutes from '../modules/feed/feed.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import bookmarkRoutes from '../modules/bookmarks/bookmark.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use(commentRoutes);
router.use('/likes', likeRoutes);
router.use('/feed', feedRoutes);
router.use('/notifications', notificationRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/reports', reportRoutes);

export default router;