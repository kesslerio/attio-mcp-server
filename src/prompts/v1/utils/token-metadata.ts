/**
 * Token metadata calculation utilities for MCP prompts
 *
 * Wraps the token counting utility from #775 to provide
 * prompt-specific token awareness features.
 */

import { countTokens } from '@/utils/token-count.js';
import { PromptMessage, TokenMetadata, EmbeddedResource } from '../types.js';

/**
 * Calculate token metadata for a set of prompt messages
 *
 * @param messages - Array of prompt messages
 * @param resources - Optional array of embedded resources
 * @param model - Optional model name for token counting
 * @returns Token metadata with counts and method info
 */
export function calculatePromptTokens(
  messages: PromptMessage[],
  resources?: EmbeddedResource[],
  model?: string
): TokenMetadata {
  let totalTokens = 0;
  let totalChars = 0;
  let totalResourceBytes = 0;

  // Count tokens and chars for each message
  for (const message of messages) {
    if (message.content.type === 'text') {
      const text = message.content.text;
      totalChars += text.length;
      totalTokens += countTokens(text, model);
    } else if (message.content.type === 'image') {
      // Images are counted by data length (base64 encoded)
      const dataSize = message.content.data.length;
      totalChars += dataSize;
      // Rough estimate: 1 token per 4 chars for base64
      totalTokens += Math.ceil(dataSize / 4);
    } else if (message.content.type === 'resource') {
      const resourceText = message.content.resource.text || '';
      totalChars += resourceText.length;
      totalTokens += countTokens(resourceText, model);
    }
  }

  // Count embedded resource tokens
  if (resources && resources.length > 0) {
    for (const resource of resources) {
      const resourceText = resource.resource.text || '';
      const resourceBytes = Buffer.byteLength(resourceText, 'utf8');
      totalResourceBytes += resourceBytes;
      totalTokens += countTokens(resourceText, model);
    }
  }

  return {
    estimated_tokens: totalTokens,
    message_chars: totalChars,
    resource_bytes: totalResourceBytes,
    method: 'tiktoken',
    approx: false, // tiktoken provides deterministic counts
  };
}

/**
 * Calculate tokens for a single text string
 *
 * Helper function for quick token estimates during prompt building
 *
 * @param text - Text to count tokens for
 * @param model - Optional model name
 * @returns Token count
 */
export function estimateTextTokens(text: string, model?: string): number {
  return countTokens(text, model);
}

/**
 * Check if messages exceed a token budget
 *
 * @param messages - Prompt messages to check
 * @param budget - Maximum allowed tokens
 * @param model - Optional model name
 * @returns Whether messages are within budget
 */
export function isWithinTokenBudget(
  messages: PromptMessage[],
  budget: number,
  model?: string
): boolean {
  const metadata = calculatePromptTokens(messages, undefined, model);
  return metadata.estimated_tokens <= budget;
}

/**
 * Format token metadata for logging
 *
 * @param metadata - Token metadata to format
 * @returns Formatted string for logs
 */
export function formatTokenMetadata(metadata: TokenMetadata): string {
  return `${metadata.estimated_tokens} tokens (${metadata.message_chars} chars, ${metadata.resource_bytes} resource bytes) via ${metadata.method}`;
}
