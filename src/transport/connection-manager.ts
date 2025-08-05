/**
 * SSE Connection Manager
 * Manages Server-Sent Events connections for ChatGPT connector compatibility
 */

import type { ServerResponse } from 'http';
import {
  type ConnectionHealth,
  type ConnectionManagerStats,
  type MCPSSEMessage,
  type RateLimitInfo,
  type SSEConnection,
  SSEMessage,
  type SSEServerOptions,
} from '../types/sse-types.js';

/**
 * Manages SSE connections, rate limiting, and message broadcasting
 */
export class SSEConnectionManager {
  private connections = new Map<string, SSEConnection>();
  private rateLimits = new Map<string, RateLimitInfo>();
  private messagesSent = 0;
  private messagesLastMinute = 0;
  private errorsLastMinute = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statsResetInterval: NodeJS.Timeout | null = null;

  constructor(private options: SSEServerOptions = {}) {
    // Set default options
    this.options = {
      heartbeatInterval: 30_000, // 30 seconds
      connectionTimeout: 300_000, // 5 minutes
      rateLimitPerMinute: 100,
      maxConnections: 1000,
      ...options,
    };

    this.startHeartbeat();
    this.startCleanup();
    this.startStatsReset();
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    clientId: string,
    response: ServerResponse,
    clientIp: string,
    token?: string,
    userAgent?: string
  ): boolean {
    // Check connection limits
    if (this.connections.size >= (this.options.maxConnections || 1000)) {
      console.warn(
        `[SSE] Connection limit reached, rejecting client ${clientId}`
      );
      return false;
    }

    // Check if client already connected
    if (this.connections.has(clientId)) {
      console.warn(
        `[SSE] Client ${clientId} already connected, replacing connection`
      );
      this.removeConnection(clientId);
    }

    const connection: SSEConnection = {
      clientId,
      response,
      lastActivity: Date.now(),
      authenticated: !this.options.requireAuth || !!token,
      clientIp,
      token,
      userAgent,
    };

    this.connections.set(clientId, connection);
    console.log(
      `[SSE] Client ${clientId} connected (${this.connections.size} total)`
    );

    // Send welcome message
    this.sendToClient(clientId, {
      event: 'status',
      timestamp: new Date().toISOString(),
      status: {
        type: 'connected',
        message: 'Connected to Attio MCP Server',
      },
      version: '1.4.1',
    });

    return true;
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      try {
        if (!connection.response.destroyed) {
          // Send disconnect message
          this.sendToClient(clientId, {
            event: 'status',
            timestamp: new Date().toISOString(),
            status: {
              type: 'disconnected',
              message: 'Connection closed',
            },
            version: '1.4.1',
          });

          connection.response.end();
        }
      } catch (error) {
        console.warn(`[SSE] Error closing connection for ${clientId}:`, error);
      }

      this.connections.delete(clientId);
      this.rateLimits.delete(clientId);
      console.log(
        `[SSE] Client ${clientId} disconnected (${this.connections.size} remaining)`
      );
    }
  }

  /**
   * Check rate limit for a client
   */
  checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60_000; // 1 minute window
    const maxRequests = this.options.rateLimitPerMinute || 100;

    if (!this.rateLimits.has(clientId)) {
      this.rateLimits.set(clientId, {
        requests: [],
        count: 0,
        windowStart: now,
        limited: false,
      });
    }

    const rateLimit = this.rateLimits.get(clientId)!;

    // Clean old requests outside the window
    rateLimit.requests = rateLimit.requests.filter(
      (time) => time > windowStart
    );
    rateLimit.count = rateLimit.requests.length;

    // Check if rate limited
    if (rateLimit.count >= maxRequests) {
      rateLimit.limited = true;
      return false;
    }

    // Add current request
    rateLimit.requests.push(now);
    rateLimit.count++;
    rateLimit.limited = false;

    return true;
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: MCPSSEMessage): boolean {
    const connection = this.connections.get(clientId);
    if (!connection || connection.response.destroyed) {
      this.removeConnection(clientId);
      return false;
    }

    try {
      const sseMessage = this.formatSSEMessage(message);
      connection.response.write(sseMessage);
      connection.lastActivity = Date.now();
      this.messagesSent++;
      this.messagesLastMinute++;
      return true;
    } catch (error) {
      console.error(`[SSE] Error sending message to ${clientId}:`, error);
      this.errorsLastMinute++;
      this.removeConnection(clientId);
      return false;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: MCPSSEMessage, excludeClient?: string): number {
    let sentCount = 0;
    const clients = Array.from(this.connections.keys());

    for (const clientId of clients) {
      if (excludeClient && clientId === excludeClient) {
        continue;
      }

      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Send message to authenticated clients only
   */
  broadcastToAuthenticated(message: MCPSSEMessage): number {
    let sentCount = 0;
    const authenticatedClients = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.authenticated)
      .map(([clientId, _]) => clientId);

    for (const clientId of authenticatedClients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(): ConnectionHealth[] {
    const now = Date.now();
    const staleThreshold = this.options.connectionTimeout || 300_000;

    return Array.from(this.connections.entries()).map(([clientId, conn]) => {
      const timeSinceActivity = now - conn.lastActivity;
      return {
        clientId,
        healthy: !conn.response.destroyed,
        lastActivity: conn.lastActivity,
        timeSinceActivity,
        stale: timeSinceActivity > staleThreshold,
      };
    });
  }

  /**
   * Get connection manager statistics
   */
  getStats(): ConnectionManagerStats {
    const authenticatedCount = Array.from(this.connections.values()).filter(
      (conn) => conn.authenticated
    ).length;

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticatedCount,
      messagesLastMinute: this.messagesLastMinute,
      totalMessagesSent: this.messagesSent,
      errorsLastMinute: this.errorsLastMinute,
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
    };
  }

  /**
   * Get all connected client IDs
   */
  getConnectedClients(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if a client is connected
   */
  isConnected(clientId: string): boolean {
    const connection = this.connections.get(clientId);
    return connection !== undefined && !connection.response.destroyed;
  }

  /**
   * Format message as SSE
   */
  private formatSSEMessage(message: MCPSSEMessage): string {
    let formatted = '';

    if (message.event) {
      formatted += `event: ${message.event}\n`;
    }

    // Handle multiline data by splitting and prefixing each line
    const dataString = JSON.stringify(message);
    const lines = dataString.split('\n');
    for (const line of lines) {
      formatted += `data: ${line}\n`;
    }

    formatted += '\n'; // Empty line to end the message
    return formatted;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const pingMessage: MCPSSEMessage = {
        event: 'ping',
        timestamp: new Date().toISOString(),
        version: '1.4.1',
      };

      this.broadcast(pingMessage);
    }, this.options.heartbeatInterval || 30_000);
  }

  /**
   * Start cleanup process for stale connections
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const healthChecks = this.getConnectionHealth();
      const staleConnections = healthChecks.filter((health) => health.stale);

      for (const stale of staleConnections) {
        console.log(`[SSE] Removing stale connection: ${stale.clientId}`);
        this.removeConnection(stale.clientId);
      }

      // Clean up old rate limit data
      const now = Date.now();
      const oneHourAgo = now - 3_600_000;
      for (const [clientId, rateLimit] of this.rateLimits.entries()) {
        if (
          rateLimit.windowStart < oneHourAgo &&
          !this.connections.has(clientId)
        ) {
          this.rateLimits.delete(clientId);
        }
      }
    }, 60_000); // Run every minute
  }

  /**
   * Start stats reset interval
   */
  private startStatsReset(): void {
    if (this.statsResetInterval) {
      clearInterval(this.statsResetInterval);
    }

    this.statsResetInterval = setInterval(() => {
      this.messagesLastMinute = 0;
      this.errorsLastMinute = 0;
    }, 60_000); // Reset every minute
  }

  /**
   * Gracefully shutdown the connection manager
   */
  shutdown(): void {
    console.log('[SSE] Shutting down connection manager...');

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.statsResetInterval) {
      clearInterval(this.statsResetInterval);
      this.statsResetInterval = null;
    }

    // Send shutdown message to all clients
    const shutdownMessage: MCPSSEMessage = {
      event: 'status',
      timestamp: new Date().toISOString(),
      status: {
        type: 'disconnected',
        message: 'Server shutting down',
      },
      version: '1.4.1',
    };

    this.broadcast(shutdownMessage);

    // Close all connections
    const clients = Array.from(this.connections.keys());
    for (const clientId of clients) {
      this.removeConnection(clientId);
    }

    console.log('[SSE] Connection manager shutdown complete');
  }
}
