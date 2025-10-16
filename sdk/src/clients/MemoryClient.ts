import { HttpClient } from '../http'
import type { ApiResponse, Memory, MemoryMesh, MemorySnapshot, Insights, TransactionStats } from '../types'

export class MemoryClient {
  constructor(private http: HttpClient) {}

  processRawContent(body: { content: string; url?: string; title?: string; userAddress: string; metadata?: any }) {
    return this.http.post<ApiResponse<any>>('/api/memory/process', body)
  }

  storeMemory(body: { hash: string; url: string; timestamp: number }) {
    return this.http.post<ApiResponse<any>>('/api/memory', body)
  }

  storeMemoryBatch(memories: Array<{ hash: string; urlHash: string; timestamp: number }>) {
    return this.http.post<ApiResponse<any>>('/api/memory/batch', { memories })
  }

  getUserMemories(userAddress: string) {
    return this.http.get<ApiResponse<{ userAddress: string; memories: any[]; count: number }>>(`/api/memory/user/${encodeURIComponent(userAddress)}`)
  }

  getUserMemoryCount(userAddress: string) {
    return this.http.get<ApiResponse<{ userAddress: string; memoryCount: number }>>(`/api/memory/user/${encodeURIComponent(userAddress)}/count`)
  }

  getMemory(userAddress: string, index: number) {
    return this.http.get<ApiResponse<any>>(`/api/memory/user/${encodeURIComponent(userAddress)}/memory/${index}`)
  }

  getRecentMemories(userAddress: string, opts?: { count?: number }) {
    return this.http.get<ApiResponse<{ userAddress: string; count: number; memories: Memory[]; actualCount: number }>>(`/api/memory/user/${encodeURIComponent(userAddress)}/recent`, opts)
  }

  getByUrl(userAddress: string, url: string) {
    return this.http.get<ApiResponse<{ userAddress: string; url: string; memories: Memory[]; count: number }>>(`/api/memory/user/${encodeURIComponent(userAddress)}/by-url`, { url })
  }

  getByTimeRange(userAddress: string, startTime: number, endTime: number) {
    return this.http.get<ApiResponse<{ userAddress: string; startTime: number; endTime: number; memories: Memory[]; count: number }>>(`/api/memory/user/${encodeURIComponent(userAddress)}/by-timestamp`, { startTime, endTime })
  }

  searchMemories(params: { userAddress: string; query: string; category?: string; topic?: string; importance?: number; sentiment?: string; limit?: number }) {
    return this.http.get<ApiResponse<{ results: Array<{ memory: Memory; search_type: string; keyword_score?: number; blended_score?: number }>; total: number; query: string; searchableTerms: string[] }>>('/api/memory/search', params as any)
  }

  getInsights(params: { userAddress: string }) {
    return this.http.get<ApiResponse<Insights>>('/api/memory/insights', params as any)
  }

  getMemoriesWithTransactionDetails(params: { userAddress: string; status?: string; limit?: number }) {
    return this.http.get<ApiResponse<{ memories: Memory[]; transactionStats: TransactionStats; totalMemories: number }>>('/api/memory/transactions', params as any)
  }

  getTransactionStatus(memoryId: string) {
    return this.http.get<ApiResponse<any>>(`/api/memory/transaction/${encodeURIComponent(memoryId)}`)
  }

  retryFailedTransactions(params: { userAddress: string; limit?: number }) { return this.http.post<ApiResponse<any>>('/api/memory/retry-failed', params) }

  getMesh(userAddress: string, opts?: { limit?: number; threshold?: number }) {
    return this.http.get<ApiResponse<MemoryMesh>>(`/api/memory/mesh/${encodeURIComponent(userAddress)}`, opts as any)
  }

  getMemoryWithRelations(memoryId: string, userAddress: string) {
    return this.http.get<ApiResponse<any>>(`/api/memory/relations/${encodeURIComponent(memoryId)}`, { userAddress })
  }

  getMemoryCluster(memoryId: string, userAddress: string, depth?: number) {
    return this.http.get<ApiResponse<any>>(`/api/memory/cluster/${encodeURIComponent(memoryId)}`, { userAddress, depth })
  }

  searchWithEmbeddings(params: { userAddress: string; query: string; category?: string; topic?: string; sentiment?: string; tx_status?: string; source?: string; dateRange?: any; page?: number; limit?: number }) {
    return this.http.get<ApiResponse<any>>('/api/memory/search-embeddings', params as any)
  }

  searchHybrid(params: { userAddress: string; query: string; category?: string; topic?: string; sentiment?: string; tx_status?: string; source?: string; dateRange?: any; page?: number; limit?: number }) {
    return this.http.get<ApiResponse<any>>('/api/memory/search-hybrid', params as any)
  }

  processMemoryForMesh(memoryId: string, userAddress: string) {
    const path = `/api/memory/process-mesh/${encodeURIComponent(memoryId)}?userAddress=${encodeURIComponent(userAddress)}`
    return this.http.post<ApiResponse<any>>(path)
  }

  getByHash(hash: string) { return this.http.get<ApiResponse<Memory>>(`/api/memory/hash/${encodeURIComponent(hash)}`) }
  exists(hash: string) { return this.http.get<ApiResponse<{ hash: string; exists: boolean }>>(`/api/memory/exists/${encodeURIComponent(hash)}`) }
  getSnapshots(userAddress: string, opts?: { page?: number; limit?: number }) { return this.http.get<ApiResponse<{ snapshots: MemorySnapshot[]; pagination: Pagination }>>(`/api/memory/snapshots/${encodeURIComponent(userAddress)}`, opts as any) }
  getSnapshot(snapshotId: string, userAddress: string) { return this.http.get<ApiResponse<MemorySnapshot>>(`/api/memory/snapshot/${encodeURIComponent(snapshotId)}`, { userAddress }) }
  backfillSnapshots(userAddress: string) { return this.http.post<ApiResponse<any>>('/api/memory/backfill-snapshots', { userAddress }) }
  health() { return this.http.get<ApiResponse<any>>('/api/memory/health') }
  debug(userAddress: string) { return this.http.get<ApiResponse<any>>('/api/memory/debug', { userAddress }) }
}

type Pagination = { page: number; limit: number; total: number; pages: number }


