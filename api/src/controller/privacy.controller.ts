import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { auditLogService, AuditEventType, AuditEventCategory } from '../services/audit-log.service'
import { logger } from '../utils/logger.util'
import AppError from '../utils/app-error.util'

export class PrivacyController {
  /**
   * Get audit logs for the authenticated user
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined
      const eventCategory =
        typeof req.query.eventCategory === 'string' ? req.query.eventCategory : undefined
      const limit = req.query.limit ? Number(req.query.limit) : 100
      const offset = req.query.offset ? Number(req.query.offset) : 0
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const result = await auditLogService.getUserAuditLogs(req.user.id, {
        eventType: eventType as AuditEventType | undefined,
        eventCategory: eventCategory as AuditEventCategory | undefined,
        limit,
        offset,
        startDate,
        endDate,
      })

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      logger.error('[privacy] Error getting audit logs', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      })
      next(new AppError('Failed to get audit logs', 500))
    }
  }
}
