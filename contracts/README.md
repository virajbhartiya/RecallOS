# RecallOS Memory Hash Verification Smart Contract

This project implements a smart contract for storing and verifying memory summary hashes using Merkle tree batch verification on the Sepolia testnet.

## Features

- **Merkle Tree Verification**: Efficient batch verification of memory hashes using Merkle trees
- **Memory Registry**: Store and track memory batches with metadata
- **Hash Verification**: Verify individual memory hashes against submitted batches
- **User Tracking**: Track memory counts per user
- **Event Logging**: Emit events for batch submissions and verifications

## Smart Contract

The `RecallOSMemoryRegistry` contract provides the following functionality:

- `submitMemoryBatch(bytes32 merkleRoot, bytes32[] hashes)`: Submit a batch of memory hashes with their Merkle root
- `verifyMemory(bytes32 hash, bytes32[] proof, bytes32 merkleRoot)`: Verify a memory hash against a Merkle proof
- `getMemoryStatus(bytes32 hash)`: Check if a memory hash has been verified
- `getUserMemoryCount(address user)`: Get the total number of memories for a user

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
export SEPOLIA_RPC_URL="your_sepolia_rpc_url"
export DEPLOYER_PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_etherscan_api_key"
```

## Usage

### Compile

```bash
npm run compile
```

### Test

```bash
npm test
```

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

### Upgrade Contract (UUPS)

```bash
npm run upgrade:sepolia
```

### Verify Contract

```bash
npm run verify:sepolia <contract_address>
```

## Backend Integration

The backend service (`api/src/services/blockchain.ts`) provides:

- `generateMerkleTree(hashes)`: Generate Merkle tree from memory hashes
- `submitBatch(hashes)`: Submit memory batch to the smart contract
- `verifyMemory(hash, proof, root)`: Verify a memory hash
- Event listeners for real-time updates

## Environment Variables

- `SEPOLIA_RPC_URL`: Sepolia testnet RPC endpoint
- `DEPLOYER_PRIVATE_KEY`: Private key for deployment and transactions
- `ETHERSCAN_API_KEY`: Etherscan API key for contract verification
- `MEMORY_REGISTRY_CONTRACT_ADDRESS`: Deployed contract address (for backend)

## Contract Architecture

The contract uses OpenZeppelin's upgradeable contracts pattern with:

- `Initializable`: For initialization logic
- `UUPSUpgradeable`: For upgradeable proxy pattern
- `OwnableUpgradeable`: For access control
- `MerkleProof`: For Merkle tree verification

## Security Considerations

- Only the contract owner can upgrade the implementation
- Memory batches are immutable once submitted
- Merkle proofs ensure data integrity
- Events provide transparency for all operations
