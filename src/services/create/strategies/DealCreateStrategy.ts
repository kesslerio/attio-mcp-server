/**
 * DealCreateStrategy - Handles deal-specific creation logic
 * 
 * Extracted from UniversalCreateService.createDealRecord (lines 1182-1233)
 * CRITICAL: Preserves deal defaults logic and workspace configuration
 */

import { BaseCreateStrategy, CreateStrategyParams, CreateStrategyResult } from './BaseCreateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../types/attio.js';
import {
  applyDealDefaultsWithValidation,
  getDealDefaults,
  validateDealInput,
} from '../../../config/deal-defaults.js';
import { createObjectRecord as createObjectRecordApi } from '../../../objects/records/index.js';

export class DealCreateStrategy extends BaseCreateStrategy {
  constructor() {
    super(UniversalResourceType.DEALS);
  }

  async create(params: CreateStrategyParams): Promise<CreateStrategyResult> {
    const { mapped_data, original_data } = params;
    
    // Handle deal-specific requirements with configured defaults and validation
    let dealData = { ...mapped_data };
    const originalRecordData = original_data || mapped_data;

    // Validate input and log suggestions (but don't block execution)
    const validation = validateDealInput(dealData);
    const warnings: string[] = [];
    
    if (
      validation.suggestions.length > 0 ||
      validation.warnings.length > 0 ||
      !validation.isValid
    ) {
      // Collect warnings but continue anyway - the conversions might fix the issues
      warnings.push(...validation.warnings);
      warnings.push(...validation.suggestions);
    }

    // Apply configured defaults with proactive stage validation
    // Note: This may make an API call for stage validation
    dealData = await applyDealDefaultsWithValidation(dealData, false);

    try {
      const record = await createObjectRecordApi('deals', { values: dealData } as any);
      
      return {
        record,
        metadata: {
          warnings: this.collectWarnings(dealData, warnings),
          applied_defaults: this.getAppliedDefaults(dealData, mapped_data)
        }
      };
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
          
      // If stage still fails after validation, try with default stage
      // IMPORTANT: Skip validation in error path to prevent API calls during failures
      if (errorMessage.includes('Cannot find Status') && dealData.stage) {
        const defaults = getDealDefaults();

        // Use default stage if available, otherwise remove stage (will fail since it's required)
        if (defaults.stage) {
          // Apply defaults WITHOUT validation to avoid API calls in error path
          dealData = await applyDealDefaultsWithValidation(
            { ...originalRecordData, stage: defaults.stage },
            true // Skip validation in error path
          );
        } else {
          delete dealData.stage;
        }

        const record = await createObjectRecordApi('deals', {
          values: dealData,
        } as any);
        
        return {
          record,
          metadata: {
            warnings: [...warnings, 'Used fallback stage due to validation error'],
            applied_defaults: this.getAppliedDefaults(dealData, mapped_data)
          }
        };
      }
      throw error;
    }
  }

  protected validateResourceData(data: Record<string, unknown>): void {
    // Deal validation is handled by validateDealInput within the create method
  }

  protected formatForAPI(data: Record<string, unknown>): Record<string, unknown> {
    // Deal formatting is handled by applyDealDefaultsWithValidation
    return data;
  }

  /**
   * Collect warnings specific to deal creation
   */
  private collectWarnings(finalData: Record<string, unknown>, existingWarnings: string[]): string[] {
    const warnings = [...existingWarnings];
    
    if (!finalData.name && !finalData.title) {
      warnings.push('Deal created without a name or title - consider adding one for better identification');
    }
    
    return warnings;
  }

  /**
   * Identify which defaults were actually applied
   */
  private getAppliedDefaults(finalData: Record<string, unknown>, originalData: Record<string, unknown>): Record<string, unknown> {
    const appliedDefaults: Record<string, unknown> = {};
    const defaults = getDealDefaults();
    
    // Check if defaults were applied by comparing final vs original
    Object.keys(defaults).forEach(key => {
      if (finalData[key] !== undefined && originalData[key] === undefined) {
        appliedDefaults[key] = finalData[key];
      }
    });
    
    return appliedDefaults;
  }
}