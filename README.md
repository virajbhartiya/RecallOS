# Cognia - Personal Memory System

> An AI-powered knowledge graph for capturing, organizing, and retrieving your digital context.
<img width="1582" height="976" alt="Screenshot 2025-11-04 at 2 17 22 AM" src="https://github.com/user-attachments/assets/3f42dfd1-237a-41a6-81bc-dc7635307a8e" />

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Gemini API key or Ollama (for AI)

### 1. Start Databases

```bash
cd api
docker compose up -d
```

This starts PostgreSQL, Qdrant, and Redis. Qdrant will be available at `http://localhost:6333` (web UI) and `http://localhost:6334` (gRPC).

The API will automatically create the `memory_embeddings` collection on startup with the configured embedding dimension and payload indexes.

### 2. API Setup

```bash
cd api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - QDRANT_URL (default: http://localhost:6333)
# - QDRANT_API_KEY (optional, for production)
# - EMBEDDING_DIMENSION (default: 768)
# - REDIS_URL
# - GEMINI_API_KEY (or OLLAMA_BASE_URL)
# - JWT_SECRET
# - SESSION_COOKIE_NAME
# - COOKIE_DOMAIN
# - CORS_ALLOWED_ORIGINS

# Run migrations
npm run db:migrate

# Start API server
npm start
# Server runs on http://localhost:3000
```

### 3. Web Client Setup

```bash
cd client

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with:
# - VITE_API_URL=http://localhost:3000

# Start development server
npm run dev
# Client runs on http://localhost:5173
```

### 4. Browser Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Build extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select extension/dist folder

# Configure extension:
# 1. Click extension icon
# 2. Enter API endpoint: http://localhost:3000/api/memory/process
# 3. Extension will automatically authenticate
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                          │
├─────────────────────────────────────────────────────────────────┤
│  Browser Extension  │   Web Client (React)    │   SDK/MCP       │
└──────────┬──────────┴────────────┬────────────┴──────────┬──────┘
           │                       │                       │
           └───────────────────────┼───────────────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │   Express.js API Server   │
                     │  (Controllers & Routes)   │
                     │   Authentication (JWT)    │
                     └─────────────┬─────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┐
         │             │           │           │             
     ┌────▼─────┐ ┌────▼─────┐┌────▼─────┐ ┌────▼─────┐
     │ Memory   │ │ Search   ││ Content  │ │   Auth   │
     │Controller│ │Controller││Controller│ │Controller│
     └────┬─────┘ └────┬─────┘└────┬─────┘ └────┬─────┘
          │            │           │            │
          └────────────┴───────────┴────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┐
         │             │           │           │             
    ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼─────┐
    │   AI    │  │ Memory  │ │ Memory  │ │   JWT    │
    │Provider │  │  Mesh   │ │ Search  │ │  Utils   │
    └────┬────┘  └────┬────┘ └────┬────┘ └────┬─────┘
         │            │           │           │
         └────────────┴───────────┴───────────┘
                        │
          ┌─────────────┬───────────┐
          │             │           │
     ┌────▼─────┐  ┌────▼─────┐ ┌────▼─────┐
     │PostgreSQL│  │ Qdrant   │ │  Redis  │
     │ Database │  │Vectors   │ │ Queue   │
     └──────────┘  └──────────┘ └─────────┘
```

---

## Core Features

### 1. Intelligent Capture
- **Browser Extension**: Automatic capture of web content as you browse
- **Smart Deduplication**: Prevents storing the same content twice
- **Privacy-Aware**: Detects and adapts to privacy extensions
- **Multi-Source**: Extension, web client, SDK, or MCP integration

### 2. AI-Powered Processing
- **Hybrid AI**: Gemini (cloud) → Ollama (local) → Deterministic fallback
- **Summarization**: Concise, actionable summaries (≤200 words)
- **Metadata Extraction**: Topics, categories, sentiment, importance
- **Vector Embeddings**: 768-dimensional semantic representations

### 3. Knowledge Graph (Memory Mesh)
- **Semantic Relations**: Content similarity via embeddings (≥0.3 threshold)
- **Topical Relations**: Weighted metadata overlap
- **Temporal Relations**: Time-based proximity with decay
- **Force-Directed Visualization**: 3D graph in web client

### 4. Semantic Search
- **Vector Similarity**: Qdrant-powered fast vector search
- **AI Answers**: GPT-style responses with inline citations [1], [2]
- **Meta Summaries**: Contextual overview across results
- **Hybrid Mode**: Blends keyword (40%) + semantic (60%) search
- **Context Export**: Format results for ChatGPT/Claude

### 5. User Authentication
- **JWT-based Auth**: Secure token-based authentication
- **Email/Password**: Traditional login and registration
- **Session Cookies**: HttpOnly, Secure cookies for web clients
- **Extension Auth**: Automatic token generation for browser extensions
- **User Isolation**: All memories are user-scoped and protected

### 6. Analytics & Insights
- **Memory Stats**: Total count, processing status
- **Topic Analysis**: Top topics, categories, sentiment distribution
- **Processing Monitoring**: Track processing states and status

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS
- Three.js + React Three Fiber for 3D graph
- @xyflow/react for 2D graph

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM
- BullMQ (Redis) for job queue
- JWT for authentication
- bcryptjs for password hashing

### Database
- PostgreSQL 14+ (relational data only)
- Qdrant vector database for embeddings storage and search
- Redis for job queue

### AI/ML
- Google Gemini API (text-embedding-004)
- Ollama (local alternative)
- Deterministic fallback embeddings

### Tools
- ESBuild (extension bundling)
- Jest (API testing)
- Prettier (code formatting)

---

## Usage

Cognia provides multiple ways to capture and interact with your knowledge:

- **Browser Extension**: Automatically captures web content as you browse, with smart deduplication and privacy-aware detection
- **Web Client**: Manual memory entry with rich editing and visualization tools
- **SDK/MCP Integration**: Programmatic access for custom integrations and automation

Once captured, memories are automatically processed with AI-powered summarization, metadata extraction, and vector embeddings. The system builds a knowledge graph connecting related memories through semantic, topical, and temporal relationships.

Search your knowledge base using natural language queries. The system performs semantic search across vector embeddings and generates AI-powered answers with inline citations to source memories. Results can be exported for use with ChatGPT or Claude.

Visualize your knowledge as an interactive 3D force-directed graph, where nodes represent memories and edges show relationships. The graph is color-coded by source type and edge thickness indicates relationship strength.

---

## Development

**Tests**: `cd api && npm test`

**Formatting**: `npm run format` (api/extension) or `npx prettier --write .` (client)

**Database**: `npm run db:migrate` (migrations), `npm run db:generate` (Prisma client), `npm run db:studio` (Prisma Studio), `npm run db:reset` (⚠️ deletes all data)

**Qdrant**: `npm run clean:qdrant` (⚠️ deletes embeddings), `npm run clean:all` (⚠️ deletes everything)

---

## Deployment

### API (Railway/Render)
1. Create PostgreSQL database
2. Deploy Qdrant instance (or use Qdrant Cloud)
3. Create Redis instance
4. Set environment variables (including QDRANT_URL, QDRANT_API_KEY if using Qdrant Cloud)
5. Deploy from GitHub
6. Run migrations: `npm run db:deploy`

### Client (Vercel)
1. Import GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy

### Extension (Chrome Web Store)
1. Build extension: `npm run build`
2. Create ZIP of `dist/` folder
3. Upload to Chrome Web Store Developer Dashboard
4. Submit for review

---

## Troubleshooting

**Extension not capturing**: Verify extension is enabled, API endpoint is correct, and authentication token is set. Check browser console for errors.

**Search returns no results**: Ensure memories exist, embeddings were generated, and authentication is valid. Review API logs.

**Authentication failed**: Verify credentials, check JWT_SECRET is set, ensure cookies are enabled, and review CORS configuration.

**AI processing slow**: Gemini API may be rate-limited. Try switching to Ollama (local) or check network connection.

**Database/Qdrant connection failed**: Verify services are running, check connection URLs, and review service logs. For Qdrant, check `http://localhost:6333/health`.

---

## Performance

- **Ingestion**: 2-5s synchronous, 5-30s async processing, 10-20 memories/minute throughput
- **Search**: <100ms vector similarity (Qdrant), 5-15s AI answer generation
- **Database**: 1M+ memories, 10M+ relations, <100ms query performance

---

## Security

JWT-based authentication with bcryptjs password hashing (12 rounds). HttpOnly, Secure session cookies for web clients. User-scoped data isolation via authentication middleware. SQL injection prevented via Prisma ORM. XSS protection via React auto-escaping. CORS with allowlisted origins and credentials support.

**Cookies & CORS**: API issues `HttpOnly; Secure; SameSite=None` cookies. CORS allows only configured origins with `credentials: true`. For local HTTPS, see `cookie.plan.md` or set `HTTPS_ENABLE=true` with mkcert key/cert paths.
