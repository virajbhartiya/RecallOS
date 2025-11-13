import crypto from 'crypto'
import { MemoryType } from '@prisma/client'
import { prisma } from '../lib/prisma.lib'
import { aiProvider } from './ai-provider.service'
import { setSearchJobResult } from './search-job.service'
import { qdrantClient, COLLECTION_NAME, ensureCollection } from '../lib/qdrant.lib'
import { profileUpdateService } from './profile-update.service'
import { logger } from '../utils/logger.util'
import { getRedisClient } from '../lib/redis.lib'
import { GEMINI_EMBED_MODEL } from './gemini.service'
import {
  getRetrievalPolicy,
  applyPolicyScore,
  filterMemoriesByPolicy,
  type RetrievalPolicyName,
} from './retrieval-policy.service'
import { buildContextFromResults, type ContextBlock } from './context-builder.service'

type SearchResult = {
  memory_id: string
  title: string | null
  summary: string | null
  url: string | null
  timestamp: number
  related_memories: string[]
  score: number
  memory_type: MemoryType | null
  importance_score?: number | null
  source?: string | null
}

function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/[?!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .filter(token => !STOP_WORDS.has(token))
}

type QueryAnalysis = {
  queryType: 'specific' | 'general' | 'temporal' | 'exploratory'
  specificity: number // 0-1, higher = more specific
  temporalIndicators: boolean
  keywordDensity: number // 0-1, higher = more keywords
  estimatedMemoryAge: 'recent' | 'medium' | 'old' | 'any'
  requiresDeepSearch: boolean
}

function analyzeQuery(query: string, userMemoryCount: number): QueryAnalysis {
  const normalized = query.toLowerCase()
  const tokens = tokenizeQuery(query)
  const queryLength = query.length
  const tokenCount = tokens.length

  // Detect temporal indicators
  const temporalKeywords = [
    'yesterday',
    'today',
    'last week',
    'last month',
    'last year',
    'years ago',
    'recent',
    'old',
    'ancient',
    'when',
    'ago',
  ]
  const hasTemporalIndicators = temporalKeywords.some(keyword => normalized.includes(keyword))

  // Detect specific vs general queries
  const specificIndicators = [
    'what',
    'who',
    'where',
    'when',
    'how',
    'why',
    'which',
    'name',
    'list',
    'show',
  ]
  const hasSpecificIndicators = specificIndicators.some(indicator => normalized.includes(indicator))

  // Calculate specificity based on query characteristics
  const specificity = Math.min(
    1,
    (hasSpecificIndicators ? 0.3 : 0) +
      (tokenCount > 5 ? 0.2 : tokenCount > 3 ? 0.1 : 0) +
      (queryLength > 50 ? 0.2 : queryLength > 20 ? 0.1 : 0) +
      (tokens.length / Math.max(1, normalized.split(/\s+/).length)) * 0.3
  )

  // Determine query type
  let queryType: QueryAnalysis['queryType'] = 'general'
  if (hasTemporalIndicators) {
    queryType = 'temporal'
  } else if (specificity > 0.6) {
    queryType = 'specific'
  } else if (specificity < 0.3) {
    queryType = 'exploratory'
  }

  // Estimate memory age based on query
  let estimatedMemoryAge: QueryAnalysis['estimatedMemoryAge'] = 'any'
  if (
    normalized.includes('years ago') ||
    normalized.includes('old') ||
    normalized.includes('ancient')
  ) {
    estimatedMemoryAge = 'old'
  } else if (
    normalized.includes('recent') ||
    normalized.includes('last week') ||
    normalized.includes('last month')
  ) {
    estimatedMemoryAge = 'recent'
  } else if (normalized.includes('last year')) {
    estimatedMemoryAge = 'medium'
  }

  // Determine if deep search is needed
  const requiresDeepSearch =
    estimatedMemoryAge === 'old' ||
    specificity < 0.4 ||
    userMemoryCount > 1000 ||
    queryType === 'exploratory'

  const keywordDensity = tokenCount / Math.max(1, normalized.split(/\s+/).length)

  return {
    queryType,
    specificity,
    temporalIndicators: hasTemporalIndicators,
    keywordDensity,
    estimatedMemoryAge,
    requiresDeepSearch,
  }
}

type DynamicSearchParams = {
  qdrantLimit: number
  semanticThreshold: number
  keywordThreshold: number
  coverageThreshold: number
  minScore: number
  searchStrategy: 'narrow' | 'balanced' | 'broad'
  maxResults: number
}

function calculateDynamicSearchParams(
  analysis: QueryAnalysis,
  userMemoryCount: number,
  requestedLimit?: number
): DynamicSearchParams {
  const baseLimit = requestedLimit || Number(process.env.SEARCH_TOP_K || 50)
  const maxLimit = Number(process.env.SEARCH_MAX_LIMIT || 1000)
  const effectiveLimit = Math.min(baseLimit, maxLimit)

  // Determine search strategy
  let searchStrategy: 'narrow' | 'balanced' | 'broad' = 'balanced'
  let qdrantLimit: number
  let semanticThreshold: number
  let keywordThreshold: number
  let coverageThreshold: number
  let minScore: number

  if (analysis.requiresDeepSearch || analysis.estimatedMemoryAge === 'old') {
    // Broad search for old memories or exploratory queries
    searchStrategy = 'broad'
    qdrantLimit = Math.min(effectiveLimit * 10, Math.max(500, userMemoryCount * 0.5))
    semanticThreshold = 0.1
    keywordThreshold = 0.2
    coverageThreshold = 0.3
    minScore = 0.1
  } else if (analysis.specificity > 0.7) {
    // Narrow search for very specific queries
    searchStrategy = 'narrow'
    qdrantLimit = effectiveLimit * 2
    semanticThreshold = 0.2
    keywordThreshold = 0.4
    coverageThreshold = 0.6
    minScore = 0.2
  } else {
    // Balanced search for normal queries
    searchStrategy = 'balanced'
    qdrantLimit = effectiveLimit * 3
    semanticThreshold = 0.15
    keywordThreshold = 0.3
    coverageThreshold = 0.5
    minScore = 0.15
  }

  // Adjust based on user memory count
  if (userMemoryCount > 5000) {
    qdrantLimit = Math.min(qdrantLimit * 1.5, userMemoryCount * 0.3)
  } else if (userMemoryCount < 100) {
    qdrantLimit = Math.min(qdrantLimit, userMemoryCount)
  }

  // Adjust thresholds based on query characteristics
  if (analysis.keywordDensity > 0.7) {
    // High keyword density - favor keyword matching
    keywordThreshold *= 0.8
    semanticThreshold *= 1.1
  } else if (analysis.keywordDensity < 0.3) {
    // Low keyword density - favor semantic matching
    semanticThreshold *= 0.8
    keywordThreshold *= 1.2
  }

  return {
    qdrantLimit: Math.max(effectiveLimit, Math.min(qdrantLimit, 10000)),
    semanticThreshold,
    keywordThreshold,
    coverageThreshold,
    minScore,
    searchStrategy,
    maxResults: effectiveLimit,
  }
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'the',
  'this',
  'but',
  'they',
  'have',
  'had',
  'what',
  'when',
  'where',
  'who',
  'which',
  'why',
  'how',
])

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

const SEARCH_CACHE_PREFIX = 'search_cache:'
const SEARCH_CACHE_TTL = 5 * 60 // 5 minutes in seconds
const MS_IN_DAY = 1000 * 60 * 60 * 24

function getCacheKey(userId: string, query: string, limit: number): string {
  const normalized = normalizeText(query)
  const hash = sha256Hex(`${userId}:${normalized}:${limit}`)
  return `${SEARCH_CACHE_PREFIX}${hash}`
}

function extractCitationOrder(text?: string): number[] {
  if (!text) return []
  const order: number[] = []
  const seen = new Set<number>()
  const re = /\[([\d,\s]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const numbers = m[1]
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n))
    for (const n of numbers) {
      if (!seen.has(n)) {
        seen.add(n)
        order.push(n)
      }
    }
  }
  return order
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(v => {
      clearTimeout(t)
      resolve(v)
    }).catch(e => {
      clearTimeout(t)
      reject(e)
    })
  })
}

export async function searchMemories(params: {
  userId: string
  query: string
  limit?: number
  enableReasoning?: boolean
  contextOnly?: boolean
  jobId?: string
  policy?: RetrievalPolicyName
}): Promise<{
  query: string
  results: SearchResult[]
  answer?: string
  citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>
  context?: string
  contextBlocks?: ContextBlock[]
  policy: RetrievalPolicyName
}> {
  const {
    userId,
    query,
    limit,
    enableReasoning = process.env.SEARCH_ENABLE_REASONING !== 'false',
    contextOnly = false,
    jobId,
    policy,
  } = params

  const normalized = normalizeText(query)

  const retrievalPolicy = getRetrievalPolicy(policy)
  const requestedLimit =
    typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : undefined
  const effectiveLimit = requestedLimit
    ? Math.min(requestedLimit, retrievalPolicy.maxResults)
    : retrievalPolicy.maxResults

  // Get user to determine memory count for dynamic search
  const user = await prisma.user.findFirst({
    where: { OR: [{ external_id: userId }, { id: userId }] },
  })
  if (!user) {
    return {
      query: normalized,
      results: [],
      answer: undefined,
      citations: undefined,
      context: undefined,
      contextBlocks: [],
      policy: retrievalPolicy.name,
    }
  }

  const userMemories = await prisma.memory.findMany({
    where: { user_id: user.id },
    select: { id: true },
  })

  const userMemoryIds = userMemories.map(m => m.id)

  if (userMemoryIds.length === 0) {
    logger.log('[search] no memories found for user', { ts: new Date().toISOString(), userId })
    return {
      query: normalized,
      results: [],
      answer: undefined,
      context: undefined,
      contextBlocks: [],
      policy: retrievalPolicy.name,
    }
  }

  // Analyze query to determine dynamic search parameters
  const queryAnalysis = analyzeQuery(normalized, userMemoryIds.length)
  const searchParams = calculateDynamicSearchParams(
    queryAnalysis,
    userMemoryIds.length,
    effectiveLimit
  )

  logger.log('[search] processing started', {
    ts: new Date().toISOString(),
    userId,
    query: query.slice(0, 100),
    limit: searchParams.maxResults,
    enableReasoning,
    contextOnly,
    jobId,
    searchStrategy: searchParams.searchStrategy,
  })

  // Skip caching for contextOnly or jobId requests
  const shouldCache = !contextOnly && !jobId

  if (shouldCache) {
    try {
      const cacheKey = getCacheKey(userId, query, searchParams.maxResults)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)

      if (cached) {
        logger.log('[search] cache hit', {
          ts: new Date().toISOString(),
          userId,
          query: query.slice(0, 100),
        })
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('[search] cache read error, continuing without cache', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (!aiProvider.isInitialized) {
    logger.error('AI Provider not initialized. Check GEMINI_API_KEY or AI_PROVIDER configuration.')
    throw new Error('AI Provider not configured. Set GEMINI_API_KEY or configure AI_PROVIDER.')
  }

  let embedding: number[]
  try {
    logger.log('[search] generating embedding', {
      ts: new Date().toISOString(),
      userId,
      queryLength: normalized.length,
    })
    const embeddingResult = await withTimeout(aiProvider.generateEmbedding(normalized), 30000) // 30 seconds
    if (
      typeof embeddingResult === 'object' &&
      embeddingResult !== null &&
      'embedding' in embeddingResult
    ) {
      embedding = (embeddingResult as { embedding: number[] }).embedding
    } else {
      embedding = embeddingResult as number[]
    }
    logger.log('[search] embedding generated', {
      ts: new Date().toISOString(),
      userId,
      embeddingLength: embedding.length,
    })
  } catch {
    try {
      embedding = aiProvider.generateFallbackEmbedding(normalized)
    } catch {
      try {
        if (jobId) {
          await setSearchJobResult(jobId, { status: 'failed' })
        }
      } catch {
        // Error updating search job status
      }
      return {
        query: normalized,
        results: [],
        answer: undefined,
        citations: undefined,
        context: undefined,
        contextBlocks: [],
        policy: retrievalPolicy.name,
      }
    }
  }
  const salt = process.env.SEARCH_EMBED_SALT || 'cognia'
  const embeddingHash = sha256Hex(
    JSON.stringify({ model: GEMINI_EMBED_MODEL, values: embedding.slice(0, 64), salt })
  )

  await ensureCollection()

  logger.log('[search] query analysis', {
    ts: new Date().toISOString(),
    userId,
    queryAnalysis,
    searchParams,
    memoryCount: userMemoryIds.length,
  })

  // Multi-stage search: start broad, narrow if needed
  let qdrantSearchResult: Array<{ score?: number; payload?: { memory_id?: string } }> = []

  if (searchParams.searchStrategy === 'broad') {
    // Broad search: get more results with lower threshold
    logger.log('[search] performing broad search', {
      ts: new Date().toISOString(),
      userId,
      qdrantLimit: searchParams.qdrantLimit,
    })
    qdrantSearchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      filter: {
        must: [{ key: 'memory_id', match: { any: userMemoryIds } }],
      },
      limit: searchParams.qdrantLimit,
      with_payload: true,
      score_threshold: 0.1,
    })

    // If we got too many low-quality results, do a second pass with higher threshold
    if (qdrantSearchResult.length > searchParams.maxResults * 2) {
      const highQualityResults = qdrantSearchResult.filter(r => (r.score || 0) > 0.3)
      if (highQualityResults.length >= searchParams.maxResults) {
        qdrantSearchResult = highQualityResults
        logger.log('[search] narrowed to high-quality results', {
          ts: new Date().toISOString(),
          userId,
          filteredCount: qdrantSearchResult.length,
        })
      }
    }
  } else {
    // Standard search
    logger.log('[search] searching qdrant', {
      ts: new Date().toISOString(),
      userId,
      memoryCount: userMemoryIds.length,
      qdrantLimit: searchParams.qdrantLimit,
      strategy: searchParams.searchStrategy,
    })
    qdrantSearchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      filter: {
        must: [{ key: 'memory_id', match: { any: userMemoryIds } }],
      },
      limit: searchParams.qdrantLimit,
      with_payload: true,
    })
  }
  logger.log('[search] qdrant search completed', {
    ts: new Date().toISOString(),
    userId,
    resultCount: qdrantSearchResult.length,
  })

  if (!qdrantSearchResult || qdrantSearchResult.length === 0) {
    return {
      query: normalized,
      results: [],
      answer: undefined,
      context: undefined,
      contextBlocks: [],
      policy: retrievalPolicy.name,
    }
  }

  const searchMemoryIds = qdrantSearchResult
    .map(result => result.payload?.memory_id as string)
    .filter((id): id is string => !!id)

  if (searchMemoryIds.length === 0) {
    return {
      query: normalized,
      results: [],
      answer: undefined,
      context: undefined,
      contextBlocks: [],
      policy: retrievalPolicy.name,
    }
  }

  const memories = await prisma.memory.findMany({
    where: { id: { in: searchMemoryIds } },
  })

  const memoryMap = new Map(memories.map(m => [m.id, m]))
  const scoreMap = new Map<string, number>()

  qdrantSearchResult.forEach(result => {
    const memoryId = result.payload?.memory_id as string
    if (memoryId) {
      const existingScore = scoreMap.get(memoryId)
      const newScore = result.score || 0
      if (!existingScore || newScore > existingScore) {
        scoreMap.set(memoryId, newScore)
      }
    }
  })

  const queryTokens = tokenizeQuery(normalized)

  const rows = Array.from(scoreMap.entries())
    .map(([memoryId, semanticScore]) => {
      const memory = memoryMap.get(memoryId)
      if (!memory) return null
      return {
        id: memory.id,
        title: memory.title,
        summary: memory.summary,
        url: memory.url,
        timestamp: memory.timestamp,
        content: memory.content,
        score: semanticScore,
        memory_type: memory.memory_type,
        importance_score: memory.importance_score,
        source: memory.source,
        created_at: memory.created_at,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  // Calculate hybrid scores combining semantic and keyword matching
  const scoredRows = rows.map(row => {
    const title = (row.title || '').toLowerCase()
    const summary = (row.summary || '').toLowerCase()
    const content = (row.content || '').toLowerCase()

    // Calculate keyword match score using token-based matching
    let keywordScore = 0
    let matchedTokens = 0

    for (const token of queryTokens) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, 'gi')

      // Check title (highest weight)
      if (tokenRegex.test(title)) {
        keywordScore += 0.5
        matchedTokens++
      }

      // Check summary (medium weight)
      if (tokenRegex.test(summary)) {
        keywordScore += 0.3
        matchedTokens++
      }

      // Check content (lower weight)
      if (tokenRegex.test(content)) {
        keywordScore += 0.2
        matchedTokens++
      }
    }

    // Normalize keyword score
    if (queryTokens.length > 0) {
      keywordScore = keywordScore / queryTokens.length
    }

    // Calculate token coverage ratio
    const coverageRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0

    // Combine semantic and keyword scores
    // Weight: 60% semantic, 40% keyword
    const semanticScore = row.score
    const hybridScore = semanticScore * 0.6 + keywordScore * 0.4

    // Boost score if query coverage is high
    const boostedScore = hybridScore * (1 + coverageRatio * 0.3)

    return {
      ...row,
      semantic_score: semanticScore,
      keyword_score: keywordScore,
      coverage_ratio: coverageRatio,
      final_score: boostedScore,
    }
  })

  // Apply dynamic thresholds based on query analysis
  const thresholdFilteredRows = scoredRows
    .filter(row => {
      // Dynamic threshold: keep results that meet any criteria
      const passesSemantic = row.semantic_score >= searchParams.semanticThreshold
      const passesKeyword = row.keyword_score >= searchParams.keywordThreshold
      const passesCoverage = row.coverage_ratio >= searchParams.coverageThreshold
      const passesMinScore = row.final_score >= searchParams.minScore

      return (passesSemantic || passesKeyword || passesCoverage) && passesMinScore
    })
    .sort((a, b) => {
      // Multi-factor sorting: score first, then recency for old memories
      if (Math.abs(a.final_score - b.final_score) < 0.01) {
        // If scores are very close, prefer more recent for old memory searches
        if (queryAnalysis.estimatedMemoryAge === 'old') {
          return Number(b.timestamp) - Number(a.timestamp)
        }
      }
      return b.final_score - a.final_score
    })
    .slice(0, searchParams.maxResults)

  const policyScoredRows = filterMemoriesByPolicy(
    thresholdFilteredRows.map(row => {
      const rowDate =
        row.created_at instanceof Date
          ? row.created_at
          : row.timestamp
            ? new Date(Number(row.timestamp) * 1000)
            : new Date()
      const recencyDays = (Date.now() - rowDate.getTime()) / MS_IN_DAY
      const policyScore = applyPolicyScore(
        {
          semanticScore: row.semantic_score,
          keywordScore: row.keyword_score,
          importanceScore: row.importance_score ?? 0,
          recencyDays,
        },
        retrievalPolicy
      )
      return {
        ...row,
        final_score: policyScore,
      }
    }),
    retrievalPolicy
  )
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, retrievalPolicy.maxResults)

  logger.log('[search] results filtered and sorted', {
    ts: new Date().toISOString(),
    userId,
    filteredCount: policyScoredRows.length,
    totalScored: scoredRows.length,
    searchStrategy: searchParams.searchStrategy,
    thresholds: {
      semantic: searchParams.semanticThreshold,
      keyword: searchParams.keywordThreshold,
      coverage: searchParams.coverageThreshold,
      minScore: searchParams.minScore,
    },
  })

  const memoryIds = policyScoredRows.map(r => r.id)

  // Fast-path: if no matches, persist minimal query event and return immediately
  if (policyScoredRows.length === 0) {
    try {
      await prisma.queryEvent.create({
        data: {
          user_id: userId,
          query: normalized,
          embedding_hash: embeddingHash,
        },
      })
    } catch {
      // Ignore database errors
    }
    return {
      query: normalized,
      results: [],
      answer: undefined,
      context: undefined,
      contextBlocks: [],
      policy: retrievalPolicy.name,
    }
  }

  // Fetch related edges for mesh context
  const relations = memoryIds.length
    ? await prisma.memoryRelation.findMany({
        where: { OR: memoryIds.map(id => ({ memory_id: id })) },
        select: { memory_id: true, related_memory_id: true },
      })
    : []

  const relatedById = new Map<string, string[]>()
  for (const id of memoryIds) relatedById.set(id, [])
  for (const rel of relations) {
    const arr = relatedById.get(rel.memory_id)
    if (arr) arr.push(rel.related_memory_id)
  }

  let answer: string | undefined
  let citations: Array<{
    label: number
    memory_id: string
    title: string | null
    url: string | null
  }> = []

  const profileContext = await profileUpdateService.getProfileContext(userId)
  const contextArtifacts = buildContextFromResults({
    items: policyScoredRows.map(row => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: row.url,
      memory_type: row.memory_type ?? null,
      importance_score: row.importance_score,
      created_at:
        row.created_at instanceof Date
          ? row.created_at
          : row.timestamp
            ? new Date(Number(row.timestamp) * 1000)
            : undefined,
    })),
    policy: retrievalPolicy,
    profileText: profileContext,
  })

  let context: string | undefined = contextArtifacts.text
  const contextBlocks = contextArtifacts.blocks

  if (!contextOnly) {
    try {
      const bullets = policyScoredRows
        .map((r, i) => {
          const date = r.timestamp
            ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10)
            : ''
          return `- [${i + 1}] ${date} ${r.summary || ''}`.trim()
        })
        .join('\n')

      const profileSection = profileContext ? `\n\nUser Profile Context:\n${profileContext}\n` : ''

      const ansPrompt = `You are Cognia. Answer the user's query using the evidence notes, and insert bracketed numeric citations wherever you use a note.

Rules:
- Use inline numeric citations like [1], [2].
- Keep it concise (2-4 sentences).
- Plain text only.
- Consider the user's profile context when answering to provide more relevant and personalized responses.

CRITICAL: Return ONLY plain text content. Do not use any markdown formatting including:
- No asterisks (*) for bold or italic text
- No underscores (_) for emphasis
- No backticks for code blocks
- No hash symbols (#) for headers
- No brackets [] or parentheses () for links (except numeric citations [1], [2], etc.)
- No special characters for formatting
- No bullet points with dashes or asterisks
- No numbered lists with special formatting

Return clean, readable plain text only.

User query: "${normalized}"${profileSection}
Evidence notes (ordered by relevance):
${bullets}`
      logger.log('[search] generating answer', {
        ts: new Date().toISOString(),
        userId,
        memoryCount: policyScoredRows.length,
      })
      const answerResult = await withTimeout(aiProvider.generateContent(ansPrompt, true), 300000)
      if (typeof answerResult === 'string') {
        answer = answerResult
      } else {
        const result = answerResult as { text?: string }
        answer = result.text || answerResult
      }
      logger.log('[search] answer generated', {
        ts: new Date().toISOString(),
        userId,
        answerLength: answer?.length,
      })
      const allCitations = policyScoredRows.map((r, i) => ({
        label: i + 1,
        memory_id: r.id,
        title: r.title,
        url: r.url,
      }))
      const order = extractCitationOrder(answer)
      citations =
        order.length > 0
          ? order
              .map(n => allCitations.find(c => c.label === n))
              .filter(
                (
                  c
                ): c is {
                  label: number
                  memory_id: string
                  title: string | null
                  url: string | null
                } => Boolean(c)
              )
          : []
    } catch (error) {
      logger.error('[search] error generating answer, using fallback', {
        ts: new Date().toISOString(),
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      answer = `Found ${policyScoredRows.length} relevant memories about "${normalized}". ${policyScoredRows
        .slice(0, 3)
        .map((r, i) => `[${i + 1}] ${r.title || 'Untitled'}`)
        .join(', ')}${policyScoredRows.length > 3 ? ' and more.' : '.'}`
      const fallbackCitations = policyScoredRows.map((r, i) => ({
        label: i + 1,
        memory_id: r.id,
        title: r.title,
        url: r.url,
      }))
      const order = extractCitationOrder(answer)
      citations = order
        .map(n => fallbackCitations.find(c => c.label === n))
        .filter(
          (
            c
          ): c is {
            label: number
            memory_id: string
            title: string | null
            url: string | null
          } => Boolean(c)
        )
    }
  }

  const created = await prisma.queryEvent.create({
    data: {
      user_id: userId,
      query: normalized,
      embedding_hash: embeddingHash,
    },
  })

  if (policyScoredRows.length) {
    await prisma.queryRelatedMemory.createMany({
      data: policyScoredRows.map((r, idx) => ({
        query_event_id: created.id,
        memory_id: r.id,
        rank: idx + 1,
        score: r.score,
      })),
      skipDuplicates: true,
    })
  }

  const results: SearchResult[] = policyScoredRows.map(r => ({
    memory_id: r.id,
    title: r.title,
    summary: r.summary,
    url: r.url,
    timestamp: Number(r.timestamp),
    related_memories: relatedById.get(r.id) || [],
    score: r.final_score,
    memory_type: r.memory_type ?? null,
    importance_score: r.importance_score,
    source: r.source,
  }))

  // If no jobId, update job synchronously; if jobId exists, it's already updated asynchronously above
  if (!jobId && answer) {
    // No job means synchronous execution, answer already generated
  } else if (jobId && !answer) {
    // Job exists but answer not generated yet - update job with initial status
    try {
      await setSearchJobResult(jobId, {
        status: 'pending',
        results: results.slice(0, 10).map(r => ({
          memory_id: r.memory_id,
          title: r.title,
          url: r.url,
          score: r.score,
        })),
      })
    } catch (error) {
      logger.error('Error updating search job initial status:', error)
    }
  }

  logger.log('[search] processing completed', {
    ts: new Date().toISOString(),
    userId,
    resultCount: results.length,
    hasAnswer: !!answer,
    hasCitations: !!citations && citations.length > 0,
    jobId,
  })

  const searchResult = {
    query: normalized,
    results,
    answer,
    citations,
    context,
    contextBlocks,
    policy: retrievalPolicy.name,
  }

  // Cache the results if caching is enabled
  if (shouldCache) {
    try {
      const cacheKey = getCacheKey(userId, query, searchParams.maxResults)
      const client = getRedisClient()
      await client.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(searchResult))
      logger.log('[search] cache write', {
        ts: new Date().toISOString(),
        userId,
        query: query.slice(0, 100),
      })
    } catch (error) {
      logger.warn('[search] cache write error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return searchResult
}
