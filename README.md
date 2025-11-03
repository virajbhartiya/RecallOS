# RecallOS - Personal Memory System

> An AI-powered knowledge graph for capturing, organizing, and retrieving your digital context.
<img width="1920" height="1080" alt="Screenshot 2025-10-24 at 1 38 06 AM" src="https://github.com/user-attachments/assets/c4d5a12a-fb3f-4e41-8c8a-4b02bb081884" />

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis (for background jobs)
- Gemini API key or Ollama (for AI)

### 1. Database Setup

```bash
# Install PostgreSQL with pgvector
# macOS
brew install postgresql@14
brew install pgvector

# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb recallos
psql recallos -c 'CREATE EXTENSION vector;'
```

### 2. API Setup

```bash
cd api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
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
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
     ┌────▼─────┐ ┌────▼─────┐┌────▼─────┐ ┌────▼─────┐
     │ Memory   │ │ Search   ││ Content  │ │   Auth   │
     │Controller│ │Controller││Controller│ │Controller│
     └────┬─────┘ └────┬─────┘└────┬─────┘ └────┬─────┘
          │            │           │            │
          └────────────┴───────────┴────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
    ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼─────┐
    │   AI    │  │ Memory  │ │ Memory  │ │   JWT    │
    │Provider │  │  Mesh   │ │ Search  │ │  Utils   │
    └────┬────┘  └────┬────┘ └────┬────┘ └────┬─────┘
         │            │           │           │
         └────────────┴───────────┴───────────┘
                                    │
          ┌─────────────┬───────────┼───────────┬─────────────┐
          │             │           │           │             │
     ┌────▼─────┐  ┌────▼─────┐ ┌────▼────┐
     │PostgreSQL│  │ pgvector │ │  Redis  │
     │ Database │  │Embeddings│ │ Queue   │
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
- **Vector Similarity**: pgvector-powered fast search
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
- PostgreSQL 14+
- pgvector extension for vector similarity
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

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (email/password)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/extension-token` - Generate token for extension
- `POST /api/auth/session` - Set session cookie (demo)
- `DELETE /api/auth/session` - Clear session cookie

### Memory Management
- `POST /api/memory/process` - Queue content for processing (authenticated)
- `POST /api/memory/` - Store new memory (authenticated)
- `POST /api/memory/batch` - Store multiple memories (authenticated)
- `GET /api/memory/user/:userId/recent` - Get recent memories (authenticated)
- `GET /api/memory/user/:userId/count` - Get memory count (authenticated)
- `GET /api/memory/user/:userId/memory/:index` - Get memory by index (authenticated)
- `GET /api/memory/hash/:hash` - Get memory by hash (authenticated)
- `GET /api/memory/insights` - Analytics and insights (authenticated)
- `GET /api/memory/transactions` - Memories with transaction details (authenticated)
- `POST /api/memory/retry-failed` - Retry failed transactions (authenticated)

### Memory Mesh
- `GET /api/memory/mesh/:userId` - Get full graph (authenticated)
- `GET /api/memory/relations/:memoryId` - Get memory with edges (authenticated)
- `GET /api/memory/cluster/:memoryId` - Get memory cluster (authenticated)

### Search
- `POST /api/search` - Semantic search with AI answer (authenticated)
- `GET /api/search/job/:id` - Search job status
- `POST /api/search/context` - Context-only search
- `GET /api/memory/search` - Keyword search (authenticated)
- `GET /api/memory/search-embeddings` - Semantic search with filters (authenticated)
- `GET /api/memory/search-hybrid` - Hybrid search (authenticated)

### Content Queue
- `POST /api/content/submit` - Queue content for processing (authenticated)
- `GET /api/content/:user_id` - Get processed content (authenticated)

---

## Usage

### Capturing Memories

**Via Browser Extension:**
1. Install and configure extension
2. Browse the web normally
3. Extension auto-captures pages you visit
4. Check web client to see captured memories

**Via Web Client:**
1. Register or login to your account
2. Navigate to Memories page
3. Click "Add Memory" button
4. Paste content or URL
5. Submit for processing

**Via SDK:**
```typescript
import { createRecallOSClient } from '@recallos/sdk'

const client = createRecallOSClient({
  baseURL: 'http://localhost:3000',
  token: 'your-jwt-token'
})

await client.memory.process({
  content: 'Your content here...',
  url: 'https://example.com',
  title: 'Example Page',
  metadata: { source: 'sdk' }
})
```

### Searching Memories

**Web Client:**
1. Navigate to Search page
2. Enter query: "machine learning algorithms"
3. View AI-generated answer with citations
4. Click citations to view source memories
5. Export context for ChatGPT if needed

**API:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "machine learning",
    "limit": 10
  }'
```

**SDK:**
```typescript
const results = await client.search.search({
  query: 'machine learning',
  limit: 10
})

console.log(results.answer) // AI-generated answer
console.log(results.citations) // Source memories
```

### Viewing Memory Mesh

**Web Client:**
1. Navigate to Memories page
2. Click "View Mesh" button
3. Interact with 3D force-directed graph
4. Zoom, pan, click nodes
5. Nodes colored by source type
6. Edge thickness = similarity strength

**API:**
```bash
curl http://localhost:3000/api/memory/mesh/YOUR_USER_ID?limit=50&threshold=0.3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Authentication

**Web Client:**
1. Navigate to Login page
2. Register with email/password or login with existing account
3. Session cookie is automatically set
4. All API requests include authentication automatically

**API:**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }' \
  -c cookies.txt

# Use session cookie for authenticated requests
curl http://localhost:3000/api/memory/insights \
  -b cookies.txt
```

---

## Development

### Running Tests

**API:**
```bash
cd api
npm test
```

### Code Formatting

```bash
# API
cd api
npm run format

# Client
cd client
npx prettier --write .

# Extension
cd extension
npm run format
```

### Database Migrations

```bash
cd api

# Create new migration
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Reset database (WARNING: deletes all data)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

---

## Deployment

### API (Railway/Render)
1. Create PostgreSQL database with pgvector
2. Create Redis instance
3. Set environment variables
4. Deploy from GitHub
5. Run migrations: `npm run db:deploy`

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

### Extension not capturing
- Check extension is enabled
- Verify API endpoint is correct
- Check authentication token is set
- Look for errors in browser console
- Ensure content is > 50 characters

### Search returns no results
- Verify user has memories stored
- Check authentication token is valid
- Ensure embeddings were generated
- Review API logs for errors
- Try different search query

### Authentication failed
- Verify email and password are correct
- Check JWT_SECRET is set in API environment
- Ensure cookies are enabled in browser
- Check CORS configuration allows your origin
- Review API logs for authentication errors

### AI processing slow
- Gemini API may be rate-limited
- Try switching to Ollama (local)
- Check network connection
- Review AI_PROVIDER setting
- Increase timeouts if needed

### Database connection failed
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure pgvector extension is installed
- Test connection with psql
- Review database logs

---

## Performance

### Ingestion
- **Synchronous**: 2-5 seconds
- **Async processing**: 5-30 seconds
- **Throughput**: 10-20 memories/minute

### Search
- **Vector similarity**: < 100ms
- **AI answer**: 5-15 seconds
- **Total**: 5-20 seconds

### Database
- **Memory capacity**: 1M+ memories
- **Relations capacity**: 10M+ edges
- **Query performance**: < 100ms

---

## Security

- **Authentication**: JWT-based with secure password hashing (bcryptjs)
- **Session Management**: HttpOnly, Secure cookies for web clients
- **Data Isolation**: User-scoped queries with authentication middleware
- **SQL Injection**: Prevented via Prisma ORM
- **XSS**: React auto-escaping
- **CORS**: Allowlisted origins with credentials support
- **Rate Limiting**: To be implemented
- **Password Security**: Hashed with 12 salt rounds

---

## Cookies, CORS, and Local HTTPS

- API issues `HttpOnly; Secure; SameSite=None` session cookies on your domain.
- CORS echoes only allowlisted origins and enables `credentials: true`.
- SPA uses `axios` with `withCredentials: true`; extension uses `fetch` with `credentials: 'include'`.

### Environment variables
- API: `SESSION_COOKIE_NAME`, `COOKIE_DOMAIN`, `CORS_ALLOWED_ORIGINS`, `EXTENSION_IDS`, `COOKIE_SECURE`, `HTTPS_ENABLE`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`.
- Client: `VITE_SERVER_URL`, `VITE_HTTPS_ENABLE`, `VITE_HTTPS_KEY_PATH`, `VITE_HTTPS_CERT_PATH`, `VITE_DEV_HOST`, `VITE_DEV_PORT`.

### Local HTTPS (mkcert)
See `cookie.plan.md` for the full step-by-step. For dev HTTPS:
- API: set `HTTPS_ENABLE=true` and point to mkcert key/cert.
- Client: set `VITE_HTTPS_ENABLE=true` and point to mkcert key/cert.