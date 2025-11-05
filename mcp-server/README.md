## RecallOS MCP Server

Dual-mode MCP server exposing RecallOS features via MCP tools.

### Prereqs
- Populate `api/.env` with `DATABASE_URL` (and optional `REDIS_*`, `GEMINI_API_KEY`).

### Run (stdio)
```bash
npm run mcp:stdio --prefix ./mcp-server
```

### Run (HTTP/WebSocket for Studio)
```bash
MCP_SERVER_PORT=7820 MCP_SERVER_TOKEN=devtoken \
npm run mcp:server --prefix ./mcp-server
```
WebSocket endpoint: ws://localhost:7820/mcp
Health: GET http://localhost:7820/healthz

### Tools
- memory.getRecent, memory.byHash, memory.storeContent
- search.post, search.jobStatus
- mesh.get, mesh.processMemory
 
- content.submit, content.listSummarized


