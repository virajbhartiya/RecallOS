import { Router } from 'express';

import { MemoryController } from '../controller/memory.controller';

const router = Router();

router.post('/process', MemoryController.processRawContent);
router.post('/', MemoryController.storeMemory);
router.post('/batch', MemoryController.storeMemoryBatch);
router.get('/user/:userId', MemoryController.getUserMemories);
router.get('/user/:userId/count', MemoryController.getUserMemoryCount);
router.get('/user/:userId/memory/:index', MemoryController.getMemory);
router.get('/user/:userId/recent', MemoryController.getRecentMemories);
router.get('/user/:userId/by-url', MemoryController.getMemoriesByUrlHash);
router.get(
  '/user/:userAddress/by-timestamp',
  MemoryController.getMemoriesByTimestampRange
);
router.get('/search', MemoryController.searchMemories);
router.get('/insights', MemoryController.getMemoryInsights);
router.get('/transactions', MemoryController.getMemoriesWithTransactionDetails);
router.get(
  '/transaction/:memoryId',
  MemoryController.getMemoryTransactionStatus
);
router.post('/retry-failed', MemoryController.retryFailedTransactions);
router.get('/mesh/:userId', MemoryController.getMemoryMesh);
router.get('/relations/:memoryId', MemoryController.getMemoryWithRelations);
router.get('/cluster/:memoryId', MemoryController.getMemoryCluster);
router.get('/search-embeddings', MemoryController.searchMemoriesWithEmbeddings);
router.get('/search-hybrid', MemoryController.searchMemoriesHybrid);
router.post('/process-mesh/:memoryId', MemoryController.processMemoryForMesh);
router.get('/hash/:hash', MemoryController.getMemoryByHash);
router.get('/exists/:hash', MemoryController.isMemoryStored);
router.get('/snapshots/:userId', MemoryController.getMemorySnapshots);
router.get('/snapshot/:snapshotId', MemoryController.getMemorySnapshot);
router.post('/backfill-snapshots', MemoryController.backfillMemorySnapshots);
router.get('/health', MemoryController.healthCheck);
router.get('/debug', MemoryController.debugMemories);

export default router;
