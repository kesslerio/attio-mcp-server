/**
 * Telemetry logging for v1 prompts
 *
 * Provides structured logging of prompt usage metrics when enabled.
 * Respects PROMPT_TELEMETRY_ENABLED environment variable.
 */

import { createScopedLogger } from '@/utils/logger.js';
import { TokenMetadata } from '../types.js';
import { isTelemetryEnabled } from '../constants.js';

const logger = createScopedLogger('prompts.v1', 'telemetry');

/**
 * Telemetry event data structure
 */
export interface PromptTelemetryEvent {
  /** Name of the prompt executed */
  prompt_name: string;
  /** Estimated tokens in the response */
  estimated_tokens: number;
  /** Number of messages in the response */
  message_count: number;
  /** Total bytes of embedded resources */
  resource_bytes: number;
  /** Duration of prompt execution in milliseconds */
  duration_ms: number;
  /** Timestamp of the event */
  timestamp: string;
  /** Whether the prompt exceeded its budget */
  budget_exceeded?: boolean;
  /** User ID if available */
  user_id?: string;
  /** Request ID for correlation */
  request_id?: string;
}

/**
 * Log a prompt telemetry event
 *
 * Only logs if PROMPT_TELEMETRY_ENABLED=true
 *
 * @param event - Telemetry event data
 */
export function logPromptTelemetry(event: PromptTelemetryEvent): void {
  if (!isTelemetryEnabled()) {
    return;
  }

  logger.info('Prompt executed', {
    prompt_name: event.prompt_name,
    estimated_tokens: event.estimated_tokens,
    message_count: event.message_count,
    resource_bytes: event.resource_bytes,
    duration_ms: event.duration_ms,
    budget_exceeded: event.budget_exceeded,
    user_id: event.user_id,
    request_id: event.request_id,
    timestamp: event.timestamp,
  });
}

/**
 * Create a telemetry event from execution data
 *
 * @param promptName - Name of the prompt
 * @param tokenMetadata - Token metadata from execution
 * @param messageCount - Number of messages generated
 * @param startTime - Execution start time (Date.now())
 * @param budgetExceeded - Whether budget was exceeded
 * @param userId - Optional user ID
 * @param requestId - Optional request ID
 * @returns Telemetry event
 */
export function createTelemetryEvent(
  promptName: string,
  tokenMetadata: TokenMetadata,
  messageCount: number,
  startTime: number,
  budgetExceeded: boolean = false,
  userId?: string,
  requestId?: string
): PromptTelemetryEvent {
  return {
    prompt_name: promptName,
    estimated_tokens: tokenMetadata.estimated_tokens,
    message_count: messageCount,
    resource_bytes: tokenMetadata.resource_bytes,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    budget_exceeded: budgetExceeded,
    user_id: userId,
    request_id: requestId,
  };
}

/**
 * Track prompt execution with automatic telemetry
 *
 * Helper function to wrap prompt execution with telemetry logging
 *
 * @param promptName - Name of the prompt
 * @param execution - Async function that executes the prompt
 * @param userId - Optional user ID
 * @param requestId - Optional request ID
 * @returns Execution result with telemetry logged
 */
export async function trackPromptExecution<T>(
  promptName: string,
  execution: () => Promise<T>,
  userId?: string,
  requestId?: string
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await execution();
    return result;
  } finally {
    // Note: This is a simplified version
    // Full telemetry is logged in the handlers after message generation
    if (isTelemetryEnabled()) {
      logger.debug('Prompt execution completed', {
        prompt_name: promptName,
        duration_ms: Date.now() - startTime,
        user_id: userId,
        request_id: requestId,
      });
    }
  }
}
