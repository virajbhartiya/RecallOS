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
  
  redis.set(KEY(id), JSON.stringify(job), 'EX', 60 * 15).catch(err => {
    console.error('Error creating search job in Redis:', err)
  })
  return job
}

export async function setSearchJobResult(id: string, data: { answer?: string; meta_summary?: string; status?: SearchJobStatus }) {
  try {
    const key = KEY(id)
    const raw = await redis.get(key)
    if (!raw) {
      console.error('Search job not found in Redis:', id)
      return
    }
    const job: SearchJob = JSON.parse(raw)
    console.log('Updating search job:', id, 'from status:', job.status, 'to status:', data.status || 'completed')
    job.status = data.status || 'completed'
    if (data.answer !== undefined) job.answer = data.answer
    if (data.meta_summary !== undefined) job.meta_summary = data.meta_summary
    await redis.set(key, JSON.stringify(job), 'EX', 60 * 15)
    console.log('Search job updated successfully:', id, 'status:', job.status)
  } catch (error) {
    console.error('Error updating search job result:', error)
  }
}

export async function getSearchJob(id: string): Promise<SearchJob | null> {
  try {
    const key = KEY(id)
    const raw = await redis.get(key)
    if (!raw) {
      console.log('Search job not found in Redis for ID:', id)
      return null
    }
    const job = JSON.parse(raw) as SearchJob
    console.log('Retrieved search job:', id, 'status:', job.status)
    return job
  } catch (error) {
    console.error('Error retrieving search job:', error)
    return null
  }
}
