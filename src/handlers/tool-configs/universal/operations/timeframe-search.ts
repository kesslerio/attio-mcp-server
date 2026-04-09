/**
 * Timeframe search tool configuration
 */

import {
  UniversalToolConfig,
  TimeframeSearchParams,
  TimeframeType,
  RelativeTimeframe,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import { isAttioRecord } from '@/types/attio.js';
import { safeExtractTimestamp } from '@/handlers/tool-configs/shared/type-utils.js';

import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { handleUniversalSearch } from '@/handlers/tool-configs/universal/shared-handlers.js';
import {
  extractResourceTypeFromFormatArgs,
  getPluralResourceLabel,
  getSingularResourceLabel,
} from '@/handlers/tool-configs/universal/core/utils.js';
import { normalizeOperator } from '@/utils/AttioFilterOperators.js';
import { mapFieldName } from '@/utils/AttioFieldMapper.js';

function resolveTimeframeAttribute(
  dateField?: TimeframeSearchParams['date_field'],
  timeframeType?: TimeframeType
): string {
  if (dateField) {
    switch (dateField) {
      case 'created_at':
        return mapFieldName('created_at');
      case 'updated_at':
      case 'modified_at':
        return 'updated_at';
      case 'last_interaction':
        return 'last_interaction';
      default:
        throw new Error(`Unsupported date_field: ${dateField}`);
    }
  }

  switch (timeframeType || TimeframeType.CREATED) {
    case TimeframeType.CREATED:
      return mapFieldName('created_at');
    case TimeframeType.MODIFIED:
      return 'updated_at';
    case TimeframeType.LAST_INTERACTION:
      return 'last_interaction';
    default:
      throw new Error(`Unsupported timeframe type: ${timeframeType}`);
  }
}

function extractTimeframeTypeFromFormatArgs(
  args: unknown[]
): TimeframeType | undefined {
  const first = args[0];
  if (
    typeof first === 'string' &&
    Object.values(TimeframeType).includes(first as TimeframeType)
  ) {
    return first as TimeframeType;
  }

  if (first && typeof first === 'object' && 'timeframe_type' in first) {
    const candidate = (first as { timeframe_type?: unknown }).timeframe_type;
    if (
      typeof candidate === 'string' &&
      Object.values(TimeframeType).includes(candidate as TimeframeType)
    ) {
      return candidate as TimeframeType;
    }
  }

  return undefined;
}

function resolveDateOperator(
  startDate?: string,
  endDate?: string
): 'greater_than' | 'less_than' | 'between' {
  if (startDate && endDate) {
    return 'between';
  }

  if (startDate) {
    return 'greater_than';
  }

  return 'less_than';
}

export const searchByTimeframeConfig: UniversalToolConfig<
  TimeframeSearchParams,
  UniversalRecordResult[]
> = {
  name: 'search_records_by_timeframe',
  handler: async (
    params: TimeframeSearchParams
  ): Promise<UniversalRecordResult[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search_records_by_timeframe',
        params
      );

      const {
        resource_type,
        timeframe_type,
        start_date,
        end_date,
        relative_range,
        invert_range,
        date_field,
        limit,
        offset,
      } = sanitizedParams;

      // Process relative_range parameter if provided (Issue #475)
      let processedStartDate = start_date;
      let processedEndDate = end_date;

      if (relative_range) {
        // Import the timeframe utility to convert relative ranges
        const { getRelativeTimeframeRange } =
          await import('@/utils/filters/timeframe-utils.js');

        try {
          const range = getRelativeTimeframeRange(
            relative_range as RelativeTimeframe
          );
          processedStartDate = range.startDate;
          processedEndDate = range.endDate;
        } catch {
          throw new Error(
            `Invalid relative_range '${relative_range}'. Supported options: today, yesterday, this_week, last_week, this_month, last_month, last_7_days, last_14_days, last_30_days, last_90_days`
          );
        }
      }

      // Validate that at least one date is provided (after processing relative_range)
      if (!processedStartDate && !processedEndDate) {
        throw new Error(
          'At least one date (start_date or end_date) is required for timeframe search'
        );
      }

      const timestampField = resolveTimeframeAttribute(
        date_field,
        timeframe_type
      );

      // Build the date filter using proper Attio API v2 filter syntax
      // Use normalized operators with $ prefix
      const dateFilters: Record<string, unknown>[] = [];

      const coerceIso = (
        d?: string,
        endBoundary = false
      ): string | undefined => {
        if (!d) return undefined;
        // If date-only (YYYY-MM-DD), expand to full UTC boundary
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return endBoundary ? `${d}T23:59:59.999Z` : `${d}T00:00:00Z`;
        }
        return d;
      };

      const startIso = coerceIso(processedStartDate, false);
      const endIso = coerceIso(processedEndDate, true);
      const timeframeOperator = resolveDateOperator(startIso, endIso);

      // Handle invert_range logic (Issue #475)
      if (invert_range) {
        // For inverted searches, we want records that were NOT updated in the timeframe
        // This means records older than the start date OR newer than the end date
        if (startIso && endIso) {
          // For a range inversion, we want records outside the range
          // This is typically records older than the start date (before the timeframe)
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('$lt'), // Less than start date
            value: startIso,
          });
        } else if (startIso) {
          // Only start date - invert to find records older than this date
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('$lt'),
            value: startIso,
          });
        } else if (endIso) {
          // Only end date - invert to find records newer than this date
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('$gt'),
            value: endIso,
          });
        }
      } else {
        // Normal (non-inverted) logic
        if (startIso) {
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('$gte'),
            value: startIso,
          });
        }

        if (endIso) {
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('$lte'),
            value: endIso,
          });
        }
      }

      // Create the filter object with the expected structure (legacy compatibility)
      const filters = { filters: dateFilters } as Record<string, unknown>;

      // Use the universal search handler; pass timeframe params explicitly so the
      // UniversalSearchService can FORCE Query API routing for date comparisons
      return await handleUniversalSearch({
        resource_type,
        query: '',
        filters,
        // Force timeframe routing parameters
        timeframe_attribute: timestampField,
        start_date: startIso,
        end_date: endIso,
        date_operator: timeframeOperator,
        limit: limit || 20,
        offset: offset || 0,
      });
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'search_records_by_timeframe',
        `${params.resource_type}:${params.timeframe_type || 'undefined'}`,
        error
      );
    }
  },
  formatResult: (results: UniversalRecordResult[], ...args: unknown[]) => {
    const timeframeType = extractTimeframeTypeFromFormatArgs(args);
    const firstArgResourceType = extractResourceTypeFromFormatArgs(args);
    const resourceType =
      timeframeType && firstArgResourceType === timeframeType
        ? typeof args[1] === 'string'
          ? args[1]
          : undefined
        : firstArgResourceType;
    if (!Array.isArray(results)) {
      return 'Found 0 records (timeframe search)\nTip: Ensure your workspace has data in the requested date range.';
    }

    const timeframeName = timeframeType
      ? timeframeType.replace(/_/g, ' ')
      : 'timeframe';
    const resourceCount = results.length;
    const resourceTypeName = resourceType
      ? resourceCount === 1
        ? getSingularResourceLabel(resourceType)
        : getPluralResourceLabel(resourceType)
      : resourceCount === 1
        ? 'record'
        : 'records';

    return `Found ${
      results.length
    } ${resourceTypeName} by ${timeframeName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = isAttioRecord(record as UniversalRecordResult)
          ? ((record as { values?: Record<string, unknown> }).values as Record<
              string,
              unknown
            >)
          : (record as Record<string, unknown>);
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          (typeof values?.name === 'string' ? values.name : undefined) ||
          'Unnamed';
        const recordId = (record as { id?: Record<string, unknown> }).id;
        const id =
          recordId?.record_id ||
          recordId?.list_id ||
          (typeof recordId === 'string' ? recordId : 'unknown');

        // Try to show relevant date information
        const created = safeExtractTimestamp(record.created_at);
        const modified = safeExtractTimestamp(record.updated_at);
        let dateInfo = '';

        if (timeframeType === TimeframeType.CREATED && created !== 'unknown') {
          dateInfo = ` (created: ${new Date(created).toLocaleDateString()})`;
        } else if (
          timeframeType === TimeframeType.MODIFIED &&
          modified !== 'unknown'
        ) {
          dateInfo = ` (modified: ${new Date(modified).toLocaleDateString()})`;
        }

        return `${index + 1}. ${name}${dateInfo} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};
