import Queue from 'bull';

export let contentQueue: Queue.Queue | null = null;

if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
  contentQueue = new Queue('content processing', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
} else {
  console.warn('Redis password not configured. Queue functionality will be disabled.');
}

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

export const addContentJob = async (data: ContentJobData) => {
  if (!contentQueue) {
    throw new Error('Content queue is not available. Please configure Redis properly.');
  }
  return await contentQueue.add('process-content', data);
};
