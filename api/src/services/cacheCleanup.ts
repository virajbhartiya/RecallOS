import { SearchCacheService } from './searchCache';

export class CacheCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start the automatic cleanup service
   * Runs every 10 minutes to clean expired cache entries
   */
  static startCleanupService(): void {
    if (this.cleanupInterval) {
      console.log('Cache cleanup service already running');
      return;
    }

    console.log('Starting cache cleanup service...');
    
    // Run cleanup immediately
    this.runCleanup();
    
    // Then run every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 10 * 60 * 1000); // 10 minutes

    console.log('Cache cleanup service started - will run every 10 minutes');
  }

  /**
   * Stop the automatic cleanup service
   */
  static stopCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cache cleanup service stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  private static async runCleanup(): Promise<void> {
    try {
      console.log('Running cache cleanup...');
      await SearchCacheService.cleanupExpiredCache();
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
}
