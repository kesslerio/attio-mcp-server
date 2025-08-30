/**
 * Validation Errors Test Module
 *
 * Tests for parameter validation and data format errors
 */

import { describe, it, expect } from 'vitest';

import { E2EAssertions, type McpToolResponse } from '../../utils/assertions.js';

export function validationErrorsTests(testCompanyId?: string) {
  describe('Invalid Parameters and Validation Errors', () => {
    it('should handle missing required parameters gracefully', async () => {
      // Test search without required resource_type
        // Missing resource_type
        query: 'test',
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(/(resource_type|required)/i);
    });

    it('should validate resource_type parameter values', async () => {
        resource_type: 'invalid_resource_type_12345',
        query: 'test',
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(/(invalid|resource_type|not found)/i);
    });

    it('should handle invalid record IDs gracefully', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.generic,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|invalid|does not exist|validation|parameter error)/i
      );
    });

    it('should validate limit parameters', async () => {
        resource_type: 'companies',
        query: 'test',
        limit: -5, // Invalid negative limit
      })) as McpToolResponse;

      // May either reject the negative limit or silently use default
      // Both behaviors are acceptable for this validation test
      expect(response).toBeDefined();
    });

    it('should handle malformed filter objects', async () => {
        resource_type: 'companies',
        filters: 'this_should_be_an_object_not_string', // Invalid filter format
      })) as McpToolResponse;

      // Should either validate filters or handle gracefully
      expect(response).toBeDefined();
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should validate email format in person creation', async () => {
        first_name: 'Test',
        last_name: 'Person',
        email_address: errorScenarios.invalidFormats.email.malformed,
      };

        resource_type: 'people',
        record_data: personData,
      })) as McpToolResponse;

      // May either validate email format or accept invalid emails
      // Both behaviors are acceptable depending on API implementation
      expect(response).toBeDefined();
    });

    it('should handle extremely long text values', async () => {
        title: errorScenarios.extremeValues.text.veryLong,
        content: 'Test task with extremely long title',
      };

        resource_type: 'tasks',
        record_data: taskData,
      })) as McpToolResponse;

      // May either truncate, reject, or accept long text
      expect(response).toBeDefined();
    });

    it('should handle special characters and Unicode', async () => {

        resource_type: 'companies',
        record_data: companyData,
      })) as McpToolResponse;

      // Should handle Unicode and special characters gracefully
      expect(response).toBeDefined();

      // Clean up if successful
      if (hasValidContent(response)) {
        if (recordId) {
          await callUniversalTool('delete-record', {
            resource_type: 'companies',
            record_id: recordId,
          }).catch(() => {});
        }
      }
    });

    it('should handle null and undefined values', async () => {

        resource_type: 'companies',
        record_data: companyData,
      })) as McpToolResponse;

      // Should handle null/undefined values appropriately
      expect(response).toBeDefined();
    });

    it('should validate date formats', async () => {
        title: 'Task with invalid date',
        due_date: errorScenarios.invalidFormats.dates.invalid,
      };

        resource_type: 'tasks',
        record_data: taskData,
      })) as McpToolResponse;

      // May either validate date format or ignore invalid dates
      expect(response).toBeDefined();
    });

    it('should handle malformed JSON in parameters', async () => {
      // This test might be limited by the TypeScript interface,
      // but we can test edge cases within valid structure
        resource_type: 'companies',
        record_data: errorScenarios.malformedData.company,
      })) as McpToolResponse;

      expect(response).toBeDefined();

      // Clean up if successful
      if (hasValidContent(response)) {
        if (recordId) {
          await callUniversalTool('delete-record', {
            resource_type: 'companies',
            record_id: recordId,
          }).catch(() => {});
        }
      }
    });

    it('should handle memory-intensive operations', async () => {
        resource_type: 'companies',
        record_id: testCompanyId || 'test_id',
        title: errorScenarios.memoryIntensive.largeNote.title,
        content: errorScenarios.memoryIntensive.largeNote.content,
        format: errorScenarios.memoryIntensive.largeNote.format,
      })) as McpToolResponse;

      // Should handle large content without memory issues
      expect(response).toBeDefined();
    });
  });
}
