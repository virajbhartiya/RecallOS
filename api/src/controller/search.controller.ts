import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import AppError from '../utils/appError';
import { searchMemories } from '../services/memorySearch';
import { createSearchJob, getSearchJob } from '../services/searchJob';
import { prisma } from '../lib/prisma';

export const postSearch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let job: { id: string } | null = null;
  try {
    if (!req.user?.id) {
      return next(new AppError('Authentication required', 401));
    }

    const { query, limit, contextOnly } = req.body || {};
    if (!query) return next(new AppError('query is required', 400));
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Only create job for async answer delivery if not in context-only mode
    if (!contextOnly) {
      job = createSearchJob();
    }
    
    const data = await searchMemories({ userId: user.external_id || user.id, query, limit, contextOnly, jobId: job?.id });
    
    // Return response with appropriate fields
    const response: any = { 
      query: data.query, 
      results: data.results, 
      meta_summary: data.meta_summary, 
      answer: data.answer, 
      citations: data.citations,
      context: data.context
    };
    
    if (job) {
      response.job_id = job.id;
    }
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error in postSearch:', err);
    // Update search job status to failed if there's a job
    try {
      if (job?.id) {
        const { setSearchJobResult } = await import('../services/searchJob');
        await setSearchJobResult(job.id, { status: 'failed' });
      }
    } catch (jobError) {
      console.error('Error updating search job status in controller:', jobError);
    }
    next(err);
  }
};

export const getSearchJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) return next(new AppError('job id required', 400))
    const job = await getSearchJob(id)
    if (!job) return next(new AppError('job not found', 404))
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')
    res.set('ETag', `${Date.now()}`)
    res.status(200).json(job)
  } catch (err) {
    next(err)
  }
}

export const getContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(new AppError('Authentication required', 401));
    }

    const { query, limit } = req.body || {};
    if (!query) return next(new AppError('query is required', 400));

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    const data = await searchMemories({ userId: user.external_id || user.id, query, limit, contextOnly: true });
    
    res.status(200).json({
      query: data.query,
      context: data.context || 'No relevant memories found.',
      resultCount: data.results.length
    });
  } catch (err) {
    next(err);
  }
};



