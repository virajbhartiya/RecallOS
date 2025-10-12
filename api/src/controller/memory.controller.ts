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

      // Process content through Gemini to get summary
      console.log(`🔄 Processing content through Gemini...`);
      const summary = await geminiService.summarizeContent(content, metadata);
      
      // Hash the summary (ensure it has 0x prefix for blockchain)
      const memoryHash = '0x' + createHash('sha256').update(summary).digest('hex');
      
      // Hash the URL (ensure it has 0x prefix for blockchain)
      const urlHash = hashUrl(url || 'unknown');
      
      // Create timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Store in database
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
          page_metadata: metadata || {}
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

      res.status(200).json({
        success: true,
        message: "Content processed and stored successfully",
        data: {
          userAddress,
          memoryId: memory.id,
          memoryHash,
          urlHash,
          blockchainResult
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