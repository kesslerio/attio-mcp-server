#!/usr/bin/env node

/**
 * CLI entrypoint for Attio MCP Server
 *
 * This file is ONLY executed as a standalone binary, never imported.
 * It contains CLI argument parsing and process.exit() calls that would
 * interfere with Smithery's metadata extraction if run during imports.
 */

import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CRITICAL: Only run CLI logic when executed as main program ---
const isMain =
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');

if (!isMain) {
  // If someone imports this file, do nothing.
  // Never parse argv or exit on import.
  // This prevents side-effects during Smithery's metadata extraction.
  /* no-op - safe to import but does nothing */
} else {
  // ---- CLI logic below (only runs when executed directly) ----

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
    } catch {
      // Silent failure to avoid stdout contamination
      // Environment variables will need to be set manually if .env loading fails
    }
  }

  async function main() {
    // Handle command-line arguments for CI/CD compatibility
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      console.log(
        'Attio MCP Server - Model Context Protocol server for Attio CRM'
      );
      console.log('\nUsage: node dist/cli.js');
      console.log('\nOptions:');
      console.log('  --help, -h     Show this help message');
      console.log('  --version, -v  Show version information');
      console.log('\nEnvironment Variables:');
      console.log('  ATTIO_API_KEY         Required: Your Attio API key');
      console.log('  ATTIO_WORKSPACE_ID    Optional: Default workspace ID');
      console.log(
        '\nThe server communicates via stdio using the MCP protocol.'
      );
      process.exit(0);
    }

    if (process.argv.includes('--version') || process.argv.includes('-v')) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
      );
      console.log(`Attio MCP Server v${packageJson.version}`);
      process.exit(0);
    }

    // Load environment and start server
    loadEnvFile();

    // Set server mode flag to enable background intervals (performance tracking, etc.)
    process.env.MCP_SERVER_MODE = 'true';

    // Use reduced libphonenumber metadata in CLI runtime to minimize bundle size
    if (!process.env.ATTIO_PHONE_METADATA) {
      process.env.ATTIO_PHONE_METADATA = 'min';
    }

    // Dynamic imports to avoid loading modules during help/version
    const { StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    );
    const { createServer } = await import('./server/createServer.js');
    const { error: logError, OperationType } = await import(
      './utils/logger.js'
    );

    try {
      // Create the configured MCP server
      console.error('[mcp:cli] Creating server instance');
      const mcpServer = await createServer();

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
      console.error('[mcp:cli] Connecting to stdio transport');
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
      console.error('[mcp:cli] Server connected and ready');

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

  main().catch(async (error) => {
    // Import logger only if needed for error handling
    const { error: logError, OperationType } = await import(
      './utils/logger.js'
    );
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
}
