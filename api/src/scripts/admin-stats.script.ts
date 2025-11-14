import { prisma } from '../lib/prisma.lib'
import { getRedisClient } from '../lib/redis.lib'
import { qdrantClient, COLLECTION_NAME } from '../lib/qdrant.lib'
import { logger } from '../utils/logger.util'

interface AdminStats {
  users: {
    total: number
    active: number
    withMemories: number
  }
  memories: {
    total: number
    byType: Record<string, number>
    bySource: Record<string, number>
    averagePerUser: number
  }
  qdrant: {
    totalPoints: number
    collectionExists: boolean
  }
  redis: {
    connected: boolean
    memoryUsage?: string
  }
  tokenUsage: {
    totalInputTokens: number
    totalOutputTokens: number
    totalCost: number
  }
  recentActivity: {
    last24hMemories: number
    last24hSearches: number
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const stats: AdminStats = {
    users: {
      total: 0,
      active: 0,
      withMemories: 0,
    },
    memories: {
      total: 0,
      byType: {},
      bySource: {},
      averagePerUser: 0,
    },
    qdrant: {
      totalPoints: 0,
      collectionExists: false,
    },
    redis: {
      connected: false,
    },
    tokenUsage: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
    },
    recentActivity: {
      last24hMemories: 0,
      last24hSearches: 0,
    },
  }

  try {
    // User stats
    const [totalUsers, usersWithMemories, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          memories: {
            some: {},
          },
        },
      }),
      prisma.user.count({
        where: {
          memories: {
            some: {
              created_at: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
          },
        },
      }),
    ])

    stats.users.total = totalUsers
    stats.users.withMemories = usersWithMemories
    stats.users.active = activeUsers

    // Memory stats
    const [totalMemories, memoriesByType, memoriesBySource] = await Promise.all([
      prisma.memory.count(),
      prisma.memory.groupBy({
        by: ['memory_type'],
        _count: true,
      }),
      prisma.memory.groupBy({
        by: ['source'],
        _count: true,
      }),
    ])

    stats.memories.total = totalMemories
    stats.memories.averagePerUser = usersWithMemories > 0 ? totalMemories / usersWithMemories : 0

    memoriesByType.forEach((group) => {
      stats.memories.byType[group.memory_type || 'unknown'] = group._count
    })

    memoriesBySource.forEach((group) => {
      stats.memories.bySource[group.source] = group._count
    })

    // Qdrant stats
    try {
      const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME)
      stats.qdrant.collectionExists = true
      stats.qdrant.totalPoints = collectionInfo.points_count || 0
    } catch (error) {
      stats.qdrant.collectionExists = false
      logger.warn('[admin-stats] Qdrant collection not found', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Redis stats
    try {
      const redis = getRedisClient()
      await redis.ping()
      stats.redis.connected = true

      try {
        const info = await redis.info('memory')
        const memoryMatch = info.match(/used_memory_human:(.+)/)
        if (memoryMatch) {
          stats.redis.memoryUsage = memoryMatch[1].trim()
        }
      } catch {
        // Memory info not available
      }
    } catch (error) {
      stats.redis.connected = false
      logger.warn('[admin-stats] Redis not connected', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Token usage stats
    const tokenUsage = await prisma.tokenUsage.aggregate({
      _sum: {
        input_tokens: true,
        output_tokens: true,
      },
    })

    stats.tokenUsage.totalInputTokens = Number(tokenUsage._sum.input_tokens || 0)
    stats.tokenUsage.totalOutputTokens = Number(tokenUsage._sum.output_tokens || 0)

    // Rough cost calculation (assuming Gemini pricing)
    const inputCost = (stats.tokenUsage.totalInputTokens / 1_000_000) * 0.5 // $0.50 per 1M tokens
    const outputCost = (stats.tokenUsage.totalOutputTokens / 1_000_000) * 1.5 // $1.50 per 1M tokens
    stats.tokenUsage.totalCost = inputCost + outputCost

    // Recent activity
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [last24hMemories, last24hSearches] = await Promise.all([
      prisma.memory.count({
        where: {
          created_at: {
            gte: last24h,
          },
        },
      }),
      prisma.queryEvent.count({
        where: {
          created_at: {
            gte: last24h,
          },
        },
      }),
    ])

    stats.recentActivity.last24hMemories = last24hMemories
    stats.recentActivity.last24hSearches = last24hSearches
  } catch (error) {
    logger.error('[admin-stats] Error generating stats', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }

  return stats
}

// CLI entry point
if (require.main === module) {
  getAdminStats()
    .then((stats) => {
      console.log(JSON.stringify(stats, null, 2))
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error generating admin stats:', error)
      process.exit(1)
    })
}

