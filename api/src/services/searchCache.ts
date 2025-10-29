import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface SearchCacheResult {
  query: string;
  results: any[];
  meta_summary?: string;
  answer?: string;
  citations?: any[];
  job_id?: string;
}

export class SearchCacheService {
  /**
   * Generate a hash for the search query to use as cache key
   */
  private static generateQueryHash(userId: string, query: string): string {
    return crypto.createHash('sha256').update(`${userId}:${query}`).digest('hex');
  }

  /**
   * Check if a cached search result exists and is still valid
   */
  static async getCachedResult(userId: string, query: string): Promise<SearchCacheResult | null> {
    try {
      const queryHash = this.generateQueryHash(userId, query);
      const now = new Date();
      
      const cachedResult = await prisma.searchCache.findFirst({
        where: {
          query_hash: queryHash,
          user_id: userId,
          expires_at: {
            gt: now
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (cachedResult) {
        return {
          query: cachedResult.query,
          results: cachedResult.results as any[],
          meta_summary: cachedResult.meta_summary || undefined,
          answer: cachedResult.answer || undefined,
          citations: cachedResult.citations as any[] || undefined,
          job_id: cachedResult.job_id || undefined
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting cached search result:', error);
      return null;
    }
  }

  /**
   * Store a search result in the cache with 30-minute expiry
   */
  static async setCachedResult(
    userId: string, 
    query: string, 
    result: SearchCacheResult
  ): Promise<void> {
    try {
      const queryHash = this.generateQueryHash(userId, query);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

      await prisma.searchCache.upsert({
        where: {
          query_hash: queryHash
        },
        update: {
          results: result.results,
          meta_summary: result.meta_summary,
          answer: result.answer,
          citations: result.citations,
          job_id: result.job_id,
          expires_at: expiresAt,
          created_at: new Date()
        },
        create: {
          user_id: userId,
          query,
          query_hash: queryHash,
          results: result.results,
          meta_summary: result.meta_summary,
          answer: result.answer,
          citations: result.citations,
          job_id: result.job_id,
          expires_at: expiresAt
        }
      });
    } catch (error) {
      console.error('Error setting cached search result:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanupExpiredCache(): Promise<void> {
    try {
      const now = new Date();
      await prisma.searchCache.deleteMany({
        where: {
          expires_at: {
            lt: now
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Clear cache for a specific user
   */
  static async clearUserCache(userId: string): Promise<void> {
    try {
      await prisma.searchCache.deleteMany({
        where: {
          user_id: userId
        }
      });
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }
}
