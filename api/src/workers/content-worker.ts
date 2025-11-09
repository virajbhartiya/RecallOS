import { Worker } from 'bullmq'
import { ContentJobData } from '../lib/queue.lib'
import { aiProvider } from '../services/ai-provider.service'
import { memoryMeshService } from '../services/memory-mesh.service'
import { profileUpdateService } from '../services/profile-update.service'
import { prisma } from '../lib/prisma.lib'
import { createHash } from 'crypto'
import { getQueueConcurrency, getRedisConnection, getQueueLimiter } from '../utils/env.util'
import { normalizeText, hashCanonical, normalizeUrl, calculateSimilarity } from '../utils/text.util'
import { logger } from '../utils/logger.util'

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
      const { user_id, raw_text, metadata } = job.data as ContentJobData

      logger.log(`[Redis Worker] Processing job started`, {
        jobId: job.id,
        userId: user_id,
        contentLength: raw_text?.length || 0,
        source: metadata?.source || 'unknown',
        attemptsMade: job.attemptsMade,
        timestamp: new Date().toISOString(),
      })

      if (!metadata?.memory_id) {
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
            logger.log(`[Redis Worker] Duplicate memory detected, skipping processing`, {
              jobId: job.id,
              userId: user_id,
              existingMemoryId: existingByCanonical.id,
              timestamp: new Date().toISOString(),
            })
            return {
              success: true,
              contentId: existingByCanonical.id,
              memoryId: existingByCanonical.id,
              summary: existingByCanonical.summary?.substring(0, 100) + '...' || 'Duplicate memory',
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
                    timestamp: new Date().toISOString(),
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

      const maxAttempts = 8
      const baseDelayMs = 3000
      const maxDelayMs = 60_000

      let summary: string | null = null
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            logger.log(`[Redis Worker] Retrying job (attempt ${attempt}/${maxAttempts})`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              timestamp: new Date().toISOString(),
            })
          }
          const summaryResult = await aiProvider.summarizeContent(raw_text, metadata)
          if (typeof summaryResult === 'string') {
            summary = summaryResult
          } else {
            const result = summaryResult as { text?: string }
            summary = result.text || summaryResult
          }
          if (attempt > 1) {
            logger.log(`[Redis Worker] Job retry successful`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              timestamp: new Date().toISOString(),
            })
          }
          break
        } catch (err) {
          if (!isRetryableError(err) || attempt === maxAttempts) {
            logger.error(`[Redis Worker] Job failed permanently`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              error: err?.message || String(err),
              isRetryable: isRetryableError(err),
              timestamp: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
          })
          await sleep(backoff + jitter)
        }
      }

      if (!summary) {
        logger.error(`[Redis Worker] Failed to generate summary after all retries`, {
          jobId: job.id,
          userId: user_id,
          maxAttempts,
          timestamp: new Date().toISOString(),
        })
        throw new Error('Failed to generate summary after retries')
      }

      logger.log(`[Redis Worker] Summary generated successfully`, {
        jobId: job.id,
        userId: user_id,
        summaryLength: summary.length,
        timestamp: new Date().toISOString(),
      })

      if (metadata?.memory_id) {
        await prisma.memory.update({
          where: { id: metadata.memory_id },
          data: { summary: summary },
        })
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

        logger.log(`[Redis Worker] Memory updated successfully`, {
          jobId: job.id,
          userId: user_id,
          memoryId: metadata.memory_id,
          timestamp: new Date().toISOString(),
        })

        setImmediate(async () => {
          try {
            const shouldUpdate = await profileUpdateService.shouldUpdateProfile(user_id, 7)
            if (shouldUpdate) {
              logger.log(`[Redis Worker] Triggering profile update`, {
                jobId: job.id,
                userId: user_id,
                timestamp: new Date().toISOString(),
              })
              await profileUpdateService.updateUserProfile(user_id)
              logger.log(`[Redis Worker] Profile update completed`, {
                jobId: job.id,
                userId: user_id,
                timestamp: new Date().toISOString(),
              })
            }
          } catch (profileError) {
            logger.error(`[Redis Worker] Error updating profile:`, profileError)
          }
        })
      } else {
        const user = await prisma.user.findUnique({
          where: { id: user_id },
        })

        if (user) {
          const canonicalText = normalizeText(raw_text)
          const canonicalHash = hashCanonical(canonicalText)
          const timestamp = Math.floor(Date.now() / 1000)

          let memory
          try {
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
                page_metadata: metadata || {},
              },
            })
          } catch (createError) {
            const error = createError as PrismaError
            if (error.code === 'P2002') {
              const existingByCanonical = await prisma.memory.findFirst({
                where: { user_id, canonical_hash: canonicalHash },
              })

              if (existingByCanonical) {
                logger.log(`[Redis Worker] Duplicate memory detected on create, skipping`, {
                  jobId: job.id,
                  userId: user_id,
                  existingMemoryId: existingByCanonical.id,
                  timestamp: new Date().toISOString(),
                })
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
            timestamp: new Date().toISOString(),
          })

          setImmediate(async () => {
            try {
              const shouldUpdate = await profileUpdateService.shouldUpdateProfile(user_id, 7)
              if (shouldUpdate) {
                logger.log(`[Redis Worker] Triggering profile update`, {
                  jobId: job.id,
                  userId: user_id,
                  timestamp: new Date().toISOString(),
                })
                await profileUpdateService.updateUserProfile(user_id)
                logger.log(`[Redis Worker] Profile update completed`, {
                  jobId: job.id,
                  userId: user_id,
                  timestamp: new Date().toISOString(),
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

      logger.log(`[Redis Worker] Job completed successfully`, {
        jobId: job.id,
        userId: user_id,
        result,
        processingTime: Date.now() - job.timestamp,
        timestamp: new Date().toISOString(),
      })

      return result
    },
    {
      connection: getRedisConnection(),
      concurrency: getQueueConcurrency(),
      limiter: getQueueLimiter(),
    }
  )
}
