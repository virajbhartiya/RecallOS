#!/usr/bin/env node

/**
 * Test script to verify HyperIndex integration
 * This script tests the GraphQL endpoint and basic functionality
 */

// Using built-in fetch (Node.js 18+)

const HYPERINDEX_ENDPOINT = 'http://localhost:8080/v1/graphql';

async function testGraphQLQuery(query, variables = {}) {
  try {
    
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
    data.memoryStoreds.forEach((memory, index) => {
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
      address: data.user.address,
      totalMemories: data.user.totalMemories,
      totalGasDeposited: data.user.totalGasDeposited,
      currentGasBalance: data.user.currentGasBalance
    });
  } else {
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
    data.gasDepositeds.forEach((deposit, index) => {
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
    data.relayerAuthorizeds.forEach((relayer, index) => {
    });
  }
  return data;
}

async function main() {

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

  } catch (error) {
    console.error('❌ HyperIndex is not available:', error.message);
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
    await testUserStats(testUserAddress);
  } else {
  }

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
