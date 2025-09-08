/**
 * End-to-end tests for attribute validation with real Attio API
 * These tests require a valid Attio API key and will be skipped if SKIP_INTEGRATION_TESTS=true
 */
import { describe, beforeAll, afterAll, it, expect, test } from 'vitest';

import { CompanyValidator } from '../../../src/validators/company-validator.js';
import { getAttioClient } from '../../../src/api/attio-client.js';
import { InvalidRequestError } from '../../../src/errors/api-errors.js';
import { ResourceType } from '../../../src/types/attio.js';



async function createTestCompany(attributes: Record<string, unknown>) {
  return response.data.data.id.record_id;
}

async function deleteTestCompany(companyId: string) {
  await api.delete(`/objects/${ResourceType.COMPANIES}/records/${companyId}`);
}

async function cleanupTestCompanies() {
  for (const company of testCompanies) {
    await deleteTestCompany(company.id.record_id);
  }
}

describe.skipIf(SKIP_TESTS)(`Attribute Validation with Real Attio API`, () => {
  beforeAll(async () => {
    clearAttributeCache();
    (test as unknown as { setTimeout?: (ms: number) => void }).setTimeout?.(30000);
  });

  afterAll(async () => {
    await cleanupTestCompanies();
  });

  describe('Company validation with real attributes', () => {
    it('should fetch real attribute metadata from Attio API', async () => {
      expect(metadata).toBeDefined();
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.has('name')).toBe(true);
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.type).toBe('text');
    });

    it('should validate company creation with type conversion', async () => {
        name: generateUniqueName(),
        website: 'https://example.com',
        is_customer: 'true',
        company_size: '100',
        description: 'Test company',
      };
      expect(validated.is_customer).toBe(true);
      expect(validated.company_size).toBe(100);
      expect(companyId).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should validate company update with type conversion', async () => {
      expect(validated.company_size).toBe(200);
      expect(validated.is_customer).toBe(true);
      await api.patch(`/objects/${ResourceType.COMPANIES}/records/${companyId}`, { values: validated });
      expect(updatedCompany).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should validate single attribute update', async () => {
      expect(validatedValue).toBe(300);
      await api.patch(`/objects/${ResourceType.COMPANIES}/records/${companyId}`, { values: { [attributeName]: validatedValue } });
      expect(updatedCompany).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should reject invalid attribute values', async () => {
      await expect(CompanyValidator.validateCreate(invalidData)).rejects.toThrow();
    });
  });
});

