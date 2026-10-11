import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getErrorStatus } from '@/types/error-interfaces.js';

/** Only errors constructed at the resource boundary may pass through unchanged. */
export class ResourceProtocolError extends McpError {
  constructor(code: number, message: string, cause?: unknown) {
    super(code, message);
    // Retain diagnostics locally without putting upstream data in SDK error.data.
    Object.defineProperty(this, 'cause', { value: cause, enumerable: false });
  }
}

export function resourceFailure(
  error: unknown,
  operation: 'read' | 'list'
): ResourceProtocolError {
  if (error instanceof ResourceProtocolError) return error;

  // Domain adapters can wrap HTTP errors. Never inspect their messages or bodies.
  const visited = new Set<unknown>();
  let cause = error;
  let status: number | undefined;
  while (cause && typeof cause === 'object' && !visited.has(cause)) {
    visited.add(cause);
    status = getErrorStatus(cause);
    if (status !== undefined || visited.size >= 10) break;
    cause = 'cause' in cause ? cause.cause : undefined;
  }

  if (operation === 'read' && status === 404) {
    // The current native SDK serves legacy revisions. U7 owns modern encoding.
    return new ResourceProtocolError(-32002, 'Resource not found', error);
  }
  return new ResourceProtocolError(
    ErrorCode.InternalError,
    operation === 'read'
      ? 'Unable to read resource; verify access and try again'
      : 'Unable to list resources; verify access and try again',
    error
  );
}
