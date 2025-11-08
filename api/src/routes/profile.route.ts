import { Router } from 'express'
import { ProfileController } from '../controller/profile.controller'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/', authenticateToken, ProfileController.getProfile)
router.post('/refresh', authenticateToken, ProfileController.refreshProfile)
router.get('/context', authenticateToken, ProfileController.getProfileContext)

export default router
