import { Request, Response } from "express";
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
  hashUrl
} from "../services/blockchain";
import { prisma } from "../lib/prisma";
import { geminiService } from "../services/gemini";
import { createHash } from "crypto";

export class MemoryController {
  // Process raw content from extension and store on blockchain
  static async processRawContent(req: Request, res: Response) {
    try {
      const { content, url, title, userAddress, metadata } = req.body;
      
      console.log('📥 Processing raw content:', { 
        userAddress, 
        url,
        title,
        contentLength: content?.length,
        metadata
      });
      
      if (!content || !userAddress) {
        return res.status(400).json({
          success: false,
          error: "Content and userAddress are required"
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { wallet_address: userAddress }
      });

      if (!user) {
        user = await prisma.user.create({
          data: { wallet_address: userAddress }
        });
        console.log(`✅ Created new user: ${user.id}`);
      }

      // Process content through Gemini to get summary and metadata
      console.log(`🔄 Processing content through Gemini...`);
      const [summary, extractedMetadata] = await Promise.all([
        geminiService.summarizeContent(content, metadata),
        geminiService.extractContentMetadata(content, metadata)
      ]);
      
      console.log(`📊 Extracted metadata:`, extractedMetadata);
      
      // Hash the summary (ensure it has 0x prefix for blockchain)
      const memoryHash = '0x' + createHash('sha256').update(summary).digest('hex');
      
      // Hash the URL (ensure it has 0x prefix for blockchain)
      const urlHash = hashUrl(url || 'unknown');
      
      // Create timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Store in database with enhanced metadata
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
            searchable_terms: extractedMetadata.searchableTerms
          }
        }
      });

      console.log(`✅ Created memory in database: ${memory.id}`);

      // Store on blockchain
      const memoryData: MemoryData = {
        hash: memoryHash,
        urlHash: urlHash,
        timestamp: timestamp
      };

      console.log(`🚀 Storing memory on blockchain...`);
      const blockchainResult = await storeMemoryBatch([memoryData]);
      
      // Update memory with blockchain transaction details
      if (blockchainResult.success) {
        await prisma.memory.update({
          where: { id: memory.id },
          data: {
            tx_hash: blockchainResult.txHash,
            block_number: blockchainResult.blockNumber ? BigInt(blockchainResult.blockNumber) : null,
            gas_used: blockchainResult.gasUsed,
            tx_status: 'confirmed' as any,
            blockchain_network: 'sepolia',
            confirmed_at: new Date()
          } as any
        });
        console.log(`✅ Updated memory with blockchain transaction: ${blockchainResult.txHash}`);
      } else {
        // Update status to failed if blockchain storage failed
        await prisma.memory.update({
          where: { id: memory.id },
          data: {
            tx_status: 'failed' as any
          } as any
        });
        console.log(`❌ Blockchain storage failed for memory: ${memory.id}`);
      }

      res.status(200).json({
        success: true,
        message: "Content processed and stored successfully",
        data: {
          userAddress,
          memoryId: memory.id,
          memoryHash,
          urlHash,
          blockchainResult,
          transactionDetails: blockchainResult.success ? {
            txHash: blockchainResult.txHash,
            blockNumber: blockchainResult.blockNumber,
            gasUsed: blockchainResult.gasUsed,
            status: 'confirmed',
            network: 'sepolia'
          } : {
            status: 'failed'
          }
        }
      });

    } catch (error) {
      console.error("Error processing raw content:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process raw content"
      });
    }
  }

  // Store a single memory on blockchain
  static async storeMemory(req: Request, res: Response) {
    try {
      const { hash, url, timestamp } = req.body;
      
      if (!hash || !url || !timestamp) {
        return res.status(400).json({
          success: false,
          error: "Hash, URL, and timestamp are required"
        });
      }

      const result = await storeMemory(hash, url, timestamp);
      
      res.status(200).json({
        success: true,
        data: result,
        message: "Memory stored successfully"
      });
    } catch (error) {
      console.error("Error storing memory:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to store memory"
      });
    }
  }

  // Store multiple memories in a batch
  static async storeMemoryBatch(req: Request, res: Response) {
    try {
      const { memories } = req.body;
      
      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Memories array is required and cannot be empty"
        });
      }

          // Validate memory data structure
          for (const memory of memories) {
            if (!memory.hash || !memory.urlHash || !memory.timestamp) {
              return res.status(400).json({
                success: false,
                error: "Each memory must have hash, urlHash, and timestamp"
              });
            }
          }

      const result = await storeMemoryBatch(memories);
      
      res.status(200).json({
        success: true,
        data: result,
        message: "Memory batch stored successfully"
      });
    } catch (error) {
      console.error("Error storing memory batch:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to store memory batch"
      });
    }
  }

  // Get a specific memory by user and index
  static async getMemory(req: Request, res: Response) {
    try {
      const { userAddress, index } = req.params;
      
      if (!userAddress || index === undefined) {
        return res.status(400).json({
          success: false,
          error: "User address and index are required"
        });
      }

      const memory = await getMemory(userAddress, parseInt(index));
      
      res.status(200).json({
        success: true,
        data: memory
      });
    } catch (error) {
      console.error("Error getting memory:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get memory"
      });
    }
  }

  // Get all memories for a user
  static async getUserMemories(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "User address is required"
        });
      }

      const memories = await getUserMemories(userAddress);
      
      res.status(200).json({
        success: true,
        data: {
          userAddress,
          memories,
          count: memories.length
        }
      });
    } catch (error) {
      console.error("Error getting user memories:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user memories"
      });
    }
  }

  // Check if a memory exists
  static async isMemoryStored(req: Request, res: Response) {
    try {
      const { hash } = req.params;
      
      if (!hash) {
        return res.status(400).json({
          success: false,
          error: "Memory hash is required"
        });
      }

      const exists = await isMemoryStored(hash);
      
      res.status(200).json({
        success: true,
        data: {
          hash,
          exists
        }
      });
    } catch (error) {
      console.error("Error checking if memory is stored:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to check if memory is stored"
      });
    }
  }

  // Get memories by URL hash
  static async getMemoriesByUrlHash(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;
      const { url } = req.query;
      
      if (!userAddress || !url) {
        return res.status(400).json({
          success: false,
          error: "User address and URL are required"
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
          count: memories.length
        }
      });
    } catch (error) {
      console.error("Error getting memories by URL:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get memories by URL"
      });
    }
  }

  // Get memories by timestamp range
  static async getMemoriesByTimestampRange(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;
      const { startTime, endTime } = req.query;
      
      if (!userAddress || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: "User address, start time, and end time are required"
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
          count: memories.length
        }
      });
    } catch (error) {
      console.error("Error getting memories by timestamp range:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get memories by timestamp range"
      });
    }
  }

  // Get recent memories
  static async getRecentMemories(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;
      const { count } = req.query;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "User address is required"
        });
      }

      const limit = count ? parseInt(count as string) : 10;
      const memories = await getRecentMemories(userAddress, limit);
      
      res.status(200).json({
        success: true,
        data: {
          userAddress,
          count: limit,
          memories,
          actualCount: memories.length
        }
      });
    } catch (error) {
      console.error("Error getting recent memories:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get recent memories"
      });
    }
  }

  // Get memory by hash
  static async getMemoryByHash(req: Request, res: Response) {
    try {
      const { hash } = req.params;
      
      if (!hash) {
        return res.status(400).json({
          success: false,
          error: "Memory hash is required"
        });
      }

      const memory = await getMemoryByHash(hash);
      
      res.status(200).json({
        success: true,
        data: memory
      });
    } catch (error) {
      console.error("Error getting memory by hash:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get memory by hash"
      });
    }
  }

  // Get user memory count
  static async getUserMemoryCount(req: Request, res: Response) {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "User address is required"
        });
      }

      const count = await getUserMemoryCount(userAddress);
      
      res.status(200).json({
        success: true,
        data: {
          userAddress,
          memoryCount: count
        }
      });
    } catch (error) {
      console.error("Error getting user memory count:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user memory count"
      });
    }
  }


  // Search memories with enhanced RAG capabilities
  static async searchMemories(req: Request, res: Response) {
    try {
      const { userAddress, query, category, topic, importance, sentiment, limit = 20 } = req.query;
      
      if (!userAddress || !query) {
        return res.status(400).json({
          success: false,
          error: "userAddress and query are required"
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress as string }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      // Build search conditions
      const whereConditions: any = {
        user_id: user.id
      };

      // Text search in content, summary, and title
      const searchQuery = query as string;
      whereConditions.OR = [
        { content: { contains: searchQuery, mode: 'insensitive' } },
        { summary: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } }
      ];

      // Filter by category if provided
      if (category) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          categories: { has: category }
        };
      }

      // Filter by topic if provided
      if (topic) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          topics: { has: topic }
        };
      }

      // Filter by importance if provided
      if (importance) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          importance: { gte: parseInt(importance as string) }
        };
      }

      // Filter by sentiment if provided
      if (sentiment) {
        whereConditions.page_metadata = {
          ...whereConditions.page_metadata,
          sentiment: sentiment
        };
      }

      const memories = await prisma.memory.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string)
      });

      // Generate searchable terms for the query using Gemini
      let searchableTerms: string[] = [];
      try {
        const queryMetadata = await geminiService.extractContentMetadata(searchQuery, {
          content_type: 'search_query',
          title: 'Search Query'
        });
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
          totalResults: memories.length
        }
      });
    } catch (error) {
      console.error('Error searching memories:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }

  // Get memory insights and analytics
  static async getMemoryInsights(req: Request, res: Response) {
    try {
      const { userAddress } = req.query;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "userAddress is required"
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress as string }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      // Get all memories for the user
      const memories = await prisma.memory.findMany({
        where: { user_id: user.id },
        select: {
          page_metadata: true,
          timestamp: true,
          source: true
        }
      });

      // Analyze topics and categories
      const topicCounts: { [key: string]: number } = {};
      const categoryCounts: { [key: string]: number } = {};
      const sentimentCounts: { [key: string]: number } = {};
      const sourceCounts: { [key: string]: number } = {};
      let totalImportance = 0;
      let importanceCount = 0;

      memories.forEach(memory => {
        const metadata = memory.page_metadata as any;
        
        // Count topics
        if (metadata?.topics) {
          metadata.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }

        // Count categories
        if (metadata?.categories) {
          metadata.categories.forEach((category: string) => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }

        // Count sentiment
        if (metadata?.sentiment) {
          sentimentCounts[metadata.sentiment] = (sentimentCounts[metadata.sentiment] || 0) + 1;
        }

        // Count sources
        sourceCounts[memory.source] = (sourceCounts[memory.source] || 0) + 1;

        // Calculate average importance
        if (metadata?.importance) {
          totalImportance += metadata.importance;
          importanceCount++;
        }
      });

      // Sort and get top items
      const topTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      const averageImportance = importanceCount > 0 ? totalImportance / importanceCount : 0;

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
            dominantSentiment: Object.entries(sentimentCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral'
          }
        }
      });
    } catch (error) {
      console.error('Error getting memory insights:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }

  // Get memories with blockchain transaction details
  static async getMemoriesWithTransactionDetails(req: Request, res: Response) {
    try {
      const { userAddress, status, limit = 50 } = req.query;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "userAddress is required"
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress as string }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      // Build where conditions
      const whereConditions: any = {
        user_id: user.id
      };

      // Filter by transaction status if provided
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
          page_metadata: true
        } as any,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string)
      });

      // Get transaction statistics by querying all memories and counting manually
      const allMemories = await prisma.memory.findMany({
        where: { user_id: user.id },
        select: { tx_status: true } as any
      });

      const transactionStats: Record<string, number> = {};
      allMemories.forEach(memory => {
        const status = (memory as any).tx_status || 'unknown';
        transactionStats[status] = (transactionStats[status] || 0) + 1;
      });

      res.status(200).json({
        success: true,
        data: {
          memories,
          transactionStats,
          totalMemories: memories.length
        }
      });
    } catch (error) {
      console.error('Error getting memories with transaction details:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }

  // Get blockchain transaction status for a specific memory
  static async getMemoryTransactionStatus(req: Request, res: Response) {
    try {
      const { memoryId } = req.params;
      
      if (!memoryId) {
        return res.status(400).json({
          success: false,
          error: "memoryId is required"
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
          created_at: true
        } as any
      });

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: "Memory not found"
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
            createdAt: memory.created_at
          }
        }
      });
    } catch (error) {
      console.error('Error getting memory transaction status:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }

  // Retry failed blockchain transactions
  static async retryFailedTransactions(req: Request, res: Response) {
    try {
      const { userAddress, limit = 10 } = req.query;
      
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          error: "userAddress is required"
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: userAddress as string }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      // Get failed transactions
      const failedMemories = await prisma.memory.findMany({
        where: {
          user_id: user.id,
          tx_status: 'failed' as any
        } as any,
        take: parseInt(limit as string),
        orderBy: { created_at: 'asc' }
      });

      if (failedMemories.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No failed transactions found",
          data: { retriedCount: 0 }
        });
      }

      let retriedCount = 0;
      const results = [];

      for (const memory of failedMemories) {
        try {
          // Prepare memory data for blockchain
          const memoryData: MemoryData = {
            hash: memory.hash!,
            urlHash: hashUrl(memory.url || 'unknown'),
            timestamp: Number(memory.timestamp)
          };

          console.log(`🔄 Retrying blockchain storage for memory: ${memory.id}`);
          const blockchainResult = await storeMemoryBatch([memoryData]);

          if (blockchainResult.success) {
            // Update memory with successful transaction details
            await prisma.memory.update({
              where: { id: memory.id },
              data: {
                tx_hash: blockchainResult.txHash,
                block_number: blockchainResult.blockNumber ? BigInt(blockchainResult.blockNumber) : null,
                gas_used: blockchainResult.gasUsed,
                tx_status: 'confirmed' as any,
                blockchain_network: 'sepolia',
                confirmed_at: new Date()
              } as any
            });

            retriedCount++;
            results.push({
              memoryId: memory.id,
              status: 'success',
              txHash: blockchainResult.txHash
            });
            console.log(`✅ Successfully retried memory: ${memory.id}`);
          } else {
            results.push({
              memoryId: memory.id,
              status: 'failed',
              error: 'Blockchain storage failed'
            });
          }
        } catch (error) {
          console.error(`❌ Error retrying memory ${memory.id}:`, error);
          results.push({
            memoryId: memory.id,
            status: 'error',
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Retried ${retriedCount} out of ${failedMemories.length} failed transactions`,
        data: {
          retriedCount,
          totalFailed: failedMemories.length,
          results
        }
      });
    } catch (error) {
      console.error('Error retrying failed transactions:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }

  // Health check for blockchain connection
  static async healthCheck(req: Request, res: Response) {
    try {
      // Try to get a simple contract call to verify connection
      const testAddress = "0x0000000000000000000000000000000000000000";
      await getUserMemoryCount(testAddress);
      
      res.status(200).json({
        success: true,
        message: "Blockchain connection is healthy",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: "Blockchain connection is not available",
        details: error.message
      });
    }
  }
}