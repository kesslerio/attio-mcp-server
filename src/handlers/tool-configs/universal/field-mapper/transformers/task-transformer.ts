/**
 * Task-specific field transformation functions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

/**
 * Task field mapping with operation-specific handling
 *
 * Prevents content injection on update operations (Issue #480 compatibility)
 * Handles the distinction between create and update operations for task fields
 */
export function mapTaskFields(
  operation: 'create' | 'update',
  input: Record<string, unknown>
): Record<string, unknown> {
  const output = { ...input };

  // For create operations, synthesize content from title if missing
  if (operation === 'create' && 'title' in output && !('content' in output)) {
    output.content = output.title;
  }

  // For update operations, never synthesize content - it's immutable
  // Do NOT delete user-supplied content; let API reject it with proper error
  if (operation === 'update') {
    // Content is immutable - if user supplies it, let Attio API reject with error
    // Do not inject, do not delete
  }

  return output;
}