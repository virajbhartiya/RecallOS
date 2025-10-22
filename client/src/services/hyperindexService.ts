// import { getRequest } from '../utility/generalServices'

// HyperIndex GraphQL endpoint (when running locally)
const HYPERINDEX_ENDPOINT = 'http://localhost:8080/v1/graphql'

// Types for HyperIndex entities
export interface HyperIndexMemoryStored {
  id: string
  user_id: string
  hash: string
  urlHash: string
  timestamp: string
  blockNumber: string
  transactionHash: string
  gasUsed: string
  gasPrice: string
}

export interface HyperIndexUser {
  id: string
  address: string
  totalMemories: string
  totalGasDeposited: string
  totalGasWithdrawn: string
  currentGasBalance: string
  firstMemoryTimestamp?: string
  lastMemoryTimestamp?: string
}

export interface HyperIndexGasDeposited {
  id: string
  user: string
  amount: string
  newBalance: string
  blockNumber: string
  transactionHash: string
  gasUsed: string
  gasPrice: string
}

export interface HyperIndexGasWithdrawn {
  id: string
  user: string
  amount: string
  newBalance: string
  blockNumber: string
  transactionHash: string
  gasUsed: string
  gasPrice: string
}

export interface HyperIndexRelayerAuthorized {
  id: string
  relayer: string
  authorized: boolean
  blockNumber: string
  transactionHash: string
  gasUsed: string
  gasPrice: string
}

export interface HyperIndexSystemStats {
  id: string
  totalMemories: string
  totalUsers: string
  totalGasDeposited: string
  totalGasWithdrawn: string
  totalRelayers: string
  lastUpdated: string
}

export class HyperIndexService {
  private static async executeGraphQLQuery(query: string, variables?: Record<string, any>) {
    try {
      const response = await fetch(HYPERINDEX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: variables || {}
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
      }

      return result.data
    } catch (error) {
      console.error('HyperIndex GraphQL query failed:', error)
      throw error
    }
  }

  // Get recent memory storage events
  static async getRecentMemoryStoredEvents(limit: number = 10): Promise<HyperIndexMemoryStored[]> {
    const query = `
      query GetRecentMemoryStoredEvents($limit: Int!) {
        MemoryStored(limit: $limit, order_by: { blockNumber: desc }) {
          id
          user_id
          hash
          urlHash
          timestamp
          blockNumber
          transactionHash
          gasUsed
          gasPrice
        }
      }
    `

    const data = await this.executeGraphQLQuery(query, { limit })
    return data.MemoryStored || []
  }

  // Get memory events for a specific user
  static async getUserMemoryEvents(userAddress: string, limit: number = 20): Promise<HyperIndexMemoryStored[]> {
    const query = `
      query GetUserMemoryEvents($userAddress: String!, $limit: Int!) {
        memoryStoreds(
          where: { user: $userAddress }
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
    `

    const data = await this.executeGraphQLQuery(query, { userAddress: userAddress.toLowerCase(), limit })
    return data.memoryStoreds || []
  }

  // Get user statistics from HyperIndex
  static async getUserStats(userAddress: string): Promise<HyperIndexUser | null> {
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
    `

    const data = await this.executeGraphQLQuery(query, { userAddress: userAddress.toLowerCase() })
    return data.user || null
  }

  // Get gas deposit events for a user
  static async getUserGasDeposits(userAddress: string, limit: number = 20): Promise<HyperIndexGasDeposited[]> {
    const query = `
      query GetUserGasDeposits($userAddress: String!, $limit: Int!) {
        gasDepositeds(
          where: { user: $userAddress }
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
          gasUsed
          gasPrice
        }
      }
    `

    const data = await this.executeGraphQLQuery(query, { userAddress: userAddress.toLowerCase(), limit })
    return data.gasDepositeds || []
  }

  // Get gas withdrawal events for a user
  static async getUserGasWithdrawals(userAddress: string, limit: number = 20): Promise<HyperIndexGasWithdrawn[]> {
    const query = `
      query GetUserGasWithdrawals($userAddress: String!, $limit: Int!) {
        gasWithdrawns(
          where: { user: $userAddress }
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
          gasUsed
          gasPrice
        }
      }
    `

    const data = await this.executeGraphQLQuery(query, { userAddress: userAddress.toLowerCase(), limit })
    return data.gasWithdrawns || []
  }

  // Get system statistics
  static async getSystemStats(): Promise<HyperIndexSystemStats | null> {
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
    `

    const data = await this.executeGraphQLQuery(query)
    return data.SystemStats && data.SystemStats.length > 0 ? data.SystemStats[0] : null
  }

  // Get all authorized relayers
  static async getAuthorizedRelayers(): Promise<HyperIndexRelayerAuthorized[]> {
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
          gasUsed
          gasPrice
        }
      }
    `

    const data = await this.executeGraphQLQuery(query)
    return data.relayerAuthorizeds || []
  }

  // Get memory events by hash
  static async getMemoryEventByHash(hash: string): Promise<HyperIndexMemoryStored | null> {
    const query = `
      query GetMemoryEventByHash($hash: String!) {
        memoryStoreds(
          where: { hash: $hash }
          first: 1
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
    `

    const data = await this.executeGraphQLQuery(query, { hash })
    return data.memoryStoreds?.[0] || null
  }

  // Get memory events by URL hash
  static async getMemoryEventsByUrlHash(urlHash: string, limit: number = 20): Promise<HyperIndexMemoryStored[]> {
    const query = `
      query GetMemoryEventsByUrlHash($urlHash: String!, $limit: Int!) {
        memoryStoreds(
          where: { urlHash: $urlHash }
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
    `

    const data = await this.executeGraphQLQuery(query, { urlHash, limit })
    return data.memoryStoreds || []
  }

  // Get memory events by timestamp range
  static async getMemoryEventsByTimestampRange(
    startTimestamp: string,
    endTimestamp: string,
    limit: number = 50
  ): Promise<HyperIndexMemoryStored[]> {
    const query = `
      query GetMemoryEventsByTimestampRange($startTimestamp: String!, $endTimestamp: String!, $limit: Int!) {
        memoryStoreds(
          where: { 
            timestamp_gte: $startTimestamp,
            timestamp_lte: $endTimestamp
          }
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
    `

    const data = await this.executeGraphQLQuery(query, { startTimestamp, endTimestamp, limit })
    return data.memoryStoreds || []
  }

  // Check if HyperIndex is available
  static async isAvailable(): Promise<boolean> {
    try {
      await this.getSystemStats()
      return true
    } catch (error) {
      console.warn('HyperIndex is not available:', error)
      return false
    }
  }

  // Get comprehensive user activity
  static async getUserActivity(userAddress: string): Promise<{
    memories: HyperIndexMemoryStored[]
    gasDeposits: HyperIndexGasDeposited[]
    gasWithdrawals: HyperIndexGasWithdrawn[]
    userStats: HyperIndexUser | null
  }> {
    const [memories, gasDeposits, gasWithdrawals, userStats] = await Promise.all([
      this.getUserMemoryEvents(userAddress, 50),
      this.getUserGasDeposits(userAddress, 20),
      this.getUserGasWithdrawals(userAddress, 20),
      this.getUserStats(userAddress)
    ])

    return {
      memories,
      gasDeposits,
      gasWithdrawals,
      userStats
    }
  }
}
