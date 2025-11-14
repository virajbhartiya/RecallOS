import { contentQueue } from '../lib/queue.lib'
import { logger } from '../utils/logger.util'

/**
 * Check queue status and provide information about jobs
 */
export async function getQueueStatus() {
  try {
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      contentQueue.getWaiting(),
      contentQueue.getActive(),
      contentQueue.getDelayed(),
      contentQueue.getCompleted(),
      contentQueue.getFailed(),
    ])

    const stats = {
      waiting: waiting.length,
      active: active.length,
      delayed: delayed.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + delayed.length,
    }

    logger.log('[queue-status] Queue statistics', stats)

    // Show active jobs that might be using old code
    if (active.length > 0) {
      logger.warn('[queue-status] Active jobs detected', {
        count: active.length,
        note: 'These jobs may be using old sequential processing. They will complete with current code on next retry or new jobs will use optimized code.',
        jobs: active.map(job => ({
          id: job.id,
          userId: job.data.user_id,
          started: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        })),
      })
    }

    return stats
  } catch (error) {
    logger.error('[queue-status] Error getting queue status', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// CLI entry point
if (require.main === module) {
  getQueueStatus()
    .then((stats) => {
      console.log('\nQueue Status:')
      console.log(JSON.stringify(stats, null, 2))
      console.log('\nNote: Jobs already in the queue will automatically use the optimized parallel processing code when processed.')
      console.log('Active jobs may be using old code, but will benefit from optimizations on retry or when new jobs start.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error getting queue status:', error)
      process.exit(1)
    })
}

