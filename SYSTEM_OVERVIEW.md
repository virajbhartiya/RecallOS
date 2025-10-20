# RecallOS System Overview

## What is RecallOS?

RecallOS is a decentralized personal memory management system that captures, processes, organizes, and retrieves user context from various sources. It combines AI-powered processing with blockchain verification to create a permanent, searchable knowledge graph of your digital experiences.

## Core Capabilities

### 1. **Automatic Context Capture**
- Browser extension captures web content automatically
- Manual capture via web client
- SDK integration for custom applications
- Support for multiple content types (web pages, documentation, social media, etc.)

### 2. **AI-Powered Processing**
- **Summarization**: Concise summaries of captured content
- **Metadata Extraction**: Topics, categories, key points, sentiment analysis
- **Vector Embeddings**: 768-dimensional semantic representations
- **Smart Deduplication**: Prevents storing duplicate content within 24 hours

### 3. **Blockchain Verification**
- Content hashes stored on Sepolia testnet
- Immutable proof of capture timestamp
- Gas deposit system for users
- Authorized relayer architecture for gasless transactions
- Full transaction tracking (status, block number, gas used)

### 4. **Semantic Search**
- Vector similarity search using pgvector
- AI-generated answers with inline citations
- Contextual meta-summaries across memories
- Hybrid keyword + semantic search
- Filter by category, topic, sentiment, transaction status, date range

### 5. **Memory Mesh (Knowledge Graph)**
- **Semantic Relations**: Based on content embedding similarity (≥0.3 threshold)
- **Topical Relations**: Weighted overlap of topics, categories, key points
- **Temporal Relations**: Time-based proximity with decay functions
- Force-directed graph layout for visualization
- Cluster detection by source type (extension, github, meet, on-chain)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                          │
├─────────────────────────────────────────────────────────────────┤
│  Browser Extension  │   Web Client (React)   │   SDK/MCP       │
└──────────┬──────────┴────────────┬────────────┴──────────┬──────┘
           │                       │                       │
           └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Express.js API Server   │
                    │  (Controllers & Routes)   │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
   ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌────▼────┐
   │ Memory  │  │ Search  │ │ Content │ │ Deposit │  │Blockscout│
   │Controller│  │Controller│ │Controller│ │Controller│  │Controller│
   └────┬────┘  └────┬────┘ └────┬────┘ └────┬────┘  └────┬────┘
        │            │           │           │             │
        └────────────┴───────────┴───────────┴─────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
   ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌────▼────┐
   │   AI    │  │ Memory  │ │ Memory  │ │Blockchain│  │Blockscout│
   │Provider │  │  Mesh   │ │ Search  │ │ Service  │  │  Prefetch│
   └────┬────┘  └────┬────┘ └────┬────┘ └────┬────┘  └────┬────┘
        │            │           │           │             │
        └────────────┴───────────┴───────────┴─────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
   ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌────▼────┐
   │PostgreSQL│  │ pgvector│ │  Redis  │ │ Sepolia │  │ Blockscout│
   │ Database │  │Embeddings│ │ Queue   │ │Blockchain│  │   API    │
   └─────────┘  └─────────┘ └─────────┘ └─────────┘  └─────────┘
```

## Key Components

### 1. Browser Extension
- **Technology**: Vanilla JS, Chrome Extension API
- **Function**: Captures web content from active tabs
- **Features**:
  - Automatic capture on tab switch/page load
  - Privacy extension detection and handling
  - Wallet address integration
  - Configurable API endpoint

### 2. Express.js API
- **Technology**: Node.js, Express, TypeScript
- **Routes**:
  - `/api/memory/*` - Memory CRUD and blockchain operations
  - `/api/search` - Semantic search with AI answers
  - `/api/content` - Queued content processing
  - `/api/deposit` - Gas deposit management
  - `/api/blockscout` - Transaction monitoring
- **Middleware**: CORS, compression, Morgan logging, error handling

### 3. AI Provider Service
- **Hybrid Architecture**: Gemini (primary) → Ollama (fallback) → Deterministic (last resort)
- **Capabilities**:
  - Text summarization (≤200 words)
  - Metadata extraction (topics, categories, sentiment, importance)
  - Vector embeddings (768 dimensions)
  - Semantic clustering with domain awareness
- **Fallback Strategy**: Multi-tier with heuristic extraction for offline resilience

### 4. PostgreSQL + pgvector
- **Database Schema**:
  - `users` - Wallet addresses
  - `memories` - Core content storage with metadata JSONB
  - `embeddings` - Audit trail of generated vectors
  - `memory_embeddings` - pgvector index for fast similarity search
  - `memory_relations` - Graph edges (semantic, topical, temporal)
  - `memory_snapshots` - Point-in-time content snapshots
  - `query_events` - Search history
  - `blockscout_transactions` - Transaction finality tracking
- **Indexes**: Vector similarity, user lookups, hash uniqueness

### 5. Smart Contract (Sepolia)
- **Contract**: RecallOSMemoryRegistry (UUPS Upgradeable)
- **Features**:
  - Memory hash storage (sha256 of summary)
  - URL hash storage (keccak256 of URL)
  - Gas deposit management
  - Authorized relayer system
  - Batch operations
  - Daily withdrawal limits
- **Gas Model**: Users deposit ETH, relayer deducts per transaction with 20% buffer

### 6. Memory Mesh Service
- **Graph Construction**:
  - Generates 3 embedding types: content, summary, title
  - Computes semantic similarity via cosine distance
  - Analyzes topical overlap with weighted scoring
  - Calculates temporal proximity with decay
- **Quality Control**:
  - Deduplication by highest similarity
  - Mutual k-NN pruning (k=3)
  - Degree caps to prevent super-nodes
  - Domain-aware penalties (e.g., GitHub ↔ Meet)
  - Optional AI validation for low-confidence edges

### 7. Search Service
- **Query Processing**:
  1. Generate embedding for user query
  2. pgvector cosine similarity search
  3. Relevance filtering (score > 0.01, keyword validation)
  4. AI-generated meta-summary of results
  5. Short-form answer with [n] citations
  6. Context generation for external AI tools
- **Search Modes**:
  - **Semantic**: Pure vector similarity
  - **Keyword**: Traditional text matching
  - **Hybrid**: Blended (40% keyword, 60% semantic)
  - **Context-only**: Returns formatted context without AI answer

### 8. SDK
- **Technology**: TypeScript, HTTP client
- **Modules**:
  - `MemoryClient` - Memory CRUD
  - `SearchClient` - Search operations
  - `ContentClient` - Content submission
  - `BlockscoutClient` - Transaction queries
- **Usage**: Programmatic access to all API features

### 9. MCP Server
- **Technology**: Model Context Protocol SDK
- **Purpose**: Exposes RecallOS as tools for AI assistants (Claude, ChatGPT)
- **Transports**: stdio (local) and HTTP/WebSocket (server)
- **Tools**: Memory operations, search, mesh queries, blockchain verification

### 10. Web Client
- **Technology**: React, Vite, Tailwind, wagmi/viem for Web3
- **Pages**:
  - **Landing**: System overview, recent memories, stats
  - **Memories**: Full memory list with filtering, transaction details
  - **Search**: Semantic search interface with AI answers
  - **Mesh**: Interactive 3D force-directed graph (Three.js, React Three Fiber)
- **Features**:
  - Wallet connection (ConnectKit)
  - Memory insights dashboard
  - Transaction status tracking
  - Deposit management

## Data Flow

### Memory Ingestion Flow
```
1. Browser Extension captures page content
   ↓
2. POST /api/memory/processRawContent
   ↓
3. AI Provider: Parallel summarization + metadata extraction
   ↓
4. Generate hashes (sha256 summary, keccak256 URL)
   ↓
5. Check for duplicates (same hash or URL within 24h)
   ↓
6. Create memory in PostgreSQL
   ↓
7. Blockchain: storeMemoryBatch (via relayer, deducts gas deposit)
   ↓
8. Update memory with tx_hash, block_number, status
   ↓
9. [Async] Create snapshot, generate embeddings, build relations
   ↓
10. Return success with transaction details
```

### Search Flow
```
1. User submits query
   ↓
2. POST /api/search
   ↓
3. Generate query embedding
   ↓
4. pgvector similarity search (cosine distance)
   ↓
5. Filter by relevance (score threshold, keyword validation)
   ↓
6. AI meta-summary generation
   ↓
7. AI short answer with inline citations [1], [2]
   ↓
8. Persist query event and related memories
   ↓
9. Optional: Anchor meta-summary on-chain
   ↓
10. Return results with answer, citations, meta-summary
```

### Memory Mesh Flow
```
1. Memory created and embeddings generated
   ↓
2. Find semantic relations (cosine similarity ≥ 0.3)
   ↓
3. Find topical relations (weighted metadata overlap)
   ↓
4. Find temporal relations (time proximity with decay)
   ↓
5. Merge and deduplicate relations
   ↓
6. Optional: AI validation of low-confidence edges
   ↓
7. Prune with mutual k-NN and degree caps
   ↓
8. Persist to memory_relations table
   ↓
9. Available for graph visualization and cluster queries
```

## Use Cases

1. **Personal Knowledge Base**: Capture and search all your research, articles, documentation
2. **Developer Context**: Track GitHub issues, PRs, documentation, Stack Overflow answers
3. **Job Search**: Save job postings, company research, application status
4. **Learning**: Organize educational content, tutorials, courses
5. **Content Creation**: Research aggregation for writing, video production
6. **Meeting Notes**: Capture Google Meet transcripts, link to related documents
7. **AI Assistant Context**: Export personal context to ChatGPT, Claude via MCP

## Privacy & Security

- **Local-first**: Extension captures only what you visit
- **User-controlled**: All data tied to your wallet address
- **Blockchain verification**: Immutable proof of capture
- **No tracking**: No third-party analytics or ads
- **Open source**: Full transparency, auditable code
- **Gas deposits**: You control transaction costs

## Future Enhancements

- Multi-chain support (Ethereum mainnet, Polygon, Arbitrum)
- Decentralized storage (IPFS, Arweave) for full content
- Cross-device sync via encrypted cloud backup
- Collaborative memory sharing and permissions
- Advanced AI features (question answering, memory synthesis)
- Mobile apps (iOS, Android)
- More content sources (email, Slack, Discord, Twitter)

