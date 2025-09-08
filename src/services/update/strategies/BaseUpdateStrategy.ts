/**
 * BaseUpdateStrategy - Abstract base class for resource-specific update strategies
 * 
 * Provides common interface and shared utilities for all update strategies.
 * Follows the pattern established by create and search strategies.
 */

import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { UniversalValidationError } from '../../../handlers/tool-configs/universal/schemas.js';

export interface UpdateStrategyParams {
  resource_type: UniversalResourceType;
  record_id: string;
  mapped_data: Record<string, unknown>;
  original_data?: Record<string, unknown>;
  persist_unlisted_fields?: boolean;
}

export interface UpdateStrategyResult {
  record: AttioRecord | AttioTask;
  metadata?: {
    warnings?: string[];
    persisted_fields?: string[];
    updated_fields?: string[];
  };
}

export abstract class BaseUpdateStrategy {
  protected resource_type: UniversalResourceType;

  constructor(resource_type: UniversalResourceType) {
    this.resource_type = resource_type;
  }

  /**
   * Main entry point for resource updates
   */
  abstract update(params: UpdateStrategyParams): Promise<UpdateStrategyResult>;

  /**
   * Fetch existing record for field persistence
   */
  protected abstract fetchExistingRecord(record_id: string): Promise<AttioRecord | null>;

  /**
   * Validate update is allowed for this resource
   */
  protected abstract validateUpdatePermissions(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<void>;

  /**
   * Format data for API submission
   */
  protected abstract formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null
  ): Record<string, unknown>;

  /**
   * Common field persistence logic
   */
  protected async mergeWithExistingFields(
    newData: Record<string, unknown>,
    existingRecord: AttioRecord | null,
    persistUnlisted: boolean
  ): Promise<Record<string, unknown>> {
    if (!persistUnlisted || !existingRecord) {
      return newData;
    }

    // Merge existing fields that aren't being updated
    const merged = { ...existingRecord };
    Object.keys(newData).forEach(key => {
      merged[key] = newData[key];
    });

    return merged;
  }

  /**
   * Track which fields were updated
   */
  protected identifyUpdatedFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): string[] {
    const updated: string[] = [];
    
    Object.keys(after).forEach(key => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        updated.push(key);
      }
    });
    
    return updated;
  }
}