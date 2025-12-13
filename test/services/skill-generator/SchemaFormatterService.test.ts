/**
 * Unit tests for SchemaFormatterService
 *
 * Tests Handlebars template rendering, format outputs, and helper functions.
 *
 * @see Issue #983
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaFormatterService } from '@/services/skill-generator/SchemaFormatterService.js';
import type { WorkspaceSchema } from '@/services/skill-generator/types.js';

describe('SchemaFormatterService', () => {
  let service: SchemaFormatterService;
  let mockSchema: WorkspaceSchema;

  beforeEach(() => {
    service = new SchemaFormatterService();

    // Create mock schema for testing
    mockSchema = {
      metadata: {
        generatedAt: '2025-12-12T00:00:00.000Z',
        workspace: 'test-workspace',
        objects: ['companies', 'people'],
      },
      objects: [
        {
          objectSlug: 'companies',
          displayName: 'Companies',
          attributes: [
            {
              apiSlug: 'name',
              displayName: 'Name',
              type: 'text',
              isMultiselect: false,
              isUnique: false,
              isRequired: true,
              isWritable: true,
            },
            {
              apiSlug: 'industry',
              displayName: 'Industry',
              type: 'select',
              isMultiselect: false,
              isUnique: false,
              isRequired: false,
              isWritable: true,
              options: [
                { id: 'opt1', title: 'Technology', value: 'technology' },
                { id: 'opt2', title: 'Healthcare', value: 'healthcare' },
              ],
              optionsTruncated: false,
              totalOptions: 2,
            },
          ],
        },
        {
          objectSlug: 'people',
          displayName: 'People',
          attributes: [
            {
              apiSlug: 'name',
              displayName: 'Name',
              type: 'personal-name',
              isMultiselect: false,
              isUnique: false,
              isRequired: true,
              isWritable: true,
              complexTypeStructure: {
                first_name: 'string (required)',
                last_name: 'string | null',
                full_name: 'string (auto-generated)',
              },
            },
          ],
        },
      ],
    };
  });

  describe('format', () => {
    it('should format as skill', async () => {
      const result = await service.format(mockSchema, 'skill');

      expect(result.format).toBe('skill');
      expect(result.files).toHaveProperty('SKILL.md');
      expect(result.files).toHaveProperty('resources/attribute-reference.md');
      expect(result.files).toHaveProperty('resources/complex-types.md');
    });

    it('should format as markdown', async () => {
      const result = await service.format(mockSchema, 'markdown');

      expect(result.format).toBe('markdown');
      expect(result.files).toHaveProperty('attio-workspace-schema.md');
      expect(Object.keys(result.files)).toHaveLength(1);
    });

    it('should format as JSON', async () => {
      const result = await service.format(mockSchema, 'json');

      expect(result.format).toBe('json');
      expect(result.files).toHaveProperty('attio-workspace-schema.json');

      // Verify JSON is valid
      const json = JSON.parse(result.files['attio-workspace-schema.json']);
      expect(json.metadata.workspace).toBe('test-workspace');
      expect(json.objects).toHaveLength(2);
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.format(mockSchema, 'invalid' as any)
      ).rejects.toThrow('Unsupported format: invalid');
    });
  });

  describe('skill format', () => {
    it('should generate valid YAML frontmatter', async () => {
      const result = await service.format(mockSchema, 'skill');
      const skillMd = result.files['SKILL.md'];

      expect(skillMd).toContain('---');
      expect(skillMd).toContain('name: attio-workspace-schema');
      expect(skillMd).toMatch(/description:.*companies.*people/);
    });

    it('should include Display Name → API Slug mapping table', async () => {
      const result = await service.format(mockSchema, 'skill');
      const skillMd = result.files['SKILL.md'];

      expect(skillMd).toContain('Display Name → API Slug Mapping');
      expect(skillMd).toContain('### Companies');
      expect(skillMd).toContain('| Name | `name`');
      expect(skillMd).toContain('| Industry | `industry`');
    });

    it('should display checkmarks for boolean flags', async () => {
      const result = await service.format(mockSchema, 'skill');
      const skillMd = result.files['SKILL.md'];

      // Name is required (✓), not unique (✗)
      expect(skillMd).toMatch(/Name.*text.*✗.*✓.*✗/);
    });

    it('should include usage guidelines', async () => {
      const result = await service.format(mockSchema, 'skill');
      const skillMd = result.files['SKILL.md'];

      expect(skillMd).toContain('Usage Guidelines');
      expect(skillMd).toContain('Always use API Slugs');
      expect(skillMd).toContain('MCP discovery tools');
    });

    it('should link to resources', async () => {
      const result = await service.format(mockSchema, 'skill');
      const skillMd = result.files['SKILL.md'];

      expect(skillMd).toContain('resources/attribute-reference.md');
      expect(skillMd).toContain('resources/complex-types.md');
    });
  });

  describe('attribute reference', () => {
    it('should include detailed attribute specifications', async () => {
      const result = await service.format(mockSchema, 'skill');
      const attrRef = result.files['resources/attribute-reference.md'];

      expect(attrRef).toContain('### Name (`name`)');
      expect(attrRef).toContain('**Type**: `text`');
      expect(attrRef).toContain('**Required**: Yes');
    });

    it('should include select options table', async () => {
      const result = await service.format(mockSchema, 'skill');
      const attrRef = result.files['resources/attribute-reference.md'];

      expect(attrRef).toContain('### Industry (`industry`)');
      expect(attrRef).toContain('**Valid Options**');
      expect(attrRef).toContain('| `opt1` | Technology | `technology` |');
      expect(attrRef).toContain('| `opt2` | Healthcare | `healthcare` |');
    });

    it('should show truncation warning when options are truncated', async () => {
      // Create schema with truncated options
      const truncatedSchema: WorkspaceSchema = {
        ...mockSchema,
        objects: [
          {
            objectSlug: 'companies',
            displayName: 'Companies',
            attributes: [
              {
                apiSlug: 'industry',
                displayName: 'Industry',
                type: 'select',
                isMultiselect: false,
                isUnique: false,
                isRequired: false,
                isWritable: true,
                options: [
                  { id: 'opt1', title: 'Technology', value: 'technology' },
                ],
                optionsTruncated: true,
                totalOptions: 30,
              },
            ],
          },
        ],
      };

      const result = await service.format(truncatedSchema, 'skill');
      const attrRef = result.files['resources/attribute-reference.md'];

      expect(attrRef).toContain('Showing 1 of 30 options');
      expect(attrRef).toContain('records_get_attribute_options');
    });

    it('should include complex type structures', async () => {
      const result = await service.format(mockSchema, 'skill');
      const attrRef = result.files['resources/attribute-reference.md'];

      expect(attrRef).toContain('### Name (`name`)');
      expect(attrRef).toContain('**Structure**:');
      expect(attrRef).toContain('first_name');
      expect(attrRef).toContain('full_name');
    });
  });

  describe('complex types documentation', () => {
    it('should document location structure', async () => {
      const result = await service.format(mockSchema, 'skill');
      const complexTypes = result.files['resources/complex-types.md'];

      expect(complexTypes).toContain('## Location');
      expect(complexTypes).toContain('ALL 10 fields');
      expect(complexTypes).toContain('line_1');
      expect(complexTypes).toContain('locality');
      expect(complexTypes).toContain('region');
      expect(complexTypes).toContain('postcode');
    });

    it('should document personal-name structure', async () => {
      const result = await service.format(mockSchema, 'skill');
      const complexTypes = result.files['resources/complex-types.md'];

      expect(complexTypes).toContain('## Personal Name');
      expect(complexTypes).toContain('first_name');
      expect(complexTypes).toContain('last_name');
      expect(complexTypes).toContain('full_name');
    });

    it('should show common mistakes and correct examples', async () => {
      const result = await service.format(mockSchema, 'skill');
      const complexTypes = result.files['resources/complex-types.md'];

      expect(complexTypes).toContain('❌ **Wrong**');
      expect(complexTypes).toContain('✅ **Correct**');
    });
  });

  describe('markdown format (combined)', () => {
    it('should combine all sections into single file', async () => {
      const result = await service.format(mockSchema, 'markdown');
      const markdown = result.files['attio-workspace-schema.md'];

      // Should contain content from all templates
      expect(markdown).toContain('Display Name → API Slug Mapping');
      expect(markdown).toContain('Detailed Attribute Reference');
      expect(markdown).toContain('Complex Type Structures');
    });

    it('should separate sections with horizontal rules', async () => {
      const result = await service.format(mockSchema, 'markdown');
      const markdown = result.files['attio-workspace-schema.md'];

      expect(markdown).toContain('---');
    });
  });

  describe('JSON format', () => {
    it('should preserve all schema data', async () => {
      const result = await service.format(mockSchema, 'json');
      const json = JSON.parse(result.files['attio-workspace-schema.json']);

      expect(json.metadata.workspace).toBe('test-workspace');
      expect(json.objects).toHaveLength(2);
      expect(json.objects[0].objectSlug).toBe('companies');
      expect(json.objects[0].attributes).toHaveLength(2);
      expect(json.objects[1].objectSlug).toBe('people');
    });

    it('should format JSON with proper indentation', async () => {
      const result = await service.format(mockSchema, 'json');
      const jsonStr = result.files['attio-workspace-schema.json'];

      // Check for proper indentation (2 spaces)
      expect(jsonStr).toContain('  "metadata"');
      expect(jsonStr).toContain('    "generatedAt"');
    });
  });
});
