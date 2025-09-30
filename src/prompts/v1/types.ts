/**
 * Type definitions for MCP v1 Prompts
 *
 * These types align with the Model Context Protocol specification for prompts
 * and extend them with token awareness features from issue #775.
 */

import { z } from 'zod';

/**
 * MCP PromptMessage types
 * Aligned with @modelcontextprotocol/sdk types
 */
export type PromptRole = 'user' | 'assistant';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface EmbeddedResource {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

export type PromptContent = TextContent | ImageContent | EmbeddedResource;

export interface PromptMessage {
  role: PromptRole;
  content: PromptContent;
}

/**
 * Token metadata for prompt responses
 * Provides token counting information when dev mode is enabled
 */
export interface TokenMetadata {
  /** Total estimated tokens for the prompt */
  estimated_tokens: number;
  /** Total character count across all messages */
  message_chars: number;
  /** Total bytes for embedded resources */
  resource_bytes: number;
  /** Counting method used */
  method: 'tiktoken' | 'estimate';
  /** Whether the count is approximate */
  approx: boolean;
}

/**
 * Argument definition for a prompt parameter
 */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Human-readable description (≤80 chars per spec) */
  description: string;
  /** Whether this argument is required */
  required: boolean;
  /** Zod schema for validation */
  schema: z.ZodTypeAny;
  /** Default value if not provided */
  default?: unknown;
}

/**
 * Prompt metadata for discovery
 */
export interface PromptMetadata {
  /** Unique prompt identifier (e.g., "people_search.v1") */
  name: string;
  /** Human-readable title */
  title: string;
  /** Short description (≤140 chars per spec) */
  description: string;
  /** Category for grouping */
  category: 'search' | 'activity' | 'workflow' | 'analysis' | 'general';
  /** Prompt version */
  version: string;
}

/**
 * Complete prompt definition
 */
export interface PromptV1Definition {
  /** Prompt metadata */
  metadata: PromptMetadata;
  /** Argument definitions with Zod schemas */
  arguments: PromptArgument[];
  /** Function to build prompt messages from validated arguments */
  buildMessages: (args: Record<string, unknown>) => PromptMessage[];
  /** Optional: expected token budget for this prompt */
  tokenBudget?: number;
}

/**
 * Result structure for prompts/get endpoint with optional dev metadata
 */
export interface GetPromptV1Result {
  /** Description of the prompt */
  description?: string;
  /** Array of prompt messages */
  messages: PromptMessage[];
  /** Optional dev metadata (when ?dev=true) */
  _meta?: TokenMetadata;
}

/**
 * Universal argument schemas for read prompts
 */
export const UniversalReadArgs = {
  format: z
    .enum(['table', 'json', 'ids'])
    .optional()
    .default('table')
    .describe(
      'Output format: table (Markdown), json (structured array), or ids (comma-separated)'
    ),

  fields_preset: z
    .enum(['sales_short', 'full'])
    .optional()
    .default('sales_short')
    .describe(
      'Field verbosity: sales_short (minimal, token-efficient) or full (all fields)'
    ),

  verbosity: z
    .enum(['brief', 'normal'])
    .optional()
    .default('brief')
    .describe('Response detail level: brief (concise) or normal (detailed)'),
};

/**
 * Universal argument for write prompts
 */
export const DryRunArg = z
  .boolean()
  .optional()
  .default(false)
  .describe('If true, only propose tool calls without executing writes');

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Budget enforcement result
 */
export interface BudgetCheckResult {
  withinBudget: boolean;
  estimatedTokens: number;
  budgetLimit: number;
  exceededBy?: number;
}
