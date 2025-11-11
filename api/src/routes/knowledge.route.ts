import express from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { KnowledgeController } from '../controller/knowledge.controller'

const router = express.Router()

router.get('/velocity', authenticateToken, KnowledgeController.getVelocity)
router.get('/impact', authenticateToken, KnowledgeController.getImpact)
router.get('/scores', authenticateToken, KnowledgeController.getScores)
router.get('/achievements', authenticateToken, KnowledgeController.getAchievements)
router.get('/learning-path', authenticateToken, KnowledgeController.getLearningPath)
router.get('/benchmarks', authenticateToken, KnowledgeController.getBenchmarks)
router.post('/calculate', authenticateToken, KnowledgeController.calculateScores)
router.post('/opt-in', authenticateToken, KnowledgeController.setOptIn)

export default router

