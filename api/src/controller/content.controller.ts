import { Request, Response, NextFunction } from 'express';
import { addContentJob, ContentJobData } from '../lib/queue';
import { prisma } from '../lib/prisma';
import AppError from '../utils/appError';

export const submitContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, raw_text, metadata } = req.body;

    // Validate required fields
    if (!user_id || !raw_text) {
      return next(new AppError('user_id and raw_text are required', 400));
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Validate raw_text length
    if (raw_text.length > 100000) {
      return next(new AppError('Content too large. Maximum 100,000 characters allowed.', 400));
    }

    // Enqueue job in Redis queue
    const jobData: ContentJobData = {
      user_id,
      raw_text,
      metadata: metadata || {}
    };

    const job = await addContentJob(jobData);

    res.status(202).json({
      status: 'success',
      message: 'Content queued for processing',
      jobId: job.id,
      data: {
        user_id,
        content_length: raw_text.length,
        metadata: jobData.metadata
      }
    });
  } catch (error) {
    console.error('Error submitting content:', error);
    next(error);
  }
};

export const getSummarizedContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const [content, total] = await Promise.all([
      prisma.summarizedContent.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          summary: true,
          created_at: true,
          original_text: true
        }
      }),
      prisma.summarizedContent.count({
        where: { user_id }
      })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        content: content.map((item: any) => ({
          ...item,
          original_text_length: item.original_text.length
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching summarized content:', error);
    next(error);
  }
};
