import { Router } from 'express'

import {
  submitContent,
  getSummarizedContent,
  getPendingJobs,
  deletePendingJob,
  resubmitPendingJob,
} from '../controller/content.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.post('/', authenticateToken, submitContent)
router.get('/user', authenticateToken, getSummarizedContent)
router.get('/pending', authenticateToken, getPendingJobs)
router.delete('/pending/:jobId', authenticateToken, deletePendingJob)
router.post('/pending/:jobId/resubmit', authenticateToken, resubmitPendingJob)

export default router
