/**
 * Split: Record Management E2E – Search slice
 */
import { E2EAssertions } from '../utils/assertions.js';
import { E2ETestBase } from '../setup.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { McpToolResponse } from '../types/index.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}
  T45 = 45000,
  T60 = 60000;

describe('Record Management E2E – Search', () => {
  beforeAll(async () => {
    startTestSuite('record-management-search');
    if (!envValidation.valid)
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    console.error('📊 Tool migration stats:', getToolMigrationStats());
    await E2ETestBase.setup({
      requiresRealApi: false,
      cleanupAfterTests: true,
      timeout: 120000,
    });
    console.error('🚀 Starting Record Management E2E – Search');
  }, T60);

  afterAll(async () => {
    endTestSuite();
    console.error('✅ Record Management E2E – Search completed');
  }, T60);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'searches records across resource types',
    async () => {
      for (const resourceType of resourceTypes) {
          await callUniversalTool('search-records', {
            resource_type: resourceType as any,
            query: 'test',
            limit: 5,
          })
        );
        E2EAssertions.expectMcpSuccess(response);
        expect(results).toBeDefined();
        console.error(`✅ Searched ${resourceType} records successfully`);
      }
    },
    T45
  );

  it('filters tasks with pagination', async () => {
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
  }, 45000);
});
