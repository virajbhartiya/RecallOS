import { QdrantClient } from '@qdrant/js-client-rest';

const globalForQdrant = globalThis as unknown as {
  qdrant: QdrantClient | undefined;
};

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 768);
const COLLECTION_NAME = 'memory_embeddings';

export const qdrantClient = globalForQdrant.qdrant ?? new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

if (process.env.NODE_ENV !== 'production') {
  globalForQdrant.qdrant = qdrantClient;
}

export async function ensureCollection(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring Qdrant collection:', error);
    throw error;
  }
}

export { COLLECTION_NAME, EMBEDDING_DIMENSION };

