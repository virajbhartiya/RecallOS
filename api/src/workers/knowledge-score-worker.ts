import { prisma } from '../lib/prisma.lib'
import { knowledgeVelocityService } from '../services/knowledge-velocity.service'
import { knowledgeImpactService } from '../services/knowledge-impact.service'
import { achievementService } from '../services/achievement.service'
import { benchmarkService } from '../services/benchmark.service'
import { logger } from '../utils/logger.util'

export const startKnowledgeScoreWorker = async () => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true },
    })

    for (const user of users) {
      try {
        const now = new Date()
        const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const [existingDaily, existingWeekly] = await Promise.all([
          prisma.knowledgeScore.findFirst({
            where: {
              user_id: user.id,
              period_type: 'daily',
              period_start: {
                gte: dailyStart,
                lt: new Date(dailyStart.getTime() + 24 * 60 * 60 * 1000),
              },
            },
          }),
          prisma.knowledgeScore.findFirst({
            where: {
              user_id: user.id,
              period_type: 'weekly',
              period_start: {
                gte: weeklyStart,
              },
            },
          }),
        ])

        if (!existingDaily) {
          const [dailyVelocity, dailyImpact] = await Promise.all([
            knowledgeVelocityService.calculateVelocityScore(user.id, 'daily', dailyStart, now),
            knowledgeImpactService.calculateImpactScore(user.id, 'daily', dailyStart, now),
          ])

          if (dailyVelocity && dailyImpact) {
            await knowledgeVelocityService.saveVelocityScore(
              user.id,
              'daily',
              dailyStart,
              now,
              dailyVelocity,
              dailyImpact
            )
            logger.log('[Knowledge Score Worker] Created daily score', { userId: user.id })
          }
        }

        if (!existingWeekly) {
          const [weeklyVelocity, weeklyImpact] = await Promise.all([
            knowledgeVelocityService.calculateVelocityScore(user.id, 'weekly', weeklyStart, now),
            knowledgeImpactService.calculateImpactScore(user.id, 'weekly', weeklyStart, now),
          ])

          if (weeklyVelocity && weeklyImpact) {
            await knowledgeVelocityService.saveVelocityScore(
              user.id,
              'weekly',
              weeklyStart,
              now,
              weeklyVelocity,
              weeklyImpact
            )
            logger.log('[Knowledge Score Worker] Created weekly score', { userId: user.id })
          }
        } else {
          const [weeklyVelocity, weeklyImpact] = await Promise.all([
            knowledgeVelocityService.calculateVelocityScore(user.id, 'weekly', weeklyStart, now),
            knowledgeImpactService.calculateImpactScore(user.id, 'weekly', weeklyStart, now),
          ])

          if (weeklyVelocity && weeklyImpact) {
            await knowledgeVelocityService.saveVelocityScore(
              user.id,
              'weekly',
              weeklyStart,
              now,
              weeklyVelocity,
              weeklyImpact
            )
            logger.log('[Knowledge Score Worker] Updated weekly score', { userId: user.id })
          }
        }

        await achievementService.checkAndAwardAchievements(user.id)
        await benchmarkService.calculateUserBenchmarks(user.id)
      } catch (error) {
        logger.error('[Knowledge Score Worker] Error processing user', {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } catch (error) {
    logger.error('[Knowledge Score Worker] Batch processing failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

let knowledgeScoreWorkerInterval: NodeJS.Timeout | null = null

export const startCyclicKnowledgeScoreWorker = () => {
  const intervalHours = Number(process.env.KNOWLEDGE_SCORE_INTERVAL_HOURS || 24)

  if (knowledgeScoreWorkerInterval) {
    clearInterval(knowledgeScoreWorkerInterval)
  }

  const runWorker = async () => {
    try {
      await startKnowledgeScoreWorker()
    } catch (error) {
      logger.error('[Knowledge Score Worker] Cyclic update failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  runWorker()

  knowledgeScoreWorkerInterval = setInterval(runWorker, intervalHours * 60 * 60 * 1000)

  logger.log('[Knowledge Score Worker] Started cyclic worker', {
    intervalHours,
  })
}

export const stopCyclicKnowledgeScoreWorker = () => {
  if (knowledgeScoreWorkerInterval) {
    clearInterval(knowledgeScoreWorkerInterval)
    knowledgeScoreWorkerInterval = null
    logger.log('[Knowledge Score Worker] Stopped cyclic worker')
  }
}
