import { prisma } from '../lib/prisma';
import { geminiService } from './gemini';

export class MemoryMeshService {
  
  async generateEmbeddingsForMemory(memoryId: string): Promise<void> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId }
      });

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      // Generate embeddings for different parts of the memory
      const embeddingPromises = [];

      // Content embedding
      if (memory.content) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.content, 'content')
        );
      }

      // Summary embedding
      if (memory.summary) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.summary, 'summary')
        );
      }

      // Title embedding
      if (memory.title) {
        embeddingPromises.push(
          this.createEmbedding(memoryId, memory.title, 'title')
        );
      }

      await Promise.all(embeddingPromises);
      console.log(`Generated embeddings for memory ${memoryId}`);
    } catch (error) {
      console.error(`Error generating embeddings for memory ${memoryId}:`, error);
      throw error;
    }
  }

  private async createEmbedding(memoryId: string, text: string, type: string): Promise<void> {
    try {
      const embedding = await geminiService.generateEmbedding(text);
      
      await prisma.embedding.create({
        data: {
          memory_id: memoryId,
          vector: embedding,
          model_name: 'text-embedding-004',
          embedding_type: type
        }
      });
    } catch (error) {
      console.error(`Error creating ${type} embedding for memory ${memoryId}:`, error);
      throw error;
    }
  }

  async findRelatedMemories(memoryId: string, userId: string, limit: number = 5): Promise<any[]> {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        include: { embeddings: true }
      });

      if (!memory || !memory.embeddings.length) {
        return [];
      }

      // Get content embedding for similarity search
      const contentEmbedding = memory.embeddings.find((e: any) => e.embedding_type === 'content');
      if (!contentEmbedding) {
        return [];
      }

      // Find similar memories using vector similarity
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
      // Get all memories with embeddings for the user
      const memories = await prisma.memory.findMany({
        where: {
          user_id: userId,
          id: { not: excludeMemoryId },
          embeddings: { some: { embedding_type: 'content' } }
        },
        include: {
          embeddings: {
            where: { embedding_type: 'content' }
          }
        }
      });

      // Calculate cosine similarity for each memory
      const similarities = memories.map((memory: any) => {
        const embedding = memory.embeddings[0];
        if (!embedding) return { memory, similarity: 0 };

        const similarity = this.cosineSimilarity(queryVector, embedding.vector);
        return { memory, similarity };
      });

      // Sort by similarity and return top results
      return similarities
        .filter((item: any) => item.similarity > 0.3) // Only include reasonably similar memories
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((item: any) => ({
          ...item.memory,
          similarity_score: item.similarity
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
      const relatedMemories = await this.findRelatedMemories(memoryId, userId, 10);
      
      const relationPromises = relatedMemories.map(async (relatedMemory) => {
        // Check if relation already exists
        const existingRelation = await prisma.memoryRelation.findUnique({
          where: {
            memory_id_related_memory_id: {
              memory_id: memoryId,
              related_memory_id: relatedMemory.id
            }
          }
        });

        if (!existingRelation) {
          await prisma.memoryRelation.create({
            data: {
              memory_id: memoryId,
              related_memory_id: relatedMemory.id,
              similarity_score: relatedMemory.similarity_score,
              relation_type: 'semantic'
            }
          });
        }
      });

      await Promise.all(relationPromises);
      console.log(`Created memory relations for ${memoryId}`);
    } catch (error) {
      console.error(`Error creating memory relations for ${memoryId}:`, error);
      throw error;
    }
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
                  summary: true
                }
              }
            },
            orderBy: { similarity_score: 'desc' },
            take: 5
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit
      });

      return {
        memories: memories.map((memory: any) => ({
          ...memory,
          related_count: memory.related_memories.length,
          has_embeddings: memory.embeddings.length > 0
        }))
      };
    } catch (error) {
      console.error(`Error getting memory mesh for user ${userId}:`, error);
      throw error;
    }
  }

  async searchMemories(userId: string, query: string, limit: number = 10): Promise<any[]> {
    try {
      // Generate embedding for search query
      const queryEmbedding = await geminiService.generateEmbedding(query);

      // Find similar memories
      const similarMemories = await this.findSimilarMemories(
        queryEmbedding,
        userId,
        '', // Don't exclude any memory for search
        limit
      );

      return similarMemories;
    } catch (error) {
      console.error(`Error searching memories for user ${userId}:`, error);
      throw error;
    }
  }
}

export const memoryMeshService = new MemoryMeshService();
