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

### 4. Create KV Namespace (REQUIRED)

> ⚠️ **CRITICAL**: This step MUST be completed before deploying. The worker will crash (error 1042) without a valid KV namespace.

```bash
wrangler kv:namespace create "TOKEN_STORE"
```

This outputs something like:

```
🌀 Creating namespace with title "attio-mcp-server-TOKEN_STORE"
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "TOKEN_STORE"
id = "abc123def456..."
```

**Copy the `id` value** and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TOKEN_STORE"
id = "YOUR_ACTUAL_ID_HERE"  # Replace with your ID from above
```

Also update the production section in `wrangler.toml`:

```toml
[[env.production.kv_namespaces]]
binding = "TOKEN_STORE"
id = "YOUR_ACTUAL_ID_HERE"  # Same ID
```

### 5. Generate Encryption Key (REQUIRED)

> ⚠️ **CRITICAL**: The worker requires a 32-byte hex encryption key for secure token storage. Without this, the worker will crash.

```bash
# Generate a 32-byte hex key for token encryption
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value securely - you'll need it in the next step.

### 6. Set Secrets (REQUIRED)

> ⚠️ **All four secrets are required** before the worker will start properly.

```bash
# Set your Attio OAuth credentials
wrangler secret put ATTIO_CLIENT_ID
wrangler secret put ATTIO_CLIENT_SECRET

# Set the encryption key from step 5
wrangler secret put TOKEN_ENCRYPTION_KEY
```

### 7. First Deploy (to get your Worker URL)

```bash
wrangler deploy
```

Note the URL (e.g., `https://attio-mcp-server.<subdomain>.workers.dev`)

### 8. Set Worker URL and Redeploy

```bash
# Set your worker URL as a secret
wrangler secret put WORKER_URL
# Enter: https://attio-mcp-server.<subdomain>.workers.dev (no trailing slash)

# Redeploy with the URL configured
wrangler deploy
```

### 9. Configure Attio Redirect URI

Update your Attio OAuth app redirect URI in the [Developer Portal](https://build.attio.com/):

```
https://attio-mcp-server.<subdomain>.workers.dev/oauth/callback
```

### 10. Verify Deployment

```bash
curl https://attio-mcp-server.<subdomain>.workers.dev/health
```

You should see:

```json
{"status":"healthy","has_client_id":true,"has_client_secret":true,"has_token_storage":true,"has_encryption_key":true,...}
```

If you see "error code: 1042", check the [Troubleshooting](#troubleshooting) section.

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

### Error 1042 (Worker Crash)

This means the worker crashed on startup. Common causes:

1. **Missing KV namespace**: Ensure you ran `wrangler kv:namespace create "TOKEN_STORE"` and updated `wrangler.toml` with the actual ID (not a placeholder)
2. **Missing encryption key**: Run `wrangler secret list` to verify `TOKEN_ENCRYPTION_KEY` is set
3. **Invalid wrangler.toml**: Check that KV namespace IDs are valid UUIDs, not placeholder text

To fix:

```bash
# Verify secrets are set
wrangler secret list

# If TOKEN_ENCRYPTION_KEY is missing:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
wrangler secret put TOKEN_ENCRYPTION_KEY

# Redeploy
wrangler deploy
```

### "Invalid redirect_uri"

Ensure Worker URL in Attio matches exactly:

- Include `https://`
- No trailing slash
- Path: `/oauth/callback`

### "Token decryption failed"

Check that `TOKEN_ENCRYPTION_KEY` is set and matches across deployments.

### MCP Connection Fails

1. Verify `/health` endpoint returns 200 and shows all components as `true`
2. Check `/mcp` accepts POST requests
3. Ensure OAuth token is valid
4. Check Claude.ai Connector URL has no trailing slash

### CORS Errors

The worker includes proper CORS headers. Verify:

1. Request goes to correct endpoint
2. `MCP-Protocol-Version` header is set

### Pre-Deployment Checklist

Before deploying, verify:

- [ ] KV namespace created: `wrangler kv:namespace create "TOKEN_STORE"`
- [ ] `wrangler.toml` updated with actual KV namespace ID (not placeholder)
- [ ] Encryption key generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] All secrets set: `ATTIO_CLIENT_ID`, `ATTIO_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`
- [ ] After first deploy: `WORKER_URL` secret set and redeployed

## License

Apache 2.0 - Same as the main attio-mcp-server project.
