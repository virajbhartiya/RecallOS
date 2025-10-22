import { RecallOSMemoryRegistry } from "../generated/src/Handlers.gen";

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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
  };
  
  await context.MemoryStored.set(memoryStored);

  // Update user statistics
  let user = await context.User.get(event.params.user);
  if (!user) {
    user = {
      id: event.params.user,
      address: event.params.user,
      totalMemories: BigInt(0),
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: BigInt(0),
      currentGasBalance: BigInt(0),
      firstMemoryTimestamp: event.params.timestamp,
      lastMemoryTimestamp: undefined
    };
  } else {
    user = {
      ...user,
      totalMemories: user.totalMemories + BigInt(1),
      totalGasUsed: user.totalGasUsed + event.params.gasUsed,
      lastMemoryTimestamp: event.params.timestamp
    };
  }
  await context.User.set(user);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: BigInt(1), // First memory
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: event.params.gasUsed,
      totalUsers: BigInt(1), // First user
      totalRelayers: BigInt(0),
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalMemories: systemStats.totalMemories + BigInt(1),
      totalGasUsed: systemStats.totalGasUsed + event.params.gasUsed,
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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
  };
  
  await context.MemoryBatchStored.set(memoryBatchStored);

  // Update user statistics
  let user = await context.User.get(event.params.user);
  if (!user) {
    user = {
      id: event.params.user,
      address: event.params.user,
      totalMemories: BigInt(0),
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: BigInt(0),
      currentGasBalance: BigInt(0),
      firstMemoryTimestamp: undefined,
      lastMemoryTimestamp: undefined
    };
  } else {
    user = {
      ...user,
      totalMemories: user.totalMemories + event.params.count,
      totalGasUsed: user.totalGasUsed + event.params.gasUsed
    };
  }
  await context.User.set(user);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: event.params.count, // First batch of memories
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: event.params.gasUsed,
      totalUsers: BigInt(1), // First user
      totalRelayers: BigInt(0),
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    systemStats = {
      ...systemStats,
      totalMemories: systemStats.totalMemories + event.params.count,
      totalGasUsed: systemStats.totalGasUsed + event.params.gasUsed,
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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
  };
  
  await context.GasDeposited.set(gasDeposited);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: BigInt(0),
      totalGasDeposited: event.params.amount,
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: BigInt(0),
      totalUsers: BigInt(1), // First user
      totalRelayers: BigInt(0),
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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
  };
  
  await context.GasWithdrawn.set(gasWithdrawn);

  // Update system statistics
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: BigInt(0),
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: event.params.amount, // First withdrawal
      totalGasUsed: BigInt(0),
      totalUsers: BigInt(1), // First user
      totalRelayers: BigInt(0),
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
    gasUsed: event.params.gasUsed,
    gasPrice: event.params.gasPrice
  };
  
  await context.RelayerAuthorized.set(relayerAuthorized);

  // Update relayer information
  let relayer = await context.Relayer.get(event.params.relayer);
  const wasAuthorized = relayer ? Boolean(relayer.authorized) : false;
  const isAuthorized = Boolean(event.params.authorized);

  if (!relayer) {
    relayer = {
      id: event.params.relayer,
      address: event.params.relayer,
      authorized: isAuthorized
    };
  } else {
    relayer = {
      ...relayer,
      authorized: isAuthorized
    };
  }
  await context.Relayer.set(relayer);

  // Update system statistics (increment on first authorization, decrement on revocation)
  let systemStats = await context.SystemStats.get("system");
  if (!systemStats) {
    systemStats = {
      id: "system",
      totalMemories: BigInt(0),
      totalGasDeposited: BigInt(0),
      totalGasWithdrawn: BigInt(0),
      totalGasUsed: BigInt(0),
      totalUsers: BigInt(0),
      totalRelayers: isAuthorized ? BigInt(1) : BigInt(0),
      lastUpdated: BigInt(event.block.timestamp)
    };
  } else {
    let nextRelayers = systemStats.totalRelayers;
    if (isAuthorized && !wasAuthorized) {
      nextRelayers = systemStats.totalRelayers + BigInt(1);
    } else if (!isAuthorized && wasAuthorized) {
      nextRelayers = systemStats.totalRelayers > BigInt(0) ? systemStats.totalRelayers - BigInt(1) : BigInt(0);
    }

    systemStats = {
      ...systemStats,
      totalRelayers: nextRelayers,
      lastUpdated: BigInt(event.block.timestamp)
    };
  }
  await context.SystemStats.set(systemStats);
});