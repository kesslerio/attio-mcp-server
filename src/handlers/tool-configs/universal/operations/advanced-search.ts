/**
 * Advanced universal search tool configuration
 */

import {
  UniversalToolConfig,
  AdvancedSearchParams,
  UniversalResourceType,
} from '../types.js';
import { AttioRecord } from '../../../../types/attio.js';
import {
  safeExtractRecordValues,
  safeExtractFirstValue,
} from '../../shared/type-utils.js';

import { validateUniversalToolParams } from '../schemas.js';
import { ErrorService } from '../../../../services/ErrorService.js';
import { formatResourceType } from '../shared-handlers.js';

/**
 * Universal advanced search tool
 * Consolidates complex filtering across all resource types
 */
export const advancedSearchConfig: UniversalToolConfig<
  AdvancedSearchParams,
  AttioRecord[]
> = {
  name: 'records_search_advanced',
  handler: async (params: AdvancedSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_search_advanced',
        params
      );

      const { resource_type } = sanitizedParams;

      // Advanced search uses Attio's non-$ operator dialect (equals, contains, gte/lte, is_not_empty, ...).
      // Perform a light de-normalization: translate any $-prefixed operators to the expected strings
      // and coerce is_not_empty value to true when omitted.
      let filters = sanitizedParams.filters as Record<string, unknown>;
      try {
        const deDollar = (cond: string): string => {
          if (!cond) return cond;
          if (cond.startsWith('$')) {
            const raw = cond.slice(1);
            switch (raw) {
              case 'eq':
                return 'equals';
              case 'contains':
                return 'contains';
              case 'starts_with':
                return 'starts_with';
              case 'ends_with':
                return 'ends_with';
              case 'gt':
                return 'gt';
              case 'gte':
                return 'gte';
              case 'lt':
                return 'lt';
              case 'lte':
                return 'lte';
              case 'not_empty':
                return 'is_not_empty';
              default:
                return raw; // fallback
            }
          }
          // Also accept already-correct tokens and legacy typos
          if (
            cond === 'is_not_empty' ||
            cond === 'equals' ||
            cond === 'contains' ||
            cond === 'starts_with' ||
            cond === 'ends_with' ||
            cond === 'gt' ||
            cond === 'gte' ||
            cond === 'lt' ||
            cond === 'lte'
          )
            return cond;
          return cond;
        };

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
                next.condition = deDollar(next.condition);
              }
              if (
                next.condition === 'is_not_empty' &&
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
      const { handleUniversalSearch } = await import('../shared-handlers.js');
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
        'records_search_advanced',
        ctx,
        error
      );
    }
  },
  formatResult: (results: AttioRecord[], ...args: unknown[]) => {
    const resourceType = args[0] as string | undefined;
    const count = Array.isArray(results) ? results.length : 0;
    const typeName = resourceType
      ? formatResourceType(resourceType as UniversalResourceType)
      : 'record';
    const headerType = resourceType
      ? count === 1
        ? typeName
        : `${typeName}s`
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
        const id = (recordId?.record_id as string) || 'unknown';

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
