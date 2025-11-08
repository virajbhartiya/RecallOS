import { prisma } from '../lib/prisma'
import { profileExtractionService, ProfileExtractionResult } from './profileExtraction'
import { getRedisClient } from '../lib/redis'
import { logger } from '../utils/logger'
import { Prisma } from '@prisma/client'

export interface UserProfile {
  id: string
  user_id: string
  static_profile_json: Prisma.JsonValue
  static_profile_text: string | null
  dynamic_profile_json: Prisma.JsonValue
  dynamic_profile_text: string | null
  last_updated: Date
  last_memory_analyzed: Date | null
  version: number
}

const PROFILE_CACHE_PREFIX = 'user_profile:'
const PROFILE_CACHE_TTL = 10 * 60 // 10 minutes in seconds
const PROFILE_CONTEXT_CACHE_PREFIX = 'user_profile_context:'
const PROFILE_CONTEXT_CACHE_TTL = 5 * 60 // 5 minutes in seconds

function getProfileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`
}

function getProfileContextCacheKey(userId: string): string {
  return `${PROFILE_CONTEXT_CACHE_PREFIX}${userId}`
}

async function invalidateProfileCache(userId: string): Promise<void> {
  try {
    const client = getRedisClient()
    await Promise.all([
      client.del(getProfileCacheKey(userId)),
      client.del(getProfileContextCacheKey(userId)),
    ])
  } catch (error) {
    logger.warn('[profile] cache invalidation error', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export class ProfileUpdateService {
  async updateUserProfile(userId: string, force: boolean = false): Promise<UserProfile> {
    const [existingProfile, allMemories] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { user_id: userId },
      }),
      prisma.memory.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          title: true,
          summary: true,
          content: true,
          created_at: true,
          page_metadata: true,
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
    ])

    const lastAnalyzedDate = force ? null : existingProfile?.last_memory_analyzed || null

    const newMemories = lastAnalyzedDate
      ? allMemories.filter(m => m.created_at > lastAnalyzedDate)
      : allMemories

    if (newMemories.length === 0 && existingProfile && !force) {
      return existingProfile as UserProfile
    }

    if (allMemories.length === 0) {
      throw new Error('No memories found for user')
    }

    let extractionResult: ProfileExtractionResult

    try {
      extractionResult = await profileExtractionService.extractProfileFromMemories(
        userId,
        allMemories
      )
    } catch (error) {
      logger.error('Error extracting profile, retrying once:', error)

      try {
        extractionResult = await profileExtractionService.extractProfileFromMemories(
          userId,
          allMemories
        )
      } catch (retryError) {
        logger.error('Error extracting profile on retry:', retryError)

        if (existingProfile) {
          logger.log('Preserving existing profile due to extraction failure')
          return existingProfile as UserProfile
        }

        throw new Error('Failed to extract profile and no existing profile to preserve')
      }
    }

    if (existingProfile && !force && lastAnalyzedDate) {
      const merged = this.mergeProfiles(existingProfile, extractionResult)
      extractionResult = merged
    }

    const latestMemory =
      allMemories.length > 0
        ? allMemories[0]
        : await prisma.memory.findFirst({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
          })

    const profile = await prisma.userProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        static_profile_json: extractionResult.static_profile_json as unknown as Prisma.JsonValue,
        static_profile_text: extractionResult.static_profile_text,
        dynamic_profile_json: extractionResult.dynamic_profile_json as unknown as Prisma.JsonValue,
        dynamic_profile_text: extractionResult.dynamic_profile_text,
        last_memory_analyzed: latestMemory?.created_at || null,
        version: 1,
      },
      update: {
        static_profile_json: extractionResult.static_profile_json as unknown as Prisma.JsonValue,
        static_profile_text: extractionResult.static_profile_text,
        dynamic_profile_json: extractionResult.dynamic_profile_json as unknown as Prisma.JsonValue,
        dynamic_profile_text: extractionResult.dynamic_profile_text,
        last_memory_analyzed: latestMemory?.created_at || null,
        version: { increment: 1 },
      },
    })

    // Invalidate cache after profile update
    await invalidateProfileCache(userId)

    return profile as UserProfile
  }

  private mergeProfiles(
    existing: {
      static_profile_json?: Prisma.JsonValue
      dynamic_profile_json?: Prisma.JsonValue
      static_profile_text?: string | null
      dynamic_profile_text?: string | null
    },
    newExtraction: ProfileExtractionResult
  ): ProfileExtractionResult {
    const existingStatic =
      existing.static_profile_json &&
      typeof existing.static_profile_json === 'object' &&
      existing.static_profile_json !== null &&
      !Array.isArray(existing.static_profile_json)
        ? (existing.static_profile_json as Record<string, unknown>)
        : {}
    const existingDynamic =
      existing.dynamic_profile_json &&
      typeof existing.dynamic_profile_json === 'object' &&
      existing.dynamic_profile_json !== null &&
      !Array.isArray(existing.dynamic_profile_json)
        ? (existing.dynamic_profile_json as Record<string, unknown>)
        : {}

    const existingInterests = Array.isArray(existingStatic.interests)
      ? (existingStatic.interests as string[])
      : []
    const existingSkills = Array.isArray(existingStatic.skills)
      ? (existingStatic.skills as string[])
      : []
    const existingLongTermPatterns = Array.isArray(existingStatic.long_term_patterns)
      ? (existingStatic.long_term_patterns as string[])
      : []
    const existingDomains = Array.isArray(existingStatic.domains)
      ? (existingStatic.domains as string[])
      : []
    const existingExpertiseAreas = Array.isArray(existingStatic.expertise_areas)
      ? (existingStatic.expertise_areas as string[])
      : []
    const existingPersonalityTraits = Array.isArray(existingStatic.personality_traits)
      ? (existingStatic.personality_traits as string[])
      : []
    const existingValuesAndPriorities = Array.isArray(existingStatic.values_and_priorities)
      ? (existingStatic.values_and_priorities as string[])
      : []
    const existingDemographics =
      existingStatic.demographics &&
      typeof existingStatic.demographics === 'object' &&
      existingStatic.demographics !== null &&
      !Array.isArray(existingStatic.demographics)
        ? (existingStatic.demographics as Record<string, unknown>)
        : {}

    const mergedStatic = {
      interests: this.mergeArrays(
        existingInterests,
        newExtraction.static_profile_json.interests || []
      ),
      skills: this.mergeArrays(existingSkills, newExtraction.static_profile_json.skills || []),
      profession:
        newExtraction.static_profile_json.profession ||
        (typeof existingStatic.profession === 'string' ? existingStatic.profession : undefined),
      demographics: {
        ...existingDemographics,
        ...newExtraction.static_profile_json.demographics,
      },
      long_term_patterns: this.mergeArrays(
        existingLongTermPatterns,
        newExtraction.static_profile_json.long_term_patterns || []
      ),
      domains: this.mergeArrays(existingDomains, newExtraction.static_profile_json.domains || []),
      expertise_areas: this.mergeArrays(
        existingExpertiseAreas,
        newExtraction.static_profile_json.expertise_areas || []
      ),
      personality_traits: this.mergeArrays(
        existingPersonalityTraits,
        newExtraction.static_profile_json.personality_traits || []
      ),
      work_style: {
        ...(existingStatic.work_style &&
        typeof existingStatic.work_style === 'object' &&
        existingStatic.work_style !== null &&
        !Array.isArray(existingStatic.work_style)
          ? (existingStatic.work_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.work_style,
      },
      communication_style: {
        ...(existingStatic.communication_style &&
        typeof existingStatic.communication_style === 'object' &&
        existingStatic.communication_style !== null &&
        !Array.isArray(existingStatic.communication_style)
          ? (existingStatic.communication_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.communication_style,
      },
      learning_preferences: {
        ...(existingStatic.learning_preferences &&
        typeof existingStatic.learning_preferences === 'object' &&
        existingStatic.learning_preferences !== null &&
        !Array.isArray(existingStatic.learning_preferences)
          ? (existingStatic.learning_preferences as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.learning_preferences,
      },
      values_and_priorities: this.mergeArrays(
        existingValuesAndPriorities,
        newExtraction.static_profile_json.values_and_priorities || []
      ),
      technology_preferences: {
        ...(existingStatic.technology_preferences &&
        typeof existingStatic.technology_preferences === 'object' &&
        existingStatic.technology_preferences !== null &&
        !Array.isArray(existingStatic.technology_preferences)
          ? (existingStatic.technology_preferences as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.technology_preferences,
      },
      lifestyle_patterns: {
        ...(existingStatic.lifestyle_patterns &&
        typeof existingStatic.lifestyle_patterns === 'object' &&
        existingStatic.lifestyle_patterns !== null &&
        !Array.isArray(existingStatic.lifestyle_patterns)
          ? (existingStatic.lifestyle_patterns as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.lifestyle_patterns,
      },
      cognitive_style: {
        ...(existingStatic.cognitive_style &&
        typeof existingStatic.cognitive_style === 'object' &&
        existingStatic.cognitive_style !== null &&
        !Array.isArray(existingStatic.cognitive_style)
          ? (existingStatic.cognitive_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.cognitive_style,
      },
    }

    const existingCurrentProjects = Array.isArray(existingDynamic.current_projects)
      ? (existingDynamic.current_projects as string[])
      : []
    const existingRecentChanges = Array.isArray(existingDynamic.recent_changes)
      ? (existingDynamic.recent_changes as string[])
      : []
    const existingActiveGoals = Array.isArray(existingDynamic.active_goals)
      ? (existingDynamic.active_goals as string[])
      : []
    const existingRecentAchievements = Array.isArray(existingDynamic.recent_achievements)
      ? (existingDynamic.recent_achievements as string[])
      : []
    const existingEmotionalState =
      existingDynamic.emotional_state &&
      typeof existingDynamic.emotional_state === 'object' &&
      existingDynamic.emotional_state !== null &&
      !Array.isArray(existingDynamic.emotional_state)
        ? (existingDynamic.emotional_state as Record<string, unknown>)
        : {}

    const mergedDynamic = {
      recent_activities: newExtraction.dynamic_profile_json.recent_activities || [],
      current_projects: this.mergeArrays(
        existingCurrentProjects,
        newExtraction.dynamic_profile_json.current_projects || []
      ),
      temporary_interests: newExtraction.dynamic_profile_json.temporary_interests || [],
      recent_changes: this.mergeArrays(
        existingRecentChanges,
        newExtraction.dynamic_profile_json.recent_changes || []
      ),
      current_context: newExtraction.dynamic_profile_json.current_context || [],
      active_goals: this.mergeArrays(
        existingActiveGoals,
        newExtraction.dynamic_profile_json.active_goals || []
      ),
      current_challenges: newExtraction.dynamic_profile_json.current_challenges || [],
      recent_achievements: this.mergeArrays(
        existingRecentAchievements,
        newExtraction.dynamic_profile_json.recent_achievements || []
      ),
      current_focus_areas: newExtraction.dynamic_profile_json.current_focus_areas || [],
      emotional_state: {
        ...existingEmotionalState,
        ...newExtraction.dynamic_profile_json.emotional_state,
      },
      active_research_topics: newExtraction.dynamic_profile_json.active_research_topics || [],
      upcoming_events: newExtraction.dynamic_profile_json.upcoming_events || [],
    }

    return {
      static_profile_json: mergedStatic,
      static_profile_text: newExtraction.static_profile_text || existing.static_profile_text || '',
      dynamic_profile_json: mergedDynamic,
      dynamic_profile_text:
        newExtraction.dynamic_profile_text || existing.dynamic_profile_text || '',
    }
  }

  private mergeArrays(existing: string[], newItems: string[]): string[] {
    const merged = new Set([...existing, ...newItems])
    return Array.from(merged).slice(0, 20)
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cacheKey = getProfileCacheKey(userId)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as UserProfile
      }
    } catch (error) {
      logger.warn('[profile] cache read error, continuing without cache', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { user_id: userId },
    })

    if (profile) {
      try {
        const cacheKey = getProfileCacheKey(userId)
        const client = getRedisClient()
        await client.setex(cacheKey, PROFILE_CACHE_TTL, JSON.stringify(profile))
      } catch (error) {
        logger.warn('[profile] cache write error', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return profile as UserProfile | null
  }

  async getProfileContext(userId: string): Promise<string> {
    try {
      const cacheKey = getProfileContextCacheKey(userId)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)

      if (cached) {
        return cached
      }
    } catch (error) {
      logger.warn('[profile] context cache read error, continuing without cache', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const profile = await this.getUserProfile(userId)

    if (!profile) {
      return ''
    }

    const staticText = profile.static_profile_text || ''
    const dynamicText = profile.dynamic_profile_text || ''

    if (!staticText && !dynamicText) {
      return ''
    }

    const parts: string[] = []

    if (staticText) {
      parts.push(`User Profile (Long-term): ${staticText}`)
    }

    if (dynamicText) {
      parts.push(`Recent Context: ${dynamicText}`)
    }

    const context = parts.join('\n\n')

    try {
      const cacheKey = getProfileContextCacheKey(userId)
      const client = getRedisClient()
      await client.setex(cacheKey, PROFILE_CONTEXT_CACHE_TTL, context)
    } catch (error) {
      logger.warn('[profile] context cache write error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return context
  }

  async shouldUpdateProfile(userId: string, daysSinceLastUpdate: number = 7): Promise<boolean> {
    const profile = await this.getUserProfile(userId)

    if (!profile) {
      return true
    }

    const lastUpdated =
      profile.last_updated instanceof Date ? profile.last_updated : new Date(profile.last_updated)
    const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= daysSinceLastUpdate
  }

  async getUsersNeedingUpdate(daysSinceLastUpdate: number = 7): Promise<string[]> {
    const cutoffDate = new Date(Date.now() - daysSinceLastUpdate * 24 * 60 * 60 * 1000)

    const allUsers = await prisma.user.findMany({
      select: { id: true },
    })

    const usersNeedingUpdate: string[] = []

    for (const user of allUsers) {
      const profile = await prisma.userProfile.findUnique({
        where: { user_id: user.id },
        select: { last_updated: true },
      })

      if (!profile) {
        usersNeedingUpdate.push(user.id)
        continue
      }

      const lastUpdated =
        profile.last_updated instanceof Date ? profile.last_updated : new Date(profile.last_updated)

      if (lastUpdated < cutoffDate) {
        usersNeedingUpdate.push(user.id)
      }
    }

    return usersNeedingUpdate
  }
}

export const profileUpdateService = new ProfileUpdateService()
