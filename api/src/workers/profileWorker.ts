import { profileUpdateService } from '../services/profileUpdate';
import { logger } from '../utils/logger';

export const startProfileWorker = async (daysSinceLastUpdate: number = 7) => {
  logger.log('[Profile Worker] Starting batch profile update', {
    ts: new Date().toISOString(),
    daysSinceLastUpdate,
  });

  try {
    const userIds = await profileUpdateService.getUsersNeedingUpdate(daysSinceLastUpdate);
    
    logger.log('[Profile Worker] Found users needing update', {
      ts: new Date().toISOString(),
      count: userIds.length,
    });

    if (userIds.length === 0) {
      logger.log('[Profile Worker] No users need profile update', {
        ts: new Date().toISOString(),
      });
      return { updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        logger.log('[Profile Worker] Updating profile', {
          ts: new Date().toISOString(),
          userId,
        });

        await profileUpdateService.updateUserProfile(userId);
        updated++;

        logger.log('[Profile Worker] Profile updated successfully', {
          ts: new Date().toISOString(),
          userId,
        });
      } catch (error) {
        failed++;
        logger.error('[Profile Worker] Error updating profile', {
          ts: new Date().toISOString(),
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.log('[Profile Worker] Batch update completed', {
      ts: new Date().toISOString(),
      updated,
      failed,
      total: userIds.length,
    });

    return { updated, failed };
  } catch (error) {
    logger.error('[Profile Worker] Batch update failed', {
      ts: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const runProfileWorker = async () => {
  const daysSinceLastUpdate = Number(process.env.PROFILE_UPDATE_INTERVAL_DAYS || 7);
  return await startProfileWorker(daysSinceLastUpdate);
};

let profileWorkerInterval: NodeJS.Timeout | null = null;

export const startCyclicProfileWorker = () => {
  const intervalHours = Number(process.env.PROFILE_UPDATE_CYCLE_HOURS || 24);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const daysSinceLastUpdate = Number(process.env.PROFILE_UPDATE_INTERVAL_DAYS || 7);

  logger.log('[Profile Worker] Starting cyclic profile update worker', {
    ts: new Date().toISOString(),
    intervalHours,
    intervalMs,
    daysSinceLastUpdate,
  });

  const runUpdate = async () => {
    try {
      logger.log('[Profile Worker] Cyclic update cycle started', {
        ts: new Date().toISOString(),
      });
      await startProfileWorker(daysSinceLastUpdate);
      logger.log('[Profile Worker] Cyclic update cycle completed', {
        ts: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Profile Worker] Cyclic update cycle failed', {
        ts: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  runUpdate();

  profileWorkerInterval = setInterval(runUpdate, intervalMs);

  logger.log('[Profile Worker] Cyclic profile update worker started', {
    ts: new Date().toISOString(),
    nextUpdateIn: `${intervalHours} hours`,
  });

  return profileWorkerInterval;
};

export const stopCyclicProfileWorker = () => {
  if (profileWorkerInterval) {
    clearInterval(profileWorkerInterval);
    profileWorkerInterval = null;
    logger.log('[Profile Worker] Cyclic profile update worker stopped', {
      ts: new Date().toISOString(),
    });
  }
};

