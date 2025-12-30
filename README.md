# folo-mcp

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

MCP server for [Folo](https://github.com/RSSNext/Folo)

## Usage

Set `FOLO_SESSION_TOKEN` environment variable to your Folo session token.

```bash
npx folo-mcp -y
```

## Transport Options

The server supports two transport modes:

### stdio (Default)

Standard input/output transport for local integrations:

```bash
node dist/bin.js
# or with explicit flag
node dist/bin.js --transport stdio
```

### HTTP with SSE

HTTP Server-Sent Events transport for remote access:

```bash
node dist/bin.js --transport http --port 3000
```

**Options:**
- `--transport` or `-t`: Transport type (`stdio` or `http`, default: `stdio`)
- `--port` or `-p`: HTTP server port (default: `3000`)
- `--endpoint` or `-e`: Message endpoint path (default: `/message`)

**Endpoints:**
- SSE connection: `GET http://localhost:3000/sse`
- Client messages: `POST http://localhost:3000/message?sessionId=<session>`

Configuration for [ChatWise](https://chatwise.app)

![CleanShot 2025-03-29 at 23 05 22@2x](https://github.com/user-attachments/assets/91b1841c-e556-4669-b68f-8afd51ce358c)

## Sponsors

<p align="center">
  <a href="https://github.com/hyoban/sponsors">
    <img src="https://raw.githubusercontent.com/hyoban/sponsors/main/sponsorkit/sponsors.svg" />
  </a>
</p>

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/folo-mcp?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/folo-mcp
[npm-downloads-src]: https://img.shields.io/npm/dm/folo-mcp?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/folo-mcp
