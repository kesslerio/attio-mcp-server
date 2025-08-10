/**
 * Integration tests for enhanced error handling
 * These tests verify that the error message improvements work end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  handleUniversalUpdate,
  handleUniversalCreate,
} from '../../src/handlers/tool-configs/universal/shared-handlers.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { clearAttributeCache } from '../../src/utils/validation-utils.js';

// Skip integration tests if SKIP_INTEGRATION_TESTS is set
const skipIntegrationTests = process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Enhanced Error Handling Integration', () => {
  beforeAll(() => {
    if (skipIntegrationTests) {
      console.log('Skipping integration tests (SKIP_INTEGRATION_TESTS=true)');
    }
  });

  afterAll(() => {
    clearAttributeCache();
  });

  describe('Invalid Select Options', { skip: skipIntegrationTests }, () => {
    it('should provide helpful error for invalid select field values', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company-123',
          record_data: {
            values: {
              company_type: 'invalid_option', // This should be a real select field
            },
          },
        });

        // If we reach here, the validation didn't work
        expect.fail('Expected validation error for invalid select option');
      } catch (error: any) {
        expect(error.message).toContain('Invalid value');
        expect(error.message).toContain('company_type');
        expect(error.message).toContain('Valid options are:');
        expect(error.message).toContain(
          'Please choose one of the valid values'
        );
      }
    });

    it('should provide helpful error for invalid multi-select values', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company-123',
          record_data: {
            values: {
              tags: ['valid_tag', 'invalid_tag'], // Assuming tags is a multi-select field
            },
          },
        });

        expect.fail(
          'Expected validation error for invalid multi-select option'
        );
      } catch (error: any) {
        expect(error.message).toContain('Invalid values');
        expect(error.message).toContain('tags');
        expect(error.message).toContain('Valid options are:');
      }
    });
  });

  describe('Read-Only Field Errors', { skip: skipIntegrationTests }, () => {
    it('should provide clear error for read-only field updates', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company-123',
          record_data: {
            values: {
              created_at: '2024-01-01T00:00:00Z', // This should be read-only
            },
          },
        });

        expect.fail('Expected validation error for read-only field update');
      } catch (error: any) {
        expect(error.message).toContain('Cannot update read-only field');
        expect(error.message).toContain('created_at');
        expect(error.message).toContain('automatically managed by the system');
        expect(error.message).toContain(
          'Remove this field from your update request'
        );
      }
    });

    it('should handle multiple read-only fields', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company-123',
          record_data: {
            values: {
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        });

        expect.fail('Expected validation error for multiple read-only fields');
      } catch (error: any) {
        expect(error.message).toContain('Cannot update read-only fields');
        expect(error.message).toContain('created_at');
        expect(error.message).toContain('updated_at');
        expect(error.message).toContain('Remove these fields');
      }
    });
  });

  describe('Field Name Suggestions', { skip: skipIntegrationTests }, () => {
    it('should suggest similar field names for typos', async () => {
      try {
        await handleUniversalCreate({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: {
            values: {
              company_description: 'A great company', // Should suggest 'note' or similar
            },
          },
        });

        expect.fail('Expected validation error for unknown field');
      } catch (error: any) {
        expect(error.message).toContain('Unknown field');
        expect(error.message).toContain('company_description');
        expect(error.message).toContain('Did you mean');
        expect(error.message).toContain(
          'Use get-attributes to see all available fields'
        );
      }
    });

    it('should provide suggestions for common field alias mistakes', async () => {
      try {
        await handleUniversalCreate({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: {
            values: {
              companyname: 'Test Company', // Should suggest 'name'
            },
          },
        });

        expect.fail('Expected validation error for field alias mistake');
      } catch (error: any) {
        expect(error.message).toContain('Unknown field');
        expect(error.message).toContain('companyname');
        expect(error.message).toContain('Did you mean');
        // Should suggest 'name' as it's similar
        expect(error.message.toLowerCase()).toContain('name');
      }
    });
  });

  describe('Mixed Validation Scenarios', { skip: skipIntegrationTests }, () => {
    it('should prioritize field existence validation over other validations', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company-123',
          record_data: {
            values: {
              non_existent_field: 'value',
              created_at: '2024-01-01T00:00:00Z', // Also read-only, but field existence should be checked first
            },
          },
        });

        expect.fail('Expected validation error');
      } catch (error: any) {
        // Should get the unknown field error first
        expect(error.message).toContain('Unknown field');
        expect(error.message).toContain('non_existent_field');
      }
    });

    it('should validate all field types in a complex record', async () => {
      try {
        await handleUniversalCreate({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: {
            values: {
              name: 'Valid Company',
              invalid_field: 'should fail',
              company_type: 'invalid_option', // Assuming this is a select field
              // created_at would be read-only but creation typically doesn't include it
            },
          },
        });

        expect.fail('Expected validation error');
      } catch (error: any) {
        // Should catch the first validation error (likely the unknown field)
        expect(error.message).toMatch(/Unknown field|Invalid value/);
      }
    });
  });

  describe('Error Message Quality', { skip: skipIntegrationTests }, () => {
    it('should provide actionable error messages', async () => {
      try {
        await handleUniversalUpdate({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: 'test-person-123',
          record_data: {
            values: {
              unknown_field: 'test_value',
            },
          },
        });

        expect.fail('Expected validation error');
      } catch (error: any) {
        // Check that error message is actionable
        expect(error.message).toContain('Unknown field');
        expect(error.message).toContain('people'); // Resource type context
        expect(error.message).toContain('get-attributes'); // Actionable suggestion

        // Should not contain generic error messages
        expect(error.message).not.toContain('Internal server error');
        expect(error.message).not.toContain('Something went wrong');
        expect(error.message).not.toContain('Unexpected error');
      }
    });

    it('should maintain professional and helpful tone', async () => {
      try {
        await handleUniversalCreate({
          resource_type: UniversalResourceType.DEALS,
          record_data: {
            values: {
              deal_description: 'A new deal', // Assuming this field doesn't exist
            },
          },
        });

        expect.fail('Expected validation error');
      } catch (error: any) {
        // Check for professional tone
        expect(error.message).not.toContain('stupid');
        expect(error.message).not.toContain('wrong');
        expect(error.message).not.toContain('bad');
        expect(error.message).not.toContain('error');

        // Should contain helpful guidance
        expect(error.message).toContain('Unknown field');
        expect(error.message).toMatch(/Did you mean|Use get-attributes/);
      }
    });
  });

  describe(
    'Resource Type Specific Errors',
    { skip: skipIntegrationTests },
    () => {
      it('should provide resource-specific field suggestions for companies', async () => {
        try {
          await handleUniversalCreate({
            resource_type: UniversalResourceType.COMPANIES,
            record_data: {
              values: {
                company_desc: 'Description', // Should suggest actual company fields
              },
            },
          });

          expect.fail('Expected validation error');
        } catch (error: any) {
          expect(error.message).toContain('companies');
          expect(error.message).toContain('company_desc');
          expect(error.message).toContain('get-attributes');
        }
      });

      it('should provide resource-specific field suggestions for people', async () => {
        try {
          await handleUniversalCreate({
            resource_type: UniversalResourceType.PEOPLE,
            record_data: {
              values: {
                person_name: 'John Doe', // Should suggest 'name' for people
              },
            },
          });

          expect.fail('Expected validation error');
        } catch (error: any) {
          expect(error.message).toContain('people');
          expect(error.message).toContain('person_name');
          // Should suggest 'name' as it's similar
          expect(error.message.toLowerCase()).toMatch(/name/);
        }
      });
    }
  );
});
