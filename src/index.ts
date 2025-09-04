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

// Add startup delay to prevent race conditions when Claude Desktop starts multiple instances
function getStartupDelay(): number {
  // Base delay of 100-500ms with random jitter to prevent synchronized starts
  return Math.floor(Math.random() * 400) + 100;
}

// Function to check if existing server is healthy via HTTP health check
async function checkServerHealth(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.error(`[Health] Health check successful: ${data.status}`);
      return data.status === 'ok';
    } else {
      console.error(`[Health] Health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`[Health] Health check failed:`, error);
    return false;
  }
}

// Interface for PID file data with timestamp and process validation
interface PidFileData {
  pid: number;
  timestamp: number;
  startTime: number;
}

// Function to read PID from file with enhanced validation
function readPidFile(): PidFileData | null {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      const content = fs.readFileSync(PID_FILE_PATH, 'utf-8').trim();
      
      // Handle legacy format (just PID number) for backward compatibility
      if (!content.startsWith('{')) {
        const pid = parseInt(content, 10);
        if (!isNaN(pid)) {
          return {
            pid,
            timestamp: 0, // Legacy format doesn't have timestamp
            startTime: 0
          };
        }
        return null;
      }
      
      // Parse enhanced format with timestamp and validation data
      const data = JSON.parse(content) as PidFileData;
      if (data.pid && !isNaN(data.pid)) {
        return data;
      }
    }
  } catch (error: unknown) {
    console.warn('[PID] Error reading PID file:', error);
  }
  return null;
}

// Function to write PID to file with enhanced data
function writePidFile(pid: number): void {
  try {
    const pidData: PidFileData = {
      pid,
      timestamp: Date.now(),
      startTime: process.uptime()
    };
    fs.writeFileSync(PID_FILE_PATH, JSON.stringify(pidData), 'utf-8');
    console.error(`[PID] Written PID file with data:`, pidData);
  } catch (error: unknown) {
    console.error('[PID] Error writing PID file:', error);
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
  
  // Add startup delay with jitter to prevent race conditions
  const startupDelay = getStartupDelay();
  console.error(`[Main] Waiting ${startupDelay}ms to prevent race conditions...`);
  await new Promise((resolve) => setTimeout(resolve, startupDelay));

  try {
    const oldPidData = readPidFile();
    if (oldPidData) {
      const { pid: oldPid, timestamp, startTime } = oldPidData;
      const age = Date.now() - timestamp;
      console.error(
        `[Main] Found PID file. PID: ${oldPid}, Age: ${age}ms, Current PID: ${process.pid}`
      );
      
      // Check if PID file is very recent (< 2 seconds) - might be another instance starting
      if (age < 2000 && age > 0) {
        console.error(`[Main] Recent PID file detected (${age}ms old). Adding extra delay to avoid conflicts.`);
        await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));
      }
      
      if (oldPid !== process.pid && isProcessRunning(oldPid)) {
        console.error(
          `[Main] Active server instance (PID: ${oldPid}) detected. Checking health...`
        );
        
        // Try to check if the existing server is healthy by attempting a health check
        const isHealthy = await checkServerHealth(9877);
        
        if (isHealthy) {
          console.error(
            `[Main] Existing server (PID: ${oldPid}) is healthy. This instance will exit gracefully to avoid conflicts.`
          );
          console.error(
            `[Main] Claude Desktop should maintain connection to the healthy server (PID: ${oldPid}).`
          );
          process.exit(0); // Exit gracefully without disrupting the healthy server
        } else {
          console.error(
            `[Main] Existing server (PID: ${oldPid}) appears unhealthy. Attempting to replace it.`
          );
          try {
            process.kill(oldPid, 'SIGTERM');
            console.error(
              `[Main] SIGTERM sent to unhealthy PID ${oldPid}. Waiting for graceful shutdown...`
            );
            
            // Wait longer for graceful shutdown to complete
            await new Promise((resolve) => setTimeout(resolve, 5000));

            if (isProcessRunning(oldPid)) {
              console.warn(
                `[Main] Old process ${oldPid} still running after SIGTERM and wait. Will proceed anyway.`
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
        }
      } else if (oldPid === process.pid) {
        console.warn(
          `[Main] PID file contains current process PID (${oldPid}). This might happen after an unclean shutdown. Deleting PID file.`
        );
        deletePidFile();
      } else if (!isProcessRunning(oldPid)) {
        console.error(
          `[Main] Old process PID ${oldPid} from PID file is not running. Stale PID file (age: ${age}ms). Deleting it.`
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
    console.error('[MCP] Creating StdioServerTransport...');
    const transport = new StdioServerTransport();
    
    // Handle EPIPE errors gracefully (broken pipe during shutdown)
    process.stdout.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        console.error('[MCP] stdout EPIPE error detected - Claude Desktop closed connection. Exiting gracefully.');
        process.exit(0);
      } else {
        console.error('[MCP] stdout error:', error);
      }
    });
    
    process.stderr.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        console.error('[MCP] stderr EPIPE error detected - Claude Desktop closed connection. Exiting gracefully.');
        process.exit(0);
      } else {
        console.error('[MCP] stderr error:', error);
      }
    });
    
    console.error('[MCP] Connecting to transport...');
    await mcpServer.connect(transport);
    console.error('[MCP] Successfully connected to transport!');

    // Global handler for uncaught EPIPE errors from MCP SDK
    process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') {
        console.error('[MCP] Uncaught EPIPE exception - Claude Desktop closed connection. Exiting gracefully.');
        process.exit(0);
      } else {
        console.error('[MCP] Uncaught exception:', error);
        // Re-throw other uncaught exceptions
        throw error;
      }
    });

    // Write PID file after successful MCP connection
    writePidFile(process.pid);

    // Start health check server AFTER MCP is connected (for Docker compatibility)
    // Always start health server for process detection and health checks
    if (true) {
      // Use dynamic port allocation with better defaults
      let healthCheckPort = 9877; // Default port from logs
      if (process.env.HEALTH_PORT) {
        healthCheckPort = parseInt(process.env.HEALTH_PORT, 10);
      }
      
      console.error(`[Health] Starting health check server on port ${healthCheckPort} (with fallback)`);

      const healthServer = startHealthServer({
        port: healthCheckPort,
        maxRetries: 5, // Increased retry count for better port finding
        maxRetryTime: 10000, // Increased time allowance
        retryBackoff: 200, // Faster retries
      });

      // Handle graceful shutdown
      const shutdown = (signal: string) => {
        console.error(`[Shutdown] Received ${signal}. Shutting down gracefully...`);
        console.error(`[Shutdown] PID: ${process.pid}, Uptime: ${process.uptime()}s`);
        const healthSrv = healthServer as any;

        if (healthSrv && typeof healthSrv.shutdown === 'function') {
          console.error('[Shutdown] Closing health server...');
          healthSrv.shutdown(() => {
            console.error('[Shutdown] Health server closed. Cleaning up PID file...');
            deletePidFile();
            console.error('[Shutdown] Cleanup complete. Exiting.');
            process.exit(0);
          });
        } else {
          console.error('[Shutdown] No health server to close. Cleaning up PID file...');
          deletePidFile();
          console.error('[Shutdown] Cleanup complete. Exiting.');
          process.exit(0);
        }
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    } else {
      // Minimal shutdown handling for stdio mode
      const cleanup = (signal: string) => {
        console.error(`[Shutdown] Received ${signal} in stdio mode. PID: ${process.pid}`);
        console.error('[Shutdown] Cleaning up PID file...');
        deletePidFile();
        console.error('[Shutdown] Cleanup complete. Exiting.');
        process.exit(0);
      };

      process.on('SIGINT', () => cleanup('SIGINT'));
      process.on('SIGTERM', () => cleanup('SIGTERM'));
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
