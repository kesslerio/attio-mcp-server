/**
 * Centralized HTTP → MCP error mapping
 * Converts HTTP responses to MCP-compliant result format
 */

export interface HttpResponse {
  status: number;
  body: unknown;
}

export interface McpResult {
  isError: boolean;
  content?: Array<{ type: 'text'; text: string }>;
  error?: {
    code: number;
    type: string;
    message?: string;
  };
}

/**
 * Convert HTTP response to MCP-compliant result format
 * Non-2xx responses become isError: true with appropriate error messages
 */
export function toMcpResult(resp: HttpResponse): McpResult {
  if (resp.status >= 200 && resp.status < 300) {
    return {
      isError: false,
      content: [{ type: 'text', text: JSON.stringify(resp.body) }],
    };
  }

  // Check if we have a structured error with code and type
  if (resp.body?.code && resp.body?.type) {
    return {
      isError: true,
      error: {
        code: resp.status,
        type: resp.body.type,
        message: resp.body.message,
      },
      content: [
        { type: 'text', text: resp.body.message || `HTTP ${resp.status}` },
      ],
    };
  }

  // Fallback to simple message format
    resp.body?.message ||
    resp.body?.error?.message ||
    (resp.status === 404
      ? 'record not found'
      : resp.status === 400
        ? 'invalid record_id format'
        : `HTTP ${resp.status}`);

  return {
    isError: true,
    content: [{ type: 'text', text: msg }],
  };
}

/**
 * Check if a result looks like an HTTP response
 */
export function isHttpResponseLike(result: unknown): result is HttpResponse {
  return (
    result &&
    typeof result === 'object' &&
    typeof result.status === 'number' &&
    'body' in result
  );
}
