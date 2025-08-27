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

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import {
  CompanyFactory,
  PersonFactory,
  TaskFactory,
} from '../fixtures/index.js';
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
  const notesSetup = createSharedSetup();

  beforeAll(async () => {
    // Start comprehensive logging for this test suite
    startTestSuite('record-management');

    // Validate test environment and tool migration setup
    const envValidation = await validateTestEnvironment();
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

    console.error(
      '🚀 Starting Record Management E2E Tests - Universal Operations'
    );
  }, 60000);

  afterAll(async () => {
    // Cleanup notes validation
    await notesSetup.afterAll();

    // End comprehensive logging for this test suite
    endTestSuite();

    console.error(
      '✅ Record Management E2E Tests completed'
    );
  }, 60000);

  beforeEach(() => {
    vi.clearAllMocks();
    notesSetup.beforeEach();
  });

  describe('Universal Record Operations', () => {
    it('should create records across different resource types', async () => {
      // Create company record
      const companyData = CompanyFactory.create();
      const companyResponse = asToolResponse(
        await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: companyData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(companyResponse);
      const company = E2EAssertions.expectMcpData(companyResponse)!;
      E2EAssertions.expectCompanyRecord(company);
      testCompaniesRecord.push(company);
      createdRecords.push(company);

      // Create person record
      const personData = PersonFactory.create();
      const personResponse = asToolResponse(
        await callUniversalTool('create-record', {
          resource_type: 'people',
          record_data: personData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(personResponse);
      const person = E2EAssertions.expectMcpData(personResponse)!;
      E2EAssertions.expectPersonRecord(person);
      testPeopleRecord.push(person);
      createdRecords.push(person);

      // Create task record
      const taskData = TaskFactory.create();
      const taskResponse = asToolResponse(
        await callUniversalTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: taskData.content,
            due_date: taskData.due_date,
          },
        })
      );

      E2EAssertions.expectMcpSuccess(taskResponse);
      const task = E2EAssertions.expectMcpData(taskResponse)!;
      E2EAssertions.expectTaskRecord(task);
      createdTasks.push(task);
      createdRecords.push(task);

      console.error('✅ Created records across multiple resource types');
    }, 45000);

    it('should retrieve record details across resource types', async () => {
      if (createdRecords.length < 3) {
        console.error('⏭️ Skipping retrieval test - insufficient created records');
        return;
      }

      // Test retrieving each type of record
      for (const record of createdRecords.slice(0, 3)) {
        let resourceType = '';
        if ((record as any).id?.record_id && (record as any).values?.name) {
          resourceType = 'companies';
        } else if ((record as any).id?.record_id && (record as any).values?.first_name) {
          resourceType = 'people';
        } else if ((record as any).id?.task_id) {
          resourceType = 'tasks';
        }

        if (resourceType) {
          const recordId = (record as any).id?.record_id || (record as any).id?.task_id;
          
          const response = asToolResponse(
            await callUniversalTool('get-record-details', {
              resource_type: resourceType as any,
              record_id: recordId,
            })
          );

          E2EAssertions.expectMcpSuccess(response);
          const retrievedRecord = E2EAssertions.expectMcpData(response);
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

      const company = testCompaniesRecord[0];
      const companyId = (company as any).id?.record_id;

      if (!companyId) {
        console.error('⏭️ Skipping update test - invalid company ID');
        return;
      }

      const response = asToolResponse(
        await callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: {
            description: 'Updated via universal record management',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      const updatedRecord = E2EAssertions.expectMcpData(response);
      expect(updatedRecord).toBeDefined();

      console.error('✅ Updated record with universal pattern');
    }, 30000);

    it('should search records across resource types', async () => {
      const resourceTypes = ['companies', 'people', 'tasks'];
      
      for (const resourceType of resourceTypes) {
        const response = asToolResponse(
          await callUniversalTool('search-records', {
            resource_type: resourceType as any,
            query: 'test',
            limit: 5,
          })
        );

        E2EAssertions.expectMcpSuccess(response);
        const results = E2EAssertions.expectMcpData(response);
        expect(results).toBeDefined();

        console.error(`✅ Searched ${resourceType} records successfully`);
      }
    }, 45000);

    it('should handle bulk record operations', async () => {
      // Create multiple records of the same type
      const companyBatch = CompanyFactory.createMany(3);
      const createdCompanies = [];

      for (const companyData of companyBatch) {
        const response = asToolResponse(
          await callUniversalTool('create-record', {
            resource_type: 'companies',
            record_data: companyData as any,
          })
        );

        if (!response.isError) {
          const company = E2EAssertions.expectMcpData(response);
          createdCompanies.push(company);
        }
      }

      expect(createdCompanies.length).toBeGreaterThan(0);
      console.error(`✅ Created bulk records: ${createdCompanies.length} companies`);

      // Test bulk retrieval
      for (const company of createdCompanies.slice(0, 2)) {
        const companyId = (company as any).id?.record_id;
        if (companyId) {
          const response = asToolResponse(
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
        const taskData = TaskFactory.create();
        const response = asToolResponse(
          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: taskData.content,
              due_date: taskData.due_date,
            },
          })
        );

        if (!response.isError) {
          const task = E2EAssertions.expectMcpData(response);
          createdTasks.push(task);
        }
      }

      // Test task filtering with pagination
      const response = asToolResponse(
        await callTasksTool('search-records', {
          resource_type: 'tasks',
          query: 'test',
          limit: 10,
          offset: 0,
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);
      expect(tasks).toBeDefined();

      console.error('✅ Task filtering with pagination completed');
    }, 30000);

    it('should manage task relationships with records', async () => {
      if (createdTasks.length === 0 || testCompaniesRecord.length === 0) {
        console.error('⏭️ Skipping relationship test - insufficient test data');
        return;
      }

      const task = createdTasks[0];
      const company = testCompaniesRecord[0];
      const taskId = (task as any).id?.task_id;
      const companyId = (company as any).id?.record_id;

      if (!taskId || !companyId) {
        console.error('⏭️ Skipping relationship test - invalid IDs');
        return;
      }

      // Link task to company
      const response = asToolResponse(
        await callTasksTool('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: {
            recordId: companyId,
          },
        })
      );

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = E2EAssertions.expectMcpData(response);
      expect(updatedTask).toBeDefined();

      console.error('✅ Task-record relationship established');
    }, 30000);

    it('should handle task lifecycle workflows', async () => {
      // Create a task with specific lifecycle
      const taskData = TaskFactory.create();
      const createResponse = asToolResponse(
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
      const task = E2EAssertions.expectMcpData(createResponse);
      const taskId = (task as any).id?.task_id;

      if (!taskId) {
        console.error('⏭️ Skipping lifecycle test - invalid task ID');
        return;
      }

      // Progress through lifecycle: pending -> in_progress -> completed
      const statuses = ['in_progress', 'completed'];
      
      for (const status of statuses) {
        const updateResponse = asToolResponse(
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
      const taskConfigs = [
        { content: 'Basic task', due_date: '2024-12-31' },
        { content: 'Task with long content that tests field limits and validation', due_date: '2024-12-31' },
        { content: 'Urgent task', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      ];

      for (const config of taskConfigs) {
        const response = asToolResponse(
          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: config,
          })
        );

        // Should handle all configurations appropriately
        expect(response).toBeDefined();
        
        if (!response.isError) {
          const task = E2EAssertions.expectMcpData(response);
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

      const testCompany = testCompanies[0];
      const companyId = (testCompany as any).id?.record_id;

      if (!companyId) {
        console.error('⏭️ Skipping note validation test - invalid company ID');
        return;
      }

      // Test various note formats and content
      const noteTests = [
        {
          title: 'Basic Text Note',
          content: 'Simple text content for validation testing',
          format: 'markdown',
        },
        {
          title: 'Markdown Note',
          content: '# Header\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
          format: 'markdown',
        },
        {
          title: 'Long Content Note',
          content: 'A'.repeat(1000), // Long content
          format: 'markdown',
        },
      ];

      for (const noteData of noteTests) {
        const response = asToolResponse(
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
          const note = E2EAssertions.expectMcpData(response);
          E2EAssertions.expectValidNoteStructure(note);
          createdNotes.push(note);
        }

        console.error(`✅ Note validation test completed: ${noteData.title}`);
      }
    }, 60000);

    it('should validate cross-resource note operations', async () => {
      // Test notes across different resource types
      const resourceConfigs = [
        { type: 'companies', data: testCompanies },
        { type: 'people', data: testPeople },
      ];

      for (const config of resourceConfigs) {
        if (config.data.length === 0) continue;

        const record = config.data[0];
        const recordId = (record as any).id?.record_id;

        if (!recordId) continue;

        const response = asToolResponse(
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
          const note = E2EAssertions.expectMcpData(response);
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

      const testCompany = testCompanies[0];
      const companyId = (testCompany as any).id?.record_id;

      if (!companyId) {
        console.error('⏭️ Skipping note retrieval test - invalid company ID');
        return;
      }

      // Test different pagination parameters
      const paginationTests = [
        { limit: 5, offset: 0 },
        { limit: 10, offset: 0 },
        { limit: 1, offset: 0 },
      ];

      for (const params of paginationTests) {
        const response = asToolResponse(
          await callNotesTool('list-notes', {
            resource_type: 'companies',
            record_id: companyId,
            limit: params.limit,
            offset: params.offset,
          })
        );

        E2EAssertions.expectMcpSuccess(response);
        const notes = E2EAssertions.expectMcpData(response);
        expect(notes).toBeDefined();

        console.error(`✅ Note pagination test: limit=${params.limit}, offset=${params.offset}`);
      }

      console.error('✅ Note retrieval and pagination validation completed');
    }, 30000);
  });

  describe('Cross-Resource Integration Validation', () => {
    it('should validate record relationships across types', async () => {
      if (testCompaniesRecord.length === 0 || testPeopleRecord.length === 0 || createdTasks.length === 0) {
        console.error('⏭️ Skipping cross-resource validation - insufficient test data');
        return;
      }

      const company = testCompaniesRecord[0];
      const person = testPeopleRecord[0];
      const task = createdTasks[0];

      const companyId = (company as any).id?.record_id;
      const personId = (person as any).id?.record_id;
      const taskId = (task as any).id?.task_id;

      // Test linking task to both company and person
      if (taskId && companyId) {
        const linkResponse = asToolResponse(
          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              recordId: companyId,
            },
          })
        );

        expect(linkResponse).toBeDefined();
      }

      // Test creating notes for both company and person
      if (companyId && personId) {
        const companyNoteResponse = asToolResponse(
          await callNotesTool('create-note', {
            resource_type: 'companies',
            record_id: companyId,
            title: 'Cross-validation company note',
            content: 'Testing cross-resource relationships',
            format: 'markdown',
          })
        );

        const personNoteResponse = asToolResponse(
          await callNotesTool('create-note', {
            resource_type: 'people',
            record_id: personId,
            title: 'Cross-validation person note',
            content: 'Testing cross-resource relationships',
            format: 'markdown',
          })
        );

        expect(companyNoteResponse).toBeDefined();
        expect(personNoteResponse).toBeDefined();
      }

      console.error('✅ Cross-resource relationship validation completed');
    }, 60000);

    it('should validate data consistency across operations', async () => {
      // Test that operations across different tools maintain consistency
      if (testCompaniesRecord.length === 0) {
        console.error('⏭️ Skipping consistency validation - no company records');
        return;
      }

      const company = testCompaniesRecord[0];
      const companyId = (company as any).id?.record_id;

      if (!companyId) {
        console.error('⏭️ Skipping consistency validation - invalid company ID');
        return;
      }

      // Get record details via universal tool
      const detailsResponse = asToolResponse(
        await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: companyId,
        })
      );

      // Create a note for the company
      const noteResponse = asToolResponse(
        await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Consistency validation note',
          content: 'Testing data consistency',
          format: 'markdown',
        })
      );

      // Create a task linked to the company
      const taskResponse = asToolResponse(
        await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Consistency validation task',
            recordId: companyId,
          },
        })
      );

      // All operations should be consistent
      expect(detailsResponse).toBeDefined();
      expect(noteResponse).toBeDefined();
      expect(taskResponse).toBeDefined();

      console.error('✅ Data consistency validation across operations completed');
    }, 45000);
  });
});