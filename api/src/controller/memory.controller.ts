import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

import { createHash } from 'crypto';

import { prisma } from '../lib/prisma';

import { aiProvider } from '../services/aiProvider';

import { memoryMeshService } from '../services/memoryMesh';
import { normalizeText, hashCanonical } from '../utils/text';
import { searchMemories } from '../services/memorySearch';

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export class MemoryController {
  static async processRawContent(req: AuthenticatedRequest, res: Response) {
    try {
      const { content, url, title, metadata } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      console.log('[memory/process] inbound', {
        ts: new Date().toISOString(),
        userId: user.id,
        url: typeof url === 'string' ? url.slice(0, 200) : undefined,
        title: typeof title === 'string' ? title.slice(0, 200) : undefined,
        contentLen: typeof content === 'string' ? content.length : undefined,
      });


      // Exact duplicate check on canonicalized content per user before expensive AI calls
      const canonicalText = normalizeText(content);
      const canonicalHash = hashCanonical(canonicalText);

      const existingByCanonical = await prisma.memory.findFirst({
        where: { user_id: user.id, canonical_hash: canonicalHash } as any,
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
            userId: user.id,
            memory: serializedExisting,
            isDuplicate: true,
          },
        });
      }

      const aiStart = Date.now();
      console.log('[memory/process] ai_start', { ts: new Date().toISOString(), tasks: ['summarizeContent', 'extractContentMetadata'] });
      const [summary, extractedMetadata] = await Promise.all([
        aiProvider.summarizeContent(content, metadata),
        aiProvider.extractContentMetadata(content, metadata),
      ]);
      console.log('[memory/process] ai_done', { ms: Date.now() - aiStart, hasSummary: !!summary, hasExtracted: !!extractedMetadata });


      const urlHash = hashUrl(url || 'unknown');

      const timestamp = Math.floor(Date.now() / 1000);

      // Retain legacy checks but canonical already ensures exact duplicate prevention

      const dbCreateStart = Date.now();
      const memory = await prisma.memory.create({
        data: {
          user_id: user.id,
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
      console.log('[memory/process] db_memory_created', { ms: Date.now() - dbCreateStart, memoryId: memory.id, userId: user.id });



      console.log('[memory/process] db_memory_created', { ms: Date.now() - dbCreateStart, memoryId: memory.id });

      setImmediate(async () => {
        // Always create snapshot even if mesh processing fails
        try {
          const snapStart = Date.now();
          const summaryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          await prisma.memorySnapshot.create({
            data: {
              user_id: user.id,
              raw_text: content,
              summary: summary,
              summary_hash: summaryHash,
            },
          });
          console.log('[memory/process] snapshot_created', { ms: Date.now() - snapStart, memoryId: memory.id });
        } catch (snapshotError) {
          console.error(`Error creating snapshot for memory ${memory.id}:`, snapshotError);
        }

        try {
          const meshStart = Date.now();
          console.log('[memory/process] mesh_start', { memoryId: memory.id, userId: user.id });
          await memoryMeshService.processMemoryForMesh(memory.id, user.id);
          console.log('[memory/process] mesh_done', { ms: Date.now() - meshStart, memoryId: memory.id });
        } catch (meshError) {
          console.error(`Error processing memory ${memory.id} for mesh:`, meshError);
        }
      });
      console.log('[memory/process] done', { memoryId: memory.id });
      res.status(200).json({
        success: true,
        message: 'Content processed and stored successfully',
        data: {
          userId: user.id,
          memoryId: memory.id,
          urlHash,
          transactionDetails: null,
        },
      });
    } catch (error) {
      console.error('Error processing raw content:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process raw content',
      });
    }
  }

  static async storeMemory(req: AuthenticatedRequest, res: Response) {
    try {

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      res.status(410).json({
        success: false,
        error: 'On-chain functionality removed',
      });
    } catch (error) {
      console.error('Error storing memory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store memory',
      });
    }
  }

  static async storeMemoryBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { memories } = req.body;

      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Memories array is required and cannot be empty',
        });
      }

      for (const memory of memories) {
        if (!memory.urlHash || !memory.timestamp) {
          return res.status(400).json({
            success: false,
            error: 'Each memory must have urlHash and timestamp',
          });
        }
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      res.status(410).json({
        success: false,
        error: 'On-chain functionality removed',
      });
    } catch (error) {
      console.error('Error storing memory batch:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store memory batch',
      });
    }
  }

  static async getMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const { index } = req.params;

      if (index === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Index is required',
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      return res.status(410).json({ success: false, error: 'On-chain functionality removed' });
    } catch (error) {
      console.error('Error getting memory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memory',
      });
    }
  }

  static async getUserMemories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      return res.status(410).json({ success: false, error: 'On-chain functionality removed' });
    } catch (error) {
      console.error('Error getting user memories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memories',
      });
    }
  }


  static async getMemoriesByUrlHash(req: AuthenticatedRequest, res: Response) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const urlHash = hashUrl(url as string);

      return res.status(410).json({ success: false, error: 'On-chain functionality removed' });
    } catch (error) {
      console.error('Error getting memories by URL:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memories by URL',
      });
    }
  }

  static async getMemoriesByTimestampRange(req: AuthenticatedRequest, res: Response) {
    try {
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'Start time and end time are required',
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      return res.status(410).json({ success: false, error: 'On-chain functionality removed' });
    } catch (error) {
      console.error('Error getting memories by timestamp range:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memories by timestamp range',
      });
    }
  }

  static async getRecentMemories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { count } = req.query;
      const limit = count ? parseInt(count as string) : 10;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (user) {
        const memories = await prisma.memory.findMany({
          where: { user_id: user.id },
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

        return res.status(200).json({
          success: true,
          data: {
            userId: user.id,
            count: limit,
            memories: serializedMemories,
            actualCount: memories.length,
          },
        });
      }

      // Return empty array if no database records
      const memories: any[] = [];

      res.status(200).json({
        success: true,
        data: {
          userId: req.user.id,
          count: limit,
          memories,
          actualCount: memories.length,
        },
      });
    } catch (error) {
      console.error('Error getting recent memories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get recent memories',
      });
    }
  }


  static async getUserMemoryCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (user) {
        const count = await prisma.memory.count({
          where: { user_id: user.id },
        });

        return res.status(200).json({
          success: true,
          data: {
            userId: user.id,
            memoryCount: count,
          },
        });
      }

      return res.status(200).json({ success: true, data: { userId: req.user.id, memoryCount: 0 } });
    } catch (error) {
      console.error('Error getting user memory count:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memory count',
      });
    }
  }

  static async searchMemories(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const {
        query,
        category,
        topic,
        importance,
        sentiment,
        limit = 20,
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'query is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Use the semantic search functionality
      const searchResults = await searchMemories({
        userId: user.external_id || user.id,
        query: query as string,
        limit: parseInt(limit as string),
        enableReasoning: true,
        contextOnly: false
      });

      // Convert search results to the expected format
      const memories = searchResults.results.map(result => ({
        id: result.memory_id,
        title: result.title,
        summary: result.summary,
        url: result.url,
        timestamp: result.timestamp,
        content: result.summary, // Use summary as content for display
        source: 'browser',
        user_id: user.id,
        created_at: new Date(result.timestamp * 1000).toISOString(),
        page_metadata: {
          topics: [] as string[],
          categories: ['web_page'],
          sentiment: 'neutral',
          importance: 5
        }
      }));

      res.status(200).json({
        success: true,
        data: {
          total: memories.length,
          results: memories.map(memory => ({
            memory,
            search_type: 'semantic',
            semantic_score: searchResults.results.find(r => r.memory_id === memory.id)?.score || 0,
            blended_score: searchResults.results.find(r => r.memory_id === memory.id)?.score || 0
          })),
          query: searchResults.query,
          // Include the search answer and meta summary
          answer: searchResults.answer,
          meta_summary: searchResults.meta_summary,
          citations: searchResults.citations
        },
      });
    } catch (error) {
      console.error('Error searching memories:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryInsights(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(200).json({
          success: true,
          data: {
            memories: [],
            transactionStats: {},
            totalMemories: 0,
          },
        });
      }

      const memories = await prisma.memory.findMany({
        where: { user_id: user.id },
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
      console.error('Error getting memory insights:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }


  static async getMemoryMesh(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { limit = 50, threshold = 0.3 } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const internalUserId: string | undefined = user.id;

      const mesh = await memoryMeshService.getMemoryMesh(
        internalUserId,
        parseInt(limit as string),
        parseFloat(threshold as string)
      );

      res.status(200).json({
        success: true,
        data: mesh,
      });
    } catch (error) {
      console.error('Error getting memory mesh:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryWithRelations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memoryWithRelations =
        await memoryMeshService.getMemoryWithRelations(memoryId, user.id);

      res.status(200).json({
        success: true,
        data: memoryWithRelations,
      });
    } catch (error) {
      console.error('Error getting memory with relations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryCluster(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { memoryId } = req.params;
      const { depth = 2 } = req.query;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const cluster = await memoryMeshService.getMemoryCluster(
        user.id,
        memoryId,
        parseInt(depth as string)
      );

      res.status(200).json({
        success: true,
        data: cluster,
      });
    } catch (error) {
      console.error('Error getting memory cluster:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async searchMemoriesWithEmbeddings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { 
        query, 
        category,
        topic,
        sentiment,
        source,
        dateRange,
        page = 1,
        limit = 10 
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'query is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Build filter conditions for pre-filtering memories
      const whereConditions: any = {
        user_id: user.id,
      };

      if (source) {
        whereConditions.source = source;
      }

      if (dateRange) {
        try {
          const dateRangeObj = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;

          if (dateRangeObj.start || dateRangeObj.end) {
            whereConditions.created_at = {};

            if (dateRangeObj.start) {
              whereConditions.created_at.gte = new Date(dateRangeObj.start);
            }
            
            if (dateRangeObj.end) {
              whereConditions.created_at.lte = new Date(dateRangeObj.end);
            }
          }
        } catch (error) {
        }
      }

      // Get pre-filtered memories for semantic search
      const preFilteredMemories = await prisma.memory.findMany({
        where: whereConditions,
        select: { id: true },
      });

      const preFilteredMemoryIds = preFilteredMemories.map(m => m.id);

      // Perform semantic search on pre-filtered memories
      const searchResults = await memoryMeshService.searchMemories(
        user.id,
        query as string,
        parseInt(limit as string),
        preFilteredMemoryIds
      );

      // Apply metadata-based filters to results
      let filteredResults = searchResults;

      if (category || topic || sentiment) {
        filteredResults = searchResults.filter((result: any) => {
          const metadata = result.page_metadata as any;
          
          if (category && metadata?.categories && !metadata.categories.includes(category)) {
            return false;
          }
          
          if (topic && metadata?.topics && !metadata.topics.includes(topic)) {
            return false;
          }
          
          if (sentiment && metadata?.sentiment !== sentiment) {
            return false;
          }
          
          return true;
        });
      }

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);
      
      const paginatedResults = filteredResults.slice(skip, skip + Number(limit));

      // Convert BigInt values to strings for JSON serialization
      const serializedResults = paginatedResults.map((result: any) => ({
        ...result,
        memory: {
          ...result.memory,
          timestamp: result.memory.timestamp.toString(),
        }
      }));

      res.status(200).json({
        success: true,
        data: {
          query: query,
          results: serializedResults,
          totalResults: filteredResults.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(filteredResults.length / Number(limit)),
          appliedFilters: {
            category,
            topic,
            sentiment,
            source,
            dateRange
          }
        },
      });
    } catch (error) {
      console.error('Error searching memories with embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async searchMemoriesHybrid(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { 
        query, 
        category,
        topic,
        sentiment,
        source,
        dateRange,
        page = 1,
        limit = 10 
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'query is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Build filter conditions
      const whereConditions: any = {
        user_id: user.id,
      };

      if (source) {
        whereConditions.source = source;
      }

      if (dateRange) {
        try {
          const dateRangeObj = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;
          
          if (dateRangeObj.start || dateRangeObj.end) {
            whereConditions.created_at = {};

            if (dateRangeObj.start) {
              whereConditions.created_at.gte = new Date(dateRangeObj.start);
            }

            if (dateRangeObj.end) {
              whereConditions.created_at.lte = new Date(dateRangeObj.end);
            }
          }
        } catch (error) {
        }
      }

      // Get pre-filtered memories
      const preFilteredMemories = await prisma.memory.findMany({
        where: whereConditions,
        select: { id: true },
      });

      const preFilteredMemoryIds = preFilteredMemories.map(m => m.id);

      // Tokenize query for better keyword matching
      const queryTokens = (query as string)
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 2);
      
      // Build OR conditions for each token
      const tokenConditions = queryTokens.flatMap(token => [
        { content: { contains: token, mode: 'insensitive' as const } },
        { summary: { contains: token, mode: 'insensitive' as const } },
        { title: { contains: token, mode: 'insensitive' as const } },
        { url: { contains: token, mode: 'insensitive' as const } },
      ]);

      // Perform both keyword and semantic search in parallel
      const [keywordResults, semanticResults] = await Promise.all([
        // Keyword search with token-based matching
        prisma.memory.findMany({
          where: {
            ...whereConditions,
            OR: tokenConditions.length > 0 ? tokenConditions : [
              { content: { contains: query as string, mode: 'insensitive' } },
              { summary: { contains: query as string, mode: 'insensitive' } },
              { title: { contains: query as string, mode: 'insensitive' } },
              { url: { contains: query as string, mode: 'insensitive' } },
            ],
          },
          take: parseInt(limit as string) * 2, // Get more results for blending
        }),
        // Semantic search
        memoryMeshService.searchMemories(
          user.id,
          query as string,
          parseInt(limit as string) * 2,
          preFilteredMemoryIds
        ),
      ]);

      // Apply metadata-based filters to keyword results
      let filteredKeywordResults = keywordResults;
      
      if (category || topic || sentiment) {
        filteredKeywordResults = keywordResults.filter((memory: any) => {
          const metadata = memory.page_metadata as any;
          
          if (category && metadata?.categories && !metadata.categories.includes(category)) {
            return false;
          }
          
          if (topic && metadata?.topics && !metadata.topics.includes(topic)) {
            return false;
          }
          
          if (sentiment && metadata?.sentiment !== sentiment) {
            return false;
          }
          
          return true;
        });
      }

      // Create a map to track results and their scores
      const resultMap = new Map<string, any>();

      // Add keyword results with keyword relevance score
      filteredKeywordResults.forEach((memory: any) => {
        const keywordScore = this.calculateKeywordRelevance(memory, query as string);

        resultMap.set(memory.id, {
          ...memory,
          keyword_score: keywordScore,
          semantic_score: 0,
          search_type: 'keyword',
        });
      });

      // Add semantic results with semantic relevance score
      semanticResults.forEach((memory: any) => {
        const existing = resultMap.get(memory.id);

        if (existing) {
          // Memory found in both searches - blend the scores
          existing.semantic_score = memory.similarity_score || 0;
          existing.search_type = 'hybrid';
          existing.blended_score = (existing.keyword_score * 0.4) + (existing.semantic_score * 0.6);
        } else {
          // Memory only found in semantic search
          resultMap.set(memory.id, {
            ...memory,
            keyword_score: 0,
            semantic_score: memory.similarity_score || 0,
            search_type: 'semantic',
            blended_score: memory.similarity_score || 0,
          });
        }
      });

      // Calculate blended scores for keyword-only results
      resultMap.forEach((result) => {
        if (result.search_type === 'keyword') {
          result.blended_score = result.keyword_score * 0.4;
        }
      });

      // Convert to array and sort by blended score
      const blendedResults = Array.from(resultMap.values())
        .sort((a, b) => (b.blended_score || 0) - (a.blended_score || 0));

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);

      const paginatedResults = blendedResults.slice(skip, skip + Number(limit));

      // Convert BigInt values to strings for JSON serialization
      const serializedResults = paginatedResults.map((result: any) => ({
        ...result,
        memory: {
          ...result.memory,
          timestamp: result.memory.timestamp.toString(),
        }
      }));

      res.status(200).json({
        success: true,
        data: {
          query: query,
          results: serializedResults,
          totalResults: blendedResults.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(blendedResults.length / Number(limit)),
          searchStats: {
            keywordResults: filteredKeywordResults.length,
            semanticResults: semanticResults.length,
            blendedResults: blendedResults.length,
          },
          appliedFilters: {
            category,
            topic,
            sentiment,
            source,
            dateRange
          }
        },
      });
    } catch (error) {
      console.error('Error in hybrid search:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  private static calculateKeywordRelevance(memory: any, query: string): number {
    const queryLower = query.toLowerCase();
    
    // Tokenize the query for better matching
    const queryTokens = queryLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);

    let score = 0;
    let matchedTokens = 0;
    
    const title = (memory.title || '').toLowerCase();
    const summary = (memory.summary || '').toLowerCase();
    const content = (memory.content || '').toLowerCase();

    // Token-based matching with word boundaries
    for (const token of queryTokens) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, 'gi');
      
      // Title matches get highest score
      if (tokenRegex.test(title)) {
        score += 0.4;
        matchedTokens++;
      }

      // Summary matches get medium score
      if (tokenRegex.test(summary)) {
        score += 0.3;
        matchedTokens++;
      }

      // Content matches get lower score
      if (tokenRegex.test(content)) {
        score += 0.2;
        matchedTokens++;
      }
    }
    
    // Normalize by number of tokens
    if (queryTokens.length > 0) {
      score = score / queryTokens.length;
    }
    
    // Boost for exact phrase match
    const exactPhraseRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'gi');
    
    if (exactPhraseRegex.test(title)) {
      score += 0.2;
    }
    
    if (exactPhraseRegex.test(summary)) {
      score += 0.15;
    }
    
    // Boost based on token coverage
    const coverageRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
    score = score * (1 + (coverageRatio * 0.3));

    return Math.min(1, score);
  }
  
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static async processMemoryForMesh(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memory = await prisma.memory.findFirst({
        where: {
          id: memoryId,
          user_id: user.id,
        },
      });

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: "Memory not found or doesn't belong to user",
        });
      }

      await memoryMeshService.processMemoryForMesh(memoryId, user.id);
      res.status(200).json({
        success: true,
        message: 'Memory processed for mesh integration',
        data: {
          memoryId,
          processed: true,
        },
      });
    } catch (error) {
      console.error('Error processing memory for mesh:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { limit = 20, page = 1 } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [snapshots, total] = await Promise.all([
        prisma.memorySnapshot.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' },
          skip,
          take: Number(limit),
          select: {
            id: true,
            summary: true,
            summary_hash: true,
            created_at: true,
            raw_text: true,
          },
        }),
        prisma.memorySnapshot.count({
          where: { user_id: user.id },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          snapshots: snapshots.map(snapshot => ({
            ...snapshot,
            raw_text_length: snapshot.raw_text.length,
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Error getting memory snapshots:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemorySnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { snapshotId } = req.params;

      if (!snapshotId) {
        return res.status(400).json({
          success: false,
          error: 'snapshotId is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const snapshot = await prisma.memorySnapshot.findFirst({
        where: {
          id: snapshotId,
          user_id: user.id,
        },
        select: {
          id: true,
          summary: true,
          summary_hash: true,
          created_at: true,
          raw_text: true,
        },
      });

      if (!snapshot) {
        return res.status(404).json({
          success: false,
          error: 'Memory snapshot not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...snapshot,
          raw_text_length: snapshot.raw_text.length,
        },
      });
    } catch (error) {
      console.error('Error getting memory snapshot:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async backfillMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memoriesWithoutSnapshots = await prisma.memory.findMany({
        where: {
          user_id: user.id,
          summary: { not: null },
        },
        select: {
          id: true,
          content: true,
          summary: true,
        },
      });

      let createdCount = 0;

      const results = [];

      for (const memory of memoriesWithoutSnapshots) {
        try {
          const existingSnapshot = await prisma.memorySnapshot.findFirst({
            where: {
              user_id: user.id,
              summary: memory.summary,
            },
          });

          if (!existingSnapshot) {
            const summaryHash =
              '0x' + createHash('sha256').update(memory.summary!).digest('hex');

            await prisma.memorySnapshot.create({
              data: {
                user_id: user.id,
                raw_text: memory.content,
                summary: memory.summary!,
                summary_hash: summaryHash,
              },
            });
            createdCount++;
            results.push({
              memoryId: memory.id,
              status: 'created',
            });
          } else {
            results.push({
              memoryId: memory.id,
              status: 'already_exists',
            });
          }
        } catch (error) {
          console.error(
            `Error creating snapshot for memory ${memory.id}:`,
            error
          );
          results.push({
            memoryId: memory.id,
            status: 'error',
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Backfilled ${createdCount} memory snapshots`,
        data: {
          totalMemories: memoriesWithoutSnapshots.length,
          createdSnapshots: createdCount,
          results,
        },
      });
    } catch (error) {
      console.error('Error backfilling memory snapshots:', error);
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
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const memories = await prisma.memory.findMany({
        where: { user_id: user.id },
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
          user_id: user.id,
          total_memories: memories.length,
          recent_memories: memories,
        },
      });
    } catch (error) {
      console.error('Debug memories error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug failed',
      });
    }
  }
}
