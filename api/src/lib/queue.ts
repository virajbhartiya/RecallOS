import { Queue, QueueEvents, JobsOptions, QueueOptions } from 'bullmq';
import crypto from 'crypto';
import { getRedisConnection } from '../utils/env';

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
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
};

export const contentQueue = new Queue<ContentJobData>(queueName, queueOptions);
export const contentQueueEvents = new QueueEvents(queueName, { connection: getRedisConnection() });

export const addContentJob = async (data: ContentJobData) => {
  const jobId = crypto.randomUUID();
  const jobOptions: JobsOptions = {
    jobId,
  };
  const job = await contentQueue.add(queueName, data, jobOptions);
  console.log('[queue] added', { queue: queueName, jobId: job.id, user_id: data.user_id });
  return { id: job.id };
};

contentQueueEvents.on('waiting', ({ jobId }) => {
  console.log('[queue] waiting', { queue: queueName, jobId });
});

contentQueueEvents.on('active', ({ jobId }) => {
  console.log('[queue] active', { queue: queueName, jobId });
});

contentQueueEvents.on('completed', ({ jobId }) => {
  console.log('[queue] completed', { queue: queueName, jobId });
});

contentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error('[queue] failed', { queue: queueName, jobId, reason: failedReason });
});

contentQueueEvents.on('stalled', ({ jobId }) => {
  console.warn('[queue] stalled', { queue: queueName, jobId });
});

contentQueueEvents.on('removed', ({ jobId }) => {
  console.log('[queue] removed', { queue: queueName, jobId });
});

contentQueueEvents.on('error', (err) => {
  console.error('[queue] events error', err);
});
