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
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();
describe.skipIf(!runIntegrationTests)('IT-106: Attribute validation', () => {
  let fixtures: IntegrationFixtures;
  const createTestCompany = async (attributes: Record<string, unknown>) => {
    const company = await fixtures.create('company', async (name) => {
      const response = await getAttioClient().post(
        '/objects/companies/records',
        {
          data: { values: { ...attributes, name } },
        }
      );
      return response.data.data;
    });
    return company.id.record_id as string;
  };

  beforeAll(() => {
    fixtures = new IntegrationFixtures(getAttioClient());
    clearAttributeCache();
  });

  afterAll(async () => {
    await fixtures?.cleanup();
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
      name: 'Attribute validation fixture',
      is_customer: 'true',
      company_size: '100',
      description: 'Test company',
    };

    const validated = await CompanyValidator.validateCreate(companyData);
    expect(validated.is_customer).toBe(true);
    expect(validated.company_size).toBe(100);

    const companyId = await createTestCompany(validated);
    expect(companyId).toBeDefined();
  });

  it('IT-106.3: validates company updates with type coercion', async () => {
    const companyId = await createTestCompany({
      name: 'Attribute validation fixture',
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
      data: { values: validated },
    });

    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`
    );
    expect(response.data.data).toBeDefined();
  });

  it('IT-106.4: validates individual attribute updates', async () => {
    const companyId = await createTestCompany({
      name: 'Attribute validation fixture',
    });
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
      data: { values: { [attributeName]: validatedValue } },
    });

    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`
    );
    expect(response.data.data).toBeDefined();
  });

  it('IT-106.5: rejects invalid attribute values', async () => {
    const invalidData = {
      name: 'Attribute validation fixture',
      company_size: 'not-a-number',
    };

    await expect(
      CompanyValidator.validateCreate(invalidData)
    ).rejects.toThrow();
  });
});
