/**
 * Test suite for UniversalUtilityService
 *
 * Tests universal utility functions extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect } from 'vitest';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioTask } from '../../src/types/attio.js';

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
      ); // Singular form is not a valid UniversalResourceType
    });
  });

  describe('convertTaskToRecord', () => {
    it('should convert task with task_id structure', () => {
      const task: AttioTask = {
        id: {
          task_id: 'task_123',
          workspace_id: 'ws_456',
        },
        content: 'Test task content',
        status: 'pending',
        assignee: 'user_789',
        due_date: '2024-01-15',
        linked_records: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = UniversalUtilityService.convertTaskToRecord(task);

      expect(result).toEqual({
        id: {
          record_id: 'task_123',
          task_id: 'task_123',
          object_id: 'tasks',
          workspace_id: 'ws_456',
        },
        values: {
          content: [{ value: 'Test task content' }],
          status: [{ value: 'pending' }],
          assignee: [{ value: 'user_789', name: undefined }],
          due_date: [{ value: '2024-01-15' }],
          linked_records: [],
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        // Flat field compatibility
        content: 'Test task content',
        status: 'pending',
        due_date: '2024-01-15',
        assignee_id: 'user_789',
        assignee: {
          id: 'user_789',
          type: 'person',
          name: undefined,
        },
      });
    });

    it('should convert task with id structure', () => {
      const task: AttioTask = {
        id: {
          id: 'task_abc',
          workspace_id: 'ws_def',
        },
        content: 'Another task',
        status: 'completed',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = UniversalUtilityService.convertTaskToRecord(task);

      expect(result).toEqual({
        id: {
          record_id: 'task_abc',
          task_id: 'task_abc',
          object_id: 'tasks',
          workspace_id: 'ws_def',
        },
        values: {
          content: [{ value: 'Another task' }],
          status: [{ value: 'completed' }],
          assignee: undefined,
          due_date: undefined,
          linked_records: undefined,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        // Flat field compatibility
        content: 'Another task',
        status: 'completed',
        due_date: null,
        assignee_id: undefined,
      });
    });

    it('should convert task with string ID', () => {
      const task: AttioTask = {
        id: 'simple_task_id',
        content: 'Simple task',
        status: 'in_progress',
        assignee: 'user_xyz',
        due_date: '2024-02-01',
        linked_records: [{ type: 'company', id: 'comp_123' }],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      const result = UniversalUtilityService.convertTaskToRecord(task);

      expect(result).toEqual({
        id: {
          record_id: 'simple_task_id',
          task_id: 'simple_task_id',
          object_id: 'tasks',
          workspace_id: '',
        },
        values: {
          content: [{ value: 'Simple task' }],
          status: [{ value: 'in_progress' }],
          assignee: [{ value: 'user_xyz', name: undefined }],
          due_date: [{ value: '2024-02-01' }],
          linked_records: [{ type: 'company', id: 'comp_123' }],
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        // Flat field compatibility
        content: 'Simple task',
        status: 'in_progress',
        due_date: '2024-02-01',
        assignee_id: 'user_xyz',
        assignee: {
          id: 'user_xyz',
          type: 'person',
          name: undefined,
        },
      });
    });

    it('should handle task with empty workspace_id', () => {
      const task: AttioTask = {
        id: {
          task_id: 'task_no_workspace',
        },
        content: 'Task without workspace',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = UniversalUtilityService.convertTaskToRecord(task);

      expect(result.id.workspace_id).toBe('');
    });

    it('should throw error for unrecognized ID structure', () => {
      const task: AttioTask = {
        id: {
          unknown_field: 'some_value',
        },
        content: 'Invalid task',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        UniversalUtilityService.convertTaskToRecord(task);
      }).toThrow('Task ID structure not recognized');
    });

    it('should throw error for missing ID', () => {
      const task: Partial<AttioTask> = {
        content: 'Task without ID',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        UniversalUtilityService.convertTaskToRecord(task as AttioTask);
      }).toThrow('Task missing id property');
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

    it('should provide fallback description for unknown resource types', () => {
      expect(
        UniversalUtilityService.getResourceTypeDescription(
          'unknown' as UniversalResourceType
        )
      ).toBe('unknown records');
    });
  });
});
