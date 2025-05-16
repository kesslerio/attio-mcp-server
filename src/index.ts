#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs'; // Added for PID file
import path from 'path'; // Added for PID file path
import { AddressInfo } from 'net'; // Import AddressInfo for type checking
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startHealthServer } from './health/http-server.js';
import { initializeAttioClient } from "./api/attio-client.js";
import { registerResourceHandlers } from "./handlers/resources.js";
import { registerToolHandlers } from "./handlers/tools.js";
import { registerPromptHandlers } from "./prompts/handlers.js";
import { startAutoDiscovery, stopAutoDiscovery } from "./utils/auto-discovery.js";

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
      console.error(`[Main] Found PID file. PID in file: ${oldPid}. Current PID: ${process.pid}.`);
      if (oldPid !== process.pid && isProcessRunning(oldPid)) {
        console.error(`[Main] Old server instance (PID: ${oldPid}) is running. Attempting to send SIGTERM.`);
        try {
          process.kill(oldPid, 'SIGTERM');
          console.error(`[Main] SIGTERM sent to PID ${oldPid}. Waiting for it to shut down...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          
          if (isProcessRunning(oldPid)) {
            console.warn(`[Main] Old process ${oldPid} still running after SIGTERM and wait.`);
          } else {
            console.error(`[Main] Old process ${oldPid} successfully terminated.`);
            deletePidFile(); 
          }
        } catch (signalError) {
          console.warn(`[Main] Error sending SIGTERM to PID ${oldPid}: ${signalError}.`);
          deletePidFile();
        }
      } else if (oldPid === process.pid) {
        console.warn(`[Main] PID file contains current process PID (${oldPid}). This might happen after an unclean shutdown. Deleting PID file.`);
        deletePidFile();
      } else if (!isProcessRunning(oldPid)) {
        console.error(`[Main] Old process PID ${oldPid} from PID file is not running. Stale PID file. Deleting it.`);
        deletePidFile();
      }
    } else {
      console.error('[Main] No PID file found. Proceeding with startup.');
    }

    if (!process.env.ATTIO_API_KEY) {
      throw new Error("ATTIO_API_KEY environment variable not found");
    }

    // Initialize API client
    initializeAttioClient(process.env.ATTIO_API_KEY);

    // Register handlers
    const mcpServer = new Server(
      {
        name: "attio-mcp-server",
        version: "0.0.2",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          // Declare both prompts/list and prompts/get capabilities
          prompts: {
            list: {},
            get: {}
          },
        },
      },
    );
    
    registerResourceHandlers(mcpServer);
    registerToolHandlers(mcpServer);
    registerPromptHandlers(mcpServer);
    
    // Start health check server (for Docker)
    let healthCheckPort = 3000; // Default port

    if (process.env.HEALTH_PORT) {
      healthCheckPort = parseInt(process.env.HEALTH_PORT, 10);
    } else {
      // Optional: log a warning if HEALTH_PORT is expected but not found
      console.warn("[Main] HEALTH_PORT environment variable not set, defaulting health check to port 3000. Set HEALTH_PORT in your environment if a specific port is needed."); // Changed to console.warn
    }

    const healthServer = startHealthServer({
      port: healthCheckPort, // Use the determined healthCheckPort
      maxRetries: 2, // Reduced retries, e.g., try initial + 2 alternatives
      maxRetryTime: 10000, // Shorter retry window
      retryBackoff: 500
    });
    
    // If health server started successfully, write current PID
    // We need to confirm the server is listening before writing the PID.
    // The startHealthServer would need to be modified to return a promise that resolves on successful listen,
    // or emit an event. For now, let's assume if no error is thrown by startHealthServer and it returns,
    // we can write the PID. A more robust approach would involve a callback or promise from startHealthServer.
    
    let healthServerSuccessfullyStarted = false;
    if (healthServer) { // Check if healthServer object exists
        healthServer.on('listening', () => {
            if (!healthServerSuccessfullyStarted) { // Ensure this runs only once
                const address = healthServer.address();
                let listeningPort = 'unknown';
                if (address && typeof address !== 'string') { // Type guard for AddressInfo
                    listeningPort = address.port.toString();
                }
                console.error(`[Main] Health server confirmed listening on port ${listeningPort}. Writing PID: ${process.pid}`); // Changed to console.error
                writePidFile(process.pid);
                healthServerSuccessfullyStarted = true;
            }
        });
        // Handle the case where it might error out immediately if port is taken and no retries succeed.
        healthServer.on('error', (err: NodeJS.ErrnoException) => {
            if (!healthServer.listening && !healthServerSuccessfullyStarted) { // Check if it never started listening
                console.error('[Main] Health server failed to start listening. PID file will not be written.', err); // Changed to console.error
            }
        });
    } else {
        console.error("[Main] Health server instance was not created. PID file will not be written."); // Changed to console.error
    }
    
    // Handle graceful shutdown
    const shutdown = (signal: string) => { // Add signal for logging
      console.error(`[Shutdown] Received ${signal}. Shutting down servers...`); // Changed to console.error
      const healthSrv = healthServer as any; // Cast to any to access our custom 'shutdown'

      // Create a promise that resolves when shutdown is complete or times out
      new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('[Shutdown] Health server shutdown timed out after 5 seconds. Forcing exit.'); // Changed to console.error
          reject(new Error('Shutdown timeout')); // Reject on timeout
        }, 5000);

        if (healthSrv && typeof healthSrv.shutdown === 'function') {
          healthSrv.shutdown((err?: Error) => {
            clearTimeout(timeoutId);
            if (err) {
              console.error('[Shutdown] Health server shutdown reported an error:', err); // Changed to console.error
              reject(err); // Propagate error
            } else {
              console.error('[Shutdown] Health server shutdown complete.'); // Changed to console.error
              resolve();
            }
          });
        } else if (healthSrv && typeof healthSrv.close === 'function') {
          // Fallback if our custom shutdown isn't there for some reason
          console.error('[Shutdown] Health server: Using direct close method.'); // Changed to console.error
          healthSrv.close((err?: Error) => {
            clearTimeout(timeoutId);
            if (err) {
              console.error('[Shutdown] Health server direct close reported an error:', err); // Changed to console.error
              reject(err);
            } else {
              console.error('[Shutdown] Health server direct close complete.'); // Changed to console.error
              resolve();
            }
          });
        } else {
          console.warn('[Shutdown] Health server or its shutdown/close method not found. Exiting directly.'); // Changed to console.warn
          clearTimeout(timeoutId);
          resolve(); // Nothing to shut down, resolve immediately
        }
      })
      .catch(error => {
        console.error('[Shutdown] Error during shutdown sequence:', error); // Changed to console.error
      })
      .finally(() => {
        console.error('[Shutdown] Exiting process.'); // Changed to console.error
        deletePidFile(); // Ensure PID file is deleted on exit
        process.exit(0); 
      });
    };
    
    process.on('SIGINT', () => shutdown('SIGINT')); // Pass signal name
    process.on('SIGTERM', () => shutdown('SIGTERM')); // Pass signal name

    // Connect to transport
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } catch (error) {
    console.error("[Main] Error starting server:", error); // Changed to console.error
    deletePidFile(); // Ensure PID file is deleted on error
    process.exit(1);
  }
}

main().catch(error => {
  console.error("[Main] Unhandled error in main:", error); // Changed log message
  deletePidFile(); // Ensure PID file is deleted on error
  process.exit(1);
});