import { Worker } from 'bullmq'
import { ContentJobData, getContentJobCancellationKey } from '../lib/queue.lib'
import { aiProvider } from '../services/ai-provider.service'
import { memoryMeshService } from '../services/memory-mesh.service'
import { profileUpdateService } from '../services/profile-update.service'
import { prisma } from '../lib/prisma.lib'
import { createHash } from 'crypto'
import {
  getQueueConcurrency,
  getRedisConnection,
  getQueueLimiter,
  getQueueStalledInterval,
  getQueueMaxStalledCount,
} from '../utils/env.util'
import { memoryIngestionService } from '../services/memory-ingestion.service'
import { memoryScoringService } from '../services/memory-scoring.service'
import { logger } from '../utils/logger.util'
import { getRedisClient } from '../lib/redis.lib'

type PrismaError = {
  code?: string
  message?: string
  status?: number
}

type RetryableError = {
  message?: string
  status?: number
  code?: number | string
}

const PROFILE_IMPORTANCE_THRESHOLD = Number(process.env.PROFILE_IMPORTANCE_THRESHOLD || 0.7)

export const startContentWorker = () => {
  return new Worker<ContentJobData>(
    'process-content',
    async job => {
      const redis = getRedisClient()
      const cancellationKey = job.id ? getContentJobCancellationKey(job.id) : null

      const ensureNotCancelled = async () => {
        if (!cancellationKey) {
          return
        }
        const cancelled = await redis.get(cancellationKey)
        if (!cancelled) {
          return
        }
        await redis.del(cancellationKey)
        const cancellationError = new Error('Job cancelled by user request')
        cancellationError.name = 'JobCancelledError'
        throw cancellationError
      }

      await ensureNotCancelled()

      const { user_id, raw_text, metadata } = job.data as ContentJobData
      const baseUrl = typeof metadata?.url === 'string' ? (metadata.url as string) : undefined
      let canonicalData =
        !metadata?.memory_id && raw_text
          ? memoryIngestionService.canonicalizeContent(raw_text, baseUrl)
          : null

      const handleCancellationError = (error?: Error) => {
        if (error && error.name === 'JobCancelledError') {
          logger.warn(`[Redis Worker] Job cancelled by user`, {
            jobId: job.id,
            userId: user_id,
          })
        }
      }

      try {
        if (!metadata?.memory_id) {
          const [user, duplicateCheck] = await Promise.all([
            prisma.user.findUnique({
              where: { id: user_id },
            }),
            canonicalData
              ? memoryIngestionService.findDuplicateMemory({
                  userId: user_id,
                  canonicalHash: canonicalData.canonicalHash,
                  canonicalText: canonicalData.canonicalText,
                  url: baseUrl,
                })
              : Promise.resolve(null),
          ])

          if (duplicateCheck) {
            const merged = await memoryIngestionService.mergeDuplicateMemory(
              duplicateCheck.memory,
              metadata,
              undefined
            )
            logger.log(`[Redis Worker] Duplicate detected, skipping processing`, {
              jobId: job.id,
              userId: user_id,
              existingMemoryId: merged.id,
              reason: duplicateCheck.reason,
            })
            return {
              success: true,
              contentId: merged.id,
              memoryId: merged.id,
              summary: merged.summary?.substring(0, 100) + '...' || 'Duplicate memory',
            }
          }

          if (!user) {
            throw new Error(`User not found: ${user_id}`)
          }
        }

        const isRetryableError = (err: unknown): boolean => {
          const error = err as RetryableError
          const msg = String(error?.message || '').toLowerCase()
          const status = Number((error?.status ?? error?.code) || 0)
          return (
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504 ||
            msg.includes('overloaded') ||
            msg.includes('unavailable') ||
            msg.includes('rate limit') ||
            msg.includes('quota')
          )
        }

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

        const maxAttempts = 3
        const baseDelayMs = 2000
        const maxDelayMs = 60_000

        // Run AI calls in parallel for faster processing
        // Note: This optimization applies to all jobs in the queue, including those
        // queued before this implementation, as the worker code is loaded at runtime.
        const [summaryResult, extractedMetadataResult] = await Promise.all([
          (async () => {
            let summary: string | null = null
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              try {
                if (attempt > 1) {
                  logger.log(`[Redis Worker] Retrying summary (attempt ${attempt}/${maxAttempts})`, {
                    jobId: job.id,
                    userId: user_id,
                    attempt,
                  })
                }
                const result = await aiProvider.summarizeContent(raw_text, metadata, user_id)
                if (typeof result === 'string') {
                  summary = result
                } else {
                  const res = result as { text?: string }
                  summary = res.text || result
                }
                break
              } catch (err) {
                const error = err as Error | undefined
                if (error && error.name === 'JobCancelledError') {
                  throw error
                }
                if (!isRetryableError(err) || attempt === maxAttempts) {
                  logger.error(`[Redis Worker] Summary failed permanently`, {
                    jobId: job.id,
                    userId: user_id,
                    attempt,
                    error: err?.message || String(err),
                    isRetryable: isRetryableError(err),
                  })
                  throw err
                }
                const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
                const jitter = Math.floor(Math.random() * 500)
                logger.warn(`[Redis Worker] Summary retryable error, backing off`, {
                  jobId: job.id,
                  userId: user_id,
                  attempt,
                  backoffMs: backoff + jitter,
                  error: err?.message || String(err),
                })
                await sleep(backoff + jitter)
              }
            }
            if (!summary) {
              throw new Error('Failed to generate summary after retries')
            }
            return summary
          })(),
          (async () => {
            try {
              const result = await aiProvider.extractContentMetadata(raw_text, metadata, user_id)
              if (
                typeof result === 'object' &&
                result !== null &&
                'topics' in result
              ) {
                return result
              } else if (
                typeof result === 'object' &&
                result !== null &&
                'metadata' in result
              ) {
                return (result as { metadata?: any }).metadata || result
              } else {
                return result
              }
            } catch (metadataError) {
              const error = metadataError as Error | undefined
              if (error && error.name === 'JobCancelledError') {
                throw error
              }
              logger.warn(`[Redis Worker] Failed to extract metadata, continuing without it`, {
                jobId: job.id,
                userId: user_id,
                error: metadataError?.message || String(metadataError),
              })
              return {}
            }
          })(),
        ])

        const summary = summaryResult
        const extractedMetadata = extractedMetadataResult as {
          topics?: string[]
          categories?: string[]
          keyPoints?: string[]
          sentiment?: string
          importance?: number
          usefulness?: number
          searchableTerms?: string[]
          contextRelevance?: string[]
        }

        if (metadata?.memory_id) {
          const pageMetadata = memoryIngestionService.buildPageMetadata(metadata, extractedMetadata)
          const [existingMemory] = await Promise.all([
            prisma.memory.findUnique({
              where: { id: metadata.memory_id },
              select: { page_metadata: true },
            }),
            ensureNotCancelled(),
          ])
          const mergedMetadata = memoryScoringService.mergeMetadata(
            existingMemory?.page_metadata,
            pageMetadata
          )
          
          const summaryHash = createHash('sha256').update(summary).digest('hex')

          await Promise.all([
            prisma.memory.update({
              where: { id: metadata.memory_id },
              data: {
                summary: summary,
                page_metadata: mergedMetadata,
              },
            }),
            prisma.memorySnapshot.create({
              data: {
                user_id,
                raw_text,
                summary,
                summary_hash: summaryHash,
              },
            }),
          ])
          
          // Generate embeddings and relations in background (non-blocking)
          setImmediate(async () => {
            try {
              await memoryMeshService.generateEmbeddingsForMemory(metadata.memory_id)
              await memoryMeshService.createMemoryRelations(metadata.memory_id, user_id)
            } catch (embeddingError) {
              logger.error(`[Redis Worker] Error generating embeddings:`, embeddingError)
            }
          })

          setImmediate(async () => {
            try {
              const shouldUpdate = await profileUpdateService.shouldUpdateProfile(user_id, 7)
              if (shouldUpdate) {
                await profileUpdateService.updateUserProfile(user_id)
              }
            } catch (profileError) {
              logger.error(`[Redis Worker] Error updating profile:`, profileError)
            }
          })
        } else {
          if (!canonicalData) {
            canonicalData = memoryIngestionService.canonicalizeContent(raw_text, baseUrl)
          }
          const extractedMetadataRecord =
            extractedMetadata && typeof extractedMetadata === 'object'
              ? (extractedMetadata as Record<string, unknown>)
              : undefined
          const memoryCreateInput = memoryIngestionService.buildMemoryCreatePayload({
            userId: user_id,
            title: metadata?.title as string | undefined,
            url: baseUrl,
            source: (metadata?.source as string | undefined) || undefined,
            content: raw_text,
            summary,
            metadata,
            extractedMetadata: extractedMetadataRecord,
            canonicalText: canonicalData.canonicalText,
            canonicalHash: canonicalData.canonicalHash,
          })
          
          let memory
          try {
            const summaryHash = '0x' + createHash('sha256').update(summary).digest('hex')
            
            const [createdMemory] = await Promise.all([
              prisma.memory.create({
                data: memoryCreateInput,
              }),
              prisma.memorySnapshot.create({
                data: {
                  user_id,
                  raw_text,
                  summary,
                  summary_hash: summaryHash,
                },
              }),
              ensureNotCancelled(),
            ])
            memory = createdMemory
          } catch (createError) {
            const error = createError as PrismaError
            if (error.code === 'P2002') {
              const existingByCanonical = await prisma.memory.findFirst({
                where: { user_id, canonical_hash: canonicalData?.canonicalHash },
              })

              if (existingByCanonical) {
                return {
                  success: true,
                  contentId: existingByCanonical.id,
                  memoryId: existingByCanonical.id,
                  summary: summary.substring(0, 100) + '...',
                }
              }
            }
            throw createError
          }

          // Generate embeddings and relations in background (non-blocking)
          setImmediate(async () => {
            try {
              await memoryMeshService.generateEmbeddingsForMemory(memory.id)
              await memoryMeshService.createMemoryRelations(memory.id, user_id)
            } catch (embeddingError) {
              logger.error(`[Redis Worker] Error generating embeddings:`, embeddingError)
            }
          })

          logger.log(`[Redis Worker] New memory created successfully`, {
            jobId: job.id,
            userId: user_id,
            memoryId: memory.id,
          })

          setImmediate(async () => {
            try {
              const importanceScore = memory.importance_score || 0
              if (importanceScore >= PROFILE_IMPORTANCE_THRESHOLD) {
                const shouldUpdate = await profileUpdateService.shouldUpdateProfile(user_id, 3)
                if (shouldUpdate) {
                  logger.log(`[Redis Worker] Triggering profile update`, {
                    jobId: job.id,
                    userId: user_id,
                  })
                  await profileUpdateService.updateUserProfile(user_id)
                  logger.log(`[Redis Worker] Profile update completed`, {
                    jobId: job.id,
                    userId: user_id,
                  })
                }
              }
            } catch (profileError) {
              logger.error(`[Redis Worker] Error updating profile:`, profileError)
            }
          })
        }

        const result = {
          success: true,
          contentId: metadata?.memory_id || 'memory_processed',
          memoryId: metadata?.memory_id || null,
          summary: summary.substring(0, 100) + '...',
        }

        return result
      } catch (err) {
        handleCancellationError(err as Error | undefined)
        throw err
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: getQueueConcurrency(),
      limiter: getQueueLimiter(),
      stalledInterval: getQueueStalledInterval(),
      maxStalledCount: getQueueMaxStalledCount(),
      // Lock duration is handled automatically by BullMQ
      // Increased Redis command timeout in getRedisConnection() prevents lock renewal failures
      // Jobs with 4-minute AI calls should complete within the default lock renewal window
    }
  )
}
