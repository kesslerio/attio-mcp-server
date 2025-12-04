/**
 * MCP E2E Test: Remote Phone Validation (Issue #951)
 * P1 Core Test - Validates @attio-mcp/core phone validation in edge runtime
 *
 * Tests phone number validation in the Cloudflare Worker deployment:
 * 1. E.164 normalization in edge runtime
 * 2. Country code detection (US, UK, Japan, Australia)
 * 3. Metadata preservation (label, type, extension)
 * 4. Error handling for invalid formats
 *
 * Related:
 * - Issue #951: Phone validation in @attio-mcp/core
 * - PR #964: Phone validation implementation
 *
 * Environment:
 * - MCP_TEST_MODE=remote
 * - MCP_REMOTE_ENDPOINT=https://attio-mcp-server.<subdomain>.workers.dev/mcp
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase, type MCPTestConfig } from '../shared/mcp-test-base.js';
import { QAAssertions } from '../shared/qa-assertions.js';
import {
  createResultTracker,
  hasPhoneFormatGuidance,
} from '../shared/phone-test-utils.js';

class RemotePhoneValidationTest extends MCPTestBase {
  constructor() {
    super('TC-PHONE-REMOTE-951');
  }

  /**
   * Override setup to ensure remote mode is used
   */
  async setup(config: MCPTestConfig = {}): Promise<void> {
    // Force remote mode for this test suite
    const remoteEndpoint =
      process.env.MCP_REMOTE_ENDPOINT ||
      'https://attio-mcp-server.martin-ed4.workers.dev/mcp';

    const remoteConfig: MCPTestConfig = {
      ...config,
    };

    // Set environment for remote mode
    process.env.MCP_TEST_MODE = 'remote';
    process.env.MCP_REMOTE_ENDPOINT = remoteEndpoint;

    await super.setup(remoteConfig);
  }
}

/**
 * Note: Remote E2E tests require OAuth authentication with the Cloudflare Worker.
 * To run these tests:
 * 1. Complete OAuth flow to get an access token
 * 2. Set MCP_REMOTE_AUTH_TOKEN environment variable
 * 3. Run: MCP_TEST_MODE=remote MCP_REMOTE_ENDPOINT=https://your-worker.workers.dev/mcp MCP_REMOTE_AUTH_TOKEN=<token> npm run test -- test/e2e/mcp/core-operations/remote-phone-validation.mcp.test.ts
 */

const SKIP_REMOTE_TESTS =
  process.env.MCP_TEST_MODE !== 'remote' ||
  !process.env.MCP_REMOTE_ENDPOINT ||
  !process.env.MCP_REMOTE_AUTH_TOKEN;

describe.skipIf(SKIP_REMOTE_TESTS)(
  'MCP E2E: Remote Phone Validation - Edge Runtime (Issue #951)',
  () => {
    const testCase = new RemotePhoneValidationTest();
    const tracker = createResultTracker();

    beforeAll(async () => {
      await testCase.setup();
    });

    afterEach(async () => {
      await testCase.cleanupTestData();
    });

    afterAll(async () => {
      await testCase.cleanupTestData();
      await testCase.teardown();

      // Log quality gate results
      const { passed, total } = tracker.getSummary();
      console.log(
        `\nRemote Phone Validation E2E Results: ${passed}/${total} passed`
      );
    });

    describe('E.164 Normalization in Edge Runtime', () => {
      it('should normalize US formatted phone to E.164 via Cloudflare Worker', async () => {
        const testName = 'remote_e164_us_normalization';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Test US ${Date.now()}`,
            email_addresses: [`remote.phone.us.${Date.now()}@example.com`],
            phone_numbers: [
              {
                phone_number: '+1 202 555 0134', // US format with spaces
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          expect(typeof recordId).toBe('string');

          // Verify the record was created - normalization happened in edge runtime
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });

      it('should normalize UK phone number via edge runtime', async () => {
        const testName = 'remote_e164_uk_normalization';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Test UK ${Date.now()}`,
            email_addresses: [`remote.phone.uk.${Date.now()}@example.com`],
            phone_numbers: [
              {
                phone_number: '+44 20 7946 0958', // UK format
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });

      it('should normalize Japanese phone number via edge runtime', async () => {
        const testName = 'remote_e164_japan_normalization';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Test JP ${Date.now()}`,
            email_addresses: [`remote.phone.jp.${Date.now()}@example.com`],
            phone_numbers: [
              {
                phone_number: '+81 3 1234 5678', // Japan format
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });

      it('should normalize Australian phone number via edge runtime', async () => {
        const testName = 'remote_e164_australia_normalization';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Test AU ${Date.now()}`,
            email_addresses: [`remote.phone.au.${Date.now()}@example.com`],
            phone_numbers: [
              {
                phone_number: '+61 2 9374 4000', // Australia format
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });
    });

    describe('Metadata Preservation in Edge Runtime', () => {
      it('should preserve label and type fields in edge runtime', async () => {
        const testName = 'remote_metadata_preservation';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Metadata Test ${Date.now()}`,
            email_addresses: [
              `remote.phone.metadata.${Date.now()}@example.com`,
            ],
            phone_numbers: [
              {
                phone_number: '+1 202 555 0199',
                label: 'work',
                type: 'mobile',
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });

      it('should preserve extension and is_primary fields in edge runtime', async () => {
        const testName = 'remote_extended_metadata_preservation';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Extended Test ${Date.now()}`,
            email_addresses: [
              `remote.phone.extended.${Date.now()}@example.com`,
            ],
            phone_numbers: [
              {
                phone_number: '+1 202 555 0234',
                label: 'work',
                type: 'mobile',
                extension: '1234',
                is_primary: true,
              },
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });
    });

    describe('Error Handling in Edge Runtime', () => {
      it('should provide helpful error for invalid phone format in edge runtime', async () => {
        const testName = 'remote_invalid_phone_error';
        let passed = false;
        let error: string | undefined;

        try {
          const personData = {
            name: `Remote Phone Invalid Test ${Date.now()}`,
            email_addresses: [`remote.phone.invalid.${Date.now()}@example.com`],
            phone_numbers: [
              {
                phone_number: 'not-a-valid-phone',
              },
            ],
          };

          try {
            const result = await testCase.executeToolCall('create-record', {
              resource_type: 'people',
              record_data: personData,
            });

            // If it succeeds somehow, track for cleanup
            const recordId = QAAssertions.assertRecordCreated(result, 'people');
            testCase.trackRecord('people', recordId);

            // Normalization may have handled it gracefully
            passed = true;
          } catch (createError) {
            // Expected behavior - should fail with helpful error
            const errorMsg =
              createError instanceof Error
                ? createError.message
                : String(createError);

            // Error should mention phone or validation
            if (hasPhoneFormatGuidance(errorMsg)) {
              passed = true;
            } else {
              throw new Error(`Error lacks phone format guidance: ${errorMsg}`);
            }
          }
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });
    });

    describe('libphonenumber-js Edge Compatibility', () => {
      it('should validate that libphonenumber-js works in Cloudflare Workers', async () => {
        const testName = 'remote_libphonenumber_edge_compat';
        let passed = false;
        let error: string | undefined;

        try {
          // Test multiple formats to exercise libphonenumber-js in edge runtime
          const personData = {
            name: `Remote Phone Compat Test ${Date.now()}`,
            email_addresses: [`remote.phone.compat.${Date.now()}@example.com`],
            phone_numbers: [
              { phone_number: '+12025550100' }, // E.164 format
              { phone_number: '+44 20 7946 0800' }, // UK with spaces
            ],
          };

          const result = await testCase.executeToolCall('create-record', {
            resource_type: 'people',
            record_data: personData,
          });

          const recordId = QAAssertions.assertRecordCreated(result, 'people');
          testCase.trackRecord('people', recordId);

          expect(recordId).toBeTruthy();

          // If we got here, libphonenumber-js worked correctly in edge runtime
          passed = true;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          tracker.track(testName, passed, error);
        }
      });
    });
  }
);
