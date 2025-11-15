import { Request, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { createHash } from 'crypto'
import { prisma } from '../lib/prisma.lib'
import { aiProvider } from '../services/ai-provider.service'
import { memoryMeshService } from '../services/memory-mesh.service'
import { memoryIngestionService } from '../services/memory-ingestion.service'
import { profileUpdateService } from '../services/profile-update.service'
import { privacyService } from '../services/privacy.service'
import { auditLogService } from '../services/audit-log.service'
import { memoryRedactionService } from '../services/memory-redaction.service'
import { logger } from '../utils/logger.util'
import { Prisma } from '@prisma/client'

type MemorySelect = Prisma.MemoryGetPayload<{
  select: {
    id: true
    title: true
    url: true
    timestamp: true
    created_at: true
    summary: true
    content: true
    source: true
    page_metadata: true
    canonical_text?: true
    canonical_hash?: true
  }
}>

type PrismaError = {
  code?: string
  message?: string
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

const PROFILE_IMPORTANCE_THRESHOLD = Number(process.env.PROFILE_IMPORTANCE_THRESHOLD || 0.7)

export class MemoryController {
  static async getMemoryInbox(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' })
      }

      const inboxMemories = await prisma.memory.findMany({
        where: { user_id: req.user.id },
        orderBy: { created_at: 'desc' },
        take: 200,
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          created_at: true,
          importance_score: true,
          page_metadata: true,
          memory_type: true,
          source: true,
        },
      })

      const pending = inboxMemories.filter(memory => {
        const metadata = memory.page_metadata as Record<string, unknown> | null
        const clientFlags =
          metadata &&
          typeof metadata === 'object' &&
          !Array.isArray(metadata) &&
          'client_flags' in metadata
            ? ((metadata as Record<string, unknown>).client_flags as Record<string, unknown>)
            : undefined
        const reviewed = typeof clientFlags?.reviewed === 'boolean' ? clientFlags.reviewed : false
        return !reviewed
      })

      res.status(200).json({
        success: true,
        data: pending.map(memory => {
          const metadata = memory.page_metadata as Record<string, unknown> | null
          const clientFlags =
            metadata &&
            typeof metadata === 'object' &&
            !Array.isArray(metadata) &&
            'client_flags' in metadata
              ? ((metadata as Record<string, unknown>).client_flags as Record<string, unknown>)
              : {}
          return {
            id: memory.id,
            title: memory.title,
            summary: memory.summary,
            url: memory.url,
            created_at: memory.created_at,
            importance_score: memory.importance_score,
            memory_type: memory.memory_type,
            source: memory.source,
            client_flags: clientFlags,
          }
        }),
      })
    } catch (error) {
      logger.error('Error fetching memory inbox:', error)
      res.status(500).json({ success: false, error: 'Failed to load memory inbox' })
    }
  }

  static async updateMemoryFlags(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' })
      }
      const { memoryId } = req.params
      const { reviewed, pinned } = req.body as { reviewed?: boolean; pinned?: boolean }

      const memory = await prisma.memory.findFirst({
        where: { id: memoryId, user_id: req.user.id },
        select: { page_metadata: true },
      })

      if (!memory) {
        return res.status(404).json({ success: false, error: 'Memory not found' })
      }

      const metadata =
        memory.page_metadata && typeof memory.page_metadata === 'object'
          ? (memory.page_metadata as Record<string, unknown>)
          : {}
      const clientFlagsRaw =
        metadata.client_flags && typeof metadata.client_flags === 'object'
          ? (metadata.client_flags as Record<string, unknown>)
          : {}

      const updatedFlags = { ...clientFlagsRaw }
      if (typeof reviewed === 'boolean') {
        updatedFlags.reviewed = reviewed
        if (reviewed) {
          updatedFlags.reviewed_at = new Date().toISOString()
        }
      }
      if (typeof pinned === 'boolean') {
        updatedFlags.pinned = pinned
      }

      const updatedMetadata = JSON.parse(
        JSON.stringify({
          ...metadata,
          client_flags: updatedFlags,
        })
      ) as Prisma.JsonValue

      await prisma.memory.update({
        where: { id: memoryId },
        data: {
          page_metadata: updatedMetadata,
        },
      })

      res.status(200).json({
        success: true,
        data: {
          memoryId,
          client_flags: updatedFlags,
        },
      })
    } catch (error) {
      logger.error('Error updating memory flags:', error)
      res.status(500).json({ success: false, error: 'Failed to update memory flags' })
    }
  }

  static async processRawContent(req: AuthenticatedRequest, res: Response) {
    try {
      const { content, url, title, metadata } = req.body

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required',
        })
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id

      logger.log('[memory/process] inbound', {
        ts: new Date().toISOString(),
        userId: userId,
        url: typeof url === 'string' ? url.slice(0, 200) : undefined,
        title: typeof title === 'string' ? title.slice(0, 200) : undefined,
        contentLen: typeof content === 'string' ? content.length : undefined,
      })

      // Check privacy settings for this domain
      if (url && typeof url === 'string') {
        const domain = privacyService.extractDomain(url)
        const shouldBlock = await privacyService.shouldBlockCapture(userId, domain)

        if (shouldBlock) {
          logger.log('[memory/process] blocked_by_privacy', {
            userId,
            domain,
            url: url.slice(0, 200),
          })
          return res.status(403).json({
            success: false,
            error: 'Content capture is blocked for this domain',
            domain,
          })
        }
      }

      const metadataPayload =
        metadata && typeof metadata === 'object' && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : undefined

      const canonicalData = memoryIngestionService.canonicalizeContent(content, url)

      const duplicateCheck = await memoryIngestionService.findDuplicateMemory({
        userId,
        canonicalHash: canonicalData.canonicalHash,
        canonicalText: canonicalData.canonicalText,
        url,
      })

      if (duplicateCheck) {
        const merged = await memoryIngestionService.mergeDuplicateMemory(
          duplicateCheck.memory,
          metadataPayload,
          undefined
        )
        const serializedExisting = {
          ...merged,
          timestamp: merged.timestamp ? merged.timestamp.toString() : null,
        }
        logger.log('[memory/process] duplicate_short_circuit', {
          reason: duplicateCheck.reason,
          memoryId: merged.id,
          userId,
        })
        return res.status(200).json({
          success: true,
          message: 'Duplicate memory detected, returning existing record',
          data: {
            userId: userId,
            memory: serializedExisting,
            isDuplicate: true,
          },
        })
      }

      const aiStart = Date.now()
      logger.log('[memory/process] ai_start', {
        ts: new Date().toISOString(),
        tasks: ['summarizeContent', 'extractContentMetadata'],
      })
      const [summaryResult, extractedMetadataResult] = await Promise.all([
        aiProvider.summarizeContent(content, metadataPayload, userId),
        aiProvider.extractContentMetadata(content, metadataPayload, userId),
      ])
      type MetadataResult =
        | {
            topics?: string[]
            categories?: string[]
            keyPoints?: string[]
            sentiment?: string
            importance?: number
            usefulness?: number
            searchableTerms?: string[]
            contextRelevance?: string[]
          }
        | { metadata?: MetadataResult }

      let summary: string
      if (typeof summaryResult === 'string') {
        summary = summaryResult
      } else {
        const result = summaryResult as { text?: string }
        summary = result.text || summaryResult
      }

      let extractedMetadata: MetadataResult
      if (
        typeof extractedMetadataResult === 'object' &&
        extractedMetadataResult !== null &&
        'topics' in extractedMetadataResult
      ) {
        extractedMetadata = extractedMetadataResult as MetadataResult
      } else if (
        typeof extractedMetadataResult === 'object' &&
        extractedMetadataResult !== null &&
        'metadata' in extractedMetadataResult
      ) {
        extractedMetadata =
          (extractedMetadataResult as { metadata?: MetadataResult }).metadata ||
          (extractedMetadataResult as MetadataResult)
      } else {
        extractedMetadata = extractedMetadataResult as MetadataResult
      }
      logger.log('[memory/process] ai_done', {
        ms: Date.now() - aiStart,
        hasSummary: !!summary,
        hasExtracted: !!extractedMetadata,
      })

      const urlHash = hashUrl(url || 'unknown')

      const dbCreateStart = Date.now()
      let memory
      try {
        const extractedMetadataRecord =
          extractedMetadata && typeof extractedMetadata === 'object'
            ? (extractedMetadata as Record<string, unknown>)
            : undefined

        const memoryCreateInput = memoryIngestionService.buildMemoryCreatePayload({
          userId,
          title,
          url,
          source: (metadataPayload?.source as string | undefined) || undefined,
          content,
          summary,
          metadata: metadataPayload,
          extractedMetadata: extractedMetadataRecord,
          canonicalText: canonicalData.canonicalText,
          canonicalHash: canonicalData.canonicalHash,
        })

        memory = await prisma.memory.create({
          data: memoryCreateInput,
        })
        logger.log('[memory/process] db_memory_created', {
          ms: Date.now() - dbCreateStart,
          memoryId: memory.id,
          userId: userId,
        })

        // Log audit event for memory capture
        if (url && typeof url === 'string') {
          auditLogService
            .logMemoryCapture(userId, memory.id, url, {
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            })
            .catch(err => {
              logger.warn('[memory/process] audit_log_failed', {
                error: err instanceof Error ? err.message : String(err),
              })
            })
        }
      } catch (createError) {
        const error = createError as PrismaError
        if (error.code === 'P2002' && canonicalData.canonicalHash) {
          const existingMemory = await prisma.memory.findFirst({
            where: { user_id: userId, canonical_hash: canonicalData.canonicalHash },
            select: {
              id: true,
              title: true,
              url: true,
              timestamp: true,
              created_at: true,
              summary: true,
              content: true,
              source: true,
              page_metadata: true,
              canonical_text: true,
              canonical_hash: true,
            },
          })

          if (existingMemory) {
            const serializedExisting = {
              ...existingMemory,
              timestamp: existingMemory.timestamp ? existingMemory.timestamp.toString() : null,
            }
            logger.log('[memory/process] duplicate_detected_on_create', {
              existingMemoryId: existingMemory.id,
              userId: userId,
            })
            return res.status(200).json({
              success: true,
              message: 'Duplicate memory detected, returning existing record',
              data: {
                userId: userId,
                memory: serializedExisting,
                isDuplicate: true,
              },
            })
          }
        }
        throw createError
      }

      // Return response immediately, process heavy operations in background
      logger.log('[memory/process] done', { memoryId: memory.id })

      // Process heavy operations in background (non-blocking)
      setImmediate(async () => {
        // Create snapshot
        try {
          const snapStart = Date.now()
          const summaryHash = '0x' + createHash('sha256').update(summary).digest('hex')

          await prisma.memorySnapshot.create({
            data: {
              user_id: userId,
              raw_text: content,
              summary: summary,
              summary_hash: summaryHash,
            },
          })
          logger.log('[memory/process] snapshot_created', {
            ms: Date.now() - snapStart,
            memoryId: memory.id,
          })
        } catch (snapshotError) {
          logger.error(`Error creating snapshot for memory ${memory.id}:`, snapshotError)
        }

        // Process mesh (embeddings + relations) in background
        try {
          const meshStart = Date.now()
          logger.log('[memory/process] mesh_start', { memoryId: memory.id, userId: userId })
          await memoryMeshService.processMemoryForMesh(memory.id, userId)
          logger.log('[memory/process] mesh_done', {
            ms: Date.now() - meshStart,
            memoryId: memory.id,
          })
        } catch (meshError) {
          logger.error(`Error processing memory ${memory.id} for mesh:`, meshError)
        }

        // Update profile if needed
        try {
          if ((memory.importance_score || 0) >= PROFILE_IMPORTANCE_THRESHOLD) {
            const shouldUpdate = await profileUpdateService.shouldUpdateProfile(userId, 3)
            if (shouldUpdate) {
              logger.log('[memory/process] profile_update_triggered', {
                memoryId: memory.id,
                userId,
              })
              await profileUpdateService.updateUserProfile(userId)
            }
          }
        } catch (profileError) {
          logger.error(`[memory/process] profile update failed for ${memory.id}`, profileError)
        }
      })
      res.status(200).json({
        success: true,
        message: 'Content processed and stored successfully',
        data: {
          userId: userId,
          memoryId: memory.id,
          urlHash,
          transactionDetails: null,
        },
      })
    } catch (error) {
      logger.error('Error processing raw content:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process raw content',
      })
    }
  }

  static async getRecentMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const { count } = req.query
      const limit = Math.min(count ? parseInt(count as string) : 10, 100)

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id

      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          title: true,
          url: true,
          timestamp: true,
          created_at: true,
          summary: true,
          content: true,
          source: true,
          page_metadata: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      // Convert BigInt values to strings for JSON serialization
      const serializedMemories = memories.map((memory: MemorySelect) => ({
        ...memory,
        timestamp: memory.timestamp ? memory.timestamp.toString() : null,
      }))

      res.status(200).json({
        success: true,
        data: {
          userId: userId,
          count: limit,
          memories: serializedMemories,
          actualCount: memories.length,
        },
      })
    } catch (error) {
      logger.error('Error getting recent memories:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get recent memories',
      })
    }
  }

  static async getUserMemoryCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id

      const count = await prisma.memory.count({
        where: { user_id: userId },
      })

      return res.status(200).json({
        success: true,
        data: {
          userId: userId,
          memoryCount: count,
        },
      })
    } catch (error) {
      logger.error('Error getting user memory count:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memory count',
      })
    }
  }

  static async getMemoryInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id

      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: {
          page_metadata: true,
          timestamp: true,
          source: true,
        },
        take: 1000,
      })

      const topicCounts: { [key: string]: number } = {}

      const categoryCounts: { [key: string]: number } = {}

      const sentimentCounts: { [key: string]: number } = {}

      const sourceCounts: { [key: string]: number } = {}

      let totalImportance = 0

      let importanceCount = 0

      memories.forEach(memory => {
        const metadata = memory.page_metadata as Record<string, unknown> | null

        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: unknown) => {
            if (typeof topic === 'string') {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1
            }
          })
        }

        if (metadata?.categories && Array.isArray(metadata.categories)) {
          metadata.categories.forEach((category: unknown) => {
            if (typeof category === 'string') {
              categoryCounts[category] = (categoryCounts[category] || 0) + 1
            }
          })
        }

        if (metadata?.sentiment && typeof metadata.sentiment === 'string') {
          sentimentCounts[metadata.sentiment] = (sentimentCounts[metadata.sentiment] || 0) + 1
        }

        sourceCounts[memory.source] = (sourceCounts[memory.source] || 0) + 1

        if (metadata?.importance && typeof metadata.importance === 'number') {
          totalImportance += metadata.importance
          importanceCount++
        }
      })

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }))

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }))

      const averageImportance = importanceCount > 0 ? totalImportance / importanceCount : 0

      res.status(200).json({
        success: true,
        data: {
          totalMemories: memories.length,
          topTopics,
          topCategories,
          sentimentDistribution: sentimentCounts,
          sourceDistribution: sourceCounts,
          averageImportance: Math.round(averageImportance * 10) / 10,
          insights: {
            mostActiveCategory: topCategories[0]?.category || 'N/A',
            mostCommonTopic: topTopics[0]?.topic || 'N/A',
            dominantSentiment:
              Object.entries(sentimentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral',
          },
        },
      })
    } catch (error) {
      logger.error('Error getting memory insights:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  static async healthCheck(req: Request, res: Response) {
    try {
      res.status(200).json({ success: true, message: 'OK', timestamp: new Date().toISOString() })
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: error.message,
      })
    }
  }

  static async debugMemories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        })
      }

      const userId = req.user.id

      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          title: true,
          url: true,
          source: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      })

      res.status(200).json({
        success: true,
        data: {
          user_id: userId,
          total_memories: memories.length,
          recent_memories: memories,
        },
      })
    } catch (error) {
      logger.error('Debug memories error:', error)
      res.status(500).json({
        success: false,
        error: 'Debug failed',
      })
    }
  }

  static async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'Memory ID is required',
        })
      }

      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        })
      }

      if (memory.user_id !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this memory',
        })
      }

      const domain = memory.url ? privacyService.extractDomain(memory.url) : undefined

      // Delete from Qdrant
      try {
        const { qdrantClient, COLLECTION_NAME } = await import('../lib/qdrant.lib')
        await qdrantClient.delete(COLLECTION_NAME, {
          filter: {
            must: [{ key: 'memory_id', match: { value: memoryId } }],
          },
        })
        logger.log('[memory/delete] qdrant_deleted', { memoryId })
      } catch (qdrantError) {
        logger.warn('[memory/delete] qdrant_delete_failed', {
          error: qdrantError instanceof Error ? qdrantError.message : String(qdrantError),
          memoryId,
        })
        // Continue with deletion even if Qdrant delete fails
      }

      // Clear search cache entries that might reference this memory
      try {
        const { getRedisClient } = await import('../lib/redis.lib')
        const redis = getRedisClient()
        // Get all cache keys (this is a simple approach - in production you might want a more efficient method)
        const keys = await redis.keys('search_cache:*')
        for (const key of keys) {
          const cached = await redis.get(key)
          if (cached) {
            try {
              const data = JSON.parse(cached)
              if (data.results && Array.isArray(data.results)) {
                const hasMemory = data.results.some((r: any) => r.memory_id === memoryId)
                if (hasMemory) {
                  await redis.del(key)
                  logger.log('[memory/delete] cache_cleared', { key, memoryId })
                }
              }
            } catch {
              // Invalid cache entry, skip
            }
          }
        }
      } catch (cacheError) {
        logger.warn('[memory/delete] cache_clear_failed', {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
          memoryId,
        })
        // Continue with deletion even if cache clear fails
      }

      // Delete from database
      await prisma.memory.delete({
        where: { id: memoryId },
      })

      // Log audit event
      auditLogService
        .logMemoryDelete(req.user!.id, memoryId, domain, {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        })
        .catch(err => {
          logger.warn('[memory/delete] audit_log_failed', {
            error: err instanceof Error ? err.message : String(err),
          })
        })

      res.status(200).json({
        success: true,
        message: 'Memory deleted successfully',
        data: {
          memoryId,
        },
      })
    } catch (error) {
      logger.error('Error deleting memory:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete memory',
      })
    }
  }

  static async redactMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params
      const { fields } = req.body

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'Memory ID is required',
        })
      }

      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Fields to redact are required (array of: url, content, title, summary)',
        })
      }

      const validFields = ['url', 'content', 'title', 'summary']
      const invalidFields = fields.filter(f => !validFields.includes(f))
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid fields: ${invalidFields.join(', ')}. Valid fields are: ${validFields.join(', ')}`,
        })
      }

      const redacted = await memoryRedactionService.redactMemoryFields(
        req.user!.id,
        memoryId,
        fields,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      )

      res.status(200).json({
        success: true,
        message: 'Memory fields redacted successfully',
        data: {
          memoryId: redacted.id,
          fieldsRedacted: fields,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to redact memory'
      logger.error('Error redacting memory:', error)
      res.status(500).json({
        success: false,
        error: errorMessage,
      })
    }
  }

  static async redactDomainMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const { domain, fields } = req.body

      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Domain is required',
        })
      }

      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Fields to redact are required (array of: url, content, title, summary)',
        })
      }

      const validFields = ['url', 'content', 'title', 'summary']
      const invalidFields = fields.filter(f => !validFields.includes(f))
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid fields: ${invalidFields.join(', ')}. Valid fields are: ${validFields.join(', ')}`,
        })
      }

      const result = await memoryRedactionService.redactDomainMemories(
        req.user!.id,
        domain,
        fields,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      )

      res.status(200).json({
        success: true,
        message: 'Domain memories redacted successfully',
        data: result,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to redact domain memories'
      logger.error('Error redacting domain memories:', error)
      res.status(500).json({
        success: false,
        error: errorMessage,
      })
    }
  }
}
