/**
 * Relationship-based queries for deals
 */
import { AttioRecord } from '../../types/attio.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { getAttioClient } from '../../api/attio-client.js';
import { validateNumericParam } from '../../utils/filters/index.js';

/**
 * Search for deals associated with a specific company
 *
 * @param companyId - ID of the company to find deals for
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching deal records
 */
export async function searchDealsByCompany(
  companyId: string,
  limit: number | string = 20,
  offset: number | string = 0
): Promise<AttioRecord[]> {
  try {
    // Validate companyId
    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
      throw new FilterValidationError('Company ID must be a non-empty string');
    }

    // Validate and normalize limit and offset parameters


    // Query deals filtered by associated_company
      filter: {
        associated_company: {
          target_object: 'companies',
          target_record_id: companyId,
        },
      },
      limit: validatedLimit,
      offset: validatedOffset,
    });

    return Array.isArray(deals) ? deals : [];
  } catch (error: unknown) {
    // Convert all errors to FilterValidationErrors for consistent handling
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(
      `Failed to search deals by company: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}