import { Router } from 'express'
import { BlockscoutController } from '../controller/blockscout.controller'

const router = Router()

// Prefetch a single transaction
router.post('/prefetch', BlockscoutController.prefetchTransaction)

// Get cached transaction data
router.get('/transaction/:txHash', BlockscoutController.getTransaction)

// Batch prefetch multiple transactions
router.post('/batch-prefetch', BlockscoutController.batchPrefetch)

// Get prefetch status for a transaction
router.get('/status/:txHash', BlockscoutController.getPrefetchStatus)

// Trigger cleanup of old pending transactions
router.post('/cleanup', BlockscoutController.cleanupOldPending)

// Get queue statistics
router.get('/queue-stats', BlockscoutController.getQueueStats)

export default router
