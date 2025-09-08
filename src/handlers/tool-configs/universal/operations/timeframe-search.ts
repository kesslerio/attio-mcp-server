/**
 * Timeframe search tool configuration
 */

import {
  UniversalToolConfig,
  TimeframeSearchParams,
  TimeframeType,
  UniversalResourceType,
  RelativeTimeframe,
} from '../types.js';
import { AttioRecord } from '../../../../types/attio.js';

import { validateUniversalToolParams } from '../schemas.js';
import { ErrorService } from '../../../../services/ErrorService.js';
import { formatResourceType, handleUniversalSearch } from '../shared-handlers.js';
import { normalizeOperator } from '../../../../utils/AttioFilterOperators.js';
import { mapFieldName } from '../../../../utils/AttioFieldMapper.js';

export const searchByTimeframeConfig: UniversalToolConfig = {
  name: 'search-by-timeframe',
  handler: async (params: TimeframeSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-timeframe',
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
        offset 
      } = sanitizedParams;

      // Process relative_range parameter if provided (Issue #475)
      let processedStartDate = start_date;
      let processedEndDate = end_date;
      
      if (relative_range) {
        // Import the timeframe utility to convert relative ranges
        const { getRelativeTimeframeRange } = await import('../../../../utils/filters/timeframe-utils.js');
        
        try {
          const range = getRelativeTimeframeRange(relative_range as RelativeTimeframe);
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

      // Determine the timestamp field to filter on (Issue #475)
      // Use date_field if provided, otherwise fall back to timeframe_type logic
      let timestampField: string;
      if (date_field) {
        // Map date_field directly to proper field name
        switch (date_field) {
          case 'created_at':
            timestampField = mapFieldName('created_at');
            break;
          case 'updated_at':
            timestampField = mapFieldName('modified_at'); // Map updated_at to modified_at
            break;
          case 'modified_at':
            timestampField = mapFieldName('modified_at');
            break;
          default:
            throw new Error(`Unsupported date_field: ${date_field}`);
        }
      } else {
        // Fallback to original timeframe_type logic
        const effectiveTimeframeType = timeframe_type || TimeframeType.MODIFIED;
        switch (effectiveTimeframeType) {
          case TimeframeType.CREATED:
            timestampField = mapFieldName('created_at');
            break;
          case TimeframeType.MODIFIED:
            timestampField = mapFieldName('modified_at');
            break;
          case TimeframeType.LAST_INTERACTION:
            timestampField = mapFieldName('modified_at');
            break;
          default:
            throw new Error(`Unsupported timeframe type: ${effectiveTimeframeType}`);
        }
      }

      // Build the date filter using proper Attio API v2 filter syntax
      // Use normalized operators with $ prefix
      const dateFilters: Record<string, unknown>[] = [];
      
      const coerceIso = (d?: string, endBoundary = false): string | undefined => {
        if (!d) return undefined;
        // If date-only (YYYY-MM-DD), expand to full UTC boundary
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return endBoundary ? `${d}T23:59:59.999Z` : `${d}T00:00:00Z`;
        }
        return d;
      };

      const startIso = coerceIso(processedStartDate, false);
      const endIso = coerceIso(processedEndDate, true);

      // Handle invert_range logic (Issue #475)
      if (invert_range) {
        // For inverted searches, we want records that were NOT updated in the timeframe
        // This means records older than the start date OR newer than the end date
        if (startIso && endIso) {
          // For a range inversion, we want records outside the range
          // This is typically records older than the start date (before the timeframe)
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('lt'), // Less than start date
            value: startIso
          });
        } else if (startIso) {
          // Only start date - invert to find records older than this date
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('lt'),
            value: startIso
          });
        } else if (endIso) {
          // Only end date - invert to find records newer than this date
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('gt'),
            value: endIso
          });
        }
      } else {
        // Normal (non-inverted) logic
        if (startIso) {
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('gte'), // Normalize to $gte
            value: startIso
          });
        }
        
        if (endIso) {
          dateFilters.push({
            attribute: { slug: timestampField },
            condition: normalizeOperator('lte'), // Normalize to $lte
            value: endIso
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
        date_operator: 'between',
        limit: limit || 20,
        offset: offset || 0,
      });

    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'timeframe search',
        `${params.resource_type}:${params.timeframe_type || 'undefined'}`,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    timeframeType?: TimeframeType,
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'Found 0 records (timeframe search)\nTip: Ensure your workspace has data in the requested date range.';
    }

    const timeframeName = timeframeType
      ? timeframeType.replace(/_/g, ' ')
      : 'timeframe';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    return `Found ${results.length} ${resourceTypeName}s by ${timeframeName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown>;
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          'Unnamed';
        const recordId = record.id as Record<string, unknown>;
        const id = recordId?.record_id || 'unknown';

        // Try to show relevant date information
        const created = (record as any).created_at;
        const modified = (record as any).updated_at;
        let dateInfo = '';

        if (
          timeframeType === TimeframeType.CREATED &&
          created &&
          (typeof created === 'string' || typeof created === 'number')
        ) {
          dateInfo = ` (created: ${new Date(created).toLocaleDateString()})`;
        } else if (
          timeframeType === TimeframeType.MODIFIED &&
          modified &&
          (typeof modified === 'string' || typeof modified === 'number')
        ) {
          dateInfo = ` (modified: ${new Date(modified).toLocaleDateString()})`;
        }

        return `${index + 1}. ${name}${dateInfo} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

