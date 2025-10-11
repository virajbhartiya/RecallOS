import Queue from 'bull';
import redis from './redis';

export const contentQueue = new Queue('content processing', {
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
  return await contentQueue.add('process-content', data);
};
