import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { profileUpdateService } from '../services/profile-update.service'
import { logger } from '../utils/logger.util'

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id

      const profile = await profileUpdateService.getUserProfile(userId)

      if (!profile) {
        if (res.headersSent) {
          logger.warn('Response already sent, skipping profile get response')
          return
        }
        return res.status(200).json({
          success: true,
          data: {
            profile: null,
            message: 'Profile not yet created. Process some content to generate a profile.',
          },
        })
      }

      if (res.headersSent) {
        logger.warn('Response already sent, skipping profile get response')
        return
      }

      res.status(200).json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            user_id: profile.user_id,
            static_profile: {
              json: profile.static_profile_json,
              text: profile.static_profile_text,
            },
            dynamic_profile: {
              json: profile.dynamic_profile_json,
              text: profile.dynamic_profile_text,
            },
            last_updated: profile.last_updated,
            last_memory_analyzed: profile.last_memory_analyzed,
            version: profile.version,
          },
        },
      })
    } catch (error) {
      logger.error('Error getting profile:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile',
        })
      } else {
        logger.warn('Response already sent, cannot send error response')
      }
    }
  }

  static async refreshProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id

      logger.log('[profile/refresh] starting', {
        ts: new Date().toISOString(),
        userId,
      })

      let profile
      try {
        profile = await profileUpdateService.updateUserProfile(userId, true)
      } catch (error) {
        logger.error('Error refreshing profile, retrying once:', error)

        try {
          profile = await profileUpdateService.updateUserProfile(userId, true)
        } catch (retryError) {
          logger.error('Error refreshing profile on retry:', retryError)
          throw retryError
        }
      }

      logger.log('[profile/refresh] completed', {
        ts: new Date().toISOString(),
        userId,
        version: profile.version,
      })

      if (res.headersSent) {
        logger.warn('Response already sent, skipping profile refresh response')
        return
      }

      res.status(200).json({
        success: true,
        message: 'Profile refreshed successfully',
        data: {
          profile: {
            id: profile.id,
            user_id: profile.user_id,
            static_profile: {
              json: profile.static_profile_json,
              text: profile.static_profile_text,
            },
            dynamic_profile: {
              json: profile.dynamic_profile_json,
              text: profile.dynamic_profile_text,
            },
            last_updated: profile.last_updated,
            last_memory_analyzed: profile.last_memory_analyzed,
            version: profile.version,
          },
        },
      })
    } catch (error) {
      logger.error('Error refreshing profile:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to refresh profile',
        })
      } else {
        logger.warn('Response already sent, cannot send error response')
      }
    }
  }

  static async getProfileContext(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id

      const context = await profileUpdateService.getProfileContext(userId)

      if (res.headersSent) {
        logger.warn('Response already sent, skipping profile context response')
        return
      }

      res.status(200).json({
        success: true,
        data: {
          context: context || '',
        },
      })
    } catch (error) {
      logger.error('Error getting profile context:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile context',
        })
      } else {
        logger.warn('Response already sent, cannot send error response')
      }
    }
  }
}
