import crypto from 'crypto'
import { getRedisClient } from '../lib/redis.lib'
import { logger } from '../utils/logger.util'

export type SearchJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface SearchJob {
  id: string
  status: SearchJobStatus
  answer?: string
  citations?: Array<{ label: number; memory_id: string; title: string | null; url: string | null }>
  results?: Array<{ memory_id: string; title: string | null; url: string | null; score: number }>
  created_at: number
  expires_at: number
}

const JOB_PREFIX = 'search_job:'
const JOB_TTL = 15 * 60 // 15 minutes in seconds

export function createSearchJob(): SearchJob {
  const id = crypto.randomUUID()
  const job: SearchJob = {
    id,
    status: 'pending',
    created_at: Date.now(),
    expires_at: Date.now() + JOB_TTL * 1000,
  }

  const client = getRedisClient()
  const key = `${JOB_PREFIX}${id}`
  client.setex(key, JOB_TTL, JSON.stringify(job)).catch(err => {
    logger.error('Error creating search job in Redis:', err)
  })

  return job
}

export async function setSearchJobResult(
  id: string,
  data: {
    answer?: string
    citations?: Array<{
      label: number
      memory_id: string
      title: string | null
      url: string | null
    }>
    results?: Array<{ memory_id: string; title: string | null; url: string | null; score: number }>
    status?: SearchJobStatus
  }
): Promise<void> {
  try {
    const client = getRedisClient()
    const key = `${JOB_PREFIX}${id}`
    const existing = await client.get(key)

    if (!existing) {
      logger.error('Search job not found:', id)
      return
    }

    const job: SearchJob = JSON.parse(existing)
    job.status = data.status || job.status || 'completed'
    if (data.answer !== undefined) job.answer = data.answer
    if (data.citations !== undefined) job.citations = data.citations
    if (data.results !== undefined) job.results = data.results
    job.expires_at = Date.now() + JOB_TTL * 1000

    await client.setex(key, JOB_TTL, JSON.stringify(job))
  } catch (error) {
    logger.error('Error updating search job result:', error)
  }
}

export async function getSearchJob(id: string): Promise<SearchJob | null> {
  try {
    const client = getRedisClient()
    const key = `${JOB_PREFIX}${id}`
    const data = await client.get(key)

    if (!data) {
      return null
    }

    return JSON.parse(data) as SearchJob
  } catch (error) {
    logger.error('Error retrieving search job:', error)
    return null
  }
}
