# Cognia SDK (local)

Install (local monorepo):

```bash
# from repo root
pnpm --filter @cognia/sdk build
```

Usage:

```ts
import { createCogniaClient } from '@cognia/sdk'

const sdk = createCogniaClient({ baseUrl: 'http://localhost:3000' })
const search = await sdk.search.postSearch({ wallet: '0x...', query: 'zk proofs', limit: 8 })
const recent = await sdk.memory.getRecentMemories('0x...', { count: 10 })
```

Configure:
- baseUrl: API origin
- headers: optional headers
- fetch: custom fetch implementation if needed
- timeoutMs: request timeout (ms)
