import { createServer } from 'node:http'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { sendApiQuery } from '../api'
import { parseServerArgs } from '../args'
import { tools } from '../tools'

console.error('[Folo MCP] Initializing server...')

const server = new McpServer({
  name: 'folo-mcp',
  version: '1.0.0',
})

console.error('[Folo MCP] Server created successfully')

console.error(`[Folo MCP] Registering ${Object.keys(tools).length} tools...`)

for (const tool of Object.keys(tools)) {
  const { name, description, input, query } = tools[tool as keyof typeof tools]
  server.tool(
    name,
    description,
    input,
    async (args: any) => {
      console.error(`[Folo MCP] Tool called: ${name}`, JSON.stringify(args))
      try {
        const result = await sendApiQuery({ ...query, args })
        console.error(`[Folo MCP] Tool ${name} completed successfully`)
        return result
      }
      catch (error) {
        console.error(`[Folo MCP] Tool ${name} failed:`, error)
        throw error
      }
    },
  )
  console.error(`[Folo MCP] Registered tool: ${name}`)
}

// Parse command line arguments
const args = parseServerArgs()
console.error(`[Folo MCP] Transport mode: ${args.transport}`)

if (args.transport === 'stdio') {
  // Use stdio transport
  console.error('[Folo MCP] Creating stdio transport...')
  const transport = new StdioServerTransport()

  console.error('[Folo MCP] Connecting server to transport...')
  await server.connect(transport)

  console.error('[Folo MCP] Server connected and ready to accept requests via stdio')
}
else {
  // Use HTTP SSE transport
  console.error(`[Folo MCP] Creating HTTP server on port ${args.port}...`)

  const transports = new Map<string, SSEServerTransport>()

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)

    // Handle SSE connection (GET request)
    if (req.method === 'GET' && url.pathname === '/sse') {
      console.error('[Folo MCP] SSE connection request received')

      const transport = new SSEServerTransport(args.endpoint, res)
      transports.set(transport.sessionId, transport)

      // Clean up on close
      transport.onclose = () => {
        console.error(`[Folo MCP] Transport ${transport.sessionId} closed`)
        transports.delete(transport.sessionId)
      }

      // server.connect() will automatically call transport.start()
      await server.connect(transport)

      console.error(`[Folo MCP] SSE connection established with session ${transport.sessionId}`)
      return
    }

    // Handle POST messages
    if (req.method === 'POST' && url.pathname === args.endpoint) {
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing sessionId' }))
        return
      }

      const transport = transports.get(sessionId)
      if (!transport) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Session not found' }))
        return
      }

      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const message = JSON.parse(body)
          await transport.handlePostMessage(req, res, message)
        }
        catch (error) {
          console.error('[Folo MCP] Error handling POST message:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Internal server error' }))
        }
      })
      return
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  httpServer.listen(args.port, () => {
    console.error(`[Folo MCP] HTTP server listening on port ${args.port}`)
    console.error(`[Folo MCP] SSE endpoint: http://localhost:${args.port}/sse`)
    console.error(`[Folo MCP] Message endpoint: http://localhost:${args.port}${args.endpoint}`)
  })
}
