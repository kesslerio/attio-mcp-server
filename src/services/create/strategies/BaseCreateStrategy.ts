/**
 * BaseCreateStrategy - Interface for resource-specific create strategies
 */
import type { AttioTask, UniversalRecord } from '@/types/attio.js';

export interface CreateStrategyParams {
  resourceType: string;
  values: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface CreateStrategy<T = UniversalRecord | AttioTask> {
  create(params: CreateStrategyParams): Promise<T>;
}
