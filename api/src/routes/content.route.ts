import { Router } from 'express'

import { submitContent, getSummarizedContent } from '../controller/content.controller'
import { draftEmailReply } from '../controller/email.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.post('/', authenticateToken, submitContent)
router.get('/user', authenticateToken, getSummarizedContent)
router.post('/email/draft', authenticateToken, draftEmailReply)

export default router
