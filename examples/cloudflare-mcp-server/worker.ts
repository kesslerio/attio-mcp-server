/**
 * Cloudflare Worker Remote MCP Server for Attio
 *
 * A full MCP server that works with Claude.ai and ChatGPT,
 * providing OAuth authentication and tool execution.
 *
 * Endpoints:
 * - GET  /.well-known/oauth-authorization-server - OAuth discovery
 * - GET  /.well-known/oauth-protected-resource - Protected resource metadata (ChatGPT)
 * - HEAD / - Protocol version check (Claude.ai)
 * - GET  /oauth/authorize - Redirect to Attio OAuth
 * - GET  /oauth/callback - Handle Attio callback
 * - POST /oauth/token - Token exchange/refresh
 * - POST /oauth/register - Dynamic client registration (disabled for security)
 * - POST /mcp - MCP JSON-RPC endpoint
 * - GET  /health, /ping - Health check
 *
 * @see https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth
 * @see https://modelcontextprotocol.io/docs/develop/connect-remote-servers
 */

import type { Env } from './src/env.js';
import { createTokenStorage } from './src/token-storage.js';
import { createMcpHandler } from './src/mcp-handler.js';
import { corsHeaders } from './src/oauth-utils.js';
import {
  handleDiscovery,
  handleProtectedResource,
  handleAuthorize,
  handleCallback,
  handleToken,
  handleRegister,
} from './src/oauth-handlers.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || undefined;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Handle HEAD request for protocol version (Claude.ai)
    if (request.method === 'HEAD' && url.pathname === '/') {
      return new Response(null, {
        status: 200,
        headers: {
          'MCP-Protocol-Version': '2024-11-05',
          ...corsHeaders(origin),
        },
      });
    }

    try {
      // Route handling
      switch (url.pathname) {
        case '/.well-known/oauth-authorization-server':
          return handleDiscovery(env, origin);

        case '/.well-known/oauth-protected-resource':
          return handleProtectedResource(env, origin);

        case '/oauth/authorize':
          return handleAuthorize(request, env);

        case '/oauth/callback':
          return handleCallback(request, env);

        case '/oauth/token':
          return handleToken(request, env, origin);

        case '/oauth/register':
          return handleRegister(request, env, origin);

        case '/mcp':
        case '/':
          // Claude Desktop hits root path for MCP, so we serve MCP at both / and /mcp
          return handleMcp(request, env);

        case '/health':
        case '/ping':
          return handleHealth(env, origin);

        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(origin),
            },
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }
  },
};

// Handler: MCP endpoint
// Build a JSON-RPC error Response (used by /mcp) with the standard headers + CORS.
function jsonRpcError(
  message: string,
  status: number,
  origin?: string,
  wwwAuthenticate = false
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...(wwwAuthenticate && { 'WWW-Authenticate': 'Bearer' }),
        ...corsHeaders(origin),
      },
    }
  );
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') || undefined;

  // Extract authorization token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonRpcError(
      'Missing or invalid Authorization header',
      401,
      origin,
      true
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // SECURITY: Only accept session tokens (issued after token exchange).
  // Auth codes (auth: prefix) are NOT valid here - must go through /oauth/token first.
  // When token storage is configured, an unresolved token is rejected below rather
  // than forwarded to Attio, so a valid worker-issued session is required for /mcp.
  let attioToken = token;

  if (env.TOKEN_STORE && env.TOKEN_ENCRYPTION_KEY) {
    const tokenStorage = createTokenStorage({
      kv: env.TOKEN_STORE,
      encryptionKey: env.TOKEN_ENCRYPTION_KEY,
    });

    // Try session token first (new secure method)
    let storedToken = await tokenStorage.getToken(`session:${token}`);

    // Backward compatibility: try legacy token format (deprecated)
    if (!storedToken) {
      storedToken = await tokenStorage.getToken(`token:${token}`);
      if (storedToken) {
        console.warn(
          '[MCP] DEPRECATED: Legacy token format used. Will be removed in future version.'
        );
      }
    }

    // Also check for direct token (for users with raw Attio tokens)
    if (!storedToken) {
      storedToken = await tokenStorage.getToken(token);
      if (storedToken) {
        console.warn(
          '[MCP] DEPRECATED: Unprefixed token format used. Will be removed in future version.'
        );
      }
    }

    if (!storedToken) {
      // No valid session in KV (expired, revoked, or never issued). Do NOT fall
      // through to forwarding the caller's raw bearer to Attio -- that bypasses the
      // per-caller auth gate and yields a confusing downstream 401. Require re-auth.
      return jsonRpcError(
        'Invalid or expired session token - re-authenticate via the OAuth flow',
        401,
        origin,
        true
      );
    }

    attioToken = storedToken.accessToken;
  } else {
    // Token storage is required to authenticate the caller's session. Without it
    // we cannot validate the bearer, so refuse rather than forward the raw token
    // to Attio (which would make a misconfigured worker an open proxy).
    return jsonRpcError(
      'Server misconfigured: token storage unavailable',
      503,
      origin
    );
  }

  // Create MCP handler with the token
  const mcpHandler = createMcpHandler({
    attioToken,
  });

  return mcpHandler.handleHttpRequest(request);
}

// Handler: Health check
function handleHealth(env: Env, origin?: string): Response {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      worker_url: env.WORKER_URL,
      has_client_id: Boolean(env.ATTIO_CLIENT_ID),
      has_client_secret: Boolean(env.ATTIO_CLIENT_SECRET),
      has_token_storage: Boolean(env.TOKEN_STORE),
      has_encryption_key: Boolean(env.TOKEN_ENCRYPTION_KEY),
      endpoints: {
        oauth_discovery: '/.well-known/oauth-authorization-server',
        protected_resource: '/.well-known/oauth-protected-resource',
        authorize: '/oauth/authorize',
        token: '/oauth/token',
        mcp: '/mcp',
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    }
  );
}
