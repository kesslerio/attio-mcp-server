/**
 * Common types for tool configurations
 */
import { Request, Response } from 'express';
import {
  AttioRecord,
  AttioNote,
  AttioList,
  AttioListEntry,
} from '@/types/attio.js';
import { ListEntryFilters } from '@/api/operations/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

/**
 * What an operation does to a resource, as published for tool selection.
 *
 * Values are declared deliberately: a client choosing a tool reads this
 before calling it, so it must not be inferred from a name match.
 */
export type ToolOperationAction =
  | 'read'
  | 'search'
  | 'metadata'
  | 'diagnostic'
  | 'write'
  | 'merge'
  | 'batch';

/** Continuation style the operation publishes. `none` means not paginated. */
export type ToolPaginationKind = 'none' | 'offset' | 'cursor' | 'page';

/**
 * Static operation contract for one tool, authored once per canonical name.
 * `universal/capabilities.ts` owns the table; the registry projection and the
 * capability manifest both read it, so no surface keeps its own copy.
 */
export interface ToolOperationMetadata {
  action: ToolOperationAction;
  /** Canonical object slugs the operation addresses (`'custom-object'` marks
   * discovered custom-object slugs, which the input schema leaves unenumed). */
  resourceTypes: readonly string[];
  /** True when arbitrary custom-object slugs are accepted for this operation. */
  customObjectSlugs: boolean;
  /** True when the operation needs a valid Attio credential to do its work. */
  authRequired: boolean;
  /** Read-only operations never mutate workspace state. */
  readOnly: boolean;
  /** Destructive operations remove or overwrite data that cannot be undone. */
  destructive: boolean;
  /** Idempotent operations are safe to repeat with the same arguments. */
  idempotent: boolean;
  /** Continuation the operation publishes, with its result cap when bounded. */
  pagination: {
    kind: ToolPaginationKind;
    supported: boolean;
    cap: number | null;
  };
}

// Base tool configuration interface
export interface ToolConfig {
  name: string;
  /** Only migrated adapters advertise a validated result contract. */
  outputSchema?: Tool['outputSchema'];
  resultSchema?: z.ZodType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: any; // Keep as any for compatibility with existing tool configs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatResult?: (results: any) => string;
  /**
   * Adapter-owned normalization before the shared result boundary validates
   * and publishes the envelope. Pending migrations retain legacy text output.
   */

  structuredOutput?: (
    results: any,
    resourceType?: string,
    args?: Record<string, unknown>
  ) => Record<string, unknown>;
  /**
   * Connector-only override for content[0]. Documents that must keep a
   * documented JSON text shape supply their projection derived from the
   * validated envelope instead of the envelope serialization itself (KTD4).
   */
  textProjection?: (structured: Record<string, unknown>) => string;
}

// Search tool configuration
export interface SearchToolConfig extends ToolConfig {
  handler: (query: string) => Promise<AttioRecord[]>;
  formatResult: (results: AttioRecord[]) => string;
}

// Advanced search tool configuration
export interface AdvancedSearchToolConfig extends ToolConfig {
  handler: (
    filters: ListEntryFilters,
    limit?: number,
    offset?: number
  ) => Promise<AttioRecord[]>;
  formatResult: (results: AttioRecord[]) => string;
}

// Details tool configuration
export interface DetailsToolConfig extends ToolConfig {
  handler: (id: string) => Promise<AttioRecord>;
}

// Notes tool configuration
export interface NotesToolConfig extends ToolConfig {
  handler: (
    id: string,
    limit?: number,
    offset?: number
  ) => Promise<AttioNote[]>;
}

// Create note tool configuration
export interface CreateNoteToolConfig extends ToolConfig {
  handler: (id: string, title: string, content: string) => Promise<AttioNote>;
  idParam?: string; // Parameter name for the ID (e.g., "companyId", "personId")
}

// Lists tool configuration
export interface GetListsToolConfig extends ToolConfig {
  handler: (cursor?: unknown) => Promise<AttioList[]>;
}

// List entries tool configuration
export interface GetListEntriesToolConfig extends ToolConfig {
  handler: (
    listId: string,
    limit?: number,
    offset?: number,
    filters?: unknown,
    cursor?: unknown
  ) => Promise<{
    data: AttioListEntry[];
    next_cursor: string | null;
    pagination: { supported: boolean; truncated: boolean };
  }>;
}

// List action tool configuration
export interface ListActionToolConfig<
  TResult = AttioRecord | AttioListEntry,
> extends ToolConfig {
  handler: (listId: string, recordId: string) => Promise<TResult>;
  idParams?: string[];
}

// Create list tool configuration
export interface CreateListToolConfig extends ToolConfig {
  handler: (attributes: Record<string, unknown>) => Promise<AttioList>;
}

// Update list configuration tool configuration
export interface UpdateListConfigurationToolConfig extends ToolConfig {
  handler: (
    listId: string,
    attributes: Record<string, unknown>
  ) => Promise<AttioList>;
}

// Prompts tool configuration
export interface PromptsToolConfig extends ToolConfig {
  handler: (req: Request, res: Response) => Promise<void>;
}

// Date-based search tool configuration
export interface DateBasedSearchToolConfig extends ToolConfig {
  handler: (...args: unknown[]) => Promise<AttioRecord[]>;
  formatResult: (results: AttioRecord[]) => string;
}
