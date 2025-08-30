/**
 * Record Management E2E Test Suite
 *
 * Consolidates universal record operations and advanced workflow tests:
 * - tasks-management-advanced.e2e.test.ts (Score: 31)
 * - tasks-management-validation.e2e.test.ts (Score: 24)
 * - notes-management/notes-validation.e2e.test.ts (Score: 25)
 *
 * This consolidated suite covers:
 * - Universal record CRUD operations across resource types
 * - Advanced task management workflows (filtering, pagination, relationships)
 * - Record validation and error handling scenarios
 * - Data consistency and integration validation
 * - Cross-resource relationship management
 *
 * Total coverage: Advanced record management workflows
 * Combined business value score: 80/100
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 */

import { E2EAssertions } from '../utils/assertions.js';
import { E2ETestBase } from '../setup.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Import enhanced tool callers
import {
  callTasksTool,
  callUniversalTool,
  callNotesTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

// Import notes validation setup
import {
  testCompanies,
  testPeople,
  createdNotes,
  createSharedSetup,
  createTestCompany,
  createTestPerson,
  noteFixtures,
} from './notes-management/shared-setup.js';

/**
 * Helper function to safely cast tool responses to McpToolResponse
 */
function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}

/**
 * Record Management E2E Test Suite - Universal Operations & Advanced Workflows
 */
describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Record Management E2E Tests - Universal Operations', () => {
  // Universal record management test data
  const testCompaniesRecord: TestDataObject[] = [];
  const testPeopleRecord: TestDataObject[] = [];
  const createdTasks: TestDataObject[] = [];
  const createdRecords: TestDataObject[] = [];

  // Notes validation setup

  beforeAll(async () => {
    // Start comprehensive logging for this test suite
    startTestSuite('record-management');

    // Validate test environment and tool migration setup
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }

    console.error('📊 Tool migration stats:', getToolMigrationStats());

    await E2ETestBase.setup({
      requiresRealApi: false,
      cleanupAfterTests: true,
      timeout: 120000,
    });

    // Initialize notes validation setup
    await notesSetup.beforeAll();

    // Ensure consistent backend for create + read flows in this suite
    // Force real API if key is present to avoid mock-created IDs that cannot be read
    (globalThis as any).__prevForceRealApi = process.env.FORCE_REAL_API;
    if (process.env.ATTIO_API_KEY) process.env.FORCE_REAL_API = 'true';

    console.error(
      '🚀 Starting Record Management E2E Tests - Universal Operations'
    );
  }, 60000);

  afterAll(async () => {
    // Cleanup notes validation
    await notesSetup.afterAll();

    // End comprehensive logging for this test suite
    endTestSuite();

    console.error('✅ Record Management E2E Tests completed');
    // Restore environment flag
    if (prev === undefined) delete process.env.FORCE_REAL_API;
    else process.env.FORCE_REAL_API = prev;
  }, 60000);

  beforeEach(() => {
    vi.clearAllMocks();
    notesSetup.beforeEach();
  });

  describe('Universal Record Operations', () => {
    it('should create records across different resource types', async () => {
      // Create company record
        await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: companyData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(companyResponse);
      E2EAssertions.expectCompanyRecord(company);
      testCompaniesRecord.push(company);
      createdRecords.push(company);

      // Create person record
        await callUniversalTool('create-record', {
          resource_type: 'people',
          record_data: personData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(personResponse);
      E2EAssertions.expectPersonRecord(person);
      testPeopleRecord.push(person);
      createdRecords.push(person);

      // Create task record
        await callUniversalTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: taskData.content,
            due_date: taskData.due_date,
          },
        })
      );

      E2EAssertions.expectMcpSuccess(taskResponse);
      E2EAssertions.expectTaskRecord(task);
      createdTasks.push(task);
      createdRecords.push(task);

      console.error('✅ Created records across multiple resource types');
    }, 45000);

    it('should retrieve record details across resource types', async () => {
      if (createdRecords.length < 3) {
        console.error(
          '⏭️ Skipping retrieval test - insufficient created records'
        );
        return;
      }

      // Test retrieving each type of record
      for (const record of createdRecords.slice(0, 3)) {
        let resourceType = '';
        if ((record as any).id?.record_id && (record as any).values?.name) {
          resourceType = 'companies';
        } else if (
          (record as any).id?.record_id &&
          (record as any).values?.first_name
        ) {
          resourceType = 'people';
        } else if ((record as any).id?.task_id) {
          resourceType = 'tasks';
        }

        if (resourceType) {
            (record as any).id?.record_id || (record as any).id?.task_id;

            await callUniversalTool('get-record-details', {
              resource_type: resourceType as any,
              record_id: recordId,
            })
          );

          E2EAssertions.expectMcpSuccess(response);
          expect(retrievedRecord).toBeDefined();

          console.error(`✅ Retrieved ${resourceType} record details`);
        }
      }
    }, 45000);

    it('should update records with universal patterns', async () => {
      if (testCompaniesRecord.length === 0) {
        console.error('⏭️ Skipping update test - no company records available');
        return;
      }


      if (!companyId) {
        console.error('⏭️ Skipping update test - invalid company ID');
        return;
      }

        await callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: {
            description: 'Updated via universal record management',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      expect(updatedRecord).toBeDefined();

      console.error('✅ Updated record with universal pattern');
    }, 30000);

    // Search tests moved to: record-management-search.e2e.test.ts

    it('should handle bulk record operations', async () => {
      // Create multiple records of the same type

      for (const companyData of companyBatch) {
          await callUniversalTool('create-record', {
            resource_type: 'companies',
            record_data: companyData as any,
          })
        );

        if (!response.isError) {
          createdCompanies.push(company);
        }
      }

      expect(createdCompanies.length).toBeGreaterThan(0);
      console.error(
        `✅ Created bulk records: ${createdCompanies.length} companies`
      );

      // Test bulk retrieval
      for (const company of createdCompanies.slice(0, 2)) {
        if (companyId) {
            await callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: companyId,
            })
          );
          expect(response).toBeDefined();
        }
      }

      console.error('✅ Bulk record operations completed');
    }, 60000);
  });

  describe('Advanced Task Management Workflows', () => {
    it('should filter tasks with pagination', async () => {
      // First ensure we have tasks to filter
      if (createdTasks.length === 0) {
          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: taskData.content,
              due_date: taskData.due_date,
            },
          })
        );

        if (!response.isError) {
          createdTasks.push(task);
        }
      }

      // Test task filtering with pagination
        await callTasksTool('search-records', {
          resource_type: 'tasks',
          query: 'test',
          limit: 10,
          offset: 0,
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      expect(tasks).toBeDefined();

      console.error('✅ Task filtering with pagination completed');
    }, 30000);

    it('should manage task relationships with records', async () => {
      if (createdTasks.length === 0 || testCompaniesRecord.length === 0) {
        console.error('⏭️ Skipping relationship test - insufficient test data');
        return;
      }


      if (!taskId || !companyId) {
        console.error('⏭️ Skipping relationship test - invalid IDs');
        return;
      }

      // Link task to company
        await callTasksTool('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: {
            recordId: companyId,
          },
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      expect(updatedTask).toBeDefined();

      console.error('✅ Task-record relationship established');
    }, 30000);

    it('should handle task lifecycle workflows', async () => {
      // Create a task with specific lifecycle
        await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: taskData.content,
            due_date: taskData.due_date,
            status: 'pending',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(createResponse);

      if (!taskId) {
        console.error('⏭️ Skipping lifecycle test - invalid task ID');
        return;
      }

      // Progress through lifecycle: pending -> in_progress -> completed

      for (const status of statuses) {
          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: { status },
          })
        );

        E2EAssertions.expectMcpSuccess(updateResponse);
        console.error(`✅ Task status updated to: ${status}`);
      }

      console.error('✅ Task lifecycle workflow completed');
    }, 45000);

    it('should validate task data consistency', async () => {
      // Test creating task with various data configurations
        { content: 'Basic task', due_date: '2024-12-31' },
        {
          content:
            'Task with long content that tests field limits and validation',
          due_date: '2024-12-31',
        },
        {
          content: 'Urgent task',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
      ];

      for (const config of taskConfigs) {
          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: config,
          })
        );

        // Should handle all configurations appropriately
        expect(response).toBeDefined();

        if (!response.isError) {
          E2EAssertions.expectTaskRecord(task);
        }
      }

      console.error('✅ Task data consistency validation completed');
    }, 45000);
  });

  describe('Notes Validation Workflows', () => {
    it('should validate note format and content', async () => {
      // Ensure we have test data
      if (testCompanies.length === 0) {
        await createTestCompany();
      }

      if (testCompanies.length === 0) {
        console.error('⏭️ Skipping note validation test - no test companies');
        return;
      }


      if (!companyId) {
        console.error('⏭️ Skipping note validation test - invalid company ID');
        return;
      }

      // Test various note formats and content
        {
          title: 'Basic Text Note',
          content: 'Simple text content for validation testing',
          format: 'markdown',
        },
        {
          title: 'Markdown Note',
          content:
            '# Header\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
          format: 'markdown',
        },
        {
          title: 'Long Content Note',
          content: 'A'.repeat(1000), // Long content
          format: 'markdown',
        },
      ];

      for (const noteData of noteTests) {
          await callNotesTool('create-note', {
            resource_type: 'companies',
            record_id: companyId,
            title: noteData.title,
            content: noteData.content,
            format: noteData.format,
          })
        );

        // Should handle all note formats appropriately
        expect(response).toBeDefined();

        if (!response.isError) {
          E2EAssertions.expectValidNoteStructure(note);
          createdNotes.push(note);
        }

        console.error(`✅ Note validation test completed: ${noteData.title}`);
      }
    }, 60000);

    it('should validate cross-resource note operations', async () => {
      // Test notes across different resource types
        { type: 'companies', data: testCompanies },
        { type: 'people', data: testPeople },
      ];

      for (const config of resourceConfigs) {
        if (config.data.length === 0) continue;


        if (!recordId) continue;

          await callNotesTool('create-note', {
            resource_type: config.type as any,
            record_id: recordId,
            title: `Cross-resource ${config.type} note`,
            content: `Validation test note for ${config.type} resource`,
            format: 'markdown',
          })
        );

        expect(response).toBeDefined();

        if (!response.isError) {
          createdNotes.push(note);
          console.error(`✅ Cross-resource note created for ${config.type}`);
        }
      }

      console.error('✅ Cross-resource note validation completed');
    }, 45000);

    it('should handle note retrieval and pagination validation', async () => {
      // Test note retrieval with various parameters
      if (testCompanies.length === 0) {
        console.error('⏭️ Skipping note retrieval test - no test companies');
        return;
      }


      if (!companyId) {
        console.error('⏭️ Skipping note retrieval test - invalid company ID');
        return;
      }

      // Test different pagination parameters
        { limit: 5, offset: 0 },
        { limit: 10, offset: 0 },
        { limit: 1, offset: 0 },
      ];

      for (const params of paginationTests) {
          await callNotesTool('list-notes', {
            resource_type: 'companies',
            record_id: companyId,
            limit: params.limit,
            offset: params.offset,
          })
        );

        E2EAssertions.expectMcpSuccess(response);
        expect(notes).toBeDefined();

        console.error(
          `✅ Note pagination test: limit=${params.limit}, offset=${params.offset}`
        );
      }

      console.error('✅ Note retrieval and pagination validation completed');
    }, 30000);
  });

  // Cross-Resource Integration Validation moved to: record-management-relationships.e2e.test.ts
});
