import { Router } from 'express'
import { postSearch, getSearchJobStatus, getContext } from '../controller/search.controller'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/', authenticateToken, postSearch)
router.post('/context', authenticateToken, getContext)
router.get('/job/:id', getSearchJobStatus)

export default router
