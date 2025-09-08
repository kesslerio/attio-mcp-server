#!/usr/bin/env node

// Load environment variables from .env file manually to avoid dotenv banner output
// This ensures MCP JSON-RPC protocol compliance by preventing stdout contamination
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';

import { error as logError, OperationType } from './utils/logger.js';
import { initializeAttioClient } from './api/attio-client.js';
import { registerPromptHandlers } from './prompts/handlers.js';
import { registerResourceHandlers } from './handlers/resources.js';
import { registerToolHandlers } from './handlers/tools/index.js';

function loadEnvFile() {
  try {
    if (fs.existsSync(envPath)) {

      for (const line of lines) {
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
    }
  } catch (error) {
    // Silent failure to avoid stdout contamination
    // Environment variables will need to be set manually if .env loading fails
  }
}

loadEnvFile();
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializeAttioClient } from './api/attio-client.js';
import { registerResourceHandlers } from './handlers/resources.js';
import { registerToolHandlers } from './handlers/tools/index.js';
import { registerPromptHandlers } from './prompts/handlers.js';
import { error as logError, OperationType } from './utils/logger.js';

// Main function - simplified MCP server following FastMCP patterns
async function main() {
  try {
    // Validate required environment variables
    if (!process.env.ATTIO_API_KEY) {
      throw new Error('ATTIO_API_KEY environment variable not found');
    }

    // Initialize API client
    initializeAttioClient(process.env.ATTIO_API_KEY);

    // Create MCP server with proper capabilities declaration
      {
        name: 'attio-mcp-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {
            list: {},
            get: {},
          },
        },
      }
    );

    // Register all handlers
    registerResourceHandlers(mcpServer);
    registerToolHandlers(mcpServer);
    registerPromptHandlers(mcpServer);

    // Handle EPIPE errors gracefully (broken pipe during shutdown)
    process.stdout.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        // Graceful exit on broken pipe - Claude Desktop closed connection
        process.exit(0);
      } else {
        console.error('[MCP] stdout error:', error);
      }
    });
    
    process.stderr.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        // Graceful exit on broken pipe - Claude Desktop closed connection
        process.exit(0);
      } else {
        console.error('[MCP] stderr error:', error);
      }
    });

    // Global handler for uncaught EPIPE errors from MCP SDK
    process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        // Graceful exit on broken pipe - Claude Desktop closed connection
        process.exit(0);
      } else {
        console.error('[MCP] Uncaught exception:', error);
        // Re-throw other uncaught exceptions
        throw error;
      }
    });

    // Connect to stdio transport - this is all we need!
    await mcpServer.connect(transport);

    // Server is now running and will process requests via stdio
    // Claude Desktop manages the process lifecycle - no PID files or health checks needed
    
  } catch (error: unknown) {
    logError(
      'main',
      'Server startup failed',
      error,
      { pid: process.pid },
      'server-startup',
      OperationType.SYSTEM
    );
    process.exit(1);
  }
}

main().catch((error) => {
  logError(
    'main',
    'Unhandled error in main process',
    error,
    { pid: process.pid },
    'main-unhandled',
    OperationType.SYSTEM
  );
  process.exit(1);
});