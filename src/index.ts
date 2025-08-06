#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from 'dotenv';

dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs'; // Added for PID file
import { initializeAttioClient } from './api/attio-client.js';
import { registerResourceHandlers } from './handlers/resources.js';
import { registerToolHandlers } from './handlers/tools/index.js';
import { startHealthServer } from './health/http-server.js';
import { registerPromptHandlers } from './prompts/handlers.js';

// Use /tmp directory for PID file, which is generally writable
const PID_FILE_PATH = '/tmp/attio-mcp-server.pid'; // Define PID file path

// Function to read PID from file
function readPidFile(): number | null {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      const pid = parseInt(fs.readFileSync(PID_FILE_PATH, 'utf-8'), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch (error) {
    console.warn('[PID] Error reading PID file:', error); // Changed to console.warn
  }
  return null;
}

// Function to write PID to file
function writePidFile(pid: number): void {
  try {
    fs.writeFileSync(PID_FILE_PATH, pid.toString(), 'utf-8');
  } catch (error) {
    console.error('[PID] Error writing PID file:', error); // Changed to console.error
  }
}

// Function to delete PID file
function deletePidFile(): void {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      fs.unlinkSync(PID_FILE_PATH);
    }
  } catch (error) {
    console.warn('[PID] Error deleting PID file:', error); // Changed to console.warn
  }
}

// Function to check if a process is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // Sending signal 0 tests if process exists
    return true;
  } catch (error) {
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
  } catch (error) {
    console.error('[Main] Error starting server:', error); // Changed to console.error
    deletePidFile(); // Ensure PID file is deleted on error
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[Main] Unhandled error in main:', error); // Changed log message
  deletePidFile(); // Ensure PID file is deleted on error
  process.exit(1);
});
