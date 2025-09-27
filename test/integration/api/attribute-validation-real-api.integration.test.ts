/**
 * End-to-end tests for attribute validation with real Attio API
 * These tests require a valid Attio API key and will be skipped if SKIP_INTEGRATION_TESTS=true
 */
import { describe, beforeAll, afterAll, it, expect, test } from 'vitest';
import { CompanyValidator } from '../../../src/validators/company-validator.js';
import { getAttioClient } from '../../../src/api/attio-client.js';
import {
  getAttributeTypeInfo,
  getObjectAttributeMetadata,
  clearAttributeCache,
} from '../../../src/api/attribute-types.js';
import { InvalidRequestError } from '../../../src/errors/api-errors.js';
import { ResourceType } from '../../../src/types/attio.js';

const SKIP_TESTS =
  process.env.RUN_REAL_API_TESTS !== 'true' || !process.env.ATTIO_API_KEY;
const TEST_PREFIX = SKIP_TESTS ? 'skip' : 'only';

const TEST_COMPANY_PREFIX = 'ValidationTest_';
const generateUniqueName = () =>
  `${TEST_COMPANY_PREFIX}${Math.floor(Math.random() * 100000)}`;

async function createTestCompany(attributes: Record<string, unknown>) {
  const companyData = { name: generateUniqueName(), ...attributes };
  const api = getAttioClient();
  const response = await api.post(
    `/objects/${ResourceType.COMPANIES}/records`,
    { values: companyData }
  );
  return response.data.data.id.record_id;
}

async function deleteTestCompany(companyId: string) {
  const api = getAttioClient();
  await api.delete(`/objects/${ResourceType.COMPANIES}/records/${companyId}`);
}

async function cleanupTestCompanies() {
  const api = getAttioClient();
  const response = await api.get(
    `/objects/${ResourceType.COMPANIES}/records?limit=100`
  );
  const companies = response.data.data || [];
  const testCompanies = companies.filter((company: any) =>
    company.values?.name?.[0]?.value?.startsWith?.(TEST_COMPANY_PREFIX)
  );
  for (const company of testCompanies) {
    await deleteTestCompany(company.id.record_id);
  }
}

describe.skipIf(SKIP_TESTS)(`Attribute Validation with Real Attio API`, () => {
  beforeAll(async () => {
    clearAttributeCache();
    (test as unknown as { setTimeout?: (ms: number) => void }).setTimeout?.(
      30000
    );
  });

  afterAll(async () => {
    await cleanupTestCompanies();
  });

  describe('Company validation with real attributes', () => {
    it('should fetch real attribute metadata from Attio API', async () => {
      const metadata = await getObjectAttributeMetadata(ResourceType.COMPANIES);
      expect(metadata).toBeDefined();
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.has('name')).toBe(true);
      const nameAttr = metadata.get('name');
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.type).toBe('text');
    });

    it('should validate company creation with type conversion', async () => {
      const companyData = {
        name: generateUniqueName(),
        website: 'https://example.com',
        is_customer: 'true',
        company_size: '100',
        description: 'Test company',
      };
      const validated = await CompanyValidator.validateCreate(companyData);
      expect(validated.is_customer).toBe(true);
      expect(validated.company_size).toBe(100);
      const companyId = await createTestCompany(validated);
      expect(companyId).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should validate company update with type conversion', async () => {
      const companyId = await createTestCompany({
        name: generateUniqueName(),
        company_size: 50,
      });
      const updateData = { company_size: '200', is_customer: 1 };
      const validated = await CompanyValidator.validateUpdate(
        companyId,
        updateData
      );
      expect(validated.company_size).toBe(200);
      expect(validated.is_customer).toBe(true);
      const api = getAttioClient();
      await api.patch(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
        { values: validated }
      );
      const response = await api.get(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`
      );
      const updatedCompany = response.data.data;
      expect(updatedCompany).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should validate single attribute update', async () => {
      const companyId = await createTestCompany({ name: generateUniqueName() });
      const attributeName = 'company_size';
      const attributeValue = '300';
      const validatedValue = await CompanyValidator.validateAttributeUpdate(
        companyId,
        attributeName,
        attributeValue
      );
      expect(validatedValue).toBe(300);
      const api = getAttioClient();
      await api.patch(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
        { values: { [attributeName]: validatedValue } }
      );
      const response = await api.get(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`
      );
      const updatedCompany = response.data.data;
      expect(updatedCompany).toBeDefined();
      await deleteTestCompany(companyId);
    });

    it('should reject invalid attribute values', async () => {
      const invalidData = {
        name: generateUniqueName(),
        company_size: 'not-a-number',
      };
      await expect(
        CompanyValidator.validateCreate(invalidData)
      ).rejects.toThrow();
    });
  });
});
