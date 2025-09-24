import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import {
  applyDealDefaultsWithValidation,
  validateDealInput,
} from '../../../config/deal-defaults.js';
import { convertAttributeFormats } from '../../../utils/attribute-format-helpers.js';
import { createObjectRecord as createObjectRecordApi } from '../../../objects/records/index.js';
import { getDealDefaults } from '../../../config/deal-defaults.js';
import { debug } from '../../../utils/logger.js';

export class DealCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    let dealData = { ...(params.values as Record<string, unknown>) };
    // Run input validation for warnings/suggestions parity (non-blocking)
    try {
      validateDealInput(dealData);
    } catch {
      // Validation warnings are non-blocking, continue with creation
    }

    // Apply format conversions (transforms associated_company string to proper array format)
    dealData = convertAttributeFormats('deals', dealData);

    // Validate + apply configured defaults (proactive stage validation)
    const dealValidation = await applyDealDefaultsWithValidation(
      dealData,
      false
    );
    dealData = dealValidation.dealData;

    // Log validation warnings for debugging (create operations are less strict about user warnings)
    if (dealValidation.warnings.length > 0) {
      debug('DealCreateStrategy', 'Deal validation warnings during create', {
        warnings: dealValidation.warnings,
      });
    }

    try {
      return (await createObjectRecordApi(
        'deals',
        dealData
      )) as unknown as AttioRecord;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      // Retry with default stage if stage validation still fails
      if (msg.includes('Cannot find Status') && dealData['stage']) {
        const defaults = getDealDefaults();
        let fallback = { ...dealData };
        // assign default if provided in config
        if (defaults.stage) fallback['stage'] = defaults.stage;
        // Apply format conversions to fallback data as well
        fallback = convertAttributeFormats('deals', fallback);
        return (await createObjectRecordApi(
          'deals',
          fallback
        )) as unknown as AttioRecord;
      }
      throw error;
    }
  }
}
