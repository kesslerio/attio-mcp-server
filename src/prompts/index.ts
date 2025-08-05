/**
 * MCP Prompts module
 *
 * This module implements the MCP Prompts feature for the Attio MCP server,
 * providing pre-defined templates for common Attio operations.
 */

// Export handlers
export {
  executePrompt,
  getPromptDetails,
  listPromptCategories,
  listPrompts,
} from './handlers.js';
// Export template utilities
// Export all templates
export {
  allPrompts,
  getAllCategories,
  getAllPrompts,
  getPromptById,
  getPromptsByCategory,
} from './templates/index.js';
// Export types
export * from './types.js';
