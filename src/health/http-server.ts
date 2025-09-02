import * as http from 'http';

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
  // Set default options
  const config: HealthServerOptions = {
    port: 3000,
    maxRetries: 3,
    maxRetryTime: 10000,
    retryBackoff: 500,
    ...options,
  };

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      // Ensure proper JSON formatting with correct content type
      const healthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
      const jsonResponse = JSON.stringify(healthResponse);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonResponse),
      });
      res.end(jsonResponse);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

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

  // Add graceful shutdown method to server
  const shutdownServer = (callback?: (err?: Error) => void) => {
    console.error('Health check server: Initiating shutdown...');
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
