import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get notifications endpoint - to be implemented' });
});

router.patch('/:id/read', (req, res) => {
  res.json({ success: true, message: 'Mark notification as read endpoint - to be implemented' });
});

router.patch('/read-all', (req, res) => {
  res.json({ success: true, message: 'Mark all notifications as read endpoint - to be implemented' });
});

export default router;