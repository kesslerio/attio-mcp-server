/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from '../../types/attio.js';
// Import consolidated tool configurations from modular files
import {
  companyToolConfigs,
  companyToolDefinitions,
} from '../tool-configs/companies/index.js';
import {
  generalToolConfigs,
  generalToolDefinitions,
} from '../tool-configs/general/index.js';
import {
  listsToolConfigs,
  listsToolDefinitions,
} from '../tool-configs/lists.js';
import {
  peopleToolConfigs,
  peopleToolDefinitions,
} from '../tool-configs/people/index.js';
import {
  recordToolConfigs,
  recordToolDefinitions,
} from '../tool-configs/records/index.js';
import {
  tasksToolConfigs,
  tasksToolDefinitions,
} from '../tool-configs/tasks.js';
// Import universal tool configurations for consolidated operations
import {
  universalToolConfigs,
  universalToolDefinitions,
} from '../tool-configs/universal/index.js';
import type { ToolConfig } from '../tool-types.js';

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
    }
  : {
      // Legacy resource-specific tools (deprecated, use DISABLE_UNIVERSAL_TOOLS=true to enable)
      [ResourceType.COMPANIES]: companyToolConfigs,
      [ResourceType.PEOPLE]: peopleToolConfigs,
      [ResourceType.LISTS]: listsToolConfigs,
      [ResourceType.TASKS]: tasksToolConfigs,
      [ResourceType.RECORDS]: recordToolConfigs,
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
    }
  : {
      // Legacy resource-specific tools (deprecated, use DISABLE_UNIVERSAL_TOOLS=true to enable)
      [ResourceType.COMPANIES]: companyToolDefinitions,
      [ResourceType.PEOPLE]: peopleToolDefinitions,
      [ResourceType.LISTS]: listsToolDefinitions,
      [ResourceType.TASKS]: tasksToolDefinitions,
      [ResourceType.RECORDS]: recordToolDefinitions,
      GENERAL: generalToolDefinitions,
      // Add other resource types as needed
    };

/**
 * Find the tool config for a given tool name
 *
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
export function findToolConfig(toolName: string):
  | {
      resourceType: ResourceType;
      toolConfig: ToolConfig;
      toolType: string;
    }
  | undefined {
  // Debug logging for tool lookup in development
  const debugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG;

  // Debug logging for all tool lookups in development
  if (debugMode) {
    console.error(`[findToolConfig] Looking for tool: ${toolName}`);
  }

  // Search in resource-specific tools first
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    if (!resourceConfig) {
      if (debugMode) {
        console.error(
          `[findToolConfig] No config found for resource type: ${resourceType}`
        );
      }
      continue;
    }

    // For debugging, log all available tools for a resource type
    if (debugMode) {
      const toolTypes = Object.keys(resourceConfig);
      if (toolTypes.includes(toolName.replace(/-/g, ''))) {
        console.error(
          '[findToolConfig] Tool might be found under a different name. Available tool types:',
          toolTypes
        );
      }

      // Specific logging for commonly problematic tools
      const commonProblematicTools = [
        'discover-company-attributes',
        'get-company-basic-info',
      ];
      if (
        commonProblematicTools.includes(toolName) &&
        resourceType === ResourceType.COMPANIES
      ) {
        const toolTypeKey =
          toolName === 'discover-company-attributes'
            ? 'discoverAttributes'
            : 'basicInfo';

        // Use a type-safe way to check for existence
        const hasToolType = Object.keys(resourceConfig).includes(toolTypeKey);
        if (hasToolType) {
          const config =
            resourceConfig[toolTypeKey as keyof typeof resourceConfig];
          console.error(`[findToolConfig] Found ${toolTypeKey} config:`, {
            name: (config as any).name,
            hasHandler: typeof (config as any).handler === 'function',
            hasFormatter: typeof (config as any).formatResult === 'function',
          });
        } else {
          console.warn(
            `[findToolConfig] ${toolTypeKey} not found in ${resourceType} configs!`
          );
        }
      }
    }

    for (const [toolType, config] of Object.entries(resourceConfig)) {
      if (config && config.name === toolName) {
        if (debugMode) {
          console.error(
            `[findToolConfig] Found tool: ${toolName}, type: ${toolType}, resource: ${resourceType}`
          );
        }

        return {
          resourceType: resourceType as ResourceType,
          toolConfig: config as ToolConfig,
          toolType,
        };
      }
    }
  }

  // Search in universal tools (high priority for consolidation)
  const universalConfig = TOOL_CONFIGS.UNIVERSAL;
  if (universalConfig) {
    for (const [toolType, config] of Object.entries(universalConfig)) {
      if (config && config.name === toolName) {
        if (debugMode) {
          console.error(
            `[findToolConfig] Found universal tool: ${toolName}, type: ${toolType}, category: UNIVERSAL`
          );
        }

        return {
          resourceType: 'UNIVERSAL' as any, // Using 'UNIVERSAL' as a special marker
          toolConfig: config as ToolConfig,
          toolType,
        };
      }
    }
  }

  // Search in general tools if not found in resource-specific or universal tools
  const generalConfig = TOOL_CONFIGS.GENERAL;
  if (generalConfig) {
    for (const [toolType, config] of Object.entries(generalConfig)) {
      if (config && config.name === toolName) {
        if (debugMode) {
          console.error(
            `[findToolConfig] Found tool: ${toolName}, type: ${toolType}, category: GENERAL`
          );
        }

        return {
          resourceType: 'GENERAL' as any, // Using 'GENERAL' as a special marker
          toolConfig: config as ToolConfig,
          toolType,
        };
      }
    }
  }

  if (debugMode) {
    console.warn(`[findToolConfig] Tool not found: ${toolName}`);
  }

  return;
}
