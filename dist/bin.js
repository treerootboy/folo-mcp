#!/usr/bin/env node
import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { stringifyQuery } from 'ufo';
import { parseArgs } from 'node:util';
import { z } from 'zod';

async function sendApiQuery({ args, path, method }) {
    console.error(`[Folo API] Sending ${method} request to ${path}`, JSON.stringify(args));
    const sessionToken = process.env.FOLO_SESSION_TOKEN;
    if (!sessionToken) {
        console.error('[Folo API] Error: Session token not found');
        return {
            content: [
                {
                    type: 'text',
                    text: 'Without session token, I cannot access the data. Please provide it in the environment variable FOLO_SESSION_TOKEN.'
                }
            ]
        };
    }
    const url = `https://api.follow.is${path}${method === 'GET' ? `?${stringifyQuery(args)}` : ''}`;
    console.error(`[Folo API] Fetching: ${url}`);
    const res = await fetch(url, {
        method,
        headers: {
            'cookie': `__Secure-better-auth.session_token=${sessionToken};`,
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            ...method === 'POST' ? {
                'content-type': 'application/json'
            } : {}
        },
        body: method === 'GET' ? undefined : JSON.stringify(args)
    });
    console.error(`[Folo API] Response status: ${res.status}`);
    const json = await res.json();
    if (json?.code !== 0) {
        console.error(`[Folo API] API error: ${json.message}`);
        throw new Error(`Error: ${json.message}`);
    }
    console.error('[Folo API] Request completed successfully');
    return {
        content: [
            {
                type: 'text',
                text: json?.data ? JSON.stringify(json.data, null, 2) : 'Success'
            }
        ]
    };
}

function parseServerArgs() {
    const { values } = parseArgs({
        options: {
            transport: {
                type: 'string',
                short: 't',
                default: 'stdio'
            },
            port: {
                type: 'string',
                short: 'p',
                default: '3000'
            },
            endpoint: {
                type: 'string',
                short: 'e',
                default: '/message'
            }
        }
    });
    const transport = values.transport === 'http' ? 'http' : 'stdio';
    const port = Number.parseInt(values.port || '3000', 10);
    return {
        transport,
        port,
        endpoint: values.endpoint || '/message'
    };
}

const zodView = z.number().optional().describe('Filter by view type, 0 for Articles, 1 for Social Media, 2 for Pictures, 3 for Videos, 4 for Audios, 5 for Notifications');
const zodUserId = z.string().optional().describe('Filter by user ID, if not provided, the current user will be used');
const zodFeedId = z.string().optional().describe('Filter by feed ID');
const zodListId = z.string().optional().describe('Filter by list ID');
const zodFeedIdList = z.array(z.string()).optional().describe('Filter by list of feed IDs');
const zodInboxId = z.string().optional().describe('Filter by inbox ID');
const tools = {
    entry_list: {
        name: 'entry_list',
        description: 'Get a list of entries from Folo',
        query: {
            path: '/entries',
            method: 'POST'
        },
        input: {
            view: zodView,
            feedId: zodFeedId,
            listId: zodListId,
            feedIdList: zodFeedIdList,
            read: z.boolean().optional().describe('Filter by read status'),
            limit: z.number().optional().describe('Limit the number of entries returned'),
            publishedAfter: z.string().datetime().optional().describe('Filter by published date after this date'),
            publishedBefore: z.string().datetime().optional().describe('Filter by published date before this date'),
            isCollection: z.boolean().optional().describe('Filter by collection status, set true for Starred'),
            withContent: z.boolean().optional().describe('Include content in the response')
        }
    },
    subscription_list: {
        name: 'subscription_list',
        description: 'Get a list of subscriptions from Folo',
        query: {
            path: '/subscriptions',
            method: 'GET'
        },
        input: {
            view: zodView,
            userId: zodUserId
        }
    },
    unread_count: {
        name: 'unread_count',
        description: 'Get the unread count from Folo grouped by feed',
        query: {
            path: '/reads',
            method: 'GET'
        },
        input: {
            view: zodView
        }
    },
    feed_info: {
        name: 'feed_info',
        description: 'Get information about a specific feed by ID or URL',
        query: {
            path: '/feeds',
            method: 'GET'
        },
        input: {
            id: z.string().optional().describe('Feed ID'),
            url: z.string().url().optional().describe('Feed URL')
        }
    },
    mark_read: {
        name: 'mark_read',
        description: 'Mark entries as read by view, feed ID, or list ID, or inbox ID',
        query: {
            path: '/reads/all',
            method: 'POST'
        },
        input: {
            view: zodView,
            feedId: zodFeedId,
            listId: zodListId,
            inboxId: zodInboxId,
            feedIdList: zodFeedIdList,
            startTime: z.number().optional(),
            endTime: z.number().optional()
        }
    },
    http_stream: {
        name: 'http_stream',
        description: 'Get HTTP stream data from Folo',
        query: {
            path: '/stream',
            method: 'GET'
        },
        input: {
            view: zodView,
            feedId: zodFeedId,
            listId: zodListId,
            limit: z.number().optional().describe('Limit the number of stream items returned'),
            since: z.string().optional().describe('Get stream items since this timestamp')
        }
    }
};

console.error('[Folo MCP] Initializing server...');
const server = new McpServer({
    name: 'folo-mcp',
    version: '1.0.0'
});
console.error('[Folo MCP] Server created successfully');
console.error(`[Folo MCP] Registering ${Object.keys(tools).length} tools...`);
for (const tool of Object.keys(tools)){
    const { name, description, input, query } = tools[tool];
    server.tool(name, description, input, async (args)=>{
        console.error(`[Folo MCP] Tool called: ${name}`, JSON.stringify(args));
        try {
            const result = await sendApiQuery({
                ...query,
                args
            });
            console.error(`[Folo MCP] Tool ${name} completed successfully`);
            return result;
        } catch (error) {
            console.error(`[Folo MCP] Tool ${name} failed:`, error);
            throw error;
        }
    });
    console.error(`[Folo MCP] Registered tool: ${name}`);
}
// Parse command line arguments
const args = parseServerArgs();
console.error(`[Folo MCP] Transport mode: ${args.transport}`);
if (args.transport === 'stdio') {
    // Use stdio transport
    console.error('[Folo MCP] Creating stdio transport...');
    const transport = new StdioServerTransport();
    console.error('[Folo MCP] Connecting server to transport...');
    await server.connect(transport);
    console.error('[Folo MCP] Server connected and ready to accept requests via stdio');
} else {
    // Use HTTP SSE transport
    console.error(`[Folo MCP] Creating HTTP server on port ${args.port}...`);
    const transports = new Map();
    const httpServer = createServer(async (req, res)=>{
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        // Handle SSE connection (GET request)
        if (req.method === 'GET' && url.pathname === '/sse') {
            console.error('[Folo MCP] SSE connection request received');
            const transport = new SSEServerTransport(args.endpoint, res);
            transports.set(transport.sessionId, transport);
            // Clean up on close
            transport.onclose = ()=>{
                console.error(`[Folo MCP] Transport ${transport.sessionId} closed`);
                transports.delete(transport.sessionId);
            };
            // server.connect() will automatically call transport.start()
            await server.connect(transport);
            console.error(`[Folo MCP] SSE connection established with session ${transport.sessionId}`);
            return;
        }
        // Handle POST messages
        if (req.method === 'POST' && url.pathname === args.endpoint) {
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: 'Missing sessionId'
                }));
                return;
            }
            const transport = transports.get(sessionId);
            if (!transport) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: 'Session not found'
                }));
                return;
            }
            let body = '';
            req.on('data', (chunk)=>body += chunk);
            req.on('end', async ()=>{
                try {
                    const message = JSON.parse(body);
                    await transport.handlePostMessage(req, res, message);
                } catch (error) {
                    console.error('[Folo MCP] Error handling POST message:', error);
                    res.writeHead(500, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        error: 'Internal server error'
                    }));
                }
            });
            return;
        }
        // 404 for other routes
        res.writeHead(404, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
            error: 'Not found'
        }));
    });
    httpServer.listen(args.port, ()=>{
        console.error(`[Folo MCP] HTTP server listening on port ${args.port}`);
        console.error(`[Folo MCP] SSE endpoint: http://localhost:${args.port}/sse`);
        console.error(`[Folo MCP] Message endpoint: http://localhost:${args.port}${args.endpoint}`);
    });
}
