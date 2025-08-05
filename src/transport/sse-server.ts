/**
 * SSE Server Implementation
 * Provides Server-Sent Events transport for ChatGPT connector compatibility
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import type {
  ClientMessage,
  MCPSSEMessage,
  SSEAuthResult,
  SSEServerOptions,
  ServerResponse as SSEServerResponse,
  SSETransportInit,
} from '../types/sse-types.js';
import { SSEConnectionManager } from './connection-manager.js';

/**
 * SSE Server for handling ChatGPT connector communications
 */
export class SSEServer {
  private connectionManager: SSEConnectionManager;
  private options: SSEServerOptions;

  constructor(options: SSEServerOptions = {}) {
    this.options = {
      port: 3001,
      enableCors: true,
      heartbeatInterval: 30_000,
      connectionTimeout: 300_000,
      rateLimitPerMinute: 100,
      maxConnections: 1000,
      requireAuth: false,
      allowedOrigins: ['*'],
      ...options,
    };

    this.connectionManager = new SSEConnectionManager(this.options);
  }

  /**
   * Handle SSE connection request
   */
  async handleSSEConnection(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const clientId = this.generateClientId(req);
      const clientIp = this.getClientIp(req);

      console.log(
        `[SSE] New connection request from ${clientId} (${clientIp})`
      );

      // Authenticate if required
      if (this.options.requireAuth) {
        const authResult = this.authenticateRequest(req);
        if (!authResult.success) {
          this.sendErrorResponse(
            res,
            401,
            'Unauthorized',
            authResult.error || 'Authentication failed'
          );
          return;
        }
      }

      // Check rate limits
      if (!this.connectionManager.checkRateLimit(clientId)) {
        this.sendErrorResponse(
          res,
          429,
          'Too Many Requests',
          'Rate limit exceeded'
        );
        return;
      }

      // Set SSE headers
      this.setSSEHeaders(res);

      // Add connection to manager
      const token = this.extractToken(req);
      const userAgent = req.headers['user-agent'];
      const success = this.connectionManager.addConnection(
        clientId,
        res,
        clientIp,
        token,
        userAgent
      );

      if (!success) {
        this.sendErrorResponse(
          res,
          503,
          'Service Unavailable',
          'Connection limit reached'
        );
        return;
      }

      // Handle client disconnect
      req.on('close', () => {
        console.log(`[SSE] Client ${clientId} disconnected`);
        this.connectionManager.removeConnection(clientId);
      });

      req.on('error', (error) => {
        console.error(`[SSE] Client ${clientId} error:`, error);
        this.connectionManager.removeConnection(clientId);
      });
    } catch (error) {
      console.error('[SSE] Error handling connection:', error);
      this.sendErrorResponse(
        res,
        500,
        'Internal Server Error',
        'Connection failed'
      );
    }
  }

  /**
   * Handle client message POST request
   */
  async handleClientMessage(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const clientId = this.generateClientId(req);

      // Check if client is connected
      if (!this.connectionManager.isConnected(clientId)) {
        this.sendJSONResponse(res, 400, {
          success: false,
          id: '',
          error: {
            code: 'NOT_CONNECTED',
            message: 'Client must establish SSE connection first',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check rate limits
      if (!this.connectionManager.checkRateLimit(clientId)) {
        this.sendJSONResponse(res, 429, {
          success: false,
          id: '',
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Parse request body
      const body = await this.parseRequestBody(req);
      const clientMessage: ClientMessage = JSON.parse(body);

      // Validate message
      if (!(clientMessage.type && clientMessage.id)) {
        this.sendJSONResponse(res, 400, {
          success: false,
          id: clientMessage.id || '',
          error: {
            code: 'INVALID_MESSAGE',
            message: 'Message must have type and id fields',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Process message based on type
      const response = await this.processClientMessage(clientId, clientMessage);
      this.sendJSONResponse(res, 200, response);
    } catch (error) {
      console.error('[SSE] Error handling client message:', error);
      this.sendJSONResponse(res, 500, {
        success: false,
        id: '',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process message',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle CORS preflight requests
   */
  handleOptionsRequest(req: IncomingMessage, res: ServerResponse): void {
    if (this.options.enableCors) {
      this.setCORSHeaders(res);
    }
    res.writeHead(200);
    res.end();
  }

  /**
   * Get connection manager instance
   */
  getConnectionManager(): SSEConnectionManager {
    return this.connectionManager;
  }

  /**
   * Send MCP message to specific client
   */
  sendMCPMessage(clientId: string, mcpMessage: any): boolean {
    const sseMessage: MCPSSEMessage = {
      event: 'mcp_response',
      timestamp: new Date().toISOString(),
      mcp: mcpMessage,
      version: '1.4.1',
    };

    return this.connectionManager.sendToClient(clientId, sseMessage);
  }

  /**
   * Broadcast MCP message to all clients
   */
  broadcastMCPMessage(mcpMessage: any, excludeClient?: string): number {
    const sseMessage: MCPSSEMessage = {
      event: 'mcp_notification',
      timestamp: new Date().toISOString(),
      mcp: mcpMessage,
      version: '1.4.1',
    };

    return this.connectionManager.broadcast(sseMessage, excludeClient);
  }

  /**
   * Send status update to client
   */
  sendStatus(
    clientId: string,
    type: 'processing' | 'completed' | 'error',
    message?: string
  ): boolean {
    const sseMessage: MCPSSEMessage = {
      event: 'status',
      timestamp: new Date().toISOString(),
      status: { type, message },
      version: '1.4.1',
    };

    return this.connectionManager.sendToClient(clientId, sseMessage);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      ...this.connectionManager.getStats(),
      options: this.options,
      connectionHealth: this.connectionManager.getConnectionHealth(),
    };
  }

  /**
   * Gracefully shutdown the server
   */
  shutdown(): void {
    console.log('[SSE] Shutting down SSE server...');
    this.connectionManager.shutdown();
  }

  /**
   * Generate unique client ID from request
   */
  private generateClientId(req: IncomingMessage): string {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestamp = Date.now();

    // Create a hash-like ID from IP, user agent, and timestamp
    const combined = `${ip}-${userAgent}-${timestamp}`;
    return Buffer.from(combined).toString('base64').slice(0, 16);
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: IncomingMessage): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract authentication token from request
   */
  private extractToken(req: IncomingMessage): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return;
  }

  /**
   * Authenticate request (placeholder implementation)
   */
  private authenticateRequest(req: IncomingMessage): SSEAuthResult {
    const token = this.extractToken(req);

    if (!token) {
      return {
        success: false,
        error: 'Missing authentication token',
      };
    }

    // TODO: Implement actual token validation
    // For now, accept any token for development
    if (token.length < 10) {
      return {
        success: false,
        error: 'Invalid token format',
      };
    }

    return {
      success: true,
      clientId: this.generateClientId(req),
      user: {
        id: 'user-' + token.slice(0, 8),
        name: 'API User',
        permissions: ['read', 'write'],
      },
    };
  }

  /**
   * Set SSE headers
   */
  private setSSEHeaders(res: ServerResponse): void {
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    };

    if (this.options.enableCors) {
      this.setCORSHeaders(res, headers);
    }

    res.writeHead(200, headers);
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(
    res: ServerResponse,
    existingHeaders: Record<string, string> = {}
  ): void {
    const allowedOrigins = this.options.allowedOrigins || ['*'];
    const origin = allowedOrigins.includes('*')
      ? '*'
      : allowedOrigins.join(', ');

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      ...existingHeaders,
    };

    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
  }

  /**
   * Send error response
   */
  private sendErrorResponse(
    res: ServerResponse,
    statusCode: number,
    statusText: string,
    message: string
  ): void {
    if (this.options.enableCors) {
      this.setCORSHeaders(res);
    }

    res.writeHead(statusCode, statusText, {
      'Content-Type': 'application/json',
    });

    res.end(
      JSON.stringify({
        error: {
          code: statusCode,
          message,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Send JSON response
   */
  private sendJSONResponse(
    res: ServerResponse,
    statusCode: number,
    data: any
  ): void {
    if (this.options.enableCors) {
      this.setCORSHeaders(res);
    }

    const jsonResponse = JSON.stringify(data);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonResponse),
    });
    res.end(jsonResponse);
  }

  /**
   * Parse request body
   */
  private parseRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Process client message based on type
   */
  private async processClientMessage(
    clientId: string,
    message: ClientMessage
  ): Promise<SSEServerResponse> {
    const timestamp = new Date().toISOString();

    switch (message.type) {
      case 'ping': {
        // Respond to ping with pong
        const pongMessage: MCPSSEMessage = {
          event: 'pong',
          timestamp,
          version: '1.4.1',
        };
        this.connectionManager.sendToClient(clientId, pongMessage);

        return {
          success: true,
          id: message.id,
          payload: { type: 'pong' },
          timestamp,
        };
      }

      case 'mcp_request': {
        // Handle MCP request
        // TODO: Integrate with existing MCP handlers
        const mcpResponse: MCPSSEMessage = {
          event: 'mcp_response',
          timestamp,
          mcp: {
            jsonrpc: '2.0',
            id: message.payload.id,
            result: { message: 'MCP integration not yet implemented' },
          },
          version: '1.4.1',
        };
        this.connectionManager.sendToClient(clientId, mcpResponse);

        return {
          success: true,
          id: message.id,
          payload: { type: 'mcp_queued' },
          timestamp,
        };
      }

      case 'auth':
        // Handle re-authentication
        return {
          success: true,
          id: message.id,
          payload: { type: 'auth_success' },
          timestamp,
        };

      default:
        return {
          success: false,
          id: message.id,
          error: {
            code: 'UNSUPPORTED_MESSAGE_TYPE',
            message: `Unsupported message type: ${message.type}`,
          },
          timestamp,
        };
    }
  }
}

/**
 * Initialize SSE transport server
 */
export function initializeSSETransport(
  options: SSEServerOptions = {}
): SSETransportInit {
  try {
    const sseServer = new SSEServer(options);

    return {
      success: true,
      server: sseServer,
      connectionManager: sseServer.getConnectionManager(),
      port: options.port || 3001,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize SSE transport',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
