# OAuth Authentication Guide

This guide explains how to use Attio OAuth access tokens with the Attio MCP Server as an alternative to API keys.

## Overview

The Attio MCP Server supports two authentication methods:

| Method                 | Environment Variable | Use Case                                               |
| ---------------------- | -------------------- | ------------------------------------------------------ |
| **API Key**            | `ATTIO_API_KEY`      | Long-term integrations, personal use, development      |
| **OAuth Access Token** | `ATTIO_ACCESS_TOKEN` | OAuth integrations, third-party apps, delegated access |

Both methods use the same Bearer token authentication scheme—the server treats them identically.

## When to Use OAuth vs API Keys

### Use API Keys When:

- You're the workspace owner or have admin access
- You need long-term, stable access
- You're building personal automations
- You want simple setup without token refresh

### Use OAuth When:

- Building a third-party application for multiple users
- You need delegated access on behalf of users
- Your application requires the OAuth authorization flow
- You're integrating with systems that expect OAuth

## Quick Start with OAuth

### 1. Obtain an OAuth Access Token

Follow Attio's OAuth tutorial to get an access token:

**Authorization URL:**

```
https://app.attio.com/authorize
```

**Token URL:**

```
https://app.attio.com/oauth/token
```

**Required Scopes:**

- `record_permission:read` - Read records
- `record_permission:read_write` - Read and write records
- `user_management:read` - Read workspace members
- `object:read` - Read object schemas

### 2. Configure the MCP Server

Set the OAuth access token as an environment variable:

```bash
# Option 1: Environment variable
export ATTIO_ACCESS_TOKEN="your_oauth_access_token_here"

# Option 2: In .env file
ATTIO_ACCESS_TOKEN=your_oauth_access_token_here
```

Or in your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["-y", "attio-mcp"],
      "env": {
        "ATTIO_ACCESS_TOKEN": "your_oauth_access_token_here"
      }
    }
  }
}
```

### 3. For Smithery Users

When configuring via [Smithery](https://smithery.ai/server/@kesslerio/attio-mcp-server), you can use either:

```json
{
  "ATTIO_API_KEY": "your_api_key"
}
```

Or:

```json
{
  "ATTIO_ACCESS_TOKEN": "your_oauth_token"
}
```

## Local OAuth Helper (Optional)

For local development and testing, you can use our OAuth helper script:

```bash
# Obtain tokens via PKCE flow
npm run oauth:setup

# Refresh an expired token
npm run oauth:refresh
```

The script will:

1. Open your browser to Attio's authorization page
2. Handle the OAuth callback on localhost
3. Exchange the code for tokens
4. Save tokens to `.env.local`

**Prerequisites for local OAuth:**

- Register an OAuth app in Attio
- Set redirect URI to `http://localhost:3456/callback`
- Have your Client ID ready

## Token Lifecycle

### Access Token Expiration

Attio OAuth access tokens expire after a set period (typically 1 hour). When a token expires:

1. API calls return `401 Unauthorized`
2. You'll see an error message suggesting token refresh
3. Use your refresh token to obtain a new access token

### Refresh Tokens

To refresh an expired token:

```bash
curl -X POST https://app.attio.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID"
```

Or use the helper:

```bash
npm run oauth:refresh
```

## Resolution Order

When both `ATTIO_API_KEY` and `ATTIO_ACCESS_TOKEN` are set, the server uses this priority:

1. `ATTIO_API_KEY` (config)
2. `ATTIO_ACCESS_TOKEN` (config)
3. `ATTIO_API_KEY` (environment)
4. `ATTIO_ACCESS_TOKEN` (environment)
5. Context configuration (Smithery)

## Troubleshooting

### "Authentication failed" errors

1. **Check token validity**: OAuth tokens expire; ensure yours is current
2. **Verify scopes**: Your token needs appropriate permissions
3. **Check for whitespace**: Tokens shouldn't have leading/trailing spaces

### Token expired

If you see 401 errors after your token worked previously:

```bash
# Check if it's an expiration issue
# Refresh your token using your refresh_token

npm run oauth:refresh
```

### "Invalid API key format" error

This usually means:

- The token is empty or too short
- Contains invalid characters
- Has whitespace issues

## Security Best Practices

1. **Never commit tokens**: Add `.env.local` to `.gitignore`
2. **Use short-lived tokens**: Refresh regularly rather than using long-lived tokens
3. **Limit scopes**: Request only the permissions your app needs
4. **Rotate secrets**: Periodically rotate OAuth client secrets
5. **Monitor usage**: Watch for unusual API activity

## Resources

- [Attio OAuth Tutorial](https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth)
- [Attio API Documentation](https://docs.attio.com/)
- [MCP OAuth Specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

## Self-Hosted OAuth Broker

For teams that need a managed OAuth flow without handling tokens manually, see the [Cloudflare Worker OAuth template](../../examples/cloudflare-oauth-worker/README.md) for a self-hostable OAuth broker.
