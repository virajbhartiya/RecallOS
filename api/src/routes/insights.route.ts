import { Router } from 'express'
import { InsightsController } from '../controller/insights.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/summaries', authenticateToken, InsightsController.getSummaries)
router.get('/summaries/latest', authenticateToken, InsightsController.getLatestSummary)
router.get('/summaries/:id', authenticateToken, InsightsController.getSummaryById)
router.post('/summaries/generate', authenticateToken, InsightsController.generateSummary)

export default router
