/**
 * Pagination utilities for Attio MCP server
 * Provides functions for implementing efficient pagination with filtered results
 */
import { AttioRecord } from '../types/attio.js';

  /** Number of records per page */
  pageSize: number;

  /** Total number of pages available */
  totalPages: number;

  /** Whether there are more pages available */
  hasMore: boolean;

  /** URL for the next page (if available) */
  nextPageUrl?: string;

  /** URL for the previous page (if available) */
  prevPageUrl?: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  /** Results for the current page */
  results: T[];

  /** Pagination metadata */
  pagination: PaginationMetadata;
}

/**
 * Creates a paginated response object with metadata
 *
 * @param results - The current page of results
 * @param totalCount - The total number of results available
 * @param page - The current page number (1-based)
 * @param pageSize - The number of results per page
 * @param baseUrl - Optional base URL for constructing next/prev page URLs
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  results: T[],
  totalCount: number,
  page: number = 1,
  pageSize: number = 20,
  baseUrl?: string
): PaginatedResponse<T> {
  // Calculate total pages

  // Determine if there are more pages

  // Pagination metadata
  const pagination: PaginationMetadata = {
    totalCount,
    currentPage: page,
    pageSize,
    totalPages,
    hasMore,
  };

  // Add URLs if base URL is provided
  if (baseUrl) {
    // Create next page URL if there are more pages
    if (hasMore) {
      pagination.nextPageUrl = `${baseUrl}?page=${
        page + 1
      }&pageSize=${pageSize}`;
    }

    // Create previous page URL if not on first page
    if (page > 1) {
      pagination.prevPageUrl = `${baseUrl}?page=${
        page - 1
      }&pageSize=${pageSize}`;
    }
  }

  return {
    results,
    pagination,
  };
}

/**
 * Applies pagination to a list of records
 *
 * @param records - The full list of records to paginate
 * @param page - The page number to return (1-based)
 * @param pageSize - The number of records per page
 * @returns Paginated response with the requested page of records
 */
export function paginateRecords<T>(
  records: T[],
  page: number = 1,
  pageSize: number = 20
): PaginatedResponse<T> {
  // Ensure valid pagination parameters

  // Calculate start and end indices

  // Extract the requested page of records

  // Create and return paginated response
  return createPaginatedResponse(
    paginatedResults,
    records.length,
    validPage,
    validPageSize
  );
}

/**
 * Applies pagination parameters to a query
 *
 * @param pageParam - The page parameter from the request
 * @param pageSizeParam - The page size parameter from the request
 * @returns Object with normalized limit and offset values
 */
export function getPaginationParams(
  pageParam?: number | string,
  pageSizeParam?: number | string
): { limit: number; offset: number } {
  // Default values

  // Parse and validate page
  let page = defaultPage;
  if (pageParam !== undefined) {
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  // Parse and validate page size
  let pageSize = defaultPageSize;
  if (pageSizeParam !== undefined) {
    if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
      pageSize = Math.min(parsedPageSize, maxPageSize);
    }
  }

  // Calculate offset from page and page size

  return {
    limit: pageSize,
    offset,
  };
}

/**
 * Processes API responses with cursor-based pagination into a standardized paginated response
 *
 * @param apiResponse - The API response object with cursor-based pagination
 * @param records - The records from the response
 * @param page - The current page number (1-based)
 * @param pageSize - The number of records per page
 * @param baseUrl - Optional base URL for constructing next/prev page URLs
 * @returns Standardized paginated response
 */
export function processCursorPagination<T extends AttioRecord>(
  apiResponse: unknown,
  records: T[],
  page: number = 1,
  pageSize: number = 20,
  baseUrl?: string
): PaginatedResponse<T> {
  // Extract pagination metadata from the API response
    apiResponse.has_more || apiResponse.pagination?.next_cursor !== undefined;

  // Calculate total pages based on total count and page size

  // Create pagination metadata
  const pagination: PaginationMetadata = {
    totalCount,
    currentPage: page,
    pageSize,
    totalPages,
    hasMore,
  };

  // Add URLs if base URL is provided
  if (baseUrl) {
    // Create next page URL if there's a next cursor
    if (hasMore) {
        apiResponse.next_cursor || apiResponse.pagination?.next_cursor;
      if (nextCursor) {
        pagination.nextPageUrl = `${baseUrl}?cursor=${encodeURIComponent(
          nextCursor
        )}&pageSize=${pageSize}`;
      } else {
        pagination.nextPageUrl = `${baseUrl}?page=${
          page + 1
        }&pageSize=${pageSize}`;
      }
    }

    // Create previous page URL if not on first page
    if (page > 1) {
      pagination.prevPageUrl = `${baseUrl}?page=${
        page - 1
      }&pageSize=${pageSize}`;
    }
  }

  return {
    results: records,
    pagination,
  };
}

/**
 * Fetches all pages of results for a paginated query
 *
 * @param queryFn - Function that fetches a page of results
 * @param pageSize - Page size to use for fetching
 * @param maxPages - Maximum number of pages to fetch
 * @returns All results combined
 */
export async function fetchAllPages<T>(
  queryFn: (limit: number, offset: number) => Promise<T[]>,
  pageSize: number = 20,
  maxPages: number = 10
): Promise<T[]> {
  let allResults: T[] = [];
  let currentPage = 1;
  let hasMoreResults = true;

  while (hasMoreResults && currentPage <= maxPages) {

    // Add results to our collection
    allResults = [...allResults, ...pageResults];

    // Check if we've reached the end
    if (pageResults.length < pageSize) {
      hasMoreResults = false;
    } else {
      // Move to the next page
      currentPage++;
    }
  }

  return allResults;
}
