import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { geminiService } from './gemini';

type SearchResult = {
  memory_id: string;
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

export async function searchMemories(params: {
  wallet: string;
  query: string;
  limit?: number;
  enableReasoning?: boolean;
  enableAnchoring?: boolean;
}): Promise<{ query: string; results: SearchResult[]; meta_summary?: string }>{
  const { wallet, query, limit = Number(process.env.SEARCH_TOP_K || 10), enableReasoning = process.env.SEARCH_ENABLE_REASONING === 'true', enableAnchoring = process.env.SEARCH_ANCHOR_META === 'true' } = params;

  if (!geminiService.isInitialized) {
    throw new Error('Gemini not configured. Set GEMINI_API_KEY.');
  }

  const normalized = normalizeText(query);

  // Scope to user's memories using wallet -> user_id mapping
  const walletNorm = (wallet || '').toLowerCase();
  const user = await prisma.user.findFirst({ where: { wallet_address: walletNorm } });
  if (!user) {
    return { query: normalized, results: [], meta_summary: undefined };
  }
  const embedding = await geminiService.generateEmbedding(normalized);
  const queryVecSql = vectorToSqlArray(embedding);

  const salt = process.env.SEARCH_EMBED_SALT || 'recallos';
  const embeddingHash = sha256Hex(JSON.stringify({ model: 'text-embedding-004', values: embedding.slice(0, 64), salt }));

  // Vector search using pgvector cosine distance operator <=>
  // score = 1 - distance
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; summary: string | null; url: string | null; timestamp: bigint; hash: string | null; score: number }>>(`
    SELECT m.id, m.summary, m.url, m.timestamp, m.hash,
           GREATEST(0, LEAST(1, 1 - (me.embedding <=> ${queryVecSql}))) AS score
    FROM memory_embeddings me
    JOIN memories m ON m.id = me.memory_id
    WHERE m.user_id = '${user.id}'
    ORDER BY me.embedding <=> ${queryVecSql}
    LIMIT ${Number(limit)}
  `);

  const memoryIds = rows.map(r => r.id);

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

  // Optional reasoning meta-summary
  let metaSummary: string | undefined;
  if (enableReasoning) {
    const bullets = rows.map((r, i) => `#${i + 1} ${r.summary || ''}`.trim()).join('\n');
    const prompt = `You are RecallOS. A user asked: "${normalized}"\nTheir memories matched include concise summaries below. Write one-sentence meta-summary that links them causally/temporally without markdown.\n${bullets}`;
    try {
      metaSummary = await geminiService.generateContent(prompt);
    } catch (e) {
      metaSummary = undefined;
    }
  }

  // Persist QueryEvent and links
  const created = await prisma.queryEvent.create({
    data: {
      wallet,
      query: normalized,
      embedding_hash: embeddingHash,
      meta_summary: metaSummary || null,
    },
  });

  if (rows.length) {
    await prisma.queryRelatedMemory.createMany({
      data: rows.map((r, idx) => ({ query_event_id: created.id, memory_id: r.id, rank: idx + 1, score: r.score })),
      skipDuplicates: true,
    });
  }

  // Optional anchoring of meta-summary
  if (enableAnchoring && metaSummary) {
    try {
      const { anchorMetaSummary } = await import('./blockchainAnchor');
      const availHash = await anchorMetaSummary(metaSummary);
      await prisma.queryEvent.update({ where: { id: created.id }, data: { avail_hash: availHash } });
    } catch {
      // ignore anchoring failures
    }
  }

  const results: SearchResult[] = rows.map(r => ({
    memory_id: r.id,
    summary: r.summary,
    url: r.url,
    timestamp: Number(r.timestamp),
    avail_hash: r.hash, // using memory.hash as on-chain content hash if present
    related_memories: relatedById.get(r.id) || [],
    score: r.score,
  }));

  return { query: normalized, results, meta_summary: metaSummary };
}


