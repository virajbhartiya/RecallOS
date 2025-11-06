import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { tokenTracking } from '../services/tokenTracking';

function extractDomain(url: string | null | undefined): string | null {
  if (!url || url === 'unknown') return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export class AnalyticsController {
  static async getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const userId = user.id;

      const [
        memories,
        memoryRelations,
        memorySnapshots,
        queryEvents,
        tokenUsageRecords,
      ] = await Promise.all([
        prisma.memory.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            url: true,
            source: true,
            content: true,
            created_at: true,
            page_metadata: true,
          },
        }),
        prisma.memoryRelation.findMany({
          where: {
            memory: { user_id: userId },
          },
          select: {
            similarity_score: true,
          },
        }),
        prisma.memorySnapshot.findMany({
          where: { user_id: userId },
          select: {
            id: true,
          },
        }),
        prisma.queryEvent.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            created_at: true,
          },
        }),
        tokenTracking.getTokenUsageByUser(userId),
      ]);

      const domainCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      const topicCounts: Record<string, number> = {};
      const sentimentCounts: Record<string, number> = {};
      let totalContentLength = 0;
      const memoriesByDate: Record<string, number> = {};

      memories.forEach(memory => {
        const domain = extractDomain(memory.url);
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }

        sourceCounts[memory.source] = (sourceCounts[memory.source] || 0) + 1;

        const dateKey = memory.created_at.toISOString().split('T')[0];
        memoriesByDate[dateKey] = (memoriesByDate[dateKey] || 0) + 1;

        totalContentLength += memory.content?.length || 0;

        const metadata = memory.page_metadata as any;
        if (metadata?.categories) {
          metadata.categories.forEach((cat: string) => {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
        }
        if (metadata?.topics) {
          metadata.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
        if (metadata?.sentiment) {
          sentimentCounts[metadata.sentiment] = (sentimentCounts[metadata.sentiment] || 0) + 1;
        }
      });

      const topDomains = Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const tokenUsageAggregated = await tokenTracking.getTokenUsageAggregated(userId);

      const tokenUsageByDate: Record<string, { input: number; output: number; total: number }> = {};
      tokenUsageRecords.forEach(record => {
        const dateKey = record.created_at.toISOString().split('T')[0];
        if (!tokenUsageByDate[dateKey]) {
          tokenUsageByDate[dateKey] = { input: 0, output: 0, total: 0 };
        }
        tokenUsageByDate[dateKey].input += record.input_tokens;
        tokenUsageByDate[dateKey].output += record.output_tokens;
        tokenUsageByDate[dateKey].total += record.input_tokens + record.output_tokens;
      });

      const tokenUsageByOperation: Record<string, { input: number; output: number; total: number; count: number }> = {};
      tokenUsageRecords.forEach(record => {
        const op = record.operation_type;
        if (!tokenUsageByOperation[op]) {
          tokenUsageByOperation[op] = { input: 0, output: 0, total: 0, count: 0 };
        }
        tokenUsageByOperation[op].input += record.input_tokens;
        tokenUsageByOperation[op].output += record.output_tokens;
        tokenUsageByOperation[op].total += record.input_tokens + record.output_tokens;
        tokenUsageByOperation[op].count += 1;
      });

      const averageContentLength = memories.length > 0 ? totalContentLength / memories.length : 0;
      const averageConnectionsPerMemory = memories.length > 0 ? memoryRelations.length / memories.length : 0;
      const averageSnapshotsPerMemory = memories.length > 0 ? memorySnapshots.length / memories.length : 0;
      const averageTokensPerMemory = memories.length > 0 ? tokenUsageAggregated.total / memories.length : 0;

      const searchesByDate: Record<string, number> = {};
      queryEvents.forEach(event => {
        const dateKey = event.created_at.toISOString().split('T')[0];
        searchesByDate[dateKey] = (searchesByDate[dateKey] || 0) + 1;
      });

      const mostActiveDomain = topDomains[0]?.domain || null;
      const totalSearches = queryEvents.length;
      const averageResultsPerSearch = totalSearches > 0 ? memories.length / totalSearches : 0;

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalMemories: memories.length,
            totalTokens: tokenUsageAggregated.total,
            totalInputTokens: tokenUsageAggregated.totalInput,
            totalOutputTokens: tokenUsageAggregated.totalOutput,
            totalSearches,
            mostActiveDomain,
            averageContentLength: Math.round(averageContentLength),
            totalContentProcessed: totalContentLength,
          },
          tokenUsage: {
            total: tokenUsageAggregated.total,
            totalInput: tokenUsageAggregated.totalInput,
            totalOutput: tokenUsageAggregated.totalOutput,
            count: tokenUsageAggregated.count,
            byOperation: tokenUsageByOperation,
            byDate: tokenUsageByDate,
            averagePerMemory: Math.round(averageTokensPerMemory),
          },
          memoryStatistics: {
            total: memories.length,
            byDomain: domainCounts,
            bySource: sourceCounts,
            byDate: memoriesByDate,
            averageContentLength: Math.round(averageContentLength),
            totalContentProcessed: totalContentLength,
          },
          domainAnalytics: {
            topDomains,
            totalDomains: Object.keys(domainCounts).length,
            mostActiveDomain,
          },
          contentAnalytics: {
            averageContentLength: Math.round(averageContentLength),
            totalContentProcessed: totalContentLength,
            byCategory: categoryCounts,
            bySentiment: sentimentCounts,
          },
          searchAnalytics: {
            totalSearches,
            averageResultsPerSearch: Math.round(averageResultsPerSearch),
            byDate: searchesByDate,
          },
          activityAnalytics: {
            memoriesByDate,
            totalMemories: memories.length,
          },
          relationshipAnalytics: {
            totalRelations: memoryRelations.length,
            averageConnectionsPerMemory: Math.round(averageConnectionsPerMemory * 100) / 100,
            strongestRelations: memoryRelations
              .sort((a, b) => b.similarity_score - a.similarity_score)
              .slice(0, 10)
              .map(r => ({ similarity: r.similarity_score })),
          },
          snapshotAnalytics: {
            totalSnapshots: memorySnapshots.length,
            averageSnapshotsPerMemory: Math.round(averageSnapshotsPerMemory * 100) / 100,
          },
          categoryTopicAnalytics: {
            topCategories,
            topTopics,
            sentimentDistribution: sentimentCounts,
          },
        },
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get analytics',
      });
    }
  }
}

