import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { createHash } from 'crypto'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export class MemorySnapshotController {
  static async getMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 20, page = 1 } = req.query

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        })
      }

      const skip = (Number(page) - 1) * Number(limit)

      const [snapshots, total] = await Promise.all([
        prisma.memorySnapshot.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' },
          skip,
          take: Number(limit),
          select: {
            id: true,
            summary: true,
            summary_hash: true,
            created_at: true,
            raw_text: true,
          },
        }),
        prisma.memorySnapshot.count({
          where: { user_id: user.id },
        }),
      ])

      res.status(200).json({
        success: true,
        data: {
          snapshots: snapshots.map(snapshot => ({
            ...snapshot,
            raw_text_length: snapshot.raw_text.length,
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      })
    } catch (error) {
      logger.error('Error getting memory snapshots:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  static async getMemorySnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const { snapshotId } = req.params

      if (!snapshotId) {
        return res.status(400).json({
          success: false,
          error: 'snapshotId is required',
        })
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        })
      }

      const snapshot = await prisma.memorySnapshot.findFirst({
        where: {
          id: snapshotId,
          user_id: user.id,
        },
        select: {
          id: true,
          summary: true,
          summary_hash: true,
          created_at: true,
          raw_text: true,
        },
      })

      if (!snapshot) {
        return res.status(404).json({
          success: false,
          error: 'Memory snapshot not found',
        })
      }

      res.status(200).json({
        success: true,
        data: {
          ...snapshot,
          raw_text_length: snapshot.raw_text.length,
        },
      })
    } catch (error) {
      logger.error('Error getting memory snapshot:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  static async backfillMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        })
      }

      const memoriesWithoutSnapshots = await prisma.memory.findMany({
        where: {
          user_id: user.id,
          summary: { not: null },
        },
        select: {
          id: true,
          content: true,
          summary: true,
        },
      })

      let createdCount = 0

      const results = []

      for (const memory of memoriesWithoutSnapshots) {
        try {
          const existingSnapshot = await prisma.memorySnapshot.findFirst({
            where: {
              user_id: user.id,
              summary: memory.summary,
            },
          })

          if (!existingSnapshot) {
            const summaryHash = '0x' + createHash('sha256').update(memory.summary!).digest('hex')

            await prisma.memorySnapshot.create({
              data: {
                user_id: user.id,
                raw_text: memory.content,
                summary: memory.summary!,
                summary_hash: summaryHash,
              },
            })
            createdCount++
            results.push({
              memoryId: memory.id,
              status: 'created',
            })
          } else {
            results.push({
              memoryId: memory.id,
              status: 'already_exists',
            })
          }
        } catch (error) {
          logger.error(`Error creating snapshot for memory ${memory.id}:`, error)
          results.push({
            memoryId: memory.id,
            status: 'error',
            error: error.message,
          })
        }
      }

      res.status(200).json({
        success: true,
        message: `Backfilled ${createdCount} memory snapshots`,
        data: {
          totalMemories: memoriesWithoutSnapshots.length,
          createdSnapshots: createdCount,
          results,
        },
      })
    } catch (error) {
      logger.error('Error backfilling memory snapshots:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
}
