/**
 * Auto-discovery module for automatic attribute mapping updates
 */
import {
  getObjectAttributes,
  getAvailableObjects,
} from '../cli/commands/attributes.js';
import {
  loadMappingConfig,
  writeMappingConfig,
  MappingConfig,
} from './config-loader.js';

// Simple logging for auto-discovery - disabled for MCP protocol compatibility
const log = {
  info: (_msg: string) => {
    /* Silent for MCP protocol compatibility */
  },
  warn: (_msg: string) => {
    /* Silent for MCP protocol compatibility */
  },
  error: (_msg: string, _error?: any) => {
    /* Silent for MCP protocol compatibility */
  },
};

/**
 * Configuration for auto-discovery
 */
export interface AutoDiscoveryConfig {
  enabled: boolean;
  runOnStartup: boolean;
  intervalMinutes?: number;
  outputPath?: string;
}

/**
 * Default configuration for auto-discovery
 */
const DEFAULT_CONFIG: AutoDiscoveryConfig = {
  enabled: true,
  runOnStartup: true,
  intervalMinutes: 60, // Run every hour by default
  outputPath: 'config/mappings/user.json',
};

let discoveryInterval: NodeJS.Timeout | null = null;

/**
 * Run attribute discovery for all objects
 */
export async function runDiscovery(
  apiKey: string,
  outputPath?: string
): Promise<void> {
  log.info('Starting automatic attribute discovery...');

  try {
    // Load existing config or create new one
    let config: MappingConfig;
    try {
      config = loadMappingConfig();
    } catch (error) {
      log.warn('Failed to load existing configuration, creating new one...');
      config = {
        version: '1.0',
        metadata: {
          generated: new Date().toISOString(),
          description: 'Generated by automatic discovery',
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

    // Get all available objects
    const objects = await getAvailableObjects(apiKey);
    log.info(`Found ${objects.length} objects in Attio workspace`);

    // Process each object
    for (const objectSlug of objects) {
      try {
        const attributeMappings = await getObjectAttributes(objectSlug, apiKey);
        const attributeCount = Object.keys(attributeMappings).length;

        if (attributeCount > 0) {
          if (!config.mappings.attributes.objects[objectSlug]) {
            config.mappings.attributes.objects[objectSlug] = {};
          }

          // Merge with existing mappings
          config.mappings.attributes.objects[objectSlug] = {
            ...config.mappings.attributes.objects[objectSlug],
            ...attributeMappings,
          };

          log.info(`Discovered ${attributeCount} attributes for ${objectSlug}`);
        }
      } catch (error) {
        log.error(`Error discovering attributes for ${objectSlug}:`, error);
      }
    }

    // Update metadata
    config.metadata = {
      ...config.metadata,
      generated: new Date().toISOString(),
      lastDiscovery: new Date().toISOString(),
      autoDiscovery: true,
    };

    // Write the updated config
    await writeMappingConfig(config, outputPath || DEFAULT_CONFIG.outputPath);
    log.info('Automatic attribute discovery completed successfully');
  } catch (error) {
    log.error('Failed to complete automatic discovery:', error);
    throw error;
  }
}

/**
 * Start automatic discovery with optional periodic updates
 */
export async function startAutoDiscovery(
  apiKey: string,
  config: Partial<AutoDiscoveryConfig> = {}
): Promise<void> {
  const settings = { ...DEFAULT_CONFIG, ...config };

  if (!settings.enabled) {
    log.info('Auto-discovery is disabled');
    return;
  }

  // Run on startup if configured
  if (settings.runOnStartup) {
    try {
      await runDiscovery(apiKey, settings.outputPath);
    } catch (error) {
      log.error('Failed to run discovery on startup:', error);
      // Don't fail the server startup, just log the error
    }
  }

  // Set up periodic discovery if configured
  if (settings.intervalMinutes && settings.intervalMinutes > 0) {
    const intervalMs = settings.intervalMinutes * 60 * 1000;

    discoveryInterval = setInterval(async () => {
      log.info('Running scheduled attribute discovery...');
      try {
        await runDiscovery(apiKey, settings.outputPath);
      } catch (error) {
        log.error('Failed to run scheduled discovery:', error);
      }
    }, intervalMs);

    log.info(
      `Scheduled attribute discovery every ${settings.intervalMinutes} minutes`
    );
  }
}

/**
 * Stop automatic discovery
 */
export function stopAutoDiscovery(): void {
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
    discoveryInterval = null;
    log.info('Stopped automatic attribute discovery');
  }
}
