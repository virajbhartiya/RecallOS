import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { aiProvider } from './aiProvider';
import { setSearchJobResult } from './searchJob';

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

function vectorToSqlArray(values: number[]): string {
  const clamped = values.map(v => Number.isFinite(v) ? v : 0);
  return `ARRAY[${clamped.join(',')}]::vector`;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
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
}): Promise<{ query: string; results: SearchResult[]; meta_summary?: string; answer?: string; citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>; context?: string }>{
  const { userId, query, limit = Number(process.env.SEARCH_TOP_K || 10), enableReasoning = process.env.SEARCH_ENABLE_REASONING !== 'false', contextOnly = false } = params;

  if (!aiProvider.isInitialized) {
    console.error('AI Provider not initialized. Check GEMINI_API_KEY or AI_PROVIDER configuration.');
    throw new Error('AI Provider not configured. Set GEMINI_API_KEY or configure AI_PROVIDER.');
  }

  const normalized = normalizeText(query);

  const user = await prisma.user.findFirst({ where: { external_id: { equals: userId } } as any });
  if (!user) {
    return { query: normalized, results: [], meta_summary: undefined };
  }

  let embedding: number[];
  try {
    embedding = await withTimeout(aiProvider.generateEmbedding(normalized), 600000); // 10 minutes
  } catch (error) {
    try {
      embedding = aiProvider.generateFallbackEmbedding(normalized);
    } catch (fallbackError) {
      try {
        const jobId = (global as any).__currentSearchJobId as string | undefined;
        if (jobId) {
          await setSearchJobResult(jobId, { status: 'failed' });
          (global as any).__currentSearchJobId = undefined;
        }
      } catch (jobError) {
        // Error updating search job status
      }
      return { query: normalized, results: [], meta_summary: undefined, answer: undefined };
    }
  }
  const queryVecSql = vectorToSqlArray(embedding);

  const salt = process.env.SEARCH_EMBED_SALT || 'recallos';
  const embeddingHash = sha256Hex(JSON.stringify({ model: 'text-embedding-004', values: embedding.slice(0, 64), salt }));

  // Extract query tokens for keyword boosting
  const queryTokens = tokenizeQuery(normalized);
  
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; title: string | null; summary: string | null; url: string | null; timestamp: bigint; hash: string | null; content: string | null; score: number }>>(`
    WITH ranked AS (
      SELECT 
        m.id,
        m.title,
        m.summary,
        m.url,
        m.timestamp,
        m.hash,
        m.content,
        GREATEST(0, LEAST(1, 1 - (me.embedding <=> ${queryVecSql}))) AS semantic_score,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY me.embedding <=> ${queryVecSql}) AS rn
      FROM memory_embeddings me
      JOIN memories m ON m.id = me.memory_id
      WHERE m.user_id = '${user.id}'::uuid
    )
    SELECT id, title, summary, url, timestamp, hash, content, semantic_score as score
    FROM ranked
    WHERE rn = 1 AND semantic_score > 0.0
    ORDER BY semantic_score DESC
    LIMIT ${Number(limit) * 3}
  `);

  
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
    .slice(0, Number(limit));
  
  const memoryIds = filteredRows.map(r => r.id);

  // Fast-path: if no matches, persist minimal query event and return immediately
  if (filteredRows.length === 0) {
    try {
      await prisma.queryEvent.create({
        data: {
          user_id: userId,
          query: normalized,
          embedding_hash: embeddingHash,
          meta_summary: null,
        } as any,
      });
    } catch {}
    return { query: normalized, results: [], meta_summary: undefined, answer: undefined, context: undefined };
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

  let metaSummary: string | undefined;
  if (enableReasoning) {
    const bullets = filteredRows.map((r, i) => `#${i + 1} ${r.summary || ''}`.trim()).join('\n');
    const prompt = `You are RecallOS. A user asked: "${normalized}"\nTheir memories matched include concise summaries below. Write one-sentence meta-summary that links them causally/temporally.

CRITICAL: Return ONLY plain text content. Do not use any markdown formatting including:
- No asterisks (*) for bold or italic text
- No underscores (_) for emphasis
- No backticks for code blocks
- No hash symbols (#) for headers
- No brackets [] or parentheses () for links
- No special characters for formatting
- No bullet points with dashes or asterisks
- No numbered lists with special formatting

Return clean, readable plain text only.

Memory summaries:
${bullets}`;
    try {
      metaSummary = await withTimeout(aiProvider.generateContent(prompt), 120000); // 2 minutes
    } catch (e) {
      // Generate a simple fallback summary
      try {
        metaSummary = `Found ${filteredRows.length} relevant memories about "${normalized}". ${filteredRows.slice(0, 3).map((r, i) => `${r.title || 'Untitled'}`).join(', ')}${filteredRows.length > 3 ? ' and more.' : '.'}`;
      } catch (fallbackError) {
        metaSummary = undefined;
      }
    }
  }

  let answer: string | undefined;
  let citations: Array<{ label: number; memory_id: string; title: string | null; url: string | null }> = [];
  let context: string | undefined;
  
  // Generate context for external AI tools (like ChatGPT)
  if (contextOnly) {
    context = filteredRows.map((r, i) => {
      const date = r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) : '';
      const title = r.title ? `Title: ${r.title}` : '';
      const url = r.url ? `URL: ${r.url}` : '';
      const summary = r.summary || 'No summary available';
      return `Memory ${i + 1} (${date}):
${title ? title + '\n' : ''}${url ? url + '\n' : ''}Summary: ${summary}`;
    }).join('\n\n');
  } else {
    // Generate AI answer only if not in context-only mode
    try {
      const bullets = filteredRows.map((r, i) => {
        const date = r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) : '';
        return `- [${i + 1}] ${date} ${r.summary || ''}`.trim();
      }).join('\n');
      const ansPrompt = `You are RecallOS. Answer the user's query using the evidence notes, and insert bracketed numeric citations wherever you use a note.

Rules:
- Use inline numeric citations like [1], [2].
- Keep it concise (2-4 sentences).
- Plain text only.

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

User query: "${normalized}"
Evidence notes (ordered by relevance):
${bullets}`;
      answer = await withTimeout(aiProvider.generateContent(ansPrompt), 180000); // 3 minutes
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
      const orderSet = new Set(order);
      citations = order.length
        ? order.map(n => allCitations.find(c => c.label === n)).filter((c): c is { label: number; memory_id: string; title: string | null; url: string | null } => Boolean(c))
        : [];
    } catch (error) {
      // Update search job status to failed if there's a job
      try {
        const jobId = (global as any).__currentSearchJobId as string | undefined;
        if (jobId) {
          await setSearchJobResult(jobId, { status: 'failed' });
          (global as any).__currentSearchJobId = undefined;
        }
      } catch (jobError) {
        // Error updating search job status
      }
      // Fallback: create a simple summary if AI generation fails
      answer = `Found ${filteredRows.length} relevant memories about "${normalized}". ${filteredRows.slice(0, 3).map((r, i) => `[${i + 1}] ${r.title || 'Untitled'}`).join(', ')}${filteredRows.length > 3 ? ' and more.' : '.'}`;
    }
  }

  const created = await prisma.queryEvent.create({
    data: {
      user_id: userId,
      query: normalized,
      embedding_hash: embeddingHash,
      meta_summary: (answer || metaSummary) || null,
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

  
  try {
    const jobId = (global as any).__currentSearchJobId as string | undefined;
    if (jobId) {
      await setSearchJobResult(jobId, { answer, meta_summary: metaSummary, status: 'completed' });
      (global as any).__currentSearchJobId = undefined;
    } else {
    }
  } catch (error) {
    // Error updating search job result
  }
  
  return { query: normalized, results, meta_summary: metaSummary, answer, citations, context };
}


