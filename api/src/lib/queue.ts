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
    attempts: 1,
    backoff: { type: 'exponential', delay: 5000 },
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
  return { id: job.id };
};

// Quiet queue event handlers to avoid noisy logs in production. Attach your own
// listeners elsewhere if you need telemetry.
