export type ApiResponse<T> = { success?: boolean; status?: string; message?: string; data?: T; error?: any; }

export type Pagination = { page: number; limit: number; total: number; pages: number }

export type Memory = {
  id: string
  title?: string | null
  url?: string | null
  hash?: string | null
  timestamp?: string | number | null
  created_at?: string
  tx_hash?: string | null
  block_number?: string | number | null
  gas_used?: string | null
  tx_status?: string | null
  blockchain_network?: string | null
  confirmed_at?: string | null
  content?: string | null
  source?: string | null
  page_metadata?: any
}

export type MemoryWithStats = Memory & { relation_stats?: { outgoing_relations: number; incoming_relations: number; total_relations: number; has_embeddings: boolean } }

export type MemoryMesh = { nodes: any[]; edges: any[]; clusters: Record<string, string[]>; metadata: { similarity_threshold: number; total_nodes: number; total_edges: number; average_connections: number } }

export type MemorySnapshot = { id: string; created_at: string; raw_text: string; raw_text_length?: number }

export type Insights = { totalMemories: number; topTopics: Array<{ topic: string; count: number }>; topCategories: Array<{ category: string; count: number }>; sentimentDistribution: Record<string, number>; sourceDistribution: Record<string, number>; transactionStatusDistribution: Record<string, number>; averageImportance: number; insights: { mostActiveCategory: string; mostCommonTopic: string; dominantSentiment: string } }

export type TransactionStats = Record<string, number>

export type SearchPostResponse = { query: string; results: Array<{ memory_id: string; title: string | null; content_preview: string; url: string | null; timestamp: number; related_memories: string[]; score: number }>; meta_summary?: string; answer?: string; citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>; job_id: string }

export type SearchJob = { id: string; status: 'pending' | 'completed' | 'failed'; answer?: string; meta_summary?: string; created_at: number }

export type BlockscoutTxCached = { hash: string; status: 'ok' | 'error'; block?: string; gas_used?: string; gas_price?: string; from?: { hash: string }; to?: { hash: string }; value?: string; timestamp?: string; finality_reached: boolean; cached_at?: string }


