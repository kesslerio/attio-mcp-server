/**
 * Response formatting utilities for tool execution
 *
 * Provides consistent formatting for success responses and result messages
 */

import type { ToolErrorContext } from '../../../types/tool-types.js';

/**
 * Formats a company operation success response in a consistent manner
 *
 * @param operation - The operation type (e.g., 'create', 'update', 'delete')
 * @param resourceType - The resource type (e.g., 'companies')
 * @param resourceId - The ID of the affected resource
 * @param details - Additional details to include in the response
 * @returns Formatted success message
 */
export function formatSuccessResponse(
  operation: string,
  resourceType: string,
  resourceId: string,
  details?: ToolErrorContext
): string {
  let message = `Successfully ${operation}d ${resourceType} record with ID: ${resourceId}`;

  if (details && Object.keys(details).length > 0) {
    const detailsText = Object.entries(details)
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
      )
      .join(', ');

    message += ` (${detailsText})`;
  }

  return message;
}
