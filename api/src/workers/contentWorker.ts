import { contentQueue, ContentJobData } from '../lib/queue';
import { geminiService } from '../services/gemini';
import { prisma } from '../lib/prisma';

export const startContentWorker = () => {
  contentQueue.process('process-content', async (job: any) => {
    const { user_id, raw_text, metadata } = job.data as ContentJobData;
    
    try {
      console.log(`Processing content for user ${user_id}`);
      
      // Step 1: Call Gemini API to summarize key points
      const summary = await geminiService.summarizeContent(raw_text, metadata);
      
      // Step 2: Store in PostgreSQL
      const summarizedContent = await prisma.summarizedContent.create({
        data: {
          user_id,
          original_text: raw_text,
          summary,
        },
      });

      // Step 3: If this came from a memory, update the memory record with the summary
      if (metadata?.memory_id) {
        await prisma.memory.update({
          where: { id: metadata.memory_id },
          data: { summary: summary }
        });
        console.log(`Updated memory ${metadata.memory_id} with Gemini summary`);
      }
      
      console.log(`Successfully processed content ${summarizedContent.id} for user ${user_id}`);
      
      return {
        success: true,
        contentId: summarizedContent.id,
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
