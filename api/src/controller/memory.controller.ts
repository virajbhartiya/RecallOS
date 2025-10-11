import { Request, Response } from "express";
import { storeMemories, getMemoryStatus, getUserMemoryCount, getBatchMetadata, getMemoryProof } from "../services/blockchain";

export class MemoryController {
  // Store memories on blockchain
  static async storeMemories(req: Request, res: Response) {
    try {
      const { memories, userAddress } = req.body;
      
      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Memories array is required and cannot be empty"
        });
      }

      const result = await storeMemories(memories, userAddress);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error storing memories:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to store memories"
      });
    }
  }

  // Get memory verification status
  static async getMemoryStatus(req: Request, res: Response) {
    try {
      const { hash } = req.params;
      
      if (!hash) {
        return res.status(400).json({
          success: false,
          error: "Memory hash is required"
        });
      }

      const isVerified = await getMemoryStatus(hash);
      
      res.status(200).json({
        success: true,
        data: {
          hash,
          isVerified
        }
      });
    } catch (error) {
      console.error("Error getting memory status:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get memory status"
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

  // Get batch metadata
  static async getBatchMetadata(req: Request, res: Response) {
    try {
      const { merkleRoot } = req.params;
      
      if (!merkleRoot) {
        return res.status(400).json({
          success: false,
          error: "Merkle root is required"
        });
      }

      const metadata = await getBatchMetadata(merkleRoot);
      
      res.status(200).json({
        success: true,
        data: {
          merkleRoot,
          ...metadata
        }
      });
    } catch (error) {
      console.error("Error getting batch metadata:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get batch metadata"
      });
    }
  }

  // Generate proof for a specific memory
  static async generateProof(req: Request, res: Response) {
    try {
      const { memory, allMemories } = req.body;
      
      if (!memory || !allMemories || !Array.isArray(allMemories)) {
        return res.status(400).json({
          success: false,
          error: "Memory and allMemories array are required"
        });
      }

      const proof = getMemoryProof(memory, allMemories);
      
      res.status(200).json({
        success: true,
        data: proof
      });
    } catch (error) {
      console.error("Error generating proof:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate proof"
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