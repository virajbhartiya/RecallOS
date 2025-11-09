import type {
  MemoryCluster,
  MemoryMesh,
  MemoryWithRelations,
} from "../../types/memory.type"
import { getRequest, postRequest } from "../../utils/general-services.util"
import { requireAuthToken } from "../../utils/user-id.util"

const baseUrl = "/memory"

export async function getMemoryMesh(
  limit: number = Infinity,
  threshold: number = 0.3
): Promise<MemoryMesh> {
  requireAuthToken()
  const limitParam = limit === Infinity ? "all" : limit.toString()
  const response = await getRequest(
    `${baseUrl}/mesh?limit=${limitParam}&threshold=${threshold}`
  )
  return response.data?.data || { nodes: [], edges: [], clusters: {} }
}

export async function getMemoryWithRelations(
  memoryId: string
): Promise<MemoryWithRelations> {
  const response = await getRequest(`${baseUrl}/relations/${memoryId}`)
  return response.data?.data
}

export async function getMemoryCluster(
  memoryId: string,
  depth: number = 2
): Promise<MemoryCluster> {
  const response = await getRequest(
    `${baseUrl}/cluster/${memoryId}?depth=${depth}`
  )
  return response.data?.data
}

export async function processMemoryForMesh(memoryId: string): Promise<void> {
  await postRequest(`${baseUrl}/process-mesh/${memoryId}`, {})
}
