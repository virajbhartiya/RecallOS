import type { MemoryInsights } from "../../types/memory"
import { getRequest, postRequest } from "../../utility/generalServices"
import { requireAuthToken } from "../../utils/userId"
import { getUserMemoryCount } from "./memoryApi"

const baseUrl = "/memory"

export async function getMemoryInsights(): Promise<MemoryInsights> {
  requireAuthToken()

  try {
    const response = await getRequest(`${baseUrl}/insights`)

    if (response.data?.success === false) {
      throw new Error(response.data?.error || "API returned error")
    }

    const data = response.data?.data

    if (data) {
      return {
        total_memories: data.totalMemories || 0,
        categories:
          data.topCategories?.reduce(
            (
              acc: Record<string, number>,
              cat: { category: string; count: number }
            ) => {
              acc[cat.category] = cat.count
              return acc
            },
            {} as Record<string, number>
          ) || {},
        sentiment_distribution: {
          positive: data.sentimentDistribution?.positive || 0,
          negative: data.sentimentDistribution?.negative || 0,
          neutral: data.sentimentDistribution?.neutral || 0,
        },
        topology: {
          total_nodes: 0,
          total_edges: 0,
          average_connections: 0,
          largest_cluster_size: 0,
        },
        recent_activity: { last_7_days: 0, last_30_days: 0 },
      }
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response: { status: number } }).response?.status === 404
    ) {
      try {
        await postRequest(`${baseUrl}/process`, {
          content: "User initialization",
          url: "user-init",
          title: "User Setup",
          metadata: { source: "manual" },
        })

        const retryResponse = await getRequest(`${baseUrl}/insights`)
        const retryData = retryResponse.data?.data
        if (retryData) {
          return {
            total_memories: retryData.totalMemories || 0,
            categories:
              retryData.topCategories?.reduce(
                (
                  acc: Record<string, number>,
                  cat: { category: string; count: number }
                ) => {
                  acc[cat.category] = cat.count
                  return acc
                },
                {} as Record<string, number>
              ) || {},
            sentiment_distribution: {
              positive: retryData.sentimentDistribution?.positive || 0,
              negative: retryData.sentimentDistribution?.negative || 0,
              neutral: retryData.sentimentDistribution?.neutral || 0,
            },
            topology: {
              total_nodes: 0,
              total_edges: 0,
              average_connections: 0,
              largest_cluster_size: 0,
            },
            recent_activity: { last_7_days: 0, last_30_days: 0 },
          }
        }
      } catch (createError) {
        // Failed to create user for insights
      }
    }
  }

  try {
    const count = await getUserMemoryCount()
    return {
      total_memories: count,
      categories: { extension: count },
      sentiment_distribution: { positive: 0, negative: 0, neutral: count },
      topology: {
        total_nodes: count,
        total_edges: 0,
        average_connections: 0,
        largest_cluster_size: count,
      },
      recent_activity: { last_7_days: count, last_30_days: count },
    }
  } catch (fallbackError) {
    return {
      total_memories: 0,
      categories: {},
      sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
      topology: {
        total_nodes: 0,
        total_edges: 0,
        average_connections: 0,
        largest_cluster_size: 0,
      },
      recent_activity: { last_7_days: 0, last_30_days: 0 },
    }
  }
}
