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
    [key: string]: string | string[] | number | boolean | undefined
  }
  importance_score?: number
  access_count: number
  last_accessed: string
}

export interface MemoryInsights {
  total_memories: number
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

export interface MemoryMeshNode {
  id: string
  type: 'manual' | 'browser' | 'extension' | 'reasoning'
  label: string
  x: number
  y: number
  memory_id: string
  title?: string
  summary?: string
  content?: string
  full_content?: string
  importance_score?: number
  hasEmbedding?: boolean
  clusterId?: number
  layout?: {
    isLatentSpace?: boolean
    cluster?: string
    centrality?: number
  }
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
  metadata?: {
    similarity_threshold?: number
    total_nodes?: number
    nodes_in_latent_space?: number
    total_edges?: number
    detected_clusters?: number
    average_connections?: number
    is_latent_space?: boolean
    projection_method?: string
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
  source?: string
}

export interface SearchResult {
  memory: Memory
  similarity_score?: number
  relevance_score?: number
  keyword_score?: number
  semantic_score?: number
  blended_score?: number
  search_type?: 'keyword' | 'semantic' | 'hybrid'
}

export interface MemorySearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  filters: SearchFilters
  answer?: string
  citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>
  job_id?: string
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
