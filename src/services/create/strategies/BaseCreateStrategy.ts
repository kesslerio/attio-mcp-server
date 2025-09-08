/**
 * BaseCreateStrategy - Interface for resource-specific create strategies
 */
import type { AttioRecord, AttioTask } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';

export interface CreateStrategyParams {
  resourceType: UniversalResourceType;
  values: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface CreateStrategy<T = AttioRecord | AttioTask> {
  create(params: CreateStrategyParams): Promise<T>;
}
