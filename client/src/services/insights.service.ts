import { getRequest, postRequest } from "../utils/general-services.util"
import { requireAuthToken } from "../utils/user-id.util"

export type PeriodType = 'daily' | 'weekly'

export interface BrowsingSummary {
  id: string
  user_id: string
  period_type: PeriodType
  period_start: string
  period_end: string
  wow_facts: string[] | null
  narrative_summary: string | null
  domain_stats: Record<string, number> | null
  topics_explored: string[] | null
  categories_explored: string[] | null
  time_estimates: Record<string, number> | null
  key_insights: string[] | null
  memory_ids: string[] | null
  created_at: string
  updated_at: string
}

export interface SummariesResponse {
  summaries: BrowsingSummary[]
  count: number
}

export interface SummaryResponse {
  summary: BrowsingSummary
}

export async function getSummaries(periodType?: PeriodType): Promise<SummariesResponse> {
  requireAuthToken()

  try {
    const params = periodType ? `?period_type=${periodType}` : ''
    const response = await getRequest(`/insights/summaries${params}`)

    if (response.data?.success === false) {
      console.error("API error:", response.data?.error)
      throw new Error(response.data?.error || "API returned error")
    }

    return response.data?.data || { summaries: [], count: 0 }
  } catch (error) {
    console.error("Error fetching summaries:", error)
    throw error
  }
}

export async function getLatestSummary(periodType: PeriodType = 'daily'): Promise<BrowsingSummary | null> {
  requireAuthToken()

  try {
    const response = await getRequest(`/insights/summaries/latest?period_type=${periodType}`)

    if (response.data?.success === false) {
      if (response.data?.error === 'No summary found') {
        return null
      }
      console.error("API error:", response.data?.error)
      throw new Error(response.data?.error || "API returned error")
    }

    return response.data?.data?.summary || null
  } catch (error) {
    console.error("Error fetching latest summary:", error)
    throw error
  }
}

export async function getSummaryById(id: string): Promise<BrowsingSummary | null> {
  requireAuthToken()

  try {
    const response = await getRequest(`/insights/summaries/${id}`)

    if (response.data?.success === false) {
      if (response.data?.error === 'Summary not found') {
        return null
      }
      console.error("API error:", response.data?.error)
      throw new Error(response.data?.error || "API returned error")
    }

    return response.data?.data?.summary || null
  } catch (error) {
    console.error("Error fetching summary:", error)
    throw error
  }
}

export async function generateSummary(periodType: PeriodType, date?: string): Promise<SummaryResponse> {
  requireAuthToken()

  try {
    const body: { period_type: PeriodType; date?: string } = { period_type: periodType }
    if (date) {
      body.date = date
    }

    const response = await postRequest('/insights/summaries/generate', body)

    if (response.data?.success === false) {
      console.error("API error:", response.data?.error)
      throw new Error(response.data?.error || "API returned error")
    }

    return response.data?.data || { summary: null }
  } catch (error) {
    console.error("Error generating summary:", error)
    throw error
  }
}

