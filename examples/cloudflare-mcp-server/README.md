# Cloudflare Remote MCP Server for Attio

A full remote MCP server that runs on Cloudflare Workers, enabling Claude.ai and ChatGPT to access Attio CRM through the Model Context Protocol.

## Overview

This Cloudflare Worker provides:

- **Full MCP Protocol Support**: Implements JSON-RPC 2.0 MCP over HTTP
- **OAuth 2.1 Authentication**: Secure token-based access to Attio
- **Encrypted Token Storage**: AES-256-GCM encrypted tokens in Workers KV
- **Claude.ai & ChatGPT Compatible**: Works with both MCP connector implementations
- **All Attio Tools**: Search, create, update, delete records, notes, and more

## Prerequisites

1. A Cloudflare account (free tier works)
2. Node.js 18+ installed
3. An Attio OAuth application

## Quick Start

> **Note:** This guide uses the Wrangler CLI. For Cloudflare Dashboard deployment, select "Start with Hello World!", replace code with `worker.ts`, and configure secrets via Settings → Variables.

### 1. Create Attio OAuth App

1. Go to [Attio Developer Portal](https://build.attio.com/)
2. Create a new OAuth application
3. Note your **Client ID** and **Client Secret**
4. Leave the redirect URI empty for now (set after deployment)

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 3. Clone and Configure

```bash
# From the attio-mcp-server repo
cd examples/cloudflare-mcp-server

# Install dependencies
npm install
```

### 4. Create KV Namespace

```bash
wrangler kv:namespace create "TOKEN_STORE"
```

Note the namespace ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TOKEN_STORE"
id = "YOUR_NAMESPACE_ID"
```

### 5. Generate Encryption Key

```bash
# Generate a 32-byte hex key for token encryption
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Set Secrets

```bash
wrangler secret put ATTIO_CLIENT_ID
wrangler secret put ATTIO_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
```

### 7. Deploy

```bash
wrangler deploy
```

Note the URL (e.g., `https://attio-mcp-server.<subdomain>.workers.dev`)

### 8. Complete Configuration

```bash
wrangler secret put WORKER_URL
# Enter: https://attio-mcp-server.<subdomain>.workers.dev
```

Update your Attio OAuth app redirect URI:

```
https://attio-mcp-server.<subdomain>.workers.dev/oauth/callback
```

## Client Configuration

### Claude.ai

1. Go to Claude.ai Settings → Connectors
2. Add new MCP connector
3. Enter your Worker URL: `https://attio-mcp-server.<subdomain>.workers.dev`
4. Complete OAuth authorization when prompted

### ChatGPT

1. Enable Developer Mode or use Custom GPT
2. Add MCP action with URL: `https://attio-mcp-server.<subdomain>.workers.dev`
3. The server provides `/.well-known/oauth-protected-resource` for ChatGPT discovery

## Available Tools

| Tool                          | Description                            |
| ----------------------------- | -------------------------------------- |
| `health-check`                | Verify server connectivity             |
| `records_search`              | Search companies, people, deals, tasks |
| `records_get_details`         | Get full record details                |
| `create-record`               | Create new records                     |
| `update-record`               | Update existing records                |
| `delete-record`               | Delete records                         |
| `records_discover_attributes` | Discover available attributes          |
| `create-note`                 | Create notes on records                |
| `list-notes`                  | List notes for a record                |

## Endpoints

| Endpoint                                  | Method | Description                  |
| ----------------------------------------- | ------ | ---------------------------- |
| `/mcp`                                    | POST   | MCP JSON-RPC endpoint        |
| `/.well-known/oauth-authorization-server` | GET    | OAuth discovery (Claude.ai)  |
| `/.well-known/oauth-protected-resource`   | GET    | Protected resource (ChatGPT) |
| `/oauth/authorize`                        | GET    | Start OAuth flow             |
| `/oauth/callback`                         | GET    | OAuth callback               |
| `/oauth/token`                            | POST   | Token exchange/refresh       |
| `/oauth/register`                         | POST   | Dynamic client registration  |
| `/health`                                 | GET    | Health check                 |

## Security

- **Encrypted Tokens**: All tokens are AES-256-GCM encrypted in Workers KV
- **Automatic Expiry**: KV entries expire with token TTL
- **No Secrets in Code**: All credentials via `wrangler secret`
- **HTTPS Only**: Cloudflare Workers enforce HTTPS

## Architecture

```
┌─────────────────────────────────────┐
│     @attio-mcp/core (shared)        │
│   Edge-compatible tool library      │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Cloudflare Worker                 │
│   ┌─────────────────────────────┐   │
│   │  OAuth Handler              │   │
│   │  - Authorization flow       │   │
│   │  - Token exchange          │   │
│   │  - Discovery endpoints      │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │  MCP Handler                │   │
│   │  - JSON-RPC processing      │   │
│   │  - Tool execution           │   │
│   │  - Error handling           │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │  Token Storage (KV)         │   │
│   │  - AES-256-GCM encryption   │   │
│   │  - Automatic TTL            │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Development

```bash
# Local development
wrangler dev

# Type checking
npm run build

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# View logs
npm run tail
```

## Troubleshooting

### "Invalid redirect_uri"

Ensure Worker URL in Attio matches exactly:

- Include `https://`
- No trailing slash
- Path: `/oauth/callback`

### "Token decryption failed"

Check that `TOKEN_ENCRYPTION_KEY` is set and matches across deployments.

### MCP Connection Fails

1. Verify `/health` endpoint returns 200
2. Check `/mcp` accepts POST requests
3. Ensure OAuth token is valid

### CORS Errors

The worker includes proper CORS headers. Verify:

1. Request goes to correct endpoint
2. `MCP-Protocol-Version` header is set

## License

Apache 2.0 - Same as the main attio-mcp-server project.
