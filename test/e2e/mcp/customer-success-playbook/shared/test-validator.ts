/**
 * Test validation utilities for Customer Success Playbook tests
 */
import { ValidationLevel, ValidationResult, ToolResult } from './types.js';

  static validateToolResult(toolName: string, toolResult: ToolResult): ValidationResult {
    const validation: ValidationResult = {
      frameworkSuccess: false,
      apiSuccess: false,
      dataValid: false,
      businessLogicValid: false,
      errorDetails: [],
      warningDetails: []
    };

    // Level 1: Framework execution validation
    if (toolResult.isError) {
      validation.errorDetails.push(`Framework error: ${toolResult.content}`);
      return validation;
    }
    validation.frameworkSuccess = true;

    // Level 2: API response validation
    if (!toolResult.content || toolResult.content.length === 0) {
      validation.errorDetails.push('Empty response content');
      return validation;
    }

    if (!('text' in content)) {
      validation.errorDetails.push('Response content missing text field');
      return validation;
    }

    
    if (schema) {
      // Check for API error patterns
      for (const errorPattern of schema.errorPatterns) {
        if (responseText.includes(errorPattern)) {
          validation.errorDetails.push(`API error detected: ${errorPattern}`);
          
          // Extract HTTP status code if present
          if (statusMatch) {
            if (statusCode >= 400) {
              validation.errorDetails.push(`HTTP ${statusCode} error`);
            }
          }
          
          return validation;
        }
      }
    }
    validation.apiSuccess = true;

    // Level 3: Data structure validation
    let hasValidData = false;
    try {
      // Check for expected data fields in response text
      if (schema) {
        for (const field of schema.expectedFields) {
          if (responseText.toLowerCase().includes(field.toLowerCase())) {
            hasValidData = true;
            break;
          }
        }
      }
      
      // For responses that show records found
      if (recordCountMatch) {
        if (count >= 0) {
          hasValidData = true;
          if (count === 0) {
            validation.warningDetails.push(`No records found (count: ${count})`);
          }
        }
      }

      // Check for successful creation messages
      if (responseText.includes('Successfully created') || responseText.includes('✅')) {
        hasValidData = true;
      }

    } catch (error) {
      validation.errorDetails.push(`Data validation error: ${error}`);
      return validation;
    }

    if (!hasValidData) {
      validation.errorDetails.push('Response does not contain expected data fields');
      return validation;
    }
    validation.dataValid = true;

    // Level 4: Business logic validation
    // For now, we consider business logic valid if data is valid
    // This can be expanded with specific business rules per tool
    validation.businessLogicValid = true;

    return validation;
  }

  static determineValidationLevel(validation: ValidationResult): ValidationLevel {
    if (!validation.frameworkSuccess) {
      return ValidationLevel.FRAMEWORK_ERROR;
    }
    if (!validation.apiSuccess) {
      return ValidationLevel.API_ERROR;
    }
    if (!validation.dataValid) {
      return ValidationLevel.DATA_ERROR;
    }
    if (validation.warningDetails.length > 0) {
      return ValidationLevel.PARTIAL_SUCCESS;
    }
    return ValidationLevel.FULL_SUCCESS;
  }
}