import { contentQueue, ContentJobData } from '../lib/queue';
import { geminiService } from '../services/gemini';
import { memoryMeshService } from '../services/memoryMesh';
import { prisma } from '../lib/prisma';

export const startContentWorker = () => {
  contentQueue.process('process-content', async (job: any) => {
    const { user_id, raw_text, metadata } = job.data as ContentJobData;
    
    try {
      console.log(`Processing content for user ${user_id}`);
      
      // Step 1: Call Gemini API to summarize key points
      const summary = await geminiService.summarizeContent(raw_text, metadata);
      
      // Step 2: If this came from a memory, update the memory record with the summary
      if (metadata?.memory_id) {
        await prisma.memory.update({
          where: { id: metadata.memory_id },
          data: { summary: summary }
        });
        console.log(`Updated memory ${metadata.memory_id} with Gemini summary`);

        // Step 3: Generate embeddings for the memory
        await memoryMeshService.generateEmbeddingsForMemory(metadata.memory_id);
        console.log(`Generated embeddings for memory ${metadata.memory_id}`);

        // Step 4: Create memory relations
        await memoryMeshService.createMemoryRelations(metadata.memory_id, user_id);
        console.log(`Created memory relations for memory ${metadata.memory_id}`);
      } else {
        // Only store in summarized_content if it's NOT from a memory
        const summarizedContent = await prisma.summarizedContent.create({
          data: {
            user_id,
            original_text: raw_text,
            summary,
          },
        });
        console.log(`Created summarized content ${summarizedContent.id} for user ${user_id}`);
      }
      
      console.log(`Successfully processed content for user ${user_id}`);
      
      return {
        success: true,
        contentId: metadata?.memory_id || 'memory_processed',
        memoryId: metadata?.memory_id || null,
        summary: summary.substring(0, 100) + '...', // Log truncated summary
      };
    } catch (error) {
      console.error(`Error processing content for user ${user_id}:`, error);
      throw error; // This will trigger the retry mechanism
    }
  });

  // Event listeners for monitoring
  contentQueue.on('completed', (job: any, result: any) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  contentQueue.on('failed', (job: any, err: any) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  contentQueue.on('stalled', (job: any) => {
    console.warn(`Job ${job.id} stalled`);
  });

  console.log('Content processing worker started');
};
