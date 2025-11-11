import { insightsService } from '../services/insights.service'
import { logger } from '../utils/logger.util'

export const startInsightsWorker = async () => {
  try {
    const userIds = await insightsService.getActiveUsers()

    if (userIds.length === 0) {
      return { generated: 0, failed: 0 }
    }

    let generated = 0
    let failed = 0

    for (const userId of userIds) {
      try {
        const [dailySummary, weeklySummary] = await Promise.all([
          insightsService.generateDailySummary(userId).catch((err): null => {
            logger.error('[Insights Worker] Error generating daily summary', {
              ts: new Date().toISOString(),
              userId,
              error: err instanceof Error ? err.message : String(err),
            })
            return null
          }),
          insightsService.generateWeeklySummary(userId).catch((err): null => {
            logger.error('[Insights Worker] Error generating weekly summary', {
              ts: new Date().toISOString(),
              userId,
              error: err instanceof Error ? err.message : String(err),
            })
            return null
          }),
        ])

        if (dailySummary) {
          generated++
        }

        if (weeklySummary) {
          generated++
        }
      } catch (error) {
        failed++
        logger.error('[Insights Worker] Error generating summaries for user', {
          ts: new Date().toISOString(),
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { generated, failed }
  } catch (error) {
    logger.error('[Insights Worker] Batch summary generation failed', {
      ts: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const runInsightsWorker = async () => {
  return await startInsightsWorker()
}

let insightsWorkerInterval: NodeJS.Timeout | null = null
let dailyWorkerInterval: NodeJS.Timeout | null = null
let weeklyWorkerInterval: NodeJS.Timeout | null = null

const getNextMidnight = (): Date => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight
}

const getNextSundayMidnight = (): Date => {
  const now = new Date()
  const nextSunday = new Date(now)
  const dayOfWeek = now.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  nextSunday.setDate(now.getDate() + daysUntilSunday)
  nextSunday.setHours(0, 0, 0, 0)
  return nextSunday
}

export const startCyclicInsightsWorker = () => {
  const dailyIntervalHours = Number(process.env.INSIGHTS_DAILY_INTERVAL_HOURS || 24)
  const weeklyIntervalHours = Number(process.env.INSIGHTS_WEEKLY_INTERVAL_HOURS || 168)


  const runDailyUpdate = async () => {
    try {
      const userIds = await insightsService.getActiveUsers()
      for (const userId of userIds) {
        try {
          await insightsService.generateDailySummary(userId)
        } catch (error) {
          logger.error('[Insights Worker] Error in daily summary generation', {
            ts: new Date().toISOString(),
            userId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      logger.error('[Insights Worker] Daily update cycle failed', {
        ts: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const runWeeklyUpdate = async () => {
    try {
      const userIds = await insightsService.getActiveUsers()
      for (const userId of userIds) {
        try {
          await insightsService.generateWeeklySummary(userId)
        } catch (error) {
          logger.error('[Insights Worker] Error in weekly summary generation', {
            ts: new Date().toISOString(),
            userId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      logger.error('[Insights Worker] Weekly update cycle failed', {
        ts: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const scheduleDaily = () => {
    const nextMidnight = getNextMidnight()
    const msUntilMidnight = nextMidnight.getTime() - Date.now()

    setTimeout(() => {
      runDailyUpdate()
      dailyWorkerInterval = setInterval(runDailyUpdate, dailyIntervalHours * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  const scheduleWeekly = () => {
    const nextSunday = getNextSundayMidnight()
    const msUntilSunday = nextSunday.getTime() - Date.now()

    setTimeout(() => {
      runWeeklyUpdate()
      weeklyWorkerInterval = setInterval(runWeeklyUpdate, weeklyIntervalHours * 60 * 60 * 1000)
    }, msUntilSunday)
  }

  scheduleDaily()
  scheduleWeekly()


  return { dailyWorkerInterval, weeklyWorkerInterval }
}

export const stopCyclicInsightsWorker = () => {
  if (dailyWorkerInterval) {
    clearInterval(dailyWorkerInterval)
    dailyWorkerInterval = null
  }
  if (weeklyWorkerInterval) {
    clearInterval(weeklyWorkerInterval)
    weeklyWorkerInterval = null
  }
  if (insightsWorkerInterval) {
    clearInterval(insightsWorkerInterval)
    insightsWorkerInterval = null
  }
}

