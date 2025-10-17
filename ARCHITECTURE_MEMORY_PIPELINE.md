# RecallOS Memory Processing, Embeddings, Indexing, and Linking

## Overview
- Goal: Persist user context as memories, enrich with AI, index for retrieval, and link memories into a navigable mesh.
- Components: Extension/Client → API (Express) → AI Provider (Gemini/Ollama/Hybrid) → PostgreSQL + pgvector → Sepolia Memory Registry → Mesh → Search/Insights.

## 1) Ingestion (Extension/Client → API)
- Endpoint: POST /api/memory/processRawContent
- Input:
```json
{
  "content": "...full page text...",
  "url": "https://example.com/page",
  "title": "Page Title",
  "userAddress": "0xabc...",
  "metadata": {
    "source": "extension",
    "content_type": "documentation",
    "content_summary": "H1/H2 headings and outline..."
  }
}
```
- Steps:
  - Ensure user exists for wallet_address (case-insensitive).
  - Summarize content and extract metadata via AI.
  - Compute hashes (sha256(summary), keccak256(url)) and timestamp.
  - Persist memory; trigger on-chain anchoring and mesh processing.

## 2) AI Processing (Hybrid Provider)
- AI_PROVIDER ∈ { gemini, ollama, hybrid } (default: hybrid).
- summarizeContent(text, metadata) → summary.
- extractContentMetadata(text, metadata) → { topics, categories, keyPoints, sentiment, importance, usefulness, searchableTerms, contextRelevance }.
- generateEmbedding(text) → 768-dim; deterministic fallback if upstream unavailable.

## 3) Hashing and Anchoring
- memory.hash = '0x' + sha256(summary)
- urlHash = keccak256(url || 'unknown')
- timestamp = Math.floor(Date.now()/1000)
- On-chain:
  - storeMemoryBatch([{ hash, urlHash, timestamp }]) on Sepolia Memory Registry.
  - Optional meta summary anchoring via anchorMetaSummary → storeMemory.

## 4) Database Storage (PostgreSQL via Prisma)
- memories
  - id, user_id, source, url, title, content, full_content, summary
  - hash (0xsha256), timestamp (bigint seconds)
  - tx_hash, block_number, gas_used, tx_status, blockchain_network, confirmed_at
  - page_metadata (jsonb): extracted_metadata, topics[], categories[], key_points[], sentiment, importance, searchable_terms[]
- embeddings
  - memory_id, vector (float[]), model_name ('text-embedding-004'), embedding_type ('content'|'summary'|'title')
- memory_embeddings (pgvector)
  - id, memory_id, embedding (vector), dim, model, created_at
- memory_relations
  - memory_id, related_memory_id, similarity_score, relation_type ('semantic'|'topical'|'temporal')
- memory_snapshots
  - user_id, raw_text, summary, summary_hash ('0x'+sha256(summary)), created_at

## 5) Embeddings
- Generated for: content, summary, title (if present).
- Written to both embeddings (audit) and memory_embeddings (pgvector index).

## 6) Indexing and Search
- POST /api/search
  1) generateEmbedding(query)
  2) pgvector similarity: score = 1 - (embedding <=> queryVec) ∈ [0,1]
  3) Optional meta_summary and short answer with [n] citations
  4) Persist queryEvent and queryRelatedMemory; optional on-chain anchor for meta summary
- Additional:
  - /api/memory/search (keyword)
  - /api/memory/search-embed (embedding with prefilter)
  - /api/memory/search-hybrid (blend keyword+semantic; 0.4/0.6 weighting)

## 7) Memory Linking (Mesh)
- Semantic: cosine(content vectors), keep if similarity ≥ 0.3
- Topical: weighted overlap
  - topic 0.4, category 0.3, key_points 0.2, searchable_terms 0.1; +0.1 if same hostname
- Temporal: proximity decay across hour/day/week/month, keep if similarity ≥ 0.2
- Graph shaping:
  - Deduplicate by higher similarity; cleanup low-score edges (<0.3); cap top links per node
  - Mutual kNN pruning (k=3) and degree caps
  - Force-directed layout; cluster hints by source (extension/github/meet/on_chain)

## 8) Selected API Endpoints
- Ingestion: POST /api/memory/processRawContent
- Mesh: GET /api/memory/:userAddress/mesh?limit&threshold
- Relations: GET /api/memory/:memoryId/with-relations?userAddress=...
- Cluster: GET /api/memory/:memoryId/cluster?userAddress=...&depth=2
- Search: POST /api/search, GET /api/search/job/:id
- Keyword/Hybrid: GET /api/memory/search, /search-embed, /search-hybrid
- Blockchain reads: GET /api/memory/getMemoryByHash/:hash

## 9) Background/Async
- After ingestion: create memory_snapshots, generate embeddings, build relations (semantic/topical/temporal), prune.
- Failures logged; ingestion response not blocked.

## 10) Duplicates, Fallbacks, Retries
- Duplicate skip if same hash or same url within 24h per user.
- Blockchain retries with gas backoff (up to 3 attempts); tx fields persisted.
- AI fallbacks: deterministic embedding; heuristic metadata if JSON parse fails.

## 11) Env Vars (key)
- AI_PROVIDER, GEMINI_API_KEY, OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL, OLLAMA_GEN_MODEL
- SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, MEMORY_REGISTRY_CONTRACT_ADDRESS
- SEARCH_TOP_K, SEARCH_ENABLE_REASONING, SEARCH_ANCHOR_META, SEARCH_EMBED_SALT

## 12) On-Chain Verification Examples
```js
const exists = await contract.isMemoryStored(hash);
const byHash = await contract.getMemoryByHash(hash);
const recent = await contract.getRecentMemories(userAddress, 10);
```

## 13) Lifecycle
- Ingestion → AI enrichment → DB persist → On-chain anchor → Embeddings → Relations → Mesh → Search/Insights.
- Periodic cleanup of low-quality relations and degree caps to avoid hubs.

## 14) Flowchart
```
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────────-──┐
│  Browser Extension   │────▶│   API (Express.js)   │────▶│   AI Provider (Hybrid) │
│  and Client (Vite)   │     │  /api/memory         │     │  Gemini or Ollama      │
└──────────────────────┘     │  /api/content        │     └──────────────────────-─┘
                              │  /api/search         │                 │
                              │  /api/blockscout     │                 ▼
                              └──────────┬───────────┘       ┌───────────────────────┐
                                         │                   │  Embeddings + Mesh    │
                                         ▼                   │  Prisma + pgvector    │
                               ┌──────────────────┐          └───────────────────────┘
                               │  PostgreSQL      │◀──────────────┐
                               │  (Prisma)        │               │
                               └──────────────────┘               │
                                         ▲                        │
                                         │                        │
                                         │                        ▼
                               ┌──────────────────┐     ┌────────────────────────-───┐
                               │  Sepolia (EVM)   │◀────│  Blockchain Anchor (Ethers)│
                               │  Memory Registry │     └─────────────────────────-──┘
                               └──────────────────┘

Data flow:
1) Ingest content → summarize + extract metadata
2) Compute hashes → store memory in DB
3) Generate embeddings (content/summary/title) → index in pgvector
4) Create relations (semantic/topical/temporal) → prune/layout
5) Anchor hashes on-chain (batch or single) → tx fields saved
6) Search: embed query → pgvector rank → optional meta summary/answer + citations
```

## 15) Relations (Summary)
- Types
  - Semantic: cosine(content embeddings); keep if similarity ≥ 0.3
    - Domain-aware tweaks: penalize Meet↔GitHub unless very high; boost GitHub↔GitHub for Filecoin-related items.
  - Topical: weighted overlap of metadata
    - topic 0.4, category 0.3, key_points 0.2, searchable_terms 0.1; +0.1 same hostname; keep if ≥ ~0.25
  - Temporal: time proximity with decay across hour/day/week/month; keep if ≥ 0.2
- Filtering and quality
  - Deduplicate by higher similarity; remove edges < 0.3; cap strongest per node
  - Mutual kNN pruning (k=3) and degree caps
  - Optional AI review for a small set of low-confidence candidates with caching
- Layout
  - Force-directed; cluster hints by `source` (extension/github/meet/on_chain)
