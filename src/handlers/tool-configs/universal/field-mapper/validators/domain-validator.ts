/**
 * Domain conflict detection for companies
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { getAttioClient } from '../../../../../api/attio-client.js';

    // Search for companies with this domain
      filter: {
        domains: {
          any_of: [{ domain: domain }],
        },
      },
      limit: 1,
    });


    if (companies.length > 0) {
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
