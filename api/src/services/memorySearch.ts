import crypto from 'crypto';
import Redis from 'ioredis';
import { prisma } from '../lib/prisma';
import { aiProvider } from './aiProvider';
import { setSearchJobResult } from './searchJob';
import { qdrantClient, COLLECTION_NAME, ensureCollection } from '../lib/qdrant';
import { profileUpdateService } from './profileUpdate';
import { logger } from '../utils/logger';
import { getRedisConnection } from '../utils/env';

type SearchResult = {
  memory_id: string;
  title: string | null;
  summary: string | null;
  url: string | null;
  timestamp: number;
  related_memories: string[];
  score: number;
};

function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/[?!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .filter(token => !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
]);

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const SEARCH_CACHE_PREFIX = 'search_cache:';
const SEARCH_CACHE_TTL = 5 * 60; // 5 minutes in seconds

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const connection = getRedisConnection();
    if ('url' in connection) {
      redisClient = new Redis(connection.url);
    } else {
      redisClient = new Redis({
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
      });
    }
  }
  return redisClient;
}

function getCacheKey(userId: string, query: string, limit: number): string {
  const normalized = normalizeText(query);
  const hash = sha256Hex(`${userId}:${normalized}:${limit}`);
  return `${SEARCH_CACHE_PREFIX}${hash}`;
}


export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

export async function searchMemories(params: {
  userId: string;
  query: string;
  limit?: number;
  enableReasoning?: boolean;
  contextOnly?: boolean;
  jobId?: string;
}): Promise<{ query: string; results: SearchResult[]; answer?: string; citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>; context?: string }>{
  const { userId, query, limit = Number(process.env.SEARCH_TOP_K || 10), enableReasoning = process.env.SEARCH_ENABLE_REASONING !== 'false', contextOnly = false, jobId } = params;
  const searchLimit = Math.min(Number(limit), 100);

  logger.log('[search] processing started', {
    ts: new Date().toISOString(),
    userId,
    query: query.slice(0, 100),
    limit: searchLimit,
    enableReasoning,
    contextOnly,
    jobId,
  });

  // Skip caching for contextOnly or jobId requests
  const shouldCache = !contextOnly && !jobId;
  
  if (shouldCache) {
    try {
      const cacheKey = getCacheKey(userId, query, searchLimit);
      const client = getRedisClient();
      const cached = await client.get(cacheKey);
      
      if (cached) {
        logger.log('[search] cache hit', { ts: new Date().toISOString(), userId, query: query.slice(0, 100) });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('[search] cache read error, continuing without cache', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (!aiProvider.isInitialized) {
    logger.error('AI Provider not initialized. Check GEMINI_API_KEY or AI_PROVIDER configuration.');
    throw new Error('AI Provider not configured. Set GEMINI_API_KEY or configure AI_PROVIDER.');
  }

  const normalized = normalizeText(query);

  const user = await prisma.user.findFirst({ where: { OR: [ { external_id: userId } as any, { id: userId } as any ] } as any });
  if (!user) {
    return { query: normalized, results: [] };
  }

  let embedding: number[];
  try {
    logger.log('[search] generating embedding', { ts: new Date().toISOString(), userId, queryLength: normalized.length });
    const embeddingResult = await withTimeout(aiProvider.generateEmbedding(normalized), 30000); // 30 seconds
    embedding = typeof embeddingResult === 'object' && 'embedding' in embeddingResult ? (embeddingResult as any).embedding : (embeddingResult as number[]);
    logger.log('[search] embedding generated', { ts: new Date().toISOString(), userId, embeddingLength: embedding.length });
  } catch (error) {
    try {
      embedding = aiProvider.generateFallbackEmbedding(normalized);
    } catch (fallbackError) {
      try {
        if (jobId) {
          await setSearchJobResult(jobId, { status: 'failed' });
        }
      } catch (jobError) {
        // Error updating search job status
      }
      return { query: normalized, results: [], answer: undefined };
    }
  }
  const salt = process.env.SEARCH_EMBED_SALT || 'recallos';
  const embeddingHash = sha256Hex(JSON.stringify({ model: 'text-embedding-004', values: embedding.slice(0, 64), salt }));

  await ensureCollection();

  const userMemories = await prisma.memory.findMany({
    where: { user_id: user.id },
    select: { id: true },
  });

  const userMemoryIds = userMemories.map(m => m.id);

  if (userMemoryIds.length === 0) {
    logger.log('[search] no memories found for user', { ts: new Date().toISOString(), userId });
      return { query: normalized, results: [], answer: undefined, context: undefined };
  }

  logger.log('[search] searching qdrant', { ts: new Date().toISOString(), userId, memoryCount: userMemoryIds.length, searchLimit: searchLimit * 3 });
  const searchResult = await qdrantClient.search(COLLECTION_NAME, {
    vector: embedding,
    filter: {
      must: [
        { key: 'memory_id', match: { any: userMemoryIds } },
      ],
    },
    limit: searchLimit * 3,
    with_payload: true,
  });
  logger.log('[search] qdrant search completed', { ts: new Date().toISOString(), userId, resultCount: searchResult.length });

  if (!searchResult || searchResult.length === 0) {
      return { query: normalized, results: [], answer: undefined, context: undefined };
  }

  const searchMemoryIds = searchResult
    .map(result => result.payload?.memory_id as string)
    .filter((id): id is string => !!id);

  if (searchMemoryIds.length === 0) {
      return { query: normalized, results: [], answer: undefined, context: undefined };
  }

  const memories = await prisma.memory.findMany({
    where: { id: { in: searchMemoryIds } },
  });

  const memoryMap = new Map(memories.map(m => [m.id, m]));
  const scoreMap = new Map<string, number>();

  searchResult.forEach((result) => {
    const memoryId = result.payload?.memory_id as string;
    if (memoryId) {
      const existingScore = scoreMap.get(memoryId);
      const newScore = result.score || 0;
      if (!existingScore || newScore > existingScore) {
        scoreMap.set(memoryId, newScore);
      }
    }
  });

  const queryTokens = tokenizeQuery(normalized);
  
  const rows = Array.from(scoreMap.entries()).map(([memoryId, semanticScore]) => {
    const memory = memoryMap.get(memoryId);
    if (!memory) return null;
    return {
      id: memory.id,
      title: memory.title,
      summary: memory.summary,
      url: memory.url,
      timestamp: memory.timestamp,
      content: memory.content,
      score: semanticScore,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  
  // Calculate hybrid scores combining semantic and keyword matching
  const scoredRows = rows.map(row => {
    const title = (row.title || '').toLowerCase();
    const summary = (row.summary || '').toLowerCase();
    const content = (row.content || '').toLowerCase();
    const fullText = `${title} ${summary} ${content}`;
    
    // Calculate keyword match score using token-based matching
    let keywordScore = 0;
    let matchedTokens = 0;
    
    for (const token of queryTokens) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, 'gi');
      
      // Check title (highest weight)
      if (tokenRegex.test(title)) {
        keywordScore += 0.5;
        matchedTokens++;
      }
      
      // Check summary (medium weight)
      if (tokenRegex.test(summary)) {
        keywordScore += 0.3;
        matchedTokens++;
      }
      
      // Check content (lower weight)
      if (tokenRegex.test(content)) {
        keywordScore += 0.2;
        matchedTokens++;
      }
    }
    
    // Normalize keyword score
    if (queryTokens.length > 0) {
      keywordScore = keywordScore / queryTokens.length;
    }
    
    // Calculate token coverage ratio
    const coverageRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
    
    // Combine semantic and keyword scores
    // Weight: 60% semantic, 40% keyword
    const semanticScore = row.score;
    const hybridScore = (semanticScore * 0.6) + (keywordScore * 0.4);
    
    // Boost score if query coverage is high
    const boostedScore = hybridScore * (1 + (coverageRatio * 0.3));
    
    return {
      ...row,
      semantic_score: semanticScore,
      keyword_score: keywordScore,
      coverage_ratio: coverageRatio,
      final_score: boostedScore,
    };
  });
  
  // Sort by final score and apply relevance threshold
  const filteredRows = scoredRows
    .filter(row => {
      // Keep results with good semantic score OR good keyword matches
      return row.semantic_score >= 0.15 || row.keyword_score >= 0.3 || row.coverage_ratio >= 0.5;
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, searchLimit);
  
  logger.log('[search] results filtered and sorted', { ts: new Date().toISOString(), userId, filteredCount: filteredRows.length, totalScored: scoredRows.length });
  
  const memoryIds = filteredRows.map(r => r.id);

  // Fast-path: if no matches, persist minimal query event and return immediately
  if (filteredRows.length === 0) {
    try {
      await prisma.queryEvent.create({
        data: {
          user_id: userId,
          query: normalized,
          embedding_hash: embeddingHash,
        } as any,
      });
    } catch {}
      return { query: normalized, results: [], answer: undefined, context: undefined };
  }

  // Fetch related edges for mesh context
  const relations = memoryIds.length
    ? await prisma.memoryRelation.findMany({
        where: { OR: memoryIds.map(id => ({ memory_id: id })) },
        select: { memory_id: true, related_memory_id: true },
      })
    : [];

  const relatedById = new Map<string, string[]>();
  for (const id of memoryIds) relatedById.set(id, []);
  for (const rel of relations) {
    const arr = relatedById.get(rel.memory_id);
    if (arr) arr.push(rel.related_memory_id);
  }


  let answer: string | undefined;
  let citations: Array<{ label: number; memory_id: string; title: string | null; url: string | null }> = [];
  let context: string | undefined;
  
  // Generate context for external AI tools (like ChatGPT)
  if (contextOnly) {
    const profileContext = await profileUpdateService.getProfileContext(userId);
    const profileSection = profileContext 
      ? `\n\nUser Profile Context:\n${profileContext}\n\n`
      : '';
    
    context = profileSection + filteredRows.map((r, i) => {
      const date = r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) : '';
      const title = r.title ? `Title: ${r.title}` : '';
      const url = r.url ? `URL: ${r.url}` : '';
      const summary = r.summary || 'No summary available';
      return `Memory ${i + 1} (${date}):
${title ? title + '\n' : ''}${url ? url + '\n' : ''}Summary: ${summary}`;
    }).join('\n\n');
  } else {
    // Generate AI answer synchronously (no jobId passed, so generate immediately)
    try {
      const bullets = filteredRows.map((r, i) => {
        const date = r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) : '';
        return `- [${i + 1}] ${date} ${r.summary || ''}`.trim();
      }).join('\n');
      
      const profileContext = await profileUpdateService.getProfileContext(userId);
      const profileSection = profileContext 
        ? `\n\nUser Profile Context:\n${profileContext}\n`
        : '';

      const ansPrompt = `You are RecallOS. Answer the user's query using the evidence notes, and insert bracketed numeric citations wherever you use a note.

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
${bullets}`;
      logger.log('[search] generating answer', { ts: new Date().toISOString(), userId, memoryCount: filteredRows.length });
      const answerResult = await withTimeout(aiProvider.generateContent(ansPrompt, true), 300000); // 5 minutes (accounts for queue delays + Gemini 2 min timeout), true = search request (high priority)
      answer = typeof answerResult === 'string' ? answerResult : (answerResult as any).text || answerResult;
      logger.log('[search] answer generated', { ts: new Date().toISOString(), userId, answerLength: answer?.length });
      // Build citations map aligned with [n]
      const allCitations = filteredRows.map((r, i) => ({ label: i + 1, memory_id: r.id, title: r.title, url: r.url }));
      // Keep only citations actually referenced in the answer/meta text, preserve first-seen order
      const pickOrderFrom = (text: string | undefined) => {
        if (!text) return [] as number[];
        const order: number[] = [];
        const seen = new Set<number>();
        const re = /\[(\d+)\]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const n = Number(m[1]);
          if (!seen.has(n)) { seen.add(n); order.push(n); }
        }
        return order;
      };
      const order = pickOrderFrom(answer);
      citations = order.length
        ? order.map(n => allCitations.find(c => c.label === n)).filter((c): c is { label: number; memory_id: string; title: string | null; url: string | null } => Boolean(c))
        : [];
    } catch (error) {
      logger.error('[search] error generating answer, using fallback', { 
        ts: new Date().toISOString(), 
        userId, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Fallback: create a simple summary if AI generation fails
      answer = `Found ${filteredRows.length} relevant memories about "${normalized}". ${filteredRows.slice(0, 3).map((r, i) => `[${i + 1}] ${r.title || 'Untitled'}`).join(', ')}${filteredRows.length > 3 ? ' and more.' : '.'}`;
      // Ensure citations are populated even when using the fallback answer
      const allCitations = filteredRows.map((r, i) => ({ label: i + 1, memory_id: r.id, title: r.title, url: r.url }));
      const re = /\[(\d+)\]/g;
      const seen = new Set<number>();
      const order: number[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(answer))) {
        const n = Number(m[1]);
        if (!seen.has(n)) { seen.add(n); order.push(n); }
      }
      citations = order.map(n => allCitations.find(c => c.label === n)).filter((c): c is { label: number; memory_id: string; title: string | null; url: string | null } => Boolean(c));
    }
  }

  const created = await prisma.queryEvent.create({
    data: {
      user_id: userId,
      query: normalized,
      embedding_hash: embeddingHash,
    } as any,
  });

  if (filteredRows.length) {
    await prisma.queryRelatedMemory.createMany({
      data: filteredRows.map((r, idx) => ({ query_event_id: created.id, memory_id: r.id, rank: idx + 1, score: r.score })) as any,
      skipDuplicates: true,
    });
  }


  const results: SearchResult[] = filteredRows.map(r => ({
    memory_id: r.id,
    title: r.title,
    summary: r.summary,
    url: r.url,
    timestamp: Number(r.timestamp),
    related_memories: relatedById.get(r.id) || [],
    score: r.final_score,
  }));

  
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
          score: r.score
        }))
      });
    } catch (error) {
      logger.error('Error updating search job initial status:', error);
    }
  }
  
  logger.log('[search] processing completed', {
    ts: new Date().toISOString(),
    userId,
    resultCount: results.length,
    hasAnswer: !!answer,
    hasCitations: !!citations && citations.length > 0,
    jobId,
  });
  
  const searchResult = { query: normalized, results, answer, citations, context };
  
  // Cache the results if caching is enabled
  if (shouldCache) {
    try {
      const cacheKey = getCacheKey(userId, query, searchLimit);
      const client = getRedisClient();
      await client.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(searchResult));
      logger.log('[search] cache write', { ts: new Date().toISOString(), userId, query: query.slice(0, 100) });
    } catch (error) {
      logger.warn('[search] cache write error', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  return searchResult;
}


