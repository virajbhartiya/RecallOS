import { Server } from '@modelcontextprotocol/sdk/server'
import { createStdioTransport } from './transports/stdio.js'
import { createHttpWsTransport } from './transports/http.js'
import { memoryTools } from './tools/memory.js'
import { searchTools } from './tools/search.js'
import { meshTools } from './tools/mesh.js'
import { blockscoutTools } from './tools/blockscout.js'
import { contentTools } from './tools/content.js'
import './util/env'

async function main() {
  const mode = process.argv.includes('--server') ? 'server' : 'stdio'

  const server = new Server({ name: 'cognia-mcp', version: '0.1.0' })
  // Register tools
  for (const t of [...memoryTools, ...searchTools, ...meshTools, ...blockscoutTools, ...contentTools]) {
    server.addTool(t)
  }

  if (mode === 'server') {
    const { transport } = createHttpWsTransport()
    await server.connect(transport)
    // Keep process alive
    // eslint-disable-next-line no-console
  } else {
    const transport = createStdioTransport()
    await server.connect(transport)
  }
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


