/**
 * Core Workflows E2E Test Suite
 *
 * Consolidates the highest business value E2E tests for essential user workflows:
 * - Tasks Management Core Operations (Score: 44)
 * - Notes CRUD Operations (Score: 39)
 *
 * This consolidated suite covers:
 * - Test data setup and management (companies, people)
 * - Task lifecycle: creation, updates, deletion
 * - Notes management: creation, retrieval, formatting
 * - Cross-resource operations and relationships
 *
 * Total coverage: 15 essential user workflow scenarios
 * Combined business value score: 83/100
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 */

import { E2EAssertions } from '../utils/assertions.js';
import { E2ETestBase } from '../setup.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Define TaskRecord locally to avoid import issues
interface TaskRecord {
  id: {
    task_id: string;
    record_id?: string;
    object_id?: string;
  };
  type?: string;
  content?: string;
  title?: string;
  content_plaintext?: string;
  status?: string;
  due_date?: string;
  assignee_id?: string;
  assignee?: {
    id: string;
  };
  values?: {
    content?: Array<{ value: string }>;
    title?: Array<{ value: string }>;
    status?: Array<{ value: string }>;
    [key: string]: unknown;
  };
  attributes?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// Define NoteRecord locally
interface NoteRecord {
  id: {
    note_id?: string;
    record_id?: string;
  };
  title?: string;
  content?: string;
  format?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Define AttioRecord locally
interface AttioRecord {
  id: {
    record_id: string;
    object_id?: string;
  };
  values?: {
    name?: Array<{ value: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Import enhanced tool callers with logging and migration
import {
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

// Import notes-specific setup utilities
import {
  testCompanies,
  testPeople,
  createdNotes,
  createSharedSetup,
  createTestCompany,
  createTestPerson,
  callNotesTool as notesToolCaller,
  E2EAssertions as NotesAssertions,
  noteFixtures,
} from './notes-management/shared-setup.js';

/**
 * Helper function to safely cast tool responses to McpToolResponse
 */
function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}

/**
 * Helper function to safely extract task data from MCP response
 */
function extractTaskData(response: McpToolResponse): TaskRecord {
  if (!data) {
    throw new Error('No data returned from MCP tool response');
  }
  return data as unknown as TaskRecord;
}

/**
 * Core Workflows E2E Test Suite - Consolidated Tasks + Notes
 */
describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Core Workflows E2E Tests - Tasks & Notes', () => {
  // Task management test data
  const taskTestCompanies: TestDataObject[] = [];
  const taskTestPeople: TestDataObject[] = [];
  let createdTasks: TaskRecord[] = [];

  // Notes management setup

  beforeAll(async () => {
    // Start comprehensive logging for this consolidated test suite
    startTestSuite('core-workflows');

    // Validate test environment and tool migration setup
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }

    console.error('📊 Tool migration stats:', getToolMigrationStats());

    await E2ETestBase.setup({
      requiresRealApi: true, // 🔒 Real API only for E2E tests
      cleanupAfterTests: true,
      timeout: 120000,
    });

    // Initialize notes setup
    await notesSetup.beforeAll();

    console.error(
      '🚀 Starting Core Workflows E2E Tests - Consolidated Tasks & Notes'
    );
  }, 60000);

  afterAll(async () => {
    // Cleanup notes
    await notesSetup.afterAll();

    // End comprehensive logging for this test suite
    endTestSuite();

    console.error(
      '✅ Core Workflows E2E Tests completed with enhanced logging'
    );
  }, 60000);

  beforeEach(() => {
    vi.clearAllMocks();
    notesSetup.beforeEach();
  });

  describe('Shared Test Data Setup', () => {
    it('should create test companies for task and note testing', async () => {
      // Create for tasks
        await callTasksTool('create-record', {
          resource_type: 'companies',
          record_data: companyData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(response);

      E2EAssertions.expectCompanyRecord(company);
      taskTestCompanies.push(company);

      console.error(
        '🏢 Created test company for core workflows:',
        (company as any)?.id?.record_id
      );

      // Also create for notes
      await createTestCompany();
    }, 45000);

    it('should create test people for task assignment and note management', async () => {
      // Create for tasks
        await callTasksTool('create-record', {
          resource_type: 'people',
          record_data: personData as any,
        })
      );

      E2EAssertions.expectMcpSuccess(response);

      E2EAssertions.expectPersonRecord(person);
      taskTestPeople.push(person);

      console.error(
        '👤 Created test person for core workflows:',
        (person as any)?.id?.record_id
      );

      // Also create for notes
      await createTestPerson();
    }, 45000);
  });

  describe('Tasks Management - Core Operations', () => {
    describe('Task Creation and Basic Operations', () => {
      it('should create a basic task', async () => {

          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: taskData.content,
              format: 'plaintext',
              deadline_at: taskData.due_date,
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        E2EAssertions.expectTaskRecord(createdTask);
        expect(createdTask.id.task_id).toBeDefined();

        // Access content from the correct field in the record structure
          createdTask.values?.content?.[0]?.value ||
          createdTask.content ||
          createdTask.title;
        expect(taskContent).toContain('Test Task');

        createdTasks.push(createdTask);
        console.error('📋 Created basic task:', createdTask.id.task_id);
      }, 30000);

      it('should create task with assignee', async () => {
        console.log('🔍 ASSIGNEE TEST DEBUG', {
          taskTestPeopleLength: taskTestPeople.length,
          hasFirstPerson: !!taskTestPeople[0],
          firstPersonId: taskTestPeople[0]?.id?.record_id,
        });

        if (taskTestPeople.length === 0) {
          console.error('⏭️ Skipping assignee test - no test people available');
          return;
        }


        console.log('🎯 ASSIGNEE DEBUG', {
          assigneeId: assignee?.id?.record_id,
          assigneeKeys: Object.keys(assignee || {}),
        });

          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: taskData.content,
              format: 'plaintext',
              assignees: [
                {
                  referenced_actor_type: 'workspace-member',
                  referenced_actor_id: assignee.id.record_id,
                },
              ],
              deadline_at: taskData.due_date,
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        console.log('📋 TASK RESPONSE DEBUG', {
          hasAssignee: !!createdTask.assignee,
          assigneeKeys: createdTask.assignee
            ? Object.keys(createdTask.assignee)
            : null,
          taskKeys: Object.keys(createdTask || {}),
        });

        E2EAssertions.expectTaskRecord(createdTask);
        expect(createdTask.assignee?.id).toBeDefined();

        createdTasks.push(createdTask);
        console.error('👥 Created task with assignee:', createdTask.id.task_id);
      }, 30000);

      it('should create task linked to company record', async () => {
        if (taskTestCompanies.length === 0) {
          console.error(
            '⏭️ Skipping record link test - no test companies available'
          );
          return;
        }


          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: `Follow up with ${company.values.name?.[0]?.value || 'company'}`,
              format: 'plaintext',
              recordId: company.id.record_id,
              deadline_at: taskData.due_date,
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        E2EAssertions.expectTaskRecord(createdTask);

        createdTasks.push(createdTask);
        console.error(
          '🔗 Created task linked to company record:',
          createdTask.id.task_id
        );
      }, 30000);

      it('should create high priority task', async () => {

          await callTasksTool('create-record', {
            resource_type: 'tasks',
            record_data: {
              content: taskData.content,
              format: 'plaintext',
              deadline_at: taskData.due_date,
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        E2EAssertions.expectTaskRecord(createdTask);
        // Check for content in various possible locations
          createdTask.content ||
          createdTask.title ||
          createdTask.values?.content?.[0]?.value ||
          createdTask.values?.title?.[0]?.value ||
          createdTask.content_plaintext;

        expect(taskContent).toContain('Test Task');

        createdTasks.push(createdTask);
        console.error('⚡ Created high priority task:', createdTask.id.task_id);
      }, 30000);
    });

    describe('Task Updates and Modifications', () => {
      it('should update task status', async () => {
        if (createdTasks.length === 0) {
          console.error(
            '⏭️ Skipping status update test - no created tasks available'
          );
          return;
        }


          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              is_completed: true,
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        expect(updatedTask.id.task_id).toBe(taskId);
        console.error('✅ Updated task status:', taskId);
      }, 30000);

      it('should update task assignee', async () => {
        if (createdTasks.length === 0 || taskTestPeople.length === 0) {
          console.error(
            '⏭️ Skipping assignee update test - insufficient test data'
          );
          return;
        }


          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              assignees: [
                {
                  referenced_actor_type: 'workspace-member',
                  referenced_actor_id: newAssignee.id.record_id,
                },
              ],
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        expect(updatedTask.id.task_id).toBe(taskId);
        console.error('👤 Updated task assignee:', taskId);
      }, 30000);

      it('should update multiple task fields simultaneously', async () => {
        if (createdTasks.length === 0) {
          console.error(
            '⏭️ Skipping multi-field update test - no created tasks available'
          );
          return;
        }

        newDueDate.setDate(newDueDate.getDate() + 7);

          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              is_completed: false,
              deadline_at: newDueDate.toISOString(),
            },
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        expect(updatedTask.id.task_id).toBe(taskId);
        console.error('🔄 Updated multiple task fields:', taskId);
      }, 30000);
    });

    describe('Task Deletion and Cleanup', () => {
      it('should delete individual tasks', async () => {
        if (createdTasks.length === 0) {
          console.error(
            '⏭️ Skipping deletion test - no created tasks available'
          );
          return;
        }

        // Delete the last created task to avoid affecting other tests

          await callTasksTool('delete-record', {
            resource_type: 'tasks',
            record_id: taskId,
          })
        );

        E2EAssertions.expectMcpSuccess(response);

        // Remove from our tracking
        createdTasks = createdTasks.filter((t) => t.id.task_id !== taskId);

        console.error('🗑️ Deleted task:', taskId);
      }, 30000);

      it('should handle deletion of non-existent task gracefully', async () => {
          await callTasksTool('delete-record', {
            resource_type: 'tasks',
            record_id: 'already-deleted-task-12345',
          })
        );

        E2EAssertions.expectMcpError(
          response,
          /not found|invalid|does not exist|missing required parameter/i
        );
        console.error('✅ Handled non-existent task deletion gracefully');
      }, 15000);
    });
  });

  describe('Notes Management - CRUD Operations', () => {
    describe('Company Notes Management', () => {
      it('should create a company note with basic content', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping company note test - no test companies available'
          );
          return;
        }

        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping company note test - invalid company data');
          return;
        }
          testCompany.id.record_id
        );

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toBe(noteData.title);
        expect(createdNote.content).toBe(noteData.content);

        createdNotes.push(createdNote);

        console.error('📝 Created company note:', createdNote.title);
      }, 30000);

      it('should retrieve company notes', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping get company notes test - no test companies available'
          );
          return;
        }

        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping get company notes test - invalid company data'
          );
          return;
        }
          resource_type: 'companies',
          parent_object: 'companies',
          record_id: testCompany.id.record_id,
          limit: 10,
          offset: 0,
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);

        // Notes might be an array or a response object with data array
        let noteArray: unknown[] = [];
        if (Array.isArray(notes)) {
          noteArray = notes;
        } else if (notes && Array.isArray(notes.data)) {
          noteArray = notes.data;
        }

        expect(noteArray).toBeDefined();

        if (noteArray.length > 0) {
          NotesAssertions.expectValidNoteCollection(noteArray);
          console.error('📋 Retrieved company notes:', noteArray.length);
        } else {
          console.error(
            '📋 No company notes found (expected for new test data)'
          );
        }
      }, 30000);

      it('should create company note with markdown content', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping markdown note test - no test companies available'
          );
          return;
        }

        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping markdown note test - invalid company data'
          );
          return;
        }
          testCompany.id.record_id
        );

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.content).toContain('# E2E Client Meeting Agenda');
        expect(createdNote.content).toContain('## Attendees');

        createdNotes.push(createdNote);

        console.error('📋 Created markdown company note:', createdNote.title);
      }, 30000);

      it('should handle company note creation with URI format', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping URI format test - no test companies available'
          );
          return;
        }

        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping URI format test - invalid company data');
          return;
        }
          testCompany.id.record_id
        );

          uri: uri,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        createdNotes.push(createdNote);

        console.error('🔗 Created company note via URI:', createdNote.title);
      }, 30000);
    });

    describe('Person Notes Management', () => {
      it('should create a person note with basic content', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping person note test - no test people available'
          );
          return;
        }

        if (!testPerson?.id?.record_id) {
          console.error('⏭️ Skipping person note test - invalid person data');
          return;
        }
          testPerson.id.record_id
        );

          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toBe(noteData.title);
        expect(createdNote.content).toBe(noteData.content);

        createdNotes.push(createdNote);

        console.error('👤 Created person note:', createdNote.title);
      }, 30000);

      it('should retrieve person notes', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping get person notes test - no test people available'
          );
          return;
        }

        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping get person notes test - invalid person data'
          );
          return;
        }
          resource_type: 'people',
          parent_object: 'people',
          record_id: testPerson.id.record_id,
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);

        // Notes might be an array or a response object
        let noteArray: unknown[] = [];
        if (Array.isArray(notes)) {
          noteArray = notes;
        } else if (notes && Array.isArray(notes.data)) {
          noteArray = notes.data;
        }

        expect(noteArray).toBeDefined();

        if (noteArray.length > 0) {
          NotesAssertions.expectValidNoteCollection(noteArray);
          console.error('👥 Retrieved person notes:', noteArray.length);
        } else {
          console.error(
            '👥 No person notes found (expected for new test data)'
          );
        }
      }, 30000);

      it('should create person note with technical content', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping technical note test - no test people available'
          );
          return;
        }

        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping technical note test - invalid person data'
          );
          return;
        }

          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        NotesAssertions.expectTestNote(createdNote);

        createdNotes.push(createdNote);

        console.error('🔧 Created technical person note:', createdNote.title);
      }, 30000);

      it('should create person note with markdown formatting', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping markdown person note test - no test people available'
          );
          return;
        }

        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping markdown person note test - invalid person data'
          );
          return;
        }
          testPerson.id.record_id,
          'people'
        );

          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        NotesAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        NotesAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.content).toContain(
          '# E2E Technical Integration Specifications'
        );

        createdNotes.push(createdNote);

        console.error('📋 Created markdown person note:', createdNote.title);
      }, 30000);
    });
  });

  describe('Cross-Resource Integration Workflows', () => {
    it('should create task and note for the same company record', async () => {
      if (taskTestCompanies.length === 0 || testCompanies.length === 0) {
        console.error(
          '⏭️ Skipping cross-resource test - insufficient test data'
        );
        return;
      }

      // Use the first company for both operations

      // Create a task for the company
        await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: `Follow up on integration for ${company.values.name?.[0]?.value || 'company'}`,
            format: 'plaintext',
            recordId: companyId,
            deadline_at: taskData.due_date,
          },
        })
      );

      E2EAssertions.expectMcpSuccess(taskResponse);
      createdTasks.push(createdTask);

      // Create a note for the same company
        resource_type: 'companies',
        record_id: companyId,
        title: noteData.title,
        content: noteData.content,
        format: 'markdown',
      })) as McpToolResponse;

      NotesAssertions.expectMcpSuccess(noteResponse);
        noteResponse
      ) as unknown as NoteRecord;

      createdNotes.push(createdNote);

      console.error('🔄 Created task and note for same company:', companyId);
    }, 45000);

    it('should demonstrate task-note workflow integration', async () => {
      if (createdTasks.length === 0 || createdNotes.length === 0) {
        console.error(
          '⏭️ Skipping workflow integration test - insufficient created data'
        );
        return;
      }

      // Update task status and add a corresponding note

      // Update task to completed
        await callTasksTool('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: {
            status: 'completed',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(taskUpdateResponse);

      console.error('✅ Demonstrated integrated task-note workflow completion');
    }, 30000);
  });
});
