import { contentQueue, ContentJobData } from '../lib/queue';

import { aiProvider } from '../services/aiProvider';

import { memoryMeshService } from '../services/memoryMesh';

import { prisma } from '../lib/prisma';

import { createHash } from 'crypto';

export const startContentWorker = () => {
  contentQueue.process('process-content', async (job: any) => {
    const { user_id, raw_text, metadata } = job.data as ContentJobData;

    try {

      const summary = await aiProvider.summarizeContent(raw_text, metadata);

      if (metadata?.memory_id) {
        await prisma.memory.update({
          where: { id: metadata.memory_id },
          data: { summary: summary },
        });
        await memoryMeshService.generateEmbeddingsForMemory(metadata.memory_id);
        await memoryMeshService.createMemoryRelations(
          metadata.memory_id,
          user_id
        );

        const summaryHash = createHash('sha256').update(summary).digest('hex');

        await prisma.memorySnapshot.create({
          data: {
            user_id,
            raw_text,
            summary,
            summary_hash: summaryHash,
          },
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: user_id },
        });

        if (user) {
          const memoryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          const timestamp = Math.floor(Date.now() / 1000);

          const memory = await prisma.memory.create({
            data: {
              user_id,
              source: metadata?.source || 'queue',
              url: metadata?.url || 'unknown',
              title: metadata?.title || 'Untitled',
              content: raw_text,
              summary: summary,
              hash: memoryHash,
              timestamp: BigInt(timestamp),
              full_content: raw_text,
              page_metadata: metadata || {},
            },
          });

          await memoryMeshService.generateEmbeddingsForMemory(memory.id);
          await memoryMeshService.createMemoryRelations(memory.id, user_id);

          const summaryHash =
            '0x' + createHash('sha256').update(summary).digest('hex');

          await prisma.memorySnapshot.create({
            data: {
              user_id,
              raw_text,
              summary,
              summary_hash: summaryHash,
            },
          });
        }
      }


      return {
        success: true,
        contentId: metadata?.memory_id || 'memory_processed',
        memoryId: metadata?.memory_id || null,
        summary: summary.substring(0, 100) + '...',
      };
    } catch (error) {
      console.error(`Error processing content for user ${user_id}:`, error);
      throw error;
    }
  });
  
  contentQueue.on('completed', (job: any, result: any) => {
  });
  
  contentQueue.on('failed', (job: any, err: any) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });
  
};
