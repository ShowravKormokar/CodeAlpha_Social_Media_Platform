import { Router } from 'express';

const router = Router();

router.post('/:id', (req, res) => {
  res.json({ success: true, message: 'Like post endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Unlike post endpoint - to be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get post likes endpoint - to be implemented' });
});

export default router;