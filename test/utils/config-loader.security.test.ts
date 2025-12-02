/**
 * Security tests for the configuration loader
 * Tests prototype pollution vulnerabilities and defenses
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import {
  loadMappingConfig,
  updateMappingSection,
  invalidateMappingConfigCache,
  MappingConfig,
} from '../../src/utils/config-loader';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdirSync: vi.fn(),
}));

// Mock path module
vi.mock('path', () => ({
  resolve: vi.fn().mockImplementation((...segments) => {
    const joined = segments.join('/');
    if (joined.includes('default.json')) {
      return '/mock/path/configs/runtime/mappings/default.json';
    }
    if (joined.includes('user.json')) {
      return '/mock/path/configs/runtime/mappings/user.json';
    }
    return joined;
  }),
  dirname: vi.fn().mockImplementation((filePath) => {
    if (filePath.includes('/')) {
      return filePath.split('/').slice(0, -1).join('/');
    }
    return '.';
  }),
}));

describe('Configuration Loader - Security Tests', () => {
  beforeEach(() => {
    // Reset mocks and clear any prototype pollution
    vi.clearAllMocks();
    // Invalidate cache to ensure fresh config loading for each test
    invalidateMappingConfigCache();

    // Ensure clean Object prototype (defensive cleanup)
    if ('polluted' in Object.prototype) {
      delete (Object.prototype as any).polluted;
    }
    if ('isAdmin' in Object.prototype) {
      delete (Object.prototype as any).isAdmin;
    }
  });

  describe('Prototype Pollution Protection', () => {
    it('should block direct __proto__ injection in configuration files', () => {
      // Mock fs.existsSync to return true (files exist)
      (fs.existsSync as any).mockReturnValue(true);

      // Mock malicious configuration with __proto__ pollution attempt
      (fs.readFileSync as any).mockImplementation((filePath) => {
        if (filePath.includes('default.json')) {
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: {
                common: { Name: 'name' },
                objects: {},
                custom: {},
              },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        if (filePath.includes('user.json')) {
          // Malicious payload attempting prototype pollution
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: {
                common: { Email: 'email' },
                objects: {},
                custom: {},
              },
              objects: {},
              lists: {},
              relationships: {},
            },
            __proto__: { polluted: true },
          });
        }
        return '{}';
      });

      // Load configuration and verify pollution was blocked
      const config = loadMappingConfig();

      // Verify legitimate config was loaded
      expect(config.mappings.attributes.common).toEqual({
        Name: 'name',
        Email: 'email',
      });

      // Verify prototype pollution was blocked
      expect(Object.prototype).not.toHaveProperty('polluted');
      expect({}).not.toHaveProperty('polluted');
    });

    it('should block constructor property manipulation', () => {
      (fs.existsSync as any).mockReturnValue(true);

      (fs.readFileSync as any).mockImplementation((filePath) => {
        if (filePath.includes('default.json')) {
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: { common: {}, objects: {}, custom: {} },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        if (filePath.includes('user.json')) {
          // Attempt to manipulate constructor
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: { common: {}, objects: {}, custom: {} },
              objects: {},
              lists: {},
              relationships: {},
            },
            constructor: { prototype: { isAdmin: true } },
          });
        }
        return '{}';
      });

      loadMappingConfig();

      // Verify constructor manipulation was blocked
      expect(Object.prototype).not.toHaveProperty('isAdmin');
      expect({}).not.toHaveProperty('isAdmin');
    });

    it('should block nested prototype pollution attempts', () => {
      (fs.existsSync as any).mockReturnValue(true);

      (fs.readFileSync as any).mockImplementation((filePath) => {
        if (filePath.includes('default.json')) {
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: { common: {}, objects: {}, custom: {} },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        if (filePath.includes('user.json')) {
          // Deeply nested pollution attempt
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: {
                common: {},
                objects: {
                  companies: {
                    __proto__: { nestedPollution: true },
                  },
                },
                custom: {},
              },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        return '{}';
      });

      loadMappingConfig();

      // Verify nested pollution was blocked
      expect(Object.prototype).not.toHaveProperty('nestedPollution');
      expect({}).not.toHaveProperty('nestedPollution');
    });

    it('should reject dangerous keys in section updates', async () => {
      // Mock existing configuration
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: { common: {}, objects: {}, custom: {} },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });

      // Attempt to update section with dangerous key
      await expect(
        updateMappingSection('attributes.__proto__', { polluted: true })
      ).rejects.toThrow(
        'Invalid section key detected: __proto__. This key poses a security risk.'
      );

      await expect(
        updateMappingSection('attributes.constructor', { isAdmin: true })
      ).rejects.toThrow(
        'Invalid section key detected: constructor. This key poses a security risk.'
      );

      await expect(
        updateMappingSection('attributes.prototype', { malicious: true })
      ).rejects.toThrow(
        'Invalid section key detected: prototype. This key poses a security risk.'
      );
    });

    it('should filter dangerous keys from mapping data during section updates', async () => {
      // Mock existing configuration
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: { common: {}, objects: { companies: {} }, custom: {} },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });

      // Capture written configuration
      let writtenConfig: any = null;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (path, content) => {
          writtenConfig = JSON.parse(content as string);
          return undefined;
        }
      );

      // Attempt to pass mappings with dangerous keys
      const maliciousMapping = {
        Name: 'name', // legitimate mapping
        __proto__: { polluted: true }, // dangerous key
        constructor: { isAdmin: true }, // dangerous key
        Email: 'email', // legitimate mapping
      };

      await updateMappingSection(
        'attributes.objects.companies',
        maliciousMapping
      );

      // Verify only safe keys were included
      expect(writtenConfig?.mappings.attributes.objects.companies).toEqual({
        Name: 'name',
        Email: 'email',
      });

      // Verify dangerous keys were filtered out
      expect(
        writtenConfig?.mappings.attributes.objects.companies
      ).not.toHaveProperty('__proto__');
      expect(
        writtenConfig?.mappings.attributes.objects.companies
      ).not.toHaveProperty('constructor');

      // Verify prototype pollution was prevented
      expect(Object.prototype).not.toHaveProperty('polluted');
      expect(Object.prototype).not.toHaveProperty('isAdmin');
    });

    it('should handle complex nested objects safely', () => {
      (fs.existsSync as any).mockReturnValue(true);

      (fs.readFileSync as any).mockImplementation((filePath) => {
        if (filePath.includes('default.json')) {
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: { common: {}, objects: {}, custom: {} },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        if (filePath.includes('user.json')) {
          // Complex nested structure with pollution attempts
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: {
                common: {
                  Name: 'name',
                  validKey: {
                    nestedValid: 'value',
                    __proto__: { deepPollution: true }, // Should be filtered
                  },
                },
                objects: {
                  companies: {
                    Description: 'description',
                    constructor: { badStuff: true }, // Should be filtered
                  },
                },
                custom: {},
              },
              objects: {},
              lists: {},
              relationships: {},
            },
          });
        }
        return '{}';
      });

      const config = loadMappingConfig();

      // Verify legitimate nested structure is preserved
      expect(config.mappings.attributes.common.Name).toBe('name');
      expect(config.mappings.attributes.common.validKey.nestedValid).toBe(
        'value'
      );
      expect(config.mappings.attributes.objects.companies.Description).toBe(
        'description'
      );

      // Verify dangerous keys were filtered from nested objects
      expect(config.mappings.attributes.common.validKey).not.toHaveProperty(
        '__proto__'
      );
      expect(config.mappings.attributes.objects.companies).not.toHaveProperty(
        'constructor'
      );

      // Verify no prototype pollution occurred
      expect(Object.prototype).not.toHaveProperty('deepPollution');
      expect(Object.prototype).not.toHaveProperty('badStuff');
    });
  });

  describe('Performance Impact Validation', () => {
    it('should maintain acceptable performance with security checks', () => {
      // Mock large configuration to test performance
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        const largeConfig = {
          version: '1.0',
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

        // Add many nested properties to test performance
        for (let i = 0; i < 100; i++) {
          largeConfig.mappings.attributes.common[`field${i}`] = `value${i}`;
          largeConfig.mappings.attributes.objects[`object${i}`] = {
            [`property${i}`]: `value${i}`,
            nested: {
              [`nested${i}`]: `nestedValue${i}`,
            },
          };
        }

        return JSON.stringify(largeConfig);
      });

      const startTime = performance.now();
      const config = loadMappingConfig();
      const endTime = performance.now();

      // Verify configuration was loaded correctly
      expect(config.mappings.attributes.common.field0).toBe('value0');
      expect(config.mappings.attributes.objects.object0.property0).toBe(
        'value0'
      );

      // Performance should be reasonable (under 100ms for this test size)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values safely', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: {
              common: {
                nullValue: null,
                undefinedValue: undefined,
                validValue: 'test',
              },
              objects: {},
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });

      const config = loadMappingConfig();

      // Verify null/undefined are handled without issues
      expect(config.mappings.attributes.common.nullValue).toBeNull();
      expect(config.mappings.attributes.common).not.toHaveProperty(
        'undefinedValue'
      );
      expect(config.mappings.attributes.common.validValue).toBe('test');
    });

    it('should handle arrays without attempting to merge them as objects', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: {
              common: {},
              objects: {},
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
            arrayField: ['value1', 'value2'],
          },
        });
      });

      const config = loadMappingConfig();

      // Verify arrays are handled correctly
      expect(Array.isArray(config.mappings.arrayField)).toBe(true);
      expect(config.mappings.arrayField).toEqual(['value1', 'value2']);
    });

    it('should filter keys with dots from mapping data', async () => {
      // Mock existing configuration
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: { common: {}, objects: {}, custom: {} },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });

      // Capture written configuration
      let writtenConfig: any = null;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (path, content) => {
          writtenConfig = JSON.parse(content as string);
          return undefined;
        }
      );

      // Attempt to use key with dots (could be used for path traversal)
      await updateMappingSection('attributes.common', {
        validKey: 'validValue',
        'key.with.dots': 'value', // Should be filtered out
      });

      // Verify only valid keys were included
      expect(writtenConfig?.mappings.attributes.common).toEqual({
        validKey: 'validValue',
      });

      // Verify key with dots was filtered out
      expect(writtenConfig?.mappings.attributes.common).not.toHaveProperty(
        'key.with.dots'
      );
    });

    it('should handle Symbol keys safely without throwing errors', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        const symKey = Symbol('test');
        const configWithSymbol = {
          version: '1.0',
          mappings: {
            attributes: { common: {}, objects: {}, custom: {} },
            objects: {},
            lists: {},
            relationships: {},
          },
          [symKey]: 'symbolValue', // Symbol key should not cause issues
        };
        return JSON.stringify(configWithSymbol, (key, value) => {
          // JSON.stringify naturally excludes Symbol keys
          return typeof key === 'symbol' ? undefined : value;
        });
      });

      // Should not throw errors when processing objects with Symbol keys
      expect(() => loadMappingConfig()).not.toThrow();

      const config = loadMappingConfig();

      // Verify configuration loaded correctly
      expect(config.version).toBe('1.0');
      expect(config.mappings).toBeDefined();
    });
  });
});
