/**
 * RecordUpdateStrategy - Handles record and deal-specific update logic
 * 
 * Extracted from UniversalUpdateService record/deal update logic
 * Handles dynamic object types and deal defaults
 */

import { BaseUpdateStrategy, UpdateStrategyParams, UpdateStrategyResult } from './BaseUpdateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../types/attio.js';
import { updateObjectRecord } from '../../../objects/records/index.js';
import { getObjectRecord } from '../../../objects/records/index.js';
import { applyDealDefaultsWithValidation } from '../../../config/deal-defaults.js';
import { debug } from '../../../utils/logger.js';

export class RecordUpdateStrategy extends BaseUpdateStrategy {
  constructor() {
    super(UniversalResourceType.RECORDS);
  }

  async update(params: UpdateStrategyParams): Promise<UpdateStrategyResult> {
    const { record_id, mapped_data, persist_unlisted_fields, resource_type, original_data } = params;
    
    // Determine object slug for the record type
    const objectSlug = this.determineObjectSlug(resource_type, original_data);
    
    // Fetch existing record if field persistence is needed
    const existingRecord = persist_unlisted_fields 
      ? await this.fetchExistingRecord(record_id, objectSlug)
      : null;
    
    // Validate update permissions
    await this.validateUpdatePermissions(record_id, mapped_data);
    
    // Format data for API with record-specific logic
    const recordData = await this.formatForAPI(mapped_data, existingRecord, objectSlug);
    
    // Merge with existing fields if needed
    const finalData = await this.mergeWithExistingFields(
      recordData,
      existingRecord,
      persist_unlisted_fields || false
    );
    
    // Execute update
    const updatedRecord = await updateObjectRecord(objectSlug, record_id, { values: finalData });

    debug('Record updated successfully', {
      record_id,
      object_slug: objectSlug,
      updated_fields: Object.keys(finalData)
    });

    return {
      record: updatedRecord,
      metadata: {
        updated_fields: this.identifyUpdatedFields(
          existingRecord || {},
          updatedRecord
        ),
        object_slug: objectSlug
      }
    };
  }

  protected async fetchExistingRecord(record_id: string, objectSlug?: string): Promise<AttioRecord | null> {
    try {
      const slug = objectSlug || 'records';
      return await getObjectRecord(slug, record_id);
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
    // Records don't have special permission requirements beyond existence
    // The API call will handle existence validation
  }

  protected async formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null,
    objectSlug?: string
  ): Promise<Record<string, unknown>> {
    let formatted = { ...data };
    
    // Apply deal-specific defaults and validation if this is a deal
    if (objectSlug === 'deals' || this.resource_type === UniversalResourceType.DEALS) {
      // Note: Updates are less likely to fail, but we still validate stages proactively
      formatted = await applyDealDefaultsWithValidation(formatted, false);
    }
    
    // Handle numeric fields for deals
    if (objectSlug === 'deals') {
      // Handle deal value field
      if (formatted.value !== undefined) {
        if (typeof formatted.value === 'string') {
          const numValue = parseFloat(formatted.value);
          if (!isNaN(numValue)) {
            formatted.value = numValue;
          }
        }
      }
      
      // Handle close_date formatting
      if (formatted.close_date && typeof formatted.close_date === 'string') {
        // Ensure proper date format
        try {
          formatted.close_date = new Date(formatted.close_date).toISOString();
        } catch (e) {
          // Keep original value if date parsing fails
        }
      }
    }
    
    // Handle object_slug/object_api_slug preservation
    if (existingRecord?.values?.object_slug) {
      formatted.object_slug = existingRecord.values.object_slug;
    }
    if (existingRecord?.values?.object_api_slug) {
      formatted.object_api_slug = existingRecord.values.object_api_slug;
    }
    
    // Normalize string fields
    const stringFields = ['name', 'title', 'description', 'notes'];
    stringFields.forEach(field => {
      if (formatted[field] && typeof formatted[field] === 'string') {
        formatted[field] = (formatted[field] as string).trim();
      }
    });
    
    return formatted;
  }

  /**
   * Determine the object slug for the record update
   */
  private determineObjectSlug(
    resource_type: UniversalResourceType, 
    original_data?: Record<string, unknown>
  ): string {
    // For deals, always use 'deals'
    if (resource_type === UniversalResourceType.DEALS) {
      return 'deals';
    }
    
    // For records, try to extract from original data
    if (original_data) {
      const slug = (original_data.object as string) ||
                  (original_data.object_api_slug as string) ||
                  (original_data.object_slug as string);
      if (slug) {
        return slug;
      }
    }
    
    // Default fallback
    return 'records';
  }
}