/**
 * List Entry Test Helpers
 * Shared utilities for list entry E2E tests (TC-010 and related)
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extract entry ID from MCP tool response
 * Handles both JSON format (id.entry_id) and text format ((ID: xxx))
 */
export function extractEntryId(result: CallToolResult): string | null {
  const text = result.content?.[0]?.text || '';

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
  const text = result.content?.[0]?.text || '';

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
 * Handles both explicit isError flag and error indicators in response text
 *
 * Note: This is intentionally strict - only triggers on clear error patterns
 */
export function isErrorResponse(result: CallToolResult): boolean {
  if (result.isError) return true;

  const text = result.content?.[0]?.text || '';
  const lower = text.toLowerCase();

  // Check for clear error patterns only (avoid false positives)
  return (
    lower.includes('error:') ||
    lower.includes('failed:') ||
    lower.includes('not found') ||
    lower.includes('no management mode') ||
    lower.includes('multiple modes') ||
    lower.includes('missing required') ||
    text.includes('"error":') || // JSON error field
    text.includes('"isError":true') ||
    text.includes('"status":400') ||
    text.includes('"status":404') ||
    text.includes('"status":500')
  );
}

/**
 * Check if an MCP response indicates success for a remove/delete operation
 * Handles various response formats from Attio API
 */
export function isRemoveSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = result.content?.[0]?.text || '';
  const lower = text.toLowerCase();

  // Boolean string response (common for remove operations)
  if (text === 'true' || lower === 'success') {
    return true;
  }

  // Check for explicit success indicators
  if (
    lower.includes('success') ||
    lower.includes('removed') ||
    lower.includes('deleted') ||
    text.includes('"success":true')
  ) {
    return true;
  }

  // Empty response or empty object typically means successful deletion
  if (text === '' || text === '{}' || text === 'null') {
    return true;
  }

  // JSON response without error indicators is considered success
  if (text.startsWith('{') && !isErrorResponse(result)) {
    return true;
  }

  return false;
}

/**
 * Check if an MCP response indicates success for an update operation
 */
export function isUpdateSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = result.content?.[0]?.text || '';
  const lower = text.toLowerCase();

  // Check for explicit success indicators
  if (
    lower.includes('success') ||
    lower.includes('updated') ||
    text.includes('"success":true')
  ) {
    return true;
  }

  // JSON response with entry data indicates success
  if (text.startsWith('{') && !isErrorResponse(result)) {
    return true;
  }

  return false;
}

/**
 * Check if an MCP response indicates success for an add operation
 */
export function isAddSuccess(result: CallToolResult): boolean {
  // Explicit error means failure
  if (result.isError) return false;

  const text = result.content?.[0]?.text || '';

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

  // Valid JSON response with entry data indicates success
  return text.startsWith('{');
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
