import * as MemoryApi from "./memory/memory-api.service"
import * as MemoryInsights from "./memory/memory-insights.service"
import * as MemoryJobs from "./memory/memory-jobs.service"
import * as MemoryMesh from "./memory/memory-mesh.service"
import * as MemorySearch from "./memory/memory-search.service"

export class MemoryService {
  static async getMemoriesWithTransactionDetails(limit?: number) {
    return MemoryApi.getMemoriesWithTransactionDetails(limit)
  }

  static async getMemoryMesh(limit: number = 50, threshold: number = 0.3) {
    return MemoryMesh.getMemoryMesh(limit, threshold)
  }

  static async searchMemories(
    query: string,
    filters = {},
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ) {
    return MemorySearch.searchMemories(query, filters, page, limit, signal)
  }

  static async searchMemoriesHybrid(
    query: string,
    filters = {},
    page: number = 1,
    limit: number = 10
  ) {
    return MemorySearch.searchMemoriesHybrid(query, filters, page, limit)
  }

  static async getMemoryInsights() {
    return MemoryInsights.getMemoryInsights()
  }

  static async getRecentMemories(count: number = 10) {
    return MemoryApi.getRecentMemories(count)
  }

  static async getUserMemories(page: number = 1, limit: number = 20) {
    return MemoryApi.getUserMemories(page, limit)
  }

  static async getMemoryWithRelations(memoryId: string) {
    return MemoryMesh.getMemoryWithRelations(memoryId)
  }

  static async getMemoryCluster(memoryId: string, depth: number = 2) {
    return MemoryMesh.getMemoryCluster(memoryId, depth)
  }

  static async getUserMemoryCount() {
    return MemoryApi.getUserMemoryCount()
  }

  static async getMemoryByHash(hash: string) {
    return MemoryApi.getMemoryByHash(hash)
  }

  static async isMemoryStored(hash: string) {
    return MemoryApi.isMemoryStored(hash)
  }

  static async processMemoryForMesh(memoryId: string) {
    return MemoryMesh.processMemoryForMesh(memoryId)
  }

  static async getMemorySnapshots(page: number = 1, limit: number = 20) {
    return MemoryJobs.getMemorySnapshots(page, limit)
  }

  static async healthCheck() {
    return MemoryApi.healthCheck()
  }

  static async getPendingJobs() {
    return MemoryJobs.getPendingJobs()
  }

  static async deleteMemory(memoryId: string) {
    return MemoryApi.deleteMemory(memoryId)
  }

  static async deletePendingJob(jobId: string) {
    return MemoryJobs.deletePendingJob(jobId)
  }

  static async resubmitPendingJob(jobId: string) {
    return MemoryJobs.resubmitPendingJob(jobId)
  }
}
