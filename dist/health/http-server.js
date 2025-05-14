import http from 'http';
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
export function startHealthServer(options) {
    // Set default options
    const config = {
        port: 3000,
        maxRetries: 3,
        maxRetryTime: 10000,
        retryBackoff: 500,
        ...options
    };
    const server = http.createServer((req, res) => {
        if (req.url === '/health' || req.url === '/') {
            // Ensure proper JSON formatting with correct content type
            const healthResponse = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            };
            const jsonResponse = JSON.stringify(healthResponse);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonResponse)
            });
            res.end(jsonResponse);
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    // Store timeout for cleanup
    let retryTimeout = null;
    // Try to start the server with port fallback
    const tryListen = (currentPort, retriesLeft, startTime = Date.now()) => {
        // Check if max retry time exceeded
        if (Date.now() - startTime > config.maxRetryTime && retriesLeft < config.maxRetries) {
            console.error(`Maximum retry time exceeded (${config.maxRetryTime}ms), stopping retries`);
            return;
        }
        server.listen(currentPort, () => {
            // Use stderr for health server logs to avoid interfering with JSON-RPC stdout
            console.error(`Health check server listening on port ${currentPort}`);
        });
        // Handle port in use errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
                console.error(`Port ${currentPort} is already in use, trying port ${currentPort + 1}`);
                server.close();
                // Clear previous timeout if it exists
                if (retryTimeout)
                    clearTimeout(retryTimeout);
                // Try the next port with an exponential backoff
                const backoff = Math.min(config.retryBackoff * (config.maxRetries - retriesLeft + 1), 2000);
                retryTimeout = setTimeout(() => {
                    tryListen(currentPort + 1, retriesLeft - 1, startTime);
                }, backoff);
            }
            else {
                console.error(`Health check server error: ${err}`);
            }
        });
    };
    // Start trying ports
    tryListen(config.port, config.maxRetries);
    // Add graceful shutdown method to server
    const shutdownServer = () => {
        if (retryTimeout)
            clearTimeout(retryTimeout);
        server.close();
    };
    // Add shutdown method to server
    server.shutdown = shutdownServer;
    return server;
}
//# sourceMappingURL=http-server.js.map