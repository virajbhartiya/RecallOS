import { z } from 'zod'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any
import { http } from '../util/http.js'
import { toJSONSafe } from '../util/serialize.js'

const storeContentSchema = z.object({
  userAddress: z.string().min(4),
  content: z.string().min(1),
  url: z.string().optional(),
  title: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const memoryTools: Tool[] = [
  {
    name: 'memory.getRecent',
    description: 'Get recent memories for a user address',
    inputSchema: {
      type: 'object',
      properties: { userAddress: { type: 'string' }, count: { type: 'number' } },
      required: ['userAddress']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { userAddress, count } = input as any
      const data = await http.get('/api/memory/user/' + encodeURIComponent(userAddress) + '/recent', { count })
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(data?.data || { memories: [] })) }] }
    }
  },
  {
    name: 'memory.byHash',
    description: 'Get a memory by its on-chain hash',
    inputSchema: {
      type: 'object',
      properties: { hash: { type: 'string' } },
      required: ['hash']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { hash } = input as any
      const data = await http.get('/api/memory/hash/' + encodeURIComponent(hash))
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(data?.data || null)) }] }
    }
  },
  {
    name: 'memory.storeContent',
    description: 'Store raw content as a memory (summarize + mesh embeddings async via worker pathways already in API)',
    inputSchema: {
      type: 'object',
      properties: {
        userAddress: { type: 'string' },
        content: { type: 'string' },
        url: { type: 'string' },
        title: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['userAddress', 'content']
    },
    handler: async ({ input }: { input: unknown }) => {
      const data = storeContentSchema.parse(input)
      const out = await http.post('/api/memory/process', {
        content: data.content,
        url: data.url,
        title: data.title,
        userAddress: data.userAddress,
        metadata: data.metadata
      })
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(out?.data || out)) }] }
    }
  }
]


