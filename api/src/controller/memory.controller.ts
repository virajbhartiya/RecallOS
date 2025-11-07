import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { aiProvider } from '../services/aiProvider';
import { memoryMeshService } from '../services/memoryMesh';
import { normalizeText, hashCanonical, normalizeUrl, calculateSimilarity } from '../utils/text';
import { logger } from '../utils/logger';

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export class MemoryController {
  static async processRawContent(req: AuthenticatedRequest, res: Response) {
    try {
      const { content, url, title, metadata } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userId = req.user.id;

      logger.log('[memory/process] inbound', {
        ts: new Date().toISOString(),
        userId: userId,
        url: typeof url === 'string' ? url.slice(0, 200) : undefined,
        title: typeof title === 'string' ? title.slice(0, 200) : undefined,
        contentLen: typeof content === 'string' ? content.length : undefined,
      });


      // Exact duplicate check on canonicalized content per user before expensive AI calls
      const canonicalText = normalizeText(content);
      const canonicalHash = hashCanonical(canonicalText);

      const existingByCanonical = await prisma.memory.findFirst({
        where: { user_id: userId, canonical_hash: canonicalHash } as any,
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
        } as any,
      });

      if (existingByCanonical) {
        const serializedExisting = {
          ...existingByCanonical,
          timestamp: (existingByCanonical as any).timestamp
            ? (existingByCanonical as any).timestamp.toString()
            : null,
        };
        return res.status(200).json({
          success: true,
          message: 'Duplicate memory detected, returning existing record',
          data: {
            userId: userId,
            memory: serializedExisting,
            isDuplicate: true,
          },
        });
      }

      // Fallback: Check for URL-based duplicates within the last hour (for dynamic content)
      if (url && url !== 'unknown') {
        const normalizedUrl = normalizeUrl(url);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const recentMemories = await prisma.memory.findMany({
          where: {
            user_id: userId,
            created_at: { gte: oneHourAgo } as any,
          } as any,
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
          } as any,
          orderBy: { created_at: 'desc' } as any,
          take: 50,
        });

        for (const existingMemory of recentMemories) {
          const existingUrl = (existingMemory as any).url;
          if (existingUrl && typeof existingUrl === 'string' && normalizeUrl(existingUrl) === normalizedUrl) {
            const existingCanonical = normalizeText((existingMemory as any).content || '');
            const similarity = calculateSimilarity(canonicalText, existingCanonical);
            
            if (similarity > 0.9) {
              const serializedExisting = {
                ...existingMemory,
                timestamp: (existingMemory as any).timestamp
                  ? (existingMemory as any).timestamp.toString()
                  : null,
              };
              logger.log('[memory/process] url_duplicate_detected', { existingMemoryId: existingMemory.id, similarity, userId: userId });
              return res.status(200).json({
                success: true,
                message: 'Duplicate memory detected by URL similarity, returning existing record',
                data: {
                  userId: userId,
                  memory: serializedExisting,
                  isDuplicate: true,
                },
              });
            }
          }
        }
      }

      const aiStart = Date.now();
      logger.log('[memory/process] ai_start', { ts: new Date().toISOString(), tasks: ['summarizeContent', 'extractContentMetadata'] });
      const [summaryResult, extractedMetadataResult] = await Promise.all([
        aiProvider.summarizeContent(content, metadata, userId),
        aiProvider.extractContentMetadata(content, metadata, userId),
      ]);
      const summary = typeof summaryResult === 'string' ? summaryResult : (summaryResult as any).text || summaryResult;
      const extractedMetadata = typeof extractedMetadataResult === 'object' && 'topics' in extractedMetadataResult ? extractedMetadataResult : (extractedMetadataResult as any).metadata || extractedMetadataResult;
      logger.log('[memory/process] ai_done', { ms: Date.now() - aiStart, hasSummary: !!summary, hasExtracted: !!extractedMetadata });


      const urlHash = hashUrl(url || 'unknown');

      const timestamp = Math.floor(Date.now() / 1000);

      // Retain legacy checks but canonical already ensures exact duplicate prevention

      const dbCreateStart = Date.now();
      let memory;
      try {
        memory = await prisma.memory.create({
          data: {
            user_id: userId,
            source: metadata?.source || 'extension',
            url: url || 'unknown',
            title: title || 'Untitled',
            content: content,
            summary: summary,
            canonical_text: canonicalText,
            canonical_hash: canonicalHash,
            timestamp: BigInt(timestamp),
            full_content: content,
            page_metadata: {
              ...metadata,
              extracted_metadata: extractedMetadata,
              topics: extractedMetadata.topics,
              categories: extractedMetadata.categories,
              key_points: extractedMetadata.keyPoints,
              sentiment: extractedMetadata.sentiment,
              importance: extractedMetadata.importance,
              searchable_terms: extractedMetadata.searchableTerms,
            },
          } as any,
        });
        logger.log('[memory/process] db_memory_created', { ms: Date.now() - dbCreateStart, memoryId: memory.id, userId: userId });
      } catch (createError: any) {
        if (createError.code === 'P2002') {
          const existingMemory = await prisma.memory.findFirst({
            where: { user_id: userId, canonical_hash: canonicalHash } as any,
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
            } as any,
          });

          if (existingMemory) {
            const serializedExisting = {
              ...existingMemory,
              timestamp: (existingMemory as any).timestamp
                ? (existingMemory as any).timestamp.toString()
                : null,
            };
            logger.log('[memory/process] duplicate_detected_on_create', { existingMemoryId: existingMemory.id, userId: userId });
            return res.status(200).json({
              success: true,
              message: 'Duplicate memory detected, returning existing record',
              data: {
                userId: userId,
                memory: serializedExisting,
                isDuplicate: true,
              },
            });
          }
        }
        throw createError;
      }

      setImmediate(async () => {
        // Always create snapshot even if mesh processing fails
        try {
          const snapStart = Date.now();
          const summaryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          await prisma.memorySnapshot.create({
            data: {
              user_id: userId,
              raw_text: content,
              summary: summary,
              summary_hash: summaryHash,
            },
          });
          logger.log('[memory/process] snapshot_created', { ms: Date.now() - snapStart, memoryId: memory.id });
        } catch (snapshotError) {
          logger.error(`Error creating snapshot for memory ${memory.id}:`, snapshotError);
        }

        try {
          const meshStart = Date.now();
          logger.log('[memory/process] mesh_start', { memoryId: memory.id, userId: userId });
          await memoryMeshService.processMemoryForMesh(memory.id, userId);
          logger.log('[memory/process] mesh_done', { ms: Date.now() - meshStart, memoryId: memory.id });
        } catch (meshError) {
          logger.error(`Error processing memory ${memory.id} for mesh:`, meshError);
        }
      });
      logger.log('[memory/process] done', { memoryId: memory.id });
      res.status(200).json({
        success: true,
        message: 'Content processed and stored successfully',
        data: {
          userId: userId,
          memoryId: memory.id,
          urlHash,
          transactionDetails: null,
        },
      });
    } catch (error) {
      logger.error('Error processing raw content:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process raw content',
      });
    }
  }


  static async getRecentMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const { count } = req.query;
      const limit = Math.min(count ? parseInt(count as string) : 10, 100);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userId = req.user.id;

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
          } as any,
          orderBy: { created_at: 'desc' },
          take: limit,
        });

        // Convert BigInt values to strings for JSON serialization
        const serializedMemories = memories.map((memory: any) => ({
          ...memory,
          timestamp: memory.timestamp ? memory.timestamp.toString() : null,
        }));

      res.status(200).json({
        success: true,
        data: {
          userId: userId,
          count: limit,
          memories: serializedMemories,
          actualCount: memories.length,
        },
      });
    } catch (error) {
      logger.error('Error getting recent memories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get recent memories',
      });
    }
  }


  static async getUserMemoryCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userId = req.user.id;

      const count = await prisma.memory.count({
        where: { user_id: userId },
      });

      return res.status(200).json({
        success: true,
        data: {
          userId: userId,
          memoryCount: count,
        },
      });
    } catch (error) {
      logger.error('Error getting user memory count:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memory count',
      });
    }
  }


  static async getMemoryInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userId = req.user.id;

      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        select: {
          page_metadata: true,
          timestamp: true,
          source: true,
        },
      });

      const topicCounts: { [key: string]: number } = {};

      const categoryCounts: { [key: string]: number } = {};

      const sentimentCounts: { [key: string]: number } = {};

      const sourceCounts: { [key: string]: number } = {};


      let totalImportance = 0;

      let importanceCount = 0;

      memories.forEach(memory => {
        const metadata = memory.page_metadata as any;

        if (metadata?.topics) {
          metadata.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }

        if (metadata?.categories) {
          metadata.categories.forEach((category: string) => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }

        if (metadata?.sentiment) {
          sentimentCounts[metadata.sentiment] =
            (sentimentCounts[metadata.sentiment] || 0) + 1;
        }

        sourceCounts[memory.source] = (sourceCounts[memory.source] || 0) + 1;

        if (metadata?.importance) {
          totalImportance += metadata.importance;
          importanceCount++;
        }
      });

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      const averageImportance =
        importanceCount > 0 ? totalImportance / importanceCount : 0;

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
              Object.entries(sentimentCounts).sort(
                ([, a], [, b]) => b - a
              )[0]?.[0] || 'neutral',
          },
        },
      });
    } catch (error) {
      logger.error('Error getting memory insights:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }



  static async healthCheck(req: Request, res: Response) {
    try {
      res.status(200).json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: error.message,
      });
    }
  }

  static async debugMemories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userId = req.user.id;

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
      });

      res.status(200).json({
        success: true,
        data: {
          user_id: userId,
          total_memories: memories.length,
          recent_memories: memories,
        },
      });
    } catch (error) {
      logger.error('Debug memories error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug failed',
      });
    }
  }

  static async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'Memory ID is required',
        });
      }

      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        });
      }

      if (memory.user_id !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this memory',
        });
      }

      await prisma.memory.delete({
        where: { id: memoryId },
      });

      res.status(200).json({
        success: true,
        message: 'Memory deleted successfully',
        data: {
          memoryId,
        },
      });
    } catch (error) {
      logger.error('Error deleting memory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete memory',
      });
    }
  }
}
