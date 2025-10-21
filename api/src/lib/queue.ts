import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface ContentJobData {
  user_id: string;
  raw_text: string;
  metadata?: {
    url?: string;
    timestamp?: number;
    tags?: string[];
    memory_id?: string;
    source?: string;
    title?: string;
    content_type?: string;
    content_summary?: string;
  };
}

interface Job {
  id: string;
  data: ContentJobData;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class InMemoryQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private processingJobs: Set<string> = new Set();
  private processors: Map<string, (job: any) => Promise<any>> = new Map();
  private isProcessing = false;

  async add(jobType: string, data: ContentJobData) {
    const id = crypto.randomUUID();
    const job: Job = {
      id,
      data,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
    };
    
    this.jobs.set(id, job);
    this.processNext();
    
    return { id };
  }

  process(jobType: string, handler: (job: any) => Promise<any>) {
    this.processors.set(jobType, handler);
  }

  private async processNext() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (true) {
      const pendingJob = Array.from(this.jobs.values()).find(
        j => j.status === 'pending' && !this.processingJobs.has(j.id)
      );
      
      if (!pendingJob) break;
      
      this.processingJobs.add(pendingJob.id);
      pendingJob.status = 'processing';
      
      const processor = this.processors.get('process-content');
      if (!processor) {
        console.error('No processor found for job type: process-content');
        break;
      }
      
      try {
        const result = await processor({ id: pendingJob.id, data: pendingJob.data });
        pendingJob.status = 'completed';
        this.emit('completed', { id: pendingJob.id }, result);
        this.jobs.delete(pendingJob.id);
      } catch (error) {
        pendingJob.attempts++;
        
        if (pendingJob.attempts >= pendingJob.maxAttempts) {
          pendingJob.status = 'failed';
          this.emit('failed', { id: pendingJob.id }, error);
          this.jobs.delete(pendingJob.id);
        } else {
          pendingJob.status = 'pending';
          setTimeout(() => this.processNext(), 2000 * Math.pow(2, pendingJob.attempts - 1));
        }
      } finally {
        this.processingJobs.delete(pendingJob.id);
      }
    }
    
    this.isProcessing = false;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

export const contentQueue = new InMemoryQueue();

export const addContentJob = async (data: ContentJobData) => {
  return await contentQueue.add('process-content', data);
};
