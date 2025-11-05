import { Router } from 'express';

import {
  submitContent,
  getSummarizedContent,
  getPendingJobs,
} from '../controller/content.controller';

const router = Router();

router.post('/', submitContent);
router.get('/user/:user_id', getSummarizedContent);
router.get('/pending', getPendingJobs);

export default router;
