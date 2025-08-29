/**
 * Split: UniversalUtilityService resource type helpers
 */
import { describe, it, expect } from 'vitest';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';

describe('UniversalUtilityService', () => {
  describe('formatResourceType', () => {
    it('should format companies resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe('company');
    });

    it('should format people resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.PEOPLE
      );
      expect(result).toBe('person');
    });

    it('should format lists resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.LISTS
      );
      expect(result).toBe('list');
    });

    it('should format records resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.RECORDS
      );
      expect(result).toBe('record');
    });

    it('should format deals resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.DEALS
      );
      expect(result).toBe('deal');
    });

    it('should format tasks resource type', () => {
      const result = UniversalUtilityService.formatResourceType(
        UniversalResourceType.TASKS
      );
      expect(result).toBe('task');
    });

    it('should return unknown resource type as-is', () => {
      const result = UniversalUtilityService.formatResourceType(
        'unknown' as UniversalResourceType
      );
      expect(result).toBe('unknown');
    });
  });

  describe('getSingularResourceType', () => {
    it('should return singular form for all resource types', () => {
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.COMPANIES
        )
      ).toBe('company');
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.PEOPLE
        )
      ).toBe('person');
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.LISTS
        )
      ).toBe('list');
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.RECORDS
        )
      ).toBe('record');
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.DEALS
        )
      ).toBe('deal');
      expect(
        UniversalUtilityService.getSingularResourceType(
          UniversalResourceType.TASKS
        )
      ).toBe('task');
    });
  });

  describe('isValidResourceType', () => {
    it('should validate known resource types', () => {
      expect(UniversalUtilityService.isValidResourceType('companies')).toBe(
        true
      );
      expect(UniversalUtilityService.isValidResourceType('people')).toBe(true);
      expect(UniversalUtilityService.isValidResourceType('lists')).toBe(true);
      expect(UniversalUtilityService.isValidResourceType('records')).toBe(true);
      expect(UniversalUtilityService.isValidResourceType('deals')).toBe(true);
      expect(UniversalUtilityService.isValidResourceType('tasks')).toBe(true);
    });

    it('should reject unknown resource types', () => {
      expect(UniversalUtilityService.isValidResourceType('invalid')).toBe(
        false
      );
      expect(UniversalUtilityService.isValidResourceType('')).toBe(false);
      expect(UniversalUtilityService.isValidResourceType('company')).toBe(
        false
      );
    });
  });

  describe('getPluralResourceType', () => {
    it('should return plural form for all resource types', () => {
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.COMPANIES
        )
      ).toBe('companies');
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.PEOPLE
        )
      ).toBe('people');
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.LISTS
        )
      ).toBe('lists');
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.RECORDS
        )
      ).toBe('records');
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.DEALS
        )
      ).toBe('deals');
      expect(
        UniversalUtilityService.getPluralResourceType(
          UniversalResourceType.TASKS
        )
      ).toBe('tasks');
    });
  });

  describe('supportsObjectRecordsApi', () => {
    it('should return true for resource types that support object records API', () => {
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.RECORDS
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.DEALS
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.COMPANIES
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.PEOPLE
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.LISTS
        )
      ).toBe(true);
    });

    it('should return false for tasks (uses different API)', () => {
      expect(
        UniversalUtilityService.supportsObjectRecordsApi(
          UniversalResourceType.TASKS
        )
      ).toBe(false);
    });
  });

  describe('getApiEndpoint', () => {
    it('should return correct API endpoints for all resource types', () => {
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.COMPANIES)
      ).toBe('/companies');
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.PEOPLE)
      ).toBe('/people');
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.LISTS)
      ).toBe('/lists');
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.RECORDS)
      ).toBe('/objects/records');
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.DEALS)
      ).toBe('/objects/deals');
      expect(
        UniversalUtilityService.getApiEndpoint(UniversalResourceType.TASKS)
      ).toBe('/tasks');
    });

    it('should throw error for unknown resource type', () => {
      expect(() => {
        UniversalUtilityService.getApiEndpoint(
          'unknown' as UniversalResourceType
        );
      }).toThrow('Unknown resource type: unknown');
    });
  });

  describe('requiresSpecialHandling', () => {
    it('should return true for resource types that require special handling', () => {
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.TASKS
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.COMPANIES
        )
      ).toBe(true);
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.PEOPLE
        )
      ).toBe(true);
    });

    it('should return false for standard resource types', () => {
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.LISTS
        )
      ).toBe(false);
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.RECORDS
        )
      ).toBe(false);
      expect(
        UniversalUtilityService.requiresSpecialHandling(
          UniversalResourceType.DEALS
        )
      ).toBe(false);
    });
  });

  describe('normalizeResourceType', () => {
    it('should normalize singular forms to plural UniversalResourceType', () => {
      expect(UniversalUtilityService.normalizeResourceType('company')).toBe(
        UniversalResourceType.COMPANIES
      );
      expect(UniversalUtilityService.normalizeResourceType('person')).toBe(
        UniversalResourceType.PEOPLE
      );
      expect(UniversalUtilityService.normalizeResourceType('list')).toBe(
        UniversalResourceType.LISTS
      );
      expect(UniversalUtilityService.normalizeResourceType('record')).toBe(
        UniversalResourceType.RECORDS
      );
      expect(UniversalUtilityService.normalizeResourceType('deal')).toBe(
        UniversalResourceType.DEALS
      );
      expect(UniversalUtilityService.normalizeResourceType('task')).toBe(
        UniversalResourceType.TASKS
      );
    });

    it('should normalize plural forms to UniversalResourceType', () => {
      expect(UniversalUtilityService.normalizeResourceType('companies')).toBe(
        UniversalResourceType.COMPANIES
      );
      expect(UniversalUtilityService.normalizeResourceType('people')).toBe(
        UniversalResourceType.PEOPLE
      );
      expect(UniversalUtilityService.normalizeResourceType('lists')).toBe(
        UniversalResourceType.LISTS
      );
      expect(UniversalUtilityService.normalizeResourceType('records')).toBe(
        UniversalResourceType.RECORDS
      );
      expect(UniversalUtilityService.normalizeResourceType('deals')).toBe(
        UniversalResourceType.DEALS
      );
      expect(UniversalUtilityService.normalizeResourceType('tasks')).toBe(
        UniversalResourceType.TASKS
      );
    });

    it('should handle case variations and whitespace', () => {
      expect(UniversalUtilityService.normalizeResourceType('  COMPANY  ')).toBe(
        UniversalResourceType.COMPANIES
      );
      expect(UniversalUtilityService.normalizeResourceType('PeOpLe')).toBe(
        UniversalResourceType.PEOPLE
      );
      expect(UniversalUtilityService.normalizeResourceType('\tTASKS\n')).toBe(
        UniversalResourceType.TASKS
      );
    });

    it('should return existing valid UniversalResourceType', () => {
      expect(
        UniversalUtilityService.normalizeResourceType(
          UniversalResourceType.COMPANIES
        )
      ).toBe(UniversalResourceType.COMPANIES);
      expect(
        UniversalUtilityService.normalizeResourceType(
          UniversalResourceType.TASKS
        )
      ).toBe(UniversalResourceType.TASKS);
    });

    it('should return null for unknown resource types', () => {
      expect(UniversalUtilityService.normalizeResourceType('unknown')).toBe(
        null
      );
      expect(UniversalUtilityService.normalizeResourceType('')).toBe(null);
      expect(UniversalUtilityService.normalizeResourceType('invalid')).toBe(
        null
      );
    });
  });

  describe('getResourceTypeDescription', () => {
    it('should return appropriate descriptions for all resource types', () => {
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.COMPANIES
        )
      ).toBe('Company records containing business information');
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.PEOPLE
        )
      ).toBe('Person records containing contact information');
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.LISTS
        )
      ).toBe('Lists for organizing and grouping records');
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.RECORDS
        )
      ).toBe('Generic object records');
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.DEALS
        )
      ).toBe('Deal records for sales pipeline management');
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          UniversalResourceType.TASKS
        )
      ).toBe('Task records for activity tracking');
    });
  });
});
