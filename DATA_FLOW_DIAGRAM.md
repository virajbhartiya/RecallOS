# RecallOS Memory Data Flow
## System-Level Diagram
```
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────────-──┐
│  Browser Extension   │────▶│   API (Express.js)   │────▶│   AI Provider (Hybrid) │
│  and Client (Vite)   │     │  /api/content        │     │  Gemini or Ollama      │
└──────────────────────┘     │  /api/memory         │     └──────────────────────-─┘
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
```

## 1) Ingestion: Browser Extension → API
```
POST /api/memory/processRawContent
Body:
{
  content: string,
  url?: string,
  title?: string,
  userAddress: string,
  metadata?: {
    source?: 'extension' | string,
    content_type?: string,
    title?: string,
    url?: string,
    content_summary?: string,
    // arbitrary additional fields from extension
  }
}
```

## 2) AI Processing (Hybrid Provider)
```
Provider selection: process.env.AI_PROVIDER ∈ { 'gemini', 'ollama', 'hybrid' } (default: hybrid)

- summarizeContent(text, metadata) → summary
- extractContentMetadata(text, metadata) → {
    topics: string[],
    categories: string[],
    keyPoints: string[],
    sentiment: string,
    importance: number,
    usefulness: number,
    searchableTerms: string[],
    contextRelevance: string[]
  }
- generateEmbedding(text) → number[]
  - If Gemini unavailable and Ollama fails, fallback 768-dim deterministic embedding
```

## 3) Hashing and Timestamps
```
memory.hash = '0x' + sha256(summary)
urlHash = keccak256(url || 'unknown')
timestamp = Math.floor(Date.now() / 1000)
```

## 4) Database Storage (PostgreSQL via Prisma)
```
Table: memories
- id (uuid)
- user_id (uuid)
- source (string)               // e.g., 'extension'
- url (string | 'unknown')
- title (string)
- content (text)
- full_content (text)
- summary (text)
- hash (string, 0xsha256)
- timestamp (bigint seconds)
- tx_hash, block_number, gas_used, tx_status, blockchain_network, confirmed_at
- page_metadata (jsonb) with keys:
  - extracted_metadata: {...}
  - topics: string[]
  - categories: string[]
  - key_points: string[]        // note: stored as key_points
  - sentiment: string
  - importance: number
  - searchable_terms: string[]  // note: stored as searchable_terms

Table: embeddings
- memory_id (uuid)
- vector (float[])
- model_name ('text-embedding-004')
- embedding_type ('content' | 'summary' | 'title')

Table: memory_embeddings (pgvector)
- id (uuid)
- memory_id (uuid)
- embedding (vector)
- dim (int)
- model ('text-embedding-004')
- created_at (timestamp)

Table: memory_relations
- memory_id, related_memory_id (uuid)
- similarity_score (float)
- relation_type ('semantic' | 'topical' | 'temporal')

Table: memory_snapshots
- user_id (uuid)
- raw_text (text)
- summary (text)
- summary_hash ('0x' + sha256(summary))
- created_at
```

## 5) On-Chain Anchoring (Sepolia)
```
Contract interface (ethers):
- storeMemory(bytes32 hash, bytes32 urlHash, uint256 timestamp)
- storeMemoryBatch(bytes32[] hashes, bytes32[] urlHashes, uint256[] timestamps)
- isMemoryStored(bytes32 hash) → bool
- getMemoryByHash(bytes32 hash) → (owner, urlHash, timestamp)
- getRecentMemories(address user, uint256 count)
- events: MemoryStored, MemoryBatchStored

Write path:
- Primary write during ingestion uses storeMemoryBatch([{ hash, urlHash, timestamp }])
- Meta-summary anchoring may hash free-text and call storeMemory to produce txHash
```

## 6) Memory Mesh Generation
```
Semantic relations:
- cosineSimilarity(content vector A, content vector B)
- keep if similarity ≥ 0.3

Topical relations:
- weighted overlap of topics (0.4), categories (0.3), key_points (0.2), searchable_terms (0.1)
- domain boost (+0.1 for same hostname)

Temporal relations:
- similarity via proximity: hour/day/week/month windows with decay

Graph shaping:
- prune with mutual kNN (k=3) and degree cap
- force-directed layout with source clusters: extension/github/meet/on_chain
```

## 7) Search Pipeline
```
Endpoint: POST /api/search

Steps:
1) generateEmbedding(query) → vector
2) vector similarity over memory_embeddings using pgvector distance
3) optional meta_summary and short answer via AI with inline numeric citations
4) persist queryEvent + queryRelatedMemory rows; optional on-chain anchor for meta summary

Alternate endpoints (controller):
- /api/memory/search        // keyword filters
- /api/memory/search-embed  // embedding prefiltered
- /api/memory/search-hybrid // blend keyword + semantic
```

## Example Payloads
### Ingestion Request (extension → API)
```json
{
  "content": "...full page text...",
  "url": "https://example.com/page",
  "title": "Page Title",
  "userAddress": "0xabc...",
  "metadata": {
    "source": "extension",
    "content_type": "documentation",
    "content_summary": "H1/H2 headings..."
  }
}
```

### Stored Memory (normalized)
```json
{
  "source": "extension",
  "url": "https://example.com/page",
  "title": "Page Title",
  "summary": "...",
  "hash": "0xsha256(summary)",
  "timestamp": 1699123456,
  "page_metadata": {
    "topics": ["x","y"],
    "categories": ["documentation"],
    "key_points": ["..."],
    "sentiment": "technical",
    "importance": 7,
    "searchable_terms": ["..."]
  }
}
```

## Reference Snippets
```198:214:/Users/art3mis/Developer/RecallOS/api/src/controller/memory.controller.ts
// Blockchain write during ingestion
const blockchainResult = await storeMemoryBatch([memoryData]);
```

```120:146:/Users/art3mis/Developer/RecallOS/api/src/services/blockchain.ts
// Contract write call
const tx = await contract.storeMemory(hash, urlHash, timestamp, { gasPrice, gasLimit });
```

```1083:1199:/Users/art3mis/Developer/RecallOS/api/src/services/memoryMesh.ts
// Mesh generation: nodes/edges, pruning, layout
const edges = this.pruneEdgesMutualKNN(rawEdges, 3, similarityThreshold);
```

```67:90:/Users/art3mis/Developer/RecallOS/api/src/services/memorySearch.ts
// Semantic search over pgvector
GREATEST(0, LEAST(1, 1 - (me.embedding <=> ${queryVecSql}::vector))) AS score
```