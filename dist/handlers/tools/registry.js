/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from "../../types/attio.js";
// Import consolidated tool configurations from modular files
import { companyToolConfigs, companyToolDefinitions } from "../tool-configs/companies/index.js";
import { peopleToolConfigs, peopleToolDefinitions } from "../tool-configs/people.js";
import { listsToolConfigs, listsToolDefinitions } from "../tool-configs/lists.js";
import { recordToolConfigs, recordToolDefinitions } from "../tool-configs/records.js";
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
export function findToolConfig(toolName) {
    for (const resourceType of Object.values(ResourceType)) {
        const resourceConfig = TOOL_CONFIGS[resourceType];
        if (!resourceConfig)
            continue;
        for (const [toolType, config] of Object.entries(resourceConfig)) {
            if (config && config.name === toolName) {
                return {
                    resourceType: resourceType,
                    toolConfig: config,
                    toolType,
                };
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=registry.js.map