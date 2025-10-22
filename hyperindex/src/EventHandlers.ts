import { RecallOSMemoryRegistry } from "../generated/src/Handlers.gen";
import { 
  MemoryStored, 
  MemoryBatchStored, 
  GasDeposited, 
  GasDeducted, 
  GasWithdrawn, 
  RelayerAuthorized,
  User,
  Relayer,
  SystemStats
} from "../generated/src/Types.gen";

// Register MemoryStored event handler
RecallOSMemoryRegistry.MemoryStored.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  // Create MemoryStored entity
  const memoryStored = {
    id: entityId,
    user_id: event.params.user,
    hash: event.params.hash,
    urlHash: event.params.urlHash,
    timestamp: event.params.timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n, // Not available in current event structure
    gasPrice: 0n  // Not available in current event structure
  };
  
  await context.MemoryStored.set(memoryStored);

  // Update user statistics
  let user = await context.User.get(event.params.user);
  if (!user) {
    user = {
      id: event.params.user,
      address: event.params.user,
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      currentGasBalance: 0n,
      firstMemoryTimestamp: event.params.timestamp,
      lastMemoryTimestamp: undefined
    };
  } else {
    user = {
      ...user,
      totalMemories: user.totalMemories + 1n,
      lastMemoryTimestamp: event.params.timestamp
    };
  }
  await context.User.set(user);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      totalUsers: 0n,
      totalRelayers: 0n,
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalMemories: systemStats.totalMemories + 1n,
      lastUpdated: BigInt(event.block.timestamp)
    };
  }
  await context.SystemStats.set(systemStats);
});

// Register MemoryBatchStored event handler
RecallOSMemoryRegistry.MemoryBatchStored.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  const memoryBatchStored = {
    id: entityId,
    user_id: event.params.user,
    count: event.params.count,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n,
    gasPrice: 0n
  };
  
  await context.MemoryBatchStored.set(memoryBatchStored);

  // Update user statistics
  let user = await context.User.get(event.params.user);
  if (!user) {
    user = {
      id: event.params.user,
      address: event.params.user,
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      currentGasBalance: 0n,
      firstMemoryTimestamp: undefined,
      lastMemoryTimestamp: undefined
    };
  } else {
    user = {
      ...user,
      totalMemories: user.totalMemories + event.params.count
    };
  }
  await context.User.set(user);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      totalUsers: 0n,
      totalRelayers: 0n,
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalMemories: systemStats.totalMemories + event.params.count,
      lastUpdated: BigInt(event.block.timestamp)
    };
  }
  await context.SystemStats.set(systemStats);
});

// Register GasDeposited event handler
RecallOSMemoryRegistry.GasDeposited.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  const gasDeposited = {
    id: entityId,
    user_id: event.params.user,
    amount: event.params.amount,
    newBalance: event.params.newBalance,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n,
    gasPrice: 0n
  };
  
  await context.GasDeposited.set(gasDeposited);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      totalUsers: 0n,
      totalRelayers: 0n,
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalGasDeposited: systemStats.totalGasDeposited + event.params.amount,
      lastUpdated: BigInt(event.block.timestamp)
    };
  }
  await context.SystemStats.set(systemStats);
});

// Register GasDeducted event handler
RecallOSMemoryRegistry.GasDeducted.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  const gasDeducted = {
    id: entityId,
    user_id: event.params.user,
    amount: event.params.amount,
    remainingBalance: event.params.remainingBalance,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n,
    gasPrice: 0n
  };
  
  await context.GasDeducted.set(gasDeducted);
});

// Register GasWithdrawn event handler
RecallOSMemoryRegistry.GasWithdrawn.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  const gasWithdrawn = {
    id: entityId,
    user_id: event.params.user,
    amount: event.params.amount,
    newBalance: event.params.newBalance,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n,
    gasPrice: 0n
  };
  
  await context.GasWithdrawn.set(gasWithdrawn);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: 0n,
      totalGasDeposited: 0n,
      totalGasWithdrawn: 0n,
      totalUsers: 0n,
      totalRelayers: 0n,
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalGasWithdrawn: systemStats.totalGasWithdrawn + event.params.amount,
      lastUpdated: BigInt(event.block.timestamp)
    };
  }
  await context.SystemStats.set(systemStats);
});

// Register RelayerAuthorized event handler
RecallOSMemoryRegistry.RelayerAuthorized.handler(async ({ event, context }) => {
  const entityId = `${event.logIndex}`;
  
  const relayerAuthorized = {
    id: entityId,
    relayer_id: event.params.relayer,
    authorized: event.params.authorized,
    blockNumber: BigInt(event.block.number),
    transactionHash: `${event.logIndex}`,
    gasUsed: 0n,
    gasPrice: 0n
  };
  
  await context.RelayerAuthorized.set(relayerAuthorized);

  // Update relayer information
  let relayer = await context.Relayer.get(event.params.relayer);
  if (!relayer) {
    relayer = {
      id: event.params.relayer,
      address: event.params.relayer,
      authorized: false
    };
  } else {
    relayer = {
      ...relayer,
      authorized: event.params.authorized
    };
  }
  await context.Relayer.set(relayer);
});