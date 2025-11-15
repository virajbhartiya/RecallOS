import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'
import { Prisma } from '@prisma/client'

export type ExportBundle = {
  version: string
  exportedAt: string
  user: {
    id: string
    external_id: string | null
    email: string | null
  }
  memories: Array<{
    id: string
    title: string | null
    url: string | null
    content: string
    summary: string | null
    source: string
    timestamp: string
    created_at: string
    page_metadata: Prisma.JsonValue
    memory_type: string
    importance_score: number | null
    confidence_score: number | null
    source_app: string | null
  }>
  profile: {
    static_profile_text: string | null
    dynamic_profile_text: string | null
    static_profile_json: Prisma.JsonValue | null
    dynamic_profile_json: Prisma.JsonValue | null
  } | null
  knowledgeScores: Array<{
    period_type: string
    period_start: string
    period_end: string
    velocity_score: number
    impact_score: number
  }>
  achievements: Array<{
    badge_type: string
    badge_name: string
    unlocked_at: string | null
    progress: number
  }>
  benchmarks: {
    velocity_percentile: number | null
    impact_percentile: number | null
    connection_percentile: number | null
    diversity_percentile: number | null
    last_calculated: string
  } | null
}

export class ExportImportService {
  /**
   * Export all user data as a JSON bundle
   */
  async exportUserData(userId: string): Promise<ExportBundle> {
    try {
      const [user, memories, profile, knowledgeScores, achievements, benchmarks] =
        await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              external_id: true,
              email: true,
            },
          }),
          prisma.memory.findMany({
            where: { user_id: userId },
            select: {
              id: true,
              title: true,
              url: true,
              content: true,
              summary: true,
              source: true,
              timestamp: true,
              created_at: true,
              page_metadata: true,
              memory_type: true,
              importance_score: true,
              confidence_score: true,
              source_app: true,
            },
            orderBy: { created_at: 'desc' },
          }),
          prisma.userProfile.findUnique({
            where: { user_id: userId },
            select: {
              static_profile_text: true,
              dynamic_profile_text: true,
              static_profile_json: true,
              dynamic_profile_json: true,
            },
          }),
          prisma.knowledgeScore.findMany({
            where: { user_id: userId },
            select: {
              period_type: true,
              period_start: true,
              period_end: true,
              velocity_score: true,
              impact_score: true,
            },
            orderBy: { period_start: 'desc' },
          }),
          prisma.achievement.findMany({
            where: { user_id: userId },
            select: {
              badge_type: true,
              badge_name: true,
              unlocked_at: true,
              progress: true,
            },
            orderBy: { unlocked_at: 'desc' },
          }),
          prisma.userBenchmark.findUnique({
            where: { user_id: userId },
            select: {
              velocity_percentile: true,
              impact_percentile: true,
              connection_percentile: true,
              diversity_percentile: true,
              last_calculated: true,
            },
          }),
        ])

      if (!user) {
        throw new Error('User not found')
      }

      const bundle: ExportBundle = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          external_id: user.external_id,
          email: user.email,
        },
        memories: memories.map(m => ({
          id: m.id,
          title: m.title,
          url: m.url,
          content: m.content,
          summary: m.summary,
          source: m.source,
          timestamp: m.timestamp.toString(),
          created_at: m.created_at.toISOString(),
          page_metadata: m.page_metadata,
          memory_type: m.memory_type,
          importance_score: m.importance_score,
          confidence_score: m.confidence_score,
          source_app: m.source_app,
        })),
        profile: profile
          ? {
              static_profile_text: profile.static_profile_text,
              dynamic_profile_text: profile.dynamic_profile_text,
              static_profile_json: profile.static_profile_json,
              dynamic_profile_json: profile.dynamic_profile_json,
            }
          : null,
        knowledgeScores: knowledgeScores.map(ks => ({
          period_type: ks.period_type,
          period_start: ks.period_start.toISOString(),
          period_end: ks.period_end.toISOString(),
          velocity_score: ks.velocity_score,
          impact_score: ks.impact_score,
        })),
        achievements: achievements.map(a => ({
          badge_type: a.badge_type,
          badge_name: a.badge_name,
          unlocked_at: a.unlocked_at?.toISOString() || null,
          progress: a.progress,
        })),
        benchmarks: benchmarks
          ? {
              velocity_percentile: benchmarks.velocity_percentile,
              impact_percentile: benchmarks.impact_percentile,
              connection_percentile: benchmarks.connection_percentile,
              diversity_percentile: benchmarks.diversity_percentile,
              last_calculated: benchmarks.last_calculated.toISOString(),
            }
          : null,
      }

      return bundle
    } catch (error) {
      logger.error('[export] Error exporting user data:', error)
      throw error
    }
  }

  /**
   * Import user data from a JSON bundle
   * This creates new records for the target user
   */
  async importUserData(
    targetUserId: string,
    bundle: ExportBundle
  ): Promise<{
    imported: {
      memories: number
      profile: boolean
      knowledgeScores: number
      achievements: number
      benchmarks: boolean
    }
    errors: string[]
  }> {
    const errors: string[] = []
    let importedMemories = 0
    let importedProfile = false
    let importedKnowledgeScores = 0
    let importedAchievements = 0
    let importedBenchmarks = false

    try {
      // Verify bundle version
      if (bundle.version !== '1.0') {
        throw new Error(`Unsupported bundle version: ${bundle.version}`)
      }

      // Import memories (skip duplicates based on canonical_hash if available)
      for (const memory of bundle.memories) {
        try {
          // Check for existing memory by content hash or URL
          const existing = await prisma.memory.findFirst({
            where: {
              user_id: targetUserId,
              OR: [{ id: memory.id }, { url: memory.url || undefined }],
            },
          })

          if (existing) {
            logger.log('[import] Skipping duplicate memory', { memoryId: memory.id })
            continue
          }

          await prisma.memory.create({
            data: {
              user_id: targetUserId,
              title: memory.title,
              url: memory.url,
              content: memory.content,
              summary: memory.summary,
              source: memory.source,
              timestamp: BigInt(memory.timestamp),
              created_at: new Date(memory.created_at),
              page_metadata: memory.page_metadata,
              memory_type: memory.memory_type as any,
              importance_score: memory.importance_score,
              confidence_score: memory.confidence_score,
              source_app: memory.source_app,
            },
          })
          importedMemories++
        } catch (error) {
          errors.push(
            `Failed to import memory ${memory.id}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      // Import profile
      if (bundle.profile) {
        try {
          await prisma.userProfile.upsert({
            where: { user_id: targetUserId },
            create: {
              user_id: targetUserId,
              static_profile_text: bundle.profile.static_profile_text,
              dynamic_profile_text: bundle.profile.dynamic_profile_text,
              static_profile_json: bundle.profile.static_profile_json,
              dynamic_profile_json: bundle.profile.dynamic_profile_json,
            },
            update: {
              static_profile_text: bundle.profile.static_profile_text,
              dynamic_profile_text: bundle.profile.dynamic_profile_text,
              static_profile_json: bundle.profile.static_profile_json,
              dynamic_profile_json: bundle.profile.dynamic_profile_json,
            },
          })
          importedProfile = true
        } catch (error) {
          errors.push(
            `Failed to import profile: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      // Import knowledge scores
      for (const score of bundle.knowledgeScores) {
        try {
          await prisma.knowledgeScore.create({
            data: {
              user: { connect: { id: targetUserId } },
              period_type: score.period_type,
              period_start: new Date(score.period_start),
              period_end: new Date(score.period_end),
              velocity_score: score.velocity_score,
              impact_score: score.impact_score,
              topic_rate: 0,
              diversity_index: 0,
              consistency_score: 0,
              depth_balance: 0,
              search_frequency: 0,
              retrieval_efficiency: 0,
              connection_strength: 0,
              access_quality: 0,
            },
          })
          importedKnowledgeScores++
        } catch (error) {
          // Skip duplicates
          if (error instanceof Error && error.message.includes('Unique constraint')) {
            continue
          }
          errors.push(
            `Failed to import knowledge score: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      // Import achievements
      for (const achievement of bundle.achievements) {
        try {
          await prisma.achievement.create({
            data: {
              user: { connect: { id: targetUserId } },
              badge_type: achievement.badge_type,
              badge_name: achievement.badge_name,
              unlocked_at: achievement.unlocked_at ? new Date(achievement.unlocked_at) : null,
              progress: achievement.progress,
            },
          })
          importedAchievements++
        } catch (error) {
          // Skip duplicates
          if (error instanceof Error && error.message.includes('Unique constraint')) {
            continue
          }
          errors.push(
            `Failed to import achievement: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      // Import benchmarks
      if (bundle.benchmarks) {
        try {
          await prisma.userBenchmark.upsert({
            where: { user_id: targetUserId },
            create: {
              user: { connect: { id: targetUserId } },
              velocity_percentile: bundle.benchmarks.velocity_percentile,
              impact_percentile: bundle.benchmarks.impact_percentile,
              connection_percentile: bundle.benchmarks.connection_percentile,
              diversity_percentile: bundle.benchmarks.diversity_percentile,
              last_calculated: new Date(bundle.benchmarks.last_calculated),
            },
            update: {
              velocity_percentile: bundle.benchmarks.velocity_percentile,
              impact_percentile: bundle.benchmarks.impact_percentile,
              connection_percentile: bundle.benchmarks.connection_percentile,
              diversity_percentile: bundle.benchmarks.diversity_percentile,
              last_calculated: new Date(bundle.benchmarks.last_calculated),
            },
          })
          importedBenchmarks = true
        } catch (error) {
          errors.push(
            `Failed to import benchmarks: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      return {
        imported: {
          memories: importedMemories,
          profile: importedProfile,
          knowledgeScores: importedKnowledgeScores,
          achievements: importedAchievements,
          benchmarks: importedBenchmarks,
        },
        errors,
      }
    } catch (error) {
      logger.error('[import] Error importing user data:', error)
      throw error
    }
  }
}

export const exportImportService = new ExportImportService()
