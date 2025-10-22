import { EventEmitter } from 'events'
import crypto from 'crypto'
import BlockscoutPrefetchService from '../services/blockscoutPrefetch'

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
  private processors: Map<string, (job: any) => Promise<any>> = new Map()
  private isProcessing = false

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
    
    if (options?.delay) {
      setTimeout(() => this.processNext(), options.delay)
    } else {
      this.processNext()
    }
    
    return { id }
  }

  process(jobType: string, handler: (job: any) => Promise<any>) {
    this.processors.set(jobType, handler)
  }

  private async processNext() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    while (true) {
      const pendingJob = Array.from(this.jobs.values()).find(
        j => j.status === 'pending' && !this.processingJobs.has(j.id)
      )
      
      if (!pendingJob) break
      
      this.processingJobs.add(pendingJob.id)
      pendingJob.status = 'processing'
      
      const jobType = this.getJobType(pendingJob.data)
      const processor = this.processors.get(jobType)
      
      if (!processor) {
        console.error(`No processor found for job type: ${jobType}`)
        this.processingJobs.delete(pendingJob.id)
        this.jobs.delete(pendingJob.id)
        continue
      }
      
      try {
        await processor({ id: pendingJob.id, data: pendingJob.data, name: jobType })
        pendingJob.status = 'completed'
        this.emit('completed', { id: pendingJob.id, name: jobType })
        this.jobs.delete(pendingJob.id)
      } catch (error) {
        pendingJob.attempts++
        
        if (pendingJob.attempts >= pendingJob.maxAttempts) {
          pendingJob.status = 'failed'
          this.emit('failed', { id: pendingJob.id, name: jobType }, error)
          this.jobs.delete(pendingJob.id)
        } else {
          pendingJob.status = 'pending'
          setTimeout(() => this.processNext(), 2000 * Math.pow(2, pendingJob.attempts - 1))
        }
      } finally {
        this.processingJobs.delete(pendingJob.id)
      }
    }
    
    this.isProcessing = false
  }

  private getJobType(data: any): string {
    if (data.txHash && data.network) return 'prefetch-transaction'
    if (data.transactions) return 'batch-prefetch'
    return 'cleanup-old-pending'
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }

  async close() {
    this.jobs.clear()
    this.processingJobs.clear()
    this.processors.clear()
  }
}

const blockscoutQueue = new BlockscoutInMemoryQueue()

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

blockscoutQueue.on('completed', (job) => {
})

blockscoutQueue.on('failed', (job, err) => {
  console.error(`Blockscout job ${job?.id} failed: ${job?.name}`, err)
})

process.on('SIGINT', async () => {
  await blockscoutQueue.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await blockscoutQueue.close()
  process.exit(0)
})

export default blockscoutQueue
