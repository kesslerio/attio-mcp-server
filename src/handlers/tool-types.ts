/**
 * Common types for tool configurations
 */
import { Request, Response } from 'express';
import {
  AttioRecord,
  AttioNote,
  AttioList,
  AttioListEntry,
} from '../types/attio.js';
import { ListEntryFilters } from '../api/operations/index.js';

// Base tool configuration interface
export interface ToolConfig {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: any; // Keep as any for compatibility with existing tool configs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatResult?: (results: any) => string;
  /**
   * Optional function to return normalized structured data alongside text.
   * When defined, dispatcher returns dual content:
   * - content[0]: JSON.stringify(structuredOutput result) - for programmatic parsing
   * - content[1]: formatResult text - for human readability
   * This enables tests and clients to receive structured JSON without breaking
   * the existing string-only formatResult contract.
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
export interface ListActionToolConfig extends ToolConfig {
  handler: (
    listId: string,
    recordId: string
  ) => Promise<AttioRecord | AttioListEntry>;
  idParams?: string[];
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
