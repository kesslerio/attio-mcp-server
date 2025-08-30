/**
 * Split: Record Management E2E – CRUD focus
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
import { CompanyFactory, PersonFactory } from '../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';
import {
  callUniversalTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Record Management E2E – CRUD', () => {
  const testCompaniesRecord: TestDataObject[] = [];
  const testPeopleRecord: TestDataObject[] = [];

  beforeAll(async () => {
    startTestSuite('record-management-crud');
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid)
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    console.error('📊 Tool migration stats:', getToolMigrationStats());
    await E2ETestBase.setup({
      requiresRealApi: false,
      cleanupAfterTests: true,
      timeout: 120000,
    });
    console.error('🚀 Starting Record Management E2E – CRUD');
  }, 60000);

  afterAll(async () => {
    endTestSuite();
    console.error('✅ Record Management E2E – CRUD completed');
  }, 60000);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates company and person records', async () => {
    const companyResponse = asToolResponse(
      await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: CompanyFactory.create() as any,
      })
    );
    E2EAssertions.expectMcpSuccess(companyResponse);
    const company = E2EAssertions.expectMcpData(companyResponse)!;
    E2EAssertions.expectCompanyRecord(company);
    testCompaniesRecord.push(company);

    const personResponse = asToolResponse(
      await callUniversalTool('create-record', {
        resource_type: 'people',
        record_data: PersonFactory.create() as any,
      })
    );
    E2EAssertions.expectMcpSuccess(personResponse);
    const person = E2EAssertions.expectMcpData(personResponse)!;
    E2EAssertions.expectPersonRecord(person);
    testPeopleRecord.push(person);
  }, 60000);
});
