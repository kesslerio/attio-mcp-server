/**
 * PersonUpdateStrategy - Handles person-specific update logic
 * 
 * Extracted from UniversalUpdateService person update logic
 * Handles email validation and name field normalization
 */

import { BaseUpdateStrategy, UpdateStrategyParams, UpdateStrategyResult } from './BaseUpdateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../types/attio.js';
import { updatePerson } from '../../../objects/people-write.js';
import { getPersonDetails } from '../../../objects/people/basic.js';
import { ValidationService } from '../../ValidationService.js';
import { UniversalValidationError, ErrorType } from '../../../handlers/tool-configs/universal/schemas.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { debug } from '../../../utils/logger.js';

export class PersonUpdateStrategy extends BaseUpdateStrategy {
  constructor() {
    super(UniversalResourceType.PEOPLE);
  }

  async update(params: UpdateStrategyParams): Promise<UpdateStrategyResult> {
    const { record_id, mapped_data, persist_unlisted_fields } = params;
    
    // Fetch existing person if field persistence is needed
    const existingPerson = persist_unlisted_fields 
      ? await this.fetchExistingRecord(record_id)
      : null;
    
    // Validate update permissions
    await this.validateUpdatePermissions(record_id, mapped_data);
    
    // Format data for API with person-specific logic
    const personData = this.formatForAPI(mapped_data, existingPerson);
    
    // Merge with existing fields if needed
    const finalData = await this.mergeWithExistingFields(
      personData,
      existingPerson,
      persist_unlisted_fields || false
    );
    
    // Execute update with validation
    const updatedPerson = await this.updatePersonWithErrorHandling(record_id, finalData);

    debug('Person updated successfully', {
      person_id: record_id,
      updated_fields: Object.keys(finalData)
    });

    return {
      record: updatedPerson,
      metadata: {
        updated_fields: this.identifyUpdatedFields(
          existingPerson || {},
          updatedPerson
        )
      }
    };
  }

  protected async fetchExistingRecord(record_id: string): Promise<AttioRecord | null> {
    try {
      return await getPersonDetails(record_id);
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
    // People don't have special permission requirements beyond existence
    // The API call will handle existence validation
    
    // Validate email addresses early
    ValidationService.validateEmailAddresses(data);
  }

  protected formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null
  ): Record<string, unknown> {
    const formatted = { ...data };
    
    // Handle email normalization (lowercase)
    if (formatted.email_addresses) {
      if (Array.isArray(formatted.email_addresses)) {
        formatted.email_addresses = formatted.email_addresses.map(email => 
          typeof email === 'string' ? email.toLowerCase().trim() : email
        );
      } else if (typeof formatted.email_addresses === 'string') {
        formatted.email_addresses = [formatted.email_addresses.toLowerCase().trim()];
      }
    }
    
    // Handle individual email field
    if (formatted.email && typeof formatted.email === 'string') {
      formatted.email = formatted.email.toLowerCase().trim();
      // Convert single email to email_addresses array if needed
      if (!formatted.email_addresses) {
        formatted.email_addresses = [formatted.email];
      }
    }
    
    // Handle name field normalization
    if (formatted.first_name && typeof formatted.first_name === 'string') {
      formatted.first_name = formatted.first_name.trim();
    }
    
    if (formatted.last_name && typeof formatted.last_name === 'string') {
      formatted.last_name = formatted.last_name.trim();
    }
    
    if (formatted.full_name && typeof formatted.full_name === 'string') {
      formatted.full_name = formatted.full_name.trim();
    }
    
    // Generate full_name from first_name + last_name if missing
    if (!formatted.full_name && formatted.first_name && formatted.last_name) {
      formatted.full_name = `${formatted.first_name} ${formatted.last_name}`;
    }
    
    // Handle phone number normalization
    if (formatted.phone_numbers) {
      if (Array.isArray(formatted.phone_numbers)) {
        formatted.phone_numbers = formatted.phone_numbers.map(phone => 
          typeof phone === 'string' ? phone.replace(/\s+/g, '') : phone
        );
      } else if (typeof formatted.phone_numbers === 'string') {
        formatted.phone_numbers = [formatted.phone_numbers.replace(/\s+/g, '')];
      }
    }
    
    // Handle individual phone field
    if (formatted.phone && typeof formatted.phone === 'string') {
      const cleanPhone = formatted.phone.replace(/\s+/g, '');
      formatted.phone = cleanPhone;
      if (!formatted.phone_numbers) {
        formatted.phone_numbers = [cleanPhone];
      }
    }
    
    return formatted;
  }

  /**
   * Update person with enhanced error handling and field suggestions
   */
  private async updatePersonWithErrorHandling(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<AttioRecord> {
    try {
      return await updatePerson(record_id, data as any);
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
      
      // Handle email uniqueness errors
      if (errorMessage.includes('email') && errorMessage.includes('already exists')) {
        throw new UniversalValidationError(
          'A person with this email already exists',
          ErrorType.USER_ERROR,
          { field: 'email' }
        );
      }
      
      throw error;
    }
  }
}