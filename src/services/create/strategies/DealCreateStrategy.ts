import type { AttioRecord } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { CreateStrategy, CreateStrategyParams } from './BaseCreateStrategy.js';
import { createObjectRecord } from '../../../objects/records/index.js';
import { applyDealDefaultsWithValidation } from '../../../config/deal-defaults.js';

export class DealCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values } = params;
    const payload = await applyDealDefaultsWithValidation(values, true);
    // Deals are created via records API with object slug 'deals'
    return (await createObjectRecord('deals', { values: payload })) as unknown as AttioRecord;
  }
}
