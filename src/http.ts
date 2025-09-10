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
      if (k && v.length && !process.env[k])
        process.env[k] = v.join('=').replace(/^["']|["']$/g, '');
    }
  } catch {
    /* silent */
  }
})();

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS (Smithery + local)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://smithery.ai', 'https://app.smithery.ai', 'http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'Mcp-Session-Id', 'Authorization', 'X-Api-Key'],
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
  lastActive: number;
};
const sessions: Record<string, Session> = {};
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes idle TTL

const touch = (id: string) => {
  if (sessions[id]) sessions[id].lastActive = Date.now();
};

function attachCleanup(transport: StreamableHTTPServerTransport) {
  transport.onclose = () => {
    const id = transport.sessionId;
    if (id && sessions[id]) delete sessions[id];
  };
}

// Optional: idle TTL cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of Object.entries(sessions)) {
    if (now - s.lastActive > SESSION_TTL_MS) {
      try {
        s.close();
      } catch {}
      delete sessions[id];
    }
  }
}, 60_000).unref();

// --- MCP endpoint (Streamable HTTP requires GET and POST) ---
app.all('/mcp', async (req, res) => {
  try {
    const sessionId =
      req.get('Mcp-Session-Id') ||
      req.get('mcp-session-id') ||
      undefined;

    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions[sessionId]) {
      // Reuse existing transport/session
      transport = sessions[sessionId].transport;
      touch(sessionId);
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      // New initialize → create transport + server, store session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions[id] = {
            transport,
            close: () => transport.close(),
            lastActive: Date.now(),
          };
        },
      });
      attachCleanup(transport);

      const server = createServer();
      await server.connect(transport);
      if (transport.sessionId) touch(transport.sessionId);
    } else {
      // Not an initialize, and no valid session to route to
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the JSON-RPC request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logError(
      'http',
      'Error handling MCP request',
      error,
      undefined,
      'mcp-request-error',
      OperationType.API_CALL
    );
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
const server = app.listen(PORT, () => {
  // Keep scanner stdout clean
  console.error(`Attio MCP HTTP Server listening on port ${PORT}`);
  console.error(`Health check: http://localhost:${PORT}/health`);
  console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

// Increase timeouts for long-lived streams
server.keepAliveTimeout = 610_000;
server.headersTimeout = 620_000;

server.on('error', (error) => {
  logError(
    'http',
    'Failed to start HTTP server',
    error,
    { port: PORT },
    'server-startup',
    OperationType.SYSTEM
  );
  process.exit(1);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.error(`Received ${signal}, shutting down HTTP server...`);
  server.close(() => {
    for (const [id, s] of Object.entries(sessions)) {
      try { s.close(); } catch {}
      delete sessions[id];
    }
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
