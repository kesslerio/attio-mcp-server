/**
 * CompanyCreateStrategy - Handles company-specific creation logic
 * 
 * Extracted from UniversalCreateService.createCompanyRecord (lines 758-839)
 */

import { BaseCreateStrategy, CreateStrategyParams, CreateStrategyResult } from './BaseCreateStrategy.js';
import { convertAttributeFormats } from '../../../utils/attribute-format-helpers.js';
import { debug } from '../../../utils/logger.js';
import { getCreateService, shouldUseMockData } from '../index.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { getFormatErrorHelp } from '../../../utils/attribute-format-helpers.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';

export class CompanyCreateStrategy extends BaseCreateStrategy {
  constructor() {
    super(UniversalResourceType.COMPANIES);
  }

  async create(params: CreateStrategyParams): Promise<CreateStrategyResult> {
    const { mapped_data } = params;
    
    // Validate company-specific requirements
    this.validateResourceData(mapped_data);
    
    // Format for API
    
    // Apply attribute format conversions
    
    try {
      // Create via API with mock support
      
      // Defensive validation: Ensure createCompany returned a valid record
      if (!result) {
        throw new UniversalValidationError(
          'Company creation failed: createCompany returned null/undefined',
          ErrorType.API_ERROR,
          {
            field: 'result',
            suggestion: 'Check API connectivity and data format',
          }
        );
      }

      if (!result.id || !result.id.record_id) {
        throw new UniversalValidationError(
          `Company creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
          ErrorType.API_ERROR,
          {
            field: 'id',
            suggestion: 'Verify API response format and record creation',
          }
        );
      }

      debug('CompanyCreateStrategy', 'Company created successfully', {
        company_id: result.id.record_id,
        name: convertedData.name
      });

      return {
        record: result,
        metadata: {
          warnings: this.collectWarnings(convertedData)
        }
      };
    } catch (error: unknown) {
      // Enhance error messages with format help
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
          
      if (errorMessage.includes('Cannot find attribute')) {
        if (match && match[1]) {
            'companies',
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
      
      // Check for uniqueness constraint violations
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
    // Company must have either name or company_name field
    if (!data.name && !data.company_name) {
      throw this.createFieldTypeError('name', 'string', undefined);
    }
  }

  protected formatForAPI(data: Record<string, unknown>): Record<string, unknown> {
    
    // Handle domain normalization
    if (formatted.domains && typeof formatted.domains === 'string') {
      formatted.domains = [formatted.domains];
    }
    
    // Ensure domains are lowercase
    if (Array.isArray(formatted.domains)) {
      formatted.domains = formatted.domains.map(d => 
        typeof d === 'string' ? d.toLowerCase() : d
      );
    }
    
    return formatted;
  }

  /**
   * Company creation with mock support
   */
  private async createCompanyWithMockSupport(
    companyData: Record<string, unknown>
  ): Promise<any> {
    return await service.createCompany(companyData);
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

  /**
   * Create field type error
   */
  private createFieldTypeError(
    field: string,
    expectedType: string,
    receivedValue: unknown
  ): UniversalValidationError {

    return new UniversalValidationError(message, ErrorType.USER_ERROR, {
      field,
      expectedType,
      receivedType,
      errorCode: 'FIELD_TYPE_MISMATCH',
      suggestion: `Convert ${field} to ${expectedType}`,
      remediation: [
        `Convert ${field} to ${expectedType}`,
        `Example: ${field}: ${this.getExampleValue(expectedType)}`,
      ],
    });
  }

  /**
   * Get example value for a given type
   */
  private getExampleValue(type: string): string {
    switch (type) {
      case 'string':
        return '"example string"';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'array':
        return '["item1", "item2"]';
      case 'object':
        return '{ "key": "value" }';
      default:
        return `<${type}>`;
    }
  }

  private collectWarnings(data: Record<string, unknown>): string[] {
    const warnings: string[] = [];
    
    if (!data.name) {
      warnings.push('Company created without a name - consider adding one for better identification');
    }
    
    return warnings;
  }
}
