/**
 * Tool configuration verification utilities
 *
 * This module provides utility functions for verifying tool configurations
 * during initialization to ensure proper registration and prevent runtime errors.
 */

/**
 * Verifies that required tool types are present in a tool configuration object
 * and checks for duplicate tool names
 *
 * @param {string} resourceName - The name of the resource for logging (e.g., 'company', 'people')
 * @param {Object} combinedConfigs - The combined tool configurations object
 * @param {string[]} requiredToolTypes - Array of tool types that must be present
 * @returns {boolean} - Whether all required tools are properly configured
 */
import { createScopedLogger } from '../../utils/logger.js';
import type { ToolConfig } from '../tool-types.js';

export function verifyToolConfigsWithRequiredTools(
  resourceName: string,
  combinedConfigs: Record<string, ToolConfig>,
  requiredToolTypes: string[]
): boolean {
  const debugMode =
    process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  if (!debugMode) return true;

  const log = createScopedLogger(
    `${resourceName}ToolConfigs`,
    'verifyToolConfigs'
  );
  log.info('Verifying tool configs during initialization');

  let allPresent = true;

  // Check for duplicate tool names
  const toolNameMap: Record<string, string[]> = {};

  // Build a map of tool names to their config types
  for (const [configType, config] of Object.entries(combinedConfigs)) {
    if (config && typeof config === 'object' && 'name' in config) {
      const toolConfig = config as ToolConfig;
      const toolName = toolConfig.name;
      if (!toolNameMap[toolName]) {
        toolNameMap[toolName] = [];
      }
      toolNameMap[toolName].push(configType);
    }
  }

  // Check for duplicates
  const duplicates = Object.entries(toolNameMap).filter(
    ([, configTypes]) => configTypes.length > 1
  );

  if (duplicates.length > 0) {
    log.warn('DUPLICATE TOOL NAMES DETECTED');
    for (const [toolName, configTypes] of duplicates) {
      log.warn('Tool name defined in multiple configs', {
        toolName,
        locations: configTypes,
      });
    }

    // In strict mode, fail validation
    if (process.env.STRICT_TOOL_VALIDATION === 'true') {
      log.error(
        'Duplicate tool names will cause MCP tool initialization failures.'
      );
      allPresent = false;
    }
  }

  // Verify each required tool type is present
  for (const toolType of requiredToolTypes) {
    if (toolType in combinedConfigs) {
      const config = combinedConfigs[toolType];
      log.info('Found required tool', { toolType, name: config.name });

      // Additional validation
      if (typeof config.handler !== 'function') {
        log.warn(`${toolType} has no handler function`);
        allPresent = false;
      }

      if (
        typeof config.formatResult !== 'function' &&
        toolType !== 'create' &&
        toolType !== 'update'
      ) {
        log.warn(`${toolType} has no formatResult function`);
      }
    } else {
      log.warn('MISSING required tool type', { toolType });
      allPresent = false;
    }
  }

  // Log all available tool types for debugging
  if (debugMode) {
    log.info('All registered tool types', {
      types: Object.keys(combinedConfigs),
    });
  }

  return allPresent;
}

/**
 * Verifies a specific tool in the configurations
 *
 * @param {string} resourceName - The name of the resource for logging
 * @param {Object} configs - The configurations object
 * @param {string} toolType - The specific tool type to verify
 * @param {Object} subConfigs - Optional sub-configurations to check for the tool
 * @returns {boolean} - Whether the tool is properly configured
 */
export function verifySpecificTool(
  resourceName: string,
  configs: Record<string, ToolConfig>,
  toolType: string,
  subConfigs: Record<string, ToolConfig> | null = null
): boolean {
  const debugMode =
    process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  if (!debugMode) return true;

  const log = createScopedLogger(
    `${resourceName}ToolConfigs`,
    'verifySpecificTool'
  );
  if (subConfigs && toolType in subConfigs) {
    log.info('Found tool in sub-configs', { toolType });

    // Check if the tool was properly merged into the main configs
    if (toolType in configs) {
      return true;
    } else {
      log.warn('Tool exists in sub-config but not in combined config', {
        toolType,
      });
      return false;
    }
  }

  // Just check the main configs
  if (toolType in configs) {
    return true;
  }

  log.warn('Tool not found in configs', { toolType });
  return false;
}
