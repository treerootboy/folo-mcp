import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { stringifyQuery } from 'ufo'

export async function sendApiQuery({
  args,
  path,
  method,
}: {
  args: any
  path: string
  method: string
}): Promise<CallToolResult> {
  console.error(`[Folo API] Sending ${method} request to ${path}`, JSON.stringify(args))

  const sessionToken = process.env.FOLO_SESSION_TOKEN
  if (!sessionToken) {
    console.error('[Folo API] Error: Session token not found')
    return {
      content: [
        {
          type: 'text',
          text: 'Without session token, I cannot access the data. Please provide it in the environment variable FOLO_SESSION_TOKEN.',
        },
      ],
    }
  }

  const url = `https://api.follow.is${path}${method === 'GET' ? `?${stringifyQuery(args)}` : ''}`
  console.error(`[Folo API] Fetching: ${url}`)

  const res = await fetch(
    url,
    {
      method,
      headers: {
        'cookie': `__Secure-better-auth.session_token=${sessionToken};`,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        ...(method === 'POST'
          ? {
              'content-type': 'application/json',
            }
          : {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(args),
    },
  )

  console.error(`[Folo API] Response status: ${res.status}`)

  const json = (await res.json()) as any
  if (json?.code !== 0) {
    console.error(`[Folo API] API error: ${json.message}`)
    throw new Error(`Error: ${json.message}`)
  }

  console.error('[Folo API] Request completed successfully')

  return {
    content: [
      {
        type: 'text',
        text: json?.data ? JSON.stringify(json.data, null, 2) : 'Success',
      },
    ],
  }
}
