import { MemoryType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.lib'

type ScoreSignals = {
  memoryType: MemoryType
  contentLength: number
  topics?: string[]
  categories?: string[]
  metadata?: Record<string, unknown> | null
  extractedImportance?: number
  importanceScoreOverride?: number
  accessCount?: number
}

type MetadataRecord = Record<string, unknown>

const MS_IN_DAY = 1000 * 60 * 60 * 24

const MEMORY_TYPE_WEIGHTS: Record<MemoryType, number> = {
  FACT: 0.95,
  PREFERENCE: 0.75,
  LOG_EVENT: 0.55,
  REFERENCE: 0.7,
}

const MEMORY_TYPE_HINTS: Array<{ pattern: RegExp; type: MemoryType }> = [
  { pattern: /(preference|likes|favorite|habit|routine)/i, type: 'PREFERENCE' },
  { pattern: /(fact|definition|reference|glossary)/i, type: 'FACT' },
  {
    pattern: /(todo|task|project|milestone|roadmap|meeting|call|email|conversation|chat|thread)/i,
    type: 'LOG_EVENT',
  },
  { pattern: /(article|doc|documentation|guide|tutorial)/i, type: 'REFERENCE' },
]

function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function asRecord(value: Prisma.JsonValue | null | undefined): MetadataRecord {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value instanceof Date ||
    value === null
  ) {
    return {}
  }
  return value as MetadataRecord
}

function normalizeImportance(raw?: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0
  }
  if (raw > 1) {
    return clamp(raw / 100)
  }
  return clamp(raw)
}

export class MemoryScoringService {
  private decayHalfLifeDays = Number(process.env.MEMORY_DECAY_HALF_LIFE_DAYS || 21)

  inferMemoryType(options: {
    explicitType?: string | null
    metadata?: Record<string, unknown> | null
    title?: string | null
    contentPreview?: string | null
  }): MemoryType {
    const explicit = options.explicitType?.toUpperCase()
    if (explicit && explicit in MemoryType) {
      return explicit as MemoryType
    }

    const metadata = options.metadata || {}

    const metaType = typeof metadata.memory_type === 'string' ? metadata.memory_type : null
    if (metaType && metaType.toUpperCase() in MemoryType) {
      return metaType.toUpperCase() as MemoryType
    }

    const contentType =
      typeof metadata.content_type === 'string' ? metadata.content_type.toLowerCase() : undefined

    if (contentType) {
      if (/(email|chat|message|meeting|call|task|project|ticket|issue)/.test(contentType)) {
        return 'LOG_EVENT'
      }
      if (/(preference|habit|routine)/.test(contentType)) {
        return 'PREFERENCE'
      }
      if (/(fact|reference|snippet)/.test(contentType)) {
        return 'FACT'
      }
    }

    const haystack = `${options.title || ''} ${options.contentPreview || ''}`.trim()
    for (const hint of MEMORY_TYPE_HINTS) {
      if (hint.pattern.test(haystack)) {
        return hint.type
      }
    }

    if (metadata?.is_fact === true) {
      return 'FACT'
    }

    if (metadata?.preference || metadata?.preference_type) {
      return 'PREFERENCE'
    }

    if (metadata?.thread_id || metadata?.email_id) {
      return 'LOG_EVENT'
    }

    return 'REFERENCE'
  }

  calculateImportanceScore(signals: ScoreSignals): number {
    const metadataImportance = normalizeImportance(
      signals.extractedImportance ?? signals.metadata?.importance
    )
    const typeWeight = MEMORY_TYPE_WEIGHTS[signals.memoryType] ?? 0.6
    const lengthBoost = clamp(signals.contentLength / 6000, 0, 0.35)
    const topicalBoost = clamp(
      ((signals.topics?.length || 0) + (signals.categories?.length || 0)) / 40,
      0,
      0.2
    )
    const metadataBoost = metadataImportance * 0.4

    const base = 0.25 + typeWeight * 0.4 + lengthBoost + topicalBoost + metadataBoost
    return clamp(base, 0.05, 1)
  }

  calculateConfidenceScore(signals: ScoreSignals & { importanceScore?: number }): number {
    const normalizedLength = clamp(signals.contentLength / 4000, 0, 0.25)
    const importanceScore = signals.importanceScore ?? this.calculateImportanceScore(signals)
    const metadataImportance = normalizeImportance(
      signals.extractedImportance ?? signals.metadata?.importance
    )
    const accessBoost = clamp((signals.accessCount || 0) / 50, 0, 0.15)
    const typeWeight = MEMORY_TYPE_WEIGHTS[signals.memoryType] ?? 0.6

    const score =
      0.35 +
      normalizedLength +
      importanceScore * 0.25 +
      metadataImportance * 0.15 +
      typeWeight * 0.1 +
      accessBoost
    return clamp(score, 0.1, 1)
  }

  calculateExpiresAt(metadata?: Record<string, unknown> | null): Date | null {
    if (!metadata) return null
    const explicit =
      metadata.expires_at || metadata.expiry || metadata.valid_until || metadata.deadline
    if (typeof explicit === 'string' || explicit instanceof Date) {
      const date = new Date(explicit)
      if (!Number.isNaN(date.getTime())) {
        return date
      }
    }
    if (metadata.period_end) {
      const date = new Date(metadata.period_end as string)
      if (!Number.isNaN(date.getTime())) {
        return date
      }
    }
    if (metadata.content_type === 'calendar_event' && metadata.event_end) {
      const date = new Date(metadata.event_end as string)
      if (!Number.isNaN(date.getTime())) {
        return date
      }
    }
    return null
  }

  mergeMetadata(
    existing: Prisma.JsonValue | null | undefined,
    incoming: Record<string, unknown>
  ): Prisma.JsonValue {
    const base = asRecord(existing)
    const merged: Record<string, unknown> = { ...base }

    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined) continue
      if (Array.isArray(value) && Array.isArray(base[key])) {
        const deduped = Array.from(new Set([...(base[key] as unknown[]), ...value]))
        merged[key] = deduped.slice(0, 50)
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const existingValue =
          typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])
            ? (base[key] as Record<string, unknown>)
            : {}
        merged[key] = { ...existingValue, ...(value as Record<string, unknown>) }
      } else {
        merged[key] = value
      }
    }

    return merged as Prisma.JsonValue
  }

  async recomputeUserScores(userId: string): Promise<void> {
    const memories = await prisma.memory.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        memory_type: true,
        importance_score: true,
        confidence_score: true,
        access_count: true,
        last_accessed: true,
        created_at: true,
        page_metadata: true,
        content: true,
        summary: true,
      },
    })

    if (memories.length === 0) return

    const now = new Date()
    const updates: Array<Promise<unknown>> = []

    for (const memory of memories) {
      const metadata = asRecord(memory.page_metadata)
      const topics = Array.isArray(metadata.topics)
        ? metadata.topics.filter((topic): topic is string => typeof topic === 'string')
        : []
      const categories = Array.isArray(metadata.categories)
        ? metadata.categories.filter((category): category is string => typeof category === 'string')
        : []
      const contentLength = memory.content?.length || memory.summary?.length || 0
      const baseImportance =
        typeof memory.importance_score === 'number' && Number.isFinite(memory.importance_score)
          ? clamp(memory.importance_score)
          : this.calculateImportanceScore({
              memoryType: memory.memory_type,
              contentLength,
              topics,
              categories,
              metadata,
            })

      const decayedImportance = this.applyDecay(
        baseImportance,
        memory.last_accessed,
        memory.created_at,
        now
      )
      const confidenceScore = this.calculateConfidenceScore({
        memoryType: memory.memory_type,
        contentLength,
        topics,
        categories,
        metadata,
        importanceScore: decayedImportance,
        accessCount: memory.access_count,
      })

      updates.push(
        prisma.memory.update({
          where: { id: memory.id },
          data: {
            importance_score: decayedImportance,
            confidence_score: confidenceScore,
          },
        })
      )
    }

    await Promise.allSettled(updates)
  }

  async reweightRelations(userId: string): Promise<void> {
    const relations = await prisma.memoryRelation.findMany({
      where: {
        memory: {
          user_id: userId,
        },
      },
      select: {
        id: true,
        memory_id: true,
        related_memory_id: true,
        similarity_score: true,
      },
    })

    if (relations.length === 0) return

    const memoryIds = Array.from(
      new Set(relations.flatMap(r => [r.memory_id, r.related_memory_id]))
    )

    const memories = await prisma.memory.findMany({
      where: { id: { in: memoryIds } },
      select: { id: true, importance_score: true },
    })

    const importanceMap = new Map(
      memories.map(m => [
        m.id,
        clamp(typeof m.importance_score === 'number' ? m.importance_score : 0.3),
      ])
    )

    const updates: Array<Promise<unknown>> = []
    for (const relation of relations) {
      const importanceA = importanceMap.get(relation.memory_id) ?? 0.3
      const importanceB = importanceMap.get(relation.related_memory_id) ?? 0.3
      const importanceAvg = (importanceA + importanceB) / 2
      const multiplier = 0.6 + importanceAvg * 0.4
      const newScore = clamp(relation.similarity_score * multiplier, 0, 1)
      if (Math.abs(newScore - relation.similarity_score) < 0.01) {
        continue
      }
      updates.push(
        prisma.memoryRelation.update({
          where: { id: relation.id },
          data: { similarity_score: newScore },
        })
      )
    }

    if (updates.length > 0) {
      await Promise.allSettled(updates)
    }
  }

  private applyDecay(
    baseScore: number,
    lastAccessed: Date | null,
    createdAt: Date,
    now: Date
  ): number {
    const reference = lastAccessed || createdAt
    const ageDays = Math.max(0, (now.getTime() - reference.getTime()) / MS_IN_DAY)
    if (ageDays === 0) return clamp(baseScore)
    const decayFactor = Math.pow(0.5, ageDays / this.decayHalfLifeDays)
    return clamp(baseScore * decayFactor, 0.02, 1)
  }
}

export const memoryScoringService = new MemoryScoringService()
