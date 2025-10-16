import { HttpClient } from '../http'
import type { ApiResponse, BlockscoutTxCached } from '../types'

export class BlockscoutClient {
  constructor(private http: HttpClient) {}

  prefetch(body: { txHash: string; network?: 'sepolia' | 'mainnet' | 'polygon' | 'arbitrum' | 'optimism' }) {
    return this.http.post<ApiResponse<{ message: string; txHash: string; network: string }>>('/api/blockscout/prefetch', body)
  }

  getTransaction(txHash: string) {
    return this.http.get<BlockscoutTxCached | { error: string }>(`/api/blockscout/transaction/${encodeURIComponent(txHash)}`)
  }

  batchPrefetch(transactions: Array<{ txHash: string; network?: string }>) {
    return this.http.post<ApiResponse<{ message: string; count: number }>>('/api/blockscout/batch-prefetch', { transactions })
  }

  getPrefetchStatus(txHash: string) {
    return this.http.get<ApiResponse<{ status: string; finality_reached: boolean; cached_at?: string; data?: any }>>(`/api/blockscout/status/${encodeURIComponent(txHash)}`)
  }

  cleanupOldPending() { return this.http.post<ApiResponse<{ message: string }>>('/api/blockscout/cleanup') }
  getQueueStats() { return this.http.get<ApiResponse<{ waiting: number; active: number; completed: number; failed: number; total: number }>>('/api/blockscout/queue-stats') }
}


