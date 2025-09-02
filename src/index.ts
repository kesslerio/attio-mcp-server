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
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startHealthServer } from './health/http-server.js';
import { initializeAttioClient } from './api/attio-client.js';
import { registerResourceHandlers } from './handlers/resources.js';
import { registerToolHandlers } from './handlers/tools/index.js';
import { registerPromptHandlers } from './prompts/handlers.js';
import { error as logError, warn, OperationType } from './utils/logger.js';

// Use /tmp directory for PID file, which is generally writable
const PID_FILE_PATH = '/tmp/attio-mcp-server.pid'; // Define PID file path

// Function to read PID from file
function readPidFile(): number | null {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      const pid = parseInt(fs.readFileSync(PID_FILE_PATH, 'utf-8'), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch (error: unknown) {
    console.warn('[PID] Error reading PID file:', error); // Changed to console.warn
  }
  return null;
}

// Function to write PID to file
function writePidFile(pid: number): void {
  try {
    fs.writeFileSync(PID_FILE_PATH, pid.toString(), 'utf-8');
  } catch (error: unknown) {
    console.error('[PID] Error writing PID file:', error); // Changed to console.error
  }
}

// Function to delete PID file
function deletePidFile(): void {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      fs.unlinkSync(PID_FILE_PATH);
    }
  } catch (error: unknown) {
    console.warn('[PID] Error deleting PID file:', error); // Changed to console.warn
  }
}

// Function to check if a process is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // Sending signal 0 tests if process exists
    return true;
  } catch (error: unknown) {
    return false; // Typically ESRCH (no such process) or EPERM (permission denied, but still exists)
  }
}

// Main function
async function main() {
  console.error('[Main] Main function started. Current PID:', process.pid);

  try {
    const oldPid = readPidFile();
    if (oldPid) {
      console.error(
        `[Main] Found PID file. PID in file: ${oldPid}. Current PID: ${process.pid}.`
      );
      if (oldPid !== process.pid && isProcessRunning(oldPid)) {
        console.error(
          `[Main] Old server instance (PID: ${oldPid}) is running. Attempting to send SIGTERM.`
        );
        try {
          process.kill(oldPid, 'SIGTERM');
          console.error(
            `[Main] SIGTERM sent to PID ${oldPid}. Waiting for it to shut down...`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000));

          if (isProcessRunning(oldPid)) {
            console.warn(
              `[Main] Old process ${oldPid} still running after SIGTERM and wait.`
            );
          } else {
            console.error(
              `[Main] Old process ${oldPid} successfully terminated.`
            );
            deletePidFile();
          }
        } catch (signalError) {
          console.warn(
            `[Main] Error sending SIGTERM to PID ${oldPid}: ${signalError}.`
          );
          deletePidFile();
        }
      } else if (oldPid === process.pid) {
        console.warn(
          `[Main] PID file contains current process PID (${oldPid}). This might happen after an unclean shutdown. Deleting PID file.`
        );
        deletePidFile();
      } else if (!isProcessRunning(oldPid)) {
        console.error(
          `[Main] Old process PID ${oldPid} from PID file is not running. Stale PID file. Deleting it.`
        );
        deletePidFile();
      }
    } else {
      console.error('[Main] No PID file found. Proceeding with startup.');
    }

    if (!process.env.ATTIO_API_KEY) {
      throw new Error('ATTIO_API_KEY environment variable not found');
    }

    // Initialize API client
    initializeAttioClient(process.env.ATTIO_API_KEY);

    // Register handlers
    const mcpServer = new Server(
      {
        name: 'attio-mcp-server',
        version: '0.0.2',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          // Declare both prompts/list and prompts/get capabilities
          prompts: {
            list: {},
            get: {},
          },
        },
      }
    );

    registerResourceHandlers(mcpServer);
    registerToolHandlers(mcpServer);
    registerPromptHandlers(mcpServer);

    // Connect to MCP transport FIRST - critical for Smithery
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    // Write PID file after successful MCP connection
    writePidFile(process.pid);

    // Start health check server AFTER MCP is connected (for Docker compatibility)
    // Only start if not running in stdio mode for Smithery
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_HEALTH_SERVER === 'true'
    ) {
      let healthCheckPort = 3000;
      if (process.env.HEALTH_PORT) {
        healthCheckPort = parseInt(process.env.HEALTH_PORT, 10);
      }

      const healthServer = startHealthServer({
        port: healthCheckPort,
        maxRetries: 2,
        maxRetryTime: 5000, // Reduced for faster startup
        retryBackoff: 250,
      });

      // Handle graceful shutdown
      const shutdown = (signal: string) => {
        console.error(`[Shutdown] Received ${signal}. Shutting down...`);
        const healthSrv = healthServer as any;

        if (healthSrv && typeof healthSrv.shutdown === 'function') {
          healthSrv.shutdown(() => {
            deletePidFile();
            process.exit(0);
          });
        } else {
          deletePidFile();
          process.exit(0);
        }
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    } else {
      // Minimal shutdown handling for stdio mode
      const cleanup = () => {
        deletePidFile();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  } catch (error: unknown) {
    logError(
      'main',
      'Server startup failed',
      error,
      { pid: process.pid },
      'server-startup',
      OperationType.SYSTEM
    );
    deletePidFile(); // Ensure PID file is deleted on error
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
  deletePidFile(); // Ensure PID file is deleted on error
  process.exit(1);
});
