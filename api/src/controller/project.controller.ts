import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import AppError from '../utils/app-error.util'
import { projectGroupingService } from '../services/project-grouping.service'
import { logger } from '../utils/logger.util'

export class ProjectController {
  /**
   * GET /api/projects
   * Get all project groups for the user
   */
  static async getProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const minMemories = req.query.minMemories
        ? parseInt(req.query.minMemories as string)
        : undefined
      const timeWindow = req.query.timeWindowDays
        ? parseInt(req.query.timeWindowDays as string)
        : undefined
      const maxProjects = req.query.maxProjects
        ? parseInt(req.query.maxProjects as string)
        : undefined

      const projects = await projectGroupingService.groupMemoriesByProjects(req.user.id, {
        minMemoriesPerProject: minMemories,
        timeWindowDays: timeWindow,
        maxProjects,
      })

      res.status(200).json({
        success: true,
        data: projects,
      })
    } catch (error) {
      logger.error('[project] Error getting projects:', error)
      next(new AppError('Failed to get projects', 500))
    }
  }

  /**
   * GET /api/projects/:projectId/changes
   * Get what changed in a project since a given date
   */
  static async getProjectChanges(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const { projectId } = req.params
      const sinceDate = req.query.since
        ? new Date(req.query.since as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default: last 7 days

      if (isNaN(sinceDate.getTime())) {
        return next(new AppError('Invalid date format', 400))
      }

      const changes = await projectGroupingService.getProjectChanges(
        req.user.id,
        projectId,
        sinceDate
      )

      if (!changes) {
        return next(new AppError('Project not found', 404))
      }

      res.status(200).json({
        success: true,
        data: changes,
      })
    } catch (error) {
      logger.error('[project] Error getting project changes:', error)
      next(new AppError('Failed to get project changes', 500))
    }
  }

  /**
   * GET /api/projects/:projectId/memories
   * Search memories within a specific project
   */
  static async getProjectMemories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401))
      }

      const { projectId } = req.params
      const query = req.query.query as string | undefined
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

      const memories = await projectGroupingService.searchProjectMemories(
        req.user.id,
        projectId,
        query,
        limit
      )

      res.status(200).json({
        success: true,
        data: {
          projectId,
          memories,
          count: memories.length,
        },
      })
    } catch (error) {
      logger.error('[project] Error getting project memories:', error)
      next(new AppError('Failed to get project memories', 500))
    }
  }
}

