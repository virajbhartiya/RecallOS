import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import { searchMemories } from '../services/memorySearch';

export const postSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wallet, query, limit } = req.body || {};
    if (!wallet || !query) return next(new AppError('wallet and query are required', 400));
    const data = await searchMemories({ wallet, query, limit });
    res.status(200).json({ query: data.query, results: data.results, meta_summary: data.meta_summary });
  } catch (err) {
    next(err);
  }
};


