import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

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
      page_metadata,
      page_structure,
      user_activity
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

      const memory = await prisma.memory.create({
        data: {
          user_id: user.id,
          source,
          url,
          title,
          content: content_snippet,
          timestamp: BigInt(timestamp),
          full_content: full_content || null,
          page_metadata: page_metadata || null,
          page_structure: page_structure || null,
          user_activity: user_activity || null
        }
      });

      res.status(200).json({
        status: "success",
        message: "Memory captured and stored successfully",
        data: {
          id: memory.id,
          user_id: user.id,
          source: memory.source,
          url: memory.url,
          title: memory.title,
          content: memory.content,
          timestamp: memory.timestamp.toString(),
          created_at: memory.created_at
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
          embeddings: true,
          avail_commits: true
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
          embeddings: true,
          avail_commits: true
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
