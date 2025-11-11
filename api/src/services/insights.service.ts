import { prisma } from '../lib/prisma.lib'
import { aiProvider } from './ai-provider.service'
import { logger } from '../utils/logger.util'

type PeriodType = 'daily' | 'weekly'

interface MemoryData {
  id: string
  title: string | null
  url: string | null
  summary: string | null
  page_metadata: unknown
  created_at: Date
}

interface AggregatedStats {
  domainStats: Record<string, number>
  topics: string[]
  categories: string[]
  totalMemories: number
  timeEstimates: Record<string, number>
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

function aggregateStats(memories: MemoryData[]): AggregatedStats {
  const domainStats: Record<string, number> = {}
  const topicsSet = new Set<string>()
  const categoriesSet = new Set<string>()
  const timeEstimates: Record<string, number> = {}

  memories.forEach(memory => {
    const domain = extractDomain(memory.url)
    domainStats[domain] = (domainStats[domain] || 0) + 1

    const metadata = memory.page_metadata as Record<string, unknown> | null
    if (metadata?.topics && Array.isArray(metadata.topics)) {
      metadata.topics.forEach((topic: unknown) => {
        if (typeof topic === 'string') {
          topicsSet.add(topic)
        }
      })
    }
    if (metadata?.categories && Array.isArray(metadata.categories)) {
      metadata.categories.forEach((category: unknown) => {
        if (typeof category === 'string') {
          categoriesSet.add(category)
        }
      })
    }

    const estimatedTime = 2 + Math.min(10, (memory.summary?.length || 0) / 100)
    timeEstimates[domain] = (timeEstimates[domain] || 0) + estimatedTime
  })

  return {
    domainStats,
    topics: Array.from(topicsSet),
    categories: Array.from(categoriesSet),
    totalMemories: memories.length,
    timeEstimates,
  }
}

export const insightsService = {
  async generateSummary(
    userId: string,
    periodType: PeriodType,
    startDate: Date,
    endDate: Date
  ) {

    const memories = await prisma.memory.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        url: true,
        summary: true,
        page_metadata: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    if (memories.length === 0) {
      logger.log('[Insights Service] No memories found for period', {
        userId,
        periodType,
      })
      return null
    }

    const stats = aggregateStats(memories)


    let wowFacts: string[] = []
    let narrativeSummary: string = 'No summary available.'
    let keyInsights: string[] = []

    try {
      logger.log('[Insights Service] Starting wow facts generation', { userId, memoryCount: memories.length })
      const wowFactsPromise = aiProvider.generateWowFacts(memories, stats, userId)
      const timeoutPromise = new Promise<string[]>((_, reject) => {
        setTimeout(() => reject(new Error('Wow facts generation timed out after 5 minutes')), 300000)
      })
      wowFacts = await Promise.race([wowFactsPromise, timeoutPromise])
      logger.log('[Insights Service] Wow facts generated', { userId, count: wowFacts.length })
    } catch (err) {
      logger.error('[Insights Service] Error generating wow facts:', {
        userId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      wowFacts = []
    }

    try {
      logger.log('[Insights Service] Starting narrative summary generation', { userId })
      const narrativePromise = aiProvider.generateNarrativeSummary(memories, stats, userId)
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Narrative summary generation timed out after 5 minutes')), 300000)
      })
      narrativeSummary = await Promise.race([narrativePromise, timeoutPromise])
      logger.log('[Insights Service] Narrative summary generated', { userId, length: narrativeSummary.length })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('[Insights Service] Error generating narrative summary:', {
        userId,
        error,
        stack: err instanceof Error ? err.stack : undefined,
      })
      narrativeSummary = 'No summary available.'
    }

    try {
      logger.log('[Insights Service] Starting key insights generation', { userId })
      const insightsPromise = aiProvider.generateKeyInsights(memories, stats, userId)
      const timeoutPromise = new Promise<string[]>((_, reject) => {
        setTimeout(() => reject(new Error('Key insights generation timed out after 5 minutes')), 300000)
      })
      keyInsights = await Promise.race([insightsPromise, timeoutPromise])
      logger.log('[Insights Service] Key insights generated', { userId, count: keyInsights.length })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('[Insights Service] Error generating key insights:', {
        userId,
        error,
        stack: err instanceof Error ? err.stack : undefined,
      })
      keyInsights = []
    }


    try {
      logger.log('[Insights Service] Saving summary to database', {
        userId,
        periodType,
        hasWowFacts: wowFacts.length > 0,
        hasNarrative: narrativeSummary.length > 0,
        hasInsights: keyInsights.length > 0,
      })
      const summary = await prisma.browsingSummary.create({
        data: {
          user_id: userId,
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          wow_facts: wowFacts,
          narrative_summary: narrativeSummary,
          domain_stats: stats.domainStats,
          topics_explored: stats.topics,
          categories_explored: stats.categories,
          time_estimates: stats.timeEstimates,
          key_insights: keyInsights,
          memory_ids: memories.map(m => m.id),
        },
      })
      logger.log('[Insights Service] Summary saved successfully', {
        userId,
        periodType,
        summaryId: summary.id,
      })
      return summary
    } catch (err) {
      logger.error('[Insights Service] Error saving summary to database:', {
        userId,
        periodType,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      throw err
    }
  },

  async getSummaries(
    userId: string,
    periodType?: PeriodType,
    limit: number = 50
  ) {
    const where: { user_id: string; period_type?: string } = {
      user_id: userId,
    }

    if (periodType) {
      where.period_type = periodType
    }

    const summaries = await prisma.browsingSummary.findMany({
      where,
      orderBy: {
        period_start: 'desc',
      },
      take: limit,
    })

    return summaries
  },

  async getLatestSummary(userId: string, periodType: PeriodType) {
    const summary = await prisma.browsingSummary.findFirst({
      where: {
        user_id: userId,
        period_type: periodType,
      },
      orderBy: {
        period_start: 'desc',
      },
    })

    return summary
  },

  async getSummaryById(userId: string, summaryId: string) {
    const summary = await prisma.browsingSummary.findFirst({
      where: {
        id: summaryId,
        user_id: userId,
      },
    })

    return summary
  },

  async shouldGenerateSummary(
    userId: string,
    periodType: PeriodType,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const existing = await prisma.browsingSummary.findFirst({
      where: {
        user_id: userId,
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
      },
    })

    if (existing) {
      return false
    }

    const memoryCount = await prisma.memory.count({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    return memoryCount > 0
  },

  async generateDailySummary(userId: string, date: Date = new Date()) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)
    
    const shouldGenerate = await this.shouldGenerateSummary(
      userId,
      'daily',
      startOfDay,
      endOfDay
    )

    if (!shouldGenerate) {
      logger.log('[Insights Service] Daily summary already exists or no memories', {
        userId,
        date: date.toISOString(),
      })
      return null
    }

    return await this.generateSummary(userId, 'daily', startOfDay, endOfDay)
  },

  async generateWeeklySummary(userId: string, date: Date = new Date()) {
    const endOfWeek = new Date(date)
    endOfWeek.setHours(23, 59, 59, 999)
    endOfWeek.setDate(endOfWeek.getDate() - 1)

    const startOfWeek = new Date(endOfWeek)
    startOfWeek.setDate(startOfWeek.getDate() - 6)
    startOfWeek.setHours(0, 0, 0, 0)

    const shouldGenerate = await this.shouldGenerateSummary(
      userId,
      'weekly',
      startOfWeek,
      endOfWeek
    )

    if (!shouldGenerate) {
      logger.log('[Insights Service] Weekly summary already exists or no memories', {
        userId,
        date: date.toISOString(),
      })
      return null
    }

    return await this.generateSummary(userId, 'weekly', startOfWeek, endOfWeek)
  },

  async getActiveUsers(): Promise<string[]> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const users = await prisma.memory.findMany({
      where: {
        created_at: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        user_id: true,
      },
      distinct: ['user_id'],
    })

    return users.map(u => u.user_id)
  },
}

