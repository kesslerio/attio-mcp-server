import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { setupUnitTestMocks, cleanupMocks } from './helpers/index.js';

// Import tool configurations
import {
  getAttributesConfig,
  discoverAttributesConfig,
  getDetailedInfoConfig,
  searchRecordsConfig,
  getRecordDetailsConfig,
} from '../../../../src/handlers/tool-configs/universal/core-operations.js';

// Import types
import {
  UniversalResourceType,
  DetailedInfoType,
  UniversalAttributesParams,
  UniversalDetailedInfoParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Universal Core Operations Attributes Tests', () => {
  beforeEach(() => {
    setupUnitTestMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('get-attributes tool', () => {
    it('should get attributes successfully', async () => {
      const mockAttributes: unknown = [
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
        { name: 'industry', type: 'select', required: false },
      ];

      const { handleUniversalGetAttributes } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetAttributes).mockResolvedValue(mockAttributes);

      const params: UniversalAttributesParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
      };

      expect(result).toEqual(mockAttributes);
      expect(vi.mocked(handleUniversalGetAttributes)).toHaveBeenCalledWith(
        params
      );
    });

    it('should format array attributes correctly', async () => {
      const mockAttributes: unknown = [
        { name: 'name', type: 'string' },
        { name: 'website', type: 'url' },
      ];

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

        mockAttributes,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Company attributes (2)');
      expect(formatted).toContain('1. name (string)');
      expect(formatted).toContain('2. website (url)');
    });

    it('should format object attributes correctly', async () => {
        name: 'Test Company',
        website: 'https://test.com',
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

        mockAttributes,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Company attributes (2)');
      expect(formatted).toContain('1. name: "Test Company"');
      expect(formatted).toContain('2. website: "https://test.com"');
    });
  });

  describe('discover-attributes tool', () => {
    it('should discover attributes successfully', async () => {
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
      ];

      const { handleUniversalDiscoverAttributes } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue(
        mockSchema as any
      );


      expect(result).toEqual(mockSchema);
      expect(vi.mocked(handleUniversalDiscoverAttributes)).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES,
        { categories: undefined }
      );
    });

    it('should format discovered attributes correctly', async () => {
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
      ];

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

        mockSchema,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Available company attributes (2)');
      expect(formatted).toContain('1. name (string) (required)');
      expect(formatted).toContain('2. website (url)');
    });
  });

  describe('get-detailed-info tool', () => {
    it('should get detailed info successfully', async () => {
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          email: [{ value: 'info@test.com' }],
        },
      };

      const { handleUniversalGetDetailedInfo } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetDetailedInfo).mockResolvedValue(mockInfo);

      const params: UniversalDetailedInfoParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
        info_type: DetailedInfoType.CONTACT,
      };

      expect(result).toEqual(mockInfo);
      expect(vi.mocked(handleUniversalGetDetailedInfo)).toHaveBeenCalledWith(
        params
      );
    });

    it('should format detailed info with values correctly', async () => {
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          email: [{ value: 'info@test.com' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

        mockInfo,
        UniversalResourceType.COMPANIES,
        DetailedInfoType.CONTACT
      );

      expect(formatted).toContain('Company contact information:');
      expect(formatted).toContain('Name: Test Company');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Email: info@test.com');
    });

    it('should format detailed info as object correctly', async () => {
        name: 'Test Company',
        website: 'https://test.com',
        email: 'info@test.com',
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

        mockInfo,
        UniversalResourceType.COMPANIES,
        DetailedInfoType.BUSINESS
      );

      expect(formatted).toContain('Company business information:');
      expect(formatted).toContain('Name: Test Company');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Email: info@test.com');
    });
  });

  describe('Task Display Formatting (Issue #472)', () => {
    describe('search-records formatResult for tasks', () => {
      it('should display task content when available', () => {
          {
            id: { record_id: 'task-1', task_id: 'task-1' },
            values: {
              content: [{ value: 'Follow up with client about proposal' }],
              status: [{ value: 'pending' }],
            },
          },
          {
            id: { record_id: 'task-2', task_id: 'task-2' },
            values: {
              content: [{ value: 'Schedule team meeting for next week' }],
              status: [{ value: 'completed' }],
            },
          },
        ];

          mockResults,
          UniversalResourceType.TASKS
        );

        expect(formatted).toContain('Found 2 tasks');
        expect(formatted).toContain(
          '1. Follow up with client about proposal (ID: task-1)'
        );
        expect(formatted).toContain(
          '2. Schedule team meeting for next week (ID: task-2)'
        );
        expect(formatted).not.toContain('Unnamed');
      });

      it('should fallback to Unnamed for tasks without content', () => {
          {
            id: { record_id: 'task-1', task_id: 'task-1' },
            values: {
              status: [{ value: 'pending' }],
            },
          },
        ];

          mockResults,
          UniversalResourceType.TASKS
        );

        expect(formatted).toContain('Found 1 task');
        expect(formatted).toContain('1. Unnamed (ID: task-1)');
      });

      it('should handle tasks with empty content values', () => {
          {
            id: { record_id: 'task-1', task_id: 'task-1' },
            values: {
              content: [],
              status: [{ value: 'pending' }],
            },
          },
        ];

          mockResults,
          UniversalResourceType.TASKS
        );

        expect(formatted).toContain('Found 1 task');
        expect(formatted).toContain('1. Unnamed (ID: task-1)');
      });

      it('should prioritize other fields over content for non-task records', () => {
          {
            id: { record_id: 'comp-1' },
            values: {
              name: [{ value: 'Test Company' }],
              content: [{ value: 'Some content' }],
            },
          },
        ];

          mockResults,
          UniversalResourceType.COMPANIES
        );

        expect(formatted).toContain('1. Test Company (ID: comp-1)');
        expect(formatted).not.toContain('Some content');
      });
    });

    describe('get-record-details formatResult for tasks', () => {
      it('should display task content when available', async () => {
          id: { record_id: 'task-1', task_id: 'task-1' },
          values: {
            content: [{ value: 'Review quarterly budget reports' }],
            status: [{ value: 'in_progress' }],
            assignee: [{ value: 'user-123', name: 'John Doe' }],
            due_date: [{ value: '2025-08-20' }],
          },
        };

        const { getSingularResourceType } = await import(
          '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
        );
        vi.mocked(getSingularResourceType).mockReturnValue('task');

          mockRecord,
          UniversalResourceType.TASKS
        );

        expect(formatted).toContain('Task: Review quarterly budget reports');
        expect(formatted).toContain('ID: task-1');
        expect(formatted).not.toContain('Task: Unnamed');
      });

      it('should fallback to Unnamed for tasks without content', async () => {
          id: { record_id: 'task-1', task_id: 'task-1' },
          values: {
            status: [{ value: 'pending' }],
          },
        };

        const { getSingularResourceType } = await import(
          '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
        );
        vi.mocked(getSingularResourceType).mockReturnValue('task');

          mockRecord,
          UniversalResourceType.TASKS
        );

        expect(formatted).toContain('Task: Unnamed');
        expect(formatted).toContain('ID: task-1');
      });

      it('should handle mixed field priority correctly', async () => {
          id: { record_id: 'record-1' },
          values: {
            title: [{ value: 'Important Title' }],
            content: [{ value: 'Some content here' }],
          },
        };

        const { getSingularResourceType } = await import(
          '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
        );
        vi.mocked(getSingularResourceType).mockReturnValue('record');

          mockRecord,
          UniversalResourceType.RECORDS
        );

        // Should prioritize title over content for non-task records
        expect(formatted).toContain('Record: Important Title');
        expect(formatted).not.toContain('Record: Some content here');
      });
    });
  });
});
