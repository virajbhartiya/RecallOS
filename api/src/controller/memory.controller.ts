import { Request, Response } from 'express';

import {
  storeMemory,
  storeMemoryBatch,
  getMemory,
  getUserMemories,
  getUserMemoryCount,
  isMemoryStored,
  getMemoryOwner,
  getMemoriesByUrlHash,
  getMemoriesByTimestampRange,
  getRecentMemories,
  getMemoryByHash,
  MemoryData,
  hashUrl,
} from '../services/blockchain';

import { prisma } from '../lib/prisma';

import { geminiService } from '../services/gemini';

import { memoryMeshService } from '../services/memoryMesh';

import { createHash } from 'crypto';

export class MemoryController {
  static async processRawContent(req: Request, res: Response) {
    try {
      const { content, url, title, userAddress, metadata } = req.body;

      console.log('📥 Processing raw content:', {
        userAddress,
        url,
        title,
        contentLength: content?.length,
        metadata,
      });

      if (!content || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'Content and userAddress are required',
        });
      }

      let user = await prisma.user.findFirst({
        where: { 
          wallet_address: {
            equals: userAddress,
            mode: 'insensitive'
          }
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { wallet_address: userAddress.toLowerCase() },
        });
        console.log(`✅ Created new user: ${user.id}`);
      }

      console.log(`Processing content through Gemini...`);

      const [summary, extractedMetadata] = await Promise.all([
        geminiService.summarizeContent(content, metadata),
        geminiService.extractContentMetadata(content, metadata),
      ]);

      console.log(`Extracted metadata:`, extractedMetadata);

      const memoryHash =
        '0x' + createHash('sha256').update(summary).digest('hex');

      const urlHash = hashUrl(url || 'unknown');

      const timestamp = Math.floor(Date.now() / 1000);

      // Check for duplicate memories
      const existingMemory = await prisma.memory.findFirst({
        where: {
          user_id: user.id,
          OR: [
            { hash: memoryHash },
            { 
              AND: [
                { url: url || 'unknown' },
                { 
                  created_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                  }
                }
              ]
            }
          ]
        }
      });

      if (existingMemory) {
        console.log(`Duplicate memory detected for user ${user.id}, skipping creation`);

        return res.status(200).json({
          success: true,
          message: 'Duplicate memory detected, skipping creation',
          data: {
            userAddress,
            existingMemoryId: existingMemory.id,
            memoryHash,
            urlHash,
            isDuplicate: true
          },
        });
      }

      const memory = await prisma.memory.create({
        data: {
          user_id: user.id,
          source: metadata?.source || 'extension',
          url: url || 'unknown',
          title: title || 'Untitled',
          content: content,
          summary: summary,
          hash: memoryHash,
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
        },
      });

      console.log(`Created memory in database: ${memory.id}`);

      const memoryData: MemoryData = {
        hash: memoryHash,
        urlHash: urlHash,
        timestamp: timestamp,
      };

      console.log(`Storing memory on blockchain...`);

      const blockchainResult = await storeMemoryBatch([memoryData]);

      if (blockchainResult.success) {
        await prisma.memory.update({
          where: { id: memory.id },
          data: {
            tx_hash: blockchainResult.txHash,
            block_number: blockchainResult.blockNumber
              ? BigInt(blockchainResult.blockNumber)
              : null,
            gas_used: blockchainResult.gasUsed,
            tx_status: 'confirmed' as any,
            blockchain_network: 'sepolia',
            confirmed_at: new Date(),
          } as any,
        });
        console.log(
          `Updated memory with blockchain transaction: ${blockchainResult.txHash}`
        );
      } else {
        await prisma.memory.update({
          where: { id: memory.id },
          data: {
            tx_status: 'failed' as any,
          } as any,
        });
        console.log(`❌ Blockchain storage failed for memory: ${memory.id}`);
      }

      setImmediate(async () => {
        // Always create snapshot even if mesh processing fails
        try {
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
          console.log(`Created memory snapshot for memory ${memory.id}`);
        } catch (snapshotError) {
          console.error(`Error creating snapshot for memory ${memory.id}:`, snapshotError);
        }

        try {
          await memoryMeshService.processMemoryForMesh(memory.id, user.id);
        } catch (meshError) {
          console.error(`Error processing memory ${memory.id} for mesh:`, meshError);
        }
      });
      res.status(200).json({
        success: true,
        message: 'Content processed and stored successfully',
        data: {
          userAddress,
          memoryId: memory.id,
          memoryHash,
          urlHash,
          blockchainResult,
          transactionDetails: blockchainResult.success
            ? {
                txHash: blockchainResult.txHash,
                blockNumber: blockchainResult.blockNumber,
                gasUsed: blockchainResult.gasUsed,
                status: 'confirmed',
                network: 'sepolia',
              }
            : {
                status: 'failed',
              },
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

  static async storeMemory(req: Request, res: Response) {
    try {
      const { hash, url, timestamp } = req.body;

      if (!hash || !url || !timestamp) {
        return res.status(400).json({
          success: false,
          error: 'Hash, URL, and timestamp are required',
        });
      }

      const result = await storeMemory(hash, url, timestamp);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Memory stored successfully',
      });
    } catch (error) {
      console.error('Error storing memory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store memory',
      });
    }
  }

  static async storeMemoryBatch(req: Request, res: Response) {
    try {
      const { memories } = req.body;

      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Memories array is required and cannot be empty',
        });
      }

      for (const memory of memories) {
        if (!memory.hash || !memory.urlHash || !memory.timestamp) {
          return res.status(400).json({
            success: false,
            error: 'Each memory must have hash, urlHash, and timestamp',
          });
        }
      }

      const result = await storeMemoryBatch(memories);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Memory batch stored successfully',
      });
    } catch (error) {
      console.error('Error storing memory batch:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store memory batch',
      });
    }
  }

  static async getMemory(req: Request, res: Response) {
    try {
      const { userAddress, index } = req.params;

      if (!userAddress || index === undefined) {
        return res.status(400).json({
          success: false,
          error: 'User address and index are required',
        });
      }

      const memory = await getMemory(userAddress, parseInt(index));

      res.status(200).json({
        success: true,
        data: memory,
      });
    } catch (error) {
      console.error('Error getting memory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memory',
      });
    }
  }

  static async getUserMemories(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'User address is required',
        });
      }

      const memories = await getUserMemories(userAddress);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          memories,
          count: memories.length,
        },
      });
    } catch (error) {
      console.error('Error getting user memories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memories',
      });
    }
  }

  static async isMemoryStored(req: Request, res: Response) {
    try {
      const { hash } = req.params;

      if (!hash) {
        return res.status(400).json({
          success: false,
          error: 'Memory hash is required',
        });
      }

      const exists = await isMemoryStored(hash);

      res.status(200).json({
        success: true,
        data: {
          hash,
          exists,
        },
      });
    } catch (error) {
      console.error('Error checking if memory is stored:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check if memory is stored',
      });
    }
  }

  static async getMemoriesByUrlHash(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      const { url } = req.query;

      if (!userAddress || !url) {
        return res.status(400).json({
          success: false,
          error: 'User address and URL are required',
        });
      }

      const urlHash = hashUrl(url as string);

      const memories = await getMemoriesByUrlHash(userAddress, urlHash);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          url,
          memories,
          count: memories.length,
        },
      });
    } catch (error) {
      console.error('Error getting memories by URL:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memories by URL',
      });
    }
  }

  static async getMemoriesByTimestampRange(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      const { startTime, endTime } = req.query;

      if (!userAddress || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'User address, start time, and end time are required',
        });
      }

      const memories = await getMemoriesByTimestampRange(
        userAddress,
        parseInt(startTime as string),
        parseInt(endTime as string)
      );

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          startTime: parseInt(startTime as string),
          endTime: parseInt(endTime as string),
          memories,
          count: memories.length,
        },
      });
    } catch (error) {
      console.error('Error getting memories by timestamp range:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memories by timestamp range',
      });
    }
  }

  static async getRecentMemories(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      const { count } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'User address is required',
        });
      }

      const limit = count ? parseInt(count as string) : 10;

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress.toLowerCase() },
      });

      if (user) {
        const memories = await prisma.memory.findMany({
          where: { user_id: user.id },
          select: {
            id: true,
            title: true,
            url: true,
            hash: true,
            timestamp: true,
            created_at: true,
            tx_hash: true,
            block_number: true,
            gas_used: true,
            tx_status: true,
            blockchain_network: true,
            confirmed_at: true,
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
          block_number: memory.block_number ? memory.block_number.toString() : null,
        }));

        return res.status(200).json({
          success: true,
          data: {
            userAddress,
            count: limit,
            memories: serializedMemories,
            actualCount: memories.length,
          },
        });
      }

      // Fallback to blockchain data if user not found in database
      const memories = await getRecentMemories(userAddress, limit);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
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

  static async getMemoryByHash(req: Request, res: Response) {
    try {
      const { hash } = req.params;

      if (!hash) {
        return res.status(400).json({
          success: false,
          error: 'Memory hash is required',
        });
      }

      // First try to get full memory details from database
      const memory = await prisma.memory.findUnique({
        where: { hash: hash },
        select: {
          id: true,
          title: true,
          url: true,
          hash: true,
          timestamp: true,
          created_at: true,
          tx_hash: true,
          block_number: true,
          gas_used: true,
          tx_status: true,
          blockchain_network: true,
          confirmed_at: true,
          summary: true,
          content: true,
          source: true,
          page_metadata: true,
        } as any,
      });

      if (memory) {
        // Convert BigInt values to strings for JSON serialization
        const serializedMemory = {
          ...memory,
          timestamp: memory.timestamp ? memory.timestamp.toString() : null,
          block_number: memory.block_number ? memory.block_number.toString() : null,
        };

        return res.status(200).json({
          success: true,
          data: serializedMemory,
        });
      }

      // Fallback to blockchain data if not found in database
      const blockchainMemory = await getMemoryByHash(hash);

      res.status(200).json({
        success: true,
        data: blockchainMemory,
      });
    } catch (error) {
      console.error('Error getting memory by hash:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get memory by hash',
      });
    }
  }

  static async getUserMemoryCount(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'User address is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress.toLowerCase() },
      });

      if (user) {
        const count = await prisma.memory.count({
          where: { user_id: user.id },
        });

        return res.status(200).json({
          success: true,
          data: {
            userAddress,
            memoryCount: count,
          },
        });
      }

      const count = await getUserMemoryCount(userAddress);

      res.status(200).json({
        success: true,
        data: {
          userAddress,
          memoryCount: count,
        },
      });
    } catch (error) {
      console.error('Error getting user memory count:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user memory count',
      });
    }
  }

  static async searchMemories(req: Request, res: Response) {
    try {
      const {
        userAddress,
        query,
        category,
        topic,
        importance,
        sentiment,
        limit = 20,
      } = req.query;

      if (!userAddress || !query) {
        return res.status(400).json({
          success: false,
          error: 'userAddress and query are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const whereConditions: any = {
        user_id: user.id,
      };

      const searchQuery = query as string;

      whereConditions.OR = [
        { content: { contains: searchQuery, mode: 'insensitive' } },
        { summary: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } },
      ];

      if (category) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          categories: { has: category },
        };
      }

      if (topic) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          topics: { has: topic },
        };
      }

      if (importance) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          importance: { gte: parseInt(importance as string) },
        };
      }

      if (sentiment) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          sentiment: sentiment,
        };
      }

      const memories = await prisma.memory.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string),
      });

      let searchableTerms: string[] = [];

      try {
        const queryMetadata = await geminiService.extractContentMetadata(
          searchQuery,
          {
            content_type: 'search_query',
            title: 'Search Query',
          }
        );

        searchableTerms = queryMetadata.searchableTerms;
      } catch (error) {
        console.log('Could not extract search terms from query:', error);
      }

      res.status(200).json({
        success: true,
        data: {
          memories,
          query: searchQuery,
          searchableTerms,
          totalResults: memories.length,
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

  static async getMemoryInsights(req: Request, res: Response) {
    try {
      const { userAddress } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

  static async getMemoriesWithTransactionDetails(req: Request, res: Response) {
    try {
      const { userAddress, status, limit = 50 } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findFirst({
        where: { 
          wallet_address: {
            equals: userAddress as string,
            mode: 'insensitive'
          }
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const whereConditions: any = {
        user_id: user.id,
      };

      if (status) {
        whereConditions.tx_status = status;
      }

      const memories = await prisma.memory.findMany({
        where: whereConditions,
        select: {
          id: true,
          title: true,
          url: true,
          hash: true,
          timestamp: true,
          created_at: true,
          tx_hash: true,
          block_number: true,
          gas_used: true,
          tx_status: true,
          blockchain_network: true,
          confirmed_at: true,
          summary: true,
          content: true,
          source: true,
          page_metadata: true,
        } as any,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string),
      });

      const allMemories = await prisma.memory.findMany({
        where: { user_id: user.id },
        select: { tx_status: true } as any,
      });

      const transactionStats: Record<string, number> = {};

      allMemories.forEach(memory => {
        const status = (memory as any).tx_status || 'unknown';

        transactionStats[status] = (transactionStats[status] || 0) + 1;
      });

      const serializedMemories = memories.map((memory: any) => ({
        ...memory,
        timestamp: memory.timestamp ? memory.timestamp.toString() : null,
        block_number: memory.block_number ? memory.block_number.toString() : null,
      }));

      res.status(200).json({
        success: true,
        data: {
          memories: serializedMemories,
          transactionStats,
          totalMemories: memories.length,
        },
      });
    } catch (error) {
      console.error('Error getting memories with transaction details:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryTransactionStatus(req: Request, res: Response) {
    try {
      const { memoryId } = req.params;

      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: 'memoryId is required',
        });
      }

      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        select: {
          id: true,
          title: true,
          hash: true,
          tx_hash: true,
          block_number: true,
          gas_used: true,
          tx_status: true,
          blockchain_network: true,
          confirmed_at: true,
          created_at: true,
        } as any,
      });

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          memoryId: memory.id,
          title: memory.title,
          hash: memory.hash,
          transaction: {
            txHash: (memory as any).tx_hash,
            blockNumber: (memory as any).block_number?.toString(),
            gasUsed: (memory as any).gas_used,
            status: (memory as any).tx_status,
            network: (memory as any).blockchain_network,
            confirmedAt: (memory as any).confirmed_at,
            createdAt: memory.created_at,
          },
        },
      });
    } catch (error) {
      console.error('Error getting memory transaction status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async retryFailedTransactions(req: Request, res: Response) {
    try {
      const { userAddress, limit = 10 } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const failedMemories = await prisma.memory.findMany({
        where: {
          user_id: user.id,
          tx_status: 'failed' as any,
        } as any,
        take: parseInt(limit as string),
        orderBy: { created_at: 'asc' },
      });

      if (failedMemories.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No failed transactions found',
          data: { retriedCount: 0 },
        });
      }

      let retriedCount = 0;

      const results = [];

      for (const memory of failedMemories) {
        try {
          const memoryData: MemoryData = {
            hash: memory.hash!,
            urlHash: hashUrl(memory.url || 'unknown'),
            timestamp: Number(memory.timestamp),
          };

          console.log(`Retrying blockchain storage for memory: ${memory.id}`);

          const blockchainResult = await storeMemoryBatch([memoryData]);

          if (blockchainResult.success) {
            await prisma.memory.update({
              where: { id: memory.id },
              data: {
                tx_hash: blockchainResult.txHash,
                block_number: blockchainResult.blockNumber
                  ? BigInt(blockchainResult.blockNumber)
                  : null,
                gas_used: blockchainResult.gasUsed,
                tx_status: 'confirmed' as any,
                blockchain_network: 'sepolia',
                confirmed_at: new Date(),
              } as any,
            });
            retriedCount++;
            results.push({
              memoryId: memory.id,
              status: 'success',
              txHash: blockchainResult.txHash,
            });
            console.log(`✅ Successfully retried memory: ${memory.id}`);
          } else {
            results.push({
              memoryId: memory.id,
              status: 'failed',
              error: 'Blockchain storage failed',
            });
          }
        } catch (error) {
          console.error(`❌ Error retrying memory ${memory.id}:`, error);
          results.push({
            memoryId: memory.id,
            status: 'error',
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Retried ${retriedCount} out of ${failedMemories.length} failed transactions`,
        data: {
          retriedCount,
          totalFailed: failedMemories.length,
          results,
        },
      });
    } catch (error) {
      console.error('Error retrying failed transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getMemoryMesh(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      const { limit = 50, threshold = 0.3 } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress.toLowerCase() },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const mesh = await memoryMeshService.getMemoryMesh(
        user.id,
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

  static async getMemoryWithRelations(req: Request, res: Response) {
    try {
      const { memoryId } = req.params;

      const { userAddress } = req.query;

      if (!memoryId || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'memoryId and userAddress are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

  static async getMemoryCluster(req: Request, res: Response) {
    try {
      const { memoryId } = req.params;

      const { userAddress, depth = 2 } = req.query;

      if (!memoryId || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'memoryId and userAddress are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

  static async searchMemoriesWithEmbeddings(req: Request, res: Response) {
    try {
      const { 
        userAddress, 
        query, 
        category,
        topic,
        sentiment,
        tx_status,
        source,
        dateRange,
        page = 1,
        limit = 10 
      } = req.query;

      if (!userAddress || !query) {
        return res.status(400).json({
          success: false,
          error: 'userAddress and query are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

      // Apply filters to narrow down the memory pool before semantic search
      if (tx_status) {
        whereConditions.tx_status = tx_status;
      }

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
          console.log('Invalid dateRange format:', error);
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

      res.status(200).json({
        success: true,
        data: {
          query: query,
          results: paginatedResults,
          totalResults: filteredResults.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(filteredResults.length / Number(limit)),
          appliedFilters: {
            category,
            topic,
            sentiment,
            tx_status,
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

  static async searchMemoriesHybrid(req: Request, res: Response) {
    try {
      const { 
        userAddress, 
        query, 
        category,
        topic,
        sentiment,
        tx_status,
        source,
        dateRange,
        page = 1,
        limit = 10 
      } = req.query;

      if (!userAddress || !query) {
        return res.status(400).json({
          success: false,
          error: 'userAddress and query are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

      // Apply filters to narrow down the memory pool
      if (tx_status) {
        whereConditions.tx_status = tx_status;
      }

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
          console.log('Invalid dateRange format:', error);
        }
      }

      // Get pre-filtered memories
      const preFilteredMemories = await prisma.memory.findMany({
        where: whereConditions,
        select: { id: true },
      });

      const preFilteredMemoryIds = preFilteredMemories.map(m => m.id);

      // Perform both keyword and semantic search in parallel
      const [keywordResults, semanticResults] = await Promise.all([
        // Keyword search
        prisma.memory.findMany({
          where: {
            ...whereConditions,
            OR: [
              { content: { contains: query as string, mode: 'insensitive' } },
              { summary: { contains: query as string, mode: 'insensitive' } },
              { title: { contains: query as string, mode: 'insensitive' } },
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

      res.status(200).json({
        success: true,
        data: {
          query: query,
          results: paginatedResults,
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
            tx_status,
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

    let score = 0;

    // Title matches get highest score
    if (memory.title && memory.title.toLowerCase().includes(queryLower)) {
      score += 0.4;
    }

    // Summary matches get medium score
    if (memory.summary && memory.summary.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // Content matches get lower score
    if (memory.content && memory.content.toLowerCase().includes(queryLower)) {
      score += 0.2;
    }

    // Boost score for exact phrase matches
    const exactPhraseRegex = new RegExp(`\\b${queryLower}\\b`, 'gi');

    if (memory.title && exactPhraseRegex.test(memory.title)) {
      score += 0.1;
    }

    if (memory.summary && exactPhraseRegex.test(memory.summary)) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  static async processMemoryForMesh(req: Request, res: Response) {
    try {
      const { memoryId } = req.params;

      const { userAddress } = req.query;

      if (!memoryId || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'memoryId and userAddress are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

  static async getMemorySnapshots(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;

      const { limit = 20, page = 1 } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress.toLowerCase() },
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

  static async getMemorySnapshot(req: Request, res: Response) {
    try {
      const { snapshotId } = req.params;

      const { userAddress } = req.query;

      if (!snapshotId || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'snapshotId and userAddress are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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

  static async backfillMemorySnapshots(req: Request, res: Response) {
    try {
      const { userAddress } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: 'userAddress is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: (userAddress as string).toLowerCase() },
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
      const testAddress = '0x0000000000000000000000000000000000000000';

      await getUserMemoryCount(testAddress);
      res.status(200).json({
        success: true,
        message: 'Blockchain connection is healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Blockchain connection is not available',
        details: error.message,
      });
    }
  }
}
