/**
 * Configuration loader for Attio MCP Server
 * Handles loading and merging of configuration files
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Interface for mapping configuration
 */
export interface MappingConfig {
  version: string;
  metadata?: Record<string, any>;
  mappings: {
    attributes: {
      common: Record<string, string>;
      objects: Record<string, Record<string, string>>;
      custom: Record<string, string>;
    };
    objects: Record<string, string>;
    lists: Record<string, string>;
    relationships: Record<string, string>;
    [key: string]: any; // Allow other mapping types
  };
}

/**
 * Default paths for configuration files
 */
const CONFIG_PATHS = {
  default: path.resolve(process.cwd(), 'config/mappings/default.json'),
  user: path.resolve(process.cwd(), 'config/mappings/user.json'),
};

/**
 * Deep merges two objects, with values from the source object taking precedence
 *
 * @param target - The target object
 * @param source - The source object to merge in
 * @returns The merged object
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        // If both target and source have an object at this key, merge them
        if (
          result[key] &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key])
        ) {
          result[key] = deepMerge(result[key], source[key]);
        } else {
          // Otherwise, just use the source value
          result[key] = { ...source[key] };
        }
      } else {
        // For non-objects, use the source value
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Creates an empty mapping configuration with default structure
 *
 * @returns An empty mapping configuration
 */
function createEmptyConfig(): MappingConfig {
  return {
    version: '1.0',
    metadata: {
      generated: new Date().toISOString(),
      description: 'Generated empty configuration',
    },
    mappings: {
      attributes: {
        common: {},
        objects: {},
        custom: {},
      },
      objects: {},
      lists: {},
      relationships: {},
    },
  };
}

/**
 * Loads a JSON configuration file
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object, or null if the file doesn't exist
 */
function loadJsonFile(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Failed to load config file ${filePath}:`, error);
  }
  return null;
}

/**
 * Loads and merges the mapping configuration from default and user files
 *
 * @returns The merged mapping configuration
 */
export function loadMappingConfig(): MappingConfig {
  // Start with empty configuration
  let config = createEmptyConfig();

  // Load and merge the default configuration
  const defaultConfig = loadJsonFile(CONFIG_PATHS.default);
  if (defaultConfig) {
    config = deepMerge(config, defaultConfig);
  }

  // Load and merge the user configuration
  const userConfig = loadJsonFile(CONFIG_PATHS.user);
  if (userConfig) {
    config = deepMerge(config, userConfig);
  }

  return config;
}

/**
 * Writes a mapping configuration to a file
 *
 * @param config - The configuration to write
 * @param filePath - The file path to write to (defaults to user.json)
 */
export async function writeMappingConfig(
  config: MappingConfig,
  filePath: string = CONFIG_PATHS.user
): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Update metadata
    if (!config.metadata) {
      config.metadata = {};
    }
    config.metadata.generated = new Date().toISOString();

    // Write the file
    const content = JSON.stringify(config, null, 2);
    await fs.promises.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write config file ${filePath}: ${error}`);
  }
}

/**
 * Updates a specific section of the mapping configuration
 *
 * @param section - The section to update (e.g., 'attributes.common')
 * @param mappings - The mappings to set or merge
 * @param merge - Whether to merge with existing mappings (default: true)
 * @param filePath - The file path to write to (defaults to user.json)
 */
export async function updateMappingSection(
  section: string,
  mappings: Record<string, any>,
  merge = true,
  filePath: string = CONFIG_PATHS.user
): Promise<void> {
  // Load the current config
  const config = loadMappingConfig();

  // Parse the section path and navigate to the target section
  const sectionParts = section.split('.');
  let target = config.mappings;

  for (let i = 0; i < sectionParts.length - 1; i++) {
    const part = sectionParts[i];
    if (!target[part]) {
      target[part] = {};
    }
    target = target[part];
  }

  const finalPart = sectionParts[sectionParts.length - 1];

  // Update the target section
  if (merge && target[finalPart]) {
    target[finalPart] = { ...target[finalPart], ...mappings };
  } else {
    target[finalPart] = mappings;
  }

  // Write the updated config
  await writeMappingConfig(config, filePath);
}
