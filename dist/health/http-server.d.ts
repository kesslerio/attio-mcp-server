import http from 'http';
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
export declare function startHealthServer(options?: Partial<HealthServerOptions>): http.Server;
export {};
//# sourceMappingURL=http-server.d.ts.map