# RecallOS Detailed Data Flow

## Complete Memory Ingestion Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. BROWSER EXTENSION - Content Capture                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  content.ts (Content Script)                │
        │  - Extract document.title                   │
        │  - Extract window.location.href             │
        │  - Extract document.body.innerText          │
        │  - Detect privacy extensions                │
        │  - Send message to background               │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  background.ts (Service Worker)             │
        │  - Receive message from content script      │
        │  - Get wallet address from storage          │
        │  - Get API endpoint from storage            │
        │  - Validate content (>50 chars)             │
        │  - Build request payload                    │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. API - Initial Request Handling                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  POST /api/memory/processRawContent         │
        │  MemoryController.processRawContent()       │
        │                                             │
        │  1. Validate request body                   │
        │  2. Find or create user by wallet_address   │
        │     (case-insensitive, lowercase)           │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. AI PROCESSING (Parallel)                                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │ aiProvider            │   │ aiProvider            │
        │ .summarizeContent()   │   │ .extractContentMeta() │
        │                       │   │                       │
        │ - Gemini/Ollama/Fall  │   │ - Extract topics      │
        │ - Max 200 words       │   │ - Extract categories  │
        │ - Plain text only     │   │ - Extract key points  │
        │ - Actionable insights │   │ - Sentiment analysis  │
        │                       │   │ - Importance (1-10)   │
        │ Returns: string       │   │ - Searchable terms    │
        └───────────────────────┘   │ - Context relevance   │
                    │               │                       │
                    │               │ Returns: metadata obj │
                    │               └───────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. HASH GENERATION                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  memoryHash = '0x' + sha256(summary)        │
        │  urlHash = keccak256(url || 'unknown')      │
        │  timestamp = Math.floor(Date.now() / 1000)  │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. DUPLICATE DETECTION                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Query: Find existing memory where:         │
        │  - user_id matches AND                      │
        │  - (hash matches OR                         │
        │     (url matches AND created_at within 24h))│
        │                                             │
        │  If found: Return duplicate response        │
        │  If not found: Continue to creation         │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. DATABASE WRITE                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  prisma.memory.create({                     │
        │    user_id, source, url, title,             │
        │    content, summary, hash, timestamp,       │
        │    full_content,                            │
        │    page_metadata: {                         │
        │      ...metadata,                           │
        │      extracted_metadata,                    │
        │      topics, categories, key_points,        │
        │      sentiment, importance,                 │
        │      searchable_terms                       │
        │    }                                        │
        │  })                                         │
        │                                             │
        │  Returns: memory object with UUID id        │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. BLOCKCHAIN ANCHORING (Synchronous)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  blockchain.storeMemoryBatch([memoryData])  │
        │                                             │
        │  1. Check user gas deposit balance          │
        │  2. Estimate gas cost (with 20% buffer)     │
        │  3. Verify sufficient balance               │
        │  4. Build transaction                       │
        │     - Relayer wallet signs                  │
        │     - tx.origin = user address              │
        │  5. Submit to Sepolia                       │
        │  6. Wait for confirmation (up to 3 retries) │
        │  7. Extract tx_hash, block_number, gas_used │
        │                                             │
        │  Returns: { success, txHash, blockNumber,   │
        │            gasUsed }                        │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Update memory in database:                 │
        │  - tx_hash                                  │
        │  - block_number                             │
        │  - gas_used                                 │
        │  - tx_status = 'confirmed' or 'failed'      │
        │  - blockchain_network = 'sepolia'           │
        │  - confirmed_at = new Date()                │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. HTTP RESPONSE (End of synchronous flow)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Return to client:                          │
        │  {                                          │
        │    success: true,                           │
        │    message: "Content processed...",         │
        │    data: {                                  │
        │      userAddress,                           │
        │      memoryId,                              │
        │      memoryHash,                            │
        │      urlHash,                               │
        │      blockchainResult: {                    │
        │        success, txHash, blockNumber,        │
        │        gasUsed                              │
        │      },                                     │
        │      transactionDetails: {                  │
        │        txHash, blockNumber, gasUsed,        │
        │        status: 'confirmed',                 │
        │        network: 'sepolia'                   │
        │      }                                      │
        │    }                                        │
        │  }                                          │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. ASYNC PROCESSING (via setImmediate, non-blocking)               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │ Create Snapshot       │   │ Generate Embeddings   │
        └───────────────────────┘   └───────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │ prisma.memorySnapshot │   │ aiProvider            │
        │ .create({             │   │ .generateEmbedding()  │
        │   user_id,            │   │                       │
        │   raw_text: content,  │   │ For each:             │
        │   summary,            │   │ 1. content            │
        │   summary_hash        │   │ 2. summary            │
        │ })                    │   │ 3. title (if present) │
        └───────────────────────┘   └───────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │ Store in 2 tables:    │
                                    │ 1. embeddings         │
                                    │    (audit trail)      │
                                    │ 2. memory_embeddings  │
                                    │    (pgvector index)   │
                                    └───────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. MEMORY MESH GENERATION (Async)                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ memoryMeshService                           │
        │ .createMemoryRelations(memoryId, userId)    │
        └─────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
        ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Semantic    │ │   Topical    │ │   Temporal   │
        │   Relations   │ │   Relations  │ │   Relations  │
        └───────────────┘ └──────────────┘ └──────────────┘
                    │             │             │
                    └─────────────┴─────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Semantic Relations:                         │
        │ - Cosine similarity on content embeddings   │
        │ - Threshold: ≥ 0.3                          │
        │ - Domain-aware adjustments:                 │
        │   * Meet ↔ GitHub: -0.4 penalty            │
        │   * GitHub ↔ GitHub (Filecoin): +0.2 boost │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Topical Relations:                          │
        │ - Weighted metadata overlap:                │
        │   * topics: 0.4                             │
        │   * categories: 0.3                         │
        │   * key_points: 0.2                         │
        │   * searchable_terms: 0.1                   │
        │   * same hostname: +0.1                     │
        │ - Threshold: ≥ 0.25                         │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Temporal Relations:                         │
        │ - Time proximity with decay:                │
        │   * Same hour: 1.0                          │
        │   * Same day: 0.8                           │
        │   * Same week: 0.5                          │
        │   * Same month: 0.3                         │
        │ - Threshold: ≥ 0.2                          │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Merge & Deduplicate:                        │
        │ - Combine all relation types                │
        │ - Remove duplicates (keep highest score)    │
        │ - Filter relations < 0.3                    │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Graph Quality Control:                      │
        │ - Mutual k-NN pruning (k=3)                 │
        │ - Degree caps (max 15 edges per node)      │
        │ - Optional AI validation for low-confidence │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ Persist to Database:                        │
        │ prisma.memoryRelation.createMany([          │
        │   {                                         │
        │     memory_id,                              │
        │     related_memory_id,                      │
        │     similarity_score,                       │
        │     relation_type: 'semantic'|'topical'|    │
        │                    'temporal'               │
        │   }                                         │
        │ ])                                          │
        └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ END OF INGESTION FLOW                                               │
│ Total time: 2-5 seconds (synchronous) + 5-30 seconds (async)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete Search Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  POST /api/search                           │
        │  Body: {                                    │
        │    wallet: "0xabc...",                      │
        │    query: "blockchain smart contracts",     │
        │    limit: 10,                               │
        │    contextOnly: false                       │
        │  }                                          │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. QUERY PREPROCESSING                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  normalizeText(query):                      │
        │  - Trim whitespace                          │
        │  - Remove punctuation [?!.,;:()]            │
        │  - Normalize whitespace                     │
        │  - Limit to 8000 characters                 │
        │                                             │
        │  Result: "blockchain smart contracts"       │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Find user by wallet_address (lowercase)    │
        │  If not found: return empty results         │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GENERATE QUERY EMBEDDING                                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  aiProvider.generateEmbedding(normalizedQuery)│
        │  Timeout: 300 seconds                       │
        │                                             │
        │  Returns: number[] (768 dimensions)         │
        │                                             │
        │  On timeout/error:                          │
        │  - Update search job status to 'failed'     │
        │  - Return empty results                     │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Create embedding hash for deduplication:   │
        │  sha256(JSON.stringify({                    │
        │    model: 'text-embedding-004',             │
        │    values: embedding.slice(0, 64),          │
        │    salt: SEARCH_EMBED_SALT                  │
        │  }))                                        │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. VECTOR SIMILARITY SEARCH (pgvector)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  SQL Query:                                 │
        │  WITH ranked AS (                           │
        │    SELECT                                   │
        │      m.id, m.title, m.summary, m.url,       │
        │      m.timestamp, m.hash,                   │
        │      GREATEST(0, LEAST(1,                   │
        │        1 - (me.embedding <=> queryVec)      │
        │      )) AS score,                           │
        │      ROW_NUMBER() OVER (                    │
        │        PARTITION BY m.id                    │
        │        ORDER BY score DESC                  │
        │      ) AS rn                                │
        │    FROM memory_embeddings me                │
        │    JOIN memories m ON m.id = me.memory_id   │
        │    WHERE m.user_id = ?                      │
        │  )                                          │
        │  SELECT * FROM ranked                       │
        │  WHERE rn = 1 AND score > 0.01              │
        │  ORDER BY score DESC                        │
        │  LIMIT ?                                    │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. RELEVANCE FILTERING                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Extract keywords from query:               │
        │  - Split by whitespace                      │
        │  - Filter words > 2 characters              │
        │                                             │
        │  For each result:                           │
        │  - If score < 0.02:                         │
        │    * Check if any keyword in title/summary  │
        │    * Discard if no keyword match            │
        │  - If score >= 0.02:                        │
        │    * Trust semantic similarity              │
        │    * Keep result                            │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. FETCH MEMORY RELATIONS                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  For each result memory:                    │
        │  Query memory_relations where               │
        │    memory_id = result.id                    │
        │                                             │
        │  Build map: memoryId → [relatedId1, ...]    │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. AI META-SUMMARY (if enableReasoning && !contextOnly)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Build prompt:                              │
        │  "You are RecallOS. A user asked:           │
        │   '{normalizedQuery}'                       │
        │   Their memories matched include:           │
        │   #1 {summary1}                             │
        │   #2 {summary2}                             │
        │   ...                                       │
        │   Write one-sentence meta-summary that      │
        │   links them causally/temporally."          │
        │                                             │
        │  aiProvider.generateContent(prompt)         │
        │  Timeout: 10 seconds                        │
        │                                             │
        │  Returns: metaSummary string                │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. AI ANSWER GENERATION (if !contextOnly)                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Build prompt with evidence:                │
        │  "Answer the user's query using evidence    │
        │   notes, insert bracketed numeric citations │
        │   like [1], [2].                            │
        │   Rules:                                    │
        │   - Concise (2-4 sentences)                 │
        │   - Plain text only                         │
        │                                             │
        │   User query: '{normalizedQuery}'           │
        │   Evidence notes:                           │
        │   - [1] {date} {summary1}                   │
        │   - [2] {date} {summary2}                   │
        │   ..."                                      │
        │                                             │
        │  aiProvider.generateContent(prompt)         │
        │  Timeout: 15 seconds                        │
        │                                             │
        │  Returns: answer string with [n] citations  │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Extract citations from answer:             │
        │  - Regex: /\[(\d+)\]/g                      │
        │  - Build ordered list of cited memories     │
        │  - Map label → memory_id, title, url        │
        │                                             │
        │  On error:                                  │
        │  - Fallback: "Found N memories about X.     │
        │    [1] Title1, [2] Title2..."               │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. CONTEXT GENERATION (if contextOnly)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Format results as plain text:              │
        │  "Memory 1 (2024-01-15):                    │
        │   Title: {title}                            │
        │   URL: {url}                                │
        │   Summary: {summary}                        │
        │                                             │
        │   Memory 2 (2024-01-16):                    │
        │   ..."                                      │
        │                                             │
        │  No AI processing, return as 'context' field│
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. PERSIST QUERY EVENT                                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  prisma.queryEvent.create({                 │
        │    wallet,                                  │
        │    query: normalizedQuery,                  │
        │    embedding_hash,                          │
        │    meta_summary: answer || metaSummary      │
        │  })                                         │
        │                                             │
        │  Returns: queryEvent with id                │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  prisma.queryRelatedMemory.createMany([     │
        │    {                                        │
        │      query_event_id,                        │
        │      memory_id: result1.id,                 │
        │      rank: 1,                               │
        │      score: result1.score                   │
        │    },                                       │
        │    ...                                      │
        │  ])                                         │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 11. OPTIONAL ON-CHAIN ANCHORING (if enableAnchoring)                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Async (setImmediate):                      │
        │  - anchorMetaSummary(answer || metaSummary) │
        │  - Returns: availHash                       │
        │  - Update queryEvent.avail_hash             │
        │                                             │
        │  Failures silently ignored                  │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 12. BUILD RESPONSE                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Return to client:                          │
        │  {                                          │
        │    query: normalizedQuery,                  │
        │    results: [                               │
        │      {                                      │
        │        memory_id, title, summary, url,      │
        │        timestamp, avail_hash,               │
        │        related_memories: [...],             │
        │        score: 0.85                          │
        │      },                                     │
        │      ...                                    │
        │    ],                                       │
        │    meta_summary: "Your memories show...",   │
        │    answer: "Based on your memories, you've  │
        │             explored [1], studied [2]...",  │
        │    citations: [                             │
        │      { label: 1, memory_id, title, url },   │
        │      { label: 2, memory_id, title, url }    │
        │    ],                                       │
        │    context: "..." // if contextOnly         │
        │  }                                          │
        └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ END OF SEARCH FLOW                                                  │
│ Total time: 2-5 seconds (fast path) to 20-30 seconds (with AI)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Gas Deposit Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER DEPOSITS GAS                                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  User's wallet calls:                       │
        │  contract.depositGas({ value: "0.01 ETH" }) │
        │                                             │
        │  Contract:                                  │
        │  - Require msg.value >= MIN_DEPOSIT (0.001) │
        │  - userGasDeposits[msg.sender] += msg.value │
        │  - Emit GasDeposited event                  │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. MEMORY INGESTION (User submits via extension/client)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  API receives memory, processes it          │
        │  Calls blockchain.storeMemoryBatch()        │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. RELAYER SUBMITS TRANSACTION                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  1. Check user balance:                     │
        │     contract.getUserGasBalance(userAddress) │
        │                                             │
        │  2. Estimate gas:                           │
        │     contract.storeMemoryBatch.estimateGas() │
        │     gasLimit = estimate * 1.2 (20% buffer)  │
        │                                             │
        │  3. Get gas price:                          │
        │     provider.getFeeData()                   │
        │     gasPrice = feeData.gasPrice * 1.2       │
        │                                             │
        │  4. Calculate cost:                         │
        │     estimatedCost = gasPrice * gasLimit     │
        │                                             │
        │  5. Verify user has sufficient balance:     │
        │     if (userBalance < estimatedCost) throw  │
        │                                             │
        │  6. Build and sign transaction:             │
        │     - from: relayerWallet.address           │
        │     - to: contractAddress                   │
        │     - data: storeMemoryBatch encoded        │
        │     - gasPrice, gasLimit                    │
        │                                             │
        │  7. Submit to network:                      │
        │     tx = await relayerWallet.sendTransaction│
        │     receipt = await tx.wait()               │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CONTRACT EXECUTION                                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Contract storeMemoryBatch():               │
        │                                             │
        │  1. Verify authorized relayer:              │
        │     require(authorizedRelayers[msg.sender]) │
        │                                             │
        │  2. Identify user via tx.origin             │
        │                                             │
        │  3. Store memory data:                      │
        │     - Loop through hashes, urlHashes,       │
        │       timestamps                            │
        │     - Verify each hash not already stored   │
        │     - Push to userMemories[tx.origin]       │
        │     - Increment userMemoryCount             │
        │     - Set memoryExists and memoryOwner      │
        │     - Emit MemoryStored events              │
        │                                             │
        │  4. Calculate actual gas used:              │
        │     gasUsed = gasStart - gasleft() + 21000  │
        │     gasCost = tx.gasprice * gasUsed * 1.2   │
        │                                             │
        │  5. Deduct from user deposit:               │
        │     require(userGasDeposits[tx.origin] >=   │
        │             gasCost)                        │
        │     userGasDeposits[tx.origin] -= gasCost   │
        │     emit GasDeducted                        │
        │                                             │
        │  6. Emit MemoryBatchStored event            │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. API RECEIVES CONFIRMATION                                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Extract from receipt:                      │
        │  - transactionHash                          │
        │  - blockNumber                              │
        │  - gasUsed                                  │
        │  - status (1 = success, 0 = reverted)       │
        │                                             │
        │  Return { success: true, txHash,            │
        │           blockNumber, gasUsed }            │
        └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 6. USER WITHDRAWAL (Optional)                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  User calls: contract.withdrawGas(amount)   │
        │                                             │
        │  Contract:                                  │
        │  1. Check balance:                          │
        │     require(userGasDeposits[msg.sender] >=  │
        │             amount)                         │
        │                                             │
        │  2. Check daily limit:                      │
        │     currentDay = block.timestamp / 1 day    │
        │     if (lastWithdrawalTime < currentDay):   │
        │       dailyWithdrawalAmount = 0             │
        │     require(dailyWithdrawalAmount + amount  │
        │             <= MAX_WITHDRAWAL_PER_DAY)      │
        │                                             │
        │  3. Deduct and transfer:                    │
        │     userGasDeposits[msg.sender] -= amount   │
        │     dailyWithdrawalAmount += amount         │
        │     lastWithdrawalTime = block.timestamp    │
        │     msg.sender.call{value: amount}("")      │
        │                                             │
        │  4. Emit GasWithdrawn event                 │
        └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ GAS DEPOSIT LIFECYCLE COMPLETE                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Vite, Tailwind CSS, TypeScript, Three.js, React Three Fiber, wagmi, viem, ConnectKit |
| **Browser Extension** | Vanilla JS/TS, Chrome Extension API V3, ESBuild |
| **API Server** | Node.js, Express.js, TypeScript, Prisma ORM, Bull Queue |
| **AI/ML** | Google Gemini API, Ollama (local), pgvector |
| **Database** | PostgreSQL 14+, pgvector extension |
| **Blockchain** | Ethereum Sepolia, Ethers.js v6, Solidity 0.8.24, Hardhat, OpenZeppelin |
| **Queue** | Redis, Bull |
| **SDK** | TypeScript, Axios/Fetch |
| **MCP** | Model Context Protocol SDK |
| **Testing** | Jest (API), Foundry (contracts) |
| **Deployment** | Vercel (client), Railway/Render (API), Docker (PostgreSQL), Etherscan (contract verification) |

---

## Environment Variables Reference

### API (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/recallos?schema=public

# AI Provider
AI_PROVIDER=hybrid
GEMINI_API_KEY=your_gemini_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=all-minilm:l6-v2
OLLAMA_GEN_MODEL=llama3.1:8b

# Blockchain
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
RELAYER_PRIVATE_KEY=0x...
MEMORY_REGISTRY_CONTRACT_ADDRESS=0x...

# Search
SEARCH_TOP_K=10
SEARCH_ENABLE_REASONING=true
SEARCH_EMBED_SALT=recallos

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3000
NODE_ENV=development
```

### Client (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_CHAIN_ID=11155111
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Contract (.env)
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## Performance Metrics

### Ingestion
- **Synchronous**: 2-5 seconds (includes blockchain confirmation)
- **Async processing**: 5-30 seconds (embeddings + mesh)
- **Throughput**: ~10-20 memories/minute (limited by AI provider)

### Search
- **Vector similarity**: < 100ms (pgvector HNSW index)
- **AI answer generation**: 5-15 seconds (Gemini API)
- **Total search time**: 5-20 seconds

### Blockchain
- **Transaction confirmation**: 15-30 seconds on Sepolia
- **Gas cost per memory**: ~50,000-100,000 gas
- **Batch efficiency**: ~30% savings for 10+ memories

### Database
- **Memory count**: 1M+ memories supported
- **Relations count**: 10M+ edges supported
- **Query performance**: < 100ms for indexed queries
- **Full-text search**: < 200ms with pgvector

---

## Security Considerations

1. **User Authentication**: Wallet address verification (no password storage)
2. **Data Isolation**: User-scoped queries with user_id filtering
3. **SQL Injection**: Parameterized queries via Prisma
4. **XSS Prevention**: React auto-escaping, no dangerouslySetInnerHTML
5. **CORS**: Restricted origins in production
6. **Rate Limiting**: To be implemented (per-wallet limits)
7. **Gas Deposit Security**: Daily withdrawal limits, authorized relayers only
8. **Private Key Management**: Environment variables, never logged
9. **AI Input Sanitization**: Length limits, content validation
10. **Blockchain Verification**: On-chain hashes provide tamper-evidence

