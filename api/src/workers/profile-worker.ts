import { profileUpdateService } from '../services/profile-update.service'
import { logger } from '../utils/logger.util'

export const startProfileWorker = async (
  daysSinceLastUpdate: number = 7,
  hoursSinceLastUpdate?: number
) => {
  try {
    const userIds =
      hoursSinceLastUpdate !== undefined
        ? await profileUpdateService.getUsersNeedingUpdateByHours(hoursSinceLastUpdate)
        : await profileUpdateService.getUsersNeedingUpdate(daysSinceLastUpdate)

    if (userIds.length === 0) {
      return { updated: 0, failed: 0 }
    }

    let updated = 0
    let failed = 0

    for (const userId of userIds) {
      try {
        let profile
        try {
          profile = await profileUpdateService.updateUserProfile(userId, true)
        } catch (error) {
          logger.error('[Profile Worker] Error updating profile, retrying once', {
            ts: new Date().toISOString(),
            userId,
            error: error instanceof Error ? error.message : String(error),
          })

          try {
            profile = await profileUpdateService.updateUserProfile(userId, true)
          } catch (retryError) {
            logger.error('[Profile Worker] Error updating profile on retry', {
              ts: new Date().toISOString(),
              userId,
              error: retryError instanceof Error ? retryError.message : String(retryError),
            })
            throw retryError
          }
        }

        updated++
      } catch (error) {
        failed++
        logger.error('[Profile Worker] Error updating profile', {
          ts: new Date().toISOString(),
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { updated, failed }
  } catch (error) {
    logger.error('[Profile Worker] Batch update failed', {
      ts: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const runProfileWorker = async () => {
  const daysSinceLastUpdate = Number(process.env.PROFILE_UPDATE_INTERVAL_DAYS || 7)
  return await startProfileWorker(daysSinceLastUpdate)
}

let profileWorkerInterval: NodeJS.Timeout | null = null

export const startCyclicProfileWorker = () => {
  const intervalHours = Number(process.env.PROFILE_UPDATE_CYCLE_HOURS || 24)
  const intervalMs = intervalHours * 60 * 60 * 1000
  const daysSinceLastUpdate = Number(process.env.PROFILE_UPDATE_INTERVAL_DAYS || 7)

  const useHoursBasedUpdate = intervalHours < 24
  const hoursSinceLastUpdate = useHoursBasedUpdate ? intervalHours : undefined


  const runUpdate = async () => {
    try {
      await startProfileWorker(daysSinceLastUpdate, hoursSinceLastUpdate)
    } catch (error) {
      logger.error('[Profile Worker] Cyclic update cycle failed', {
        ts: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  runUpdate()

  profileWorkerInterval = setInterval(runUpdate, intervalMs)


  return profileWorkerInterval
}

export const stopCyclicProfileWorker = () => {
  if (profileWorkerInterval) {
    clearInterval(profileWorkerInterval)
    profileWorkerInterval = null
  }
}
