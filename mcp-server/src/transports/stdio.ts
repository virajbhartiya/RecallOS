import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'

export function createStdioTransport() {
  return new StdioServerTransport()
}


