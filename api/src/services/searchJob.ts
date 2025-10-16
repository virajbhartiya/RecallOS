import crypto from 'crypto'
import redis from '../lib/redis'

export type SearchJobStatus = 'pending' | 'completed' | 'failed'

export interface SearchJob {
  id: string
  status: SearchJobStatus
  answer?: string
  meta_summary?: string
  created_at: number
}

const KEY = (id: string) => `search-job:${id}`

export function createSearchJob(): SearchJob {
  const id = crypto.randomUUID()
  const job: SearchJob = { id, status: 'pending', created_at: Date.now() }
  
  void redis.set(KEY(id), JSON.stringify(job), 'EX', 60 * 15)
  return job
}

export async function setSearchJobResult(id: string, data: { answer?: string; meta_summary?: string; status?: SearchJobStatus }) {
  const key = KEY(id)
  const raw = await redis.get(key)
  if (!raw) return
  const job: SearchJob = JSON.parse(raw)
  job.status = data.status || 'completed'
  if (data.answer !== undefined) job.answer = data.answer
  if (data.meta_summary !== undefined) job.meta_summary = data.meta_summary
  await redis.set(key, JSON.stringify(job), 'EX', 60 * 15)
}

export async function getSearchJob(id: string): Promise<SearchJob | null> {
  const raw = await redis.get(KEY(id))
  return raw ? (JSON.parse(raw) as SearchJob) : null
}
