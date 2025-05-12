/**
 * Simple HTTP server for health checks
 */
import http from 'http';

/**
 * Starts a simple HTTP health check server
 * 
 * @param port - Port number to listen on
 * @returns The created HTTP server instance
 */
export function startHealthServer(port: number = 3000): http.Server {
  const server = http.createServer((req, res) => {
    // Basic routing
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok',
        service: 'attio-mcp-server',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });
  
  server.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
  });
  
  return server;
}