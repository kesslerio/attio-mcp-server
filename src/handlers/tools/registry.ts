/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from "../../types/attio.js";
import { ToolConfig } from "../tool-types.js";

// Import consolidated tool configurations from modular files
import {
  companyToolConfigs,
  companyToolDefinitions
} from "../tool-configs/companies/index.js";
import {
  peopleToolConfigs,
  peopleToolDefinitions
} from "../tool-configs/people.js";
import {
  listsToolConfigs,
  listsToolDefinitions
} from "../tool-configs/lists.js";
import {
  recordToolConfigs,
  recordToolDefinitions
} from "../tool-configs/records.js";

/**
 * Consolidated tool configurations from modular files
 */
export const TOOL_CONFIGS = {
  [ResourceType.COMPANIES]: companyToolConfigs,
  [ResourceType.PEOPLE]: peopleToolConfigs,
  [ResourceType.LISTS]: listsToolConfigs,
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
  [ResourceType.RECORDS]: recordToolDefinitions,
  // Add other resource types as needed
};

/**
 * Find the tool config for a given tool name
 * 
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
export function findToolConfig(toolName: string): { 
  resourceType: ResourceType; 
  toolConfig: ToolConfig; 
  toolType: string;
} | undefined {
  // Debug logging for tool lookup in development
  const debugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG;
  
  // Special case for debugging issues with discover-company-attributes
  if (toolName === 'discover-company-attributes' && debugMode) {
    console.log('[findToolConfig] Looking for discover-company-attributes tool');
  }
  
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    if (!resourceConfig) {
      if (debugMode && toolName === 'discover-company-attributes') {
        console.log(`[findToolConfig] No config found for resource type: ${resourceType}`);
      }
      continue;
    }
    
    // If debugging the discover-company-attributes tool, log all available tools
    if (toolName === 'discover-company-attributes' && debugMode && resourceType === ResourceType.COMPANIES) {
      console.log(`[findToolConfig] Available tool types for ${resourceType}:`, Object.keys(resourceConfig));
      
      // Check if discoverAttributes exists and has correct properties
      if ('discoverAttributes' in resourceConfig) {
        const config = resourceConfig['discoverAttributes'];
        console.log('[findToolConfig] Found discoverAttributes config:', {
          name: config.name,
          hasHandler: typeof config.handler === 'function',
          hasFormatter: typeof config.formatResult === 'function'
        });
      } else {
        console.log('[findToolConfig] discoverAttributes not found in company configs');
      }
    }
    
    for (const [toolType, config] of Object.entries(resourceConfig)) {
      if (config && config.name === toolName) {
        if (toolName === 'discover-company-attributes' && debugMode) {
          console.log(`[findToolConfig] Found tool: ${toolName}, type: ${toolType}, resource: ${resourceType}`);
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