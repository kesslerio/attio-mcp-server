/**
 * Configuration migration utility for Attio MCP Server
 * Handles migration of user.json files to fix outdated mappings
 */
import fs from 'fs';
import path from 'path';
import type { MappingConfig } from './config-loader.js';
import logger from './logger.js';

// Re-export MappingConfig for external use
export type { MappingConfig };

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
 *
 * Scans the user configuration file for outdated postal code mappings
 * that use "zip" instead of the correct "postal_code" attribute name.
 *
 * @returns MigrationDetection object containing:
 *   - needsMigration: whether migration is required
 *   - outdatedMappings: array of problematic mappings found
 *   - filePath: path to the user config file
 *   - exists: whether the config file exists
 *
 * @example
 * ```typescript
 * const detection = detectMigrationNeeds();
 * if (detection.needsMigration) {
 *   console.log('Found outdated mappings:', detection.outdatedMappings);
 * }
 * ```
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
    logger.warn(
      'config-migration',
      'Could not parse user configuration file for migration detection',
      {
        filePath: CONFIG_PATHS.user,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }

  return result;
}

/**
 * Creates a timestamped backup of the user.json file
 *
 * Creates a backup in config/mappings/backup/ directory with ISO timestamp.
 * Ensures the backup directory exists before creating the backup file.
 *
 * @returns Object containing:
 *   - success: whether backup creation succeeded
 *   - backupPath: path to the created backup file (if successful)
 *   - error: error message (if failed)
 *
 * @example
 * ```typescript
 * const backup = createBackup();
 * if (backup.success) {
 *   console.log('Backup created at:', backup.backupPath);
 * } else {
 *   console.error('Backup failed:', backup.error);
 * }
 * ```
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
 *
 * Performs the complete migration workflow:
 * 1. Detects if migration is needed
 * 2. Creates a backup of the current configuration
 * 3. Applies the postal code mapping fixes
 * 4. Updates metadata to track migration history
 *
 * @returns MigrationResult object containing:
 *   - success: whether the migration succeeded
 *   - message: descriptive message about the operation
 *   - backupPath: path to the backup file (if created)
 *   - changesApplied: array of changes that were made
 *   - errors: array of error messages (if any failures occurred)
 *
 * @example
 * ```typescript
 * const result = applyMigration();
 * if (result.success) {
 *   console.log('Migration completed:', result.message);
 *   console.log('Changes:', result.changesApplied);
 * } else {
 *   console.error('Migration failed:', result.message);
 * }
 * ```
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
 *
 * Checks if the user configuration still contains any outdated postal
 * code mappings after migration has been applied.
 *
 * @returns Object containing:
 *   - valid: whether the configuration passes validation
 *   - issues: array of validation issues found (if any)
 *
 * @example
 * ```typescript
 * const validation = validateMigration();
 * if (!validation.valid) {
 *   console.error('Validation failed:', validation.issues);
 * }
 * ```
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
 *
 * Main entry point for the migration process. Orchestrates detection,
 * migration, and validation with optional dry-run mode.
 *
 * @param options Configuration options for the migration:
 *   - dryRun: if true, only shows what would be changed without applying
 *
 * @returns MigrationResult object with complete operation status
 *
 * @example
 * ```typescript
 * // Preview changes without applying
 * const preview = migrateUserConfig({ dryRun: true });
 * console.log('Would apply:', preview.changesApplied);
 *
 * // Apply the migration
 * const result = migrateUserConfig();
 * if (result.success) {
 *   console.log('Migration completed successfully');
 * }
 * ```
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
