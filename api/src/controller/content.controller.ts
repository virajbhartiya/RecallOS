import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

import { addContentJob, ContentJobData } from '../lib/queue.lib'

import { prisma } from '../lib/prisma.lib'

import AppError from '../utils/app-error.util'
import { memoryIngestionService } from '../services/memory-ingestion.service'
import { logger } from '../utils/logger.util'
import { buildContentPreview } from '../utils/text.util'

export const submitContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = req.user!.id
    const raw_text = (req.body.raw_text ||
      req.body.content ||
      req.body.full_content ||
      req.body.meaningful_content) as string | undefined
    const metadata = {
      ...(req.body.metadata || {}),
      url: req.body.url || req.body.metadata?.url,
      title: req.body.title || req.body.metadata?.title,
      source: req.body.source || req.body.metadata?.source,
      content_type: req.body.content_type || req.body.metadata?.content_type,
      content_summary: req.body.content_summary || req.body.metadata?.content_summary,
    } as Record<string, unknown>

    if (!user_id || !raw_text) {
      return next(new AppError('user_id and raw_text are required', 400))
    }

    if (!req.user || req.user.id !== user_id) {
      return next(new AppError('User not authenticated', 401))
    }

    if (raw_text.length > 100000) {
      return next(new AppError('Content too large. Maximum 100,000 characters allowed.', 400))
    }

    const url = typeof metadata?.url === 'string' ? metadata.url : undefined

    const canonicalData = memoryIngestionService.canonicalizeContent(raw_text, url)

    const jobData: ContentJobData = {
      user_id,
      raw_text,
      metadata: metadata || {},
    }

    const [duplicateCheck, job] = await Promise.all([
      memoryIngestionService.findDuplicateMemory({
        userId: user_id,
        canonicalHash: canonicalData.canonicalHash,
        canonicalText: canonicalData.canonicalText,
        url,
      }),
      addContentJob(jobData, {
        canonicalText: canonicalData.canonicalText,
        canonicalHash: canonicalData.canonicalHash,
      }),
    ])

    if (duplicateCheck) {
      const merged = await memoryIngestionService.mergeDuplicateMemory(
        duplicateCheck.memory,
        metadata
      )
      const serializedExisting = {
        ...merged,
        timestamp: merged.timestamp ? merged.timestamp.toString() : null,
      }
      logger.log(
        `[Content] skip duplicate user=${user_id} memory=${merged.id} reason=${duplicateCheck.reason}`
      )
      return res.status(200).json({
        status: 'success',
        message: 'Duplicate memory detected, returning existing record',
        data: {
          userId: user_id,
          memory: serializedExisting,
          isDuplicate: true,
        },
      })
    }

    if (job.isDuplicate) {
      logger.log(
        `[Content] skip queued-duplicate job=${job.id} user=${user_id} len=${raw_text.length} source=${metadata?.source || 'unknown'}`
      )

      return res.status(200).json({
        status: 'success',
        message: 'Duplicate content detected in queue, returning existing job',
        jobId: job.id,
        isDuplicate: true,
        data: {
          user_id,
          content_length: raw_text.length,
          metadata: jobData.metadata,
        },
      })
    }

    logger.log(
      `[Content] queued job=${job.id} user=${user_id} len=${raw_text.length} source=${metadata?.source || 'unknown'}`
    )

    res.status(202).json({
      status: 'success',
      message: 'Content queued for processing',
      jobId: job.id,
      data: {
        user_id,
        content_length: raw_text.length,
        metadata: jobData.metadata,
      },
    })
  } catch (error) {
    logger.error('Error submitting content:', error)
    next(error)
  }
}

export const getSummarizedContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const limitNum = Math.min(Number(limit), 100)
    const skip = (Number(page) - 1) * limitNum

    if (!req.user) {
      return next(new AppError('User not authenticated', 401))
    }

    const userId = req.user.id

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          created_at: true,
          content: true,
          title: true,
          url: true,
        },
      }),
      prisma.memory.count({
        where: { user_id: userId },
      }),
    ])

    res.status(200).json({
      status: 'success',
      data: {
        content: memories.map(memory => ({
          id: memory.id,
          created_at: memory.created_at,
          original_text: memory.content,
          original_text_length: memory.content.length,
          preview: buildContentPreview(memory.content),
          title: memory.title,
          url: memory.url,
        })),
        pagination: {
          page: Number(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching summarized content:', error)
    next(error)
  }
}
