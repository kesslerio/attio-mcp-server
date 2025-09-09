#!/usr/bin/env node

// Load environment variables from .env file manually to avoid dotenv banner output
// This ensures MCP JSON-RPC protocol compliance by preventing stdout contamination
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
    // Environment variables will need to be set manually if .env loading fails
  }
}

loadEnvFile();
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server/createServer.js';
import { error as logError, OperationType } from './utils/logger.js';

// Main function - simplified MCP server following FastMCP patterns
async function main() {
  try {
    // Create the configured MCP server
    const mcpServer = createServer();

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
    const transport = new StdioServerTransport();
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