/**
 * Integration Test for Issue #473: Field Mapping Consistency in Update Operations
 *
 * Tests field mapping consistency across different object types to ensure:
 * - All field updates persist correctly
 * - Fields map to correct attributes consistently
 * - Special characters are handled correctly
 * - Consistent behavior across companies, people, tasks
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalDeleteService } from '../../src/services/UniversalDeleteService.js';

interface TestRecord {
  id: string;
  resource_type: UniversalResourceType;
}

describe('Issue #473: Field Mapping Consistency', () => {
  const testRecords: TestRecord[] = [];

  afterAll(async () => {
    // Cleanup all test records
    for (const record of testRecords) {
      try {
        await UniversalDeleteService.deleteRecord({
          resource_type: record.resource_type,
          record_id: record.id,
        });
        console.log(
          `✅ Cleaned up ${record.resource_type} record: ${record.id}`
        );
      } catch (error) {
        console.warn(
          `Failed to cleanup ${record.resource_type} record ${record.id}:`,
          error
        );
      }
    }
  });

  describe('Company Field Mapping', () => {
    test('should correctly map and persist company fields', async () => {
      console.log('Testing Company Field Mapping...');

      // Create a test company
      const company = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: {
          name: 'Field Mapping Test Corp',
          domains: ['fieldtest.com'],
          description: 'Original description',
        },
      });

      const companyId = company.id.record_id;
      testRecords.push({
        id: companyId,
        resource_type: UniversalResourceType.COMPANIES,
      });
      console.log(`✅ Created test company: ${companyId}`);

      // Update multiple fields
      const updateData = {
        description: 'Updated description',
        industry: 'Technology',
        website: 'https://fieldtest.com',
        employee_count: 100,
      };

      const updatedCompany = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: companyId,
        record_data: updateData,
      });

      console.log('✅ Updated company fields');

      // Retrieve and verify
      const retrieved = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: companyId,
      });

      const mappingErrors: Array<{
        field: string;
        expected: unknown;
        actual: unknown;
      }> = [];

      // Check each field
      Object.entries(updateData).forEach(([field, expectedValue]) => {
        // Get actual value from the record (handle Attio's wrapped format)
        let actualValue;

        // Handle field name mappings that might have occurred
        const possibleFields = [
          field,
          field === 'description' ? 'notes' : field,
          field === 'website' ? 'domains' : field,
        ];

        for (const possibleField of possibleFields) {
          const fieldData = retrieved.values?.[possibleField];
          if (fieldData) {
            if (Array.isArray(fieldData) && fieldData.length > 0) {
              actualValue = fieldData[0]?.value || fieldData[0];
            } else {
              actualValue = fieldData;
            }
            break;
          }
        }

        // Special handling for website -> domains mapping
        if (
          field === 'website' &&
          actualValue &&
          Array.isArray(retrieved.values?.domains)
        ) {
          const domains = retrieved.values.domains;
          if (domains.length > 0) {
            const domainValue = domains[0]?.value || domains[0];
            // Check if the website URL contains the domain
            if (
              expectedValue.toString().includes(domainValue) ||
              domainValue === expectedValue
            ) {
              actualValue = expectedValue; // Consider it a match
            }
          }
        }

        if (actualValue !== expectedValue) {
          mappingErrors.push({
            field,
            expected: expectedValue,
            actual: actualValue,
          });
          console.log(`❌ Field "${field}" mapping error:`);
          console.log(`   Expected: ${expectedValue}`);
          console.log(`   Actual: ${actualValue || 'undefined'}`);
        } else {
          console.log(`✅ Field "${field}" mapped correctly`);
        }
      });

      // Assert no mapping errors
      if (mappingErrors.length > 0) {
        const errorDetails = mappingErrors
          .map((e) => `${e.field}: expected ${e.expected}, got ${e.actual}`)
          .join('; ');
        throw new Error(`Field mapping errors: ${errorDetails}`);
      }

      console.log('✅ All company fields mapped correctly');
    });
  });

  describe('People Field Mapping', () => {
    test('should correctly map and persist people fields', async () => {
      console.log('Testing People Field Mapping...');

      // Create test person
      const person = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_data: {
          name: 'John Doe',
          email_addresses: ['john.doe@fieldtest.com'],
        },
      });

      const personId = person.id.record_id;
      testRecords.push({
        id: personId,
        resource_type: UniversalResourceType.PEOPLE,
      });
      console.log(`✅ Created test person: ${personId}`);

      // Update fields
      const updates = {
        title: 'Senior Developer',
        phone: '+1-555-0123',
        company: 'Field Test Corp',
        notes: 'Updated notes field',
      };

      const updatedPerson = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: personId,
        record_data: updates,
      });

      console.log('✅ Updated person fields');

      // Verify updates
      const retrieved = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: personId,
      });

      const errors: string[] = [];

      Object.entries(updates).forEach(([field, expectedValue]) => {
        // Handle field name mappings
        const possibleFields = [
          field,
          field === 'phone' ? 'phone_numbers' : field,
          field === 'company' ? 'company_id' : field,
        ];

        let actualValue;
        for (const possibleField of possibleFields) {
          const fieldData = retrieved.values?.[possibleField];
          if (fieldData) {
            if (Array.isArray(fieldData) && fieldData.length > 0) {
              actualValue =
                fieldData[0]?.value ||
                fieldData[0]?.phone_number ||
                fieldData[0];
            } else {
              actualValue = fieldData;
            }
            break;
          }
        }

        if (actualValue !== expectedValue) {
          errors.push(
            `Field "${field}" not updated correctly: expected ${expectedValue}, got ${actualValue}`
          );
          console.log(`❌ Field "${field}" not updated correctly`);
        } else {
          console.log(`✅ Field "${field}" updated correctly`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`People field mapping errors: ${errors.join('; ')}`);
      }

      console.log('✅ All people fields updated correctly');
    });
  });

  describe('Special Character Field Mapping', () => {
    test('should handle special characters correctly', async () => {
      console.log('Testing Special Character Field Mapping...');

      const specialData = {
        name: 'Test & Co.',
        description: 'Description with "quotes" and special chars: <>&',
        // Test newlines and tabs
        notes: 'Value with\nnewlines\tand\ttabs',
      };

      // Create record with special characters
      const record = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: specialData,
      });

      const recordId = record.id.record_id;
      testRecords.push({
        id: recordId,
        resource_type: UniversalResourceType.COMPANIES,
      });
      console.log(`✅ Created test company with special chars: ${recordId}`);

      // Verify initial creation handled special characters
      const retrieved = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: recordId,
      });

      const specialCharErrors: string[] = [];

      Object.entries(specialData).forEach(([field, expected]) => {
        // Handle field mappings
        const possibleFields = [
          field,
          field === 'description' ? 'notes' : field,
        ];

        let actual;
        for (const possibleField of possibleFields) {
          const fieldData = retrieved.values?.[possibleField];
          if (fieldData) {
            if (Array.isArray(fieldData) && fieldData.length > 0) {
              actual = fieldData[0]?.value || fieldData[0];
            } else {
              actual = fieldData;
            }
            break;
          }
        }

        if (actual !== expected) {
          specialCharErrors.push(
            `Field "${field}" corrupted: expected "${expected}", got "${actual}"`
          );
          console.log(`❌ Special char field "${field}" corrupted`);
          console.log(`   Expected: ${expected}`);
          console.log(`   Actual: ${actual}`);
        } else {
          console.log(`✅ Special char field "${field}" preserved`);
        }
      });

      if (specialCharErrors.length > 0) {
        throw new Error(
          `Special character handling errors: ${specialCharErrors.join('; ')}`
        );
      }

      // Now test UPDATE operations with special characters
      const updateData = {
        description: 'Updated with "new quotes" & special chars: <>',
        notes: 'Updated\nwith\ttabs\nand\nnewlines',
      };

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: recordId,
        record_data: updateData,
      });

      console.log('✅ Updated company with special characters');

      // Verify updates preserved special characters
      const updatedRecord = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: recordId,
      });

      Object.entries(updateData).forEach(([field, expected]) => {
        const possibleFields = [
          field,
          field === 'description' ? 'notes' : field,
        ];

        let actual;
        for (const possibleField of possibleFields) {
          const fieldData = updatedRecord.values?.[possibleField];
          if (fieldData) {
            if (Array.isArray(fieldData) && fieldData.length > 0) {
              actual = fieldData[0]?.value || fieldData[0];
            } else {
              actual = fieldData;
            }
            break;
          }
        }

        if (actual !== expected) {
          specialCharErrors.push(
            `Updated field "${field}" corrupted: expected "${expected}", got "${actual}"`
          );
          console.log(`❌ Updated special char field "${field}" corrupted`);
        } else {
          console.log(`✅ Updated special char field "${field}" preserved`);
        }
      });

      if (specialCharErrors.length > 0) {
        throw new Error(
          `Special character update errors: ${specialCharErrors.join('; ')}`
        );
      }

      console.log('✅ All special character tests passed');
    });
  });

  describe('Cross-Resource Type Consistency', () => {
    test('should behave consistently across all resource types', async () => {
      console.log('Testing Cross-Resource Type Consistency...');

      // Test that similar field operations behave the same way across resource types
      const testCases = [
        {
          resource_type: UniversalResourceType.COMPANIES,
          createData: { name: 'Consistency Test Co' },
          updateData: { website: `https://updated-company-${Date.now()}.com` },
        },
        {
          resource_type: UniversalResourceType.PEOPLE,
          createData: { name: 'Jane Smith' },
          updateData: { title: 'Senior Engineer' },
        },
      ];

      const consistencyResults: Array<{
        resource_type: UniversalResourceType;
        success: boolean;
        error?: string;
      }> = [];

      for (const testCase of testCases) {
        try {
          // Create record
          const record = await UniversalCreateService.createRecord({
            resource_type: testCase.resource_type,
            record_data: testCase.createData,
          });

          const recordId = record.id.record_id;
          testRecords.push({
            id: recordId,
            resource_type: testCase.resource_type,
          });

          // Update record
          await UniversalUpdateService.updateRecord({
            resource_type: testCase.resource_type,
            record_id: recordId,
            record_data: testCase.updateData,
          });

          // Verify update
          const retrieved = await UniversalRetrievalService.getRecordDetails({
            resource_type: testCase.resource_type,
            record_id: recordId,
          });

          // Check if update was persisted
          const updateField = Object.keys(testCase.updateData)[0];
          const expectedValue = Object.values(testCase.updateData)[0];

          // Handle field name mappings
          const possibleFields = [
            updateField,
            updateField === 'website' ? 'domains' : updateField,
          ];

          let actualValue;
          let foundField;
          let fieldData;
          for (const possibleField of possibleFields) {
            fieldData = retrieved.values?.[possibleField];
            if (fieldData) {
              foundField = possibleField;
              if (Array.isArray(fieldData) && fieldData.length > 0) {
                actualValue = fieldData[0]?.value || fieldData[0];
              } else {
                actualValue = fieldData;
              }
              break;
            }
          }

          // Handle specific field comparisons
          let success = false;
          if (updateField === 'website' && foundField === 'domains') {
            // For website -> domains mapping, check if URL is in the domains array
            success =
              Array.isArray(fieldData) &&
              fieldData.some((item) => (item?.value || item) === expectedValue);
          } else {
            success = actualValue === expectedValue;
          }
          consistencyResults.push({
            resource_type: testCase.resource_type,
            success,
            error: success
              ? undefined
              : `Expected ${expectedValue}, got ${actualValue}`,
          });

          console.log(
            `${success ? '✅' : '❌'} ${testCase.resource_type} consistency test ${success ? 'passed' : 'failed'}`
          );
        } catch (error) {
          consistencyResults.push({
            resource_type: testCase.resource_type,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          console.log(
            `❌ ${testCase.resource_type} consistency test failed:`,
            error
          );
        }
      }

      const failedTests = consistencyResults.filter((r) => !r.success);
      if (failedTests.length > 0) {
        const errorDetails = failedTests
          .map((f) => `${f.resource_type}: ${f.error}`)
          .join('; ');
        throw new Error(`Consistency test failures: ${errorDetails}`);
      }

      console.log('✅ All consistency tests passed');
    });
  });
});
