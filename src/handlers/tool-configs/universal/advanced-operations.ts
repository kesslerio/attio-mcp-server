/**
 * Advanced universal operations tool configurations
 *
 * These 5 tools provide sophisticated search and batch capabilities
 * across all resource types.
 */

import {
  UniversalToolConfig,
  AdvancedSearchParams,
  RelationshipSearchParams,
  ContentSearchParams,
  TimeframeSearchParams,
  BatchOperationsParams,
  UniversalResourceType,
  RelationshipType,
  ContentSearchType,
  TimeframeType,
  BatchOperationType,
} from './types.js';

import {
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
  validateUniversalToolParams,
} from './schemas.js';

import { ValidationService } from '../../../services/ValidationService.js';
import { isValidUUID } from '../../../utils/validation/uuid-validation.js';

import {
  handleUniversalSearch,
  handleUniversalGetDetails,
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  formatResourceType,
} from './shared-handlers.js';

// Import enhanced batch API for optimized batch operations (Issue #471)
import {
  universalBatchSearch,
  UniversalBatchSearchResult,
} from '../../../api/operations/batch.js';

// Import ErrorService for error handling
import { ErrorService } from '../../../services/ErrorService.js';

// Import specialized handlers
import {
  searchCompaniesByNotes,
  searchCompaniesByPeople,
} from '../../../objects/companies/index.js';

import {
  searchPeopleByCompany,
  searchPeopleByNotes,
} from '../../../objects/people/index.js';

import {
  searchDealsByCompany,
} from '../../../objects/deals/index.js';


import {
  AttioRecord,
} from '../../../types/attio.js';
import { ListEntryFilters } from '../../../api/operations/types.js';
import { UniversalSearchService } from '../../../services/UniversalSearchService.js';
import {
  validateBatchOperation,
  validateSearchQuery,
} from '../../../utils/batch-validation.js';

// Import new filter utilities
import { normalizeOperator, apiSemaphore } from '../../../utils/AttioFilterOperators.js';
import { mapFieldName } from '../../../utils/AttioFieldMapper.js';

// Import for client-side note filtering implementation
import { getAttioClient } from '../../../api/attio-client.js';
import { listNotes } from '../../../objects/notes.js';
import { RATE_LIMITS } from '../../../config/security-limits.js';

// Performance and safety constants from security configuration
const BATCH_DELAY_MS = RATE_LIMITS.BATCH_DELAY_MS;
const MAX_CONCURRENT_REQUESTS = RATE_LIMITS.MAX_CONCURRENT_REQUESTS;

/**
 * Adds a small delay between API calls to respect rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes items in parallel with controlled concurrency and error isolation
 * Each item's success/failure is tracked independently for batch operations
 * Uses apiSemaphore for rate limiting and 429 backoff
 */
async function processInParallelWithErrorIsolation<T, R = unknown>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  maxConcurrency: number = MAX_CONCURRENT_REQUESTS
): Promise<Array<{ success: boolean; result?: R; error?: string; data?: T }>> {
  const results: Array<{
    success: boolean;
    result?: R;
    error?: string;
    data?: T;
  }> = [];

  // Use apiSemaphore for rate limiting with 429 backoff
  // Process all items through the semaphore (it handles concurrency internally)
  const promises = items.map((item, index) => 
    apiSemaphore.acquire(async () => {
      try {
        const result = await processor(item, index);
        return { success: true, result };
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          data: item,
        };
      }
    })
  );

  // Wait for all operations to complete
  const allResults = await Promise.allSettled(promises);
  
  // Extract results (allSettled results are always fulfilled due to our error handling)
  for (const settledResult of allResults) {
    if (settledResult.status === 'fulfilled') {
      results.push(settledResult.value);
    } else {
      // This should rarely happen since we handle errors in the semaphore
      results.push({
        success: false,
        error: `Unexpected processing error: ${settledResult.reason}`,
      });
    }
  }

  return results;
}

/**
 * Universal advanced search tool
 * Consolidates complex filtering across all resource types
 */
export const advancedSearchConfig: UniversalToolConfig = {
  name: 'advanced-search',
  handler: async (params: AdvancedSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'advanced-search',
        params
      );

      const { resource_type, query, limit, offset } = sanitizedParams;

      // Advanced search uses Attio's non-$ operator dialect (equals, contains, gte/lte, is_not_empty, ...).
      // Perform a light de-normalization: translate any $-prefixed operators to the expected strings
      // and coerce is_not_empty value to true when omitted.
      let filters = sanitizedParams.filters as any;
      try {
        const deDollar = (cond: string): string => {
          if (!cond) return cond;
          if (cond.startsWith('$')) {
            const raw = cond.slice(1);
            switch (raw) {
              case 'eq': return 'equals';
              case 'contains': return 'contains';
              case 'starts_with': return 'starts_with';
              case 'ends_with': return 'ends_with';
              case 'gt': return 'gt';
              case 'gte': return 'gte';
              case 'lt': return 'lt';
              case 'lte': return 'lte';
              case 'not_empty': return 'is_not_empty';
              default: return raw; // fallback
            }
          }
          // Also accept already-correct tokens and legacy typos
          if (cond === 'is_not_empty' || cond === 'equals' || cond === 'contains' ||
              cond === 'starts_with' || cond === 'ends_with' || cond === 'gt' ||
              cond === 'gte' || cond === 'lt' || cond === 'lte') return cond;
          return cond;
        };

        if (filters && typeof filters === 'object' && Array.isArray((filters as any).filters)) {
          filters = {
            ...filters,
            filters: ((filters as any).filters as any[]).map((f) => {
              if (!f || typeof f !== 'object') return f;
              const next = { ...f } as Record<string, any>;
              if (typeof next.condition === 'string') {
                next.condition = deDollar(next.condition);
              }
              if (next.condition === 'is_not_empty' && (next.value == null || next.value === '')) {
                next.value = true;
              }
              return next;
            }),
          };
        }
      } catch {
        // If transformation fails, proceed with original filters; downstream validation will report details
        filters = sanitizedParams.filters as any;
      }

      // Validate list_membership filter if present
      if (filters?.list_membership && !isValidUUID(filters.list_membership)) {
        throw ErrorService.createUniversalError(
          `Invalid list_id: must be a UUID. Got: ${filters.list_membership}`,
          'advanced-search',
          resource_type
        );
      }

      // Validate list_id filter if present (for list filtering)
      if (filters?.list_id && !isValidUUID(filters.list_id)) {
        throw ErrorService.createUniversalError(
          `Invalid list_id: must be a UUID. Got: ${filters.list_id}`,
          'advanced-search',
          resource_type
        );
      }

      // Use the universal search handler with advanced filtering
      return await handleUniversalSearch({
        resource_type,
        query,
        filters,
        limit,
        offset,
      });
    } catch (error: unknown) {
      // Add context-specific error information for advanced search
      if (error instanceof Error && error.message.includes('date')) {
        const enhancedError = new Error(
          `${error.message}. Supported date formats: "last 7 days", "this month", "yesterday", or ISO format (YYYY-MM-DD)`
        );
        throw ErrorService.createUniversalError(
          'advanced search',
          params.resource_type,
          enhancedError
        );
      }
      throw ErrorService.createUniversalError(
        'advanced search',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'No results found';
    }

    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';
    // Handle proper pluralization
    let plural = resourceTypeName;
    if (results.length !== 1) {
      if (resourceTypeName === 'company') {
        plural = 'companies';
      } else if (resourceTypeName === 'person') {
        plural = 'people';
      } else {
        plural = `${resourceTypeName}s`;
      }
    }

    // Helper that extracts either primitive, {value}, or [..] shapes
    const coerce = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) {
        const first = v[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && 'value' in first)
          return String((first as any).value);
      }
      if (typeof v === 'object' && 'value' in v)
        return String((v as any).value);
      return undefined;
    };

    return `Advanced search found ${results.length} ${plural}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown> | undefined;
        const recordId = record.id as Record<string, unknown> | undefined;
        
        // Enhanced name extraction that handles person name structure
        let name = 'Unnamed';
        
        // For people: Try person-specific name fields first
        if (resourceType === UniversalResourceType.PEOPLE) {
          const nameArray = values?.name as any[];
          if (Array.isArray(nameArray) && nameArray.length > 0) {
            name = nameArray[0]?.full_name || 
                   nameArray[0]?.value || 
                   nameArray[0]?.formatted || 
                   'Unnamed';
          } else {
            // Fallback to other person name fields
            const fullNameArray = values?.full_name as any[];
            if (Array.isArray(fullNameArray) && fullNameArray.length > 0) {
              name = fullNameArray[0]?.value || 'Unnamed';
            }
          }
        } else {
          // For other resource types: Use original logic
          name = coerce(values?.name) ||
                 coerce(values?.full_name) ||
                 coerce(values?.title) ||
                 'Unnamed';
        }
        
        const id = (recordId?.record_id as string) || 'unknown';

        // Include additional context for advanced search results
        const website = coerce(values?.website);
        const email = coerce(values?.email);
        const industry = coerce(values?.industry);
        const location = coerce(values?.location);

        let context = '';
        if (industry) context += ` [${industry}]`;
        if (location) context += ` (${location})`;
        if (website) context += ` - ${website}`;
        else if (email) context += ` - ${email}`;

        return `${index + 1}. ${name}${context} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal search by relationship tool
 * Handles cross-entity relationship searches
 */
export const searchByRelationshipConfig: UniversalToolConfig = {
  name: 'search-by-relationship',
  handler: async (params: RelationshipSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-relationship',
        params
      );

      // Check for listId parameter first - if present and invalid, return error immediately
      if (params.listId && !isValidUUID(params.listId)) {
        throw new Error(
          `Invalid list_id: must be a UUID. Got: ${params.listId}`
        );
      }

      const { relationship_type, source_id } = sanitizedParams;

      switch (relationship_type) {
        case RelationshipType.COMPANY_TO_PEOPLE:
          return await searchPeopleByCompany(source_id);

        case RelationshipType.PEOPLE_TO_COMPANY:
          return await searchCompaniesByPeople(source_id);

        case RelationshipType.COMPANY_TO_DEALS:
          return await searchDealsByCompany(source_id);

        case RelationshipType.PERSON_TO_TASKS:
        case RelationshipType.COMPANY_TO_TASKS:
          // Task relationship search requires filtering tasks by linked records
          // This functionality depends on the Attio API's task filtering capabilities
          throw new Error(
            `Task relationship search (${relationship_type}) is not currently available. ` +
              `This feature requires enhanced API filtering capabilities. ` +
              `As a workaround, you can use the 'search-records' tool with resource_type='tasks' to find all tasks, ` +
              `then filter the results programmatically.`
          );

        case 'list_entries':
          // Special handling for list_entries relationship type
          const list_id = params.source_id;
          if (
            !list_id ||
            !ValidationService.validateUUIDForSearch(String(list_id))
          ) {
            // Invalid listId should return error, not empty array
            throw new Error(`Invalid list_id: must be a UUID. Got: ${list_id}`);
          } else {
            // Operation requiring valid list id → throw validation error
            throw new Error('invalid list id');
          }

        default:
          throw new Error(
            `Invalid relationship type: ${relationship_type} not found`
          );
      }
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'relationship search',
        params.relationship_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    relationshipType?: RelationshipType
  ) => {
    if (!Array.isArray(results)) {
      return 'No related records found';
    }

    const relationshipName = relationshipType
      ? relationshipType.replace(/_/g, ' ')
      : 'relationship';

    return `Found ${results.length} records for ${relationshipName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown>;
        const recordId = record.id as Record<string, unknown>;
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          'Unnamed';
        const id = recordId?.record_id || 'unknown';
        const email = (values?.email as Record<string, unknown>[])?.[0]?.value;
        const role =
          (values?.role as Record<string, unknown>[])?.[0]?.value ||
          (values?.position as Record<string, unknown>[])?.[0]?.value;

        let details = '';
        if (role) details += ` (${role})`;
        if (email) details += ` - ${email}`;

        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal search by content tool
 * Searches within notes, activity, and interactions
 */
/**
 * Search records by notes content using client-side filtering
 * Lists notes by parent, then filters on content_plaintext/markdown
 */
async function searchRecordsByNotesContent(
  resource_type: UniversalResourceType,
  search_query: string
): Promise<AttioRecord[]> {
  const client = getAttioClient();

  // Step 1: List all notes for the resource type
  const resourceTypeMap: Record<string, string> = {
    [UniversalResourceType.COMPANIES]: 'companies',
    [UniversalResourceType.PEOPLE]: 'people',
    [UniversalResourceType.DEALS]: 'deals',
  };

  const parentObject = resourceTypeMap[resource_type];
  if (!parentObject) {
    throw new Error(
      `Notes search not supported for resource type: ${resource_type}`
    );
  }

  try {
    // Get all notes for the resource type
    const response = await client.get(
      `/notes?parent_object=${parentObject}&limit=100`
    );
    const notes = response?.data?.data || [];

    // Step 2: Client-side filter on content_plaintext and markdown
    const searchQueryLower = search_query.toLowerCase();
    const matchingNotes = notes.filter((note: any) => {
      const contentPlain = (note.content_plaintext || '').toLowerCase();
      const contentMarkdown = (
        note.content ||
        note.markdown ||
        ''
      ).toLowerCase();
      const title = (note.title || '').toLowerCase();

      return (
        contentPlain.includes(searchQueryLower) ||
        contentMarkdown.includes(searchQueryLower) ||
        title.includes(searchQueryLower)
      );
    });

    // Step 3: Extract unique parent record IDs from matching notes
    const parentRecordIds = new Set<string>();
    matchingNotes.forEach((note: any) => {
      if (note.parent_record_id) {
        parentRecordIds.add(note.parent_record_id);
      }
    });

    // Step 4: Fetch the actual records for these IDs
    const records: AttioRecord[] = [];
    for (const recordId of Array.from(parentRecordIds)) {
      try {
        const recordResponse = await client.get(
          `/objects/${parentObject}/records/${recordId}`
        );
        if (recordResponse?.data?.data) {
          records.push(recordResponse.data.data);
        }
      } catch (error) {
        // Skip records that can't be fetched (may be deleted)
        console.warn(
          `Could not fetch ${parentObject} record ${recordId}:`,
          error
        );
      }
    }

    return records;
  } catch (error) {
    throw new Error(
      `Failed to search ${resource_type} by notes content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export const searchByContentConfig: UniversalToolConfig = {
  name: 'search-by-content',
  handler: async (params: ContentSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-content',
        params
      );

      const { resource_type, content_type, search_query, limit, offset } = sanitizedParams;

      // For notes search, use the notes API directly since notes don't support query endpoints
      if (content_type === ContentSearchType.NOTES && resource_type === UniversalResourceType.NOTES) {
        // Import the notes module for direct access
        const { listNotes } = await import('../../../objects/notes.js');
        
        try {
          // Get all notes and filter by content manually
          const allNotes = await listNotes({ limit: 1000, offset: 0 }); // Get a reasonable batch
          const notes = allNotes.data || [];
          
          // Filter notes by content (case-insensitive search in title and content)
          const filteredNotes = notes.filter(note => {
            const searchLower = search_query.toLowerCase();
            const titleMatch = note.title?.toLowerCase().includes(searchLower);
            const contentMatch = note.content_plaintext?.toLowerCase().includes(searchLower) ||
                                note.content_markdown?.toLowerCase().includes(searchLower);
            return titleMatch || contentMatch;
          });
          
          // Apply pagination
          const startIndex = offset || 0;
          const endIndex = startIndex + (limit || 10);
          const paginatedNotes = filteredNotes.slice(startIndex, endIndex);
          
          // Convert to AttioRecord format for consistency
          return paginatedNotes.map(note => ({
            id: { record_id: note.id.note_id },
            resource_type: 'notes' as const,
            values: {
              title: note.title,
              content_plaintext: note.content_plaintext,
              content_markdown: note.content_markdown,
              parent_object: note.parent_object,
              parent_record_id: note.parent_record_id,
              created_at: note.created_at,
              meeting_id: note.meeting_id || null,
              tags: note.tags || [],
            },
            raw: note,
          }));
        } catch (error: any) {
          // If no notes are found (404), return empty array instead of throwing error
          if (error?.response?.status === 404) {
            return [];
          }
          // Re-throw other errors
          throw error;
        }
      }

      // For other content types that are not supported
      if (content_type === ContentSearchType.ACTIVITY) {
        throw new Error(
          `Activity content search is not currently available for ${resource_type}. ` +
            `This feature requires access to activity/interaction API endpoints. ` +
            `As an alternative, try searching by notes content or using timeframe search.`
        );
      }

      if (content_type === ContentSearchType.INTERACTIONS) {
        throw new Error(
          `Interaction content search is not currently available for ${resource_type}. ` +
            `This feature requires access to interaction/activity API endpoints. ` +
            `As an alternative, try searching by notes content or using timeframe search with 'last_interaction' type.`
        );
      }

      throw new Error(
        `Content search not supported for resource type ${resource_type} and content type ${content_type}. ` +
        `Supported combinations: resource_type=notes with content_type=notes`
      );
    } catch (error: unknown) {
      // If the error is a direct message we want to preserve, don't wrap it
      if (
        error instanceof Error &&
        (error.message.includes('Content search not supported') ||
          error.message.includes('Timeframe search is not currently optimized'))
      ) {
        throw error;
      }

      throw ErrorService.createUniversalError(
        'content search',
        `${params.resource_type}:${params.content_type}`,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    contentType?: ContentSearchType,
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'No content matches found';
    }

    const contentTypeName = contentType ? contentType : 'content';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    return `Found ${results.length} ${resourceTypeName}s with matching ${contentTypeName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown>;
        const recordId = record.id as Record<string, unknown>;
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          'Unnamed';
        const id = recordId?.record_id || 'unknown';

        return `${index + 1}. ${name} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};


/**
 * Universal search by timeframe tool
 * Handles temporal filtering across resource types using Attio API v2 filters
 */
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
        const { getRelativeTimeframeRange } = await import('../../../utils/filters/timeframe-utils.js');
        
        try {
          const range = getRelativeTimeframeRange(relative_range as any);
          processedStartDate = range.startDate;
          processedEndDate = range.endDate;
        } catch (error) {
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
      const dateFilters: any[] = [];
      
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
      const filters = { filters: dateFilters } as any;

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
      return 'No records found in timeframe';
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
        const created = record.created_at;
        const modified = record.updated_at;
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

/**
 * Universal batch operations tool
 * Handles bulk operations across resource types
 */
export const batchOperationsConfig: UniversalToolConfig = {
  name: 'batch-operations',
  handler: async (params: any): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'batch-operations',
        params
      );

      const { resource_type, operations } = sanitizedParams;

      // Support both old format (operation_type + records) and new format (operations array)
      if (operations && Array.isArray(operations)) {
        // New flexible format: operations array with individual operation objects
        const results = await Promise.all(
          operations.map(async (op: any, index: number) => {
            try {
              const { operation, record_data } = op;
              
              switch (operation) {
                case 'create':
                  return {
                    index,
                    success: true,
                    result: await handleUniversalCreate({
                      resource_type,
                      record_data,
                      return_details: true,
                    }),
                  };
                  
                case 'update':
                  if (!record_data?.id) {
                    throw new Error('Record ID is required for update operation');
                  }
                  return {
                    index,
                    success: true,
                    result: await handleUniversalUpdate({
                      resource_type,
                      record_id: typeof record_data.id === 'string' 
                        ? record_data.id 
                        : (record_data.id as any)?.record_id || String(record_data.id),
                      record_data,
                      return_details: true,
                    }),
                  };
                  
                case 'delete':
                  if (!record_data?.id) {
                    throw new Error('Record ID is required for delete operation');
                  }
                  return {
                    index,
                    success: true,
                    result: await handleUniversalDelete({
                      resource_type,
                      record_id: typeof record_data.id === 'string' 
                        ? record_data.id 
                        : (record_data.id as any)?.record_id || String(record_data.id),
                    }),
                  };
                  
                default:
                  throw new Error(`Unsupported operation: ${operation}`);
              }
            } catch (error: any) {
              // Return error result rather than throwing to allow other operations to succeed
              return {
                index,
                success: false,
                error: error.message || String(error),
              };
            }
          })
        );
        
        return {
          operations: results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        };
      }

      // Fallback to old format for backward compatibility
      const {
        operation_type,
        records,
        record_ids,
        limit,
        offset,
      } = sanitizedParams;

      switch (operation_type) {
        case BatchOperationType.CREATE: {
          if (!records || records.length === 0) {
            throw new Error(
              'Records array is required for batch create operation'
            );
          }

          // Use Promise.all for parallel processing
          const results = await Promise.all(
            records.map(async (recordData: Record<string, unknown>, index: number) => {
              try {
                const result = await handleUniversalCreate({
                  resource_type,
                  record_data: recordData,
                  return_details: true,
                });
                return { index, success: true, result };
              } catch (error: any) {
                return { index, success: false, error: error.message };
              }
            })
          );
          
          return {
            operations: results,
            summary: {
              total: results.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
            },
          };
        }

        case BatchOperationType.UPDATE: {
          if (!records || records.length === 0) {
            throw new Error(
              'Records array is required for batch update operation'
            );
          }

          // Validate batch operation with comprehensive checks
          const updateValidation = validateBatchOperation({
            items: records,
            operationType: 'update',
            resourceType: resource_type,
            checkPayload: true,
          });
          if (!updateValidation.isValid) {
            throw new Error(updateValidation.error);
          }

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            records,
            async (recordData: Record<string, unknown>) => {
              if (!recordData.id) {
                throw new Error('Record ID is required for update operation');
              }

              return await handleUniversalUpdate({
                resource_type,
                record_id:
                  typeof recordData.id === 'string'
                    ? recordData.id
                    : String(recordData.id),
                record_data: recordData,
                return_details: true,
              });
            }
          );
        }

        case BatchOperationType.DELETE: {
          if (!record_ids || record_ids.length === 0) {
            throw new Error(
              'Record IDs array is required for batch delete operation'
            );
          }

          // Validate batch operation with stricter limits for delete
          const deleteValidation = validateBatchOperation({
            items: record_ids,
            operationType: 'delete',
            resourceType: resource_type,
            checkPayload: false, // IDs don't need payload check
          });
          if (!deleteValidation.isValid) {
            throw new Error(deleteValidation.error);
          }

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            record_ids,
            async (recordId: string) => {
              return await handleUniversalDelete({
                resource_type,
                record_id: recordId,
              });
            }
          );
        }

        case BatchOperationType.GET: {
          if (!record_ids || record_ids.length === 0) {
            throw new Error(
              'Record IDs array is required for batch get operation'
            );
          }

          // Validate batch operation
          const getValidation = validateBatchOperation({
            items: record_ids,
            operationType: 'get',
            resourceType: resource_type,
            checkPayload: false, // IDs don't need payload check
          });
          if (!getValidation.isValid) {
            throw new Error(getValidation.error);
          }

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            record_ids,
            async (recordId: string) => {
              return await handleUniversalGetDetails({
                resource_type,
                record_id: recordId,
              });
            }
          );
        }

        case BatchOperationType.SEARCH: {
          // Check if we have multiple queries for true batch search
          const queries = sanitizedParams.queries;

          if (queries && Array.isArray(queries) && queries.length > 0) {
            // True batch search with multiple queries using optimized API (Issue #471)
            const searchValidation = validateBatchOperation({
              items: queries,
              operationType: 'search',
              resourceType: resource_type,
              checkPayload: false, // Queries don't need payload size check
            });
            if (!searchValidation.isValid) {
              throw new Error(searchValidation.error);
            }

            // Use optimized universal batch search API
            return await universalBatchSearch(resource_type, queries, {
              limit: sanitizedParams.limit,
              offset: sanitizedParams.offset,
            });
          } else {
            // Fallback to single search with pagination (legacy behavior)
            const searchValidation = validateSearchQuery(undefined, {
              resource_type,
              limit,
              offset,
            });
            if (!searchValidation.isValid) {
              throw new Error(searchValidation.error);
            }

            return await handleUniversalSearch({
              resource_type,
              limit,
              offset,
            });
          }
        }

        default:
          throw new Error(
            `Unsupported batch operation type: ${operation_type}`
          );
      }
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'batch operations',
        `${params.resource_type}:${params.operation_type}`,
        error
      );
    }
  },
  formatResult: (
    results: any,
    operationType?: BatchOperationType,
    resourceType?: UniversalResourceType
  ) => {
    if (!results) {
      return 'Batch operation failed';
    }

    const operationName = operationType ? operationType : 'operation';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    if (Array.isArray(results)) {
      // Helper to extract a human-friendly name from various value shapes
      const extractName = (
        values: Record<string, unknown> | undefined,
        fallback?: string
      ): string => {
        if (!values) return fallback ?? 'Unknown';
        const nameVal = (values as any).name;
        const titleVal = (values as any).title;

        const coerce = (v: any): string | undefined => {
          if (v == null) return undefined;
          if (typeof v === 'string') return v;
          if (Array.isArray(v)) {
            // accept either array of primitives or array of { value }
            const first = v[0];
            if (typeof first === 'string') return first;
            if (first && typeof first === 'object' && 'value' in first)
              return String((first as any).value);
          }
          if (typeof v === 'object' && 'value' in v)
            return String((v as any).value);
          return undefined;
        };

        return coerce(nameVal) ?? coerce(titleVal) ?? fallback ?? 'Unknown';
      };

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      let summary = `Batch ${operationName} completed: ${successCount} successful, ${failureCount} failed\n\n`;

      if (operationType === BatchOperationType.SEARCH) {
        // Handle batch search results with queries array (Issue #471)
        if (results.length > 0 && 'query' in results[0]) {
          // New format: UniversalBatchSearchResult[]
          const batchResults = results as UniversalBatchSearchResult[];
          const successCount = batchResults.filter((r) => r.success).length;
          const failureCount = batchResults.length - successCount;

          let summary = `Batch search completed: ${successCount} successful, ${failureCount} failed\n\n`;

          // Show successful searches
          const successful = batchResults.filter((r) => r.success);
          if (successful.length > 0) {
            summary += `Successful searches:\n`;
            successful.forEach((searchResult, index) => {
              const records = searchResult.result || [];
              summary += `\n${index + 1}. Query: "${searchResult.query}" - Found ${records.length} ${resourceTypeName}s\n`;

              if (records.length > 0) {
                records.slice(0, 3).forEach((record, recordIndex) => {
                  const values = record.values as Record<string, unknown>;
                  const recordId = record.id as Record<string, unknown>;
                  const name =
                    (values?.name as Record<string, unknown>[])?.[0]?.value ||
                    (values?.title as Record<string, unknown>[])?.[0]?.value ||
                    'Unnamed';
                  const id = recordId?.record_id || 'unknown';
                  summary += `   ${recordIndex + 1}. ${name} (ID: ${id})\n`;
                });
                if (records.length > 3) {
                  summary += `   ... and ${records.length - 3} more\n`;
                }
              }
            });
          }

          // Show failed searches
          const failed = batchResults.filter((r) => !r.success);
          if (failed.length > 0) {
            summary += `\nFailed searches:\n`;
            failed.forEach((searchResult, index) => {
              summary += `${index + 1}. Query: "${searchResult.query}" - Error: ${searchResult.error}\n`;
            });
          }

          return summary;
        } else {
          // Legacy format: AttioRecord[] (single search)
          return `Batch search found ${results.length} ${resourceTypeName}s:\n${results
            .map((record: Record<string, unknown>, index: number) => {
              const values = record.values as
                | Record<string, unknown>
                | undefined;
              const recordId = record.id as Record<string, unknown> | undefined;
              const name = extractName(values, 'Unnamed');
              const id = (recordId?.record_id as string) || 'unknown';
              return `${index + 1}. ${name} (ID: ${id})`;
            })
            .join('\n')}`;
        }
      }

      // Show details for successful operations
      const successful = results.filter((r) => r.success);
      if (successful.length > 0) {
        summary += `Successful operations:\n${successful
          .map((op: Record<string, unknown>, index: number) => {
            const opResult = op.result as Record<string, unknown>;
            const values = opResult?.values as
              | Record<string, unknown>
              | undefined;
            const name = extractName(
              values,
              (opResult?.record_id as string) || 'Unknown'
            );
            return `${index + 1}. ${name}`;
          })
          .join('\n')}`;
      }

      // Show errors for failed operations
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        summary += `\n\nFailed operations:\n${failed
          .map((op: Record<string, unknown>, index: number) => {
            const opData = op.data as Record<string, unknown>;
            const identifier = op.record_id || opData?.name || 'Unknown';
            return `${index + 1}. ${identifier}: ${op.error}`;
          })
          .join('\n')}`;
      }

      return summary;
    }

    return `Batch ${operationName} result: ${JSON.stringify(results)}`;
  },
};

/**
 * Advanced operations tool definitions for MCP protocol
 */
export const advancedOperationsToolDefinitions = {
  'advanced-search': {
    name: 'advanced-search',
    description:
      'Advanced search with complex filtering across all resource types',
    inputSchema: advancedSearchSchema,
  },
  'search-by-relationship': {
    name: 'search-by-relationship',
    description: 'Search records by their relationships to other entities',
    inputSchema: searchByRelationshipSchema,
  },
  'search-by-content': {
    name: 'search-by-content',
    description: 'Search within notes, activity, and interaction content',
    inputSchema: searchByContentSchema,
  },
  'search-by-timeframe': {
    name: 'search-by-timeframe',
    description:
      'Search records by temporal criteria (creation, modification, interaction dates)',
    inputSchema: searchByTimeframeSchema,
  },
  'batch-operations': {
    name: 'batch-operations',
    description:
      'Perform bulk operations (create, update, delete, get, search)',
    inputSchema: batchOperationsSchema,
  },
};

/**
 * Advanced operations tool configurations
 */
export const advancedOperationsToolConfigs = {
  'advanced-search': advancedSearchConfig,
  'search-by-relationship': searchByRelationshipConfig,
  'search-by-content': searchByContentConfig,
  'search-by-timeframe': searchByTimeframeConfig,
  'batch-operations': batchOperationsConfig,
};
