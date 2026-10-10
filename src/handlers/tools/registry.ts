/**
 * Tool registry module - handles tool registration mechanics and discovery
 *
 * The v2 registration surface is the only registration surface: universal
 * operations, list containers, and workspace members. The deprecated
 * `DISABLE_UNIVERSAL_TOOLS` branch and its resource-specific tool configs were
 * retired with the v2 migration; no environment variable restores the legacy
 * surface. Names that only existed there are absent from discovery and resolve
 * to nothing, while supported prior-default names keep resolving through the
 * call-only migration aliases in `@/config/tool-aliases.js`.
 */
import { ResourceType } from '@/types/attio.js';
import { ToolConfig } from '@/handlers/tool-types.js';
import { createScopedLogger } from '@/utils/logger.js';
import { isToolAllowed } from '@/config/tool-mode.js';
import { resolveToolName } from '@/config/tool-aliases.js';

// Type for return values that can include special resource markers
type ToolConfigResult = {
  resourceType: ResourceType | 'UNIVERSAL';
  toolConfig: ToolConfig;
  toolType: string;
};

/**
 * Registered definitions arrive either as a list or as a toolType-keyed map.
 * The protocol-facing shape is validated at the discovery boundary, so the
 * registry stores it structurally instead of asserting a handler shape.
 */
type RegisteredToolDefinition = Record<string, unknown>;
export type RegisteredToolDefinitions =
  | RegisteredToolDefinition[]
  | Record<string, RegisteredToolDefinition>;

// Import consolidated tool configurations from modular files
import {
  listsToolConfigs,
  listsToolDefinitions,
} from '@/handlers/tool-configs/lists.js';
import {
  workspaceMembersToolConfigs,
  workspaceMembersToolDefinitions,
} from '@/handlers/tool-configs/workspace-members.js';

// Import universal tool configurations for consolidated operations
import {
  universalToolConfigs,
  universalToolDefinitions,
} from '@/handlers/tool-configs/universal/index.js';

// The v2 surface is the only registration surface, so the retired legacy flag
// cannot restore anything. Warn once when it is still set so an operator sees
// that the setting no longer changes the catalogue. Gate the warning against
// test runs to keep module-load output quiet.
if (
  process.env.DISABLE_UNIVERSAL_TOOLS === 'true' &&
  process.env.NODE_ENV !== 'test'
) {
  createScopedLogger('tools', 'registry').warn(
    'DISABLE_UNIVERSAL_TOOLS is obsolete and has no effect: the v2 tool surface is the only registered surface. See docs/MIGRATION-GUIDE.md'
  );
}

/**
 * Consolidated tool configurations.
 *
 * Universal tools consolidate every record-shaped resource (companies, people,
 * deals, records, tasks, custom objects) behind resource-first names, so the
 * legacy per-resource configs are no longer registered (Issue #352
 * consolidation, finalized by the v2 migration). Lists are relationship
 * containers and stay exposed independently (Issue #470); workspace members
 * stay exposed for user discovery (Issue #684).
 */
export const TOOL_CONFIGS: Record<string, Record<string, ToolConfig>> = {
  // Universal tools for consolidated operations (Issue #352)
  UNIVERSAL: universalToolConfigs,
  // Lists are relationship containers - always expose them (Issue #470)
  [ResourceType.LISTS]: listsToolConfigs,
  // Workspace members for user discovery (Issue #684)
  [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolConfigs,
};

/**
 * Consolidated tool definitions from modular files
 */
export const TOOL_DEFINITIONS: Record<string, RegisteredToolDefinitions> = {
  // Universal tools for consolidated operations (Issue #352)
  UNIVERSAL: universalToolDefinitions,
  // Lists are relationship containers - always expose them (Issue #470)
  [ResourceType.LISTS]: listsToolDefinitions,
  // Workspace members for user discovery (Issue #684)
  [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolDefinitions,
};

/**
 * Find the tool config for a given tool name
 *
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
export function findToolConfig(
  toolName: string,
  options: { enforceMode?: boolean } = {}
): ToolConfigResult | undefined {
  // Debug logging for tool lookup in development
  const debugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG;

  // Debug logging for all tool lookups in development
  const log = createScopedLogger('tools.registry', 'findToolConfig');
  if (debugMode) {
    log.debug(`Looking for tool: ${toolName}`);
  }

  const { name: canonicalToolName } = resolveToolName(toolName);

  // Search resource-scoped registrations that survived the v2 migration.
  // Resource types with no registered configs resolve to nothing, so a
  // legacy-only name can never reach a handler.
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    if (!resourceConfig) {
      if (debugMode) {
        log.debug(`No config found for resource type: ${resourceType}`);
      }
      continue;
    }

    if (debugMode) {
      const toolTypes = Object.keys(resourceConfig);
      log.debug('Searching resource registrations', {
        resourceType,
        toolTypeCount: toolTypes.length,
      });
    }

    for (const [toolType, config] of Object.entries(resourceConfig)) {
      if (config && config.name === canonicalToolName) {
        if (debugMode) {
          log.info('Found tool in resource config', {
            toolName: canonicalToolName,
            toolType,
            resourceType,
          });
        }

        if (options.enforceMode === false || isToolAllowed(canonicalToolName)) {
          return {
            resourceType: resourceType as ResourceType,
            toolConfig: config as ToolConfig,
            toolType,
          };
        }
        return undefined;
      }
    }
  }

  // Search in universal tools (high priority for consolidation)
  const universalConfig = TOOL_CONFIGS.UNIVERSAL;
  if (universalConfig) {
    for (const [toolType, config] of Object.entries(universalConfig)) {
      if (config && config.name === canonicalToolName) {
        if (debugMode) {
          log.info('Found universal tool', {
            toolName: canonicalToolName,
            toolType,
          });
        }

        if (options.enforceMode === false || isToolAllowed(canonicalToolName)) {
          return {
            resourceType: 'UNIVERSAL' as const,
            toolConfig: config as ToolConfig,
            toolType,
          };
        }
        return undefined;
      }
    }
  }

  if (debugMode) {
    log.warn('Tool not found', { toolName: canonicalToolName });
  }

  return undefined;
}
