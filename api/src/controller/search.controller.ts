import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import { searchMemories } from '../services/memorySearch';
import { createSearchJob, getSearchJob } from '../services/searchJob';
import { SearchCacheService } from '../services/searchCache';

export const postSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet, query, limit, contextOnly } = req.body || {};
    if (!wallet || !query) return next(new AppError('wallet and query are required', 400));
    
 
    if (!contextOnly) {
      const cachedResult = await SearchCacheService.getCachedResult(wallet, query);
      if (cachedResult) {
        console.log('Returning cached search result for query:', query);

        const delay = Math.random() * 1000 + 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return res.status(200).json(cachedResult);
      }
    }
    
    // Only create job for async answer delivery if not in context-only mode
    let job = null;
    if (!contextOnly) {
      job = createSearchJob();
      ;(global as any).__currentSearchJobId = job.id;
    }
    
    const data = await searchMemories({ wallet, query, limit, contextOnly });
    
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
    
    // Cache the result if not context-only
    if (!contextOnly) {
      await SearchCacheService.setCachedResult(wallet, query, response);
      console.log('Cached search result for query:', query);
    }
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error in postSearch:', err);
    // Update search job status to failed if there's a job
    try {
      const jobId = (global as any).__currentSearchJobId as string | undefined;
      if (jobId) {
        const { setSearchJobResult } = await import('../services/searchJob');
        await setSearchJobResult(jobId, { status: 'failed' });
        (global as any).__currentSearchJobId = undefined;
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

export const getContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet, query, limit } = req.body || {};
    if (!wallet || !query) return next(new AppError('wallet and query are required', 400));
    
    const data = await searchMemories({ wallet, query, limit, contextOnly: true });
    
    res.status(200).json({
      query: data.query,
      context: data.context || 'No relevant memories found.',
      resultCount: data.results.length
    });
  } catch (err) {
    next(err);
  }
};

export const clearSearchCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet } = req.params;
    if (!wallet) return next(new AppError('wallet parameter is required', 400));
    
    await SearchCacheService.clearWalletCache(wallet);
    
    res.status(200).json({
      message: 'Search cache cleared successfully',
      wallet: wallet
    });
  } catch (err) {
    next(err);
  }
};

export const cleanupSearchCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await SearchCacheService.cleanupExpiredCache();
    
    res.status(200).json({
      message: 'Expired search cache entries cleaned up successfully'
    });
  } catch (err) {
    next(err);
  }
};


