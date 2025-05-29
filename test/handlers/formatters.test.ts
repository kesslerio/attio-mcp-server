/**
 * Tests for formatter functions to ensure proper string formatting
 */
import { describe, it, expect } from 'vitest';
import { crudToolConfigs } from '../../src/handlers/tool-configs/companies/crud.js';
import { Company } from '../../src/types/attio.js';

describe('Company Formatters', () => {
  describe('CRUD operation formatters', () => {
    // Mock company data with nested structure similar to Attio API
    const mockCompany: Partial<Company> = {
      id: { record_id: 'test-id-123' },
      values: {
        name: [{ value: 'Test Company' }],
        website: [{ value: 'https://test.com' }],
        description: [{ value: 'A test company description' }],
      },
    };

    it('should correctly format company creation result', () => {
      const formatted = crudToolConfigs.create.formatResult!(
        mockCompany as Company
      );
      expect(formatted).toBe('Company created: Test Company (ID: test-id-123)');
    });

    it('should correctly format company update result', () => {
      const formatted = crudToolConfigs.update.formatResult!(
        mockCompany as Company
      );
      expect(formatted).toBe('Company updated: Test Company (ID: test-id-123)');
    });

    it('should correctly format company attribute update result', () => {
      const formatted = crudToolConfigs.updateAttribute.formatResult!(
        mockCompany as Company
      );
      expect(formatted).toBe(
        'Company attribute updated for: Test Company (ID: test-id-123)'
      );
    });

    it('should handle missing name values gracefully', () => {
      const noNameCompany: Partial<Company> = {
        id: { record_id: 'test-id-456' },
        values: { website: [{ value: 'https://test.com' }] },
      };
      const formatted = crudToolConfigs.updateAttribute.formatResult!(
        noNameCompany as Company
      );
      expect(formatted).toBe(
        'Company attribute updated for: Unnamed (ID: test-id-456)'
      );
    });

    it('should handle completely empty values gracefully', () => {
      const emptyCompany: Partial<Company> = {
        id: { record_id: 'test-id-789' },
        values: {},
      };
      const formatted = crudToolConfigs.updateAttribute.formatResult!(
        emptyCompany as Company
      );
      expect(formatted).toBe(
        'Company attribute updated for: Unnamed (ID: test-id-789)'
      );
    });

    it('should handle missing ID gracefully', () => {
      const noIdCompany: Partial<Company> = {
        values: { name: [{ value: 'No ID Company' }] },
      };
      const formatted = crudToolConfigs.updateAttribute.formatResult!(
        noIdCompany as Company
      );
      expect(formatted).toBe(
        'Company attribute updated for: No ID Company (ID: unknown)'
      );
    });

    it('should handle completely invalid company object gracefully', () => {
      const invalidCompany = {} as Company;
      const formatted =
        crudToolConfigs.updateAttribute.formatResult!(invalidCompany);
      expect(formatted).toBe(
        'Company attribute updated for: Unnamed (ID: unknown)'
      );
    });
  });
});
