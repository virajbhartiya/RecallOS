import type { Memory, SearchResult } from '../types/memory'

interface ApiSearchResult {
  memory_id: string
  user_id?: string
  source?: string
  url?: string
  title?: string
  content?: string
  summary?: string
  timestamp: number
  created_at?: string
  full_content?: string
  page_metadata?: Record<string, unknown>
  importance_score?: number
  access_count?: number
  last_accessed?: string
  score: number
}

export function transformApiSearchResult(result: ApiSearchResult): SearchResult {
  return {
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
      page_metadata: result.page_metadata ? {
        ...Object.fromEntries(
          Object.entries(result.page_metadata).map(([k, v]) => [
            k,
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || Array.isArray(v) ? v : String(v)
          ])
        ),
        title: (result.page_metadata as any).title as string | undefined,
        description: (result.page_metadata as any).description as string | undefined,
        keywords: (result.page_metadata as any).keywords as string[] | undefined,
        author: (result.page_metadata as any).author as string | undefined,
        published_date: (result.page_metadata as any).published_date as string | undefined,
      } as Memory['page_metadata'] : undefined,
      importance_score: result.importance_score,
      access_count: result.access_count || 0,
      last_accessed: result.last_accessed || new Date().toISOString(),
    },
    similarity_score: result.score,
    relevance_score: result.score,
    semantic_score: result.score,
    search_type: 'semantic' as const
  }
}

export function transformApiMemoryResponse(mem: {
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
}): Memory {
  return {
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
    page_metadata: mem.page_metadata ? {
      ...Object.fromEntries(
        Object.entries(mem.page_metadata).map(([k, v]) => [
          k,
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || Array.isArray(v) ? v : String(v)
        ])
      ),
      title: (mem.page_metadata as any).title as string | undefined,
      description: (mem.page_metadata as any).description as string | undefined,
      keywords: (mem.page_metadata as any).keywords as string[] | undefined,
      author: (mem.page_metadata as any).author as string | undefined,
      published_date: (mem.page_metadata as any).published_date as string | undefined,
    } as Memory['page_metadata'] : undefined,
    access_count: mem.access_count || 0,
    last_accessed: mem.last_accessed || new Date().toISOString(),
  }
}

