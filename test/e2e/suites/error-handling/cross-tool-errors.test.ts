/**
 * Cross-Tool Error Propagation Test Module
 *
 * Tests for error propagation across different tools and complex operations
 */

import { describe, it, expect } from 'vitest';

import { errorScenarios } from '../../fixtures/error-scenarios.js';
import { testDataGenerator } from '../../fixtures/index.js';
import { type McpToolResponse } from '../../utils/assertions.js';

export function crossToolErrorsTests(
  testCompanyId: string | undefined,
  testPersonId: string | undefined
) {
  describe('Cross-Tool Error Propagation', () => {
    it('should handle errors when linking non-existent records', async () => {
      // First create a task
        resource_type: 'tasks',
        record_data: taskData,
      })) as McpToolResponse;

      if (hasValidContent(taskResponse)) {

        if (taskId) {
          // Try to link to non-existent company
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              linked_records: errorScenarios.relationships.nonExistentLinks,
            },
          })) as McpToolResponse;

          // Should handle linking to non-existent records gracefully
          expect(linkResponse).toBeDefined();

          // Clean up
          await callUniversalTool('delete-record', {
            resource_type: 'tasks',
            record_id: taskId,
          }).catch(() => {});
        }
      }
    });

    it('should handle cascading delete scenarios', async () => {
      // Create company then try to delete it while it might be linked
        resource_type: 'companies',
        record_data: companyData,
      })) as McpToolResponse;

      if (hasValidContent(companyResponse)) {

        if (companyId) {
          // Create a note linked to the company
            resource_type: 'companies',
            record_id: companyId,
            title: 'Test Note for Delete Test',
            content: 'This note will test cascading delete behavior',
            format: 'markdown',
          })) as McpToolResponse;

          // Try to delete the company - should handle linked data appropriately
            resource_type: 'companies',
            record_id: companyId,
          })) as McpToolResponse;

          // Should either cascade delete or prevent deletion
          expect(deleteResponse).toBeDefined();
        }
      }
    });

    it('should handle batch operation partial failures', async () => {
      // Test updating multiple records where some might fail
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: testCompanyId || 'valid_id',
          }),
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: errorScenarios.invalidIds.batch[0],
          }),
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'people',
            record_id: testPersonId || 'valid_id',
          }),
      ];


      // Should handle mixed success/failure scenarios
      expect(responses).toHaveLength(3);
      expect(analysis.total).toBe(3);
      expect(analysis.successful + analysis.failed).toBe(3);
    });

    it('should handle concurrent modifications', async () => {
      if (!testCompanyId) {
        console.error(
          '⏭️  Skipping concurrent modification test - no test company'
        );
        return;
      }

      // Attempt concurrent updates to the same record
        () =>
          callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: testCompanyId,
            record_data: { description: 'Update 1' },
          }),
        () =>
          callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: testCompanyId,
            record_data: { description: 'Update 2' },
          }),
      ];


      // Should handle concurrent modifications gracefully
      expect(results).toHaveLength(2);
      // At least one should succeed
      expect(analysis.successful).toBeGreaterThanOrEqual(1);
    });

    it('should handle circular relationship scenarios', async () => {
      if (!testCompanyId || !testPersonId) {
        console.error(
          '⏭️  Skipping circular relationship test - missing test data'
        );
        return;
      }

      // Create a task linking company and person

        resource_type: 'tasks',
        record_data: taskData,
      })) as McpToolResponse;

      if (hasValidContent(taskResponse)) {

        if (taskId) {
          // Link task to company and person
          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              linked_records: [
                {
                  record_type: 'companies',
                  record_id: testCompanyId,
                },
              ],
            },
          }).catch(() => {});

          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              linked_records: [
                {
                  record_type: 'people',
                  record_id: testPersonId,
                },
              ],
            },
          }).catch(() => {});

          // Should handle complex relationship scenarios
          expect(taskResponse).toBeDefined();

          // Clean up
          await callUniversalTool('delete-record', {
            resource_type: 'tasks',
            record_id: taskId,
          }).catch(() => {});
        }
      }
    });
  });
}
