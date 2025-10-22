import { postRequest } from '../utility/generalServices'
import axiosInstance from '../utility/axiosInterceptor'
import type { Memory, MemorySearchResponse, SearchFilters, SearchResult } from '../types/memory'

type ApiSearchResult = {
  memory_id: string
  title: string | null
  summary: string | null
  url: string | null
  timestamp: number
  avail_hash: string | null
  related_memories: string[]
  score?: number
}

export class SearchService {
  static async semanticSearch(
    wallet: string,
    query: string,
    limit: number = 10,
    contextOnly: boolean = false,
    signal?: AbortSignal
  ): Promise<{ query: string; results: ApiSearchResult[]; meta_summary?: string; answer?: string; citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>; context?: string; job_id?: string }> {
    const res = await postRequest('/search', { wallet, query, limit, contextOnly }, undefined, signal)
    if (!res || res.status >= 400) throw new Error('Search request failed')
    return res.data
  }

  static async getJob(jobId: string): Promise<{ id: string; status: 'pending' | 'completed' | 'failed'; answer?: string; meta_summary?: string }> {
    const res = await axiosInstance.get(`/search/job/${jobId}`)
    return res.data
  }

  /**
   * Get memory context for external AI tools (like ChatGPT)
   * Returns raw memory content without AI-generated answers
   * 
   * @param wallet - User's wallet address
   * @param query - Search query
   * @param limit - Maximum number of memories to return (default: 10)
   * @param signal - Abort signal for request cancellation
   * @returns Promise with query, context string, and raw results
   * 
   * @example
   * ```typescript
   * const context = await SearchService.getContextForAI(
   *   '0x123...', 
   *   'machine learning projects', 
   *   5
   * );
   * 
   * // Use context.context to provide to ChatGPT:
   * // "Based on my memories: " + context.context
   * ```
   */
  static async getContextForAI(
    wallet: string,
    query: string,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<{ query: string; context: string; results: ApiSearchResult[] }> {
    const res = await postRequest('/search', { wallet, query, limit, contextOnly: true }, undefined, signal)
    if (!res || res.status >= 400) throw new Error('Context search request failed')
    return {
      query: res.data.query,
      context: res.data.context || 'No relevant memories found.',
      results: res.data.results || []
    }
  }

  static async semanticSearchMapped(
    wallet: string,
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<MemorySearchResponse> {
    const data = await this.semanticSearch(wallet, query, limit, false, signal)
    const results: SearchResult[] = (data.results || [])
      .map((r) => {
        const createdAtIso = new Date(r.timestamp * 1000).toISOString()
            const memory: Memory = {
              id: r.memory_id,
              user_id: wallet,
              source: 'browser',
              url: r.url || undefined,
              title: r.title || 'Untitled Memory',
              content: '',
              summary: r.summary || undefined,
              hash: r.avail_hash || undefined,
              timestamp: r.timestamp,
              created_at: createdAtIso,
              page_metadata: undefined,
              importance_score: undefined,
              access_count: 0,
              last_accessed: createdAtIso,
              tx_status: undefined,
              blockchain_network: undefined,
            }
        return {
          memory,
          semantic_score: r.score || 0,
          blended_score: r.score || 0,
          search_type: 'semantic' as const
        }
      })
      .filter((result) => (result.semantic_score || 0) > 0.01) // Filter out very low relevance results
      .sort((a, b) => (b.semantic_score || 0) - (a.semantic_score || 0)) // Sort by relevance score

    return {
      results,
      // include answer for UI display
      // Note: MemorySearchResponse doesn't model 'answer', so we forward it separately by augmenting
      total: results.length,
      page,
      limit,
      filters
    }
  }
}


