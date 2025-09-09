/**
 * Domain conflict detection for companies
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { getLazyAttioClient } from '../../../../../api/lazy-client.js';

/**
 * Checks if a domain already exists in the system to prevent uniqueness conflicts
 * Essential for preventing duplicate company creation
 */
export async function checkDomainConflict(domain: string): Promise<{
  exists: boolean;
  existingCompany?: { name: string; id: string };
}> {
  try {
    const client = getLazyAttioClient();

    // Search for companies with this domain
    const response = await client.post('/objects/companies/records/query', {
      filter: {
        domains: {
          any_of: [{ domain: domain }],
        },
      },
      limit: 1,
    });

    const companies = response?.data?.data || [];

    if (companies.length > 0) {
      const existingCompany = companies[0];
      return {
        exists: true,
        existingCompany: {
          name: existingCompany.values?.name?.[0]?.value || 'Unknown Company',
          id: existingCompany.id?.record_id || existingCompany.id,
        },
      };
    }

    return { exists: false };
  } catch (error) {
    console.warn('Failed to check domain conflict:', error);
    // If we can't check, assume no conflict to avoid blocking legitimate creates
    return { exists: false };
  }
}
