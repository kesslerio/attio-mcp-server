/**
 * Split: Record Management E2E – Search slice
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
  callUniversalTool,
  callTasksTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { McpToolResponse } from '../types/index.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}
const T30 = 30000,
  T45 = 45000,
  T60 = 60000;

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Record Management E2E – Search', () => {
  beforeAll(async () => {
    startTestSuite('record-management-search');
    const envValidation = await validateTestEnvironment();
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
    },
    T45
  );

  it('filters tasks with pagination', async () => {
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
  }, 45000);
});
