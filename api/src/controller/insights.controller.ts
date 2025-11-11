import { Request, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { insightsService } from '../services/insights.service'
import { logger } from '../utils/logger.util'

type PeriodType = 'daily' | 'weekly'

export class InsightsController {
  static async getSummaries(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = req.query.period_type as PeriodType | undefined
      const limit = req.query.limit
        ? Math.min(parseInt(req.query.limit as string), 100)
        : 50

      const summaries = await insightsService.getSummaries(userId, periodType, limit)

      res.status(200).json({
        success: true,
        data: {
          summaries,
          count: summaries.length,
        },
      })
    } catch (error) {
      logger.error('Error getting summaries:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get summaries',
      })
    }
  }

  static async getLatestSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = (req.query.period_type as PeriodType) || 'daily'

      if (periodType !== 'daily' && periodType !== 'weekly') {
        return res.status(400).json({
          success: false,
          error: 'Invalid period_type. Must be "daily" or "weekly"',
        })
      }

      const summary = await insightsService.getLatestSummary(userId, periodType)

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'No summary found',
        })
      }

      res.status(200).json({
        success: true,
        data: {
          summary,
        },
      })
    } catch (error) {
      logger.error('Error getting latest summary:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get latest summary',
      })
    }
  }

  static async getSummaryById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Summary ID is required',
        })
      }

      const summary = await insightsService.getSummaryById(userId, id)

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Summary not found',
        })
      }

      res.status(200).json({
        success: true,
        data: {
          summary,
        },
      })
    } catch (error) {
      logger.error('Error getting summary by ID:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get summary',
      })
    }
  }

  static async generateSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const { period_type, date } = req.body

      if (!period_type || (period_type !== 'daily' && period_type !== 'weekly')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid period_type. Must be "daily" or "weekly"',
        })
      }

      const targetDate = date ? new Date(date) : new Date()

      res.status(200).json({
        success: true,
        message: 'Summary generation started. Please refresh to see results.',
        data: {
          generating: true,
        },
      })

      setImmediate(async () => {
        try {
          logger.log('[Insights Controller] Starting background summary generation', {
            userId,
            period_type,
            targetDate: targetDate.toISOString(),
          })
          
          let result
          if (period_type === 'daily') {
            result = await insightsService.generateDailySummary(userId, targetDate)
          } else {
            result = await insightsService.generateWeeklySummary(userId, targetDate)
          }
          
          if (result) {
            logger.log('[Insights Controller] Background summary generation completed successfully', {
              userId,
              period_type,
              summaryId: result.id,
            })
          } else {
            logger.log('[Insights Controller] Background summary generation returned null', {
              userId,
              period_type,
              reason: 'Summary already exists or no memories found',
            })
          }
        } catch (error) {
          logger.error('[Insights Controller] Error in background summary generation:', {
            userId,
            period_type,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
        }
      })
    } catch (error) {
      logger.error('Error generating summary:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      })
    }
  }
}

