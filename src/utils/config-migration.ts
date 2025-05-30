/**
 * Configuration migration utility for Attio MCP Server
 * Handles migration of user.json files to fix outdated mappings
 */
import fs from 'fs';
import path from 'path';
import { MappingConfig } from './config-loader.js';

export interface MigrationResult {
  success: boolean;
  message: string;
  backupPath?: string;
  changesApplied?: string[];
  errors?: string[];
}

export interface MigrationDetection {
  needsMigration: boolean;
  outdatedMappings: string[];
  filePath: string;
  exists: boolean;
}

/**
 * Known problematic mappings that need to be fixed
 */
const MAPPINGS_TO_FIX = {
  ZIP: {
    from: 'zip',
    to: 'postal_code',
    reason: 'zip attribute does not exist in Attio schema',
  },
  'Postal Code': {
    from: 'zip',
    to: 'postal_code',
    reason: 'zip attribute does not exist in Attio schema',
  },
} as const;

/**
 * Paths for configuration files
 */
const CONFIG_PATHS = {
  user: path.resolve(process.cwd(), 'config/mappings/user.json'),
  backup: path.resolve(process.cwd(), 'config/mappings/backup'),
};

/**
 * Detects if user.json needs migration for postal code mappings
 */
export function detectMigrationNeeds(): MigrationDetection {
  const result: MigrationDetection = {
    needsMigration: false,
    outdatedMappings: [],
    filePath: CONFIG_PATHS.user,
    exists: false,
  };

  // Check if user.json exists
  if (!fs.existsSync(CONFIG_PATHS.user)) {
    return result;
  }

  result.exists = true;

  try {
    const userConfig: MappingConfig = JSON.parse(
      fs.readFileSync(CONFIG_PATHS.user, 'utf8')
    );

    // Check common mappings for problematic postal code mappings
    const commonMappings = userConfig.mappings?.attributes?.common || {};

    for (const [displayName, expectedFix] of Object.entries(MAPPINGS_TO_FIX)) {
      const currentMapping = commonMappings[displayName];
      if (currentMapping === expectedFix.from) {
        result.needsMigration = true;
        result.outdatedMappings.push(
          `"${displayName}": "${currentMapping}" → should be "${expectedFix.to}"`
        );
      }
    }
  } catch (error) {
    // If we can't parse the file, we can't migrate it
    console.warn(`Warning: Could not parse ${CONFIG_PATHS.user}:`, error);
  }

  return result;
}

/**
 * Creates a timestamped backup of the user.json file
 */
export function createBackup(): {
  success: boolean;
  backupPath?: string;
  error?: string;
} {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(CONFIG_PATHS.backup)) {
      fs.mkdirSync(CONFIG_PATHS.backup, { recursive: true });
    }

    // Create timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `user.json.backup.${timestamp}`;
    const backupPath = path.join(CONFIG_PATHS.backup, backupFileName);

    // Copy the current user.json to backup
    fs.copyFileSync(CONFIG_PATHS.user, backupPath);

    return { success: true, backupPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Applies the postal code mapping migration to user.json
 */
export function applyMigration(): MigrationResult {
  const detection = detectMigrationNeeds();

  if (!detection.exists) {
    return {
      success: true,
      message: 'No user.json file found - no migration needed',
    };
  }

  if (!detection.needsMigration) {
    return {
      success: true,
      message: 'User configuration is already up to date - no migration needed',
    };
  }

  try {
    // Create backup first
    const backup = createBackup();
    if (!backup.success) {
      return {
        success: false,
        message: `Failed to create backup: ${backup.error}`,
        errors: [backup.error || 'Unknown backup error'],
      };
    }

    // Load and modify the user config
    const userConfig: MappingConfig = JSON.parse(
      fs.readFileSync(CONFIG_PATHS.user, 'utf8')
    );
    const changesApplied: string[] = [];

    // Apply postal code mapping fixes
    if (userConfig.mappings?.attributes?.common) {
      for (const [displayName, fix] of Object.entries(MAPPINGS_TO_FIX)) {
        const currentMapping =
          userConfig.mappings.attributes.common[displayName];
        if (currentMapping === fix.from) {
          userConfig.mappings.attributes.common[displayName] = fix.to;
          changesApplied.push(
            `Updated "${displayName}": "${fix.from}" → "${fix.to}"`
          );
        }
      }
    }

    // Update metadata to track migration
    if (!userConfig.metadata) {
      userConfig.metadata = {};
    }
    userConfig.metadata.lastMigration = new Date().toISOString();
    userConfig.metadata.migratedMappings = changesApplied;

    // Write the updated config back to file
    fs.writeFileSync(
      CONFIG_PATHS.user,
      JSON.stringify(userConfig, null, 2),
      'utf8'
    );

    return {
      success: true,
      message: `Migration completed successfully. Applied ${changesApplied.length} changes.`,
      backupPath: backup.backupPath,
      changesApplied,
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Validates that the migration was applied correctly
 */
export function validateMigration(): { valid: boolean; issues: string[] } {
  const detection = detectMigrationNeeds();

  if (!detection.exists) {
    return { valid: true, issues: [] };
  }

  if (detection.needsMigration) {
    return {
      valid: false,
      issues: [
        `Migration incomplete. Still found outdated mappings: ${detection.outdatedMappings.join(
          ', '
        )}`,
      ],
    };
  }

  return { valid: true, issues: [] };
}

/**
 * Complete migration workflow with validation
 */
export function migrateUserConfig(
  options: { dryRun?: boolean } = {}
): MigrationResult {
  const detection = detectMigrationNeeds();

  // Early return if no migration needed
  if (!detection.exists) {
    return {
      success: true,
      message: 'No user.json file found - no migration needed',
    };
  }

  if (!detection.needsMigration) {
    return {
      success: true,
      message: 'User configuration is already up to date - no migration needed',
    };
  }

  // Dry run mode - just report what would be changed
  if (options.dryRun) {
    return {
      success: true,
      message: `Migration needed. Would fix: ${detection.outdatedMappings.join(
        ', '
      )}`,
      changesApplied: detection.outdatedMappings,
    };
  }

  // Apply the migration
  const migrationResult = applyMigration();

  if (!migrationResult.success) {
    return migrationResult;
  }

  // Validate the migration worked
  const validation = validateMigration();
  if (!validation.valid) {
    return {
      success: false,
      message: `Migration applied but validation failed: ${validation.issues.join(
        ', '
      )}`,
      errors: validation.issues,
      backupPath: migrationResult.backupPath,
      changesApplied: migrationResult.changesApplied,
    };
  }

  return migrationResult;
}
