type MemoryWithTimestamp = {
  timestamp?: bigint | number | string | null
  [key: string]: unknown
}

type SerializedMemory = {
  timestamp: string | null
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
    return {
      ...memory,
      timestamp: memory.timestamp ? memory.timestamp.toString() : null,
    }
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
        serialized.memory = {
          ...result.memory,
          timestamp: result.memory.timestamp ? String(result.memory.timestamp) : null,
        }
      }
      return serialized
    })
  }
}
