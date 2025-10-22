# RecallOS HyperIndex Integration

This document describes the complete integration of Envio HyperIndex with the RecallOS system, providing real-time blockchain data indexing and querying capabilities.

## Overview

The HyperIndex integration adds a powerful blockchain indexing layer to RecallOS, enabling:

- **Real-time event indexing** from the RecallOSMemoryRegistry smart contract
- **GraphQL API** for querying indexed blockchain data
- **User statistics** and activity tracking
- **System analytics** and monitoring
- **Transaction verification** and history

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RecallOS System                              │
├─────────────────────────────────────────────────────────────────┤
│  Client (React)  │  API Server  │  HyperIndex  │  Blockchain   │
│                  │              │              │               │
│  ┌─────────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐  │
│  │HyperIndex   │ │ │Memory    │ │ │Event     │ │ │RecallOS  │  │
│  │Panel        │ │ │Service   │ │ │Handlers  │ │ │Contract  │  │
│  └─────────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘  │
│                  │              │              │               │
│  ┌─────────────┐ │ ┌──────────┐ │ ┌──────────┐ │               │
│  │useHyperIndex│ │ │GraphQL   │ │ │Hasura    │ │               │
│  │Hook         │ │ │Queries   │ │ │Dashboard │ │               │
│  └─────────────┘ │ └──────────┘ │ └──────────┘ │               │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. HyperIndex Indexer (`/hyperindex/`)

**Purpose**: Indexes blockchain events from the RecallOSMemoryRegistry contract

**Key Files**:
- `config.yaml` - Indexer configuration
- `schema.graphql` - GraphQL schema definition
- `src/EventHandlers.ts` - Event processing logic
- `abis/RecallOSMemoryRegistry.json` - Contract ABI

**Indexed Events**:
- `MemoryStored` - Individual memory storage
- `MemoryBatchStored` - Batch memory storage
- `GasDeposited` - User gas deposits
- `GasDeducted` - Gas deductions from deposits
- `GasWithdrawn` - User gas withdrawals
- `RelayerAuthorized` - Relayer authorization changes

### 2. Client Integration

**Purpose**: Provides React components and hooks for accessing HyperIndex data

**Key Files**:
- `src/services/hyperindexService.ts` - GraphQL client service
- `src/hooks/useHyperIndex.ts` - React hooks for HyperIndex data
- `src/components/HyperIndexPanel.tsx` - UI component for displaying data

**Features**:
- Real-time data fetching
- User-specific statistics
- System-wide analytics
- Transaction history
- Error handling and fallbacks

### 3. GraphQL Schema

**Entities**:
- `MemoryStored` - Memory storage events
- `User` - User statistics and relationships
- `GasDeposited` - Gas deposit events
- `GasWithdrawn` - Gas withdrawal events
- `RelayerAuthorized` - Relayer authorization events
- `SystemStats` - Overall system statistics

## Setup Instructions

### Prerequisites

- Node.js (v22 or newer)
- pnpm (v8 or newer)
- Docker Desktop
- Envio API token (from [dashboard.envio.dev](https://dashboard.envio.dev))

### Quick Setup

1. **Navigate to HyperIndex directory**:
   ```bash
   cd hyperindex
   ```

2. **Run setup script**:
   ```bash
   ./setup.sh
   ```

3. **Update environment variables**:
   ```bash
   # Edit .env file
   ENVIO_API_TOKEN=your_actual_api_token_here
   ```

4. **Start the indexer**:
   ```bash
   pnpm dev
   ```

5. **Access Hasura dashboard**:
   - URL: http://localhost:8080
   - Admin password: `testing`

### Manual Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Generate code**:
   ```bash
   pnpm envio codegen
   ```

3. **Start indexer**:
   ```bash
   pnpm dev
   ```

## Usage

### Client Integration

The HyperIndex panel is automatically integrated into the Memories page:

```tsx
import { HyperIndexPanel } from '@/components/HyperIndexPanel'

// The panel shows:
// - System statistics
// - Recent memory events
// - User-specific data (when connected)
<HyperIndexPanel userAddress={userAddress} />
```

### GraphQL Queries

Query recent memory events:
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
```

Query user statistics:
```graphql
query GetUserStats($userAddress: String!) {
  user(id: $userAddress) {
    id
    totalMemories
    totalGasDeposited
    totalGasWithdrawn
    currentGasBalance
  }
}
```

### Service Usage

```typescript
import { HyperIndexService } from '@/services/hyperindexService'

// Get system statistics
const stats = await HyperIndexService.getSystemStats()

// Get user activity
const activity = await HyperIndexService.getUserActivity(userAddress)

// Get recent memory events
const memories = await HyperIndexService.getRecentMemoryStoredEvents(10)
```

## Testing

### Integration Test

Run the integration test to verify everything is working:

```bash
# Test basic functionality
node test-integration.js

# Test with specific user address
node test-integration.js 0x1234...
```

### Manual Testing

1. **Start the indexer**: `pnpm dev`
2. **Open Hasura dashboard**: http://localhost:8080
3. **Run GraphQL queries** in the GraphiQL interface
4. **Check the client** - HyperIndex panel should appear in Memories page

## Configuration

### Environment Variables

```bash
# Required
ENVIO_API_TOKEN=your_api_token_here
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602
```

### Indexer Configuration (`config.yaml`)

```yaml
name: recallos-indexer
network:
  name: sepolia
  chain_id: 11155111
  rpc_url: ${SEPOLIA_RPC_URL}

contracts:
  - name: RecallOSMemoryRegistry
    address: ${CONTRACT_ADDRESS}
    abi: "./abis/RecallOSMemoryRegistry.json"
    start_block: 0

events:
  - contract: RecallOSMemoryRegistry
    event: MemoryStored
    handler: handleMemoryStored
  # ... other events

preload_handlers: true
```

## Deployment

### Local Development

```bash
pnpm dev
```

### Production Deployment

1. **Get API token** from [Envio Dashboard](https://dashboard.envio.dev)
2. **Set environment variables**
3. **Deploy**:
   ```bash
   pnpm envio deploy
   ```

## Monitoring

### Hasura Dashboard

- **URL**: http://localhost:8080 (local) or your deployed URL
- **Features**:
  - GraphQL query interface
  - Data browser
  - Real-time subscriptions
  - Performance metrics

### System Health

The integration includes health checks and error handling:

- **Connection status** - Shows if HyperIndex is available
- **Error handling** - Graceful fallbacks when service is unavailable
- **Loading states** - User feedback during data fetching
- **Retry mechanisms** - Automatic retry for failed requests

## Troubleshooting

### Common Issues

1. **HyperIndex not available**:
   - Check if Docker is running
   - Verify the indexer is started: `pnpm dev`
   - Check port 8080 is not in use

2. **GraphQL errors**:
   - Verify the contract address is correct
   - Check if the contract is deployed on Sepolia
   - Ensure the ABI matches the deployed contract

3. **No data appearing**:
   - Check if there are actual transactions on the contract
   - Verify the start_block in config.yaml
   - Check the RPC URL is accessible

4. **Client integration issues**:
   - Check browser console for errors
   - Verify the HyperIndex endpoint is accessible
   - Check CORS settings if running on different ports

### Debug Commands

```bash
# Check indexer status
pnpm envio status

# View logs
pnpm envio logs

# Stop and restart
pnpm stop
pnpm dev

# Test GraphQL endpoint
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Performance

### Optimization Features

- **Preload handlers** - Batched database queries for better performance
- **Efficient indexing** - Only indexes relevant events
- **GraphQL caching** - Built-in caching in Hasura
- **Connection pooling** - Optimized database connections

### Scaling Considerations

- **Database size** - Monitor PostgreSQL storage usage
- **Query performance** - Use appropriate indexes and limits
- **Memory usage** - Monitor Docker container resources
- **Network bandwidth** - Consider RPC rate limits

## Security

### Access Control

- **Hasura admin** - Protected by password
- **API tokens** - Required for deployment
- **CORS** - Configured for local development
- **Data privacy** - Only public blockchain data is indexed

### Best Practices

- Keep API tokens secure
- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor for unusual activity

## Future Enhancements

### Planned Features

- **Multi-chain support** - Index other networks
- **Advanced analytics** - More detailed statistics
- **Real-time subscriptions** - Live updates via WebSocket
- **Custom dashboards** - User-specific analytics
- **Export functionality** - Data export capabilities

### Integration Opportunities

- **API server integration** - Direct database queries
- **Mobile app support** - React Native integration
- **Third-party tools** - Integration with analytics platforms
- **Automated monitoring** - Health checks and alerts

## Support

### Resources

- [Envio Documentation](https://docs.envio.dev)
- [Hasura Documentation](https://hasura.io/docs)
- [GraphQL Documentation](https://graphql.org/learn)
- [RecallOS Documentation](./README.md)

### Getting Help

1. Check the troubleshooting section above
2. Review the integration test output
3. Check the Hasura dashboard for errors
4. Review the browser console for client-side issues
5. Check the indexer logs for server-side issues

---

This integration provides a robust foundation for blockchain data indexing and querying in RecallOS, enabling real-time insights and analytics while maintaining the system's decentralized architecture.
