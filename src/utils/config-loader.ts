/**
 * Configuration loader for Attio MCP Server
 * Handles loading and merging of configuration files
 */
import * as fs from 'fs';
import * as path from 'path';
import { createScopedLogger } from './logger.js';
import { DANGEROUS_KEYS } from './security-constants.js';

/**
 * Interface for mapping configuration
 */
export interface MappingConfig {
  version: string;
  metadata?: Record<string, unknown>;
  mappings: {
    attributes: {
      common: Record<string, string>;
      objects: Record<string, Record<string, string>>;
      custom: Record<string, string>;
    };
    objects: Record<string, string>;
    lists: Record<string, string>;
    relationships: Record<string, string>;
    [key: string]: Record<string, unknown>; // Allow other mapping types
  };
}

/**
 * Default paths for configuration files
 */
const CONFIG_PATHS = {
  default: path.resolve(process.cwd(), 'configs/runtime/mappings/default.json'),
  user: path.resolve(process.cwd(), 'configs/runtime/mappings/user.json'),
};

/**
 * Cached mapping configuration to avoid repeated disk I/O
 * @see loadMappingConfig() is called on every tool request via canonicalizeResourceType()
 */
let cachedConfig: MappingConfig | null = null;

/**
 * Invalidates the cached mapping configuration
 * Call this when the config files are updated (e.g., after attio-discover)
 */
export function invalidateMappingConfigCache(): void {
  cachedConfig = null;
}

/**
 * Validates that a key is safe for object property assignment
 * Prevents prototype pollution attacks by filtering dangerous keys
 *
 * @param key - The property key to validate
 * @returns True if the key is safe to use, false otherwise
 */
function isSafeKey(key: string): boolean {
  return (
    !(DANGEROUS_KEYS as readonly string[]).includes(key) && !key.includes('.')
  );
}

/**
 * Type for mergeable objects that ensures type safety during configuration merging
 */
type MergeableObject = Record<string, unknown>;

/**
 * Type guard to validate if an object is a valid MappingConfig
 * @param obj - Object to validate
 * @returns True if the object is a valid MappingConfig
 */
function isValidMappingConfig(obj: unknown): obj is MappingConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'mappings' in obj &&
    typeof (obj as Record<string, unknown>).mappings === 'object'
  );
}

/**
 * Safely converts an object to MergeableObject for security processing
 * @param obj - Object to convert
 * @returns Converted object or empty object if invalid
 */
function toMergeableObject(obj: unknown): MergeableObject {
  if (typeof obj === 'object' && obj !== null) {
    return obj as MergeableObject;
  }
  return {};
}

/**
 * Validates section path parts for security risks
 * @param sectionParts - Array of section path components to validate
 * @throws Error if any part contains dangerous keys
 */
function validateSectionPath(sectionParts: string[]): void {
  const invalidPart = sectionParts.find((part) => !isSafeKey(part));
  if (invalidPart) {
    throw new Error(
      `Invalid section key detected: ${invalidPart}. This key poses a security risk.`
    );
  }
}

/**
 * Safely deep merges two objects, with values from the source object taking precedence
 * Implements prototype pollution protection by filtering dangerous keys
 *
 * @param target - The target object
 * @param source - The source object to merge in
 * @returns The merged object
 */
function safeMerge(
  target: MergeableObject,
  source: MergeableObject
): MergeableObject {
  const result = { ...target };

  for (const key in source) {
    // Security: Skip dangerous keys that could cause prototype pollution
    if (!isSafeKey(key)) {
      createScopedLogger('utils/config-loader', 'safeMerge').debug(
        'Rejected dangerous key during merge',
        { key, source: 'config-loader' }
      );
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        // If both target and source have an object at this key, merge them recursively
        if (
          result[key] &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key])
        ) {
          result[key] = safeMerge(
            result[key] as MergeableObject,
            source[key] as MergeableObject
          );
        } else {
          // Otherwise, safely copy the source value
          result[key] = safeMerge({}, source[key] as MergeableObject);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON.parse returns any by design, content structure is unknown
function loadJsonFile(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error: unknown) {
    createScopedLogger('utils/config-loader', 'loadJsonFile').warn(
      'Failed to load config file',
      {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
  return null;
}

/**
 * Loads and merges the mapping configuration from default and user files
 * Uses caching to avoid repeated disk I/O on hot paths
 *
 * @returns The merged mapping configuration
 */
export function loadMappingConfig(): MappingConfig {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Start with empty configuration
  let config = createEmptyConfig();

  // Load and merge the default configuration
  const defaultConfig = loadJsonFile(CONFIG_PATHS.default);
  if (defaultConfig) {
    const mergedConfig = safeMerge(
      toMergeableObject(config),
      toMergeableObject(defaultConfig)
    );
    if (isValidMappingConfig(mergedConfig)) {
      config = mergedConfig;
    }
  }

  // Load and merge the user configuration
  const userConfig = loadJsonFile(CONFIG_PATHS.user);
  if (userConfig) {
    const mergedConfig = safeMerge(
      toMergeableObject(config),
      toMergeableObject(userConfig)
    );
    if (isValidMappingConfig(mergedConfig)) {
      config = mergedConfig;
    }
  }

  // Cache the result for subsequent calls
  cachedConfig = config;
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

    // Invalidate cache so next read picks up changes
    invalidateMappingConfigCache();
  } catch (error: unknown) {
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
  mappings: Record<string, unknown>,
  merge: boolean = true,
  filePath: string = CONFIG_PATHS.user
): Promise<void> {
  // Load the current config
  const config = loadMappingConfig();

  // Parse the section path and navigate to the target section
  const sectionParts = section.split('.');
  let target: Record<string, unknown> = config.mappings;

  // Security: Validate all section parts for prototype pollution safety
  validateSectionPath(sectionParts);

  for (let i = 0; i < sectionParts.length - 1; i++) {
    const part = sectionParts[i];
    if (!target[part]) {
      target[part] = {};
    }
    target = target[part] as Record<string, unknown>;
  }

  const finalPart = sectionParts[sectionParts.length - 1];

  // Update the target section with security validation
  if (merge && target[finalPart]) {
    // Use safe merging for existing sections
    const mergedSection = safeMerge(
      toMergeableObject(target[finalPart]),
      toMergeableObject(mappings)
    );
    target[finalPart] = mergedSection as Record<string, unknown>;
  } else {
    // For new sections, ensure the mappings object is safe
    const safeSection = safeMerge({}, toMergeableObject(mappings));
    target[finalPart] = safeSection as Record<string, unknown>;
  }

  // Write the updated config
  await writeMappingConfig(config, filePath);
}
