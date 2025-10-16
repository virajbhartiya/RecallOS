// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any
import { http } from '../util/http.js'
import { toJSONSafe } from '../util/serialize.js'

export const meshTools: Tool[] = [
  {
    name: 'mesh.get',
    description: 'Get memory mesh (nodes/edges) for a user address',
    inputSchema: {
      type: 'object',
      properties: { userAddress: { type: 'string' }, limit: { type: 'number' }, threshold: { type: 'number' } },
      required: ['userAddress']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { userAddress, limit, threshold } = input as any
      const data = await http.get('/api/memory/mesh/' + encodeURIComponent(userAddress), { limit, threshold })
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(data?.data || { nodes: [], edges: [] })) }] }
    }
  },
  {
    name: 'mesh.processMemory',
    description: 'Generate embeddings and relations for a memory belonging to user',
    inputSchema: {
      type: 'object',
      properties: { memoryId: { type: 'string' }, userAddress: { type: 'string' } },
      required: ['memoryId', 'userAddress']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { memoryId, userAddress } = input as any
      const out = await http.post('/api/memory/process-mesh/' + encodeURIComponent(memoryId), { userAddress })
      return { content: [{ type: 'text', text: JSON.stringify(toJSONSafe(out?.data || out)) }] }
    }
  }
]


