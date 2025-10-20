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
    // Remove common punctuation that can confuse embeddings
    .replace(/[?!.,;:()]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove extra spaces
    .trim()
    // Limit length
    .slice(0, 8000);
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function vectorToSqlArray(values: number[]): string {
  // pgvector accepts array literal cast to vector
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
  wallet: string;
  query: string;
  limit?: number;
  enableReasoning?: boolean;
  contextOnly?: boolean;
}): Promise<{ query: string; results: SearchResult[]; meta_summary?: string; answer?: string; citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>; context?: string }>{
  const { wallet, query, limit = Number(process.env.SEARCH_TOP_K || 10), enableReasoning = process.env.SEARCH_ENABLE_REASONING !== 'false', contextOnly = false } = params;

  if (!aiProvider.isInitialized) {
    console.error('AI Provider not initialized. Check GEMINI_API_KEY or AI_PROVIDER configuration.');
    throw new Error('AI Provider not configured. Set GEMINI_API_KEY or configure AI_PROVIDER.');
  }

  const normalized = normalizeText(query);

  const walletNorm = (wallet || '').toLowerCase();
  const user = await prisma.user.findFirst({ where: { wallet_address: walletNorm } });
  if (!user) {
    return { query: normalized, results: [], meta_summary: undefined };
  }

  let embedding: number[];
  try {
    // Increase timeout for Gemini API calls - they can take longer
    embedding = await withTimeout(aiProvider.generateEmbedding(normalized), 300000);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Update search job status to failed if there's a job
    try {
      const jobId = (global as any).__currentSearchJobId as string | undefined;
      if (jobId) {
        console.log('Updating search job status to failed due to embedding timeout:', jobId);
        await setSearchJobResult(jobId, { status: 'failed' });
        (global as any).__currentSearchJobId = undefined;
      }
    } catch (jobError) {
      console.error('Error updating search job status:', jobError);
    }
    return { query: normalized, results: [], meta_summary: undefined, answer: undefined };
  }
  const queryVecSql = vectorToSqlArray(embedding);

  const salt = process.env.SEARCH_EMBED_SALT || 'recallos';
  const embeddingHash = sha256Hex(JSON.stringify({ model: 'text-embedding-004', values: embedding.slice(0, 64), salt }));

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; title: string | null; summary: string | null; url: string | null; timestamp: bigint; hash: string | null; score: number }>>(`
    WITH ranked AS (
      SELECT 
        m.id,
        m.title,
        m.summary,
        m.url,
        m.timestamp,
        m.hash,
        GREATEST(0, LEAST(1, 1 - (me.embedding <=> ${queryVecSql}))) AS score,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY me.embedding <=> ${queryVecSql}) AS rn
      FROM memory_embeddings me
      JOIN memories m ON m.id = me.memory_id
      WHERE m.user_id = '${user.id}'::uuid
    )
    SELECT id, title, summary, url, timestamp, hash, score
    FROM ranked
    WHERE rn = 1 AND score > 0.01
    ORDER BY score DESC
    LIMIT ${Number(limit)}
  `);

  
  // Additional relevance filtering based on content analysis
  const queryKeywords = normalized.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const filteredRows = rows.filter(row => {
    const title = (row.title || '').toLowerCase();
    const summary = (row.summary || '').toLowerCase();
    const content = title + ' ' + summary;
    
    // For semantic search, be more lenient with keyword matching
    // Only filter out results if they have very low semantic scores AND no keyword matches
    if (row.score < 0.02) {
      const hasRelevantKeywords = queryKeywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      return hasRelevantKeywords;
    }
    
    // For higher semantic scores, trust the semantic similarity
    return true;
  });
  
  const memoryIds = filteredRows.map(r => r.id);

  // Fast-path: if no matches, persist minimal query event and return immediately
  if (filteredRows.length === 0) {
    try {
      await prisma.queryEvent.create({
        data: {
          wallet,
          query: normalized,
          embedding_hash: embeddingHash,
          meta_summary: null,
        },
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
      metaSummary = await withTimeout(aiProvider.generateContent(prompt), 10000);
    } catch (e) {
      console.error('Error generating meta summary:', e);
      metaSummary = undefined;
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
      answer = await withTimeout(aiProvider.generateContent(ansPrompt), 15000);
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
      console.error('Error generating search answer:', error);
      // Update search job status to failed if there's a job
      try {
        const jobId = (global as any).__currentSearchJobId as string | undefined;
        if (jobId) {
          await setSearchJobResult(jobId, { status: 'failed' });
          (global as any).__currentSearchJobId = undefined;
        }
      } catch (jobError) {
        console.error('Error updating search job status:', jobError);
      }
      // Fallback: create a simple summary if AI generation fails
      answer = `Found ${filteredRows.length} relevant memories about "${normalized}". ${filteredRows.slice(0, 3).map((r, i) => `[${i + 1}] ${r.title || 'Untitled'}`).join(', ')}${filteredRows.length > 3 ? ' and more.' : '.'}`;
    }
  }

  const created = await prisma.queryEvent.create({
    data: {
      wallet,
      query: normalized,
      embedding_hash: embeddingHash,
      meta_summary: (answer || metaSummary) || null,
    },
  });

  if (filteredRows.length) {
    await prisma.queryRelatedMemory.createMany({
      data: filteredRows.map((r, idx) => ({ query_event_id: created.id, memory_id: r.id, rank: idx + 1, score: r.score })),
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
    score: r.score,
  }));

  console.log('About to update search job status. Results count:', results.length);
  
  try {
    const jobId = (global as any).__currentSearchJobId as string | undefined;
    console.log('Search job ID from global:', jobId);
    if (jobId) {
      console.log('Updating search job result:', jobId, { hasAnswer: !!answer, hasMetaSummary: !!metaSummary, resultsCount: results.length });
      await setSearchJobResult(jobId, { answer, meta_summary: metaSummary, status: 'completed' });
      (global as any).__currentSearchJobId = undefined;
      console.log('Search job completed successfully:', jobId);
    } else {
      console.log('No job ID found, skipping job status update');
    }
  } catch (error) {
    console.error('Error updating search job result:', error);
  }
  
  console.log('Returning search results:', { query: normalized, resultsCount: results.length, hasAnswer: !!answer, hasMetaSummary: !!metaSummary });
  return { query: normalized, results, meta_summary: metaSummary, answer, citations, context };
}


