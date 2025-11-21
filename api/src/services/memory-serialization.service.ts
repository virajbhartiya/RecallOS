type MemoryWithTimestamp = {
  timestamp?: bigint | number | string | null
  [key: string]: unknown
}

type SerializedMemory = {
  timestamp: string | null
  last_accessed?: string | null
  [key: string]: unknown
}

type SearchResultWithMemory = {
  memory?: MemoryWithTimestamp
  [key: string]: unknown
}

type SerializedSearchResult = {
  memory?: SerializedMemory
  [key: string]: unknown
}

export class MemorySerializationService {
  static serializeMemory(memory: MemoryWithTimestamp): SerializedMemory {
    const serialized: SerializedMemory = {
      ...memory,
      timestamp: memory.timestamp ? memory.timestamp.toString() : null,
    }
    if ('last_accessed' in memory) {
      const value = memory.last_accessed as Date | null | undefined
      serialized.last_accessed = value instanceof Date ? value.toISOString() : null
    }
    return serialized
  }

  static serializeMemories(memories: MemoryWithTimestamp[]): SerializedMemory[] {
    return memories.map(memory => this.serializeMemory(memory))
  }

  static serializeSearchResults(results: SearchResultWithMemory[]): SerializedSearchResult[] {
    return results.map((result: SearchResultWithMemory) => {
      const serialized: SerializedSearchResult = {}
      Object.keys(result).forEach(key => {
        if (key !== 'memory') {
          serialized[key] = result[key]
        }
      })
      if (result.memory) {
        const lastAccessed =
          result.memory.last_accessed instanceof Date
            ? result.memory.last_accessed.toISOString()
            : null
        serialized.memory = {
          ...result.memory,
          timestamp: result.memory.timestamp ? String(result.memory.timestamp) : null,
          last_accessed: lastAccessed,
        }
      }
      return serialized
    })
  }
}
