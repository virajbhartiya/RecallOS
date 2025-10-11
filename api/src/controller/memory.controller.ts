import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { addContentJob, ContentJobData } from "../lib/queue";
import { memoryMeshService } from "../services/memoryMesh";

const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};


export const captureMemory = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      source, 
      url, 
      title, 
      content_snippet, 
      timestamp, 
      wallet_address,
      full_content,
      meaningful_content,
      content_summary,
      content_type,
      key_topics,
      reading_time,
      page_metadata,
      page_structure,
      user_activity,
      content_quality
    } = req.body;

    // Validate required fields
    if (!source || !url || !title || !content_snippet || !timestamp) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: source, url, title, content_snippet, timestamp"
      });
    }

    try {
      let user = await prisma.user.findUnique({
        where: { wallet_address: wallet_address || 'anonymous' }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            wallet_address: wallet_address || 'anonymous'
          }
        });
      }

      // Store memory in database first
      const memory = await prisma.memory.create({
        data: {
          user_id: user.id,
          source,
          url,
          title,
          content: content_snippet,
          timestamp: BigInt(timestamp),
          full_content: meaningful_content || full_content || null,
          page_metadata: page_metadata ? {
            ...page_metadata,
            content_type,
            key_topics,
            reading_time,
            content_quality
          } : {
            content_type,
            key_topics,
            reading_time,
            content_quality
          },
          page_structure: page_structure || null,
          user_activity: user_activity || null
        }
      });

      // Queue content for Gemini processing
      const contentToProcess = meaningful_content || full_content || content_snippet;
      if (contentToProcess && contentToProcess.length > 0) {
        const jobData: ContentJobData = {
          user_id: user.id,
          raw_text: contentToProcess,
          metadata: {
            url: url,
            timestamp: timestamp,
            memory_id: memory.id,
            source: source,
            title: title,
            content_type: content_type,
            content_summary: content_summary
          }
        };

        const job = await addContentJob(jobData);
        console.log(`Queued memory ${memory.id} for Gemini processing with job ${job.id}`);
      }

      res.status(200).json({
        status: "success",
        message: "Memory captured and queued for processing",
        data: {
          id: memory.id,
          user_id: user.id,
          source: memory.source,
          url: memory.url,
          title: memory.title,
          content: memory.content,
          timestamp: memory.timestamp.toString(),
          created_at: memory.created_at,
          processing_status: "queued"
        }
      });

    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to store memory in database",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getMemory = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Memory ID is required"
      });
    }

    try {
      const memory = await prisma.memory.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              wallet_address: true,
              created_at: true
            }
          },
          embeddings: true
        }
      });

      if (!memory) {
        return res.status(404).json({
          status: "error",
          message: "Memory not found"
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          ...memory,
          timestamp: memory.timestamp.toString()
        }
      });

    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve memory",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getUserMemories = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { wallet_address } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!wallet_address) {
      return res.status(400).json({
        status: "error",
        message: "Wallet address is required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { wallet_address }
      });

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found"
        });
      }

      const memories = await prisma.memory.findMany({
        where: { user_id: user.id },
        include: {
          embeddings: true
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      const total = await prisma.memory.count({
        where: { user_id: user.id }
      });

      res.status(200).json({
        status: "success",
        data: {
          memories: memories.map((memory: any) => ({
            ...memory,
            timestamp: memory.timestamp.toString()
          })),
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: total > parseInt(offset as string) + parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve user memories",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getMemoryMesh = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { wallet_address } = req.params;
    const { limit = 50 } = req.query;

    if (!wallet_address) {
      return res.status(400).json({
        status: "error",
        message: "Wallet address is required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { wallet_address }
      });

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found"
        });
      }

      const memoryMesh = await memoryMeshService.getMemoryMesh(user.id, parseInt(limit as string));

      res.status(200).json({
        status: "success",
        data: memoryMesh
      });

    } catch (error) {
      console.error('Error getting memory mesh:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve memory mesh",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const searchMemories = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { wallet_address } = req.params;
    const { q: query, limit = 10 } = req.query;

    if (!wallet_address) {
      return res.status(400).json({
        status: "error",
        message: "Wallet address is required"
      });
    }

    if (!query) {
      return res.status(400).json({
        status: "error",
        message: "Search query is required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { wallet_address }
      });

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found"
        });
      }

      const searchResults = await memoryMeshService.searchMemories(
        user.id,
        query as string,
        parseInt(limit as string)
      );

      res.status(200).json({
        status: "success",
        data: {
          query,
          results: searchResults,
          count: searchResults.length
        }
      });

    } catch (error) {
      console.error('Error searching memories:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to search memories",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getRelatedMemories = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Memory ID is required"
      });
    }

    try {
      const memory = await prisma.memory.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!memory) {
        return res.status(404).json({
          status: "error",
          message: "Memory not found"
        });
      }

      const relatedMemories = await memoryMeshService.findRelatedMemories(
        id,
        memory.user_id,
        parseInt(limit as string)
      );

      res.status(200).json({
        status: "success",
        data: {
          memory_id: id,
          related_memories: relatedMemories,
          count: relatedMemories.length
        }
      });

    } catch (error) {
      console.error('Error getting related memories:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve related memories",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getMemoryProof = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Memory ID is required"
      });
    }

    try {
      // First check if it's a memory with a hash
      const memory = await prisma.memory.findUnique({
        where: { id },
        select: { hash: true }
      });

      if (!memory) {
        return res.status(404).json({
          status: "error",
          message: "Memory not found"
        });
      }

      if (!memory.hash) {
        return res.status(404).json({
          status: "error",
          message: "Memory has not been anchored yet"
        });
      }

      // Find the memory snapshot with cross-chain proofs
      const memorySnapshot = await prisma.memorySnapshot.findUnique({
        where: { summary_hash: memory.hash }
      });

      if (!memorySnapshot) {
        return res.status(404).json({
          status: "error",
          message: "Memory snapshot not found"
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          summary_hash: memorySnapshot.summary_hash,
          nexus_commit_hash: memorySnapshot.nexus_commit_hash,
          cross_chain_proofs: memorySnapshot.cross_chain_proofs,
          created_at: memorySnapshot.created_at
        }
      });

    } catch (error) {
      console.error('Error getting memory proof:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve memory proof",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });

export const getMemorySnapshotProof = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Memory snapshot ID is required"
      });
    }

    try {
      const memorySnapshot = await prisma.memorySnapshot.findUnique({
        where: { id }
      });

      if (!memorySnapshot) {
        return res.status(404).json({
          status: "error",
          message: "Memory snapshot not found"
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          summary_hash: memorySnapshot.summary_hash,
          nexus_commit_hash: memorySnapshot.nexus_commit_hash,
          cross_chain_proofs: memorySnapshot.cross_chain_proofs,
          created_at: memorySnapshot.created_at
        }
      });

    } catch (error) {
      console.error('Error getting memory snapshot proof:', error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve memory snapshot proof",
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  });
