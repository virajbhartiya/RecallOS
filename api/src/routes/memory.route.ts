import { Router } from 'express';

import { MemoryController } from '../controller/memory.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/process', authenticateToken, MemoryController.processRawContent);
router.post('/', authenticateToken, MemoryController.storeMemory);
router.post('/batch', authenticateToken, MemoryController.storeMemoryBatch);
router.get('/user/:userId', authenticateToken, MemoryController.getUserMemories);
router.get('/user/:userId/count', authenticateToken, MemoryController.getUserMemoryCount);
router.get('/user/:userId/memory/:index', authenticateToken, MemoryController.getMemory);
router.get('/user/:userId/recent', authenticateToken, MemoryController.getRecentMemories);
router.get('/user/:userId/by-url', authenticateToken, MemoryController.getMemoriesByUrlHash);
router.get(
  '/user/:userAddress/by-timestamp',
  authenticateToken,
  MemoryController.getMemoriesByTimestampRange
);
router.get('/search', authenticateToken, MemoryController.searchMemories);
router.get('/insights', authenticateToken, MemoryController.getMemoryInsights);
router.get('/transactions', authenticateToken, MemoryController.getMemoriesWithTransactionDetails);
router.get(
  '/transaction/:memoryId',
  authenticateToken,
  MemoryController.getMemoryTransactionStatus
);
router.post('/retry-failed', authenticateToken, MemoryController.retryFailedTransactions);
router.get('/mesh/:userId', authenticateToken, MemoryController.getMemoryMesh);
router.get('/relations/:memoryId', authenticateToken, MemoryController.getMemoryWithRelations);
router.get('/cluster/:memoryId', authenticateToken, MemoryController.getMemoryCluster);
router.get('/search-embeddings', authenticateToken, MemoryController.searchMemoriesWithEmbeddings);
router.get('/search-hybrid', authenticateToken, MemoryController.searchMemoriesHybrid);
router.post('/process-mesh/:memoryId', authenticateToken, MemoryController.processMemoryForMesh);
router.get('/hash/:hash', authenticateToken, MemoryController.getMemoryByHash);
router.get('/exists/:hash', authenticateToken, MemoryController.isMemoryStored);
router.get('/snapshots/:userId', authenticateToken, MemoryController.getMemorySnapshots);
router.get('/snapshot/:snapshotId', authenticateToken, MemoryController.getMemorySnapshot);
router.post('/backfill-snapshots', authenticateToken, MemoryController.backfillMemorySnapshots);
router.get('/health', MemoryController.healthCheck);
router.get('/debug', authenticateToken, MemoryController.debugMemories);

export default router;
