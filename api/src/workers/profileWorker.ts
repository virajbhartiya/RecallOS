import { profileUpdateService } from '../services/profileUpdate';

export const startProfileWorker = async (daysSinceLastUpdate: number = 7) => {
  console.log('[Profile Worker] Starting batch profile update', {
    ts: new Date().toISOString(),
    daysSinceLastUpdate,
  });

  try {
    const userIds = await profileUpdateService.getUsersNeedingUpdate(daysSinceLastUpdate);
    
    console.log('[Profile Worker] Found users needing update', {
      ts: new Date().toISOString(),
      count: userIds.length,
    });

    if (userIds.length === 0) {
      console.log('[Profile Worker] No users need profile update', {
        ts: new Date().toISOString(),
      });
      return { updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        console.log('[Profile Worker] Updating profile', {
          ts: new Date().toISOString(),
          userId,
        });

        await profileUpdateService.updateUserProfile(userId);
        updated++;

        console.log('[Profile Worker] Profile updated successfully', {
          ts: new Date().toISOString(),
          userId,
        });
      } catch (error) {
        failed++;
        console.error('[Profile Worker] Error updating profile', {
          ts: new Date().toISOString(),
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('[Profile Worker] Batch update completed', {
      ts: new Date().toISOString(),
      updated,
      failed,
      total: userIds.length,
    });

    return { updated, failed };
  } catch (error) {
    console.error('[Profile Worker] Batch update failed', {
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

