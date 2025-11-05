export class MemorySerializationService {
  static serializeMemory(memory: any): any {
    return {
      ...memory,
      timestamp: memory.timestamp ? memory.timestamp.toString() : null,
    };
  }

  static serializeMemories(memories: any[]): any[] {
    return memories.map(memory => this.serializeMemory(memory));
  }

  static serializeSearchResults(results: any[]): any[] {
    return results.map((result: any) => ({
      ...result,
      memory: result.memory ? {
        ...result.memory,
        timestamp: result.memory.timestamp ? result.memory.timestamp.toString() : null,
      } : result.memory,
    }));
  }
}

