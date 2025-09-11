/**
 * Library entrypoint for Attio MCP Server
 * 
 * This file exports reusable components for import by other modules.
 * It contains NO side effects, CLI argument parsing, or process.exit() calls.
 * This ensures it's safe to import from Smithery's metadata extraction process.
 */

// Export the main server creation function for use by CLI and Smithery
export { createServer } from './server/createServer.js';

// Export configuration schema for external tools
export { configSchema } from './smithery.js';
