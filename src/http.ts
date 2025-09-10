// src/http.ts
#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server/createServer.js';
import { error as logError, OperationType } from './utils/logger.js';

// Minimal .env loader (no stdout noise)
import * as fs from 'node:fs';
import * as path from 'node:path';
(() => {
  try {
    const p = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const [k, ...v] = t.split('=');
      if (k && v.length && !process.env[k]) process.env[k] = v.join('=').replace(/^["']|["']$/g, '');
    }
  } catch { /* silent */ }
})();

const app = express();
app.use(express.json());

// CORS (Smithery + local)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://smithery.ai', 'http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'Mcp-Session-Id'],
    exposedHeaders: ['Mcp-Session-Id'],
  })
);
app.options('/mcp', cors());

// Simple health
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// --- Session store (required for Streamable HTTP) ---
type Session = {
  transport: StreamableHTTPServerTransport;
  close: () => void;
};
const sessions: Record<string, Session> = {};
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes idle TTL

function attachCleanup(transport: StreamableHTTPServerTransport) {
  transport.onclose = () => {
    const id = transport.sessionId;
    if (id && sessions[id]) delete sessions[id];
  };
}

// Optional: idle TTL cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of Object.entries(sessions)) {
    // @ts-expect-error - _lastActive is internal; we update it below
    const last = sess.transport._lastActive as number | undefined;
    if (last && now - last > SESSION_TTL_MS) {
      try { sess.close(); } catch {}
      delete sessions[id];
    }
  }
}, 60_000).unref();

// --- MCP endpoint (POST is sufficient) ---
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = (req.headers['mcp-session-id'] as string | undefined) ||
                      (req.headers['Mcp-Session-Id'] as string | undefined);

    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions[sessionId]) {
      // Reuse existing transport/session
      transport = sessions[sessionId].transport;
      // @ts-expect-error internal marker for TTL
      transport._lastActive = Date.now();
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialize → create transport + server, store session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions[id] = {
            transport,
            close: () => transport.close(),
          };
        },
      });
      attachCleanup(transport);

      const server = createServer();
      await server.connect(transport);
      // @ts-expect-error internal marker for TTL
      transport._lastActive = Date.now();
    } else {
      // Not an initialize, and no valid session to route to
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    // Handle the JSON-RPC request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logError('http', 'Error handling MCP request', error, undefined, 'mcp-request-error', OperationType.API_CALL);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Boot
const PORT = Number(process.env.PORT) || 3000;
app
  .listen(PORT, () => {
    // Keep scanner stdout clean
    console.error(`Attio MCP HTTP Server listening on port ${PORT}`);
    console.error(`Health check: http://localhost:${PORT}/health`);
    console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
  })
  .on('error', (error) => {
    logError('http', 'Failed to start HTTP server', error, { port: PORT }, 'server-startup', OperationType.SYSTEM);
    process.exit(1);
  });
