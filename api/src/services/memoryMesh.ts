import { prisma } from '../lib/prisma'
import { aiProvider } from './aiProvider'
import { UMAP } from 'umap-js'
import { qdrantClient, COLLECTION_NAME, ensureCollection, EMBEDDING_DIMENSION } from '../lib/qdrant'
import { randomUUID } from 'crypto'
import { logger } from '../utils/logger'
import { GEMINI_EMBED_MODEL } from './gemini'

export class MemoryMeshService {
  private relationshipCache = new Map<string, any>()
  private cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    // Clean cache every hour
    setInterval(() => this.cleanCache(), 60 * 60 * 1000)
    // Ensure Qdrant collection exists on startup
    ensureCollection().catch(error => {
      logger.error('Failed to ensure Qdrant collection:', error)
    })
  }

  private cleanCache(): void {
    const now = Date.now()
    for (const [key, value] of this.relationshipCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.relationshipCache.delete(key)
      }
    }
  }
  async generateEmbeddingsForMemory(memoryId: string): Promise<void> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`)
      }

      const embeddingPromises = []

      if (memory.content) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.user_id, memory.content, 'content')
        )
      }

      if (memory.summary) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.user_id, memory.summary, 'summary')
        )
      }

      if (memory.title) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.user_id, memory.title, 'title')
        )
      }

      await Promise.all(embeddingPromises)
    } catch (error) {
      logger.error(`Error generating embeddings for memory ${memoryId}:`, error)
      throw error
    }
  }

  private async createEmbedding(
    memoryId: string,
    userId: string,
    text: string,
    type: string
  ): Promise<void> {
    try {
      await ensureCollection()
      const embeddingResult = await aiProvider.generateEmbedding(text)
      const embedding: number[] =
        typeof embeddingResult === 'object' && 'embedding' in embeddingResult
          ? (embeddingResult as any).embedding
          : (embeddingResult as number[])

      const pointId = randomUUID()
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              memory_id: memoryId,
              user_id: userId,
              embedding_type: type,
              model_name: GEMINI_EMBED_MODEL,
              created_at: new Date().toISOString(),
            },
          },
        ],
      })
    } catch (error) {
      logger.error(`Error creating ${type} embedding for memory ${memoryId}:`, error)
      throw error
    }
  }

  async findRelatedMemories(memoryId: string, userId: string, limit: number = 5): Promise<any[]> {
    try {
      await ensureCollection()

      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory) {
        return []
      }

      const contentEmbeddingResult = await qdrantClient.search(COLLECTION_NAME, {
        vector: new Array(EMBEDDING_DIMENSION).fill(0),
        filter: {
          must: [
            { key: 'memory_id', match: { value: memoryId } },
            { key: 'embedding_type', match: { value: 'content' } },
          ],
        },
        limit: 1,
        with_payload: true,
        with_vector: true,
        score_threshold: 0,
      })

      if (!contentEmbeddingResult || contentEmbeddingResult.length === 0) {
        return []
      }

      const contentEmbeddingPoint = contentEmbeddingResult[0]
      if (!contentEmbeddingPoint.vector || !Array.isArray(contentEmbeddingPoint.vector)) {
        return []
      }

      const similarMemories = await this.findSimilarMemories(
        contentEmbeddingPoint.vector as number[],
        userId,
        memoryId,
        limit,
        undefined,
        memory
      )

      return similarMemories
    } catch (error) {
      logger.error(`Error finding related memories for ${memoryId}:`, error)
      throw error
    }
  }

  private async findSimilarMemories(
    queryVector: number[],
    userId: string,
    excludeMemoryId: string,
    limit: number,
    preFilteredMemoryIds?: string[],
    baseMemory?: any
  ): Promise<any[]> {
    try {
      await ensureCollection()

      const filter: any = {
        must: [
          { key: 'embedding_type', match: { value: 'content' } },
          { key: 'user_id', match: { value: userId } },
        ],
        must_not: [{ key: 'memory_id', match: { value: excludeMemoryId } }],
      }

      if (preFilteredMemoryIds && preFilteredMemoryIds.length > 0) {
        const filteredIds = preFilteredMemoryIds.filter(id => id !== excludeMemoryId)
        if (filteredIds.length > 0) {
          filter.must.push({ key: 'memory_id', match: { any: filteredIds } })
        } else {
          return []
        }
      }

      const searchResult = await qdrantClient.search(COLLECTION_NAME, {
        vector: queryVector,
        filter,
        limit: limit * 3,
        with_payload: true,
      })

      if (!searchResult || searchResult.length === 0) {
        return []
      }

      const memoryIds = searchResult
        .map(result => result.payload?.memory_id as string)
        .filter((id): id is string => !!id && id !== excludeMemoryId)

      if (memoryIds.length === 0) {
        return []
      }

      const memories = await prisma.memory.findMany({
        where: {
          id: { in: memoryIds },
        },
      })

      const memoryMap = new Map(memories.map(m => [m.id, m]))

      const baseHost = (() => {
        try {
          return baseMemory?.url ? new URL(baseMemory.url).hostname : ''
        } catch {
          return ''
        }
      })()
      const baseIsGoogleMeet = /(^|\.)meet\.google\.com$/i.test(baseHost)
      const baseIsGitHub = /^github\.com$/i.test(baseHost)
      const baseTopics: string[] = baseMemory?.page_metadata?.topics || []

      const similarities = searchResult
        .map(result => {
          const memoryId = result.payload?.memory_id as string
          const memory = memoryMap.get(memoryId)
          if (!memory) return null

          let similarity = result.score || 0

          const candidateHost = (() => {
            try {
              return memory.url ? new URL(memory.url).hostname : ''
            } catch {
              return ''
            }
          })()
          const candidateIsGoogleMeet = /(^|\.)meet\.google\.com$/i.test(candidateHost)
          const candidateIsGitHub = /^github\.com$/i.test(candidateHost)
          const candidateTopics: string[] = (memory.page_metadata as any)?.topics || []

          if ((baseIsGoogleMeet && candidateIsGitHub) || (baseIsGitHub && candidateIsGoogleMeet)) {
            similarity = Math.max(0, similarity - 0.4)
          }

          const hasFilecoin = (arr: string[]) => arr.some(t => /filecoin/i.test(t))
          const pathIncludesFilecoin = (urlStr?: string) => {
            if (!urlStr) return false
            try {
              return /filecoin/i.test(new URL(urlStr).pathname)
            } catch {
              return false
            }
          }
          if (baseIsGitHub && candidateIsGitHub) {
            if (hasFilecoin(baseTopics) && hasFilecoin(candidateTopics)) {
              similarity = Math.min(1, similarity + 0.2)
            } else if (pathIncludesFilecoin(baseMemory?.url) && pathIncludesFilecoin(memory.url)) {
              similarity = Math.min(1, similarity + 0.2)
            }
          }

          return { memory, similarity }
        })
        .filter((item): item is { memory: any; similarity: number } => item !== null)

      return similarities
        .filter(item => item.similarity >= 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          ...item.memory,
          similarity_score: item.similarity,
        }))
    } catch (error) {
      logger.error('Error finding similar memories:', error)
      throw error
    }
  }
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0

    let normA = 0

    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  async createMemoryRelations(memoryId: string, userId: string): Promise<void> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`)
      }

      await ensureCollection()

      const embeddingResult = await qdrantClient.search(COLLECTION_NAME, {
        vector: new Array(EMBEDDING_DIMENSION).fill(0),
        filter: {
          must: [{ key: 'memory_id', match: { value: memoryId } }],
        },
        limit: 1,
        with_payload: true,
        with_vector: true,
        score_threshold: 0,
      })

      const hasEmbeddings = embeddingResult.length > 0 && embeddingResult[0]?.payload
      const hasMetadata = !!memory.page_metadata
      const hasContent = !!memory.content
      if (!hasEmbeddings && !hasMetadata && !hasContent) {
        return
      }

      const [semanticRelations, topicalRelations, temporalRelations] = await Promise.all([
        hasEmbeddings ? this.findSemanticRelations(memoryId, userId, 12) : Promise.resolve([]),
        this.findTopicalRelations(memoryId, userId, 8),
        this.findTemporalRelations(memoryId, userId, 5),
      ])

      const allRelations = [
        ...semanticRelations.map(r => ({ ...r, relation_type: 'semantic' })),
        ...topicalRelations.map(r => ({ ...r, relation_type: 'topical' })),
        ...temporalRelations.map(r => ({ ...r, relation_type: 'temporal' })),
      ]

      const uniqueRelations = this.deduplicateRelations(allRelations)

      // Enhanced filtering: Use AI to evaluate relationship relevance
      let filteredRelations = await this.filterRelationsWithAI(memory, uniqueRelations)

      // Fallback: ensure at least a few strongest semantic relations exist
      if (filteredRelations.length === 0) {
        const strongest = uniqueRelations
          .filter(r => r.similarity_score >= 0.3)
          .sort((a, b) => b.similarity_score - a.similarity_score)
          .slice(0, 3)
          .map(r => ({ ...r, relation_type: r.relation_type || 'semantic' }))
        filteredRelations = strongest
      }

      // Clean up existing relations with low similarity scores
      await this.cleanupLowQualityRelations(memoryId)

      // Process relations with proper race condition handling
      const relationPromises = filteredRelations.map(async relatedMemory => {
        try {
          // First try to find existing relation
          const existingRelation = await prisma.memoryRelation.findUnique({
            where: {
              memory_id_related_memory_id: {
                memory_id: memoryId,
                related_memory_id: relatedMemory.id,
              },
            },
          })

          if (!existingRelation) {
            // Create new relation with error handling for race conditions
            try {
              await prisma.memoryRelation.create({
                data: {
                  memory_id: memoryId,
                  related_memory_id: relatedMemory.id,
                  similarity_score: relatedMemory.similarity_score,
                  relation_type: relatedMemory.relation_type,
                },
              })
            } catch (createError) {
              // If creation fails due to unique constraint, it means another process created it
              if (createError.code === 'P2002') {
                return
              }
              throw createError
            }
          } else {
            // Update existing relation if conditions are met
            const shouldUpdate =
              relatedMemory.similarity_score > existingRelation.similarity_score + 0.05 ||
              (relatedMemory.similarity_score > existingRelation.similarity_score &&
                this.isMoreSpecificRelationType(
                  relatedMemory.relation_type,
                  existingRelation.relation_type
                ))

            if (shouldUpdate) {
              await prisma.memoryRelation.update({
                where: { id: existingRelation.id },
                data: {
                  similarity_score: relatedMemory.similarity_score,
                  relation_type: relatedMemory.relation_type,
                },
              })
            }
          }
        } catch (error) {
          // Handle any other errors
          if (error.code === 'P2002') {
            return
          }
          throw error
        }
      })

      await Promise.all(relationPromises)
    } catch (error) {
      logger.error(`Error creating memory relations for ${memoryId}:`, error)
      throw error
    }
  }

  private async findSemanticRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    return this.findRelatedMemories(memoryId, userId, limit)
  }

  private async findTopicalRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory || !memory.page_metadata) {
        return []
      }

      const metadata = memory.page_metadata as any

      const topics = metadata.topics || []
      const categories = metadata.categories || []
      const keyPoints = metadata.keyPoints || []
      const searchableTerms = metadata.searchableTerms || []

      if (topics.length === 0 && categories.length === 0) {
        return []
      }

      // Find memories with overlapping topics or categories
      const relatedMemories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: memoryId },
          OR: [
            {
              page_metadata: {
                path: ['topics'],
                array_contains: topics,
              },
            },
            {
              page_metadata: {
                path: ['categories'],
                array_contains: categories,
              },
            },
            {
              page_metadata: {
                path: ['searchableTerms'],
                array_contains: searchableTerms,
              },
            },
          ],
        },
        take: limit * 3,
      })

      const topicalSimilarities = relatedMemories.map((relatedMemory: any) => {
        const relatedMetadata = relatedMemory.page_metadata as any

        const relatedTopics = relatedMetadata?.topics || []
        const relatedCategories = relatedMetadata?.categories || []
        const relatedKeyPoints = relatedMetadata?.keyPoints || []
        const relatedSearchableTerms = relatedMetadata?.searchableTerms || []

        // Calculate multiple types of topical overlap
        const topicOverlap = this.calculateSetOverlap(topics, relatedTopics)
        const categoryOverlap = this.calculateSetOverlap(categories, relatedCategories)
        const keyPointOverlap = this.calculateSetOverlap(keyPoints, relatedKeyPoints)
        const searchableTermOverlap = this.calculateSetOverlap(
          searchableTerms,
          relatedSearchableTerms
        )

        // Weighted similarity calculation
        const similarity =
          topicOverlap * 0.4 + // Topics are most important
          categoryOverlap * 0.3 + // Categories are second most important
          keyPointOverlap * 0.2 + // Key points provide additional context
          searchableTermOverlap * 0.1 // Searchable terms provide minimal context

        // Boost similarity if URL domains match (same website)
        let urlBoost = 0
        if (memory.url && relatedMemory.url) {
          try {
            const memoryDomain = new URL(memory.url).hostname
            const relatedDomain = new URL(relatedMemory.url).hostname
            if (memoryDomain === relatedDomain) {
              urlBoost = 0.1
            }
          } catch {
            // Invalid URLs, no boost
          }
        }

        return {
          ...relatedMemory,
          similarity_score: Math.min(1, similarity + urlBoost),
        }
      })

      return topicalSimilarities
        .filter(item => item.similarity_score >= 0.25)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit)
    } catch (error) {
      logger.error('Error finding topical relations:', error)

      return []
    }
  }

  private async findTemporalRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      })

      if (!memory) {
        return []
      }

      const memoryCreatedAt = new Date(memory.created_at)

      // Define time windows for different temporal relationships
      const oneHour = 60 * 60
      const oneDay = 24 * oneHour
      const oneWeek = 7 * oneDay
      const oneMonth = 30 * oneDay

      // Get memories within a month range
      const temporalMemories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: memoryId },
          OR: [
            // Same day (high temporal relevance)
            {
              created_at: {
                gte: new Date(memoryCreatedAt.getTime() - oneDay * 1000),
                lte: new Date(memoryCreatedAt.getTime() + oneDay * 1000),
              },
            },
            // Same week (medium temporal relevance)
            {
              created_at: {
                gte: new Date(memoryCreatedAt.getTime() - oneWeek * 1000),
                lte: new Date(memoryCreatedAt.getTime() + oneWeek * 1000),
              },
            },
            // Same month (low temporal relevance)
            {
              created_at: {
                gte: new Date(memoryCreatedAt.getTime() - oneMonth * 1000),
                lte: new Date(memoryCreatedAt.getTime() + oneMonth * 1000),
              },
            },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: limit * 3,
      })

      const temporalSimilarities = temporalMemories.map((relatedMemory: any) => {
        const timeDiff = Math.abs(relatedMemory.created_at.getTime() - memoryCreatedAt.getTime())

        let similarity = 0

        // Calculate similarity based on time proximity with exponential decay
        if (timeDiff <= oneHour * 1000) {
          // Same hour - very high similarity
          similarity = 0.9 + 0.1 * (1 - timeDiff / (oneHour * 1000))
        } else if (timeDiff <= oneDay * 1000) {
          // Same day - high similarity
          similarity = 0.7 + 0.2 * (1 - timeDiff / (oneDay * 1000))
        } else if (timeDiff <= oneWeek * 1000) {
          // Same week - medium similarity
          similarity = 0.4 + 0.3 * (1 - timeDiff / (oneWeek * 1000))
        } else if (timeDiff <= oneMonth * 1000) {
          // Same month - low similarity
          similarity = 0.1 + 0.3 * (1 - timeDiff / (oneMonth * 1000))
        }

        return {
          ...relatedMemory,
          similarity_score: Math.max(0, similarity),
        }
      })

      return temporalSimilarities
        .filter(item => item.similarity_score >= 0.2)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit)
    } catch (error) {
      logger.error('Error finding temporal relations:', error)

      return []
    }
  }
  private calculateSetOverlap(setA: string[], setB: string[]): number {
    if (setA.length === 0 || setB.length === 0) return 0

    const intersection = setA.filter(item => setB.includes(item))

    const union = [...new Set([...setA, ...setB])]

    return intersection.length / union.length
  }

  private async cleanupLowQualityRelations(memoryId: string): Promise<void> {
    try {
      // Remove relations with very low similarity scores
      await prisma.memoryRelation.deleteMany({
        where: {
          memory_id: memoryId,
          similarity_score: { lt: 0.3 }, // Higher threshold for cleanup
        },
      })

      // Keep only the top 10 relations per memory to avoid clutter
      const relations = await prisma.memoryRelation.findMany({
        where: { memory_id: memoryId },
        orderBy: { similarity_score: 'desc' },
        skip: 10,
      })

      if (relations.length > 0) {
        await prisma.memoryRelation.deleteMany({
          where: {
            id: { in: relations.map(r => r.id) },
          },
        })
      }

      // Also clean up relations that are too old (older than 30 days) with low scores
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      await prisma.memoryRelation.deleteMany({
        where: {
          memory_id: memoryId,
          similarity_score: { lt: 0.4 },
          created_at: { lt: thirtyDaysAgo },
        },
      })
    } catch (error) {
      logger.error('Error cleaning up low quality relations:', error)
    }
  }

  private isMoreSpecificRelationType(newType: string, existingType: string): boolean {
    // Define hierarchy of relation types (more specific to less specific)
    const typeHierarchy: Record<string, number> = {
      semantic: 3,
      topical: 2,
      temporal: 1,
    }

    return (typeHierarchy[newType] || 0) > (typeHierarchy[existingType] || 0)
  }
  private async filterRelationsWithAI(memory: any, relations: any[]): Promise<any[]> {
    try {
      // Much more efficient approach: Only use AI for edge cases and high-value decisions

      // 1. First, apply strict mathematical filtering
      const highConfidenceRelations = relations.filter(r => r.similarity_score >= 0.7)
      const mediumConfidenceRelations = relations.filter(
        r => r.similarity_score >= 0.5 && r.similarity_score < 0.7
      )
      const lowConfidenceRelations = relations.filter(
        r => r.similarity_score >= 0.4 && r.similarity_score < 0.5
      )

      // 2. Always include high confidence relations (no AI needed)
      const filteredRelations = [...highConfidenceRelations]

      // 3. For medium confidence, use smart heuristics instead of AI
      const heuristicFiltered = this.applySmartHeuristics(memory, mediumConfidenceRelations)
      filteredRelations.push(...heuristicFiltered)

      // 4. Only use AI for low confidence relations that might be valuable
      const aiCandidates = lowConfidenceRelations
        .filter(r => this.shouldEvaluateWithAI(memory, r))
        .slice(0, 3) // Very limited AI evaluation

      if (aiCandidates.length > 0) {
        const aiEvaluated = await this.batchEvaluateWithAI(memory, aiCandidates)
        filteredRelations.push(...aiEvaluated)
      }

      return filteredRelations.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 8) // Limit final relations per memory
    } catch (error) {
      logger.error('Error filtering relations with AI:', error)
      // Fallback to high similarity threshold
      return relations
        .filter(r => r.similarity_score >= 0.6)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, 6)
    }
  }

  private applySmartHeuristics(memory: any, relations: any[]): any[] {
    return relations.filter(relation => {
      const memoryTopics = memory.page_metadata?.topics || []
      const memoryCategories = memory.page_metadata?.categories || []
      const relationTopics = relation.page_metadata?.topics || []
      const relationCategories = relation.page_metadata?.categories || []

      // Strong topic overlap
      const topicOverlap = memoryTopics.filter((topic: string) =>
        relationTopics.includes(topic)
      ).length
      const categoryOverlap = memoryCategories.filter((cat: string) =>
        relationCategories.includes(cat)
      ).length

      // Same domain boost
      let domainBoost = 0
      if (memory.url && relation.url) {
        try {
          const memoryDomain = new URL(memory.url).hostname
          const relationDomain = new URL(relation.url).hostname
          if (memoryDomain === relationDomain) {
            domainBoost = 0.1
          }
        } catch {
          // Invalid URLs, no boost
        }
      }

      // Heuristic scoring
      const heuristicScore =
        (topicOverlap / Math.max(memoryTopics.length, 1)) * 0.6 +
        (categoryOverlap / Math.max(memoryCategories.length, 1)) * 0.3 +
        domainBoost

      return heuristicScore >= 0.3
    })
  }

  private shouldEvaluateWithAI(memory: any, relation: any): boolean {
    // Only evaluate with AI if:
    // 1. Both memories have rich metadata
    // 2. There's some topical overlap but unclear relationship
    // 3. Similar creation time (might be related contextually)

    const memoryTopics = memory.page_metadata?.topics || []
    const relationTopics = relation.page_metadata?.topics || []
    const hasTopicOverlap = memoryTopics.some((topic: string) => relationTopics.includes(topic))

    const timeDiff = Math.abs(
      new Date(memory.created_at).getTime() - new Date(relation.created_at).getTime()
    )
    const isRecentPair = timeDiff < 7 * 24 * 60 * 60 * 1000 // Within a week

    return hasTopicOverlap && isRecentPair && memoryTopics.length >= 3 && relationTopics.length >= 3
  }

  private async batchEvaluateWithAI(memory: any, candidates: any[]): Promise<any[]> {
    try {
      // Batch evaluation to reduce API calls
      const memoryA = {
        title: memory.title,
        summary: memory.summary,
        topics: memory.page_metadata?.topics || [],
        categories: memory.page_metadata?.categories || [],
      }

      const batchData = candidates.map(candidate => ({
        id: candidate.id,
        memoryB: {
          title: candidate.title,
          summary: candidate.summary,
          topics: candidate.page_metadata?.topics || [],
          categories: candidate.page_metadata?.categories || [],
        },
      }))

      // Single API call to evaluate multiple relationships
      const evaluations = await this.batchEvaluateRelationships(memoryA, batchData)

      return candidates
        .filter((candidate, index) => {
          const evaluation = evaluations[index]
          return evaluation && evaluation.isRelevant && evaluation.relevanceScore >= 0.3
        })
        .map((candidate, index) => ({
          ...candidate,
          similarity_score: Math.min(
            1,
            candidate.similarity_score * evaluations[index].relevanceScore
          ),
          relation_type:
            evaluations[index].relationshipType !== 'none'
              ? evaluations[index].relationshipType
              : candidate.relation_type,
        }))
    } catch (error) {
      logger.error('Error in batch AI evaluation:', error)
      return []
    }
  }

  private async batchEvaluateRelationships(memoryA: any, batchData: any[]): Promise<any[]> {
    if (!aiProvider.isInitialized) {
      return batchData.map(() => ({
        isRelevant: false,
        relevanceScore: 0,
        relationshipType: 'none',
        reasoning: 'AI not available',
      }))
    }

    try {
      // Check cache first
      const results = []
      const uncachedCandidates = []
      const uncachedIndices = []

      for (let i = 0; i < batchData.length; i++) {
        const candidate = batchData[i]
        const cacheKey = this.getCacheKey(memoryA, candidate)
        const cached = this.relationshipCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
          results[i] = cached.evaluation
        } else {
          uncachedCandidates.push(candidate)
          uncachedIndices.push(i)
        }
      }

      // Only call AI for uncached candidates
      if (uncachedCandidates.length > 0) {
        const aiResults = await this.callAIForBatch(memoryA, uncachedCandidates)

        // Store in cache and results
        for (let i = 0; i < uncachedCandidates.length; i++) {
          const candidate = uncachedCandidates[i]
          const resultIndex = uncachedIndices[i]
          const evaluation = aiResults[i]

          const cacheKey = this.getCacheKey(memoryA, candidate)
          this.relationshipCache.set(cacheKey, {
            evaluation,
            timestamp: Date.now(),
          })

          results[resultIndex] = evaluation
        }
      }

      return results
    } catch (error) {
      logger.error('Error in batch relationship evaluation:', error)
      return batchData.map(() => ({
        isRelevant: false,
        relevanceScore: 0,
        relationshipType: 'none',
        reasoning: 'Evaluation failed',
      }))
    }
  }

  private getCacheKey(memoryA: any, candidate: any): string {
    // Create a stable cache key based on memory IDs and content hashes
    const memoryAId = memoryA.id || 'unknown'
    const candidateId = candidate.id || 'unknown'
    const memoryATopics = (memoryA.topics || []).sort().join(',')
    const candidateTopics = (candidate.memoryB?.topics || []).sort().join(',')

    return `${memoryAId}:${candidateId}:${memoryATopics}:${candidateTopics}`
  }

  private async callAIForBatch(memoryA: any, batchData: any[]): Promise<any[]> {
    try {
      const prompt = `Evaluate relationships between a source memory and multiple candidate memories. Return a JSON array with evaluation results.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

Source Memory:
Title: ${memoryA.title || 'N/A'}
Summary: ${memoryA.summary || 'N/A'}
Topics: ${memoryA.topics?.join(', ') || 'N/A'}
Categories: ${memoryA.categories?.join(', ') || 'N/A'}

Candidate Memories:
${batchData
  .map(
    (item, index) => `
${index + 1}. Memory ID: ${item.id}
   Title: ${item.memoryB.title || 'N/A'}
   Summary: ${item.memoryB.summary || 'N/A'}
   Topics: ${item.memoryB.topics?.join(', ') || 'N/A'}
   Categories: ${item.memoryB.categories?.join(', ') || 'N/A'}
`
  )
  .join('')}

Return a JSON array with one object per candidate memory:
[
  {
    "isRelevant": boolean,
    "relevanceScore": number (0-1),
    "relationshipType": string,
    "reasoning": string
  }
]

Be strict about relevance - only mark as relevant if there's substantial conceptual or topical connection.`

      const responseResult = await aiProvider.generateContent(prompt)
      const response =
        typeof responseResult === 'string'
          ? responseResult
          : (responseResult as any).text || responseResult

      if (!response) {
        throw new Error('No batch evaluation generated from Gemini API')
      }

      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Invalid JSON array response from Gemini API')
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      logger.error('Error in AI batch evaluation:', error)
      return batchData.map(() => ({
        isRelevant: false,
        relevanceScore: 0,
        relationshipType: 'none',
        reasoning: 'Evaluation failed',
      }))
    }
  }

  private deduplicateRelations(relations: any[]): any[] {
    const seen = new Map<string, any>()

    return relations.filter(relation => {
      const key = relation.id
      const existingRelation = seen.get(key)

      if (existingRelation) {
        // Keep the relation with higher similarity score
        if (relation.similarity_score > existingRelation.similarity_score) {
          seen.set(key, relation)
          return true
        }
        return false
      }

      seen.set(key, relation)
      return true
    })
  }

  private pruneEdgesMutualKNN(edges: any[], k: number, similarityThreshold: number): any[] {
    // Build adjacency lists with weighted scores
    const bySource = new Map<string, any[]>()
    const edgeMap = new Map<string, any>()

    const weightForType: Record<string, number> = {
      semantic: 0.05,
      topical: 0.02,
      temporal: 0,
    }

    const keyFor = (a: string, b: string) => (a < b ? `${a}__${b}` : `${b}__${a}`)

    edges.forEach((e: any) => {
      if (e.source === e.target) return
      // Weighted score to gently prioritize semantic links
      const weighted = (e.similarity_score || 0) + (weightForType[e.relation_type] || 0)
      if (weighted < similarityThreshold) return

      if (!bySource.has(e.source)) bySource.set(e.source, [])
      if (!bySource.has(e.target)) bySource.set(e.target, [])

      bySource.get(e.source)!.push({ ...e, weighted })
      bySource.get(e.target)!.push({ ...e, source: e.target, target: e.source, weighted })

      edgeMap.set(keyFor(e.source, e.target), e)
    })

    // Keep top-k per node
    const topKPerNode = new Map<string, Set<string>>()
    for (const [node, list] of bySource.entries()) {
      const top = list
        .sort((a, b) => (b.weighted as number) - (a.weighted as number))
        .slice(0, k)
        .map(e => e.target as string)
      topKPerNode.set(node, new Set(top))
    }

    // Mutual condition: A in topK(B) and B in topK(A)
    const kept = new Map<string, any>()
    for (const e of edges) {
      if (e.source === e.target) continue
      const aTop = topKPerNode.get(e.source)
      const bTop = topKPerNode.get(e.target)
      if (!aTop || !bTop) continue
      if (!aTop.has(e.target) || !bTop.has(e.source)) continue
      const kkey = keyFor(e.source, e.target)
      const existing = kept.get(kkey)
      if (!existing || (e.similarity_score || 0) > (existing.similarity_score || 0)) {
        kept.set(kkey, e)
      }
    }

    // Degree cap to avoid hubs
    const degreeCap = Math.max(2, Math.min(5, k + 1))
    const degree = new Map<string, number>()
    const finalEdges: any[] = []
    const sorted = Array.from(kept.values()).sort(
      (a, b) => (b.similarity_score || 0) - (a.similarity_score || 0)
    )

    for (const e of sorted) {
      const da = degree.get(e.source) || 0
      const db = degree.get(e.target) || 0
      if (da >= degreeCap || db >= degreeCap) continue
      finalEdges.push(e)
      degree.set(e.source, da + 1)
      degree.set(e.target, db + 1)
    }

    return finalEdges
  }

  private getSourceOffset(source: string): { x: number; y: number } {
    // Create natural clusters based on source type
    const offsets: { [key: string]: { x: number; y: number } } = {
      extension: { x: -300, y: -200 },
      github: { x: 200, y: -100 },
      meet: { x: -200, y: 300 },
      default: { x: 0, y: 0 },
    }

    return offsets[source] || offsets.default
  }

  private applyForceDirectedLayout(nodes: any[], edges: any[]): any[] {
    // Improved force-directed layout with non-circular constraints
    const iterations = 150
    const k = 400 // Spring constant
    const c = 0.008 // Damping factor
    const maxForce = 50 // Limit maximum force to prevent wild movements

    // Initialize forces
    const forces = new Map<string, { x: number; y: number }>()
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Reset forces
      forces.forEach(force => {
        force.x = 0
        force.y = 0
      })

      // Repulsive forces between all nodes (weaker to avoid circular formation)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          // Weaker repulsive force to allow more natural clustering
          const force = Math.min((k * k) / (distance * 1.5), maxForce)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          forces.get(nodeA.id)!.x += fx
          forces.get(nodeA.id)!.y += fy
          forces.get(nodeB.id)!.x -= fx
          forces.get(nodeB.id)!.y -= fy
        }
      }

      // Stronger attractive forces for connected nodes
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x
          const dy = targetNode.y - sourceNode.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          // Stronger attractive force to pull related nodes together
          const force = Math.min((distance * distance) / (k * 0.8), maxForce)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          forces.get(sourceNode.id)!.x += fx
          forces.get(sourceNode.id)!.y += fy
          forces.get(targetNode.id)!.x -= fx
          forces.get(targetNode.id)!.y -= fy
        }
      })

      // Apply forces with adaptive damping
      const adaptiveDamping = c * (1 - iter / iterations) // Reduce damping over time
      nodes.forEach(node => {
        const force = forces.get(node.id)!
        node.x += Math.max(-maxForce, Math.min(maxForce, force.x)) * adaptiveDamping
        node.y += Math.max(-maxForce, Math.min(maxForce, force.y)) * adaptiveDamping

        // Keep nodes within rectangular bounds instead of circular
        const maxX = 1200
        const maxY = 800
        node.x = Math.max(-maxX, Math.min(maxX, node.x))
        node.y = Math.max(-maxY, Math.min(maxY, node.y))
      })
    }

    return nodes
  }

  private async computeLatentSpaceProjection(
    memories: any[]
  ): Promise<Map<string, { x: number; y: number; z: number }>> {
    try {
      await ensureCollection()

      if (memories.length < 3) {
        return new Map()
      }

      const memoryIds = memories.map(m => m.id)
      const userId = memories.length > 0 ? memories[0].user_id : undefined

      const filter: any = {
        must: [
          { key: 'memory_id', match: { any: memoryIds } },
          { key: 'embedding_type', match: { value: 'content' } },
        ],
      }

      if (userId) {
        filter.must.push({ key: 'user_id', match: { value: userId } })
      }

      const embeddingResult = await qdrantClient.scroll(COLLECTION_NAME, {
        filter,
        limit: memoryIds.length * 3,
        with_payload: true,
        with_vector: true,
      })

      if (!embeddingResult.points || embeddingResult.points.length < 3) {
        return new Map()
      }

      let embeddingData: { id: string; vector: number[] }[] = []
      for (const point of embeddingResult.points) {
        const memoryId = point.payload?.memory_id as string
        if (memoryId && point.vector && Array.isArray(point.vector)) {
          embeddingData.push({ id: memoryId, vector: point.vector as number[] })
        }
      }

      if (embeddingData.length < 3) {
        return new Map()
      }

      embeddingData = embeddingData.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

      const embeddingMatrix = embeddingData.map(e => e.vector)

      const makeSeed = (ids: string[]): number => {
        let h = 2166136261
        for (const id of ids) {
          for (let i = 0; i < id.length; i++) {
            h ^= id.charCodeAt(i)
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
          }
        }
        return h >>> 0
      }
      const mulberry32 = (seed: number) => () => {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const seededRandom = mulberry32(makeSeed(embeddingData.map(e => e.id)))

      const umap = new UMAP({
        nComponents: 3,
        nEpochs: 400,
        nNeighbors: Math.min(10, Math.max(3, Math.floor(embeddingMatrix.length / 3))),
        minDist: 0.1,
        spread: 1.5,
        random: seededRandom,
      })

      const projection = umap.fit(embeddingMatrix)

      const coords = projection.map(p => ({ x: p[0], y: p[1], z: p[2] ?? 0 }))

      const xCoords = coords.map(c => c.x)
      const yCoords = coords.map(c => c.y)
      const xMin = Math.min(...xCoords)
      const xMax = Math.max(...xCoords)
      const yMin = Math.min(...yCoords)
      const yMax = Math.max(...yCoords)
      const zCoords = coords.map(c => c.z)
      const zMin = Math.min(...zCoords)
      const zMax = Math.max(...zCoords)

      const scale = 1200
      const normalized = coords.map(c => ({
        x: ((c.x - xMin) / (xMax - xMin || 1) - 0.5) * scale,
        y: ((c.y - yMin) / (yMax - yMin || 1) - 0.5) * scale,
        z: ((c.z - zMin) / (zMax - zMin || 1) - 0.5) * (scale * 0.6),
      }))

      const coordMap = new Map<string, { x: number; y: number; z: number }>()
      embeddingData.forEach((data, index) => {
        coordMap.set(data.id, normalized[index])
      })

      return coordMap
    } catch (error) {
      logger.error('Error computing latent space projection:', error)
      return new Map()
    }
  }

  async getMemoryMesh(
    userId?: string,
    limit: number = 50,
    similarityThreshold: number = 0.4
  ): Promise<any> {
    try {
      const memories = await prisma.memory.findMany({
        where: userId ? { user_id: userId } : {},
        include: {
          related_memories: {
            where: {
              similarity_score: {
                gte: similarityThreshold,
              },
            },
            include: {
              related_memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                  source: true,
                  timestamp: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
            take: 10,
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      const latentCoords = await this.computeLatentSpaceProjection(memories)

      const nodes = memories.map((memory: any, index: number) => {
        let x, y, z

        if (latentCoords.has(memory.id)) {
          const coords = latentCoords.get(memory.id)!
          x = coords.x
          y = coords.y
          z = (coords as any).z ?? 0
        } else {
          const gridSize = Math.ceil(Math.sqrt(memories.length))
          const row = Math.floor(index / gridSize)
          const col = index % gridSize
          const jitter = (seed: string, salt: string) => {
            let h = 2166136261
            const s = seed + '|' + salt
            for (let i = 0; i < s.length; i++) {
              h ^= s.charCodeAt(i)
              h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
            }
            return ((h >>> 0) % 1000) / 1000 - 0.5
          }
          const jx = jitter(memory.id, 'x')
          const jy = jitter(memory.id, 'y')
          x = (col - gridSize / 2) * 200 + jx * 100
          y = (row - gridSize / 2) * 200 + jy * 100
          const jz = jitter(memory.id, 'z')
          z = jz * 300
        }

        return {
          id: memory.id,
          type: memory.source || 'extension',
          label: memory.title || memory.summary?.substring(0, 20) || 'Memory',
          memory_id: memory.id,
          title: memory.title,
          summary: memory.summary,
          importance_score: memory.importance_score || memory.related_memories.length / 10,
          x,
          y,
          hasEmbedding: latentCoords.has(memory.id),
          z,
          clusterId: undefined as number | undefined,
          layout: {
            isLatentSpace: latentCoords.has(memory.id),
            cluster: memory.source || 'extension',
            centrality: memory.related_memories.length,
          },
        }
      })

      const rawEdges: any[] = []

      const getDomain = (url?: string | null) => {
        try {
          if (!url) return null
          const u = new URL(url)
          return u.hostname.replace(/^www\./, '')
        } catch {
          return null
        }
      }

      const nodeCount = nodes.length
      const k = Math.min(8, Math.max(3, Math.floor(Math.sqrt(Math.max(1, nodeCount)))))
      const minDegree = Math.min(3, Math.max(1, Math.floor(k / 2)))

      const nodeIdToDomain = new Map<string, string | null>(
        nodes.map(n => [n.id, getDomain((n as any).url)])
      )
      const nodeIdToSource = new Map<string, string | null>(
        nodes.map(n => [n.id, (n as any).type || null])
      )
      const nodeIdToTimestamp = new Map<string, number | null>(
        nodes.map(n => [n.id, (n as any).timestamp ? Number((n as any).timestamp) : null])
      )

      // First pass: collect all distances to calculate proper maxDistance
      const allDistances: number[] = []
      const nodeDistancesMap = new Map<string, Array<{ targetId: string; distance: number }>>()

      nodes.forEach((node, i) => {
        if (!latentCoords.has(node.id)) return

        const nodeCoord = latentCoords.get(node.id)!
        const distances: Array<{ targetId: string; distance: number }> = []

        nodes.forEach((otherNode, j) => {
          if (i === j) return
          if (!latentCoords.has(otherNode.id)) return

          const otherCoord = latentCoords.get(otherNode.id)!
          const dx = nodeCoord.x - otherCoord.x
          const dy = nodeCoord.y - otherCoord.y
          const dz = ((nodeCoord as any).z ?? 0) - ((otherCoord as any).z ?? 0)
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
          distances.push({ targetId: otherNode.id, distance })
          allDistances.push(distance)
        })

        distances.sort((a, b) => a.distance - b.distance)
        nodeDistancesMap.set(node.id, distances)
      })

      // Calculate maxDistance from actual distances (use 95th percentile to avoid outliers)
      allDistances.sort((a, b) => a - b)
      const percentile95 = Math.floor(allDistances.length * 0.95)
      const maxDistance = allDistances[percentile95] || Math.max(...allDistances, 1)

      // Second pass: calculate similarity scores
      nodes.forEach((node) => {
        if (!latentCoords.has(node.id)) return

        const distances = nodeDistancesMap.get(node.id)!
        if (!distances) return

        const nearest = distances.slice(0, k)
        const chosen = nearest.length >= minDegree ? nearest : distances.slice(0, minDegree)

        chosen.forEach(({ targetId, distance }) => {
          // Use inverse distance with proper scaling - closer nodes get higher similarity
          // Normalize to 0-1 range, then apply non-linear scaling for better distribution
          const normalizedDist = Math.min(1, distance / maxDistance)
          const baseSim = Math.pow(1 - normalizedDist, 1.5)

          let boost = 0
          const srcA = nodeIdToSource.get(node.id)
          const srcB = nodeIdToSource.get(targetId)
          if (srcA && srcB && srcA === srcB) boost += 0.02

          const domA = nodeIdToDomain.get(node.id)
          const domB = nodeIdToDomain.get(targetId)
          if (domA && domB && domA === domB) boost += 0.03

          const tsA = nodeIdToTimestamp.get(node.id)
          const tsB = nodeIdToTimestamp.get(targetId)
          if (tsA && tsB) {
            const dt = Math.abs(tsA - tsB)
            if (dt <= 60 * 60) boost += 0.02
            else if (dt <= 24 * 60 * 60) boost += 0.015
            else if (dt <= 7 * 24 * 60 * 60) boost += 0.01
          }

          const similarityScore = Math.max(0, Math.min(1, baseSim + boost))
          if (similarityScore < 0.05) return

          rawEdges.push({
            source: node.id,
            target: targetId,
            relation_type: 'semantic',
            similarity_score: similarityScore,
            distance,
          })
        })
      })

      const edgeMap = new Map<string, any>()
      rawEdges.forEach(edge => {
        const key = [edge.source, edge.target].sort().join('_')
        const existing = edgeMap.get(key)
        if (!existing || edge.similarity_score > existing.similarity_score) {
          edgeMap.set(key, edge)
        }
      })

      let edges = Array.from(edgeMap.values()).filter(e => e.similarity_score >= 0.05)

      // Sort by similarity to prioritize strong connections
      edges.sort((a, b) => b.similarity_score - a.similarity_score)

      // Per-node degree control - simple top-k selection
      const degreeMap = new Map<string, number>()
      const incrementDegree = (id: string) => degreeMap.set(id, (degreeMap.get(id) || 0) + 1)

      const maxDegree = Math.min(12, Math.max(5, Math.floor(k * 2)))

      const finalEdges: any[] = []
      const addedEdges = new Set<string>()

      // Simple filtering: take top edges respecting maxDegree per node
      for (const edge of edges) {
        const edgeKey = [edge.source, edge.target].sort().join('_')
        if (addedEdges.has(edgeKey)) continue

        const dA = degreeMap.get(edge.source) || 0
        const dB = degreeMap.get(edge.target) || 0

        if (dA < maxDegree && dB < maxDegree) {
          finalEdges.push(edge)
          addedEdges.add(edgeKey)
          incrementDegree(edge.source)
          incrementDegree(edge.target)
        }
      }

      edges = finalEdges

      // Ensure minimum degree by adding closest edges if needed
      const idToNeighbors = new Map<string, any[]>(nodes.map(n => [n.id, [] as any[]]))
      edges.forEach(e => {
        idToNeighbors.get(e.source)!.push(e)
        idToNeighbors.get(e.target)!.push({ ...e, source: e.target, target: e.source })
      })
      nodes.forEach(n => {
        const deg = (idToNeighbors.get(n.id) || []).length
        if (deg >= minDegree || !latentCoords.has(n.id)) return
        // find closest candidates not already connected
        const nCoord = latentCoords.get(n.id)!
        const currentlyConnected = new Set((idToNeighbors.get(n.id) || []).map(e => e.target))
        const candidates = nodes
          .filter(o => o.id !== n.id && latentCoords.has(o.id) && !currentlyConnected.has(o.id))
          .map(o => {
            const oCoord = latentCoords.get(o.id)!
            const dx = nCoord.x - oCoord.x
            const dy = nCoord.y - oCoord.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const baseSim = Math.max(0, 1 - distance / maxDistance)
            return {
              source: n.id,
              target: o.id,
              distance,
              similarity_score: baseSim,
              relation_type: 'semantic',
            }
          })
          .sort((a, b) => a.distance - b.distance)
          .slice(0, minDegree - deg)
          .filter(c => c.similarity_score > 0.05)
        candidates.forEach(c => edges.push(c))
      })

      // No force-directed layout needed - using latent space coordinates from UMAP
      const layoutNodes = nodes

      // Create clusters based on density in latent space (DBSCAN-like)
      const clusters: { [key: string]: string[] } = {}
      const clusterAssignments = new Map<string, number>()
      let nextClusterId = 0

      // Group nodes by proximity in latent space
      const visited = new Set<string>()
      const epsilon = 250 // Distance threshold for same cluster
      const minPoints = 2 // Minimum points to form a cluster

      layoutNodes.forEach(node => {
        if (visited.has(node.id) || !latentCoords.has(node.id)) return

        visited.add(node.id)
        const nodeCoord = latentCoords.get(node.id)!

        // Find all neighbors within epsilon
        const neighbors: string[] = []
        layoutNodes.forEach(otherNode => {
          if (node.id === otherNode.id || !latentCoords.has(otherNode.id)) return

          const otherCoord = latentCoords.get(otherNode.id)!
          const dx = nodeCoord.x - otherCoord.x
          const dy = nodeCoord.y - otherCoord.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance <= epsilon) {
            neighbors.push(otherNode.id)
          }
        })

        // If we have enough neighbors, form a cluster
        if (neighbors.length >= minPoints) {
          const clusterId = nextClusterId++
          const clusterKey = `cluster_${clusterId}`
          clusters[clusterKey] = [node.id, ...neighbors]

          clusterAssignments.set(node.id, clusterId)
          neighbors.forEach(nId => {
            visited.add(nId)
            clusterAssignments.set(nId, clusterId)
          })
        }
      })

      // Add cluster info to nodes
      layoutNodes.forEach(node => {
        if (clusterAssignments.has(node.id)) {
          node.clusterId = clusterAssignments.get(node.id)
        }
      })

      const nodesWithEmbeddings = layoutNodes.filter(n => n.hasEmbedding).length
      const detectedClusters = Object.keys(clusters).length

      return {
        nodes: layoutNodes,
        edges,
        clusters,
        metadata: {
          similarity_threshold: similarityThreshold,
          total_nodes: layoutNodes.length,
          nodes_in_latent_space: nodesWithEmbeddings,
          total_edges: edges.length,
          detected_clusters: detectedClusters,
          average_connections: layoutNodes.length > 0 ? edges.length / layoutNodes.length : 0,
          is_latent_space: nodesWithEmbeddings > 0,
          projection_method: 'UMAP',
        },
      }
    } catch (error) {
      logger.error(`Error getting memory mesh for user ${userId}:`, error)
      throw error
    }
  }

  async searchMemories(
    userId: string,
    query: string,
    limit: number = 10,
    preFilteredMemoryIds?: string[]
  ): Promise<any[]> {
    try {
      let queryEmbedding: number[] | null = null
      try {
        const embeddingResult = await aiProvider.generateEmbedding(query)
        queryEmbedding =
          typeof embeddingResult === 'object' && 'embedding' in embeddingResult
            ? (embeddingResult as any).embedding
            : (embeddingResult as number[])
      } catch {
        logger.warn('Embedding generation unavailable, falling back to metadata-based search')
      }

      if (queryEmbedding) {
        await ensureCollection()

        const filter: any = {
          must: [{ key: 'user_id', match: { value: userId } }],
        }

        if (preFilteredMemoryIds && preFilteredMemoryIds.length > 0) {
          filter.must.push({
            key: 'memory_id',
            match: { any: preFilteredMemoryIds },
          })
        }

        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
          vector: queryEmbedding,
          filter,
          limit: limit * 2,
          with_payload: true,
        })

        if (!searchResult || searchResult.length === 0) {
          return []
        }

        const memoryIds = searchResult
          .map(result => result.payload?.memory_id as string)
          .filter((id): id is string => !!id)

        if (memoryIds.length === 0) {
          return []
        }

        const fullMemories = await prisma.memory.findMany({
          where: { id: { in: memoryIds } },
        })

        const memoryMap = new Map(fullMemories.map(m => [m.id, m]))
        const scoreMap = new Map<string, number>()

        searchResult.forEach(result => {
          const memoryId = result.payload?.memory_id as string
          if (memoryId) {
            const existingScore = scoreMap.get(memoryId)
            const newScore = result.score || 0
            if (!existingScore || newScore > existingScore) {
              scoreMap.set(memoryId, newScore)
            }
          }
        })

        const queryTokens = query
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(token => token.length > 2)

        const scoredResults = Array.from(scoreMap.entries())
          .map(([memoryId, semanticScore]) => {
            const fullMemory = memoryMap.get(memoryId)
            if (!fullMemory) return null

            const title = (fullMemory.title || '').toLowerCase()
            const summary = (fullMemory.summary || '').toLowerCase()
            const content = (fullMemory.content || '').toLowerCase()

            let keywordBonus = 0
            let matchedTokens = 0

            for (const token of queryTokens) {
              const tokenRegex = new RegExp(`\\b${token}\\b`, 'i')
              if (tokenRegex.test(title)) {
                keywordBonus += 0.15
                matchedTokens++
              }
              if (tokenRegex.test(summary)) {
                keywordBonus += 0.1
                matchedTokens++
              }
              if (tokenRegex.test(content)) {
                keywordBonus += 0.05
                matchedTokens++
              }
            }

            const coverageRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0
            const finalScore = semanticScore + keywordBonus * coverageRatio

            return {
              ...fullMemory,
              similarity_score: finalScore,
            }
          })
          .filter((result): result is NonNullable<typeof result> => result !== null)
          .filter(result => result.similarity_score >= 0.15)
          .sort((a, b) => b.similarity_score - a.similarity_score)
          .slice(0, limit)

        return scoredResults
      }

      // Fallback: keyword search on metadata/title/summary
      const memories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { page_metadata: { path: ['topics'], array_contains: [query] } },
            { page_metadata: { path: ['categories'], array_contains: [query] } },
            { page_metadata: { path: ['searchableTerms'], array_contains: [query] } },
          ],
        },
        take: limit,
      })

      return memories.map(m => ({ ...m, similarity_score: 0.3 }))
    } catch (error) {
      logger.error(`Error searching memories for user ${userId}:`, error)
      throw error
    }
  }

  async processMemoryForMesh(memoryId: string, userId: string): Promise<void> {
    try {
      await this.generateEmbeddingsForMemory(memoryId)
      await this.createMemoryRelations(memoryId, userId)
    } catch (error) {
      logger.error(`Error processing memory ${memoryId} for mesh:`, error)
      throw error
    }
  }

  async getMemoryWithRelations(memoryId: string): Promise<any> {
    try {
      await ensureCollection()

      const embeddingResult = await qdrantClient.search(COLLECTION_NAME, {
        vector: new Array(EMBEDDING_DIMENSION).fill(0),
        filter: {
          must: [{ key: 'memory_id', match: { value: memoryId } }],
        },
        limit: 1,
        with_payload: true,
        with_vector: true,
        score_threshold: 0,
      })

      const hasEmbeddings = embeddingResult.length > 0 && embeddingResult[0]?.payload

      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        include: {
          related_memories: {
            include: {
              related_memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                  page_metadata: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
          },
          related_to_memories: {
            include: {
              memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                  page_metadata: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
          },
        },
      })

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`)
      }

      return {
        ...memory,
        relation_stats: {
          outgoing_relations: memory.related_memories.length,
          incoming_relations: memory.related_to_memories.length,
          total_relations: memory.related_memories.length + memory.related_to_memories.length,
          has_embeddings: hasEmbeddings,
        },
      }
    } catch (error) {
      logger.error(`Error getting memory with relations for ${memoryId}:`, error)
      throw error
    }
  }

  async getMemoryCluster(userId: string, centerMemoryId: string, depth: number = 2): Promise<any> {
    try {
      const visited = new Set()

      const cluster = new Map()

      const processMemory = async (memoryId: string, currentDepth: number) => {
        if (currentDepth > depth || visited.has(memoryId)) {
          return
        }

        visited.add(memoryId)

        const memory = await prisma.memory.findUnique({
          where: { id: memoryId },
          include: {
            related_memories: {
              include: {
                related_memory: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    created_at: true,
                    summary: true,
                  },
                },
              },
              orderBy: { similarity_score: 'desc' },
              take: 5,
            },
          },
        })

        if (memory) {
          cluster.set(memoryId, {
            ...memory,
            depth: currentDepth,
            relation_count: memory.related_memories.length,
          })

          for (const relation of memory.related_memories) {
            if (relation.similarity_score > 0.3) {
              await processMemory(relation.related_memory.id, currentDepth + 1)
            }
          }
        }
      }

      await processMemory(centerMemoryId, 0)

      return {
        center_memory_id: centerMemoryId,
        cluster_size: cluster.size,
        max_depth: depth,
        memories: Array.from(cluster.values()),
      }
    } catch (error) {
      logger.error(`Error getting memory cluster for ${centerMemoryId}:`, error)
      throw error
    }
  }
}

export const memoryMeshService = new MemoryMeshService()
