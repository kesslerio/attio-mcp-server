/**
 * Error examples utility
 *
 * Provides helpful examples for common error scenarios to enhance error messages
 */

import { ErrorType } from './error-handler.js';
import {
  generateFieldSuggestionMessage,
  generateEnumSuggestionMessage,
  generateReadOnlyFieldMessage,
  generateResourceTypeSuggestionMessage,
  VALID_RESOURCE_TYPES,
} from './field-suggestions.js';
import { UnknownObject } from './types/common.js';

interface ErrorExample {
  description: string;
  example: UnknownObject;
  tip?: string;
}

/**
 * Get helpful examples based on error context
 */
export function getErrorExamples(
  errorType: ErrorType,
  context: {
    toolName?: string;
    paramName?: string;
    expectedType?: string;
    actualValue?: unknown;
    path?: string;
  }
): ErrorExample[] {
  const examples: ErrorExample[] = [];

  switch (errorType) {
    case ErrorType.PARAMETER_ERROR:
      if (context.paramName === 'filters') {
        examples.push({
          description: 'Correct filters format',
          example: {
            filters: {
              filters: [
                {
                  attribute: { slug: 'name' },
                  condition: 'contains',
                  value: 'Company Inc',
                },
              ],
            },
          },
          tip: 'The filters parameter must contain a "filters" property with an array of filter conditions',
        });
      } else if (
        context.paramName === 'updates' ||
        context.paramName === 'attributes'
      ) {
        examples.push({
          description: 'Correct attributes format',
          example: {
            name: 'New Company Name',
            lead_score: 90,
            team_size: 50,
            website: 'https://example.com',
          },
          tip: 'Provide a flat object with field names as keys and values as the new values',
        });
      } else if (context.paramName?.includes('Id')) {
        examples.push({
          description: 'Correct ID format',
          example: {
            [context.paramName]: 'rec_1234567890abcdef',
          },
          tip: 'IDs should be the full record ID from Attio, not a numeric value',
        });
      }
      break;

    case ErrorType.VALIDATION_ERROR:
      if (
        context.expectedType === 'number' &&
        typeof context.actualValue === 'string'
      ) {
        examples.push({
          description:
            'String values for numeric fields are automatically converted',
          example: {
            lead_score: '90', // Will be converted to 90
            team_size: '50', // Will be converted to 50
          },
          tip: 'You can provide numeric values as strings - they will be converted automatically',
        });
      } else if (context.expectedType === 'boolean') {
        examples.push({
          description: 'Boolean field formats',
          example: {
            is_customer: true,
            active: 'true', // String 'true' is accepted
            verified: 1, // 1 is accepted as true
          },
          tip: 'Boolean fields accept: true/false, "true"/"false", 1/0',
        });
      }
      break;

    case ErrorType.FORMAT_ERROR:
      if (context.toolName?.includes('note')) {
        examples.push({
          description: 'Create note requires both title and content',
          example: {
            title: 'Meeting Notes',
            content: 'Discussed Q4 strategy and budget planning',
          },
          tip: 'Both title and content are required when creating notes',
        });
      }
      break;

    default:
      // Generic helpful examples
      if (context.toolName?.includes('update')) {
        examples.push({
          description: 'Update operations accept multiple parameter names',
          example: {
            // Option 1: Resource-specific ID
            companyId: 'rec_1234567890abcdef',
            // Option 2: Generic recordId
            recordId: 'rec_1234567890abcdef',
          },
          tip: 'You can use either resource-specific IDs (companyId, personId) or the generic recordId',
        });
      }
  }

  return examples;
}

/**
 * Enhance an error message with helpful examples and field suggestions
 */
export function enhanceErrorMessage(
  originalMessage: string,
  errorType: ErrorType,
  context: {
    toolName?: string;
    paramName?: string;
    expectedType?: string;
    actualValue?: unknown;
    path?: string;
    fieldName?: string;
    validFields?: string[];
    validValues?: string[];
    resourceType?: string;
    isReadOnly?: boolean;
    operation?: 'create' | 'update';
  }
): string {
  let enhancedMessage = originalMessage;

  // Apply field name suggestions if we have validation errors
  if (
    errorType === ErrorType.VALIDATION_ERROR ||
    errorType === ErrorType.PARAMETER_ERROR
  ) {
    // Check for invalid field name scenarios
    if (
      context.fieldName &&
      context.validFields &&
      context.validFields.length > 0
    ) {
      if (!context.validFields.includes(context.fieldName)) {
        enhancedMessage = generateFieldSuggestionMessage(
          context.fieldName,
          context.validFields,
          context.resourceType
        );
      } else if (context.isReadOnly) {
        enhancedMessage = generateReadOnlyFieldMessage(
          context.fieldName,
          context.operation
        );
      }
    }

    // Check for invalid enum values
    if (
      context.fieldName &&
      context.validValues &&
      context.validValues.length > 0
    ) {
      if (context.actualValue !== undefined) {
        const valueStr = String(context.actualValue);
        if (!context.validValues.includes(valueStr)) {
          enhancedMessage = generateEnumSuggestionMessage(
            context.actualValue,
            context.validValues,
            context.fieldName
          );
        }
      }
    }

    // Check for invalid resource types
    if (
      context.resourceType &&
      !VALID_RESOURCE_TYPES.includes(context.resourceType)
    ) {
      enhancedMessage = generateResourceTypeSuggestionMessage(
        context.resourceType,
        VALID_RESOURCE_TYPES
      );
    }
  }

  // Add examples to the enhanced message
  const examples = getErrorExamples(errorType, context);

  if (examples.length > 0) {
    examples.forEach((example) => {
      enhancedMessage += `\n\n${example.description}:`;
      enhancedMessage += `\n${JSON.stringify(example.example, null, 2)}`;
      if (example.tip) {
        enhancedMessage += `\n\nTIP: ${example.tip}`;
      }
    });
  }

  return enhancedMessage;
}
