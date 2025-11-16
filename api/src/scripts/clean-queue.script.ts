/**
 * Clean Redis Queue Script
 *
 * This script empties and cleans the Redis queue by removing all jobs
 * (waiting, active, delayed, completed, failed) and all application-specific
 * Redis keys (caches, cancellation keys, search jobs, etc.).
 *
 * Usage:
 *   npm run clean:queue
 */

import { contentQueue, cleanQueue } from '../lib/queue.lib'
import { getRedisClient, scanKeys } from '../lib/redis.lib'
import { logger } from '../utils/logger.util'
import dotenv from 'dotenv'

dotenv.config()

const REDIS_KEY_PATTERNS = [
  'search_cache:*',
  'rerank_cache:*',
  'query_classification:*',
  'user_profile:*',
  'user_profile_context:*',
  'queue:process-content:cancelled:*',
  'search_job:*',
  'bull:process-content:*',
]

async function cleanRedisKeys() {
  const redis = getRedisClient()
  const stats: Record<string, number> = {}

  for (const pattern of REDIS_KEY_PATTERNS) {
    try {
      const keys = await scanKeys(redis, pattern, 10000)
      if (keys.length > 0) {
        await redis.del(...keys)
        stats[pattern] = keys.length
        logger.log(`Cleaned Redis keys`, { pattern, count: keys.length })
      } else {
        stats[pattern] = 0
      }
    } catch (error) {
      logger.error(`Error cleaning Redis keys for pattern ${pattern}:`, error)
      stats[pattern] = -1
    }
  }

  return stats
}

async function main() {
  try {
    logger.log('Starting Redis cleanup', {
      queueName: 'process-content',
    })

    const queueResult = await cleanQueue()
    const redisStats = await cleanRedisKeys()

    console.log('\n=== Queue Cleanup Summary ===')
    console.log(`Waiting jobs: ${queueResult.waiting}`)
    console.log(`Active jobs: ${queueResult.active}`)
    console.log(`Delayed jobs: ${queueResult.delayed}`)
    console.log(`Completed jobs: ${queueResult.completed}`)
    console.log(`Failed jobs: ${queueResult.failed}`)
    console.log(`Total jobs: ${queueResult.total}`)
    console.log(`Removed: ${queueResult.removed}`)
    console.log(`Remaining: ${queueResult.remaining}`)
    console.log('\n=== Redis Keys Cleanup Summary ===')
    for (const [pattern, count] of Object.entries(redisStats)) {
      if (count >= 0) {
        console.log(`${pattern}: ${count} keys removed`)
      } else {
        console.log(`${pattern}: error occurred`)
      }
    }
    const totalKeysRemoved = Object.values(redisStats).reduce(
      (sum, count) => sum + (count > 0 ? count : 0),
      0
    )
    console.log(`Total Redis keys removed: ${totalKeysRemoved}`)
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
