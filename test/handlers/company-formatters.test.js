/**
 * Tests for company formatter functions
 */
const {
  crudToolConfigs,
} = require('../../dist/handlers/tool-configs/companies/crud');

describe('Company Formatters', () => {
  describe('CRUD operation formatters', () => {
    // Mock company data with nested structure similar to Attio API
    const mockCompany = {
      id: { record_id: 'test-id-123' },
      values: {
        name: [{ value: 'Test Company' }],
        website: [{ value: 'https://test.com' }],
        description: [{ value: 'A test company description' }],
      },
    };

    test('formatters should properly extract company name and ID', () => {
      // Test create formatter
      const createResult = crudToolConfigs.create.formatResult(mockCompany);
      expect(createResult).toBe(
        'Company created: Test Company (ID: test-id-123)'
      );

      // Test update formatter
      const updateResult = crudToolConfigs.update.formatResult(mockCompany);
      expect(updateResult).toBe(
        'Company updated: Test Company (ID: test-id-123)'
      );

      // Test update attribute formatter
      const updateAttrResult =
        crudToolConfigs.updateAttribute.formatResult(mockCompany);
      expect(updateAttrResult).toBe(
        'Company attribute updated for: Test Company (ID: test-id-123)'
      );
    });

    test('formatters should handle missing name values', () => {
      const noNameCompany = {
        id: { record_id: 'test-id-456' },
        values: { website: [{ value: 'https://test.com' }] },
      };

      const result =
        crudToolConfigs.updateAttribute.formatResult(noNameCompany);
      expect(result).toBe(
        'Company attribute updated for: Unnamed (ID: test-id-456)'
      );
    });

    test('formatters should handle missing ID', () => {
      const noIdCompany = {
        values: { name: [{ value: 'No ID Company' }] },
      };

      const result = crudToolConfigs.updateAttribute.formatResult(noIdCompany);
      expect(result).toBe(
        'Company attribute updated for: No ID Company (ID: unknown)'
      );
    });

    test('formatters should handle completely invalid company object', () => {
      const invalidCompany = {};

      const result =
        crudToolConfigs.updateAttribute.formatResult(invalidCompany);
      expect(result).toBe(
        'Company attribute updated for: Unnamed (ID: unknown)'
      );
    });

    test('formatters should handle null values', () => {
      const nullValuesCompany = {
        id: null,
        values: { name: null },
      };

      const result =
        crudToolConfigs.updateAttribute.formatResult(nullValuesCompany);
      expect(result).toBe(
        'Company attribute updated for: Unnamed (ID: unknown)'
      );
    });
  });
});
