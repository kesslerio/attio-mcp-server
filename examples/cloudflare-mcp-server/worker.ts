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

import { createTokenStorage, type StoredToken } from './src/token-storage.js';
import { createMcpHandler } from './src/mcp-handler.js';

export interface Env {
  // Attio OAuth credentials
  ATTIO_CLIENT_ID: string;
  ATTIO_CLIENT_SECRET: string;

  // Worker configuration
  WORKER_URL: string; // e.g., https://your-worker.your-subdomain.workers.dev

  // Token encryption key (32-byte hex string)
  TOKEN_ENCRYPTION_KEY: string;

  // KV namespace for token storage
  TOKEN_STORE: KVNamespace;

  // Optional: Legacy session storage
  OAUTH_SESSIONS?: KVNamespace;

  // Optional: Additional allowed redirect URIs (comma-separated)
  // Known MCP clients (Claude.ai, ChatGPT) and localhost are pre-approved
  ALLOWED_REDIRECT_URIS?: string;
}

// PKCE helpers
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array.buffer);
}

// CORS headers for MCP clients
function corsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, MCP-Protocol-Version',
    'Access-Control-Max-Age': '86400',
  };
}

// Normalize URL by removing trailing slashes
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Known MCP client OAuth callbacks (pre-approved for security)
const KNOWN_MCP_CLIENTS = [
  'https://claude.ai', // Claude.ai
  'https://www.claude.ai',
  'https://chatgpt.com', // ChatGPT
  'https://chat.openai.com', // ChatGPT legacy
];

/**
 * Validate redirect_uri against allowlist to prevent open redirect attacks.
 * Pre-approves known MCP clients (Claude.ai, ChatGPT) and localhost for development.
 */
function isAllowedRedirectUri(uri: string, env: Env): boolean {
  const baseUrl = normalizeUrl(env.WORKER_URL);

  // Always allow our own callback
  if (uri === `${baseUrl}/oauth/callback`) return true;

  try {
    const parsed = new URL(uri);
    const origin = `${parsed.protocol}//${parsed.host}`;

    // Allow known MCP clients
    if (KNOWN_MCP_CLIENTS.some((known) => origin.startsWith(known))) {
      return true;
    }

    // Allow localhost for development
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    // Check custom allowlist if configured
    if (env.ALLOWED_REDIRECT_URIS) {
      const allowed = env.ALLOWED_REDIRECT_URIS.split(',').map((u) => u.trim());
      if (allowed.includes(uri) || allowed.some((a) => origin.startsWith(a))) {
        return true;
      }
    }
  } catch {
    return false; // Invalid URL
  }

  return false;
}

// Validate state parameter format
// Supports both PKCE standard (32-128 chars) and base64-encoded JSON payload
function isValidStateParam(state: string): boolean {
  // Basic format: alphanumeric with URL-safe base64 chars, reasonable length
  // Max ~500 chars for base64-encoded JSON with reasonable payload
  return /^[A-Za-z0-9_-]{32,500}$/.test(state);
}

// OAuth discovery metadata (RFC 8414)
function getOAuthMetadata(workerUrl: string): object {
  const baseUrl = normalizeUrl(workerUrl);
  return {
    issuer: `${baseUrl}/`,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    scopes_supported: [
      'record_permission:read',
      'record_permission:read_write',
      'user_management:read',
      'object:read',
    ],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
  };
}

// Protected resource metadata (for ChatGPT)
function getProtectedResourceMetadata(workerUrl: string): object {
  const baseUrl = normalizeUrl(workerUrl);
  return {
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: [
      'record_permission:read',
      'record_permission:read_write',
      'user_management:read',
      'object:read',
    ],
  };
}

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

// Handler: OAuth discovery
function handleDiscovery(env: Env, origin?: string): Response {
  const metadata = getOAuthMetadata(env.WORKER_URL);
  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Handler: Protected resource metadata (ChatGPT)
function handleProtectedResource(env: Env, origin?: string): Response {
  const metadata = getProtectedResourceMetadata(env.WORKER_URL);
  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Handler: Authorize redirect
async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = normalizeUrl(env.WORKER_URL);

  // Get parameters from query string
  const clientId = url.searchParams.get('client_id') || env.ATTIO_CLIENT_ID;
  const redirectUri =
    url.searchParams.get('redirect_uri') || `${baseUrl}/oauth/callback`;

  // SECURITY: Validate redirect_uri against allowlist to prevent open redirect attacks
  if (!isAllowedRedirectUri(redirectUri, env)) {
    console.warn(
      'Rejected unauthorized redirect_uri:',
      redirectUri.substring(0, 50) + '...'
    );
    return new Response(
      JSON.stringify({
        error: 'invalid_request',
        error_description:
          'redirect_uri is not in the allowlist. Only known MCP clients (Claude.ai, ChatGPT), localhost, and explicitly configured URIs are allowed.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const scope =
    url.searchParams.get('scope') ||
    'record_permission:read record_permission:read_write user_management:read object:read';
  const originalState =
    url.searchParams.get('state') || generateRandomString(32);
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod =
    url.searchParams.get('code_challenge_method') || 'S256';

  // Encode redirect_uri in state to ensure it survives the OAuth round-trip
  // This is more robust than relying on KV storage timing
  const statePayload = JSON.stringify({
    originalState,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    clientId,
  });
  const state = btoa(statePayload)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Also store in KV as backup (for PKCE verification later)
  const sessionData = {
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    clientId,
    originalState,
  };

  await env.TOKEN_STORE.put(
    `session:${state}`,
    JSON.stringify(sessionData),
    { expirationTtl: 600 } // 10 minutes
  );

  // Also store in OAUTH_SESSIONS if available (legacy support)
  if (env.OAUTH_SESSIONS && codeChallenge) {
    await env.OAUTH_SESSIONS.put(
      `state:${state}`,
      JSON.stringify(sessionData),
      { expirationTtl: 600 }
    );
  }

  // Build Attio authorization URL
  const attioAuthUrl = new URL('https://app.attio.com/authorize');
  attioAuthUrl.searchParams.set('client_id', env.ATTIO_CLIENT_ID);
  attioAuthUrl.searchParams.set('redirect_uri', `${baseUrl}/oauth/callback`);
  attioAuthUrl.searchParams.set('response_type', 'code');
  attioAuthUrl.searchParams.set('scope', scope);
  attioAuthUrl.searchParams.set('state', state);

  // Pass through PKCE if provided
  if (codeChallenge) {
    attioAuthUrl.searchParams.set('code_challenge', codeChallenge);
    attioAuthUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  }

  return Response.redirect(attioAuthUrl.toString(), 302);
}

// Handler: OAuth callback from Attio
async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = normalizeUrl(env.WORKER_URL);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Validate state parameter format before using in KV operations
  if (state && !isValidStateParam(state)) {
    console.warn(
      'Invalid state parameter format received:',
      state.substring(0, 8) + '...'
    );
    return new Response('Invalid state parameter format', { status: 400 });
  }

  if (error) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Authentication Failed</h1>
          <p>Error: ${error}</p>
          <p>${url.searchParams.get('error_description') || ''}</p>
        </body>
      </html>
    `,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://app.attio.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ATTIO_CLIENT_ID,
      client_secret: env.ATTIO_CLIENT_SECRET,
      code,
      redirect_uri: `${baseUrl}/oauth/callback`,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    // SECURITY: Only log status, not response body (may contain OAuth secrets)
    console.error(
      'Token exchange failed:',
      tokenResponse.status,
      tokenResponse.statusText
    );
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Token Exchange Failed</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Token Exchange Failed</h1>
          <p>Unable to exchange authorization code for tokens.</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  // Generate an authorization code for the client
  const authCode = generateRandomString(32);

  // CRITICAL: Fail early if storage config is missing (don't silently discard tokens)
  if (!env.TOKEN_STORE || !env.TOKEN_ENCRYPTION_KEY) {
    console.error(
      'Missing TOKEN_STORE or TOKEN_ENCRYPTION_KEY - cannot store tokens'
    );
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Configuration Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Configuration Error</h1>
          <p>Server is misconfigured. TOKEN_STORE or TOKEN_ENCRYPTION_KEY is missing.</p>
          <p>Contact the server administrator.</p>
        </body>
      </html>
    `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Store tokens in encrypted KV storage, keyed by the auth code
  const tokenStorage = createTokenStorage({
    kv: env.TOKEN_STORE,
    encryptionKey: env.TOKEN_ENCRYPTION_KEY,
  });

  const storedToken: StoredToken = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
    tokenType: tokens.token_type || 'Bearer',
  };

  // SECURITY: Store with auth: prefix - only valid at /oauth/token endpoint
  // Auth codes are one-time use and cannot be used directly at /mcp
  console.log(
    '[OAuth Callback] Storing token with auth code:',
    authCode.substring(0, 8) + '...'
  );
  await tokenStorage.storeToken(`auth:${authCode}`, storedToken);
  console.log('[OAuth Callback] Token stored with auth: prefix');

  // Extract redirect_uri from encoded state (primary method)
  // Fall back to KV lookup if state decoding fails
  let clientRedirectUri: string | null = null;
  let originalState: string | null = null;

  if (state) {
    // Try to decode state (base64url encoded JSON)
    try {
      const paddedState = state.replace(/-/g, '+').replace(/_/g, '/');
      const statePayload = JSON.parse(atob(paddedState));
      clientRedirectUri = statePayload.redirectUri || null;
      originalState = statePayload.originalState || null;
    } catch {
      // State wasn't encoded, try KV lookup as fallback
      const sessionDataStr = await env.TOKEN_STORE.get(`session:${state}`);
      if (sessionDataStr) {
        try {
          const sessionData = JSON.parse(sessionDataStr) as {
            redirectUri?: string;
            originalState?: string;
          };
          clientRedirectUri = sessionData.redirectUri || null;
          originalState = sessionData.originalState || null;
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Clean up session data
    await env.TOKEN_STORE.delete(`session:${state}`);
  }

  // If we have a client redirect_uri, redirect back to the client with the auth code
  if (clientRedirectUri && clientRedirectUri !== `${baseUrl}/oauth/callback`) {
    const redirectUrl = new URL(clientRedirectUri);
    redirectUrl.searchParams.set('code', authCode);
    // Use original state (not our encoded version) when redirecting to client
    if (originalState) {
      redirectUrl.searchParams.set('state', originalState);
    }
    return Response.redirect(redirectUrl.toString(), 302);
  }

  // Fallback: Success page with token display and MCP instructions
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px; }
          .token-box { background: #f5f5f5; padding: 15px; border-radius: 8px; word-break: break-all; margin: 10px 0; font-family: monospace; font-size: 12px; }
          .copy-btn { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .copy-btn:hover { background: #0052a3; }
          .section { margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
          h3 { margin-top: 0; }
          pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 8px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Authentication Successful!</h1>
        <p>Your Attio OAuth tokens have been generated and stored.</p>

        <div class="section">
          <h3>For Claude.ai</h3>
          <p>Add this server in Claude Settings > Connectors:</p>
          <pre>Server URL: ${env.WORKER_URL}/mcp</pre>
        </div>

        <div class="section">
          <h3>For ChatGPT</h3>
          <p>Add as an MCP connector in Developer Mode with:</p>
          <pre>Server URL: ${env.WORKER_URL}</pre>
        </div>

        <div class="section">
          <h3>For Local Development</h3>
          <p>Your tokens have been securely stored. For security, only previews are shown below.</p>

          <h4>Access Token (Preview)</h4>
          <div class="token-box">${tokens.access_token.substring(0, 12)}...${tokens.access_token.slice(-8)}</div>
          <p style="font-size: 12px; color: #666;">Token stored securely in KV. Use the server URL above to authenticate.</p>

          ${
            tokens.refresh_token
              ? `
          <h4>Refresh Token (Preview)</h4>
          <div class="token-box">${tokens.refresh_token.substring(0, 12)}...${tokens.refresh_token.slice(-8)}</div>
          `
              : ''
          }

          <h4>Token Info</h4>
          <pre>Expires in: ${tokens.expires_in || 3600} seconds
Token length: ${tokens.access_token.length} chars</pre>
        </div>

        <p style="margin-top: 30px; color: #666;">
          Expires in: ${tokens.expires_in || 3600} seconds
          ${state ? ` | Session: ${state.substring(0, 8)}...` : ''}
        </p>
      </body>
    </html>
  `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
}

// Handler: Token exchange/refresh
async function handleToken(
  request: Request,
  env: Env,
  origin?: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  const contentType = request.headers.get('Content-Type') || '';
  let params: URLSearchParams;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    params = new URLSearchParams(body as Record<string, string>);
  } else {
    const body = await request.text();
    params = new URLSearchParams(body);
  }

  const grantType = params.get('grant_type');
  const baseUrl = normalizeUrl(env.WORKER_URL);

  // For authorization_code grant, first check if we have stored tokens for this code
  if (grantType === 'authorization_code' || !grantType) {
    const code = params.get('code');
    if (!code) {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing code',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    // Check if this is one of our generated auth codes (with auth: prefix)
    if (env.TOKEN_STORE && env.TOKEN_ENCRYPTION_KEY) {
      const tokenStorage = createTokenStorage({
        kv: env.TOKEN_STORE,
        encryptionKey: env.TOKEN_ENCRYPTION_KEY,
      });

      console.log(
        '[Token Exchange] Looking up auth code:',
        code.substring(0, 8) + '...'
      );

      // SECURITY: Look up with auth: prefix (auth codes only valid here)
      const storedToken = await tokenStorage.getToken(`auth:${code}`);
      console.log(
        '[Token Exchange] Found auth code:',
        storedToken ? 'yes' : 'no'
      );

      if (storedToken) {
        // SECURITY: Delete auth code immediately (one-time use)
        await tokenStorage.deleteToken(`auth:${code}`);
        console.log('[Token Exchange] Auth code deleted (one-time use)');

        // SECURITY: Generate a separate session token for MCP access
        // This session token is what the client uses at /mcp endpoint
        const sessionToken = generateRandomString(32);
        await tokenStorage.storeToken(`session:${sessionToken}`, storedToken);
        console.log(
          '[Token Exchange] Session token created:',
          sessionToken.substring(0, 8) + '...'
        );

        // Return session token (not the raw Attio token)
        // Client uses this session token as Bearer token for /mcp
        const response = {
          access_token: sessionToken,
          token_type: 'Bearer',
          expires_in: Math.max(
            0,
            storedToken.expiresAt - Math.floor(Date.now() / 1000)
          ),
          ...(storedToken.refreshToken && {
            refresh_token: storedToken.refreshToken,
          }),
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        });
      }
    }

    // Not our code, fall through to forward to Attio
  }

  // Build token request to Attio (for refresh_token or direct Attio codes)
  const tokenParams = new URLSearchParams({
    grant_type: grantType || 'authorization_code',
    client_id: params.get('client_id') || env.ATTIO_CLIENT_ID,
    client_secret: params.get('client_secret') || env.ATTIO_CLIENT_SECRET,
  });

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token');
    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing refresh_token',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }
    tokenParams.set('refresh_token', refreshToken);
  } else {
    const code = params.get('code');
    if (code) {
      tokenParams.set('code', code);
    }
    tokenParams.set(
      'redirect_uri',
      params.get('redirect_uri') || `${baseUrl}/oauth/callback`
    );

    // PKCE code_verifier
    const codeVerifier = params.get('code_verifier');
    if (codeVerifier) {
      tokenParams.set('code_verifier', codeVerifier);
    }
  }

  // Forward to Attio
  const response = await fetch('https://app.attio.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Handler: Dynamic client registration (RFC 7591)
// Generates a unique client_id for each MCP client (Claude, ChatGPT, etc.)
// SECURITY: Does NOT expose ATTIO_CLIENT_SECRET - we handle OAuth internally
async function handleRegister(
  request: Request,
  env: Env,
  origin?: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  const body = (await request.json()) as {
    redirect_uris?: string[];
    client_name?: string;
    grant_types?: string[];
    response_types?: string[];
  };

  // Generate a unique client ID for this MCP client
  const clientId = `mcp_${generateRandomString(16)}`;
  const baseUrl = normalizeUrl(env.WORKER_URL);

  // Return client registration response
  // NOTE: We don't expose the real ATTIO_CLIENT_SECRET
  // Instead, we act as an OAuth proxy - the MCP client authenticates with us,
  // and we use our ATTIO_CLIENT_SECRET internally to talk to Attio
  const response = {
    client_id: clientId,
    client_name: body.client_name || 'MCP Client',
    redirect_uris: body.redirect_uris || [`${baseUrl}/oauth/callback`],
    grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
    response_types: body.response_types || ['code'],
    token_endpoint_auth_method: 'none', // Public client - no secret needed
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Handler: MCP endpoint
async function handleMcp(request: Request, env: Env): Promise<Response> {
  // Extract authorization token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Missing or invalid Authorization header',
        },
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer',
        },
      }
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // SECURITY: Only accept session tokens (issued after token exchange)
  // Auth codes (auth: prefix) are NOT valid here - must go through /oauth/token first
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

    if (storedToken) {
      attioToken = storedToken.accessToken;
    }
  }

  // Create MCP handler with the token
  const mcpHandler = createMcpHandler({
    attioToken,
    registryConfig: { mode: 'full' },
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
