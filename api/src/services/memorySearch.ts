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
  avail_hash: string | null;
  related_memories: string[];
  score: number;
};

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, 8000);
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
  enableAnchoring?: boolean;
}): Promise<{ query: string; results: SearchResult[]; meta_summary?: string; answer?: string }>{
  const { wallet, query, limit = Number(process.env.SEARCH_TOP_K || 10), enableReasoning = process.env.SEARCH_ENABLE_REASONING === 'true', enableAnchoring = process.env.SEARCH_ANCHOR_META === 'true' } = params;

  if (!aiProvider.isInitialized) {
    throw new Error('Gemini not configured. Set GEMINI_API_KEY.');
  }

  const normalized = normalizeText(query);

  const walletNorm = (wallet || '').toLowerCase();
  const user = await prisma.user.findFirst({ where: { wallet_address: walletNorm } });
  if (!user) {
    return { query: normalized, results: [], meta_summary: undefined };
  }

  let embedding: number[];
  try {
    embedding = await withTimeout(aiProvider.generateEmbedding(normalized), 1200);
  } catch {
    return { query: normalized, results: [], meta_summary: undefined, answer: undefined };
  }
  const queryVecSql = vectorToSqlArray(embedding);

  const salt = process.env.SEARCH_EMBED_SALT || 'recallos';
  const embeddingHash = sha256Hex(JSON.stringify({ model: 'text-embedding-004', values: embedding.slice(0, 64), salt }));

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; title: string | null; summary: string | null; url: string | null; timestamp: bigint; hash: string | null; score: number }>>(`
    SELECT m.id, m.title, m.summary, m.url, m.timestamp, m.hash,
           GREATEST(0, LEAST(1, 1 - (me.embedding <=> ${queryVecSql}))) AS score
    FROM memory_embeddings me
    JOIN memories m ON m.id = me.memory_id
    WHERE m.user_id = '${user.id}'
    ORDER BY me.embedding <=> ${queryVecSql}
    LIMIT ${Number(limit)}
  `);

  const memoryIds = rows.map(r => r.id);

  // Fast-path: if no matches, persist minimal query event and return immediately
  if (rows.length === 0) {
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
    return { query: normalized, results: [], meta_summary: undefined, answer: undefined };
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
    const bullets = rows.map((r, i) => `#${i + 1} ${r.summary || ''}`.trim()).join('\n');
    const prompt = `You are RecallOS. A user asked: "${normalized}"\nTheir memories matched include concise summaries below. Write one-sentence meta-summary that links them causally/temporally without markdown.\n${bullets}`;
    try {
      metaSummary = await withTimeout(aiProvider.generateContent(prompt), 1500);
    } catch (e) {
      metaSummary = undefined;
    }
  }

  let answer: string | undefined;
  try {
    const bullets = rows.map((r, i) => {
      const date = r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) : '';
      return `- [${i + 1}] ${date} ${r.summary || ''}`.trim();
    }).join('\n');
    const ansPrompt = `User query: "${normalized}"\nEvidence notes (ordered by relevance):\n${bullets}\n\nCompose a concise, direct answer (2-4 sentences) summarizing what the user was exploring and key takeaways. No markdown or lists; return plain prose.`;
    answer = await withTimeout(aiProvider.generateContent(ansPrompt), 1800);
  } catch {
    answer = undefined;
  }

  const created = await prisma.queryEvent.create({
    data: {
      wallet,
      query: normalized,
      embedding_hash: embeddingHash,
      meta_summary: (answer || metaSummary) || null,
    },
  });

  if (rows.length) {
    await prisma.queryRelatedMemory.createMany({
      data: rows.map((r, idx) => ({ query_event_id: created.id, memory_id: r.id, rank: idx + 1, score: r.score })),
      skipDuplicates: true,
    });
  }

  if (enableAnchoring && (answer || metaSummary)) {
    setImmediate(async () => {
      try {
        const { anchorMetaSummary } = await import('./blockchainAnchor');
        const availHash = await anchorMetaSummary(String(answer || metaSummary));
        await prisma.queryEvent.update({ where: { id: created.id }, data: { avail_hash: availHash } });
      } catch {
        // ignore anchoring failures
      }
    });
  }

  const results: SearchResult[] = rows.map(r => ({
    memory_id: r.id,
    title: r.title,
    summary: r.summary,
    url: r.url,
    timestamp: Number(r.timestamp),
    avail_hash: r.hash,
    related_memories: relatedById.get(r.id) || [],
    score: r.score,
  }));

  try {
    const jobId = (global as any).__currentSearchJobId as string | undefined;
    if (jobId) {
      await setSearchJobResult(jobId, { answer, meta_summary: metaSummary, status: 'completed' });
      (global as any).__currentSearchJobId = undefined;
    }
  } catch {}
  return { query: normalized, results, meta_summary: metaSummary, answer };
}


