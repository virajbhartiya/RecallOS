# RecallOS Memory Data Flow
## Data Flow Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │───▶│   API Server     │───▶│   Gemini AI     │
│   Extension     │    │   (Express.js)   │    │   Processing    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Blockchain    │◀───│   PostgreSQL     │◀───│   Memory Mesh   │
│   (Sepolia)     │    │   Database       │    │   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```
## Detailed Data Structure
### 1. Browser Extension Context Data
```
ContextData {
  source: "extension",
  url: "https://example.com/page",
  title: "Page Title",
  content_snippet: "First 500 chars of content...",
  timestamp: 1699123456789,
  full_content: "Complete page content...",
  meaningful_content: "Filtered meaningful content...",
  content_summary: "Page description and headings...",
  content_type: "blog_post|documentation|tutorial|news_article|...",
  key_topics: ["topic1", "topic2", "topic3"],
  reading_time: 5,
  page_metadata: {
    description: "Meta description",
    keywords: "meta keywords",
    author: "Page author",
    viewport: "1920x1080",
    language: "en",
    published_date: "2023-01-01",
    modified_date: "2023-01-02",
    canonical_url: "https://example.com/page"
  },
  page_structure: {
    headings: ["H1", "H2", "H3"],
    links: ["link1", "link2"],
    images: ["img1", "img2"],
    forms: ["form1"],
    code_blocks: ["code1"],
    tables: ["table1"]
  },
  user_activity: {
    scroll_position: 500,
    window_size: { width: 1920, height: 1080 },
    focused_element: "BODY",
    time_on_page: 120000,
    interaction_count: 15
  },
  content_quality: {
    word_count: 1500,
    has_images: true,
    has_code: false,
    has_tables: true,
    readability_score: 85
  }
}
```
### 2. API Processing & Gemini AI Enhancement
```
1. Content Analysis via Gemini AI:
   - Generate summary using gemini-2.5-flash model
   - Extract metadata (topics, categories, key points, sentiment, importance)
   - Generate embeddings using text-embedding-004 model

2. Hash Generation:
   - Create SHA256 hash from AI-generated summary
   - Create Keccak256 hash from URL for URL-based queries
   - Timestamp: Unix timestamp in seconds

3. Database Storage (PostgreSQL):
   - Store complete memory with all metadata
   - Create embeddings for semantic search
   - Establish memory relations for mesh network
```
### 3. On-Chain Storage (Sepolia Testnet)
```
RecallOSMemoryRegistry Smart Contract:
├── userMemories[address] → Memory[]
├── userMemoryCount[address] → uint256
├── memoryExists[bytes32] → bool
└── memoryOwner[bytes32] → address

Memory Struct {
  hash: bytes32,        // SHA256 of AI summary
  urlHash: bytes32,     // Keccak256 of URL
  timestamp: uint256    // Unix timestamp
}

Events:
- MemoryStored(address indexed user, bytes32 indexed hash, bytes32 urlHash, uint256 timestamp)
- MemoryBatchStored(address indexed user, uint256 count)
```
### 4. Memory Mesh Service
```
Memory Relations:
├── Semantic Relations: Based on embedding similarity (cosine similarity > 0.3)
├── Topical Relations: Based on topic/category overlap
└── Temporal Relations: Based on time proximity (±1 week)

Embedding Generation:
- Content embeddings: Full page content
- Summary embeddings: AI-generated summary
- Title embeddings: Page title
- Model: text-embedding-004 (768 dimensions)

Memory Clustering:
- Find related memories within 2 degrees of separation
- Calculate similarity scores for each relation type
- Store bidirectional relationships in database
```
## Example Memory Data
### Browser Extension Context:
```json
{
  "source": "extension",
  "url": "https://ethereum.org/en/developers/docs/intro-to-ethereum/",
  "title": "Introduction to Ethereum - Ethereum Developer Documentation",
  "content_snippet": "Ethereum is a decentralized platform that runs smart contracts...",
  "timestamp": 1699123456789,
  "full_content": "Complete page content...",
  "meaningful_content": "Filtered meaningful content...",
  "content_summary": "Introduction to Ethereum | Ethereum Developer Documentation | Smart Contracts | DApps",
  "content_type": "documentation",
  "key_topics": ["blockchain", "smart contracts", "ethereum", "decentralized", "dapps"],
  "reading_time": 8,
  "page_metadata": {
    "description": "Learn about Ethereum, the decentralized platform that runs smart contracts",
    "keywords": "ethereum, blockchain, smart contracts, dapps",
    "author": "Ethereum Foundation",
    "viewport": "1920x1080",
    "language": "en"
  },
  "page_structure": {
    "headings": ["Introduction", "Smart Contracts", "DApps", "Getting Started"],
    "links": ["https://ethereum.org/whitepaper", "https://docs.soliditylang.org/"],
    "images": ["ethereum-logo.png", "smart-contract-diagram.svg"]
  },
  "user_activity": {
    "scroll_position": 1200,
    "window_size": { "width": 1920, "height": 1080 },
    "time_on_page": 120000,
    "interaction_count": 15
  },
  "content_quality": {
    "word_count": 2500,
    "has_images": true,
    "has_code": true,
    "readability_score": 85
  }
}
```

### AI-Enhanced Memory:
```json
{
  "summary": "User learned about blockchain technology and its applications in decentralized systems. Key concepts include distributed ledgers, consensus mechanisms, and smart contracts. The content covered Ethereum, Bitcoin, and various DeFi protocols.",
  "extracted_metadata": {
    "topics": ["blockchain", "smart contracts", "ethereum", "decentralized systems", "defi"],
    "categories": ["technology", "programming", "blockchain"],
    "keyPoints": ["Ethereum runs smart contracts", "Decentralized applications", "Consensus mechanisms"],
    "sentiment": "informative",
    "importance": 8,
    "searchableTerms": ["ethereum", "blockchain", "smart contracts", "dapps", "defi"]
  },
  "hash": "0x8f4e2a1b3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
  "urlHash": "0x1234567890abcdef...",
  "timestamp": 1699123456
}
```
## Data Flow Process
### 1. Browser Extension Capture:
- **Content Extraction**: Extract meaningful content, removing boilerplate
- **Metadata Collection**: Gather page structure, user activity, content quality
- **Privacy Detection**: Detect ad blockers and privacy extensions
- **Context Packaging**: Create comprehensive context data object

### 2. API Server Processing:
- **User Management**: Create/find user by wallet address
- **AI Processing**: Send content to Gemini AI for analysis
- **Hash Generation**: Create SHA256 hash from AI summary
- **Database Storage**: Store complete memory with metadata
- **Blockchain Storage**: Store hash, URL hash, and timestamp on-chain

### 3. Memory Mesh Integration:
- **Embedding Generation**: Create vector embeddings for semantic search
- **Relation Discovery**: Find semantic, topical, and temporal relations
- **Mesh Building**: Establish bidirectional memory relationships
- **Snapshot Creation**: Create memory snapshots for backup

### 4. Verification & Retrieval:
```javascript
// Verify memory exists on-chain
const isStored = await contract.isMemoryStored(hash);

// Get memory details
const memory = await contract.getMemoryByHash(hash);

// Search memories by URL
const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url));
const memories = await contract.getMemoriesByUrlHash(userAddress, urlHash);

// Get recent memories
const recent = await contract.getRecentMemories(userAddress, 10);
```
