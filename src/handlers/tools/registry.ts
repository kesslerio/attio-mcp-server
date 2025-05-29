/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from '../../types/attio.js';
import { ToolConfig } from '../tool-types.js';

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

/**
 * Consolidated tool configurations from modular files
 */
export const TOOL_CONFIGS = {
  [ResourceType.COMPANIES]: companyToolConfigs,
  [ResourceType.PEOPLE]: peopleToolConfigs,
  [ResourceType.LISTS]: listsToolConfigs,
  [ResourceType.TASKS]: tasksToolConfigs,
  [ResourceType.RECORDS]: recordToolConfigs,
  // Add other resource types as needed
};

/**
 * Consolidated tool definitions from modular files
 */
export const TOOL_DEFINITIONS = {
  [ResourceType.COMPANIES]: companyToolDefinitions,
  [ResourceType.PEOPLE]: peopleToolDefinitions,
  [ResourceType.LISTS]: listsToolDefinitions,
  [ResourceType.TASKS]: tasksToolDefinitions,
  [ResourceType.RECORDS]: recordToolDefinitions,
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
          `[findToolConfig] Tool might be found under a different name. Available tool types:`,
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

  if (debugMode) {
    console.warn(`[findToolConfig] Tool not found: ${toolName}`);
  }

  return undefined;
}
