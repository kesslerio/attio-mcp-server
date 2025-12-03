/**
 * MCP Protocol Handler for Cloudflare Workers
 *
 * Implements the MCP protocol over HTTP using Streamable HTTP transport
 * Compatible with Claude.ai and ChatGPT MCP connectors
 */

import {
  createAttioClient,
  createToolRegistry,
  type ToolRegistryConfig,
} from '@attio-mcp/core';

/**
 * MCP JSON-RPC request structure
 */
interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response structure
 */
interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Server info for MCP initialize
 */
const SERVER_INFO = {
  name: 'attio-mcp-server',
  version: '1.0.0',
};

/**
 * Server capabilities
 */
const CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: { listChanged: true },
};

/**
 * MCP error codes
 */
const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
};

/**
 * Create an MCP protocol handler
 */
export function createMcpHandler(config: {
  attioToken: string;
  registryConfig?: ToolRegistryConfig;
}) {
  const { attioToken, registryConfig } = config;

  // Create Attio client and tool registry
  const client = createAttioClient(attioToken);
  const registry = createToolRegistry(registryConfig);

  /**
   * Handle MCP initialize request
   */
  function handleInitialize(_params: Record<string, unknown>): unknown {
    return {
      protocolVersion: '2024-11-05',
      capabilities: CAPABILITIES,
      serverInfo: SERVER_INFO,
    };
  }

  /**
   * Handle MCP tools/list request
   */
  function handleToolsList(): unknown {
    const definitions = registry.getDefinitions();
    return {
      tools: definitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
      })),
    };
  }

  /**
   * Handle MCP tools/call request
   */
  async function handleToolsCall(
    params: Record<string, unknown>
  ): Promise<unknown> {
    const { name, arguments: args } = params as {
      name: string;
      arguments?: Record<string, unknown>;
    };

    if (!name) {
      throw { code: ErrorCodes.InvalidParams, message: 'Missing tool name' };
    }

    const result = await registry.executeTool(client, name, args || {});

    return {
      content: result.content,
      isError: result.isError,
    };
  }

  /**
   * Handle MCP resources/list request
   */
  function handleResourcesList(): unknown {
    // No resources exposed yet
    return { resources: [] };
  }

  /**
   * Handle MCP prompts/list request
   */
  function handlePromptsList(): unknown {
    // No prompts exposed yet
    return { prompts: [] };
  }

  /**
   * Process an MCP request
   */
  async function processRequest(request: McpRequest): Promise<McpResponse> {
    const { jsonrpc, id, method, params } = request;

    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: ErrorCodes.InvalidRequest,
          message: 'Invalid JSON-RPC version',
        },
      };
    }

    try {
      let result: unknown;

      switch (method) {
        case 'initialize':
          result = handleInitialize(params || {});
          break;
        case 'initialized':
          // Notification, no response needed but we'll acknowledge
          result = {};
          break;
        case 'tools/list':
          result = handleToolsList();
          break;
        case 'tools/call':
          result = await handleToolsCall(params || {});
          break;
        case 'resources/list':
          result = handleResourcesList();
          break;
        case 'prompts/list':
          result = handlePromptsList();
          break;
        case 'ping':
          result = {};
          break;
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: ErrorCodes.MethodNotFound,
              message: `Unknown method: ${method}`,
            },
          };
      }

      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      const errorResponse: McpResponse = {
        jsonrpc: '2.0',
        id,
        error: {
          code:
            error && typeof error === 'object' && 'code' in error
              ? (error as { code: number }).code
              : ErrorCodes.InternalError,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
      return errorResponse;
    }
  }

  /**
   * Handle an HTTP request to the MCP endpoint
   */
  async function handleHttpRequest(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, MCP-Protocol-Version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();

      // Handle batch requests
      if (Array.isArray(body)) {
        const responses = await Promise.all(
          body.map((req) => processRequest(req as McpRequest))
        );
        return new Response(JSON.stringify(responses), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'MCP-Protocol-Version': '2024-11-05',
          },
        });
      }

      // Handle single request
      const response = await processRequest(body as McpRequest);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'MCP-Protocol-Version': '2024-11-05',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: ErrorCodes.ParseError, message: 'Parse error' },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  return {
    processRequest,
    handleHttpRequest,
  };
}
