// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any
import { http } from '../util/http.js'

export const blockscoutTools: Tool[] = [
  {
    name: 'blockscout.prefetch',
    description: 'Prefetch a transaction by txHash (network default sepolia)',
    inputSchema: {
      type: 'object',
      properties: { txHash: { type: 'string' }, network: { type: 'string' } },
      required: ['txHash']
    },
    handler: async ({ input }: { input: unknown }) => {
      const { txHash, network } = input as any
      const out = await http.post('/api/blockscout/prefetch', { txHash, network: network || 'sepolia' })
      return { content: [{ type: 'text', text: JSON.stringify(out) }] }
    }
  },
  {
    name: 'blockscout.get',
    description: 'Get cached transaction from prefetch cache',
    inputSchema: { type: 'object', properties: { txHash: { type: 'string' } }, required: ['txHash'] },
    handler: async ({ input }: { input: unknown }) => {
      const { txHash } = input as any
      const data = await http.get('/api/blockscout/transaction/' + encodeURIComponent(txHash))
      return { content: [{ type: 'text', text: JSON.stringify(data || null) }] }
    }
  },
  {
    name: 'blockscout.cleanup',
    description: 'Cleanup old pending transactions from cache',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      const out = await http.post('/api/blockscout/cleanup', {})
      return { content: [{ type: 'text', text: JSON.stringify(out) }] }
    }
  }
]


