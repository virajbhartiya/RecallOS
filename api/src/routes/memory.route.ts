import { Router } from 'express'
import { MemoryController } from '../controller/memory.controller'
import { MemorySearchController } from '../controller/memorySearch.controller'
import { MemoryMeshController } from '../controller/memoryMesh.controller'
import { MemorySnapshotController } from '../controller/memorySnapshot.controller'
import { AnalyticsController } from '../controller/analytics.controller'
import { submitContent } from '../controller/content.controller'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/process', authenticateToken, submitContent)
router.get('/user/count', authenticateToken, MemoryController.getUserMemoryCount)
router.get('/user/recent', authenticateToken, MemoryController.getRecentMemories)
router.get('/search', authenticateToken, MemorySearchController.searchMemories)
router.get('/insights', authenticateToken, MemoryController.getMemoryInsights)
router.get('/analytics', authenticateToken, AnalyticsController.getAnalytics)
router.get('/mesh', authenticateToken, MemoryMeshController.getMemoryMesh)
router.get('/relations/:memoryId', authenticateToken, MemoryMeshController.getMemoryWithRelations)
router.get('/cluster/:memoryId', authenticateToken, MemoryMeshController.getMemoryCluster)
router.get(
  '/search-embeddings',
  authenticateToken,
  MemorySearchController.searchMemoriesWithEmbeddings
)
router.get('/search-hybrid', authenticateToken, MemorySearchController.searchMemoriesHybrid)
router.post('/process-mesh/:memoryId', authenticateToken, MemoryMeshController.processMemoryForMesh)
router.get('/snapshots', authenticateToken, MemorySnapshotController.getMemorySnapshots)
router.get('/snapshot/:snapshotId', authenticateToken, MemorySnapshotController.getMemorySnapshot)
router.post(
  '/backfill-snapshots',
  authenticateToken,
  MemorySnapshotController.backfillMemorySnapshots
)
router.get('/health', MemoryController.healthCheck)
router.get('/debug', authenticateToken, MemoryController.debugMemories)
router.delete('/:memoryId', authenticateToken, MemoryController.deleteMemory)

export default router
