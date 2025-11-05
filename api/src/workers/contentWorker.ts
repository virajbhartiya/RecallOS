import { Worker } from 'bullmq';
import { ContentJobData } from '../lib/queue';
import { aiProvider } from '../services/aiProvider';
import { memoryMeshService } from '../services/memoryMesh';
import { prisma } from '../lib/prisma';
import { createHash } from 'crypto';
import { getQueueConcurrency, getRedisConnection, getQueueLimiter } from '../utils/env';
import { normalizeText, hashCanonical } from '../utils/text';

export const startContentWorker = () => {
  return new Worker<ContentJobData>(
    'process-content',
    async (job) => {
      const { user_id, raw_text, metadata } = job.data as ContentJobData;
      
      console.log(`[Redis Worker] Processing job started`, {
        jobId: job.id,
        userId: user_id,
        contentLength: raw_text?.length || 0,
        source: metadata?.source || 'unknown',
        attemptsMade: job.attemptsMade,
        timestamp: new Date().toISOString(),
      });

      const isRetryableError = (err: any): boolean => {
        const msg = String(err?.message || '').toLowerCase();
        const status = Number((err?.status ?? err?.code) || 0);
        // Treat transient provider failures as retryable
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
        );
      };

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // In-job retry loop so we don't mark the job failed on transient provider issues
      const maxAttempts = 8;
      const baseDelayMs = 3000;
      const maxDelayMs = 60_000;

      let summary: string | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[Redis Worker] Retrying job (attempt ${attempt}/${maxAttempts})`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              timestamp: new Date().toISOString(),
            });
          }
          summary = await aiProvider.summarizeContent(raw_text, metadata);
          if (attempt > 1) {
            console.log(`[Redis Worker] Job retry successful`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              timestamp: new Date().toISOString(),
            });
          }
          break; // success
        } catch (err: any) {
          if (!isRetryableError(err) || attempt === maxAttempts) {
            console.error(`[Redis Worker] Job failed permanently`, {
              jobId: job.id,
              userId: user_id,
              attempt,
              error: err?.message || String(err),
              isRetryable: isRetryableError(err),
              timestamp: new Date().toISOString(),
            });
            throw err; // non-retryable or exhausted
          }
          const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
          const jitter = Math.floor(Math.random() * 500);
          console.warn(`[Redis Worker] Job retryable error, backing off`, {
            jobId: job.id,
            userId: user_id,
            attempt,
            backoffMs: backoff + jitter,
            error: err?.message || String(err),
            timestamp: new Date().toISOString(),
          });
          await sleep(backoff + jitter);
        }
      }

      if (!summary) {
        console.error(`[Redis Worker] Failed to generate summary after all retries`, {
          jobId: job.id,
          userId: user_id,
          maxAttempts,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Failed to generate summary after retries');
      }

      console.log(`[Redis Worker] Summary generated successfully`, {
        jobId: job.id,
        userId: user_id,
        summaryLength: summary.length,
        timestamp: new Date().toISOString(),
      });

      if (metadata?.memory_id) {
        await prisma.memory.update({
          where: { id: metadata.memory_id },
          data: { summary: summary },
        });
        await memoryMeshService.generateEmbeddingsForMemory(metadata.memory_id);
        await memoryMeshService.createMemoryRelations(
          metadata.memory_id,
          user_id
        );

        const summaryHash = createHash('sha256').update(summary).digest('hex');

        await prisma.memorySnapshot.create({
          data: {
            user_id,
            raw_text,
            summary,
            summary_hash: summaryHash,
          },
        });
        
        console.log(`[Redis Worker] Memory updated successfully`, {
          jobId: job.id,
          userId: user_id,
          memoryId: metadata.memory_id,
          timestamp: new Date().toISOString(),
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: user_id },
        });

        if (user) {
          // Exact duplicate check on canonicalized content per user
          const canonicalText = normalizeText(raw_text);
          const canonicalHash = hashCanonical(canonicalText);

          const existingByCanonical = await prisma.memory.findFirst({
            where: { user_id: user.id, canonical_hash: canonicalHash } as any,
          });

          if (existingByCanonical) {
            console.log(`[Redis Worker] Duplicate memory detected, skipping creation`, {
              jobId: job.id,
              userId: user_id,
              existingMemoryId: existingByCanonical.id,
              timestamp: new Date().toISOString(),
            });
            return {
              success: true,
              contentId: existingByCanonical.id,
              memoryId: existingByCanonical.id,
              summary: summary.substring(0, 100) + '...',
            };
          }
          const memoryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          const timestamp = Math.floor(Date.now() / 1000);

          const memory = await prisma.memory.create({
            data: {
              user_id,
              source: metadata?.source || 'queue',
              url: metadata?.url || 'unknown',
              title: metadata?.title || 'Untitled',
              content: raw_text,
              summary: summary,
              hash: memoryHash,
              canonical_text: canonicalText,
              canonical_hash: canonicalHash,
              timestamp: BigInt(timestamp),
              full_content: raw_text,
              page_metadata: metadata || {},
            } as any,
          });

          await memoryMeshService.generateEmbeddingsForMemory(memory.id);
          await memoryMeshService.createMemoryRelations(memory.id, user_id);

          const summaryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          await prisma.memorySnapshot.create({
            data: {
              user_id,
              raw_text,
              summary,
              summary_hash: summaryHash,
            },
          });
          
          console.log(`[Redis Worker] New memory created successfully`, {
            jobId: job.id,
            userId: user_id,
            memoryId: memory.id,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const result = {
        success: true,
        contentId: metadata?.memory_id || 'memory_processed',
        memoryId: metadata?.memory_id || null,
        summary: summary.substring(0, 100) + '...',
      };
      
      console.log(`[Redis Worker] Job completed successfully`, {
        jobId: job.id,
        userId: user_id,
        result,
        processingTime: Date.now() - job.timestamp,
        timestamp: new Date().toISOString(),
      });

      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: getQueueConcurrency(),
      limiter: getQueueLimiter(),
    }
  );
};
