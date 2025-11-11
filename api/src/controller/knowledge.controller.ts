import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { knowledgeVelocityService } from '../services/knowledge-velocity.service'
import { knowledgeImpactService } from '../services/knowledge-impact.service'
import { achievementService } from '../services/achievement.service'
import { learningPathService } from '../services/learning-path.service'
import { benchmarkService } from '../services/benchmark.service'
import { logger } from '../utils/logger.util'

export class KnowledgeController {
  static async getVelocity(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = (req.query.period_type as 'daily' | 'weekly') || 'weekly'

      const latest = await knowledgeVelocityService.getLatestScore(userId, periodType)
      const historical = await knowledgeVelocityService.getHistoricalScores(userId, periodType)

      res.status(200).json({
        success: true,
        data: {
          latest,
          historical,
        },
      })
    } catch (error) {
      logger.error('Error getting velocity:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get velocity',
      })
    }
  }

  static async getImpact(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = (req.query.period_type as 'daily' | 'weekly') || 'weekly'

      const latest = await knowledgeImpactService.getLatestScore(userId, periodType)
      const historical = await knowledgeImpactService.getHistoricalScores(userId, periodType)

      res.status(200).json({
        success: true,
        data: {
          latest,
          historical,
        },
      })
    } catch (error) {
      logger.error('Error getting impact:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get impact',
      })
    }
  }

  static async getScores(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = (req.query.period_type as 'daily' | 'weekly') || 'weekly'

      const [velocity, impact] = await Promise.all([
        knowledgeVelocityService.getLatestScore(userId, periodType),
        knowledgeImpactService.getLatestScore(userId, periodType),
      ])

      const velocityHistorical = await knowledgeVelocityService.getHistoricalScores(userId, periodType)
      const impactHistorical = await knowledgeImpactService.getHistoricalScores(userId, periodType)

      res.status(200).json({
        success: true,
        data: {
          velocity,
          impact,
          velocityHistorical,
          impactHistorical,
        },
      })
    } catch (error) {
      logger.error('Error getting scores:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scores',
      })
    }
  }

  static async getAchievements(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const achievements = await achievementService.getUserAchievements(userId)

      res.status(200).json({
        success: true,
        data: {
          achievements,
        },
      })
    } catch (error) {
      logger.error('Error getting achievements:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get achievements',
      })
    }
  }

  static async getLearningPath(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      let path = await learningPathService.getLatestLearningPath(userId)

      if (!path) {
        path = await learningPathService.generateLearningPath(userId)
      }

      res.status(200).json({
        success: true,
        data: {
          path,
        },
      })
    } catch (error) {
      logger.error('Error getting learning path:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get learning path',
      })
    }
  }

  static async getBenchmarks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const benchmarks = await benchmarkService.getUserBenchmarks(userId)

      res.status(200).json({
        success: true,
        data: {
          benchmarks,
        },
      })
    } catch (error) {
      logger.error('Error getting benchmarks:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get benchmarks',
      })
    }
  }

  static async calculateScores(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const periodType = (req.body.period_type as 'daily' | 'weekly') || 'weekly'

      const now = new Date()
      const periodStart = periodType === 'daily'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const periodEnd = now

      const [velocityMetrics, impactMetrics] = await Promise.all([
        knowledgeVelocityService.calculateVelocityScore(userId, periodType, periodStart, periodEnd),
        knowledgeImpactService.calculateImpactScore(userId, periodType, periodStart, periodEnd),
      ])

      if (!velocityMetrics || !impactMetrics) {
        return res.status(200).json({
          success: true,
          message: 'No data available for score calculation',
        })
      }

      await knowledgeVelocityService.saveVelocityScore(
        userId,
        periodType,
        periodStart,
        periodEnd,
        velocityMetrics,
        impactMetrics
      )

      const impactScore = impactMetrics.impactScore
      await knowledgeImpactService.getLatestScore(userId, periodType)

      const newlyUnlocked = await achievementService.checkAndAwardAchievements(userId)

      res.status(200).json({
        success: true,
        message: 'Scores calculated successfully',
        data: {
          velocity: velocityMetrics,
          impact: impactMetrics,
          newlyUnlockedAchievements: newlyUnlocked,
        },
      })
    } catch (error) {
      logger.error('Error calculating scores:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate scores',
      })
    }
  }

  static async setOptIn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id
      const { opt_in } = req.body

      if (typeof opt_in !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'opt_in must be a boolean',
        })
      }

      await benchmarkService.setOptIn(userId, opt_in)

      res.status(200).json({
        success: true,
        message: 'Opt-in status updated',
      })
    } catch (error) {
      logger.error('Error setting opt-in:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set opt-in',
      })
    }
  }
}

