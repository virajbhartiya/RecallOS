import crypto from 'crypto';
import Redis from 'ioredis';
import { getRedisConnection } from '../utils/env';

export type SearchJobStatus = 'pending' | 'completed' | 'failed';

export interface SearchJob {
  id: string;
  status: SearchJobStatus;
  answer?: string;
  meta_summary?: string;
  created_at: number;
  expires_at: number;
}

const JOB_PREFIX = 'search_job:';
const JOB_TTL = 15 * 60; // 15 minutes in seconds

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const connection = getRedisConnection();
    if ('url' in connection) {
      redisClient = new Redis(connection.url);
    } else {
      redisClient = new Redis({
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
      });
    }
  }
  return redisClient;
}

export function createSearchJob(): SearchJob {
  const id = crypto.randomUUID();
  const job: SearchJob = { 
    id, 
    status: 'pending', 
    created_at: Date.now(),
    expires_at: Date.now() + (JOB_TTL * 1000)
  };
  
  const client = getRedisClient();
  const key = `${JOB_PREFIX}${id}`;
  client.setex(key, JOB_TTL, JSON.stringify(job)).catch(err => {
    console.error('Error creating search job in Redis:', err);
  });
  
  return job;
}

export async function setSearchJobResult(id: string, data: { answer?: string; meta_summary?: string; status?: SearchJobStatus }): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `${JOB_PREFIX}${id}`;
    const existing = await client.get(key);
    
    if (!existing) {
      console.error('Search job not found:', id);
      return;
    }
    
    const job: SearchJob = JSON.parse(existing);
    job.status = data.status || 'completed';
    if (data.answer !== undefined) job.answer = data.answer;
    if (data.meta_summary !== undefined) job.meta_summary = data.meta_summary;
    job.expires_at = Date.now() + (JOB_TTL * 1000);
    
    await client.setex(key, JOB_TTL, JSON.stringify(job));
  } catch (error) {
    console.error('Error updating search job result:', error);
  }
}

export async function getSearchJob(id: string): Promise<SearchJob | null> {
  try {
    const client = getRedisClient();
    const key = `${JOB_PREFIX}${id}`;
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data) as SearchJob;
  } catch (error) {
    console.error('Error retrieving search job:', error);
    return null;
  }
}
