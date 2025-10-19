import { PrismaClient } from '@prisma/client'
import Queue from 'bull'

const prisma = new PrismaClient()

// Queue for background prefetching
const blockscoutQueue = new Queue('blockscout-prefetch', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Network configurations
const NETWORK_CONFIGS = {
  sepolia: {
    apiUrl: 'https://eth-sepolia.blockscout.com/api/v2',
    finalityBlocks: 2, // Sepolia has 2 block finality
    blockTime: 12000, // ~12 seconds
  },
  mainnet: {
    apiUrl: 'https://eth.blockscout.com/api/v2',
    finalityBlocks: 12, // Ethereum mainnet has 12 block finality
    blockTime: 12000,
  },
  polygon: {
    apiUrl: 'https://polygon.blockscout.com/api/v2',
    finalityBlocks: 128, // Polygon has 128 block finality
    blockTime: 2000,
  },
  arbitrum: {
    apiUrl: 'https://arbitrum.blockscout.com/api/v2',
    finalityBlocks: 1, // Arbitrum has 1 block finality
    blockTime: 250,
  },
  optimism: {
    apiUrl: 'https://optimism.blockscout.com/api/v2',
    finalityBlocks: 1, // Optimism has 1 block finality
    blockTime: 2000,
  },
} as const

type Network = keyof typeof NETWORK_CONFIGS

interface BlockscoutTransactionData {
  hash: string
  status: 'ok' | 'error'
  block?: string
  gas_used?: string
  gas_price?: string
  from?: { hash: string }
  to?: { hash: string }
  value?: string
  timestamp?: string
}

export class BlockscoutPrefetchService {
  /**
   * Prefetch transaction data from Blockscout API
   */
  static async prefetchTransaction(txHash: string, network: Network = 'sepolia'): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if transaction already exists in cache
      const existing = await prisma.blockscoutTransaction.findUnique({
        where: { tx_hash: txHash }
      })

      if (existing && existing.finality_reached) {
        console.log(`Transaction ${txHash} already cached with finality`)
        return
      }

      // Fetch from Blockscout API
      const config = NETWORK_CONFIGS[network]
      const response = await fetch(`${config.apiUrl}/transactions/${txHash}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Transaction not found, might still be pending
          await this.handlePendingTransaction(txHash, network)
          return
        }
        if (response.status === 429) {
          // Rate limited, wait and retry
          console.log(`Rate limited for ${txHash}, waiting 5 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
          return // Skip this transaction for now, it will be retried later
        }
        throw new Error(`Blockscout API error: ${response.status}`)
      }

      const txData: BlockscoutTransactionData = await response.json()
      
      // Determine finality status
      const finalityReached = await this.checkFinality(txData, network)
      
      // Store or update transaction data
      await this.storeTransactionData(txHash, network, txData, finalityReached)
      
      // If not final, schedule recheck
      if (!finalityReached) {
        await this.scheduleRecheck(txHash, network)
      }
      
    } catch (error) {
      console.error(`Failed to prefetch transaction ${txHash}:`, error)
      // Schedule retry
      await this.scheduleRecheck(txHash, network, 30000) // Retry in 30 seconds
    }
  }

  /**
   * Get cached transaction data
   */
  static async getCachedTransaction(txHash: string): Promise<any | null> {
    try {
      const cached = await prisma.blockscoutTransaction.findUnique({
        where: { tx_hash: txHash }
      })

      if (!cached) return null

      // If finality reached, return cached data
      if (cached.finality_reached) {
        return {
          hash: cached.tx_hash,
          status: cached.status === 'confirmed' ? 'ok' : 'error',
          block: cached.block_number?.toString(),
          gas_used: cached.gas_used,
          gas_price: cached.gas_price,
          from: cached.from_address ? { hash: cached.from_address } : undefined,
          to: cached.to_address ? { hash: cached.to_address } : undefined,
          value: cached.value,
          timestamp: cached.timestamp?.toString(),
          finality_reached: true,
          cached_at: cached.updated_at
        }
      }

      // If not final, check if we should refresh
      const timeSinceLastCheck = Date.now() - cached.last_checked_at.getTime()
      const shouldRefresh = timeSinceLastCheck > 10000 // 10 seconds

      if (shouldRefresh) {
        // Trigger background refresh
        await this.scheduleRecheck(cached.tx_hash, cached.network as Network, 0)
      }

      return {
        hash: cached.tx_hash,
        status: cached.status === 'confirmed' ? 'ok' : 'error',
        block: cached.block_number?.toString(),
        gas_used: cached.gas_used,
        gas_price: cached.gas_price,
        from: cached.from_address ? { hash: cached.from_address } : undefined,
        to: cached.to_address ? { hash: cached.to_address } : undefined,
        value: cached.value,
        timestamp: cached.timestamp?.toString(),
        finality_reached: false,
        cached_at: cached.updated_at
      }
    } catch (error) {
      console.error(`Failed to get cached transaction ${txHash}:`, error)
      return null
    }
  }

  /**
   * Check if transaction has reached finality
   */
  private static async checkFinality(txData: BlockscoutTransactionData, network: Network): Promise<boolean> {
    if (!txData.block) return false

    const config = NETWORK_CONFIGS[network]
    const currentBlock = await this.getCurrentBlockNumber(network)
    const txBlock = parseInt(txData.block)
    
    return (currentBlock - txBlock) >= config.finalityBlocks
  }

  /**
   * Get current block number for network
   */
  private static async getCurrentBlockNumber(network: Network): Promise<number> {
    try {
      const config = NETWORK_CONFIGS[network]
      const response = await fetch(`${config.apiUrl}/stats`)
      const stats = await response.json()
      return parseInt(stats.total_blocks) || 0
    } catch (error) {
      console.error(`Failed to get current block for ${network}:`, error)
      return 0
    }
  }

  /**
   * Store transaction data in database
   */
  private static async storeTransactionData(
    txHash: string,
    network: Network,
    txData: BlockscoutTransactionData,
    finalityReached: boolean
  ): Promise<void> {
    const status = txData.status === 'ok' ? 'confirmed' : 'failed'
    
    await prisma.blockscoutTransaction.upsert({
      where: { tx_hash: txHash },
      update: {
        status,
        block_number: txData.block ? BigInt(txData.block) : null,
        gas_used: txData.gas_used,
        gas_price: txData.gas_price,
        from_address: txData.from?.hash,
        to_address: txData.to?.hash,
        value: txData.value,
        timestamp: txData.timestamp ? Math.floor(new Date(txData.timestamp).getTime() / 1000) : null,
        finality_reached: finalityReached,
        finality_confirmed_at: finalityReached ? new Date() : null,
        raw_data: txData as any,
        last_checked_at: new Date(),
        check_count: { increment: 1 }
      },
      create: {
        tx_hash: txHash,
        network,
        status,
        block_number: txData.block ? BigInt(txData.block) : null,
        gas_used: txData.gas_used,
        gas_price: txData.gas_price,
        from_address: txData.from?.hash,
        to_address: txData.to?.hash,
        value: txData.value,
        timestamp: txData.timestamp ? Math.floor(new Date(txData.timestamp).getTime() / 1000) : null,
        finality_reached: finalityReached,
        finality_confirmed_at: finalityReached ? new Date() : null,
        raw_data: txData as any,
        last_checked_at: new Date(),
        check_count: 1
      }
    })
  }

  /**
   * Handle pending transaction (not found in API)
   */
  private static async handlePendingTransaction(txHash: string, network: Network): Promise<void> {
    await prisma.blockscoutTransaction.upsert({
      where: { tx_hash: txHash },
      update: {
        status: 'pending',
        last_checked_at: new Date(),
        check_count: { increment: 1 }
      },
      create: {
        tx_hash: txHash,
        network,
        status: 'pending',
        last_checked_at: new Date(),
        check_count: 1
      }
    })
  }

  /**
   * Schedule transaction recheck
   */
  private static async scheduleRecheck(txHash: string, network: Network, delay: number = 0): Promise<void> {
    await blockscoutQueue.add(
      'recheck-transaction',
      { txHash, network },
      { delay }
    )
  }

  /**
   * Batch prefetch multiple transactions
   */
  static async batchPrefetch(transactions: Array<{ txHash: string; network: Network }>): Promise<void> {
    const jobs = transactions.map(({ txHash, network }) => 
      blockscoutQueue.add('prefetch-transaction', { txHash, network })
    )
    
    await Promise.all(jobs)
  }

  /**
   * Clean up old pending transactions
   */
  static async cleanupOldPendingTransactions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    await prisma.blockscoutTransaction.deleteMany({
      where: {
        status: 'pending',
        finality_reached: false,
        last_checked_at: { lt: cutoffTime }
      }
    })
  }
}

// Queue processor
blockscoutQueue.process('prefetch-transaction', async (job) => {
  const { txHash, network } = job.data
  await BlockscoutPrefetchService.prefetchTransaction(txHash, network)
})

blockscoutQueue.process('recheck-transaction', async (job) => {
  const { txHash, network } = job.data
  await BlockscoutPrefetchService.prefetchTransaction(txHash, network)
})

blockscoutQueue.process('batch-prefetch', async (job) => {
  const { transactions } = job.data
  await BlockscoutPrefetchService.batchPrefetch(transactions)
})

blockscoutQueue.process('cleanup-old-pending', async () => {
  await BlockscoutPrefetchService.cleanupOldPendingTransactions()
})

export default BlockscoutPrefetchService
