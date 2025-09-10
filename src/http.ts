#!/usr/bin/env node

/**
 * HTTP entry point for the Attio MCP server
 * Implements Streamable HTTP transport for Smithery compatibility
 */

// Load environment variables from .env file manually to avoid dotenv banner output
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
    }
  } catch (error) {
    // Silent failure to avoid stdout contamination
  }
}

loadEnvFile();

import express from 'express';
import cors from 'cors';
import { createServer } from './server/createServer.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { error as logError, OperationType } from './utils/logger.js';

const app = express();
app.use(express.json());

// Configure CORS for Smithery and local development
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://smithery.ai', 'http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'mcp-session-id'],
    exposedHeaders: ['Mcp-Session-Id'],
  })
);

// Ensure clean preflight handling for Streamable HTTP endpoint
app.options('/mcp', cors());

// Health check endpoint for load balancers
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Main MCP endpoint - stateless MVP (new transport per request)
app.all('/mcp', async (req, res) => {
  try {
    const server = createServer();
    // Stateless mode - no session management for simplicity
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    // Clean up when connection closes
    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
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
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start server
const PORT = Number(process.env.PORT) || 3000;

app
  .listen(PORT, () => {
    // Use stderr to avoid contaminating any stdout protocol streams in mixed environments
    console.error(`Attio MCP HTTP Server listening on port ${PORT}`);
    console.error(`Health check: http://localhost:${PORT}/health`);
    console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
  })
  .on('error', (error) => {
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
