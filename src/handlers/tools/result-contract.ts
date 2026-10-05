import {
  CallToolResultSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { ToolConfig } from '@/handlers/tool-types.js';
import { sanitizeMcpResponse } from '@/utils/json-serializer.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import { createScopedLogger, getLogContext } from '@/utils/logger.js';

const logger = createScopedLogger('tools.result-contract');

export class ResultEncodingError extends Error {
  readonly code = 'RESULT_ENCODING_FAILED';
  constructor() {
    super(
      'The tool completed but its result could not be encoded. Read back the result before retrying a write.'
    );
  }
}

/** The sanitized machine result owns success; prose cannot change the outcome. */
export function buildStructuredToolResult(
  config: ToolConfig,
  rawResult: unknown,
  args: Record<string, unknown>
): CallToolResult {
  let structuredContent: Record<string, unknown>;
  let json: string;
  let text: string;
  try {
    if (!config.resultSchema || !config.structuredOutput)
      throw new ResultEncodingError();
    const normalized = config.structuredOutput(
      rawResult,
      args.resource_type as string | undefined,
      args
    );
    // Reject non-JSON values before sanitization can substitute success data.
    config.resultSchema.parse(normalized);
    json = JSON.stringify(normalized);
    const sanitized = sanitizeMcpResponse({
      content: [],
      structuredContent: normalized,
      isError: false,
    });
    if (
      !sanitized ||
      typeof sanitized !== 'object' ||
      !('structuredContent' in sanitized) ||
      ('isError' in sanitized && sanitized.isError === true)
    ) {
      throw new ResultEncodingError();
    }
    const parsed = config.resultSchema.parse(sanitized.structuredContent);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      'error' in parsed ||
      JSON.stringify(sanitized.structuredContent) !== json
    ) {
      throw new ResultEncodingError();
    }
    structuredContent = sanitized.structuredContent as Record<string, unknown>;
    // Connector families keep their documented JSON text shape; every other
    // family serializes the envelope itself into the compatibility channel.
    text = config.textProjection
      ? config.textProjection(structuredContent)
      : json;
    if (typeof text !== 'string') throw new ResultEncodingError();
    if (
      Array.isArray(structuredContent.data) &&
      structuredContent.count !== structuredContent.data.length
    )
      throw new ResultEncodingError();
  } catch {
    throw new ResultEncodingError();
  }

  const content: CallToolResult['content'] = [{ type: 'text', text }];
  if (process.env.MCP_TEXT_RESULTS !== 'false' && config.formatResult) {
    try {
      // Preserve the existing formatter arguments and default-enabled prose.
      const formatter = config.formatResult as (
        result: unknown,
        args: Record<string, unknown>,
        infoType: unknown
      ) => string;
      const prose = formatter(rawResult, args, args.info_type);
      if (typeof prose === 'string' && prose.length > 0)
        content.push({ type: 'text', text: prose });
    } catch {
      logger.warn('Companion formatting failed after tool completion', {
        toolName: config.name,
      });
    }
  }
  return { content, structuredContent, isError: false };
}

/** Pending family migrations retain their success text, but never bypass errors. */
export function finalizeLegacyToolResult(
  result: unknown,
  toolName: string,
  readOnly: boolean
): unknown {
  const { correlationId, requestId, userId } = getLogContext();
  const errorContext = {
    operation: `execute:${toolName}`,
    correlationId,
    requestId,
    userId,
    uncertainMutation: !readOnly,
  };
  if (
    result &&
    typeof result === 'object' &&
    'isError' in result &&
    result.isError === true
  ) {
    return createSecureToolErrorResult(
      'error' in result ? result.error : new Error('Tool execution failed'),
      errorContext
    );
  }
  const sanitized = sanitizeMcpResponse(result);
  if (
    !sanitized ||
    typeof sanitized !== 'object' ||
    !('content' in sanitized) ||
    !CallToolResultSchema.safeParse(sanitized).success ||
    ('isError' in sanitized && sanitized.isError === true)
  ) {
    return createSecureToolErrorResult(new ResultEncodingError(), errorContext);
  }
  return sanitized;
}
