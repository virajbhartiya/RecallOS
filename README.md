# RecallOS - Decentralized Personal Memory System

> A blockchain-verified, AI-powered knowledge graph for capturing, organizing, and retrieving your digital context.
<img width="1920" height="1080" alt="Screenshot 2025-10-24 at 1 38 06 AM" src="https://github.com/user-attachments/assets/c4d5a12a-fb3f-4e41-8c8a-4b02bb081884" />

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis (for background jobs)
- Ethereum wallet (for deposits)
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
# - GEMINI_API_KEY (or OLLAMA_BASE_URL)
# - SEPOLIA_RPC_URL
# - RELAYER_PRIVATE_KEY
# - MEMORY_REGISTRY_CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602

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
# - VITE_WALLETCONNECT_PROJECT_ID

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
# 2. Enter API endpoint: http://localhost:3000/api/memory/processRawContent
# 3. Connect wallet
```

---

## Contract Addresses

### Sepolia Testnet (Current Deployment)

**Network:** Sepolia (Chain ID: 11155111)  
**Deployment Date:** October 21, 2025

| Component | Address | Description |
|-----------|---------|-------------|
| **Proxy (Main Contract)** | `0x40b55b9634fcf2454c138fa5ed914ac7044f931b` | Use this address for all integrations |
| **Contract Owner** | `0x01b7b2bC30c958bA3bC0852bF1BD4efB165281Ba` | Deployer address |

**Block Explorer:** [Etherscan](https://sepolia.etherscan.io/address/0x40b55b9634fcf2454c138fa5ed914ac7044f931b)

### Environment Configuration

Add to your `.env` file:
```bash
MEMORY_REGISTRY_CONTRACT_ADDRESS=0x40b55b9634fcf2454c138fa5ed914ac7044f931b
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
                     └─────────────┬─────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
     ┌────▼─────┐ ┌────▼─────┐┌────▼─────┐┌────▼─────┐  ┌────▼─────┐
     │ Memory   │ │ Search   ││ Content  ││ Deposit  │  │Blockscout│
     │Controller│ │Controller││Controller││Controller│  │Controller│
     └────┬─────┘ └────┬─────┘└────┬─────┘└────┬─────┘  └────┬─────┘
          │            │           │           │             │
          └────────────┴───────────┴───────────┴─────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
    ┌────▼────┐  ┌────▼────┐ ┌────▼────┐ ┌────▼─────┐  ┌────▼─────┐
    │   AI    │  │ Memory  │ │ Memory  │ │Blockchain│  │Blockscout│
    │Provider │  │  Mesh   │ │ Search  │ │ Service  │  │  Prefetch│
    └────┬────┘  └────┬────┘ └────┬────┘ └────┬─────┘  └────┬─────┘
         │            │           │           │             │
         └────────────┴───────────┴───────────┴─────────────┘
                                    │
          ┌─────────────┬───────────┼───────────┬─────────────┐
          │             │           │           │             │
     ┌────▼─────┐  ┌────▼─────┐ ┌────▼────┐ ┌────▼─────┐  ┌────▼──────┐
     │PostgreSQL│  │ pgvector │ │  Redis  │ │ Sepolia  │  │ Blockscout│
     │ Database │  │Embeddings│ │ Queue   │ │Blockchain│  │   API     │
     └──────────┘  └──────────┘ └─────────┘ └──────────┘  └───────────┘
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

### 5. Blockchain Verification
- **Sepolia Testnet**: On-chain memory hash storage
- **Gas Deposits**: Users deposit ETH, relayer submits transactions
- **Transaction Tracking**: Full tx_hash, block_number, gas_used
- **Immutable Proof**: Verifiable capture timestamps

### 6. Analytics & Insights
- **Memory Stats**: Total count, confirmed transactions
- **Topic Analysis**: Top topics, categories, sentiment distribution
- **Transaction Monitoring**: Track pending/confirmed/failed states
- **Retry Failed**: Automatic retry of failed blockchain writes

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS
- wagmi + viem for Web3
- ConnectKit for wallet connection
- Three.js + React Three Fiber for 3D graph
- @xyflow/react for 2D graph

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM
- Bull queue (Redis)
- Ethers.js v6

### Database
- PostgreSQL 14+
- pgvector extension for vector similarity
- Redis for job queue

### AI/ML
- Google Gemini API (text-embedding-004)
- Ollama (local alternative)
- Deterministic fallback embeddings

### Blockchain
- Ethereum Sepolia testnet
- Solidity 0.8.24
- OpenZeppelin upgradeable contracts
- Hardhat development environment

### Tools
- ESBuild (extension bundling)
- Jest (API testing)
- Foundry (contract testing)
- Prettier (code formatting)

---

## API Endpoints

### Memory Management
- `POST /api/memory/processRawContent` - Store new memory
- `GET /api/memory/:userAddress/recent` - Get recent memories
- `GET /api/memory/:userAddress/count` - Get memory count
- `GET /api/memory/getMemoryByHash/:hash` - Get memory by hash
- `GET /api/memory/insights` - Analytics and insights
- `GET /api/memory/transaction-details` - Memories with blockchain data
- `POST /api/memory/retry-failed` - Retry failed transactions

### Memory Mesh
- `GET /api/memory/:userAddress/mesh` - Get full graph
- `GET /api/memory/:memoryId/with-relations` - Get memory with edges
- `GET /api/memory/:memoryId/cluster` - Get memory cluster

### Search
- `POST /api/search` - Semantic search with AI answer
- `GET /api/search/job/:id` - Search job status
- `POST /api/search/context` - Context-only search
- `GET /api/memory/search` - Keyword search
- `GET /api/memory/search-embed` - Semantic search with filters
- `GET /api/memory/search-hybrid` - Hybrid search

### Content Queue
- `POST /api/content/submit` - Queue content for processing
- `GET /api/content/:user_id` - Get processed content

### Gas Deposits
- `GET /api/deposit/:userAddress/balance` - Check balance
- `GET /api/deposit/contract-address` - Get contract address
- `GET /api/deposit/estimate` - Estimate gas cost
- `GET /api/deposit/:userAddress/info` - Complete deposit info

### Blockchain
- `GET /api/blockscout/transaction/:txHash` - Get transaction
- `GET /api/blockscout/user/:userAddress/transactions` - User transactions

---

## Usage

### Capturing Memories

**Via Browser Extension:**
1. Install and configure extension
2. Browse the web normally
3. Extension auto-captures pages you visit
4. Check web client to see captured memories

**Via Web Client:**
1. Connect wallet
2. Navigate to Memories page
3. Click "Add Memory" button
4. Paste content or URL
5. Submit for processing

**Via SDK:**
```typescript
import { createRecallOSClient } from '@recallos/sdk'

const client = createRecallOSClient({
  baseURL: 'http://localhost:3000'
})

await client.memory.processRawContent({
  content: 'Your content here...',
  url: 'https://example.com',
  title: 'Example Page',
  userAddress: '0xYourWalletAddress',
  metadata: { source: 'sdk' }
})
```

### Searching Memories

**Web Client:**
1. Navigate to Search page
2. Enter query: "blockchain smart contracts"
3. View AI-generated answer with citations
4. Click citations to view source memories
5. Export context for ChatGPT if needed

**API:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xYourWalletAddress",
    "query": "blockchain",
    "limit": 10
  }'
```

**SDK:**
```typescript
const results = await client.search.search({
  wallet: '0xYourWalletAddress',
  query: 'blockchain',
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
curl http://localhost:3000/api/memory/0xYourWalletAddress/mesh?limit=50&threshold=0.3
```

### Managing Gas Deposits

**Web Client:**
1. Navigate to Deposit Manager
2. View current balance
3. Click "Deposit" to add funds
4. Approve transaction in wallet
5. Monitor balance decreases as memories are stored
6. Withdraw unused balance anytime (1 ETH/day limit)

**Smart Contract:**
```solidity
// Deposit (from user wallet)
contract.depositGas{ value: 0.01 ether }()

// Check balance
uint256 balance = contract.getUserGasBalance(userAddress)

// Withdraw
contract.withdrawGas(amountInWei)
```

---

## Development

### Running Tests

**API:**
```bash
cd api
npm test
```

**Smart Contract:**
```bash
cd contract
npx hardhat test
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

### Blockchain Development

```bash
cd contract

# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Verify on Etherscan
npx hardhat run scripts/verify.ts --network sepolia

# Upgrade contract (UUPS)
npx hardhat run scripts/upgrade.ts --network sepolia
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

### Smart Contract
1. Deploy to Sepolia: See [contract/DEPLOYMENT_GUIDE.md](contract/DEPLOYMENT_GUIDE.md)
2. Verify on Etherscan
3. Authorize relayer address
4. Fund relayer wallet
5. Update API with contract address

---

## Troubleshooting

### Extension not capturing
- Check extension is enabled
- Verify API endpoint is correct
- Check wallet address is set
- Look for errors in browser console
- Ensure content is > 50 characters

### Search returns no results
- Verify user has memories stored
- Check wallet address matches
- Ensure embeddings were generated
- Review API logs for errors
- Try different search query

### Blockchain transaction failed
- Check user has sufficient gas deposit
- Verify relayer is authorized
- Check Sepolia network status
- Review transaction on Etherscan
- Retry failed transaction via UI

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

### Blockchain
- **Confirmation**: 15-30 seconds on Sepolia
- **Gas per memory**: 50k-100k gas
- **Batch savings**: ~30% for 10+ memories

---

## Security

- **Authentication**: Wallet-based, no passwords
- **Data Isolation**: User-scoped queries
- **SQL Injection**: Prevented via Prisma
- **XSS**: React auto-escaping
- **Rate Limiting**: To be implemented
- **Gas Deposits**: Daily withdrawal limits
- **Private Keys**: Never logged or exposed
- **Blockchain Verification**: Immutable hashes

---