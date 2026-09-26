import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get feed endpoint - to be implemented' });
});

export default router;