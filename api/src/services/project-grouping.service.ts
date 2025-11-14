import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'
import { Prisma, MemoryType } from '@prisma/client'

export type ProjectGroup = {
  id: string
  name: string
  description: string
  memoryCount: number
  lastActivity: Date
  firstSeen: Date
  topics: string[]
  categories: string[]
  recentMemories: Array<{
    id: string
    title: string | null
    url: string | null
    summary: string | null
    created_at: Date
  }>
  summary?: string
}

export type ProjectChange = {
  projectId: string
  projectName: string
  newMemories: number
  updatedMemories: number
  newTopics: string[]
  summary: string
}

export class ProjectGroupingService {
  /**
   * Groups memories into inferred projects/themes based on topics, categories, and temporal clustering
   */
  async groupMemoriesByProjects(
    userId: string,
    options?: {
      minMemoriesPerProject?: number
      timeWindowDays?: number
      maxProjects?: number
    }
  ): Promise<ProjectGroup[]> {
    const minMemories = options?.minMemoriesPerProject || 3
    const timeWindow = options?.timeWindowDays || 90
    const maxProjects = options?.maxProjects || 20

    try {
      // Get recent memories with metadata
      const cutoffDate = new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000)
      const memories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          created_at: { gte: cutoffDate },
        },
        select: {
          id: true,
          title: true,
          url: true,
          summary: true,
          created_at: true,
          page_metadata: true,
          memory_type: true,
        },
        orderBy: { created_at: 'desc' },
        take: 1000,
      })

      if (memories.length === 0) {
        return []
      }

      // Group memories by topic/category clusters
      const projectMap = new Map<string, {
        memoryIds: Set<string>
        topics: Set<string>
        categories: Set<string>
        dates: Date[]
        memories: typeof memories
      }>()

      for (const memory of memories) {
        const metadata = memory.page_metadata as Record<string, unknown> | null
        const topics = (metadata?.topics as string[]) || []
        const categories = (metadata?.categories as string[]) || []
        const memoryType = memory.memory_type

        // Create project keys from topics, categories, and memory type
        const projectKeys: string[] = []

        // Use memory type as a base project identifier
        if (memoryType && memoryType !== MemoryType.REFERENCE) {
          projectKeys.push(`type:${memoryType}`)
        }

        // Use top topics as project identifiers
        for (const topic of topics.slice(0, 3)) {
          if (topic && topic.length > 2) {
            projectKeys.push(`topic:${topic.toLowerCase()}`)
          }
        }

        // Use categories as project identifiers
        for (const category of categories.slice(0, 2)) {
          if (category && category.length > 2) {
            projectKeys.push(`cat:${category.toLowerCase()}`)
          }
        }

        // If no clear project keys, use a general "misc" project
        if (projectKeys.length === 0) {
          projectKeys.push('misc:general')
        }

        // Assign memory to the most specific project (first key)
        const primaryKey = projectKeys[0]
        if (!projectMap.has(primaryKey)) {
          projectMap.set(primaryKey, {
            memoryIds: new Set(),
            topics: new Set(),
            categories: new Set(),
            dates: [],
            memories: [],
          })
        }

        const project = projectMap.get(primaryKey)!
        project.memoryIds.add(memory.id)
        project.memories.push(memory)
        project.dates.push(memory.created_at)
        topics.forEach(t => project.topics.add(t))
        categories.forEach(c => project.categories.add(c))
      }

      // Convert to ProjectGroup format
      const projects: ProjectGroup[] = []

      for (const [key, data] of projectMap.entries()) {
        if (data.memoryIds.size < minMemories) {
          continue
        }

        const sortedMemories = data.memories.sort(
          (a, b) => b.created_at.getTime() - a.created_at.getTime()
        )
        const firstSeen = sortedMemories[sortedMemories.length - 1]?.created_at || new Date()
        const lastActivity = sortedMemories[0]?.created_at || new Date()

        // Generate project name from key
        let projectName = key
        if (key.startsWith('type:')) {
          projectName = `${key.replace('type:', '').replace('_', ' ')} Project`
        } else if (key.startsWith('topic:')) {
          projectName = key.replace('topic:', '').replace(/\b\w/g, l => l.toUpperCase())
        } else if (key.startsWith('cat:')) {
          projectName = `${key.replace('cat:', '').replace(/\b\w/g, l => l.toUpperCase())} Project`
        } else {
          projectName = 'General'
        }

        // Generate description from top topics
        const topTopics = Array.from(data.topics).slice(0, 5)
        const description = topTopics.length > 0
          ? `Related to: ${topTopics.join(', ')}`
          : 'Various topics and content'

        projects.push({
          id: key,
          name: projectName,
          description,
          memoryCount: data.memoryIds.size,
          lastActivity,
          firstSeen,
          topics: Array.from(data.topics).slice(0, 10),
          categories: Array.from(data.categories).slice(0, 5),
          recentMemories: sortedMemories.slice(0, 5).map(m => ({
            id: m.id,
            title: m.title,
            url: m.url,
            summary: m.summary,
            created_at: m.created_at,
          })),
        })
      }

      // Sort by last activity and limit
      return projects
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, maxProjects)
    } catch (error) {
      logger.error('[project-grouping] Error grouping memories:', error)
      return []
    }
  }

  /**
   * Get what changed in a project since a given date
   */
  async getProjectChanges(
    userId: string,
    projectId: string,
    sinceDate: Date
  ): Promise<ProjectChange | null> {
    try {
      const projects = await this.groupMemoriesByProjects(userId)
      const project = projects.find(p => p.id === projectId)

      if (!project) {
        return null
      }

      // Get memories added/updated since the date
      const recentMemories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          created_at: { gte: sinceDate },
          id: { in: project.recentMemories.map(m => m.id) },
        },
        select: {
          id: true,
          created_at: true,
          page_metadata: true,
        },
      })

      const newMemories = recentMemories.filter(
        m => m.created_at >= sinceDate
      ).length

      // Get new topics
      const allTopics = new Set<string>()
      recentMemories.forEach(m => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        const topics = (metadata?.topics as string[]) || []
        topics.forEach(t => allTopics.add(t))
      })
      const existingTopics = new Set(project.topics)
      const newTopics = Array.from(allTopics).filter(t => !existingTopics.has(t))

      const summary = newMemories > 0
        ? `${newMemories} new ${newMemories === 1 ? 'memory' : 'memories'} added. ${newTopics.length > 0 ? `New topics: ${newTopics.slice(0, 3).join(', ')}.` : ''}`
        : 'No new activity since last visit.'

      return {
        projectId: project.id,
        projectName: project.name,
        newMemories,
        updatedMemories: 0, // TODO: Track updates separately
        newTopics: newTopics.slice(0, 5),
        summary,
      }
    } catch (error) {
      logger.error('[project-grouping] Error getting project changes:', error)
      return null
    }
  }

  /**
   * Search memories within a specific project
   */
  async searchProjectMemories(
    userId: string,
    projectId: string,
    query?: string,
    limit: number = 20
  ): Promise<Array<{
    id: string
    title: string | null
    url: string | null
    summary: string | null
    created_at: Date
  }>> {
    try {
      const projects = await this.groupMemoriesByProjects(userId)
      const project = projects.find(p => p.id === projectId)

      if (!project) {
        return []
      }

      const memoryIds = project.recentMemories.map(m => m.id)

      if (query) {
        // Search within project memories
        const results = await prisma.memory.findMany({
          where: {
            user_id: userId,
            id: { in: memoryIds },
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            url: true,
            summary: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: limit,
        })
        return results
      }

      // Return all project memories
      return await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { in: memoryIds },
        },
        select: {
          id: true,
          title: true,
          url: true,
          summary: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })
    } catch (error) {
      logger.error('[project-grouping] Error searching project memories:', error)
      return []
    }
  }
}

export const projectGroupingService = new ProjectGroupingService()

