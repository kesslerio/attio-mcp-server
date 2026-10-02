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
    resourceType?: string
  ) => Record<string, unknown>;
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
  handler: () => Promise<AttioList[]>;
}

// List entries tool configuration
export interface GetListEntriesToolConfig extends ToolConfig {
  handler: (listId: string) => Promise<AttioListEntry[]>;
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
