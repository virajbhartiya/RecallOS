# Memory Storage Integration

This document describes how to use the blockchain-integrated memory storage system for RecallOS.

## Overview

The memory storage system allows you to:
- Store user memories on the blockchain using Merkle trees
- Verify individual memories without revealing the entire dataset
- Track memory counts per user
- Generate cryptographic proofs for memory verification

## Environment Variables

Add these to your `.env` file:

```bash
# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
DEPLOYER_PRIVATE_KEY=your_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key

# Contract Address (set after deployment)
MEMORY_REGISTRY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## API Endpoints

### 1. Store Memories
**POST** `/api/memory/store`

Store a batch of memories on the blockchain.

```json
{
  "memories": [
    "User visited https://example.com at 2024-01-15 10:30:00",
    "User clicked on 'Learn More' button at 2024-01-15 10:31:15"
  ],
  "userAddress": "0x1234..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "merkleRoot": "0x...",
    "blockNumber": 12345,
    "gasUsed": "150000",
    "memoryCount": 2,
    "userAddress": "0x..."
  }
}
```

### 2. Get Memory Status
**GET** `/api/memory/status/:hash`

Check if a memory hash has been verified.

**Response:**
```json
{
  "success": true,
  "data": {
    "hash": "0x...",
    "isVerified": true
  }
}
```

### 3. Get User Memory Count
**GET** `/api/memory/user/:userAddress/count`

Get the total number of memories for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x...",
    "memoryCount": "25"
  }
}
```

### 4. Get Batch Metadata
**GET** `/api/memory/batch/:merkleRoot`

Get metadata for a specific memory batch.

**Response:**
```json
{
  "success": true,
  "data": {
    "merkleRoot": "0x...",
    "user": "0x...",
    "timestamp": "1642248000",
    "hashCount": "5"
  }
}
```

### 5. Generate Proof
**POST** `/api/memory/proof`

Generate a Merkle proof for a specific memory.

```json
{
  "memory": "User visited https://example.com at 2024-01-15 10:30:00",
  "allMemories": [
    "User visited https://example.com at 2024-01-15 10:30:00",
    "User clicked on 'Learn More' button at 2024-01-15 10:31:15"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proof": ["0x...", "0x..."],
    "root": "0x...",
    "hash": "0x..."
  }
}
```

### 6. Health Check
**GET** `/api/memory/health`

Check blockchain connection status.

**Response:**
```json
{
  "success": true,
  "message": "Blockchain connection is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
import { storeMemories, getMemoryStatus } from './services/blockchain';

// Store memories
const memories = [
  "User action 1",
  "User action 2"
];

const result = await storeMemories(memories);
console.log("Stored:", result.txHash);

// Check status
const isVerified = await getMemoryStatus("0x...");
console.log("Verified:", isVerified);
```

### cURL Examples

```bash
# Store memories
curl -X POST http://localhost:3000/api/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "memories": [
      "User visited https://example.com",
      "User clicked button"
    ]
  }'

# Check memory status
curl http://localhost:3000/api/memory/status/0x1234...

# Get user memory count
curl http://localhost:3000/api/memory/user/0x1234.../count
```

## Security Considerations

1. **Private Key Security**: Never commit private keys to version control
2. **Environment Variables**: Use secure environment variable management
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: All inputs are validated before processing
5. **Error Handling**: Comprehensive error handling prevents information leakage

## Gas Optimization

- Memories are batched to reduce gas costs
- Merkle trees provide efficient verification
- Only essential data is stored on-chain
- Proofs can be generated off-chain

## Monitoring

- All transactions include gas usage tracking
- Event listeners provide real-time updates
- Health checks monitor blockchain connectivity
- Comprehensive logging for debugging

## Troubleshooting

### Common Issues

1. **"Blockchain not initialized"**: Check environment variables
2. **"Transaction failed"**: Insufficient gas or network issues
3. **"Invalid proof"**: Memory not in the original batch
4. **"Contract not found"**: Wrong contract address

### Debug Steps

1. Check environment variables are set correctly
2. Verify contract is deployed and address is correct
3. Ensure sufficient ETH for gas fees
4. Check network connectivity to Sepolia
5. Review transaction logs for detailed error messages
