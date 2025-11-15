import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { PrivacyController } from '../controller/privacy.controller'

const router = Router()

router.get('/settings', authenticateToken, PrivacyController.getPrivacySettings)
router.get('/settings/:domain', authenticateToken, PrivacyController.getDomainPrivacySetting)
router.post('/settings', authenticateToken, PrivacyController.upsertPrivacySetting)
router.put('/settings/:domain', authenticateToken, PrivacyController.upsertPrivacySetting)
router.delete('/settings/:domain', authenticateToken, PrivacyController.deletePrivacySetting)
router.get('/audit-logs', authenticateToken, PrivacyController.getAuditLogs)

export default router
