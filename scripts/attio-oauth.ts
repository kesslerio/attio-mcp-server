#!/usr/bin/env npx tsx
/**
 * Attio OAuth Helper Script
 *
 * Provides local OAuth token acquisition via PKCE flow.
 * No hosted infrastructure required - runs entirely on localhost.
 *
 * Usage:
 *   npm run oauth:setup    - Start OAuth flow and obtain tokens
 *   npm run oauth:refresh  - Refresh an expired access token
 *
 * @see https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth
 */

import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as readline from 'readline';

// Configuration
const ATTIO_AUTH_URL = 'https://app.attio.com/authorize';
const ATTIO_TOKEN_URL = 'https://app.attio.com/oauth/token';
const CALLBACK_PORT = 3456;
const CALLBACK_PATH = '/callback';
const ENV_FILE = '.env.local';

// PKCE helpers
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(str: string): Buffer {
  return crypto.createHash('sha256').update(str).digest();
}

function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(sha256(verifier));
}

function generateState(): string {
  return base64URLEncode(crypto.randomBytes(16));
}

// Prompt helper
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// HTTP request helper for token exchange
function postRequest(
  urlString: string,
  data: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(urlString);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 500, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Save tokens to .env.local
function saveTokens(accessToken: string, refreshToken?: string): void {
  const envPath = path.join(process.cwd(), ENV_FILE);
  let content = '';

  // Read existing content if file exists
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  // Update or add ATTIO_ACCESS_TOKEN
  if (content.includes('ATTIO_ACCESS_TOKEN=')) {
    content = content.replace(
      /ATTIO_ACCESS_TOKEN=.*/,
      `ATTIO_ACCESS_TOKEN=${accessToken}`
    );
  } else {
    content += `\n# Attio OAuth tokens (auto-generated)\nATTIO_ACCESS_TOKEN=${accessToken}\n`;
  }

  // Update or add ATTIO_REFRESH_TOKEN
  if (refreshToken) {
    if (content.includes('ATTIO_REFRESH_TOKEN=')) {
      content = content.replace(
        /ATTIO_REFRESH_TOKEN=.*/,
        `ATTIO_REFRESH_TOKEN=${refreshToken}`
      );
    } else {
      content += `ATTIO_REFRESH_TOKEN=${refreshToken}\n`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + '\n');
  console.log(`\nTokens saved to ${ENV_FILE}`);
}

// Load refresh token from .env.local or environment
function loadRefreshToken(): string | undefined {
  // Try environment first
  if (process.env.ATTIO_REFRESH_TOKEN) {
    return process.env.ATTIO_REFRESH_TOKEN;
  }

  // Try .env.local
  const envPath = path.join(process.cwd(), ENV_FILE);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/ATTIO_REFRESH_TOKEN=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

// OAuth setup flow
async function setupOAuth(): Promise<void> {
  console.log('\n🔐 Attio OAuth Setup\n');
  console.log(
    'This script will help you obtain OAuth tokens for the Attio MCP Server.'
  );
  console.log('You need an OAuth app registered in Attio first.\n');

  // Get client ID
  const clientId = await prompt('Enter your Attio OAuth Client ID: ');
  if (!clientId) {
    console.error('❌ Client ID is required');
    process.exit(1);
  }

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Build authorization URL
  const redirectUri = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
  const scopes = [
    'record_permission:read',
    'record_permission:read_write',
    'user_management:read',
    'object:read',
  ].join(' ');

  const authUrl = new url.URL(ATTIO_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log('\n📋 Steps:');
  console.log('1. Open the URL below in your browser');
  console.log('2. Authorize the app in Attio');
  console.log('3. You will be redirected back here automatically\n');
  console.log('Authorization URL:');
  console.log(authUrl.toString());
  console.log('\n⏳ Waiting for callback...\n');

  // Start local server to receive callback
  const server = http.createServer(async (req, res) => {
    const reqUrl = new url.URL(
      req.url || '',
      `http://localhost:${CALLBACK_PORT}`
    );

    if (reqUrl.pathname !== CALLBACK_PATH) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const code = reqUrl.searchParams.get('code');
    const returnedState = reqUrl.searchParams.get('state');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400);
      res.end(`Error: ${error}`);
      console.error(`❌ OAuth error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch - possible CSRF attack');
      console.error('❌ State mismatch');
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400);
      res.end('No authorization code received');
      console.error('❌ No authorization code');
      server.close();
      process.exit(1);
    }

    console.log('✅ Authorization code received');
    console.log('🔄 Exchanging code for tokens...\n');

    // Exchange code for tokens
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString();

    try {
      const response = await postRequest(ATTIO_TOKEN_URL, tokenData);

      if (response.status !== 200) {
        throw new Error(`Token exchange failed: ${response.body}`);
      }

      const tokens = JSON.parse(response.body);

      // Success page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Attio OAuth Success</title></head>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1>✅ Authentication Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body>
        </html>
      `);

      console.log('✅ Token exchange successful!\n');
      console.log(
        'Access Token:',
        tokens.access_token.substring(0, 20) + '...'
      );
      if (tokens.refresh_token) {
        console.log(
          'Refresh Token:',
          tokens.refresh_token.substring(0, 20) + '...'
        );
      }
      console.log('Expires In:', tokens.expires_in, 'seconds');

      // Ask to save
      const save = await prompt('\nSave tokens to .env.local? (y/n): ');
      if (save.toLowerCase() === 'y') {
        saveTokens(tokens.access_token, tokens.refresh_token);
      } else {
        console.log('\nTo use the token, set:');
        console.log(`export ATTIO_ACCESS_TOKEN="${tokens.access_token}"`);
      }

      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500);
      res.end('Token exchange failed');
      console.error('❌ Token exchange failed:', err);
      server.close();
      process.exit(1);
    }
  });

  server.listen(CALLBACK_PORT, () => {
    console.log(
      `Callback server listening on http://localhost:${CALLBACK_PORT}`
    );
  });
}

// Refresh token flow
async function refreshOAuth(): Promise<void> {
  console.log('\n🔄 Attio OAuth Token Refresh\n');

  // Get client ID
  const clientId = await prompt('Enter your Attio OAuth Client ID: ');
  if (!clientId) {
    console.error('❌ Client ID is required');
    process.exit(1);
  }

  // Get refresh token
  let refreshToken = loadRefreshToken();
  if (!refreshToken) {
    refreshToken = await prompt('Enter your refresh token: ');
  } else {
    console.log('Using refresh token from .env.local');
  }

  if (!refreshToken) {
    console.error('❌ Refresh token is required');
    process.exit(1);
  }

  console.log('\n🔄 Refreshing token...\n');

  const tokenData = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  }).toString();

  try {
    const response = await postRequest(ATTIO_TOKEN_URL, tokenData);

    if (response.status !== 200) {
      throw new Error(`Token refresh failed: ${response.body}`);
    }

    const tokens = JSON.parse(response.body);

    console.log('✅ Token refresh successful!\n');
    console.log(
      'New Access Token:',
      tokens.access_token.substring(0, 20) + '...'
    );
    if (tokens.refresh_token) {
      console.log(
        'New Refresh Token:',
        tokens.refresh_token.substring(0, 20) + '...'
      );
    }
    console.log('Expires In:', tokens.expires_in, 'seconds');

    // Ask to save
    const save = await prompt('\nUpdate tokens in .env.local? (y/n): ');
    if (save.toLowerCase() === 'y') {
      saveTokens(tokens.access_token, tokens.refresh_token);
    } else {
      console.log('\nTo use the token, set:');
      console.log(`export ATTIO_ACCESS_TOKEN="${tokens.access_token}"`);
    }
  } catch (err) {
    console.error('❌ Token refresh failed:', err);
    process.exit(1);
  }
}

// Main
const command = process.argv[2];

if (command === 'refresh') {
  refreshOAuth().catch(console.error);
} else {
  setupOAuth().catch(console.error);
}
