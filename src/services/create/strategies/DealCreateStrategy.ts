import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import {
  applyDealDefaultsWithValidation,
  validateDealInput,
} from '../../../config/deal-defaults.js';
import { createObjectRecord as createObjectRecordApi } from '../../../objects/records/index.js';
import { getDealDefaults } from '../../../config/deal-defaults.js';

export class DealCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    let dealData = { ...(params.values as Record<string, unknown>) };
    // Run input validation for warnings/suggestions parity (non-blocking)
    try {
      validateDealInput(dealData);
    } catch {}

    // Validate + apply configured defaults (proactive stage validation)
    dealData = await applyDealDefaultsWithValidation(dealData, false);

    try {
      return (await createObjectRecordApi('deals', dealData)) as unknown as AttioRecord;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      // Retry with default stage if stage validation still fails
      if (msg.includes('Cannot find Status') && dealData['stage']) {
        const defaults = getDealDefaults();
        const fallback = { ...dealData };
        // assign default if provided in config
        if (defaults.stage) fallback['stage'] = defaults.stage;
        return (await createObjectRecordApi('deals', fallback)) as unknown as AttioRecord;
      }
      throw error;
    }
  }
}
