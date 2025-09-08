/**
 * PersonCreateStrategy - Handles person-specific creation logic
 * 
 * Extracted from UniversalCreateService.createPersonRecord (lines 903-1053)
 */

import { BaseCreateStrategy, CreateStrategyParams, CreateStrategyResult } from './BaseCreateStrategy.js';
import { convertAttributeFormats, getFormatErrorHelp, validatePeopleAttributesPrePost } from '../../../utils/attribute-format-helpers.js';
import { debug } from '../../../utils/logger.js';
import { getCreateService } from '../index.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { PeopleDataNormalizer } from '../../../utils/normalization/people-normalization.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { ValidationService } from '../../ValidationService.js';

export class PersonCreateStrategy extends BaseCreateStrategy {
  constructor() {
    super(UniversalResourceType.PEOPLE);
  }

  async create(params: CreateStrategyParams): Promise<CreateStrategyResult> {
    const { mapped_data } = params;
    
    try {
      // Apply field allowlist for E2E test isolation (prevent extra field rejections)

      // Normalize people data first (handle name string/object, email singular/array)

      // Validate email addresses after normalization for consistent validation
      ValidationService.validateEmailAddresses(normalizedData);

      // Apply format conversions for common mistakes

      // Validate people attributes before POST to ensure correct Attio format
      validatePeopleAttributesPrePost(correctedData);
      
      debug('PersonCreateStrategy', 'People validation passed, final payload shape', {
        name: Array.isArray(correctedData.name)
          ? 'ARRAY'
          : typeof correctedData.name,
        email_addresses: Array.isArray(correctedData.email_addresses)
          ? 'ARRAY'
          : typeof correctedData.email_addresses,
      });

      // Use mock injection for test environments (Issue #480 compatibility)

      // Defensive validation: Ensure createPerson returned a valid record
      if (!result) {
        throw new UniversalValidationError(
          'Person creation failed: createPerson returned null/undefined',
          ErrorType.API_ERROR,
          {
            field: 'result',
            suggestion: 'Check API connectivity and data format',
          }
        );
      }

      if (!result.id || !result.id.record_id) {
        throw new UniversalValidationError(
          `Person creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
          ErrorType.API_ERROR,
          {
            field: 'id',
            suggestion: 'Verify API response format and record creation',
          }
        );
      }

      return {
        record: result,
        metadata: {
          warnings: this.collectWarnings(correctedData)
        }
      };
    } catch (error: unknown) {
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');

      // Handle uniqueness conflicts with helpful guidance
      if (
        errorObj?.code === 'uniqueness_conflict' ||
        errorMessage.includes('uniqueness_conflict')
      ) {
        // Check if it's an email uniqueness conflict
        if (
          errorMessage.includes('email') ||
          errorMessage.includes('email_address')
        ) {
            emailAddresses?.length > 0
              ? emailAddresses.join(', ')
              : 'the provided email';

          throw new UniversalValidationError(
            `A person with email "${emailText}" already exists. Try searching for existing records first or use different email addresses.`,
            ErrorType.USER_ERROR,
            {
              suggestion:
                'Use search-records to find the existing person, or provide different email addresses',
              field: 'email_addresses',
            }
          );
        }

        // Generic uniqueness conflict
          errorMessage,
          mapped_data
        );
        throw new UniversalValidationError(
          enhancedMessage,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }

      // Enhance error messages with format help
      if (
        errorMessage.includes('invalid value') ||
        errorMessage.includes('Format Error')
      ) {
        if (match && match[1]) {
            'people',
            match[1],
            (error as Error).message
          );
          throw new UniversalValidationError(
            enhancedError,
            ErrorType.USER_ERROR,
            { suggestion, field: match[1] }
          );
        }
      }

      // Check for uniqueness constraint violations (fallback)
      if (errorMessage.includes('uniqueness constraint')) {
          errorMessage,
          mapped_data
        );
        throw new UniversalValidationError(
          enhancedMessage,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }
      
      throw error;
    }
  }

  protected validateResourceData(data: Record<string, unknown>): void {
    // Person validation is handled by the normalization and email validation steps
    // No specific field requirements for person creation
  }

  protected formatForAPI(data: Record<string, unknown>): Record<string, unknown> {
    // Formatting is handled by the normalization process
    return data;
  }

  /**
   * Minimal allowlist for person creation in E2E environments
   * Uses smallest safe set to avoid 422 rejections in full test runs
   * Based on user guidance for maximum test stability
   */
  private pickAllowedPersonFields(input: PersonFieldInput): AllowedPersonFields {
    const out: AllowedPersonFields = {};

    // Core required field
    if (input.name && typeof input.name === 'string') out.name = input.name;

    // Email handling - prefer array form to avoid uniqueness flakiness
    if (Array.isArray(input.email_addresses) && input.email_addresses.length) {
      out.email_addresses = input.email_addresses;
    } else if (input.email && typeof input.email === 'string') {
      out.email_addresses = [String(input.email)]; // Convert to string array format
    }

    // Professional information (minimal set)
    if (input.title && typeof input.title === 'string') out.title = input.title;
    if (input.job_title && typeof input.job_title === 'string')
      out.job_title = input.job_title;

    // DO NOT forward department/website/phones/location/socials for E2E
    // Keep test factories generating them but never send to API layer

    return out;
  }

  /**
   * Person creation with mock support
   */
  private async createPersonWithMockSupport(
    personData: Record<string, unknown>
  ): Promise<any> {
    return await service.createPerson(personData);
  }

  /**
   * Enhance uniqueness error messages with helpful context
   */
  private async enhanceUniquenessError(
    errorMessage: string,
    mappedData: Record<string, unknown>
  ): Promise<string> {
    // Extract field name from error message if possible
      errorMessage.match(/field\s+["']([^"']+)["']/i) ||
      errorMessage.match(/attribute\s+["']([^"']+)["']/i) ||
      errorMessage.match(/column\s+["']([^"']+)["']/i);

    let enhancedMessage = `Uniqueness constraint violation for ${this.resource_type}`;

    if (fieldMatch && fieldMatch[1]) {
      enhancedMessage += `: The value "${fieldValue}" for field "${fieldName}" already exists.`;
    } else {
      enhancedMessage += `: A record with these values already exists.`;
    }

    enhancedMessage +=
      '\n\nPlease check existing records or use different values for unique fields.';

    return enhancedMessage;
  }

  private collectWarnings(data: Record<string, unknown>): string[] {
    const warnings: string[] = [];
    
    if (!data.email_addresses || (Array.isArray(data.email_addresses) && data.email_addresses.length === 0)) {
      warnings.push('Person created without email addresses - consider adding one for better identification');
    }
    
    return warnings;
  }
}
