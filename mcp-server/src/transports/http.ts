import { WebSocketServer } from 'ws'
import http from 'node:http'
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket'

export type ServerBundle = {
  server: http.Server
  wss: WebSocketServer
  // Use any here due to incomplete type declarations in sdk under NodeNext
  transport: any
}

export function createHttpWsTransport(opts?: { port?: number; path?: string; token?: string }): ServerBundle {
  const port = opts?.port ?? Number(process.env.MCP_SERVER_PORT || 7820)
  const path = opts?.path ?? '/mcp'
  const token = opts?.token ?? process.env.MCP_SERVER_TOKEN

  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  const wss = new WebSocketServer({ noServer: true })
  const transport = new WebSocketServerTransport(wss)

  server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith(path)) {
      socket.destroy()
      return
    }
    if (token) {
      const auth = req.headers['authorization'] || ''
      const ok = typeof auth === 'string' && auth.startsWith('Bearer ') && auth.slice(7) === token
      if (!ok) {
        socket.destroy()
        return
      }
    }
    wss.handleUpgrade(req, socket as any, head, ws => {
      wss.emit('connection', ws, req)
    })
  })

  server.listen(port)
  return { server, wss, transport }
}


