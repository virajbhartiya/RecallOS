import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'

interface BenchmarkPercentiles {
  velocityPercentile: number | null
  impactPercentile: number | null
  connectionPercentile: number | null
  diversityPercentile: number | null
}

export const benchmarkService = {
  async calculateUserBenchmarks(userId: string): Promise<BenchmarkPercentiles | null> {
    try {
      const userScore = await prisma.knowledgeScore.findFirst({
        where: { user_id: userId },
        orderBy: { period_start: 'desc' },
      })

      if (!userScore) {
        return null
      }

      const optInUsers = await prisma.userBenchmark.findMany({
        where: { opt_in: true },
        select: { user_id: true },
      })

      const optInUserIds = optInUsers.map(u => u.user_id)

      if (optInUserIds.length === 0) {
        return null
      }

      const allScores = await prisma.knowledgeScore.findMany({
        where: {
          user_id: { in: optInUserIds },
        },
        select: {
          user_id: true,
          velocity_score: true,
          impact_score: true,
          connection_strength: true,
          diversity_index: true,
        },
      })

      const userScores = allScores.filter(s => s.user_id === userId)
      const latestUserScores = userScores[0] || userScore

      const velocityScores = allScores.map(s => s.velocity_score).sort((a, b) => a - b)
      const impactScores = allScores.map(s => s.impact_score).sort((a, b) => a - b)
      const connectionScores = allScores.map(s => s.connection_strength).sort((a, b) => a - b)
      const diversityScores = allScores.map(s => s.diversity_index).sort((a, b) => a - b)

      const calculatePercentile = (value: number, sortedArray: number[]): number => {
        if (sortedArray.length === 0) return 0
        const index = sortedArray.findIndex(v => v >= value)
        if (index === -1) return 100
        return (index / sortedArray.length) * 100
      }

      const velocityPercentile = calculatePercentile(latestUserScores.velocity_score, velocityScores)
      const impactPercentile = calculatePercentile(latestUserScores.impact_score, impactScores)
      const connectionPercentile = calculatePercentile(latestUserScores.connection_strength, connectionScores)
      const diversityPercentile = calculatePercentile(latestUserScores.diversity_index, diversityScores)

      await prisma.userBenchmark.upsert({
        where: { user_id: userId },
        update: {
          velocity_percentile: velocityPercentile,
          impact_percentile: impactPercentile,
          connection_percentile: connectionPercentile,
          diversity_percentile: diversityPercentile,
          last_calculated: new Date(),
        },
        create: {
          user_id: userId,
          velocity_percentile: velocityPercentile,
          impact_percentile: impactPercentile,
          connection_percentile: connectionPercentile,
          diversity_percentile: diversityPercentile,
          opt_in: false,
        },
      })

      return {
        velocityPercentile,
        impactPercentile,
        connectionPercentile,
        diversityPercentile,
      }
    } catch (error) {
      logger.error('Error calculating user benchmarks:', error)
      return null
    }
  },

  async getUserBenchmarks(userId: string): Promise<BenchmarkPercentiles | null> {
    try {
      const benchmark = await prisma.userBenchmark.findUnique({
        where: { user_id: userId },
      })

      if (!benchmark) return null

      return {
        velocityPercentile: benchmark.velocity_percentile,
        impactPercentile: benchmark.impact_percentile,
        connectionPercentile: benchmark.connection_percentile,
        diversityPercentile: benchmark.diversity_percentile,
      }
    } catch (error) {
      logger.error('Error getting user benchmarks:', error)
      return null
    }
  },

  async setOptIn(userId: string, optIn: boolean): Promise<void> {
    try {
      await prisma.userBenchmark.upsert({
        where: { user_id: userId },
        update: { opt_in: optIn },
        create: {
          user_id: userId,
          opt_in: optIn,
        },
      })
    } catch (error) {
      logger.error('Error setting opt-in status:', error)
      throw error
    }
  },
}

