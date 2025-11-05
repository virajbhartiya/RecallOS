import { prisma } from '../lib/prisma';

export class MemoryQueryService {
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  static async getUserMemories(userId: string, options?: {
    limit?: number;
    skip?: number;
    orderBy?: 'asc' | 'desc';
    select?: any;
  }) {
    const {
      limit,
      skip,
      orderBy = 'desc',
      select,
    } = options || {};

    const where = { user_id: userId };
    const queryOptions: any = {
      where,
      orderBy: { created_at: orderBy },
    };

    if (limit) {
      queryOptions.take = limit;
    }
    if (skip) {
      queryOptions.skip = skip;
    }
    if (select) {
      queryOptions.select = select;
    }

    return prisma.memory.findMany(queryOptions);
  }

  static async getUserMemoryCount(userId: string): Promise<number> {
    return prisma.memory.count({
      where: { user_id: userId },
    });
  }

  static async getMemoryById(memoryId: string, userId?: string) {
    const where: any = { id: memoryId };
    if (userId) {
      where.user_id = userId;
    }
    return prisma.memory.findFirst({ where });
  }

  static async getMemoryByHash(hash: string) {
    return prisma.memory.findUnique({
      where: { hash },
    });
  }

  static async findDuplicateByCanonicalHash(userId: string, canonicalHash: string) {
    return prisma.memory.findFirst({
      where: { user_id: userId, canonical_hash: canonicalHash } as any,
    });
  }
}

