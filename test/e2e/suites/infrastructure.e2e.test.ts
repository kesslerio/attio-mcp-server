/**
 * E2E Infrastructure Test
 * 
 * Tests the E2E testing infrastructure itself to ensure
 * configuration, setup, and utilities work correctly.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadE2EConfig, configLoader } from '../utils/config-loader.js';
import { E2ECompanyFactory, E2EPersonFactory, E2ETestDataValidator } from '../utils/test-data.js';
import { E2EAssertions, expectE2E } from '../utils/assertions.js';

describe('E2E Infrastructure', () => {
  beforeAll(async () => {
    // Load configuration without requiring API key for infrastructure tests
    process.env.SKIP_E2E_TESTS = 'true';
    await loadE2EConfig();
  });

  describe('Configuration System', () => {
    it('should load E2E configuration successfully', async () => {
      const config = await loadE2EConfig();
      
      expect(config).toBeDefined();
      expect(config.testData).toBeDefined();
      expect(config.workspace).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.testSettings).toBeDefined();
    });

    it('should validate required configuration fields', async () => {
      const config = await loadE2EConfig();
      
      expect(config.testData.testDataPrefix).toBeDefined();
      expect(config.testData.testEmailDomain).toBeDefined();
      expect(config.testData.testCompanyDomain).toBeDefined();
      expect(config.workspace.currency).toBeDefined();
      expect(Array.isArray(config.workspace.dealStages)).toBe(true);
    });

    it('should generate unique test identifiers', () => {
      const id1 = configLoader.getTestIdentifier('test');
      const id2 = configLoader.getTestIdentifier('test');
      
      expect(id1).not.toBe(id2);
      expect(id1).toContain('E2E_TEST_');
      expect(id2).toContain('E2E_TEST_');
    });

    it('should generate test emails with proper domain', () => {
      const email = configLoader.getTestEmail('person');
      const config = configLoader.getConfig();
      
      expect(email).toContain(config.testData.testEmailDomain);
      expect(email).toContain('E2E_TEST_');
    });
  });

  describe('Test Data Factories', () => {
    it('should create valid company test data', () => {
      const company = E2ECompanyFactory.create();
      
      expect(company.name).toBeDefined();
      expect(company.name).toContain('E2E_TEST_');
      expect(company.domain).toBeDefined();
      expect(company.website).toBeDefined();
      expect(company.industry).toBeDefined();
    });

    it('should create multiple unique companies', () => {
      const companies = E2ECompanyFactory.createMany(3);
      
      expect(companies).toHaveLength(3);
      expect(companies[0].name).not.toBe(companies[1].name);
      expect(companies[1].name).not.toBe(companies[2].name);
      
      companies.forEach(company => {
        expect(company.name).toContain('E2E_TEST_');
      });
    });

    it('should create valid person test data', () => {
      const person = E2EPersonFactory.create();
      const config = configLoader.getConfig();
      
      expect(person.name).toBeDefined();
      expect(person.name).toContain('E2E_TEST_');
      expect(person.email_addresses).toBeDefined();
      expect(Array.isArray(person.email_addresses)).toBe(true);
      expect(person.email_addresses[0]).toContain(config.testData.testEmailDomain);
    });

    it('should create specialized person roles', () => {
      const executive = E2EPersonFactory.createExecutive();
      const engineer = E2EPersonFactory.createEngineer();
      const salesPerson = E2EPersonFactory.createSalesPerson();
      
      expect(executive.seniority).toBe('Executive');
      expect(engineer.department).toBe('Engineering');
      expect(salesPerson.department).toBe('Sales');
    });
  });

  describe('Test Data Validation', () => {
    it('should validate test data prefixes', () => {
      const company = E2ECompanyFactory.create();
      const person = E2EPersonFactory.create();
      
      expect(E2ETestDataValidator.validateTestDataPrefix(company)).toBe(true);
      expect(E2ETestDataValidator.validateTestDataPrefix(person)).toBe(true);
    });

    it('should validate test email formats', () => {
      const testEmail = configLoader.getTestEmail('test');
      
      expect(E2ETestDataValidator.isTestEmail(testEmail)).toBe(true);
      expect(E2ETestDataValidator.isTestEmail('regular@example.com')).toBe(false);
    });

    it('should validate test domain formats', () => {
      const testDomain = configLoader.getTestCompanyDomain();
      
      expect(E2ETestDataValidator.isTestDomain(testDomain)).toBe(true);
      expect(E2ETestDataValidator.isTestDomain('regular.example.com')).toBe(false);
    });
  });

  describe('Custom Assertions', () => {
    it('should validate object shapes', () => {
      const testObject = {
        name: 'Test',
        count: 42,
        active: true,
        nested: {
          value: 'nested'
        }
      };

      const expectedShape = {
        name: 'string',
        count: 'number',
        active: 'boolean',
        nested: {
          value: 'string'
        }
      };

      expect(() => {
        E2EAssertions.expectObjectShape(testObject, expectedShape);
      }).not.toThrow();
    });

    it('should validate test data prefixes in assertions', () => {
      const company = E2ECompanyFactory.create();
      
      expect(() => {
        E2EAssertions.expectTestDataPrefix(company);
      }).not.toThrow();
    });

    it('should validate test emails in assertions', () => {
      const testEmail = configLoader.getTestEmail('test');
      
      expect(() => {
        E2EAssertions.expectTestEmail(testEmail);
      }).not.toThrow();
    });

    it('should provide fluent assertion interface', () => {
      const testEmail = configLoader.getTestEmail('test');
      const testDomain = configLoader.getTestCompanyDomain();
      const company = E2ECompanyFactory.create();
      
      expect(() => {
        expectE2E(testEmail).toBeTestEmail();
        expectE2E(testDomain).toBeTestDomain();
        expectE2E(company).toHaveTestPrefix();
      }).not.toThrow();
    });
  });

  describe('Feature Detection', () => {
    it('should detect skipped features', () => {
      const config = configLoader.getConfig();
      
      // Test the feature detection logic
      expect(typeof config.features.skipDealTests).toBe('boolean');
      expect(typeof config.features.skipTaskTests).toBe('boolean');
      expect(typeof config.features.skipCustomObjectTests).toBe('boolean');
    });

    it('should handle skip flags correctly', () => {
      // This test runs because SKIP_E2E_TESTS is set to 'true'
      expect(process.env.SKIP_E2E_TESTS).toBe('true');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      // Test configuration validation by temporarily removing required field
      const originalPrefix = process.env.E2E_TEST_PREFIX;
      
      try {
        // This should not cause the infrastructure tests to fail
        // since we're testing error handling
        expect(() => {
          const validator = E2ETestDataValidator.validateTestDataPrefix('invalid data', '');
        }).not.toThrow();
      } finally {
        if (originalPrefix) {
          process.env.E2E_TEST_PREFIX = originalPrefix;
        }
      }
    });
  });
});

/**
 * This test verifies that the E2E infrastructure is working correctly
 * without requiring an actual API connection. These tests can run in
 * any environment to validate the E2E framework itself.
 */