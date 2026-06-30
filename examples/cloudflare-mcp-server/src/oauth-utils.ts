import type { Env } from './env.js';
import { createTokenStorage, type StoredToken } from './token-storage.js';

// Session lifetime used when Attio's token response omits `expires_in`.
// Attio OAuth access tokens are long-lived and Attio returns no `expires_in`,
// so the previous 1-hour default expired the KV session->token mapping ~1h after
// connecting -- after which every /mcp call 401'd because the worker forwarded an
// orphaned session token to Attio. 30 days keeps the connection stable while still
// bounding how long a revoked token can linger; clients re-authenticate once it elapses.
export const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Short lifetime for the one-time `auth:<code>` record. The authorization code is
// exchanged immediately at /oauth/token, so it must not stay redeemable for the
// full session lifetime if it leaks (history/logs) or is never exchanged.
export const AUTH_CODE_TTL_SECONDS = 10 * 60; // 10 minutes

// PKCE helpers
export function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array.buffer);
}

// CORS headers for MCP clients
export function corsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, MCP-Protocol-Version',
    'Access-Control-Max-Age': '86400',
  };
}

// Normalize URL by removing trailing slashes
export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Escape user-controlled values before interpolating them into HTML responses.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Known MCP client hostnames (exact match required)
export const KNOWN_MCP_CLIENT_HOSTS = [
  'claude.ai', // Claude.ai
  'www.claude.ai',
  'chatgpt.com', // ChatGPT
  'chat.openai.com', // ChatGPT legacy
];

/**
 * Validate redirect_uri against allowlist to prevent open redirect attacks.
 * Pre-approves known MCP clients (Claude.ai, ChatGPT) and localhost for development.
 */
export function isAllowedRedirectUri(uri: string, env: Env): boolean {
  const baseUrl = normalizeUrl(env.WORKER_URL);

  // Always allow our own callback
  if (uri === `${baseUrl}/oauth/callback`) return true;

  try {
    const parsed = new URL(uri);
    const { hostname, pathname } = parsed;

    // Allow known MCP clients (exact hostname match)
    if (KNOWN_MCP_CLIENT_HOSTS.includes(hostname)) {
      return true;
    }

    // Allow localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // Check custom allowlist if configured
    if (env.ALLOWED_REDIRECT_URIS) {
      const allowed = env.ALLOWED_REDIRECT_URIS.split(',').map((u) => u.trim());
      for (const entry of allowed) {
        if (!entry) continue;

        try {
          const allowedParsed = new URL(entry);
          // Exact hostname match; if allowlist entry includes a path, enforce prefix match
          if (
            hostname === allowedParsed.hostname &&
            pathname.startsWith(allowedParsed.pathname || '/')
          ) {
            return true;
          }
        } catch {
          // Allowlist entry might be a bare hostname
          if (hostname === entry) {
            return true;
          }
        }
      }
    }
  } catch {
    return false; // Invalid URL
  }

  return false;
}

// Validate state parameter format
// Supports both PKCE standard (32-128 chars) and base64-encoded JSON payload
export function isValidStateParam(state: string): boolean {
  // Basic format: alphanumeric with URL-safe base64 chars, reasonable length
  // Max ~500 chars for base64-encoded JSON with reasonable payload
  return /^[A-Za-z0-9_-]{32,500}$/.test(state);
}

// OAuth discovery metadata (RFC 8414)
export function getOAuthMetadata(workerUrl: string): object {
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
export function getProtectedResourceMetadata(workerUrl: string): object {
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

// Build a StoredToken from an Attio /oauth/token response, stamped with the worker
// session lifetime. Attio's OAuth tokens are non-expiring (no expires_in), so the
// session TTL falls back to DEFAULT_SESSION_TTL_SECONDS.
export function storedTokenFromAttio(attio: {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}): StoredToken {
  return {
    accessToken: attio.access_token,
    refreshToken: attio.refresh_token,
    expiresAt:
      Math.floor(Date.now() / 1000) +
      (attio.expires_in || DEFAULT_SESSION_TTL_SECONDS),
    tokenType: attio.token_type || 'Bearer',
  };
}

// Mint a worker-issued session token for a stored Attio token and return the OAuth
// token response. The session token is the Bearer clients send at /mcp; /mcp rejects
// any bearer that does not resolve to a session here.
export async function mintSessionResponse(
  tokenStorage: ReturnType<typeof createTokenStorage>,
  storedToken: StoredToken,
  origin?: string
): Promise<Response> {
  const sessionToken = generateRandomString(32);
  await tokenStorage.storeToken(`session:${sessionToken}`, storedToken);
  return new Response(
    JSON.stringify({
      access_token: sessionToken,
      token_type: 'Bearer',
      expires_in: Math.max(
        0,
        storedToken.expiresAt - Math.floor(Date.now() / 1000)
      ),
      ...(storedToken.refreshToken && {
        refresh_token: storedToken.refreshToken,
      }),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    }
  );
}
