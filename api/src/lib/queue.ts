import { Queue, QueueEvents, JobsOptions, QueueOptions } from 'bullmq';
import crypto from 'crypto';
import { getRedisConnection } from '../utils/env';
import { logger } from '../utils/logger';

export interface ContentJobData {
  user_id: string;
  raw_text: string;
  metadata?: {
    url?: string;
    timestamp?: number;
    tags?: string[];
    memory_id?: string;
    source?: string;
    title?: string;
    content_type?: string;
    content_summary?: string;
  };
}

const queueName = 'process-content';

const queueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 1,
    backoff: { type: 'exponential', delay: 5000 },
  },
};

export const contentQueue = new Queue<ContentJobData>(queueName, queueOptions);
export const contentQueueEvents = new QueueEvents(queueName, { connection: getRedisConnection() });

contentQueueEvents.on('waiting', ({ jobId }) => {
  logger.log(`[Redis Queue] Job waiting in queue`, {
    jobId,
    state: 'waiting',
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('active', ({ jobId }) => {
  logger.log(`[Redis Queue] Job started processing`, {
    jobId,
    state: 'active',
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.log(`[Redis Queue] Job completed successfully`, {
    jobId,
    state: 'completed',
    returnvalue: returnvalue ? JSON.stringify(returnvalue).substring(0, 200) : null,
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`[Redis Queue] Job failed`, {
    jobId,
    state: 'failed',
    failedReason: failedReason || 'Unknown error',
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('progress', ({ jobId, data }) => {
  logger.log(`[Redis Queue] Job progress update`, {
    jobId,
    state: 'progress',
    progress: data,
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn(`[Redis Queue] Job stalled`, {
    jobId,
    state: 'stalled',
    timestamp: new Date().toISOString(),
  });
});

contentQueueEvents.on('delayed', ({ jobId, delay }) => {
  logger.log(`[Redis Queue] Job delayed`, {
    jobId,
    state: 'delayed',
    delayMs: delay,
    timestamp: new Date().toISOString(),
  });
});

export const addContentJob = async (data: ContentJobData) => {
  const jobId = crypto.randomUUID();
  const jobOptions: JobsOptions = {
    jobId,
  };
  const job = await contentQueue.add(queueName, data, jobOptions);
  
  logger.log(`[Redis Queue] Job queued for processing`, {
    jobId: job.id,
    userId: data.user_id,
    contentLength: data.raw_text?.length || 0,
    source: data.metadata?.source || 'unknown',
    url: data.metadata?.url || 'unknown',
    timestamp: new Date().toISOString(),
  });
  
  return { id: job.id };
};

// Quiet queue event handlers to avoid noisy logs in production. Attach your own
// listeners elsewhere if you need telemetry.
