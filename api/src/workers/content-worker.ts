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
import { normalizeText, hashCanonical, normalizeUrl, calculateSimilarity } from '../utils/text.util'
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
          await ensureNotCancelled()
          const user = await prisma.user.findUnique({
            where: { id: user_id },
          })

          if (user) {
            const canonicalText = normalizeText(raw_text)
            const canonicalHash = hashCanonical(canonicalText)

            const existingByCanonical = await prisma.memory.findFirst({
              where: { user_id: user.id, canonical_hash: canonicalHash },
            })

            if (existingByCanonical) {
              return {
                success: true,
                contentId: existingByCanonical.id,
                memoryId: existingByCanonical.id,
                summary:
                  existingByCanonical.summary?.substring(0, 100) + '...' || 'Duplicate memory',
              }
            }

            if (metadata?.url && metadata.url !== 'unknown') {
              const normalizedUrl = normalizeUrl(metadata.url)
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

              const recentMemories = await prisma.memory.findMany({
                where: {
                  user_id,
                  created_at: { gte: oneHourAgo },
                },
                orderBy: { created_at: 'desc' },
                take: 50,
              })

              for (const existingMemory of recentMemories) {
                const existingUrl = existingMemory.url
                if (
                  existingUrl &&
                  typeof existingUrl === 'string' &&
                  normalizeUrl(existingUrl) === normalizedUrl
                ) {
                  const existingCanonical = normalizeText(existingMemory.content || '')
                  const similarity = calculateSimilarity(canonicalText, existingCanonical)

                  if (similarity > 0.9) {
                    logger.log(`[Redis Worker] URL duplicate detected, skipping processing`, {
                      jobId: job.id,
                      userId: user_id,
                      existingMemoryId: existingMemory.id,
                      similarity,
                    })
                    return {
                      success: true,
                      contentId: existingMemory.id,
                      memoryId: existingMemory.id,
                      summary:
                        existingMemory.summary?.substring(0, 100) + '...' || 'Duplicate memory',
                    }
                  }
                }
              }
            }
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

        let summary: string | null = null
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            await ensureNotCancelled()
            if (attempt > 1) {
              logger.log(`[Redis Worker] Retrying job (attempt ${attempt}/${maxAttempts})`, {
                jobId: job.id,
                userId: user_id,
                attempt,
              })
            }
            const summaryResult = await aiProvider.summarizeContent(raw_text, metadata)
            if (typeof summaryResult === 'string') {
              summary = summaryResult
            } else {
              const result = summaryResult as { text?: string }
              summary = result.text || summaryResult
            }
            break
          } catch (err) {
            const error = err as Error | undefined
            if (error && error.name === 'JobCancelledError') {
              throw error
            }
            if (!isRetryableError(err) || attempt === maxAttempts) {
              logger.error(`[Redis Worker] Job failed permanently`, {
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
            logger.warn(`[Redis Worker] Job retryable error, backing off`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              backoffMs: backoff + jitter,
              error: err?.message || String(err),
            })
            await sleep(backoff + jitter)
            await ensureNotCancelled()
          }
        }

        if (!summary) {
          logger.error(`[Redis Worker] Failed to generate summary after all retries`, {
            jobId: job.id,
            userId: user_id,
            maxAttempts,
          })
          throw new Error('Failed to generate summary after retries')
        }

        await ensureNotCancelled()

        let extractedMetadata: {
          topics?: string[]
          categories?: string[]
          keyPoints?: string[]
          sentiment?: string
          importance?: number
          usefulness?: number
          searchableTerms?: string[]
          contextRelevance?: string[]
        } = {}
        try {
          await ensureNotCancelled()
          const extractedMetadataResult = await aiProvider.extractContentMetadata(
            raw_text,
            metadata,
            user_id
          )
          if (
            typeof extractedMetadataResult === 'object' &&
            extractedMetadataResult !== null &&
            'topics' in extractedMetadataResult
          ) {
            extractedMetadata = extractedMetadataResult
          } else if (
            typeof extractedMetadataResult === 'object' &&
            extractedMetadataResult !== null &&
            'metadata' in extractedMetadataResult
          ) {
            extractedMetadata =
              (extractedMetadataResult as { metadata?: typeof extractedMetadata }).metadata ||
              extractedMetadataResult
          } else {
            extractedMetadata = extractedMetadataResult as typeof extractedMetadata
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
        }

        if (metadata?.memory_id) {
          const pageMetadata = {
            ...metadata,
            extracted_metadata: extractedMetadata,
            topics: extractedMetadata.topics,
            categories: extractedMetadata.categories,
            key_points: extractedMetadata.keyPoints,
            sentiment: extractedMetadata.sentiment,
            importance: extractedMetadata.importance,
            searchable_terms: extractedMetadata.searchableTerms,
          }
          await ensureNotCancelled()
          await prisma.memory.update({
            where: { id: metadata.memory_id },
            data: {
              summary: summary,
              page_metadata: pageMetadata,
            },
          })
          await ensureNotCancelled()
          await memoryMeshService.generateEmbeddingsForMemory(metadata.memory_id)
          await memoryMeshService.createMemoryRelations(metadata.memory_id, user_id)

          const summaryHash = createHash('sha256').update(summary).digest('hex')

          await prisma.memorySnapshot.create({
            data: {
              user_id,
              raw_text,
              summary,
              summary_hash: summaryHash,
            },
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
          await ensureNotCancelled()
          const user = await prisma.user.findUnique({
            where: { id: user_id },
          })

          if (user) {
            const canonicalText = normalizeText(raw_text)
            const canonicalHash = hashCanonical(canonicalText)
            const timestamp = Math.floor(Date.now() / 1000)

            let memory
            try {
              const pageMetadata = {
                ...metadata,
                extracted_metadata: extractedMetadata,
                topics: extractedMetadata.topics,
                categories: extractedMetadata.categories,
                key_points: extractedMetadata.keyPoints,
                sentiment: extractedMetadata.sentiment,
                importance: extractedMetadata.importance,
                searchable_terms: extractedMetadata.searchableTerms,
              }
              await ensureNotCancelled()
              memory = await prisma.memory.create({
                data: {
                  user_id,
                  source: metadata?.source || 'queue',
                  url: metadata?.url || 'unknown',
                  title: metadata?.title || 'Untitled',
                  content: raw_text,
                  summary: summary,
                  canonical_text: canonicalText,
                  canonical_hash: canonicalHash,
                  timestamp: BigInt(timestamp),
                  full_content: raw_text,
                  page_metadata: pageMetadata,
                },
              })
            } catch (createError) {
              const error = createError as PrismaError
              if (error.code === 'P2002') {
                const existingByCanonical = await prisma.memory.findFirst({
                  where: { user_id, canonical_hash: canonicalHash },
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

            await ensureNotCancelled()
            await memoryMeshService.generateEmbeddingsForMemory(memory.id)
            await memoryMeshService.createMemoryRelations(memory.id, user_id)

            const summaryHash = '0x' + createHash('sha256').update(summary).digest('hex')

            await prisma.memorySnapshot.create({
              data: {
                user_id,
                raw_text,
                summary,
                summary_hash: summaryHash,
              },
            })

            logger.log(`[Redis Worker] New memory created successfully`, {
              jobId: job.id,
              userId: user_id,
              memoryId: memory.id,
            })

            setImmediate(async () => {
              try {
                const shouldUpdate = await profileUpdateService.shouldUpdateProfile(user_id, 7)
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
              } catch (profileError) {
                logger.error(`[Redis Worker] Error updating profile:`, profileError)
              }
            })
          }
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
    }
  )
}
