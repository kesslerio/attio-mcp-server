/**
 * List Entry Test Helpers
 * Shared utilities for list entry E2E tests (TC-010 and related)
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extract text content from MCP result with type narrowing
 */
function getResultText(result: CallToolResult): string {
  const content = result.content?.[0];
  if (content && 'text' in content) {
    return content.text;
  }
  return '';
}

/**
 * Extract entry ID from MCP tool response
 * Handles both JSON format (id.entry_id) and text format ((ID: xxx))
 */
export function extractEntryId(result: CallToolResult): string | null {
  const text = getResultText(result);

  // Try JSON format first (preferred)
  try {
    const jsonData = JSON.parse(text);
    return jsonData.id?.entry_id || jsonData.entry_id || jsonData.id || null;
  } catch {
    // Fall back to text pattern matching
    const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
    return idMatch ? idMatch[1] : null;
  }
}

/**
 * Extract record ID from MCP tool response
 * Handles both JSON format and text format
 */
export function extractRecordId(result: CallToolResult): string | null {
  const text = getResultText(result);

  // Try JSON format first
  try {
    const jsonData = JSON.parse(text);
    return jsonData.id?.record_id || jsonData.record_id || jsonData.id || null;
  } catch {
    // Fall back to text pattern matching
    const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
    return idMatch ? idMatch[1] : null;
  }
}

/**
 * Check if an MCP response indicates an error
 * Uses JSON parsing when possible, falls back to text patterns
 */
export function isErrorResponse(result: CallToolResult): boolean {
  if (result.isError) return true;

  const text = getResultText(result);
  const lower = text.toLowerCase();

  // Try JSON parsing first for structured error detection
  try {
    const jsonData = JSON.parse(text);

    // Check for common error indicators in parsed JSON
    if (jsonData.error !== undefined) return true;
    if (jsonData.isError === true) return true;
    if (typeof jsonData.status === 'number' && jsonData.status >= 400)
      return true;
    if (
      jsonData.code &&
      typeof jsonData.code === 'number' &&
      jsonData.code >= 400
    )
      return true;

    // Not a JSON error response
    return false;
  } catch {
    // Not valid JSON, check text patterns
  }

  // Check for clear error patterns in text (avoid false positives)
  return (
    lower.includes('error:') ||
    lower.includes('failed:') ||
    lower.includes('not found') ||
    lower.includes('no management mode') ||
    lower.includes('multiple modes') ||
    lower.includes('missing required') ||
    lower.startsWith('error ')
  );
}

/**
 * Check if an MCP response indicates success for a remove/delete operation
 * Strict: only accepts explicit success indicators, NOT arbitrary JSON
 */
export function isRemoveSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = getResultText(result);
  const lower = text.toLowerCase();

  // Boolean string response (common for remove operations)
  if (text === 'true' || lower === 'success') {
    return true;
  }

  // Empty response typically means successful deletion
  if (text === '' || text === '{}' || text === 'null') {
    return true;
  }

  // Check for explicit success keywords
  if (
    lower.includes('success') ||
    lower.includes('removed') ||
    lower.includes('deleted')
  ) {
    return true;
  }

  // Try JSON parsing for structured success response
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.success === true) return true;
    // Entry data returned (has id field) indicates success
    if (jsonData.id && !isErrorResponse(result)) return true;
  } catch {
    // Not valid JSON
  }

  return false;
}

/**
 * Check if an MCP response indicates success for an update operation
 * Strict: only accepts explicit success indicators or valid entry data
 */
export function isUpdateSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = getResultText(result);
  const lower = text.toLowerCase();

  // Check for explicit success keywords
  if (lower.includes('success') || lower.includes('updated')) {
    return true;
  }

  // Try JSON parsing for structured response
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.success === true) return true;
    // Entry data returned (has id field) indicates success
    if (jsonData.id && !isErrorResponse(result)) return true;
  } catch {
    // Not valid JSON
  }

  return false;
}

/**
 * Check if an MCP response indicates success for an add operation
 * Strict: requires valid entry data with ID
 */
export function isAddSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = getResultText(result);

  // Must have some content for add operations
  if (!text || text === '{}') {
    return false;
  }

  // Check if response contains error indicators
  if (isErrorResponse(result)) {
    return false;
  }

  // Duplicate/already exists is acceptable for add
  const lower = text.toLowerCase();
  if (lower.includes('already') || lower.includes('duplicate')) {
    return true;
  }

  // Try JSON parsing - require ID to confirm entry was created
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.success === true) return true;
    // Entry data returned (has id field) indicates success
    if (jsonData.id) return true;
  } catch {
    // Not valid JSON
  }

  return false;
}

/**
 * Check if a cleanup failure is benign (expected in some cases)
 * Mirrors MCPTestBase.isBenignCleanupFailure() pattern
 */
export function isBenignCleanupFailure(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('not found') ||
    normalized.includes('already deleted') ||
    normalized.includes('does not exist') ||
    normalized.includes('404') ||
    normalized.includes('uniqueness') ||
    normalized.includes('conflict') ||
    normalized.includes('duplicate') ||
    normalized.includes('cannot delete')
  );
}

/**
 * Constants for list entry testing
 */
export const LIST_ENTRY_TEST_CONSTANTS = {
  /** Invalid UUID for error testing */
  INVALID_UUID: '00000000-0000-0000-0000-000000000000',
  /** Dummy entry ID for testing removal of non-existent entries */
  DUMMY_ENTRY_ID: 'non-existent-entry-id',
} as const;
