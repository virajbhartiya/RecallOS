import { getRequest } from "../../utils/general-services.util"
import { requireAuthToken } from "../../utils/user-id.util"

export async function getPendingJobs(): Promise<{
  jobs: Array<{
    id: string
    user_id: string
    raw_text: string
    full_text_length: number
    metadata: Record<string, unknown>
    status: "waiting" | "active" | "delayed" | "failed"
    created_at: string
    processed_on: string | null
    finished_on: string | null
    failed_reason: string | null
    attempts: number
  }>
  counts: {
    total: number
    waiting: number
    active: number
    delayed: number
    failed: number
  }
}> {
  requireAuthToken()
  const response = await getRequest(`/content/pending`)
  return (
    response.data?.data || {
      jobs: [],
      counts: { total: 0, waiting: 0, active: 0, delayed: 0, failed: 0 },
    }
  )
}

export async function deletePendingJob(jobId: string): Promise<void> {
  requireAuthToken()
  const { deleteRequest } = await import("../../utils/general-services.util")
  await deleteRequest(`/content/pending/${jobId}`)
}

export async function resubmitPendingJob(jobId: string): Promise<void> {
  requireAuthToken()
  const { postRequest } = await import("../../utils/general-services.util")
  await postRequest(`/content/pending/${jobId}/resubmit`, {})
}

export async function getMemorySnapshots(
  page: number = 1,
  limit: number = 20
): Promise<{
  snapshots: unknown[]
  total: number
  page: number
  limit: number
}> {
  requireAuthToken()
  const response = await getRequest(
    `/memory/snapshots?page=${page}&limit=${limit}`
  )
  return response.data?.data || { snapshots: [], total: 0, page, limit }
}
