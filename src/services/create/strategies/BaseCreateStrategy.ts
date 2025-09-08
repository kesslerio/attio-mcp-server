/**
 * BaseCreateStrategy - Abstract base class for resource-specific creation strategies
 * 
 * Provides common interface and shared utilities for all creation strategies.
 * Based on the pattern from search-strategies refactoring.
 */

import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { UniversalValidationError } from '../../../handlers/tool-configs/universal/schemas.js';

export interface CreateStrategyParams {
  resource_type: UniversalResourceType;
  mapped_data: Record<string, unknown>;
  original_data?: Record<string, unknown>;
}

export interface CreateStrategyResult {
  record: AttioRecord | AttioTask;
  metadata?: {
    warnings?: string[];
    applied_defaults?: Record<string, unknown>;
  };
}

export abstract class BaseCreateStrategy {
  protected resource_type: UniversalResourceType;

  constructor(resource_type: UniversalResourceType) {
    this.resource_type = resource_type;
  }

  /**
   * Main entry point for resource creation
   */
  abstract create(params: CreateStrategyParams): Promise<CreateStrategyResult>;

  /**
   * Validate resource-specific requirements
   */
  protected abstract validateResourceData(data: Record<string, unknown>): void;

  /**
   * Format data for API submission
   */
  protected abstract formatForAPI(data: Record<string, unknown>): Record<string, unknown>;

  /**
   * Common validation utilities
   */
  protected validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new UniversalValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        undefined,
        { field: missingFields.join(', ') }
      );
    }
  }
}
