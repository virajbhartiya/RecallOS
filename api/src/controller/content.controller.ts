import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

import { addContentJob, ContentJobData, contentQueue } from '../lib/queue.lib'

import { prisma } from '../lib/prisma.lib'

import AppError from '../utils/app-error.util'
import { normalizeText, hashCanonical, normalizeUrl, calculateSimilarity } from '../utils/text.util'
import { logger } from '../utils/logger.util'

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

    // Duplicate check before queueing to avoid unnecessary processing
    const canonicalText = normalizeText(raw_text)
    const canonicalHash = hashCanonical(canonicalText)

    const existingByCanonical = await prisma.memory.findFirst({
      where: { user_id, canonical_hash: canonicalHash },
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
      },
    })

    if (existingByCanonical) {
      const serializedExisting = {
        ...existingByCanonical,
        timestamp: existingByCanonical.timestamp ? existingByCanonical.timestamp.toString() : null,
      }
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

    // Fallback: Check for URL-based duplicates within the last hour (for dynamic content)
    const url = typeof metadata?.url === 'string' ? metadata.url : undefined
    if (url && url !== 'unknown') {
      const normalizedUrl = normalizeUrl(url)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const recentMemories = await prisma.memory.findMany({
        where: {
          user_id,
          created_at: { gte: oneHourAgo },
        },
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
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      })

      for (const existingMemory of recentMemories) {
        const existingUrl = existingMemory.url
        if (
          existingUrl &&
          typeof existingUrl === 'string' &&
          normalizeUrl(existingUrl) === normalizedUrl
        ) {
          const existingCanonical = normalizeText(existingMemory.content || '')
          const similarity = calculateSimilarity(canonicalText, existingCanonical)

          if (similarity > 0.9) {
            const serializedExisting = {
              ...existingMemory,
              timestamp: existingMemory.timestamp ? existingMemory.timestamp.toString() : null,
            }
            logger.log(
              `[Content] skip url-duplicate user=${user_id} memory=${existingMemory.id} similarity=${similarity.toFixed(3)}`
            )
            return res.status(200).json({
              status: 'success',
              message: 'Duplicate memory detected by URL similarity, returning existing record',
              data: {
                userId: user_id,
                memory: serializedExisting,
                isDuplicate: true,
              },
            })
          }
        }
      }
    }

    const jobData: ContentJobData = {
      user_id,
      raw_text,
      metadata: metadata || {},
    }

    const job = await addContentJob(jobData)

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
          summary: true,
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
          summary: memory.summary,
          created_at: memory.created_at,
          original_text: memory.content,
          original_text_length: memory.content.length,
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

export const getPendingJobs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [waiting, active, delayed] = await Promise.all([
      contentQueue.getWaiting(),
      contentQueue.getActive(),
      contentQueue.getDelayed(),
    ])

    const waitingJobs = waiting.map(job => ({ job, status: 'waiting' as const }))
    const activeJobs = active.map(job => ({ job, status: 'active' as const }))
    const delayedJobs = delayed.map(job => ({ job, status: 'delayed' as const }))

    let allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs]

    allJobs = allJobs.filter(item => item.job.data.user_id === req.user!.id)

    const jobs = allJobs
      .map(item => ({
        id: item.job.id,
        user_id: item.job.data.user_id,
        raw_text:
          item.job.data.raw_text?.substring(0, 200) +
          (item.job.data.raw_text && item.job.data.raw_text.length > 200 ? '...' : ''),
        full_text_length: item.job.data.raw_text?.length || 0,
        metadata: item.job.data.metadata || {},
        status: item.status,
        created_at: new Date(item.job.timestamp).toISOString(),
        processed_on: item.job.processedOn ? new Date(item.job.processedOn).toISOString() : null,
        finished_on: item.job.finishedOn ? new Date(item.job.finishedOn).toISOString() : null,
        failed_reason: item.job.failedReason || null,
        attempts: item.job.attemptsMade,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

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
    })
  } catch (error) {
    logger.error('Error fetching pending jobs:', error)
    next(error)
  }
}

export const deletePendingJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return next(new AppError('Job ID is required', 400))
    }

    const job = await contentQueue.getJob(jobId)

    if (!job) {
      return next(new AppError('Job not found', 404))
    }

    if (job.data.user_id !== req.user!.id) {
      return next(new AppError('You do not have permission to delete this job', 403))
    }

    await job.remove()

    res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully',
      data: {
        jobId,
      },
    })
  } catch (error) {
    logger.error('Error deleting pending job:', error)
    next(error)
  }
}
