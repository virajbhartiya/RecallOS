import { profileUpdateService } from '../services/profile-update.service'
import { logger } from '../utils/logger.util'

const noMemoriesCooldown = new Map<string, number>()
const getCooldownMs = () =>
  Number(process.env.PROFILE_NO_MEMORIES_COOLDOWN_HOURS || 6) * 60 * 60 * 1000

const isWithinCooldown = (userId: string): boolean => {
  const until = noMemoriesCooldown.get(userId)
  if (!until) return false
  if (Date.now() < until) return true
  noMemoriesCooldown.delete(userId)
  return false
}

const scheduleCooldown = (userId: string) => {
  const cooldownMs = getCooldownMs()
  if (cooldownMs <= 0) return
  noMemoriesCooldown.set(userId, Date.now() + cooldownMs)
}

const extractErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const isNoMemoriesError = (error: unknown): boolean =>
  extractErrorMessage(error).toLowerCase().includes('no memories')

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
    let skipped = 0

    for (const userId of userIds) {
      if (isWithinCooldown(userId)) {
        skipped++
        const until = new Date(noMemoriesCooldown.get(userId) || Date.now()).toISOString()
        logger.log(`[Profile Worker] skip cooldown user=${userId} until=${until}`)
        continue
      }

      const attemptUpdate = async () => profileUpdateService.updateUserProfile(userId, true)

      try {
        try {
          await attemptUpdate()
        } catch (error) {
          if (isNoMemoriesError(error)) {
            scheduleCooldown(userId)
            skipped++
            logger.warn(
              `[Profile Worker] skip no-memories user=${userId} cooldown=${Number(process.env.PROFILE_NO_MEMORIES_COOLDOWN_HOURS || 6)}h`
            )
            continue
          }

          logger.error(
            `[Profile Worker] retry update user=${userId} error="${extractErrorMessage(error)}"`
          )

          try {
            await attemptUpdate()
          } catch (retryError) {
            if (isNoMemoriesError(retryError)) {
              scheduleCooldown(userId)
              skipped++
              logger.warn(
                `[Profile Worker] skip no-memories-after-retry user=${userId} cooldown=${Number(process.env.PROFILE_NO_MEMORIES_COOLDOWN_HOURS || 6)}h`
              )
              continue
            }

            logger.error(
              `[Profile Worker] retry failed user=${userId} error="${extractErrorMessage(retryError)}"`
            )
            throw retryError
          }
        }

        updated++
      } catch (error) {
        failed++
        logger.error(
          `[Profile Worker] update-error user=${userId} error="${extractErrorMessage(error)}"`
        )
      }
    }

    return { updated, failed, skipped }
  } catch (error) {
    logger.error(
      `[Profile Worker] batch-failed error="${
        error instanceof Error ? error.message : String(error)
      }"`
    )
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
      logger.error(
        `[Profile Worker] cycle-failed error="${
          error instanceof Error ? error.message : String(error)
        }"`
      )
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
