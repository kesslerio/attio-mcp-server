/**
 * Message Wrapper for MCP-to-SSE Transport
 * Handles conversion between MCP JSON-RPC messages and SSE format
 */

import type { MCPSSEMessage } from '../types/sse-types.js';

/**
 * Wrap MCP JSON-RPC request for SSE transport
 */
export function wrapMCPRequest(mcpMessage: any): MCPSSEMessage {
  return {
    event: 'mcp_request',
    timestamp: new Date().toISOString(),
    mcp: mcpMessage,
    version: '1.4.1',
  };
}

/**
 * Wrap MCP JSON-RPC response for SSE transport
 */
export function wrapMCPResponse(mcpMessage: any): MCPSSEMessage {
  return {
    event: 'mcp_response',
    timestamp: new Date().toISOString(),
    mcp: mcpMessage,
    version: '1.4.1',
  };
}

/**
 * Wrap MCP notification for SSE transport
 */
export function wrapMCPNotification(mcpMessage: any): MCPSSEMessage {
  return {
    event: 'mcp_notification',
    timestamp: new Date().toISOString(),
    mcp: mcpMessage,
    version: '1.4.1',
  };
}

/**
 * Generic wrapper for MCP messages based on event type
 */
export function wrapMCPMessage(
  mcpMessage: any,
  eventType: MCPSSEMessage['event']
): MCPSSEMessage {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    mcp: mcpMessage,
    version: '1.4.1',
  };
}

/**
 * Create status message for SSE transport
 */
export function createStatusMessage(
  type: 'connected' | 'processing' | 'completed' | 'error' | 'disconnected',
  message?: string
): MCPSSEMessage {
  return {
    event: 'status',
    timestamp: new Date().toISOString(),
    status: { type, message },
    version: '1.4.1',
  };
}

/**
 * Create error message for SSE transport
 */
export function createErrorMessage(
  code: string,
  message: string,
  details?: any
): MCPSSEMessage {
  return {
    event: 'error',
    timestamp: new Date().toISOString(),
    error: { code, message, details },
    version: '1.4.1',
  };
}

/**
 * Create ping message for SSE transport
 */
export function createPingMessage(): MCPSSEMessage {
  return {
    event: 'ping',
    timestamp: new Date().toISOString(),
    version: '1.4.1',
  };
}

/**
 * Create pong message for SSE transport
 */
export function createPongMessage(): MCPSSEMessage {
  return {
    event: 'pong',
    timestamp: new Date().toISOString(),
    version: '1.4.1',
  };
}

/**
 * Extract MCP message from SSE wrapper
 */
export function extractMCPMessage(sseMessage: MCPSSEMessage): any | null {
  if (sseMessage.mcp) {
    return sseMessage.mcp;
  }
  return null;
}

/**
 * Check if SSE message contains MCP data
 */
export function hasMCPData(sseMessage: MCPSSEMessage): boolean {
  return sseMessage.mcp !== undefined && sseMessage.mcp !== null;
}

/**
 * Convert SSE message to JSON string for transmission
 */
export function serializeSSEMessage(message: MCPSSEMessage): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    console.error('[SSE] Error serializing message:', error);
    return JSON.stringify(
      createErrorMessage(
        'SERIALIZATION_ERROR',
        'Failed to serialize message',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
}

/**
 * Parse JSON string to SSE message with validation
 */
export function deserializeSSEMessage(
  jsonString: string
): MCPSSEMessage | null {
  try {
    const parsed = JSON.parse(jsonString);

    // Basic validation
    if (!(parsed.timestamp && parsed.version)) {
      console.warn('[SSE] Invalid SSE message format:', parsed);
      return null;
    }

    return parsed as MCPSSEMessage;
  } catch (error) {
    console.error('[SSE] Error deserializing message:', error);
    return null;
  }
}

/**
 * Validate SSE message structure
 */
export function validateSSEMessage(message: any): message is MCPSSEMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  // Required fields
  if (!message.timestamp || typeof message.timestamp !== 'string') {
    return false;
  }

  if (!message.version || typeof message.version !== 'string') {
    return false;
  }

  // Optional but structured fields
  if (message.event && typeof message.event !== 'string') {
    return false;
  }

  if (
    message.status &&
    (typeof message.status !== 'object' ||
      !message.status.type ||
      typeof message.status.type !== 'string')
  ) {
    return false;
  }

  if (
    message.error &&
    (typeof message.error !== 'object' ||
      !message.error.code ||
      !message.error.message ||
      typeof message.error.code !== 'string' ||
      typeof message.error.message !== 'string')
  ) {
    return false;
  }

  return true;
}
