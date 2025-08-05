/**
 * Validation utilities for tool execution
 *
 * Provides parameter validation and resource ID validation for tool requests
 */

import { ResourceType } from '../../../types/attio.js';
import type {
  AttributeValidationParams,
  ValidationResult,
} from '../../../types/tool-types.js';
import { createErrorResult } from '../../../utils/error-handler.js';

/**
 * Validates attribute parameters for company operations
 *
 * @param attributes - The attributes object to validate (key-value pairs of company attributes)
 * @returns True if validation passes, or an error message string if validation fails
 */
export function validateAttributes(
  attributes: AttributeValidationParams | null | undefined
): ValidationResult {
  if (!attributes) {
    return 'Attributes parameter is required';
  }

  if (typeof attributes !== 'object' || Array.isArray(attributes)) {
    return 'Attributes parameter must be an object';
  }

  if (Object.keys(attributes).length === 0) {
    return 'Attributes parameter cannot be empty';
  }

  return true;
}

/**
 * Helper function to validate and extract resource ID based on resource type
 *
 * @param resourceType - The type of resource (companies, people, etc.)
 * @param args - The request arguments containing the ID
 * @param apiPath - The API path for error reporting
 * @returns The validated ID or an error response
 */
export function validateResourceId(
  resourceType: ResourceType,
  args: any,
  apiPath: string
): string | { error: ReturnType<typeof createErrorResult> } {
  const idParamName =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = args?.[idParamName] as string;

  if (!id) {
    return {
      error: createErrorResult(
        new Error(`${idParamName} parameter is required`),
        apiPath,
        'GET',
        {
          status: 400,
          message: `Missing required parameter: ${idParamName}`,
        }
      ),
    };
  }

  return id;
}
