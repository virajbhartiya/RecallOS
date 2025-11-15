import type { Memory, MemoryType, SearchResult } from "../types/memory.type"

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
  memory_type?: MemoryType | null
}

export function transformApiSearchResult(
  result: ApiSearchResult
): SearchResult {
  return {
    memory: {
      id: result.memory_id,
      user_id: result.user_id || "",
      source: result.source || (result.url ? "browser" : "extension"),
      url: result.url,
      title: result.title,
      content: result.content || result.summary || "",
      summary: result.summary,
      timestamp: result.timestamp,
      created_at:
        result.created_at || new Date(result.timestamp * 1000).toISOString(),
      full_content: result.full_content,
      page_metadata: result.page_metadata
        ? ({
            ...Object.fromEntries(
              Object.entries(result.page_metadata).map(([k, v]) => [
                k,
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean" ||
                Array.isArray(v)
                  ? v
                  : String(v),
              ])
            ),
            title:
              typeof result.page_metadata.title === "string"
                ? result.page_metadata.title
                : undefined,
            description:
              typeof result.page_metadata.description === "string"
                ? result.page_metadata.description
                : undefined,
            keywords: Array.isArray(result.page_metadata.keywords)
              ? (result.page_metadata.keywords as string[])
              : undefined,
            author:
              typeof result.page_metadata.author === "string"
                ? result.page_metadata.author
                : undefined,
            published_date:
              typeof result.page_metadata.published_date === "string"
                ? result.page_metadata.published_date
                : undefined,
          } as Memory["page_metadata"])
        : undefined,
      importance_score: result.importance_score,
      access_count: result.access_count || 0,
      last_accessed: result.last_accessed || new Date().toISOString(),
      memory_type: result.memory_type || null,
    },
    similarity_score: result.score,
    relevance_score: result.score,
    semantic_score: result.score,
    search_type: "semantic" as const,
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
    id: mem.id || "",
    user_id: "",
    hash: mem.hash || "",
    timestamp:
      typeof mem.timestamp === "string"
        ? parseInt(mem.timestamp)
        : typeof mem.timestamp === "number"
          ? mem.timestamp
          : 0,
    created_at: mem.created_at || new Date().toISOString(),
    title: mem.title || "Memory",
    summary: mem.summary || "",
    content: mem.content || "",
    source: mem.source || "extension",
    url: mem.url,
    page_metadata: mem.page_metadata
      ? ({
          ...Object.fromEntries(
            Object.entries(mem.page_metadata).map(([k, v]) => [
              k,
              typeof v === "string" ||
              typeof v === "number" ||
              typeof v === "boolean" ||
              Array.isArray(v)
                ? v
                : String(v),
            ])
          ),
          title:
            typeof mem.page_metadata.title === "string"
              ? mem.page_metadata.title
              : undefined,
          description:
            typeof mem.page_metadata.description === "string"
              ? mem.page_metadata.description
              : undefined,
          keywords: Array.isArray(mem.page_metadata.keywords)
            ? (mem.page_metadata.keywords as string[])
            : undefined,
          author:
            typeof mem.page_metadata.author === "string"
              ? mem.page_metadata.author
              : undefined,
          published_date:
            typeof mem.page_metadata.published_date === "string"
              ? mem.page_metadata.published_date
              : undefined,
        } as Memory["page_metadata"])
      : undefined,
    access_count: mem.access_count || 0,
    last_accessed: mem.last_accessed || new Date().toISOString(),
  }
}
