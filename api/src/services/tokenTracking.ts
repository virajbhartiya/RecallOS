import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export type OperationType =
  | 'summarize'
  | 'extract_metadata'
  | 'generate_content'
  | 'generate_embedding'
  | 'search'
  | 'evaluate_relationship'

export interface TokenUsageRecord {
  userId: string
  operationType: OperationType
  inputTokens: number
  outputTokens: number
  modelUsed?: string
}

export const tokenTracking = {
  async recordTokenUsage(record: TokenUsageRecord): Promise<void> {
    try {
      await prisma.tokenUsage.create({
        data: {
          user_id: record.userId,
          operation_type: record.operationType,
          input_tokens: record.inputTokens,
          output_tokens: record.outputTokens,
          model_used: record.modelUsed || null,
        } as any,
      })
    } catch (error) {
      logger.error('Error recording token usage:', error)
    }
  },

  async getTokenUsageByUser(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { user_id: userId }

    if (startDate || endDate) {
      where.created_at = {}
      if (startDate) {
        where.created_at.gte = startDate
      }
      if (endDate) {
        where.created_at.lte = endDate
      }
    }

    return await prisma.tokenUsage.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })
  },

  async getTokenUsageAggregated(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { user_id: userId }

    if (startDate || endDate) {
      where.created_at = {}
      if (startDate) {
        where.created_at.gte = startDate
      }
      if (endDate) {
        where.created_at.lte = endDate
      }
    }

    const records = await prisma.tokenUsage.findMany({
      where,
    })

    const totalInput = records.reduce((sum, r) => sum + r.input_tokens, 0)
    const totalOutput = records.reduce((sum, r) => sum + r.output_tokens, 0)
    const total = totalInput + totalOutput

    const byOperation: Record<
      string,
      { input: number; output: number; total: number; count: number }
    > = {}

    records.forEach(r => {
      const op = r.operation_type
      if (!byOperation[op]) {
        byOperation[op] = { input: 0, output: 0, total: 0, count: 0 }
      }
      byOperation[op].input += r.input_tokens
      byOperation[op].output += r.output_tokens
      byOperation[op].total += r.input_tokens + r.output_tokens
      byOperation[op].count += 1
    })

    return {
      total,
      totalInput,
      totalOutput,
      count: records.length,
      byOperation,
    }
  },

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  },
}
