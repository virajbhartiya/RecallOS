import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { privacyService } from '../services/privacy.service'
import { auditLogService } from '../services/audit-log.service'
import { logger } from '../utils/logger.util'
import AppError from '../utils/app-error.util'

export class PrivacyController {
  /**
   * Get all privacy settings for the authenticated user
   */
  static async getPrivacySettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined
      const settings = await privacyService.getUserPrivacySettings(req.user.id, domain)

      res.status(200).json({
        success: true,
        data: { settings },
      })
    } catch (error) {
      logger.error('[privacy] Error getting privacy settings', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      })
      next(new AppError('Failed to get privacy settings', 500))
    }
  }

  /**
   * Get privacy setting for a specific domain
   */
  static async getDomainPrivacySetting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const domain = req.params.domain
      if (!domain) {
        return next(new AppError('Domain parameter is required', 400))
      }

      const setting = await privacyService.getDomainPrivacySetting(req.user.id, domain)

      res.status(200).json({
        success: true,
        data: { setting },
      })
    } catch (error) {
      logger.error('[privacy] Error getting domain privacy setting', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        domain: req.params.domain,
      })
      next(new AppError('Failed to get domain privacy setting', 500))
    }
  }

  /**
   * Create or update privacy setting for a domain
   */
  static async upsertPrivacySetting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const { domain, block_capture, block_search, redact_content, notes } = req.body

      if (!domain || typeof domain !== 'string') {
        return next(new AppError('Domain is required', 400))
      }

      const setting = await privacyService.upsertPrivacySetting(req.user.id, domain, {
        block_capture,
        block_search,
        redact_content,
        notes,
      })

      // Log the privacy setting change
      await auditLogService.logPrivacySettingChange(
        req.user.id,
        domain,
        setting.id ? 'updated' : 'created',
        {
          block_capture: setting.block_capture,
          block_search: setting.block_search,
          redact_content: setting.redact_content,
        },
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      )

      res.status(200).json({
        success: true,
        data: { setting },
      })
    } catch (error) {
      logger.error('[privacy] Error upserting privacy setting', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        domain: req.body?.domain,
      })
      next(new AppError('Failed to update privacy setting', 500))
    }
  }

  /**
   * Delete privacy setting for a domain
   */
  static async deletePrivacySetting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const domain = req.params.domain
      if (!domain) {
        return next(new AppError('Domain parameter is required', 400))
      }

      await privacyService.deletePrivacySetting(req.user.id, domain)

      // Log the privacy setting change
      await auditLogService.logPrivacySettingChange(
        req.user.id,
        domain,
        'deleted',
        {},
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      )

      res.status(200).json({
        success: true,
        message: 'Privacy setting deleted',
      })
    } catch (error) {
      logger.error('[privacy] Error deleting privacy setting', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        domain: req.params.domain,
      })
      next(new AppError('Failed to delete privacy setting', 500))
    }
  }

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
      const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined
      const limit = req.query.limit ? Number(req.query.limit) : 100
      const offset = req.query.offset ? Number(req.query.offset) : 0
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const result = await auditLogService.getUserAuditLogs(req.user.id, {
        eventType: eventType as any,
        eventCategory: eventCategory as any,
        domain,
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
