import { prisma } from '../lib/prisma';

import { geminiService } from './gemini';

export class MemoryMeshService {
  async generateEmbeddingsForMemory(memoryId: string): Promise<void> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const embeddingPromises = [];

      if (memory.content) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.content, 'content')
        );
      }

      if (memory.summary) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.summary, 'summary')
        );
      }

      if (memory.title) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.title, 'title')
        );
      }

      await Promise.all(embeddingPromises);
      console.log(`Generated embeddings for memory ${memoryId}`);
    } catch (error) {
      console.error(
        `Error generating embeddings for memory ${memoryId}:`,
        error
      );
      throw error;
    }
  }

  private async createEmbedding(
    memoryId: string,
    text: string,
    type: string
  ): Promise<void> {
    try {
      const embedding = await geminiService.generateEmbedding(text);

      await prisma.embedding.create({
        data: {
          memory_id: memoryId,
          vector: embedding,
          model_name: 'text-embedding-004',
          embedding_type: type,
        },
      });
    } catch (error) {
      console.error(
        `Error creating ${type} embedding for memory ${memoryId}:`,
        error
      );
      throw error;
    }
  }

  async findRelatedMemories(
    memoryId: string,
    userId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        include: { embeddings: true },
      });

      if (!memory || !memory.embeddings.length) {
        return [];
      }

      const contentEmbedding = memory.embeddings.find(
        (e: any) => e.embedding_type === 'content'
      );

      if (!contentEmbedding) {
        return [];
      }

      const similarMemories = await this.findSimilarMemories(
        contentEmbedding.vector,
        userId,
        memoryId,
        limit
      );

      return similarMemories;
    } catch (error) {
      console.error(`Error finding related memories for ${memoryId}:`, error);
      throw error;
    }
  }

  private async findSimilarMemories(
    queryVector: number[],
    userId: string,
    excludeMemoryId: string,
    limit: number
  ): Promise<any[]> {
    try {
      const memories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: excludeMemoryId },
          embeddings: { some: { embedding_type: 'content' } },
        },
        include: {
          embeddings: {
            where: { embedding_type: 'content' },
          },
        },
      });

      const similarities = memories.map((memory: any) => {
        const embedding = memory.embeddings[0];

        if (!embedding) return { memory, similarity: 0 };

        const similarity = this.cosineSimilarity(queryVector, embedding.vector);

        return { memory, similarity };
      });

      return similarities
        .filter((item: any) => item.similarity > 0.3)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((item: any) => ({
          ...item.memory,
          similarity_score: item.similarity,
        }));
    } catch (error) {
      console.error('Error finding similar memories:', error);
      throw error;
    }
  }
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;

    let normA = 0;

    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async createMemoryRelations(memoryId: string, userId: string): Promise<void> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const [semanticRelations, topicalRelations, temporalRelations] =
        await Promise.all([
          this.findSemanticRelations(memoryId, userId, 8),
          this.findTopicalRelations(memoryId, userId, 5),
          this.findTemporalRelations(memoryId, userId, 3),
        ]);

      const allRelations = [
        ...semanticRelations.map(r => ({ ...r, relation_type: 'semantic' })),
        ...topicalRelations.map(r => ({ ...r, relation_type: 'topical' })),
        ...temporalRelations.map(r => ({ ...r, relation_type: 'temporal' })),
      ];

      const uniqueRelations = this.deduplicateRelations(allRelations);

      const relationPromises = uniqueRelations.map(async relatedMemory => {
        const existingRelation = await prisma.memoryRelation.findUnique({
          where: {
            memory_id_related_memory_id: {
              memory_id: memoryId,
              related_memory_id: relatedMemory.id,
            },
          },
        });

        if (!existingRelation) {
          await prisma.memoryRelation.create({
            data: {
              memory_id: memoryId,
              related_memory_id: relatedMemory.id,
              similarity_score: relatedMemory.similarity_score,
              relation_type: relatedMemory.relation_type,
            },
          });
        } else {
          if (
            relatedMemory.similarity_score > existingRelation.similarity_score
          ) {
            await prisma.memoryRelation.update({
              where: { id: existingRelation.id },
              data: {
                similarity_score: relatedMemory.similarity_score,
                relation_type: relatedMemory.relation_type,
              },
            });
          }
        }
      });

      await Promise.all(relationPromises);
      console.log(
        `Created ${uniqueRelations.length} memory relations for ${memoryId}`
      );
    } catch (error) {
      console.error(`Error creating memory relations for ${memoryId}:`, error);
      throw error;
    }
  }

  private async findSemanticRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    return this.findRelatedMemories(memoryId, userId, limit);
  }

  private async findTopicalRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory || !memory.page_metadata) {
        return [];
      }

      const metadata = memory.page_metadata as any;

      const topics = metadata.topics || [];

      const categories = metadata.categories || [];

      if (topics.length === 0 && categories.length === 0) {
        return [];
      }

      const relatedMemories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: memoryId },
          page_metadata: {
            path: ['topics'],
            array_contains: topics,
          },
        },
        take: limit * 2,
      });

      const topicalSimilarities = relatedMemories.map((relatedMemory: any) => {
        const relatedMetadata = relatedMemory.page_metadata as any;

        const relatedTopics = relatedMetadata?.topics || [];

        const relatedCategories = relatedMetadata?.categories || [];

        const topicOverlap = this.calculateSetOverlap(topics, relatedTopics);

        const categoryOverlap = this.calculateSetOverlap(
          categories,
          relatedCategories
        );

        const similarity = topicOverlap * 0.7 + categoryOverlap * 0.3;

        return {
          ...relatedMemory,
          similarity_score: similarity,
        };
      });

      return topicalSimilarities
        .filter(item => item.similarity_score > 0.2)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding topical relations:', error);

      return [];
    }
  }

  private async findTemporalRelations(
    memoryId: string,
    userId: string,
    limit: number
  ): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        return [];
      }

      const memoryTime = Number(memory.timestamp);

      const oneDay = 24 * 60 * 60;

      const oneWeek = 7 * oneDay;

      const temporalMemories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: memoryId },
          timestamp: {
            gte: BigInt(memoryTime - oneWeek),
            lte: BigInt(memoryTime + oneWeek),
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit * 2,
      });

      const temporalSimilarities = temporalMemories.map(
        (relatedMemory: any) => {
          const timeDiff = Math.abs(
            Number(relatedMemory.timestamp) - memoryTime
          );

          const similarity = Math.max(0, 1 - timeDiff / oneWeek);

          return {
            ...relatedMemory,
            similarity_score: similarity,
          };
        }
      );

      return temporalSimilarities
        .filter(item => item.similarity_score > 0.1)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding temporal relations:', error);

      return [];
    }
  }
  private calculateSetOverlap(setA: string[], setB: string[]): number {
    if (setA.length === 0 || setB.length === 0) return 0;

    const intersection = setA.filter(item => setB.includes(item));

    const union = [...new Set([...setA, ...setB])];

    return intersection.length / union.length;
  }
  private deduplicateRelations(relations: any[]): any[] {
    const seen = new Set();

    return relations.filter(relation => {
      const key = relation.id;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
  }

  async getMemoryMesh(userId: string, limit: number = 50): Promise<any> {
    try {
      const memories = await prisma.memory.findMany({
        where: { user_id: userId },
        include: {
          embeddings: true,
          related_memories: {
            include: {
              related_memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
            take: 5,
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      return {
        memories: memories.map((memory: any) => ({
          ...memory,
          related_count: memory.related_memories.length,
          has_embeddings: memory.embeddings.length > 0,
        })),
      };
    } catch (error) {
      console.error(`Error getting memory mesh for user ${userId}:`, error);
      throw error;
    }
  }

  async searchMemories(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const queryEmbedding = await geminiService.generateEmbedding(query);

      const similarMemories = await this.findSimilarMemories(
        queryEmbedding,
        userId,
        '',
        limit
      );

      return similarMemories;
    } catch (error) {
      console.error(`Error searching memories for user ${userId}:`, error);
      throw error;
    }
  }

  async processMemoryForMesh(memoryId: string, userId: string): Promise<void> {
    try {
      console.log(`Processing memory ${memoryId} for mesh integration...`);
      await this.generateEmbeddingsForMemory(memoryId);
      await this.createMemoryRelations(memoryId, userId);
      console.log(`Successfully processed memory ${memoryId} for mesh`);
    } catch (error) {
      console.error(`Error processing memory ${memoryId} for mesh:`, error);
      throw error;
    }
  }

  async getMemoryWithRelations(memoryId: string, userId: string): Promise<any> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        include: {
          embeddings: true,
          related_memories: {
            include: {
              related_memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                  page_metadata: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
          },
          related_to_memories: {
            include: {
              memory: {
                select: {
                  id: true,
                  title: true,
                  url: true,
                  created_at: true,
                  summary: true,
                  page_metadata: true,
                },
              },
            },
            orderBy: { similarity_score: 'desc' },
          },
        },
      });

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      return {
        ...memory,
        relation_stats: {
          outgoing_relations: memory.related_memories.length,
          incoming_relations: memory.related_to_memories.length,
          total_relations:
            memory.related_memories.length + memory.related_to_memories.length,
          has_embeddings: memory.embeddings.length > 0,
        },
      };
    } catch (error) {
      console.error(
        `Error getting memory with relations for ${memoryId}:`,
        error
      );
      throw error;
    }
  }

  async getMemoryCluster(
    userId: string,
    centerMemoryId: string,
    depth: number = 2
  ): Promise<any> {
    try {
      const visited = new Set();

      const cluster = new Map();

      const processMemory = async (memoryId: string, currentDepth: number) => {
        if (currentDepth > depth || visited.has(memoryId)) {
          return;
        }

        visited.add(memoryId);

        const memory = await prisma.memory.findUnique({
          where: { id: memoryId },
          include: {
            related_memories: {
              include: {
                related_memory: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    created_at: true,
                    summary: true,
                  },
                },
              },
              orderBy: { similarity_score: 'desc' },
              take: 5,
            },
          },
        });

        if (memory) {
          cluster.set(memoryId, {
            ...memory,
            depth: currentDepth,
            relation_count: memory.related_memories.length,
          });

          for (const relation of memory.related_memories) {
            if (relation.similarity_score > 0.3) {
              await processMemory(relation.related_memory.id, currentDepth + 1);
            }
          }
        }
      };

      await processMemory(centerMemoryId, 0);

      return {
        center_memory_id: centerMemoryId,
        cluster_size: cluster.size,
        max_depth: depth,
        memories: Array.from(cluster.values()),
      };
    } catch (error) {
      console.error(
        `Error getting memory cluster for ${centerMemoryId}:`,
        error
      );
      throw error;
    }
  }
}

export const memoryMeshService = new MemoryMeshService();
