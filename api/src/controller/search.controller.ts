import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import { searchMemories } from '../services/memorySearch';
import { createSearchJob, getSearchJob } from '../services/searchJob';

export const postSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet, query, limit } = req.body || {};
    if (!wallet || !query) return next(new AppError('wallet and query are required', 400));
    // Create job id for async answer delivery
    const job = createSearchJob();
    ;(global as any).__currentSearchJobId = job.id
    const data = await searchMemories({ wallet, query, limit });
    // Attach job id; client can poll /api/search/job/:id for LLM answer
    res.status(200).json({ query: data.query, results: data.results, meta_summary: data.meta_summary, answer: data.answer, job_id: job.id });
  } catch (err) {
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


