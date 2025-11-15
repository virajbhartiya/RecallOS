import { MemoryType } from '@prisma/client'
import { RetrievalPolicy } from './retrieval-policy.service'

export type ContextItem = {
  id: string
  title: string | null
  summary: string | null
  url: string | null
  memory_type: MemoryType | null
  importance_score?: number | null
  created_at?: Date
}

export type ContextBlock = {
  label: string
  items: Array<{
    id: string
    title: string | null
    summary: string | null
    url: string | null
    importance_score?: number | null
    created_at?: Date
  }>
}

const MEMORY_TYPE_VALUES = {
  FACT: 'FACT' as MemoryType,
  PREFERENCE: 'PREFERENCE' as MemoryType,
  PROJECT: 'PROJECT' as MemoryType,
  LOG_EVENT: 'LOG_EVENT' as MemoryType,
} as const

const DEFAULT_BLOCKS: Array<{
  label: string
  predicate: (item: ContextItem) => boolean
  limit: number
}> = [
  {
    label: 'Key Facts & Preferences',
    predicate: item =>
      item.memory_type === MEMORY_TYPE_VALUES.FACT ||
      item.memory_type === MEMORY_TYPE_VALUES.PREFERENCE,
    limit: 3,
  },
  {
    label: 'Projects & Plans',
    predicate: item => item.memory_type === MEMORY_TYPE_VALUES.PROJECT,
    limit: 3,
  },
  {
    label: 'Recent Activity',
    predicate: item => {
      if (!item.created_at) return false
      const ageDays = (Date.now() - item.created_at.getTime()) / (1000 * 60 * 60 * 24)
      return ageDays <= 7 || item.memory_type === MEMORY_TYPE_VALUES.LOG_EVENT
    },
    limit: 4,
  },
]

export function buildContextFromResults(options: {
  items: ContextItem[]
  policy: RetrievalPolicy
  profileText?: string
}): { blocks: ContextBlock[]; text: string } {
  const { items, policy, profileText } = options
  const sorted = [...items].sort((a, b) => {
    const aScore = a.importance_score ?? 0
    const bScore = b.importance_score ?? 0
    return bScore - aScore
  })

  const blockConfigs = DEFAULT_BLOCKS
  const blocks: ContextBlock[] = []

  for (const blockConfig of blockConfigs) {
    const blockItems = sorted.filter(blockConfig.predicate).slice(0, blockConfig.limit)
    if (blockItems.length > 0) {
      blocks.push({
        label: blockConfig.label,
        items: blockItems.map(item => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          url: item.url,
          importance_score: item.importance_score,
          created_at: item.created_at,
        })),
      })
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      label: 'Relevant Memories',
      items: sorted.slice(0, policy.maxResults).map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        importance_score: item.importance_score,
        created_at: item.created_at,
      })),
    })
  }

  const contextParts: string[] = []
  if (profileText) {
    contextParts.push(`User Profile Snapshot:\n${profileText}`)
  }

  for (const block of blocks) {
    const blockText = block.items
      .map((item, idx) => {
        const dateText = item.created_at ? ` (${item.created_at.toISOString().slice(0, 10)})` : ''
        const title = item.title ? `${item.title}` : 'Untitled'
        const summary = item.summary || ''
        return `${idx + 1}. ${title}${dateText} — ${summary}`
      })
      .join('\n')
    contextParts.push(`${block.label}:\n${blockText}`)
  }

  const contextText = contextParts.join('\n\n')
  const trimmedText =
    policy.contextBudget && contextText.length > policy.contextBudget
      ? contextText.slice(0, policy.contextBudget) + '…'
      : contextText

  return {
    blocks,
    text: trimmedText,
  }
}
