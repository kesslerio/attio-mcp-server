/**
 * IT-108: Live timeframe contract coverage.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initializeAttioClient } from '@/api/attio-client.js';
import { searchByTimeframeConfig } from '@/handlers/tool-configs/universal/operations/timeframe-search.js';
import {
  TimeframeType,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

describe.skipIf(!runIntegrationTests)(
  'IT-108: Timeframe live contract',
  { timeout: 30000 },
  () => {
    beforeAll(() => {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);
    });

    it('supports one-sided created_at timeframe queries for companies', async () => {
      const results = await searchByTimeframeConfig.handler({
        resource_type: UniversalResourceType.COMPANIES,
        timeframe_type: TimeframeType.CREATED,
        start_date: '2024-01-01',
        limit: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('supports one-sided last_interaction timeframe queries for people', async () => {
      const results = await searchByTimeframeConfig.handler({
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
        start_date: '2024-01-01',
        limit: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('fails modified timeframe queries honestly for people', async () => {
      await expect(
        searchByTimeframeConfig.handler({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_type: TimeframeType.MODIFIED,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          limit: 3,
        })
      ).rejects.toThrow(
        /Modified timeframe searches are not supported by Attio/
      );
    });
  }
);
