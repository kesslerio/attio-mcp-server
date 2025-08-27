/**
 * Shared setup and imports for Notes Management E2E Tests
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
import { E2ETestBase } from '../../setup.js';
import { E2EAssertions } from '../../utils/assertions.js';
import { loadE2EConfig } from '../../utils/config-loader.js';
import {
  CompanyFactory,
  PersonFactory,
  noteFixtures,
  noteScenarios,
  edgeCaseNotes,
  performanceNotes,
} from '../../fixtures/index.js';
import type {
  TestDataObject,
  McpToolResponse,
  RecordData,
} from '../../types/index.js';

// Type interfaces for proper type safety
export interface AttioRecord {
  id: {
    record_id: string;
    object_id?: string;
  };
  values: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  format?: string;
  created_at?: string;
  updated_at?: string;
}

// Import enhanced tool caller with logging and migration
import {
  callNotesTool,
  callUniversalTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../../utils/logger.js';

// Shared test data storage
export const testCompanies: TestDataObject[] = [];
export const testPeople: TestDataObject[] = [];
export const createdNotes: TestDataObject[] = [];

// Shared setup utilities
export function createSharedSetup() {
  return {
    beforeAll: async () => {
      // Start comprehensive logging for this test suite
      startTestSuite('notes-management');

      // Validate test environment and tool migration setup
      const envValidation = await validateTestEnvironment();
      if (!envValidation.valid) {
        console.warn('⚠️ Test environment warnings:', envValidation.warnings);
      }

      console.error('📊 Tool migration stats:', getToolMigrationStats());

      await E2ETestBase.setup({
        requiresRealApi: false, // Use mock data instead of real API for reliable testing
        cleanupAfterTests: true,
        timeout: 120000,
      });

      console.error(
        '🚀 Starting Notes Management E2E Tests with Universal Tools'
      );
    },
    afterAll: async () => {
      // Cleanup is handled automatically by E2ETestBase.setup()

      // End comprehensive logging for this test suite
      endTestSuite();

      console.error(
        '✅ Notes Management E2E Tests completed with enhanced logging'
      );
    },
    beforeEach: () => {
      vi.clearAllMocks();
    },
  };
}

// Shared test data creation utilities
export async function createTestCompany(): Promise<void> {
  const companyData = CompanyFactory.create();
  const response = (await callUniversalTool('create-record', {
    resource_type: 'companies',
    record_data: companyData as unknown as RecordData,
  })) as McpToolResponse;

  E2EAssertions.expectMcpSuccess(response);
  const company = E2EAssertions.expectMcpData(
    response
  ) as unknown as AttioRecord;

  E2EAssertions.expectCompanyRecord(company);
  testCompanies.push(company);

  console.error('🏢 Created test company:', company.id.record_id);
}

export async function createTestPerson(): Promise<void> {
  const personData = PersonFactory.create();
  const response = (await callUniversalTool('create-record', {
    resource_type: 'people',
    record_data: personData as unknown as RecordData,
  })) as McpToolResponse;

  E2EAssertions.expectMcpSuccess(response);
  const person = E2EAssertions.expectMcpData(
    response
  ) as unknown as AttioRecord;

  E2EAssertions.expectPersonRecord(person);
  testPeople.push(person);

  console.error('👤 Created test person:', person.id.record_id);
}

// Export shared utilities
export {
  callNotesTool,
  callUniversalTool,
  E2EAssertions,
  noteFixtures,
  noteScenarios,
  edgeCaseNotes,
  performanceNotes,
};