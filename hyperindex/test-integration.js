#!/usr/bin/env node

/**
 * Test script to verify HyperIndex integration
 * This script tests the GraphQL endpoint and basic functionality
 */

// Using built-in fetch (Node.js 18+)

const HYPERINDEX_ENDPOINT = 'http://localhost:8080/v1/graphql';

async function testGraphQLQuery(query, variables = {}) {
  try {
    console.log(`\n🔍 Testing query: ${query.split('{')[0].trim()}`);
    
    const response = await fetch(HYPERINDEX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return null;
    }

    console.log('✅ Query successful');
    return result.data;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return null;
  }
}

async function testSystemStats() {
  const query = `
    query GetSystemStats {
      SystemStats(where: { id: { _eq: "system" } }) {
        id
        totalMemories
        totalUsers
        totalGasDeposited
        totalGasWithdrawn
        totalRelayers
        lastUpdated
      }
    }
  `;

  const data = await testGraphQLQuery(query);
  if (data && data.SystemStats && data.SystemStats.length > 0) {
    const stats = data.SystemStats[0];
    console.log('📊 System Stats:', {
      totalMemories: stats.totalMemories,
      totalUsers: stats.totalUsers,
      totalGasDeposited: stats.totalGasDeposited,
      totalRelayers: stats.totalRelayers
    });
  }
  return data;
}

async function testRecentMemories() {
  const query = `
    query GetRecentMemoryStoredEvents($limit: Int!) {
      memoryStoreds(
        orderBy: blockNumber
        orderDirection: desc
        first: $limit
      ) {
        id
        user
        hash
        urlHash
        timestamp
        blockNumber
        transactionHash
        gasUsed
        gasPrice
      }
    }
  `;

  const data = await testGraphQLQuery(query, { limit: 5 });
  if (data && data.memoryStoreds) {
    console.log(`📝 Found ${data.memoryStoreds.length} recent memory events`);
    data.memoryStoreds.forEach((memory, index) => {
      console.log(`  ${index + 1}. User: ${memory.user.slice(0, 6)}...${memory.user.slice(-4)}`);
      console.log(`     Hash: ${memory.hash.slice(0, 10)}...${memory.hash.slice(-6)}`);
      console.log(`     Block: ${memory.blockNumber}`);
    });
  }
  return data;
}

async function testUserStats(userAddress) {
  const query = `
    query GetUserStats($userAddress: String!) {
      user(id: $userAddress) {
        id
        address
        totalMemories
        totalGasDeposited
        totalGasWithdrawn
        currentGasBalance
        firstMemoryTimestamp
        lastMemoryTimestamp
      }
    }
  `;

  const data = await testGraphQLQuery(query, { userAddress: userAddress.toLowerCase() });
  if (data && data.user) {
    console.log('👤 User Stats:', {
      address: data.user.address,
      totalMemories: data.user.totalMemories,
      totalGasDeposited: data.user.totalGasDeposited,
      currentGasBalance: data.user.currentGasBalance
    });
  } else {
    console.log('👤 No user stats found for address:', userAddress);
  }
  return data;
}

async function testGasDeposits() {
  const query = `
    query GetGasDeposits($limit: Int!) {
      gasDepositeds(
        orderBy: blockNumber
        orderDirection: desc
        first: $limit
      ) {
        id
        user
        amount
        newBalance
        blockNumber
        transactionHash
      }
    }
  `;

  const data = await testGraphQLQuery(query, { limit: 3 });
  if (data && data.gasDepositeds) {
    console.log(`💰 Found ${data.gasDepositeds.length} gas deposit events`);
    data.gasDepositeds.forEach((deposit, index) => {
      console.log(`  ${index + 1}. User: ${deposit.user.slice(0, 6)}...${deposit.user.slice(-4)}`);
      console.log(`     Amount: ${parseFloat(deposit.amount) / 1e18} ETH`);
      console.log(`     New Balance: ${parseFloat(deposit.newBalance) / 1e18} ETH`);
    });
  }
  return data;
}

async function testRelayers() {
  const query = `
    query GetAuthorizedRelayers {
      relayerAuthorizeds(
        where: { authorized: true }
        orderBy: blockNumber
        orderDirection: desc
      ) {
        id
        relayer
        authorized
        blockNumber
        transactionHash
      }
    }
  `;

  const data = await testGraphQLQuery(query);
  if (data && data.relayerAuthorizeds) {
    console.log(`🔐 Found ${data.relayerAuthorizeds.length} authorized relayers`);
    data.relayerAuthorizeds.forEach((relayer, index) => {
      console.log(`  ${index + 1}. Relayer: ${relayer.relayer.slice(0, 6)}...${relayer.relayer.slice(-4)}`);
      console.log(`     Block: ${relayer.blockNumber}`);
    });
  }
  return data;
}

async function main() {
  console.log('🚀 Starting HyperIndex Integration Test');
  console.log('=====================================');

  // Test if HyperIndex is available
  try {
    const response = await fetch(HYPERINDEX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' })
    });

    if (!response.ok) {
      throw new Error(`HyperIndex not available: ${response.status}`);
    }

    console.log('✅ HyperIndex is running and accessible');
  } catch (error) {
    console.error('❌ HyperIndex is not available:', error.message);
    console.log('\n💡 To start HyperIndex:');
    console.log('   cd hyperindex');
    console.log('   pnpm dev');
    process.exit(1);
  }

  // Run tests
  await testSystemStats();
  await testRecentMemories();
  await testGasDeposits();
  await testRelayers();

  // Test with a sample user address if provided
  const testUserAddress = process.argv[2];
  if (testUserAddress) {
    console.log(`\n🧪 Testing with user address: ${testUserAddress}`);
    await testUserStats(testUserAddress);
  } else {
    console.log('\n💡 To test user-specific queries, provide a user address:');
    console.log('   node test-integration.js 0x1234...');
  }

  console.log('\n🎉 HyperIndex integration test completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGraphQLQuery,
  testSystemStats,
  testRecentMemories,
  testUserStats,
  testGasDeposits,
  testRelayers
};
