import { Router } from 'express';

const router = Router();

router.post('/:id', (req, res) => {
  res.json({ success: true, message: 'Follow user endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Unfollow user endpoint - to be implemented' });
});

export default router;