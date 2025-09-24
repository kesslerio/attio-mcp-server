import type { AttioRecord } from '../../../types/attio.js';
import { updateObjectRecord } from '../../../objects/records/index.js';
import { applyDealDefaultsWithValidationLegacy } from '../../../config/deal-defaults.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';

/**
 * RecordUpdateStrategy - Handles updates for generic records and deals
 */
export class RecordUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType,
    context?: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (resourceType === ('deals' as unknown as UniversalResourceType)) {
      const updatedDealData = await applyDealDefaultsWithValidationLegacy(
        values,
        false
      );
      return updateObjectRecord('deals', recordId, updatedDealData);
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
