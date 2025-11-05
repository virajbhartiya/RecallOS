import { Request, Response, NextFunction } from 'express';

import { addContentJob, ContentJobData, contentQueue } from '../lib/queue';

import { prisma } from '../lib/prisma';

import AppError from '../utils/appError';

export const submitContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = (req.body.user_id || (req as any).user?.id || req.body.userId) as string | undefined;
    const raw_text = (req.body.raw_text || req.body.content || req.body.full_content || req.body.meaningful_content) as string | undefined;
    const metadata = {
      ...(req.body.metadata || {}),
      url: req.body.url || req.body.metadata?.url,
      title: req.body.title || req.body.metadata?.title,
      source: req.body.source || req.body.metadata?.source,
      content_type: req.body.content_type || req.body.metadata?.content_type,
      content_summary: req.body.content_summary || req.body.metadata?.content_summary,
    } as Record<string, unknown>;

    if (!user_id || !raw_text) {
      return next(new AppError('user_id and raw_text are required', 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (raw_text.length > 100000) {
      return next(
        new AppError(
          'Content too large. Maximum 100,000 characters allowed.',
          400
        )
      );
    }

    const jobData: ContentJobData = {
      user_id,
      raw_text,
      metadata: metadata || {},
    };

    const job = await addContentJob(jobData);
    
    console.log(`[Content API] Content submitted and queued for processing`, {
      jobId: job.id,
      userId: user_id,
      contentLength: raw_text.length,
      source: metadata?.source || 'unknown',
      url: metadata?.url || 'unknown',
      timestamp: new Date().toISOString(),
    });

    res.status(202).json({
      status: 'success',
      message: 'Content queued for processing',
      jobId: job.id,
      data: {
        user_id,
        content_length: raw_text.length,
        metadata: jobData.metadata,
      },
    });
  } catch (error) {
    console.error('Error submitting content:', error);
    next(error);
  }
};

export const getSummarizedContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id } = req.params;

    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          summary: true,
          created_at: true,
          content: true,
          title: true,
          url: true,
        },
      }),
      prisma.memory.count({
        where: { user_id },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        content: memories.map((memory: any) => ({
          id: memory.id,
          summary: memory.summary,
          created_at: memory.created_at,
          original_text: memory.content,
          original_text_length: memory.content.length,
          title: memory.title,
          url: memory.url,
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
    console.error('Error fetching summarized content:', error);
    next(error);
  }
};

export const getPendingJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id } = req.query;

    const [waiting, active, delayed] = await Promise.all([
      contentQueue.getWaiting(),
      contentQueue.getActive(),
      contentQueue.getDelayed(),
    ]);

    const waitingJobs = waiting.map((job) => ({ job, status: 'waiting' as const }));
    const activeJobs = active.map((job) => ({ job, status: 'active' as const }));
    const delayedJobs = delayed.map((job) => ({ job, status: 'delayed' as const }));

    let allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs];

    if (user_id) {
      allJobs = allJobs.filter((item) => item.job.data.user_id === user_id);
    }

    const jobs = allJobs
      .map((item) => ({
        id: item.job.id,
        user_id: item.job.data.user_id,
        raw_text: item.job.data.raw_text?.substring(0, 200) + (item.job.data.raw_text && item.job.data.raw_text.length > 200 ? '...' : ''),
        full_text_length: item.job.data.raw_text?.length || 0,
        metadata: item.job.data.metadata || {},
        status: item.status,
        created_at: new Date(item.job.timestamp).toISOString(),
        processed_on: item.job.processedOn ? new Date(item.job.processedOn).toISOString() : null,
        finished_on: item.job.finishedOn ? new Date(item.job.finishedOn).toISOString() : null,
        failed_reason: item.job.failedReason || null,
        attempts: item.job.attemptsMade,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        counts: {
          total: jobs.length,
          waiting: waiting.length,
          active: active.length,
          delayed: delayed.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching pending jobs:', error);
    next(error);
  }
};
