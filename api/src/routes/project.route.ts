import { Router } from 'express'
import { ProjectController } from '../controller/project.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticateToken, ProjectController.getProjects)
router.get('/:projectId/changes', authenticateToken, ProjectController.getProjectChanges)
router.get('/:projectId/memories', authenticateToken, ProjectController.getProjectMemories)

export default router

