import { Router } from 'express';

const router = Router();

router.post('/', (req, res) => {
  res.status(201).json({ success: true, message: 'Create post endpoint - to be implemented' });
});

router.get('/', (req, res) => {
  res.json({ success: true, message: 'List posts endpoint - to be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get post endpoint - to be implemented' });
});

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update post endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.status(204).json({ success: true, message: 'Delete post endpoint - to be implemented' });
});

router.get('/:id/comments', (req, res) => {
  res.json({ success: true, message: 'Get post comments endpoint - to be implemented' });
});

export default router;