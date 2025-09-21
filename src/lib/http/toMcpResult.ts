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
  const responseBody =
    typeof resp.body === 'object' && resp.body !== null
      ? (resp.body as Record<string, unknown>)
      : {};

  if (resp.status >= 200 && resp.status < 300) {
    return {
      isError: false,
      content: [{ type: 'text', text: JSON.stringify(resp.body) }],
    };
  }

  // Check if we have a structured error with code and type
  if ('code' in responseBody && 'type' in responseBody) {
    return {
      isError: true,
      error: {
        code: resp.status,
        type: String(responseBody.type),
        message: responseBody.message as string | undefined,
      },
      content: [
        {
          type: 'text',
          text:
            (responseBody.message as string | undefined) ||
            `HTTP ${resp.status}`,
        },
      ],
    };
  }

  // Fallback to simple message format
  const msg =
    (responseBody.message as string | undefined) ||
    (typeof responseBody.error === 'object' && responseBody.error !== null
      ? ((responseBody.error as Record<string, unknown>).message as
          | string
          | undefined)
      : undefined) ||
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
    typeof result === 'object' &&
    result !== null &&
    'status' in result &&
    typeof (result as { status?: unknown }).status === 'number' &&
    'body' in result
  );
}
