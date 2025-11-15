import { Router } from 'express'
import { ExportImportController } from '../controller/export-import.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticateToken, ExportImportController.exportUserData)
router.post('/', authenticateToken, ExportImportController.importUserData)

export default router
