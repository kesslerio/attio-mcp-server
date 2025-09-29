/**
 * Workspace Members operations for Attio
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import { getValidatedAttioClient } from '../../utils/client-resolver.js';
import type { AxiosInstance } from 'axios';
import { AttioWorkspaceMember, AttioListResponse } from '../../types/attio.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { debug, OperationType } from '../../utils/logger.js';

/**
 * List workspace members with pagination and search
 * @param search - Optional search query for filtering members by name, email, or role
 * @param page - Page number (default: 1)
 * @param pageSize - Results per page (default: 25, max: 100)
 * @param retryConfig - Optional retry configuration for failed requests
 * @returns Array of workspace members matching the search criteria
 */
export async function listWorkspaceMembers(
  search?: string,
  page: number = 1,
  pageSize: number = 25,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioWorkspaceMember[]> {
  const api = resolveAttioClient();
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  if (search) params.append('search', search);

  const path = `/workspace_members?${params.toString()}`;

  return callWithRetry(async () => {
    debug(
      'workspace-members.listWorkspaceMembers',
      'Fetching workspace members',
      { path, search, page, pageSize },
      'listWorkspaceMembers',
      OperationType.API_CALL
    );

    const res = await api.get<AttioListResponse<AttioWorkspaceMember>>(path);
    const members = res?.data?.data || [];

    debug(
      'workspace-members.listWorkspaceMembers',
      'Workspace members fetched',
      { count: members.length },
      'listWorkspaceMembers',
      OperationType.API_CALL
    );

    return members;
  }, retryConfig);
}

/**
 * Search workspace members by name, email, or role
 * @param query - Search query string to match against member names, emails, or roles
 * @param retryConfig - Optional retry configuration for failed requests
 * @returns Array of workspace members matching the search query
 */
export async function searchWorkspaceMembers(
  query: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioWorkspaceMember[]> {
  const api = resolveAttioClient();
  const params = new URLSearchParams();
  params.append('search', query);

  const path = `/workspace_members?${params.toString()}`;

  return callWithRetry(async () => {
    debug(
      'workspace-members.searchWorkspaceMembers',
      'Searching workspace members',
      { query },
      'searchWorkspaceMembers',
      OperationType.API_CALL
    );

    const res = await api.get<AttioListResponse<AttioWorkspaceMember>>(path);
    const members = res?.data?.data || [];

    debug(
      'workspace-members.searchWorkspaceMembers',
      'Workspace members search completed',
      { query, count: members.length },
      'searchWorkspaceMembers',
      OperationType.API_CALL
    );

    return members;
  }, retryConfig);
}

/**
 * Get a specific workspace member by ID
 * @param memberId - Unique identifier of the workspace member
 * @param retryConfig - Optional retry configuration for failed requests
 * @returns The workspace member data
 * @throws Error if the workspace member is not found
 */
export async function getWorkspaceMember(
  memberId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioWorkspaceMember> {
  const api = resolveAttioClient();
  const path = `/workspace_members/${memberId}`;

  return callWithRetry(async () => {
    debug(
      'workspace-members.getWorkspaceMember',
      'Fetching workspace member',
      { memberId },
      'getWorkspaceMember',
      OperationType.API_CALL
    );

    const res = await api.get<{ data: AttioWorkspaceMember }>(path);

    if (!res?.data?.data) {
      throw new Error(
        `Workspace member '${memberId}' not found in current workspace`
      );
    }

    return res.data.data;
  }, retryConfig);
}

/**
 * Resolve an Attio API client that works in both runtime and test environments.
 * In tests/offline, prefer the mocked getAttioClient if available.
 */
function resolveAttioClient(): AxiosInstance {
  try {
    // Use the unified client resolver which handles all factory methods
    return getValidatedAttioClient();
  } catch (error) {
    // If resolver fails, try lazy client as fallback
    try {
      return getLazyAttioClient();
    } catch {
      throw new Error(
        `Could not initialize Attio client: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
