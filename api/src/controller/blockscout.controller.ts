import { Request, Response } from 'express'
import BlockscoutPrefetchService from '../services/blockscoutPrefetch'
import { EventEmitter } from 'events'
import crypto from 'crypto'

interface BlockscoutJob {
  id: string
  data: any
  attempts: number
  maxAttempts: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

class BlockscoutInMemoryQueue extends EventEmitter {
  private jobs: Map<string, BlockscoutJob> = new Map()
  private processingJobs: Set<string> = new Set()

  async add(jobType: string, data: any, options?: { delay?: number }) {
    const id = crypto.randomUUID()
    const job: BlockscoutJob = {
      id,
      data,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
    }
    
    this.jobs.set(id, job)
    return { id }
  }

  async getWaiting(): Promise<BlockscoutJob[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === 'pending')
  }

  async getActive(): Promise<BlockscoutJob[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === 'processing')
  }

  async getCompleted(): Promise<BlockscoutJob[]> {
    return []
  }

  async getFailed(): Promise<BlockscoutJob[]> {
    return []
  }
}

const blockscoutQueue = new BlockscoutInMemoryQueue()

export class BlockscoutController {
  /**
   * Prefetch a single transaction
   */
  static async prefetchTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { txHash, network = 'sepolia' } = req.body

      if (!txHash) {
        res.status(400).json({ error: 'Transaction hash is required' })
        return
      }

      // Trigger background prefetch
      await blockscoutQueue.add('prefetch-transaction', { txHash, network })

      res.json({ 
        message: 'Transaction prefetch initiated',
        txHash,
        network 
      })
    } catch (error) {
      console.error('Error prefetching transaction:', error)
      res.status(500).json({ error: 'Failed to prefetch transaction' })
    }
  }

  /**
   * Get cached transaction data
   */
  static async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { txHash } = req.params

      if (!txHash) {
        res.status(400).json({ error: 'Transaction hash is required' })
        return
      }

      const cachedData = await BlockscoutPrefetchService.getCachedTransaction(txHash)

      if (!cachedData) {
        res.status(404).json({ error: 'Transaction not found in cache' })
        return
      }

      res.json(cachedData)
    } catch (error) {
      console.error('Error getting cached transaction:', error)
      res.status(500).json({ error: 'Failed to get cached transaction' })
    }
  }

  /**
   * Batch prefetch multiple transactions
   */
  static async batchPrefetch(req: Request, res: Response): Promise<void> {
    try {
      const { transactions } = req.body

      if (!transactions || !Array.isArray(transactions)) {
        res.status(400).json({ error: 'Transactions array is required' })
        return
      }

      // Validate transaction format
      const validTransactions = transactions.filter(tx => 
        tx.txHash && typeof tx.txHash === 'string'
      )

      if (validTransactions.length === 0) {
        res.status(400).json({ error: 'No valid transactions provided' })
        return
      }

      // Trigger batch prefetch
      await blockscoutQueue.add('batch-prefetch', { transactions: validTransactions })

      res.json({ 
        message: 'Batch prefetch initiated',
        count: validTransactions.length 
      })
    } catch (error) {
      console.error('Error batch prefetching transactions:', error)
      res.status(500).json({ error: 'Failed to batch prefetch transactions' })
    }
  }

  /**
   * Get prefetch status for a transaction
   */
  static async getPrefetchStatus(req: Request, res: Response): Promise<void> {
    try {
      const { txHash } = req.params

      if (!txHash) {
        res.status(400).json({ error: 'Transaction hash is required' })
        return
      }

      const cachedData = await BlockscoutPrefetchService.getCachedTransaction(txHash)

      if (!cachedData) {
        res.json({ 
          status: 'not_found',
          message: 'Transaction not in cache'
        })
        return
      }

      res.json({
        status: cachedData.finality_reached ? 'final' : 'pending',
        finality_reached: cachedData.finality_reached,
        cached_at: cachedData.cached_at,
        data: cachedData
      })
    } catch (error) {
      console.error('Error getting prefetch status:', error)
      res.status(500).json({ error: 'Failed to get prefetch status' })
    }
  }

  /**
   * Trigger cleanup of old pending transactions
   */
  static async cleanupOldPending(req: Request, res: Response): Promise<void> {
    try {
      await blockscoutQueue.add('cleanup-old-pending', {})

      res.json({ message: 'Cleanup job initiated' })
    } catch (error) {
      console.error('Error triggering cleanup:', error)
      res.status(500).json({ error: 'Failed to trigger cleanup' })
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const waiting = await blockscoutQueue.getWaiting()
      const active = await blockscoutQueue.getActive()
      const completed = await blockscoutQueue.getCompleted()
      const failed = await blockscoutQueue.getFailed()

      res.json({
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      })
    } catch (error) {
      console.error('Error getting queue stats:', error)
      res.status(500).json({ error: 'Failed to get queue statistics' })
    }
  }
}
