/**
 * Unit tests for OutputWriterService
 *
 * Tests file I/O operations, ZIP creation, and security validation.
 *
 * @see Issue #983
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OutputWriterService } from '@/services/skill-generator/OutputWriterService.js';
import type {
  FormattedOutput,
  GenerateSkillConfig,
} from '@/services/skill-generator/types.js';

describe('OutputWriterService', () => {
  let service: OutputWriterService;
  let testOutputDir: string;

  beforeEach(async () => {
    service = new OutputWriterService();
    testOutputDir = path.join(process.cwd(), 'test-output-temp');

    // Clean up test directory if it exists
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('write', () => {
    it('should write skill format files to disk', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: {
          'SKILL.md': '# Test Skill',
          'resources/companies-attributes.md': '# Companies Attributes',
          'resources/complex-types.md': '# Complex Types',
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.format).toBe('skill');
      expect(result.files).toHaveLength(3);
      expect(result.files).toContain('SKILL.md');
      expect(result.files).toContain('resources/companies-attributes.md');
      expect(result.files).toContain('resources/complex-types.md');

      // Verify files exist on disk
      const skillPath = path.join(result.path, 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf8');
      expect(content).toBe('# Test Skill');
    });

    it('should create nested directory structure', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: {
          'SKILL.md': 'content',
          'resources/nested/deep/file.md': 'nested content',
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      // Verify nested file exists
      const nestedPath = path.join(
        result.path,
        'resources/nested/deep/file.md'
      );
      const content = await fs.readFile(nestedPath, 'utf8');
      expect(content).toBe('nested content');
    });

    it('should write markdown format to single file', async () => {
      const formatted: FormattedOutput = {
        format: 'markdown',
        files: {
          'attio-workspace-schema.md': '# Workspace Schema\n\nContent here',
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'markdown',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.format).toBe('markdown');
      expect(result.files).toHaveLength(1);
      expect(result.path).toContain('attio-workspace-schema-markdown');

      // Verify file content
      const mdPath = path.join(result.path, 'attio-workspace-schema.md');
      const content = await fs.readFile(mdPath, 'utf8');
      expect(content).toContain('Workspace Schema');
    });

    it('should write JSON format', async () => {
      const formatted: FormattedOutput = {
        format: 'json',
        files: {
          'attio-workspace-schema.json': JSON.stringify(
            { test: 'data' },
            null,
            2
          ),
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'json',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.format).toBe('json');
      expect(result.path).toContain('attio-workspace-schema-json');

      // Verify JSON is valid
      const jsonPath = path.join(result.path, 'attio-workspace-schema.json');
      const content = await fs.readFile(jsonPath, 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed.test).toBe('data');
    });
  });

  describe('ZIP creation', () => {
    it('should create ZIP when zip flag is true', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: {
          'SKILL.md': '# Test',
          'resources/test.md': 'Resource content',
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: testOutputDir,
        zip: true, // Enable ZIP
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.files).toContain('attio-workspace-skill.zip');

      // Verify ZIP file exists
      const zipPath = `${result.path}.zip`;
      const stats = await fs.stat(zipPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should not create ZIP when zip flag is false', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: {
          'SKILL.md': '# Test',
        },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: testOutputDir,
        zip: false, // No ZIP
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.files).not.toContain('attio-workspace-skill.zip');

      // Verify ZIP file does NOT exist
      const zipPath = `${result.path}.zip`;
      await expect(fs.access(zipPath)).rejects.toThrow();
    });
  });

  describe('path validation', () => {
    it('should reject directory traversal attempts', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: { 'SKILL.md': 'test' },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: '../../../etc', // Attempt to escape
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      await expect(service.write(formatted, config)).rejects.toThrow(
        'directory traversal detected'
      );
    });

    it('should accept valid relative paths', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: { 'SKILL.md': 'test' },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: './test-output-temp/valid', // Valid relative path
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.path).toBeTruthy();
      expect(result.files).toHaveLength(1);

      // Clean up
      await fs.rm('./test-output-temp', { recursive: true, force: true });
    });

    it('should accept absolute paths within allowed directory', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: { 'SKILL.md': 'test' },
      };

      const absoluteOutputDir = path.resolve(testOutputDir);

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: absoluteOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.path).toBeTruthy();
      expect(result.files).toHaveLength(1);
    });
  });

  describe('output naming', () => {
    it('should name skill output as "attio-workspace-skill"', async () => {
      const formatted: FormattedOutput = {
        format: 'skill',
        files: { 'SKILL.md': 'test' },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'skill',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.path).toContain('attio-workspace-skill');
    });

    it('should name markdown output as "attio-workspace-schema-markdown"', async () => {
      const formatted: FormattedOutput = {
        format: 'markdown',
        files: { 'attio-workspace-schema.md': 'test' },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'markdown',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.path).toContain('attio-workspace-schema-markdown');
    });

    it('should name JSON output as "attio-workspace-schema-json"', async () => {
      const formatted: FormattedOutput = {
        format: 'json',
        files: { 'attio-workspace-schema.json': '{}' },
      };

      const config: GenerateSkillConfig = {
        objects: ['companies'],
        format: 'json',
        outputDir: testOutputDir,
        zip: false,
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        apiKey: 'test-key',
      };

      const result = await service.write(formatted, config);

      expect(result.path).toContain('attio-workspace-schema-json');
    });
  });
});
