/**
 * Tool dispatcher module - handles tool execution dispatch and routing
 *
 * This module re-exports from the modular dispatcher implementation for backward compatibility.
 * The actual implementation has been broken down into focused modules under ./dispatcher/
 */

// Re-export the main executeToolRequest function from the modular implementation
export { executeToolRequest } from './dispatcher/core.js';
export { formatSuccessResponse } from './dispatcher/formatting.js';
// Re-export utility functions from the modular implementation for backward compatibility
export { logToolError, logToolRequest } from './dispatcher/logging.js';
export {
  validateAttributes,
  validateResourceId,
} from './dispatcher/validation.js';

// Note: Legacy implementation placeholders below will be moved to dedicated operation modules in Phase 2
// These are temporarily retained for any unimplemented operations until full modularization is complete
