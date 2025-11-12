import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'

type PeriodType = 'daily' | 'weekly'

interface ImpactMetrics {
  searchFrequency: number
  retrievalEfficiency: number
  connectionStrength: number
  accessQuality: number
  impactScore: number
}

export const knowledgeImpactService = {
  async calculateImpactScore(
    userId: string,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ImpactMetrics | null> {
    try {
      const [searchCount, memoryCount, relations, memories] = await Promise.all([
        prisma.queryEvent.count({
          where: {
            user_id: userId,
            created_at: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),
        prisma.memory.count({
          where: {
            user_id: userId,
            created_at: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),
        prisma.memoryRelation.findMany({
          where: {
            memory: {
              user_id: userId,
              created_at: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
          },
          select: {
            similarity_score: true,
          },
        }),
        prisma.memory.findMany({
          where: {
            user_id: userId,
          },
          select: {
            importance_score: true,
            access_count: true,
            last_accessed: true,
            created_at: true,
          },
        }),
      ])

      if (memoryCount === 0) {
        return null
      }

      const periodDays =
        Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) || 1
      const searchFrequency = Math.min(100, (searchCount / periodDays) * 7)

      const avgSearchTime = 5.0
      const targetSearchTime = 2.0
      const retrievalEfficiency = Math.min(
        100,
        Math.max(0, (targetSearchTime / avgSearchTime) * 100)
      )

      const avgSimilarity =
        relations.length > 0
          ? relations.reduce((sum, r) => sum + r.similarity_score, 0) / relations.length
          : 0
      const connectionStrength = Math.min(100, avgSimilarity * 100)

      const recentMemories = memories.filter(m => {
        const memTime = m.last_accessed.getTime()
        const periodStartTime = periodStart.getTime()
        return memTime >= periodStartTime
      })

      const avgImportance =
        recentMemories.length > 0
          ? recentMemories.reduce((sum, m) => sum + (m.importance_score || 0), 0) /
            recentMemories.length
          : 0

      const avgAccessCount =
        recentMemories.length > 0
          ? recentMemories.reduce((sum, m) => sum + m.access_count, 0) / recentMemories.length
          : 0

      const accessQuality = Math.min(
        100,
        avgImportance * 50 + Math.min(avgAccessCount / 10, 1) * 50
      )

      const impactScore =
        searchFrequency * 0.3 +
        retrievalEfficiency * 0.25 +
        connectionStrength * 0.25 +
        accessQuality * 0.2

      return {
        searchFrequency,
        retrievalEfficiency,
        connectionStrength,
        accessQuality,
        impactScore: Math.min(100, Math.max(0, impactScore)),
      }
    } catch (error) {
      logger.error('Error calculating impact score:', error)
      return null
    }
  },

  async getLatestScore(userId: string, periodType: PeriodType): Promise<ImpactMetrics | null> {
    try {
      const score = await prisma.knowledgeScore.findFirst({
        where: {
          user_id: userId,
          period_type: periodType,
        },
        orderBy: {
          period_start: 'desc',
        },
      })

      if (!score) return null

      return {
        searchFrequency: score.search_frequency,
        retrievalEfficiency: score.retrieval_efficiency,
        connectionStrength: score.connection_strength,
        accessQuality: score.access_quality,
        impactScore: score.impact_score,
      }
    } catch (error) {
      logger.error('Error getting latest impact score:', error)
      return null
    }
  },

  async getHistoricalScores(
    userId: string,
    periodType: PeriodType,
    limit: number = 30
  ): Promise<Array<{ date: Date; score: number }>> {
    try {
      const scores = await prisma.knowledgeScore.findMany({
        where: {
          user_id: userId,
          period_type: periodType,
        },
        select: {
          period_start: true,
          impact_score: true,
        },
        orderBy: {
          period_start: 'desc',
        },
        take: limit,
      })

      return scores.map(s => ({
        date: s.period_start,
        score: s.impact_score,
      }))
    } catch (error) {
      logger.error('Error getting historical impact scores:', error)
      return []
    }
  },

  async saveImpactScore(
    userId: string,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date,
    metrics: ImpactMetrics,
    velocityMetrics: {
      topicRate: number
      diversityIndex: number
      consistencyScore: number
      depthBalance: number
    }
  ): Promise<void> {
    try {
      await prisma.knowledgeScore.create({
        data: {
          user_id: userId,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          velocity_score: 0,
          impact_score: metrics.impactScore,
          topic_rate: velocityMetrics.topicRate,
          diversity_index: velocityMetrics.diversityIndex,
          consistency_score: velocityMetrics.consistencyScore,
          depth_balance: velocityMetrics.depthBalance,
          search_frequency: metrics.searchFrequency,
          retrieval_efficiency: metrics.retrievalEfficiency,
          connection_strength: metrics.connectionStrength,
          access_quality: metrics.accessQuality,
        },
      })
    } catch (error) {
      logger.error('Error saving impact score:', error)
      throw error
    }
  },
}
