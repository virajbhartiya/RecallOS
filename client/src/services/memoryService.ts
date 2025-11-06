import { getRequest, postRequest } from '../utility/generalServices'
import { requireAuthToken } from '../utils/userId'
import type {
  Memory,
  MemoryInsights,
  MemoryMesh,
  MemorySearchResponse,
  MemoryWithRelations,
  MemoryCluster,
  SearchFilters
} from '../types/memory'

interface ApiMemoryResponse {
  id?: string
  hash?: string
  timestamp: string | number
  created_at?: string
  title?: string
  summary?: string
  content?: string
  source?: string
  url?: string
  page_metadata?: Record<string, unknown>
  access_count?: number
  last_accessed?: string
}

export class MemoryService {
  private static baseUrl = '/memory'


  static async getMemoriesWithTransactionDetails(
    limit?: number
  ): Promise<Memory[]> {
    requireAuthToken()
    
    try {
      const response = await getRequest(`${this.baseUrl}/user/recent?count=${limit || 10000}`)
      
      if (response.data?.success === false) {
        console.error('API error:', response.data?.error)
        throw new Error(response.data?.error || 'API returned error')
      }
      
      const data = response.data?.data
      const memories = data?.memories || []
      
      if (Array.isArray(memories)) {
        if (memories.length === 0) {
          console.log('No memories found')
          return []
        }
        
        return memories.map((mem: ApiMemoryResponse) => ({
          id: mem.id || '',
          user_id: '',
          hash: mem.hash || '',
          timestamp: typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : (typeof mem.timestamp === 'number' ? mem.timestamp : 0),
          created_at: mem.created_at || new Date().toISOString(),
          title: mem.title || 'Memory',
          summary: mem.summary || '',
          content: mem.content || '',
          source: mem.source || 'extension',
          url: mem.url,
          page_metadata: mem.page_metadata,
          access_count: mem.access_count || 0,
          last_accessed: mem.last_accessed || new Date().toISOString(),
        } as Memory))
      }
      
      console.log('No memories found in response:', response.data)
    } catch (error) {
      console.error('Error fetching memories:', error)
      throw error
    }
    
    return []
  }

  static async getMemoryMesh(limit: number = 50, threshold: number = 0.3): Promise<MemoryMesh> {
    requireAuthToken()
    const response = await getRequest(`${this.baseUrl}/mesh?limit=${limit}&threshold=${threshold}`)
    return response.data?.data || { nodes: [], edges: [], clusters: {} }
  }

  static async searchMemories(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<MemorySearchResponse> {
    try {
      // Require authentication
      requireAuthToken()
      
      // Use the working /search endpoint (POST)
      const response = await postRequest('/search', {
        query,
        limit,
        contextOnly: false
      }, undefined, signal)
      
      if (!response) {
        throw new Error('No response received from server')
      }
      
      if (response.status >= 400) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }
      
      const responseData = response?.data
      if (responseData) {

        const transformedResults = (responseData.results || []).map((result: {
          memory_id: string;
          user_id?: string;
          source?: string;
          url?: string;
          title?: string;
          content?: string;
          summary?: string;
          timestamp: number;
          created_at?: string;
          full_content?: string;
          page_metadata?: {
            title?: string;
            description?: string;
            keywords?: string[];
            author?: string;
            published_date?: string;
            [key: string]: string | string[] | number | boolean | undefined;
          };
          importance_score?: number;
          access_count?: number;
          last_accessed?: string;
          score: number;
        }) => ({
          memory: {
            id: result.memory_id,
            user_id: result.user_id || '',
            source: result.source || (result.url ? 'browser' : 'extension'),
            url: result.url,
            title: result.title,
            content: result.content || result.summary || '',
            summary: result.summary,
            timestamp: result.timestamp,
            created_at: result.created_at || new Date(result.timestamp * 1000).toISOString(),
            full_content: result.full_content,
            page_metadata: result.page_metadata,
            importance_score: result.importance_score,
            access_count: result.access_count || 0,
            last_accessed: result.last_accessed || new Date().toISOString(),
          },
          similarity_score: result.score,
          relevance_score: result.score,
          semantic_score: result.score,
          search_type: 'semantic' as const
        }))
        
        return {
          results: transformedResults,
          total: responseData.results?.length || 0,
          page,
          limit,
          filters,
          // Include search answer if available
          answer: responseData.answer,
          citations: responseData.citations,
          job_id: responseData.job_id
        }
      }
      return { results: [], total: 0, page, limit, filters }
    } catch (error) {
      // Error in searchMemories
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async searchMemoriesWithEmbeddings(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<MemorySearchResponse> {
    try {
      requireAuthToken()
      
      // Use the working /search endpoint (POST) - same as searchMemories
      const response = await postRequest('/search', {
        query,
        limit,
        contextOnly: false
      })
      
      if (!response) {
        throw new Error('No response received from server')
      }
      
      if (response.status >= 400) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }
      
      const responseData = response?.data
      if (responseData) {
        // Backend returns: { query, results, answer, citations, job_id }
        // Transform backend results to match frontend SearchResult interface
        const transformedResults = (responseData.results || []).map((result: {
          memory_id: string;
          user_id?: string;
          source?: string;
          url?: string;
          title?: string;
          content?: string;
          summary?: string;
          timestamp: number;
          created_at?: string;
          full_content?: string;
          page_metadata?: {
            title?: string;
            description?: string;
            keywords?: string[];
            author?: string;
            published_date?: string;
            [key: string]: string | string[] | number | boolean | undefined;
          };
          importance_score?: number;
          access_count?: number;
          last_accessed?: string;
          score: number;
        }) => ({
          memory: {
            id: result.memory_id,
            user_id: result.user_id || '',
            source: result.source || (result.url ? 'browser' : 'extension'),
            url: result.url,
            title: result.title,
            content: result.content || result.summary || '',
            summary: result.summary,
            timestamp: result.timestamp,
            created_at: result.created_at || new Date(result.timestamp * 1000).toISOString(),
            full_content: result.full_content,
            page_metadata: result.page_metadata,
            importance_score: result.importance_score,
            access_count: result.access_count || 0,
            last_accessed: result.last_accessed || new Date().toISOString(),
          },
          similarity_score: result.score,
          relevance_score: result.score,
          semantic_score: result.score,
          search_type: 'semantic' as const
        }))
        
        return {
          results: transformedResults,
          total: responseData.results?.length || 0,
          page,
          limit,
          filters,
          // Include search answer if available
          answer: responseData.answer,
          citations: responseData.citations,
          job_id: responseData.job_id
        }
      }
      return { results: [], total: 0, page, limit, filters }
    } catch (error) {
      // Error in searchMemoriesWithEmbeddings
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async searchMemoriesHybrid(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<MemorySearchResponse> {
    try {
      requireAuthToken()
      const params = new URLSearchParams({
        query,
        page: page.toString(),
        limit: limit.toString()
      })

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await getRequest(`${this.baseUrl}/search-hybrid?${params.toString()}`)
      
      if (!response) {
        throw new Error('No response received from server')
      }
      
      if (response.status >= 400) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }
      
      const responseData = response?.data
      if (responseData && responseData.data) {
        // Backend returns nested structure: { success: true, data: { total: 1, results: [...] } }
        return {
          results: responseData.data.results || [],
          total: responseData.data.total || 0,
          page,
          limit,
          filters
        }
      }
      return { results: [], total: 0, page, limit, filters }
    } catch (error) {
      // Error in searchMemoriesHybrid
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async getMemoryInsights(): Promise<MemoryInsights> {
    requireAuthToken()
    
    try {
      const response = await getRequest(`${this.baseUrl}/insights`)
      
      // Check if the API returned an error
      if (response.data?.success === false) {
        throw new Error(response.data?.error || 'API returned error')
      }
      
      const data = response.data?.data
      
      if (data) {
        return {
          total_memories: data.totalMemories || 0,
          categories: data.topCategories?.reduce((acc: Record<string, number>, cat: { category: string; count: number }) => {
            acc[cat.category] = cat.count
            return acc
          }, {} as Record<string, number>) || {},
          sentiment_distribution: {
            positive: data.sentimentDistribution?.positive || 0,
            negative: data.sentimentDistribution?.negative || 0,
            neutral: data.sentimentDistribution?.neutral || 0
          },
          topology: { total_nodes: 0, total_edges: 0, average_connections: 0, largest_cluster_size: 0 },
          recent_activity: { last_7_days: 0, last_30_days: 0 }
        }
      }
    } catch (error) {
      // Error fetching insights from database
      // If user not found (404), try to create the user and then retry
      if (error && typeof error === 'object' && 'response' in error && (error as { response: { status: number } }).response?.status === 404) {
        try {
          // Try to create user by calling the process endpoint with minimal data
          await postRequest(`${this.baseUrl}/process`, {
            content: 'User initialization',
            url: 'user-init',
            title: 'User Setup',
            metadata: { source: 'manual' }
          })
          
          // Retry the original request
          const retryResponse = await getRequest(`${this.baseUrl}/insights`)
          const retryData = retryResponse.data?.data
          if (retryData) {
            return {
              total_memories: retryData.totalMemories || 0,
              categories: retryData.topCategories?.reduce((acc: Record<string, number>, cat: { category: string; count: number }) => {
                acc[cat.category] = cat.count
                return acc
              }, {} as Record<string, number>) || {},
              sentiment_distribution: {
                positive: retryData.sentimentDistribution?.positive || 0,
                negative: retryData.sentimentDistribution?.negative || 0,
                neutral: retryData.sentimentDistribution?.neutral || 0
              },
              topology: { total_nodes: 0, total_edges: 0, average_connections: 0, largest_cluster_size: 0 },
              recent_activity: { last_7_days: 0, last_30_days: 0 }
            }
          }
        } catch (createError) {
          // Failed to create user for insights
        }
      }
    }
    
    // Fallback: create basic insights
    try {
      const count = await this.getUserMemoryCount()
      return {
        total_memories: count,
        categories: { 'extension': count },
        sentiment_distribution: { positive: 0, negative: 0, neutral: count },
        topology: { total_nodes: count, total_edges: 0, average_connections: 0, largest_cluster_size: count },
        recent_activity: { last_7_days: count, last_30_days: count }
      }
    } catch (fallbackError) {
      // Fallback insights also failed
      return {
        total_memories: 0,
        categories: {},
        sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        topology: { total_nodes: 0, total_edges: 0, average_connections: 0, largest_cluster_size: 0 },
        recent_activity: { last_7_days: 0, last_30_days: 0 }
      }
    }
  }

  static async getRecentMemories(count: number = 10): Promise<Memory[]> {
    requireAuthToken()
    
    try {
      const response = await getRequest(`${this.baseUrl}/user/recent?count=${count}`)
      const data = response.data?.data
      
      if (Array.isArray(data?.memories) && data.memories.length > 0) {
        // The API now returns full memory details from database, so we can use them directly
        return data.memories.map((mem: ApiMemoryResponse) => ({
          id: mem.id || mem.hash,
          hash: mem.hash,
          timestamp: typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp,
          created_at: mem.created_at || new Date((typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp) * 1000).toISOString(),
          title: mem.title || 'Memory',
          summary: mem.summary || `Memory stored at ${new Date((typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp) * 1000).toLocaleDateString()}`,
          content: mem.content || '',
          source: mem.source || 'extension',
          user_id: '',
          url: mem.url,
          page_metadata: mem.page_metadata,
          access_count: mem.access_count || 0,
          last_accessed: mem.last_accessed || new Date().toISOString()
        } as Memory))
      }
    } catch (error) {
      // Error fetching recent memories from API
    }
    
    return []
  }

  static async getUserMemories(
    page: number = 1,
    limit: number = 20
  ): Promise<{ memories: Memory[]; total: number; page: number; limit: number }> {
    requireAuthToken()
    const response = await getRequest(`${this.baseUrl}/user?page=${page}&limit=${limit}`)
    const data = response.data?.data
    return data || { memories: [], total: 0, page, limit }
  }

  static async getMemoryWithRelations(memoryId: string): Promise<MemoryWithRelations> {
    const response = await getRequest(`${this.baseUrl}/relations/${memoryId}`)
    return response.data?.data
  }

  static async getMemoryCluster(
    memoryId: string,
    depth: number = 2
  ): Promise<MemoryCluster> {
    const response = await getRequest(`${this.baseUrl}/cluster/${memoryId}?depth=${depth}`)
    return response.data?.data
  }

  static async getUserMemoryCount(): Promise<number> {
    requireAuthToken()
    try {
      const response = await getRequest(`${this.baseUrl}/user/count`)
      const count = response.data?.data?.memoryCount
      return typeof count === 'number' ? count : parseInt(count) || 0
    } catch (error) {
      console.error('Error fetching memory count:', error)
      return 0
    }
  }

  static async getMemoryByHash(hash: string): Promise<Memory | null> {
    const response = await getRequest(`${this.baseUrl}/hash/${hash}`)
    return response.data?.data || null
  }

  static async isMemoryStored(hash: string): Promise<boolean> {
    const response = await getRequest(`${this.baseUrl}/exists/${hash}`)
    return response.data?.data?.exists || false
  }

  static async processMemoryForMesh(memoryId: string): Promise<void> {
    await postRequest(`${this.baseUrl}/process-mesh/${memoryId}`, {})
  }

  static async getMemorySnapshots(
    page: number = 1,
    limit: number = 20
  ): Promise<{ snapshots: unknown[]; total: number; page: number; limit: number }> {
    requireAuthToken()
    const response = await getRequest(`${this.baseUrl}/snapshots?page=${page}&limit=${limit}`)
    return response.data?.data || { snapshots: [], total: 0, page, limit }
  }


  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await getRequest(`${this.baseUrl}/health`)
    return response.data?.data || { status: 'unknown', timestamp: new Date().toISOString() }
  }

  static async getPendingJobs(): Promise<{
    jobs: Array<{
      id: string
      user_id: string
      raw_text: string
      full_text_length: number
      metadata: Record<string, unknown>
      status: 'waiting' | 'active' | 'delayed'
      created_at: string
      processed_on: string | null
      finished_on: string | null
      failed_reason: string | null
      attempts: number
    }>
    counts: {
      total: number
      waiting: number
      active: number
      delayed: number
    }
  }> {
    requireAuthToken()
    const response = await getRequest(`/content/pending`)
    return response.data?.data || { jobs: [], counts: { total: 0, waiting: 0, active: 0, delayed: 0 } }
  }

  static async deleteMemory(memoryId: string): Promise<void> {
    requireAuthToken()
    const { deleteRequest } = await import('../utility/generalServices')
    await deleteRequest(`${this.baseUrl}/${memoryId}`)
  }

  static async deletePendingJob(jobId: string): Promise<void> {
    requireAuthToken()
    const { deleteRequest } = await import('../utility/generalServices')
    await deleteRequest(`/content/pending/${jobId}`)
  }
}
