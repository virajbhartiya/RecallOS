import axios from 'axios'
import { getAuthToken } from '@/utils/user-id.util'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface VelocityMetrics {
  topicRate: number
  diversityIndex: number
  consistencyScore: number
  depthBalance: number
  velocityScore: number
}

interface ImpactMetrics {
  searchFrequency: number
  recallEfficiency: number
  connectionStrength: number
  accessQuality: number
  impactScore: number
}

interface Achievement {
  badgeType: string
  badgeName: string
  progress: number
  unlocked: boolean
}

interface LearningRecommendation {
  topic: string
  reason: string
  priority: number
  prerequisites?: string[]
}

interface LearningPath {
  recommendations: LearningRecommendation[]
  knowledgeGaps: string[]
  trendingTopics: string[]
}

interface Benchmarks {
  velocityPercentile: number | null
  impactPercentile: number | null
  connectionPercentile: number | null
  diversityPercentile: number | null
}

export interface KnowledgeScores {
  velocity: VelocityMetrics | null
  impact: ImpactMetrics | null
  velocityHistorical: Array<{ date: Date; score: number }>
  impactHistorical: Array<{ date: Date; score: number }>
}

const getHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
})

export const getVelocity = async (periodType: 'daily' | 'weekly' = 'weekly') => {
  const response = await axios.get(`${API_URL}/api/knowledge/velocity?period_type=${periodType}`, {
    headers: getHeaders(),
  })
  return response.data.data
}

export const getImpact = async (periodType: 'daily' | 'weekly' = 'weekly') => {
  const response = await axios.get(`${API_URL}/api/knowledge/impact?period_type=${periodType}`, {
    headers: getHeaders(),
  })
  return response.data.data
}

export const getScores = async (periodType: 'daily' | 'weekly' = 'weekly'): Promise<KnowledgeScores> => {
  const response = await axios.get(`${API_URL}/api/knowledge/scores?period_type=${periodType}`, {
    headers: getHeaders(),
  })
  return response.data.data
}

export const getAchievements = async (): Promise<Achievement[]> => {
  const response = await axios.get(`${API_URL}/api/knowledge/achievements`, {
    headers: getHeaders(),
  })
  return response.data.data.achievements
}

export const getLearningPath = async (): Promise<LearningPath | null> => {
  const response = await axios.get(`${API_URL}/api/knowledge/learning-path`, {
    headers: getHeaders(),
  })
  return response.data.data.path
}

export const getBenchmarks = async (): Promise<Benchmarks | null> => {
  const response = await axios.get(`${API_URL}/api/knowledge/benchmarks`, {
    headers: getHeaders(),
  })
  return response.data.data.benchmarks
}

export const calculateScores = async (periodType: 'daily' | 'weekly' = 'weekly') => {
  const response = await axios.post(
    `${API_URL}/api/knowledge/calculate`,
    { period_type: periodType },
    { headers: getHeaders() }
  )
  return response.data.data
}

export const setOptIn = async (optIn: boolean) => {
  const response = await axios.post(
    `${API_URL}/api/knowledge/opt-in`,
    { opt_in: optIn },
    { headers: getHeaders() }
  )
  return response.data
}

