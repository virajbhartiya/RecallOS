import { Router } from 'express';

import {
  submitContent,
  getSummarizedContent,
  getPendingJobs,
} from '../controller/content.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, submitContent);
router.get('/user', authenticateToken, getSummarizedContent);
router.get('/pending', authenticateToken, getPendingJobs);

export default router;
