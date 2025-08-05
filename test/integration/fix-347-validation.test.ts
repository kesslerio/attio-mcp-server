/**
 * Integration tests for issue #347 fixes
 * Tests the fixes implemented based on production logs and user feedback
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';

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
          name: 'update-company',
          arguments: {
            companyId: 'test-company-1',
            updates: {
              lead_score: '90', // String value that should be converted to number
            },
          },
        },
      };

      // Mock the update handler
      const mockUpdateCompany = vi.fn().mockResolvedValue({
        id: { record_id: 'test-company-1' },
        values: { lead_score: [{ value: 90 }] },
      });

      vi.doMock('../../src/objects/companies/index.js', () => ({
        updateCompany: mockUpdateCompany,
      }));

      const result = await executeToolRequest(request);

      // The tool should accept the string value and convert it
      expect(result.isError).toBeFalsy();
      expect(mockUpdateCompany).toHaveBeenCalledWith('test-company-1', {
        lead_score: 90, // Should be converted to number
      });
    });
  });

  describe('Parameter Flexibility Fixes', () => {
    it('should accept recordId parameter for company updates', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-company',
          arguments: {
            recordId: 'test-company-1', // Using recordId instead of companyId
            updates: {
              name: 'Updated Company Name',
            },
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should not error on missing companyId when recordId is provided
      expect(result.isError).toBeFalsy();
    });

    it('should accept recordId parameter for person updates', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-person',
          arguments: {
            recordId: 'test-person-1', // Using recordId instead of personId
            updates: {
              name: 'Updated Person Name',
            },
          },
        },
      };

      const result = await executeToolRequest(request);

      // Should not error on missing personId when recordId is provided
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Search Function Improvements', () => {
    it('should handle null/undefined filters gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search-companies',
          arguments: {
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
          name: 'advanced-search-companies',
          arguments: {}, // Missing filters entirely
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
          name: 'link-person-to-company',
          arguments: {
            personId: 'test-person-1',
            companyId: 'test-company-1',
          },
        },
      };

      // Mock the company details and update
      vi.doMock('../../src/objects/companies/index.js', () => ({
        getCompanyDetails: vi.fn().mockResolvedValue({
          id: { record_id: 'test-company-1' },
          values: { team: [] },
        }),
        updateCompany: vi.fn().mockResolvedValue({
          id: { record_id: 'test-company-1' },
          values: { team: [{ target_record_id: 'test-person-1' }] },
        }),
      }));

      const result = await executeToolRequest(request);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        'Successfully linked person to company'
      );
    });
  });

  describe('Error Message Enhancements', () => {
    it('should provide helpful examples in error messages', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-company-attribute',
          arguments: {
            // Missing required parameters
          },
        },
      };

      const result = await executeToolRequest(request);

      // Error message should list accepted parameter names
      expect(result.content[0].text).toMatch(/companyId|recordId/);
    });
  });
});
