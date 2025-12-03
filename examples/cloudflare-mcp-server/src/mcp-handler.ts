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
  id?: string | number; // Optional for notifications
  method: string;
  params?: Record<string, unknown>;
}

/**
 * Check if a message is a notification (no id field)
 */
function isNotification(request: McpRequest): boolean {
  return request.id === undefined || request.id === null;
}

/**
 * MCP JSON-RPC response structure
 */
interface McpResponse {
  jsonrpc: '2.0';
  id: string | number | null; // Can be null for parse errors before id is known
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
 * Generate a secure session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

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

  // Session ID for this handler instance
  let sessionId: string | null = null;

  /**
   * Handle MCP initialize request
   * Returns the result and a new session ID
   */
  function handleInitialize(_params: Record<string, unknown>): {
    result: unknown;
    newSessionId: string;
  } {
    sessionId = generateSessionId();
    return {
      result: {
        protocolVersion: '2024-11-05',
        capabilities: CAPABILITIES,
        serverInfo: SERVER_INFO,
      },
      newSessionId: sessionId,
    };
  }

  /**
   * Handle MCP tools/list request
   * Includes annotations for ChatGPT to distinguish read vs write tools
   */
  function handleToolsList(): unknown {
    const definitions = registry.getDefinitions();
    return {
      tools: definitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        // Include annotations if defined (for readOnlyHint, etc.)
        ...(def.annotations && { annotations: def.annotations }),
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
   * Returns null for notifications (which need 202 response)
   * Returns { response, newSessionId? } for requests
   */
  async function processRequest(
    request: McpRequest
  ): Promise<{ response: McpResponse | null; newSessionId?: string }> {
    const { jsonrpc, id, method, params } = request;

    if (jsonrpc !== '2.0') {
      return {
        response: {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: ErrorCodes.InvalidRequest,
            message: 'Invalid JSON-RPC version',
          },
        },
      };
    }

    // Handle notifications (no id) - return null to indicate 202 response needed
    if (isNotification(request)) {
      // Just acknowledge notifications without a response
      // 'initialized', 'notifications/cancelled', etc.
      return { response: null };
    }

    try {
      let result: unknown;
      let newSessionId: string | undefined;

      switch (method) {
        case 'initialize': {
          const initResult = handleInitialize(params || {});
          result = initResult.result;
          newSessionId = initResult.newSessionId;
          break;
        }
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
            response: {
              jsonrpc: '2.0',
              id: id!,
              error: {
                code: ErrorCodes.MethodNotFound,
                message: `Unknown method: ${method}`,
              },
            },
          };
      }

      return { response: { jsonrpc: '2.0', id: id!, result }, newSessionId };
    } catch (error) {
      return {
        response: {
          jsonrpc: '2.0',
          id: id!,
          error: {
            code:
              error && typeof error === 'object' && 'code' in error
                ? (error as { code: number }).code
                : ErrorCodes.InternalError,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        },
      };
    }
  }

  /**
   * Handle an HTTP request to the MCP endpoint
   */
  async function handleHttpRequest(request: Request): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id',
      'Access-Control-Expose-Headers': 'MCP-Session-Id',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle GET for SSE stream (optional server-initiated messages)
    if (request.method === 'GET') {
      // For now, return 405 as we don't support server-initiated SSE streams
      return new Response(null, {
        status: 405,
        headers: {
          ...corsHeaders,
          Allow: 'POST, OPTIONS',
        },
      });
    }

    // Handle DELETE for session termination
    if (request.method === 'DELETE') {
      // Accept session termination requests
      sessionId = null;
      return new Response(null, {
        status: 202,
        headers: corsHeaders,
      });
    }

    // Only accept POST for MCP messages
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    try {
      const body = await request.json();

      // Handle batch requests
      if (Array.isArray(body)) {
        const results = await Promise.all(
          body.map((req) => processRequest(req as McpRequest))
        );
        // Filter out null responses (notifications)
        const responses = results
          .map((r) => r.response)
          .filter((r): r is McpResponse => r !== null);

        // If all were notifications, return 202
        if (responses.length === 0) {
          return new Response(null, {
            status: 202,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify(responses), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'MCP-Protocol-Version': '2024-11-05',
            ...corsHeaders,
          },
        });
      }

      // Handle single request
      const { response, newSessionId } = await processRequest(
        body as McpRequest
      );

      // Notification - return 202 Accepted with no body
      if (response === null) {
        return new Response(null, {
          status: 202,
          headers: corsHeaders,
        });
      }

      // Build response headers
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2024-11-05',
        ...corsHeaders,
      };

      // Include session ID header for initialize response
      if (newSessionId) {
        responseHeaders['MCP-Session-Id'] = newSessionId;
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: responseHeaders,
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
            ...corsHeaders,
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
