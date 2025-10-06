/**
 * Validation and budget enforcement utilities for v1 prompts
 *
 * Provides argument validation using Zod schemas and token budget enforcement
 * per the specifications in issue #774.
 */

import { z } from 'zod';
import {
  PromptArgument,
  ValidationError,
  BudgetCheckResult,
  PromptMessage,
} from '../types.js';
import { calculatePromptTokens } from './token-metadata.js';
import { getPromptTokenBudget } from '../constants.js';

/**
 * Validate arguments against their Zod schemas
 *
 * @param args - User-provided arguments
 * @param argumentDefs - Argument definitions with schemas
 * @returns Validation result with validated data or errors
 */
export function validateArguments(
  args: Record<string, unknown>,
  argumentDefs: PromptArgument[]
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const validatedData: Record<string, unknown> = {};

  // Check required arguments
  for (const argDef of argumentDefs) {
    const value = args[argDef.name];

    // Check if required argument is missing
    if (argDef.required && (value === undefined || value === null)) {
      errors.push({
        field: argDef.name,
        message: `Missing required argument: ${argDef.name}`,
        code: 'REQUIRED_ARG_MISSING',
      });
      continue;
    }

    // Apply default if value is missing and default exists
    const valueToValidate = value ?? argDef.default;

    // Skip validation if value is still undefined/null after default
    if (valueToValidate === undefined || valueToValidate === null) {
      continue;
    }

    // Validate using Zod schema
    const result = argDef.schema.safeParse(valueToValidate);

    if (!result.success) {
      errors.push({
        field: argDef.name,
        message: result.error.errors[0]?.message || 'Invalid value',
        code: 'VALIDATION_FAILED',
      });
    } else {
      validatedData[argDef.name] = result.data;
    }
  }

  // Check for unknown arguments (optional warning, not error)
  const knownArgNames = new Set(argumentDefs.map((a) => a.name));
  for (const key of Object.keys(args)) {
    if (!knownArgNames.has(key)) {
      errors.push({
        field: key,
        message: `Unknown argument: ${key}`,
        code: 'UNKNOWN_ARG',
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validatedData };
}

/**
 * Check if prompt messages are within token budget
 *
 * @param promptName - Name of the prompt for budget lookup
 * @param messages - Generated prompt messages
 * @param model - Optional model name for token counting
 * @returns Budget check result
 */
export async function checkTokenBudget(
  promptName: string,
  messages: PromptMessage[],
  model?: string
): Promise<BudgetCheckResult> {
  const budgetLimit = getPromptTokenBudget(promptName);
  const metadata = await calculatePromptTokens(messages, undefined, model);
  const estimatedTokens = metadata.estimated_tokens;

  const withinBudget = estimatedTokens <= budgetLimit;

  return {
    withinBudget,
    estimatedTokens,
    budgetLimit,
    exceededBy: withinBudget ? undefined : estimatedTokens - budgetLimit,
  };
}

/**
 * Create a JSON-RPC error response for validation failures
 *
 * Per MCP spec, invalid parameters should return error code -32602
 *
 * @param errors - Validation errors
 * @returns JSON-RPC error object
 */
export function createValidationError(errors: ValidationError[]): {
  code: number;
  message: string;
  data?: {
    errors: ValidationError[];
  };
} {
  const errorMessages = errors
    .map((e) => `${e.field}: ${e.message}`)
    .join(', ');

  return {
    code: -32602, // Invalid params per JSON-RPC 2.0 spec
    message: `Invalid parameters: ${errorMessages}`,
    data: {
      errors,
    },
  };
}

/**
 * Create a JSON-RPC error response for budget exceeded
 *
 * @param budgetResult - Budget check result
 * @returns JSON-RPC error object
 */
export function createBudgetExceededError(budgetResult: BudgetCheckResult): {
  code: number;
  message: string;
  data?: {
    estimatedTokens: number;
    budgetLimit: number;
    exceededBy: number;
  };
} {
  return {
    code: -32602, // Invalid params (prompt too large)
    message: `Prompt exceeds token budget: ${budgetResult.estimatedTokens} tokens (limit: ${budgetResult.budgetLimit})`,
    data: {
      estimatedTokens: budgetResult.estimatedTokens,
      budgetLimit: budgetResult.budgetLimit,
      exceededBy: budgetResult.exceededBy || 0,
    },
  };
}

/**
 * Apply default values to arguments
 *
 * @param args - User-provided arguments
 * @param argumentDefs - Argument definitions with defaults
 * @returns Arguments with defaults applied
 */
export function applyDefaults(
  args: Record<string, unknown>,
  argumentDefs: PromptArgument[]
): Record<string, unknown> {
  const result = { ...args };

  for (const argDef of argumentDefs) {
    if (
      (result[argDef.name] === undefined || result[argDef.name] === null) &&
      argDef.default !== undefined
    ) {
      result[argDef.name] = argDef.default;
    }
  }

  return result;
}
