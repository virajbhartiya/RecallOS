# RecallOS Memory Registry Smart Contract

This directory contains the smart contract implementation for the RecallOS Memory Registry, built with Hardhat 3 and Solidity.

## Features

- **UUPS Upgradeable Contract**: Uses OpenZeppelin's upgradeable contracts pattern
- **Memory Storage**: Store and retrieve memory data with hash-based indexing
- **Batch Operations**: Efficient batch storage of multiple memories
- **Query Functions**: Various query methods for retrieving memories by different criteria
- **Access Control**: Owner-based access control for upgrades

## Contract Functions

### Core Functions
- `storeMemory(bytes32 hash, bytes32 urlHash, uint256 timestamp)` - Store a single memory
- `storeMemoryBatch(bytes32[] hashes, bytes32[] urlHashes, uint256[] timestamps)` - Store multiple memories
- `getMemory(address user, uint256 index)` - Get memory by user and index
- `getUserMemories(address user)` - Get all memories for a user
- `getUserMemoryCount(address user)` - Get count of memories for a user

### Query Functions
- `isMemoryStored(bytes32 hash)` - Check if memory exists
- `getMemoryOwner(bytes32 hash)` - Get owner of a memory
- `getMemoriesByUrlHash(address user, bytes32 urlHash)` - Get memories by URL hash
- `getMemoriesByTimestampRange(address user, uint256 startTime, uint256 endTime)` - Get memories by time range
- `getRecentMemories(address user, uint256 count)` - Get most recent memories
- `getMemoryByHash(bytes32 hash)` - Get memory details by hash

## Testing

### Solidity Tests (Foundry)
Run comprehensive Solidity tests using Foundry:

```bash
npm run test:solidity
```

These tests cover:
- Contract initialization
- Memory storage and retrieval
- Batch operations
- Error handling
- Access control
- Upgrade functionality
- Fuzz testing

### TypeScript Tests (Node.js)
Run TypeScript integration tests:

```bash
npm run test:typescript
```

These tests cover:
- Deployment script functionality
- Upgrade script functionality
- End-to-end deployment and upgrade flows

### Deployment Test
Run a comprehensive deployment and upgrade test:

```bash
npm run test:deployment
```

This script:
1. Deploys the contract
2. Tests basic functionality
3. Stores test data
4. Performs an upgrade
5. Verifies data integrity after upgrade
6. Tests new functionality

## Deployment

### Deploy Contract
```bash
npm run deploy
```

This will deploy the RecallOSMemoryRegistry contract using a UUPS proxy pattern.

### Upgrade Contract
```bash
# Set the proxy address in your environment
export PROXY_CONTRACT_ADDRESS=0x...

# Run the upgrade
npm run upgrade
```

## Development

### Compile Contracts
```bash
npm run compile
```

### Clean Build Artifacts
```bash
npm run clean
```

### Run All Tests
```bash
npm run test
```

## Network Configuration

The project is configured with the following networks:

- `hardhatMainnet`: Local Ethereum mainnet simulation
- `hardhatOp`: Local Optimism simulation  
- `sepolia`: Sepolia testnet (requires RPC URL and private key)

## Environment Variables

For testnet deployment, set these environment variables:

```bash
SEPOLIA_RPC_URL=your_sepolia_rpc_url
SEPOLIA_PRIVATE_KEY=your_private_key
PROXY_CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602 # Current Sepolia deployment
```

## Contract Architecture

The contract uses the following OpenZeppelin patterns:

- **Initializable**: For proper initialization of upgradeable contracts
- **UUPSUpgradeable**: For upgrade functionality
- **OwnableUpgradeable**: For access control

## Security Considerations

- Only the contract owner can perform upgrades
- Memory hashes must be unique (prevents duplicates)
- All array operations include bounds checking
- Proper access control on all state-changing functions

## Gas Optimization

- Uses efficient storage patterns
- Batch operations reduce transaction costs
- Optimized query functions for common use cases
- Minimal external calls in loops