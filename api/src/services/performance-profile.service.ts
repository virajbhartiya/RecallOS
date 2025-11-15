export type PerformanceProfile = 'dev' | 'minimal' | 'full'

export interface PerformanceConfig {
  // Processing depth
  enableDeepProcessing: boolean
  enableMeshProcessing: boolean
  enableProfileUpdates: boolean
  enableScoring: boolean

  // Scoring frequency (in hours)
  scoringFrequency: number

  // Search settings
  enableReranking: boolean
  maxSearchResults: number

  // Visualization features
  enableVisualizations: boolean
  enableInsights: boolean

  // Worker settings
  workerConcurrency: number
  batchSize: number
}

const profiles: Record<PerformanceProfile, PerformanceConfig> = {
  dev: {
    enableDeepProcessing: true,
    enableMeshProcessing: true,
    enableProfileUpdates: true,
    enableScoring: true,
    scoringFrequency: 1, // Every hour
    enableReranking: true,
    maxSearchResults: 100,
    enableVisualizations: true,
    enableInsights: true,
    workerConcurrency: 2,
    batchSize: 10,
  },
  minimal: {
    enableDeepProcessing: false,
    enableMeshProcessing: false,
    enableProfileUpdates: false,
    enableScoring: false,
    scoringFrequency: 24, // Once per day
    enableReranking: false,
    maxSearchResults: 20,
    enableVisualizations: false,
    enableInsights: false,
    workerConcurrency: 1,
    batchSize: 5,
  },
  full: {
    enableDeepProcessing: true,
    enableMeshProcessing: true,
    enableProfileUpdates: true,
    enableScoring: true,
    scoringFrequency: 0.5, // Every 30 minutes
    enableReranking: true,
    maxSearchResults: 1000,
    enableVisualizations: true,
    enableInsights: true,
    workerConcurrency: 5,
    batchSize: 50,
  },
}

export class PerformanceProfileService {
  private currentProfile: PerformanceProfile
  private config: PerformanceConfig

  constructor() {
    const envProfile = (process.env.COGNIA_PROFILE || 'full').toLowerCase() as PerformanceProfile
    this.currentProfile = profiles[envProfile] ? envProfile : 'full'
    this.config = profiles[this.currentProfile]
  }

  getProfile(): PerformanceProfile {
    return this.currentProfile
  }

  getConfig(): PerformanceConfig {
    return { ...this.config }
  }

  shouldProcessDeep(): boolean {
    return this.config.enableDeepProcessing
  }

  shouldProcessMesh(): boolean {
    return this.config.enableMeshProcessing
  }

  shouldUpdateProfile(): boolean {
    return this.config.enableProfileUpdates
  }

  shouldCalculateScores(): boolean {
    return this.config.enableScoring
  }

  getScoringFrequency(): number {
    return this.config.scoringFrequency
  }

  shouldRerank(): boolean {
    return this.config.enableReranking
  }

  getMaxSearchResults(): number {
    return this.config.maxSearchResults
  }

  shouldEnableVisualizations(): boolean {
    return this.config.enableVisualizations
  }

  shouldEnableInsights(): boolean {
    return this.config.enableInsights
  }

  getWorkerConcurrency(): number {
    return this.config.workerConcurrency
  }

  getBatchSize(): number {
    return this.config.batchSize
  }
}

export const performanceProfileService = new PerformanceProfileService()
