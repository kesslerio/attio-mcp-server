/**
 * Workspace Members operations for Attio
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import * as AttioClientModule from '../../api/attio-client.js';
import type { AxiosInstance } from 'axios';
import { AttioWorkspaceMember, AttioListResponse } from '../../types/attio.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { debug, OperationType } from '../../utils/logger.js';

/**
 * List all workspace members with optional search and pagination
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
      throw new Error(`Workspace member not found: ${memberId}`);
    }

    return res.data.data;
  }, retryConfig);
}

/**
 * Resolve an Attio API client that works in both runtime and test environments.
 * In tests/offline, prefer the mocked getAttioClient if available.
 */
function resolveAttioClient(): AxiosInstance {
  const mod = AttioClientModule as typeof AttioClientModule & {
    getAttioClient?: () => AxiosInstance;
    createAttioClient?: (apiKey: string) => AxiosInstance;
  };
  // Always prefer explicit factory if present (enables Vitest mocks)
  if (typeof mod.getAttioClient === 'function') {
    return mod.getAttioClient();
  }
  try {
    return getLazyAttioClient();
  } catch {
    if (
      typeof mod.createAttioClient === 'function' &&
      process.env.ATTIO_API_KEY
    ) {
      return mod.createAttioClient(process.env.ATTIO_API_KEY);
    }
    if (
      typeof mod.buildAttioClient === 'function' &&
      process.env.ATTIO_API_KEY
    ) {
      return mod.buildAttioClient({ apiKey: process.env.ATTIO_API_KEY });
    }
    throw new Error('Unable to resolve Attio API client');
  }
}
