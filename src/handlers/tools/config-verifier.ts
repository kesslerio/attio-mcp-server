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
export function verifyToolConfigsWithRequiredTools(
  resourceName: string,
  combinedConfigs: any,
  requiredToolTypes: string[]
): boolean {
  const debugMode =
    process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  if (!debugMode) return true;

  console.log(
    `[${resourceName}ToolConfigs] Verifying tool configs during initialization`
  );

  let allPresent = true;

  // Check for duplicate tool names
  const toolNameMap: Record<string, string[]> = {};

  // Build a map of tool names to their config types
  for (const [configType, config] of Object.entries(combinedConfigs)) {
    if (
      config &&
      typeof config === 'object' &&
      'name' in config &&
      typeof config.name === 'string'
    ) {
      const toolName = config.name;
      if (!toolNameMap[toolName]) {
        toolNameMap[toolName] = [];
      }
      toolNameMap[toolName].push(configType);
    }
  }

  // Check for duplicates
  const duplicates = Object.entries(toolNameMap).filter(
    ([_toolName, configTypes]) => configTypes.length > 1
  );

  if (duplicates.length > 0) {
    console.warn(`[${resourceName}ToolConfigs] DUPLICATE TOOL NAMES DETECTED:`);
    for (const [toolName, configTypes] of duplicates) {
      console.warn(
        `  Tool name "${toolName}" is defined in multiple configs: ${configTypes.join(
          ', '
        )}`
      );
    }

    // In strict mode, fail validation
    if (process.env.STRICT_TOOL_VALIDATION === 'true') {
      console.error(
        `[${resourceName}ToolConfigs] ERROR: Duplicate tool names will cause MCP tool initialization failures.`
      );
      allPresent = false;
    }
  }

  // Verify each required tool type is present
  for (const toolType of requiredToolTypes) {
    if (toolType in combinedConfigs) {
      const config = combinedConfigs[toolType];
      console.log(
        `[${resourceName}ToolConfigs] Found ${toolType} with name: ${config.name}`
      );

      // Additional validation
      if (typeof config.handler !== 'function') {
        console.warn(
          `[${resourceName}ToolConfigs] WARNING: ${toolType} has no handler function!`
        );
        allPresent = false;
      }

      if (
        typeof config.formatResult !== 'function' &&
        toolType !== 'create' &&
        toolType !== 'update'
      ) {
        console.warn(
          `[${resourceName}ToolConfigs] WARNING: ${toolType} has no formatResult function!`
        );
      }
    } else {
      console.warn(
        `[${resourceName}ToolConfigs] MISSING: Required tool type '${toolType}' not found!`
      );
      allPresent = false;
    }
  }

  // Log all available tool types for debugging
  if (debugMode) {
    console.log(
      `[${resourceName}ToolConfigs] All registered tool types:`,
      Object.keys(combinedConfigs)
    );
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
  configs: any,
  toolType: string,
  subConfigs: any = null
): boolean {
  const debugMode =
    process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  if (!debugMode) return true;

  if (subConfigs && toolType in subConfigs) {
    console.log(
      `[${resourceName}ToolConfigs] Found ${toolType} in sub-configs`
    );

    // Check if the tool was properly merged into the main configs
    if (toolType in configs) {
      return true;
    }
    console.warn(
      `[${resourceName}ToolConfigs] WARNING: ${toolType} exists in sub-config but not in combined config!`
    );
    return false;
  }

  // Just check the main configs
  if (toolType in configs) {
    return true;
  }

  console.warn(
    `[${resourceName}ToolConfigs] WARNING: ${toolType} not found in configs!`
  );
  return false;
}
