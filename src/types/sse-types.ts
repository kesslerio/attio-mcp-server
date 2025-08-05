/**
 * TypeScript interfaces and types for Server-Sent Events (SSE) transport
 * Used for ChatGPT connector compatibility
 */

import type {
  ServerResponse as HttpServerResponse,
  IncomingMessage,
} from 'http';

/**
 * SSE connection information for a connected client
 */
export interface SSEConnection {
  /** Unique client identifier */
  clientId: string;
  /** HTTP response object for sending SSE messages */
  response: HttpServerResponse;
  /** Timestamp of last activity */
  lastActivity: number;
  /** Whether the connection is authenticated */
  authenticated: boolean;
  /** Client IP address for rate limiting */
  clientIp: string;
  /** Authentication token (if provided) */
  token?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * SSE message structure following RFC 6202
 */
export interface SSEMessage {
  /** Event type (optional) */
  event?: string;
  /** Message data (will be JSON stringified) */
  data: any;
  /** Unique message ID for resumption (optional) */
  id?: string;
  /** Retry interval in milliseconds (optional) */
  retry?: number;
}

/**
 * MCP message wrapped for SSE transport
 */
export interface MCPSSEMessage {
  /** SSE event type */
  event:
    | 'mcp_request'
    | 'mcp_response'
    | 'mcp_notification'
    | 'status'
    | 'error'
    | 'ping'
    | 'pong';
  /** Timestamp when message was created */
  timestamp: string;
  /** Original MCP message */
  mcp?: any;
  /** Status information */
  status?: {
    type: 'connected' | 'processing' | 'completed' | 'error' | 'disconnected';
    message?: string;
  };
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** MCP protocol version */
  version: string;
}

/**
 * Authentication result for SSE connections
 */
export interface SSEAuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Client identifier (if authenticated) */
  clientId?: string;
  /** Error message (if authentication failed) */
  error?: string;
  /** Additional user information */
  user?: {
    id: string;
    name?: string;
    permissions?: string[];
  };
}

/**
 * Rate limiting information per client
 */
export interface RateLimitInfo {
  /** Array of request timestamps within the current window */
  requests: number[];
  /** Total requests in current window */
  count: number;
  /** When the current window started */
  windowStart: number;
  /** Whether the client is currently rate limited */
  limited: boolean;
}

/**
 * SSE server configuration options
 */
export interface SSEServerOptions {
  /** Port to listen on (default: 3001) */
  port?: number;
  /** Enable CORS headers */
  enableCors?: boolean;
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Connection timeout in milliseconds (default: 300000) */
  connectionTimeout?: number;
  /** Rate limit: requests per minute per client (default: 100) */
  rateLimitPerMinute?: number;
  /** Maximum concurrent connections (default: 1000) */
  maxConnections?: number;
  /** Authentication required (default: false) */
  requireAuth?: boolean;
  /** Allowed origins for CORS (default: ['*']) */
  allowedOrigins?: string[];
}

/**
 * Connection manager statistics
 */
export interface ConnectionManagerStats {
  /** Total active connections */
  totalConnections: number;
  /** Authenticated connections */
  authenticatedConnections: number;
  /** Messages sent in last minute */
  messagesLastMinute: number;
  /** Total messages sent since startup */
  totalMessagesSent: number;
  /** Connection errors in last minute */
  errorsLastMinute: number;
  /** Memory usage information */
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * SSE endpoint routing information
 */
export interface SSEEndpoint {
  /** URL path */
  path: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'OPTIONS';
  /** Handler function */
  handler: (
    req: IncomingMessage,
    res: HttpServerResponse
  ) => void | Promise<void>;
  /** Whether authentication is required */
  requireAuth?: boolean;
  /** Rate limit override (requests per minute) */
  rateLimit?: number;
}

/**
 * HTTP POST message from client to server
 */
export interface ClientMessage {
  /** Message type */
  type: 'mcp_request' | 'ping' | 'auth';
  /** Unique message ID */
  id: string;
  /** Client identifier */
  clientId?: string;
  /** Message payload */
  payload: any;
  /** Timestamp */
  timestamp: string;
}

/**
 * Server response to client HTTP POST
 */
export interface ServerResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message ID (matches request ID) */
  id: string;
  /** Response payload */
  payload?: any;
  /** Error information (if success is false) */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Connection health check result
 */
export interface ConnectionHealth {
  /** Client identifier */
  clientId: string;
  /** Whether connection is healthy */
  healthy: boolean;
  /** Last activity timestamp */
  lastActivity: number;
  /** Time since last activity (ms) */
  timeSinceActivity: number;
  /** Whether connection is stale */
  stale: boolean;
  /** Connection response time (ms) */
  responseTime?: number;
}

/**
 * SSE transport initialization result
 */
export interface SSETransportInit {
  /** Whether initialization was successful */
  success: boolean;
  /** Server instance */
  server?: any;
  /** Connection manager instance */
  connectionManager?: any;
  /** Port the server is listening on */
  port?: number;
  /** Error information (if initialization failed) */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
