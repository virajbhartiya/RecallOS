import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { AdminController } from '../controller/admin.controller'

const router = Router()

router.get('/stats', authenticateToken, AdminController.getStats)

export default router

