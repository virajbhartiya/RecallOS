import { getRequest } from "../utils/general-services.util"
import { requireAuthToken } from "../utils/user-id.util"

export interface AnalyticsData {
  overview: {
    totalMemories: number
    totalTokens: number
    totalInputTokens: number
    totalOutputTokens: number
    totalSearches: number
    mostActiveDomain: string | null
    averageContentLength: number
    totalContentProcessed: number
  }
  tokenUsage: {
    total: number
    totalInput: number
    totalOutput: number
    count: number
    byOperation: Record<
      string,
      { input: number; output: number; total: number; count: number }
    >
    byDate: Record<string, { input: number; output: number; total: number }>
    averagePerMemory: number
  }
  memoryStatistics: {
    total: number
    byDomain: Record<string, number>
    bySource: Record<string, number>
    byDate: Record<string, number>
    averageContentLength: number
    totalContentProcessed: number
  }
  domainAnalytics: {
    topDomains: Array<{ domain: string; count: number }>
    totalDomains: number
    mostActiveDomain: string | null
  }
  contentAnalytics: {
    averageContentLength: number
    totalContentProcessed: number
    byCategory: Record<string, number>
    bySentiment: Record<string, number>
  }
  searchAnalytics: {
    totalSearches: number
    averageResultsPerSearch: number
    byDate: Record<string, number>
  }
  activityAnalytics: {
    memoriesByDate: Record<string, number>
    memoriesByHour: Record<number, number>
    memoriesByDayOfWeek: Record<number, number>
    peakHour: number | null
    peakDayOfWeek: string | null
    totalMemories: number
  }
  relationshipAnalytics: {
    totalRelations: number
    averageConnectionsPerMemory: number
    strongestRelations: Array<{ similarity: number }>
  }
  snapshotAnalytics: {
    totalSnapshots: number
    averageSnapshotsPerMemory: number
  }
  categoryTopicAnalytics: {
    topCategories: Array<{ category: string; count: number }>
    topTopics: Array<{ topic: string; count: number }>
    sentimentDistribution: Record<string, number>
  }
  growthAnalytics: {
    daysSinceFirst: number
    daysSinceLast: number
    memoriesPerDay: number
    tokensPerDay: number
    recentMemories7Days: number
    recentMemories30Days: number
  }
  diversityAnalytics: {
    uniqueDomains: number
    uniqueCategories: number
    uniqueTopics: number
    domainDiversity: number
    categoryDiversity: number
    topicDiversity: number
  }
  contentDistribution: {
    average: number
    median: number
    min: number
    max: number
    total: number
  }
  tokenTrends: {
    byWeek: Record<string, number>
    averagePerMemory: number
    inputOutputRatio: number
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  requireAuthToken()

  try {
    const response = await getRequest("/memory/analytics")

    if (response.data?.success === false) {
      console.error("API error:", response.data?.error)
      throw new Error(response.data?.error || "API returned error")
    }

    return (
      response.data?.data || {
        overview: {
          totalMemories: 0,
          totalTokens: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalSearches: 0,
          mostActiveDomain: null,
          averageContentLength: 0,
          totalContentProcessed: 0,
        },
        tokenUsage: {
          total: 0,
          totalInput: 0,
          totalOutput: 0,
          count: 0,
          byOperation: {},
          byDate: {},
          averagePerMemory: 0,
        },
        memoryStatistics: {
          total: 0,
          byDomain: {},
          bySource: {},
          byDate: {},
          averageContentLength: 0,
          totalContentProcessed: 0,
        },
        domainAnalytics: {
          topDomains: [],
          totalDomains: 0,
          mostActiveDomain: null,
        },
        contentAnalytics: {
          averageContentLength: 0,
          totalContentProcessed: 0,
          byCategory: {},
          bySentiment: {},
        },
        searchAnalytics: {
          totalSearches: 0,
          averageResultsPerSearch: 0,
          byDate: {},
        },
        activityAnalytics: {
          memoriesByDate: {},
          memoriesByHour: {},
          memoriesByDayOfWeek: {},
          peakHour: null,
          peakDayOfWeek: null,
          totalMemories: 0,
        },
        relationshipAnalytics: {
          totalRelations: 0,
          averageConnectionsPerMemory: 0,
          strongestRelations: [],
        },
        snapshotAnalytics: {
          totalSnapshots: 0,
          averageSnapshotsPerMemory: 0,
        },
        categoryTopicAnalytics: {
          topCategories: [],
          topTopics: [],
          sentimentDistribution: {},
        },
        growthAnalytics: {
          daysSinceFirst: 0,
          daysSinceLast: 0,
          memoriesPerDay: 0,
          tokensPerDay: 0,
          recentMemories7Days: 0,
          recentMemories30Days: 0,
        },
        diversityAnalytics: {
          uniqueDomains: 0,
          uniqueCategories: 0,
          uniqueTopics: 0,
          domainDiversity: 0,
          categoryDiversity: 0,
          topicDiversity: 0,
        },
        contentDistribution: {
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          total: 0,
        },
        tokenTrends: {
          byWeek: {},
          averagePerMemory: 0,
          inputOutputRatio: 0,
        },
      }
    )
  } catch (error) {
    console.error("Error fetching analytics:", error)
    throw error
  }
}
