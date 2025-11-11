import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'

interface AchievementDefinition {
  badgeType: string
  badgeName: string
  checkProgress: (userId: string) => Promise<{ progress: number; unlocked: boolean }>
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    badgeType: 'knowledge_explorer',
    badgeName: 'Knowledge Explorer',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { page_metadata: true },
      })
      const topicsSet = new Set<string>()
      memories.forEach(m => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: unknown) => {
            if (typeof topic === 'string') topicsSet.add(topic)
          })
        }
      })
      const progress = Math.min(100, (topicsSet.size / 100) * 100)
      return { progress, unlocked: topicsSet.size >= 100 }
    },
  },
  {
    badgeType: 'domain_master',
    badgeName: 'Domain Master',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { url: true },
      })
      const domains = new Set<string>()
      memories.forEach(m => {
        if (m.url) {
          try {
            const urlObj = new URL(m.url)
            domains.add(urlObj.hostname.replace('www.', ''))
          } catch {
            // Invalid URL, skip this memory
          }
        }
      })
      const progress = Math.min(100, (domains.size / 50) * 100)
      return { progress, unlocked: domains.size >= 50 }
    },
  },
  {
    badgeType: 'connection_master',
    badgeName: 'Connection Master',
    checkProgress: async (userId: string) => {
      const count = await prisma.memoryRelation.count({
        where: {
          memory: { user_id: userId },
        },
      })
      const progress = Math.min(100, (count / 1000) * 100)
      return { progress, unlocked: count >= 1000 }
    },
  },
  {
    badgeType: 'graph_builder',
    badgeName: 'Graph Builder',
    checkProgress: async (userId: string) => {
      const count = await prisma.memoryRelation.count({
        where: {
          memory: { user_id: userId },
        },
      })
      const progress = Math.min(100, (count / 5000) * 100)
      return { progress, unlocked: count >= 5000 }
    },
  },
  {
    badgeType: 'search_ninja',
    badgeName: 'Search Ninja',
    checkProgress: async (userId: string) => {
      const count = await prisma.queryEvent.count({
        where: { user_id: userId },
      })
      const progress = Math.min(100, (count / 100) * 100)
      return { progress, unlocked: count >= 100 }
    },
  },
  {
    badgeType: 'recall_pro',
    badgeName: 'Recall Pro',
    checkProgress: async (userId: string) => {
      const count = await prisma.queryEvent.count({
        where: { user_id: userId },
      })
      const progress = Math.min(100, (count / 500) * 100)
      return { progress, unlocked: count >= 500 }
    },
  },
  {
    badgeType: 'streak_keeper',
    badgeName: 'Streak Keeper',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { created_at: true },
        orderBy: { created_at: 'desc' },
        take: 100,
      })
      if (memories.length === 0) return { progress: 0, unlocked: false }

      const days = new Set(memories.map(m => m.created_at.toISOString().split('T')[0]))
      const sortedDays = Array.from(days).sort().reverse()

      let streak = 1
      for (let i = 0; i < sortedDays.length - 1; i++) {
        const current = new Date(sortedDays[i])
        const next = new Date(sortedDays[i + 1])
        const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          streak++
        } else {
          break
        }
      }

      const progress = Math.min(100, (streak / 30) * 100)
      return { progress, unlocked: streak >= 30 }
    },
  },
  {
    badgeType: 'dedicated_learner',
    badgeName: 'Dedicated Learner',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { created_at: true },
        orderBy: { created_at: 'desc' },
        take: 200,
      })
      if (memories.length === 0) return { progress: 0, unlocked: false }

      const days = new Set(memories.map(m => m.created_at.toISOString().split('T')[0]))
      const sortedDays = Array.from(days).sort().reverse()

      let streak = 1
      for (let i = 0; i < sortedDays.length - 1; i++) {
        const current = new Date(sortedDays[i])
        const next = new Date(sortedDays[i + 1])
        const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          streak++
        } else {
          break
        }
      }

      const progress = Math.min(100, (streak / 100) * 100)
      return { progress, unlocked: streak >= 100 }
    },
  },
  {
    badgeType: 'deep_diver',
    badgeName: 'Deep Diver',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { page_metadata: true },
      })
      const topicCounts: Record<string, number> = {}
      memories.forEach(m => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: unknown) => {
            if (typeof topic === 'string') {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1
            }
          })
        }
      })
      const maxDepth = Math.max(...Object.values(topicCounts), 0)
      const progress = Math.min(100, (maxDepth / 10) * 100)
      return { progress, unlocked: maxDepth >= 10 }
    },
  },
  {
    badgeType: 'expert',
    badgeName: 'Expert',
    checkProgress: async (userId: string) => {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: { page_metadata: true },
      })
      const topicCounts: Record<string, number> = {}
      memories.forEach(m => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: unknown) => {
            if (typeof topic === 'string') {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1
            }
          })
        }
      })
      const maxDepth = Math.max(...Object.values(topicCounts), 0)
      const progress = Math.min(100, (maxDepth / 50) * 100)
      return { progress, unlocked: maxDepth >= 50 }
    },
  },
  {
    badgeType: 'speed_learner',
    badgeName: 'Speed Learner',
    checkProgress: async (userId: string) => {
      const score = await prisma.knowledgeScore.findFirst({
        where: { user_id: userId },
        orderBy: { period_start: 'desc' },
        select: { velocity_score: true },
      })
      const velocity = score?.velocity_score || 0
      return { progress: velocity, unlocked: velocity >= 80 }
    },
  },
  {
    badgeType: 'impact_maker',
    badgeName: 'Impact Maker',
    checkProgress: async (userId: string) => {
      const score = await prisma.knowledgeScore.findFirst({
        where: { user_id: userId },
        orderBy: { period_start: 'desc' },
        select: { impact_score: true },
      })
      const impact = score?.impact_score || 0
      return { progress: impact, unlocked: impact >= 80 }
    },
  },
]

export const achievementService = {
  async checkAndAwardAchievements(userId: string): Promise<string[]> {
    const newlyUnlocked: string[] = []

    for (const achievement of ACHIEVEMENTS) {
      try {
        const { progress, unlocked } = await achievement.checkProgress(userId)

        const existing = await prisma.achievement.findUnique({
          where: {
            user_id_badge_type: {
              user_id: userId,
              badge_type: achievement.badgeType,
            },
          },
        })

        if (existing) {
          if (unlocked && !existing.unlocked_at) {
            await prisma.achievement.update({
              where: { id: existing.id },
              data: {
                progress,
                unlocked_at: new Date(),
              },
            })
            newlyUnlocked.push(achievement.badgeName)
          } else {
            await prisma.achievement.update({
              where: { id: existing.id },
              data: { progress },
            })
          }
        } else {
          await prisma.achievement.create({
            data: {
              user_id: userId,
              badge_type: achievement.badgeType,
              badge_name: achievement.badgeName,
              progress,
              unlocked_at: unlocked ? new Date() : null,
            },
          })
          if (unlocked) {
            newlyUnlocked.push(achievement.badgeName)
          }
        }
      } catch (error) {
        logger.error(`Error checking achievement ${achievement.badgeType}:`, error)
      }
    }

    return newlyUnlocked
  },

  async getUserAchievements(userId: string): Promise<
    Array<{
      badgeType: string
      badgeName: string
      progress: number
      unlocked: boolean
    }>
  > {
    const achievements = await prisma.achievement.findMany({
      where: { user_id: userId },
      orderBy: { unlocked_at: 'desc' },
    })

    return achievements.map(a => ({
      badgeType: a.badge_type,
      badgeName: a.badge_name,
      progress: a.progress,
      unlocked: a.unlocked_at !== null,
    }))
  },

  async getAchievementProgress(
    userId: string,
    badgeType: string
  ): Promise<{
    progress: number
    unlocked: boolean
  } | null> {
    const achievement = await prisma.achievement.findUnique({
      where: {
        user_id_badge_type: {
          user_id: userId,
          badge_type: badgeType,
        },
      },
    })

    if (!achievement) return null

    return {
      progress: achievement.progress,
      unlocked: achievement.unlocked_at !== null,
    }
  },
}
