// Avoid type coupling; treat tools as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any
import { z } from 'zod'
import { toJSONSafe } from '../util/serialize.js'
import { http } from '../util/http.js'

const postSchema = z.object({
  wallet: z.string().min(4),
  query: z.string().min(1),
  limit: z.number().optional(),
  enableReasoning: z.boolean().optional(),
  enableAnchoring: z.boolean().optional()
})

export const searchTools: Tool[] = [
  {
    name: 'search.post',
    description: 'Semantic search over user memories (with optional LLM answer + citations)',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' },
        enableReasoning: { type: 'boolean' },
        enableAnchoring: { type: 'boolean' }
      },
      required: ['wallet', 'query']
    },
    handler: async ({ input }: { input: unknown }) => {
      const data = postSchema.parse(input)
      const out = await http.post('/api/search', data)
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(out)) }] }
    }
  },
  {
    name: 'search.jobStatus',
    description: 'Fetch background search job status (answer/meta_summary)',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { id } = input as any
      const job = await http.get(`/api/search/job/${encodeURIComponent(id)}`)
      return { content: [{ type: 'text', text: JSON.stringify(job || null) }] }
    }
  }
]


