# RecallOS Memory Processing, Embeddings, Indexing, and Linking

## Overview
RecallOS is a decentralized memory management system that captures, processes, and organizes user context from various sources (browser extension, client app) into a searchable knowledge graph anchored on-chain.

**Goal**: Persist user context as memories, enrich with AI, index for retrieval, and link memories into a navigable mesh.

**Components**: yes
- **Browser Extension** → Captures web content
- **Express.js API** → Processing engine with controllers for memory, content, search, deposit, blockscout
- **AI Provider** → Hybrid (Gemini/Ollama) for embeddings, summarization, metadata extraction
- **PostgreSQL + pgvector** → Database with vector similarity search
- **Sepolia Blockchain** → On-chain memory registry with gas deposits and relayer system
- **Memory Mesh Service** → Graph relationship builder (semantic, topical, temporal)
- **Search Service** → Semantic search with AI-generated answers and citations
- **SDK** → JavaScript client library
- **MCP Server** → Model Context Protocol for AI tool integration
- **Web Client** → React interface for memory visualization and search

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
**AI Provider:**
- AI_PROVIDER: 'gemini' | 'ollama' | 'hybrid' (default: 'hybrid')
- GEMINI_API_KEY: Google Gemini API key
- OLLAMA_BASE_URL: Ollama server URL (default: http://localhost:11434)
- OLLAMA_EMBED_MODEL: Embedding model (default: all-minilm:l6-v2)
- OLLAMA_GEN_MODEL: Generation model (default: llama3.1:8b)

**Blockchain:**
- SEPOLIA_RPC_URL: Ethereum Sepolia RPC endpoint
- RELAYER_PRIVATE_KEY: Private key for authorized relayer wallet
- DEPLOYER_PRIVATE_KEY: Fallback if RELAYER_PRIVATE_KEY not set
- MEMORY_REGISTRY_CONTRACT_ADDRESS: Deployed smart contract address

**Database:**
- DATABASE_URL: PostgreSQL connection string with pgvector extension

**Search:**
- SEARCH_TOP_K: Number of results to return (default: 10)
- SEARCH_ENABLE_REASONING: Enable AI answer generation (default: true)
- SEARCH_EMBED_SALT: Salt for embedding hashes

**Queue/Workers:**
- REDIS_HOST, REDIS_PORT, REDIS_PASSWORD: Redis for Bull queue
- PORT: API server port (default: 3000)

## 12) On-Chain Verification Examples
```js
const exists = await contract.isMemoryStored(hash);
const byHash = await contract.getMemoryByHash(hash);
const recent = await contract.getRecentMemories(userAddress, 10);
```

## 13) Lifecycle
**Synchronous Flow (blocks HTTP response):**
1. Validate input (content, userAddress)
2. Ensure user exists (create if needed)
3. AI summarization and metadata extraction (parallel)
4. Generate content hash and URL hash
5. Check for duplicates (same hash or URL within 24h)
6. Create memory record in PostgreSQL
7. Store memory batch on-chain (via authorized relayer)
8. Update memory with blockchain transaction details
9. Return success response

**Asynchronous Flow (via setImmediate, doesn't block response):**
1. Create memory snapshot
2. Generate embeddings (content, summary, title)
3. Build memory relations (semantic, topical, temporal)
4. Prune and optimize graph connections

**Background Workers:**
- Content Worker: Processes queued content jobs for bulk ingestion
- Blockscout Worker: Monitors blockchain transactions for finality

**Periodic Cleanup:**
- Memory relation quality filtering
- Degree caps on nodes to avoid hubs
- Cache expiration for relationship data

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
