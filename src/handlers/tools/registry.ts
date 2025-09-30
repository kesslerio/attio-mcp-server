/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from '../../types/attio.js';
import { ToolConfig } from '../tool-types.js';
import { createScopedLogger } from '../../utils/logger.js';
import { isToolAllowed } from '../../config/tool-mode.js';
import { resolveToolName } from '@/config/tool-aliases.js';

// Type for return values that can include special resource markers
type ToolConfigResult = {
  resourceType: ResourceType | 'UNIVERSAL' | 'GENERAL';
  toolConfig: ToolConfig;
  toolType: string;
};

// Import consolidated tool configurations from modular files
import {
  companyToolConfigs,
  companyToolDefinitions,
} from '../tool-configs/companies/index.js';
import {
  peopleToolConfigs,
  peopleToolDefinitions,
} from '../tool-configs/people/index.js';
import {
  dealToolConfigs,
  dealToolDefinitions,
} from '../tool-configs/deals/index.js';
import {
  listsToolConfigs,
  listsToolDefinitions,
} from '../tool-configs/lists.js';
import {
  tasksToolConfigs,
  tasksToolDefinitions,
} from '../tool-configs/tasks.js';
import {
  recordToolConfigs,
  recordToolDefinitions,
} from '../tool-configs/records/index.js';
import {
  generalToolConfigs,
  generalToolDefinitions,
} from '../tool-configs/general/index.js';
import {
  workspaceMembersToolConfigs,
  workspaceMembersToolDefinitions,
} from '../tool-configs/workspace-members.js';

// Import universal tool configurations for consolidated operations
import {
  universalToolConfigs,
  universalToolDefinitions,
} from '../tool-configs/universal/index.js';

/**
 * Universal tool consolidation (Issue #352): Only expose universal tools
 * This replaces the legacy resource-specific tools with consolidated universal tools
 * that can handle all resource types (companies, people, records, tasks) through
 * a single, consistent interface.
 *
 * Legacy tools are kept for backward compatibility but not exposed by default.
 */
const USE_UNIVERSAL_TOOLS_ONLY = process.env.DISABLE_UNIVERSAL_TOOLS !== 'true';

/**
 * Consolidated tool configurations from modular files
 */
export const TOOL_CONFIGS = USE_UNIVERSAL_TOOLS_ONLY
  ? {
      // Universal tools for consolidated operations (Issue #352)
      UNIVERSAL: universalToolConfigs,
      // Lists are relationship containers - always expose them (Issue #470)
      [ResourceType.LISTS]: listsToolConfigs,
      // Workspace members for user discovery (Issue #684)
      [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolConfigs,
    }
  : {
      // Legacy resource-specific tools (deprecated, use DISABLE_UNIVERSAL_TOOLS=true to enable)
      [ResourceType.COMPANIES]: companyToolConfigs,
      [ResourceType.PEOPLE]: peopleToolConfigs,
      [ResourceType.DEALS]: dealToolConfigs,
      [ResourceType.LISTS]: listsToolConfigs,
      [ResourceType.TASKS]: tasksToolConfigs,
      [ResourceType.RECORDS]: recordToolConfigs,
      [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolConfigs,
      GENERAL: generalToolConfigs,
      // Add other resource types as needed
    };

/**
 * Consolidated tool definitions from modular files
 */
export const TOOL_DEFINITIONS = USE_UNIVERSAL_TOOLS_ONLY
  ? {
      // Universal tools for consolidated operations (Issue #352)
      UNIVERSAL: universalToolDefinitions,
      // Lists are relationship containers - always expose them (Issue #470)
      [ResourceType.LISTS]: listsToolDefinitions,
      // Workspace members for user discovery (Issue #684)
      [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolDefinitions,
    }
  : {
      // Legacy resource-specific tools (deprecated, use DISABLE_UNIVERSAL_TOOLS=true to enable)
      [ResourceType.COMPANIES]: companyToolDefinitions,
      [ResourceType.PEOPLE]: peopleToolDefinitions,
      [ResourceType.DEALS]: dealToolDefinitions,
      [ResourceType.LISTS]: listsToolDefinitions,
      [ResourceType.TASKS]: tasksToolDefinitions,
      [ResourceType.RECORDS]: recordToolDefinitions,
      [ResourceType.WORKSPACE_MEMBERS]: workspaceMembersToolDefinitions,
      GENERAL: generalToolDefinitions,
      // Add other resource types as needed
    };

/**
 * Find the tool config for a given tool name
 *
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
export function findToolConfig(toolName: string): ToolConfigResult | undefined {
  // Debug logging for tool lookup in development
  const debugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG;

  // Debug logging for all tool lookups in development
  const log = createScopedLogger('tools.registry', 'findToolConfig');
  if (debugMode) {
    log.debug(`Looking for tool: ${toolName}`);
  }

  const { name: canonicalToolName } = resolveToolName(toolName);

  // Search in resource-specific tools first
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    if (!resourceConfig) {
      if (debugMode) {
        log.debug(`No config found for resource type: ${resourceType}`);
      }
      continue;
    }

    // For debugging, log all available tools for a resource type
    if (debugMode) {
      const toolTypes = Object.keys(resourceConfig);
      if (toolTypes.includes(canonicalToolName.replace(/-/g, ''))) {
        log.info(
          'Tool might be found under a different name. Available tool types',
          { toolTypes }
        );
      }

      // Specific logging for commonly problematic tools
      const commonProblematicTools = [
        'discover-company-attributes',
        'get-company-basic-info',
      ];
      if (
        commonProblematicTools.includes(canonicalToolName) &&
        resourceType === ResourceType.COMPANIES
      ) {
        const toolTypeKey =
          canonicalToolName === 'discover-company-attributes'
            ? 'discoverAttributes'
            : 'basicInfo';

        // Use a type-safe way to check for existence
        const hasToolType = Object.keys(resourceConfig).includes(toolTypeKey);
        if (hasToolType) {
          const config =
            resourceConfig[toolTypeKey as keyof typeof resourceConfig];
          log.info('Found config for legacy mapping', {
            toolTypeKey,
            name: (config as ToolConfig).name,
            hasHandler: typeof (config as ToolConfig).handler === 'function',
            hasFormatter:
              typeof (config as ToolConfig).formatResult === 'function',
          });
        } else {
          log.warn(`${toolTypeKey} not found in ${resourceType} configs`);
        }
      }
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

        if (isToolAllowed(canonicalToolName)) {
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

        if (isToolAllowed(canonicalToolName)) {
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

  // Search in general tools if not found in resource-specific or universal tools
  const generalConfig = TOOL_CONFIGS.GENERAL;
  if (generalConfig) {
    for (const [toolType, config] of Object.entries(generalConfig)) {
      if (config && config.name === canonicalToolName) {
        if (debugMode) {
          log.info('Found general tool', {
            toolName: canonicalToolName,
            toolType,
          });
        }

        if (isToolAllowed(canonicalToolName)) {
          return {
            resourceType: 'GENERAL' as const,
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
