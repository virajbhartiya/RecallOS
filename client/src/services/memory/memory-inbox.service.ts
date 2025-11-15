import { getRequest, patchRequest } from "@/utils/general-services.util"
import { requireAuthToken } from "@/utils/user-id.util"

const BASE_URL = "/memory"

export async function fetchInbox(signal?: AbortSignal) {
  requireAuthToken()
  const response = await getRequest(`${BASE_URL}/inbox`, undefined, signal)
  return response?.data?.data ?? []
}

export async function updateMemoryFlags(
  memoryId: string,
  flags: { reviewed?: boolean; pinned?: boolean }
) {
  requireAuthToken()
  const response = await patchRequest(`${BASE_URL}/${memoryId}/flags`, flags)
  return response?.data?.data
}
