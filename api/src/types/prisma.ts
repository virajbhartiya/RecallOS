import { Prisma } from '@prisma/client';

export type MemoryWithRelations = Prisma.MemoryGetPayload<{
  include: {
    related_memories: {
      include: {
        related_memory: {
          select: {
            id: true;
            title: true;
            url: true;
            created_at: true;
            summary: true;
            page_metadata: true;
          };
        };
      };
    };
    related_to_memories: {
      include: {
        memory: {
          select: {
            id: true;
            title: true;
            url: true;
            created_at: true;
            summary: true;
            page_metadata: true;
          };
        };
      };
    };
  };
}>;

export type MemorySelect = {
  id: true;
  title: true;
  url: true;
  timestamp: true;
  created_at: true;
  summary: true;
  content: true;
  source: true;
  page_metadata: true;
};

export type MemorySnapshotSelect = {
  id: true;
  summary: true;
  summary_hash: true;
  created_at: true;
  raw_text: true;
};

export type UserSelect = {
  id: true;
  email: true;
  external_id: true;
};

export interface PageMetadata {
  topics?: string[];
  categories?: string[];
  key_points?: string[];
  sentiment?: string;
  importance?: number;
  usefulness?: number;
  searchable_terms?: string[];
  context_relevance?: string[];
  extracted_metadata?: {
    topics: string[];
    categories: string[];
    keyPoints: string[];
    sentiment: string;
    importance: number;
    usefulness: number;
    searchableTerms: string[];
    contextRelevance: string[];
  };
  [key: string]: any;
}

