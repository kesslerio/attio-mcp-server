/**
 * BaseUpdateStrategy - Abstract interface for resource-specific update strategies
 *
 * Keep minimal surface area: each strategy updates a single resource type
 * given a record_id and mapped values. UniversalUpdateService orchestrates
 * mapping, sanitization, and post-update verification.
 */

import type { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecord } from '@/types/attio.js';

export interface UpdateStrategy {
  update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType,
    context?: Record<string, unknown>
  ): Promise<UniversalRecord>;
}
