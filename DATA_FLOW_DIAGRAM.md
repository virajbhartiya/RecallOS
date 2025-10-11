# On-Chain Memory Data Flow

## Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Memory   │───▶│   Database       │───▶│   Gemini AI     │
│   Capture       │    │   Storage        │    │   Processing    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Blockchain    │◀───│   Hash Creation  │◀───│   Complete      │
│   Storage       │    │   & Batching     │    │   Memory Data   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Detailed Data Structure

### 1. Raw Memory Data
```
MemoryData {
  summary: "AI-generated summary of the content",
  timestamp: 1699123456789,
  location: "San Francisco, CA",
  url: "https://example.com/page",
  title: "Page Title",
  source: "browser",
  content: "Original page content...",
  metadata: {
    memory_id: "uuid",
    user_id: "uuid",
    page_metadata: {...},
    page_structure: {...},
    user_activity: {...}
  }
}
```

### 2. Hash Generation Process
```
1. Sort object keys alphabetically
2. Convert to JSON string
3. Apply Keccak256 hashing
4. Result: 0x8f4e2a1b3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b
```

### 3. On-Chain Storage
```
Smart Contract Storage:
├── batches[merkleRoot] → BatchMetadata
├── verifiedHashes[hash] → bool
└── userMemories[user] → bytes32[]

BatchMetadata {
  user: address,
  timestamp: uint256,
  hashCount: uint256
}
```

### 4. Transaction Data
```
Transaction {
  hash: "0x56985894edb6537924caf39e6f1906588e14838fac33b9dfdef0cd2a85862ed7",
  blockNumber: 9390703,
  gasUsed: 30115,
  status: 1,
  logs: [MemoryBatchSubmitted event]
}
```

## Example Memory Data

### Real Example:
```json
{
  "summary": "User learned about blockchain technology and its applications in decentralized systems. Key concepts include distributed ledgers, consensus mechanisms, and smart contracts. The content covered Ethereum, Bitcoin, and various DeFi protocols.",
  "timestamp": 1699123456789,
  "location": "San Francisco, CA",
  "url": "https://ethereum.org/en/developers/docs/intro-to-ethereum/",
  "title": "Introduction to Ethereum - Ethereum Developer Documentation",
  "source": "browser",
  "content": "Ethereum is a decentralized platform that runs smart contracts...",
  "metadata": {
    "memory_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "page_metadata": {
      "viewport": "1920x1080",
      "user_agent": "Mozilla/5.0...",
      "scroll_depth": 0.85,
      "time_on_page": 120000
    },
    "page_structure": {
      "headings": ["Introduction", "Smart Contracts", "DApps"],
      "links": ["https://ethereum.org/whitepaper", "https://docs.soliditylang.org/"],
      "images": ["ethereum-logo.png", "smart-contract-diagram.svg"]
    },
    "user_activity": {
      "clicks": 15,
      "scrolls": 45,
      "highlights": ["blockchain", "smart contracts", "decentralized"],
      "bookmarks": true
    }
  }
}
```

### Generated Hash:
```
0x8f4e2a1b3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b
```

## Verification Process

### To Verify a Memory:
1. **Reconstruct** the original memory data
2. **Generate** the hash using the same process
3. **Check** if hash exists in `verifiedHashes` mapping
4. **Verify** Merkle proof against batch's merkle root

### Verification Code:
```javascript
// 1. Reconstruct memory data
const memoryData = { /* complete memory object */ };

// 2. Generate hash
const hash = createMemoryHash(memoryData);

// 3. Verify on-chain
const isVerified = await contract.getMemoryStatus(hash);

// 4. Get Merkle proof
const proof = getMemoryProof(memoryData, allMemoriesInBatch);

// 5. Verify Merkle proof
const isValid = await contract.verifyMemory(hash, proof, merkleRoot);
```

## Key Benefits

- ✅ **Complete Data**: All memory context stored
- ✅ **Immutable**: Cannot be modified once stored
- ✅ **Verifiable**: Anyone can verify using Merkle proofs
- ✅ **Efficient**: Batched storage reduces gas costs
- ✅ **Transparent**: All data publicly verifiable
- ✅ **Decentralized**: No single point of failure
