-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory embeddings table (pgvector column)
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY,
  memory_id UUID NOT NULL,
  embedding VECTOR(768) NOT NULL,
  dim INT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_memory_embeddings_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Vector index for ANN search (cosine)
CREATE INDEX IF NOT EXISTS memory_embeddings_embedding_ivfflat
  ON memory_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Query events table (stores only hash of query embedding)
CREATE TABLE IF NOT EXISTS query_events (
  id UUID PRIMARY KEY,
  wallet TEXT NOT NULL,
  query TEXT NOT NULL,
  embedding_hash TEXT NOT NULL,
  meta_summary TEXT,
  avail_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links query events to matched memories
CREATE TABLE IF NOT EXISTS query_related_memories (
  id UUID PRIMARY KEY,
  query_event_id UUID NOT NULL,
  memory_id UUID NOT NULL,
  rank INT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_qrm_query_event FOREIGN KEY (query_event_id) REFERENCES query_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_qrm_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  CONSTRAINT uq_qrm UNIQUE (query_event_id, memory_id)
);


