import http from 'http';

/**
 * Start a simple HTTP server for health checks
 * This is primarily for Docker container health checks
 * 
 * @param port - The port to listen on (default: 3000)
 * @returns The HTTP server instance
 */
export function startHealthServer(port: number = 3000): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });

  return server;
}