export interface Memory {
  id: string
  user_id: string
  source: string
  url?: string
  title?: string
  content: string
  summary?: string
  hash?: string
  timestamp: number
  created_at: string
  full_content?: string
  page_metadata?: {
    title?: string
    description?: string
    keywords?: string[]
    author?: string
    published_date?: string
    [key: string]: any
  }
  importance_score?: number
  access_count: number
  last_accessed: string
  tx_hash?: string
  block_number?: number
  gas_used?: string
  tx_status?: 'pending' | 'confirmed' | 'failed'
  blockchain_network?: string
  confirmed_at?: string
}

export interface MemoryInsights {
  total_memories: number
  total_transactions: number
  confirmed_transactions: number
  pending_transactions: number
  failed_transactions: number
  categories: {
    [category: string]: number
  }
  sentiment_distribution: {
    positive: number
    negative: number
    neutral: number
  }
  topology: {
    total_nodes: number
    total_edges: number
    average_connections: number
    largest_cluster_size: number
  }
  recent_activity: {
    last_7_days: number
    last_30_days: number
  }
}

export interface TransactionDetails {
  tx_hash: string
  block_number: number
  gas_used: string
  tx_status: 'pending' | 'confirmed' | 'failed'
  blockchain_network: string
  confirmed_at?: string
}

export interface MemoryMeshNode {
  id: string
  type: 'manual' | 'on_chain' | 'browser' | 'reasoning'
  label: string
  x: number
  y: number
  memory_id: string
  title?: string
  summary?: string
  importance_score?: number
}

export interface MemoryMeshEdge {
  source: string
  target: string
  relation_type: string
  similarity_score: number
}

export interface MemoryMesh {
  nodes: MemoryMeshNode[]
  edges: MemoryMeshEdge[]
  clusters: {
    [clusterId: string]: string[]
  }
}

export interface SearchFilters {
  category?: string
  topic?: string
  importance?: {
    min: number
    max: number
  }
  sentiment?: 'positive' | 'negative' | 'neutral'
  dateRange?: {
    start: string
    end: string
  }
  tx_status?: 'pending' | 'confirmed' | 'failed'
  source?: string
}

export interface SearchResult {
  memory: Memory
  similarity_score?: number
  relevance_score?: number
}

export interface MemorySearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  filters: SearchFilters
}

export interface MemoryWithRelations extends Memory {
  related_memories: {
    memory: Memory
    relation_type: string
    similarity_score: number
  }[]
}

export interface MemoryCluster {
  center_memory: Memory
  related_memories: Memory[]
  cluster_size: number
  average_similarity: number
}
