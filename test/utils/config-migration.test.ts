/**
 * Tests for config migration utility
 *
 * Tests the migration tool that fixes postal code mappings from issue #219
 */

import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyMigration,
  createBackup,
  detectMigrationNeeds,
  migrateUserConfig,
  validateMigration,
} from '../../src/utils/config-migration.js';
import logger from '../../src/utils/logger.js';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock logger module
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockLogger = vi.mocked(logger);

// Test data
const TEST_CONFIG_PATH = path.resolve(
  process.cwd(),
  'config/mappings/user.json'
);
const TEST_BACKUP_PATH = path.resolve(process.cwd(), 'config/mappings/backup');

const VALID_USER_CONFIG = {
  version: '1.0',
  metadata: {
    generated: '2025-05-14T00:00:00Z',
    description: 'User attribute mappings for Attio MCP Server',
  },
  mappings: {
    attributes: {
      common: {
        ZIP: 'postal_code',
        'Postal Code': 'postal_code',
        City: 'city',
        State: 'state',
      },
      objects: {},
      custom: {},
    },
    objects: {},
    lists: {},
    relationships: {},
  },
};

const OUTDATED_USER_CONFIG = {
  version: '1.0',
  metadata: {
    generated: '2025-05-14T00:00:00Z',
    description: 'User attribute mappings with outdated postal code mappings',
  },
  mappings: {
    attributes: {
      common: {
        ZIP: 'zip', // ❌ Should be 'postal_code'
        'Postal Code': 'zip', // ❌ Should be 'postal_code'
        City: 'city',
        State: 'state',
      },
      objects: {},
      custom: {},
    },
    objects: {},
    lists: {},
    relationships: {},
  },
};

const PARTIALLY_OUTDATED_CONFIG = {
  version: '1.0',
  metadata: {
    generated: '2025-05-14T00:00:00Z',
  },
  mappings: {
    attributes: {
      common: {
        ZIP: 'zip', // ❌ Should be 'postal_code'
        'Postal Code': 'postal_code', // ✅ Already correct
        City: 'city',
      },
      objects: {},
      custom: {},
    },
    objects: {},
    lists: {},
    relationships: {},
  },
};

describe('Config Migration Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all fs mocks to default behavior
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.copyFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => {});

    // Reset logger mocks
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectMigrationNeeds', () => {
    it('should return false when user.json does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = detectMigrationNeeds();

      expect(result).toEqual({
        needsMigration: false,
        outdatedMappings: [],
        filePath: TEST_CONFIG_PATH,
        exists: false,
      });
    });

    it('should return false when user.json has correct mappings', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(VALID_USER_CONFIG));

      const result = detectMigrationNeeds();

      expect(result).toEqual({
        needsMigration: false,
        outdatedMappings: [],
        filePath: TEST_CONFIG_PATH,
        exists: true,
      });
    });

    it('should detect outdated ZIP and Postal Code mappings', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));

      const result = detectMigrationNeeds();

      expect(result.needsMigration).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.outdatedMappings).toContain(
        '"ZIP": "zip" → should be "postal_code"'
      );
      expect(result.outdatedMappings).toContain(
        '"Postal Code": "zip" → should be "postal_code"'
      );
      expect(result.outdatedMappings).toHaveLength(2);
    });

    it('should detect only the outdated mappings in partially outdated config', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(PARTIALLY_OUTDATED_CONFIG)
      );

      const result = detectMigrationNeeds();

      expect(result.needsMigration).toBe(true);
      expect(result.outdatedMappings).toContain(
        '"ZIP": "zip" → should be "postal_code"'
      );
      expect(result.outdatedMappings).toHaveLength(1);
      expect(result.outdatedMappings).not.toContain('Postal Code');
    });

    it('should handle malformed JSON gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const result = detectMigrationNeeds();

      expect(result.needsMigration).toBe(false);
      expect(result.exists).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'config-migration',
        'Could not parse user configuration file for migration detection',
        expect.objectContaining({
          filePath: TEST_CONFIG_PATH,
          error: expect.stringContaining('JSON'),
        })
      );
    });

    it('should handle missing attributes structure', () => {
      const configWithoutAttributes = {
        version: '1.0',
        mappings: {
          objects: {},
          lists: {},
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(configWithoutAttributes)
      );

      const result = detectMigrationNeeds();

      expect(result.needsMigration).toBe(false);
      expect(result.exists).toBe(true);
    });
  });

  describe('createBackup', () => {
    it('should create a timestamped backup successfully', () => {
      mockFs.existsSync.mockReturnValue(false); // Backup dir doesn't exist
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});

      const result = createBackup();

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('user.json.backup.');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(TEST_BACKUP_PATH, {
        recursive: true,
      });
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringContaining('user.json.backup.')
      );
    });

    it('should not create backup directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true); // Backup dir exists
      mockFs.copyFileSync.mockImplementation(() => {});

      const result = createBackup();

      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle backup creation errors', () => {
      const error = new Error('Permission denied');
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw error;
      });

      const result = createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should handle file copy errors', () => {
      const error = new Error('File not found');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.copyFileSync.mockImplementation(() => {
        throw error;
      });

      const result = createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('applyMigration', () => {
    it('should succeed when no user.json exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = applyMigration();

      expect(result.success).toBe(true);
      expect(result.message).toContain('No user.json file found');
    });

    it('should succeed when no migration is needed', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(VALID_USER_CONFIG));

      const result = applyMigration();

      expect(result.success).toBe(true);
      expect(result.message).toContain('already up to date');
    });

    it('should successfully migrate outdated config', () => {
      // Mock the detection and backup steps
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});

      let writtenConfig: any;
      mockFs.writeFileSync.mockImplementation((path, data) => {
        if (path === TEST_CONFIG_PATH) {
          writtenConfig = JSON.parse(data as string);
        }
      });

      const result = applyMigration();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Migration completed successfully');
      expect(result.changesApplied).toHaveLength(2);
      expect(result.changesApplied).toContain(
        'Updated "ZIP": "zip" → "postal_code"'
      );
      expect(result.changesApplied).toContain(
        'Updated "Postal Code": "zip" → "postal_code"'
      );
      expect(result.backupPath).toBeDefined();

      // Verify the written config has correct mappings
      expect(writtenConfig.mappings.attributes.common['ZIP']).toBe(
        'postal_code'
      );
      expect(writtenConfig.mappings.attributes.common['Postal Code']).toBe(
        'postal_code'
      );
      expect(writtenConfig.metadata.lastMigration).toBeDefined();
      expect(writtenConfig.metadata.migratedMappings).toHaveLength(2);
    });

    it('should fail when backup creation fails', () => {
      mockFs.existsSync.mockReturnValueOnce(true); // user.json exists
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));
      mockFs.existsSync.mockReturnValueOnce(false); // backup dir doesn't exist
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = applyMigration();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create backup');
      expect(result.errors).toContain('Permission denied');
    });

    it('should handle write errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = applyMigration();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Migration failed');
      expect(result.errors).toContain('Write failed');
    });
  });

  describe('validateMigration', () => {
    it('should pass validation when no user.json exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = validateMigration();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should pass validation when config is up to date', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(VALID_USER_CONFIG));

      const result = validateMigration();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation when outdated mappings remain', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));

      const result = validateMigration();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Migration incomplete');
    });
  });

  describe('migrateUserConfig', () => {
    it('should perform dry run without making changes', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));

      const result = migrateUserConfig({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Migration needed. Would fix:');
      expect(result.changesApplied).toHaveLength(2);
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should complete full migration workflow successfully', () => {
      // Setup mocks for successful migration
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});

      let writtenConfig: any;
      mockFs.writeFileSync.mockImplementation((path, data) => {
        if (path === TEST_CONFIG_PATH) {
          writtenConfig = JSON.parse(data as string);
          // Update the mock to return the migrated config for validation
          mockFs.readFileSync.mockReturnValue(data as string);
        }
      });

      const result = migrateUserConfig();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Migration completed successfully');
      expect(result.changesApplied).toHaveLength(2);
      expect(result.backupPath).toBeDefined();

      // Verify migration was applied
      expect(writtenConfig.mappings.attributes.common['ZIP']).toBe(
        'postal_code'
      );
      expect(writtenConfig.mappings.attributes.common['Postal Code']).toBe(
        'postal_code'
      );
    });

    it('should detect validation failures after migration', () => {
      // Setup mocks for migration that doesn't fix the issue
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(OUTDATED_USER_CONFIG));
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {
        // Simulate write succeeding but validation still failing
        // (keep returning outdated config for validation check)
      });

      const result = migrateUserConfig();

      expect(result.success).toBe(false);
      expect(result.message).toContain('validation failed');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle config without common mappings section', () => {
      const configWithoutCommon = {
        version: '1.0',
        mappings: {
          attributes: {
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithoutCommon));

      const detection = detectMigrationNeeds();
      expect(detection.needsMigration).toBe(false);

      const migration = migrateUserConfig();
      expect(migration.success).toBe(true);
      expect(migration.message).toContain('already up to date');
    });

    it('should handle completely empty config file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');

      const result = detectMigrationNeeds();

      expect(result.needsMigration).toBe(false);
      expect(result.exists).toBe(true);
    });

    it('should preserve other mappings during migration', () => {
      const configWithOtherMappings = {
        ...OUTDATED_USER_CONFIG,
        mappings: {
          ...OUTDATED_USER_CONFIG.mappings,
          attributes: {
            ...OUTDATED_USER_CONFIG.mappings.attributes,
            common: {
              ...OUTDATED_USER_CONFIG.mappings.attributes.common,
              'Custom Field': 'custom_field',
              'Another Field': 'another_field',
            },
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(configWithOtherMappings)
      );
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});

      let writtenConfig: any;
      mockFs.writeFileSync.mockImplementation((path, data) => {
        if (path === TEST_CONFIG_PATH) {
          writtenConfig = JSON.parse(data as string);
          mockFs.readFileSync.mockReturnValue(data as string);
        }
      });

      const result = migrateUserConfig();

      expect(result.success).toBe(true);

      // Verify postal code mappings were fixed
      expect(writtenConfig.mappings.attributes.common['ZIP']).toBe(
        'postal_code'
      );
      expect(writtenConfig.mappings.attributes.common['Postal Code']).toBe(
        'postal_code'
      );

      // Verify other mappings were preserved
      expect(writtenConfig.mappings.attributes.common['Custom Field']).toBe(
        'custom_field'
      );
      expect(writtenConfig.mappings.attributes.common['Another Field']).toBe(
        'another_field'
      );
      expect(writtenConfig.mappings.attributes.common['City']).toBe('city');
      expect(writtenConfig.mappings.attributes.common['State']).toBe('state');
    });
  });
});
