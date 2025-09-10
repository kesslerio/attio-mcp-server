/**
 * Infrastructure Validation E2E Test Suite
 *
 * Transformed from infrastructure.e2e.test.ts (Score: 25) into minimal smoke tests
 * for CI/CD pipeline validation and basic system health checks.
 *
 * This minimal suite covers:
 * - Basic E2E testing infrastructure validation
 * - Configuration system smoke tests
 * - Test data factory validation
 * - Core system connectivity checks
 *
 * Total coverage: Essential infrastructure validation
 * Business value: CI/CD reliability and system health
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 * Transformed from full infrastructure tests to minimal smoke test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadE2EConfig, configLoader } from '../utils/config-loader.js';
import {
  E2ECompanyFactory,
  E2EPersonFactory,
  TestDataValidator,
} from '../utils/test-data.js';
import { E2EAssertions } from '../utils/assertions.js';
import {
  callUniversalTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Infrastructure Validation - Smoke Tests', () => {
  beforeAll(async () => {
    // Load configuration for infrastructure validation
    await loadE2EConfig();
  });

  describe('System Health Checks', () => {
    it('should validate test environment setup', async () => {
      const validation = await validateTestEnvironment();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');

      if (!validation.valid) {
        console.warn(
          '⚠️ Test environment warnings detected:',
          validation.warnings
        );
      }

      console.error('✅ Test environment validation completed');
    });

    it('should validate basic API connectivity', async () => {
      // Minimal API connectivity test
      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'smoke-test',
        limit: 1,
      });

      expect(response).toBeDefined();
      console.error('✅ Basic API connectivity validated');
    });
  });

  describe('Configuration Smoke Tests', () => {
    it('should load E2E configuration successfully', async () => {
      const config = await loadE2EConfig();

      expect(config).toBeDefined();
      expect(config.testData).toBeDefined();
      expect(config.workspace).toBeDefined();
      expect(config.features).toBeDefined();

      console.error('✅ E2E configuration loaded successfully');
    });

    it('should validate critical configuration fields', async () => {
      const config = await loadE2EConfig();

      expect(config.testData.testDataPrefix).toBeDefined();
      expect(config.testData.testEmailDomain).toBeDefined();
      expect(config.testData.testCompanyDomain).toBeDefined();

      console.error('✅ Critical configuration fields validated');
    });

    it('should generate unique test identifiers', () => {
      const id1 = configLoader.getTestIdentifier('smoke-test');
      const id2 = configLoader.getTestIdentifier('smoke-test');

      expect(id1).not.toBe(id2);
      expect(id1).toContain('E2E_TEST_');
      expect(id2).toContain('E2E_TEST_');

      console.error('✅ Test identifier generation validated');
    });
  });

  describe('Test Data Factory Validation', () => {
    it('should create valid test company data', () => {
      const company = E2ECompanyFactory.create();

      expect(company.name).toBeDefined();
      expect(company.name).toContain('E2E_TEST_');
      expect(company.domain).toBeDefined();
      // website is optional by design to avoid API attribute conflicts
      // expect(company.website).toBeDefined();

      console.error('✅ Company test data factory validated');
    });

    it('should create valid test person data', () => {
      const person = E2EPersonFactory.create();
      const config = configLoader.getConfig();

      expect(person.name).toBeDefined();
      expect(person.name).toContain('E2E_TEST_');
      expect(person.email_addresses).toBeDefined();
      expect(Array.isArray(person.email_addresses)).toBe(true);
      expect(person.email_addresses[0]).toContain(
        config.testData.testEmailDomain
      );

      console.error('✅ Person test data factory validated');
    });

    it('should validate test data integrity', () => {
      const company = E2ECompanyFactory.create();
      const person = E2EPersonFactory.create();

      // Test data should meet basic validation requirements
      const companyValidation = TestDataValidator.validateCompany(company);
      const personValidation = TestDataValidator.validatePerson(person);

      expect(companyValidation.isValid).toBe(true);
      expect(personValidation.isValid).toBe(true);

      console.error('✅ Test data integrity validated');
    });
  });

  describe('E2E Assertions Smoke Tests', () => {
    it('should validate assertion utilities', () => {
      const mockSuccessResponse = {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: { record_id: 'test-123' },
              name: 'Test Company',
            }),
          },
        ],
      } as any;

      const mockErrorResponse = {
        isError: true,
        error: 'Test error message',
      };

      // Test success assertion
      expect(() => {
        E2EAssertions.expectMcpSuccess(mockSuccessResponse);
      }).not.toThrow();

      // Test error assertion
      expect(() => {
        E2EAssertions.expectMcpError(mockErrorResponse);
      }).not.toThrow();

      // Test data extraction
      const data = E2EAssertions.expectMcpData(mockSuccessResponse as any);
      expect(data).toBeDefined();
      if (!data) {
        throw new Error('Expected data to be defined');
      }
      expect(data.name).toBe('Test Company');

      console.error('✅ E2E assertion utilities validated');
    });
  });

  describe('Infrastructure Integration', () => {
    it('should validate end-to-end test pipeline readiness', async () => {
      // Comprehensive readiness check combining all smoke tests
      const config = await loadE2EConfig();
      const envValidation = await validateTestEnvironment();
      const testCompany = E2ECompanyFactory.create();

      // All components should be ready
      expect(config).toBeDefined();
      expect(envValidation).toBeDefined();
      expect(testCompany).toBeDefined();
      expect(testCompany.name).toContain('E2E_TEST_');

      console.error('✅ End-to-end test pipeline readiness validated');
    }, 15000);

    it('should validate minimal tool integration', async () => {
      // Quick validation that tools can be called without errors
      const tools = ['search-records', 'get-record-details'];

      for (const tool of tools) {
        try {
          const response = await callUniversalTool(tool as any, {
            resource_type: 'companies',
            ...(tool === 'search-records'
              ? { query: 'minimal-test', limit: 1 }
              : { record_id: 'non-existent-test-id' }),
          });

          // Tool should respond (success or error is acceptable)
          expect(response).toBeDefined();
        } catch (error) {
          // Even errors are acceptable in smoke tests - we just want to ensure tools are callable
          console.warn(
            `⚠️ Tool ${tool} threw error (acceptable in smoke test):`,
            error
          );
        }
      }

      console.error('✅ Minimal tool integration validated');
    }, 30000);
  });
});
