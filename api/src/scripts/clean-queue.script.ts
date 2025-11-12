/**
 * Clean Redis Queue Script
 *
 * This script empties and cleans the Redis queue by removing all jobs
 * (waiting, active, delayed, completed, failed).
 *
 * Usage:
 *   npm run clean:queue
 */

import { contentQueue, cleanQueue } from '../lib/queue.lib'
import { logger } from '../utils/logger.util'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  try {
    logger.log('Starting queue cleanup', {
      queueName: 'process-content',
    })

    const result = await cleanQueue()

    console.log('\n=== Queue Cleanup Summary ===')
    console.log(`Waiting jobs: ${result.waiting}`)
    console.log(`Active jobs: ${result.active}`)
    console.log(`Delayed jobs: ${result.delayed}`)
    console.log(`Completed jobs: ${result.completed}`)
    console.log(`Failed jobs: ${result.failed}`)
    console.log(`Total jobs: ${result.total}`)
    console.log(`Removed: ${result.removed}`)
    console.log(`Remaining: ${result.remaining}`)
    console.log('============================\n')

    process.exit(0)
  } catch (error) {
    logger.error('Fatal error in queue cleanup script:', error)
    process.exit(1)
  } finally {
    await contentQueue.close()
  }
}

main()
