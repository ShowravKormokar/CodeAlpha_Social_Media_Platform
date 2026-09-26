import { Router } from 'express';

const router = Router();

router.post('/:id', (req, res) => {
  res.status(201).json({ success: true, message: 'Create comment endpoint - to be implemented' });
});

router.patch('/:id', (req, res) => {
  res.json({ success: true, message: 'Update comment endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.status(204).json({ success: true, message: 'Delete comment endpoint - to be implemented' });
});

export default router;