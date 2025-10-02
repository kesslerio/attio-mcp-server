/**
 * IT-106: Attribute validation against live Attio API.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompanyValidator } from '@/validators/company-validator.js';
import { getAttioClient } from '@/api/attio-client.js';
import {
  getObjectAttributeMetadata,
  clearAttributeCache,
} from '@/api/attribute-types.js';
import { ResourceType } from '@/types/attio.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();
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
  return response.data.data.id.record_id as string;
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

describe.skipIf(!runIntegrationTests)('IT-106: Attribute validation', () => {
  beforeAll(async () => {
    clearAttributeCache();
  });

  afterAll(async () => {
    await cleanupTestCompanies();
  });

  it('IT-106.1: fetches live attribute metadata', async () => {
    const metadata = await getObjectAttributeMetadata(ResourceType.COMPANIES);
    expect(metadata).toBeDefined();
    expect(metadata.size).toBeGreaterThan(0);
    expect(metadata.has('name')).toBe(true);

    const nameAttr = metadata.get('name');
    expect(nameAttr).toBeDefined();
    expect(nameAttr?.type).toBe('text');
  });

  it('IT-106.2: validates company creation with type coercion', async () => {
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

  it('IT-106.3: validates company updates with type coercion', async () => {
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
    await api.patch(`/objects/${ResourceType.COMPANIES}/records/${companyId}`, {
      values: validated,
    });

    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`
    );
    expect(response.data.data).toBeDefined();
    await deleteTestCompany(companyId);
  });

  it('IT-106.4: validates individual attribute updates', async () => {
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
    await api.patch(`/objects/${ResourceType.COMPANIES}/records/${companyId}`, {
      values: { [attributeName]: validatedValue },
    });

    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`
    );
    expect(response.data.data).toBeDefined();
    await deleteTestCompany(companyId);
  });

  it('IT-106.5: rejects invalid attribute values', async () => {
    const invalidData = {
      name: generateUniqueName(),
      company_size: 'not-a-number',
    };

    await expect(
      CompanyValidator.validateCreate(invalidData)
    ).rejects.toThrow();
  });
});
