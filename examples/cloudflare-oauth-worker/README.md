# Cloudflare Worker OAuth Broker for Attio

A self-hostable OAuth broker that handles Attio OAuth authentication for MCP clients like Claude Desktop.

## Overview

This Cloudflare Worker provides OAuth 2.1 endpoints that:

- Handle the OAuth authorization flow with Attio
- Exchange authorization codes for tokens
- Support token refresh
- Provide OAuth discovery for MCP clients
- Support Dynamic Client Registration (RFC 7591)

## Prerequisites

1. A Cloudflare account (free tier works)
2. Node.js 18+ installed
3. An Attio OAuth application

## Quick Start

### 1. Create Attio OAuth App

1. Go to [Attio Developer Settings](https://app.attio.com/settings/developers)
2. Create a new OAuth application
3. Set the redirect URI to your Worker URL:
   ```
   https://attio-oauth-broker.your-subdomain.workers.dev/oauth/callback
   ```
4. Note your **Client ID** and **Client Secret**

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 3. Clone and Configure

```bash
# From the attio-mcp-server repo
cd examples/cloudflare-oauth-worker

# Install dependencies (if any)
npm install
```

### 4. Set Secrets

```bash
# Set your Attio OAuth credentials
wrangler secret put ATTIO_CLIENT_ID
# Enter your Client ID when prompted

wrangler secret put ATTIO_CLIENT_SECRET
# Enter your Client Secret when prompted

wrangler secret put WORKER_URL
# Enter: https://attio-oauth-broker.your-subdomain.workers.dev
```

### 5. Deploy

```bash
wrangler deploy
```

Your OAuth broker is now live at `https://attio-oauth-broker.your-subdomain.workers.dev`

## Usage

### OAuth Discovery

MCP clients can discover OAuth endpoints at:

```
GET https://your-worker.workers.dev/.well-known/oauth-authorization-server
```

### Manual Authorization

Open in browser:

```
https://your-worker.workers.dev/oauth/authorize
```

This will:

1. Redirect you to Attio's login page
2. After authorization, show you your access token
3. You can then copy the token and use it with the MCP server

### Token Refresh

```bash
curl -X POST https://your-worker.workers.dev/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"
```

### Health Check

```bash
curl https://your-worker.workers.dev/health
```

## Claude Desktop Integration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["-y", "attio-mcp"],
      "env": {
        "ATTIO_ACCESS_TOKEN": "token_from_oauth_flow"
      }
    }
  }
}
```

Or configure Claude Desktop to use the OAuth broker directly (if supported):

```json
{
  "mcpServers": {
    "attio": {
      "url": "https://your-mcp-server-url",
      "oauth": {
        "authorization_url": "https://your-worker.workers.dev/oauth/authorize",
        "token_url": "https://your-worker.workers.dev/oauth/token"
      }
    }
  }
}
```

## Endpoints

| Endpoint                                  | Method | Description                 |
| ----------------------------------------- | ------ | --------------------------- |
| `/.well-known/oauth-authorization-server` | GET    | OAuth discovery metadata    |
| `/oauth/authorize`                        | GET    | Start OAuth flow            |
| `/oauth/callback`                         | GET    | Handle Attio callback       |
| `/oauth/token`                            | POST   | Token exchange/refresh      |
| `/oauth/register`                         | POST   | Dynamic client registration |
| `/health`                                 | GET    | Health check                |

## Security Considerations

1. **Secrets**: Never commit your Client ID/Secret. Use `wrangler secret put`.
2. **HTTPS**: Cloudflare Workers automatically use HTTPS.
3. **CORS**: Configured to allow requests from MCP clients.
4. **Token Storage**: Tokens are displayed to users but not stored by the worker.

## Customization

### Custom Domain

Edit `wrangler.toml` to add a custom domain:

```toml
[routes]
pattern = "oauth.yourdomain.com/*"
zone_name = "yourdomain.com"
```

### Session Storage

For production use, enable KV storage for OAuth sessions:

1. Create a KV namespace:

   ```bash
   wrangler kv:namespace create "OAUTH_SESSIONS"
   ```

2. Add to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "OAUTH_SESSIONS"
   id = "your-namespace-id"
   ```

## Troubleshooting

### "Invalid redirect_uri"

Ensure your Worker URL exactly matches what's configured in Attio:

- Include `https://`
- No trailing slash
- Match the callback path: `/oauth/callback`

### "Token exchange failed"

Check that:

1. Client ID and Secret are correct
2. The authorization code hasn't expired (10 minute limit)
3. The redirect URI matches

### CORS errors

The worker includes CORS headers. If you still see errors:

1. Check the browser console for the specific origin
2. Verify the request is going to the correct endpoint

## Local Development

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787`. Note that OAuth callbacks won't work locally unless you use a tunnel service like ngrok.

## License

Apache 2.0 - Same as the main attio-mcp-server project.
