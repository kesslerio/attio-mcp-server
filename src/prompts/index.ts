/**
 * MCP Prompts module
 *
 * This module implements the MCP Prompts feature for the Attio MCP server,
 * providing pre-defined templates for common Attio operations.
 */

// Export types
export * from './types.js';

// Export template utilities
export {
  getAllPrompts,
  getPromptsByCategory,
  getPromptById,
  getAllCategories,
} from './templates/index.js';

// Export handlers
export {
  listPrompts,
  listPromptCategories,
  getPromptDetails,
  executePrompt,
} from './handlers.js';

// Export all templates
export { allPrompts } from './templates/index.js';
