/**
 * Cloudflare Worker OAuth Broker for Attio MCP Server
 *
 * This worker provides OAuth 2.1 endpoints for Attio authentication,
 * enabling MCP clients like Claude Desktop to authenticate via OAuth
 * without requiring users to manually manage tokens.
 *
 * Endpoints:
 * - GET  /.well-known/oauth-authorization-server - OAuth discovery
 * - GET  /oauth/authorize - Redirect to Attio OAuth
 * - GET  /oauth/callback - Handle Attio callback
 * - POST /oauth/token - Token exchange/refresh
 * - POST /oauth/register - Dynamic client registration (RFC 7591)
 * - GET  /health - Health check
 *
 * @see https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth
 */

export interface Env {
  // Attio OAuth credentials
  ATTIO_CLIENT_ID: string;
  ATTIO_CLIENT_SECRET: string;

  // Worker configuration
  WORKER_URL: string; // e.g., https://your-worker.your-subdomain.workers.dev

  // Optional: KV namespace for session storage
  OAUTH_SESSIONS?: KVNamespace;
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

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hash);
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// OAuth discovery metadata
function getOAuthMetadata(workerUrl: string): object {
  return {
    issuer: workerUrl,
    authorization_endpoint: `${workerUrl}/oauth/authorize`,
    token_endpoint: `${workerUrl}/oauth/token`,
    registration_endpoint: `${workerUrl}/oauth/register`,
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

    try {
      // Route handling
      switch (url.pathname) {
        case '/.well-known/oauth-authorization-server':
          return handleDiscovery(env, origin);

        case '/oauth/authorize':
          return handleAuthorize(request, env);

        case '/oauth/callback':
          return handleCallback(request, env);

        case '/oauth/token':
          return handleToken(request, env, origin);

        case '/oauth/register':
          return handleRegister(request, env, origin);

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

// Handler: Authorize redirect
async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Get parameters from query string
  const clientId = url.searchParams.get('client_id') || env.ATTIO_CLIENT_ID;
  const redirectUri =
    url.searchParams.get('redirect_uri') || `${env.WORKER_URL}/oauth/callback`;
  const scope =
    url.searchParams.get('scope') ||
    'record_permission:read record_permission:read_write user_management:read object:read';
  const state = url.searchParams.get('state') || generateRandomString(32);
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod =
    url.searchParams.get('code_challenge_method') || 'S256';

  // Store state and PKCE info in KV if available
  if (env.OAUTH_SESSIONS && codeChallenge) {
    await env.OAUTH_SESSIONS.put(
      `state:${state}`,
      JSON.stringify({
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        clientId,
      }),
      { expirationTtl: 600 } // 10 minutes
    );
  }

  // Build Attio authorization URL
  const attioAuthUrl = new URL('https://auth.attio.com/oauth/authorize');
  attioAuthUrl.searchParams.set('client_id', env.ATTIO_CLIENT_ID);
  attioAuthUrl.searchParams.set(
    'redirect_uri',
    `${env.WORKER_URL}/oauth/callback`
  );
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
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

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
  const tokenResponse = await fetch('https://auth.attio.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ATTIO_CLIENT_ID,
      client_secret: env.ATTIO_CLIENT_SECRET,
      code,
      redirect_uri: `${env.WORKER_URL}/oauth/callback`,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Token exchange failed:', errorData);
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

  const tokens = await tokenResponse.json();

  // Success page with token display
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          .token-box { background: #f5f5f5; padding: 15px; border-radius: 8px; word-break: break-all; margin: 10px 0; }
          .copy-btn { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .copy-btn:hover { background: #0052a3; }
        </style>
      </head>
      <body>
        <h1>Authentication Successful!</h1>
        <p>Your Attio OAuth tokens have been generated.</p>

        <h3>Access Token</h3>
        <div class="token-box" id="access-token">${(tokens as { access_token: string }).access_token}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('access-token').textContent)">Copy Access Token</button>

        ${
          (tokens as { refresh_token?: string }).refresh_token
            ? `
        <h3>Refresh Token</h3>
        <div class="token-box" id="refresh-token">${(tokens as { refresh_token: string }).refresh_token}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('refresh-token').textContent)">Copy Refresh Token</button>
        `
            : ''
        }

        <h3>Usage</h3>
        <p>Set the access token in your environment:</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px;">export ATTIO_ACCESS_TOKEN="${(tokens as { access_token: string }).access_token.substring(0, 20)}..."</pre>

        <p>Or in your .env file:</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px;">ATTIO_ACCESS_TOKEN=${(tokens as { access_token: string }).access_token.substring(0, 20)}...</pre>

        <p style="margin-top: 30px; color: #666;">Expires in: ${(tokens as { expires_in?: number }).expires_in || 3600} seconds</p>
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

  // Build token request to Attio
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
    tokenParams.set('code', code);
    tokenParams.set(
      'redirect_uri',
      params.get('redirect_uri') || `${env.WORKER_URL}/oauth/callback`
    );

    // PKCE code_verifier
    const codeVerifier = params.get('code_verifier');
    if (codeVerifier) {
      tokenParams.set('code_verifier', codeVerifier);
    }
  }

  // Forward to Attio
  const response = await fetch('https://auth.attio.com/oauth/token', {
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

  // Generate a client ID for this registration
  // In a production system, you'd store this in KV/database
  const clientId = `mcp_${generateRandomString(16)}`;

  const response = {
    client_id: clientId,
    client_secret: env.ATTIO_CLIENT_SECRET, // Use the shared secret
    client_name: body.client_name || 'MCP Client',
    redirect_uris: body.redirect_uris || [`${env.WORKER_URL}/oauth/callback`],
    grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
    response_types: body.response_types || ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
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
