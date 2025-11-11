import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'

type PeriodType = 'daily' | 'weekly'

interface VelocityMetrics {
  topicRate: number
  diversityIndex: number
  consistencyScore: number
  depthBalance: number
  velocityScore: number
}

function extractDomain(url: string | null): string {
  if (!url || url === 'unknown') return 'unknown'
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

function calculateShannonEntropy(items: string[]): number {
  if (items.length === 0) return 0
  const counts: Record<string, number> = {}
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1
  })
  const probabilities = Object.values(counts).map(count => count / items.length)
  return -probabilities.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0)
}

function calculateTopicRate(memories: Array<{ page_metadata: unknown; created_at: Date }>, periodDays: number): number {
  const topicsSet = new Set<string>()
  memories.forEach(memory => {
    const metadata = memory.page_metadata as Record<string, unknown> | null
    if (metadata?.topics && Array.isArray(metadata.topics)) {
      metadata.topics.forEach((topic: unknown) => {
        if (typeof topic === 'string') {
          topicsSet.add(topic)
        }
      })
    }
  })
  const uniqueTopics = topicsSet.size
  return Math.min(100, (uniqueTopics / periodDays) * 7)
}

function calculateDiversityIndex(memories: Array<{ url: string | null; page_metadata: unknown }>): number {
  const domains: string[] = []
  const topics: string[] = []
  const categories: string[] = []

  memories.forEach(memory => {
    domains.push(extractDomain(memory.url))
    const metadata = memory.page_metadata as Record<string, unknown> | null
    if (metadata?.topics && Array.isArray(metadata.topics)) {
      metadata.topics.forEach((topic: unknown) => {
        if (typeof topic === 'string') topics.push(topic)
      })
    }
    if (metadata?.categories && Array.isArray(metadata.categories)) {
      metadata.categories.forEach((category: unknown) => {
        if (typeof category === 'string') categories.push(category)
      })
    }
  })

  const domainEntropy = calculateShannonEntropy(domains)
  const topicEntropy = calculateShannonEntropy(topics)
  const categoryEntropy = calculateShannonEntropy(categories)

  const maxEntropy = Math.log2(Math.max(domains.length, topics.length, categories.length, 1))
  const normalizedEntropy = maxEntropy > 0 
    ? ((domainEntropy + topicEntropy + categoryEntropy) / 3) / maxEntropy 
    : 0

  return Math.min(100, normalizedEntropy * 100)
}

function calculateConsistencyScore(userId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  return prisma.memory.groupBy({
    by: ['created_at'],
    where: {
      user_id: userId,
      created_at: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  }).then(groups => {
    const daysWithMemories = new Set(
      groups.map(g => g.created_at.toISOString().split('T')[0])
    ).size
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) || 1
    return Math.min(100, (daysWithMemories / totalDays) * 100)
  })
}

function calculateDepthBalance(memories: Array<{ page_metadata: unknown }>): number {
  const topicCounts: Record<string, number> = {}
  
  memories.forEach(memory => {
    const metadata = memory.page_metadata as Record<string, unknown> | null
    if (metadata?.topics && Array.isArray(metadata.topics)) {
      metadata.topics.forEach((topic: unknown) => {
        if (typeof topic === 'string') {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        }
      })
    }
  })

  const topicCountsArray = Object.values(topicCounts)
  if (topicCountsArray.length === 0) return 50

  const avgDepth = topicCountsArray.reduce((a, b) => a + b, 0) / topicCountsArray.length
  const maxDepth = Math.max(...topicCountsArray, 1)
  const depthRatio = avgDepth / maxDepth

  const uniqueTopics = topicCountsArray.length
  const totalMemories = memories.length
  const breadthRatio = uniqueTopics / totalMemories

  const balance = (depthRatio * 0.6 + breadthRatio * 0.4) * 100
  return Math.min(100, Math.max(0, balance))
}

export const knowledgeVelocityService = {
  async calculateVelocityScore(
    userId: string,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<VelocityMetrics | null> {
    try {
      const memories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        select: {
          url: true,
          page_metadata: true,
          created_at: true,
        },
      })

      if (memories.length === 0) {
        return null
      }

      const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) || 1
      
      const topicRate = calculateTopicRate(memories, periodDays)
      const diversityIndex = calculateDiversityIndex(memories)
      const consistencyScore = await calculateConsistencyScore(userId, periodStart, periodEnd)
      const depthBalance = calculateDepthBalance(memories)

      const velocityScore = 
        topicRate * 0.3 +
        diversityIndex * 0.25 +
        consistencyScore * 0.25 +
        depthBalance * 0.2

      return {
        topicRate,
        diversityIndex,
        consistencyScore,
        depthBalance,
        velocityScore: Math.min(100, Math.max(0, velocityScore)),
      }
    } catch (error) {
      logger.error('Error calculating velocity score:', error)
      return null
    }
  },

  async saveVelocityScore(
    userId: string,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date,
    metrics: VelocityMetrics,
    impactMetrics: {
      searchFrequency: number
      recallEfficiency: number
      connectionStrength: number
      accessQuality: number
      impactScore: number
    }
  ): Promise<void> {
    try {
      const periodStartStr = periodStart.toISOString().split('T')[0]
      const existing = await prisma.knowledgeScore.findFirst({
        where: {
          user_id: userId,
          period_type: periodType,
          period_start: {
            gte: new Date(periodStartStr),
            lt: new Date(new Date(periodStartStr).getTime() + 24 * 60 * 60 * 1000),
          },
        },
      })

      if (existing) {
        await prisma.knowledgeScore.update({
          where: { id: existing.id },
          data: {
            period_end: periodEnd,
            velocity_score: metrics.velocityScore,
            impact_score: impactMetrics.impactScore || 0,
            topic_rate: metrics.topicRate,
            diversity_index: metrics.diversityIndex,
            consistency_score: metrics.consistencyScore,
            depth_balance: metrics.depthBalance,
            search_frequency: impactMetrics.searchFrequency,
            recall_efficiency: impactMetrics.recallEfficiency,
            connection_strength: impactMetrics.connectionStrength,
            access_quality: impactMetrics.accessQuality,
          },
        })
      } else {
        await prisma.knowledgeScore.create({
          data: {
            user_id: userId,
            period_type: periodType,
            period_start: periodStart,
            period_end: periodEnd,
            velocity_score: metrics.velocityScore,
            impact_score: impactMetrics.impactScore || 0,
            topic_rate: metrics.topicRate,
            diversity_index: metrics.diversityIndex,
            consistency_score: metrics.consistencyScore,
            depth_balance: metrics.depthBalance,
            search_frequency: impactMetrics.searchFrequency,
            recall_efficiency: impactMetrics.recallEfficiency,
            connection_strength: impactMetrics.connectionStrength,
            access_quality: impactMetrics.accessQuality,
          },
        })
      }
    } catch (error) {
      logger.error('Error saving velocity score:', error)
      throw error
    }
  },

  async getLatestScore(userId: string, periodType: PeriodType): Promise<VelocityMetrics | null> {
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
        topicRate: score.topic_rate,
        diversityIndex: score.diversity_index,
        consistencyScore: score.consistency_score,
        depthBalance: score.depth_balance,
        velocityScore: score.velocity_score,
      }
    } catch (error) {
      logger.error('Error getting latest velocity score:', error)
      return null
    }
  },

  async getHistoricalScores(userId: string, periodType: PeriodType, limit: number = 30): Promise<Array<{ date: Date; score: number }>> {
    try {
      const scores = await prisma.knowledgeScore.findMany({
        where: {
          user_id: userId,
          period_type: periodType,
        },
        select: {
          period_start: true,
          velocity_score: true,
        },
        orderBy: {
          period_start: 'desc',
        },
        take: limit,
      })

      return scores.map(s => ({
        date: s.period_start,
        score: s.velocity_score,
      }))
    } catch (error) {
      logger.error('Error getting historical velocity scores:', error)
      return []
    }
  },
}

