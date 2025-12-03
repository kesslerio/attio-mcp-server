/**
 * Tool registry for Attio MCP - edge-compatible
 *
 * Provides a configuration-based approach to tool registration
 * without environment variable dependencies.
 */

import type { HttpClient } from '../api/http-client.js';
import type { ToolResult, ToolRegistryConfig } from '../types/index.js';
import {
  coreToolDefinitions,
  getToolDefinitions,
  type ToolDefinition,
} from './definitions.js';
import { getToolHandler } from './handlers.js';

/**
 * Tool registry instance
 */
export interface ToolRegistry {
  /** Get all available tool definitions */
  getDefinitions(): ToolDefinition[];

  /** Get a specific tool definition by name */
  getDefinition(name: string): ToolDefinition | undefined;

  /** Check if a tool is available */
  hasTool(name: string): boolean;

  /** Execute a tool with the given parameters */
  executeTool(
    client: HttpClient,
    name: string,
    params: Record<string, unknown>
  ): Promise<ToolResult>;

  /** Get the list of available tool names */
  getToolNames(): string[];
}

/**
 * Tools that are read-only (safe for 'search' mode)
 */
const READ_ONLY_TOOLS = new Set([
  'aaa-health-check',
  'records_search',
  'records_get_details',
  'records_discover_attributes',
  'list-notes',
]);

/**
 * Create a tool registry with the given configuration
 *
 * @param config - Registry configuration
 * @returns Tool registry instance
 *
 * @example
 * ```typescript
 * // Full mode - all tools available
 * const registry = createToolRegistry({ mode: 'full' });
 *
 * // Search mode - read-only tools only
 * const registry = createToolRegistry({ mode: 'search' });
 *
 * // Custom tools filter
 * const registry = createToolRegistry({
 *   tools: ['records_search', 'records_get_details']
 * });
 * ```
 */
export function createToolRegistry(
  config: ToolRegistryConfig = {}
): ToolRegistry {
  const { tools: allowedTools, mode = 'full' } = config;

  // Determine which tools are available based on mode and filter
  function isToolAllowed(toolName: string): boolean {
    // If specific tools are specified, only allow those
    if (allowedTools && allowedTools.length > 0) {
      return allowedTools.includes(toolName);
    }

    // In search mode, only allow read-only tools
    if (mode === 'search') {
      return READ_ONLY_TOOLS.has(toolName);
    }

    // In full mode, all tools are allowed
    return true;
  }

  // Get filtered definitions
  function getFilteredDefinitions(): ToolDefinition[] {
    return getToolDefinitions().filter((def) => isToolAllowed(def.name));
  }

  return {
    getDefinitions(): ToolDefinition[] {
      return getFilteredDefinitions();
    },

    getDefinition(name: string): ToolDefinition | undefined {
      if (!isToolAllowed(name)) {
        return undefined;
      }
      return coreToolDefinitions[name];
    },

    hasTool(name: string): boolean {
      return isToolAllowed(name) && name in coreToolDefinitions;
    },

    async executeTool(
      client: HttpClient,
      name: string,
      params: Record<string, unknown>
    ): Promise<ToolResult> {
      if (!isToolAllowed(name)) {
        return {
          content: [
            { type: 'text', text: `Error: Tool '${name}' is not available` },
          ],
          isError: true,
        };
      }

      const handler = getToolHandler(name);
      if (!handler) {
        return {
          content: [{ type: 'text', text: `Error: Unknown tool '${name}'` }],
          isError: true,
        };
      }

      try {
        return await handler(client, params);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Tool execution failed';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    },

    getToolNames(): string[] {
      return getFilteredDefinitions().map((def) => def.name);
    },
  };
}

/**
 * Default tool registry with full mode
 */
export const defaultRegistry = createToolRegistry({ mode: 'full' });
