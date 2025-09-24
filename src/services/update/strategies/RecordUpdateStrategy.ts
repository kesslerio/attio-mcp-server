import type { AttioRecord } from '../../../types/attio.js';
import { updateObjectRecord } from '../../../objects/records/index.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';

/**
 * RecordUpdateStrategy - Handles updates for generic records and deals
 *
 * NOTE: Deal validation is handled by UniversalUpdateService before calling this strategy.
 * This strategy only handles the actual record update without duplicate processing.
 */
export class RecordUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType,
    context?: Record<string, unknown>
  ): Promise<AttioRecord> {
    // For deals, use 'deals' as the object slug since validation is already handled upstream
    if (resourceType === ('deals' as unknown as UniversalResourceType)) {
      return updateObjectRecord('deals', recordId, values);
    }

    // Default to 'records' and allow objectSlug override via context
    const objectSlug =
      (context?.objectSlug as string | undefined) ||
      (values.object as string | undefined) ||
      (values.object_api_slug as string | undefined) ||
      'records';
    return updateObjectRecord(objectSlug, recordId, values);
  }
}
