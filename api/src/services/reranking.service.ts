import { aiProvider } from './ai-provider.service'
import { logger } from '../utils/logger.util'
import { getRedisClient } from '../lib/redis.lib'
import { createHash } from 'crypto'

const RERANK_CACHE_TTL = 60 * 60 // 1 hour
const RERANK_CACHE_PREFIX = 'rerank_cache:'

type MemoryCandidate = {
  id: string
  title: string | null
  summary: string | null
  content: string
  score: number
}

type RerankedResult = {
  id: string
  score: number
  rank: number
  reasoning?: string
}

/**
 * Generate a cache key for reranking results
 */
function getRerankCacheKey(query: string, memoryIds: string[]): string {
  const queryHash = createHash('sha256').update(query).digest('hex').substring(0, 16)
  const idsHash = createHash('sha256')
    .update(memoryIds.sort().join(','))
    .digest('hex')
    .substring(0, 16)
  return `${RERANK_CACHE_PREFIX}${queryHash}:${idsHash}`
}

/**
 * Rerank a small set of memory candidates using LLM
 * This is useful when you have 5-20 results and want to improve ordering
 */
export class RerankingService {
  /**
   * Rerank memories using LLM-based relevance scoring
   * Results are cached by query_hash to avoid redundant LLM calls
   */
  async rerankMemories(
    query: string,
    candidates: MemoryCandidate[],
    userId?: string
  ): Promise<RerankedResult[]> {
    // Only rerank small result sets (5-20 items)
    if (candidates.length < 3 || candidates.length > 20) {
      return candidates.map((c, idx) => ({
        id: c.id,
        score: c.score,
        rank: idx + 1,
      }))
    }

    try {
      // Check cache first
      const cacheKey = getRerankCacheKey(
        query,
        candidates.map(c => c.id)
      )
      const redis = getRedisClient()
      const cached = await redis.get(cacheKey)

      if (cached) {
        logger.log('[rerank] Cache hit', {
          query: query.substring(0, 50),
          candidateCount: candidates.length,
        })
        const cachedResults = JSON.parse(cached) as RerankedResult[]
        // Verify all IDs match
        if (
          cachedResults.length === candidates.length &&
          cachedResults.every(r => candidates.some(c => c.id === r.id))
        ) {
          return cachedResults
        }
      }

      // Build prompt for reranking
      const candidatesText = candidates
        .map((c, idx) => {
          const preview = (c.summary || c.content || '').substring(0, 200)
          return `[${idx + 1}] ID: ${c.id}\nTitle: ${c.title || 'Untitled'}\nContent: ${preview}...`
        })
        .join('\n\n')

      const prompt = `You are a relevance ranking system. Given a user query and a list of memory candidates, rank them by relevance to the query.

User Query: "${query}"

Memory Candidates:
${candidatesText}

Return ONLY a JSON array of objects with this exact structure:
[
  {"id": "memory-id-1", "rank": 1, "score": 0.95, "reasoning": "brief explanation"},
  {"id": "memory-id-2", "rank": 2, "score": 0.85, "reasoning": "brief explanation"},
  ...
]

Rules:
- Rank 1 is most relevant, rank ${candidates.length} is least relevant
- Score should be between 0.0 and 1.0 (higher = more relevant)
- Include ALL candidate IDs in the response
- Keep reasoning brief (1 sentence max)
- Return ONLY the JSON array, no markdown or extra text`

      const aiResponse = await aiProvider.generateContent(prompt, false, userId)

      // Parse JSON from response
      let rerankedResults: RerankedResult[] = []
      try {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          rerankedResults = JSON.parse(jsonMatch[0])
        } else {
          rerankedResults = JSON.parse(aiResponse)
        }
      } catch (parseError) {
        logger.warn('[rerank] Failed to parse AI response, using original order', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        })
        return candidates.map((c, idx) => ({
          id: c.id,
          score: c.score,
          rank: idx + 1,
        }))
      }

      // Validate and normalize results
      const validResults: RerankedResult[] = []
      const seenIds = new Set<string>()

      for (const result of rerankedResults) {
        if (!result.id || seenIds.has(result.id)) continue
        if (!candidates.some(c => c.id === result.id)) continue

        seenIds.add(result.id)
        validResults.push({
          id: result.id,
          score: typeof result.score === 'number' ? Math.max(0, Math.min(1, result.score)) : 0.5,
          rank: typeof result.rank === 'number' ? result.rank : validResults.length + 1,
          reasoning: typeof result.reasoning === 'string' ? result.reasoning : undefined,
        })
      }

      // Add any missing candidates (fallback to original order)
      for (const candidate of candidates) {
        if (!seenIds.has(candidate.id)) {
          validResults.push({
            id: candidate.id,
            score: candidate.score,
            rank: validResults.length + 1,
          })
        }
      }

      // Sort by rank
      validResults.sort((a, b) => a.rank - b.rank)

      // Cache the results
      try {
        await redis.setex(cacheKey, RERANK_CACHE_TTL, JSON.stringify(validResults))
        logger.log('[rerank] Results cached', {
          query: query.substring(0, 50),
          resultCount: validResults.length,
        })
      } catch (cacheError) {
        logger.warn('[rerank] Failed to cache results', {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        })
      }

      return validResults
    } catch (error) {
      logger.error('[rerank] Error reranking memories:', error)
      // Fallback to original order
      return candidates.map((c, idx) => ({
        id: c.id,
        score: c.score,
        rank: idx + 1,
      }))
    }
  }

  /**
   * Clear rerank cache for a specific query pattern
   */
  async clearRerankCache(queryPattern?: string): Promise<void> {
    try {
      const redis = getRedisClient()
      if (queryPattern) {
        const pattern = `${RERANK_CACHE_PREFIX}*${queryPattern}*`
        // Note: Redis SCAN would be needed for pattern matching in production
        // For now, we'll just log
        logger.log('[rerank] Cache clear requested', { pattern })
      } else {
        // Clear all rerank cache
        const keys = await redis.keys(`${RERANK_CACHE_PREFIX}*`)
        if (keys.length > 0) {
          await redis.del(...keys)
          logger.log('[rerank] Cache cleared', { keyCount: keys.length })
        }
      }
    } catch (error) {
      logger.error('[rerank] Error clearing cache:', error)
    }
  }
}

export const rerankingService = new RerankingService()
