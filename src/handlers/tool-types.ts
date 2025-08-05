/**
 * Common types for tool configurations
 */
import type { Request, Response } from 'express';
import type { ListEntryFilters } from '../api/operations/index.js';
import type {
  AttioList,
  AttioListEntry,
  AttioNote,
  AttioRecord,
} from '../types/attio.js';

// Base tool configuration interface
export interface ToolConfig {
  name: string;
  handler: any; // Using any to allow different handler signatures
  formatResult?: (results: any) => string;
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
  handler: (listId: string, recordId: string) => Promise<any>;
  idParams?: string[];
}

// Prompts tool configuration
export interface PromptsToolConfig extends ToolConfig {
  handler: (req: Request, res: Response) => Promise<void>;
}

// Date-based search tool configuration
export interface DateBasedSearchToolConfig extends ToolConfig {
  handler: (...args: any[]) => Promise<AttioRecord[]>;
  formatResult: (results: AttioRecord[]) => string;
}
