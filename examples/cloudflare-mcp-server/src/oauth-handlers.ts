import type { Env } from './env.js';
import {
  corsHeaders,
  normalizeUrl,
  escapeHtml,
  generateRandomString,
  isAllowedRedirectUri,
  isValidStateParam,
  getOAuthMetadata,
  getProtectedResourceMetadata,
  storedTokenFromAttio,
  mintSessionResponse,
  DEFAULT_SESSION_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
} from './oauth-utils.js';
import { createTokenStorage } from './token-storage.js';

// Handler: OAuth discovery
export function handleDiscovery(env: Env, origin?: string): Response {
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
export function handleProtectedResource(env: Env, origin?: string): Response {
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
export async function handleAuthorize(
  request: Request,
  env: Env
): Promise<Response> {
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
export async function handleCallback(
  request: Request,
  env: Env
): Promise<Response> {
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
          <p>Error: ${escapeHtml(error)}</p>
          <p>${escapeHtml(url.searchParams.get('error_description') || '')}</p>
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

  // SECURITY: Require callback state to be a session issued by /oauth/authorize.
  // Do not trust state payload from the callback itself.
  if (!state) {
    return new Response('Missing state parameter', { status: 400 });
  }

  const sessionDataStr = await env.TOKEN_STORE.get(`session:${state}`);
  if (!sessionDataStr) {
    console.warn(
      'OAuth callback rejected: state was not issued by this worker',
      state.substring(0, 8) + '...'
    );
    return new Response('Invalid or expired state', { status: 400 });
  }

  let clientRedirectUri: string | null = null;
  let originalState: string | null = null;

  try {
    const sessionData = JSON.parse(sessionDataStr) as {
      redirectUri?: string;
      originalState?: string;
    };
    clientRedirectUri = sessionData.redirectUri || null;
    originalState = sessionData.originalState || null;
  } catch {
    await env.TOKEN_STORE.delete(`session:${state}`);
    return new Response('Invalid OAuth session state', { status: 400 });
  }

  // Clean up session data immediately after successful validation (single use)
  await env.TOKEN_STORE.delete(`session:${state}`);

  if (!clientRedirectUri || !isAllowedRedirectUri(clientRedirectUri, env)) {
    console.warn(
      'OAuth callback rejected due to invalid redirect_uri in session'
    );
    return new Response('Invalid redirect URI in OAuth session', {
      status: 400,
    });
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

  const storedToken = storedTokenFromAttio(tokens);

  // SECURITY: Store with auth: prefix - only valid at /oauth/token endpoint
  // Auth codes are one-time use and cannot be used directly at /mcp
  console.log(
    '[OAuth Callback] Storing token with auth code:',
    authCode.substring(0, 8) + '...'
  );
  // One-time auth code: force a short KV TTL even though storedToken carries the
  // long session lifetime (reused when the session token is minted at /oauth/token).
  await tokenStorage.storeToken(
    `auth:${authCode}`,
    storedToken,
    AUTH_CODE_TTL_SECONDS
  );
  console.log('[OAuth Callback] Token stored with auth: prefix');

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
          <div class="token-box">${escapeHtml(tokens.access_token.substring(0, 12))}...${escapeHtml(tokens.access_token.slice(-8))}</div>
          <p style="font-size: 12px; color: #666;">Token stored securely in KV. Use the server URL above to authenticate.</p>

          ${
            tokens.refresh_token
              ? `
          <h4>Refresh Token (Preview)</h4>
          <div class="token-box">${escapeHtml(tokens.refresh_token.substring(0, 12))}...${escapeHtml(tokens.refresh_token.slice(-8))}</div>
          `
              : ''
          }

          <h4>Token Info</h4>
          <pre>Expires in: ${escapeHtml(String(tokens.expires_in || DEFAULT_SESSION_TTL_SECONDS))} seconds
Token length: ${tokens.access_token.length} chars</pre>
        </div>

        <p style="margin-top: 30px; color: #666;">
          Expires in: ${escapeHtml(String(tokens.expires_in || DEFAULT_SESSION_TTL_SECONDS))} seconds
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
export async function handleToken(
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

        // Mint a session token (not the raw Attio token) for use at /mcp
        return mintSessionResponse(tokenStorage, storedToken, origin);
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

  // Wrap a successful Attio token exchange (refresh_token grant or a direct Attio
  // code) in a worker-issued session token, mirroring the authorization-code path.
  // /mcp rejects bearers with no KV session, so returning Attio's raw token here
  // would make the very next /mcp call fail with 401.
  const { access_token, refresh_token, token_type, expires_in } = data as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (
    response.ok &&
    env.TOKEN_STORE &&
    env.TOKEN_ENCRYPTION_KEY &&
    typeof access_token === 'string'
  ) {
    const tokenStorage = createTokenStorage({
      kv: env.TOKEN_STORE,
      encryptionKey: env.TOKEN_ENCRYPTION_KEY,
    });
    return mintSessionResponse(
      tokenStorage,
      storedTokenFromAttio({
        access_token,
        refresh_token,
        token_type,
        expires_in,
      }),
      origin
    );
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Handler: Dynamic client registration (RFC 7591)
// Required for Claude Desktop and Claude.ai OAuth integration
// We act as OAuth proxy - MCP clients authenticate with us,
// and we use ATTIO_CLIENT_SECRET internally to talk to Attio
export async function handleRegister(
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
