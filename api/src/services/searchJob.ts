import crypto from 'crypto'

export type SearchJobStatus = 'pending' | 'completed' | 'failed'

export interface SearchJob {
  id: string
  status: SearchJobStatus
  answer?: string
  meta_summary?: string
  created_at: number
  expires_at: number
}

const jobStore = new Map<string, SearchJob>()

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobStore.entries()) {
    if (job.expires_at < now) {
      jobStore.delete(id)
    }
  }
}, 60000)

export function createSearchJob(): SearchJob {
  const id = crypto.randomUUID()
  const job: SearchJob = { 
    id, 
    status: 'pending', 
    created_at: Date.now(),
    expires_at: Date.now() + (60 * 15 * 1000)
  }
  
  jobStore.set(id, job)
  return job
}

export async function setSearchJobResult(id: string, data: { answer?: string; meta_summary?: string; status?: SearchJobStatus }) {
  try {
    const job = jobStore.get(id)
    if (!job) {
      console.error('Search job not found:', id)
      return
    }
    job.status = data.status || 'completed'
    if (data.answer !== undefined) job.answer = data.answer
    if (data.meta_summary !== undefined) job.meta_summary = data.meta_summary
    job.expires_at = Date.now() + (60 * 15 * 1000)
    jobStore.set(id, job)
  } catch (error) {
    console.error('Error updating search job result:', error)
  }
}

export async function getSearchJob(id: string): Promise<SearchJob | null> {
  try {
    const job = jobStore.get(id)
    if (!job) {
      return null
    }
    return job
  } catch (error) {
    console.error('Error retrieving search job:', error)
    return null
  }
}
