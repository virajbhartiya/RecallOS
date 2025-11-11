import { prisma } from '../lib/prisma.lib'
import { aiProvider } from './ai-provider.service'
import { logger } from '../utils/logger.util'
import { Prisma } from '@prisma/client'

interface LearningRecommendation {
  topic: string
  reason: string
  priority: number
  prerequisites?: string[]
}

interface LearningPath {
  recommendations: LearningRecommendation[]
  knowledgeGaps: string[]
  trendingTopics: string[]
}

export const learningPathService = {
  async generateLearningPath(userId: string): Promise<LearningPath | null> {
    try {
      const [memories, profile] = await Promise.all([
        prisma.memory.findMany({
          where: { user_id: userId },
          select: {
            page_metadata: true,
            url: true,
            title: true,
            summary: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 500,
        }),
        prisma.userProfile.findUnique({
          where: { user_id: userId },
          select: {
            dynamic_profile_text: true,
            static_profile_text: true,
          },
        }),
      ])

      if (memories.length === 0) {
        return {
          recommendations: [],
          knowledgeGaps: [],
          trendingTopics: [],
        }
      }

      const topicCounts: Record<string, number> = {}
      const recentTopics: string[] = []
      const allTopics: Set<string> = new Set()

      memories.forEach(m => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: unknown) => {
            if (typeof topic === 'string') {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1
              allTopics.add(topic)
              if (m.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
                recentTopics.push(topic)
              }
            }
          })
        }
      })

      const exploredTopics = Object.keys(topicCounts)
      const shallowTopics = exploredTopics.filter(t => topicCounts[t] < 3)
      const deepTopics = exploredTopics.filter(t => topicCounts[t] >= 10)

      const profileText = profile?.dynamic_profile_text || profile?.static_profile_text || ''

      const prompt = `Analyze the user's learning patterns and suggest personalized learning recommendations.

User Profile: ${profileText.substring(0, 500)}

Explored Topics (${exploredTopics.length}): ${exploredTopics.slice(0, 20).join(', ')}
Shallow Topics (needs depth): ${shallowTopics.slice(0, 10).join(', ')}
Deep Topics (expertise areas): ${deepTopics.slice(0, 10).join(', ')}
Recent Topics: ${[...new Set(recentTopics)].slice(0, 10).join(', ')}

Generate 5-7 learning recommendations as JSON array:
[
  {
    "topic": "topic name",
    "reason": "why this matters for the user",
    "priority": 1-10,
    "prerequisites": ["optional prerequisite topics"]
  }
]

Return ONLY valid JSON array, no markdown or extra text.`

      const aiResponse = await aiProvider.generateContent(prompt, false)
      let recommendations: LearningRecommendation[] = []

      try {
        const jsonMatch = typeof aiResponse === 'string' ? aiResponse.match(/\[[\s\S]*\]/) : null
        const jsonStr = jsonMatch
          ? jsonMatch[0]
          : typeof aiResponse === 'string'
            ? aiResponse
            : JSON.stringify(aiResponse)
        recommendations = JSON.parse(jsonStr)
      } catch (error) {
        logger.error('Error parsing AI response for learning path:', error)
        recommendations = this.generateFallbackRecommendations(shallowTopics, deepTopics)
      }

      const trendingTopics = this.calculateTrendingTopics(memories)
      const knowledgeGaps = shallowTopics.slice(0, 10)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.learningPath.create({
        data: {
          user_id: userId,
          recommendations: recommendations as unknown as Prisma.InputJsonValue,
          knowledge_gaps: knowledgeGaps as unknown as Prisma.InputJsonValue,
          trending_topics: trendingTopics as unknown as Prisma.InputJsonValue,
          expires_at: expiresAt,
        },
      })

      return {
        recommendations,
        knowledgeGaps,
        trendingTopics,
      }
    } catch (error) {
      logger.error('Error generating learning path:', error)
      return null
    }
  },

  generateFallbackRecommendations(
    shallowTopics: string[],
    deepTopics: string[]
  ): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = []

    shallowTopics.slice(0, 5).forEach((topic, index) => {
      recommendations.push({
        topic,
        reason: `You've explored this topic but could go deeper`,
        priority: 7 - index,
      })
    })

    if (deepTopics.length > 0 && recommendations.length < 7) {
      recommendations.push({
        topic: `Advanced ${deepTopics[0]}`,
        reason: `Build on your expertise in ${deepTopics[0]}`,
        priority: 8,
        prerequisites: [deepTopics[0]],
      })
    }

    return recommendations
  },

  calculateTrendingTopics(memories: Array<{ created_at: Date; page_metadata: unknown }>): string[] {
    const recentWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentTopics: Record<string, number> = {}
    const olderTopics: Record<string, number> = {}

    memories.forEach(m => {
      const metadata = m.page_metadata as Record<string, unknown> | null
      if (metadata?.topics && Array.isArray(metadata.topics)) {
        metadata.topics.forEach((topic: unknown) => {
          if (typeof topic === 'string') {
            if (m.created_at > recentWeek) {
              recentTopics[topic] = (recentTopics[topic] || 0) + 1
            } else {
              olderTopics[topic] = (olderTopics[topic] || 0) + 1
            }
          }
        })
      }
    })

    const trending = Object.keys(recentTopics)
      .map(topic => ({
        topic,
        growth: (recentTopics[topic] || 0) - (olderTopics[topic] || 0),
      }))
      .filter(t => t.growth > 0)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 10)
      .map(t => t.topic)

    return trending
  },

  async getLatestLearningPath(userId: string): Promise<LearningPath | null> {
    try {
      const path = await prisma.learningPath.findFirst({
        where: {
          user_id: userId,
          expires_at: { gt: new Date() },
        },
        orderBy: { generated_at: 'desc' },
      })

      if (!path) return null

      return {
        recommendations: (path.recommendations as unknown as LearningRecommendation[]) || [],
        knowledgeGaps: (path.knowledge_gaps as unknown as string[]) || [],
        trendingTopics: (path.trending_topics as unknown as string[]) || [],
      }
    } catch (error) {
      logger.error('Error getting latest learning path:', error)
      return null
    }
  },
}
