import { HttpClient, type HttpClientOptions } from './http'
import { MemoryClient } from './clients/MemoryClient'
import { ContentClient } from './clients/ContentClient'
import { BlockscoutClient } from './clients/BlockscoutClient'
import { SearchClient } from './clients/SearchClient'

export type { ApiResponse, Pagination, Memory, MemoryMesh, MemorySnapshot, Insights, TransactionStats, SearchPostResponse, SearchJob, BlockscoutTxCached } from './types'
export type { HttpClientOptions }

export type RecallOSClient = {
  memory: MemoryClient
  content: ContentClient
  blockscout: BlockscoutClient
  search: SearchClient
}

export function createRecallOSClient(opts: HttpClientOptions): RecallOSClient {
  const http = new HttpClient(opts)
  return {
    memory: new MemoryClient(http),
    content: new ContentClient(http),
    blockscout: new BlockscoutClient(http),
    search: new SearchClient(http)
  }
}


