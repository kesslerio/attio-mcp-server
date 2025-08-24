/**
 * Integration tests for issue #347 fixes using universal tools
 * Tests the fixes implemented based on production logs and user feedback
 * Tests migration from legacy tools to universal tools
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Mock the Attio client
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(() => ({
    records: {
      queryEntries: vi.fn().mockResolvedValue({
        data: [
          {
            id: { record_id: 'test-company-1' },
            values: {
              name: [{ value: 'Test Company' }],
              lead_score: [{ value: 85 }],
            },
          },
        ],
      }),
    },
  })),
}));

describe.skip('Issue #347 Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Type Conversion Fixes', () => {
    it('should handle string-to-number conversion for lead_score', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'companies',
            record_id: 'test-company-1',
            record_data: {
              lead_score: '90', // String value that should be converted to number
            },
          },
        },
      };

      // Mock the universal update service
      const mockUpdateRecord = vi.fn().mockResolvedValue({
        id: { record_id: 'test-company-1' },
        values: { lead_score: [{ value: 90 }] },
      });

      vi.doMock('../../src/services/UniversalUpdateService.js', () => ({
        UniversalUpdateService: {
          updateRecord: mockUpdateRecord,
        },
      }));

      const result = await executeToolRequest(request);

      // The universal tool should accept the string value and handle conversion
      expect(result.isError).toBeFalsy();
      expect(mockUpdateRecord).toHaveBeenCalledWith(
        'companies',
        'test-company-1',
        {
          lead_score: '90', // Universal tools handle type conversion internally
        }
      );
    });
  });

  describe('Parameter Flexibility Fixes', () => {
    it('should accept recordId parameter for company updates', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'companies',
            record_id: 'test-company-1', // Using record_id (universal tool standard)
            record_data: {
              name: 'Updated Company Name',
            },
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should not error with universal tools standard record_id parameter
      expect(result.isError).toBeFalsy();
    });

    it('should accept recordId parameter for person updates', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'people',
            record_id: 'test-person-1', // Using record_id (universal tool standard)
            record_data: {
              name: 'Updated Person Name',
            },
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should not error with universal tools standard record_id parameter
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Search Function Improvements', () => {
    it('should handle null/undefined filters gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: null, // Null filters should be handled gracefully
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should provide helpful error message
      expect(result.content[0].text).toContain('filters parameter is required');
      expect(result.content[0].text).toContain('Example:');
    });

    it('should handle undefined filters gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            // Missing filters entirely
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should provide helpful error message
      expect(result.content[0].text).toContain('filters parameter is required');
    });
  });

  describe('Relationship Helper Tools', () => {
    it('should link person to company using helper function', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'companies',
            record_id: 'test-company-1',
            record_data: {
              team: {
                add: ['test-person-1'],
              },
            },
          },
        },
      };

      // Mock the universal update service
      vi.doMock('../../src/services/UniversalUpdateService.js', () => ({
        UniversalUpdateService: {
          updateRecord: vi.fn().mockResolvedValue({
            id: { record_id: 'test-company-1' },
            values: { team: [{ target_record_id: 'test-person-1' }] },
          }),
        },
      }));

      const result = await executeToolRequest(request);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Successfully updated record');
    });
  });

  describe('Error Message Enhancements', () => {
    it('should provide helpful examples in error messages', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'companies',
            // Missing required parameters like record_id
          },
        },
      };

      const result = await executeToolRequest(request);

      // Error message should list accepted parameter names for universal tools
      expect(result.content[0].text).toMatch(/record_id|resource_type/);
    });
  });
});
