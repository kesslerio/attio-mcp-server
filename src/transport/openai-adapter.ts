/**
 * OpenAI Adapter for SSE Transport
 * Integrates OpenAI tools with the SSE server for ChatGPT connector
 */

import { ServerResponse as HttpServerResponse, IncomingMessage } from 'http';
import { openAIToolDefinitions, openAITools } from '../openai/index.js';
import type { OpenAIErrorResponse } from '../openai/types.js';
import type { ClientMessage, MCPSSEMessage } from '../types/sse-types.js';
import { debug, warn } from '../utils/logger.js';
import { wrapMCPMessage } from './message-wrapper.js';
import type { SSEServer } from './sse-server.js';

/**
 * Handle OpenAI tool requests through SSE
 */
export class OpenAISSEAdapter {
  private sseServer: SSEServer;

  constructor(sseServer: SSEServer) {
    this.sseServer = sseServer;
  }

  /**
   * Handle OpenAI tool execution request
   */
  async handleToolRequest(
    clientId: string,
    message: ClientMessage
  ): Promise<MCPSSEMessage> {
    try {
      const { tool, arguments: args } = message.payload || {};

      if (!(tool && args)) {
        throw new Error('Missing tool name or arguments');
      }

      debug(
        'OpenAI Adapter',
        `Executing tool: ${tool}`,
        { tool, args },
        'handleToolRequest'
      );

      let result: any;

      switch (tool) {
        case 'search':
          if (!args.query) {
            throw new Error('Missing required parameter: query');
          }
          result = await openAITools.search(args.query);
          break;

        case 'fetch':
          if (!args.id) {
            throw new Error('Missing required parameter: id');
          }
          result = await openAITools.fetch(args.id);
          break;

        default:
          throw new Error(`Unknown tool: ${tool}`);
      }

      // Wrap successful result
      return wrapMCPMessage(
        {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            type: 'tool_result',
            tool_name: tool,
            content: result,
          },
        },
        'mcp_response'
      );
    } catch (error: any) {
      warn('[OpenAI Adapter] Tool execution failed:', error);

      // Return error response in OpenAI format
      const errorResponse: OpenAIErrorResponse = {
        error: {
          message: error.message || 'Tool execution failed',
          type: 'api_error',
          code: error.code,
        },
      };

      return wrapMCPMessage(
        {
          jsonrpc: '2.0',
          id: message.id,
          error: errorResponse,
        },
        'error'
      );
    }
  }

  /**
   * Handle tool discovery request
   */
  async handleToolsListRequest(
    clientId: string,
    message: ClientMessage
  ): Promise<MCPSSEMessage> {
    debug(
      'OpenAI Adapter',
      'Listing available tools',
      {},
      'handleToolsListRequest'
    );

    return wrapMCPMessage(
      {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: openAIToolDefinitions,
        },
      },
      'mcp_response'
    );
  }

  /**
   * Register OpenAI routes with the SSE server
   * Note: Routes are currently handled in http-server.ts
   */
  registerRoutes(): void {
    // Routes are registered in health/http-server.ts
    // This method is kept for future SSE-specific route handling
  }
}

/**
 * Create and configure OpenAI adapter for SSE server
 */
export function createOpenAIAdapter(sseServer: SSEServer): OpenAISSEAdapter {
  const adapter = new OpenAISSEAdapter(sseServer);
  adapter.registerRoutes();
  return adapter;
}
