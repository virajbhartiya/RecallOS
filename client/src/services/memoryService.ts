import { getRequest, postRequest } from '../utility/generalServices'
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
  tx_status?: string
  blockchain_network?: string
  page_metadata?: Record<string, unknown>
  access_count?: number
  last_accessed?: string
  tx_hash?: string
  block_number?: string | number
  gas_used?: string
  confirmed_at?: string
}

export class MemoryService {
  private static baseUrl = '/memory'
  
  // Normalize wallet address to handle case sensitivity
  private static normalizeAddress(address: string): string {
    return address.toLowerCase()
  }

  static async getMemoriesWithTransactionDetails(
    userAddress: string,
    status?: 'pending' | 'confirmed' | 'failed',
    limit?: number
  ): Promise<Memory[]> {
    const normalizedAddress = this.normalizeAddress(userAddress)
    const params = new URLSearchParams()
    params.append('userAddress', normalizedAddress)
    if (status) params.append('status', status)
    if (limit) params.append('limit', limit.toString())
    
    try {
      const response = await getRequest(`${this.baseUrl}/transactions?${params.toString()}`)
      const data = response.data?.data
      
      // Check if the API returned an error
      if (response.data?.success === false) {
        throw new Error(response.data?.error || 'API returned error')
      }
      
      if (Array.isArray(data?.memories) && data.memories.length > 0) {
        // Map API response to Memory interface
        return data.memories.map((mem: ApiMemoryResponse) => ({
          id: mem.id || mem.hash,
          user_id: userAddress,
          hash: mem.hash,
          timestamp: typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp,
          created_at: mem.created_at || new Date((typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp) * 1000).toISOString(),
          title: mem.title || 'Memory',
          summary: mem.summary || `Memory stored at ${new Date((typeof mem.timestamp === 'string' ? parseInt(mem.timestamp) : mem.timestamp) * 1000).toLocaleDateString()}`,
          content: mem.content || '',
          source: mem.source || 'on_chain',
          url: mem.url,
          tx_status: mem.tx_status || 'confirmed',
          blockchain_network: mem.blockchain_network || 'sepolia',
          page_metadata: mem.page_metadata,
          access_count: mem.access_count || 0,
          last_accessed: mem.last_accessed || new Date().toISOString(),
          tx_hash: mem.tx_hash,
          block_number: mem.block_number ? (typeof mem.block_number === 'string' ? parseInt(mem.block_number) : mem.block_number) : undefined,
          gas_used: mem.gas_used,
          confirmed_at: mem.confirmed_at
        } as Memory))
      }
    } catch (error) {
      console.error('Error fetching memories from database:', error)
    }
    
    // No fallback - return empty array if no transaction data found
    
    return []
  }

  static async getMemoryMesh(userAddress: string, limit: number = 50, threshold: number = 0.3): Promise<MemoryMesh> {
    const normalizedAddress = this.normalizeAddress(userAddress)
    const response = await getRequest(`${this.baseUrl}/mesh/${normalizedAddress}?limit=${limit}&threshold=${threshold}`)
    return response.data?.data || { nodes: [], edges: [], clusters: {} }
  }

  static async searchMemories(
    userAddress: string,
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<MemorySearchResponse> {
    try {
      const normalizedAddress = this.normalizeAddress(userAddress)
      
      // Use the working /search endpoint (POST)
      const response = await postRequest('/search', {
        wallet: normalizedAddress,
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
        // Backend returns: { query, results, meta_summary, answer, citations, job_id }
        // Transform backend results to match frontend SearchResult interface
        const transformedResults = (responseData.results || []).map((result: {
          memory_id: string;
          user_id?: string;
          source?: string;
          url?: string;
          title?: string;
          content?: string;
          summary?: string;
          avail_hash?: string;
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
          tx_hash?: string;
          block_number?: number;
          gas_used?: string;
          tx_status?: 'pending' | 'confirmed' | 'failed';
          blockchain_network?: string;
          confirmed_at?: string;
          score: number;
        }) => ({
          memory: {
            id: result.memory_id,
            user_id: result.user_id || '',
            source: result.source || 'unknown',
            url: result.url,
            title: result.title,
            content: result.content || result.summary || '',
            summary: result.summary,
            hash: result.avail_hash,
            timestamp: result.timestamp,
            created_at: result.created_at || new Date(result.timestamp * 1000).toISOString(),
            full_content: result.full_content,
            page_metadata: result.page_metadata,
            importance_score: result.importance_score,
            access_count: result.access_count || 0,
            last_accessed: result.last_accessed || new Date().toISOString(),
            tx_hash: result.tx_hash,
            block_number: result.block_number,
            gas_used: result.gas_used,
            tx_status: result.tx_status,
            blockchain_network: result.blockchain_network,
            confirmed_at: result.confirmed_at
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
          // Include search answer and meta summary if available
          answer: responseData.answer,
          meta_summary: responseData.meta_summary,
          citations: responseData.citations,
          job_id: responseData.job_id
        }
      }
      return { results: [], total: 0, page, limit, filters }
    } catch (error) {
      console.error('Error in searchMemories:', error)
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async searchMemoriesWithEmbeddings(
    userAddress: string,
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<MemorySearchResponse> {
    try {
      const normalizedAddress = this.normalizeAddress(userAddress)
      
      // Use the working /search endpoint (POST) - same as searchMemories
      const response = await postRequest('/search', {
        wallet: normalizedAddress,
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
        // Backend returns: { query, results, meta_summary, answer, citations, job_id }
        // Transform backend results to match frontend SearchResult interface
        const transformedResults = (responseData.results || []).map((result: {
          memory_id: string;
          user_id?: string;
          source?: string;
          url?: string;
          title?: string;
          content?: string;
          summary?: string;
          avail_hash?: string;
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
          tx_hash?: string;
          block_number?: number;
          gas_used?: string;
          tx_status?: 'pending' | 'confirmed' | 'failed';
          blockchain_network?: string;
          confirmed_at?: string;
          score: number;
        }) => ({
          memory: {
            id: result.memory_id,
            user_id: result.user_id || '',
            source: result.source || 'unknown',
            url: result.url,
            title: result.title,
            content: result.content || result.summary || '',
            summary: result.summary,
            hash: result.avail_hash,
            timestamp: result.timestamp,
            created_at: result.created_at || new Date(result.timestamp * 1000).toISOString(),
            full_content: result.full_content,
            page_metadata: result.page_metadata,
            importance_score: result.importance_score,
            access_count: result.access_count || 0,
            last_accessed: result.last_accessed || new Date().toISOString(),
            tx_hash: result.tx_hash,
            block_number: result.block_number,
            gas_used: result.gas_used,
            tx_status: result.tx_status,
            blockchain_network: result.blockchain_network,
            confirmed_at: result.confirmed_at
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
          // Include search answer and meta summary if available
          answer: responseData.answer,
          meta_summary: responseData.meta_summary,
          citations: responseData.citations,
          job_id: responseData.job_id
        }
      }
      return { results: [], total: 0, page, limit, filters }
    } catch (error) {
      console.error('Error in searchMemoriesWithEmbeddings:', error)
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async searchMemoriesHybrid(
    userAddress: string,
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<MemorySearchResponse> {
    try {
      const normalizedAddress = this.normalizeAddress(userAddress)
      const params = new URLSearchParams({
        userAddress: normalizedAddress,
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
      console.error('Error in searchMemoriesHybrid:', error)
      return { results: [], total: 0, page, limit, filters }
    }
  }

  static async getMemoryInsights(userAddress: string): Promise<MemoryInsights> {
    const normalizedAddress = this.normalizeAddress(userAddress)
    const params = new URLSearchParams()
    params.append('userAddress', normalizedAddress)
    
    try {
      const response = await getRequest(`${this.baseUrl}/insights?${params.toString()}`)
      
      // Check if the API returned an error
      if (response.data?.success === false) {
        throw new Error(response.data?.error || 'API returned error')
      }
      
      const data = response.data?.data
      
      if (data) {
        return {
          total_memories: data.totalMemories || 0,
          total_transactions: data.totalMemories || 0, // Total transactions = total memories
          confirmed_transactions: data.transactionStatusDistribution?.confirmed || 0,
          pending_transactions: data.transactionStatusDistribution?.pending || 0,
          failed_transactions: data.transactionStatusDistribution?.failed || 0,
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
      console.error('Error fetching insights from database:', error)
      // If user not found (404), try to create the user and then retry
      if (error && typeof error === 'object' && 'response' in error && (error as { response: { status: number } }).response?.status === 404) {
        try {
          // Try to create user by calling the process endpoint with minimal data
          await postRequest(`${this.baseUrl}/process`, {
            content: 'User initialization',
            url: 'user-init',
            title: 'User Setup',
            userAddress: userAddress,
            metadata: { source: 'manual' }
          })
          
          // Retry the original request
          const retryResponse = await getRequest(`${this.baseUrl}/insights?${params.toString()}`)
          const retryData = retryResponse.data?.data
          if (retryData) {
            return {
              total_memories: retryData.totalMemories || 0,
              total_transactions: retryData.totalMemories || 0, // Total transactions = total memories
              confirmed_transactions: retryData.transactionStatusDistribution?.confirmed || 0,
              pending_transactions: retryData.transactionStatusDistribution?.pending || 0,
              failed_transactions: retryData.transactionStatusDistribution?.failed || 0,
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
          console.error('Failed to create user for insights:', createError)
        }
      }
    }
    
    // Fallback: create basic insights from blockchain data
    try {
      const count = await this.getUserMemoryCount(userAddress)
      return {
        total_memories: count,
        total_transactions: count,
        confirmed_transactions: count,
        pending_transactions: 0,
        failed_transactions: 0,
        categories: { 'on_chain': count },
        sentiment_distribution: { positive: 0, negative: 0, neutral: count },
        topology: { total_nodes: count, total_edges: 0, average_connections: 0, largest_cluster_size: count },
        recent_activity: { last_7_days: count, last_30_days: count }
      }
    } catch (fallbackError) {
      console.error('Fallback insights also failed:', fallbackError)
      return {
        total_memories: 0,
        total_transactions: 0,
        confirmed_transactions: 0,
        pending_transactions: 0,
        failed_transactions: 0,
        categories: {},
        sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        topology: { total_nodes: 0, total_edges: 0, average_connections: 0, largest_cluster_size: 0 },
        recent_activity: { last_7_days: 0, last_30_days: 0 }
      }
    }
  }

  static async getRecentMemories(userAddress: string, count: number = 10): Promise<Memory[]> {
    const normalizedAddress = this.normalizeAddress(userAddress)
    
    // First try the database endpoint for full data
    try {
      const response = await getRequest(`${this.baseUrl}/transactions?userAddress=${normalizedAddress}&limit=${count}`)
      const data = response.data?.data
      if (Array.isArray(data?.memories) && data.memories.length > 0) {
        return data.memories
      }
    } catch (error) {
      console.error('Error fetching recent memories from database:', error)
    }
    
    // Fallback to recent memories endpoint (now returns full database data)
    try {
      const response = await getRequest(`${this.baseUrl}/user/${normalizedAddress}/recent?count=${count}`)
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
          source: mem.source || 'on_chain',
          user_id: userAddress,
          url: mem.url,
          tx_status: mem.tx_status || 'confirmed',
          blockchain_network: mem.blockchain_network || 'sepolia',
          page_metadata: mem.page_metadata,
          access_count: mem.access_count || 0,
          last_accessed: mem.last_accessed || new Date().toISOString()
        } as Memory))
      }
    } catch (error) {
      console.error('Error fetching recent memories from API:', error)
    }
    
    return []
  }

  static async getUserMemories(
    userAddress: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ memories: Memory[]; total: number; page: number; limit: number }> {
    const response = await getRequest(`${this.baseUrl}/user/${userAddress}?page=${page}&limit=${limit}`)
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

  static async getUserMemoryCount(userAddress: string): Promise<number> {
    const normalizedAddress = this.normalizeAddress(userAddress)
    try {
      const response = await getRequest(`${this.baseUrl}/user/${normalizedAddress}/count`)
      const count = response.data?.data?.memoryCount
      return typeof count === 'number' ? count : parseInt(count) || 0
    } catch (error) {
      console.error('Error fetching memory count:', error)
      // Fallback: try to get count from transactions endpoint
      try {
        const response = await getRequest(`${this.baseUrl}/transactions?userAddress=${normalizedAddress}&limit=1000`)
        const data = response.data?.data
        return Array.isArray(data?.memories) ? data.memories.length : 0
      } catch (fallbackError) {
        console.error('Fallback count also failed:', fallbackError)
        return 0
      }
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
    userAddress: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ snapshots: unknown[]; total: number; page: number; limit: number }> {
    const response = await getRequest(`${this.baseUrl}/snapshots/${userAddress}?page=${page}&limit=${limit}`)
    return response.data?.data || { snapshots: [], total: 0, page, limit }
  }

  static async getMemoryTransactionStatus(memoryId: string): Promise<{
    tx_hash?: string
    block_number?: number
    gas_used?: string
    tx_status: 'pending' | 'confirmed' | 'failed'
    blockchain_network?: string
    confirmed_at?: string
  }> {
    const response = await getRequest(`${this.baseUrl}/transaction/${memoryId}`)
    return response.data?.data || { tx_status: 'pending' }
  }

  static async retryFailedTransactions(userAddress: string): Promise<{
    retried_count: number
    success_count: number
    failed_count: number
  }> {
    const response = await postRequest(`${this.baseUrl}/retry-failed`, { userAddress })
    return response.data?.data || { retried_count: 0, success_count: 0, failed_count: 0 }
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await getRequest(`${this.baseUrl}/health`)
    return response.data?.data || { status: 'unknown', timestamp: new Date().toISOString() }
  }
}
