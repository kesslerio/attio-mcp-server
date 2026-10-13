/** IT-001: Batch updates against run-owned companies in the live Attio API. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { batchUpdateCompanies } from '@/objects/batch-companies.js';
import { createCompany } from '@/objects/companies/index.js';
import { getAttioClient } from '@/api/attio-client.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

describe.skipIf(!shouldRunIntegrationTests())(
  'IT-001: Batch company operations',
  () => {
    let fixtures: IntegrationFixtures;
    const companyIds: string[] = [];

    beforeAll(async () => {
      fixtures = new IntegrationFixtures(getAttioClient());
      for (let index = 0; index < 3; index++) {
        const company = await fixtures.create('company', (name) =>
          createCompany({ name })
        );
        companyIds.push(company.id.record_id);
      }
    }, 30000);

    afterAll(async () => {
      await fixtures?.cleanup();
    }, 30000);

    it('IT-001.1: updates multiple companies in a batch', async () => {
      expect(companyIds).toHaveLength(3);
      const updates = companyIds.map((id) => ({
        id,
        attributes: { description: 'Updated by owned integration fixture' },
      }));
      const result = await batchUpdateCompanies({ updates });
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
      for (const id of companyIds) {
        const response = await getAttioClient().get(
          `/objects/companies/records/${id}`
        );
        expect(response.data.data.values.description[0].value).toBe(
          updates[0].attributes.description
        );
      }
    }, 30000);
  }
);
