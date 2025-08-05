/**
 * Tests for the configuration loader
 */

import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadMappingConfig,
  type MappingConfig,
  updateMappingSection,
  writeMappingConfig,
} from '../../src/utils/config-loader';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    promises: {
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdirSync: vi.fn(),
}));

describe('Configuration Loader', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('loadMappingConfig', () => {
    it('should return an empty config when no files exist', () => {
      // Mock fs.existsSync to return false (files don't exist)
      (fs.existsSync as vi.Mock).mockReturnValue(false);

      const config = loadMappingConfig();

      // Expect a default empty config
      expect(config).toEqual({
        version: '1.0',
        metadata: expect.any(Object),
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
      });
    });

    it('should load and merge default and user configurations', () => {
      // Mock fs.existsSync to return true (files exist)
      (fs.existsSync as vi.Mock).mockReturnValue(true);

      // Mock fs.readFileSync to return test configurations
      (fs.readFileSync as vi.Mock).mockImplementation((filePath) => {
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
          return JSON.stringify({
            version: '1.0',
            mappings: {
              attributes: {
                common: { Email: 'email' },
                objects: {
                  companies: { 'B2B Segment': 'type_persona' },
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

      // Expect merged configuration
      expect(config.mappings.attributes.common).toEqual({
        Name: 'name',
        Email: 'email',
      });
      expect(config.mappings.attributes.objects).toEqual({
        companies: { 'B2B Segment': 'type_persona' },
      });
    });

    it('should handle invalid JSON in configuration files', () => {
      // Mock fs.existsSync to return true (files exist)
      (fs.existsSync as vi.Mock).mockReturnValue(true);

      // Mock fs.readFileSync to return invalid JSON
      (fs.readFileSync as vi.Mock).mockImplementation((filePath) => {
        if (filePath.includes('default.json')) {
          return '{ invalid json';
        }
        return '{}';
      });

      // Mock console.warn to capture warnings
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

      const config = loadMappingConfig();

      // Expect a warning to be logged
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Expect a default empty config
      expect(config).toEqual({
        version: '1.0',
        metadata: expect.any(Object),
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
      });

      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });

  describe('writeMappingConfig', () => {
    it('should write configuration to file', async () => {
      // Mock fs.existsSync to return true (directory exists)
      (fs.existsSync as vi.Mock).mockReturnValue(true);

      const config: MappingConfig = {
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
      };

      await writeMappingConfig(config, 'test-output.json');

      // Expect fs.promises.writeFile to be called with the correct arguments
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        'test-output.json',
        expect.any(String),
        'utf8'
      );

      // Verify the written content
      const writtenContent = (fs.promises.writeFile as vi.Mock).mock
        .calls[0][1];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent.version).toBe('1.0');
      expect(parsedContent.mappings.attributes.common).toEqual({
        Name: 'name',
      });
      expect(parsedContent.metadata.generated).toBeDefined();
    });

    it('should create directory if it does not exist', async () => {
      // Mock fs.existsSync to return false (directory doesn't exist)
      (fs.existsSync as vi.Mock).mockReturnValue(false);

      const config: MappingConfig = {
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

      await writeMappingConfig(config, 'test/dir/output.json');

      // Expect fs.mkdirSync to be called to create the directory
      expect(fs.mkdirSync).toHaveBeenCalledWith('test/dir', {
        recursive: true,
      });
    });
  });

  describe('updateMappingSection', () => {
    beforeEach(() => {
      // Mock loadMappingConfig to return a test configuration
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        return JSON.stringify({
          version: '1.0',
          mappings: {
            attributes: {
              common: { Name: 'name' },
              objects: {
                companies: { Existing: 'existing' },
              },
              custom: {},
            },
            objects: {},
            lists: {},
            relationships: {},
          },
        });
      });
    });

    it('should update a specific section with merged mappings', async () => {
      // Mock writeMappingConfig to capture the updated config
      let updatedConfig: any = null;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (path, content) => {
          updatedConfig = JSON.parse(content as string);
          return;
        }
      );

      await updateMappingSection('attributes.objects.companies', {
        New: 'new',
      });

      // Expect the section to be updated with merged mappings
      expect(updatedConfig?.mappings.attributes.objects.companies).toEqual({
        Existing: 'existing',
        New: 'new',
      });
    });

    it('should replace section when merge is false', async () => {
      // Mock writeMappingConfig to capture the updated config
      let updatedConfig: any = null;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (path, content) => {
          updatedConfig = JSON.parse(content as string);
          return;
        }
      );

      await updateMappingSection(
        'attributes.objects.companies',
        {
          New: 'new',
        },
        false
      );

      // Expect the section to be replaced (not merged)
      expect(updatedConfig?.mappings.attributes.objects.companies).toEqual({
        New: 'new',
      });
    });

    it('should create missing sections as needed', async () => {
      // Mock writeMappingConfig to capture the updated config
      let updatedConfig: any = null;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (path, content) => {
          updatedConfig = JSON.parse(content as string);
          return;
        }
      );

      await updateMappingSection('attributes.objects.newobject', {
        Field: 'slug',
      });

      // Expect the new section to be created
      expect(updatedConfig?.mappings.attributes.objects.newobject).toEqual({
        Field: 'slug',
      });
    });
  });
});
