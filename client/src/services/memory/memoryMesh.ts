import { getRequest, postRequest } from '../../utility/generalServices'
import { requireAuthToken } from '../../utils/userId'
import type { MemoryMesh, MemoryWithRelations, MemoryCluster } from '../../types/memory'

const baseUrl = '/memory'

export async function getMemoryMesh(limit: number = 50, threshold: number = 0.3): Promise<MemoryMesh> {
  requireAuthToken()
  const response = await getRequest(`${baseUrl}/mesh?limit=${limit}&threshold=${threshold}`)
  return response.data?.data || { nodes: [], edges: [], clusters: {} }
}

export async function getMemoryWithRelations(memoryId: string): Promise<MemoryWithRelations> {
  const response = await getRequest(`${baseUrl}/relations/${memoryId}`)
  return response.data?.data
}

export async function getMemoryCluster(
  memoryId: string,
  depth: number = 2
): Promise<MemoryCluster> {
  const response = await getRequest(`${baseUrl}/cluster/${memoryId}?depth=${depth}`)
  return response.data?.data
}

export async function processMemoryForMesh(memoryId: string): Promise<void> {
  await postRequest(`${baseUrl}/process-mesh/${memoryId}`, {})
}

