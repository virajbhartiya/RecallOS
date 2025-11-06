import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { profileUpdateService } from '../services/profileUpdate';

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const profile = await profileUpdateService.getUserProfile(userId);

      if (!profile) {
        return res.status(200).json({
          success: true,
          data: {
            profile: null,
            message: 'Profile not yet created. Process some content to generate a profile.',
          },
        });
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
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      });
    }
  }

  static async refreshProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      console.log('[profile/refresh] starting', {
        ts: new Date().toISOString(),
        userId,
      });

      const profile = await profileUpdateService.updateUserProfile(userId, true);

      console.log('[profile/refresh] completed', {
        ts: new Date().toISOString(),
        userId,
        version: profile.version,
      });

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
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh profile',
      });
    }
  }

  static async getProfileContext(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const context = await profileUpdateService.getProfileContext(userId);

      res.status(200).json({
        success: true,
        data: {
          context: context || '',
        },
      });
    } catch (error) {
      console.error('Error getting profile context:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile context',
      });
    }
  }
}

