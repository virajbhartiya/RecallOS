/**
 * Reset Queue Script
 *
 * This script resets all queue jobs (active, delayed, failed, completed) back to waiting state.
 * Jobs will then be automatically picked up by workers based on the configured concurrency settings.
 *
 * Usage:
 *   npm run reset:queue
 */

import { contentQueue } from '../lib/queue.lib'
import { logger } from '../utils/logger.util'
import dotenv from 'dotenv'

dotenv.config()

async function resetQueue() {
  try {
    logger.log('Starting queue reset', {
      queueName: 'process-content',
    })

    // Get all jobs from all states
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      contentQueue.getWaiting(),
      contentQueue.getActive(),
      contentQueue.getDelayed(),
      contentQueue.getCompleted(),
      contentQueue.getFailed(),
    ])

    const beforeStats = {
      waiting: waiting.length,
      active: active.length,
      delayed: delayed.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + delayed.length + completed.length + failed.length,
    }

    logger.log('Queue state before reset', beforeStats)

    let movedToWaiting = 0
    let errors = 0

    // Move active jobs to waiting
    for (const job of active) {
      try {
        await job.moveToWait()
        movedToWaiting++
      } catch (error) {
        errors++
        logger.warn(`Failed to move active job ${job.id} to waiting`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Move delayed jobs to waiting
    for (const job of delayed) {
      try {
        await job.moveToWait()
        movedToWaiting++
      } catch (error) {
        errors++
        logger.warn(`Failed to move delayed job ${job.id} to waiting`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Retry failed jobs (moves them to waiting)
    for (const job of failed) {
      try {
        await job.retry()
        movedToWaiting++
      } catch (error) {
        errors++
        logger.warn(`Failed to retry failed job ${job.id}`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Move completed jobs to waiting (if you want to reprocess them)
    for (const job of completed) {
      try {
        await job.moveToWait()
        movedToWaiting++
      } catch (error) {
        errors++
        logger.warn(`Failed to move completed job ${job.id} to waiting`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Get final state
    const [waitingAfter, activeAfter, delayedAfter, completedAfter, failedAfter] =
      await Promise.all([
        contentQueue.getWaiting(),
        contentQueue.getActive(),
        contentQueue.getDelayed(),
        contentQueue.getCompleted(),
        contentQueue.getFailed(),
      ])

    const afterStats = {
      waiting: waitingAfter.length,
      active: activeAfter.length,
      delayed: delayedAfter.length,
      completed: completedAfter.length,
      failed: failedAfter.length,
      total:
        waitingAfter.length +
        activeAfter.length +
        delayedAfter.length +
        completedAfter.length +
        failedAfter.length,
    }

    logger.log('Queue state after reset', afterStats)

    console.log('\n=== Queue Reset Summary ===')
    console.log('Before:')
    console.log(`  Waiting: ${beforeStats.waiting}`)
    console.log(`  Active: ${beforeStats.active}`)
    console.log(`  Delayed: ${beforeStats.delayed}`)
    console.log(`  Completed: ${beforeStats.completed}`)
    console.log(`  Failed: ${beforeStats.failed}`)
    console.log(`  Total: ${beforeStats.total}`)
    console.log('\nAfter:')
    console.log(`  Waiting: ${afterStats.waiting}`)
    console.log(`  Active: ${afterStats.active}`)
    console.log(`  Delayed: ${afterStats.delayed}`)
    console.log(`  Completed: ${afterStats.completed}`)
    console.log(`  Failed: ${afterStats.failed}`)
    console.log(`  Total: ${afterStats.total}`)
    console.log(`\nMoved to waiting: ${movedToWaiting}`)
    if (errors > 0) {
      console.log(`Errors: ${errors}`)
    }
    console.log('\nJobs are now in waiting state and will be processed by workers.')
    console.log('============================\n')

    process.exit(0)
  } catch (error) {
    logger.error('Fatal error in queue reset script:', error)
    process.exit(1)
  } finally {
    await contentQueue.close()
  }
}

resetQueue()
