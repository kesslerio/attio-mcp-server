import http from 'http';
import { URL } from 'url';
import { SSEServer } from '../transport/sse-server.js';
import { SSEServerOptions } from '../types/sse-types.js';

/**
 * Interface for health server options
 */
interface HealthServerOptions {
  port: number;
  maxRetries: number;
  maxRetryTime: number;
  retryBackoff: number;
}

/**
 * Extended health server options with SSE support
 */
interface ExtendedHealthServerOptions extends HealthServerOptions {
  enableSSE?: boolean;
  sseOptions?: SSEServerOptions;
}

/**
 * Start a simple HTTP server for health checks
 * This is primarily for Docker container health checks
 *
 * @param options - Configuration options for the health server
 *   @param options.port - The port to listen on (default: 3000)
 *   @param options.maxRetries - Maximum number of alternative ports to try (default: 3)
 *   @param options.maxRetryTime - Maximum time in ms to keep retrying (default: 10000)
 *   @param options.retryBackoff - Base backoff time in ms between retries (default: 500)
 * @returns The HTTP server instance with shutdown method
 */
export function startHealthServer(
  options?: Partial<HealthServerOptions>
): http.Server {
  return startExtendedHealthServer({ ...options, enableSSE: false });
}

/**
 * Start extended HTTP server with optional SSE support
 * Supports both health checks and SSE endpoints for ChatGPT connector compatibility
 *
 * @param options - Extended configuration options
 * @returns The HTTP server instance with shutdown method and optional SSE server
 */
export function startExtendedHealthServer(
  options?: Partial<ExtendedHealthServerOptions>
): http.Server & { sseServer?: SSEServer } {
  // Set default options
  const config: ExtendedHealthServerOptions = {
    port: 3000,
    maxRetries: 3,
    maxRetryTime: 10000,
    retryBackoff: 500,
    enableSSE: false,
    ...options,
  };

  // Initialize SSE server if enabled
  let sseServer: SSEServer | undefined;
  if (config.enableSSE) {
    sseServer = new SSEServer(config.sseOptions);
    console.error('[Health] SSE server initialized');
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const pathname = url.pathname;

      // Handle different endpoints
      switch (pathname) {
        case '/health':
        case '/':
          handleHealthCheck(req, res, sseServer);
          break;

        case '/sse':
        case '/sse/':
          if (sseServer && req.method === 'GET') {
            await sseServer.handleSSEConnection(req, res);
          } else if (!sseServer) {
            sendErrorResponse(res, 503, 'SSE not enabled');
          } else {
            sendErrorResponse(res, 405, 'Method not allowed');
          }
          break;

        case '/mcp/message':
          if (sseServer && req.method === 'POST') {
            await sseServer.handleClientMessage(req, res);
          } else if (sseServer && req.method === 'OPTIONS') {
            sseServer.handleOptionsRequest(req, res);
          } else if (!sseServer) {
            sendErrorResponse(res, 503, 'SSE not enabled');  
          } else {
            sendErrorResponse(res, 405, 'Method not allowed');
          }
          break;

        case '/mcp/stats':
          if (sseServer && req.method === 'GET') {
            handleStatsRequest(req, res, sseServer);
          } else if (!sseServer) {
            sendErrorResponse(res, 503, 'SSE not enabled');
          } else {
            sendErrorResponse(res, 405, 'Method not allowed');
          }
          break;

        default:
          sendErrorResponse(res, 404, 'Not found');
          break;
      }
    } catch (error) {
      console.error('[Health] Error handling request:', error);
      sendErrorResponse(res, 500, 'Internal server error');
    }
  }) as http.Server & { sseServer?: SSEServer };

  // Store timeout for cleanup
  let retryTimeout: NodeJS.Timeout | null = null;

  // Try to start the server with port fallback
  const tryListen = (
    currentPort: number,
    retriesLeft: number,
    startTime: number = Date.now()
  ) => {
    // Check if max retry time exceeded
    if (
      Date.now() - startTime > config.maxRetryTime &&
      retriesLeft < config.maxRetries
    ) {
      console.error(
        `Maximum retry time exceeded (${config.maxRetryTime}ms), stopping retries`
      );
      return;
    }

    server.listen(currentPort, () => {
      // Use stderr for health server logs to avoid interfering with JSON-RPC stdout
      console.error(`Health check server listening on port ${currentPort}`);
    });

    // Handle port in use errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.error(
          `Port ${currentPort} is already in use, trying port ${
            currentPort + 1
          }`
        );

        // Clean up listeners from the current attempt before retrying
        server.removeAllListeners('listening');
        server.removeAllListeners('error');
        // server.close(); // Ensure server is closed before trying again or new listeners are added.
        // Note: close is async. The critical part is removing listeners to prevent leaks for the SAME server instance.
        // If we create a NEW server instance on each retry, this close would be vital.
        // Since we reuse the `server` instance, removing listeners is key.

        if (retryTimeout) clearTimeout(retryTimeout);

        // Try the next port with an exponential backoff
        const backoff = Math.min(
          config.retryBackoff * (config.maxRetries - retriesLeft + 1),
          2000
        );

        retryTimeout = setTimeout(() => {
          tryListen(currentPort + 1, retriesLeft - 1, startTime);
        }, backoff);
      } else {
        console.error(`Health check server error: ${err}`);
      }
    });
  };

  // Start trying ports
  tryListen(config.port, config.maxRetries);

  // Add SSE server reference to HTTP server
  server.sseServer = sseServer;

  // Add graceful shutdown method to server
  const shutdownServer = (callback?: (err?: Error) => void) => {
    console.error('Health check server: Initiating shutdown...');
    
    // Shutdown SSE server first
    if (sseServer) {
      console.error('Health check server: Shutting down SSE server...');
      sseServer.shutdown();
    }
    
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
      console.error('Health check server: Cleared retry timeout.');
    }
    
    server.close((err) => {
      if (err) {
        console.error('Health check server: Error during close:', err);
      } else {
        console.error('Health check server: Successfully closed.');
      }
      if (callback) {
        callback(err);
      }
    });
  };

  // Add shutdown method to server
  (server as any).shutdown = shutdownServer;

  return server;
}

/**
 * Handle health check requests
 */
function handleHealthCheck(
  req: http.IncomingMessage, 
  res: http.ServerResponse, 
  sseServer?: SSEServer
): void {
  const healthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sse: sseServer ? {
      enabled: true,
      connections: sseServer.getStats().totalConnections,
    } : {
      enabled: false,
    },
  };
  
  const jsonResponse = JSON.stringify(healthResponse);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(jsonResponse),
  });
  res.end(jsonResponse);
}

/**
 * Handle stats requests
 */
function handleStatsRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  sseServer: SSEServer
): void {
  const stats = sseServer.getStats();
  const jsonResponse = JSON.stringify(stats);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(jsonResponse),
  });
  res.end(jsonResponse);
}

/**
 * Send error response
 */
function sendErrorResponse(
  res: http.ServerResponse,
  statusCode: number,
  message: string
): void {
  const errorResponse = {
    error: {
      code: statusCode,
      message,
      timestamp: new Date().toISOString(),
    },
  };
  
  const jsonResponse = JSON.stringify(errorResponse);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(jsonResponse),
  });
  res.end(jsonResponse);
}
