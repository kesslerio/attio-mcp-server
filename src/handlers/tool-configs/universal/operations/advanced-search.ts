/**
 * Advanced universal search tool configuration
 */

import {
  UniversalToolConfig,
  AdvancedSearchParams,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import {
  safeExtractRecordValues,
  safeExtractFirstValue,
} from '@/handlers/tool-configs/shared/type-utils.js';

import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { formatResourceType } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { getPluralResourceType } from '@/handlers/tool-configs/universal/core/utils.js';
import { ErrorService } from '@/services/ErrorService.js';
import { normalizeFilterCondition } from '@/types/attio.js';

/**
 * Universal advanced search tool
 * Consolidates complex filtering across all resource types
 */
export const advancedSearchConfig: UniversalToolConfig<
  AdvancedSearchParams,
  UniversalRecordResult[]
> = {
  name: 'search_records_advanced',
  handler: async (
    params: AdvancedSearchParams
  ): Promise<UniversalRecordResult[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search_records_advanced',
        params
      );

      const { resource_type } = sanitizedParams;

      // Normalize public operator aliases before downstream validation so the
      // tool schema, docs, and translation layer accept the same vocabulary.
      let filters = sanitizedParams.filters as Record<string, unknown>;
      try {
        if (
          filters &&
          typeof filters === 'object' &&
          Array.isArray((filters as Record<string, unknown>).filters)
        ) {
          filters = {
            ...filters,
            filters: (
              (filters as Record<string, unknown>).filters as Record<
                string,
                unknown
              >[]
            ).map((f) => {
              if (!f || typeof f !== 'object') return f;
              const next = { ...f } as Record<string, unknown>;
              if (typeof next.condition === 'string') {
                next.condition =
                  normalizeFilterCondition(next.condition) ?? next.condition;
              }
              if (
                (next.condition === 'is_not_empty' ||
                  next.condition === 'is_empty' ||
                  next.condition === 'is_set' ||
                  next.condition === 'is_not_set') &&
                (next.value == null || next.value === '')
              ) {
                next.value = true;
              }
              return next;
            }),
          };
        }
      } catch {
        // If transformation fails, proceed with original filters; downstream validation will report details
        filters = sanitizedParams.filters as Record<string, unknown>;
      }

      // Delegate to universal search handler defined elsewhere
      // We intentionally avoid importing the handler here to keep concerns separated
      const { handleUniversalSearch } =
        await import('@/handlers/tool-configs/universal/shared-handlers.js');
      return await handleUniversalSearch({
        resource_type,
        query: sanitizedParams.query,
        filters,
        limit: sanitizedParams.limit,
        offset: sanitizedParams.offset,
      });
    } catch (error: unknown) {
      const ctx = (params as { resource_type?: unknown })?.resource_type
        ? String((params as { resource_type: unknown }).resource_type)
        : '';
      throw ErrorService.createUniversalError(
        'search_records_advanced',
        ctx,
        error
      );
    }
  },
  formatResult: (results: UniversalRecordResult[], ...args: unknown[]) => {
    const resourceType = args[0] as string | undefined;
    const count = Array.isArray(results) ? results.length : 0;
    const typeName = resourceType
      ? formatResourceType(resourceType as UniversalResourceType)
      : 'record';
    const headerType = resourceType
      ? count === 1
        ? typeName
        : getPluralResourceType(resourceType as UniversalResourceType)
      : 'records';

    if (!Array.isArray(results)) {
      return `Advanced search found 0 ${headerType}:`;
    }

    const lines = results.map(
      (record: Record<string, unknown>, index: number) => {
        const values = safeExtractRecordValues(record);
        const recordId = record.id as Record<string, unknown>;

        const coerce = (v: unknown): string | undefined => {
          if (v == null) return undefined;
          if (typeof v === 'string') return v;
          // Use our safe extraction utility for array values
          const extracted = safeExtractFirstValue(v, '');
          return extracted || undefined;
        };

        const name =
          coerce(values?.name) ??
          coerce(values?.full_name) ??
          coerce(values?.title) ??
          'Unnamed';
        const industry = coerce(values?.industry);
        const location = coerce(values?.location);
        const website = coerce(values?.website);
        const id =
          (recordId?.record_id as string) ||
          (recordId?.list_id as string) ||
          'unknown';

        let details = name;
        if (industry) details += ` [${industry}]`;
        if (location) details += ` (${location})`;
        if (website) details += ` - ${website}`;
        details += ` (ID: ${id})`;

        return `${index + 1}. ${details}`;
      }
    );

    return `Advanced search found ${count} ${headerType}:\n${lines.join('\n')}`;
  },
};
