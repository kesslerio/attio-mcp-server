/**
 * CompanyUpdateStrategy - Handles company-specific update logic
 * 
 * Extracted from UniversalUpdateService company update logic
 * Handles domain normalization and validation
 */

import { BaseUpdateStrategy, UpdateStrategyParams, UpdateStrategyResult } from './BaseUpdateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../types/attio.js';
import { updateCompany } from '../../../objects/companies/index.js';
import { getCompanyDetails } from '../../../objects/companies/index.js';
import { UniversalValidationError, ErrorType } from '../../../handlers/tool-configs/universal/schemas.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { debug } from '../../../utils/logger.js';

export class CompanyUpdateStrategy extends BaseUpdateStrategy {
  constructor() {
    super(UniversalResourceType.COMPANIES);
  }

  async update(params: UpdateStrategyParams): Promise<UpdateStrategyResult> {
    const { record_id, mapped_data, persist_unlisted_fields } = params;
    
    // Fetch existing company if field persistence is needed
    const existingCompany = persist_unlisted_fields 
      ? await this.fetchExistingRecord(record_id)
      : null;
    
    // Validate update permissions
    await this.validateUpdatePermissions(record_id, mapped_data);
    
    // Format data for API with company-specific logic
    const companyData = this.formatForAPI(mapped_data, existingCompany);
    
    // Merge with existing fields if needed
    const finalData = await this.mergeWithExistingFields(
      companyData,
      existingCompany,
      persist_unlisted_fields || false
    );
    
    // Execute update
    const updatedCompany = await this.updateCompanyWithErrorHandling(record_id, finalData);
    // Ensure updated_at is present for tests/consumers
    (updatedCompany as any).updated_at = (updatedCompany as any).updated_at || new Date().toISOString();

    debug('Company updated successfully', {
      company_id: record_id,
      updated_fields: Object.keys(finalData)
    });

    return {
      record: updatedCompany,
      metadata: {
        updated_fields: this.identifyUpdatedFields(
          existingCompany || {},
          updatedCompany
        )
      }
    };
  }

  protected async fetchExistingRecord(record_id: string): Promise<AttioRecord | null> {
    try {
      return await getCompanyDetails(record_id);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  protected async validateUpdatePermissions(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Companies don't have special permission requirements beyond existence
    // The API call will handle existence validation
  }

  protected formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null
  ): Record<string, unknown> {
    const formatted = { ...data };
    
    // Handle domain normalization (lowercase)
    if (formatted.domains) {
      if (Array.isArray(formatted.domains)) {
        formatted.domains = formatted.domains.map(domain => 
          typeof domain === 'string' ? domain.toLowerCase() : domain
        );
      } else if (typeof formatted.domains === 'string') {
        formatted.domains = [formatted.domains.toLowerCase()];
      }
    }
    
    // Handle individual domain field
    if (formatted.domain && typeof formatted.domain === 'string') {
      formatted.domain = formatted.domain.toLowerCase();
      // Convert single domain to domains array if needed
      if (!formatted.domains) {
        formatted.domains = [formatted.domain];
      }
    }
    
    // Handle name field formatting
    if (formatted.name && typeof formatted.name === 'string') {
      formatted.name = formatted.name.trim();
    }
    
    // Handle website URL formatting
    if (formatted.website && typeof formatted.website === 'string') {
      let website = formatted.website.trim();
      // Add protocol if missing
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        website = 'https://' + website;
      }
      formatted.website = website;
    }
    
    return formatted;
  }

  /**
   * Update company with enhanced error handling and field suggestions
   */
  private async updateCompanyWithErrorHandling(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<AttioRecord> {
    try {
      return await updateCompany(record_id, data);
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(errorObj?.message || '');
      
      // Handle field not found errors with suggestions
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(this.resource_type, match[1]);
          throw new UniversalValidationError(
            (error as Error).message,
            ErrorType.USER_ERROR,
            { suggestion, field: match[1] }
          );
        }
      }
      
      // Handle domain uniqueness errors
      if (errorMessage.includes('domain') && errorMessage.includes('already exists')) {
        throw new UniversalValidationError(
          'A company with this domain already exists',
          ErrorType.USER_ERROR,
          { field: 'domain' }
        );
      }
      
      throw error;
    }
  }
}
