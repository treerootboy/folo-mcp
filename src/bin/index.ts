import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { sendApiQuery } from '../api'
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

console.error('[Folo MCP] Creating stdio transport...')
const transport = new StdioServerTransport()

console.error('[Folo MCP] Connecting server to transport...')
await server.connect(transport)

console.error('[Folo MCP] Server connected and ready to accept requests')
