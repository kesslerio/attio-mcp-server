import http from 'http';

/**
 * Start a simple HTTP server for health checks
 * This is primarily for Docker container health checks
 * 
 * @param port - The port to listen on (default: 3000)
 * @param maxRetries - Maximum number of alternative ports to try (default: 3)
 * @returns The HTTP server instance
 */
export function startHealthServer(port: number = 3000, maxRetries: number = 3): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      // Ensure proper JSON formatting with correct content type
      const healthResponse = { status: 'ok', timestamp: new Date().toISOString() };
      const jsonResponse = JSON.stringify(healthResponse);
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonResponse)
      });
      res.end(jsonResponse);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  // Try to start the server with port fallback
  const tryListen = (currentPort: number, retriesLeft: number) => {
    server.listen(currentPort, () => {
      // Use stderr for health server logs to avoid interfering with JSON-RPC stdout
      console.error(`Health check server listening on port ${currentPort}`);
    });

    // Handle port in use errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.error(`Port ${currentPort} is already in use, trying port ${currentPort + 1}`);
        server.close();
        // Try the next port
        tryListen(currentPort + 1, retriesLeft - 1);
      } else {
        console.error(`Health check server error: ${err}`);
      }
    });
  };

  // Start trying ports
  tryListen(port, maxRetries);

  return server;
}