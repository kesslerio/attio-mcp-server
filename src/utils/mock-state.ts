/**
 * Mock State Manager for Test Environments
 *
 * Provides shared state storage for mock company data during testing
 * to ensure consistency between createCompany, updateCompany, and getCompanyDetails
 * when using mock responses instead of real API calls.
 *
 * This is only active in test environments (E2E_MODE=true or NODE_ENV=test)
 */

import { Company } from '../types/attio.js';

/**
 * Stores a mock company in shared state
 * Only active in test environments
 */
export function setMockCompany(companyId: string, company: Company): void {
  if (!shouldUseMockState()) {
    return; // No-op in production
  }

  if (!companyId || !company) {
    console.warn('[MockState] Invalid parameters for setMockCompany:', {
      companyId,
      company,
    });
    return;
  }

  mockCompanyStorage.set(companyId, { ...company });

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.log(`[MockState] Stored mock company: ${companyId}`, {
      storedValues: company.values,
      totalStoredCompanies: mockCompanyStorage.size,
    });
  }
}

/**
 * Retrieves a mock company from shared state
 * Returns null if not found or not in test environment
 */
export function getMockCompany(companyId: string): Company | null {
  if (!shouldUseMockState() || !companyId) {
    return null;
  }


  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.log(`[MockState] Retrieved mock company: ${companyId}`, {
      found: !!company,
      values: company?.values || null,
    });
  }

  return company ? { ...company } : null;
}

/**
 * Updates a mock company with new attributes (partial update)
 * Merges new attributes with existing ones
 */
export function updateMockCompany(
  companyId: string,
  attributes: Record<string, unknown>
): Company | null {
  if (!shouldUseMockState() || !companyId || !attributes) {
    return null;
  }

  if (!existingCompany) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.E2E_MODE === 'true'
    ) {
      console.warn(
        `[MockState] Cannot update company ${companyId}: not found in mock storage`
      );
    }
    return null;
  }

  // Merge the new attributes with existing values
    ...existingCompany.values,
    ...attributes,
  };

  const updatedCompany: Company = {
    ...existingCompany,
    values: updatedValues,
  };

  mockCompanyStorage.set(companyId, updatedCompany);

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.log(`[MockState] Updated mock company: ${companyId}`, {
      newAttributes: attributes,
      mergedValues: updatedValues,
    });
  }

  return { ...updatedCompany };
}

/**
 * Checks if a company exists in mock storage
 */
export function hasMockCompany(companyId: string): boolean {
  if (!shouldUseMockState() || !companyId) {
    return false;
  }
  return mockCompanyStorage.has(companyId);
}

/**
 * Clears all mock companies from storage
 * Useful for test cleanup
 */
export function clearMockCompanies(): void {
  if (!shouldUseMockState()) {
    return;
  }

  mockCompanyStorage.clear();

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.log(`[MockState] Cleared ${count} mock companies from storage`);
  }
}

/**
 * Gets all mock company IDs (for debugging)
 */
export function getAllMockCompanyIds(): string[] {
  if (!shouldUseMockState()) {
    return [];
  }
  return Array.from(mockCompanyStorage.keys());
}

/**
 * Creates a properly formatted Attio API value structure
 * Attio API stores values as arrays of objects with metadata
 */
export function createAttioApiValue(
  value: unknown,
  attributeType: string = 'text'
): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }

  return [
    {
      active_from: new Date().toISOString(),
      active_until: null,
      created_by_actor: {
        type: 'system',
        id: null,
      },
      value: String(value),
      attribute_type: attributeType,
    },
  ];
}

/**
 * Creates a company mock with proper Attio API structure
 * This ensures our mocks match the real API response format
 */
export function createMockCompanyWithApiStructure(
  companyId: string,
  attributes: Record<string, unknown>
): Company {
  // Convert simple attributes to Attio API format
  const apiFormattedValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      // Special handling for specific field types
      if (key === 'categories') {
        // Categories are select fields with option structure
        apiFormattedValues[key] = [
          {
            active_from: new Date().toISOString(),
            active_until: null,
            created_by_actor: { type: 'system', id: null },
            option: {
              title: String(value),
              is_archived: false,
            },
            attribute_type: 'select',
          },
        ];
      } else {
        // Default text field format
        apiFormattedValues[key] = createAttioApiValue(value, 'text');
      }
    } else {
      apiFormattedValues[key] = [];
    }
  }

  return {
    id: {
      workspace_id: 'test-workspace',
      object_id: 'companies',
      record_id: companyId,
    },
    values: apiFormattedValues,
    created_at: new Date().toISOString(),
    record_url: `https://app.attio.com/workspace/test-workspace/object/companies/${companyId}`,
  } as Company;
}
