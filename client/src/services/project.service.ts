import { getRequest } from '@/utils/general-services.util'
import { requireAuthToken } from '@/utils/user-id.util'

export interface ProjectGroup {
  id: string
  name: string
  description: string
  memoryCount: number
  lastActivity: string
  firstSeen: string
  topics: string[]
  categories: string[]
  recentMemories: Array<{
    id: string
    title: string | null
    url: string | null
    summary: string | null
    created_at: string
  }>
  summary?: string
}

export interface ProjectChange {
  projectId: string
  projectName: string
  newMemories: number
  updatedMemories: number
  newTopics: string[]
  summary: string
}

export interface ProjectMemoriesResponse {
  projectId: string
  memories: Array<{
    id: string
    title: string | null
    url: string | null
    summary: string | null
    created_at: string
  }>
  count: number
}

export class ProjectService {
  static async getProjects(options?: {
    minMemories?: number
    timeWindowDays?: number
    maxProjects?: number
  }): Promise<ProjectGroup[]> {
    requireAuthToken()
    const params = new URLSearchParams()
    if (options?.minMemories) params.append('minMemories', options.minMemories.toString())
    if (options?.timeWindowDays) params.append('timeWindowDays', options.timeWindowDays.toString())
    if (options?.maxProjects) params.append('maxProjects', options.maxProjects.toString())

    const response = await getRequest(`/projects${params.toString() ? `?${params.toString()}` : ''}`)
    if (response.status >= 400) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }
    return response.data.data || []
  }

  static async getProjectChanges(
    projectId: string,
    since?: Date
  ): Promise<ProjectChange> {
    requireAuthToken()
    const params = new URLSearchParams()
    if (since) params.append('since', since.toISOString())

    const response = await getRequest(
      `/projects/${projectId}/changes${params.toString() ? `?${params.toString()}` : ''}`
    )
    if (response.status >= 400) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }
    return response.data.data
  }

  static async getProjectMemories(
    projectId: string,
    query?: string,
    limit: number = 20
  ): Promise<ProjectMemoriesResponse> {
    requireAuthToken()
    const params = new URLSearchParams()
    if (query) params.append('query', query)
    params.append('limit', limit.toString())

    const response = await getRequest(
      `/projects/${projectId}/memories?${params.toString()}`
    )
    if (response.status >= 400) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }
    return response.data.data
  }
}

