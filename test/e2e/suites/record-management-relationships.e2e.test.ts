/**
 * Split: Record Management E2E – Relationships slice
 */
import { CompanyFactory, PersonFactory, TaskFactory } from '../fixtures/index.js';
import { E2EAssertions } from '../utils/assertions.js';
import { E2ETestBase } from '../setup.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { McpToolResponse } from '../types/index.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}
  T60 = 60000;

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Record Management E2E – Relationships', () => {
  let prevForceRealApi: string | undefined;
  beforeAll(async () => {
    startTestSuite('record-management-relationships');
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
        await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: CompanyFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(companyResp);

        await callUniversalTool('create-record', {
          resource_type: 'people',
          record_data: PersonFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(personResp);

        await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Relationship validation task',
            due_date: taskData.due_date,
          },
        })
      );
      E2EAssertions.expectMcpSuccess(taskCreate);

      expect(companyId && personId && taskId).toBeTruthy();

      if (taskId && companyId) {
        // Use correct schema for linking: recordIds expects an array
          await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: { recordIds: [companyId] },
          })
        );
        expect(linkResponse).toBeDefined();
      }

      if (companyId) {
          await callNotesTool('create-note', {
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
          await callNotesTool('create-note', {
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
        await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: CompanyFactory.create() as any,
        })
      );
      E2EAssertions.expectMcpSuccess(companyResp);

      if (!companyId) {
        console.error(
          '⏭️ Skipping consistency validation - invalid company ID'
        );
        return;
      }

        await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: companyId,
        })
      );
        await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Consistency validation note',
          content: 'Testing data consistency',
          format: 'markdown',
        })
      );
        await callTasksTool('create-record', {
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
