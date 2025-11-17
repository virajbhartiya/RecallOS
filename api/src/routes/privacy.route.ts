import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { PrivacyController } from '../controller/privacy.controller'

const router = Router()

router.get('/audit-logs', authenticateToken, PrivacyController.getAuditLogs)

export default router
