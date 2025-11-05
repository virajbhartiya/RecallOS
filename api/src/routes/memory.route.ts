import { Router } from 'express';

import { MemoryController } from '../controller/memory.controller';
import { submitContent } from '../controller/content.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/process', authenticateToken, submitContent);
router.post('/', authenticateToken, MemoryController.storeMemory);
router.post('/batch', authenticateToken, MemoryController.storeMemoryBatch);
router.get('/user', authenticateToken, MemoryController.getUserMemories);
router.get('/user/count', authenticateToken, MemoryController.getUserMemoryCount);
router.get('/user/memory/:index', authenticateToken, MemoryController.getMemory);
router.get('/user/recent', authenticateToken, MemoryController.getRecentMemories);
router.get('/user/by-url', authenticateToken, MemoryController.getMemoriesByUrlHash);
router.get(
  '/user/by-timestamp',
  authenticateToken,
  MemoryController.getMemoriesByTimestampRange
);
router.get('/search', authenticateToken, MemoryController.searchMemories);
router.get('/insights', authenticateToken, MemoryController.getMemoryInsights);
router.get('/mesh', authenticateToken, MemoryController.getMemoryMesh);
router.get('/relations/:memoryId', authenticateToken, MemoryController.getMemoryWithRelations);
router.get('/cluster/:memoryId', authenticateToken, MemoryController.getMemoryCluster);
router.get('/search-embeddings', authenticateToken, MemoryController.searchMemoriesWithEmbeddings);
router.get('/search-hybrid', authenticateToken, MemoryController.searchMemoriesHybrid);
router.post('/process-mesh/:memoryId', authenticateToken, MemoryController.processMemoryForMesh);
router.get('/snapshots', authenticateToken, MemoryController.getMemorySnapshots);
router.get('/snapshot/:snapshotId', authenticateToken, MemoryController.getMemorySnapshot);
router.post('/backfill-snapshots', authenticateToken, MemoryController.backfillMemorySnapshots);
router.get('/health', MemoryController.healthCheck);
router.get('/debug', authenticateToken, MemoryController.debugMemories);

export default router;
