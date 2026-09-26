import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import postRoutes from '../modules/posts/post.routes.js';
import commentRoutes from '../modules/comments/comment.routes.js';
import likeRoutes from '../modules/likes/like.routes.js';
import followRoutes from '../modules/follows/follow.routes.js';
import feedRoutes from '../modules/feed/feed.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/follows', followRoutes);
router.use('/feed', feedRoutes);
router.use('/notifications', notificationRoutes);

export default router;