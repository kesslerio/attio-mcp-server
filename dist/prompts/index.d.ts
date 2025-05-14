/**
 * MCP Prompts module
 *
 * This module implements the MCP Prompts feature for the Attio MCP server,
 * providing pre-defined templates for common Attio operations.
 */
export * from './types.js';
export { getAllPrompts, getPromptsByCategory, getPromptById, getAllCategories } from './templates/index.js';
export { listPrompts, listPromptCategories, getPromptDetails, executePrompt } from './handlers.js';
export { allPrompts } from './templates/index.js';
//# sourceMappingURL=index.d.ts.map