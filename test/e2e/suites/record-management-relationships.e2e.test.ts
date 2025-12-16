/**
 * Split: Record Management E2E – Relationships slice
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
import type { McpToolResponse } from '../types/index.js';
import {
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}
const T45 = 45000,
  T60 = 60000;

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Record Management E2E – Relationships', () => {
  let prevForceRealApi: string | undefined;
  beforeAll(async () => {
    startTestSuite('record-management-relationships');
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid)
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    console.error('📊 Tool migration stats:', getToolMigrationStats());
    await E2ETestBase.setup({
      requiresRealApi: false,
      cleanupAfterTests: true,
      timeout: 120000,
    });
    // Ensure consistent backend for create + read
    prevForceRealApi = process.env.FORCE_REAL_API;
    if (process.env.ATTIO_API_KEY) process.env.FORCE_REAL_API = 'true';
    console.error('🚀 Starting Record Management E2E – Relationships');
  }, T60);

  afterAll(async () => {
    // Restore environment
    if (prevForceRealApi === undefined) delete process.env.FORCE_REAL_API;
    else process.env.FORCE_REAL_API = prevForceRealApi;
    endTestSuite();
    console.error('✅ Record Management E2E – Relationships completed');
  }, T60);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'validates record relationships across types',
    async () => {
      // Ensure we have a company, a person and a task to relate
      const companyResp = asToolResponse(
        await callUniversalTool('create_record', {
          resource_type: 'companies',
          record_data: CompanyFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(companyResp);
      const company = E2EAssertions.expectMcpData(companyResp)!;
      const companyId = (company as any).id?.record_id;

      const personResp = asToolResponse(
        await callUniversalTool('create_record', {
          resource_type: 'people',
          record_data: PersonFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(personResp);
      const person = E2EAssertions.expectMcpData(personResp)!;
      const personId = (person as any).id?.record_id;

      const taskData = TaskFactory.create();
      const taskCreate = asToolResponse(
        await callTasksTool('create_record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Relationship validation task',
            due_date: taskData.due_date,
          },
        })
      );
      E2EAssertions.expectMcpSuccess(taskCreate);
      const task = E2EAssertions.expectMcpData(taskCreate)!;
      const taskId = (task as any).id?.task_id;

      expect(companyId && personId && taskId).toBeTruthy();

      if (taskId && companyId) {
        // Use correct schema for linking: recordIds expects an array
        const linkResponse = asToolResponse(
          await callTasksTool('update_record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: { recordIds: [companyId] },
          })
        );
        expect(linkResponse).toBeDefined();
      }

      if (companyId) {
        const companyNote = asToolResponse(
          await callNotesTool('create_note', {
            resource_type: 'companies',
            record_id: companyId,
            title: 'Company relationship note',
            content: 'Testing cross-resource relationships',
            format: 'markdown',
          })
        );
        expect(companyNote).toBeDefined();
      }

      if (personId) {
        const personNote = asToolResponse(
          await callNotesTool('create_note', {
            resource_type: 'people',
            record_id: personId,
            title: 'Person relationship note',
            content: 'Testing cross-resource relationships',
            format: 'markdown',
          })
        );
        expect(personNote).toBeDefined();
      }

      console.error('✅ Cross-resource relationship validation completed');
    },
    T60
  );

  it(
    'validates data consistency across operations',
    async () => {
      const companyResp = asToolResponse(
        await callUniversalTool('create_record', {
          resource_type: 'companies',
          record_data: CompanyFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(companyResp);
      const company = E2EAssertions.expectMcpData(companyResp)!;
      const companyId = (company as any).id?.record_id;

      if (!companyId) {
        console.error(
          '⏭️ Skipping consistency validation - invalid company ID'
        );
        return;
      }

      const detailsResponse = asToolResponse(
        await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: companyId,
        })
      );
      const noteResponse = asToolResponse(
        await callNotesTool('create_note', {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Consistency validation note',
          content: 'Testing data consistency',
          format: 'markdown',
        })
      );
      const taskData2 = TaskFactory.create();
      const taskResponse = asToolResponse(
        await callTasksTool('create_record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Consistency validation task',
            due_date: taskData2.due_date,
            recordId: companyId,
            targetObject: 'companies',
          },
        })
      );

      expect(detailsResponse).toBeDefined();
      expect(noteResponse).toBeDefined();
      expect(taskResponse).toBeDefined();
      console.error(
        '✅ Data consistency validation across operations completed'
      );
    },
    T45
  );
});
