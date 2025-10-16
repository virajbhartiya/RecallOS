declare module '@modelcontextprotocol/sdk/server' {
  import type { Tool as RawTool } from '@modelcontextprotocol/sdk/types'
  export class Server<C = any, S = any, E = any> {
    constructor(info: { name: string; version: string })
    addTool(tool: RawTool): void
    connect(transport: any): Promise<void>
  }
}
declare module '@modelcontextprotocol/sdk/server/stdio'
declare module '@modelcontextprotocol/sdk/server/websocket'
declare module '@modelcontextprotocol/sdk/types' {
  export type Tool = any
}

