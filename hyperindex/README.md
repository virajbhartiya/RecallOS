# RecallOS HyperIndex

This is an Envio HyperIndex implementation for the RecallOS Memory Registry smart contract on Sepolia testnet.

## Overview

The HyperIndex indexes the following events from the RecallOSMemoryRegistry contract:

- `MemoryStored` - When a memory is stored on-chain
- `MemoryBatchStored` - When multiple memories are stored in batch
- `GasDeposited` - When users deposit gas for transactions
- `GasDeducted` - When gas is deducted from user deposits
- `GasWithdrawn` - When users withdraw gas deposits
- `RelayerAuthorized` - When relayers are authorized/unauthorized

## Prerequisites

- Node.js (v22 or newer)
- pnpm (v8 or newer)
- Docker Desktop (for local development)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
export SEPOLIA_RPC_URL="https://eth-sepolia.public.blastapi.io"
export CONTRACT_ADDRESS="0xde662d9c6a0bb41ad82b3550177feaf4e43bd602"
export ENVIO_API_TOKEN="your_api_token_here"
```

3. Generate the indexer code:
```bash
pnpm envio codegen
```

## Running the Indexer

### Local Development

1. Ensure Docker is running
2. Start the indexer:
```bash
pnpm dev
```

This will:
- Start the local indexer
- Open the Hasura dashboard at http://localhost:8080
- Admin password: `testing`

### Stop the Indexer

```bash
pnpm stop
```

## GraphQL Schema

The indexer creates the following entities:

- `MemoryStored` - Individual memory storage events
- `MemoryBatchStored` - Batch memory storage events
- `GasDeposited` - Gas deposit events
- `GasDeducted` - Gas deduction events
- `GasWithdrawn` - Gas withdrawal events
- `RelayerAuthorized` - Relayer authorization events
- `User` - User statistics and relationships
- `Relayer` - Relayer information
- `SystemStats` - Overall system statistics

## Querying Data

Once the indexer is running, you can query the data using GraphQL:

```graphql
query GetRecentMemories {
  memoryStoreds(
    orderBy: blockNumber
    orderDirection: desc
    first: 10
  ) {
    id
    user
    hash
    urlHash
    timestamp
    blockNumber
    transactionHash
  }
}

query GetUserStats($userAddress: Bytes!) {
  user(id: $userAddress) {
    id
    totalMemories
    totalGasDeposited
    totalGasWithdrawn
    currentGasBalance
    firstMemoryTimestamp
    lastMemoryTimestamp
  }
}
```

## Integration with RecallOS

This HyperIndex can be integrated with the RecallOS client application to provide:

1. **Real-time blockchain data** - Query on-chain memory events
2. **User statistics** - Track user activity and gas usage
3. **System analytics** - Monitor overall system health
4. **Transaction verification** - Verify memory storage on-chain

## Deployment

To deploy to Envio's hosted service:

1. Get an API token from [Envio Dashboard](https://dashboard.envio.dev)
2. Set the `ENVIO_API_TOKEN` environment variable
3. Deploy:
```bash
pnpm envio deploy
```

## Configuration

The indexer is configured via `config.yaml`:

- **Network**: Sepolia testnet (Chain ID: 11155111)
- **Contract**: RecallOSMemoryRegistry at `0xde662d9c6a0bb41ad82b3550177feaf4e43bd602`
- **Start Block**: 0 (indexes from contract deployment)
- **Preload Handlers**: Enabled for performance optimization

## Troubleshooting

1. **Docker not running**: Ensure Docker Desktop is running before starting the indexer
2. **RPC connection issues**: Check your Sepolia RPC URL and network connectivity
3. **Code generation errors**: Run `pnpm envio codegen` to regenerate types
4. **Hasura dashboard not accessible**: Check if port 8080 is available

## Development

To modify the indexer:

1. Update `schema.graphql` to add new entities
2. Modify `src/EventHandlers.ts` to handle new events
3. Update `config.yaml` to include new contracts or events
4. Run `pnpm envio codegen` to regenerate types
5. Restart the indexer with `pnpm dev`