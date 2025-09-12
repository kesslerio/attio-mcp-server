/**
 * Shared constants for MCP Task Management Tests
 * Provides centralized configuration for test constraints and validation
 */

/**
 * Attio API Task Constraints
 * Documentation of field-level constraints discovered during testing
 */
export const TASK_CONSTRAINTS = {
  /**
   * Task content field is immutable after creation
   * Cannot be updated via PATCH operations
   */
  CONTENT_IMMUTABLE: true,

  /**
   * Required fields for task creation
   */
  REQUIRED_FIELDS: ['title', 'content'] as const,

  /**
   * Mutable fields that can be updated after creation
   */
  MUTABLE_FIELDS: ['priority', 'status', 'due_date', 'assignees'] as const,

  /**
   * UUID format validation pattern
   */
  UUID_PATTERN:
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
} as const;

/**
 * Valid task status values
 * Matches Attio API task status options
 */
export const TASK_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'scheduled',
  'cancelled',
  'on_hold',
  'waiting',
  'recurring',
] as const;

/**
 * Valid task priority values
 * Matches Attio API task priority options
 */
export const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Response validation patterns
 * Common patterns for validating API responses
 */
export const RESPONSE_PATTERNS = {
  /**
   * Task creation success pattern
   */
  CREATE_SUCCESS:
    /Created task|Successfully created task|✅.*created|created.*task/i,

  /**
   * Task update success pattern
   */
  UPDATE_SUCCESS:
    /Updated task|Successfully updated task|✅.*updated|updated.*task/i,

  /**
   * Task deletion success pattern
   */
  DELETE_SUCCESS: /deleted|removed|success/i,

  /**
   * Error response pattern
   */
  ERROR_RESPONSE: /error|invalid|validation|not found/i,
} as const;

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  /**
   * Default test timeout for API operations (ms)
   */
  DEFAULT_TIMEOUT: 30000,

  /**
   * Test ID prefix for identification
   */
  TEST_ID_PREFIX: 'MCP_TEST_',

  /**
   * Maximum test tasks to create in batch operations
   */
  MAX_BATCH_SIZE: 5,

  /**
   * Date calculation helpers
   */
  DAYS_IN_FUTURE: (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],

  DAYS_IN_PAST: (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
} as const;

/**
 * Type definitions for constants
 */
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskRequiredField =
  (typeof TASK_CONSTRAINTS.REQUIRED_FIELDS)[number];
export type TaskMutableField = (typeof TASK_CONSTRAINTS.MUTABLE_FIELDS)[number];
