/**
 * Unit tests for Attribute Not Found Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Tests Levenshtein distance algorithm and attribute suggestion logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attributeNotFoundEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/attribute-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

const { mockHandleUniversalDiscoverAttributes } = vi.hoisted(() => ({
  mockHandleUniversalDiscoverAttributes: vi.fn(),
}));

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalDiscoverAttributes: mockHandleUniversalDiscoverAttributes,
  getSingularResourceType: (type: string) => type.slice(0, -1),
}));

describe('attribute-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "Cannot find attribute with slug/ID" pattern', () => {
      const error = new Error(
        'Cannot find attribute with slug/ID "invalid_field".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(attributeNotFoundEnhancer.matches(error, context)).toBe(true);
    });

    it('should match pattern with different attribute names', () => {
      const error = new Error(
        'Cannot find attribute with slug/ID "company_name".'
      );
      const context: CrudErrorContext = {
        operation: 'update',
        resourceType: 'companies',
      };

      expect(attributeNotFoundEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Invalid field value');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(attributeNotFoundEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'Cannot find attribute with slug/ID "test_field".';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(attributeNotFoundEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance() - with suggestions', () => {
    it('should suggest similar attributes using Levenshtein distance', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'company_name', title: 'Company Name', api_slug: 'name' },
          {
            name: 'company_size',
            title: 'Company Size',
            api_slug: 'size',
          },
          { name: 'revenue', title: 'Revenue', api_slug: 'revenue' },
          { name: 'industry', title: 'Industry', api_slug: 'industry' },
        ],
      });

      const error = new Error(
        'Cannot find attribute with slug/ID "compny_name".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { compny_name: 'Test' },
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Attribute "compny_name" does not exist');
      expect(result).toContain('Did you mean:');
      expect(result).toContain('"company_name"');
      expect(result).toContain('records_discover_attributes');
      expect(result).toContain('resource_type: "companies"');
      expect(mockHandleUniversalDiscoverAttributes).toHaveBeenCalledWith(
        'companies'
      );
    });

    it('should find multiple similar attributes', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'email', title: 'Email', api_slug: 'email' },
          {
            name: 'email_address',
            title: 'Email Address',
            api_slug: 'email_address',
          },
          {
            name: 'primary_email',
            title: 'Primary Email',
            api_slug: 'primary_email',
          },
        ],
      });

      const error = new Error('Cannot find attribute with slug/ID "emai".');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Did you mean:');
      expect(result).toContain('"email"');
      // Should suggest closest matches first
    });

    it('should limit suggestions to 3 results', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'name', title: 'Name', api_slug: 'name' },
          { name: 'names', title: 'Names', api_slug: 'names' },
          { name: 'name_1', title: 'Name 1', api_slug: 'name_1' },
          { name: 'name_2', title: 'Name 2', api_slug: 'name_2' },
          { name: 'name_3', title: 'Name 3', api_slug: 'name_3' },
        ],
      });

      const error = new Error('Cannot find attribute with slug/ID "nam".');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Did you mean:');
      // Count comma-separated suggestions (should be max 3)
      const suggestions = result
        ?.match(/Did you mean: (.+?)\?/)?.[1]
        ?.split(', ');
      expect(suggestions).toBeDefined();
      expect(suggestions!.length).toBeLessThanOrEqual(3);
    });

    it('should only suggest attributes within distance 3', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'company', title: 'Company', api_slug: 'company' },
          { name: 'revenue', title: 'Revenue', api_slug: 'revenue' },
          { name: 'industry', title: 'Industry', api_slug: 'industry' },
        ],
      });

      const error = new Error(
        'Cannot find attribute with slug/ID "xyz_abc_123".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Attribute "xyz_abc_123" does not exist');
      expect(result).not.toContain('Did you mean:');
      expect(result).toContain('records_discover_attributes');
    });

    it('should be case-insensitive when finding similar attributes', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          {
            name: 'CompanyName',
            title: 'Company Name',
            api_slug: 'company_name',
          },
        ],
      });

      const error = new Error(
        'Cannot find attribute with slug/ID "companyname".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Did you mean:');
      expect(result).toContain('"CompanyName"');
    });

    it('should include all attribute name variants (name, title, api_slug)', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [{ name: 'domain', title: 'Domain Name', api_slug: 'domains' }],
      });

      const error = new Error(
        'Cannot find attribute with slug/ID "domainname".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      // Should find "Domain Name" as close match
      expect(result).toContain('Did you mean:');
    });
  });

  describe('enhance() - without suggestions', () => {
    it('should omit "Did you mean" when no similar attributes found', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'revenue', title: 'Revenue', api_slug: 'revenue' },
          { name: 'industry', title: 'Industry', api_slug: 'industry' },
        ],
      });

      const error = new Error(
        'Cannot find attribute with slug/ID "completely_different_field".'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain(
        'Attribute "completely_different_field" does not exist'
      );
      expect(result).not.toContain('Did you mean:');
      expect(result).toContain('records_discover_attributes');
    });

    it('should fallback when handleUniversalDiscoverAttributes fails', async () => {
      mockHandleUniversalDiscoverAttributes.mockRejectedValue(
        new Error('API error')
      );

      const error = new Error('Cannot find attribute with slug/ID "test".');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Attribute "test" does not exist on companies');
      expect(result).not.toContain('Did you mean:');
      expect(result).toContain('records_discover_attributes');
    });

    it('should return null when pattern does not match', async () => {
      const error = new Error('Some other error message');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toBeNull();
      expect(mockHandleUniversalDiscoverAttributes).not.toHaveBeenCalled();
    });
  });

  describe('enhance() - edge cases', () => {
    it('should handle empty attribute list', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [],
      });

      const error = new Error('Cannot find attribute with slug/ID "test".');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      expect(result).toContain('Attribute "test" does not exist');
      expect(result).not.toContain('Did you mean:');
      expect(result).toContain('records_discover_attributes');
    });

    it('should handle attributes with missing name/title/api_slug', async () => {
      mockHandleUniversalDiscoverAttributes.mockResolvedValue({
        all: [
          { name: 'field1' }, // missing title and api_slug
          { title: 'Field 2' }, // missing name and api_slug
          { api_slug: 'field_3' }, // missing name and title
        ],
      });

      const error = new Error('Cannot find attribute with slug/ID "fiel".');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await attributeNotFoundEnhancer.enhance(error, context);

      // Should still suggest available name variants
      expect(result).toContain('Attribute "fiel" does not exist');
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(attributeNotFoundEnhancer.errorName).toBe('attribute_not_found');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(attributeNotFoundEnhancer.name).toBe('attribute-not-found');
    });
  });
});
