/**
 * Pagination utilities for Attio MCP server
 * Provides functions for implementing efficient pagination with filtered results
 */
import { AttioRecord } from "../types/attio.js";
/**
 * Standard pagination metadata interface
 */
export interface PaginationMetadata {
    /** Total number of records available */
    totalCount: number;
    /** Current page number (1-based) */
    currentPage: number;
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
export declare function createPaginatedResponse<T>(results: T[], totalCount: number, page?: number, pageSize?: number, baseUrl?: string): PaginatedResponse<T>;
/**
 * Applies pagination to a list of records
 *
 * @param records - The full list of records to paginate
 * @param page - The page number to return (1-based)
 * @param pageSize - The number of records per page
 * @returns Paginated response with the requested page of records
 */
export declare function paginateRecords<T>(records: T[], page?: number, pageSize?: number): PaginatedResponse<T>;
/**
 * Applies pagination parameters to a query
 *
 * @param pageParam - The page parameter from the request
 * @param pageSizeParam - The page size parameter from the request
 * @returns Object with normalized limit and offset values
 */
export declare function getPaginationParams(pageParam?: number | string, pageSizeParam?: number | string): {
    limit: number;
    offset: number;
};
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
export declare function processCursorPagination<T extends AttioRecord>(apiResponse: any, records: T[], page?: number, pageSize?: number, baseUrl?: string): PaginatedResponse<T>;
/**
 * Fetches all pages of results for a paginated query
 *
 * @param queryFn - Function that fetches a page of results
 * @param pageSize - Page size to use for fetching
 * @param maxPages - Maximum number of pages to fetch
 * @returns All results combined
 */
export declare function fetchAllPages<T>(queryFn: (limit: number, offset: number) => Promise<T[]>, pageSize?: number, maxPages?: number): Promise<T[]>;
//# sourceMappingURL=pagination.d.ts.map