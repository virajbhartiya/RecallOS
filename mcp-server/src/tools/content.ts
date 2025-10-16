// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any
import { http } from '../util/http.js'

export const contentTools: Tool[] = [
  {
    name: 'content.submit',
    description: 'Submit raw content for background processing (queue)',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        raw_text: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['user_id', 'raw_text']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { user_id, raw_text, metadata } = input as any
      const out = await http.post('/api/content', { user_id, raw_text, metadata })
      return { content: [{ type: 'text', text: JSON.stringify(out) }] }
    }
  },
  {
    name: 'content.listSummarized',
    description: 'List summarized content for a user with pagination',
    inputSchema: {
      type: 'object',
      properties: { user_id: { type: 'string' }, page: { type: 'number' }, limit: { type: 'number' } },
      required: ['user_id']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { user_id, page = 1, limit = 10 } = input as any
      const data = await http.get('/api/content/user/' + encodeURIComponent(user_id), { page, limit })
      return { content: [{ type: 'text', text: JSON.stringify(data) }] }
    }
  }
]


