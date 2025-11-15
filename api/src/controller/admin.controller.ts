import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { getAdminStats } from '../scripts/admin-stats.script'
import { logger } from '../utils/logger.util'
import AppError from '../utils/app-error.util'

export class AdminController {
  /**
   * Get admin statistics (requires admin role - implement role check as needed)
   */
  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // TODO: Add admin role check here
      // if (!req.user?.isAdmin) {
      //   return next(new AppError('Admin access required', 403))
      // }

      const stats = await getAdminStats()

      res.status(200).json({
        success: true,
        data: stats,
      })
    } catch (error) {
      logger.error('[admin] Error getting stats', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      })
      next(new AppError('Failed to get admin stats', 500))
    }
  }
}
