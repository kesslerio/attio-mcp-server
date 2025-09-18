import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import { createObjectRecord } from '../../../objects/records/index.js';

export class RecordCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values, context } = params;
    const objectSlug =
      (values.object as string | undefined) ||
      (values.object_api_slug as string | undefined) ||
      (context?.objectSlug as string | undefined);
    if (!objectSlug) {
      throw new Error('records create requires object/object_api_slug');
    }
    return (await createObjectRecord(objectSlug, {
      values,
    })) as unknown as AttioRecord;
  }
}
