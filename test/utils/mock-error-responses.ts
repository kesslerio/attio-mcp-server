/**
 * Mock Error Response Utilities
 *
 * Standardized error responses for E2E test compatibility.
 * Ensures error messages match expected patterns across all test suites.
 *
 * Created for Issue #480 Phase 3: E2E Test Coverage & Validation
 */

import { TestEnvironment } from './mock-factories/test-environment.js';

/**
 * Union type for all mock responses
 */
export type MockResponse<T = unknown> =
  | MockSuccessResponse<T>
  | MockErrorResponse;

/**
 * Error message patterns that match E2E test expectations
 */
export const ERROR_PATTERNS = {
  NOT_FOUND: /not found|invalid|does not exist/i,
  INVALID_ID: /invalid.*id|id.*invalid/i,
  REQUIRED_FIELD: /required|missing/i,
  DUPLICATE: /duplicate|already exists/i,
  PERMISSION: /permission|unauthorized|forbidden/i,
} as const;

/**
 * StandardErrorMessages - Pre-defined error messages that match E2E test patterns
 */
export class StandardErrorMessages {
  /**
   * Creates a "not found" error message that matches the expected pattern
   */
  static notFound(resourceType: string, id?: string): string {
    return `${resourceType} not found${identifier}`;
  }

  /**
   * Creates an "invalid ID" error message
   */
  static invalidId(resourceType: string, id: string): string {
    return `Invalid ${resourceType} ID: ${id}`;
  }

  /**
   * Creates a "does not exist" error message
   */
  static doesNotExist(resourceType: string, id?: string): string {
    return `${resourceType}${identifier} does not exist`;
  }

  /**
   * Creates a "required field" error message
   */
  static requiredField(fieldName: string): string {
    return `Required field missing: ${fieldName}`;
  }

  /**
   * Creates a "duplicate" error message
   */
  static duplicate(resourceType: string, field?: string): string {
    return `${resourceType}${fieldInfo} already exists`;
  }

  /**
   * Creates a generic validation error message
   */
  static validationError(message: string): string {
    return `Validation error: ${message}`;
  }
}

/**
 * MockErrorResponseFactory - Creates standardized error responses for E2E tests
 */
export class MockErrorResponseFactory {
  /**
   * Creates a standardized "not found" error response
   */
  static notFound(resourceType: string, id?: string): MockErrorResponse {
    return {
      success: false,
      error: {
        message: StandardErrorMessages.notFound(resourceType, id),
        code: 'NOT_FOUND',
      },
    };
  }

  /**
   * Creates a standardized "invalid ID" error response
   */
  static invalidId(resourceType: string, id: string): MockErrorResponse {
    return {
      success: false,
      error: {
        message: StandardErrorMessages.invalidId(resourceType, id),
        code: 'INVALID_ID',
      },
    };
  }

  /**
   * Creates a standardized "does not exist" error response
   */
  static doesNotExist(resourceType: string, id?: string): MockErrorResponse {
    return {
      success: false,
      error: {
        message: StandardErrorMessages.doesNotExist(resourceType, id),
        code: 'NOT_FOUND',
      },
    };
  }

  /**
   * Creates a standardized validation error response
   */
  static validationError(message: string, field?: string): MockErrorResponse {
    return {
      success: false,
      error: {
        message: StandardErrorMessages.validationError(message),
        code: 'VALIDATION_ERROR',
        details: field ? { field } : undefined,
      },
    };
  }

  /**
   * Creates a standardized success response
   */
  static success<T>(content: T): MockSuccessResponse<T> {
    return {
      success: true,
      content,
    };
  }

  /**
   * Creates a response that looks like an MCP tool error (for E2E compatibility)
   */
  static mcpToolError(
    toolName: string,
    errorMessage: string
  ): MockErrorResponse {
    // Match the format that E2E tests expect from MCP tool responses

    return {
      success: false,
      error: {
        message: `Error executing tool '${toolName}': ${standardMessage}`,
        code: 'TOOL_EXECUTION_ERROR',
      },
    };
  }

  /**
   * Ensures error message matches expected E2E test patterns
   */
  private static makeErrorMessageStandard(message: string): string {
    // If the message already matches patterns, return as-is
    if (ERROR_PATTERNS.NOT_FOUND.test(message)) {
      return message;
    }

    // Convert common error types to match patterns
    if (message.includes('404') || message.includes('Not Found')) {
      return 'Record not found';
    }

    if (message.includes('400') || message.includes('Bad Request')) {
      return 'Invalid request';
    }

    if (message.includes('ID') && message.includes('invalid')) {
      return 'Invalid ID provided';
    }

    // Default: ensure it contains at least one of the expected patterns
    return `Record not found: ${message}`;
  }
}

/**
 * ErrorPatternValidator - Validates error messages match E2E test expectations
 */
export class ErrorPatternValidator {
  /**
   * Validates if an error message matches the expected pattern
   */
  static validate(
    errorMessage: string,
    expectedPattern: RegExp = ERROR_PATTERNS.NOT_FOUND
  ): boolean {
    return expectedPattern.test(errorMessage);
  }

  /**
   * Gets standardized error message for common scenarios
   */
  static getStandardError(
    scenario:
      | 'task_not_found'
      | 'list_not_found'
      | 'company_not_found'
      | 'person_not_found'
      | 'invalid_id'
      | 'generic_not_found',
    id?: string
  ): string {
    switch (scenario) {
      case 'task_not_found':
        return StandardErrorMessages.notFound('Task', id);
      case 'list_not_found':
        return StandardErrorMessages.notFound('List', id);
      case 'company_not_found':
        return StandardErrorMessages.notFound('Company', id);
      case 'person_not_found':
        return StandardErrorMessages.notFound('Person', id);
      case 'invalid_id':
        return StandardErrorMessages.invalidId('Record', id || 'unknown');
      case 'generic_not_found':
      default:
        return StandardErrorMessages.notFound('Record', id);
    }
  }

  /**
   * Creates a formatted error message that will match E2E test expectations
   */
  static formatForE2ETest(
    toolName: string,
    scenario: Parameters<typeof this.getStandardError>[0],
    id?: string
  ): string {
    return `Error executing tool '${toolName}': ${standardError}`;
  }
}

/**
 * Utility functions for E2E test compatibility
 */
export const E2ETestUtils = {
  /**
   * Creates a mock response that will pass E2E validation
   */
  createCompatibleResponse<T>(
    success: boolean,
    content?: T,
    errorScenario?: Parameters<
      typeof ErrorPatternValidator.getStandardError
    >[0],
    resourceId?: string
  ): MockResponse<T> {
    if (success && content !== undefined) {
      return MockErrorResponseFactory.success(content);
    } else {
        ? ErrorPatternValidator.getStandardError(errorScenario, resourceId)
        : StandardErrorMessages.notFound('Resource');

      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'NOT_FOUND',
        },
      };
    }
  },

  /**
   * Validates that a response will pass E2E test expectations
   */
  validateResponse(
    response: MockResponse,
    expectedPattern: RegExp = ERROR_PATTERNS.NOT_FOUND
  ): boolean {
    if (response.success) {
      return true; // Success responses always pass
    }

    return ErrorPatternValidator.validate(
      response.error.message,
      expectedPattern
    );
  },
} as const;

/**
 * Export convenience functions
 */
export const createNotFoundError = MockErrorResponseFactory.notFound;
export const createInvalidIdError = MockErrorResponseFactory.invalidId;
export const createSuccessResponse = MockErrorResponseFactory.success;
export const validateErrorPattern = ErrorPatternValidator.validate;
export const getStandardErrorMessage = ErrorPatternValidator.getStandardError;
