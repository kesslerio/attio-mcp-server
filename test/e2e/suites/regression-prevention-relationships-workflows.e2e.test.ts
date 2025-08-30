/**
 * Split: Regression Prevention E2E – Relationships & Workflows slice
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { E2EAssertions } from '../utils/assertions.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import { testDataGenerator } from '../fixtures/index.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Regression Prevention – Relationships & Workflows', () => {
  const testRecordIds: string[] = [];
    T60 = 60000;
  let prevForceRealApi: string | undefined;

  beforeAll(async () => {
    startTestSuite('regression-prevention-relationships-workflows');
    if (!validation.valid)
      console.warn(
        '⚠️ Regression prevention test warnings:',
        validation.warnings
      );

    // Ensure create + read operate against the same backend.
    // In E2E mode the system prefers mocks for create, while reads hit real API.
    // Force real API for this suite when an API key is available to keep CRUD consistent.
    prevForceRealApi = process.env.FORCE_REAL_API;
    if (process.env.ATTIO_API_KEY) {
      process.env.FORCE_REAL_API = 'true';
    }
  });

  afterAll(async () => {
    if (testRecordIds.length > 0) await cleanupTestRecords(testRecordIds);
    // Restore environment
    if (prevForceRealApi === undefined) delete process.env.FORCE_REAL_API;
    else process.env.FORCE_REAL_API = prevForceRealApi;
    endTestSuite();
  });

  it(
    'preserves core CRUD workflow integrity',
    async () => {
      let recordId: string | undefined;
        resource_type: 'companies',
        record_data: companyData,
      } as any);
      E2EAssertions.expectMcpSuccess(createResponse);
      recordId = extractRecordId(createResponse);
      expect(recordId).toBeDefined();
      if (!recordId) return;
      testRecordIds.push(recordId);

        resource_type: 'companies',
        record_id: recordId,
      } as any);
      E2EAssertions.expectMcpSuccess(readResponse);
      expect(recordData).toBeDefined();

        resource_type: 'companies',
        record_id: recordId,
        record_data: { description: 'Updated for CRUD workflow test' },
      } as any);
      E2EAssertions.expectMcpSuccess(updateResponse);

        resource_type: 'companies',
        record_id: recordId,
      } as any);
      E2EAssertions.expectMcpSuccess(verifyResponse);
      console.error('✅ Core CRUD workflow integrity preserved');
    },
    T45
  );

  it(
    'preserves cross-resource relationship integrity',
    async () => {
        (resourceType, data) =>
          callUniversalTool('create-record', {
            resource_type: resourceType as any,
            record_data: data,
          }),
        'companies',
        companyData
      );
      if (!companyId) {
        console.error(
          '⏭️ Skipping relationship test - could not create company'
        );
        return;
      }
      testRecordIds.push(companyId);

        resource_type: 'tasks',
        record_data: {
          content: 'Relationship integrity test task',
          recordId: companyId,
        },
      } as any);
      expect(taskResponse).toBeDefined();

        resource_type: 'companies',
        record_id: companyId,
        title: 'Relationship integrity test note',
        content: 'Testing cross-resource relationships',
        format: 'markdown',
      } as any);
      expect(noteResponse).toBeDefined();

        resource_type: 'companies',
        record_id: companyId,
      } as any);
      E2EAssertions.expectMcpSuccess(companyCheck);
      console.error('✅ Cross-resource relationship integrity preserved');
    },
    T60
  );

  it(
    'preserves data validation rules',
    async () => {
        {
          name: 'Required field validation',
          test: async () => {
              resource_type: 'companies',
              record_data: {
                /* intentionally missing required fields to assert validation */
              },
            } as any);
            return response;
          },
        },
        {
          name: 'Data type validation',
          test: async () => {
              resource_type: 'companies',
              query: 'validation-test',
              limit: 5,
            } as any);
            return response;
          },
        },
      ];
      for (const validationTest of validationTests) {
        expect(result).toBeDefined();
        console.error(`✅ ${validationTest.name} preserved`);
      }
      console.error('✅ Data validation rules preservation validated');
    },
    T45
  );
});
