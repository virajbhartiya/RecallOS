import Queue from 'bull'
import BlockscoutPrefetchService from '../services/blockscoutPrefetch'

// Create queue for processing Blockscout prefetch jobs
const blockscoutQueue = new Queue('blockscout-prefetch', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

// Process jobs
blockscoutQueue.process('prefetch-transaction', async (job) => {
  const { txHash, network } = job.data
  await BlockscoutPrefetchService.prefetchTransaction(txHash, network)
})

blockscoutQueue.process('recheck-transaction', async (job) => {
  const { txHash, network } = job.data
  await BlockscoutPrefetchService.prefetchTransaction(txHash, network)
})

blockscoutQueue.process('batch-prefetch', async (job) => {
  const { transactions } = job.data
  await BlockscoutPrefetchService.batchPrefetch(transactions)
})

blockscoutQueue.process('cleanup-old-pending', async () => {
  await BlockscoutPrefetchService.cleanupOldPendingTransactions()
})

// Queue event handlers
blockscoutQueue.on('completed', (job) => {
  console.log(`Blockscout job ${job.id} completed: ${job.name}`)
})

blockscoutQueue.on('failed', (job, err) => {
  console.error(`Blockscout job ${job?.id} failed: ${job?.name}`, err)
})

blockscoutQueue.on('error', (err) => {
  console.error('Blockscout queue error:', err)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Blockscout worker...')
  await blockscoutQueue.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down Blockscout worker...')
  await blockscoutQueue.close()
  process.exit(0)
})

export default blockscoutQueue
