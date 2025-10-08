/**
 * Note search strategy implementation
 * Issue #888: Fix notes search - notes cannot be found by title/content
 *
 * **IMPORTANT API LIMITATION**:
 * The Attio Notes API /v2/notes endpoint returns an empty array when called without filters.
 * Testing with curl confirmed: GET /v2/notes returns {"data": []}
 * The API requires parent_object and/or parent_record_id filters to return any notes.
 *
 * **What Works**:
 * - list-notes tool with parent record filtering (e.g., list all notes on a company)
 * - Content search within notes for a specific parent record
 *
 * **What Doesn't Work**:
 * - Workspace-wide note search without parent filters
 * - Global search like "find all notes containing 'demo'" across all records
 *
 * Recommendation: Request Attio to add workspace-wide notes endpoint or search capability.
 */

import { AttioRecord, AttioNote } from '../../types/attio.js';
import {
  SearchType,
  MatchType,
  SortType,
  UniversalResourceType,
} from '../../handlers/tool-configs/universal/types.js';
import { BaseSearchStrategy } from './BaseSearchStrategy.js';
import { SearchStrategyParams, StrategyDependencies } from './interfaces.js';
import { performance } from 'perf_hooks';
import { SearchUtilities } from '../search-utilities/SearchUtilities.js';
import { createScopedLogger, OperationType } from '../../utils/logger.js';

// Import performance tracking and caching services
import { enhancedPerformanceTracker } from '../../middleware/performance-enhanced.js';
import { CachingService } from '../CachingService.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';

// Performance warning threshold for large note datasets
const NOTES_PERFORMANCE_WARNING_THRESHOLD = 2000;

/**
 * Search strategy for notes with performance optimization, caching, and content search support
 *
 * IMPLEMENTATION NOTE:
 * The Attio Notes API (/notes endpoint) does not support native text search.
 * It only supports filtering by parent_object and parent_record_id.
 * Therefore, we fetch all notes and apply client-side filtering for search queries.
 */
export class NoteSearchStrategy extends BaseSearchStrategy {
  constructor(dependencies: StrategyDependencies) {
    super(dependencies);
  }

  getResourceType(): string {
    return UniversalResourceType.NOTES;
  }

  supportsAdvancedFiltering(): boolean {
    return false; // Notes only support basic search
  }

  supportsQuerySearch(): boolean {
    return true; // Notes support content search via applyContentSearch method
  }

  async search(params: SearchStrategyParams): Promise<AttioRecord[]> {
    const {
      query,
      limit,
      offset,
      search_type = SearchType.BASIC,
      fields,
      match_type = MatchType.PARTIAL,
      sort = SortType.NAME,
      filters,
    } = params;

    // Extract performance tracking IDs from parameters (passed via dependencies)
    const perfId = 'notes_search'; // Default fallback
    const apiStart = performance.now();

    return this.searchNotes(
      perfId,
      apiStart,
      query,
      limit,
      offset,
      search_type,
      fields,
      match_type,
      sort,
      filters
    );
  }

  /**
   * Search notes with performance optimization, caching, and content search support
   *
   * PERFORMANCE-OPTIMIZED NOTES PAGINATION
   *
   * The Attio Notes API does not support native text search or advanced filtering.
   * This implementation uses smart caching and performance monitoring to
   * minimize the performance impact of loading all notes.
   *
   * Optimizations:
   * - Smart caching with 30-second TTL to avoid repeated full loads
   * - Performance warnings for large datasets (>500 notes)
   * - Early termination for large offsets
   * - Memory usage monitoring and cleanup
   */
  private async searchNotes(
    perfId: string,
    apiStart: number,
    query?: string,
    limit?: number,
    offset?: number,
    search_type: SearchType = SearchType.BASIC,
    fields?: string[],
    match_type: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    filters?: Record<string, unknown>
  ): Promise<AttioRecord[]> {
    const log = createScopedLogger(
      'NoteSearchStrategy',
      'notes_search',
      OperationType.DATA_PROCESSING
    );

    // Use CachingService for notes data management
    const loadNotesData = async (): Promise<AttioRecord[]> => {
      try {
        if (!this.dependencies.noteFunction) {
          throw new Error('Notes list function not available');
        }

        // Build query params for filtering if provided
        const queryParams: Record<string, unknown> = {};
        if (filters) {
          if (filters.parent_object || filters.linked_record_type) {
            queryParams.parent_object =
              filters.parent_object || filters.linked_record_type;
          }
          if (filters.parent_record_id || filters.linked_record_id) {
            queryParams.parent_record_id =
              filters.parent_record_id || filters.linked_record_id;
          }
        }

        const notesResponse = await this.dependencies.noteFunction(queryParams);
        const notesList = notesResponse.data || [];

        // Convert notes to records and ensure it's always an array
        if (!Array.isArray(notesList)) {
          log.warn('NOTES API WARNING: listNotes() returned non-array value', {
            returnedType: typeof notesList,
          });
          return [];
        } else {
          // Convert AttioNote[] to AttioRecord[]
          // Cast to AttioNote[] since we know the API returns notes
          return (notesList as AttioNote[]).map((note) =>
            this.convertNoteToRecord(note)
          );
        }
      } catch (error: unknown) {
        log.error('Failed to load notes from API', error);
        return []; // Fallback to empty array
      }
    };

    // Generate cache key based on parent filters to prevent collisions
    const cacheKey = CachingService.getNotesListCacheKey(filters);
    const { data: notes, fromCache } = await CachingService.getOrLoadNotes(
      loadNotesData,
      cacheKey
    );

    // Performance warning for large datasets
    if (!fromCache && notes.length > NOTES_PERFORMANCE_WARNING_THRESHOLD) {
      log.warn('PERFORMANCE WARNING: Large notes load', {
        noteCount: notes.length,
        threshold: NOTES_PERFORMANCE_WARNING_THRESHOLD,
        recommendation:
          'Consider requesting Attio API pagination support for notes endpoint.',
      });
    }

    // Log performance metrics
    if (!fromCache) {
      enhancedPerformanceTracker.markTiming(
        perfId,
        'attioApi',
        performance.now() - apiStart
      );
    } else {
      enhancedPerformanceTracker.markTiming(perfId, 'other', 1);
    }

    // Handle empty dataset cleanly
    if (notes.length === 0) {
      return []; // No warning for empty datasets
    }

    // Apply content search filtering if requested
    let filteredNotes = notes;
    if (search_type === SearchType.CONTENT && query && query.trim()) {
      filteredNotes = this.applyContentSearch(
        notes,
        query.trim(),
        fields,
        match_type,
        sort
      );
    } else if (query && query.trim()) {
      // For BASIC search type, also apply content filtering
      filteredNotes = this.applyContentSearch(
        notes,
        query.trim(),
        fields,
        match_type,
        sort
      );
    }

    // Smart pagination with early termination for unreasonable offsets
    const start = offset || 0;
    const requestedLimit = limit || 10;

    // Performance optimization: Don't process if offset exceeds dataset
    if (start >= filteredNotes.length) {
      log.info('Notes pagination offset exceeds dataset size', {
        offset: start,
        filteredSize: filteredNotes.length,
        action: 'returning empty results',
      });
      return [];
    } else {
      const end = Math.min(start + requestedLimit, filteredNotes.length);
      const paginatedNotes = filteredNotes.slice(start, end);

      // Log pagination performance metrics
      enhancedPerformanceTracker.markTiming(
        perfId,
        'serialization',
        fromCache ? 1 : performance.now() - apiStart
      );

      return paginatedNotes;
    }
  }

  /**
   * Apply content search filtering to notes
   */
  private applyContentSearch(
    notes: AttioRecord[],
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): AttioRecord[] {
    const searchFields = fields || [
      'title',
      'content_markdown',
      'content_plaintext',
    ];
    const queryLower = query.toLowerCase();

    let filteredNotes = notes.filter((note: AttioRecord) => {
      return searchFields.some((field) => {
        const fieldValue = SearchUtilities.getNoteFieldValue(note, field);
        if (matchType === MatchType.EXACT) {
          return fieldValue.toLowerCase() === queryLower;
        } else {
          return fieldValue.toLowerCase().includes(queryLower);
        }
      });
    });

    // Apply relevance ranking if requested
    if (sort === SortType.RELEVANCE) {
      filteredNotes = SearchUtilities.rankByRelevance(
        filteredNotes,
        query,
        searchFields
      );
    }

    return filteredNotes;
  }

  /**
   * Convert AttioNote to AttioRecord format
   */
  private convertNoteToRecord(note: AttioNote): AttioRecord {
    // Handle id field which can be string or AttioNoteIdentifier
    const noteId =
      typeof note.id === 'string' ? note.id : note.id?.note_id || '';

    // Extract content fields - API returns content_markdown, content_plaintext, or content
    // Match the normalization logic from src/objects/notes.ts:normalizeNoteResponse
    const contentMarkdown = (note.content_markdown ??
      note.content ??
      '') as string;
    const contentPlaintext = (note.content_plaintext ??
      note.content ??
      '') as string;

    // Return properly typed record satisfying AttioRecord interface
    const record: AttioRecord = {
      id: {
        record_id: noteId,
        note_id: noteId,
      } as AttioRecord['id'],
      values: {
        title: note.title || '',
        content_markdown: contentMarkdown,
        content_plaintext: contentPlaintext,
        parent_object: note.parent_object || '',
        parent_record_id: note.parent_record_id || '',
        created_at: note.created_at || '',
        created_by_actor: note.created_by_actor,
      },
    };

    return record;
  }
}
