import { parseArgs } from 'node:util'

export interface ServerArgs {
  transport: 'stdio' | 'http'
  port: number
  endpoint: string
}

export function parseServerArgs(): ServerArgs {
  const { values } = parseArgs({
    options: {
      transport: {
        type: 'string',
        short: 't',
        default: 'stdio',
      },
      port: {
        type: 'string',
        short: 'p',
        default: '3000',
      },
      endpoint: {
        type: 'string',
        short: 'e',
        default: '/message',
      },
    },
  })

  const transport = values.transport === 'http' ? 'http' : 'stdio'
  const port = Number.parseInt(values.port || '3000', 10)

  return {
    transport,
    port,
    endpoint: values.endpoint || '/message',
  }
}
