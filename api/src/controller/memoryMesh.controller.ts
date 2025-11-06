import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { memoryMeshService } from '../services/memoryMesh';
import { logger } from '../utils/logger';

export class MemoryMeshController {
  static async getMemoryMesh(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 50, threshold = 0.3 } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const internalUserId: string | undefined = user.id;

      const mesh = await memoryMeshService.getMemoryMesh(
        internalUserId,
        parseInt(limit as string),
        parseFloat(threshold as string)
      );

      res.status(200).json({
        success: true,
        data: mesh,
      });
    } catch (error) {
      logger.error('Error getting memory mesh:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryWithRelations(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memoryWithRelations =
        await memoryMeshService.getMemoryWithRelations(memoryId, user.id);

      res.status(200).json({
        success: true,
        data: memoryWithRelations,
      });
    } catch (error) {
      logger.error('Error getting memory with relations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryCluster(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params;
      const { depth = 2 } = req.query;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const cluster = await memoryMeshService.getMemoryCluster(
        user.id,
        memoryId,
        parseInt(depth as string)
      );

      res.status(200).json({
        success: true,
        data: cluster,
      });
    } catch (error) {
      logger.error('Error getting memory cluster:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async processMemoryForMesh(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memory = await prisma.memory.findFirst({
        where: {
          id: memoryId,
          user_id: user.id,
        },
      });

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: "Memory not found or doesn't belong to user",
        });
      }

      await memoryMeshService.processMemoryForMesh(memoryId, user.id);
      res.status(200).json({
        success: true,
        message: 'Memory processed for mesh integration',
        data: {
          memoryId,
          processed: true,
        },
      });
    } catch (error) {
      logger.error('Error processing memory for mesh:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

