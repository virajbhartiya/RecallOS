import { MemoryType } from '@prisma/client'

export type RetrievalPolicyName = 'chat' | 'planning' | 'profile' | 'summarization' | 'insight'

export type RetrievalPolicy = {
  name: RetrievalPolicyName
  description: string
  semanticWeight: number
  keywordWeight: number
  importanceWeight: number
  recencyHalfLifeDays: number
  maxResults: number
  timeRangeDays?: number
  allowedTypes?: MemoryType[]
  contextBudget?: number
}

const DEFAULT_POLICY: RetrievalPolicy = {
  name: 'chat',
  description: 'Balanced retrieval for conversational responses',
  semanticWeight: 0.55,
  keywordWeight: 0.25,
  importanceWeight: 0.2,
  recencyHalfLifeDays: 21,
  maxResults: 12,
  contextBudget: 1800,
}

const POLICY_MAP: Record<RetrievalPolicyName, RetrievalPolicy> = {
  chat: DEFAULT_POLICY,
  planning: {
    name: 'planning',
    description: 'Focus on ongoing projects and actionable items',
    semanticWeight: 0.4,
    keywordWeight: 0.2,
    importanceWeight: 0.4,
    recencyHalfLifeDays: 14,
    maxResults: 15,
    timeRangeDays: 45,
    allowedTypes: ['PROJECT', 'LOG_EVENT'],
    contextBudget: 2200,
  },
  profile: {
    name: 'profile',
    description: 'Surface long-term facts and preferences',
    semanticWeight: 0.35,
    keywordWeight: 0.25,
    importanceWeight: 0.4,
    recencyHalfLifeDays: 90,
    maxResults: 10,
    allowedTypes: ['FACT', 'PREFERENCE', 'REFERENCE'],
    contextBudget: 1500,
  },
  summarization: {
    name: 'summarization',
    description: 'Generate concise summaries of recent activity',
    semanticWeight: 0.5,
    keywordWeight: 0.2,
    importanceWeight: 0.3,
    recencyHalfLifeDays: 10,
    maxResults: 8,
    timeRangeDays: 14,
    allowedTypes: ['LOG_EVENT', 'PROJECT'],
    contextBudget: 1200,
  },
  insight: {
    name: 'insight',
    description: 'Blend diverse memory types for insights/analytics',
    semanticWeight: 0.5,
    keywordWeight: 0.2,
    importanceWeight: 0.3,
    recencyHalfLifeDays: 30,
    maxResults: 20,
    contextBudget: 2500,
  },
}

export function getRetrievalPolicy(policy?: string): RetrievalPolicy {
  if (!policy) return DEFAULT_POLICY
  const normalized = policy.toLowerCase() as RetrievalPolicyName
  return POLICY_MAP[normalized] || DEFAULT_POLICY
}

export function applyPolicyScore(
  args: {
    semanticScore: number
    keywordScore: number
    importanceScore: number
    recencyDays: number
  },
  policy: RetrievalPolicy
): number {
  const importance = Math.min(1, Math.max(0, args.importanceScore || 0))
  const recencyWeight =
    policy.recencyHalfLifeDays > 0
      ? Math.pow(0.5, args.recencyDays / policy.recencyHalfLifeDays)
      : 1
  const semanticComponent = args.semanticScore * policy.semanticWeight
  const keywordComponent = args.keywordScore * policy.keywordWeight
  const importanceComponent = importance * policy.importanceWeight
  const policyScore = semanticComponent + keywordComponent + importanceComponent
  return policyScore * (0.8 + 0.2 * recencyWeight)
}

export function filterMemoriesByPolicy<
  T extends { memory_type?: MemoryType | null; timestamp?: bigint | number | null },
>(rows: T[], policy: RetrievalPolicy): T[] {
  return rows.filter(row => {
    if (policy.allowedTypes && row.memory_type && !policy.allowedTypes.includes(row.memory_type)) {
      return false
    }
    if (policy.timeRangeDays && row.timestamp) {
      const timestampNumber =
        typeof row.timestamp === 'bigint'
          ? Number(row.timestamp)
          : typeof row.timestamp === 'number'
            ? row.timestamp
            : 0
      const memoryDate = new Date(timestampNumber * 1000)
      const ageDays = (Date.now() - memoryDate.getTime()) / (1000 * 60 * 60 * 24)
      if (ageDays > policy.timeRangeDays) {
        return false
      }
    }
    return true
  })
}
