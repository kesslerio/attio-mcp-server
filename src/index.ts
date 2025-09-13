/**
 * Library entrypoint for Attio MCP Server
 *
 * This file exports reusable components for import by other modules.
 * It contains NO side effects, CLI argument parsing, or process.exit() calls.
 * This ensures it's safe to import from Smithery's metadata extraction process.
 */

// Guard to prevent direct execution (forces use of CLI entry point)
if (import.meta.url === `file://${process.argv[1]}`) {
  const { error } = await import('./utils/logger.js');
  error(
    'library-entry',
    'This is a library entry point. Use the CLI instead',
    undefined,
    {
      suggestion: 'node dist/cli.js or attio-mcp (if installed globally)',
    }
  );
  process.exit(1);
}

// Export the main server creation function for use by CLI and Smithery
export { createServer } from './server/createServer.js';

// Export configuration schema for external tools
export { configSchema } from './smithery.js';
